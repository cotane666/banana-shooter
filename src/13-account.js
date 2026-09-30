/* ============================================================
   13 — АККАУНТ (Supabase): вход по email/паролю и перенос прогресса
   ============================================================
   Игра — статический сайт, поэтому нужен облачный бэкенд. Используется
   Supabase (Auth + REST). Настройки проекта хранятся в localStorage
   (`cs3d.cloud.v1`): url, anonKey, включено/выключено.

   ЧТО СИНХРОНИЗИРУЕТСЯ (прогресс, переносится между устройствами):
     • достижения (Store.data.ach)          • рекорды забегов (runs)
     • надетые скины (skinOn, skinChar)     • чекпойнты забегов (checkpoints)
     • статистика: лучший счёт, лучшая волна, убийства, победы, время и т.д.
   ЛОКАЛЬНЫЕ НАСТРОЙКИ (чувствительность, графика, звук) НЕ переносятся —
   у каждого устройства они свои.

   Слияние всегда безопасное (ничего не теряется): достижения/скины/чекпойнты
   объединяются, числовая статистика берёт максимум.
   ============================================================ */

/* ---- SHA-256 (для хранения только ХЕША пароля, не самого пароля) ---- */
async function _sha256Hex(str) {
  try {
    const buf = new TextEncoder().encode(str);
    const dig = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(dig)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) { return null; }
}

const ACCOUNT = {
  /* Встроенные значения проекта Supabase — чтобы игрокам ничего не настраивать.
     anon-ключ ПУБЛИЧНЫЙ по замыслу, доступ к данным ограничен RLS-политиками.
     При необходимости можно переопределить в «Настройке облака» в игре. */
  DEFAULTS: {
    url: 'https://uwoidtyrntpfrdhbqicj.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3b2lkdHlybnRwZnJkaGJxaWNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3MzA2OTMsImV4cCI6MjEwNjMwNjY5M30.RwMK_k0vuljXLxzGEoo8EKYgZ9T9jdHbKtoUZt8KN6A'
  },
  cfg: { url: '', anonKey: '', enabled: false },
  session: null,          // { access_token, refresh_token, user:{id,email} }
  user: null,
  nickname: '',
  busy: false,
  _syncT: 0,
  _hash: null,            // хеш пароля (для автопривязки прогресса по нику)

  /* ---------- конфигурация облака ---------- */
  loadCfg() {
    // сначала встроенные значения, затем возможные переопределения
    this.cfg.url = this.DEFAULTS.url || '';
    this.cfg.anonKey = this.DEFAULTS.anonKey || '';
    try {
      const raw = localStorage.getItem('cs3d.cloud.v1');
      if (raw) {
        const saved = JSON.parse(raw);
        // не затираем встроенный проект пустыми значениями из старого localStorage
        if (saved && saved.url) this.cfg.url = saved.url;
        if (saved && saved.anonKey) this.cfg.anonKey = saved.anonKey;
      }
      const s = localStorage.getItem('cs3d.session.v1');
      if (s) this.session = JSON.parse(s);
    } catch (e) { }
    this.cfg.enabled = this.configured();
    return this.cfg;
  },
  saveCfg() {
    try { localStorage.setItem('cs3d.cloud.v1', JSON.stringify(this.cfg)); } catch (e) { }
  },
  saveSession() {
    try {
      if (this.session) localStorage.setItem('cs3d.session.v1', JSON.stringify(this.session));
      else localStorage.removeItem('cs3d.session.v1');
    } catch (e) { }
  },
  configured() { return !!(this.cfg.url && this.cfg.anonKey); },

  /* ---------- низкоуровневые запросы ---------- */
  headers(auth) {
    const h = { 'apikey': this.cfg.anonKey, 'Content-Type': 'application/json' };
    if (auth) h['Authorization'] = 'Bearer ' + auth;
    else h['Authorization'] = 'Bearer ' + this.cfg.anonKey;
    return h;
  },
  async _req(method, path, body, authToken) {
    if (!this.configured()) throw new Error('Облако не настроено');
    const url = this.cfg.url.replace(/\/+$/, '') + path;
    const res = await fetch(url, {
      method,
      headers: this.headers(authToken),
      body: body ? JSON.stringify(body) : undefined
    });
    let data = null;
    try { data = await res.json(); } catch (e) { }
    if (!res.ok) {
      const msg = (data && (data.error_description || data.msg || data.message || data.error)) || ('Ошибка ' + res.status);
      const err = new Error(msg); err.status = res.status; err.data = data;
      throw err;
    }
    return data;
  },

  /* ---------- авторизация ---------- */
  async signUp(email, password, nick) {
    // ссылка из письма должна возвращать в игру, а не на localhost
    let redirect = '';
    try { redirect = location.origin + location.pathname; } catch (e) { }
    const q = redirect ? ('?redirect_to=' + encodeURIComponent(redirect)) : '';
    const data = await this._req('POST', '/auth/v1/signup' + q, {
      email: email, password: password, data: { nick: nick || '' }
    });
    // при включённом подтверждении email сессии не будет — сообщаем об этом
    if (data && data.access_token) { this._setSession(data); return { ok: true, session: true }; }
    return { ok: true, session: false };
  },
  async signIn(email, password) {
    const data = await this._req('POST', '/auth/v1/token?grant_type=password', { email: email, password: password });
    this._setSession(data);
    return { ok: true };
  },
  _setSession(data) {
    if (!data || !data.access_token) return;
    this.session = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + (data.expires_in || 3600) * 1000,
      user: data.user || null
    };
    this.user = this.session.user;
    this.saveSession();
    this._hash = this.session.user && this.session.user.id ? this.session.user.id : this._hash;
  },
  async refresh() {
    if (!this.session || !this.session.refresh_token) return false;
    try {
      const data = await this._req('POST', '/auth/v1/token?grant_type=refresh_token', { refresh_token: this.session.refresh_token });
      this._setSession(data);
      return true;
    } catch (e) { this.signOutLocal(); return false; }
  },
  async ensureFresh() {
    if (!this.session) return false;
    if (this.session.expires_at && Date.now() > this.session.expires_at - 60000) return await this.refresh();
    return true;
  },
  signOutLocal() {
    this.session = null; this.user = null;
    this.saveSession();
  },
  async signOut() {
    try { if (this.session) await this._req('POST', '/auth/v1/logout', null, this.session.access_token); } catch (e) { }
    this.signOutLocal();
    // локальный прогресс остаётся на устройстве — ничего не удаляем
  },

  /* ---------- облачное хранилище прогресса ---------- */
  progressSubset() {
    const d = Store.data;
    return {
      ach: d.ach || {},
      runs: d.runs || [],
      skinOn: d.skinOn || {},
      skinChar: d.skinChar || '',
      checkpoints: d.checkpoints || {},
      best: d.best || 0, bestWave: d.bestWave || 0, killsTotal: d.killsTotal || 0,
      matches: d.matches || 0, wins: d.wins || 0, signalSrv: d.signalSrv || 0,
      aimBest: d.aimBest || 0, clears: d.clears || 0, playTime: d.playTime || 0,
      offModsRun: d.offModsRun || 0, offModPick: d.offModPick || 0,
      meta: { nick: this.nickname || Store.data.name || '', updated: Date.now() }
    };
  },
  async push() {
    if (!this.session || !this.user) return false;
    await this.ensureFresh();
    const row = { user_id: this.user.id, data: this.progressSubset(), updated_at: new Date().toISOString() };
    await this._req('POST', '/rest/v1/player_saves', row, this.session.access_token);
    return true;
  },
  async pull() {
    if (!this.session || !this.user) return null;
    await this.ensureFresh();
    const rows = await this._req('GET', '/rest/v1/player_saves?user_id=eq.' + encodeURIComponent(this.user.id) + '&select=data', null, this.session.access_token);
    if (Array.isArray(rows) && rows.length) return rows[0].data || null;
    return null;
  },

  /* ---------- безопасное слияние ---------- */
  mergeRemote(remote) {
    if (!remote) return false;
    const d = Store.data;
    let changed = false;
    // достижения, скины, чекпойнты — объединение
    const mergeObj = (key) => {
      const local = d[key] || {}, cloud = remote[key] || {};
      const out = Object.assign({}, cloud, local);
      if (Object.keys(out).length !== Object.keys(local).length) { d[key] = out; changed = true; }
      else { d[key] = out; }
    };
    mergeObj('ach'); mergeObj('skinOn'); mergeObj('checkpoints');
    if (remote.skinChar && remote.skinChar !== d.skinChar) { d.skinChar = remote.skinChar; changed = true; }
    // числовая статистика — максимум (никогда не уменьшаем)
    const nums = ['best', 'bestWave', 'killsTotal', 'matches', 'wins', 'signalSrv', 'aimBest', 'clears', 'playTime', 'offModsRun', 'offModPick'];
    nums.forEach(k => { const v = remote[k] || 0; if (v > (d[k] || 0)) { d[k] = v; changed = true; } });
    // рекорды забегов — объединение без дублей, топ-50
    if (Array.isArray(remote.runs) && remote.runs.length) {
      const seen = {};
      const all = [];
      (d.runs || []).concat(remote.runs).forEach(r => {
        const key = JSON.stringify([r && r.score, r && r.wave, r && r.mode, r && r.date]);
        if (!seen[key]) { seen[key] = 1; all.push(r); }
      });
      all.sort((a, b) => (b.score || 0) - (a.score || 0));
      d.runs = all.slice(0, 50);
      changed = true;
    }
    if (changed) { Store.save(); this._refreshUI(); }
    return changed;
  },

  /* ---------- сценарии ---------- */
  async register(email, password, nick) {
    if (!this.configured()) throw new Error('Облако не настроено — откройте «Настройка облака»');
    const r = await this.signUp(email, password, nick);
    if (!r.session) return { needConfirm: true };
    // привязываем текущий локальный прогресс к новому аккаунту
    await this.push();
    return { ok: true };
  },
  async login(email, password) {
    if (!this.configured()) throw new Error('Облако не настроено — откройте «Настройка облака»');
    await this.signIn(email, password);
    // первым делом подтягиваем облако и сливаем с локальным, затем отправляем обратно
    const remote = await this.pull();
    this.mergeRemote(remote);
    await this.push();
    return { ok: true };
  },
  async syncNow() {
    if (!this.session) throw new Error('Нужно войти');
    const remote = await this.pull();
    this.mergeRemote(remote);
    await this.push();
    return true;
  },
  scheduleSync() {
    if (!this.session || this._syncT) return;
    this._syncT = setTimeout(() => {
      this._syncT = 0;
      if (!this.session) return;
      this.push().catch(() => { });
    }, 4000);
  },

  /* ---------- локальная автопривязка прогресса ----------
     Прогресс каждого игрока хранится в его браузере. Чтобы при входе с другого
     устройства данные не «перепутались» (у всех один и тот же ключ
     localStorage), сохраняем ХЕШ пароля и показываем его рядом с ником. */
  async bindLocalHash(nick, email, password) {
    const h = await _sha256Hex('bs|' + (email || '') + '|' + (password || '') + '|' + (nick || ''));
    this._hash = h;
    try {
      const map = JSON.parse(localStorage.getItem('cs3d.binds.v1') || '{}');
      map[nick || 'me'] = h;
      localStorage.setItem('cs3d.binds.v1', JSON.stringify(map));
      localStorage.setItem('cs3d.lastbind.v1', h);
    } catch (e) { }
    return h;
  },
  currentHash() { try { return localStorage.getItem('cs3d.lastbind.v1') || ''; } catch (e) { return ''; } },

  /* ---------- UI ---------- */
  init() {
    this.loadCfg();
    this.nickname = Store.data.name || '';
    this._wire();
    this._render();
    // токен истекает через час — тихо обновляем при старте
    if (this.session) this.ensureFresh().then(() => this._render()).catch(() => { });
    // обработка возврата по ссылке из письма (если подтверждение почты включено)
    try {
      const q = new URLSearchParams(location.search);
      const hash = (location.hash || '').replace(/^#/, '');
      const hp = new URLSearchParams(hash);
      if (hp.get('access_token')) {
        // implicit-поток: токены прямо в хеше
        this._setSession({
          access_token: hp.get('access_token'),
          refresh_token: hp.get('refresh_token'),
          expires_in: parseInt(hp.get('expires_in') || '3600', 10)
        });
        if (UI.toast) UI.toast('Вход подтверждён', '#57d16a');
        this.pull().then(r => this.mergeRemote(r)).catch(() => { });
      } else if (q.get('code') && this.configured()) {
        this._req('POST', '/auth/v1/token?grant_type=pkce', { auth_code: q.get('code') })
          .then(d => { this._setSession(d); this._render(); if (UI.toast) UI.toast('Почта подтверждена', '#57d16a'); })
          .catch(() => { });
      }
    } catch (e) { }
  },

  _wire() {
    const byId = id => document.getElementById(id);
    const on = (id, fn, ev) => { const e = byId(id); if (e) e.addEventListener(ev || 'click', e2 => { e2.preventDefault(); fn(e2); }); };

    on('btnAccount', () => this.open());
    on('btnAccountBack', () => UI.show('menu'));
    on('btnAccCloud', () => this._toggleCloudForm());
    on('btnAccCloudSave', () => this._saveCloudForm());
    on('btnAccLogin', () => this._doLogin());
    on('btnAccRegister', () => this._doRegister());
    on('btnAccSync', () => this._doSync());
    on('btnAccOut', () => this._doOut());
    on('btnAccCopyHash', () => {
      const h = this.currentHash();
      try { navigator.clipboard.writeText(h); if (UI.toast) UI.toast('Код прогресса скопирован', '#57d16a'); }
      catch (e) { if (UI.toast) UI.toast('Код: ' + h); }
    });
    // Enter в полях — вход
    ['accEmail', 'accPass'].forEach(id => {
      const e = byId(id);
      if (e) e.addEventListener('keydown', ev => { if (ev.key === 'Enter') this._doLogin(); });
    });
  },

  _toggleCloudForm() {
    const f = document.getElementById('accCloudForm');
    if (f) f.classList.toggle('hidden');
    const u = document.getElementById('accUrl'), k = document.getElementById('accKey');
    if (u) u.value = this.cfg.url || '';
    if (k) k.value = this.cfg.anonKey || '';
  },
  _saveCloudForm() {
    const u = document.getElementById('accUrl'), k = document.getElementById('accKey');
    this.cfg.url = (u ? u.value : '').trim();
    this.cfg.anonKey = (k ? k.value : '').trim();
    this.cfg.enabled = this.configured();
    this.saveCfg();
    if (UI.toast) UI.toast(this.configured() ? 'Облако подключено' : 'Заполните URL и ключ', this.configured() ? '#57d16a' : '#e33a2e');
    this._render();
  },

  open() {
    this._render();
    UI.show('account');
  },

  _status(msg, color) {
    const el = document.getElementById('accStatus');
    if (el) { el.textContent = msg || ''; el.style.color = color || ''; }
  },

  async _doRegister() {
    if (this.busy) return;
    const email = (document.getElementById('accEmail') || {}).value || '';
    const pass = (document.getElementById('accPass') || {}).value || '';
    const nick = (document.getElementById('accNick') || {}).value || Store.data.name || '';
    if (!email || pass.length < 6) { this._status('Введите почту и пароль (от 6 символов)', '#e33a2e'); return; }
    this.busy = true; this._status('Создаём аккаунт…');
    try {
      const h = await this.bindLocalHash(nick, email, pass);
      const r = await this.register(email, pass, nick);
      if (r.needConfirm) this._status('Аккаунт создан. Подтвердите почту по ссылке, затем войдите.', '#ff9d21');
      else this._status('Готово! Прогресс привязан к аккаунту.', '#57d16a');
      if (typeof Store !== 'undefined') { Store.data.name = nick; Store.save(); }
      this._render();
    } catch (e) { this._status('Ошибка: ' + e.message, '#e33a2e'); }
    this.busy = false;
  },

  async _doLogin() {
    if (this.busy) return;
    const email = (document.getElementById('accEmail') || {}).value || '';
    const pass = (document.getElementById('accPass') || {}).value || '';
    const nick = (document.getElementById('accNick') || {}).value || Store.data.name || '';
    if (!email || !pass) { this._status('Введите почту и пароль', '#e33a2e'); return; }
    this.busy = true; this._status('Входим и синхронизируем…');
    try {
      await this.bindLocalHash(nick, email, pass);
      await this.login(email, pass);
      this._status('Вошли. Прогресс синхронизирован.', '#57d16a');
      this._render();
    } catch (e) { this._status('Не удалось войти: ' + e.message, '#e33a2e'); }
    this.busy = false;
  },

  async _doSync() {
    if (this.busy) return;
    this.busy = true; this._status('Синхронизация…');
    try { await this.syncNow(); this._status('Синхронизировано.', '#57d16a'); }
    catch (e) { this._status('Ошибка: ' + e.message, '#e33a2e'); }
    this.busy = false;
  },

  async _doOut() {
    await this.signOut();
    this._status('Вы вышли. Локальный прогресс на месте.', '#ff9d21');
    this._render();
  },

  _refreshUI() {
    try { if (typeof UI !== 'undefined') { UI.renderMenuStats && UI.renderMenuStats(); UI.refreshChips && UI.refreshChips(); } } catch (e) { }
  },

  _render() {
    const loggedIn = !!(this.session && this.user);
    const authBox = document.getElementById('accAuthBox');
    const inBox = document.getElementById('accInBox');
    if (authBox) authBox.classList.toggle('hidden', loggedIn);
    if (inBox) inBox.classList.toggle('hidden', !loggedIn);

    const cloudTag = document.getElementById('accCloudTag');
    if (cloudTag) {
      cloudTag.textContent = this.configured() ? 'Облако подключено' : 'Облако не настроено';
      cloudTag.style.color = this.configured() ? '#57d16a' : '#e33a2e';
    }
    // встроенный проект уже настроен — форму показываем только по кнопке
    const cloudHint = document.getElementById('accCloudHint');
    if (cloudHint) cloudHint.classList.toggle('hidden', !this.configured());
    const who = document.getElementById('accWho');
    if (who) {
      const email = loggedIn ? (this.user.email || 'аккаунт') : '';
      who.innerHTML = loggedIn
        ? '<b>' + U.esc(email) + '</b><i>прогресс синхронизируется автоматически</i>'
        : '';
    }
    const hash = this.currentHash();
    const hashOut = document.getElementById('accHash');
    if (hashOut) hashOut.textContent = hash ? hash.slice(0, 16) + '…' : '—';

    // подпись кнопки в меню
    const btn = document.getElementById('btnAccount');
    if (btn) {
      btn.innerHTML = loggedIn
        ? '<b>АККАУНТ</b><i>Вошли: ' + U.esc(this.user.email || '') + ' · синхронизация включена</i>'
        : '<b>АККАУНТ</b><i>Вход по почте · перенос достижений и скинов между устройствами</i>';
    }
    const nick = document.getElementById('accNick');
    if (nick && !nick.value) nick.value = this.nickname || Store.data.name || '';
    const e0 = document.getElementById('accEmail');
    if (e0 && loggedIn && this.user.email) e0.value = this.user.email;
  }
};
