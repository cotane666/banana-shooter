/* ============================================================
   10 — UI: screens, HUD, buy menu, scoreboard, minimap, feed
   ============================================================ */
const $ = id => document.getElementById(id);
const UI = {
  el: {},
  current: 'loading',
  _toastT: [],
  _centerT: 0,
  _msgQueue: [],

  init() {
    const ids = ['loading', 'loadTxt', 'menu', 'menuStats', 'controls', 'lobby', 'lobbyMain', 'lobbyStatus',
      'hud', 'crosshair', 'hitmark', 'scope', 'hpFill', 'hpVal', 'apFill', 'apVal', 'ammoMag', 'ammoRes',
      'weaponName', 'money', 'roundTimer', 'objective', 'netInfo', 'killCount', 'scoreVal', 'minimap',
      'feed', 'centerMsg', 'dmgFlash', 'lowhp', 'buy', 'buyMoney', 'buyTimer', 'buyCats', 'buyGrid',
      'buyHint', 'buyOwned', 'btnBuySkip', 'btnBuyClose', 'scoreboard', 'sbTitle', 'sbTable', 'pause', 'toast', 'fps', 'clickToPlay',
      'connect', 'connTitle', 'connStatus', 'joinRow', 'hostRow', 'roomCode', 'waiting', 'inName', 'inCode',
      'btnCopy', 'dmgDirs'];
    ids.forEach(i => this.el[i] = $(i));
    this.buildBuyCats();
  },

  /* ---------------- screens ---------------- */
  show(name) {
    ['loading', 'menu', 'controls', 'lobby', 'hud', 'buy', 'scoreboard', 'pause', 'connect', 'clickToPlay'].forEach(s => {
      const e = this.el[s];
      if (!e) return;
      const on = s === name;
      e.classList.toggle('hidden', !on);
    });
    this.current = name;
  },
  hideOverlays() {
    ['buy', 'scoreboard', 'pause', 'controls', 'lobby', 'menu', 'connect'].forEach(s => {
      if (this.el[s]) this.el[s].classList.add('hidden');
    });
  },
  overlayOpen() {
    return ['buy', 'scoreboard', 'pause', 'controls', 'lobby', 'menu', 'connect'].some(s => this.el[s] && !this.el[s].classList.contains('hidden'));
  },
  loading(pct, txt) {
    const bar = document.querySelector('#loading .load-bar i');
    if (bar) bar.style.width = U.clamp(pct, 0, 100) + '%';
    if (txt && this.el.loadTxt) this.el.loadTxt.textContent = txt;
  },

  /* ---------------- toast + centre messages ---------------- */
  toast(text, color) {
    const d = document.createElement('div');
    d.textContent = text;
    if (color) d.style.borderLeftColor = color;
    this.el.toast.appendChild(d);
    setTimeout(() => { d.style.transition = 'opacity .3s'; d.style.opacity = '0'; }, 1700);
    setTimeout(() => d.remove(), 2100);
    while (this.el.toast.children.length > 5) this.el.toast.firstChild.remove();
  },
  center(text, sub, dur) {
    const e = this.el.centerMsg;
    e.innerHTML = U.esc(text) + (sub ? '<small>' + U.esc(sub) + '</small>' : '');
    e.classList.add('on');
    this._centerT = (dur || 2.0);
  },
  feed(html) {
    const d = document.createElement('div');
    d.innerHTML = html;
    this.el.feed.appendChild(d);
    setTimeout(() => { d.style.transition = 'opacity .4s'; d.style.opacity = '0'; }, 4200);
    setTimeout(() => d.remove(), 4800);
    while (this.el.feed.children.length > 6) this.el.feed.firstChild.remove();
  },

  /* ---------------- HUD ---------------- */
  hitmark(kill) {
    const h = this.el.hitmark;
    h.classList.remove('on', 'kill');
    void h.offsetWidth;
    if (kill) h.classList.add('kill');
    h.classList.add('on');
    clearTimeout(this._hmT);
    this._hmT = setTimeout(() => h.classList.remove('on'), kill ? 220 : 110);
  },
  dmgFlash() {
    const e = this.el.dmgFlash;
    e.style.transition = 'none'; e.style.opacity = '.9';
    requestAnimationFrame(() => { e.style.transition = 'opacity .45s'; e.style.opacity = '0'; });
  },
  damageDirection(angle) {
    const wrap = document.createElement('div');
    wrap.className = 'dmgdir';
    wrap.style.transform = 'rotate(' + (angle * 180 / Math.PI) + 'deg)';
    wrap.innerHTML = '<i></i>';
    (this.el.dmgDirs || document.body).appendChild(wrap);
    setTimeout(() => wrap.remove(), 1200);
  },
  lowHP(on) { this.el.lowhp.style.display = on ? 'block' : 'none'; },

  updateHUD(p, mode, extra) {
    const e = this.el;
    if (!e.hud || e.hud.classList.contains('hidden')) return;
    // health / armor
    const hp = U.clamp(p.health, 0, 100);
    e.hpFill.style.transform = 'scaleX(' + (hp / 100) + ')';
    e.hpVal.textContent = Math.max(0, Math.round(p.health));
    e.hpFill.parentElement.classList.toggle('low', hp <= 35);
    e.apFill.style.transform = 'scaleX(' + (U.clamp(p.armor, 0, 100) / 100) + ')';
    e.apVal.textContent = Math.round(p.armor);
    this.lowHP(hp > 0 && hp <= 32);

    // ammo
    const w = p.weapon;
    if (w) {
      const def = WEAPONS[w.id];
      e.ammoMag.textContent = w.mag === Infinity ? '∞' : Math.max(0, w.mag);
      e.ammoRes.textContent = w.id === 'knife' ? '' : '/ ' + (w.reserve === Infinity ? '∞' : Math.max(0, w.reserve));
      e.weaponName.textContent = def.name;
      e.ammoMag.style.color = (w.mag !== Infinity && w.mag <= Math.max(2, def.mag * .2)) ? '#e05141' : '#fff';
    }
    // money / kills / score
    e.money.textContent = U.money(p.money);
    e.killCount.textContent = mode === 'online' ? p.kills : p.zombieKills;
    e.scoreVal.textContent = mode === 'online' ? p.score : p.score;

    if (extra) {
      if (extra.timer !== undefined) {
        e.roundTimer.textContent = U.time(extra.timer);
        e.roundTimer.classList.toggle('urgent', extra.timer <= 10.5);
      }
      if (extra.objective !== undefined) e.objective.textContent = extra.objective;
      if (extra.ping !== undefined) {
        e.netInfo.classList.remove('hidden');
        e.netInfo.textContent = 'PING ' + Math.round(extra.ping) + 'мс · ' + (extra.role || '');
      }
    }
  },

  crosshairState(aiming, onEnemy) {
    const e = this.el.crosshair;
    e.classList.toggle('hide', aiming);
    e.classList.toggle('enemy', !!onEnemy && !aiming);
  },
  scope(on) { this.el.scope.classList.toggle('hidden', !on); },

  /* dynamic crosshair gap */
  setCrosshairSpread(px) {
    const e = this.el.crosshair;
    if (!e) return;
    const g = U.clamp(px, 0, 26);
    e.querySelector('.t').style.transform = 'translateY(' + (-g) + 'px)';
    e.querySelector('.b').style.transform = 'translateY(' + g + 'px)';
    e.querySelector('.l').style.transform = 'translateX(' + (-g) + 'px)';
    e.querySelector('.r').style.transform = 'translateX(' + g + 'px)';
  },

  /* ---------------- buy menu ---------------- */
  buyCat: 'rifle',
  buildBuyCats() {
    const wrap = this.el.buyCats;
    if (!wrap) return;
    wrap.innerHTML = '';
    BUY_CATS.forEach(c => {
      const b = document.createElement('button');
      b.textContent = c.label;
      b.dataset.cat = c.id;
      b.addEventListener('click', () => { this.buyCat = c.id; UI.renderBuy(); Audio3D_SFX.uiClick(); });
      wrap.appendChild(b);
    });
  },
  renderBuy(player, secondsLeft) {
    const wrap = this.el.buyGrid;
    if (!wrap) return;
    this.el.buyMoney.textContent = U.money(player.money);
    this.el.buyTimer.textContent = Math.max(0, Math.ceil(secondsLeft));
    Array.from(this.el.buyCats.children).forEach(b => b.classList.toggle('on', b.dataset.cat === this.buyCat));

    wrap.innerHTML = '';
    let n = 0;
    const mkCard = (id, name, desc, price, stats, owned, cant, onClick) => {
      n++;
      const d = document.createElement('div');
      d.className = 'bcard' + (cant ? ' cant' : '') + (owned ? ' own' : '');
      d.innerHTML = '<span class="num">' + (n <= 9 ? n : '') + '</span>' +
        '<div class="wn">' + U.esc(name) + '</div>' +
        '<div class="wd">' + U.esc(desc) + '</div>' +
        '<div class="wst">' + stats.map(s => '<span>' + s[0] + ' <i>' + s[1] + '</i></span>').join('') + '</div>' +
        (owned ? '<div class="pr">КУПЛЕНО</div>' : '<div class="pr">$' + price + '</div>');
      d.addEventListener('click', () => { if (!cant && !owned) onClick(); else if (!owned) { Audio3D_SFX.deny(); UI.toast('Недостаточно денег'); } });
      wrap.appendChild(d);
    };

    if (this.buyCat === 'gear') {
      Object.keys(GEAR).forEach(gid => {
        const g = GEAR[gid];
        const owned = (gid === 'kevlar' && player.armor >= 100 && !player.helmet) || (gid === 'kevlarHelmet' && player.armor >= 100 && player.helmet);
        mkCard(gid, g.name, g.helmet ? 'Броня + защита головы' : 'Защита корпуса', g.price,
          [['AP', '100'], ['ШЛЕМ', g.helmet ? 'ДА' : 'НЕТ']],
          owned, player.money < g.price,
          () => Bus.emit('buyGear', gid));
      });
    } else {
      const defs = Object.keys(WEAPONS).filter(k => WEAPONS[k].cat === this.buyCat && WEAPONS[k].price > 0);
      defs.sort((a, b) => WEAPONS[a].price - WEAPONS[b].price);
      defs.forEach(id => {
        const w = WEAPONS[id];
        const owned = player.has(id);
        const rpm = Math.round(w.rpm);
        const stats = [['УРОН', w.dmg], ['ТЕМП', rpm]];
        if (w.mag !== Infinity) stats.push(['МАГ', w.mag]);
        if (w.pellets) stats.push(['ДРОБЬ', w.pellets]);
        mkCard(id, w.name, w.cat.toUpperCase(), w.price, stats, owned, player.money < w.price,
          () => Bus.emit('buy', id));
      });
    }
    this.el.buyOwned.textContent = this.ownedList(player);
    if (typeof Game !== 'undefined' && Game.refreshSkipUI) Game.refreshSkipUI();
  },
  ownedList(p) {
    const a = [];
    if (p.inv[2]) a.push(WEAPONS[p.inv[2].id].name);
    if (p.inv[1]) a.push(WEAPONS[p.inv[1].id].name);
    let s = 'В руках: ' + (a.length ? a.join(' + ') : 'нож');
    if (p.armor > 0) s += ' · броня ' + Math.round(p.armor) + (p.helmet ? '+шлем' : '');
    return s;
  },

  /* ---------------- minimap ---------------- */
  drawMinimap(game) {
    const cv = this.el.minimap, ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    const size = MAP.size / 2 + 6;
    const p = game.player;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(10,14,18,.72)';
    ctx.fillRect(0, 0, W, H);
    // north indicator
    const tx = (x) => (x + size) / (size * 2) * W;
    const tz = (z) => (z + size) / (size * 2) * H;

    // buildings/cover summary: use nav obstacles (coarse)
    const nav = MAP.nav;
    if (nav) {
      const cw = W / nav.W, ch = H / nav.H;
      ctx.fillStyle = 'rgba(120,140,160,.16)';
      const step = 2;
      for (let gz = 0; gz < nav.H; gz += step) {
        for (let gx = 0; gx < nav.W; gx += step) {
          const i = gz * nav.W + gx;
          if (nav.walk[i]) continue;
          ctx.fillRect(gx * (W / nav.W), gz * (H / nav.H), (W / nav.W) * step, (H / nav.H) * step);
        }
      }
    }
    // sites
    ctx.strokeStyle = 'rgba(255,90,60,.55)'; ctx.lineWidth = 2;
    Object.keys(MAP.sites).forEach(k => {
      const s = MAP.sites[k];
      ctx.beginPath(); ctx.arc(tx(s.x), tz(s.z), 11, 0, 7); ctx.stroke();
      ctx.fillStyle = 'rgba(255,140,110,.8)'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
      ctx.fillText(k, tx(s.x), tz(s.z) + 4);
    });

    // zombies
    if (game.horde) {
      for (const z of game.horde.list) {
        if (!z.alive || z.dying) continue;
        ctx.fillStyle = z.type === 'brute' || z.type === 'tank' ? '#ff6a3d' : z.type === 'runner' ? '#ffd24a' : '#8fe36a';
        const r = z.type === 'brute' || z.type === 'tank' ? 3.4 : 2.2;
        ctx.beginPath(); ctx.arc(tx(z.pos.x), tz(z.pos.z), r, 0, 7); ctx.fill();
      }
    }
    // remote players
    if (game.remotePlayers) {
      game.remotePlayers.forEach(rp => {
        if (!rp.alive) return;
        ctx.fillStyle = '#ff4a4a';
        ctx.beginPath(); ctx.arc(tx(rp.pos.x), tz(rp.pos.z), 4, 0, 7); ctx.fill();
      });
    }
    // local player (triangle pointing along yaw)
    // The map is drawn top-down with +x → right and +z → down, so a player facing
    // `yaw` (world forward = (-sin yaw, -cos yaw)) must be drawn rotated by -yaw.
    // The old expression reflected the arrow across both axes, pointing it backwards.
    const dirRot = -p.yaw;
    const px = tx(p.pos.x), pz = tz(p.pos.z);
    ctx.save();
    ctx.translate(px, pz);
    ctx.rotate(dirRot);
    ctx.fillStyle = '#4aff6a';
    ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(4.5, 5); ctx.lineTo(0, 3); ctx.lineTo(-4.5, 5); ctx.closePath(); ctx.fill();
    ctx.restore();
    // view cone
    ctx.save();
    ctx.translate(px, pz);
    ctx.rotate(dirRot);
    const grad = ctx.createLinearGradient(0, 0, 0, -46);
    grad.addColorStop(0, 'rgba(74,255,106,.22)');
    grad.addColorStop(1, 'rgba(74,255,106,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-22, -46); ctx.lineTo(22, -46); ctx.closePath(); ctx.fill();
    ctx.restore();
  },

  /* ---------------- scoreboard ---------------- */
  renderScoreboard(game) {
    const t = this.el.sbTable;
    const rows = [];
    if (game.mode === 'online') {
      rows.push(game.player);
      if (game.remotePlayers) game.remotePlayers.forEach(rp => rows.push(rp));
      rows.sort((a, b) => b.score - a.score || b.kills - a.kills);
      t.innerHTML = '<tr><th>ИГРОК</th><th>УБИЙСТВА</th><th>СМЕРТИ</th><th>ТОЧН.</th><th>СЧЁТ</th></tr>' +
        rows.map(r =>
          '<tr class="' + (r === game.player ? 'me' : '') + '">' +
          '<td class="n">' + U.esc(r.name) + (r === game.player ? ' <span class="t">(вы)</span>' : '') + '</td>' +
          '<td class="k">' + r.kills + '</td>' +
          '<td class="d">' + r.deaths + '</td>' +
          '<td class="t">' + (r.bulletsFired ? Math.round(r.bulletsHit / r.bulletsFired * 100) : 0) + '%</td>' +
          '<td class="s">' + r.score + '</td></tr>').join('');
    } else {
      const p = game.player;
      t.innerHTML = '<tr><th>ПОКАЗАТЕЛЬ</th><th>ЗНАЧЕНИЕ</th></tr>' +
        [
          ['Убито зомби', p.zombieKills],
          ['Волна', (game.offline ? game.offline.wave : 1)],
          ['Убийств в голову', p.headshots],
          ['Выстрелов', p.bulletsFired],
          ['Попаданий', p.bulletsHit],
          ['Точность', (p.bulletsFired ? Math.round(p.bulletsHit / p.bulletsFired * 100) : 0) + '%'],
          ['Нанесено урона', Math.round(p.damageDealt)],
          ['Смертей', p.deaths],
          ['Счёт', p.score],
          ['Рекорд счёта', Store.data.best],
          ['Лучшая волна', Store.data.bestWave]
        ].map(r => '<tr><td class="t">' + r[0] + '</td><td class="s">' + r[1] + '</td></tr>').join('');
    }
  },

  renderMenuStats() {
    this.el.menuStats.innerHTML =
      '<div><b>' + Store.data.best + '</b>РЕКОРД</div>' +
      '<div><b>' + Store.data.bestWave + '</b>ЛУЧШАЯ ВОЛНА</div>' +
      '<div><b>' + Store.data.killsTotal + '</b>ЗОМБИ УБИТО</div>' +
      '<div><b>' + Store.data.wins + '/' + Store.data.matches + '</b>ПОБЕД В ОНЛАЙН</div>';
  }
};

/* ---------------- keyboard shortcut helper ---------------- */
function bindClick(id, fn) {
  const e = document.getElementById(id);
  if (e) e.addEventListener('click', () => { Audio3D_SFX.init(); Audio3D_SFX.resume(); Audio3D_SFX.uiClick(); fn(); });
  return e;
}
