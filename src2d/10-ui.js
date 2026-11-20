/* ============================================================
   10 — ИНТЕРФЕЙС (весь в пиксельном стиле)
   HUD, магазин, пауза, главное меню, конец игры, кнопки телефона
   ============================================================ */

const UI = {
  hot: [],          // кликабельные прямоугольники текущего кадра
  shopCat: 'pistol',
  shopOpen: false,
  menuTab: 0,
  toastT: 0, toastS: '',
  banner: null,
  hitMarker: 0,
  mouseOverUI: false,
  lastShopMsg: '',

  CATS: [
    { id: 'melee',   name: 'БЛИЖНИЙ БОЙ' },
    { id: 'pistol',  name: 'ПИСТОЛЕТЫ' },
    { id: 'smg',     name: 'ПП' },
    { id: 'shotgun', name: 'ДРОБОВИКИ' },
    { id: 'rifle',   name: 'ВИНТОВКИ' },
    { id: 'sniper',  name: 'СНАЙПЕРКИ' },
    { id: 'lmg',     name: 'ПУЛЕМЁТЫ' },
    { id: 'heavy',   name: 'ТЯЖЁЛОЕ' },
    { id: 'banana',  name: 'БАНАНЫ' },
    { id: 'exp',     name: 'ЭКСПЕРИМЕНТ' },
    { id: 'drill',   name: 'ИНСТРУМЕНТ' },
    { id: 'gear',    name: 'СНАРЯЖЕНИЕ' },
  ],

  clear() { this.hot.length = 0; },
  banana(ctx, x, y) {
    const g = '#f2c53d', d = '#c99b1e';
    rect(ctx, x - 10, y + 2, 26, 7, g);
    rect(ctx, x - 12, y + 4, 30, 3, g);
    rect(ctx, x - 10, y + 7, 26, 2, d);
    rect(ctx, x - 12, y + 3, 3, 5, '#6b5010');
    rect(ctx, x + 14, y + 1, 3, 5, '#6b5010');
    rect(ctx, x - 4, y + 1, 12, 2, '#ffe98a');
  },
  add(id, x, y, w, h, data) {
    this.hot.push({ id, x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), data });
  },
  hit(x, y) {
    for (let i = this.hot.length - 1; i >= 0; i--) {
      const r = this.hot[i];
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r;
    }
    return null;
  },
  toast(s) { this.toastS = s; this.toastT = 1.6; },

  /* ================================================================ HUD */
  hud(ctx, G) {
    const p = G.player;
    const W = G2.vw, H = G2.vh;
    const lowHp = p.hp < p.maxHp * 0.3;
    const pulse = lowHp ? (0.5 + 0.5 * Math.sin(G2.time * 9)) : 0;

    /* --- здоровье и броня слева снизу --- */
    const bw = 138;
    panel(ctx, 6, H - 60, bw + 42, 54, 'rgba(8,11,18,.9)', '#05070b', '#4a5670');
    text(ctx, 'HP', 14, H - 44, 12, lowHp ? '#ff5a4a' : '#e8eefa', 'left', true);
    pixBar(ctx, 36, H - 50, bw, 11, p.hp / p.maxHp,
      lowHp ? (pulse > 0.5 ? '#ff8a7a' : '#e04a3a') : (p.hp > p.maxHp * 0.6 ? '#5ad86a' : '#e8c23a'), '#1a0d10');
    text(ctx, Math.max(0, Math.ceil(p.hp)) + '/' + p.maxHp, 36 + bw + 4, H - 42, 10, '#e8eefa');
    text(ctx, 'БРОНЯ', 14, H - 24, 10, '#9fb0d0');
    pixBar(ctx, 62, H - 30, bw - 28, 7, p.armor / 100, '#5aa8ff', '#0d1520');
    text(ctx, Math.ceil(p.armor), 36 + bw + 4, H - 24, 10, '#9fc0ff');

    /* --- патроны, деньги, оружие справа снизу --- */
    const wp = WEAPONS[G.weaponId];
    const mag = Weap.ammo(G.weap, G.weaponId);
    const res = wp.mag === Infinity ? '' : (G.weap.reserve[G.weaponId] || 0);
    const pw = 168;
    panel(ctx, W - pw - 8, H - 60, pw, 54, 'rgba(8,11,18,.9)', '#05070b', '#4a5670');
    text(ctx, wp.name, W - 16, H - 44, 12, '#ffd94a', 'right', true);
    const ammoStr = mag === Infinity ? '∞' : (mag + ' / ' + res);
    text(ctx, ammoStr, W - 16, H - 22, 15, mag === 0 ? '#ff5a4a' : '#ffffff', 'right', true);
    if (G.weap.reloadT > 0) {
      const wf = 1 - G.weap.reloadT / Weap.reloadTime(G.weaponId);
      pixBar(ctx, W - pw - 2, H - 16, pw - 10, 5, wf, '#ffd94a', '#1a1408');
    }
    text(ctx, '₽ ' + Math.round(G.player.money), W - 16, H - 4, 11, '#6de06d', 'right', true);

    /* --- волна сверху слева --- */
    panel(ctx, 6, 6, 168, 40, 'rgba(8,11,18,.9)', '#05070b', '#4a5670');
    text(ctx, 'ВОЛНА ' + G.wave, 14, 24, 13, '#ffd94a', 'left', true);
    const alive = G.enemies.length;
    text(ctx, 'врагов ' + alive + '   очки ' + G.score, 14, 40, 10, '#c8d4e8');
    if (G.waveState === 'inter') {
      pixBar(ctx, 6, 48, 168, 5, 1 - G.interT / G.interMax, '#5aa8ff', '#0d1520');
    }

    /* --- карта и подсказка сверху по центру --- */
    text(ctx, G.L.name, W / 2, 20, 12, '#ffffff', 'center', true);
    if (G.hint) text(ctx, G.hint, W / 2, 36, 10, '#b8c6dc', 'center');

    /* --- кнопка магазина --- */
    if (G.waveState === 'inter' || G.mode === 'range') {
      const bx = W / 2 - 52, by = 48;
      const hov = G2.mouse.x > bx && G2.mouse.x < bx + 104 && G2.mouse.y > by && G2.mouse.y < by + 26;
      pixBtn(ctx, bx, by, 104, 26, 'МАГАЗИН  B', hov ? 'hot' : '', 12);
      this.add('shop', bx, by, 104, 26);
    }

    /* --- список убийств / всплывающие сообщения --- */
    for (let i = 0; i < G.feed.length; i++) {
      const f = G.feed[i];
      const a = clamp(f.t / 1.2, 0, 1);
      ctx.globalAlpha = a;
      text(ctx, f.s, W - 12, 62 + i * 15, 10, f.c || '#c8d4e8', 'right');
      ctx.globalAlpha = 1;
    }

    /* --- индикатор перезарядки и предупреждения --- */
    if (ammoStr === '0 / 0') text(ctx, 'НЕТ ПАТРОНОВ — СМЕНИ СТВОЛ', W / 2, H - 68, 13, '#ff5a4a', 'center', true);
    if (p.frozen > 0) text(ctx, 'ЗАМОРОЖЕН', W / 2, H - 86, 12, '#a8e8ff', 'center', true);

    /* --- прицел --- */
    this.reticle(ctx, G);

    /* --- цель --- */
    if (this.hitMarker > 0) {
      this.hitMarker -= G2.dt;
      ctx.globalAlpha = clamp(this.hitMarker * 5, 0, 1);
      const cx = G2.isMobile && Ctrl.useStick && Ctrl.aimStick ? Ctrl.aimStick.ox : G2.mouse.x;
      const cy = G2.isMobile && Ctrl.useStick && Ctrl.aimStick ? Ctrl.aimStick.oy : G2.mouse.y;
      line(ctx, cx - 6, cy - 6, cx - 2, cy - 2, 2, '#ff6a5a');
      line(ctx, cx + 6, cy - 6, cx + 2, cy - 2, 2, '#ff6a5a');
      line(ctx, cx - 6, cy + 6, cx - 2, cy + 2, 2, '#ff6a5a');
      line(ctx, cx + 6, cy + 6, cx + 2, cy + 2, 2, '#ff6a5a');
      ctx.globalAlpha = 1;
    }

    /* --- здоровье босса --- */
    const boss = G.enemies.find(e => e.boss && !e.dead);
    if (boss) {
      const w2 = Math.min(360, W - 60);
      const x2 = W / 2 - w2 / 2;
      panel(ctx, x2 - 4, H - 96, w2 + 8, 22, 'rgba(10,14,21,.86)', '#05070b', '#7a2030');
      text(ctx, boss.name, W / 2, H - 84, 10, '#ff8a8a', 'center', true);
      pixBar(ctx, x2, H - 80, w2, 6, boss.hp / boss.maxHp, '#ff3a5a', '#2a0d14');
    }

    /* --- баннер волны --- */
    if (this.banner) {
      this.banner.t -= G2.dt;
      if (this.banner.t <= 0) this.banner = null;
      else {
        const a = clamp(this.banner.t / 0.5, 0, 1) * clamp((this.banner.max - this.banner.t) / 0.25, 0, 1);
        ctx.globalAlpha = a;
        const bw2 = 320, bx2 = W / 2 - bw2 / 2;
        panel(ctx, bx2, H / 2 - 46, bw2, 56, 'rgba(8,11,18,.94)', '#05070b', '#ffd94a');
        text(ctx, this.banner.title, W / 2, H / 2 - 22, 20, '#ffd94a', 'center', true);
        text(ctx, this.banner.sub || '', W / 2, H / 2 + 0, 12, '#e8eefa', 'center');
        ctx.globalAlpha = 1;
      }
    }

    /* --- сообщение --- */
    if (this.toastT > 0) {
      this.toastT -= G2.dt;
      ctx.globalAlpha = clamp(this.toastT / 0.5, 0, 1);
      text(ctx, this.toastS, W / 2, H / 2 + 60, 12, '#ffd94a', 'center', true);
      ctx.globalAlpha = 1;
    }
  },

  reticle(ctx, G) {
    let cx, cy;
    if (G2.isMobile) {
      if (Ctrl.useStick && Ctrl.aimStick) { cx = Ctrl.aimStick.ox; cy = Ctrl.aimStick.oy; }
      else { cx = G2.vw / 2; cy = G2.vh / 2; }
    } else { cx = G2.mouse.x; cy = G2.mouse.y; }
    const sp = G.recoil * 12;
    const col = G.reloading ? '#ffd94a' : '#eaf2ff';
    const g = 4 + sp;
    rect(ctx, cx - 1, cy - 1, 2, 2, col);
    rect(ctx, cx - g - 7, cy - 1, 7, 2, col);
    rect(ctx, cx + g, cy - 1, 7, 2, col);
    rect(ctx, cx - 1, cy - g - 7, 2, 7, col);
    rect(ctx, cx - 1, cy + g, 2, 7, col);
  },

  /* ================================================================ КНОПКИ ТЕЛЕФОНА */
  touch(ctx, G) {
    if (!G2.isMobile) return;
    for (const d of BTN_DEF) {
      const b = btnPos(d);
      const st = G2.btn[d.id] ? 'down' : '';
      pixCircleBtn(ctx, b.x, b.y, b.r, d.label, st, d.id === 'fire' ? 13 : 8);
    }
    if (G2.sticks.move) drawStick(ctx, G2.sticks.move, 56, '#6fd0ff');
    if (G2.sticks.aim) drawStick(ctx, G2.sticks.aim, 50, '#ffb04a');
  },

  /* ================================================================ МАГАЗИН */
  shop(ctx, G) {
    const W = G2.vw, H = G2.vh;
    ctx.fillStyle = 'rgba(4,6,10,.86)';
    ctx.fillRect(0, 0, W, H);

    panel(ctx, 8, 8, W - 16, H - 16, 'rgba(14,19,29,.98)', '#05070b', '#5a6a8c');
    text(ctx, 'МАГАЗИН', 22, 32, 18, '#ffd94a', 'left', true);
    text(ctx, '₽ ' + Math.round(G.player.money), W - 22, 32, 15, '#6de06d', 'right', true);

    /* категории слева */
    const cx0 = 18, cy0 = 46, cw = 132, chh = 22;
    for (let i = 0; i < this.CATS.length; i++) {
      const c = this.CATS[i];
      const y = cy0 + i * (chh + 3);
      if (y + chh > H - 52) break;
      const on = this.shopCat === c.id;
      pixBtn(ctx, cx0, y, cw, chh, c.name, on ? 'down' : '', 10);
      this.add('cat', cx0, y, cw, chh, c.id);
    }

    /* список предметов */
    const lx = cx0 + cw + 12;
    const lw = W - lx - 20;
    const items = [];
    if (this.shopCat === 'gear') {
      for (const gid in GEAR) items.push({ id: gid, gear: true, w: GEAR[gid] });
    } else {
      for (const id in WEAPONS) {
        const w = WEAPONS[id];
        if (w.cat !== this.shopCat) continue;
        items.push({ id, w });
      }
    }
    const rowH = 30;
    const maxRows = Math.floor((H - cy0 - 62) / rowH);
    const start = clamp(this.shopScroll || 0, 0, Math.max(0, items.length - maxRows));
    for (let i = 0; i < maxRows; i++) {
      const it = items[start + i];
      if (!it) break;
      const y = cy0 + i * rowH;
      const w = it.w;
      const price = it.gear ? w.price : w.price;
      const owned = G.owned[it.id];
      const afford = G.player.money >= price;
      const hover = G2.mouse.x > lx && G2.mouse.x < lx + lw && G2.mouse.y > y && G2.mouse.y < y + rowH - 3;
      panel(ctx, lx, y, lw, rowH - 3,
        hover ? '#2a3448' : '#181f2c', '#0a0e15', owned ? '#2e6b3a' : '#39445c');
      if (!it.gear) {
        rect(ctx, lx + 2, y + 2, 52, rowH - 7, 'rgba(0,0,0,.24)');
        ctx.save();
        ctx.translate(lx + 6, y + rowH / 2 - 3);
        drawGunShape(ctx, w.cat, 44, it.id, true);
        ctx.restore();
      }
      text(ctx, it.gear ? w.name : w.name, lx + 60, y + 14, 11, owned ? '#8fd8a0' : '#ffffff', 'left', true);
      if (!it.gear) {
        const mag = w.mag === Infinity ? '∞' : w.mag;
        text(ctx, 'УРОН ' + (w.dmg || 0) + '  ТЕМП ' + w.rpm + '  МАГ ' + mag, lx + 60, y + 25, 9, '#9fb0c8');
      } else {
        text(ctx, 'БРОНЯ ' + w.ap + (w.helmet ? ' + ШЛЕМ' : ''), lx + 60, y + 25, 9, '#9fb0c8');
      }
      text(ctx, owned ? 'КУПЛЕНО' : '₽' + price, lx + lw - 8, y + 17, 11,
        owned ? '#6de06d' : (afford ? '#ffd94a' : '#c07a7a'), 'right', true);
      this.add('buy', lx, y, lw, rowH - 3, it);
    }
    this.shopScroll = start;
    text(ctx, 'колесо/▲▼ — прокрутка · ' + (items.length) + ' позиций', lx, H - 56, 8, '#5f6a82');

    /* кнопка «ГОТОВ» */
    const gw = 150, gx = W / 2 - gw / 2, gy = H - 44;
    pixBtn(ctx, gx, gy, gw, 30, 'В БОЙ  (ENTER)', '', 13);
    this.add('ready', gx, gy, gw, 30);
    this._shopItems = items;
    this._shopStart = start;
    this._shopMax = maxRows;
  },

  /* ================================================================ ПАУЗА */
  pause(ctx, G) {
    const W = G2.vw, H = G2.vh;
    ctx.fillStyle = 'rgba(4,6,10,.78)';
    ctx.fillRect(0, 0, W, H);
    const pw = 260, px = W / 2 - pw / 2, py = 40;
    panel(ctx, px, py, pw, H - 80, 'rgba(14,19,29,.98)', '#05070b', '#5a6a8c');
    text(ctx, 'ПАУЗА', W / 2, py + 26, 18, '#ffd94a', 'center', true);

    const items = [
      ['resume', 'ПРОДОЛЖИТЬ'],
      ['shop', 'МАГАЗИН' + (G.waveState === 'inter' ? '' : ' (между волнами)')],
      ['restart', 'НАЧАТЬ ЗАНОВО'],
      ['menu', 'ГЛАВНОЕ МЕНЮ'],
      ['sfx', 'ЗВУК: ' + (Math.round(Store2.load().settings.sfx * 100)) + '%'],
      ['aim', 'АВТОПРИЦЕЛ: ' + (G2.autoAim ? 'ВКЛ' : 'ВЫКЛ')],
      ['gore', 'КРОВЬ: ' + (Store2.load().settings.gore ? 'ВКЛ' : 'ВЫКЛ')],
      ['shake', 'ТРЯСКА: ' + (Store2.load().settings.screenShake ? 'ВКЛ' : 'ВЫКЛ')],
    ];
    let y = py + 46;
    for (const [id, label] of items) {
      const dis = (id === 'shop' && G.waveState !== 'inter' && G.mode !== 'range');
      pixBtn(ctx, px + 16, y, pw - 32, 26, label, dis ? 'off' : '', 11);
      if (!dis) this.add(id, px + 16, y, pw - 32, 26);
      y += 30;
    }
    text(ctx, 'WASD — ходьба · ПРОБЕЛ — прыжок · ЛКМ — огонь', W / 2, H - 20, 9, '#7f8ca3', 'center');
  },

  /* ================================================================ ГЛАВНОЕ МЕНЮ */
  menu(ctx, G) {
    const W = G2.vw, H = G2.vh;
    ctx.fillStyle = '#080b12';
    ctx.fillRect(0, 0, W, H);
    /* фон-полоски */
    for (let i = 0; i < 14; i++) rect(ctx, 0, i * (H / 14), W, Math.ceil(H / 14) + 1, mixCol(0x131a2a, 0x0a0e18, i / 13));

    this.banana(ctx, W / 2 - 8, 14);

    text(ctx, 'BANANA SHOOTER', W / 2, 46, 19, '#ffd94a', 'center', true);
    text(ctx, '2D · САЙД-СКРОЛЛЕР · ОФЛАЙН', W / 2, 60, 9, '#8fd8ff', 'center', true);

    /* выбор карты */
    const cw = 118, chh = 52, cols = Math.max(3, Math.min(5, Math.floor((W - 20) / (cw + 6))));
    const rows = Math.ceil(MAPS2.length / cols);
    const gx0 = Math.round(W / 2 - (cols * (cw + 6) - 6) / 2);
    const gy0 = 70;
    for (let i = 0; i < MAPS2.length; i++) {
      const c = i % cols, r = (i / cols) | 0;
      const x = gx0 + c * (cw + 6), y = gy0 + r * (chh + 5);
      const sel = G.mapIdx === i;
      const hov = G2.mouse.x > x && G2.mouse.x < x + cw && G2.mouse.y > y && G2.mouse.y < y + chh;
      panel(ctx, x, y, cw, chh, sel ? '#2a3a56' : (hov ? '#1c2434' : '#161d2b'), '#05070b', sel ? '#ffd94a' : '#39445c');
      text(ctx, MAPS2[i].name, x + cw / 2, y + 15, 9, sel ? '#ffd94a' : '#dce4f2', 'center', true);
      const words = MAPS2[i].desc.split(' ');
      let ln = '', ly = y + 28;
      for (const word of words) {
        if (ly > y + chh - 4) break;
        if ((ln + ' ' + word).length > 18) { text(ctx, ln, x + cw / 2, ly, 8, '#7f8ca3', 'center'); ly += 10; ln = word; }
        else ln = ln ? ln + ' ' + word : word;
      }
      if (ly <= y + chh - 4) text(ctx, ln, x + cw / 2, ly, 8, '#7f8ca3', 'center');
      this.add('map', x, y, cw, chh, i);
    }

    const by = gy0 + rows * (chh + 5) + 8;
    const bw = 154;
    const hovS = G2.mouse.x > W / 2 - bw - 6 && G2.mouse.x < W / 2 - 6 && G2.mouse.y > by && G2.mouse.y < by + 28;
    const hovR = G2.mouse.x > W / 2 + 6 && G2.mouse.x < W / 2 + 6 + bw && G2.mouse.y > by && G2.mouse.y < by + 28;
    pixBtn(ctx, W / 2 - bw - 6, by, bw, 28, 'ВЫЖИВАНИЕ', hovS ? 'hot' : '', 13);
    this.add('start_surv', W / 2 - bw - 6, by, bw, 28);
    pixBtn(ctx, W / 2 + 6, by, bw, 28, 'ПОЛИГОН', hovR ? 'hot' : '', 13);
    this.add('start_range', W / 2 + 6, by, bw, 28);

    const st = Store2.load();
    text(ctx, 'рекорд: волна ' + st.bestWave + ' · очки ' + st.bestScore + ' · убито ' + st.kills,
      W / 2, by + 44, 9, '#9fb0c8', 'center', true);
    text(ctx, 'между волнами открывается магазин (B) · 40+ стволов · 10 карт',
      W / 2, by + 58, 8, '#5f6a82', 'center');
  },

  /* ================================================================ КОНЕЦ ИГРЫ */
  over(ctx, G) {
    const W = G2.vw, H = G2.vh;
    ctx.fillStyle = 'rgba(20,4,8,.82)';
    ctx.fillRect(0, 0, W, H);
    const pw = 280, px = W / 2 - pw / 2;
    panel(ctx, px, 48, pw, H - 96, 'rgba(18,14,20,.98)', '#0a0508', '#8c3a4a');
    text(ctx, 'КОНЕЦ', W / 2, 82, 22, '#ff5a5a', 'center', true);
    text(ctx, 'дошёл до волны ' + G.wave, W / 2, 106, 12, '#e8eefa', 'center', true);
    text(ctx, 'очки: ' + G.score, W / 2, 126, 11, '#ffd94a', 'center');
    text(ctx, 'убито: ' + G.kills + '   голов: ' + G.stats.heads, W / 2, 142, 9, '#9fb0c8', 'center');
    const st = Store2.load();
    text(ctx, 'рекорд: волна ' + st.bestWave + ' / ' + st.bestScore + ' очков', W / 2, 158, 9, '#7f8ca3', 'center');
    let y = 180;
    pixBtn(ctx, px + 20, y, pw - 40, 28, 'ЕЩЁ РАЗ', '', 12); this.add('restart', px + 20, y, pw - 40, 28); y += 34;
    pixBtn(ctx, px + 20, y, pw - 40, 28, 'ГЛАВНОЕ МЕНЮ', '', 12); this.add('menu', px + 20, y, pw - 40, 28);
  },
};
