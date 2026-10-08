/* ============================================================
   06c — СПАМТОН [BIG SHOT]: СИСТЕМА УЛУЧШЕНИЙ «КРОМЕР»
   В духе Spamton Subplot: за убийства выпадает КРОМЕР (монетки),
   раз в 2 волны открывается магазин. Работает ТОЛЬКО когда в руках
   рука-пушка [BIG SHOT] (оффлайн).

   КАТАЛОГ: 58 предметов в трёх категориях —
     • ОРУЖИЕ  — модификаторы выстрелов (урон, наведение, веер…)
     • ЗАЩИТА  — щиты, броня, воскрешение, компаньоны поддержки
     • СПАВН   — компаньоны (фамильяры), которые кружат рядом и бьют.
   Ассортимент магазина — 4 случайных позиции; доступные по карману
   идут первыми, дорогие остаются видимыми для ознакомления (серые).
   ============================================================ */

/* ------------------------------------------------------------------
   КАТАЛОГ ПРЕДМЕТОВ (58)
   Поля:
     id, name, desc, cost — цена базового уровня,
     max   — сколько раз можно взять (1 — уникальный),
     col   — цвет карточки,
     cat   — weapon | support | spawn,
     stat  — ключ бонуса (аддитивный), amt — величина за уровень,
     special — уникальное поведение (щит/воскрешение/мантия/scarf/copycat…),
     familiar — тип компаньона (для категории spawn).
   Цена растёт с уровнем: cost * (уровень + 1).
   ------------------------------------------------------------------ */

const KROMER_ITEMS = [
  /* ================= ОРУЖИЕ ================= */
  { id: 'bigshot',   cat: 'weapon',  name: '[[BIG SHOT]]',       desc: 'Урон пиписов ×2 без штрафа к скорострельности', cost: 800, max: 1, col: '#ffd21e', stat: 'dmg', amt: 1.00 },
  { id: 'homing',    cat: 'weapon',  name: 'HOMING BULLETS',    desc: 'Пиписы сами наводятся на ближайшего врага',       cost: 500, max: 1, col: '#ff5fb0', special: 'homing' },
  { id: 'cowboy',    cat: 'weapon',  name: 'COWBOY HAT',         desc: 'Пули летят ровнее: разброс −30% за уровень',      cost: 200, max: 3, col: '#c98a3a', stat: 'spread', amt: -0.30 },
  { id: 'puppet',    cat: 'weapon',  name: 'PUPPET SCARF',       desc: 'Орбитальные снаряды кружат вокруг и бьют врагов',  cost: 400, max: 1, col: '#b98cff', special: 'scarf', familiar: 'scarf', famDmg: 30, famCd: 0.5, famR: 2.6 },
  { id: 'dmg',       cat: 'weapon',  name: '[[БОЛЬШОЙ УРОН]]',   desc: 'Пиписы бьют сильнее (+12% урона)',                cost: 120, max: 5, col: '#ffd21e', stat: 'dmg', amt: 0.12 },
  { id: 'rate',      cat: 'weapon',  name: '[[СКОРОСТРЕЛ]]',     desc: 'Стрельба быстрее (+10% темпа)',                   cost: 140, max: 5, col: '#ff5fb0', stat: 'rate', amt: 0.10 },
  { id: 'extra',     cat: 'weapon',  name: '[[РАСПРОДАЖА]]',     desc: '+1 пипис за выстрел',                            cost: 300, max: 3, col: '#39d94a', stat: 'extra', amt: 1 },
  { id: 'size',      cat: 'weapon',  name: '[[ОГРОМНЫЕ ПИПИСЫ]]', desc: 'Пиписы крупнее и больнее (+15% размера)',       cost: 160, max: 3, col: '#ffd21e', stat: 'size', amt: 0.15 },
  { id: 'pierce',    cat: 'weapon',  name: '[[ОЧЕНЬ ОСТРЫЕ]]',   desc: 'Шиповые прошивают +1 врага',                     cost: 220, max: 3, col: '#8fe0ff', stat: 'pierce', amt: 1 },
  { id: 'bounce',    cat: 'weapon',  name: '[[БОЛЬШОЙ ОТСКОК]]', desc: 'Прыгуны отскакивают чаще +1',                    cost: 180, max: 3, col: '#8fe0ff', stat: 'bounce', amt: 1 },
  { id: 'crit',      cat: 'weapon',  name: '[[КРИТ! КРИТ!]]',    desc: 'Шанс критического удара (×2 урон)',              cost: 250, max: 4, col: '#ff9d21', stat: 'crit', amt: 0.08 },
  { id: 'shots',     cat: 'weapon',  name: '[[РАЗДАЧА 3-в-1]]',  desc: '+1 пипис веером за выстрел',                    cost: 600, max: 2, col: '#ff5fb0', stat: 'shots', amt: 1 },
  { id: 'speed',     cat: 'weapon',  name: '[[ТУРБО-ПИПИС]]',    desc: 'Снаряды летят быстрее (+15% скорости)',          cost: 200, max: 3, col: '#4ad6ff', stat: 'speed', amt: 0.15 },
  { id: 'splash',    cat: 'weapon',  name: '[[БУМ-БУМ]]',        desc: 'Радиус взрыва взрывных пиписов +15%',            cost: 320, max: 3, col: '#ff7a1e', stat: 'splash', amt: 0.15 },
  { id: 'freeze',    cat: 'weapon',  name: '[[ЗАМОРОЗКА]]',      desc: 'Шанс заморозить врага при попадании',            cost: 280, max: 3, col: '#8fe0ff', stat: 'freeze', amt: 0.10 },
  { id: 'burn',      cat: 'weapon',  name: '[[ПОДЖОГ]]',         desc: 'Пули поджигают врагов (урон со временем)',       cost: 300, max: 3, col: '#ff5a1a', stat: 'burn', amt: 1 },
  { id: 'lifesteal', cat: 'weapon',  name: '[[ВАМПИРИЗМ]]',      desc: '+2% здоровья от нанесённого урона',             cost: 450, max: 3, col: '#e05141', stat: 'lifesteal', amt: 0.02 },
  { id: 'ricochet',  cat: 'weapon',  name: '[[РИКОШЕТ×2]]',      desc: 'Прыгуны отскакивают ещё +2 раза',                cost: 340, max: 2, col: '#8fe0ff', stat: 'bounce', amt: 2 },
  { id: 'homingstr', cat: 'weapon',  name: '[[СУПЕР-ДОСТАВКА]]', desc: 'Самонаведение сильнее и дальше',                 cost: 350, max: 2, col: '#ff5fb0', stat: 'homingStr', amt: 1 },
  { id: 'bigboom',   cat: 'weapon',  name: '[[МОЩНЫЙ БУМ]]',     desc: 'Взрывные пиписы бьют сильнее (+20%)',            cost: 360, max: 3, col: '#ff7a1e', stat: 'splashDmg', amt: 0.20 },
  { id: 'spikepierce',cat:'weapon',  name: '[[ПРОБИВНОЙ ШИП]]',  desc: 'Шиповые прошивают ещё +1 врага',                 cost: 380, max: 2, col: '#8fe0ff', stat: 'pierce', amt: 1 },
  { id: 'bouncylife',cat: 'weapon',  name: '[[ДОЛГИЙ ОТСКОК]]',  desc: 'Прыгуны живут дольше +1.5с',                     cost: 240, max: 2, col: '#8fe0ff', stat: 'bouncyLife', amt: 1.5 },
  { id: 'rapid',     cat: 'weapon',  name: '[[ПУЛЕМЁТ-ПИПИС]]',  desc: 'Ещё быстрее стрельба (+8% темпа)',               cost: 230, max: 4, col: '#ff5fb0', stat: 'rate', amt: 0.08 },
  { id: 'heavy',     cat: 'weapon',  name: '[[ТЯЖЁЛЫЙ КАЛИБР]]', desc: 'Ещё урон (+8%)',                                 cost: 210, max: 4, col: '#ffd21e', stat: 'dmg', amt: 0.08 },
  { id: 'piercing',  cat: 'weapon',  name: '[[БРОНЕБОЙ]]',       desc: 'Пули прошивают ещё +1 цель',                     cost: 240, max: 2, col: '#8fe0ff', stat: 'pierce', amt: 1 },
  { id: 'bouncy',    cat: 'weapon',  name: '[[ПРЫГ-СКОК]]',      desc: 'Отскоки +1',                                     cost: 200, max: 2, col: '#8fe0ff', stat: 'bounce', amt: 1 },

  /* ================= ЗАЩИТА / УТИЛИТА ================= */
  { id: 'shield',    cat: 'support', name: "LIGHTNER'S SHIELD", desc: 'Защитный бафф: поглощает 150 урона, восстанавливается', cost: 100, max: 1, col: '#4ad6ff', special: 'shield' },
  { id: 'revivemint',cat: 'support', name: 'REVIVEMINT',        desc: 'Воскреснуть после смерти один раз с 50% HP',     cost: 200, max: 1, col: '#57d16a', special: 'revive' },
  { id: 'mantle',    cat: 'support', name: 'THE MANTLE',         desc: 'Рывок и круговая атака при рывке',               cost: 400, max: 1, col: '#b98cff', special: 'mantle' },
  { id: 'heart',     cat: 'support', name: 'HEART SHAPED OBJECT',desc: '+25 к максимальному здоровью',                  cost: 150, max: 5, col: '#e05141', stat: 'hp', amt: 25 },
  { id: 'copycat',   cat: 'support', name: 'COPYCAT',           desc: 'Копирует эффект другого купленного предмета',    cost: 300, max: 1, col: '#c98a3a', special: 'copycat' },
  { id: 'keygen',    cat: 'support', name: 'KEYGEN',             desc: 'Взлом: +1 пипис за выстрел',                     cost: 300, max: 1, col: '#39d94a', stat: 'extra', amt: 1 },
  { id: 'breakpoint',cat: 'support', name: 'BREAKPOINT',         desc: 'Точка останова: +40% урона по боссам',           cost: 300, max: 1, col: '#ff5a1a', stat: 'dmgBoss', amt: 0.40 },
  { id: 'armor',     cat: 'support', name: '[[БРОНЯ]]',          desc: '+25 брони в начале волны',                       cost: 180, max: 4, col: '#4ad6ff', stat: 'armor', amt: 25 },
  { id: 'regen',     cat: 'support', name: '[[РЕГЕНЕРАЦИЯ]]',   desc: '+1 HP/сек',                                      cost: 260, max: 3, col: '#57d16a', stat: 'regen', amt: 1 },
  { id: 'speedmove', cat: 'support', name: '[[БЫСТРЫЕ НОГИ]]',   desc: 'Бег быстрее (+8%)',                              cost: 200, max: 4, col: '#4ad6ff', stat: 'moveSpeed', amt: 0.08 },
  { id: 'magnet',    cat: 'support', name: '[[МАГНИТ КРОМЕРА]]', desc: 'Радиус сбора монет +1.5 м',                      cost: 120, max: 3, col: '#ffd21e', stat: 'magnet', amt: 1.5 },
  { id: 'kromer',    cat: 'support', name: '[[ДВОЙНОЙ КРОМЕР]]', desc: '+50% кромера за убийства',                      cost: 300, max: 2, col: '#39d94a', stat: 'kromer', amt: 0.50 },
  { id: 'vitality',  cat: 'support', name: '[[ЖИВУЧЕСТЬ]]',     desc: '+50 к максимальному здоровью',                  cost: 220, max: 3, col: '#e05141', stat: 'hp', amt: 50 },
  { id: 'evasion',   cat: 'support', name: '[[УКЛОНЕНИЕ]]',     desc: 'Шанс полностью избежать урона',                 cost: 340, max: 3, col: '#8fe0ff', stat: 'evade', amt: 0.06 },
  { id: 'thorns',    cat: 'support', name: '[[ШИПЫ ОТПОРА]]',   desc: 'Отражает урон обратно в атакующего',            cost: 320, max: 3, col: '#8a5cff', stat: 'thorns', amt: 0.35 },
  { id: 'vamparmor', cat: 'support', name: '[[БРОНЯ ВАМПИРА]]', desc: '+8 брони за каждое убийство',                    cost: 280, max: 2, col: '#4ad6ff', stat: 'armorKill', amt: 8 },
  { id: 'laststand', cat: 'support', name: '[[ПОСЛЕДНИЙ ШАНС]]', desc: 'При HP < 25% урон +30%',                         cost: 350, max: 1, col: '#ff5a1a', stat: 'enraged', amt: 0.30 },
  { id: 'shieldgen', cat: 'support', name: '[[ЩИТ-ГЕНЕРАТОР]]', desc: 'Щит восстанавливается быстрее',                  cost: 240, max: 2, col: '#4ad6ff', stat: 'shieldRegen', amt: 1 },

  /* ================= СПАВН (КОМПАНЬОНЫ) ================= */
  { id: 'maw',       cat: 'spawn',   name: 'MAW SPAWN',      desc: 'Компаньон: кусает врагов рядом',      cost: 20,  max: 3, col: '#c24bff', familiar: 'maw',      famDmg: 18, famCd: 0.7, famR: 2.2 },
  { id: 'worm',      cat: 'spawn',   name: 'WORM SPAWN',     desc: 'Компаньон: червь, бьёт врагов',        cost: 30,  max: 3, col: '#e07a3a', familiar: 'worm',     famDmg: 22, famCd: 0.6, famR: 2.4 },
  { id: 'strider',   cat: 'spawn',   name: 'STRIDER SPAWN',  desc: 'Компаньон: длинноногий охотник',       cost: 30,  max: 3, col: '#39d94a', familiar: 'strider',  famDmg: 26, famCd: 0.65, famR: 2.6 },
  { id: 'fetus',     cat: 'spawn',   name: 'FETUS SPAWN',    desc: 'Компаньон: крепкий помощник',          cost: 40,  max: 3, col: '#ff5fb0', familiar: 'fetus',    famDmg: 30, famCd: 0.75, famR: 2.8 },
  { id: 'seahorse',  cat: 'spawn',   name: 'SEAHORSE SPAWN', desc: 'Компаньон: стреляет рядом',            cost: 40,  max: 3, col: '#4ad6ff', familiar: 'seahorse', famDmg: 24, famCd: 0.5, famR: 4.2 },
  { id: 'pipisbuddy',cat: 'spawn',   name: 'PIPIS BUDDY',    desc: 'Компаньон: мини-пипис, бьёт врагов',   cost: 60,  max: 3, col: '#39d94a', familiar: 'pipis',    famDmg: 34, famCd: 0.55, famR: 3.0 },
  { id: 'poppup',    cat: 'spawn',   name: 'POPPUP',         desc: 'Компаньон: взрывается по врагам',      cost: 70,  max: 3, col: '#ff7a1e', familiar: 'poppup',   famDmg: 40, famCd: 0.9, famR: 3.0 },
  { id: 'rudinn',    cat: 'spawn',   name: 'RUDINN',         desc: 'Компаньон: бьёт копьём',               cost: 80,  max: 3, col: '#8fe0ff', familiar: 'rudinn',   famDmg: 38, famCd: 0.7, famR: 3.2 },
  { id: 'hathy',     cat: 'spawn',   name: 'HATHY',          desc: 'Компаньон: больно кусает',             cost: 85,  max: 3, col: '#e05141', familiar: 'hathy',    famDmg: 42, famCd: 0.8, famR: 3.0 },
  { id: 'tasque',    cat: 'spawn',   name: 'TASQUE',         desc: 'Компаньон: быстрый кот-воин',          cost: 90,  max: 3, col: '#ffd21e', familiar: 'tasque',   famDmg: 30, famCd: 0.4, famR: 3.0 },
  { id: 'spamtonbuddy',cat:'spawn',  name: 'SPAMTON BUDDY',  desc: 'Компаньон: сам Спамтон помогает',      cost: 120, max: 2, col: '#ff5fb0', familiar: 'spamton',  famDmg: 55, famCd: 0.5, famR: 3.4 },
  { id: 'bigbuddy',  cat: 'spawn',   name: 'BIG BUDDY',      desc: 'Компаньон: крупный и мощный',          cost: 300, max: 2, col: '#ffd21e', familiar: 'big',      famDmg: 90, famCd: 0.6, famR: 3.6 },
  { id: 'queenbuddy',cat: 'spawn',   name: 'MINI QUEEN',     desc: 'Компаньон: королевская поддержка',    cost: 500, max: 1, col: '#c24bff', familiar: 'queen',    famDmg: 120, famCd: 0.5, famR: 4.0 },
  { id: 'jevilbuddy',cat: 'spawn',   name: 'JEVIL BUDDY',     desc: 'Компаньон: хаос-спутник, бьёт сильно', cost: 800, max: 1, col: '#8a5cff', familiar: 'jevil',    famDmg: 200, famCd: 0.45, famR: 4.4 }
];

/* быстрый доступ по id */
const KROMER_BY_ID = {};
KROMER_ITEMS.forEach(it => { KROMER_BY_ID[it.id] = it; });

/* Состояние на текущий забег (сбрасывается при старте новой игры) */
const KromerState = {
  active: false,
  kromer: 0,
  owned: {},        // id -> количество уровней
  total: 0,
  shield: 0,        // текущий запас щита Lightner's Shield
  reviveUsed: false
};

function kromerCount(id) { return KromerState.owned[id] || 0; }
function kromerLevel(id) { return KromerState.owned[id] || 0; }
function kromerReset() {
  KromerState.active = false;
  KromerState.kromer = 0;
  KromerState.owned = {};
  KromerState.total = 0;
  KromerState.shield = 0;
  KromerState.reviveUsed = false;
  if (typeof _kromerInvalidateStats === 'function') _kromerInvalidateStats();
}

/* Цена следующего уровня предмета (растёт с уровнем) */
function kromerCost(it) { return Math.round(it.cost * (kromerCount(it.id) + 1)); }

/* Суммарный аддитивный бонус по ключу `stat` среди всех купленных предметов.
   ОПТИМИЗАЦИЯ: результат кэшируется и пересчитывается только при изменении
   набора предметов (покупка/сброс) — раньше перебирались все 58 предметов
   на каждый вызов, а он бывает по нескольку раз за кадр. */
const _kromerStatCache = {};
function _kromerInvalidateStats() { for (const k in _kromerStatCache) delete _kromerStatCache[k]; }

function kromerStat(key) {
  if (!KromerState.active) return 0;
  let s = _kromerStatCache[key];
  if (s === undefined) {
    s = 0;
    for (let i = 0; i < KROMER_ITEMS.length; i++) {
      const it = KROMER_ITEMS[i];
      const n = KromerState.owned[it.id] || 0;
      if (n && it.stat === key) s += it.amt * n;
    }
    _kromerStatCache[key] = s;
  }
  /* последний шанс: при низком HP урон выше (динамическая часть, не кэшируем) */
  if (key === 'dmg' && KromerState.owned.laststand) {
    const p = (typeof Game !== 'undefined') ? Game.player : null;
    if (p && p.maxHealth && p.health / p.maxHealth < 0.25) s += 0.30;
  }
  return s;
}

/* множители для боевой логики (12-game.js) */
function KromerMul(key) {
  if (!KromerState.active) return 1;
  switch (key) {
    case 'dmg':     return 1 + kromerStat('dmg');
    case 'rate':    return 1 / (1 + Math.max(0, kromerStat('rate')));   // множитель кулдауна
    case 'extra':   return kromerStat('extra');                         // доп. пиписы
    case 'size':    return 1 + kromerStat('size');
    case 'pierce':  return kromerStat('pierce');
    case 'bounce':  return kromerStat('bounce');
    case 'kromer':  return 1 + kromerStat('kromer');
    case 'speed':   return 1 + kromerStat('speed');
    case 'spread':  return Math.max(.15, 1 + kromerStat('spread'));
    case 'splash':  return 1 + kromerStat('splash');
    case 'splashDmg': return 1 + kromerStat('splashDmg');
    case 'moveSpeed': return 1 + kromerStat('moveSpeed');
    case 'magnet':  return kromerStat('magnet');
    case 'dmgBoss': return 1 + kromerStat('dmgBoss');
    case 'bouncyLife': return kromerStat('bouncyLife');
    default: return 1;
  }
}
function kromerHoming() { return KromerState.active && kromerCount('homing') > 0; }
function kromerCritChance() { return KromerState.active ? kromerStat('crit') : 0; }
function kromerExtraShots() { return KromerState.active ? Math.round(kromerStat('shots')) : 0; }
function kromerLifesteal() { return KromerState.active ? kromerStat('lifesteal') : 0; }
function kromerEvade() { return KromerState.active ? kromerStat('evade') : 0; }
function kromerThorns() { return KromerState.active ? kromerStat('thorns') : 0; }
function kromerRegen() { return KromerState.active ? kromerStat('regen') : 0; }

/* кромер, выпадающий за убийство (учитывает множитель) */
function kromerPerKill(z) {
  const base = (z.isBoss ? 60 : z.isMiniBoss ? 25 : 4) + (Math.random() * 4 | 0);
  return Math.max(1, Math.round(base * KromerMul('kromer')));
}

/* ---------- сбор монеток-кромеров ----------
   ОПТИМИЗАЦИЯ: у каждой монеты была своя PointLight + геометрии/материалы —
   при десятках монет это убивало FPS на телефоне. Теперь:
     • ОБЩИЕ геометрия и материал (создаются один раз);
     • пул мешей (переиспользуем, а не создаём/уничтожаем);
     • НИ ОДНОГО источника света на монету (яркий unlit-материал и так светится);
     • жёсткий лимит числа монет (старые исчезают);
     • магнит и расстояния считаются по квадрату (без Math.hypot). */
const KROMER_COIN_CAP = 48;          // максимум монет на сцене
let _kromerCoinGeo = null, _kromerCoinMat = null, _kromerCoinInnerGeo = null, _kromerCoinInnerMat = null;
let _kromerCoinPool = [];            // переиспользуемые группы

function _kromerCoinAssets() {
  if (_kromerCoinGeo) return;
  _kromerCoinGeo = new THREE.CylinderGeometry(.16, .16, .04, 10);
  _kromerCoinMat = new THREE.MeshBasicMaterial({ color: 0xffd21e });
  _kromerCoinInnerGeo = new THREE.BoxGeometry(.10, .10, .03);
  _kromerCoinInnerMat = new THREE.MeshBasicMaterial({ color: 0x1a2a10 });
}

function kromerSpawnCoin(scene, x, y, z) {
  _kromerCoinAssets();
  let g = _kromerCoinPool.pop();
  if (!g) {
    g = new THREE.Group();
    const coin = new THREE.Mesh(_kromerCoinGeo, _kromerCoinMat);
    coin.rotation.x = Math.PI / 2;
    g.add(coin);
    const inner = new THREE.Mesh(_kromerCoinInnerGeo, _kromerCoinInnerMat);
    inner.position.z = .03; g.add(inner);
  }
  g.position.set(x, y + .5, z);
  scene.add(g);
  return { mesh: g, x, y, z, t: 0, life: 22 };
}

/* вернуть меш монеты в пул (вместо уничтожения) */
function _kromerRecycleCoin(game, c) {
  if (c.mesh && c.mesh.parent) c.mesh.parent.remove(c.mesh);
  if (_kromerCoinPool.length < KROMER_COIN_CAP + 8) _kromerCoinPool.push(c.mesh);
}

/* ============================================================
   ПАССИВНЫЕ ЭФФЕКТЫ: HP, броня, мантия — применяются к игроку
   при покупке и в начале каждой волны (чтобы не терялись).
   ============================================================ */
function kromerBaseMaxHP() {
  /* сколько прибавки к максимуму дают предметы стата hp */
  return Math.max(0, Math.round(kromerStat('hp')));
}
function kromerApplyPassive(game) {
  const p = game && game.player;
  if (!p || !KromerState.active) return;
  const base = (game.matchHP || 100);
  const want = base + kromerBaseMaxHP();
  if (p.maxHealth !== want) {
    const diff = want - p.maxHealth;
    p.maxHealth = want;
    p.health = Math.min(want, p.health + Math.max(0, diff));
  }
  /* мантия даёт рывок вне меха */
  if (kromerCount('mantle') > 0 && p.perkDash === false) p.perkDash = true;
  /* броня в начале волны */
  const ap = Math.round(kromerStat('armor'));
  if (ap > 0 && p.armor < ap) {
    p.armor = Math.min(p.armorMax || 100, p.armor + ap);
  }
  /* щит Лайтнера: заряжаем до максимума */
  if (kromerCount('shield') > 0 && KromerState.shield <= 0) KromerState.shield = 150;
}

/* ============================================================
   МАГАЗИН
   ============================================================ */
/* Подбор ассортимента: до 4 позиций. Сначала доступные по карману,
   затем — если мест не хватает — дорогие (серые, для ознакомления). */
function kromerPickOffers() {
  const pool = KROMER_ITEMS.filter(it => kromerCount(it.id) < it.max);
  const afford = pool.filter(it => kromerCost(it) <= KromerState.kromer);
  const offers = [];
  const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; const t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; };
  shuffle(afford);
  for (let i = 0; i < afford.length && offers.length < 4; i++) offers.push(afford[i]);
  if (offers.length < 4) {
    const rest = shuffle(pool.filter(it => offers.indexOf(it) < 0));
    for (let i = 0; i < rest.length && offers.length < 4; i++) offers.push(rest[i]);
  }
  return offers;
}

function kromerOpenShop(game) {
  KromerState.active = true;
  const offers = kromerPickOffers();
  const grid = UI.el.kromGrid;
  if (grid) {
    grid.innerHTML = '';
    if (!offers.length) {
      const d = document.createElement('div');
      d.className = 'krom-empty';
      d.textContent = '[[ВСЁ РАСПРОДАНО!]] — предметы закончились.';
      grid.appendChild(d);
    }
    offers.forEach(it => {
      const lvl = kromerCount(it.id);
      const cost = kromerCost(it);
      const maxed = lvl >= it.max;
      const canBuy = !maxed && KromerState.kromer >= cost;
      const card = document.createElement('button');
      card.className = 'kromcard' + (maxed ? ' maxed' : canBuy ? '' : ' cant');
      card.style.setProperty('--kc', it.col);
      const catName = it.cat === 'spawn' ? 'СПАВН' : it.cat === 'support' ? 'ЗАЩИТА' : 'ОРУЖИЕ';
      card.innerHTML =
        '<span class="kcat">' + catName + '</span>' +
        '<b>' + U.esc(it.name) + '</b>' +
        '<i>' + U.esc(it.desc) + '</i>' +
        '<span class="klvl">' + (maxed ? 'МАКС' : (it.max > 1 ? 'УР. ' + lvl + '/' + it.max : '')) + '</span>' +
        '<span class="kprice">' + (maxed ? '[[ПРОДАНО]]' : '<span class="kcoin">' + cost + '</span> KROMER') + '</span>';
      card.addEventListener('click', () => kromerBuy(game, it.id));
      grid.appendChild(card);
    });
  }
  if (UI.el.kromAmount) UI.el.kromAmount.textContent = KromerState.kromer;
  UI.show('kromer');
  Audio3D_SFX.uiClick();
}

function kromerBuy(game, id) {
  const it = KROMER_BY_ID[id];
  if (!it) return;
  if (kromerCount(id) >= it.max) { Audio3D_SFX.deny(); return; }
  const cost = kromerCost(it);
  if (KromerState.kromer < cost) { Audio3D_SFX.deny(); UI.toast('Мало КРОМЕРА — нужно ' + cost); return; }
  KromerState.kromer -= cost;

  if (it.special === 'copycat') {
    /* COPYCAT: дублирует случайный уже купленный предмет; если ничего нет —
       копирует Heart Shaped Object, как и было задумано. */
    const owned = KROMER_ITEMS.filter(x => x.id !== 'copycat' && kromerCount(x.id) > 0 && kromerCount(x.id) < x.max);
    const pick = owned.length ? owned[Math.random() * owned.length | 0] : (KROMER_BY_ID.heart || null);
    if (pick) {
      KromerState.owned[pick.id] = kromerCount(pick.id) + 1;
      UI.toast('[[COPYCAT]] скопировал: ' + pick.name, it.col);
    }
    KromerState.owned.copycat = 1;
  } else {
    KromerState.owned[id] = kromerCount(id) + 1;
  }
  KromerState.total++;

  if (it.special === 'shield') KromerState.shield = 150;
  if (typeof _kromerInvalidateStats === 'function') _kromerInvalidateStats();
  kromerApplyPassive(game);
  Audio3D_SFX.buy();
  UI.toast('[[КУПЛЕНО!]] ' + it.name, it.col);
  kromerOpenShop(game);                 // перерисовка
  if (typeof kromerSyncFamiliars === 'function') kromerSyncFamiliars(game);
}

/* ============================================================
   ЩИТ / ВОСКРЕШЕНИЕ / ОТПОР — вызывается из 12-game.js
   ============================================================ */
/* Поглотить щитом часть урона. Возвращает остаток урона. */
function kromerAbsorbShield(dmg) {
  if (!KromerState.active || KromerState.shield <= 0) return dmg;
  const g = Math.min(KromerState.shield, dmg);
  KromerState.shield -= g;
  return dmg - g;
}
/* Попытка воскреснуть (Revivemint). true — игрок ожил. */
function kromerTryRevive(game) {
  if (!KromerState.active) return false;
  if (kromerCount('revivemint') <= 0 || KromerState.reviveUsed) return false;
  KromerState.reviveUsed = true;
  const p = game.player;
  p.alive = true;
  p.health = Math.max(1, Math.round((p.maxHealth || 100) * 0.5));
  p.armor = 0;
  UI.center('REVIVEMINT!', 'Вы воскресли · 50% HP', 2.4);
  UI.toast('[[REVIVEMINT]] вернул вас в бой!', '#57d16a');
  Audio3D_SFX.pickup();
  return true;
}

/* ============================================================
   КОМПАНЬОНЫ (ФАМИЛЬЯРЫ): кружат вокруг игрока и бьют врагов
   ============================================================ */
function kromerFamiliarsWanted() {
  const want = [];
  for (const it of KROMER_ITEMS) {
    if (it.cat !== 'spawn' && it.special !== 'scarf') continue;
    const n = kromerCount(it.id);
    for (let i = 0; i < n; i++) want.push(it);
  }
  /* ограничение по производительности (телефоны): не больше 12 спутников */
  return want.slice(0, 12);
}

function kromerMakeFamiliarMesh(game, def) {
  const col = new THREE.Color(def.col || '#ff5fb0');
  const g = new THREE.Group();
  const big = (def.familiar === 'big' || def.familiar === 'queen' || def.familiar === 'jevil');
  const r = big ? .42 : .26;
  const body = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8),
    new THREE.MeshLambertMaterial({ color: col }));
  g.add(body);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
  const eye = new THREE.Mesh(new THREE.SphereGeometry(r * .26, 6, 6), eyeMat);
  eye.position.set(r * .45, r * .22, -r * .8); g.add(eye);
  /* маленькая «шляпа»/антенна — чтобы силуэт отличался */
  const spike = new THREE.Mesh(new THREE.ConeGeometry(r * .3, r * .9, 6),
    new THREE.MeshLambertMaterial({ color: col }));
  spike.position.y = r * 1.05; g.add(spike);
  game.scene.add(g);
  return g;
}

function kromerSyncFamiliars(game) {
  const p = game && game.player;
  if (!p) return;
  if (!game.kromerFam) game.kromerFam = [];
  const want = KromerState.active ? kromerFamiliarsWanted() : [];
  const list = game.kromerFam;
  /* убрать лишних */
  while (list.length > want.length) {
    const f = list.pop();
    if (f.mesh && f.mesh.parent) f.mesh.parent.remove(f.mesh);
  }
  /* создать недостающих */
  for (let i = 0; i < want.length; i++) {
    if (!list[i]) {
      list[i] = { mesh: kromerMakeFamiliarMesh(game, want[i]), def: want[i], idx: i, ang: Math.random() * Math.PI * 2, cool: 0 };
    }
    list[i].def = want[i];
    list[i].idx = i;
  }
}

function kromerUpdateFamiliars(game, dt) {
  const p = game && game.player;
  if (!p) return;
  kromerSyncFamiliars(game);
  const list = game.kromerFam || [];
  const ring = 2.1;
  for (let i = 0; i < list.length; i++) {
    const f = list[i];
    const def = f.def || {};
    f.ang += dt * (0.9 + i * 0.05) * (i % 2 ? -1 : 1);
    const rad = ring + (i % 3) * 0.4;
    const tx = p.pos.x + Math.cos(f.ang) * rad;
    const tz = p.pos.z + Math.sin(f.ang) * rad;
    const ty = p.pos.y + 1.15 + Math.sin(U.now() * 0.003 + i) * 0.16;
    f.mesh.position.set(tx, ty, tz);
    f.mesh.rotation.y = -f.ang;
    f.cool -= dt;
    if (f.cool > 0) continue;
    /* атака: ближайший зомби в радиусе действия компаньона */
    if (!game.horde) continue;
    const reach = (def.famR || 2.6) * (def.familiar === 'seahorse' ? 1.6 : 1);
    const r2 = reach * reach;
    let best = null, bd = r2;
    for (const z of game.horde.list) {
      if (!z.alive || z.dying) continue;
      const dx = z.pos.x - tx, dy = (z.pos.y + .8) - ty, dz = z.pos.z - tz;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < bd) { bd = d2; best = z; }
    }
    if (best) {
      const dmg = (def.famDmg || 24) * (1 + kromerStat('dmg') * 0.5);
      best.takeDamage(dmg, 'body', { x: 0, y: 0, z: 0 });
      if (p) p.damageDealt += dmg;
      f.cool = def.famCd || 0.6;
      if (game.effects) game.effects.particle(tx, ty, tz, 0, 1.5, 0, .14, 'vspark', .3);
      Audio3D_SFX.hit && Audio3D_SFX.hit();
    }
  }
}

function kromerClearFamiliars(game) {
  if (!game || !game.kromerFam) return;
  for (const f of game.kromerFam) { if (f.mesh && f.mesh.parent) f.mesh.parent.remove(f.mesh); }
  game.kromerFam.length = 0;
}

/* ---------- тик: монетки падают/собираются + фамильяры + регенерация ---------- */
function kromerUpdate(game, dt) {
  const p = game.player;
  if (!p) return;
  if (!game.kromerCoins) game.kromerCoins = [];
  const list = game.kromerCoins;
  /* магнит: базовый радиус + бонус от улучшений */
  const magnetR = 6 + (KromerState.active ? KromerMul('magnet') : 0);
  const magnetR2 = magnetR * magnetR;
  const collectR2 = 1.4 * 1.4;
  /* ОГРАНИЧЕНИЕ: если монет слишком много — старые исчезают (пул, без утечек) */
  while (list.length > KROMER_COIN_CAP) { _kromerRecycleCoin(game, list[0]); list.shift(); }
  for (let i = list.length - 1; i >= 0; i--) {
    const c = list[i];
    c.t += dt; c.life -= dt;
    c.mesh.rotation.y += dt * 4;
    c.mesh.position.y = c.y + .5 + Math.sin(c.t * 3) * .12;
    const dx = p.pos.x - c.x, dz = p.pos.z - c.z;
    const d2 = dx * dx + dz * dz;
    /* магнит: подтягивается к игроку, когда рядом (по квадрату расстояния) */
    if (d2 < magnetR2 && d2 > .16) {
      const d = Math.sqrt(d2);
      const pull = Math.min(16, 8 + (magnetR - d) * 3) * dt;
      c.x += (dx / d) * pull;
      c.z += (dz / d) * pull;
      c.mesh.position.x = c.x; c.mesh.position.z = c.z;
    }
    if (d2 <= collectR2) {
      KromerState.kromer += c.kromer || 1;
      Audio3D_SFX.pickup && Audio3D_SFX.pickup();
      if (game.effects && list.length < 24) game.effects.particle(c.x, c.y + .5, c.z, 0, 2, 0, .18, 'vspark', .3);
      _kromerRecycleCoin(game, c);
      list.splice(i, 1);
      continue;
    }
    if (c.life <= 0) {
      _kromerRecycleCoin(game, c);
      list.splice(i, 1);
    }
  }

  if (!KromerState.active) { kromerClearFamiliars(game); return; }
  /* фамильяры и пассивки обновляем реже (раз в ~3 кадра) — дешевле, заметно не глазами */
  game._kromerSlowT = (game._kromerSlowT || 0) + dt;
  if (game._kromerSlowT >= .05) {
    game._kromerSlowT = 0;
    /* компаньоны */
    kromerUpdateFamiliars(game, .05);
  }
  /* восстановление щита Lightner's Shield */
  if (kromerCount('shield') > 0) {
    const regen = 12 + kromerStat('shieldRegen') * 18;   // ед./сек
    if (KromerState.shield < 150) KromerState.shield = Math.min(150, KromerState.shield + regen * dt);
  }
  /* регенерация здоровья */
  const rg = kromerRegen();
  if (rg > 0 && p.alive && p.health < p.maxHealth) {
    p.health = Math.min(p.maxHealth, p.health + rg * dt);
  }
}

/* сброс монеток со сцены (при выходе в меню) */
function kromerClearCoins(game) {
  if (!game.kromerCoins) { game.kromerCoins = []; return; }
  for (const c of game.kromerCoins) { if (c.mesh && c.mesh.parent) c.mesh.parent.remove(c.mesh); }
  game.kromerCoins.length = 0;
}
