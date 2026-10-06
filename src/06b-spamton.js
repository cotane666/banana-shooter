/* ============================================================
   06b — ОРУЖИЕ СПАМТОНА NEO: рука-пушка [BIG SHOT]
   Спамтон G. Спамтон — отчаявшийся продавец-марионетка из Deltarune, ставший
   «NEO» с рукой-пушкой, стреляющей ПИПИСАМИ (маленькие белые яйца-«спамтонята»).
   Здесь: три вида пиписов (взрывной / шипованный / прыгучий), их модели,
   поведение, звуки в духе BIG SHOT и модель руки-пушки.
   ============================================================ */

/* ---------- модели ПИПИСОВ ---------- */
/* Пипис — маленький ГОЛУБОЙ овал-яйцо (канон Deltarune). Бывает и РЕДКИЙ
   РОЗОВЫЙ. Виды: взрывной / шипованный / прыгучий — отличаются обвесом. */
function buildPipisProjectile(kind) {
  const g = new THREE.Group();
  /* РЕДКИЙ РОЗОВЫЙ пипис: 12% шанс — светлее и с особым блеском */
  const pink = Math.random() < .12;
  const bodyCol = pink ? 0xff9fd0 : 0x6fc7e8;      // голубой по умолчанию
  const body = new THREE.Mesh(new THREE.SphereGeometry(.17, 16, 12),
    new THREE.MeshLambertMaterial({ color: bodyCol, emissive: pink ? 0x3a1030 : 0x0c2a34 }));
  body.scale.set(1, 1.4, 1);                        // овал-яйцо
  body.castShadow = true;
  g.add(body);
  /* светлый блик-полоска сверху (глянцевый овал) */
  const shine = new THREE.Mesh(new THREE.SphereGeometry(.055, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .55 }));
  shine.position.set(-.05, .12, .10); shine.scale.set(1, 1.5, .6); g.add(shine);
  if (pink) addGlowSphere(g, .30, 0xff7ac0, .5);

  if (kind === 'spiky') {
    /* ШИПОВАННЫЙ: короткие иглы по овалу */
    const spikeMat = new THREE.MeshLambertMaterial({ color: 0x3a6a8a });
    for (let i = 0; i < 20; i++) {
      const t = (i + .5) / 20;
      const phi = Math.acos(1 - 2 * t);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const nx = Math.sin(phi) * Math.cos(theta), ny = Math.cos(phi), nz = Math.sin(phi) * Math.sin(theta);
      const sp = new THREE.Mesh(new THREE.ConeGeometry(.024, .11, 5), spikeMat);
      sp.position.set(nx * .17, ny * .238, nz * .17);
      sp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(nx, ny, nz).normalize());
      g.add(sp);
    }
    addGlowSphere(g, .25, 0x9fe0ff, .3);
    g.userData.pipis = 'spiky';
  } else if (kind === 'bouncy') {
    /* ПРЫГУЧИЙ: маленькая пружинка снизу, голубое свечение */
    const springMat = new THREE.MeshLambertMaterial({ color: 0x4f7fd0 });
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.08, .018, 6, 12), springMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -.25 - i * .045;
      g.add(ring);
    }
    addGlowSphere(g, .26, 0x7dafff, .4);
    g.userData.pipis = 'bouncy';
  } else {
    /* ВЗРЫВНОЙ: красная «кнопка»-детонатор и тревожный свет */
    const cap = new THREE.Mesh(new THREE.SphereGeometry(.045, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3b2f }));
    cap.position.y = .25; g.add(cap);
    const fuse = new THREE.Mesh(new THREE.CylinderGeometry(.011, .011, .09, 5), new THREE.MeshLambertMaterial({ color: 0x4a3a2a }));
    fuse.position.y = .30; g.add(fuse);
    addGlowSphere(g, .26, 0xff7a3a, .4);
    g.userData.pipis = 'explosive';
  }
  g.userData.rare = pink;
  return g;
}

/* ---------- ЗВУКИ СПАМТОНА (синтез: сочный «поп» выстрела + гул заряда) ---------- */
/* Выстрел пиписом: сочный низко-средний «поп/плюх» (как на видео), а не бип */
Audio3D_SFX.spamtonShot = function (x, y, z) {
  if (!this.ctx || this.muted) return;
  const sp = this._spatial(x, y, z, 3, 120);
  if (sp.gain <= .004) return;
  const t = this.ctx.currentTime;
  const out = this.ctx.createGain(); out.gain.value = sp.gain;
  const pan = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
  if (pan) { pan.pan.value = sp.pan; out.connect(pan); pan.connect(this.sfx); } else out.connect(this.sfx);
  /* «поп»: шумовой всплеск через полосовой фильтр */
  const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
  src.playbackRate.value = .95 + Math.random() * .2;
  const bp = this.ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = 780 * (.9 + Math.random() * .25); bp.Q.value = 1.1;
  const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 220;
  const ng = this.ctx.createGain();
  ng.gain.setValueAtTime(.5, t); ng.gain.exponentialRampToValueAtTime(.001, t + .16);
  src.connect(bp); bp.connect(hp); hp.connect(ng); ng.connect(out);
  src.start(t); src.stop(t + .18);
  /* тело: короткий низкий «бум» */
  const o = this.ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(210, t); o.frequency.exponentialRampToValueAtTime(72, t + .13);
  const og = this.ctx.createGain();
  og.gain.setValueAtTime(.42, t); og.gain.exponentialRampToValueAtTime(.001, t + .15);
  o.connect(og); og.connect(out); o.start(t); o.stop(t + .17);
};
/* детонация взрывного пиписа */
Audio3D_SFX.spamtonBoom = function (x, y, z) {
  if (!this.ctx || this.muted) return;
  const sp = this._spatial(x, y, z, 3, 160);
  const t = this.ctx.currentTime;
  const o = this.ctx.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(40, t + .3);
  const g = this.ctx.createGain();
  g.gain.setValueAtTime(.24 * sp.gain, t); g.gain.exponentialRampToValueAtTime(.001, t + .34);
  o.connect(g); g.connect(this.sfx); o.start(t); o.stop(t + .36);
  const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
  const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
  const ng = this.ctx.createGain();
  ng.gain.setValueAtTime(.2 * sp.gain, t); ng.gain.exponentialRampToValueAtTime(.001, t + .3);
  src.connect(lp); lp.connect(ng); ng.connect(this.sfx); src.start(t); src.stop(t + .32);
};
/* отскок (bouncy) — короткий пружинный «боинг» */
Audio3D_SFX.spamtonBounce = function (x, y, z) {
  if (!this.ctx || this.muted) return;
  const sp = this._spatial(x, y, z, 3, 70);
  if (sp.gain <= .01) return;
  this.tone(300, .1, 'triangle', .06 * sp.gain, x, y, z, 700);
};
/* перезарядка/экипировка — «NEO»-войс-бип */
Audio3D_SFX.spamtonReload = function () {
  if (!this.ctx || this.muted) return;
  [0, 70, 140].forEach((d, i) => setTimeout(() => this.tone([520, 780, 1040][i], .07, 'square', .07), d));
};

/* ---------- ГИПЕР-ПИПИС: огромный пипис-овал (с шипами-взрывателями) ---------- */
function buildHyperPipis() {
  const g = new THREE.Group();
  const pink = Math.random() < .2;
  const bodyCol = pink ? 0xff9fd0 : 0x5fbfe0;
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.0, 22, 16),
    new THREE.MeshLambertMaterial({ color: bodyCol, emissive: pink ? 0x3a1030 : 0x0a2630 }));
  body.scale.set(1, 1.45, 1); body.castShadow = true;
  g.add(body);
  /* глянцевый блик */
  const shine = new THREE.Mesh(new THREE.SphereGeometry(.34, 12, 10),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .5 }));
  shine.position.set(-.35, .75, .4); shine.scale.set(1, 1.6, .6); g.add(shine);
  /* шипы-взрыватели по овалу */
  const spikeMat = new THREE.MeshLambertMaterial({ color: 0x2f6a8a });
  for (let i = 0; i < 20; i++) {
    const t = (i + .5) / 20;
    const phi = Math.acos(1 - 2 * t);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const nx = Math.sin(phi) * Math.cos(theta), ny = Math.cos(phi), nz = Math.sin(phi) * Math.sin(theta);
    const sp = new THREE.Mesh(new THREE.ConeGeometry(.11, .5, 6), spikeMat);
    sp.position.set(nx * 1.0, ny * 1.45, nz * 1.0);
    sp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(nx, ny, nz).normalize());
    g.add(sp);
  }
  const lamp = new THREE.PointLight(pink ? 0xff7ac0 : 0x5fbfe0, 14, 16, 2); g.add(lamp);
  addGlowSphere(g, 1.5, pink ? 0xff7ac0 : 0x8fe0ff, .3);
  g.userData.hyper = true;
  return g;
}


/* ---------- ЗВУК ЗАРЯДА [BIG SHOT] — непрерывный нарастающий гул (как на видео) ----------
   Пока держишь ПКМ: тянется плотный жужжаще-дрожащий гул, который становится
   выше, громче и «злее» с ростом заряда. На отпускании плавно затихает. */
Audio3D_SFX.spamtonChargeStart = function () {
  if (!this.ctx || this.muted || this._charge) return;
  const t = this.ctx.currentTime;
  const out = this.ctx.createGain(); out.gain.value = .0001; out.connect(this.sfx);
  /* основной пилообразный тон */
  const o = this.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 280;
  const og = this.ctx.createGain(); og.gain.value = .5;
  o.connect(og); og.connect(out);
  /* чуть расстроенный квадрат — «дрожь» */
  const o2 = this.ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = 424;
  const o2g = this.ctx.createGain(); o2g.gain.value = .22;
  o2.connect(o2g); o2g.connect(out);
  /* шумовой слой через полосовой фильтр + тремоло-LFO (вибрирующий «глитч») */
  const noise = this.ctx.createBufferSource(); noise.buffer = this.noiseBuf; noise.loop = true;
  const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 1.4;
  const ng = this.ctx.createGain(); ng.gain.value = .5;
  const trem = this.ctx.createGain(); trem.gain.value = 1;
  const lfo = this.ctx.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 18;
  const lfoG = this.ctx.createGain(); lfoG.gain.value = .55;
  lfo.connect(lfoG); lfoG.connect(trem.gain);
  noise.connect(bp); bp.connect(ng); ng.connect(trem); trem.connect(out);
  o.start(t); o2.start(t); noise.start(t); lfo.start(t);
  this._charge = { out, o, o2, bp, trem, lfo, noise, t0: t };
};
Audio3D_SFX.spamtonChargeUpdate = function (k) {
  if (!this.ctx || !this._charge) return;
  k = U.clamp(k || 0, 0, 1);
  const c = this._charge, t = this.ctx.currentTime;
  const step = .04;
  /* частота и громкость растут вместе с зарядом */
  c.o.frequency.setTargetAtTime(260 + k * 900, t, step);
  c.o2.frequency.setTargetAtTime(380 + k * 1500, t, step);
  c.bp.frequency.setTargetAtTime(700 + k * 3200, t, step);
  c.lfo.frequency.setTargetAtTime(14 + k * 42, t, step);
  c.out.gain.setTargetAtTime(.05 + k * .14, t, step);
};
Audio3D_SFX.spamtonChargeStop = function () {
  if (!this.ctx || !this._charge) return;
  const c = this._charge, t = this.ctx.currentTime;
  c.out.gain.setTargetAtTime(.0001, t, .04);
  c.o.stop(t + .25); c.o2.stop(t + .25); c.lfo.stop(t + .25);
  try { c.noise && c.noise.stop(t + .25); } catch (e) {}
  this._charge = null;
};
/* полный заряд: «BIG SHOT!» готов — резкий восходящий сигнал */
Audio3D_SFX.spamtonChargeReady = function () {
  if (!this.ctx || this.muted) return;
  this.tone(1040, .12, 'square', .12, undefined, undefined, undefined, 1560);
  setTimeout(() => this.tone(1560, .16, 'square', .10), 90);
};
/* выстрел ГИПЕР-ПИПИСА — мощный «BIG SHOT»-залп */
Audio3D_SFX.spamtonHyperShot = function (x, y, z) {
  if (!this.ctx || this.muted) return;
  const sp = this._spatial(x, y, z, 4, 200);
  const t = this.ctx.currentTime;
  const o = this.ctx.createOscillator(); o.type = 'square';
  o.frequency.setValueAtTime(1400, t); o.frequency.exponentialRampToValueAtTime(160, t + .35);
  const g = this.ctx.createGain();
  g.gain.setValueAtTime(.3 * Math.max(sp.gain, .3), t); g.gain.exponentialRampToValueAtTime(.001, t + .4);
  o.connect(g); g.connect(this.sfx); o.start(t); o.stop(t + .42);
  const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
  const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
  const ng = this.ctx.createGain();
  ng.gain.setValueAtTime(.26 * Math.max(sp.gain, .3), t); ng.gain.exponentialRampToValueAtTime(.001, t + .45);
  src.connect(lp); lp.connect(ng); ng.connect(this.sfx); src.start(t); src.stop(t + .48);
};

/* ---------- МОДЕЛЬ РУКИ-ПУШКИ [BIG SHOT] — ГЛАДКАЯ 3D (без пикселей) ----------
   Как в видео: малиновая рука-ствол, светлая розовая манжета и большое гладкое
   жёлтое кольцо-дуло. Пластиковые глянцевые материалы (Phong). */
function buildSpamtonGunModel() {
  const g = new THREE.Group();
  const YEL = 0xf4c81e, PINKL = 0xf3b6d4, MAG = 0xd23a8a, MAGD = 0xa8236a,
        PUR = 0x7b3fa0, DARK = 0x140a14;
  const shiny = (c, em, shin) => new THREE.MeshPhongMaterial({
    color: c, emissive: em || 0x000000,
    shininess: shin === undefined ? 55 : shin, specular: 0x666666 });
  const dark = new THREE.MeshLambertMaterial({ color: DARK });

  /* ---- ствол-рука: гладкий сужающийся малиновый цилиндр ---- */
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.118, .100, .50, 24), shiny(MAG, 0x2a0818, 45));
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0, -.13); g.add(barrel);
  /* скруглённый торец со стороны руки */
  const cap = new THREE.Mesh(new THREE.SphereGeometry(.118, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), shiny(MAGD, 0x1a0510, 35));
  cap.rotation.x = -Math.PI / 2; cap.position.set(0, 0, .12); g.add(cap);
  /* пурпурная полоса сверху (гладкая) */
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(.021, .021, .47, 10), shiny(PUR, 0x1a0a28, 80));
  stripe.rotation.x = Math.PI / 2; stripe.position.set(0, .110, -.13); g.add(stripe);

  /* ---- светлая розовая манжета между стволом и кольцом ---- */
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(.132, .132, .075, 26), shiny(PINKL, 0x3a2030, 70));
  collar.rotation.x = Math.PI / 2; collar.position.set(0, 0, -.355); g.add(collar);

  /* ---- большое гладкое жёлтое кольцо-дуло (тор) ---- */
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.152, .080, 20, 34), shiny(YEL, 0x4a3606, 95));
  ring.position.set(0, 0, -.455); g.add(ring);
  /* жёлтый «баллон» за кольцом (объём) */
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.158, 24, 16), shiny(YEL, 0x3a2a04, 80));
  bulb.scale.set(1, 1, .72); bulb.position.set(0, 0, -.415); g.add(bulb);

  /* ---- тёмное отверстие ствола внутри кольца ---- */
  const boreCyl = new THREE.Mesh(new THREE.CylinderGeometry(.084, .084, .06, 22), dark);
  boreCyl.rotation.x = Math.PI / 2; boreCyl.position.set(0, 0, -.505); g.add(boreCyl);
  const bore = new THREE.Mesh(new THREE.CircleGeometry(.084, 22), dark);
  bore.rotation.y = Math.PI; bore.position.set(0, 0, -.537); g.add(bore);

  /* лёгкое свечение в дуле */
  const halo = new THREE.Mesh(new THREE.SphereGeometry(.115, 12, 10),
    new THREE.MeshBasicMaterial({ color: YEL, transparent: true, opacity: .26, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.position.set(0, 0, -.465); g.add(halo);

  g.userData.muzzleZ = -.53;
  g.userData.spamtonGun = true;
  return g;
}
