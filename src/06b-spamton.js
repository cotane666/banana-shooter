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
  /* палитра как в спрайте: жёлтое кольцо, розовые/пурпурные пиксели, чёрный контур */
  const OUT = 0x160a18, YEL = 0xf2c018, YEL2 = 0xcaa010,
        PINK = 0xec93c4, PINK2 = 0xd44f8f, MAG = 0xa8306f,
        PUR = 0x7b3fa0, PUR2 = 0x552a75;
  const vox = (x, y, z, w, h, d, c, em) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
      new THREE.MeshLambertMaterial({ color: c, emissive: em || 0x000000 }));
    m.position.set(x, y, z); m.castShadow = true; g.add(m); return m;
  };

  /* ================= КОЛЬЦО-ДУЛО (пиксельный «пончик») ================= */
  const Zf = -0.44;
  const ringVox = (radius, size, zz, colFn) => {
    const N = 16;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const x = Math.cos(a) * radius, y = Math.sin(a) * radius;
      const c = colFn(i);
      if (c !== null) vox(x, y, zz, size, size, .05, c, c === YEL ? 0x4a3606 : 0);
    }
  };
  /* чёрная окантовка кольца */
  ringVox(0.205, 0.118, Zf - .003, () => OUT);
  /* внешнее жёлтое кольцо с розово-пурпурными пиксельными вставками */
  ringVox(0.205, 0.088, Zf, (i) => (
    (i === 8 || i === 9) ? PINK :
    (i === 7 || i === 10) ? PUR :
    (i === 0 || i === 15) ? PINK2 :
    (i === 4 || i === 5) ? PUR2 : YEL
  ));
  /* внутреннее кольцо (розово-пурпурный узор) */
  ringVox(0.125, 0.078, Zf + .012, (i) => (
    (i >= 7 && i <= 10) ? PINK2 :
    (i === 2 || i === 13) ? PUR :
    (i === 0 || i === 1 || i === 14 || i === 15) ? PINK : MAG
  ));
  /* тёмное отверстие ствола (заполняет центр кольца) */
  vox(0, 0, Zf + .004, .175, .175, .05, OUT);
  vox(0, 0, Zf - .026, .150, .150, .02, 0x05020a);

  /* ============ СТВОЛ-«БРУСОК»: розовый верх / малиновый низ ============ */
  const BZ = -0.14, BL = 0.50;
  const BW = .126, BH = .118;
  vox(0, .034, BZ, BW, .054, BL, PINK);                  // верх розовый
  vox(0, -.034, BZ, BW, .054, BL, MAG);                  // низ малиновый
  vox(0, 0, BZ, BW + .002, .014, BL, PUR);               // срединная линия
  vox(-.034, .034, BZ - .004, .022, .038, .14, 0xf6b6d8);// глянцевая полоса
  /* чёрный контур по БОКАМ (ниже верха, чтобы сверху был цвет) */
  vox(-BW / 2 - .007, 0, BZ, .015, BH, BL, OUT);
  vox( BW / 2 + .007, 0, BZ, .015, BH, BL, OUT);
  /* ТЫЛЬНАЯ грань — ЦВЕТНАЯ (её видит игрок); передняя (у кольца) — чёрный контур */
  vox(0, 0, BZ + BL / 2 + .006, BW + .030, BH + .030, .016, PINK2);  // задняя цветная
  vox(0, 0, BZ - BL / 2 - .006, BW + .030, BH + .030, .016, OUT);    // передний чёрный торец

  /* ============ КОЛЬЦО-МАНЖЕТА на стыке (жёлтая) ============ */
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(.118, .118, .07, 12),
    new THREE.MeshLambertMaterial({ color: YEL2, emissive: 0x2a1e02 }));
  cuff.rotation.x = Math.PI / 2; cuff.position.set(0, 0, Zf + .11); g.add(cuff);

  /* ============ мелкие жёлтые «рекламные» пиксели ============ */
  [-1, 1].forEach(sx => vox(sx * .155, .155, Zf + .17, .038, .038, .03, YEL, 0x4a3606));

  /* лёгкое свечение внутри кольца (не перекрывает форму) */
  const halo = new THREE.Mesh(new THREE.SphereGeometry(.075, 10, 8),
    new THREE.MeshBasicMaterial({ color: YEL, transparent: true, opacity: .25, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.position.set(0, 0, Zf - .02); g.add(halo);
  g.userData.muzzleZ = Zf - .07;
  g.userData.spamtonGun = true;
  g.scale.setScalar(.62);
  return g;
}
