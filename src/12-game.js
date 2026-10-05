/* ============================================================
   12 — GAME: renderer, modes, combat, round flow, main loop
   ============================================================ */

/* ---------------- soldier avatar for online play ----------------
   A more detailed fighter than the original stack of boxes: tapered chest with a
   plate carrier, shoulder pads, belt pouches, a backpack, a proper helmet with
   brim and goggles, jointed arms and legs with boots and gloves.
   The bone names stay the same (torso/head/armL/armR/legL/legR) because the
   animation code drives those pivots directly. */
function buildSoldierMesh(team) {
  const main = team === 'ct' ? 0x3f6ea8 : 0xa8623f;
  const dark = team === 'ct' ? 0x2c4d76 : 0x7a452c;   // shaded variant of the team colour
  const bodyMat = new THREE.MeshLambertMaterial({ color: main });
  const bodyMat2 = new THREE.MeshLambertMaterial({ color: dark });
  const vestMat = new THREE.MeshLambertMaterial({ color: 0x2a2f36 });
  const vestMat2 = new THREE.MeshLambertMaterial({ color: 0x3a424c });
  const skinMat = new THREE.MeshLambertMaterial({ color: 0xd8a878 });
  const headMat = new THREE.MeshLambertMaterial({ color: 0x33383f });
  const gloveMat = new THREE.MeshLambertMaterial({ color: 0x22262b });
  const bootMat = new THREE.MeshLambertMaterial({ color: 0x1b1f23 });
  const strapMat = new THREE.MeshLambertMaterial({ color: 0x14171a });
  const metalMat = new THREE.MeshLambertMaterial({ color: 0x8b939d });

  const g = new THREE.Group();

  const box = (w, h, d, mat, x, y, z, rot) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x || 0, y || 0, z || 0);
    if (rot) { m.rotation.x = rot.x || 0; m.rotation.y = rot.y || 0; m.rotation.z = rot.z || 0; }
    m.castShadow = true; m.receiveShadow = true;
    return m;
  };
  const cyl = (r1, r2, h, seg, mat, x, y, z, rot) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg || 8), mat);
    m.position.set(x || 0, y || 0, z || 0);
    if (rot) { m.rotation.x = rot.x || 0; m.rotation.y = rot.y || 0; m.rotation.z = rot.z || 0; }
    m.castShadow = true; m.receiveShadow = true;
    return m;
  };
  /* a limb pivot: the limb hangs from the pivot along -Y, so the existing
     animation (rotation.x on the pivot) swings it naturally */
  const limb = (px, py, pz) => {
    const p = new THREE.Group(); p.position.set(px, py, pz);
    return p;
  };

  const parts = {};

  /* ---------------- torso ---------------- */
  const torso = new THREE.Group(); torso.position.y = 1.06;
  torso.add(box(.50, .40, .28, bodyMat, 0, .24, 0));              // upper chest
  torso.add(box(.54, .26, .30, bodyMat2, 0, -.01, 0));            // lower ribs
  torso.add(box(.58, .40, .34, vestMat, 0, .22, 0));              // plate carrier
  torso.add(box(.16, .26, .06, vestMat2, 0, .24, -.19));          // front plate detail
  torso.add(box(.10, .10, .04, strapMat, -.15, .30, -.20));       // pouch
  torso.add(box(.10, .10, .04, strapMat, .15, .30, -.20));        // pouch
  torso.add(box(.46, .10, .32, strapMat, 0, .00, 0));             // belt
  torso.add(box(.12, .09, .10, vestMat2, -.13, -.02, -.17));      // belt pouch
  torso.add(box(.12, .09, .10, vestMat2, .13, -.02, -.17));       // belt pouch
  torso.add(box(.44, .30, .28, vestMat, 0, -.26, 0));             // pelvis
  torso.add(box(.32, .30, .16, vestMat2, 0, .20, .22));           // backpack
  torso.add(box(.36, .06, .18, strapMat, 0, .34, .20));           // pack lid
  // shoulder pads
  torso.add(box(.18, .13, .26, vestMat2, -.30, .38, 0));
  torso.add(box(.18, .13, .26, vestMat2, .30, .38, 0));
  g.add(torso); parts.torso = torso;

  /* ---------------- head ---------------- */
  const head = new THREE.Group(); head.position.y = 1.56;
  head.add(cyl(.075, .075, .12, 8, skinMat, 0, -.20, 0));         // neck
  head.add(box(.26, .30, .26, skinMat, 0, 0, 0));                 // head
  head.add(box(.28, .10, .27, headMat, 0, -.09, 0));              // balaclava / jaw wrap
  head.add(box(.30, .18, .31, headMat, 0, .12, 0));               // helmet shell
  head.add(box(.33, .05, .34, headMat, 0, .045, 0));              // helmet rim
  head.add(box(.10, .04, .10, headMat, 0, .055, -.19));           // brim
  head.add(box(.22, .07, .03, new THREE.MeshBasicMaterial({ color: 0x1b2a3a }), 0, .035, -.155)); // goggles
  head.add(box(.05, .03, .06, metalMat, -.14, .12, -.05));        // side mount
  g.add(head); parts.head = head;

  /* ---------------- arms (shoulder pivot → ELBOW pivot) ---------------- */
  const arm = (side) => {
    const p = limb(side * .33, 1.40, 0);                 // shoulder pivot
    p.add(box(.15, .30, .16, bodyMat, 0, -.15, 0));      // upper arm
    p.add(box(.14, .16, .15, bodyMat2, 0, -.30, 0));     // elbow joint block
    // forearm + glove live in their OWN pivot at the elbow, so the arm can bend
    const lower = new THREE.Group(); lower.position.set(0, -.34, 0);
    lower.add(box(.13, .30, .14, bodyMat, 0, -.16, 0));  // forearm
    lower.add(box(.14, .12, .15, gloveMat, 0, -.33, -.01)); // glove
    p.add(lower);
    p.userData.lower = lower;
    return p;
  };
  parts.armL = arm(-1);
  parts.armR = arm(1);
  g.add(parts.armL); g.add(parts.armR);

  /* ---------------- legs (hip pivot → KNEE pivot) ---------------- */
  const leg = (side) => {
    const p = limb(side * .14, .88, 0);                  // hip pivot
    p.add(box(.20, .34, .21, vestMat2, 0, -.17, 0));     // thigh
    p.add(box(.18, .14, .19, bootMat, 0, -.34, 0));      // knee pad
    const lower = new THREE.Group(); lower.position.set(0, -.40, 0);   // knee pivot
    lower.add(box(.18, .32, .19, bodyMat2, 0, -.16, 0));  // shin
    lower.add(box(.20, .12, .26, bootMat, 0, -.34, -.03)); // boot
    p.add(lower);
    p.userData.lower = lower;
    return p;
  };
  parts.legL = leg(-1);
  parts.legR = leg(1);
  g.add(parts.legL); g.add(parts.legR);

  g.userData.parts = parts;
  return g;
}

/* ---------------- held weapon for a remote player ----------------
   The same weapon models the player sees in first person, cloned and cached by
   weapon id. Without a skin the clone shares the cached (shared) materials, so
   building one per player is cheap. WITH a skin the clone must own its materials
   (a shared material would leak one player's paint onto everyone), so the
   materials are duplicated and the skin is applied only to that copy. */
const _soldierGunCache = {};
function _soldierGunBase(id) {
  if (!_soldierGunCache[id]) {
    const g = buildWeaponModel(id);
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
    _soldierGunCache[id] = g;
  }
  return _soldierGunCache[id];
}
function buildSoldierWeapon(id, skinId) {
  const base = _soldierGunBase(id);
  const clone = base.clone(true);
  if (!skinId) return clone;                 // no skin: shares materials with the cache
  const sk = skinById(skinId);
  if (!sk) return clone;
  // give this clone its OWN materials so the paint cannot bleed onto the cache
  clone.traverse(o => { if (o.isMesh && o.material) o.material = o.material.clone(); });
  applyWeaponSkin(clone, sk);
  return clone;
}

/* ---- how a remote player should HOLD each weapon ----
   Returns the arm angles and the weapon offset that make the gun read as held
   by BOTH hands instead of stuck to the end of one arm. The soldier's arms hang
   from the shoulder pivot, so a POSITIVE rotation.x raises them forward.
   `reachL` brings the left hand down onto the handguard; `wpos`/`wrot` seat the
   gun at the right hand and angle it a little across the chest. */
/* Цвета цветочных снарядов «Господина цветов» (радужный град). */
const FLOWER_PROJ_COLORS = [0xff5d8f, 0xffd23f, 0x5dd6ff, 0x9b6bff, 0x66e06a, 0xff9d3f];

/* Случайная реплика из набора (войсклипы Флауэра). */
function pickFlowerVoice(list) {
  if (!list || !list.length) return '';
  const ok = list.filter(v => !!v);
  if (!ok.length) return '';
  return ok[(Math.random() * ok.length) | 0];
}

function weaponHoldPose(id) {
  const w = WEAPONS[id] || {};
  const cat = w.cat || 'rifle';
  const twoHanded = !(cat === 'pistol' || cat === 'melee');
  // how far the gun is pushed forward: long guns sit further out
  const len = (w.range || 60) > 120 ? 1.10 : (cat === 'sniper' || cat === 'lmg') ? 1.06 : 1.0;
  const pose = {
    reachR: 1.32,               // right (trigger) arm — always raised forward
    reachL: twoHanded ? 1.62 : 0.85,   // left arm reaches the handguard
    yawL: twoHanded ? 0.42 : 0.16,     // left arm swings in across the body
    yawR: -0.10,
    elbowR: 0.55, elbowL: twoHanded ? 0.95 : 0.5,   // bend at the elbow
    wpos: { x: .02, y: -.50, z: -.10 * len },
    wrot: { x: -Math.PI / 2, y: 0.06, z: -0.05 },
    scale: .95
  };
  if (cat === 'pistol') {
    // one-handed pistol: gun centred in the right hand, close to the body
    pose.reachR = 1.28; pose.reachL = 1.15; pose.yawL = 0.30;
    pose.elbowR = 0.9; pose.elbowL = 0.9;
    pose.wpos = { x: .0, y: -.52, z: 0 };
    pose.wrot = { x: -Math.PI / 2, y: 0.0, z: 0.0 };
  } else if (cat === 'heavy') {
    // big launchers/miniguns are braced: left hand well forward and under
    pose.reachR = 1.30; pose.reachL = 1.70; pose.yawL = 0.5;
    pose.elbowR = 0.45; pose.elbowL = 0.8;
    pose.wpos = { x: .05, y: -.56, z: -.14 };
  } else if (cat === 'exp') {
    // experimental launchers are braced like the heavy guns
    pose.reachR = 1.30; pose.reachL = 1.66; pose.yawL = 0.48;
    pose.elbowR = 0.5; pose.elbowL = 0.85;
    pose.wpos = { x: .04, y: -.55, z: -.13 };
  } else if (cat === 'sniper' || cat === 'lmg') {
    pose.reachR = 1.34; pose.reachL = 1.66; pose.yawL = 0.46;
    pose.elbowR = 0.5; pose.elbowL = 0.85;
    pose.wpos = { x: .03, y: -.52, z: -.16 };
  }
  return pose;
}

function makeNameplate(text) {
  const c = makeCanvas(256); c.height = 64;
  const x = c.getContext('2d');
  x.clearRect(0, 0, 256, 64);
  x.fillStyle = 'rgba(0,0,0,.55)';
  x.fillRect(0, 0, 256, 64);
  x.fillStyle = '#ff9d21';
  x.font = 'bold 34px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(String(text).slice(0, 16), 128, 34, 244);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: true }));
  sp.scale.set(2.4, .6, 1);
  return sp;
}

/* ---------------- training dummy (test range) ---------------- */

/* Floating DPS readout that hovers above a dummy. It is a canvas sprite whose
   texture is redrawn ~6x/s (cheap) with the rolling damage-per-second value. */
function makeDpsLabel() {
  const c = makeCanvas(512); c.height = 128;
  const x = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sp.scale.set(3.2, .8, 1);
  sp.renderOrder = 10;
  sp.userData.ctx = x; sp.userData.canvas = c; sp.userData.tex = tex;
  sp.userData.draw = (dps, peak, total) => {
    x.clearRect(0, 0, 512, 128);
    x.fillStyle = 'rgba(6,9,12,.78)';
    x.strokeStyle = dps > 0 ? 'rgba(255,157,33,.9)' : 'rgba(120,140,160,.5)';
    x.lineWidth = 4;
    if (x.roundRect) { x.beginPath(); x.roundRect(6, 6, 500, 116, 14); x.fill(); x.stroke(); }
    else { x.fillRect(6, 6, 500, 116); x.strokeRect(6, 6, 500, 116); }
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = '#8b98a5';
    x.font = 'bold 24px Arial';
    x.fillText('УРОН В СЕКУНДУ', 256, 32);
    x.fillStyle = dps > 0 ? '#ff9d21' : '#5d6873';
    x.font = 'bold 56px Arial';
    x.fillText(dps > 0 ? dps.toFixed(0) + ' / с' : '— / с', 256, 78);
    x.font = 'bold 18px Arial';
    x.fillStyle = '#5d6873';
    x.fillText('макс ' + peak.toFixed(0) + '  ·  всего ' + total.toFixed(0), 256, 112);
    tex.needsUpdate = true;
  };
  sp.userData.draw(0, 0, 0);
  return sp;
}

/* ---------------- aim-training target ---------------- */

/* Round target board texture: concentric scoring rings. */
function makeTargetTexture() {
  const c = makeCanvas(128);
  const x = c.getContext('2d');
  const rings = ['#e8ecef', '#e33a2e', '#e8ecef', '#e33a2e', '#f5d33c'];
  for (let i = 0; i < rings.length; i++) {
    x.fillStyle = rings[i];
    x.beginPath(); x.arc(64, 64, 62 - i * 12, 0, Math.PI * 2); x.fill();
  }
  x.fillStyle = '#12161a';
  x.beginPath(); x.arc(64, 64, 4, 0, Math.PI * 2); x.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

let _targetTex = null;
function buildTargetMesh() {
  if (!_targetTex) _targetTex = makeTargetTexture();
  const g = new THREE.Group();
  const face = new THREE.Mesh(
    new THREE.CircleGeometry(.5, 26),
    new THREE.MeshLambertMaterial({ map: _targetTex, side: THREE.DoubleSide, emissive: 0x666666, emissiveMap: _targetTex })
  );
  g.add(face);
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(.51, .05, 8, 24),
    new THREE.MeshLambertMaterial({ color: 0x2b2f34 })
  );
  g.add(rim);
  // a thin backing so it is visible from behind too
  const back = new THREE.Mesh(
    new THREE.CircleGeometry(.5, 26),
    new THREE.MeshLambertMaterial({ color: 0x3a4046, side: THREE.DoubleSide })
  );
  back.position.z = -.02;
  g.add(back);
  g.userData.face = face;
  return g;
}

/* A drifting practice target: chaos-moving, pops when hit, then respawns.
   Kept intentionally standalone (not a Zombie) because it needs none of the
   horde AI — only the small interface that horde.raycast() reads. */
class Target {
  constructor(x, y, z, radius) {
    this.id = 'target';
    this.isTarget = true;              // the horde must never reap practices
    this.isTargetOnRange = true;       // bullets score these instead of damaging
    this.pos = { x, y, z };
    this.yaw = 0;
    this.alive = true;
    this.dying = false;
    this.deadT = 0;
    this.radius = radius || .5;
    this.anchor = { x, y, z };
    this.range = 2.6;                    // how far it may drift from its anchor
    this.speed = 2.2 + Math.random() * 2.4;
    this.vel = { x: 0, y: 0, z: 0 };
    this.wanderT = 0;
    this.hitFlash = 0;
    this.respawnT = 0;
    this.group = buildTargetMesh();
    this.group.scale.setScalar(this.radius / .5);
    this.group.position.set(x, y, z);
  }

  /* One symmetric box: orientation-independent, so the board can always face
     the player for looks without affecting hit detection. */
  hitboxDefs() {
    const r = this.radius;
    return [{ part: 'body', cx: 0, cy: 0, cz: 0, hw: r, hh: r, hd: r }];
  }

  takeDamage() { return false; }   // scoring happens in Game.onTargetHit

  pop() {
    this.alive = false;
    this.dying = true;
    this.deadT = 0;
    this.group.visible = false;
  }

  respawn(x, y, z, radius) {
    this.pos.x = x; this.pos.y = y; this.pos.z = z;
    this.anchor.x = x; this.anchor.y = y; this.anchor.z = z;
    this.radius = radius;
    this.group.scale.setScalar(radius / .5);
    this.group.visible = true;
    this.alive = true; this.dying = false; this.deadT = 0;
    this.vel.x = this.vel.y = this.vel.z = 0;
    this.hitFlash = 0;
  }

  update(dt, ctx) {
    dt = dt || 0;
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    if (!this.alive) { this.deadT += dt; return; }

    // chaotic wander: pick a new drift direction every so often
    this.wanderT -= dt;
    if (this.wanderT <= 0) {
      this.wanderT = U.rand(.35, 1.0);
      this.vel.x = U.rand(-1, 1) * this.speed;
      this.vel.y = U.rand(-.5, 1) * this.speed * .55;
      this.vel.z = U.rand(-1, 1) * this.speed;
    }
    // steer back toward the anchor when drifting too far
    const dx = this.anchor.x - this.pos.x, dy = this.anchor.y - this.pos.y, dz = this.anchor.z - this.pos.z;
    const d = Math.hypot(dx, dy, dz);
    if (d > this.range) {
      const k = (d - this.range) * 6 * dt;
      this.vel.x += dx / d * k; this.vel.y += dy / d * k; this.vel.z += dz / d * k;
    }
    // keep the vertical drift gentle so targets stay shootable
    this.vel.y = U.clamp(this.vel.y, -2.2, 2.2);

    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    this.pos.z += this.vel.z * dt;

    // stay inside the training room
    const room = (typeof MAP !== 'undefined' && MAP.aimRoom) ? MAP.aimRoom : null;
    if (room) {
      const pad = this.radius + 0.3;
      if (this.pos.x < room.minX + pad) { this.pos.x = room.minX + pad; this.vel.x = Math.abs(this.vel.x); }
      if (this.pos.x > room.maxX - pad) { this.pos.x = room.maxX - pad; this.vel.x = -Math.abs(this.vel.x); }
      if (this.pos.z < room.minZ + pad) { this.pos.z = room.minZ + pad; this.vel.z = Math.abs(this.vel.z); }
      if (this.pos.z > room.maxZ - pad) { this.pos.z = room.maxZ - pad; this.vel.z = -Math.abs(this.vel.z); }
      this.pos.y = U.clamp(this.pos.y, room.floorY + 0.8, room.floorY + 3.4);
    }

    // hover above the ground
    const gy = ctx && ctx.world ? ctx.world.groundAt(this.pos.x, this.pos.z, 8) : 0;
    const minY = (gy === null ? 0 : gy) + 1.0;
    if (this.pos.y < minY) { this.pos.y = minY; this.vel.y = Math.abs(this.vel.y) * .5; }

    // face the shooter so the rings are always readable
    if (ctx && ctx.player) {
      this.yaw = Math.atan2(-(ctx.player.pos.x - this.pos.x), -(ctx.player.pos.z - this.pos.z));
    }
    // pop when hit
    if (this.hitFlash > 0) {
      const k = this.hitFlash / .14;
      this.group.scale.setScalar((this.radius / .5) * (1 + k * .28));
    } else {
      this.group.scale.setScalar(this.radius / .5);
    }

    this.group.position.set(this.pos.x, this.pos.y, this.pos.z);
    this.group.rotation.y = this.yaw;
  }

  dispose(scene) {
    scene.remove(this.group);
    this.group.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  }
}

/* A target dummy: reuses the zombie hitboxes/animation but never dies, never
   moves and never attacks. Damage is accumulated to report damage-per-second. */
class Dummy extends Zombie {
  constructor(x, z, y) {
    super('walker', x, z, y);
    this.isDummy = true;
    this.isTarget = true;              // the horde must never reap these
    this.dummyName = 'МАНЕКЕН';
    // NOTE: `isTarget` only tells the horde not to reap them. Bullets must still
    // treat dummies as damage sponges, so they get their own flag (`isDummy`) and
    // the shooting code checks that first — otherwise every hit was scored as a
    // practice target and the damage readout stopped updating.
    this.group.scale.setScalar(1);
    // neutral colouring so it reads as a target, not an enemy
    const skin = new THREE.MeshLambertMaterial({ color: 0xc8a06a });
    const cloth = new THREE.MeshLambertMaterial({ color: 0x6b4a2a });
    this.group.traverse(o => {
      if (o.isMesh && o.material && o.material.color) {
        o.material = (o.material.color.getHex() === ZOMBIES.walker.color) ? skin : cloth;
      }
    });
    // damage tracking
    this.dmgWindow = [];        // {t, amount} within the last second
    this.totalDamage = 0;
    this.peakDps = 0;
    this.lastHitT = -99;
    this.label = makeDpsLabel();
    this.label.position.set(0, 2.5, 0);
    this.group.add(this.label);
    this._labelAcc = 0;
  }

  /* dummies absorb any amount of damage and never die */
  takeDamage(amount, part, fromDir) {
    if (!this.alive) return false;
    let mul = 1;
    if (part === 'head') mul = CFG.headshotMultiplier;
    else if (part === 'legs') mul = CFG.limbMultiplier;
    const dmg = amount * mul;
    const now = U.now();
    this.dmgWindow.push({ t: now, amount: dmg });
    this.totalDamage += dmg;
    this.hitFlash = .12;
    this.lastHitT = now;
    Bus.emit('dummyHit', this, part, dmg);
    return false;               // never a kill
  }
  die() { /* dummies never die */ }

  /* stays put, only plays the hit reaction and updates the DPS readout */
  update(dt, ctx) {
    this.hitFlash = Math.max(0, this.hitFlash - (dt || 0));
    this.applyVisual(dt, 0);

    // keep only the last second of damage
    const now = U.now();
    while (this.dmgWindow.length && now - this.dmgWindow[0].t > 1000) this.dmgWindow.shift();
    const dps = this.dmgWindow.reduce((a, e) => a + e.amount, 0);
    this.dps = dps;
    if (dps > this.peakDps) this.peakDps = dps;

    this._labelAcc += (dt || 0);
    if (this._labelAcc > 0.16) {          // ~6 redraws/s is plenty
      this._labelAcc = 0;
      this.label.userData.draw(dps, this.peakDps, this.totalDamage);
    }
  }
}

/* ---------------- shooting dummy (test range) ----------------
   A dummy that stands still and shoots back at the player once it is switched
   on. ANY weapon in the game can be given to it — pistols, rifles, launchers,
   the banana, even the knife and the shield — so every gun can be tested
   against. It reports damage per second exactly like a normal dummy because it
   IS one. On PC the range panel is the control (V toggles it, [ / ] cycle the
   weapon); on a phone the same panel is tappable. */
function shooterWeaponIds() {
  const ids = [];
  for (const id in WEAPONS) if (WEAPONS[id]) ids.push(id);
  // a readable order: sidearms, then primaries, then the exotics, knife last
  const order = ['pistol', 'smg', 'shotgun', 'rifle', 'sniper', 'lmg', 'heavy', 'banana', 'melee'];
  ids.sort((a, b) => order.indexOf(WEAPONS[a].cat) - order.indexOf(WEAPONS[b].cat));
  return ids;
}

class ShooterDummy extends Dummy {
  constructor(x, z, y) {
    super(x, z, y);
    this.isShooter = true;
    this.dummyName = 'МАНЕКЕН-СТРЕЛОК';
    this.active = false;               // fires only when the player turns it on
    this.weaponId = 'ak47';
    this.fireCd = 1.4;                 // grace period after switching on
    this.projCd = 0;                   // extra spacing between launcher rounds
    this.flashT = 0;
    this.weaponGroup = null;
    // gunmetal blue paint so it is never mistaken for an ordinary target
    const bs = new THREE.MeshLambertMaterial({ color: 0x9fb4cf });
    const bc = new THREE.MeshLambertMaterial({ color: 0x3d5372 });
    this.group.traverse(o => {
      if (!o.isMesh || !o.material || !o.material.color) return;
      const hex = o.material.color.getHex();
      if (hex === 0xc8a06a) o.material = bs;         // skin
      else if (hex === 0x6b4a2a) o.material = bc;    // cloth
    });
    this.plate = makeNameplate('СТРЕЛОК');
    this.plate.position.set(0, 3.35, 0);
    this.group.add(this.plate);
    this.setWeapon(this.weaponId);
  }

  /* Attach (or swap) the weapon model in the right hand. Every weapon is
     accepted, including launchers, the banana, the knife and the shield. */
  setWeapon(id) {
    if (!WEAPONS[id]) id = 'ak47';
    this.weaponId = id;
    const armR = this.parts.armR;
    if (this.weaponGroup) { armR.remove(this.weaponGroup); this.weaponGroup = null; }
    const w = buildSoldierWeapon(id);
    // the SAME hold pose the remote players use, so the dummy grips it with
    // both hands as well
    const hp = weaponHoldPose(id);
    this.hold = hp;
    w.position.set(hp.wpos.x, hp.wpos.y, hp.wpos.z);
    w.rotation.set(hp.wrot.x, hp.wrot.y, hp.wrot.z);
    w.scale.setScalar(hp.scale);
    armR.add(w);
    this.weaponGroup = w;
  }

  update(dt, ctx) {
    const target = (ctx && ctx.player) || Game.player;
    // always face the player so the weapon points at them
    if (target) this.yaw = Math.atan2(-(target.pos.x - this.pos.x), -(target.pos.z - this.pos.z));
    Dummy.prototype.update.call(this, dt, ctx);   // DPS readout + hit reaction, no movement
    // a fixed two-handed firing pose that matches the weapon's hold
    const p = this.parts;
    const hp = this.hold || { reachL: 1.15, reachR: 1.30, yawL: 0.3, yawR: -0.1 };
    p.armL.rotation.x = hp.reachL; p.armL.rotation.y = hp.yawL; p.armL.rotation.z = .14;
    p.armR.rotation.x = hp.reachR; p.armR.rotation.y = hp.yawR; p.armR.rotation.z = -.14;
    if (this.flashT > 0) this.flashT -= dt;
    if (this.projCd > 0) this.projCd -= dt;
    if (!this.active || !this.alive || !target || !target.alive) return;
    if (Game.aim || Game.shooterPickOpen || Game.enemySpawnOpen) return;   // never into the aim room / while configuring
    this.fireCd -= dt;
    const def = WEAPONS[this.weaponId] || WEAPONS.ak47;
    // launchers wait out their own cooldown so the smoke can clear
    if (def.projectile && this.projCd > 0) return;
    if (this.fireCd <= 0) this.shoot(target);
  }

  shoot(target) {
    const def = WEAPONS[this.weaponId] || WEAPONS.ak47;
    const from = { x: this.pos.x - Math.sin(this.yaw) * .6, y: this.pos.y + 1.35 * this.scale, z: this.pos.z - Math.cos(this.yaw) * .6 };
    this.isMeleeShot = false;

    // ---- shield: carries it, never attacks; a little glow so it is not idle --
    if (def.shield) {
      this.fireCd = 1.2;
      this.flashT = .2;
      return;
    }

    const aim = { x: target.pos.x, y: target.pos.y + 1.05, z: target.pos.z };
    const d = dirTo(from, aim);

    // ---- knife: a lunge that only lands at close range ----
    if (def.slot === 3) {
      this.fireCd = Math.max(.7, 60 / (def.rpm || 120));
      this.flashT = .1;
      this.isMeleeShot = true;
      Audio3D_SFX.shot('knife', from.x, from.y, from.z);
      if (d.dist <= 3.0) Game.damageFromDummy(Math.min(50, Math.max(4, def.dmg * .5)), from, this);
      return;
    }

    // ---- launchers and the banana: fly a real projectile ----
    if (def.projectile) {
      const dir = Game.spreadDirection(d.dir, Math.max(def.spread || .01, .008), false);
      this.fireCd = Math.max(.5, 60 / (def.rpm || 60));
      this.launchProjectile(def, from, dir);
      return;
    }

    // ---- hitscan: a tracer along the real bullet path ----
    const dir = Game.spreadDirection(d.dir, Math.max(def.spread || .02, .012) * 2.6, false);
    const maxDist = Math.max(30, def.range || 100);
    const walls = Game.world.raycastAll(from, dir, maxDist);
    const wallHit = walls.length ? walls[0] : null;
    const end = wallHit ? wallHit.point
      : { x: from.x + dir.x * maxDist, y: from.y + dir.y * maxDist, z: from.z + dir.z * maxDist };
    Game.effects.tracer(from, end, 1, true);
    if (wallHit) Game.effects.impact(wallHit.point, wallHit.normal, 'concrete');
    Audio3D_SFX.shot(def.sound || 'rifle', from.x, from.y, from.z);
    this.flashT = .05;
    // a deliberate, beatable cadence — never faster than ~3 shots a second
    this.fireCd = Math.max(.34, 60 / (def.rpm || 300));
    // did the shot pass through the player's body before reaching a wall?
    const oc = { x: target.pos.x - from.x, y: (target.pos.y + 1.0) - from.y, z: target.pos.z - from.z };
    const tca = oc.x * dir.x + oc.y * dir.y + oc.z * dir.z;
    if (tca <= 0) return;
    if (wallHit && tca >= wallHit.t) return;
    const perp2 = (oc.x * oc.x + oc.y * oc.y + oc.z * oc.z) - tca * tca;
    if (perp2 > .55 * .55) return;
    // reduced damage so the player can trade fire instead of dropping at once
    Game.damageFromDummy(Math.min(50, Math.max(4, def.dmg * .22)), from, this);
  }

  /* Launch a physical round that Game flies and detonates (rockets, the guided
     missile and bananas). The guided missile is NOT steered here — the dummy
     simply fires it straight at the player. */
  launchProjectile(def, from, dir) {
    const isRocket = def.projectile === 'rocket';
    const isGuided = def.projectile === 'guided';
    const mesh = isGuided ? buildGuidedMissile() : (isRocket ? buildRocketProjectile() : buildBananaProjectile());
    mesh.position.set(from.x, from.y, from.z);
    if (!isRocket && !isGuided) mesh.rotation.x = Math.PI / 2;
    Game.scene.add(mesh);
    const speed = def.projSpeed || 30;
    const R = def.splash || 0;
    this.projCd = R >= 6 ? 3.2 : (R > 0 ? 1.8 : 1.0);
    Game.dummyProjectiles.push({
      mesh: mesh, kind: def.projectile,
      life: 6, prev: { x: from.x, y: from.y, z: from.z },
      pos: { x: from.x, y: from.y, z: from.z },
      vel: { x: dir.x * speed, y: dir.y * speed, z: dir.z * speed },
      grav: def.projGravity || 12,
      dmg: def.dmg, headMul: def.headMul || 1.6,
      splash: def.splash || 0, splashDmg: def.splashDmg || 0,
      explosionColor: def.explosionColor || null,
      nuke: !!def.nuke
    });
    if (isRocket) Audio3D_SFX.rocketShot(from.x, from.y, from.z);
    else Audio3D_SFX.bananaShot(from.x, from.y, from.z);
    Game.effects.muzzleSmoke(from.x, from.y, from.z, dir);
    this.flashT = .08;
    if (Game.dummyProjectiles.length > 14) {
      const old = Game.dummyProjectiles.shift();
      if (old.mesh.parent) old.mesh.parent.remove(old.mesh);
    }
  }
}

/* ---------------- remote player (online) ---------------- */
let REMOTE_SKIN = 0;
class RemotePlayer {
  constructor(name, team, peerId) {
    this.id = peerId || ('remote' + (REMOTE_SKIN + 1));
    this.peerId = peerId || this.id;
    this.isRemotePlayer = true;        // lets targeting code tell peers from zombies
    this.name = name || 'Игрок';
    this.team = team || 't';
    this.pos = { x: 0, y: 0, z: 0 };
    this.vel = { x: 0, y: 0, z: 0 };
    this.yaw = 0; this.pitch = 0;
    this.health = CFG.maxHP; this.armor = 0; this.helmet = false;
    this.maxHealth = CFG.maxHP;
    this.alive = true;
    this.kills = 0; this.deaths = 0; this.score = 0;
    this.zombieKills = 0; this.bulletsFired = 0; this.bulletsHit = 0;
    this.money = 800;
    this.crouching = false;
    this.height = CFG.playerHeight;
    /* Death animation: when `alive` flips false the model topples over instead
       of popping out of existence. */
    this.deathT = 0;
    this.deathActive = false;
    this.deathDir = 1;
    this.dead = false;         // set by a `died` message; cleared on respawn
    this.mesh = buildSoldierMesh(this.team);
    this.mesh.userData.parts = this.mesh.userData.parts;
    this.plate = makeNameplate(this.name);
    this.plate.position.y = 2.05;
    this.mesh.add(this.plate);
    this.buf = [];
    this.renderPos = { x: 0, y: 0, z: 0 };
    this.renderYaw = 0;
    this.playT = undefined;
    this.walkPhase = 0;
    this.lastPacket = 0;
    this.slot = 2;
    this.hitFlash = 0;
    this.seen = false;              // has sent at least one state packet

    /* Weapon held in the right hand. It is re-built only when the slot changes,
       so the models are swapped on weapon change instead of every frame. */
    this.weaponGroup = null;
    this._weaponSlot = -1;
    this._weaponId = null;
    this.heldGroups = [];           // ids sent by the peer, once they are known

    /* МЕХАКОСТЮМ: when the peer is inside their mech we show the chassis instead
       of the soldier. Built lazily the first time the flag arrives. */
    this.mech = false;
    this.mechMesh = null;
    this.mechPlate = null;
    this._mechSpin = 0;
    this.mechRecoil = 0;
    /* mech ability state mirrored from the peer's packets. A dash lasts only
       ~0.28s, shorter than the packet gap, so each flag is LATCHED: once a
       packet says "on", the effect stays visible for a short minimum window. */
    this.mechDash = false;
    this.mechJet = false;
    this._mechDashT = 0;
    this._mechJetT = 0;
    /* галактический скин персонажа, если у соперника он надет */
    this.galaxyChar = false;
  }

  /* The peer wears the platinum galactic character skin: repaint the soldier in
     nebula colours and add the orbiting rings. Applied once. */
  setGalaxyChar(on) {
    on = !!on;
    if (on === this.galaxyChar) return;
    this.galaxyChar = on;
    if (on) {
      if (!this.mesh.userData.galaxyChar) applyGalaxyCharacter(this.mesh);
    } else {
      // turning it off is rare; rebuild a clean soldier
      const parts = this.mesh.userData.parts;
      if (this.mesh.userData.galaxyChar && this.mesh.userData.galaxyChar.fx) this.mesh.remove(this.mesh.userData.galaxyChar.fx);
      this.mesh.userData.galaxyChar = null;
    }
  }
  /* Attach (or swap) the weapon model in the right hand for this slot.
     `id` comes from the peer's state packet; `skinId` is the worn skin, so the
     opponent sees the same painted weapon. `heldGroups` lists the weapon ids we
     have actually been told about, so we never invent a weapon. */
  setWeapon(id, skinId) {
    if (id === this._weaponId && skinId === this._weaponSkinId && this.weaponGroup) return;
    this._weaponId = id || null;
    this._weaponSkinId = skinId || null;
    const armR = this.mesh.userData.parts.armR;
    const handR = (armR.userData && armR.userData.lower) ? armR.userData.lower : armR;
    if (this.weaponGroup) {
      this.weaponGroup.parent.remove(this.weaponGroup);
      disposeGroup(this.weaponGroup);
      this.weaponGroup = null;
    }
    if (!id || !WEAPONS[id] || id === 'knife') return;
    /* `buildSoldierWeapon` returns a CLONE of a cached model, and the clone
       shares materials with the cache — so a skin must be applied to a model
       whose materials are per-instance, never to the shared cache. */
    const w = buildSoldierWeapon(id, skinId);
    // Seat the gun at the right FOREARM (so it follows the elbow bend), angled
    // slightly across the chest, while the LEFT arm reaches the handguard.
    this.hold = weaponHoldPose(id);
    const hp = this.hold;
    w.position.set(hp.wpos.x, hp.wpos.y, hp.wpos.z);
    // the ORIGINAL hold used rotation.x = -PI/2 at the shoulder; now the weapon
    // hangs off the forearm, so subtract the elbow bend to keep the barrel level
    w.rotation.set(-Math.PI / 2 - (hp.elbowR || 0), hp.wrot.y, hp.wrot.z);
    w.scale.setScalar(hp.scale);
    handR.add(w);
    this.weaponGroup = w;
    /* the galaxy gun needs its rings/dust animated each frame */
    this._galaxyGun = !!w.userData.galaxy;
  }

  /* Pose the soldier so the held weapon reads as gripped by BOTH hands. Called
     every frame from sync(); legs/torso already animate separately. */
  poseArms(ph, armAmp) {
    const p = this.mesh.userData.parts;
    const hp = this.hold;
    if (!hp) { p.armR.rotation.x = 1.30; p.armL.rotation.x = 1.05; return; }
    // the trigger arm holds near the stored reach with only a little drift
    p.armR.rotation.x = hp.reachR - Math.sin(ph) * armAmp * .25;
    // the support arm is locked onto the handguard (barely drifts)
    p.armL.rotation.x = hp.reachL + Math.sin(ph) * armAmp * .12;
    p.armL.rotation.y = hp.yawL;
    p.armR.rotation.y = hp.yawR;
    p.armR.rotation.z = -0.06;
    p.armL.rotation.z = 0.10;
    /* bend the ELBOWS: the lower arm rotates back so the hands sit near the
       weapon instead of the arms sticking out straight */
    if (p.armR.userData && p.armR.userData.lower) p.armR.userData.lower.rotation.x = hp.elbowR || 0.6;
    if (p.armL.userData && p.armL.userData.lower) p.armL.userData.lower.rotation.x = hp.elbowL || 0.6;
  }

  /* МЕХАКОСТЮМ: swap the soldier for a mech chassis. `on` comes from the peer's
     state packet; the mesh is built once and reused. The nameplate moves onto
     the mech so it stays readable over the taller silhouette. */
  setMech(on, skinId) {
    on = !!on;
    skinId = skinId || '';
    if (on === this.mech && skinId === this._mechSkinId && (!on || this.mechMesh)) return;
    this.mech = on;
    this._mechSkinId = skinId;
    if (on) {
      if (!this.mechMesh) this.mechMesh = buildMechChassis();
      // раскраска: у соперника свой мех-скин (приходит в пакете состояния)
      if (typeof applyMechSkin === 'function') {
        const sk = (typeof mechSkinById === 'function') ? (mechSkinById(skinId) || mechSkinById('mch_none')) : null;
        applyMechSkin(this.mechMesh, sk);
      }
      if (this.mesh.parent) this.mesh.parent.add(this.mechMesh);
      if (this.plate) {
        if (this.plate.parent) this.plate.parent.remove(this.plate);
        this.plate.position.set(0, 4.40, 0);
        this.mechMesh.add(this.plate);
      }
    } else if (this.mechMesh && this.mechMesh.parent) {
      if (this.plate && this.plate.parent === this.mechMesh) {
        this.mechMesh.remove(this.plate);
        this.plate.position.set(0, 2.05, 0);
        this.mesh.add(this.plate);
      }
      // leaving the mech: the soldier must reappear
      this.mesh.visible = this.alive;
    }
  }

  /* Snapshots are stamped with the LOCAL ARRIVAL time. That is monotonic by
     construction, so the interpolation search can never be confused by a moving
     clock offset (the previous min-filter kept rewriting the mapping, so old and
     new buffer entries ended up on different timelines and the search collapsed
     onto a stale entry → the model froze).
     Jitter and packet bursts are absorbed by a separate playout clock
     (`playT`) advanced in advance(), which never runs backwards. */
  pushSnapshot(s) {    s.lt = U.now();
    this.buf.push(s);
    if (this.buf.length > 40) this.buf.shift();
    this.lastPacket = s.lt;
  }

  /* Play-out clock: advances with real time and eases toward
     (newest snapshot − delay). It never stalls and never goes backwards, so the
     model keeps moving during jitter, bursts and short packet loss.
     After a long stall (backgrounded tab, phone locked) it is far behind, so it
     catches up quickly instead of staying seconds in the past. */
  advance(dt) {
    const b = this.buf;
    const now = U.now();
    const newest = b.length ? b[b.length - 1].lt : now;
    const target = newest - CFG.netInterpMs;
    if (this.playT === undefined) { this.playT = target; return; }
    const step = Math.max(dt, 0) * 1000;
    const err = target - (this.playT + step);          // >0 → we are behind
    if (err > 1000) {
      // a real gap (tab was hidden): jump most of the way, then ease the rest
      this.playT = target - 120;
      return;
    }
    // correct by at most ±40% of real speed, and always move forward
    this.playT += step + U.clamp(err * 0.30, -step * 0.40, step * 0.40);
  }

  /* Interpolate on the play-out clock; extrapolate briefly past the newest
     snapshot so a packet gap does not freeze the model. */
  interp(delayMs) {
    const b = this.buf;
    if (b.length === 0) return;
    if (b.length === 1) { this.applySnap(b[0]); return; }
    const target = this.playT !== undefined ? this.playT : U.now() - (delayMs || 0);
    let i = b.length - 1;
    while (i > 0 && b[i].lt > target) i--;
    const a = b[i];
    const c = b[i + 1];

    if (!c) {
      // past the newest snapshot → extrapolate along the measured velocity
      const prev = b[i - 1];
      let vx = 0, vy = 0, vz = 0;
      if (prev) {
        const dtms = Math.max(a.lt - prev.lt, 1);
        vx = (a.x - prev.x) / dtms;      // m/ms
        vy = (a.y - prev.y) / dtms;
        vz = (a.z - prev.z) / dtms;
      }
      const ahead = U.clamp(target - a.lt, 0, CFG.netMaxExtrapMs);
      this.renderPos.x = a.x + vx * ahead;
      this.renderPos.y = a.y + vy * ahead;
      this.renderPos.z = a.z + vz * ahead;
      this.renderYaw = a.yw;
      this.pitch = a.pt || 0;
      this.alive = this.dead ? false : a.alive;   // a `died` message is authoritative
      this.crouching = !!a.cr;
      this.height = this.crouching ? CFG.crouchHeight : CFG.playerHeight;
      this.moveSpeed = Math.hypot(vx, vz) * 1000;   // m/s
      return;
    }

    const span = Math.max(c.lt - a.lt, 1);
    const t = U.clamp((target - a.lt) / span, 0, 1);
    this.renderPos.x = U.lerp(a.x, c.x, t);
    this.renderPos.y = U.lerp(a.y, c.y, t);
    this.renderPos.z = U.lerp(a.z, c.z, t);
    this.renderYaw = U.angleLerp(a.yw, c.yw, t);
    this.pitch = U.lerp(a.pt || 0, c.pt || 0, t);
    this.alive = c.alive;
    this.crouching = !!c.cr;
    this.height = this.crouching ? CFG.crouchHeight : CFG.playerHeight;
    this.moveSpeed = Math.hypot((c.x - a.x) / span, (c.z - a.z) / span) * 1000;  // m/s
  }
  applySnap(s) {
    this.renderPos.x = s.x; this.renderPos.y = s.y; this.renderPos.z = s.z;
    this.renderYaw = s.yw; this.pitch = s.pt || 0;
    this.alive = this.dead ? false : s.alive;   // a `died` message is authoritative
    this.crouching = !!s.cr;
    this.height = this.crouching ? CFG.crouchHeight : CFG.playerHeight;
    this.moveSpeed = 0;
  }
  /* authoritative pos follows the interpolated render pos */
  sync(dt) {
    dt = dt || 1 / 60;
    this.pos.x = this.renderPos.x; this.pos.y = this.renderPos.y; this.pos.z = this.renderPos.z;
    this.yaw = this.renderYaw;
    this.mesh.position.set(this.pos.x, this.pos.y, this.pos.z);
    this.mesh.rotation.y = this.yaw;

    /* ---- МЕХАКОСТЮМ: the peer rides a chassis instead of a soldier ---- */
    if (this.mechMesh) {
      // the chassis mirrors the soldier transform, so it walks/turns identically
      this.mechMesh.position.set(this.pos.x, this.pos.y, this.pos.z);
      this.mechMesh.rotation.y = this.yaw;
      this.mechMesh.visible = !!this.mech && this.alive;
      if (this.mech) {
        // soldier hidden while inside the mech (the open cockpit would show it)
        this.mesh.visible = false;
        // spin the barrels while the peer is firing the minigun
        const ud = this.mechMesh.userData;
        if (ud.barrels) {
          this._mechSpin = (this._mechSpin || 0) + dt * (this.spinT > .1 ? 34 : 0);
          ud.barrels.rotation.z = this._mechSpin;
        }
        // walk cycle: the peer's mech strides as it moves
        const spd01 = U.clamp((this.moveSpeed || 0) / CFG.runSpeed, 0, 1);
        this._mechLegPhase = animateMechLegs(this.mechMesh, spd01, this._mechLegPhase || 0, dt);
        // decay the latched ability windows (a dash is a short impulse)
        if (this._mechDashT > 0) this._mechDashT -= dt;
        if (this._mechJetT > 0) this._mechJetT -= dt;
        if (this._mechDashT <= 0) this.mechDash = false;
        if (this._mechJetT <= 0) this.mechJet = false;
        // the guns track the peer's aim (pitch + a little idle sway)
        this._mechArmT = (this._mechArmT || 0) + dt;
        aimMechArms(this.mechMesh, this.pitch || 0, this._mechArmT);
        // jetpack / dash thrusters, mirrored so the opponent sees them
        setMechThrusters(this.mechMesh, this.mechJet, this.mechDash, this._mechArmT);
        // a dash leaves a short blue/orange flare behind the mech
        const fx = Game && Game.effects;
        if (this.mechDash && fx) {
          this._mechDashFx = (this._mechDashFx || 0) - dt;
          if (this._mechDashFx <= 0) {
            this._mechDashFx = .03;
            this._mechDashFx2 = (this._mechDashFx2 || 0) + 1;
            for (let k = 0; k < 2; k++) {
              fx.particle(
                this.pos.x + U.rand(-.7, .7), this.pos.y + U.rand(.2, 1.5), this.pos.z + U.rand(-.7, .7),
                U.rand(-3, 3), U.rand(.3, 2.2), U.rand(-3, 3), U.rand(.10, .22), 'spark', U.rand(.2, .5));
            }
            fx.particle(
              this.pos.x + U.rand(-.5, .5), this.pos.y + .4, this.pos.z + U.rand(-.5, .5),
              U.rand(-1, 1), U.rand(.4, 1.6), U.rand(-1, 1), U.rand(.16, .30), 'smoke', U.rand(.3, .6));
          }
        }
        // a jetpack leaves a hot exhaust trail while the peer thrusts
        if (this.mechJet && fx) {
          this._mechJetFx = (this._mechJetFx || 0) - dt;
          if (this._mechJetFx <= 0) {
            this._mechJetFx = .06;
            fx.particle(
              this.pos.x + U.rand(-.5, .5), this.pos.y + .1, this.pos.z + .6 + U.rand(-.2, .2),
              U.rand(-1, 1), U.rand(-3, -1), U.rand(-1, 1), U.rand(.14, .26), 'smoke', U.rand(.3, .6));
          }
        }
      }
    }

    /* ---- death: topple the model instead of hiding it ---- */
    if (!this.alive) {
      if (!this.deathActive) {
        this.deathActive = true;
        this.deathT = 0;
        this.deathDir = Math.random() < .5 ? -1 : 1;
        this.mesh.visible = true;
        this.mesh.rotation.order = 'YXZ';
      }
      // a destroyed mech is hidden; the pilot's body topples instead
      if (this.mechMesh) this.mechMesh.visible = false;
      this.deathT += dt;
      const k = U.clamp(this.deathT / .55, 0, 1);
      const fall = Math.sin(k * Math.PI * .5);
      this.mesh.rotation.x = -fall * Math.PI * .5;     // pitch face-down
      this.mesh.rotation.z = fall * .28 * this.deathDir;
      this.mesh.position.y = this.pos.y + fall * .10;
      this.mesh.visible = this.deathT < 8;             // the corpse fades later
      this._wasFlashing = false;
      return;
    }

    // revived: stand the model back up
    if (this.deathActive) {
      this.deathActive = false;
      this.deathT = 0;
      this.mesh.rotation.x = 0; this.mesh.rotation.z = 0;
      this.mesh.visible = !this.mech;      // stay hidden if still inside the mech
    }

    const p = this.mesh.userData.parts;
    const spd = U.clamp((this.moveSpeed || 0) / CFG.runSpeed, 0, 1);   // 0..1
    const running = spd > .62;

    // Advance the gait in real time (previously this used a per-millisecond
    // figure, so the legs barely moved). Stride frequency rises with speed.
    this.walkPhase += dt * (1.6 + spd * 9.0);
    const ph = this.walkPhase;
    const amp = running ? .95 : .62 * spd;

    // legs: a real stride; a small idle offset keeps the pose from looking rigid
    p.legL.rotation.x = Math.sin(ph) * amp * spd;
    p.legR.rotation.x = -Math.sin(ph) * amp * spd;
    /* bend the KNEES: the lower leg folds back when the thigh swings forward
       (a straight-legged walk reads as skating) */
    if (p.legL.userData && p.legL.userData.lower) p.legL.userData.lower.rotation.x = U.clamp(0.25 + Math.max(0, Math.sin(ph)) * (0.5 + spd * .7), 0, 1.5);
    if (p.legR.userData && p.legR.userData.lower) p.legR.userData.lower.rotation.x = U.clamp(0.25 + Math.max(0, -Math.sin(ph)) * (0.5 + spd * .7), 0, 1.5);

    // arms: BOTH hands grip the weapon — the right holds the trigger, the left
    // braces the handguard (see poseArms). The left still pumps a little with
    // the stride for life, the right barely moves.
    const armAmp = (running ? .55 : .35) * spd;
    this.poseArms(ph, armAmp);

    // torso/head: lean into a run, always look where the player is aiming
    p.torso.rotation.x = this.pitch * .35 + spd * .10;
    p.head.rotation.x = this.pitch * .55;
    p.torso.rotation.z = Math.sin(ph) * .05 * spd;      // shoulder roll
    p.head.rotation.z = Math.sin(ph) * .03 * spd;

    // vertical bob while moving; gentle breathing when standing still
    const bobY = Math.abs(Math.sin(ph)) * .045 * spd;
    const breathe = spd < .05 ? Math.sin(U.now() * .0018) * .012 : 0;
    p.torso.position.y = 1.06 + bobY + breathe;

    // crouch
    this.mesh.scale.y = this.crouching ? .72 : 1;

    // minigun barrel spin, mirrored from the peer's spin-up value
    const barrels = this.weaponGroup && this.weaponGroup.getObjectByName && this.weaponGroup.getObjectByName('barrels');
    if (barrels && this.spinT > 0.01) {
      this._barrelPhase = (this._barrelPhase || 0) + (6 + this.spinT * this.spinT * 78) * this.spinT * dt;
      barrels.rotation.z = this._barrelPhase;
      // the Y.H.S outer ring counter-rotates so it is clearly animated
      const outer = this.weaponGroup.getObjectByName('barrels2');
      if (outer) outer.rotation.z = -this._barrelPhase * .65;
    }

    // hit flash
    this.hitFlash = Math.max(0, this.hitFlash - dt * 4);
    const flash = this.hitFlash > 0;
    if (flash !== this._wasFlashing) {
      this.mesh.traverse(o => {
        if (o.isMesh && o.material && o.material.emissive) {
          o.material.emissive.setHex(flash ? 0x662222 : 0x000000);
        }
      });
      this._wasFlashing = flash;
    }
  }
}

/* ============================================================
   GAME
   ============================================================ */
/* scratch vectors (avoid per-shot allocations) */
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();

const Game = {
  /* ---- engine ---- */
  renderer: null, scene: null, camera: null, vmScene: null, vmCamera: null,
  world: null, effects: null, horde: null, player: null, dummies: [], targets: [], aim: null,
  dummyProjectiles: [], enemyShots: [],
  _bossAbilityLock: 0,
  running: false, mode: CS.MODE.MENU, paused: false,
  baseFov: 80, _last: 0, _loopBound: null, _acc: 0,
  remotePlayers: [], remote: null,
  matchHP: 100,               // health chosen for this match
  offline: null,
  online: null,
  buyOpen: false,
  shooterPickOpen: false,
  _modPickOpen: false,
  enemySpawnOpen: false,
  _spawnHpMul: 1,
  buyTimer: 0,
  roundState: 'idle',   // buy | live | end
  roundT: 0,
  roundNo: 0,
  aliveRemotes: 0,
  _netStateT: 0,
  _uiT: 0,
  _lastShotFx: 0,
  _fpsAcc: 0, _fpsFrames: 0,
  projectiles: [],
  remoteProjectiles: [],       // cosmetic copies of other players' rockets/bananas
  _projT: 0,
  _enemyCheck: 0, _enemyFound: false,
  _aimFireHold: 0,
  drone: null,                 // active guided drone {mesh, pos, vel, hp, ...}
  hordeMode: false,            // ОРДА ×10 offline mode
  crates: [],                  // offline ammo crates: {mesh, x, y, z, life, t}
  _crateT: 0,                  // countdown to the next crate
  medboxes: [],                // offline field medkits (50% HP): {mesh,x,y,z,life,t}
  _medboxT: 0,                 // countdown to the next field medkit

  /* ============================================================
     INIT
     ============================================================ */
  init() {
    UI.init();
    this.setupRenderer();
    this._loopBound = this.loop.bind(this);
    this.bindUI();
    Input.init(this.renderer.domElement);
    Input.enabled = false;         // armed when a match starts (enterGame)

    // loading sequence (also warms up shaders so the first frame is not a stutter)
    UI.loading(5, 'Готовим материалы…');
    setTimeout(() => {
      buildTextures();
      UI.loading(25, 'Строим арену…');
      setTimeout(() => this.finishInit(), 30);
    }, 120);
  },

  finishInit() {
    /* подключаем пользовательские карты из редактора в реестр */
    if (typeof registerCustomMapsIntoRegistry === 'function') registerCustomMapsIntoRegistry();
    buildMap(this.scene, Store.data.quality, Store.data.map);
    this.world = MAP.world;
    UI.loading(62, 'Компилируем шейдеры…');
    setTimeout(() => {
      if (this.world.raycastAll === undefined) { /* safety no-op */ }
      UI.loading(80, 'Готово');
      // pre-render one frame offscreen to warm up
      try {
        this.camera.position.set(0, 2, 0);
        this.renderer.compile(this.scene, this.camera);
      } catch (e) { }
      UI.loading(100, 'Загрузка завершена');
      setTimeout(() => {
        if (typeof ACCOUNT !== 'undefined' && ACCOUNT.init) ACCOUNT.init();
        UI.renderMenuStats();
        UI.show('menu');
        this.running = true;
        this._last = performance.now();
        requestAnimationFrame(this._loopBound);
      }, 240);
    }, 60);
  },

  setupRenderer() {
    const canvas = document.createElement('canvas');
    canvas.id = 'game3d';
    document.body.appendChild(canvas);

    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: Store.data.quality > 0, powerPreference: 'high-performance',
      stencil: false, alpha: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Store.data.quality === 2 ? 2 : 1.5));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = Store.data.quality > 0;
    this.renderer.shadowMap.type = Store.data.quality === 2 ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    this.renderer.autoClear = false;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;

    this.scene = new THREE.Scene();
    this.world = new CollisionWorld();
    this.camera = new THREE.PerspectiveCamera(this.baseFov, window.innerWidth / window.innerHeight, 0.08, 420);

    // separate scene for the first-person weapon (never clips into walls)
    this.vmScene = new THREE.Scene();
    this.vmCamera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.01, 12);
    // the view model gets brighter, flatter lighting than the world so the
    // weapon always stays legible even when the player stands in shadow
    const vHemi = new THREE.HemisphereLight(0xffffff, 0x6a7078, 2.35);
    this.vmScene.add(vHemi);
    const vDir = new THREE.DirectionalLight(0xfff4e0, 2.1);
    vDir.position.set(0.8, 1.8, 1.2);
    this.vmScene.add(vDir);
    const vFill = new THREE.DirectionalLight(0xbcd0ff, 0.9);
    vFill.position.set(-1.2, 0.6, 0.6);
    this.vmScene.add(vFill);
    const vAmb = new THREE.AmbientLight(0xffffff, 0.42);
    this.vmScene.add(vAmb);

    window.addEventListener('resize', () => this.onResize());
    this.applyGfxPreset();
    this.applyQuality();
  },

  onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.vmCamera.aspect = w / h; this.vmCamera.updateProjectionMatrix();
  },

  applyQuality() {
    const q = Store.data.quality;
    this.renderer.shadowMap.enabled = q > 0;
    const prCap = this._gfxPixelCap || (IS_TOUCH ? (q === 2 ? 1.5 : 1) : (q === 2 ? 2 : q === 1 ? 1.4 : 1));
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, prCap));
    const sun = MAP.group && MAP.group.userData ? MAP.group.userData.sun : null;
    if (sun) {
      let size = this._gfxShadow || (q === 0 ? 1024 : q === 1 ? 2048 : 4096);
      if (sun.shadow.mapSize.width !== size) {
        sun.shadow.mapSize.width = size; sun.shadow.mapSize.height = size;
        if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
      }
    }
  },

  /* ---- ПРЕСЕТ ГРАФИКИ: 0 авто · 1 низкая · 2 средняя · 3 высокая ----
     Управляет туманом, дальностью LOD зомби, частицами, тенями и разрешением.
     Это и есть «настройка графики для телефона». */
  activeGfxPreset() {
    let g = Store.data.gfx;
    if (g === 0 || g === undefined || g === null) return this.autoGfxPreset();
    return U.clamp(g | 0, 1, 3);
  },

  /* Авто-выбор графики ПО ЖЕЛЕЗУ: слабый телефон сразу получает «низкую»,
     мощный — «среднюю/высокую». Настройка хранится на конкретном устройстве,
     поэтому у каждого игрока свой уровень. */
  autoGfxPreset() {
    let score = 0;
    try {
      const cores = navigator.hardwareConcurrency || 4;
      const mem = navigator.deviceMemory || 4;               // ГБ (Chrome)
      const pr = window.devicePixelRatio || 1;
      const px = (window.screen && screen.width ? screen.width : window.innerWidth) *
                 (window.screen && screen.height ? screen.height : window.innerHeight);
      if (cores >= 8) score += 2; else if (cores >= 6) score += 1; else if (cores <= 4) score -= 1;
      if (mem >= 8) score += 1; else if (mem <= 2) score -= 2; else if (mem <= 3) score -= 1;
      if (pr >= 3) score += 1;                                 // плотный экран обычно = мощный
      if (px > 2200000) score += 1; else if (px < 900000) score -= 1;
    } catch (e) { }
    if (!IS_TOUCH) score += 2;                                 // ПК почти всегда тянет больше
    // -3..-1 → низкая(1) · 0..1 → низкая/средняя · 2..3 → средняя · 4+ → высокая
    if (score <= 0) return 1;
    if (score <= 2) return 2;
    return 3;
  },

  applyGfxPreset() {
    const preset = CFG.gfxPresets[this.activeGfxPreset()] || CFG.gfxPresets[1];
    CFG.zombieCullDist = preset.cull;
    CFG.zombieNearDist = preset.near;
    CFG.zombieFarInterval = preset.farInterval;
    CFG.particleMul = preset.particleMul;
    CFG.decalMul = preset.decalMul;
    this._gfxPixelCap = preset.pixelCap;
    this._gfxShadow = preset.shadow;
    // туман: не трогаем, если окружение управляет им (авто/погода), иначе задаём
    if (this.scene && this.scene.fog && !Store.data.envAuto && !Store.data.envOff) {
      this.scene.fog.density = preset.fog;
    }
    if (this.renderer) {
      // antialias нельзя переключить без пересоздания контекста; при низкой
      // графике уменьшаем pixelRatio, что и даёт основной выигрыш
      this.applyQuality();
    }
  },

  /* ============================================================
     MAP SELECTION
     ============================================================ */
  setMap(mapId, rebuild) {
    if (!mapById(mapId)) return;
    Store.data.map = mapId; Store.save();
    if (rebuild && this.scene && MAP.group) {
      buildMap(this.scene, Store.data.quality, mapId);
      this.world = MAP.world;
      this.applyQuality();
      this.scene.fog = new THREE.FogExp2(MAP.def.fog || 0xbcc6cf, MAP.def.fogDensity || 0.0055);
    }
    UI.refreshChips();
  },
  mapName() { return mapById(Store.data.map).name; },

  /* ============================================================
     UI WIRING
     ============================================================ */
  bindUI() {
    bindClick('btnOffline', () => { UI.show('custom'); UI.refreshChips(); });
    bindClick('btnRange', () => this.startRange());
    bindClick('btnCustomBack', () => UI.show('menu'));
    bindClick('btnOffContinue', () => {
    const mode = Store.data.offMode || 'normal';
    if (!this.resumeFromCheckpoint(mode)) UI.toast('Сохранения для этого режима нет', '#e33a2e');
  });
    bindClick('btnCustomStart', () => {
      const mode = Store.data.offMode || 'normal';
      /* a NEW GAME wipes only THIS mode's save, so other modes keep theirs */
      const key = offlineModeKey(mode, mode === 'horde' || mode === 'freehorde', mode === 'freehorde', mode === 'custom');
      this.clearCheckpoint(key);
      if (mode === 'custom') this.startOffline(false, false, true);
      else if (mode === 'freehorde') this.startOffline(true, true, false, true);
      else if (mode === 'horde') this.startOffline(true, false, false, true);
      else this.startOffline(false, false, false, true);   // normal / bossrush / daily / endless
    });
    bindClick('btnCreditsClose', () => this.closeCredits());
    bindClick('btnMatchAgain', () => this.rematchOnline());
    bindClick('btnMatchMenu', () => this.backToMenuFromMatch());
    // clicking the backdrop (not the text or a button) also closes the credits
    if (UI.el.credits) UI.el.credits.addEventListener('click', e => {
      if (e.target === UI.el.credits || e.target.classList.contains('credits-scroll')) this.closeCredits();
    });
    bindClick('btnRange', () => this.startRange());
    bindClick('btnMatch', () => { this._prevScreen = 'menu'; UI.refreshChips(); UI.show('controls'); });
    bindClick('btnExtras', () => { UI.renderExtras(); UI.show('extras'); });
    bindClick('btnExtrasBack', () => UI.show('menu'));
    bindClick('btnSkins', () => Skins.open());
    bindClick('btnSkinsBack', () => { Skins.close(); UI.show('menu'); });
    bindClick('btnAndroid', () => UI.show('android'));
    bindClick('btnAndroidBack', () => UI.show('menu'));
    bindClick('btnAndroidCopy', () => {
      const url = location.href.split('#')[0];
      try { navigator.clipboard.writeText(url); UI.toast('Ссылка скопирована', '#57d16a'); }
      catch (e) { UI.toast(url); }
    });
    bindClick('btnIos', () => UI.show('ios'));
    bindClick('btnIosBack', () => UI.show('menu'));
    bindClick('btnIosCopy', () => {
      const url = location.href.split('#')[0];
      try { navigator.clipboard.writeText(url); UI.toast('Ссылка скопирована', '#57d16a'); }
      catch (e) { UI.toast(url); }
    });
    bindClick('rpToggle', () => {
      if (this.mode !== CS.MODE.RANGE) return;
      this.toggleAimTrain(!this.aim);
    });
    bindClick('sdToggle', () => this.toggleShooterDummy());
    bindClick('sdConfig', () => this.toggleShooterPick(true));
    bindClick('sdClose', () => this.toggleShooterPick(false));
    bindClick('sdToggle2', () => { this.toggleShooterDummy(); this.renderShooterPick(); });
    const sdSearch = document.getElementById('sdSearch');
    if (sdSearch) sdSearch.addEventListener('input', () => this.renderShooterPick());
    bindClick('esConfig', () => this.toggleEnemySpawn(true));
    bindClick('esClose', () => this.toggleEnemySpawn(false));
    bindClick('esClear', () => { this.clearRangeEnemies(); this.renderEnemySpawn(); });
    const esSearch = document.getElementById('esSearch');
    if (esSearch) esSearch.addEventListener('input', () => this.renderEnemySpawn());
    const esCount = document.getElementById('esCount');
    if (esCount) esCount.parentElement.addEventListener('click', () => this.cycleSpawnHp(1));
    /* количество спавна врагов (1..1000) */
    const esNum = document.getElementById('esCountNum');
    if (esNum) {
      esNum.addEventListener('input', () => this.setSpawnCount(parseInt(esNum.value, 10)));
      esNum.addEventListener('change', () => this.setSpawnCount(parseInt(esNum.value, 10)));
    }
    const esChips = document.getElementById('esCountChips');
    if (esChips) {
      [[1, '×1'], [10, '×10'], [50, '×50'], [100, '×100'], [1000, '×1000']].forEach(([v, label]) => {
        const b = document.createElement('button');
        b.className = 'chip';
        b.dataset.n = String(v);
        b.textContent = label;
        b.addEventListener('click', () => { this.setSpawnCount(v); if (esNum) esNum.value = String(v); });
        esChips.appendChild(b);
      });
    }
    bindClick('btnOnline', () => { UI.show('lobby'); this.resetLobby(); Net.warmup(); });
    /* РЕДАКТОР КАРТ: новая карта / продолжить последнюю */
    bindClick('btnEditor', () => { if (typeof registerCustomMapsIntoRegistry === 'function') registerCustomMapsIntoRegistry(); this.startEditor(null); });
    bindClick('edSaveBtn', () => { if (typeof MapEditor !== 'undefined') MapEditor.save(); });
    bindClick('btnControls', () => { this._prevScreen = 'menu'; UI.show('controls'); });
    bindClick('btnControlsBack', () => UI.show(this._prevScreen || 'menu'));
    bindClick('btnLobbyBack', () => { Net.close(false); UI.show('menu'); });
    bindClick('btnResume', () => this.togglePause(false));
    bindClick('btnSaveNow', () => this.manualSave());
    bindClick('btnPauseControls', () => { this._prevScreen = 'pause'; UI.show('controls'); });
    bindClick('btnLeave', () => this.stopToMenu());
    bindClick('btnReset', () => {
      if (confirm('Сбросить весь прогресс и настройки?')) {
        Store.data = { sens: 2.2, fov: 80, vol: 60, quality: 1, gfx: 0, touchSens: 1.5, name: '', best: 0, bestWave: 0, killsTotal: 0, matches: 0, wins: 0, signalSrv: 0, aimBest: 0, aimAutoFire: 1, map: 'arena', players: 2, maxHP: 100, aimAssist: 1, horde: 0, clears: 0, freeplay: 0, rounds: 3, playTime: 0, offCount: 1, offHp: 1, offFree: 0, offMode: 'normal', offMods: {}, offModsRun: 0, offModPick: 0, checkpoint: null, shopAllow: {}, shopItems: {}, music: 1, sfxVol: 100, musicVol: 70, grenade: 'frag', buildable: 'turret', weather: 'day', trapsEnabled: 1, ach: {}, runs: [], checkpoints: {} };
        this.shopAllow = MATCH.defaultShopAllow();
        Store.save();
        UI.refreshChips(); UI.renderMenuStats(); UI.toast('Прогресс сброшен');
      }
    });
    bindClick('btnCopy', () => {
      const code = UI.el.roomCode.textContent;
      try { navigator.clipboard.writeText(code); UI.toast('Код скопирован: ' + code); }
      catch (e) { UI.toast('Код: ' + code); }
    });

    // --- lobby ---
    const nameIn = UI.el.inName;
    if (nameIn) nameIn.value = Store.data.name || '';
    bindClick('btnBuyClose', () => this.toggleBuy(false));
    bindClick('btnBuySkip', () => this.voteSkipBuy());
    bindClick('btnHost', () => this.doHost());
    bindClick('btnJoin', () => {
      UI.el.joinRow.classList.remove('hidden');
      UI.el.hostRow.classList.add('hidden');
      UI.el.joinWait.classList.add('hidden');
      UI.el.inCode.focus();
    });
    bindClick('btnJoinGo', () => this.doJoin());
    if (UI.el.inCode) UI.el.inCode.addEventListener('keydown', e => { if (e.key === 'Enter') this.doJoin(); });
    if (nameIn) nameIn.addEventListener('input', () => { Store.data.name = nameIn.value; Store.save(); });
    bindClick('btnConnCancel', () => { Net.close(false); UI.show('lobby'); this.setLobbyStatus(''); });

    // --- click to play ---
    UI.el.clickToPlay.addEventListener('click', () => {
      Audio3D_SFX.init(); Audio3D_SFX.resume();
      Input.requestLock();
    });
    // pointer lock behaviour
    Input.onLockChange = (locked, wasLocked) => {
      if (!this.running) return;
      if (locked) {
        // discard any mouse delta accumulated while the cursor was free,
        // otherwise the view snaps on the first frame back in-game
        Input.consumeMouse();
        UI.el.clickToPlay.classList.add('hidden');
        this.paused = false;
      } else if (wasLocked && this.mode !== CS.MODE.MENU && !this.buyOpen && !this.shooterPickOpen && !this.enemySpawnOpen && !this.paused) {
        // lost the lock (Alt+Tab, Esc) → pause. The shop and the dummy weapon
        // picker release the pointer on purpose, so they must not pause.
        this._lockLostAt = U.now();
        this.togglePause(true);
      }
    };

    // keyboard hooks
    Input.onKeyDown = (code, e) => this.onKeyDown(code, e);
    Input.onKeyUp = (code, e) => {
      if (code === 'Space' && this.player) this.player.in.wantJump = false;
      // release Tab → drop the scoreboard (hold-to-view, like CS)
      if (code === 'Tab' && this._tabHeld) {
        this._tabHeld = false;
        if (UI.current === 'scoreboard') UI.show('hud');
        if (!this.paused && this.mode !== CS.MODE.MENU) Input.requestLock();
      }
    };
    Input.onMouseDown = (btn, e) => this.onMouseDown(btn, e);
    Input.onMouseUp = (btn, e) => this.onMouseUp(btn, e);

    // game events
    Bus.on('buy', id => this.tryBuy(id));
    Bus.on('equip', id => this.equipWeapon(id));
    Bus.on('buyGear', id => this.tryBuyGear(id));
    Bus.on('touchBuy', () => {
      // One button opens and closes the shop: on a phone there is no B/Esc key.
      if (this.buyOpen) { this.toggleBuy(false); return; }
      if (this.roundState === 'buy' || this.mode === CS.MODE.RANGE) { this.toggleBuy(true); Audio3D_SFX.uiClick(); }
      else { UI.toast('Магазин только в фазе закупки'); Audio3D_SFX.deny(); }
    });
    Bus.on('touchPause', () => {
      // In-match pause: opens the pause panel, which also exposes the settings
      // sliders and "ВЫЙТИ В МЕНЮ". Ignore taps while another overlay owns the
      // screen (the buy menu has its own ЗАКРЫТЬ button).
      if (this.buyOpen) return;
      if (this.paused) { this.togglePause(false); return; }
      if (UI.overlayOpen()) return;
      if (this.mode !== CS.MODE.MENU) { this.togglePause(true); Audio3D_SFX.uiClick(); }
    });
    Bus.on('touchAutoFire', on => {
      const tag = document.getElementById('autoFireTag');
      if (tag) tag.classList.toggle('hidden', !on);
      // keep the on-screen АВТО button lit while armed
      const btn = document.getElementById('tAuto');
      if (btn) btn.classList.toggle('armed', !!on);
      UI.toast(on ? 'Автоогонь: ВКЛ' : 'Автоогонь: ВЫКЛ', on ? '#ff9d21' : undefined);
      Audio3D_SFX.uiClick();
    });
    Bus.on('zombieAttack', (z, dmg) => {
      /* В коопе зомби могут бить удалённого игрока: хост решает урон и
         отправляет его клиенту (клиент сам зомби не симулирует). */
      if (this.mode === CS.MODE.ONLINE && this.isCoop && z && z.targetRemote) this.hurtRemote(dmg, z);
      else this.playerHurt(dmg, z);
    });
    Bus.on('zombieDied', (z, hs) => this.onZombieDied(z, hs));
    Bus.on('touchUseMedkit', () => this.useMedkit());
    Bus.on('touchUseDrone', () => { if (this.drone) this.detonateDrone(false); else this.launchDrone(); });
    /* contextual mobile actions added with the new abilities */
    Bus.on('touchGrenade', () => this.throwGrenade());
    Bus.on('touchCycleGrenade', () => this.cycleGrenade());
    Bus.on('touchDetonateStickies', () => this.detonateStickies());
    Bus.on('touchMechMissiles', () => this.launchMechMissiles());
    Bus.on('touchMechSurge', () => this.mechSurge());
    Bus.on('touchMechToggle', () => {
      if (this.isMechActive()) this.exitMechSuit();
      else if (this.player && this.player.mechOwned && this.parkedMechDist() <= 6) this.equipMechSuit();
    });
    Bus.on('touchTurretGear', () => this.useTurretGear());
    Bus.on('touchRangeDummy', () => this.toggleShooterDummy());
    Bus.on('touchRangeSpawn', () => this.toggleEnemySpawn(!this.enemySpawnOpen));
    Bus.on('touchUnstick', () => this.resetZombiePositions());
    Bus.on('zombieHit', (z, part, dmg, dir) => this.onZombieHit(z, part, dmg, dir));
    Bus.on('zombieGrowl', z => {
      // рычание: смешиваем «классический» гроул и новые голоса зомби
      Audio3D_SFX.growl(z.pos.x, z.pos.y + 1.4, z.pos.z, z.type);
      if (Math.random() < .6) Audio3D_SFX.zombieVoice(z.pos.x, z.pos.y + 1.4, z.pos.z, z.type);
    });
    Bus.on('zombieShoot', (z, from) => this.onZombieShoot(z, from));
    /* звуки атаки/смерти зомби — рычание и предсмертный хрип */
    Bus.on('zombieAttack', (z) => { if (z && z.pos) Audio3D_SFX.zombieVoice(z.pos.x, z.pos.y + 1.4, z.pos.z, z.type); });
    Bus.on('zombieDied', (z) => { if (z && z.pos) Audio3D_SFX.zombieVoice(z.pos.x, z.pos.y + 1.2, z.pos.z, z.type); });
    Bus.on('zombieShatter', z => {
      // АБСОЛЮТНЫЙ НОЛЬ: a frozen body burst into ice shards
      this.effects.frostBurst(z.pos.x, z.pos.y + 1, z.pos.z, 2.6);
      this.effects.decal(z.pos.x, .02, z.pos.z, 0, 1, 0, 2.6, 'frost');
      Audio3D_SFX.explosionAt(z.pos.x, z.pos.y + 1, z.pos.z);
    });
    Bus.on('zombieHeal', z => {
      // ЛЕКАРЬ: a green pulse over each zombie it tops up
      this.effects.particle(z.pos.x, z.pos.y + 1.2 * z.scale, z.pos.z, 0, 1.2, 0, .5, 'spark', .5);
    });
    Bus.on('zombieSummon', z => {
      // ПРИЗЫВАТЕЛЬ: a violet portal burst where the pack appears
      this.effects.explosion(z.pos.x, z.pos.y + 1, z.pos.z, 3.2, [0xc24bff, 0x1a0a20]);
      Audio3D_SFX.explosionAt(z.pos.x, z.pos.y + 1, z.pos.z);
    });

    // network events
    Net.on('hello', m => this.onPeerHello(m));
    Net.on('peerjoined', p => this.onPeerJoined(p));
    Net.on('peerleft', p => this.onPeerLeft(p));
    Net.on('roster', r => this.onRoster(r));
    Net.on('full', () => { this.setLobbyStatus('Комната заполнена (максимум ' + MATCH.maxPlayers + ' игроков)', true); UI.toast('Комната заполнена', '#e33a2e'); if (UI.current === 'connect') { UI.el.connStatus.textContent = 'Комната заполнена'; setTimeout(() => { if (!Net.connected) UI.show('lobby'); }, 1600); } });
    Net.on('reject', r => { this.setLobbyStatus((r && r.reason) || 'Комната отклонила подключение', true); UI.toast((r && r.reason) || 'Комната отклонила подключение', '#e33a2e'); if (UI.current === 'connect') { UI.el.connStatus.textContent = (r && r.reason) || 'Комната отклонила подключение'; setTimeout(() => { if (!Net.connected) UI.show('lobby'); }, 1600); } });
    Net.on('connected', () => this.onNetConnected());
    Net.on('disconnected', () => this.onNetDisconnected());
    Net.on('state', s => this.onRemoteState(s));
    Net.on('shot', s => this.onRemoteShot(s));
    Net.on('hit', h => this.onRemoteHit(h));
    Net.on('died', d => this.onRemoteDied(d));
    Net.on('respawn', r => this.onRemoteRespawn(r));
    Net.on('round', r => this.onRoundMsg(r));
    Net.on('drone', d => this.onRemoteDrone(d));
    Net.on('boom', b => this.onRemoteBoom(b));
    Net.on('mmissile', m => this.onRemoteMechMissile(m));
    Net.on('coopWave', m => { if (this.mode === CS.MODE.ONLINE && this.isCoop && Net.role !== CS.NETROLE.HOST) this.coopStartWave(m.w); });
    Net.on('zstate', m => this.onZombieState(m));
    Net.on('zhurt', m => this.onZombieHurtMsg(m));
    Net.on('zhit', m => this.onRemoteZombieHit(m));
    Net.on('splat', s => this.onRemoteSplat(s));
    Net.on('score', s => this.onScoreMsg(s));
  },

  togglePause(on) {
    if (this.mode === CS.MODE.MENU) return;
    if (on && this.buyOpen) return;
    this.paused = !!on;
    if (this.paused) {
      UI.show('pause');
      if (!IS_TOUCH) Input.releaseLock();
      this.player.triggerDown = false;
    } else {
      UI.show('hud');
      if (!IS_TOUCH) Input.requestLock();
    }
    if (IS_TOUCH) TouchUI.update();
  },

  onKeyDown(code, e) {
    if (this._creditsOpen) {
      if (code === 'Space' || code === 'Enter' || code === 'Escape' || code === 'NumpadEnter') this.closeCredits();
      return;
    }
    if (this.mode === CS.MODE.MENU) return;
    /* РЕДАКТОР КАРТ: F — сохранить, Esc — выход, остальное — горячие клавиши */
    if (this.mode === CS.MODE.EDITOR) {
      if (code === 'KeyF') { MapEditor.save(); return; }
      if (code === 'Escape') { this.stopToMenu(); UI.show('menu'); return; }
      MapEditor.hotkey(code);
      return;
    }
    // While the buy menu is open it owns the keyboard (B / Enter / Esc close it,
    // 1-9 buy the numbered item, Tab is a no-op).
    if (this.buyOpen) {
      if (code === 'KeyB' || code === 'Enter' || code === 'Escape') { this.toggleBuy(false); return; }
      if (/^Digit[1-9]$/.test(code)) {
        const n = parseInt(code.slice(5), 10);
        const cards = UI.el.buyGrid.children;
        if (cards[n - 1]) cards[n - 1].click();
      }
      return;
    }
    // F1 = ready up: start the round early once both players agree
    if (code === 'F1' && this.roundState === 'buy') { this.voteSkipBuy(); return; }
    switch (code) {
      case 'Escape':
        // Releasing the pointer lock (which Esc does natively) already pauses
        // us. Ignore the keydown that immediately follows, or we would unpause
        // in the same instant.
        if (this._lockLostAt && U.now() - this._lockLostAt < 300) break;
        if (this.shooterPickOpen) { this.toggleShooterPick(false); break; }
        if (this.enemySpawnOpen) { this.toggleEnemySpawn(false); break; }
        if (UI.current === 'scoreboard') UI.show('hud');
        else if (this.paused) this.togglePause(false);
        else this.togglePause(true);
        break;
      case 'Tab':
        // hold to view, like Counter-Strike
        if (!this.paused && UI.current !== 'scoreboard') {
          UI.renderScoreboard(this);
          UI.show('scoreboard');
          this._tabHeld = true;
        }
        break;
      case 'KeyB':
        if (this.roundState === 'buy' || this.mode === CS.MODE.RANGE) this.toggleBuy(true);
        else { UI.toast('Магазин доступен только в фазе закупки'); Audio3D_SFX.deny(); }
        break;
      case 'KeyR': if (!this.paused) { if (this.isMechActive()) this.mechSurge(); else this.player.reload(); } break;
      case 'KeyH': if (!this.paused) this.useMedkit(); break;
      case 'KeyG':
        if (!this.paused) {
          /* G — ВСЕГДА бросок гранаты (если есть граната). Раньше при наличии
             мехакостюма G уходило на посадку в мех и гранату БРОСИТЬ БЫЛО
             НЕЛЬЗЯ. Теперь: в мехе — выйти, а на земле — граната. */
          const pp = this.player;
          const gk = Store.data.grenade || 'frag';
          const haveNade = pp && pp.grenades && (pp.grenades[gk] || 0) > 0;
          if (this.isMechActive()) this.exitMechSuit();
          else if (haveNade) this.throwGrenade();
          else if (pp && pp.mechOwned) {
            const d = this.parkedMechDist();
            if (d < 0 || d <= 6) this.equipMechSuit();
            else { UI.toast('Нет гранат · подойдите к меху, чтобы сесть', '#f5d33c'); Audio3D_SFX.deny(); }
          }
          else this.throwGrenade();
        }
        break;
      case 'KeyJ': if (!this.paused) this.cycleGrenade(); break;
      case 'KeyF': if (!this.paused) { if (this.drone) this.detonateDrone(false); else this.launchDrone(); } break;
      // dedicated climb: E vaults onto whatever the player is facing
      case 'KeyE': if (!this.paused) { if (this.isMechActive()) this.launchMechMissiles(); else if (this.player) this.player.climbQueued = true; } break;
      case 'Digit1': if (!this.paused) this.switchSlot(1); break;
      case 'Digit2': if (!this.paused) this.switchSlot(2); break;
      case 'Digit3': if (!this.paused) this.switchSlot(3); break;
      case 'KeyQ': if (!this.paused) { this.switchSlot(this.player.nextSlot()); UI.showWheel(this); setTimeout(() => UI.hideWheel(), 1500); } break;
      case 'KeyN': this.invertY(); break;
      // On PC the pointer is locked during play, so DOM buttons cannot be
      // clicked at all — the range features get keyboard shortcuts.
      // (The aim drill is PC-only; see toggleAimTrain.)
      case 'KeyT':
        if (this.mode === CS.MODE.RANGE && !IS_TOUCH) this.toggleAimTrain(!this.aim);
        break;
      // shooting dummy: V turns it on/off (range), C opens the weapon picker;
      // outside the range V launches the turret-drone gear instead
      case 'KeyV':
        if (this.mode === CS.MODE.RANGE) this.toggleShooterDummy();
        else if (!this.paused) this.useTurretGear();
        break;
      case 'KeyC':
        if (this.mode === CS.MODE.RANGE) this.toggleShooterPick(!this.shooterPickOpen);
        break;
      case 'BracketLeft':
        if (this.mode === CS.MODE.RANGE && !this.shooterPickOpen) this.cycleShooterWeapon(-1);
        break;
      case 'BracketRight':
        if (this.mode === CS.MODE.RANGE && !this.shooterPickOpen) this.cycleShooterWeapon(1);
        break;
      // range enemy spawner; in the mech X is the ground dash
      case 'KeyX':
        if (this.mode === CS.MODE.RANGE) this.toggleEnemySpawn(!this.enemySpawnOpen);
        else if (!this.paused && this.isMechActive()) Input.dashQueued = true;
        break;
      case 'KeyZ':
        if (this.mode === CS.MODE.RANGE && this.enemySpawnOpen) this.cycleSpawnHp(1);
        break;
      /* M — save the run at any moment; Y — unstick the horde (2-min cooldown) */
      case 'KeyM':
        if (!this.paused) this.manualSave();
        break;
      case 'KeyY':
        if (!this.paused) this.resetZombiePositions();
        break;
      case 'KeyO':
        if (!this.paused) this.cycleTimeOfDay();
        break;
      /* P — cycle the weather; L — toggle the whole environment off/on */
      case 'KeyP':
        if (!this.paused) this.cycleWeather();
        break;
      case 'KeyL':
        if (!this.paused) this.toggleEnvironment();
        break;
      /* U — подорвать свои прилипшие липучки (как в GTA) */
      case 'KeyU':
        if (!this.paused) this.detonateStickies();
        break;
    }
  },

  /* ============================================================
     ACHIEVEMENTS · RECORDS · PET
     ============================================================ */
  statsSnapshot() {
    const p = this.player;
    const shots = p ? p.bulletsFired : 0;
    const hits = p ? p.bulletsHit : 0;
    return {
      kills: p ? p.zombieKills : 0,
      headshots: p ? p.headshots : 0,
      money: p ? p.money : 0,
      wave: this.offline ? this.offline.wave : 0,
      bossKills: this._bossKills || 0,
      playTime: this.offline ? (U.now() - this.offline.startTime) / 1000 : 0,
      score: p ? p.score : 0,
      shots: shots,
      accuracy: shots > 0 ? (hits / shots) * 100 : 0,
      /* run-level counters kept on the game object */
      mechKills: this._mechKills || 0,
      mechTime: this._mechTime || 0,
      mechMiniBossKills: this._mechMiniBossKills || 0,
      knifeKills: this._knifeKills || 0,
      bestHeadStreak: this._bestHeadStreak || 0,
      medkitsUsed: this._medkitsUsed || 0,
      maxWaveKills: this._maxWaveKills || 0,
      perfectWaves: this._perfectWaves || 0,
      noDamageWaves: this._noDamageWaves || 0,
      /* heavy-weapon kill counters (one per heavy gun) */
      minigunKills: (this._hvKills && this._hvKills.minigun) || 0,
      rpgKills: (this._hvKills && this._hvKills.rpg) || 0,
      laserKills: (this._hvKills && this._hvKills.laser) || 0,
      cannonKills: (this._hvKills && this._hvKills.laserCannon) || 0,
      atomicKills: (this._hvKills && this._hvKills.atomicRpg) || 0,
      yhsKills: (this._hvKills && this._hvKills.yhs) || 0,
      rocketKills: (this._hvKills && this._hvKills.rocketgun) || 0,
      shieldKills: this._shieldKills || 0,
      /* persistent lifetime totals */
      killsTotal: Store.data.killsTotal || 0,
      wins: Store.data.wins || 0,
      clears: Store.data.clears || 0,
      /* интересные цели: лучший «залп» убийств за 5 с, быстрые прохождения,
         время ТЕКУЩЕГО забега (playTime включает и прошлые сохранённые этапы) */
      fastKills: this._fastKills || 0,
      fastClear: this._fastClears || 0,
      runTime: this.offline ? (U.now() - this.offline.startTime) / 1000 : 0,
      /* новые интересные счётчики */
      miniBossKills: this._miniBossKills || 0,
      spent: p ? (p.moneySpent || 0) : 0,
      misses: p ? Math.max(0, (p.bulletsFired | 0) - (p.bulletsHit | 0)) : 0,
      wavesNoReload: this._wavesNoReload || 0,
      wavesNoShots: this._wavesNoShots || 0,
      top3: Store.data.top3 || 0,
      hardcoreWave: this._hardcoreWave || 0,
      hardcoreFull: Store.data.hardcoreFull === 1,
      /* финальное платиновое достижение: сколько остальных уже выполнено */
      otherDone: (typeof achOtherDone === 'function') ? achOtherDone(Store.data.ach) : 0,
      otherTotal: (typeof achOtherTotal === 'function') ? achOtherTotal() : (ACHIEVEMENTS.length - 1),
      otherAchievementsDone: (typeof achAllOthersDone === 'function') ? achAllOthersDone(Store.data.ach) : false
    };
  },
  checkAchievements() {
    const ach = Store.data.ach = Store.data.ach || {};
    let earned = false;
    const grant = a => {
      ach[a.id] = 1; earned = true;
      UI.toast('ДОСТИЖЕНИЕ: ' + a.name + ' — ' + a.desc, '#ffd24a');
      UI.feed('<span class="z">🏆 ' + a.name + '</span>');
      Audio3D_SFX.buy();
      /* финальное: вместе с ним открывается галактический скин персонажа */
      if (a.id === 'platinum_all') {
        Store.data.skinChar = 'galaxy';
        UI.center('ВЛАДЫКА ГАЛАКТИКИ', 'Открыт скин «ГАЛАКТИКА» на оружие и персонажа', 4.5);
        UI.feed('<span class="z">🌌 Открыт галактический скин персонажа</span>');
      }
    };
    const s = this.statsSnapshot();
    ACHIEVEMENTS.forEach(a => {
      if (ach[a.id] || a.id === 'platinum_all') return;   // platinum handled last
      if (a.check(s)) grant(a);
    });
    /* платина зависит от ВСЕХ остальных, которые могли быть выданы прямо сейчас,
       поэтому её проверяем ПОСЛЕ цикла по свежему состоянию ach */
    if (!ach['platinum_all']) {
      const pa = ACHIEVEMENTS.find(a => a.id === 'platinum_all');
      if (pa && achAllOthersDone(ach)) grant(pa);
    }
    if (earned) { Store.save(); if (typeof ACCOUNT !== 'undefined') ACCOUNT.scheduleSync(); }
    return earned;
  },
  recordRun() {
    const p = this.player;
    if (!p) return;
    const runs = Store.data.runs = Store.data.runs || [];
    runs.push({
      score: p.score, wave: this.offline ? this.offline.wave : 0,
      kills: p.zombieKills, mode: this.specialMode || 'normal',
      date: new Date().toISOString().slice(0, 10)
    });
    runs.sort((a, b) => b.score - a.score);
    Store.data.runs = runs.slice(0, 10);
    Store.save();
    if (typeof ACCOUNT !== 'undefined') ACCOUNT.scheduleSync();
  },
  /* ============================================================
     MANUAL SAVE / ZOMBIE UNSTICK / (pet removed)
     ============================================================ */
  /* Save the run right now, at any moment, into this mode's slot. */
  manualSave() {
    if (this.mode !== CS.MODE.OFFLINE) { UI.toast('Сохранение доступно в оффлайне', '#e33a2e'); Audio3D_SFX.deny(); return false; }
    if (!this.player || !this.offline) return false;
    this.saveCheckpoint(this.offline.wave || 1);
    UI.center('ИГРА СОХРАНЕНА', offlineModeLabel(this.checkpointKey()) + ' · волна ' + (this.offline.wave || 1), 1.6);
    UI.toast('Сохранено: волна ' + (this.offline.wave || 1), '#57d16a');
    UI.feed('<span class="z">💾 Сохранено · волна ' + (this.offline.wave || 1) + '</span>');
    Audio3D_SFX.pickup();
    return true;
  },

  /* Y — once every 2 minutes: teleport every zombie back to its spawn ring so
     any that got wedged in geometry pop out. */
  resetZombiePositions() {
    const cd = 120;                 // seconds between uses
    const now = U.now();
    if (this._zResetAt && now - this._zResetAt < cd * 1000) {
      const left = Math.ceil((cd * 1000 - (now - this._zResetAt)) / 1000);
      UI.toast('Сброс зомби через ' + left + 'с', '#f5d33c');
      Audio3D_SFX.deny();
      return false;
    }
    if (!this.horde || !this.horde.list.length) { UI.toast('Зомби нет', '#f5d33c'); return false; }
    this._zResetAt = now;
    const spawns = MAP.zombieSpawns && MAP.zombieSpawns.length ? MAP.zombieSpawns : [{ x: 0, z: 0 }];
    let n = 0;
    for (const z of this.horde.list) {
      if (!z.alive || z.dying) continue;
      const s = U.pick(spawns);
      const jx = s.x + U.rand(-2, 2), jz = s.z + U.rand(-2, 2);
      z.pos.x = jx; z.pos.z = jz;
      z.pos.y = this.world.groundAt(jx, jz, 4) || 0;
      z.vel.x = z.vel.y = z.vel.z = 0;
      z.stuckT = 0;
      if (typeof z.thaw === 'function' && z.frozen) z.thaw();
      this.effects.particle(jx, z.pos.y + 1, jz, 0, 1.2, 0, .5, 'spark', .5);
      n++;
    }
    UI.center('СБРОС ЗОМБИ', n + ' возвращены на спавн', 1.6);
    UI.toast('Зомби сброшены: ' + n, '#4aa3ff');
    Audio3D_SFX.uiClick();
    return true;
  },

  invertY() {
    Input.invertY *= -1;
    UI.toast('Инверсия мыши: ' + (Input.invertY < 0 ? 'вкл' : 'выкл'));
  },

  /* ============================================================
     ENVIRONMENT: time of day + weather (+ optional auto cycle)
     ============================================================ */
  /* K cycles DAY → SUNSET → NIGHT → DAWN (kept for the old control). */
  cycleTimeOfDay() {
    const cur = this.envTod();
    const next = TOD_ORDER[(TOD_ORDER.indexOf(cur) + 1) % TOD_ORDER.length];
    Store.data.timeOfDay = next; Store.data.weather = next; Store.save();
    this.applyTimeOfDay();
    UI.toast('Время суток: ' + todName(next), (next === 'night' || next === 'dawn') ? '#4aa3ff' : '#ffd24a');
    Audio3D_SFX.uiClick();
    if (typeof UI !== 'undefined' && UI.refreshEnv) UI.refreshEnv();
    if (typeof UI !== 'undefined' && UI.broadcastEnv) UI.broadcastEnv();
  },
  /* P cycles the weather. */
  cycleWeather() {
    const cur = Store.data.skyWeather || 'clear';
    const next = WEATHER_ORDER[(WEATHER_ORDER.indexOf(cur) + 1) % WEATHER_ORDER.length];
    Store.data.skyWeather = next; Store.save();
    this.applyTimeOfDay();
    UI.toast('Погода: ' + weatherName(next), '#4ad6ff');
    Audio3D_SFX.uiClick();
    if (typeof UI !== 'undefined' && UI.refreshEnv) UI.refreshEnv();
    if (typeof UI !== 'undefined' && UI.broadcastEnv) UI.broadcastEnv();
  },
  envTod() { return Store.data.timeOfDay || Store.data.weather || 'day'; },
  envWeather() { return Store.data.skyWeather || 'clear'; },
  envEnabled() { return !Store.data.envOff; },
  /* L — switch time-of-day + weather OFF (always clear day) or back ON. */
  toggleEnvironment() {
    Store.data.envOff = Store.data.envOff ? 0 : 1;
    Store.save();
    this.applyTimeOfDay();
    UI.toast(Store.data.envOff ? 'Окружение: ВЫКЛ (ясный день)' : 'Окружение: ВКЛ', Store.data.envOff ? '#e33a2e' : '#57d16a');
    Audio3D_SFX.uiClick();
    if (UI.refreshEnv) UI.refreshEnv();
    if (UI.broadcastEnv) UI.broadcastEnv();
  },

  /* a per-time-of-day palette: sky, fog, sun colour/strength, ambient */
  _todPreset(k) {
    switch (k) {
      case 'sunset': return { sky: 0xc98a52, fog: 0xc08a5a, fogMul: 1.25, sun: 0xffb070, sunMul: .72, amb: 0x000000, ambMul: 0 };
      case 'night':  return { sky: 0x080c18, fog: 0x0a1020, fogMul: 1.7,  sun: 0x8090c0, sunMul: .25, amb: 0x33406a, ambMul: .45 };
      case 'dawn':   return { sky: 0x8a86b8, fog: 0x9a94b0, fogMul: 1.35, sun: 0xd0b8e0, sunMul: .55, amb: 0x202840, ambMul: .25 };
      default:       return { sky: 0xbcc6cf, fog: 0xbcc6cf, fogMul: 1.0,  sun: 0xffffff, sunMul: 1.0,  amb: 0x000000, ambMul: 0 };
    }
  },
  /* how much each weather dims/greys the light and thickens the fog */
  _weatherPreset(k) {
    switch (k) {
      case 'clouds': return { dim: .78, fogMul: 1.2, tint: 0xb8bec6, sun: 0xdcdce4 };
      case 'rain':   return { dim: .60, fogMul: 1.5, tint: 0x8f98a2, sun: 0xc8d0d8 };
      case 'storm':  return { dim: .42, fogMul: 1.8, tint: 0x6d747e, sun: 0xaab4c0 };
      case 'fog':    return { dim: .70, fogMul: 2.6, tint: 0xb0b6bc, sun: 0xd8dade };
      case 'snow':   return { dim: .80, fogMul: 1.6, tint: 0xcdd6de, sun: 0xe8f0f8 };
      case 'ash':    return { dim: .55, fogMul: 1.7, tint: 0x6a6258, sun: 0xd09070 };
      default:       return { dim: 1.0, fogMul: 1.0, tint: 0xffffff, sun: 0xffffff };
    }
  },

  applyTimeOfDay() {
    /* compute the DESIRED environment; the actual scene values are eased toward
       it every frame in updateEnv(), so weather / time changes are smooth
       instead of snapping. */
    const t = this._envCompute();
    this._envTarget = t;
    if (!this._envCur) {
      this._envCur = {
        sky: t.sky.clone(), fog: t.fog.clone(), sunCol: t.sunCol.clone(),
        ambCol: t.ambCol.clone(), fogDen: t.fogDen, sun: t.sun, ambI: t.ambI
      };
    }
    this.applyWeatherFX(t.wx);
    this._envApply();
  },

  /* desired environment values for the current time-of-day + weather */
  _envCompute() {
    const on = this.envEnabled();
    const tod = on ? this.envTod() : 'day';
    const wx = on ? this.envWeather() : 'clear';
    const tp = this._todPreset(tod), wp = this._weatherPreset(wx);
    // capture the map's baseline sun intensity + fog density on first use
    if (this._daySunIntensity === undefined) {
      this._daySunIntensity = 1;
      if (this.scene) this.scene.traverse(o => {
        if (o.isLight && o.type === 'DirectionalLight' && o.userData && o.userData.dayLight) {
          this._dayLight = o;
          this._daySunIntensity = o.userData.dayIntensity || o.intensity || 1;
        }
      });
    }
    if (this._dayFogDensity === undefined) {
      this._dayFogDensity = (this.scene && this.scene.fog) ? this.scene.fog.density : .0055;
    }
    const sky = new THREE.Color(tp.sky).lerp(new THREE.Color(wp.tint), wx === 'clear' ? 0 : .45);
    const fog = new THREE.Color(tp.fog).lerp(new THREE.Color(wp.tint), .35);
    const sunCol = new THREE.Color(tp.sun).lerp(new THREE.Color(wp.sun), .5);
    const sun = this._daySunIntensity * tp.sunMul * wp.dim;
    const ambCol = new THREE.Color(tp.amb || wp.tint);
    const ambI = Math.max(tp.ambMul, wx === 'storm' ? .35 : wx === 'ash' ? .30 : 0);
    const fogDen = this._dayFogDensity * tp.fogMul * wp.fogMul;
    return { sky, fog, fogDen, sun, sunCol, ambCol, ambI, wx, ambOn: tp.ambMul > 0 || wx === 'storm' || wx === 'ash' };
  },

  /* write the CURRENT eased values onto the scene */
  _envApply() {
    const c = this._envCur;
    if (!c) return;
    const g = MAP.group;
    const sky = g && g.userData && g.userData.sky;
    if (sky && sky.material) { sky.material.color.copy(c.sky); sky.material.needsUpdate = true; }
    if (this.scene && this.scene.fog) {
      this.scene.fog.color.copy(c.fog);
      this.scene.fog.density = c.fogDen;
    }
    if (this._dayLight) {
      this._dayLight.intensity = c.sun;
      this._dayLight.color.copy(c.sunCol);
    }
    if (!this._ambient) { this._ambient = new THREE.AmbientLight(0xffffff, 0.25); this.scene.add(this._ambient); }
    const t = this._envTarget;
    this._ambient.visible = !!(t && t.ambOn) || c.ambI > 0.004;
    this._ambient.color.copy(c.ambCol);
    this._ambient.intensity = c.ambI;
  },

  /* called every frame: ease sky / fog / sun / ambient toward the target, and
     fade the weather particles in and out instead of popping */
  updateEnv(dt) {
    if (this._envCur && this._envTarget) {
      const k = 1 - Math.exp(-dt / 2.4);           // ~2.4 s time constant
      const c = this._envCur, t = this._envTarget;
      c.sky.lerp(t.sky, k);
      c.fog.lerp(t.fog, k);
      c.sunCol.lerp(t.sunCol, k);
      c.ambCol.lerp(t.ambCol, k);
      c.fogDen = U.lerp(c.fogDen, t.fogDen, k);
      c.sun = U.lerp(c.sun, t.sun, k);
      c.ambI = U.lerp(c.ambI, t.ambI, k);
    }
    this._envApply();
    // weather particles: fade opacity toward the wanted value, hide at 0
    const pts = this._wxPoints;
    if (pts && pts.material) {
      const want = this._wxWantVisible ? (pts.userData.baseOpacity || .75) : 0;
      const k = 1 - Math.exp(-dt / 1.1);
      pts.material.opacity = U.lerp(pts.material.opacity || 0, want, k);
      if (pts.material.opacity < 0.01) pts.visible = false;
      else if (!pts.visible) pts.visible = true;
    }
  },

  /* ============================================================
     WEATHER PARTICLE FX (rain / snow / ash / dust) — a compact recycled
     point cloud that follows the camera. Built once, retuned per weather.
     ============================================================ */
  applyWeatherFX(kind) {
    if (!this.scene) return;
    const want = this.envEnabled() && (kind === 'rain' || kind === 'storm' || kind === 'snow' || kind === 'ash');
    this._wxWantVisible = want;
    if (!want) {
      // keep the cloud so it can fade out; just stop wanting it visible
      this._wxLightning = 0;
      return;
    }
    const N = kind === 'snow' ? 900 : 1400;
    if (!this._wxPoints || this._wxPoints.userData.kind !== kind) {
      if (this._wxPoints) { this.scene.remove(this._wxPoints); disposeGroupDeep(this._wxPoints); }
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(N * 3);
      const R = 26, H = 34;
      for (let i = 0; i < N; i++) {
        pos[i * 3] = U.rand(-R, R); pos[i * 3 + 1] = U.rand(0, H); pos[i * 3 + 2] = U.rand(-R, R);
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const isSnow = kind === 'snow', isAsh = kind === 'ash', isRain = kind === 'rain' || kind === 'storm';
      /* дождь: серые вытянутые капли-штрихи (текстура вертикальной полосы),
         снег — белые точки, пепел — оранжевые искры */
      const col = isSnow ? 0xffffff : isAsh ? 0xff8a4a : (kind === 'storm' ? 0x9aa2ac : 0xaab2bc);
      const mat = new THREE.PointsMaterial({
        color: col, size: isSnow ? .16 : isAsh ? .12 : (kind === 'storm' ? .5 : .42),
        map: isRain ? rainStreakTexture() : null,
        transparent: true, opacity: isSnow ? .9 : isAsh ? .75 : .8,
        depthWrite: false, sizeAttenuation: true,
        blending: isAsh ? THREE.AdditiveBlending : THREE.NormalBlending
      });
      const pts = new THREE.Points(geo, mat);
      pts.frustumCulled = false;
      pts.renderOrder = 6;
      pts.userData.kind = kind;
      pts.userData.R = R; pts.userData.H = H;
      pts.userData.baseOpacity = isSnow ? .9 : isAsh ? .75 : .8;
      pts.visible = false;
      pts.material.opacity = 0;
      this.scene.add(pts);
      this._wxPoints = pts;
    }
    this._wxPoints.visible = true;
    this._wxPoints.material.size = kind === 'snow' ? .16 : kind === 'ash' ? .12 : (kind === 'storm' ? .5 : .42);
    this._wxSpeed = kind === 'snow' ? 4.5 : kind === 'ash' ? 2.2 : (kind === 'storm' ? 42 : 30);
  },

  /* called every frame: drift the weather particles around the camera */
  updateWeather(dt) {
    const pts = this._wxPoints;
    if (!pts || !pts.visible) return;
    const pos = pts.geometry.attributes.position;
    const arr = pos.array;
    const R = pts.userData.R, H = pts.userData.H;
    const kind = pts.userData.kind;
    const cam = this.camera ? this.camera.position : this.player.pos;
    const snow = kind === 'snow', ash = kind === 'ash';
    const drift = snow ? 2.2 : ash ? 1.4 : 3.0;
    const fall = (this._wxSpeed || 30) * dt;
    for (let i = 0; i < arr.length; i += 3) {
      arr[i + 1] -= fall * (ash ? .5 : 1);
      arr[i] += (Math.sin((arr[i + 1] + i) * .3) * drift + (ash ? .8 : 0)) * dt;
      arr[i + 2] += Math.cos((arr[i + 1] + i) * .21) * drift * dt;
      if (arr[i + 1] < 0) {
        arr[i] = cam.x + U.rand(-R, R);
        arr[i + 2] = cam.z + U.rand(-R, R);
        arr[i + 1] = H;
      }
      // wrap X/Z around the camera so the field always surrounds the player
      if (arr[i] - cam.x > R) arr[i] -= R * 2;
      else if (arr[i] - cam.x < -R) arr[i] += R * 2;
      if (arr[i + 2] - cam.z > R) arr[i + 2] -= R * 2;
      else if (arr[i + 2] - cam.z < -R) arr[i + 2] += R * 2;
    }
    pos.needsUpdate = true;
    // lightning flashes during a storm
    if (kind === 'storm') {
      this._wxLightning = Math.max(0, (this._wxLightning || 0) - dt);
      this._wxBoltT = (this._wxBoltT || 0) - dt;
      if (this._wxBoltT <= 0) {
        this._wxBoltT = U.rand(2.5, 8);
        this._wxLightning = .18;
        if (this._lightningLight) { this._lightningLight.intensity = 3.2; Audio3D_SFX && Audio3D_SFX.explosionAt && Audio3D_SFX.explosionAt(cam.x + U.rand(-30, 30), 18, cam.z + U.rand(-30, 30)); }
      }
      if (!this._lightningLight) { this._lightningLight = new THREE.HemisphereLight(0xcfe0ff, 0x203040, 0); this.scene.add(this._lightningLight); }
      if (this._lightningLight) this._lightningLight.intensity = Math.max(0, (this._lightningLight.intensity || 0) - dt * 14);
      if (this._wxLightning > 0 && this._lightningLight) this._lightningLight.intensity = 2.6;
    }
  },

  /* AUTO cycle: slowly advance the time of day (and occasionally the weather).
     In online play only the HOST advances it, then broadcasts so both players
     stay on the same time of day and weather. */
  updateEnvCycle(dt) {
    if (!this.envEnabled() || !Store.data.envAuto) return;
    if (this.mode === CS.MODE.ONLINE && Net.role !== CS.NETROLE.HOST) return;
    this._envT = (this._envT || 0) + dt * (Store.data.envAutoSpeed || 1);
    if (this._envT >= 22) {
      this._envT = 0;
      const cur = this.envTod();
      const next = TOD_ORDER[(TOD_ORDER.indexOf(cur) + 1) % TOD_ORDER.length];
      Store.data.timeOfDay = next; Store.data.weather = next; Store.save();
      UI.toast('Время суток: ' + todName(next), (next === 'night' || next === 'dawn') ? '#4aa3ff' : '#ffd24a');
      this.applyTimeOfDay();
      if (UI.refreshEnv) UI.refreshEnv();
      if (UI.broadcastEnv) UI.broadcastEnv();
    }
  },

  /* ---- placeables: turret / barricade / mine ---- */
  cycleBuildable() {
    const order = ['turret', 'barricade', 'mine'];
    const cur = Store.data.buildable || 'turret';
    const next = order[(order.indexOf(cur) + 1) % order.length];
    Store.data.buildable = next; Store.save();
    const p = this.player;
    UI.toast('Постройка: ' + buildableName(next) + ' (' + ((p && p.builds[next]) || 0) + ' шт)', '#4ad6ff');
    Audio3D_SFX.uiClick();
  },
  placeBuildable() {
    const p = this.player;
    if (!p || !p.alive) return false;
    if (this.mode === CS.MODE.MENU || this.paused) return false;
    const kind = Store.data.buildable || 'turret';
    const n = (p.builds && p.builds[kind]) || 0;
    if (n <= 0) { UI.toast('Нет построек — купите в магазине (B)', '#f5d33c'); Audio3D_SFX.deny(); return false; }
    p.builds[kind] = n - 1;
    const eye = this.eyePos();
    const d = this.cameraDir();
    const bx = eye.x + d.x * 3.0, bz = eye.z + d.z * 3.0;
    const by = (this.world.groundAt(bx, bz, eye.y + 3) || 0);
    if (kind === 'turret') this.spawnPlayerTurret(bx, by, bz);
    else if (kind === 'barricade') this.spawnBarricade(bx, by, bz, p.yaw);
    else this.spawnMine(bx, by, bz);
    UI.toast(buildableName(kind) + ' установлена', '#57d16a');
    Audio3D_SFX.buy();
    return true;
  },
  spawnPlayerTurret(x, y, z) {
    const mesh = buildPlayerTurret();
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    this._turrets = this._turrets || [];
    this._turrets.push({ mesh: mesh, pos: { x: x, y: y, z: z }, fireCd: 0, life: 60, dmg: 42, range: 34 });
  },
  spawnBarricade(x, y, z, yaw) {
    const mesh = buildBarricade();
    mesh.position.set(x, y, z);
    mesh.rotation.y = yaw;
    this.scene.add(mesh);
    const box = aabbFromBase(x, y, z, 2.2, 1.3, .5);
    box.tag = 'cover';
    this.world.addBox(box);
    this._barricades = this._barricades || [];
    this._barricades.push({ mesh: mesh, box: box, x: x, y: y, z: z, life: 75 });
  },
  spawnMine(x, y, z) {
    const mesh = buildMine();
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    this._mines = this._mines || [];
    this._mines.push({ mesh: mesh, pos: { x: x, y: y, z: z }, armed: 1.0 });
  },
  clearBuildables() {
    ['_turrets', '_barricades', '_mines'].forEach(k => {
      const arr = this[k];
      if (!arr) return;
      for (const b of arr) {
        if (b.mesh && b.mesh.parent) b.mesh.parent.remove(b.mesh);
        if (b.mesh && b.mesh.traverse) b.mesh.traverse(o => { if (o.geometry) o.geometry.dispose(); });
        if (b.box) { const idx = this.world.boxes.indexOf(b.box); if (idx >= 0) this.world.boxes.splice(idx, 1); }
      }
      arr.length = 0;
    });
  },
  /* ---- environmental hazards: lava burns, spikes chill, presses slam ---- */
  updateHazards(dt) {
    const hz = MAP.hazards;
    if (!hz || !hz.length) return;
    const p = this.player;
    for (const h of hz) {
      if (h.kind === 'press') {
        h.phase += dt;
        const cyc = h.phase % 3.2;
        const down = cyc < .5 ? cyc / .5 : cyc < 1.2 ? 1 : cyc < 1.7 ? 1 - (cyc - 1.2) / .5 : 0;
        h.plate.position.y = 4.2 - down * 3.7;
        h.slam = down > .9;
      }
      // player inside the hazard
      const d = Math.hypot(p.pos.x - h.x, p.pos.z - h.z);
      if (d < h.r && Math.abs(p.pos.y) < 2.5) {
        if (h.kind === 'lava') this.applyDamageToSelf(h.dps * dt * 3, { x: h.x, y: 0, z: h.z });
        else if (h.kind === 'spikes' && p.onGround) this.applyDamageToSelf(h.dps * dt, { x: h.x, y: 0, z: h.z });
        else if (h.kind === 'press' && h.slam) this.playerHurt(h.dps, null);
      }
      // zombies too (the environment is on your side)
      if (this.horde) for (const z of this.horde.list) {
        if (!z.alive || z.dying || z.isBoss) continue;
        const dz = Math.hypot(z.pos.x - h.x, z.pos.z - h.z);
        if (dz > h.r) continue;
        if (h.kind === 'lava') z.takeDamage(h.dps * dt * 2, 'body', { x: 0, y: 0, z: 0 });
        else if (h.kind === 'spikes') { if (typeof z.freeze === 'function') z.freeze(.8); else z.frozen = true; }
        else if (h.kind === 'press' && h.slam && !z._slamCd) { z._slamCd = .5; z.takeDamage(h.dps, 'body', { x: 0, y: 0, z: 0 }); }
      }
      if (this.horde) for (const z of this.horde.list) if (z._slamCd > 0) z._slamCd -= dt;
    }
  },

  updateBuildables(dt) {
    // ---- turrets ----
    if (this._turrets) for (let i = this._turrets.length - 1; i >= 0; i--) {
      const t = this._turrets[i];
      t.life -= dt;
      if (t.life <= 0) { if (t.mesh.parent) t.mesh.parent.remove(t.mesh); t.mesh.traverse(o => { if (o.geometry) o.geometry.dispose(); }); this._turrets.splice(i, 1); continue; }
      let best = null, bd = t.range * t.range;
      if (this.horde) for (const z of this.horde.list) {
        if (!z.alive || z.dying) continue;
        const dd = (z.pos.x - t.pos.x) * (z.pos.x - t.pos.x) + (z.pos.z - t.pos.z) * (z.pos.z - t.pos.z);
        if (dd < bd) { bd = dd; best = z; }
      }
      if (best) {
        const to = { x: best.pos.x, y: best.pos.y + 1.0 * best.scale, z: best.pos.z };
        t.mesh.lookAt(to.x, to.y, to.z);
        t.fireCd -= dt;
        if (t.fireCd <= 0) {
          t.fireCd = .2;
          best.takeDamage(t.dmg, 'body', { x: 0, y: 0, z: 0 });
          this.player.damageDealt += t.dmg;
          this.effects.tracer({ x: t.pos.x, y: t.pos.y + 1.1, z: t.pos.z }, to, true, .6);
          Audio3D_SFX.shot('smg', t.pos.x, t.pos.y, t.pos.z);
        }
      }
    }
    // ---- barricades ----
    if (this._barricades) for (let i = this._barricades.length - 1; i >= 0; i--) {
      const b = this._barricades[i];
      b.life -= dt;
      if (b.life <= 0) {
        if (b.mesh.parent) b.mesh.parent.remove(b.mesh);
        b.mesh.traverse(o => { if (o.geometry) o.geometry.dispose(); });
        const idx = this.world.boxes.indexOf(b.box);
        if (idx >= 0) this.world.boxes.splice(idx, 1);
        this._barricades.splice(i, 1);
      }
    }
    // ---- mines ----
    if (this._mines) for (let i = this._mines.length - 1; i >= 0; i--) {
      const m = this._mines[i];
      m.armed -= dt;
      let trigger = false;
      if (m.armed <= 0 && this.horde) {
        for (const z of this.horde.list) {
          if (!z.alive || z.dying) continue;
          if (Math.hypot(z.pos.x - m.pos.x, z.pos.z - m.pos.z) < 1.6 && Math.abs(z.pos.y - m.pos.y) < 2) { trigger = true; break; }
        }
      }
      if (trigger) {
        const R = 4.4, dmg = 260;
        this.effects.explosion(m.pos.x, m.pos.y + .2, m.pos.z, R, [0xffb060, 0x151210]);
        Audio3D_SFX.explosionAt(m.pos.x, m.pos.y, m.pos.z);
        for (const z of this.horde.list) {
          if (!z.alive || z.dying) continue;
          const dd = Math.hypot(z.pos.x - m.pos.x, (z.pos.y + 1) - m.pos.y, z.pos.z - m.pos.z);
          if (dd > R) continue;
          const dealt = dmg * (1 - dd / R);
          z.takeDamage(dealt, 'body', { x: 0, y: 0, z: 0 });
          this.player.damageDealt += dealt;
        }
        if (m.mesh.parent) m.mesh.parent.remove(m.mesh);
        m.mesh.traverse(o => { if (o.geometry) o.geometry.dispose(); });
        this._mines.splice(i, 1);
      }
    }
  },

  onMouseDown(btn, e) {
    if (this.mode === CS.MODE.MENU) return;
    /* РЕДАКТОР КАРТ: ЛКМ ставит блок, ПКМ убирает */
    if (this.mode === CS.MODE.EDITOR) {
      if (!Input.locked) { Input.requestLock(); return; }
      if (btn === 0) MapEditor.place();
      else if (btn === 2) MapEditor.removeAt();
      return;
    }
    if (this.buyOpen || this.paused || UI.overlayOpen()) return;
    if (!Input.locked) { Input.requestLock(); return; }
    if (btn === 0) {
      this.player.triggerDown = true;
      // The shield does not fire: LMB raises the field (if it is off cooldown).
      if (this.player.def && this.player.def.shield) {
        if (this.player.alive && this.roundState === 'live') this.activateShield();
        return;
      }
      // Semi-auto, pump-action and melee fire on press, so a fast click can
      // never fall between two frames and be swallowed. Full-auto weapons are
      // driven from the game loop while the button is held.
      const def = this.player.def;
      if (this.player.alive && this.roundState === 'live' && !def.auto) {
        // Latch only when a shot really leaves the barrel. If the weapon is
        // still deploying or reloading, the game loop retries while the button
        // stays held, so the click is never silently swallowed.
        if (this.fire()) this.player._semiLatch = true;
      }
    }
  },
  onMouseUp(btn) {
    if (btn === 0 && this.player) this.player.triggerDown = false;
  },

  switchSlot(s) {
    if (this.player.takeWeapon(s)) Audio3D_SFX.reloadStep(0);
  },

  /* ============================================================
     MODE START / STOP
     ============================================================ */
  startOffline(horde, free, custom, forcePreset) {
    this.stopToMenu(true);
    this.mode = CS.MODE.OFFLINE;
    this._campaignDone = false;
    this._campaignWon = false;
    this._offeredRestart = false;
    this._restartPending = false;
    this.offlineDead = false;
    this.offlineDeadT = 0;
    this._creditsOpen = false;
    this._modPickOpen = false;
    this._bossKills = 0;
    /* fresh run counters for the new achievement set */
    this._mechKills = 0; this._knifeKills = 0; this._bestHeadStreak = 0;
    this._mechTime = 0; this._mechMiniBossKills = 0;
    this._headStreak = 0; this._medkitsUsed = 0; this._maxWaveKills = 0;
    this._perfectWaves = 0; this._noDamageWaves = 0;
    this._waveKills = 0; this._waveHurt = false; this._runDeaths = 0;
    this._hvKills = {}; this._shieldKills = 0;
    this._fastKills = 0; this._killTimes = []; this._fastClears = 0;
    this._miniBossKills = 0; this._wavesNoReload = 0; this._wavesNoShots = 0;
    // NOTE: the checkpoint is deliberately NOT cleared here. It is dropped only
    // by an explicit "НОВАЯ ИГРА" (or after being consumed), so leaving to the
    // menu and returning can still resume the run.
    // CUSTOM mode reads its own multipliers from the settings.
    this.customOffline = custom === true;
    if (this.customOffline) {
      this.freePlay = Store.data.offFree === 1;
      this.hordeMode = false;                       // custom replaces the fixed ×10 preset
      this.offCountMul = U.clamp(parseFloat(Store.data.offCount) || 1, 0.1, 50);
      this.offHpMul = U.clamp(parseFloat(Store.data.offHp) || 1, 0.05, 20);
      // exact per-wave count: when set, every wave spawns exactly this many
      this.offCountExact = (Store.data.offCountFixed === 1)
        ? U.clamp(Math.round(parseFloat(Store.data.offCountExact) || 10), 1, 1000) : null;
    } else {
      // fixed presets: the "БЕСПЛАТНАЯ ОРДА" button (or a restart of it) sets free
      this.freePlay = free === true;
      this.offCountMul = null;
      this.offHpMul = null;
      this.offCountExact = null;
    }
    this._freeHorde = this.freePlay;
    /* ---- special offline modes (boss-rush / daily / endless) ---- */
    const offMode = Store.data.offMode || 'normal';
    this.specialMode = this.customOffline ? 'normal' : offMode;
    this.isBossRush = this.specialMode === 'bossrush';
    this.isEndless = this.specialMode === 'endless';
    this.isDaily = this.specialMode === 'daily';
    this.isHardcore = this.specialMode === 'hardcore';
    this.modState = makeModState();
    this.modList = [];
    this._modPending = false;
    this._dailySeed = 0;
    if (this.isDaily) {
      /* deterministic seed from the calendar day: everyone gets the same run.
         Three fixed modifiers are derived from that seed for all players. */
      const d = new Date();
      this._dailySeed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
      let s = this._dailySeed >>> 0;
      const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
      this.modList = MODIFIERS.slice().sort(() => rng() - .5).slice(0, 3);
      this.modList.forEach(m => m.apply(this.modState));
      Store.data.offMods = {}; this.modList.forEach(m => Store.data.offMods[m.id] = 1);
      Store.save();
    } else if (this.isEndless && forcePreset) {
      // a fresh endless run clears the stored modifier list
      Store.data.offMods = {}; Store.data.offModPick = 0; Store.save();
    }
    if (this.isEndless && !forcePreset) {
      /* resuming an endless run (e.g. from the menu): replay the stored picks */
      const stored = Store.data.offMods || {};
      this.modList = MODIFIERS.filter(m => stored[m.id]);
      this.modList.forEach(m => m.apply(this.modState));
    }
    this.ensureMap(Store.data.map);
    this.matchHP = Store.data.maxHP || 100;
    // ОРДА ×10: force the mass mode from the menu button, otherwise honour the
    // choice made in the settings panel. (Ignored in custom mode.) `forcePreset`
    // pins the preset chosen on the unified ОФФЛАЙН screen.
    if (!this.customOffline) {
      this.hordeMode = forcePreset ? (horde === true) : ((horde === true) || (horde !== false && Store.data.horde === 1));
    }
    this.offline = {
      wave: 0, toSpawn: 0, spawnedThisWave: 0, totalThisWave: 0,
      betweenWaves: false, breakT: 0, alive: 0, kills: 0, startTime: U.now(),
      campaignWon: false, bossPending: 0, bossType: null
    };
    // reset offline ammo crates for the new run
    this.clearCrates();
    this._crateT = CFG.crateInterval;
    this.clearMedboxes();
    this._medboxT = CFG.medkitFieldInterval;
    this.remotePlayers = []; this.remote = null;
    this.player = new Player({ id: 'p1', name: 'Вы', isLocal: true, team: 'ct' });
    this.player.money = 800;
    this.player.maxHealth = this.matchHP;
    this.player.health = this.matchHP;
    this.player.give('glock'); this.player.give('knife');
    this.player.slot = 1;
    this.player.height = CFG.playerHeight;
    // attach the first-person weapon to the weapon scene
    this.attachViewModel();

    this.horde = new Horde(this.scene, this.world, this);
    this.effects = new Effects(this.scene, Store.data.quality);
    this.effects.clear();

    this.spawnPlayerLocal(0);
    if (this.customOffline) {
      this.beginBuyPhase(30, 'СВОЙ ОФФЛАЙН — ВОЛНА 1');
      UI.toast('Свой оффлайн: зомби ×' + this.offCountMul + ' · HP ×' + this.offHpMul +
        (this.freePlay ? ' · магазин бесплатный' : ' · магазин платный'), '#4aa3ff');
    } else if (this.isBossRush) {
      this.beginBuyPhase(30, 'БОСС-РАШ — ЭТАП 1');
      UI.toast('БОСС-РАШ: только боссы, каждый сильнее', '#c24bff');
    } else if (this.isDaily) {
      this.beginBuyPhase(30, 'ИСПЫТАНИЕ ДНЯ');
      UI.toast('ИСПЫТАНИЕ ДНЯ · ' + this.modList.map(m => m.name).join(' · '), '#4aa3ff');
    } else if (this.isEndless) {
      this.beginBuyPhase(30, 'БЕСКОНЕЧНЫЙ — ВОЛНА 1');
      UI.toast('БЕСКОНЕЧНЫЙ: модификатор каждые 10 волн', '#c24bff');
    } else if (this.isHardcore) {
      this.beginBuyPhase(30, 'ХАРДКОР — ВОЛНА 1');
      UI.center('ХАРДКОР', 'ОДНА ЖИЗНЬ · смерть = конец забега', 3.0);
      UI.toast('ХАРДКОР: у вас одна жизнь. Без сохранений и чекпоинтов.', '#c4302a');
    } else {
      this.beginBuyPhase(30, this.hordeMode ? (this.freePlay ? 'БЕСПЛАТНАЯ ОРДА — ВОЛНА 1' : 'ОРДА — ВОЛНА 1') : 'ВОЛНА 1');
      if (this.freePlay && this.hordeMode) UI.toast('БЕСПЛАТНАЯ ОРДА: всё оружие бесплатно', '#57d16a');
      else if (this.hordeMode) UI.toast('ОРДА ×10: зомби в 10 раз больше, но хилые', '#e33a2e');
    }
    this.enterGame();
    UI.toast('Карта: ' + this.mapName() + ' · магазин: B', '#ff9d21');
  },

  /* Offline only: every `CFG.mapRotateEvery` waves the arena is swapped for a
     different one, so a long survival run keeps changing scenery. The next map
     is chosen at random but never repeats the current one. */
  rotateMapIfNeeded(nextWave) {
    /* частота смены карты настраивается в оффлайне (0 = никогда) */
    const every = Store.data.offMapFreq !== undefined ? (Store.data.offMapFreq || 0) : (CFG.mapRotateEvery || 10);
    if (!every) return false;
    if (!nextWave || nextWave < 1) return false;
    if (nextWave % every !== 1) return false;          // waves 1, 11, 21, 31…
    if (nextWave === 1) return false;                  // wave 1 keeps the chosen map
    const current = MAP.id;
    const pool = MAPS.filter(m => m.id !== current);
    if (!pool.length) return false;
    const next = U.pick(pool);
    this.buildArenaOnTheFly(next.id);
    Store.data.map = next.id;
    UI.refreshChips();
    UI.center('НОВАЯ КАРТА', next.name, 2.4);
    UI.toast('Карта сменилась: ' + next.name, '#4aa3ff');
    return true;
  },

  /* Swap the arena mid-run without leaving the match: rebuild the map, then
     put the player on a fresh spawn (enemies are gone, the wave restarts). */
  buildArenaOnTheFly(mapId) {
    // drop everything the old arena was holding BEFORE tearing it down.
    // The companion TURRET DRONE is NOT a transient projectile, so keep it:
    // it used to be wiped by clearProjectiles() and simply vanished on a map
    // change / new wave — that was the reported bug.
    this._keepTurret = this.turretDrone;
    if (this.turretDrone) this.turretDrone = null;
    this.clearProjectiles();
    this.clearDummyProjectiles();
    this.clearEnemyShots();
    this.clearDrone();
    this.clearBuildables();
    this.clearGrenades();
    this.clearCrates();
    this.clearMedboxes();
    if (this.horde) this.horde.clear();
    if (this.effects) { this.effects.clear(); }

    buildMap(this.scene, Store.data.quality, mapId);
    this.world = MAP.world;
    this.applyQuality();
    // a fresh horde so the flow field points at the new navigation grid
    this.horde = new Horde(this.scene, this.world, this);
    // re-place the player and reset the drop timers
    this.fxSpawnIndex = (this.fxSpawnIndex || 0) + 1;
    this.spawnPlayerLocal(this.fxSpawnIndex);
    // restore the drone (it re-hovers by the player on the new arena)
    if (this._keepTurret) {
      const td = this._keepTurret; this._keepTurret = null;
      if (!td.mesh.parent) this.scene.add(td.mesh);
      td.life = Math.max(td.life, 20);          // give it a fresh lease on the new arena
      this.turretDrone = td;
    }
    this._crateT = CFG.crateInterval;
    this._medboxT = CFG.medkitFieldInterval;
  },

  /* rebuild the arena when the chosen map differs from the loaded one */
  ensureMap(mapId) {    mapId = mapById(mapId).id;
    if (!MAP.group || MAP.id !== mapId) {
      buildMap(this.scene, Store.data.quality, mapId);
      this.world = MAP.world;
      this.applyQuality();
    }
    Store.data.map = mapId;
    UI.refreshChips();
  },

  /* КАСТОМНАЯ КАРТА ПО СЕТИ: хост прислал определение — сохраняем локально и
     регистрируем в реестре, чтобы ensureMap построил её одинаково у всех. */
  adoptCustomMap(def) {
    if (!def || !def.id) return;
    const list = (Store.data.customMaps && Array.isArray(Store.data.customMaps)) ? Store.data.customMaps : (Store.data.customMaps = []);
    const existing = list.find(m => m.id === def.id);
    if (existing) { existing.name = def.name; existing.blocks = def.blocks || []; existing.spawn = def.spawn || null; }
    else list.push({ id: def.id, name: def.name || 'КАРТА ХОСТА', blocks: def.blocks || [], spawn: def.spawn || null });
    Store.save();
    if (typeof registerCustomMapsIntoRegistry === 'function') registerCustomMapsIntoRegistry();
    if (typeof uiRefreshCustomMaps === 'function') uiRefreshCustomMaps();
  },

  attachViewModel() {
    this.player.buildViewModel();
    if (this.player.vmGroup.parent) this.player.vmGroup.parent.remove(this.player.vmGroup);
    this.vmScene.add(this.player.vmGroup);
  },

  /* ============================================================
     TEST RANGE (полигон): free shopping, dummies, damage-per-second
     ============================================================ */
  startRange() {
    this.stopToMenu(true);
    this.mode = CS.MODE.RANGE;
    this.freePlay = false;
    this.ensureMap(Store.data.map);
    this.offline = null;
    this.online = null;
    this.remotePlayers = []; this.remote = null;

    this.player = new Player({ id: 'p1', name: 'Вы', isLocal: true, team: 'ct' });
    this.player.money = 999999;          // everything is free here
    this.player.give('glock'); this.player.give('knife');
    this.player.slot = 1;
    this.player.maxHealth = 100;
    this.player.health = 100;
    this.matchHP = 100;
    this.attachViewModel();

    // no horde hunting the player; dummies are separate, static targets
    this.horde = new Horde(this.scene, this.world, this);
    this.dummies = [];
    this.targets = [];
    this.aim = null;                     // aim-training state (null = off)
    this.targetSeq = 1;
    this.effects = new Effects(this.scene, Store.data.quality);
    this.effects.clear();

    this.spawnPlayerLocal(0);
    this.spawnDummies();
    this.beginBuyPhase(99999, 'ПОЛИГОН');   // never times out
    this.enterGame();
    this.updateRangePanel();
    UI.toast('Полигон: всё бесплатно · ' + (IS_TOUCH ? 'кнопка МАГАЗИН' : 'B — магазин'), '#ff9d21');
  },

  /* ============================================================
     РЕДАКТОР КАРТ: свободная площадка, игрок ходит от первого лица и
     расставляет блоки. Сохранённые карты доступны в оффлайне и онлайне.
     ============================================================ */
  startEditor(mapId) {
    this.stopToMenu(true);
    this.mode = CS.MODE.EDITOR;
    this.freePlay = true;
    this.offline = null;
    this.online = null;
    this.remotePlayers = []; this.remote = null;

    this.player = new Player({ id: 'p1', name: 'Вы', isLocal: true, team: 'ct' });
    this.player.money = 999999;
    this.player.give('knife');
    this.player.slot = 3;
    this.player.maxHealth = 100000;
    this.player.health = 100000;
    this.attachViewModel();

    this.horde = new Horde(this.scene, this.world, this);
    this.dummies = []; this.targets = [];
    this.effects = new Effects(this.scene, Store.data.quality);
    this.effects.clear();

    MapEditor.start(mapId);
    /* стартовая позиция — в центре площадки */
    this.player.resetSpawn(0, (this.world.groundAt(0, 0, 4) || 0) + .05, 0, 0);
    this.camera.position.set(0, (this.world.groundAt(0, 0, 4) || 0) + CFG.eyeHeight, 0);
    this.roundState = 'live';
    this.buyTimer = 0; this.roundT = 0;
    this.enterGame();
    this.editorUI(true);
  },

  editorUI(on) {
    const e = UI.el;
    if (e.edPanel) e.edPanel.classList.toggle('hidden', !on);
    if (on) MapEditor.updatePanel();
  },

  spawnDummies() {
    // placed in a fan in front of the player's spawn so they are immediately
    // visible when the range loads
    const s = MAP.playerSpawns[0] || { x: 0, z: 42 };
    const face = Math.atan2(-(0 - s.x), -(0 - s.z));   // toward the arena centre
    const fx = -Math.sin(face), fz = -Math.cos(face);  // forward
    const rx = Math.cos(face), rz = -Math.sin(face);   // right
    const spots = [[0, 12], [-6, 17], [6, 17], [-12, 23], [12, 23]];   // [side, forward]
    for (const o of spots) {
      const side = o[0], fwd = o[1];
      const x = s.x + fx * fwd + rx * side;
      const z = s.z + fz * fwd + rz * side;
      const y = this.world.groundAt(x, z, 6);
      const d = new Dummy(x, z, y === null ? 0 : y);
      d.yaw = face + Math.PI;             // face the player
      this.scene.add(d.group);
      this.dummies.push(d);
      this.horde.list.push(d);            // so every existing raycast finds them
    }
    // the shooting dummy: straight ahead and a little further back, so its
    // rounds come down the middle of the arena. It stays dormant (and safe to
    // shoot at) until the player turns it on from the range panel.
    this.shooterDummy = null;
    const sx = s.x + fx * 16, sz = s.z + fz * 16;
    const sy = this.world.groundAt(sx, sz, 6);
    const sd = new ShooterDummy(sx, sz, sy === null ? 0 : sy);
    sd.yaw = face + Math.PI;
    this.scene.add(sd.group);
    this.dummies.push(sd);
    this.horde.list.push(sd);
    this.shooterDummy = sd;
  },

  /* Range panel: switch the shooting dummy on/off and pick its weapon. */
  toggleShooterDummy() {
    const d = this.shooterDummy;
    if (!d || this.mode !== CS.MODE.RANGE) return;
    d.active = !d.active;
    d.fireCd = 1.4;                       // short grace period after switching on
    UI.toast(d.active ? 'Манекен-стрелок ВКЛ' : 'Манекен-стрелок ВЫКЛ', d.active ? '#57d16a' : '#e33a2e');
    if (d.active) Audio3D_SFX.pickup(); else Audio3D_SFX.deny();
    this.updateRangePanel();
  },

  cycleShooterWeapon(step) {
    const d = this.shooterDummy;
    if (!d || this.mode !== CS.MODE.RANGE) return;
    const ids = shooterWeaponIds();
    if (!ids.length) return;
    let i = ids.indexOf(d.weaponId);
    i = (i + step + ids.length) % ids.length;
    d.setWeapon(ids[i]);
    const def = WEAPONS[d.weaponId];
    UI.toast('Манекен: ' + (def ? def.name : d.weaponId), '#4aa3ff');
    this.updateRangePanel();
  },

  /* Weapon picker for the shooting dummy. It is a full screen with its own
     free mouse cursor: on PC the pointer is locked during play, so a plain
     drop-down could never be clicked. Opening it releases the lock exactly the
     way the shop does. */
  toggleShooterPick(on) {
    if (on && this.mode !== CS.MODE.RANGE) return;
    if (on) {
      this.shooterPickOpen = true;
      this.renderShooterPick();
      UI.show('sdScreen');
      if (!IS_TOUCH) Input.releaseLock();
      const s = document.getElementById('sdSearch');
      if (s) s.value = '';
    } else {
      this.shooterPickOpen = false;
      UI.show('hud');
      if (!IS_TOUCH && this.running) Input.requestLock();
    }
    if (IS_TOUCH) TouchUI.update();
  },

  renderShooterPick() {
    const grid = document.getElementById('sdGrid');
    if (!grid) return;
    const d = this.shooterDummy;
    const q = (document.getElementById('sdSearch') ? document.getElementById('sdSearch').value : '').trim().toLowerCase();
    const catName = { pistol: 'ПИСТОЛЕТ', smg: 'ПП', shotgun: 'ДРОБОВИК', rifle: 'ВИНТОВКА', sniper: 'СНАЙПЕРКА',
      lmg: 'ПУЛЕМЁТ', heavy: 'ТЯЖЁЛОЕ', banana: 'БАНАН', melee: 'БЛИЖНИЙ БОЙ' };
    grid.innerHTML = '';
    let shown = 0;
    for (const id of shooterWeaponIds()) {
      const w = WEAPONS[id];
      if (q && w.name.toLowerCase().indexOf(q) < 0) continue;
      shown++;
      const card = document.createElement('div');
      card.className = 'sdcard' + (d && d.weaponId === id ? ' on' : '');
      const mag = w.mag === Infinity ? '∞' : w.mag;
      const kind = w.projectile ? 'СНАРЯД' : (w.shield ? 'ЩИТ' : (w.slot === 3 ? 'НОЖ' : 'ПУЛИ'));
      card.innerHTML =
        '<div class="wn">' + U.esc(w.name) + '</div>' +
        '<div class="wc">' + (catName[w.cat] || w.cat) + '</div>' +
        '<div class="wst"><span>УРОН <i>' + w.dmg + '</i></span>' +
        '<span>ТЕМП <i>' + w.rpm + '</i></span>' +
        '<span>МАГ <i>' + mag + '</i></span>' +
        '<span><i>' + kind + '</i></span></div>' +
        (d && d.weaponId === id ? '<div class="picked">ВЫБРАНО</div>' : '');
      card.addEventListener('click', () => {
        const sd = this.shooterDummy;
        if (!sd) return;
        sd.setWeapon(id);
        Audio3D_SFX.uiClick();
        UI.toast('Манекен: ' + w.name, '#4aa3ff');
        this.renderShooterPick();
        this.updateRangePanel();
      });
      grid.appendChild(card);
    }
    if (!shown) grid.innerHTML = '<div class="sdcard cant">Ничего не найдено</div>';
    const t2 = UI.el && UI.el.sdToggle2;
    if (t2) {
      const on = !!(d && d.active);
      t2.textContent = on ? 'ВЫКЛЮЧИТЬ БОЙ' : 'ВКЛЮЧИТЬ БОЙ';
    }
  },

  closeShooterPick() {
    if (this.shooterPickOpen) this.toggleShooterPick(false);
  },

  /* ============================================================
     RANGE ENEMY SPAWNER
     Lets the player drop ANY zombie (including every boss) into the range to
     fight it in a controlled space. Spawned enemies behave normally, so their
     ranged attacks, flight and boss abilities all work here too.
     ============================================================ */
  allEnemyIds() {
    const ids = [];
    for (const id in ZOMBIES) ids.push(id);
    // normal enemies first, then the mini-boss, then the bosses (weak → strong)
    const rank = id => (ZOMBIES[id].boss ? 2 : ZOMBIES[id].miniBoss ? 1 : 0);
    ids.sort((a, b) => rank(a) - rank(b) || ZOMBIES[a].hp - ZOMBIES[b].hp);
    return ids;
  },

  toggleEnemySpawn(on) {
    if (on && this.mode !== CS.MODE.RANGE) return;
    if (on) {
      this.enemySpawnOpen = true;
      this.renderEnemySpawn();
      UI.show('esScreen');
      if (!IS_TOUCH) Input.releaseLock();
      const s = document.getElementById('esSearch');
      if (s) s.value = '';
    } else {
      this.enemySpawnOpen = false;
      UI.show('hud');
      if (!IS_TOUCH && this.running) Input.requestLock();
    }
    if (IS_TOUCH) TouchUI.update();
  },

  closeEnemySpawn() { if (this.enemySpawnOpen) this.toggleEnemySpawn(false); },

  renderEnemySpawn() {
    const grid = document.getElementById('esGrid');
    if (!grid) return;
    const q = (document.getElementById('esSearch') ? document.getElementById('esSearch').value : '').trim().toLowerCase();
    const el = document.getElementById('esCount');
    if (el) el.textContent = String(this._spawnHpMul || 1);
    grid.innerHTML = '';
    let shown = 0;
    for (const id of this.allEnemyIds()) {
      const d = ZOMBIES[id];
      if (q && d.name.toLowerCase().indexOf(q) < 0) continue;
      shown++;
      const rank = d.final ? 'ФИНАЛЬНЫЙ' : d.boss ? 'БОСС' : d.miniBoss ? 'МИНИ-БОСС' : '';
      const card = document.createElement('div');
      card.className = 'ecard' + (d.boss ? ' boss' : d.miniBoss ? ' mini' : '');
      card.innerHTML =
        '<div class="wn">' + U.esc(d.name) + '</div>' +
        '<div class="wc">' + (rank ? rank : 'ВРАГ') + (d.shoot ? ' · СТРЕЛЯЕТ' : '') + (d.flying ? ' · ЛЕТАЕТ' : '') + '</div>' +
        '<div class="wst"><span>HP <i>' + d.hp + '</i></span>' +
        '<span>УРОН <i>' + d.dmg + '</i></span>' +
        '<span>СКОР <i>' + d.speed + '</i></span></div>' +
        (rank ? '<div class="tag">' + rank + '</div>' : '');
      card.addEventListener('click', () => {
        Audio3D_SFX.uiClick();
        this.spawnRangeEnemy(id);
      });
      grid.appendChild(card);
    }
    if (!shown) grid.innerHTML = '<div class="ecard cant">Ничего не найдено</div>';
    const num = document.getElementById('esCountNum');
    if (num) num.value = String(this._spawnCount || 1);
    const chips = document.getElementById('esCountChips');
    if (chips) Array.from(chips.children).forEach(b => b.classList.toggle('on', +b.dataset.n === (this._spawnCount || 1)));
  },

  /* Drop enemies where the crosshair points. A ray from the eye finds the first
     wall/floor/cover; the enemy appears right there (or a bit along the ray if
     we hit the sky). Bosses drop a little further out so they are not in your
     face. `id` may be one type or, from the picker, spawns `count` of them. */
  spawnRangeEnemy(id, count) {
    if (this.mode !== CS.MODE.RANGE || !this.horde) return;
    const p = this.player;
    const d = ZOMBIES[id];
    if (!d) return;
    const n = Math.max(1, Math.min(1000, count || this._spawnCount || 1));
    /* точка прицела: луч из глаз по направлению взгляда */
    const eye = this.eyePos();
    const dir = this.cameraDir();
    let px, py, pz, ground;
    const hits = this.world.raycastAll(eye, dir, 300);
    if (hits && hits.length) {
      const h = hits[0];
      // чуть перед точкой попадания, чтобы враг не утонул в стене
      px = h.point.x - dir.x * 0.8; pz = h.point.z - dir.z * 0.8;
      ground = this.world.groundAt(px, pz, h.point.y + 4);
      py = ground === null ? h.point.y : ground;
    } else {
      // луч ушёл в небо: ставим далеко впереди, на земле
      px = p.pos.x + dir.x * 26; pz = p.pos.z + dir.z * 26;
      ground = this.world.groundAt(px, pz, 12); py = ground === null ? 0 : ground;
    }
    const mul = this._spawnHpMul || 1;
    let last = null;
    for (let i = 0; i < n; i++) {
      const ox = i === 0 ? 0 : U.rand(-3.2, 3.2);
      const oz = i === 0 ? 0 : U.rand(-3.2, 3.2);
      const x = U.clamp(px + ox, -MAP.size / 2 + 2, MAP.size / 2 - 2);
      const z = U.clamp(pz + oz, -MAP.size / 2 + 2, MAP.size / 2 - 2);
      const g = this.world.groundAt(x, z, 8);
      const zz = this.horde.spawn(id, x, z, g === null ? py : g);
      zz.maxHealth *= mul; zz.health = zz.maxHealth;
      if (d.boss) zz.isBoss = true;
      else if (d.miniBoss) zz.isMiniBoss = true;
      if (d.brain && typeof BrainBoss !== 'undefined') { try { BrainBoss.begin(zz); } catch (e) { } }
      last = zz;
    }
    UI.toast('Полигон: ' + d.name + (n > 1 ? ' ×' + n : '') + (mul !== 1 ? ' · ×' + mul + ' HP' : ''),
      d.boss ? '#c24bff' : d.miniBoss ? '#4ad6ff' : '#e33a2e');
    Audio3D_SFX.growl(px, py + 1.2, pz, d.boss ? 'brute' : id);
    /* САУНДТРЕК БОССА: на полигоне тоже включаем боссовую тему */
    if (d.boss || d.miniBoss) this.refreshMusic();
    // do not let a stray hit on the horde count as a wave clear
    if (this._panelT <= 0) this.updateRangePanel();
  },

  /* выбрать количество врагов для спавна (1..1000) */
  setSpawnCount(v) {
    this._spawnCount = Math.max(1, Math.min(1000, Math.round(v || 1)));
    const el = document.getElementById('esCountNum');
    if (el) el.textContent = String(this._spawnCount);
    UI.toast('Количество спавна: ' + this._spawnCount, '#ff9d21');
  },

  /* cycle the spawn HP multiplier (1× → 2× → 5× → 10× → 1×) */
  cycleSpawnHp(step) {
    const opts = [1, 2, 5, 10];
    let i = opts.indexOf(this._spawnHpMul || 1);
    i = (i + (step || 1) + opts.length) % opts.length;
    this._spawnHpMul = opts[i];
    UI.toast('HP врагов на полигоне: ×' + opts[i], '#ff9d21');
    this.renderEnemySpawn();
  },

  /* remove every enemy the spawner added (dummies and the shooting dummy stay) */
  clearRangeEnemies() {
    if (!this.horde) return;
    let n = 0;
    for (let i = this.horde.list.length - 1; i >= 0; i--) {
      const z = this.horde.list[i];
      if (z.isDummy) continue;
      z.dispose(this.scene);
      this.horde.list.splice(i, 1);
      n++;
    }
    this.clearEnemyShots();
    UI.toast(n ? 'Убрано врагов: ' + n : 'Врагов нет', '#57d16a');
    Audio3D_SFX.uiClick();
  },

  /* On the range the player can be killed by the shooting dummy. Without this
     they would be stuck dead, because no round flow runs there to respawn. */
  updateRangeRespawn(dt) {
    const p = this.player;
    if (p.alive) { this._rangeDeadT = 0; return; }
    this._rangeDeadT = (this._rangeDeadT || 0) + dt;
    if (this._rangeDeadT >= 3) {
      this._rangeDeadT = 0;
      p.maxHealth = this.matchHP;
      this.spawnPlayerLocal(0);
      this.player.money = 999999;
      UI.center('ВОЗРОЖДЕНИЕ', 'Манекен-стрелок продолжает огонь', 1.6);
    }
  },

  /* Rounds fired by the shooting dummy (rockets, the guided missile, bananas).
     They fly like the player's projectiles but only ever hurt the player, so
     the dummy's launchers are usable on the range without any networking. */
  updateDummyProjectiles(dt) {
    const list = this.dummyProjectiles;
    if (!list || !list.length) return;
    const world = this.world;
    const p = this.player;
    for (let i = list.length - 1; i >= 0; i--) {
      const pr = list[i];
      pr.life -= dt;
      pr.prev.x = pr.pos.x; pr.prev.y = pr.pos.y; pr.prev.z = pr.pos.z;
      pr.vel.y -= pr.grav * dt;
      const nx = pr.pos.x + pr.vel.x * dt, ny = pr.pos.y + pr.vel.y * dt, nz = pr.pos.z + pr.vel.z * dt;
      const segLen = Math.hypot(nx - pr.pos.x, ny - pr.pos.y, nz - pr.pos.z);
      const dir = segLen > 1e-6
        ? { x: (nx - pr.pos.x) / segLen, y: (ny - pr.pos.y) / segLen, z: (nz - pr.pos.z) / segLen }
        : { x: 0, y: -1, z: 0 };
      // ---- the player ----
      let hitP = false;
      if (p && p.alive) {
        const oc = { x: p.pos.x - pr.pos.x, y: (p.pos.y + 1.0) - pr.pos.y, z: p.pos.z - pr.pos.z };
        const tca = oc.x * dir.x + oc.y * dir.y + oc.z * dir.z;
        if (tca > 0 && tca <= segLen + .5) {
          const perp2 = (oc.x * oc.x + oc.y * oc.y + oc.z * oc.z) - tca * tca;
          if (perp2 < .55 * .55) hitP = true;
        }
      }
      // ---- the world ----
      const wallHits = world.raycastAll(pr.pos, dir, segLen + .1);
      const wall = wallHits.length ? wallHits[0] : null;
      const impact = (hitP && (!wall || segLen <= wall.t))
        ? { x: pr.pos.x + dir.x * segLen, y: pr.pos.y + dir.y * segLen, z: pr.pos.z + dir.z * segLen }
        : (wall ? wall.point : null);
      if (impact) {
        if (pr.splash > 0) this.explodeDummy(impact, pr);
        else {
          this.effects.bananaSplat(impact.x, impact.y, impact.z);
          Audio3D_SFX.bananaSplat(impact.x, impact.y, impact.z);
          if (hitP && p.alive) this.damageFromDummy(pr.dmg * .25, impact, null);
        }
        this.removeDummyProjectile(i);
        continue;
      }
      if (pr.life <= 0 || pr.pos.y < -3) {
        if (pr.splash > 0) this.explodeDummy({ x: pr.pos.x, y: pr.pos.y, z: pr.pos.z }, pr);
        this.removeDummyProjectile(i);
        continue;
      }
      pr.pos.x = nx; pr.pos.y = ny; pr.pos.z = nz;
      pr.mesh.position.set(pr.pos.x, pr.pos.y, pr.pos.z);
      const vl = Math.hypot(pr.vel.x, pr.vel.y, pr.vel.z) || 1;
      pr.mesh.lookAt(pr.pos.x + pr.vel.x / vl, pr.pos.y + pr.vel.y / vl, pr.pos.z + pr.vel.z / vl);
      if (pr.kind !== 'rocket' && pr.kind !== 'guided') pr.mesh.rotateZ(Math.PI / 2);
    }
  },

  /* Blast from a dummy round: the visual/FX, plus reduced damage to the player
     (never to the dummy itself). */
  explodeDummy(center, pr) {
    const R = pr.splash, dmg = (pr.splashDmg || pr.dmg) * .22;
    this.effects.explosion(center.x, center.y, center.z, R, pr.explosionColor, pr.nuke);
    Audio3D_SFX.explosionAt(center.x, center.y, center.z);
    UI.hitmark(false);
    const p = this.player;
    if (!p || !p.alive) return;
    const ds = Math.hypot(p.pos.x - center.x, (p.pos.y + 1) - center.y, p.pos.z - center.z);
    if (ds > R) return;
    // a blast that would hurt us is thrown back while the field is up
    if (this.playerShieldUp()) { this.reflectAtDummy(center, dmg, false); return; }
    this.applyDamageToSelf(Math.max(4, dmg * (1 - ds / R)), center);
  },

  removeDummyProjectile(i) {
    const pr = this.dummyProjectiles[i];
    if (pr && pr.mesh.parent) pr.mesh.parent.remove(pr.mesh);
    this.dummyProjectiles.splice(i, 1);
  },

  clearDummyProjectiles() {
    if (!this.dummyProjectiles) return;
    for (const pr of this.dummyProjectiles) { if (pr.mesh.parent) pr.mesh.parent.remove(pr.mesh); }
    this.dummyProjectiles.length = 0;
  },

  /* ============================================================
     RANGED ENEMIES: acid spit / plasma bolts
     A small pool of flying orbs fired by spitters, the robot zombie and some
     boss abilities. They are purely offensive: they only ever hurt the local
     player (offline), and are cleared whenever the world is torn down.
     ============================================================ */
  onZombieShoot(z, from) {
    const def = z && z.def;
    if (!def || !def.shoot || !from) return;
    const p = this.player;
    if (!p || !p.alive) return;
    // aim at the player's chest with a little lead so strafing is not a free win
    const tx = p.pos.x + (p.vel ? p.vel.x * .18 : 0);
    const tz = p.pos.z + (p.vel ? p.vel.z * .18 : 0);
    const aim = { x: tx, y: p.pos.y + 1.1, z: tz };
    const d = dirTo(from, aim);
    const speed = def.shootSpeed || 24;
    const plasma = def.shoot === 'plasma';
    const isFrost = def.shoot === 'frost';
    const mesh = plasma ? buildPlasmaBolt() : isFrost ? buildFrostBolt() : buildAcidBlob();
    mesh.position.set(from.x, from.y, from.z);
    this.scene.add(mesh);
    this.enemyShots.push({
      mesh, kind: def.shoot, life: 6,
      pos: { x: from.x, y: from.y, z: from.z },
      vel: { x: d.dir.x * speed, y: d.dir.y * speed, z: d.dir.z * speed },
      grav: def.shootGrav || 0,
      dmg: def.shootDmg || 12,
      headMul: def.headMul || 1.6
    });
    if (plasma) Audio3D_SFX.shot('laser', from.x, from.y, from.z);
    else if (isFrost) Audio3D_SFX.shot('smg', from.x, from.y, from.z);
    else Audio3D_SFX.shot('banana', from.x, from.y, from.z);
    this.effects.muzzleSmoke(from.x, from.y, from.z, d.dir);
    if (this.enemyShots.length > 40) {
      const old = this.enemyShots.shift();
      if (old.mesh.parent) old.mesh.parent.remove(old.mesh);
    }
  },

  updateEnemyShots(dt) {
    const list = this.enemyShots;
    if (!list || !list.length) return;
    const world = this.world;
    const p = this.player;
    for (let i = list.length - 1; i >= 0; i--) {
      const pr = list[i];
      pr.life -= dt;
      pr.vel.y -= pr.grav * dt;
      const nx = pr.pos.x + pr.vel.x * dt, ny = pr.pos.y + pr.vel.y * dt, nz = pr.pos.z + pr.vel.z * dt;
      const segLen = Math.hypot(nx - pr.pos.x, ny - pr.pos.y, nz - pr.pos.z);
      const dir = segLen > 1e-6
        ? { x: (nx - pr.pos.x) / segLen, y: (ny - pr.pos.y) / segLen, z: (nz - pr.pos.z) / segLen }
        : { x: 0, y: -1, z: 0 };
      // ---- the player ----
      let hitP = false;
      if (p && p.alive) {
        const oc = { x: p.pos.x - pr.pos.x, y: (p.pos.y + 1.0) - pr.pos.y, z: p.pos.z - pr.pos.z };
        const d2 = oc.x * oc.x + oc.y * oc.y + oc.z * oc.z;
        if (d2 < 1.0) hitP = true;               // already overlapping the body
        else {
          const tca = oc.x * dir.x + oc.y * dir.y + oc.z * dir.z;
          if (tca > 0 && tca <= segLen + .45) {
            const perp2 = d2 - tca * tca;
            if (perp2 < .52 * .52) hitP = true;
          }
        }
      }
      const wallHits = world.raycastAll(pr.pos, dir, segLen + .1);
      const wall = wallHits.length ? wallHits[0] : null;
      const impact = (hitP && (!wall || segLen <= wall.t))
        ? { x: pr.pos.x + dir.x * segLen, y: pr.pos.y + dir.y * segLen, z: pr.pos.z + dir.z * segLen }
        : (wall ? wall.point : null);
      if (impact) {
        if (pr.kind === 'plasma') this.effects.laser(pr.pos, impact);
        else if (pr.kind === 'frost') { this.effects.frostBurst(impact.x, impact.y, impact.z, 1.6); }
        else { this.effects.bananaSplat(impact.x, impact.y, impact.z); }
        if (hitP && p.alive) this.damageFromDummy(pr.dmg, impact, null);
        this.removeEnemyShot(i);
        continue;
      }
      if (pr.life <= 0 || pr.pos.y < -3) { this.removeEnemyShot(i); continue; }
      pr.pos.x = nx; pr.pos.y = ny; pr.pos.z = nz;
      pr.mesh.position.set(pr.pos.x, pr.pos.y, pr.pos.z);
      const vl = Math.hypot(pr.vel.x, pr.vel.y, pr.vel.z) || 1;
      pr.mesh.lookAt(pr.pos.x + pr.vel.x / vl, pr.pos.y + pr.vel.y / vl, pr.pos.z + pr.vel.z / vl);
    }
  },

  removeEnemyShot(i) {
    const pr = this.enemyShots[i];
    if (pr && pr.mesh.parent) pr.mesh.parent.remove(pr.mesh);
    this.enemyShots.splice(i, 1);
  },

  clearEnemyShots() {
    if (!this.enemyShots) return;
    for (const pr of this.enemyShots) { if (pr.mesh.parent) pr.mesh.parent.remove(pr.mesh); }
    this.enemyShots.length = 0;
  },

  /* ============================================================
     BOSS ABILITIES
     Each boss rolls one of its `abilities` on a timer:
       summon        — calls a handful of fresh zombies around itself
       summonMinions — the final boss calls armoured mini-bosses (robot zombies)
       shockwave     — a telegraphed ground slam that knocks the player back
       charge        — a fast rush that deals heavy contact damage
       barrage       — a fan of plasma bolts
     ============================================================ */
  updateBosses(dt) {
    if (!this.horde) return;
    const p = this.player;
    if (!p || !p.alive) return;
    for (const z of this.horde.list) {
      if ((!z.isBoss && !z.isMiniBoss) || !z.alive || z.dying) continue;
      const def = z.def;
      if (!def.abilities || !def.abilities.length) continue;
      z.abilityCd = (z.abilityCd || 0) - dt;
      if (z.abilityCd > 0) continue;
      // a short global pause so several bosses never detonate at once
      if (this._bossAbilityLock > 0) continue;
      z.abilityCd = (def.abilityCd || 8) * U.rand(.8, 1.25);
      this._bossAbilityLock = 1.6;
      this.doBossAbility(z, U.pick(def.abilities));
    }
    if (this._bossAbilityLock > 0) this._bossAbilityLock -= dt;
  },

  doBossAbility(z, kind) {
    const p = this.player;
    if (kind === 'summon') {
      const n = Math.min(6, 3 + Math.floor((z.scale - 2) * 2));
      const pool = ['walker', 'runner', 'crawler'];
      if (z.scale > 2.5) pool.push('tank', 'spitter');
      for (let i = 0; i < n; i++) {
        const a = U.rand(0, Math.PI * 2), r = U.rand(3, 6);
        const x = z.pos.x + Math.cos(a) * r, y = z.pos.z + Math.sin(a) * r;
        const s = this.horde.spawn(U.pick(pool), x, y);
        if (this.offHpMul != null) s.maxHealth *= this.offHpMul;
        else if (this.hordeMode && !this.freePlay) s.maxHealth *= CFG.hordeHpMul;
        s.health = s.maxHealth;
      }
      this.bossTell(z, 'ПРИЗЫВ ПОДМОГИ', '#c24bff');
      Audio3D_SFX.growl(z.pos.x, z.pos.y, z.pos.z, 'brute');
      return;
    }
    if (kind === 'summonMinions') {
      // the final boss tears open portals and calls armoured mini-bosses
      const n = 2;
      for (let i = 0; i < n; i++) {
        const a = U.rand(0, Math.PI * 2), r = U.rand(4, 7);
        const x = z.pos.x + Math.cos(a) * r, yy = z.pos.z + Math.sin(a) * r;
        const s = this.horde.spawn('robot', x, yy);
        if (this.offHpMul != null) s.maxHealth *= this.offHpMul;
        else if (this.hordeMode && !this.freePlay) s.maxHealth *= CFG.hordeHpMul;
        s.health = s.maxHealth; s.isMiniBoss = true;
        // a dramatic portal flash where it appears
        this.effects.explosion(x, (this.world.groundAt(x, yy, 6) || 0) + 1.0, yy, 3.4, [0x9a3aff, 0x1a0a30]);
      }
      this.bossTell(z, 'ПРИЗЫВ МИНИ-БОССОВ', '#9a3aff');
      Audio3D_SFX.explosionAt(z.pos.x, z.pos.y, z.pos.z);
      Audio3D_SFX.growl(z.pos.x, z.pos.y, z.pos.z, 'robot');
      return;
    }
    if (kind === 'shockwave') {
      this.effects.explosion(z.pos.x, z.pos.y + .4, z.pos.z, 8.0, [z.def.aura || 0xffb347, 0x2a1a0a]);
      Audio3D_SFX.explosionAt(z.pos.x, z.pos.y, z.pos.z);
      this.breakMapAt(z.pos.x, z.pos.y + .4, z.pos.z, 8.0, 260);
      const R = 10;
      const ds = Math.hypot(p.pos.x - z.pos.x, p.pos.z - z.pos.z);
      if (ds <= R) {
        const k = 1 - ds / R;
        if (!this.playerShieldUp()) {
          this.applyDamageToSelf(Math.max(6, (z.dmg || 40) * .7 * k), { x: z.pos.x, y: z.pos.y, z: z.pos.z });
          // knock the player back
          const ax = p.pos.x - z.pos.x, az = p.pos.z - z.pos.z;
          const l = Math.max(.001, Math.hypot(ax, az));
          p.vel.x += (ax / l) * 15 * k; p.vel.z += (az / l) * 15 * k;
          if (p.onGround) p.vel.y = Math.max(p.vel.y, 4.5 * k);
        } else this.reflectAtDummy({ x: z.pos.x, y: z.pos.y, z: z.pos.z }, z.dmg || 40, false);
      }
      this.bossTell(z, 'УДАРНАЯ ВОЛНА', '#ff9d21');
      return;
    }
    if (kind === 'charge') {
      z.abilityTimer = 2.2;                          // drives the rush in updateBossCharge
      z.chargeDir = { x: p.pos.x - z.pos.x, z: p.pos.z - z.pos.z };
      const l = Math.hypot(z.chargeDir.x, z.chargeDir.z) || 1;
      z.chargeDir.x /= l; z.chargeDir.z /= l;
      this.bossTell(z, 'РЫВОК', '#e33a2e');
      Audio3D_SFX.growl(z.pos.x, z.pos.y, z.pos.z, 'runner');
      return;
    }
    if (kind === 'barrage') {
      const n = 7;
      const baseYaw = Math.atan2(p.pos.x - z.pos.x, p.pos.z - z.pos.z);
      for (let i = 0; i < n; i++) {
        const spread = (i - (n - 1) / 2) * .13;
        const from = { x: z.pos.x, y: z.pos.y + 1.6 * z.scale, z: z.pos.z };
        const dir = { x: Math.sin(baseYaw + spread), y: .06, z: Math.cos(baseYaw + spread) };
        const mesh = buildPlasmaBolt();
        mesh.position.set(from.x, from.y, from.z);
        this.scene.add(mesh);
        this.enemyShots.push({
          mesh, kind: 'plasma', life: 6,
          pos: { x: from.x, y: from.y, z: from.z },
          vel: { x: dir.x * 30, y: dir.y * 30, z: dir.z * 30 },
          grav: 0, dmg: Math.round((z.dmg || 50) * .45), headMul: 1.4
        });
      }
      Audio3D_SFX.shot('laser', z.pos.x, z.pos.y + 2, z.pos.z);
      this.bossTell(z, 'ЗАЛП', '#4ad6ff');
      return;
    }
    if (kind === 'frost') {
      // КРИОМАНТ: конус холода — замедляет игрока и замораживает землю
      const R = 9;
      const ds = Math.hypot(p.pos.x - z.pos.x, p.pos.z - z.pos.z);
      this.effects.frostBurst(z.pos.x, z.pos.y + 1, z.pos.z, R);
      this.effects.decal(z.pos.x, .02, z.pos.z, 0, 1, 0, R * .8, 'frost');
      if (ds <= R) {
        const k = 1 - ds / R;
        if (!this.playerShieldUp()) {
          this.applyDamageToSelf(Math.max(4, (z.dmg || 40) * .35 * k), { x: z.pos.x, y: z.pos.y, z: z.pos.z });
          p.freezeT = Math.max(p.freezeT || 0, 1.6 * k);
          UI.toast('ЗАМОРОЖЕН', '#7fd8ff');
        } else this.reflectAtDummy({ x: z.pos.x, y: z.pos.y, z: z.pos.z }, (z.dmg || 40) * .5, false);
      }
      Audio3D_SFX.shot('laser', z.pos.x, z.pos.y + 1.5, z.pos.z);
      this.bossTell(z, 'ЛЕДЯНОЙ КОНУС', '#7fd8ff');
      return;
    }
    if (kind === 'devour') {
      /* ПОЖИРАТЕЛЬ ПЛОТИ: высасывает жизнь из ВСЕГО рядом — и зомби, и игрока —
         и лечится. Раньше работало только при куче зомби вокруг, поэтому в бою
         1-на-1 «ничего не делало». Теперь всегда даёт эффект: тянет игрока к
         себе, наносит урон и лечится, даже если рядом никого нет. */
      const R = 9;
      let drained = 0;
      // вытягиваем жизнь из соседних зомби
      for (const o of this.horde.list) {
        if (o === z || o.dying || !o.alive || o.isBoss || o.isMiniBoss) continue;
        const d = Math.hypot(o.pos.x - z.pos.x, o.pos.z - z.pos.z);
        if (d > R) continue;
        const bite = Math.min(o.health, o.maxHealth * .5);
        o.takeDamage(bite, 'body', { x: 0, y: 0, z: 0 });
        drained += bite;
        this.effects.particle(o.pos.x, o.pos.y + 1.2 * o.scale, o.pos.z, 0, 1.4, 0, .5, 'spark', .4);
      }
      // высасываем жизнь из ИГРОКА, если он в радиусе
      if (p && p.alive) {
        const dp = Math.hypot(p.pos.x - z.pos.x, p.pos.z - z.pos.z);
        if (dp <= R) {
          const k = 1 - dp / R;
          if (!this.playerShieldUp()) {
            const bite = Math.max(10, (z.dmg || 50) * .85 * k);
            this.applyDamageToSelf(bite, { x: z.pos.x, y: z.pos.y, z: z.pos.z });
            drained += bite;
            // подтягиваем игрока к пожирателю
            const ax = z.pos.x - p.pos.x, az = z.pos.z - p.pos.z;
            const l = Math.max(.001, Math.hypot(ax, az));
            p.vel.x += (ax / l) * 13 * k; p.vel.z += (az / l) * 13 * k;
          } else this.reflectAtDummy({ x: z.pos.x, y: z.pos.y, z: z.pos.z }, (z.dmg || 50), false);
        }
      }
      // всегда лечится от пожирания (даже без добычи)
      z.health = Math.min(z.maxHealth, z.health + Math.max(drained * .35, z.maxHealth * .04));
      // видимый эффект: кровавый вихрь у пожирателя + тёмный след на земле
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        this.effects.particle(z.pos.x, z.pos.y + 1.2, z.pos.z,
          Math.cos(a) * 3.2, U.rand(1, 3.4), Math.sin(a) * 3.2, U.rand(.16, .30), 'blood', U.rand(.4, .8));
      }
      this.effects.decal(z.pos.x, .02, z.pos.z, 0, 1, 0, R * .7, 'blood');
      UI.toast('ПОЖИРАТЕЛЬ насытился', '#ff2a3a');
      Audio3D_SFX.growl(z.pos.x, z.pos.y, z.pos.z, 'brute');
      this.bossTell(z, 'ПОЖИРАНИЕ', '#ff2a3a');
      return;
    }
  },

  /* keep executing an active charge rush */
  updateBossCharges(dt) {
    if (!this.horde) return;
    const p = this.player;
    for (const z of this.horde.list) {
      if (!z || !z.alive || z.dying || !z.chargeDir) continue;
      z.abilityTimer -= dt;
      if (z.abilityTimer <= 0) { z.chargeDir = null; continue; }
      const spd = (z.speed || 2) * 3.4;
      z.pos.x = U.clamp(z.pos.x + z.chargeDir.x * spd * dt, -MAP.size / 2 + 2, MAP.size / 2 - 2);
      z.pos.z = U.clamp(z.pos.z + z.chargeDir.z * spd * dt, -MAP.size / 2 + 2, MAP.size / 2 - 2);
      z.group.position.set(z.pos.x, z.pos.y, z.pos.z);
      if (p && p.alive) {
        const ds = Math.hypot(p.pos.x - z.pos.x, p.pos.z - z.pos.z);
        if (ds < 1.6 + z.radius) {
          z.chargeDir = null;
          if (!this.playerShieldUp()) this.applyDamageToSelf((z.dmg || 50) * .9, { x: z.pos.x, y: z.pos.y, z: z.pos.z });
          else this.reflectAtDummy({ x: z.pos.x, y: z.pos.y, z: z.pos.z }, z.dmg || 50, true);
        }
      }
    }
  },

  bossTell(z, text, color) {
    UI.toast('БОСС: ' + text, color || '#c24bff');
    this.effects.laser({ x: z.pos.x, y: z.pos.y + z.height + .4, z: z.pos.z },
      { x: z.pos.x, y: z.pos.y + z.height + 4, z: z.pos.z });
  },

  clearDummies() {
    if (!this.dummies) return;
    for (const d of this.dummies) d.dispose(this.scene);
    this.dummies = [];
    this.shooterDummy = null;
    this._rangeDeadT = 0;
  },

  clearTargets() {
    if (this.targets) for (const t of this.targets) t.dispose(this.scene);
    this.targets = [];
    this.aim = null;
  },

  /* dummies report their own DPS; the range HUD shows the total */
  updateRange(dt) {
    let totalDps = 0;
    for (const d of this.dummies) {
      if (!d) continue;
      totalDps += d.dps || 0;
      const dist = Math.hypot(d.pos.x - this.player.pos.x, d.pos.z - this.player.pos.z);
      d.label.visible = dist < 60;
    }
    this._rangeDps = totalDps;
    if (this.targets && this.aim) this.updateTargets(dt);
    this.updateRangeRespawn(dt);
    // the range never ends: keep it out of the round-flow timers
    this.roundState = 'live';
    this.roundT = 0;
  },

  /* ---------------- aim training ----------------
     Runs inside its own sealed room (MAP.aimRoom) so the targets never
     interfere with the dummies in the arena. Entering teleports the player in;
     leaving teleports them back to the range.
     Not available on phones: the drill needs quick, precise aiming that a touch
     screen makes frustrating, so the button is hidden there and this is a no-op. */
  toggleAimTrain(on) {
    if (typeof IS_TOUCH !== 'undefined' && IS_TOUCH) return;
    if (on && this.mode !== CS.MODE.RANGE) return;
    if (!on && this.aim) {
      // remember the best score across sessions
      if (this.aim.score > (Store.data.aimBest || 0)) {
        Store.data.aimBest = this.aim.score;
        Store.save();
        UI.toast('Новый рекорд: ' + this.aim.score + '!', '#f5d33c');
      }
    }
    this.aim = on ? {
      score: 0, hits: 0, shots: 0, streak: 0, bestStreak: 0,
      spawnT: 0, alive: 0
    } : null;
    // clear any leftover targets
    if (this.targets) for (const t of this.targets) t.dispose(this.scene);
    this.targets = [];

    const room = MAP.aimRoom;
    if (on && room) {
      // move into the room and face the targets
      this._rangeReturn = {
        x: this.player.pos.x, y: this.player.pos.y, z: this.player.pos.z, yaw: this.player.yaw
      };
      this.player.resetSpawn(room.entry.x, room.floorY + .05, room.entry.z, room.entry.yaw);
      this.player.pitch = 0;
      this.camera.position.set(room.entry.x, room.floorY + CFG.eyeHeight, room.entry.z);
      // the room's lights are global in three.js, so enable them only inside
      setAimRoomLights(true);
      this.spawnTargetWave(true);
      UI.toast('Аим-тренировка: ВКЛ', '#57d16a');
      UI.center('АИМ-ТРЕНИРОВКА', 'T — выход', 2.0);
    } else if (this._rangeReturn) {
      // back to where we were in the arena
      const r = this._rangeReturn;
      this.player.resetSpawn(r.x, r.y, r.z, r.yaw);
      this.camera.position.set(r.x, r.y + CFG.eyeHeight, r.z);
      this._rangeReturn = null;
      setAimRoomLights(false);
      UI.toast('Аим-тренировка: ВЫКЛ');
      UI.center('ПОЛИГОН', '', 1.4);
    }
    this.updateRangePanel();
  },

  /* targets spawn across the room at a spread of distances */
  spawnTargetWave(initial) {
    if (!this.aim) return;
    const room = MAP.aimRoom;
    if (!room) return;
    const n = initial ? 6 : 1;
    for (let i = 0; i < n; i++) {
      // 9..34 m from the firing line, spread across the room width
      const dist = U.rand(9, 34);
      const x = U.clamp(room.entry.x + U.rand(-12, 12), room.minX + 1.5, room.maxX - 1.5);
      const z = room.entry.z - dist;
      if (z < room.minZ + 1.6) continue;
      const radius = U.clamp(0.62 - dist * 0.010, 0.20, 0.62);
      const y = room.floorY + U.rand(1.15, 2.7);
      const t = new Target(x, y, z, radius);
      this.scene.add(t.group);
      this.targets.push(t);
      this.horde.list.push(t);          // so horde.raycast finds them
    }
    this.aim.alive = this.targets.length;
  },

  updateTargets(dt) {
    const ctx = { player: this.player, world: this.world };
    if (!this.aim) return;
    for (const t of this.targets) t.update(dt, ctx);
    // respawn popped targets after a short delay
    for (let i = this.targets.length - 1; i >= 0; i--) {
      const t = this.targets[i];
      if (t.alive) continue;
      if (t.deadT < 0.45) continue;
      t.dispose(this.scene);
      this.targets.splice(i, 1);
      const idx = this.horde.list.indexOf(t);
      if (idx >= 0) this.horde.list.splice(idx, 1);
    }
    // keep a steady population so the drill never runs dry
    this.aim.spawnT -= dt;
    const want = 6;
    if (this.targets.length < want && this.aim.spawnT <= 0) {
      this.aim.spawnT = 0.35;
      this.spawnTargetWave(false);
    }
    this.aim.alive = this.targets.filter(t => t.alive).length;
  },

  /* called by the shooting code when a target is hit */
  onTargetHit(t, part) {
    if (!this.aim) return;
    t.hitFlash = .14;
    t.pop();
    this.aim.hits++;
    this.aim.streak++;
    if (this.aim.streak > this.aim.bestStreak) this.aim.bestStreak = this.aim.streak;
    // closer targets are worth less; a smaller board is worth more
    const dist = Math.hypot(t.pos.x - this.player.pos.x, t.pos.z - this.player.pos.z);
    const base = Math.round(120 - dist * 1.6);
    const sizeBonus = Math.round((0.62 - t.radius) * 180);
    const pts = Math.max(20, base + sizeBonus);
    this.aim.score += pts;
    UI.hitmark(true);
    UI.feed('<b>+' + pts + '</b> <span style="color:#8b98a5">' + Math.round(dist) + 'м</span>');
    Audio3D_SFX.kill();
    this.updateRangePanel();
  },
  onTargetMiss() {
    if (!this.aim) return;
    this.aim.streak = 0;
  },

  updateRangePanel() {
    const el = {
      panel: document.getElementById('rangePanel'),
      title: document.getElementById('rpTitle'),
      score: document.getElementById('rpScore'),
      hits: document.getElementById('rpHits'),
      acc: document.getElementById('rpAcc'),
      streak: document.getElementById('rpStreak'),
      best: document.getElementById('rpBest'),
      toggle: document.getElementById('rpToggle'),
      sdToggle: document.getElementById('sdToggle'),
      esConfig: document.getElementById('esConfig')
    };
    if (!el.panel) return;
    // The range panel (damage / hits / accuracy) is a PC-only readout: on a
    // phone it crowded the screen, so it is not shown there at all.
    const inRange = this.mode === CS.MODE.RANGE && this.running;
    el.panel.classList.toggle('hidden', !inRange);
    if (!inRange) return;
    const a = this.aim;
    // the drill is PC-only, so its button is only meaningful there
    if (el.toggle) el.toggle.style.display = IS_TOUCH ? 'none' : '';
    if (a) {
      el.title.textContent = 'АИМ-ТРЕНИРОВКА';
      el.score.textContent = String(a.score);
      const acc = a.shots > 0 ? Math.min(100, Math.round(a.hits / a.shots * 100)) : 0;
      el.hits.textContent = a.hits + ' / ' + a.shots;
      el.acc.textContent = a.shots > 0 ? acc + '%' : '—';
      el.streak.textContent = String(a.streak) + ' (луч. ' + a.bestStreak + ')';
      el.best.textContent = String(Store.data.aimBest || 0);
      el.toggle.textContent = 'ОСТАНОВИТЬ';
      el.toggle.classList.add('on');
    } else {
      el.title.textContent = 'ПОЛИГОН';
      el.score.textContent = String(Math.round(this._rangeDps || 0));
      el.hits.textContent = (this.dummies || []).length + ' шт.';
      el.acc.textContent = '—';
      el.streak.textContent = '—';
      el.best.textContent = String(Store.data.aimBest || 0);
      // On PC the pointer is locked during play, so a DOM button cannot be
      // clicked — advertise the keyboard shortcut on the button itself.
      el.toggle.textContent = 'АИМ-ТРЕНИРОВКА' + (IS_TOUCH ? '' : ' (T)');
      el.toggle.classList.remove('on');
    }
    // shooting-dummy controls
    if (el.sdToggle) {
      const d = this.shooterDummy;
      const on = !!(d && d.active);
      const def = d ? WEAPONS[d.weaponId] : null;
      // on a phone there is no keyboard, so the PC shortcut hints are dropped
      const key = (name) => IS_TOUCH ? '' : ' (' + name + ')';
      el.sdToggle.textContent = (on ? 'ВЫКЛЮЧИТЬ' : 'ВКЛЮЧИТЬ') + key('V') + ' · ' + (def ? def.name : '');
      el.sdToggle.classList.toggle('on', on);
    }
    // range enemy spawner label
    if (el.esConfig) el.esConfig.textContent = 'СПАВН ВРАГА' + (IS_TOUCH ? '' : ' (X)') + ' · ×' + (this._spawnHpMul || 1);
    // weapon picker button (drop the keyboard hint on a phone)
    const sdConf = document.getElementById('sdConfig');
    if (sdConf) sdConf.textContent = 'ОРУЖИЕ' + (IS_TOUCH ? '' : ' (C)');
  },

  startOnlineHost() { this.startOnline(CS.NETROLE.HOST, { pve: Store.data.onlineMode || 'pvp' }); },
  startOnlineClient() { this.startOnline(CS.NETROLE.CLIENT); },

  /* Применить режим комнаты, объявленный хостом. Если он не совпадает с уже
     идущим матчем — мягко перезапускаем онлайн в нужном режиме (в фазе закупки
     это безопасно). Так и хост, и клиент оказываются в кооп-волнах. */
  applyOnlinePve(pve) {
    pve = pve || 'pvp';
    if (this.onlinePvE === pve && this.isCoop === (pve !== 'pvp')) return;
    this.onlinePvE = pve;
    this.isCoop = pve !== 'pvp';
    if (this.mode !== CS.MODE.ONLINE) return;
    if (this.roundState === 'buy' || this.roundState === 'idle') {
      this.startOnline(Net.role, { pve: pve, map: MAP.id, hp: this.matchHP, rounds: this.online ? this.online.rounds : undefined,
        free: this.freePlay, shop: this.shopAllow, shopItems: this.shopItemAllow });
    }
  },

  startOnline(role, opts) {
    opts = opts || {};
    this.stopToMenu(true);
    this.mode = CS.MODE.ONLINE;
    /* режим комнаты: PvP-дуэль или кооп по волнам (обычный / орда / босс-раш).
       Хост выбирает в лобби, клиентам приезжает в settings. */
    this.onlinePvE = opts.pve || (role === CS.NETROLE.HOST ? (Store.data.onlineMode || 'pvp') : (opts.pve || 'pvp'));
    this.isCoop = this.onlinePvE && this.onlinePvE !== 'pvp';
    this.online = {
      role, roundWins: { me: 0, them: 0 }, opponentLeft: false,
      scoreMe: 0, scoreThem: 0, skipVoteMe: 0, votes: {},
      voteNeeded: 2, roster: Net.peers.slice(),
      players: Math.max(2, Net.peerCount ? Net.peerCount() : 2), alive: 1,
      // how many rounds this match lasts and how many have been played
      rounds: MATCH.clampRounds(opts.rounds !== undefined ? opts.rounds : Store.data.rounds),
      played: 0, matchOver: false
    };
    this._matchCounted = false;
    // settings come from the host (or from the local choice when not networked)
    const mapId = opts.map || Store.data.map;
    this.ensureMap(mapId);
    this._matchOverPending = false;
    this.matchHP = opts.hp || (Store.data.maxHP || 100);
    // "ВСЁ БЕСПЛАТНО" online: the host decides, clients are told by the round msg
    this.freePlay = (opts.free !== undefined) ? !!opts.free : (this.online.role === CS.NETROLE.HOST ? Store.data.freeplay === 1 : !!this.freePlay);
    // which categories the shop allows: host's choice, or default (everything)
    this.shopAllow = opts.shop ? Object.assign({}, opts.shop)
      : (this.online.role === CS.NETROLE.HOST ? this.hostShopAllow() : MATCH.defaultShopAllow());
    // per-item allow-list (missing = allowed). Clients wait for the host's list,
    // so they start with everything allowed rather than their own saved bans.
    this.shopItemAllow = opts.shopItems ? Object.assign({}, opts.shopItems)
      : (this.online.role === CS.NETROLE.HOST ? this.hostShopItemsAllow() : {});
    if (this.online.role === CS.NETROLE.HOST) { Store.data.map = mapId; Store.data.maxHP = this.matchHP; Store.save(); }

    this.remotePlayers = []; this.remote = null;
    this.player = new Player({ id: 'p1', name: (Store.data.name || 'Игрок').slice(0, 14), isLocal: true, team: 'ct' });
    this.player.money = 800;
    this.player.give('glock'); this.player.give('knife');
    this.player.slot = 1;
    this.player.maxHealth = this.matchHP;
    this.player.health = this.matchHP;
    this.attachViewModel();

    // build a RemotePlayer for every other member of the roster
    this.syncRemoteRoster();

    if (this.isCoop) {
      /* КООП-волны: в онлайне поднимаем локальную орду на обоих игроков и ведём
         волны; счёт — общий (сумма убийств), это прохождение, а не дуэль. */
      this.horde = new Horde(this.scene, this.world, this);
      this.offline = {
        wave: 0, toSpawn: 0, spawnedThisWave: 0, totalThisWave: 0,
        betweenWaves: false, breakT: 0, alive: 0, kills: 0, startTime: U.now(),
        campaignWon: false, bossPending: 0, bossType: null
      };
      this.specialMode = this.onlinePvE;
      this.isBossRush = this.onlinePvE === 'bossrush';
      this.isHardcore = false; this.isDaily = false; this.isEndless = false;
      this.hordeMode = this.onlinePvE === 'horde';
      this.modState = makeModState();
      this.effects = new Effects(this.scene, Store.data.quality);
      this.effects.clear();
      this.spawnPlayerLocal(this.rosterSpawnIndex());
      console.log('[coop] start', (Net.role === CS.NETROLE.HOST ? 'HOST' : 'CLIENT'), this.onlinePvE);
      this.roundState = 'live';
      this.coopStartWave(1);
      this.enterGame();
      this._peerWarned = false; this._peerLost = false;
      this._silentT = 0; this._lastSeenPacket = 0;
      this._leaving = false;
      Net.startHeartbeat();
      Net.keepalive = () => {
        if (this.mode !== CS.MODE.ONLINE || !Net.connected) return;
        this.broadcastState();
      };
      UI.center('КООП: ' + (this.onlinePvE === 'horde' ? 'ОРДА ×10' : this.onlinePvE === 'bossrush' ? 'БОСС-РАШ' : 'ОБЫЧНЫЙ'), 'Волны для обоих игроков', 2.6);
      UI.toast('Кооп-режим: выживайте вместе', '#57d16a');
      return;
    }

    this.horde = null;
    this.effects = new Effects(this.scene, Store.data.quality);
    this.effects.clear();

    this.spawnPlayerLocal(this.rosterSpawnIndex());
    this.beginBuyPhase(30, 'РАУНД 1');
    this.enterGame();
    this._peerWarned = false; this._peerLost = false;
    this._silentT = 0; this._lastSeenPacket = 0;
    this._leaving = false;
    Net.startHeartbeat();
    // a backgrounded tab stops rAF, so keep broadcasting from the heartbeat too
    Net.keepalive = () => {
      if (this.mode !== CS.MODE.ONLINE || !Net.connected) return;
      this.broadcastState();
    };
    UI.toast('Карта: ' + this.mapName() + ' · HP ' + this.matchHP, '#ff9d21');
  },

  /* ============================================================
     ONLINE ROSTER
     A star network: the host keeps the authoritative roster and relays it.
     Every other player gets a RemotePlayer mesh; the local player's own entry
     in the roster is skipped.
     ============================================================ */
  onRoster(roster) {
    UI.renderPeerList();
    if (this.mode !== CS.MODE.ONLINE || !this.online) return;
    this.online.roster = roster || [];
    this.online.players = Math.max(2, this.online.roster.length || Net.peerCount());
    this.syncRemoteRoster();
    this.refreshSkipUI();
    // The roster can arrive just after the match starts (a client is told its
    // own slot only once the host's list arrives). While we are still shopping,
    // step onto our own spawn so nobody stands inside anyone else.
    if (this.roundState === 'buy' || this.roundState === 'idle') this.placeAtRosterSpawn();
  },

  /* move to our own spawn slot, but only if we are not already standing on it.
     Used after the roster arrives so two players never share a spawn point. */
  placeAtRosterSpawn() {
    const spawns = MAP.playerSpawns || [];
    const idx = this.rosterSpawnIndex();
    const s = spawns[idx];
    if (!s) return;
    if (Math.hypot(this.player.pos.x - s.x, this.player.pos.z - s.z) > 1.0) {
      this.spawnPlayerLocal(idx);
    }
  },

  /* add/remove RemotePlayer objects so the scene matches the roster */
  syncRemoteRoster() {
    if (this.mode !== CS.MODE.ONLINE || !this.online) return;
    const roster = (this.online.roster && this.online.roster.length)
      ? this.online.roster
      : (Net.peers && Net.peers.length ? Net.peers : [{ id: 'them', name: Net.partnerName || 'Соперник', isHost: Net.role === CS.NETROLE.CLIENT }]);

    // never model ourselves
    const myId = Net.selfId();
    const others = roster.filter(p => p.id !== myId && !(Net.role === CS.NETROLE.HOST && p.isHost));
    const seen = {};

    for (const p of others) {
      seen[p.id] = true;
      let rp = this.remotePlayers.find(r => r.peerId === p.id);
      if (!rp) {
        const team = 't';
        rp = new RemotePlayer(p.name, team, p.id);
        rp.maxHealth = this.matchHP;
        this.remotePlayers.push(rp);
        this.scene.add(rp.mesh);
      } else if (rp.name !== p.name) {
        rp.name = p.name;
        rp.plate.material.map.dispose();
        const np = makeNameplate(p.name); rp.plate.material.map = np.material.map;
      }
    }
    // drop remotes that left
    for (let i = this.remotePlayers.length - 1; i >= 0; i--) {
      const rp = this.remotePlayers[i];
      if (!seen[rp.peerId]) {
        this.scene.remove(rp.mesh);
        rp.mesh.traverse(o => { if (o.geometry) o.geometry.dispose(); });
        if (rp.mechMesh) {
          if (rp.mechMesh.parent) rp.mechMesh.parent.remove(rp.mechMesh);
          rp.mechMesh.traverse(o => { if (o.geometry) o.geometry.dispose(); });
          rp.mechMesh = null;
        }
        this.remotePlayers.splice(i, 1);
        if (this.remote === rp) this.remote = null;
      }
    }
    this.remote = this.remotePlayers[0] || null;
  },

  onPeerJoined(p) {
    UI.toast('Подключился: ' + (p.name || 'Игрок'), '#57d16a');
    UI.renderPeerList();
  },

  onPeerLeft(p) {
    UI.toast('Игрок вышел: ' + (p.name || '?'), '#e33a2e');
    UI.renderPeerList();
  },

  enterGame() {
    this.running = true;
    this.paused = false;
    this.buyOpen = false;
    // clear any touch toggles left over from a previous match
    if (typeof TouchUI !== 'undefined') {
      TouchUI.aimPressed = false; TouchUI.autoFire = false; TouchUI._lastTapT = 0;
      const aimBtn = document.getElementById('tAim');
      if (aimBtn) aimBtn.classList.remove('down');
      const autoBtn = document.getElementById('tAuto');
      if (autoBtn) autoBtn.classList.remove('down');
      const tag = document.getElementById('autoFireTag');
      if (tag) tag.classList.add('hidden');
      TouchUI.climbQueued = false;
      if (this.player) this.player.climbQueued = false;
    }
    Input.enabled = true;          // arm keyboard, mouse buttons and wheel
    UI.show('hud');
    if (IS_TOUCH) {
      // touch has no pointer lock; the control overlay carries the input
      UI.el.clickToPlay.classList.add('hidden');
      TouchUI.update();
    } else {
      UI.el.clickToPlay.classList.remove('hidden');
      setTimeout(() => { if (this.running) Input.requestLock(); }, 120);
    }
    UI.el.netInfo.classList.toggle('hidden', this.mode !== CS.MODE.ONLINE);
    Audio3D_SFX.init(); Audio3D_SFX.resume(); Audio3D_SFX.ambientStart();
    this.refreshMusic();
  },

  /* Pick the music that fits the current state: a boss theme while a boss is
     alive, otherwise the battle track in a match, otherwise the menu theme. */
  refreshMusic() {
    if (typeof Audio3D_SFX === 'undefined') return;
    if (Audio3D_SFX.musicOff) { Audio3D_SFX.musicStop(); return; }
    let want = 'menu';
    if (this.running && this.mode !== CS.MODE.MENU) {
      want = 'game';
      if (this.horde) {
        const boss = this.horde.list.find(z => (z.isBoss || z.isMiniBoss) && z.alive && !z.dying);
        if (boss && ZOMBIES[boss.type] && Audio3D_SFX.music[boss.type]) want = boss.type;
        else if (boss && boss.isBoss) want = 'boss';           // у босса без своей темы — общая
        else if (boss && boss.isMiniBoss) want = 'boss';       // мини-босс — боссовая тема
      }
    }
    Audio3D_SFX.musicStart(want);
  },

  stopToMenu(keepRunning) {
    const clearWorld = () => {
      this.clearProjectiles();
      this.clearDummyProjectiles();
      this.clearEnemyShots();
      this.clearDummies();
      this.clearTargets();
      this.clearDrone();
      this.clearCrates();
      this.clearMedboxes();
      if (this.horde) { this.horde.clear(); this.horde = null; }
      for (const rp of this.remotePlayers || []) {
        this.clearRemoteDrone(rp);
        this.scene.remove(rp.mesh);
        rp.mesh.traverse(o => { if (o.geometry) o.geometry.dispose(); });
        if (rp.mechMesh) {
          if (rp.mechMesh.parent) rp.mechMesh.parent.remove(rp.mechMesh);
          rp.mechMesh.traverse(o => { if (o.geometry) o.geometry.dispose(); });
          rp.mechMesh = null;
        }
      }
      this.remotePlayers = []; this.remote = null;
      // a picker left open while the range is torn down must not survive
      this.shooterPickOpen = false;
      this.enemySpawnOpen = false;
      if (this.player && this.player.vmGroup && this.player.vmGroup.parent) this.player.vmGroup.parent.remove(this.player.vmGroup);
      if (this.effects) { this.effects.clear(); }
      if (typeof MapEditor !== 'undefined' && MapEditor.active) MapEditor.stop();
      if (typeof this.editorUI === 'function') this.editorUI(false);
    };
    if (!keepRunning) {
      this.running = false;
      Input.enabled = false;
      Input.releaseLock();
      Audio3D_SFX.ambientStop();
      Audio3D_SFX.cannonBeamStop();
      Audio3D_SFX.bossMusicStop();
      this.mode = CS.MODE.MENU;
      clearWorld();
      this.offline = null; this.online = null;
      this._creditsOpen = false;
      UI.hideOverlays();
      UI.lowHP(false);
      UI.renderMenuStats();
      UI.show('menu');
      Net.close(true);
    } else {
      clearWorld();
    }
    this.buyOpen = false;
    this.shooterPickOpen = false;
    this.enemySpawnOpen = false;
    this.roundState = 'idle';
    // hide the range scoreboard when we are no longer on the range
    this.updateRangePanel();
  },

  /* ============================================================
     SPAWN PICKING (local only)
     Everyone used to spawn on slot #0 at match start, and each round every
     player picked a random slot independently — so players regularly appeared
     inside each other. Now each player derives a slot from their own position in
     the shared roster. The roster has the same order on every machine (the host
     builds it and sends it out), so the indices are distinct and no two players
     can land on the same spawn — without changing the network protocol.
     ============================================================ */
  rosterSpawnIndex() {
    const roster = (Net && Net.peers && Net.peers.length) ? Net.peers : [];
    const myId = Net.selfId();
    const n = Math.max(1, (MAP.playerSpawns || []).length);
    const i = roster.findIndex(p => p && p.id === myId);
    return i >= 0 ? (i % n) : 0;
  },

  spawnPlayerLocal(spawnIdx) {
    const spawns = MAP.playerSpawns || [];
    const n = Math.max(1, spawns.length);
    let idx = (typeof spawnIdx === 'number' && isFinite(spawnIdx))
      ? Math.abs(Math.floor(spawnIdx)) % n
      : 0;
    /* НЕ СПАВНИТЬ В ДРУГОМ ИГРОКЕ: если выбранная точка занята удалённым
       игроком, ищем ближайшую свободную (это и был баг «спавн друг в друге»). */
    const occupied = (i) => {
      const s = spawns[i];
      if (!s) return false;
      for (const rp of this.remotePlayers) {
        if (rp && rp.alive && Math.hypot(rp.pos.x - s.x, rp.pos.z - s.z) < 2.5) return true;
      }
      return false;
    };
    if (occupied(idx)) {
      let found = -1;
      for (let d = 1; d <= n; d++) {
        const a = (idx + d) % n, b = (idx - d + n * 2) % n;
        if (!occupied(a)) { found = a; break; }
        if (!occupied(b)) { found = b; break; }
      }
      if (found >= 0) idx = found;
    }
    const s = spawns[idx] || { x: 0, z: 42 };
    const y = this.world.groundAt(s.x, s.z, 3);
    const yaw = (s.yaw !== undefined) ? s.yaw : Math.atan2(-(0 - s.x), -(0 - s.z)); // face the arena centre
    this.player.resetSpawn(s.x, y + .05, s.z, yaw);
    this.camera.position.set(s.x, y + CFG.eyeHeight, s.z);
  },

  /* ============================================================
     BUY PHASE / ROUND FLOW
     ============================================================ */
  beginBuyPhase(seconds, label) {
    // the range starts live immediately; its shop is always open and free
    if (this.mode === CS.MODE.RANGE) {
      this.roundState = 'live';
      this.buyTimer = 0;
      this.roundT = 0;
      this.resetSkipVotes();
      UI.center('ПОЛИГОН', IS_TOUCH ? 'Всё бесплатно · кнопка МАГАЗИН' : 'B — магазин · всё бесплатно', 2.4);
      this.roundNo++;
      return;
    }
    this.roundState = 'buy';
    this.buyTimer = seconds;
    this.roundT = seconds;
    /* КАРТА ВОССТАНАВЛИВАЕТСЯ к новой закупке (новый раунд/волна) */
    if (typeof restoreMap === 'function') restoreMap();
    this.resetSkipVotes();
    UI.center(label || 'ЗАКУПКА', 'B — магазин', 1.8);
    this.roundNo++;
    if (this.mode === CS.MODE.ONLINE && Net.role === CS.NETROLE.HOST) {
      // send the number we actually settled on, so both sides agree exactly
      Net.send({ t: 'round', st: 'buy', time: seconds, no: this.roundNo });
    }
  },

  /* ---------------- ready-up: every player may skip the buy phase ----------
     The buy phase is a fixed clock, so waiting out the full time when everyone
     has already shopped is dead time. Each player presses ГОТОВ; the round
     starts as soon as ALL players have voted (or the clock runs out). The host
     tallies the votes and broadcasts the start. */
  resetSkipVotes() {
    if (this.online) {
      this.online.skipVoteMe = 0;
      this.online.votes = {};      // host only: peerId → true
    }
    this.refreshSkipUI();
  },

  onlinePlayerCount() {
    if (!this.online) return 2;
    return this.online.players || 2;
  },

  refreshSkipUI() {
    const b = UI.el.btnBuySkip;
    if (!b) return;
    if (this.mode === CS.MODE.OFFLINE) {
      b.textContent = 'НАЧАТЬ ВОЛНУ';
      b.classList.remove('waiting');
      return;
    }
    if (this.mode === CS.MODE.RANGE) {
      b.textContent = 'ПОЛИГОН';
      b.classList.add('waiting');
      return;
    }
    const me = !!(this.online && this.online.skipVoteMe);
    const voted = this.online ? Object.keys(this.online.votes || {}).length : 0;
    const need = this.onlinePlayerCount();
    if (me && voted >= need) { b.textContent = 'СТАРТ…'; b.classList.add('waiting'); }
    else if (me) { b.textContent = 'ГОТОВ ✓ · ' + voted + '/' + need; b.classList.add('waiting'); }
    else if (voted > 0) { b.textContent = 'ГОТОВ · ' + voted + '/' + need; b.classList.remove('waiting'); }
    else { b.textContent = 'ГОТОВ'; b.classList.remove('waiting'); }
  },

  voteSkipBuy() {
    if (this.mode === CS.MODE.RANGE) return;
    if (this.roundState !== 'buy') { Audio3D_SFX.deny(); return; }
    if (this.mode === CS.MODE.OFFLINE) {
      if (this.buyOpen) this.toggleBuy(false);
      this.startLive();
      return;
    }
    if (this.mode !== CS.MODE.ONLINE || !this.online) return;
    if (this.online.skipVoteMe) return;
    this.online.skipVoteMe = 1;
    const id = Net.selfId();
    if (Net.role === CS.NETROLE.HOST) this.online.votes[id] = true;
    Net.send({ t: 'round', st: 'skip', no: this.roundNo, from: id });
    this.refreshSkipUI();
    if (this.buyOpen) UI.renderBuy(this.player, this.buyTimer);
    this.maybeEndBuy();
  },

  /* host-only: start the round once every player is ready */
  maybeEndBuy() {
    if (this.roundState !== 'buy') return;
    if (this.mode !== CS.MODE.ONLINE) return;
    if (!this.online) return;
    if (Net.role !== CS.NETROLE.HOST) return;
    const need = this.onlinePlayerCount();
    if (Object.keys(this.online.votes || {}).length < need) return;
    if (this.buyOpen) this.toggleBuy(false);
    this.startLive();
  },

  onSkipVoteMsg(m) {
    if (!this.online) return;
    if (Net.role === CS.NETROLE.HOST && m && m.from) this.online.votes[m.from] = true;
    this.refreshSkipUI();
    if (this.buyOpen) UI.renderBuy(this.player, this.buyTimer);
    this.maybeEndBuy();
  },

  toggleBuy(on) {
    if (on && this.roundState !== 'buy' && this.mode !== CS.MODE.RANGE) return;
    this.buyOpen = on;
    if (on) {
      UI.renderBuy(this.player, this.buyTimer);
      UI.show('buy');
      if (!IS_TOUCH) Input.releaseLock();
    } else {
      UI.show('hud');
      if (!IS_TOUCH) Input.requestLock();
    }
    if (IS_TOUCH) TouchUI.update();
  },

  /* The host's chosen shop allow-list, persisted between sessions. Missing
     entries default to allowed, so a fresh install allows everything. */
  hostShopAllow() {
    const out = MATCH.defaultShopAllow();
    const saved = Store.data.shopAllow;
    if (saved && typeof saved === 'object') {
      for (const k in out) if (saved[k] !== undefined) out[k] = saved[k] ? 1 : 0;
    }
    return out;
  },

  /* The host's per-item allow-list, loaded from the saved choice. */
  hostShopItemsAllow() {
    const out = {};
    const saved = Store.data.shopItems;
    if (saved && typeof saved === 'object') for (const k in saved) out[k] = saved[k] ? 1 : 0;
    return out;
  },

  /* Is the shop free right now? The range is always free; online can be started
     with "ВСЁ БЕСПЛАТНО" (set in the lobby and synced by the host); the offline
     "БЕСПЛАТНАЯ ОРДА" mode also runs with a free shop. */
  isFreeShop() {
    if (this.mode === CS.MODE.RANGE) return true;
    if (this.mode === CS.MODE.OFFLINE) return !!this.freePlay;
    return !!(this.freePlay && this.mode === CS.MODE.ONLINE);
  },

  /* Which shop categories this match allows. Enforced ONLY in online matches
     (and never on the test range, where everything is free anyway). */
  shopAllows(cat) {
    if (this.mode !== CS.MODE.ONLINE) return true;
    const a = this.shopAllow;
    return !a || a[cat] !== 0;
  },

  /* Individual item allow-list (missing = allowed). Only enforced online. */
  shopItemsAllow() {
    if (this.shopItemAllow) return this.shopItemAllow;
    const out = {};
    const saved = Store.data.shopItems;
    if (saved && typeof saved === 'object') for (const k in saved) out[k] = saved[k] ? 1 : 0;
    this.shopItemAllow = out;
    return out;
  },
  itemAllowed(id) {
    if (this.mode !== CS.MODE.ONLINE) return true;
    const a = this.shopItemsAllow();
    if (a[id] === 0) return false;
    /* мехакостюм и прочее снаряжение: если запрещена КАТЕГОРИЯ (gear/exp/etc),
       предмет тоже недоступен — иначе хост отключал класс, а клиент всё равно
       покупал (баг с мехакостюмом). */
    const w = WEAPONS[id];
    const cat = w ? w.cat : (GEAR[id] ? 'gear' : null);
    if (cat && !this.shopAllows(cat)) return false;
    return true;
  },

  /* Take an already-owned weapon into the hands (shop click on an owned card). */
  equipWeapon(id) {
    const w = WEAPONS[id];
    if (!w || !this.player) return;
    const p = this.player;
    const inSlot = p.inv[w.slot] && p.inv[w.slot].id === id;
    /* из сумки — вернуть в руки (проверяем реальный слот, а не has(), который
       включает и сумку) */
    if (p.bagHas(id) && !inSlot) {
      p.bagTake(id);
      p.flashT = 0;
      this.attachViewModel();
      Audio3D_SFX.reloadStep(0);
      UI.toast('Из сумки: ' + w.name, '#57d16a');
      UI.renderBuy(p, this.buyTimer);
      if (this.mode === CS.MODE.ONLINE) this.broadcastScore();
      return;
    }
    if (!p.has(id)) return;
    if (inSlot && p.slot === w.slot) {
      Audio3D_SFX.uiClick();
      UI.toast('Уже в руках: ' + w.name);
      return;
    }
    p.slot = w.slot;
    p.deployT = Math.max(p.deployT, .35);
    p.flashT = 0;
    p.buildViewModel();
    this.attachViewModel();
    Audio3D_SFX.reloadStep(0);
    UI.toast('В руки: ' + w.name, '#57d16a');
    UI.renderBuy(p, this.buyTimer);
    if (this.mode === CS.MODE.ONLINE) this.broadcastScore();
  },

  tryBuy(id) {
    const w = WEAPONS[id];
    if (!w) return;
    if (this.roundState !== 'buy' && this.mode !== CS.MODE.RANGE) { Audio3D_SFX.deny(); UI.toast('Магазин закрыт'); return; }
    if (!this.shopAllows(w.cat)) { Audio3D_SFX.deny(); UI.toast('Этот класс оружия выключен хостом'); return; }
    if (!this.itemAllowed(id)) { Audio3D_SFX.deny(); UI.toast('Это оружие выключено хостом'); return; }
    if (this.player.has(id)) { Audio3D_SFX.deny(); UI.toast('Уже куплено'); return; }
    /* последовательная прокачка меча: II требует I, III требует II */
    const need = (typeof WEAPON_UPGRADE_CHAIN !== 'undefined') ? WEAPON_UPGRADE_CHAIN[id] : null;
    if (need && !this.player.has(need)) {
      Audio3D_SFX.deny();
      UI.toast('Сначала купите ' + ((WEAPONS[need] && WEAPONS[need].name) || need));
      return;
    }
    const free = this.isFreeShop();
    if (!free && this.player.money < w.price) { Audio3D_SFX.deny(); UI.toast('Не хватает денег'); return; }
    if (!free) { this.player.money -= w.price; this.player.moneySpent = (this.player.moneySpent || 0) + w.price; }
    this.player.give(id);
    this.player.slot = w.slot;
    this.player.deployT = .5;
    this.player.buildViewModel();
    this.attachViewModel();
    Audio3D_SFX.buy();
    UI.toast('Куплено: ' + w.name, '#57d16a');
    UI.renderBuy(this.player, this.buyTimer);
    if (this.mode === CS.MODE.ONLINE) this.broadcastScore();
  },

  tryBuyGear(id) {
    const g = GEAR[id];
    if (!g) return;
    if (this.roundState !== 'buy' && this.mode !== CS.MODE.RANGE) { Audio3D_SFX.deny(); return; }
    if (!this.shopAllows('gear')) { Audio3D_SFX.deny(); UI.toast('Снаряжение выключено хостом'); return; }
    if (!this.itemAllowed(id)) { Audio3D_SFX.deny(); UI.toast('Этот предмет выключен хостом'); return; }
    const free = this.isFreeShop();

    /* Consumables: ammo refill, kamikaze drone, grenades and the medkit upgrade. */
    if (g.ammo || g.medkit || g.medkitBox || g.drone || g.grenade || g.buildable || g.turretGear || g.mechSuit) {
      if (!free && this.player.money < g.price) { Audio3D_SFX.deny(); UI.toast('Не хватает денег'); return; }
      // the field kit is limited unless the medkit-box upgrade was bought
      if (g.medkit && !this.player.medkitUnlimited && (this.player.medkits || 0) >= CFG.medkitMax) {
        Audio3D_SFX.deny();
        UI.toast('Аптечек максимум: ' + CFG.medkitMax + ' — купите ЯЩИК АПТЕЧЕК');
        return;
      }
      // the box is a one-off upgrade: it simply removes the medkit cap
      if (g.medkitBox && this.player.medkitUnlimited) { Audio3D_SFX.deny(); UI.toast('Уже куплено'); return; }
      if (!free) { this.player.money -= g.price; this.player.moneySpent = (this.player.moneySpent || 0) + g.price; }
      if (g.ammo) this.refillAmmo();
      else if (g.medkit) this.player.medkits = (this.player.medkits || 0) + 1;
      else if (g.medkitBox) { this.player.medkitUnlimited = true; }
      else if (g.drone) { this.player.drone = (this.player.drone || 0) + 1; this.player.droneOwned = true; }
      else if (g.grenade) {
        const cap = 4;
        this.player.grenades = this.player.grenades || { frag: 0, freeze: 0, napalm: 0, sticky: 0 };
        const cur = this.player.grenades[g.grenade] || 0;
        if (cur >= cap) { Audio3D_SFX.deny(); UI.toast('Гранат максимум: ' + cap); if (!free) this.player.money += g.price; return; }
        this.player.grenades[g.grenade] = cur + 1;
        Store.data.grenade = g.grenade; Store.save();
      }
      else if (g.buildable) {
        const cap = 3;
        this.player.builds = this.player.builds || { turret: 0, barricade: 0, mine: 0 };
        const cur = this.player.builds[g.buildable] || 0;
        if (cur >= cap) { Audio3D_SFX.deny(); UI.toast('Построек максимум: ' + cap); if (!free) this.player.money += g.price; return; }
        this.player.builds[g.buildable] = cur + 1;
        Store.data.buildable = g.buildable; Store.save();
      }
      else if (g.turretGear) {
        this.player.turretDrone = (this.player.turretDrone || 0) + 1;
      }
      else if (g.mechSuit) {
        // buy/enter the suit the first time; if already owned, toggle in/out
        if (this.player.mechOwned) this.toggleMechSuit();
        else this.equipMechSuit();
      }
      Audio3D_SFX.buy();
      const extra = g.medkitBox ? ' — лимит аптечек снят'
        : g.medkit ? ' (' + this.player.medkits + ' в запасе)'
          : g.drone ? ' (' + this.player.drone + ' в запасе)'
            : g.turretGear ? ' (' + this.player.turretDrone + ' заряд · V — вылет)'
              : g.mechSuit ? ' — наденьте (слоты 1/2)'
                : g.grenade ? ' (' + this.player.grenades[g.grenade] + ' шт · G — бросок)'
                  : g.buildable ? ' (' + this.player.builds[g.buildable] + ' шт · K — поставить)' : '';
      UI.toast('Куплено: ' + g.name + extra, '#57d16a');
      UI.renderBuy(this.player, this.buyTimer);
      if (this.mode === CS.MODE.ONLINE) this.broadcastScore();
      return;
    }

    /* ---- ПРОКАЧКА ДВИЖЕНИЯ: покупается один раз, действует весь забег ---- */
    if (g.perk) {
      const flag = { highJump: 'perkHighJump', dash: 'perkDash', runSpeed: 'perkRunSpeed' }[g.perk];
      if (this.player[flag]) { Audio3D_SFX.deny(); UI.toast('Уже куплено'); return; }
      if (!free && this.player.money < g.price) { Audio3D_SFX.deny(); UI.toast('Не хватает денег'); return; }
      if (!free) { this.player.money -= g.price; this.player.moneySpent = (this.player.moneySpent || 0) + g.price; }
      this.player[flag] = true;
      this.player.applyPerks();
      Audio3D_SFX.buy();
      UI.toast('Куплено: ' + g.name, '#57d16a');
      UI.renderBuy(this.player, this.buyTimer);
      if (this.mode === CS.MODE.ONLINE) this.broadcastScore();
      return;
    }

    /* Armour: each tier has more AP and soaks more, so it can be bought even
       when a weaker suit was already owned. The energy suit is the best. */
    if (g.heavy) {
      const currentBest = this.player.energyArmor ? 'energy' : this.player.heavyArmor ? 'heavy' : null;
      if (currentBest === 'energy' || (currentBest === 'heavy' && !g.energy)) { Audio3D_SFX.deny(); UI.toast('Уже куплено'); return; }
      if (!free && this.player.money < g.price) { Audio3D_SFX.deny(); UI.toast('Не хватает денег'); return; }
      if (!free) { this.player.money -= g.price; this.player.moneySpent = (this.player.moneySpent || 0) + g.price; }
      if (g.energy) this.player.energyArmor = true;
      else this.player.heavyArmor = true;
      this.player.armor = g.ap;
      this.player.armorMax = g.ap;
      this.player.helmet = true;
      Audio3D_SFX.buy();
      UI.toast('Куплено: ' + g.name + ' · AP ' + g.ap, '#57d16a');
      UI.renderBuy(this.player, this.buyTimer);
      if (this.mode === CS.MODE.ONLINE) this.broadcastScore();
      return;
    }

    /* KEKLAR нельзя купить поверх укреплённой/энергоброни: иначе он ПОНИЖАЛ бы
       броню со 200/300 до 100. */
    if (this.player.heavyArmor || this.player.energyArmor) { Audio3D_SFX.deny(); UI.toast('Уже есть броня лучше'); return; }
    if (this.player.armor >= 100 && (!g.helmet || this.player.helmet)) { Audio3D_SFX.deny(); UI.toast('Уже куплено'); return; }
    if (!free && this.player.money < g.price) { Audio3D_SFX.deny(); UI.toast('Не хватает денег'); return; }
    if (!free) { this.player.money -= g.price; this.player.moneySpent = (this.player.moneySpent || 0) + g.price; }
    this.player.armor = g.ap;
    if (g.helmet) this.player.helmet = true;
    this.player.armorMax = g.ap;
    // обычная броня не может быть поверх укреплённой — сбрасываем флаги тяжести
    this.player.heavyArmor = false; this.player.energyArmor = false;
    Audio3D_SFX.buy();
    UI.toast('Куплено: ' + g.name, '#57d16a');
    UI.renderBuy(this.player, this.buyTimer);
    if (this.mode === CS.MODE.ONLINE) this.broadcastScore();
  },

  /* Патроны: top every owned weapon back up to its full stock */
  refillAmmo() {
    const p = this.player;
    for (const s of [1, 2, 3]) {
      const w = p.inv[s];
      if (!w || w.id === 'knife') continue;
      const def = WEAPONS[w.id];
      if (!def || def.mag === Infinity) continue;
      w.mag = def.mag;
      w.reserve = def.reserve;
    }
    Audio3D_SFX.reloadStep(3);
  },

  /* Аптечка: instant heal, usable at any time during a live round/battle */
  /* cycle the active grenade kind */
  cycleGrenade() {
    const order = ['frag', 'freeze', 'napalm', 'sticky'];
    const cur = Store.data.grenade || 'frag';
    const next = order[(order.indexOf(cur) + 1) % order.length];
    Store.data.grenade = next; Store.save();
    UI.toast('Граната: ' + grenadeName(next), '#ff9d21');
    Audio3D_SFX.uiClick();
  },

  useMedkit() {
    const p = this.player;
    if (!p || !p.alive) return false;
    if (this.mode === CS.MODE.MENU || this.paused) return false;
    if (!(p.medkits > 0)) { UI.toast('Аптечек нет — купите в магазине (B)', '#f5d33c'); Audio3D_SFX.deny(); return false; }
    const maxHP = this.matchHP || CFG.maxHP;
    if (p.health >= maxHP) { UI.toast('Здоровье полное', '#f5d33c'); Audio3D_SFX.deny(); return false; }
    p.medkits--;
    p.health = Math.min(maxHP, p.health + CFG.medkitHeal);
    this._medkitsUsed = (this._medkitsUsed || 0) + 1;
    Audio3D_SFX.pickup();
    UI.feed('<span class="z">✚ Аптечка +' + CFG.medkitHeal + ' HP</span>');
    UI.toast('+' + CFG.medkitHeal + ' HP', '#57d16a');
    if (this.mode === CS.MODE.ONLINE) this.broadcastScore();
    return true;
  },

  /* ============================================================
     GRENADES (G / ЛКМ на «ГРАНАТАХ», кнопка на телефоне)
     Three kinds: frag (shrapnel), freeze (cryo) and napalm (fire pool).
     A grenade is lobbed, bounces once or twice, then detonates.
     ============================================================ */
  throwGrenade() {
    const p = this.player;
    if (!p || !p.alive) return false;
    if (this.mode === CS.MODE.MENU || this.paused) return false;
    if (this.roundState === 'buy' && this.mode !== CS.MODE.RANGE) { UI.toast('Гранаты — только в бою', '#f5d33c'); Audio3D_SFX.deny(); return false; }
    const kind = Store.data.grenade || 'frag';
    const count = p.grenades ? (p.grenades[kind] || 0) : 0;
    if (count <= 0) { UI.toast('Гранат нет — купите в магазине (B)', '#f5d33c'); Audio3D_SFX.deny(); return false; }
    p.grenades[kind] = count - 1;
    const eye = this.eyePos();
    const d = this.cameraDir();
    const start = { x: eye.x + d.x * .5, y: eye.y + .1, z: eye.z + d.z * .5 };
    const mesh = buildGrenadeModel(kind);
    mesh.position.set(start.x, start.y, start.z);
    this.scene.add(mesh);
    const speed = 19;
    this._grenades = this._grenades || [];
    this._grenades.push({
      kind: kind, mesh: mesh, pos: { x: start.x, y: start.y, z: start.z },
      /* ЛИПУЧКА не взрывается по таймеру: она прилипает и ждёт команды (P). */
      vel: { x: d.x * speed, y: d.y * speed + 2.6, z: d.z * speed },
      grav: CFG.gravity * .75, fuse: kind === 'sticky' ? 9999 : 2.4, bounces: 0,
      sticky: kind === 'sticky', stuck: false, armed: false, ownerLocal: true
    });
    Audio3D_SFX.uiClick();
    return true;
  },

  /* P — подорвать ВСЕ свои прилипшие липучки (как в GTA) */
  detonateStickies() {
    if (!this._grenades || !this._grenades.length) { UI.toast('Липучек нет', '#f5d33c'); Audio3D_SFX.deny(); return false; }
    let n = 0;
    for (let i = this._grenades.length - 1; i >= 0; i--) {
      const g = this._grenades[i];
      if (!g.sticky || !g.ownerLocal || !g.armed) continue;
      this.detonateGrenade(g); this.removeGrenade(i); n++;
    }
    if (!n) { UI.toast('Нет прилипших липучек', '#f5d33c'); Audio3D_SFX.deny(); return false; }
    UI.toast('Липучки взорваны: ' + n, '#e33a2e');
    return true;
  },

  updateGrenades(dt) {
    if (!this._grenades || !this._grenades.length) return;
    const world = this.world;
    for (let i = this._grenades.length - 1; i >= 0; i--) {
      const g = this._grenades[i];
      /* прилипшая липучка ждёт команды: мигает и не двигается */
      if (g.stuck) {
        if (g.mesh.userData && g.mesh.userData.led) {
          g.blink = (g.blink || 0) + dt;
          g.mesh.userData.led.visible = (g.blink % .6) < .3;
        }
        if (g.sticky && g.ownerLocal && !g.armed) { g.armed = true; UI.toast('Липучка прилипла — P чтобы взорвать', '#ff9d21'); }
        continue;
      }
      g.fuse -= dt;
      g.vel.y -= g.grav * dt;
      const nx = g.pos.x + g.vel.x * dt, ny = g.pos.y + g.vel.y * dt, nz = g.pos.z + g.vel.z * dt;
      const len = Math.hypot(nx - g.pos.x, ny - g.pos.y, nz - g.pos.z);
      const dir = len > 1e-6 ? { x: (nx - g.pos.x) / len, y: (ny - g.pos.y) / len, z: (nz - g.pos.z) / len } : { x: 0, y: -1, z: 0 };
      const hit = world.raycastAll(g.pos, dir, len + .12);
      if (hit.length) {
        const h = hit[0];
        g.pos.x = h.point.x + h.normal.x * .12; g.pos.y = h.point.y + h.normal.y * .12; g.pos.z = h.point.z + h.normal.z * .12;
        if (g.sticky) {
          /* ЛИПУЧКА прилипает к первой же поверхности и остаётся там */
          g.stuck = true; g.armed = true;
          if (h.normal.y < -.5) { g.mesh.rotation.x = Math.PI; }
          else if (Math.abs(h.normal.y) < .5) {
            g.mesh.lookAt(g.pos.x + h.normal.x, g.pos.y + h.normal.y, g.pos.z + h.normal.z);
            g.mesh.rotateX(Math.PI / 2);
          }
          continue;
        }
        const vn = g.vel.x * h.normal.x + g.vel.y * h.normal.y + g.vel.z * h.normal.z;
        g.vel.x -= 2 * vn * h.normal.x; g.vel.y -= 2 * vn * h.normal.y; g.vel.z -= 2 * vn * h.normal.z;
        g.vel.x *= .5; g.vel.y *= .5; g.vel.z *= .5;
        g.bounces++;
      } else { g.pos.x = nx; g.pos.y = ny; g.pos.z = nz; }
      g.mesh.position.set(g.pos.x, g.pos.y, g.pos.z);
      g.mesh.rotation.x += dt * 6; g.mesh.rotation.y += dt * 4;
      if (g.sticky) {
        const p = this.player;
        const ds = Math.hypot(p.pos.x - g.pos.x, p.pos.z - g.pos.z);
        if (ds < 1.2) { /* close enough to reach the wall next tick */ }
      }
      if (g.fuse <= 0) { this.detonateGrenade(g); this.removeGrenade(i); }
    }
  },

  detonateGrenade(g) {
    const kind = g.kind;
    // tell the room so everyone sees and hears the blast, not just the thrower
    if (this.mode === CS.MODE.ONLINE && Net.connected) {
      Net.send({
        t: 'boom', from: Net.selfId(),
        x: +g.pos.x.toFixed(2), y: +g.pos.y.toFixed(2), z: +g.pos.z.toFixed(2),
        r: kind === 'frag' ? 5.2 : kind === 'freeze' ? 5.5 : 6.4,
        c: kind === 'frag' ? [0xffb060, 0x151210] : undefined,
        g: kind === 'frag' ? undefined : kind
      });
    }
    if (kind === 'frag') {
      const R = 5.2, dmg = 190;
      this.effects.explosion(g.pos.x, g.pos.y, g.pos.z, R, [0xffb060, 0x151210]);
      this.breakMapAt(g.pos.x, g.pos.y, g.pos.z, R, 150);
      Audio3D_SFX.explosionAt(g.pos.x, g.pos.y, g.pos.z);
      if (this.horde) for (const z of this.horde.list) {
        if (!z.alive || z.dying) continue;
        const d = Math.hypot(z.pos.x - g.pos.x, (z.pos.y + 1) - g.pos.y, z.pos.z - g.pos.z);
        if (d > R) continue;
        const dealt = dmg * (1 - d / R);
        z.takeDamage(dealt, 'body', { x: 0, y: 0, z: 0 });
        this.player.damageDealt += dealt;
      }
      const p = this.player;
      const ds = Math.hypot(p.pos.x - g.pos.x, (p.pos.y + 1) - g.pos.y, p.pos.z - g.pos.z);
      if (ds < R * .9) this.applyDamageToSelf(dmg * (1 - ds / (R * .9)) * .3, g.pos);
      // opponents in an online duel take the same blast
      if (this.mode === CS.MODE.ONLINE) {
        for (const rp of this.remotePlayers) {
          if (!rp.alive) continue;
          const dr = Math.hypot(rp.pos.x - g.pos.x, (rp.pos.y + 1) - g.pos.y, rp.pos.z - g.pos.z);
          if (dr <= R) this.sendPvpHit(dmg * (1 - dr / R), 'body', false, rp, 'grenade');
        }
      }
    } else if (kind === 'freeze') {
      const R = 5.5;
      this.effects.frostBurst(g.pos.x, g.pos.y, g.pos.z, R);
      this.effects.decal(g.pos.x, g.pos.y + .02, g.pos.z, 0, 1, 0, R, 'frost', null, null, R, g.pos);
      Audio3D_SFX.explosionAt(g.pos.x, g.pos.y, g.pos.z);
      this.freezeAt(g.pos, R, 4.5, 40);
    } else if (kind === 'napalm') {
      const R = 6.4, dmg = 60;
      this.effects.explosion(g.pos.x, g.pos.y, g.pos.z, R, [0xff7a1a, 0x2a0d02]);
      this.breakMapAt(g.pos.x, g.pos.y, g.pos.z, R, 130);
      Audio3D_SFX.explosionAt(g.pos.x, g.pos.y, g.pos.z);
      if (this.horde) for (const z of this.horde.list) {
        if (!z.alive || z.dying) continue;
        const d = Math.hypot(z.pos.x - g.pos.x, z.pos.z - g.pos.z);
        if (d < R) { z.takeDamage(dmg, 'body', { x: 0, y: 0, z: 0 }); this.player.damageDealt += dmg; }
      }
      if (this.mode === CS.MODE.ONLINE) {
        for (const rp of this.remotePlayers) {
          if (!rp.alive) continue;
          const dr = Math.hypot(rp.pos.x - g.pos.x, rp.pos.z - g.pos.z);
          if (dr <= R) this.sendPvpHit(dmg * (1 - dr / R), 'body', false, rp, 'grenade');
        }
      }
      // a burning ground pool that keeps damaging (re-use the acid field)
      this.effects.decal(g.pos.x, g.pos.y + .02, g.pos.z, 0, 1, 0, R, 'acid', null, null, R, g.pos);
      for (let k = 0; k < 14; k++) {
        const a = U.rand(0, 6.28), r = U.rand(.4, R);
        this.effects.particle(g.pos.x + Math.cos(a) * r, g.pos.y + .2, g.pos.z + Math.sin(a) * r,
          0, U.rand(1.4, 3.4), 0, U.rand(.10, .26), 'spark', U.rand(.5, 1.2));
      }
    } else if (kind === 'sticky') {
      // ЛИПУЧКА: мощный направленный взрыв по кнопке
      const R = 6.6, dmg = 260;
      this.effects.explosion(g.pos.x, g.pos.y, g.pos.z, R, [0xff5a2a, 0x1a0604]);
      this.breakMapAt(g.pos.x, g.pos.y, g.pos.z, R, dmg * .6);
      Audio3D_SFX.explosionAt(g.pos.x, g.pos.y, g.pos.z);
      if (this.horde) for (const z of this.horde.list) {
        if (!z.alive || z.dying) continue;
        const d = Math.hypot(z.pos.x - g.pos.x, (z.pos.y + 1) - g.pos.y, z.pos.z - g.pos.z);
        if (d > R) continue;
        const dealt = dmg * (1 - d / R);
        z.takeDamage(dealt, 'body', { x: 0, y: 0, z: 0 });
        this.player.damageDealt += dealt;
      }
      const p = this.player;
      const ds = Math.hypot(p.pos.x - g.pos.x, (p.pos.y + 1) - g.pos.y, p.pos.z - g.pos.z);
      if (ds < R * .85) this.applyDamageToSelf(dmg * (1 - ds / (R * .85)) * .25, g.pos);
      if (this.mode === CS.MODE.ONLINE) {
        for (const rp of this.remotePlayers) {
          if (!rp.alive) continue;
          const dr = Math.hypot(rp.pos.x - g.pos.x, (rp.pos.y + 1) - g.pos.y, rp.pos.z - g.pos.z);
          if (dr <= R) this.sendPvpHit(dmg * (1 - dr / R), 'body', false, rp, 'grenade');
        }
      }
      this.effects.decal(g.pos.x, g.pos.y + .02, g.pos.z, 0, 1, 0, 1.6, 'scorch');
    }
  },

  removeGrenade(i) {
    const g = this._grenades[i];
    if (g && g.mesh.parent) g.mesh.parent.remove(g.mesh);
    if (g && g.mesh.traverse) g.mesh.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    this._grenades.splice(i, 1);
  },

  clearGrenades() {
    if (!this._grenades) return;
    while (this._grenades.length) this.removeGrenade(0);
  },

  /* ============================================================
     KAMIKAZE DRONE (управляемый)
     A guided flying bomb. While it is airborne the player steers it with the
     normal movement + look input; any zombie or enemy that lands a hit destroys
     it. The player is tucked at the launch point ("inside" the drone) and is put
     back there once the drone is gone.
     ============================================================ */
  launchDrone() {
    const p = this.player;
    if (!p || !p.alive) return false;
    if (this.drone) return false;                            // already flying
    // the drone is a live-round tool: launching it during the buy phase was a bug
    if (this.roundState === 'buy' && this.mode !== CS.MODE.RANGE) {
      UI.toast('Дрон доступен только в бою', '#f5d33c');
      Audio3D_SFX.deny();
      return false;
    }
    if (!(p.drone > 0)) { UI.toast('Дрона нет — купите в магазине (B)', '#f5d33c'); Audio3D_SFX.deny(); return false; }
    p.drone--;
    const eye = this.eyePos();
    const d = this.cameraDir();
    const start = { x: eye.x + d.x * .8, y: eye.y + .15, z: eye.z + d.z * .8 };
    const mesh = buildDroneModel();
    mesh.position.set(start.x, start.y, start.z);
    this.scene.add(mesh);
    this.drone = {
      mesh: mesh,
      pos: { x: start.x, y: start.y, z: start.z },
      vel: { x: d.x * CFG.droneSpeed, y: 0, z: d.z * CFG.droneSpeed },
      yaw: p.yaw, pitch: 0,
      hp: CFG.droneHp,
      life: CFG.droneLife,
      rotor: 0,
      ownerReturn: { x: p.pos.x, y: p.pos.y, z: p.pos.z },
      ownerSlot: p.slot
    };
    Audio3D_SFX.droneLaunch();
    UI.center('ДРОН ЗАПУЩЕН', 'Мышь/WASD — управление · ПКМ — медленнее · F — взрыв', 2.4);
    UI.toast('Дрон в воздухе · F — подорвать', '#4aa3ff');
    if (this.mode === CS.MODE.ONLINE) {
      Net.send({ t: 'drone', st: 'launch', from: Net.selfId(), x: start.x, y: start.y, z: start.z, yw: p.yaw });
    }
    return true;
  },

  /* blow up (or, when `shotDown`, let a hit do it) */
  detonateDrone(shotDown) {
    const dr = this.drone;
    if (!dr) return;
    dr.mesh.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    if (dr.mesh.parent) dr.mesh.parent.remove(dr.mesh);
    const center = { x: dr.pos.x, y: dr.pos.y, z: dr.pos.z };
    this.explodeDrone(center);
    this.drone = null;
    // put the player back where they launched from
    const p = this.player;
    const r = dr.ownerReturn;
    p.pos.x = r.x; p.pos.y = r.y; p.pos.z = r.z;
    p.vel.x = p.vel.y = p.vel.z = 0;
    p.slot = dr.ownerSlot;
    UI.toast(shotDown ? 'Дрон сбит' : 'Дрон подорван', shotDown ? '#e33a2e' : '#57d16a');
    if (this.mode === CS.MODE.ONLINE) {
      Net.send({ t: 'drone', st: 'boom', from: Net.selfId(), x: center.x, y: center.y, z: center.z });
    }
  },

  explodeDrone(center) {
    const R = CFG.droneBlast, dmg = CFG.droneDmg;
    if (this.effects) this.effects.explosion(center.x, center.y, center.z, R);
    /* взрыв дрона РАЗРУШАЕТ карту в радиусе */
    this.breakMapAt(center.x, center.y, center.z, R * 1.05, dmg * .5);
    Audio3D_SFX.explosionAt(center.x, center.y, center.z);
    if (this.horde) {
      for (const z of this.horde.list) {
        if (!z.alive || z.dying) continue;
        const d = Math.hypot(z.pos.x - center.x, (z.pos.y + 1) - center.y, z.pos.z - center.z);
        if (d > R) continue;
        const dealt = dmg * (1 - d / R);
        z.takeDamage(dealt, 'body', { x: 0, y: 0, z: 0 });
        this.player.damageDealt += dealt;
      }
    }
    if (this.mode === CS.MODE.ONLINE) {
      for (const rp of this.remotePlayers) {
        if (!rp.alive) continue;
        const d = Math.hypot(rp.pos.x - center.x, (rp.pos.y + 1) - center.y, rp.pos.z - center.z);
        if (d <= R) this.sendPvpHit(dmg * (1 - d / R), 'body', false, rp);
      }
    }
  },

  updateDrone(dt) {
    const dr = this.drone;
    if (!dr) return;
    const p = this.player;
    dr.life -= dt;
    if (dr.life <= 0) { this.detonateDrone(false); return; }

    /* The motor is loud on purpose: it plays periodically so the opponent can
       hear roughly where the drone is and try to shoot it down. */
    dr.noiseT = (dr.noiseT || 0) - dt;
    if (dr.noiseT <= 0) {
      dr.noiseT = .2;
      Audio3D_SFX.droneLoop(dr.pos.x, dr.pos.y, dr.pos.z);
    }

    /* Steer: look input aims the drone, movement keys push it. It always flies
       forward along its facing, so it handles like a little plane. */
    const m = Input.lookDelta();
    dr.yaw -= m.dx * 1.35;
    dr.pitch -= m.dy * 1.35;
    dr.pitch = U.clamp(dr.pitch, -1.2, 1.2);
    const mv = Input.moveVector();
    const boost = (mv.run ? CFG.droneBoost : 1) * (Input.aimDown() ? .45 : 1);
    const speed = CFG.droneSpeed * boost;
    const cp = Math.cos(dr.pitch);
    const fwd = { x: -Math.sin(dr.yaw) * cp, y: Math.sin(dr.pitch), z: -Math.cos(dr.yaw) * cp };
    const right = { x: Math.cos(dr.yaw), z: -Math.sin(dr.yaw) };
    const vx = fwd.x * speed + right.x * mv.r * speed * .55;
    const vy = fwd.y * speed + mv.f * speed * .35;   // stick forward dives, back climbs
    const vz = fwd.z * speed + right.z * mv.r * speed * .55;
    // ease toward the commanded velocity so it banks instead of snapping
    dr.vel.x = U.lerp(dr.vel.x, vx, 1 - Math.pow(.002, dt));
    dr.vel.y = U.lerp(dr.vel.y, vy, 1 - Math.pow(.002, dt));
    dr.vel.z = U.lerp(dr.vel.z, vz, 1 - Math.pow(.002, dt));

    const nx = dr.pos.x + dr.vel.x * dt, ny = dr.pos.y + dr.vel.y * dt, nz = dr.pos.z + dr.vel.z * dt;
    const segLen = Math.hypot(nx - dr.pos.x, ny - dr.pos.y, nz - dr.pos.z);
    const dir = segLen > 1e-6 ? { x: (nx - dr.pos.x) / segLen, y: (ny - dr.pos.y) / segLen, z: (nz - dr.pos.z) / segLen } : { x: 0, y: -1, z: 0 };

    // ---- does anything shoot it down? zombies and enemy players both can ----
    let hitZ = null;
    if (this.horde) hitZ = this.horde.raycast(dr.pos, dir, segLen + .5);
    let hitP = null;
    if (this.mode === CS.MODE.ONLINE) {
      const h = this.rayRemoteAny(dr.pos, dir, segLen + .5);
      if (h && (!hitZ || h.t < hitZ.t)) hitP = h;
    }
    const wallHits = this.world.raycastAll(dr.pos, dir, segLen + .12);

    // any contact destroys the drone, so it is easy to bring down
    if (hitZ && hitZ.t <= segLen + .5) {
      dr.hp -= 999;
      if (this.effects) this.effects.impact({ x: dr.pos.x, y: dr.pos.y, z: dr.pos.z }, dir, 'metal');
    }
    if (hitP && hitP.t <= segLen + .5) dr.hp -= 999;
    if (dr.hp <= 0) { this.detonateDrone(true); return; }

    if (wallHits.length && wallHits[0].t <= segLen + .12) {
      /* дрон не просто разбивается о угол: он сносит разрушаемую часть, в
         которую влетел, и подрывается. Если это неразрушимый бокс (граница) —
         как раньше, просто детонирует. */
      const hb = wallHits[0].box;
      if (hb && hb.destructible && !hb.removed && typeof damageMapBox === 'function') {
        damageMapBox(hb, hb.maxHp + 1);
        this.breakMapAt(hb.minX + (hb.maxX - hb.minX) / 2, hb.minY + (hb.maxY - hb.minY) / 2, hb.minZ + (hb.maxZ - hb.minZ) / 2, CFG.droneBlast + .6, 1e6);
      }
      this.detonateDrone(false); return;
    }
    if (ny < -2) { this.detonateDrone(false); return; }

    dr.pos.x = nx; dr.pos.y = ny; dr.pos.z = nz;
    dr.mesh.position.set(dr.pos.x, dr.pos.y, dr.pos.z);
    dr.mesh.rotation.set(dr.pitch, dr.yaw, U.clamp(-dr.vel.x * .02 + dr.vel.z * .02, -.5, .5));
    dr.rotor += dt * 34;
    const rotors = dr.mesh.userData.rotors || [];
    for (const r of rotors) r.rotation.y = dr.rotor;

    // keep the player tucked at the launch point while "inside" the drone
    p.pos.x = dr.ownerReturn.x; p.pos.z = dr.ownerReturn.z; p.pos.y = dr.ownerReturn.y;
    p.vel.x = p.vel.y = p.vel.z = 0;
  },

  updateBuyPhase(dt) {
    if (this.roundState === 'buy') {
      // the range has no clock: the buy phase lasts until the player leaves
      if (this.mode === CS.MODE.RANGE) { this.roundT = 0; return; }
      this.buyTimer -= dt;
      this.roundT = this.buyTimer;
      // Only tick the timer text here. Rebuilding the whole grid every frame
      // destroyed the card under the cursor between mousedown and mouseup, so a
      // real mouse click never produced a 'click' event (keyboard digits still
      // worked). The grid is rebuilt on demand by tryBuy/refunds/category change.
      if (this.buyOpen) UI.tickBuyTimer(this.buyTimer);
      if (this.buyTimer <= 0) {
        if (this.buyOpen) this.toggleBuy(false);
        this.startLive();
      }
    } else if (this.roundState === 'live') {
      // Offline survival has no round clock — the wave ends when the horde is dead.
      // Online duels are timed, exactly like a real CS round.
      if (this.mode === CS.MODE.ONLINE) {
        if (this.isCoop) {
          // кооп-волны: нет PvP-таймера, раунд длится до конца волн
          this.roundT = 0;
        } else {
          this.roundT -= dt;
          if (this.roundT <= 0) this.endRound(null, 'ВРЕМЯ');
        }
      } else if (this.mode === CS.MODE.RANGE) {
        this.updateRange(dt);
      } else if (this.offline) {
        this.offline.waveElapsed = (this.offline.waveElapsed || 0) + dt;
        this.roundT = this.offline.waveElapsed;
      }
    } else if (this.roundState === 'end') {
      this.roundT -= dt;
      if (this.roundT <= 0) this.nextRound();
    }
  },

  startLive() {
    this.roundState = 'live';
    this.roundT = CFG.roundTime;
    const last = this.onlinePlayerCount() > 2;
    UI.center('В БОЙ!', this.mode === 'online' ? (last ? 'Выживает сильнейший · ' + this.matchHP + ' HP' : 'Уничтожьте соперника') : 'Волна ' + (this.offline ? this.offline.wave : 1), 1.4);
    if (this.mode === CS.MODE.OFFLINE && this.offline) {
      this.startWave();
    }
    if (this.mode === CS.MODE.ONLINE && Net.role === CS.NETROLE.HOST) {
      Net.send({ t: 'round', st: 'live', time: CFG.roundTime, no: this.roundNo, hp: this.matchHP, map: MAP.id, players: this.onlinePlayerCount() });
    }
  },

  endRound(winnerIsMe, reason) {
    if (this.roundState === 'end') return;
    this.roundState = 'end';
    this.roundT = 4.0;
    if (this.mode === CS.MODE.ONLINE) {
      // The host owns the authoritative result and broadcasts it.
      if (Net.role === CS.NETROLE.HOST) {
        if (winnerIsMe === true) this.online.roundWins.me++;
        else if (winnerIsMe === false) this.online.roundWins.them++;
        this.online.scoreMe = this.online.roundWins.me;
        this.online.scoreThem = this.online.roundWins.them;
        this.online.played++;
        const won = winnerIsMe === true;
        const txt = won ? 'РАУНД ВЫИГРАН' : winnerIsMe === false ? 'РАУНД ПРОИГРАН' : 'НИЧЬЯ';
        UI.center(txt, this.online.scoreMe + ' : ' + this.online.scoreThem + (reason ? ' · ' + reason : ''), 2.6);
        Audio3D_SFX.roundEnd(won);
        const finished = this.online.played >= this.online.rounds;
        // on the final round, tell the room who actually won the match
        let winnerName;
        if (finished) {
          const me = this.online.roundWins.me, them = this.online.roundWins.them;
          winnerName = me === them ? 'НИЧЬЯ' : (me > them ? this.player.name : this.matchTopRivalName());
        }
        Net.send({ t: 'round', st: 'end', win: won ? 'host' : winnerIsMe === false ? 'client' : 'draw', no: this.roundNo, over: finished ? 1 : 0, winner: winnerName });
        if (finished) this.endMatch();
        else setTimeout(() => { if (this.roundState === 'end' && this.mode === CS.MODE.ONLINE) this.nextRound(); }, 4200);
      }
      // clients react to the host's 'round:end' message instead
    }
  },

  /* The configured number of rounds has been played: show the match result with
     the winner's name and let the player go back to the menu or start again. */
  endMatch() {
    if (this.mode !== CS.MODE.ONLINE) return;
    if (this.isCoop) return;                 // кооп-волны не считаются как победы в онлайне
    const o = this.online;
    if (o.matchOver && this._matchOverPending) return;   // already shown
    o.matchOver = true;
    const me = o.roundWins.me, them = o.roundWins.them;
    const won = me > them, draw = me === them;
    /* Счёт матчей/побед начисляем РОВНО ОДИН РАЗ за матч */
    if (!this._matchCounted) {
      this._matchCounted = true;
      Store.data.matches = (Store.data.matches || 0) + 1;
      if (won) Store.data.wins = (Store.data.wins || 0) + 1;
      Store.save();
    }
    UI.renderMenuStats();

    /* Work out who actually won the match. In a two-player room it is simply
       us or the opponent; with 3–4 players the host is the authority and sends
       the winner's name, which we show verbatim. */
    let winnerName;
    if (draw) winnerName = 'НИЧЬЯ';
    else if (Net.role === CS.NETROLE.HOST) winnerName = won ? this.player.name : this.matchTopRivalName(won);
    else winnerName = won ? this.player.name : (this.online.winnerName || this.matchTopRivalName(won));

    this.showMatchEnd(winnerName, me, them, draw);
    this._matchOverPending = true;
  },

  /* name of the remote player who scored the most rounds (fallback: any rival) */
  matchTopRivalName() {
    if (this.online && this.online.winnerName) return this.online.winnerName;
    const names = (this.remotePlayers || []).map(r => r.name).filter(Boolean);
    return names.length ? names[0] : 'Соперник';
  },

  /* Fill and show the match-end screen. */
  showMatchEnd(winnerName, me, them, draw) {
    const title = draw ? 'НИЧЬЯ В МАТЧЕ' : (me > them ? 'ВЫ ПОБЕДИЛИ' : 'ВЫ ПРОИГРАЛИ');
    if (UI.el.meTitle) UI.el.meTitle.textContent = 'МАТЧ ЗАВЕРШЁН';
    if (UI.el.meWinner) {
      UI.el.meWinner.textContent = winnerName;
      UI.el.meWinner.style.color = draw ? '#f5d33c' : (me > them ? '#57d16a' : '#ff6b5b');
    }
    if (UI.el.meScore) UI.el.meScore.textContent = me + ' : ' + them;
    if (UI.el.meDetail) {
      UI.el.meDetail.textContent = 'Боёв сыграно: ' + this.online.played + ' из ' + this.online.rounds +
        (draw ? ' · победитель не определён' : '');
    }
    if (!IS_TOUCH) Input.releaseLock();
    Input.enabled = false;
    this.player.triggerDown = false;
    UI.show('matchEnd');
    Audio3D_SFX.roundEnd(me > them);
  },

  /* "ЗАНОВО": start a fresh match with the same room and settings. */
  rematchOnline() {
    if (this.mode !== CS.MODE.ONLINE) return;
    if (Net.role === CS.NETROLE.HOST) {
      // the host resets the score and starts round 1 for everybody
      this.player.kills = 0; this.player.deaths = 0; this.player.score = 0;
      for (const rp of this.remotePlayers) { rp.kills = 0; rp.deaths = 0; rp.score = 0; }
      Net.send({ t: 'round', st: 'rematch', no: 0, hp: Store.data.maxHP, free: this.freePlay ? 1 : 0, rounds: MATCH.clampRounds(Store.data.rounds), map: MAP.id });
      this.beginRematch();
    } else {
      // a client asks the host to run it again
      Net.send({ t: 'round', st: 'rematchask', from: Net.selfId() });
      UI.toast('Запрос на новый матч отправлен хосту', '#4aa3ff');
    }
  },

  /* Shared reset used when a rematch actually starts (host path). */
  beginRematch(rounds) {
    this._matchOverPending = false;
    this._matchCounted = false;
    this.online.roundWins = { me: 0, them: 0 };
    this.online.scoreMe = 0; this.online.scoreThem = 0;
    this.online.played = 0;
    this.online.matchOver = false;
    this.online.winnerName = null;
    this.online.rounds = MATCH.clampRounds(rounds !== undefined ? rounds : this.online.rounds);
    this.roundNo = 0;                     // beginBuyPhase bumps it back to 1
    UI.show('hud');
    if (Net.role === CS.NETROLE.HOST) this.doNewRound();
    else { this.roundNo = 1; this.beginBuyPhaseClient(25, 1, this.matchHP, MAP.id); }
    if (!IS_TOUCH) setTimeout(() => { if (this.running) Input.requestLock(); }, 80);
  },

  backToMenuFromMatch() {
    this._matchOverPending = false;
    this.stopToMenu();
  },

  nextRound() {
    if (this.mode !== CS.MODE.ONLINE) return;
    if (Net.role !== CS.NETROLE.HOST) return;   // host drives the flow
    if (this.roundState !== 'end') return;
    this.doNewRound();
    Net.send({ t: 'round', st: 'newround', no: this.roundNo });
  },

  doNewRound() {
    // host-only: reset every fighter, hand out cash, then open the buy phase
    this.player.maxHealth = this.matchHP;
    this.player.health = this.matchHP;
    this.player.armor = 0; this.player.helmet = false;
    this.player.heavyArmor = false; this.player.energyArmor = false;   // броня не переносится в новый раунд
    this.player.armorMax = CFG.maxAP || 100;
    this.player.alive = true;
    this.player.money = Math.min(CFG.moneyCap, this.player.money + 1400);
    // a drone still in the air belongs to the previous round
    if (this.drone) this.detonateDrone(false);
    for (const rp of this.remotePlayers) this.clearRemoteDrone(rp);
    // a bought drone is recharged every round in online play
    if (this.mode === CS.MODE.ONLINE && this.player.droneOwned) this.player.drone = 1;
    this.spawnPlayerLocal(this.rosterSpawnIndex());
    for (const rp of this.remotePlayers) { rp.alive = true; rp.dead = false; rp.health = this.matchHP; rp.maxHealth = this.matchHP; }
    this.broadcastRespawn();
    this.beginBuyPhase(25, 'РАУНД ' + (this.roundNo + 1));
  },

  /* ============================================================
     OFFLINE WAVES
     ============================================================ */
  startWave() {
    const o = this.offline;
    o.wave++;
    o.bosses = 0;
    o.bossPending = 0;
    /* endless: every 10 waves pause and let the player pick a modifier */
    if (this.isEndless && o.wave > 1 && (o.wave - 1) % 10 === 0) {
      this.openModifierPicker(o.wave);
    }
    // offline: a fresh arena every 10 waves (waves 11, 21, 31 …)
    if (this.mode === CS.MODE.OFFLINE) this.rotateMapIfNeeded(o.wave);
    let count = Math.round(CFG.zombieStartCount + (o.wave - 1) * 2.4);
    // zombie-count multiplier: custom mode uses its own, else the ×10 preset
    const countMul = (this.offCountMul != null) ? this.offCountMul : (this.hordeMode ? CFG.hordeCountMul : 1);
    count = Math.round(count * countMul * (this.modState ? this.modState.count : 1));
    // custom "exact" count: every wave is exactly this many zombies
    if (this.offCountExact != null) count = this.offCountExact;

    /* ---- BOSS-RUSH: every wave is a boss, escalating with each one ---- */
    if (this.isBossRush) {
      const bm = this.bossRushList();
      const type = bm[(o.wave - 1) % bm.length];
      o.bossType = type;
      o.bossPending = 1;
      count = 0;
      UI.center(ZOMBIES[type].name, 'БОСС-РАШ · ЭТАП ' + o.wave, 3.0);
      UI.toast('БОСС-РАШ: ' + ZOMBIES[type].name, '#c24bff');
      Audio3D_SFX.waveStart();
      o.totalThisWave = 0; o.spawnedThisWave = 0; o.toSpawn = 0;
      o.betweenWaves = false; o.waveStart = U.now();
      Bus.emit('waveStart', o.wave);
      return;
    }

    /* ---- BOSS WAVE ----
       At 15 / 30 / 50 / 100 a boss joins the wave. ОРДА ×10 summons five of them
       at once instead of one, each with a much smaller health pool so the fight
       stays winnable with the reduced damage window. */
    const bossType = this.bossForWave(o.wave);
    // a mini-boss (the robot zombie) joins every third wave from wave 8 on
    o.miniBossPending = this.isMiniBossWave(o.wave) ? 1 : 0;
    if (bossType) {
      o.bossType = bossType;
      o.bossPending = this.hordeMode ? 5 : 1;
      // on a boss wave the regular horde is thinned so the boss is the fight
      count = Math.round(count * (this.hordeMode ? .45 : .4));
      UI.center(ZOMBIES[bossType].name, o.bossPending > 1 ? o.bossPending + ' босса!' : 'БОСС', 3.0);
      UI.toast('БОСС: ' + ZOMBIES[bossType].name + (o.bossPending > 1 ? ' ×' + o.bossPending : ''), '#c24bff');
      Audio3D_SFX.waveStart();
    } else {
      o.bossType = null;
      let title = (this.hordeMode ? 'ОРДА ' : 'ВОЛНА ') + o.wave;
      let sub = count + ' противников';
      if (o.miniBossPending) {
        count = Math.round(count * .85);
        o.totalThisWave = count;
        const mbType = this.pickMiniBoss(o.wave);
        o.miniBossType = mbType;
        sub = count + ' противников · МИНИ-БОСС: ' + ZOMBIES[mbType].name;
        UI.toast('МИНИ-БОСС: ' + ZOMBIES[mbType].name, '#4ad6ff');
      }
      UI.center(title, sub, 2.0);
      UI.toast((this.hordeMode ? 'Орда ' : 'Волна ') + o.wave + ' — ' + count + ' зомби', '#e33a2e');
      Audio3D_SFX.waveStart();
    }

    o.totalThisWave = count;
    o.spawnedThisWave = 0;
    o.toSpawn = count;
    o.betweenWaves = false;
    o.waveStart = U.now();
    /* для целей «без перезарядки / без выстрела» запоминаем счётчики на старте волны */
    this._reloadsAtWaveStart = (this.player && this.player.reloads) || 0;
    this._shotsAtWaveStart = (this.player && (this.player.bulletsFired | 0)) || 0;
    // a checkpoint every 20 waves — death then resumes from here
    if (o.wave % 20 === 0) {
      this.saveCheckpoint(o.wave);
      UI.toast('ЧЕКПОИНТ сохранён: волна ' + o.wave, '#57d16a');
    }
    Bus.emit('waveStart', o.wave);
  },

  /* which boss (if any) belongs to this wave */
  bossForWave(wave) {
    if (wave === 100) return 'brainBoss';
    if (wave === 50) return 'bossTitan';
    if (wave === 30) return 'bossBrute';
    if (wave === 15) return 'bossWarden';
    return null;
  },
  /* финальный босс-мозг доступен и в босс-раше */
  bossRushList() { return ['bossWarden', 'bossBrute', 'bossTitan', 'brainBoss', 'bossFinal']; },
  _modList() { return MODIFIERS.filter(m => (Store.data.offMods || {})[m.id]); },
  openModifierPicker(wave) {
    const choices = MODIFIERS.slice().sort(() => Math.random() - .5).slice(0, 3);
    this._modChoices = choices;
    this._modPickOpen = true;
    this.roundState = 'live';
    const grid = UI.el.modGrid;
    if (grid) {
      grid.innerHTML = '';
      choices.forEach(m => {
        const b = document.createElement('button');
        b.className = 'modcard';
        b.innerHTML = '<b>' + U.esc(m.name) + '</b><i>' + U.esc(m.desc) + '</i>';
        b.addEventListener('click', () => this.pickModifier(m));
        grid.appendChild(b);
      });
    }
    if (UI.el.modActive) UI.el.modActive.innerHTML = 'Активные модификаторы: ' +
      (this.modList.length ? this.modList.map(m => '<b>' + U.esc(m.name) + '</b>').join(' · ') : 'нет');
    UI.show('modScreen');
    Audio3D_SFX.uiClick();
  },
  pickModifier(m) {
    m.apply(this.modState);
    this.modList.push(m);
    Store.data.offMods = {}; this.modList.forEach(x => Store.data.offMods[x.id] = 1);
    Store.data.offModPick = (Store.data.offModPick || 0) + 1;
    Store.save();
    UI.show('hud');
    UI.toast('Модификатор: ' + m.name + ' — ' + m.desc, '#c24bff');
    Audio3D_SFX.buy();
    // the picker paused the wave; resume play
    this._modPickOpen = false;
    this.roundState = 'live';
  },

  spawnBoss(type) {
    const s = MAP.zombieSpawns && MAP.zombieSpawns.length ? U.pick(MAP.zombieSpawns) : { x: 0, z: 0 };
    const b = this.horde.spawn(type, s.x, s.z);
    // ОРДА ×10: five bosses, but each is far squishier. БЕСПЛАТНАЯ ОРДА keeps
    // the normal boss health; custom mode scales bosses by its own HP setting.
    if (this.offHpMul != null) b.maxHealth *= this.offHpMul;
    else if (this.hordeMode && !this.freePlay) b.maxHealth *= .30;
    /* boss-rush: each successive boss is tougher, so the ladder keeps rising */
    if (this.isBossRush) b.maxHealth *= (1 + (this.offline.wave - 1) * .35);
    if (this.modState) b.maxHealth *= this.modState.hp;
    if (this.modState && this.modState.speed !== 1) b.speed *= this.modState.speed;
    if (this.modState && this.modState.dmg !== 1) b.dmg *= this.modState.dmg;
    if (this.modState && this.modState.armor) b.armor = Math.min(.7, b.armor + this.modState.armor);
    b.health = b.maxHealth;
    b.isBoss = true;
    b._introT = 1.6;                    // drives the entrance FX / slow time-in
    /* МОЗГ-ПОЖИРАТЕЛЬ: начинаем постановочный многофазный бой */
    if (b.def && b.def.brain && typeof BrainBoss !== 'undefined') {
      try { BrainBoss.begin(b); } catch (e) { console.error(e); }
    }
    // a dramatic arrival: blast ring + aura burst + the boss's own theme
    const gy = b.pos.y;
    this.effects.explosion(b.pos.x, gy + 1.2, b.pos.z, 5.5, [ZOMBIES[type].aura || 0xff5a2a, 0x100608], ZOMBIES[type].final);
    Audio3D_SFX.explosionAt(b.pos.x, gy + 1, b.pos.z);
    Audio3D_SFX.growl(b.pos.x, gy + 1.5, b.pos.z, 'brute');
    /* САУНДТРЕК БОССА — во ВСЕХ режимах (оффлайн, кооп, орда, босс-раш) */
    this.refreshMusic();
    return b;
  },

  waveTypesFor(wave) {
    const pool = [{ t: 'walker', w: 10 }];
    if (wave >= 2) pool.push({ t: 'runner', w: Math.min(7, wave * .9) });
    if (wave >= 3) pool.push({ t: 'crawler', w: Math.min(5, wave * .6) });
    if (wave >= 4) pool.push({ t: 'tank', w: Math.min(4, wave * .45) });
    if (wave >= 5) pool.push({ t: 'spitter', w: Math.min(5, wave * .5) });
    if (wave >= 6) pool.push({ t: 'flying', w: Math.min(4, (wave - 5) * .55) });
    if (wave >= 7) pool.push({ t: 'brute', w: Math.min(3, (wave - 5) * .4) });
    /* new specials — each unlocked a couple of waves apart */
    if (wave >= 7) pool.push({ t: 'splitter', w: Math.min(3, (wave - 6) * .38) });
    if (wave >= 8) pool.push({ t: 'shielder', w: Math.min(3, (wave - 7) * .36) });
    if (wave >= 9) pool.push({ t: 'healer', w: Math.min(2, (wave - 8) * .30) });
    if (wave >= 10) pool.push({ t: 'summoner', w: Math.min(2, (wave - 9) * .26) });
    /* ПОДРЫВНИК — бежит и взрывается (ломает стены). Появляется с 6-й волны. */
    if (wave >= 6) pool.push({ t: 'bomber', w: Math.min(3.5, (wave - 5) * .45) });
    return pool;
  },
  /* Мини-боссы в обычной волне: чем дальше, тем чаще и сильнее варианты.
     Они идут как РЕДКИЕ враги, чтобы не перегружать волну. */
  miniBossWaveTypes(wave) {
    const pool = [];
    if (wave >= 12) pool.push({ t: 'stalker', w: Math.min(1.2, (wave - 11) * .08) });
    if (wave >= 15) pool.push({ t: 'spider', w: Math.min(1.0, (wave - 14) * .07) });
    if (wave >= 18) pool.push({ t: 'cryomancer', w: Math.min(.9, (wave - 17) * .06) });
    if (wave >= 22) pool.push({ t: 'devourer', w: Math.min(.7, (wave - 21) * .05) });
    if (wave >= 26) pool.push({ t: 'titanMini', w: Math.min(.5, (wave - 25) * .04) });
    return pool;
  },
  /* the armoured robot mini-boss is a rare special, from wave 8 onward */
  isMiniBossWave(wave) {
    const every = (this.modState && this.modState.miniEvery) || 3;
    return wave >= 8 && (wave - 8) % every === 0;
  },
  /* Пул мини-боссов растёт с волной: слабые попадаются раньше, сильные — позже.
     Робот остаётся в пуле как «бронированный стрелок». */
  pickMiniBoss(wave) {
    const pool = [
      { t: 'robot', w: 8 },
      { t: 'stalker', w: 7 },
      { t: 'spider', w: wave >= 11 ? 6 : 0 },
      { t: 'cryomancer', w: wave >= 14 ? 5 : 0 },
      { t: 'devourer', w: wave >= 17 ? 4 : 0 },
      { t: 'titanMini', w: wave >= 20 ? 3 : 0 }
    ];
    let total = 0; pool.forEach(p => total += p.w);
    let r = Math.random() * total;
    for (const p of pool) { r -= p.w; if (r <= 0) return p.t; }
    return 'robot';
  },
  pickZombieType(wave) {
    const pool = this.waveTypesFor(wave);
    // редкие мини-боссы попадаются прямо в волне (и помечаются как мини-боссы)
    const mb = this.miniBossWaveTypes ? this.miniBossWaveTypes(wave) : [];
    for (const p of mb) pool.push(p);
    let total = 0; pool.forEach(p => total += p.w);
    let r = Math.random() * total;
    for (const p of pool) { r -= p.w; if (r <= 0) return p.t; }
    return 'walker';
  },

  /* ============================================================
     AMMO CRATES (offline)
     Every `CFG.crateInterval` seconds a supply crate drops somewhere on the
     walkable map. Walking into it tops up part of every weapon's ammo. The
     crate has NO collision (it is only a mesh), so it never blocks movement.
     ============================================================ */
  updateCrates(dt) {
    const p = this.player;
    if (!p) return;

    // countdown to the next drop
    this._crateT -= dt;
    if (this._crateT <= 0) {
      this._crateT = CFG.crateInterval;
      // never flood the map: at most CFG.crateMax crates live at once
      if (this.crates.length < CFG.crateMax) this.spawnCrate();
    }

    // collect / retire crates
    for (let i = this.crates.length - 1; i >= 0; i--) {
      const c = this.crates[i];
      c.t += dt;
      c.life -= dt;
      // gentle bob + spin so it is easy to spot
      c.mesh.rotation.y += dt * 1.1;
      c.mesh.position.y = c.y + .18 + Math.sin(c.t * 2.2) * .06;
      const d = Math.hypot(p.pos.x - c.x, p.pos.z - c.z);
      if (d <= CFG.cratePickupDist) {
        this.collectCrate(c, i);
      } else if (c.life <= 0) {
        this.removeCrate(i);
      }
    }

    /* ---- field medkits: the same drop, but rarer, capped and healing ---- */
    this._medboxT -= dt;
    if (this._medboxT <= 0) {
      this._medboxT = CFG.medkitFieldInterval;
      if (this.medboxes.length < CFG.medkitFieldMax) this.spawnMedbox();
    }
    for (let i = this.medboxes.length - 1; i >= 0; i--) {
      const m = this.medboxes[i];
      m.t += dt; m.life -= dt;
      m.mesh.rotation.y += dt * 1.0;
      m.mesh.position.y = m.y + .20 + Math.sin(m.t * 2.0) * .07;
      const d = Math.hypot(p.pos.x - m.x, p.pos.z - m.z);
      if (d <= CFG.cratePickupDist) this.collectMedbox(m, i);
      else if (m.life <= 0) this.removeMedbox(i);
    }
  },

  /* a walkable, free spot on the map (shared by crates and medkits) */
  findDropSpot() {
    const nav = MAP.nav;
    const p = this.player;
    for (let tries = 0; tries < 24; tries++) {
      const x = U.rand(-MAP.size / 2 + 6, MAP.size / 2 - 6);
      const z = U.rand(-MAP.size / 2 + 6, MAP.size / 2 - 6);
      if (nav && nav.ok) {
        const cell = nav.nearest(x, z);
        if (cell < 0 || !nav.ok(cell)) continue;      // must be walkable
      }
      const gy = this.world.groundAt(x, z, 3);
      if (gy === null) continue;
      if (this.world.overlaps(x, gy + .3, z, .8, 1.2)) continue;   // not inside geometry
      if (p && Math.hypot(p.pos.x - x, p.pos.z - z) < 6) continue; // not on the player
      return { x, y: gy, z };
    }
    return null;
  },

  /* field medkit: restores half the player's max health on pickup */
  spawnMedbox() {
    if (this.medboxes.length >= CFG.medkitFieldMax) return;
    const spot = this.findDropSpot();
    if (!spot) return;
    const mesh = buildMedBox();
    mesh.position.set(spot.x, spot.y + .20, spot.z);
    this.scene.add(mesh);
    this.medboxes.push({ mesh: mesh, x: spot.x, y: spot.y, z: spot.z, t: 0, life: CFG.medkitFieldLife });
    Audio3D_SFX.crateDrop(spot.x, spot.y, spot.z);
    UI.toast('Аптечка на карте (+50% HP)', '#57ff7a');
  },

  collectMedbox(m, i) {
    const p = this.player;
    const maxHP = this.matchHP || p.maxHealth || CFG.maxHP;
    const heal = Math.max(1, Math.round(maxHP * CFG.medkitHealFrac));
    p.health = Math.min(maxHP, p.health + heal);
    UI.center('АПТЕЧКА +50%', '+' + heal + ' HP', 1.6);
    UI.toast('Подобрана аптечка: +' + heal + ' HP', '#57d16a');
    UI.feed('<span class="z">✚ Аптечка +50% HP</span>');
    Audio3D_SFX.pickup();
    this.removeMedbox(i);
    if (this.mode === CS.MODE.ONLINE) this.broadcastScore();
  },

  removeMedbox(i) {
    const m = this.medboxes[i];
    if (m && m.mesh.parent) m.mesh.parent.remove(m.mesh);
    if (m && m.mesh.traverse) m.mesh.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    this.medboxes.splice(i, 1);
  },

  clearMedboxes() {
    if (!this.medboxes) return;
    for (const m of this.medboxes) { if (m.mesh.parent) m.mesh.parent.remove(m.mesh); }
    this.medboxes.length = 0;
  },

  /* pick a walkable spot away from walls and drop a crate there */
  spawnCrate() {
    if (this.crates.length >= CFG.crateMax) return;      // hard cap, belt and braces
    const spot = this.findDropSpot();
    if (!spot) return;                                   // no free spot this tick
    const mesh = buildAmmoCrate();
    mesh.position.set(spot.x, spot.y + .18, spot.z);
    this.scene.add(mesh);
    this.crates.push({ mesh: mesh, x: spot.x, y: spot.y, z: spot.z, t: 0, life: CFG.crateLife });
    Audio3D_SFX.crateDrop(spot.x, spot.y, spot.z);
    UI.toast('Сундук с патронами на карте', '#ffd24a');
  },

  collectCrate(c, i) {
    // restore ~25% of each owned weapon's capacity to BOTH its reserve and its
    // magazine. The old code topped the magazine by a flat +8 rounds, which for
    // a machine gun (magazine 150–2000) was barely a few bullets — now the
    // top-up scales with the magazine, so a crate really is +25%.
    const frac = CFG.crateAmmoFrac;
    const p = this.player;
    let gave = false;
    for (const s of [1, 2, 3]) {
      const w = p.inv[s];
      if (!w || w.id === 'knife') continue;
      const def = WEAPONS[w.id];
      if (!def || def.mag === Infinity) continue;
      const capReserve = def.reserve || def.mag;         // a reserve-less gun uses its magazine as the cap
      const addReserve = Math.max(1, Math.round(capReserve * frac));
      const addMag = Math.max(3, Math.round(def.mag * frac));
      const beforeR = w.reserve, beforeM = w.mag;
      w.reserve = Math.min(capReserve, (w.reserve || 0) + addReserve);
      w.mag = Math.min(def.mag, (w.mag || 0) + addMag);
      if (w.reserve !== beforeR || w.mag !== beforeM) gave = true;
    }
    UI.center('ПАТРОНЫ +25%', '+запас и магазин ко всем стволам', 1.6);
    UI.toast('Сундук собран: патроны пополнены', '#57d16a');
    UI.feed('<span class="z">▣ Сундук · патроны +25%</span>');
    Audio3D_SFX.pickup();
    this.removeCrate(i);
    return gave;
  },

  removeCrate(i) {
    const c = this.crates[i];
    if (c && c.mesh.parent) c.mesh.parent.remove(c.mesh);
    if (c && c.mesh.traverse) c.mesh.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    this.crates.splice(i, 1);
  },

  clearCrates() {
    if (!this.crates) return;
    for (const c of this.crates) { if (c.mesh.parent) c.mesh.parent.remove(c.mesh); }
    this.crates.length = 0;
  },

  /* ============================================================
     COOP WAVES (online PvE)
     Both players run an identical local horde: the HOST owns the wave counter
     and broadcasts it, so the waves stay in step. Zombies are simulated on each
     side (as in single-player); the wave number is what is synchronised.
     ============================================================ */
  coopStartWave(wave) {
    const o = this.offline;
    if (!o) return;
    o.wave = wave;
    o.bosses = 0; o.bossPending = 0; o.miniBossPending = 0;
    if (this.mode === CS.MODE.OFFLINE) this.rotateMapIfNeeded(wave);
    let count = Math.round(CFG.zombieStartCount + (wave - 1) * 2.4);
    const countMul = this.hordeMode ? CFG.hordeCountMul : 1;
    count = Math.round(count * countMul * (this.modState ? this.modState.count : 1));
    const bossType = this.isBossRush ? this.bossRushList()[(wave - 1) % this.bossRushList().length] : this.bossForWave(wave);
    if (this.isBossRush) {
      o.bossType = bossType; o.bossPending = 1; count = 0;
      UI.center(ZOMBIES[bossType].name, 'БОСС-РАШ · ЭТАП ' + wave, 2.4);
    } else if (bossType) {
      o.bossType = bossType;
      o.bossPending = this.hordeMode ? 3 : 1;
      count = Math.round(count * .4);
      UI.center(ZOMBIES[bossType].name, 'БОСС · ВОЛНА ' + wave, 2.4);
    } else {
      o.bossType = null;
      UI.center('ВОЛНА ' + wave, count + ' зомби', 1.6);
    }
    o.totalThisWave = count; o.spawnedThisWave = 0; o.toSpawn = count;
    o.betweenWaves = false; o.waveStart = U.now();
    this._reloadsAtWaveStart = (this.player && this.player.reloads) || 0;
    this._shotsAtWaveStart = (this.player && (this.player.bulletsFired | 0)) || 0;
    Bus.emit('waveStart', wave);
  },

  updateCoop(dt) {
    const o = this.offline;
    if (!o || o.campaignWon) return;
    /* КЛИЕНТ только принимает снапшоты зомби от хоста — сам не спавнит и не
       симулирует волну (иначе у каждого были бы свои зомби). */
    if (Net.role === CS.NETROLE.HOST) {
      if (o.betweenWaves) {
        o.breakT -= dt;
        if (o.breakT <= 0) {
          o.betweenWaves = false;
          this.coopStartWave(o.wave + 1);
          Net.send({ t: 'coopWave', w: o.wave });
        }
        return;
      }
      // spawn queue (same tuning as single-player)
      if (o.toSpawn > 0) {
        o.spawnAcc = (o.spawnAcc || 0) + dt;
        const big = this.hordeMode;
        const waveSpd = big ? CFG.hordeSpawnInterval : CFG.zombieSpawnInterval;
        const interval = Math.max(.10, (waveSpd - o.wave * (big ? .006 : .045)));
        const maxAlive = big ? CFG.hordeMaxAlive : CFG.zombieMaxAlive;
        let guard = 0, burst = big ? 8 : 6;
        while (o.spawnAcc >= interval && o.toSpawn > 0 && guard++ < burst) {
          o.spawnAcc -= interval;
          if (this.horde.activeCount >= maxAlive) break;
          const t = this.pickZombieType(o.wave);
          const scale = 1 + (o.wave - 1) * .085;
          const z = this.horde.spawnRandom(t, this.player.pos.x, this.player.pos.z, 26);
          const hpMul = (this.hordeMode) ? CFG.hordeHpMul : 1;
          z.maxHealth *= scale * hpMul; z.health = z.maxHealth;
          z.dmg *= 1 + (o.wave - 1) * .05;
          o.toSpawn--; o.spawnedThisWave++;
        }
      } else if (o.bossPending > 0) {
        o.bossAcc = (o.bossAcc || 0) + dt;
        if (o.bossAcc >= (this.hordeMode ? .5 : .9)) {
          o.bossAcc = 0;
          const b = this.spawnBoss(o.bossType);
          if (this.isBossRush && b) b.maxHealth *= (1 + (o.wave - 1) * .35);
          o.bossPending--;
        }
      } else if (this.horde.aliveCount === 0 && o.spawnedThisWave >= o.totalThisWave && !this.isBossRush) {
        // wave cleared
        const bonus = 400 + o.wave * 120;
        this.player.money += bonus;
        this.player.score += Math.round(250 + o.wave * 40);
        o.betweenWaves = true; o.breakT = 7;
        this.player.health = Math.min(this.matchHP || 100, this.player.health + 22);
        if (typeof restoreMap === 'function') restoreMap();
        Audio3D_SFX.roundEnd(true);
        UI.center('ВОЛНА ' + o.wave + ' ЗАЧИЩЕНА', 'Бонус $' + bonus + ' · Передышка 7с', 3.0);
        Bus.emit('waveCleared', o.wave);
        this.coopSave();
      }
    }
    /* ХОСТ — авторитет по зомби: рассылает их состояние клиенту, чтобы оба
       видели ОДНИХ И ТЕХ ЖЕ зомби (а не каждый своих). */
    if (Net.role === CS.NETROLE.HOST) {
      this._zSnapT = (this._zSnapT || 0) - dt;
      if (this._zSnapT <= 0) { this._zSnapT = 1 / CFG.netTickHz; this.broadcastZombies(); }
    }
  },

  /* онлайн-кооп сохраняет прогресс в тот же слот, что и оффлайн-режим */
  coopSave() {
    try { this.saveCheckpoint(this.offline ? (this.offline.wave || 1) : 1); } catch (e) { }
  },

  /* host → client: compact snapshot of the shared horde */
  broadcastZombies() {
    if (!this.horde) return;
    const list = [];
    for (const z of this.horde.list) {
      if (z.isTarget) continue;
      list.push({
        i: z.id, t: z.type,
        x: +z.pos.x.toFixed(2), y: +z.pos.y.toFixed(2), z: +z.pos.z.toFixed(2),
        yw: +z.yaw.toFixed(2), h: Math.round(z.health), m: Math.round(z.maxHealth),
        a: z.alive && !z.dying ? 1 : 0, s: +(z.scale || 1).toFixed(2)
      });
    }
    Net.send({ t: 'zstate', w: this.offline ? this.offline.wave : 0, list: list });
  },

  /* client: apply the host's horde snapshot (create/update/remove remote zombies) */
  onZombieState(m) {
    if (this.mode !== CS.MODE.ONLINE || !this.isCoop || Net.role === CS.NETROLE.HOST) return;
    if (!this.horde) return;
    const seen = {};
    const list = m.list || [];
    const now = U.now();
    for (const s of list) {
      seen[s.i] = true;
      let z = this.horde.list.find(o => o.remoteId === s.i);
      if (!z) {
        /* клиент показывает точную копию зомби хоста (без своей симуляции) */
        z = this.horde.spawn(s.t, s.x, s.z, s.y);
        z.remoteId = s.i;
        z.remoteDriven = true;
        z._netFrom = { x: s.x, y: s.y, z: s.z, yw: s.yw || 0 };
        z._netTo = { x: s.x, y: s.y, z: s.z, yw: s.yw || 0 };
        z._netT = now;
      }
      /* ПЛАВНАЯ ИНТЕРПОЛЯЦИЯ: from = ПОСЛЕДНЯЯ СЕТЕВАЯ позиция (не текущая
         интерполированная!), to = новая. Иначе зомби «еле двигаются». */
      z._netFrom = z._netTo
        ? { x: z._netTo.x, y: z._netTo.y, z: z._netTo.z, yw: z._netTo.yw }
        : { x: s.x, y: s.y, z: s.z, yw: s.yw || 0 };
      z._netTo = { x: s.x, y: s.y, z: s.z, yw: s.yw || 0 };
      z._netT = now;
      /* health/maxHealth НЕ затираем напрямую: у клиента свои попадания уже
         уменьшили здоровье, а хост — авторитет. Берём минимум из двух, чтобы
         попадание клиента не «откатывалось» снапшотом. */
      if (s.m) z.maxHealth = s.m;
      z.health = (z.health > 0 && s.h > 0) ? Math.min(z.health, s.h) : s.h;
      z.scale = s.s || z.scale || 1;
      z.group.scale.setScalar(z.scale);
      if (!s.a && z.alive) { z.alive = false; z.dying = true; z.deadT = 0; }
    }
    // remove zombies the host no longer has
    for (let i = this.horde.list.length - 1; i >= 0; i--) {
      const z = this.horde.list[i];
      if (z.remoteDriven && !seen[z.remoteId]) { z.dispose(this.scene); this.horde.list.splice(i, 1); }
    }
  },

  /* клиент: плавно подтягивает удалённых зомби к последнему снапшоту */
  interpRemoteZombies(dt) {
    if (!this.horde) return;
    const now = U.now();
    const period = 1000 / (CFG.netTickHz || 22);          // интервал снапшотов (~45мс)
    for (const z of this.horde.list) {
      if (!z.remoteDriven || !z._netTo || !z._netFrom) continue;
      /* догоняем ровно за интервал снапшота: from → to плавно */
      const lag = U.clamp((now - z._netT) / period, 0, 1);
      const k = lag * lag * (3 - 2 * lag);                 // smoothstep
      const prevX = z.pos.x, prevZ = z.pos.z;
      z.pos.x = U.lerp(z._netFrom.x, z._netTo.x, k);
      z.pos.y = U.lerp(z._netFrom.y, z._netTo.y, k);
      z.pos.z = U.lerp(z._netFrom.z, z._netTo.z, k);
      z.yaw = U.angleLerp(z._netFrom.yw, z._netTo.yw, k);
      z.group.position.set(z.pos.x, z.pos.y, z.pos.z);
      z.group.rotation.y = z.yaw;
      z._netMoved = Math.hypot(z.pos.x - prevX, z.pos.z - prevZ) / Math.max(dt, .001);
    }
  },

  updateOffline(dt) {
    const o = this.offline;
    if (!o) return;
    if (o.campaignWon) return;              // the run is over until the player restarts
    if (o.betweenWaves) {
      o.breakT -= dt;
      if (o.breakT <= 0) {
        this.beginBuyPhase(22, 'ВОЛНА ' + (o.wave + 1));
        o.betweenWaves = false;
      }
      return;
    }
    if (this.roundState !== 'live') return;

    // bosses queue in front of the regular horde
    if (o.bossPending > 0) {
      o.bossAcc = (o.bossAcc || 0) + dt;
      if (o.bossAcc >= (this.hordeMode ? .5 : .9)) {
        o.bossAcc = 0;
        this.spawnBoss(o.bossType);
        o.bossPending--;
        Audio3D_SFX.growl(this.player.pos.x, this.player.pos.y, this.player.pos.z, 'brute');
      }
      return;
    }

    // the armoured mini-boss leads the wave in, right before the horde
    if (o.miniBossPending > 0 && o.spawnedThisWave === 0) {
      o.miniBossPending = 0;
      const mbType = o.miniBossType || this.pickMiniBoss(o.wave);
      const s = this.horde.spawnRandom(mbType, this.player.pos.x, this.player.pos.z, 30);
      const hpMul = (this.offHpMul != null) ? this.offHpMul
        : ((this.hordeMode && !this.freePlay) ? CFG.hordeHpMul : 1);
      s.maxHealth *= hpMul * this.modState.hp; s.health = s.maxHealth;
      s.dmg *= (1 + (o.wave - 1) * .05) * this.modState.dmg;
      s.speed *= this.modState.speed;
      s.dmgTakenMul = this.modState.playerDmg;
      s.isMiniBoss = true;
      Audio3D_SFX.growl(s.pos.x, s.pos.y, s.pos.z, 'brute');
      UI.toast(ZOMBIES[mbType].name + ' в бою', '#4ad6ff');
      this.refreshMusic();
    }

    // spawn queue
    if (o.toSpawn > 0) {
      o.spawnAcc = (o.spawnAcc || 0) + dt;
      // custom multipliers may be huge, so spawn faster / allow more alive
      const big = (this.offCountMul || 1) > 3 || this.hordeMode;
      const waveSpd = big ? CFG.hordeSpawnInterval : CFG.zombieSpawnInterval;
      const interval = Math.max(.10, (waveSpd - o.wave * (big ? .006 : .045)) * ((this.modState && this.modState.spawn) || 1));
      const maxAlive = big ? CFG.hordeMaxAlive : CFG.zombieMaxAlive;
      let guard = 0;
      const burst = big ? 8 : 6;
      while (o.spawnAcc >= interval && o.toSpawn > 0 && guard++ < burst) {
        o.spawnAcc -= interval;
        // count dying bodies too: they still cost CPU and occupy space
        if (this.horde.activeCount >= maxAlive) break;
        const t = this.pickZombieType(o.wave);
        const scale = 1 + (o.wave - 1) * .085;
        const z = this.horde.spawnRandom(t, this.player.pos.x, this.player.pos.z, 26);
        /* HP multiplier: custom mode uses its own setting; ОРДА ×10 keeps the
           weakened zombies; БЕСПЛАТНАЯ ОРДА uses normal full-strength health. */
        const hpMul = (this.offHpMul != null) ? this.offHpMul
          : ((this.hordeMode && !this.freePlay) ? CFG.hordeHpMul : 1);
        z.maxHealth *= scale * hpMul * this.modState.hp;
        z.health = z.maxHealth;
        z.dmg *= (1 + (o.wave - 1) * .05) * this.modState.dmg;
        z.speed *= this.modState.speed;
        z.dmgTakenMul = this.modState.playerDmg;
        if (this.modState.armor) z.armor = Math.min(.7, (z.armor || 0) + this.modState.armor);
        o.toSpawn--; o.spawnedThisWave++;
      }
    } else if ((this.horde.aliveCount === 0 && this.offline.spawnedThisWave >= this.offline.totalThisWave)) {
      // wave cleared — the spawn queue is empty and nothing is left alive
      // (dying corpses are not re-captured here; they simply fade out)
      const bonus = Math.round((400 + o.wave * 120) * ((this.modState && this.modState.playerDmg) || 1));
      this.player.money += bonus;
      this.player.score += Math.round((250 + o.wave * 40) * ((this.modState && this.modState.playerDmg) || 1));
      o.betweenWaves = true;
      o.breakT = 7;
      /* run-level wave streaks for the achievement set:
         perfectWaves = cleared without dying yet, noDamageWaves = cleared unhurt */
      if (this._runDeaths === 0) this._perfectWaves = (this._perfectWaves || 0) + 1;
      if (!this._waveHurt) this._noDamageWaves = (this._noDamageWaves || 0) + 1;
      /* волны без перезарядки / без единого выстрела */
      const reloadsNow = (this.player && this.player.reloads) || 0;
      const shotsNow = (this.player && (this.player.bulletsFired | 0)) || 0;
      if (reloadsNow === (this._reloadsAtWaveStart || 0)) this._wavesNoReload = (this._wavesNoReload || 0) + 1;
      else this._wavesNoReload = 0;
      if (shotsNow === (this._shotsAtWaveStart || 0)) this._wavesNoShots = (this._wavesNoShots || 0) + 1;
      else this._wavesNoShots = 0;
      this._waveKills = 0; this._waveHurt = false;
      /* КАРТА ВОССТАНАВЛИВАЕТСЯ после завершения волны */
      if (typeof restoreMap === 'function') restoreMap();
      Audio3D_SFX.roundEnd(true);
      /* clearing wave 100 means the campaign is finished */
      if (o.wave >= 100) {
        this.onCampaignComplete();
      } else {
        UI.center('ВОЛНА ' + o.wave + ' ЗАЧИЩЕНА', 'Бонус $' + bonus + ' · Передышка 7с', 3.0);
      }
      Bus.emit('waveCleared', o.wave);
      const recScore = Math.max(Store.data.best, this.player.score);
      const recWave = Math.max(Store.data.bestWave, o.wave);
      Store.data.best = recScore;
      Store.data.bestWave = recWave;
      Store.data.killsTotal += 0;
      Store.save();
      // partial heal, capped at the MATCH's health (100/125/150/200…) — using
      // CFG.maxHP (always 100) here silently dropped the player to 100 HP after
      // every wave whenever a higher health setting was chosen.
      const healCap = this.matchHP || this.player.maxHealth || CFG.maxHP;
      this.player.health = Math.min(healCap, this.player.health + 22);
    }
  },

  /* The final boss is down: award a completion point (shown in the main menu)
     and stop the run. */
  onCampaignComplete() {    if (this._campaignDone) return;
    this._campaignDone = true;
    Store.data.clears = (Store.data.clears || 0) + 1;
    /* ПОЛНОЕ ПРОХОЖДЕНИЕ ХАРДКОРА — отдельная веха на 100 волне */
    if (this.isHardcore) {
      Store.data.hardcoreFull = 1;
      UI.center('ХАРДКОР ПРОЙДЕН!', '100 волн без единой смерти', 5.0);
      UI.toast('ХАРДКОР ПРОЙДЕН ПОЛНОСТЬЮ — достижение «НЕВОЗМОЖНОЕ»', '#c24bff');
    }
    Store.save();
    this.player.score += 50000;
    /* сколько занял ЭТОТ забег? меньше 1 ч 30 мин — быстрому прохождению счёт */
    const runSec = this.offline ? (U.now() - this.offline.startTime) / 1000 : 0;
    if (runSec > 0 && runSec < 5400) {
      this._fastClears = (this._fastClears || 0) + 1;
      UI.feed('<span class="z">⚡ Быстрое прохождение: ' + U.time(runSec) + '</span>');
    }
    this.recordRun();
    this.checkAchievements();
    // stop the wave flow: no break timer, no wave 101
    const o = this.offline;
    if (o) { o.campaignWon = true; o.betweenWaves = false; o.toSpawn = 0; }
    UI.center('ИГРА ПРОЙДЕНА!', 'Пройдено раз: ' + Store.data.clears, 3.0);
    UI.toast('ПОБЕДА! Очков прохождения: ' + Store.data.clears, '#c24bff');
    Audio3D_SFX.roundEnd(true);
    UI.renderMenuStats();
    this.showCredits();
    this.roundState = 'end';
    this.roundT = 0;
    this.offlineDead = true;      // reuse the restart/victory screen
    this.offlineDeadT = 0;
    this._campaignWon = true;
  },

  /* Roll the credits: a scrollable panel with the cast, stats, and a hint to
     close. Shown the moment the final boss dies. */
  showCredits() {
    const cr = UI.el.credits;
    if (!cr) return;
    if (UI.el.crPlayer) UI.el.crPlayer.textContent = (Store.data.name || 'Игрок').slice(0, 14);
    if (UI.el.crStats) {
      const p = this.player;
      UI.el.crStats.innerHTML =
        'ПРОХОЖДЕНИЙ: <b>' + (Store.data.clears || 0) + '</b><br>' +
        'СЧЁТ ЗА ЗАБЕГ: <b>' + Math.round(p.score) + '</b><br>' +
        'ЗОМБИ УБИТО: <b>' + p.zombieKills + '</b><br>' +
        'РЕЖИМ: <b>' + (this.hordeMode ? 'ОРДА ×10' : 'ОБЫЧНЫЙ') + '</b>';
    }
    this._creditsOpen = true;
    // stop the pointer lock so the scroll and the close button work
    if (!IS_TOUCH) Input.releaseLock();
    Input.enabled = false;
    UI.show('credits');
    const sc = cr.querySelector('.credits-scroll');
    if (sc) sc.scrollTop = 0;
    Audio3D_SFX.ambientStart();
  },

  closeCredits() {
    if (!this._creditsOpen) return;
    this._creditsOpen = false;
    UI.show('hud');
    Input.enabled = true;
    if (!IS_TOUCH) setTimeout(() => { if (this.running) Input.requestLock(); }, 80);
    this.restartOfflineOffer();
  },

  /* ============================================================
     COMBAT
     ============================================================ */
  /* Player eye position in world space (the camera's actual origin). */
  eyePos() {
    const p = this.player;
    const mech = this.isMechActive();
    const eye = mech ? CFG.mechEyeHeight : (p.crouching ? CFG.eyeHeightCrouch : CFG.eyeHeight);
    return {
      x: p.pos.x,
      y: p.pos.y + eye,
      z: p.pos.z
    };
  },

  /* Aim direction. Must include recoil/view-punch so that bullets always leave
     along the crosshair the player actually sees (cameraUpdate uses the same
     offsets). Otherwise shots drift off-target whenever recoil is active. */
  /* Weak aim assist for touch: nudges the view toward a target very close to
     the crosshair. Returns a look-delta to subtract (kept small so it assists
     rather than aims for the player). */
  touchAssist() {
    if (!IS_TOUCH) return { x: 0, y: 0 };
    if (Store.data.aimAssist === 0) return { x: 0, y: 0 };
    const p = this.player;
    if (!p || !p.alive) return { x: 0, y: 0 };
    const eye = this.eyePos();
    const o = { x: eye.x, y: eye.y, z: eye.z };
    const dir = this.cameraDir();
    const T = 60;
    let hit = null;
    /* В КООПЕ цель — ЗОМБИ, а не второй игрок: раньше автоприцел и наведение
       в онлайне целились только по игроку, поэтому телефон стрелял в напарника
       вместо зомби. */
    if (this.mode === CS.MODE.OFFLINE || (this.mode === CS.MODE.ONLINE && this.isCoop)) {
      if (this.horde) hit = this.horde.raycast(o, dir, T);
    } else if (this.mode === CS.MODE.ONLINE) {
      hit = this.rayRemoteAny(o, dir, T);
    }
    let tp = null;
    if (hit && hit.point) tp = hit.point;
    else if (hit) tp = { x: o.x + dir.x * hit.t, y: o.y + dir.y * hit.t, z: o.z + dir.z * hit.t };
    if (!tp) return { x: 0, y: 0 };
    const dx = tp.x - o.x, dy = tp.y - o.y, dz = tp.z - o.z;
    const dist = Math.hypot(dx, dy, dz) || 1;
    const wantYaw = Math.atan2(-dx, -dz);
    const wantPitch = Math.atan2(dy, Math.hypot(dx, dz));
    let dYaw = ((wantYaw - p.yaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    let dPitch = wantPitch - p.pitch;
    // only assist when already pointing close to the target
    const lim = (this.mode === CS.MODE.ONLINE) ? 0.14 : 0.10;
    if (Math.abs(dYaw) > lim || Math.abs(dPitch) > lim) return { x: 0, y: 0 };
    return { x: dYaw * 0.16, y: dPitch * 0.16 };
  },

  /* the mech's arm muzzle in world space. Arms sit at ±1.28 local X, ~2.55 high,
     barrels reaching forward (-Z). 'right' = minigun, 'left' = laser pod. */
  mechMuzzleWorldPos(side, out) {
    const p = this.player;
    const eye = this.eyePos();
    const yaw = p.yaw + p.recoilYaw + p.viewPunchY;
    const pitch = p.pitch + p.recoil + p.viewPunchP;
    const e = new THREE.Euler(pitch, yaw, 0, 'YXZ');
    const fwd = _v1.set(0, 0, -1).applyEuler(e);
    const right = _v2.set(1, 0, 0).applyEuler(e);
    const up = new THREE.Vector3(0, 1, 0).applyEuler(e);
    const sx = side === 'left' ? -1.25 : 1.25;      // arm offset to the side
    const sy = -CFG.mechEyeHeight + 2.80 + .05;     // arms sit below the cockpit eye
    const fz = side === 'left' ? 1.25 : 1.45;       // barrel reach forward to the muzzle
    const v = out || new THREE.Vector3();
    v.set(
      eye.x + right.x * sx + up.x * sy + fwd.x * fz,
      eye.y + right.y * sx + up.y * sy + fwd.y * fz,
      eye.z + right.z * sx + up.z * sy + fwd.z * fz
    );
    return v;
  },

  cameraDir() {
    const p = this.player;
    const e = new THREE.Euler(
      p.pitch + p.recoil + p.viewPunchP,
      p.yaw + p.recoilYaw + p.viewPunchY,
      0, 'YXZ'
    );
    const d = _v3.set(0, 0, -1).applyEuler(e);
    return { x: d.x, y: d.y, z: d.z };
  },

  /* World-space muzzle position.
     The gun model lives in its own scene (so it never clips into walls), which
     means its matrixWorld is not map space. Rebuild the muzzle position from
     the camera basis: eye + forward*barrelLength + right/up gun offsets. */
  muzzleWorldPos(out) {
    const p = this.player;
    // in the mech the shots come from the CHASSIS arms, not the hidden view model
    if (this.isMechActive()) return this.mechMuzzleWorldPos('right', out);
    const eye = this.eyePos();
    const yaw = p.yaw + p.recoilYaw + p.viewPunchY;
    const pitch = p.pitch + p.recoil + p.viewPunchP;
    const e = new THREE.Euler(pitch, yaw, 0, 'YXZ');
    const fwd = _v1.set(0, 0, -1).applyEuler(e);
    const right = _v2.set(1, 0, 0).applyEuler(e);
    const up = new THREE.Vector3(0, 1, 0).applyEuler(e);
    const vm = p.vmGroup;
    const off = vm ? vm.position : { x: .2, y: -.2, z: -.46 };
    const muzzleZ = (p.vmInner && p.vmInner.userData.muzzleZ !== undefined) ? p.vmInner.userData.muzzleZ : -0.6;
    const forwardDist = U.clamp(Math.abs(off.z + muzzleZ), 0.45, 1.15);
    const v = out || new THREE.Vector3();
    v.set(
      eye.x + fwd.x * forwardDist + right.x * off.x + up.x * off.y,
      eye.y + fwd.y * forwardDist + right.y * off.x + up.y * off.y,
      eye.z + fwd.z * forwardDist + right.z * off.x + up.z * off.y
    );
    return v;
  },

  /* ============================================================
     LASER CANNON: a held, continuous piercing beam
     Every frame the trigger is held the beam re-traces from the muzzle to the
     first wall and burns every enemy along the way (damage per second, not per
     shot). It is drawn by a single persistent mesh in Effects.
     ============================================================ */
  /* ============================================================
     TESLA CANNON: a HELD lightning machine-gun
     While the trigger is down a constant electric arc crackles from the muzzle,
     hits the nearest target and forks to others in a chain — damage per second,
     not per shot. It drinks from the magazine, so it eventually runs dry.
     ============================================================ */
  /* ============================================================
     FLAMETHROWER: a held cone of fire
     Every frame the trigger is down, everything within the cone in front is set
     alight (damage per second), and the flame visual streams from the muzzle.
     ============================================================ */
  updateFlamer(dt) {
    const p = this.player;
    const def = p.def;
    const origin = this.eyePos();
    const dir = this.cameraDir();
    const muzzle = this.muzzleWorldPos();
    const range = def.flameRange || 13;
    const cone = def.flameCone || .42;
    const extraR = def.flameRadius || 0;
    const dps = (def.flameDps || def.dmg) * dt;
    const cosCone = Math.cos(cone);
    if (this.horde) {
      for (const z of this.horde.list) {
        if (!z.alive || z.dying) continue;
        // distance + angle test (a wide cone, not a ray)
        const dx = z.pos.x - origin.x, dy = (z.pos.y + 1 * z.scale) - origin.y, dz = z.pos.z - origin.z;
        const d = Math.hypot(dx, dy, dz);
        const reach = range + z.radius + extraR;
        if (d > reach) continue;
        const nd = Math.max(d, .001);
        const dot = (dx / nd) * dir.x + (dy / nd) * dir.y + (dz / nd) * dir.z;
        // near the muzzle everything within reach is caught even at a steep angle,
        // so zombies right in front are always lit — and the close zone is wide
        if (d > 4.0 && dot < cosCone) continue;
        z.takeDamage(dps, 'body', dir);
        p.damageDealt += dps;
        if (z.alive && !z.dying && def.burnT) { z.burnT = Math.max(z.burnT || 0, def.burnT); z.burnDps = def.burnDps || 100; }
      }
    }
    /* ---- opponents in an online duel ---- */
    if (this.mode === CS.MODE.ONLINE && this.remotePlayers.length) {
      const pvpDps = (def.flamePvpDps || def.dmg) * dt;
      for (const rp of this.remotePlayers) {
        if (!rp.alive) continue;
        const dx = rp.pos.x - origin.x, dy = (rp.pos.y + 1 * (rp.mech ? 2 : 1)) - origin.y, dz = rp.pos.z - origin.z;
        const d = Math.hypot(dx, dy, dz);
        const reach = range + 1.0 + extraR;
        if (d > reach) continue;
        const nd = Math.max(d, .001);
        const dot = (dx / nd) * dir.x + (dy / nd) * dir.y + (dz / nd) * dir.z;
        if (d > 4.0 && dot < cosCone) continue;
        this.sendPvpHit(pvpDps, 'body', false, rp, 'flame');
      }
    }
    // wall: stop the flame visual a bit short of a wall
    const wall = this.world.raycast(origin, dir, range, ['ground']);
    const span = wall ? Math.min(range, wall.t) : range;
    this.effects.holdFlame(muzzle, dir, span, U.now() / 1000);
    Audio3D_SFX && Audio3D_SFX.flame && Audio3D_SFX.flame(muzzle.x, muzzle.y, muzzle.z);
    p.bulletsFired += dt * 30;
    // the tank drains
    const w = p.weapon;
    if (w.mag !== Infinity) {
      w.mag -= (def.rpm / 60) * dt;             // rpm=60 → 1 unit per second
      if (w.mag <= 0) { w.mag = 0; this.effects.endFlame(); if (def.mag !== Infinity) p.reload(); }
    }
    UI.hitmark(false); this._hitmarkT = U.now();
  },

  /* burning zombies keep taking fire damage after they leave the cone */
  updateBurning(dt) {
    if (!this.horde) return;
    for (const z of this.horde.list) {
      if (!z.alive || z.dying || !z.burnT || z.burnT <= 0) continue;
      z.burnT -= dt;
      const dealt = (z.burnDps || 100) * dt;
      z.takeDamage(dealt, 'body', { x: 0, y: 0, z: 0 });
      this.player.damageDealt += dealt;
      if (Math.random() < .25) {
        this.effects.particle(z.pos.x, z.pos.y + 1, z.pos.z, U.rand(-1, 1), U.rand(1.5, 3), U.rand(-1, 1), U.rand(.06, .14), 'spark', U.rand(.2, .5));
      }
    }
  },

  updateTeslaBeam(dt) {
    const p = this.player;
    const def = p.def;
    const origin = this.eyePos();
    const dir = this.cameraDir();
    const muzzle = this.muzzleWorldPos();
    const range = def.range || 80;

    // pick the first target along the reticle
    let hit = null, hitZ = null;
    if (this.horde) for (const z of this.horde.list) {
      if (!z.alive || z.dying) continue;
      const h = rayZombie(origin, dir, z, range);
      if (h && (!hit || h.t < hit.t)) { hit = h; hitZ = z; }
    }
    const wall = this.world.raycast(origin, dir, range, ['ground']);
    const blocked = wall && (!hit || wall.t < hit.t);

    const dps = (def.beamDps || def.dmg) * dt;
    let end;
    if (hit && hitZ && !blocked) {
      end = { x: origin.x + dir.x * hit.t, y: origin.y + dir.y * hit.t, z: origin.z + dir.z * hit.t };
      // the primary target takes full damage
      const hs = hit.part === 'head';
      const dealt = dps * (hs ? (def.headMul || 1) : hit.part === 'legs' ? CFG.limbMultiplier : 1);
      hitZ.takeDamage(dealt, hit.part, dir);
      p.damageDealt += dealt;
      // then it forks to nearby zombies, decaying
      let src = hitZ, prev = end, chainDmg = dps * .7;
      const seen = {}; seen[src.id] = 1;
      for (let c = 0; c < (def.chain || 4); c++) {
        let next = null, nd = 1e9, npt = null;
        for (const z of this.horde.list) {
          if (!z.alive || z.dying || seen[z.id]) continue;
          const d = Math.hypot(z.pos.x - src.pos.x, z.pos.z - src.pos.z);
          if (d < (def.chainRange || 10) && d < nd) { nd = d; next = z; npt = { x: z.pos.x, y: z.pos.y + 1.0 * z.scale, z: z.pos.z }; }
        }
        if (!next) break;
        next.takeDamage(chainDmg, 'body', { x: 0, y: 0, z: 0 });
        p.damageDealt += chainDmg;
        this.effects.arc(prev, npt, 0x9ad6ff);
        prev = npt; seen[next.id] = 1; src = next; chainDmg *= .8;
      }
      UI.hitmark(true); this._hitmarkT = U.now();
    } else {
      end = blocked ? wall.point
        : { x: origin.x + dir.x * range, y: origin.y + dir.y * range, z: origin.z + dir.z * range };
      UI.hitmark(false); this._hitmarkT = U.now();
    }
    if (this.mode === CS.MODE.ONLINE && hit && hitZ && !blocked) {
      for (const rp of this.remotePlayers) {
        if (!rp.alive) continue;
        const h = this.rayRemotePlayerFor(rp, origin, dir, range);
        if (!h) continue;
        this.sendPvpHit(dps, h.part, h.part === 'head', rp);
      }
    }
    this.effects.holdLightning(muzzle, end, def.beamColor);
    Audio3D_SFX.laser && Audio3D_SFX.laser(muzzle.x, muzzle.y, muzzle.z);
    p.bulletsFired += dt * 20;
    // the arc drinks the magazine, so it eventually runs dry and reloads
    const w = p.weapon;
    if (w.mag !== Infinity) {
      w.mag -= (def.drainRate || 9) * dt;
      if (w.mag <= 0) { w.mag = 0; this.stopTeslaBeam(); this._teslaOn = false; if (p.def.mag !== Infinity) p.reload(); }
    }
  },

  stopTeslaBeam() {
    if (this.effects) this.effects.endLightning();
  },

  updateBeam(dt) {
    const p = this.player;
    const def = p.def;
    const origin = this.eyePos();
    const dir = this.cameraDir();
    const muzzle = this.muzzleWorldPos();
    const maxD = def.range || 200;

    // everything the beam passes through takes damage over time
    const dps = (def.beamDps || def.dmg) * dt;
    if (this.horde) {
      for (const z of this.horde.list) {
        if (!z.alive || z.dying) continue;
        const h = rayZombie(origin, dir, z, maxD);
        if (!h) continue;
        const hs = h.part === 'head';
        const dmg = dps * (hs ? (def.headMul || 1) : h.part === 'legs' ? CFG.limbMultiplier : 1);
        z.takeDamage(dmg, h.part, dir);
        p.damageDealt += dmg;
      }
    }
    if (this.mode === CS.MODE.ONLINE) {
      for (const rp of this.remotePlayers) {
        if (!rp.alive) continue;
        const h = this.rayRemotePlayerFor(rp, origin, dir, maxD);
        if (!h) continue;
        const hs = h.part === 'head';
        const dmg = dps * (hs ? (def.headMul || CFG.headshotMultiplier) : h.part === 'legs' ? CFG.limbMultiplier : 1);
        this.sendPvpHit(dmg, h.part, hs, rp);
      }
    }

    // the beam stops on the first solid wall
    const wallHits = this.world.raycastAll(origin, dir, maxD);
    let beamEnd = this.eyePos();
    beamEnd.x += dir.x * maxD; beamEnd.y += dir.y * maxD; beamEnd.z += dir.z * maxD;
    if (wallHits.length) {
      beamEnd = wallHits[0].point;
      /* ЛАЗЕРНАЯ ПУШКА ЛОМАЕТ КАРТУ: непрерывный луч ПРОЖИГАЕТ то, во что бьёт —
         урон зависит от времени (примерно 0.25с на обычную часть), поэтому
         выглядит как плавление, а не мгновенное исчезновение. */
      const wb = wallHits[0].box;
      if (wb && wb.destructible && !wb.removed && typeof damageMapBox === 'function') {
        const hm = wallHits[0].point, hn = wallHits[0].normal || { x: -dir.x, y: -dir.y, z: -dir.z };
        const broke = damageMapBox(wb, Math.max(6, wb.maxHp * 4 * dt));
        if (this.effects) {
          // искры/раскалённые точки на каждом попадании, осколки — при проломе
          for (let i = 0; i < (broke ? 5 : 2); i++) {
            this.effects.particle(hm.x, hm.y, hm.z,
              hn.x * U.rand(2, 7) + U.rand(-2, 2), U.rand(1, 4), hn.z * U.rand(2, 7) + U.rand(-2, 2),
              U.rand(.05, .12), 'spark', U.rand(.2, .5));
          }
          if (broke) this.effects.debrisBurst(hm.x, hm.y, hm.z, 0xb8b2a6, 1.0, wb._mat, 6);
        }
      }
      /* Leave a fire trail where the beam hits. The strip is oriented ALONG THE
         PATH the impact point traces on the surface (not along the beam), and is
         made long enough to bridge the gap since the previous mark — so any
         sweep paints one continuous burning line instead of separate dashes. */
      const n = wallHits[0].normal || { x: -dir.x, y: -dir.y, z: -dir.z };
      let last = this._lastScorch;
      let trail = null, gap = 0;
      if (last) {
        const dx = beamEnd.x - last.x, dy = beamEnd.y - last.y, dz = beamEnd.z - last.z;
        gap = Math.hypot(dx, dy, dz);
        // A big jump means the beam was released and restarted elsewhere (or the
        // view whipped around) — never bridge it with one enormous strip; treat
        // it as a fresh contact instead.
        if (gap > 3.5) { last = null; }
        else if (gap > 1e-3) trail = { x: dx / gap, y: dy / gap, z: dz / gap };
      }
      this._scorchT = (this._scorchT || 0) - dt;
      if (!last) {
        // first contact: a single short mark oriented along the beam
        this._scorchT = .05;
        this._lastScorch = { x: beamEnd.x, y: beamEnd.y, z: beamEnd.z };
        this.effects.scorch(beamEnd.x, beamEnd.y, beamEnd.z, n.x, n.y, n.z, .5, dir, .5 * 2.6);
      } else if (this._scorchT <= 0 && gap > .25) {
        this._scorchT = .06;
        this._lastScorch = { x: beamEnd.x, y: beamEnd.y, z: beamEnd.z };
        // the strip length is capped too, so a fast sweep never paints a stripe
        // longer than a couple of metres across the wall
        const len = Math.min(gap * 1.15 + .75, 3.2);
        this.effects.scorch(beamEnd.x, beamEnd.y, beamEnd.z, n.x, n.y, n.z, .5, trail, len);
      }
    }
    if (this.effects) this.effects.holdBeam(muzzle, beamEnd, def.beamColor);
    p.bulletsFired += dt * 20;           // counts as fire for the HUD/statistics
    UI.hitmark(false);
    this._hitmarkT = U.now();
  },

  stopBeam() {
    if (this.effects) this.effects.endBeam();
    // a new burst must not connect to where the previous one ended
    this._lastScorch = null;
  },

  fire() {
    const p = this.player, w = p.weapon;
    if (!w || !p.canFire()) {
      if (w && w.mag <= 0 && p.reloadT <= 0 && p.deployT <= 0) { Audio3D_SFX.empty(); p.fireCd = .22; if (p.def !== WEAPONS.knife && p.def.mag !== Infinity) p.reload(); }
      return false;                 // no shot fired
    }
    const def = p.def;
    if (def.shield) { this.activateShield(); return false; }   // shield raises, never fires
    /* ГОСПОДИН ЦВЕТОВ: ЛКМ — прямой таранный рывок без разворотов. Если рывок
       на перезарядке — просто ничего (это умение, а не обычный мах). */
    if (def.flowerDash) { this.flowerDash(); return false; }
    /* experimental weapons with bespoke behaviour (tesla / portal / turret …) */
    if (def.special) { this.fireSpecial(def, w); return true; }
    if (w.mag !== Infinity) w.mag--;
    p.fireCd = 60 / def.rpm;
    p.bulletsFired++;
    if (this.aim) this.aim.shots++;

    const origin = this.eyePos();
    const baseDir = this.cameraDir();
    const spread = p.aimSpread();
    const pellets = def.pellets || 1;
    const isMelee = def.slot === 3;

    // muzzle in world space, for tracers, muzzle smoke and projectiles
    const muzzleWorld = this.muzzleWorldPos();
    /* ---- projectile weapons launch a physical object ---- */
    if (def.projectile) {
      this.spawnProjectile(def, muzzleWorld, baseDir, p);
      // recoil / feedback still applies
      p.spread = Math.min(.09, p.spread + def.recoil * .0055);
      p.recoil += def.recoil * .0042;
      p.recoilYaw += U.rand(-1, 1) * def.recoil * .0016;
      p.viewPunchP += def.recoil * .0028;
      p.viewPunchY += U.rand(-1, 1) * def.recoil * .0012;
      p.flashT = .06;
      if (def.projectile === 'rocket') {
        Audio3D_SFX.rocketShot(muzzleWorld.x, muzzleWorld.y, muzzleWorld.z);
      } else {
        Audio3D_SFX.bananaShot(muzzleWorld.x, muzzleWorld.y, muzzleWorld.z);
      }
      if (this.effects) this.effects.muzzleSmoke(muzzleWorld.x, muzzleWorld.y, muzzleWorld.z, baseDir);
      if (this.mode === CS.MODE.ONLINE) {
        // `pr` tells the peer to fly a visible projectile instead of a tracer
        Net.send({ t: 'shot', wid: w.id, pr: def.projectile, ox: origin.x, oy: origin.y, oz: origin.z,
                   dx: baseDir.x, dy: baseDir.y, dz: baseDir.z, sp: spread });
      }
      return true;
    }

    /* Collect the ACTUAL spread directions so the peer can draw tracers that
       follow the real bullets instead of one straight beam along the aim line. */
    const pelletDirs = [];
    for (let i = 0; i < pellets; i++) {
      const dir = this.spreadDirection(baseDir, spread, pellets > 1);
      pelletDirs.push(dir);
      /* ОМЕГА-МОЛОТ: урон и ударную волну откладываем до низшей точки замаха,
         чтобы они совпали с анимацией удара сверху вниз. */
      if (isMelee && def.groundSlam) {
        this._slamPending = { origin: origin, dir: dir, def: def, muzzleWorld: muzzleWorld, t: .34 };
      } else {
        this.traceShot(origin, dir, def, isMelee, muzzleWorld);
      }
    }

    // ---- recoil / view punch ----
    if (!isMelee) {
      p.spread = Math.min(.09, p.spread + def.recoil * .0055);
      p.recoil += def.recoil * .0042;
      p.recoilYaw += U.rand(-1, 1) * def.recoil * .0016;
      p.viewPunchP += def.recoil * .0028;
      p.viewPunchY += U.rand(-1, 1) * def.recoil * .0012;
      p.flashT = .05;
      Audio3D_SFX.shot(def.sound || 'rifle');
      if (this.effects) this.effects.muzzleSmoke(muzzleWorld.x, muzzleWorld.y, muzzleWorld.z, baseDir);
      // third-person shot broadcast: send every pellet's real direction so
      // shotguns (buckshot) and machine guns draw many true tracers, not one beam
      if (this.mode === CS.MODE.ONLINE) {
        Net.send({
          t: 'shot', wid: w.id, dirs: pelletDirs, ox: origin.x, oy: origin.y, oz: origin.z,
          dx: baseDir.x, dy: baseDir.y, dz: baseDir.z, sp: spread
        });
      }
    } else {
      Audio3D_SFX.shot('knife');
      /* МАХОВАЯ АНИМАЦИЯ: у ближнего боя запускаем замах — viewmodel делает
         широкую дугу (как мечом), а не просто «тык» вперёд. Длительность
         зависит от оружия: тяжёлое машет медленнее и шире. */
      const def2 = p.def || {};
      const w2 = (def2.melee || 'knife');
      p.swingT = (w2 === 'megahammer') ? .62 : (w2.indexOf('knightsword') === 0) ? .15 : (w2 === 'katana') ? .26 : (w2 === 'fists') ? .20 : (w2 === 'hammer' || w2 === 'axe') ? .40
        : (w2 === 'chainsaw') ? .16 : (w2 === 'machete') ? .32 : .28;
      p.swingMax = p.swingT;
      p.swingKind = w2;
      p.swingSide = (p._swingFlip = !p._swingFlip) ? 1 : -1;   // чередуем сторону удара
    }
    return true;                     // a shot was actually fired
  },

  /* ============================================================
     PROJECTILES (bananas)
     ============================================================ */
  /* ============================================================
     III ЭТАП МЕЧА РЫЦАРЯ: ЛКМ-удары ВЫЛЕТАЮТ ВПЕРЁД белым слешем
     (те же углы и цвет, что у мини-слешей) и наносят врагам удвоенный урон.
     Это лёгкий «летящий разрез»: летит по прямой, пробивает врагов, гаснет
     о стену или по дальности.
     ============================================================ */
  spawnSlashProjectile(origin, fx, fz, dir, def) {
    this._slashProjs = this._slashProjs || [];
    const angle = U.rand(0, Math.PI * 2);          // угол линии — как у мини-слеша
    const len = 5.5, thick = .28;
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: .9,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    });
    const line = new THREE.Mesh(new THREE.PlaneGeometry(len, thick), mat);
    line.rotation.z = angle;
    g.add(line);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 1,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    });
    const core = new THREE.Mesh(new THREE.PlaneGeometry(len * .98, thick * .35), coreMat);
    core.rotation.z = angle; core.position.z = .01;
    g.add(core);
    // стартуем чуть впереди глаз и ориентируем на игрока (billboard)
    const sx = origin.x + fx * 2.0, sy = origin.y + .05, sz = origin.z + fz * 2.0;
    g.position.set(sx, sy, sz);
    g.lookAt(origin.x, origin.y, origin.z);
    this.scene.add(g);
    const speed = 34;
    this._slashProjs.push({
      grp: g, mats: [mat, coreMat],
      pos: { x: sx, y: sy, z: sz },
      vel: { x: fx * speed, y: dir.y * speed * .35, z: fz * speed },
      life: 1.15, max: 1.15, dmg: def.slashProjDmg || 420,
      hit: {}                                   // чтобы один враг получил урон раз
    });
  },

  updateSlashProjectiles(dt) {
    if (!this._slashProjs || !this._slashProjs.length) return;
    for (let i = this._slashProjs.length - 1; i >= 0; i--) {
      const s = this._slashProjs[i];
      s.life -= dt;
      const nx = s.pos.x + s.vel.x * dt, ny = s.pos.y + s.vel.y * dt, nz = s.pos.z + s.vel.z * dt;
      const segLen = Math.hypot(nx - s.pos.x, ny - s.pos.y, nz - s.pos.z);
      const dir = segLen > 1e-6 ? { x: (nx - s.pos.x) / segLen, y: (ny - s.pos.y) / segLen, z: (nz - s.pos.z) / segLen } : { x: 0, y: 0, z: -1 };
      // урон всем зомби по пути (один раз на каждого)
      if (this.horde) {
        for (const z of this.horde.list) {
          if (!z.alive || z.dying || s.hit[z.id]) continue;
          const h = rayZombie(s.pos, dir, z, segLen + .6);
          if (!h) continue;
          // плюс небольшой радиус вбок, чтобы «полоса» задевала рядом стоящих
          const side = Math.hypot(z.pos.x - s.pos.x, z.pos.z - s.pos.z);
          if (side > 2.6) continue;
          s.hit[z.id] = 1;
          const dealt = s.dmg;
          z.takeDamage(dealt, h.part, dir);
          this.player.damageDealt += dealt;
          this.horde && UI.hitmark(false);
        }
      }
      if (this.mode === CS.MODE.ONLINE) {
        for (const rp of this.remotePlayers) {
          if (!rp.alive || s.hit[rp.peerId] || this.isCoop) continue;
          const h = this.rayRemotePlayerFor(rp, s.pos, dir, segLen + .6);
          if (h) { s.hit[rp.peerId] = 1; this.sendPvpHit(s.dmg, h.part, h.part === 'head', rp, 'knight'); }
        }
      }
      // стена/пора гаснуть
      const wallHit = this.world.raycast(s.pos, dir, segLen + .1, ['ground']);
      if (wallHit && wallHit.t <= segLen + .1) { this.removeSlashProjectile(i); continue; }
      s.pos.x = nx; s.pos.y = ny; s.pos.z = nz;
      s.grp.position.set(nx, ny, nz);
      const k = U.clamp(s.life / s.max, 0, 1);
      const fade = Math.sin(k * Math.PI);
      s.mats[0].opacity = fade * .9;
      s.mats[1].opacity = fade;
      if (s.life <= 0) this.removeSlashProjectile(i);
    }
  },
  removeSlashProjectile(i) {
    const s = this._slashProjs[i];
    if (s) {
      s.grp.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
      if (s.grp.parent) s.grp.parent.remove(s.grp);
      this._slashProjs.splice(i, 1);
    }
  },
  clearSlashProjectiles() {
    if (!this._slashProjs) return;
    while (this._slashProjs.length) this.removeSlashProjectile(0);
  },

  spawnProjectile(def, origin, dir, owner) {
    const p = this.player;
    const spread = p.aimSpread();
    const d = this.spreadDirection(dir, spread, false);
    const kind = def.projectile;
    const isRocket = kind === 'rocket';
    const isGuided = kind === 'guided';
    const builder = {
      guided: buildGuidedMissile, rocket: buildRocketProjectile, acid: buildAcidProjectile,
      hive: buildHivePod, disc: buildDiscProjectile, freeze: buildFreezeOrb,
      blackhole: buildBlackHoleShell, chrono: buildChronoOrb, flower: buildFlowerProjectile
    }[kind];
    const mesh = builder ? builder() : buildBananaProjectile();
    // an epic/legendary skin tints the projectile and its trail
    const shotCol = p && p.skinShot ? p.skinShot : null;
    if (shotCol) { const c = new THREE.Color(shotCol); mesh.traverse(o => { if (o.isMesh && o.material && o.material.color) o.material.color.lerp(c, .6); }); }
    /* ГОСПОДИН ЦВЕТОВ: у каждого снаряда СВОЙ цвет — радужный град лепестков */
    let flowerCol = null;
    if (kind === 'flower') {
      flowerCol = FLOWER_PROJ_COLORS[(this._flowerColI = ((this._flowerColI || 0) + 1)) % FLOWER_PROJ_COLORS.length];
      const c = new THREE.Color(flowerCol);
      mesh.traverse(o => {
        if (o.isMesh && o.material && o.material.color) o.material.color.setHex(flowerCol);
        if (o.isMesh && o.material && o.material.emissive) o.material.emissive.setHex(flowerCol).multiplyScalar(0.35);
      });
    }
    mesh.position.set(origin.x, origin.y, origin.z);
    if (!isRocket && !isGuided) mesh.rotation.x = Math.PI / 2;   // bananas lie along the flight path
    this.scene.add(mesh);
    const speed = def.projSpeed || 30;
    const pr = {
      mesh: mesh,
      kind: kind,
      pid: 'pr' + (this._projSeq = (this._projSeq || 0) + 1),
      alive: true,
      life: (isRocket || isGuided) ? 8 : 6,
      prev: { x: origin.x, y: origin.y, z: origin.z },
      pos: { x: origin.x, y: origin.y, z: origin.z },
      vel: { x: d.x * speed, y: d.y * speed, z: d.z * speed },
      grav: def.projGravity || 12,
      dmg: def.dmg,
      headMul: def.headMul || 1.6,
      splash: def.splash || 0,          // blast radius (m); 0 = no splash
      splashDmg: def.splashDmg || 0,
      explosionColor: def.explosionColor || null,
      noSelfDamage: !!def.noSelfDamage, // e.g. the atomic RPG never hurts its owner
      nuke: !!def.nuke,                 // spawn the mushroom + tornado FX
      guided: isGuided,                 // the player steers this rocket
      ownerIsLocal: true
    };
    // per-kind extras copied from the weapon definition
    if (kind === 'acid') { pr.acidR = def.acidR; pr.acidDps = def.acidDps; pr.acidLife = def.acidLife; }
    if (kind === 'hive') { pr.hiveCount = def.hiveCount; pr.hiveReleased = false; }
    if (kind === 'freeze') { pr.freezeT = def.freezeT; }
    if (kind === 'blackhole') { pr.wellR = def.wellR; pr.wellLife = def.wellLife; pr.wellDps = def.wellDps; pr.wellPull = def.wellPull; pr.wellArmed = true; }
    if (kind === 'chrono') { pr.chronoR = def.chronoR; pr.chronoLife = def.chronoLife; pr.chronoSlow = def.chronoSlow; }
    if (kind === 'disc') { pr.bounces = def.bounces; pr.discReturn = def.discReturn; pr.returnT = def.discReturn; pr.bounced = 0; }
    if (kind === 'flower') { pr.flowerCol = flowerCol; pr.splash = def.flowerSplash || 3.0; pr.splashDmg = def.flowerSplashDmg || 120; }
    if (kind === 'freeze') pr.life = 7;
    this.projectiles.push(pr);
    // while a guided missile is in the air the player steers it, like the drone
    if (isGuided) this._guidedMissile = true;
    if (this.projectiles.length > 40) {
      const old = this.projectiles.shift();
      if (old.mesh.parent) old.mesh.parent.remove(old.mesh);
    }
  },

  updateProjectiles(dt) {
    if (!this.projectiles.length) return;
    const world = this.world;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.life -= dt;
      pr.prev.x = pr.pos.x; pr.prev.y = pr.pos.y; pr.prev.z = pr.pos.z;

      /* ---- guided missile: the shooter steers it with look + movement ---- */
      if (pr.guided && pr.ownerIsLocal && this.player && this.player.alive) {
        const m = this._frameLook || { dx: 0, dy: 0 };
        const speed = Math.hypot(pr.vel.x, pr.vel.y, pr.vel.z) || (pr.baseSpeed || 40);
        if (!pr.baseSpeed) pr.baseSpeed = speed;
        let yaw = Math.atan2(-pr.vel.x, -pr.vel.z);
        let pitch = Math.asin(U.clamp(pr.vel.y / speed, -1, 1));
        yaw -= m.dx * 1.6;
        pitch -= m.dy * 1.6;
        const mv = Input.moveVector();
        pitch += mv.f * dt * 2.2;                       // stick forward dives / back climbs
        pitch = U.clamp(pitch, -1.05, 1.05);
        const cp = Math.cos(pitch);
        const spd = speed * (mv.run ? 1.6 : (Input.aimDown() ? .6 : 1));
        pr.vel.x = -Math.sin(yaw) * cp * spd;
        pr.vel.y = Math.sin(pitch) * spd;
        pr.vel.z = -Math.cos(yaw) * cp * spd;
        pr.grav = 0;                                     // no drop while guided
      }

      pr.vel.y -= pr.grav * dt;

      /* ЧЁРНАЯ ДЫРА: drag the horde toward the singularity while it flies */
      if (pr.kind === 'blackhole') {
        if (pr.mesh.userData.ring) pr.mesh.userData.ring.rotation.z += dt * 3.2;
        if (pr.wellArmed) {
          const R = pr.wellR || 9;
          if (this.horde) for (const z of this.horde.list) {
            if (!z.alive || z.dying) continue;
            const dx = pr.pos.x - z.pos.x, dz = pr.pos.z - z.pos.z;
            const d = Math.hypot(dx, dz);
            if (d < R && d > .4) {
              const pull = (pr.wellPull || 10) * (1 - d / R);
              z.pos.x += (dx / d) * pull * dt;
              z.pos.z += (dz / d) * pull * dt;
            }
          }
          // opponents are dragged in and take the well's damage over time
          if (this.mode === CS.MODE.ONLINE) {
            pr._wellTick = (pr._wellTick || 0) - dt;
            const tick = pr._wellTick <= 0;
            if (tick) pr._wellTick = .5;
            for (const rp of this.remotePlayers) {
              if (!rp.alive) continue;
              const dx = pr.pos.x - rp.pos.x, dz = pr.pos.z - rp.pos.z;
              const d = Math.hypot(dx, dz);
              if (d < R && d > .4) {
                const pull = (pr.wellPull || 10) * (1 - d / R);
                rp.pos.x += (dx / d) * pull * dt;
                rp.pos.z += (dz / d) * pull * dt;
                if (tick) this.sendPvpHit((pr.wellDps || 45) * .5, 'body', false, rp, 'blackhole');
              }
            }
          }
        }
      }
      if (pr.kind === 'chrono' && pr.mesh.userData.ring) pr.mesh.userData.ring.rotation.z += dt * 2.5;
      if (pr.kind === 'flower') { pr.mesh.rotation.z += dt * 9; pr.mesh.rotation.y += dt * 4; }
      if (pr.kind === 'disc') { pr.mesh.rotation.z += dt * 22; pr.returnT -= dt; }
      const nx = pr.pos.x + pr.vel.x * dt, ny = pr.pos.y + pr.vel.y * dt, nz = pr.pos.z + pr.vel.z * dt;

      // segment we travel this frame
      const segLen = Math.hypot(nx - pr.pos.x, ny - pr.pos.y, nz - pr.pos.z);
      const dir = segLen > 1e-6
        ? { x: (nx - pr.pos.x) / segLen, y: (ny - pr.pos.y) / segLen, z: (nz - pr.pos.z) / segLen }
        : { x: 0, y: -1, z: 0 };

      // ---- hit the horde? ----
      let hitZ = null;
      if (this.horde) hitZ = this.horde.raycast(pr.pos, dir, segLen + 0.35);
      // ---- hit an opponent? ----
      let hitP = null;
      if (this.mode === CS.MODE.ONLINE) {
        const h = this.rayRemoteAny(pr.pos, dir, segLen + 0.35);
        if (h && (!hitZ || h.t < hitZ.t)) hitP = h;
      }
      // ---- hit the world? ----
      // NOTE: the ground must NOT be ignored here. Bullets deliberately skip it
      // (they stop on walls and the ground AABB is huge), but a rocket that
      // ignores the floor flies straight through it and never detonates.
      const wallHits = world.raycastAll(pr.pos, dir, segLen + 0.1);

      let impactPoint = null, impactNormal = null;
      const bestTarget = hitP ? hitP.part : (hitZ ? hitZ.part : null);
      const targetT = hitP ? hitP.t : (hitZ ? hitZ.t : Infinity);

      if (bestTarget !== null && targetT <= segLen + 0.35 && (!wallHits.length || targetT <= wallHits[0].t)) {
        if (hitP) {
          const hs = hitP.part === 'head';
          const limb = hitP.part === 'legs';
          const mul = hs ? pr.headMul : limb ? CFG.limbMultiplier : 1;
          this.sendPvpHit(pr.dmg * mul, hitP.part, hs, hitP.rp, pr.kind, pr.pid);
          impactPoint = hitP.point;
        } else {
          const killed = hitZ.zombie.takeDamage(pr.dmg, hitZ.part, dir);
          this.player.damageDealt += pr.dmg;
          if (killed) { /* scored in onZombieDied */ }
          this.player.bulletsHit++;
          impactPoint = { x: pr.pos.x + dir.x * hitZ.t, y: pr.pos.y + dir.y * hitZ.t, z: pr.pos.z + dir.z * hitZ.t };
        }
      } else if (wallHits.length) {
        impactPoint = wallHits[0].point;
        impactNormal = wallHits[0].normal;
      }

      if (impactPoint) {
        /* ---- experimental projectiles: on-hit behaviour ---- */
        if (pr.kind === 'freeze') {
          // shatter burst: chill everything close and leave a frost patch
          const R = pr.splash || 3.2, dmg = pr.splashDmg || pr.dmg;
          this.effects.frostBurst(impactPoint.x, impactPoint.y, impactPoint.z, R);
          this.effects.decal(impactPoint.x, impactPoint.y + .02, impactPoint.z, 0, 1, 0, R * .9, 'frost', null, null, R * .9, { x: impactPoint.x, y: impactPoint.y, z: impactPoint.z });
          this.freezeAt(impactPoint, R, pr.freezeT || 4, dmg);
          this.removeProjectile(i);
          continue;
        }
        if (pr.kind === 'hive') {
          this.releaseHive(impactPoint, pr.hiveCount || 5);
          this.removeProjectile(i);
          continue;
        }
        if (pr.kind === 'acid') {
          // splash puddle that keeps burning
          const R = pr.acidR || 2.6;
          this.effects.acidSplash(impactPoint.x, impactPoint.y, impactPoint.z, R);
          this.effects.decal(impactPoint.x, impactPoint.y + .02, impactPoint.z, 0, 1, 0, R, 'acid', null, null, R, { x: impactPoint.x, y: impactPoint.y, z: impactPoint.z });
          if (this.horde) for (const z of this.horde.list) {
            if (!z.alive || z.dying) continue;
            const d = Math.hypot(z.pos.x - impactPoint.x, z.pos.z - impactPoint.z);
            if (d < R) { z.takeDamage(pr.dmg, 'body', dir); this.player.damageDealt += pr.dmg; }
          }
          if (this.mode === CS.MODE.ONLINE) {
            for (const rp of this.remotePlayers) {
              if (!rp.alive) continue;
              const d = Math.hypot(rp.pos.x - impactPoint.x, rp.pos.z - impactPoint.z);
              if (d < R) this.sendPvpHit(pr.dmg * (1 - d / R), 'body', false, rp, 'acid');
            }
          }
          this.removeProjectile(i);
          continue;
        }
        if (pr.kind === 'blackhole') {
          // implode: the well has already dragged them in — now it detonates
          this.effects.implodeFx(impactPoint.x, impactPoint.y, impactPoint.z, pr.wellR || 9);
          this.explode(impactPoint, pr);
          this.removeProjectile(i);
          continue;
        }
        if (pr.kind === 'chrono') {
          this.effects.chronoField(impactPoint.x, impactPoint.y, impactPoint.z, pr.chronoR || 8, pr.chronoLife || 7);
          this.openChrono(impactPoint, pr.chronoR || 8, pr.chronoLife || 7, pr.chronoSlow || .16);
          this.removeProjectile(i);
          continue;
        }
        if (pr.kind === 'flower') {
          /* ЦВЕТОЧНЫЙ СНАРЯД: при попадании разлетается снопом лепестков и
             бьёт по площади небольшим уроном. */
          const R = pr.splash || 3.0, sdmg = pr.splashDmg || 120;
          if (this.effects && this.effects.flowerBurst) this.effects.flowerBurst(impactPoint.x, impactPoint.y, impactPoint.z, R, pr.flowerCol);
          if (this.horde) for (const z of this.horde.list) {
            if (!z.alive || z.dying) continue;
            const d = Math.hypot(z.pos.x - impactPoint.x, z.pos.z - impactPoint.z);
            if (d < R) { const dd = sdmg * (1 - d / R * .6); z.takeDamage(dd, 'body', dir); this.player.damageDealt += dd; }
          }
          if (this.mode === CS.MODE.ONLINE) {
            for (const rp of this.remotePlayers) {
              if (!rp.alive) continue;
              const d = Math.hypot(rp.pos.x - impactPoint.x, rp.pos.z - impactPoint.z);
              if (d < R) this.sendPvpHit(sdmg * (1 - d / R), 'body', false, rp, 'flower');
            }
          }
          this.removeProjectile(i);
          continue;
        }
        if (pr.kind === 'disc') {
          // a disc bounces off a wall a few times before it fades
          // a disc bounces off a wall a few times before it fades.
      // If `impactNormal` is null this was a zombie hit: the disc slices through
      // and keeps flying (only walls stop it).
      if (!impactNormal) { UI.hitmark(true); this._hitmarkT = U.now(); continue; }
      if (pr.bounced < (pr.bounces || 5)) {
            const vn = pr.vel.x * impactNormal.x + pr.vel.y * impactNormal.y + pr.vel.z * impactNormal.z;
            pr.vel.x -= 2 * vn * impactNormal.x;
            pr.vel.y -= 2 * vn * impactNormal.y;
            pr.vel.z -= 2 * vn * impactNormal.z;
            pr.pos.x = impactPoint.x + impactNormal.x * .08;
            pr.pos.y = impactPoint.y + impactNormal.y * .08;
            pr.pos.z = impactPoint.z + impactNormal.z * .08;
            pr.bounced++;
            this.effects.spark(impactPoint, impactNormal);
            continue;
          }
          this.effects.spark(impactPoint, impactNormal);
          this.removeProjectile(i);
          continue;
        }
        if (pr.splash > 0) {
          // rockets detonate: blast damage to everything nearby
          this.explode(impactPoint, pr);
        } else {
          this.effects.bananaSplat(impactPoint.x, impactPoint.y, impactPoint.z);
          Audio3D_SFX.bananaSplat(impactPoint.x, impactPoint.y, impactPoint.z);
          UI.hitmark(false);
          // peers need to see where the banana landed, not just hear it
          if (this.mode === CS.MODE.ONLINE) {
            Net.send({ t: 'splat', from: Net.selfId(), x: +impactPoint.x.toFixed(2), y: +impactPoint.y.toFixed(2), z: +impactPoint.z.toFixed(2) });
          }
        }
        this.removeProjectile(i);
        continue;
      }

      pr.pos.x = nx; pr.pos.y = ny; pr.pos.z = nz;
      pr.mesh.position.set(pr.pos.x, pr.pos.y, pr.pos.z);
      if (pr.kind === 'rocket' || pr.kind === 'guided') {
        // rockets/missiles point straight along their flight path
        const vl = Math.hypot(pr.vel.x, pr.vel.y, pr.vel.z) || 1;
        pr.mesh.lookAt(pr.pos.x + pr.vel.x / vl, pr.pos.y + pr.vel.y / vl, pr.pos.z + pr.vel.z / vl);
      } else {
        // point the banana along its velocity
        const vl = Math.hypot(pr.vel.x, pr.vel.y, pr.vel.z) || 1;
        pr.mesh.lookAt(pr.pos.x + pr.vel.x / vl, pr.pos.y + pr.vel.y / vl, pr.pos.z + pr.vel.z / vl);
        pr.mesh.rotateZ(Math.PI / 2);
        pr.mesh.rotateY(Math.sin(performance.now() * .02) * .4);   // silly spin
      }
      if (pr.life <= 0 || pr.pos.y < -3) {
        /* a disc flies home once it has spent its outbound time */
        if (pr.kind === 'disc' && pr.returnT <= 0 && pr.ownerIsLocal) {
          const p = this.player;
          const toH = { x: p.pos.x - pr.pos.x, y: (p.pos.y + 1.2) - pr.pos.y, z: p.pos.z - pr.pos.z };
          const l = Math.hypot(toH.x, toH.y, toH.z) || 1, sp = 46;
          pr.vel.x = toH.x / l * sp; pr.vel.y = toH.y / l * sp; pr.vel.z = toH.z / l * sp;
          pr.grav = 0; pr.returnT = 1;
          if (l < 2.5) { this.removeProjectile(i); continue; }   // caught it back
          continue;
        }
        // a rocket that runs out of life or hits the void still detonates
        if (pr.splash > 0) this.explode({ x: pr.pos.x, y: pr.pos.y, z: pr.pos.z }, pr);
        this.removeProjectile(i);
      }
    }
  },

      /* ============================================================
         EXPERIMENTAL WEAPONS — bespoke firing behaviours
         ============================================================ */

      /* dispatcher: weapons with a `special` handler never fire a bullet. */
      fireSpecial(def, w) {
        const p = this.player;
        const muzzle = this.muzzleWorldPos();
        const origin = this.eyePos();
        const dir = this.cameraDir();
        if (w.mag !== Infinity) w.mag--;
        p.bulletsFired++;
        p.fireCd = 60 / def.rpm;
        p.flashT = .04;
        if (def.special === 'tesla') return this.fireTesla(def, muzzle, origin, dir);
      },

      /* ДРОН-ТУРЕЛЬ now lives in GEAR: V launches/recalls it */
      useTurretGear() {
        const p = this.player;
        if (!p || !p.alive) return false;
        if (this.mode === CS.MODE.MENU || this.paused) return false;
        if (this.roundState === 'buy' && this.mode !== CS.MODE.RANGE) { UI.toast('Турель доступна только в бою', '#f5d33c'); Audio3D_SFX.deny(); return false; }
        if (this.turretDrone) { this.removeTurretDrone(); p.turretDrone = (p.turretDrone || 0) + 1; UI.toast('Дрон-турель отозван (заряд возвращён)', '#ff9d21'); return true; }
        if (!(p.turretDrone > 0)) { UI.toast('Дрона-турели нет — купите в магазине (B)', '#f5d33c'); Audio3D_SFX.deny(); return false; }
        p.turretDrone--;
        this.toggleTurretDrone({ dmg: 46, turretDmg: 48, turretCd: .16, turretRange: 46 });
        return true;
      },

      /* leave the mech: back to the normal body. The chassis STAYS STANDING where
         you left it (parked) so you can walk around it and climb back in. */
      exitMechSuit() {
        const p = this.player;
        if (!p || !p.mechSuit) return false;
        const mx = p.pos.x, my = p.pos.y, mz = p.pos.z, myaw = p.yaw;
        p.mechSuit = false;
        p.height = CFG.playerHeight;
        p.radius = CFG.playerRadius;
        // drop mech-only abilities so they can't leak onto foot
        p.jetActive = false; p.jetT = 0; p.jetCd = 0;
        p.dashActive = false; p.dashT = 0; p.dashCd = 0; p.dashTook = null;
        // put the normal pistol back in hand instead of the mech weapons
        p.inv[2] = null; p.inv[1] = null;
        // hand back whatever was carried before entering the mech (shotgun etc.)
        const sv = this._savedLoadout;
        if (sv) {
          p.inv[1] = sv.inv1 ? Object.assign({}, sv.inv1) : null;
          p.inv[2] = sv.inv2 ? Object.assign({}, sv.inv2) : null;
          p.lastPrimary = sv.lastPrimary || 2;
          // prefer the weapon the player had in hand, else their primary
          let back = sv.slot;
          if (back === 3 || !p.inv[back]) back = (sv.inv2 ? 2 : (sv.inv1 ? 1 : 3));
          p.slot = back;
          this._savedLoadout = null;
        } else {
          p.slot = 3;
        }
        p.deployT = .5;
        p.buildViewModel(); this.attachViewModel();
        // park the chassis: stop following the player, keep it in the world
        this.parkMechBody(mx, my, mz, myaw);
        // step the player OUT of the cockpit (a bit backward so they are clear)
        const bx = Math.sin(myaw), bz = Math.cos(myaw);      // backward
        p.pos.x = mx + bx * 1.6; p.pos.z = mz + bz * 1.6;
        /* If we bail out high in the air, keep the mech's altitude and FALL:
           snapping straight to the ground teleported the player down. Only snap
           to the floor when the exit point is on (or barely above) the ground. */
        const gy = this.world.groundAt(p.pos.x, p.pos.z, my + 3);
        const ground = (gy === null || gy === undefined) ? my : gy;
        if (my - ground > 0.6) {
          // airborne exit: drop from here, with the mech's horizontal drift kept
          p.pos.y = my;
          p.vel.x = (p.vel.x || 0) * .5;
          p.vel.z = (p.vel.z || 0) * .5;
          p.vel.y = 0;
          p.onGround = false;
        } else {
          p.pos.y = ground;
          p.vel.x = p.vel.y = p.vel.z = 0;
        }
        this.clearMechMissiles();
        if (this.effects) { this.effects.endFlame(); }
        UI.center('МЕХ ОСТАВЛЕН', 'G рядом с мехом — снова сесть', 2.2);
        UI.toast('Вы вышли: рост и обзор обычные. Мех стоит на месте', '#ff9d21');
        return true;
      },
      /* stop the chassis following the player and leave it standing at x,y,z */
      parkMechBody(x, y, z, yaw) {
        const mesh = this.mechBody;
        if (!mesh) return;
        // the view model follows the player again, not the mech
        if (this.player.vmGroup) this.player.vmGroup.visible = true;
        mesh.visible = true;
        mesh.position.set(x, y, z);
        mesh.rotation.y = yaw;
        this.mechBody = null;                 // no longer the active cockpit shell
        this.parkedMech = { mesh: mesh, x: x, y: y, z: z, yaw: yaw };
      },
      /* how far the parked mech is from the player (-1 if none parked) */
      parkedMechDist() {
        if (!this.parkedMech || !this.player) return -1;
        const m = this.parkedMech, p = this.player;
        return Math.hypot(m.x - p.pos.x, m.z - p.pos.z);
      },
      clearParkedMech() {
        const m = this.parkedMech;
        if (!m) return;
        if (m.mesh.parent) m.mesh.parent.remove(m.mesh);
        m.mesh.traverse(o => { if (o.geometry) o.geometry.dispose(); });
        this.parkedMech = null;
      },
      /* toggle in/out of the suit (used by the G key and the shop card) */
      toggleMechSuit() {
        const p = this.player;
        if (p && p.mechSuit) return this.exitMechSuit();
        return this.equipMechSuit();
      },
      /* МЕХАКОСТЮМ: grants the mech minigun (slot 2) + hyper laser (slot 1).
         They are equipped like normal weapons because they use the standard
         slots, so 1/2 switch between them and reloading works as usual. */
      equipMechSuit() {
        const p = this.player;
        p.mechOwned = true;
        // re-entering a parked mech: move the player onto it and reuse the chassis
        if (this.parkedMech) {
          const m = this.parkedMech;
          p.pos.x = m.x; p.pos.z = m.z; p.pos.y = m.y;
          p.vel.x = p.vel.y = p.vel.z = 0;
          this.mechBody = m.mesh; this.parkedMech = null;
        }
        /* Remember the weapons that were in hand, so they can be handed back on
           exit. Without this the mech weapons overwrite slot 2 and leaving the
           mech wipes everything (a bought shotgun simply vanished). */
        this._savedLoadout = {
          inv1: p.inv[1] ? Object.assign({}, p.inv[1]) : null,
          inv2: p.inv[2] ? Object.assign({}, p.inv[2]) : null,
          slot: p.slot,
          lastPrimary: p.lastPrimary
        };
        // the mech kit must not inherit the ammo of the gun it replaces
        p.inv[1] = null; p.inv[2] = null;
        p.give('mechMinigun');
        p.give('mechLaser');
        p.mechSuit = true;
        p.slot = 2;
        p.deployT = .6;
        // sit in the cockpit: taller body, wider stance, camera up high
        p.height = CFG.mechHeight;
        p.radius = CFG.mechRadius;
        p.mechMissiles = 0;
        p.buildViewModel(); this.attachViewModel();
        this.buildMechBody();
        UI.center('МЕХАКОСТЮМ', 'ЛКМ — миниган · ПКМ — лазер · E — ракеты · R — скачок напряжения · G — выйти', 2.6);
        UI.toast('Вы в кабине меха: ЛКМ миниган · ПКМ лазер · E ракеты · R скачок напряжения · G выйти', '#4ad6ff');
      },
      /* visible mech chassis + cockpit around the player (third-person shell).
         In first person the cockpit frame appears as the view model braces. */
      buildMechBody() {
        if (!this.mechBody) {
          this.mechBody = buildMechChassis();
          this.scene.add(this.mechBody);
        }
      },
      /* применяет надетый мех-скин ко всем существующим шасси (своё, припаркованное,
         у соперников/кооп-напарников) — вызывается при выборе скина */
      applyMechSkinEverywhere() {
        const sk = (typeof mechSkinById === 'function') ? (mechSkinById(Store.data.mechSkin) || mechSkinById('mch_none')) : null;
        if (this.mechBody && typeof applyMechSkin === 'function') applyMechSkin(this.mechBody, sk);
        if (this.parkedMech && this.parkedMech.mesh && typeof applyMechSkin === 'function') applyMechSkin(this.parkedMech.mesh, sk);
      },
      removeMechBody() {
        if (!this.mechBody) return;
        if (this.mechBody.parent) this.mechBody.parent.remove(this.mechBody);
        this.mechBody.traverse(o => { if (o.geometry) o.geometry.dispose(); });
        this.mechBody = null;
      },
      /* E — launch a volley of homing missiles at nearby zombies */
      /* ============================================================
         СКАЧОК НАПРЯЖЕНИЯ (R) — способность меха: мощный электрический
         разряд вокруг шасси, большая ударная волна отбрасывает всех врагов
         в радиусе и наносит им урон.
         ============================================================ */
      mechSurge() {
        const p = this.player;
        if (!this.isMechActive() || !p.alive) { UI.toast('Скачок напряжения — только в мехакостюме', '#f5d33c'); Audio3D_SFX.deny(); return false; }
        if (this.roundState !== 'live' || this.mode === CS.MODE.MENU) return false;
        const now = U.now();
        const cd = CFG.mechSurgeCd * 1000;
        if (this._mechSurgeAt && now - this._mechSurgeAt < cd) {
          const left = Math.ceil((cd - (now - this._mechSurgeAt)) / 1000);
          UI.toast('Скачок через ' + left + 'с', '#f5d33c'); Audio3D_SFX.deny(); return false;
        }
        this._mechSurgeAt = now;
        const R = CFG.mechSurgeRadius, dmg = CFG.mechSurgeDmg, push = CFG.mechSurgePush;
        const c = { x: p.pos.x, y: p.pos.y + 1.2, z: p.pos.z };
        // большой визуальный взрыв + электрическая волна
        if (this.effects) {
          this.effects.explosion(c.x, c.y, c.z, R, [0x7fe0ff, 0x1a2a3a]);
          this.effects.implodeFx ? null : null;
          for (let i = 0; i < 26; i++) {
            const a = U.rand(0, 6.28);
            this.effects.particle(c.x, c.y, c.z, Math.cos(a) * U.rand(6, 14), U.rand(1, 6), Math.sin(a) * U.rand(6, 14),
              U.rand(.06, .16), 'vspark', U.rand(.3, .7));
          }
        }
        Audio3D_SFX.explosionAt(c.x, c.y, c.z);
        UI.center('СКАЧОК НАПРЯЖЕНИЯ', 'Ударная волна · ' + Math.round(R) + 'м', 1.6);
        /* ударная волна РАЗРУШАЕТ карту в МЕНЬШЕМ радиусе (иначе сносит пол-карты) */
        this.breakMapAt(c.x, c.y, c.z, (CFG.mechSurgeBreakR || R * .7), dmg);
        /* ударная волна: отбрасываем и бьём всех зомби в радиусе */
        if (this.horde) for (const z of this.horde.list) {
          if (!z.alive || z.dying) continue;
          const dx = z.pos.x - c.x, dz = z.pos.z - c.z, dy = (z.pos.y + 1) - c.y;
          const d = Math.hypot(dx, dy, dz);
          if (d > R) continue;
          const k = 1 - d / R;
          z.takeDamage(dmg * (.4 + k * .6), 'body', { x: dx, y: dy, z: dz });
          if (z.alive && !z.dying) {
            const l = Math.max(Math.hypot(dx, dz), .01);
            z.vel.x += (dx / l) * push * k;
            z.vel.z += (dz / l) * push * k;
            if (z.vel.y !== undefined) z.vel.y += push * k * .4;
            if (typeof z.stagger === 'function') z.stagger(.6);
          }
          this.player.damageDealt += dmg * (.4 + k * .6);
        }
        /* враги-игроки: сильный отброс + урон */
        if (this.mode === CS.MODE.ONLINE) {
          for (const rp of this.remotePlayers) {
            if (!rp.alive) continue;
            const dx = rp.pos.x - c.x, dz = rp.pos.z - c.z;
            const d = Math.hypot(dx, dz);
            if (d <= R) this.sendPvpHit(dmg * (.4 + (1 - d / R) * .6), 'body', false, rp, 'surge');
          }
        }
        return true;
      },

      launchMechMissiles() {        const p = this.player;
        if (!this.isMechActive() || !p.alive) { UI.toast('Ракеты доступны в мехакостюме', '#f5d33c'); return false; }
        if (this.roundState !== 'live' || this.mode === CS.MODE.MENU) return false;
        const now = U.now();
        if (this._mechMissileAt && now - this._mechMissileAt < CFG.mechMissileCd * 1000) {
          const left = Math.ceil((CFG.mechMissileCd * 1000 - (now - this._mechMissileAt)) / 1000);
          UI.toast('Ракеты через ' + left + 'с', '#f5d33c'); Audio3D_SFX.deny(); return false;
        }
        this._mechMissileAt = now;
        this.mechMissiles = this.mechMissiles || [];
        const dir = this.cameraDir();
        // pick up to 4 nearest enemies: zombies, plus opponents in an online duel
        let targets = [];
        if (this.horde) {
          targets = this.horde.list.filter(z => z.alive && !z.dying)
            .map(z => ({ z: z, d: Math.hypot(z.pos.x - p.pos.x, z.pos.z - p.pos.z) }))
            .sort((a, b) => a.d - b.d).slice(0, 4).map(o => o.z);
        }
        if (this.mode === CS.MODE.ONLINE) {
          const remotes = this.remotePlayers.filter(rp => rp.alive)
            .map(rp => ({ z: rp, d: Math.hypot(rp.pos.x - p.pos.x, rp.pos.z - p.pos.z) }))
            .sort((a, b) => a.d - b.d).slice(0, 4).map(o => o.z);
          targets = targets.concat(remotes)
            .sort((a, b) => Math.hypot(a.pos.x - p.pos.x, a.pos.z - p.pos.z) - Math.hypot(b.pos.x - p.pos.x, b.pos.z - p.pos.z))
            .slice(0, 4);
        }
        for (let i = 0; i < 4; i++) {
          // launch from the left shoulder pod (where the red tubes are)
          const side = i % 2 === 0 ? 'left' : 'right';
          const from = this.mechMuzzleWorldPos(side);
          const sx = (i % 2 === 0 ? -.35 : .35);
          const mesh = buildMechMissile();
          mesh.position.set(from.x + sx * .3, from.y + .5, from.z);
          this.scene.add(mesh);
          const tgt = targets[i % Math.max(1, targets.length)] || null;
          this.mechMissiles.push({
            mesh: mesh, pos: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
            vel: { x: dir.x * 8, y: 4, z: dir.z * 8 }, life: 8,
            target: tgt, dmg: 420,
            targetIsRemote: !!(tgt && tgt.isRemotePlayer)
          });
          // let the room fly a matching cosmetic missile, so the volley is visible
          if (this.mode === CS.MODE.ONLINE && Net.connected) {
            Net.send({
              t: 'mmissile', from: Net.selfId(),
              x: +mesh.position.x.toFixed(2), y: +mesh.position.y.toFixed(2), z: +mesh.position.z.toFixed(2),
              dx: dir.x, dy: dir.y, dz: dir.z
            });
          }
        }
        const snd = this.mechMuzzleWorldPos('left');
        Audio3D_SFX.explosionAt(snd.x, snd.y, snd.z);
        UI.toast('Залп ракет!', '#4ad6ff');
        this._podRecoil = .8;
        return true;
      },
      updateMechMissiles(dt) {
        if (!this.mechMissiles || !this.mechMissiles.length) return;
        for (let i = this.mechMissiles.length - 1; i >= 0; i--) {
          const m = this.mechMissiles[i];
          m.life -= dt;
          // (re)acquire a target if ours died
          if (!m.target || !m.target.alive || m.target.dying) {
            if (this.mode === CS.MODE.ONLINE) {
              m.target = this.nearestEnemy(m.pos.x, m.pos.z, 40);
              m.targetIsRemote = !!(m.target && m.target.isRemotePlayer);
            } else {
              m.target = this.nearestZombie(m.pos.x, m.pos.z, 40);
              m.targetIsRemote = false;
            }
          }
          const tgtRemote = m.targetIsRemote || !!(m.target && m.target.isRemotePlayer);
          const tgtH = m.target ? (tgtRemote ? 1.2 : 1.1 * m.target.scale) : 1;
          const sp = 34;
          if (m.target) {
            const to = { x: m.target.pos.x - m.pos.x, y: (m.target.pos.y + tgtH) - m.pos.y, z: m.target.pos.z - m.pos.z };
            const l = Math.hypot(to.x, to.y, to.z) || 1;
            const k = 1 - Math.pow(.02, dt);
            m.vel.x = U.lerp(m.vel.x, to.x / l * sp, k);
            m.vel.y = U.lerp(m.vel.y, to.y / l * sp, k);
            m.vel.z = U.lerp(m.vel.z, to.z / l * sp, k);
          } else m.vel.y -= 8 * dt;
          m.pos.x += m.vel.x * dt; m.pos.y += m.vel.y * dt; m.pos.z += m.vel.z * dt;
          m.mesh.position.set(m.pos.x, m.pos.y, m.pos.z);
          const vl = Math.hypot(m.vel.x, m.vel.y, m.vel.z) || 1;
          m.mesh.lookAt(m.pos.x + m.vel.x / vl, m.pos.y + m.vel.y / vl, m.pos.z + m.vel.z / vl);
          // smoke trail
          if (Math.random() < .8) this.effects.particle(m.pos.x, m.pos.y, m.pos.z, U.rand(-.5, .5), U.rand(-.2, .8), U.rand(-.5, .5), U.rand(.06, .16), 'smoke', U.rand(.3, .7));
          let boom = m.life <= 0;
          if (m.target) {
            const dd = Math.hypot(m.target.pos.x - m.pos.x, (m.target.pos.y + tgtH) - m.pos.y, m.target.pos.z - m.pos.z);
            if (dd < 1.2) boom = true;
          }
          if (boom) {
            const px = m.pos.x, py = m.pos.y, pz = m.pos.z;
            this.effects.explosion(px, py, pz, 4.0, [0x4ad6ff, 0x100608]);
            Audio3D_SFX.explosionAt(px, py, pz);
            if (this.mode === CS.MODE.ONLINE && Net.connected) {
              Net.send({ t: 'boom', from: Net.selfId(), x: +px.toFixed(2), y: +py.toFixed(2), z: +pz.toFixed(2), r: 4.0, c: [0x4ad6ff, 0x100608] });
            }
            if (this.horde) for (const z of this.horde.list) {
              if (!z.alive || z.dying) continue;
              const dd = Math.hypot(z.pos.x - px, (z.pos.y + 1) - py, z.pos.z - pz);
              if (dd > 4.0) continue;
              const dealt = m.dmg * (1 - dd / 4.0);
              z.takeDamage(dealt, 'body', { x: 0, y: 0, z: 0 });
              this.player.damageDealt += dealt;
            }
            if (this.mode === CS.MODE.ONLINE) {
              for (const rp of this.remotePlayers) {
                if (!rp.alive) continue;
                const dd = Math.hypot(rp.pos.x - px, (rp.pos.y + 1) - py, rp.pos.z - pz);
                if (dd <= 4.0) this.sendPvpHit(m.dmg * (1 - dd / 4.0), 'body', false, rp, 'rocket');
              }
            }
            if (m.mesh.parent) m.mesh.parent.remove(m.mesh);
            m.mesh.traverse(o => { if (o.geometry) o.geometry.dispose(); });
            this.mechMissiles.splice(i, 1);
          }
        }
      },
      clearMechMissiles() {
        if (!this.mechMissiles) return;
        for (const m of this.mechMissiles) { if (m.mesh.parent) m.mesh.parent.remove(m.mesh); m.mesh.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
        this.mechMissiles.length = 0;
      },
      /* the suit is "active" while its two weapons are still owned */
      isMechActive() {
        const p = this.player;
        return !!(p && p.mechSuit && p.inv[2] && p.inv[2].id === 'mechMinigun' && p.inv[1] && p.inv[1].id === 'mechLaser');
      },
      /* position the visible chassis around the player each frame */
      updateMechBody(dt) {
        if (!this.mechBody) return;
        if (!this.isMechActive() || !this.player.alive) {
          this.mechBody.visible = false;
          if (this.player.vmGroup) this.player.vmGroup.visible = true;
          return;
        }
        const p = this.player;
        this.mechBody.visible = true;
        // the pilot model is for the OUTSIDE view only — hide it in first person
        if (this.mechBody.userData && this.mechBody.userData.pilot) this.mechBody.userData.pilot.visible = false;
        this.mechBody.position.set(p.pos.x, p.pos.y, p.pos.z);
        this.mechBody.rotation.y = p.yaw;
        // the first-person weapon model is not used in the mech: the chassis arms
        // ARE the weapons. Hide it so no floating gun sits on screen.
        if (p.vmGroup) p.vmGroup.visible = false;
        // spin the minigun cluster when firing the minigun
        const ud = this.mechBody.userData;
        const cluster = ud.barrels;
        if (cluster) {
          this._mechSpin = (this._mechSpin || 0) + dt * (p.spinT > .1 ? 34 : 0);
          cluster.rotation.z = this._mechSpin;
        }
        /* ---- animate the arms ---- */
        this._mechT = (this._mechT || 0) + dt;
        const t = this._mechT;
        const hspeed = Math.hypot(p.vel.x, p.vel.z);
        const walk = U.clamp(hspeed / CFG.walkSpeed, 0, 1.4);
        /* The chassis turns with p.yaw, exactly like the camera. So the arms just
           have to point along the LOCAL aim direction (the camera's pitch + any
           recoil/yaw punch): both barrels then lie precisely on the bullet's
           line of fire and the shots never leave the crosshair. */
        const pitchA = U.clamp(p.pitch + p.recoil + p.viewPunchP, -1.5, 1.5);
        const yawA = (p.recoilYaw || 0) + (p.viewPunchY || 0);
        const cp = Math.cos(pitchA);
        const dirx = -cp * Math.sin(yawA);
        const diry = Math.sin(pitchA);
        const dirz = -cp * Math.cos(yawA);
        const yawD = Math.atan2(-dirx, -dirz);            // barrel yaw (model forward = -Z)
        const elevD = Math.atan2(diry, Math.hypot(dirx, dirz)); // barrel elevation
        // walking bob + idle sway (position only — never changes the aim)
        const bob = Math.sin(t * (4 + walk * 5)) * (.012 + walk * .022);
        const sway = Math.cos(t * 2.1) * .010;
        // recoil springs for each arm (fired when that weapon fires)
        this._mgRecoil = Math.max(0, (this._mgRecoil || 0) - dt * 6);
        this._lzRecoil = Math.max(0, (this._lzRecoil || 0) - dt * 8);
        this._podRecoil = Math.max(0, (this._podRecoil || 0) - dt * 5);
        const mgKick = this._mgRecoil, lzKick = this._lzRecoil, podKick = this._podRecoil;
        const minigunOn = p.inv[2] && p.inv[2].id === 'mechMinigun' && p.triggerDown && p.spinT > .1;
        if (minigunOn) this._mgRecoil = Math.min(1, this._mgRecoil + dt * 10);

        if (ud.mgArm) {
          const b = ud.mgArm.userData.basePos;
          ud.mgArm.rotation.order = 'YXZ';
          ud.mgArm.rotation.y = yawD;
          ud.mgArm.rotation.x = elevD - mgKick * .10;     // recoil lifts the muzzle
          ud.mgArm.position.set(b.x + sway * .5, b.y + bob, b.z + mgKick * .14);
        }
        if (ud.lzArm) {
          const b = ud.lzArm.userData.basePos;
          ud.lzArm.rotation.order = 'YXZ';
          ud.lzArm.rotation.y = yawD;
          ud.lzArm.rotation.x = elevD - lzKick * .10;
          ud.lzArm.position.set(b.x - sway * .5, b.y + bob * .8, b.z + lzKick * .12);
        }
        if (ud.pod) {
          ud.pod.rotation.order = 'YXZ';
          ud.pod.rotation.y = yawD;
          ud.pod.rotation.x = elevD + podKick * .12;
          ud.pod.position.y = 3.34 + podKick * .14 + bob;
        }
        /* ---- walk: animate the articulated legs ---- */
        {
          const spd01 = U.clamp(hspeed / CFG.runSpeed, 0, 1);
          this._mechLegPhase = animateMechLegs(this.mechBody, spd01, this._mechLegPhase || 0, dt);
        }
        /* ---- jetpack / dash thrusters (shared visuals) ---- */
        setMechThrusters(this.mechBody, p.jetActive === true, p.dashActive === true, t);
        /* ---- dash: an orange fire trail streaming off the thrusters ---- */
        if (p.dashActive && this.effects) {
          this._mechDashTrail = (this._mechDashTrail || 0) - dt;
          if (this._mechDashTrail <= 0) {
            this._mechDashTrail = .02;
            const dx = p.dashDir.x, dz = p.dashDir.z;
            for (let i = 0; i < 3; i++) {
              this.effects.particle(
                p.pos.x - dx * .7 + U.rand(-.5, .5), p.pos.y + .3 + U.rand(0, 1.6), p.pos.z - dz * .7 + U.rand(-.5, .5),
                -dx * U.rand(3, 9) + U.rand(-2, 2), U.rand(.4, 2.4), -dz * U.rand(3, 9) + U.rand(-2, 2),
                U.rand(.10, .22), 'spark', U.rand(.2, .5));
            }
            this.effects.particle(
              p.pos.x - dx * .8, p.pos.y + .5, p.pos.z - dz * .8,
              -dx * 4 + U.rand(-1, 1), U.rand(.5, 2), -dz * 4 + U.rand(-1, 1),
              U.rand(.16, .30), 'smoke', U.rand(.3, .6));
          }
        }
        /* ---- jetpack: a hot exhaust trail while thrusting ---- */
        if (p.jetActive && this.effects) {
          this._mechJetTrail = (this._mechJetTrail || 0) - dt;
          if (this._mechJetTrail <= 0) {
            this._mechJetTrail = .05;
            this.effects.particle(
              p.pos.x + U.rand(-.5, .5), p.pos.y + .1, p.pos.z + .6 + U.rand(-.2, .2),
              U.rand(-1, 1), U.rand(-3, -1), U.rand(-1, 1),
              U.rand(.14, .26), 'smoke', U.rand(.3, .6));
          }
        }
      },
      /* МЕХАКОСТЮМ: dash — a short, powerful ground burst.
         Direction = current movement input (or straight ahead if standing still).
         Anything caught in the sweep takes damage and is shoved aside. */
      mechDash() {
        const p = this.player;
        if (!this.isMechActive() || !p.alive) return false;
        if (this.roundState !== 'live' || this.buyOpen) return false;
        if (p.dashActive) return false;
        if (p.dashCd > 0) {
          UI.toast('Рывок через ' + p.dashCd.toFixed(1) + 'с', '#f5d33c');
          Audio3D_SFX.deny(); return false;
        }
        // wish direction from the movement keys (falls back to facing forward)
        const cy = Math.cos(p.yaw), sy = Math.sin(p.yaw);
        let dx = -sy * (p.in.f || 0) + cy * (p.in.r || 0);
        let dz = -cy * (p.in.f || 0) - sy * (p.in.r || 0);
        const dl = Math.hypot(dx, dz);
        if (dl > 0.01) { dx /= dl; dz /= dl; } else { dx = -sy; dz = -cy; }
        p.dashDir.x = dx; p.dashDir.z = dz;
        p.dashActive = true; p.dashT = CFG.mechDashTime;
        p.dashTook = {};                       // zombies already hit this dash
        p.dashCd = 0;                          // cooldown starts when the dash ends
        // burst of dust thrown up behind the mech
        if (this.effects) {
          for (let i = 0; i < 12; i++) {
            this.effects.particle(
              p.pos.x - dx * .5 + U.rand(-.4, .4), p.pos.y + .3 + U.rand(0, 1.2), p.pos.z - dz * .5 + U.rand(-.4, .4),
              -dx * U.rand(2, 6) + U.rand(-2, 2), U.rand(.5, 2.5), -dz * U.rand(2, 6) + U.rand(-2, 2),
              U.rand(.10, .22), 'smoke', U.rand(.3, .7));
          }
        }
        Audio3D_SFX.tone(90, .28, 'triangle', .16, p.pos.x, p.pos.y, p.pos.z, 220);
        UI.toast('РЫВОК!', '#4ad6ff');
        return true;
      },
      /* per-frame dash contact sweep: damage + shove anything in the path */
      updateMechDash(dt) {
        const p = this.player;
        if (!p || !p.dashActive || !this.horde) return;
        const R = CFG.mechRadius + 1.5;
        for (const z of this.horde.list) {
          if (!z.alive || z.dying) continue;
          if (p.dashTook && p.dashTook[z.id]) continue;
          const d = Math.hypot(z.pos.x - p.pos.x, z.pos.z - p.pos.z);
          if (d > R) continue;
          if (p.dashTook) p.dashTook[z.id] = 1;
          const dmg = CFG.mechDashDmg;
          z.takeDamage(dmg, 'body', p.dashDir);
          p.damageDealt += dmg;
          // shove the zombie away along the dash direction and stagger it
          z.staggerT = Math.max(z.staggerT || 0, .5);
          z.pos.x = U.clamp(z.pos.x + p.dashDir.x * .9, -MAP.size / 2 + 2, MAP.size / 2 - 2);
          z.pos.z = U.clamp(z.pos.z + p.dashDir.z * .9, -MAP.size / 2 + 2, MAP.size / 2 - 2);
          if (this.effects) this.effects.impact({ x: z.pos.x, y: z.pos.y + 1.0, z: z.pos.z }, { x: -p.dashDir.x, y: 0, z: -p.dashDir.z }, 'flesh');
          Audio3D_SFX.flesh(z.pos.x, z.pos.y + 1.0, z.pos.z);
        }
      },
      /* ЛКМ fires the minigun, ПКМ fires the laser, both independent and held */
      updateMech(dt, lmb, rmb) {
        const p = this.player;
        // --- minigun (slot 2) ---
        const mg = p.inv[2];
        if (mg && mg.id === 'mechMinigun' && lmb) {
          const def = WEAPONS.mechMinigun;
          if (p.spinT < 1) { p.spinT = Math.min(1, (p.spinT || 0) + dt / (def.spinUp || .55)); }
          p.applyBarrelSpin();
          if (p.spinT >= 1 && mg.mag > 0) {
            p.fireCd = p.fireCd || 0;
            if (p.fireCd <= 0 && p.deployT <= 0 && p.reloadT <= 0) {
              this.fireWeaponAt('mechMinigun', def, mg, 'right');
              p.fireCd = 60 / def.rpm;
              this._mgRecoil = .5;
            }
          }
        } else if (mg && mg.id === 'mechMinigun') {
          p.spinT = Math.max(0, (p.spinT || 0) - dt / ((WEAPONS.mechMinigun.spinUp || .55) * 1.4));
        }
        // --- hyper laser (slot 1) ---
        const lz = p.inv[1];
        if (lz && lz.id === 'mechLaser' && rmb) {
          const def = WEAPONS.mechLaser;
          if (p.fireCd2 === undefined) p.fireCd2 = 0;
          p.fireCd2 -= dt;
          if (p.fireCd2 <= 0 && lz.mag > 0 && p.deployT <= 0) {
            this.fireWeaponAt('mechLaser', def, lz, 'left');
            p.fireCd2 = 60 / def.rpm;
            this._lzRecoil = .7;
          }
        }
      },
      /* fire a specific weapon (by id) without switching the held slot.
         `mechSide` selects which chassis arm the shot leaves (right=minigun,
         left=laser); when omitted the normal view-model muzzle is used. */
      fireWeaponAt(id, def, w, mechSide) {
        const p = this.player;
        if (w.mag !== Infinity) w.mag--;
        p.bulletsFired++;
        const origin = this.eyePos();
        const baseDir = this.cameraDir();
        const spread = (def.spread || 0) + (p.spread || 0) * .5;
        const pellets = def.pellets || 1;
        const muzzleWorld = mechSide ? this.mechMuzzleWorldPos(mechSide) : this.muzzleWorldPos();
        p.flashT = .05;
        const pelletDirs = [];
        for (let i = 0; i < pellets; i++) {
          const dir = this.spreadDirection(baseDir, spread, pellets > 1);
          pelletDirs.push(dir);
          this.traceShot(origin, dir, def, false, muzzleWorld);
        }
        p.spread = Math.min(.09, p.spread + (def.recoil || 0) * .0055);
        p.recoil += (def.recoil || 0) * .0042;
        p.viewPunchP += (def.recoil || 0) * .0028;
        Audio3D_SFX.shot(def.sound || 'rifle');
        if (this.effects) this.effects.muzzleSmoke(muzzleWorld.x, muzzleWorld.y, muzzleWorld.z, baseDir);
        // third-person: let the peer draw the mech's tracers/muzzle flashes too
        if (this.mode === CS.MODE.ONLINE && Net.connected) {
          Net.send({
            t: 'shot', wid: id, dirs: pelletDirs, ox: origin.x, oy: origin.y, oz: origin.z,
            dx: baseDir.x, dy: baseDir.y, dz: baseDir.z, sp: spread, mech: 1
          });
        }
      },

      /* ТЕСЛА-ПУШКА: hits the first target, then arcs from it to the nearest
       * other zombies, damage decaying with every jump. */
      fireTesla(def, muzzle, origin, dir) {
        const range = def.range || 70;
        let hit = null, hitZ = null;
        if (this.horde) for (const z of this.horde.list) {
          if (!z.alive || z.dying) continue;
          const h = rayZombie(origin, dir, z, range);
          if (h && (!hit || h.t < hit.t)) { hit = h; hitZ = z; }
        }
        // opponents along the same bolt (online)
        let hitP = null;
        if (this.mode === CS.MODE.ONLINE) {
          const hp = this.rayRemoteAny(origin, dir, range);
          if (hp) hitP = hp;
        }
        const wall = this.world.raycast(origin, dir, range, ['ground']);
        const wallT = wall ? wall.t : Infinity;
        const zt = hit ? hit.t : Infinity;
        const pt = hitP ? hitP.t : Infinity;
        // is a player the closest thing in front of the wall?
        const playerFirst = hitP && pt < zt && pt < wallT;
        let end;
        if (playerFirst) {
          end = { x: origin.x + dir.x * pt, y: origin.y + dir.y * pt, z: origin.z + dir.z * pt };
          const hs = hitP.part === 'head';
          this.sendPvpHit(def.dmg, hitP.part, hs, hitP.rp, 'tesla');
          // fork to any other opponents nearby, decaying, mirroring the zombie chain
          let src = hitP, prevPoint = end, dmg = def.dmg * .7;
          const hitIds = {}; hitIds[hitP.rp.peerId] = 1;
          for (let c = 0; c < (def.chain || 4); c++) {
            let next = null, nd = 1e9, npt = null;
            for (const rp of this.remotePlayers) {
              if (!rp.alive || hitIds[rp.peerId]) continue;
              const d = Math.hypot(rp.pos.x - src.point.x, rp.pos.z - src.point.z);
              if (d < (def.chainRange || 10) && d < nd) { nd = d; next = rp; npt = { x: rp.pos.x, y: rp.pos.y + 1.2, z: rp.pos.z }; }
            }
            if (!next) break;
            this.sendPvpHit(dmg, 'body', false, next, 'tesla');
            this.effects.bolt(prevPoint, npt, 0x39e6ff);
            prevPoint = npt; hitIds[next.peerId] = 1; src = { point: npt }; dmg *= .8;
          }
          this.effects.bolt(muzzle, end, 0x39e6ff);
          UI.hitmark(true);
        } else if (hit && hitZ && hit.t < wallT) {
          end = { x: origin.x + dir.x * hit.t, y: origin.y + dir.y * hit.t, z: origin.z + dir.z * hit.t };
          let src = hitZ, prevPoint = end, dmg = def.dmg;
          const hitIds = { };
          hitIds[src.id] = 1;
          for (let c = 0; c <= (def.chain || 4); c++) {
            // NOTE: pass the base damage and let takeDamage() apply the head/limb
            // multiplier once — pre-multiplying by headMul here double-counted it.
            src.takeDamage(dmg, c === 0 ? hit.part : 'body', dir);
            this.player.damageDealt += dmg;
            // find the nearest not-yet-hit zombie within the chain radius
            let next = null, nd = 1e9, npt = null;
            for (const z of this.horde.list) {
              if (!z.alive || z.dying || hitIds[z.id]) continue;
              const d = Math.hypot(z.pos.x - src.pos.x, z.pos.z - src.pos.z);
              if (d < (def.chainRange || 9) && d < nd) {
                nd = d; next = z; npt = { x: z.pos.x, y: z.pos.y + 1.0 * z.scale, z: z.pos.z };
              }
            }
            if (!next) break;
            this.effects.bolt(prevPoint, npt, 0x39e6ff);
            prevPoint = npt; hitIds[next.id] = 1; src = next; dmg *= .82;
          }
          this.effects.bolt(muzzle, end, 0x39e6ff);
          UI.hitmark(true);
        } else {
          end = wall ? wall.point : { x: origin.x + dir.x * range, y: origin.y + dir.y * range, z: origin.z + dir.z * range };
          this.effects.bolt(muzzle, end, 0x39e6ff);
          UI.hitmark(false);
        }
        Audio3D_SFX.laser(muzzle.x, muzzle.y, muzzle.z);
        this._hitmarkT = U.now();
      },

      /* ЗЕРКАЛЬНАЯ ПУШКА: drop portals on the surface you aim at. Anything that
       * reaches the first gate comes out of the second. */
      placePortal(def, origin, dir) {
        if (this.mode === CS.MODE.ONLINE) { UI.toast('Порталы — только в оффлайне', '#ff9d21'); return; }
        const range = def.range || 60;
        const wall = this.world.raycast(origin, dir, range, ['ground']);
        const pt = wall ? wall.point : { x: origin.x + dir.x * range, y: origin.y + dir.y * range, z: origin.z + dir.z * range };
        const n = wall ? wall.normal : { x: -dir.x, y: -dir.y, z: -dir.z };
        this.portals = this.portals || [];
        if (this.portals.length >= 2) this.removePortal(0);
        const color = this.portals.length === 0 ? 0x7be0ff : 0xff7be0;
        const mesh = this.buildPortalMesh(pt, n, color);
        this.portals.push({
          pos: { x: pt.x + n.x * .06, y: pt.y + n.y * .06, z: pt.z + n.z * .06 },
          normal: n, life: 22, color: color, mesh: mesh
        });
        Audio3D_SFX.laser(origin.x, origin.y, origin.z);
        UI.toast(this.portals.length === 1 ? 'Портал A открыт' : 'Портал B открыт · шагните в него', color === 0x7be0ff ? '#7be0ff' : '#ff7be0');
      },

      buildPortalMesh(pt, n, color) {
        const g = new THREE.Group();
        const R = (WEAPONS.portal.portalR || 1.9);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(R, .10, 8, 30),
          new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false }));
        const disc = new THREE.Mesh(new THREE.CircleGeometry(R * .92, 28),
          new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: .16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
        g.add(ring); g.add(disc);
        const nv = new THREE.Vector3(n.x, n.y, n.z);
        if (nv.lengthSq() < 1e-6) nv.set(0, 1, 0);
        nv.normalize();
        g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), nv);
        g.position.set(pt.x + nv.x * .06, pt.y + nv.y * .06, pt.z + nv.z * .06);
        g.renderOrder = 3;
        this.scene.add(g);
        return g;
      },

      removePortal(idx) {
        const p = this.portals && this.portals[idx];
        if (!p) return;
        if (p.mesh.parent) p.mesh.parent.remove(p.mesh);
        p.mesh.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
        this.portals.splice(idx, 1);
      },

      clearPortals() {
        if (!this.portals) return;
        while (this.portals.length) this.removePortal(0);
      },

      updatePortals(dt) {
        if (!this.portals || this.portals.length !== 2) {
          if (this.portals) this.portals.forEach(p => p.mesh.rotation.z += dt);
          return;
        }
        for (const p of this.portals) { p.life -= dt; p.mesh.rotation.z += dt * 1.6; }
        for (let i = this.portals.length - 1; i >= 0; i--) {
          if (this.portals[i].life <= 0) { this.removePortal(i); }
        }
        if (this.portals.length !== 2) return;
        const A = this.portals[0], B = this.portals[1];
        const R = WEAPONS.portal.portalR || 1.9;
        // zombies fall through
        if (this.horde) for (const z of this.horde.list) {
          if (!z.alive || z.dying || (z.portalCd || 0) > 0) continue;
          for (const pair of [[A, B], [B, A]]) {
            const from = pair[0], to = pair[1];
            const d = Math.hypot(z.pos.x - from.pos.x, z.pos.z - from.pos.z);
            if (d < R * .7) {
              z.pos.x = to.pos.x + to.normal.x * 1.1;
              z.pos.y = to.pos.y + to.normal.y * 1.1;
              z.pos.z = to.pos.z + to.normal.z * 1.1;
              z.portalCd = .6;
              break;
            }
          }
        }
        // and the player
        this._portalCd = Math.max(0, (this._portalCd || 0) - dt);
        const pl = this.player;
        if (this._portalCd <= 0) {
          for (const pair of [[A, B], [B, A]]) {
            const from = pair[0], to = pair[1];
            const d = Math.hypot(pl.pos.x - from.pos.x, pl.pos.z - from.pos.z);
            if (d < R * .7 && Math.abs(pl.pos.y - from.pos.y) < 2.4) {
              pl.pos.x = to.pos.x + to.normal.x * 1.1;
              pl.pos.y = to.pos.y + to.normal.y * 1.1 + .05;
              pl.pos.z = to.pos.z + to.normal.z * 1.1;
              pl.vel.x = pl.vel.y = pl.vel.z = 0;
              this._portalCd = .8;
              Audio3D_SFX.pickup();
              this.effects.spark({ x: to.pos.x, y: to.pos.y, z: to.pos.z }, to.normal);
              break;
            }
          }
        }
      },

      /* ДРОН-ТУРЕЛЬ: summons a companion that flies beside you and shoots. */
      toggleTurretDrone(def) {
        if (this.turretDrone) { this.removeTurretDrone(); UI.toast('Дрон-турель отозван', '#ff9d21'); return; }
        const p = this.player;
        const mesh = buildDroneModel();
        mesh.scale.setScalar(.85);
        const start = { x: p.pos.x, y: p.pos.y + 2.2, z: p.pos.z };
        mesh.position.set(start.x, start.y, start.z);
        this.scene.add(mesh);
        this.turretDrone = {
          mesh: mesh, pos: start, life: 45, fireCd: 0, yaw: 0,
          dmg: def.turretDmg || 46, cd: def.turretCd || .16, range: def.turretRange || 46
        };
        Audio3D_SFX.droneLaunch && Audio3D_SFX.droneLaunch();
        UI.toast('Дрон-турель на связи', '#4ad6ff');
      },

      removeTurretDrone() {
        const td = this.turretDrone;
        if (!td) return;
        if (td.mesh.parent) td.mesh.parent.remove(td.mesh);
        td.mesh.traverse(o => { if (o.geometry) o.geometry.dispose(); });
        this.turretDrone = null;
      },

      updateTurretDrone(dt) {
        const td = this.turretDrone;
        if (!td) return;
        const p = this.player;
        td.life -= dt;
        if (td.life <= 0) { this.removeTurretDrone(); UI.toast('Дрон-турель сел (ждите перезарядки)', '#ff9d21'); return; }
        // hover just behind the player's right shoulder
        const tx = p.pos.x - Math.sin(p.yaw + .7) * 2.2;
        const tz = p.pos.z - Math.cos(p.yaw + .7) * 2.2;
        const gy = (this.world.groundAt(tx, tz, p.pos.y + 5) || 0) + 2.1;
        td.pos.x = U.lerp(td.pos.x, tx, 1 - Math.pow(.02, dt));
        td.pos.y = U.lerp(td.pos.y, gy, 1 - Math.pow(.04, dt));
        td.pos.z = U.lerp(td.pos.z, tz, 1 - Math.pow(.02, dt));
        td.mesh.position.set(td.pos.x, td.pos.y, td.pos.z);
        // spin the rotors fast while hovering
        td.rotorSpin = (td.rotorSpin || 0) + dt * 40;
        const rot = td.mesh.userData.rotors || [];
        for (const r of rot) r.rotation.y = td.rotorSpin;
        // acquire the nearest enemy (zombie or, online, an opponent)
        let best = null, bd = 1e9, bestRemote = false;
        if (this.horde) for (const z of this.horde.list) {
          if (!z.alive || z.dying) continue;
          const d = Math.hypot(z.pos.x - td.pos.x, z.pos.z - td.pos.z);
          if (d < td.range && d < bd) { bd = d; best = z; bestRemote = false; }
        }
        if (this.mode === CS.MODE.ONLINE) for (const rp of this.remotePlayers) {
          if (!rp.alive) continue;
          const d = Math.hypot(rp.pos.x - td.pos.x, rp.pos.z - td.pos.z);
          if (d < td.range && d < bd) { bd = d; best = rp; bestRemote = true; }
        }
        if (!best) { td.fireCd = 0; return; }
        const to = { x: best.pos.x, y: best.pos.y + (bestRemote ? 1.2 : 1.0 * best.scale), z: best.pos.z };
        td.mesh.lookAt(to.x, to.y, to.z);
        td.fireCd -= dt;
        if (td.fireCd <= 0) {
          td.fireCd = td.cd;
          if (bestRemote) {
            this.sendPvpHit(td.dmg, 'body', false, best, 'turret');
          } else {
            best.takeDamage(td.dmg, 'body', { x: 0, y: 0, z: 0 });
            this.player.damageDealt += td.dmg;
          }
          this.effects.tracer({ x: td.pos.x, y: td.pos.y, z: td.pos.z }, to, true, .6);
          Audio3D_SFX.shot('smg', td.pos.x, td.pos.y, td.pos.z);
        }
      },

      /* АБСОЛЮТНЫЙ НОЛЬ: chills everything in the blast; chilled bodies shatter. */
      freezeAt(center, R, seconds, dmg) {
        if (!this.horde) { /* still affect online opponents below */ }
        else for (const z of this.horde.list) {
          if (!z.alive || z.dying || z.isBoss) continue;     // bosses shrug it off
          const d = Math.hypot(z.pos.x - center.x, z.pos.z - center.z);
          if (d > R) continue;
          z.takeDamage(dmg * (1 - (d / R) * .5), 'body', { x: 0, y: 0, z: 0 });
          if (z.alive && !z.dying) {
            if (typeof z.freeze === 'function') z.freeze(seconds);
            else { z.frozen = true; z.freezeT = Math.max(z.freezeT || 0, seconds); }
          }
        }
        if (this.mode === CS.MODE.ONLINE) {
          for (const rp of this.remotePlayers) {
            if (!rp.alive) continue;
            const d = Math.hypot(rp.pos.x - center.x, rp.pos.z - center.z);
            if (d <= R) this.sendPvpHit(dmg * (1 - (d / R) * .5), 'body', false, rp, 'freeze');
          }
        }
      },

      updateFreezeShatter(dt) {
        if (!this.horde) return;
        for (const z of this.horde.list) {
          if (!z.frozen || z.dying) continue;
          z.freezeT -= dt;
          if (z.freezeT <= 0) { z.frozen = false; z.freezeBank = 0; }
        }
      },

      /* РОЙ: the hive hatches a swarm of homing kamikaze drones. */
      releaseHive(center, n) {
        this.hiveDrones = this.hiveDrones || [];
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          const mesh = buildDroneModel();
          mesh.scale.setScalar(.6);
          mesh.position.set(center.x, center.y, center.z);
          this.scene.add(mesh);
          this.hiveDrones.push({
            mesh: mesh, pos: { x: center.x, y: center.y, z: center.z }, life: 9,
            target: null, vel: { x: Math.cos(a) * 4, y: 2.5, z: Math.sin(a) * 4 }, dmg: 130
          });
        }
        this.effects.explosion(center.x, center.y, center.z, 1.6, [0xffc94a, 0x3a2406]);
        Audio3D_SFX.bananaSplat(center.x, center.y, center.z);
      },

      nearestZombie(x, z, r) {
        if (!this.horde) return null;
        let best = null, bd = r * r;
        for (const zz of this.horde.list) {
          if (!zz.alive || zz.dying) continue;
          const d = (zz.pos.x - x) * (zz.pos.x - x) + (zz.pos.z - z) * (zz.pos.z - z);
          if (d < bd) { bd = d; best = zz; }
        }
        return best;
      },

      /* nearest enemy for the hive drones: a zombie, or an opponent online */
      nearestEnemy(x, z, r) {
        let best = null, bd = r * r;
        if (this.horde) for (const zz of this.horde.list) {
          if (!zz.alive || zz.dying) continue;
          const d = (zz.pos.x - x) * (zz.pos.x - x) + (zz.pos.z - z) * (zz.pos.z - z);
          if (d < bd) { bd = d; best = zz; }
        }
        if (this.mode === CS.MODE.ONLINE) for (const rp of this.remotePlayers) {
          if (!rp.alive) continue;
          const d = (rp.pos.x - x) * (rp.pos.x - x) + (rp.pos.z - z) * (rp.pos.z - z);
          if (d < bd) { bd = d; best = rp; }
        }
        return best;
      },

      updateHives(dt) {
        if (!this.hiveDrones || !this.hiveDrones.length) return;
        for (let i = this.hiveDrones.length - 1; i >= 0; i--) {
          const hd = this.hiveDrones[i];
          hd.life -= dt;
          if (!hd.target || !hd.target.alive || hd.target.dying) { hd.target = this.nearestEnemy(hd.pos.x, hd.pos.z, 32); hd.targetIsRemote = !!(hd.target && hd.target.isRemotePlayer); }
          const tgtIsRemote = hd.targetIsRemote || !!(hd.target && hd.target.isRemotePlayer);
          if (hd.target) {
            const ty = hd.target.pos.y + (tgtIsRemote ? 1.2 : 1.0 * hd.target.scale);
            const to = { x: hd.target.pos.x - hd.pos.x, y: ty - hd.pos.y, z: hd.target.pos.z - hd.pos.z };
            const l = Math.hypot(to.x, to.y, to.z) || 1, sp = 24;
            hd.vel.x = U.lerp(hd.vel.x, to.x / l * sp, 1 - Math.pow(.05, dt));
            hd.vel.y = U.lerp(hd.vel.y, to.y / l * sp, 1 - Math.pow(.05, dt));
            hd.vel.z = U.lerp(hd.vel.z, to.z / l * sp, 1 - Math.pow(.05, dt));
          } else hd.vel.y -= 6 * dt;
          hd.pos.x += hd.vel.x * dt; hd.pos.y += hd.vel.y * dt; hd.pos.z += hd.vel.z * dt;
          hd.mesh.position.set(hd.pos.x, hd.pos.y, hd.pos.z);
          const vl = Math.hypot(hd.vel.x, hd.vel.y, hd.vel.z) || 1;
          hd.mesh.lookAt(hd.pos.x + hd.vel.x / vl, hd.pos.y + hd.vel.y / vl, hd.pos.z + hd.vel.z / vl);
          hd.mesh.rotateZ(dt * 9);
          hd.rotorSpin = (hd.rotorSpin || 0) + dt * 55;
          const hrot = hd.mesh.userData.rotors || [];
          for (const r of hrot) r.rotation.y = hd.rotorSpin;
          let boom = hd.life <= 0;
          if (hd.target) {
            const ty = hd.target.pos.y + (tgtIsRemote ? 1.2 : 1.0 * hd.target.scale);
            const dd = Math.hypot(hd.target.pos.x - hd.pos.x, ty - hd.pos.y, hd.target.pos.z - hd.pos.z);
            if (dd < 1.1) boom = true;
          }
          if (boom) {
            if (tgtIsRemote) {
              // a hive drone that caught an opponent: damage + a visible blast
              if (hd.target.alive) this.sendPvpHit(hd.dmg, 'body', false, hd.target, 'hive');
            } else if (hd.target && hd.target.alive) {
              hd.target.takeDamage(hd.dmg, 'body', { x: 0, y: 0, z: 0 });
              this.player.damageDealt += hd.dmg;
            }
            this.effects.explosion(hd.pos.x, hd.pos.y, hd.pos.z, 2.2, [0xffc94a, 0x2a1a05]);
            Audio3D_SFX.explosionAt(hd.pos.x, hd.pos.y, hd.pos.z);
            if (this.mode === CS.MODE.ONLINE && Net.connected) {
              Net.send({ t: 'boom', from: Net.selfId(), x: +hd.pos.x.toFixed(2), y: +hd.pos.y.toFixed(2), z: +hd.pos.z.toFixed(2), r: 2.2, c: [0xffc94a, 0x2a1a05] });
            }
            if (hd.mesh.parent) hd.mesh.parent.remove(hd.mesh);
            hd.mesh.traverse(o => { if (o.geometry) o.geometry.dispose(); });
            this.hiveDrones.splice(i, 1);
          }
        }
      },

      clearHiveDrones() {
        if (!this.hiveDrones) return;
        for (const hd of this.hiveDrones) {
          if (hd.mesh.parent) hd.mesh.parent.remove(hd.mesh);
          hd.mesh.traverse(o => { if (o.geometry) o.geometry.dispose(); });
        }
        this.hiveDrones.length = 0;
      },

      /* ХРОНО-ПУШКА: a bubble in which the horde moves in slow motion. */
      openChrono(center, R, life, slow) {
        this.chronoFields = this.chronoFields || [];
        this.chronoFields.push({ pos: { x: center.x, y: center.y, z: center.z }, R: R, life: life, slow: slow || .16 });
        this._chronoUsed = true;
      },

      updateChronoFields(dt) {
        if (!this._chronoUsed) return;
        const fs = this.chronoFields;
        // reset every frame, then re-apply for whoever is inside a live bubble
        if (this.horde) for (const z of this.horde.list) z.speedMul = 1;
        if (!fs || !fs.length) { this._chronoUsed = false; return; }
        for (let i = fs.length - 1; i >= 0; i--) {
          const f = fs[i];
          f.life -= dt;
          if (f.life <= 0) { fs.splice(i, 1); continue; }
          if (this.horde) for (const z of this.horde.list) {
            if (!z.alive || z.dying) continue;
            const d = Math.hypot(z.pos.x - f.pos.x, z.pos.z - f.pos.z);
            if (d < f.R && Math.abs(z.pos.y - f.pos.y) < f.R) z.speedMul = Math.min(z.speedMul, f.slow);
          }
        }
        if (!fs.length) this._chronoUsed = false;
      },

      clearChrono() {
        if (this.chronoFields) this.chronoFields.length = 0;
        if (this._chronoUsed && this.horde) for (const z of this.horde.list) z.speedMul = 1;
        this._chronoUsed = false;
      },

      /* КИСЛОТОМЁТ / АБСОЛЮТНЫЙ НОЛЬ: decals that keep working after they land. */
      updateFields(dt) {
        if (!this.effects || !this.effects.fields.length) return;
        const fields = this.effects.fields;
        for (let i = fields.length - 1; i >= 0; i--) {
          const m = fields[i];
          const fd = m.userData.damaging;
          if (!fd) { fields.splice(i, 1); continue; }
          // the underlying decal may have faded away first
          if (this.effects.decals.indexOf(m) < 0) { fields.splice(i, 1); continue; }
          fd.left -= dt;
          if (fd.left <= 0) { fields.splice(i, 1); continue; }
          fd.tick -= dt;
          if (fd.tick > 0) continue;
          fd.tick = .5;
          if (!this.horde) { /* still hurt online opponents below */ }
          else for (const z of this.horde.list) {
            if (!z.alive || z.dying) continue;
            const d = Math.hypot(z.pos.x - fd.pos.x, z.pos.z - fd.pos.z);
            if (d > fd.radius) continue;
            if (fd.kind === 'acid') {
              const dealt = (fd.dps || 55) * .5;
              z.takeDamage(dealt, 'body', { x: 0, y: 0, z: 0 });
              this.player.damageDealt += dealt;
            } else if (fd.kind === 'frost' && !z.isBoss) {
              if (typeof z.freeze === 'function') z.freeze(1.0);
              else { z.frozen = true; z.freezeT = Math.max(z.freezeT || 0, 1.0); }
            }
          }
          /* ---- opponents standing in the pool (online) ---- */
          if (this.mode === CS.MODE.ONLINE && fd.kind === 'acid') {
            const dealt = (fd.dps || 55) * .5;
            for (const rp of this.remotePlayers) {
              if (!rp.alive) continue;
              const d = Math.hypot(rp.pos.x - fd.pos.x, rp.pos.z - fd.pos.z);
              if (d <= fd.radius) this.sendPvpHit(dealt, 'body', false, rp, 'acid');
            }
          }
        }
      },

      /* radial blast damage for rockets: falls off linearly to the edge */
      explode(center, pr) {
    const R = pr.splash, dmg = pr.splashDmg || pr.dmg;
    this.effects.explosion(center.x, center.y, center.z, R, pr.explosionColor, pr.nuke);
    /* взрыв РАЗРУШАЕТ карту в радиусе */
    this.breakMapAt(center.x, center.y, center.z, R * 1.05, dmg * .5);
    Audio3D_SFX.explosionAt(center.x, center.y, center.z);
    UI.hitmark(false);
    // tell the room so everyone sees and hears the rocket, not just the shooter
    if (this.mode === CS.MODE.ONLINE) {
      Net.send({ t: 'boom', from: Net.selfId(), x: +center.x.toFixed(2), y: +center.y.toFixed(2), z: +center.z.toFixed(2), r: R, c: pr.explosionColor || undefined, nk: pr.nuke ? 1 : undefined });
    }
    // zombies
    if (this.horde) {
      for (const z of this.horde.list) {
        if (!z.alive || z.dying) continue;
        const d = Math.hypot(z.pos.x - center.x, (z.pos.y + 1) - center.y, z.pos.z - center.z);
        if (d > R) continue;
        const k = 1 - d / R;
        const dealt = dmg * k;
        const killed = z.takeDamage(dealt, 'body', { x: 0, y: 0, z: 0 });
        this.player.damageDealt += dealt;
        if (killed) { /* scored in onZombieDied */ }
      }
    }
    // the opponents
    if (this.mode === CS.MODE.ONLINE) {
      for (const rp of this.remotePlayers) {
        if (!rp.alive) continue;
        const d = Math.hypot(rp.pos.x - center.x, (rp.pos.y + 1) - center.y, rp.pos.z - center.z);
        if (d <= R) {
          const k = 1 - d / R;
          // a rocket/banana blast is a projectile effect, so a shield can reflect it
          this.sendPvpHit(dmg * k, 'body', false, rp, pr && pr.kind ? pr.kind : undefined);
        }
      }
    }
    // splash back on the shooter, so point-blank rockets hurt. The atomic RPG
    // is exempt: it must never damage the player who fired it.
    if (!pr.noSelfDamage) {
      const p = this.player;
      const ds = Math.hypot(p.pos.x - center.x, (p.pos.y + 1) - center.y, p.pos.z - center.z);
      if (ds <= R * .8) {
        const k = 1 - ds / (R * .8);
        this.applyDamageToSelf(dmg * k * .45, center);
      }
    }
  },

  removeProjectile(i) {
    const pr = this.projectiles[i];
    if (pr && pr.mesh.parent) pr.mesh.parent.remove(pr.mesh);
    this.projectiles.splice(i, 1);
  },

  clearProjectiles() {
    for (const pr of this.projectiles) { if (pr.mesh.parent) pr.mesh.parent.remove(pr.mesh); }
    this.projectiles.length = 0;
    this.clearSlashProjectiles();
    this.clearRemoteProjectiles();
    this.clearRemoteMechMissiles();
    this.clearPortals();
    this.removeTurretDrone();
    this.clearHiveDrones();
    this.clearChrono();
    this.clearGrenades();
    this.clearMechMissiles();
    this.removeMechBody();
    this.clearParkedMech();
  },

  clearDrone() {
    if (!this.drone) return;
    const dr = this.drone;
    dr.mesh.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    if (dr.mesh.parent) dr.mesh.parent.remove(dr.mesh);
    this.drone = null;
  },

  spreadDirection(base, spread, wide) {    if (spread <= 0.00001) return { x: base.x, y: base.y, z: base.z };
    // build an orthonormal basis around the aim direction
    const up = Math.abs(base.y) > .95 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
    let rx = base.y * up.z - base.z * up.y, ry = base.z * up.x - base.x * up.z, rz = base.x * up.y - base.y * up.x;
    const rl = Math.hypot(rx, ry, rz) || 1; rx /= rl; ry /= rl; rz /= rl;
    const ux = ry * base.z - rz * base.y, uy = rz * base.x - rx * base.z, uz = rx * base.y - ry * base.x;
    const ang = Math.random() * Math.PI * 2;
    const mag = Math.sqrt(Math.random()) * spread;
    const ox = Math.cos(ang) * mag, oy = Math.sin(ang) * mag;
    const dx = base.x + rx * ox + ux * oy, dy = base.y + ry * ox + uy * oy, dz = base.z + rz * ox + uz * oy;
    const l = Math.hypot(dx, dy, dz) || 1;
    return { x: dx / l, y: dy / l, z: dz / l };
  },

  /* ============================================================
     ОМЕГА-МОЛОТ: удар СВЕРХУ ВНИЗ. Находим точку удара перед игроком (по земле
     или по ближайшему препятствию), затем в этой точке поднимаем УДАРНУЮ ВОЛНУ:
       • ломает блоки в радиусе slamBreakR
       • наносит огромный урон по площади всем зомби/соперникам (slamDmg)
       • отбрасывает и сбивает с ног
     ============================================================ */
  /* Отложенный удар омега-молота: ждём низшей точки замаха и только тогда бьём —
     так урон/волна совпадают с анимацией (а не срабатывают в момент нажатия). */
  updateSlamPending(dt) {
    const s = this._slamPending;
    if (s) {
      s.t -= dt;
      if (s.t <= 0) {
        this._slamPending = null;
        if (this.player && this.player.alive) this.meleeGroundSlam(s.origin, s.dir, s.def, s.muzzleWorld);
      }
    }
    /* ОТЛОЖЕННОЕ РАЗРУШЕНИЕ ульты рыцаря: карта ломается ровно в момент, когда
       начинается вторая (стеклянная) часть рёва рыцаря. */
    const b = this._knightUltBreak;
    if (b) {
      b.t -= dt;
      if (b.t <= 0) {
        this._knightUltBreak = null;
        for (let i = 0; i < b.fxs.length; i++) {
          const f = b.fxs[i];
          this.breakMapAt(f.x, f.y, f.z, f.r, b.dmg * 3);
        }
      }
    }
  },

  /* ============================================================
     МЕЧ РОКОЧУЩЕГО РЫЦАРЯ — УЛЬТА (ПКМ): SANGUINE SLASH.
     Экран чернеет, вперёд уходит гигантский белый разрез, который сносит всё
     по широкой прямой полосе: огромный урон зомби/соперникам и разрушение
     стен. Играет рёв рыцаря (встроенный mp3).
     ============================================================ */
  knightUlt() {
    const p = this.player;
    if (!p || !p.alive) return false;
    const def = p.def || {};
    if (!def.ult) return false;
    if (this.roundState !== 'live' || this.mode === CS.MODE.MENU) return false;
    const now = U.now();
    const cd = (def.ultCd || 9) * 1000;
    if (this._knightUltAt && now - this._knightUltAt < cd) {
      const left = Math.ceil((cd - (now - this._knightUltAt)) / 1000);
      UI.toast('Слеш через ' + left + 'с', '#c8c8d8'); Audio3D_SFX.deny && Audio3D_SFX.deny();
      return false;
    }
    this._knightUltAt = now;
    const R = def.ultR || 12;
    const dmg = def.ultDmg || 4000;
    const breakR = def.ultBreakR || 10;

    // экранный эффект: чёрный экран + гигантский белый слеш
    if (typeof UI !== 'undefined' && UI.knightUltStart) UI.knightUltStart((Math.random() * 9999) | 0);
    // рёв рыцаря
    if (Audio3D_SFX.knightSlash) Audio3D_SFX.knightSlash();
    // отдача камеры
    p.recoil = (p.recoil || 0) + .2;
    p.viewPunchP = (p.viewPunchP || 0) + .14;

    const dir = this.cameraDir();
    const origin = { x: p.pos.x, y: p.pos.y + 1.2, z: p.pos.z };
    const flat = Math.hypot(dir.x, dir.z) || 1;
    const fx = dir.x / flat, fz = dir.z / flat;      // плоское направление взгляда

    // «разрез» идёт широкой прямой полосой по направлению взгляда
    const reach = (def.range || 3) + R * 2.2;
    const halfW = R * .9;                            // полудлина луча разреза

    /* РАЗРУШЕНИЕ БЛОКОВ — ОТЛОЖЕННО: только когда начнётся вторая (стеклянно-
       кристальная) часть рёва рыцаря, т.е. через `ultBreakDelay` секунд. */
    const breakDelay = def.ultBreakDelay !== undefined ? def.ultBreakDelay : 2.4;
    this._knightUltBreak = {
      t: breakDelay, fxs: [], dmg: dmg, breakR: breakR, origin: origin, fx: fx, fz: fz, reach: reach
    };
    // точки полосы, где ломать карту в момент удара
    for (let s = 0; s < 6; s++) {
      const t = (s / 5) * reach;
      this._knightUltBreak.fxs.push({ x: origin.x + fx * t, y: origin.y, z: origin.z + fz * t, r: s === 2 ? breakR : breakR * .7 });
    }

    // урон по зомби: все, кто попал в полосу разреза (наносится СРАЗУ)
    let hits = 0;
    if (this.horde) {
      for (const z of this.horde.list) {
        if (!z.alive || z.dying) continue;
        const rx = z.pos.x - origin.x, rz = z.pos.z - origin.z;
        const along = rx * fx + rz * fz;             // вдоль разреза
        const side = Math.abs(-rx * fz + rz * fx);   // поперёк
        if (along < -1.5 || along > reach) continue;
        if (side > halfW) continue;
        const k = 1 - U.clamp(along / reach, 0, 1) * .4;
        const dealt = dmg * k;
        z._knightUltHit = true;                 // если погибнет — покажем SWOON
        z.takeDamage(dealt, 'body', { x: fx, y: .2, z: fz });
        if (z.alive && !z.dying) {
          z.vel.x += fx * 16; z.vel.z += fz * 16;
          if (typeof z.stagger === 'function') z.stagger(1.0);
        }
        this.player.damageDealt += dealt;
        hits++;
      }
    }
    // соперники (онлайн)
    if (this.mode === CS.MODE.ONLINE && !this.isCoop) {
      for (const rp of this.remotePlayers) {
        if (!rp.alive) continue;
        const rx = rp.pos.x - origin.x, rz = rp.pos.z - origin.z;
        const along = rx * fx + rz * fz, side = Math.abs(-rx * fz + rz * fx);
        if (along >= -1.5 && along <= reach && side <= halfW) this.sendPvpHit(dmg, 'body', false, rp, 'knight');
      }
    } else if (this.mode === CS.MODE.ONLINE && this.isCoop) {
      for (const rp of this.remotePlayers) {
        if (!rp.alive) continue;
        const rx = rp.pos.x - origin.x, rz = rp.pos.z - origin.z;
        const along = rx * fx + rz * fz, side = Math.abs(-rx * fz + rz * fx);
        if (along >= -1.5 && along <= reach && side <= halfW) this.sendPvpHit(dmg, 'body', false, rp, 'knight');
      }
    }
    // белый «разрез» в мире (объёмная вспышка вдоль полосы)
    if (this.effects && this.effects.knightSlashFx) {
      this.effects.knightSlashFx(origin, fx, fz, reach, R);
    }
    if (hits) UI.hitmark(true);
    p.bulletsFired += 1;
    return true;
  },

  /* ============================================================
     ГОСПОДИН ЦВЕТОВ — ПКМ: ЗАРЯД ФОРМЫ «ОМЕГА ФЛАВЕРИ».
     Игрок НЕ взлетает: он загорается белым, вокруг вьются лепестки, звучит
     реплика «omega flowery» и боевая музыка. Форма держится ВСЁ время, пока
     играет музыка; в ней ЛКМ-рывок перезаряжается 0.5с и заканчивается
     цветочными взрывами.
     ============================================================ */
  flowerUlt() {
    const p = this.player;
    if (!p || !p.alive) return false;
    const def = p.def || {};
    if (!def.flowerUlt) return false;
    if (this._flowerRush) return false;
    if (this.roundState !== 'live' || this.mode === CS.MODE.MENU) return false;
    if (this._omega) return false;
    const now = U.now();
    const cd = (def.ultCd || 14) * 1000;
    if (this._flowerUltAt && now - this._flowerUltAt < cd) {
      const left = Math.ceil((cd - (now - this._flowerUltAt)) / 1000);
      UI.toast('ОМЕГА ФЛАВЕРИ через ' + left + 'с', '#ff8ad0'); Audio3D_SFX.deny && Audio3D_SFX.deny();
      return false;
    }
    this._flowerUltAt = now;

    /* МУЗЫКА: запускаем трек; форма длится ровно столько, сколько он играет */
    let dur = 12.0;
    if (Audio3D_SFX.flowerMusic) {
      const info = Audio3D_SFX.flowerMusic();
      const rem = (Audio3D_SFX.flowerMusicRemaining ? Audio3D_SFX.flowerMusicRemaining() : null);
      if (rem) dur = U.clamp(rem, 4, 40);
      else if (info && info.dur) dur = U.clamp(info.dur - (info.startAt || 0), 4, 40);
    }
    /* реплика превращения в Омега Флавери + баннер (ключевая — перебивает) */
    if (Audio3D_SFX.flowerVoice && FLOWER_VOICE_OMEGA) Audio3D_SFX.flowerVoice(FLOWER_VOICE_OMEGA, 1.0, true);
    if (typeof UI !== 'undefined' && UI.omegaBanner) UI.omegaBanner();
    else if (typeof UI !== 'undefined' && UI.flowerUltBanner) UI.flowerUltBanner();

    this._omega = { t: 0, dur: dur, flashT: 0, petalT: 0 };
    if (this.effects && this.effects.flowerAura) this.effects.flowerAura(p.pos.x, p.pos.y + .15, p.pos.z, true);
    /* «загорается белым» на превращении */
    if (this.effects && this.effects.flowerFlash) this.effects.flowerFlash(p.pos.x, p.pos.y + 1, p.pos.z, p.yaw, 1.2);
    p.bulletsFired += 1;
    return true;
  },

  /* Форма «ОМЕГА ФЛАВЕРИ»: держится, пока играет музыка. Аура, белое свечение
     и лепестки вокруг игрока (он может свободно двигаться). */
  updateOmega(dt) {
    const o = this._omega;
    if (!o) return;
    const p = this.player;
    if (!p || !p.alive || this.roundState !== 'live') { this.endOmega(); return; }
    o.t += dt;
    /* аура следует за игроком */
    if (this.effects && this.effects._flowerAura) {
      const au = this.effects._flowerAura;
      au.position.set(p.pos.x, p.pos.y + .15, p.pos.z);
      au.rotation.y += dt * 13;
    }
    /* белое свечение (реже, чтобы не перегружать) */
    o.flashT -= dt;
    if (o.flashT <= 0 && this.effects && this.effects.flowerFlash) {
      o.flashT = .28 + Math.random() * .2;
      this.effects.flowerFlash(p.pos.x, p.pos.y + .9, p.pos.z, p.yaw, .35 + Math.random() * .3);
    }
    /* лепестки вьются вокруг игрока (умеренно) */
    o.petalT -= dt;
    if (o.petalT <= 0 && this.effects && this.effects.flowerPetals) {
      o.petalT = .10;
      const ang = o.t * 6;
      const rr = 1.7;
      this.effects.flowerPetals(p.pos.x + Math.cos(ang) * rr, p.pos.y + .6 + Math.sin(ang * 1.7) * .6, p.pos.z + Math.sin(ang) * rr,
        FLOWER_PROJ_COLORS[(Math.random() * FLOWER_PROJ_COLORS.length) | 0], 3);
      this.effects.flowerPetals(p.pos.x + Math.cos(ang + 3.1) * rr, p.pos.y + .6, p.pos.z + Math.sin(ang + 3.1) * rr,
        FLOWER_PROJ_COLORS[(Math.random() * FLOWER_PROJ_COLORS.length) | 0], 3);
    }
    /* конец формы — вместе с концом музыки */
    if (o.t >= o.dur) this.endOmega();
  },

  endOmega() {
    if (!this._omega) return;
    this._omega = null;
    if (this.effects && this.effects.flowerAura) this.effects.flowerAura(0, 0, 0, false);
  },

  /* ============================================================
     ЛКМ «ГОСПОДИНА ЦВЕТОВ» — БЫСТРЫЙ ПРЯМОЙ ПРОБИВАЮЩИЙ ТАРАН.
     Игрок стремительно летит вперёд, ЛОМАЯ блоки на своём пути, круша врагов
     и отбрасывая их. Неуязвим на всё время рывка.
     РЫВОК — ПО РЕПЛИКЕ: один войсклип = один рывок. Пока реплика звучит,
     следующий рывок недоступен; кулдаун — это лишь минимальный зазор.
     В ФОРМЕ ОМЕГА ФЛАВЕРИ: вдоль всего рывка идут цветочные взрывы.
     ============================================================ */
  flowerDash() {
    const p = this.player;
    if (!p || !p.alive) return false;
    const def = p.def || {};
    if (!def.flowerDash) return false;
    if (this._flowerRush) return false;
    if (this.roundState !== 'live' || this.mode === CS.MODE.MENU) return false;
    const omega = !!this._omega;
    const now = U.now();
    const cdMs = (omega ? (def.omegaDashCd || .5) : (def.dashCd || 1.4)) * 1000;
    if (this._flowerDashAt && now - this._flowerDashAt < cdMs) return false;
    /* 1 войсклип = 1 рывок: пока реплика звучит, рывок недоступен */
    if (this._flowerVoiceUntil && now < this._flowerVoiceUntil) return false;
    this._flowerDashAt = now;
    this._startFlowerRush(omega ? 'omegaDash' : 'dash');
    return true;
  },

  /* ---- ОБЩИЙ ЗАПУСК РЫВКА ----
     kind='dash' (ЛКМ): прямая стремительная атака с пробоем стены.
     kind='omegaDash' (ЛКМ в форме Омега Флавери): то же, но вдоль всего рывка
       происходят цветочные взрывы, в конце — большой взрыв; кулдаун 0.5с. */
  _startFlowerRush(kind) {
    const p = this.player;
    const def = p.def || {};
    const dir = this.cameraDir();
    const flat = Math.hypot(dir.x, dir.z) || 1;
    const fx = dir.x / flat, fz = dir.z / flat;
    const rx = -fz, rz = fx;                        // правый перпендикуляр
    const omega = kind === 'omegaDash';

    /* РЕПЛИКА-РЫВОК: именно она «открывает» следующий рывок. Как только
       реплика закончится — можно рвать снова. */
    let vDur = 1.0;
    if (Audio3D_SFX.flowerVoice) vDur = Audio3D_SFX.flowerVoice(pickFlowerVoice(FLOWER_VOICE_DASH_ALL), 1.0) || 1.0;
    this._flowerVoiceUntil = U.now() + vDur * 1000;
    p.recoil = (p.recoil || 0) + .3;
    p.viewPunchP = (p.viewPunchP || 0) + .2;

    this._flowerRush = {
      kind: kind, t: 0,
      dur: omega ? (def.dashDur || .55) : (def.dashDur || .5),
      ox: p.pos.x, oy: p.pos.y, oz: p.pos.z,
      baseY: p.pos.y,
      fx: fx, fz: fz, rx: rx, rz: rz,
      tfx: fx, tfz: fz,
      grabbed: [], grabR: (def.dashGrabR || 2.6) * (omega ? 1.5 : 1),
      dps: (def.dashDmg || 120) * (omega ? 5 : 4),
      finished: false, omega: omega,
      dist: omega ? (def.omegaDist || 34) : (def.dashSpeed || 34) * (def.dashDur || .5),
      R: def.ultR || 10, dmg: def.ultDmg || 1600, breakR: def.ultBreakR || 8
    };
    if (this.effects && this.effects.flowerAura) this.effects.flowerAura(p.pos.x, p.pos.y + .15, p.pos.z, true);
    if (typeof UI !== 'undefined' && UI.dashFx) UI.dashFx(true, omega);
    p.bulletsFired += 1;
  },

  /* ---- ЛКМ: прямая линия вперёд ---- */
  _flowerPath(u, st) {
    const along = st.dist * u;
    return { x: st.ox + st.fx * along, y: st.baseY, z: st.oz + st.fz * along };
  },

  /* ---- ПКМ: БОЛЬШОЙ ПРЯМОЙ РЫВОК ВПЕРЁД (без поворотов).
     Сначала — подъём на пару метров, затем стремительный прямой полёт вперёд
     с лёгкой дугой по высоте. В конце — взрыв в точке приземления. ---- */
  _flowerUltPath(p, st) {
    /* горизонт — строго вперёд, с мощным стартовым разгоном (ощущение рывка) */
    const ease = 1 - Math.pow(1 - p, 2);       // быстрый срыв с места, затем выбег
    const along = st.dist * ease;
    /* высота: держим набранную за заряд высоту, с небольшой дугой и пике в конце */
    const arch = Math.sin(p * Math.PI) * st.high * .35;
    const dive = p > .70 ? Math.pow((p - .70) / .30, 1.5) : 0;
    const y = Math.max(st.baseY + 1.4, st.baseY + 2.1 + arch - dive * (2.1 + st.high * .35));
    return { x: st.ox + st.fx * along, y: y, z: st.oz + st.fz * along };
  },

  /* ============================================================
     ОБНОВЛЕНИЕ РЫВКА «ГОСПОДИНА ЦВЕТОВ».
       kind='dash'      (ЛКМ): прямой быстрый таран — пробой стены, урон, отброс.
       kind='omegaDash' (ЛКМ в форме ОМЕГА ФЛАВЕРИ): то же, но ВДОЛЬ всего
         рывка постоянно происходят цветочные взрывы, а в конце — большой
         финальный взрыв с ударными волнами.
     ============================================================ */
  updateFlowerRush(dt) {
    const st = this._flowerRush;
    if (!st) return;
    const p = this.player;
    if (!p || !p.alive) { this.endFlowerRush(false); return; }
    st.t += dt;
    const omega = !!st.omega;

    /* аура лепестков у ног следует за игроком */
    if (this.effects && this.effects._flowerAura) {
      const au = this.effects._flowerAura;
      au.position.set(p.pos.x, p.pos.y + .15, p.pos.z);
      au.rotation.y += dt * (omega ? 15 : 11);
    }

    /* ---- ПРЯМОЙ ПРОБИВАЮЩИЙ ТАРАН ---- */
    const u = U.clamp(st.t / st.dur, 0, 1);
    const along = st.dist * u;
    const nx = st.ox + st.fx * along, nz = st.oz + st.fz * along;
    /* ПРОБОЙ СТЕНЫ: всё разрушаемое на пути крушится мгновенно */
    const gy = this.world.groundAt(nx, nz, st.baseY + 2);
    const ny = Math.max(st.baseY, gy || 0) + .1;
    this._flowerSweep(st, nx, ny, nz, dt);
    p.pos.x = nx; p.pos.z = nz;
    p.pos.y = U.lerp(p.pos.y, ny + .5, 1 - Math.pow(.02, dt));
    p.vel.x = p.vel.y = p.vel.z = 0;
    p.onGround = false;
    st.tfx = st.fx; st.tfz = st.fz;
    this._flowerTrack(p, st.fx, 0, st.fz, dt, st, false);

    if (omega) {
      /* В ФОРМЕ ОМЕГА ФЛАВЕРИ: ПОСТОЯННЫЕ цветочные взрывы вдоль рывка */
      st._boomT = (st._boomT || 0) - dt;
      if (st._boomT <= 0) {
        st._boomT = .16;
        const bx = p.pos.x + U.rand(-1.2, 1.2), bz = p.pos.z + U.rand(-1.2, 1.2);
        const bg = this.world.groundAt(bx, bz, p.pos.y + 3);
        const by = Math.max((bg || 0) + .8, p.pos.y - .3);
        if (this.effects) {
          this.effects.flowerNova(bx, by, bz, st.R * 1.3);
          this.effects.explosion(bx, by, bz, st.R * 1.2, [0xffd0f0, 0x2a0a20]);
          this.effects.groundWave(bx, by - .8, bz, st.R * .9);
        }
        Audio3D_SFX.explosionAt(bx, by, bz);
        this.breakMapAt(bx, by, bz, st.breakR * .7, st.dmg * .35);
        const R = st.R * 1.3;
        for (const z of (this.horde ? this.horde.list : [])) {
          if (!z.alive || z.dying) continue;
          const d = Math.hypot(z.pos.x - bx, z.pos.z - bz);
          if (d < R) { z.takeDamage(st.dmg * .3 * (1 - d / R * .5), 'body', { x: st.fx, y: .3, z: st.fz }); p.damageDealt += st.dmg * .3; }
        }
        if (this.effects && this.effects.flowerPetals) {
          this.effects.flowerPetals(bx, by, bz, FLOWER_PROJ_COLORS[(Math.random() * FLOWER_PROJ_COLORS.length) | 0], 4);
        }
      }
      /* лепестковый след */
      if (this.effects && this.effects.flowerPetals && Math.random() < .6) {
        this.effects.flowerPetals(p.pos.x - st.fx * 1.4, p.pos.y + .6, p.pos.z - st.fz * 1.4,
          FLOWER_PROJ_COLORS[(Math.random() * FLOWER_PROJ_COLORS.length) | 0], 4);
      }
    }

    if (u >= 1) {
      this._flowerThrow(p, st, false);
      if (omega) this._omegaBoom(p, st);        // большой финальный взрыв
      this.endFlowerRush(true);
    }
  },

  /* Большой финальный взрыв Омега Флавери: цветочная нова, вспышка, ударные
     волны и огромный урон по площади. */
  _omegaBoom(p, st) {
    const R = st.R, dmg = st.dmg, breakR = st.breakR;
    const cx = p.pos.x, cz = p.pos.z;
    const gy = this.world.groundAt(cx, cz, p.pos.y + 3);
    const cy = ((gy === null || gy === undefined) ? st.baseY : gy) + 1.0;
    if (Audio3D_SFX.flowerVoice && FLOWER_VOICE_SLAM) Audio3D_SFX.flowerVoice(FLOWER_VOICE_SLAM, 1.0, true);
    if (this.effects) {
      this.effects.flowerNova(cx, cy, cz, R * 1.8);
      this.effects.explosion(cx, cy, cz, R * 2.0, [0xffd0f0, 0x2a0a20]);
      this.effects.groundWave(cx, cy - 1.0, cz, R * 1.6);
      this.effects.groundWave(cx, cy - .5, cz, R * 2.8);
    }
    Audio3D_SFX.explosionAt(cx, cy, cz);
    this.breakMapAt(cx, cy, cz, breakR * 1.3, dmg * 1.5);
    const push = (list, isRemote) => {
      if (!list) return;
      for (const z of list) {
        if (!z.alive || z.dying) continue;
        const dx = z.pos.x - cx, dz = z.pos.z - cz, dy = (z.pos.y + 1) - cy;
        const d = Math.hypot(dx, dy, dz);
        if (d > R * 1.6) continue;
        const kk = U.clamp(1 - d / (R * 1.6), .2, 1);
        this._flowerRushDmg = true;
        if (isRemote) this.sendPvpHit(dmg, 'body', false, z, 'flower');
        else { z.takeDamage(dmg * (.6 + kk * .6), 'body', { x: st.fx, y: .3, z: st.fz }); p.damageDealt += dmg; }
        this._flowerRushDmg = false;
        if (z.alive && !z.dying) {
          z.vel.x = st.fx * 46 * (0.7 + kk); z.vel.z = st.fz * 46 * (0.7 + kk); z.vel.y = 10 * (0.5 + kk);
          if (typeof z.stagger === 'function') z.stagger(1.2);
        }
      }
    };
    push(this.horde && this.horde.list, false);
    if (this.mode === CS.MODE.ONLINE) push(this.remotePlayers, true);
    p.recoil = (p.recoil || 0) + .35; p.viewPunchP = (p.viewPunchP || 0) + .25;
  },

  /* ПРОБОЙ: крушит разрушаемые блоки в узкой полосе вокруг текущей точки пути
     (только те, что реально на пути, а не все подряд). */
  _flowerSweep(st, x, y, z, dt) {
    if (typeof damageMapAt !== 'function') return;
    const from = st._sweepP || { x: st.ox, z: st.oz };
    const d = Math.hypot(x - from.x, z - from.z);
    if (d < .15) { st._sweepP = { x: x, z: z }; return; }
    const steps = Math.min(12, Math.ceil(d / 1.0));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      damageMapAt(from.x + (x - from.x) * t, y, from.z + (z - from.z) * t, 2.2, 6000);
    }
    st._sweepP = { x: x, z: z };
  },

  /* Прицел-камера во время рывка: направление взгляда = направление движения. */
  _flowerTrack(p, dx, dy, dz, dt, st, ult) {
    const wantYaw = Math.atan2(-dx, -dz);
    const wantPitch = Math.asin(U.clamp(dy, -.98, .98));
    const f = 1 - Math.pow(0.0001, dt);
    p.yaw = U.angleLerp(p.yaw, wantYaw, f);
    p.pitch = U.lerp(p.pitch, U.clamp(wantPitch, -1.2, 1.2), f);
    /* ЗАХВАТ И ТАРАН: враги, попавшие близко к траектории, «прилипают» */
    st._tick = (st._tick || 0) + dt;
    const ticked = st._tick >= .1;
    if (ticked) st._tick = 0;
    const canGrab = st.grabbed.length < 8;
    const touch = (list, isRemote) => {
      if (!list) return;
      for (const z of list) {
        if (!z.alive || z.dying) continue;
        const ddx = z.pos.x - p.pos.x, ddz = z.pos.z - p.pos.z, ddy = (z.pos.y + .8) - p.pos.y;
        const d = Math.hypot(ddx, ddy, ddz);
        if (d > st.grabR) continue;
        /* таран: враг на пути получает урон — периодически, не каждый кадр */
        if (ticked) {
          this._flowerRushDmg = true;
          if (isRemote) this.sendPvpHit(st.dps * .1, 'body', false, z, 'flower');
          else {
            const wasAlive = z.alive && !z.dying;
            z.takeDamage(st.dps * .1, 'body', { x: dx, y: 0, z: dz });
            p.damageDealt += st.dps * .1;
            /* СОБЫТИЕ: убийство врага — реплика (канон: no no no / wow / fans) */
            if (wasAlive && (!z.alive || z.dying) && Audio3D_SFX.flowerVoice) {
              if (!st.killVoiceAt || st.t - st.killVoiceAt > 1.0) {
                st.killVoiceAt = st.t;
                Audio3D_SFX.flowerVoice(pickFlowerVoice(FLOWER_VOICE_KILL_ALL), 1.0);
              }
            }
          }
          this._flowerRushDmg = false;
        }
        if (z.alive && !z.dying && canGrab && !isRemote) {
          z._flowerGrabbed = true;
          st.grabbed.push(z);
          /* СОБЫТИЕ: захват — «heh, it's my Jarona» / «my jarona» / «leaf it to me» */
          if (!st.captureVoiced && Audio3D_SFX.flowerVoice) {
            st.captureVoiced = true;
            Audio3D_SFX.flowerVoice(pickFlowerVoice(FLOWER_VOICE_CAPTURE_ALL), 1.0);
          }
        }
      }
    };
    if (ticked || !st._touched) {
      st._touched = true;
      if (this.horde) touch(this.horde.list, false);
      if (this.mode === CS.MODE.ONLINE) touch(this.remotePlayers, true);
    }
    /* несём зацепленных */
    if (ult) {
      for (const z of st.grabbed) {
        if (!z.alive || z.dying) continue;
        const ang = st.t * 9;
        const tx = p.pos.x - st.tfx * 1.6 + Math.cos(ang) * .8;
        const tz = p.pos.z - st.tfz * 1.6 + Math.sin(ang) * .8;
        const ty = p.pos.y - 1.1;
        z.pos.x = U.lerp(z.pos.x, tx, 1 - Math.pow(.002, dt));
        z.pos.z = U.lerp(z.pos.z, tz, 1 - Math.pow(.002, dt));
        z.pos.y = U.lerp(z.pos.y, ty, 1 - Math.pow(.002, dt));
        z.vel.x = z.vel.y = z.vel.z = 0;
        if (typeof z.stagger === 'function') z.stagger(.9);
      }
    } else {
      for (const z of st.grabbed) {
        if (!z.alive || z.dying) continue;
        const tx = p.pos.x - st.fx * 1.5, tz = p.pos.z - st.fz * 1.5, ty = p.pos.y;
        z.pos.x = U.lerp(z.pos.x, tx, 1 - Math.pow(.02, dt));
        z.pos.z = U.lerp(z.pos.z, tz, 1 - Math.pow(.02, dt));
        z.pos.y = U.lerp(z.pos.y, ty, 1 - Math.pow(.02, dt));
        z.vel.x = z.vel.y = z.vel.z = 0;
        if (typeof z.stagger === 'function') z.stagger(.8);
      }
    }
  },

  /* ФИНАЛ УЛЬТЫ: удар ОБ ЗЕМЛЮ в конце большого рывка — цветочный взрыв и
     ударные волны, огромный урон по площади и отбрасывание врагов. */
  _flowerFinale(p, st) {
    if (st.finished) return;
    st.finished = true;
    const R = st.R, dmg = st.dmg, breakR = st.breakR;
    /* приземление — в точке конца рывка (впереди) */
    const cx = p.pos.x, cz = p.pos.z;
    const gy = this.world.groundAt(cx, cz, p.pos.y + 3);
    const cy = ((gy === null || gy === undefined) ? st.baseY : gy) + 1.0;
    p.pos.y = cy;                       // удар об землю
    /* ОСОБЫЙ ВОЙСКЛИП: «last jarona» — на финальном ударе об землю (перебивает) */
    if (Audio3D_SFX.flowerVoice && FLOWER_VOICE_SLAM) Audio3D_SFX.flowerVoice(FLOWER_VOICE_SLAM, 1.0, true);
    if (this.effects) {
      this.effects.flowerNova(cx, cy, cz, R * 1.6);
      this.effects.explosion(cx, cy, cz, R * 1.8, [0xffd0f0, 0x2a0a20]);
      this.effects.groundWave(cx, cy - 1.0, cz, R * 1.4);
      this.effects.groundWave(cx, cy - .5, cz, R * 2.6);
    }
    Audio3D_SFX.explosionAt(cx, cy, cz);
    this.breakMapAt(cx, cy, cz, breakR, dmg);
    this._flowerThrow(p, st, true, cy);
    p.recoil = (p.recoil || 0) + .35; p.viewPunchP = (p.viewPunchP || 0) + .25;
    this.endFlowerRush(true);
  },

  /* ОТБРОС: все враги вокруг получают урон и разлетаются; зацепленные —
     бросаются вперёд по направлению движения. */
  _flowerThrow(p, st, area, cyOverride) {
    const R = st.R, dmg = st.dmg;
    const cx = p.pos.x, cz = p.pos.z;
    const cy = (cyOverride !== undefined) ? cyOverride : p.pos.y;
    const fx = st.tfx, fz = st.tfz;
    const push = (list, isRemote) => {
      if (!list) return;
      for (const z of list) {
        if (!z.alive || z.dying) continue;
        const dx = z.pos.x - cx, dz = z.pos.z - cz, dy = (z.pos.y + 1) - cy;
        const d = Math.hypot(dx, dy, dz);
        const grabbed = z._flowerGrabbed;
        if (area) { if (d > R * 1.3 && !grabbed) continue; }
        else if (!grabbed && d > 3.2) continue;      // прямой рывок бьёт лишь зацепленных/вплотную
        const kk = area ? U.clamp(1 - d / (R * 1.3), .2, 1) : 1;
        this._flowerRushDmg = true;
        if (isRemote) this.sendPvpHit(dmg * (area ? (1 - d / R * .5) : .7), 'body', false, z, 'flower');
        else { z.takeDamage(dmg * (area ? (.5 + kk * .5) : .6), 'body', { x: fx, y: .3, z: fz }); p.damageDealt += dmg * .4; }
        this._flowerRushDmg = false;
        if (z.alive && !z.dying) {
          z.vel.x = fx * 44 * (0.7 + kk); z.vel.z = fz * 44 * (0.7 + kk);
          z.vel.y = 9 * (0.5 + kk);
          if (typeof z.stagger === 'function') z.stagger(1.2);
        }
        z._flowerGrabbed = false;
      }
    };
    push(this.horde && this.horde.list, false);
    if (this.mode === CS.MODE.ONLINE) push(this.remotePlayers, true);
    st.grabbed.length = 0;
  },

  endFlowerRush(done) {
    const st = this._flowerRush;
    if (st) {
      for (const z of st.grabbed) { if (z) z._flowerGrabbed = false; }
      this._flowerRush = null;
    }
    if (this.effects && this.effects.flowerAura && !this._omega) this.effects.flowerAura(0, 0, 0, false);
    if (typeof UI !== 'undefined' && UI.dashFx) UI.dashFx(false, false);
    const p = this.player;
    if (p) {
      /* СТРАХОВКА: если рывок закончился внутри геометрии — поднять наверх,
         иначе камера окажется внутри блока (чёрный экран). */
      let guard = 0;
      while (this.world.overlaps(p.pos.x, p.pos.y, p.pos.z, p.radius, p.height) && guard++ < 40) {
        p.pos.y += .35;
      }
      if (done) { p.vel.x *= .3; p.vel.z *= .3; }
    }
  },

  meleeGroundSlam(origin, dir, def, muzzleWorld) {
    const p = this.player;
    const R = def.slamR || 9;
    const dmg = def.slamDmg || 500;
    const breakR = def.slamBreakR || R * .85;
    // точка удара: чуть впереди игрока, на уровне земли под ней
    let sx = origin.x + dir.x * 3.0, sz = origin.z + dir.z * 3.0;
    sx = U.clamp(sx, -MAP.size / 2 + 2, MAP.size / 2 - 2);
    sz = U.clamp(sz, -MAP.size / 2 + 2, MAP.size / 2 - 2);
    let sy = (this.world.groundAt(sx, sz, origin.y + 3) || origin.y);
    const c = { x: sx, y: sy + .4, z: sz };

    // визуал: большая вспышка ударной волны + пыль + свет
    if (this.effects) {
      this.effects.explosion(c.x, c.y, c.z, R, [0xffd070, 0x2a2010]);
      this.effects.groundWave(c.x, sy + .05, c.z, R);
      for (let i = 0; i < 26; i++) {
        const a = U.rand(0, 6.28);
        this.effects.particle(c.x, c.y, c.z, Math.cos(a) * U.rand(4, 14), U.rand(1, 6), Math.sin(a) * U.rand(4, 14),
          U.rand(.08, .2), 'smoke', U.rand(.5, 1.2));
      }
    }
    Audio3D_SFX.explosionAt(c.x, c.y, c.z);
    /* удар встряхивает камеру: резкий подъём + боковой толчок */
    p.recoil = (p.recoil || 0) + .16;
    p.viewPunchP = (p.viewPunchP || 0) + .12;
    p.viewPunchY = (p.viewPunchY || 0) + U.rand(-.06, .06);

    // ломаем карту в радиусе (мгновенно)
    this.breakMapAt(c.x, c.y, c.z, breakR, dmg);

    // урон + отброс по зомби
    if (this.horde) {
      for (const z of this.horde.list) {
        if (!z.alive || z.dying) continue;
        const dx = z.pos.x - c.x, dz = z.pos.z - c.z, dy = (z.pos.y + 1) - c.y;
        const d = Math.hypot(dx, dy, dz);
        if (d > R) continue;
        const k = 1 - d / R;
        const dealt = dmg * (.5 + k * .5);
        z.takeDamage(dealt, 'body', { x: dx, y: dy, z: dz });
        if (z.alive && !z.dying) {
          const l = Math.max(Math.hypot(dx, dz), .01);
          z.vel.x += (dx / l) * 24 * k;
          z.vel.z += (dz / l) * 24 * k;
          if (z.vel.y !== undefined) z.vel.y += 7 * k;
          if (typeof z.stagger === 'function') z.stagger(1.0);
        }
        this.player.damageDealt += dealt;
      }
    }
    // соперники (онлайн, не кооп)
    if (this.mode === CS.MODE.ONLINE && !this.isCoop) {
      for (const rp of this.remotePlayers) {
        if (!rp.alive) continue;
        const d = Math.hypot(rp.pos.x - c.x, (rp.pos.y + 1) - c.y, rp.pos.z - c.z);
        if (d <= R) this.sendPvpHit(dmg * (.5 + (1 - d / R) * .5), 'body', false, rp, 'slam');
      }
    }
    // отдача: игрока слегка вдавливает в землю/подбрасывает вид
    if (this.effects) this.effects.slashTrail(c.x, c.y, c.z, 0, 1, 0, R * .5, 1, 0xffe0a0);
    p.bulletsHit++;
    if (this.mode === CS.MODE.ONLINE) this.traceRemotePlayer(origin, dir, def.range, def, dir);
  },

  traceShot(origin, dir, def, isMelee, muzzleWorld) {
    const p = this.player;
    const maxDist = def.range || 100;
    const end = { x: origin.x + dir.x * maxDist, y: origin.y + dir.y * maxDist, z: origin.z + dir.z * maxDist };
    // the worn skin's rarest tiers tint this shot's tracer (null = normal colour)
    const _shotCol = p && p.skinShot ? p.skinShot : null;

    // ---- melee ----
    if (isMelee) {
      /* ОМЕГА-МОЛОТ: удар СВЕРХУ ВНИЗ по точке перед игроком — ударная волна
         ломает блоки и наносит огромный урон по площади всем вокруг. Обрабатывается
         отдельно (это не обычный мах). */
      if (def.groundSlam) return this.meleeGroundSlam(origin, dir, def, muzzleWorld);
      /* БОЛЬШИЕ ХИТБОКСЫ: удар ближнего боя бьёт по КОНУСУ, а не по тонкому
         лучу — проверяем всех зомби в радиусе маха и в передней полусфере.
         Так мечом реально «размахиваешь» и задеваешь нескольких. */
      const reach = (def.range || 2.4) * 1.5;
      const halfArc = Math.cos(.9);                    // ~±52° по горизонтали
      const hitList = [];
      if (this.horde) {
        for (const z of this.horde.list) {
          if (!z.alive || z.dying) continue;
          const ocx = z.pos.x - origin.x, ocy = (z.pos.y + .9 * z.scale) - origin.y, ocz = z.pos.z - origin.z;
          const d2 = ocx * ocx + ocy * ocy + ocz * ocz;
          if (d2 > reach * reach) continue;
          const dist = Math.sqrt(d2) || 1;
          const fdot = (ocx * dir.x + ocy * dir.y + ocz * dir.z) / dist;
          if (fdot < halfArc) continue;                // не в передней полусфере
          hitList.push({ z: z, dist: dist });
        }
      }
      const wallHit = this.world.raycast(origin, dir, reach, ['ground']);
      const wallT = (wallHit && wallHit.t > .2) ? wallHit.t : Infinity;   // t≈0 — луч стартует в геометрии, игнор
      let any = false;
      /* БЛИЖНИЙ БОЙ ЛОМАЕТ КАРТУ: 6-8 ударов разрушают блок (урон = прочность/7). */
      if (wallHit && wallHit.box && wallHit.box.destructible && !wallHit.box.removed && typeof damageMapBox === 'function') {
        const broke = damageMapBox(wallHit.box, Math.max(6, wallHit.box.maxHp / 2));
        if (this.effects) this.effects.debrisBurst(wallHit.point.x, wallHit.point.y, wallHit.point.z, 0xb8b2a6, broke ? 1.1 : .5, wallHit.box._mat);
        if (broke) any = true;
      }
      for (const h of hitList) {
        if (wallT < h.dist - .35) continue;                  // за стеной
        const zb = h.z;
        // попадание в голову, если прицел выше груди
        const headY = zb.pos.y + 1.45 * zb.scale;
        const part = (origin.y > headY - .25 && h.dist < reach * .9) ? 'head' : 'body';
        /* если это меч рыцаря — пометим: при гибели покажем «DOWN» */
        if (def.melee && def.melee.indexOf('knightsword') === 0) zb._knightDown = true;
        zb.takeDamage(def.dmg, part, dir);
        if (def.knockback && zb.alive) { zb.vel.x += dir.x * def.knockback; zb.vel.z += dir.z * def.knockback; }
        const pt = { x: zb.pos.x, y: zb.pos.y + (part === 'head' ? 1.45 : .9) * zb.scale, z: zb.pos.z };
        this.hitEffect(pt, dir, part, part === 'head');
        Audio3D_SFX.hit(pt.x, pt.y, pt.z, part === 'head');
        any = true;
      }
      if (!any && wallHit && wallT < Infinity && this.effects) this.effects.impact(wallHit.point, wallHit.normal, 'concrete', (def.melee && def.melee.indexOf('knightsword') === 0) ? 'knight' : (p && p.skinTheme) || null);
      /* МОЗГ: ближний бой бьёт по колбам */
      if (typeof BrainBoss !== 'undefined' && BrainBoss.active) {
        const fh = BrainBoss.raycastFlask(origin, dir, reach);
        if (fh && (!wallHit || fh.t < wallT)) { BrainBoss.damageFlask(fh.index, def.dmg * 1.4); any = true; }
      }
      p.bulletsHit += hitList.length;
      // ПОЛОСА УДАРА: яркая дуга проносится перед игроком
      if (this.effects) {
        const meleeKind = def.melee || 'knife';
        const col = meleeKind === 'chainsaw' ? 0xffb347 : meleeKind === 'hammer' || meleeKind === 'axe' ? 0xffe08a : 0xffffff;
        this.effects.slashTrail(origin.x + dir.x * .7, origin.y + dir.y * .7 - .15, origin.z + dir.z * .7,
          dir.x, dir.y, dir.z, def.range + .7, p.swingSide || 1, col);
      }
      /* МЕЧ РОКОЧУЩЕГО РЫЦАРЯ: на КАЖДЫЙ удар — МИНИ-СЛЕШ. Только объёмный
         (3D) белый разрез в мире — без экранного оверлея и чёрного экрана.
         Разрушение блоков — ПО ВСЕЙ ПЛОЩАДИ слеша (диск перед игроком), а не
         только в точке прицела. */
      if (def.melee && def.melee.indexOf('knightsword') === 0) {
        const flat = Math.hypot(dir.x, dir.z) || 1;
        const fx = dir.x / flat, fz = dir.z / flat;
        if (this.effects && this.effects.knightSlashFx) this.effects.knightSlashFx(origin, fx, fz, 6.5, 3.2, true);
        if (Audio3D_SFX.knightCut) Audio3D_SFX.knightCut();
        /* III ЭТАП: слеш ВЫЛЕТАЕТ ВПЕРЁД белой полосой и бьёт врагов (x2 урон) */
        if (def.slashProj) this.spawnSlashProjectile(origin, fx, fz, dir, def);
        /* площадь слеша = диск радиусом ~radiusOfSlash, центр — впереди игрока
           на высоте глаз. Ломаем все разрушаемые блоки в этой области. */
        if (typeof damageMapAt === 'function') {
          const scx = origin.x + fx * 2.7, scy = origin.y + .1, scz = origin.z + fz * 2.7;
          damageMapAt(scx, scy, scz, 3.4, 60);
        }
      }
      /* ГОСПОДИН ЦВЕТОВ: ЛКМ — ЛЕПЕСТКОВЫЙ ХЛЫСТ. Радужный след удара, сноп
         лепестков в точке и разрушение блоков по площади взмаха. */
      if (def.flowerMelee) {
        const flat = Math.hypot(dir.x, dir.z) || 1;
        const fx = dir.x / flat, fz = dir.z / flat;
        if (this.effects && this.effects.flowerBurst) {
          const col = FLOWER_PROJ_COLORS[(p.swingSide || 1) > 0 ? 0 : 3];
          this.effects.flowerBurst(origin.x + fx * 2.6, origin.y - .2, origin.z + fz * 2.6, 2.6, col);
        }
        if (typeof damageMapAt === 'function') {
          damageMapAt(origin.x + fx * 2.4, origin.y - .3, origin.z + fz * 2.4, 2.6, 90);
        }
      }
      if (this.mode === CS.MODE.ONLINE) this.traceRemotePlayer(origin, dir, Math.min(def.range, maxDist), def, dir);
      return;
    }

    // ---- LASER: pierces EVERYTHING (zombies, players, cover) along the ray ----
    if (def.pierce) {
      const maxP = def.range || 200;
      // every zombie the beam passes through
      if (this.horde) {
        for (const z of this.horde.list) {
          if (!z.alive || z.dying) continue;
          const h = rayZombie(origin, dir, z, maxP);
          if (!h) continue;
          const hs = h.part === 'head';
          const dmg = def.dmg * (hs ? (def.headMul || 1) : h.part === 'legs' ? CFG.limbMultiplier : 1);
          z.takeDamage(dmg, h.part, dir);
          p.damageDealt += dmg;
        }
      }
      // every opponent in the room
      if (this.mode === CS.MODE.ONLINE) {
        for (const rp of this.remotePlayers) {
          if (!rp.alive) continue;
          const h = this.rayRemotePlayerFor(rp, origin, dir, maxP);
          if (!h) continue;
          const hs = h.part === 'head';
          const dmg = def.dmg * (hs ? (def.headMul || CFG.headshotMultiplier) : h.part === 'legs' ? CFG.limbMultiplier : 1);
          this.sendPvpHit(dmg, h.part, hs, rp);
        }
        const dHit = this.rayRemoteDroneAny(origin, dir, maxP);
        if (dHit) this.hitRemoteDrone(dHit.rp, dHit.point);
      }
      // the beam stops only on solid walls/floor, and scorches where it lands
      const wallHits = this.world.raycastAll(origin, dir, maxP);
      let beamEnd = end;
      if (wallHits.length) {
        beamEnd = wallHits[0].point;
        this.effects.impact(wallHits[0].point, wallHits[0].normal, 'metal');
        /* ЛАЗЕРНАЯ ПУШКА ЛОМАЕТ КАРТУ: попадание луча разрушает деталь + искры/осколки */
        const wb = wallHits[0].box;
        if (wb && wb.destructible && !wb.removed && typeof damageMapBox === 'function') {
          const broke = damageMapBox(wb, Math.max(12, wb.maxHp / 2));
          const hp = wallHits[0].point, hn = wallHits[0].normal || { x: -dir.x, y: -dir.y, z: -dir.z };
          if (this.effects) {
            for (let i = 0; i < (broke ? 6 : 3); i++) {
              this.effects.particle(hp.x, hp.y, hp.z,
                hn.x * U.rand(2, 8) + U.rand(-2, 2), U.rand(1, 5), hn.z * U.rand(2, 8) + U.rand(-2, 2),
                U.rand(.05, .13), 'spark', U.rand(.2, .55));
            }
            if (broke) this.effects.debrisBurst(hp.x, hp.y, hp.z, 0xb8b2a6, 1.0, wb._mat, 6);
          }
        }
      }
      p.bulletsHit++;
      // a proper laser beam (bright green core + glow) from muzzle to impact
      this.effects.laser(muzzleWorld, beamEnd);
      Audio3D_SFX.laser(muzzleWorld.x, muzzleWorld.y, muzzleWorld.z);
      UI.hitmark(false);
      this._hitmarkT = U.now();
      return;
    }

    // ---- bullets: walk through penetrable cover, stop at walls ----
    // The floor is included here (and pulled out below): bullets used to skip
    // the ground entirely, so shots into the floor left no impact or bullet hole.
    const allHits = this.world.raycastAll(origin, dir, maxDist);
    const wallHits = [];
    let groundHit = null;
    for (let i = 0; i < allHits.length; i++) {
      if (allHits[i].box.tag === 'ground') { if (!groundHit) groundHit = allHits[i]; }
      else wallHits.push(allHits[i]);
    }
    const zHit = this.horde ? this.horde.raycast(origin, dir, maxDist) : null;
    /* МОЗГ-ПОЖИРАТЕЛЬ: колбы разрушаемы — пуля бьёт по ближайшей на пути */
    const flaskHit = (typeof BrainBoss !== 'undefined' && BrainBoss.active)
      ? BrainBoss.raycastFlask(origin, dir, maxDist) : null;
    if (flaskHit && (!zHit || flaskHit.t < zHit.t)) {
      p.bulletsHit++;
      const dmg = (def.dmg || 30) * 2.2;
      this.effects.tracer(muzzleWorld, flaskHit.point, 1, true, _shotCol);
      Audio3D_SFX.hit(flaskHit.point.x, flaskHit.point.y, flaskHit.point.z, false);
      BrainBoss.damageFlask(flaskHit.index, dmg);
      p.damageDealt += dmg;
      return;
    }
    let dmgMul = 1;
    let stopT = maxDist;
    let stopNormal = null;
    let stopPoint = null;

    for (let i = 0; i < wallHits.length; i++) {
      const h = wallHits[i];
      if (zHit && zHit.t < h.t) break;             // zombie is in front of this wall
      const thick = (h.t2 !== undefined ? (h.t2 - h.t) : 1.0);
      const penetrable = (h.box.tag === 'cover' || h.box.tag === 'wood') && thick < 0.75 && dmgMul > .35;
      /* ПУЛИ РАЗРУШАЮТ карту: попадание наносит урон блоку — 10-15 пуль ломают
         деталь. Считаем урон пропорционально урону оружия. */
      if (h.box && h.box.destructible && !h.box.removed && typeof damageMapBox === 'function') {
        /* 2 попадания ломают блок. */
        const perHit = Math.max(6, h.box.maxHp / 2) * U.clamp((def.dmg || 30) / 35, .6, 1.4);
        const broke = damageMapBox(h.box, perHit);
        if (this.effects) {
          if (broke) this.effects.debrisBurst(h.point.x, h.point.y, h.point.z, 0xb8b2a6, 1.1, h.box._mat);
          else if (Math.random() < .22) this.effects.debrisBurst(h.point.x, h.point.y, h.point.z, 0xb8b2a6, .55, h.box._mat);
        }
      }
      if (penetrable) { dmgMul *= CFG.wallbangLoss; continue; }
      stopT = h.t; stopNormal = h.normal; stopPoint = h.point;
      break;
    }

    // a shot into the floor stops there and leaves a hole
    if (groundHit && groundHit.t < stopT && (!zHit || groundHit.t < zHit.t)) {
      stopT = groundHit.t; stopNormal = groundHit.normal; stopPoint = groundHit.point;
    }

    // the opponents (everyone else in the room) — в коопе свои не получают урон
    let pvpHit = null;
    let droneHit = null;
    if (this.mode === CS.MODE.ONLINE && !this.isCoop) {
      const dHit = this.rayRemoteDroneAny(origin, dir, maxDist);
      if (dHit) droneHit = dHit;
      pvpHit = this.rayRemoteAny(origin, dir, maxDist);
      // resolve below if it is closer than the wall and any zombie
      if (pvpHit && (zHit ? pvpHit.t < zHit.t || !zHit : true) && pvpHit.t <= stopT) {
        // ok
      } else pvpHit = null;
    }

    // an enemy drone in the air can be shot down
    if (droneHit && droneHit.t <= stopT && (!zHit || droneHit.t < zHit.t) && (!pvpHit || droneHit.t < pvpHit.t)) {
      p.bulletsHit++;
      this.hitRemoteDrone(droneHit.rp, droneHit.point);
      this.effects.tracer(muzzleWorld, droneHit.point, 1, true, _shotCol);
      return;
    }

    if (pvpHit && pvpHit.t <= stopT && (!zHit || pvpHit.t < zHit.t)) {
      // hit an opposing player
      p.bulletsHit++;
      const hs = pvpHit.part === 'head';
      const limb = pvpHit.part === 'legs';
      const partMul = hs ? (def.headMul || CFG.headshotMultiplier) : limb ? CFG.limbMultiplier : 1;
      const dmg = def.dmg * partMul * dmgMul;
      this.sendPvpHit(dmg, pvpHit.part, hs, pvpHit.rp);
      this.hitEffect(pvpHit.point, dir, pvpHit.part, hs);
      Audio3D_SFX.hit(pvpHit.point.x, pvpHit.point.y, pvpHit.point.z, hs);
      this.effects.tracer(muzzleWorld, pvpHit.point, 1, true, _shotCol);
      this.effects.bloodBurst(pvpHit.point, dir, hs ? 14 : 8);
      if (Net.ping > 0) { /* ping-based compensation could go here */ }
      return;
    }

    if (zHit && zHit.t <= stopT) {
      // practice targets (the aim drill) score and pop; dummies take damage
      if (zHit.zombie.isDummy) {
        // fall through to the normal damage path below
      } else if (zHit.zombie.isTargetOnRange) {
        p.bulletsHit++;
        this.effects.impact(zHit.point, dir, 'concrete');
        this.effects.tracer(muzzleWorld, zHit.point, 1, true, _shotCol);
        Audio3D_SFX.hit(zHit.point.x, zHit.point.y, zHit.point.z, false);
        this.onTargetHit(zHit.zombie, zHit.part);
        return;
      }
      p.bulletsHit++;
      const dmg = def.dmg * dmgMul;
      /* В коопе зомби принадлежат ХОСТУ: клиент наносит визуальный удар, но
         отправляет урон хосту, чтобы убийство засчиталось на обоих. */
      if (this.mode === CS.MODE.ONLINE && this.isCoop && Net.role !== CS.NETROLE.HOST && zHit.zombie.remoteDriven) {
        Net.send({ t: 'zhit', i: zHit.zombie.remoteId, dmg: Math.round(dmg), part: zHit.part, from: Net.selfId() });
        zHit.zombie.health -= dmg;
      } else {
        zHit.zombie.takeDamage(dmg, zHit.part, dir);
      }
      p.damageDealt += dmg * (zHit.part === 'head' ? CFG.headshotMultiplier : zHit.part === 'legs' ? CFG.limbMultiplier : 1);
      this.hitEffect(zHit.point, dir, zHit.part, zHit.part === 'head');
      Audio3D_SFX.hit(zHit.point.x, zHit.point.y, zHit.point.z, zHit.part === 'head');
      this.effects.tracer(muzzleWorld, zHit.point, 1, true, _shotCol);
      /* ВЗРЫВНЫЕ ПУЛИ: пуля детонирует по площади (AoE, как снаряд РПГ) */
      if (def.bulletSplash) this.bulletExplode(zHit.point, def);
      return;
    }

    // a shot that hits nothing breaks the streak
    if (this.aim) this.onTargetMiss();

    // hit geometry
    if (stopPoint) {
      this.effects.tracer(muzzleWorld, stopPoint, 1, true, _shotCol);
      const surf = (stopNormal && Math.abs(stopNormal.y) > .7) ? 'concrete' : 'concrete';
      this.effects.impact(stopPoint, stopNormal, surf, (p && p.skinTheme) || null);
      Audio3D_SFX.tone(140, .06, 'triangle', .05, stopPoint.x, stopPoint.y, stopPoint.z, 90);
      /* ВЗРЫВНЫЕ ПУЛИ: попадание в стену тоже даёт взрыв по площади */
      if (def.bulletSplash) this.bulletExplode(stopPoint, def);
    } else {
      this.effects.tracer(muzzleWorld, end, 1, false, _shotCol);
      /* пуля ушла в небо — детонируем на пределе дальности, если это взрывная */
      if (def.bulletSplash) this.bulletExplode(end, def);
    }
  },

  /* ============================================================
     ВЗРЫВНЫЕ ПУЛИ (Y.H.S): пуля детонирует при попадании. AoE-радиус и урон —
     как у снаряда РПГ: задевает всех в радиусе, ломает карту, толкает.
     Общий метод — используется и на сервере (локально), и в коопе.
     ============================================================ */
  bulletExplode(center, def) {
    /* Y.H.S стреляет почти 100 раз/с — взрыв на КАЖДОЙ пуле убьёт производительность
       (и мгновенно снесёт всю карту). Прямой урон пули остаётся всегда, а
       площадь-взрыв детонирует с небольшим кулдауном (по умолчанию ~11 раз/с). */
    const now = U.now();
    const cdMs = (def.bulletSplashCd !== undefined ? def.bulletSplashCd : .09) * 1000;
    if (this._bulletBoomAt && now - this._bulletBoomAt < cdMs) return 0;
    this._bulletBoomAt = now;
    const R = def.bulletSplash;
    const dmg = def.bulletSplashDmg || def.dmg || 100;
    const col = def.bulletExplosionColor || [0xffa22a, 0x1a0d05];
    this.effects.explosion(center.x, center.y, center.z, R, col);
    /* взрыв РАЗРУШАЕТ карту в радиусе (мгновенно) */
    this.breakMapAt(center.x, center.y, center.z, R * 1.05, dmg * .5);
    Audio3D_SFX.explosionAt(center.x, center.y, center.z);
    // зомби в радиусе
    if (this.horde) {
      for (const z of this.horde.list) {
        if (!z.alive || z.dying) continue;
        const d = Math.hypot(z.pos.x - center.x, (z.pos.y + 1) - center.y, z.pos.z - center.z);
        if (d > R) continue;
        const k = 1 - d / R;
        const dealt = dmg * k;
        if (this.mode === CS.MODE.ONLINE && this.isCoop && Net.role !== CS.NETROLE.HOST && z.remoteDriven) {
          Net.send({ t: 'zhit', i: z.remoteId, dmg: Math.round(dealt), part: 'body', from: Net.selfId() });
          z.health -= dealt;
        } else {
          z.takeDamage(dealt, 'body', { x: 0, y: 0, z: 0 });
        }
        this.player.damageDealt += dealt;
      }
    }
    // игроки-соперники (онлайн, не кооп)
    if (this.mode === CS.MODE.ONLINE && !this.isCoop) {
      for (const rp of this.remotePlayers) {
        if (!rp.alive) continue;
        const d = Math.hypot(rp.pos.x - center.x, (rp.pos.y + 1) - center.y, rp.pos.z - center.z);
        if (d <= R) this.sendPvpHit(dmg * (1 - d / R), 'body', false, rp, 'yhs');
      }
    }
    // сообщаем кооп-напарникам, чтобы они увидели взрыв и получили урон
    if (this.mode === CS.MODE.ONLINE && Net.connected) {
      Net.send({ t: 'boom', from: Net.selfId(), x: +center.x.toFixed(2), y: +center.y.toFixed(2), z: +center.z.toFixed(2), r: R, c: col });
    }
    /* Взрыв НЕ наносит урон стрелку — как и просили. (Раньше тут была лёгкая
       отдача по себе в упор.) */
  },

  /* Разрушение карты взрывом + ПЫЛЬ/ЧАСТИЦЫ. ЛЮБОЙ взрыв ломает блоки
     МГНОВЕННО (весь блок в радиусе исчезает сразу, а не копит урон). */
  breakMapAt(x, y, z, radius, dmg) {
    if (typeof damageMapAt !== 'function') return 0;
    /* МОЗГ: взрывы бьют по колбам в радиусе */
    if (typeof BrainBoss !== 'undefined' && BrainBoss.active) {
      const b = BrainBoss.active;
      for (let i = 0; i < b.flasks.length; i++) {
        const f = b.flasks[i]; if (!f.alive) continue;
        const d = Math.hypot(f.x - x, f.z - z, (f.y + 1) - y);
        if (d < radius * 1.1) BrainBoss.damageFlask(i, (dmg || 100) * 1.2 * (1 - d / (radius * 1.1) * .5));
      }
    }
    const destroyed = damageMapAt(x, y, z, radius, Infinity);
    if (destroyed && this.effects) {
      const b = MAP._lastBreak || { x: x, y: y, z: z };
      this.effects.debrisBurst(b.x, b.y, b.z, 0xb8b2a6, 1.3, b.mat, 10);
      // немного пыли по площади, но без лишних кусков
      for (let i = 0; i < Math.min(4, destroyed); i++) {
        this.effects.debrisBurst(x + U.rand(-radius * .5, radius * .5), y + U.rand(0, 1.4), z + U.rand(-radius * .5, radius * .5), 0xb8b2a6, .8, b.mat, 3);
      }
    }
    return destroyed;
  },

  hitEffect(point, dir, part, headshot) {
    const theme = (this.player && this.player.skinTheme) || null;
    if (theme === 'flesh') this.effects.fleshImpact(point, dir);
    else if (theme === 'galaxy') this.effects.galaxyImpact(point, dir);
    this.effects.bloodBurst(point, dir, headshot ? 14 : part === 'legs' ? 5 : 8);
    UI.hitmark(false);
    this._hitmarkT = U.now();
  },

  traceRemotePlayer(origin, dir, maxDist, def) {
    // knife swing against everyone else in the room
    if (this.mode !== CS.MODE.ONLINE) return;
    const h = this.rayRemoteAny(origin, dir, maxDist);
    if (h) {
      const hs = h.part === 'head';
      const dmg = def.dmg * (hs ? 2 : 1);
      this.sendPvpHit(dmg, h.part, hs, h.rp);
      this.effects.bloodBurst(h.point, dir, 8);
      Audio3D_SFX.hit(h.point.x, h.point.y, h.point.z, hs);
    }
  },

  /* closest hit among every remote player */
  rayRemoteAny(origin, dir, maxDist) {
    let best = null;
    for (const rp of this.remotePlayers) {
      if (!rp.alive) continue;
      const h = this.rayRemotePlayerFor(rp, origin, dir, maxDist);
      if (h && (!best || h.t < best.t)) { h.rp = rp; best = h; }
    }
    return best;
  },

  /* ray vs any enemy drone in the air (they are small, so a box is enough) */
  rayRemoteDroneAny(origin, dir, maxDist) {
    let best = null;
    const r = CFG.droneHitRadius || .32;
    for (const rp of this.remotePlayers) {
      if (!rp.droneMesh) continue;
      const p = rp.droneMesh.position;
      const b = AABB(p.x - r, p.y - r * .7, p.z - r, p.x + r, p.y + r * .7, p.z + r);
      const h = rayBox(origin, dir, b, maxDist);
      if (h && (!best || h.t < best.t)) { best = { t: h.t, rp: rp, point: { x: origin.x + dir.x * h.t, y: origin.y + dir.y * h.t, z: origin.z + dir.z * h.t } }; }
    }
    return best;
  },

  /* A shot landed on an enemy drone. The drone is authoritative on its OWNER's
     machine, so we cannot simply delete it here: that left the owner still
     flying (and still dealing damage). Instead we hide it locally for instant
     feedback and tell the owner to destroy it, which then broadcasts the blast. */
  hitRemoteDrone(rp, point) {
    if (!rp || !rp.droneMesh) return;
    if (this.effects) this.effects.impact(point, { x: 0, y: 1, z: 0 }, 'metal');
    Audio3D_SFX.hit(point.x, point.y, point.z, false);
    UI.hitmark(false);
    this._hitmarkT = U.now();
    const dr = rp.droneMesh.position;
    Net.send({
      t: 'drone', st: 'down', from: Net.selfId(),
      to: rp.peerId,
      x: +dr.x.toFixed(2), y: +dr.y.toFixed(2), z: +dr.z.toFixed(2)
    });
    // the owner will broadcast `boom`; hide our copy right away so it never
    // keeps flying while that round-trip happens
    UI.feed('Дрон <b>' + U.esc(rp.name) + '</b> сбит');
    this.clearRemoteDrone(rp);
  },

  /* kept for compatibility: raycast against the first remote */
  rayRemotePlayer(origin, dir, maxDist) {
    return this.remote ? this.rayRemotePlayerFor(this.remote, origin, dir, maxDist) : null;
  },

  rayRemotePlayerFor(rp, origin, dir, maxDist) {
    if (!rp || !rp.alive) return null;
    const base = { x: rp.pos.x, y: rp.pos.y, z: rp.pos.z };
    // in the mech the silhouette is much taller/wider, so the hitboxes grow
    const H = rp.mech ? CFG.mechHeight : rp.height;
    const W = rp.mech ? CFG.mechRadius : 1;
    const parts = [
      { part: 'head', y0: H * .78, y1: H * 1.02, r: .19 * W },
      { part: 'body', y0: H * .42, y1: H * .80, r: .30 * W },
      { part: 'legs', y0: 0, y1: H * .44, r: .24 * W }
    ];
    let best = null;
    for (const pt of parts) {
      const b = AABB(base.x - pt.r, base.y + pt.y0, base.z - pt.r, base.x + pt.r, base.y + pt.y1, base.z + pt.r);
      const h = rayBox(origin, dir, b, maxDist);
      if (h && (!best || h.t < best.t)) best = { t: h.t, part: pt.part };
    }
    if (best) best.point = { x: origin.x + dir.x * best.t, y: origin.y + dir.y * best.t, z: origin.z + dir.z * best.t };
    return best;
  },

  /* ============================================================
     ENERGY SHIELD (ACTIVE SHIELD)
     A held item that fills the primary slot instead of a gun. It is NOT always
     on: pressing fire raises the field for a few seconds, then it goes on
     cooldown. While up it blocks incoming projectiles (rockets, bananas, guided
     missiles / blasts) and reflects them back at the shooter. Bullets still pass
     through, so it is not a full immunity.
     ============================================================ */
  activateShield() {
    const p = this.player;
    if (!p || !p.alive) return false;
    if (p.slot !== 2 || !p.inv[2] || p.inv[2].id !== 'shield') return false;
    if (p.shieldActive) return false;                 // already up
    if ((p.shieldCd || 0) > 0) { Audio3D_SFX.deny(); return false; }   // still recharging
    p.shieldActive = true;
    p.shieldT = WEAPONS.shield.activeTime;
    Audio3D_SFX.pickup();
    UI.toast('ЩИТ АКТИВЕН', '#4aa3ff');
    const f = p.vmInner && p.vmInner.getObjectByName ? p.vmInner.getObjectByName('shieldField') : null;
    if (f) f.visible = true;
    if (this.mode === CS.MODE.ONLINE) this.broadcastScore();
    return true;
  },

  updateShield(dt) {
    const p = this.player;
    if (!p) return;
    const isShield = p.slot === 2 && p.inv[2] && p.inv[2].id === 'shield';
    const f = p.vmInner && p.vmInner.getObjectByName ? p.vmInner.getObjectByName('shieldField') : null;

    // not holding the shield: everything is off and the cooldown is cleared
    if (!isShield || !p.alive) {
      p.shieldActive = false;
      p.shieldT = 0;
      p.shieldCd = 0;
      if (f) f.visible = false;
      return;
    }

    if (p.shieldActive) {
      p.shieldT -= dt;
      if (p.shieldT <= 0) {
        // field drops and the cooldown begins
        p.shieldActive = false;
        p.shieldT = 0;
        p.shieldCd = WEAPONS.shield.cooldown;
        if (f) f.visible = false;
        Audio3D_SFX.reloadStep(0);
      }
    } else if (p.shieldCd > 0) {
      p.shieldCd = Math.max(0, p.shieldCd - dt);
    }

    // a soft pulse while the field is up
    if (f) {
      f.visible = p.shieldActive;
      if (p.shieldActive && f.userData && f.userData.mats) {
        const k = .5 + .5 * Math.sin(U.now() / 130);
        f.userData.mats[0].opacity = .75 + .20 * k;    // edges
        f.userData.mats[1].opacity = .22 + .12 * k;    // body
        f.userData.mats[2].opacity = .45 + .20 * k;    // struts/rim
      }
    }
  },

  /* Report a hit to the shooter's victim. In the star network only the victim
     may apply it, so every hit carries the target's peer id. `kind` marks a
     projectile hit (rocket/banana/guided) so a shield can reflect it. */
  sendPvpHit(dmg, part, headshot, rp, kind, pid) {
    UI.hitmark(false);
    this._hitmarkT = U.now();
    const target = rp || this.remote;
    Net.send({
      t: 'hit', dmg: Math.round(dmg), part, hs: headshot ? 1 : 0, at: U.now(),
      to: target ? target.peerId : undefined,
      from: Net.selfId(),
      pr: kind || undefined,
      pid: pid !== undefined ? pid : undefined
    });
  },

  playerHurt(dmg, source) {
    const p = this.player;
    if (!p.alive) return;
    /* оффлайн, полигон и онлайн-кооп (зомби бьют игрока) */
    if (this.mode !== CS.MODE.OFFLINE && this.mode !== CS.MODE.RANGE && !(this.mode === CS.MODE.ONLINE && this.isCoop)) return;
    if (this.modState && this.modState.playerHurt !== 1) dmg *= this.modState.playerHurt;
    this.applyDamageToSelf(dmg, source ? { x: source.pos.x, y: source.pos.y, z: source.pos.z } : null);
  },

  /* КООП: зомби бьёт удалённого игрока (ими управляет только хост) — шлём ему урон */
  hurtRemote(dmg, source) {
    if (this.mode !== CS.MODE.ONLINE || !this.isCoop || Net.role !== CS.NETROLE.HOST) return;
    Net.send({ t: 'zhurt', dmg: Math.round(dmg) });
  },

  onZombieHurtMsg(m) {
    if (this.mode !== CS.MODE.ONLINE || !this.isCoop) return;
    if (Net.role === CS.NETROLE.HOST) return;        // хост сам себе урон не шлёт
    this.applyDamageToSelf(m.dmg, null);
  },

  /* ХОСТ: клиент нанёс урон общему зомби — применяем его на хосте */
  onRemoteZombieHit(m) {
    if (this.mode !== CS.MODE.ONLINE || !this.isCoop || Net.role !== CS.NETROLE.HOST) return;
    if (!this.horde || m.i === undefined) return;
    const z = this.horde.list.find(o => o.id === m.i);
    if (!z || !z.alive || z.dying) return;
    z.takeDamage(m.dmg || 0, m.part || 'body', { x: 0, y: 0, z: 0 });
  },

  /* КООП: зомби бьёт удалённого игрока (ими управляет только хост) — шлём ему урон */
  hurtRemote(dmg, source) {
    if (this.mode !== CS.MODE.ONLINE || !this.isCoop || Net.role !== CS.NETROLE.HOST) return;
    Net.send({ t: 'zhurt', dmg: Math.round(dmg) });
  },

  onZombieHurtMsg(m) {
    if (this.mode !== CS.MODE.ONLINE || !this.isCoop) return;
    if (Net.role === CS.NETROLE.HOST) return;        // хост сам себе урон не шлёт
    this.applyDamageToSelf(m.dmg, null);
  },

  /* Damage aimed at us by the shooting dummy. While our shield is up the hit is
     caught and thrown straight back at the dummy instead — the local mirror of
     `onRemoteHit`'s reflect, so the range behaves like an online duel. */
  damageFromDummy(dmg, from, dummy) {
    const p = this.player;
    if (this.playerShieldUp()) {
      this.reflectAtDummy(from, dmg, !!dummy && !!dummy.isMeleeShot);
      return;
    }
    this.applyDamageToSelf(dmg, from);
  },

  /* Is the energy shield currently raised? Kept in one place so both the online
     reflect path and the range dummy agree on what counts as "blocking". */
  playerShieldUp() {
    const p = this.player;
    return !!(p && p.alive && p.shieldActive);
  },

  /* The shield caught a hit: the damage is thrown back at the shooter. On the
     range the shooter is the dummy, which is invulnerable, so the reward is the
     feedback plus a visible retaliation burst. */
  reflectAtDummy(from, dmg, isMelee) {
    UI.hitmark(false); this._hitmarkT = U.now();
    Audio3D_SFX.pickup();
    UI.feed('<span class="z">Щит отразил удар</span>');
    UI.toast(isMelee ? 'Щит отразил удар!' : 'Щит отразил выстрел!', '#4aa3ff');
    const d = this.shooterDummy;
    if (d && this.effects && from) {
      this.effects.laser({ x: d.pos.x, y: d.pos.y + 1.3, z: d.pos.z },
        { x: from.x, y: from.y, z: from.z });
      // let the readout react, as if the reflected round really struck it
      d.hitFlash = .1;
    }
  },

  applyDamageToSelf(dmg, fromPos) {
    const p = this.player;
    if (!p.alive) return;
    /* НЕУЯЗВИМОСТЬ ВО ВРЕМЯ ТАРАННОГО РЫВКА «Господина цветов»: пока игрок
       летит вперёд, он не получает урона (кроме собственного урона захвата). */
    if (this._flowerRush && !this._flowerRushDmg) return;
    let actual = dmg;
    // the mech chassis soaks HALF of every hit before armour
    if (this.isMechActive()) actual *= .5;
    if (p.armor > 0) {
      // reinforced armour soaks a larger share of the hit; the energy suit is best
      const absorbFrac = p.energyArmor ? .88 : p.heavyArmor ? .75 : .5;
      const absorbed = Math.min(p.armor, actual * absorbFrac);
      p.armor -= absorbed;
      actual -= absorbed;
      if (p.armor < 0) p.armor = 0;
      /* БРОНЯ РАЗРУШЕНА: когда AP упал до нуля, костюм уничтожен — снимаем
         флаги, иначе он навсегда висел как «купленный» и новую броню нельзя
         было взять (баг с энерго-/укреплённой бронёй). */
      if (p.armor <= 0 && (p.heavyArmor || p.energyArmor)) {
        p.heavyArmor = false; p.energyArmor = false;
        p.armorMax = CFG.maxAP || 100;
        UI.toast('Броня разрушена — купите новую', '#e33a2e');
      }
    }
    p.health -= actual;
    if (actual > 0) this._waveHurt = true;
    Audio3D_SFX.hurt();
    UI.dmgFlash();
    if (fromPos) {
      const ang = Math.atan2(fromPos.x - p.pos.x, fromPos.z - p.pos.z) - p.yaw;
      UI.damageDirection(ang);
    }
    if (p.health <= 0) {
      p.health = 0;
      this.onLocalDeath();
    }
  },

  onLocalDeath() {
    const p = this.player;
    if (!p.alive) return;
    p.alive = false;
    p.deaths++;
    this._runDeaths = (this._runDeaths || 0) + 1;
    Audio3D_SFX.roundEnd(false);
    /* СМЕРТЬ С «ГОСПОДИНОМ ЦВЕТОВ»: реплика Флауэра «I'm falling» (перебивает). */
    if (p.def && p.def.flowerUlt && Audio3D_SFX.flowerVoice && FLOWER_VOICE_FALLING) {
      Audio3D_SFX.flowerVoice(FLOWER_VOICE_FALLING, 1.0, true);
    }
    if (this._omega) this.endOmega();
    // a drone still in the air is lost with its pilot
    if (this.drone) this.detonateDrone(false);
    if (this.mode === CS.MODE.OFFLINE) {
      const o = this.offline;
      if (p.score > Store.data.best) { Store.data.best = p.score; Store.save(); }
      if (o.wave > Store.data.bestWave) { Store.data.bestWave = o.wave; Store.save(); }
      Store.data.killsTotal += p.zombieKills; Store.save();
      this.recordRun();
      this.checkAchievements();
      UI.center('ВЫ ПОГИБЛИ', 'Счёт: ' + p.score + ' · Волна ' + o.wave, 4.0);
      UI.toast('Волна ' + o.wave + ' · Счёт ' + p.score + ' · Нажмите Tab для статистики', '#e33a2e');
      if (this.isHardcore) {
        this._hardcoreKills = p.zombieKills;
        this._hardcoreWave = o.wave;
        UI.center('ХАРДКОР ПРОЙДЕН', 'Волна ' + o.wave + ' · убито ' + p.zombieKills, 600);
        UI.toast('ХАРДКОР: одна жизнь — забег окончен', '#c4302a');
      }
      this.roundState = 'end';
      this.roundT = 5.0;
      this.offlineDead = true;
    } else {
      UI.center('ВАС УБИЛИ', this.online ? ('Счёт ' + this.online.scoreMe + ' : ' + this.online.scoreThem) : '', 2.6);
      // report who killed us so only they get the credit in a 3–4 player room
      Net.send({
        t: 'died', at: U.now(),
        from: Net.selfId(),
        by: this._lastHitBy || undefined
      });
      this._lastHitBy = null;
      // the host decides the round result; the client waits for its message
      if (Net.role === CS.NETROLE.HOST) this.checkRoundEnd();
    }
  },

  onZombieDied(z, headshot) {
    const p = this.player;
    p.zombieKills++;
    p.kills++;
    this._waveKills = (this._waveKills || 0) + 1;
    if (this._waveKills > (this._maxWaveKills || 0)) this._maxWaveKills = this._waveKills;
    /* скоростная цель: сколько убийств уложилось в скользящее окно 5 секунд */
    const now = U.now();
    this._killTimes = this._killTimes || [];
    this._killTimes.push(now);
    while (this._killTimes.length && now - this._killTimes[0] > 5000) this._killTimes.shift();
    if (this._killTimes.length > (this._fastKills || 0)) this._fastKills = this._killTimes.length;
    // which weapon did the killing blow? (mech kit / knife / heavy guns)
    const held = p.weapon && p.weapon.id;
    if (this.isMechActive()) {
      this._mechKills = (this._mechKills || 0) + 1;
      if (z.isMiniBoss) this._mechMiniBossKills = (this._mechMiniBossKills || 0) + 1;
    }
    else if (held === 'knife') this._knifeKills = (this._knifeKills || 0) + 1;
    // heavy-weapon kill goals: count the killing blow per heavy gun
    const HV = { minigun: 1, rpg: 1, laser: 1, laserCannon: 1, atomicRpg: 1, yhs: 1, rocketgun: 1 };
    if (held && HV[held]) {
      this._hvKills = this._hvKills || {};
      this._hvKills[held] = (this._hvKills[held] || 0) + 1;
    }
    // a kill credited while the energy shield is raised counts toward its goal
    if (p.shieldActive) this._shieldKills = (this._shieldKills || 0) + 1;
    // headshot streak (reset on a non-headshot kill)
    if (headshot) {
      this._headStreak = (this._headStreak || 0) + 1;
      if (this._headStreak > (this._bestHeadStreak || 0)) this._bestHeadStreak = this._headStreak;
    } else this._headStreak = 0;
    const def = z.def;
    p.money = Math.min(CFG.moneyCap, p.money + def.money);
    p.score += def.score * (headshot ? 1.5 : 1) | 0;
    if (headshot) p.headshots++;
    Audio3D_SFX.kill();
    UI.hitmark(true);
    this._hitmarkT = U.now();
    /* ДЕЛЯЩИЙСЯ: bursts into a handful of smaller zombies when it dies */
    if (def.splits && this.horde && !z._splitDone) {
      z._splitDone = true;
      for (let i = 0; i < def.splits; i++) {
        const a = (i / def.splits) * Math.PI * 2 + U.rand(-.4, .4);
        const r = U.rand(1.0, 2.2);
        const sx = U.clamp(z.pos.x + Math.cos(a) * r, -MAP.size / 2 + 3, MAP.size / 2 - 3);
        const sz = U.clamp(z.pos.z + Math.sin(a) * r, -MAP.size / 2 + 3, MAP.size / 2 - 3);
        const sp = this.horde.spawn(def.splitType || 'crawler', sx, sz);
        sp.health = sp.maxHealth = Math.max(24, z.maxHealth * .28);
      }
      this.effects.explosion(z.pos.x, z.pos.y + 1, z.pos.z, 3.0, [0xc24bff, 0x1a0a20]);
    }
    /* Boss/mini-boss death: a huge detonation, coloured to their aura, and the
       boss theme fades out when the last one falls. */
    if (z.isBoss || z.isMiniBoss) {
      const tint = def.aura || (z.isBoss ? 0xff5a2a : 0x4ad6ff);
      this.effects.explosion(z.pos.x, z.pos.y + 1.2 * z.scale, z.pos.z,
        z.isBoss ? 9 : 5, [tint, 0x120709], !!def.final);
      Audio3D_SFX.explosionAt(z.pos.x, z.pos.y + 1, z.pos.z);
      UI.center(z.isBoss ? 'БОСС ПОВЕРЖЕН' : 'МИНИ-БОСС ПОВЕРЖЕН', def.name, 2.4);
      Audio3D_SFX.roundEnd(true);
      if (def.brain && typeof BrainBoss !== 'undefined') {
        UI.center('МОЗГ УНИЧТОЖЕН', def.name + ' · МИР СПАСЁН', 5.0);
        BrainBoss.cleanup();
      }
      // no boss left alive → back to the battle track (or menu)
      const anyLeft = this.horde && this.horde.list.some(o => o !== z && (o.isBoss || o.isMiniBoss) && o.alive && !o.dying);
      if (!anyLeft) this.refreshMusic();
      if (z.isBoss) { this._bossKills = (this._bossKills || 0) + 1; }
      if (z.isMiniBoss) { this._miniBossKills = (this._miniBossKills || 0) + 1; }
    }
    /* SWOON/DOWN: если врага убила ПКМ-ульта — «SWOON»; если обычный удар ЛКМ
       этим же мечом рыцаря — «DOWN». Красная пиксельная надпись над телом. */
    if (z.pos && this.effects && this.effects.swoon) {
      if (z._knightUltHit) this.effects.swoon(z.pos.x, z.pos.y + 2.1 * (z.scale || 1) + .5, z.pos.z, 'SWOON');
      else if (z._knightDown) this.effects.swoon(z.pos.x, z.pos.y + 2.1 * (z.scale || 1) + .5, z.pos.z, 'DOWN');
    }
    this.checkAchievements();
    UI.feed('<b>' + U.esc(p.name) + '</b> <span class="z">✖ ' + def.name + (headshot ? ' (в голову)' : '') + '</span> +$' + def.money);
    /* ПОДРЫВНИК: детонирует при смерти — сносит стены и бьёт всех вокруг,
       после чего погибает (тело остаётся, оседает как обычное). */
    if (def.explosive) this.bomberExplode(z);
    /* the "В ГОЛОВУ!" pop-up is spammy on a phone — keep it on PC only */
    if (headshot && !IS_TOUCH) UI.toast('В ГОЛОВУ! +$' + def.money + ' +' + Math.round(def.score * 1.5) + ' очков', '#ff9d21');
    Bus.emit('kill', z, headshot);
  },

  onZombieHit(z, part, dmg, dir) {
    if (part === 'head') { /* handled in onZombieDied for kills */ }
  },

  /* ============================================================
     ВЗРЫВНОЙ ЗОМБИ (ПОДРЫВНИК): при смерти детонирует — сносит стены и всё
     вокруг. Использует те же механики, что и взрыв снаряда: урон по площади,
     разрушение карты, урон игроку и соперникам/кооп-напарникам.
     ============================================================ */
  bomberExplode(z) {
    const def = z.def || {};
    const R = def.blastR || 6.5;
    const dmg = def.blastDmg || 90;
    const c = { x: z.pos.x, y: z.pos.y + .9, z: z.pos.z };
    if (this.effects) this.effects.explosion(c.x, c.y, c.z, R, [0xff5a1a, 0x1a0a05]);
    this.breakMapAt(c.x, c.y, c.z, R * 1.02, dmg * 4);
    Audio3D_SFX.explosionAt(c.x, c.y, c.z);
    if (this.mode === CS.MODE.ONLINE && Net.connected) {
      Net.send({ t: 'boom', from: Net.selfId(), x: +c.x.toFixed(2), y: +c.y.toFixed(2), z: +c.z.toFixed(2), r: R, c: [0xff5a1a, 0x1a0a05] });
    }
    // зомби вокруг
    if (this.horde) {
      for (const o of this.horde.list) {
        if (o === z || !o.alive || o.dying) continue;
        const d = Math.hypot(o.pos.x - c.x, (o.pos.y + 1) - c.y, o.pos.z - c.z);
        if (d > R) continue;
        o.takeDamage(dmg * (1 - d / R), 'body', { x: 0, y: 0, z: 0 });
      }
    }
    // игрок
    const p = this.player;
    if (p && p.alive) {
      const d = Math.hypot(p.pos.x - c.x, (p.pos.y + 1) - c.y, p.pos.z - c.z);
      if (d <= R) this.playerHurt(dmg * (1 - d / R), z);
    }
    // соперники / кооп-напарники
    if (this.mode === CS.MODE.ONLINE) {
      for (const rp of this.remotePlayers) {
        if (!rp.alive) continue;
        const d = Math.hypot(rp.pos.x - c.x, (rp.pos.y + 1) - c.y, rp.pos.z - c.z);
        if (d <= R) this.sendPvpHit(dmg * (1 - d / R), 'body', false, rp, 'bomber');
      }
    }
    UI.center('ПОДРЫВНИК', 'Взрыв · ' + Math.round(R) + 'м', 1.5);
  },

  /* ============================================================
     NETWORKING (online)
     ============================================================ */
  resetLobby() {
    if (!UI.el.lobbyMain) return;
    UI.el.lobbyMain.classList.remove('hidden');
    if (UI.el.joinRow) UI.el.joinRow.classList.add('hidden');
    if (UI.el.hostRow) UI.el.hostRow.classList.add('hidden');
    if (UI.el.roomCode) { UI.el.roomCode.textContent = '·····'; }
    this.setLobbyStatus('');
    if (UI.el.inName) UI.el.inName.value = Store.data.name || '';
    // seed the shop allow-list from the saved choice so the chips show it
    this.shopAllow = this.hostShopAllow();
    this.shopItemAllow = this.hostShopItemsAllow();
    UI.refreshChips();
    UI.renderShopItems();
  },

  doHost() {
    const name = (UI.el.inName.value || 'Игрок').slice(0, 14);
    if (!name) { this.setLobbyStatus('Введите ник', true); return; }
    Store.data.name = name; Store.save();
    this._hostSettled = false;
    UI.el.hostRow.classList.remove('hidden');
    UI.el.joinRow.classList.add('hidden');
    UI.el.roomCode.textContent = '·····';
    this.setLobbyStatus('Создаём комнату…');
    Net.host(name,
      () => {
        // the code can change if the first id was taken; refresh the display
        this._hostSettled = true;
        this.showRoomCode();
      },
      err => {
        // If the signalling server cannot be reached the room cannot exist,
        // so never present an invalid code as if it were real.
        this._hostSettled = true;
        UI.el.roomCode.textContent = 'ОШИБКА';
        // The room does not exist, so stop pretending it is waiting for players.
        if (UI.el.waiting) UI.el.waiting.classList.add('hidden');
        this.setLobbyStatus(err + ' Код комнаты не создан — проверьте интернет и попробуйте снова.', true);
      }
    );
    // Net.host assigns the code synchronously; show it right away (with the
    // spinner hidden) until the server confirms the room really exists.
    this.showRoomCode();
  },

  /* The code is shown as soon as it is generated, but until the signalling
     server confirms it the room does not exist yet — a guest typing it early
     gets "комната не найдена". Say so instead of "Ждём второго игрока…". */
  showRoomCode() {
    const el = UI.el.roomCode;
    if (!el) return;
    if (Net.role !== CS.NETROLE.HOST || !Net.code) { el.textContent = '·····'; return; }
    el.textContent = Net.code;
    el.style.letterSpacing = '12px';
    el.style.fontSize = '38px';
    if (this._hostSettled && Net.peerId) {
      // the room really exists: it is now meaningful to say we are waiting
      if (UI.el.waiting) UI.el.waiting.classList.remove('hidden');
      this.setLobbyStatus('Комната создана. Ждём второго игрока…');
      setTimeout(() => { if (el.textContent === Net.code) UI.toast('Код комнаты: ' + Net.code); }, 400);
    } else {
      // code is shown, but until the server confirms it the room does not exist
      if (UI.el.waiting) UI.el.waiting.classList.add('hidden');
      this.setLobbyStatus('Создаём комнату…');
    }
  },

  /* Joining shows the "ПОДКЛЮЧЕНИЕ" overlay while we probe servers and dial the
     host. A refusal (room full / in a match) carries a clearer reason than the
     generic dial error, so prefer it in both places the message is shown. */
  doJoin() {
    const name = (UI.el.inName.value || 'Игрок').slice(0, 14);
    const code = (UI.el.inCode.value || '').toUpperCase().trim();
    if (code.length < 4) { this.setLobbyStatus('Введите код комнаты (4–5 символов)', true); return; }
    Store.data.name = name; Store.save();
    this.setLobbyStatus('Подключение к ' + code + '…');
    UI.show('connect');
    UI.el.connTitle.textContent = 'ПОДКЛЮЧЕНИЕ';
    UI.el.connStatus.textContent = 'Ищем комнату ' + code + '…';
    Net.join(code, name, err => {
      const msg = (Net && Net._rejected) ? Net._rejected : err;
      this.setLobbyStatus(msg, true);
      // only overwrite a refusal message the player may already be reading
      if (!(Net && Net._rejected)) UI.el.connStatus.textContent = err;
      setTimeout(() => { if (!Net.connected) UI.show('lobby'); }, 1600);
    });
  },

  setLobbyStatus(text, isErr) {
    const e = UI.el.lobbyStatus;
    if (!e) return;
    e.textContent = text || '';
    e.classList.toggle('err', !!isErr);
  },

  onPeerHello(m) {
    Net.partnerName = m.name;
    // The first hello starts the match. Later joins just add a remote; the host
    // resends the current round state so a late arrival is not left behind.
    if (this.mode === CS.MODE.ONLINE) {
      this.syncRemoteRoster();
      return;
    }
    this.startOnline(Net.role);
    // as host, tell everyone already here about the new player
    if (Net.role === CS.NETROLE.HOST) {
      Net.send({ t: 'roster', roster: Net.peers });
      // and make sure everyone agrees on the economy for this room
      Net.send({ t: 'round', st: 'settings', players: Store.data.players, hp: this.matchHP, map: MAP.id, free: this.freePlay ? 1 : 0, rounds: this.online ? this.online.rounds : MATCH.clampRounds(Store.data.rounds), shop: this.shopAllow, shopItems: this.shopItemsAllow(), tod: Store.data.timeOfDay || 'day', weather: Store.data.skyWeather || 'clear', envAuto: Store.data.envAuto || 0, envOff: Store.data.envOff || 0, pve: this.onlinePvE || Store.data.onlineMode || 'pvp' });
    }
  },

  onNetConnected() {
    UI.el.connTitle.textContent = 'СОЕДИНЕНО';
    UI.el.connStatus.textContent = 'Ожидание игроков…';
    this.setLobbyStatus('Соединено!', false);
    UI.renderPeerList();
  },

  onNetDisconnected() {
    if (this.mode !== CS.MODE.ONLINE) return;
    if (this._leaving) return;
    // A client losing its only link to the host means the room is gone.
    if (Net.role === CS.NETROLE.HOST && Net.conns.some(c => c.open)) return;
    this._leaving = true;
    UI.toast('Связь потеряна', '#e33a2e');
    UI.center('СОЕДИНЕНИЕ ПОТЕРЯНО', 'Выход в меню через 5 секунд', 5.0);
    setTimeout(() => { if (this.mode === CS.MODE.ONLINE && this._leaving) this.stopToMenu(); }, 5200);
  },

  /* Watchdog: the data channel can stay "open" while a peer stops sending
     (backgrounded tab, locked phone, dead NAT mapping). We only drop the match
     when everyone has gone quiet; one silent player is handled by roster. */
  checkPeerAlive(dt) {
    if (this.mode !== CS.MODE.ONLINE || !Net.connected) return;
    const any = this.remotePlayers.some(rp => rp.lastPacket);
    if (!any) return;

    let fresh = false;
    for (const rp of this.remotePlayers) {
      if (rp.lastPacket && rp.lastPacket !== rp._seenPacket) { rp._seenPacket = rp.lastPacket; fresh = true; }
    }
    if (fresh) { this._silentT = 0; this._peerWarned = false; return; }

    this._silentT = (this._silentT || 0) + dt;
    if (this._silentT > 4 && !this._peerWarned) {
      this._peerWarned = true;
      UI.toast('Игроки не отвечают…', '#f5d33c');
      UI.center('ЖДЁМ ИГРОКОВ', 'Проверьте соединение', 2.0);
      try { if (Net.connected) Net.send({ t: 'ping', s: 'hb', time: U.now() }); } catch (e) { }
    }
    if (this._silentT > 14 && !this._peerLost) {
      this._peerLost = true;
      this.onNetDisconnected();
    }
  },

  broadcastState() {
    if (this.mode !== CS.MODE.ONLINE || !Net.connected) return;
    const p = this.player;
    const wpn = p.weapon;
    Net.send({
      t: 'state', rt: U.now(),
      from: Net.selfId(),
      x: +p.pos.x.toFixed(2), y: +p.pos.y.toFixed(2), z: +p.pos.z.toFixed(2),
      yw: +p.yaw.toFixed(3), pt: +p.pitch.toFixed(3),
      alive: p.alive ? 1 : 0, cr: p.crouching ? 1 : 0,
      hp: Math.round(p.health), ar: Math.round(p.armor), sl: p.slot,
      wi: wpn ? wpn.id : null,                 // held weapon, so the model can show it
      sk: (wpn && (Store.data.skinOn || {})[wpn.id]) || null,   // worn skin, shown to peers
      cs: (Store.data.skinChar === 'galaxy') ? 1 : 0,           // galactic character skin
      mg: wpn && wpn.mag !== Infinity ? wpn.mag : null,
      sp: +(p.spinT || 0).toFixed(2),           // minigun spin-up, for the barrels
      mc: p.mechSuit ? 1 : 0,                   // in the mech: show the chassis remotely
      ms: (p.mechSuit && Store.data.mechSkin) || null,  // worn mech skin, shown to peers
      md: p.dashActive ? 1 : 0,                 // mech dash in progress
      mj: p.jetActive ? 1 : 0,                  // mech jetpack thrusting
      mp: +(p.pitch || 0).toFixed(3),           // aim pitch, so the arms track remotely
      k: p.kills, d: p.deaths, sc: p.score
    });
  },

  broadcastScore() {
    if (this.mode !== CS.MODE.ONLINE || !Net.connected) return;
    const p = this.player;
    Net.send({ t: 'score', from: Net.selfId(), k: p.kills, d: p.deaths, sc: p.score, hp: Math.round(p.health), ar: Math.round(p.armor), m: Math.round(p.money) });
  },

  /* find the RemotePlayer a relayed message came from */
  remoteById(id) {
    if (!id) return this.remote;
    return this.remotePlayers.find(r => r.peerId === id) || this.remote;
  },

  onRemoteState(s) {
    const rp = this.remoteById(s.from);
    if (!rp) return;
    this._silentT = 0; this._peerWarned = false; this._peerLost = false;
    rp.seen = true;
    rp.pushSnapshot(s);
    if (s.k !== undefined) { rp.kills = s.k; rp.deaths = s.d; rp.score = s.sc; }
    if (s.hp !== undefined) rp.health = s.hp;
    rp.slot = s.sl;
    // show the weapon the peer is actually holding (including the minigun spin)
    // and the SKIN they wear, so painted weapons are visible in a duel
    rp.setWeapon(s.wi, s.sk);
    rp.setGalaxyChar(s.cs === 1);
    rp.spinT = (s.sp !== undefined) ? s.sp : 0;
    // in the mech: hide the soldier and show the chassis instead
    rp.setMech(s.mc, s.ms);
    if (rp.mech && rp._mechFired === undefined) rp._mechFired = false;
    // mech ability flags (dash / jetpack) so the opponent sees the effects.
    // A short impulse (dash) would often fall between two packets, so latch a
    // minimum visible window whenever the flag arrives as ON.
    if (s.md) rp._mechDashT = Math.max(rp._mechDashT || 0, 0.6);
    if (s.mj) rp._mechJetT = Math.max(rp._mechJetT || 0, 0.25);
    rp.mechDash = (rp._mechDashT || 0) > 0 || !!s.md;
    rp.mechJet = (rp._mechJetT || 0) > 0 || !!s.mj;
  },

  onRemoteShot(s) {
    const rp = this.remoteById(s.from);
    if (!rp) return;
    const def = WEAPONS[s.wid] || WEAPONS.ak47;
    const from = { x: s.ox, y: s.oy, z: s.oz };
    const baseDir = { x: s.dx, y: s.dy, z: s.dz };
    // the muzzle sits at eye height; in the mech that is much higher
    const my = rp.mech ? CFG.mechEyeHeight - .6 : 1.35;
    const muzzle = { x: rp.pos.x, y: rp.pos.y + my, z: rp.pos.z };
    // an epic/legendary skin on the peer's weapon tints their shots here too
    const shotSk = rp._weaponSkinId ? skinById(rp._weaponSkinId) : null;
    const shotCol = skinShotColor(shotSk);

    /* A launcher round (RPG rocket / banana) is a physical object, so fly a
       visible copy here too. The owner resolves the damage and broadcasts the
       explosion/splat; this side only has to look right. */
    if (s.pr) {
      this.spawnRemoteProjectile(def, from, baseDir, s.sp, s.from);
      Audio3D_SFX.shot(def.sound || 'rifle', muzzle.x, muzzle.y, muzzle.z);
      if (s.pr === 'rocket') Audio3D_SFX.rocketShot(from.x, from.y, from.z);
      else Audio3D_SFX.bananaShot(from.x, from.y, from.z);
      return;
    }

    /* Bullets: draw a tracer for every pellet that was actually fired, so a
       shotgun shows a spread of buckshot and a machine gun a stream of rounds —
       not a single beam along the aim line. */
    const maxDist = def.range || 100;
    const dirs = (s.dirs && s.dirs.length) ? s.dirs
      : [this.spreadDirection(baseDir, s.sp || 0, false)];
    for (const dir of dirs) {
      const wallHits = this.world.raycastAll(from, dir, maxDist);
      let endT = maxDist, p = null, n = null;
      for (const h of wallHits) { endT = h.t; p = h.point; n = h.normal; break; }
      const end = p || { x: from.x + dir.x * endT, y: from.y + dir.y * endT, z: from.z + dir.z * endT };
      this.effects.tracer(muzzle, end, 1.4, true, shotCol);
      if (p) this.effects.impact(p, n, 'concrete');
    }
    Audio3D_SFX.shot(def.sound || 'rifle', muzzle.x, muzzle.y, muzzle.z);
  },

  /* МЕХАКОСТЮМ: the peer launched a missile volley. Fly a matching cosmetic
     missile here, so the rockets are visible to everyone (the owner resolves
     the damage and broadcasts the `boom`). */
  onRemoteMechMissile(m) {
    if (this.mode !== CS.MODE.ONLINE) return;
    const mesh = buildMechMissile();
    mesh.position.set(m.x, m.y, m.z);
    this.scene.add(mesh);
    const dir = { x: m.dx || 0, y: m.dy || 0, z: m.dz || 0 };
    this.remoteMechMissiles = this.remoteMechMissiles || [];
    this.remoteMechMissiles.push({
      mesh: mesh, life: 8,
      pos: { x: m.x, y: m.y, z: m.z },
      vel: { x: dir.x * 8, y: 4, z: dir.z * 8 }
    });
    Audio3D_SFX.rocketShot(m.x, m.y, m.z);
    if (this.remoteMechMissiles.length > 24) {
      const old = this.remoteMechMissiles.shift();
      if (old.mesh.parent) old.mesh.parent.remove(old.mesh);
    }
  },

  updateRemoteMechMissiles(dt) {
    if (!this.remoteMechMissiles || !this.remoteMechMissiles.length) return;
    for (let i = this.remoteMechMissiles.length - 1; i >= 0; i--) {
      const m = this.remoteMechMissiles[i];
      m.life -= dt;
      // gentle arcing flight; visual only
      m.vel.y -= 4 * dt;
      m.pos.x += m.vel.x * dt; m.pos.y += m.vel.y * dt; m.pos.z += m.vel.z * dt;
      m.mesh.position.set(m.pos.x, m.pos.y, m.pos.z);
      const vl = Math.hypot(m.vel.x, m.vel.y, m.vel.z) || 1;
      m.mesh.lookAt(m.pos.x + m.vel.x / vl, m.pos.y + m.vel.y / vl, m.pos.z + m.vel.z / vl);
      if (Math.random() < .7) this.effects.particle(m.pos.x, m.pos.y, m.pos.z, U.rand(-.5, .5), U.rand(-.2, .8), U.rand(-.5, .5), U.rand(.06, .16), 'smoke', U.rand(.3, .7));
      if (m.life <= 0) {
        if (m.mesh.parent) m.mesh.parent.remove(m.mesh);
        this.remoteMechMissiles.splice(i, 1);
      }
    }
  },

  clearRemoteMechMissiles() {
    if (!this.remoteMechMissiles) return;
    for (const m of this.remoteMechMissiles) { if (m.mesh.parent) m.mesh.parent.remove(m.mesh); m.mesh.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
    this.remoteMechMissiles.length = 0;
  },

  /* A purely cosmetic projectile for a shot fired by someone else. It follows
     the same physics as a local one but never deals damage: the shooter owns
     that, and reports the result with a `boom`/`splat` message. */
  spawnRemoteProjectile(def, origin, dir, spread, ownerId) {
    const d = this.spreadDirection(dir, spread || 0, false);
    const isRocket = def.projectile === 'rocket';
    const mesh = isRocket ? buildRocketProjectile() : buildBananaProjectile();
    // a skinned projectile is tinted with the owner's skin glow
    const rp = this.remoteById(ownerId);
    const sk = (rp && rp._weaponSkinId) ? skinById(rp._weaponSkinId) : null;
    const col = sk ? skinShotColor(sk) : null;
    if (col) { const c = new THREE.Color(col); mesh.traverse(o => { if (o.isMesh && o.material && o.material.color) o.material.color.lerp(c, .6); }); }
    mesh.position.set(origin.x, origin.y, origin.z);
    if (!isRocket) mesh.rotation.x = Math.PI / 2;
    this.scene.add(mesh);
    const speed = def.projSpeed || 30;
    this.remoteProjectiles.push({
      mesh: mesh,
      kind: def.projectile,
      ownerId: ownerId,
      life: isRocket ? 8 : 6,
      pos: { x: origin.x, y: origin.y, z: origin.z },
      vel: { x: d.x * speed, y: d.y * speed, z: d.z * speed },
      grav: def.projGravity || 12
    });
    if (this.remoteProjectiles.length > 40) {
      const old = this.remoteProjectiles.shift();
      if (old.mesh.parent) old.mesh.parent.remove(old.mesh);
    }
  },

  updateRemoteProjectiles(dt) {
    if (!this.remoteProjectiles || !this.remoteProjectiles.length) return;
    for (let i = this.remoteProjectiles.length - 1; i >= 0; i--) {
      const pr = this.remoteProjectiles[i];
      pr.life -= dt;
      pr.vel.y -= pr.grav * dt;
      const nx = pr.pos.x + pr.vel.x * dt, ny = pr.pos.y + pr.vel.y * dt, nz = pr.pos.z + pr.vel.z * dt;
      const segLen = Math.hypot(nx - pr.pos.x, ny - pr.pos.y, nz - pr.pos.z);
      const dir = segLen > 1e-6 ? { x: (nx - pr.pos.x) / segLen, y: (ny - pr.pos.y) / segLen, z: (nz - pr.pos.z) / segLen } : { x: 0, y: -1, z: 0 };
      const wallHits = this.world.raycastAll(pr.pos, dir, segLen + 0.1);
      if (wallHits.length && wallHits[0].t <= segLen + 0.1) {
        // the shooter's own `boom`/`splat` message draws the real result
        if (pr.kind !== 'rocket') {
          this.effects.bananaSplat(wallHits[0].point.x, wallHits[0].point.y, wallHits[0].point.z);
        }
        this.removeRemoteProjectile(i);
        continue;
      }
      pr.pos.x = nx; pr.pos.y = ny; pr.pos.z = nz;
      pr.mesh.position.set(pr.pos.x, pr.pos.y, pr.pos.z);
      const vl = Math.hypot(pr.vel.x, pr.vel.y, pr.vel.z) || 1;
      pr.mesh.lookAt(pr.pos.x + pr.vel.x / vl, pr.pos.y + pr.vel.y / vl, pr.pos.z + pr.vel.z / vl);
      if (pr.kind !== 'rocket') { pr.mesh.rotateZ(Math.PI / 2); pr.mesh.rotateY(Math.sin(performance.now() * .02) * .4); }
      if (pr.life <= 0 || pr.pos.y < -3) this.removeRemoteProjectile(i);
    }
  },

  removeRemoteProjectile(i) {
    const pr = this.remoteProjectiles[i];
    if (pr && pr.mesh.parent) pr.mesh.parent.remove(pr.mesh);
    this.remoteProjectiles.splice(i, 1);
  },

  clearRemoteProjectiles() {
    if (!this.remoteProjectiles) return;
    for (const pr of this.remoteProjectiles) { if (pr.mesh.parent) pr.mesh.parent.remove(pr.mesh); }
    this.remoteProjectiles.length = 0;
  },

  onRemoteHit(h) {
    // A hit is only ours when we are the named victim; otherwise the host's
    // relay delivered a hit that belongs to another player.
    if (this.mode !== CS.MODE.ONLINE) return;
    const myId = Net.selfId();
    const me = !h.to || h.to === myId || (this.remotePlayers.length === 1 && !h.to);
    if (!me) return;
    const src = this.remoteById(h.from);
    this._lastHitBy = h.from;                // remembered so we can name our killer
    /* The energy shield reflects ANY incoming hit — bullets as well as rockets,
       bananas and blasts — back at the shooter. We take no damage here and tell
       the shooter their own shot hit them instead. `reflect` stops a loop. */
    if (!h.reflect && this.player.shieldActive) {
      this.reflectHit(h);
      return;
    }
    this.applyDamageToSelf(h.dmg, src ? { x: src.pos.x, y: src.pos.y + 1.2, z: src.pos.z } : null);
  },

  /* Our shield caught an incoming hit: bounce the damage straight back. */
  reflectHit(h) {
    UI.hitmark(false); this._hitmarkT = U.now();
    Audio3D_SFX.pickup();
    UI.feed('<span class="z">Щит отразил удар</span>');
    UI.toast(h.pr ? 'Щит отразил снаряд!' : 'Щит отразил пулю!', '#4aa3ff');
    // send the reflected damage straight back to the shooter, keeping the part
    Net.send({
      t: 'hit', dmg: Math.round(h.dmg), part: h.part || 'body', hs: h.hs ? 1 : 0, at: U.now(),
      to: h.from, from: Net.selfId(), reflect: 1
    });
  },

  onRemoteDied(d) {
    const rp = this.remoteById(d.from);
    if (!rp) return;
    rp.alive = false;
    rp.dead = true;               // stick until an explicit respawn
    // Credit is only given when the victim named us as the killer. In a 2-player
    // room there is only one possible killer, so an untagged death still counts.
    const myId = Net.selfId();
    const credited = d.by ? d.by === myId : this.remotePlayers.length === 1;
    if (credited) {
      this.player.kills++;
      this.player.score += 300;
      Audio3D_SFX.kill();
      UI.hitmark(true);
      UI.feed('<b>' + U.esc(this.player.name) + '</b> ✖ <span style="color:#ff6b5b">' + U.esc(rp.name) + '</span>');
      UI.center('ИГРОК УНИЧТОЖЕН', '', 2.0);
      Store.data.killsTotal++;
      Store.save();
    } else {
      UI.feed('<span style="color:#ff6b5b">' + U.esc(rp.name) + '</span> ✖ уничтожен');
    }
    // Host checks the win condition with the new death count.
    if (Net.role === CS.NETROLE.HOST) this.checkRoundEnd();
  },

  /* A remote player's drone: show it flying for everyone else, and let it be
     shot down. Position updates arrive as short-lived visuals; the owner is
     authoritative for the flight, this side just mirrors it. */
  onRemoteBoom(b) {
    if (this.mode !== CS.MODE.ONLINE) return;
    // an enemy rocket / grenade detonated somewhere on the map — show the same
    // blast the thrower saw, so it is never a private event
    const R = b.r || 6;
    if (this.effects) {
      if (b.g === 'freeze') this.effects.frostBurst(b.x, b.y, b.z, R);
      else this.effects.explosion(b.x, b.y, b.z, R, b.c || null, !!b.nk);
    }
    Audio3D_SFX.explosionAt(b.x, b.y, b.z);
    this.breakMapAt(b.x, b.y, b.z, R * 1.05, 90);
    // drop the cosmetic copy so it does not fly on and detonate again
    this.removeRemoteProjectileNear(b.x, b.y, b.z);
  },

  onRemoteSplat(s) {
    if (this.mode !== CS.MODE.ONLINE) return;
    if (this.effects) this.effects.bananaSplat(s.x, s.y, s.z);
    Audio3D_SFX.bananaSplat(s.x, s.y, s.z);
    this.removeRemoteProjectileNear(s.x, s.y, s.z);
  },

  /* remove any cosmetic remote projectile close to the given point */
  removeRemoteProjectileNear(x, y, z) {
    if (!this.remoteProjectiles) return;
    for (let i = this.remoteProjectiles.length - 1; i >= 0; i--) {
      const pr = this.remoteProjectiles[i];
      if (Math.hypot(pr.pos.x - x, pr.pos.y - y, pr.pos.z - z) < 3) this.removeRemoteProjectile(i);
    }
  },

  onRemoteDrone(d) {
    if (this.mode !== CS.MODE.ONLINE) return;
    /* Someone shot OUR drone down. `to` names the drone's owner (us). The drone
       lives on this machine, so this is where it is actually destroyed — and
       where the blast is broadcast to the room. Without this the owner kept
       flying and dealing damage while the shooter saw it explode. */
    if (d.st === 'down') {
      if (d.to && d.to !== Net.selfId()) return;   // aimed at another player's drone
      if (this.drone) {
        if (d.x !== undefined) { this.drone.pos.x = d.x; this.drone.pos.y = d.y; this.drone.pos.z = d.z; }
        this.detonateDrone(true);
      }
      return;
    }
    const rp = this.remoteById(d.from);
    if (!rp) return;
    if (d.st === 'launch') {
      this.clearRemoteDrone(rp);
      const mesh = buildDroneModel();
      mesh.position.set(d.x, d.y, d.z);
      this.scene.add(mesh);
      rp.droneMesh = mesh;
      rp.droneLife = CFG.droneLife;
      Audio3D_SFX.droneLaunch();
      UI.toast(U.esc(rp.name) + ' запустил дрон', '#4aa3ff');
    } else if (d.st === 'pos') {
      if (!rp.droneMesh) return;
      rp.droneMesh.position.set(d.x, d.y, d.z);
      if (d.yw !== undefined) rp.droneMesh.rotation.y = d.yw;
      rp.droneLife = CFG.droneLife;
      // an enemy drone is just as loud on our side (throttled to ~5/s)
      const now = U.now();
      if (!rp.droneNoiseAt || now - rp.droneNoiseAt > 190) {
        rp.droneNoiseAt = now;
        Audio3D_SFX.droneLoop(d.x, d.y, d.z);
      }
    } else if (d.st === 'boom') {
      if (this.effects) this.effects.explosion(d.x, d.y, d.z, CFG.droneBlast);
      Audio3D_SFX.explosionAt(d.x, d.y, d.z);
      this.clearRemoteDrone(rp);
    }
  },

  clearRemoteDrone(rp) {
    if (!rp || !rp.droneMesh) return;
    rp.droneMesh.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    if (rp.droneMesh.parent) rp.droneMesh.parent.remove(rp.droneMesh);
    rp.droneMesh = null;
  },

  onRemoteRespawn(r) {
    const rp = this.remoteById(r.from);
    const list = (r.from && rp) ? [rp] : this.remotePlayers.slice();
    for (const x of list) {
      x.alive = true;
      x.dead = false;
      x.health = r.hp || this.matchHP;
      x.maxHealth = r.hp || this.matchHP;
      x.applySnap({ x: r.x, y: r.y, z: r.z, yw: r.yaw, pt: 0, alive: 1, cr: 0 });
      x.buf.length = 0;
      x.mesh.visible = !x.mech;      // soldier stays hidden if still in the mech
      x.mesh.scale.y = 1;
      // stand the model back up after a previous death
      x.deathActive = false; x.deathT = 0;
      x.mesh.rotation.x = 0; x.mesh.rotation.z = 0;
    }
  },

  /* tell the room where we respawned */
  broadcastRespawn() {
    if (this.mode !== CS.MODE.ONLINE || !Net.connected) return;
    const p = this.player;
    Net.send({
      t: 'respawn', from: Net.selfId(),
      x: p.pos.x, y: p.pos.y, z: p.pos.z, yaw: p.yaw, hp: this.matchHP
    });
  },
  onRoundMsg(r) {
    if (this.mode !== CS.MODE.ONLINE) return;
    if (r.st === 'skip') { this.onSkipVoteMsg(r); return; }
    if (r.st === 'settings') {
      // the host may retune the room between rounds; clients just follow along
      if (r.hp) { this.matchHP = r.hp; this.player.maxHealth = r.hp; }
      if (r.mapDef) this.adoptCustomMap(r.mapDef);
      if (r.map && r.map !== MAP.id && (this.roundState === 'buy' || this.roundState === 'idle')) this.ensureMap(r.map);
      if (r.players) { this.online.players = r.players; this.refreshSkipUI(); }
      if (r.free !== undefined) this.freePlay = !!r.free;
      if (r.rounds !== undefined) this.online.rounds = MATCH.clampRounds(r.rounds);
      if (r.shop) this.shopAllow = Object.assign({}, r.shop);
      if (r.shopItems) this.shopItemAllow = Object.assign({}, r.shopItems);
      if (r.winner) this.online.winnerName = r.winner;
      /* режим комнаты (PvP / кооп-волны) — задаёт хост */
      if (r.pve !== undefined) this.applyOnlinePve(r.pve);
      /* the host picks the time of day / weather for BOTH players: adopt it */
      if (r.tod !== undefined || r.weather !== undefined || r.envAuto !== undefined || r.envOff !== undefined) {
        if (r.tod !== undefined) { Store.data.timeOfDay = r.tod; Store.data.weather = r.tod; }
        if (r.weather !== undefined) Store.data.skyWeather = r.weather;
        if (r.envAuto !== undefined) Store.data.envAuto = r.envAuto ? 1 : 0;
        if (r.envOff !== undefined) Store.data.envOff = r.envOff ? 1 : 0;
        Store.save();
        this.applyTimeOfDay();
        if (typeof UI !== 'undefined' && UI.refreshEnv) UI.refreshEnv();
      }
      UI.renderPeerList();
      return;
    }
    // a client asked for a rematch; only the host acts on it
    if (r.st === 'rematchask') {
      if (Net.role === CS.NETROLE.HOST && this._matchOverPending) this.rematchOnline();
      return;
    }
    if (Net.role !== CS.NETROLE.CLIENT) return;
    switch (r.st) {
      case 'buy':
        this.beginBuyPhaseClient(r.time || 30, r.no, r.hp, r.map);
        break;
      case 'live':
        this.roundState = 'live';
        this.roundT = r.time || CFG.roundTime;
        UI.center('В БОЙ!', this.onlinePlayerCount() > 2 ? 'Выживает сильнейший' : 'Уничтожьте соперника', 1.4);
        break;
      case 'end':
        this.endRoundClient(r.win, r.no, r.over, r.winner);
        break;
      case 'newround':
        this.doNewRoundClient(r.hp);
        break;
      case 'rounds':
        // the host changed the number of rounds between rounds
        if (r.rounds) { this.online.rounds = MATCH.clampRounds(r.rounds); if (this.online.played >= this.online.rounds) this.endMatch(); }
        break;
      case 'rematch':
        // the host restarted the match: reset the score and start round 1
        if (r.hp) { this.matchHP = r.hp; this.player.maxHealth = r.hp; }
        if (r.free !== undefined) this.freePlay = !!r.free;
        if (r.map && r.map !== MAP.id) this.ensureMap(r.map);
        this.beginRematch(r.rounds);
        break;
    }
  },

  beginBuyPhaseClient(sec, roundNo, hp, mapId) {
    this.roundState = 'buy';
    this.buyTimer = sec;
    this.roundT = sec;
    this.roundNo = (roundNo !== undefined && roundNo > 0) ? roundNo : this.roundNo + 1;
    if (hp) { this.matchHP = hp; this.player.maxHealth = hp; }
    if (mapId && mapId !== MAP.id) { this.ensureMap(mapId); }
    this.resetSkipVotes();
    UI.center('ЗАКУПКА', 'B — магазин', 1.8);
  },

  endRoundClient(win, roundNo, over, winner) {
    if (this.roundState === 'end') return;
    this.roundState = 'end'; this.roundT = 4.2;
    // 'host' wins the last-man-standing duel; anything else is our side
    if (win === 'host') this.online.roundWins.them++;
    else if (win === 'client') this.online.roundWins.me++;
    this.online.played++;
    this.online.scoreMe = this.online.roundWins.me;
    this.online.scoreThem = this.online.roundWins.them;
    if (winner) this.online.winnerName = winner;
    const txt = win === 'host' ? 'РАУНД ПРОИГРАН' : win === 'client' ? 'РАУНД ВЫИГРАН' : 'НИЧЬЯ';
    UI.center(txt, this.online.scoreMe + ' : ' + this.online.scoreThem, 2.6);
    Audio3D_SFX.roundEnd(win !== 'host');
    if (over) this.endMatch();
  },

  doNewRoundClient(hp) {
    this.matchHP = hp || this.matchHP;
    this.player.maxHealth = this.matchHP;
    this.player.health = this.matchHP;
    this.player.armor = 0; this.player.helmet = false;
    this.player.heavyArmor = false; this.player.energyArmor = false;
    this.player.armorMax = CFG.maxAP || 100;
    this.player.alive = true;
    this.player.money = Math.min(CFG.moneyCap, this.player.money + 1400);
    // a drone still in the air belongs to the previous round
    if (this.drone) this.detonateDrone(false);
    for (const rp of this.remotePlayers) this.clearRemoteDrone(rp);
    // a bought drone is recharged every round in online play
    if (this.player.droneOwned) this.player.drone = 1;
    for (const rp of this.remotePlayers) { rp.alive = true; rp.dead = false; rp.health = this.matchHP; rp.maxHealth = this.matchHP; }
    this.spawnPlayerLocal(Math.floor(Math.random() * Math.max(1, MAP.playerSpawns.length)));
    this.beginBuyPhaseClient(25, undefined, this.matchHP);
  },

  /* host: a round ends when only one fighter is left standing */
  checkRoundEnd() {
    if (this.mode !== CS.MODE.ONLINE || Net.role !== CS.NETROLE.HOST) return;
    if (this.isCoop) return;                 // кооп-волны не заканчиваются по смертям игроков
    if (this.roundState === 'end') return;
    const alive = (this.player.alive ? 1 : 0) + this.remotePlayers.filter(r => r.alive).length;
    if (alive > 1) return;
    const iWin = this.player.alive;
    this.endRound(iWin, iWin ? 'последний выживший' : 'все уничтожены');
  },

  onScoreMsg(s) {
    const rp = this.remoteById(s.from);
    if (!rp) return;
    rp.kills = s.k; rp.deaths = s.d; rp.score = s.sc;
    if (s.hp !== undefined) rp.health = s.hp;
  },

  /* ============================================================
     MAIN LOOP
     ============================================================ */
  loop() {
    requestAnimationFrame(this._loopBound);
    const now = performance.now();
    let dt = (now - this._last) / 1000;
    this._last = now;
    if (dt > .1) dt = .1;
    if (dt <= 0) return;
    this.step(dt);
  },

  /* One simulation + render step. Split out from loop() so it can be driven
     deterministically (tests / replays / catch-up). */
  step(dt) {
    // total time played (counted only while the tab is visible, so leaving the
    // game open in a background tab does not inflate the counter)
    let vis = true;
    try { vis = !(typeof document !== 'undefined' && document.hidden); } catch (e) { vis = true; }
    if (vis && dt > 0) {
      Store.data.playTime = (Store.data.playTime || 0) + dt;
      this._timeSaveT = (this._timeSaveT || 0) + dt;
      if (this._timeSaveT >= 15) { this._timeSaveT = 0; try { Store.save(); } catch (e) { } }
    }

    // fps counter
    this._fpsAcc += dt; this._fpsFrames++;
    if (this._fpsAcc > .5) {
      const fps = Math.round(this._fpsFrames / this._fpsAcc);
      const e = UI.el.fps;
      if (e) e.textContent = fps + ' FPS' + (this.horde ? ' · ' + this.horde.list.length + ' zombies' : '');
      this._fpsAcc = 0; this._fpsFrames = 0;
    }

    if (!this.running || this.mode === CS.MODE.MENU) { this.renderMenu(); return; }
    if (this.paused) { this.renderFrame(dt); return; }

    const p = this.player;
    if (!p) return;

    /* ---- guided drone: while it flies, the player steers it and the normal
       movement/physics loop is suspended for the body ---- */
    if (this.drone) {
      this.updateDrone(dt);
      if (this.mode === CS.MODE.ONLINE) {
        this._droneNetT = (this._droneNetT || 0) - dt;
        if (this._droneNetT <= 0 && this.drone) {
          this._droneNetT = 1 / 18;
          const dr = this.drone;
          Net.send({ t: 'drone', st: 'pos', from: Net.selfId(), x: +dr.pos.x.toFixed(2), y: +dr.pos.y.toFixed(2), z: +dr.pos.z.toFixed(2), yw: +dr.yaw.toFixed(2) });
        }
      }
      if (this.effects) this.effects.update(dt);
      this.updateProjectiles(dt);
      this.updateSlashProjectiles(dt);
      /* The other players keep moving while we fly the drone: without this the
         remote models (and their incoming shots) froze until the drone landed. */
      if (this.mode === CS.MODE.ONLINE) {
        this.updateRemoteProjectiles(dt);
        Net.tick(dt);
        this._netStateT -= dt;
        if (this._netStateT <= 0) { this._netStateT = 1 / CFG.netSendLocalHz; this.broadcastState(); }
        for (const rp of this.remotePlayers) { rp.advance(dt); rp.interp(CFG.netInterpMs); rp.sync(dt); }
        this.checkPeerAlive(dt);
      }
      this.cameraUpdate(dt);
      this.renderFrame(dt);
      this.updateHUD(dt);
      if (IS_TOUCH) TouchUI.update();
      return;
    }

    // ---- input → player ----
    const mv = Input.moveVector();
    const m = Input.lookDelta();
    // cache this frame's look delta so a guided missile can steer with the same
    // mouse movement the player just used (lookDelta is consumed on read)
    this._frameLook = { dx: m.dx, dy: m.dy };
    // Block on any UI overlay. The buy menu has DOM inputs, so mouse-delta
    // accumulation is cleared on unlock (see Input.onLockChange / toggleBuy)
    // to avoid a view snap when the crosshair returns.
    const uiBlocked = UI.overlayOpen() && !this.buyOpen;
    const canLook = IS_TOUCH ? (!uiBlocked && !this.buyOpen) : (Input.locked && !this.buyOpen && !uiBlocked);
    if (canLook) {
      let dx = m.dx, dy = m.dy;
      // touch "assist": gently stick to a target near the crosshair
      if (IS_TOUCH) { const a = this.touchAssist(); dx -= a.x; dy -= a.y; }
      p.yaw -= dx;
      p.pitch -= dy;
      p.pitch = U.clamp(p.pitch, -1.5, 1.5);
      p.yaw = ((p.yaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    }
    p.in.f = mv.f; p.in.r = mv.r; p.in.run = mv.run; p.in.crouch = mv.crouch;
    // jump: held Space on desktop; on touch it is a one-shot, so wantJump must be
    // cleared again or the player would re-jump every time they touch the ground.
    // In the MECH the jump key drives the jetpack, so it is held regardless of ground.
    if (this.isMechActive()) {
      p.in.wantJump = IS_TOUCH ? (TouchUI.jumpHeld || Input.keys['Space']) : !!mv.wantJump;
    } else if (IS_TOUCH) {
      p.in.wantJump = Input.consumeJump() && p.onGround;
      // зажатая кнопка ПРЫЖОК включает джетпак перка «ВЫСОКИЙ ПРЫЖОК»
      if (TouchUI.jumpHeld) p.in.wantJump = true;
    } else {
      if (mv.wantJump && p.onGround) p.in.wantJump = true;
      if (!mv.wantJump) p.in.wantJump = false;
    }

    if (IS_TOUCH) {
      if (Input.consumeReload()) p.reload();
      if (Input.consumeWeaponSwitch()) this.switchSlot(p.nextSlot());
      // Touch firing: a single tap fires one shot; the АВТО button locks
      // automatic fire on, exactly like holding LMB on a PC.
      if (TouchUI.tapFire) { TouchUI.tapFire = false; p.triggerDown = true; this._tapFireRelease = 2; }
      if (this._tapFireRelease > 0 && --this._tapFireRelease === 0) p.triggerDown = false;
      if (TouchUI.autoFire) p.triggerDown = true;
      else if (!TouchUI.firePressed && this._tapFireRelease <= 0) p.triggerDown = false;
      if (TouchUI.firePressed) p.triggerDown = true;
    }
    // dedicated climb action: a touch button or the PC key, edge-triggered.
    // In the mech the same button (E) launches the homing missiles instead.
    if (Input.consumeClimb()) {
      if (this.isMechActive()) this.launchMechMissiles();
      else p.climbQueued = true;
    }
    // mech dash: the dash button / key is edge-triggered
    if (Input.consumeDash()) {
      if (this.isMechActive()) this.mechDash();
      else if (p.perkDash) p._gearDashWant = true;   // снаряжение «РЫВОК»
    }

    p._wantAim = Input.aimDown() && canLook;

    /* Touch aim-assist firing: whenever the crosshair is on an enemy the weapon
       fires on its own. On a phone the thumb that aims cannot also tap to shoot,
       so this is what makes touch combat playable. It can be turned off in the
       settings (Автоприцел). */
    const assistFiring = IS_TOUCH && Store.data.aimAssist !== 0 && p.alive && !this.buyOpen &&
      this.roundState === 'live' && this._enemyFound;
    if (assistFiring) {
      p.triggerDown = true;
      this._aimFireHold = 0.12;
    } else if (this._aimFireHold > 0) {
      this._aimFireHold -= dt;
      if (this._aimFireHold <= 0 && !TouchUI.autoFire && !TouchUI.firePressed) p.triggerDown = false;
    }

    // scroll to switch weapons
    if (m.wheel && !this.buyOpen) this.switchSlot(p.nextSlot());

    /* `held` means the trigger is being held by a continuous source (АВТО, the
       on-screen fire button, or the aim assist). Semi-auto weapons must keep
       firing at their rate while that is true — otherwise the semi latch is set
       by the first shot and, because the trigger never releases, a pistol fires
       exactly once and then sits silent. */
    const held = IS_TOUCH && (TouchUI.autoFire || TouchUI.firePressed || assistFiring ||
      (this._tapFireRelease > 0));

    // ---- shooting ----
    // Firing is only allowed once the match is live: not during the buy phase
    // and not while the buy menu is open.
    const beamReady = p.def && p.def.beam && p.spinT > .85 && p.beamVent <= 0;
    const flameFiring = p.def && p.def.flame && p.triggerDown && p.weapon.mag > 0 && p.fireCd <= 0;
    if (p.alive && !this.buyOpen && this.roundState === 'live' && this.mode !== CS.MODE.EDITOR) {
      const def = p.def;
      /* ---- МЕХАКОСТЮМ: ЛКМ — гигантский миниган, ПКМ — гипер-лазер ---- */
      if (this.isMechActive()) {
        if (p.def && p.def.beam) this.stopBeam();
        if (this.effects) this.effects.endFlame();
        const rmb = Input.aimDown() && canLook && !IS_TOUCH;
        this.updateMech(dt, p.triggerDown, rmb || (IS_TOUCH && TouchUI.aimPressed));
      } else if (flameFiring) {
        // held fire: a cone of flame that burns everything in front
        this.updateFlamer(dt);
      } else if (def.ult && Input.aimDown() && canLook && !this._ultAimLatch) {
        /* ПКМ (на телефоне — кнопка ПРИЦЕЛ) — УЛЬТА.
           Меч рыцаря = SANGUINE SLASH, Господин цветов = СОВОКУПНАЯ СИЛА. */
        this._ultAimLatch = true;
        if (def.flowerUlt) this.flowerUlt(); else this.knightUlt();
      } else if (def.beam && p.triggerDown && beamReady) {
        // held fire: a continuous piercing beam instead of bullets
        this.updateBeam(dt);
      } else {
        // the flame must go out the instant the trigger is released
        if (this.effects) this.effects.endFlame();
        if (def.beam) this.stopBeam();
        if (def.auto || def.slot === 3 || held) {
          // automatic weapons fire continuously while held; with a continuous
          // touch source the semi latch is cleared so every weapon repeats
          if (held) p._semiLatch = false;
          if (p.triggerDown) this.fire();
        } else if (p.triggerDown && !p._semiLatch) {
          // semi-auto fallback for synthetic input (tests/replays) and retry after
          // a deploy/reload; a real mouse press already fires and sets the latch
          if (this.fire()) p._semiLatch = true;
        }
      }
      if (!p.triggerDown) p._semiLatch = false;
    } else {
      if (this.effects) this.effects.endFlame();
      if (p.def && p.def.beam) this.stopBeam();
      if (!p.triggerDown) p._semiLatch = false;
    }
    /* сбрасываем «защёлку» ульты, когда кнопка прицела/ПКМ отпущена */
    if (!Input.aimDown()) this._ultAimLatch = false;

    // ---- movement is frozen during the buy phase (CS-style freeze time) ----
    const frozen = this.roundState === 'buy' || this.shooterPickOpen || this.enemySpawnOpen || this._modPickOpen;
    const pin = frozen ? { f: 0, r: 0, run: false, crouch: p.in.crouch, wantJump: false } : p.in;

    // ---- physics ----
    p.update(dt, this.world, pin);
    this.updateFlowerRush(dt);
    this.updateOmega(dt);
    this.updateMechDash(dt);
    p.tickWeapon(dt, this);
    this.updateShield(dt);

    // ---- round flow ----
    this.updateBuyPhase(dt);
    if (this.mode === CS.MODE.OFFLINE && !this._modPickOpen) { this.updateOffline(dt); this.updateCrates(dt); }
    if (this.mode === CS.MODE.ONLINE && this.isCoop) { this.updateCoop(dt); this.updateCrates(dt); }
    /* клиент плавно подтягивает зомби к снапшотам хоста */
    if (this.mode === CS.MODE.ONLINE && this.isCoop && Net.role !== CS.NETROLE.HOST) this.interpRemoteZombies(dt);
    this.updateGrenades(dt);

    // ---- AI ----
    if (this.horde && this.mode !== CS.MODE.EDITOR) this.horde.update(dt, p, (this.mode === CS.MODE.ONLINE && this.isCoop) ? this.remotePlayers : null);
    if (this.mode === CS.MODE.OFFLINE || this.mode === CS.MODE.RANGE || (this.mode === CS.MODE.ONLINE && this.isCoop)) { this.updateBosses(dt); this.updateBossCharges(dt); }
    /* ФИНАЛЬНЫЙ БОСС «МОЗГ»: фазы, колбы, атаки */
    if (typeof BrainBoss !== 'undefined' && BrainBoss.active) BrainBoss.update(dt);

    // ---- effects ----
    if (this.effects) this.effects.update(dt);
    /* РЕДАКТОР КАРТ: обновляем курсор и подсветку */
    if (this.mode === CS.MODE.EDITOR && typeof MapEditor !== 'undefined') MapEditor.update(dt);
    /* экранный эффект ульты рыцаря (чёрный экран + белый слеш) */
    if (typeof UI !== 'undefined' && UI.knightUltTick) UI.knightUltTick(dt);
    if (this.mode === CS.MODE.OFFLINE || this.mode === CS.MODE.RANGE) {
      this.updateFields(dt);         // acid pools / frost patches
      this.updateChronoFields(dt);   // time-dilation bubbles
      this.updateHives(dt);          // hives hatching their swarm
      this.updatePortals(dt);        // mirror-gate teleport + lifetime
      this.updateBurning(dt);        // lingering fire damage from the flamethrower
      this.updateTurretDrone(dt);    // companion turret auto-fire
    }
    this.updateMechBody(dt);
    /* отложенный удар омега-молота: срабатывает в НИЗШЕЙ точке замаха,
       поэтому урон совпадает с анимацией, а не бьёт в момент нажатия */
    this.updateSlamPending(dt);
    /* время в мехакостюме (цель «МЕХ-МАРАФОН») и проверка мех-достижений */
    if (this.isMechActive() && this.roundState === 'live') {
      this._mechTime = (this._mechTime || 0) + dt;
      this._mechAchT = (this._mechAchT || 0) + dt;
      if (this._mechAchT >= 3) { this._mechAchT = 0; this.checkAchievements(); }
    }
    this.updateMechMissiles(dt);

    // ---- environment ----
    this.updateEnvCycle(dt);
    this.updateEnv(dt);
    this.updateWeather(dt);

    // ---- galaxy / flesh skins: animate rings, dust, aura ----
    if (this.player && this.player.vmInner) { animateGalaxySkin(this.player.vmInner, dt); animateFleshSkin(this.player.vmInner, dt); }
    if (this.remotePlayers) for (const rp of this.remotePlayers) {
      if (rp.weaponGroup) { animateGalaxySkin(rp.weaponGroup, dt); animateFleshSkin(rp.weaponGroup, dt); }
      if (rp.mesh && rp.mesh.userData && rp.mesh.userData.galaxyChar) animateGalaxyCharacter(rp.mesh, dt);
    }

    // ---- achievements screen: refresh its progress bars while it is open ----
    this._achTick = (this._achTick || 0) - dt;
    if (this._achTick <= 0) { this._achTick = 0.2; if (typeof UI !== 'undefined' && UI.tickAchProgress) UI.tickAchProgress(); }

    // ---- flying bananas ----
    this.updateProjectiles(dt);
    this.updateSlashProjectiles(dt);
    if (this.mode === CS.MODE.RANGE) this.updateDummyProjectiles(dt);
    if (this.mode === CS.MODE.OFFLINE || this.mode === CS.MODE.RANGE) this.updateEnemyShots(dt);
    if (this.mode === CS.MODE.ONLINE) { this.updateRemoteProjectiles(dt); this.updateRemoteMechMissiles(dt); }

    // ---- networking ----
    if (this.mode === CS.MODE.ONLINE) {
      Net.tick(dt);
      this._netStateT -= dt;
      if (this._netStateT <= 0) { this._netStateT = 1 / CFG.netSendLocalHz; this.broadcastState(); }
      for (const rp of this.remotePlayers) { rp.advance(dt); rp.interp(CFG.netInterpMs); rp.sync(dt); }
      this.checkPeerAlive(dt);
    }

    // ---- death handling offline ----
    if (this.mode === CS.MODE.OFFLINE && this.offlineDead) {
      this.offlineDeadT = (this.offlineDeadT || 0) + dt;
      if (this.roundT <= 0) this.restartOfflineOffer();
    }

    this.cameraUpdate(dt);
    this.renderFrame(dt);
    this.updateHUD(dt);
    if (IS_TOUCH) TouchUI.update();
  },

  /* The guided missile the local player is currently steering, if any. */
  localGuidedMissile() {
    if (!this.projectiles || !this.projectiles.length) return null;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      if (pr.guided && pr.ownerIsLocal) return pr;
    }
    return null;
  },

  restartOfflineOffer() {
    if (this._offeredRestart) return;
    this._offeredRestart = true;
    const cp = this.loadCheckpoint();      // load this mode's saved run, if any
    if (this._campaignWon) {
      UI.center('ИГРА ПРОЙДЕНА!', 'Пройдено раз: ' + (Store.data.clears || 0) + ' · Enter — сыграть снова', 600);
    } else if (cp) {
      UI.center('ВЫ ПОГИБЛИ', 'Enter — заново · C — с сохранения (волна ' + cp.wave + ') · Tab — статистика', 600);
    } else {
      UI.center('ВЫ ПОГИБЛИ', 'Enter — начать заново · Tab — статистика', 600);
    }
    this._restartPending = true;
  },

  /* ============================================================
     CHECKPOINTS — one saved run PER MODE
     Every offline preset (обычный, орда ×10, бесплатная орда, свой, босс-раш,
     испытание дня, бесконечный) keeps its own slot, so you can start a new game
     in one mode, save it, and still continue a different mode later. The slots
     live in Store.data.checkpoints; Store.data.checkpoint (the old single slot)
     is migrated in on first load.
     ============================================================ */
  /* which slot the current run belongs to (falls back to the menu selection) */
  checkpointKey() {
    /* ОНЛАЙН-КООП пишется в СВОЙ слот ('coop'), чтобы не путать прогресс с
       оффлайн-забегами. */
    if (this.mode === CS.MODE.ONLINE && this.isCoop) return 'coop';
    if (this.mode === CS.MODE.OFFLINE || this.customOffline || this.hordeMode || this.isBossRush || this.isEndless || this.isDaily) {
      return offlineModeKey(this.specialMode, this.hordeMode, this.freePlay, this.customOffline);
    }
    return Store.data.offMode || 'normal';
  },
  allCheckpoints() {
    const list = Store.data.checkpoints = Store.data.checkpoints || {};
    // migrate the legacy single checkpoint once
    if (Store.data.checkpoint && !list.normal && !list.horde && !list.freehorde && !list.custom) {
      const cp = Store.data.checkpoint;
      list[offlineModeKey(null, cp.horde, cp.free, cp.custom)] = cp;
      Store.data.checkpoint = null;
      Store.save();
    }
    return list;
  },
  /* Save a checkpoint every 20 waves so a death is not a total restart. It is
     stored under this run's mode slot and persisted to localStorage. */
  saveCheckpoint(wave) {
    const p = this.player;
    const key = this.checkpointKey();
    const cp = {
      wave: wave,
      mode: key,
      money: p.money,
      score: p.score,
      inv1: p.inv[1] ? p.inv[1].id : null,
      inv2: p.inv[2] ? { id: p.inv[2].id, mag: p.inv[2].mag, reserve: p.inv[2].reserve } : null,
      inv3: p.inv[3] ? { id: p.inv[3].id, mag: p.inv[3].mag, reserve: p.inv[3].reserve } : null,
      /* СУМКА: вытесненное оружие тоже сохраняем, иначе после сохранения и
         выхода оно пропадало и приходилось покупать заново. */
      bag: (p.bag || []).map(b => ({ id: b.id, mag: b.mag, reserve: b.reserve })),
      slot: p.slot,
      armor: p.armor, armorMax: p.armorMax, helmet: p.helmet,
      heavy: !!p.heavyArmor, energy: !!p.energyArmor,
      medkits: p.medkits || 0, medkitUnlimited: !!p.medkitUnlimited,
      drone: p.drone || 0, droneOwned: !!p.droneOwned,
      // which offline preset this run used, so resuming restores the same mode
      horde: !!this.hordeMode, free: !!this.freePlay, custom: !!this.customOffline,
      offCount: this.offCountMul, offHp: this.offHpMul
    };
    this._checkpoint = cp;
    const list = this.allCheckpoints();
    list[key] = cp;
    Store.data.checkpoint = null;            // legacy slot no longer used
    try { Store.save(); } catch (e) { }
    if (typeof ACCOUNT !== 'undefined') ACCOUNT.scheduleSync();
  },

  /* Restore a saved checkpoint for a mode (default: the current one). */
  loadCheckpoint(key) {
    const list = this.allCheckpoints();
    const k = key || this.checkpointKey();
    const cp = list[k];
    if (cp && cp.wave) { if (k === this.checkpointKey()) this._checkpoint = cp; return cp; }
    return null;
  },

  /* True when there is a checkpoint for this mode (or any mode). */
  hasCheckpoint(key) {
    if (key) return !!this.loadCheckpoint(key);
    return Object.keys(this.allCheckpoints()).length > 0;
  },

  /* Drop the checkpoint for a mode (new run, or after it is consumed). */
  clearCheckpoint(key) {
    const k = key || this.checkpointKey();
    const list = this.allCheckpoints();
    delete list[k];
    if (k === this.checkpointKey()) this._checkpoint = null;
    if (Store.data) { Store.data.checkpoint = null; try { Store.save(); } catch (e) { } }
  },

  /* Resume from a checkpoint: rebuild the run around the saved state and jump
     straight back to the checked wave rather than wave 1. */
  resumeFromCheckpoint(key) {
    const cp = this.loadCheckpoint(key);
    if (!cp) return false;
    // the saved run's own mode is authoritative; make it the selected mode
    const mode = cp.mode || 'normal';
    Store.data.offMode = mode;
    Store.data.horde = cp.horde ? 1 : 0;
    if (cp.custom) {
      Store.data.offFree = cp.free ? 1 : 0;
      if (cp.offCount != null) Store.data.offCount = cp.offCount;
      if (cp.offHp != null) Store.data.offHp = cp.offHp;
    }
    Store.save();
    // restore the exact preset the run used
    if (cp.custom) this.startOffline(false, !!cp.free, true, true);
    else this.startOffline(!!cp.horde, !!cp.free, false, true);
    if (cp.custom) {
      if (cp.offCount != null) { this.offCountMul = cp.offCount; Store.data.offCount = cp.offCount; }
      if (cp.offHp != null) { this.offHpMul = cp.offHp; Store.data.offHp = cp.offHp; }
      this.freePlay = !!cp.free;
    }
    const o = this.offline;
    o.wave = Math.max(0, cp.wave - 1);         // startWave() increments
    const p = this.player;
    p.money = cp.money; p.score = cp.score;
    p.armor = cp.armor; p.helmet = cp.helmet; p.heavyArmor = cp.heavy; p.energyArmor = !!cp.energy;
    p.armorMax = cp.armorMax || (p.energyArmor ? 300 : p.heavyArmor ? 200 : CFG.maxAP || 100);
    p.medkits = cp.medkits; p.medkitUnlimited = cp.medkitUnlimited;
    p.drone = cp.drone; p.droneOwned = cp.droneOwned;
    if (cp.inv1) p.give(cp.inv1);
    if (cp.inv2) {
      p.give(cp.inv2.id);
      const w = p.inv[2];
      if (w) { if (cp.inv2.mag !== undefined && w.mag !== Infinity) w.mag = cp.inv2.mag; if (cp.inv2.reserve !== undefined) w.reserve = cp.inv2.reserve; }
    }
    /* оружие ближнего боя (слот 3): если в сохранении был не нож — вернуть его */
    if (cp.inv3 && cp.inv3.id && cp.inv3.id !== 'knife') p.give(cp.inv3.id);
    /* восстановить сумку (вытесненное оружие) */
    if (cp.bag) { p.bag.length = 0; for (const b of cp.bag) p.bag.push({ id: b.id, mag: b.mag, reserve: b.reserve }); }
    if (cp.slot) p.slot = cp.slot;
    /* приоритет отдаём тому, что реально было в руках; ближний бой (3) не теряем */
    if (cp.slot === 3) p.slot = 3;
    else if (cp.inv2) { p.slot = 2; } else if (cp.inv1) { p.slot = 1; }
    p.buildViewModel(); this.attachViewModel();
    // skip the buy phase and jump into the wave
    this.roundState = 'live';
    this.startWave();
    UI.toast('СОХРАНЕНИЕ [' + offlineModeLabel(mode) + ']: волна ' + cp.wave, '#57d16a');
    this._restartPending = false; this._offeredRestart = false; this.offlineDead = false; this.offlineDeadT = 0;
    return true;
  },

  cameraUpdate(dt) {
    const p = this.player;

    /* While a guided missile is in the air we look THROUGH it: first-person view
       from the rocket, steering with the same look input. The missile HUD frame
       (green brackets + reticle) is shown in its place. */
    const missile = this.localGuidedMissile();
    if (missile) {
      const pr = missile;
      const vl = Math.hypot(pr.vel.x, pr.vel.y, pr.vel.z) || 1;
      const yaw = Math.atan2(-pr.vel.x, -pr.vel.z);
      const pitch = Math.asin(U.clamp(pr.vel.y / vl, -1, 1));
      this.camera.position.set(pr.pos.x, pr.pos.y, pr.pos.z);
      this.camera.rotation.order = 'YXZ';
      this.camera.rotation.y = yaw;
      this.camera.rotation.x = pitch;
      this.camera.rotation.z = 0;
      if (Math.abs(this.camera.fov - this.baseFov) > .01) { this.camera.fov = this.baseFov; this.camera.updateProjectionMatrix(); }
      // hide the rocket's own mesh so it does not fill the view
      if (pr.mesh) pr.mesh.visible = false;
      // normal crosshair off; missile HUD on
      UI.el.crosshair.classList.add('hide');
      UI.scope(false);
      UI.el.hitmark && UI.el.hitmark.classList.remove('on');
      UI.el.missileHud && UI.el.missileHud.classList.remove('hidden');
      if (UI.el.mhTime) UI.el.mhTime.textContent = Math.max(0, pr.life).toFixed(1) + 'C';
      const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
      Audio3D_SFX.setListener(pr.pos.x, pr.pos.y, pr.pos.z, fx, fz);
      return;
    }
    UI.el.missileHud && UI.el.missileHud.classList.add('hidden');

    /* While the drone is airborne the camera follows it from behind, so the
       player sees where they are flying. */
    if (this.drone) {
      const dr = this.drone;
      const camDist = 3.4, camUp = 1.25;
      const yaw = dr.yaw, pitch = dr.pitch;
      const back = { x: Math.sin(yaw) * Math.cos(pitch), y: -Math.sin(pitch), z: Math.cos(yaw) * Math.cos(pitch) };
      this.camera.position.set(
        dr.pos.x + back.x * camDist,
        dr.pos.y + back.y * camDist + camUp,
        dr.pos.z + back.z * camDist
      );
      this.camera.rotation.order = 'YXZ';
      this.camera.rotation.y = yaw;
      this.camera.rotation.x = pitch - 0.18;
      this.camera.rotation.z = 0;
      if (Math.abs(this.camera.fov - this.baseFov) > .01) { this.camera.fov = this.baseFov; this.camera.updateProjectionMatrix(); }
      UI.setCrosshairSpread(0);
      UI.crosshairState(false, false);
      UI.scope(false);
      const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
      Audio3D_SFX.setListener(dr.pos.x, dr.pos.y, dr.pos.z, fx, fz);
      const drEl = UI.el.droneTag;
      if (drEl) { drEl.textContent = 'ДРОН ' + Math.max(0, Math.ceil(dr.life)) + 'с'; drEl.classList.remove('hidden'); drEl.classList.add('usable'); }
      return;
    }

    const eyeH = this.isMechActive() ? CFG.mechEyeHeight : (p.crouching ? CFG.eyeHeightCrouch : CFG.eyeHeight);
    const dead = !p.alive;
    // on death the view sinks to the floor, as if the body dropped
    if (dead) p._deadT = (p._deadT || 0) + dt;
    else p._deadT = 0;
    const fallK = dead ? U.clamp((p._deadT || 0) / .6, 0, 1) : 0;
    const curEye = dead ? U.lerp(eyeH, .40, Math.sin(fallK * Math.PI * .5)) : eyeH;
    // bob & sway
    const hspeed = Math.hypot(p.vel.x, p.vel.z);
    const spd = U.clamp(hspeed / CFG.runSpeed, 0, 1);
    const bobX = Math.sin(p.bobPhase * Math.PI * 2) * 0.022 * spd;
    const bobY = Math.abs(Math.sin(p.bobPhase * Math.PI * 2)) * -.030 * spd;
    const land = p.landImpact;
    p.landImpact = U.lerp(p.landImpact, 0, 1 - Math.pow(0.00001, dt));
    if (p.swingT > 0) p.swingT = Math.max(0, p.swingT - dt);

    const fov = this.baseFov / (1 + (p.zoom || 0) * (p.def.zoom ? (p.def.zoom - 1) : 0));
    if (Math.abs(this.camera.fov - fov) > .01) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }
    this.vmCamera.fov = 58 - (p.zoom || 0) * 24;
    this.vmCamera.updateProjectionMatrix();

    const recoilPitch = p.recoil + p.viewPunchP;
    const recoilYaw = p.recoilYaw + p.viewPunchY;

    this.camera.position.set(
      p.pos.x + bobX * .4,
      p.pos.y + curEye + bobY - land * .22,
      p.pos.z
    );
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = p.yaw + recoilYaw;
    this.camera.rotation.x = p.pitch + recoilPitch;
    this.camera.rotation.z = U.lerp(this.camera.rotation.z, dead ? .85 : (p.in.r || 0) * -0.012 + bobX * .5, .12);

    // ---- weapon view model ----
    const vm = p.vmGroup;
    if (vm) {
      const def = p.def;
      const reloadK = p.reloadT > 0 ? 1 - Math.abs(p.reloadT / p.reloadTotal - .5) * 2 : 0;
      const deployK = U.clamp(p.deployT / .42, 0, 1);
      const runK = (p.in.run && spd > .3) ? spd : 0;
      const zoomHide = p.zoom > .55;
      vm.visible = !zoomHide && !this.isMechActive();
      const baseX = .20, baseY = -.20, baseZ = -.46;
      const swayX = -recoilYaw * 2.2;
      const swayY = -recoilPitch * 1.6;
      const idleX = Math.sin(U.now() * .0014) * .004;
      const idleY = Math.cos(U.now() * .0019) * .004;
      const bobWX = Math.sin(p.bobPhase * Math.PI * 2) * .016 * spd;
      const bobWY = Math.abs(Math.cos(p.bobPhase * Math.PI * 2)) * .014 * spd;
      vm.position.set(
        baseX + swayX + idleX + bobWX - runK * .07,
        baseY + swayY + idleY + bobWY - deployK * .5 - runK * .05 - reloadK * .12,
        baseZ + recoilPitch * 1.4 + reloadK * .04
      );
      vm.rotation.set(
        recoilPitch * 5.5 + deployK * .8 + reloadK * .5,
        -recoilYaw * 4.5 - runK * .3,
        -reloadK * .55 + runK * .18
      );
      /* ---- БЕНЗОПИЛА: жужжит на холостом ходу, дёргается при «газе» ---- */
      if (vm.userData.chainsaw) {
        const buzz = Math.sin(U.now() * .045) * .012;
        const hot = (p.swingT > 0) ? 1 : 0;
        vm.position.x += buzz * (1 + hot);
        vm.position.y += Math.cos(U.now() * .052) * .010 * (1 + hot);
        vm.rotation.z += buzz * .6 + hot * .05;
      }
      /* ---- МАХ БЛИЖНЕГО БОЯ ----
         Пока идёт замах, viewmodel проигрывает широкую дугу: заносится вбок и
         вверх, затем резко проносится через центр и «доводится» вниз. Это и
         даёт ощущение взмаха мечом вместо прямого тычка. */
      if (p.swingT > 0) {
        const k = 1 - p.swingT / (p.swingMax || .28);        // 0 → 1 за замах
        const side = p.swingSide || 1;
        const kind = p.swingKind || 'knife';
        if (kind === 'megahammer') {
          /* СВЕРХУ ВНИЗ: быстрый занос НАД головой (windUp), затем молот РЕЗКО
             падает вниз и уходит НИЖЕ линии (slam), после — возврат к нейтрали.
             Ключевое: пронос должен уйти в минус по rotation.x (голова молота
             вниз), иначе движение читается как удар снизу вверх. */
          const windUp = U.clamp(k / .30, 0, 1);
          const slam = U.clamp((k - .30) / .30, 0, 1);
          const follow = U.clamp((k - .60) / .40, 0, 1);
          const wind = Math.sin(windUp * Math.PI * .5);
          const slamE = 1 - Math.pow(1 - slam, 2);            // резкий разгон вниз
          // заносим вверх (+), затем обрушиваем вниз (−) с заходом ниже линии
          vm.rotation.x += wind * .95 - slamE * 2.5 + follow * 1.55;
          vm.rotation.z += side * .15 * (wind * .5 - slamE * .8);
          vm.position.y += wind * .30 - slamE * .48 + follow * .18;
          vm.position.z += wind * .12 - slamE * .10 - follow * .02;
          // камера клюёт ВНИЗ при ударе (отрицательный x = взгляд вниз)
          this.camera.rotation.x += (-slamE * .13 + wind * .05) * (1 - follow);
        } else {
        // кривая: быстро вверх-назад (0..0.35), резкий пронос (0.35..0.75), возврат
        const windUp = U.clamp(k / .35, 0, 1);
        const slash = U.clamp((k - .35) / .40, 0, 1);
        const follow = U.clamp((k - .75) / .25, 0, 1);
        const wind = Math.sin(windUp * Math.PI * .5);         // 0→1 плавно
        const slashE = 1 - Math.pow(1 - slash, 3);            // ease-out проноса
        // боковой замах: уводим вправо/влево и назад
        const wide = (kind === 'hammer' || kind === 'axe') ? .9 : kind === 'katana' ? .8 : kind === 'fists' ? .5 : .7;
        vm.rotation.y += -side * wide * (wind * .9 - slashE * 1.5 + follow * .3);
        vm.rotation.z += side * wide * (wind * .55 - slashE * 1.1 + follow * .2);
        vm.rotation.x += (wind * .5 - slashE * 1.15 + follow * .25);
        // и заносим вбок/вниз по позиции — замах «от плеча»
        vm.position.x += side * wide * .10 * (wind * .6 - slashE * 1.0);
        vm.position.y += (wind * .08 - slashE * .16 + follow * .04);
        vm.position.z += (wind * .05 - slashE * .12);
        // тяжёлое оружие покачивает камеру на проносе
        if ((kind === 'hammer' || kind === 'axe') && slash > 0 && slash < 1) {
          this.camera.rotation.z += side * .05 * Math.sin(slash * Math.PI);
        }
        }
      }
      if (p.flashT <= 0 && p.flashMesh) p.flashMesh.material.opacity = 0;
      if (p.flashT <= 0 && p.flashLight) p.flashLight.intensity = 0;
    }

    // crosshair
    const spreadPx = p.aimSpread() * 900 + (p.reloadT > 0 ? 14 : 0);
    UI.setCrosshairSpread(spreadPx);
    UI.crosshairState(p.zoom > .5, this._enemyFound);
    UI.scope(p.zoom > .5 && !!p.def.zoom);

    // enemy-under-crosshair check (every few frames)
    this._enemyCheck -= dt;
    if (this._enemyCheck <= 0) {
      this._enemyCheck = .06;
      const o = { x: p.pos.x, y: p.pos.y + eyeH, z: p.pos.z };
      const d = this.cameraDir();
      if (this.mode === CS.MODE.OFFLINE || (this.mode === CS.MODE.ONLINE && this.isCoop)) {
        const h = this.horde ? this.horde.raycast(o, d, 90) : null;
        this._enemyFound = !!h;
      } else if (this.mode === CS.MODE.ONLINE) {
        const h = this.rayRemoteAny(o, d, 90);
        this._enemyFound = !!h;
      } else this._enemyFound = false;
    }

    // audio listener
    const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
    Audio3D_SFX.setListener(p.pos.x, p.pos.y + eyeH, p.pos.z, fx, fz);

    // hitmark timing / centre message timeout
    if (this._hitmarkT && U.now() - this._hitmarkT > 250) { this._hitmarkT = null; }
    if (UI._centerT > 0) {
      UI._centerT -= dt;
      if (UI._centerT <= 0) UI.el.centerMsg.classList.remove('on');
    }
  },

  renderMenu() {
    if (this.headless) return;
    // the menu has its own calm theme (only once, and only if audio is live)
    if (Audio3D_SFX.ctx && !Audio3D_SFX.musicOff && (!Audio3D_SFX._music || Audio3D_SFX._music.name !== 'menu')) {
      this.refreshMusic();
    }
    /* ОБЛЁТ ФОНА МЕНЮ: камера плавно кружит над ареной, а сама арена
       периодически СМЕНЯЕТСЯ на другую карту (если включено в настройках).
       Store.data.map при этом не трогается — выбранная игроком карта остаётся. */
    const tt = U.now() * .001;
    const tour = Store.data.menuTour === undefined ? 1 : Store.data.menuTour;
    let mapId = MAP.id;
    if (tour) {
      // каждые ~20 секунд показываем следующую карту
      if (!this._tourLast) this._tourLast = U.now();
      if (U.now() - this._tourLast > 20000 && MAPS && MAPS.length) {
        this._tourLast = U.now();
        const ids = MAPS.map(m => m.id);
        let i = ids.indexOf(MAP.id);
        i = (i + 1) % ids.length;
        mapId = ids[i];
        buildMap(this.scene, Store.data.quality, mapId);
        this.world = MAP.world;
        this.applyQuality();
      }
    } else {
      // обычный фон: спокойный облёт ВЫБРАННОЙ карты
      const want = Store.data.map && mapById(Store.data.map).id;
      if (want && MAP.id !== want) {
        buildMap(this.scene, Store.data.quality, want);
        this.world = MAP.world;
        this.applyQuality();
      }
    }
    const ang = tt * .045;
    const R = 60 + Math.sin(tt * .13) * 12;
    const y = 24 + Math.sin(tt * .07) * 9;
    this.camera.position.set(Math.cos(ang) * R, y, Math.sin(ang) * R);
    this.camera.lookAt(0, 3, 0);
    this.camera.rotation.z = 0;
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
  },

  renderFrame(dt) {
    if (this.headless) return;
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    // first-person weapon on top, in its own scene → never clips through walls
    // (hidden while the player is flying the drone)
    if (this.running && this.mode !== CS.MODE.MENU && !this.drone && !this.localGuidedMissile() && this.player && this.player.alive && this.vmScene.children.length) {
      this.renderer.clearDepth();
      this.renderer.render(this.vmScene, this.vmCamera);
    }
  },

  updateHUD(dt) {
    const p = this.player;
    if (!p) return;
    this._uiT -= dt;
    let timer = this.roundT, objective = '';
    if (this.drone) {
      timer = this.drone.life;
      objective = 'ДРОН · HP ' + Math.max(0, Math.round(this.drone.hp)) + ' · F — взрыв';
    } else if (this.mode === CS.MODE.OFFLINE && this.offline) {
      const o = this.offline;
      const waveWord = this.hordeMode ? 'ОРДА ' : 'ВОЛНА ';
      if (this.roundState === 'live' && !o.betweenWaves) {
        if (o.bossPending > 0) objective = waveWord + o.wave + ' · БОСС x' + o.bossPending + ' приближается';
        else {
          const boss = this.horde.list.filter(z => z.alive && !z.dying && (z.isBoss || z.isMiniBoss))[0];
          objective = boss ? (boss.isMiniBoss ? 'МИНИ-БОСС: ' : 'БОСС: ') + boss.def.name + ' · ' + Math.max(0, Math.round(boss.health)) + ' HP'
                           : waveWord + o.wave + ' · осталось ' + (o.toSpawn + this.horde.aliveCount);
        }
      }
      else if (o.betweenWaves) { objective = 'ПЕРЕДЫШКА · волна ' + (o.wave + 1); timer = o.breakT; }
      else objective = 'ЗАКУПКА · волна ' + (o.wave + 1);
    } else if (this.mode === CS.MODE.ONLINE) {
      const alive = (p.alive ? 1 : 0) + this.remotePlayers.filter(r => r.alive).length;
      const total = this.online ? this.online.rounds : 1;
      const label = 'РАУНД ' + Math.min(this.roundNo, total) + '/' + total;
      if (this.online && this.online.matchOver) {
        objective = 'МАТЧ ОКОНЧЕН · СЧЁТ ' + this.online.roundWins.me + ':' + this.online.roundWins.them + ' · Enter — в меню';
        timer = 0;
      } else {
        objective = this.roundState === 'buy' ? 'ЗАКУПКА · ' + label :
          this.roundState === 'live' ? label + ' · ' + alive + '/' + this.onlinePlayerCount() + ' живых' :
          'КОНЕЦ РАУНДА';
      }
    } else if (this.mode === CS.MODE.RANGE) {
      timer = 0;
      if (this.aim) {
        objective = 'АИМ · счёт ' + this.aim.score + ' · точность ' +
          (this.aim.shots > 0 ? Math.round(this.aim.hits / this.aim.shots * 100) + '%' : '—');
      } else if (IS_TOUCH) {
        // the range readouts are a desktop feature; phones just show the mode
        objective = 'ПОЛИГОН';
      } else {
        const dps = this._rangeDps || 0;
        objective = 'ПОЛИГОН · ' + (dps > 0 ? Math.round(dps) + ' урон/с' : 'стреляйте по манекенам');
      }
    }
    if (this._uiT <= 0) {
      this._uiT = .1;
      UI.updateHUD(p, this.mode, {
        timer: timer,
        objective: objective,
        ping: Net.connected ? Net.ping : undefined,
        role: Net.role === CS.NETROLE.HOST ? 'ХОСТ' : 'КЛИЕНТ'
      });
      if (this.mode === CS.MODE.OFFLINE || this.mode === CS.MODE.ONLINE || this.mode === CS.MODE.RANGE) UI.drawMinimap(this);
    }
    // the range scoreboard refreshes a few times a second
    if (this.mode === CS.MODE.RANGE) {
      this._panelT = (this._panelT || 0) - dt;
      if (this._panelT <= 0) { this._panelT = .2; this.updateRangePanel(); }
    }
    this.updateBossBar();
    if (this._restartPending && !this._creditsOpen && (Input.keys['Enter'] || Input.keys['NumpadEnter'])) {
      const wasHorde = this.hordeMode;
      const wasFree = this._freeHorde;
      const wasCustom = this.customOffline;
      this._restartPending = false; this._offeredRestart = false; this.offlineDead = false; this.offlineDeadT = 0;
      // keep the custom mode (and read fresh multipliers), otherwise the presets
      this.startOffline(wasHorde, wasFree, wasCustom);
    }
    // C = resume from the last checkpoint (only while the death/restart prompt is up)
    if (this._restartPending && !this._creditsOpen && !this._campaignWon && this.loadCheckpoint() && Input.keys['KeyC']) {
      Input.keys['KeyC'] = false;
      this.resumeFromCheckpoint();
    }
    // after the final online round, Enter returns to the menu
    if (this._matchOverPending && (Input.keys['Enter'] || Input.keys['NumpadEnter'])) {
      this._matchOverPending = false;
      this.stopToMenu();
    }
  },

  /* Show the health of the nearest living boss in the offline mode. */
  updateBossBar() {
    const el = UI.el.bossBar;
    if (!el) return;
    let boss = null;
    if ((this.mode === CS.MODE.OFFLINE || this.mode === CS.MODE.RANGE) && this.horde) {
      for (const z of this.horde.list) {
        if (z.alive && !z.dying && (z.isBoss || z.isMiniBoss)) { if (!boss || z.health > boss.health) boss = z; }
      }
    }
    if (!boss) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    UI.el.bossName.textContent = boss.def.name + ' · ' + Math.max(0, Math.round(boss.health)) + ' / ' + Math.round(boss.maxHealth);
    UI.el.bossFill.style.transform = 'scaleX(' + U.clamp(boss.health / boss.maxHealth, 0, 1) + ')';
  }
};

/* ---------------- exports (also used by the automated test harness) ---------------- */
window.CS = CS; window.CFG = CFG; window.WEAPONS = WEAPONS; window.GEAR = GEAR;
window.ZOMBIES = ZOMBIES; window.U = U; window.Store = Store; window.Bus = Bus;
window.MATCH = MATCH; window.MAPS = MAPS; window.mapById = mapById;
window.AABB = AABB; window.rayBox = rayBox; window.navPath = navPath;
window.FlowField = FlowField; window.Horde = Horde; window.Zombie = Zombie;
window.Player = Player; window.Effects = Effects; window.RemotePlayer = RemotePlayer;
window.Dummy = Dummy;
window.CollisionWorld = CollisionWorld; window.Audio3D_SFX = Audio3D_SFX;
window.MAP = MAP; window.MAT = MAT; window.TEXTURES = TEXTURES; window.Input = Input;
window.UI = UI; window.Net = Net; window.buildMap = buildMap; window.buildTextures = buildTextures;
window.Game = Game;
window.buildWeaponModel = buildWeaponModel;
window.PAL = PAL;
window.buildBananaProjectile = buildBananaProjectile;
window.buildDroneModel = buildDroneModel;

/* ---------------- PWA: install prompt + service worker ---------------- */
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  // file:// cannot host a service worker; only register over http(s)
  if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.warn('service worker registration failed:', err && err.message);
    });
  });
}

/* Let the player install the game to their home screen from the menu.
   The Android panel shows step-by-step instructions, and — when the browser
   actually offers one — a real УСТАНОВИТЬ button backed by the saved
   beforeinstallprompt event. If the browser never offers it (Safari, Firefox,
   desktop, or Chrome that already installed the app), the button explains where
   to find "Установить приложение" in the browser menu instead of silently
   doing nothing. */
let _installPrompt = null;
function doInstall() {
  if (!_installPrompt) {
    UI.toast('Откройте меню браузера ⋮ → «Установить приложение»', '#f5d33c');
    return false;
  }
  _installPrompt.prompt();
  _installPrompt.userChoice.then(c => {
    if (c && c.outcome === 'accepted') UI.toast('Игра устанавливается…', '#57d16a');
    _installPrompt = null;
    const b = document.getElementById('btnAndroidInstall');
    if (b) b.classList.add('hidden');
  }).catch(() => { _installPrompt = null; });
  return true;
}
function initInstall() {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    _installPrompt = e;
    const btn = document.getElementById('btnInstall');
    if (btn) btn.classList.remove('hidden');
  });
  window.addEventListener('appinstalled', () => {
    _installPrompt = null;
    UI.toast('Игра установлена! Найдите значок на главном экране', '#57d16a');
  });
  // legacy hidden button kept for older bookmarks/markup
  const btn = document.getElementById('btnInstall');
  if (btn) btn.addEventListener('click', () => doInstall());
  // the always-visible Android panel button
  const ab = document.getElementById('btnAndroidInstall');
  if (ab) ab.addEventListener('click', () => doInstall());
}

/* ---------------- boot ---------------- */
window.addEventListener('DOMContentLoaded', () => {
  try {
    Game.init();
    initSettings();
    initTouch();
    initInstall();
    registerServiceWorker();
    // flush the play-time counter when the page is hidden or closed
    const flushTime = () => { try { Store.save(); } catch (e) { } };
    window.addEventListener('pagehide', flushTime);
    window.addEventListener('beforeunload', flushTime);
    document.addEventListener('visibilitychange', flushTime);
    if (IS_TOUCH) {
      // keep the address bar from eating the screen on mobile browsers
      const meta = document.querySelector('meta[name=viewport]');
      if (meta) meta.setAttribute('content', 'width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover');
      const hide = () => { setTimeout(() => window.scrollTo(0, 1), 80); };
      window.addEventListener('resize', hide);
      hide();
    }
  } catch (e) {
    console.error(e);
    const t = document.getElementById('loadTxt');
    if (t) t.textContent = 'Ошибка запуска: ' + e.message;
  }
});
