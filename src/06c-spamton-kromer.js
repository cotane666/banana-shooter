/* ============================================================
   06c — СПАМТОН [BIG SHOT]: СИСТЕМА УЛУЧШЕНИЙ «КРОМЕР»
   В духе Spamton Subplot: за убийства выпадает КРОМЕР (монетки),
   раз в 2 волны открывается магазин улучшений. Работает ТОЛЬКО
   когда в руках рука-пушка [BIG SHOT] (оффлайн).
   Своя графика: пиксельно-спамтоновский стиль (жёлтый/розовый,
   глитч-заголовки [[...]]). Реализация оригинальная.
   ============================================================ */

/* Список улучшений. Цена растёт с уровнем: cost * (lvl+1). */
const KROMER_UPGRADES = [
  { id: 'dmg',    name: '[[БОЛЬШОЙ УРОН]]',    desc: 'Пиписы бьют сильнее',            cost: 120, max: 5, col: '#ffd21e' },
  { id: 'rate',   name: '[[СКОРОСТРЕЛ]]',       desc: 'Стрельба быстрее',               cost: 140, max: 5, col: '#ff5fb0' },
  { id: 'extra',  name: '[[РАСПРОДАЖА]]',       desc: '+1 пипис за выстрел',            cost: 200, max: 3, col: '#39d94a' },
  { id: 'size',   name: '[[ОГРОМНЫЕ ПИПИСЫ]]',  desc: 'Пиписы крупнее и больнее',       cost: 160, max: 3, col: '#ffd21e' },
  { id: 'homing', name: '[[ДОСТАВКА]]',         desc: 'Пиписы сами летят за врагами',   cost: 260, max: 1, col: '#ff5fb0' },
  { id: 'pierce', name: '[[ОЧЕНЬ ОСТРЫЕ]]',     desc: 'Шиповые прошивают +1 врага',     cost: 220, max: 2, col: '#8fe0ff' },
  { id: 'bounce', name: '[[БОЛЬШОЙ ОТСКОК]]',   desc: 'Прыгуны отскакивают чаще',       cost: 180, max: 2, col: '#8fe0ff' },
  { id: 'kromer', name: '[[ДВОЙНОЙ КРОМЕР]]',   desc: 'Больше кромера за убийства',     cost: 300, max: 2, col: '#39d94a' }
];

/* Состояние на текущий забег (сбрасывается при старте новой игры) */
const KromerState = {
  active: false,
  kromer: 0,
  levels: {},
  total: 0
};

function kromerLevel(id) { return KromerState.levels[id] || 0; }
function kromerReset() {
  KromerState.active = false;
  KromerState.kromer = 0;
  KromerState.levels = {};
  KromerState.total = 0;
}
/* множители для боевой логики (12-game.js) */
function KromerMul(key) {
  if (!KromerState.active) return 1;
  const l = KromerState.levels;
  switch (key) {
    case 'dmg':    return 1 + .15 * (l.dmg || 0);
    case 'rate':   return 1 / (1 + .10 * (l.rate || 0));      // множитель кулдауна
    case 'extra':  return (l.extra || 0);                     // доп. пиписы
    case 'size':   return 1 + .22 * (l.size || 0);
    case 'pierce': return (l.pierce || 0);
    case 'bounce': return (l.bounce || 0);
    case 'kromer': return 1 + .5 * (l.kromer || 0);
    default: return 1;
  }
}
function kromerHoming() { return KromerState.active && kromerLevel('homing') > 0; }

/* кромер, выпадающий за убийство (учитывает множитель) */
function kromerPerKill(z) {
  const base = (z.isBoss ? 60 : z.isMiniBoss ? 25 : 4) + (Math.random() * 4 | 0);
  return Math.max(1, Math.round(base * KromerMul('kromer')));
}

/* ---------- сбор монеток-кромеров ---------- */
function kromerSpawnCoin(scene, x, y, z) {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0xffd21e });
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .04, 12), mat);
  coin.rotation.x = Math.PI / 2;
  g.add(coin);
  /* зелёная «к» / символ кромера */
  const inner = new THREE.Mesh(new THREE.BoxGeometry(.10, .10, .03), new THREE.MeshBasicMaterial({ color: 0x1a2a10 }));
  inner.position.z = .03; g.add(inner);
  const glow = new THREE.PointLight(0xffd21e, 3, 4, 2);
  g.add(glow);
  g.position.set(x, y + .5, z);
  scene.add(g);
  return { mesh: g, x, y, z, t: 0, life: 22 };
}

/* ---------- магазин улучшений ---------- */
function kromerOpenShop(game) {
  KromerState.active = true;
  const grid = UI.el.kromGrid;
  if (grid) {
    grid.innerHTML = '';
    KROMER_UPGRADES.forEach(u => {
      const lvl = kromerLevel(u.id);
      const cost = u.cost * (lvl + 1);
      const maxed = lvl >= u.max;
      const canBuy = !maxed && KromerState.kromer >= cost;
      const card = document.createElement('button');
      card.className = 'kromcard' + (maxed ? ' maxed' : canBuy ? '' : ' cant');
      card.style.setProperty('--kc', u.col);
      card.innerHTML =
        '<b>' + U.esc(u.name) + '</b>' +
        '<i>' + U.esc(u.desc) + '</i>' +
        '<span class="klvl">' + (maxed ? 'МАКС' : 'УР. ' + lvl + '/' + u.max) + '</span>' +
        '<span class="kprice">' + (maxed ? '[[ПРОДАНО]]' : '<span class="kcoin">' + cost + '</span> KROMER') + '</span>';
      card.addEventListener('click', () => kromerBuy(game, u.id));
      grid.appendChild(card);
    });
  }
  if (UI.el.kromAmount) UI.el.kromAmount.textContent = KromerState.kromer;
  UI.show('kromer');
  Audio3D_SFX.uiClick();
}

function kromerBuy(game, id) {
  const u = KROMER_UPGRADES.find(x => x.id === id);
  if (!u) return;
  const lvl = kromerLevel(id);
  if (lvl >= u.max) { Audio3D_SFX.deny(); return; }
  const cost = u.cost * (lvl + 1);
  if (KromerState.kromer < cost) { Audio3D_SFX.deny(); UI.toast('Мало КРОМЕРА — нужно ' + cost); return; }
  KromerState.kromer -= cost;
  KromerState.levels[id] = lvl + 1;
  KromerState.total++;
  Audio3D_SFX.buy();
  UI.toast('[[КУПЛЕНО!]] ' + u.name, u.col);
  kromerOpenShop(game);                 // перерисовка
}

/* ---------- тик: монетки падают/собираются ---------- */
function kromerUpdate(game, dt) {
  const p = game.player;
  if (!p || !game.kromerCoins) { if (game) game.kromerCoins = []; return; }
  const list = game.kromerCoins;
  for (let i = list.length - 1; i >= 0; i--) {
    const c = list[i];
    c.t += dt; c.life -= dt;
    c.mesh.rotation.y += dt * 4;
    c.mesh.position.y = c.y + .5 + Math.sin(c.t * 3) * .12;
    const dx = p.pos.x - c.x, dz = p.pos.z - c.z;
    const d = Math.hypot(dx, dz);
    /* магнит: подтягивается к игроку, когда рядом */
    if (d < 6 && d > .4) {
      c.x += (dx / d) * Math.min(14, 8 + (6 - d) * 3) * dt;
      c.z += (dz / d) * Math.min(14, 8 + (6 - d) * 3) * dt;
      c.mesh.position.x = c.x; c.mesh.position.z = c.z;
    }
    if (d <= 1.4) {
      KromerState.kromer += c.kromer || 1;
      Audio3D_SFX.pickup && Audio3D_SFX.pickup();
      if (game.effects) game.effects.particle(c.x, c.y + .5, c.z, 0, 2, 0, .18, 'vspark', .3);
      if (c.mesh.parent) c.mesh.parent.remove(c.mesh);
      list.splice(i, 1);
      continue;
    }
    if (c.life <= 0) {
      if (c.mesh.parent) c.mesh.parent.remove(c.mesh);
      list.splice(i, 1);
    }
  }
}

/* сброс монеток со сцены (при выходе в меню) */
function kromerClearCoins(game) {
  if (!game.kromerCoins) { game.kromerCoins = []; return; }
  for (const c of game.kromerCoins) { if (c.mesh.parent) c.mesh.parent.remove(c.mesh); }
  game.kromerCoins.length = 0;
}
