/* ============================================================
   04c — ИГРОВЫЕ ЭЛЕМЕНТЫ КАРТ (в духе Stage Builder из Smash)
   Движущиеся / падающие / исчезающие платформы, шипы и телепорты.
   Строятся из определения карты и тикаются в игровом цикле.

   Формат элемента в данных карты:
     { k:'mover'|'faller'|'vanish'|'spikes'|'teleport',
       x,y,z, w,h,d,          // размеры платформы (кроме spikes/телепорта)
       ax,ay,az, amp, speed,  // mover: ось движения, амплитуда, скорость
       phase, link }          // телепорты связываются по link (пара)
   ============================================================ */
const MapElements = {
  list: [],          // активные элементы (mesh + aabb + параметры)

  clear() {
    for (const e of this.list) {
      if (e.mesh && e.mesh.parent) e.mesh.parent.remove(e.mesh);
      if (e.aabb) e.aabb.removed = true;
    }
    this.list.length = 0;
  },

  /* собрать все элементы карты. Вызывается из MapEditor.buildFromDef и при
     старте игры с кастомной картой. */
  build(elements, parent, world) {
    this.clear();
    if (!elements || !elements.length) return;
    const mkPlat = (e, color) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(e.w || 3, e.h || .6, e.d || 3),
        new THREE.MeshLambertMaterial({ color: color, emissive: 0x101010 }));
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.position.set(e.x, (e.y || 0) + (e.h || .6) / 2, e.z);
      parent.add(mesh);
      const aabb = aabbFromBase(e.x, e.y || 0, e.z, e.w || 3, e.h || .6, e.d || 3, 'platform');
      world.addDynamicBox(aabb);
      aabb._mat = MAT.metal;
      return { mesh, aabb };
    };

    for (const e of elements) {
      if (e.k === 'spikes') {
        /* шипы: статичная зона урона */
        const g = new THREE.Group();
        const base = new THREE.Mesh(new THREE.BoxGeometry(e.w || 3, .15, e.d || 3),
          new THREE.MeshLambertMaterial({ color: 0x2a2e33 }));
        base.position.y = .07; g.add(base);
        const n = Math.max(3, Math.round((e.w || 3) / .5));
        for (let i = 0; i < n; i++) {
          const sp = new THREE.Mesh(new THREE.ConeGeometry(.11, .5, 6),
            new THREE.MeshLambertMaterial({ color: 0xb9c2cc }));
          sp.position.set((i - (n - 1) / 2) * .5, .32, 0); g.add(sp);
        }
        g.position.set(e.x, e.y || 0, e.z);
        parent.add(g);
        this.list.push({ kind: 'spikes', def: e, mesh: g, x: e.x, z: e.z, r: Math.max(e.w || 3, e.d || 3) * .5, dps: 32, phase: 0 });
      } else if (e.k === 'teleport') {
        const g = new THREE.Group();
        const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, .14, 10, 24),
          new THREE.MeshBasicMaterial({ color: 0x7d3fff }));
        ring.rotation.x = -Math.PI / 2; ring.position.y = .05; g.add(ring);
        const core = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, .06, 20),
          new THREE.MeshBasicMaterial({ color: 0xb98cff, transparent: true, opacity: .55 }));
        core.position.y = .03; g.add(core);
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(.35, .35, 3, 12, 1, true),
          new THREE.MeshBasicMaterial({ color: 0x7d3fff, transparent: true, opacity: .3, side: THREE.DoubleSide, depthWrite: false }));
        beam.position.y = 1.5; g.add(beam);
        const light = new THREE.PointLight(0x9a5bff, 8, 8, 2); light.position.y = 1; g.add(light);
        g.position.set(e.x, e.y || 0, e.z);
        parent.add(g);
        this.list.push({ kind: 'teleport', def: e, mesh: g, x: e.x, y: e.y || 0, z: e.z, link: e.link || 0, cd: 0 });
      } else {
        /* платформы: mover / faller / vanish */
        const color = e.k === 'mover' ? 0x8a5cff : e.k === 'faller' ? 0xd07a2a : 0x2fa0c0;
        const { mesh, aabb } = mkPlat(e, color);
        const el = {
          kind: e.k, def: e, mesh: mesh, aabb: aabb,
          base: { x: e.x, y: e.y || 0, z: e.z },
          ax: e.ax || 0, ay: e.ay || 0, az: e.az || 0,
          amp: e.amp === undefined ? 6 : e.amp,
          speed: e.speed || 1, phase: e.phase || 0
        };
        if (e.k === 'faller') { el.armed = false; el.fallT = 0; el.dropY = 0; el.cd = 0; }
        if (e.k === 'vanish') { el.cycle = e.cycle || 3; el.onT = Math.max(1, e.onT || 2); }
        this.list.push(el);
      }
    }
  },

  /* сдвинуть AABB платформы в новое положение и переиндексировать сетку */
  _moveAabb(aabb, x, y, z, w, h, d) {
    aabb.minX = x - w / 2; aabb.maxX = x + w / 2;
    aabb.minY = y; aabb.maxY = y + h;
    aabb.minZ = z - d / 2; aabb.maxZ = z + d / 2;
    if (Game.world && Game.world.reindexBox) Game.world.reindexBox(aabb);
  },

  update(dt, game) {
    if (!this.list.length) return;
    const p = game.player;
    for (const e of this.list) {
      if (e.kind === 'spikes') {
        e.phase += dt;
        if (p && p.alive) {
          const d = Math.hypot(p.pos.x - e.x, p.pos.z - e.z);
          if (d < e.r && Math.abs(p.pos.y - (e.def.y || 0)) < 2.2) game.applyDamageToSelf(e.dps * dt, { x: e.x, y: 0, z: e.z });
        }
        if (game.horde) for (const z of game.horde.list) {
          if (!z.alive || z.dying || z.isBoss) continue;
          if (Math.hypot(z.pos.x - e.x, z.pos.z - e.z) < e.r) z.takeDamage(e.dps * dt * 2, 'body', { x: 0, y: 0, z: 0 });
        }
        continue;
      }
      if (e.kind === 'teleport') {
        e.cd = Math.max(0, (e.cd || 0) - dt);
        if (p && p.alive && e.cd <= 0) {
          const d = Math.hypot(p.pos.x - e.x, p.pos.z - e.z);
          if (d < 1.2 && Math.abs(p.pos.y - e.y) < 2.4) {
            /* найти парный телепорт (тот же link) */
            const dest = this.list.find(o => o.kind === 'teleport' && o !== e && o.link === e.link) || null;
            if (dest) {
              p.pos.x = dest.x; p.pos.z = dest.z;
              p.pos.y = (game.world.groundAt(dest.x, dest.z, dest.y + 4) || dest.y) + .05;
              e.cd = 1.2; dest.cd = 1.2;
              if (game.effects) game.effects.particle(dest.x, dest.y + 1, dest.z, 0, 3, 0, .5, 'vspark', .5);
              Audio3D_SFX.pickup && Audio3D_SFX.pickup();
            }
          }
        }
        continue;
      }

      /* платформы */
      const w = e.def.w || 3, h = e.def.h || .6, d = e.def.d || 3;
      let nx = e.base.x, ny = e.base.y, nz = e.base.z;
      let active = true;
      if (e.kind === 'mover') {
        e.phase += dt * e.speed;
        const off = Math.sin(e.phase) * e.amp;
        nx += e.ax * off; ny += e.ay * off; nz += e.az * off;
      } else if (e.kind === 'vanish') {
        e.phase += dt;
        const cyc = e.phase % e.cycle;
        active = cyc < e.onT;
        e.aabb.removed = !active;
        e.mesh.visible = true;
        e.mesh.material.opacity = active ? 1 : .18;
        e.mesh.material.transparent = !active;
      } else if (e.kind === 'faller') {
        e.cd = Math.max(0, (e.cd || 0) - dt);
        if (!e.armed && e.cd <= 0) {
          /* срабатывает, когда игрок стоит на платформе */
          if (p && p.alive && p.onGround &&
              Math.abs(p.pos.x - e.base.x) < w / 2 + .4 && Math.abs(p.pos.z - e.base.z) < d / 2 + .4 &&
              Math.abs(p.pos.y - (e.base.y + h)) < .35) {
            e.armed = true; e.fallT = 0;
          }
        }
        if (e.armed) {
          e.fallT += dt;
          e.dropY -= 18 * dt;                       // падает вниз
          ny += e.dropY;
          if (p && p.alive && p.onGround &&
              Math.abs(p.pos.x - e.base.x) < w / 2 + .4 && Math.abs(p.pos.z - e.base.z) < d / 2 + .4 &&
              Math.abs(p.pos.y - (e.base.y + h + e.dropY)) < .35) {
            p.pos.y += e.dropY - (p._fallCarry || 0);  // увлекаем игрока вниз
            p._fallCarry = e.dropY;
          }
          if (e.dropY < -60) { e.armed = false; e.dropY = 0; e.cd = 3; }   // возврат
        } else { p && (p._fallCarry = 0); }
      }

      /* перенос игрока движущейся платформой */
      if (e.kind === 'mover' && p && p.alive && p.onGround) {
        const onTop = Math.abs(p.pos.x - e.aabb.minX - w / 2) < w / 2 + .35 &&
                      Math.abs(p.pos.z - e.aabb.minZ - d / 2) < d / 2 + .35 &&
                      Math.abs(p.pos.y - e.aabb.maxY) < .3;
        if (onTop) {
          p.pos.x += (nx - (e.aabb.minX + w / 2));
          p.pos.z += (nz - (e.aabb.minZ + d / 2));
          p.pos.y += (ny - e.aabb.minY);
        }
      }

      e.mesh.position.set(nx, ny + h / 2, nz);
      this._moveAabb(e.aabb, nx, ny, nz, w, h, d);
    }
  },

  /* ближайший элемент к точке (для редактора: удаление/выделение) */
  nearest(x, y, z) {
    let best = null, bd = 6;
    for (const e of this.list) {
      const ex = e.base ? e.base.x : e.x, ey = e.base ? e.base.y : (e.y || 0), ez = e.base ? e.base.z : e.z;
      const d = Math.hypot(ex - x, ey - y, ez - z);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }
};
