/* ============================================================
   07b — ФИНАЛЬНЫЙ БОСС «МОЗГ-ПОЖИРАТЕЛЬ»
   Гигантский мозг с огромным глазом. Это НЕ «мешок здоровья»: чтобы победить,
   игрок проходит несколько фаз:

     ФАЗА 1 «ПАНЦИРЬ»: мозг закрыт бронёй и неуязвим. Вокруг стоят 4 КОЛБЫ с
       мутагеном. Их надо разбить (колбы разрушаемы, у каждой своё HP). Мозг
       при этом атакует: молнии по прямой, разброс плазмы, призыв миньонов,
       ударные волны.
     ФАЗА 2 «ОТКРЫТЫЙ ГЛАЗ»: когда все колбы разбиты, панцирь раскрывается,
       ГЛАЗ открывается и становится уязвимым — только попадания в глаз
       наносят урон. Через несколько секунд глаз закрывается и снова требует
       разбить новые колбы (по одной за раз) — так бой идёт по кругу.
     ФАЗА 3 «АГОНИЯ»: при низком HP мозг бешено атакует, но глаз остаётся
       открытым дольше.

   Всё управление — в BrainBoss (этот файл), точки интеграции — в 12-game.js.
   ============================================================ */
const BrainBoss = {
  active: null,       // { z, phase, flasks:[], eyeOpenT, cycle, ... }

  /* ---------- геометрия/модель ---------- */
  buildModel() {
    const g = new THREE.Group();
    const parts = {};
    const BRAIN = 0xd98fb5, BRAIN2 = 0xb56a92, DARK = 0x3a1526, VEIN = 0xff5d8f;

    /* панцирь-скорлупа: полусфера, которая закрывает мозг (фаза 1) */
    const shellMat = new THREE.MeshLambertMaterial({ color: 0x6b4b5a, transparent: true, opacity: .96 });
    const shell = new THREE.Group();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const pl = new THREE.Mesh(new THREE.BoxGeometry(.70, 3.6, .40), shellMat);
      pl.position.set(Math.cos(a) * 3.0, .2, Math.sin(a) * 3.0);
      pl.rotation.y = -a; pl.rotation.x = .14;
      pl.castShadow = true;
      shell.add(pl);
    }
    shell.position.y = 2.4;
    g.add(shell); parts.shell = shell;

    /* мозг: несколько долей из сфер + извилины-трубы */
    const brain = new THREE.Group();
    const lobeMat = new THREE.MeshLambertMaterial({ color: BRAIN });
    const main = new THREE.Mesh(new THREE.SphereGeometry(2.5, 20, 16), lobeMat);
    main.scale.set(1.15, .92, 1.0);
    main.castShadow = true; brain.add(main);
    const lobe2 = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 12), new THREE.MeshLambertMaterial({ color: BRAIN2 }));
    lobe2.position.set(-1.4, .35, .5); lobe2.scale.set(1, .9, 1.05); brain.add(lobe2);
    const lobe3 = lobe2.clone(); lobe3.position.set(1.4, .35, -.4); brain.add(lobe3);
    /* извилины */
    for (let i = 0; i < 14; i++) {
      const tor = new THREE.Mesh(new THREE.TorusGeometry(U.rand(.3, .7), U.rand(.05, .09), 6, 12, Math.PI * U.rand(1.1, 1.9)), new THREE.MeshLambertMaterial({ color: BRAIN2 }));
      const a = U.rand(0, Math.PI * 2), r = U.rand(.6, 2.1);
      tor.position.set(Math.cos(a) * r, U.rand(-1.4, 1.6), Math.sin(a) * r);
      tor.rotation.set(U.rand(0, 3), U.rand(0, 3), U.rand(0, 3));
      brain.add(tor);
    }
    brain.position.y = 2.6;
    g.add(brain); parts.brain = brain;

    /* ганглиозные пучки-щупальца снизу (анимируются) */
    const tentacles = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const t = new THREE.Group();
      for (let s = 0; s < 4; s++) {
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(.16 - s * .03, .13 - s * .03, .7, 7), lobeMat);
        seg.position.y = -s * .62; seg.castShadow = true;
        t.add(seg);
      }
      t.position.set(Math.cos(a) * 1.1, 1.0, Math.sin(a) * 1.1);
      g.add(t); tentacles.push(t);
    }
    parts.tentacles = tentacles;

    /* ГЛАЗ: сфера + зрачок + веко (веко закрывает глаз в фазе 1) */
    const eye = new THREE.Group();
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(.85, 18, 14), new THREE.MeshLambertMaterial({ color: 0xf5f0ea }));
    eye.add(sclera);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(.5, 16, 12), new THREE.MeshBasicMaterial({ color: 0xff5d8f }));
    iris.position.z = .45; eye.add(iris);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(.24, 12, 10), new THREE.MeshBasicMaterial({ color: 0x120407 }));
    pupil.position.z = .82; eye.add(pupil);
    const glow = new THREE.PointLight(0xff5d8f, 0, 7, 2); glow.position.z = 1.2; eye.add(glow);
    eye.position.set(0, 2.5, 1.85);
    g.add(eye); parts.eye = eye; parts.iris = iris; parts.pupil = pupil; parts.eyeGlow = glow;
    /* веки (две створки), закрыты в начале — смыкаются в центре глаза */
    const lidTop = new THREE.Mesh(new THREE.BoxGeometry(2.1, .95, .35), new THREE.MeshLambertMaterial({ color: 0x7a4a5e }));
    lidTop.position.set(0, .47, .25); eye.add(lidTop);
    const lidBot = lidTop.clone(); lidBot.position.set(0, -.47, .25); eye.add(lidBot);
    parts.lidTop = lidTop; parts.lidBot = lidBot;

    /* аура/свет */
    const lamp = new THREE.PointLight(VEIN, 8, 16, 2);
    lamp.position.set(0, 3, 0); g.add(lamp); parts.lamp = lamp;

    g.userData.parts = parts;
    return g;
  },

  /* ---------- запуск боя ---------- */
  begin(z) {
    if (!z || !z.def || !z.def.brain) return;
    const parts = z.group.userData.parts || {};
    /* 4 колбы вокруг босса */
    const flasks = [];
    const R = 9;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const fx = z.pos.x + Math.cos(a) * R;
      const fz = z.pos.z + Math.sin(a) * R;
      const fy = (Game.world.groundAt(fx, fz, 6) || 0);
      const mesh = this.buildFlask();
      mesh.position.set(fx, fy, fz);
      Game.scene.add(mesh);
      flasks.push({ mesh: mesh, x: fx, y: fy, z: fz, hp: 1400, maxHp: 1400, alive: true, r: .8, h: 2.2, col: 0x5dd6ff, glowT: 0 });
    }
    this.active = {
      z: z, phase: 1, flasks: flasks, eyeOpenT: 0, cycle: 0,
      atkT: 2.0, subAtkT: 0, minionT: 3.0, hurtFlash: 0, deathT: 0,
      eyeMaxOpen: 7.0, shellOpen: 0
    };
    z._brainFrozen = true;              // босс не ходит, держится в центре
    z.speed = 0;
    /* закрываем панцирь и веко */
    if (parts.shell) parts.shell.visible = true;
    if (parts.lidTop) parts.lidTop.visible = true;
    if (parts.lidBot) parts.lidBot.visible = true;
    if (parts.eyeGlow) parts.eyeGlow.intensity = 0;
    UI.center('МОЗГ-ПОЖИРАТЕЛЬ', 'Разбейте 4 КОЛБЫ, чтобы открыть глаз!', 4.0);
    this.tell('РАЗБЕЙТЕ КОЛБЫ');
    Audio3D_SFX.growl && Audio3D_SFX.growl(z.pos.x, z.pos.y + 3, z.pos.z, 'brute');
  },

  buildFlask() {
    const g = new THREE.Group();
    const glass = new THREE.MeshLambertMaterial({ color: 0x9fe8ff, transparent: true, opacity: .55 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.42, .5, 1.4, 12), glass);
    body.position.y = .7; body.castShadow = true; g.add(body);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(.16, .3, .5, 10), glass);
    neck.position.y = 1.6; g.add(neck);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, .18, 10), new THREE.MeshLambertMaterial({ color: 0x557788 }));
    cap.position.y = 1.9; g.add(cap);
    /* светящаяся мутагенная жидкость */
    const fluid = new THREE.Mesh(new THREE.CylinderGeometry(.36, .44, 1.0, 12), new THREE.MeshBasicMaterial({ color: 0x37e0a0 }));
    fluid.position.y = .55; g.add(fluid); g.userData.fluid = fluid;
    const lamp = new THREE.PointLight(0x37e0a0, 3, 6, 2); lamp.position.y = .8; g.add(lamp); g.userData.lamp = lamp;
    g.userData.glassMat = glass;
    return g;
  },

  /* ---------- урон по колбе (из стрельбы/ближнего боя) ---------- */
  damageFlask(i, dmg) {
    const b = this.active; if (!b || !b.flasks[i] || !b.flasks[i].alive) return false;
    const f = b.flasks[i];
    f.hp -= dmg;
    f.glowT = .12;
    if (Game.effects) {
      Game.effects.impact({ x: f.x, y: f.y + 1.0, z: f.z }, { x: 0, y: 1, z: 0 }, 'metal');
    }
    if (f.hp <= 0) {
      f.alive = false;
      if (f.mesh.parent) f.mesh.parent.remove(f.mesh);
      if (Game.effects) {
        Game.effects.explosion(f.x, f.y + .9, f.z, 4.5, [0x37e0a0, 0x062018]);
        Game.effects.flowerNova(f.x, f.y + .8, f.z, 4.0);
      }
      Audio3D_SFX.explosionAt(f.x, f.y + .8, f.z);
      Game.breakMapAt(f.x, f.y + .6, f.z, 3.4, 300);
      this.tell('КОЛБА РАЗБИТА');
      return true;
    }
    return false;
  },

  aliveFlasks() {
    const b = this.active; if (!b) return 0;
    let n = 0; for (const f of b.flasks) if (f.alive) n++; return n;
  },

  tell(text) {
    if (typeof UI !== 'undefined' && UI.center) UI.center('МОЗГ-ПОЖИРАТЕЛЬ', '· ' + text + ' ·', 1.4);
  },

  /* ---------- урон по боссу: только в глаз, когда он открыт ---------- */
  onBossDamage(z, dmg, part, fromDir) {
    const b = this.active;
    if (!b || (b.phase !== 2 && b.phase !== 3)) {
      /* панцирь/фаза колб: урон не проходит — подсказка */
      if (Game.effects) Game.effects.spark({ x: z.pos.x, y: z.pos.y + 2.6, z: z.pos.z }, { x: 0, y: 1, z: 0 });
      return 0;                                       // 0 урона
    }
    return dmg;                                       // глаз открыт — урон идёт
  },

  /* ---------- основной апдейт ---------- */
  update(dt) {
    const b = this.active;
    if (!b) return;
    const z = b.z;
    if (!z || !z.alive || z.dying) { this.cleanup(); return; }
    const p = Game.player;
    const parts = z.group.userData.parts || {};
    const _bt = U.now() / 1000;              // время для анимации

    /* поворот босса к игроку */
    if (p) {
      const want = Math.atan2(p.pos.x - z.pos.x, p.pos.z - z.pos.z);
      z.yaw = U.angleLerp(z.yaw, want, 1 - Math.pow(.05, dt));
    }
    /* анимация щупалец и глаза */
    if (parts.tentacles) {
      for (let i = 0; i < parts.tentacles.length; i++) {
        const t = parts.tentacles[i];
        t.rotation.x = Math.sin(_bt * .8 + i) * .18;
        t.rotation.z = Math.cos(_bt * .7 + i) * .18;
      }
    }
    if (parts.eye) parts.eye.rotation.z = Math.sin(_bt * .9) * .06;

    /* вспышки колб угасают */
    for (const f of b.flasks) {
      if (!f.alive) continue;
      if (f.glowT > 0) { f.glowT -= dt; if (f.mesh.userData.lamp) f.mesh.userData.lamp.intensity = 3 + (f.glowT > 0 ? 8 : 0); }
      if (f.mesh.userData.fluid) f.mesh.userData.fluid.scale.y = 1 + Math.sin(_bt * 2 + f.x) * .03;
    }

    const alive = this.aliveFlasks();
    if (b.phase === 1 && alive === 0) this.openEye();

    if (b.phase === 2) {
      b.eyeOpenT -= dt;
      if (b.eyeOpenT <= 0) this.closeEye();
    }

    /* ---- АТАКИ (в любой фазе, чаще в агонии) ---- */
    const hpK = U.clamp(z.health / z.maxHealth, 0, 1);
    const rage = b.phase === 3 ? 1.6 : (b.phase === 2 ? 1.15 : 1.0);
    b.atkT -= dt * rage;
    if (b.atkT <= 0) {
      b.atkT = U.rand(2.4, 4.2) / rage;
      this.attack(z, p, b);
    }
    /* под-атаки: одиночные молнии/плазма чаще */
    b.subAtkT -= dt * rage;
    if (b.subAtkT <= 0) {
      b.subAtkT = U.rand(.9, 1.8);
      this.miniAttack(z, p, b);
    }
    /* призыв миньонов в 1 фазе */
    if (b.phase === 1) {
      b.minionT -= dt;
      if (b.minionT <= 0) {
        b.minionT = U.rand(9, 14);
        this.summon(z);
      }
    }

    /* смерть */
    if (z.health <= 0 || z.dying) this.cleanup();
  },

  attack(z, p, b) {
    const kinds = b.phase === 3 ? ['beam', 'barrage', 'shockwave', 'beam', 'implosion']
      : b.phase === 2 ? ['beam', 'barrage', 'shockwave', 'frost']
      : ['beam', 'barrage', 'shockwave', 'summon'];
    const kind = kinds[(Math.random() * kinds.length) | 0];
    if (!p) return;
    const from = { x: z.pos.x, y: z.pos.y + 2.6, z: z.pos.z };
    if (kind === 'beam') {
      /* зелёный луч по прямой в игрока: телеграф + удар */
      this.tell('ЛУЧ!');
      const to = { x: from.x + 0, y: from.y, z: from.z };
      const dir = { x: p.pos.x - from.x, y: 0, z: p.pos.z - from.z };
      const L = Math.hypot(dir.x, dir.z) || 1; dir.x /= L; dir.z /= L;
      if (Game.effects) Game.effects.laser(from, { x: from.x + dir.x * 60, y: from.y, z: from.z + dir.z * 60 });
      Audio3D_SFX.laser && Audio3D_SFX.laser(from.x, from.y, from.z);
      /* урон по линии */
      const rx = p.pos.x - from.x, rz = p.pos.z - from.z;
      const along = rx * dir.x + rz * dir.z;
      const side = Math.abs(-rx * dir.z + rz * dir.x);
      if (along > 0 && side < 1.6) Game.playerHurt(z.def.dmg * .7, z);
      Game.breakMapAt(from.x + dir.x * 10, from.y, from.z + dir.z * 10, 3, 260);
    } else if (kind === 'barrage') {
      this.tell('ЗАЛП');
      const ring = [];
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        this.spawnBolt(from, { x: Math.cos(a), y: 0, z: Math.sin(a) }, 26, z.def.dmg * .4, 0xff5d8f);
      }
    } else if (kind === 'shockwave') {
      this.tell('УДАРНАЯ ВОЛНА');
      if (Game.effects) { Game.effects.groundWave(z.pos.x, z.pos.y + .05, z.pos.z, 14); Game.effects.explosion(z.pos.x, z.pos.y + 1, z.pos.z, 12, [0xff5d8f, 0x1a0510]); }
      Audio3D_SFX.explosionAt(z.pos.x, z.pos.y + 1, z.pos.z);
      Game.breakMapAt(z.pos.x, z.pos.y + .5, z.pos.z, 9, 400);
      if (p && Math.hypot(p.pos.x - z.pos.x, p.pos.z - z.pos.z) < 13) Game.playerHurt(z.def.dmg, z);
    } else if (kind === 'frost') {
      this.tell('СТУЖА');
      if (Game.effects) Game.effects.frostBurst(z.pos.x, z.pos.y + 1.5, z.pos.z, 10);
      if (p && Math.hypot(p.pos.x - z.pos.x, p.pos.z - z.pos.z) < 12) { p.freezeT = Math.max(p.freezeT || 0, 2.2); Game.playerHurt(z.def.dmg * .4, z); }
    } else if (kind === 'implosion') {
      this.tell('ПРИТЯЖЕНИЕ');
      if (Game.effects) Game.effects.implodeFx(z.pos.x, z.pos.y + 1.5, z.pos.z, 12);
      if (p) {
        const dx = z.pos.x - p.pos.x, dz = z.pos.z - p.pos.z, d = Math.hypot(dx, dz) || 1;
        p.vel.x += (dx / d) * 30; p.vel.z += (dz / d) * 30;
      }
    } else if (kind === 'summon') {
      this.summon(z);
    }
  },

  miniAttack(z, p, b) {
    if (!p) return;
    const from = { x: z.pos.x, y: z.pos.y + 2.6, z: z.pos.z };
    const dx = p.pos.x - from.x, dz = p.pos.z - from.z, dy = (p.pos.y + 1) - from.y;
    const d = Math.hypot(dx, dy, dz) || 1;
    this.spawnBolt(from, { x: dx / d, y: dy / d, z: dz / d }, 34, z.def.dmg * .28, b.phase === 2 ? 0x66e06a : 0xff5d8f);
  },

  summon(z) {
    if (!Game.horde) return;
    this.tell('ПРИЗЫВ');
    const n = 3;
    for (let i = 0; i < n; i++) {
      const a = U.rand(0, Math.PI * 2), r = U.rand(5, 9);
      const sx = U.clamp(z.pos.x + Math.cos(a) * r, -MAP.size / 2 + 3, MAP.size / 2 - 3);
      const sz = U.clamp(z.pos.z + Math.sin(a) * r, -MAP.size / 2 + 3, MAP.size / 2 - 3);
      const t = Math.random() < .5 ? 'walker' : 'runner';
      const m = Game.horde.spawn(t, sx, sz);
      m.maxHealth = m.health = Math.max(60, z.maxHealth * .02);
      if (Game.effects) Game.effects.explosion(sx, m.pos.y + .8, sz, 2.4, [0xff5d8f, 0x14060c]);
    }
  },

  /* снаряд-«плазма» босса, летит в игрока */
  spawnBolt(from, dir, speed, dmg, color) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(.32, 10, 8), new THREE.MeshBasicMaterial({ color: color }));
    const pt = new THREE.PointLight(color, 4, 7, 2); mesh.add(pt);
    mesh.position.set(from.x, from.y, from.z);
    Game.scene.add(mesh);
    Game.enemyShots.push({
      mesh: mesh, kind: 'brain', life: 4.0, dmg: dmg, headMul: 1,
      pos: { x: from.x, y: from.y, z: from.z },
      vel: { x: dir.x * speed, y: dir.y * speed, z: dir.z * speed },
      grav: 0, color: color
    });
    if (Game.enemyShots.length > 40) { const o = Game.enemyShots.shift(); if (o.mesh.parent) o.mesh.parent.remove(o.mesh); }
  },

  /* ---------- фазы ---------- */
  openEye() {
    const b = this.active; if (!b) return;
    b.phase = 2; b.cycle++;
    b.eyeMaxOpen = b.cycle >= 3 ? 9.0 : 7.0;
    b.eyeOpenT = b.eyeMaxOpen;
    const parts = b.z.group.userData.parts || {};
    if (parts.shell) parts.shell.visible = false;
    if (parts.lidTop) parts.lidTop.visible = false;
    if (parts.lidBot) parts.lidBot.visible = false;
    if (parts.eyeGlow) parts.eyeGlow.intensity = 14;
    if (parts.lamp) parts.lamp.intensity = 18;
    b.z.armor = 0;
    UI.center('ГЛАЗ ОТКРЫТ!', 'Стреляйте в глаз!', 2.4);
    Audio3D_SFX.growl && Audio3D_SFX.growl(b.z.pos.x, b.z.pos.y + 3, b.z.pos.z, 'brute');
    if (Game.effects) Game.effects.explosion(b.z.pos.x, b.z.pos.y + 2.5, b.z.pos.z, 7, [0xff5d8f, 0x1a0510]);
  },

  closeEye() {
    const b = this.active; if (!b) return;
    /* при низком HP — фаза агонии: глаз не закрывается насовсем */
    if (b.z.health / b.z.maxHealth < .3) {
      b.phase = 3; b.eyeOpenT = 1e9;
      b.z.armor = 0;
      UI.center('АГОНИЯ!', 'Добейте его!', 2.4);
      return;
    }
    b.phase = 1;
    const parts = b.z.group.userData.parts || {};
    if (parts.shell) parts.shell.visible = true;
    if (parts.lidTop) parts.lidTop.visible = true;
    if (parts.lidBot) parts.lidBot.visible = true;
    if (parts.eyeGlow) parts.eyeGlow.intensity = 0;
    b.z.armor = .35;
    /* заново поднять колбы (по одной больше, чем в прошлый раз) */
    this.respawnFlasks();
    UI.center('ГЛАЗ ЗАКРЫТ', 'Разбейте новые колбы!', 2.2);
  },

  respawnFlasks() {
    const b = this.active; if (!b) return;
    /* убираем старые меши */
    for (const f of b.flasks) { if (f.mesh.parent) f.mesh.parent.remove(f.mesh); }
    const flasks = [];
    const n = Math.min(5, 2 + b.cycle);       // 3, 4, 5 колб
    const R = 9;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + b.cycle;
      const fx = b.z.pos.x + Math.cos(a) * R;
      const fz = b.z.pos.z + Math.sin(a) * R;
      const fy = (Game.world.groundAt(fx, fz, 6) || 0);
      const mesh = this.buildFlask();
      mesh.position.set(fx, fy, fz);
      Game.scene.add(mesh);
      flasks.push({ mesh: mesh, x: fx, y: fy, z: fz, hp: 1400 + b.cycle * 500, maxHp: 1400 + b.cycle * 500, alive: true, r: .8, h: 2.2, col: 0x5dd6ff, glowT: 0 });
    }
    b.flasks = flasks;
  },

  cleanup() {
    const b = this.active; if (!b) return;
    for (const f of b.flasks) { if (f.mesh && f.mesh.parent) f.mesh.parent.remove(f.mesh); }
    this.active = null;
  },

  /* ближайшая колба к лучу (вызывается из traceShot) */
  raycastFlask(origin, dir, maxDist) {
    const b = this.active; if (!b) return null;
    let best = null;
    for (let i = 0; i < b.flasks.length; i++) {
      const f = b.flasks[i]; if (!f.alive) continue;
      const box = AABB(f.x - f.r, f.y, f.z - f.r, f.x + f.r, f.y + f.h, f.z + f.r);
      const h = rayBox(origin, dir, box, maxDist);
      if (h && (!best || h.t < best.t)) best = { t: h.t, index: i, flask: f, point: { x: origin.x + dir.x * h.t, y: origin.y + dir.y * h.t, z: origin.z + dir.z * h.t } };
    }
    return best;
  }
};
window.BrainBoss = BrainBoss;
