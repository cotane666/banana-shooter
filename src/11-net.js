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
   peer-to-peer over WebRTC. PeerJS still needs one small WebSocket signalling
   server; the public cloud (0.peerjs.com) is blocked by Cloudflare in many
   regions, so the list below is tried in order and a working server is
   remembered for next time.

   The list must be ordered by reliability, because the remembered index is a
   starting point and dead servers must never be marked as preferred (that bug
   is explained in `rememberServer`). */
const SIGNAL_SERVERS = [
  { host: 'peerjs-server.onrender.com', port: 443, secure: true, path: '/' },
  { host: '0.peerjs.com', port: 443, secure: true, path: '/' },
  { host: 'peerjs.92k.de', port: 443, secure: true, path: '/' }
];
/* How long to wait for the signalling socket to open. A blocked server (e.g.
   0.peerjs.com behind Cloudflare) answers with an error almost immediately, so
   the fallback is driven by those errors, not by this timer. This timer only
   covers a server that accepts the connection but is slow to answer — which is
   exactly the free Render instance when it is waking from sleep. A short timeout
   there made the game abandon the one working server and fail on the two dead
   fallbacks ("ОШИБКА" a couple of seconds after the code appeared), so it is
   deliberately generous, while the retry pass below covers a long cold start. */
const SIGNAL_TIMEOUT = 6000;
/* How long to wait for the peer-to-peer data channel (ICE) to come up. Cross-
   continent WebRTC can take several seconds, so this stays generous. */
const CONNECT_TIMEOUT = 9000;

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
        // when players sit behind strict NATs. The TURN entries below come from
        // the Metered Open Relay project — free public server, no account.
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

  /* Render's free tier sleeps after inactivity, so the very first WebSocket can
     take ~30s. We also only get one shot at the connection (PeerJS does not
     re-run ICE if the first attempt fails), so warm the signalling server up
     while the player is still reading the lobby and, more importantly, keep
     WebRTC busy: a throwaway peer that is still gathering candidates makes the
     browser learn the TURN relays, which the real match then reuses, and stops
     the free TURN server from rate-limiting the join. */
  warmup() {
    if (this._warmer) return;
    const srv = SIGNAL_SERVERS[this._srv] || SIGNAL_SERVERS[0];
    const id = 'warm-' + Math.random().toString(36).slice(2, 10);
    try {
      const url = 'https://' + srv.host + (srv.path === '/' ? '/' : srv.path + '/') + 'peerjs?key=peerjs&id=' + id +
        '&token=' + Math.random().toString(36).slice(2, 10) + '&version=1.5.4';
      fetch(url, { cache: 'no-store', mode: 'no-cors' }).catch(() => { });
    } catch (e) { }
    let w = null;
    try { w = new Peer(id, this.peerOptions()); } catch (e) { return; }
    this._warmer = w;
    w.on('error', () => { });
    setTimeout(() => {
      try { w.destroy(); } catch (e) { }
      if (this._warmer === w) this._warmer = null;
    }, SIGNAL_TIMEOUT + 6000);
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
    this.conns = [];
    this._srv = this.preferredServer();
    this.refreshRoster();
    this._stopWarmup();
    this._openPeer({ role: CS.NETROLE.HOST, peerId: PEER_PREFIX + this.code, onReady: onReady, onError: onError });
  },

  /* The signalling server is only an introduction service, so both players must
     meet on the same one. Only the first (most reliable) server is ever
     remembered as preferred: storing a dead fallback there is exactly what used
     to make "Сервер знакомства недоступен" appear before the list was tried. */
  preferredServer() {
    let i = Store && Store.data ? parseInt(Store.data.signalSrv, 10) : 0;
    if (!(i >= 0 && i < SIGNAL_SERVERS.length)) i = 0;
    return i;
  },
  rememberServer(i) {
    if (!Store || !Store.data) return;
    const want = i === 0 ? 0 : this.preferredServer();   // never prefer a fallback
    if (Store.data.signalSrv !== want) { Store.data.signalSrv = want; try { Store.save(); } catch (e) { } }
  },
  _stopWarmup() {
    if (this._warmer) { try { this._warmer.destroy(); } catch (e) { } this._warmer = null; }
  },
  /* move to the next signalling server, wrapping past the end of the list.
     Starting from a remembered server must still be able to reach the earlier,
     more reliable ones — otherwise a dead fallback can never recover. */
  _advanceServer() {
    this._srv = (this._srv + 1) % SIGNAL_SERVERS.length;
    return true;
  },

  /* ---------- connection engine ----------
     A single entry point opens the signalling peer (and, for a client, dials the
     host) and then walks the server list until one works.

     Why this is written as an explicit queue: PeerJS fires errors in bursts and
     a peer can report a dead server *before* its 'open' arrives. The old code
     used one shared `settled` flag for both, so the first error settled the
     promise, tore the peer down and left the next attempt without any listener
     attached — the player saw "Сервер знакомства недоступен" forever. Here every
     attempt owns its own state and only a genuine failure/timeout advances the
     queue. */
  _openPeer(cfg) {
    if (this._closedByUser) return;
    this._stopWarmup();
    // a fresh attempt must not look "connected" or carry a stale refusal reason
    this.connected = false;
    this._rejected = null;
    if (this.peer) { try { this.peer.destroy(); } catch (e) { } }
    this.connecting = true;

    /* A call (host/join) probes each server once, then gets one extra try at the
       first (most reliable) server. That retry is what rescues a free server
       waking from sleep: the first visit can time out before it answers, and by
       the second visit it is warm. Dead servers fail within milliseconds, so the
       budget is only reached in the unlikely case that every server accepts the
       socket and then stays silent. A wall-clock deadline caps the whole scan. */
    if (cfg.scan == null) cfg.scan = SIGNAL_SERVERS.length + 1;
    if (cfg.deadline == null) cfg.deadline = Date.now() + SIGNAL_TIMEOUT * 2 + 3000;

    let peer;
    try {
      peer = new Peer(cfg.peerId != null ? cfg.peerId : null, this.peerOptions());
    } catch (e) {
      this.connecting = false;
      cfg.onError && cfg.onError('Не удалось инициализировать сеть: ' + e.message);
      return;
    }
    this.peer = peer;

    // per-attempt state (NOT shared across servers)
    let opened = false;          // the signalling socket is up
    let retries = 0;             // used when the room code is already taken
    let settled = false;         // this attempt is over (success or failure)
    let sigTimer = null, joinTimer = null;
    const self = this;

    const cleanup = () => {
      if (sigTimer) { clearTimeout(sigTimer); sigTimer = null; }
      if (joinTimer) { clearTimeout(joinTimer); joinTimer = null; }
      try { peer.destroy(); } catch (e) { }
    };
    /* A rejected guest (room full / already in a match) already has its answer;
       it must be reported at once, not after the dial timeout. This is terminal
       even if the channel technically opened first, so it does NOT consult
       `settled` — only its own one-shot flag. */
    let reportedReject = false;
    const rejectedNow = reason => {
      if (reportedReject) return;
      reportedReject = true;
      settled = true;
      self._rejected = reason;
      if (joinTimer) { clearTimeout(joinTimer); joinTimer = null; }
      if (sigTimer) { clearTimeout(sigTimer); sigTimer = null; }
      try { peer.destroy(); } catch (e) { }
      self.connecting = false;
      self.connected = false;
      self.emit('reject', { reason: reason });
      cfg.onError && cfg.onError(reason);
    };
    const failAttempt = msg => {
      if (settled) return;
      settled = true;
      cleanup();
      if (this._closedByUser) return;
      // a slow server must not be retried past the overall deadline
      if (--cfg.scan > 0 && Date.now() < cfg.deadline) { this._advanceServer(); this._openPeer(cfg); }
      else { this.connecting = false; cfg.onError && cfg.onError(msg); }
    };
    /* Once the room exists (host) or the host link is up (client) the attempt is
       a success for good: later network blips must not tear the room down or
       re-run the server scan. */
    const succeed = () => {
      if (settled) return;
      settled = true;
      if (joinTimer) { clearTimeout(joinTimer); joinTimer = null; }
      if (sigTimer) { clearTimeout(sigTimer); sigTimer = null; }
    };

    /* Only a failure to reach the signalling server advances the list. A client
       that reached the server but the host never answered stays on that server
       (the room may simply be full), so the error the player sees is the truth. */
    const connectFailed = msg => {
      if (settled) return;
      settled = true;
      cleanup();
      if (this._closedByUser) return;
      this.connecting = false;
      cfg.onError && cfg.onError(msg);
    };

    peer.on('open', pid => {
      opened = true;
      if (sigTimer) { clearTimeout(sigTimer); sigTimer = null; }
      this.rememberServer(this._srv);
      this.peerId = pid;

      if (cfg.role !== CS.NETROLE.HOST) {
        // client: dial the host through the server we just opened
        let conn;
        try { conn = peer.connect(cfg.hostId, { reliable: true, serialization: 'json' }); }
        catch (e) { connectFailed('Не удалось подключиться к хосту: ' + e.message); return; }
        this._setupConn(conn, success => { if (success) succeed(); }, rejectedNow);
        joinTimer = setTimeout(() => connectFailed('Не удалось подключиться к хосту (тайм-аут).'), CONNECT_TIMEOUT);
      } else {
        // host: the peer id itself is the room; done as soon as it is open
        succeed();
      }
      cfg.onReady && cfg.onReady(pid);
    });

    peer.on('connection', conn => {
      // the host accepts up to MAX players; refusals are visible to the guest
      const max = (typeof MATCH !== 'undefined' ? MATCH.maxPlayers : 4);
      this.refreshRoster();
      if (this.conns.filter(c => c.open).length >= max - 1) {
        // The channel is not open yet, so the refusal must be sent from its
        // 'open' event — closing immediately would rob the guest of the reason.
        // A fallback timer covers a channel that never opens at all.
        let dropped = false;
        const drop = () => {
          if (dropped) return;
          dropped = true;
          setTimeout(() => { try { conn.close(); } catch (e) { } }, 250);
        };
        try {
          conn.on('open', () => {
            try { conn.send({ t: 'reject', reason: 'Комната заполнена (максимум ' + max + ' игроков)' }); } catch (e) { }
            drop();
          });
        } catch (e) { }
        setTimeout(drop, 2000);
        return;
      }
      this._setupConn(conn);
    });

    peer.on('error', err => {
      const t = err && err.type;
      if (settled) return;
      if (t === 'unavailable-id' && cfg.role === CS.NETROLE.HOST && retries < 5) {
        // the generated room code is already in use: pick a fresh one and retry
        retries++;
        this.code = this.makeCode();
        if (sigTimer) { clearTimeout(sigTimer); sigTimer = null; }
        try { peer.destroy(); } catch (e) { }
        this._openPeer(Object.assign({}, cfg, { peerId: PEER_PREFIX + this.code }));
        return;
      }
      if (t === 'peer-unavailable') {
        connectFailed('Комната ' + this.code + ' не найдена. Проверьте код.');
        return;
      }
      if (t === 'browser-incompatible') {
        settled = true; cleanup(); this.connecting = false;   // no point trying another server
        cfg.onError && cfg.onError('Браузер не поддерживает WebRTC.');
        return;
      }
      if (t === 'network' || t === 'server-error' || t === 'socket-error') {
        /* Before the socket opens this is a dead server → move on. Once it is
           open the server is fine and the error belongs to the peer link, so
           report it instead of silently switching servers. */
        if (!opened) failAttempt('Сервер знакомства недоступен. Проверьте интернет.');
        else connectFailed('Соединение прервано: ' + (err.message || 'сервер закрыл канал'));
        return;
      }
      // unknown error: surface it instead of retrying forever
      settled = true; cleanup(); this.connecting = false;
      cfg.onError && cfg.onError('Ошибка сети: ' + (err.message || t || 'неизвестно'));
    });

    peer.on('disconnected', () => {
      // the data channel survives a signalling hiccup; only reconnect the socket
      if (!this._closedByUser && !peer.destroyed) { try { peer.reconnect(); } catch (e) { } }
    });
    peer.on('close', () => {
      if (!this._closedByUser && !settled) this.emit('closed', {});
    });

    // a server that never answers must not leave the player staring at "Ожидание";
    // the wait is also clamped to the overall scan deadline
    if (!opened) {
      const wait = Math.max(1000, Math.min(SIGNAL_TIMEOUT, cfg.deadline - Date.now()));
      sigTimer = setTimeout(() => {
        if (!opened && !settled) failAttempt('Сервер знакомства не отвечает. Пробуем другой…');
      }, wait);
    }
  },

  /* ---------- client ---------- */
  join(code, name, onError) {
    this.role = CS.NETROLE.CLIENT;
    this.name = name;
    this.code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    this._closedByUser = false;
    if (this.code.length < 4) { onError && onError('Неверный код комнаты.'); return; }
    this._srv = this.preferredServer();
    this._stopWarmup();
    // the guest reaches the host through the server the host registered on
    this._openPeer({ role: CS.NETROLE.CLIENT, peerId: null, hostId: PEER_PREFIX + this.code, onError: onError });
  },

  _setupConn(conn, onOpenCb, onRejectedCb) {
    this.conn = conn;
    const rec = { conn, id: null, name: '', open: false, ping: 0, rtt: [] };
    if (this.role === CS.NETROLE.HOST) this.conns.push(rec);
    // tell the dialling code exactly once whether the channel ever came up
    let notified = false;
    let refused = false;
    const notifyOpen = ok => { if (!notified) { notified = true; onOpenCb && onOpenCb(ok); } };

    conn.on('open', () => {
      // a refusal may arrive in the same tick as 'open'; it then owns the outcome
      if (refused) return;
      rec.open = true;
      this.connected = true;
      this.connecting = false;
      this.startHeartbeat();
      notifyOpen(true);
      this.send({ t: 'hello', name: this.name, role: this.role === CS.NETROLE.HOST ? 'host' : 'client', ver: CS.version, id: this.myId() });
      this.refreshRoster();
      this.emit('connected', { role: this.role });
      this.emit('roster', this.peers);
    });
    conn.on('data', raw => {
      let m = raw;
      if (typeof raw === 'string') { try { m = JSON.parse(raw); } catch (e) { return; } }
      if (!m || !m.t) return;
      /* A refused guest (room full) already has its answer; report it right away
         so the player does not wait out the dial timeout. Hosts never receive this. */
      if (m.t === 'reject') {
        refused = true;
        rec.open = false;
        const reason = m.reason || 'Комната отклонила подключение';
        this._rejected = reason;
        this.connected = false;
        this.connecting = false;
        notifyOpen(false);
        onRejectedCb && onRejectedCb(reason);
        return;
      }
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
      // let the dialling code know the channel never came up (refusal/ICE fail)
      notifyOpen(false);
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
      case 'reject':
        this._rejected = m.reason || 'Комната отклонила подключение';
        this.emit('reject', { reason: this._rejected });
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
      case 'score': case 'chat': case 'drone': case 'boom':
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
    /* Take references FIRST. Zeroing this.conn/this.peer before the timer runs
       meant the deferred close saw null and never actually closed anything, so
       the host never noticed a guest leaving. */
    const conns = this.conns.slice();
    const conn = this.conn;
    const peer = this.peer;
    setTimeout(() => {
      conns.forEach(c => { try { c.conn.close(); } catch (e) { } });
      try { if (conn) conn.close(); } catch (e) { }
      try { if (peer) peer.destroy(); } catch (e) { }
    }, notify ? 60 : 0);
    this.conn = null; this.peer = null; this.conns = [];
    this.connected = false; this.connecting = false;
    this.role = CS.NETROLE.NONE;
    this.peers = [];
    this.rttSamples.length = 0; this.ping = 0;
  }
};
