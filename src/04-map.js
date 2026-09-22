/* ============================================================
   04 — MAP: geometry, lighting, navigation grid + pathfinding
   ============================================================ */

const MAP = {
  size: 104,          // arena is size x size
  wallH: 9,
  ground: 0,
  spawns: [],
  zombieSpawns: [],
  playerSpawns: [],
  nav: null,
  scene: null,
  world: null,
  sites: {}
};

/* ---------------- material cache ---------------- */
let MAT = {};
function buildMaterials() {
  const mk = (canvasKey, rep, color, opts) => {
    opts = opts || {};
    const m = new THREE.MeshLambertMaterial({
      color: color === undefined ? 0xffffff : color,
      side: opts.side || THREE.FrontSide
    });
    if (canvasKey && TEXTURES[canvasKey]) {
      m.map = canvasTexture(TEXTURES[canvasKey], rep, 4);
    }
    m.userData.tex = canvasKey;
    return m;
  };
  MAT = {
    floor:   mk('floor', 1, 0xffffff),
    concrete: mk('concrete', 1, 0xffffff),
    brick:   mk('brick', 1, 0xffffff),
    wood:    mk('wood', 1, 0xffffff),
    metal:   mk('metal', 1, 0xffffff),
    sand:    mk('sand', 1, 0xffffff),
    dark:    new THREE.MeshLambertMaterial({ color: 0x2b2f33 }),
    siteA:   new THREE.MeshBasicMaterial({ map: canvasTexture(TEXTURES.siteA, 1, 4), transparent: true, opacity: .55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
    siteB:   new THREE.MeshBasicMaterial({ map: canvasTexture(TEXTURES.siteB, 1, 4), transparent: true, opacity: .55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })
  };
  // texture scaling per material (world units per repeat) — set by the box builder
  MAT.floor.userData.scale = 8;
  MAT.concrete.userData.scale = 4;
  MAT.brick.userData.scale = 3;
  MAT.wood.userData.scale = 2.2;
  MAT.metal.userData.scale = 3;
  MAT.sand.userData.scale = 1.6;
}

/* Build a box mesh whose texture repeats according to its world size. */
function makeBoxMesh(w, h, d, mat, faceTopMat) {
  const g = new THREE.BoxGeometry(w, h, d);
  let m = mat;
  if (mat.map) {
    const s = mat.userData.scale || 3;
    // clone material so each box gets its own repeat scale (merged via material cache keyed by size bucket)
    const key = mat.userData.tex + ':' + s + ':' + Math.max(1, Math.round(w / s)) + ':' + Math.max(1, Math.round(h / s)) + ':' + Math.max(1, Math.round(d / s));
    if (!MAT._cache) MAT._cache = {};
    m = MAT._cache[key];
    if (!m) {
      m = mat.clone();
      m.map = mat.map.clone();
      m.map.needsUpdate = true;
      m.map.wrapS = m.map.wrapT = THREE.RepeatWrapping;
      m.map.repeat.set(Math.max(1, Math.round(w / s)) / 1 || 1, Math.max(1, Math.round(h / s)) || 1);
      MAT._cache[key] = m;
    }
  }
  const mesh = new THREE.Mesh(g, m);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/* add a solid box: bottom-center anchored at (x,y,z) */
function solid(scene, world, x, y, z, w, h, d, mat, opts) {
  opts = opts || {};
  const aabb = aabbFromBase(x, y, z, w, h, d, opts.tag || 'solid');
  if (!opts.noCollide) world.addBox(aabb);
  if (opts.invisible) return aabb;
  const mesh = makeBoxMesh(w, h, d, mat || MAT.concrete);
  mesh.position.set(x, y + h / 2, z);
  if (opts.rotY) mesh.rotation.y = opts.rotY;
  if (opts.noShadow) { mesh.castShadow = false; }
  scene.add(mesh);
  if (aabb) aabb.mesh = mesh;
  return aabb;
}

/* decorative box (no collision), centered on y */
function decor(scene, x, y, z, w, h, d, mat, rotY) {
  const mesh = makeBoxMesh(w, h, d, mat || MAT.concrete);
  mesh.position.set(x, y + h / 2, z);
  if (rotY) mesh.rotation.y = rotY;
  mesh.castShadow = true; mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

/* ---------------- arena construction ---------------- */
function buildMap(scene, world, quality) {
  MAP.scene = scene; MAP.world = world;
  MAP.playerSpawns = []; MAP.zombieSpawns = [];
  const S = MAP.size, H = MAP.wallH, half = S / 2;

  buildMaterials();

  /* ---------- ground ----------
     The playable surface is a collision box topped at y=0. The visual plane
     sits just above it so bullet holes and blood do not z-fight with the mesh. */
  const groundAABB = solid(scene, world, 0, -2, 0, S + 40, 2, S + 40, MAT.floor, { tag: 'ground' });
  const gpMat = MAT.floor.clone();
  gpMat.map = canvasTexture(TEXTURES.floor, 18, 4);
  const gp = new THREE.Mesh(new THREE.PlaneGeometry(S + 40, S + 40), gpMat);
  gp.rotation.x = -Math.PI / 2;
  gp.position.y = 0.01;
  gp.receiveShadow = true;
  scene.add(gp);

  /* ---------- perimeter walls (with a walkway on top) ---------- */
  const t = 2.5;
  solid(scene, world, 0, 0, -half, S + t, H, t, MAT.concrete, { tag: 'wall' });
  solid(scene, world, 0, 0, half, S + t, H, t, MAT.concrete, { tag: 'wall' });
  solid(scene, world, -half, 0, 0, t, H, S + t, MAT.concrete, { tag: 'wall' });
  solid(scene, world, half, 0, 0, t, H, S + t, MAT.concrete, { tag: 'wall' });

  /* ---------- central raised platform with ramps ---------- */
  const PH = 2.6, PS = 20;
  solid(scene, world, 0, 0, 0, PS, PH, PS, MAT.concrete, { tag: 'plat' });
  // decorative edge trim
  decor(scene, 0, PH, PS / 2 - .3, PS, .35, .6, MAT.dark);
  decor(scene, 0, PH, -PS / 2 + .3, PS, .35, .6, MAT.dark);
  decor(scene, PS / 2 - .3, PH, 0, .6, .35, PS, MAT.dark);
  decor(scene, -PS / 2 + .3, PH, 0, .6, .35, PS, MAT.dark);
  // ramps (stepped so collision is simple and reliable)
  makeRamp(scene, world, 0, PS / 2, 4, PH, 'south');
  makeRamp(scene, world, 0, -PS / 2, 4, PH, 'north');
  makeRamp(scene, world, PS / 2, 0, 4, PH, 'east');
  makeRamp(scene, world, -PS / 2, 0, 4, PH, 'west');
  // platform cover
  solid(scene, world, 0, PH, 0, 3.2, 1.5, 3.2, MAT.metal, { tag: 'cover' });
  solid(scene, world, 6.4, PH, 6.4, 1.8, 2.2, 1.8, MAT.wood, { tag: 'cover' });
  solid(scene, world, -6.4, PH, -6.4, 1.8, 2.2, 1.8, MAT.wood, { tag: 'cover' });

  /* ---------- four corner buildings ---------- */
  const bd = 22;  // building offset
  buildBuilding(scene, world, -bd, -bd, 18, 14, 5.2, 'A');
  buildBuilding(scene, world, bd, bd, 18, 14, 5.2, 'B');
  buildBuilding(scene, world, -bd, bd, 16, 12, 4.6, null);
  buildBuilding(scene, world, bd, -bd, 16, 12, 4.6, null);

  /* ---------- long cover walls (mid lanes) ---------- */
  solid(scene, world, -34, 0, 0, 2, 3.4, 30, MAT.brick, { tag: 'wall' });
  solid(scene, world, 34, 0, 0, 2, 3.4, 30, MAT.brick, { tag: 'wall' });
  solid(scene, world, 0, 0, -34, 30, 3.4, 2, MAT.brick, { tag: 'wall' });
  solid(scene, world, 0, 0, 34, 30, 3.4, 2, MAT.brick, { tag: 'wall' });

  // gaps through the long walls (doorways)
  world.boxes.forEach(b => { }); // (walls above are continuous — open doorways handled by segments instead)
  // carve doorways by adding shorter segments: replace via explicit segments
  // (we instead cut them visually with lintels below)
  doorwayCut(scene, world, -34, 0, 'z', 30, 3.4, 2);
  doorwayCut(scene, world, 34, 0, 'z', 30, 3.4, 2);
  doorwayCut(scene, world, 0, -34, 'x', 30, 3.4, 2);
  doorwayCut(scene, world, 0, 34, 'x', 30, 3.4, 2);

  /* ---------- shipping containers (cover) ---------- */
  const cont = (x, z, rot, len) => {
    len = len || 12;
    const w = 2.9, h = 2.9;
    solid(scene, world, x, 0, z, rot ? w : len, h, rot ? len : w, MAT.metal, { tag: 'cover' });
    // stripes / door lines
    decor(scene, x + (rot ? 0 : len / 2 - .06), h / 2, z + (rot ? len / 2 - .06 : 0), rot ? w + .1 : .12, h, rot ? .12 : w + .1, MAT.dark);
  };
  cont(-14, 32, false, 13); cont(20, -36, true, 11);
  cont(-40, -18, true, 12); cont(38, 16, false, 12);
  cont(-8, -46, false, 10);

  /* ---------- crates & barrels (stackable cover) ---------- */
  const rng = makeRng(90210);
  for (let i = 0; i < 40; i++) {
    const x = (rng() * 2 - 1) * 42, z = (rng() * 2 - 1) * 42;
    if (Math.hypot(x, z) < 15) continue;
    if (world.overlaps(x, .1, z, 1.3, 1.3)) continue;
    const s = .95 + rng() * .35;
    solid(scene, world, x, 0, z, s, s, s, MAT.wood, { tag: 'cover' });
    if (rng() < .45) solid(scene, world, x + s * .1, s, z - s * .1, s * .85, s * .85, s * .85, MAT.wood, { tag: 'cover' });
  }
  for (let i = 0; i < 22; i++) {
    const x = (rng() * 2 - 1) * 44, z = (rng() * 2 - 1) * 44;
    if (Math.hypot(x, z) < 15) continue;
    if (world.overlaps(x, .1, z, 1.1, 1.2)) continue;
    const b = barrelMesh(scene, x, z);
    world.addBox(AABB(x - .48, 0, z - .48, x + .48, 1.15, z + .48, 'cover'));
  }

  /* ---------- sandbag emplacements ---------- */
  const bag = (x, z, len, rot) => {
    for (let i = 0; i < len; i++) {
      const ox = rot ? 0 : (i - len / 2 + .5) * 1.15;
      const oz = rot ? (i - len / 2 + .5) * 1.15 : 0;
      solid(scene, world, x + ox, 0, z + oz, 1.15, .72, 1.15, MAT.sand, { tag: 'cover' });
      if (i % 2 === 0) solid(scene, world, x + ox, .72, z + oz, 1.15, .72, 1.15, MAT.sand, { tag: 'cover' });
    }
  };
  bag(-18, -20, 5, false); bag(18, 20, 5, false);
  bag(-18, 20, 4, false); bag(18, -20, 4, false);
  bag(-44, 8, 6, true); bag(44, -8, 6, true);

  /* ---------- pillars ---------- */
  [[-26, -26], [26, 26], [-26, 26], [26, -26]].forEach(p => {
    solid(scene, world, p[0], 0, p[1], 2.2, 6.5, 2.2, MAT.concrete, { tag: 'cover' });
    solid(scene, world, p[0], 6.5, p[1], 3.2, .5, 3.2, MAT.dark, { tag: 'cover' });
  });

  /* ---------- watchtower (verticality) ---------- */
  buildTower(scene, world, 0, -44);

  /* ---------- bomb site markers (decorative, CS flavour) ---------- */
  const siteMesh = (mat, x, z, s) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, .02, z);
    m.renderOrder = 1;
    scene.add(m);
  };
  siteMesh(MAT.siteA, -20, -20, 9);
  siteMesh(MAT.siteB, 20, 20, 9);
  MAP.sites = { A: { x: -20, z: -20 }, B: { x: 20, z: 20 } };

  /* ---------- lighting ---------- */
  buildLighting(scene, quality);

  /* ---------- sky dome ----------
     The sphere must stay comfortably inside the camera's far plane, otherwise
     it is clipped and looking up at an empty angle renders pure black.
     The camera sits inside the arena (±52) so the radius also has to exceed
     that plus the far-plane margin. 340 is comfortably within far = 420. */
  {
    const skyGeo = new THREE.SphereGeometry(340, 32, 20);
    const skyMat = new THREE.MeshBasicMaterial({
      map: canvasTexture(TEXTURES.sky, 1, 1),
      side: THREE.BackSide,
      fog: false,
      depthWrite: false
    });
    skyMat.map.repeat.set(1, 1);
    const sky = new THREE.Mesh(skyGeo, skyMat);
    sky.renderOrder = -1000;          // always drawn behind the world
    sky.frustumCulled = false;        // never skipped, even at odd angles
    scene.add(sky);
    scene.userData.sky = sky;
  }

  /* ---------- spawn points ----------
     Validated against the world so nobody ever spawns inside geometry. */
  const clearAt = (x, z, radius, height) => {
    const g = world.groundAt(x, z, 3);
    if (g === null || g === undefined) return false;
    if (Math.abs(g) > 0.001) return false;          // must be on the flat arena floor
    if (world.overlaps(x, g + 0.06, z, radius, height)) return false;
    // keep clear of other structures horizontally too
    return !world.overlaps(x, g + 0.06, z, radius + 0.5, height * 0.5);
  };

  const candidates = [
    { x: 0, z: 42 }, { x: 42, z: 0 }, { x: 0, z: -36 }, { x: -42, z: 0 },
    { x: -30, z: 30 }, { x: 30, z: -30 }, { x: 30, z: 30 }, { x: -30, z: -30 },
    { x: 0, z: 30 }, { x: 30, z: 0 }, { x: 0, z: -30 }, { x: -30, z: 0 },
    { x: 18, z: 42 }, { x: -18, z: 42 }, { x: 42, z: 18 }, { x: 42, z: -18 },
    { x: 18, z: -36 }, { x: -18, z: -36 }
  ];
  MAP.playerSpawns = [];
  for (let i = 0; i < candidates.length && MAP.playerSpawns.length < 8; i++) {
    const c = candidates[i];
    if (!clearAt(c.x, c.z, CFG.playerRadius + 0.05, CFG.playerHeight)) continue;
    // require some separation from already-chosen spawns
    if (MAP.playerSpawns.some(s => Math.hypot(s.x - c.x, s.z - c.z) < 9)) continue;
    MAP.playerSpawns.push({ x: c.x, y: 0, z: c.z });
  }
  if (MAP.playerSpawns.length === 0) MAP.playerSpawns.push({ x: 0, y: 0, z: 42 });
  MAP.spawns = MAP.playerSpawns.map(p => ({ x: p.x, z: p.z }));

  /* zombie spawn ring — keep only points that are actually standable */
  MAP.zombieSpawns = [];
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    for (let r = 46; r >= 24; r -= 3) {
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.abs(x) > MAP.size / 2 - 4 || Math.abs(z) > MAP.size / 2 - 4) continue;
      if (world.overlaps(x, (world.groundAt(x, z, 3) || 0) + 0.06, z, 0.55, 1.4)) continue;
      MAP.zombieSpawns.push({ x: x, y: 0.1, z: z });
      break;
    }
  }
  if (MAP.zombieSpawns.length < 6) {
    MAP.zombieSpawns = [{ x: 0, z: 42 }, { x: 42, z: 0 }, { x: 0, z: -36 }, { x: -42, z: 0 }];
  }
  MAP.spawnReport = {
    players: MAP.playerSpawns.map(s => '(' + s.x + ',' + s.z + ')').join(' '),
    zombies: MAP.zombieSpawns.length
  };

  /* ---------- aim-training room (outside the arena) ---------- */
  buildAimRoom(scene, world);

  /* ---------- navigation grid ---------- */
  MAP.nav = buildNav(world, MAP);
  return MAP;
}

/* ============================================================
   AIM-TRAINING ROOM
   A sealed room outside the arena, used by the test range. It is built once with
   the map so it costs nothing at runtime. `MAP.aimRoom` describes its bounds and
   the entry point the player is placed at.
   ============================================================ */
function buildAimRoom(scene, world) {
  const cx = 0, cz = -84;                 // room centre
  const halfW = 15, halfD = 22;           // interior half-extents
  const H = 8, T = 1.6;                   // wall height / thickness
  const minX = cx - halfW, maxX = cx + halfW;
  const minZ = cz - halfD, maxZ = cz + halfD;
  const S = MAP.size;

  // floor (top at y = 0, same as the arena)
  solid(scene, world, cx, -2, cz, halfW * 2 + T * 2, 2, halfD * 2 + T * 2,
    MAT.floor, { tag: 'ground', noShadow: true });

  // side walls
  solid(scene, world, minX - T / 2, 0, cz, T, H, halfD * 2 + T * 2, MAT.concrete, { tag: 'wall' });
  solid(scene, world, maxX + T / 2, 0, cz, T, H, halfD * 2 + T * 2, MAT.concrete, { tag: 'wall' });
  // far / near walls
  solid(scene, world, cx, 0, minZ - T / 2, halfW * 2 + T * 2, H, T, MAT.concrete, { tag: 'wall' });
  solid(scene, world, cx, 0, maxZ + T / 2, halfW * 2 + T * 2, H, T, MAT.concrete, { tag: 'wall' });

  // ceiling (decorative only) so it reads as an indoor room
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(halfW * 2 + T * 2, .5, halfD * 2 + T * 2),
    MAT.dark
  );
  roof.position.set(cx, H + .25, cz);
  roof.castShadow = false; roof.receiveShadow = true;
  scene.add(roof);

  /* The room is roofed, so the arena sun is shadowed out of it. Give it its own
     lighting. A directional light is the reliable choice here: this build of
     three.js (r160) uses physical units, where point lights fall off with
     distance and render very dim indoors. */
  const roomHemi = new THREE.HemisphereLight(0xdfe9f5, 0x8a8070, 2.4);
  roomHemi.position.set(cx, H * .6, cz);
  scene.add(roomHemi);

  const roomSun = new THREE.DirectionalLight(0xfff6e6, 2.6);
  roomSun.position.set(cx + 12, H + 10, cz + 14);
  roomSun.target.position.set(cx, 0, cz);
  scene.add(roomSun.target);
  scene.add(roomSun);

  const roomSun2 = new THREE.DirectionalLight(0xdfe9f5, 1.1);
  roomSun2.position.set(cx - 14, H + 8, cz - 16);
  roomSun2.target.position.set(cx, 0, cz);
  scene.add(roomSun2.target);
  scene.add(roomSun2);

  // warm ambient so nothing reads as pure black
  const roomAmb = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(roomAmb);

  // floor lane markings: a firing line and distance ticks
  const line = (z, w, col) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, .18),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .5, fog: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(cx, .02, z);
    m.renderOrder = 1;
    scene.add(m);
  };
  line(maxZ - 3, halfW * 2 - 1, 0xff9d21);            // firing line
  for (let d = 10; d <= 35; d += 5) line(maxZ - 3 - d, halfW * 1.4, 0x4aa3ff);

  // distance numbers painted on the floor
  for (let d = 10; d <= 35; d += 5) {
    const c = makeCanvas(64); c.height = 64;
    const g2 = c.getContext('2d');
    g2.fillStyle = 'rgba(74,163,255,.85)';
    g2.font = 'bold 44px Arial'; g2.textAlign = 'center'; g2.textBaseline = 'middle';
    g2.fillText(String(d), 32, 34);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.7),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, fog: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(cx - 6, .03, maxZ - 3 - d);
    m.renderOrder = 2;
    scene.add(m);
  }

  MAP.aimRoom = {
    minX: minX, maxX: maxX, minZ: minZ, maxZ: maxZ,
    entry: { x: cx, z: maxZ - 3, yaw: 0 },            // yaw 0 faces -Z, into the room
    floorY: 0
  };
  return MAP.aimRoom;
}

/* ---------------- stepped ramp ----------------
   Steps are sized so the player's step-up height always clears them. */
function makeRamp(scene, world, x, z, width, height, dir) {
  const steps = Math.max(4, Math.ceil(height / 0.38));
  const depth = height * 1.5;
  for (let i = 0; i < steps; i++) {
    const h = (i + 1) / steps * height;
    const off = (i + .5) / steps * depth;
    let px = x, pz = z;
    let w = width, d = depth / steps + .02;
    if (dir === 'south') { pz = z + off; w = width; d = depth / steps + .02; }
    if (dir === 'north') { pz = z - off; }
    if (dir === 'east') { px = x + off; w = depth / steps + .02; d = width; }
    if (dir === 'west') { px = x - off; w = depth / steps + .02; d = width; }
    solid(scene, world, px, 0, pz, w, h, d, MAT.concrete, { tag: 'ramp' });
  }
}

/* Cut a doorway through a wall by splitting it into two segments + lintel. */
function doorwayCut(scene, world, x, z, axis, len, h, thick) {
  // find the wall AABB we just added and split it
  const idx = world.boxes.findIndex(b =>
    Math.abs(((b.minX + b.maxX) / 2) - x) < .01 && Math.abs(((b.minZ + b.maxZ) / 2) - z) < .01 &&
    Math.abs((b.maxY - b.minY) - h) < .01);
  if (idx < 0) return;
  const b = world.boxes[idx];
  // remove from grid: easiest correct way — rebuild grid without it
  world.boxes.splice(idx, 1);
  // remove its mesh
  if (b.mesh) { scene.remove(b.mesh); b.mesh.geometry.dispose(); }
  // rebuild the grid fully (cheap enough at load time)
  world.grid.clear();
  world.boxes.forEach((bb, i) => world._insert(bb, i));

  const gap = 4.2;
  const seg = (len - gap) / 2;
  const y = 0;
  if (axis === 'z') {
    solid(scene, world, x, y, z - (gap / 2 + seg / 2), thick, h, seg, MAT.brick, { tag: 'wall' });
    solid(scene, world, x, y, z + (gap / 2 + seg / 2), thick, h, seg, MAT.brick, { tag: 'wall' });
    solid(scene, world, x, y + h - .9, z, thick, .9, gap, MAT.brick, { tag: 'wall' }); // lintel
  } else {
    solid(scene, world, x - (gap / 2 + seg / 2), y, z, seg, h, thick, MAT.brick, { tag: 'wall' });
    solid(scene, world, x + (gap / 2 + seg / 2), y, z, seg, h, thick, MAT.brick, { tag: 'wall' });
    solid(scene, world, x, y + h - .9, z, gap, .9, thick, MAT.brick, { tag: 'wall' });
  }
}

/* ---------------- building with interior ---------------- */
function buildBuilding(scene, world, cx, cz, w, d, h, site) {
  const wall = .55;
  const door = 3.4;
  const hw = w / 2, hd = d / 2;
  const mat = site ? MAT.brick : MAT.concrete;

  // four walls with a doorway on the sides facing the centre
  // north wall (z = cz - hd)
  solid(scene, world, cx - (door / 2 + (w - door) / 4), 0, cz - hd, (w - door) / 2, h, wall, mat, { tag: 'wall' });
  solid(scene, world, cx + (door / 2 + (w - door) / 4), 0, cz - hd, (w - door) / 2, h, wall, mat, { tag: 'wall' });
  solid(scene, world, cx, h - 1.1, cz - hd, door, 1.1, wall, mat, { tag: 'wall' });
  // south wall
  solid(scene, world, cx - (door / 2 + (w - door) / 4), 0, cz + hd, (w - door) / 2, h, wall, mat, { tag: 'wall' });
  solid(scene, world, cx + (door / 2 + (w - door) / 4), 0, cz + hd, (w - door) / 2, h, wall, mat, { tag: 'wall' });
  solid(scene, world, cx, h - 1.1, cz + hd, door, 1.1, wall, mat, { tag: 'wall' });
  // west wall
  solid(scene, world, cx - hw, 0, cz - (door / 2 + (d - door) / 4), wall, h, (d - door) / 2, mat, { tag: 'wall' });
  solid(scene, world, cx - hw, 0, cz + (door / 2 + (d - door) / 4), wall, h, (d - door) / 2, mat, { tag: 'wall' });
  solid(scene, world, cx - hw, h - 1.1, cz, wall, 1.1, door, mat, { tag: 'wall' });
  // east wall
  solid(scene, world, cx + hw, 0, cz - (door / 2 + (d - door) / 4), wall, h, (d - door) / 2, mat, { tag: 'wall' });
  solid(scene, world, cx + hw, 0, cz + (door / 2 + (d - door) / 4), wall, h, (d - door) / 2, mat, { tag: 'wall' });
  solid(scene, world, cx + hw, h - 1.1, cz, wall, 1.1, door, mat, { tag: 'wall' });

  // roof
  solid(scene, world, cx, h, cz, w + .6, .5, d + .6, MAT.concrete, { tag: 'roof' });
  // roof parapet
  decor(scene, cx, h + .5, cz - hd, w + .6, .8, .35, MAT.dark);
  decor(scene, cx, h + .5, cz + hd, w + .6, .8, .35, MAT.dark);
  decor(scene, cx - hw, h + .5, cz, .35, .8, d + .6, MAT.dark);
  decor(scene, cx + hw, h + .5, cz, .35, .8, d + .6, MAT.dark);
  // access stairs outside (stepped ramp) to the roof, on the far side
  const side = cz > 0 ? -1 : 1;
  makeRamp(scene, world, cx, cz + side * (hd + 1.2), 3, h + .5, cz > 0 ? 'north' : 'south');

  // interior cover
  world.addBox(aabbFromCenter(cx, 1.1, cz, 3, 2.2, 1.2, 'cover'));
  decor(scene, cx, 0, cz, 3, 2.2, 1.2, MAT.wood);

  if (site) {
    // bomb-site flavour: crates + light
    const l = new THREE.PointLight(0xffb050, 22, 22, 2);
    l.position.set(cx, h - 1, cz);
    scene.add(l);
  }
  return { cx, cz, w, d, h };
}

/* ---------------- watchtower ---------------- */
function buildTower(scene, world, x, z) {
  const legOff = 3.2, legH = 7.5;
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(o => {
    solid(scene, world, x + o[0] * legOff, 0, z + o[1] * legOff, .8, legH, .8, MAT.wood, { tag: 'cover' });
  });
  // deck
  solid(scene, world, x, legH, z, legOff * 2 + 1.2, .7, legOff * 2 + 1.2, MAT.wood, { tag: 'deck' });
  // railings
  const R = legOff + .6;
  decor(scene, x, legH + .7, z - R, R * 2, 1.1, .25, MAT.wood);
  decor(scene, x, legH + .7, z + R, R * 2, 1.1, .25, MAT.wood);
  decor(scene, x - R, legH + .7, z, .25, 1.1, R * 2, MAT.wood);
  decor(scene, x + R, legH + .7, z, .25, 1.1, R * 2, MAT.wood);
  // roof
  solid(scene, world, x, legH + 3.2, z, R * 2 + 2, .45, R * 2 + 2, MAT.metal, { tag: 'roof' });
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(o => {
    solid(scene, world, x + o[0] * R, legH + .7, z + o[1] * R, .4, 2.5, .4, MAT.wood, { tag: 'cover' });
  });
  // ramp up
  makeRamp(scene, world, x, z + legOff + 2.2, 3, legH + .7, 'north');
}

/* ---------------- barrel mesh ---------------- */
function barrelMesh(scene, x, z) {
  const g = new THREE.CylinderGeometry(.48, .48, 1.15, 12);
  const m = new THREE.Mesh(g, MAT.metal);
  m.position.set(x, .575, z);
  m.castShadow = true; m.receiveShadow = true;
  scene.add(m);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(.51, .51, .12, 12), MAT.dark);
  ring.position.set(x, .82, z); scene.add(ring);
  const ring2 = ring.clone(); ring2.position.y = .32; scene.add(ring2);
  return m;
}

/* ---------------- lighting ---------------- */
function buildLighting(scene, quality) {
  const hemi = new THREE.HemisphereLight(0xbdd6f2, 0x554e42, 0.85);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff2dc, 2.0);
  sun.position.set(48, 72, 26);
  sun.target.position.set(0, 0, 0);
  scene.add(sun.target);
  scene.add(sun);

  const shadowSize = quality === 0 ? 1024 : quality === 1 ? 2048 : 4096;
  sun.castShadow = true;
  sun.shadow.mapSize.width = shadowSize;
  sun.shadow.mapSize.height = shadowSize;
  // The shadow camera must enclose the WHOLE arena. Anything outside it gets a
  // clamped lookup, which shows up as large false-shadow bands on the ground.
  const d = 82;
  sun.shadow.camera.left = -d; sun.shadow.camera.right = d;
  sun.shadow.camera.top = d; sun.shadow.camera.bottom = -d;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 290;
  sun.shadow.bias = -0.0012;
  sun.shadow.normalBias = 0.055;
  sun.shadow.camera.updateProjectionMatrix();
  scene.userData.sun = sun;

  const amb = new THREE.AmbientLight(0xffffff, 0.18);
  scene.add(amb);

  scene.fog = new THREE.FogExp2(0xbcc6cf, 0.0055);
  return { sun, hemi };
}

/* ============================================================
   NAVIGATION GRID + A*
   ============================================================ */
function buildNav(world, map) {
  const cell = 1.0;
  const minX = -map.size / 2 + 1, maxX = map.size / 2 - 1;
  const minZ = -map.size / 2 + 1, maxZ = map.size / 2 - 1;
  const W = Math.ceil((maxX - minX) / cell), H = Math.ceil((maxZ - minZ) / cell);
  const walk = new Uint8Array(W * H);
  const groundY = new Float32Array(W * H);
  const AGENT_H = 1.5, AGENT_R = 0.46;

  for (let gz = 0; gz < H; gz++) {
    for (let gx = 0; gx < W; gx++) {
      const x = minX + (gx + .5) * cell, z = minZ + (gz + .5) * cell;
      const gy = world.groundAt(x, z, 12);
      groundY[gz * W + gx] = gy;
      // headroom + footprint clear?
      if (gy > 11) { walk[gz * W + gx] = 0; continue; }
      const blocked = world.overlaps(x, gy + .06, z, AGENT_R, AGENT_H);
      walk[gz * W + gx] = blocked ? 0 : 1;
    }
  }

  // flood fill from the arena centre so unreachable pockets are excluded
  const reach = new Uint8Array(W * H);
  const startX = Math.round((0 - minX) / cell), startZ = Math.round((-44 - minZ) / cell);
  const q = [startZ * W + startX];
  if (walk[q[0]]) reach[q[0]] = 1;
  else { // fall back to any walkable cell
    for (let i = 0; i < walk.length; i++) if (walk[i]) { q[0] = i; reach[i] = 1; break; }
  }
  const dirs4 = [1, -1, W, -W];
  while (q.length) {
    const i = q.pop();
    const gx = i % W, gz = (i / W) | 0;
    for (let k = 0; k < 4; k++) {
      const nx = gx + (k === 0 ? 1 : k === 1 ? -1 : 0);
      const nz = gz + (k === 2 ? 1 : k === 3 ? -1 : 0);
      if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue;
      const j = nz * W + nx;
      if (reach[j] || !walk[j]) continue;
      if (Math.abs(groundY[j] - groundY[i]) > 1.35) continue; // no big drops
      reach[j] = 1; q.push(j);
    }
  }

  const nav = {
    cell, minX, minZ, W, H, walk, reach, groundY,
    idx(x, z) {
      const gx = Math.floor((x - minX) / cell), gz = Math.floor((z - minZ) / cell);
      if (gx < 0 || gz < 0 || gx >= W || gz >= H) return -1;
      return gz * W + gx;
    },
    cellCenter(i) {
      const gx = i % W, gz = (i / W) | 0;
      return { x: minX + (gx + .5) * cell, z: minZ + (gz + .5) * cell, y: groundY[i] };
    },
    ok(i) { return i >= 0 && reach[i] === 1; },
    /* nearest walkable cell to (x,z), spiral search */
    nearest(x, z) {
      let i = this.idx(x, z);
      if (this.ok(i)) return i;
      const gx = U.clamp(Math.floor((x - minX) / cell), 0, W - 1);
      const gz = U.clamp(Math.floor((z - minZ) / cell), 0, H - 1);
      for (let r = 1; r < 22; r++) {
        for (let a = 0; a < 24; a++) {
          const ang = a / 24 * Math.PI * 2;
          const nx = U.clamp(gx + Math.round(Math.cos(ang) * r), 0, W - 1);
          const nz = U.clamp(gz + Math.round(Math.sin(ang) * r), 0, H - 1);
          const j = nz * W + nx;
          if (this.ok(j)) return j;
        }
      }
      return -1;
    }
  };
  return nav;
}

/* A* on the nav grid. Returns an array of {x,y,z} waypoints (already smoothed). */
function navPath(nav, from, to, maxNodes) {
  const s = nav.nearest(from.x, from.z);
  const g = nav.nearest(to.x, to.z);
  if (s < 0 || g < 0) return null;
  if (s === g) return [{ x: to.x, y: nav.groundY[g], z: to.z }];

  const W = nav.W, H = nav.H;
  const gScore = new Float32Array(W * H).fill(Infinity);
  const came = new Int32Array(W * H).fill(-1);
  const closed = new Uint8Array(W * H);
  gScore[s] = 0;
  const gx = g % W, gz = (g / W) | 0;
  const hf = (i) => { const x = i % W, z = (i / W) | 0; const dx = Math.abs(x - gx), dz = Math.abs(z - gz); return (dx + dz) + 0.414 * Math.min(dx, dz); };

  // binary heap
  const heap = [s], f = new Float32Array(W * H); f[s] = hf(s);
  const push = (i) => {
    heap.push(i); let c = heap.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (f[heap[p]] <= f[heap[c]]) break;
      const t = heap[p]; heap[p] = heap[c]; heap[c] = t; c = p;
    }
  };
  const pop = () => {
    const top = heap[0], last = heap.pop();
    if (heap.length) {
      heap[0] = last; let p = 0;
      for (;;) {
        const l = p * 2 + 1, r = l + 1; let m = p;
        if (l < heap.length && f[heap[l]] < f[heap[m]]) m = l;
        if (r < heap.length && f[heap[r]] < f[heap[m]]) m = r;
        if (m === p) break;
        const t = heap[p]; heap[p] = heap[m]; heap[m] = t; p = m;
      }
    }
    return top;
  };

  let expanded = 0, found = false;
  const limit = maxNodes || 4200;
  const nbr = [1, -1, W, -W, W + 1, W - 1, -W + 1, -W - 1];
  while (heap.length && expanded < limit) {
    const cur = pop();
    if (closed[cur]) continue;
    closed[cur] = 1; expanded++;
    if (cur === g) { found = true; break; }
    const cxg = cur % W, czg = (cur / W) | 0;
    for (let k = 0; k < 8; k++) {
      const nx = cxg + (k === 0 ? 1 : k === 1 ? -1 : k === 2 ? 0 : k === 3 ? 0 : k === 4 ? 1 : k === 5 ? 1 : k === 6 ? -1 : -1);
      const nz = czg + (k === 0 ? 0 : k === 1 ? 0 : k === 2 ? 1 : k === 3 ? -1 : k === 4 ? 1 : k === 5 ? -1 : k === 6 ? 1 : -1);
      if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue;
      const j = nz * W + nx;
      if (!nav.reach[j] || closed[j]) continue;
      const dy = Math.abs(nav.groundY[j] - nav.groundY[cur]);
      if (dy > .62) continue;
      if (k >= 4) { // diagonal: both orthogonals must be open
        if (!nav.reach[czg * W + nx] || !nav.reach[nz * W + cxg]) continue;
        if (Math.abs(nav.groundY[czg * W + nx] - nav.groundY[cur]) > .62) continue;
        if (Math.abs(nav.groundY[nz * W + cxg] - nav.groundY[cur]) > .62) continue;
      }
      const step = (k >= 4 ? 1.414 : 1) + dy * 0.6;
      const t = gScore[cur] + step;
      if (t < gScore[j]) {
        gScore[j] = t; came[j] = cur; f[j] = t + hf(j) * 1.08;
        push(j);
      }
    }
  }
  if (!found) return null;

  // reconstruct
  const cells = [];
  for (let i = g; i >= 0; i = came[i]) { cells.push(i); if (i === s) break; }
  cells.reverse();
  if (cells.length < 2) return [{ x: to.x, y: to.y, z: to.z }];

  // string-pull: keep only waypoints with a clear grid line of sight
  const out = [];
  let anchor = 0;
  out.push(nav.cellCenter(cells[0]));
  for (let i = 2; i < cells.length; i++) {
    if (!navLineClear(nav, cells[anchor], cells[i])) {
      anchor = i - 1;
      out.push(nav.cellCenter(cells[anchor]));
    }
  }
  const last = nav.cellCenter(cells[cells.length - 1]);
  out.push(last);
  // replace final waypoint with the true target for precision
  out[out.length - 1] = { x: to.x, y: U.lerp(last.y, to.y === undefined ? last.y : to.y, .25), z: to.z };
  return out;
}

function navLineClear(nav, a, b) {
  const x0 = a % nav.W, z0 = (a / nav.W) | 0;
  const x1 = b % nav.W, z1 = (b / nav.W) | 0;
  let dx = Math.abs(x1 - x0), dz = Math.abs(z1 - z0);
  const sx = x0 < x1 ? 1 : -1, sz = z0 < z1 ? 1 : -1;
  let err = dx - dz, x = x0, z = z0, guard = 0;
  while (guard++ < 600) {
    const i = z * nav.W + x;
    if (!nav.reach[i]) return false;
    if (x === x1 && z === z1) return true;
    const e2 = 2 * err;
    if (e2 > -dz) { err -= dz; x += sx; }
    if (e2 < dx) { err += dx; z += sz; }
    // prevent corner cutting
    if (x !== x1 && z !== z1) {
      const a2 = z * nav.W + x, b2 = z0 * nav.W + x1;
      // (approximation — allow)
    }
  }
  return true;
}
