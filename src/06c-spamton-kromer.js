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
  /* atk: 'bite' — кусает вблизи · 'melee' — удар вблизи · 'spear' — колющий удар
     (дальше) · 'shoot' — стреляет снарядом · 'pipis' — кидает пипис ·
     'boom' — взрывается по площади · 'chaos' — хаос-атака · 'spamton' — выстрел. */
  { id: 'maw',       cat: 'spawn',   name: 'MAW SPAWN',      desc: 'Компаньон: кусает врагов рядом',      cost: 20,  max: 3, col: '#c24bff', familiar: 'maw',      atk: 'bite',  famDmg: 18, famCd: 0.7, famR: 3.3 },
  { id: 'worm',      cat: 'spawn',   name: 'WORM SPAWN',     desc: 'Компаньон: червь, бьёт врагов',        cost: 30,  max: 3, col: '#e07a3a', familiar: 'worm',     atk: 'melee', famDmg: 22, famCd: 0.6, famR: 3.4 },
  { id: 'strider',   cat: 'spawn',   name: 'STRIDER SPAWN',  desc: 'Компаньон: длинноногий охотник',       cost: 30,  max: 3, col: '#39d94a', familiar: 'strider',  atk: 'melee', famDmg: 26, famCd: 0.65, famR: 3.6 },
  { id: 'fetus',     cat: 'spawn',   name: 'FETUS SPAWN',    desc: 'Компаньон: крепкий помощник',          cost: 40,  max: 3, col: '#ff5fb0', familiar: 'fetus',    atk: 'melee', famDmg: 30, famCd: 0.75, famR: 3.4 },
  { id: 'seahorse',  cat: 'spawn',   name: 'SEAHORSE SPAWN', desc: 'Компаньон: стреляет рядом',            cost: 40,  max: 3, col: '#4ad6ff', familiar: 'seahorse', atk: 'shoot', famDmg: 24, famCd: 0.5, famR: 4.6 },
  { id: 'pipisbuddy',cat: 'spawn',   name: 'PIPIS BUDDY',    desc: 'Компаньон: мини-пипис, бьёт врагов',   cost: 60,  max: 3, col: '#39d94a', familiar: 'pipis',    atk: 'pipis', famDmg: 34, famCd: 0.55, famR: 4.2 },
  { id: 'poppup',    cat: 'spawn',   name: 'POPPUP',         desc: 'Компаньон: взрывается по врагам',      cost: 70,  max: 3, col: '#ff7a1e', familiar: 'poppup',   atk: 'boom',  famDmg: 40, famCd: 0.9, famR: 3.4 },
  { id: 'rudinn',    cat: 'spawn',   name: 'RUDINN',         desc: 'Компаньон: бьёт копьём',               cost: 80,  max: 3, col: '#8fe0ff', familiar: 'rudinn',   atk: 'spear', famDmg: 38, famCd: 0.7, famR: 4.2 },
  { id: 'hathy',     cat: 'spawn',   name: 'HATHY',          desc: 'Компаньон: больно кусает',             cost: 85,  max: 3, col: '#e05141', familiar: 'hathy',    atk: 'bite',  famDmg: 42, famCd: 0.8, famR: 3.3 },
  { id: 'tasque',    cat: 'spawn',   name: 'TASQUE',         desc: 'Компаньон: быстрый кот-воин',          cost: 90,  max: 3, col: '#ffd21e', familiar: 'tasque',   atk: 'melee', famDmg: 30, famCd: 0.4, famR: 3.4 },
  { id: 'spamtonbuddy',cat:'spawn',  name: 'SPAMTON BUDDY',  desc: 'Компаньон: сам Спамтон помогает',      cost: 120, max: 2, col: '#ff5fb0', familiar: 'spamton',  atk: 'spamton', famDmg: 55, famCd: 0.5, famR: 4.6 },
  { id: 'bigbuddy',  cat: 'spawn',   name: 'BIG BUDDY',      desc: 'Компаньон: крупный и мощный',          cost: 300, max: 2, col: '#ffd21e', familiar: 'big',      atk: 'melee', famDmg: 90, famCd: 0.6, famR: 4.0 },
  { id: 'queenbuddy',cat: 'spawn',   name: 'MINI QUEEN',     desc: 'Компаньон: королевская поддержка',    cost: 500, max: 1, col: '#c24bff', familiar: 'queen',    atk: 'shoot', famDmg: 120, famCd: 0.5, famR: 5.2 },
  { id: 'jevilbuddy',cat: 'spawn',   name: 'JEVIL BUDDY',     desc: 'Компаньон: хаос-спутник, бьёт сильно', cost: 800, max: 1, col: '#8a5cff', familiar: 'jevil',    atk: 'chaos', famDmg: 200, famCd: 0.45, famR: 5.2 }
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

/* ============================================================
   КОМПАНЬОНЫ (фамильяры). Раньше все были одинаковыми шариками и
   ДЁРГАЛИСЬ: обновлялись раз в 0.05с и жёстко телепортировались к игроку.
   Теперь: у каждого типа своя модель, а движение — плавное следование
   (lerp к орбитальной точке) каждый кадр + мягкое покачивание.
   ============================================================ */
function _famMat(col, emissive) {
  return new THREE.MeshLambertMaterial({ color: new THREE.Color(col || '#ff5fb0'), emissive: emissive === undefined ? 0x140610 : emissive });
}
function _famGlow(col, op) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(col || '#ff5fb0'), transparent: true, opacity: op === undefined ? .4 : op, blending: THREE.AdditiveBlending, depthWrite: false });
}

function kromerMakeFamiliarMesh(game, def) {
  const col = def.col || '#ff5fb0';
  const C = new THREE.Color(col).getHex();
  const g = new THREE.Group();
  const kind = def.familiar || 'maw';
  const big = (kind === 'big' || kind === 'queen' || kind === 'jevil');
  const r = big ? .40 : .26;
  const body = _famMat(C);
  const dark = _famMat(new THREE.Color(C).multiplyScalar(.45).getHex());
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
  const eyeWhite = _famGlow(0xffffff, .9);

  const addEye = (ox, oy, oz, sz) => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(sz || r * .24, 8, 6), eyeMat);
    e.position.set(ox, oy, oz); g.add(e);
    const gl = new THREE.Mesh(new THREE.SphereGeometry((sz || r * .24) * .5, 6, 5), eyeWhite);
    gl.position.set(ox + .01, oy + .01, oz - .01); g.add(gl);
  };

  switch (kind) {
    case 'maw': {
      /* МАУ — зубастая пасть с двумя глазами */
      const jaw = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 9), body);
      jaw.scale.set(1.2, .9, 1.1); g.add(jaw);
      const mouth = new THREE.Mesh(new THREE.SphereGeometry(r * .7, 10, 8), _famMat(0x2a0410));
      mouth.scale.set(1, .5, .8); mouth.position.set(0, -r * .2, -r * .55); g.add(mouth);
      // зубы
      const tooth = new THREE.MeshLambertMaterial({ color: 0xffffff });
      for (let i = -1; i <= 1; i++) {
        const t = new THREE.Mesh(new THREE.ConeGeometry(r * .12, r * .28, 5), tooth);
        t.position.set(i * r * .35, -r * .1, -r * .8); t.rotation.x = Math.PI; g.add(t);
      }
      addEye(-r * .35, r * .25, -r * .55, r * .2); addEye(r * .35, r * .25, -r * .55, r * .2);
      break;
    }
    case 'worm': {
      /* ЧЕРВЬ — сегментированное тело */
      for (let i = 0; i < 4; i++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(r * (1 - i * .13), 9, 7), i % 2 ? body : dark);
        s.position.set(0, Math.sin(i) * r * .18, i * r * .35);
        g.add(s);
      }
      const head = new THREE.Mesh(new THREE.SphereGeometry(r * .85, 10, 8), body);
      head.position.z = -r * .35; g.add(head);
      addEye(-r * .25, r * .15, -r * .75, r * .17); addEye(r * .25, r * .15, -r * .75, r * .17);
      break;
    }
    case 'strider': {
      /* СТРАЙДЕР — длинные ноги и вытянутая голова */
      const torso = new THREE.Mesh(new THREE.SphereGeometry(r * .8, 10, 8), body);
      torso.scale.set(1, .8, 1.4); g.add(torso);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(r * .22, r * .3, r * 1.1), dark);
      neck.position.set(0, r * .3, -r * .7); neck.rotation.x = Math.PI / 2.4; g.add(neck);
      const head = new THREE.Mesh(new THREE.SphereGeometry(r * .5, 9, 7), body);
      head.position.set(0, r * .4, -r * 1.1); g.add(head);
      addEye(-r * .18, r * .45, -r * 1.35, r * .13); addEye(r * .18, r * .45, -r * 1.35, r * .13);
      const leg = new THREE.MeshLambertMaterial({ color: dark.color.getHex() });
      for (let i = -1; i <= 1; i += 2) for (let j = 0; j < 2; j++) {
        const l = new THREE.Mesh(new THREE.CylinderGeometry(r * .07, r * .05, r * 1.3), leg);
        l.position.set(i * r * .45, -r * .7, (j - .5) * r * .5); g.add(l);
      }
      break;
    }
    case 'fetus': {
      /* ФЕТУС — крупный крепыш с бронёй */
      const b = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 9), body);
      b.scale.set(1.1, 1.05, 1); g.add(b);
      const shell = new THREE.Mesh(new THREE.SphereGeometry(r * .85, 10, 8), _famMat(new THREE.Color(C).multiplyScalar(.6).getHex()));
      shell.scale.set(1.15, .5, 1.15); shell.position.y = r * .5; g.add(shell);
      addEye(-r * .3, r * .1, -r * .85, r * .2); addEye(r * .3, r * .1, -r * .85, r * .2);
      break;
    }
    case 'seahorse': {
      /* МОРСКОЙ КОНЁК — вытянутая мордочка и хвост-спираль */
      const b = new THREE.Mesh(new THREE.SphereGeometry(r * .8, 10, 8), body);
      b.scale.set(.9, 1.2, 1); g.add(b);
      const snout = new THREE.Mesh(new THREE.CylinderGeometry(r * .18, r * .28, r * .9), dark);
      snout.position.set(0, r * .1, -r * .8); snout.rotation.x = Math.PI / 2.2; g.add(snout);
      addEye(-r * .22, r * .3, -r * .6, r * .16); addEye(r * .22, r * .3, -r * .6, r * .16);
      // спиральный хвост
      for (let i = 0; i < 4; i++) {
        const s = new THREE.Mesh(new THREE.TorusGeometry(r * (.3 - i * .05), r * .06, 6, 12, Math.PI), dark);
        s.position.set(0, -r * .6 - i * r * .18, r * .1); s.rotation.y = i * .5; g.add(s);
      }
      break;
    }
    case 'pipis': {
      /* ПИПИС-БАДДИ — маленькое голубое яйцо (канон) */
      const e = new THREE.Mesh(new THREE.SphereGeometry(r * .9, 12, 10), _famMat(0x6fc7e8, 0x0c2a34));
      e.scale.set(1, 1.3, 1); g.add(e);
      const shine = new THREE.Mesh(new THREE.SphereGeometry(r * .22, 8, 6), _famGlow(0xffffff, .6));
      shine.position.set(-r * .25, r * .45, r * .3); g.add(shine);
      addEye(-r * .25, r * .1, -r * .75, r * .15); addEye(r * .25, r * .1, -r * .75, r * .15);
      break;
    }
    case 'poppup': {
      /* ПОППАП — взрывающийся пузырь с искрами */
      const b = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), _famGlow(C, .55));
      g.add(b);
      const core = new THREE.Mesh(new THREE.SphereGeometry(r * .5, 10, 8), _famGlow(0xffffff, .8));
      g.add(core);
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2;
        const s = new THREE.Mesh(new THREE.ConeGeometry(r * .12, r * .3, 5), _famGlow(0xfff2a0, .7));
        s.position.set(Math.cos(a) * r * .9, Math.sin(a) * r * .9, 0); s.rotation.z = a - Math.PI / 2; g.add(s);
      }
      break;
    }
    case 'rudinn': {
      /* РУДИНН — змеелюд с копьём */
      const b = new THREE.Mesh(new THREE.CylinderGeometry(r * .5, r * .38, r * 1.4, 9), body);
      g.add(b);
      const head = new THREE.Mesh(new THREE.SphereGeometry(r * .55, 10, 8), body);
      head.position.y = r * .85; g.add(head);
      addEye(-r * .2, r * .9, -r * .4, r * .14); addEye(r * .2, r * .9, -r * .4, r * .14);
      const spear = new THREE.Mesh(new THREE.CylinderGeometry(r * .05, r * .05, r * 2.2), _famMat(0x8fe0ff));
      spear.position.set(r * .6, 0, -r * .2); spear.rotation.x = Math.PI / 2.6; g.add(spear);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(r * .14, r * .4, 6), _famGlow(0xdfffff, .8));
      tip.position.set(r * .6, r * .5, -r * .9); tip.rotation.x = -Math.PI / 2.6; g.add(tip);
      break;
    }
    case 'hathy': {
      /* ХАТИ — пушистый клубок с ушами */
      const b = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), body);
      b.scale.set(1.1, .95, 1.05); g.add(b);
      for (let i = -1; i <= 1; i += 2) {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(r * .3, r * .7, 5), dark);
        ear.position.set(i * r * .5, r * .8, 0); ear.rotation.z = i * .3; g.add(ear);
      }
      addEye(-r * .32, r * .1, -r * .8, r * .2); addEye(r * .32, r * .1, -r * .8, r * .2);
      break;
    }
    case 'tasque': {
      /* ТАСК — быстрый кот-воин */
      const b = new THREE.Mesh(new THREE.SphereGeometry(r * .9, 11, 9), body);
      b.scale.set(1, .9, 1.2); g.add(b);
      const head = new THREE.Mesh(new THREE.SphereGeometry(r * .6, 10, 8), body);
      head.position.set(0, r * .2, -r * .7); g.add(head);
      for (let i = -1; i <= 1; i += 2) {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(r * .22, r * .5, 4), dark);
        ear.position.set(i * r * .32, r * .65, -r * .7); g.add(ear);
      }
      addEye(-r * .22, r * .25, -r * 1.05, r * .15); addEye(r * .22, r * .25, -r * 1.05, r * .15);
      // хвост
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(r * .06, r * .03, r * 1.3), dark);
      tail.position.set(0, r * .1, r * .9); tail.rotation.x = -Math.PI / 3; g.add(tail);
      break;
    }
    case 'spamton': {
      /* СПАМТОН-БАДДИ — марионетка в очках и с телефоном */
      const b = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 9), _famMat(0xff5fb0, 0x2a0a20));
      b.scale.set(.9, 1.1, .9); g.add(b);
      const head = new THREE.Mesh(new THREE.SphereGeometry(r * .5, 10, 8), _famMat(0xf0f0f0, 0x303030));
      head.position.y = r * .8; g.add(head);
      // очки-«диски»
      const g1 = _famMat(0x0a0a0a);
      for (let i = -1; i <= 1; i += 2) {
        const lens = new THREE.Mesh(new THREE.CylinderGeometry(r * .18, r * .18, r * .06, 10), g1);
        lens.position.set(i * r * .2, r * .85, -r * .38); lens.rotation.x = Math.PI / 2; g.add(lens);
      }
      // телефон
      const phone = new THREE.Mesh(new THREE.BoxGeometry(r * .3, r * .5, r * .05), _famMat(0x1a1a1a));
      phone.position.set(r * .6, r * .1, -r * .2); g.add(phone);
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(r * .24, r * .38), _famGlow(0x39d94a, .8));
      scr.position.set(r * .6, r * .1, -r * .23); g.add(scr);
      break;
    }
    case 'big': {
      /* БИГ-БАДДИ — крупный и мощный */
      const b = new THREE.Mesh(new THREE.SphereGeometry(r, 13, 10), body);
      b.scale.set(1.15, 1.2, 1.1); g.add(b);
      const chest = new THREE.Mesh(new THREE.SphereGeometry(r * .8, 11, 9), _famMat(new THREE.Color(C).multiplyScalar(.65).getHex()));
      chest.scale.set(1.1, .7, 1.05); chest.position.y = r * .3; g.add(chest);
      const horn = new THREE.MeshLambertMaterial({ color: 0xf0e6c0 });
      for (let i = -1; i <= 1; i += 2) {
        const h = new THREE.Mesh(new THREE.ConeGeometry(r * .16, r * .7, 6), horn);
        h.position.set(i * r * .35, r * 1.0, 0); h.rotation.z = i * .3; g.add(h);
      }
      addEye(-r * .32, r * .15, -r * .9, r * .2); addEye(r * .32, r * .15, -r * .9, r * .2);
      break;
    }
    case 'queen': {
      /* MINI QUEEN — корона и мантия */
      const b = new THREE.Mesh(new THREE.SphereGeometry(r, 13, 10), _famMat(0xc24bff, 0x2a0a44));
      b.scale.set(1.05, 1.15, 1); g.add(b);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(r * .55, r * .4, r * .35, 8, 1, true), _famMat(0xffd21e, 0x4a3800));
      crown.position.y = r * 1.05; g.add(crown);
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * Math.PI * 2;
        const p = new THREE.Mesh(new THREE.ConeGeometry(r * .09, r * .35, 4), _famMat(0xffd21e, 0x4a3800));
        p.position.set(Math.cos(a) * r * .48, r * 1.3, Math.sin(a) * r * .48); g.add(p);
      }
      addEye(-r * .3, r * .2, -r * .9, r * .2); addEye(r * .3, r * .2, -r * .9, r * .2);
      break;
    }
    case 'jevil': {
      /* JEVIL — хаос-шут: рога, кривая ухмылка, разный цвет глаз */
      const b = new THREE.Mesh(new THREE.SphereGeometry(r, 13, 10), _famMat(0x8a5cff, 0x1a0a30));
      b.scale.set(1, 1.1, 1); g.add(b);
      const horn = _famMat(0xe0d0ff);
      for (let i = -1; i <= 1; i += 2) {
        const h = new THREE.Mesh(new THREE.TorusGeometry(r * .3, r * .07, 6, 10, Math.PI * 1.4), horn);
        h.position.set(i * r * .4, r * .9, 0); h.rotation.z = i * .5; g.add(h);
      }
      const eL = new THREE.Mesh(new THREE.SphereGeometry(r * .22, 8, 6), _famGlow(0x39d94a, .95));
      eL.position.set(-r * .3, r * .15, -r * .85); g.add(eL);
      const eR = new THREE.Mesh(new THREE.SphereGeometry(r * .22, 8, 6), _famGlow(0xff5fb0, .95));
      eR.position.set(r * .3, r * .15, -r * .85); g.add(eR);
      const smile = new THREE.Mesh(new THREE.TorusGeometry(r * .4, r * .05, 6, 16, Math.PI), _famMat(0xffffff, 0x333333));
      smile.position.set(0, -r * .3, -r * .8); smile.rotation.z = Math.PI; g.add(smile);
      break;
    }
    default: {
      const b = new THREE.Mesh(new THREE.SphereGeometry(r, 11, 9), body);
      g.add(b);
      const spike = new THREE.Mesh(new THREE.ConeGeometry(r * .3, r * .9, 6), dark);
      spike.position.y = r * 1.05; g.add(spike);
      addEye(-r * .3, r * .2, -r * .8, r * .2); addEye(r * .3, r * .2, -r * .8, r * .2);
    }
  }

  /* мягкое свечение-аура под фамильяром (цвет индивидуален) */
  const aura = new THREE.Mesh(new THREE.SphereGeometry(r * 1.5, 10, 8), _famGlow(C, big ? .22 : .16));
  aura.scale.y = .5; aura.position.y = -r * .6; g.add(aura);

  /* сохранённые части для уникальной idle-анимации каждого типа */
  g.userData.kind = kind;
  g.userData.r = r;
  g.userData.anim = g.userData.anim || { t: Math.random() * 6.28 };
  g.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  game.scene.add(g);
  return g;
}

/* анимация компаньона: у каждого типа — свой характер движения */
function kromerAnimateFamiliar(f, dt) {
  const g = f.mesh, kind = g.userData.kind, r = g.userData.r || .26;
  const a = g.userData.anim; a.t += dt;
  const t = a.t;
  switch (kind) {
    case 'maw': /* жуёт пастью — чавканье */
      g.rotation.x = Math.sin(t * 6) * .12;
      g.scale.y = 1 + Math.abs(Math.sin(t * 6)) * .08;
      break;
    case 'worm': /* извивается */
      g.rotation.y += Math.sin(t * 3) * .005;
      g.rotation.z = Math.sin(t * 4) * .2;
      break;
    case 'strider': /* шагает на длинных ногах */
      g.rotation.z = Math.sin(t * 5) * .06;
      g.position.y += 0;
      break;
    case 'fetus': /* тяжело пыхтит */
      g.scale.setScalar(1 + Math.sin(t * 3) * .04);
      break;
    case 'seahorse': /* покачивается на волне */
      g.rotation.z = Math.sin(t * 2.4) * .16;
      break;
    case 'pipis': /* прыгает как яйцо */
      g.scale.set(1 + Math.sin(t * 5) * .06, 1 + Math.abs(Math.sin(t * 5)) * .1, 1 + Math.sin(t * 5) * .06);
      break;
    case 'poppup': /* пульсирует-вот-вот взорвётся */
      g.scale.setScalar(1 + Math.sin(t * 8) * .1);
      break;
    case 'rudinn': /* вращает копьё */
      g.rotation.y += dt * 1.2;
      break;
    case 'hathy': /* подпрыгивает */
      g.position.y += Math.abs(Math.sin(t * 6)) * .001;
      g.rotation.z = Math.sin(t * 6) * .1;
      break;
    case 'tasque': /* вертится — кот-воин */
      g.rotation.y += dt * 2.5;
      break;
    case 'spamton': /* дрожит и печатает по телефону */
      g.rotation.z = (Math.random() - .5) * .08;
      g.scale.setScalar(1 + Math.sin(t * 12) * .03);
      break;
    case 'big': /* грозно покачивается */
      g.rotation.z = Math.sin(t * 1.6) * .08;
      g.scale.setScalar(1 + Math.sin(t * 1.6) * .04);
      break;
    case 'queen': /* царственно парит и вращается */
      g.rotation.y += dt * .8;
      g.scale.setScalar(1 + Math.sin(t * 1.2) * .04);
      break;
    case 'jevil': /* хаотично крутится и дёргается */
      g.rotation.y += dt * 3.5;
      g.rotation.z = Math.sin(t * 9) * .25;
      g.rotation.x = Math.cos(t * 7) * .2;
      break;
  }
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
      const mesh = kromerMakeFamiliarMesh(game, want[i]);
      /* появляемся в орбитальной точке сразу, без рывка */
      const ang0 = (i / Math.max(1, want.length)) * Math.PI * 2;
      mesh.position.set(p.pos.x + Math.cos(ang0) * 2, p.pos.y + 1.2, p.pos.z + Math.sin(ang0) * 2);
      list[i] = { mesh: mesh, def: want[i], idx: i, ang: ang0, cool: 0, bob: Math.random() * 6.28, px: mesh.position.x, py: mesh.position.y, pz: mesh.position.z, lungeT: 0, lx: 0, ly: 0, lz: 0 };
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
  const ring = 2.0;
  for (let i = 0; i < list.length; i++) {
    const f = list[i];
    const def = f.def || {};
    /* орбита вокруг игрока */
    f.ang += dt * (1.1 + i * 0.04) * (i % 2 ? -1 : 1);
    const rad = ring + (i % 3) * 0.35;
    f.bob += dt * 2.6;
    const tx = p.pos.x + Math.cos(f.ang) * rad;
    const tz = p.pos.z + Math.sin(f.ang) * rad;
    const ty = p.pos.y + 1.15 + Math.sin(f.bob) * 0.12;
    /* ПЛАВНОЕ следование (lerp) вместо жёсткого телепорта — нет дёрганья */
    const k = 1 - Math.pow(0.0001, dt);
    f.px = U.lerp(f.px === undefined ? tx : f.px, tx, k);
    f.py = U.lerp(f.py === undefined ? ty : f.py, ty, k);
    f.pz = U.lerp(f.pz === undefined ? tz : f.pz, tz, k);
    /* «рывок» к цели (выпад) — сглаживается обратно */
    if (f.lungeT > 0) {
      f.lungeT -= dt;
      const lx = U.clamp(f.lungeT / (def.lungeTime || .22), 0, 1);
      const pull = Math.sin(lx * Math.PI) * (def.lungeDist || .6);
      f.mesh.position.set(f.px + f.lx * pull, f.py + f.ly * pull, f.pz + f.lz * pull);
    } else {
      f.mesh.position.set(f.px, f.py, f.pz);
    }
    f.mesh.rotation.y = -f.ang;
    /* лёгкое покачивание-наклон + уникальная анимация типа */
    kromerAnimateFamiliar(f, dt);
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
      const did = kromerFamiliarAttack(game, def, f, best, tx, ty, tz);
      if (did) f.cool = def.famCd || 0.6;
    }
  }
  /* снаряды компаньонов (стреляющие/кидающие) */
  kromerUpdateFamiliarShots(game, dt);
}

/* атака компаньона СОГЛАСНО ЕГО ОПИСАНИЮ (def.atk). Возвращает true, если
   атака реально состоялась (для постановки кулдауна). */
function kromerFamiliarAttack(game, def, f, z, tx, ty, tz) {
  const p = game.player;
  const kind = def.atk || 'melee';
  const dmg = (def.famDmg || 24) * (1 + kromerStat('dmg') * 0.5);
  /* направление на цель — для выпада и росчерков */
  const dx = z.pos.x - f.px, dy = (z.pos.y + .8) - f.py, dz = z.pos.z - f.pz;
  const dl = Math.hypot(dx, dy, dz) || 1;
  f.lx = dx / dl; f.ly = dy / dl; f.lz = dz / dl;

  const doMelee = () => {
    /* ближний удар: урон сразу + выпад + росчерк */
    z.takeDamage(dmg, 'body', { x: dx, y: 0, z: dz });
    if (p) p.damageDealt += dmg;
    f.lungeT = def.lungeTime || .22;
    kromerFamiliarAttackFx(game, def, z, f.px, f.py, f.pz);
    Audio3D_SFX.hit && Audio3D_SFX.hit();
    return true;
  };

  switch (kind) {
    case 'bite': case 'melee':
      return dl <= (def.famR || 2.6) * 1.05 ? doMelee() : false;
    case 'spear':
      /* колющий удар копьём: длиннее и заметный выпад */
      if (dl <= (def.famR || 4.0) * 1.1) { f.lungeT = def.lungeTime || .3; return doMelee(); }
      return false;
    case 'shoot':
      kromerFamiliarShoot(game, def, f, z, dmg);
      f.lungeT = .12;
      return true;
    case 'pipis':
    case 'spamton':
      kromerFamiliarShoot(game, def, f, z, dmg, 'pipis');
      f.lungeT = .12;
      return true;
    case 'boom':
      /* взрывается по площади вокруг цели */
      if (dl <= (def.famR || 3.2) * 1.15) {
        const R = 2.6;
        kromerFamiliarAttackFx(game, def, z, f.px, f.py, f.pz);
        if (game.horde) for (const o of game.horde.list) {
          if (!o.alive || o.dying) continue;
          const dd = Math.hypot(o.pos.x - z.pos.x, o.pos.z - z.pos.z);
          if (dd > R) continue;
          o.takeDamage(dmg * (1 - dd / R * .5), 'body', { x: 0, y: 0, z: 0 });
        }
        if (p) p.damageDealt += dmg;
        if (game.effects && game.effects.explosion) game.effects.explosion(z.pos.x, z.pos.y + .6, z.pos.z, R, [0xff7a1e, 0x1a0d05]);
        Audio3D_SFX.explosionAt && Audio3D_SFX.explosionAt(z.pos.x, z.pos.y, z.pos.z);
        f.lungeT = .3;
        return true;
      }
      return false;
    case 'chaos':
      /* хаос: цель получает удар + случайный доп. эффект */
      if (dl <= (def.famR || 5.0) * 1.2) {
        z.takeDamage(dmg, 'body', { x: dx, y: 0, z: dz });
        if (p) p.damageDealt += dmg;
        if (Math.random() < .5 && game.effects) game.effects.explosion(z.pos.x, z.pos.y + .6, z.pos.z, 2.4, [0x8a5cff, 0x0a0414]);
        kromerFamiliarAttackFx(game, def, z, f.px, f.py, f.pz);
        f.lungeT = .22;
        Audio3D_SFX.hit && Audio3D_SFX.hit();
        return true;
      }
      return false;
    default:
      return dl <= (def.famR || 2.6) * 1.05 ? doMelee() : false;
  }
}

/* снаряд компаньона: летит в цель, при попадании — урон (+ AoE для pop) */
function kromerFamiliarShoot(game, def, f, z, dmg, style) {
  if (!game._famShots) game._famShots = [];
  const C = new THREE.Color(def.col || '#ff5fb0').getHex();
  const mat = new THREE.MeshBasicMaterial({ color: C, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(style === 'pipis' ? .16 : .12, 10, 8), mat);
  const sx = f.px, sy = f.py, sz = f.pz;
  mesh.position.set(sx, sy, sz);
  game.scene.add(mesh);
  const tx = z.pos.x - sx, ty = (z.pos.y + .8) - sy, tz = z.pos.z - sz;
  const tl = Math.hypot(tx, ty, tz) || 1;
  const sp = 26;
  game._famShots.push({
    mesh: mesh, mat: mat, life: 2.2,
    vx: tx / tl * sp, vy: ty / tl * sp, vz: tz / tl * sp,
    dmg: dmg, color: C
  });
}

function kromerUpdateFamiliarShots(game, dt) {
  const shots = game._famShots;
  if (!shots || !shots.length) return;
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i];
    s.life -= dt;
    s.mesh.position.x += s.vx * dt; s.mesh.position.y += s.vy * dt; s.mesh.position.z += s.vz * dt;
    s.mat.opacity = Math.max(0, Math.min(1, s.life));
    let hit = null;
    if (game.horde) for (const z of game.horde.list) {
      if (!z.alive || z.dying) continue;
      const d = Math.hypot(z.pos.x - s.mesh.position.x, (z.pos.y + .8) - s.mesh.position.y, z.pos.z - s.mesh.position.z);
      if (d < .8) { hit = z; break; }
    }
    if (hit || s.life <= 0) {
      if (hit) {
        hit.takeDamage(s.dmg, 'body', { x: s.vx, y: 0, z: s.vz });
        if (game.player) game.player.damageDealt += s.dmg;
        if (game.effects) {
          game.effects.particle(hit.pos.x, hit.pos.y + .8, hit.pos.z, 0, 2, 0, .16, 'vspark', .3);
          for (let k = 0; k < 6; k++) { const a = U.rand(0, 6.28); game.effects.particle(hit.pos.x, hit.pos.y + .8, hit.pos.z, Math.cos(a) * U.rand(2, 6), U.rand(1, 4), Math.sin(a) * U.rand(2, 6), U.rand(.06, .16), 'spark', U.rand(.2, .5)); }
        }
      }
      if (s.mesh.parent) s.mesh.parent.remove(s.mesh);
      s.mesh.geometry.dispose(); s.mat.dispose();
      shots.splice(i, 1);
    }
  }
}

/* эффект атаки каждого типа компаньона: цвет, форма, тип частиц */
function kromerFamiliarAttackFx(game, def, z, tx, ty, tz) {
  if (!game.effects) return;
  const C = new THREE.Color(def.col || '#ff5fb0').getHex();
  const kind = def.familiar || 'maw';
  const px = z.pos.x, py = z.pos.y + .8, pz = z.pos.z;
  const tint = { color: C, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false };
  const mk = (col) => { const m = new THREE.MeshBasicMaterial({ color: col === undefined ? C : col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }); return m; };
  switch (kind) {
    case 'maw': {   /* укус — круг «пасти» */
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.45, .09, 8, 18, Math.PI * 1.5), mk(0xffffff));
      ring.position.set(px, py, pz); ring.lookAt(tx, ty, tz);
      game.scene.add(ring);
      game.effects._famFx = game.effects._famFx || [];
      game.effects._famFx.push({ mesh: ring, life: .22, max: .22, grow: 1.5 });
      break;
    }
    case 'seahorse': {  /* выстрел — снаряд-пузырёк */
      const orb = new THREE.Mesh(new THREE.SphereGeometry(.14, 8, 6), mk());
      orb.position.set(tx, ty, tz); game.scene.add(orb);
      game.effects._famFx = game.effects._famFx || [];
      game.effects._famFx.push({ mesh: orb, life: .25, max: .25, grow: .2, vx: (px - tx) * 3, vy: (py - ty) * 3, vz: (pz - tz) * 3 });
      break;
    }
    case 'poppup': {    /* взрыв-хлопок */
      for (let i = 0; i < 12; i++) { const a = U.rand(0, 6.28); game.effects.particle(px, py, pz, Math.cos(a) * U.rand(4, 9), U.rand(2, 6), Math.sin(a) * U.rand(4, 9), U.rand(.1, .24), 'spark', U.rand(.3, .6)); }
      break;
    }
    case 'rudinn': {    /* удар копьём — белый росчерк */
      const sl = new THREE.Mesh(new THREE.BoxGeometry(.05, .05, 1.4), mk(0xdfffff));
      sl.position.set(px, py, pz); sl.lookAt(tx, ty, tz);
      game.scene.add(sl); game.effects._famFx = game.effects._famFx || [];
      game.effects._famFx.push({ mesh: sl, life: .18, max: .18, grow: .9 });
      break;
    }
    case 'jevil': {     /* хаос-взрыв разноцветных искр */
      const cols = [0x39d94a, 0xff5fb0, 0xffd21e, 0xc24bff];
      for (let i = 0; i < 16; i++) { const a = U.rand(0, 6.28); game.effects.particle(px, py, pz, Math.cos(a) * U.rand(5, 11), U.rand(2, 7), Math.sin(a) * U.rand(5, 11), U.rand(.1, .26), 'spark', U.rand(.3, .7)); }
      const flash = new THREE.Mesh(new THREE.SphereGeometry(.5, 8, 6), mk(0xffffff));
      flash.position.set(px, py, pz); game.scene.add(flash);
      game.effects._famFx = game.effects._famFx || [];
      game.effects._famFx.push({ mesh: flash, life: .16, max: .16, grow: .3 });
      break;
    }
    case 'big': {       /* тяжёлый удар — ударная волна */
      const ring = new THREE.Mesh(new THREE.RingGeometry(.4, .6, 24), mk());
      ring.position.set(px, py, pz); ring.rotation.x = -Math.PI / 2; game.scene.add(ring);
      game.effects._famFx = game.effects._famFx || [];
      game.effects._famFx.push({ mesh: ring, life: .3, max: .3, grow: 2.2 });
      break;
    }
    case 'queen': {     /* королевская вспышка */
      const star = new THREE.Mesh(new THREE.SphereGeometry(.32, 8, 6), mk(0xffffff));
      star.position.set(px, py, pz); game.scene.add(star);
      game.effects._famFx = game.effects._famFx || [];
      game.effects._famFx.push({ mesh: star, life: .22, max: .22, grow: .5 });
      break;
    }
    default: {          /* искра-«удар» единорога/прочих */
      for (let i = 0; i < 6; i++) { const a = U.rand(0, 6.28); game.effects.particle(px, py, pz, Math.cos(a) * U.rand(2, 5), U.rand(1, 4), Math.sin(a) * U.rand(2, 5), U.rand(.06, .16), 'vspark', U.rand(.25, .5)); }
    }
  }
}

function kromerClearFamiliars(game) {
  if (!game || !game.kromerFam) return;
  for (const f of game.kromerFam) { if (f.mesh && f.mesh.parent) f.mesh.parent.remove(f.mesh); }
  game.kromerFam.length = 0;
  /* снаряды компаньонов тоже убрать */
  if (game._famShots) {
    for (const s of game._famShots) { if (s.mesh && s.mesh.parent) s.mesh.parent.remove(s.mesh); }
    game._famShots.length = 0;
  }
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
  /* Компаньоны: обновляем КАЖДЫЙ кадр (плавное следование) — раньше раз в
     0.05с, из-за чего они дёргались. Нагрузка мала: до 12 тел. */
  kromerUpdateFamiliars(game, dt);
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
