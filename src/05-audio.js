/* ============================================================
   05 — AUDIO (WebAudio, fully synthesised — no asset files)
   ============================================================ */
const Audio3D_SFX = {
  ctx: null, master: null, muted: false, vol: .6, listener: { x: 0, y: 0, z: 0, fx: 0, fz: -1 },

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.vol;
    this.master.connect(this.ctx.destination);
    this.noiseBuf = this._makeNoise(1.0);
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  setVol(v) { this.vol = v; if (this.master) this.master.gain.value = v; },
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
    if (pan) { pan.pan.value = sp.pan; out.connect(pan); pan.connect(this.master); }
    else out.connect(this.master);

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
    if (pan) { pan.pan.value = sp.pan; out.connect(pan); pan.connect(this.master); } else out.connect(this.master);
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
    if (pan) { pan.pan.value = sp.pan; out.connect(pan); pan.connect(this.master); } else out.connect(this.master);
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
    if (pan) { pan.pan.value = sp.pan; out.connect(pan); pan.connect(this.master); } else out.connect(this.master);
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
    if (pan) { pan.pan.value = sp.pan; out.connect(pan); pan.connect(this.master); } else out.connect(this.master);

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
    if (pan) { pan.pan.value = sp.pan; out.connect(pan); pan.connect(this.master); } else out.connect(this.master);
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
    if (pan) { pan.pan.value = sp.pan; out.connect(pan); pan.connect(this.master); } else out.connect(this.master);
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
  /* rising whine when the drone launches, then a low motor hum */
  droneLaunch() {
    this.tone(300, .18, 'sawtooth', .1, undefined, undefined, undefined, 900);
    setTimeout(() => this.tone(520, .3, 'sawtooth', .07, undefined, undefined, undefined, 640), 180);
  },
  growl(x, y, z, kind) {
    if (!this.ctx || this.muted) return;
    const sp = this._spatial(x, y, z, 4, 55);
    if (sp.gain <= .004) return;
    const t = this.ctx.currentTime;
    const pan = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    const out = this.ctx.createGain(); out.gain.value = sp.gain * .8;
    if (pan) { pan.pan.value = sp.pan; out.connect(pan); pan.connect(this.master); } else out.connect(this.master);
    const base = kind === 'brute' ? 52 : kind === 'runner' ? 170 : kind === 'tank' ? 44 : 96;
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
    src.connect(lp); lp.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + .12);
  },
  waveStart() { [0, 130, 260].forEach((d, i) => setTimeout(() => this.tone([440, 587, 880][i], .22, 'square', .13), d)); },
  roundEnd(win) {
    const notes = win ? [523, 659, 784, 1046] : [523, 440, 349, 262];
    notes.forEach((n, i) => setTimeout(() => this.tone(n, .3, 'triangle', .14), i * 150));
  },
  uiClick() { this.tone(1100, .025, 'square', .05); },
  ambientStart() {
    if (!this.ctx || this.amb) return;
    // low wind bed
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf; src.loop = true;
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320; lp.Q.value = .7;
    const g = this.ctx.createGain(); g.gain.value = .045;
    src.connect(lp); lp.connect(g); g.connect(this.master);
    src.start();
    this.amb = { src, g };
  },
  ambientStop() { if (this.amb) { try { this.amb.src.stop(); } catch (e) { } this.amb = null; } }
};
