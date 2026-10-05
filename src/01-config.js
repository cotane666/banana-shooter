/* ============================================================
   01 — CONFIG, WEAPONS, UTILS
   ============================================================ */
'use strict';

const CS = window.CS = {
  version: '1.0',
  MODE: { MENU: 'menu', OFFLINE: 'offline', ONLINE: 'online', RANGE: 'range', EDITOR: 'editor' },
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
  /* мехакостюм: сидишь в кабине робота — камера заметно выше зомби */
  mechEyeHeight: 3.68,
  mechHeight: 3.90,
  mechRadius: 0.62,
  mechArmToe: 0.12,          // наклон рук-пушек внутрь, к прицелу (радианы)
  mechDomeRadius: 1.02,      // радиус стеклянного купола кабины
  mechMissileCd: 2.6,       // секунд между залпами самонаводящихся ракет (E)
  /* СКАЧОК НАПРЯЖЕНИЯ (R в мехе): электрическая ударная волна вокруг шасси */
  mechSurgeCd: 14,          // перезарядка способности (с)
  mechSurgeRadius: 16,      // радиус ударной волны (м) — было 33, уменьшено
  mechSurgeDmg: 660,        // урон врагам в радиусе
  mechSurgePush: 66,        // сила отброса
  mechSurgeBreakR: 12,      // радиус РАЗРУШЕНИЯ карты (меньше волны, чтобы не сносить пол-карты)
  /* мех-джетпак: держишь прыжок — 1.5с тяги, затем 1.5с перезарядки */
  mechJetMax: 1.5,
  mechJetRecharge: 1.5,
  mechJetThrust: 9.5,       // вертикальная тяга (м/с), поднимает даже без земли
  /* мех-рывок: короткий мощный бросок вперёд, затем перезарядка */
  mechDashSpeed: 26,        // начальная скорость броска (м/с)
  mechDashTime: 0.28,       // сколько длится сам бросок (с)
  mechDashCd: 2.2,          // перезарядка рывка (с)
  mechDashDmg: 60,          // урон/отброс зомби, которых задели на рывке
  /* ---- прокачка движения (снаряжение по $16000) ---- */
  highJumpThrust: 8.5,      // тяга джетпака высокого прыжка (м/с)
  highJumpMax: 1.1,         // секунд тяги при удержании прыжка
  highJumpRecharge: 1.2,    // перезарядка джетпака прыжка (с)
  gearDashSpeed: 24,        // начальная скорость рывка-перка (м/с)
  gearDashTime: 0.28,       // длительность рывка (с)
  gearDashCd: 3.0,          // перезарядка рывка (с)
  /* ---- ПРЕСЕТЫ ГРАФИКИ: 0 авто · 1 низкая · 2 средняя · 3 высокая ---- */
  gfxPresets: [
    /* АВТО (выбирается по устройству при загрузке) */
    { fog: 0.0075, cull: 70, near: 34, farInterval: 0.16, particleMul: 0.45, decalMul: 0.5, pixelCap: 1.0, shadow: 512, aa: false },
    /* НИЗКАЯ — для слабых телефонов */
    { fog: 0.0085, cull: 62, near: 30, farInterval: 0.20, particleMul: 0.35, decalMul: 0.4, pixelCap: 1.0, shadow: 512, aa: false },
    /* СРЕДНЯЯ */
    { fog: 0.0055, cull: 85, near: 42, farInterval: 0.12, particleMul: 1.0, decalMul: 1.0, pixelCap: 1.4, shadow: 2048, aa: true },
    /* ВЫСОКАЯ */
    { fog: 0.0042, cull: 130, near: 60, farInterval: 0.08, particleMul: 1.4, decalMul: 1.4, pixelCap: 2.0, shadow: 4096, aa: true }
  ],
  maxHP: 100,
  maxAP: 100,
  stepUp: 0.62,
  snapDown: 0.14,       // minimum distance the ground snap may pull the player down
  climbReach: 2.4,      // how far ahead the climb probe looks (metres from the body)
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
  moneyCap: 150000,     // most money a player can hold (мехакостюм стоит 120 000)
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

  /* ---- performance: zombie level-of-detail / culling ----
     Zombies nearer than zombieNearDist are fully simulated every frame; farther
     ones every zombieFarInterval seconds; beyond zombieCullDist they are hidden
     and skipped entirely (bosses and targets are always active). */
  zombieNearDist: 42,
  zombieFarInterval: 0.12,
  zombieCullDist: 85,
  /* runtime-настройки производительности (меняются пресетом графики) */
  particleMul: 1,
  decalMul: 1,

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
  /* ---- ОРУЖИЕ БЛИЖНЕГО БОЯ (отдельная категория, слот 3) ---- */
  machete: { name: 'МАЧЕТЕ', cat: 'melee', slot: 3, price: 400, dmg: 75, rpm: 96, mag: Infinity, reserve: 0,
           auto: false, spread: 0, moveSpread: 0, recoil: 2.4, falloff: 1, range: 2.7, headMul: 1.8, sound: 'knife', melee: 'machete' },
  katana:  { name: 'КАТАНА', cat: 'melee', slot: 3, price: 900, dmg: 62, rpm: 220, mag: Infinity, reserve: 0,
           auto: true, spread: 0, moveSpread: 0, recoil: 2, falloff: 1, range: 3.0, headMul: 2.2, sound: 'knife', melee: 'katana' },
  axe:     { name: 'ТОПОР', cat: 'melee', slot: 3, price: 700, dmg: 120, rpm: 62, mag: Infinity, reserve: 0,
           auto: false, spread: 0, moveSpread: 0, recoil: 3, falloff: 1, range: 2.6, headMul: 2.4, sound: 'knife', melee: 'axe' },
  chainsaw:{ name: 'БЕНЗОПИЛА', cat: 'melee', slot: 3, price: 2200, dmg: 30, rpm: 900, mag: Infinity, reserve: 0,
           auto: true, spread: 0, moveSpread: 0, recoil: .6, falloff: 1, range: 2.5, headMul: 1.6, sound: 'knife', melee: 'chainsaw' },
  hammer:  { name: 'МОЛОТ', cat: 'melee', slot: 3, price: 1500, dmg: 160, rpm: 48, mag: Infinity, reserve: 0,
           auto: false, spread: 0, moveSpread: 0, recoil: 3.4, falloff: 1, range: 2.9, headMul: 2.6, sound: 'knife', melee: 'hammer', knockback: 9 },
  fists:   { name: 'КУЛАКИ', cat: 'melee', slot: 3, price: 0, dmg: 40, rpm: 150, mag: Infinity, reserve: 0,
           auto: true, spread: 0, moveSpread: 0, recoil: 1.5, falloff: 1, range: 2.2, headMul: 1.5, sound: 'knife', melee: 'fists' },

  /* ---------------- МЕЧ РОКОЧУЩЕГО РЫЦАРЯ — 3 ЭТАПА ПРОКАЧКИ ----------------
     I  (5000)  — только удары ЛКМ.
     II (20000) — ЛКМ + ПКМ (ульта: чёрный экран + гигантский белый слеш).
     III(50000) — ЛКМ + ПКМ + ЛКМ-удары ВЫЛЕТАЮТ ВПЕРЁД белым слешем (те же углы
                  и цвет, что у мини-слешей) и наносят врагам удвоенный урон. */
  knightsword: { name: 'МЕЧ РЫЦАРЯ I', cat: 'melee', slot: 3, price: 10000, dmg: 210, rpm: 300, mag: Infinity, reserve: 0,
           auto: true, spread: 0, moveSpread: 0, recoil: 2.2, falloff: 1, range: 3.4, headMul: 2.2, sound: 'knife',
           melee: 'knightsword', knockback: 10, swordTier: 1 },
  knightsword2: { name: 'МЕЧ РЫЦАРЯ II', cat: 'melee', slot: 3, price: 30000, dmg: 210, rpm: 300, mag: Infinity, reserve: 0,
           auto: true, spread: 0, moveSpread: 0, recoil: 2.2, falloff: 1, range: 3.4, headMul: 2.2, sound: 'knife',
           melee: 'knightsword2', knockback: 10, swordTier: 2,
           ult: true, ultCd: 9, ultR: 12, ultDmg: 4200, ultBreakR: 11, ultBreakDelay: 2.4 },
  knightsword3: { name: 'МЕЧ РЫЦАРЯ III', cat: 'melee', slot: 3, price: 666666, dmg: 210, rpm: 300, mag: Infinity, reserve: 0,
           auto: true, spread: 0, moveSpread: 0, recoil: 2.2, falloff: 1, range: 3.4, headMul: 2.2, sound: 'knife',
           melee: 'knightsword3', knockback: 10, swordTier: 3,
           ult: true, ultCd: 9, ultR: 12, ultDmg: 4200, ultBreakR: 11, ultBreakDelay: 2.4,
           slashProj: true, slashProjDmg: 420 },

  /* ---------------- ОМЕГА-МОЛОТ (уникальное оружие ближнего боя) ----------------
     Огромный молот бьёт СВЕРХУ ВНИЗ: в точке удара поднимается ударная волна,
     которая ломает блоки и наносит огромный урон по площади всем вокруг. */
  megahammer: { name: 'ОМЕГА-МОЛОТ', cat: 'melee', slot: 3, price: 12000, dmg: 900, rpm: 26, mag: Infinity, reserve: 0,
           auto: false, spread: 0, moveSpread: 0, recoil: 5.5, falloff: 1, range: 4.4, headMul: 2.0, sound: 'knife',
           melee: 'megahammer', knockback: 26, groundSlam: true, slamR: 9, slamDmg: 560, slamBreakR: 8 },

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
  /* ---- БОЛЬШЕ РАЗНООБРАЗИЯ ДЛЯ ОДНОЙ РУКИ (слот 1) ---- */
  tec9:   { name: 'TEC-9', cat: 'pistol', slot: 1, price: 500, dmg: 24, rpm: 640, mag: 32, reserve: 120,
           auto: true, spread: .030, moveSpread: .022, recoil: .55, falloff: .55, range: 48, headMul: 1.8, sound: 'smg' },
  fiveSeven:{ name: 'FIVE-SEVEN', cat: 'pistol', slot: 1, price: 900, dmg: 40, rpm: 380, mag: 20, reserve: 100,
           auto: false, spread: .010, moveSpread: .020, recoil: .95, falloff: .85, range: 85, headMul: 2.6, sound: 'pistol' },
  handCannon:{ name: 'РУЧНАЯ ПУШКА', cat: 'pistol', slot: 1, price: 3000, dmg: 108, rpm: 78, mag: 5, reserve: 30,
           auto: false, spread: .010, moveSpread: .090, recoil: 6.0, falloff: .88, range: 95, headMul: 2.3, sound: 'deagle' },
  flarePistol:{ name: 'СИГНАЛЬНЫЙ ПИСТОЛЕТ', cat: 'pistol', slot: 1, price: 1400, dmg: 22, rpm: 60, mag: 4, reserve: 16,
           auto: false, spread: .020, moveSpread: .060, recoil: 3.0, falloff: .99, range: 120, headMul: 1.4,
           sound: 'deagle', projectile: 'rocket', projSpeed: 34, projGravity: 6,
           splash: 3.4, splashDmg: 70, explosionColor: [0xff9a2a, 0x2a1404] },
  nadePistol:{ name: 'ПИСТОЛЕТ-ГРАНАТОМЁТ', cat: 'pistol', slot: 1, price: 2600, dmg: 40, rpm: 55, mag: 4, reserve: 20,
           auto: false, spread: .014, moveSpread: .060, recoil: 3.4, falloff: .99, range: 130, headMul: 1.2,
           sound: 'deagle', projectile: 'rocket', projSpeed: 32, projGravity: 5,
           splash: 5.4, splashDmg: 150, explosionColor: [0xffb060, 0x151210] },

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
  atomicRpg: { name: 'АТОМНОЕ РПГ СВОБОДЫ', cat: 'heavy', slot: 2, price: 66666, dmg: 1300, rpm: 34, mag: 1, reserve: 20,
         auto: false, spread: .006, moveSpread: .070, recoil: 7.3, falloff: .99, range: 260, headMul: 1.2,
         sound: 'awp', projectile: 'rocket', projSpeed: 52, projGravity: 3,
         splash: 14.0, splashDmg: 1200, explosionColor: [0x39ff5a, 0x0a1a0a], noSelfDamage: true, nuke: true },

  /* ---------------- Y.H.S: absurdly strong, absurdly fast MG ----------------
     ВЗРЫВНЫЕ ПУЛИ: каждая пуля детонирует при попадании (AoE, радиус меньше,
     чем у снаряда РПГ). dmg — прямой урон пули, splash/splashDmg — взрыв.
     Взрыв НЕ наносит урон самому стрелку. */
  yhs: { name: 'Y.H.S', cat: 'heavy', slot: 2, price: 80000, dmg: 180, rpm: 5750, mag: 2000, reserve: 0,
         auto: true, spread: .030, moveSpread: .020, recoil: .35, falloff: .85, range: 140, headMul: 2.3,
         sound: 'rifle', spinUp: .35, bulletSplash: 4.2, bulletSplashDmg: 190, bulletExplosionColor: [0xffa22a, 0x1a0d05] },

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
  acid: { name: 'КИСЛОТОМЁТ', cat: 'exp', slot: 2, price: 5000, dmg: 34, rpm: 300, mag: 24, reserve: 96,
          auto: true, spread: .040, moveSpread: .030, recoil: 1.1, falloff: .70, range: 60, headMul: 1.4,
          sound: 'shotgun', projectile: 'acid', projSpeed: 23, projGravity: 18,
          acidR: 2.7, acidDps: 55, acidLife: 6.5 },

  /* КОНТРОЛЬ: hive — launches a hive that hatches homing kamikaze drones */
  hive: { name: 'РОЙ', cat: 'exp', slot: 2, price: 5000, dmg: 40, rpm: 34, mag: 2, reserve: 8,
          auto: false, spread: .020, moveSpread: .050, recoil: 3.0, falloff: .90, range: 140, headMul: 1.2,
          sound: 'banana', projectile: 'hive', projSpeed: 24, projGravity: 11,
          hiveCount: 5, splash: .6, splashDmg: 40 },

  /* ЦЕПЬ: tesla — a lightning machine gun: extremely fast, weak electric bolts,
     each forking to the next enemy in reach. ~2500 damage per second overall. */
  tesla: { name: 'ТЕСЛА-ПУШКА', cat: 'exp', slot: 2, price: 45000, dmg: 42, rpm: 3600, mag: 150, reserve: 600,
          auto: true, spread: .020, moveSpread: .030, recoil: .18, falloff: .85, range: 78, headMul: 1.5,
          sound: 'laser', special: 'tesla', chain: 4, chainRange: 10 },

  /* ОГОНЬ: flamethrower — a held cone of fire that burns everything in front */
  flamer: { name: 'ОГНЕМЁТ', cat: 'exp', slot: 2, price: 20000, dmg: 22, rpm: 60, mag: 200, reserve: 400,
          auto: true, spread: .07, moveSpread: .030, recoil: 0, falloff: .6, range: 22, headMul: 1.2,
          sound: 'shotgun', flame: true, flameDps: 900, flameRange: 21, flameCone: 1.0, flameRadius: 1.6, burnT: 4.5, burnDps: 160,
          flamePvpDps: 150 },

  /* ---------- СПАМТОН NEO: рука-пушка [BIG SHOT] ----------
     Стреляет случайными ПИПИСАМИ (яйца-«спамтонята»): взрывными, шипованными
     и прыгучими. У каждого свой вид и поведение. Звук и тема — «BIG SHOT». */
  spamtonGun: { name: '[BIG SHOT]', cat: 'exp', slot: 2, price: 39000, dmg: 60, rpm: 150, mag: 12, reserve: 60,
          auto: false, spread: .020, moveSpread: .030, recoil: 3.2, falloff: .85, range: 150, headMul: 1.6,
          sound: 'spamton', projectile: 'pipis', projSpeed: 34, projGravity: 11,
          pipisDmg: 90, spamton: true,
          /* ПКМ — ЗАРЯД: держи, чтобы раскрутить «BIG SHOT», отпусти — ГИПЕР-ПИПИС */
          spamtonCharge: true, chargeTime: 1.6, hyperDmg: 1400, hyperSplash: 13, hyperSplashDmg: 1200,
          hyperProjSpeed: 26, hyperBreakR: 11 },

  /* ---------- МЕХАКОСТЮМ: giant 6-barrel minigun (primary) + hyper laser (secondary) ---------- */
  mechMinigun: { name: 'МЕХА-МИНИГАН', cat: 'exp', slot: 2, price: 0, dmg: 55, rpm: 1600, mag: 9999, reserve: 0,
          auto: true, spread: .030, moveSpread: .020, recoil: .55, falloff: .70, range: 130, headMul: 2.0,
          sound: 'rifle', spinUp: .55, mechWeapon: true, hugeAmmo: true },
  mechLaser: { name: 'ГИПЕР-ЛАЗЕР', cat: 'exp', slot: 1, price: 0, dmg: 320, rpm: 420, mag: 9999, reserve: 0,
          auto: true, spread: .006, moveSpread: .020, recoil: .5, falloff: .98, range: 220, headMul: 1.8,
          sound: 'laser', pierce: true, mechWeapon: true, hugeAmmo: true },

  /* ГРАВИТАЦИЯ: black hole — a sphere that drags the horde in, then implodes */
  blackhole: { name: 'ЧЁРНАЯ ДЫРА', cat: 'exp', slot: 2, price: 65000, dmg: 60, rpm: 30, mag: 1, reserve: 5,
          auto: false, spread: .004, moveSpread: .050, recoil: 5.0, falloff: .99, range: 240, headMul: 1.2,
          sound: 'awp', projectile: 'blackhole', projSpeed: 32, projGravity: 3,
          wellR: 9.5, wellLife: 4.2, wellDps: 45, wellPull: 11,
          splash: 8.5, splashDmg: 900, explosionColor: [0x9a5aff, 0x08040f], noSelfDamage: true },

  /* ---------- ГОСПОДИН ЦВЕТОВ (LORD OF FLOWERS) ----------------
     Оружие БЛИЖНЕГО БОЯ без модели в руках.
     ЛКМ — ПРЯМОЙ ТАРАННЫЙ РЫВОК (без разворотов): игрок стремительно летит
           вперёд, зацепляет врагов, таранит их и отбрасывает.
     ПКМ (УЛЬТА) — «СОВОКУПНАЯ СИЛА»: полёт по петляющей траектории (три
           прохода с мёртвыми петлями, взлёт по большой дуге и пикирование), по
           пути таранит врагов, а в конце — цветочный взрыв и ударные волны.
     Во время обоих рывков игрок НЕ получает урона. */
  lordOfFlowers: { name: 'ГОСПОДИН ЦВЕТОВ', cat: 'melee', slot: 3, price: 123456, dmg: 170, rpm: 150, mag: Infinity, reserve: 0,
          auto: false, spread: 0, moveSpread: 0, recoil: 2.6, falloff: 1, range: 4.6, headMul: 2.0, sound: 'knife',
          melee: 'lordOfFlowers', knockback: 12, flowerMelee: true,
          flowerDash: true, dashCd: 1.4, dashSpeed: 34, dashDur: .5, dashDmg: 120, dashGrabR: 2.6,
          omegaDashCd: .5, omegaDist: 34,
          ult: true, ultCd: 20, ultR: 10, ultDmg: 1600, ultBreakR: 8, ultBreakDelay: 0, ultDist: 44,
          flowerUlt: true }
};
/* ============================================================
   МИНИ-ИЗОБРАЖЕНИЯ ОРУЖИЯ ДЛЯ МАГАЗИНА
   Один offscreen-рендерер рисует каждую модель в PNG ЧИСТЫМ ВИДОМ СБОКУ
   (ортографическая проекция, как в каталоге оружия), с автоподгонкой кадра
   и мягким трёхточечным светом. Результаты кэшируются по id.
   ============================================================ */
let _shopIconRenderer = null;
const _shopIconCache = {};

function shopWeaponIcon(id) {
  if (_shopIconCache[id] !== undefined) return _shopIconCache[id];
  let url = '';
  try {
    const W = 320, H = 150;
    if (!_shopIconRenderer) {
      const cnv = document.createElement('canvas');
      cnv.width = W; cnv.height = H;
      const r = new THREE.WebGLRenderer({ canvas: cnv, antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
      r.setPixelRatio(1);
      r.setSize(W, H, false);
      r.outputColorSpace = THREE.SRGBColorSpace;
      const sc = new THREE.Scene();
      /* трёхточечный свет как у каталожной съёмки: ключевой, заполняющий, контровой */
      sc.add(new THREE.HemisphereLight(0xffffff, 0x39424d, 1.5));
      const key = new THREE.DirectionalLight(0xffffff, 2.6); key.position.set(-1.2, 1.6, 2.4); sc.add(key);
      const fill = new THREE.DirectionalLight(0x9fc2ff, 1.0); fill.position.set(1.6, .4, 1.2); sc.add(fill);
      const rim = new THREE.DirectionalLight(0xffe6b0, .9); rim.position.set(.6, 1.2, -2.2); sc.add(rim);
      r._scene = sc;
      r._cam = new THREE.OrthographicCamera(-1, 1, 1, -1, -50, 200);
      _shopIconRenderer = r;
    }
    const r = _shopIconRenderer;
    const model = buildWeaponModel(id);
    r._scene.add(model);
    /* автоцентр */
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3(), ctr = new THREE.Vector3();
    box.getSize(size); box.getCenter(ctr);
    model.position.sub(ctr);
    /* лёгкий поворот: почти профиль, самую малость — чтобы читался объём */
    model.rotation.y = -0.06;

    /* ---- кадр: вид строго сбоку через ортокамеру ----
       смотрим с -X, поэтому ствол (модель вдоль -Z) уходит ВЛЕВО, как на фото.
       ширина кадра = размер по Z, высота = по Y; подгоняем под пропорции PNG. */
    const pad = 1.16;
    const A = W / H;
    const cw = Math.max(size.z, .2), chh = Math.max(size.y, .2);
    let halfW, halfH;
    if (cw / chh > A) { halfW = (cw / 2) * pad; halfH = halfW / A; }
    else { halfH = (chh / 2) * pad; halfW = halfH * A; }
    const cam = r._cam;
    cam.left = -halfW; cam.right = halfW; cam.top = halfH; cam.bottom = -halfH;
    const dist = Math.max(size.x, 1) + 20;
    cam.position.set(-dist, 0, 0);
    cam.up.set(0, 1, 0);
    cam.lookAt(0, 0, 0);
    cam.near = 0.1; cam.far = dist * 2 + 40;
    cam.updateProjectionMatrix();

    r.render(r._scene, cam);
    url = r.domElement.toDataURL('image/png');
    r._scene.remove(model);
    if (typeof disposeGroup === 'function') disposeGroup(model);
  } catch (e) { url = ''; }
  _shopIconCache[id] = url;
  return url;
}

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
  mechSuit:     { name: 'МЕХАКОСТЮМ',      price: 120000, mechSuit: true, desc: 'Мех-миниган (6 стволов) + гипер-лазер · 1/2 — переключить' },
  frag:         { name: 'ГРАНАТА',         price: 100,  grenade: 'frag',   desc: 'Осколочная · G — бросок' },
  freezeNade:   { name: 'КРИО-ГРАНАТА',    price: 120,  grenade: 'freeze', desc: 'Замораживает зомби в области' },
  napalmNade:   { name: 'НАПАЛМ',          price: 150,  grenade: 'napalm', desc: 'Оставляет горящую лужу' },
  stickyBomb:   { name: 'ЛИПУЧКА',         price: 300,  grenade: 'sticky', desc: 'Липнет к поверхности · взрыв по кнопке (U)' },
  /* ---- ПРОКАЧКА ДВИЖЕНИЯ: покупаются один раз, действуют весь забег ---- */
  highJump:     { name: 'ВЫСОКИЙ ПРЫЖОК',  price: 16000, perk: 'highJump', desc: 'Прыжок в 1.8× выше · держи ПРЫЖОК для джетпака' },
  dashGear:     { name: 'РЫВОК',           price: 16000, perk: 'dash',     desc: 'X или кнопка РЫВОК — быстрый рывок вперёд (перезаряд 3с)' },
  runBoost:     { name: 'ВЫСОКАЯ СКОРОСТЬ БЕГА', price: 16000, perk: 'runSpeed', desc: '+55% к скорости бега навсегда' }
};
function grenadeName(kind) { return kind === 'freeze' ? 'КРИО' : kind === 'napalm' ? 'НАПАЛМ' : kind === 'sticky' ? 'ЛИПУЧКА' : 'ГРАНАТА'; }
/* ---- ПОСЛЕДОВАТЕЛЬНАЯ ПРОКАЧКА МЕЧА РЫЦАРЯ ----
   II и III нельзя купить «перепрыгнув» этап: сначала I, потом II, потом III. */
const WEAPON_UPGRADE_CHAIN = {
  knightsword2: 'knightsword',
  knightsword3: 'knightsword2'
};
function todName(k) {
  return ({ day: 'ДЕНЬ', sunset: 'ЗАКАТ', night: 'НОЧЬ', dawn: 'РАССВЕТ' })[k] || 'ДЕНЬ';
}
function buildableName(k) { return k === 'barricade' ? 'БАРРИКАДА' : k === 'mine' ? 'МИНА' : 'ТУРЕЛЬ'; }
/* the environment is one setting: the time of day and the weather, plus an
   optional AUTO cycle. `envOff` disables both effects entirely. */
const TOD_ORDER = ['day', 'sunset', 'night', 'dawn'];
const WEATHER_ORDER = ['clear', 'clouds', 'rain', 'storm', 'fog', 'snow', 'ash'];
function weatherName(k) {
  return ({ clear: 'ЯСНО', clouds: 'ОБЛАЧНО', rain: 'ДОЖДЬ', storm: 'ГРОЗА', fog: 'ТУМАН', snow: 'СНЕГ', ash: 'ПЕПЕЛ' })[k] || 'ЯСНО';
}
/* one save slot per offline mode, so each mode keeps its own run */
function offlineModeKey(modeId, horde, free, custom) {
  if (custom) return 'custom';
  if (modeId === 'bossrush' || modeId === 'daily' || modeId === 'endless') return modeId;
  if (modeId === 'coop') return 'coop';
  if (free) return 'freehorde';
  if (horde) return 'horde';
  return 'normal';
}
function offlineModeLabel(key) {
  return ({ normal: 'ОБЫЧНЫЙ', horde: 'ОРДА ×10', freehorde: 'БЕСПЛАТНАЯ ОРДА',
    custom: 'СВОЙ', bossrush: 'БОСС-РАШ', daily: 'ИСПЫТАНИЕ ДНЯ', endless: 'БЕСКОНЕЧНЫЙ',
    coop: 'КООП' })[key] || key;
}

const BUY_CATS = [
  { id: 'pistol',  label: 'ПИСТОЛЕТЫ' },
  { id: 'smg',     label: 'ПП' },
  { id: 'rifle',   label: 'ВИНТОВКИ' },
  { id: 'sniper',  label: 'СНАЙПЕРКИ' },
  { id: 'shotgun', label: 'ДРОБОВИКИ' },
  { id: 'lmg',     label: 'ПУЛЕМЁТЫ' },
  { id: 'heavy',   label: 'ТЯЖЁЛОЕ' },
  { id: 'melee',   label: 'БЛИЖНИЙ БОЙ' },
  { id: 'exp',     label: 'ЭКСПЕРИМЕНТАЛЬНОЕ' },
  { id: 'banana',  label: 'БАНАНЫ' },
  { id: 'gear',    label: 'СНАРЯЖЕНИЕ' }
];

/* ---------------- zombie types ---------------- */
const ZOMBIES = {
  walker: { name: 'Ходок',        hp: 100,  speed: 1.65, dmg: 13, score: 100, money: 55, scale: 1.00, color: 0x6b7f52, atkRange: 1.5, breakPower: 1.0 },
  runner: { name: 'Бегун',        hp: 70,   speed: 4.30, dmg: 11, score: 150, money: 65, scale: 0.94, color: 0x8a6b3c, atkRange: 1.5, breakPower: 0.8 },
  tank:   { name: 'Толстяк',      hp: 340,  speed: 1.15, dmg: 27, score: 260, money: 110, scale: 1.38, color: 0x4d6b3f, atkRange: 1.9, breakPower: 1.7 },
  crawler:{ name: 'Ползун',       hp: 55,   speed: 3.10, dmg: 9,  score: 130, money: 60, scale: 0.80, color: 0x7a5a52, atkRange: 1.4, breakPower: 0.6 },
  brute:  { name: 'Громила',      hp: 620,  speed: 1.55, dmg: 36, score: 480, money: 190, scale: 1.62, color: 0x3f5236, atkRange: 2.1, breakPower: 2.4 },
  spitter:{ name: 'Плевун',       hp: 90,   speed: 2.10, dmg: 18, score: 220, money: 90, scale: 1.0,  color: 0x6f7d2e, atkRange: 1.6,
            shoot: 'spit', shootRange: 17, shootCd: 2.4, shootDmg: 16, shootSpeed: 23, shootGrav: 6 },

  /* ---- flying: ignores the ground and dives at the player from above ---- */
  flying: { name: 'Летун',        hp: 120,  speed: 3.30, dmg: 15, score: 260, money: 100, scale: 1.02, color: 0x63869c, atkRange: 1.7,
            flying: true, hover: 2.7 },

  /* ---- robot zombie: armoured ranged MINI-BOSS, from wave 8 onward ---- */
  robot:  { name: 'РОБОТ-ЗОМБИ',  hp: 1600, speed: 1.75, dmg: 45, score: 2200, money: 950, scale: 1.85, color: 0x8b95a1, atkRange: 2.3,
            miniBoss: true, armor: .35, shoot: 'plasma', shootRange: 26, shootCd: 2.2, shootDmg: 24, shootSpeed: 34, shootGrav: 0 },

  /* ============================================================
     НОВЫЕ МИНИ-БОССЫ (5) — разные по силе, способностям и моделькам.
     Сила растёт: сталкер < паук < криомант < пожиратель < титан-мини.
     ============================================================ */
  /* 1) СТАЛКЕР — слабый быстрый мини-босс: рывки к игроку */
  stalker: { name: 'СТАЛКЕР',     hp: 900,  speed: 2.55, dmg: 34, score: 1200, money: 520, scale: 1.55, color: 0x4a5a3a, atkRange: 2.1,
             miniBoss: true, armor: .10, abilities: ['charge'], abilityCd: 5.5, aura: 0x9bff57 },
  /* 2) ПАУК-МАТКА — плодовитый: призывает выводок и плюётся */
  spider:  { name: 'ПАУК-МАТКА',  hp: 1350, speed: 1.90, dmg: 30, score: 1600, money: 640, scale: 1.72, color: 0x5a2a4a, atkRange: 2.1,
             miniBoss: true, armor: .14, abilities: ['summon', 'barrage'], abilityCd: 6.5, aura: 0xff4a8a,
             shoot: 'spit', shootRange: 20, shootCd: 2.6, shootDmg: 18, shootSpeed: 22, shootGrav: 7 },
  /* 3) КРИОМАНТ — морозит игрока и создаёт лёд */
  cryomancer: { name: 'КРИОМАНТ', hp: 1750, speed: 1.60, dmg: 40, score: 2000, money: 780, scale: 1.80, color: 0x3a6f9e, atkRange: 2.2,
             miniBoss: true, armor: .18, abilities: ['frost', 'summon'], abilityCd: 6.0, aura: 0x7fd8ff,
             shoot: 'frost', shootRange: 24, shootCd: 2.0, shootDmg: 20, shootSpeed: 30, shootGrav: 0 },
  /* 4) ПОЖИРАТЕЛЬ ПЛОТИ — живучий: пожирает и лечится, бьёт мощно */
  devourer:{ name: 'ПОЖИРАТЕЛЬ ПЛОТИ', hp: 2400, speed: 1.45, dmg: 58, score: 2900, money: 1100, scale: 2.05, color: 0x7a1020, atkRange: 2.5,
             miniBoss: true, armor: .24, abilities: ['devour', 'shockwave'], abilityCd: 7.0, aura: 0xff2a3a },
  /* 5) ТИТАН-МИНИ — самый сильный мини-босс: ударная волна + обстрел */
  titanMini:{ name: 'ТИТАН-МИНИ', hp: 3400, speed: 1.30, dmg: 72, score: 4200, money: 1600, scale: 2.30, color: 0x6b3b2b, atkRange: 2.8,
             miniBoss: true, armor: .30, abilities: ['shockwave', 'charge', 'barrage'], abilityCd: 6.5, aura: 0xff7a2a, breakPower: 3.2 },

  /* ---- new specials (waves 7+) ---- */
  splitter:{ name: 'ДЕЛЯЩИЙСЯ',   hp: 130, speed: 1.9, dmg: 15, score: 280, money: 110, scale: 1.1, color: 0x7a4a6a, atkRange: 1.6,
             splits: 3, splitType: 'crawler' },
  healer:  { name: 'ЛЕКАРЬ',      hp: 110, speed: 1.7, dmg: 10, score: 300, money: 140, scale: 1.0, color: 0x3f8f6a, atkRange: 1.5,
             heals: true, healRange: 9, healCd: 3.0, healAmount: 55 },
  shielder:{ name: 'ЩИТОНОСЕЦ',   hp: 240, speed: 1.5, dmg: 24, score: 380, money: 160, scale: 1.2, color: 0x5a6a8a, atkRange: 1.9,
             frontalShield: true, shieldArc: .6, shieldReduction: .92 },
  summoner:{ name: 'ПРИЗЫВАТЕЛЬ', hp: 420, speed: 1.35, dmg: 18, score: 900, money: 420, scale: 1.35, color: 0x6b3f8f, atkRange: 1.8,
             summons: true, summonCd: 6.5, summonCount: 4 },
  /* ВЗРЫВНОЙ: бежит на игрока и детонирует, разнося стены и всё вокруг.
     После взрыва погибает. breakPower высокий — ломает препятствия. */
  bomber: { name: 'ПОДРЫВНИК',   hp: 90,   speed: 2.6,  dmg: 8,  score: 340, money: 150, scale: 1.15, color: 0x8a3a1a, atkRange: 1.9,
             explosive: true, blastR: 6.5, blastDmg: 95, breakPower: 2.6 },

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
                abilities: ['barrage', 'summon', 'shockwave', 'summonMinions'], abilityCd: 5.5, aura: 0x9a3aff },
  /* ФИНАЛЬНЫЙ БОСС «МОЗГ»: гигантский мозг с глазом. Требует не просто урона —
     сперва разрушить КОЛБЫ, затем поразить ОТКРЫТЫЙ ГЛАЗ, переживая волны
     атак. Многофазный (см. 07b-brain-boss.js). */
  brainBoss:  { name: 'МОЗГ-ПОЖИРАТЕЛЬ', hp: 90000, speed: .55, dmg: 120, score: 150000, money: 40000, scale: 3.6, color: 0xd98fb5, atkRange: 5.5, boss: true, final: true, brain: true, armor: .2,
                abilities: [], abilityCd: 4.5, aura: 0xff5d8f }
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
  { id: 'survive',    name: 'ЖИВУЧИЙ',      desc: 'Пережить 15 минут в забеге', check: s => s.playTime >= 900 },
  /* ============================================================
     EXTRA 50 — from easy warm-ups to brutal long-haul goals.
     Every one also unlocks a weapon skin (see SKINS below).
     ============================================================ */
  /* --- easy --- */
  { id: 'e_kill10',   name: 'РАЗМИНКА',        desc: 'Убить 10 зомби за забег',        check: s => s.kills >= 10 },
  { id: 'e_wave3',    name: 'ТРЕТЬЯ ВОЛНА',    desc: 'Дожить до 3 волны',              check: s => s.wave >= 3 },
  { id: 'e_head1',    name: 'ТОЧНЫЙ ГЛАЗ',     desc: 'Убить в голову',                 check: s => s.headshots >= 1 },
  { id: 'e_money1k',  name: 'ЖИВУЧИЙ СТАРТ',   desc: 'Отбить 3 волны, не потеряв ни капли HP', check: s => s.noDamageWaves >= 3 },
  { id: 'e_score5k',  name: 'ПЕРВЫЕ ОЧКИ',     desc: 'Набрать 5 000 очков',            check: s => s.score >= 5000 },
  { id: 'e_kill50',   name: 'ПОЛСОТНИ',        desc: '50 зомби за забег',              check: s => s.kills >= 50 },
  { id: 'e_time60',   name: 'МАРАФОНЕЦ',       desc: 'Пережить 1 минуту',              check: s => s.playTime >= 60 },
  /* --- medium --- */
  { id: 'm_wave15',   name: 'ПЯТНАДЦАТАЯ',     desc: 'Дожить до 15 волны',             check: s => s.wave >= 15 },
  { id: 'm_kill200',  name: 'ДВЕСТИ',          desc: '200 зомби за забег',             check: s => s.kills >= 200 },
  { id: 'm_head25',   name: 'В ГОЛОВУ',        desc: '25 убийств в голову',            check: s => s.headshots >= 25 },
  { id: 'm_money10k', name: 'КАПИТАЛ',         desc: 'Накопить $10 000',               check: s => s.money >= 10000 },
  { id: 'm_score25k', name: 'НЕОСТОРОЖНЫЙ',    desc: 'Выстрелить 5000 раз и промазать 4000', check: s => s.shots >= 5000 && s.misses >= 4000 },
  { id: 'm_acc40',    name: 'СТАБИЛЬНОСТЬ',    desc: 'Точность 40%+ (200+ выстрелов)', check: s => s.shots >= 200 && s.accuracy >= 40 },
  { id: 'm_mech10',   name: 'ПИЛОТ',           desc: '10 убийств из мехакостюма',      check: s => s.mechKills >= 10 },
  { id: 'm_knife5',   name: 'ТИХАЯ СМЕРТЬ',    desc: '5 убийств ножом',                check: s => s.knifeKills >= 5 },
  { id: 'm_streak3',  name: 'СЕРИЯ В ГОЛОВУ',  desc: '3 хедшота подряд',               check: s => s.bestHeadStreak >= 3 },
  { id: 'm_med5',     name: 'ФЕЛЬДШЕР',        desc: 'Использовать 5 аптечек',         check: s => s.medkitsUsed >= 5 },
  { id: 'm_wavekill25', name: 'ЗАЧИСТКА',      desc: '25 убийств за одну волну',       check: s => s.maxWaveKills >= 25 },
  { id: 'm_time300',  name: 'ПЯТЬ МИНУТ',      desc: 'Пережить 5 минут в забеге',      check: s => s.playTime >= 300 },
  { id: 'm_boss3',    name: 'ОХОТНИК',         desc: 'Убить 3 боссов за забег',        check: s => s.bossKills >= 3 },
  { id: 'm_deaths10', name: 'БЕЗ ПОТЕРЬ',      desc: '10 волн без смерти',             check: s => s.perfectWaves >= 10 },
  { id: 'm_total1k',  name: 'ТЫСЯЧА',          desc: '1 000 зомби всего',              check: s => s.killsTotal >= 1000 },
  /* --- hard --- */
  { id: 'h_wave35',   name: 'ТРИДЦАТЬ ПЯТЬ',   desc: 'Дожить до 35 волны',             check: s => s.wave >= 35 },
  { id: 'h_kill800',  name: 'ВОСЕМЬСОТ',       desc: '800 зомби за забег',             check: s => s.kills >= 800 },
  { id: 'h_head75',   name: 'ХИРУРГ',          desc: '75 убийств в голову',            check: s => s.headshots >= 75 },
  { id: 'h_score75k', name: 'ЗОМБИ-БОСС',      desc: 'Убить мини-босса',               check: s => s.miniBossKills >= 1 },
  { id: 'h_boss8',    name: 'ГРОЗА',           desc: 'Убить 8 боссов за забег',        check: s => s.bossKills >= 8 },
  { id: 'h_mech50',   name: 'МЕТАЛЛОЛОМ',      desc: '50 убийств из мехакостюма',      check: s => s.mechKills >= 50 },
  { id: 'h_knife25',  name: 'МАСТЕР НОЖА',     desc: '25 убийств ножом',               check: s => s.knifeKills >= 25 },
  { id: 'h_streak6',  name: 'ШЕСТЬ В ГОЛОВУ',  desc: '6 хедшотов подряд',              check: s => s.bestHeadStreak >= 6 },
  { id: 'h_acc55',    name: 'МЕТКИЙ СТРЕЛОК',  desc: 'Точность 55%+ (400+ выстрелов)', check: s => s.shots >= 400 && s.accuracy >= 55 },
  { id: 'h_wavekill60', name: 'БОЙНЯ',         desc: '60 убийств за одну волну',       check: s => s.maxWaveKills >= 60 },
  { id: 'h_med30',    name: 'ЛАЗАРЕТ',         desc: 'Использовать 30 аптечек',        check: s => s.medkitsUsed >= 30 },
  { id: 'h_perfect20', name: 'НЕПОБЕДИМЫЙ',    desc: '20 волн без смерти',             check: s => s.perfectWaves >= 20 },
  { id: 'h_total5k',  name: 'ПЯТЬ ТЫСЯЧ',      desc: '5 000 зомби всего',              check: s => s.killsTotal >= 5000 },
  { id: 'h_rich100k', name: 'РАСТРАТА',        desc: 'Потратить $50 000 за забег',     check: s => s.spent >= 50000 },
  { id: 'h_time1200', name: 'СТОЙКИЙ',         desc: 'Пережить 20 минут в забеге',     check: s => s.playTime >= 1200 },
  { id: 'h_win10',    name: 'ОНЛАЙН-БОЕЦ',     desc: '10 побед в онлайне',             check: s => s.wins >= 10 },
  /* ИНТЕРЕСНЫЕ: скорострельные, аккуратные и на выносливость */
  { id: 'x_rampage',  name: 'РАЗДЕЛЯЮЩИЙ ХАОС', desc: '100 убийств за 5 секунд',       check: s => s.fastKills >= 100 },
  { id: 'm_noReload', name: 'БЕЗ ПЕРЕЗАРЯДКИ', desc: '20 волн без единой перезарядки', check: s => s.wavesNoReload >= 20 },
  { id: 'h_pacifist', name: 'ПАЦИФИСТ',        desc: '10 волн без единого выстрела',   check: s => s.wavesNoShots >= 10 },
  /* --- very hard --- */
  { id: 'v_wave75',   name: 'СЕМЬДЕСЯТ ПЯТЬ',  desc: 'Дожить до 75 волны',             check: s => s.wave >= 75 },
  { id: 'v_kill1500', name: 'ТЫСЯЧА ПЯТЬСОТ',  desc: '1 500 зомби за забег',           check: s => s.kills >= 1500 },
  { id: 'v_head200',  name: 'АНГЕЛ СМЕРТИ',    desc: '200 убийств в голову',           check: s => s.headshots >= 200 },
  { id: 'v_score250k', name: 'БЕЗУПРЕЧНЫЙ',    desc: 'Пройти 100 волн без единой смерти', check: s => s.perfectWaves >= 100 },
  { id: 'v_perfect40', name: 'ЖЕЛЕЗНЫЙ',       desc: '40 волн без смерти',             check: s => s.perfectWaves >= 40 },
  { id: 'v_boss15',   name: 'ПОГЛОТИТЕЛЬ БОССОВ', desc: '15 боссов за забег',          check: s => s.bossKills >= 15 },
  { id: 'v_streak10', name: 'ДЕСЯТЬ В ГОЛОВУ', desc: '10 хедшотов подряд',             check: s => s.bestHeadStreak >= 10 },
  { id: 'v_acc70',    name: 'ИДЕАЛЬНЫЙ',       desc: 'Точность 70%+ (600+ выстрелов)', check: s => s.shots >= 600 && s.accuracy >= 70 },
  { id: 'v_total20k', name: 'ДВАДЦАТЬ ТЫСЯЧ',  desc: '20 000 зомби всего',             check: s => s.killsTotal >= 20000 },
  { id: 'v_clear5',   name: 'ПЯТЬ ПРОХОДОВ',   desc: 'Пройти игру 5 раз',              check: s => s.clears >= 5 },
  { id: 'x_speedrun', name: 'СПЕШКА',          desc: 'Пройти игру быстрее 1 ч 30 мин', check: s => s.fastClear >= 1 },
  { id: 'v_win50',    name: 'ВЕТЕРАН ВОЙНЫ',   desc: 'Выйти в топ-3 рейтинга сервера',  check: s => s.top3 >= 1 },
  { id: 'x_marathon', name: 'ЖЕЛЕЗНАЯ ВЫДЕРЖКА', desc: 'Пережить 45 минут одним забегом', check: s => s.runTime >= 2700 },
  { id: 'v_time3600', name: 'ЧАС В ПЕКЛЕ',     desc: 'Пережить 60 минут в забеге',     check: s => s.playTime >= 3600 },
  /* ============================================================
     HEAVY ARSENAL — one goal per heavy weapon (they also each unlock a
     dedicated heavy-weapon skin below).
     ============================================================ */
  { id: 'hv_minigun', name: 'СВИНЦОВЫЙ ДОЖДЬ', desc: '600 убийств из минигана',        check: s => s.minigunKills >= 600 },
  { id: 'hv_rpg',     name: 'ПОДРЫВНИК',       desc: '150 убийств из РПГ',             check: s => s.rpgKills >= 150 },
  { id: 'hv_laser',   name: 'ЛУЧЕВОЙ',         desc: '150 убийств из лазерной винтовки', check: s => s.laserKills >= 150 },
  { id: 'hv_cannon',  name: 'ПЕРЕГРЕВ',        desc: '80 убийств из лазерной пушки',   check: s => s.cannonKills >= 80 },
  { id: 'hv_atomic',  name: 'ЯДЕРНЫЙ ГРИБ',    desc: '25 убийств из атомного РПГ',     check: s => s.atomicKills >= 25 },
  { id: 'hv_yhs',     name: 'АРСЕНАЛ',         desc: '1 000 убийств из Y.H.S',         check: s => s.yhsKills >= 1000 },
  { id: 'hv_rocket',  name: 'САМОНАВЕДЕНИЕ',   desc: '100 убийств из ракетницы',       check: s => s.rocketKills >= 100 },
  { id: 'hv_shield',  name: 'НЕСОКРУШИМЫЙ',    desc: '25 убийств с поднятым щитом',    check: s => s.shieldKills >= 25 },
  /* второй набор на каждый тяжёлый ствол — ещё по скину на каждое оружие */
  { id: 'hv2_minigun', name: 'ШКВАЛ',          desc: '1 600 убийств из минигана',      check: s => s.minigunKills >= 1600 },
  { id: 'hv2_rpg',     name: 'АРТИЛЛЕРИЯ',     desc: '300 убийств из РПГ',             check: s => s.rpgKills >= 300 },
  { id: 'hv2_laser',   name: 'СВЕТОВОЙ МЕЧ',   desc: '300 убийств из лазерной винтовки', check: s => s.laserKills >= 300 },
  { id: 'hv2_cannon',  name: 'ЛУЧ СМЕРТИ',     desc: '200 убийств из лазерной пушки',  check: s => s.cannonKills >= 200 },
  { id: 'hv2_atomic',  name: 'КОНЕЦ СВЕТА',    desc: '60 убийств из атомного РПГ',     check: s => s.atomicKills >= 60 },
  { id: 'hv2_yhs',     name: 'СВЕРХАРСЕНАЛ',   desc: '2 500 убийств из Y.H.S',         check: s => s.yhsKills >= 2500 },
  { id: 'hv2_rocket',  name: 'СТАЯ',           desc: '250 убийств из ракетницы',       check: s => s.rocketKills >= 250 },
  { id: 'hv2_shield',  name: 'ОТРАЖАТЕЛЬ',     desc: '80 убийств с поднятым щитом',    check: s => s.shieldKills >= 80 },
  /* ============================================================
     ПЛАТИНОВОЕ ФИНАЛЬНОЕ ДОСТИЖЕНИЕ — венец коллекции. Чтобы его получить,
     нужно выполнить ВСЕ остальные достижения (кроме него самого). Награда —
     «ГАЛАКТИКА»: очень красивый скин на оружие и на персонажа.
     ============================================================ */
  { id: 'platinum_all', name: 'ВЛАДЫКА ГАЛАКТИКИ', desc: 'Выполнить все остальные достижения', check: s => s.otherAchievementsDone === true },
  /* ХАРДКОР — одна жизнь. Награда: кровавый скин «ПЛОТЬ». */
  { id: 'hardcore_wave', name: 'ОДНА ЖИЗНЬ', desc: 'Дожить до 25 волны в ХАРДКОРЕ', check: s => s.hardcoreWave >= 25 },
  { id: 'hardcore_full', name: 'НЕВОЗМОЖНОЕ', desc: 'Пройти ХАРДКОР полностью (100 волн)', check: s => s.hardcoreFull === true },
  /* ============================================================
     МЕХАКОСТЮМ — достижения, открывающие СКИНЫ НА МЕХА (см. MECH_SKINS ниже).
     Помечены `mech: true`: награда — раскраска шасси, а не оружия, и они не
     участвуют в платиновом достижении (чтобы не усложнять его).
     ============================================================ */
  { id: 'mc_first',    mech: 1, name: 'ЗАПРАВКА',          desc: 'Убить первого зомби из мехакостюма', check: s => s.mechKills >= 1 },
  { id: 'mc_rookie',   mech: 1, name: 'СТАЛЬНОЙ ПАРЕНЬ',   desc: '25 убийств из мехакостюма',          check: s => s.mechKills >= 25 },
  { id: 'mc_time',     mech: 1, name: 'МЕХ-МАРАФОН',       desc: 'Провести 10 минут в мехакостюме',    check: s => s.mechTime >= 600 },
  { id: 'mc_miniboss', mech: 1, name: 'ГРОЗА КОРПОРАЦИЙ',  desc: 'Убить мини-босса из мехакостюма',    check: s => s.mechMiniBossKills >= 1 },
  { id: 'mc_ace',      mech: 1, name: 'АС МЕХАКОСТЮМА',    desc: '250 убийств из мехакостюма',         check: s => s.mechKills >= 250 },
  { id: 'mc_titan',    mech: 1, name: 'ТИТАН',             desc: '500 убийств из мехакостюма',         check: s => s.mechKills >= 500 }
];

/* ============================================================
   ACHIEVEMENT PROGRESS
   Every achievement shows its OWN progress bar. A table maps each goal to the
   live statistic it counts and the target value; a couple of compound goals
   (accuracy needs a minimum shot count AND a percentage) are special-cased.
   ============================================================ */
const ACH_PROGRESS = {
  /* original 11 */
  firstBlood: ['kills', 1], slayer100: ['kills', 100], slayer500: ['kills', 500],
  wave10: ['wave', 10], wave25: ['wave', 25], wave50: ['wave', 50],
  boss1: ['bossKills', 1], boss4: ['bossKills', 4], head10: ['headshots', 10],
  rich: ['money', 50000], survive: ['playTime', 900],
  /* easy */
  e_kill10: ['kills', 10], e_wave3: ['wave', 3], e_head1: ['headshots', 1],
  e_money1k: ['noDamageWaves', 3], e_score5k: ['score', 5000], e_kill50: ['kills', 50],
  e_time60: ['playTime', 60],
  /* medium */
  m_wave15: ['wave', 15], m_kill200: ['kills', 200], m_head25: ['headshots', 25],
  m_money10k: ['money', 10000],
  m_mech10: ['mechKills', 10], m_knife5: ['knifeKills', 5], m_streak3: ['bestHeadStreak', 3],
  m_med5: ['medkitsUsed', 5], m_wavekill25: ['maxWaveKills', 25], m_time300: ['playTime', 300],
  m_boss3: ['bossKills', 3], m_deaths10: ['perfectWaves', 10], m_total1k: ['killsTotal', 1000],
  m_noReload: ['wavesNoReload', 20],
  /* hard */
  h_wave35: ['wave', 35], h_kill800: ['kills', 800], h_head75: ['headshots', 75],
  h_score75k: ['miniBossKills', 1], h_boss8: ['bossKills', 8], h_mech50: ['mechKills', 50],
  h_knife25: ['knifeKills', 25], h_streak6: ['bestHeadStreak', 6],
  h_wavekill60: ['maxWaveKills', 60], h_med30: ['medkitsUsed', 30],
  h_perfect20: ['perfectWaves', 20], h_total5k: ['killsTotal', 5000],
  h_rich100k: ['spent', 50000], h_time1200: ['playTime', 1200], h_win10: ['wins', 10],
  h_pacifist: ['wavesNoShots', 10],
  /* very hard */
  v_wave75: ['wave', 75], v_kill1500: ['kills', 1500], v_head200: ['headshots', 200],
  v_score250k: ['perfectWaves', 100], v_perfect40: ['perfectWaves', 40], v_boss15: ['bossKills', 15],
  v_streak10: ['bestHeadStreak', 10], v_total20k: ['killsTotal', 20000],
  v_clear5: ['clears', 5], v_win50: ['top3', 1], v_time3600: ['playTime', 3600],
  hardcore_wave: ['hardcoreWave', 25],
  hardcore_full: ['hardcoreFull', 1],
  /* мехакостюм — цели для мех-скинов */
  mc_first: ['mechKills', 1], mc_rookie: ['mechKills', 25], mc_time: ['mechTime', 600],
  mc_miniboss: ['mechMiniBossKills', 1], mc_ace: ['mechKills', 250], mc_titan: ['mechKills', 500],
  /* интересные: скорострельные и на выносливость */
  x_rampage: ['fastKills', 100], x_speedrun: ['fastClear', 1], x_marathon: ['runTime', 2700],
  /* heavy arsenal (both sets) */
  hv_minigun: ['minigunKills', 600], hv_rpg: ['rpgKills', 150], hv_laser: ['laserKills', 150],
  hv_cannon: ['cannonKills', 80], hv_atomic: ['atomicKills', 25], hv_yhs: ['yhsKills', 1000],
  hv_rocket: ['rocketKills', 100], hv_shield: ['shieldKills', 25],
  hv2_minigun: ['minigunKills', 1600], hv2_rpg: ['rpgKills', 300], hv2_laser: ['laserKills', 300],
  hv2_cannon: ['cannonKills', 200], hv2_atomic: ['atomicKills', 60], hv2_yhs: ['yhsKills', 2500],
  hv2_rocket: ['rocketKills', 250], hv2_shield: ['shieldKills', 80]
};
/* compound accuracy goals: a minimum number of shots AND an accuracy % */
const ACH_ACC = {
  m_acc40: { shots: 200, acc: 40 }, h_acc55: { shots: 400, acc: 55 }, v_acc70: { shots: 600, acc: 70 }
};
/* returns { have, goal, frac } for one achievement against a live stats snapshot */
function achProgress(a, s) {
  if (!a || !s) return { have: 0, goal: 1, frac: 0 };
  const acc = ACH_ACC[a.id];
  if (acc) {
    const shots = s.shots || 0, pct = s.accuracy || 0;
    const have = Math.min(shots / acc.shots, pct / acc.acc);
    return { have: Math.round(have * acc.shots), goal: acc.shots, frac: U.clamp(have, 0, 1), label: Math.round(pct) + '% / ' + acc.acc + '%' };
  }
  /* «быстрое прохождение» — цель по времени: пока не пройдено, показываем отсчёт
     от лимита (чем меньше времени, тем больше прогресс) */
  if (a.id === 'x_speedrun') {
    const have = s.fastClear || 0, goal = 1;
    return { have: have, goal: goal, frac: have >= 1 ? 1 : 0 };
  }
  /* НЕОСТОРОЖНЫЙ: нужно И выстрелить много, И много промазать — берём минимум долей */
  if (a.id === 'm_score25k') {
    const shots = s.shots || 0, misses = s.misses || 0;
    const frac = Math.min(shots / 5000, misses / 4000);
    return { have: Math.min(shots, misses), goal: 4000, frac: U.clamp(frac, 0, 1), label: Math.round(misses) + ' промахов' };
  }
  /* финальное платиновое достижение: прогресс = доля ВЫПОЛНЕННЫХ остальных */
  if (a.id === 'platinum_all') {
    const done = s.otherDone || 0, total = s.otherTotal || 1;
    return { have: done, goal: total, frac: U.clamp(done / total, 0, 1) };
  }
  const spec = ACH_PROGRESS[a.id];
  if (!spec) return { have: 0, goal: 1, frac: 0 };
  const have = Math.max(0, s[spec[0]] || 0), goal = spec[1];
  return { have: have, goal: goal, frac: U.clamp(have / goal, 0, 1) };
}
/* a short "1 234 / 5 000" style label for the progress readout */
function achProgressText(have, goal) {
  const f = n => Math.round(n).toLocaleString('ru-RU');
  return f(have) + ' / ' + f(goal);
}
/* how many achievements (excluding the platinum one) are done, and whether all
   of them are — the condition behind the final platinum reward. */
function achOtherDone(ach) {
  ach = ach || {};
  let n = 0;
  for (let i = 0; i < ACHIEVEMENTS.length; i++) {
    const a = ACHIEVEMENTS[i];
    if (a.id === 'platinum_all' || a.mech) continue;   // мех-скины не влияют на платину
    if (ach[a.id]) n++;
  }
  return n;
}
function achOtherTotal() {
  let n = 0;
  for (let i = 0; i < ACHIEVEMENTS.length; i++) {
    const a = ACHIEVEMENTS[i];
    if (a.id === 'platinum_all' || a.mech) continue;
    n++;
  }
  return n;
}
function achAllOthersDone(ach) {
  return achOtherDone(ach) >= achOtherTotal();
}

/* ============================================================
   WEAPON SKINS
   One skin per achievement (earned → unlocked). Each skin has a RARITY derived
   from how hard its achievement is: harder → rarer → more decoration and a
   stronger glow. Rarities: ОБЫЧНЫЙ → НЕОБЫЧНЫЙ → РЕДКИЙ → ЭПИЧЕСКИЙ → ЛЕГЕНДАРНЫЙ.
   ============================================================ */
const SKIN_RARITIES = {
  common:    { id: 'common',    label: 'ОБЫЧНЫЙ',     color: 0x9aa4ae, deco: 'none',   glow: .20, beads: 0 },
  uncommon:  { id: 'uncommon',  label: 'НЕОБЫЧНЫЙ',   color: 0x57d16a, deco: 'stripe', glow: .32, beads: 0 },
  rare:      { id: 'rare',      label: 'РЕДКИЙ',      color: 0x4aa3ff, deco: 'vent',   glow: .46, beads: 2 },
  epic:      { id: 'epic',      label: 'ЭПИЧЕСКИЙ',   color: 0xb27bff, deco: 'plasma', glow: .62, beads: 3 },
  legendary: { id: 'legendary', label: 'ЛЕГЕНДАРНЫЙ', color: 0xffb020, deco: 'legend', glow: .80, beads: 4 },
  /* платина — только для финального достижения «ВЛАДЫКА ГАЛАКТИКИ» */
  platinum:  { id: 'platinum',  label: 'ПЛАТИНОВЫЙ',  color: 0xd896ff, deco: 'galaxy', glow: 1.0, beads: 8 }
};
const SKIN_RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'platinum'];

/* palettes are grouped by rarity so a rarer skin always looks fancier.
   Each palette now gives a FULL multi-part scheme: separate colours for the
   receiver (body), barrel/steel, magazine, grip/polymer and accents — plus a
   glow colour used for lights, tracers and the muzzle flash. */
const SKIN_PALETTES = [
  /* common — muted field finishes. NOTE: parts use DIFFERENT HUES (a coloured
     receiver, a light metallic barrel/steel, a near-black grip and a bright
     accent), so the gun reads as a real multi-colour paint job, not one tone.
     `pat` is the TEXTURE pattern — the strongest visual identity of a skin. */
  { rar: 'common', pat: 'grid',   body: 0x5d6247, steel: 0xb8bcc0, mag: 0x3a3d2c, grip: 0x1d1f16, accent: 0xa8c25a, glow: 0xa8c25a, shot: 0xd8f0a0 },
  { rar: 'common', pat: 'carbon', body: 0x6c757f, steel: 0xd6dde4, mag: 0x3f464d, grip: 0x22272d, accent: 0x9aa4ae, glow: 0x9aa4ae, shot: 0xffe6b0 },
  { rar: 'common', pat: 'wood',   body: 0xb09a63, steel: 0xe0d6bc, mag: 0x6b5a38, grip: 0x332b1c, accent: 0xffe08a, glow: 0xffe08a, shot: 0xfff0c0 },
  /* uncommon — two-tone battle paints */
  { rar: 'uncommon', pat: 'hazard', body: 0x2f343b, steel: 0x9aa4ae, mag: 0x181c21, grip: 0x0d1013, accent: 0xff9d21, glow: 0xff9d21, shot: 0xffc060 },
  { rar: 'uncommon', pat: 'tiger',  body: 0x9e2b2b, steel: 0xc9c9cf, mag: 0x4a1414, grip: 0x1e1010, accent: 0xff5a4a, glow: 0xff5a4a, shot: 0xff9070 },
  { rar: 'uncommon', pat: 'camo',   body: 0x6fb6d6, steel: 0xe8f4fa, mag: 0x2f5f78, grip: 0x17323e, accent: 0x9fe6ff, glow: 0x9fe6ff, shot: 0xd0f4ff },
  /* rare — saturated finishes with vents */
  { rar: 'rare', pat: 'hazard', body: 0x5d8f2e, steel: 0xc9d4c0, mag: 0x2c4a14, grip: 0x16220c, accent: 0x9bff57, glow: 0x9bff57, shot: 0xc8ff90 },
  { rar: 'rare', pat: 'hex',    body: 0x2b7f8f, steel: 0xd6e2e6, mag: 0x0f3a45, grip: 0x08202a, accent: 0x4ad6ff, glow: 0x4ad6ff, shot: 0xa0f0ff },
  { rar: 'rare', pat: 'scale',  body: 0x6b4a9e, steel: 0xddd6ec, mag: 0x3a2456, grip: 0x1a1030, accent: 0xb27bff, glow: 0xb27bff, shot: 0xd8b0ff },
  /* epic — plasma-charged, glowing cells */
  { rar: 'epic', pat: 'plasma', body: 0x5a2a8a, steel: 0xe8e8f2, mag: 0x2c1244, grip: 0x160a26, accent: 0xe06bff, glow: 0xe06bff, shot: 0xf0a0ff },
  { rar: 'epic', pat: 'hex',    body: 0x2f6f9e, steel: 0xd6f6ff, mag: 0x163a52, grip: 0x0a1e2c, accent: 0x7ffff0, glow: 0x7ffff0, shot: 0xb0fff8 },
  { rar: 'epic', pat: 'plasma', body: 0x8f3a1e, steel: 0xe8b488, mag: 0x3c1a0c, grip: 0x1c0c06, accent: 0xff7a1a, glow: 0xff7a1a, shot: 0xffb060 },
  /* legendary — gold / prismatic / void, fully dressed */
  { rar: 'legendary', pat: 'prism', body: 0xc8a24a, steel: 0xfff0c0, mag: 0x6b5220, grip: 0x2a2010, accent: 0xffd06a, glow: 0xffd06a, shot: 0xffe89a },
  { rar: 'legendary', pat: 'prism', body: 0xb8b8d8, steel: 0xffffff, mag: 0x585878, grip: 0x24243a, accent: 0xff6ad6, glow: 0xff6ad6, shot: 0xffb0f0 },
  { rar: 'legendary', pat: 'plasma', body: 0x3a2458, steel: 0xc0a0f0, mag: 0x1a0e2a, grip: 0x0a0616, accent: 0xc060ff, glow: 0xc060ff, shot: 0xe0a0ff },
  /* epic — heavy-arsenal exclusive finishes (bigger guns get bolder looks) */
  { rar: 'epic', heavy: 1, pat: 'hex',    body: 0x123a5c, steel: 0xa8d8ff, mag: 0x08203c, grip: 0x04101e, accent: 0x4ad6ff, glow: 0x4ad6ff, shot: 0xa0f0ff },
  { rar: 'epic', heavy: 1, pat: 'scale',  body: 0x4a1020, steel: 0xffb0b8, mag: 0x2a0810, grip: 0x140408, accent: 0xff2a4a, glow: 0xff2a4a, shot: 0xff8090 },
  { rar: 'epic', heavy: 1, pat: 'hazard', body: 0x14401e, steel: 0xb8ffc0, mag: 0x082a12, grip: 0x04160a, accent: 0x39ff5a, glow: 0x39ff5a, shot: 0x9bffb0 },
  { rar: 'epic', heavy: 1, pat: 'carbon', body: 0x3a3a44, steel: 0xececf8, mag: 0x1e1e26, grip: 0x0e0e12, accent: 0xd8d8ff, glow: 0xe8e8ff, shot: 0xf0f0ff },
  /* legendary — heavy-arsenal exclusive, the very best-looking kit */
  { rar: 'legendary', heavy: 1, pat: 'prism',  body: 0x2a2010, steel: 0xffe0a0, mag: 0x140f05, grip: 0x0a0803, accent: 0xffb020, glow: 0xffd06a, shot: 0xffe89a },
  { rar: 'legendary', heavy: 1, pat: 'plasma', body: 0x2a0a3a, steel: 0xf0b0ff, mag: 0x180620, grip: 0x0c0312, accent: 0xff6ad6, glow: 0xff6ad6, shot: 0xffb0f0 },
  { rar: 'legendary', heavy: 1, pat: 'hex',    body: 0x06202a, steel: 0x90fff0, mag: 0x021014, grip: 0x010608, accent: 0x00ffd0, glow: 0x40ffe0, shot: 0xa0fff0 },
  { rar: 'legendary', heavy: 1, pat: 'scale',  body: 0x2a0a0a, steel: 0xffc080, mag: 0x1a0606, grip: 0x100404, accent: 0xff6a1a, glow: 0xff8a2a, shot: 0xffc080 },
  /* legendary — second heavy set (hv2_*): a distinct look per gun */
  { rar: 'legendary', heavy: 1, pat: 'tiger',   body: 0x1a1a22, steel: 0xe8e8f4, mag: 0x0e0e14, grip: 0x06060a, accent: 0xaad4ff, glow: 0xcfe4ff, shot: 0xe8f4ff },
  { rar: 'legendary', heavy: 1, pat: 'camo',    body: 0x142a16, steel: 0x9fffa8, mag: 0x0a1a0c, grip: 0x050d06, accent: 0x3bff6a, glow: 0x5fffa0, shot: 0xb0ffc8 },
  { rar: 'legendary', heavy: 1, pat: 'hazard',  body: 0x2a2408, steel: 0xfff090, mag: 0x1a1605, grip: 0x0c0a03, accent: 0xffd400, glow: 0xffe650, shot: 0xfff4a0 },
  { rar: 'legendary', heavy: 1, pat: 'carbon',  body: 0x0d0d12, steel: 0xd0d8e4, mag: 0x060609, grip: 0x020204, accent: 0xff3a4a, glow: 0xff5a6a, shot: 0xff9aa6 },
  { rar: 'legendary', heavy: 1, pat: 'prism',   body: 0x241038, steel: 0xd8b0ff, mag: 0x150822, grip: 0x0a0414, accent: 0xb060ff, glow: 0xc890ff, shot: 0xe0c0ff },
  { rar: 'legendary', heavy: 1, pat: 'grid',    body: 0x08201e, steel: 0x8fffe0, mag: 0x041210, grip: 0x020806, accent: 0x00e0b0, glow: 0x40ffd0, shot: 0x90ffe8 },
  { rar: 'legendary', heavy: 1, pat: 'wood',    body: 0x2a1a0c, steel: 0xffd0a0, mag: 0x1a0f06, grip: 0x0c0703, accent: 0xd8a060, glow: 0xffc080, shot: 0xffe0b0 },
  { rar: 'legendary', heavy: 1, pat: 'brick',   body: 0x2a1414, steel: 0xffb0b0, mag: 0x180a0a, grip: 0x0c0505, accent: 0xff5040, glow: 0xff8070, shot: 0xffb0a0 },
  { rar: 'legendary', heavy: 1, pat: 'noise',   body: 0x101820, steel: 0xa0c0e0, mag: 0x080e14, grip: 0x040608, accent: 0x80b0ff, glow: 0xa0d0ff, shot: 0xc0e0ff },
  { rar: 'legendary', heavy: 1, pat: 'checker', body: 0x1a1a1a, steel: 0xf0f0f0, mag: 0x0e0e0e, grip: 0x060606, accent: 0xc0c0c0, glow: 0xe0e0ff, shot: 0xffffff },
  /* ПЛАТИНА — единственный экземпляр, для финального достижения «ВЛАДЫКА
     ГАЛАКТИКИ». Полноценная модель строится в applyGalaxySkin; эти цвета —
     запасные для карточек/трассеров. */
  { rar: 'platinum', pat: 'galaxy', body: 0x0a0416, steel: 0xb83cff, mag: 0x150822, grip: 0x0a0414, accent: 0xd896ff, glow: 0xd896ff, shot: 0xe8c8ff },
  /* ТЕМАТИЧЕСКИЕ — каждый скин с собственной темой, чтобы не повторяться */
  { rar: 'legendary', pat: 'flesh', body: 0x3a050b, steel: 0xc41428, mag: 0x1c0206, grip: 0x0e0104, accent: 0xff2a3a, glow: 0xff3a4a, shot: 0xff2a3a },
  { rar: 'rare', pat: 'pixel', body: 0x1c2c4a, steel: 0x59c2e0, mag: 0x0e1626, grip: 0x070b13, accent: 0xffd24a, glow: 0x59c2e0, shot: 0x9fe6ff },
  { rar: 'uncommon', pat: 'toy', body: 0xe23b56, steel: 0xffd24a, mag: 0x8a1e30, grip: 0x4a0f1a, accent: 0x4ad6ff, glow: 0xffd24a, shot: 0xffe28a },
  { rar: 'epic', pat: 'glass', body: 0x0c2230, steel: 0x9fe0ff, mag: 0x06141c, grip: 0x030a0e, accent: 0x59d6ff, glow: 0x9fe6ff, shot: 0xd0f4ff },
  { rar: 'epic', pat: 'ice', body: 0x0a2a3a, steel: 0xcfeaff, mag: 0x061820, grip: 0x030c10, accent: 0x7fd8ff, glow: 0xaee6ff, shot: 0xd8f4ff },
  { rar: 'legendary', pat: 'fire', body: 0x1a0400, steel: 0xff9a2a, mag: 0x0e0200, grip: 0x070100, accent: 0xffd24a, glow: 0xff7a1a, shot: 0xffb060 },
  { rar: 'legendary', pat: 'alien', body: 0x0a1a08, steel: 0x8aff6a, mag: 0x051004, grip: 0x020802, accent: 0xb6ff4a, glow: 0x7fff5a, shot: 0xc8ff8a },
  { rar: 'rare', pat: 'brick', body: 0x3a1a12, steel: 0xd0a890, mag: 0x24100a, grip: 0x120806, accent: 0xff6a3a, glow: 0xff8a5a, shot: 0xffb090 },
  { rar: 'rare', pat: 'noise', body: 0x1a1e24, steel: 0xb8c4d0, mag: 0x10141a, grip: 0x080a0e, accent: 0x9ab0c8, glow: 0xc0d0e0, shot: 0xd8e4f0 },
  { rar: 'uncommon', pat: 'checker', body: 0x2a2a2a, steel: 0xf0f0f0, mag: 0x161616, grip: 0x0a0a0a, accent: 0xff5a4a, glow: 0xffffff, shot: 0xffffff },
  { rar: 'common', pat: 'concrete', body: 0x6a6a64, steel: 0xb8b8b0, mag: 0x44443f, grip: 0x24241f, accent: 0x9a9a90, glow: 0xb8b8b0, shot: 0xd8d8d0 },
  { rar: 'common', pat: 'grass', body: 0x2f4a1e, steel: 0x9ab880, mag: 0x1c2e12, grip: 0x0e1609, accent: 0x8ad24a, glow: 0x9ad85a, shot: 0xc8f090 },
  { rar: 'common', pat: 'water', body: 0x14405a, steel: 0xa8d8e8, mag: 0x0a2432, grip: 0x051218, accent: 0x4ac8e0, glow: 0x8ad8f0, shot: 0xc0ecff },
  { rar: 'rare', pat: 'camo', body: 0x36402a, steel: 0xa0a898, mag: 0x1e2416, grip: 0x0f120b, accent: 0x8f9a70, glow: 0xa8b090, shot: 0xd0d8b8 },
  { rar: 'epic', pat: 'tiger', body: 0x3a2a10, steel: 0xffc060, mag: 0x201608, grip: 0x100b04, accent: 0xff8a1a, glow: 0xffb040, shot: 0xffd080 },
  { rar: 'uncommon', pat: 'wood', body: 0x6a4a24, steel: 0xd8b070, mag: 0x422c14, grip: 0x20160a, accent: 0xffd08a, glow: 0xd8b070, shot: 0xffe0b0 },
  { rar: 'rare', pat: 'hazard', body: 0x2a2408, steel: 0xfff090, mag: 0x1a1605, grip: 0x0c0a03, accent: 0xffd400, glow: 0xffe650, shot: 0xfff4a0 },
  { rar: 'epic', pat: 'hex', body: 0x2a0a2a, steel: 0xff9ae8, mag: 0x180618, grip: 0x0c030c, accent: 0xff5ad6, glow: 0xff8ae0, shot: 0xffb0f0 },
  { rar: 'epic', pat: 'scale', body: 0x0a2a24, steel: 0x9affd8, mag: 0x061814, grip: 0x030c0a, accent: 0x4affc0, glow: 0x7fffd8, shot: 0xc0fff0 },
  { rar: 'legendary', pat: 'prism', body: 0x2a1050, steel: 0xd8b0ff, mag: 0x180828, grip: 0x0a0414, accent: 0xb060ff, glow: 0xc890ff, shot: 0xe0c0ff },
  { rar: 'legendary', pat: 'plasma', body: 0x3a0a5a, steel: 0xffc0ff, mag: 0x200630, grip: 0x100318, accent: 0xff6ad6, glow: 0xff8ae0, shot: 0xffc0f0 },
  { rar: 'common', pat: 'grid', body: 0x3a4048, steel: 0xb0b8c0, mag: 0x22262c, grip: 0x111316, accent: 0x90a0b0, glow: 0xb0b8c0, shot: 0xd8e0e8 },
  { rar: 'common', pat: 'carbon', body: 0x1a1e24, steel: 0x98a0a8, mag: 0x101216, grip: 0x08090c, accent: 0x8890a0, glow: 0xa0a8b8, shot: 0xc8d0d8 }
];
const _PAL_BY_RAR = {};
SKIN_PALETTES.forEach(p => { (_PAL_BY_RAR[p.rar] = _PAL_BY_RAR[p.rar] || []).push(p); });

/* which rarity an achievement's reward skin has */
function skinRarityFor(achId) {
  // heavy-arsenal goals are the fanciest; the second set is all legendary
  if (achId === 'platinum_all') return 'platinum';
  if (achId.startsWith('hv2_')) return 'legendary';
  if (achId.startsWith('hv_')) return (achId === 'hv_atomic' || achId === 'hv_yhs' || achId === 'hv_shield' || achId === 'hv_cannon') ? 'legendary' : 'epic';
  // new goal tiers by their id prefix
  if (achId === 'x_rampage' || achId === 'x_speedrun') return 'legendary';
  if (achId === 'x_marathon') return 'epic';
  if (achId === 'hardcore_wave') return 'legendary';
  if (achId === 'hardcore_full') return 'platinum';
  /* МЕХАКОСТЮМ: награда — скин на МЕХА (не на оружие). Реальная раскраска
     берётся из MECH_SKINS; редкость здесь нужна для карточек. */
  if (achId === 'mc_first') return 'common';
  if (achId === 'mc_rookie') return 'uncommon';
  if (achId === 'mc_time') return 'rare';
  if (achId === 'mc_miniboss') return 'epic';
  if (achId.startsWith('mc_')) return 'legendary';
  if (achId.startsWith('v_')) return 'legendary';
  if (achId.startsWith('m_')) return 'rare';
  if (achId.startsWith('e_')) return 'uncommon';
  // the original 11 are hand-graded
  const base = {
    firstBlood: 'common', head10: 'uncommon', slayer100: 'uncommon',
    boss1: 'uncommon', rich: 'rare', wave10: 'rare', survive: 'rare',
    boss4: 'epic', slayer500: 'epic', wave25: 'epic', wave50: 'legendary'
  };
  return base[achId] || 'common';
}

/* --- hue helpers so every skin can get a unique colour set --- */
function _hexToHsl(hex) {
  const r = ((hex >> 16) & 255) / 255, g = ((hex >> 8) & 255) / 255, b = (hex & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0, s = 0, l = (mx + mn) / 2;
  if (d) { s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); if (mx === r) h = (g - b) / d + (g < b ? 6 : 0); else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h /= 6; }
  return [h, s, l];
}
function _hslToHex(h, s, l) {
  h = ((h % 1) + 1) % 1;
  const f = n => { const k = (n + h * 12) % 12; const a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
  return (f(0) << 16) | (f(8) << 8) | f(4);
}
function _rotHue(hex, deg) {
  const [h, s, l] = _hexToHsl(hex >>> 0);
  return _hslToHex(h + deg / 360, s, l);
}

const SKINS = (() => {
  /* Каждый скин получает СВОЮ расцветку: палитра берётся по редкости, а если
     её уже кто-то занял — оттенок сдвигается, чтобы цвета гарантированно не
     повторялись. Плюс у каждого скина свой тематический паттерн. */
  const palUse = {};
  const pickPal = (rar) => {
    let pool = SKIN_PALETTES.filter(p => p.rar === rar);
    if (!pool.length) pool = SKIN_PALETTES;
    // least-used palette of this rarity so the rotation count stays low
    return pool.reduce((a, b) => ((palUse[SKIN_PALETTES.indexOf(a)] || 0) <= (palUse[SKIN_PALETTES.indexOf(b)] || 0) ? a : b));
  };
  const shift = (pal) => {
    const k = SKIN_PALETTES.indexOf(pal);
    const n = (palUse[k] = (palUse[k] || 0) + 1) - 1;   // 0 for the first use
    if (n === 0) return pal;
    const d = n * 29;                                    // 29° per reuse → clearly different
    return Object.assign({}, pal, {
      body: _rotHue(pal.body, d), steel: _rotHue(pal.steel, d), mag: _rotHue(pal.mag, d),
      grip: _rotHue(pal.grip, d), accent: _rotHue(pal.accent, d), glow: _rotHue(pal.glow, d),
      shot: _rotHue(pal.shot, d)
    });
  };
  return ACHIEVEMENTS.map(a => {
    const rar = skinRarityFor(a.id);
    const rd = SKIN_RARITIES[rar];
    /* МЕХАКОСТЮМ: у этих достижений награда — раскраска МЕХА (MECH_SKINS).
       Обычного скина на оружие нет, но запись нужна для карточки достижения
       (чтобы UI показал награду). */
    if (a.mech) {
      return { id: 'sk_' + a.id, ach: a.id, mech: true, name: 'СКИН МЕХА · ' + a.name,
        rarity: rar, rarityLabel: rd.label, rarityColor: rd.color,
        body: 0x39434c, steel: 0x9aa4ae, mag: 0x111316, grip: 0x060608, accent: rd.color, glow: rd.color, shot: rd.color,
        tint: [0x39434c, 0x9aa4ae], deco: rd.deco, beads: rd.beads, glowMul: rd.glow };
    }
    let pal, deco = rd.deco, beads = rd.beads;
    if (rar === 'platinum') {
      /* «ГАЛАКТИКА» — единственная в своём роде, не зависит от палитр */
      pal = SKIN_PALETTES.filter(p => p.rar === 'platinum')[0];
      deco = 'galaxy'; beads = 8;
    } else if (a.id === 'hardcore_wave') {
      pal = SKIN_PALETTES.filter(p => p.pat === 'flesh')[0]; deco = 'flesh'; beads = 6;
    } else if (a.id.startsWith('hv_') || a.id.startsWith('hv2_')) {
      const pool = SKIN_PALETTES.filter(p => p.heavy && p.rar === rar);
      pal = shift(pool.length ? pool[0] : pickPal(rar));
      deco = rar === 'legendary' ? 'legend2' : 'plasma2';
      beads = rar === 'legendary' ? 6 : 4;
    } else {
      pal = shift(pickPal(rar));
    }
    return {
      id: 'sk_' + a.id,
      ach: a.id,
      mech: 0,                                 // обычный скин на ОРУЖИЕ
      name: 'СКИН · ' + a.name,
      rarity: rar,
      rarityLabel: rd.label,
      rarityColor: rd.color,
      heavy: !!pal.heavy,
      pattern: pal.pat || null,
      /* full multi-part scheme */
      body: pal.body, steel: pal.steel, mag: pal.mag, grip: pal.grip,
      accent: pal.accent, glow: pal.glow, shot: pal.shot,
      tint: [pal.body, pal.steel],            // kept for older callers
      deco: deco,
      beads: beads,
      glowMul: rd.glow
    };
  });
})();
function skinById(id) { for (let i = 0; i < SKINS.length; i++) if (SKINS[i].id === id) return SKINS[i]; return null; }
function skinForAchievement(achId) { for (let i = 0; i < SKINS.length; i++) if (SKINS[i].ach === achId) return SKINS[i]; return null; }

/* ============================================================
   MECH SKINS — раскраски МЕХАКОСТЮМА. Каждая открывается мех-достижением
   (ACHIEVEMENTS с `mech: true`). Мех — многоматериальная модель (корпус, тёмная
   броня, белые вставки, золото, красные ракеты), поэтому у скина есть роль для
   каждого материала: body / dark / white / gold / red, плюс accent (свечение
   лампы и бликов) и своё имя.
   ============================================================ */
const MECH_SKINS = [
  { id: 'mch_none',   ach: null,          name: 'СТАНДАРТНЫЙ', rarity: 'common', exact: 1,
    body: 0x2b4a8f, dark: 0x1b2026, white: 0xdfe6f0, gold: 0xd8b45a, red: 0xc4302a, accent: 0x6fc8ff, glow: 0 },
  { id: 'mch_basic',  ach: 'mc_first',    name: 'ЗАВОДСКОЙ', rarity: 'common',
    body: 0x4a5560, dark: 0x20262c, white: 0xc8d0d8, gold: 0xb8a45a, red: 0xb03028, accent: 0xff8a3a, glow: .15 },
  { id: 'mch_rookie', ach: 'mc_rookie',   name: 'КАМУФЛЯЖ', rarity: 'uncommon',
    body: 0x4a5a34, dark: 0x1a2214, white: 0xd8dcc0, gold: 0xc8a84a, red: 0xa83028, accent: 0x9bd85a, glow: .25 },
  { id: 'mch_time',   ach: 'mc_time',     name: 'ПЕСЧАНЫЙ ШТОРМ', rarity: 'rare',
    body: 0xb09a5a, dark: 0x3a3020, white: 0xf0e8d0, gold: 0xffd06a, red: 0xc04828, accent: 0xffc060, glow: .4 },
  { id: 'mch_mini',   ach: 'mc_miniboss', name: 'ПУРПУРНЫЙ РАЗРУШИТЕЛЬ', rarity: 'epic',
    body: 0x5a2a8a, dark: 0x1c0e2a, white: 0xe8d8ff, gold: 0xb060ff, red: 0xff3a6a, accent: 0xe06bff, glow: .65,
    emissive: 0x2a0a44 },
  { id: 'mch_ace',    ach: 'mc_ace',      name: 'ЗОЛОТОЙ АС', rarity: 'legendary',
    body: 0xc8a24a, dark: 0x2a2010, white: 0xfff0c0, gold: 0xffd06a, red: 0xc03828, accent: 0xffd06a, glow: .8,
    emissive: 0x2a1e06 },
  { id: 'mch_titan',  ach: 'mc_titan',    name: 'ТИТАН', rarity: 'legendary',
    body: 0x2a2010, dark: 0x0e0c08, white: 0xffe0a0, gold: 0xffb020, red: 0xff2a3a, accent: 0xff6a1a, glow: 1.0,
    emissive: 0x3a1400 }
];
function mechSkinById(id) { for (let i = 0; i < MECH_SKINS.length; i++) if (MECH_SKINS[i].id === id) return MECH_SKINS[i]; return null; }
function mechSkinForAch(achId) { for (let i = 0; i < MECH_SKINS.length; i++) if (MECH_SKINS[i].ach === achId) return MECH_SKINS[i]; return null; }
function skinRarityCounts() {
  const c = {}; SKIN_RARITY_ORDER.forEach(r => c[r] = 0);
  SKINS.forEach(s => { if (s.mech) return; c[s.rarity] = (c[s.rarity] || 0) + 1; });
  return c;
}
/* a CSS colour for a rarity (used by the UI cards) */
function rarityHex(rar) { return '#' + (SKIN_RARITIES[rar] ? SKIN_RARITIES[rar].color : 0x39434c).toString(16).padStart(6, '0'); }

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
  data: { sens: 2.2, fov: 80, vol: 60, quality: 1, gfx: 0, touchSens: 1.5, name: '', best: 0, bestWave: 0, killsTotal: 0, matches: 0, wins: 0, signalSrv: 0, aimBest: 0, aimAutoFire: 1,
          map: 'arena', players: 2, maxHP: 100, aimAssist: 1, horde: 0, clears: 0, freeplay: 0, rounds: 3, playTime: 0,
          offCount: 1, offHp: 1, offFree: 0, offMode: 'normal', offMods: {}, offModsRun: 0, offModPick: 0, checkpoint: null, shopAllow: {}, shopItems: {}, music: 1, sfxVol: 100, musicVol: 70,
          grenade: 'frag', buildable: 'turret', weather: 'day', trapsEnabled: 1, offCountExact: 10, offCountFixed: 0,
          timeOfDay: 'day', skyWeather: 'clear', envAuto: 0, envOff: 0, envAutoSpeed: 1, menuTour: 1,
          ach: {}, runs: [], skinOn: {}, skinChar: '', mechSkin: '',
          /* КАСТОМНЫЕ КАРТЫ из редактора: [{ id, name, blocks:[...], spawn:{x,z} }] */
          customMaps: [],
          /* галактический скин персонажа открыт вместе с платиновым достижением */
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
