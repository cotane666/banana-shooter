/* ============================================================
   06 — РИСОВАНИЕ ПЕРСОНАЖЕЙ: солдат, зомби всех типов, силуэты оружия
   Процедурная векторная графика в стиле пиксель-арта: ничего не грузим.
   ============================================================ */

/** Силуэт оружия по категории. Рисуется справа от точки (0,0), длина L. */
function drawGunShape(ctx, cat, L, id, light) {
  ctx.save();
  const steel = light ? '#8f98a8' : '#3a4048', dark = light ? '#5a6272' : '#22262c',
        wood = light ? '#b8843f' : '#7a4f28', olive = light ? '#7d8a5e' : '#4a5238', gold = '#e8b23a';
  if (cat === 'drill') {
    /* корпус бура */
    rect(ctx, -1, -4, L * 0.42, 8, steel);
    rect(ctx, -1, -4, L * 0.42, 2, '#c8d2de');
    rect(ctx, -3, 3, 6, 7, dark);
    rect(ctx, L * 0.30, -5.5, L * 0.16, 11, olive);
    /* спираль-конус */
    const spin = ((G2.time * 26) | 0) % 2;
    for (let i = 0; i < 7; i++) {
      const w = 9 - i * 1.15;
      rect(ctx, L * 0.42 + i * 2.6, -w / 2, 2.7, w, (i + spin) % 2 ? '#c8d2de' : '#7d8798');
    }
    rect(ctx, L * 0.42 + 18, -1, 4, 2, '#e8f0ff');
    ctx.restore(); return;
  }
  let body = steel;
  if (cat === 'rifle' || cat === 'lmg' || cat === 'heavy') body = steel;
  if (cat === 'sniper') body = '#2f343c';
  if (cat === 'shotgun') body = '#4a3a2a';
  if (cat === 'banana') body = gold;
  if (cat === 'melee') {
    rect(ctx, 0, -1.6, L * 0.75, 3.2, '#6b7480');
    if (id === 'machete' || id === 'katana' || id === 'knightsword' || id === 'knightsword2' || id === 'knightsword3')
      rect(ctx, L * 0.45, -1.2, L * 0.85, 2.4, '#dfe6ef');
    if (id === 'axe' || id === 'megahammer' || id === 'hammer')
      rect(ctx, L * 0.62, -4.5, 6, 9, '#9aa2ac');
    if (id === 'chainsaw') { rect(ctx, L * 0.6, -3, L * 0.7, 6, '#c8503f'); }
    ctx.restore(); return;
  }
  /* ствольная коробка */
  rect(ctx, 0, -3, L * 0.5, 6, body);
  /* ствол */
  rect(ctx, L * 0.5, -1.6, L * 0.42, 3.2, body);
  /* магазин */
  if (cat === 'pistol') rect(ctx, L * 0.10, 3, 4, 7, dark);
  else rect(ctx, L * 0.28, 3, 6, 8, dark);
  /* рукоять */
  rect(ctx, -1, 2.5, 5, 7, dark);
  /* приклад */
  if (cat === 'rifle' || cat === 'sniper' || cat === 'lmg' || cat === 'shotgun' || cat === 'heavy')
    rect(ctx, -L * 0.28, -2.6, L * 0.3, 5, cat === 'shotgun' ? wood : body);
  /* оптика */
  if (cat === 'sniper') rect(ctx, L * 0.18, -7, L * 0.24, 3.4, '#1a1e24');
  if (id === 'laser' || id === 'laserCannon') rect(ctx, L * 0.5, -1.8, L * 0.2, 3.6, '#ff6a2a');
  if (id === 'minigun' || id === 'yhs') { rect(ctx, L * 0.5, -3.5, L * 0.3, 7, '#6b7480'); rect(ctx, L * 0.8, -3.5, 3, 7, '#4a5058'); }
  if (id === 'rpg' || id === 'atomicRpg' || id === 'rocketgun') { rect(ctx, L * 0.3, -5, L * 0.6, 10, '#4a5238'); }
  if (cat === 'banana') { /* банан на конце */
    ctx.beginPath(); ctx.arc(L * 0.92, -1, 5, -1.0, 1.6); ctx.lineTo(L * 0.92, 2.5); ctx.fillStyle = gold; ctx.fill();
  }
  ctx.restore();
}

/** Человекоподобная фигура. Рисуется списком прямоугольников в два прохода:
    сначала тёмный силуэт на 1px больше — получается честный пиксельный контур. */
function drawHuman(ctx, x, y, o) {
  const s = o.scale || 1;
  const face = o.face || 1;
  const walk = o.walk || 0;
  const ch = o.crouch ? 0.72 : 1;
  const H = 38 * s * ch;
  const OUT = '#0a0d14';
  const skin = o.skin || '#e0b083';
  const skinD = shade2(skin, 0.78);
  const cloth = o.cloth || '#4a7fb5';
  const clothD = shade2(cloth, 0.74);
  const pants = o.pants || '#3a4a68';
  const pantsD = shade2(pants, 0.72);
  const boot = '#22262e';
  const P = [];

  const put = (px, py, w, h, col) => P.push([px, py, w, h, col]);

  /* ноги: бедро + голень, шагают в противофазе */
  const l1 = walk, sw = Math.sin(l1) * 4.5 * s, sw2 = Math.sin(l1 + Math.PI) * 4.5 * s;
  const hipY = -H * 0.46;
  put(-4.4 * s, hipY, 3.8 * s, H * 0.25, pants);
  put(0.6 * s, hipY, 3.8 * s, H * 0.25, pantsD);
  put(-4.4 * s + sw, hipY + H * 0.23, 4.2 * s, H * 0.21, pants);
  put(0.6 * s + sw2, hipY + H * 0.23, 4.2 * s, H * 0.21, pantsD);
  const footY = hipY + H * 0.42;
  put(-5.2 * s + sw, footY, 5.6 * s, 3.4 * s, boot);
  put(-2.6 * s + sw2, footY, 5.6 * s, 3.4 * s, shade2(boot, 0.8));

  /* корпус */
  const bodyY = -H * 0.74;
  put(-5.6 * s, bodyY, 11.2 * s, H * 0.30, cloth);
  put(-5.6 * s, bodyY, 11.2 * s, 3 * s, shade2(cloth, 1.18));
  put(-6.2 * s, bodyY + H * 0.06, 12.4 * s, H * 0.16, '#2b3140');   // бронежилет
  put(-6.2 * s, bodyY + H * 0.06, 12.4 * s, 2, shade2('#2b3140', 1.35));
  put(-4.4 * s, bodyY + H * 0.24, 8.8 * s, 2.6 * s, '#1c212b');     // ремень

  /* руки: ступенчатая «лестница» к направлению прицела */
  const ax = o.aimX === undefined ? 1 : o.aimX;
  const ay = o.aimY === undefined ? 0 : o.aimY;
  const a = Math.atan2(ay, ax);
  const R = 9 * s;
  for (let i = 0; i < 3; i++) {
    const t = i / 3;
    const px = Math.cos(a) * R * t;
    const py = Math.sin(a) * R * t;
    put(px - 1.8 * s, bodyY + H * 0.10 + py - 1.8 * s, 4.4 * s, 4.4 * s, i === 2 ? skin : cloth);
  }
  /* задняя рука */
  put(-Math.cos(a) * 3 * s - 2 * s, bodyY + H * 0.14, 4 * s, 4 * s, clothD);
  put(Math.cos(a) * R * 0.8 - 2 * s, bodyY + H * 0.10 + Math.sin(a) * R * 0.8 - 2 * s, 4.2 * s, 4.2 * s, skin);

  /* голова + шлем */
  const headY = -H * 0.95;
  put(-4.2 * s, headY, 8.4 * s, 8.4 * s, skin);
  put(-4.2 * s, headY + 4.6 * s, 8.4 * s, 2 * s, skinD);
  put(1.2 * s, headY + 2.4 * s, 2.6 * s, 1.8 * s, '#1a1e24');        // глаз
  put(-5 * s, headY - 2.6 * s, 10 * s, 5 * s, o.helmet || '#41522f');
  put(-5 * s, headY - 2.6 * s, 10 * s, 1.6 * s, shade2(o.helmet || '#41522f', 1.3));
  put(4.2 * s, headY - 0.6 * s, 1.8 * s, 3 * s, shade2(o.helmet || '#41522f', 0.8));

  /* контур + заливка */
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face, 1);
  ctx.fillStyle = OUT;
  for (let i = 0; i < P.length; i++) {
    const p = P[i];
    ctx.fillRect(Math.round(p[0]) - 1, Math.round(p[1]) - 1, Math.ceil(p[2]) + 2, Math.ceil(p[3]) + 2);
  }
  for (let i = 0; i < P.length; i++) {
    const p = P[i];
    ctx.fillStyle = p[4];
    ctx.fillRect(Math.round(p[0]), Math.round(p[1]), Math.ceil(p[2]), Math.ceil(p[3]));
  }
  ctx.restore();
}

function shade2(c, f) {
  f = f || 0.78;
  if (c[0] !== '#') return c;
  const n = parseInt(c.slice(1), 16);
  const r = clamp(((n >> 16) & 255) * f, 0, 255) | 0;
  const g = clamp(((n >> 8) & 255) * f, 0, 255) | 0;
  const b = clamp((n & 255) * f, 0, 255) | 0;
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}

/** Зомби: силуэт + детали по типу. Два прохода — контур, затем заливка. */
function drawZombie(ctx, z) {
  const d = z.def || ZOMBIES[z.type] || ZOMBIES.walker;
  const s = (d.scale || 1) * (z.elite ? 1.14 : 1);
  const face = z.face || 1;
  const t = z.anim || 0;
  const OUT = '#080b10';
  const base = hex(d.color);
  const cloth = shade2(base, 0.66);
  const clothD = shade2(base, 0.50);
  const skin = shade2(base, 1.18);
  const skinD = shade2(base, 0.92);

  const big = !!d.miniBoss || !!d.boss;
  const H = 34 * s;
  const P = [];
  const put = (px, py, w, h, col) => P.push([px, py, w, h, col]);

  const l1 = t * 6.5 * (d.speed > 3 ? 1.5 : 1);
  const sw = Math.sin(l1) * 4 * s, sw2 = Math.sin(l1 + Math.PI) * 4 * s;
  const hipY = -H * 0.44;
  const low = z.type === 'crawler';

  /* ноги (у ползуна — короткие «лапы») */
  const legH = low ? H * 0.18 : H * 0.30;
  put(-4 * s, hipY, 3.6 * s, legH, cloth);
  put(0.4 * s, hipY, 3.6 * s, legH, clothD);
  put(-4.6 * s + sw, hipY + legH - 1, 4.4 * s, 3.2 * s, shade2(base, 0.55));
  put(-0.4 * s + sw2, hipY + legH - 1, 4.4 * s, 3.2 * s, shade2(base, 0.48));

  /* корпус: сутулый, у толстяка/громилы шире */
  const bodyW = (z.type === 'tank' || z.type === 'brute' || big ? 13 : 11) * s;
  const bodyH = (z.type === 'tank' ? 0.42 : 0.34) * H;
  const bodyY = -H * 0.72;
  put(-bodyW / 2, bodyY, bodyW, bodyH, cloth);
  put(-bodyW / 2, bodyY, bodyW, 2.6 * s, shade2(base, 0.86));
  /* рёбра-потёртости */
  put(-bodyW / 2 + 1.5 * s, bodyY + bodyH * 0.35, bodyW - 3 * s, 1.6 * s, clothD);
  put(-bodyW / 2 + 2.5 * s, bodyY + bodyH * 0.62, bodyW - 5 * s, 1.6 * s, clothD);

  /* руки вперёд (у летуна — как крылья-перепонки) */
  const reach = (d.flying ? 13 : 15) * s;
  const sway = Math.sin(t * 4.5) * 1.6 * s;
  put(0, bodyY + 3 * s + sway, reach, 4.6 * s, skin);
  put(reach - 2 * s, bodyY + 2 * s + sway, 4.6 * s, 5.6 * s, shade2(skin, 1.12));
  put(-3 * s, bodyY + 6 * s - sway, reach * 0.8, 4.2 * s, skinD);
  put(reach * 0.8 - 3.5 * s, bodyY + 5 * s - sway, 4.2 * s, 5 * s, skinD);

  /* голова вытянута вперёд, с открытой пастью */
  const headY = -H * 0.90;
  put(1 * s, headY, 9.5 * s, 8 * s, skin);
  put(1 * s, headY + 6 * s, 9.5 * s, 2 * s, skinD);
  put(6 * s, headY + 3.4 * s, 4 * s, 3 * s, skinD);          // челюсть
  put(7 * s, headY + 3.8 * s, 3 * s, 1.4 * s, '#2a0a0c');    // пасть
  put(3.6 * s, headY + 1.4 * s, 2.6 * s, 2.4 * s, d.brain ? '#ffd8e6' : '#f2e04a');  // глаз
  put(4.2 * s, headY + 1.8 * s, 1.2 * s, 1.4 * s, '#1a0a04'); // зрачок
  put(1 * s, headY - 1, 9.5 * s, 1.8 * s, shade2(skin, 0.7));

  /* особенности типов */
  if (z.type === 'robot') {
    put(-6 * s, bodyY + 1, 12 * s, 3 * s, '#c8d2de');
    put(-4 * s, headY - 1, 8 * s, 2 * s, '#8b95a1');
    put(3.6 * s, headY + 1.4 * s, 2.8 * s, 2.4 * s, '#ff3a2a');
  }
  if (z.type === 'shielder') {
    put(9 * s, bodyY - 1, 3 * s, H * 0.5, '#8fa4c4');
    put(9 * s, bodyY - 1, 3 * s, 2 * s, '#c8d8ee');
  }
  if (z.type === 'spitter') {
    put(-6 * s, bodyY + 4 * s, 5 * s, 5 * s, '#a8d84a');
    put(-6 * s, bodyY + 4 * s, 5 * s, 2 * s, '#ccf07a');
  }
  if (z.type === 'bomber') {
    const bl = (Math.sin(t * 12) > 0) ? '#ff5a3a' : '#8a2a1a';
    put(-4 * s, bodyY + 5 * s, 8 * s, 6 * s, bl);
    put(-2 * s, bodyY + 7 * s, 4 * s, 2 * s, '#ffd24a');
  }
  if (d.aura) {
    put(-bodyW / 2 - 1.5 * s, bodyY + bodyH * 0.2, 1.6 * s, bodyH * 0.6, hex(d.aura));
  }
  /* ранение — тёмные подтёки */
  if (z.hurtT > 0 || (z.hp < z.maxHp * 0.6)) {
    const sc = (z.hp < z.maxHp * 0.35) ? 3 : 2;
    for (let i = 0; i < sc; i++) {
      const rx = (i * 3.1 % bodyW) - bodyW / 2 + 1;
      put(rx, bodyY + (i * 4.7 % bodyH), 2.4 * s, 2.4 * s, '#7a0f18');
    }
  }

  ctx.save();
  ctx.translate(z.x + z.w / 2, z.y + z.h);
  ctx.scale(face, 1);
  if (z.hurtT > 0) ctx.globalAlpha = 0.92;
  ctx.fillStyle = OUT;
  for (let i = 0; i < P.length; i++) {
    const p = P[i];
    ctx.fillRect(Math.round(p[0]) - 1, Math.round(p[1]) - 1, Math.ceil(p[2]) + 2, Math.ceil(p[3]) + 2);
  }
  for (let i = 0; i < P.length; i++) {
    const p = P[i];
    ctx.fillStyle = p[4];
    ctx.fillRect(Math.round(p[0]), Math.round(p[1]), Math.ceil(p[2]), Math.ceil(p[3]));
  }
  /* вспышка урона */
  if (z.hurtT > 0) {
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < P.length; i++) {
      const p = P[i];
      ctx.fillRect(Math.round(p[0]), Math.round(p[1]), Math.ceil(p[2]), Math.ceil(p[3]));
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  /* аура мини-боссов */
  if (big) {
    const cx = z.x + z.w / 2, cy = z.y + z.h - H * 0.9;
    const aura = d.aura || 0xff6a2a;
    const pu = 0.5 + 0.5 * Math.sin(t * 3);
    ctx.globalAlpha = 0.30 + pu * 0.16;
    ring(ctx, cx, cy + H * 0.45, H * 0.62 + pu * 3, 2, hex(aura));
    ctx.globalAlpha = 1;
  }
}

/** Полоска здоровья над врагом. */
function drawHpBar(ctx, x, y, w, hp, maxHp, col) {
  const f = clamp(hp / maxHp, 0, 1);
  rect(ctx, x - 1, y - 1, w + 2, 5, 'rgba(0,0,0,.65)');
  rect(ctx, x, y, w * f, 3, col || (f > 0.5 ? '#6de06d' : f > 0.22 ? '#e8c23a' : '#e05a4a'));
}

/** Простой силуэт-иконка оружия для магазина (замена 3D-рендера). */
function shopWeaponIcon(ctx, id, x, y, w, h) {
  const wp = WEAPONS[id];
  if (!wp) return;
  ctx.save();
  ctx.translate(x + w * 0.18, y + h * 0.55);
  const L = w * 0.62;
  ctx.save();
  drawGunShape(ctx, wp.cat, L, id);
  ctx.restore();
  ctx.restore();
}
