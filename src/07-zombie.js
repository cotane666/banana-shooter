/* ============================================================
   07 — ZOMBIES: horde AI (flow field + steering), animation, damage
   ============================================================ */

/* ---------------- procedural zombie mesh ---------------- */
/* helper: a box mesh (centre-anchored) for boss builds */
function mkBox(w, h, d, color, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
  m.position.set(x, y, z);
  return m;
}
function addBossBox(g, w, h, d, color, x, y, z) { const m = mkBox(w, h, d, color, x, y, z); g.add(m); return m; }
/* a pale bone material for the reaper's blade */
function boneBladeMat() { return new THREE.MeshLambertMaterial({ color: 0xe8e2d0, emissive: 0x2a2530 }); }

function buildZombieMesh(type) {
  const col = ZOMBIES[type].color;
  const skinMat = new THREE.MeshLambertMaterial({ map: canvasTexture(TEXTURES.zombie, 1, 2), color: col });
  const clothMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(col).multiplyScalar(0.42) });
  const g = new THREE.Group();
  const parts = {};

  const mk = (w, h, d, mat, px, py, pz, pivotY) => {
    // limb groups pivot at the top for natural swing
    const pivot = new THREE.Group();
    pivot.position.set(px, py, pz);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.y = -h / 2;
    m.castShadow = true; m.receiveShadow = true;
    pivot.add(m);
    return pivot;
  };

  // torso
  const torso = new THREE.Group();
  torso.position.y = 1.02;
  const chest = new THREE.Mesh(new THREE.BoxGeometry(.54, .62, .30), skinMat);
  chest.position.y = .16; chest.castShadow = true; chest.receiveShadow = true;
  torso.add(chest);
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(.46, .34, .28), clothMat);
  pelvis.position.y = -.28; pelvis.castShadow = true;
  torso.add(pelvis);
  g.add(torso);
  parts.torso = torso;

  // head
  const head = new THREE.Group();
  head.position.y = 1.52;
  const skull = new THREE.Mesh(new THREE.BoxGeometry(.30, .34, .30), skinMat);
  skull.castShadow = true;
  head.add(skull);
  // jaw
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(.24, .10, .22), clothMat);
  jaw.position.set(0, -.2, .04);
  head.add(jaw);
  // eyes (glowing red)
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2a12 });
  [-.08, .08].forEach(ox => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(.033, 6, 5), eyeMat);
    e.position.set(ox, .04, -.155);
    head.add(e);
  });
  g.add(head);
  parts.head = head;

  // arms (pivot at shoulder)
  const armL = mk(.15, .74, .15, skinMat, -.35, 1.38, 0);
  const armR = mk(.15, .74, .15, skinMat, .35, 1.38, 0);
  g.add(armL); g.add(armR);
  parts.armL = armL; parts.armR = armR;

  // legs (pivot at hip)
  const legL = mk(.19, .84, .19, clothMat, -.14, .86, 0);
  const legR = mk(.19, .84, .19, clothMat, .14, .86, 0);
  g.add(legL); g.add(legR);
  parts.legL = legL; parts.legR = legR;

  // type-specific silhouette tweaks
  if (type === 'tank' || type === 'brute') {
    chest.scale.set(1.5, 1.05, 1.4);
    pelvis.scale.set(1.3, 1, 1.2);
    armL.scale.set(1.5, 1.05, 1.5); armR.scale.set(1.5, 1.05, 1.5);
    legL.scale.set(1.4, 1, 1.4); legR.scale.set(1.4, 1, 1.4);
    skull.scale.set(1.15, .95, 1.15);
  } else if (type === 'crawler') {
    // hunched, dragging
    torso.rotation.x = 1.0;
    head.position.y = 1.12; head.position.z = .34;
    armL.position.set(-.32, .82, .12); armR.position.set(.32, .82, .12);
    legL.position.set(-.14, .42, .1); legR.position.set(.14, .42, .1);
    legL.scale.set(1, .6, 1); legR.scale.set(1, .6, 1);
  } else if (type === 'runner') {
    torso.rotation.x = .30;
    head.position.z = .10;
    armL.rotation.x = -.6; armR.rotation.x = -.6;
  } else if (type === 'spitter') {
    chest.scale.set(.9, 1.15, .9);
    head.scale.set(1.25, 1.25, 1.25);
    // a bloated acid sac on the chest so the "spitter" reads at a glance
    const sac = new THREE.Mesh(new THREE.SphereGeometry(.20, 8, 7),
      new THREE.MeshLambertMaterial({ color: 0x9fd23a, emissive: 0x2a3d0a }));
    sac.position.set(0, .18, -.16);
    torso.add(sac);
  } else if (type === 'flying') {
    /* flying: lean frame with wide membrane wings and a tail */
    torso.rotation.x = .35;
    chest.scale.set(.85, 1.05, .9);
    armL.scale.set(1.25, .9, 1.25); armR.scale.set(1.25, .9, 1.25);
    legL.scale.set(1, .75, 1); legR.scale.set(1, .75, 1);
    const wingMat = new THREE.MeshLambertMaterial({ color: 0x3c5a6b, side: THREE.DoubleSide });
    const makeWing = (sgn) => {
      const wing = new THREE.Mesh(new THREE.PlaneGeometry(1.5, .95), wingMat);
      wing.position.set(sgn * .78, 1.42, .10);
      wing.rotation.z = sgn * -.35;
      wing.rotation.x = -.25;
      wing.castShadow = true;
      g.add(wing);
      return wing;
    };
    parts.wingL = makeWing(-1); parts.wingR = makeWing(1);
    // stinger tail
    const tail = new THREE.Mesh(new THREE.ConeGeometry(.10, .55, 6), new THREE.MeshLambertMaterial({ color: 0x2b3f4a }));
    tail.position.set(0, 1.06, .32); tail.rotation.x = 1.5;
    g.add(tail);
  } else if (type === 'robot') {
    /* robot zombie: armoured, all-metal body with a glowing power core and a
       shoulder-mounted cannon that matches the plasma it fires */
    const metal = new THREE.MeshLambertMaterial({ color: 0x9aa4ae, metalness: .8 });
    const dark = new THREE.MeshLambertMaterial({ color: 0x3a424b });
    chest.material = metal; pelvis.material = dark;
    skull.material = metal; jaw.material = dark;
    armL.material = dark; armR.material = metal;
    legL.material = dark; legR.material = dark;
    chest.scale.set(1.35, 1.1, 1.25);
    pelvis.scale.set(1.2, 1.0, 1.15);
    armL.scale.set(1.35, 1.05, 1.35); armR.scale.set(1.35, 1.05, 1.35);
    legL.scale.set(1.35, 1.05, 1.35); legR.scale.set(1.35, 1.05, 1.35);
    // glowing power core
    const core = new THREE.Mesh(new THREE.SphereGeometry(.17, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0x4ad6ff }));
    core.position.set(0, .18, -.18); torso.add(core);
    // eye visor
    const visor = new THREE.Mesh(new THREE.BoxGeometry(.30, .07, .05),
      new THREE.MeshBasicMaterial({ color: 0xff3a2a }));
    visor.position.set(0, .04, -.17); head.add(visor);
    // shoulder cannon
    const cannon = new THREE.Mesh(new THREE.CylinderGeometry(.09, .11, .80, 10), metal);
    cannon.rotation.x = Math.PI / 2;
    cannon.position.set(.55, 1.52, -.30);
    g.add(cannon);
    parts.cannon = cannon;
  } else if (type === 'splitter') {
    /* ДЕЛЯЩИЙСЯ: bloated, lumpy, ready to burst */
    chest.scale.set(1.25, 1.2, 1.25);
    pelvis.scale.set(1.15, 1.05, 1.15);
    const lumpMat = new THREE.MeshLambertMaterial({ color: 0x8f4a6a, emissive: 0x200812 });
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2;
      const lump = new THREE.Mesh(new THREE.SphereGeometry(U.rand(.12, .20), 7, 6), lumpMat);
      lump.position.set(Math.cos(a) * .22, .16 + U.rand(-.12, .16), Math.sin(a) * .18 - .12);
      torso.add(lump);
    }
    head.scale.set(1.1, 1.1, 1.1);
  } else if (type === 'healer') {
    /* ЛЕКАРЬ: robed, with a glowing healing halo */
    const robe = new THREE.Mesh(new THREE.ConeGeometry(.34, 1.0, 8),
      new THREE.MeshLambertMaterial({ color: 0x2f6f52 }));
    robe.position.y = .5; g.add(robe);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(.22, .03, 6, 16),
      new THREE.MeshBasicMaterial({ color: 0x6fffa8 }));
    halo.rotation.x = Math.PI / 2; halo.position.y = 1.82; g.add(halo);
    const orbMat = new THREE.MeshBasicMaterial({ color: 0x9dffc4 });
    const orb = new THREE.Mesh(new THREE.SphereGeometry(.09, 8, 6), orbMat);
    orb.position.set(.30, 1.10, -.10); g.add(orb);
    parts.halo = halo; parts.orb = orb;
    chest.material = new THREE.MeshLambertMaterial({ color: 0x356f52 });
  } else if (type === 'shielder') {
    /* ЩИТОНОСЕЦ: big front plate, exposed back */
    chest.scale.set(1.3, 1.15, 1.2);
    const plateMat = new THREE.MeshLambertMaterial({ color: 0x7a8aa8, emissive: 0x0a0e16 });
    const plate = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.5, .10), plateMat);
    plate.position.set(0, 1.05, -.42); plate.rotation.x = .06; g.add(plate);
    const rim = new THREE.Mesh(new THREE.BoxGeometry(1.04, .10, .14), plateMat);
    rim.position.set(0, 1.78, -.42); g.add(rim);
    const boss = new THREE.Mesh(new THREE.SphereGeometry(.12, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0x9ab6e0 }));
    boss.position.set(0, 1.05, -.50); g.add(boss);
    parts.plate = plate;
  } else if (type === 'summoner') {
    /* ПРИЗЫВАТЕЛЬ: tall, horns, a swirling summoning core */
    chest.scale.set(1.15, 1.15, 1.15);
    const hornMat = new THREE.MeshLambertMaterial({ color: 0xcfc0e6 });
    [-1, 1].forEach(sgn => {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(.05, .34, 6), hornMat);
      horn.position.set(sgn * .16, 1.80, .02); horn.rotation.z = sgn * -.4;
      g.add(horn);
    });
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xc24bff, transparent: true, opacity: .9 });
    const core = new THREE.Mesh(new THREE.SphereGeometry(.14, 10, 8), coreMat);
    core.position.set(0, 1.05, -.30); g.add(core);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.30, .03, 6, 18),
      new THREE.MeshBasicMaterial({ color: 0x9a3aff, transparent: true, opacity: .8 }));
    ring.position.set(0, 1.05, -.30); g.add(ring);
    parts.summonCore = core; parts.summonRing = ring;
  } else if (ZOMBIES[type] && ZOMBIES[type].boss) {
    /* Every boss gets its own silhouette so it reads instantly from across the
       arena. Shared base is bulked up first, then the type-specific build adds
       armour, weapons and a glowing core. */
    chest.scale.set(1.6, 1.15, 1.5);
    pelvis.scale.set(1.4, 1.05, 1.3);
    armL.scale.set(1.7, 1.15, 1.7); armR.scale.set(1.7, 1.15, 1.7);
    legL.scale.set(1.5, 1.05, 1.5); legR.scale.set(1.5, 1.05, 1.5);
    skull.scale.set(1.3, 1.1, 1.3);
    const glowMat = (c) => new THREE.MeshBasicMaterial({ color: c });
    const eye2 = (c) => {
      const m = new THREE.MeshBasicMaterial({ color: c });
      [-.09, .09].forEach(ox => {
        const e = new THREE.Mesh(new THREE.SphereGeometry(.04, 8, 6), m);
        e.position.set(ox, .04, -.16); head.add(e);
      });
    };

    if (type === 'bossWarden') {
      /* СТРАЖ — armoured sentinel: stone-grey plating, spiked pauldrons, a tall
         kite shield on the left arm and a spiked mace on the right. */
      const PLATE = 0x9aa0a6, DARK = 0x3c4147, ORANGE = 0xff7a3a;
      chest.material = new THREE.MeshLambertMaterial({ color: 0x8a4a3a });
      skull.material = new THREE.MeshLambertMaterial({ color: PLATE });
      // chest armour plates
      addBossBox(g, 1.05, .80, .34, PLATE, 0, 1.20, -.06);
      addBossBox(g, 1.15, .16, .40, DARK, 0, 1.62, -.06);
      // spiked pauldrons
      [-1, 1].forEach(sgn => {
        addBossBox(g, .46, .34, .44, PLATE, sgn * .60, 1.60, 0);
        for (let i = 0; i < 3; i++) {
          const sp = new THREE.Mesh(new THREE.ConeGeometry(.07, .28, 6), clothMat);
          sp.position.set(sgn * .60, 1.82, -.14 + i * .14); sp.rotation.z = sgn * -.4;
          g.add(sp);
        }
      });
      // tower shield on the left arm
      const shield = new THREE.Group();
      shield.add(mkBox(.12, 1.30, .78, PLATE, 0, 0, 0));
      shield.add(mkBox(.14, 1.30, .10, DARK, 0, 0, .30));
      shield.add(mkBox(.14, .10, .78, ORANGE, 0, .62, 0));
      shield.position.set(-1.05, 1.05, .28);
      g.add(shield); parts.shield = shield;
      // spiked mace on the right arm
      const mace = new THREE.Group();
      mace.add(mkBox(.11, .11, .90, DARK, 0, 0, .30));
      const ball = new THREE.Mesh(new THREE.SphereGeometry(.24, 10, 8), new THREE.MeshLambertMaterial({ color: PLATE }));
      ball.position.z = .82; mace.add(ball);
      for (let i = 0; i < 6; i++) {
        const sp = new THREE.Mesh(new THREE.ConeGeometry(.06, .20, 5), clothMat);
        const a = (i / 6) * Math.PI * 2;
        sp.position.set(Math.cos(a) * .22, Math.sin(a) * .22, .82);
        sp.rotation.z = a - Math.PI / 2; mace.add(sp);
      }
      mace.position.set(1.02, 1.05, .18);
      g.add(mace); parts.mace = mace;
      eye2(0xff7a3a);
      // glowing core
      const core = new THREE.Mesh(new THREE.SphereGeometry(.18, 10, 8), glowMat(ORANGE));
      core.position.set(0, 1.18, -.22); torso.add(core);
    } else if (type === 'bossBrute') {
      /* ЖНЕЦ — skeletal reaper: bone frame, hooded skull, ragged purple cloak
         and a huge scythe in the right hand. */
      const BONE = 0xd8d2c0, CLOTH = 0x3a2352, PURPLE = 0xc24bff;
      chest.material = clothMat; skull.material = new THREE.MeshLambertMaterial({ color: BONE });
      jaw.material = new THREE.MeshLambertMaterial({ color: BONE });
      legL.material = new THREE.MeshLambertMaterial({ color: BONE });
      legR.material = new THREE.MeshLambertMaterial({ color: BONE });
      // ribcage: a stack of bone bars
      for (let i = 0; i < 5; i++) addBossBox(g, .80 - i * .06, .06, .30, BONE, 0, 1.42 - i * .13, -.10);
      // spine
      addBossBox(g, .09, 1.0, .09, BONE, 0, 1.05, .04);
      // hooded cloak: a cone behind the shoulders
      const cloak = new THREE.Mesh(new THREE.ConeGeometry(.85, 1.8, 8, 1, true),
        new THREE.MeshLambertMaterial({ color: CLOTH, side: THREE.DoubleSide }));
      cloak.position.set(0, 1.28, .24); g.add(cloak); parts.cloak = cloak;
      // bony pauldrons
      [-1, 1].forEach(sgn => {
        const sk = new THREE.Mesh(new THREE.BoxGeometry(.44, .22, .40), new THREE.MeshLambertMaterial({ color: BONE }));
        sk.position.set(sgn * .55, 1.66, 0); g.add(sk);
      });
      // scythe
      const scythe = new THREE.Group();
      scythe.add(mkBox(.09, 2.0, .09, 0x4a3418, 0, 0, 0));
      const blade = new THREE.Mesh(new THREE.TorusGeometry(.75, .045, 6, 14, Math.PI * .85), boneBladeMat());
      blade.rotation.z = -Math.PI / 2; blade.position.set(0, .95, 0);
      scythe.add(blade);
      scythe.position.set(1.15, 1.15, .10);
      g.add(scythe); parts.scythe = scythe;
      eye2(PURPLE);
      const core = new THREE.Mesh(new THREE.SphereGeometry(.17, 10, 8), glowMat(PURPLE));
      core.position.set(0, 1.20, -.24); torso.add(core);
    } else if (type === 'bossTitan') {
      /* ТИТАН — colossal rock giant: boulder shoulders, magma cracks, a massive
         stone hammer and a molten core. */
      const ROCK = 0x5a4a42, ROCK2 = 0x3e332d, MAGMA = 0xff4a2a;
      chest.material = new THREE.MeshLambertMaterial({ color: ROCK });
      skull.material = new THREE.MeshLambertMaterial({ color: ROCK });
      armL.material = new THREE.MeshLambertMaterial({ color: ROCK2 });
      armR.material = new THREE.MeshLambertMaterial({ color: ROCK2 });
      // boulder shoulders
      [-1, 1].forEach(sgn => {
        const b = new THREE.Mesh(new THREE.DodecahedronGeometry(.42, 0), new THREE.MeshLambertMaterial({ color: ROCK2 }));
        b.position.set(sgn * .62, 1.66, 0); g.add(b);
      });
      // glowing magma cracks across the chest
      for (let i = 0; i < 5; i++) {
        const crack = mkBox(.70 - i * .08, .05, .04, MAGMA, U.rand(-.1, .1), 1.55 - i * .18, -.20);
        crack.rotation.z = U.rand(-.3, .3); g.add(crack);
      }
      // stone hammer
      const hammer = new THREE.Group();
      hammer.add(mkBox(.12, 1.7, .12, 0x3a2a1e, 0, 0, 0));
      const headH = new THREE.Mesh(new THREE.BoxGeometry(.70, .55, .55), new THREE.MeshLambertMaterial({ color: ROCK2 }));
      headH.position.y = .95; hammer.add(headH);
      const band = mkBox(.74, .10, .59, MAGMA, 0, .95, 0); hammer.add(band);
      hammer.position.set(1.20, 1.10, .12);
      g.add(hammer); parts.hammer = hammer;
      eye2(MAGMA);
      const core = new THREE.Mesh(new THREE.SphereGeometry(.26, 12, 10), glowMat(0xffb060));
      core.position.set(0, 1.15, -.26); torso.add(core);
    } else {
      /* ПОЖИРАТЕЛЬ — void horror: a starfield body, a gaping maw of glowing
         teeth, orbiting shards and a purple singularity core. */
      const VOID = 0x1a1030, VOID2 = 0x2e1b4d, PURPLE = 0x9a3aff;
      chest.material = new THREE.MeshLambertMaterial({ color: VOID });
      pelvis.material = new THREE.MeshLambertMaterial({ color: VOID2 });
      skull.material = new THREE.MeshLambertMaterial({ color: VOID });
      // a gaping maw of glowing teeth on the chest
      const maw = new THREE.Group();
      maw.add(mkBox(.62, .40, .10, 0x0a0612, 0, 0, -.22));
      for (let i = 0; i < 7; i++) {
        const t = new THREE.Mesh(new THREE.ConeGeometry(.05, .16, 4), glowMat(PURPLE));
        t.position.set(-.27 + i * .09, .16, -.24); t.rotation.x = Math.PI; maw.add(t);
        const t2 = new THREE.Mesh(new THREE.ConeGeometry(.05, .16, 4), glowMat(PURPLE));
        t2.position.set(-.27 + i * .09, -.16, -.24); maw.add(t2);
      }
      maw.position.set(0, 1.15, 0); torso.add(maw);
      // jagged void spikes on the shoulders
      [-1, 1].forEach(sgn => {
        for (let i = 0; i < 3; i++) {
          const sp = new THREE.Mesh(new THREE.ConeGeometry(.08, .46, 5), glowMat(i === 1 ? 0xd7b0ff : PURPLE));
          sp.position.set(sgn * (.45 + i * .10), 1.72 + i * .06, 0);
          sp.rotation.z = sgn * -.5; g.add(sp);
        }
      });
      // orbiting shards (animated in Zombie.update)
      const shards = new THREE.Group();
      for (let i = 0; i < 6; i++) {
        const sh = new THREE.Mesh(new THREE.TetrahedronGeometry(.16, 0), glowMat(PURPLE));
        const a = (i / 6) * Math.PI * 2;
        sh.position.set(Math.cos(a) * .95, 0, Math.sin(a) * .95);
        shards.add(sh);
      }
      shards.position.y = 1.15; g.add(shards); parts.shards = shards;
      eye2(PURPLE);
      // the singularity core
      const core = new THREE.Mesh(new THREE.SphereGeometry(.30, 14, 12), glowMat(0xd7b0ff));
      core.position.set(0, 1.15, -.30); torso.add(core);
      const halo = new THREE.Mesh(new THREE.SphereGeometry(.46, 14, 12),
        new THREE.MeshBasicMaterial({ color: PURPLE, transparent: true, opacity: .35, blending: THREE.AdditiveBlending, depthWrite: false }));
      halo.position.copy(core.position); torso.add(halo); parts.coreHalo = halo;
    }

    /* ---- menacing aura: two glowing rings that hover at the boss's feet ---- */
    if (ZOMBIES[type].aura) {
      const aura = new THREE.Group();
      const arc = ZOMBIES[type].aura;
      const mkRing = (r, tube, op) => {
        const geo = new THREE.TorusGeometry(r, tube, 6, 28);
        const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
          color: arc, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false
        }));
        m.rotation.x = Math.PI / 2;
        return m;
      };
      aura.add(mkRing(.95, .045, .55));
      const r2 = mkRing(1.30, .030, .35); r2.position.y = .06; aura.add(r2);
      aura.position.y = .10;
      g.add(aura);
      parts.aura = aura; parts.auraRing2 = r2;
      // a soft coloured lamp so the boss lights its little patch of floor
      const lamp = new THREE.PointLight(ZOMBIES[type].aura, 6, 9, 2);
      lamp.position.set(0, 1.2, 0);
      g.add(lamp); parts.auraLight = lamp;
    }
  }

  g.userData.parts = parts;
  return g;
}

/* ---------------- Zombie ---------------- */
let ZOMBIE_UID = 1;
class Zombie {
  constructor(type, x, z, y) {
    this.id = ZOMBIE_UID++;
    this.type = type;
    const S = ZOMBIES[type];
    this.def = S;
    this.maxHealth = S.hp;
    this.health = S.hp;
    this.scale = S.scale;
    this.speed = S.speed * U.rand(.9, 1.12);
    this.dmg = S.dmg;
    this.atkRange = S.atkRange;
    this.alive = true;
    this.dying = false;
    this.deadT = 0;
    this.pos = { x, y: y === undefined ? 0 : y, z };
    this.vel = { x: 0, y: 0, z: 0 };
    this.yaw = U.rand(-Math.PI, Math.PI);
    this.walkPhase = U.rand(0, 6.28);
    this.attackT = 0;
    this.attackCd = 0;
    this.staggerT = 0;
    this.hitFlash = 0;
    this.growlCd = U.rand(1, 8);
    this.height = 1.75 * this.scale;
    this.radius = .40 * this.scale;
    /* ranged ability (spitters, the robot zombie) — cooldown and a tiny aim
       timer so they lead the shot, plus flying / boss-ability state */
    this.shootCd = this.def.shoot ? U.rand(1.0, 2.2) : 0;
    this.aimT = 0;
    this.flying = !!this.def.flying;
    this.flyBob = U.rand(0, 6.28);
    this.armor = this.def.armor || 0;
    this.pathCd = U.rand(0, .4);
    this.waypoint = null;
    this.losT = U.rand(0, .25);
    this.hasLOS = false;
    this.stuckT = 0;
    this.lastPos = { x, z };
    this.speedMul = 1;
    this.frozen = false;
    this.freezeT = 0;        // seconds of frost left (АБСОЛЮТНЫЙ НОЛЬ)
    this.freezeBank = 0;     // damage stored while frozen, paid out on shatter
    this.portalCd = 0;       // mirror-gate re-teleport cooldown
    /* special-enemy state (КОПАТЕЛЬ / ЛЕКАРЬ / ПРИЗЫВАТЕЛЬ) */
    this.burrowT = 0; this.burrowCd = (this.def.burrowCd || 8) * U.rand(.6, 1.1); this.mound = 0; this.emergeT = 0;
    this.healCd = U.rand(.5, 2.5); this.healPulse = 0; this.healFlash = 0;
    this.summonCd = U.rand(2, 5); this.summonPulse = 0;
    this.blockFlash = 0;

    this.group = buildZombieMesh(type);
    this.group.scale.setScalar(this.scale);
    this.parts = this.group.userData.parts;
  }

  /* local-space hitboxes (scaled) */
  hitboxDefs() {
    const s = this.scale;
    return [
      { part: 'head', cx: 0, cy: 1.52 * s, cz: 0, hw: .17 * s, hh: .17 * s, hd: .17 * s },
      { part: 'body', cx: 0, cy: 1.02 * s, cz: 0, hw: .29 * s, hh: .34 * s, hd: .17 * s },
      { part: 'legs', cx: 0, cy: .44 * s, cz: 0, hw: .25 * s, hh: .44 * s, hd: .13 * s }
    ];
  }

  worldToLocal(p) {
    const dx = p.x - this.pos.x, dy = p.y - this.pos.y, dz = p.z - this.pos.z;
    const c = Math.cos(this.yaw), s = Math.sin(this.yaw);
    return { x: dx * c - dz * s, y: dy, z: dx * s + dz * c };
  }

  center() {
    return { x: this.pos.x, y: this.pos.y + 1.0 * this.scale, z: this.pos.z };
  }

  takeDamage(amount, part, fromDir) {
    if (this.dying || !this.alive) return false;
    /* a FROZEN body banks all damage; it only pays out when it thaws (or is
       shattered early by a big hit). This makes freeze-then-shatter work. */
    if (this.frozen) {
      this.freezeBank = (this.freezeBank || 0) + amount;
      this.hitFlash = .12;
      // a hard enough blow shatters the statue on the spot
      if (this.freezeBank > this.maxHealth * .35) { this.shatter(); return true; }
      return false;
    }
    let mul = 1;
    if (part === 'head') mul = CFG.headshotMultiplier;
    else if (part === 'legs') mul = CFG.limbMultiplier;
    let dmg = amount * mul * (this.dmgTakenMul || 1);
    // armoured enemies (the robot zombie) soak a share of every hit
    if (this.armor > 0) dmg *= (1 - this.armor);
    /* ЩИТОНОСЕЦ: a bolt from the front is almost entirely deflected by the plate */
    if (this.def.frontalShield && fromDir && (fromDir.x || fromDir.z)) {
      const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);       // facing away from target
      const dl = Math.hypot(fromDir.x, fromDir.z) || 1;
      const dot = (fromDir.x / dl) * fx + (fromDir.z / dl) * fz;    // 1 = hit from directly behind
      const arc = this.def.shieldArc === undefined ? .6 : this.def.shieldArc;
      if (dot > arc) {                                              // struck the front plate
        dmg *= (1 - (this.def.shieldReduction === undefined ? .92 : this.def.shieldReduction));
        this.blockFlash = .1;
      }
    }
    this.health -= dmg;
    this.hitFlash = .12;
    this.staggerT = Math.max(this.staggerT, part === 'head' ? .16 : .07);
    Bus.emit('zombieHit', this, part, dmg, fromDir);
    if (this.health <= 0) { this.die(part === 'head'); return true; }
    return false;
  }

  die(headshot) {
    this.dying = true;
    this.alive = false;
    this.deadT = 0;
    this.fallDir = headshot ? U.rand(-1, 1) : U.rand(-1, 1);
    this.fallSpeed = U.rand(2.2, 3.4);
    Bus.emit('zombieDied', this, headshot);
  }

  /* АБСОЛЮТНЫЙ НОЛЬ: a frozen body exploded into shards. It dies instantly and
     banks whatever damage it had stored while chilled. */
  shatter() {
    if (this.dying || !this.alive) return;
    this.alive = false;
    this.health = 0;
    this.dying = true;
    this.deadT = 0;
    this.fallDir = U.rand(-1, 1);
    this.fallSpeed = 3.4;
    Bus.emit('zombieDied', this, false);
    Bus.emit('zombieShatter', this);
  }

  /* АБСОЛЮТНЫЙ НОЛЬ: encase the zombie in an ice shell; it cannot move. */
  freeze(seconds) {
    if (this.dying) return;
    this.frozen = true;
    this.freezeT = Math.max(this.freezeT || 0, seconds);
    if (!this.iceShell) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(.95, 1.95, .62),
        new THREE.MeshLambertMaterial({ color: 0x9fe8ff, emissive: 0x1f5a7a, transparent: true, opacity: .5 }));
      m.position.y = .97;
      m.scale.setScalar(this.scale);
      m.renderOrder = 4;
      this.group.add(m);
      this.iceShell = m;
    }
  }
  thaw() {
    this.frozen = false;
    this.freezeT = 0;
    if (this.iceShell) {
      this.group.remove(this.iceShell);
      this.iceShell.geometry.dispose(); this.iceShell.material.dispose();
      this.iceShell = null;
    }
  }

  update(dt, ctx) {
    if (this.dying) {
      this.deadT += dt;
      // fall over
      const k = U.clamp(this.deadT * this.fallSpeed, 0, 1);
      const fall = Math.sin(k * Math.PI * .5);
      this.group.rotation.x = -fall * Math.PI * .5 * (this.fallDir >= 0 ? 1 : -1);
      this.group.rotation.z = fall * .35 * this.fallDir;
      this.group.position.set(this.pos.x, this.pos.y + fall * .12, this.pos.z);
      const fade = U.clamp(1 - (this.deadT - 3.2) / 1.0, 0, 1);
      if (this.deadT > 3.0) {
        this.group.scale.setScalar(this.scale * U.clamp(fade, .01, 1));
      }
      return;
    }
    if (!this.alive) return;

    this.attackCd = Math.max(0, this.attackCd - dt);
    this.staggerT = Math.max(0, this.staggerT - dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    if (this.shootCd > 0) this.shootCd -= dt;

    if (this.frozen) {
      /* АБСОЛЮТНЫЙ НОЛЬ: stay locked in ice until it thaws; banked damage is
         paid out now (shooting a frozen zombie then letting it thaw kills it). */
      this.freezeT -= dt;
      if (this.freezeT <= 0) {
        const bank = this.freezeBank || 0;
        this.freezeBank = 0;
        this.thaw();
        if (bank > 0) {
          this.health -= bank;
          this.hitFlash = .12;
          if (this.health <= 0) { this.die(false); return; }
        }
      } else {
        this.applyVisual(dt, 0);
        return;
      }
    }

    const player = ctx.player;
    const toP = { x: player.pos.x - this.pos.x, y: player.pos.y - this.pos.y, z: player.pos.z - this.pos.z };
    const distXZ = Math.hypot(toP.x, toP.z);
    const targetYaw = Math.atan2(-toP.x, -toP.z);
    this.yaw = U.angleLerp(this.yaw, targetYaw, 1 - Math.pow(0.00005, dt));

    // ---- line of sight (refreshed a few times a second) ----
    this.losT -= dt;
    if (this.losT <= 0) {
      this.losT = .16 + Math.random() * .14;
      const from = { x: this.pos.x, y: this.pos.y + 1.1 * this.scale, z: this.pos.z };
      const to = { x: player.pos.x, y: player.pos.y + 1.0, z: player.pos.z };
      const d = dirTo(from, to);
      const hit = ctx.world.raycast(from, d.dir, d.dist - .35, ['ground']);
      this.hasLOS = !hit;
    }

    // ---- steering ----
    let dirX, dirZ, speedMul = this.speedMul;
    if (this.hasLOS && distXZ < 34) {
      dirX = toP.x; dirZ = toP.z;
      const l = Math.max(Math.hypot(dirX, dirZ), .001);
      dirX /= l; dirZ /= l;
      this.waypoint = null;
    } else if (ctx.flow) {
      const w = ctx.flow.steer(this.pos.x, this.pos.z);
      if (w) { dirX = w.x; dirZ = w.z; }
      else { dirX = toP.x; dirZ = toP.z; const l = Math.max(Math.hypot(dirX, dirZ), .001); dirX /= l; dirZ /= l; }
    } else {
      dirX = toP.x; dirZ = toP.z; const l = Math.max(Math.hypot(dirX, dirZ), .001); dirX /= l; dirZ /= l;
    }

    // ---- separation from other zombies ----
    let sepX = 0, sepZ = 0;
    const sepList = ctx.neighbors;
    for (let i = 0; i < sepList.length; i++) {
      const o = sepList[i];
      if (o === this || !o.alive) continue;
      const dx = this.pos.x - o.pos.x, dz = this.pos.z - o.pos.z;
      const d2 = dx * dx + dz * dz;
      const rr = (this.radius + o.radius) * 1.15;
      if (d2 < rr * rr && d2 > 0.0001) {
        const d = Math.sqrt(d2);
        const push = (rr - d) / rr;
        sepX += (dx / d) * push; sepZ += (dz / d) * push;
      }
    }
    dirX += sepX * 1.35; dirZ += sepZ * 1.35;
    const dl = Math.hypot(dirX, dirZ) || 1;
    dirX /= dl; dirZ /= dl;

    // ---- attack ----
    // Reach must account for body radius, otherwise large zombies can never land a hit.
    const reach = this.atkRange + this.radius;
    if (distXZ <= reach && this.attackCd <= 0 && Math.abs(toP.y) < 2.4) {
      this.attackCd = 1.15;
      this.attackT = .38;
      this.pendingHit = true;
    }
    if (this.attackT > 0) {
      this.attackT -= dt;
      if (this.pendingHit && this.attackT <= .2) {
        this.pendingHit = false;
        const still = Math.hypot(player.pos.x - this.pos.x, player.pos.z - this.pos.z);
        if (still <= reach + .55 && Math.abs(player.pos.y - this.pos.y) < 2.6) {
          Bus.emit('zombieAttack', this, this.dmg);
        }
      }
      speedMul = 0;
    }

    /* ---- ranged attack: acid spit / plasma bolt ---- */
    if (this.def.shoot && this.shootCd <= 0) {
      const sr = this.def.shootRange || 16;
      const hasLOS = Math.abs(toP.y) < 6 && distXZ < sr;
      if (hasLOS) {
        this.shootCd = (this.def.shootCd || 2.4) * U.rand(.85, 1.2);
        this.aimT = .30;                    // brief wind-up, then the shot
        this.muzzleFrom = { x: this.pos.x, y: this.pos.y + 1.25 * this.scale, z: this.pos.z };
      } else if (this.shootCd < 0) {
        this.shootCd = 0;                   // do not bank fire while out of sight
      }
    }
    if (this.aimT > 0) {
      this.aimT -= dt;
      speedMul = Math.min(speedMul, .35);
      if (this.aimT <= 0 && Bus.emit) {
        Bus.emit('zombieShoot', this, this.muzzleFrom || { x: this.pos.x, y: this.pos.y + 1.25 * this.scale, z: this.pos.z });
      }
    }

    /* ЛЕКАРЬ: pulses healing to nearby wounded zombies */
    if (this.def.heals) {
      this.healCd -= dt;
      if (this.healCd <= 0) {
        let healed = false;
        const list = ctx.neighbors || [];
        for (let i = 0; i < list.length; i++) {
          const o = list[i];
          if (o === this || !o.alive || o.dying) continue;
          const d = Math.hypot(o.pos.x - this.pos.x, o.pos.z - this.pos.z);
          if (d > (this.def.healRange || 9)) continue;
          if (o.health < o.maxHealth) { o.health = Math.min(o.maxHealth, o.health + (this.def.healAmount || 55)); o.healFlash = .5; healed = true; }
        }
        this.healCd = this.def.healCd || 3;
        this.healPulse = .6;
        if (healed) Bus.emit('zombieHeal', this);
      }
    }
    /* ПРИЗЫВАТЕЛЬ: spawns a fresh pack around itself */
    if (this.def.summons) {
      this.summonCd -= dt;
      if (this.summonCd <= 0 && ctx.horde) {
        this.summonCd = this.def.summonCd || 6.5;
        for (let i = 0; i < (this.def.summonCount || 4); i++) {
          const a = U.rand(0, 6.28), r = U.rand(1.6, 3.4);
          let sx = U.clamp(this.pos.x + Math.cos(a) * r, -MAP.size / 2 + 3, MAP.size / 2 - 3);
          let sz = U.clamp(this.pos.z + Math.sin(a) * r, -MAP.size / 2 + 3, MAP.size / 2 - 3);
          const sp = ctx.horde.spawn('walker', sx, sz);
          sp.health = sp.maxHealth = Math.max(30, this.maxHealth * .18);
        }
        Bus.emit('zombieSummon', this);
        this.summonPulse = .7;
      }
    }
    if (this.healFlash > 0) this.healFlash -= dt;
    if (this.healPulse > 0) this.healPulse -= dt;
    if (this.summonPulse > 0) this.summonPulse -= dt;
    this.groundY = this.pos.y;

    // ---- gravity & movement ----
    if (!this.onGround) this.vel.y -= CFG.gravity * dt;

    /* КОПАТЕЛЬ: periodically dives under, races to the player and bursts up */
    if (this.def.burrow) {
      if (this.burrowT > 0) {
        this.burrowT -= dt;
        // submerged: no contact, race straight toward the player
        const bx = toP.x, bz = toP.z;
        const bl = Math.hypot(bx, bz) || 1;
        const bs = this.speed * 2.7;
        this.pos.x = U.clamp(this.pos.x + (bx / bl) * bs * dt, -MAP.size / 2 + 2, MAP.size / 2 - 2);
        this.pos.z = U.clamp(this.pos.z + (bz / bl) * bs * dt, -MAP.size / 2 + 2, MAP.size / 2 - 2);
        this.pos.y = -0.5;
        if (this.burrowT > .45) this.mound = 1;   // dirt marker while tunnelling
        if (this.burrowT <= 0) {
          // emerge BEHIND the player (a spot past them, away from their facing)
          this.pos.x = U.clamp(player.pos.x + Math.sin(player.yaw) * 2.0, -MAP.size / 2 + 2, MAP.size / 2 - 2);
          this.pos.z = U.clamp(player.pos.z + Math.cos(player.yaw) * 2.0, -MAP.size / 2 + 2, MAP.size / 2 - 2);
          this.pos.y = ctx.world.groundAt(this.pos.x, this.pos.z, 3) || 0;
          this.mound = 0; this.emergeT = .25;
          this.attackCd = 0;
        }
        this.applyVisual(dt, bs);
        return;
      }
      this.burrowCd -= dt;
      if (this.burrowCd <= 0 && distXZ > 4 && distXZ < 30) { this.burrowT = 1.1; this.burrowCd = this.def.burrowCd || 8; this.mound = 1; return; }
    }
    const speed = this.speed * speedMul * (this.staggerT > 0 ? .35 : 1);
    const moveX = dirX * speed, moveZ = dirZ * speed;

    /* flying: skim above the floor toward a hover height over the player */
    if (this.flying) {
      const hoverY = (ctx.world.groundAt(this.pos.x, this.pos.z, this.pos.y + 6) || 0) + (this.def.hover || 2.6);
      this.flyBob += dt * 2.4;
      const targetY = (distXZ < 16 ? hoverY - 0.8 : hoverY) + Math.sin(this.flyBob) * .22;
      this.pos.y = U.lerp(this.pos.y, targetY, 1 - Math.pow(.02, dt));
      this.pos.x = U.clamp(this.pos.x + moveX * dt, -MAP.size / 2 + 2, MAP.size / 2 - 2);
      this.pos.z = U.clamp(this.pos.z + moveZ * dt, -MAP.size / 2 + 2, MAP.size / 2 - 2);
      this.growlCd -= dt;
      if (this.growlCd <= 0) {
        this.growlCd = U.rand(4, 13);
        if (distXZ < 30) Bus.emit('zombieGrowl', this);
      }
      this.applyVisual(dt, speed);
      // wing flap
      if (this.parts.wingL) {
        const f = Math.sin(this.walkPhase * 2.2) * .55;
        this.parts.wingL.rotation.z = -.35 - f;
        this.parts.wingR.rotation.z = .35 + f;
      }
      return;
    }

    // vertical snap: follow ground height (simple, avoids complex collision)
    const ahead = { x: this.pos.x + moveX * dt * 3, z: this.pos.z + moveZ * dt * 3 };
    const gy = ctx.world.groundAt(ahead.x, ahead.z, this.pos.y + 2.6);
    let stepY = gy;
    // block if the step is too tall (wall)
    const canStep = (gy - this.pos.y) < 1.25;
    let nx = this.pos.x + moveX * dt, nz = this.pos.z + moveZ * dt;
    if (!canStep || ctx.world.overlaps(nx, gy + .05, nz, this.radius * .92, this.height * .8)) {
      // wall or too-tall step → try sliding along each axis
      const gyX = ctx.world.groundAt(this.pos.x + moveX * dt, this.pos.z, this.pos.y + 2.6);
      const gyZ = ctx.world.groundAt(this.pos.x, this.pos.z + moveZ * dt, this.pos.y + 2.6);
      const okX = (gyX - this.pos.y) < 1.25 && !ctx.world.overlaps(this.pos.x + moveX * dt, gyX + .05, this.pos.z, this.radius * .92, this.height * .8);
      const okZ = (gyZ - this.pos.y) < 1.25 && !ctx.world.overlaps(this.pos.x, gyZ + .05, this.pos.z + moveZ * dt, this.radius * .92, this.height * .8);
      if (okX) { nx = this.pos.x + moveX * dt; nz = this.pos.z; stepY = gyX; }
      else if (okZ) { nx = this.pos.x; nz = this.pos.z + moveZ * dt; stepY = gyZ; }
      else { nx = this.pos.x; nz = this.pos.z; stepY = this.pos.y; this.stuckT += dt; }
    } else this.stuckT = Math.max(0, this.stuckT - dt * .5);

    if (this.stuckT > 1.4) {
      // nudge sideways to escape a corner
      const side = (this.id % 2 ? 1 : -1);
      nx += -dirZ * side * speed * dt * 1.4;
      nz += dirX * side * speed * dt * 1.4;
      this.stuckT = .8;
    }

    if (stepY > this.pos.y) this.pos.y = U.lerp(this.pos.y, stepY, 1 - Math.pow(.0001, dt));
    else if (stepY < this.pos.y - .05) { this.vel.y = 0; this.pos.y = U.lerp(this.pos.y, stepY, 1 - Math.pow(.002, dt)); }
    else this.pos.y = stepY;

    this.pos.x = nx; this.pos.z = nz;
    this.pos.x = U.clamp(this.pos.x, -MAP.size / 2 + 2, MAP.size / 2 - 2);
    this.pos.z = U.clamp(this.pos.z, -MAP.size / 2 + 2, MAP.size / 2 - 2);

    // ---- growls ----
    this.growlCd -= dt;
    if (this.growlCd <= 0) {
      this.growlCd = U.rand(4, 13);
      if (distXZ < 30) Bus.emit('zombieGrowl', this);
    }

    this.applyVisual(dt, Math.hypot(moveX, moveZ));
  }

  applyVisual(dt, moveSpeed) {
    const p = this.parts;
    const bob = moveSpeed > .1 ? moveSpeed / Math.max(this.speed, .01) : 0;
    this.walkPhase += dt * (2.6 + bob * 5.5);
    const ph = this.walkPhase;
    const amp = .55 * bob;
    const stagger = this.staggerT > 0 ? this.staggerT * 2.2 : 0;

    p.legL.rotation.x = Math.sin(ph) * amp;
    p.legR.rotation.x = -Math.sin(ph) * amp;
    // arms reaching forward (classic zombie)
    const reach = this.type === 'runner' ? -1.15 : -1.5;
    p.armL.rotation.x = reach + Math.sin(ph + 1) * amp * .8 + stagger * U.rand(0, 1);
    p.armR.rotation.x = reach + Math.sin(ph + 2.2) * amp * .8;
    p.armL.rotation.z = .12; p.armR.rotation.z = -.12;
    // attack lunge
    if (this.attackT > 0) {
      const k = 1 - Math.abs(this.attackT / .38 - .5) * 2;
      p.armL.rotation.x = reach + k * .9;
      p.armR.rotation.x = reach + k * .9;
    }
    // body sway + hit reaction
    const sway = Math.sin(ph * 2) * .045 * bob;
    p.torso.rotation.z = sway;
    p.head.rotation.z = stagger * (this.id % 2 ? .5 : -.5);
    p.head.rotation.x = -0.12 + Math.sin(ph) * .07 * bob;

    const lean = this.type === 'crawler' ? 0 : .16 + bob * .12;
    this.group.rotation.z = 0;
    this.group.rotation.x = this.type === 'crawler' ? 0 : 0;
    p.torso.position.y = (this.type === 'crawler' ? .82 : 1.02) + Math.abs(Math.sin(ph)) * .035 * bob;

    // ---- boss flair: animate their signature props ----
    if (p.mace) p.mace.rotation.x = reach + .3 + Math.sin(ph) * .25 * (0.4 + bob);
    if (p.hammer) p.hammer.rotation.x = reach + .35 + Math.sin(ph + 1) * .30 * (0.4 + bob);
    if (p.scythe) { p.scythe.rotation.z = .25 + Math.sin(ph * .9) * .18; p.scythe.rotation.x = reach * .5; }
    if (p.cloak) p.cloak.rotation.x = -Math.abs(Math.sin(ph * .8)) * .12 * (0.3 + bob);
    if (p.shards) p.shards.rotation.y += dt * 2.2;
    if (p.aura) {
      p.aura.rotation.y += dt * .7;
      if (p.auraRing2) { p.auraRing2.rotation.z += dt * 1.4; p.auraRing2.scale.setScalar(1 + .06 * Math.sin(ph * 2)); }
      if (p.auraLight) p.auraLight.intensity = 5 + Math.sin(ph * 2) * 2;
    }
    if (p.coreHalo) {
      const k = .5 + .5 * Math.sin(ph * 1.5);
      p.coreHalo.scale.setScalar(.9 + k * .35);
      p.coreHalo.material.opacity = .22 + k * .25;
    }
    // ---- new-special flair ----
    if (p.halo) { p.halo.rotation.z += dt * 1.2; p.halo.visible = this.healPulse > 0 || (this.healCd < .6); }
    if (p.orb) {
      const k = .5 + .5 * Math.sin(ph * 2.5);
      p.orb.scale.setScalar(.85 + k * .4);
      p.orb.material.color.setHex(this.healPulse > 0 ? 0xffffff : 0x9dffc4);
    }
    if (p.summonCore) {
      const k = .5 + .5 * Math.sin(ph * 2.2);
      p.summonCore.scale.setScalar(.9 + k * .5 * (.4 + bob));
      p.summonCore.material.opacity = .5 + k * .5;
      if (p.summonRing) { p.summonRing.rotation.z += dt * 2.4; p.summonRing.rotation.x = .6 + Math.sin(ph) * .4; }
    }
    if (p.plate) p.plate.material.emissive.setHex(this.blockFlash > 0 ? 0x2a3550 : 0x0a0e16);
    if (this.blockFlash > 0) this.blockFlash -= dt;
    // КОПАТЕЛЬ dirt mound: a marker that shows where it is tunnelling
    if (this.def.burrow) {
      if (this.mound && !this.moundMesh) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(.55, 8, 6),
          new THREE.MeshLambertMaterial({ color: 0x5a4426 }));
        m.scale.set(1, .40, 1); m.position.y = .12;
        if (this.group.parent) this.group.parent.add(m);
        this.moundMesh = m;
      }
      if (this.moundMesh) {
        this.moundMesh.visible = !!this.mound;
        this.moundMesh.position.set(this.pos.x, (this.groundY || 0) + .12, this.pos.z);
      }
    }
    if (this.emergeT > 0) this.emergeT -= dt;

    // hit flash
    const flash = this.hitFlash > 0;
    this.group.traverse(o => {
      if (o.isMesh && o.material && o.material.emissive !== undefined) {
        o.material.emissive.setHex(flash ? 0x662222 : 0x000000);
      }
    });

    this.group.position.set(this.pos.x, this.pos.y, this.pos.z);
    this.group.rotation.y = this.yaw;
  }

  dispose(scene) {
    scene.remove(this.group);
    this.group.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    if (this.moundMesh) { if (this.moundMesh.parent) this.moundMesh.parent.remove(this.moundMesh); this.moundMesh.geometry.dispose(); this.moundMesh.material.dispose(); this.moundMesh = null; }
    if (this.iceShell) { if (this.iceShell.parent) this.iceShell.parent.remove(this.iceShell); this.iceShell.geometry.dispose(); this.iceShell.material.dispose(); this.iceShell = null; }
  }
}

function dirTo(from, to) {
  const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
  const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
  return { dir: { x: dx / d, y: dy / d, z: dz / d }, dist: d };
}

/* ============================================================
   FLOW FIELD — shared navigation towards the player for the horde
   ============================================================ */
class FlowField {
  constructor(nav) {
    this.nav = nav;
    const n = nav.W * nav.H;
    this.dist = new Float32Array(n);
    this.dist.fill(Infinity);
    this.queue = new Int32Array(n);
    this.target = { x: 0, z: 0 };
    this.valid = false;
    this.rebuildCd = 0;
    this.goalCell = -1;
  }
  update(dt, tx, tz, force) {
    this.rebuildCd -= dt;
    const moved = Math.hypot(tx - this.target.x, tz - this.target.z) > 2.2;
    if (!force && this.rebuildCd > 0 && !moved) return;
    this.rebuildCd = .38;
    this.target.x = tx; this.target.z = tz;
    this.build(tx, tz);
  }
  build(tx, tz) {
    const nav = this.nav;
    const d = this.dist;
    d.fill(Infinity);
    const start = nav.nearest(tx, tz);
    if (start < 0) { this.valid = false; return; }
    this.goalCell = start;
    const q = this.queue;
    let head = 0, tail = 0;
    d[start] = 0; q[tail++] = start;
    const W = nav.W, H = nav.H, reach = nav.reach, gy = nav.groundY;
    while (head < tail) {
      const cur = q[head++];
      const cx = cur % W, cz = (cur / W) | 0;
      const cd = d[cur];
      const cy = gy[cur];
      for (let k = 0; k < 8; k++) {
        const nx = cx + (k === 0 ? 1 : k === 1 ? -1 : k === 2 ? 0 : k === 3 ? 0 : k === 4 ? 1 : k === 5 ? 1 : k === 6 ? -1 : -1);
        const nz = cz + (k === 0 ? 0 : k === 1 ? 0 : k === 2 ? 1 : k === 3 ? -1 : k === 4 ? 1 : k === 5 ? -1 : k === 6 ? 1 : -1);
        if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue;
        const j = nz * W + nx;
        if (!reach[j]) continue;
        if (Math.abs(gy[j] - cy) > .66) continue;
        const nd = cd + (k >= 4 ? 1.42 : 1);
        if (nd < d[j]) { d[j] = nd; q[tail++] = j; }
      }
    }
    this.valid = true;
  }
  /* returns a normalised direction to the next step, or null */
  steer(x, z) {
    if (!this.valid) return null;
    const nav = this.nav, W = nav.W, d = this.dist;
    const cell = nav.idx(x, z);
    if (cell < 0 || !isFinite(d[cell])) return null;
    const cx = cell % W, cz = (cell / W) | 0;
    let best = cell, bestD = d[cell] - 0.001;
    for (let k = 0; k < 8; k++) {
      const nx = cx + (k === 0 ? 1 : k === 1 ? -1 : k === 2 ? 0 : k === 3 ? 0 : k === 4 ? 1 : k === 5 ? 1 : k === 6 ? -1 : -1);
      const nz = cz + (k === 0 ? 0 : k === 1 ? 0 : k === 2 ? 1 : k === 3 ? -1 : k === 4 ? 1 : k === 5 ? -1 : k === 6 ? 1 : -1);
      if (nx < 0 || nz < 0 || nx >= nav.W || nz >= nav.H) continue;
      const j = nz * nav.W + nx;
      if (!nav.reach[j]) continue;
      if (Math.abs(nav.groundY[j] - nav.groundY[cell]) > .70) continue;
      if (d[j] < bestD) { bestD = d[j]; best = j; }
    }
    // if we are already at the goal cell, head straight to the target
    const c = nav.cellCenter(best);
    let vx = c.x - x, vz = c.z - z;
    const l = Math.hypot(vx, vz);
    if (l < .28) {
      vx = this.target.x - x; vz = this.target.z - z;
      const l2 = Math.hypot(vx, vz) || 1;
      return { x: vx / l2, z: vz / l2 };
    }
    return { x: vx / l, z: vz / l };
  }
}

/* ============================================================
   HORDE MANAGER
   ============================================================ */
class Horde {
  constructor(scene, world, game) {
    this.scene = scene; this.world = world; this.game = game;
    this.list = [];
    this.flow = new FlowField(MAP.nav);
    this.spawnAcc = 0;
    this.neighborsBuf = [];
    this.rebuildNeighborCells();
  }
  rebuildNeighborCells() {
    const c = 6;
    this.nc = c;
    this.ncellMap = new Map();
  }

  /* spatial buckets so separation only checks nearby zombies */
  bucketize() {
    const c = 4.5;
    this.ncellMap.clear();
    for (let i = 0; i < this.list.length; i++) {
      const z = this.list[i];
      if (!z.alive) continue;
      const k = Math.floor(z.pos.x / c) + ':' + Math.floor(z.pos.z / c);
      let a = this.ncellMap.get(k);
      if (!a) { a = []; this.ncellMap.set(k, a); }
      a.push(z);
    }
  }
  nearby(z) {
    const c = 4.5;
    const gx = Math.floor(z.pos.x / c), gz = Math.floor(z.pos.z / c);
    const out = [];
    for (let ix = -1; ix <= 1; ix++) for (let iz = -1; iz <= 1; iz++) {
      const a = this.ncellMap.get((gx + ix) + ':' + (gz + iz));
      if (a) for (let i = 0; i < a.length; i++) out.push(a[i]);
    }
    return out;
  }

  spawn(type, x, z, y) {
    const zz = new Zombie(type, x, z, y === undefined ? this.world.groundAt(x, z, 3) : y);
    this.scene.add(zz.group);
    this.list.push(zz);
    return zz;
  }

  /* Pick a spawn point for a fresh zombie. Prefers a spot roughly 26m from the
     player and outside their view cone, so the horde closes in quickly without
     popping into existence right in front of them. */
  spawnRandom(type, aroundX, aroundZ, minDist) {
    const spawns = MAP.zombieSpawns;
    const pl = this.game && this.game.player;
    const pyaw = pl ? pl.yaw : 0;
    const fx = -Math.sin(pyaw), fz = -Math.cos(pyaw);   // player forward
    let best = null, bestScore = -1e9;
    for (let i = 0; i < 16; i++) {
      const s = U.pick(spawns);
      const dx = s.x - aroundX, dz = s.z - aroundZ;
      const d = Math.hypot(dx, dz);
      if (d < 13) continue;                                     // too close
      if (this.list.some(z => z.alive && Math.hypot(z.pos.x - s.x, z.pos.z - s.z) < 1.6)) continue;
      // score: near the ideal range, and behind/beside the player
      const fwd = (dx * fx + dz * fz) / Math.max(d, .01);        // 1 = dead ahead
      let score = -Math.abs(d - 26) - Math.max(0, fwd) * 16 + U.rand(0, 4);
      if (score > bestScore) { bestScore = score; best = s; }
    }
    if (!best) {
      // fall back: ring around the player at a safe distance
      const a = U.rand(0, Math.PI * 2);
      const r = Math.max(20, minDist || 20);
      best = { x: U.clamp(aroundX + Math.cos(a) * r, -MAP.size / 2 + 3, MAP.size / 2 - 3), z: U.clamp(aroundZ + Math.sin(a) * r, -MAP.size / 2 + 3, MAP.size / 2 - 3) };
    }
    const y = this.world.groundAt(best.x, best.z, 3);
    return this.spawn(type, best.x, best.z, y === null ? 0 : y);
  }

  update(dt, player) {
    this.flow.update(dt, player.pos.x, player.pos.z);
    this.bucketize();
    const ctx = { player, world: this.world, flow: this.flow, neighbors: null, horde: this };
    for (let i = 0; i < this.list.length; i++) {
      const z = this.list[i];
      ctx.neighbors = this.nearby(z);
      z.update(dt, ctx);
    }
    // reap
    for (let i = this.list.length - 1; i >= 0; i--) {
      const z = this.list[i];
      // practice targets respawn instead of being removed; the range owns them
      if (z.isTarget) continue;
      if (z.dying && z.deadT > 4.2) { z.dispose(this.scene); this.list.splice(i, 1); }
    }
  }

  get aliveCount() { let n = 0; for (const z of this.list) if (z.alive && !z.dying) n++; return n; }
  get activeCount() { let n = 0; for (const z of this.list) if (!z.dying) n++; return n; }

  clear() {
    for (const z of this.list) z.dispose(this.scene);
    this.list.length = 0;
  }

  /* Ray-vs-zombie hit test. Returns {zombie, t, part, point, dist} or null. */
  raycast(origin, dir, maxDist) {
    let best = null;
    for (let i = 0; i < this.list.length; i++) {
      const z = this.list[i];
      if (!z.alive || z.dying) continue;
      const hit = rayZombie(origin, dir, z, maxDist);
      if (hit && (!best || hit.t < best.t)) best = { zombie: z, t: hit.t, part: hit.part, dist: hit.t };
    }
    if (best) best.point = { x: origin.x + dir.x * best.t, y: origin.y + dir.y * best.t, z: origin.z + dir.z * best.t };
    return best;
  }
}

/* ray vs a zombie's oriented hitboxes */
function rayZombie(o, d, z, maxDist) {
  // world -> zombie local frame: rotate by -yaw so the hitbox rotation matches
  // the rendered mesh (mesh.rotation.y = yaw).
  const c = Math.cos(z.yaw), s = Math.sin(z.yaw);
  const ox = o.x - z.pos.x, oy = o.y - z.pos.y, oz = o.z - z.pos.z;
  const lo = { x: ox * c - oz * s, y: oy, z: ox * s + oz * c };
  const ld = { x: d.x * c - d.z * s, y: d.y, z: d.x * s + d.z * c };
  const defs = z.hitboxDefs();
  let best = null;
  for (let i = 0; i < defs.length; i++) {
    const hb = defs[i];
    const box = AABB(hb.cx - hb.hw, hb.cy - hb.hh, hb.cz - hb.hd, hb.cx + hb.hw, hb.cy + hb.hh, hb.cz + hb.hd);
    const h = rayBox(lo, ld, box, maxDist);
    if (h && (!best || h.t < best.t)) best = { t: h.t, part: hb.part, normal: h.normal };
  }
  return best;
}
