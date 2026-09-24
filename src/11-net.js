/* ============================================================
   11 — NET: peer-to-peer online brawls over WebRTC (PeerJS / DataChannel)
   The room is a star: one HOST, up to 3 CLIENTS (4 players total). The host is
   authoritative for round flow and match settings; clients talk only to the
   host, which relays player state so everyone sees the whole room.
   Movement is peer-to-peer through the host relay; shots are resolved by the
   shooter and reported to the host.
   ============================================================ */

const PEER_PREFIX = 'cs3d1-';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/* Signalling is only used to introduce the browsers; the match itself runs
   peer-to-peer over WebRTC. The public PeerJS cloud (0.peerjs.com) is blocked
   by Cloudflare in many regions, so we keep a list of servers and fall back to
   the next one whenever the current one is unreachable. */
const SIGNAL_SERVERS = [
  { host: 'peerjs-server.onrender.com', port: 443, secure: true, path: '/' },
  { host: '0.peerjs.com', port: 443, secure: true, path: '/' },
  { host: 'peerjs.92k.de', port: 443, secure: true, path: '/' }
];
const SIGNAL_TIMEOUT = 9000;

const Net = {
  peer: null,
  conn: null,                  // host: first connection (kept for legacy checks)
  conns: [],                   // host: every client {conn, id, name}
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
  peers: [],                   // roster: [{id, name, isHost}]

  /* ---------- helpers ---------- */
  makeCode() {
    let s = '';
    for (let i = 0; i < 5; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    return s;
  },

  /* a stable identity for this browser, so the host can tell players apart */
  myId() {
    if (!this._myId) this._myId = 'p' + Math.floor(Math.random() * 1e9).toString(36) + Date.now().toString(36).slice(-4);
    return this._myId;
  },
  /* The canonical id for the local player. The host assigns each connection the
     id the client announced in its hello, so `myId()` is the same string on both
     sides — no handshake is needed to know our own name in the room. */
  selfId() { return this.myId(); },

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
        // when players sit behind strict NATs. The TURN entries below are
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

  /* ---------- roster ---------- */
  refreshRoster() {
    if (this.role === CS.NETROLE.HOST) {
      const list = [{ id: this.myId(), name: this.name, isHost: true }];
      for (const c of this.conns) {
        if (c.open) list.push({ id: c.id, name: c.name || 'Игрок', isHost: false });
      }
      this.peers = list;
    }
  },
  peerCount() { return this.peers.length; },
  playerCount() {
    // host knows everyone; a client counts itself plus whoever the host reports
    return Math.max(2, this.peers.length);
  },

  /* ---------- host ---------- */
  host(name, onReady, onError) {
    this.role = CS.NETROLE.HOST;
    this.name = name;
    this._closedByUser = false;
    this.code = this.makeCode();
    this._srv = this.preferredServer();
    this.conns = [];
    this.refreshRoster();
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
      // the host accepts up to MAX players; refusals are visible to the guest
      const max = (typeof MATCH !== 'undefined' ? MATCH.maxPlayers : 4);
      this.refreshRoster();
      if (this.conns.filter(c => c.open).length >= max - 1) {
        try { conn.on('open', () => conn.send({ t: 'full' })); } catch (e) { }
        setTimeout(() => { try { conn.close(); } catch (e) { } }, 400);
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
      if (!this._closedByUser && this.peer && !this.peer.destroyed) {
        try { this.peer.reconnect(); } catch (e) { }
      }
    });
    peer.on('close', () => {
      if (!this._closedByUser) this.emit('closed', {});
    });
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

    setTimeout(() => { if (!settled && !this.connected) tryNextServer('Сервер знакомства не отвечает. Попробуйте позже.'); }, SIGNAL_TIMEOUT + 4000);
  },

  _setupConn(conn, onOpenCb) {
    this.conn = conn;
    const rec = { conn, id: null, name: '', open: false, ping: 0, rtt: [] };
    if (this.role === CS.NETROLE.HOST) this.conns.push(rec);

    conn.on('open', () => {
      rec.open = true;
      this.connected = true;
      this.connecting = false;
      this.startHeartbeat();
      onOpenCb && onOpenCb();
      this.send({ t: 'hello', name: this.name, role: this.role === CS.NETROLE.HOST ? 'host' : 'client', ver: CS.version, id: this.myId() });
      this.refreshRoster();
      this.emit('connected', { role: this.role });
      this.emit('roster', this.peers);
    });
    conn.on('data', raw => {
      let m = raw;
      if (typeof raw === 'string') { try { m = JSON.parse(raw); } catch (e) { return; } }
      if (!m || !m.t) return;
      this._handle(m, rec);
    });
    conn.on('close', () => {
      rec.open = false;
      if (this.role === CS.NETROLE.HOST) {
        this.conns = this.conns.filter(c => c !== rec);
        this.refreshRoster();
        // Tell the players who remain that the room shrank. `emit` only updates
        // this machine; without the explicit send the other clients keep the
        // departed player in their roster and chase a ghost model.
        this.send({ t: 'roster', roster: this.peers });
        this.emit('roster', this.peers);
        this.emit('peerleft', { id: rec.id, name: rec.name });
      }
      const anyOpen = this.conns.some(c => c.open);
      const was = this.connected;
      this.connected = (this.role === CS.NETROLE.HOST) ? anyOpen : false;
      if (was && !this.connected) this.emit('disconnected', {});
    });
    conn.on('error', e => {
      this.emit('error', { message: (e && e.message) || 'Ошибка соединения' });
    });
    return rec;
  },

  /* ---------- messaging ----------
     The host relays any message it receives from a client to every other
     client, so all players see each other in a star topology. `from` and `to`
     survive the relay untouched.

     Delivery is isolated per connection: one congested or dying channel must
     never stop the message reaching the others. (A single throw used to break
     the whole loop, so the remaining players silently stopped receiving
     anything.)
     */
  _sendOne(rec, msg) {
    if (!rec || !rec.open) return false;
    try { rec.conn.send(msg); rec.fails = 0; return true; }
    catch (e) {
      rec.fails = (rec.fails || 0) + 1;
      if (rec.fails > 6) rec.open = false;   // treat a dead channel as closed
      return false;
    }
  },
  send(msg) {
    if (this.role === CS.NETROLE.HOST) {
      if (!this.conns.length) return false;
      let ok = false;
      for (const c of this.conns) { if (this._sendOne(c, msg)) ok = true; }
      return ok;
    }
    if (!this.conn || !this.conn.open) return false;
    try { this.conn.send(msg); return true; } catch (e) { return false; }
  },
  /* host-only: forward to every client except `exceptRec` */
  relay(msg, exceptRec) {
    if (this.role !== CS.NETROLE.HOST) return;
    for (const c of this.conns) {
      if (c === exceptRec) continue;
      this._sendOne(c, msg);
    }
  },
  /* host-only: send to exactly one connection record */
  sendTo(rec, msg) {
    return this._sendOne(rec, msg);
  },

  _handle(m, rec) {
    switch (m.t) {
      case 'hello': {
        if (rec) { rec.id = m.id || ('c' + this.conns.indexOf(rec)); rec.name = m.name || 'Игрок'; }
        this.partnerName = m.name || 'Игрок';
        this.refreshRoster();
        // the host announces the roster (which now includes the new client)
        if (this.role === CS.NETROLE.HOST && rec) {
          this.emit('peerjoined', { id: rec.id, name: rec.name });
          // Send the updated list to the whole room. Without this, players who
          // joined earlier never learn about a later joiner: every client must
          // see the same roster to derive a distinct spawn slot from it.
          this.send({ t: 'roster', roster: this.peers });
        }
        this.emit('hello', m);
        this.emit('roster', this.peers);
        break;
      }
      case 'roster':
        // host → everyone: the authoritative list of players in the room
        this.peers = m.roster || [];
        if (this.role !== CS.NETROLE.HOST) this.emit('roster', this.peers);
        break;
      case 'full':
        this.emit('full', {});
        break;
      case 'ping':
        this.send({ t: 'pong', s: m.s, time: m.time });
        break;
      case 'pong': {
        const rtt = U.now() - m.time;
        if (this.role === CS.NETROLE.HOST && rec) {
          rec.rtt.push(rtt); if (rec.rtt.length > 8) rec.rtt.shift();
          rec.ping = rec.rtt.reduce((a, b) => a + b, 0) / rec.rtt.length;
          this.ping = Math.max(...this.conns.map(c => c.ping || 0), 0);
        } else {
          this.rttSamples.push(rtt);
          if (this.rttSamples.length > 8) this.rttSamples.shift();
          this.ping = this.rttSamples.reduce((a, b) => a + b, 0) / this.rttSamples.length;
        }
        break;
      }
      /* relayed game messages: `from` names the sender so receivers can route */
      case 'state': case 'shot': case 'hit': case 'died': case 'respawn':
      case 'score': case 'chat':
        if (this.role === CS.NETROLE.HOST) this.relay(m, rec);
        this.emit(m.t, m);
        break;
      case 'round':
        // round/settings flow is host → clients only; a client never drives it
        if (this.role === CS.NETROLE.HOST) this.relay(m, rec);
        this.emit('round', m);
        break;
      case 'bye':
        this.emit('bye', m);
        break;
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
    const conns = this.conns.slice();
    setTimeout(() => {
      conns.forEach(c => { try { c.conn.close(); } catch (e) { } });
      try { if (this.conn) this.conn.close(); } catch (e) { }
      try { if (this.peer) this.peer.destroy(); } catch (e) { }
    }, notify ? 60 : 0);
    this.conn = null; this.peer = null; this.conns = [];
    this.connected = false; this.connecting = false;
    this.role = CS.NETROLE.NONE;
    this.peers = [];
    this.rttSamples.length = 0; this.ping = 0;
  }
};
