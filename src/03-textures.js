/* ============================================================
   03 — PROCEDURAL TEXTURES
   ============================================================ */
function makeCanvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}
function canvasTexture(c, repeat, aniso) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (repeat) t.repeat.set(repeat, repeat);
  /* анизотропия: по умолчанию берём максимум, доступный устройству (до 16),
     чтобы «плитка» читалась резко под углом. Если передан явный aniso — берём его. */
  let a = aniso;
  if (a === undefined) a = (typeof window !== 'undefined' && window.Game && window.Game._gfxAniso) ? window.Game._gfxAniso : 8;
  t.anisotropy = a || 4;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function noiseFill(ctx, size, base, amp, step) {
  step = step || 1;
  for (let y = 0; y < size; y += step) {
    for (let x = 0; x < size; x += step) {
      const n = (Math.random() - 0.5) * amp;
      const v = U.clamp(base + n, 0, 255);
      ctx.fillStyle = 'rgb(' + v + ',' + (v * 0.99) + ',' + (v * 0.96) + ')';
      ctx.fillRect(x, y, step, step);
    }
  }
}

const TEXTURES = {};
/* a soft vertical streak used for raindrops, so rain reads as grey dashes
   instead of round dots (PointsMaterial maps it onto each point sprite) */
let _rainStreakTex = null;
function rainStreakTexture() {
  if (_rainStreakTex) return _rainStreakTex;
  const c = makeCanvas(32); c.height = 64;
  const x = c.getContext('2d');
  x.clearRect(0, 0, 32, 64);
  const g = x.createLinearGradient(0, 0, 0, 64);
  g.addColorStop(0, 'rgba(210,216,224,0)');
  g.addColorStop(.5, 'rgba(210,216,224,.95)');
  g.addColorStop(1, 'rgba(210,216,224,0)');
  x.fillStyle = g;
  x.fillRect(12, 0, 8, 64);
  _rainStreakTex = new THREE.CanvasTexture(c);
  return _rainStreakTex;
}function buildTextures() {
  /* Разрешение процедурных текстур зависит от пресета графики: на ультра —
     детальнее (512), на высокой — 384, иначе 256. Это «текстурки» из ультры. */
  let S = 256;
  try {
    if (window.Game && window.Game.activeGfxPreset) {
      const p = window.Game.activeGfxPreset();
      S = p >= 4 ? 512 : p >= 3 ? 384 : 256;
    }
  } catch (e) { }
  const rng = makeRng(1337);
  /* плотность шума масштабируем под разрешение, чтобы на ультра-текстурах
     (512) детали не «разрежались» */
  const D = (S * S) / 65536;

  /* ---- concrete ---- */
  {
    const c = makeCanvas(S), x = c.getContext('2d');
    x.fillStyle = '#7d7a70'; x.fillRect(0, 0, S, S);
    const n = Math.round(5200 * D);
    for (let i = 0; i < n; i++) {
      const v = 96 + rng() * 60;
      x.fillStyle = 'rgba(' + (v | 0) + ',' + ((v * .97) | 0) + ',' + ((v * .9) | 0) + ',' + (0.15 + rng() * .4) + ')';
      const s = (1 + rng() * 3.4) * (S / 256);
      x.fillRect(rng() * S, rng() * S, s, s);
    }
    // panel seams
    const half = S / 2;
    x.strokeStyle = 'rgba(60,58,52,.55)'; x.lineWidth = 2 * (S / 256);
    for (let i = 0; i <= 2; i++) {
      x.beginPath(); x.moveTo(0, i * half); x.lineTo(S, i * half); x.stroke();
      x.beginPath(); x.moveTo(i * half, 0); x.lineTo(i * half, S); x.stroke();
    }
    x.strokeStyle = 'rgba(190,186,175,.22)'; x.lineWidth = 1 * (S / 256);
    for (let i = 0; i <= 2; i++) { x.beginPath(); x.moveTo(0, i * half + 2); x.lineTo(S, i * half + 2); x.stroke(); }
    TEXTURES.concrete = c;
  }

  /* ---- brick ---- */
  {
    const c = makeCanvas(S), x = c.getContext('2d');
    x.fillStyle = '#6a5142'; x.fillRect(0, 0, S, S);
    const k = S / 256;
    const bh = 16 * k, bw = 42 * k;
    for (let row = 0, y = 0; y < S; y += bh, row++) {
      const off = (row % 2) ? bw / 2 : 0;
      for (let bx = -bw; bx < S + bw; bx += bw) {
        const v = 118 + rng() * 46;
        x.fillStyle = 'rgb(' + (v | 0) + ',' + ((v * .66) | 0) + ',' + ((v * .52) | 0) + ')';
        x.fillRect(bx + off + 1.5, y + 1.5, bw - 3, bh - 3);
        x.fillStyle = 'rgba(255,235,215,.09)';
        x.fillRect(bx + off + 1.5, y + 1.5, bw - 3, 2 * k);
      }
    }
    TEXTURES.brick = c;
  }

  /* ---- crate / wood ---- */
  {
    const c = makeCanvas(S), x = c.getContext('2d');
    x.fillStyle = '#a5763f'; x.fillRect(0, 0, S, S);
    const k = S / 256, ph = S / 6;
    for (let i = 0; i < 6; i++) {
      const y = i * ph;
      const v = 150 + rng() * 50;
      x.fillStyle = 'rgb(' + (v | 0) + ',' + ((v * .68) | 0) + ',' + ((v * .38) | 0) + ')';
      x.fillRect(0, y + 1, S, ph - 2);
      for (let g = 0; g < Math.round(26 * k); g++) {
        x.strokeStyle = 'rgba(90,58,26,' + (0.06 + rng() * .12) + ')'; x.lineWidth = 1;
        x.beginPath(); x.moveTo(0, y + 3 + rng() * (ph - 6));
        x.bezierCurveTo(S * .3, y + 3 + rng() * (ph - 6), S * .6, y + 3 + rng() * (ph - 6), S, y + 3 + rng() * (ph - 6));
        x.stroke();
      }
    }
    const bd = 9 * k;
    x.fillStyle = '#6e4c25';
    x.fillRect(0, 0, S, bd); x.fillRect(0, S - bd, S, bd);
    x.fillRect(0, 0, bd, S); x.fillRect(S - bd, 0, bd, S);
    x.fillStyle = 'rgba(255,220,170,.12)'; x.fillRect(0, 0, S, 3 * k);
    TEXTURES.wood = c;
  }

  /* ---- metal container ---- */
  {
    const c = makeCanvas(S), x = c.getContext('2d');
    x.fillStyle = '#4d5f70'; x.fillRect(0, 0, S, S);
    const k = S / 256, sw = S / 10;   // 10 stripes across the full texture
    for (let i = 0; i < 10; i++) {
      const v = 62 + rng() * 34;
      x.fillStyle = 'rgba(' + (v | 0) + ',' + ((v * 1.1) | 0) + ',' + ((v * 1.25) | 0) + ',.75)';
      x.fillRect(i * sw, 0, sw * .5, S);
    }
    x.fillStyle = 'rgba(20,26,32,.5)';
    for (let i = 0; i < 10; i++) x.fillRect(i * sw + sw * .5, 0, sw * .12, S);
    x.fillStyle = 'rgba(255,255,255,.07)';
    for (let i = 0; i < 10; i++) x.fillRect(i * sw - 2 * k, 0, 2 * k, S);
    // rivets
    x.fillStyle = 'rgba(200,215,230,.35)';
    for (let i = 0; i < Math.round(60 * k); i++) x.fillRect(rng() * S, 8 + Math.floor(rng() * 2) * (S * .9), 3 * k, 3 * k);
    TEXTURES.metal = c;
  }

  /* ---- sandbag ---- */
  {
    const c = makeCanvas(S), x = c.getContext('2d');
    x.fillStyle = '#a89767'; x.fillRect(0, 0, S, S);
    const n = Math.round(4200 * D);
    for (let i = 0; i < n; i++) {
      const v = 140 + rng() * 70;
      x.fillStyle = 'rgba(' + (v | 0) + ',' + ((v * .93) | 0) + ',' + ((v * .7) | 0) + ',' + (0.2 + rng() * .5) + ')';
      x.fillRect(rng() * S, rng() * S, 1 + rng() * 2, 1 + rng() * 2);
    }
    x.strokeStyle = 'rgba(110,98,64,.5)'; x.lineWidth = 3 * (S / 256);
    for (let i = 1; i < 3; i++) { x.beginPath(); x.moveTo(0, i * (S / 3)); x.lineTo(S, i * (S / 3)); x.stroke(); }
    TEXTURES.sand = c;
  }

  /* ---- tiled ground ---- */
  {
    const c = makeCanvas(S), x = c.getContext('2d');
    x.fillStyle = '#8e8a7c'; x.fillRect(0, 0, S, S);
    const n = Math.round(6000 * D);
    for (let i = 0; i < n; i++) {
      const v = 118 + rng() * 60;
      x.fillStyle = 'rgba(' + (v | 0) + ',' + ((v * .97) | 0) + ',' + ((v * .88) | 0) + ',' + (0.12 + rng() * .35) + ')';
      x.fillRect(rng() * S, rng() * S, 1 + rng() * 4, 1 + rng() * 4);
    }
    x.strokeStyle = 'rgba(64,62,56,.7)'; x.lineWidth = 3 * (S / 256);
    x.strokeRect(0, 0, S, S);
    x.strokeStyle = 'rgba(64,62,56,.35)'; x.lineWidth = 2 * (S / 256);
    x.beginPath(); x.moveTo(S / 2, 0); x.lineTo(S / 2, S); x.stroke();
    x.beginPath(); x.moveTo(0, S / 2); x.lineTo(S, S / 2); x.stroke();
    TEXTURES.floor = c;
  }

  /* ---- bomb site marker (A / B) ---- */
  ['A', 'B'].forEach(letter => {
    const c = makeCanvas(256), x = c.getContext('2d');
    x.clearRect(0, 0, 256, 256);
    x.fillStyle = 'rgba(220,60,40,.30)';
    x.beginPath();
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 - Math.PI / 2; const px = 128 + Math.cos(a) * 118, py = 128 + Math.sin(a) * 118; i ? x.lineTo(px, py) : x.moveTo(px, py); }
    x.closePath(); x.fill();
    x.strokeStyle = 'rgba(255,90,60,.85)'; x.lineWidth = 9; x.stroke();
    x.fillStyle = 'rgba(255,235,225,.92)';
    x.font = 'bold 150px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(letter, 128, 138);
    TEXTURES['site' + letter] = c;
  });

  /* ---- zombie skin ---- */
  {
    const c = makeCanvas(128), x = c.getContext('2d');
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 2600; i++) {
      const v = 130 + rng() * 110;
      x.fillStyle = 'rgba(' + (v | 0) + ',' + ((v * .95) | 0) + ',' + ((v * .85) | 0) + ',' + (0.1 + rng() * .45) + ')';
      x.fillRect(rng() * 128, rng() * 128, 1 + rng() * 3, 1 + rng() * 2);
    }
    // dark blotches / wounds
    for (let i = 0; i < 30; i++) {
      x.fillStyle = 'rgba(70,20,18,' + (0.12 + rng() * .3) + ')';
      x.beginPath(); x.arc(rng() * 128, rng() * 128, 2 + rng() * 7, 0, 7); x.fill();
    }
    TEXTURES.zombie = c;
  }

  /* ---- sky gradient ---- */
  {
    const c = makeCanvas(64), x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 64);
    g.addColorStop(0, '#5b86b8');
    g.addColorStop(0.42, '#9fb8cf');
    g.addColorStop(0.72, '#e2d3b4');
    g.addColorStop(1, '#b9a888');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    TEXTURES.sky = c;
  }

  /* ---- weapon skin (gunmetal) ---- */
  {
    const c = makeCanvas(64), x = c.getContext('2d');
    x.fillStyle = '#40444a'; x.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 900; i++) {
      const v = 50 + rng() * 40;
      x.fillStyle = 'rgba(' + (v | 0) + ',' + (v | 0) + ',' + ((v * 1.06) | 0) + ',' + (.2 + rng() * .5) + ')';
      x.fillRect(rng() * 64, rng() * 64, 1, 1 + rng() * 2);
    }
    TEXTURES.gun = c;
  }
}
