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
      'todChips', 'weatherChips', 'envAutoChips', 'menuBgChips', 'sEnvSpeed', 'oEnvSpeed', 'lobbyTod', 'lobbyWeather', 'lobbyMode',
      'offCountChips', 'offHpChips', 'offFreeChips', 'offMapFreqChips', 'offModeChips', 'offCustomBox', 'offHordeBox', 'offSpecialBox', 'offCpBox', 'offCpInfo', 'offCpMode', 'offCpList', 'offCountExact', 'offCountFixed', 'btnOffContinue', 'custom', 'lobbyShop', 'lobbyShopItems',
      'modScreen', 'modGrid', 'modActive',
      'kromer', 'kromGrid', 'kromAmount', 'btnKromClose',
      'extras', 'achGrid', 'recTable', 'btnExtrasBack', 'weaponWheel', 'wwInner',
      'skins', 'skinCanvas', 'skinGrid', 'skinStatus', 'skinWeaponSel', 'skinTargetChips', 'btnSkinsBack', 'btnSkins', 'skinRarityBar',
      'medkitTag', 'droneTag', 'grenadeTag', 'zResetTag', 'jetTag', 'dashTag', 'shieldTag', 'heatTag', 'missileHud', 'mhTime', 'mhReadout', 'knightUlt',
      'baProgTag', 'baProgFill', 'baProgText',
      'sdScreen', 'sdGrid', 'sdSearch', 'sdToggle2', 'sdClose', 'sdConfig',
      'esScreen', 'esGrid', 'esSearch', 'esCount', 'esCountNum', 'esCountChips', 'esClear', 'esClose', 'esConfig',
      'account', 'accAuthBox', 'accInBox', 'accWho', 'accStatus', 'accNick', 'accEmail', 'accPass',
      'accCloudTag', 'accCloudHint', 'accCloudForm', 'accUrl', 'accKey', 'accHash',
      'btnAccount', 'btnAccountBack', 'btnAccLogin', 'btnAccRegister', 'btnAccSync', 'btnAccOut',
      'btnAccCloud', 'btnAccCloudSave', 'btnAccCopyHash',
      'btnEditor', 'edPanel', 'edCount', 'edSpawn', 'edName', 'edSaveBtn', 'myMaps', 'lobbyMyMaps', 'dashFx',
      'edMats', 'edSizes', 'edElems', 'edPlace', 'edEraseM', 'edSpawnBtn', 'edUndoBtn', 'edFreeCam',
      'edUp', 'edDown', 'edExitBtn', 'edFold', 'edLook'];
    ids.forEach(i => this.el[i] = $(i));
    this.buildBuyCats();
    this.buildChips();
    this.buildEdPanel();
  },

  /* ---------------- screens ---------------- */
  show(name) {
    ['loading', 'menu', 'controls', 'lobby', 'hud', 'buy', 'scoreboard', 'pause', 'connect', 'android', 'ios', 'credits', 'matchEnd', 'custom', 'clickToPlay', 'sdScreen', 'esScreen', 'modScreen', 'kromer', 'extras', 'skins', 'account'].forEach(s => {
      const e = this.el[s];
      if (!e) return;
      const on = s === name;
      e.classList.toggle('hidden', !on);
    });
    this.current = name;
  },
  hideOverlays() {
    ['buy', 'scoreboard', 'pause', 'controls', 'lobby', 'menu', 'connect', 'android', 'ios', 'credits', 'matchEnd', 'custom', 'sdScreen', 'esScreen', 'modScreen', 'kromer', 'extras', 'skins', 'account', 'edPanel'].forEach(s => {
      if (this.el[s]) this.el[s].classList.add('hidden');
    });
  },
  overlayOpen() {
    return ['buy', 'scoreboard', 'pause', 'controls', 'lobby', 'menu', 'connect', 'android', 'ios', 'credits', 'matchEnd', 'custom', 'sdScreen', 'esScreen', 'modScreen', 'kromer', 'extras', 'skins', 'account'].some(s => this.el[s] && !this.el[s].classList.contains('hidden'));
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
      const pushRounds = (n) => {
        Store.data.rounds = n; Store.save(); this.refreshChips();
        if (typeof Net !== 'undefined' && Net.role === CS.NETROLE.HOST && Net.connected) {
          Net.send({ t: 'round', st: 'settings', players: Store.data.players, hp: Store.data.maxHP, map: Store.data.map, free: Store.data.freeplay, rounds: Store.data.rounds });
        }
        Audio3D_SFX.uiClick();
      };
      MATCH.roundOptions.forEach(n => {
        const b = document.createElement('button');
        b.dataset.rounds = n;
        b.innerHTML = '<b>' + n + '</b><i>' + (n === 1 ? 'победа' : 'побед') + '</i>';
        b.addEventListener('click', () => pushRounds(n));
        wrap.appendChild(b);
      });
      /* СВОЁ ЧИСЛО ПОБЕД: сколько угодно (1..99) */
      const num = document.createElement('input');
      num.type = 'number'; num.min = 1; num.max = 99; num.step = 1;
      num.className = 'numin roundsnum';
      num.value = Store.data.rounds || 3;
      num.title = 'Своё число побед для матча';
      num.addEventListener('change', () => {
        let v = Math.round(parseFloat(num.value) || 1);
        v = U.clamp(v, 1, 99);
        num.value = v;
        pushRounds(v);
      });
      wrap.appendChild(num);
    };
    /* custom-offline chips: zombie count, zombie health, shop economics */
    const saveOff = () => {
      Store.save(); this.refreshChips();
      // a running custom match picks up the new values immediately
      if (typeof Game !== 'undefined' && Game.customOffline && Game.mode === CS.MODE.OFFLINE) {
        Game.offCountMul = U.clamp(parseFloat(Store.data.offCount) || 1, 0.1, 50);
        Game.offHpMul = U.clamp(parseFloat(Store.data.offHp) || 1, 0.05, 20);
        Game.freePlay = Store.data.offFree === 1;
      }
      Audio3D_SFX.uiClick();
    };
    const fillOff = (wrap, key, opts, fmt) => {
      if (!wrap) return;
      wrap.innerHTML = '';
      opts.forEach(v => {
        const b = document.createElement('button');
        b.dataset.v = v;
        b.innerHTML = fmt(v);
        b.addEventListener('click', () => { Store.data[key] = v; saveOff(); });
        wrap.appendChild(b);
      });
    };
    fillOff(this.el.offCountChips, 'offCount', MATCH.countOptions, v => '<b>' + (v === 1 ? '×1' : '×' + v) + '</b><i>зомби</i>');
    fillOff(this.el.offHpChips, 'offHp', MATCH.hpOptionsOff, v => '<b>' + (v === 1 ? '×1' : '×' + v) + '</b><i>HP</i>');
    /* exact zombie count per wave + a "fixed" toggle (no growth with the wave) */
    if (this.el.offCountExact) {
      const inp = this.el.offCountExact;
      inp.value = Math.max(1, Math.round(parseFloat(Store.data.offCountExact) || 10));
      inp.addEventListener('input', () => {
        Store.data.offCountExact = U.clamp(Math.round(parseFloat(inp.value) || 10), 1, 1000);
        Store.data.offCountFixed = 1;
        if (this.el.offCountFixed) this.el.offCountFixed.checked = true;
        saveOff();
      });
    }
    if (this.el.offCountFixed) {
      const cb = this.el.offCountFixed;
      cb.checked = Store.data.offCountFixed === 1;
      cb.addEventListener('change', () => { Store.data.offCountFixed = cb.checked ? 1 : 0; saveOff(); });
    }
    if (this.el.offFreeChips) {
      this.el.offFreeChips.innerHTML = '';
      [{ v: 0, b: 'ПЛАТНЫЙ', i: 'деньги и закупка' }, { v: 1, b: 'БЕСПЛАТНЫЙ', i: 'без экономики' }].forEach(o => {
        const b = document.createElement('button');
        b.dataset.v = o.v;
        b.innerHTML = '<b>' + o.b + '</b><i>' + o.i + '</i>';
        b.addEventListener('click', () => { Store.data.offFree = o.v; saveOff(); });
        this.el.offFreeChips.appendChild(b);
      });
    }
    /* частота смены карты в оффлайне: каждая N-я волна, либо ВЫКЛ */
    if (this.el.offMapFreqChips) {
      this.el.offMapFreqChips.innerHTML = '';
      [{ v: 0, b: 'ВЫКЛ', i: 'одна карта' }, { v: 5, b: '5', i: 'волн' }, { v: 10, b: '10', i: 'волн' },
       { v: 20, b: '20', i: 'волн' }, { v: 30, b: '30', i: 'волн' }].forEach(o => {
        const b = document.createElement('button');
        b.dataset.v = o.v;
        b.innerHTML = '<b>' + o.b + '</b><i>' + o.i + '</i>';
        b.addEventListener('click', () => { Store.data.offMapFreq = o.v; Store.save(); this.refreshChips(); Audio3D_SFX.uiClick(); });
        this.el.offMapFreqChips.appendChild(b);
      });
    }
    /* offline mode picker: ordinary, horde ×10, free horde, custom */
    if (this.el.offModeChips) {
      const modes = [
        { id: 'normal', b: 'ОБЫЧНЫЙ', i: 'классические волны' },
        { id: 'horde', b: 'ОРДА ×10', i: 'много, но хилые' },
        { id: 'freehorde', b: 'БЕСПЛАТНАЯ ОРДА', i: 'орда ×10 + всё бесплатно' },
        { id: 'bossrush', b: 'БОСС-РАШ', i: 'только боссы подряд' },
        { id: 'daily', b: 'ИСПЫТАНИЕ ДНЯ', i: 'общий сид и модификаторы' },
        { id: 'endless', b: 'БЕСКОНЕЧНЫЙ', i: 'модификатор каждые 10 волн' },
        { id: 'hardcore', b: 'ХАРДКОР', i: 'одна жизнь · без сохранений' },
        { id: 'custom', b: 'СВОЙ', i: 'свои множители' }
      ];
      this.el.offModeChips.innerHTML = '';
      modes.forEach(m => {
        const b = document.createElement('button');
        b.dataset.mode = m.id;
        b.innerHTML = '<b>' + m.b + '</b><i>' + m.i + '</i>';
        b.addEventListener('click', () => { Store.data.offMode = m.id; Store.save(); this.refreshChips(); Audio3D_SFX.uiClick(); });
        this.el.offModeChips.appendChild(b);
      });
    }
    /* shop-category toggles for online rooms (multi-select) */
    const fillShop = (wrap) => {
      if (!wrap) return;
      wrap.innerHTML = '';
      const allow = Game.shopAllow || MATCH.defaultShopAllow();
      BUY_CATS.forEach(c => {
        const b = document.createElement('button');
        b.dataset.cat = c.id;
        b.innerHTML = '<b>' + U.esc(c.label) + '</b>';
        b.addEventListener('click', () => {
          const cur = Game.shopAllow || Game.hostShopAllow();
          cur[c.id] = cur[c.id] ? 0 : 1;
          Game.shopAllow = cur;
          Store.data.shopAllow = cur; Store.save();
          this.refreshChips(); this.renderShopItems();
          if (typeof Net !== 'undefined' && Net.role === CS.NETROLE.HOST && Net.connected) {
            Net.send({ t: 'round', st: 'settings', players: Store.data.players, hp: Store.data.maxHP, map: Store.data.map, free: Store.data.freeplay, rounds: Store.data.rounds, shop: cur, shopItems: Game.shopItemsAllow() });
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
    fillShop(this.el.lobbyShop);
    this.buildEnvChips();
    this.buildMyMaps();
    this.refreshChips();
  },

  /* ---- МОИ КАРТЫ (из редактора): выбор + редактировать + удалить ---- */
  buildMyMaps() {
    const fill = (wrap) => {
      if (!wrap) return;
      wrap.innerHTML = '';
      const list = (Store.data.customMaps && Array.isArray(Store.data.customMaps)) ? Store.data.customMaps : [];
      if (!list.length) {
        const d = document.createElement('div');
        d.className = 'hintbox'; d.style.marginTop = '0';
        d.textContent = 'Пока нет своих карт. Откройте «РЕДАКТОР КАРТ» в главном меню.';
        wrap.appendChild(d);
        return;
      }
      list.forEach(m => {
        const row = document.createElement('span');
        row.className = 'mapedit';
        const b = document.createElement('button');
        b.dataset.map = m.id;
        b.innerHTML = '<b>' + U.esc(m.name) + '</b><i>' + ((m.blocks && m.blocks.length) || 0) + ' блоков</i>';
        b.addEventListener('click', () => {
          Store.data.map = m.id; Store.save(); UI.refreshChips();
          if (typeof Game !== 'undefined' && Game.running && (Game.mode === CS.MODE.RANGE || Game.mode === CS.MODE.OFFLINE)) {
            Game.ensureMap(m.id); Game.spawnPlayerLocal(0);
          }
          Audio3D_SFX.uiClick();
        });
        const ed = document.createElement('button');
        ed.className = 'del'; ed.textContent = 'ред.';
        ed.title = 'Редактировать карту';
        ed.addEventListener('click', (e) => { e.stopPropagation(); if (typeof Game !== 'undefined') Game.startEditor(m.id); });
        const del = document.createElement('button');
        del.className = 'del'; del.textContent = '×';
        del.title = 'Удалить карту';
        del.addEventListener('click', (e) => {
          e.stopPropagation();
          const arr = Store.data.customMaps;
          const i = arr.findIndex(x => x.id === m.id);
          if (i >= 0) arr.splice(i, 1);
          if (Store.data.map === m.id) { Store.data.map = 'arena'; }
          Store.save();
          if (typeof registerCustomMapsIntoRegistry === 'function') registerCustomMapsIntoRegistry();
          UI.buildMyMaps(); UI.refreshChips();
          Audio3D_SFX.uiClick();
        });
        row.appendChild(b); row.appendChild(ed); row.appendChild(del);
        wrap.appendChild(row);
      });
    };
    fill(this.el.myMaps);
    fill(this.el.lobbyMyMaps);
  },

  /* ---- ПАЛИТРА РЕДАКТОРА КАРТ: кнопки материала/размера/элемента/действий ---- */
  buildEdPanel() {
    const E = this.el;
    const chip = (wrap, key, val, label, onPick) => {
      const b = document.createElement('button');
      b.className = 'ed-chip';
      b.dataset[key] = val;
      b.textContent = label;
      b.addEventListener('click', () => { onPick(val); this.edPanelSync(); });
      wrap.appendChild(b);
    };
    const ed = (typeof MapEditor !== 'undefined') ? MapEditor : null;
    if (!ed) return;
    if (E.edMats) {
      E.edMats.innerHTML = '';
      ed.MATS.forEach(m => chip(E.edMats, 'mat', m.id, m.name, v => ed.setMat(v)));
    }
    if (E.edSizes) {
      E.edSizes.innerHTML = '';
      ed.SIZES.forEach(s => chip(E.edSizes, 'size', s, s + ' м', v => ed.setSize(v)));
    }
    if (E.edElems) {
      E.edElems.innerHTML = '';
      chip(E.edElems, 'elem', '__none__', 'БЛОКИ', v => ed.setElem(null));
      ed.ELEM_KINDS.forEach(e => chip(E.edElems, 'elem', e.k, e.name, v => ed.setElem(v)));
    }
    const bind = (id, fn) => { const b = E[id]; if (b) b.addEventListener('click', () => { fn(); this.edPanelSync(); }); };
    bind('edPlace', () => ed.toggleErase(false));
    bind('edEraseM', () => ed.toggleErase(true));
    bind('edFreeCam', () => ed.toggleFreeCam());
    bind('edUp', () => { ed._touchUp = true; setTimeout(() => { ed._touchUp = false; }, 160); });
    bind('edDown', () => { ed._touchDown = true; setTimeout(() => { ed._touchDown = false; }, 160); });
    bind('edSpawnBtn', () => ed.setSpawnHere());
    bind('edUndoBtn', () => ed.undo());
    bind('edExitBtn', () => ed.exitEditor());
    if (E.edFold) {
      E.edFold.addEventListener('click', () => {
        const p = E.edPanel;
        p.classList.toggle('folded');
        E.edFold.textContent = p.classList.contains('folded') ? '+' : '−';
      });
    }
    /* ОБЗОР: ведёшь пальцем по панели (в т.ч. УДЕРЖИВАЯ кнопку) — камера
       редактора вращается. Если палец не двигался — срабатывает кнопка. */
    const lookZones = [E.edLook, E.edPanel];
    const _touches = {};
    const rot = (dx, dy) => { if (typeof MapEditor !== 'undefined' && MapEditor.active) MapEditor.touchLookDelta(dx, dy); };
    lookZones.forEach(zone => {
      if (!zone) return;
      zone.addEventListener('touchstart', e => {
        for (const t of e.changedTouches) _touches[t.identifier] = { x: t.clientX, y: t.clientY, moved: 0 };
      }, { passive: true });
      zone.addEventListener('touchmove', e => {
        for (const t of e.changedTouches) {
          const s = _touches[t.identifier];
          if (!s) continue;
          const dx = t.clientX - s.x, dy = t.clientY - s.y;
          s.x = t.clientX; s.y = t.clientY; s.moved += Math.abs(dx) + Math.abs(dy);
          s.hx = (s.hx || 0) + Math.abs(dx); s.vy = (s.vy || 0) + Math.abs(dy);
          rot(dx, dy);
        }
        /* на ЗОНЕ ОБЗОРА всегда перехватываем; на панели — только если жест
           явно горизонтальный (поворот), иначе отдаём вертикальный скролл */
        if (zone === E.edLook) { if (e.cancelable) e.preventDefault(); }
        else {
          let hx = 0, vy = 0;
          for (const id in _touches) { hx += _touches[id].hx || 0; vy += _touches[id].vy || 0; }
          if (hx > vy * 1.2 && e.cancelable) e.preventDefault();
        }
      }, { passive: false });
      const end = e => { for (const t of e.changedTouches) delete _touches[t.identifier]; };
      zone.addEventListener('touchend', end, { passive: true });
      zone.addEventListener('touchcancel', end, { passive: true });
    });
    /* если палец сдвинулся по кнопке — это был обзор, а не нажатие: гасим click */
    if (E.edPanel) {
      E.edPanel.addEventListener('click', e => {
        const last = Object.values(_touches).reduce((m, s) => Math.max(m, s.moved || 0), 0);
        if (last > 14) { e.stopPropagation(); e.preventDefault(); }
      }, true);
    }
  },
  /* после правки в панели — подсветить активное */
  edPanelSync() { if (typeof MapEditor !== 'undefined' && MapEditor.active) MapEditor.updatePanel(); },

  /* time-of-day / weather / auto-cycle chip groups (environment settings).
     The same groups appear in the settings panel AND in the online lobby — the
     lobby ones let the host pick the time of day / weather FOR BOTH players and
     broadcast it to the room. */
  buildEnvChips() {
    const S = Store.data;
    const fill = (wrap, items, attr, onPick) => {
      if (!wrap) return;
      wrap.innerHTML = '';
      items.forEach(o => {
        const b = document.createElement('button');
        b.dataset[attr] = o.v;
        b.innerHTML = '<b>' + U.esc(o.b) + '</b>' + (o.i ? '<i>' + U.esc(o.i) + '</i>' : '');
        b.addEventListener('click', () => { onPick(o.v); Audio3D_SFX.uiClick(); });
        wrap.appendChild(b);
      });
    };
    const pickTod = v => { S.timeOfDay = v; S.weather = v; S.envOff = 0; Store.save(); Game.applyTimeOfDay(); this.refreshChips(); this.broadcastEnv(); };
    const pickWx = v => { S.skyWeather = v; S.envOff = 0; Store.save(); Game.applyTimeOfDay(); this.refreshChips(); this.broadcastEnv(); };
    const pickAuto = v => { S.envAuto = v; Store.save(); this.refreshChips(); this.broadcastEnv(); };
    fill(this.el.todChips, TOD_ORDER.map(k => ({ v: k, b: todName(k) })), 'tod', pickTod);
    fill(this.el.weatherChips, WEATHER_ORDER.map(k => ({ v: k, b: weatherName(k) })), 'wx', pickWx);
    fill(this.el.envAutoChips, [{ v: 0, b: 'ВЫКЛ' }, { v: 1, b: 'ВКЛ' }], 'auto', pickAuto);
    /* фон меню: облёт разных карт или обычная статичная выбранная карта */
    const pickMenu = v => {
      S.menuTour = v; Store.save(); this.refreshChips();
      // сразу перестроим фон, не дожидаясь следующего кадра
      if (Game && Game.mode === CS.MODE.MENU) { try { Game.renderMenu(); } catch (e) { } }
    };
    fill(this.el.menuBgChips, [{ v: 1, b: 'ОБЛЁТ КАРТ' }, { v: 0, b: 'ОБЫЧНЫЙ' }], 'mbg', pickMenu);
    /* режим онлайн-матча: PvP-дуэль или кооп по волнам / орде / босс-рашу */
    const pickMode = v => {
      Store.data.onlineMode = v; Store.save(); this.refreshChips(); this.broadcastEnv();
    };
    fill(this.el.lobbyMode, [
      { v: 'pvp', b: 'PvP', i: 'дуэль' },
      { v: 'normal', b: 'ОБЫЧНЫЙ', i: 'волны вместе' },
      { v: 'horde', b: 'ОРДА ×10', i: 'кооп-орда' },
      { v: 'bossrush', b: 'БОСС-РАШ', i: 'боссы подряд' }
    ], 'omode', pickMode);
    /* the lobby copies: the host sets the time of day / weather for both players */
    fill(this.el.lobbyTod, TOD_ORDER.map(k => ({ v: k, b: todName(k) })), 'tod', pickTod);
    fill(this.el.lobbyWeather, WEATHER_ORDER.map(k => ({ v: k, b: weatherName(k) })), 'wx', pickWx);
  },
  /* host → room: send the chosen time of day / weather so BOTH players see it */
  broadcastEnv() {
    if (typeof Net === 'undefined' || Net.role !== CS.NETROLE.HOST || !Net.connected) return;
    Net.send({ t: 'round', st: 'settings', players: Store.data.players, hp: Store.data.maxHP, map: Store.data.map,
      free: Store.data.freeplay, rounds: Store.data.rounds,
      tod: Store.data.timeOfDay || 'day', weather: Store.data.skyWeather || 'clear', envAuto: Store.data.envAuto || 0, envOff: Store.data.envOff || 0,
      pve: Store.data.onlineMode || 'pvp' });
  },
  /* re-highlight the environment chips (called after the E/P hotkeys) */
  refreshEnv() { this.refreshChips(); },

  refreshChips() {
    const S = Store.data;
    const mark = (wrap, attr, val) => {
      if (!wrap) return;
      Array.from(wrap.children).forEach(b => b.classList.toggle('on', String(b.dataset[attr]) === String(val)));
    };
    mark(this.el.mapChips, 'map', S.map); mark(this.el.lobbyMaps, 'map', S.map);
    if (this.el.myMaps) mark(this.el.myMaps, 'map', S.map);
    if (this.el.lobbyMyMaps) mark(this.el.lobbyMyMaps, 'map', S.map);
    mark(this.el.playerChips, 'n', S.players); mark(this.el.lobbyPlayers, 'n', S.players);
    mark(this.el.hpChips, 'hp', S.maxHP); mark(this.el.lobbyHp, 'hp', S.maxHP);
    mark(this.el.hordeChips, 'horde', S.horde);
    mark(this.el.lobbyFree, 'free', S.freeplay);
    mark(this.el.lobbyRounds, 'rounds', MATCH.clampRounds(S.rounds));
    mark(this.el.offCountChips, 'v', parseFloat(S.offCount) || 1);
    mark(this.el.offHpChips, 'v', parseFloat(S.offHp) || 1);
    mark(this.el.offFreeChips, 'v', Number(S.offFree) || 0);
    /* environment: when OFF nothing is highlighted, otherwise show the current
       time of day, the weather, and the auto-cycle state */
    if (!S.envOff) {
      mark(this.el.todChips, 'tod', S.timeOfDay || S.weather || 'day');
      mark(this.el.weatherChips, 'wx', S.skyWeather || 'clear');
      mark(this.el.lobbyTod, 'tod', S.timeOfDay || S.weather || 'day');
      mark(this.el.lobbyWeather, 'wx', S.skyWeather || 'clear');
    } else {
      mark(this.el.todChips, 'tod', '__off__');
      mark(this.el.weatherChips, 'wx', '__off__');
      mark(this.el.lobbyTod, 'tod', '__off__');
      mark(this.el.lobbyWeather, 'wx', '__off__');
    }
    mark(this.el.envAutoChips, 'auto', S.envAuto ? 1 : 0);
    if (this.el.menuBgChips) {
      Array.from(this.el.menuBgChips.children).forEach(b => b.classList.toggle('on', +b.dataset.mbg === (S.menuTour === undefined ? 1 : (S.menuTour ? 1 : 0))));
    }
    if (this.el.offMapFreqChips) {
      Array.from(this.el.offMapFreqChips.children).forEach(b => b.classList.toggle('on', +b.dataset.v === (S.offMapFreq || 0)));
    }
    mark(this.el.lobbyMode, 'omode', S.onlineMode || 'pvp');
    const mode = S.offMode || 'normal';
    if (this.el.offModeChips) {
      Array.from(this.el.offModeChips.children).forEach(b => b.classList.toggle('on', b.dataset.mode === mode));
    }
    if (this.el.offCustomBox) this.el.offCustomBox.classList.toggle('hidden', mode !== 'custom');
    if (this.el.offHordeBox) this.el.offHordeBox.classList.toggle('hidden', mode !== 'horde' && mode !== 'freehorde');
    if (this.el.offSpecialBox) this.el.offSpecialBox.classList.toggle('hidden', ['bossrush', 'daily', 'endless'].indexOf(mode) < 0);
    // checkpoint: show save info for the SELECTED mode; each mode has its own slot
    const all = (typeof Game !== 'undefined' && Game.allCheckpoints) ? Game.allCheckpoints() : {};
    const key = offlineModeKey(mode, mode === 'horde' || mode === 'freehorde', mode === 'freehorde', mode === 'custom');
    const cp = all[key] || null;
    if (this.el.offCpBox) this.el.offCpBox.classList.toggle('hidden', Object.keys(all).length === 0);
    if (this.el.offCpMode) this.el.offCpMode.textContent = offlineModeLabel(key);
    if (this.el.offCpInfo) this.el.offCpInfo.textContent = cp ? ('волна ' + cp.wave) : 'нет сохранения';
    if (this.el.btnOffContinue) {
      this.el.btnOffContinue.classList.toggle('hidden', !cp);
      const b = this.el.btnOffContinue.querySelector('b');
      const i = this.el.btnOffContinue.querySelector('i');
      if (b) b.textContent = 'ПРОДОЛЖИТЬ' + (cp ? ' · ВОЛНА ' + cp.wave : '');
      if (i) i.textContent = cp ? (offlineModeLabel(key) + ' · оружие и счёт с волны ' + cp.wave) : 'Сохранения нет';
    }
    // a list of every saved run; clicking one selects that mode
    if (this.el.offCpList) {
      this.el.offCpList.innerHTML = '';
      const keys = Object.keys(all).sort();
      keys.forEach(k => {
        const c = all[k];
        const chip = document.createElement('button');
        chip.className = 'cpchip' + (k === key ? ' on' : '');
        chip.innerHTML = '<b>' + offlineModeLabel(k) + '</b><i>волна ' + c.wave + ' · $' + (c.money | 0) + '</i>';
        chip.addEventListener('click', () => {
          Store.data.offMode = k; Store.save();
          // selecting a save also selects its mode; auto-resume it
          this.refreshChips();
          if (typeof Game !== 'undefined') Game.resumeFromCheckpoint(k);
        });
        this.el.offCpList.appendChild(chip);
      });
    }
    // shop toggles: a category is "on" when it is allowed
    if (this.el.lobbyShop) {
      const allow = (typeof Game !== 'undefined' && Game.shopAllow) ? Game.shopAllow : MATCH.defaultShopAllow();
      Array.from(this.el.lobbyShop.children).forEach(b => b.classList.toggle('on', !!allow[b.dataset.cat]));
    }
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
  /* ГОСПОДИН ЦВЕТОВ: кинематографичный баннер ульты + реплика. */
  flowerUltBanner() {
    this.center('LORD OF FLOWERS', '· СОВОКУПНАЯ СИЛА ·', 2.6);
    const e = this.el.centerMsg;
    if (e) { e.classList.add('flowerult'); setTimeout(() => e.classList.remove('flowerult'), 2600); }
  },
  /* ГОСПОДИН ЦВЕТОВ: баннер превращения в форму «ОМЕГА ФЛАВЕРИ». */
  omegaBanner() {
    this.center('OMEGA FLOWERY', '· ВЫСШАЯ ФОРМА ·', 3.0);
    const e = this.el.centerMsg;
    if (e) { e.classList.add('flowerult'); setTimeout(() => e.classList.remove('flowerult'), 3000); }
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

  /* ЭФФЕКТ РЫВКА «ГОСПОДИНА ЦВЕТОВ»: цветные полосы и виньетка по краям
     экрана — читается как ускорение/пробивание. omega — ярче (форма Омега). */
  dashFx(on, omega) {
    const e = this.el.dashFx;
    if (!e) return;
    e.classList.toggle('on', !!on);
    e.classList.toggle('omega', !!omega);
  },

  /* ============================================================
     УЛЬТА МЕЧА РОКОЧУЩЕГО РЫЦАРЯ: чёрный экран + гигантский БЕЛЫЙ слеш,
     проносящийся вперёд. Рисуется на 2D-canvas поверх игры. Полностью
     кинематографично: экран гаснет, вспыхивает белая полоса-разрез, идёт
     «зазубренный» белый след и угасание.
     ============================================================ */
  knightUltStart(seed) {
    const cv = this.el.knightUlt;
    if (!cv) return;
    this._ultCv = cv; this._ultCtx = cv.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = cv.clientWidth || window.innerWidth, h = cv.clientHeight || window.innerHeight;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    this._ultW = w; this._ultH = h; this._ultDpr = dpr;
    cv.classList.remove('hidden');
    this._ultT = 0; this._ultDur = 1.15;
    this._ultSeed = seed || (Math.random() * 1000 | 0);
    this._ultRaf = null;
  },
  knightUltTick(dt) {
    if (this._ultT === undefined || this._ultT === null) return false;
    this._ultT += dt;
    const k = U.clamp(this._ultT / this._ultDur, 0, 1);
    this._drawKnightUlt(k);
    if (k >= 1) { this.knightUltEnd(); return false; }
    return true;
  },
  knightUltEnd() {
    this._ultT = null;
    if (this._ultCv) this._ultCv.classList.add('hidden');
  },
  _drawKnightUlt(k) {
    const ctx = this._ultCtx, W = this._ultW, H = this._ultH, dpr = this._ultDpr;
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // 1) фон: экран резко чернеет (0 → .96 за первые 12% времени)
    const blackA = U.clamp(k / .12, 0, 1) * .96;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,' + blackA.toFixed(3) + ')';
    ctx.fillRect(0, 0, W, H);
    // 2) белый слеш: проносится слева-вправо (по дуге) за ~0.55 времени
    const sweep = U.clamp((k - .05) / .5, 0, 1);
    const e = 1 - Math.pow(1 - sweep, 2);                       // ease-out
    const fade = 1 - U.clamp((k - .62) / .34, 0, 1);            // гаснет к концу
    // геометрия «клика» меча: длинная сужающаяся полоса с загнутым концом
    const cx = -W * .15 + e * W * 1.15, cy = H * .52 - Math.sin(e * Math.PI) * H * .10;
    const len = W * .95, thick = H * .11 * fade;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // свечение вокруг полосы
    ctx.shadowColor = 'rgba(255,255,255,.95)';
    ctx.shadowBlur = 40 * fade;
    ctx.strokeStyle = 'rgba(255,255,255,' + (.92 * fade).toFixed(3) + ')';
    ctx.lineCap = 'round';
    // основной клинок
    ctx.lineWidth = thick;
    ctx.beginPath();
    ctx.moveTo(cx - len * .5, cy + thick * .2);
    ctx.quadraticCurveTo(cx, cy - thick * .5, cx + len * .5, cy - Math.sin(e * Math.PI) * H * .04);
    ctx.stroke();
    // тонкое яркое ядро
    ctx.shadowBlur = 14 * fade;
    ctx.strokeStyle = 'rgba(255,255,255,' + fade.toFixed(3) + ')';
    ctx.lineWidth = Math.max(2, thick * .28);
    ctx.beginPath();
    ctx.moveTo(cx - len * .5, cy + thick * .2);
    ctx.quadraticCurveTo(cx, cy - thick * .5, cx + len * .5, cy - Math.sin(e * Math.PI) * H * .04);
    ctx.stroke();
    // зазубрины/искры вдоль разреза
    ctx.shadowBlur = 10 * fade;
    const rng = makeRng(this._ultSeed || 7);
    for (let i = 0; i < 22; i++) {
      const t = rng();
      const px = cx - len * .5 + t * len;
      const py = cy + (rng() - .5) * thick * 2.4;
      const s = (2 + rng() * 7) * fade;
      ctx.fillStyle = 'rgba(255,255,255,' + ((.5 + rng() * .5) * fade).toFixed(3) + ')';
      ctx.fillRect(px, py, s * 2.2, s * .5);
    }
    ctx.restore();
    // 3) в конце чёрный резко спадает (белая вспышка уходит)
    if (k > .82) {
      const out = U.clamp((k - .82) / .18, 0, 1);
      ctx.fillStyle = 'rgba(0,0,0,' + ((1 - out) * .96).toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
    }
  },

  updateHUD(p, mode, extra) {
    const e = this.el;
    if (!e.hud || e.hud.classList.contains('hidden')) return;
    // health / armor
    const maxHP = (typeof Game !== 'undefined' && Game.matchHP) ? Game.matchHP : 100;
    const hp = U.clamp(p.health, 0, maxHP);
    e.hpFill.style.transform = 'scaleX(' + (hp / maxHP) + ')';
    e.hpVal.textContent = Math.max(0, Math.round(p.health));
    e.hpFill.parentElement.classList.toggle('low', hp <= maxHP * .35);
    const apMax = p.armorMax || CFG.maxAP || 100;
    e.apFill.style.transform = 'scaleX(' + (U.clamp(p.armor, 0, apMax) / apMax) + ')';
    e.apVal.textContent = Math.round(p.armor);
    const apBar = e.apFill.parentElement;
    apBar.classList.toggle('low', p.armor > 0 && p.armor <= apMax * .35);
    apBar.classList.toggle('energy', !!p.energyArmor);
    this.lowHP(hp > 0 && hp <= maxHP * .32);

    // ammo
    const w = p.weapon;
    if (w) {
      const def = WEAPONS[w.id];
      e.ammoMag.textContent = w.mag === Infinity ? '∞' : Math.max(0, Math.round(w.mag));
      e.ammoRes.textContent = w.id === 'knife' ? '' : '/ ' + (w.reserve === Infinity ? '∞' : Math.max(0, Math.round(w.reserve)));
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
    /* BLOOD ART: прогресс открытия скиллов по полученному урону */
    if (e.baProgTag) {
      const held = !!(p.def && p.def.fruit === 'bloodArt');
      e.baProgTag.classList.toggle('hidden', !held);
      if (held && typeof BloodArt !== 'undefined' && BloodArt.progress) {
        const pr = BloodArt.progress();
        e.baProgText.textContent = pr.unlocked + '/' + pr.total;
        /* прогресс до следующего скилла: от предыдущего порога к следующему */
        let prevTh = 0;
        for (const s of BloodArt.SKILLS) { const th = BloodArt.UNLOCK[s.code] || 0; if (th <= pr.dmg && th > prevTh) prevTh = th; }
        const nextTh = pr.next ? BloodArt.UNLOCK[pr.next.code] : pr.dmg;
        const f2 = pr.next ? U.clamp((pr.dmg - prevTh) / Math.max(1, nextTh - prevTh), 0, 1) : 1;
        e.baProgFill.style.transform = 'scaleX(' + f2 + ')';
        e.baProgTag.classList.toggle('full', !pr.next);
      }
    }
    // grenades: current kind and how many are left
    if (e.grenadeTag) {
      const kind = Store.data.grenade || 'frag';
      const n = (p.grenades && p.grenades[kind]) || 0;
      e.grenadeTag.textContent = grenadeName(kind) + ' ×' + n;
      e.grenadeTag.classList.toggle('hidden', n <= 0 && !(p.grenades && (p.grenades.frag + p.grenades.freeze + p.grenades.napalm) > 0));
      e.grenadeTag.classList.toggle('usable', n > 0);
    }
    // jetpack charge indicator (mech only)
    if (e.jetTag) {
      const inMech = (typeof Game !== 'undefined') && Game.isMechActive && Game.isMechActive();
      e.jetTag.classList.toggle('hidden', !inMech);
      if (inMech) {
        if (p.jetActive) { e.jetTag.textContent = 'ДЖЕТПАК ' + Math.max(0, p.jetT).toFixed(1) + 'с'; e.jetTag.classList.add('usable'); }
        else if (p.jetCd > 0) { e.jetTag.textContent = 'ДЖЕТПАК · ' + Math.max(0, p.jetCd).toFixed(1) + 'с'; e.jetTag.classList.remove('usable'); }
        else { e.jetTag.textContent = 'ДЖЕТПАК · ПРОБЕЛ'; e.jetTag.classList.add('usable'); }
      }
    }
    // dash indicator (mech only)
    if (e.dashTag) {
      const inMech = (typeof Game !== 'undefined') && Game.isMechActive && Game.isMechActive();
      e.dashTag.classList.toggle('hidden', !inMech);
      if (inMech) {
        if (p.dashActive) { e.dashTag.textContent = 'РЫВОК!'; e.dashTag.classList.add('usable'); }
        else if (p.dashCd > 0) { e.dashTag.textContent = 'РЫВОК · ' + Math.max(0, p.dashCd).toFixed(1) + 'с'; e.dashTag.classList.remove('usable'); }
        else { e.dashTag.textContent = 'РЫВОК · X'; e.dashTag.classList.add('usable'); }
      }
    }
    // Y — unstick cooldown indicator (only while recharging)
    if (e.zResetTag && typeof Game !== 'undefined') {
      const cd = 120000;
      const left = Game._zResetAt ? (cd - (U.now() - Game._zResetAt)) / 1000 : 0;
      if (left > 0.5) { e.zResetTag.textContent = 'СБРОС ЗОМБИ · ' + Math.ceil(left) + 'с'; e.zResetTag.classList.remove('hidden'); e.zResetTag.classList.remove('usable'); }
      else { e.zResetTag.classList.add('hidden'); }
    }
    // energy shield state, shown while the shield is the held weapon
    if (e.shieldTag) {
      const held = !!(p.slot === 2 && p.inv[2] && p.inv[2].id === 'shield');
      e.shieldTag.classList.toggle('hidden', !held);
      if (held) {
        if (p.shieldActive) { e.shieldTag.textContent = 'ЩИТ ' + Math.ceil(p.shieldT) + 'с'; e.shieldTag.classList.add('usable'); }
        else if (p.shieldCd > 0) { e.shieldTag.textContent = 'ЩИТ · ' + Math.ceil(p.shieldCd) + 'с'; e.shieldTag.classList.remove('usable'); }
        else { e.shieldTag.textContent = 'ЩИТ · ЛКМ'; e.shieldTag.classList.add('usable'); }
      }
    }

    // laser cannon heat, shown while it is the held weapon
    if (e.heatTag) {
      const held = !!(p.slot === 2 && p.inv[2] && p.inv[2].id === 'laserCannon');
      e.heatTag.classList.toggle('hidden', !held);
      if (held) {
        const d = WEAPONS.laserCannon;
        const left = Math.max(0, (d.beamMax || 10) - (p.beamHeat || 0));
        if (p.beamVent > 0) { e.heatTag.textContent = 'ОСТЫВАЕТ ' + Math.ceil(p.beamVent) + 'с'; e.heatTag.classList.remove('usable'); e.heatTag.classList.add('hot'); }
        else { e.heatTag.textContent = 'ЛАЗЕР ' + Math.ceil(left) + 'с'; e.heatTag.classList.add('usable'); e.heatTag.classList.remove('hot'); }
      }
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
  /* per-frame timer tick only (the grid is NOT rebuilt, so clicks land) */
  tickBuyTimer(secondsLeft) {
    if (!this.el.buyTimer) return;
    const endless = typeof Game !== 'undefined' && Game.mode === CS.MODE.RANGE;
    this.el.buyTimer.textContent = endless ? '∞' : Math.max(0, Math.ceil(secondsLeft));
    // keep the money readout live (it changes when the round timer refunds)
    if (this.el.buyMoney && typeof Game !== 'undefined' && Game.isFreeShop && !Game.isFreeShop()) {
      this.el.buyMoney.textContent = U.money(Game.player.money);
    }
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
    // in ONLINE matches the host may disable whole categories / single items
    const allow = (typeof Game !== 'undefined') ? Game.shopAllow : null;
    const shopAllows = (cat) => !allow || allow[cat] !== 0;
    const itemAllow = (typeof Game !== 'undefined' && Game.shopItemAllow) ? Game.shopItemAllow : null;
    const itemAllowed = (id) => !itemAllow || itemAllow[id] !== 0;
    const mkCard = (id, name, desc, price, stats, owned, cant, onClick, onOwned, iconId, cantMsg) => {
      n++;
      const d = document.createElement('div');
      d.className = 'bcard' + (cant ? ' cant' : '') + (owned ? ' own' : '');
      let iconHtml = '';
      if (iconId) {
        const url = (typeof shopWeaponIcon === 'function') ? shopWeaponIcon(iconId) : '';
        if (url) iconHtml = '<div class="wico"><img alt="" src="' + url + '"></div>';
      }
      d.innerHTML = '<span class="num">' + (n <= 9 ? n : '') + '</span>' +
        iconHtml +
        '<div class="wn">' + U.esc(name) + '</div>' +
        '<div class="wd">' + U.esc(desc) + '</div>' +
        '<div class="wst">' + stats.map(s => '<span>' + s[0] + ' <i>' + s[1] + '</i></span>').join('') + '</div>' +
        (owned ? '<div class="pr">КУПЛЕНО</div>' : '<div class="pr">$' + price + '</div>');
      d.title = owned ? 'Нажмите, чтобы взять в руки' : 'Нажмите, чтобы купить';
      d.addEventListener('click', () => {
        if (owned) { if (onOwned) onOwned(); return; }
        if (!cant) { onClick(); return; }
        Audio3D_SFX.deny();
        if (cantMsg) UI.toast(cantMsg);
        else if (id === 'medkit') UI.toast('Аптечек максимум: ' + CFG.medkitMax);
        else UI.toast('Недостаточно денег');
      });
      wrap.appendChild(d);
    };

    if (this.buyCat === 'gear') {
      Object.keys(GEAR).forEach(gid => {
        const g = GEAR[gid];
        if (!shopAllows('gear')) return;
        if (!itemAllowed(gid)) return;
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
        } else if (g.grenade) {
          player.grenades = player.grenades || { frag: 0, freeze: 0, napalm: 0, sticky: 0 };
          const n = player.grenades[g.grenade] || 0;
          owned = false;
          cant = (!free && player.money < g.price) || n >= 4;
          stats = [['В ЗАПАСЕ', n + '/4'], ['КЛАВИША', 'G'], ['СМЕНА', 'J']];
          if (g.grenade === 'sticky') stats.push(['ВЗРЫВ', 'U']);
          desc = g.desc;
        } else if (g.turretGear) {
          owned = !!player.turretDrone;
          cant = !free && player.money < g.price;
          stats = [['ЗАРЯДОВ', player.turretDrone || 0], ['УРОН', 48], ['КЛАВИША', 'V']];
          desc = g.desc;
        } else if (g.mechSuit) {
          owned = !!player.mechOwned;
          cant = (!free && player.money < g.price) || !!player.mechSuit;
          stats = [['СТАТУС', player.mechSuit ? 'В МЕХЕ' : 'Готов'], ['ЛКМ', 'МИНИГАН'], ['ПКМ', 'ЛАЗЕР']];
          desc = player.mechSuit ? 'G — выйти из меха' : 'Купить и сесть в мех · G — выйти';
        } else if (g.ammo) {
          owned = false;
          cant = !free && player.money < g.price;
          stats = [['ЭФФЕКТ', '100%'], ['ВСЕ СТВОЛЫ', 'ДА']];
          desc = g.desc;
        } else if (g.perk) {
          const flag = { highJump: 'perkHighJump', dash: 'perkDash', runSpeed: 'perkRunSpeed' }[g.perk];
          owned = !!player[flag];
          cant = (!free && player.money < g.price) || owned;
          stats = g.perk === 'highJump' ? [['ВЫСОТА', '×1.8'], ['ДЖЕТПАК', 'УДЕРЖ.']]
            : g.perk === 'dash' ? [['РЫВОК', 'X'], ['ПЕРЕЗАРЯД', '3с']]
              : [['БЕГ', '+55%'], ['ВСЕГДА', 'ДА']];
          desc = g.desc;
        } else if (g.heavy) {
          owned = g.energy ? !!player.energyArmor : (!!player.heavyArmor && !player.energyArmor && player.armor >= g.ap);
          cant = (!free && player.money < g.price) || (g.energy ? !!player.energyArmor : (!!player.energyArmor));
          const absorb = g.energy ? '88%' : '75%';
          stats = [['AP', g.ap], ['ПОГЛОЩ.', absorb], ['ШЛЕМ', 'ДА']];
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
        if (!shopAllows(w.cat)) return;
        if (!itemAllowed(id)) return;
        const owned = player.has(id);
        const inBag = player.bagHas && player.bagHas(id) && !(player.inv[w.slot] && player.inv[w.slot].id === id);
        const equipped = owned && !inBag && player.slot === w.slot && player.inv[w.slot] && player.inv[w.slot].id === id;
        /* последовательная прокачка меча: II и III закрыты, пока нет предыдущего */
        const need = (typeof WEAPON_UPGRADE_CHAIN !== 'undefined') ? WEAPON_UPGRADE_CHAIN[id] : null;
        const needsPrev = need && !owned && !player.has(need);
        const rpm = Math.round(w.rpm);
        const stats = [['УРОН', w.dmg], ['ТЕМП', rpm]];
        if (w.mag !== Infinity) stats.push(['МАГ', w.mag]);
        if (w.pellets) stats.push(['ДРОБЬ', w.pellets]);
        if (w.pierce) stats.push(['ПРОБИВ', 'НАСКВОЗЬ']);
        if (w.beam) stats.push(['ЛУЧ', w.beamMax + 'с']);
        if (w.splash) stats.push(['РАДИУС', w.splash + 'м']);
        if (w.bulletSplash) stats.push(['РАДИУС', w.bulletSplash + 'м'], ['ВЗРЫВНЫЕ', 'ДА']);
        if (w.ult) stats.push(['ПКМ', 'УЛЬТА · СЛЕШ'], ['ПЕРЕЗАРЯД', (w.ultCd || 9) + 'с']);
        if (w.fruit === 'bloodArt') stats.push(['Z', 'ЛАПА'], ['X', 'ЗАЛП'], ['C', 'ЯДЕРКА'], ['V', 'ПЫТКА'], ['F', 'РЫВОК']);
        const cardDesc = needsPrev ? ('СНАЧАЛА: ' + ((WEAPONS[need] && WEAPONS[need].name) || need)) : w.cat.toUpperCase();
        mkCard(id, w.name, cardDesc, w.price, stats, owned || inBag, needsPrev || (!free && player.money < w.price),
          () => Bus.emit('buy', id),
          () => Bus.emit('equip', id), id,
          needsPrev ? ('Сначала купите ' + ((WEAPONS[need] && WEAPONS[need].name) || need)) : null);
        if (equipped) { const c = wrap.lastChild; if (c) { c.classList.add('equipped'); const pr = c.querySelector('.pr'); if (pr) pr.textContent = 'В РУКАХ'; } }
        else if (inBag) { const c = wrap.lastChild; if (c) { c.classList.add('inbag'); const pr = c.querySelector('.pr'); if (pr) pr.textContent = 'В СУМКЕ'; } }
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
    if (p.bag && p.bag.length) s += ' · 🎒 сумка: ' + p.bag.map(b => WEAPONS[b.id].name).join(', ');
    if (p.armor > 0) s += ' · броня ' + Math.round(p.armor) + (p.helmet ? '+шлем' : '');
    if (p.medkits > 0) s += ' · аптечек: ' + p.medkits;
    if (p.drone) s += ' · дрон';
    return s;
  },

  /* Per-item shop allow-list: one expandable block per category, each button a
     single weapon/gear entry. Only meaningful for online hosts; harmless for
     clients (their toggles are simply ignored). */
  renderShopItems() {
    const wrap = this.el.lobbyShopItems;
    if (!wrap) return;
    const cats = (typeof BUY_CATS !== 'undefined') ? BUY_CATS : [];
    const items = (typeof MATCH !== 'undefined' && MATCH.shopItems) ? MATCH.shopItems() : {};
    const catAllow = (typeof Game !== 'undefined' && Game.shopAllow) ? Game.shopAllow : MATCH.defaultShopAllow();
    const itemAllow = (typeof Game !== 'undefined' && Game.shopItemsAllow) ? Game.shopItemsAllow() : {};
    wrap.innerHTML = '';
    cats.forEach(c => {
      const list = items[c.id] || [];
      if (!list.length) return;
      const block = document.createElement('div');
      block.className = 'si-cat';
      const off = catAllow[c.id] === 0;
      const head = document.createElement('div');
      head.className = 'si-head';
      const onCount = list.filter(it => itemAllow[it.id] !== 0).length;
      head.innerHTML = '<span class="si-title">' + U.esc(c.label) + '</span>' +
        '<span class="si-count">' + (off ? 'ВЫКЛЮЧЕНО ЦЕЛИКОМ' : onCount + '/' + list.length + ' доступно') + '</span>';
      block.appendChild(head);
      const grid = document.createElement('div');
      grid.className = 'si-grid';
      list.forEach(it => {
        const b = document.createElement('button');
        const allowed = itemAllow[it.id] !== 0;
        b.textContent = it.name;
        b.className = allowed ? 'on' : 'off';
        if (off) b.disabled = true;
        b.addEventListener('click', () => {
          if (catAllow[c.id] === 0) return;
          const cur = Game.shopItemsAllow();
          cur[it.id] = cur[it.id] === 0 ? 1 : 0;
          Game.shopItemAllow = cur;
          Store.data.shopItems = cur; Store.save();
          this.renderShopItems();
          if (typeof Net !== 'undefined' && Net.role === CS.NETROLE.HOST && Net.connected) {
            Net.send({ t: 'round', st: 'settings', players: Store.data.players, hp: Store.data.maxHP, map: Store.data.map, free: Store.data.freeplay, rounds: Store.data.rounds, shop: Game.shopAllow, shopItems: cur });
          }
          Audio3D_SFX.uiClick();
        });
        grid.appendChild(b);
      });
      block.appendChild(grid);
      wrap.appendChild(block);
    });
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

    /* ОПТИМИЗАЦИЯ: статичная сетка укрытий (nav-препятствия) рисуется ОДИН РАЗ
       в offscreen-canvas и потом просто копируется. Раньше каждый кадр
       перебирались сотни клеток навигационной сетки — это било по FPS. */
    const nav = MAP.nav;
    if (nav) {
      if (!this._miniNav || this._miniNavKey !== (MAP.id + ':' + nav.W)) {
        const oc = document.createElement('canvas');
        oc.width = W; oc.height = H;
        const octx = oc.getContext('2d');
        octx.fillStyle = 'rgba(120,140,160,.16)';
        const cw = W / nav.W, ch = H / nav.H;
        const step = 2;
        for (let gz = 0; gz < nav.H; gz += step) {
          for (let gx = 0; gx < nav.W; gx += step) {
            const i = gz * nav.W + gx;
            if (nav.walk[i]) continue;
            octx.fillRect(gx * cw, gz * ch, cw * step, ch * step);
          }
        }
        this._miniNav = oc;
        this._miniNavKey = MAP.id + ':' + nav.W;
      }
      ctx.drawImage(this._miniNav, 0, 0);
    }
    /* один расчёт времени на весь кадр (Date.now() в цикле по эффектам дорогой) */
    const nowMs = Date.now();
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
      const pulse3 = .5 + .5 * Math.sin(nowMs / 220);
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
    // ЛИПУЧКИ игрока: видны только тому, кто их прилепил (как в GTA)
    if (game._grenades && game._grenades.length) {
      game._grenades.forEach(g => {
        if (!g.sticky || !g.stuck || !g.ownerLocal) return;
        const px = tx(g.pos.x), pz = tz(g.pos.z);
        ctx.save();
        const bl = .5 + .5 * Math.sin(nowMs / 180);
        ctx.strokeStyle = 'rgba(255,60,40,' + (.5 + bl * .5) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(px, pz, 6 + bl * 3, 0, 7); ctx.stroke();
        ctx.fillStyle = '#ff3a2a';
        ctx.beginPath(); ctx.arc(px, pz, 3, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 7px Arial'; ctx.textAlign = 'center';
        ctx.fillText('L', px, pz + 2.6);
        ctx.restore();
      });
    }
    if (game.crates && game.crates.length) {
      const pulse2 = .5 + .5 * Math.sin(nowMs / 200);
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
    const pulse = .5 + .5 * Math.sin(nowMs / 160);
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
    const achN = Object.keys(Store.data.ach || {}).length;
    this.el.menuStats.innerHTML =
      '<div class="clearstat"><b>' + clears + '</b>ПРОХОЖДЕНИЙ</div>' +
      '<div><b>' + Store.data.best + '</b>РЕКОРД</div>' +
      '<div><b>' + Store.data.bestWave + '</b>ЛУЧШАЯ ВОЛНА</div>' +
      '<div><b>' + Store.data.killsTotal + '</b>ЗОМБИ УБИТО</div>' +
      '<div><b>' + Store.data.wins + '/' + Store.data.matches + '</b>ПОБЕД В ОНЛАЙН</div>' +
      '<div><b>' + achN + '/' + ACHIEVEMENTS.length + '</b>ДОСТИЖЕНИЙ</div>' +
      '<div><b>' + U.duration(Store.data.playTime) + '</b>ВРЕМЯ В ИГРЕ</div>';
  },

  /* achievements + best-run table */
  renderExtras() {
    const ach = Store.data.ach || {};
    const stats = (typeof Game !== 'undefined' && Game.statsSnapshot) ? Game.statsSnapshot() : null;
    if (this.el.achGrid) {
      this.el.achGrid.innerHTML = ACHIEVEMENTS.map(a => {
        const on = !!ach[a.id];
        const sk = skinForAchievement(a.id);
        const swatch = sk ? ('#' + sk.glow.toString(16).padStart(6, '0')) : '#39434c';
        const rcol = sk ? rarityHex(sk.rarity) : '#39434c';
        /* every achievement gets its OWN progress bar toward its goal */
        const pr = achProgress(a, stats);
        const pct = on ? 100 : Math.round(pr.frac * 100);
        const barCol = on ? '#ffd24a' : rcol;
        const readout = on ? 'ВЫПОЛНЕНО' : (pr.suffix ? achProgressText(pr.have, pr.goal) + pr.suffix : achProgressText(pr.have, pr.goal));
        const rewardTxt = sk ? ('Награда: скин ' + (sk.mech ? 'МЕХА' : '') + ' · ' + U.esc(sk.rarityLabel)) : '';
        return '<div class="achcard' + (on ? ' on' : '') + (sk && sk.rarity === 'platinum' ? ' plat' : '') + '" data-ach="' + a.id + '"><b><span class="sw" style="display:inline-block;width:10px;height:10px;' +
          'border-radius:2px;margin-right:6px;vertical-align:-1px;border:1px solid rgba(255,255,255,.3);background:' + swatch + '"></span>' +
          (on ? '🏆 ' : '🔒 ') + U.esc(a.name) + '</b><i>' + U.esc(a.desc) + '</i>' +
          '<div class="achprog"><div class="achbar"><span style="width:' + pct + '%;background:' + barCol + '"></span></div>' +
          '<em style="color:' + barCol + '">' + U.esc(readout) + '</em></div>' +
          (sk ? '<i style="display:block;margin-top:3px;color:' + rcol + '">' + rewardTxt + '</i>' : '') +
          '</div>';
      }).join('');
    }
    if (this.el.recTable) {
      const runs = Store.data.runs || [];
      if (!runs.length) this.el.recTable.innerHTML = '<tr><td class="t">Пока нет завершённых забегов</td></tr>';
      else this.el.recTable.innerHTML = '<tr><th>#</th><th>СЧЁТ</th><th>ВОЛНА</th><th>УБИТО</th><th>РЕЖИМ</th><th>ДАТА</th></tr>' +
        runs.map((r, i) => '<tr><td class="t">' + (i + 1) + '</td><td class="s">' + r.score + '</td><td>' + r.wave + '</td><td>' + r.kills + '</td><td>' + U.esc(r.mode) + '</td><td class="t">' + r.date + '</td></tr>').join('');
    }
  },

  /* update JUST the progress bars in place (called while the screen is open, so
     the numbers grow live during a match without rebuilding the whole grid) */
  tickAchProgress() {
    const grid = this.el.achGrid;
    if (!grid || UI.current !== 'extras') return;
    const ach = Store.data.ach || {};
    const stats = (typeof Game !== 'undefined' && Game.statsSnapshot) ? Game.statsSnapshot() : null;
    Array.from(grid.children).forEach(card => {
      const a = ACHIEVEMENTS.find(x => x.id === card.dataset.ach);
      if (!a) return;
      const on = !!ach[a.id];
      const pr = achProgress(a, stats);
      const pct = on ? 100 : Math.round(pr.frac * 100);
      const bar = card.querySelector('.achbar > span');
      const em = card.querySelector('.achprog > em');
      if (bar) bar.style.width = pct + '%';
      if (em) em.textContent = on ? 'ВЫПОЛНЕНО' : achProgressText(pr.have, pr.goal);
    });
  },

  /* weapon wheel: a radial list of owned weapons; clicking one switches */
  showWheel(game) {
    const p = game.player;
    if (!p || !this.el.weaponWheel) return;
    const items = [];
    for (const s of [1, 2, 3]) { const w = p.inv[s]; if (w) items.push({ slot: s, id: w.id, name: WEAPONS[w.id] ? WEAPONS[w.id].name : w.id }); }
    this.el.wwInner.innerHTML = items.map(it =>
      '<button class="wwitem' + (p.slot === it.slot ? ' on' : '') + '" data-slot="' + it.slot + '"><b>' + it.slot + '</b><span>' + U.esc(it.name) + '</span></button>'
    ).join('');
    Array.from(this.el.wwInner.children).forEach(b => {
      b.addEventListener('click', () => { game.switchSlot(parseInt(b.dataset.slot, 10)); this.hideWheel(); });
    });
    this.el.weaponWheel.classList.remove('hidden');
  },
  hideWheel() { if (this.el.weaponWheel) this.el.weaponWheel.classList.add('hidden'); }
};

/* ---------------- keyboard shortcut helper ---------------- */
function bindClick(id, fn) {
  const e = document.getElementById(id);
  if (e) e.addEventListener('click', () => { Audio3D_SFX.init(); Audio3D_SFX.resume(); Audio3D_SFX.uiClick(); fn(); });
  return e;
}

/* ============================================================
   SKIN INVENTORY — a small self-contained 3D preview.
   Its own renderer/loop, created lazily the first time the screen opens and
   driven by requestAnimationFrame only while the screen is visible.
   ============================================================ */
const Skins = {
  renderer: null, scene: null, camera: null, root: null,
  target: 'weapon',          // 'weapon' | 'player'
  weaponId: 'ak47',
  skinId: null,
  rotX: -0.15, rotY: 0.6, dist: 1.5,
  dragging: false, _lx: 0, _ly: 0, _raf: 0, _spin: 0,

  /* which weapons can be previewed (owned-by-design list of real guns) */
  weapons() {
    const out = [];
    for (const id in WEAPONS) {
      const w = WEAPONS[id];
      if (!(w.price > 0)) continue;
      if (id === 'knife' || w.mechWeapon || w.cat === 'exp') continue;
      // EVERY heavy gun can be skinned — including the projectile launchers
      // (РПГ / атомное РПГ / ракетница) and the energy shield. Only the other
      // categories skip exotic projectiles/shields (banana, acid, ...).
      if (w.cat !== 'heavy' && (w.projectile || w.shield)) continue;
      out.push(id);
    }
    return out.sort((a, b) => WEAPONS[a].price - WEAPONS[b].price);
  },
  unlocked() {
    return Object.keys(Store.data.ach || {}).length > 0;
  },

  init() {
    if (this.renderer) return;
    const canvas = $('skinCanvas');
    if (!canvas) return;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.01, 20);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x556070, 2.1));
    const d1 = new THREE.DirectionalLight(0xfff4e0, 1.9); d1.position.set(1.4, 2.2, 1.8); this.scene.add(d1);
    const d2 = new THREE.DirectionalLight(0x9fc2ff, 0.8); d2.position.set(-1.6, .6, -1.2); this.scene.add(d2);
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this._base = new THREE.Group();
    this.root.add(this._base);
    this.bindInput(canvas);
  },

  bindInput(canvas) {
    const on = (el, ev, fn) => el.addEventListener(ev, fn, { passive: false });
    on(canvas, 'pointerdown', e => { this.dragging = true; this._lx = e.clientX; this._ly = e.clientY; canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId); });
    on(canvas, 'pointerup', e => { this.dragging = false; });
    on(canvas, 'pointercancel', () => { this.dragging = false; });
    on(canvas, 'pointermove', e => {
      if (!this.dragging) return;
      this.rotY += (e.clientX - this._lx) * .01;
      this.rotX = U.clamp(this.rotX + (e.clientY - this._ly) * .01, -.1, 1.4);
      this._lx = e.clientX; this._ly = e.clientY;
    });
    on(canvas, 'wheel', e => { e.preventDefault(); this.dist = U.clamp(this.dist + Math.sign(e.deltaY) * .12, .7, 3.2); });
  },

  open() {
    this.init();
    this.renderTargets();
    this.renderWeaponList();
    this.renderRarityBar();
    this.renderGrid();
    this.rebuild();
    UI.show('skins');
    this._spin = 0;
    this.resize();
    if (!this._raf) this.loop();
  },
  /* a small legend showing how many skins of each rarity exist / are owned */
  renderRarityBar() {
    const el = $('skinRarityBar');
    if (!el) return;
    const ach = Store.data.ach || {};
    const counts = skinRarityCounts();
    el.innerHTML = SKIN_RARITY_ORDER.map(r => {
      const total = counts[r] || 0;
      const owned = SKINS.filter(s => !s.mech && s.rarity === r && ach[s.ach]).length;
      const c = rarityHex(r);
      return '<span class="rarstat" style="color:' + c + '"><i style="background:' + c + '"></i>' +
        SKIN_RARITIES[r].label + ' ' + owned + '/' + total + '</span>';
    }).join('');
  },
  close() { if (this._raf) { cancelAnimationFrame(this._raf); this._raf = 0; } if (typeof TouchUI !== 'undefined' && IS_TOUCH) TouchUI.update(); },

  resize() {
    const wrap = this.root ? null : null;
    const canvas = $('skinCanvas');
    if (!canvas || !this.renderer) return;
    const r = canvas.parentElement.getBoundingClientRect();
    const w = Math.max(120, Math.round(r.width)), h = Math.max(120, Math.round(r.height));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  },

  /* the preview targets: the gun, the player holding it, or the MECH CHASSIS
     (which has its own set of skins unlocked by mech achievements). */
  renderTargets() {
    const el = $('skinTargetChips');
    if (!el) return;
    const galOn = Store.data.skinChar === 'galaxy';
    el.innerHTML = '<button data-t="weapon"' + (this.target === 'weapon' ? ' class="on"' : '') + '>ОРУЖИЕ</button>' +
      '<button data-t="player"' + (this.target === 'player' ? ' class="on"' : '') + '>ПЕРСОНАЖ</button>' +
      '<button data-t="mech"' + (this.target === 'mech' ? ' class="on"' : '') + '>МЕХ</button>' +
      '<button data-t="galchar"' + (galOn ? ' class="on"' : '') + ' style="margin-left:8px">ГАЛАКТИКА: ' + (galOn ? 'ВКЛ' : 'ВЫКЛ') + '</button>';
    Array.from(el.children).forEach(b => b.addEventListener('click', () => {
      if (b.dataset.t === 'galchar') {
        if (!(Store.data.ach || {})['platinum_all']) { UI.toast('Скин открывается за достижение «ВЛАДЫКА ГАЛАКТИКИ»', '#d896ff'); Audio3D_SFX.deny(); return; }
        Store.data.skinChar = Store.data.skinChar === 'galaxy' ? '' : 'galaxy';
        Store.save(); this.renderTargets(); this.rebuild();
        Audio3D_SFX.uiClick(); return;
      }
      this.target = b.dataset.t; this.renderTargets(); this.renderWeaponList(); this.renderGrid(); this.rebuild();
    }));
  },

  renderWeaponList() {
    const sel = $('skinWeaponSel');
    if (!sel) return;
    if (this.target === 'mech') {
      /* для меха выбор оружия не нужен — прячем поле и показываем подпись */
      sel.style.display = 'none';
      const fld = sel.closest ? sel.closest('.skin-fld') : null;
      if (fld) { fld.dataset._hide = '1'; fld.style.display = 'none'; }
      return;
    }
    const fld = sel.closest ? sel.closest('.skin-fld') : null;
    if (fld && fld.dataset._hide) { fld.style.display = ''; delete fld.dataset._hide; }
    sel.style.display = '';
    const list = this.weapons();
    if (list.indexOf(this.weaponId) < 0) this.weaponId = list[0];
    sel.innerHTML = list.map(id => '<option value="' + id + '"' + (id === this.weaponId ? ' selected' : '') + '>' + U.esc(WEAPONS[id].name) + '</option>').join('');
    sel.onchange = () => { this.weaponId = sel.value; this.rebuild(); };
  },

  renderGrid() {
    const el = $('skinGrid');
    if (!el) return;
    if (this.target === 'mech') return this.renderMechGrid(el);
    const ach = Store.data.ach || {};
    const skinOn = Store.data.skinOn = Store.data.skinOn || {};
    el.innerHTML = SKINS.filter(sk => !sk.mech).map(sk => {
      const unlocked = !!ach[sk.ach];
      const on = skinOn[this.weaponId] === sk.id;
      const swatch = '#' + sk.glow.toString(16).padStart(6, '0');
      const rcol = rarityHex(sk.rarity);
      return '<div class="skincard rar-' + sk.rarity + (unlocked ? '' : ' locked') + (on ? ' on' : '') + '" data-sk="' + sk.id + '"' +
        ' style="border-left-color:' + rcol + '">' +
        '<b><span class="sw" style="background:' + swatch + '"></span>' + U.esc(sk.name.replace('СКИН · ', '')) + '</b>' +
        '<u class="rar" style="color:' + rcol + '">' + U.esc(sk.rarityLabel) + '</u>' +
        '<i>' + (unlocked ? (on ? 'ВЫБРАН' : 'ОТКРЫТ · нажмите') : '🔒 ' + U.esc(ACHIEVEMENTS.find(a => a.id === sk.ach).desc)) + '</i></div>';
    }).join('');
    Array.from(el.children).forEach(card => card.addEventListener('click', () => {
      const skid = card.dataset.sk;
      const sk = skinById(skid);
      const unlocked = !!(Store.data.ach || {})[sk.ach];
      if (!unlocked) { UI.toast('Скин закрыт: ' + ACHIEVEMENTS.find(a => a.id === sk.ach).name, '#f5d33c'); Audio3D_SFX.deny(); return; }
      // clicking the active skin removes it, otherwise equip it
      if (Store.data.skinOn[this.weaponId] === skid) delete Store.data.skinOn[this.weaponId];
      else Store.data.skinOn[this.weaponId] = skid;
      Store.save();
      Audio3D_SFX.uiClick();
      this.skinId = Store.data.skinOn[this.weaponId] || null;
      this.renderGrid(); this.rebuild();
      const el2 = $('skinStatus');
      if (el2) el2.textContent = Store.data.skinOn[this.weaponId] ? ('Надет: ' + sk.name + ' · ' + sk.rarityLabel) : 'Скин снят';
      if (Game && Game.player) Game.player.buildViewModel();
    }));
  },

  /* сетка МЕХ-скинов: открываются мех-достижениями, надеваются на мехакостюм */
  renderMechGrid(el) {
    const ach = Store.data.ach || {};
    const cur = Store.data.mechSkin || '';
    el.innerHTML = MECH_SKINS.map(sk => {
      const unlocked = !sk.ach || !!ach[sk.ach];
      const on = cur === sk.id || (!sk.ach && !cur);
      const swatch = '#' + sk.accent.toString(16).padStart(6, '0');
      const rcol = rarityHex(sk.rarity);
      const achDef = sk.ach ? ACHIEVEMENTS.find(a => a.id === sk.ach) : null;
      const hint = !sk.ach ? 'Стандартная раскраска меха' : (unlocked ? (on ? 'ВЫБРАН' : 'ОТКРЫТ · нажмите') : '🔒 ' + achDef.desc);
      return '<div class="skincard rar-' + sk.rarity + (unlocked ? '' : ' locked') + (on ? ' on' : '') + '" data-ms="' + sk.id + '"' +
        ' style="border-left-color:' + rcol + '">' +
        '<b><span class="sw" style="background:' + swatch + '"></span>' + U.esc(sk.name) + '</b>' +
        '<u class="rar" style="color:' + rcol + '">' + U.esc(SKIN_RARITIES[sk.rarity].label) + '</u>' +
        '<i>' + hint + '</i></div>';
    }).join('');
    Array.from(el.children).forEach(card => card.addEventListener('click', () => {
      const skid = card.dataset.ms;
      const sk = mechSkinById(skid);
      if (!sk) return;
      const unlocked = !sk.ach || !!ach[sk.ach];
      if (!unlocked) { UI.toast('Скин меха закрыт: ' + ACHIEVEMENTS.find(a => a.id === sk.ach).name, '#f5d33c'); Audio3D_SFX.deny(); return; }
      // повторное нажатие на стандартный/надетый скин снимает выбор
      if (Store.data.mechSkin === skid) Store.data.mechSkin = '';
      else Store.data.mechSkin = skid;
      Store.save();
      Audio3D_SFX.uiClick();
      Game && Game.applyMechSkinEverywhere && Game.applyMechSkinEverywhere();
      this.renderGrid(); this.rebuild();
      const el2 = $('skinStatus');
      const worn = mechSkinById(Store.data.mechSkin);
      if (el2) el2.textContent = worn ? ('Надет на меха: ' + worn.name) : 'Стандартная раскраска меха';
    }));
  },

  rebuild() {
    if (!this._base) return;
    while (this._base.children.length) { const c = this._base.children[0]; this._base.remove(c); disposeGroup(c); }
    const skinId = Store.data.skinOn[this.weaponId];
    const skin = skinId ? skinById(skinId) : null;
    if (this.target === 'mech') {
      /* полное шасси меха, раскрашенное надетым мех-скином */
      const mech = buildMechChassis();
      const p = mech.userData && mech.userData.pilot;
      if (p) p.visible = true;                 // в превью пилот виден
      this._base.add(mech);
      this._modelH = 4.2; this._centerY = 1.9;
    } else if (this.target === 'player') {
      // a soldier holding the previewed weapon, so the skin is seen in context
      const soldier = buildSoldierMesh('ct');
      if (Store.data.skinChar === 'galaxy' && typeof applyGalaxyCharacter === 'function') applyGalaxyCharacter(soldier);
      const gun = buildWeaponModel(this.weaponId);
      if (skin) applyWeaponSkin(gun, skin);
      const armR = soldier.userData.parts && soldier.userData.parts.armR;
      if (armR) {
        // show the soldier HOLDING the gun with both hands, using the same pose
        // as the remote players, instead of a gun glued to one arm
        const hp = (typeof weaponHoldPose === 'function') ? weaponHoldPose(this.weaponId) : { wpos: { x: .02, y: -.50, z: 0 }, wrot: { x: -Math.PI / 2, y: 0, z: 0 }, scale: .95, reachL: 1.5, reachR: 1.32, yawL: .4, yawR: -.1, elbowR: .55, elbowL: .95 };
        const pp = soldier.userData.parts;
        const handR = (pp.armR && pp.armR.userData && pp.armR.userData.lower) ? pp.armR.userData.lower : armR;
        gun.position.set(hp.wpos.x, hp.wpos.y, hp.wpos.z);
        gun.rotation.set(-Math.PI / 2 - (hp.elbowR || 0), hp.wrot.y, hp.wrot.z);
        gun.scale.setScalar(hp.scale);
        handR.add(gun);
        if (pp.armR) { pp.armR.rotation.x = hp.reachR; pp.armR.rotation.y = hp.yawR; if (pp.armR.userData && pp.armR.userData.lower) pp.armR.userData.lower.rotation.x = hp.elbowR || .55; }
        if (pp.armL) { pp.armL.rotation.x = hp.reachL; pp.armL.rotation.y = hp.yawL; pp.armL.rotation.z = .1; if (pp.armL.userData && pp.armL.userData.lower) pp.armL.userData.lower.rotation.x = hp.elbowL || .95; }
      }
      this._base.add(soldier);
      this._modelH = 2.0; this._centerY = 1.0;
    } else {
      const gun = buildWeaponModel(this.weaponId);
      if (skin) applyWeaponSkin(gun, skin);
      this._base.add(gun);
      this._modelH = .6; this._centerY = 0;
    }
  },

  loop() {
    this._raf = requestAnimationFrame(() => this.loop());
    if (UI.current !== 'skins' || !this.renderer) { this._raf && cancelAnimationFrame(this._raf); this._raf = 0; return; }
    this.resize();
    // animate galaxy skins in the preview (rings / dust / character)
    if (this._base) for (const c of this._base.children) {
      if (typeof animateGalaxySkin === 'function') animateGalaxySkin(c, 1 / 60);
      if (typeof animateGalaxyCharacter === 'function') animateGalaxyCharacter(c, 1 / 60);
      if (typeof animateFleshSkin === 'function') animateFleshSkin(c, 1 / 60);
    }
    // idle auto-spin plus manual rotation
    if (!this.dragging) this._spin += .004;
    this.root.rotation.y = this.rotY + this._spin;
    this.root.rotation.x = this.rotX;
    // frame the model: pull the camera back so tall (player) models fit
    const fit = this.target === 'mech' ? 2.2 : this.target === 'player' ? 2.6 : 1.35;
    this.camera.position.set(0, .1, this.dist * fit);
    this.camera.lookAt(0, this._centerY || 0, 0);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
  }
};

/* ---- глобальный помощник: перерисовать список «Мои карты» (редактор) ---- */
function uiRefreshCustomMaps() {
  try { if (typeof UI !== 'undefined') { UI.buildMyMaps(); UI.refreshChips(); } } catch (e) { }
}
window.uiRefreshCustomMaps = uiRefreshCustomMaps;
