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

/* ---------- ЗВУКИ СПАМТОНА: ВЫСТРЕЛ и ГИПЕР-ВЫСТРЕЛ (оригинальные файлы) ----------
   Оба звука встроены как base64 (MP3) в 05z-spamton-audio.js и проигрываются
   ровно как есть, с учётом позиции в мире. */
Audio3D_SFX._spamtonBufs = { shot: null, bigshot: null };
Audio3D_SFX._loadSpamtonSfx = function () {
  if (!this.ctx) return;
  const self = this;
  const load = (b64, slot) => {
    if (self._spamtonBufs[slot] || typeof b64 === 'undefined') return;
    try {
      const bin = atob(b64);
      const len = bin.length;
      const u8 = new Uint8Array(len);
      for (let i = 0; i < len; i++) u8[i] = bin.charCodeAt(i);
      self.ctx.decodeAudioData(u8.buffer,
        (decoded) => { self._spamtonBufs[slot] = decoded; },
        () => {});
    } catch (e) {}
  };
  load(typeof SPAMTON_SHOT_MP3_B64 !== 'undefined' ? SPAMTON_SHOT_MP3_B64 : undefined, 'shot');
  load(typeof SPAMTON_BIGSHOT_MP3_B64 !== 'undefined' ? SPAMTON_BIGSHOT_MP3_B64 : undefined, 'bigshot');
};
/* проигрывает встроенный звук (slot: 'shot' | 'bigshot') с позиционированием */
Audio3D_SFX._playSpamton = function (slot, x, y, z, refDist, maxDist, vol) {
  if (!this.ctx || this.muted) return false;
  const buf = this._spamtonBufs[slot];
  if (!buf) { this._loadSpamtonSfx(); return false; }
  const sp = this._spatial(x, y, z, refDist || 3, maxDist || 160);
  if (sp.gain <= .002) return true;
  const t = this.ctx.currentTime;
  const out = this.ctx.createGain(); out.gain.value = sp.gain * (vol === undefined ? 1 : vol);
  const pan = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
  if (pan) { pan.pan.value = sp.pan; out.connect(pan); pan.connect(this.sfx); } else out.connect(this.sfx);
  const src = this.ctx.createBufferSource(); src.buffer = buf;
  src.connect(out); src.start(t);
  return true;
};
Audio3D_SFX.spamtonShot = function (x, y, z) {
  this._playSpamton('shot', x, y, z, 3, 120, 1);
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


/* ---------- ЗВУК ЗАРЯДА [BIG SHOT] — ОРИГИНАЛЬНЫЙ ФАЙЛ (Deltarune charging) ----------
   Пока держишь ПКМ, проигрывается встроенный звук зарядки РОВНО как есть (loop),
   без изменения скорости/тона. На отпускании плавно затихает.
   Ассет встроен как base64 в 05z-spamton-audio.js. */
Audio3D_SFX._loadSpamtonCharge = function () {
  if (this._chargeBuf || !this.ctx || typeof SPAMTON_CHARGE_MP3_B64 === 'undefined') return;
  try {
    const bin = atob(SPAMTON_CHARGE_MP3_B64);
    const len = bin.length;
    const buf = new Uint8Array(len);
    for (let i = 0; i < len; i++) buf[i] = bin.charCodeAt(i);
    const self = this;
    this.ctx.decodeAudioData(buf.buffer,
      (decoded) => { self._chargeBuf = decoded; },
      () => {});
  } catch (e) {}
};
Audio3D_SFX.spamtonChargeStart = function () {
  if (!this.ctx || this.muted || this._charge) return;
  if (this._loadSpamtonCharge) this._loadSpamtonCharge();
  if (!this._chargeBuf) return;                 // ещё не декодирован — пропускаем
  const t = this.ctx.currentTime;
  const out = this.ctx.createGain(); out.gain.value = .0001; out.connect(this.sfx);
  const src = this.ctx.createBufferSource();
  src.buffer = this._chargeBuf; src.loop = true;
  src.connect(out);
  src.start(t);
  this._charge = { out, src, t0: t };
};
Audio3D_SFX.spamtonChargeUpdate = function (k) {
  if (!this.ctx || !this._charge) return;
  /* Звук заряда играет РОВНО как в файле — без изменения скорости/тона и без
     искажений. Громкость постоянная. */
  const c = this._charge, t = this.ctx.currentTime;
  c.out.gain.setTargetAtTime(.7, t, .05);
};
Audio3D_SFX.spamtonChargeStop = function () {
  if (!this.ctx || !this._charge) return;
  const c = this._charge, t = this.ctx.currentTime;
  c.out.gain.setTargetAtTime(.0001, t, .05);
  try { c.src && c.src.stop(t + .3); } catch (e) {}
  this._charge = null;
};
/* полный заряд: «BIG SHOT!» готов — резкий восходящий сигнал */
Audio3D_SFX.spamtonChargeReady = function () {
  if (!this.ctx || this.muted) return;
  this.tone(1040, .12, 'square', .12, undefined, undefined, undefined, 1560);
  setTimeout(() => this.tone(1560, .16, 'square', .10), 90);
};

/* ---------- САУНДТРЕК [BIG SHOT] (Toby Fox — BIG SHOT) ----------
   Играет ПОСТОЯННО, пока в руках пушка [BIG SHOT]. Запускается через
   Game.refreshMusic() при смене оружия; глушится при уходе с пушки. */
Audio3D_SFX._loadSpamtonMusic = function () {
  if (this._bigshotMusicBuf || !this.ctx || typeof SPAMTON_MUSIC_MP3_B64 === 'undefined') return;
  try {
    const bin = atob(SPAMTON_MUSIC_MP3_B64);
    const len = bin.length;
    const u8 = new Uint8Array(len);
    for (let i = 0; i < len; i++) u8[i] = bin.charCodeAt(i);
    const self = this;
    this.ctx.decodeAudioData(u8.buffer,
      (decoded) => { self._bigshotMusicBuf = decoded; },
      () => {});
  } catch (e) {}
};
Audio3D_SFX.spamtonMusicStart = function () {
  if (!this.ctx || this.muted || this.musicOff) return;
  if (this._bigshotMusic) return;                 // уже играет
  this._loadSpamtonMusic();
  if (!this._bigshotMusicBuf) {
    /* трек ещё декодируется — ждём и пробуем снова, пока пушка в руках */
    if (!this._bigshotTimer) {
      const self = this;
      this._bigshotTimer = setInterval(() => {
        const holding = (typeof Game !== 'undefined' && Game.player && Game.player.def && Game.player.def.spamtonCharge && Game.running && Game.mode !== CS.MODE.MENU);
        if (!holding || self.musicOff) { clearInterval(self._bigshotTimer); self._bigshotTimer = null; return; }
        if (self._bigshotMusicBuf) { clearInterval(self._bigshotTimer); self._bigshotTimer = null; self.spamtonMusicStart(); }
      }, 400);
    }
    return;
  }
  this.musicStop();                               // глушим процедурную тему
  const out = this.ctx.createGain(); out.gain.value = .0001;
  out.connect(this.musicBus);
  const src = this.ctx.createBufferSource();
  src.buffer = this._bigshotMusicBuf; src.loop = true;
  src.connect(out); src.start();
  const t0 = this.ctx.currentTime;
  out.gain.linearRampToValueAtTime(.55, t0 + 1.0);
  this._bigshotMusic = { out, src };
};
Audio3D_SFX.spamtonMusicStop = function () {
  if (this._bigshotTimer) { clearInterval(this._bigshotTimer); this._bigshotTimer = null; }
  if (!this._bigshotMusic) return;
  const m = this._bigshotMusic; this._bigshotMusic = null;
  try {
    const t = this.ctx.currentTime;
    m.out.gain.cancelScheduledValues(t);
    m.out.gain.setValueAtTime(m.out.gain.value, t);
    m.out.gain.linearRampToValueAtTime(.0001, t + .5);
    setTimeout(() => { try { m.src.stop(); m.out.disconnect(); } catch (e) {} }, 600);
  } catch (e) {}
};
/* выстрел ГИПЕР-ПИПИСА — оригинальный «BIG SHOT» файл */
Audio3D_SFX.spamtonHyperShot = function (x, y, z) {
  this._playSpamton('bigshot', x, y, z, 4, 220, 1);
};

/* ---------- МОДЕЛЬ РУКИ-ПУШКИ [BIG SHOT] — ПЕРВАЯ версия (механическая) ----------
   Детализированная механическая рука Спамтона NEO: розово-фиолетовая броня,
   жёлтое дуло-«лампочка» с ободком, белые костяные пальцы, панель-экран с
   рекламным «бегущим» огоньком, индикаторы, кабели. Это view-model. */
function buildSpamtonGunModel() {
  const g = new THREE.Group();
  const PINK = 0xc0366e, PINK2 = 0xa02c5c, PURPLE = 0x6b2f8f, PURPLE2 = 0x8a44b0;
  const YELLOW = 0xf2c318, YELLOW2 = 0xcaa010, METAL = 0xe6e6ec, METAL2 = 0xa9a9b4, BLACK = 0x241020;

  /* ---- предплечье: многосегментная броня ---- */
  const fore = new THREE.Mesh(new THREE.BoxGeometry(.17, .16, .5), new THREE.MeshLambertMaterial({ color: PINK }));
  fore.position.set(0, 0, .04); g.add(fore);
  /* сегментные полосы */
  for (let i = 0; i < 4; i++) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(.185, .175, .03), new THREE.MeshLambertMaterial({ color: PINK2 }));
    band.position.set(0, 0, -.14 + i * .12); g.add(band);
  }
  /* фиолетовая пластина сверху с жёлтым треугольником */
  const plate = new THREE.Mesh(new THREE.BoxGeometry(.21, .045, .34), new THREE.MeshLambertMaterial({ color: PURPLE }));
  plate.position.set(0, .095, .0); g.add(plate);
  const tri = new THREE.Mesh(new THREE.ConeGeometry(.05, .06, 3), new THREE.MeshBasicMaterial({ color: YELLOW }));
  tri.rotation.x = -Math.PI / 2; tri.position.set(0, .12, .02); g.add(tri);
  /* боковые кабели */
  [-1, 1].forEach(sx => {
    const cab = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .38, 6), new THREE.MeshLambertMaterial({ color: BLACK }));
    cab.rotation.x = Math.PI / 2; cab.position.set(sx * .095, -.03, .02); g.add(cab);
  });

  /* ---- запястье / крепление дула ---- */
  const wrist = new THREE.Mesh(new THREE.BoxGeometry(.2, .19, .14), new THREE.MeshLambertMaterial({ color: PINK2 }));
  wrist.position.set(0, 0, -.24); g.add(wrist);
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(.105, .115, .1, 14), new THREE.MeshLambertMaterial({ color: PURPLE2 }));
  cuff.rotation.x = Math.PI / 2; cuff.position.set(0, 0, -.31); g.add(cuff);

  /* ---- жёлтое дуло-лампа с ободком (как на арте) ---- */
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.12, 16, 14), new THREE.MeshLambertMaterial({ color: YELLOW, emissive: 0x4a3a04 }));
  bulb.scale.set(1, 1, 1.4); bulb.position.set(0, 0, -.42); g.add(bulb);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(.10, .022, 8, 18), new THREE.MeshLambertMaterial({ color: 0xdfa8c0 }));
  rim.position.set(0, 0, -.50); g.add(rim);
  const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(.065, .08, .08, 16), new THREE.MeshLambertMaterial({ color: YELLOW2 }));
  muzzle.rotation.x = Math.PI / 2; muzzle.position.set(0, 0, -.55); g.add(muzzle);
  /* тёмное отверстие */
  const bore = new THREE.Mesh(new THREE.CircleGeometry(.05, 14), new THREE.MeshBasicMaterial({ color: 0x120608 }));
  bore.rotation.y = Math.PI; bore.position.set(0, 0, -.592); g.add(bore);

  /* ---- белые «костяные» пальцы, обхватившие дуло ---- */
  for (let i = 0; i < 3; i++) {
    const knuckle = new THREE.Mesh(new THREE.SphereGeometry(.026, 8, 6), new THREE.MeshLambertMaterial({ color: METAL }));
    knuckle.position.set(-.075 + i * .075, .10, -.30); g.add(knuckle);
    const f = new THREE.Mesh(new THREE.BoxGeometry(.05, .055, .17), new THREE.MeshLambertMaterial({ color: METAL }));
    f.position.set(-.075 + i * .075, .11, -.40); f.rotation.x = -.55; g.add(f);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(.045, .05, .06), new THREE.MeshLambertMaterial({ color: METAL2 }));
    tip.position.set(-.075 + i * .075, .045, -.48); tip.rotation.x = -.9; g.add(tip);
  }

  /* ---- панель-ЭКРАН с рекламными точками (стиль Спамтона) ---- */
  const screenMat = new THREE.MeshBasicMaterial({ color: 0x0a2a12 });
  const screen = new THREE.Mesh(new THREE.BoxGeometry(.13, .05, .005), screenMat);
  screen.position.set(0, .055, .22); g.add(screen);
  const dots = [];
  for (let i = 0; i < 6; i++) {
    const d = new THREE.Mesh(new THREE.BoxGeometry(.016, .03, .006), new THREE.MeshBasicMaterial({ color: 0x66ff66 }));
    d.position.set(-.05 + i * .02, .055, .223); d.userData.i = i; g.add(d); dots.push(d);
  }
  g.userData.adScreen = screen; g.userData.adDots = dots;

  /* три жёлтых «глаза»-индикатора на дуле */
  for (let i = 0; i < 3; i++) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(.021, 8, 6), new THREE.MeshBasicMaterial({ color: YELLOW }));
    e.position.set((i - 1) * .065, .062, -.30); g.add(e);
  }
  /* мелкие болты/заклёпки */
  for (let i = 0; i < 6; i++) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, .006, 6), new THREE.MeshLambertMaterial({ color: METAL2 }));
    b.rotation.x = Math.PI / 2; b.position.set((i % 3 - 1) * .075, -.055, -.08 + ((i / 3) | 0) * .16); g.add(b);
  }

  addGlowSphere(g, .20, YELLOW, .4);
  g.userData.muzzleZ = -.62;
  g.userData.spamtonGun = true;
  g.scale.setScalar(.62);
  return g;
}
