/* ============================================================
   05 — AUDIO (WebAudio, fully synthesised — no asset files)
   ============================================================ */
const Audio3D_SFX = {
  ctx: null, master: null, sfx: null, musicBus: null, muted: false, vol: .6, sfxVol: 1, musicVol: 1,
  listener: { x: 0, y: 0, z: 0, fx: 0, fz: -1 },

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    // master (overall) -> destination; two sub-buses so effects and music can
    // be balanced (or muted) independently of each other
    this.master = this.ctx.createGain();
    this.master.gain.value = this.vol;
    this.master.connect(this.ctx.destination);
    this.sfx = this.ctx.createGain();
    this.sfx.gain.value = this.sfxVol;
    this.sfx.connect(this.master);
    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = this.musicVol;
    this.musicBus.connect(this.master);
    this.noiseBuf = this._makeNoise(1.0);
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  setVol(v) { this.vol = v; if (this.master) this.master.gain.value = v; },
  setSfxVol(v) { this.sfxVol = v; if (this.sfx) this.sfx.gain.value = v; },
  setMusicVol(v) { this.musicVol = v; if (this.musicBus) this.musicBus.gain.value = v; },
  setListener(x, y, z, fx, fz) { this.listener.x = x; this.listener.y = y; this.listener.z = z; this.listener.fx = fx; this.listener.fz = fz; },

  _makeNoise(sec) {
    const n = Math.floor(this.ctx.sampleRate * sec);
    const b = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return b;
  },

  /* volume/pan/attenuation for a world-positioned sound */
  _spatial(x, y, z, refDist, maxDist) {
    if (x === undefined) return { gain: 1, pan: 0 };
    const L = this.listener;
    const dx = x - L.x, dy = y - L.y, dz = z - L.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const gain = U.clamp(1 - (dist - refDist) / (maxDist - refDist), 0, 1) * U.clamp(refDist / Math.max(dist, .001), 0, 1.3);
    // pan by the component perpendicular to the listener's facing
    const right = { x: -L.fz, z: L.fx };
    const pan = U.clamp((dx * right.x + dz * right.z) / Math.max(dist, .3), -1, 1) * .85;
    return { gain: gain * gain, pan };
  },

  /* gunshot: filtered noise burst + body thump */
  shot(type, x, y, z) {
    if (!this.ctx || this.muted) return;
    const sp = this._spatial(x, y, z, 3, 150);
    if (sp.gain <= .002) return;
    const t = this.ctx.currentTime;
    const P = {
      pistol: { dur: .13, f: 1500, q: 1.1, g: .34, thump: 150, td: .09 },
      smg:    { dur: .10, f: 1900, q: 1.0, g: .30, thump: 165, td: .07 },
      rifle:  { dur: .17, f: 1250, q: .95, g: .45, thump: 118, td: .12 },
      shotgun:{ dur: .26, f: 760,  q: .8,  g: .50, thump: 82,  td: .17 },
      deagle: { dur: .22, f: 900,  q: .9,  g: .50, thump: 95,  td: .15 },
      awp:    { dur: .38, f: 620,  q: .75, g: .56, thump: 68,  td: .26 },
      knife:  { dur: .07, f: 4200, q: 3.0, g: .18, thump: 300, td: .04 },
      banana: { dur: .20, f: 900,  q: .7,  g: .30, thump: 110, td: .18 }
    }[type] || { dur: .15, f: 1400, q: 1, g: .4, thump: 120, td: .1 };

    const pan = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    const out = this.ctx.createGain();
    out.gain.value = sp.gain;
    if (pan) { pan.pan.value = sp.pan; out.connect(pan); pan.connect(this.sfx); }
    else out.connect(this.sfx);

    // noise burst
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = .9 + Math.random() * .25;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = P.f * (.9 + Math.random() * .3); bp.Q.value = P.q;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 260;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(P.g * (.9 + Math.random() * .2), t);
    g.gain.exponentialRampToValueAtTime(.0008, t + P.dur);
    src.connect(bp); bp.connect(hp); hp.connect(g); g.connect(out);

    // low thump
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(P.thump, t);
    osc.frequency.exponentialRampToValueAtTime(P.thump * .45, t + P.td);
    const og = this.ctx.createGain();
    og.gain.setValueAtTime(P.g * .8, t);
    og.gain.exponentialRampToValueAtTime(.001, t + P.td);
    osc.connect(og); og.connect(out);

    src.start(t); src.stop(t + P.dur + .02);
    osc.start(t); osc.stop(t + P.td + .02);
  },

  /* rocket launch: a whoosh plus a deep thump */
  rocketShot(x, y, z) {
    if (!this.ctx || this.muted) return;
    const sp = this._spatial(x, y, z, 3, 180);
    if (sp.gain <= .002) return;
    const t = this.ctx.currentTime;
    const out = this.ctx.createGain(); out.gain.value = sp.gain;
    const pan = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    if (pan) { pan.pan.value = sp.pan; out.connect(pan); pan.connect(this.sfx); } else out.connect(this.sfx);
    // whoosh: band-swept noise
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(1800, t);
    bp.frequency.exponentialRampToValueAtTime(320, t + .5);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(.42, t);
    g.gain.exponentialRampToValueAtTime(.001, t + .55);
    src.connect(bp); bp.connect(g); g.connect(out);
    src.start(t); src.stop(t + .58);
    // launch thump
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(48, t + .30);
    const og = this.ctx.createGain();
    og.gain.setValueAtTime(.55, t);
    og.gain.exponentialRampToValueAtTime(.001, t + .32);
    o.connect(og); og.connect(out);
    o.start(t); o.stop(t + .34);
  },

  /* minigun spin-up: a rising mechanical whirr */
  minigunSpin(x, y, z) {
    if (!this.ctx || this.muted) return;
    const sp = this._spatial(x, y, z, 3, 120);
    if (sp.gain <= .002) return;
    const t = this.ctx.currentTime;
    const out = this.ctx.createGain(); out.gain.value = sp.gain * .5;
    const pan = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    if (pan) { pan.pan.value = sp.pan; out.connect(pan); pan.connect(this.sfx); } else out.connect(this.sfx);
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(70, t);
    o.frequency.exponentialRampToValueAtTime(340, t + .5);
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1200;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(.16, t);
    g.gain.linearRampToValueAtTime(.22, t + .4);
    g.gain.exponentialRampToValueAtTime(.001, t + .6);
    o.connect(lp); lp.connect(g); g.connect(out);
    o.start(t); o.stop(t + .62);
  },

  /* rocket impact: a big low boom with debris noise */
  explosionAt(x, y, z) {
    if (!this.ctx || this.muted) return;
    const sp = this._spatial(x, y, z, 6, 220);
    if (sp.gain <= .002) return;
    const t = this.ctx.currentTime;
    const out = this.ctx.createGain(); out.gain.value = sp.gain;
    const pan = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    if (pan) { pan.pan.value = sp.pan; out.connect(pan); pan.connect(this.sfx); } else out.connect(this.sfx);
    // deep boom
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(90, t);
    o.frequency.exponentialRampToValueAtTime(28, t + .65);
    const og = this.ctx.createGain();
    og.gain.setValueAtTime(.75, t);
    og.gain.exponentialRampToValueAtTime(.001, t + .7);
    o.connect(og); og.connect(out);
    o.start(t); o.stop(t + .72);
    // blast noise
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = .35;
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(.55, t);
    g.gain.exponentialRampToValueAtTime(.001, t + .55);
    src.connect(lp); lp.connect(g); g.connect(out);
    src.start(t); src.stop(t + .58);
  },

  /* the banana launcher: a cartoon "boing" plus a rubbery squeak */
  bananaShot(x, y, z) {    if (!this.ctx || this.muted) return;
    const sp = this._spatial(x, y, z, 3, 150);
    if (sp.gain <= .002) return;
    const t = this.ctx.currentTime;
    const pan = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    const out = this.ctx.createGain(); out.gain.value = sp.gain * .9;
    if (pan) { pan.pan.value = sp.pan; out.connect(pan); pan.connect(this.sfx); } else out.connect(this.sfx);

    // "BOING": a fast downward-then-up pitch bend with a wobble
    const o = this.ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(880, t);
    o.frequency.exponentialRampToValueAtTime(180, t + 0.10);
    o.frequency.exponentialRampToValueAtTime(560, t + 0.20);
    o.frequency.exponentialRampToValueAtTime(240, t + 0.30);
    const og = this.ctx.createGain();
    og.gain.setValueAtTime(.0001, t);
    og.gain.linearRampToValueAtTime(.26, t + .012);
    og.gain.exponentialRampToValueAtTime(.0008, t + .34);
    o.connect(og); og.connect(out);
    o.start(t); o.stop(t + .36);

    // rubbery squeak layered on top
    const o2 = this.ctx.createOscillator();
    o2.type = 'sawtooth';
    o2.frequency.setValueAtTime(1550, t);
    o2.frequency.exponentialRampToValueAtTime(420, t + .22);
    const f2 = this.ctx.createBiquadFilter();
    f2.type = 'bandpass'; f2.frequency.value = 1100; f2.Q.value = 5;
    const g2 = this.ctx.createGain();
    g2.gain.setValueAtTime(.16, t);
    g2.gain.exponentialRampToValueAtTime(.0008, t + .24);
    o2.connect(f2); f2.connect(g2); g2.connect(out);
    o2.start(t); o2.stop(t + .26);

    // a soft wet "thup" for body
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = .5;
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
    const g3 = this.ctx.createGain();
    g3.gain.setValueAtTime(.16, t);
    g3.gain.exponentialRampToValueAtTime(.0008, t + .12);
    src.connect(lp); lp.connect(g3); g3.connect(out);
    src.start(t); src.stop(t + .14);
  },

  /* the projectile landing / hitting something: a comedic "splat" */
  bananaSplat(x, y, z) {
    if (!this.ctx || this.muted) return;
    const sp = this._spatial(x, y, z, 3, 70);
    if (sp.gain <= .004) return;
    const t = this.ctx.currentTime;
    const out = this.ctx.createGain(); out.gain.value = sp.gain * .8;
    const pan = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    if (pan) { pan.pan.value = sp.pan; out.connect(pan); pan.connect(this.sfx); } else out.connect(this.sfx);
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(420, t);
    o.frequency.exponentialRampToValueAtTime(90, t + .14);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(.20, t);
    g.gain.exponentialRampToValueAtTime(.001, t + .16);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + .18);
    this.tone(1200, .05, 'square', .06, x, y, z, 700);
  },

  /* generic tone helper */
  tone(freq, dur, type, gain, x, y, z, slideTo) {
    if (!this.ctx || this.muted) return;
    const sp = this._spatial(x, y, z, 3, 90);
    if (sp.gain <= .002) return;
    const t = this.ctx.currentTime;
    const pan = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    const out = this.ctx.createGain(); out.gain.value = sp.gain;
    if (pan) { pan.pan.value = sp.pan; out.connect(pan); pan.connect(this.sfx); } else out.connect(this.sfx);
    const o = this.ctx.createOscillator();
    o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(.0008, t + dur);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + dur + .02);
  },

  hit(x, y, z, headshot) {
    if (headshot) { this.tone(2100, .09, 'square', .16, x, y, z, 1500); this.tone(3100, .06, 'sine', .1, x, y, z, 2400); }
    else this.tone(760, .05, 'triangle', .10, x, y, z, 480);
  },
  flesh(x, y, z) { if (!this.ctx || this.muted) return; this.tone(190, .12, 'sawtooth', .11, x, y, z, 80); },
  kill() { this.tone(1250, .07, 'square', .13); setTimeout(() => this.tone(1750, .11, 'square', .12), 70); },
  hurt() { this.tone(170, .22, 'sawtooth', .2, undefined, undefined, undefined, 95); },
  empty() { this.tone(2600, .035, 'square', .075); },
  reloadStep(i) { this.tone(420 + i * 90, .045, 'square', .08); },
  pickup() { this.tone(880, .06, 'triangle', .1); setTimeout(() => this.tone(1320, .09, 'triangle', .1), 55); },
  buy() { this.tone(660, .05, 'square', .09); setTimeout(() => this.tone(990, .09, 'square', .09), 60); },
  deny() { this.tone(200, .16, 'square', .12, undefined, undefined, undefined, 120); },
  /* a crate lands: a soft thud plus a bright "ready" ping */
  crateDrop(x, y, z) {
    this.tone(120, .18, 'triangle', .12, x, y, z, 70);
    setTimeout(() => this.tone(1500, .08, 'sine', .09, x, y, z, 1900), 90);
  },
  /* a laser zap: a bright descending sweep with a little resonance */
  laser(x, y, z) {
    if (!this.ctx || this.muted) return;
    const sp = this._spatial(x, y, z, 3, 180);
    if (sp.gain <= .002) return;
    const t = this.ctx.currentTime;
    const pan = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    const out = this.ctx.createGain(); out.gain.value = sp.gain * .9;
    if (pan) { pan.pan.value = sp.pan; out.connect(pan); pan.connect(this.sfx); } else out.connect(this.sfx);
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(2600, t);
    o.frequency.exponentialRampToValueAtTime(320, t + .16);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(.14, t);
    g.gain.exponentialRampToValueAtTime(.001, t + .18);
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
    o.connect(lp); lp.connect(g); g.connect(out);
    o.start(t); o.stop(t + .2);
  },

  /* ---------- laser cannon ---------- */
  /* charging whirr as the barrel winds up — БАСОВЫЙ, не писклявый */
  cannonSpin(x, y, z) {
    if (!this.ctx || this.muted) return;
    const sp = this._spatial(x, y, z, 3, 130);
    if (sp.gain <= .002) return;
    const t = this.ctx.currentTime;
    const out = this.ctx.createGain(); out.gain.value = sp.gain * .6;
    const pan = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    if (pan) { pan.pan.value = sp.pan; out.connect(pan); pan.connect(this.sfx); } else out.connect(this.sfx);
    // низкий «гул» вместо высокого визга
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(48, t);
    o.frequency.exponentialRampToValueAtTime(190, t + .5);
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 620; lp.Q.value = 3;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(.16, t);
    g.gain.linearRampToValueAtTime(.30, t + .4);
    g.gain.exponentialRampToValueAtTime(.001, t + .6);
    o.connect(lp); lp.connect(g); g.connect(out);
    o.start(t); o.stop(t + .62);
    // суб-бас для «мощи»
    const sub = this.ctx.createOscillator(); sub.type = 'sine';
    sub.frequency.setValueAtTime(36, t);
    sub.frequency.exponentialRampToValueAtTime(64, t + .5);
    const sg = this.ctx.createGain();
    sg.gain.setValueAtTime(.20, t);
    sg.gain.exponentialRampToValueAtTime(.001, t + .6);
    sub.connect(sg); sg.connect(out);
    sub.start(t); sub.stop(t + .62);
  },
  /* the beam itself: a sustained laser whine that RISES over time.
     `heat` (0..1) is the fraction of the beam's burn time elapsed: as it climbs
     the tone sweeps upward, the ring-mod gets faster and the hiss gets sharper,
     so holding the trigger sounds like the cannon charging to overload. */
  cannonBeamStart(x, y, z) {
    if (!this.ctx || this.muted || this._beamSnd) return;
    const sp = this._spatial(x, y, z, 3, 170);
    const t = this.ctx.currentTime;
    const out = this.ctx.createGain(); out.gain.value = 0.0001;
    const pan = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    if (pan) { pan.pan.value = sp.pan; out.connect(pan); pan.connect(this.sfx); } else out.connect(this.sfx);
    // fade the whole bed in quickly so there is no click. The cannon is
    // deliberately quieter than a gunshot: it fires continuously, so a loud
    // sustained tone would be exhausting over a long burst.
    out.gain.linearRampToValueAtTime(Math.max(sp.gain, .3) * .5, t + .05);

    // --- main laser tone: НИЗКИЙ гул, слегка поднимается с нагревом ---
    const o = this.ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(140, t);
    const olp = this.ctx.createBiquadFilter(); olp.type = 'lowpass'; olp.frequency.value = 900; olp.Q.value = 6;
    const og = this.ctx.createGain(); og.gain.value = .16;
    o.connect(olp); olp.connect(og); og.connect(out);
    o.start(t);

    // --- суб-бас: добавляет «мощь» и убирает писк ---
    const osub = this.ctx.createOscillator(); osub.type = 'sine';
    osub.frequency.setValueAtTime(70, t);
    const osg = this.ctx.createGain(); osg.gain.value = .12;
    osub.connect(osg); osg.connect(out);
    osub.start(t);

    // --- чуть выше, расстроенный, для «энергетического» шлейфа ---
    const o2 = this.ctx.createOscillator(); o2.type = 'square';
    o2.frequency.setValueAtTime(141.5, t);
    const o2g = this.ctx.createGain(); o2g.gain.value = .035;
    o2.connect(o2g); o2g.connect(out);
    o2.start(t);

    // --- ring modulation: низкий LFO даёт мягкий «рокот», а не писк ---
    const trem = this.ctx.createGain(); trem.gain.value = 0;
    const lfo = this.ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 14;
    const lfoGain = this.ctx.createGain(); lfoGain.gain.value = .05;
    lfo.connect(lfoGain); lfoGain.connect(trem.gain);
    // route the detuned tone through the tremolo gain
    o2.disconnect(); o2.connect(trem); trem.connect(out);
    lfo.start(t);

    // --- глухой низкий «воздух» вместо резкого шипения ---
    const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const bp = this.ctx.createBiquadFilter(); bp.type = 'lowpass'; bp.frequency.value = 700; bp.Q.value = .8;
    const ng = this.ctx.createGain(); ng.gain.value = .05;
    src.connect(bp); bp.connect(ng); ng.connect(out);
    src.start(t);

    // --- ignition: глухой низкий «вумп» вместо визга ---
    const zap = this.ctx.createOscillator(); zap.type = 'triangle';
    zap.frequency.setValueAtTime(320, t);
    zap.frequency.exponentialRampToValueAtTime(90, t + .18);
    const zg = this.ctx.createGain();
    zg.gain.setValueAtTime(.16, t);
    zg.gain.exponentialRampToValueAtTime(.001, t + .2);
    zap.connect(zg); zg.connect(out);
    zap.start(t); zap.stop(t + .22);

    this._beamSnd = { o, osub, osg, o2, o2g, src, out, olp, bp, ng, lfo, lfoGain, trem, pan, heat: 0 };
  },
  /* Update the rising character of the beam. `heat` is 0..1. */
  cannonBeamHeat(heat) {
    const s = this._beamSnd;
    if (!s || !this.ctx) return;
    heat = U.clamp(heat, 0, 1);
    if (heat < s.heat - .05) { /* restarted */ }
    s.heat = heat;
    const t = this.ctx.currentTime, now = .08;
    // base гудит 140 → ~320 Hz с нагревом (остаётся басовым)
    const base = 140 + heat * 180;
    s.o.frequency.setTargetAtTime(base, t, now);
    if (s.osub) s.osub.frequency.setTargetAtTime(70 + heat * 60, t, now);
    s.o2.frequency.setTargetAtTime(base * 1.004, t, now);
    // фильтр приоткрывается, но остаётся глухим
    s.olp.frequency.setTargetAtTime(900 + heat * 1100, t, now);
    // мягкий рокот
    s.lfo.frequency.setTargetAtTime(14 + heat * 30, t, now);
    s.lfoGain.gain.setTargetAtTime(.05 + heat * .07, t, now);
    // «воздух» чуть поднимается, но не пищит
    s.bp.frequency.setTargetAtTime(700 + heat * 600, t, now);
    s.ng.gain.setTargetAtTime(.05 + heat * .05, t, now);
  },
  cannonBeamStop() {
    if (!this._beamSnd) return;
    const s = this._beamSnd; this._beamSnd = null;
    try {
      const t = this.ctx.currentTime;
      s.out.gain.cancelScheduledValues(t);
      s.out.gain.setValueAtTime(s.out.gain.value, t);
      s.out.gain.linearRampToValueAtTime(.0001, t + .08);
    } catch (e) { }
    const stop = (n) => { try { n.stop(); } catch (e) { } };
    const off = (n) => { try { n.disconnect(); } catch (e) { } };
    stop(s.o); if (s.osub) stop(s.osub); stop(s.o2); stop(s.lfo); stop(s.src);
    setTimeout(() => { off(s.out); off(s.o); if (s.osub) off(s.osub); if (s.osg) off(s.osg); off(s.o2); off(s.lfo); off(s.lfoGain); off(s.trem); off(s.src); off(s.olp); off(s.bp); off(s.ng); }, 160);
  },
  /* overheat: a descending vent hiss */
  cannonOverheat() {
    this.cannonBeamStop();
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
    const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(1600, t);
    bp.frequency.exponentialRampToValueAtTime(300, t + .5); bp.Q.value = .9;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(.22, t);
    g.gain.exponentialRampToValueAtTime(.001, t + .55);
    src.connect(bp); bp.connect(g); g.connect(this.sfx);
    src.start(t); src.stop(t + .58);
  },

  /* rising whine when the drone launches, then a low motor hum */
  droneLaunch() {
    this.tone(300, .18, 'sawtooth', .1, undefined, undefined, undefined, 900);
    setTimeout(() => this.tone(520, .3, 'sawtooth', .07, undefined, undefined, undefined, 640), 180);
  },
  /* the drone is deliberately LOUD: a droning motor that carries a long way, so
     the opponent can hear it coming and hunt it down. Called repeatedly while
     the drone is airborne. */
  droneLoop(x, y, z) {
    if (!this.ctx || this.muted) return;
    const sp = this._spatial(x, y, z, 4, CFG.droneNoise);
    if (sp.gain <= .006) return;
    const t = this.ctx.currentTime;
    const pan = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    const out = this.ctx.createGain(); out.gain.value = sp.gain * 1.15;
    if (pan) { pan.pan.value = sp.pan; out.connect(pan); pan.connect(this.sfx); } else out.connect(this.sfx);
    // two detuned saws → a rough propeller drone
    [86, 129].forEach((f, i) => {
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f, t);
      o.frequency.linearRampToValueAtTime(f * 1.06, t + .18);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(.001, t);
      g.gain.linearRampToValueAtTime(.10 / (i + 1), t + .03);
      g.gain.linearRampToValueAtTime(.001, t + .2);
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
      o.connect(lp); lp.connect(g); g.connect(out);
      o.start(t); o.stop(t + .22);
    });
    // a little airy noise on top
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf; src.playbackRate.value = .9;
    const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = .7;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(.001, t); ng.gain.linearRampToValueAtTime(.05, t + .04);
    ng.gain.linearRampToValueAtTime(.001, t + .2);
    src.connect(bp); bp.connect(ng); ng.connect(out);
    src.start(t); src.stop(t + .22);
  },
  growl(x, y, z, kind) {
    if (!this.ctx || this.muted) return;
    const sp = this._spatial(x, y, z, 4, 55);
    if (sp.gain <= .004) return;
    const t = this.ctx.currentTime;
    const pan = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    const out = this.ctx.createGain(); out.gain.value = sp.gain * .8;
    if (pan) { pan.pan.value = sp.pan; out.connect(pan); pan.connect(this.sfx); } else out.connect(this.sfx);
    const base = kind === 'brute' ? 52 : kind === 'runner' ? 170 : kind === 'tank' ? 44
      : kind === 'flying' ? 240 : kind === 'robot' ? 66 : kind === 'spitter' ? 130
      : kind === 'digger' ? 72 : kind === 'splitter' ? 150 : kind === 'healer' ? 300
      : kind === 'shielder' ? 60 : kind === 'summoner' ? 46
      : kind === 'stalker' ? 120 : kind === 'spider' ? 88 : kind === 'cryomancer' ? 210
      : kind === 'devourer' ? 38 : kind === 'titanMini' ? 34 : 96;
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(base * (.85 + Math.random() * .4), t);
    o.frequency.linearRampToValueAtTime(base * (.6 + Math.random() * .3), t + .4);
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 800; lp.Q.value = 3;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(.001, t);
    g.gain.linearRampToValueAtTime(.22, t + .06);
    g.gain.exponentialRampToValueAtTime(.001, t + .5);
    o.connect(lp); lp.connect(g); g.connect(out);
    o.start(t); o.stop(t + .55);
  },
  /* ЗВУКИ ЗОМБИ: рычание, стон, визг — короткие узнаваемые реплики, чтобы
     орда «звучала» и по звуку было понятно, кто подходит. */
  zombieVoice(x, y, z, kind) {
    if (!this.ctx || this.muted) return;
    const sp = this._spatial(x, y, z, 3, 42);
    if (sp.gain <= .004) return;
    const t = this.ctx.currentTime;
    // визгливый / низкий тембр в зависимости от типа и случайности
    const deep = kind === 'brute' || kind === 'tank' || kind === 'devourer' || kind === 'titanMini' || kind === 'bossBrute' || kind === 'bossTitan' || kind === 'bossFinal';
    const high = kind === 'runner' || kind === 'crawler' || kind === 'healer' || kind === 'spitter';
    const rnd = Math.random();
    const f0 = deep ? U.rand(50, 78) : high ? U.rand(180, 300) : U.rand(95, 150);
    const o = this.ctx.createOscillator();
    o.type = rnd < .5 ? 'sawtooth' : 'square';
    o.frequency.setValueAtTime(f0, t);
    // «ныряющее» рычание с дрожью
    o.frequency.linearRampToValueAtTime(f0 * U.rand(.5, .75), t + .5);
    const lfo = this.ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = U.rand(9, 20);
    const lfoG = this.ctx.createGain(); lfoG.gain.value = f0 * .12;
    lfo.connect(lfoG); lfoG.connect(o.frequency);
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = deep ? 620 : 1300; lp.Q.value = 4;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(.0001, t);
    g.gain.linearRampToValueAtTime(sp.gain * (deep ? .30 : .20), t + .05);
    g.gain.exponentialRampToValueAtTime(.001, t + .55);
    const pan = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    if (pan) { pan.pan.value = sp.pan; g.connect(pan); pan.connect(this.sfx); } else g.connect(this.sfx);
    o.connect(lp); lp.connect(g);
    o.start(t); o.stop(t + .6); lfo.start(t); lfo.stop(t + .6);
  },
  step(x, y, z) {
    if (!this.ctx || this.muted) return;
    const sp = this._spatial(x, y, z, 2, 26);
    if (sp.gain <= .004) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
    src.playbackRate.value = .55 + Math.random() * .3;
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900 + Math.random() * 500;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(.11 * sp.gain, t);
    g.gain.exponentialRampToValueAtTime(.001, t + .1);
    src.connect(lp); lp.connect(g); g.connect(this.sfx);
    src.start(t); src.stop(t + .12);
  },
  waveStart() { [0, 130, 260].forEach((d, i) => setTimeout(() => this.tone([440, 587, 880][i], .22, 'square', .13), d)); },
  roundEnd(win) {
    const notes = win ? [523, 659, 784, 1046] : [523, 440, 349, 262];
    notes.forEach((n, i) => setTimeout(() => this.tone(n, .3, 'triangle', .14), i * 150));
  },
  uiClick() { this.tone(1100, .025, 'square', .05); },

  /* ============================================================
     MUSIC — menu / in-game / boss themes
     Each theme is a chord progression the scheduler re-triggers (bass line +
     arpeggio + pad), so no audio files are needed. Tracks can loop and only
     one can play at a time. `musicOff` mutes everything (settings toggle).
     ============================================================ */
  musicOff: false,
  music: {
    menu:    { root: 98.0,  scale: [0, 4, 7, 11, 14], prog: [0, -3, 5, -5], bpm: 76,  wave: 'sawtooth', bright: 1100, loop: true,  gain: .34, pad: true, drums: false },
    game:    { root: 82.41, scale: [0, 3, 5, 7, 10],  prog: [0, -2, -4, -1], bpm: 112, wave: 'sawtooth', bright: 1400, loop: true,  gain: .40, pad: true, drums: true },
    boss:    { root: 73.42, scale: [0, 2, 3, 6, 10],  prog: [0, -1, -5, -3], bpm: 138, wave: 'square',   bright: 1600, loop: true,  gain: .5,  pad: false, drums: true, snare: true, metal: true, riff: [0, 0, 3, 0, 5, 3, 0, -1] },
    /* ---- БОССЫ: у каждого своя тема в духе DOOM / Undertale / Deltarune ---- */
    /* СТРАЖ — торжественный марш (дух «Spear of Justice» / Undertale) */
    bossWarden: { root: 110.0, scale: [0, 3, 5, 7, 10], prog: [0, -2, -4, -5], bpm: 96,  wave: 'sawtooth', bright: 1200, loop: true, gain: .5, pad: true, drums: true, snare: true,
                  riff: [0, -1, 0, -1, 3, -1, 5, -1], melody: [0, 3, 5, 7, 5, 3, 0, -2] },
    /* ЖНЕЦ — мрачный вальс-жнец (дух Deltarune) */
    bossBrute:  { root: 87.31, scale: [0, 2, 3, 7, 8],  prog: [0, -3, -1, -5], bpm: 132, wave: 'square',   bright: 1500, loop: true, gain: .5, pad: false, drums: true, snare: true, metal: true,
                  riff: [0, 0, 8, 7, 5, 3, 0, -1], melody: [12, 10, 8, 7, 5, 3, 2, 0] },
    /* ТИТАН — тяжёлый DOOM-рифф */
    bossTitan:  { root: 65.41, scale: [0, 2, 5, 7, 10], prog: [0, -5, -3, -7], bpm: 92,  wave: 'sawtooth', bright: 900,  loop: true, gain: .5, pad: true, drums: true, snare: true, metal: true,
                  riff: [0, 0, 0, 0, 3, 3, 5, 3], melody: [0, 0, 5, 3, 7, 5, 10, 8] },
    /* ПОЖИРАТЕЛЬ — тёмный орган-финал (дух «Asgore» / DOOM) */
    bossFinal:  { root: 55.0,   scale: [0, 1, 5, 6, 10], prog: [0, -1, -6, -4], bpm: 150, wave: 'square',   bright: 1800, loop: true, gain: .55, pad: true, drums: true, snare: true, metal: true,
                  riff: [0, 0, 1, 0, -1, 6, 5, -1], melody: [0, 1, 5, 6, 5, 1, 0, -1] },
    /* ФИНАЛЬНЫЙ БОСС «МОЗГ»: бешеная метал-тема с хором (дух DOOM Eternal) */
    brainBoss:  { root: 61.74,  scale: [0, 1, 3, 6, 8],  prog: [0, -2, -5, -1], bpm: 158, wave: 'sawtooth', bright: 1300, loop: true, gain: .55, pad: true, drums: true, snare: true, metal: true,
                  riff: [0, 0, 0, 6, 5, 5, 3, 1], melody: [0, 3, 6, 8, 6, 3, 1, 0] }
  },
  /* play a track by name (idempotent); no-op if music is disabled */
  musicStart(name) {
    if (!this.ctx || this.muted || this.musicOff) return;
    if (this._music && this._music.name === name) return;
    const th = this.music[name];
    if (!th) return;
    this.musicStop();
    const out = this.ctx.createGain(); out.gain.value = .0001;
    out.connect(this.musicBus);
    const t0 = this.ctx.currentTime;
    out.gain.linearRampToValueAtTime(th.gain || .45, t0 + (name === 'menu' ? 1.6 : .8));
    this._music = { name, out, th, step: 0, timer: null, next: t0 + .1 };
    const beat = 60 / th.bpm;
    const schedule = () => {
      if (!this._music || !this.ctx) return;
      const m = this._music;
      const now = this.ctx.currentTime;
      while (m.next < now + .4) { this._musicStep(m, m.next, beat); m.next += beat * .5; }
      m.timer = setTimeout(schedule, 120);
    };
    schedule();
  },
  musicStop() {
    if (!this._music) return;
    const m = this._music; this._music = null;
    if (m.timer) clearTimeout(m.timer);
    try {
      const t = this.ctx.currentTime;
      m.out.gain.cancelScheduledValues(t);
      m.out.gain.setValueAtTime(m.out.gain.value, t);
      m.out.gain.linearRampToValueAtTime(.0001, t + .5);
      setTimeout(() => { try { m.out.disconnect(); } catch (e) { } }, 700);
    } catch (e) { }
  },
  /* settings toggle: remembers the choice and picks the right track back up */
  setMusicEnabled(on) {
    this.musicOff = !on;
    if (!on) this.musicStop();
    else if (typeof Game !== 'undefined') Game.refreshMusic();
  },
  /* backwards-compatible alias used when a boss appears */
  bossMusicStart(type) { this._bossTheme = type; this.musicStart(type); },
  bossMusicStop() { this._bossTheme = null; if (typeof Game !== 'undefined') Game.refreshMusic(); else this.musicStop(); },
  _musicStep(m, t, beat) {
    const th = m.th, i = m.step++;
    const chord = th.prog[Math.floor(i / 8) % th.prog.length];
    const semi = (n) => th.root * Math.pow(2, n / 12);
    // bass on every beat.
    // NOTE: the bass used to run through `th.wave`, i.e. a sawtooth/square on
    // most tracks, which buzzed harshly in the ears. The timbre is now a warm
    // triangle; the note itself (the melody) is untouched.
    if (i % 2 === 0) {
      const o = this.ctx.createOscillator(); o.type = 'triangle';
      o.frequency.setValueAtTime(semi(chord), t);
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = .7;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(.20, t);
      g.gain.exponentialRampToValueAtTime(.001, t + beat * .9);
      o.connect(lp); lp.connect(g); g.connect(m.out);
      o.start(t); o.stop(t + beat);
    }
    /* ---- МЕТАЛ-РИФФ (дух DOOM): рычащий дисторшн-гитар на каждой доле ---- */
    if (th.riff) {
      const rn = th.riff[i % th.riff.length];
      const rg = this.ctx.createGain();
      rg.gain.setValueAtTime(.001, t);
      rg.gain.linearRampToValueAtTime(.16, t + .012);
      rg.gain.exponentialRampToValueAtTime(.001, t + beat * .48);
      /* дисторшн через WaveShaper */
      const ws = this.ctx.createWaveShaper();
      if (!this._distCurve) {
        const c = new Float32Array(256);
        for (let k = 0; k < 256; k++) { const x = k / 128 - 1; c[k] = Math.tanh(x * 4.5); }
        this._distCurve = c;
      }
      ws.curve = this._distCurve; ws.oversample = '2x';
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600; lp.Q.value = 1.1;
      const o1 = this.ctx.createOscillator(); o1.type = 'sawtooth';
      o1.frequency.setValueAtTime(semi(chord + rn), t);
      const o2 = this.ctx.createOscillator(); o2.type = 'sawtooth';
      o2.frequency.setValueAtTime(semi(chord + rn + .12), t);       // лёгкий расстрой
      o1.connect(ws); o2.connect(ws); ws.connect(lp); lp.connect(rg); rg.connect(m.out);
      o1.start(t); o1.stop(t + beat * .5); o2.start(t); o2.stop(t + beat * .5);
    }
    // a soft kick + hat for the driving tracks
    if (th.drums) {
      if (i % 2 === 0) {
        const k = this.ctx.createOscillator(); k.type = 'sine';
        k.frequency.setValueAtTime(120, t); k.frequency.exponentialRampToValueAtTime(45, t + .12);
        const kg = this.ctx.createGain();
        kg.gain.setValueAtTime(.22, t); kg.gain.exponentialRampToValueAtTime(.001, t + .16);
        k.connect(kg); kg.connect(m.out); k.start(t); k.stop(t + .18);
      }
      if (i % 2 === 1) {
        const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
        const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6000;
        const hg = this.ctx.createGain();
        hg.gain.setValueAtTime(.05 * (th.metal ? 1.6 : 1), t); hg.gain.exponentialRampToValueAtTime(.001, t + (th.metal ? .1 : .06));
        src.connect(hp); hp.connect(hg); hg.connect(m.out); src.start(t); src.stop(t + .12);
      }
      /* ---- SNARE (для боссовых тем): на 2 и 4 ---- */
      if (th.snare && i % 4 === 2) {
        const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf;
        const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = .8;
        const sg = this.ctx.createGain();
        sg.gain.setValueAtTime(.14, t); sg.gain.exponentialRampToValueAtTime(.001, t + .18);
        s.connect(bp); bp.connect(sg); sg.connect(m.out); s.start(t); s.stop(t + .2);
      }
    }
    // arpeggio note (higher)
    const deg = th.scale[(i * 3) % th.scale.length];
    const a = this.ctx.createOscillator(); a.type = 'triangle';
    a.frequency.setValueAtTime(semi(chord + deg + 24), t);
    const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = th.bright; bp.Q.value = 1.2;
    const ag = this.ctx.createGain();
    ag.gain.setValueAtTime(.10, t);
    ag.gain.exponentialRampToValueAtTime(.001, t + beat * .45);
    a.connect(bp); bp.connect(ag); ag.connect(m.out);
    a.start(t); a.stop(t + beat * .5);
    /* ---- МЕЛОДИЯ: ведущая линия поверх риффа (у боссов) ---- */
    if (th.melody) {
      const mn = th.melody[i % th.melody.length];
      const mo = this.ctx.createOscillator(); mo.type = 'square';
      mo.frequency.setValueAtTime(semi(chord + mn + 12), t);
      const mg = this.ctx.createGain();
      mg.gain.setValueAtTime(.001, t); mg.gain.linearRampToValueAtTime(.075, t + .01);
      mg.gain.exponentialRampToValueAtTime(.001, t + beat * .46);
      mo.connect(mg); mg.connect(m.out); mo.start(t); mo.stop(t + beat * .5);
    }
    // a sustained pad at the top of each bar (warm triangle — same notes)
    if (i % 8 === 0) {
      const p = this.ctx.createOscillator(); p.type = 'triangle';
      p.frequency.setValueAtTime(semi(chord + 12), t);
      p.frequency.linearRampToValueAtTime(semi(chord + 12 + th.scale[2]), t + beat * 3);
      const pg = this.ctx.createGain();
      pg.gain.setValueAtTime(.001, t);
      pg.gain.linearRampToValueAtTime(.05, t + beat);
      pg.gain.exponentialRampToValueAtTime(.001, t + beat * 3.6);
      // a gentle low-pass keeps the sustained pad round instead of buzzy
      const plp = this.ctx.createBiquadFilter(); plp.type = 'lowpass'; plp.frequency.value = 900; plp.Q.value = .6;
      p.connect(plp); plp.connect(pg); pg.connect(m.out);
      p.start(t); p.stop(t + beat * 4);
    }
  },

  ambientStart() {
    if (!this.ctx || this.amb) return;
    // low wind bed
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf; src.loop = true;
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320; lp.Q.value = .7;
    const g = this.ctx.createGain(); g.gain.value = .045;
    src.connect(lp); lp.connect(g); g.connect(this.sfx);
    src.start();
    this.amb = { src, g };
  },
  ambientStop() { if (this.amb) { try { this.amb.src.stop(); } catch (e) { } this.amb = null; } }
};
