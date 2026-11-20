/* ============================================================
   08 — ОРУЖИЕ: стрельба, снаряды, ближний бой, луч, щит
   Всё строится автоматически по таблице WEAPONS из оригинала.
   ============================================================ */

const BULLETS = {
  list: [],

  clear() { this.list.length = 0; },

  spawn(o) {
    if (this.list.length > 420) this.list.shift();
    this.list.push(o);
    return o;
  },

  update(dt, G) {
    const L = G.L, arr = this.list;
    for (let i = arr.length - 1; i >= 0; i--) {
      const b = arr[i];
      b.life -= dt;
      if (b.life <= 0) { arr.splice(i, 1); continue; }

      if (b.grav) b.vy += b.grav * dt;
      if (b.homing) {
        const tg = G.nearestEnemyTo(b.x, b.y, 260, b.owner === 'z' ? 'p' : 'e');
        if (tg) {
          const dx = (tg.x + tg.w / 2) - b.x, dy = (tg.y + tg.h / 2) - b.y;
          const a = Math.atan2(dy, dx), ca = Math.atan2(b.vy, b.vx);
          let da = a - ca; while (da > Math.PI) da -= 6.2832; while (da < -Math.PI) da += 6.2832;
          const na = ca + clamp(da, -3.4 * dt, 3.4 * dt);
          const sp = Math.hypot(b.vx, b.vy);
          b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp;
        }
      }
      if (b.spin !== undefined) b.spin += dt * 14;

      /* движение подшагами, чтобы не проскакивать сквозь стены */
      const steps = Math.max(1, Math.ceil(Math.hypot(b.vx, b.vy) * dt / 7));
      const sdt = dt / steps;
      let dead = false;
      for (let s = 0; s < steps && !dead; s++) {
        const px = b.x, py = b.y;
        b.x += b.vx * sdt; b.y += b.vy * sdt;

        /* стены */
        if (b.wall !== false) {
          const hit = raySolid(L, px, py, b.x, b.y, true);
          if (hit) { BULLETS.impact(b, G, hit.x, hit.y, true, hit); dead = true; break; }
        }
        /* выход за границы карты */
        if (b.x < -40 || b.x > L.w + 40 || b.y < -60 || b.y > L.h + 60) { dead = true; break; }

        /* попадание */
        if (b.owner === 'p') {
          const z = G.enemyAt(b.x, b.y, b.hitR || 3);
          if (z) { if (G.hitEnemy(z, b, b.x, b.y)) dead = true; }
        } else {
          const pl = G.player;
          if (b.hitR === undefined && pl && !pl.dead && !G.playerShield &&
            b.x > pl.x - 3 && b.x < pl.x + pl.w + 3 && b.y > pl.y - 3 && b.y < pl.y + pl.h + 3) {
            G.hurtPlayer(b.dmg, b.x, b.y);
            BULLETS.impact(b, G, b.x, b.y, false);
            dead = true;
          }
        }
      }
      if (dead) arr.splice(i, 1);
    }
  },

  impact(b, G, x, y, onWall, cell) {
    /* пробиваем мир: любая пуля оставляет воронку */
    if (onWall && cell && b.dig) {
      if (cell.m && MAT2[cell.m] && MAT2[cell.m].boom) {
        G.queueBoom(cell.cx * DEST.cw + 4, cell.cy * DEST.ch + 4);
      }
      const n = DEST.carve(cell.cx * DEST.cw + 4, cell.cy * DEST.ch + 4, b.dig, 1);
      if (n) FX.burst(x, y, 4, '#b8a888', 130, 2, 520);
    }
    if (b.splash) {
      G.explode(x, y, b.splash, b.splashDmg, b.owner, b.explCol, b.noSelf);
    } else if (b.acid) {
      G.addAcidPool(x, y, b.acidR, b.acidDps, b.acidLife);
      FX.burst(x, y, 6, '#8ce03c', 90, 2, 300);
    } else if (b.hive) {
      for (let i = 0; i < b.hiveCount; i++) {
        const a = -1.6 + i * (3.2 / b.hiveCount);
        BULLETS.spawn({
          x, y, vx: Math.cos(a) * 210, vy: Math.sin(a) * 210, life: 4.5, dmg: b.hiveDmg,
          owner: b.owner, kind: 'drone', col: '#d8a020', size: 3, grav: 0, homing: true, hitR: 3,
        });
      }
      FX.ring(x, y, 22, '#ffd24a', 0.4);
    }
    const col = b.owner === 'p' ? '#ffe08a' : '#ff9a6a';
    FX.burst(x, y, onWall ? 5 : 3, col, 120, 1.6, 260);
    if (onWall && b.owner === 'p') FX.decal(x, y, 'rgba(0,0,0,.45)', 2);
  },

  draw(ctx) {
    const arr = this.list;
    for (let i = 0; i < arr.length; i++) {
      const b = arr[i];
      const sp = Math.hypot(b.vx, b.vy) || 1;
      const nx = b.vx / sp, ny = b.vy / sp;
      const tl = b.trail || 10;
      ctx.strokeStyle = b.col;
      ctx.lineWidth = b.size || 2;
      ctx.beginPath();
      ctx.moveTo(b.x - nx * tl, b.y - ny * tl);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      if (b.big) rect(ctx, b.x - 3, b.y - 3, 6, 6, b.col);
      if (b.kind === 'banana') {
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.spin || 0);
        rect(ctx, -4, -1.5, 8, 3, '#f2c53d');
        rect(ctx, 3, -1.5, 2, 3, '#8a6a1c');
        ctx.restore();
      }
      if (b.kind === 'drone') {
        rect(ctx, b.x - 3, b.y - 3, 6, 6, '#d8a020');
        rect(ctx, b.x - 1, b.y - 1, 2, 2, '#5a3a08');
      }
    }
  },
};

/* ---------------------------------------------------------------- оружие игрока */

const Weap = {
  /** Состояние боезапаса по каждому стволу в текущем забеге. */
  makeState() { return { mag: {}, reserve: {}, cd: 0, reloadT: 0, reloadFor: null, spin: 0, heat: 0, vent: 0, beamOn: 0, swapT: 0 }; },

  def(id) { return WEAPONS[id]; },

  /** Полный боезапас ствола (магазин + запас). */
  fill(st, id) {
    const w = WEAPONS[id];
    st.mag[id] = w.mag;
    st.reserve[id] = w.reserve;
  },

  ammo(st, id) {
    const w = WEAPONS[id];
    if (w.mag === Infinity) return Infinity;
    return st.mag[id] === undefined ? 0 : st.mag[id];
  },

  reloadTime(id) {
    const w = WEAPONS[id];
    if (w.cat === 'melee') return 0;
    if (w.cat === 'sniper') return 2.6;
    if (w.cat === 'shotgun' || w.cat === 'lmg' || w.cat === 'heavy') return 3.0;
    return 1.9;
  },

  startReload(G, id) {
    const st = G.weap, w = WEAPONS[id];
    if (w.mag === Infinity) return;
    if (st.reloadT > 0) return;
    if ((st.mag[id] || 0) >= w.mag) return;
    if ((st.reserve[id] || 0) <= 0) { Audio3D_SFX.empty(); return; }
    st.reloadT = this.reloadTime(id);
    st.reloadFor = id;
    Audio3D_SFX.reloadStep(0);
  },

  finishReload(G, id) {
    const st = G.weap, w = WEAPONS[id];
    const need = w.mag - (st.mag[id] || 0);
    const take = Math.min(need, st.reserve[id] || 0);
    st.mag[id] = (st.mag[id] || 0) + take;
    st.reserve[id] = (st.reserve[id] || 0) - take;
  },

  update(G, dt) {
    const st = G.weap;
    if (st.cd > 0) st.cd -= dt;
    if (st.reloadT > 0) {
      st.reloadT -= dt;
      if (st.reloadT <= 0) { this.finishReload(G, st.reloadFor); st.reloadFor = null; }
    }
    if (st.heat > 0) st.heat = Math.max(0, st.heat - dt * 0.4);
    if (st.vent > 0) { st.vent -= dt; if (st.vent <= 0) st.heat = 0; }
    if (st.swapT > 0) st.swapT -= dt;
  },

  /** Основной вызов из игрового цикла. */
  tick(G, dt, wantFire, alt) {
    const id = G.weaponId, w = WEAPONS[id], st = G.weap, p = G.player;
    if (w.beam) { this.beam(G, dt, wantFire, alt); return; }
    if (w.drill) { this.drill(G, dt, wantFire); return; }

    const spinNeed = w.spinUp || 0;
    if (wantFire && spinNeed > 0) st.spin = Math.min(spinNeed, st.spin + dt);
    else st.spin = Math.max(0, st.spin - dt * 1.6);

    if (!wantFire || st.reloadT > 0 || st.swapT > 0) return;
    if (st.cd > 0) return;
    if (spinNeed > 0 && st.spin < spinNeed - 0.001) {
      if (Math.random() < 0.25) Audio3D_SFX.minigunSpin(p.x, 0, 0);
      return;
    }

    if (w.mag !== Infinity && (st.mag[id] || 0) <= 0) { this.startReload(G, id); return; }
    this.fire(G, id, w, alt);
  },

  muzzle(G) {
    const p = G.player;
    const ax = p.aimX, ay = p.aimY;
    const mx = p.x + p.w / 2 + ax * 16;
    const my = p.y + p.h - 13 + ay * 12;
    return { x: mx, y: my, ax, ay };
  },

  fire(G, id, w, alt) {
    const st = G.weap, p = G.player, L = G.L;
    const m = this.muzzle(G);
    const rpm = w.rpm || 300;
    st.cd = 60 / rpm + (alt && w.cat === 'sniper' ? 0.25 : 0);

    if (w.shield) { p.shieldOn = 0.9; Audio3D_SFX.laser(); return; }

    if (w.mag !== Infinity) st.mag[id] = (st.mag[id] || 0) - 1;
    G.stats.shots++;

    /* разброс */
    let spread = (w.spread || 0) * (p.onGround ? 1 : 1.7);
    if (Math.abs(p.vx) > 20) spread += (w.moveSpread || 0);
    if (G.ctrl.crouch) spread *= 0.65;

    /* ближний бой */
    if (w.cat === 'melee' || w.melee) {
      this.melee(G, w, m);
      Audio3D_SFX.shot('knife');
      return;
    }

    const pellets = w.pellets || 1;
    let kind = w.projectile || 'bullet';
    for (let i = 0; i < pellets; i++) {
      const a = Math.atan2(m.ay, m.ax) + rnd(-spread, spread) + (pellets > 1 ? rnd(-0.04, 0.04) : 0);
      const spd = w.projectile ? (w.projSpeed || 40) * CFG2.PPM : 1500 + rnd(-90, 90);
      const vx = Math.cos(a) * spd, vy = Math.sin(a) * spd;
      const range = (w.range || 80) * CFG2.PPM;
      kind = w.projectile || 'bullet';

      BULLETS.spawn({
        x: m.x, y: m.y, vx, vy, life: range / spd,
        dmg: w.dmg, owner: 'p', kind,
        col: this.tracerColor(w), size: kind === 'bullet' ? (w.pierce ? 2 : 1.8) : 3,
        dig: kind === 'bullet' ? (w.cat === 'sniper' || w.cat === 'heavy' || w.cat === 'lmg' ? 7 : (w.cat === 'pistol' || w.cat === 'smg' ? 3 : 5)) : 0,
        grav: w.projGravity ? w.projGravity * CFG2.PPM : 0,
        splash: w.splash ? w.splash * CFG2.PPM : 0,
        splashDmg: w.splashDmg || 0,
        explCol: w.explosionColor || null,
        noSelf: w.noSelfDamage || false,
        pierce: !!w.pierce, hitR: w.pierce ? 5 : 3,
        trail: kind === 'bullet' ? 9 : 6,
        big: kind === 'rocket',
        spin: kind === 'banana' ? 0 : undefined,
        acid: kind === 'acid', acidR: (w.acidR || 2.7) * CFG2.PPM, acidDps: w.acidDps, acidLife: w.acidLife,
        hive: kind === 'hive', hiveCount: w.hiveCount || 5, hiveDmg: (w.splashDmg || 40),
        homing: kind === 'guided' || kind === 'hive',
        bulletSplash: w.bulletSplash ? w.bulletSplash * CFG2.PPM : 0,
        bulletSplashDmg: w.bulletSplashDmg || 0,
        bulletExplCol: w.bulletExplosionColor || null,
      });
    }

    /* отдача и эффекты */
    G.recoil = (w.recoil || 1) * 0.6;
    G.muzzleT = 0.05;
    G.muzzleX = m.x; G.muzzleY = m.y;
    Cam.add((w.recoil || 1) * 0.045);
    FX.burst(m.x + m.ax * 6, m.y + m.ay * 6, 2, '#ffe6a0', 90, 1.4, 120);
    FX.casing(m.x - m.ax * 6, m.y - m.ay * 3, m.ax);
    if (w.cat === 'shotgun' || w.cat === 'sniper' || w.cat === 'heavy') FX.smoke(m.x + m.ax * 8, m.y + m.ay * 8, 2, 'rgba(150,150,160,.45)', true);
    const snd = w.sound || 'rifle';
    Audio3D_SFX.shot(snd, p.x, 0, 0);
    if (w.sound === 'banana') { Audio3D_SFX.bananaShot(p.x, 0, 0); G.stats.bananas++; }
    if (kind === 'rocket' || kind === 'guided') Audio3D_SFX.rocketShot(p.x, 0, 0);
    if (w.sound === 'laser') Audio3D_SFX.laser(p.x, 0, 0);
  },

  tracerColor(w) {
    if (w.cat === 'banana') return '#f2c53d';
    if (w.sound === 'laser') return '#ff6a2a';
    if (w.projectile) return '#ffb060';
    return w.cat === 'sniper' ? '#dff2ff' : '#ffe08a';
  },

  melee(G, w, m) {
    const reach = (w.range || 2.4) * CFG2.PPM;
    const cx = m.x + m.ax * reach * 0.5, cy = m.y + m.ay * reach * 0.5;
    let hitAny = false;
    for (const z of G.enemies) {
      if (z.dead) continue;
      const zx = z.x + z.w / 2, zy = z.y + z.h / 2;
      if (dist2(zx, zy, cx, cy) > (reach * 0.62 + Math.max(z.w, z.h) * 0.5) ** 2) continue;
      const dir = (zx - m.x) * m.ax + (zy - m.y) * m.ay;
      if (dir < 0) continue;
      const head = zy < z.y + z.h * 0.30;
      G.hitEnemyDirect(z, w.dmg * (head ? (w.headMul || 1.5) : 1), zx, zy, head, w.knockback || 4, m.ax, m.ay);
      hitAny = true;
    }
    if (w.slamDmg) G.explode(cx, cy, (w.slamR || 6) * CFG2.PPM, w.slamDmg, 'p', null, true);
    FX.burst(cx, cy, hitAny ? 8 : 4, '#e8f0ff', 140, 2, 200);
    FX.ring(m.x + m.ax * 10, m.y + m.ay * 10, reach * 0.6, '#ffffff', 0.16);
  },

  /** БУР: непрерывно прогрызает тоннель в направлении прицела. */
  drill(G, dt, wantFire) {
    const st = G.weap, w = WEAPONS[G.weaponId], p = G.player;
    const m = this.muzzle(G);
    if (!wantFire) { st.beamOn = 0; st.sndT = 0; return; }
    const len = (w.range || 2.6) * CFG2.PPM;
    const R = w.drillR || 9;

    /* проходка по линии */
    const steps = Math.max(2, Math.ceil(len / (R * 0.6)));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      DEST.carve(m.x + m.ax * len * t, m.y + m.ay * len * t, R, 1);
    }
    const ex = m.x + m.ax * len, ey = m.y + m.ay * len;

    /* урон и отбрасывание врагам в тоннеле */
    for (const z of G.enemies) {
      if (z.dead || z.dummy) continue;
      const zx = z.x + z.w / 2, zy = z.y + z.h / 2;
      const proj = (zx - m.x) * m.ax + (zy - m.y) * m.ay;
      if (proj < 0 || proj > len + 6) continue;
      const px = m.x + m.ax * proj, py = m.y + m.ay * proj;
      if (dist2(px, py, zx, zy) < (R + Math.max(z.w, z.h) * 0.5) ** 2) {
        G.hitEnemyDirect(z, (w.drillDps || 200) * dt, zx, zy, false, 0, m.ax, m.ay, true);
        z.vx += m.ax * (w.knockback || 3) * 40 * dt * 60 * 0.02;
        z.vy += m.ay * (w.knockback || 3) * 40 * dt * 60 * 0.02;
      }
    }

    /* эффекты */
    FX.burst(ex, ey, 2, '#c8b8a0', 150, 2, 620);
    if (Math.random() < 0.5) FX.debris(ex, ey, 1, 2);
    FX.spawn(ex, ey, rnd(-30, 30), rnd(-30, 30), 0.2, '#ffe0a0', 2, 0);
    Cam.add(0.03);
    st.sndT = (st.sndT || 0) - dt;
    if (st.sndT <= 0) { st.sndT = 0.2; Audio3D_SFX.minigunSpin(p.x, 0, 0); }
    G.beam = { x1: m.x, y1: m.y, x2: ex, y2: ey, drill: true };
  },

  beam(G, dt, wantFire, alt) {
    const st = G.weap, w = WEAPONS[G.weaponId], p = G.player;
    const m = this.muzzle(G);
    if (st.vent > 0) { st.beamOn = 0; return; }
    if (wantFire && st.heat >= w.beamMax) { st.vent = w.beamVent; Audio3D_SFX.cannonOverheat(); st.beamOn = 0; return; }
    if (!wantFire) {
      if (st.beamOn > 0) { Audio3D_SFX.cannonBeamStop(); st.beamOn = 0; }
      st.spin = Math.max(0, st.spin - dt * 1.5);
      return;
    }
    st.spin = Math.min(w.spinUp, st.spin + dt);
    if (st.spin < w.spinUp) { Audio3D_SFX.cannonSpin(p.x, 0, 0); return; }
    if (st.beamOn === 0) { Audio3D_SFX.cannonBeamStart(p.x, 0, 0); st.beamOn = 1; }
    st.heat += dt;

    const len = (w.range || 200) * CFG2.PPM;
    const ex = m.x + m.ax * len, ey = m.y + m.ay * len;
    const hit = raySolid(G.L, m.x, m.y, ex, ey, true);
    const ex2 = hit ? hit.x : ex, ey2 = hit ? hit.y : ey;
    G.beam = { x1: m.x, y1: m.y, x2: ex2, y2: ey2 };
    if (hit) FX.burst(ex2, ey2, 2, '#ffb060', 60, 2, 100);

    for (const z of G.enemies) {
      if (z.dead) continue;
      const zx = z.x + z.w / 2, zy = z.y + z.h / 2;
      const t = ((zx - m.x) * m.ax + (zy - m.y) * m.ay);
      if (t < 0 || t > len) continue;
      const px = m.x + m.ax * t, py = m.y + m.ay * t;
      if (dist2(px, py, zx, zy) < (z.w * 0.7 + 6) ** 2) {
        G.hitEnemyDirect(z, w.beamDps * dt, zx, zy, false, 1, m.ax, m.ay, true);
      }
    }
  },
};

/** Взрыв: урон по площади + эффекты. */
function doExplosion(G, x, y, r, dmg, owner, col, noSelf) {
  FX.ring(x, y, r, '#ffb060', 0.4);
  FX.burst(x, y, 22, '#ffd24a', 260, 3, 260);
  FX.burst(x, y, 14, '#ff7a2a', 200, 4, 140);
  FX.smoke(x, y, 10, 'rgba(90,90,100,.6)', true);
  Cam.add(clamp(r / 260, 0.15, 0.9));
  Audio3D_SFX.explosionAt(x, 0, 0);

  /* воронка в разрушаемом мире + цепные детонации бочек */
  const rx = r * 0.85;
  if (DEST && DEST.cells) {
    const cw = DEST.cw, ch = DEST.ch;
    const cx0 = Math.max(1, Math.floor((x - rx) / cw)), cx1 = Math.min(DEST.cols - 2, Math.ceil((x + rx) / cw));
    const cy0 = Math.max(1, Math.floor((y - rx) / ch)), cy1 = Math.min(DEST.rows - 2, Math.ceil((y + rx) / ch));
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      const m = DEST.mat(cx, cy);
      if (m && MAT2[m] && MAT2[m].boom) G.queueBoom(cx * cw + 4, cy * ch + 4);
    }
    DEST.carve(x, y, rx, 1);
    FX.dust(x, y, 14, 0);
  }

  for (const z of G.enemies) {
    if (z.dead) continue;
    const zx = z.x + z.w / 2, zy = z.y + z.h / 2;
    const d = Math.hypot(zx - x, zy - y);
    if (d > r) continue;
    const f = 1 - d / r;
    G.hitEnemyDirect(z, dmg * (0.45 + 0.55 * f), zx, zy, false, 6 * f, (zx - x) / (d || 1), (zy - y) / (d || 1));
  }
  if (owner !== 'p' || !noSelf) {
    const p = G.player;
    const d = Math.hypot((p.x + p.w / 2) - x, (p.y + p.h / 2) - y);
    if (d < r * 1.1) G.hurtPlayer(dmg * 0.35 * (1 - d / (r * 1.1)), x, y);
  }
}
