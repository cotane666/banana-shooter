/* ============================================================
   07 — ZOMBIES: horde AI (flow field + steering), animation, damage
   ============================================================ */

/* ---------------- procedural zombie mesh ---------------- */
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
    this.pathCd = U.rand(0, .4);
    this.waypoint = null;
    this.losT = U.rand(0, .25);
    this.hasLOS = false;
    this.stuckT = 0;
    this.lastPos = { x, z };
    this.speedMul = 1;
    this.frozen = false;

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
    let mul = 1;
    if (part === 'head') mul = CFG.headshotMultiplier;
    else if (part === 'legs') mul = CFG.limbMultiplier;
    const dmg = amount * mul;
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

    if (this.frozen) {
      this.applyVisual(dt, 0);
      return;
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

    // ---- gravity & movement ----
    if (!this.onGround) this.vel.y -= CFG.gravity * dt;
    const speed = this.speed * speedMul * (this.staggerT > 0 ? .35 : 1);
    const moveX = dirX * speed, moveZ = dirZ * speed;

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
    const ctx = { player, world: this.world, flow: this.flow, neighbors: null };
    for (let i = 0; i < this.list.length; i++) {
      const z = this.list[i];
      ctx.neighbors = this.nearby(z);
      z.update(dt, ctx);
    }
    // reap
    for (let i = this.list.length - 1; i >= 0; i--) {
      const z = this.list[i];
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
