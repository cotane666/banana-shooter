/* ============================================================
   08 — INPUT: pointer lock, keyboard, mouse, TOUCH, settings
   ============================================================ */

/* A single mousemove event reporting more than this many pixels is a browser
   spike, not real hand motion (real flicks arrive as many small events). */
const MAX_MOUSE_STEP = 260;

/* true on phones/tablets: touch input and no precise pointer.
   Can be forced with ?touch=1 / ?touch=0 — handy for hybrid laptops and tests. */
const IS_TOUCH = (function () {
  try {
    const q = new URLSearchParams(location.search);
    const forced = q.get('touch');
    if (forced === '1') return true;
    if (forced === '0') return false;
  } catch (e) { }
  return (('ontouchstart' in window) || (navigator.maxTouchPoints > 0)) &&
    !window.matchMedia('(pointer: fine)').matches;
})();

const Input = {
  keys: Object.create(null),
  mouse: { dx: 0, dy: 0, left: false, right: false, wheel: 0 },
  locked: false,
  enabled: false,
  _skipNextMove: false,
  sens: 2.2,
  invertY: 1,
  el: null,
  onKeyDown: null,     // hooks assigned by Game
  onKeyUp: null,
  onMouseDown: null,
  onMouseUp: null,
  onWheel: null,
  onLockChange: null,
  bindings: {},
  climbQueued: false,  // set by the PC climb key, consumed once per press
  dashQueued: false,   // set by the PC dash key, consumed once per press

  init(el) {
    this.el = el;
    this.sens = Store.data.sens;

    const isEditable = t => t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);

    window.addEventListener('keydown', e => {
      const k = e.code;
      if (isEditable(e.target)) {
        if (k === 'Escape') e.target.blur();
        return;
      }
      if (!this.keys[k]) { if (this.onKeyDown) this.onKeyDown(k, e); }
      this.keys[k] = true;
      if (this.enabled) {
        if (['Tab', 'Space', 'KeyB', 'KeyR', 'Digit1', 'Digit2', 'Digit3', 'KeyG', 'KeyJ', 'KeyM', 'KeyY'].indexOf(k) >= 0) e.preventDefault();
        if (k === 'F5' || k === 'F11' || k === 'F12') return;
      }
    });
    window.addEventListener('keyup', e => {
      const k = e.code;
      this.keys[k] = false;
      if (this.onKeyUp) this.onKeyUp(k, e);
    });
    window.addEventListener('blur', () => {
      this.keys = Object.create(null);
      this.mouse.left = this.mouse.right = false;
      this.mouse.dx = this.mouse.dy = 0;
      this._skipNextMove = true;       // ignore the first delta after refocus
    });
    window.addEventListener('focus', () => { this._skipNextMove = true; });

    document.addEventListener('mousemove', e => {
      if (!this.locked) return;
      // Chrome reports a huge movement delta on the first event after the
      // pointer is locked (the distance from the cursor's previous position).
      // Applying it whips the view around, so drop that one event.
      if (this._skipNextMove) { this._skipNextMove = false; this.mouse.dx = this.mouse.dy = 0; return; }
      // Mice occasionally emit spikes of hundreds or thousands of pixels in a
      // single event. Clamp them; real fast motion arrives as many small events.
      const mx = U.clamp(e.movementX || 0, -MAX_MOUSE_STEP, MAX_MOUSE_STEP);
      const my = U.clamp(e.movementY || 0, -MAX_MOUSE_STEP, MAX_MOUSE_STEP);
      const s = this.sens * 0.00042;
      this.mouse.dx += mx * s;
      this.mouse.dy += my * s * this.invertY;
    });

    document.addEventListener('mousedown', e => {
      if (!this.enabled) return;
      if (e.button === 0) this.mouse.left = true;
      if (e.button === 2) this.mouse.right = true;
      if (this.onMouseDown) this.onMouseDown(e.button, e);
    });
    document.addEventListener('mouseup', e => {
      if (e.button === 0) this.mouse.left = false;
      if (e.button === 2) this.mouse.right = false;
      if (this.onMouseUp) this.onMouseUp(e.button, e);
    });
    document.addEventListener('contextmenu', e => { if (this.enabled) e.preventDefault(); });
    document.addEventListener('wheel', e => {
      if (!this.enabled) return;
      e.preventDefault();
      this.mouse.wheel += Math.sign(e.deltaY);
    }, { passive: false });

    document.addEventListener('pointerlockchange', () => {
      const wasLocked = this.locked;
      this.locked = document.pointerLockElement === el || document.pointerLockElement === document.body;
      // entering pointer lock also produces a bogus first delta
      if (this.locked) { this._skipNextMove = true; this.mouse.dx = this.mouse.dy = 0; }
      if (this.onLockChange) this.onLockChange(this.locked, wasLocked);
    });
    document.addEventListener('pointerlockerror', () => { this.locked = false; });

    /* ---- touch: global routing (the game layer has pointer-events:none) ---- */
    if (IS_TOUCH) {
      const opts = { passive: false };
      document.addEventListener('touchstart', e => {
        if (!TouchUI.active || !Game.running || Game.mode === CS.MODE.MENU) return;
        if (UI.overlayOpen()) return;                 // menus own their taps
        if (e.target && e.target.closest && e.target.closest('#touchui button')) return;
        e.preventDefault();
        TouchUI.onStart(e);
      }, opts);
      document.addEventListener('touchmove', e => {
        if (!TouchUI.active || TouchUI.stick === null && TouchUI.lookTouchId < 0) return;
        e.preventDefault();
        TouchUI.onMove(e);
      }, opts);
      document.addEventListener('touchend', e => { if (TouchUI.active) TouchUI.onEnd(e); }, opts);
      document.addEventListener('touchcancel', e => { if (TouchUI.active) TouchUI.onEnd(e); }, opts);
      // no pinch-zoom / double-tap-zoom while playing
      document.addEventListener('gesturestart', e => e.preventDefault());
    }
  },

  requestLock() {
    const d = document;
    if (!this.el) return;
    try {
      const p = (this.el.requestPointerLock || function () { }).call(this.el);
      if (p && p.catch) p.catch(() => { });
    } catch (e) { }
  },
  releaseLock() { try { document.exitPointerLock(); } catch (e) { } },

  consumeMouse() {
    const d = { dx: this.mouse.dx, dy: this.mouse.dy, left: this.mouse.left, right: this.mouse.right, wheel: this.mouse.wheel };
    this.mouse.dx = 0; this.mouse.dy = 0; this.mouse.wheel = 0;
    return d;
  },

  /* movement input vector */
  moveVector() {
    if (IS_TOUCH) return TouchUI.moveVector();
    const k = this.keys;
    let f = 0, r = 0;
    if (k['KeyW'] || k['ArrowUp']) f += 1;
    if (k['KeyS'] || k['ArrowDown']) f -= 1;
    if (k['KeyD'] || k['ArrowRight']) r += 1;
    if (k['KeyA'] || k['ArrowLeft']) r -= 1;
    return {
      f, r,
      run: !!(k['ShiftLeft'] || k['ShiftRight']),
      crouch: !!(k['ControlLeft'] || k['ControlRight'] || k['KeyC']),
      wantJump: !!k['Space']
    };
  },

  /* ---- unified accessors so the game loop works for mouse AND touch ---- */
  lookDelta() {
    return IS_TOUCH ? TouchUI.lookDelta() : this.consumeMouse();
  },
  fireDown() {
    return IS_TOUCH ? TouchUI.firePressed : this.mouse.left;
  },
  aimDown() {
    return IS_TOUCH ? TouchUI.aimPressed : this.mouse.right;
  },
  /* consume a one-shot jump request (touch button or keyboard edge) */
  consumeJump() {
    if (IS_TOUCH) { const j = TouchUI.jumpQueued; TouchUI.jumpQueued = false; return j; }
    return false;
  },
  consumeReload() {
    if (IS_TOUCH) { const r = TouchUI.reloadQueued; TouchUI.reloadQueued = false; return r; }
    return false;
  },
  consumeWeaponSwitch() {
    if (IS_TOUCH) { const w = TouchUI.switchQueued; TouchUI.switchQueued = false; return w; }
    return 0;
  },
  /* dedicated climb request: the touch button, or the PC key (edge-triggered) */
  consumeClimb() {
    if (IS_TOUCH) { const c = TouchUI.climbQueued; TouchUI.climbQueued = false; return c; }
    const c = this.climbQueued; this.climbQueued = false; return c;
  },
  /* dedicated dash request (mech ground burst): touch button or PC key */
  consumeDash() {
    if (IS_TOUCH) { const d = TouchUI.dashQueued; TouchUI.dashQueued = false; return d; }
    const d = this.dashQueued; this.dashQueued = false; return d;
  }
};

/* ============================================================
   TOUCH CONTROLS
   Left thumb  : floating joystick → movement
   Right thumb : drag anywhere on the right → look
   Buttons     : fire, aim, jump, crouch, reload, weapon, buy
   Tap-to-fire is also available (a short tap on the right fires once).
   ============================================================ */
const TouchUI = {
  active: false,
  root: null,
  stick: null,        // {id, ox, oy, cx, cy}
  move: { f: 0, r: 0, run: false },
  lookTouchId: -1,
  lastLook: { x: 0, y: 0 },
  look: { dx: 0, dy: 0 },
  firePressed: false,
  aimPressed: false,
  autoFire: false,        // double-tap locked: keep firing like a held LMB
  jumpQueued: false,
  jumpHeld: false,
  crouchToggle: false,   // ПРИСЕСТЬ — переключатель (не удержание)
  reloadQueued: false,
  switchQueued: 0,
  climbQueued: false,
  dashQueued: false,
  runHeld: false,
  sens: 1.5,
  _els: {},
  _tapStart: 0,
  _tapMoved: 0,
  _lastTapT: 0,

  init() {
    if (!IS_TOUCH) return;
    this.active = true;
    this.sens = Store.data.touchSens || 1.5;
    document.documentElement.classList.add('touch');   // drives the mobile CSS
    this.build();
    this.bind();
    // the game must not try to grab a pointer on touch devices
    Input.enabled = false;
  },

  build() {
    const wrap = document.createElement('div');
    wrap.id = 'touchui';
    wrap.innerHTML =
      '<div id="tStick"><div id="tStickBase"></div><div id="tStickKnob"></div></div>' +
      '<button id="tAim" class="tbtn small">ПРИЦЕЛ</button>' +
      '<button id="tAuto" class="tbtn small">АВТО</button>' +
      '<button id="tJump" class="tbtn small">ПРЫЖОК</button>' +
      '<button id="tCrouch" class="tbtn small">ПРИСЕСТЬ</button>' +
      '<button id="tReload" class="tbtn small">ПЕРЕЗАРЯДКА</button>' +
      '<button id="tSwap" class="tbtn small">СМЕНА</button>' +
      '<button id="tBuy" class="tbtn small accent">МАГАЗИН</button>' +
      '<button id="tMenu" class="tbtn small">ПАУЗА</button>' +
      '<button id="tClimb" class="tbtn small accent">ЗАЛЕЗТЬ</button>' +
      '<button id="tDash" class="tbtn small accent">РЫВОК</button>' +
      /* contextual actions: only the ones that make sense right now are shown */
      '<div id="tActions">' +
        '<button id="tHeal" class="tbtn act accent">АПТЕЧКА</button>' +
        '<button id="tDrone" class="tbtn act accent">ДРОН</button>' +
        '<button id="tGrenade" class="tbtn act accent">ГРАНАТА</button>' +
        '<button id="tGrenadeKind" class="tbtn act">ТИП</button>' +
        '<button id="tMissiles" class="tbtn act accent">РАКЕТЫ</button>' +
        '<button id="tSurge" class="tbtn act accent">СКАЧОК</button>' +
        '<button id="tMech" class="tbtn act accent">ВЫЙТИ</button>' +
        '<button id="tTurret" class="tbtn act accent">ТУРЕЛЬ</button>' +
        '<button id="tDummy" class="tbtn act accent">МАНЕКЕН</button>' +
        '<button id="tSpawn" class="tbtn act accent">СПАВН</button>' +
        '<button id="tUnstick" class="tbtn act">СБРОС</button>' +
      '</div>' +
      '<div id="tHint">Слева — ходьба · Справа — обзор · Тап — огонь · АВТО — очередь · Кнопки справа появляются по ситуации</div>';
    document.body.appendChild(wrap);
    this.root = wrap;
    this._els = {
      stick: document.getElementById('tStick'),
      base: document.getElementById('tStickBase'),
      knob: document.getElementById('tStickKnob'),
      aim: document.getElementById('tAim'),
      auto: document.getElementById('tAuto'),
      jump: document.getElementById('tJump'),
      crouch: document.getElementById('tCrouch'),
      reload: document.getElementById('tReload'),
      swap: document.getElementById('tSwap'),
      buy: document.getElementById('tBuy'),
      menu: document.getElementById('tMenu'),
      climb: document.getElementById('tClimb'),
      dash: document.getElementById('tDash'),
      actions: document.getElementById('tActions'),
      heal: document.getElementById('tHeal'),
      drone: document.getElementById('tDrone'),
      grenade: document.getElementById('tGrenade'),
      grenadeKind: document.getElementById('tGrenadeKind'),
      missiles: document.getElementById('tMissiles'),
      surge: document.getElementById('tSurge'),
      mech: document.getElementById('tMech'),
      turret: document.getElementById('tTurret'),
      dummy: document.getElementById('tDummy'),
      spawn: document.getElementById('tSpawn'),
      unstick: document.getElementById('tUnstick'),
      hint: document.getElementById('tHint')
    };
    // fire/aim must be usable while a match is not running too, so we set the
    // pointer-events on the layer from update() instead
    wrap.style.display = 'none';
  },

  bind() {
    const E = this._els;
    const swallow = e => { e.preventDefault(); e.stopPropagation(); };
    const holdBtn = (el, on, off) => {
      el.addEventListener('touchstart', e => { swallow(e); el.classList.add('down'); on(); }, { passive: false });
      el.addEventListener('touchend', e => { swallow(e); el.classList.remove('down'); off(); }, { passive: false });
      el.addEventListener('touchcancel', e => { swallow(e); el.classList.remove('down'); off(); }, { passive: false });
    };
    /* ПРИСЕСТЬ — ПЕРЕКЛЮЧАТЕЛЬ: нажал один раз сел, нажал второй — встал.
       Раньше кнопку нужно было удерживать, что мешало целиться и стрелять. */
    E.crouch.addEventListener('touchstart', e => {
      swallow(e);
      this.crouchToggle = !this.crouchToggle;
      E.crouch.classList.toggle('down', this.crouchToggle);
    }, { passive: false });
    // ПРЫЖОК зажимаемый: пока держишь — прыгаешь/летишь на джетпаке перка
    holdBtn(E.jump, () => { this.jumpQueued = true; this.jumpHeld = true; }, () => { this.jumpHeld = false; });
    // Dedicated automatic-fire button (a toggle). It replaced the old
    // double-tap gesture, which conflicted with normal aiming taps.
    E.auto.addEventListener('touchstart', e => {
      swallow(e);
      this.autoFire = !this.autoFire;
      E.auto.classList.toggle('down', this.autoFire);
      Bus.emit('touchAutoFire', this.autoFire);
    }, { passive: false });
    // scope is a TOGGLE, not a hold: with one thumb on the button you could not
    // also look around or tap to fire, so the only way to shoot while scoped was
    // to lower the scope first. As a toggle the thumb is free to aim and shoot.
    E.aim.addEventListener('touchstart', e => {
      swallow(e);
      this.aimPressed = !this.aimPressed;
      E.aim.classList.toggle('down', this.aimPressed);
      Bus.emit('touchAim', this.aimPressed);
    }, { passive: false });
    E.reload.addEventListener('touchstart', e => { swallow(e); this.reloadQueued = true; E.reload.classList.add('down'); setTimeout(() => E.reload.classList.remove('down'), 130); }, { passive: false });
    E.swap.addEventListener('touchstart', e => { swallow(e); this.switchQueued = 1; E.swap.classList.add('down'); setTimeout(() => E.swap.classList.remove('down'), 130); }, { passive: false });
    E.climb.addEventListener('touchstart', e => { swallow(e); this.climbQueued = true; E.climb.classList.add('down'); setTimeout(() => E.climb.classList.remove('down'), 160); }, { passive: false });
    E.dash.addEventListener('touchstart', e => { swallow(e); this.dashQueued = true; E.dash.classList.add('down'); setTimeout(() => E.dash.classList.remove('down'), 160); }, { passive: false });
    E.heal.addEventListener('touchstart', e => { swallow(e); Bus.emit('touchUseMedkit'); E.heal.classList.add('down'); setTimeout(() => E.heal.classList.remove('down'), 160); }, { passive: false });
    E.drone.addEventListener('touchstart', e => { swallow(e); Bus.emit('touchUseDrone'); E.drone.classList.add('down'); setTimeout(() => E.drone.classList.remove('down'), 160); }, { passive: false });
    // contextual actions (only shown when useful)
    E.grenade.addEventListener('touchstart', e => { swallow(e); Bus.emit('touchGrenade'); E.grenade.classList.add('down'); setTimeout(() => E.grenade.classList.remove('down'), 160); }, { passive: false });
    E.grenadeKind.addEventListener('touchstart', e => { swallow(e); Bus.emit('touchCycleGrenade'); E.grenadeKind.classList.add('down'); setTimeout(() => E.grenadeKind.classList.remove('down'), 160); }, { passive: false });
    E.missiles.addEventListener('touchstart', e => { swallow(e); Bus.emit('touchMechMissiles'); E.missiles.classList.add('down'); setTimeout(() => E.missiles.classList.remove('down'), 160); }, { passive: false });
    E.surge.addEventListener('touchstart', e => { swallow(e); Bus.emit('touchMechSurge'); E.surge.classList.add('down'); setTimeout(() => E.surge.classList.remove('down'), 160); }, { passive: false });
    E.mech.addEventListener('touchstart', e => { swallow(e); Bus.emit('touchMechToggle'); E.mech.classList.add('down'); setTimeout(() => E.mech.classList.remove('down'), 160); }, { passive: false });
    E.turret.addEventListener('touchstart', e => { swallow(e); Bus.emit('touchTurretGear'); E.turret.classList.add('down'); setTimeout(() => E.turret.classList.remove('down'), 160); }, { passive: false });
    E.dummy.addEventListener('touchstart', e => { swallow(e); Bus.emit('touchRangeDummy'); E.dummy.classList.add('down'); setTimeout(() => E.dummy.classList.remove('down'), 160); }, { passive: false });
    E.spawn.addEventListener('touchstart', e => { swallow(e); Bus.emit('touchRangeSpawn'); E.spawn.classList.add('down'); setTimeout(() => E.spawn.classList.remove('down'), 160); }, { passive: false });
    E.unstick.addEventListener('touchstart', e => { swallow(e); Bus.emit('touchUnstick'); E.unstick.classList.add('down'); setTimeout(() => E.unstick.classList.remove('down'), 160); }, { passive: false });
    E.buy.addEventListener('touchstart', e => { swallow(e); Bus.emit('touchBuy'); E.buy.classList.add('down'); setTimeout(() => E.buy.classList.remove('down'), 130); }, { passive: false });
    E.menu.addEventListener('touchstart', e => { swallow(e); Bus.emit('touchPause'); E.menu.classList.add('down'); setTimeout(() => E.menu.classList.remove('down'), 130); }, { passive: false });
    // double-tap the stick area toggles auto-run
    let lastStickTap = 0;
    E.stick.addEventListener('touchstart', e => {
      const now = U.now();
      if (now - lastStickTap < 320) { this.runHeld = !this.runHeld; UI.toast('Бег: ' + (this.runHeld ? 'вкл' : 'выкл')); }
      lastStickTap = now;
    }, { passive: true });
  },

  /* ---- multi-touch routing across the whole screen ---- */
  onStart(e) {
    for (const t of e.changedTouches) {
      const left = t.clientX < window.innerWidth * 0.45;
      if (left && this.stick === null) {
        this.stick = { id: t.identifier, ox: t.clientX, oy: t.clientY };
        this._els.base.style.display = 'block';
        this._els.base.style.left = t.clientX + 'px';
        this._els.base.style.top = t.clientY + 'px';
        this._els.knob.style.display = 'block';
        this._els.knob.style.left = t.clientX + 'px';
        this._els.knob.style.top = t.clientY + 'px';
      } else if (!left && this.lookTouchId < 0) {
        this.lookTouchId = t.identifier;
        this.lastLook.x = t.clientX; this.lastLook.y = t.clientY;
        this._tapStart = U.now(); this._tapMoved = 0;
      }
    }
  },

  onMove(e) {
    for (const t of e.changedTouches) {
      if (this.stick && t.identifier === this.stick.id) {
        const dx = t.clientX - this.stick.ox, dy = t.clientY - this.stick.oy;
        const R = 62;
        const len = Math.hypot(dx, dy);
        const k = len > R ? R / len : 1;
        const kx = dx * k, ky = dy * k;
        this._els.knob.style.left = (this.stick.ox + kx) + 'px';
        this._els.knob.style.top = (this.stick.oy + ky) + 'px';
        // normalise: f = forward (+1 pushing up), r = strafe (+1 pushing right)
        let nx = dx / R, ny = dy / R;
        const nlen = Math.hypot(nx, ny);
        if (nlen > 1) { nx /= nlen; ny /= nlen; }
        const mag = Math.min(1, nlen);
        if (mag > 0.15) {
          this.move.f = -ny;
          this.move.r = nx;
          this.move.run = mag > 0.85 || this.runHeld;
        } else {
          this.move.f = 0; this.move.r = 0; this.move.run = this.runHeld;
        }
      } else if (t.identifier === this.lookTouchId) {
        let dx = t.clientX - this.lastLook.x, dy = t.clientY - this.lastLook.y;
        this.lastLook.x = t.clientX; this.lastLook.y = t.clientY;
        this._tapMoved += Math.abs(dx) + Math.abs(dy);
        // same guard as the mouse: drop absurd spikes
        dx = U.clamp(dx, -MAX_MOUSE_STEP, MAX_MOUSE_STEP);
        dy = U.clamp(dy, -MAX_MOUSE_STEP, MAX_MOUSE_STEP);
        this.look.dx += dx * this.sens * 0.0026;
        this.look.dy += dy * this.sens * 0.0026;
      }
    }
  },

  onEnd(e) {
    for (const t of e.changedTouches) {
      if (this.stick && t.identifier === this.stick.id) {
        this.stick = null;
        this.move.f = 0; this.move.r = 0; this.move.run = this.runHeld;
        this._els.base.style.display = 'none';
        this._els.knob.style.display = 'none';
      } else if (t.identifier === this.lookTouchId) {
        this.lookTouchId = -1;
        // a drag means "look around", not "shoot"
        if (!(U.now() - this._tapStart < 220 && this._tapMoved < 14)) continue;
        // single tap = one shot (automatic fire has its own on-screen button)
        this.tapFire = true;
      }
    }
  },

  moveVector() {
    return {
      f: this.move.f, r: this.move.r,
      run: this.move.run,
      crouch: !!this.crouchToggle,
      wantJump: this.jumpHeld
    };
  },

  lookDelta() {
    const d = { dx: this.look.dx, dy: this.look.dy, left: this.firePressed, right: this.aimPressed, wheel: 0 };
    this.look.dx = 0; this.look.dy = 0;
    return d;
  },

  /* show/hide the overlay with the match */
  update() {
    if (!this.active) return;
    const show = Game && Game.running && Game.mode !== CS.MODE.MENU;
    this.root.style.display = show ? 'block' : 'none';
    const E = this._els;
    // the shop button must also be reachable on the range, where there is no
    // buy phase (the range runs live with the shop always available)
    const buyVisible = show && (Game.roundState === 'buy' || Game.mode === CS.MODE.RANGE);
    E.buy.style.display = buyVisible ? 'block' : 'none';
    // the stick and look layer are always live; the remaining buttons dim while
    // an overlay is up so they cannot be pressed through it
    const blocked = UI.overlayOpen() && !Game.buyOpen;
    const dim = (el, need) => {
      if (!el) return;
      const on = !!need;
      el.style.display = on ? 'flex' : 'none';
      if (on) el.style.opacity = blocked ? '.35' : '1';
    };
    const p = (typeof Game !== 'undefined') ? Game.player : null;
    const inMech = !!(typeof Game !== 'undefined' && Game.isMechActive && Game.isMechActive());
    const round = Game && Game.roundState;

    // --- always-available core buttons (dim under an overlay) ---
    dim(E.aim, show);
    dim(E.auto, show);
    dim(E.jump, show);
    dim(E.crouch, show);
    dim(E.reload, show);
    dim(E.swap, show);
    dim(E.menu, show);

    // --- climb only when facing something you can actually climb ---
    // (the wall probe allocates, so it is throttled rather than run every frame)
    this._probeT = (this._probeT || 0) + 1;
    if (this._probeT >= 6 || this._canClimb === undefined) {
      this._probeT = 0;
      let canClimb = false;
      if (show && p && p.alive && !inMech) {
        const probe = p.probeWall(Game.world);
        canClimb = !!(probe && probe.top > p.pos.y + CFG.stepUp + 0.05 && p.pos.y > (probe.low === undefined ? -Infinity : probe.low) - 1);
      }
      this._canClimb = canClimb;
    }
    dim(E.climb, this._canClimb);

    // --- mech-only abilities + РЫВОК-перк (доступен и без меха) ---
    dim(E.dash, inMech || (!!(p && p.perkDash) && !inMech));
    dim(E.missiles, inMech);
    dim(E.surge, inMech);
    if (inMech && E.surge) {
      const cd = CFG.mechSurgeCd * 1000;
      const left = (Game && Game._mechSurgeAt) ? (cd - (U.now() - Game._mechSurgeAt)) : 0;
      E.surge.style.opacity = (blocked || left > 0) ? '.35' : '1';
      E.surge.textContent = left > 0 ? ('СКАЧОК ' + Math.ceil(left / 1000)) : 'СКАЧОК';
    }
    if (inMech) E.missiles.style.opacity = (blocked || !!(Game && Game._mechMissileAt && U.now() - Game._mechMissileAt < CFG.mechMissileCd * 1000)) ? '.35' : '1';
    dim(E.mech, inMech || (!!(p && p.mechOwned) && (Game.parkedMechDist ? Game.parkedMechDist() <= 6 : false)));

    // --- grenades: only when a grenade of the selected kind is carried ---
    const gk = (Store.data.grenade) || 'frag';
    const gN = p && p.grenades ? (p.grenades[gk] || 0) : 0;
    const gAny = p && p.grenades ? (p.grenades.frag + p.grenades.freeze + p.grenades.napalm) : 0;
    dim(E.grenade, gN > 0 && !inMech && round !== 'buy');
    dim(E.grenadeKind, gAny > 0 && !inMech && round !== 'buy');
    if (gAny > 0 && gN > 0) E.grenade.textContent = grenadeName(gk) + ' ×' + gN;

    // --- medkit: only with charges (and not at full HP) ---
    const maxHP = (Game && Game.matchHP) || CFG.maxHP;
    dim(E.heal, p && p.medkits > 0 && !inMech && p.health < maxHP);

    // --- kamikaze drone: only when ready, or already in the air (to detonate) ---
    dim(E.drone, p && (p.drone > 0 || (Game && Game.drone)) && !inMech);

    // --- turret-drone gear: only when a charge is held, or one is deployed ---
    dim(E.turret, p && (p.turretDrone > 0 || (Game && Game.turretDrone)) && !inMech);

    // --- range-only tools ---
    const onRange = Game && Game.mode === CS.MODE.RANGE;
    dim(E.dummy, onRange);
    dim(E.spawn, onRange);

    // --- unstick: only while its 2-minute cooldown has run out ---
    let unstickReady = false;
    if (show && Game.mode === CS.MODE.OFFLINE) {
      const left = Game._zResetAt ? (120000 - (U.now() - Game._zResetAt)) / 1000 : 0;
      unstickReady = left <= 0.5;
    }
    dim(E.unstick, unstickReady);

    // the control hint is only useful at the very start of a match
    if (E.hint) {
      if (!this._hintAt && show) this._hintAt = U.now();
      const fresh = show && this._hintAt && (U.now() - this._hintAt < 9000);
      E.hint.style.display = fresh ? 'block' : 'none';
    }
  },

  setSens(v) { this.sens = v; Store.data.touchSens = v; Store.save(); }
};

/* ---------------- settings wiring ---------------- */
function initSettings() {
  const S = Store.data;
  const pairs = [
    ['sSens', 'oSens', 'sens', v => v.toFixed(2)],
    ['sTsens', 'oTsens', 'touchSens', v => v.toFixed(2)],
    ['sFov', 'oFov', 'fov', v => String(Math.round(v))],
    ['sVol', 'oVol', 'vol', v => String(Math.round(v))]
  ];
  pairs.forEach(([si, oi, key, fmt]) => {
    const s = document.getElementById(si), o = document.getElementById(oi);
    if (!s) return;
    s.value = S[key];
    if (o) o.textContent = fmt(S[key]);
    s.addEventListener('input', () => {
      S[key] = parseFloat(s.value);
      if (o) o.textContent = fmt(S[key]);
      applySetting(key, S[key]);
      Store.save();
    });
  });

  // mirrored pause-menu sliders
  const link = (a, b) => {
    const ea = document.getElementById(a), eb = document.getElementById(b);
    if (!ea || !eb) return;
    eb.value = ea.value;
    ea.addEventListener('input', () => { eb.value = ea.value; });
    eb.addEventListener('input', () => { ea.value = eb.value; ea.dispatchEvent(new Event('input')); });
  };
  link('sSens', 'sSens2');
  link('sVol', 'sVol2');
  link('sTsens', 'sTsens2');
  // on a phone there is no mouse, so the quick-settings row shows touch sensitivity
  if (IS_TOUCH) {
    const rowSens = document.getElementById('rowSens');
    const rowTs = document.getElementById('rowTsens');
    if (rowSens) rowSens.classList.add('hidden');
    if (rowTs) rowTs.classList.remove('hidden');
  }
  const oS2 = document.getElementById('oSens2'), oV2 = document.getElementById('oVol2'), oT2 = document.getElementById('oTsens2');
  const syncOut = () => {
    if (oS2) oS2.textContent = Store.data.sens.toFixed(2);
    if (oV2) oV2.textContent = String(Math.round(Store.data.vol));
    if (oT2) oT2.textContent = Number(Store.data.touchSens || 1.5).toFixed(2);
  };
  syncOut();
  ['sSens', 'sSens2', 'sVol', 'sVol2', 'sTsens', 'sTsens2'].forEach(id => {
    const e = document.getElementById(id); if (e) e.addEventListener('input', syncOut);
  });

  const q = document.getElementById('sQual'), oq = document.getElementById('oQual');
  const qNames = ['Выкл', 'Среднее', 'Высокое'];
  if (q) {
    q.value = S.quality;
    if (oq) oq.textContent = qNames[S.quality];
    q.addEventListener('input', () => {
      S.quality = parseInt(q.value, 10);
      if (oq) oq.textContent = qNames[S.quality];
      Store.save();
      if (window.Game && Game.renderer) Game.applyQuality();
    });
  }

  /* графика / производительность: автопресет под устройство или вручную */
  const gfx = document.getElementById('sGfx'), ogfx = document.getElementById('oGfx');
  const gfxNames = ['АВТО', 'НИЗКАЯ', 'СРЕДНЯЯ', 'ВЫСОКАЯ'];
  if (gfx) {
    gfx.value = (S.gfx === undefined ? 0 : S.gfx);
    if (ogfx) ogfx.textContent = gfxNames[parseInt(gfx.value, 10)] || 'АВТО';
    gfx.addEventListener('input', () => {
      S.gfx = parseInt(gfx.value, 10);
      if (ogfx) ogfx.textContent = gfxNames[S.gfx];
      Store.save();
      if (window.Game && Game.applyGfxPreset) Game.applyGfxPreset();
      if (typeof UI !== 'undefined' && UI.toast) UI.toast('Графика: ' + gfxNames[S.gfx], '#57d16a');
    });
  }

  // environment auto-cycle speed
  const evs = document.getElementById('sEnvSpeed'), oevs = document.getElementById('oEnvSpeed');
  if (evs) {
    evs.value = S.envAutoSpeed || 1;
    if (oevs) oevs.textContent = Number(S.envAutoSpeed || 1).toFixed(2);
    evs.addEventListener('input', () => {
      S.envAutoSpeed = parseFloat(evs.value) || 1;
      if (oevs) oevs.textContent = S.envAutoSpeed.toFixed(2);
      Store.save();
    });
  }

  // touch aim-assist (auto-fire when the crosshair is on an enemy)
  const aim = document.getElementById('sAim'), oa = document.getElementById('oAim');
  const aimNames = ['Выкл', 'Вкл'];
  if (aim) {
    aim.value = S.aimAssist === 0 ? 0 : 1;
    if (oa) oa.textContent = aimNames[parseInt(aim.value, 10)];
    aim.addEventListener('input', () => {
      S.aimAssist = parseInt(aim.value, 10);
      if (oa) oa.textContent = aimNames[S.aimAssist];
      Store.save();
    });
  }

  // music on/off — mirrored in the settings panel and the pause menu
  const musicNames = ['Выкл', 'Вкл'];
  const mEls = [document.getElementById('sMusic'), document.getElementById('sMusic2')];
  const mOuts = [document.getElementById('oMusic'), document.getElementById('oMusic2')];
  const applyMusic = (v) => {
    S.music = v;
    mOuts.forEach(o => { if (o) o.textContent = musicNames[v]; });
    if (typeof Audio3D_SFX !== 'undefined') Audio3D_SFX.setMusicEnabled(!!v);
    Store.save();
  };
  mEls.forEach(e => {
    if (!e) return;
    e.value = S.music === 0 ? 0 : 1;
    e.addEventListener('input', () => {
      const v = parseInt(e.value, 10);
      mEls.forEach(x => { if (x && x !== e) x.value = e.value; });
      applyMusic(v);
    });
  });
  if (mOuts[0]) mOuts[0].textContent = musicNames[S.music === 0 ? 0 : 1];
  if (mOuts[1]) mOuts[1].textContent = musicNames[S.music === 0 ? 0 : 1];

  // separate volumes: SFX (shots, hits, explosions) and music, on top of master
  const volPairs = [
    ['sSfx', 'oSfx', 'sSfx2', 'oSfx2', 'sfxVol', (v) => String(Math.round(v))],
    ['sMus', 'oMus', 'sMus2', 'oMus2', 'musicVol', (v) => String(Math.round(v))]
  ];
  volPairs.forEach(([si, oi, si2, oi2, key, fmt]) => {
    const s = document.getElementById(si), o = document.getElementById(oi);
    const s2 = document.getElementById(si2), o2 = document.getElementById(oi2);
    const set = (val, src) => {
      S[key] = val;
      if (o) o.textContent = fmt(val);
      if (o2) o2.textContent = fmt(val);
      if (s && src !== s) s.value = val;
      if (s2 && src !== s2) s2.value = val;
      applySetting(key, val);
      Store.save();
    };
    if (s) { s.value = S[key]; s.addEventListener('input', () => set(parseInt(s.value, 10), s)); }
    if (s2) { s2.value = S[key]; s2.addEventListener('input', () => set(parseInt(s2.value, 10), s2)); }
    if (o) o.textContent = fmt(S[key]);
    if (o2) o2.textContent = fmt(S[key]);
  });

  applySetting('sens', S.sens);
  applySetting('fov', S.fov);
  applySetting('vol', S.vol);
  applySetting('sfxVol', S.sfxVol);
  applySetting('musicVol', S.musicVol);
  if (typeof Audio3D_SFX !== 'undefined') Audio3D_SFX.musicOff = S.music === 0;
}

function applySetting(key, v) {
  if (key === 'sens') Input.sens = v;
  // NOTE: the object is `TouchUI`, not `Touch`. The old guard checked for a
  // non-existent global, so the touch-sensitivity slider silently did nothing.
  else if (key === 'touchSens') { if (typeof TouchUI !== 'undefined') TouchUI.setSens(v); }
  else if (key === 'vol') Audio3D_SFX.setVol(v / 100);
  else if (key === 'sfxVol') Audio3D_SFX.setSfxVol(v / 100);
  else if (key === 'musicVol') Audio3D_SFX.setMusicVol(v / 100);
  else if (key === 'fov') { if (window.Game) Game.baseFov = v; }
}

/* ---------------- mobile setup ---------------- */
function initTouch() {
  if (!IS_TOUCH) return;
  TouchUI.init();
  // touch has no pointer lock, so the keyboard/mouse path must not gate input
  const note = document.getElementById('menuControlsHint');
  if (note) note.textContent = 'Слева стик — ходьба · Справа — обзор · Тап по экрану — огонь';
}
