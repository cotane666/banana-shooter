/* ============================================================
   03b — РАЗРУШАЕМЫЙ МИР (как в Pixelwreck)
   Уровень растеризуется в сетку клеток 8x8. Любую клетку можно выбить
   выстрелом или взрывом; сыпучие материалы (земля, песок, дерево, ящики)
   теряют опору и осыпаются с физикой. Твёрдые (камень, металл, бетон)
   пробиваются, но не осыпаются — иначе здания рушились бы сами.
   Рендер — в offscreen-текстуру карты, перерисовываются только изменённые клетки.
   ============================================================ */

/* материалы: col — основной цвет, top — верхняя кромка, fall — осыпается,
   slide — скользит по диагонали, hard — не разрушается ничем */
const MAT2 = [
  null,
  { id: 'dirt',     col: 0x6b5238, top: 0x7ba04e, fall: true },
  { id: 'sand',     col: 0xc9ac6c, top: 0xe6cf8c, fall: true, slide: true },
  { id: 'rock',     col: 0x787265, top: 0x9a9484 },
  { id: 'brick',    col: 0x8f5650, top: 0xbe7268, fall: true },
  { id: 'concrete', col: 0x8b8b85, top: 0xb0b0aa, fall: true },
  { id: 'metal',    col: 0x7d8798, top: 0xacb6c6 },
  { id: 'glass',    col: 0x8fc9dd, top: 0xc6ecf7, glass: true, fall: true },
  { id: 'wood',     col: 0xa87a38, top: 0xd9a052, fall: true, crate: true },
  { id: 'barrel',   col: 0xa84031, top: 0xd85a46, fall: true, boom: true },
  { id: 'roof',     col: 0x5d5d66, top: 0x7f7f88, fall: true },
  { id: 'floor',    col: 0x566d78, top: 0x74929f, fall: true },
  { id: 'wall',     col: 0x4c515e, top: 0x666c7c },
  { id: 'door',     col: 0x52351c, top: 0x6f4a2c, fall: true },
  { id: 'plat',     col: 0x7d8798, top: 0xacb6c6, oneWay: true },
  { id: 'bedrock',  col: 0x2c3038, top: 0x3a3f4a, hard: true },
];
const M2 = {};
for (let i = 1; i < MAT2.length; i++) M2[MAT2[i].id] = i;

const KIND_MAT = {
  ground: M2.dirt, sand: M2.sand, rock: M2.rock, metal: M2.metal, brick: M2.brick,
  concrete: M2.concrete, glass: M2.glass, shelf: M2.wood, crate: M2.wood, barrel: M2.barrel,
  roof: M2.roof, floor: M2.floor, wall: M2.wall, door: M2.door, plat: M2.plat,
};

const DEST = {
  cw: 8, ch: 8, cols: 0, rows: 0, w: 0, h: 0,
  cells: null, nflag: null,
  alist: [], nlist: [],
  tex: null, tctx: null,
  dirty: true,
  moves: 0,
  carved: 0,

  build(L) {
    /* клетки считаем сразу для всех карт (это дёшево), а тяжёлую текстуру —
       только для активной: attach() */
    const r = this.rasterize(L);
    L.destCells = r.cells;
    L.destCols = r.cols;
    L.destRows = r.rows;
  },

  rasterize(L) {
    const cw = this.cw, ch = this.ch;
    const cols = Math.ceil(L.w / cw) + 1;
    const rows = Math.ceil(L.h / ch) + 1;
    const cells = new Uint8Array(cols * rows);
    for (const r of L.rects) {
      const m = KIND_MAT[r.kind] || M2.dirt;
      const x0 = Math.max(0, Math.floor(r.x / cw));
      const x1 = Math.min(cols - 1, Math.floor((r.x + r.w - 1) / cw));
      const y0 = Math.max(0, Math.floor(r.y / ch));
      const y1 = Math.min(rows - 1, Math.floor((r.y + r.h - 1) / ch));
      for (let cy = y0; cy <= y1; cy++) {
        const row = cy * cols;
        for (let cx = x0; cx <= x1; cx++) cells[row + cx] = m;
      }
    }
    for (let cx = 0; cx < cols; cx++) { cells[cx] = M2.bedrock; cells[(rows - 1) * cols + cx] = M2.bedrock; }
    for (let cy = 0; cy < rows; cy++) { cells[cy * cols] = M2.bedrock; cells[cy * cols + cols - 1] = M2.bedrock; }
    return { cells, cols, rows };
  },

  /** Подключить карту к симуляции (вызывается при старте забега). */
  attach(L) {
    this.w = L.w; this.h = L.h;
    this.cols = L.destCols; this.rows = L.destRows;
    const n = this.cols * this.rows;
    this.cells = new Uint8Array(n);
    this.cells.set(L.destCells);
    this.nflag = new Uint8Array(n);
    this.alist = []; this.nlist = [];
    this.moves = 0; this.carved = 0; this.sweepRow = 0;

    this.tex = document.createElement('canvas');
    this.tex.width = L.w; this.tex.height = L.h;
    this.tctx = this.tex.getContext('2d');
    this.tctx.clearRect(0, 0, L.w, L.h);
    for (let cy = 0; cy < this.rows; cy++) for (let cx = 0; cx < this.cols; cx++) {
      if (this.cells[cy * this.cols + cx]) this._paintCell(cx, cy);
    }
    this.dirty = true;
  },

  _paintCell(cx, cy) {
    const c = this.tctx, k = cy * this.cols + cx, m = this.cells[k];
    const x = cx * this.cw, y = cy * this.ch, W = this.cw, H = this.ch;
    c.clearRect(x, y, W, H);
    if (!m) return;
    const mat = MAT2[m];
    let s = (cx * 7919 + cy * 104729) & 0xffff;
    const sh = 0.86 + ((s >> 3) & 7) * 0.04;
    c.fillStyle = shadeRGB(mat.col, sh);
    c.fillRect(x, y, W, H);

    const up = cy > 0 ? this.cells[k - this.cols] : 1;
    const dn = cy < this.rows - 1 ? this.cells[k + this.cols] : 1;
    const lf = cx > 0 ? this.cells[k - 1] : 1;
    const rt = cx < this.cols - 1 ? this.cells[k + 1] : 1;

    /* верхняя кромка */
    if (!up) {
      c.fillStyle = shadeRGB(mat.top, sh);
      c.fillRect(x, y, W, 3);
      c.fillStyle = shadeRGB(mat.top, sh * 1.2);
      c.fillRect(x, y, W, 1);
    }

    /* фактура по материалу */
    switch (mat.id) {
      case 'brick':
        c.fillStyle = shadeRGB(mat.col, sh * 0.62);
        c.fillRect(x, y + 3, W, 1);
        c.fillRect(x + ((cy & 1) ? 0 : 4), y, 1, 3);
        c.fillRect(x + ((cy & 1) ? 4 : 0), y + 4, 1, 4);
        c.fillStyle = shadeRGB(mat.col, sh * 1.14);
        c.fillRect(x, y + 4, W, 1);
        break;
      case 'metal':
        c.fillStyle = shadeRGB(mat.col, sh * 1.35);
        c.fillRect(x + 1, y + 1, W - 2, 1);
        c.fillStyle = shadeRGB(mat.col, sh * 0.6);
        c.fillRect(x, y + H - 2, W, 1);
        if (((cx + cy) & 1) === 0) { c.fillStyle = shadeRGB(mat.col, sh * 0.7); c.fillRect(x + 1, y + 4, 2, 2); }
        break;
      case 'plat':
        c.fillStyle = shadeRGB(mat.top, sh * 1.1);
        c.fillRect(x, y, W, 2);
        c.fillStyle = shadeRGB(mat.col, sh * 0.6);
        c.fillRect(x, y + H - 3, W, 3);
        break;
      case 'wood':
        c.fillStyle = shadeRGB(mat.col, sh * 0.66);
        c.fillRect(x, y + 2, W, 1);
        c.fillRect(x, y + 6, W, 1);
        c.fillRect(x + ((s >> 5) & 3), y, 1, 2);
        if (mat.crate) {
          c.fillStyle = shadeRGB(mat.top, sh * 1.15);
          c.fillRect(x, y, W, 1);
        }
        break;
      case 'glass':
        c.fillStyle = 'rgba(255,255,255,.42)';
        c.fillRect(x + 1, y + 1, W - 3, 1);
        c.fillRect(x + 1, y + 2, 2, 1);
        c.fillStyle = 'rgba(190,235,255,.30)';
        c.fillRect(x + W - 3, y + 3, 1, H - 5);
        break;
      case 'rock':
        c.fillStyle = shadeRGB(mat.col, sh * 0.78);
        c.fillRect(x + 1, y + ((s >> 4) & 3) + 3, 4, 2);
        c.fillStyle = shadeRGB(mat.col, sh * 1.16);
        c.fillRect(x + 4, y + ((s >> 7) & 3) + 1, 3, 2);
        break;
      case 'concrete':
        c.fillStyle = shadeRGB(mat.col, sh * 0.8);
        c.fillRect(x + ((s >> 3) & 5), y + ((s >> 6) & 5), 2, 1);
        if ((s & 15) === 0) { c.fillRect(x, y + 4, W, 1); }
        c.fillStyle = shadeRGB(mat.col, sh * 1.1);
        c.fillRect(x + ((s >> 9) & 5), y + ((s >> 11) & 5), 1, 1);
        break;
      case 'sand':
        c.fillStyle = shadeRGB(mat.col, sh * 1.14);
        c.fillRect(x + ((s >> 3) & 5), y + ((s >> 6) & 5), 1, 1);
        c.fillStyle = shadeRGB(mat.col, sh * 0.86);
        c.fillRect(x + ((s >> 9) & 5), y + ((s >> 11) & 5), 1, 1);
        break;
      case 'dirt':
        c.fillStyle = shadeRGB(mat.col, sh * 0.78);
        c.fillRect(x + ((s >> 3) & 5), y + ((s >> 6) & 4), 2, 1);
        if ((s & 7) === 0) { c.fillStyle = shadeRGB(mat.col, sh * 1.2); c.fillRect(x + ((s >> 9) & 5), y + 4, 1, 2); }
        break;
      case 'barrel':
        c.fillStyle = '#e8c23a';
        c.fillRect(x, y + 3, W, 2);
        c.fillStyle = shadeRGB(mat.col, sh * 1.3);
        c.fillRect(x + 1, y + 1, W - 2, 1);
        break;
      case 'roof':
        c.fillStyle = shadeRGB(mat.col, sh * 0.74);
        c.fillRect(x, y + 2, 4, 1);
        c.fillRect(x + 4, y + 5, 4, 1);
        break;
      case 'floor':
        c.fillStyle = shadeRGB(mat.col, sh * 0.74);
        c.fillRect(x, y + 4, W, 1);
        c.fillRect(x + 4, y, 1, H);
        break;
      case 'wall':
        c.fillStyle = shadeRGB(mat.col, sh * 0.78);
        c.fillRect(x + 3, y, 1, H);
        break;
      case 'door':
        c.fillStyle = shadeRGB(mat.col, sh * 0.7);
        c.fillRect(x + 2, y, 1, H);
        c.fillRect(x + 5, y, 1, H);
        break;
      case 'bedrock':
        c.fillStyle = shadeRGB(mat.col, sh * 0.7);
        c.fillRect(x + ((s >> 4) & 5), y + ((s >> 7) & 5), 3, 3);
        break;
    }

    /* затенение открытых краёв — воронки выглядят объёмно */
    c.fillStyle = 'rgba(0,0,0,.34)';
    if (!lf) c.fillRect(x, y, 1, H);
    if (!rt) c.fillRect(x + W - 1, y, 1, H);
    if (!dn) c.fillRect(x, y + H - 1, W, 1);
    if (!up) c.fillStyle = 'rgba(255,255,255,.06)';
    if (!up) c.fillRect(x + 1, y + 3, W - 2, 1);
  },

  _repaintArea(cx0, cy0, cx1, cy1) {
    for (let cy = Math.max(0, cy0 - 1); cy <= Math.min(this.rows - 1, cy1 + 1); cy++)
      for (let cx = Math.max(0, cx0 - 1); cx <= Math.min(this.cols - 1, cx1 + 1); cx++)
        this._paintCell(cx, cy);
  },

  /* ---------------- доступ ---------------- */
  mat(cx, cy) {
    if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) return M2.bedrock;
    return this.cells[cy * this.cols + cx];
  },
  solid(cx, cy) {
    const m = this.mat(cx, cy);
    return m !== 0 && !MAT2[m].oneWay;
  },
  solidAny(cx, cy) { return this.mat(cx, cy) !== 0; },
  solidPx(x, y) {
    return this.solid(Math.floor(x / this.cw), Math.floor(y / this.ch));
  },

  /** Есть ли твёрдые клетки в прямоугольнике. */
  hitBox(x, y, w, h) {
    const cx0 = Math.floor(x / this.cw), cx1 = Math.floor((x + w - 0.001) / this.cw);
    const cy0 = Math.floor(y / this.ch), cy1 = Math.floor((y + h - 0.001) / this.ch);
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      if (this.solid(cx, cy)) return true;
    }
    return false;
  },

  /* ---------------- активация ---------------- */
  wake(cx, cy) {
    if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) return;
    const k = cy * this.cols + cx;
    if (this.nflag[k]) return;
    this.nflag[k] = 1;
    this.nlist.push(k);
    /* соседи тоже должны пересчитаться */
    this._wakeRaw(cx - 1, cy); this._wakeRaw(cx + 1, cy);
    this._wakeRaw(cx, cy - 1); this._wakeRaw(cx, cy + 1);
  },
  _wakeRaw(cx, cy) {
    if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) return;
    const k = cy * this.cols + cx;
    if (this.nflag[k]) return;
    this.nflag[k] = 1;
    this.nlist.push(k);
  },

  /* ---------------- разрушение ---------------- */
  /** Выбить круг радиусом r (в пикселях). Возвращает число уничтоженных клеток. */
  carve(x, y, r, power) {
    const cw = this.cw, ch = this.ch;
    const cx0 = Math.max(1, Math.floor((x - r) / cw)), cx1 = Math.min(this.cols - 2, Math.ceil((x + r) / cw));
    const cy0 = Math.max(1, Math.floor((y - r) / ch)), cy1 = Math.min(this.rows - 2, Math.ceil((y + r) / ch));
    const r2 = r * r;
    let n = 0;
    for (let cy = cy0; cy <= cy1; cy++) {
      const dy = cy * ch + ch / 2 - y;
      const row = cy * this.cols;
      for (let cx = cx0; cx <= cx1; cx++) {
        const dx = cx * cw + cw / 2 - x;
        const d2 = dx * dx + dy * dy;
        if (d2 > r2) continue;
        const m = this.cells[row + cx];
        if (!m || MAT2[m].hard) continue;
        const f = 1 - Math.sqrt(d2) / r;
        if (power !== undefined && power < 1 && Math.random() > f * power) continue;
        this.cells[row + cx] = 0;
        n++;
        this.wake(cx, cy);
      }
    }
    if (n) {
      this._repaintArea(cx0, cy0, cx1, cy1);
      this.carved += n;
      /* разбудить широкую область: без этого острова остаются висеть в воздухе */
      this._wakeRect(cx0 - 3, cy0 - 3, cx1 + 3, cy1 + 3);
    }
    return n;
  },

  _wakeRect(x0, y0, x1, y1) {
    for (let cy = Math.max(0, y0); cy <= Math.min(this.rows - 1, y1); cy++)
      for (let cx = Math.max(0, x0); cx <= Math.min(this.cols - 1, x1); cx++)
        this._wakeRaw(cx, cy);
  },

  /** Пробить маленькую дырку от пули. */
  carveBullet(x, y, r) {
    return this.carve(x, y, r === undefined ? 4 : r, 1);
  },

  /* ---------------- падение сыпучих ---------------- */
  /** Постепенный обход карты: любая клетка без опоры гарантированно проснётся. */
  sweep() {
    const per = Math.max(1, Math.ceil(this.rows / 40));
    for (let r = 0; r < per; r++) {
      const cy = this.sweepRow;
      this.sweepRow = (this.sweepRow + 1) % this.rows;
      if (cy + 1 >= this.rows) continue;
      const row = cy * this.cols;
      const below = row + this.cols;
      for (let cx = 1; cx < this.cols - 1; cx++) {
        const m = this.cells[row + cx];
        if (!m || !MAT2[m].fall) continue;
        if (this.cells[below + cx] === 0) this._wakeRaw(cx, cy);
      }
    }
  },

  step() {
    this.sweep();
    const cur = this.alist;
    this.alist = this.nlist; this.nlist = cur;
    this.nlist.length = 0;
    this.nflag.fill(0);
    this.moves = 0;

    const cols = this.cols, cells = this.cells;
    let tx0 = 1e9, ty0 = 1e9, tx1 = -1, ty1 = -1;
    const LIMIT = 20000;
    let i = 0;
    const n = this.alist.length;

    for (; i < n; i++) {
      if (this.moves > LIMIT) break;
      const k = this.alist[i];
      const m = cells[k];
      if (!m) continue;
      const mat = MAT2[m];
      if (!mat.fall) continue;
      const cy = (k / cols) | 0, cx = k - cy * cols;
      if (cy + 1 >= this.rows) continue;
      const below = k + cols;

      let did = false;
      if (cells[below] === 0) { this._swap(k, below, cx, cy); did = true; }
      else if (mat.slide) {
        const d = Math.random() < 0.5 ? -1 : 1;
        did = this._trySlide(k, cx, cy, d) || this._trySlide(k, cx, cy, -d);
      }
      if (did) {
        this.moves++;
        if (cx - 2 < tx0) tx0 = cx - 2;
        if (cx + 2 > tx1) tx1 = cx + 2;
        if (cy - 2 < ty0) ty0 = cy - 2;
        if (cy + 2 > ty1) ty1 = cy + 2;
      }
    }
    /* если не успели всё за кадр — остаток обрабатываем в следующем */
    if (i < n) {
      for (let j = i; j < n; j++) {
        const k2 = this.alist[j];
        if (this.nflag[k2]) continue;
        this.nflag[k2] = 1;
        this.nlist.push(k2);
      }
    }
    if (tx1 >= 0) this._repaintArea(tx0, ty0, tx1, ty1);
  },

  _trySlide(k, cx, cy, d) {
    const nx = cx + d;
    if (nx < 1 || nx >= this.cols - 1) return false;
    const j = k + d;
    const jb = j + this.cols;
    if (this.cells[jb] !== 0 || this.cells[j] !== 0) return false;
    this._swap(k, jb, cx, cy);
    return true;
  },

  _swap(a, b, cx, cy) {
    const m = this.cells[a];
    const m2 = this.cells[b];
    this.cells[b] = m;
    this.cells[a] = m2;
    const by = (b / this.cols) | 0, bx = b - by * this.cols;
    this._wakeRaw(bx - 1, by); this._wakeRaw(bx + 1, by);
    this._wakeRaw(bx, by - 1); this._wakeRaw(bx, by + 1);
    this._wakeRaw(bx, by);
    this.wake(cx, cy);
  },

  /* ---------------- луч по клеткам ---------------- */
  ray(x0, y0, x1, y1) {
    const steps = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 4));
    const dx = (x1 - x0) / steps, dy = (y1 - y0) / steps;
    let px = x0, py = y0;
    for (let s = 1; s <= steps; s++) {
      px += dx; py += dy;
      const cx = Math.floor(px / this.cw), cy = Math.floor(py / this.ch);
      const m = this.mat(cx, cy);
      if (m !== 0 && !MAT2[m].oneWay) return { x: px, y: py, cx, cy, m };
    }
    return null;
  },

  /* ---------------- отрисовка ---------------- */
  draw(ctx, camL, camT, camW, camH) {
    const sx = Math.max(0, Math.floor(camL)), sy = Math.max(0, Math.floor(camT));
    const ex = Math.min(this.w, Math.ceil(camL + camW)), ey = Math.min(this.h, Math.ceil(camT + camH));
    if (ex <= sx || ey <= sy) return;
    ctx.drawImage(this.tex, sx, sy, ex - sx, ey - sy, sx, sy, ex - sx, ey - sy);
  },
};
