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

/* ---------- ЗВУКИ СПАМТОНА (синтез в духе BIG SHOT / глитч-продавец) ---------- */
Audio3D_SFX.spamtonShot = function (x, y, z) {
  if (!this.ctx || this.muted) return;
  const sp = this._spatial(x, y, z, 3, 120);
  if (sp.gain <= .004) return;
  const t = this.ctx.currentTime;
  /* «BIG SHOT!» — резкий восходящий крик-бип + глитч */
  const o = this.ctx.createOscillator(); o.type = 'square';
  o.frequency.setValueAtTime(760, t);
  o.frequency.exponentialRampToValueAtTime(1500, t + .06);
  o.frequency.exponentialRampToValueAtTime(420, t + .18);
  const g = this.ctx.createGain();
  g.gain.setValueAtTime(.14 * sp.gain, t);
  g.gain.exponentialRampToValueAtTime(.001, t + .2);
  o.connect(g); g.connect(this.sfx); o.start(t); o.stop(t + .22);
  /* хриплый «пипис»-плевок */
  const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
  src.playbackRate.value = 1.6;
  const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 3;
  const ng = this.ctx.createGain();
  ng.gain.setValueAtTime(.09 * sp.gain, t);
  ng.gain.exponentialRampToValueAtTime(.001, t + .12);
  src.connect(bp); bp.connect(ng); ng.connect(this.sfx); src.start(t); src.stop(t + .14);
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


/* ---------- ЗВУК ЗАРЯДА [BIG SHOT] (как при атаке игрока в бою со Спамтоном) ----------
   Короткий высокий «тик», который с ростом заряда становится выше, громче и
   чаще — фирменный раскручивающийся писк. */
Audio3D_SFX.spamtonChargeTick = function (k) {
  if (!this.ctx || this.muted) return;
  k = U.clamp(k || 0, 0, 1);
  const t = this.ctx.currentTime;
  const o = this.ctx.createOscillator(); o.type = 'square';
  o.frequency.setValueAtTime(400 + k * 1500, t);
  const g = this.ctx.createGain();
  g.gain.setValueAtTime((.05 + k * .10), t);
  g.gain.exponentialRampToValueAtTime(.001, t + .06);
  o.connect(g); g.connect(this.sfx); o.start(t); o.stop(t + .07);
  /* под-гармоника, чтобы «раскручивалось» */
  const o2 = this.ctx.createOscillator(); o2.type = 'sawtooth';
  o2.frequency.setValueAtTime(200 + k * 700, t);
  const g2 = this.ctx.createGain();
  g2.gain.setValueAtTime(.03 + k * .05, t);
  g2.gain.exponentialRampToValueAtTime(.001, t + .06);
  o2.connect(g2); g2.connect(this.sfx); o2.start(t); o2.stop(t + .07);
};
/* полный заряд: «BIG SHOT!» готов — восходящий аккорд */
Audio3D_SFX.spamtonChargeReady = function () {
  if (!this.ctx || this.muted) return;
  [660, 880, 1320].forEach((f, i) => setTimeout(() => this.tone(f, .18, 'square', .12), i * 60));
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

/* ---------- МОДЕЛЬ РУКИ-ПУШКИ [BIG SHOT] ----------
   Детализированная механическая рука Спамтона NEO: розово-фиолетовая броня,
   жёлтое дуло-«лампочка» с ободком, белые костяные пальцы, панель-экран с
   рекламным «бегущим» огоньком, индикаторы, кабели. Это view-model. */
function buildSpamtonGunModel() {
  const g = new THREE.Group();
  const PINK = 0xc0366e, PINK2 = 0xa02c5c, PINK3 = 0xd94f86, PURPLE = 0x6b2f8f, PURPLE2 = 0x8a44b0;
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

  addGlowSphere(g, .20, YELLOW, .4, 0, 0, -.44);
  g.userData.muzzleZ = -.62;
  g.userData.spamtonGun = true;
  g.scale.setScalar(.62);
  return g;
}
