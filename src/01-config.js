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
  medkitMax: 5,         // how many medkits can be carried at once (normal kit)
  medkitHealFrac: 0.5,  // a field medkit restores this share of max health
  medkitFieldInterval: 20,  // seconds between field medkit drops (offline)
  medkitFieldMax: 2,        // at most this many field medkits on the map
  medkitFieldLife: 90,      // a field medkit vanishes after this long
  moneyCap: 100000,     // most money a player can hold (prices go up to 80000)
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

  /* ---- offline map rotation: a fresh arena every N waves ---- */
  mapRotateEvery: 10,

  /* ---- ammo crate (offline): a supply chest that tops up reserves ---- */
  crateInterval: 10,    // seconds between spawns
  crateAmmoFrac: 0.25,  // fraction of the FULL stock restored per crate
  cratePickupDist: 2.2, // how close the player must get to collect it
  crateLife: 60,        // a crate vanishes if it is not collected in time
  crateMax: 5,          // at most this many crates on the map at once

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
  roundOptions: [1, 3, 5, 7],
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
  },
  clampRounds(n) {
    n = Math.round(n || 1);
    if (MATCH.roundOptions.indexOf(n) < 0) n = 3;
    return n;
  },
  /* custom offline mode: how many zombies and how tough they are */
  countOptions: [1, 2, 5, 10, 20],
  hpOptionsOff: [0.25, 0.5, 1, 2, 5],

  /* which shop categories a room allows (host picks it in the lobby; only
     enforced in ONLINE matches). Built from BUY_CATS at call time. */
  defaultShopAllow() {
    const o = {};
    (typeof BUY_CATS !== 'undefined' ? BUY_CATS : []).forEach(c => { o[c.id] = 1; });
    return o;
  },
  /* every individual buyable in the shop, grouped by category. Weapons with a
     price plus all gear. Used for the per-item allow-list. */
  shopItems() {
    const out = {};
    if (typeof BUY_CATS === 'undefined') return out;
    BUY_CATS.forEach(c => { out[c.id] = []; });
    if (typeof WEAPONS !== 'undefined') {
      for (const id in WEAPONS) {
        const w = WEAPONS[id];
        if (w.price > 0 && out[w.cat]) out[w.cat].push({ id: id, name: w.name });
      }
    }
    if (typeof GEAR !== 'undefined' && out.gear) {
      for (const id in GEAR) out.gear.push({ id: id, name: GEAR[id].name });
    }
    return out;
  },
  /* per-item allow map; missing = allowed */
  defaultItemAllow() { return {}; }
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

  /* ---------------- futuristic: laser rifle (pierces everything) ---------------- */
  laser: { name: 'ЛАЗЕРНАЯ ВИНТОВКА', cat: 'heavy', slot: 2, price: 16500, dmg: 150, rpm: 240, mag: 30, reserve: 120,
           auto: true, spread: .004, moveSpread: .030, recoil: 1.4, falloff: .98, range: 220, headMul: 1.8,
           sound: 'laser', pierce: true },

  /* ---------------- heavy: continuous laser cannon ----------------
     Hold fire: the barrel cluster spins up, then a piercing beam erupts and
     burns everything along the line. It can only burn for `beamMax` seconds
     before it overheats and vents for `beamVent` seconds. */
  laserCannon: { name: 'ЛАЗЕРНАЯ ПУШКА', cat: 'heavy', slot: 2, price: 18000, dmg: 320, rpm: 60, mag: Infinity, reserve: 0,
           auto: true, spread: .005, moveSpread: .020, recoil: 0, falloff: .98, range: 220, headMul: 1.6,
           sound: 'laser', pierce: true, spinUp: .45,
           beam: true, beamMax: 10, beamVent: 3.5, beamDps: 320, beamColor: 0xff6a2a },

  /* ---------------- heavy: atomic "freedom" RPG ---------------- */
  atomicRpg: { name: 'АТОМНОЕ РПГ СВОБОДЫ', cat: 'heavy', slot: 2, price: 20000, dmg: 1300, rpm: 34, mag: 1, reserve: 20,
         auto: false, spread: .006, moveSpread: .070, recoil: 7.3, falloff: .99, range: 260, headMul: 1.2,
         sound: 'awp', projectile: 'rocket', projSpeed: 52, projGravity: 3,
         splash: 14.0, splashDmg: 1200, explosionColor: [0x39ff5a, 0x0a1a0a], noSelfDamage: true, nuke: true },

  /* ---------------- Y.H.S: absurdly strong, absurdly fast MG ---------------- */
  yhs: { name: 'Y.H.S', cat: 'heavy', slot: 2, price: 80000, dmg: 180, rpm: 5750, mag: 2000, reserve: 0,
         auto: true, spread: .030, moveSpread: .020, recoil: .35, falloff: .85, range: 140, headMul: 2.3,
         sound: 'rifle', spinUp: .35 },

  /* ---------------- guided missile launcher (player steers the rocket) ---------------- */
  rocketgun: { name: 'РАКЕТНИЦА', cat: 'heavy', slot: 2, price: 14000, dmg: 220, rpm: 30, mag: 1, reserve: 8,
         auto: false, spread: .004, moveSpread: .060, recoil: 6.0, falloff: .99, range: 240, headMul: 1.2,
         sound: 'awp', projectile: 'guided', projSpeed: 40, projGravity: 0,
         splash: 7.0, splashDmg: 200, explosionColor: [0xff7a3a, 0x1a0d05] },

  /* ---------------- energy shield: blocks incoming projectiles, reflects them ---------------- */
  shield: { name: 'ЭНЕРГОЩИТ', cat: 'heavy', slot: 2, price: 8000, dmg: 0, rpm: 60, mag: Infinity, reserve: 0,
         auto: true, spread: 0, moveSpread: 0, recoil: 0, falloff: 1, range: 0, headMul: 1, sound: 'laser',
         shield: true, activeTime: 5, cooldown: 4 },

  /* ---------------- the legendary banana launcher ---------------- */
  /* Rapid-fire version: the banana is now a full-auto blaster. Damage per fruit
     is unchanged (55) — only the delivery is much faster. Recoil per shot was
     lowered to match the higher rate, otherwise the view would climb to the sky. */
  banana: { name: 'БАНАН', cat: 'banana', slot: 2, price: 10000, dmg: 55, rpm: 900, mag: 45, reserve: 180,
            auto: true, spread: .018, moveSpread: .026, recoil: .85, falloff: .85, range: 120, headMul: 1.6,
            sound: 'banana', projectile: 'banana', projSpeed: 52, projGravity: 13 },

  /* ============================================================
     ЭКСПЕРИМЕНТАЛЬНОЕ — unusual weapons (25 000 – 65 000)
     They all sit in the `exp` shop category and use either a `special` handler
     (fired straight from Game.fireSpecial) or a dedicated `projectile` kind.
     ============================================================ */
  /* ХИМИЯ: acid sprayer — leaves a pool that keeps burning the horde */
  acid: { name: 'КИСЛОТОМЁТ', cat: 'exp', slot: 2, price: 25000, dmg: 34, rpm: 300, mag: 24, reserve: 96,
          auto: true, spread: .040, moveSpread: .030, recoil: 1.1, falloff: .70, range: 60, headMul: 1.4,
          sound: 'shotgun', projectile: 'acid', projSpeed: 23, projGravity: 18,
          acidR: 2.7, acidDps: 55, acidLife: 6.5 },

  /* КОНТРОЛЬ: hive — launches a hive that hatches homing kamikaze drones */
  hive: { name: 'РОЙ', cat: 'exp', slot: 2, price: 30000, dmg: 40, rpm: 34, mag: 2, reserve: 8,
          auto: false, spread: .020, moveSpread: .050, recoil: 3.0, falloff: .90, range: 140, headMul: 1.2,
          sound: 'banana', projectile: 'hive', projSpeed: 24, projGravity: 11,
          hiveCount: 5, splash: .6, splashDmg: 40 },

  /* ЦЕПЬ: tesla — lightning arcs from one enemy to the next */
  tesla: { name: 'ТЕСЛА-ПУШКА', cat: 'exp', slot: 2, price: 45000, dmg: 95, rpm: 130, mag: 40, reserve: 160,
          auto: true, spread: .014, moveSpread: .030, recoil: 1.0, falloff: .85, range: 78, headMul: 1.7,
          sound: 'laser', special: 'tesla', chain: 5, chainRange: 9.5 },

  /* ГРАВИТАЦИЯ: black hole — a sphere that drags the horde in, then implodes */
  blackhole: { name: 'ЧЁРНАЯ ДЫРА', cat: 'exp', slot: 2, price: 65000, dmg: 60, rpm: 30, mag: 1, reserve: 5,
          auto: false, spread: .004, moveSpread: .050, recoil: 5.0, falloff: .99, range: 240, headMul: 1.2,
          sound: 'awp', projectile: 'blackhole', projSpeed: 32, projGravity: 3,
          wellR: 9.5, wellLife: 4.2, wellDps: 45, wellPull: 11,
          splash: 8.5, splashDmg: 900, explosionColor: [0x9a5aff, 0x08040f], noSelfDamage: true }
};

const GEAR = {
  kevlar:       { name: 'БРОНЯ (KEVLAR)', price: 650,  ap: 100, helmet: false },
  kevlarHelmet: { name: 'БРОНЯ + ШЛЕМ',   price: 1000, ap: 100, helmet: true },
  heavyArmor:   { name: 'УКРЕПЛЁННАЯ БРОНЯ', price: 2000, ap: 200, helmet: true, heavy: true, desc: 'AP 200 · поглощает больше урона' },
  energyArmor:  { name: 'ЭНЕРГОБРОНЯ',    price: 10000, ap: 300, helmet: true, heavy: true, energy: true, desc: 'AP 300 · лучшая защита, крепче укреплённой' },
  /* Consumables: bought once, kept for the rest of the match (and across
     rounds/offline waves). `ammo` is a refill, so it never shows as КУПЛЕНО. */
  ammo:         { name: 'ПАТРОНЫ',        price: 1500, ammo: true, desc: 'Полный запас ко всем стволам' },
  medkit:       { name: 'АПТЕЧКА',        price: 600,  medkit: true, desc: 'H или кнопка — +50 HP в бою' },
  medkitBox:    { name: 'ЯЩИК АПТЕЧЕК',   price: 10000, medkitBox: true, desc: 'Навсегда снимает лимит на аптечки' },
  drone:        { name: 'ДРОН-КАМИКАДЗЕ', price: 10000, drone: true, desc: 'Управляемый · F — запуск, враг может сбить' },
  turretGear:   { name: 'ДРОН-ТУРЕЛЬ',    price: 12000, turretGear: true, desc: 'V — вылетает и стреляет сам' },
  frag:         { name: 'ГРАНАТА',         price: 100,  grenade: 'frag',   desc: 'Осколочная · G — бросок' },
  freezeNade:   { name: 'КРИО-ГРАНАТА',    price: 120,  grenade: 'freeze', desc: 'Замораживает зомби в области' },
  napalmNade:   { name: 'НАПАЛМ',          price: 150,  grenade: 'napalm', desc: 'Оставляет горящую лужу' }
};
function grenadeName(kind) { return kind === 'freeze' ? 'КРИО' : kind === 'napalm' ? 'НАПАЛМ' : 'ГРАНАТА'; }
function todName(k) { return k === 'night' ? 'НОЧЬ' : 'ДЕНЬ'; }
function buildableName(k) { return k === 'barricade' ? 'БАРРИКАДА' : k === 'mine' ? 'МИНА' : 'ТУРЕЛЬ'; }
/* one save slot per offline mode, so each mode keeps its own run */
function offlineModeKey(modeId, horde, free, custom) {
  if (custom) return 'custom';
  if (modeId === 'bossrush' || modeId === 'daily' || modeId === 'endless') return modeId;
  if (free) return 'freehorde';
  if (horde) return 'horde';
  return 'normal';
}
function offlineModeLabel(key) {
  return ({ normal: 'ОБЫЧНЫЙ', horde: 'ОРДА ×10', freehorde: 'БЕСПЛАТНАЯ ОРДА',
    custom: 'СВОЙ', bossrush: 'БОСС-РАШ', daily: 'ИСПЫТАНИЕ ДНЯ', endless: 'БЕСКОНЕЧНЫЙ' })[key] || key;
}

const BUY_CATS = [
  { id: 'pistol',  label: 'ПИСТОЛЕТЫ' },
  { id: 'smg',     label: 'ПП' },
  { id: 'rifle',   label: 'ВИНТОВКИ' },
  { id: 'sniper',  label: 'СНАЙПЕРКИ' },
  { id: 'shotgun', label: 'ДРОБОВИКИ' },
  { id: 'lmg',     label: 'ПУЛЕМЁТЫ' },
  { id: 'heavy',   label: 'ТЯЖЁЛОЕ' },
  { id: 'exp',     label: 'ЭКСПЕРИМЕНТАЛЬНОЕ' },
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
  spitter:{ name: 'Плевун',       hp: 90,   speed: 2.10, dmg: 18, score: 220, money: 90, scale: 1.0,  color: 0x6f7d2e, atkRange: 1.6,
            shoot: 'spit', shootRange: 17, shootCd: 2.4, shootDmg: 16, shootSpeed: 23, shootGrav: 6 },

  /* ---- flying: ignores the ground and dives at the player from above ---- */
  flying: { name: 'Летун',        hp: 120,  speed: 3.30, dmg: 15, score: 260, money: 100, scale: 1.02, color: 0x63869c, atkRange: 1.7,
            flying: true, hover: 2.7 },

  /* ---- robot zombie: armoured ranged MINI-BOSS, from wave 8 onward ---- */
  robot:  { name: 'РОБОТ-ЗОМБИ',  hp: 1600, speed: 1.75, dmg: 45, score: 2200, money: 950, scale: 1.85, color: 0x8b95a1, atkRange: 2.3,
            miniBoss: true, armor: .35, shoot: 'plasma', shootRange: 26, shootCd: 2.2, shootDmg: 24, shootSpeed: 34, shootGrav: 0 },

  /* ---- new specials (waves 7+) ---- */
  splitter:{ name: 'ДЕЛЯЩИЙСЯ',   hp: 130, speed: 1.9, dmg: 15, score: 280, money: 110, scale: 1.1, color: 0x7a4a6a, atkRange: 1.6,
             splits: 3, splitType: 'crawler' },
  healer:  { name: 'ЛЕКАРЬ',      hp: 110, speed: 1.7, dmg: 10, score: 300, money: 140, scale: 1.0, color: 0x3f8f6a, atkRange: 1.5,
             heals: true, healRange: 9, healCd: 3.0, healAmount: 55 },
  shielder:{ name: 'ЩИТОНОСЕЦ',   hp: 240, speed: 1.5, dmg: 24, score: 380, money: 160, scale: 1.2, color: 0x5a6a8a, atkRange: 1.9,
             frontalShield: true, shieldArc: .6, shieldReduction: .92 },
  summoner:{ name: 'ПРИЗЫВАТЕЛЬ', hp: 420, speed: 1.35, dmg: 18, score: 900, money: 420, scale: 1.35, color: 0x6b3f8f, atkRange: 1.8,
             summons: true, summonCd: 6.5, summonCount: 4 },

  /* ---- BOSSES (spawned on dedicated boss waves) ----
     Every boss has its own `abilities` list. `Game.updateBosses` fires one at
     random every `abilityCd` seconds: summon reinforcements, a shockwave slam,
     a charge rush, a projectile barrage or (the final boss) summoning
     mini-bosses. Each one is armoured, hits harder and has its own model,
     music and aura. */
  bossWarden: { name: 'СТРАЖ',        hp: 5200,  speed: 1.45, dmg: 58, score: 6000,  money: 4000, scale: 2.45, color: 0x7d3b2e, atkRange: 2.7, boss: true, armor: .15,
                abilities: ['summon', 'shockwave', 'charge'], abilityCd: 7, aura: 0xff7a3a },
  bossBrute:  { name: 'ЖНЕЦ',         hp: 12000, speed: 1.70, dmg: 78, score: 12000, money: 6500, scale: 2.85, color: 0x5a2b6b, atkRange: 3.0, boss: true, armor: .20,
                abilities: ['charge', 'summon', 'barrage'], abilityCd: 6, aura: 0xc24bff },
  bossTitan:  { name: 'ТИТАН',        hp: 26000, speed: 1.20, dmg: 104, score: 24000, money: 10000, scale: 3.35, color: 0x6b2b2b, atkRange: 3.3, boss: true, armor: .30,
                abilities: ['shockwave', 'summon', 'charge', 'barrage'], abilityCd: 8, aura: 0xff4a2a },
  bossFinal:  { name: 'ПОЖИРАТЕЛЬ',   hp: 70000, speed: 1.10, dmg: 135, score: 80000, money: 22000, scale: 4.20, color: 0x2e1b4d, atkRange: 3.7, boss: true, final: true, armor: .35,
                abilities: ['barrage', 'summon', 'shockwave', 'summonMinions'], abilityCd: 5.5, aura: 0x9a3aff }
};

/* ---------------- endless-mode modifiers ----------------
   Picked one at a time every 10 waves; they stack for the whole run. Each one
   makes the fight harder but pays more, so the curve keeps climbing. */
const MODIFIERS = [
  { id: 'fast',     name: 'СПРИНТЕРЫ',   desc: 'Зомби быстрее на 30%',            apply(m) { m.speed *= 1.30; } },
  { id: 'tough',    name: 'БРОНЯ',       desc: 'Зомби прочнее на 40%',            apply(m) { m.hp *= 1.40; } },
  { id: 'deadly',   name: 'ЯРОСТЬ',      desc: 'Зомби бьют на 35% сильнее',       apply(m) { m.dmg *= 1.35; } },
  { id: 'many',     name: 'ПОЛЧИЩА',     desc: 'Зомби на 50% больше',             apply(m) { m.count *= 1.50; } },
  { id: 'armored',  name: 'БРОНЕЖИЛЕТЫ', desc: 'У зомби +15% брони',              apply(m) { m.armor += .15; } },
  { id: 'swift',    name: 'РЫВОК',       desc: 'Зомби спавнятся быстрее',         apply(m) { m.spawn *= .75; } },
  { id: 'glass',    name: 'СТЕКЛЯННЫЙ',  desc: 'Вы бьёте на 25% сильнее, но и вам больнее', apply(m) { m.playerDmg *= 1.25; m.playerHurt *= 1.25; } },
  { id: 'swarm',    name: 'РОЙ',         desc: 'Мини-босс каждые 2 волны',        apply(m) { m.miniEvery = 2; } }
];
const MOD_BASE = { speed: 1, hp: 1, dmg: 1, count: 1, armor: 0, spawn: 1, playerDmg: 1, playerHurt: 1, miniEvery: 3 };
function makeModState() { return Object.assign({}, MOD_BASE); }

/* ---------------- achievements ----------------
   `check(s)` reads a live stats snapshot and returns true when earned. They are
   stored in Store.data.ach and re-evaluated on every kill / wave / death. */
const ACHIEVEMENTS = [
  { id: 'firstBlood', name: 'ПЕРВАЯ КРОВЬ', desc: 'Убить первого зомби',       check: s => s.kills >= 1 },
  { id: 'slayer100',  name: 'ЧИСТИЛЬЩИК',   desc: '100 зомби за забег',         check: s => s.kills >= 100 },
  { id: 'slayer500',  name: 'МЯСОРУБКА',    desc: '500 зомби за забег',         check: s => s.kills >= 500 },
  { id: 'wave10',     name: 'ДЕСЯТКА',      desc: 'Дожить до 10 волны',         check: s => s.wave >= 10 },
  { id: 'wave25',     name: 'ВЕТЕРАН',      desc: 'Дожить до 25 волны',         check: s => s.wave >= 25 },
  { id: 'wave50',     name: 'ЛЕГЕНДА',      desc: 'Дожить до 50 волны',         check: s => s.wave >= 50 },
  { id: 'boss1',      name: 'ПОБЕДИТЕЛЬ БОССА', desc: 'Убить босса',            check: s => s.bossKills >= 1 },
  { id: 'boss4',      name: 'ГРОЗА БОССОВ', desc: 'Убить 4 боссов',             check: s => s.bossKills >= 4 },
  { id: 'head10',     name: 'СНАЙПЕР',      desc: '10 убийств в голову',        check: s => s.headshots >= 10 },
  { id: 'rich',       name: 'БОГАЧ',        desc: 'Накопить $50 000',           check: s => s.money >= 50000 },
  { id: 'survive',    name: 'ЖИВУЧИЙ',      desc: 'Пережить 15 минут в забеге', check: s => s.playTime >= 900 }
];

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
  /* a human-readable duration for the "time played" counter: 45с, 12м, 3ч 20м, 2д 4ч */
  duration: s => {
    s = Math.max(0, Math.floor(s || 0));
    if (s < 60) return s + 'с';
    const m = Math.floor(s / 60);
    if (m < 60) return m + 'м';
    const h = Math.floor(m / 60);
    if (h < 24) return h + 'ч ' + (m % 60) + 'м';
    const d = Math.floor(h / 24);
    return d + 'д ' + (h % 24) + 'ч';
  },
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
          map: 'arena', players: 2, maxHP: 100, aimAssist: 1, horde: 0, clears: 0, freeplay: 0, rounds: 3, playTime: 0,
          offCount: 1, offHp: 1, offFree: 0, offMode: 'normal', offMods: {}, offModsRun: 0, offModPick: 0, checkpoint: null, shopAllow: {}, shopItems: {}, music: 1, sfxVol: 100, musicVol: 70,
          grenade: 'frag', buildable: 'turret', weather: 'day', trapsEnabled: 1,
          ach: {}, runs: [], petOwned: 1,
          /* one saved run per offline mode: { normal|horde|freehorde|custom|bossrush|daily|endless: checkpoint } */
          checkpoints: {} },
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
