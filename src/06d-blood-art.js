/* ============================================================
   06d — BLOOD ART (в духе Pain / Paw Fruit из Blox Fruits)
   Оружие-фрукт ближнего боя: в руках кроваво-красная «лапа».
   ЛКМ — тяжёлый удар лапой. Пять способностей, как у Pain Fruit:
     Z — HEAVY PAW   : быстрый лапо-снаряд, прошивает всех на пути;
     X — PAW BARRAGE : залп множества лапо-снарядов;
     C — PAIN NUKE   : лапо-«ядерка», подбрасывает врагов и ломает карту;
     V — TORTURE     : красный пульсирующий снаряд — тикающий урон;
     F — SELF REPEL  : рывок к курсору (дальняя мобильность).
   ============================================================ */

const BLOOD_COL = 0xd41f2a;      // основной кроваво-красный
const BLOOD_DARK = 0x5a0a12;    // тёмно-бордовый
const PAW_PINK = 0xff6d8a;      // розовые подушечки

/* ---------- модель лапы в руках (первое лицо) ---------- */
let _clawVainMat = null, _clawGlowMat = null;
function buildBloodArtClaw() {
  const g = new THREE.Group();
  const flesh = new THREE.MeshLambertMaterial({ color: BLOOD_COL, emissive: 0x2a0408 });
  const dark = new THREE.MeshLambertMaterial({ color: BLOOD_DARK, emissive: 0x120003 });
  const pad = new THREE.MeshLambertMaterial({ color: PAW_PINK, emissive: 0x3a0a14 });
  if (!_clawVainMat) _clawVainMat = new THREE.MeshBasicMaterial({ color: 0xff3040, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false });
  if (!_clawGlowMat) _clawGlowMat = new THREE.MeshBasicMaterial({ color: BLOOD_COL, transparent: true, opacity: .22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });

  // запястье / рука с «мышцами»
  const wrist = new THREE.Mesh(new THREE.BoxGeometry(.17, .16, .22), dark);
  wrist.position.set(0, -.02, .11);
  g.add(wrist);
  for (let i = -1; i <= 1; i++) {
    const muscle = new THREE.Mesh(new THREE.CylinderGeometry(.022, .03, .16, 6), flesh);
    muscle.position.set(i * .045, .03, .11);
    muscle.rotation.x = .2;
    g.add(muscle);
  }

  // ладонь
  const palm = new THREE.Mesh(new THREE.BoxGeometry(.21, .11, .19), flesh);
  palm.position.set(0, 0, -.05);
  g.add(palm);
  // светящиеся вены-полосы на ладони
  for (let i = -1; i <= 1; i++) {
    const vain = new THREE.Mesh(new THREE.BoxGeometry(.012, .055, .14), _clawVainMat);
    vain.position.set(i * .05, .056, -.05);
    g.add(vain);
  }

  // три «пальца»-когтя спереди — сегментированные
  for (let i = -1; i <= 1; i++) {
    const ang = i * .22;
    const base = new THREE.Mesh(new THREE.BoxGeometry(.048, .075, .11), flesh);
    base.position.set(i * .062, .018, -.14);
    base.rotation.x = .1; base.rotation.y = ang;
    g.add(base);
    // второй сегмент (фаланга)
    const seg2 = new THREE.Mesh(new THREE.BoxGeometry(.04, .06, .09), flesh);
    seg2.position.set(i * .075, .005, -.24);
    seg2.rotation.x = .28; seg2.rotation.y = ang;
    g.add(seg2);
    // острый коготь
    const claw = new THREE.Mesh(new THREE.ConeGeometry(.03, .13, 6), pad);
    claw.position.set(i * .085, -.015, -.32);
    claw.rotation.x = Math.PI / 2 + .35; claw.rotation.y = ang;
    g.add(claw);
    // светящаяся вена вдоль пальца
    const v = new THREE.Mesh(new THREE.BoxGeometry(.008, .012, .10), _clawVainMat);
    v.position.set(i * .062, .05, -.14);
    g.add(v);
  }
  // большой палец (2 сегмента)
  const thumb1 = new THREE.Mesh(new THREE.BoxGeometry(.055, .075, .12), flesh);
  thumb1.position.set(.13, .0, -.08); thumb1.rotation.y = -.55;
  g.add(thumb1);
  const thumb2 = new THREE.Mesh(new THREE.BoxGeometry(.045, .06, .1), flesh);
  thumb2.position.set(.17, -.01, -.16); thumb2.rotation.y = -.7; thumb2.rotation.x = .2;
  g.add(thumb2);
  const tclaw = new THREE.Mesh(new THREE.ConeGeometry(.026, .1, 6), pad);
  tclaw.position.set(.20, -.02, -.22); tclaw.rotation.z = -Math.PI / 2 - .4; tclaw.rotation.y = -.7;
  g.add(tclaw);

  // подушечки на ладони (знак лапы Pain Fruit)
  const padMain = new THREE.Mesh(new THREE.SphereGeometry(.05, 12, 9), pad);
  padMain.scale.set(1.1, 1, .42);
  padMain.position.set(0, .054, -.04);
  g.add(padMain);
  for (let i = -1; i <= 1; i++) {
    const toe = new THREE.Mesh(new THREE.SphereGeometry(.024, 8, 6), pad);
    toe.scale.set(1, 1, .42);
    toe.position.set(i * .058, .032, -.14);
    g.add(toe);
  }

  // свечение вокруг лапы
  const glow = new THREE.Mesh(new THREE.SphereGeometry(.24, 12, 10), _clawGlowMat);
  glow.position.set(0, .02, -.12);
  g.add(glow);

  // капли крови, свисающие с когтей (визуал)
  const dripMat = new THREE.MeshLambertMaterial({ color: 0x8a0a12, emissive: 0x300004 });
  for (let i = -1; i <= 1; i++) {
    const drip = new THREE.Mesh(new THREE.SphereGeometry(.016, 6, 6), dripMat);
    drip.scale.set(.8, 1.4, .8);
    drip.position.set(i * .085, -.09, -.33);
    g.add(drip);
  }

  g.userData.bloodClaw = true;
  g.userData.vains = [];
  g.traverse(o => { if (o.isMesh && o.material === _clawVainMat) { o.userData.vain = true; g.userData.vains.push(o); } });
  g.userData.glow = glow;
  return g;
}

/* ---------- знак лапы (плоский отпечаток с подушечками) ---------- */
function _pawTexture() {
  if (_pawTexture._c) return _pawTexture._c;
  const S = 256; const c = makeCanvas(S); const x = c.getContext('2d');
  x.clearRect(0, 0, S, S);
  const cx = S / 2, cy = S * .58;
  /* мягкое свечение позади */
  const grd = x.createRadialGradient(cx, cy, S * .1, cx, cy, S * .5);
  grd.addColorStop(0, 'rgba(255,80,90,.55)');
  grd.addColorStop(.6, 'rgba(200,20,40,.25)');
  grd.addColorStop(1, 'rgba(120,0,20,0)');
  x.fillStyle = grd; x.beginPath(); x.arc(cx, cy, S * .5, 0, 7); x.fill();
  /* объёмная заливка лапы с тенью снизу */
  const fill = x.createLinearGradient(0, S * .25, 0, S * .9);
  fill.addColorStop(0, 'rgba(255,235,235,.98)');
  fill.addColorStop(.55, 'rgba(255,140,150,.96)');
  fill.addColorStop(1, 'rgba(200,20,45,.96)');
  x.fillStyle = fill;
  // центральная подушечка
  x.beginPath(); x.ellipse(cx, cy, S * .205, S * .165, 0, 0, 7); x.fill();
  // четыре пальца
  const toes = [[-.25, -.22, .088], [-.09, -.32, .092], [.09, -.32, .092], [.25, -.22, .088]];
  for (const t of toes) {
    x.beginPath(); x.ellipse(cx + t[0] * S, cy + t[1] * S, S * t[2], S * t[2] * 1.2, 0, 0, 7); x.fill();
  }
  /* тёмный контур-обводка, чтобы читалась на фоне */
  x.lineWidth = S * .022; x.strokeStyle = 'rgba(90,0,15,.85)';
  x.beginPath(); x.ellipse(cx, cy, S * .205, S * .165, 0, 0, 7); x.stroke();
  for (const t of toes) { x.beginPath(); x.ellipse(cx + t[0] * S, cy + t[1] * S, S * t[2], S * t[2] * 1.2, 0, 0, 7); x.stroke(); }
  /* блики на подушечках */
  x.fillStyle = 'rgba(255,255,255,.7)';
  x.beginPath(); x.ellipse(cx - S * .06, cy - S * .06, S * .06, S * .035, -.4, 0, 7); x.fill();
  const tx = new THREE.CanvasTexture(c);
  tx.colorSpace = THREE.SRGBColorSpace;
  _pawTexture._c = tx;
  return tx;
}

/* ---------- снаряд-лапа ---------- */
let _pawBodyGeo = null, _pawMat = null, _pawGlowMat = null;
function buildPawProjectile(kind) {
  const g = new THREE.Group();
  if (!_pawBodyGeo) {
    _pawBodyGeo = new THREE.SphereGeometry(.32, 18, 14);
  }
  const big = kind === 'big';
  const nuke = kind === 'nuke';
  const coreCol = big ? 0xff1030 : nuke ? 0xff2010 : BLOOD_COL;

  /* ядро — светящаяся сфера */
  const core = new THREE.Mesh(new THREE.SphereGeometry(big ? .26 : .18, 14, 12),
    new THREE.MeshBasicMaterial({ color: big ? 0xff6070 : 0xff4050, transparent: true, opacity: .95, blending: THREE.AdditiveBlending, depthWrite: false }));
  core.position.z = .06;
  g.add(core);

  /* основной объём — отпечаток лапы */
  const body = new THREE.Mesh(_pawBodyGeo,
    new THREE.MeshBasicMaterial({ color: coreCol, map: _pawTexture(), transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  body.scale.set(1, 1, .42);
  g.add(body);

  /* задний ободок-лапа (объём) */
  const halo = new THREE.Mesh(_pawBodyGeo,
    new THREE.MeshBasicMaterial({ color: big ? 0xff6070 : PAW_PINK, map: _pawTexture(), transparent: true, opacity: .32, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  halo.scale.set(1.45, 1.45, .5);
  halo.position.z = -.08;
  g.add(halo);

  /* кровавый «хвост»-шлейф позади */
  const trailMat = new THREE.MeshBasicMaterial({ color: 0xff2030, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const trail = new THREE.Mesh(new THREE.ConeGeometry(big ? .3 : .24, big ? 1.1 : .85, 10, 1, true), trailMat);
  trail.rotation.x = -Math.PI / 2;
  trail.position.z = big ? .75 : .58;
  g.add(trail);
  g.userData.trail = trail;

  /* вращающиеся кольца-вихря (боль) */
  const ringMat = new THREE.MeshBasicMaterial({ color: big ? 0xff2030 : 0xff4050, transparent: true, opacity: .75, blending: THREE.AdditiveBlending, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(big ? .58 : .36, big ? .07 : .04, 8, 26), ringMat);
  g.add(ring);
  g.userData.ring = ring;
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(big ? .44 : .26, big ? .045 : .026, 8, 22), ringMat.clone());
  ring2.rotation.x = Math.PI / 2;
  g.add(ring2);
  g.userData.ring2 = ring2;
  const ring3 = new THREE.Mesh(new THREE.TorusGeometry(big ? .72 : .46, big ? .03 : .02, 8, 26), ringMat.clone());
  ring3.rotation.x = Math.PI / 3;
  g.add(ring3);
  g.userData.ring3 = ring3;

  /* искры-«шипы боли» по кругу */
  const sparkMat = new THREE.MeshBasicMaterial({ color: 0xff8090, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false });
  const spikes = new THREE.Group();
  const ns = big ? 18 : 10;
  for (let i = 0; i < ns; i++) {
    const a = i / ns * Math.PI * 2;
    const sp = new THREE.Mesh(new THREE.ConeGeometry(.022, big ? .2 : .12, 4), sparkMat);
    sp.position.set(Math.cos(a) * (big ? .58 : .36), Math.sin(a) * (big ? .58 : .36), 0);
    sp.rotation.z = a - Math.PI / 2;
    spikes.add(sp);
  }
  g.add(spikes);
  g.userData.spikes = spikes;

  if (big) {
    const auraMat = new THREE.MeshBasicMaterial({ color: 0xff3344, transparent: true, opacity: .32, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide });
    const aura = new THREE.Mesh(new THREE.SphereGeometry(1.35, 20, 16), auraMat);
    g.add(aura);
    g.userData.aura = aura;
  }
  if (nuke) {
    /* у «ядерки» — мигающий ореол-детонатор */
    const aMat = new THREE.MeshBasicMaterial({ color: 0xff3010, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide });
    const aura = new THREE.Mesh(new THREE.SphereGeometry(.6, 16, 12), aMat);
    g.add(aura);
    g.userData.aura = aura;
  }
  g.userData.pawBody = body;
  g.userData.core = core;
  return g;
}

/* ---------- игровые способности BLOOD ART ---------- */
const BloodArt = {
  /* проверка, что в руках именно фрукт Blood Art */
  _def() {
    const p = (typeof Game !== 'undefined') ? Game.player : null;
    return (p && p.def && p.def.fruit === 'bloodArt') ? p.def : null;
  },
  isHeld() { return !!this._def(); },
  /* вызвать способность по клавише; true — обработано */
  key(code) {
    const G = (typeof Game !== 'undefined') ? Game : null;
    if (!G || G.mode === CS.MODE.MENU) return false;
    const def = this._def();
    if (!def || G.paused || G.buyOpen) return false;
    if (!(G.roundState === 'live' || G.mode === CS.MODE.RANGE)) return false;
    switch (code) {
      case 'KeyZ': return this.heavyPaw(G, def);
      case 'KeyX': return this.barrage(G, def);
      case 'KeyC': return this.nuke(G, def);
      case 'KeyV': return this.torture(G, def);
      case 'KeyF': return this.repel(G, def);
    }
    return false;
  },

  _cd(G, key, sec) {
    const now = U.now();
    const at = G['_' + key + 'At'];
    if (at && now - at < sec * 1000) {
      const left = Math.ceil((sec * 1000 - (now - at)) / 1000);
      UI.toast('Перезарядка ' + left + 'с', '#f5d33c');
      Audio3D_SFX.deny(); return false;
    }
    G['_' + key + 'At'] = now;
    return true;
  },

  /* Z — HEAVY PAW: быстрый снаряд, прошивает всех на пути. Плюс
     гигантский росчерк-лапа перед игроком. */
  heavyPaw(G, def) {
    if (!this._cd(G, 'paw', def.pawCd || 8)) return false;
    const p = G.player;
    const dir = G.cameraDir();
    G._spawnPaw(def, 'paw');
    if (G.effects) {
      const yaw = Math.atan2(dir.x, dir.z) + Math.PI;
      if (G.effects.pawSlash) G.effects.pawSlash(p.pos.x + dir.x * 3.2, p.pos.y + 1.1, p.pos.z + dir.z * 3.2, yaw, 4.4, 0xff2040);
      if (G.effects.bloodShock) G.effects.bloodShock(p.pos.x + dir.x * 2, p.pos.y, p.pos.z + dir.z * 2, 2.2, .6);
    }
    this._bloodCast(G, .35);
    Audio3D_SFX.tone(180, .18, 'sawtooth', .12, p.pos.x, p.pos.y, p.pos.z, 600);
    UI.center('HEAVY PAW', '', 1.0);
    return true;
  },

  /* X — PAW BARRAGE: залп лапо-снарядов (серией кадров) */
  barrage(G, def) {
    if (!this._cd(G, 'barrage', def.barrageCd || 12)) return false;
    G._barrageLeft = def.barrageCount || 7;
    G._barrageT = 0;
    G._barrageDef = def;
    this._bloodCast(G, .5);
    Audio3D_SFX.tone(140, .3, 'sawtooth', .14, G.player.pos.x, G.player.pos.y, G.player.pos.z, 500);
    UI.center('PAW BARRAGE', '', 1.0);
    return true;
  },

  /* C — PAIN NUKE: лапо-«ядерка» с подбросом врагов + мощная ударная волна */
  nuke(G, def) {
    if (!this._cd(G, 'nuke', def.nukeCd || 18)) return false;
    const p = G.player;
    const dir = G.cameraDir();
    G._spawnPaw(def, 'nuke');
    if (G.effects) {
      const yaw = Math.atan2(dir.x, dir.z) + Math.PI;
      if (G.effects.pawSlash) G.effects.pawSlash(p.pos.x + dir.x * 3.6, p.pos.y + 1.2, p.pos.z + dir.z * 3.6, yaw, 6, 0xff1030, .5);
      if (G.effects.bloodShock) G.effects.bloodShock(p.pos.x + dir.x * 2.5, p.pos.y, p.pos.z + dir.z * 2.5, 3.4, .9);
    }
    this._bloodCast(G, .8);
    Audio3D_SFX.tone(90, .35, 'sawtooth', .16, p.pos.x, p.pos.y, p.pos.z, 300);
    UI.center('PAIN NUKE', '', 1.0);
    return true;
  },

  /* общий визуал «каст»: вспышка крови вокруг игрока + кровавый экран */
  _bloodCast(G, k) {
    const p = G.player;
    if (!p) return;
    if (G.effects) {
      G.effects.bloodNova(p.pos.x, p.pos.y + .4, p.pos.z, 2.6, .5 + k);
      G.effects.bloodScreen(true, k * .5);
      if (G.effects.bloodDrip) for (let i = 0; i < Math.round(k * 5); i++) G.effects.bloodDrip();
      setTimeout(() => { if (G.effects && G.effects.bloodScreen) G.effects.bloodScreen(false); }, 400);
    }
  },

  /* V — КРОВАВЫЙ ШАР: ЗАРЯЖАЕМЫЙ гигантский шар-снаряд.
     Держи V — шар растёт и заряжается; отпусти — гигантский шар-«лапа»
     летит вперёд, прилипает и наносит тикающий урон по площади. */
  torture(G, def) {
    /* нажатие: начинаем заряд (если не на кулдауне) */
    const now = U.now();
    const at = G._bigAt;
    if (at && now - at < (def.bigCd || 20) * 1000) {
      const left = Math.ceil(((def.bigCd || 20) * 1000 - (now - at)) / 1000);
      UI.toast('Кровавый шар через ' + left + 'с', '#f5d33c');
      Audio3D_SFX.deny(); return false;
    }
    const p = G.player;
    if (p._bigCharging) return false;
    p._bigCharging = true;
    p._bigChargeT = 0;
    G._bigDef = def;
    if (Audio3D_SFX.spamtonChargeStart) Audio3D_SFX.spamtonChargeStart();
    UI.toast('ЗАРЯД КРОВАВОГО ШАРА…', '#ff2030');
    return true;
  },

  /* тик заряда (вызывается из игрового цикла) */
  updateTorture(G, dt) {
    const p = G.player;
    if (!p || !p._bigCharging) { if (this._preview && this._preview.parent) this._preview.visible = false; return; }
    const def = G._bigDef || (p.def || {});
    if (!p.alive || !(p.def && p.def.fruit === 'bloodArt')) { this.releaseBig(G); return; }
    const maxT = def.bigChargeTime || 2.0;
    p._bigChargeT = Math.min(maxT, (p._bigChargeT || 0) + dt);
    const k = U.clamp(p._bigChargeT / maxT, 0, 1);
    p._bigChargeK = k;
    if (Audio3D_SFX.spamtonChargeUpdate) Audio3D_SFX.spamtonChargeUpdate(k);
    /* визуал: перед игроком растёт кровавый шар */
    const origin = G.eyePos(), dir = G.cameraDir();
    const cx = origin.x + dir.x * 1.7, cy = origin.y - .1 + dir.y * 1.3, cz = origin.z + dir.z * 1.7;
    const scale = (def.bigMinMul || .55) + k * ((def.bigMaxMul || 2.6) - (def.bigMinMul || .55));
    if (!this._preview && G.scene) {
      this._preview = buildPawProjectile('big');
      G.scene.add(this._preview);
    }
    if (this._preview) {
      this._preview.visible = true;
      this._preview.position.set(cx, cy, cz);
      this._preview.scale.setScalar(scale);
      this._preview.rotation.z += dt * 4;
      this._preview.rotation.x += dt * 1.5;
      const ud = this._preview.userData;
      if (ud.ring) ud.ring.rotation.z += dt * 8;
      if (ud.ring2) ud.ring2.rotation.z -= dt * 5;
      if (ud.spikes) ud.spikes.rotation.z += dt * 3;
      if (ud.core) ud.core.scale.setScalar(1 + Math.sin(U.now() * .02) * .15);
    }
    /* кровавый вихрь-аура под игроком + кровавый экран нарастает */
    if (G.effects) {
      if (G.effects.bloodAura) G.effects.bloodAura(p.pos.x, p.pos.y, p.pos.z, k, true);
      /* кольца боли пульсируют вокруг игрока по мере заряда */
      this._chargeRingT = (this._chargeRingT || 0) - dt;
      if (k > .35 && this._chargeRingT <= 0 && G.effects.bloodShock) {
        this._chargeRingT = .28 - k * .12;
        G.effects.bloodShock(p.pos.x, p.pos.y, p.pos.z, 1.2 + k * 2.2, .35 + k * .3);
      }
      if (G.effects.particle && Math.random() < .5 + k * .5) {
        const a = U.rand(0, 6.28), rr = 1.2 + k * 1.6;
        G.effects.particle(p.pos.x + Math.cos(a) * rr, p.pos.y + .2 + U.rand(0, 1.8), p.pos.z + Math.sin(a) * rr,
          -Math.cos(a) * U.rand(2, 5), U.rand(1, 4), -Math.sin(a) * U.rand(2, 5), U.rand(.08, .2), 'blood', U.rand(.3, .7));
      }
      if (G.effects.bloodScreen) G.effects.bloodScreen(true, k * .5);
    }
  },

  /* отпускание: выпускаем гигантский шар */
  releaseBig(G) {
    const p = G.player;
    if (!p || !p._bigCharging) return;
    p._bigCharging = false;
    if (Audio3D_SFX.spamtonChargeStop) Audio3D_SFX.spamtonChargeStop();
    const def = G._bigDef || (p.def || {});
    const k = U.clamp((p._bigChargeT || 0) / (def.bigChargeTime || 2), 0, 1);
    p._bigChargeT = 0;
    if (G.effects && G.effects.bloodAura) G.effects.bloodAura(p.pos.x, p.pos.y, p.pos.z, k, false);
    if (k < .15) { UI.toast('Слабый заряд — шар рассеялся', '#f5d33c'); if (G.effects && G.effects.bloodScreen) G.effects.bloodScreen(false); return; }
    G._bigAt = U.now();
    G._spawnPaw(def, 'big', k);
    if (G.effects) {
      const dir = G.cameraDir();
      const yaw = Math.atan2(dir.x, dir.z) + Math.PI;
      if (G.effects.pawSlash) G.effects.pawSlash(p.pos.x + dir.x * 4, p.pos.y + 1.3, p.pos.z + dir.z * 4, yaw, 9, 0xff1030, .55);
      const bx = p.pos.x + dir.x * 2.4, bz = p.pos.z + dir.z * 2.4;
      G.effects.bloodShock(bx, p.pos.y, bz, 5 + k * 4, 1 + k);
      G.effects.bloodNova(bx, p.pos.y + 1, bz, 6, 1 + k);
      if (G.effects.bloodDrip) for (let q = 0; q < 10; q++) G.effects.bloodDrip();
      Audio3D_SFX.explosionAt && Audio3D_SFX.explosionAt(p.pos.x, p.pos.y, p.pos.z);
    }
    UI.center('КРОВАВЫЙ ШАР ' + Math.round(k * 100) + '%', '', 1.2);
  },

  /* F — SELF REPEL: рывок к курсору с кровавым следом */
  repel(G, def) {
    if (!this._cd(G, 'repel', def.repelCd || 7)) return false;
    const p = G.player;
    const dir = G.cameraDir();
    const s = def.repelSpeed || 60;
    p.vel.x = dir.x * s;
    p.vel.z = dir.z * s;
    p.vel.y = Math.max(p.vel.y, dir.y * s + 4);
    p.onGround = false;
    if (typeof UI !== 'undefined' && UI.dashFx) UI.dashFx(true, false);
    if (G.effects) {
      /* стартовая ударная волна боли + росчерк-лапа */
      const yaw = Math.atan2(dir.x, dir.z) + Math.PI;
      if (G.effects.bloodShock) G.effects.bloodShock(p.pos.x, p.pos.y, p.pos.z, 3, .8);
      if (G.effects.pawSlash) G.effects.pawSlash(p.pos.x + dir.x * 2.5, p.pos.y + 1, p.pos.z + dir.z * 2.5, yaw, 5, 0xff2040, .45);
      if (G.effects.bloodScreen) G.effects.bloodScreen(true, .5);
      setTimeout(() => { if (G.effects && G.effects.bloodScreen) G.effects.bloodScreen(false); }, 350);
      for (let i = 0; i < 22; i++) {
        G.effects.particle(p.pos.x + U.rand(-.4, .4), p.pos.y + U.rand(.2, 1.6), p.pos.z + U.rand(-.4, .4),
          -dir.x * U.rand(3, 9) + U.rand(-2, 2), U.rand(0, 3), -dir.z * U.rand(3, 9) + U.rand(-2, 2),
          U.rand(.08, .22), 'blood', U.rand(.3, .7));
      }
    }
    Audio3D_SFX.tone(260, .2, 'triangle', .12, p.pos.x, p.pos.y, p.pos.z, 900);
    UI.center('SELF REPEL', '', 1.0);
    return true;
  },

  /* тик залпа (вызывается из игрового цикла) */
  update(G, dt) {
    if (G._barrageLeft > 0) {
      G._barrageT -= dt;
      if (G._barrageT <= 0) {
        G._barrageT = (G._barrageDef && G._barrageDef.barrageInterval) || .07;
        G._barrageLeft--;
        G._spawnPaw(G._barrageDef, 'barrage');
      }
    }
    this.updateTorture(G, dt);
  }
};
