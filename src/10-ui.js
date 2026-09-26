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
      'hud', 'crosshair', 'hitmark', 'scope', 'reloadTag', 'hpFill', 'hpVal', 'apFill', 'apVal', 'ammoMag', 'ammoRes',
      'weaponName', 'money', 'roundTimer', 'objective', 'netInfo', 'killCount', 'scoreVal', 'minimap',
      'feed', 'centerMsg', 'dmgFlash', 'lowhp', 'buy', 'buyMoney', 'buyTimer', 'buyCats', 'buyGrid',
      'bossBar', 'bossName', 'bossFill',
      'buyHint', 'buyOwned', 'btnBuySkip', 'btnBuyClose', 'scoreboard', 'sbTitle', 'sbTable', 'pause', 'toast', 'fps', 'clickToPlay',
      'connect', 'connTitle', 'connStatus', 'joinRow', 'hostRow', 'joinWait', 'roomCode', 'waiting', 'waitingTxt',
      'inName', 'inCode', 'peerList', 'peerListJoin',
      'btnCopy', 'dmgDirs', 'android', 'ios', 'credits', 'crPlayer', 'crStats',
      'matchEnd', 'meTitle', 'meWinner', 'meScore', 'meDetail', 'btnMatchAgain', 'btnMatchMenu',
      'mapChips', 'playerChips', 'hpChips', 'hordeChips', 'lobbyMaps', 'lobbyPlayers', 'lobbyHp', 'lobbyFree', 'lobbyRounds',
      'medkitTag', 'droneTag'];
    ids.forEach(i => this.el[i] = $(i));
    this.buildBuyCats();
    this.buildChips();
  },

  /* ---------------- screens ---------------- */
  show(name) {
    ['loading', 'menu', 'controls', 'lobby', 'hud', 'buy', 'scoreboard', 'pause', 'connect', 'android', 'ios', 'credits', 'matchEnd', 'clickToPlay'].forEach(s => {
      const e = this.el[s];
      if (!e) return;
      const on = s === name;
      e.classList.toggle('hidden', !on);
    });
    this.current = name;
  },
  hideOverlays() {
    ['buy', 'scoreboard', 'pause', 'controls', 'lobby', 'menu', 'connect', 'android', 'ios', 'credits', 'matchEnd'].forEach(s => {
      if (this.el[s]) this.el[s].classList.add('hidden');
    });
  },
  overlayOpen() {
    return ['buy', 'scoreboard', 'pause', 'controls', 'lobby', 'menu', 'connect', 'android', 'ios', 'credits', 'matchEnd'].some(s => this.el[s] && !this.el[s].classList.contains('hidden'));
  },

  /* ============================================================
     MATCH SETTINGS CHIPS (map / players / health)
     Rendered into both the settings panel and the online lobby. The two sets
     stay in sync because every chip writes to Store and then refreshes.
     ============================================================ */
  buildChips() {
    const maps = (typeof MAPS !== 'undefined') ? MAPS : [];
    const fillMaps = (wrap, onPick) => {
      if (!wrap) return;
      wrap.innerHTML = '';
      maps.forEach(m => {
        const b = document.createElement('button');
        b.dataset.map = m.id;
        b.innerHTML = '<b>' + U.esc(m.short) + '</b><i>' + U.esc(m.desc) + '</i>';
        b.addEventListener('click', () => { onPick(m.id); Audio3D_SFX.uiClick(); });
        wrap.appendChild(b);
      });
    };
    const pickMap = id => {
      Store.data.map = id; Store.save();
      this.refreshChips();
      // rebuild immediately unless we are mid-match
      if ((typeof Game !== 'undefined') && Game.running) {
        if (Game.mode === CS.MODE.RANGE || Game.mode === CS.MODE.OFFLINE) { Game.ensureMap(id); Game.spawnPlayerLocal(0); UI.toast('Карта: ' + mapById(id).name); }
      }
    };
    const fillPlayers = (wrap, online) => {
      if (!wrap) return;
      wrap.innerHTML = '';
      MATCH.playerCounts.forEach(n => {
        if (online && n < 2) return;
        const b = document.createElement('button');
        b.dataset.n = n;
        b.innerHTML = '<b>' + n + '</b>';
        b.addEventListener('click', () => {
          Store.data.players = n; Store.save(); this.refreshChips();
          if (typeof Net !== 'undefined' && Net.role === CS.NETROLE.HOST && Net.connected) {
            Net.send({ t: 'round', st: 'settings', players: n, hp: Store.data.maxHP, map: Store.data.map });
          }
          Audio3D_SFX.uiClick();
        });
        wrap.appendChild(b);
      });
    };
    const fillHp = (wrap) => {
      if (!wrap) return;
      wrap.innerHTML = '';
      MATCH.hpOptions.forEach(n => {
        const b = document.createElement('button');
        b.dataset.hp = n;
        b.innerHTML = '<b>' + n + '</b><i>HP</i>';
        b.addEventListener('click', () => {
          Store.data.maxHP = n; Store.save(); this.refreshChips();
          if (typeof Net !== 'undefined' && Net.role === CS.NETROLE.HOST && Net.connected) {
            Net.send({ t: 'round', st: 'settings', players: Store.data.players, hp: n, map: Store.data.map });
          }
          Audio3D_SFX.uiClick();
        });
        wrap.appendChild(b);
      });
    };
    const fillFree = (wrap) => {
      if (!wrap) return;
      wrap.innerHTML = '';
      [{ n: 0, b: 'ОБЫЧНАЯ', i: 'деньги и закупка' }, { n: 1, b: 'ВСЁ БЕСПЛАТНО', i: 'без экономики' }].forEach(o => {
        const b = document.createElement('button');
        b.dataset.free = o.n;
        b.innerHTML = '<b>' + o.b + '</b><i>' + o.i + '</i>';
        b.addEventListener('click', () => {
          Store.data.freeplay = o.n; Store.save(); this.refreshChips();
          if (typeof Net !== 'undefined' && Net.role === CS.NETROLE.HOST && Net.connected) {
            Net.send({ t: 'round', st: 'settings', players: Store.data.players, hp: Store.data.maxHP, map: Store.data.map, free: Store.data.freeplay });
          }
          Audio3D_SFX.uiClick();
        });
        wrap.appendChild(b);
      });
    };
    const fillRounds = (wrap) => {
      if (!wrap) return;
      wrap.innerHTML = '';
      MATCH.roundOptions.forEach(n => {
        const b = document.createElement('button');
        b.dataset.rounds = n;
        b.innerHTML = '<b>' + n + '</b><i>' + (n === 1 ? 'бой' : 'боёв') + '</i>';
        b.addEventListener('click', () => {
          Store.data.rounds = n; Store.save(); this.refreshChips();
          if (typeof Net !== 'undefined' && Net.role === CS.NETROLE.HOST && Net.connected) {
            Net.send({ t: 'round', st: 'settings', players: Store.data.players, hp: Store.data.maxHP, map: Store.data.map, free: Store.data.freeplay, rounds: Store.data.rounds });
          }
          Audio3D_SFX.uiClick();
        });
        wrap.appendChild(b);
      });
    };
    const fillHorde = (wrap) => {
      if (!wrap) return;
      wrap.innerHTML = '';
      [{ n: 0, b: 'ОБЫЧНЫЙ', i: 'стандартные волны' }, { n: 1, b: 'ОРДА ×10', i: 'зомби в 10× больше, но хилые' }].forEach(o => {
        const b = document.createElement('button');
        b.dataset.horde = o.n;
        b.innerHTML = '<b>' + o.b + '</b><i>' + o.i + '</i>';
        b.addEventListener('click', () => {
          Store.data.horde = o.n; Store.save(); this.refreshChips();
          Audio3D_SFX.uiClick();
        });
        wrap.appendChild(b);
      });
    };
    fillMaps(this.el.mapChips, pickMap);
    fillMaps(this.el.lobbyMaps, pickMap);
    fillPlayers(this.el.playerChips, false);
    fillPlayers(this.el.lobbyPlayers, true);
    fillHp(this.el.hpChips);
    fillHp(this.el.lobbyHp);
    fillHorde(this.el.hordeChips);
    fillFree(this.el.lobbyFree);
    fillRounds(this.el.lobbyRounds);
    this.refreshChips();
  },

  refreshChips() {
    const S = Store.data;
    const mark = (wrap, attr, val) => {
      if (!wrap) return;
      Array.from(wrap.children).forEach(b => b.classList.toggle('on', String(b.dataset[attr]) === String(val)));
    };
    mark(this.el.mapChips, 'map', S.map); mark(this.el.lobbyMaps, 'map', S.map);
    mark(this.el.playerChips, 'n', S.players); mark(this.el.lobbyPlayers, 'n', S.players);
    mark(this.el.hpChips, 'hp', S.maxHP); mark(this.el.lobbyHp, 'hp', S.maxHP);
    mark(this.el.hordeChips, 'horde', S.horde);
    mark(this.el.lobbyFree, 'free', S.freeplay);
    mark(this.el.lobbyRounds, 'rounds', MATCH.clampRounds(S.rounds));
  },

  /* connected peers, shown in the lobby so the host can see who is in */
  renderPeerList() {
    const list = (typeof Net !== 'undefined' && Net.peers) ? Net.peers : [];
    const html = list.map(p =>
      '<div><span>' + U.esc(p.name || 'Игрок') + '</span><em>' + (p.isHost ? 'ХОСТ' : 'ИГРОК') + '</em></div>'
    ).join('') || '<div><span>Пока никого</span><em>1/4</em></div>';
    if (this.el.peerList) this.el.peerList.innerHTML = html;
    if (this.el.peerListJoin) this.el.peerListJoin.innerHTML = html;
    const wt = this.el.waitingTxt;
    if (wt) wt.textContent = list.length >= 2 ? 'Игроков в комнате: ' + list.length + ' · ждём остальных…' : 'Ожидание игроков…';
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
    const maxHP = (typeof Game !== 'undefined' && Game.matchHP) ? Game.matchHP : 100;
    const hp = U.clamp(p.health, 0, maxHP);
    e.hpFill.style.transform = 'scaleX(' + (hp / maxHP) + ')';
    e.hpVal.textContent = Math.max(0, Math.round(p.health));
    e.hpFill.parentElement.classList.toggle('low', hp <= maxHP * .35);
    e.apFill.style.transform = 'scaleX(' + (U.clamp(p.armor, 0, 100) / 100) + ')';
    e.apVal.textContent = Math.round(p.armor);
    this.lowHP(hp > 0 && hp <= maxHP * .32);

    // ammo
    const w = p.weapon;
    if (w) {
      const def = WEAPONS[w.id];
      e.ammoMag.textContent = w.mag === Infinity ? '∞' : Math.max(0, w.mag);
      e.ammoRes.textContent = w.id === 'knife' ? '' : '/ ' + (w.reserve === Infinity ? '∞' : Math.max(0, w.reserve));
      e.weaponName.textContent = def.name;
      e.ammoMag.style.color = (w.mag !== Infinity && w.mag <= Math.max(2, def.mag * .2)) ? '#e05141' : '#fff';
      // reload / low-ammo hint under the crosshair
      if (e.reloadTag) {
        if (p.reloadT > 0) { e.reloadTag.textContent = 'ПЕРЕЗАРЯДКА'; e.reloadTag.classList.remove('hidden'); }
        else if (w.mag !== Infinity && w.mag === 0) { e.reloadTag.textContent = 'ПУСТО · R'; e.reloadTag.classList.remove('hidden'); }
        else e.reloadTag.classList.add('hidden');
      }
    }
    // money / kills / score
    e.money.textContent = U.money(p.money);
    e.killCount.textContent = mode === 'online' ? p.kills : p.zombieKills;
    e.scoreVal.textContent = mode === 'online' ? p.score : p.score;

    // gear line: medkits + drone readiness
    if (e.medkitTag) {
      const n = p.medkits || 0;
      e.medkitTag.textContent = 'АПТЕЧКА ×' + n;
      e.medkitTag.classList.toggle('hidden', n <= 0);
      e.medkitTag.classList.toggle('usable', n > 0 && p.health < maxHP && p.alive);
    }
    if (e.droneTag) {
      const ready = !!p.drone;
      e.droneTag.classList.toggle('hidden', !ready);
      e.droneTag.classList.toggle('usable', ready);
    }

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

  /* dynamic crosshair gap (drives the CSS variable the arms are built from) */
  setCrosshairSpread(px) {
    const e = this.el.crosshair;
    if (!e) return;
    e.style.setProperty('--g', U.clamp(px, 0, 26) + 'px');
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
      b.addEventListener('click', () => {
      this.buyCat = c.id;
      // renderBuy needs the live player; calling it with no argument used to
      // throw on `player.money`, so the grid silently stayed empty until the
      // menu was reopened. Fall back to the current player.
      const p = (typeof Game !== 'undefined' && Game.player) ? Game.player : null;
      if (p) this.renderBuy(p, Game.buyTimer);
      Audio3D_SFX.uiClick();
    });
      wrap.appendChild(b);
    });
  },
  renderBuy(player, secondsLeft) {
    const wrap = this.el.buyGrid;
    if (!wrap) return;
    // defensive: some callers (category buttons) may not pass a player
    if (!player && typeof Game !== 'undefined' && Game.player) player = Game.player;
    if (!player) return;
    const free = (typeof Game !== 'undefined') && Game.isFreeShop && Game.isFreeShop();
    const endless = typeof Game !== 'undefined' && Game.mode === CS.MODE.RANGE;
    this.el.buyMoney.textContent = free ? 'БЕСПЛАТНО' : U.money(player.money);
    this.el.buyTimer.textContent = endless ? '∞' : Math.max(0, Math.ceil(secondsLeft));
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
      d.addEventListener('click', () => { if (!cant && !owned) onClick(); else if (!owned) { Audio3D_SFX.deny(); if (id === 'medkit') UI.toast('Аптечек максимум: ' + CFG.medkitMax); else UI.toast('Недостаточно денег'); } });
      wrap.appendChild(d);
    };

    if (this.buyCat === 'gear') {
      Object.keys(GEAR).forEach(gid => {
        const g = GEAR[gid];
        /* Consumables are never "owned": ammo can always be refilled and a
           medkit/drone can be bought again after being used. */
        let owned, cant, stats, desc;
        const onClick = () => Bus.emit('buyGear', gid);
        if (g.drone) {
          owned = !!player.drone;
          cant = !free && player.money < g.price;
          stats = [['РАДИУС', CFG.droneBlast + 'м'], ['УРОН', CFG.droneDmg], ['СБИТЬ', '1 попадание']];
          desc = 'Управляемый · перезаряд каждый раунд';
        } else if (g.medkitBox) {
          const n = player.medkits || 0;
          owned = !!player.medkitUnlimited;
          cant = (!free && player.money < g.price) || owned;
          stats = player.medkitUnlimited ? [['ЛИМИТ', 'СНЯТ']] : [['ЛИМИТ', 'СНЯТЬ'], ['ЦЕНА', '$' + g.price]];
          desc = player.medkitUnlimited ? 'Лимит аптечек уже снят' : 'Убирает лимит на аптечки навсегда';
        } else if (g.medkit) {
          const n = player.medkits || 0;
          const unlimited = !!player.medkitUnlimited;
          owned = false;
          const full = !unlimited && n >= CFG.medkitMax;
          cant = (!free && player.money < g.price) || full;
          stats = [['ЛЕЧИТ', '+' + CFG.medkitHeal + ' HP'], ['В ЗАПАСЕ', unlimited ? n : (n + '/' + CFG.medkitMax)], ['КЛАВИША', 'H']];
          desc = full ? 'Лимит — купите ЯЩИК АПТЕЧЕК' : 'Применить в бою (или кнопка на телефоне)';
        } else if (g.ammo) {
          owned = false;
          cant = !free && player.money < g.price;
          stats = [['ЭФФЕКТ', '100%'], ['ВСЕ СТВОЛЫ', 'ДА']];
          desc = g.desc;
        } else if (g.heavy) {
          owned = !!player.heavyArmor && player.armor >= g.ap;
          cant = !free && player.money < g.price;
          stats = [['AP', g.ap], ['ПОГЛОЩ.', '75%'], ['ШЛЕМ', 'ДА']];
          desc = g.desc;
        } else {
          owned = (gid === 'kevlar' && player.armor >= 100 && !player.helmet) || (gid === 'kevlarHelmet' && player.armor >= 100 && player.helmet);
          cant = !free && player.money < g.price;
          stats = [['AP', '100'], ['ШЛЕМ', g.helmet ? 'ДА' : 'НЕТ']];
          desc = g.helmet ? 'Броня + защита головы' : 'Защита корпуса';
        }
        mkCard(gid, g.name, desc, g.price, stats, owned, cant, onClick);
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
        if (w.pierce) stats.push(['ПРОБИВ', 'НАСКВОЗЬ']);
        if (w.splash) stats.push(['РАДИУС', w.splash + 'м']);
        mkCard(id, w.name, w.cat.toUpperCase(), w.price, stats, owned, !free && player.money < w.price,
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
    if (p.medkits > 0) s += ' · аптечек: ' + p.medkits;
    if (p.drone) s += ' · дрон';
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
    Object.keys(MAP.sites || {}).forEach(k => {
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
    // field medkits (offline): a green health marker
    if (game.medboxes && game.medboxes.length) {
      const pulse3 = .5 + .5 * Math.sin(Date.now() / 220);
      game.medboxes.forEach(m => {
        const px = tx(m.x), pz = tz(m.z);
        ctx.save();
        ctx.strokeStyle = 'rgba(87,255,122,.95)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(px, pz, 5.5 + pulse3 * 2.5, 0, 7); ctx.stroke();
        ctx.fillStyle = '#57ff7a';
        ctx.beginPath(); ctx.arc(px, pz, 2.6, 0, 7); ctx.fill();
        ctx.fillStyle = '#12161a';
        ctx.font = 'bold 7px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('+', px, pz + 2.6);
        ctx.restore();
      });
    }
    // ammo crates (offline): a golden marker with a small "!" so it stands out
    if (game.crates && game.crates.length) {
      const pulse2 = .5 + .5 * Math.sin(Date.now() / 200);
      game.crates.forEach(c => {
        const px = tx(c.x), pz = tz(c.z);
        ctx.save();
        ctx.strokeStyle = 'rgba(255,210,74,.95)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(px, pz, 5.5 + pulse2 * 2.5, 0, 7); ctx.stroke();
        ctx.fillStyle = '#ffd24a';
        ctx.beginPath(); ctx.arc(px, pz, 2.6, 0, 7); ctx.fill();
        ctx.fillStyle = '#12161a';
        ctx.font = 'bold 7px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('!', px, pz + 2.6);
        ctx.restore();
      });
    }
    // drones: the local one and every enemy drone in the air (a loud, visible
    // threat — that is the point of the kamikaze drone)
    const pulse = .5 + .5 * Math.sin(Date.now() / 160);
    const drawDrone = (x, z, enemy) => {
      ctx.save();
      ctx.strokeStyle = enemy ? 'rgba(255,80,80,.95)' : 'rgba(90,200,255,.95)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(tx(x), tz(z), 6 + pulse * 3, 0, 7); ctx.stroke();
      ctx.fillStyle = enemy ? '#ff4a4a' : '#4aa3ff';
      ctx.beginPath(); ctx.arc(tx(x), tz(z), 2.6, 0, 7); ctx.fill();
      ctx.restore();
    };
    if (game.drone) drawDrone(game.drone.pos.x, game.drone.pos.z, false);
    if (game.remotePlayers) game.remotePlayers.forEach(rp => {
      if (rp.droneMesh) drawDrone(rp.droneMesh.position.x, rp.droneMesh.position.z, true);
    });
    // training dummies (test range)
    if (game.dummies) {
      ctx.fillStyle = '#ffb347';
      game.dummies.forEach(d => {
        if (!d.alive) return;
        ctx.beginPath(); ctx.arc(tx(d.pos.x), tz(d.pos.z), 3, 0, 7); ctx.fill();
      });
    }
    // aim-training targets
    if (game.targets) {
      game.targets.forEach(t => {
        if (!t.alive) return;
        ctx.fillStyle = '#ff5b3d';
        ctx.beginPath(); ctx.arc(tx(t.pos.x), tz(t.pos.z), 2.5, 0, 7); ctx.fill();
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
      t.innerHTML = '<tr><th>#</th><th>ИГРОК</th><th>УБИЙСТВА</th><th>СМЕРТИ</th><th>ТОЧН.</th><th>СЧЁТ</th></tr>' +
        rows.map((r, i) =>
          '<tr class="' + (r === game.player ? 'me' : '') + '">' +
          '<td class="t">' + (i + 1) + '</td>' +
          '<td class="n">' + U.esc(r.name) + (r === game.player ? ' <span class="t">(вы)</span>' : '') + '</td>' +
          '<td class="k">' + r.kills + '</td>' +
          '<td class="d">' + r.deaths + '</td>' +
          '<td class="t">' + (r.bulletsFired ? Math.round(r.bulletsHit / r.bulletsFired * 100) : 0) + '%</td>' +
          '<td class="s">' + r.score + '</td></tr>').join('');
      this.el.sbTitle.textContent = 'СЧЁТ · ' + U.esc(game.mapName()) + ' · HP ' + game.matchHP;
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
    const clears = Store.data.clears || 0;
    this.el.menuStats.innerHTML =
      '<div class="clearstat"><b>' + clears + '</b>ПРОХОЖДЕНИЙ</div>' +
      '<div><b>' + Store.data.best + '</b>РЕКОРД</div>' +
      '<div><b>' + Store.data.bestWave + '</b>ЛУЧШАЯ ВОЛНА</div>' +
      '<div><b>' + Store.data.killsTotal + '</b>ЗОМБИ УБИТО</div>' +
      '<div><b>' + Store.data.wins + '/' + Store.data.matches + '</b>ПОБЕД В ОНЛАЙН</div>' +
      '<div><b>' + U.duration(Store.data.playTime) + '</b>ВРЕМЯ В ИГРЕ</div>';
  }
};

/* ---------------- keyboard shortcut helper ---------------- */
function bindClick(id, fn) {
  const e = document.getElementById(id);
  if (e) e.addEventListener('click', () => { Audio3D_SFX.init(); Audio3D_SFX.resume(); Audio3D_SFX.uiClick(); fn(); });
  return e;
}
