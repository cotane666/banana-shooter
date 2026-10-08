/* ============================================================
   07 — ZOMBIES: horde AI (flow field + steering), animation, damage
   ============================================================ */

/* ============================================================
   УЛЬТРА-ГРАФИКА: раны на конечностях, отрыв конечностей и рэгдолл.
   Всё это включается ТОЛЬКО при пресете «УЛЬТРА» (Game._gfxUltra).
   ============================================================ */
function zombieUltra() { return (typeof Game !== 'undefined' && Game && Game._gfxUltra) === true; }

/* текстура раны/отметины (тёмно-багровое пятно) — общая на всех */
let _woundTex = null;
function zombieWoundTexture() {
  if (_woundTex) return _woundTex;
  const S = 48; const c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d');
  x.clearRect(0, 0, S, S);
  const g = x.createRadialGradient(S / 2, S / 2, 1, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(120,8,8,.98)');
  g.addColorStop(.45, 'rgba(90,10,10,.85)');
  g.addColorStop(.8, 'rgba(60,8,8,.35)');
  g.addColorStop(1, 'rgba(50,6,6,0)');
  x.fillStyle = g; x.beginPath(); x.arc(S / 2, S / 2, S / 2, 0, 7); x.fill();
  for (let i = 0; i < 5; i++) {
    x.strokeStyle = 'rgba(150,20,20,.5)'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(S / 2, S / 2);
    x.lineTo(S / 2 + (Math.random() - .5) * S, S / 2 + (Math.random() - .5) * S); x.stroke();
  }
  _woundTex = new THREE.CanvasTexture(c);
  _woundTex.colorSpace = THREE.SRGBColorSpace;
  return _woundTex;
}
let _woundMat = null;
let _woundGeo = null;
function zombieWoundMat() {
  if (!_woundMat) _woundMat = new THREE.MeshBasicMaterial({ map: zombieWoundTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6, side: THREE.DoubleSide });
  return _woundMat;
}

/* свободные оторванные конечности (физика + затухание), общие на всю игру */
const ZOMBIE_LIMB_DEBRIS = [];
function spawnLimbDebris(scene, part, dir) {
  if (!scene || !part) return;
  scene.add(part);
  const d = dir || { x: 0, y: 0, z: 0 };
  const dl = Math.hypot(d.x, d.z) || 1;
  ZOMBIE_LIMB_DEBRIS.push({
    mesh: part, life: 4.0, max: 4.0,
    vel: { x: (d.x / dl) * U.rand(3, 6.5) + U.rand(-2.5, 2.5), y: U.rand(3.5, 7), z: (d.z / dl) * U.rand(3, 6.5) + U.rand(-2.5, 2.5) },
    spin: { x: U.rand(-12, 12), y: U.rand(-12, 12), z: U.rand(-12, 12) },
    grounded: false, bloodT: 0
  });
}
/* ============================================================
   РЭГДОЛЛ (УЛЬТРА): тело зомби распадается на НЕЗАВИСИМЫЕ куски-«частицы»
   (торс, голова, руки, ноги). Каждый кусок имеет свою позицию/скорость и
   вращение, связан суставами с соседями (мягкая связь, как верёвка), и
   сталкивается с землёй И стенами — поэтому не проваливается сквозь
   текстуры и не вращается вокруг одной точки.
   ============================================================ */
const RAGDOLL_G = 26;

/* построить список тел рэгдолла из частей зомби (мировые координаты) */
function ragdollBuildBodies(z) {
  const bodies = [];
  const map = [
    { key: 'torso', part: 'torso', r: .38, cy: 0 },
    { key: 'head', part: 'head', r: .22, cy: 0 },
    { key: 'armL', part: 'armL', r: .16, cy: -.37 },
    { key: 'armR', part: 'armR', r: .16, cy: -.37 },
    { key: 'legL', part: 'legL', r: .19, cy: -.42 },
    { key: 'legR', part: 'legR', r: .19, cy: -.42 }
  ];
  z.group.updateMatrixWorld(true);
  const _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
  const sc = z.scale || 1;
  for (const m of map) {
    const piv = z.parts[m.part];
    if (!piv || z.severed[m.part]) continue;
    piv.updateWorldMatrix(true, false);
    piv.matrixWorld.decompose(_p, _q, _s);
    /* физическая точка = ЦЕНТР куска (сустав + локальный сдвиг cy) */
    const off = new THREE.Vector3(0, m.cy * sc, 0).applyQuaternion(_q);
    bodies.push({
      key: m.key, part: m.part, mesh: null,
      px: _p.x + off.x, py: _p.y + off.y, pz: _p.z + off.z,
      x0: _p.x + off.x, y0: _p.y + off.y, z0: _p.z + off.z,
      /* положение самого сустава (нужно, чтобы поставить клон меша) */
      jx: _p.x, jy: _p.y, jz: _p.z, cy: m.cy * sc,
      vx: 0, vy: 0, vz: 0,
      radius: Math.max(.18, m.r * sc),
      quat: _q.clone(), spin: { x: U.rand(-8, 8), y: U.rand(-8, 8), z: U.rand(-8, 8) }
    });
  }
  const byKey = {}; bodies.forEach(b => byKey[b.key] = b);
  const links = [];
  const link = (a, b) => {
    const A = byKey[a], B = byKey[b];
    if (A && B) links.push({ a: A, b: B, ax: B.x0 - A.x0, ay: B.y0 - A.y0, az: B.z0 - A.z0 });
  };
  link('torso', 'head');
  link('torso', 'armL');
  link('torso', 'armR');
  link('torso', 'legL');
  link('torso', 'legR');
  return { bodies: bodies, links: links, byKey: byKey };
}

/* старт рэгдолла: спрятать исходную модель, заспавнить независимые куски */
function ragdollStart(z, dir) {
  if (!z || z.ragdollBodies) return;
  const data = ragdollBuildBodies(z);
  if (!data.bodies.length) return;
  const scene = z.group.parent || (typeof Game !== 'undefined' && Game.scene);
  if (!scene) return;
  z.group.visible = false;
  const d = dir || { x: 0, y: 0, z: 0 };
  const dl = Math.hypot(d.x, d.z) || 1;
  for (const b of data.bodies) {
    /* клон ставим так, чтобы СУСТАВ (pivot) оказался в joint-точке: она на
       расстоянии cy от центра тела (cy повёрнут вместе с телом). */
    const piv = z.parts[b.part];
    let mesh;
    if (b.key === 'torso') mesh = z.parts.torso.clone(true);
    else mesh = piv.clone(true);
    const off = new THREE.Vector3(0, -b.cy, 0).applyQuaternion(b.quat);
    mesh.position.set(b.px + off.x, b.py + off.y, b.pz + off.z);
    mesh.quaternion.copy(b.quat);
    mesh.scale.copy(z.group.scale);
    scene.add(mesh);
    b.mesh = mesh;
    /* импульс: в стороны от удара + вверх + разлёт кусков */
    b.vx = (d.x / dl) * U.rand(1.5, 3.5) + U.rand(-2.5, 2.5);
    b.vy = U.rand(2.5, 5.5);
    b.vz = (d.z / dl) * U.rand(1.5, 3.5) + U.rand(-2.5, 2.5);
  }
  z.ragdollBodies = data.bodies;
  z.ragdollLinks = data.links;
  z.ragdollByKey = data.byKey;
  z.ragdollSettle = 0;
}

/* один шаг физики рэгдолла: гравитация, интеграция, связи, коллизии, вращение */
function ragdollUpdate(z, dt, world) {
  const bodies = z.ragdollBodies;
  if (!bodies) return false;
  /* 1) интеграция + гравитация */
  for (const b of bodies) {
    b.vy -= RAGDOLL_G * dt;
    b.px += b.vx * dt; b.py += b.vy * dt; b.pz += b.vz * dt;
  }
  /* 2) связи-суставы: тянем конечности к точке сустава, которая ВРАЩАЕТСЯ
     вместе с торсом (поэтому конечности мотаются, а не едут параллельно) */
  const links = z.ragdollLinks;
  for (let it = 0; it < 3; it++) {
    for (const L of links) {
      const a = L.a, b = L.b;
      /* локальный rest-вектор (относительно A) поворачиваем quaternion'ом A */
      _ragVec.set(L.ax, L.ay, L.az).applyQuaternion(a.quat);
      const tx = a.px + _ragVec.x, ty = a.py + _ragVec.y, tz = a.pz + _ragVec.z;
      const dx = b.px - tx, dy = b.py - ty, dz = b.pz - tz;
      const k = .5;
      b.px -= dx * k; b.py -= dy * k; b.pz -= dz * k;
      a.px += dx * k * .2; a.py += dy * k * .2; a.pz += dz * k * .2;
    }
  }
  /* 3) коллизии со стенами (по каждому телу) + земля */
  for (const b of bodies) {
    b.grounded = false;
    /* тело — сфера радиуса b.radius вокруг центра (b.px,py,pz) */
    let gy = 0;
    if (world && world.groundAt) gy = world.groundAt(b.px, b.pz, b.py + .5) || 0;
    if (b.py - b.radius <= gy) {
      b.py = gy + b.radius;
      if (b.vy < 0) {
        if (b.vy < -2.5) b.vy = -b.vy * .3;
        else b.vy = 0;
      }
      b.vx *= .7; b.vz *= .7;
      b.spin.x *= .6; b.spin.y *= .6; b.spin.z *= .6;
      b.grounded = true;
    }
    /* стены: отталкиваем сферу тела из перекрывающих блоков */
    if (world && world.query) {
      const rad = b.radius;
      const bb = AABB(b.px - rad, b.py - rad, b.pz - rad, b.px + rad, b.py + rad, b.pz + rad);
      world.query(bb, _ragQuery);
      for (let i = 0; i < _ragQuery.length; i++) {
        const box = _ragQuery[i];
        if (b.py + rad <= box.minY || b.py - rad >= box.maxY) continue;
        const cx = U.clamp(b.px, box.minX, box.maxX);
        const cz = U.clamp(b.pz, box.minZ, box.maxZ);
        let dx = b.px - cx, dz = b.pz - cz;
        let d2 = dx * dx + dz * dz;
        if (d2 >= rad * rad) continue;
        let d = Math.sqrt(d2);
        if (d < 1e-4) { dx = 1; dz = 0; d = 1; }
        const push = (rad - d);
        b.px += (dx / d) * push; b.pz += (dz / d) * push;
        b.vx *= .5; b.vz *= .5;
      }
    }
  }
  /* 4) вращение кусков: осевое кручение затухает на земле */
  let allGrounded = true;
  const _off = _ragVec;
  for (const b of bodies) {
    if (!b.grounded) allGrounded = false;
    b.quat.multiply(_ragTmpQ.setFromEuler(_ragTmpE.set(b.spin.x * dt, b.spin.y * dt, b.spin.z * dt)));
    b.quat.normalize();
    if (b.mesh) {
      _off.set(0, -b.cy, 0).applyQuaternion(b.quat);
      b.mesh.position.set(b.px + _off.x, b.py + _off.y, b.pz + _off.z);
      b.mesh.quaternion.copy(b.quat);
    }
  }
  if (allGrounded) z.ragdollSettle += dt; else z.ragdollSettle = 0;
  /* когда все куски лежат — быстро гасим остаточное движение и вращение */
  if (allGrounded) {
    for (const b of bodies) {
      b.vx *= .86; b.vz *= .86;
      b.spin.x *= .82; b.spin.y *= .82; b.spin.z *= .82;
      if (Math.abs(b.spin.x) < .15) b.spin.x = 0;
      if (Math.abs(b.spin.y) < .15) b.spin.y = 0;
      if (Math.abs(b.spin.z) < .15) b.spin.z = 0;
    }
  }
  return true;
}

const _ragQuery = [];
const _ragTmpQ = new THREE.Quaternion();
const _ragTmpE = new THREE.Euler();
const _ragVec = new THREE.Vector3();

/* убрать тела рэгдолла со сцены */
function ragdollDispose(z) {
  if (!z.ragdollBodies) return;
  for (const b of z.ragdollBodies) {
    if (b.mesh) {
      if (b.mesh.parent) b.mesh.parent.remove(b.mesh);
      /* клоны делят геометрию/материал с оригиналом — НЕ диспозим */
    }
  }
  z.ragdollBodies = null; z.ragdollLinks = null; z.ragdollByKey = null;
}

function updateLimbDebris(dt, world, game) {
  for (let i = ZOMBIE_LIMB_DEBRIS.length - 1; i >= 0; i--) {
    const b = ZOMBIE_LIMB_DEBRIS[i];
    b.life -= dt;
    if (b.life <= 0) {
      if (b.mesh.parent) b.mesh.parent.remove(b.mesh);
      ZOMBIE_LIMB_DEBRIS.splice(i, 1);
      continue;
    }
    b.vel.y -= 20 * dt;
    const p = b.mesh.position;
    p.x += b.vel.x * dt; p.y += b.vel.y * dt; p.z += b.vel.z * dt;
    /* СТЕНЫ: отскакиваем от блоков, чтобы конечность не проходила сквозь текстуры */
    if (world && world.query) {
      const rad = .18;
      const bb = AABB(p.x - rad, p.y - rad, p.z - rad, p.x + rad, p.y + rad, p.z + rad);
      const ls = world.query(bb, _ragQuery);
      for (let i = 0; i < _ragQuery.length; i++) {
        const box = _ragQuery[i];
        if (p.y + rad <= box.minY || p.y - rad >= box.maxY) continue;
        const cx = U.clamp(p.x, box.minX, box.maxX);
        const cz = U.clamp(p.z, box.minZ, box.maxZ);
        let dx = p.x - cx, dz = p.z - cz;
        let d2 = dx * dx + dz * dz;
        if (d2 >= rad * rad) continue;
        let d = Math.sqrt(d2) || .0001;
        if (d2 < 1e-8) { dx = 1; dz = 0; d = 1; }
        const push = rad - d;
        p.x += (dx / d) * push; p.z += (dz / d) * push;
        b.vel.x *= -.35; b.vel.z *= -.35;
      }
    }
    let gy = 0;
    if (world && world.groundAt) gy = world.groundAt(p.x, p.z, p.y + 1) || 0;
    if (p.y <= gy) {
      p.y = gy + .06;
      if (Math.abs(b.vel.y) > 1.5) { b.vel.y *= -.35; b.vel.x *= .6; b.vel.z *= .6; }
      else { b.vel.y = 0; b.vel.x *= .82; b.vel.z *= .82; b.grounded = true; }
      b.spin.x *= .6; b.spin.y *= .6; b.spin.z *= .6;
    }
    b.mesh.rotation.x += b.spin.x * dt;
    b.mesh.rotation.y += b.spin.y * dt;
    b.mesh.rotation.z += b.spin.z * dt;
    /* КРОВАВЫЙ СЛЕД: пока конечность летит — брызги и лужа под ней */
    if (game && game.effects) {
      if (!b.grounded) {
        b.bloodT -= dt;
        if (b.bloodT <= 0) { b.bloodT = .04; game.effects.particle(p.x, p.y, p.z, U.rand(-1, 1), U.rand(0, 1.2), U.rand(-1, 1), U.rand(.05, .12), 'blood', U.rand(.3, .6)); }
      } else if (b.bloodT < 3.0) {
        b.bloodT = 3.0 + 0.5;   // поставить один раз лужу
        game.effects.decal(p.x, .02, p.z, 0, -1, 0, U.rand(.6, 1.2), 'blood');
      }
    }
    if (b.life < 1.0) b.mesh.scale.multiplyScalar(1 - dt * 1.0);
  }
}

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

  /* ФИНАЛЬНЫЙ БОСС «МОЗГ»: своя модель (гигантский мозг с глазом). */
  if (ZOMBIES[type] && ZOMBIES[type].brain && typeof BrainBoss !== 'undefined') {
    return BrainBoss.buildModel();
  }

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
  } else if (type === 'bomber') {
    /* ПОДРЫВНИК: обмотанный взрывчаткой — красные шашки и мигающий фитиль */
    chest.scale.set(1.15, 1.1, 1.2);
    pelvis.scale.set(1.1, 1.02, 1.1);
    const crateMat = new THREE.MeshLambertMaterial({ color: 0x3a2018 });
    const stickMat = new THREE.MeshLambertMaterial({ color: 0xd23a1a, emissive: 0x3a0800 });
    // пояс шашек вокруг торса
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2;
      const st = new THREE.Mesh(new THREE.BoxGeometry(.09, .26, .09), stickMat);
      st.position.set(Math.cos(a) * .30, .10, Math.sin(a) * .20 - .02);
      st.rotation.z = Math.cos(a) * .3; st.rotation.x = Math.sin(a) * .3;
      torso.add(st);
    }
    // большая бомба на груди с мигающим огоньком
    const bomb = new THREE.Mesh(new THREE.SphereGeometry(.20, 10, 8), crateMat);
    bomb.position.set(0, .14, -.20); bomb.scale.set(1, 1.15, 1); torso.add(bomb);
    const fuseLamp = new THREE.Mesh(new THREE.SphereGeometry(.06, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xff3020 }));
    fuseLamp.position.set(0, .38, -.20); torso.add(fuseLamp);
    parts.fuseLamp = fuseLamp;
    // красные глаза
    const eyeMatB = new THREE.MeshBasicMaterial({ color: 0xff3a1a });
    [-.08, .08].forEach(ox => {
      const e = new THREE.Mesh(new THREE.SphereGeometry(.04, 6, 5), eyeMatB);
      e.position.set(ox, .04, -.155); head.add(e);
    });
  } else if (ZOMBIES[type] && ZOMBIES[type].miniBoss && type !== 'robot') {
    /* ============================================================
       НОВЫЕ МИНИ-БОССЫ (5) — у каждого своя моделька, «кожа» и силуэт,
       чтобы издалека читалось, кто именно идёт. Сила растёт по списку.
       ============================================================ */
    const glowMat = (c) => new THREE.MeshBasicMaterial({ color: c });
    const eyePair = (c, ox, oy, oz, r) => {
      const m = new THREE.MeshBasicMaterial({ color: c });
      [-1, 1].forEach(s => {
        const e = new THREE.Mesh(new THREE.SphereGeometry(r || .045, 8, 6), m);
        e.position.set(ox * s, oy, oz); head.add(e);
      });
    };
    // все мини-боссы заметно крупнее обычного зомби
    chest.scale.set(1.35, 1.12, 1.3);
    pelvis.scale.set(1.25, 1.05, 1.2);
    armL.scale.set(1.45, 1.12, 1.45); armR.scale.set(1.45, 1.12, 1.45);
    legL.scale.set(1.3, 1.05, 1.3); legR.scale.set(1.3, 1.05, 1.3);
    skull.scale.set(1.18, 1.08, 1.18);

    if (type === 'stalker') {
      /* СТАЛКЕР — тощий, закованный в лёгкую броню охотник: капюшон,
         зелёные глаза-щели и два кривых клинка на предплечьях. */
      const HIDE = 0x3f4a30, PLATE = 0x59643f, GLOW = 0x9bff57;
      chest.material = new THREE.MeshLambertMaterial({ color: HIDE });
      pelvis.material = new THREE.MeshLambertMaterial({ color: 0x2b331f });
      skull.material = new THREE.MeshLambertMaterial({ color: PLATE });
      // капюшон
      const hood = new THREE.Mesh(new THREE.ConeGeometry(.34, .55, 7, 1, true),
        new THREE.MeshLambertMaterial({ color: HIDE, side: THREE.DoubleSide }));
      hood.position.set(0, 1.70, .04); hood.rotation.x = -.18; g.add(hood);
      // наплечники
      [-1, 1].forEach(s => addBossBox(g, .30, .18, .34, PLATE, s * .48, 1.60, 0));
      // клинки на предплечьях
      [-1, 1].forEach(s => {
        const blade = new THREE.Mesh(new THREE.ConeGeometry(.055, .78, 4), new THREE.MeshLambertMaterial({ color: 0xcfd8b0 }));
        blade.position.set(s * .40, 1.02, -.46); blade.rotation.x = -1.35;
        g.add(blade);
      });
      eyePair(GLOW, .07, .04, -.155, .04);
      const lamp = new THREE.PointLight(GLOW, 3, 6, 2); lamp.position.set(0, 1.5, 0); g.add(lamp);
    } else if (type === 'spider') {
      /* ПАУК-МАТКА — паучиха: 6 дополнительных лап и светящийся кокон
         с яйцами на спине, плюющиеся железы. */
      const CHITIN = 0x4a2140, SAC = 0xff4a8a;
      chest.material = new THREE.MeshLambertMaterial({ color: CHITIN });
      pelvis.material = new THREE.MeshLambertMaterial({ color: 0x341428 });
      skull.material = new THREE.MeshLambertMaterial({ color: 0x5a2a4a });
      // лапы
      const legMat = new THREE.MeshLambertMaterial({ color: 0x2c1024 });
      for (let i = 0; i < 3; i++) {
        [-1, 1].forEach(s => {
          const hip = new THREE.Group();
          hip.position.set(s * .30, 1.10, -.05 + i * .18);
          const upper = new THREE.Mesh(new THREE.CylinderGeometry(.05, .04, .70, 6), legMat);
          upper.position.set(s * .30, -.10, 0); upper.rotation.z = s * -.95;
          const lower = new THREE.Mesh(new THREE.CylinderGeometry(.04, .025, .62, 6), legMat);
          lower.position.set(s * .62, -.42, 0); lower.rotation.z = s * .55;
          hip.add(upper); hip.add(lower);
          g.add(hip);
        });
      }
      // кокон с яйцами
      const sac = new THREE.Mesh(new THREE.SphereGeometry(.30, 10, 8),
        new THREE.MeshLambertMaterial({ color: 0x6a2a52, emissive: 0x2a0816 }));
      sac.position.set(0, 1.12, .24); torso.add(sac); parts.eggSac = sac;
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2;
        const egg = new THREE.Mesh(new THREE.SphereGeometry(.06, 6, 5), glowMat(SAC));
        egg.position.set(Math.cos(a) * .18, 1.12 + Math.sin(a) * .16, .24); torso.add(egg);
      }
      // 4 пары глаз
      const em = new THREE.MeshBasicMaterial({ color: 0xff1a5a });
      [-.10, -.03, .03, .10].forEach((ox, i) => {
        const e = new THREE.Mesh(new THREE.SphereGeometry(i % 2 ? .028 : .038, 6, 5), em);
        e.position.set(ox, .06 - (i > 1 ? .06 : 0), -.16); head.add(e);
      });
    } else if (type === 'cryomancer') {
      /* КРИОМАНТ — ледяной маг: кристаллическая броня, посох с осколком
         льда и морозная аура. */
      const ICE = 0x7fd8ff, DEEP = 0x2f5f8f;
      chest.material = new THREE.MeshLambertMaterial({ color: DEEP });
      pelvis.material = new THREE.MeshLambertMaterial({ color: 0x24486b });
      skull.material = new THREE.MeshLambertMaterial({ color: 0x3a6f9e });
      // ледяные шипы на плечах и спине
      [-1, 1].forEach(s => {
        for (let i = 0; i < 3; i++) {
          const shard = new THREE.Mesh(new THREE.ConeGeometry(.08, .42 + i * .12, 4),
            new THREE.MeshLambertMaterial({ color: ICE, emissive: 0x0a2a40 }));
          shard.position.set(s * (.42 + i * .06), 1.66 + i * .05, .02);
          shard.rotation.z = s * -.5; g.add(shard);
        }
      });
      // нагрудный кристалл
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(.20, 0), glowMat(ICE));
      gem.position.set(0, .18, -.20); torso.add(gem); parts.gem = gem;
      // посох
      const staff = new THREE.Group();
      staff.add(mkBox(.07, 1.9, .07, 0x2a4a6a, 0, 0, 0));
      const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(.20, 0), glowMat(0xbfefff));
      orb.position.y = 1.0; staff.add(orb);
      staff.position.set(-1.0, 1.05, .10); g.add(staff); parts.staff = staff;
      eyePair(ICE, .075, .04, -.155, .045);
      const lamp = new THREE.PointLight(ICE, 4, 8, 2); lamp.position.set(0, 1.3, 0); g.add(lamp);
    } else if (type === 'devourer') {
      /* ПОЖИРАТЕЛЬ ПЛОТИ — груда мышц с двумя пастями, костяными шипами
         и кровавым ореолом. */
      const FLESH = 0x7a1020, MUSCLE = 0xb03040, BONE = 0xe8dcc8;
      chest.material = new THREE.MeshLambertMaterial({ color: FLESH });
      pelvis.material = new THREE.MeshLambertMaterial({ color: 0x5a0c18 });
      skull.material = new THREE.MeshLambertMaterial({ color: MUSCLE });
      // бугры мышц
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2;
        const lump = new THREE.Mesh(new THREE.SphereGeometry(U.rand(.14, .22), 7, 6),
          new THREE.MeshLambertMaterial({ color: MUSCLE }));
        lump.position.set(Math.cos(a) * .30, .16 + Math.sin(a) * .26, Math.sin(a) * .16 - .12);
        torso.add(lump);
      }
      // нижняя пасть на животе
      const maw = new THREE.Group();
      maw.add(mkBox(.60, .30, .12, 0x1a0508, 0, 0, -.20));
      for (let i = 0; i < 6; i++) {
        const t = new THREE.Mesh(new THREE.ConeGeometry(.05, .15, 4), glowMat(BONE));
        t.position.set(-.25 + i * .10, .13, -.22); t.rotation.x = Math.PI; maw.add(t);
        const t2 = new THREE.Mesh(new THREE.ConeGeometry(.05, .15, 4), glowMat(BONE));
        t2.position.set(-.25 + i * .10, -.13, -.22); maw.add(t2);
      }
      maw.position.set(0, -.30, 0); torso.add(maw); parts.maw = maw;
      // костяные шипы на спине
      for (let i = 0; i < 5; i++) {
        const sp = new THREE.Mesh(new THREE.ConeGeometry(.07, .38 - i * .03, 4),
          new THREE.MeshLambertMaterial({ color: BONE }));
        sp.position.set(0, 1.72 - i * .14, .18); sp.rotation.x = -.5; g.add(sp);
      }
      eyePair(0xff3020, .085, .04, -.16, .05);
      // кровавый ореол
      const halo = new THREE.Mesh(new THREE.TorusGeometry(.55, .04, 6, 20),
        new THREE.MeshBasicMaterial({ color: 0xff2a2a, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false }));
      halo.rotation.x = Math.PI / 2; halo.position.y = 1.05; g.add(halo); parts.bloodHalo = halo;
    } else if (type === 'titanMini') {
      /* ТИТАН-МИНИ — уменьшенный каменный титан: глыбы, магма и кулаки-молоты
         (отличается от робота и старшего Титана). */
      const ROCK = 0x5a4a42, ROCK2 = 0x3e332d, MAGMA = 0xff7a2a;
      chest.material = new THREE.MeshLambertMaterial({ color: ROCK });
      pelvis.material = new THREE.MeshLambertMaterial({ color: ROCK2 });
      skull.material = new THREE.MeshLambertMaterial({ color: ROCK });
      // каменные наплечники
      [-1, 1].forEach(s => {
        const b = new THREE.Mesh(new THREE.DodecahedronGeometry(.38, 0), new THREE.MeshLambertMaterial({ color: ROCK2 }));
        b.position.set(s * .58, 1.62, 0); g.add(b);
      });
      // трещины магмы
      for (let i = 0; i < 4; i++) {
        const crack = mkBox(.62 - i * .09, .05, .04, MAGMA, U.rand(-.1, .1), 1.5 - i * .17, -.19);
        crack.rotation.z = U.rand(-.3, .3); g.add(crack);
      }
      // кулаки-молоты
      [-1, 1].forEach(s => {
        const fist = new THREE.Mesh(new THREE.DodecahedronGeometry(.24, 0), new THREE.MeshLambertMaterial({ color: ROCK2 }));
        fist.position.set(s * .40, .60, -.10); g.add(fist);
      });
      eyePair(MAGMA, .09, .04, -.16, .05);
      const core = new THREE.Mesh(new THREE.SphereGeometry(.22, 10, 8), glowMat(0xffb060));
      core.position.set(0, 1.15, -.24); torso.add(core);
    }

    /* общая аура мини-босса: кольца у ног + цветная подсветка */
    if (ZOMBIES[type].aura) {
      const arcC = ZOMBIES[type].aura;
      const aura = new THREE.Group();
      const mkRing = (r, tube, op) => {
        const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 6, 26),
          new THREE.MeshBasicMaterial({ color: arcC, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false }));
        m.rotation.x = Math.PI / 2; return m;
      };
      aura.add(mkRing(.85, .04, .5));
      const r2 = mkRing(1.15, .026, .32); r2.position.y = .05; aura.add(r2);
      aura.position.y = .10; g.add(aura);
      parts.aura = aura; parts.auraRing2 = r2;
    }
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
    this.isBoss = !!S.boss;
    this.isMiniBoss = !!S.miniBoss;
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
    /* «ПРОЛОМ»: зомби бьёт препятствие перед собой и ломает его. Кулдаун —
       чтобы не бить каждый кадр; разные типы ломают с разной силой. */
    this.breakCd = U.rand(.15, .6);
    this.breakPower = S.breakPower !== undefined ? S.breakPower : 1;
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
    /* способности мини-боссов */
    this.abilityCd = this.def.abilities ? U.rand(2, 5) : 0;
    this.abilityTimer = 0;

    this.group = buildZombieMesh(type);
    this.group.scale.setScalar(this.scale);
    this.parts = this.group.userData.parts;

    /* ---- УЛЬТРА: раны на конечностях, отрыв конечностей, рэгдолл ---- */
    this.wounds = [];              // { part, mesh, life }
    this.severed = { armL: false, armR: false, legL: false, legR: false, head: false };
    this.ragdoll = null;           // физика тела после смерти (ультра)
  }

  /* local-space hitboxes (scaled) */
  hitboxDefs() {
    const s = this.scale;
    /* МОЗГ: единственная уязвимая точка — ГЛАЗ (когда открыт). Остальное —
       тело, по которому урон не проходит (см. BrainBoss.onBossDamage). */
    if (this.def && this.def.brain) {
      return [
        { part: 'eye',  cx: 0, cy: 2.5 * s, cz: 1.85 * s, hw: .85 * s, hh: .85 * s, hd: .55 * s },
        { part: 'body', cx: 0, cy: 2.6 * s, cz: 0, hw: 2.6 * s, hh: 2.6 * s, hd: 2.4 * s }
      ];
    }
    const sev = this.severed || {};
    const out = [
      { part: 'head', cx: 0, cy: 1.52 * s, cz: 0, hw: .17 * s, hh: .17 * s, hd: .17 * s },
      { part: 'body', cx: 0, cy: 1.02 * s, cz: 0, hw: .29 * s, hh: .34 * s, hd: .17 * s }
    ];
    if (!sev.armL) out.push({ part: 'armL', cx: -.35 * s, cy: 1.01 * s, cz: 0, hw: .11 * s, hh: .37 * s, hd: .11 * s });
    if (!sev.armR) out.push({ part: 'armR', cx:  .35 * s, cy: 1.01 * s, cz: 0, hw: .11 * s, hh: .37 * s, hd: .11 * s });
    if (!sev.legL) out.push({ part: 'legL', cx: -.14 * s, cy: .44 * s, cz: 0, hw: .13 * s, hh: .42 * s, hd: .13 * s });
    if (!sev.legR) out.push({ part: 'legR', cx:  .14 * s, cy: .44 * s, cz: 0, hw: .13 * s, hh: .42 * s, hd: .13 * s });
    /* если обе ноги оторваны — тело всё ещё можно бить (общий хитбокс таза) */
    if (sev.legL && sev.legR) out.push({ part: 'legs', cx: 0, cy: .42 * s, cz: 0, hw: .25 * s, hh: .30 * s, hd: .13 * s });
    return out;
  }

  /* УЛЬТРА: попадание в живую конечность — отметина-рана */
  addWound(partName) {
    if (!zombieUltra()) return;
    const pivot = this.parts[partName];
    if (!pivot || this.severed[partName]) return;
    this._wounds = this._wounds || 0;
    if (this._wounds >= 12) return;
    this._wounds++;
    if (!_woundGeo) _woundGeo = new THREE.PlaneGeometry(1, 1);
    const q = new THREE.Mesh(_woundGeo, zombieWoundMat());
    q.userData.sharedGeo = true;   // общая геометрия/материал — не диспозить индивидуально
    q.userData.sharedMat = true;
    const sz = .16 * (this.scale || 1);
    q.scale.setScalar(sz * U.rand(.8, 1.4));
    q.position.set(U.rand(-.09, .09), -U.rand(.18, .62), -.085);
    q.rotation.set(U.rand(0, 3), U.rand(0, 3), U.rand(0, 3));
    pivot.add(q);
    (this.wounds || (this.wounds = [])).push(q);
  }

  /* УЛЬТРА: шанс ОТОРВАТЬ конечность и швырнуть её как обломок */
  maybeSever(partName, fromDir) {
    if (!zombieUltra()) return false;
    if (this.severed[partName]) return false;
    const pivot = this.parts[partName];
    if (!pivot) return false;
    this.severed[partName] = true;
    /* мировая трансформация отрываемой конечности */
    pivot.updateWorldMatrix(true, false);
    const wp = new THREE.Vector3(), wq = new THREE.Quaternion(), ws = new THREE.Vector3();
    pivot.matrixWorld.decompose(wp, wq, ws);
    this.group.remove(pivot);
    pivot.position.copy(wp); pivot.quaternion.copy(wq); pivot.scale.copy(ws);
    const scene = this.group.parent;
    spawnLimbDebris(scene, pivot, fromDir);
    /* брызги крови на месте отрыва */
    const gm = this.game;
    if (gm && gm.effects) {
      gm.effects.bloodBurst({ x: wp.x, y: wp.y, z: wp.z }, fromDir || { x: 0, y: 0, z: 0 }, 18);
      gm.effects.bloodBurst({ x: wp.x, y: wp.y - .3, z: wp.z }, fromDir || { x: 0, y: 0, z: 0 }, 12);
    }
    return true;
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
    /* МОЗГ-ПОЖИРАТЕЛЬ: урон проходит только в ОТКРЫТЫЙ ГЛАЗ. Пока глаз закрыт
       (фаза колб) — урон не наносится вовсе. */
    if (this.def && this.def.brain && typeof BrainBoss !== 'undefined') {
      const eff = BrainBoss.onBossDamage(this, amount, part, fromDir);
      if (eff <= 0) { this.hitFlash = .12; return false; }
      amount = eff;
      if (part !== 'eye') { this.hitFlash = .12; return false; }
    }
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
    else if (part === 'legs' || part === 'legL' || part === 'legR') mul = CFG.limbMultiplier;
    let dmg = amount * mul * (this.dmgTakenMul || 1);
    if (fromDir && (fromDir.x || fromDir.z || fromDir.y)) this._lastHitDir = { x: fromDir.x, y: fromDir.y || 0, z: fromDir.z };
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
    /* ---- УЛЬТРА: отметина-рана на конечности + шанс оторвать её ---- */
    const limb = (part === 'armL' || part === 'armR' || part === 'legL' || part === 'legR');
    if (zombieUltra() && limb && !this.severed[part]) {
      this.addWound(part);
      /* шанс отрыва: выше у конечностей с малым остатком HP и у сильных выстрелов */
      const hpFrac = Math.max(0, this.health / Math.max(1, this.maxHealth));
      let chance = .12 + (1 - hpFrac) * .30 + Math.min(.18, dmg / Math.max(1, this.maxHealth) * .25);
      if (fromDir && (fromDir.x || fromDir.z)) chance += .05;
      if (this.isBoss || this.isMiniBoss) chance *= .35;      // боссы почти не теряют конечности
      if (dmg >= this.health) chance = Math.max(chance, .85); // смертельный выстрел в конечность
      if (Math.random() < chance) this.maybeSever(part, fromDir);
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
    /* ---- УЛЬТРА: РЭГДОЛЛ — тело распадается на независимые куски (торс,
       голова, руки, ноги), каждый со своей физикой и коллизиями ---- */
    if (zombieUltra() && !this.ragdollBodies) {
      this._ragDeathDir = this._lastHitDir || { x: U.rand(-1, 1), y: 0, z: U.rand(-1, 1) };
      try { ragdollStart(this, this._ragDeathDir); } catch (e) { }
    }
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
      /* УЛЬТРА: РЭГДОЛЛ — независимые куски тела с физикой и коллизиями */
      if (this.ragdollBodies) {
        ragdollUpdate(this, dt, ctx && ctx.world);
        /* затухание: через 3с куски съёживаются и исчезают */
        const fade = U.clamp(1 - (this.deadT - 3.2) / 1.0, 0, 1);
        if (this.deadT > 3.0) {
          for (const b of this.ragdollBodies) if (b.mesh) b.mesh.scale.setScalar(U.clamp(fade, .01, 1));
        }
        return;
      }
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

    /* МОЗГ-ПОЖИРАТЕЛЬ: босс стоит на месте (атаки и фазы — в BrainBoss.update),
       только дышит и поворачивается. Движение/мили отключены. */
    if (this.def && this.def.brain && typeof BrainBoss !== 'undefined' && BrainBoss.active) {
      this.attackCd = Math.max(0, this.attackCd - dt);
      this.hitFlash = Math.max(0, this.hitFlash - dt);
      this.applyVisual(dt, 0);
      return;
    }

    this.attackCd = Math.max(0, this.attackCd - dt);
    this.staggerT = Math.max(0, this.staggerT - dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    if (this.shootCd > 0) this.shootCd -= dt;

    /* КРОМЕР: ПОДЖОГ — зомби горит и теряет здоровье со временем */
    if (this.burnT > 0 && !this.dying) {
      this.burnT -= dt;
      const bd = (this.burnDps || 0) * dt;
      if (bd > 0) {
        this.health -= bd;
        this._burnAcc = (this._burnAcc || 0) + bd;
        const gm = this.game || (ctx && ctx.game);
        if (this._burnAcc >= 25) {
          this._burnAcc = 0; this.hitFlash = .1;
          if (gm && gm.effects) gm.effects.particle(this.pos.x, this.pos.y + 1.2, this.pos.z, U.rand(-.4, .4), U.rand(1, 2), U.rand(-.4, .4), .18, 'spark', .3);
        }
        if (this.health <= 0) { this.die(false); return; }
      }
    }

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
    /* ПОДРЫВНИК: мигает чаще, когда игрок рядом (визуальный отсчёт) */
    if (this.def.explosive) this._fuseNear = U.clamp(1 - distXZ / 10, 0, 1);

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
      /* ПОДРЫВНИК: дойдя до игрока, не бьёт, а ДЕТОНИРУЕТ */
      if (this.def.explosive) { this.breakCd = 0; this.die(false); }
      else {
        this.attackCd = 1.15;
        this.attackT = .38;
        this.pendingHit = true;
      }
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
    const blockedBy = ctx.world.overlaps(nx, gy + .05, nz, this.radius * .92, this.height * .8);
    if (!canStep || blockedBy) {
      /* ЗОМБИ ИДЁТ НАПРОЛОМ: упёрся в препятствие — сразу начинает его ломать
         (не стоит и не «жуёт» вечно). Урон зависит от силы зомби. */
      this.smashAhead(ctx, dirX, dirZ, dt);
      // wall or too-tall step → try sliding along each axis
      const gyX = ctx.world.groundAt(this.pos.x + moveX * dt, this.pos.z, this.pos.y + 2.6);
      const gyZ = ctx.world.groundAt(this.pos.x, this.pos.z + moveZ * dt, this.pos.y + 2.6);
      const okX = (gyX - this.pos.y) < 1.25 && !ctx.world.overlaps(this.pos.x + moveX * dt, gyX + .05, this.pos.z, this.radius * .92, this.height * .8);
      const okZ = (gyZ - this.pos.y) < 1.25 && !ctx.world.overlaps(this.pos.x, gyZ + .05, this.pos.z + moveZ * dt, this.radius * .92, this.height * .8);
      if (okX) { nx = this.pos.x + moveX * dt; nz = this.pos.z; stepY = gyX; this.stuckT = Math.max(0, this.stuckT - dt); }
      else if (okZ) { nx = this.pos.x; nz = this.pos.z + moveZ * dt; stepY = gyZ; this.stuckT = Math.max(0, this.stuckT - dt); }
      else { nx = this.pos.x; nz = this.pos.z; stepY = this.pos.y; this.stuckT += dt; }
    } else this.stuckT = Math.max(0, this.stuckT - dt * .5);

    if (this.stuckT > 1.0) {
      // nudge sideways to escape a corner
      const side = (this.id % 2 ? 1 : -1);
      nx += -dirZ * side * speed * dt * 1.4;
      nz += dirX * side * speed * dt * 1.4;
      this.stuckT = .6;
      // ещё раз бьёт препятствие (страховка в углу)
      this.smashAhead(ctx, dirX, dirZ, dt);
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

  /* ЗОМБИ ЛОМАЕТ ПРЕПЯТСТВИЕ ПЕРЕД СОБОЙ. Бьёт разрушаемые чанки в конусе по
     направлению движения — так зомби не «жуёт» стену, а активно проламывает
     укрытия и идёт напролом. Урон масштабируется силой типа зомби. */
  smashAhead(ctx, dirX, dirZ, dt) {
    /* ПОДРЫВНИК при ударе в стену НЕ бьёт её вручную, а ДЕТОНИРУЕТ — взрыв
       сносит препятствие и он погибает (см. bomberExplode в Game). Детонация
       НЕ зависит от кулдауна. */
    if (this.def.explosive) {
      if (this.dying || !this.alive) return;
      this.die(false);
      return;
    }
    if (this.breakCd > 0) { this.breakCd -= dt; return; }
    if (typeof damageMapAt !== 'function') return;
    this.breakCd = .34;
    const reach = this.radius + .75 + .22 * this.scale;
    const fx = this.pos.x + dirX * reach;
    const fz = this.pos.z + dirZ * reach;
    const cy = this.pos.y + this.height * .5;
    /* урон = прочность обычной части (~1.3³·26 ≈ 57) / 1.4 → любой блок ломается
       с 1-2 ударов; крупные куски — чуть дольше. Боссы ломают быстрее. */
    const base = Math.max(22, this.dmg * 2.4) * (this.breakPower || 1);
    const broken = damageMapAt(fx, cy, fz, Math.max(1.2, this.radius + .7), base);
    if (broken && this.game && this.game.effects) {
      try { this.game.effects.debrisBurst(fx, cy, fz, 0xb8b2a6, .8, null, 3); } catch (e) { }
    }
    return broken;
  }

  /* КЛИЕНТ в коопе: зомби двигает хост (позиция приходит снапшотами), но
     локально нужно проигрывать анимацию, обрабатывать смерть и АТАКУ по
     местному игроку — иначе зомби «замирают» и не наносят урон. */
  remoteVisualTick(dt, player) {
    if (this.dying) {
      this.deadT += dt;
      /* УЛЬТРА: рэгдолл (клиент видит так же, как хост) */
      if (this.ragdollBodies) {
        ragdollUpdate(this, dt, Game && Game.world);
        const fade = U.clamp(1 - (this.deadT - 3.2) / 1.0, 0, 1);
        if (this.deadT > 3.0) {
          for (const b of this.ragdollBodies) if (b.mesh) b.mesh.scale.setScalar(U.clamp(fade, .01, 1));
        }
        return;
      }
      const k = U.clamp(this.deadT * this.fallSpeed, 0, 1);
      const fall = Math.sin(k * Math.PI * .5);
      this.group.rotation.x = -fall * Math.PI * .5 * (this.fallDir >= 0 ? 1 : -1);
      this.group.rotation.z = fall * .35 * this.fallDir;
      const fade = U.clamp(1 - (this.deadT - 3.2) / 1.0, 0, 1);
      if (this.deadT > 3.0) this.group.scale.setScalar(this.scale * U.clamp(fade, .01, 1));
      return;
    }
    if (!this.alive) return;
    this.attackCd = Math.max(0, this.attackCd - dt);
    this.staggerT = Math.max(0, this.staggerT - dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    // смотрим на игрока (визуально)
    const toP = { x: player.pos.x - this.pos.x, y: player.pos.y - this.pos.y, z: player.pos.z - this.pos.z };
    const distXZ = Math.hypot(toP.x, toP.z);
    // анимация ходьбы всегда — зомби «дышат» и машут руками
    const moveSpeed = this._netMoved ? Math.min(6, this._netMoved / Math.max(dt, .001)) : 1.2;
    this.applyVisual(dt, moveSpeed);
    // локальная АТАКА по местному игроку
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
    }
    if (this.growlCd !== undefined) {
      this.growlCd -= dt;
      if (this.growlCd <= 0) { this.growlCd = U.rand(4, 13); if (distXZ < 30) Bus.emit('zombieGrowl', this); }
    }
  }

  applyVisual(dt, moveSpeed) {
    const p = this.parts;
    /* МОЗГ: своя модель без стандартных конечностей — своя анимация. */
    if (this.def && this.def.brain) {
      this.group.position.set(this.pos.x, this.pos.y, this.pos.z);
      this.group.rotation.y = this.yaw;
      return;
    }
    const bob = moveSpeed > .1 ? moveSpeed / Math.max(this.speed, .01) : 0;
    this.walkPhase += dt * (2.6 + bob * 5.5);
    const ph = this.walkPhase;
    const amp = .55 * bob;
    const stagger = this.staggerT > 0 ? this.staggerT * 2.2 : 0;

    /* оторванные конечности не анимируем */
    const sev = this.severed || {};
    if (!sev.legL) p.legL.rotation.x = Math.sin(ph) * amp;
    if (!sev.legR) p.legR.rotation.x = -Math.sin(ph) * amp;
    // arms reaching forward (classic zombie). A limb hangs DOWN from its pivot,
    // so a POSITIVE rotation.x swings it forward (-Z, the way the zombie faces);
    // a negative value would point the arms behind its back.
    const reach = this.type === 'runner' ? 1.15 : 1.5;
    if (!sev.armL) p.armL.rotation.x = reach + Math.sin(ph + 1) * amp * .8 + stagger * U.rand(0, 1);
    if (!sev.armR) p.armR.rotation.x = reach + Math.sin(ph + 2.2) * amp * .8;
    if (!sev.armL) p.armL.rotation.z = .12;
    if (!sev.armR) p.armR.rotation.z = -.12;
    // attack lunge
    if (this.attackT > 0) {
      const k = 1 - Math.abs(this.attackT / .38 - .5) * 2;
      if (!sev.armL) p.armL.rotation.x = reach + k * .9;
      if (!sev.armR) p.armR.rotation.x = reach + k * .9;
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
    /* ПОДРЫВНИК: фитиль мигает всё быстрее по мере приближения (чем ближе — тем чаще) */
    if (p.fuseLamp) {
      const near = this._fuseNear || 0;
      const rate = 1.8 + near * 6;
      this._fuseT = (this._fuseT || 0) + dt * rate;
      const on = Math.sin(this._fuseT * Math.PI * 2) > 0;
      p.fuseLamp.material.color.setHex(on ? 0xff4020 : 0x601000);
      p.fuseLamp.scale.setScalar(on ? 1.3 : .8);
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
    this.group.traverse(o => {
      if (o.userData && (o.userData.sharedGeo || o.userData.sharedMat)) return;  // общие ресурсы ран
      if (o.geometry) o.geometry.dispose();
    });
    /* убрать куски рэгдолла (клоны делят ресурсы с оригиналом — не диспозим) */
    if (typeof ragdollDispose === 'function') ragdollDispose(this);
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
    const pl = this.game && this.game.player;    const pyaw = pl ? pl.yaw : 0;
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

  update(dt, player, extraPlayers) {
    this.flow.update(dt, player.pos.x, player.pos.z);
    this.bucketize();
    const ctx = { player, world: this.world, flow: this.flow, neighbors: null, horde: this };
    /* ---- LOD / CULLING ----
       Only the zombies the player can actually perceive are simulated and
       animated every frame: near ones in full, far ones at a reduced rate
       (their motion is imperceptible), and ones beyond the cull distance are
       hidden entirely — the renderer then skips them. This keeps big hordes
       (ОРДА ×10) cheap without changing what the player sees. */
    const p = player.pos;
    const extra = (extraPlayers && extraPlayers.length) ? extraPlayers : null;
    const nearD2 = CFG.zombieNearDist * CFG.zombieNearDist;
    const cullD2 = CFG.zombieCullDist * CFG.zombieCullDist;
    this._lodAcc = (this._lodAcc || 0) + dt;
    const farTick = this._lodAcc >= CFG.zombieFarInterval;
    if (farTick) this._lodAcc = 0;
    for (let i = 0; i < this.list.length; i++) {
      const z = this.list[i];
      if (z.remoteDriven) {
        /* КЛИЕНТ в коопе: позицию задаёт хост (интерполяция), но анимацию,
           обработку смерти и АТАКИ по игроку считаем локально — иначе зомби
           «стоят без анимации» и не могут убить клиента. */
        z.remoteVisualTick(dt, player);
        continue;
      }
      const dx = z.pos.x - p.x, dz = z.pos.z - p.z;
      const d2 = dx * dx + dz * dz;
      const visible = d2 <= cullD2 || z.isTarget || (z.isBoss || z.isMiniBoss);
      /* В РЭГДОЛЛЕ исходная модель скрыта (её заменили куски) — не показываем */
      if (z.group && !z.ragdollBodies) z.group.visible = visible;
      if (!visible) continue;                 // hidden: skip simulation entirely
      if (d2 > nearD2 && !farTick) continue;  // distant: update only every few frames
      /* В КООПЕ зомби охотятся на БЛИЖАЙШЕГО игрока (хост или клиента) */
      if (extra) {
        let best = player, bd = d2;
        for (let e = 0; e < extra.length; e++) {
          const rp = extra[e];
          if (!rp || !rp.alive) continue;
          const ex = rp.pos.x - z.pos.x, ez = rp.pos.z - z.pos.z;
          const ed = ex * ex + ez * ez;
          if (ed < bd) { bd = ed; best = rp; }
        }
        ctx.player = best;
        z.targetRemote = (best !== player);      // цель — удалённый игрок?
      } else { ctx.player = player; z.targetRemote = false; }
      ctx.neighbors = this.nearby(z);
      z.game = this.game;
      z.update(dt * (d2 > nearD2 ? CFG.zombieFarInterval : 1), ctx);
    }
    // reap
    for (let i = this.list.length - 1; i >= 0; i--) {
      const z = this.list[i];
      // practice targets respawn instead of being removed; the range owns them
      if (z.isTarget) continue;
      if (z.dying && z.deadT > 4.2) { z.dispose(this.scene); this.list.splice(i, 1); }
    }
    /* УЛЬТРА: физика оторванных конечностей (общие обломки) */
    if (typeof updateLimbDebris === 'function') updateLimbDebris(dt, this.world, this.game);
  }

  get aliveCount() { let n = 0; for (const z of this.list) if (z.alive && !z.dying) n++; return n; }
  get activeCount() { let n = 0; for (const z of this.list) if (!z.dying) n++; return n; }

  clear() {
    if (typeof BrainBoss !== 'undefined' && BrainBoss.active) BrainBoss.cleanup();
    for (const z of this.list) z.dispose(this.scene);
    this.list.length = 0;
    /* УЛЬТРА: убрать оторванные конечности со сцены */
    if (typeof ZOMBIE_LIMB_DEBRIS !== 'undefined') {
      for (const b of ZOMBIE_LIMB_DEBRIS) { if (b.mesh.parent) b.mesh.parent.remove(b.mesh); }
      ZOMBIE_LIMB_DEBRIS.length = 0;
    }
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
