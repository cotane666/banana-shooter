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
    /* палитра как на референсе: розово-красный мозг, тёмные борозды,
       красно-бордовые щупальца, серовато-бежевый спинной отросток */
    const BRAIN = 0xd98a94, BRAIN2 = 0xc76a78, DARK = 0x9e4a58;
    const TENT = 0xb5424e, TENT2 = 0x8f2f3c;
    const SPINE = 0xcfc6bc, SPINE2 = 0xa89f94;
    const VEIN = 0xff5d8f;

    /* ============ МОЗГ: два полушария + плотные извилины по поверхности ============ */
    const lobeMat = new THREE.MeshLambertMaterial({ color: BRAIN });
    const gyrusMat = new THREE.MeshLambertMaterial({ color: BRAIN2 });
    const grooveMat = new THREE.MeshLambertMaterial({ color: DARK });

    const brain = new THREE.Group();
    /* основная масса */
    const main = new THREE.Mesh(new THREE.SphereGeometry(2.45, 26, 20), lobeMat);
    main.scale.set(1.16, .98, 1.05);
    main.castShadow = true; main.receiveShadow = true;
    brain.add(main);
    /* два полушария поверх (лёгкая асимметрия, как на референсе) */
    [-1, 1].forEach(sgn => {
      const hemi = new THREE.Mesh(new THREE.SphereGeometry(1.55, 20, 16), lobeMat);
      hemi.position.set(sgn * 1.05, .25, sgn * .12);
      hemi.scale.set(1.0, .92, 1.15);
      hemi.castShadow = true;
      brain.add(hemi);
    });
    /* продольная борозда между полушариями */
    const fissure = new THREE.Mesh(new THREE.BoxGeometry(.14, .9, 3.1), grooveMat);
    fissure.position.set(0, 2.35, -.2); brain.add(fissure);
    /* ИЗВИЛИНЫ: торусы, лежащие НА поверхности сферы (нормаль наружу) */
    const up = new THREE.Vector3(0, 0, 1);
    for (let i = 0; i < 46; i++) {
      /* равномерное распределение по сфере (спираль Фибоначчи) */
      const t = (i + .5) / 46;
      const phi = Math.acos(1 - 2 * t);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const nx = Math.sin(phi) * Math.cos(theta);
      const ny = Math.cos(phi);
      const nz = Math.sin(phi) * Math.sin(theta);
      const R = 2.45 * .95;
      const pos = new THREE.Vector3(nx * R * 1.16, ny * R * .98, nz * R * 1.05);
      const big = (i % 3 === 0);
      const tor = new THREE.Mesh(
        new THREE.TorusGeometry(U.rand(.30, .62), U.rand(.075, .12), 7, 16, Math.PI * U.rand(1.3, 2.0)),
        (i % 4 === 0) ? grooveMat : gyrusMat);
      tor.position.copy(pos);
      tor.quaternion.setFromUnitVectors(up, pos.clone().normalize());
      tor.rotateZ(U.rand(0, Math.PI * 2));
      tor.castShadow = true;
      brain.add(tor);
    }
    brain.position.y = 3.1;
    g.add(brain); parts.brain = brain;

    /* ============ ЩУПАЛЬЦА-ЛАПЫ (красные, длинные, изогнутые) ============ */
    const matT = new THREE.MeshLambertMaterial({ color: TENT });
    const matT2 = new THREE.MeshLambertMaterial({ color: TENT2 });
    const tentacles = [];
    const tentacleSpec = [
      { a: 0.35, len: 5.2, curl: .55 }, { a: 1.15, len: 4.6, curl: -.7 },
      { a: 2.0, len: 5.6, curl: .45 }, { a: 2.9, len: 4.2, curl: -.6 },
      { a: 3.7, len: 5.0, curl: .7 }, { a: 4.5, len: 4.4, curl: -.5 },
      { a: 5.3, len: 5.4, curl: .6 }, { a: 6.0, len: 4.8, curl: -.65 }
    ];
    tentacleSpec.forEach((spec, ti) => {
      const root = new THREE.Group();
      const segs = 7;
      let parent = root;
      let r = .30;
      const h = spec.len / segs;
      for (let s = 0; s < segs; s++) {
        const seg = new THREE.Group();
        const m = new THREE.Mesh(new THREE.CylinderGeometry(r * .82, r, h, 8),
          (s % 2 === 0) ? matT : matT2);
        m.position.y = -h / 2;
        m.castShadow = true;
        seg.add(m);
        /* лёгкое суставное искривление по длине */
        seg.position.y = (s === 0) ? 0 : -h;
        seg.rotation.x = (spec.curl / segs) * (0.6 + s * .18);
        seg.rotation.z = (spec.curl * .3 / segs) * ((ti % 2) ? 1 : -1);
        parent.add(seg);
        parent = seg;
        r *= .84;
      }
      /* на конце — острый коготь */
      const claw = new THREE.Mesh(new THREE.ConeGeometry(r * .9, .5, 7), matT2);
      claw.position.y = -h * .5 - .2; claw.rotation.x = Math.PI;
      parent.add(claw);
      /* цепляем щупальце снизу-сбоку мозга, разворачивая наружу */
      const a = spec.a;
      root.position.set(Math.cos(a) * 1.6, 1.9, Math.sin(a) * 1.6);
      root.rotation.y = -a + Math.PI / 2;
      root.rotation.z = (ti % 2 ? .35 : -.35);
      root.userData.baseZ = root.rotation.z;
      root.userData.phase = ti * .8;
      g.add(root); tentacles.push(root);
    });
    parts.tentacles = tentacles;

    /* ============ СПИННОЙ ОТРОСТОК (серый сегментированный, снизу) ============ */
    const spine = new THREE.Group();
    let py = 0;
    for (let s = 0; s < 6; s++) {
      const rr = .42 - s * .045;
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(rr, rr * 1.12, .42, 10), (s % 2 ? new THREE.MeshLambertMaterial({ color: SPINE2 }) : new THREE.MeshLambertMaterial({ color: SPINE })));
      seg.position.set(s * .06, py, -s * .10);
      seg.rotation.x = .22 + s * .06;
      seg.castShadow = true;
      spine.add(seg);
      /* «рёбрышки» на сегментах */
      const rib = new THREE.Mesh(new THREE.TorusGeometry(rr * .95, .05, 6, 12), new THREE.MeshLambertMaterial({ color: SPINE2 }));
      rib.rotation.x = Math.PI / 2 + .22 + s * .06;
      rib.position.copy(seg.position);
      spine.add(rib);
      py -= .40;
    }
    spine.position.set(0, 1.4, .2);
    g.add(spine); parts.spine = spine;

    /* ============ ГЛАЗ (механика фаз): спереди в нижней части мозга ============ */
    const eye = new THREE.Group();
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(.8, 18, 14), new THREE.MeshLambertMaterial({ color: 0xf5f0ea }));
    eye.add(sclera);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(.47, 16, 12), new THREE.MeshBasicMaterial({ color: 0xff5d8f }));
    iris.position.z = .42; eye.add(iris);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(.23, 12, 10), new THREE.MeshBasicMaterial({ color: 0x120407 }));
    pupil.position.z = .78; eye.add(pupil);
    const glow = new THREE.PointLight(0xff5d8f, 0, 7, 2); glow.position.z = 1.2; eye.add(glow);
    eye.position.set(0, 2.2, 2.0);
    g.add(eye); parts.eye = eye; parts.iris = iris; parts.pupil = pupil; parts.eyeGlow = glow;

    /* ПАНЦИРЬ = плотные кожные складки-«веки» вокруг глаза (фаза 1).
       На референсе панциря нет, поэтому это органичные складки мозга. */
    const shellMat = new THREE.MeshLambertMaterial({ color: DARK });
    const shell = new THREE.Group();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const fold = new THREE.Mesh(new THREE.BoxGeometry(.55, 1.7, .55), shellMat);
      fold.position.set(Math.cos(a) * 1.0, Math.sin(a) * 1.0, 0);
      fold.rotation.z = a; fold.rotation.x = .1;
      fold.castShadow = true;
      shell.add(fold);
    }
    shell.position.copy(eye.position);
    shell.position.z += .15;
    g.add(shell); parts.shell = shell;
    /* веки (закрывают глаз в фазе 1) */
    const lidTop = new THREE.Mesh(new THREE.BoxGeometry(1.9, .85, .4), new THREE.MeshLambertMaterial({ color: BRAIN2 }));
    lidTop.position.set(0, .45, .3); eye.add(lidTop);
    const lidBot = lidTop.clone(); lidBot.position.set(0, -.45, .3); eye.add(lidBot);
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
    /* анимация щупалец (качаются, тянутся) и глаза */
    if (parts.tentacles) {
      for (let i = 0; i < parts.tentacles.length; i++) {
        const t = parts.tentacles[i];
        const ph = _bt * .8 + (t.userData.phase || 0);
        t.rotation.x = Math.sin(ph) * .28;
        t.rotation.z = (t.userData.baseZ || 0) + Math.cos(ph * .9) * .22;
      }
    }
    if (parts.brain) { parts.brain.rotation.y = Math.sin(_bt * .35) * .04; parts.brain.position.y = 3.1 + Math.sin(_bt * .9) * .06; }
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

    /* огненный след снарядов босса */
    if (Game.enemyShots && Game.effects) {
      for (const s of Game.enemyShots) {
        if (s.kind !== 'brain') continue;
        s.trailT = (s.trailT || 0) - dt;
        if (s.trailT <= 0) {
          s.trailT = .05;
          Game.effects.particle(s.pos.x, s.pos.y, s.pos.z, U.rand(-1, 1), U.rand(-.5, 1), U.rand(-1, 1),
            U.rand(.08, .16), 'spark', U.rand(.15, .35));
        }
      }
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
    /* наборы атак по фазам: огонь, кровь/плоть, молнии, залпы, волны, притяжение */
    const kinds = b.phase === 3
      ? ['inferno', 'beam', 'barrage', 'goreNova', 'shockwave', 'implosion', 'beamTwin']
      : b.phase === 2
      ? ['inferno', 'beam', 'barrage', 'goreNova', 'shockwave', 'beamTwin']
      : ['inferno', 'beam', 'barrage', 'shockwave', 'summon'];
    const kind = kinds[(Math.random() * kinds.length) | 0];
    if (!p) return;
    const from = { x: z.pos.x, y: z.pos.y + 3.0, z: z.pos.z };
    if (kind === 'beam' || kind === 'beamTwin') {
      this.tell(kind === 'beamTwin' ? 'ДВОЙНОЙ ЛУЧ!' : 'ЛУЧ!');
      const aim = (off) => {
        const a = Math.atan2(p.pos.x - from.x, p.pos.z - from.z) + off;
        return { x: Math.sin(a), z: Math.cos(a) };
      };
      const offs = kind === 'beamTwin' ? [-.22, .22] : [0];
      for (const off of offs) {
        const d = aim(off);
        if (Game.effects) Game.effects.laser(from, { x: from.x + d.x * 60, y: from.y, z: from.z + d.z * 60 });
        Audio3D_SFX.laser && Audio3D_SFX.laser(from.x, from.y, from.z);
        const rx = p.pos.x - from.x, rz = p.pos.z - from.z;
        const along = rx * d.x + rz * d.z;
        const side = Math.abs(-rx * d.z + rz * d.x);
        if (along > 0 && side < 1.8) Game.playerHurt(z.def.dmg * .7, z);
        Game.breakMapAt(from.x + d.x * 10, from.y, from.z + d.z * 10, 3, 260);
      }
    } else if (kind === 'inferno') {
      /* ОГНЕННОЕ КОЛЬЦО: босс выжигает землю вокруг — кольцо пламени + угли */
      this.tell('ИСПЕПЕЛЕНИЕ!');
      const R = 13;
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2;
        const fx = z.pos.x + Math.cos(a) * R, fz = z.pos.z + Math.sin(a) * R;
        const fy = (Game.world.groundAt(fx, fz, z.pos.y + 3) || z.pos.y) + .3;
        if (Game.effects) Game.effects.fireBurst(fx, fy, fz, 3.2);
      }
      Audio3D_SFX.explosionAt(z.pos.x, z.pos.y + 1, z.pos.z);
      Game.breakMapAt(z.pos.x, z.pos.y + .5, z.pos.z, R * .7, 320);
      const pd = Math.hypot(p.pos.x - z.pos.x, p.pos.z - z.pos.z);
      if (pd > R * .55 && pd < R * 1.15) Game.playerHurt(z.def.dmg * 1.1, z);
    } else if (kind === 'goreNova') {
      /* КРОВАВАЯ НОВА: выброс плоти и крови по площади — жёсткий, но ближний */
      this.tell('КРОВАВАЯ ВСПЫШКА!');
      if (Game.effects) { Game.effects.goreBurst(z.pos.x, z.pos.y + 1.6, z.pos.z, 12); Game.effects.groundWave(z.pos.x, z.pos.y + .05, z.pos.z, 11); }
      Audio3D_SFX.explosionAt(z.pos.x, z.pos.y + 1, z.pos.z);
      if (p && Math.hypot(p.pos.x - z.pos.x, p.pos.z - z.pos.z) < 11) Game.playerHurt(z.def.dmg * .9, z);
      /* брызги долетают и бьют по зомби вокруг */
      if (Game.horde) for (const o of Game.horde.list) {
        if (!o.alive || o.dying || o === z) continue;
        if (Math.hypot(o.pos.x - z.pos.x, o.pos.z - z.pos.z) < 11) o.takeDamage(z.def.dmg * .5, 'body', { x: o.pos.x - z.pos.x, y: 0, z: o.pos.z - z.pos.z });
      }
    } else if (kind === 'barrage') {
      this.tell('ЗАЛП');
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        this.spawnBolt(from, { x: Math.cos(a), y: U.rand(-.1, .2), z: Math.sin(a) }, 26, z.def.dmg * .4, 0xff5d8f);
      }
    } else if (kind === 'shockwave') {
      this.tell('УДАРНАЯ ВОЛНА');
      if (Game.effects) { Game.effects.groundWave(z.pos.x, z.pos.y + .05, z.pos.z, 14); Game.effects.explosion(z.pos.x, z.pos.y + 1, z.pos.z, 12, [0xff5d8f, 0x1a0510]); }
      Audio3D_SFX.explosionAt(z.pos.x, z.pos.y + 1, z.pos.z);
      Game.breakMapAt(z.pos.x, z.pos.y + .5, z.pos.z, 9, 400);
      if (p && Math.hypot(p.pos.x - z.pos.x, p.pos.z - z.pos.z) < 13) Game.playerHurt(z.def.dmg, z);
    } else if (kind === 'implosion') {
      this.tell('ПРИТЯЖЕНИЕ');
      if (Game.effects) Game.effects.implodeFx(z.pos.x, z.pos.y + 1.5, z.pos.z, 12);
      if (p) {
        const dx = z.pos.x - p.pos.x, dz = z.pos.z - p.pos.z, d = Math.hypot(dx, dz) || 1;
        p.vel.x += (dx / d) * 32; p.vel.z += (dz / d) * 32;
      }
    } else if (kind === 'summon') {
      this.summon(z);
    }
  },

  miniAttack(z, p, b) {
    if (!p) return;
    const from = { x: z.pos.x, y: z.pos.y + 3.0, z: z.pos.z };
    const dx = p.pos.x - from.x, dz = p.pos.z - from.z, dy = (p.pos.y + 1) - from.y;
    const d = Math.hypot(dx, dy, dz) || 1;
    /* огненный снаряд, в агонии — пара подряд */
    this.spawnBolt(from, { x: dx / d, y: dy / d, z: dz / d }, 34, z.def.dmg * .28, 0xff7a1e);
    if (b.phase === 3) {
      const a = Math.atan2(dx, dz) + U.rand(-.2, .2);
      this.spawnBolt(from, { x: Math.sin(a), y: dy / d, z: Math.cos(a) }, 32, z.def.dmg * .22, 0xff5d8f);
    }
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

  /* снаряд-«плазма» босса, летит в игрока (с огненным свечением и следом) */
  spawnBolt(from, dir, speed, dmg, color) {
    const grp = new THREE.Group();
    const core = new THREE.Mesh(new THREE.SphereGeometry(.30, 10, 8), new THREE.MeshBasicMaterial({ color: color }));
    grp.add(core);
    const halo = new THREE.Mesh(new THREE.SphereGeometry(.52, 10, 8),
      new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: .35, blending: THREE.AdditiveBlending, depthWrite: false }));
    grp.add(halo);
    const pt = new THREE.PointLight(color, 5, 8, 2); grp.add(pt);
    grp.position.set(from.x, from.y, from.z);
    Game.scene.add(grp);
    Game.enemyShots.push({
      mesh: grp, kind: 'brain', life: 4.0, dmg: dmg, headMul: 1, color: color, trailT: 0,
      pos: { x: from.x, y: from.y, z: from.z },
      vel: { x: dir.x * speed, y: dir.y * speed, z: dir.z * speed },
      grav: 0
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
