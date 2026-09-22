/* ============================================================
   12 — GAME: renderer, modes, combat, round flow, main loop
   ============================================================ */

/* ---------------- soldier avatar for online play ---------------- */
function buildSoldierMesh(team) {
  const main = team === 'ct' ? 0x3f6ea8 : 0xa8623f;
  const bodyMat = new THREE.MeshLambertMaterial({ color: main });
  const vestMat = new THREE.MeshLambertMaterial({ color: 0x2a2f36 });
  const skinMat = new THREE.MeshLambertMaterial({ color: 0xd8a878 });
  const headMat = new THREE.MeshLambertMaterial({ color: 0x33383f });
  const g = new THREE.Group();
  const mk = (w, h, d, mat, px, py, pz) => {
    const p = new THREE.Group(); p.position.set(px, py, pz);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.y = -h / 2; m.castShadow = true; m.receiveShadow = true;
    p.add(m); return p;
  };
  const parts = {};
  const torso = new THREE.Group(); torso.position.y = 1.06;
  const chest = new THREE.Mesh(new THREE.BoxGeometry(.56, .64, .32), bodyMat); chest.position.y = .16;
  chest.castShadow = true; torso.add(chest);
  const vest = new THREE.Mesh(new THREE.BoxGeometry(.62, .42, .38), vestMat); vest.position.y = .22;
  torso.add(vest);
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(.46, .34, .30), vestMat); pelvis.position.y = -.28;
  torso.add(pelvis);
  g.add(torso); parts.torso = torso;

  const head = new THREE.Group(); head.position.y = 1.56;
  const skull = new THREE.Mesh(new THREE.BoxGeometry(.28, .32, .28), skinMat); head.add(skull);
  const helm = new THREE.Mesh(new THREE.BoxGeometry(.33, .20, .33), headMat); helm.position.y = .12; head.add(helm);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(.24, .07, .03), new THREE.MeshBasicMaterial({ color: 0x224466 }));
  visor.position.set(0, .03, -.15); head.add(visor);
  g.add(head); parts.head = head;

  parts.armL = mk(.15, .70, .15, bodyMat, -.36, 1.40, 0);
  parts.armR = mk(.15, .70, .15, bodyMat, .36, 1.40, 0);
  parts.legL = mk(.19, .86, .19, vestMat, -.15, .88, 0);
  parts.legR = mk(.19, .86, .19, vestMat, .15, .88, 0);
  g.add(parts.armL); g.add(parts.armR); g.add(parts.legL); g.add(parts.legR);
  g.userData.parts = parts;
  return g;
}

function makeNameplate(text) {
  const c = makeCanvas(256); c.height = 64;
  const x = c.getContext('2d');
  x.clearRect(0, 0, 256, 64);
  x.fillStyle = 'rgba(0,0,0,.55)';
  x.fillRect(0, 0, 256, 64);
  x.fillStyle = '#ff9d21';
  x.font = 'bold 34px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(String(text).slice(0, 16), 128, 34, 244);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: true }));
  sp.scale.set(2.4, .6, 1);
  return sp;
}

/* ---------------- remote player (online) ---------------- */
class RemotePlayer {
  constructor(name, team, isHostSide) {
    this.id = 'remote';
    this.name = name || 'Игрок';
    this.team = team || 't';
    this.pos = { x: 0, y: 0, z: 0 };
    this.vel = { x: 0, y: 0, z: 0 };
    this.yaw = 0; this.pitch = 0;
    this.health = CFG.maxHP; this.armor = 0; this.helmet = false;
    this.alive = true;
    this.kills = 0; this.deaths = 0; this.score = 0;
    this.zombieKills = 0; this.bulletsFired = 0; this.bulletsHit = 0;
    this.money = 800;
    this.crouching = false;
    this.height = CFG.playerHeight;
    this.mesh = buildSoldierMesh(this.team);
    this.mesh.userData.parts = this.mesh.userData.parts;
    this.plate = makeNameplate(this.name);
    this.plate.position.y = 2.05;
    this.mesh.add(this.plate);
    this.buf = [];
    this.renderPos = { x: 0, y: 0, z: 0 };
    this.renderYaw = 0;
    this.weaponGroup = null;
    this.walkPhase = 0;
    this.lastPacket = 0;
    this.slot = 2;
    this.hitFlash = 0;
  }
  /* Snapshots carry the sender's clock (`rt`), but performance.now() starts at
     each page's own load time, so the two players' clocks are offset by seconds
     or minutes. Comparing the sender's stamp with our clock froze the model
     (t clamped to 0 forever). Stamp each snapshot with the LOCAL arrival time
     instead, so both ends interpolate on their own consistent clock. */
  pushSnapshot(s) {
    s.at = U.now();
    this.buf.push(s);
    if (this.buf.length > 40) this.buf.shift();
    this.lastPacket = s.at;
  }
  /* interpolate at now - delay ms, using local arrival times */
  interp(delayMs) {
    const target = U.now() - delayMs;
    const b = this.buf;
    if (b.length === 0) return;
    if (b.length === 1) { this.applySnap(b[0]); return; }
    let i = b.length - 1;
    while (i > 0 && b[i].at > target) i--;
    const a = b[i], c = b[i + 1] || b[i];
    if (!c || c === a) { this.applySnap(a); return; }
    const span = c.at - a.at;
    const t = span > 0 ? U.clamp((target - a.at) / span, 0, 1) : 0;
    this.renderPos.x = U.lerp(a.x, c.x, t);
    this.renderPos.y = U.lerp(a.y, c.y, t);
    this.renderPos.z = U.lerp(a.z, c.z, t);
    this.renderYaw = U.angleLerp(a.yw, c.yw, t);
    this.pitch = U.lerp(a.pt || 0, c.pt || 0, t);
    this.alive = c.alive;
    this.crouching = !!c.cr;
    this.height = this.crouching ? CFG.crouchHeight : CFG.playerHeight;
    const moving = Math.hypot((c.x - a.x) / Math.max(span, .001), (c.z - a.z) / Math.max(span, .001));
    this.moveSpeed = moving;
  }
  applySnap(s) {
    this.renderPos.x = s.x; this.renderPos.y = s.y; this.renderPos.z = s.z;
    this.renderYaw = s.yw; this.pitch = s.pt || 0; this.alive = s.alive; this.crouching = !!s.cr;
    this.height = this.crouching ? CFG.crouchHeight : CFG.playerHeight;
    this.moveSpeed = 0;
  }
  /* authoritative pos follows the interpolated render pos */
  sync() {
    this.pos.x = this.renderPos.x; this.pos.y = this.renderPos.y; this.pos.z = this.renderPos.z;
    this.yaw = this.renderYaw;
    this.mesh.position.set(this.pos.x, this.pos.y, this.pos.z);
    this.mesh.rotation.y = this.yaw;
    this.mesh.visible = this.alive;
    if (!this.alive) return;
    // walk animation
    const p = this.mesh.userData.parts;
    const spd = U.clamp((this.moveSpeed || 0) / CFG.runSpeed, 0, 1);
    this.walkPhase += Math.min(this.moveSpeed || 0, 12) * 0.09;
    const amp = .55 * spd;
    p.legL.rotation.x = Math.sin(this.walkPhase) * amp;
    p.legR.rotation.x = -Math.sin(this.walkPhase) * amp;
    // right arm carries the weapon
    p.armR.rotation.x = -1.35;
    p.armL.rotation.x = -1.15 + Math.sin(this.walkPhase) * amp * .5;
    p.torso.rotation.x = this.pitch * .35;
    p.head.rotation.x = this.pitch * .5;
    // crouch
    this.mesh.scale.y = this.crouching ? .72 : 1;
    if (this.hitFlash > 0) {
      this.hitFlash -= 0.05;
      this.mesh.traverse(o => { if (o.isMesh && o.material.emissive) o.material.emissive.setHex(0x662222); });
    } else if (this._wasFlashing) {
      this.mesh.traverse(o => { if (o.isMesh && o.material.emissive) o.material.emissive.setHex(0x000000); });
    }
    this._wasFlashing = this.hitFlash > 0;
  }
}

/* ============================================================
   GAME
   ============================================================ */
/* scratch vectors (avoid per-shot allocations) */
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();

const Game = {
  /* ---- engine ---- */
  renderer: null, scene: null, camera: null, vmScene: null, vmCamera: null,
  world: null, effects: null, horde: null, player: null,
  running: false, mode: CS.MODE.MENU, paused: false,
  baseFov: 80, _last: 0, _loopBound: null, _acc: 0,
  remotePlayers: [], remote: null,
  offline: null,
  online: null,
  buyOpen: false,
  buyTimer: 0,
  roundState: 'idle',   // buy | live | end
  roundT: 0,
  roundNo: 0,
  _netStateT: 0,
  _uiT: 0,
  _lastShotFx: 0,
  _fpsAcc: 0, _fpsFrames: 0,
  projectiles: [],
  _projT: 0,
  _enemyCheck: 0, _enemyFound: false,

  /* ============================================================
     INIT
     ============================================================ */
  init() {
    UI.init();
    this.setupRenderer();
    this._loopBound = this.loop.bind(this);
    this.bindUI();
    Input.init(this.renderer.domElement);
    Input.enabled = false;         // armed when a match starts (enterGame)

    // loading sequence (also warms up shaders so the first frame is not a stutter)
    UI.loading(5, 'Готовим материалы…');
    setTimeout(() => {
      buildTextures();
      UI.loading(25, 'Строим арену…');
      setTimeout(() => this.finishInit(), 30);
    }, 120);
  },

  finishInit() {
    buildMap(this.scene, this.world, Store.data.quality);
    UI.loading(62, 'Компилируем шейдеры…');
    setTimeout(() => {
      if (this.world.raycastAll === undefined) { /* safety no-op */ }
      UI.loading(80, 'Готово');
      // pre-render one frame offscreen to warm up
      try {
        this.camera.position.set(0, 2, 0);
        this.renderer.compile(this.scene, this.camera);
      } catch (e) { }
      UI.loading(100, 'Загрузка завершена');
      setTimeout(() => {
        UI.renderMenuStats();
        UI.show('menu');
        this.running = true;
        this._last = performance.now();
        requestAnimationFrame(this._loopBound);
      }, 240);
    }, 60);
  },

  setupRenderer() {
    const canvas = document.createElement('canvas');
    canvas.id = 'game3d';
    document.body.appendChild(canvas);

    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: Store.data.quality > 0, powerPreference: 'high-performance',
      stencil: false, alpha: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Store.data.quality === 2 ? 2 : 1.5));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = Store.data.quality > 0;
    this.renderer.shadowMap.type = Store.data.quality === 2 ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    this.renderer.autoClear = false;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;

    this.scene = new THREE.Scene();
    this.world = new CollisionWorld();
    this.camera = new THREE.PerspectiveCamera(this.baseFov, window.innerWidth / window.innerHeight, 0.08, 420);

    // separate scene for the first-person weapon (never clips into walls)
    this.vmScene = new THREE.Scene();
    this.vmCamera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.01, 12);
    // the view model gets brighter, flatter lighting than the world so the
    // weapon always stays legible even when the player stands in shadow
    const vHemi = new THREE.HemisphereLight(0xffffff, 0x6a7078, 2.35);
    this.vmScene.add(vHemi);
    const vDir = new THREE.DirectionalLight(0xfff4e0, 2.1);
    vDir.position.set(0.8, 1.8, 1.2);
    this.vmScene.add(vDir);
    const vFill = new THREE.DirectionalLight(0xbcd0ff, 0.9);
    vFill.position.set(-1.2, 0.6, 0.6);
    this.vmScene.add(vFill);
    const vAmb = new THREE.AmbientLight(0xffffff, 0.42);
    this.vmScene.add(vAmb);

    window.addEventListener('resize', () => this.onResize());
    this.applyQuality();
  },

  onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.vmCamera.aspect = w / h; this.vmCamera.updateProjectionMatrix();
  },

  applyQuality() {
    const q = Store.data.quality;
    this.renderer.shadowMap.enabled = q > 0;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q === 2 ? 2 : q === 1 ? 1.4 : 1));
    if (this.scene) {
      const sun = this.scene.userData.sun;
      if (sun) {
        const size = q === 0 ? 1024 : q === 1 ? 2048 : 4096;
        if (sun.shadow.mapSize.width !== size) {
          sun.shadow.mapSize.width = size; sun.shadow.mapSize.height = size;
          if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
        }
      }
    }
  },

  /* ============================================================
     UI WIRING
     ============================================================ */
  bindUI() {
    bindClick('btnOffline', () => this.startOffline());
    bindClick('btnOnline', () => { UI.show('lobby'); this.resetLobby(); Net.warmup(); });
    bindClick('btnControls', () => { this._prevScreen = 'menu'; UI.show('controls'); });
    bindClick('btnControlsBack', () => UI.show(this._prevScreen || 'menu'));
    bindClick('btnLobbyBack', () => { Net.close(false); UI.show('menu'); });
    bindClick('btnResume', () => this.togglePause(false));
    bindClick('btnPauseControls', () => { this._prevScreen = 'pause'; UI.show('controls'); });
    bindClick('btnLeave', () => this.stopToMenu());
    bindClick('btnReset', () => {
      if (confirm('Сбросить весь прогресс и настройки?')) {
        Store.data = { sens: 2.2, fov: 80, vol: 60, quality: 1, name: '', best: 0, bestWave: 0, killsTotal: 0, matches: 0, wins: 0, signalSrv: 0 };
        Store.save();
        UI.renderMenuStats(); UI.toast('Прогресс сброшен');
      }
    });
    bindClick('btnCopy', () => {
      const code = UI.el.roomCode.textContent;
      try { navigator.clipboard.writeText(code); UI.toast('Код скопирован: ' + code); }
      catch (e) { UI.toast('Код: ' + code); }
    });

    // --- lobby ---
    const nameIn = UI.el.inName;
    if (nameIn) nameIn.value = Store.data.name || '';
    bindClick('btnBuyClose', () => this.toggleBuy(false));
    bindClick('btnHost', () => this.doHost());
    bindClick('btnJoin', () => {
      UI.el.joinRow.classList.remove('hidden');
      UI.el.hostRow.classList.add('hidden');
      UI.el.inCode.focus();
    });
    bindClick('btnJoinGo', () => this.doJoin());
    if (UI.el.inCode) UI.el.inCode.addEventListener('keydown', e => { if (e.key === 'Enter') this.doJoin(); });
    if (nameIn) nameIn.addEventListener('input', () => { Store.data.name = nameIn.value; Store.save(); });
    bindClick('btnConnCancel', () => { Net.close(false); UI.show('lobby'); this.setLobbyStatus(''); });

    // --- click to play ---
    UI.el.clickToPlay.addEventListener('click', () => {
      Audio3D_SFX.init(); Audio3D_SFX.resume();
      Input.requestLock();
    });

    // pointer lock behaviour
    Input.onLockChange = (locked, wasLocked) => {
      if (!this.running) return;
      if (locked) {
        // discard any mouse delta accumulated while the cursor was free,
        // otherwise the view snaps on the first frame back in-game
        Input.consumeMouse();
        UI.el.clickToPlay.classList.add('hidden');
        this.paused = false;
      } else if (wasLocked && this.mode !== CS.MODE.MENU && !this.buyOpen && !this.paused) {
        // lost the lock (Alt+Tab, Esc) → pause
        this._lockLostAt = U.now();
        this.togglePause(true);
      }
    };

    // keyboard hooks
    Input.onKeyDown = (code, e) => this.onKeyDown(code, e);
    Input.onKeyUp = (code, e) => {
      if (code === 'Space' && this.player) this.player.in.wantJump = false;
      // release Tab → drop the scoreboard (hold-to-view, like CS)
      if (code === 'Tab' && this._tabHeld) {
        this._tabHeld = false;
        if (UI.current === 'scoreboard') UI.show('hud');
        if (!this.paused && this.mode !== CS.MODE.MENU) Input.requestLock();
      }
    };
    Input.onMouseDown = (btn, e) => this.onMouseDown(btn, e);
    Input.onMouseUp = (btn, e) => this.onMouseUp(btn, e);

    // game events
    Bus.on('buy', id => this.tryBuy(id));
    Bus.on('buyGear', id => this.tryBuyGear(id));
    Bus.on('touchBuy', () => {
      // One button opens and closes the shop: on a phone there is no B/Esc key.
      if (this.buyOpen) { this.toggleBuy(false); return; }
      if (this.roundState === 'buy') { this.toggleBuy(true); Audio3D_SFX.uiClick(); }
      else { UI.toast('Магазин только в фазе закупки'); Audio3D_SFX.deny(); }
    });
    Bus.on('touchPause', () => {
      // In-match pause: opens the pause panel, which also exposes the settings
      // sliders and "ВЫЙТИ В МЕНЮ". Ignore taps while another overlay owns the
      // screen (the buy menu has its own ЗАКРЫТЬ button).
      if (this.buyOpen) return;
      if (this.paused) { this.togglePause(false); return; }
      if (UI.overlayOpen()) return;
      if (this.mode !== CS.MODE.MENU) { this.togglePause(true); Audio3D_SFX.uiClick(); }
    });
    Bus.on('zombieAttack', (z, dmg) => this.playerHurt(dmg, z));
    Bus.on('zombieDied', (z, hs) => this.onZombieDied(z, hs));
    Bus.on('zombieHit', (z, part, dmg, dir) => this.onZombieHit(z, part, dmg, dir));
    Bus.on('zombieGrowl', z => Audio3D_SFX.growl(z.pos.x, z.pos.y + 1.4, z.pos.z, z.type));

    // network events
    Net.on('hello', m => this.onPeerHello(m));
    Net.on('connected', () => this.onNetConnected());
    Net.on('disconnected', () => this.onNetDisconnected());
    Net.on('state', s => this.onRemoteState(s));
    Net.on('shot', s => this.onRemoteShot(s));
    Net.on('hit', h => this.onRemoteHit(h));
    Net.on('died', d => this.onRemoteDied(d));
    Net.on('respawn', r => this.onRemoteRespawn(r));
    Net.on('round', r => this.onRoundMsg(r));
    Net.on('score', s => this.onScoreMsg(s));
  },

  togglePause(on) {
    if (this.mode === CS.MODE.MENU) return;
    if (on && this.buyOpen) return;
    this.paused = !!on;
    if (this.paused) {
      UI.show('pause');
      if (!IS_TOUCH) Input.releaseLock();
      this.player.triggerDown = false;
    } else {
      UI.show('hud');
      if (!IS_TOUCH) Input.requestLock();
    }
    if (IS_TOUCH) TouchUI.update();
  },

  onKeyDown(code, e) {
    if (this.mode === CS.MODE.MENU) return;
    // While the buy menu is open it owns the keyboard (B / Enter / Esc close it,
    // 1-9 buy the numbered item, Tab is a no-op).
    if (this.buyOpen) {
      if (code === 'KeyB' || code === 'Enter' || code === 'Escape') { this.toggleBuy(false); return; }
      if (/^Digit[1-9]$/.test(code)) {
        const n = parseInt(code.slice(5), 10);
        const cards = UI.el.buyGrid.children;
        if (cards[n - 1]) cards[n - 1].click();
      }
      return;
    }
    switch (code) {
      case 'Escape':
        // Releasing the pointer lock (which Esc does natively) already pauses
        // us. Ignore the keydown that immediately follows, or we would unpause
        // in the same instant.
        if (this._lockLostAt && U.now() - this._lockLostAt < 300) break;
        if (UI.current === 'scoreboard') UI.show('hud');
        else if (this.paused) this.togglePause(false);
        else this.togglePause(true);
        break;
      case 'Tab':
        // hold to view, like Counter-Strike
        if (!this.paused && UI.current !== 'scoreboard') {
          UI.renderScoreboard(this);
          UI.show('scoreboard');
          this._tabHeld = true;
        }
        break;
      case 'KeyB':
        if (this.roundState === 'buy') this.toggleBuy(true);
        else { UI.toast('Магазин доступен только в фазе закупки'); Audio3D_SFX.deny(); }
        break;
      case 'KeyR': if (!this.paused) this.player.reload(); break;
      case 'Digit1': if (!this.paused) this.switchSlot(1); break;
      case 'Digit2': if (!this.paused) this.switchSlot(2); break;
      case 'Digit3': if (!this.paused) this.switchSlot(3); break;
      case 'KeyQ': if (!this.paused) this.switchSlot(this.player.nextSlot()); break;
      case 'KeyG': if (!this.paused && this.player.dropWeapon()) { Audio3D_SFX.pickup(); UI.toast('Оружие сброшено'); } break;
      case 'KeyN': this.invertY(); break;
    }
  },

  invertY() {
    Input.invertY *= -1;
    UI.toast('Инверсия мыши: ' + (Input.invertY < 0 ? 'вкл' : 'выкл'));
  },

  onMouseDown(btn, e) {
    if (this.mode === CS.MODE.MENU) return;
    if (this.buyOpen || this.paused || UI.overlayOpen()) return;
    if (!Input.locked) { Input.requestLock(); return; }
    if (btn === 0) {
      this.player.triggerDown = true;
      // Semi-auto, pump-action and melee fire on press, so a fast click can
      // never fall between two frames and be swallowed. Full-auto weapons are
      // driven from the game loop while the button is held.
      const def = this.player.def;
      if (this.player.alive && this.roundState === 'live' && !def.auto) {
        // Latch only when a shot really leaves the barrel. If the weapon is
        // still deploying or reloading, the game loop retries while the button
        // stays held, so the click is never silently swallowed.
        if (this.fire()) this.player._semiLatch = true;
      }
    }
  },
  onMouseUp(btn) {
    if (btn === 0 && this.player) this.player.triggerDown = false;
  },

  switchSlot(s) {
    if (this.player.takeWeapon(s)) Audio3D_SFX.reloadStep(0);
  },

  /* ============================================================
     MODE START / STOP
     ============================================================ */
  startOffline() {
    this.stopToMenu(true);
    this.mode = CS.MODE.OFFLINE;
    this.offline = {
      wave: 0, toSpawn: 0, spawnedThisWave: 0, totalThisWave: 0,
      betweenWaves: false, breakT: 0, alive: 0, kills: 0, startTime: U.now()
    };
    this.remotePlayers = []; this.remote = null;
    this.player = new Player({ id: 'p1', name: 'Вы', isLocal: true, team: 'ct' });
    this.player.money = 800;
    this.player.give('glock'); this.player.give('knife');
    this.player.slot = 1;
    this.player.height = CFG.playerHeight;
    // attach the first-person weapon to the weapon scene
    this.attachViewModel();

    this.horde = new Horde(this.scene, this.world, this);
    this.effects = new Effects(this.scene, Store.data.quality);
    this.effects.clear();

    this.spawnPlayerLocal(0);
    this.beginBuyPhase(30, 'ВОЛНА 1');
    this.enterGame();
    UI.toast('Найдите магазин: клавиша B');
  },

  attachViewModel() {
    this.player.buildViewModel();
    if (this.player.vmGroup.parent) this.player.vmGroup.parent.remove(this.player.vmGroup);
    this.vmScene.add(this.player.vmGroup);
  },

  startOnlineHost() { this.startOnline(CS.NETROLE.HOST); },
  startOnlineClient() { this.startOnline(CS.NETROLE.CLIENT); },

  startOnline(role) {
    this.stopToMenu(true);
    this.mode = CS.MODE.ONLINE;
    this.online = { role, roundWins: { me: 0, them: 0 }, opponentLeft: false, scoreMe: 0, scoreThem: 0 };
    this.remotePlayers = [];
    this.player = new Player({ id: 'p1', name: (Store.data.name || 'Игрок').slice(0, 14), isLocal: true, team: role === CS.NETROLE.HOST ? 'ct' : 't' });
    this.player.money = 800;
    this.player.give('glock'); this.player.give('knife');
    this.player.slot = 1;
    this.attachViewModel();

    const rp = new RemotePlayer(Net.partnerName || 'Соперник', role === CS.NETROLE.HOST ? 't' : 'ct');
    this.remote = rp;
    this.remotePlayers = [rp];
    this.scene.add(rp.mesh);

    this.horde = null;
    this.effects = new Effects(this.scene, Store.data.quality);
    this.effects.clear();

    this.spawnPlayerLocal(role === CS.NETROLE.HOST ? 0 : 3);
    this.beginBuyPhase(30, role === CS.NETROLE.HOST ? 'РАУНД 1' : 'РАУНД 1');
    this.enterGame();
    UI.toast('Убейте соперника. Магазин: B');
  },

  enterGame() {
    this.running = true;
    this.paused = false;
    this.buyOpen = false;
    Input.enabled = true;          // arm keyboard, mouse buttons and wheel
    UI.show('hud');
    if (IS_TOUCH) {
      // touch has no pointer lock; the control overlay carries the input
      UI.el.clickToPlay.classList.add('hidden');
      TouchUI.update();
    } else {
      UI.el.clickToPlay.classList.remove('hidden');
      setTimeout(() => { if (this.running) Input.requestLock(); }, 120);
    }
    UI.el.netInfo.classList.toggle('hidden', this.mode !== CS.MODE.ONLINE);
    Audio3D_SFX.init(); Audio3D_SFX.resume(); Audio3D_SFX.ambientStart();
  },

  stopToMenu(keepRunning) {
    if (!keepRunning) {
      this.running = false;
      Input.enabled = false;
      Input.releaseLock();
      Audio3D_SFX.ambientStop();
      this.mode = CS.MODE.MENU;
      this.clearProjectiles();
      if (this.horde) { this.horde.clear(); this.horde = null; }
      if (this.remote) { this.scene.remove(this.remote.mesh); this.remote = null; }
      if (this.player && this.player.vmGroup && this.player.vmGroup.parent) this.player.vmGroup.parent.remove(this.player.vmGroup);
      if (this.effects) { this.effects.clear(); }
      this.offline = null; this.online = null;
      UI.hideOverlays();
      UI.lowHP(false);
      UI.renderMenuStats();
      UI.show('menu');
      Net.close(true);
    } else {
      this.clearProjectiles();
      if (this.horde) { this.horde.clear(); this.horde = null; }
      if (this.remote) { this.scene.remove(this.remote.mesh); this.remote = null; }
      if (this.player && this.player.vmGroup && this.player.vmGroup.parent) this.player.vmGroup.parent.remove(this.player.vmGroup);
      if (this.effects) this.effects.clear();
      this.remotePlayers = [];
    }
    this.buyOpen = false;
    this.roundState = 'idle';
  },

  spawnPlayerLocal(spawnIdx) {
    const s = MAP.playerSpawns[spawnIdx % MAP.playerSpawns.length];
    const y = this.world.groundAt(s.x, s.z, 3);
    const yaw = Math.atan2(-(0 - s.x), -(0 - s.z)); // face the arena centre
    this.player.resetSpawn(s.x, y + .05, s.z, yaw);
    this.camera.position.set(s.x, y + CFG.eyeHeight, s.z);
  },

  /* ============================================================
     BUY PHASE / ROUND FLOW
     ============================================================ */
  beginBuyPhase(seconds, label) {
    this.roundState = 'buy';
    this.buyTimer = seconds;
    this.roundT = seconds;
    UI.center(label || 'ЗАКУПКА', 'B — магазин', 1.8);
    if (this.mode === CS.MODE.ONLINE && Net.role === CS.NETROLE.HOST) {
      Net.send({ t: 'round', st: 'buy', time: seconds, no: this.roundNo + 1 });
    }
    this.roundNo++;
  },

  toggleBuy(on) {
    if (on && this.roundState !== 'buy') return;
    this.buyOpen = on;
    if (on) {
      UI.renderBuy(this.player, this.buyTimer);
      UI.show('buy');
      if (!IS_TOUCH) Input.releaseLock();
    } else {
      UI.show('hud');
      if (!IS_TOUCH) Input.requestLock();
    }
    if (IS_TOUCH) TouchUI.update();
  },

  tryBuy(id) {
    const w = WEAPONS[id];
    if (!w) return;
    if (this.roundState !== 'buy') { Audio3D_SFX.deny(); UI.toast('Магазин закрыт'); return; }
    if (this.player.has(id)) { Audio3D_SFX.deny(); UI.toast('Уже куплено'); return; }
    if (this.player.money < w.price) { Audio3D_SFX.deny(); UI.toast('Не хватает денег'); return; }
    this.player.money -= w.price;
    this.player.give(id);
    this.player.slot = w.slot;
    this.player.deployT = .5;
    this.player.buildViewModel();
    this.attachViewModel();
    Audio3D_SFX.buy();
    UI.toast('Куплено: ' + w.name, '#57d16a');
    UI.renderBuy(this.player, this.buyTimer);
    if (this.mode === CS.MODE.ONLINE) this.broadcastScore();
  },

  tryBuyGear(id) {
    const g = GEAR[id];
    if (!g) return;
    if (this.roundState !== 'buy') { Audio3D_SFX.deny(); return; }
    if (this.player.armor >= 100 && (!g.helmet || this.player.helmet)) { Audio3D_SFX.deny(); UI.toast('Уже куплено'); return; }
    if (this.player.money < g.price) { Audio3D_SFX.deny(); UI.toast('Не хватает денег'); return; }
    this.player.money -= g.price;
    this.player.armor = g.ap;
    if (g.helmet) this.player.helmet = true;
    Audio3D_SFX.buy();
    UI.toast('Куплено: ' + g.name, '#57d16a');
    UI.renderBuy(this.player, this.buyTimer);
    if (this.mode === CS.MODE.ONLINE) this.broadcastScore();
  },

  updateBuyPhase(dt) {
    if (this.roundState === 'buy') {
      this.buyTimer -= dt;
      this.roundT = this.buyTimer;
      if (this.buyOpen) UI.renderBuy(this.player, this.buyTimer);
      if (this.buyTimer <= 0) {
        if (this.buyOpen) this.toggleBuy(false);
        this.startLive();
      }
    } else if (this.roundState === 'live') {
      // Offline survival has no round clock — the wave ends when the horde is dead.
      // Online duels are timed, exactly like a real CS round.
      if (this.mode === CS.MODE.ONLINE) {
        this.roundT -= dt;
        if (this.roundT <= 0) this.endRound(null, 'ВРЕМЯ');
      } else if (this.offline) {
        this.offline.waveElapsed = (this.offline.waveElapsed || 0) + dt;
        this.roundT = this.offline.waveElapsed;
      }
    } else if (this.roundState === 'end') {
      this.roundT -= dt;
      if (this.roundT <= 0) this.nextRound();
    }
  },

  startLive() {
    this.roundState = 'live';
    this.roundT = CFG.roundTime;
    UI.center('В БОЙ!', this.mode === 'online' ? 'Уничтожьте соперника' : 'Волна ' + (this.offline ? this.offline.wave : 1), 1.4);
    if (this.mode === CS.MODE.OFFLINE && this.offline) {
      this.startWave();
    }
    if (this.mode === CS.MODE.ONLINE && Net.role === CS.NETROLE.HOST) {
      Net.send({ t: 'round', st: 'live', time: CFG.roundTime, no: this.roundNo });
    }
  },

  endRound(winnerIsMe, reason) {
    if (this.roundState === 'end') return;
    this.roundState = 'end';
    this.roundT = 4.0;
    if (this.mode === CS.MODE.ONLINE) {
      // The host owns the authoritative result and broadcasts it, so both
      // clients agree on the score no matter who died first.
      if (Net.role === CS.NETROLE.HOST) {
        if (winnerIsMe === true) this.online.roundWins.me++;
        else if (winnerIsMe === false) this.online.roundWins.them++;
        this.online.scoreMe = this.online.roundWins.me;
        this.online.scoreThem = this.online.roundWins.them;
        const won = winnerIsMe === true;
        const txt = won ? 'РАУНД ВЫИГРАН' : winnerIsMe === false ? 'РАУНД ПРОИГРАН' : 'НИЧЬЯ';
        UI.center(txt, this.online.scoreMe + ' : ' + this.online.scoreThem, 2.6);
        Audio3D_SFX.roundEnd(won);
        Net.send({ t: 'round', st: 'end', win: won ? 'host' : winnerIsMe === false ? 'client' : 'draw' });
        setTimeout(() => { if (this.roundState === 'end' && this.mode === CS.MODE.ONLINE) this.nextRound(); }, 4200);
      }
      // clients react to the host's 'round:end' message instead
    }
  },

  nextRound() {
    if (this.mode !== CS.MODE.ONLINE) return;
    if (Net.role !== CS.NETROLE.HOST) return;   // host drives the flow
    // only advance to a new round once the round actually ended
    if (this.roundState !== 'end') return;
    this.doNewRound();
    Net.send({ t: 'round', st: 'newround', no: this.roundNo });
  },

  doNewRound() {
    // host-only: reset both fighters, hand out cash, then open the buy phase
    this.player.health = CFG.maxHP;
    this.player.armor = 0; this.player.helmet = false;
    this.player.alive = true;
    this.player.money = Math.min(16000, this.player.money + 1400);
    this.spawnPlayerLocal(Math.random() < .5 ? 0 : 3);
    if (this.remote) { this.remote.alive = true; this.remote.health = CFG.maxHP; }
    Net.send({ t: 'respawn', x: this.player.pos.x, y: this.player.pos.y, z: this.player.pos.z, yaw: this.player.yaw });
    this.beginBuyPhase(25, 'РАУНД ' + (this.roundNo + 1));
  },

  /* ============================================================
     OFFLINE WAVES
     ============================================================ */
  startWave() {
    const o = this.offline;
    o.wave++;
    const count = Math.round(CFG.zombieStartCount + (o.wave - 1) * 2.4);
    o.totalThisWave = count;
    o.spawnedThisWave = 0;
    o.toSpawn = count;
    o.betweenWaves = false;
    o.waveStart = U.now();
    UI.center('ВОЛНА ' + o.wave, count + ' противников', 2.0);
    UI.toast('Волна ' + o.wave + ' — ' + count + ' зомби', '#e33a2e');
    Audio3D_SFX.waveStart();
    Bus.emit('waveStart', o.wave);
  },

  waveTypesFor(wave) {
    const pool = [{ t: 'walker', w: 10 }];
    if (wave >= 2) pool.push({ t: 'runner', w: Math.min(7, wave * .9) });
    if (wave >= 3) pool.push({ t: 'crawler', w: Math.min(5, wave * .6) });
    if (wave >= 4) pool.push({ t: 'tank', w: Math.min(4, wave * .45) });
    if (wave >= 5) pool.push({ t: 'spitter', w: Math.min(4, wave * .4) });
    if (wave >= 7) pool.push({ t: 'brute', w: Math.min(3, (wave - 5) * .4) });
    return pool;
  },
  pickZombieType(wave) {
    const pool = this.waveTypesFor(wave);
    let total = 0; pool.forEach(p => total += p.w);
    let r = Math.random() * total;
    for (const p of pool) { r -= p.w; if (r <= 0) return p.t; }
    return 'walker';
  },

  updateOffline(dt) {
    const o = this.offline;
    if (!o) return;
    if (o.betweenWaves) {
      o.breakT -= dt;
      if (o.breakT <= 0) {
        this.beginBuyPhase(22, 'ВОЛНА ' + (o.wave + 1));
        o.betweenWaves = false;
      }
      return;
    }
    if (this.roundState !== 'live') return;

    // spawn queue
    if (o.toSpawn > 0) {
      o.spawnAcc = (o.spawnAcc || 0) + dt;
      const interval = Math.max(.34, CFG.zombieSpawnInterval - o.wave * .045);
      let guard = 0;
      while (o.spawnAcc >= interval && o.toSpawn > 0 && guard++ < 6) {
        o.spawnAcc -= interval;
        // count dying bodies too: they still cost CPU and occupy space
        if (this.horde.activeCount >= CFG.zombieMaxAlive) break;
        const t = this.pickZombieType(o.wave);
        const scale = 1 + (o.wave - 1) * .085;
        const z = this.horde.spawnRandom(t, this.player.pos.x, this.player.pos.z, 26);
        z.maxHealth *= scale; z.health = z.maxHealth; z.dmg *= (1 + (o.wave - 1) * .05);
        o.toSpawn--; o.spawnedThisWave++;
      }
    } else if (this.horde.aliveCount === 0) {
      // wave cleared — the spawn queue is empty and nothing is left alive
      // (dying corpses are not re-captured here; they simply fade out)
      const bonus = 400 + o.wave * 120;
      this.player.money += bonus;
      this.player.score += 250 + o.wave * 40;
      o.betweenWaves = true;
      o.breakT = 7;
      Audio3D_SFX.roundEnd(true);
      UI.center('ВОЛНА ' + o.wave + ' ЗАЧИЩЕНА', 'Бонус $' + bonus + ' · Передышка 7с', 3.0);
      Bus.emit('waveCleared', o.wave);
      const recScore = Math.max(Store.data.best, this.player.score);
      const recWave = Math.max(Store.data.bestWave, o.wave);
      Store.data.best = recScore;
      Store.data.bestWave = recWave;
      Store.data.killsTotal += 0;
      Store.save();
      // partial heal
      this.player.health = Math.min(CFG.maxHP, this.player.health + 22);
    }
  },

  /* ============================================================
     COMBAT
     ============================================================ */
  /* Player eye position in world space (the camera's actual origin). */
  eyePos() {
    const p = this.player;
    return {
      x: p.pos.x,
      y: p.pos.y + (p.crouching ? CFG.eyeHeightCrouch : CFG.eyeHeight),
      z: p.pos.z
    };
  },

  /* Aim direction. Must include recoil/view-punch so that bullets always leave
     along the crosshair the player actually sees (cameraUpdate uses the same
     offsets). Otherwise shots drift off-target whenever recoil is active. */
  /* Weak aim assist for touch: nudges the view toward a target very close to
     the crosshair. Returns a look-delta to subtract (kept small so it assists
     rather than aims for the player). */
  touchAssist() {
    if (!IS_TOUCH) return { x: 0, y: 0 };
    const p = this.player;
    if (!p || !p.alive) return { x: 0, y: 0 };
    const eye = this.eyePos();
    const o = { x: eye.x, y: eye.y, z: eye.z };
    const dir = this.cameraDir();
    const T = 60;
    const hit = (this.mode === CS.MODE.OFFLINE && this.horde) ? this.horde.raycast(o, dir, T) : null;
    let tp = null;
    if (hit) tp = { x: o.x + dir.x * hit.t, y: o.y + dir.y * hit.t, z: o.z + dir.z * hit.t };
    else if (this.mode === CS.MODE.ONLINE && this.remote && this.remote.alive) {
      const h = this.rayRemotePlayer(o, dir, T);
      if (h) tp = h.point;
    }
    if (!tp) return { x: 0, y: 0 };
    const dx = tp.x - o.x, dy = tp.y - o.y, dz = tp.z - o.z;
    const dist = Math.hypot(dx, dy, dz) || 1;
    const wantYaw = Math.atan2(-dx, -dz);
    const wantPitch = Math.atan2(dy, Math.hypot(dx, dz));
    let dYaw = ((wantYaw - p.yaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    let dPitch = wantPitch - p.pitch;
    // only assist when already pointing close to the target
    if (Math.abs(dYaw) > 0.10 || Math.abs(dPitch) > 0.10) return { x: 0, y: 0 };
    return { x: dYaw * 0.14, y: dPitch * 0.14 };
  },

  cameraDir() {
    const p = this.player;
    const e = new THREE.Euler(
      p.pitch + p.recoil + p.viewPunchP,
      p.yaw + p.recoilYaw + p.viewPunchY,
      0, 'YXZ'
    );
    const d = _v3.set(0, 0, -1).applyEuler(e);
    return { x: d.x, y: d.y, z: d.z };
  },

  /* World-space muzzle position.
     The gun model lives in its own scene (so it never clips into walls), which
     means its matrixWorld is not map space. Rebuild the muzzle position from
     the camera basis: eye + forward*barrelLength + right/up gun offsets. */
  muzzleWorldPos(out) {
    const p = this.player;
    const eye = this.eyePos();
    const yaw = p.yaw + p.recoilYaw + p.viewPunchY;
    const pitch = p.pitch + p.recoil + p.viewPunchP;
    const e = new THREE.Euler(pitch, yaw, 0, 'YXZ');
    const fwd = _v1.set(0, 0, -1).applyEuler(e);
    const right = _v2.set(1, 0, 0).applyEuler(e);
    const up = new THREE.Vector3(0, 1, 0).applyEuler(e);
    const vm = p.vmGroup;
    const off = vm ? vm.position : { x: .2, y: -.2, z: -.46 };
    const muzzleZ = (p.vmInner && p.vmInner.userData.muzzleZ !== undefined) ? p.vmInner.userData.muzzleZ : -0.6;
    const forwardDist = U.clamp(Math.abs(off.z + muzzleZ), 0.45, 1.15);
    const v = out || new THREE.Vector3();
    v.set(
      eye.x + fwd.x * forwardDist + right.x * off.x + up.x * off.y,
      eye.y + fwd.y * forwardDist + right.y * off.x + up.y * off.y,
      eye.z + fwd.z * forwardDist + right.z * off.x + up.z * off.y
    );
    return v;
  },

  fire() {
    const p = this.player, w = p.weapon;
    if (!w || !p.canFire()) {
      if (w && w.mag <= 0 && p.reloadT <= 0 && p.deployT <= 0) { Audio3D_SFX.empty(); p.fireCd = .22; if (p.def !== WEAPONS.knife && p.def.mag !== Infinity) p.reload(); }
      return false;                 // no shot fired
    }
    const def = p.def;
    if (w.mag !== Infinity) w.mag--;
    p.fireCd = 60 / def.rpm;
    p.bulletsFired++;

    const origin = this.eyePos();
    const baseDir = this.cameraDir();
    const spread = p.aimSpread();
    const pellets = def.pellets || 1;
    const isMelee = def.slot === 3;

    // muzzle in world space, for tracers, muzzle smoke and projectiles
    const muzzleWorld = this.muzzleWorldPos();
    /* ---- projectile weapons launch a physical object ---- */
    if (def.projectile) {
      this.spawnProjectile(def, muzzleWorld, baseDir, p);
      // recoil / feedback still applies
      p.spread = Math.min(.09, p.spread + def.recoil * .0055);
      p.recoil += def.recoil * .0042;
      p.recoilYaw += U.rand(-1, 1) * def.recoil * .0016;
      p.viewPunchP += def.recoil * .0028;
      p.viewPunchY += U.rand(-1, 1) * def.recoil * .0012;
      p.flashT = .06;
      Audio3D_SFX.bananaShot(muzzleWorld.x, muzzleWorld.y, muzzleWorld.z);
      if (this.effects) this.effects.muzzleSmoke(muzzleWorld.x, muzzleWorld.y, muzzleWorld.z, baseDir);
      if (this.mode === CS.MODE.ONLINE) {
        Net.send({ t: 'shot', wid: w.id, ox: origin.x, oy: origin.y, oz: origin.z, dx: baseDir.x, dy: baseDir.y, dz: baseDir.z, sp: spread });
      }
      return true;
    }

    for (let i = 0; i < pellets; i++) {
      const dir = this.spreadDirection(baseDir, spread, pellets > 1);
      this.traceShot(origin, dir, def, isMelee, muzzleWorld);
    }

    // ---- recoil / view punch ----
    if (!isMelee) {
      p.spread = Math.min(.09, p.spread + def.recoil * .0055);
      p.recoil += def.recoil * .0042;
      p.recoilYaw += U.rand(-1, 1) * def.recoil * .0016;
      p.viewPunchP += def.recoil * .0028;
      p.viewPunchY += U.rand(-1, 1) * def.recoil * .0012;
      p.flashT = .05;
      Audio3D_SFX.shot(def.sound || 'rifle');
      if (this.effects) this.effects.muzzleSmoke(muzzleWorld.x, muzzleWorld.y, muzzleWorld.z, baseDir);
      // third-person shot broadcast
      if (this.mode === CS.MODE.ONLINE) {
        Net.send({ t: 'shot', wid: w.id, ox: origin.x, oy: origin.y, oz: origin.z, dx: baseDir.x, dy: baseDir.y, dz: baseDir.z, sp: spread });
      }
    } else {
      Audio3D_SFX.shot('knife');
    }
    return true;                     // a shot was actually fired
  },

  /* ============================================================
     PROJECTILES (bananas)
     ============================================================ */
  spawnProjectile(def, origin, dir, owner) {
    const p = this.player;
    const spread = p.aimSpread();
    const d = this.spreadDirection(dir, spread, false);
    const mesh = buildBananaProjectile();
    mesh.position.set(origin.x, origin.y, origin.z);
    mesh.rotation.x = Math.PI / 2;          // lie along the flight path
    this.scene.add(mesh);
    const speed = def.projSpeed || 30;
    this.projectiles.push({
      mesh: mesh,
      alive: true,
      life: 6,
      prev: { x: origin.x, y: origin.y, z: origin.z },
      pos: { x: origin.x, y: origin.y, z: origin.z },
      vel: { x: d.x * speed, y: d.y * speed, z: d.z * speed },
      grav: def.projGravity || 12,
      dmg: def.dmg,
      headMul: def.headMul || 1.6,
      ownerIsLocal: true
    });
    if (this.projectiles.length > 40) {
      const old = this.projectiles.shift();
      if (old.mesh.parent) old.mesh.parent.remove(old.mesh);
    }
  },

  updateProjectiles(dt) {
    if (!this.projectiles.length) return;
    const world = this.world;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.life -= dt;
      pr.prev.x = pr.pos.x; pr.prev.y = pr.pos.y; pr.prev.z = pr.pos.z;
      pr.vel.y -= pr.grav * dt;
      const nx = pr.pos.x + pr.vel.x * dt, ny = pr.pos.y + pr.vel.y * dt, nz = pr.pos.z + pr.vel.z * dt;

      // segment we travel this frame
      const segLen = Math.hypot(nx - pr.pos.x, ny - pr.pos.y, nz - pr.pos.z);
      const dir = segLen > 1e-6
        ? { x: (nx - pr.pos.x) / segLen, y: (ny - pr.pos.y) / segLen, z: (nz - pr.pos.z) / segLen }
        : { x: 0, y: -1, z: 0 };

      // ---- hit the horde? ----
      let hitZ = null;
      if (this.horde) hitZ = this.horde.raycast(pr.pos, dir, segLen + 0.35);
      // ---- hit the opponent? ----
      let hitP = null;
      if (this.mode === CS.MODE.ONLINE && this.remote && this.remote.alive) {
        const h = this.rayRemotePlayer(pr.pos, dir, segLen + 0.35);
        if (h && (!hitZ || h.t < hitZ.t)) hitP = h;
      }
      // ---- hit the world? ----
      const wallHits = world.raycastAll(pr.pos, dir, segLen + 0.1, ['ground']);

      let impactPoint = null, impactNormal = null;
      const bestTarget = hitP ? hitP.part : (hitZ ? hitZ.part : null);
      const targetT = hitP ? hitP.t : (hitZ ? hitZ.t : Infinity);

      if (bestTarget !== null && targetT <= segLen + 0.35 && (!wallHits.length || targetT <= wallHits[0].t)) {
        if (hitP) {
          const hs = hitP.part === 'head';
          const limb = hitP.part === 'legs';
          const mul = hs ? pr.headMul : limb ? CFG.limbMultiplier : 1;
          this.sendPvpHit(pr.dmg * mul, hitP.part, hs);
          impactPoint = hitP.point;
        } else {
          const killed = hitZ.zombie.takeDamage(pr.dmg, hitZ.part, dir);
          this.player.damageDealt += pr.dmg;
          if (killed) { /* scored in onZombieDied */ }
          this.player.bulletsHit++;
          impactPoint = { x: pr.pos.x + dir.x * hitZ.t, y: pr.pos.y + dir.y * hitZ.t, z: pr.pos.z + dir.z * hitZ.t };
        }
      } else if (wallHits.length) {
        impactPoint = wallHits[0].point;
        impactNormal = wallHits[0].normal;
      }

      if (impactPoint) {
        this.effects.bananaSplat(impactPoint.x, impactPoint.y, impactPoint.z);
        Audio3D_SFX.bananaSplat(impactPoint.x, impactPoint.y, impactPoint.z);
        UI.hitmark(false);
        this.removeProjectile(i);
        continue;
      }

      pr.pos.x = nx; pr.pos.y = ny; pr.pos.z = nz;
      pr.mesh.position.set(pr.pos.x, pr.pos.y, pr.pos.z);
      // point the banana along its velocity
      const vl = Math.hypot(pr.vel.x, pr.vel.y, pr.vel.z) || 1;
      pr.mesh.lookAt(pr.pos.x + pr.vel.x / vl, pr.pos.y + pr.vel.y / vl, pr.pos.z + pr.vel.z / vl);
      pr.mesh.rotateZ(Math.PI / 2);
      pr.mesh.rotateY(Math.sin(performance.now() * .02) * .4);   // silly spin
      if (pr.life <= 0 || pr.pos.y < -3) this.removeProjectile(i);
    }
  },

  removeProjectile(i) {
    const pr = this.projectiles[i];
    if (pr && pr.mesh.parent) pr.mesh.parent.remove(pr.mesh);
    this.projectiles.splice(i, 1);
  },

  clearProjectiles() {
    for (const pr of this.projectiles) { if (pr.mesh.parent) pr.mesh.parent.remove(pr.mesh); }
    this.projectiles.length = 0;
  },

  spreadDirection(base, spread, wide) {    if (spread <= 0.00001) return { x: base.x, y: base.y, z: base.z };
    // build an orthonormal basis around the aim direction
    const up = Math.abs(base.y) > .95 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
    let rx = base.y * up.z - base.z * up.y, ry = base.z * up.x - base.x * up.z, rz = base.x * up.y - base.y * up.x;
    const rl = Math.hypot(rx, ry, rz) || 1; rx /= rl; ry /= rl; rz /= rl;
    const ux = ry * base.z - rz * base.y, uy = rz * base.x - rx * base.z, uz = rx * base.y - ry * base.x;
    const ang = Math.random() * Math.PI * 2;
    const mag = Math.sqrt(Math.random()) * spread;
    const ox = Math.cos(ang) * mag, oy = Math.sin(ang) * mag;
    const dx = base.x + rx * ox + ux * oy, dy = base.y + ry * ox + uy * oy, dz = base.z + rz * ox + uz * oy;
    const l = Math.hypot(dx, dy, dz) || 1;
    return { x: dx / l, y: dy / l, z: dz / l };
  },

  traceShot(origin, dir, def, isMelee, muzzleWorld) {
    const p = this.player;
    const maxDist = def.range || 100;
    const end = { x: origin.x + dir.x * maxDist, y: origin.y + dir.y * maxDist, z: origin.z + dir.z * maxDist };

    // ---- melee ----
    if (isMelee) {
      const hit = this.horde ? this.horde.raycast(origin, dir, def.range) : null;
      const wallHit = this.world.raycast(origin, dir, def.range, ['ground']);
      if (hit && (!wallHit || hit.t < wallHit.t)) {
        p.bulletsHit++;
        hit.zombie.takeDamage(def.dmg * (def.headMul || 1) / (def.headMul || 1), hit.part, dir);
        this.hitEffect(hit.point, dir, hit.part, true);
        Audio3D_SFX.hit(hit.point.x, hit.point.y, hit.point.z, hit.part === 'head');
      } else if (wallHit && this.effects) {
        this.effects.impact(wallHit.point, wallHit.normal, 'concrete');
      }
      if (this.mode === CS.MODE.ONLINE) this.traceRemotePlayer(origin, dir, Math.min(def.range, maxDist), def, dir);
      return;
    }

    // ---- bullets: walk through penetrable cover, stop at walls ----
    const wallHits = this.world.raycastAll(origin, dir, maxDist, ['ground']);
    const zHit = this.horde ? this.horde.raycast(origin, dir, maxDist) : null;
    let dmgMul = 1;
    let stopT = maxDist;
    let stopNormal = null;
    let stopPoint = null;

    for (let i = 0; i < wallHits.length; i++) {
      const h = wallHits[i];
      if (zHit && zHit.t < h.t) break;             // zombie is in front of this wall
      const thick = (h.t2 !== undefined ? (h.t2 - h.t) : 1.0);
      const penetrable = (h.box.tag === 'cover' || h.box.tag === 'wood') && thick < 0.75 && dmgMul > .35;
      if (penetrable) { dmgMul *= CFG.wallbangLoss; continue; }
      stopT = h.t; stopNormal = h.normal; stopPoint = h.point;
      break;
    }

    // online: also test the opponent
    let pvpHit = null;
    if (this.mode === CS.MODE.ONLINE && this.remote && this.remote.alive) {
      pvpHit = this.rayRemotePlayer(origin, dir, maxDist);
      if (pvpHit && (zHit ? pvpHit.t < zHit.t || !zHit : true) && pvpHit.t <= stopT) {
        // resolve below
      } else pvpHit = null;
    }

    if (pvpHit && pvpHit.t <= stopT && (!zHit || pvpHit.t < zHit.t)) {
      // hit the opposing player
      p.bulletsHit++;
      const hs = pvpHit.part === 'head';
      const limb = pvpHit.part === 'legs';
      const partMul = hs ? (def.headMul || CFG.headshotMultiplier) : limb ? CFG.limbMultiplier : 1;
      const dmg = def.dmg * partMul * dmgMul;
      this.sendPvpHit(dmg, pvpHit.part, hs);
      this.hitEffect(pvpHit.point, dir, pvpHit.part, hs);
      Audio3D_SFX.hit(pvpHit.point.x, pvpHit.point.y, pvpHit.point.z, hs);
      this.effects.tracer(muzzleWorld, pvpHit.point, 1, true);
      this.effects.bloodBurst(pvpHit.point, dir, hs ? 14 : 8);
      if (Net.ping > 0) { /* ping-based compensation could go here */ }
      return;
    }

    if (zHit && zHit.t <= stopT) {
      p.bulletsHit++;
      const dmg = def.dmg * dmgMul;
      const killed = zHit.zombie.takeDamage(dmg, zHit.part, dir);
      p.damageDealt += dmg * (zHit.part === 'head' ? CFG.headshotMultiplier : zHit.part === 'legs' ? CFG.limbMultiplier : 1);
      this.hitEffect(zHit.point, dir, zHit.part, zHit.part === 'head');
      Audio3D_SFX.hit(zHit.point.x, zHit.point.y, zHit.point.z, zHit.part === 'head');
      this.effects.tracer(muzzleWorld, zHit.point, 1, true);
      return;
    }

    // hit geometry
    if (stopPoint) {
      this.effects.tracer(muzzleWorld, stopPoint, 1, true);
      const surf = (stopNormal && Math.abs(stopNormal.y) > .7) ? 'concrete' : 'concrete';
      this.effects.impact(stopPoint, stopNormal, surf);
      Audio3D_SFX.tone(140, .06, 'triangle', .05, stopPoint.x, stopPoint.y, stopPoint.z, 90);
    } else {
      this.effects.tracer(muzzleWorld, end, 1, false);
    }
  },

  hitEffect(point, dir, part, headshot) {
    this.effects.bloodBurst(point, dir, headshot ? 14 : part === 'legs' ? 5 : 8);
    UI.hitmark(false);
    this._hitmarkT = U.now();
  },

  traceRemotePlayer(origin, dir, maxDist, def) {
    // knife swing against the opponent
    if (this.mode !== CS.MODE.ONLINE || !this.remote || !this.remote.alive) return;
    const h = this.rayRemotePlayer(origin, dir, maxDist);
    if (h) {
      const hs = h.part === 'head';
      const dmg = def.dmg * (hs ? 2 : 1);
      this.sendPvpHit(dmg, h.part, hs);
      this.effects.bloodBurst(h.point, dir, 8);
      Audio3D_SFX.hit(h.point.x, h.point.y, h.point.z, hs);
    }
  },

  rayRemotePlayer(origin, dir, maxDist) {
    const rp = this.remote;
    if (!rp || !rp.alive) return null;
    const r = rp.crouching ? .42 : .44;
    const base = { x: rp.pos.x, y: rp.pos.y, z: rp.pos.z };
    const parts = [
      { part: 'head', y0: rp.height * .78, y1: rp.height * 1.02, r: .19 },
      { part: 'body', y0: rp.height * .42, y1: rp.height * .80, r: .30 },
      { part: 'legs', y0: 0, y1: rp.height * .44, r: .24 }
    ];
    let best = null;
    for (const pt of parts) {
      const b = AABB(base.x - pt.r, base.y + pt.y0, base.z - pt.r, base.x + pt.r, base.y + pt.y1, base.z + pt.r);
      const h = rayBox(origin, dir, b, maxDist);
      if (h && (!best || h.t < best.t)) best = { t: h.t, part: pt.part };
    }
    if (best) best.point = { x: origin.x + dir.x * best.t, y: origin.y + dir.y * best.t, z: origin.z + dir.z * best.t };
    return best;
  },

  sendPvpHit(dmg, part, headshot) {
    UI.hitmark(false);
    this._hitmarkT = U.now();
    Net.send({ t: 'hit', dmg: Math.round(dmg), part, hs: headshot ? 1 : 0, at: U.now() });
  },

  playerHurt(dmg, source) {
    const p = this.player;
    if (!p.alive || this.mode !== CS.MODE.OFFLINE) return;
    this.applyDamageToSelf(dmg, source ? { x: source.pos.x, y: source.pos.y, z: source.pos.z } : null);
  },

  applyDamageToSelf(dmg, fromPos) {
    const p = this.player;
    if (!p.alive) return;
    let actual = dmg;
    if (p.armor > 0) {
      const absorbed = Math.min(p.armor, actual * .5);
      p.armor -= absorbed;
      actual -= absorbed;
      if (p.armor < 0) p.armor = 0;
    }
    p.health -= actual;
    Audio3D_SFX.hurt();
    UI.dmgFlash();
    if (fromPos) {
      const ang = Math.atan2(fromPos.x - p.pos.x, fromPos.z - p.pos.z) - p.yaw;
      UI.damageDirection(ang);
    }
    if (p.health <= 0) {
      p.health = 0;
      this.onLocalDeath();
    }
  },

  onLocalDeath() {
    const p = this.player;
    if (!p.alive) return;
    p.alive = false;
    p.deaths++;
    Audio3D_SFX.roundEnd(false);
    if (this.mode === CS.MODE.OFFLINE) {
      const o = this.offline;
      if (p.score > Store.data.best) { Store.data.best = p.score; Store.save(); }
      if (o.wave > Store.data.bestWave) { Store.data.bestWave = o.wave; Store.save(); }
      Store.data.killsTotal += p.zombieKills; Store.save();
      UI.center('ВЫ ПОГИБЛИ', 'Счёт: ' + p.score + ' · Волна ' + o.wave, 4.0);
      UI.toast('Волна ' + o.wave + ' · Счёт ' + p.score + ' · Нажмите Tab для статистики', '#e33a2e');
      this.roundState = 'end';
      this.roundT = 5.0;
      this.offlineDead = true;
    } else {
      UI.center('ВАС УБИЛИ', this.online ? ('Счёт ' + this.online.scoreMe + ' : ' + this.online.scoreThem) : '', 2.6);
      Net.send({ t: 'died', at: U.now() });
      // the host decides the round result; the client waits for its message
      if (Net.role === CS.NETROLE.HOST) this.endRound(false, 'death');
    }
  },

  onZombieDied(z, headshot) {
    const p = this.player;
    p.zombieKills++;
    p.kills++;
    const def = z.def;
    p.money = Math.min(16000, p.money + def.money);
    p.score += def.score * (headshot ? 1.5 : 1) | 0;
    if (headshot) p.headshots++;
    Audio3D_SFX.kill();
    UI.hitmark(true);
    this._hitmarkT = U.now();
    UI.feed('<b>' + U.esc(p.name) + '</b> <span class="z">✖ ' + def.name + (headshot ? ' (в голову)' : '') + '</span> +$' + def.money);
    if (headshot) UI.toast('В ГОЛОВУ! +$' + def.money + ' +' + Math.round(def.score * 1.5) + ' очков', '#ff9d21');
    Bus.emit('kill', z, headshot);
  },

  onZombieHit(z, part, dmg, dir) {
    if (part === 'head') { /* handled in onZombieDied for kills */ }
  },

  /* ============================================================
     NETWORKING (online)
     ============================================================ */
  resetLobby() {
    if (!UI.el.lobbyMain) return;
    UI.el.lobbyMain.classList.remove('hidden');
    if (UI.el.joinRow) UI.el.joinRow.classList.add('hidden');
    if (UI.el.hostRow) UI.el.hostRow.classList.add('hidden');
    if (UI.el.roomCode) { UI.el.roomCode.textContent = '·····'; }
    this.setLobbyStatus('');
    if (UI.el.inName) UI.el.inName.value = Store.data.name || '';
  },

  doHost() {
    const name = (UI.el.inName.value || 'Игрок').slice(0, 14);
    if (!name) { this.setLobbyStatus('Введите ник', true); return; }
    Store.data.name = name; Store.save();
    UI.el.hostRow.classList.remove('hidden');
    UI.el.joinRow.classList.add('hidden');
    UI.el.roomCode.textContent = '·····';
    this.setLobbyStatus('Создаём комнату…');
    Net.host(name,
      () => {
        // the code can change if the first id was taken; refresh the display
        this.showRoomCode();
      },
      err => {
        // If the signalling server cannot be reached the room cannot exist,
        // so never present an invalid code as if it were real.
        UI.el.roomCode.textContent = 'ОШИБКА';
        this.setLobbyStatus(err + ' Код комнаты не создан — проверьте интернет и попробуйте снова.', true);
      }
    );
    // Net.host() assigns the code synchronously, so show it right away instead
    // of leaving the placeholder dots until the network round-trip completes.
    this.showRoomCode();
  },

  showRoomCode() {
    const el = UI.el.roomCode;
    if (!el) return;
    if (Net.role !== CS.NETROLE.HOST || !Net.code) { el.textContent = '·····'; return; }
    el.textContent = Net.code;
    el.style.letterSpacing = '12px';
    el.style.fontSize = '38px';
    this.setLobbyStatus('Комната создана. Ждём второго игрока…');
    setTimeout(() => { if (el.textContent === Net.code) UI.toast('Код комнаты: ' + Net.code); }, 400);
  },

  doJoin() {
    const name = (UI.el.inName.value || 'Игрок').slice(0, 14);
    const code = (UI.el.inCode.value || '').toUpperCase().trim();
    if (code.length < 4) { this.setLobbyStatus('Введите код комнаты (4–5 символов)', true); return; }
    Store.data.name = name; Store.save();
    this.setLobbyStatus('Подключение к ' + code + '…');
    UI.show('connect');
    UI.el.connTitle.textContent = 'ПОДКЛЮЧЕНИЕ';
    UI.el.connStatus.textContent = 'Ищем комнату ' + code + '…';
    Net.join(code, name, err => {
      this.setLobbyStatus(err, true);
      UI.el.connStatus.textContent = err;
      setTimeout(() => { if (!Net.connected) UI.show('lobby'); }, 1600);
    });
  },

  setLobbyStatus(text, isErr) {
    const e = UI.el.lobbyStatus;
    if (!e) return;
    e.textContent = text || '';
    e.classList.toggle('err', !!isErr);
  },

  onPeerHello(m) {
    Net.partnerName = m.name;
    UI.toast('Подключился: ' + m.name, '#57d16a');
    // both peers start the match; the host's beginBuyPhase (called inside
    // startOnline) broadcasts the authoritative round state to the client
    this.startOnline(Net.role);
  },

  onNetConnected() {
    UI.el.connTitle.textContent = 'СОЕДИНЕНО';
    UI.el.connStatus.textContent = 'Ожидание соперника…';
    this.setLobbyStatus('Соединено!', false);
  },

  onNetDisconnected() {
    if (this.mode !== CS.MODE.ONLINE) return;
    UI.center('СОПЕРНИК ОТКЛЮЧИЛСЯ', 'Выход в меню', 3.0);
    UI.toast('Соперник отключился', '#e33a2e');
    setTimeout(() => { if (this.mode === CS.MODE.ONLINE) this.stopToMenu(); }, 3200);
  },

  broadcastState() {
    if (this.mode !== CS.MODE.ONLINE || !Net.connected) return;
    const p = this.player;
    Net.send({
      t: 'state', rt: U.now(),
      x: +p.pos.x.toFixed(2), y: +p.pos.y.toFixed(2), z: +p.pos.z.toFixed(2),
      yw: +p.yaw.toFixed(3), pt: +p.pitch.toFixed(3),
      alive: p.alive ? 1 : 0, cr: p.crouching ? 1 : 0,
      hp: Math.round(p.health), ar: Math.round(p.armor), sl: p.slot,
      k: p.kills, d: p.deaths, sc: p.score
    });
  },

  broadcastScore() {
    if (this.mode !== CS.MODE.ONLINE || !Net.connected) return;
    const p = this.player;
    Net.send({ t: 'score', k: p.kills, d: p.deaths, sc: p.score, hp: Math.round(p.health), ar: Math.round(p.armor), m: Math.round(p.money) });
  },

  onRemoteState(s) {
    if (!this.remote) return;
    this.remote.pushSnapshot(s);
    if (s.k !== undefined) { this.remote.kills = s.k; this.remote.deaths = s.d; this.remote.score = s.sc; }
    if (s.hp !== undefined) this.remote.health = s.hp;
    this.remote.slot = s.sl;
    if (!s.alive && this.remote.alive) { /* they died */ }
  },

  onRemoteShot(s) {
    if (!this.remote) return;
    const def = WEAPONS[s.wid] || WEAPONS.ak47;
    // tracer from their muzzle
    const rp = this.remote;
    const from = { x: s.ox, y: s.oy, z: s.oz };
    const dir = { x: s.dx, y: s.dy, z: s.dz };
    const maxDist = def.range || 100;
    // compute where it lands against our world (visual only)
    const wallHits = this.world.raycastAll(from, dir, maxDist, ['ground']);
    let endT = maxDist, p = null, n = null;
    for (const h of wallHits) { endT = h.t; p = h.point; n = h.normal; break; }
    const end = p || { x: from.x + dir.x * endT, y: from.y + dir.y * endT, z: from.z + dir.z * endT };
    this.effects.tracer({ x: rp.pos.x, y: rp.pos.y + 1.35, z: rp.pos.z }, end, 1.4, true);
    if (p) this.effects.impact(p, n, 'concrete');
    Audio3D_SFX.shot(def.sound || 'rifle', rp.pos.x, rp.pos.y + 1.4, rp.pos.z);
  },

  onRemoteHit(h) {
    // the opponent reports they hit *us* → apply the damage locally
    if (this.mode !== CS.MODE.ONLINE) return;
    // trust the shooter's hit; apply it
    this.applyDamageToSelf(h.dmg, this.remote ? { x: this.remote.pos.x, y: this.remote.pos.y + 1.2, z: this.remote.pos.z } : null);
  },

  onRemoteDied(d) {
    if (!this.remote) return;
    this.remote.alive = false;
    // Credit the local player: the opponent's death is authoritative from
    // their own client, so this is the correct place to score the kill.
    this.player.kills++;
    this.player.score += 300;
    Audio3D_SFX.kill();
    UI.hitmark(true);
    UI.feed('<b>' + U.esc(this.player.name) + '</b> ✖ <span style="color:#ff6b5b">' + U.esc(this.remote.name) + '</span>');
    UI.center('СОПЕРНИК УНИЧТОЖЕН', '', 2.0);
    Store.data.killsTotal++;
    Store.save();
    if (Net.role === CS.NETROLE.HOST) this.endRound(true, 'kill');
    else if (this.online) this.online.scoreMe = this.online.roundWins.me;
  },

  onRemoteRespawn(r) {
    if (!this.remote) return;
    this.remote.alive = true;
    this.remote.health = CFG.maxHP;
    this.remote.applySnap({ x: r.x, y: r.y, z: r.z, yw: r.yaw, pt: 0, alive: 1, cr: 0 });
    this.remote.buf.length = 0;
    this.remote.mesh.visible = true;
    this.remote.mesh.scale.y = 1;
  },

  onRoundMsg(r) {
    if (this.mode !== CS.MODE.ONLINE || Net.role !== CS.NETROLE.CLIENT) return;
    switch (r.st) {
      case 'buy':
        this.roundNo = Math.max(this.roundNo, r.no || this.roundNo);
        this.beginBuyPhaseClient(r.time || 30);
        break;
      case 'live':
        this.roundState = 'live';
        this.roundT = r.time || CFG.roundTime;
        UI.center('В БОЙ!', 'Уничтожьте соперника', 1.4);
        break;
      case 'end':
        this.endRoundClient(r.win);
        break;
      case 'newround':
        this.doNewRoundClient();
        break;
    }
  },

  beginBuyPhaseClient(sec) {
    this.roundState = 'buy';
    this.buyTimer = sec;
    this.roundT = sec;
    this.roundNo++;
    UI.center('ЗАКУПКА', 'B — магазин', 1.8);
  },

  endRoundClient(win) {
    if (this.roundState === 'end') return;
    this.roundState = 'end'; this.roundT = 4.2;
    if (win === 'host') this.online.roundWins.them++;
    else if (win === 'client') this.online.roundWins.me++;
    this.online.scoreMe = this.online.roundWins.me;
    this.online.scoreThem = this.online.roundWins.them;
    const txt = win === 'host' ? 'РАУНД ПРОИГРАН' : win === 'client' ? 'РАУНД ВЫИГРАН' : 'НИЧЬЯ';
    UI.center(txt, this.online.scoreMe + ' : ' + this.online.scoreThem, 2.6);
    Audio3D_SFX.roundEnd(win !== 'host');
  },

  doNewRoundClient() {
    this.player.health = CFG.maxHP;
    this.player.armor = 0; this.player.helmet = false;
    this.player.alive = true;
    this.player.money = Math.min(16000, this.player.money + 1400);
    if (this.remote) { this.remote.alive = true; this.remote.health = CFG.maxHP; }
    this.spawnPlayerLocal(Math.random() < .5 ? 1 : 4);
    this.beginBuyPhaseClient(25);
  },

  onScoreMsg(s) {
    if (!this.remote) return;
    this.remote.kills = s.k; this.remote.deaths = s.d; this.remote.score = s.sc;
    if (s.hp !== undefined) this.remote.health = s.hp;
    this.online.scoreThem = s.sc;
  },

  /* ============================================================
     MAIN LOOP
     ============================================================ */
  loop() {
    requestAnimationFrame(this._loopBound);
    const now = performance.now();
    let dt = (now - this._last) / 1000;
    this._last = now;
    if (dt > .1) dt = .1;
    if (dt <= 0) return;
    this.step(dt);
  },

  /* One simulation + render step. Split out from loop() so it can be driven
     deterministically (tests / replays / catch-up). */
  step(dt) {
    // fps counter
    this._fpsAcc += dt; this._fpsFrames++;
    if (this._fpsAcc > .5) {
      const fps = Math.round(this._fpsFrames / this._fpsAcc);
      const e = UI.el.fps;
      if (e) e.textContent = fps + ' FPS' + (this.horde ? ' · ' + this.horde.list.length + ' zombies' : '');
      this._fpsAcc = 0; this._fpsFrames = 0;
    }

    if (!this.running || this.mode === CS.MODE.MENU) { this.renderMenu(); return; }
    if (this.paused) { this.renderFrame(dt); return; }

    const p = this.player;
    if (!p) return;

    // ---- input → player ----
    const mv = Input.moveVector();
    const m = Input.lookDelta();
    // Block on any UI overlay. The buy menu has DOM inputs, so mouse-delta
    // accumulation is cleared on unlock (see Input.onLockChange / toggleBuy)
    // to avoid a view snap when the crosshair returns.
    const uiBlocked = UI.overlayOpen() && !this.buyOpen;
    const canLook = IS_TOUCH ? (!uiBlocked && !this.buyOpen) : (Input.locked && !this.buyOpen && !uiBlocked);
    if (canLook) {
      let dx = m.dx, dy = m.dy;
      // touch "assist": gently stick to a target near the crosshair
      if (IS_TOUCH) { const a = this.touchAssist(); dx -= a.x; dy -= a.y; }
      p.yaw -= dx;
      p.pitch -= dy;
      p.pitch = U.clamp(p.pitch, -1.5, 1.5);
      p.yaw = ((p.yaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    }
    p.in.f = mv.f; p.in.r = mv.r; p.in.run = mv.run; p.in.crouch = mv.crouch;
    // jump: held Space on desktop; on touch it is a one-shot, so wantJump must be
    // cleared again or the player would re-jump every time they touch the ground
    if (IS_TOUCH) {
      p.in.wantJump = Input.consumeJump() && p.onGround;
    } else {
      if (mv.wantJump && p.onGround) p.in.wantJump = true;
      if (!mv.wantJump) p.in.wantJump = false;
    }

    if (IS_TOUCH) {
      if (Input.consumeReload()) p.reload();
      if (Input.consumeWeaponSwitch()) this.switchSlot(p.nextSlot());
      // tapping the look half fires one shot (there is no fire button on phones)
      if (TouchUI.tapFire) { TouchUI.tapFire = false; p.triggerDown = true; this._tapFireRelease = 2; }
      if (this._tapFireRelease > 0 && --this._tapFireRelease === 0) p.triggerDown = false;
    }

    p._wantAim = Input.aimDown() && canLook;

    // scroll to switch weapons
    if (m.wheel && !this.buyOpen) this.switchSlot(p.nextSlot());

    // ---- shooting ----
    // Firing is only allowed once the match is live: not during the buy phase
    // and not while the buy menu is open.
    if (p.alive && !this.buyOpen && this.roundState === 'live') {
      const def = p.def;
      if (def.auto || def.slot === 3) {
        // automatic weapons fire continuously while held
        if (p.triggerDown) this.fire();
      } else if (p.triggerDown && !p._semiLatch) {
        // semi-auto fallback for synthetic input (tests/replays) and retry after
        // a deploy/reload; a real mouse press already fires and sets the latch
        if (this.fire()) p._semiLatch = true;
      }
      if (!p.triggerDown) p._semiLatch = false;
    } else if (!p.triggerDown) {
      p._semiLatch = false;
    }

    // ---- movement is frozen during the buy phase (CS-style freeze time) ----
    const frozen = this.roundState === 'buy';
    const pin = frozen ? { f: 0, r: 0, run: false, crouch: p.in.crouch, wantJump: false } : p.in;

    // ---- physics ----
    p.update(dt, this.world, pin);
    p.tickWeapon(dt, this);

    // ---- round flow ----
    this.updateBuyPhase(dt);
    if (this.mode === CS.MODE.OFFLINE) this.updateOffline(dt);

    // ---- AI ----
    if (this.horde) this.horde.update(dt, p);

    // ---- effects ----
    if (this.effects) this.effects.update(dt);

    // ---- flying bananas ----
    this.updateProjectiles(dt);

    // ---- networking ----
    if (this.mode === CS.MODE.ONLINE) {
      Net.tick(dt);
      this._netStateT -= dt;
      if (this._netStateT <= 0) { this._netStateT = 1 / CFG.netSendLocalHz; this.broadcastState(); }
      if (this.remote) { this.remote.interp(95); this.remote.sync(); }
    }

    // ---- death handling offline ----
    if (this.mode === CS.MODE.OFFLINE && this.offlineDead) {
      this.offlineDeadT = (this.offlineDeadT || 0) + dt;
      if (this.roundT <= 0) this.restartOfflineOffer();
    }

    this.cameraUpdate(dt);
    this.renderFrame(dt);
    this.updateHUD(dt);
    if (IS_TOUCH) TouchUI.update();
  },

  restartOfflineOffer() {
    if (this._offeredRestart) return;
    this._offeredRestart = true;
    UI.center('ВЫ ПОГИБЛИ', 'Enter — начать заново · Tab — статистика', 600);
    this._restartPending = true;
  },

  cameraUpdate(dt) {
    const p = this.player;
    const eyeH = p.crouching ? CFG.eyeHeightCrouch : CFG.eyeHeight;
    const dead = !p.alive;
    const curEye = dead ? .42 : eyeH;
    // bob & sway
    const hspeed = Math.hypot(p.vel.x, p.vel.z);
    const spd = U.clamp(hspeed / CFG.runSpeed, 0, 1);
    const bobX = Math.sin(p.bobPhase * Math.PI * 2) * 0.022 * spd;
    const bobY = Math.abs(Math.sin(p.bobPhase * Math.PI * 2)) * -.030 * spd;
    const land = p.landImpact;
    p.landImpact = U.lerp(p.landImpact, 0, 1 - Math.pow(0.00001, dt));

    const fov = this.baseFov / (1 + (p.zoom || 0) * (p.def.zoom ? (p.def.zoom - 1) : 0));
    if (Math.abs(this.camera.fov - fov) > .01) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }
    this.vmCamera.fov = 58 - (p.zoom || 0) * 24;
    this.vmCamera.updateProjectionMatrix();

    const recoilPitch = p.recoil + p.viewPunchP;
    const recoilYaw = p.recoilYaw + p.viewPunchY;

    this.camera.position.set(
      p.pos.x + bobX * .4,
      p.pos.y + curEye + bobY - land * .22,
      p.pos.z
    );
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = p.yaw + recoilYaw;
    this.camera.rotation.x = p.pitch + recoilPitch;
    this.camera.rotation.z = U.lerp(this.camera.rotation.z, dead ? .85 : (p.in.r || 0) * -0.012 + bobX * .5, .12);

    // ---- weapon view model ----
    const vm = p.vmGroup;
    if (vm) {
      const def = p.def;
      const reloadK = p.reloadT > 0 ? 1 - Math.abs(p.reloadT / p.reloadTotal - .5) * 2 : 0;
      const deployK = U.clamp(p.deployT / .42, 0, 1);
      const runK = (p.in.run && spd > .3) ? spd : 0;
      const zoomHide = p.zoom > .55;
      vm.visible = !zoomHide;
      const baseX = .20, baseY = -.20, baseZ = -.46;
      const swayX = -recoilYaw * 2.2;
      const swayY = -recoilPitch * 1.6;
      const idleX = Math.sin(U.now() * .0014) * .004;
      const idleY = Math.cos(U.now() * .0019) * .004;
      const bobWX = Math.sin(p.bobPhase * Math.PI * 2) * .016 * spd;
      const bobWY = Math.abs(Math.cos(p.bobPhase * Math.PI * 2)) * .014 * spd;
      vm.position.set(
        baseX + swayX + idleX + bobWX - runK * .07,
        baseY + swayY + idleY + bobWY - deployK * .5 - runK * .05 - reloadK * .12,
        baseZ + recoilPitch * 1.4 + reloadK * .04
      );
      vm.rotation.set(
        recoilPitch * 5.5 + deployK * .8 + reloadK * .5,
        -recoilYaw * 4.5 - runK * .3,
        -reloadK * .55 + runK * .18
      );
      if (p.flashT <= 0 && p.flashMesh) p.flashMesh.material.opacity = 0;
      if (p.flashT <= 0 && p.flashLight) p.flashLight.intensity = 0;
    }

    // crosshair
    const spreadPx = p.aimSpread() * 900 + (p.reloadT > 0 ? 14 : 0);
    UI.setCrosshairSpread(spreadPx);
    UI.crosshairState(p.zoom > .5, this._enemyFound);
    UI.scope(p.zoom > .5 && !!p.def.zoom);

    // enemy-under-crosshair check (every few frames)
    this._enemyCheck -= dt;
    if (this._enemyCheck <= 0) {
      this._enemyCheck = .06;
      const o = { x: p.pos.x, y: p.pos.y + eyeH, z: p.pos.z };
      const d = this.cameraDir();
      if (this.mode === CS.MODE.OFFLINE && this.horde) {
        const h = this.horde.raycast(o, d, 90);
        this._enemyFound = !!h;
      } else if (this.mode === CS.MODE.ONLINE) {
        const h = this.rayRemotePlayer(o, d, 90);
        this._enemyFound = !!h;
      } else this._enemyFound = false;
    }

    // audio listener
    const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
    Audio3D_SFX.setListener(p.pos.x, p.pos.y + eyeH, p.pos.z, fx, fz);

    // hitmark timing / centre message timeout
    if (this._hitmarkT && U.now() - this._hitmarkT > 250) { this._hitmarkT = null; }
    if (UI._centerT > 0) {
      UI._centerT -= dt;
      if (UI._centerT <= 0) UI.el.centerMsg.classList.remove('on');
    }
  },

  renderMenu() {
    if (this.headless) return;
    // idle menu backdrop: slow orbit around the arena
    const t = U.now() * .00006;
    this.camera.position.set(Math.cos(t) * 62, 26, Math.sin(t) * 62);
    this.camera.lookAt(0, 3, 0);
    this.camera.rotation.z = 0;
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
  },

  renderFrame(dt) {
    if (this.headless) return;
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    // first-person weapon on top, in its own scene → never clips through walls
    if (this.running && this.mode !== CS.MODE.MENU && this.player && this.player.alive && this.vmScene.children.length) {
      this.renderer.clearDepth();
      this.renderer.render(this.vmScene, this.vmCamera);
    }
  },

  updateHUD(dt) {
    const p = this.player;
    if (!p) return;
    this._uiT -= dt;
    let timer = this.roundT, objective = '';
    if (this.mode === CS.MODE.OFFLINE && this.offline) {
      const o = this.offline;
      if (this.roundState === 'live' && !o.betweenWaves) objective = 'ВОЛНА ' + o.wave + ' · осталось ' + (o.toSpawn + this.horde.aliveCount);
      else if (o.betweenWaves) { objective = 'ПЕРЕДЫШКА · волна ' + (o.wave + 1); timer = o.breakT; }
      else objective = 'ЗАКУПКА · волна ' + (o.wave + 1);
    } else if (this.mode === CS.MODE.ONLINE) {
      objective = this.roundState === 'buy' ? 'ЗАКУПКА' : this.roundState === 'live' ? 'РАУНД ' + this.roundNo : 'КОНЕЦ РАУНДА';
    }
    if (this._uiT <= 0) {
      this._uiT = .1;
      UI.updateHUD(p, this.mode, {
        timer: timer,
        objective: objective,
        ping: Net.connected ? Net.ping : undefined,
        role: Net.role === CS.NETROLE.HOST ? 'ХОСТ' : 'КЛИЕНТ'
      });
      if (this.mode === CS.MODE.OFFLINE || this.mode === CS.MODE.ONLINE) UI.drawMinimap(this);
    }
    if (this._restartPending && (Input.keys['Enter'] || Input.keys['NumpadEnter'])) {
      this._restartPending = false; this._offeredRestart = false; this.offlineDead = false; this.offlineDeadT = 0;
      this.startOffline();
    }
  }
};

/* ---------------- exports (also used by the automated test harness) ---------------- */
window.CS = CS; window.CFG = CFG; window.WEAPONS = WEAPONS; window.GEAR = GEAR;
window.ZOMBIES = ZOMBIES; window.U = U; window.Store = Store; window.Bus = Bus;
window.AABB = AABB; window.rayBox = rayBox; window.navPath = navPath;
window.FlowField = FlowField; window.Horde = Horde; window.Zombie = Zombie;
window.Player = Player; window.Effects = Effects; window.RemotePlayer = RemotePlayer;
window.CollisionWorld = CollisionWorld; window.Audio3D_SFX = Audio3D_SFX;
window.MAP = MAP; window.MAT = MAT; window.TEXTURES = TEXTURES; window.Input = Input;
window.UI = UI; window.Net = Net; window.buildMap = buildMap; window.buildTextures = buildTextures;
window.Game = Game;
window.buildWeaponModel = buildWeaponModel;
window.PAL = PAL;
window.buildBananaProjectile = buildBananaProjectile;

/* ---------------- PWA: install prompt + service worker ---------------- */
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  // file:// cannot host a service worker; only register over http(s)
  if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.warn('service worker registration failed:', err && err.message);
    });
  });
}

/* Let the player install the game to their home screen from inside the menu. */
let _installPrompt = null;
function initInstall() {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    _installPrompt = e;
    const btn = document.getElementById('btnInstall');
    if (btn) btn.classList.remove('hidden');
  });
  window.addEventListener('appinstalled', () => {
    _installPrompt = null;
    UI.toast('Игра установлена! Найдите значок на главном экране', '#57d16a');
  });
  const btn = document.getElementById('btnInstall');
  if (btn) {
    btn.addEventListener('click', async () => {
      if (!_installPrompt) { UI.toast('Откройте меню браузера → «Установить приложение»'); return; }
      _installPrompt.prompt();
      try { await _installPrompt.userChoice; } catch (e) { }
      _installPrompt = null;
      btn.classList.add('hidden');
    });
  }
}

/* ---------------- boot ---------------- */
window.addEventListener('DOMContentLoaded', () => {
  try {
    Game.init();
    initSettings();
    initTouch();
    initInstall();
    registerServiceWorker();
    if (IS_TOUCH) {
      // keep the address bar from eating the screen on mobile browsers
      const meta = document.querySelector('meta[name=viewport]');
      if (meta) meta.setAttribute('content', 'width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover');
      const hide = () => { setTimeout(() => window.scrollTo(0, 1), 80); };
      window.addEventListener('resize', hide);
      hide();
    }
  } catch (e) {
    console.error(e);
    const t = document.getElementById('loadTxt');
    if (t) t.textContent = 'Ошибка запуска: ' + e.message;
  }
});
