/* ============================================================
   02 — WORLD GEOMETRY: AABB collision, raycasting, spatial grid
   ============================================================ */

function AABB(minX, minY, minZ, maxX, maxY, maxZ, tag) {
  return { minX, minY, minZ, maxX, maxY, maxZ, tag: tag || 'solid' };
}
/* AABB from a CENTER point plus full size (used where cy is the centre). */
function aabbFromCenter(cx, cy, cz, w, h, d, tag) {
  return AABB(cx - w / 2, cy - h / 2, cz - d / 2, cx + w / 2, cy + h / 2, cz + d / 2, tag);
}
/* AABB from a BASE point (cy is the bottom) plus full size. */
function aabbFromBase(cx, baseY, cz, w, h, d, tag) {
  return AABB(cx - w / 2, baseY, cz - d / 2, cx + w / 2, baseY + h, cz + d / 2, tag);
}
function aabbFromBox(center, size) {
  return AABB(center.x - size.x / 2, center.y - size.y / 2, center.z - size.z / 2,
    center.x + size.x / 2, center.y + size.y / 2, center.z + size.z / 2);
}
function aabbUnion(a, b) {
  return AABB(Math.min(a.minX, b.minX), Math.min(a.minY, b.minY), Math.min(a.minZ, b.minZ),
    Math.max(a.maxX, b.maxX), Math.max(a.maxY, b.maxY), Math.max(a.maxZ, b.maxZ));
}
function aabbOverlap(a, b) {
  return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY && a.minZ < b.maxZ && a.maxZ > b.minZ;
}

/* A vertical cylinder vs static world */
function cylinderOverlapsAABB(cyl, b) {
  if (cyl.y + cyl.height <= b.minY || cyl.y >= b.maxY) return false;
  const cx = U.clamp(cyl.x, b.minX, b.maxX);
  const cz = U.clamp(cyl.z, b.minZ, b.maxZ);
  const dx = cyl.x - cx, dz = cyl.z - cz;
  return dx * dx + dz * dz < cyl.radius * cyl.radius;
}

/* ---------------- Collision world ---------------- */
class CollisionWorld {
  constructor() {
    this.boxes = [];         // static AABBs
    this.tops = [];          // walkable tops for AI: {aabb, top}
    this.cell = 8;           // spatial grid cell size
    this.grid = new Map();
    this.bounds = { minX: -200, maxX: 200, minZ: -200, maxZ: 200 };
  }

  addBox(aabb) {
    const id = this.boxes.length;
    this.boxes.push(aabb);
    this._insert(aabb, id);
    return aabb;
  }

  _key(ix, iz) { return ix + ',' + iz; }

  _insert(aabb, id) {
    const c = this.cell;
    const x0 = Math.floor(aabb.minX / c), x1 = Math.floor(aabb.maxX / c);
    const z0 = Math.floor(aabb.minZ / c), z1 = Math.floor(aabb.maxZ / c);
    for (let ix = x0; ix <= x1; ix++) {
      for (let iz = z0; iz <= z1; iz++) {
        const k = this._key(ix, iz);
        let arr = this.grid.get(k);
        if (!arr) { arr = []; this.grid.set(k, arr); }
        arr.push(id);
      }
    }
  }

  /* query boxes potentially overlapping an AABB */
  query(aabb, out) {
    out = out || [];
    out.length = 0;
    const c = this.cell;
    const x0 = Math.floor((aabb.minX - 0.01) / c), x1 = Math.floor((aabb.maxX + 0.01) / c);
    const z0 = Math.floor((aabb.minZ - 0.01) / c), z1 = Math.floor((aabb.maxZ + 0.01) / c);
    for (let ix = x0; ix <= x1; ix++) {
      for (let iz = z0; iz <= z1; iz++) {
        const arr = this.grid.get(this._key(ix, iz));
        if (!arr) continue;
        for (let i = 0; i < arr.length; i++) {
          const b = this.boxes[arr[i]];
          if (out.indexOf(b) < 0) out.push(b);
        }
      }
    }
    return out;
  }

  /* Ray vs all boxes in the segment's grid range. Returns closest hit {t, point, normal, box}. */
  raycast(origin, dir, maxDist, ignoreTags) {
    // DDA over grid cells along the ray, plus brute force on candidate cells
    const cands = this._rayCandidates(origin, dir, maxDist);
    let best = null;
    const o = origin;
    for (let i = 0; i < cands.length; i++) {
      const b = cands[i];
      if (ignoreTags && ignoreTags.indexOf(b.tag) >= 0) continue;
      const hit = rayBox(o, dir, b, maxDist);
      if (hit && (!best || hit.t < best.t)) { best = hit; best.box = b; }
    }
    return best;
  }

  /* All box hits along a ray, sorted front-to-back, each with entry t and exit t2.
     Used for bullet penetration through thin cover. */
  raycastAll(origin, dir, maxDist, ignoreTags) {
    const cands = this._rayCandidates(origin, dir, maxDist);
    const hits = [];
    for (let i = 0; i < cands.length; i++) {
      const b = cands[i];
      if (ignoreTags && ignoreTags.indexOf(b.tag) >= 0) continue;
      const h = rayBox(origin, dir, b, maxDist);
      if (!h) continue;
      h.box = b;
      // exit distance (slab method, reuse rayBox with the far root)
      h.t2 = this._boxExit(origin, dir, b, maxDist);
      hits.push(h);
    }
    hits.sort((a, c) => a.t - c.t);
    return hits;
  }

  _boxExit(o, d, b, maxDist) {
    let tmin = 0, tmax = maxDist;
    const axes = [['x', b.minX, b.maxX], ['y', b.minY, b.maxY], ['z', b.minZ, b.maxZ]];
    for (let i = 0; i < 3; i++) {
      const a = axes[i];
      if (Math.abs(d[a[0]]) < 1e-9) { if (o[a[0]] < a[1] || o[a[0]] > a[2]) return maxDist; continue; }
      const inv = 1 / d[a[0]];
      let t1 = (a[1] - o[a[0]]) * inv, t2 = (a[2] - o[a[0]]) * inv;
      if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; }
      if (t1 > tmin) tmin = t1;
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return maxDist;
    }
    return tmax;
  }

  _rayCandidates(origin, dir, maxDist) {
    const c = this.cell;
    const cands = [];
    const seen = new Set();
    const steps = Math.min(220, Math.ceil(maxDist / (c * 0.5)) + 2);
    for (let s = 0; s <= steps; s++) {
      const t = (s / steps) * maxDist;
      const px = origin.x + dir.x * t, pz = origin.z + dir.z * t;
      const ix = Math.floor(px / c), iz = Math.floor(pz / c);
      for (let ax = -1; ax <= 1; ax++) {
        for (let az = -1; az <= 1; az++) {
          const arr = this.grid.get(this._key(ix + ax, iz + az));
          if (!arr) continue;
          for (let i = 0; i < arr.length; i++) {
            const id = arr[i];
            if (seen.has(id)) continue;
            seen.add(id);
            cands.push(this.boxes[id]);
          }
        }
      }
    }
    return cands;
  }

  /* Move a cylinder through the world with axis-separated resolution + step-up.
     ent: {x,y,z,radius,height}. Returns collision info. */
  moveCylinder(ent, disp, opts) {
    opts = opts || {};
    const res = { hitX: false, hitZ: false, hitY: false, landed: false, groundY: null, ceiling: false };
    const r = ent.radius, h = ent.height;
    const tmp = [];
    const stepUp = opts.stepUp || 0;
    /* Boxes that blocked the last horizontal attempt, so the post-move step-up
       can check whether they are low enough to be a stair (and not a wall). */
    let blockBoxes = [];

    const tryAxis = (axis, amount) => {
      if (amount === 0) return false;
      const px = ent.x, py = ent.y, pz = ent.z;
      if (axis === 'x') ent.x += amount; else if (axis === 'z') ent.z += amount; else ent.y += amount;
      const cyl = { x: ent.x, y: ent.y, z: ent.z, radius: r, height: h };
      const bb = AABB(ent.x - r, ent.y, ent.z - r, ent.x + r, ent.y + h, ent.z + r);
      const list = this.query(bb, tmp);
      const hit = [];
      for (let i = 0; i < list.length; i++) {
        if (cylinderOverlapsAABB(cyl, list[i])) hit.push(list[i]);
      }
      if (hit.length) {
        if (axis === 'x' || axis === 'z') blockBoxes = hit;
        /* Step-up only makes sense over something we could stand on. A box whose
           top is higher than `stepUp` above our feet is a wall, and lifting onto
           it would let the player climb any wall instantly — the old code did
           exactly that because it never looked at the obstacle's height. */
        let tooTall = false;
        for (let i = 0; i < hit.length; i++) {
          if (hit[i].maxY > ent.y + stepUp + 0.02) { tooTall = true; break; }
        }
        if (stepUp && (axis === 'x' || axis === 'z') && !tooTall) {
          const lift = stepUp;
          const cyl2 = { x: ent.x, y: ent.y + lift, z: ent.z, radius: r, height: h };
          const bb2 = AABB(ent.x - r, ent.y + lift, ent.z - r, ent.x + r, ent.y + lift + h, ent.z + r);
          const list2 = this.query(bb2, tmp.slice());
          let blocked2 = false;
          for (let j = 0; j < list2.length; j++) {
            if (cylinderOverlapsAABB(cyl2, list2[j])) { blocked2 = true; break; }
          }
          if (!blocked2) return false; // allow the move, y will be adjusted below
        }
        // genuinely blocked: report what is in the way (for the climb mechanic)
        if (axis === 'x' || axis === 'z') {
          let top = -Infinity, low = Infinity;
          for (let i = 0; i < hit.length; i++) {
            if (hit[i].maxY > top) top = hit[i].maxY;
            if (hit[i].minY < low) low = hit[i].minY;
          }
          res.blockTop = top;
          res.blockLow = low;
          res.blockedH = true;
        }
        // nudge to the surface to avoid jitter
        if (axis === 'x') ent.x = px; else if (axis === 'z') ent.z = pz; else ent.y = py;
        return true;
      }
      return false;
    };

    // Y first (gravity / jump) then horizontal — stable on stairs
    if (disp.y !== 0) {
      if (tryAxis('y', disp.y)) {
        res.hitY = true;
        if (disp.y < 0) res.landed = true;
        else res.ceiling = true;
      }
    }
    if (disp.x !== 0 && tryAxis('x', disp.x)) res.hitX = true;
    if (disp.z !== 0 && tryAxis('z', disp.z)) res.hitZ = true;

    // auto step-up resolution: after horizontal move, if we are penetrating, raise
    if (stepUp && (res.hitX || res.hitZ)) {
      const lift = stepUp;
      // only if every blocker is a low ledge, never a wall
      let tooTall = false;
      for (let i = 0; i < blockBoxes.length; i++) {
        if (blockBoxes[i].maxY > ent.y + lift + 0.02) { tooTall = true; break; }
      }
      if (!tooTall) {
        const cyl2 = { x: ent.x, y: ent.y + lift, z: ent.z, radius: r, height: h };
        const bb2 = AABB(ent.x - r, ent.y + lift, ent.z - r, ent.x + r, ent.y + lift + h, ent.z + r);
        const list2 = this.query(bb2, tmp.slice());
        let blocked2 = false;
        for (let j = 0; j < list2.length; j++) if (cylinderOverlapsAABB(cyl2, list2[j])) { blocked2 = true; break; }
        if (!blocked2) { ent.y += lift; res.hitX = res.hitZ = false; }
      }
    }

    // ---------- ground probe / snap ----------
    // Find the highest surface whose top is reachable: either at/below our feet
    // (we are standing on it) or within the step-up window (a stair). Anything
    // taller is a wall and must never be snapped onto.
    const snap = opts.snap === undefined ? 0.34 : opts.snap;
    const feet = ent.y;
    const searchTop = feet + snap;
    let bestTop = -Infinity;
    const pb = AABB(ent.x - r, feet - 0.05, ent.z - r, ent.x + r, searchTop + 0.02, ent.z + r);
    const plist = this.query(pb, []);
    for (let i = 0; i < plist.length; i++) {
      const b = plist[i];
      if (b.maxY > searchTop + 0.02) continue;
      // only treat this as ground if its footprint intersects our cylinder
      const cx = U.clamp(ent.x, b.minX, b.maxX), cz = U.clamp(ent.z, b.minZ, b.maxZ);
      const dx = ent.x - cx, dz = ent.z - cz;
      if (dx * dx + dz * dz >= r * r) continue;
      if (b.maxY > bestTop) bestTop = b.maxY;
    }
    if (bestTop > -Infinity) res.groundY = bestTop;
    return res;
  }

  /* true if a standing cylinder at pos overlaps the world */
  overlaps(x, y, z, radius, height) {
    const cyl = { x, y, z, radius, height };
    const bb = AABB(x - radius, y, z - radius, x + radius, y + height, z + radius);
    const list = this.query(bb, []);
    for (let i = 0; i < list.length; i++) if (cylinderOverlapsAABB(cyl, list[i])) return true;
    return false;
  }

  /* highest walkable surface under (x,z) up to maxY */
  groundAt(x, z, maxY) {
    let best = 0;
    const bb = AABB(x - .05, -50, z - .05, x + .05, maxY, z + .05);
    const list = this.query(bb, []);
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ) {
        if (b.maxY <= maxY + .05 && b.maxY > best) best = b.maxY;
      }
    }
    return best;
  }
}

/* ---------------- ray vs AABB (slab method) ---------------- */
function rayBox(o, d, b, maxDist) {
  let tmin = 0, tmax = maxDist;
  let nx = 0, ny = 0, nz = 0;
  // X
  if (Math.abs(d.x) < 1e-9) { if (o.x < b.minX || o.x > b.maxX) return null; }
  else {
    const inv = 1 / d.x;
    let t1 = (b.minX - o.x) * inv, t2 = (b.maxX - o.x) * inv;
    let sign = -1;
    if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; sign = 1; }
    if (t1 > tmin) { tmin = t1; nx = sign; ny = 0; nz = 0; }
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return null;
  }
  // Y
  if (Math.abs(d.y) < 1e-9) { if (o.y < b.minY || o.y > b.maxY) return null; }
  else {
    const inv = 1 / d.y;
    let t1 = (b.minY - o.y) * inv, t2 = (b.maxY - o.y) * inv;
    let sign = -1;
    if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; sign = 1; }
    if (t1 > tmin) { tmin = t1; nx = 0; ny = sign; nz = 0; }
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return null;
  }
  // Z
  if (Math.abs(d.z) < 1e-9) { if (o.z < b.minZ || o.z > b.maxZ) return null; }
  else {
    const inv = 1 / d.z;
    let t1 = (b.minZ - o.z) * inv, t2 = (b.maxZ - o.z) * inv;
    let sign = -1;
    if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; sign = 1; }
    if (t1 > tmin) { tmin = t1; nx = 0; ny = 0; nz = sign; }
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return null;
  }
  if (tmin < 0 || tmin > maxDist) return null;
  return {
    t: tmin,
    point: { x: o.x + d.x * tmin, y: o.y + d.y * tmin, z: o.z + d.z * tmin },
    normal: { x: nx, y: ny, z: nz }
  };
}

/* ---------------- ray vs sphere ---------------- */
function raySphere(o, d, c, r, maxDist) {
  const ox = o.x - c.x, oy = o.y - c.y, oz = o.z - c.z;
  const b = ox * d.x + oy * d.y + oz * d.z;
  const cc = ox * ox + oy * oy + oz * oz - r * r;
  const disc = b * b - cc;
  if (disc < 0) return -1;
  const sq = Math.sqrt(disc);
  let t = -b - sq;
  if (t < 0) t = -b + sq;
  if (t < 0 || t > maxDist) return -1;
  return t;
}

/* ---------------- ray vs capsule (vertical, for limbs/full body) ---------------- */
function rayCapsuleY(o, d, base, height, r, maxDist) {
  // approximate: treat as a padded AABB — fast and good enough for hit detection
  const b = AABB(base.x - r, base.y, base.z - r, base.x + r, base.y + height, base.z + r);
  const h = rayBox(o, d, b, maxDist);
  return h ? h.t : -1;
}
