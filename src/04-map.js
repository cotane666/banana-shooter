/* ============================================================
   04 — MAP: geometry, lighting, navigation grid + pathfinding
   Five selectable arenas share one set of builders. Everything the map
   creates lives in MAP.group, so switching maps at runtime is just
   "dispose the group, rebuild".
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
  group: null,
  sites: {},
  id: 'arena',
  def: null,
  aimRoom: null
};

/* ---------------- material cache ---------------- */
let MAT = {};
function buildMaterials() {
  if (MAT.floor) return;                 // built once; reused across map rebuilds
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
  MAT._cache = {};
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

/* add a solid box: bottom-center anchored at (x,y,z). `parent` is MAP.group. */
function solid(parent, world, x, y, z, w, h, d, mat, opts) {
  opts = opts || {};
  const aabb = aabbFromBase(x, y, z, w, h, d, opts.tag || 'solid');
  if (!opts.noCollide) world.addBox(aabb);
  if (opts.invisible) return aabb;
  const mesh = makeBoxMesh(w, h, d, mat || MAT.concrete);
  mesh.position.set(x, y + h / 2, z);
  if (opts.rotY) mesh.rotation.y = opts.rotY;
  if (opts.noShadow) { mesh.castShadow = false; }
  parent.add(mesh);
  if (aabb) aabb.mesh = mesh;
  return aabb;
}

/* decorative box (no collision), centered on y */
function decor(parent, x, y, z, w, h, d, mat, rotY) {
  const mesh = makeBoxMesh(w, h, d, mat || MAT.concrete);
  mesh.position.set(x, y + h / 2, z);
  if (rotY) mesh.rotation.y = rotY;
  mesh.castShadow = true; mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

/* ============================================================
   COMMON MAP PIECES
   ============================================================ */
function mapGround(parent, world, opts) {
  opts = opts || {};
  const S = MAP.size;
  world.addBox(AABB(-(S / 2 + 20), -2, -(S / 2 + 20), S / 2 + 20, 0, S / 2 + 20, 'ground'));
  const gpMat = MAT.floor.clone();
  gpMat.map = canvasTexture(TEXTURES.floor, 18, 4);
  if (opts.tint !== undefined) gpMat.color.setHex(opts.tint);
  const gp = new THREE.Mesh(new THREE.PlaneGeometry(S + 40, S + 40), gpMat);
  gp.rotation.x = -Math.PI / 2;
  gp.position.y = 0.01;
  gp.receiveShadow = true;
  parent.add(gp);
}

function mapPerimeter(parent, world, mat) {
  const S = MAP.size, H = MAP.wallH, t = 2.5, half = S / 2;
  mat = mat || MAT.concrete;
  solid(parent, world, 0, 0, -half, S + t, H, t, mat, { tag: 'wall' });
  solid(parent, world, 0, 0, half, S + t, H, t, mat, { tag: 'wall' });
  solid(parent, world, -half, 0, 0, t, H, S + t, mat, { tag: 'wall' });
  solid(parent, world, half, 0, 0, t, H, S + t, mat, { tag: 'wall' });
}

/* Cut a doorway through a wall by splitting it into two segments + lintel. */
function doorwayCut(parent, world, x, z, axis, len, h, thick) {
  const idx = world.boxes.findIndex(b =>
    Math.abs(((b.minX + b.maxX) / 2) - x) < .01 && Math.abs(((b.minZ + b.maxZ) / 2) - z) < .01 &&
    Math.abs((b.maxY - b.minY) - h) < .01);
  if (idx < 0) return;
  const b = world.boxes[idx];
  world.boxes.splice(idx, 1);
  if (b.mesh) { parent.remove(b.mesh); b.mesh.geometry.dispose(); }
  world.grid.clear();
  world.boxes.forEach((bb, i) => world._insert(bb, i));

  const gap = 4.2;
  const seg = (len - gap) / 2;
  const y = 0;
  if (axis === 'z') {
    solid(parent, world, x, y, z - (gap / 2 + seg / 2), thick, h, seg, MAT.brick, { tag: 'wall' });
    solid(parent, world, x, y, z + (gap / 2 + seg / 2), thick, h, seg, MAT.brick, { tag: 'wall' });
    solid(parent, world, x, y + h - .9, z, thick, .9, gap, MAT.brick, { tag: 'wall' });
  } else {
    solid(parent, world, x - (gap / 2 + seg / 2), y, z, seg, h, thick, MAT.brick, { tag: 'wall' });
    solid(parent, world, x + (gap / 2 + seg / 2), y, z, seg, h, thick, MAT.brick, { tag: 'wall' });
    solid(parent, world, x, y + h - .9, z, gap, .9, thick, MAT.brick, { tag: 'wall' });
  }
}

/* ---------------- stepped ramp ---------------- */
function makeRamp(parent, world, x, z, width, height, dir) {
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
    solid(parent, world, px, 0, pz, w, h, d, MAT.concrete, { tag: 'ramp' });
  }
}

/* ---------------- building with interior ---------------- */
function buildBuilding(parent, world, cx, cz, w, d, h, site) {
  const wall = .55;
  const door = 3.4;
  const hw = w / 2, hd = d / 2;
  const mat = site ? MAT.brick : MAT.concrete;

  solid(parent, world, cx - (door / 2 + (w - door) / 4), 0, cz - hd, (w - door) / 2, h, wall, mat, { tag: 'wall' });
  solid(parent, world, cx + (door / 2 + (w - door) / 4), 0, cz - hd, (w - door) / 2, h, wall, mat, { tag: 'wall' });
  solid(parent, world, cx, h - 1.1, cz - hd, door, 1.1, wall, mat, { tag: 'wall' });
  solid(parent, world, cx - (door / 2 + (w - door) / 4), 0, cz + hd, (w - door) / 2, h, wall, mat, { tag: 'wall' });
  solid(parent, world, cx + (door / 2 + (w - door) / 4), 0, cz + hd, (w - door) / 2, h, wall, mat, { tag: 'wall' });
  solid(parent, world, cx, h - 1.1, cz + hd, door, 1.1, wall, mat, { tag: 'wall' });
  solid(parent, world, cx - hw, 0, cz - (door / 2 + (d - door) / 4), wall, h, (d - door) / 2, mat, { tag: 'wall' });
  solid(parent, world, cx - hw, 0, cz + (door / 2 + (d - door) / 4), wall, h, (d - door) / 2, mat, { tag: 'wall' });
  solid(parent, world, cx - hw, h - 1.1, cz, wall, 1.1, door, mat, { tag: 'wall' });
  solid(parent, world, cx + hw, 0, cz - (door / 2 + (d - door) / 4), wall, h, (d - door) / 2, mat, { tag: 'wall' });
  solid(parent, world, cx + hw, 0, cz + (door / 2 + (d - door) / 4), wall, h, (d - door) / 2, mat, { tag: 'wall' });
  solid(parent, world, cx + hw, h - 1.1, cz, wall, 1.1, door, mat, { tag: 'wall' });

  solid(parent, world, cx, h, cz, w + .6, .5, d + .6, MAT.concrete, { tag: 'roof' });
  decor(parent, cx, h + .5, cz - hd, w + .6, .8, .35, MAT.dark);
  decor(parent, cx, h + .5, cz + hd, w + .6, .8, .35, MAT.dark);
  decor(parent, cx - hw, h + .5, cz, .35, .8, d + .6, MAT.dark);
  decor(parent, cx + hw, h + .5, cz, .35, .8, d + .6, MAT.dark);
  const side = cz > 0 ? -1 : 1;
  makeRamp(parent, world, cx, cz + side * (hd + 1.2), 3, h + .5, cz > 0 ? 'north' : 'south');

  world.addBox(aabbFromCenter(cx, 1.1, cz, 3, 2.2, 1.2, 'cover'));
  decor(parent, cx, 0, cz, 3, 2.2, 1.2, MAT.wood);

  if (site) {
    const l = new THREE.PointLight(0xffb050, 22, 22, 2);
    l.position.set(cx, h - 1, cz);
    parent.add(l);
  }
  return { cx, cz, w, d, h };
}

/* ---------------- watchtower ---------------- */
function buildTower(parent, world, x, z) {
  const legOff = 3.2, legH = 7.5;
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(o => {
    solid(parent, world, x + o[0] * legOff, 0, z + o[1] * legOff, .8, legH, .8, MAT.wood, { tag: 'cover' });
  });
  solid(parent, world, x, legH, z, legOff * 2 + 1.2, .7, legOff * 2 + 1.2, MAT.wood, { tag: 'deck' });
  const R = legOff + .6;
  decor(parent, x, legH + .7, z - R, R * 2, 1.1, .25, MAT.wood);
  decor(parent, x, legH + .7, z + R, R * 2, 1.1, .25, MAT.wood);
  decor(parent, x - R, legH + .7, z, .25, 1.1, R * 2, MAT.wood);
  decor(parent, x + R, legH + .7, z, .25, 1.1, R * 2, MAT.wood);
  solid(parent, world, x, legH + 3.2, z, R * 2 + 2, .45, R * 2 + 2, MAT.metal, { tag: 'roof' });
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(o => {
    solid(parent, world, x + o[0] * R, legH + .7, z + o[1] * R, .4, 2.5, .4, MAT.wood, { tag: 'cover' });
  });
  makeRamp(parent, world, x, z + legOff + 2.2, 3, legH + .7, 'north');
}

/* ---------------- barrel mesh ---------------- */
function barrelMesh(parent, world, x, z) {
  const g = new THREE.CylinderGeometry(.48, .48, 1.15, 12);
  const m = new THREE.Mesh(g, MAT.metal);
  m.position.set(x, .575, z);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(.51, .51, .12, 12), MAT.dark);
  ring.position.set(x, .82, z); parent.add(ring);
  const ring2 = ring.clone(); ring2.position.y = .32; parent.add(ring2);
  world.addBox(AABB(x - .48, 0, z - .48, x + .48, 1.15, z + .48, 'cover'));
  return m;
}

/* container: 2.9 m tall, climbable from a crate, solid wall from the ground */
function container(parent, world, x, z, rot, len) {
  len = len || 12;
  const w = 2.9, h = 2.9;
  solid(parent, world, x, 0, z, rot ? w : len, h, rot ? len : w, MAT.metal, { tag: 'cover' });
  decor(parent, x + (rot ? 0 : len / 2 - .06), h / 2, z + (rot ? len / 2 - .06 : 0),
    rot ? w + .1 : .12, h, rot ? .12 : w + .1, MAT.dark);
}

function sandbag(parent, world, x, z, len, rot) {
  for (let i = 0; i < len; i++) {
    const ox = rot ? 0 : (i - len / 2 + .5) * 1.15;
    const oz = rot ? (i - len / 2 + .5) * 1.15 : 0;
    solid(parent, world, x + ox, 0, z + oz, 1.15, .72, 1.15, MAT.sand, { tag: 'cover' });
    if (i % 2 === 0) solid(parent, world, x + ox, .72, z + oz, 1.15, .72, 1.15, MAT.sand, { tag: 'cover' });
  }
}

/* ============================================================
   MAP 1 — BANANA ARENA (the original layout)
   ============================================================ */
function buildMapArena(parent, world) {
  mapGround(parent, world);
  mapPerimeter(parent, world);

  const PH = 2.6, PS = 20;
  solid(parent, world, 0, 0, 0, PS, PH, PS, MAT.concrete, { tag: 'plat' });
  decor(parent, 0, PH, PS / 2 - .3, PS, .35, .6, MAT.dark);
  decor(parent, 0, PH, -PS / 2 + .3, PS, .35, .6, MAT.dark);
  decor(parent, PS / 2 - .3, PH, 0, .6, .35, PS, MAT.dark);
  decor(parent, -PS / 2 + .3, PH, 0, .6, .35, PS, MAT.dark);
  makeRamp(parent, world, 0, PS / 2, 4, PH, 'south');
  makeRamp(parent, world, 0, -PS / 2, 4, PH, 'north');
  makeRamp(parent, world, PS / 2, 0, 4, PH, 'east');
  makeRamp(parent, world, -PS / 2, 0, 4, PH, 'west');
  solid(parent, world, 0, PH, 0, 3.2, 1.5, 3.2, MAT.metal, { tag: 'cover' });
  solid(parent, world, 6.4, PH, 6.4, 1.8, 2.2, 1.8, MAT.wood, { tag: 'cover' });
  solid(parent, world, -6.4, PH, -6.4, 1.8, 2.2, 1.8, MAT.wood, { tag: 'cover' });

  const bd = 22;
  buildBuilding(parent, world, -bd, -bd, 18, 14, 5.2, 'A');
  buildBuilding(parent, world, bd, bd, 18, 14, 5.2, 'B');
  buildBuilding(parent, world, -bd, bd, 16, 12, 4.6, null);
  buildBuilding(parent, world, bd, -bd, 16, 12, 4.6, null);

  solid(parent, world, -34, 0, 0, 2, 3.4, 30, MAT.brick, { tag: 'wall' });
  solid(parent, world, 34, 0, 0, 2, 3.4, 30, MAT.brick, { tag: 'wall' });
  solid(parent, world, 0, 0, -34, 30, 3.4, 2, MAT.brick, { tag: 'wall' });
  solid(parent, world, 0, 0, 34, 30, 3.4, 2, MAT.brick, { tag: 'wall' });
  doorwayCut(parent, world, -34, 0, 'z', 30, 3.4, 2);
  doorwayCut(parent, world, 34, 0, 'z', 30, 3.4, 2);
  doorwayCut(parent, world, 0, -34, 'x', 30, 3.4, 2);
  doorwayCut(parent, world, 0, 34, 'x', 30, 3.4, 2);

  container(parent, world, -14, 32, false, 13);
  container(parent, world, 20, -36, true, 11);
  container(parent, world, -40, -18, true, 12);
  container(parent, world, 38, 16, false, 12);
  container(parent, world, -8, -46, false, 10);

  const rng = makeRng(90210);
  for (let i = 0; i < 40; i++) {
    const x = (rng() * 2 - 1) * 42, z = (rng() * 2 - 1) * 42;
    if (Math.hypot(x, z) < 15) continue;
    if (world.overlaps(x, .1, z, 1.3, 1.3)) continue;
    const s = .95 + rng() * .35;
    solid(parent, world, x, 0, z, s, s, s, MAT.wood, { tag: 'cover' });
    if (rng() < .45) solid(parent, world, x + s * .1, s, z - s * .1, s * .85, s * .85, s * .85, MAT.wood, { tag: 'cover' });
  }
  for (let i = 0; i < 22; i++) {
    const x = (rng() * 2 - 1) * 44, z = (rng() * 2 - 1) * 44;
    if (Math.hypot(x, z) < 15) continue;
    if (world.overlaps(x, .1, z, 1.1, 1.2)) continue;
    barrelMesh(parent, world, x, z);
  }

  sandbag(parent, world, -18, -20, 5, false);
  sandbag(parent, world, 18, 20, 5, false);
  sandbag(parent, world, -18, 20, 4, false);
  sandbag(parent, world, 18, -20, 4, false);
  sandbag(parent, world, -44, 8, 6, true);
  sandbag(parent, world, 44, -8, 6, true);

  [[-26, -26], [26, 26], [-26, 26], [26, -26]].forEach(p => {
    solid(parent, world, p[0], 0, p[1], 2.2, 6.5, 2.2, MAT.concrete, { tag: 'cover' });
    solid(parent, world, p[0], 6.5, p[1], 3.2, .5, 3.2, MAT.dark, { tag: 'cover' });
  });

  buildTower(parent, world, 0, -44);

  siteMesh(parent, MAT.siteA, -20, -20, 9);
  siteMesh(parent, MAT.siteB, 20, 20, 9);
  MAP.sites = { A: { x: -20, z: -20 }, B: { x: 20, z: 20 } };
}

/* ============================================================
   MAP 2 — WAREHOUSE: shelf rows, a loading dock and a mezzanine
   ============================================================ */
function buildMapWarehouse(parent, world) {
  mapGround(parent, world, { tint: 0xc9ccc4 });
  mapPerimeter(parent, world, MAT.concrete);

  // loading dock along the north wall, reachable by two ramps
  solid(parent, world, 0, 0, -36, 60, 1.7, 14, MAT.concrete, { tag: 'plat' });
  makeRamp(parent, world, -18, -28.4, 5, 1.7, 'south');
  makeRamp(parent, world, 18, -28.4, 5, 1.7, 'south');
  solid(parent, world, -18, 1.7, -36, 3, 1.0, 8, MAT.metal, { tag: 'cover' });
  solid(parent, world, 18, 1.7, -36, 3, 1.0, 8, MAT.metal, { tag: 'cover' });

  // long shelf rows split by a central cross aisle
  for (let i = 0; i < 6; i++) {
    const x = -30 + i * 12;
    solid(parent, world, x, 0, -14, 1.5, 4.3, 17, MAT.metal, { tag: 'cover' });
    solid(parent, world, x, 0, 15, 1.5, 4.3, 16, MAT.metal, { tag: 'cover' });
    // a low shelf section so you can climb onto the rack
    solid(parent, world, x, 2.2, -6.5, 1.5, 1.0, 3.0, MAT.wood, { tag: 'cover' });
  }
  // cross shelves
  for (let k = -1; k <= 1; k++) {
    const z = k * 8;
    solid(parent, world, -24, 0, z, 20, 3.4, 1.5, MAT.metal, { tag: 'cover' });
    solid(parent, world, 24, 0, z, 20, 3.4, 1.5, MAT.metal, { tag: 'cover' });
  }

  // mezzanine in the south-east corner
  solid(parent, world, 34, 0, 34, 20, 3.0, 20, MAT.concrete, { tag: 'plat' });
  makeRamp(parent, world, 34, 21.6, 5, 3.0, 'south');
  solid(parent, world, 34, 3.0, 34, 2.4, 1.2, 10, MAT.wood, { tag: 'cover' });

  // crate / pallet clutter
  const rng = makeRng(5150);
  for (let i = 0; i < 46; i++) {
    const x = (rng() * 2 - 1) * 44, z = (rng() * 2 - 1) * 44;
    if (Math.abs(z) < 10 && Math.abs(x) < 40) continue;
    if (world.overlaps(x, .1, z, 1.4, 1.4)) continue;
    const s = 1.0 + rng() * .5;
    solid(parent, world, x, 0, z, s, s, s, MAT.wood, { tag: 'cover' });
    if (rng() < .5) solid(parent, world, x, s, z, s * .9, s * .9, s * .9, MAT.wood, { tag: 'cover' });
  }
  for (let i = 0; i < 16; i++) {
    const x = (rng() * 2 - 1) * 44, z = (rng() * 2 - 1) * 44;
    if (world.overlaps(x, .1, z, 1.1, 1.2)) continue;
    barrelMesh(parent, world, x, z);
  }

  sandbag(parent, world, -44, -20, 5, true);
  sandbag(parent, world, 44, 20, 5, true);

  buildTower(parent, world, -42, 42);

  siteMesh(parent, MAT.siteA, -34, 30, 8);
  siteMesh(parent, MAT.siteB, 36, -6, 8);
  MAP.sites = { A: { x: -34, z: 30 }, B: { x: 36, z: -6 } };
}

/* ============================================================
   MAP 3 — TOWERS: verticality, four corner towers joined by catwalks
   ============================================================ */
function buildMapTowers(parent, world) {
  mapGround(parent, world);
  mapPerimeter(parent, world);

  // four corner towers with decks at ~6 m
  const T = [[-34, -34], [34, -34], [-34, 34], [34, 34]];
  T.forEach(t => buildTower(parent, world, t[0], t[1]));

  // catwalks joining adjacent towers (solid decks with rails). They are well
  // above the nav sample window, so the arena floor stays walkable underneath.
  const deckH = 6.5, deckW = 3.2;
  const edge = (x, z, w, d) => {
    solid(parent, world, x, deckH, z, w, .55, d, MAT.metal, { tag: 'deck' });
    if (w > d) {
      decor(parent, x, deckH + .55, z - d / 2 + .2, w, 1.0, .25, MAT.metal);
      decor(parent, x, deckH + .55, z + d / 2 - .2, w, 1.0, .25, MAT.metal);
    } else {
      decor(parent, x - w / 2 + .2, deckH + .55, z, .25, 1.0, d, MAT.metal);
      decor(parent, x + w / 2 - .2, deckH + .55, z, .25, 1.0, d, MAT.metal);
    }
  };
  edge(0, -34, 68, deckW);
  edge(0, 34, 68, deckW);
  edge(-34, 0, deckW, 68);
  edge(34, 0, deckW, 68);

  // central raised bunker with ramps (an objective point)
  solid(parent, world, 0, 0, 0, 16, 2.4, 16, MAT.concrete, { tag: 'plat' });
  makeRamp(parent, world, 0, 10.2, 5, 2.4, 'south');
  makeRamp(parent, world, 0, -10.2, 5, 2.4, 'north');
  solid(parent, world, 0, 2.4, 0, 4, 1.6, 4, MAT.metal, { tag: 'cover' });

  // ground cover so the open floor is not a killing field
  container(parent, world, -14, 10, false, 12);
  container(parent, world, 14, -10, true, 12);
  const rng = makeRng(3110);
  for (let i = 0; i < 34; i++) {
    const x = (rng() * 2 - 1) * 42, z = (rng() * 2 - 1) * 42;
    if (Math.abs(x) < 12 && Math.abs(z) < 12) continue;
    if (world.overlaps(x, .1, z, 1.3, 1.3)) continue;
    const s = .95 + rng() * .4;
    solid(parent, world, x, 0, z, s, s, s, MAT.wood, { tag: 'cover' });
  }
  sandbag(parent, world, -20, 0, 4, true);
  sandbag(parent, world, 20, 0, 4, true);
  sandbag(parent, world, 0, -20, 4, false);
  sandbag(parent, world, 0, 20, 4, false);

  siteMesh(parent, MAT.siteA, 0, -24, 8);
  siteMesh(parent, MAT.siteB, 0, 24, 8);
  MAP.sites = { A: { x: 0, z: -24 }, B: { x: 0, z: 24 } };
}

/* ============================================================
   MAP 4 — CRATES: a climbable crate maze (the vaulting playground)
   ============================================================ */
function buildMapCrates(parent, world) {
  mapGround(parent, world, { tint: 0xc6c0b2 });
  mapPerimeter(parent, world, MAT.brick);

  // A grid of stacked crates with wide corridors between blocks. Blocks are kept
  // modest in height (1–2 crates) so the floor plan stays open and connected.
  const rng = makeRng(7777);
  const block = (cx, cz) => {
    const s = 1.15;
    const h = 1 + Math.floor(rng() * 2);           // 1 or 2 crates tall
    for (let iy = 0; iy < h; iy++) {
      for (let ix = -1; ix <= 1; ix++) {
        for (let iz = -1; iz <= 1; iz++) {
          if (iy === h - 1 && rng() < .45 && (ix !== 0 || iz !== 0)) continue;
          solid(parent, world, cx + ix * s, iy * s, cz + iz * s, s * .94, s * .94, s * .94, MAT.wood, { tag: 'cover' });
        }
      }
    }
  };
  for (let gx = -2; gx <= 2; gx++) {
    for (let gz = -2; gz <= 2; gz++) {
      const x = gx * 18, z = gz * 18;
      if (Math.hypot(x, z) < 10) continue;          // keep a clear centre
      block(x, z);
    }
  }

  // centre: a stepped pyramid you can climb to the top of (0.55 m steps keep it
  // walkable for the player AND navigable for the horde)
  for (let k = 0; k < 8; k++) {
    const size = 12 - k * 1.35;
    solid(parent, world, 0, k * 0.55, 0, size, 0.55, size, MAT.concrete, { tag: 'plat' });
  }

  // sandbag lines and a few tall pillars for sightline breaks
  sandbag(parent, world, -40, -40, 6, false);
  sandbag(parent, world, 40, 40, 6, false);
  sandbag(parent, world, -40, 40, 6, true);
  sandbag(parent, world, 40, -40, 6, true);
  [[-30, 0], [30, 0], [0, -30], [0, 30]].forEach(p => {
    solid(parent, world, p[0], 0, p[1], 2.0, 5.0, 2.0, MAT.concrete, { tag: 'cover' });
  });
  container(parent, world, -30, 24, false, 12);
  container(parent, world, 30, -24, true, 12);

  siteMesh(parent, MAT.siteA, -18, -18, 8);
  siteMesh(parent, MAT.siteB, 18, 18, 8);
  MAP.sites = { A: { x: -18, z: -18 }, B: { x: 18, z: 18 } };
}

/* ============================================================
   MAP 5 — DESERT: open dunes, rocks and ruins (long sightlines)
   ============================================================ */
function buildMapDesert(parent, world) {
  mapGround(parent, world, { tint: 0xd9c48d });
  mapPerimeter(parent, world, MAT.sand);

  const rng = makeRng(4242);
  // low dunes: wide, gently stepped platforms
  for (let i = 0; i < 26; i++) {
    const x = (rng() * 2 - 1) * 44, z = (rng() * 2 - 1) * 44;
    if (Math.hypot(x, z) < 8) continue;
    if (world.overlaps(x, .1, z, 4.5, 1.0)) continue;
    const w = 7 + rng() * 9, d = 7 + rng() * 9, h = .7 + rng() * .9;
    solid(parent, world, x, 0, z, w, h, d, MAT.sand, { tag: 'cover' });
  }
  // rock formations: tall, unclimbable cover
  for (let i = 0; i < 14; i++) {
    const x = (rng() * 2 - 1) * 42, z = (rng() * 2 - 1) * 42;
    if (Math.hypot(x, z) < 10) continue;
    if (world.overlaps(x, .1, z, 3.4, 3)); continue;
    const w = 2.6 + rng() * 3.4, d = 2.6 + rng() * 3.4, h = 4.2 + rng() * 3.2;
    solid(parent, world, x, 0, z, w, h, d, MAT.brick, { tag: 'wall' });
    solid(parent, world, x, h, z, w * .8, .4, d * .8, MAT.sand, { tag: 'cover' });
  }

  // ruined compound in the north
  const rx = 0, rz = -36;
  solid(parent, world, rx - 14, 0, rz, 20, 3.6, 1.8, MAT.brick, { tag: 'wall' });
  solid(parent, world, rx + 14, 0, rz, 20, 3.6, 1.8, MAT.brick, { tag: 'wall' });
  solid(parent, world, rx, 0, rz - 0, 1.8, 3.6, 10, MAT.brick, { tag: 'wall' });
  solid(parent, world, rx, 0, rz + 12, 34, 3.6, 1.8, MAT.brick, { tag: 'wall' });
  doorwayCut(parent, world, rx, rz + 12, 'x', 34, 3.6, 1.8);
  solid(parent, world, rx, 0, rz + 4, 6, 2.2, 6, MAT.concrete, { tag: 'plat' });
  makeRamp(parent, world, rx + 5, rz + 4, 3.5, 2.2, 'east');

  // a wrecked container and a water tower
  container(parent, world, -30, 30, false, 12);
  buildTower(parent, world, 34, 26);

  sandbag(parent, world, -10, 24, 5, false);
  sandbag(parent, world, 12, 20, 5, false);
  sandbag(parent, world, -26, -6, 5, true);

  siteMesh(parent, MAT.siteA, -26, 6, 8);
  siteMesh(parent, MAT.siteB, 30, -14, 8);
  MAP.sites = { A: { x: -26, z: 6 }, B: { x: 30, z: -14 } };
}

/* ---------------- bomb site marker ---------------- */
function siteMesh(parent, mat, x, z, s) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, .02, z);
  m.renderOrder = 1;
  parent.add(m);
  return m;
}

/* ---------------- registry ---------------- */
const MAPS = [
  { id: 'arena',     name: 'БАНАНОВАЯ АРЕНА', short: 'АРЕНА',   desc: 'Центральная платформа и четыре здания', build: buildMapArena },
  { id: 'warehouse', name: 'СКЛАД',           short: 'СКЛАД',   desc: 'Стеллажи, пандус и антресоль',          build: buildMapWarehouse },
  { id: 'towers',    name: 'ВЫШКИ',           short: 'ВЫШКИ',   desc: 'Вертикальный бой: вышки и мосты',       build: buildMapTowers },
  { id: 'crates',    name: 'ЯЩИКИ',           short: 'ЯЩИКИ',   desc: 'Лабиринт из ящиков — залезай и стреляй', build: buildMapCrates },
  { id: 'desert',    name: 'ПУСТЫНЯ',         short: 'ПУСТЫНЯ', desc: 'Дюны, скалы и руины',                   build: buildMapDesert }
];

function mapById(id) {
  return MAPS.find(m => m.id === id) || MAPS[0];
}

/* ============================================================
   BUILD / REBUILD
   ============================================================ */
function disposeGroupDeep(g) {
  if (!g) return;
  g.traverse(o => {
    if (o.geometry) o.geometry.dispose();
  });
}

function buildMap(scene, quality, mapId) {
  MAP.scene = scene;
  MAP.id = mapById(mapId).id;
  MAP.def = mapById(mapId);

  // tear down the previous arena (everything lives under MAP.group)
  if (MAP.group) {
    scene.remove(MAP.group);
    disposeGroupDeep(MAP.group);
  }

  buildMaterials();

  const group = MAP.group = new THREE.Group();
  scene.add(group);
  const world = MAP.world = new CollisionWorld();

  MAP.playerSpawns = [];
  MAP.zombieSpawns = [];
  MAP.sites = {};
  MAP.aimRoom = null;

  MAP.def.build(group, world);

  buildAimRoom(group, world);
  buildLighting(group, quality);
  buildSky(group);

  MAP.nav = buildNav(world, MAP);

  scene.fog = new THREE.FogExp2(MAP.def.fog || 0xbcc6cf, MAP.def.fogDensity || 0.0055);

  computeSpawns(world);
  return MAP;
}

function buildSky(parent) {
  const skyGeo = new THREE.SphereGeometry(340, 32, 20);
  const skyMat = new THREE.MeshBasicMaterial({
    map: canvasTexture(TEXTURES.sky, 1, 1),
    side: THREE.BackSide,
    fog: false,
    depthWrite: false
  });
  skyMat.map.repeat.set(1, 1);
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.renderOrder = -1000;
  sky.frustumCulled = false;
  parent.add(sky);
  parent.userData.sky = sky;
}

/* player + zombie spawns, validated against the world */
function computeSpawns(world) {
  const clearAt = (x, z, radius, height) => {
    const g = world.groundAt(x, z, 3);
    if (g === null || g === undefined) return false;
    if (Math.abs(g) > 0.001) return false;          // must be on the flat arena floor
    if (world.overlaps(x, g + 0.06, z, radius, height)) return false;
    return !world.overlaps(x, g + 0.06, z, radius + 0.5, height * 0.5);
  };

  const candidates = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    candidates.push({ x: Math.cos(a) * 42, z: Math.sin(a) * 42 });
  }
  candidates.push({ x: 0, z: 42 }, { x: 42, z: 0 }, { x: 0, z: -40 }, { x: -42, z: 0 });
  candidates.push({ x: -30, z: 30 }, { x: 30, z: -30 }, { x: 30, z: 30 }, { x: -30, z: -30 });

  MAP.playerSpawns = [];
  for (let i = 0; i < candidates.length && MAP.playerSpawns.length < 10; i++) {
    const c = candidates[i];
    if (!clearAt(c.x, c.z, CFG.playerRadius + 0.05, CFG.playerHeight)) continue;
    if (MAP.playerSpawns.some(s => Math.hypot(s.x - c.x, s.z - c.z) < 9)) continue;
    MAP.playerSpawns.push({ x: c.x, y: 0, z: c.z });
  }
  if (MAP.playerSpawns.length === 0) MAP.playerSpawns.push({ x: 0, y: 0, z: 42 });
  MAP.spawns = MAP.playerSpawns.map(p => ({ x: p.x, z: p.z }));

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
  // Prefer spawn points the horde can actually walk from. A point sealed in by
  // geometry would spawn a zombie that just presses against a rock forever.
  if (MAP.nav) {
    const good = MAP.zombieSpawns.filter(s => MAP.nav.ok(MAP.nav.nearest(s.x, s.z)));
    if (good.length >= 6) MAP.zombieSpawns = good;
  }
  MAP.spawnReport = {
    players: MAP.playerSpawns.map(s => '(' + s.x + ',' + s.z + ')').join(' '),
    zombies: MAP.zombieSpawns.length
  };
}

/* ============================================================
   AIM-TRAINING ROOM
   A sealed room outside the arena, used by the test range. It is rebuilt with
   the map (cheap) and `MAP.aimRoom` describes its bounds and entry point.
   ============================================================ */
function buildAimRoom(parent, world) {
  const cx = 0, cz = -84;
  const halfW = 15, halfD = 22;
  const H = 8, T = 1.6;
  const minX = cx - halfW, maxX = cx + halfW;
  const minZ = cz - halfD, maxZ = cz + halfD;

  world.addBox(AABB(cx - (halfW + T), -2, cz - (halfD + T), cx + (halfW + T), 0, cz + (halfD + T), 'ground'));
  const gpMat = MAT.floor.clone();
  gpMat.map = canvasTexture(TEXTURES.floor, 4, 4);
  const gp = new THREE.Mesh(new THREE.PlaneGeometry(halfW * 2 + T * 2, halfD * 2 + T * 2), gpMat);
  gp.rotation.x = -Math.PI / 2;
  gp.position.set(cx, .01, cz);
  gp.receiveShadow = true;
  parent.add(gp);

  solid(parent, world, minX - T / 2, 0, cz, T, H, halfD * 2 + T * 2, MAT.concrete, { tag: 'wall' });
  solid(parent, world, maxX + T / 2, 0, cz, T, H, halfD * 2 + T * 2, MAT.concrete, { tag: 'wall' });
  solid(parent, world, cx, 0, minZ - T / 2, halfW * 2 + T * 2, H, T, MAT.concrete, { tag: 'wall' });
  solid(parent, world, cx, 0, maxZ + T / 2, halfW * 2 + T * 2, H, T, MAT.concrete, { tag: 'wall' });

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(halfW * 2 + T * 2, .5, halfD * 2 + T * 2),
    MAT.dark
  );
  roof.position.set(cx, H + .25, cz);
  roof.castShadow = false; roof.receiveShadow = true;
  parent.add(roof);

  const roomHemi = new THREE.HemisphereLight(0xdfe9f5, 0x8a8070, 2.4);
  roomHemi.position.set(cx, H * .6, cz);
  parent.add(roomHemi);

  const roomSun = new THREE.DirectionalLight(0xfff6e6, 2.6);
  roomSun.position.set(cx + 12, H + 10, cz + 14);
  roomSun.target.position.set(cx, 0, cz);
  parent.add(roomSun.target);
  parent.add(roomSun);

  const roomSun2 = new THREE.DirectionalLight(0xdfe9f5, 1.1);
  roomSun2.position.set(cx - 14, H + 8, cz - 16);
  roomSun2.target.position.set(cx, 0, cz);
  parent.add(roomSun2.target);
  parent.add(roomSun2);

  const roomAmb = new THREE.AmbientLight(0xffffff, 0.55);
  parent.add(roomAmb);

  const roomLights = [roomHemi, roomSun, roomSun2, roomAmb];

  const line = (z, w, col) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, .18),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .5, fog: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(cx, .02, z);
    m.renderOrder = 1;
    parent.add(m);
  };
  line(maxZ - 3, halfW * 2 - 1, 0xff9d21);
  for (let d = 10; d <= 35; d += 5) line(maxZ - 3 - d, halfW * 1.4, 0x4aa3ff);

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
    parent.add(m);
  }

  MAP.aimRoom = {
    minX: minX, maxX: maxX, minZ: minZ, maxZ: maxZ,
    entry: { x: cx, z: maxZ - 3, yaw: 0 },
    floorY: 0,
    lights: roomLights
  };
  setAimRoomLights(false);
  return MAP.aimRoom;
}

/* Aim-room lights are global in three.js, so they are switched on only while
   the player is inside the room. Otherwise they brighten the whole arena. */
function setAimRoomLights(on) {
  const room = MAP.aimRoom;
  if (!room || !room.lights) return;
  for (const l of room.lights) l.visible = !!on;
}

/* ---------------- lighting ---------------- */
function buildLighting(parent, quality) {
  const hemi = new THREE.HemisphereLight(0xbdd6f2, 0x554e42, 0.85);
  parent.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff2dc, 2.0);
  sun.position.set(48, 72, 26);
  sun.target.position.set(0, 0, 0);
  parent.add(sun.target);
  parent.add(sun);

  const shadowSize = quality === 0 ? 1024 : quality === 1 ? 2048 : 4096;
  sun.castShadow = true;
  sun.shadow.mapSize.width = shadowSize;
  sun.shadow.mapSize.height = shadowSize;
  const d = 82;
  sun.shadow.camera.left = -d; sun.shadow.camera.right = d;
  sun.shadow.camera.top = d; sun.shadow.camera.bottom = -d;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 290;
  sun.shadow.bias = -0.0012;
  sun.shadow.normalBias = 0.055;
  sun.shadow.camera.updateProjectionMatrix();
  parent.userData.sun = sun;

  const amb = new THREE.AmbientLight(0xffffff, 0.18);
  parent.add(amb);

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
  // Only sample surfaces in this window above the floor. Overhead decks and
  // catwalks sit higher; sampling them would put nav cells in mid-air and the
  // flood fill could never cross beneath them, splitting the arena into islands.
  const NAV_SAMPLE_CEIL = 1.5;

  for (let gz = 0; gz < H; gz++) {
    for (let gx = 0; gx < W; gx++) {
      const x = minX + (gx + .5) * cell, z = minZ + (gz + .5) * cell;
      // Sample only LOW surfaces (floor, steps, ramp treads). Overhead decks and
      // catwalks sit above this window; sampling them would place nav cells up in
      // the air, and the flood fill could then never cross beneath them, chopping
      // the arena into disconnected islands.
      const gy = world.groundAt(x, z, NAV_SAMPLE_CEIL);
      groundY[gz * W + gx] = gy;
      const blocked = world.overlaps(x, gy + .06, z, AGENT_R, AGENT_H);
      walk[gz * W + gx] = blocked ? 0 : 1;
    }
  }

  const reach = new Uint8Array(W * H);
  const startX = Math.round((0 - minX) / cell), startZ = Math.round((-44 - minZ) / cell);
  const q = [startZ * W + startX];
  if (walk[q[0]]) reach[q[0]] = 1;
  else {
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
      if (Math.abs(groundY[j] - groundY[i]) > 1.35) continue;
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
  const limit = maxNodes || 8000;
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
      if (k >= 4) {
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

  const cells = [];
  for (let i = g; i >= 0; i = came[i]) { cells.push(i); if (i === s) break; }
  cells.reverse();
  if (cells.length < 2) return [{ x: to.x, y: to.y, z: to.z }];

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
  }
  return true;
}
