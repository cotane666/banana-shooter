/* ============================================================
   11 — NET: peer-to-peer duels over WebRTC (PeerJS / DataChannel)
   The host is authoritative for round flow & scoring.
   Movement is peer-to-peer; shots are resolved by the shooter.
   ============================================================ */

const PEER_PREFIX = 'cs3d1-';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/* Signalling is only used to introduce the two browsers; the match itself runs
   peer-to-peer over WebRTC. The public PeerJS cloud (0.peerjs.com) is blocked
   by Cloudflare in many regions, so we keep a list of servers and fall back to
   the next one whenever the current one is unreachable. */
const SIGNAL_SERVERS = [
  { host: 'peerjs-server.onrender.com', port: 443, secure: true, path: '/' },
  { host: '0.peerjs.com', port: 443, secure: true, path: '/' },
  { host: 'peerjs.92k.de', port: 443, secure: true, path: '/' }
];
/* How long to wait for one signalling server before trying the next. */
const SIGNAL_TIMEOUT = 9000;

const Net = {
  peer: null,
  conn: null,
  role: CS.NETROLE.NONE,       // HOST | CLIENT
  code: '',
  name: 'Игрок',
  connected: false,
  connecting: false,
  ping: 0,
  lastPingSent: 0,
  rttSamples: [],
  latency: 0,
  _handlers: {},
  _closedByUser: false,
  _srv: 0,                     // index into SIGNAL_SERVERS

  /* ---------- helpers ---------- */
  makeCode() {
    let s = '';
    for (let i = 0; i < 5; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    return s;
  },

  peerOptions() {
    const srv = SIGNAL_SERVERS[this._srv] || SIGNAL_SERVERS[0];
    return {
      debug: 0,
      host: srv.host,
      port: srv.port,
      secure: srv.secure,
      path: srv.path,
      config: {
        // STUN discovers each player's public address; TURN relays the traffic
        // when both players sit behind strict NATs. The TURN entries below are
        // OpenRelay's free public server — no account needed.
        iceServers: [
          { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
          { urls: 'stun:global.stun.twilio.com:3478' },
          {
            urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443'],
            username: 'openrelayproject',
            credential: 'openrelayproject',
            credentialType: 'password'
          },
          {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject',
            credentialType: 'password'
          }
        ],
        iceCandidatePoolSize: 4,
        sdpSemantics: 'unified-plan'
      }
    };
  },

  /* Render's free tier sleeps after inactivity; the first WebSocket open can
     take ~30s. Fetching the id endpoint wakes the server while the player is
     still reading the lobby, so pressing "Создать игру" answers quickly. */
  warmup() {
    const srv = SIGNAL_SERVERS[this._srv] || SIGNAL_SERVERS[0];
    try {
      const url = 'https://' + srv.host + (srv.path === '/' ? '/peerjs/id' : srv.path + '/id');
      fetch(url + '?ts=' + Date.now(), { cache: 'no-store', mode: 'no-cors' }).catch(() => { });
    } catch (e) { }
  },

  on(type, fn) { (this._handlers[type] = this._handlers[type] || []).push(fn); },
  emit(type, data) {
    const l = this._handlers[type];
    if (l) for (let i = 0; i < l.length; i++) { try { l[i](data); } catch (e) { console.warn('net handler', type, e); } }
  },

  /* ---------- host ---------- */
  host(name, onReady, onError) {
    this.role = CS.NETROLE.HOST;
    this.name = name;
    this._closedByUser = false;
    this.code = this.makeCode();
    this._srv = this.preferredServer();
    this._createPeer(PEER_PREFIX + this.code, onReady, onError, 0, 0);
  },

  /* Both players should meet on the same signalling server, so remember the
     last one that actually worked and start from it next time. */
  preferredServer() {
    let i = Store && Store.data ? parseInt(Store.data.signalSrv, 10) : 0;
    if (!(i >= 0 && i < SIGNAL_SERVERS.length)) i = 0;
    return i;
  },
  rememberServer(i) {
    if (Store && Store.data) { Store.data.signalSrv = i; try { Store.save(); } catch (e) { } }
  },
  /* move to the next signalling server; false when the list is exhausted */
  _nextServer() {
    if (this._srv + 1 >= SIGNAL_SERVERS.length) return false;
    this._srv++;
    return true;
  },

  _createPeer(id, onReady, onError, attempt, srvTry) {
    if (this.peer) { try { this.peer.destroy(); } catch (e) { } }
    this.connecting = true;
    let peer;
    try {
      peer = new Peer(id, this.peerOptions());
    } catch (e) {
      this.connecting = false;
      onError && onError('Не удалось инициализировать сеть: ' + e.message);
      return;
    }
    this.peer = peer;
    let settled = false;

    // a signalling server that never answers (blocked, down) must not leave the
    // player staring at "Ожидание" forever — try the next one automatically
    const tryNextServer = msg => {
      if (settled || this._closedByUser) return;
      settled = true;
      try { peer.destroy(); } catch (e) { }
      if (this._nextServer()) {
        this._createPeer(id, onReady, onError, attempt, srvTry + 1);
      } else {
        this.connecting = false;
        onError && onError(msg);
      }
    };

    peer.on('open', pid => {
      settled = true;
      this.connecting = false;
      this.peerId = pid;
      this.rememberServer(this._srv);
      onReady && onReady(pid);
    });

    peer.on('connection', conn => {
      if (this.conn && this.conn.open) {
        // already have a partner — politely refuse extras
        try { conn.close(); } catch (e) { }
        return;
      }
      this._setupConn(conn);
    });

    peer.on('error', err => {
      const t = err && err.type;
      if (settled) return;
      if (t === 'unavailable-id' && this.role === CS.NETROLE.HOST && attempt < 5) {
        settled = true;
        this.code = this.makeCode();
        this._createPeer(PEER_PREFIX + this.code, onReady, onError, attempt + 1, srvTry);
        return;
      }
      if (t === 'peer-unavailable') {
        settled = true;
        this.connecting = false;
        onError && onError('Комната не найдена. Проверьте код.');
        return;
      }
      if (t === 'network' || t === 'server-error' || t === 'socket-error') {
        tryNextServer('Сервер знакомства недоступен. Проверьте интернет.');
        return;
      }
      if (t === 'browser-incompatible') {
        settled = true;
        onError && onError('Браузер не поддерживает WebRTC.');
        return;
      }
      settled = true;
      this.connecting = false;
      onError && onError('Ошибка сети: ' + (err.message || t || 'неизвестно'));
    });

    peer.on('disconnected', () => {
      // try to keep the signalling socket alive
      if (!this._closedByUser && this.peer && !this.peer.destroyed) {
        try { this.peer.reconnect(); } catch (e) { }
      }
    });
    peer.on('close', () => {
      if (!this._closedByUser) this.emit('closed', {});
    });
    // connection timeout guard
    setTimeout(() => {
      if (!settled && this.peer === peer && !this.connected) {
        tryNextServer('Не удалось подключиться к серверу знакомства (тайм-аут).');
      }
    }, SIGNAL_TIMEOUT);
  },

  /* ---------- client ---------- */
  join(code, name, onError) {
    this.role = CS.NETROLE.CLIENT;
    this.name = name;
    this.code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    this._closedByUser = false;
    if (this.code.length < 4) { onError && onError('Неверный код комнаты.'); return; }
    this._srv = this.preferredServer();
    this._openJoin(onError);
  },

  _openJoin(onError) {
    this.connecting = true;
    let peer;
    try { peer = new Peer(null, this.peerOptions()); }
    catch (e) { this.connecting = false; onError && onError('Сеть недоступна: ' + e.message); return; }
    this.peer = peer;

    let settled = false;
    const fail = msg => { if (settled) return; settled = true; this.connecting = false; onError && onError(msg); };
    const tryNextServer = msg => {
      if (settled || this._closedByUser) return;
      settled = true;
      try { peer.destroy(); } catch (e) { }
      if (this._nextServer()) this._openJoin(onError);
      else { this.connecting = false; onError && onError(msg); }
    };

    peer.on('open', () => {
      this.rememberServer(this._srv);
      const conn = peer.connect(PEER_PREFIX + this.code, { reliable: true, serialization: 'json' });
      const to = setTimeout(() => { tryNextServer('Не удалось подключиться к хосту (тайм-аут).'); }, SIGNAL_TIMEOUT);
      conn.on('open', () => { clearTimeout(to); });
      this._setupConn(conn, () => { clearTimeout(to); });
    });
    peer.on('error', err => {
      const t = err && err.type;
      if (t === 'peer-unavailable') fail('Комната ' + this.code + ' не найдена. Проверьте код.');
      else if (t === 'network' || t === 'server-error' || t === 'socket-error') tryNextServer('Сервер знакомства недоступен. Проверьте интернет.');
      else fail('Ошибка сети: ' + (err.message || t));
    });

    // if the server accepts the socket but never answers, fall through too
    setTimeout(() => { if (!settled && !this.connected) tryNextServer('Сервер знакомства не отвечает. Попробуйте позже.'); }, SIGNAL_TIMEOUT + 4000);
  },

  _setupConn(conn, onOpenCb) {
    this.conn = conn;
    conn.on('open', () => {
      this.connected = true;
      this.connecting = false;
      this.startHeartbeat();
      onOpenCb && onOpenCb();
      this.send({ t: 'hello', name: this.name, role: this.role === CS.NETROLE.HOST ? 'host' : 'client', ver: CS.version });
      this.emit('connected', { role: this.role });
    });
    conn.on('data', raw => {
      let m = raw;
      if (typeof raw === 'string') { try { m = JSON.parse(raw); } catch (e) { return; } }
      if (!m || !m.t) return;
      this._handle(m);
    });
    conn.on('close', () => {
      const was = this.connected;
      this.connected = false;
      if (was) this.emit('disconnected', {});
    });
    conn.on('error', e => {
      this.emit('error', { message: (e && e.message) || 'Ошибка соединения' });
    });
  },

  /* ---------- messaging ---------- */
  send(msg) {
    if (!this.conn || !this.conn.open) return false;
    try { this.conn.send(msg); return true; } catch (e) { return false; }
  },

  _handle(m) {
    switch (m.t) {
      case 'hello':
        this.partnerName = m.name || 'Игрок';
        this.emit('hello', m);
        break;
      case 'ping':
        this.send({ t: 'pong', s: m.s, time: m.time });
        break;
      case 'pong': {
        const rtt = U.now() - m.time;
        this.rttSamples.push(rtt);
        if (this.rttSamples.length > 8) this.rttSamples.shift();
        this.ping = this.rttSamples.reduce((a, b) => a + b, 0) / this.rttSamples.length;
        break;
      }
      case 'state': this.emit('state', m); break;
      case 'shot': this.emit('shot', m); break;
      case 'hit': this.emit('hit', m); break;
      case 'died': this.emit('died', m); break;
      case 'respawn': this.emit('respawn', m); break;
      case 'round': this.emit('round', m); break;
      case 'score': this.emit('score', m); break;
      case 'chat': this.emit('chat', m); break;
      case 'bye': this.emit('bye', m); break;
      default: this.emit('message', m);
    }
  },

  tick(dt) {
    if (!this.connected) return;
    this.lastPingSent -= dt;
    if (this.lastPingSent <= 0) {
      this.lastPingSent = 1.0;
      this.send({ t: 'ping', s: 'p', time: U.now() });
    }
  },

  /* Keep the data channel warm from a timer rather than the render loop: when
     the tab is backgrounded (or the phone locks) requestAnimationFrame stops and
     tick() is never called, so the other side saw a silent peer and eventually
     dropped it. A 1 Hz heartbeat also gives a cheap liveness signal.
     `keepalive` is set by Game so a backgrounded tab still sends its state —
     otherwise the opponent's model would freeze while we are hidden. */
  startHeartbeat() {
    this.stopHeartbeat();
    this._hb = setInterval(() => {
      if (!this.connected) return;
      try { this.send({ t: 'ping', s: 'hb', time: U.now() }); } catch (e) { }
      try { if (this.keepalive) this.keepalive(); } catch (e) { }
    }, 1000);
  },
  stopHeartbeat() {
    if (this._hb) { clearInterval(this._hb); this._hb = null; }
  },

  close(notify) {
    this._closedByUser = true;
    this.stopHeartbeat();
    if (notify && this.connected) { try { this.send({ t: 'bye' }); } catch (e) { } }
    setTimeout(() => {
      try { if (this.conn) this.conn.close(); } catch (e) { }
      try { if (this.peer) this.peer.destroy(); } catch (e) { }
    }, notify ? 60 : 0);
    this.conn = null; this.peer = null;
    this.connected = false; this.connecting = false;
    this.role = CS.NETROLE.NONE;
    this.rttSamples.length = 0; this.ping = 0;
  }
};
