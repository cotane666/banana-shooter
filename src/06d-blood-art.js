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
function buildBloodArtClaw() {
  const g = new THREE.Group();
  const flesh = new THREE.MeshLambertMaterial({ color: BLOOD_COL, emissive: 0x2a0408 });
  const dark = new THREE.MeshLambertMaterial({ color: BLOOD_DARK, emissive: 0x120003 });
  const pad = new THREE.MeshLambertMaterial({ color: PAW_PINK, emissive: 0x3a0a14 });

  // запястье / рука
  const wrist = new THREE.Mesh(new THREE.BoxGeometry(.16, .15, .20), dark);
  wrist.position.set(0, -.02, .10);
  g.add(wrist);

  // ладонь
  const palm = new THREE.Mesh(new THREE.BoxGeometry(.20, .10, .18), flesh);
  palm.position.set(0, 0, -.05);
  g.add(palm);

  // три «пальца»-когтя спереди
  for (let i = -1; i <= 1; i++) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(.045, .07, .16), flesh);
    f.position.set(i * .06, .015, -.19);
    f.rotation.x = .12;
    g.add(f);
    const claw = new THREE.Mesh(new THREE.ConeGeometry(.028, .10, 6), pad);
    claw.position.set(i * .06, .0, -.29);
    claw.rotation.x = Math.PI / 2;
    g.add(claw);
  }
  // большой палец
  const thumb = new THREE.Mesh(new THREE.BoxGeometry(.05, .07, .12), flesh);
  thumb.position.set(.12, .0, -.10);
  thumb.rotation.y = -.5;
  g.add(thumb);

  // подушечка на ладони (знак лапы Pain Fruit)
  const padMain = new THREE.Mesh(new THREE.SphereGeometry(.045, 10, 8), pad);
  padMain.scale.set(1, 1, .4);
  padMain.position.set(0, .055, -.05);
  g.add(padMain);
  for (let i = -1; i <= 1; i++) {
    const toe = new THREE.Mesh(new THREE.SphereGeometry(.02, 8, 6), pad);
    toe.scale.set(1, 1, .4);
    toe.position.set(i * .05, .03, -.16);
    g.add(toe);
  }

  // слабое красное свечение вокруг лапы
  const glow = new THREE.Mesh(new THREE.SphereGeometry(.22, 10, 8),
    new THREE.MeshBasicMaterial({ color: BLOOD_COL, transparent: true, opacity: .18, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.position.set(0, .02, -.10);
  g.add(glow);

  g.userData.bloodClaw = true;
  return g;
}

/* ---------- знак лапы (плоский отпечаток с подушечками) ---------- */
function _pawTexture() {
  if (_pawTexture._c) return _pawTexture._c;
  const S = 128; const c = makeCanvas(S); const x = c.getContext('2d');
  x.clearRect(0, 0, S, S);
  const cx = S / 2, cy = S * .58;
  x.fillStyle = 'rgba(255,255,255,.96)';
  // центральная подушечка
  x.beginPath(); x.ellipse(cx, cy, S * .20, S * .16, 0, 0, 7); x.fill();
  // четыре пальца
  const toes = [[-.24, -.20, .085], [-.09, -.30, .09], [.09, -.30, .09], [.24, -.20, .085]];
  for (const t of toes) {
    x.beginPath(); x.ellipse(cx + t[0] * S, cy + t[1] * S, S * t[2], S * t[2] * 1.15, 0, 0, 7); x.fill();
  }
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
    _pawBodyGeo = new THREE.SphereGeometry(.24, 14, 12);
  }
  const coreCol = kind === 'torture' ? 0xff2030 : BLOOD_COL;
  const body = new THREE.Mesh(_pawBodyGeo,
    new THREE.MeshBasicMaterial({ color: coreCol, map: _pawTexture(), transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  body.scale.set(1, 1, .45);
  g.add(body);
  // ободок-лапа чуть больше и полупрозрачный (объём)
  const halo = new THREE.Mesh(_pawBodyGeo,
    new THREE.MeshBasicMaterial({ color: kind === 'torture' ? 0xff8090 : PAW_PINK, map: _pawTexture(), transparent: true, opacity: .35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  halo.scale.set(1.35, 1.35, .5);
  halo.position.z = .02;
  g.add(halo);
  // тёмное ядро сзади, чтобы читался объём
  const core = new THREE.Mesh(new THREE.SphereGeometry(.12, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0x300006, transparent: true, opacity: .8, depthWrite: false }));
  core.position.z = .10;
  g.add(core);
  if (kind === 'nuke') {
    // у «ядерки» — мигающий красный ореол
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.34, .05, 8, 20),
      new THREE.MeshBasicMaterial({ color: 0xff3344, transparent: true, opacity: .7, blending: THREE.AdditiveBlending, depthWrite: false }));
    g.add(ring);
    g.userData.ring = ring;
  }
  g.userData.pawBody = body;
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

  /* Z — HEAVY PAW: быстрый снаряд, прошивает всех на пути */
  heavyPaw(G, def) {
    if (!this._cd(G, 'paw', def.pawCd || 8)) return false;
    G._spawnPaw(def, 'paw');
    Audio3D_SFX.tone(180, .18, 'sawtooth', .12, G.player.pos.x, G.player.pos.y, G.player.pos.z, 600);
    UI.toast('HEAVY PAW', '#ff4a5a');
    return true;
  },

  /* X — PAW BARRAGE: залп лапо-снарядов (серией кадров) */
  barrage(G, def) {
    if (!this._cd(G, 'barrage', def.barrageCd || 12)) return false;
    G._barrageLeft = def.barrageCount || 7;
    G._barrageT = 0;
    G._barrageDef = def;
    Audio3D_SFX.tone(140, .3, 'sawtooth', .14, G.player.pos.x, G.player.pos.y, G.player.pos.z, 500);
    UI.toast('PAW BARRAGE', '#ff4a5a');
    return true;
  },

  /* C — PAIN NUKE: лапо-«ядерка» с подбросом врагов */
  nuke(G, def) {
    if (!this._cd(G, 'nuke', def.nukeCd || 18)) return false;
    G._spawnPaw(def, 'nuke');
    Audio3D_SFX.tone(90, .35, 'sawtooth', .16, G.player.pos.x, G.player.pos.y, G.player.pos.z, 300);
    UI.toast('PAIN NUKE', '#ff4a5a');
    return true;
  },

  /* V — TORTURE: красный пульсирующий снаряд — тикающий урон */
  torture(G, def) {
    if (!this._cd(G, 'torture', def.tortureCd || 24)) return false;
    G._spawnPaw(def, 'torture');
    UI.toast('TORTURE', '#ff2030');
    return true;
  },

  /* F — SELF REPEL: рывок к курсору */
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
      for (let i = 0; i < 14; i++) {
        G.effects.particle(p.pos.x, p.pos.y + 1, p.pos.z,
          U.rand(-3, 3), U.rand(0, 4), U.rand(-3, 3), U.rand(.1, .28), 'spark', U.rand(.2, .5));
      }
    }
    Audio3D_SFX.tone(260, .2, 'triangle', .12, p.pos.x, p.pos.y, p.pos.z, 900);
    UI.toast('SELF REPEL', '#ff4a5a');
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
  }
};
