/* ============================================================
   09 — EFFECTS: tracers, decals, particles, blood, impact sparks
   ============================================================ */

/* Instanced-friendly particle pool using points+sprites is overkill;
   we use small meshes pooled per type (cheap at our scale). */
class Effects {
  constructor(scene, quality) {
    this.scene = scene;
    this.quality = quality;
    this.tracers = [];
    this.particles = [];
    this.decals = [];
    this.maxDecals = quality === 0 ? 40 : quality === 1 ? 90 : 150;
    this.maxParticles = quality === 0 ? 120 : quality === 1 ? 260 : 420;

    // tracer: thin elongated box reused from a pool
    this.tracerGeo = new THREE.BoxGeometry(.03, .03, 1);
    this.tracerMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false });
    this.tracerMat2 = new THREE.MeshBasicMaterial({ color: 0xffd070, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false });

    this.particleGeo = new THREE.BoxGeometry(1, 1, 1);
    this.bloodMat = new THREE.MeshBasicMaterial({ color: 0x8a1210 });
    this.sparkMat = new THREE.MeshBasicMaterial({ color: 0xffcc55, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
    this.smokeMat = new THREE.MeshBasicMaterial({ color: 0x9a9a94, transparent: true, opacity: .4, depthWrite: false });
    this.bananaMat = new THREE.MeshLambertMaterial({ color: 0xf2c93b, emissive: 0x3a2c08 });

    this.decalGeo = new THREE.PlaneGeometry(1, 1);
    this.decalMats = {
      concrete: new THREE.MeshBasicMaterial({ map: this._holeTexture(0x2a2724), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }),
      metal: new THREE.MeshBasicMaterial({ map: this._holeTexture(0x3a3d40), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }),
      blood: new THREE.MeshBasicMaterial({ map: this._bloodTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 })
    };

    this.tracerPool = [];
    this.particlePool = [];
    this._t = 0;
  }

  _holeTexture(col) {
    const c = makeCanvas(64); const x = c.getContext('2d');
    x.clearRect(0, 0, 64, 64);
    const g = x.createRadialGradient(32, 32, 1, 32, 32, 22);
    g.addColorStop(0, '#000');
    g.addColorStop(.55, 'rgba(20,18,16,.75)');
    g.addColorStop(1, 'rgba(40,36,32,0)');
    x.fillStyle = g; x.beginPath(); x.arc(32, 32, 22, 0, 7); x.fill();
    x.strokeStyle = 'rgba(120,112,102,.5)'; x.lineWidth = 2;
    x.beginPath(); x.arc(32, 32, 9, 0, 7); x.stroke();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  _bloodTexture() {
    const c = makeCanvas(64); const x = c.getContext('2d');
    x.clearRect(0, 0, 64, 64);
    const g = x.createRadialGradient(32, 32, 2, 32, 32, 26);
    g.addColorStop(0, 'rgba(150,10,8,.95)');
    g.addColorStop(.5, 'rgba(110,8,6,.7)');
    g.addColorStop(1, 'rgba(80,4,4,0)');
    x.fillStyle = g; x.beginPath(); x.arc(32, 32, 26, 0, 7); x.fill();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }

  /* ---------- tracer ---------- */
  tracer(from, to, thick, bright) {
    if (this.tracers.length > 60) return;
    let m = this.tracerPool.pop();
    if (!m) { m = new THREE.Mesh(this.tracerGeo, this.tracerMat.clone()); }
    const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len < .05) { this.tracerPool.push(m); return; }
    m.material = (bright === false ? this.tracerMat2 : this.tracerMat).clone();
    m.material.opacity = .9;
    m.position.set((from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2);
    m.scale.set(thick || 1, thick || 1, len);
    m.lookAt(to.x, to.y, to.z);
    m.visible = true;
    this.scene.add(m);
    this.tracers.push({ mesh: m, life: .055, max: .055 });
  }

  /* ---------- laser beam: a bright green core with a soft outer glow ---------- */
  laser(from, to) {
    const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len < .05) return;
    const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2, z: (from.z + to.z) / 2 };
    // two nested beams (thin bright core + wide translucent halo)
    const layers = [
      { r: .012, opacity: 1, additive: true, life: .12 },
      { r: .05, opacity: .55, additive: true, life: .18 }
    ];
    for (const L of layers) {
      let m = (this.laserPool || (this.laserPool = [])).pop();
      if (!m) m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 8), new THREE.MeshBasicMaterial({ color: 0x39ff6a }));
      m.material = this._tintMat(0x39ff6a, L.additive);
      m.material.opacity = L.opacity;
      m.position.set(mid.x, mid.y, mid.z);
      m.scale.set(L.r, len, L.r);
      m.lookAt(to.x, to.y, to.z);
      m.rotateX(Math.PI / 2);              // cylinder axis → along the beam
      m.visible = true;
      m.renderOrder = 3;
      this.scene.add(m);
      (this.lasers || (this.lasers = [])).push({ mesh: m, life: L.life, max: L.life });
    }
    // a green flash at the muzzle and at the impact point
    this.particle(from.x, from.y, from.z, 0, 0, 0, .30, 'spark', .14);
    const hit = this.particle(to.x, to.y, to.z, 0, 0, 0, .34, 'spark', .18);
    if (hit) hit.material = this._tintMat(0x39ff6a, true);
  }

  /* ---------- continuous beam (laser cannon) ----------
     One persistent mesh per colour, repositioned every frame while the trigger
     is held. `hold` keeps it alive for this frame; without it the beam hides. */
  holdBeam(from, to, color) {
    if (!this._beam) {
      this._beam = new THREE.Group();
      // hot white-ish core
      this._beamCore = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 10),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .95, blending: THREE.AdditiveBlending, depthWrite: false }));
      // coloured body
      this._beamBody = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 12),
        new THREE.MeshBasicMaterial({ color: 0xff6a2a, transparent: true, opacity: .6, blending: THREE.AdditiveBlending, depthWrite: false }));
      // soft wide halo
      this._beamGlow = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 12),
        new THREE.MeshBasicMaterial({ color: 0xff6a2a, transparent: true, opacity: .26, blending: THREE.AdditiveBlending, depthWrite: false }));
      for (const m of [this._beamCore, this._beamBody, this._beamGlow]) m.renderOrder = 3;
      this._beam.add(this._beamGlow); this._beam.add(this._beamBody); this._beam.add(this._beamCore);
      this.scene.add(this._beam);
    }
    const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len < .05) { this._beam.visible = false; return; }
    this._beam.visible = true;
    const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2, z: (from.z + to.z) / 2 };
    const layers = [[this._beamCore, .028, .95], [this._beamBody, .075, .6], [this._beamGlow, .16, .26]];
    for (const [m, r, op] of layers) {
      m.position.set(mid.x, mid.y, mid.z);
      m.scale.set(r, len, r);
      m.lookAt(to.x, to.y, to.z);
      m.rotateX(Math.PI / 2);
      m.material.opacity = op;
    }
    const c = color || 0xff6a2a;
    this._beamBody.material.color.setHex(c);
    this._beamGlow.material.color.setHex(c);
    // sparks at the point of contact, refreshed every frame
    this.particle(to.x, to.y, to.z, U.rand(-3, 3), U.rand(2, 8), U.rand(-3, 3), U.rand(.08, .2), 'spark', U.rand(.15, .35));
  }

  endBeam() { if (this._beam) this._beam.visible = false; }

  /* ---------- particles ---------- */
  particle(x, y, z, vx, vy, vz, size, type, life) {
    if (this.particles.length > this.maxParticles) return null;
    let m = this.particlePool.pop();
    const mat = type === 'blood' ? this.bloodMat : type === 'smoke' ? this.smokeMat
      : type === 'banana' ? this.bananaMat : this.sparkMat;
    if (!m) m = new THREE.Mesh(this.particleGeo, mat);
    m.material = mat;
    m.position.set(x, y, z);
    m.scale.setScalar(size);
    m.visible = true;
    if (m.parent !== this.scene) this.scene.add(m);
    this.particles.push({ mesh: m, vx, vy, vz, life: life, max: life, grav: type === 'smoke' ? -1.5 : 16, type });
    return m;
  }

  /* comedic banana explosion: yellow chunks + a green peel fleck */
  bananaSplat(x, y, z) {
    for (let i = 0; i < 14; i++) {
      this.particle(x, y, z,
        U.rand(-4, 4), U.rand(1.5, 6), U.rand(-4, 4),
        U.rand(.06, .17), 'banana', U.rand(.4, .9));
    }
    for (let i = 0; i < 4; i++) {
      this.particle(x, y, z, U.rand(-2.5, 2.5), U.rand(1, 4), U.rand(-2.5, 2.5), U.rand(.05, .1), 'smoke', U.rand(.4, .8));
    }
  }

  bloodBurst(pos, dir, amount) {
    amount = amount || 8;
    for (let i = 0; i < amount; i++) {
      this.particle(pos.x, pos.y, pos.z,
        dir.x * U.rand(1, 5) + U.rand(-2.5, 2.5),
        U.rand(1.5, 5),
        dir.z * U.rand(1, 5) + U.rand(-2.5, 2.5),
        U.rand(.05, .16), 'blood', U.rand(.35, .8));
    }
    // blood decal on the ground below
    this.decal(pos.x, .02, pos.z, 0, -1, 0, U.rand(1.1, 2.0), 'blood');
  }

  impact(pos, normal, surface) {
    const n = normal || { x: 0, y: 1, z: 0 };
    for (let i = 0; i < 5; i++) {
      this.particle(pos.x, pos.y, pos.z,
        n.x * U.rand(1, 5) + U.rand(-2, 2),
        n.y * U.rand(1, 5) + U.rand(0, 3),
        n.z * U.rand(1, 5) + U.rand(-2, 2),
        U.rand(.03, .09), 'spark', U.rand(.12, .3));
    }
    for (let i = 0; i < 3; i++) {
      this.particle(pos.x, pos.y, pos.z,
        n.x * U.rand(.4, 2) + U.rand(-1, 1), U.rand(.6, 2.2), n.z * U.rand(.4, 2) + U.rand(-1, 1),
        U.rand(.12, .28), 'smoke', U.rand(.4, .9));
    }
    this.decal(pos.x, pos.y, pos.z, n.x, n.y, n.z, U.rand(.22, .34), surface === 'metal' ? 'metal' : 'concrete');
  }

  /* ---------- decals ---------- */
  decal(x, y, z, nx, ny, nz, size, kind) {
    if (this.decals.length >= this.maxDecals) {
      const old = this.decals.shift();
      this.scene.remove(old);
      if (old.material) old.material = null;
    }
    const mat = this.decalMats[kind === 'blood' ? 'blood' : kind === 'metal' ? 'metal' : 'concrete'];
    const m = new THREE.Mesh(this.decalGeo, mat);
    m.position.set(x + nx * .012, y + ny * .012, z + nz * .012);
    // orient the plane along the surface normal
    const up = new THREE.Vector3(0, 1, 0);
    const nv = new THREE.Vector3(nx, ny, nz);
    if (Math.abs(ny) > .9) {
      m.rotation.x = ny > 0 ? -Math.PI / 2 : Math.PI / 2;
      m.rotation.z = U.rand(0, 6.28);
    } else {
      m.lookAt(new THREE.Vector3(x + nx, y + ny, z + nz));
      m.rotateZ(U.rand(0, 6.28));
    }
    m.rotation.z += U.rand(0, 6.28);
    m.scale.set(size, size, 1);
    m.renderOrder = 2;
    this.scene.add(m);
    this.decals.push(m);
    m.userData.birth = this._t;
    m.userData.ttl = kind === 'blood' ? 22 : 16;
  }

  /* cached tinted materials for coloured explosions (avoid per-blast leaks) */
  _tintMat(color, additive) {
    this._tintCache = this._tintCache || {};
    const key = color + (additive ? 'a' : 's');
    if (!this._tintCache[key]) {
      this._tintCache[key] = new THREE.MeshBasicMaterial({
        color: color, transparent: true, depthWrite: false,
        opacity: additive ? 1 : .55,
        blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending
      });
    }
    return this._tintCache[key];
  }

  /* ---------- explosion / grenade-ish ----------
     `tint` optionally recolours the blast (e.g. the atomic RPG's green/black);
     `nuke` additionally spawns the mushroom cloud + tornado FX. */
  explosion(x, y, z, radius, tint, nuke) {
    const sparkMat = tint ? this._tintMat(tint[0], true) : null;
    const smokeMat = tint ? this._tintMat(tint[1], false) : null;
    for (let i = 0; i < 30; i++) {
      const a = U.rand(0, 6.28), e = U.rand(-.3, 1);
      const p = this.particle(x, y, z, Math.cos(a) * U.rand(2, 12), e * U.rand(3, 12), Math.sin(a) * U.rand(2, 12),
        U.rand(.15, .5), 'spark', U.rand(.3, .8));
      if (sparkMat && p) p.material = sparkMat;
    }
    for (let i = 0; i < 16; i++) {
      const p = this.particle(x, y, z, U.rand(-3, 3), U.rand(1, 5), U.rand(-3, 3), U.rand(.3, .8), 'smoke', U.rand(.8, 1.8));
      if (smokeMat && p) p.material = smokeMat;
    }
    const light = new THREE.PointLight(tint ? tint[0] : 0xffaa44, 60, radius * 3, 2);
    light.position.set(x, y, z);
    this.scene.add(light);
    this.particles.push({ mesh: light, light: true, life: .22, max: .22, vx: 0, vy: 0, vz: 0, grav: 0 });
    if (nuke) this.nukeFx(x, y, z);
  }

  /* ---------- nuclear FX: a green/black mushroom cloud + a spinning tornado ----------
     Purely cosmetic. Both groups start invisible (scale 0 + opacity 0) and ease
     in over `grow`, then hold, then ease out — so nothing pops into existence. */
  nukeFx(x, y, z) {
    const GREEN = 0x39ff5a, DARK = 0x0b1a0e, MID = 0x1e3d24;
    // per-instance materials so the FX can fade its opacity independently
    const mkMat = (color, op) => new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: op, depthWrite: false });
    const matGreen = mkMat(GREEN, 0), matMid = mkMat(MID, 0), matDark = mkMat(DARK, 0);
    const mats = [matGreen, matMid, matDark];

    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.scale.setScalar(.02);                    // start as a point and grow
    g.visible = true;

    // --- mushroom: a rising stalk of rings, topped by a swelling cap ---
    const stalk = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const r = .9 + i * .35;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, .34, 6, 18), i % 2 ? matDark : matMid);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 1.0 + i * .9;
      stalk.add(ring);
    }
    const cap = new THREE.Mesh(new THREE.SphereGeometry(3.4, 14, 10), matGreen);
    cap.position.y = 7.4;
    cap.scale.set(1, .62, 1);
    stalk.add(cap);
    // a second, darker dome just under the cap for shading
    const cap2 = new THREE.Mesh(new THREE.SphereGeometry(4.3, 14, 10), matDark);
    cap2.position.y = 6.6;
    cap2.scale.set(1.15, .42, 1.15);
    stalk.add(cap2);
    g.add(stalk);

    // --- tornado: glowing spiral RIBBONS (like a twisted light funnel) ---
    const tornado = new THREE.Group();
    const glowGreen = new THREE.MeshBasicMaterial({ color: 0x39ff5a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const glowPale = new THREE.MeshBasicMaterial({ color: 0xa8ffc4, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const glowDark = new THREE.MeshBasicMaterial({ color: 0x1e8a3a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    mats.push(glowGreen, glowPale, glowDark);

    // build one helical strand as a tube through a spiral curve
    const spiralStrand = (opts) => {
      const pts = [];
      const N = 34;
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const ang = opts.phase + t * opts.turns * Math.PI * 2;
        // radius profile: wide base, a pinched "waist", then a flared crown —
        // this gives the twisted ribbon the pinched silhouette of the reference
        const waist = opts.r0 + Math.sin(t * Math.PI) * opts.waist + t * opts.grow;
        const r = waist + Math.sin(t * 6 + opts.phase) * opts.wobble;
        pts.push(new THREE.Vector3(Math.cos(ang) * r, opts.y0 + t * opts.height, Math.sin(ang) * r));
      }
      // a small horizontal flourish near the very top, like a curl of smoke
      const top = pts[pts.length - 1];
      for (let i = 1; i <= 6; i++) {
        const a = opts.phase + (opts.turns + i * .12) * Math.PI * 2;
        const r = opts.r0 + opts.grow + Math.sin(i * .5) * opts.waist * .5;
        pts.push(new THREE.Vector3(Math.cos(a) * r, top.y + i * .12, Math.sin(a) * r));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      const geo = new THREE.TubeGeometry(curve, 84, opts.thick, 6, false);
      return new THREE.Mesh(geo, opts.mat);
    };

    // a few thick ribbons + thin bright strands, each wound a bit differently
    const ribbons = [
      { turns: 1.35, r0: .9, grow: 1.7, waist: -.55, wobble: .22, y0: .3, height: 6.2, thick: .17, phase: 0.0, mat: glowDark },
      { turns: 1.55, r0: 1.1, grow: 1.9, waist: -.45, wobble: .26, y0: .4, height: 6.6, thick: .15, phase: 1.4, mat: glowGreen },
      { turns: 1.15, r0: .8, grow: 2.1, waist: -.60, wobble: .20, y0: .2, height: 6.0, thick: .13, phase: 2.6, mat: glowGreen }
    ];
    for (const o of ribbons) tornado.add(spiralStrand(o));
    // bright thin highlights woven through them
    for (let i = 0; i < 4; i++) {
      tornado.add(spiralStrand({
        turns: 1.5 + Math.random() * .5, r0: .85 + Math.random() * .5, grow: 1.6 + Math.random() * .9,
        waist: -.5, wobble: .18, y0: .3 + Math.random() * .5, height: 5.6 + Math.random() * 1.4,
        thick: .05, phase: i * 1.7, mat: glowPale
      }));
    }
    const spin = [];
    g.add(tornado);

    this.scene.add(g);
    const light = new THREE.PointLight(GREEN, 0, 60, 2);
    light.position.set(x, y + 4, z);
    this.scene.add(light);

    (this.nukes || (this.nukes = [])).push({
      group: g, stalk: stalk, cap: cap, tornado: tornado, spin: spin, light: light, mats: mats,
      life: 3.6, max: 3.6, grow: .7, die: 1.1
    });
  }

  muzzleSmoke(x, y, z, dir) {
    for (let i = 0; i < 2; i++) {
      this.particle(x + dir.x * .2, y + dir.y * .2, z + dir.z * .2,
        dir.x * 3 + U.rand(-1, 1), .8 + U.rand(0, 1), dir.z * 3 + U.rand(-1, 1),
        U.rand(.06, .14), 'smoke', U.rand(.25, .5));
    }
  }

  update(dt) {
    this._t += dt;
    // tracers
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= dt;
      if (t.life <= 0) {
        t.mesh.visible = false;
        if (t.mesh.parent) t.mesh.parent.remove(t.mesh);
        this.tracerPool.push(t.mesh);
        this.tracers.splice(i, 1);
      } else {
        t.mesh.material.opacity = (t.life / t.max) * .9;
      }
    }
    // laser beams
    if (this.lasers) {
      for (let i = this.lasers.length - 1; i >= 0; i--) {
        const L = this.lasers[i];
        L.life -= dt;
        if (L.life <= 0) {
          if (L.mesh.parent) L.mesh.parent.remove(L.mesh);
          this.laserPool.push(L.mesh);
          this.lasers.splice(i, 1);
        } else {
          L.mesh.material.opacity = (L.life / L.max);
        }
      }
    }
    // nuclear FX: eases in (grow + fade up), holds, then eases out
    if (this.nukes) {
      for (let i = this.nukes.length - 1; i >= 0; i--) {
        const n = this.nukes[i];
        n.life -= dt;
        const age = n.max - n.life;
        // eased in/out factors (0→1): smoothstep for the grow, smoothstep for the end
        const gin = U.clamp(age / n.grow, 0, 1);
        const grow = gin * gin * (3 - 2 * gin);                  // smoothstep
        const dout = U.clamp(n.life / n.die, 0, 1);
        const fade = dout * dout * (3 - 2 * dout);               // smoothstep
        const appear = grow * fade;                              // combined envelope
        // the whole effect scales up from a point instead of popping in
        n.group.scale.setScalar(.02 + appear * .98);
        // and its opacity eases up and back down
        for (const m of n.mats) m.opacity = appear * .85;
        // stalk/cloud swelling on top of the global growth
        const k = U.clamp(age / n.max, 0, 1);
        n.stalk.scale.set(0.7 + k * .5, 0.7 + k * .6, 0.7 + k * .5);
        n.cap.scale.setScalar(.75 + k * .35);
        n.cap.position.y = 7.4 + k * 1.0;
        // tornado spins steadily and drifts slightly upward
        n.tornado.rotation.y += dt * 3.4;
        n.tornado.position.y = k * 1.0;
        for (const ring of n.spin) ring.rotation.z += dt * ring.userData.spin;
        if (n.light) n.light.intensity = 80 * appear;
        if (n.life <= 0) {
          n.group.traverse(o => { if (o.geometry) o.geometry.dispose(); });
          if (n.mats) n.mats.forEach(m => m.dispose());
          this.scene.remove(n.group);
          if (n.light && n.light.parent) n.light.parent.remove(n.light);
          this.nukes.splice(i, 1);
        }
      }
    }
    // particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        if (p.light) {
          if (p.mesh.parent) p.mesh.parent.remove(p.mesh);
        } else {
          p.mesh.visible = false;
          if (p.mesh.parent) p.mesh.parent.remove(p.mesh);
          this.particlePool.push(p.mesh);
        }
        this.particles.splice(i, 1);
        continue;
      }
      if (p.light) {
        p.mesh.intensity = 60 * (p.life / p.max);
        continue;
      }
      p.vy -= p.grav * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      if (p.mesh.position.y < .02) {
        p.mesh.position.y = .02;
        p.vx *= .4; p.vz *= .4; p.vy = 0;
      }
      if (p.type === 'smoke') {
        p.mesh.scale.multiplyScalar(1 + dt * 1.8);
        if (p.mesh.material.opacity !== undefined && p.mesh.material === this.smokeMat) { }
      }
      if (p.life < .25 && p.mesh.material && p.mesh.material.opacity !== undefined && p.type === 'spark') {
        p.mesh.material = p.mesh.material; // shared material; fade via scale
        p.mesh.scale.multiplyScalar(.88);
      }
    }
    // decal fade
    for (let i = this.decals.length - 1; i >= 0; i--) {
      const d = this.decals[i];
      const age = this._t - d.userData.birth;
      if (age > d.userData.ttl) {
        this.scene.remove(d); this.decals.splice(i, 1);
      } else if (age > d.userData.ttl - 3) {
        // fade by shrinking slightly (shared materials → avoid per-decal opacity churn)
        const k = (d.userData.ttl - age) / 3;
        d.scale.x = d.userData.baseSize ? d.userData.baseSize * k : d.scale.x;
      }
    }
  }

  clear() {
    this.tracers.forEach(t => { if (t.mesh.parent) t.mesh.parent.remove(t.mesh); this.tracerPool.push(t.mesh); });
    this.tracers.length = 0;
    if (this.lasers) { this.lasers.forEach(L => { if (L.mesh.parent) L.mesh.parent.remove(L.mesh); }); this.lasers.length = 0; }
    if (this.nukes) {
      this.nukes.forEach(n => {
        n.group.traverse(o => { if (o.geometry) o.geometry.dispose(); });
        if (n.group.parent) n.group.parent.remove(n.group);
        if (n.light && n.light.parent) n.light.parent.remove(n.light);
      });
      this.nukes.length = 0;
    }
    this.particles.forEach(p => { if (!p.light && p.mesh.parent) p.mesh.parent.remove(p.mesh); if (!p.light) this.particlePool.push(p.mesh); else if (p.mesh.parent) p.mesh.parent.remove(p.mesh); });
    this.particles.length = 0;
    this.decals.forEach(d => this.scene.remove(d));
    this.decals.length = 0;
    if (this._beam) {
      this._beam.traverse(o => { if (o.geometry) o.geometry.dispose(); });
      if (this._beam.parent) this._beam.parent.remove(this._beam);
      this._beam = null;
    }
    if (this.tracerPool.length > 80) this.tracerPool.length = 80;
    if (this.particlePool.length > 300) this.particlePool.length = 300;
  }
}
