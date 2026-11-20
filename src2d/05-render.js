/* ============================================================
   05 — КАМЕРА, ФОН И БЛОКИ КАРТЫ (пиксельная графика)
   ============================================================ */

const Cam = {
  x: 0, y: 0, tx: 0, ty: 0, shake: 0, shakeX: 0, shakeY: 0, look: 0,

  follow(tx, ty, dt) {
    this.tx = tx; this.ty = ty;
    const k = 1 - Math.pow(0.0018, dt);
    this.x = lerp(this.x, this.tx, k);
    this.y = lerp(this.y, this.ty, k);
    if (this.shake > 0.001) {
      this.shake = Math.max(0, this.shake - dt * 2.4);
      const q = 3;
      this.shakeX = Math.round(rnd(-1, 1) * this.shake * 14 / q) * q;
      this.shakeY = Math.round(rnd(-1, 1) * this.shake * 11 / q) * q;
    } else { this.shakeX = this.shakeY = 0; }
  },
  add(s) { this.shake = Math.min(1.4, this.shake + s); },
  left() { return Math.round(this.x - G2.vw / 2) + this.shakeX; },
  top() { return Math.round(this.y - G2.vh / 2) + this.shakeY; },
};

const REND = {
  /* ---------------- фон: полосатое небо + ступенчатый параллакс ---------------- */
  sky(L) {
    const ctx = G2.ctx, th = THEMES[L.theme] || THEMES.day;
    const BANDS = 18;
    for (let i = 0; i < BANDS; i++) {
      const f = i / (BANDS - 1);
      const c = mixCol(th.sky[0], th.sky[1], f);
      rect(ctx, 0, Math.floor(i * G2.vh / BANDS), G2.vw, Math.ceil(G2.vh / BANDS) + 1, c);
    }

    /* солнце / луна — ступенчатый кружок */
    const sunX = Math.round(G2.vw * 0.78), sunY = Math.round(G2.vh * 0.19 - Cam.y * 0.02);
    if (th.sun) {
      for (let r = 34; r > 0; r -= 4) {
        const a = 0.05 + (1 - r / 34) * 0.10;
        circle(ctx, sunX, sunY, r, 'rgba(255,238,180,' + a.toFixed(2) + ')');
      }
      pixDisc(ctx, sunX, sunY, 13, '#fff8d8');
      pixDisc(ctx, sunX, sunY, 9, '#fffdf0');
    } else {
      pixDisc(ctx, sunX, sunY, 15, '#e2ecff');
      pixDisc(ctx, sunX + 5, sunY - 4, 12, mixCol(th.sky[0], th.sky[1], 0.15));
      for (let i = 0; i < 40; i++) {
        const sx = (i * 137.5) % G2.vw, sy = (i * 61.7) % Math.round(G2.vh * 0.66);
        const s = (i % 7 === 0) ? 2 : 1;
        rect(ctx, sx, sy, s, s, 'rgba(255,255,255,' + (0.22 + (i % 4) * 0.16).toFixed(2) + ')');
      }
    }

    /* облака (медленный параллакс) */
    if (th.sun) {
      const co = Cam.left() * 0.06;
      for (let i = 0; i < 7; i++) {
        const cw2 = 60 + (i % 3) * 34;
        const cx2 = Math.round(((i * 197) - co * 0.6) % (G2.vw + 240)) - 120;
        const cy2 = Math.round(28 + (i * 53) % 90 - Cam.top() * 0.03);
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx2, cy2 + 6, cw2, 7);
        ctx.fillRect(cx2 + 10, cy2, cw2 - 24, 8);
        ctx.fillRect(cx2 + 22, cy2 - 5, cw2 - 42, 7);
        ctx.globalAlpha = 0.30;
        ctx.fillStyle = '#c8d8ee';
        ctx.fillRect(cx2, cy2 + 12, cw2, 3);
        ctx.globalAlpha = 1;
      }
    }

    /* три слоя ступенчатых гор */
    const layers = [
      { k: 0.12, col: shadeRGB(th.far, 1.02), amp: 52, base: 0.70, step: 16, seed: 0 },
      { k: 0.26, col: shadeRGB(th.mid, 1.00), amp: 78, base: 0.80, step: 12, seed: 977 },
      { k: 0.46, col: shadeRGB(th.mid, 0.68), amp: 104, base: 0.90, step: 10, seed: 3131 },
    ];
    for (const lay of layers) {
      const off = Cam.left() * lay.k;
      const baseY = Math.round(G2.vh * lay.base - Cam.top() * lay.k * 0.30);
      ctx.fillStyle = lay.col;
      for (let x = -lay.step; x <= G2.vw + lay.step; x += lay.step) {
        const wx = Math.round(x - (((off % lay.step) + lay.step) % lay.step));
        const h = Math.round(lay.amp * (0.5 + 0.5 * Math.sin((x + off) * 0.0019 + lay.seed)) / 4) * 4;
        ctx.fillRect(wx, baseY - h, lay.step + 1, h + G2.vh);
      }
    }

    /* дальняя застройка / деревья — 4-й слой с деталями */
    {
      const off = Cam.left() * 0.60;
      const baseY = Math.round(G2.vh * 0.94 - Cam.top() * 0.18);
      const col = shadeRGB(th.mid, 0.52);
      const col2 = shadeRGB(th.mid, 0.62);
      const STEP = 46;
      for (let x = -STEP; x <= G2.vw + STEP * 2; x += STEP) {
        const wx = Math.round(x - (((off % STEP) + STEP) % STEP));
        const s = Math.abs(((x + (off | 0)) * 2654435761) & 0xffff);
        const kind = s % 3;
        const hh = 34 + (s % 58);
        if (kind === 0) {
          ctx.fillStyle = col;
          ctx.fillRect(wx, baseY - hh, 34, hh + G2.vh);
          ctx.fillStyle = col2;
          ctx.fillRect(wx + 4, baseY - hh + 6, 5, 5);
          ctx.fillRect(wx + 16, baseY - hh + 6, 5, 5);
          ctx.fillRect(wx + 4, baseY - hh + 18, 5, 5);
          ctx.fillRect(wx + 16, baseY - hh + 18, 5, 5);
        } else if (kind === 1) {
          ctx.fillStyle = col;
          ctx.fillRect(wx + 14, baseY - hh * 0.55, 6, hh * 0.55 + G2.vh);
          ctx.fillRect(wx, baseY - hh, 34, 10);
          ctx.fillRect(wx + 2, baseY - hh - 8, 30, 9);
        } else {
          ctx.fillStyle = col;
          ctx.fillRect(wx + 6, baseY - hh, 22, hh + G2.vh);
          ctx.fillStyle = col2;
          ctx.fillRect(wx + 6, baseY - hh, 22, 4);
        }
      }
    }
    /* дымка */
    if (th.fog > 0.02) {
      ctx.fillStyle = 'rgba(' + colToStr(th.sky[1]) + ',' + th.fog + ')';
      ctx.fillRect(0, 0, G2.vw, G2.vh);
    }
  },

  /* ---------------- блоки ---------------- */
  world(L, ctx2) {
    const ctx = ctx2 || G2.ctx;
    const l = Cam.left(), t = Cam.top();
    DEST.draw(ctx, l, t, G2.vw, G2.vh);
    const r = l + G2.vw, b = t + G2.vh;
    for (let i = 0; i < L.hazards.length; i++) {
      const h = L.hazards[i];
      if (h.x > r || h.x + h.w < l || h.y > b || h.y + h.h < t) continue;
      REND.hazard(h, ctx);
    }
  },

  block(L, q, ctx) {
    ctx = ctx || G2.ctx;
    const th = THEMES[L.theme] || THEMES.day;
    const x = Math.round(q.x), y = Math.round(q.y), w = Math.round(q.w), h = Math.round(q.h);
    let top, body, edge, speck;
    switch (q.kind) {
      case 'ground': top = 0x7ba04e; body = 0x6b5238; edge = 0x453322; speck = 0x5c4630; break;
      case 'sand': top = 0xe6cf8c; body = 0xc9ac6c; edge = 0x93794a; speck = 0xb09456; break;
      case 'rock': top = 0x9a9484; body = 0x787265; edge = 0x514c42; speck = 0x66604f; break;
      case 'metal': top = 0xacb6c6; body = 0x7d8798; edge = 0x4c5462; speck = 0x6b7484; break;
      case 'brick': top = 0xbe7268; body = 0x8f5650; edge = 0x5c3a36; speck = 0x7a4741; break;
      case 'concrete': top = 0xb0b0aa; body = 0x8b8b85; edge = 0x5c5c58; speck = 0x767670; break;
      case 'glass': top = 0xc6ecf7; body = 0x8fc9dd; edge = 0x5a91a8; speck = 0x7fb8cc; break;
      case 'shelf': top = 0xa07c42; body = 0x7d5e30; edge = 0x4f3c1d; speck = 0x664c26; break;
      case 'crate': top = 0xd9a052; body = 0xa87a38; edge = 0x6b4d1f; speck = 0x8c642c; break;
      case 'barrel': top = 0xd85a46; body = 0xa84031; edge = 0x6b271c; speck = 0x8c3427; break;
      case 'roof': top = 0x7f7f88; body = 0x5d5d66; edge = 0x393940; speck = 0x4c4c54; break;
      case 'floor': top = 0x74929f; body = 0x566d78; edge = 0x33434b; speck = 0x465c66; break;
      case 'wall': top = 0x666c7c; body = 0x4c515e; edge = 0x2c3038; speck = 0x3e424e; break;
      case 'door': top = 0x6f4a2c; body = 0x52351c; edge = 0x31200f; speck = 0x432a15; break;
      default: top = 0x7a7a82; body = 0x5e5e66; edge = 0x3c3c44; speck = 0x4c4c54;
    }
    const li = th.light;
    rect(ctx, x, y, w, h, shadeRGB(body, li));
    /* верхняя кромка */
    rect(ctx, x, y, w, 4, shadeRGB(top, li));
    rect(ctx, x, y, w, 2, shadeRGB(top, li * 1.22));
    /* боковые грани */
    rect(ctx, x, y, 2, h, shadeRGB(top, li * 0.86));
    rect(ctx, x + w - 2, y, 2, h, shadeRGB(edge, li * 1.1));
    /* пиксельная фактура */
    ctx.fillStyle = shadeRGB(speck, li);
    if (q.kind === 'crate' || q.kind === 'shelf') {
      ctx.fillRect(x + 3, y + 5, w - 6, 2);
      ctx.fillRect(x + 3, y + h - 7, w - 6, 2);
      ctx.fillRect(x + 3, y + 5, 2, h - 10);
      ctx.fillRect(x + w - 5, y + 5, 2, h - 10);
    } else if (q.kind === 'brick' || q.kind === 'concrete') {
      for (let yy = y + 10; yy < y + h - 2; yy += 12) {
        ctx.fillRect(x, yy, w, 2);
        const off2 = (((yy / 12) | 0) % 2) ? 10 : 0;
        for (let xx = x + off2; xx < x + w - 2; xx += 20) ctx.fillRect(xx, yy, 2, 12);
      }
    } else if (q.kind === 'metal') {
      ctx.fillRect(x + 2, y + 9, w - 4, 2);
      for (let xx = x + 6; xx < x + w - 6; xx += 18) ctx.fillRect(xx, y + 6, 2, 2);
    } else if (q.kind === 'roof' || q.kind === 'floor') {
      for (let xx = x + 4; xx < x + w - 4; xx += 14) ctx.fillRect(xx, y + 8, 6, 2);
    } else {
      let s = (x * 7919 + y * 104729) & 0xffff;
      const n = Math.min(18, (w * h) / 900 | 0);
      for (let i = 0; i < n; i++) {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        const px = x + 3 + (s % Math.max(1, w - 6));
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        const py = y + 5 + (s % Math.max(1, h - 8));
        ctx.fillRect(px, py, 2, 2);
      }
    }
    rect(ctx, x, y + h - 2, w, 2, shadeRGB(edge, li * 0.85));
  },

  hazard(h, ctx) {
    ctx = ctx || G2.ctx;
    const x = Math.round(h.x), y = Math.round(h.y), w = Math.round(h.w), hh = Math.round(h.h);
    if (h.kind === 'spike') {
      ctx.fillStyle = '#dbe4ee';
      for (let px = x; px < x + w; px += 8) {
        ctx.beginPath();
        ctx.moveTo(px, y + hh); ctx.lineTo(px + 4, y); ctx.lineTo(px + 8, y + hh);
        ctx.fill();
      }
      ctx.fillStyle = '#8f9aa8';
      for (let px = x + 4; px < x + w; px += 8) ctx.fillRect(px, y + 2, 1, hh - 2);
    } else if (h.kind === 'pit') {
      ctx.fillStyle = '#07040b';
      ctx.fillRect(x, y, w, hh);
      ctx.fillStyle = '#140c1e';
      ctx.fillRect(x, y, w, 3);
    } else {
      const col = h.kind === 'acid' ? '#8ce03c' : '#ff6a1e';
      ctx.fillStyle = col;
      ctx.fillRect(x, y, w, hh);
      ctx.fillStyle = h.kind === 'acid' ? '#c6ff7a' : '#ffc15a';
      ctx.fillRect(x, y, w, 3);
      for (let i = 0; i < 6; i++) {
        const bx = x + ((i * 37 + ((G2.time * 40) | 0)) % w);
        const by = y - ((Math.sin(G2.time * 3 + i) * 0.5 + 0.5) * 8 + 2);
        ctx.fillRect(bx, by, 3, 3);
      }
    }
  },
};

/* --------- вспомогательные --------- */
function mixCol(a, b, f) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return 'rgb(' + ((ar + (br - ar) * f) | 0) + ',' + ((ag + (bg - ag) * f) | 0) + ',' + ((ab + (bb - ab) * f) | 0) + ')';
}
function colToStr(n) { return ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255); }

/** Ступенчатый круг (пиксельный). */
function pixDisc(ctx, cx, cy, r, col) {
  ctx.fillStyle = col;
  for (let y = -r; y <= r; y += 2) {
    const w = Math.sqrt(Math.max(0, r * r - y * y));
    ctx.fillRect(cx - w, cy + y, w * 2, 2);
  }
}
