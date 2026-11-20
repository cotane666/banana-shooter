/* ============================================================
   04 — МИР: формат уровня, 10 карт в 2D, коллизии (AABB + пространственная сетка)
   ============================================================ */

const CELL = 128;

function mkLevel(id, name, desc, theme, w, h, build) {
  const L = {
    id, name, desc, theme, w, h,
    rects: [], solid: [], oneWay: [], hazards: [], deco: [], spawnPts: [],
    crates: [], grid: null,
  };
  /* помощники для описания карты */
  L.box = (x, y, ww, hh, kind, col) => {
    const r = { x, y: y - hh, w: ww, h: hh, kind: kind || 'ground', col: col || 0 };
    L.rects.push(r); return r;
  };
  L.plat = (x, y, ww, kind) => {
    const r = { x, y, w: ww, h: 10, kind: kind || 'plat' };
    L.rects.push(r); return r;
  };
  L.hz = (x, y, ww, hh, kind) => L.hazards.push({ x, y: y - hh, w: ww, h: hh, kind: kind || 'spike' });
  L.spawn = (x, y) => L.spawnPts.push({ x, y: y - 4 });
  L.decoAdd = (x, y, kind, s) => L.deco.push({ x, y, kind, s: s || 1 });

  build(L);

  L.solid = L.rects.filter(r => r.kind !== 'plat');
  L.oneWay = L.rects.filter(r => r.kind === 'plat');
  L.grid = new SpatialGrid(w, h, CELL, L.solid);
  DEST.build(L);
  return L;
}

/* --- пространственная сетка для быстрого поиска статичных прямоугольников --- */
class SpatialGrid {
  constructor(w, h, cell, rects) {
    this.cell = cell;
    this.cw = Math.ceil(w / cell) + 2;
    this.ch = Math.ceil(h / cell) + 2;
    this.buckets = new Array(this.cw * this.ch);
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      const x0 = Math.max(0, Math.floor(r.x / cell)), x1 = Math.min(this.cw - 1, Math.floor((r.x + r.w) / cell));
      const y0 = Math.max(0, Math.floor(r.y / cell)), y1 = Math.min(this.ch - 1, Math.floor((r.y + r.h) / cell));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const k = y * this.cw + x;
        (this.buckets[k] || (this.buckets[k] = [])).push(r);
      }
    }
  }
  query(x, y, w, h, out) {
    out.length = 0;
    const c = this.cell;
    const x0 = Math.max(0, Math.floor(x / c)), x1 = Math.min(this.cw - 1, Math.floor((x + w) / c));
    const y0 = Math.max(0, Math.floor(y / c)), y1 = Math.min(this.ch - 1, Math.floor((y + h) / c));
    for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
      const b = this.buckets[yy * this.cw + xx];
      if (!b) continue;
      for (let i = 0; i < b.length; i++) if (out.indexOf(b[i]) < 0) out.push(b[i]);
    }
    return out;
  }
}

/* ---------------------------------------------------------------- темы оформления */

const THEMES = {
  day:     { sky: [0x7fb6e8, 0xc9e4f7], far: 0x6d8fb5, mid: 0x4d6b8a, sun: 1, fog: 0.05, light: 1.00 },
  sunset:  { sky: [0xf2955a, 0x4a3a63], far: 0x8a5a6a, mid: 0x4a3350, sun: 1, fog: 0.10, light: 0.86 },
  night:   { sky: [0x0e1526, 0x1d2740], far: 0x1b2436, mid: 0x141a28, sun: 0, fog: 0.16, light: 0.72 },
  dawn:    { sky: [0x5d6a9c, 0xd8a9a0], far: 0x566085, mid: 0x3b4463, sun: 1, fog: 0.12, light: 0.82 },
  desert:  { sky: [0x9fc8e8, 0xf2dfae], far: 0xb59a6c, mid: 0x8a7048, sun: 1, fog: 0.08, light: 1.05 },
  indoor:  { sky: [0x1a1d24, 0x272c36], far: 0x232833, mid: 0x191d26, sun: 0, fog: 0.20, light: 0.80 },
  toxic:   { sky: [0x1d2a18, 0x3d5a2a], far: 0x2c4222, mid: 0x1e2e18, sun: 0, fog: 0.22, light: 0.78 },
};

/* ---------------------------------------------------------------- карты */

const MAPS2 = [];

/* 1. БАНАНОВАЯ АРЕНА — классика: центральная платформа, четыре здания, вышка */
MAPS2.push(mkLevel('arena', 'БАНАНОВАЯ АРЕНА', 'Центральная платформа, четыре здания, вышка', 'day', 3200, 780, L => {
  const G = 720;
  L.box(0, G + 60, L.w, 60, 'ground');
  L.box(0, G, 240, 60, 'ground');
  L.box(L.w - 240, G, 240, 60, 'ground');
  /* центральная платформа */
  L.box(1400, G - 40, 420, 40, 'metal');
  L.box(1480, G - 120, 260, 12, 'metal');
  L.plat(1440, G - 190, 340);
  /* вышка */
  L.box(600, G - 200, 26, 200, 'metal');
  L.box(700, G - 200, 26, 200, 'metal');
  L.box(590, G - 210, 150, 14, 'metal');
  L.plat(560, G - 300, 210);
  /* четыре здания */
  const hs = [[300, 700, 3], [2350, 700, 3], [860, 740, 2], [2100, 740, 2]];
  for (const [x, gy, floors] of hs) {
    L.box(x, gy, 180, (gy - (G - floors * 110)), 'brick');
    for (let f = 1; f <= floors; f++) L.plat(x + 8, G - (f - 1) * 110 - 6, 164);
    L.box(x + 70, G - 96, 44, 96, 'door');
  }
  /* ящики */
  for (let i = 0; i < 5; i++) L.box(1150 + i * 34, G - i * 22, 34, 30, 'crate');
  for (let i = 0; i < 5; i++) L.box(1980 - i * 34, G - i * 22, 34, 30, 'crate');
  L.hz(400, G, 120, 14, 'spike');
  L.hz(2700, G, 120, 14, 'spike');
  L.spawn(200, G - 10); L.spawn(L.w - 200, G - 10);
  L.spawn(1500, G - 210); L.spawn(660, G - 320);
}));

/* 2. СКЛАД — стеллажи, пандус, антресоль */
MAPS2.push(mkLevel('warehouse', 'СКЛАД', 'Стеллажи, погрузочный пандус и антресоль', 'indoor', 3000, 700, L => {
  const G = 640;
  L.box(0, G + 60, L.w, 60, 'ground');
  L.box(0, 0, 40, G + 60, 'wall');
  L.box(L.w - 40, 0, 40, G + 60, 'wall');
  /* антресоль вдоль всей карты */
  L.box(40, G - 220, 1500, 18, 'metal');
  L.box(1600, G - 300, 1100, 18, 'metal');
  L.plat(40, G - 300, 300, 'plat');
  /* стеллажи */
  for (let i = 0; i < 7; i++) {
    const x = 180 + i * 380;
    L.box(x, G, 40, 160, 'shelf');
    L.box(x + 110, G, 40, 160, 'shelf');
    L.plat(x + 40, G - 60, 70);
    L.plat(x + 40, G - 120, 70);
  }
  /* пандус */
  for (let i = 0; i < 12; i++) L.box(300 + i * 40, G - i * 16, 40, 16, 'metal');
  /* ящики */
  for (let i = 0; i < 6; i++) L.box(2500 + (i % 3) * 36, G - Math.floor(i / 3) * 32, 34, 30, 'crate');
  L.hz(1300, G, 200, 14, 'spike');
  L.spawn(120, G - 10); L.spawn(L.w - 120, G - 10);
  L.spawn(700, G - 240); L.spawn(2200, G - 320);
}));

/* 3. ВЫШКИ — вертикальный бой */
MAPS2.push(mkLevel('towers', 'ВЫШКИ', 'Четыре вышки соединены мостами', 'sunset', 2800, 900, L => {
  const G = 840;
  L.box(0, G + 60, L.w, 60, 'ground');
  L.box(0, 0, 44, G + 60, 'wall');
  L.box(L.w - 44, 0, 44, G + 60, 'wall');
  const tw = [[300, 6], [900, 8], [1600, 7], [2300, 9]];
  for (const [x, fl] of tw) {
    L.box(x - 14, G, 28, fl * 90, 'metal');
    L.box(x + 130, G, 28, fl * 90, 'metal');
    for (let f = 1; f <= fl; f++) {
      L.box(x - 20, G - f * 90, 190, 12, 'metal');
      L.plat(x - 70, G - f * 90 - 8, 110);
    }
  }
  /* мосты */
  L.box(480, G - 540, 430, 12, 'metal');
  L.box(1190, G - 630, 420, 12, 'metal');
  L.box(1900, G - 720, 410, 12, 'metal');
  L.plat(500, G - 460, 200); L.plat(1240, G - 550, 200); L.plat(1950, G - 640, 200);
  L.hz(700, G, 180, 14, 'pit'); L.hz(1400, G, 180, 14, 'pit');
  L.spawn(120, G - 10); L.spawn(L.w - 120, G - 10);
  L.spawn(960, G - 700); L.spawn(2360, G - 790);
}));

/* 4. ЯЩИКИ — лабиринт и ступенчатая пирамида */
MAPS2.push(mkLevel('crates', 'ЯЩИКИ', 'Лабиринт из ящиков и ступенчатая пирамида', 'day', 2900, 700, L => {
  const G = 660;
  L.box(0, G + 60, L.w, 60, 'ground');
  for (let i = 0; i < 34; i++) L.box(90 + i * 34, G - 34, 32, 34, 'crate');
  for (let s = 0; s < 6; s++) for (let i = 0; i < 6 - s; i++) L.box(1500 + i * 34 + s * 17, G - 34 - s * 32, 32, 34, 'crate');
  for (let s = 0; s < 6; s++) for (let i = 0; i < 6 - s; i++) L.box(2200 + i * 34 + s * 17, G - 34 - s * 32, 32, 34, 'crate');
  for (let i = 0; i < 8; i++) L.box(700 + i * 40, G - 40 - (i % 2) * 70, 40, 40, 'crate');
  L.plat(300, G - 220, 400); L.plat(1200, G - 260, 460); L.plat(2100, G - 300, 420);
  L.hz(1000, G, 140, 14, 'spike');
  L.spawn(80, G - 10); L.spawn(L.w - 80, G - 10);
  L.spawn(400, G - 240); L.spawn(1350, G - 280);
}));

/* 5. ПУСТЫНЯ — дюны, скалы, руины */
MAPS2.push(mkLevel('desert', 'ПУСТЫНЯ', 'Открытые дюны, скалы и руины, длинные прострелы', 'desert', 3600, 720, L => {
  const G = 660;
  for (let x = 0; x < L.w; x += 20) {
    const h = 50 + Math.sin(x * 0.0031) * 42 + Math.sin(x * 0.0091 + 1.4) * 22;
    L.box(x, G - h + 50, 20, h + 60, 'sand');
  }
  for (let i = 0; i < 9; i++) {
    const x = 220 + i * 380, h = 90 + (i % 3) * 55;
    L.box(x, G - 20, 70, h, 'rock');
  }
  /* руины */
  L.box(1500, G - 180, 24, 180, 'brick');
  L.box(1740, G - 180, 24, 180, 'brick');
  L.box(1490, G - 190, 290, 16, 'brick');
  L.plat(1520, G - 250, 230);
  L.box(2600, G - 150, 24, 150, 'brick');
  L.box(2820, G - 150, 24, 150, 'brick');
  L.plat(2610, G - 215, 200);
  for (let i = 0; i < 4; i++) L.box(1000 + i * 34, G - 90 - i * 22, 34, 30, 'crate');
  L.hz(600, G - 40, 160, 14, 'pit');
  L.hz(2200, G - 20, 160, 14, 'pit');
  L.spawn(120, G - 80); L.spawn(L.w - 120, G - 60);
  L.spawn(1600, G - 270);
}));

/* 6. ГОРОД — многоэтажки и улица */
MAPS2.push(mkLevel('city', 'ГОРОД', 'Улица между домами — сверху и снизу', 'night', 3400, 860, L => {
  const G = 800;
  L.box(0, G + 80, L.w, 80, 'ground');
  L.box(0, 0, 40, G + 80, 'wall');
  L.box(L.w - 40, 0, 40, G + 80, 'wall');
  const houses = [[200, 5], [900, 6], [1650, 4], [2250, 7], [2950, 5]];
  for (const [x, fl] of houses) {
    const bw = 420, bh = fl * 90;
    L.box(x, G, bw, bh, 'brick');
    for (let f = 1; f < fl; f++) L.plat(x + 12, G - f * 90 + 4, bw - 24);
    L.box(x + bw / 2 - 26, G - 96, 52, 96, 'door');
    /* карниз */
    L.box(x - 16, G - bh, bw + 32, 14, 'metal');
  }
  for (let i = 0; i < 10; i++) L.box(700 + i * 36, G - 40, 34, 30, 'crate');
  L.box(1400, G - 120, 180, 16, 'metal');
  L.plat(1380, G - 190, 220);
  L.hz(1250, G, 130, 14, 'spike');
  L.hz(2150, G, 130, 14, 'spike');
  L.spawn(100, G - 10); L.spawn(L.w - 100, G - 10);
  L.spawn(1100, G - 200); L.spawn(2500, G - 300);
}));

/* 7. БУНКЕР — коридоры в три яруса */
MAPS2.push(mkLevel('bunker', 'БУНКЕР', 'Три яруса коридоров и бетонные перегородки', 'indoor', 3200, 820, L => {
  const G = 760;
  const floors = [G, G - 220, G - 440];
  for (const fy of floors) {
    L.box(0, fy, L.w, fy === G ? 60 : 18, 'concrete');
    for (let i = 0; i < 9; i++) {
      const x = 180 + i * 340;
      L.box(x, fy - 200, 34, 200, 'concrete');
    }
  }
  L.box(0, 0, 34, G, 'wall'); L.box(L.w - 34, 0, 34, G, 'wall');
  /* лестницы между ярусами */
  for (let i = 0; i < 8; i++) L.box(600 + i * 26, G - i * 26, 26, 26, 'concrete');
  for (let i = 0; i < 8; i++) L.box(2200 - i * 26, G - 220 - i * 26, 26, 26, 'concrete');
  L.plat(1200, G - 300, 200); L.plat(2600, G - 520, 220);
  L.hz(1500, G, 200, 14, 'pit');
  L.hz(900, G - 220, 180, 14, 'pit');
  L.spawn(120, G - 10); L.spawn(L.w - 120, G - 10);
  L.spawn(1500, G - 460); L.spawn(2800, G - 240);
}));

/* 8. КРЫШИ — прыжки по крышам над пропастью */
MAPS2.push(mkLevel('rooftops', 'КРЫШИ', 'Прыжки по крышам небоскрёбов над пропастью', 'sunset', 3400, 860, L => {
  const G = 800;
  L.box(0, G + 60, 420, 60, 'roof');
  L.box(L.w - 420, G + 60, 420, 60, 'roof');
  const roofs = [[520, 640, 380], [1000, 500, 320], [1420, 620, 340], [1860, 460, 360], [2300, 600, 330], [2740, 520, 300]];
  for (const [x, y, w] of roofs) {
    L.box(x, y, w, 24, 'roof');
    L.box(x + 30, y - 90, 26, 90, 'metal');
    L.box(x + w - 56, y - 90, 26, 90, 'metal');
    L.box(x, y - 100, w, 12, 'metal');
  }
  L.plat(960, 420, 200); L.plat(2260, 480, 200);
  /* пропасть */
  L.hz(420, G + 60, 2560, 60, 'pit');
  L.spawn(120, G - 10); L.spawn(L.w - 120, G - 10);
  L.spawn(1150, 460); L.spawn(2000, 420);
}));

/* 9. ЛАБОРАТОРИЯ — комнаты, стекло, установки */
MAPS2.push(mkLevel('lab', 'ЛАБОРАТОРИЯ', 'Стерильные комнаты, стекло и реакторы', 'toxic', 3000, 740, L => {
  const G = 680;
  L.box(0, G + 60, L.w, 60, 'floor');
  L.box(0, 0, 36, G + 60, 'wall'); L.box(L.w - 36, 0, 36, G + 60, 'wall');
  for (let i = 0; i < 6; i++) {
    const x = 240 + i * 460;
    L.box(x, G, 26, 260, 'glass');
    L.box(x + 240, G, 26, 260, 'glass');
    L.box(x - 10, G - 270, 290, 14, 'metal');
    L.plat(x + 10, G - 150, 200);
  }
  L.box(0, G - 520, L.w, 16, 'metal');
  L.plat(300, G - 380, 260); L.plat(1200, G - 400, 260); L.plat(2100, G - 380, 260);
  for (let i = 0; i < 4; i++) L.box(1400 + i * 36, G - 40, 34, 30, 'barrel');
  L.hz(700, G, 160, 14, 'acid');
  L.hz(1900, G, 160, 14, 'acid');
  L.spawn(120, G - 10); L.spawn(L.w - 120, G - 10);
  L.spawn(400, G - 400); L.spawn(2200, G - 400);
}));

/* 10. ЯМА — спуск по уступам, снизу арена */
MAPS2.push(mkLevel('pit', 'ГЛУБОКАЯ ЯМА', 'Спуск по уступам в арену на дне', 'indoor', 3000, 900, L => {
  const G = 840;
  L.box(0, 0, 60, G + 60, 'wall'); L.box(L.w - 60, 0, 60, G + 60, 'wall');
  L.box(0, 140, 120, 40, 'ground');
  L.box(L.w - 120, 140, 120, 40, 'ground');
  /* уступы-спираль вниз */
  const steps = [[300, 240], [560, 360], [860, 460], [1180, 560], [1520, 640], [1860, 700]];
  for (const [x, y] of steps) { L.box(x, G - y + 100, 240, 22, 'rock'); L.plat(x + 20, G - y + 60, 180); }
  for (let i = 0; i < 12; i++) L.box(700 + i * 30, G - i * 30, 30, 30, 'crate');
  /* дно */
  L.box(0, G + 60, L.w, 60, 'ground');
  L.box(600, G, L.w - 1200, 40, 'metal');
  L.plat(700, G - 120, 400); L.plat(1800, G - 160, 400);
  L.hz(200, G + 60, L.w - 400, 20, 'pit');
  L.spawn(200, G - 10); L.spawn(L.w - 200, G - 10);
  L.spawn(900, G - 200); L.spawn(2000, G - 240);
}));

/* ---------------------------------------------------------------- коллизии */

/** Разрешить движение тела (AABB) по клеткам разрушаемого мира. */
function moveBody(a, dx, dy, L, isPlayer) {
  const res = { hitX: false, hitY: false, ground: false, ceil: false };
  const cw = DEST.cw, ch = DEST.ch;

  /* --- по X --- */
  if (dx !== 0) {
    a.x += dx;
    const cx0 = Math.floor(a.x / cw), cx1 = Math.floor((a.x + a.w - 0.001) / cw);
    const cy0 = Math.floor(a.y / ch), cy1 = Math.floor((a.y + a.h - 0.001) / ch);
    let blocker = -1;
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        if (!DEST.solid(cx, cy)) continue;
        if (dx > 0) { if (blocker < 0 || cx < blocker) blocker = cx; }
        else if (cx > blocker) blocker = cx;
      }
    }
    if (blocker >= 0) {
      a.x = dx > 0 ? blocker * cw - a.w : (blocker + 1) * cw;
      res.hitX = true;
      res.wallCell = blocker;
    }
  }

  /* --- по Y --- */
  const prevBottom = a.y + a.h;
  if (dy !== 0) {
    a.y += dy;
    const cx0 = Math.floor(a.x / cw), cx1 = Math.floor((a.x + a.w - 0.001) / cw);
    const cy0 = Math.floor(a.y / ch), cy1 = Math.floor((a.y + a.h - 0.001) / ch);
    let blocker = -1;
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        if (!DEST.solid(cx, cy)) continue;
        if (dy > 0) { if (blocker < 0 || cy < blocker) blocker = cy; }
        else if (cy > blocker) blocker = cy;
      }
    }
    if (blocker >= 0) {
      if (dy > 0) { a.y = blocker * ch - a.h; res.ground = true; }
      else a.y = (blocker + 1) * ch;
      res.hitY = true;
    }
    /* односторонние платформы: только падение сверху */
    if (dy > 0 && !res.ground) {
      const feet = a.y + a.h;
      const cyF = Math.floor(feet / ch);
      for (let cx = cx0; cx <= cx1; cx++) {
        const m = DEST.mat(cx, cyF);
        if (!m || !MAT2[m].oneWay) continue;
        if (prevBottom <= cyF * ch + 3 && feet >= cyF * ch) {
          a.y = cyF * ch - a.h; res.ground = true; res.hitY = true; break;
        }
      }
    }
  }
  return res;
}

/** Есть ли твёрдая земля под телом (для ИИ). */
function groundAhead(L, x, y, w, depth) {
  return DEST.hitBox(x, y, w, depth || 6);
}

/** Пересечение отрезка с препятствиями (для пуль). */
function raySolid(L, x0, y0, x1, y1, ignoreOneWay) {
  return DEST.ray(x0, y0, x1, y1);
}

function pointHazard(L, x, y) {
  for (let i = 0; i < L.hazards.length; i++) {
    const h = L.hazards[i];
    if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return h;
  }
  return null;
}
