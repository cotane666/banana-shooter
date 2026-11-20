/* ============================================================
   07 — ЭФФЕКТЫ: частицы, следы, всплывающие числа, вспышки
   ============================================================ */

const FX = {
  parts: [],
  decals: [],
  texts: [],
  rings: [],
  MAX: 900,

  clear() { this.parts.length = 0; this.decals.length = 0; this.texts.length = 0; this.rings.length = 0; },

  spawn(x, y, vx, vy, life, col, size, grav, kind) {
    if (this.parts.length >= this.MAX) this.parts.shift();
    this.parts.push({
      x, y, vx, vy, life, max: life, col, size: size || 2,
      grav: grav === undefined ? 420 : grav, kind: kind || 'p',
    });
  },

  burst(x, y, n, col, spd, size, grav) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.2832, s = spd * (0.35 + Math.random() * 0.85);
      this.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s, rnd(0.25, 0.6), col, size || 2, grav === undefined ? 520 : grav);
    }
  },

  blood(x, y, dx, dy, n, gore) {
    const cnt = gore === false ? Math.min(n, 3) : n;
    for (let i = 0; i < cnt; i++) {
      const a = Math.atan2(dy, dx) + rnd(-0.9, 0.9), s = rnd(60, 280);
      this.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s - rnd(0, 90), rnd(0.35, 0.9),
        pick(gore === false ? ['#a01419'] : ['#c01824', '#8a0f18', '#e0332c']), rnd(1, 3), 700, 'blood');
    }
  },

  smoke(x, y, n, col, up) {
    for (let i = 0; i < n; i++) {
      this.spawn(x + rnd(-4, 4), y + rnd(-4, 4), rnd(-24, 24), (up ? -1 : 1) * rnd(10, 46),
        rnd(0.5, 1.3), col || 'rgba(120,120,130,.55)', rnd(3, 6), -12, 'smoke');
    }
  },

  dust(x, y, n, dir) {
    for (let i = 0; i < n; i++) {
      this.spawn(x + rnd(-5, 5), y - rnd(0, 3), (dir || 0) * rnd(10, 60) + rnd(-30, 30), rnd(-50, -8),
        rnd(0.25, 0.6), pick(['#c9b58c', '#a89474', '#8d7a5c']), rnd(1, 3), 520);
    }
  },

  /** Куски породы от разрушения — летят и падают. */
  debris(x, y, n, size) {
    for (let i = 0; i < n; i++) {
      this.spawn(x + rnd(-5, 5), y + rnd(-5, 5), rnd(-140, 140), rnd(-230, -70),
        rnd(0.5, 1.1), pick(['#8a7a60', '#6b5238', '#a89070', '#5c4630']),
        size || 3, 900, 'debris');
    }
  },

  /** Гильза от выстрела. */
  casing(x, y, dir) {
    this.spawn(x, y, -dir * rnd(40, 90), rnd(-140, -70), rnd(0.6, 1.0), '#d8b45a', 2, 900, 'debris');
  },

  tracer(x1, y1, x2, y2, col) {
    this.spawn(x1, y1, 0, 0, 0.06, col || '#ffe08a', 1, 0, 'tracer');
    this.parts[this.parts.length - 1].x2 = x2;
    this.parts[this.parts.length - 1].y2 = y2;
  },

  ring(x, y, r, col, life) { this.rings.push({ x, y, r: 0, rMax: r, life: life || 0.35, max: life || 0.35, col }); },

  decal(x, y, col, size) {
    if (this.decals.length > 220) this.decals.shift();
    this.decals.push({ x: Math.round(x), y: Math.round(y), col, size: size || 2, a: 1 });
  },

  num(x, y, val, col, big) {
    if (this.texts.length > 60) this.texts.shift();
    this.texts.push({ x, y, v: Math.round(val), col: col || '#fff', life: 0.75, max: 0.75, big: !!big, vy: -46 });
  },

  label(x, y, str, col, life) {
    if (this.texts.length > 60) this.texts.shift();
    this.texts.push({ x, y, s: str, col: col || '#fff', life: life || 1.2, max: life || 1.2, vy: -30 });
  },

  update(dt) {
    const P = this.parts;
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      p.life -= dt;
      if (p.life <= 0) { P.splice(i, 1); continue; }
      if (p.kind !== 'tracer') {
        p.vy += p.grav * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.kind === 'blood' || p.kind === 'p') {
          const g = FX._ground(p.x, p.y);
          if (g) { FX.decal(p.x, g, p.kind === 'blood' ? '#7a0d14' : '#00000040', p.kind === 'blood' ? 2 : 1); p.life = 0; }
        }
      }
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      if (r.life <= 0) this.rings.splice(i, 1);
      else r.r = r.rMax * (1 - r.life / r.max);
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt; t.y += t.vy * dt; t.vy *= 0.92;
      if (t.life <= 0) this.texts.splice(i, 1);
    }
    for (let i = this.decals.length - 1; i >= 0; i--) {
      this.decals[i].a -= dt * 0.06;
      if (this.decals[i].a <= 0) this.decals.splice(i, 1);
    }
  },

  _ground(x, y) {
    const L = Game.L;
    if (!L) return 0;
    const r = { x: x - 1, y: y, w: 2, h: 8 };
    const q = [];
    L.grid.query(r.x, r.y, r.w, r.h, q);
    for (let i = 0; i < q.length; i++) if (aabbHit(r, q[i])) return q[i].y;
    return 0;
  },

  draw(ctx) {
    /* следы */
    for (let i = 0; i < this.decals.length; i++) {
      const d = this.decals[i];
      ctx.globalAlpha = Math.min(1, d.a);
      rect(ctx, d.x, d.y, d.size, d.size, d.col);
    }
    ctx.globalAlpha = 1;
    /* частицы */
    for (let i = 0; i < this.parts.length; i++) {
      const p = this.parts[i];
      if (p.kind === 'tracer') {
        ctx.strokeStyle = p.col; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x2, p.y2); ctx.stroke();
        continue;
      }
      if (p.kind === 'smoke') {
        ctx.globalAlpha = Math.min(1, p.life / p.max) * 0.6;
        circle(ctx, p.x, p.y, p.size, p.col);
        ctx.globalAlpha = 1;
        continue;
      }
      rect(ctx, p.x, p.y, p.size, p.size, p.col);
    }
    /* кольца ударной волны */
    for (let i = 0; i < this.rings.length; i++) {
      const r = this.rings[i];
      ctx.globalAlpha = Math.max(0, r.life / r.max) * 0.8;
      ring(ctx, r.x, r.y, r.r, 2, r.col);
      ctx.globalAlpha = 1;
    }
  },

  drawTexts(ctx) {
    for (let i = 0; i < this.texts.length; i++) {
      const t = this.texts[i];
      const a = Math.min(1, t.life / t.max * 1.6);
      ctx.globalAlpha = a;
      if (t.s !== undefined) text(ctx, t.s, t.x, t.y, t.big ? 12 : 9, t.col, 'center', true);
      else text(ctx, String(t.v), t.x, t.y, t.big ? 13 : 10, t.col, 'center', true);
      ctx.globalAlpha = 1;
    }
  },
};
