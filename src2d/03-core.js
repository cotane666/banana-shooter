/* ============================================================
   03 — CORE: пиксельный канвас, битмап-шрифт, ввод (клавиатура / мышь / тач)
   Вся игра рисуется в offscreen-буфер ЛОГИЧЕСКОГО разрешения (по умолчанию
   640x360) и выводится на экран nearest-neighbor'ом — поэтому картинка
   гарантированно пиксельная, а не мыльная.
   ============================================================ */

const CFG2 = {
  VH: 360,              // логическая высота кадра
  VW_MIN: 400, VW_MAX: 1100,
  PPM: 14,              // пикселей в одном "метре"
  GRAV: 1500,
  TILE: 16,
  PLAYER_H: 36,
  PLAYER_W: 15,
  WALK: 105,
  RUN: 172,
  CROUCH_MUL: 0.45,
  JUMP_V: 520,
  MAX_FALL: 900,
  MAGNET: 46,
};

const G2 = window.G2 = {
  cv: null, dctx: null,      // экран
  oc: null, ctx: null,       // логический буфер
  vw: 640, vh: 360,          // логический размер
  px: 2, offX: 0, offY: 0,   // масштаб и смещение буфера на экране (device px)
  cssPx: 2, cssOffX: 0, cssOffY: 0,
  dpr: 1,
  time: 0, dt: 0, frames: 0, fps: 60, _fpsAcc: 0, _fpsN: 0,
  isMobile: false,
  mouse: { x: 320, y: 180, down: false, rdown: false, moved: false },
  keys: Object.create(null),
  pointers: new Map(),
  sticks: { move: null, aim: null },
  btn: Object.create(null),
  btnHeld: Object.create(null),
  autoAim: true,
  paused: false,
};

/* ---------------------------------------------------------------- утилиты */

window.__errs = [];
function __logErr(s) {
  window.__errs.push(s);
  document.title = 'ERR ' + window.__errs.length;
  try {
    let d = document.getElementById('__errbox');
    if (!d) { d = document.createElement('pre'); d.id = '__errbox'; document.body.appendChild(d); }
    d.textContent += s + '\n';
  } catch (e) { }
}
window.addEventListener('error', e => {
  __logErr(String(e.message) + ' @' + String(e.filename || '').split('/').pop() + ':' + e.lineno + ':' + e.colno);
});
window.addEventListener('unhandledrejection', e => __logErr('promise: ' + String(e.reason)));

function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function lerp(a, b, t) { return a + (b - a) * t; }
function rnd(a, b) { return a + Math.random() * (b - a); }
function rndi(a, b) { return Math.floor(a + Math.random() * (b - a + 1)); }
function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
function sign(v) { return v < 0 ? -1 : (v > 0 ? 1 : 0); }
function approach(cur, target, delta) {
  return cur < target ? Math.min(cur + delta, target) : Math.max(cur - delta, target);
}
function dist2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
function aabbHit(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function pointIn(x, y, r) { return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }
function hexRGB(n) { return 'rgb(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ')'; }
function shadeRGB(n, f) {
  return 'rgb(' + (clamp(((n >> 16) & 255) * f, 0, 255) | 0) + ',' +
    (clamp(((n >> 8) & 255) * f, 0, 255) | 0) + ',' + (clamp((n & 255) * f, 0, 255) | 0) + ')';
}

/* хранение прогресса */
const Store2 = {
  key: 'banana2d_v1',
  data: null,
  _safeGet() {
    try { return localStorage.getItem(this.key); } catch (e) { return null; }
  },
  _safeSet(v) {
    try { localStorage.setItem(this.key, v); return true; } catch (e) { return false; }
  },
  load() {
    if (this.data) return this.data;
    let d = null;
    try { d = JSON.parse(this._safeGet() || 'null'); } catch (e) { d = null; }
    if (!d || typeof d !== 'object') d = {};
    const def = {
      bestWave: 0, bestScore: 0, kills: 0, money: 0, shots: 0, hits: 0, heads: 0,
      deaths: 0, playtime: 0, runs: 0, bananas: 0, bought: {}, achievements: {},
      settings: { autoAim: true, sfx: 0.6, music: 0.5, gore: true, screenShake: true },
    };
    for (const k in def) if (!(k in d)) d[k] = def[k];
    this.data = d;
    return d;
  },
  save() { this._safeSet(JSON.stringify(this.data)); },
};

/* ---------------------------------------------------------------- канвас */

function coreInit() {
  G2.cv = document.getElementById('cv');
  G2.dctx = G2.cv.getContext('2d', { alpha: false });
  G2.oc = document.createElement('canvas');
  G2.ctx = G2.oc.getContext('2d', { alpha: false });
  G2.isMobile = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
  window.addEventListener('resize', coreResize);
  window.addEventListener('orientationchange', () => setTimeout(coreResize, 120));
  coreResize();
  inputInit();
}

function coreResize() {
  const cw = window.innerWidth, ch = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  G2.dpr = dpr;
  G2.cv.width = Math.max(2, Math.round(cw * dpr));
  G2.cv.height = Math.max(2, Math.round(ch * dpr));
  G2.cv.style.width = cw + 'px';
  G2.cv.style.height = ch + 'px';
  G2.vh = CFG2.VH;
  G2.vw = clamp(Math.round(CFG2.VH * (cw / ch)), CFG2.VW_MIN, CFG2.VW_MAX);
  G2.oc.width = G2.vw;
  G2.oc.height = G2.vh;
  G2.px = Math.min(G2.cv.width / G2.vw, G2.cv.height / G2.vh);
  G2.offX = Math.floor((G2.cv.width - G2.vw * G2.px) / 2);
  G2.offY = Math.floor((G2.cv.height - G2.vh * G2.px) / 2);
  G2.cssPx = G2.px / dpr;
  G2.cssOffX = G2.offX / dpr;
  G2.cssOffY = G2.offY / dpr;
  G2.ctx.imageSmoothingEnabled = false;
  G2.dctx.imageSmoothingEnabled = false;
}

/** Вывести логический буфер на экран (nearest-neighbor, с чёрными полями). */
function corePresent() {
  const d = G2.dctx;
  d.imageSmoothingEnabled = false;
  d.fillStyle = '#05060a';
  d.fillRect(0, 0, G2.cv.width, G2.cv.height);
  d.drawImage(G2.oc, 0, 0, G2.vw, G2.vh,
    G2.offX, G2.offY, Math.round(G2.vw * G2.px), Math.round(G2.vh * G2.px));
}

/* ---------------------------------------------------------------- битмап-шрифт */

const PFONT = {
  _measure: null,
  _glyph: Object.create(null),
  _tint: Object.create(null),
  _n: 0,

  _mctx() {
    if (!this._measure) {
      const c = document.createElement('canvas'); c.width = 8; c.height = 8;
      this._measure = c.getContext('2d');
    }
    return this._measure;
  },

  glyph(ch, size, bold) {
    const key = ch + '\u0001' + size + '\u0001' + (bold ? 1 : 0);
    let g = this._glyph[key];
    if (g) return g;
    const mc = this._mctx();
    mc.font = (bold ? '700 ' : '') + size + 'px "Segoe UI", Tahoma, Verdana, Arial, sans-serif';
    const adv = Math.max(1, Math.round(mc.measureText(ch).width));
    const W = adv + 2, H = size + 6;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const c = cv.getContext('2d');
    c.font = (bold ? '700 ' : '') + size + 'px "Segoe UI", Tahoma, Verdana, Arial, sans-serif';
    c.textBaseline = 'top';
    c.fillStyle = '#fff';
    c.fillText(ch, 1, 1);
    const im = c.getImageData(0, 0, W, H), d = im.data;
    for (let i = 3; i < d.length; i += 4) d[i] = d[i] > 118 ? 255 : 0;
    c.putImageData(im, 0, 0);
    g = { cv, W, H, adv, id: 'g' + (this._n++) };
    this._glyph[key] = g;
    return g;
  },

  tinted(g, color) {
    const key = g.id + '\u0001' + color;
    let t = this._tint[key];
    if (t) return t;
    const cv = document.createElement('canvas'); cv.width = g.W; cv.height = g.H;
    const c = cv.getContext('2d');
    c.drawImage(g.cv, 0, 0);
    c.globalCompositeOperation = 'source-in';
    c.fillStyle = color;
    c.fillRect(0, 0, g.W, g.H);
    this._tint[key] = cv;
    return cv;
  },

  width(str, size, bold) {
    let w = 0;
    for (let i = 0; i < str.length; i++) w += this.glyph(str[i], size, bold).adv;
    return w;
  },

  draw(ctx, str, x, y, size, color, align, bold, noShadow) {
    str = String(str);
    let w = 0;
    for (let i = 0; i < str.length; i++) w += this.glyph(str[i], size, bold).adv;
    let xi = Math.round(x);
    if (align === 'center') xi = Math.round(x - w / 2);
    else if (align === 'right') xi = Math.round(x - w);
    const yi = Math.round(y) - Math.round(size * 0.78);
    const SH = '#05070b';
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      const g = this.glyph(ch, size, bold);
      if (ch !== ' ') {
        if (!noShadow) {
          const sh = this.tinted(g, SH);
          ctx.drawImage(sh, xi - 1, yi);
          ctx.drawImage(sh, xi + 1, yi);
          ctx.drawImage(sh, xi, yi - 1);
          ctx.drawImage(sh, xi, yi + 1);
        }
        ctx.drawImage(this.tinted(g, color), xi, yi);
      }
      xi += g.adv;
    }
    return w;
  },
};

/* ---------------------------------------------------------------- ввод */

const BTN_DEF = [
  { id: 'fire',   label: 'ОГОНЬ', bx: -76, by: -76, r: 40, big: true },
  { id: 'jump',   label: 'ПРЫЖ',  bx: -168, by: -58, r: 27 },
  { id: 'crouch', label: 'ВНИЗ',  bx: -46, by: -168, r: 26 },
  { id: 'reload', label: 'ЗАРЯД', bx: -142, by: -132, r: 24 },
  { id: 'swap',   label: 'СМЕНА', bx: -244, by: -50, r: 24 },
  { id: 'climb',  label: 'ЗАЛЕЗ', bx: -46, by: -232, r: 24 },
];

function inputInit() {
  const cv = G2.cv;

  window.addEventListener('keydown', e => {
    if (e.repeat) { e.preventDefault(); return; }
    G2.keys[e.code] = true;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].indexOf(e.code) >= 0) e.preventDefault();
    if (typeof onGameKey === 'function') onGameKey(e.code);
  });
  window.addEventListener('keyup', e => { G2.keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in G2.keys) G2.keys[k] = false; });

  window.addEventListener('mousemove', e => {
    const p = toLogical(e.clientX, e.clientY);
    G2.mouse.x = p.x; G2.mouse.y = p.y; G2.mouse.moved = true;
  });
  cv.addEventListener('mousedown', e => {
    if (e.button === 0) { G2.mouse.down = true; G2.click = toLogical(e.clientX, e.clientY); }
    if (e.button === 2) G2.mouse.rdown = true;
    e.preventDefault();
  });
  window.addEventListener('mouseup', e => {
    if (e.button === 0) G2.mouse.down = false;
    if (e.button === 2) G2.mouse.rdown = false;
  });
  cv.addEventListener('contextmenu', e => e.preventDefault());

  cv.addEventListener('touchstart', e => {
    e.preventDefault();
    const uiMode = G2.uiMode;
    for (const t of e.changedTouches) {
      const p = toLogical(t.clientX, t.clientY);
      if (uiMode) { G2.click = p; continue; }
      const b = hitButton(p.x, p.y);
      if (b) { G2.btn[b] = true; G2.pointers.set(t.identifier, { kind: 'btn', id: b }); }
      else if (p.x < G2.vw * 0.45 && !G2.sticks.move) {
        G2.sticks.move = { id: t.identifier, ox: p.x, oy: p.y, x: p.x, y: p.y, dx: 0, dy: 0 };
        G2.pointers.set(t.identifier, { kind: 'move' });
      } else if (!G2.sticks.aim) {
        G2.sticks.aim = { id: t.identifier, ox: p.x, oy: p.y, x: p.x, y: p.y, dx: 0, dy: 0 };
        G2.pointers.set(t.identifier, { kind: 'aim' });
      }
    }
  }, { passive: false });

  cv.addEventListener('touchmove', e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      const p = toLogical(t.clientX, t.clientY);
      const rec = G2.pointers.get(t.identifier);
      if (!rec) continue;
      if (rec.kind === 'move' && G2.sticks.move) {
        const s = G2.sticks.move, R = 56;
        s.x = p.x; s.y = p.y;
        s.dx = clamp((p.x - s.ox) / R, -1, 1);
        s.dy = clamp((p.y - s.oy) / R, -1, 1);
      } else if (rec.kind === 'aim' && G2.sticks.aim) {
        const s = G2.sticks.aim, R = 50;
        s.x = p.x; s.y = p.y;
        s.dx = clamp((p.x - s.ox) / R, -1, 1);
        s.dy = clamp((p.y - s.oy) / R, -1, 1);
      }
    }
  }, { passive: false });

  const endTouch = e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      const rec = G2.pointers.get(t.identifier);
      G2.pointers.delete(t.identifier);
      if (!rec) continue;
      if (rec.kind === 'btn') G2.btn[rec.id] = false;
      else if (rec.kind === 'move') G2.sticks.move = null;
      else if (rec.kind === 'aim') G2.sticks.aim = null;
    }
  };
  cv.addEventListener('touchend', endTouch, { passive: false });
  cv.addEventListener('touchcancel', endTouch, { passive: false });
}

/** Экранные CSS-координаты -> логические. */
function toLogical(cx, cy) {
  const r = G2.cv.getBoundingClientRect();
  return {
    x: (cx - r.left - G2.cssOffX) / G2.cssPx,
    y: (cy - r.top - G2.cssOffY) / G2.cssPx,
  };
}

function btnPos(def) { return { x: G2.vw + def.bx, y: G2.vh + def.by, r: def.r }; }

function hitButton(x, y) {
  for (const d of BTN_DEF) {
    const p = btnPos(d);
    if (dist2(x, y, p.x, p.y) < (p.r + 10) * (p.r + 10)) return d.id;
  }
  return null;
}

/* ------------------------------------------------- состояние управления */

const Ctrl = {
  moveX: 0, run: false, crouch: false, jumpHeld: false, jumpDown: false,
  fire: false, alt: false, aim: { x: 1, y: 0 }, useStick: false, aimStick: null,
  _jumpPrev: false, _btnJumpPrev: false,

  update() {
    const k = G2.keys;
    let mx = 0;
    if (k.KeyA || k.ArrowLeft) mx -= 1;
    if (k.KeyD || k.ArrowRight) mx += 1;
    let run = !!(k.ShiftLeft || k.ShiftRight);
    let crouch = !!(k.KeyS || k.ArrowDown || k.ControlLeft || k.ControlRight);
    let jumpHeld = !!(k.Space || k.KeyW || k.ArrowUp);
    this.jumpDown = jumpHeld && !this._jumpPrev;
    this._jumpPrev = jumpHeld;
    let fire = G2.mouse.down || !!k.KeyF;
    const alt = G2.mouse.rdown || !!k.KeyQ;
    this.useStick = false; this.aimStick = null;

    const ms = G2.sticks.move;
    if (ms) {
      mx = Math.abs(ms.dx) > 0.18 ? ms.dx : 0;
      if (ms.dy < -0.55) jumpHeld = true;
      if (ms.dy > 0.55) crouch = true;
      if (Math.abs(ms.dx) > 0.86) run = true;
    }
    if (G2.btn.fire) fire = true;
    if (G2.btn.jump) { jumpHeld = true; if (!this._btnJumpPrev) this.jumpDown = true; this._btnJumpPrev = true; }
    else this._btnJumpPrev = false;
    if (G2.btn.crouch) crouch = true;

    const as = G2.sticks.aim;
    if (as && (Math.abs(as.dx) > 0.22 || Math.abs(as.dy) > 0.22)) {
      this.aim.x = as.dx; this.aim.y = as.dy;
      this.useStick = true; this.aimStick = as;
    }

    this.moveX = clamp(mx, -1, 1);
    this.run = run; this.crouch = crouch; this.jumpHeld = jumpHeld;
    this.fire = fire; this.alt = alt;
  },
};

/* ---------------------------------------------------------------- помощники рисовки (логические пиксели) */

function rect(ctx, x, y, w, h, col) {
  ctx.fillStyle = col;
  ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
}
function circle(ctx, x, y, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill(); }
function ring(ctx, x, y, r, w, col) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.stroke(); }
function line(ctx, x1, y1, x2, y2, w, col) {
  ctx.strokeStyle = col; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(Math.round(x1), Math.round(y1)); ctx.lineTo(Math.round(x2), Math.round(y2)); ctx.stroke();
}

/** Пиксельная панель: жёсткая рамка со срезанными углами. */
function panel(ctx, x, y, w, h, fill, border, border2) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  if (border) {
    ctx.fillStyle = border;
    ctx.fillRect(x + 2, y, w - 4, h);
    ctx.fillRect(x, y + 2, w, h - 4);
  }
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
    ctx.fillRect(x + 1, y + 3, w - 2, h - 6);
  }
  if (border2) {
    ctx.fillStyle = border2;
    ctx.fillRect(x + 2, y + 2, w - 4, 1);
  }
}

/** Пиксельная кнопка. */
function pixBtn(ctx, x, y, w, h, label, state, size) {
  const base = state === 'down' ? '#2a3346' : state === 'hot' ? '#3d4a63' : '#232b3c';
  const edge = state === 'down' ? '#161c28' : '#0e131c';
  const hi = state === 'down' ? '#39445c' : '#4b5a78';
  panel(ctx, x, y, w, h, base, edge, hi);
  const s = size || 9;
  text(ctx, label, x + w / 2, y + h / 2 + s * 0.34, s, state === 'down' ? '#c8d4e8' : '#e8eefa', 'center', true);
}

/** Пиксельный прогресс-бар (сегментами). */
function pixBar(ctx, x, y, w, h, f, col, colBg) {
  f = clamp(f, 0, 1);
  ctx.fillStyle = colBg || '#0c1119';
  ctx.fillRect(x, y, w, h);
  const seg = 2, gap = 1;
  const total = Math.floor((w + gap) / (seg + gap));
  const on = Math.round(total * f);
  ctx.fillStyle = col;
  for (let i = 0; i < on; i++) ctx.fillRect(x + i * (seg + gap), y, seg, h);
}

function text(ctx, s, x, y, size, col, align, bold) {
  return PFONT.draw(ctx, s, x, y, size || 10, col || '#fff', align || 'left', !!bold);
}
function hex(n) { return '#' + ('000000' + (n >>> 0).toString(16)).slice(-6); }
