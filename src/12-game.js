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

  /* ---------------- arms (pivot at the shoulder) ---------------- */
  const arm = (side) => {
    const p = limb(side * .33, 1.40, 0);
    p.add(box(.15, .30, .16, bodyMat, 0, -.15, 0));               // upper arm
    p.add(box(.14, .16, .15, bodyMat2, 0, -.32, 0));              // elbow
    p.add(box(.13, .30, .14, bodyMat, 0, -.47, 0));               // forearm
    p.add(box(.14, .12, .15, gloveMat, 0, -.64, -.01));           // glove
    return p;
  };
  parts.armL = arm(-1);
  parts.armR = arm(1);
  g.add(parts.armL); g.add(parts.armR);

  /* ---------------- legs (pivot at the hip) ---------------- */
  const leg = (side) => {
    const p = limb(side * .14, .88, 0);
    p.add(box(.20, .34, .21, vestMat2, 0, -.17, 0));              // thigh
    p.add(box(.18, .14, .19, bootMat, 0, -.36, 0));               // knee pad
    p.add(box(.18, .32, .19, bodyMat2, 0, -.52, 0));              // shin
    p.add(box(.20, .12, .26, bootMat, 0, -.70, -.03));            // boot
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
   weapon id. Clones share geometry and materials, so building one per player is
   cheap; they are only rebuilt when that player actually changes weapon. */
const _soldierGunCache = {};
function buildSoldierWeapon(id) {
  if (!_soldierGunCache[id]) {
    const g = buildWeaponModel(id);
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
    _soldierGunCache[id] = g;
  }
  return _soldierGunCache[id].clone(true);
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

/* ---------------- remote player (online) ---------------- */
let REMOTE_SKIN = 0;
class RemotePlayer {
  constructor(name, team, peerId) {
    this.id = peerId || ('remote' + (REMOTE_SKIN + 1));
    this.peerId = peerId || this.id;
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
  }

  /* Attach (or swap) the weapon model in the right hand for this slot.
     `id` comes from the peer's state packet; `heldGroups` lists the weapon ids
     we have actually been told about, so we never invent a weapon. */
  setWeapon(id) {
    if (id === this._weaponId && this.weaponGroup) return;
    this._weaponId = id || null;
    const armR = this.mesh.userData.parts.armR;
    if (this.weaponGroup) {
      armR.remove(this.weaponGroup);
      this.weaponGroup.traverse(o => { if (o.geometry) { /* cached geo, do not dispose */ } });
      this.weaponGroup = null;
    }
    if (!id || !WEAPONS[id] || id === 'knife') return;
    const w = buildSoldierWeapon(id);
    // The arm is raised forward with rotation.x = +1.30, which turns its local
    // -Z axis to point up. Rotating the weapon by -90° cancels that, so the
    // barrel ends up roughly horizontal and pointing ahead of the soldier
    // (measured: muzzle ~1.0 m up and 1.25 m in front, a natural rifle hold).
    w.position.set(.02, -.60, .02);
    w.rotation.set(-Math.PI / 2, 0, 0);
    w.scale.setScalar(.95);
    armR.add(w);
    this.weaponGroup = w;
  }
  /* Snapshots are stamped with the LOCAL ARRIVAL time. That is monotonic by
     construction, so the interpolation search can never be confused by a moving
     clock offset (the previous min-filter kept rewriting the mapping, so old and
     new buffer entries ended up on different timelines and the search collapsed
     onto a stale entry → the model froze).
     Jitter and packet bursts are absorbed by a separate playout clock
     (`playT`) advanced in advance(), which never runs backwards. */
  pushSnapshot(s) {
    s.lt = U.now();
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
      this.alive = a.alive;
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
    this.renderYaw = s.yw; this.pitch = s.pt || 0; this.alive = s.alive; this.crouching = !!s.cr;
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
    this.mesh.visible = this.alive;
    if (!this.alive) { this._wasFlashing = false; return; }

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

    // arms: the right hand holds the weapon, so it swings less; the left pumps.
    // A POSITIVE rotation.x raises the arm forward (toward -Z, the way the
    // soldier faces); a negative one would swing it behind the back.
    const armAmp = (running ? .55 : .35) * spd;
    p.armR.rotation.x = 1.30 - Math.sin(ph) * armAmp * .45;
    p.armL.rotation.x = 1.05 + Math.sin(ph) * armAmp;
    p.armR.rotation.z = -0.06;
    p.armL.rotation.z = 0.10;

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
  running: false, mode: CS.MODE.MENU, paused: false,
  baseFov: 80, _last: 0, _loopBound: null, _acc: 0,
  remotePlayers: [], remote: null,
  matchHP: 100,               // health chosen for this match
  offline: null,
  online: null,
  buyOpen: false,
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
  _projT: 0,
  _enemyCheck: 0, _enemyFound: false,
  _aimFireHold: 0,

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
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q === 2 ? 2 : q === 1 ? 1.4 : 1));
    const sun = MAP.group && MAP.group.userData ? MAP.group.userData.sun : null;
    if (sun) {
      const size = q === 0 ? 1024 : q === 1 ? 2048 : 4096;
      if (sun.shadow.mapSize.width !== size) {
        sun.shadow.mapSize.width = size; sun.shadow.mapSize.height = size;
        if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
      }
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
    bindClick('btnOffline', () => this.startOffline());
    bindClick('btnRange', () => this.startRange());
    bindClick('btnMatch', () => { this._prevScreen = 'menu'; UI.refreshChips(); UI.show('controls'); });
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
    bindClick('btnOnline', () => { UI.show('lobby'); this.resetLobby(); Net.warmup(); });
    bindClick('btnControls', () => { this._prevScreen = 'menu'; UI.show('controls'); });
    bindClick('btnControlsBack', () => UI.show(this._prevScreen || 'menu'));
    bindClick('btnLobbyBack', () => { Net.close(false); UI.show('menu'); });
    bindClick('btnResume', () => this.togglePause(false));
    bindClick('btnPauseControls', () => { this._prevScreen = 'pause'; UI.show('controls'); });
    bindClick('btnLeave', () => this.stopToMenu());
    bindClick('btnReset', () => {
      if (confirm('Сбросить весь прогресс и настройки?')) {
        Store.data = { sens: 2.2, fov: 80, vol: 60, quality: 1, touchSens: 1.5, name: '', best: 0, bestWave: 0, killsTotal: 0, matches: 0, wins: 0, signalSrv: 0, aimBest: 0, aimAutoFire: 1, map: 'arena', players: 2, maxHP: 100, aimAssist: 1 };
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
      } else if (wasLocked && this.mode !== CS.MODE.MENU && !this.buyOpen && !this.paused) {
        // lost the lock (Alt+Tab, Esc) → pause
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
    Bus.on('zombieAttack', (z, dmg) => this.playerHurt(dmg, z));    Bus.on('zombieDied', (z, hs) => this.onZombieDied(z, hs));
    Bus.on('zombieHit', (z, part, dmg, dir) => this.onZombieHit(z, part, dmg, dir));
    Bus.on('zombieGrowl', z => Audio3D_SFX.growl(z.pos.x, z.pos.y + 1.4, z.pos.z, z.type));

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
    if (this.mode === CS.MODE.MENU) return;
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
      case 'KeyR': if (!this.paused) this.player.reload(); break;
      // dedicated climb: E vaults onto whatever the player is facing
      case 'KeyE': if (!this.paused && this.player) this.player.climbQueued = true; break;
      case 'Digit1': if (!this.paused) this.switchSlot(1); break;
      case 'Digit2': if (!this.paused) this.switchSlot(2); break;
      case 'Digit3': if (!this.paused) this.switchSlot(3); break;
      case 'KeyQ': if (!this.paused) this.switchSlot(this.player.nextSlot()); break;
      case 'KeyG': if (!this.paused && this.player.dropWeapon()) { Audio3D_SFX.pickup(); UI.toast('Оружие сброшено'); } break;
      case 'KeyN': this.invertY(); break;
      // On PC the pointer is locked during play, so DOM buttons cannot be
      // clicked at all — the range features get keyboard shortcuts.
      // (The aim drill is PC-only; see toggleAimTrain.)
      case 'KeyT':
        if (this.mode === CS.MODE.RANGE && !IS_TOUCH) this.toggleAimTrain(!this.aim);
        break;
    }
  },

  invertY() {
    Input.invertY *= -1;
    UI.toast('Инверсия мыши: ' + (Input.invertY < 0 ? 'вкл' : 'выкл'));
  },

  onMouseDown(btn, e) {
    if (this.mode === CS.MODE.MENU) return;
    if (this.buyOpen || this.paused || UI.overlayOpen()) return;
    if (!Input.locked) { Input.requestLock(); return; }
    if (btn === 0) {
      this.player.triggerDown = true;
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
  startOffline() {
    this.stopToMenu(true);
    this.mode = CS.MODE.OFFLINE;
    this.ensureMap(Store.data.map);
    this.matchHP = Store.data.maxHP || 100;
    this.offline = {
      wave: 0, toSpawn: 0, spawnedThisWave: 0, totalThisWave: 0,
      betweenWaves: false, breakT: 0, alive: 0, kills: 0, startTime: U.now()
    };
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
    this.beginBuyPhase(30, 'ВОЛНА 1');
    this.enterGame();
    UI.toast('Карта: ' + this.mapName() + ' · магазин: B', '#ff9d21');
  },

  /* rebuild the arena when the chosen map differs from the loaded one */
  ensureMap(mapId) {
    mapId = mapById(mapId).id;
    if (!MAP.group || MAP.id !== mapId) {
      buildMap(this.scene, Store.data.quality, mapId);
      this.world = MAP.world;
      this.applyQuality();
    }
    Store.data.map = mapId;
    UI.refreshChips();
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
    UI.toast('Полигон: всё бесплатно · B — магазин', '#ff9d21');
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
  },

  clearDummies() {
    if (!this.dummies) return;
    for (const d of this.dummies) d.dispose(this.scene);
    this.dummies = [];
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
      toggle: document.getElementById('rpToggle')
    };
    if (!el.panel) return;
    // The range panel (damage / hits / accuracy) is a PC-only readout: on a
    // phone it crowded the screen, so it is not shown there at all.
    const inRange = this.mode === CS.MODE.RANGE && this.running && !IS_TOUCH;
    el.panel.classList.toggle('hidden', !inRange);
    if (!inRange) return;
    const a = this.aim;
    // the drill is PC-only, so the toggle always belongs to the keyboard path
    if (el.toggle) el.toggle.style.display = '';
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
      el.toggle.textContent = 'АИМ-ТРЕНИРОВКА (T)';
      el.toggle.classList.remove('on');
    }
  },

  startOnlineHost() { this.startOnline(CS.NETROLE.HOST); },
  startOnlineClient() { this.startOnline(CS.NETROLE.CLIENT); },

  startOnline(role, opts) {
    opts = opts || {};
    this.stopToMenu(true);
    this.mode = CS.MODE.ONLINE;
    this.online = {
      role, roundWins: { me: 0, them: 0 }, opponentLeft: false,
      scoreMe: 0, scoreThem: 0, skipVoteMe: 0, votes: {},
      voteNeeded: 2, roster: Net.peers.slice(),
      players: Math.max(2, Net.peerCount ? Net.peerCount() : 2), alive: 1
    };
    // settings come from the host (or from the local choice when not networked)
    const mapId = opts.map || Store.data.map;
    this.ensureMap(mapId);
    this.matchHP = opts.hp || (Store.data.maxHP || 100);
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
  },

  stopToMenu(keepRunning) {
    const clearWorld = () => {
      this.clearProjectiles();
      this.clearDummies();
      this.clearTargets();
      if (this.horde) { this.horde.clear(); this.horde = null; }
      for (const rp of this.remotePlayers || []) {
        this.scene.remove(rp.mesh);
        rp.mesh.traverse(o => { if (o.geometry) o.geometry.dispose(); });
      }
      this.remotePlayers = []; this.remote = null;
      if (this.player && this.player.vmGroup && this.player.vmGroup.parent) this.player.vmGroup.parent.remove(this.player.vmGroup);
      if (this.effects) { this.effects.clear(); }
    };
    if (!keepRunning) {
      this.running = false;
      Input.enabled = false;
      Input.releaseLock();
      Audio3D_SFX.ambientStop();
      this.mode = CS.MODE.MENU;
      clearWorld();
      this.offline = null; this.online = null;
      UI.hideOverlays();
      UI.lowHP(false);
      UI.renderMenuStats();
      UI.show('menu');
      Net.close(true);
    } else {
      clearWorld();
    }
    this.buyOpen = false;
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
    const idx = (typeof spawnIdx === 'number' && isFinite(spawnIdx))
      ? Math.abs(Math.floor(spawnIdx)) % n
      : 0;
    const s = spawns[idx] || { x: 0, z: 42 };
    const y = this.world.groundAt(s.x, s.z, 3);
    const yaw = Math.atan2(-(0 - s.x), -(0 - s.z)); // face the arena centre
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
      UI.center('ПОЛИГОН', 'B — магазин · всё бесплатно', 2.4);
      this.roundNo++;
      return;
    }
    this.roundState = 'buy';
    this.buyTimer = seconds;
    this.roundT = seconds;
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

  tryBuy(id) {
    const w = WEAPONS[id];
    if (!w) return;
    if (this.roundState !== 'buy' && this.mode !== CS.MODE.RANGE) { Audio3D_SFX.deny(); UI.toast('Магазин закрыт'); return; }
    if (this.player.has(id)) { Audio3D_SFX.deny(); UI.toast('Уже куплено'); return; }
    const free = this.mode === CS.MODE.RANGE;
    if (!free && this.player.money < w.price) { Audio3D_SFX.deny(); UI.toast('Не хватает денег'); return; }
    if (!free) this.player.money -= w.price;
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
    if (this.player.armor >= 100 && (!g.helmet || this.player.helmet)) { Audio3D_SFX.deny(); UI.toast('Уже куплено'); return; }
    const free = this.mode === CS.MODE.RANGE;
    if (!free && this.player.money < g.price) { Audio3D_SFX.deny(); UI.toast('Не хватает денег'); return; }
    if (!free) this.player.money -= g.price;
    this.player.armor = g.ap;
    if (g.helmet) this.player.helmet = true;
    Audio3D_SFX.buy();
    UI.toast('Куплено: ' + g.name, '#57d16a');
    UI.renderBuy(this.player, this.buyTimer);
    if (this.mode === CS.MODE.ONLINE) this.broadcastScore();
  },

  updateBuyPhase(dt) {
    if (this.roundState === 'buy') {
      // the range has no clock: the buy phase lasts until the player leaves
      if (this.mode === CS.MODE.RANGE) { this.roundT = 0; return; }
      this.buyTimer -= dt;
      this.roundT = this.buyTimer;
      if (this.buyOpen) UI.renderBuy(this.player, this.buyTimer);
      if (this.buyTimer <= 0) {
        if (this.buyOpen) this.toggleBuy(false);
        this.startLive();
      }
    } else if (this.roundState === 'live') {
      // Offline survival has no round clock — the wave ends when the horde is dead.
      // Online duels are timed, exactly like a real CS round.
      if (this.mode === CS.MODE.ONLINE) {
        this.roundT -= dt;
        if (this.roundT <= 0) this.endRound(null, 'ВРЕМЯ');
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
        const won = winnerIsMe === true;
        const txt = won ? 'РАУНД ВЫИГРАН' : winnerIsMe === false ? 'РАУНД ПРОИГРАН' : 'НИЧЬЯ';
        UI.center(txt, this.online.scoreMe + ' : ' + this.online.scoreThem + (reason ? ' · ' + reason : ''), 2.6);
        Audio3D_SFX.roundEnd(won);
        Net.send({ t: 'round', st: 'end', win: won ? 'host' : winnerIsMe === false ? 'client' : 'draw', no: this.roundNo });
        setTimeout(() => { if (this.roundState === 'end' && this.mode === CS.MODE.ONLINE) this.nextRound(); }, 4200);
      }
      // clients react to the host's 'round:end' message instead
    }
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
    this.player.alive = true;
    this.player.money = Math.min(16000, this.player.money + 1400);
    this.spawnPlayerLocal(this.rosterSpawnIndex());
    for (const rp of this.remotePlayers) { rp.alive = true; rp.health = this.matchHP; rp.maxHealth = this.matchHP; }
    this.broadcastRespawn();
    this.beginBuyPhase(25, 'РАУНД ' + (this.roundNo + 1));
  },

  /* ============================================================
     OFFLINE WAVES
     ============================================================ */
  startWave() {
    const o = this.offline;
    o.wave++;
    const count = Math.round(CFG.zombieStartCount + (o.wave - 1) * 2.4);
    o.totalThisWave = count;
    o.spawnedThisWave = 0;
    o.toSpawn = count;
    o.betweenWaves = false;
    o.waveStart = U.now();
    UI.center('ВОЛНА ' + o.wave, count + ' противников', 2.0);
    UI.toast('Волна ' + o.wave + ' — ' + count + ' зомби', '#e33a2e');
    Audio3D_SFX.waveStart();
    Bus.emit('waveStart', o.wave);
  },

  waveTypesFor(wave) {
    const pool = [{ t: 'walker', w: 10 }];
    if (wave >= 2) pool.push({ t: 'runner', w: Math.min(7, wave * .9) });
    if (wave >= 3) pool.push({ t: 'crawler', w: Math.min(5, wave * .6) });
    if (wave >= 4) pool.push({ t: 'tank', w: Math.min(4, wave * .45) });
    if (wave >= 5) pool.push({ t: 'spitter', w: Math.min(4, wave * .4) });
    if (wave >= 7) pool.push({ t: 'brute', w: Math.min(3, (wave - 5) * .4) });
    return pool;
  },
  pickZombieType(wave) {
    const pool = this.waveTypesFor(wave);
    let total = 0; pool.forEach(p => total += p.w);
    let r = Math.random() * total;
    for (const p of pool) { r -= p.w; if (r <= 0) return p.t; }
    return 'walker';
  },

  updateOffline(dt) {
    const o = this.offline;
    if (!o) return;
    if (o.betweenWaves) {
      o.breakT -= dt;
      if (o.breakT <= 0) {
        this.beginBuyPhase(22, 'ВОЛНА ' + (o.wave + 1));
        o.betweenWaves = false;
      }
      return;
    }
    if (this.roundState !== 'live') return;

    // spawn queue
    if (o.toSpawn > 0) {
      o.spawnAcc = (o.spawnAcc || 0) + dt;
      const interval = Math.max(.34, CFG.zombieSpawnInterval - o.wave * .045);
      let guard = 0;
      while (o.spawnAcc >= interval && o.toSpawn > 0 && guard++ < 6) {
        o.spawnAcc -= interval;
        // count dying bodies too: they still cost CPU and occupy space
        if (this.horde.activeCount >= CFG.zombieMaxAlive) break;
        const t = this.pickZombieType(o.wave);
        const scale = 1 + (o.wave - 1) * .085;
        const z = this.horde.spawnRandom(t, this.player.pos.x, this.player.pos.z, 26);
        z.maxHealth *= scale; z.health = z.maxHealth; z.dmg *= (1 + (o.wave - 1) * .05);
        o.toSpawn--; o.spawnedThisWave++;
      }
    } else if (this.horde.aliveCount === 0) {
      // wave cleared — the spawn queue is empty and nothing is left alive
      // (dying corpses are not re-captured here; they simply fade out)
      const bonus = 400 + o.wave * 120;
      this.player.money += bonus;
      this.player.score += 250 + o.wave * 40;
      o.betweenWaves = true;
      o.breakT = 7;
      Audio3D_SFX.roundEnd(true);
      UI.center('ВОЛНА ' + o.wave + ' ЗАЧИЩЕНА', 'Бонус $' + bonus + ' · Передышка 7с', 3.0);
      Bus.emit('waveCleared', o.wave);
      const recScore = Math.max(Store.data.best, this.player.score);
      const recWave = Math.max(Store.data.bestWave, o.wave);
      Store.data.best = recScore;
      Store.data.bestWave = recWave;
      Store.data.killsTotal += 0;
      Store.save();
      // partial heal
      this.player.health = Math.min(CFG.maxHP, this.player.health + 22);
    }
  },

  /* ============================================================
     COMBAT
     ============================================================ */
  /* Player eye position in world space (the camera's actual origin). */
  eyePos() {
    const p = this.player;
    return {
      x: p.pos.x,
      y: p.pos.y + (p.crouching ? CFG.eyeHeightCrouch : CFG.eyeHeight),
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
    if (this.mode === CS.MODE.OFFLINE && this.horde) hit = this.horde.raycast(o, dir, T);
    else if (this.mode === CS.MODE.ONLINE) hit = this.rayRemoteAny(o, dir, T);
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

  fire() {
    const p = this.player, w = p.weapon;
    if (!w || !p.canFire()) {
      if (w && w.mag <= 0 && p.reloadT <= 0 && p.deployT <= 0) { Audio3D_SFX.empty(); p.fireCd = .22; if (p.def !== WEAPONS.knife && p.def.mag !== Infinity) p.reload(); }
      return false;                 // no shot fired
    }
    const def = p.def;
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
        Net.send({ t: 'shot', wid: w.id, ox: origin.x, oy: origin.y, oz: origin.z, dx: baseDir.x, dy: baseDir.y, dz: baseDir.z, sp: spread });
      }
      return true;
    }

    for (let i = 0; i < pellets; i++) {
      const dir = this.spreadDirection(baseDir, spread, pellets > 1);
      this.traceShot(origin, dir, def, isMelee, muzzleWorld);
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
      // third-person shot broadcast
      if (this.mode === CS.MODE.ONLINE) {
        Net.send({ t: 'shot', wid: w.id, ox: origin.x, oy: origin.y, oz: origin.z, dx: baseDir.x, dy: baseDir.y, dz: baseDir.z, sp: spread });
      }
    } else {
      Audio3D_SFX.shot('knife');
    }
    return true;                     // a shot was actually fired
  },

  /* ============================================================
     PROJECTILES (bananas)
     ============================================================ */
  spawnProjectile(def, origin, dir, owner) {
    const p = this.player;
    const spread = p.aimSpread();
    const d = this.spreadDirection(dir, spread, false);
    const isRocket = def.projectile === 'rocket';
    const mesh = isRocket ? buildRocketProjectile() : buildBananaProjectile();
    mesh.position.set(origin.x, origin.y, origin.z);
    if (!isRocket) mesh.rotation.x = Math.PI / 2;   // bananas lie along the flight path
    this.scene.add(mesh);
    const speed = def.projSpeed || 30;
    this.projectiles.push({
      mesh: mesh,
      kind: def.projectile,
      alive: true,
      life: isRocket ? 8 : 6,
      prev: { x: origin.x, y: origin.y, z: origin.z },
      pos: { x: origin.x, y: origin.y, z: origin.z },
      vel: { x: d.x * speed, y: d.y * speed, z: d.z * speed },
      grav: def.projGravity || 12,
      dmg: def.dmg,
      headMul: def.headMul || 1.6,
      splash: def.splash || 0,          // blast radius (m); 0 = no splash
      splashDmg: def.splashDmg || 0,
      ownerIsLocal: true
    });
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
      pr.vel.y -= pr.grav * dt;
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
          this.sendPvpHit(pr.dmg * mul, hitP.part, hs, hitP.rp);
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
        if (pr.splash > 0) {
          // rockets detonate: blast damage to everything nearby
          this.explode(impactPoint, pr);
        } else {
          this.effects.bananaSplat(impactPoint.x, impactPoint.y, impactPoint.z);
          Audio3D_SFX.bananaSplat(impactPoint.x, impactPoint.y, impactPoint.z);
          UI.hitmark(false);
        }
        this.removeProjectile(i);
        continue;
      }

      pr.pos.x = nx; pr.pos.y = ny; pr.pos.z = nz;
      pr.mesh.position.set(pr.pos.x, pr.pos.y, pr.pos.z);
      if (pr.kind === 'rocket') {
        // rockets point straight along their flight path
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
        // a rocket that runs out of life or hits the void still detonates
        if (pr.splash > 0) this.explode({ x: pr.pos.x, y: pr.pos.y, z: pr.pos.z }, pr);
        this.removeProjectile(i);
      }
    }
  },

  /* radial blast damage for rockets: falls off linearly to the edge */
  explode(center, pr) {
    const R = pr.splash, dmg = pr.splashDmg || pr.dmg;
    this.effects.explosion(center.x, center.y, center.z, R);
    Audio3D_SFX.explosionAt(center.x, center.y, center.z);
    UI.hitmark(false);
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
          this.sendPvpHit(dmg * k, 'body', false, rp);
        }
      }
    }
    // splash back on the shooter, so point-blank rockets hurt
    const p = this.player;
    const ds = Math.hypot(p.pos.x - center.x, (p.pos.y + 1) - center.y, p.pos.z - center.z);
    if (ds <= R * .8) {
      const k = 1 - ds / (R * .8);
      this.applyDamageToSelf(dmg * k * .45, center);
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

  traceShot(origin, dir, def, isMelee, muzzleWorld) {
    const p = this.player;
    const maxDist = def.range || 100;
    const end = { x: origin.x + dir.x * maxDist, y: origin.y + dir.y * maxDist, z: origin.z + dir.z * maxDist };

    // ---- melee ----
    if (isMelee) {
      const hit = this.horde ? this.horde.raycast(origin, dir, def.range) : null;
      const wallHit = this.world.raycast(origin, dir, def.range, ['ground']);
      if (hit && (!wallHit || hit.t < wallHit.t)) {
        p.bulletsHit++;
        hit.zombie.takeDamage(def.dmg * (def.headMul || 1) / (def.headMul || 1), hit.part, dir);
        this.hitEffect(hit.point, dir, hit.part, true);
        Audio3D_SFX.hit(hit.point.x, hit.point.y, hit.point.z, hit.part === 'head');
      } else if (wallHit && this.effects) {
        this.effects.impact(wallHit.point, wallHit.normal, 'concrete');
      }
      if (this.mode === CS.MODE.ONLINE) this.traceRemotePlayer(origin, dir, Math.min(def.range, maxDist), def, dir);
      return;
    }

    // ---- bullets: walk through penetrable cover, stop at walls ----
    const wallHits = this.world.raycastAll(origin, dir, maxDist, ['ground']);
    const zHit = this.horde ? this.horde.raycast(origin, dir, maxDist) : null;
    let dmgMul = 1;
    let stopT = maxDist;
    let stopNormal = null;
    let stopPoint = null;

    for (let i = 0; i < wallHits.length; i++) {
      const h = wallHits[i];
      if (zHit && zHit.t < h.t) break;             // zombie is in front of this wall
      const thick = (h.t2 !== undefined ? (h.t2 - h.t) : 1.0);
      const penetrable = (h.box.tag === 'cover' || h.box.tag === 'wood') && thick < 0.75 && dmgMul > .35;
      if (penetrable) { dmgMul *= CFG.wallbangLoss; continue; }
      stopT = h.t; stopNormal = h.normal; stopPoint = h.point;
      break;
    }

    // the opponents (everyone else in the room)
    let pvpHit = null;
    if (this.mode === CS.MODE.ONLINE) {
      pvpHit = this.rayRemoteAny(origin, dir, maxDist);
      // resolve below if it is closer than the wall and any zombie
      if (pvpHit && (zHit ? pvpHit.t < zHit.t || !zHit : true) && pvpHit.t <= stopT) {
        // ok
      } else pvpHit = null;
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
      this.effects.tracer(muzzleWorld, pvpHit.point, 1, true);
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
        this.effects.tracer(muzzleWorld, zHit.point, 1, true);
        Audio3D_SFX.hit(zHit.point.x, zHit.point.y, zHit.point.z, false);
        this.onTargetHit(zHit.zombie, zHit.part);
        return;
      }
      p.bulletsHit++;
      const dmg = def.dmg * dmgMul;
      const killed = zHit.zombie.takeDamage(dmg, zHit.part, dir);
      p.damageDealt += dmg * (zHit.part === 'head' ? CFG.headshotMultiplier : zHit.part === 'legs' ? CFG.limbMultiplier : 1);
      this.hitEffect(zHit.point, dir, zHit.part, zHit.part === 'head');
      Audio3D_SFX.hit(zHit.point.x, zHit.point.y, zHit.point.z, zHit.part === 'head');
      this.effects.tracer(muzzleWorld, zHit.point, 1, true);
      return;
    }

    // a shot that hits nothing breaks the streak
    if (this.aim) this.onTargetMiss();

    // hit geometry
    if (stopPoint) {
      this.effects.tracer(muzzleWorld, stopPoint, 1, true);
      const surf = (stopNormal && Math.abs(stopNormal.y) > .7) ? 'concrete' : 'concrete';
      this.effects.impact(stopPoint, stopNormal, surf);
      Audio3D_SFX.tone(140, .06, 'triangle', .05, stopPoint.x, stopPoint.y, stopPoint.z, 90);
    } else {
      this.effects.tracer(muzzleWorld, end, 1, false);
    }
  },

  hitEffect(point, dir, part, headshot) {
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

  /* kept for compatibility: raycast against the first remote */
  rayRemotePlayer(origin, dir, maxDist) {
    return this.remote ? this.rayRemotePlayerFor(this.remote, origin, dir, maxDist) : null;
  },

  rayRemotePlayerFor(rp, origin, dir, maxDist) {
    if (!rp || !rp.alive) return null;
    const base = { x: rp.pos.x, y: rp.pos.y, z: rp.pos.z };
    const parts = [
      { part: 'head', y0: rp.height * .78, y1: rp.height * 1.02, r: .19 },
      { part: 'body', y0: rp.height * .42, y1: rp.height * .80, r: .30 },
      { part: 'legs', y0: 0, y1: rp.height * .44, r: .24 }
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

  /* Report a hit to the shooter's victim. In the star network only the victim
     may apply it, so every hit carries the target's peer id. */
  sendPvpHit(dmg, part, headshot, rp) {
    UI.hitmark(false);
    this._hitmarkT = U.now();
    const target = rp || this.remote;
    Net.send({
      t: 'hit', dmg: Math.round(dmg), part, hs: headshot ? 1 : 0, at: U.now(),
      to: target ? target.peerId : undefined,
      from: Net.selfId()
    });
  },

  playerHurt(dmg, source) {
    const p = this.player;
    if (!p.alive || this.mode !== CS.MODE.OFFLINE) return;
    this.applyDamageToSelf(dmg, source ? { x: source.pos.x, y: source.pos.y, z: source.pos.z } : null);
  },

  applyDamageToSelf(dmg, fromPos) {
    const p = this.player;
    if (!p.alive) return;
    let actual = dmg;
    if (p.armor > 0) {
      const absorbed = Math.min(p.armor, actual * .5);
      p.armor -= absorbed;
      actual -= absorbed;
      if (p.armor < 0) p.armor = 0;
    }
    p.health -= actual;
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
    Audio3D_SFX.roundEnd(false);
    if (this.mode === CS.MODE.OFFLINE) {
      const o = this.offline;
      if (p.score > Store.data.best) { Store.data.best = p.score; Store.save(); }
      if (o.wave > Store.data.bestWave) { Store.data.bestWave = o.wave; Store.save(); }
      Store.data.killsTotal += p.zombieKills; Store.save();
      UI.center('ВЫ ПОГИБЛИ', 'Счёт: ' + p.score + ' · Волна ' + o.wave, 4.0);
      UI.toast('Волна ' + o.wave + ' · Счёт ' + p.score + ' · Нажмите Tab для статистики', '#e33a2e');
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
    const def = z.def;
    p.money = Math.min(16000, p.money + def.money);
    p.score += def.score * (headshot ? 1.5 : 1) | 0;
    if (headshot) p.headshots++;
    Audio3D_SFX.kill();
    UI.hitmark(true);
    this._hitmarkT = U.now();
    UI.feed('<b>' + U.esc(p.name) + '</b> <span class="z">✖ ' + def.name + (headshot ? ' (в голову)' : '') + '</span> +$' + def.money);
    if (headshot) UI.toast('В ГОЛОВУ! +$' + def.money + ' +' + Math.round(def.score * 1.5) + ' очков', '#ff9d21');
    Bus.emit('kill', z, headshot);
  },

  onZombieHit(z, part, dmg, dir) {
    if (part === 'head') { /* handled in onZombieDied for kills */ }
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
    if (Net.role === CS.NETROLE.HOST) Net.send({ t: 'roster', roster: Net.peers });
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
      mg: wpn && wpn.mag !== Infinity ? wpn.mag : null,
      sp: +(p.spinT || 0).toFixed(2),           // minigun spin-up, for the barrels
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
    rp.setWeapon(s.wi);
    rp.spinT = (s.sp !== undefined) ? s.sp : 0;
  },

  onRemoteShot(s) {
    const rp = this.remoteById(s.from);
    if (!rp) return;
    const def = WEAPONS[s.wid] || WEAPONS.ak47;
    const from = { x: s.ox, y: s.oy, z: s.oz };
    const dir = { x: s.dx, y: s.dy, z: s.dz };
    const maxDist = def.range || 100;
    const wallHits = this.world.raycastAll(from, dir, maxDist, ['ground']);
    let endT = maxDist, p = null, n = null;
    for (const h of wallHits) { endT = h.t; p = h.point; n = h.normal; break; }
    const end = p || { x: from.x + dir.x * endT, y: from.y + dir.y * endT, z: from.z + dir.z * endT };
    this.effects.tracer({ x: rp.pos.x, y: rp.pos.y + 1.35, z: rp.pos.z }, end, 1.4, true);
    if (p) this.effects.impact(p, n, 'concrete');
    Audio3D_SFX.shot(def.sound || 'rifle', rp.pos.x, rp.pos.y + 1.4, rp.pos.z);
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
    this.applyDamageToSelf(h.dmg, src ? { x: src.pos.x, y: src.pos.y + 1.2, z: src.pos.z } : null);
  },

  onRemoteDied(d) {
    const rp = this.remoteById(d.from);
    if (!rp) return;
    rp.alive = false;
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

  onRemoteRespawn(r) {
    // a respawn applies to the player named in `from`; when untagged (older
    // peer) fall back to moving everyone so the round still restarts
    const rp = this.remoteById(r.from);
    const list = (r.from && rp) ? [rp] : this.remotePlayers.slice();
    for (const x of list) {
      x.alive = true;
      x.health = r.hp || this.matchHP;
      x.maxHealth = r.hp || this.matchHP;
      x.applySnap({ x: r.x, y: r.y, z: r.z, yw: r.yaw, pt: 0, alive: 1, cr: 0 });
      x.buf.length = 0;
      x.mesh.visible = true;
      x.mesh.scale.y = 1;
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
      if (r.map && r.map !== MAP.id && (this.roundState === 'buy' || this.roundState === 'idle')) this.ensureMap(r.map);
      if (r.players) { this.online.players = r.players; this.refreshSkipUI(); }
      UI.renderPeerList();
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
        this.endRoundClient(r.win, r.no);
        break;
      case 'newround':
        this.doNewRoundClient(r.hp);
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

  endRoundClient(win, roundNo) {
    if (this.roundState === 'end') return;
    this.roundState = 'end'; this.roundT = 4.2;
    // 'host' wins the last-man-standing duel; anything else is our side
    if (win === 'host') this.online.roundWins.them++;
    else if (win === 'client') this.online.roundWins.me++;
    this.online.scoreMe = this.online.roundWins.me;
    this.online.scoreThem = this.online.roundWins.them;
    const txt = win === 'host' ? 'РАУНД ПРОИГРАН' : win === 'client' ? 'РАУНД ВЫИГРАН' : 'НИЧЬЯ';
    UI.center(txt, this.online.scoreMe + ' : ' + this.online.scoreThem, 2.6);
    Audio3D_SFX.roundEnd(win !== 'host');
  },

  doNewRoundClient(hp) {
    this.matchHP = hp || this.matchHP;
    this.player.maxHealth = this.matchHP;
    this.player.health = this.matchHP;
    this.player.armor = 0; this.player.helmet = false;
    this.player.alive = true;
    this.player.money = Math.min(16000, this.player.money + 1400);
    for (const rp of this.remotePlayers) { rp.alive = true; rp.health = this.matchHP; rp.maxHealth = this.matchHP; }
    this.spawnPlayerLocal(Math.floor(Math.random() * Math.max(1, MAP.playerSpawns.length)));
    this.beginBuyPhaseClient(25, undefined, this.matchHP);
  },

  /* host: a round ends when only one fighter is left standing */
  checkRoundEnd() {
    if (this.mode !== CS.MODE.ONLINE || Net.role !== CS.NETROLE.HOST) return;
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

    // ---- input → player ----
    const mv = Input.moveVector();
    const m = Input.lookDelta();
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
    // cleared again or the player would re-jump every time they touch the ground
    if (IS_TOUCH) {
      p.in.wantJump = Input.consumeJump() && p.onGround;
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
    // dedicated climb action: a touch button or the PC key, edge-triggered
    if (Input.consumeClimb()) p.climbQueued = true;

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
    if (p.alive && !this.buyOpen && this.roundState === 'live') {
      const def = p.def;
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
      if (!p.triggerDown) p._semiLatch = false;
    } else if (!p.triggerDown) {
      p._semiLatch = false;
    }

    // ---- movement is frozen during the buy phase (CS-style freeze time) ----
    const frozen = this.roundState === 'buy';
    const pin = frozen ? { f: 0, r: 0, run: false, crouch: p.in.crouch, wantJump: false } : p.in;

    // ---- physics ----
    p.update(dt, this.world, pin);
    p.tickWeapon(dt, this);

    // ---- round flow ----
    this.updateBuyPhase(dt);
    if (this.mode === CS.MODE.OFFLINE) this.updateOffline(dt);

    // ---- AI ----
    if (this.horde) this.horde.update(dt, p);

    // ---- effects ----
    if (this.effects) this.effects.update(dt);

    // ---- flying bananas ----
    this.updateProjectiles(dt);

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

  restartOfflineOffer() {
    if (this._offeredRestart) return;
    this._offeredRestart = true;
    UI.center('ВЫ ПОГИБЛИ', 'Enter — начать заново · Tab — статистика', 600);
    this._restartPending = true;
  },

  cameraUpdate(dt) {
    const p = this.player;
    const eyeH = p.crouching ? CFG.eyeHeightCrouch : CFG.eyeHeight;
    const dead = !p.alive;
    const curEye = dead ? .42 : eyeH;
    // bob & sway
    const hspeed = Math.hypot(p.vel.x, p.vel.z);
    const spd = U.clamp(hspeed / CFG.runSpeed, 0, 1);
    const bobX = Math.sin(p.bobPhase * Math.PI * 2) * 0.022 * spd;
    const bobY = Math.abs(Math.sin(p.bobPhase * Math.PI * 2)) * -.030 * spd;
    const land = p.landImpact;
    p.landImpact = U.lerp(p.landImpact, 0, 1 - Math.pow(0.00001, dt));

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
      vm.visible = !zoomHide;
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
      if (this.mode === CS.MODE.OFFLINE && this.horde) {
        const h = this.horde.raycast(o, d, 90);
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
    // idle menu backdrop: slow orbit around the arena
    const t = U.now() * .00006;
    this.camera.position.set(Math.cos(t) * 62, 26, Math.sin(t) * 62);
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
    if (this.running && this.mode !== CS.MODE.MENU && this.player && this.player.alive && this.vmScene.children.length) {
      this.renderer.clearDepth();
      this.renderer.render(this.vmScene, this.vmCamera);
    }
  },

  updateHUD(dt) {
    const p = this.player;
    if (!p) return;
    this._uiT -= dt;
    let timer = this.roundT, objective = '';
    if (this.mode === CS.MODE.OFFLINE && this.offline) {
      const o = this.offline;
      if (this.roundState === 'live' && !o.betweenWaves) objective = 'ВОЛНА ' + o.wave + ' · осталось ' + (o.toSpawn + this.horde.aliveCount);
      else if (o.betweenWaves) { objective = 'ПЕРЕДЫШКА · волна ' + (o.wave + 1); timer = o.breakT; }
      else objective = 'ЗАКУПКА · волна ' + (o.wave + 1);
    } else if (this.mode === CS.MODE.ONLINE) {
      const alive = (p.alive ? 1 : 0) + this.remotePlayers.filter(r => r.alive).length;
      objective = this.roundState === 'buy' ? 'ЗАКУПКА' :
        this.roundState === 'live' ? 'РАУНД ' + this.roundNo + ' · ' + alive + '/' + this.onlinePlayerCount() + ' живых' :
        'КОНЕЦ РАУНДА';
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
    if (this._restartPending && (Input.keys['Enter'] || Input.keys['NumpadEnter'])) {
      this._restartPending = false; this._offeredRestart = false; this.offlineDead = false; this.offlineDeadT = 0;
      this.startOffline();
    }
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
