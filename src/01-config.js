/* ============================================================
   01 — CONFIG, WEAPONS, UTILS
   ============================================================ */
'use strict';

const CS = window.CS = {
  version: '1.0',
  MODE: { MENU: 'menu', OFFLINE: 'offline', ONLINE: 'online', RANGE: 'range' },
  NETROLE: { NONE: 0, HOST: 1, CLIENT: 2 }
};

/* ---------------- tunables ---------------- */
const CFG = {
  gravity: 24,
  jumpSpeed: 7.6,
  walkSpeed: 4.6,
  runSpeed: 7.0,
  crouchSpeed: 2.3,
  accel: 58,
  airAccel: 7,
  friction: 11,
  playerHeight: 1.75,
  crouchHeight: 1.05,
  playerRadius: 0.42,
  eyeHeight: 1.62,
  eyeHeightCrouch: 0.92,
  maxHP: 100,
  maxAP: 100,
  stepUp: 0.62,
  snapDown: 0.14,       // minimum distance the ground snap may pull the player down
  climbDuration: 0.50,   // base vault animation time (a normal low ledge)
  climbDurationPerM: 0.13, // extra animation time per metre of height
  climbDurationMax: 2.6, // cap so a huge climb still finishes in a sensible time
  buyTime: 30,          // seconds of the buy phase (CS-style freeze/buy time)
  roundTime: 300,
  zombieStartCount: 4,
  zombieMaxAlive: 26,
  zombieSpawnInterval: 1.15,
  headshotMultiplier: 3.1,
  limbMultiplier: 0.72,
  wallbangLoss: 0.55,
  netTickHz: 22,        // snapshot rate
  netSendLocalHz: 34,   // local player state rate
  netInterpMs: 120,     // render the remote player this far behind the newest snapshot
  netMaxExtrapMs: 160,  // keep extrapolating through a packet gap for at most this long

  /* ---- extras: ammo/medkit crate & kamikaze drone ---- */
  medkitHeal: 50,       // HP restored per medkit, used instantly in battle
  medkitMax: 5,         // how many medkits can be carried at once
  droneSpeed: 15,       // m/s cruise for the guided drone
  droneBoost: 1.7,      // speed multiplier while boosting (Shift)
  droneLife: 26,        // seconds before the drone runs out of fuel
  droneBlast: 4.6,      // blast radius (m)
  droneDmg: 175,        // blast damage at the centre
  droneHp: 40,          // damage the drone absorbs before it is shot down (1 hit)
  droneHitRadius: 0.55, // hitbox half-size while airborne (big on purpose)
  droneTurn: 2.1,       // camera-relative steer rate (rad/s per unit of input)
  droneNoise: 70,       // how far the drone's motor carries (m) — loud on purpose
  rocketSoundRange: 220, // how far a rocket explosion is heard from

  /* ---- ОРДА ×10: ten times as many zombies, but far weaker ---- */
  hordeCountMul: 10,    // wave size multiplier
  hordeHpMul: 0.18,     // zombie health multiplier (weak, so the mass stays fair)
  hordeMaxAlive: 110,   // the usual alive cap would smother a 10× wave
  hordeSpawnInterval: 0.20,  // spawn far faster so the field actually fills

  /* ---- BOSS WAVES ---- */
  bossWaves: [15, 30, 50, 100],  // waves that summon a boss
  bossHpMul: 1            // global boss health multiplier (tuned per boss type)
};

/* ---------------- match settings (chosen in the lobby / settings) ----------------
   These are shared by every mode: the map is picked in the online lobby and in
   the settings panel, and carries over to offline / полигон. */
const MATCH = window.MATCH = {
  maps: [],                 // filled from MAPS once 04-map.js has loaded
  playerCounts: [1, 2, 3, 4],
  hpOptions: [50, 75, 100, 125, 150, 200],
  maxPlayers: 4,
  minPlayers: 2,

  mapName(id) {
    const m = (typeof mapById === 'function') ? mapById(id) : null;
    return m ? m.name : 'АРЕНА';
  },
  clampPlayers(n, online) {
    n = Math.round(n || 2);
    const lo = online ? 2 : 1;
    return U.clamp(n, lo, MATCH.maxPlayers);
  }
};

/* ---------------- weapons (CS-inspired) ----------------
   dmg      : base damage per bullet at close range
   rpm      : rounds per minute (fire rate)
   mag      : magazine size
   reserve  : spare ammo
   auto     : hold-to-fire
   pellets  : bullets per shot (shotguns)
   spread   : base inaccuracy (radians-ish scale)
   moveSpread: extra spread while moving
   recoil   : vertical kick per shot
   falloff  : damage multiplier at max range
   slots    : which slot it occupies (2 = primary, 1 = secondary, 3 = knife)
--------------------------------------------------------- */
const WEAPONS = {
  knife: { name: 'НОЖ', cat: 'melee', slot: 3, price: 0, dmg: 55, rpm: 120, mag: Infinity, reserve: 0,
           auto: false, spread: 0, moveSpread: 0, recoil: 2, falloff: 1, range: 2.4, headMul: 2.0, sound: 'knife' },

  glock: { name: 'GLOCK-18', cat: 'pistol', slot: 1, price: 200, dmg: 28, rpm: 420, mag: 20, reserve: 100,
           auto: false, spread: .020, moveSpread: .030, recoil: .85, falloff: .62, range: 60, headMul: 2.0, sound: 'pistol' },
  usp:   { name: 'USP-S', cat: 'pistol', slot: 1, price: 200, dmg: 35, rpm: 352, mag: 12, reserve: 48,
           auto: false, spread: .014, moveSpread: .026, recoil: 1.05, falloff: .60, range: 65, headMul: 2.2, sound: 'pistol' },
  p250:  { name: 'P250', cat: 'pistol', slot: 1, price: 300, dmg: 38, rpm: 400, mag: 13, reserve: 52,
           auto: false, spread: .018, moveSpread: .028, recoil: 1.0, falloff: .58, range: 62, headMul: 2.1, sound: 'pistol' },
  deagle:{ name: 'DESERT EAGLE', cat: 'pistol', slot: 1, price: 700, dmg: 63, rpm: 267, mag: 7, reserve: 35,
           auto: false, spread: .012, moveSpread: .055, recoil: 3.1, falloff: .74, range: 80, headMul: 2.6, sound: 'deagle' },
  revolver:{ name: 'R8 REVOLVER', cat: 'pistol', slot: 1, price: 600, dmg: 86, rpm: 100, mag: 8, reserve: 24,
           auto: false, spread: .006, moveSpread: .060, recoil: 4.2, falloff: .80, range: 90, headMul: 2.4, sound: 'deagle' },

  mp5:   { name: 'MP5-SD', cat: 'smg', slot: 2, price: 1500, dmg: 27, rpm: 750, mag: 30, reserve: 120,
           auto: true, spread: .026, moveSpread: .018, recoil: .60, falloff: .60, range: 55, headMul: 1.9, sound: 'smg' },
  p90:   { name: 'P90', cat: 'smg', slot: 2, price: 2350, dmg: 26, rpm: 857, mag: 50, reserve: 100,
           auto: true, spread: .030, moveSpread: .020, recoil: .55, falloff: .62, range: 58, headMul: 1.8, sound: 'smg' },
  ump:   { name: 'UMP-45', cat: 'smg', slot: 2, price: 1200, dmg: 35, rpm: 571, mag: 25, reserve: 100,
           auto: true, spread: .024, moveSpread: .020, recoil: .80, falloff: .64, range: 60, headMul: 2.0, sound: 'smg' },

  nova:  { name: 'NOVA', cat: 'shotgun', slot: 2, price: 1050, dmg: 26, rpm: 68, mag: 8, reserve: 32, pellets: 9,
           auto: false, spread: .075, moveSpread: .026, recoil: 3.4, falloff: .30, range: 26, headMul: 1.7, sound: 'shotgun' },
  xm:    { name: 'XM1014', cat: 'shotgun', slot: 2, price: 2000, dmg: 21, rpm: 171, mag: 8, reserve: 32, pellets: 7,
           auto: true, spread: .080, moveSpread: .028, recoil: 2.6, falloff: .30, range: 24, headMul: 1.6, sound: 'shotgun' },

  galil: { name: 'GALIL AR', cat: 'rifle', slot: 2, price: 1800, dmg: 30, rpm: 666, mag: 35, reserve: 90,
           auto: true, spread: .019, moveSpread: .042, recoil: 1.35, falloff: .70, range: 90, headMul: 2.4, sound: 'rifle' },
  famas: { name: 'FAMAS', cat: 'rifle', slot: 2, price: 2250, dmg: 30, rpm: 666, mag: 25, reserve: 90,
           auto: true, spread: .017, moveSpread: .040, recoil: 1.30, falloff: .70, range: 90, headMul: 2.4, sound: 'rifle' },
  ak47:  { name: 'AK-47', cat: 'rifle', slot: 2, price: 2700, dmg: 36, rpm: 600, mag: 30, reserve: 90,
           auto: true, spread: .016, moveSpread: .050, recoil: 2.15, falloff: .78, range: 110, headMul: 2.6, sound: 'rifle' },
  m4a4:  { name: 'M4A4', cat: 'rifle', slot: 2, price: 3100, dmg: 33, rpm: 666, mag: 30, reserve: 90,
           auto: true, spread: .014, moveSpread: .045, recoil: 1.65, falloff: .76, range: 110, headMul: 2.6, sound: 'rifle' },
  sg553: { name: 'SG 553', cat: 'rifle', slot: 2, price: 3000, dmg: 39, rpm: 545, mag: 30, reserve: 90,
           auto: true, spread: .015, moveSpread: .048, recoil: 2.25, falloff: .80, range: 115, headMul: 2.7, sound: 'rifle' },
  awp:   { name: 'AWP', cat: 'sniper', slot: 2, price: 4750, dmg: 118, rpm: 41, mag: 10, reserve: 30,
           auto: false, spread: .0035, moveSpread: .110, recoil: 6.5, falloff: .99, range: 200, headMul: 1.5,
           zoom: 2.6, sound: 'awp' },
  scout: { name: 'SSG 08', cat: 'sniper', slot: 2, price: 1700, dmg: 88, rpm: 48, mag: 10, reserve: 90,
           auto: false, spread: .0045, moveSpread: .100, recoil: 5.0, falloff: .95, range: 180, headMul: 2.0,
           zoom: 2.2, sound: 'awp' },
  negev: { name: 'NEGEV', cat: 'lmg', slot: 2, price: 1700, dmg: 35, rpm: 800, mag: 150, reserve: 0,
           auto: true, spread: .055, moveSpread: .030, recoil: 1.2, falloff: .72, range: 90, headMul: 2.2, sound: 'rifle' },

  /* ---------------- heavy: spin-up minigun ---------------- */
  minigun: { name: 'МИНИГАН', cat: 'heavy', slot: 2, price: 10000, dmg: 30, rpm: 1150, mag: 200, reserve: 200,
             auto: true, spread: .048, moveSpread: .034, recoil: .80, falloff: .62, range: 95, headMul: 1.9,
             sound: 'rifle', spinUp: .5 },

  /* ---------------- heavy: rocket launcher with splash damage ---------------- */
  rpg: { name: 'РПГ-7', cat: 'heavy', slot: 2, price: 10000, dmg: 130, rpm: 38, mag: 1, reserve: 6,
         auto: false, spread: .006, moveSpread: .070, recoil: 6.2, falloff: .99, range: 220, headMul: 1.2,
         sound: 'awp', projectile: 'rocket', projSpeed: 48, projGravity: 3,
         splash: 6.0, splashDmg: 120 },

  /* ---------------- the legendary banana launcher ---------------- */
  /* Rapid-fire version: the banana is now a full-auto blaster. Damage per fruit
     is unchanged (55) — only the delivery is much faster. Recoil per shot was
     lowered to match the higher rate, otherwise the view would climb to the sky. */
  banana: { name: 'БАНАН', cat: 'banana', slot: 2, price: 10000, dmg: 55, rpm: 900, mag: 45, reserve: 180,
            auto: true, spread: .018, moveSpread: .026, recoil: .85, falloff: .85, range: 120, headMul: 1.6,
            sound: 'banana', projectile: 'banana', projSpeed: 52, projGravity: 13 }
};

const GEAR = {
  kevlar:       { name: 'БРОНЯ (KEVLAR)', price: 650,  ap: 100, helmet: false },
  kevlarHelmet: { name: 'БРОНЯ + ШЛЕМ',   price: 1000, ap: 100, helmet: true },
  /* Consumables: bought once, kept for the rest of the match (and across
     rounds/offline waves). `ammo` is a refill, so it never shows as КУПЛЕНО. */
  ammo:         { name: 'ПАТРОНЫ',        price: 1500, ammo: true, desc: 'Полный запас ко всем стволам' },
  medkit:       { name: 'АПТЕЧКА',        price: 600,  medkit: true, desc: 'H или кнопка — +50 HP в бою' },
  drone:        { name: 'ДРОН-КАМИКАДЗЕ', price: 10000, drone: true, desc: 'Управляемый · враг может сбить' }
};

const BUY_CATS = [
  { id: 'pistol',  label: 'ПИСТОЛЕТЫ' },
  { id: 'smg',     label: 'ПП' },
  { id: 'rifle',   label: 'ВИНТОВКИ' },
  { id: 'sniper',  label: 'СНАЙПЕРКИ' },
  { id: 'shotgun', label: 'ДРОБОВИКИ' },
  { id: 'lmg',     label: 'ПУЛЕМЁТЫ' },
  { id: 'heavy',   label: 'ТЯЖЁЛОЕ' },
  { id: 'banana',  label: 'БАНАНЫ' },
  { id: 'gear',    label: 'СНАРЯЖЕНИЕ' }
];

/* ---------------- zombie types ---------------- */
const ZOMBIES = {
  walker: { name: 'Ходок',        hp: 100,  speed: 1.65, dmg: 13, score: 100, money: 55, scale: 1.00, color: 0x6b7f52, atkRange: 1.5 },
  runner: { name: 'Бегун',        hp: 70,   speed: 4.30, dmg: 11, score: 150, money: 65, scale: 0.94, color: 0x8a6b3c, atkRange: 1.5 },
  tank:   { name: 'Толстяк',      hp: 340,  speed: 1.15, dmg: 27, score: 260, money: 110, scale: 1.38, color: 0x4d6b3f, atkRange: 1.9 },
  crawler:{ name: 'Ползун',       hp: 55,   speed: 3.10, dmg: 9,  score: 130, money: 60, scale: 0.80, color: 0x7a5a52, atkRange: 1.4 },
  brute:  { name: 'Громила',      hp: 620,  speed: 1.55, dmg: 36, score: 480, money: 190, scale: 1.62, color: 0x3f5236, atkRange: 2.1 },
  spitter:{ name: 'Плевун',       hp: 90,   speed: 2.10, dmg: 18, score: 220, money: 90, scale: 1.0,  color: 0x6f7d2e, atkRange: 1.6 },

  /* ---- BOSSES (spawned on dedicated boss waves) ---- */
  bossWarden: { name: 'СТРАЖ',        hp: 3200,  speed: 1.35, dmg: 42, score: 4000,  money: 3000, scale: 2.35, color: 0x7d3b2e, atkRange: 2.6, boss: true },
  bossBrute:  { name: 'ЖНЕЦ',         hp: 6800,  speed: 1.55, dmg: 55, score: 8000,  money: 5000, scale: 2.75, color: 0x5a2b6b, atkRange: 2.9, boss: true },
  bossTitan:  { name: 'ТИТАН',        hp: 14000, speed: 1.15, dmg: 70, score: 16000, money: 8000, scale: 3.25, color: 0x6b2b2b, atkRange: 3.2, boss: true },
  bossFinal:  { name: 'ПОЖИРАТЕЛЬ',   hp: 42000, speed: 1.05, dmg: 95, score: 50000, money: 16000, scale: 4.10, color: 0x2e1b4d, atkRange: 3.6, boss: true, final: true }
};

/* ---------------- utils ---------------- */
const U = {
  clamp: (v, a, b) => v < a ? a : v > b ? b : v,
  lerp: (a, b, t) => a + (b - a) * t,
  rand: (a, b) => a + Math.random() * (b - a),
  randInt: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  pick: arr => arr[Math.floor(Math.random() * arr.length)],
  dist2: (a, b) => { const dx = a.x - b.x, dz = a.z - b.z; return Math.sqrt(dx * dx + dz * dz); },
  dist3: (a, b) => { const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z; return Math.sqrt(dx * dx + dy * dy + dz * dz); },
  angleLerp: (a, b, t) => { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * t; },
  now: () => performance.now(),
  money: n => '$' + Math.round(n).toLocaleString('ru-RU'),
  time: s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); },
  esc: s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
};

/* seeded RNG for deterministic-ish map detail */
function makeRng(seed) {
  let s = seed >>> 0;
  return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/* ---------------- persistent settings & progress ---------------- */
const Store = {
  key: 'cs3d.save.v1',
  data: { sens: 2.2, fov: 80, vol: 60, quality: 1, touchSens: 1.5, name: '', best: 0, bestWave: 0, killsTotal: 0, matches: 0, wins: 0, signalSrv: 0, aimBest: 0, aimAutoFire: 1,
          map: 'arena', players: 2, maxHP: 100, aimAssist: 1, horde: 0, clears: 0, freeplay: 0 },
  load() {
    try { const r = localStorage.getItem(this.key); if (r) Object.assign(this.data, JSON.parse(r)); } catch (e) { }
    return this.data;
  },
  save() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { } }
};
Store.load();

/* ---------------- small event helper ---------------- */
const Bus = {
  map: {},
  on(k, fn) { (this.map[k] = this.map[k] || []).push(fn); return fn; },
  off(k, fn) { const a = this.map[k]; if (a) { const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); } },
  emit(k, ...a) { const l = this.map[k]; if (l) for (let i = 0; i < l.length; i++) { try { l[i](...a); } catch (e) { console.warn('bus', k, e); } } }
};
