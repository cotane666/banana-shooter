/* ============================================================
   11 — ИГРА: цикл, волны, экономика, урон, режимы, меню
   ============================================================ */

const Game = {
  state: 'menu',          // menu | play | shop | pause | over
  L: null, mapIdx: 0,
  mode: 'survival',
  enemies: [], bullets2: null,
  wave: 0, waveState: 'inter', interT: 0, interMax: 16,
  score: 0, kills: 0, feed: [], hint: '',
  weaponId: 'glock', slots: { 1: 'glock', 2: null, 3: 'knife' }, slotSel: 1,
  owned: { glock: true, knife: true },
  weap: null, acids: [], coins: [], booms: [],
  recoil: 0, reloading: false, beam: null,
  diffHp: 1, diffSpeed: 1, diffDmg: 1,
  ctrl: Ctrl, stats: null,

  /* ================================================================ init */
  init() {
    coreInit();
    const st = Store2.load();
    G2.autoAim = st.settings.autoAim !== false;

    this.player = {
      x: 100, y: 100, w: CFG2.PLAYER_W, h: CFG2.PLAYER_H, vx: 0, vy: 0,
      face: 1, onGround: false, aimX: 1, aimY: 0, walk: 0,
      hp: 100, maxHp: 100, armor: 0, money: 800, dead: false,
      shieldOn: 0, frozen: 0, invuln: 0, hurtFlash: 0,
    };
    this.stats = { shots: 0, hits: 0, heads: 0, bananas: 0 };
    this.weap = Weap.makeState();
    this.L = MAPS2[0];

    const bb = document.getElementById('bootbtn');
    const start = () => {
      document.getElementById('boot').classList.add('hide');
      if (typeof Audio3D_SFX !== 'undefined') {
        Audio3D_SFX.init(); Audio3D_SFX.resume();
        Audio3D_SFX.setVol(st.settings.sfx); Audio3D_SFX.setMusicVol(st.settings.music);
      }
      this.guardAudio();
      requestAnimationFrame(t => this.frame(t));
    };
    bb.addEventListener('click', start);
    if (/[?&]auto/.test(location.search)) {
      setTimeout(() => {
        start();
        if (/[?&]play/.test(location.search)) {
          this.startRun(0, 'survival');
          if (/[?&]turbo/.test(location.search)) this.turboTest();
        }
      }, 60);
    }
  },

  /** Синхронный прогон игры для автотестов: N секунд за один вызов. */
  turboTest(seconds) {
    const msec = (location.search.match(/[?&]sec=(\d+)/) || [])[1];
    if (msec) seconds = parseInt(msec, 10);
    const dt = 1 / 60;
    const steps = Math.round((seconds || 60) / dt);
    let n = 0;
    const t0 = performance.now();
    this.owned.yhs = true; Weap.fill(this.weap, 'yhs');
    this.slots[2] = 'yhs'; this.weaponId = 'yhs'; this.slotSel = 2;
    const gun = (location.search.match(/[?&]gun=(\w+)/) || [])[1];
    if (gun && WEAPONS[gun]) {
      this.owned[gun] = true; Weap.fill(this.weap, gun);
      this.slots[WEAPONS[gun].slot || 2] = gun; this.weaponId = gun; this.slotSel = WEAPONS[gun].slot || 2;
    }
    this.player.money = 999999;
    this.demo = true;
    try {
      for (n = 0; n < steps; n++) {
        G2.dt = dt; G2.time += dt;
        Ctrl.moveX = Math.sin(n * 0.013);
        Ctrl.run = Math.abs(Ctrl.moveX) > 0.7;
        Ctrl.fire = true;
        Ctrl.crouch = false;
        Ctrl.jumpDown = (n % 140) === 0;
        Ctrl.jumpHeld = false;
        Ctrl.useStick = false;
        this.player.invuln = 1e9;           // в тесте не умираем, чтобы дойти до боссов
        if (this.state === 'over') { this.startRun(0, 'survival'); this.player.invuln = 1e9; }
        if (this.state === 'shop') this.closeShop();
        this.update(dt);
        this.draw();
      }
    } catch (e) {
      __logErr('turbo@step' + n + ': ' + (e && e.message) + ' | ' + String((e && e.stack) || '').split('\n')[1]);
    }
    const ms = performance.now() - t0;
    const el = document.createElement('pre');
    el.id = '__turbo';
    el.textContent = 'steps=' + steps + ' done=' + n + ' ms=' + Math.round(ms) +
      ' msPerStep=' + (ms / Math.max(1, n)).toFixed(3) +
      ' wave=' + this.wave + ' kills=' + this.kills + ' enemies=' + this.enemies.length +
      ' parts=' + FX.parts.length + ' state=' + this.state + ' playerHp=' + Math.round(this.player.hp);
    document.body.appendChild(el);
  },

  frame(t) {
    const now = t / 1000;
    let dt = this._last ? now - this._last : 0.016;
    this._last = now;
    dt = Math.min(dt, 0.05);
    G2.dt = dt; G2.time = now;
    G2._fpsAcc += dt; G2._fpsN++;
    if (G2._fpsAcc > 0.4) { G2.fps = G2._fpsN / G2._fpsAcc; G2._fpsAcc = 0; G2._fpsN = 0; }

    try {
      Ctrl.update();
      this.update(dt);
      this.draw();
      corePresent();
    } catch (e) {
      __logErr('frame: ' + (e && e.message ? e.message : e) + ' | ' + ((e && e.stack) ? String(e.stack).split('\n')[1] : ''));
      try { this.draw(); corePresent(); } catch (e2) { }
    }
    G2.frames++;
    requestAnimationFrame(t2 => this.frame(t2));
  },

  /* ================================================================ запуск забега */
  startRun(mapIdx, mode) {
    this.mapIdx = mapIdx; this.mode = mode || 'survival';
    this.L = MAPS2[mapIdx];
    DEST.attach(this.L);
    Cam.x = 200; Cam.y = this.L.h - 200;
    FX.clear(); BULLETS.clear();
    this.enemies.length = 0; this.acids.length = 0; this.coins.length = 0; this.booms.length = 0;
    this.feed.length = 0;
    this.wave = 0; this.score = 0; this.kills = 0;
    this.waveState = 'inter'; this.interT = 6; this.interMax = 6;
    if (/[?&]fast/.test(location.search)) { this.interT = 0.3; this.interMax = 0.3; }
    this.owned = { glock: true, knife: true };
    this.slots = { 1: 'glock', 2: null, 3: 'knife' };
    this.slotSel = 1; this.weaponId = 'glock';
    this.weap = Weap.makeState();
    for (const id in this.owned) Weap.fill(this.weap, id);
    this.stats = { shots: 0, hits: 0, heads: 0, bananas: 0 };
    this.beam = null; this.recoil = 0;
    this.diffHp = 1; this.diffSpeed = 1; this.diffDmg = 1;

    const p = this.player;
    p.hp = 100; p.maxHp = 100; p.armor = 0; p.money = mode === 'range' ? 999999 : 800;
    p.dead = false; p.vx = 0; p.vy = 0; p.shieldOn = 0; p.frozen = 0; p.invuln = 1.2;
    const sp = this.L.spawnPts[0] || { x: 120, y: 100 };
    p.x = sp.x; p.y = sp.y - 40;
    Cam.x = p.x; Cam.y = p.y;

    if (mode === 'range') {
      this.waveState = 'run';
      for (let i = 0; i < 6; i++) this.spawnDummy(320 + i * 90, this.L.h - 200);
      this.hint = 'ПОЛИГОН: всё оружие бесплатно (B), манекены не умирают';
    } else {
      this.hint = 'WASD — движение · ЛКМ — огонь · ПРОБЕЛ — прыжок · B — магазин';
    }
    this.state = 'play';
    UI.banner = { title: mode === 'range' ? 'ПОЛИГОН' : 'ВЫЖИВАНИЕ', sub: this.L.name, t: 1.6, max: 1.6 };
    if (/[?&]demo/.test(location.search)) {
      this.demo = true;
      this.wave = 4; this.diffHp = 1.4;
      this.waveState = 'run'; this._spawnLeft = 0; this._spawnPool = ['walker'];
      this.player.money = 40000;
      const types = ['walker', 'runner', 'crawler', 'spitter', 'tank', 'flyer', 'splitter', 'walker', 'runner', 'tank'];
      for (let i = 0; i < 10; i++) {
        const t = types[i] === 'flyer' ? 'flying' : types[i];
        const z = this.spawnZombie(t, this.player.x + 150 + i * 46, this.player.y - 20);
        z.x = clamp(z.x, 40, this.L.w - 60);
      }
      /* выдаём игроку весь арсенал, чтобы проверить все виды стволов */
      for (const id in WEAPONS) { this.owned[id] = true; Weap.fill(this.weap, id); }
      this.slots[2] = 'ak47'; this.slotSel = 2; this.weaponId = 'ak47';
      if (/[?&]shop/.test(location.search)) setTimeout(() => { this.waveState = 'inter'; this.interT = 99; this.openShop(); }, 400);
    }
  },

  /* демо для автотеста: сам двигается и стреляет */
  demo: false,
  _demoT: 0,

  applyDemo(dt) {
    if (!this.demo) return;
    this._demoT += dt;
    Ctrl.moveX = Math.sin(this._demoT * 0.8);
    Ctrl.run = Math.abs(Ctrl.moveX) > 0.7;
    Ctrl.fire = true;
    Ctrl.jumpDown = (this._demoT % 2.2) < 0.02;
    Ctrl.jumpHeld = false;
    const p = this.player, z = this.nearestEnemyTo(p.x, p.y, 1200, 'e');
    if (z) {
      const a = Math.atan2((z.y + z.h / 2) - (p.y + p.h * 0.58), (z.x + z.w / 2) - (p.x + p.w / 2));
      Ctrl.aim.x = Math.cos(a); Ctrl.aim.y = Math.sin(a);
      Ctrl.useStick = true;
    }
  },

  /* ================================================================ обновление */
  update(dt) {
    G2.dt = dt;
    const L = this.L;
    this.applyDemo(dt);

    if (this.state === 'menu' || this.state === 'over') { G2.uiMode = true; this.handleClick(); return; }
    if (this.state === 'pause') { G2.uiMode = true; this.handleClick(); return; }
    if (this.state === 'shop') { G2.uiMode = true; this.handleClick(); this.shopScrollKeys(dt); return; }
    G2.uiMode = false;
    UI.mouseOverUI = !!UI.hit(G2.mouse.x, G2.mouse.y);

    /* --- игра --- */
    this.updatePlayer(dt);
    Weap.update(this, dt);
    this.reloading = this.weap.reloadT > 0;

    const wantFire = Ctrl.fire && !this.player.dead && !UI.mouseOverUI;
    Weap.tick(this, dt, wantFire, Ctrl.alt);
    this.playerShield = this.player.shieldOn > 0;
    if (this.playerShield) this.player.shieldOn -= dt;

    BULLETS.update(dt, this);
    this.updateCoins(dt);
    this.updateAcids(dt);

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const z = this.enemies[i];
      if (z.dummy) continue;
      Enemies.update(this, z, dt);
      if (z.dead) { this.enemies.splice(i, 1); }
      for (let j = this.enemies.length - 1; j > i; j--) {
        const o = this.enemies[j];
        if (o.dummy || z.dummy) continue;
        if (Math.abs(o.x - z.x) < 12 && Math.abs(o.y - z.y) < 22) {
          const push = sign(z.x - o.x) * 22 * dt;
          z.x += push * 0.5; o.x -= push * 0.5;
        }
      }
    }

    /* цели автонаведения (телефон) */
    if (G2.autoAim && !Ctrl.useStick && G2.isMobile) {
      const t = this.nearestEnemyTo(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2, 400, 'e');
      if (t) {
        const dx = (t.x + t.w / 2) - (this.player.x + this.player.w / 2);
        const dy = (t.y + t.h / 2) - (this.player.y + this.player.h / 2);
        const a = Math.atan2(dy, dx);
        const ca = Math.atan2(this.player.aimY, this.player.aimX);
        let da = a - ca; while (da > Math.PI) da -= 6.2832; while (da < -Math.PI) da += 6.2832;
        const na = ca + clamp(da, -6 * dt, 6 * dt);
        this.player.aimX = Math.cos(na); this.player.aimY = Math.sin(na);
      }
    }

    FX.update(dt);
    DEST.step();
    this.updateBooms(dt);
    if (this.recoil > 0) this.recoil = Math.max(0, this.recoil - dt * 4);
    this.player.hurtFlash = Math.max(0, this.player.hurtFlash - dt * 3);
    for (let i = this.feed.length - 1; i >= 0; i--) { this.feed[i].t -= dt; if (this.feed[i].t <= 0) this.feed.splice(i, 1); }

    /* волны */
    if (this.mode !== 'range') this.updateWaves(dt);

    /* камера */
    const p = this.player;
    const tx = clamp(p.x + p.w / 2 + p.face * 40, G2.vw / 2, Math.max(G2.vw / 2, L.w - G2.vw / 2));
    const ty = clamp(p.y + p.h / 2 - 14, G2.vh / 2, Math.max(G2.vh / 2, L.h - G2.vh / 2));
    Cam.follow(tx, ty, dt);

    this.handleClick();
    Store2.data.playtime += dt;
  },

  updatePlayer(dt) {
    const p = this.player, L = this.L;
    if (p.dead) { p.vx = 0; return; }
    const frozen = p.frozen > 0;
    if (frozen) p.frozen -= dt;
    if (p.invuln > 0) p.invuln -= dt;

    const spd = (Ctrl.run ? CFG2.RUN : CFG2.WALK) * (frozen ? 0.35 : 1);
    const target = Ctrl.moveX * spd * (Ctrl.crouch ? CFG2.CROUCH_MUL : 1);
    p.vx = approach(p.vx, target, 1400 * dt);
    if (Ctrl.jumpDown && p.onGround && !frozen) { p.vy = -CFG2.JUMP_V; p.onGround = false; Audio3D_SFX.step(p.x, 0, 0); }

    p.vy = Math.min(p.vy + CFG2.GRAV * dt, CFG2.MAX_FALL);
    const res = moveBody(p, p.vx * dt, p.vy * dt, L, true);
    if (res.ground) { p.onGround = true; if (!this._wasGround && p.vy > 240) FX.dust(p.x + p.w / 2, p.y + p.h, 5, 0); }
    p.onGround = res.ground ? true : (res.hitY ? false : p.onGround && Math.abs(p.vy) < 40);
    if (res.hitY) p.vy = 0;
    this._wasGround = res.ground;

    /* шаги */
    if (p.onGround && Math.abs(p.vx) > 30) {
      this._stepT = (this._stepT || 0) + dt * Math.abs(p.vx) * 0.012;
      if (this._stepT > 1) { this._stepT = 0; Audio3D_SFX.step(p.x, 0, 0); if (Ctrl.run) FX.dust(p.x + p.w / 2, p.y + p.h, 2, -sign(p.vx)); }
    }
    p.walk += Math.abs(p.vx) * dt * 0.075;
    if (Math.abs(p.vx) > 4) p.face = p.vx > 0 ? 1 : -1;
    p.x = clamp(p.x, 2, L.w - p.w - 2);

    /* падение за карту */
    if (p.y > L.h + 120) { this.hurtPlayer(35, p.x, p.y - 40); p.y = -60; p.vy = 0; }

    /* опасные зоны */
    const hz = pointHazard(L, p.x + p.w / 2, p.y + p.h - 2);
    if (hz) {
      if (hz.kind === 'acid') { this.hurtPlayer(18 * dt * 3, p.x, p.y, true); }
      else if (hz.kind === 'lava') { this.hurtPlayer(40 * dt * 3, p.x, p.y, true); }
      else if (hz.kind === 'spike') { this.hurtPlayer(30 * dt * 3, p.x, p.y, true); }
      else if (hz.kind === 'pit') { this.hurtPlayer(60, p.x, p.y); p.y = -60; p.vy = 0; }
    }
    if (hz && hz.kind === 'pit') { /* уже обработано */ }

    /* прицел */
    if (Ctrl.useStick) { p.aimX = Ctrl.aim.x; p.aimY = Ctrl.aim.y; }
    else {
      const wx = Cam.left() + G2.mouse.x, wy = Cam.top() + G2.mouse.y;
      p.aimX = wx - (p.x + p.w / 2); p.aimY = wy - (p.y + p.h * 0.58);
    }
    const al = Math.hypot(p.aimX, p.aimY) || 1;
    p.aimX /= al; p.aimY /= al;
    if (!Ctrl.useStick && Math.abs(p.aimX) > 0.3) p.face = p.aimX > 0 ? 1 : -1;

    Audio3D_SFX.setListener(p.x, 0, 0, Math.abs(p.vx) > 20 ? sign(p.vx) : 0, 0);
  },

  updateCoins(dt) {
    const p = this.player;
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      c.vy += 1400 * dt;
      const d = Math.hypot((p.x + p.w / 2) - c.x, (p.y + p.h / 2) - c.y);
      if (d < 90) { c.x += ((p.x + p.w / 2) - c.x) * dt * 7; c.y += ((p.y + p.h / 2) - c.y) * dt * 7; c.vy *= 0.6; }
      c.x += c.vx * dt; c.y += c.vy * dt;
      const g = FX._ground(c.x, c.y);
      if (g && c.y > g) { c.y = g; c.vy = 0; c.vx *= 0.7; }
      c.t -= dt;
      if (d < 16 || c.t <= 0) {
        if (d < 16) { p.money = Math.min(CFG.moneyCap || 9999999, p.money + c.v); Audio3D_SFX.pickup(c.x, 0, 0); FX.num(c.x, c.y - 6, c.v, '#6de06d'); }
        this.coins.splice(i, 1);
      }
    }
  },

  updateAcids(dt) {
    for (let i = this.acids.length - 1; i >= 0; i--) {
      const a = this.acids[i];
      a.life -= dt;
      if (a.life <= 0) { this.acids.splice(i, 1); continue; }
      for (const z of this.enemies) {
        if (z.dead || z.dummy) continue;
        if (Math.hypot((z.x + z.w / 2) - a.x, (z.y + z.h / 2) - a.y) < a.r) {
          z.hp -= a.dps * dt; z.burn = Math.max(z.burn, 0.5);
          if (z.hp <= 0) this.killEnemy(z, 'acid');
        }
      }
      if (Math.random() < 0.4) FX.spawn(a.x + rnd(-a.r, a.r), a.y - 2, rnd(-10, 10), -rnd(5, 20), 0.4, '#8ce03c', 2, -20);
    }
  },

  addAcidPool(x, y, r, dps, life) {
    this.acids.push({ x, y, r: r || 38, dps: dps || 55, life: life || 6.5, max: life || 6.5 });
  },

  /* ================================================================ волны */
  updateWaves(dt) {
    const L = this.L;
    if (this.waveState === 'inter') {
      this.interT -= dt;
      if (this.interT <= 0) this.beginWave();
      return;
    }
    if (this.waveState === 'run') {
      const alive = this.enemies.filter(e => !e.dead).length;
      if (alive === 0 && this._spawnLeft <= 0) { this.endWave(); }
      else if (this._spawnLeft > 0 && alive < 34 && (this._spawnT = (this._spawnT || 0) - dt) <= 0) {
        this._spawnT = rnd(0.35, 1.1);
        this._spawnLeft--;
        this.spawnFromEdge();
      }
    }
  },

  beginWave() {
    this.wave++;
    this.waveState = 'run';
    const w = this.wave;
    this.diffHp = 1 + w * 0.09;
    this.diffSpeed = 1 + w * 0.012;
    this.diffDmg = 1 + w * 0.035;

    const pool = ['walker', 'walker'];
    if (w >= 2) pool.push('runner');
    if (w >= 3) pool.push('crawler');
    if (w >= 4) pool.push('spitter');
    if (w >= 5) pool.push('tank');
    if (w >= 7) pool.push('splitter');
    if (w >= 7) pool.push('flying');
    if (w >= 9) pool.push('shielder');
    if (w >= 10) pool.push('healer');
    if (w >= 11) pool.push('bomber');
    if (w >= 13) pool.push('summoner');
    if (w >= 8) pool.push('robot');
    const bossWave = w % 5 === 0;
    if (w >= 25) pool.push('brainBoss');

    let count = Math.min(46, 6 + Math.round(w * 2.1));
    this._spawnPool = pool;
    this._spawnLeft = count;
    this._spawnT = 0;

    if (bossWave) {
      const bosses = { 5: 'bossWarden', 10: 'bossBrute', 15: 'bossTitan', 20: 'bossFinal', 25: 'brainBoss', 30: 'brainBoss' };
      const bt = bosses[w] || (w > 25 ? 'brainBoss' : 'bossFinal');
      this.spawnZombie(bt, this.player.x + sign(Math.random() - 0.5) * 340, this.L.h - 200);
      Audio3D_SFX.bossMusicStart();
      UI.banner = { title: 'БОСС!', sub: ZOMBIES[bt].name, t: 2.4, max: 2.4 };
    } else {
      Audio3D_SFX.waveStart();
      UI.banner = { title: 'ВОЛНА ' + w, sub: count + ' зомби', t: 2.0, max: 2.0 };
    }
    if (w > 1) {
      const bonus = 200 + w * 90;
      this.player.money += bonus;
      UI.toast('бонус за волну: ₽' + bonus);
    }
  },

  endWave() {
    this.waveState = 'inter';
    this.interT = 22; this.interMax = 22;
    Audio3D_SFX.bossMusicStop();
    Audio3D_SFX.roundEnd();
    const st = Store2.load();
    if (this.wave > st.bestWave) st.bestWave = this.wave;
    if (this.score > st.bestScore) st.bestScore = this.score;
    Store2.save();
    UI.banner = { title: 'ВОЛНА ' + this.wave + ' ЗАЧИЩЕНА', sub: 'магазин: B   ·   ₽' + Math.round(this.player.money), t: 2.2, max: 2.2 };
  },

  spawnFromEdge() {
    const L = this.L, p = this.player;
    for (let tries = 0; tries < 20; tries++) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const x = p.x + side * rnd(G2.vw * 0.62, G2.vw * 1.05);
      if (x < 30 || x > L.w - 50) continue;
      const y = this.findGround(x);
      if (y > 0 && Math.abs(y - (p.y + p.h)) < 260) { this.spawnZombie(pick(this._spawnPool), x, y); return; }
    }
    this.spawnZombie(pick(this._spawnPool), clamp(p.x + rnd(-460, 460), 40, L.w - 60), this.findGround(clamp(p.x + rnd(-460, 460), 40, L.w - 60)));
  },

  /** Найти поверхность земли в точке x (сверху вниз). */
  findGround(x) {
    const cx = Math.floor(x / DEST.cw);
    for (let y = 40; y < this.L.h - 30; y += 6) {
      const cy = Math.floor(y / DEST.ch);
      if (DEST.solid(cx, cy)) continue;
      if (DEST.solid(cx, cy + 1)) return y;
    }
    return this.L.h - 200;
  },

  spawnZombie(type, x, y) {
    const z = Enemies.make(this, type, x, y, null);
    this.enemies.push(z);
    if (z.boss || z.mini) FX.ring(z.x + z.w / 2, z.y + z.h / 2, 90, z.def.aura ? hex(z.def.aura) : '#ff6a4a', 0.6);
    return z;
  },

  spawnDummy(x, y) {
    const z = Enemies.make(this, 'walker', x, y, null);
    z.dummy = true; z.hp = Infinity; z.maxHp = 1; z.speed = 0; z.dmg = 0;
    z.w = 20; z.h = 40; z.y = y - 40;
    this.enemies.push(z);
    return z;
  },

  /* ================================================================ урон */
  enemyAt(x, y, r) {
    r = r || 3;
    for (const z of this.enemies) {
      if (z.dead) continue;
      if (x > z.x - r && x < z.x + z.w + r && y > z.y - r && y < z.y + z.h + r) return z;
    }
    return null;
  },

  nearestEnemyTo(x, y, maxD, who) {
    let best = null, bd = maxD * maxD;
    for (const z of this.enemies) {
      if (z.dead || z.dummy) continue;
      const d = dist2(x, y, z.x + z.w / 2, z.y + z.h / 2);
      if (d < bd) { bd = d; best = z; }
    }
    return best;
  },

  /** Попадание пули. true = пуля израсходована. */
  hitEnemy(z, b, x, y) {
    const w = WEAPONS[this.weaponId];
    const d0 = Math.hypot(x - (this.player.x + this.player.w / 2), y - (this.player.y + this.player.h / 2));
    const rng = (w.range || 80) * CFG2.PPM;
    const t = clamp(d0 / rng, 0, 1);
    const dmg = b.dmg * lerp(1, w.falloff || 0.7, t);
    const head = (y < z.y + z.h * 0.30);
    const mul = head ? (w.headMul || 1.6) : 1;
    this.stats.hits++;
    if (head) this.stats.heads++;
    this.hitEnemyDirect(z, dmg * mul, x, y, head, 3, b.vx, b.vy);
    UI.hitMarker = 0.12;

    if (b.bulletSplash) this.explode(x, y, b.bulletSplash, b.bulletSplashDmg, 'p', b.bulletExplCol, true);
    if (b.splash) { this.explode(x, y, b.splash, b.splashDmg, 'p', b.explCol, b.noSelf); return true; }
    if (!b.pierce) { FX.burst(x, y, 4, '#ffd0a0', 160, 2, 300); return true; }
    FX.burst(x, y, 2, '#ffd0a0', 120, 2, 300);
    return false;
  },

  hitEnemyDirect(z, dmg, x, y, head, knock, kx, ky, silent) {
    if (z.dead || z.dummy) {
      if (z.dummy) {
        z.dpsAcc = (z.dpsAcc || 0) + dmg;
        z.dmgSum = (z.dmgSum || 0) + dmg;
        FX.num(x, y - 10, dmg, '#ffd94a');
        this._dummyTick = 1;
      }
      return;
    }
    if (z.armor > 0) dmg *= (1 - z.armor);
    z.hp -= dmg;
    z.hurtT = 0.09;
    const gore = Store2.load().settings.gore;
    FX.blood(x, y, kx || 1, ky || 0, head ? 10 : 6, gore);
    if (!silent) {
      FX.num(x, y - 8, dmg, head ? '#ff5a4a' : '#ffffff', head);
      Audio3D_SFX.hit(x, 0, 0);
      Audio3D_SFX.flesh(x, 0, 0);
    }
    if (knock && !z.boss) {
      const k = knock * (z.mini ? 0.35 : 1) * 60;
      const l = Math.hypot(kx, ky) || 1;
      z.vx += (kx / l) * k; z.vy -= 40;
    }
    if (z.hp <= 0) this.killEnemy(z, head ? 'head' : 'shot');
  },

  killEnemy(z, cause) {
    if (z.dead) return;
    z.dead = true;
    if (z.dummy) return;
    this.kills++;
    this.score += z.score;
    const st = Store2.load();
    st.kills++; st.hits += 0;
    const gore = st.settings.gore;
    const cx = z.x + z.w / 2, cy = z.y + z.h / 2;

    if (z.def.splits) {
      for (let i = 0; i < z.def.splits; i++)
        this.spawnZombie(z.def.splitType || 'crawler', cx + rnd(-24, 24), cy);
    }
    if (z.def.explosive) this.explode(cx, cy, (z.def.blastR || 6.5) * CFG2.PPM, z.def.blastDmg || 90, 'z');
    FX.blood(cx, cy, rnd(-1, 1), -1, gore ? 16 : 5, gore);
    if (gore && (z.mini || z.boss)) FX.burst(cx, cy, 24, '#8a0f18', 220, 3, 420);
    FX.num(cx, cy - 14, z.score, '#ffd94a');
    Audio3D_SFX.kill(cx, 0, 0);
    this.addFeed((cause === 'head' ? '☠ ' : '☠ ') + z.name + '  +₽' + z.money, cause === 'head' ? '#ff8a7a' : '#c8d4e8');

    const money = z.money;
    this.player.money = Math.min(CFG.moneyCap || 9999999, this.player.money + money);
    for (let i = 0; i < Math.min(4, 1 + (money / 90) | 0); i++) {
      this.coins.push({ x: cx, y: cy, vx: rnd(-90, 90), vy: rnd(-220, -90), v: Math.round(money / 2), t: 9 });
    }
    /* лёгкие убийства сохраняем сразу */
    if (this.kills % 25 === 0) Store2.save();
  },

  hurtPlayer(dmg, x, y, silent) {
    const p = this.player;
    if (p.dead || p.invuln > 0) return;
    if (p.armor > 0) {
      const use = Math.min(p.armor, dmg * 0.6);
      p.armor -= use; dmg -= use * 0.85;
    }
    p.hp -= dmg;
    p.hurtFlash = 1;
    Cam.add(clamp(dmg / 60, 0.1, 0.7));
    if (!silent) {
      Audio3D_SFX.hurt(p.x, 0, 0);
      FX.blood(p.x + p.w / 2, p.y + p.h / 2, sign(p.x - x) || 1, -0.4, 5, Store2.load().settings.gore);
    }
    if (p.hp <= 0) this.die();
  },

  die() {
    const p = this.player;
    p.dead = true; p.hp = 0;
    const st = Store2.load();
    st.deaths++; st.shots += this.stats.shots; st.hits += this.stats.hits; st.heads += this.stats.heads;
    st.bananas += this.stats.bananas;
    if (this.score > st.bestScore) st.bestScore = this.score;
    if (this.wave > st.bestWave) st.bestWave = this.wave;
    Store2.save();
    FX.burst(p.x + p.w / 2, p.y + p.h / 2, 26, '#c01824', 260, 3, 500);
    Cam.add(1.0);
    Audio3D_SFX.kill(p.x, 0, 0);
    this.state = 'over';
  },

  explode(x, y, r, dmg, owner, col, noSelf) {
    doExplosion(this, x, y, r, dmg, owner, col, noSelf);
  },

  /** Отложенный взрыв бочки (без рекурсии). */
  queueBoom(x, y) {
    if (this.booms.length > 40) return;
    this.booms.push({ x, y, t: 0.05 });
  },

  updateBooms(dt) {
    for (let i = this.booms.length - 1; i >= 0; i--) {
      const b = this.booms[i];
      b.t -= dt;
      if (b.t > 0) continue;
      this.booms.splice(i, 1);
      this.explode(b.x, b.y, 96, 95, 'z', null, false);
    }
  },

  breakBlock(b) {
    if (b.broken) return;
    b.broken = true;
    const i = this.L.solid.indexOf(b);
    if (i >= 0) this.L.solid.splice(i, 1);
    const j = this.L.rects.indexOf(b);
    if (j >= 0) this.L.rects.splice(j, 1);
    this.L.grid = new SpatialGrid(this.L.w, this.L.h, CELL, this.L.solid);
    FX.burst(b.x + b.w / 2, b.y + b.h / 2, 10, b.kind === 'barrel' ? '#ff9a2a' : '#a87a38', 180, 3, 500);
    if (b.kind === 'barrel') this.explode(b.x + b.w / 2, b.y + b.h / 2, 96, 90, 'z');
  },

  addFeed(s, c) { this.feed.unshift({ s, c, t: 3.4 }); if (this.feed.length > 5) this.feed.pop(); },

  /** Аудио — перенесённый модуль из 3D-версии. Оборачиваем все методы в try/catch,
      чтобы никакая звуковая ошибка не могла уронить игру. */
  guardAudio() {
    if (typeof Audio3D_SFX === 'undefined' || this._audioGuarded) return;
    this._audioGuarded = true;
    for (const k in Audio3D_SFX) {
      const f = Audio3D_SFX[k];
      if (typeof f === 'function') {
        const wrap = function () {
          try { return f.apply(Audio3D_SFX, arguments); } catch (e) { return undefined; }
        };
        Audio3D_SFX[k] = wrap;
      }
    }
  },

  /** Начислить старт/конец боя без музыки-ошибок. */
  refreshMusic() {
    if (typeof Audio3D_SFX === 'undefined' || !Audio3D_SFX.ctx) return;
    if (this.state === 'menu' || !this.L) { Audio3D_SFX.musicStop(); return; }
    if (this.mode === 'range') { Audio3D_SFX.musicStop(); return; }
    let boss = null;
    for (const e of this.enemies) if (e.boss && !e.dead) { boss = e; break; }
    if (boss) Audio3D_SFX.musicStart('boss');
    else if (this.waveState === 'run') Audio3D_SFX.musicStart();
    else Audio3D_SFX.musicStop();
  },

  /* ================================================================ отрисовка */
  draw() {
    const ctx = G2.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, G2.vw, G2.vh);
    UI.clear();

    if (this.state === 'menu') { UI.menu(ctx, this); return; }

    if (this.L) {
      REND.sky(this.L);
      ctx.save();
      ctx.translate(-Cam.left(), -Cam.top());

      /* бочки/ящики как часть карты уже в rects */
      REND.world(this.L);

      /* кислота */
      for (const a of this.acids) {
        ctx.globalAlpha = clamp(a.life / a.max, 0, 1) * 0.85;
        rect(ctx, a.x - a.r, a.y - 3, a.r * 2, 5, '#8ce03c');
        ctx.globalAlpha = 1;
      }

      /* монеты */
      for (const c of this.coins) {
        rect(ctx, c.x - 3, c.y - 4, 6, 7, '#e8c23a');
        rect(ctx, c.x - 1, c.y - 4, 2, 7, '#fff0a0');
      }

      FX.draw(ctx);

      /* враги */
      for (const z of this.enemies) {
        if (z.dead) continue;
        Enemies.draw(this, ctx, z);
      }
      for (const z of this.enemies) if (!z.dead) Enemies.drawBar(ctx, z);

      /* игрок */
      this.drawPlayer(ctx);

      /* луч */
      if (this.beam) {
        const b = this.beam;
        if (b.drill) {
          ctx.globalAlpha = 0.35;
          line(ctx, b.x1, b.y1, b.x2, b.y2, 3, '#c8b8a0');
          ctx.globalAlpha = 1;
        } else {
          ctx.globalAlpha = 0.85;
          line(ctx, b.x1, b.y1, b.x2, b.y2, 6, '#ff6a2a');
          line(ctx, b.x1, b.y1, b.x2, b.y2, 2, '#fff0d0');
          ctx.globalAlpha = 1;
        }
        this.beam = null;
      }

      BULLETS.draw(ctx);
      FX.drawTexts(ctx);
      ctx.restore();
    }

    /* вспышка урона */
    if (this.player.hurtFlash > 0) {
      ctx.fillStyle = 'rgba(160,0,0,' + (this.player.hurtFlash * 0.35).toFixed(3) + ')';
      ctx.fillRect(0, 0, G2.vw, G2.vh);
    }

    if (this.state === 'over') { UI.over(ctx, this); UI.touch(ctx, this); return; }
    UI.hud(ctx, this);
    UI.touch(ctx, this);
    if (this.state === 'shop') UI.shop(ctx, this);
    if (this.state === 'pause') UI.pause(ctx, this);

    if (window.__errs.length) {
      const h = Math.min(G2.vh, 18 + window.__errs.length * 13);
      rect(ctx, 0, 0, G2.vw, h, 'rgba(150,0,0,.9)');
      for (let i = 0; i < window.__errs.length && i < 16; i++)
        text(ctx, String(window.__errs[i]).slice(0, 110), 6, 14 + i * 13, 9, '#fff', 'left', true);
    }

    /* отладочный статус для автотестов */
    const dbg = 'state=' + this.state + ' wave=' + this.wave + ' ws=' + this.waveState +
      ' en=' + this.enemies.length + ' left=' + (this._spawnLeft | 0) + ' parts=' + FX.parts.length +
      ' bul=' + BULLETS.list.length + ' fps=' + G2.fps.toFixed(0) + ' t=' + G2.time.toFixed(1);
    if (this._dbg !== dbg) {
      this._dbg = dbg;
      let d = document.getElementById('__dbg');
      if (!d) { d = document.createElement('pre'); d.id = '__dbg'; document.body.appendChild(d); }
      d.textContent = dbg;
    }
  },

  drawPlayer(ctx) {
    const p = this.player;
    if (p.dead) return;
    ctx.save();
    ctx.globalAlpha = 0.3;
    rect(ctx, p.x + 1, p.y + p.h - 2, p.w - 2, 3, '#000');
    ctx.globalAlpha = 1;
    ctx.restore();
    if (p.invuln > 0 && ((G2.time * 12) | 0) % 2) return;

    drawHuman(ctx, p.x + p.w / 2, p.y + p.h, {
      t: G2.time, face: p.face, walk: p.walk, aimX: p.aimX, aimY: p.aimY,
      crouch: Ctrl.crouch, vest: true, scale: 1.06,
    });

    /* оружие в руках */
    const w = WEAPONS[this.weaponId];
    if (w) {
      const gx = p.x + p.w / 2, gy = p.y + p.h - CFG2.PLAYER_H * 0.63;
      ctx.save();
      ctx.translate(gx, gy);
      ctx.rotate(Math.atan2(p.aimY, p.aimX));
      const gl = w.cat === 'melee' ? 14 : (w.cat === 'sniper' ? 34 : w.cat === 'pistol' ? 18 : 26);
      drawGunShape(ctx, w.cat, gl, this.weaponId);
      ctx.restore();

      /* вспышка выстрела */
      if (this.muzzleT > 0 && w.cat !== 'melee') {
        this.muzzleT -= G2.dt;
        const gl2 = w.cat === 'sniper' ? 34 : w.cat === 'pistol' ? 18 : 26;
        const mx = gx + Math.cos(Math.atan2(p.aimY, p.aimX)) * (gl2 + 3);
        const my = gy + Math.sin(Math.atan2(p.aimY, p.aimX)) * (gl2 + 3);
        ctx.save();
        ctx.translate(mx, my);
        ctx.rotate(Math.atan2(p.aimY, p.aimX));
        rect(ctx, 0, -2, 9, 4, '#fff2c0');
        rect(ctx, 2, -5, 5, 10, '#ffd24a');
        rect(ctx, 5, -3, 7, 6, '#ff9a2a');
        ctx.restore();
      }
    }
    /* щит */
    if (p.shieldOn > 0) {
      ctx.globalAlpha = 0.5;
      ring(ctx, p.x + p.w / 2 + p.aimX * 16, p.y + p.h * 0.5, 20, 3, '#5ad8ff');
      ctx.globalAlpha = 1;
    }
  },

  /* ================================================================ ввод UI */
  handleClick() {
    const c = G2.click;
    if (!c) return;
    G2.click = null;
    const hit = UI.hit(c.x, c.y);
    if (!hit) {
      if (this.state === 'shop' && (c.x < 8 || c.x > G2.vw - 8 || c.y < 8 || c.y > G2.vh - 8)) { }
      return;
    }
    const id = hit.id;
    if (id === 'map') { this.mapIdx = hit.data; UI.menuTab = 0; return; }
    if (id === 'start_surv') { this.startRun(this.mapIdx, 'survival'); return; }
    if (id === 'start_range') { this.startRun(this.mapIdx, 'range'); return; }
    if (id === 'cat') { UI.shopCat = hit.data; UI.shopScroll = 0; return; }
    if (id === 'buy') { this.buy(hit.data); return; }
    if (id === 'ready') { this.closeShop(); return; }
    if (id === 'shop') { this.openShop(); return; }
    if (id === 'resume') { this.state = 'play'; return; }
    if (id === 'restart') { this.startRun(this.mapIdx, this.mode); return; }
    if (id === 'menu') { this.state = 'menu'; return; }
    if (id === 'sfx') {
      const s = Store2.load().settings;
      s.sfx = s.sfx > 0.05 ? 0 : 0.6;
      Audio3D_SFX.setVol(s.sfx); Store2.save(); return;
    }
    if (id === 'aim') { G2.autoAim = !G2.autoAim; Store2.load().settings.autoAim = G2.autoAim; Store2.save(); return; }
    if (id === 'gore') { const s = Store2.load().settings; s.gore = !s.gore; Store2.save(); return; }
    if (id === 'shake') { const s = Store2.load().settings; s.screenShake = !s.screenShake; Store2.save(); return; }
  },

  openShop() {
    if (this.waveState !== 'inter' && this.mode !== 'range') { UI.toast('Магазин открывается между волнами'); return; }
    this.state = 'shop';
    UI.shopScroll = 0;
    Audio3D_SFX.uiClick();
  },
  closeShop() { this.state = 'play'; Audio3D_SFX.uiClick(); },

  buy(it) {
    const p = this.player;
    if (it.gear) {
      const g = GEAR[it.id];
      if (p.money < g.price) { UI.toast('Мало денег'); Audio3D_SFX.deny(); return; }
      p.money -= g.price;
      p.armor = Math.max(p.armor, g.ap);
      if (g.helmet) p.maxHp = Math.max(p.maxHp, 100);
      UI.toast('куплено: ' + g.name);
      Audio3D_SFX.buy();
      return;
    }
    const id = it.id, w = WEAPONS[id];
    if (this.owned[id]) { this.equip(id); return; }
    const price = this.mode === 'range' ? 0 : w.price;
    if (p.money < price) { UI.toast('Мало денег: нужно ₽' + price); Audio3D_SFX.deny(); return; }
    p.money -= price;
    this.owned[id] = true;
    Weap.fill(this.weap, id);
    Store2.load().bought[id] = (Store2.load().bought[id] || 0) + 1;
    Store2.save();
    this.equip(id);
    UI.toast('куплено: ' + w.name);
    Audio3D_SFX.buy();
  },

  equip(id) {
    const w = WEAPONS[id];
    const slot = w.slot || 2;
    this.slots[slot] = id;
    this.slotSel = slot;
    this.weaponId = id;
    this.weap.reloadT = 0;
    this.weap.swapT = 0.25;
    this.weap.spin = 0;
    if (this.weap.mag[id] === undefined) Weap.fill(this.weap, id);
  },

  selectSlot(n) {
    const id = this.slots[n];
    if (!id) { UI.toast('слот ' + n + ' пуст'); Audio3D_SFX.deny(); return; }
    this.slotSel = n; this.weaponId = id;
    this.weap.reloadT = 0; this.weap.swapT = 0.22; this.weap.spin = 0;
  },

  nextSlot() {
    const order = [1, 2, 3];
    for (let i = 1; i <= 3; i++) {
      const n = order[(this.slotSel - 1 + i) % 3];
      if (this.slots[n]) { this.selectSlot(n); return; }
    }
  },

  shopScrollKeys(dt) {
    if (G2.keys.ArrowDown) UI.shopScroll = (UI.shopScroll || 0) + dt * 12;
    if (G2.keys.ArrowUp) UI.shopScroll = Math.max(0, (UI.shopScroll || 0) - dt * 12);
  },
};

/* ================================================================ клавиатура */
function onGameKey(code) {
  const G = Game;
  if (G.state === 'menu') {
    if (code === 'Enter') G.startRun(G.mapIdx, 'survival');
    if (code === 'ArrowLeft') G.mapIdx = (G.mapIdx + MAPS2.length - 1) % MAPS2.length;
    if (code === 'ArrowRight') G.mapIdx = (G.mapIdx + 1) % MAPS2.length;
    return;
  }
  if (G.state === 'over') {
    if (code === 'Enter' || code === 'KeyR') G.startRun(G.mapIdx, G.mode);
    if (code === 'Escape') G.state = 'menu';
    return;
  }
  if (G.state === 'shop') {
    if (code === 'KeyB' || code === 'Escape' || code === 'Enter') { if (G.waveState === 'inter' || G.mode === 'range') G.closeShop(); }
    return;
  }
  if (code === 'Escape') {
    G.state = G.state === 'pause' ? 'play' : 'pause';
    Audio3D_SFX.uiClick();
    return;
  }
  if (G.state === 'pause') return;

  if (code === 'Digit1') G.selectSlot(1);
  if (code === 'Digit2') G.selectSlot(2);
  if (code === 'Digit3') G.selectSlot(3);
  if (code === 'KeyR') Weap.startReload(G, G.weaponId);
  if (code === 'KeyB') G.openShop();
  if (code === 'KeyE') G.nextSlot();
  if (code === 'KeyT') { G.hint = G.hint === 'ПОЛИГОН...' ? '' : ''; }
}

/* ================================================================ БУР
   Добавляем в таблицу оружия из оригинала два новых инструмента. */
WEAPONS.drill = {
  name: 'БУР', cat: 'drill', slot: 3, price: 6500, dmg: 90, rpm: 400,
  mag: Infinity, reserve: 0, auto: true, spread: 0, moveSpread: 0,
  recoil: 0.5, falloff: 1, range: 2.8, headMul: 1.6, sound: 'knife',
  melee: 'drill', drill: true, drillR: 10, drillDps: 260, knockback: 4,
};
WEAPONS.drillMega = {
  name: 'ПРОХОДЧЕСКИЙ ЩИТ', cat: 'drill', slot: 2, price: 28000, dmg: 260, rpm: 320,
  mag: Infinity, reserve: 0, auto: true, spread: 0, moveSpread: 0,
  recoil: 0.25, falloff: 1, range: 4.6, headMul: 1.6, sound: 'knife',
  melee: 'drill', drill: true, drillR: 20, drillDps: 820, knockback: 8, pierce: true,
};

window.addEventListener('load', () => Game.init());
