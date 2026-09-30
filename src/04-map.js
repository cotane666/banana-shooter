/* ============================================================
   04 — MAP: geometry, lighting, navigation grid + pathfinding
   Five selectable arenas share one set of builders. Everything the map
   creates lives in MAP.group, so switching maps at runtime is just
   "dispose the group, rebuild".
   ============================================================ */

const MAP = {
  size: 104,          // arena is size x square
  wallH: 9,
  ground: 0,
  spawns: [],
  zombieSpawns: [],
  playerSpawns: [],
  nav: null,
  scene: null,
  world: null,
  group: null,
  sites: {},
  id: 'arena',
  def: null,
  aimRoom: null,
  hazards: [],        // lava pools / spike strips / presses (rebuilt per map)
  destructibles: [],  // разрушаемые чанки (укрытия) — восстанавливаются на волне
  _chunkGid: 0
};

/* ---------------- material cache ---------------- */
let MAT = {};
function buildMaterials() {
  if (MAT.floor) return;                 // built once; reused across map rebuilds
  const mk = (canvasKey, rep, color, opts) => {
    opts = opts || {};
    const m = new THREE.MeshLambertMaterial({
      color: color === undefined ? 0xffffff : color,
      side: opts.side || THREE.FrontSide
    });
    if (canvasKey && TEXTURES[canvasKey]) {
      m.map = canvasTexture(TEXTURES[canvasKey], rep, 4);
    }
    m.userData.tex = canvasKey;
    return m;
  };
  MAT = {
    floor:   mk('floor', 1, 0xffffff),
    concrete: mk('concrete', 1, 0xffffff),
    brick:   mk('brick', 1, 0xffffff),
    wood:    mk('wood', 1, 0xffffff),
    metal:   mk('metal', 1, 0xffffff),
    sand:    mk('sand', 1, 0xffffff),
    dark:    new THREE.MeshLambertMaterial({ color: 0x2b2f33 }),
    siteA:   new THREE.MeshBasicMaterial({ map: canvasTexture(TEXTURES.siteA, 1, 4), transparent: true, opacity: .55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
    siteB:   new THREE.MeshBasicMaterial({ map: canvasTexture(TEXTURES.siteB, 1, 4), transparent: true, opacity: .55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })
  };
  // texture scaling per material (world units per repeat) — set by the box builder
  MAT.floor.userData.scale = 8;
  MAT.concrete.userData.scale = 4;
  MAT.brick.userData.scale = 3;
  MAT.wood.userData.scale = 2.2;
  MAT.metal.userData.scale = 3;
  MAT.sand.userData.scale = 1.6;
  MAT._cache = {};
}

/* Build a box mesh whose texture repeats according to its world size.
   Текстура масштабируется ПО РАЗМЕРУ ГРАНИ: у длинных стен больше плиток по
   длине и столько же по высоте, поэтому рисунок больше не растягивается. */
function makeBoxMesh(w, h, d, mat, faceTopMat) {
  const g = new THREE.BoxGeometry(w, h, d);
  let m = mat;
  if (mat.map) {
    const s = mat.userData.scale || 3;
    /* сколько плиток текстуры нужно по каждой паре осей: перед/зад (w×h),
       бок (d×h) и верх (w×d) — так рисунок не растягивается на длинных
       стенах и не «сплющивается» на тонких перекладинах. */
    const rx = Math.max(1, Math.round(w / s));
    const ry = Math.max(1, Math.round(h / s));
    const rz = Math.max(1, Math.round(d / s));
    const key = mat.userData.tex + ':' + s + ':' + rx + ':' + ry + ':' + rz;
    if (!MAT._cache) MAT._cache = {};
    m = MAT._cache[key];
    if (!m) {
      m = mat.clone();
      m.map = mat.map.clone();
      m.map.needsUpdate = true;
      m.map.wrapS = m.map.wrapT = THREE.RepeatWrapping;
      m.map.repeat.set(1, 1);          // реальный repeat задаётся через UV граней
      MAT._cache[key] = m;
      m.userData = m.userData || {};
    }
    /* BoxGeometry: 6 грани по 4 вершины. Задаём UV каждой грани отдельно,
       чтобы повторы шли по фактическим размерам сторон. Делается КАЖДЫЙ раз,
       т.к. геометрия у каждого бокса своя, а материал может быть из кэша. */
    const uv = g.attributes.uv;
    const faceRepeat = [
      [rz, ry],   // +X  (бок)
      [rz, ry],   // -X  (бок)
      [rx, rz],   // +Y  (верх)
      [rx, rz],   // -Y  (низ)
      [rx, ry],   // +Z  (перед)
      [rx, ry]    // -Z  (зад)
    ];
    for (let f = 0; f < 6; f++) {
      const ru = faceRepeat[f][0], rv = faceRepeat[f][1];
      for (let v = 0; v < 4; v++) {
        const i = (f * 4 + v) * 2;
        uv.setXY(i, uv.getX(i) * ru, uv.getY(i) * rv);
      }
    }
    uv.needsUpdate = true;
  }
  const mesh = new THREE.Mesh(g, m);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/* ============================================================
   РАЗРУШАЕМОСТЬ КАРТЫ
   damageMapAt() наносит урон разрушаемым чанкам в радиусе (взрыв/удар зомби) и
   убирает те, чей HP упал до нуля (меш скрывается, коллизия мягко снимается).
   restoreMap() возвращает ВСЕ чанки (вызывается на новой волне/карте).

   ОПТИМИЗАЦИЯ: все чанки одного цвета/размера рисуются ОДНИМ InstancedMesh —
   сотни кусков карты дают несколько draw call вместо сотен, что критично для
   телефона.
   ============================================================ */
/* ключ инстанс-группы: материал + цвет. Размер задаётся масштабом матрицы,
   поэтому куски любых размеров делят одну InstancedMesh (единый РОВНЫЙ куб). */
function _chunkInstanceKey(mat) {
  const tex = (mat && mat.userData && mat.userData.tex) || 'flat';
  return tex + '|' + (mat && mat.color ? mat.color.getHexString() : 'ffffff');
}

/* РВАНЫЕ ОСКОЛКИ (как в Human Fall Flat) — используются ТОЛЬКО для эффекта
   разрушения (летящие куски), а НЕ для базовой геометрии карты. Базовая карта
   остаётся ровной, чтобы не выглядеть сломанной. */
const _jaggedGeos = [];
const JAGGED_VARIANTS = 6;
function _jaggedBoxGeometry(variant) {
  variant = ((variant | 0) % JAGGED_VARIANTS + JAGGED_VARIANTS) % JAGGED_VARIANTS;
  if (_jaggedGeos[variant]) return _jaggedGeos[variant];
  const g = new THREE.BoxGeometry(1, 1, 1);
  const rng = makeRng(0x9e37 + variant * 2654435761);
  const off = [];
  for (let c = 0; c < 8; c++) off.push([(rng() - .5) * .34, (rng() - .5) * .34, (rng() - .5) * .34]);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i), py = pos.getY(i), pz = pos.getZ(i);
    const ci = (px > 0 ? 1 : 0) | (py > 0 ? 2 : 0) | (pz > 0 ? 4 : 0);
    pos.setXYZ(i, px + off[ci][0], py + off[ci][1], pz + off[ci][2]);
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  _jaggedGeos[variant] = g;
  return g;
}

/* добавить чанк в общий InstancedMesh (создаётся лениво при первом чанке).
   Базовый куб РОВНЫЙ единичный; масштаб = реальный размер куска. */
function _addChunkInstance(parent, world, cx, cy, cz, cw, ch, cd, mat, tag, noCollide, noShadow, invisible) {
  const aabb = aabbFromBase(cx, cy, cz, cw, ch, cd, tag);
  aabb.destructible = true;
  aabb.hp = aabb.maxHp = Math.max(30, cw * ch * cd * 26);
  aabb._iw = cw; aabb._ih = ch; aabb._id = cd;   // размеры для матрицы инстанса
  aabb._mat = mat || MAT.concrete;
  if (!noCollide) world.addBox(aabb);
  aabb._invisible = !!invisible;

    if (!invisible) {
    if (!MAP._chunkGroups) MAP._chunkGroups = {};
    const key = _chunkInstanceKey(mat || MAT.concrete);
    let grp = MAP._chunkGroups[key];
    if (!grp) {
      grp = { mat: mat || MAT.concrete, items: [], mesh: null, noShadow: !!noShadow, parent: parent };
      MAP._chunkGroups[key] = grp;
    }
    aabb._chunkGroup = grp;
    aabb._chunkIndex = grp.items.length;
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    grp.items.push({ aabb: aabb, mtx: zero, x: cx, y: cy + ch / 2, z: cz, w: cw, h: ch, d: cd, visible: true });
  }
  MAP.destructibles.push(aabb);
  return aabb;
}

/* пометить инстанс чанка «мёртвым»: масштаб 0, чтобы он не рисовался.
   Нужно для doorwayCut — прорезанные двери не должны «зарастать» кирпичом. */
function _killChunkInstance(b) {
  if (!b || !b._chunkGroup) return;
  const it = b._chunkGroup.items[b._chunkIndex];
  if (!it) return;
  it.dead = true; it.visible = false;
  it.mtx.makeScale(0, 0, 0);
  const im = b._chunkGroup.mesh;
  if (im) { im.setMatrixAt(b._chunkIndex, it.mtx); im.instanceMatrix.needsUpdate = true; }
}

/* собрать все инстанс-группы в реальные InstancedMesh (один раз после постройки) */
function _buildChunkInstances() {
  if (!MAP._chunkGroups) return;
  for (const key in MAP._chunkGroups) {
    const grp = MAP._chunkGroups[key];
    if (grp.mesh) continue;
    const geo = new THREE.BoxGeometry(1, 1, 1);   // базовая геометрия — РОВНАЯ
    const im = new THREE.InstancedMesh(geo, grp.mat, Math.max(1, grp.items.length));
    im.castShadow = !grp.noShadow;
    im.receiveShadow = true;
    im.frustumCulled = false;             // чанки размазаны по арене
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    /* МАСШТАБ ТЕКСТУРЫ ПОД РАЗМЕР КУСКА: у всех инстансов единичный куб, поэтому
       без этого текстура растягивается на длинных деталях. Передаём размер
       куска отдельным instanced-атрибутом и домножаем на него UV в шейдере. */
    const texScale = grp.mat.userData && grp.mat.userData.scale ? grp.mat.userData.scale : 3;
    const aUvScale = new THREE.InstancedBufferAttribute(new Float32Array(grp.items.length * 3), 3);
    aUvScale.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aUvScale', aUvScale);

    for (let i = 0; i < grp.items.length; i++) {
      const it = grp.items[i];
      // «мёртвые» (прорезанные двери) остаются с нулевым масштабом — невидимы
      if (it.dead) { it.mtx.makeScale(0, 0, 0); }
      else { it.mtx.makeScale(it.w, it.h, it.d).setPosition(it.x, it.y, it.z); }
      im.setMatrixAt(i, it.mtx);
      it.uvScale = [it.w, it.h, it.d];
      aUvScale.setXYZ(i, it.w, it.h, it.d);
    }
    aUvScale.needsUpdate = true;
    im.instanceMatrix.needsUpdate = true;

    /* домножаем UV по грани: определяем грань по нормали (в локальных осях). */
    im.onBeforeCompile = (shader) => {
      shader.uniforms.uTexScale = { value: texScale };
      shader.vertexShader = 'attribute vec3 aUvScale;\nuniform float uTexScale;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>
         {
           vec3 an = abs(normal);
           vec2 faceSize;
           if (an.x > 0.5) faceSize = vec2(aUvScale.z, aUvScale.y);       // ±X: d x h
           else if (an.y > 0.5) faceSize = vec2(aUvScale.x, aUvScale.z);  // ±Y: w x d
           else faceSize = vec2(aUvScale.x, aUvScale.y);                  // ±Z: w x h
           vUv *= max(vec2(1.0), floor(faceSize / uTexScale + 0.5));
         }`
      );
    };

    grp.mesh = im;
    grp.aUvScale = aUvScale;
    grp.parent.add(im);
  }
}

function damageMapAt(x, y, z, radius, dmg) {
  if (!MAP.destructibles || !MAP.destructibles.length) return 0;
  let destroyed = 0;
  const r2 = radius * radius;
  /* ОПТИМИЗАЦИЯ: вместо перебора ВСЕХ разрушаемых частей (тысячи) берём
     кандидатов из пространственного грида по AABB взрыва — это в разы
     меньше работы. Грид общий с коллизиями, поэтому части уже в нём. */
  let list;
  if (MAP.world && MAP.world.query) {
    const bb = AABB(x - radius, y - radius, z - radius, x + radius, y + radius, z + radius);
    list = MAP.world.query(bb, []);
  } else {
    list = MAP.destructibles;
  }
  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    if (b.removed || !b.destructible) continue;
    // ближайшая точка бокса к центру взрыва
    const cx = U.clamp(x, b.minX, b.maxX);
    const cy = U.clamp(y, b.minY, b.maxY);
    const cz = U.clamp(z, b.minZ, b.maxZ);
    const dx = x - cx, dy = y - cy, dz = z - cz;
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 > r2) continue;
    const k = 1 - Math.sqrt(d2) / radius;
    b.hp -= dmg * (0.4 + k * 0.6);
    if (b.hp <= 0) {
      // запоминаем центр куска для пыли
      MAP._lastBreak = { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2, z: (b.minZ + b.maxZ) / 2, mat: b._mat || null };
      removeMapChunk(b); destroyed++;
    }
  }
  if (destroyed) _flushChunkInstances();
  return destroyed;
}

/* урон по КОНКРЕТНОМУ боксу (попадание пули): 10-15 пуль ломают блок.
   Возвращает true, если блок разрушен. */
function damageMapBox(b, dmg) {
  if (!b || b.removed || !b.destructible) return false;
  b.hp -= dmg;
  if (b.hp <= 0) { removeMapChunk(b); _flushChunkInstances(); return true; }
  return false;
}

/* один чанк: спрятать инстанс (масштаб 0) и снять коллизию */
function removeMapChunk(b) {
  if (!b || b.removed) return;
  b.removed = true;
  if (b._chunkGroup && b._chunkGroup.items[b._chunkIndex]) {
    const it = b._chunkGroup.items[b._chunkIndex];
    it.visible = false;
    it.mtx.copy(ZERO_M4);
    b._chunkGroup.dirty = true;             // обновляем ТОЛЬКО затронутую группу
  } else if (b.mesh) b.mesh.visible = false;
  if (MAP.world) MAP.world.removeBox(b);
}

/* пометить инстанс-буферы к обновлению — только изменённые группы */
const ZERO_M4 = new THREE.Matrix4().makeScale(0, 0, 0);
let _chunkDirty = false;
function _flushChunkInstances() {
  if (!MAP._chunkGroups) return;
  for (const key in MAP._chunkGroups) {
    const grp = MAP._chunkGroups[key];
    if (!grp.mesh || !grp.dirty) continue;
    for (let i = 0; i < grp.items.length; i++) grp.mesh.setMatrixAt(i, grp.items[i].mtx);
    grp.mesh.instanceMatrix.needsUpdate = true;
    grp.dirty = false;
  }
  _chunkDirty = false;
}

/* восстановить всю карту после волны */
function restoreMap() {
  if (!MAP.destructibles || !MAP.destructibles.length) return 0;
  let n = 0;
  const tmp = new THREE.Matrix4();
  for (let i = 0; i < MAP.destructibles.length; i++) {
    const b = MAP.destructibles[i];
    if (!b.removed) continue;
    b.removed = false;
    b.hp = b.maxHp;
    if (b._chunkGroup && b._chunkGroup.items[b._chunkIndex]) {
      const it = b._chunkGroup.items[b._chunkIndex];
      it.visible = true;
      it.mtx.makeScale(it.w, it.h, it.d).setPosition(it.x, it.y, it.z);
      b._chunkGroup.dirty = true;
    } else if (b.mesh) b.mesh.visible = true;
    if (MAP.world) MAP.world.restoreBox(b);
    n++;
  }
  if (n) _flushChunkInstances();
  return n;
}

/* add a solid box: bottom-center anchored at (x,y,z). `parent` is MAP.group.
   Большие детали автоматически дробятся на ЧАНКИ (≈1.3м), чтобы разрушение
   убирало ровно ту часть, в которую попали (взрыв/зомби), а не всю стену.
   Пол и границы карты НЕ разрушаются. */
const MAP_CHUNK = 1.7;
/* НЕЛЬЗЯ разрушить только ПОЛ и ГРАНИЦЫ карты (они держат мир). Всё
   остальное — укрытия, стены, колонны, а также РАМПЫ, ПЛАТФОРМЫ, НАСТИЛЫ и
   КРЫШИ — ломается взрывом (мгновенно) или пулями/ближним боем. */
const MAP_INDESTRUCTIBLE = { ground: 1, boundary: 1 };
function _destructibleTag(tag) { return !MAP_INDESTRUCTIBLE[tag]; }

/* НЕРАВНОМЕРНЫЕ ЛИНИИ РАЗРЕЗА: делим длину на случайные куски примерно по
   targetChunk, чтобы деталь распадалась на хаотичные (не одинаковые) части —
   так повреждения выглядят реалистично, как битый кирпич. */
function _irregularSplits(len, target, rng) {
  const n = Math.max(1, Math.round(len / target));
  if (n <= 1) return [0, len];
  const minSeg = len / n * 0.45, maxSeg = len / n * 1.55;
  const pts = [0];
  let x = 0;
  while (len - x > maxSeg) {
    let seg = minSeg + rng() * (maxSeg - minSeg);
    if (len - (x + seg) < minSeg) seg = len - x;       // последний кусок не мельчить
    x += seg;
    pts.push(x);
  }
  pts.push(len);
  return pts;
}

function solid(parent, world, x, y, z, w, h, d, mat, opts) {
  opts = opts || {};
  const tag = opts.tag || 'solid';
  const canChunk = opts.destructible !== false && !opts.rotY && _destructibleTag(tag);
  if (canChunk) {
    /* делим на хаотичные куски; если их выходит слишком много, укрупняем шаг,
       чтобы сохранить производительность. */
    let target = MAP_CHUNK;
    let xs, ys, zs, total;
    for (let attempt = 0; attempt < 7; attempt++) {
      const rng = makeRng((x * 73856093) ^ (z * 19349663) ^ (y * 83492791) ^ (attempt * 2654435761));
      xs = _irregularSplits(w, target, rng);
      ys = _irregularSplits(h, target, rng);
      zs = _irregularSplits(d, target, rng);
      total = (xs.length - 1) * (ys.length - 1) * (zs.length - 1);
      if (total <= 260) break;
      target *= 1.5;
    }
    if (total > 1) {
      const gid = (MAP._chunkGid = (MAP._chunkGid || 0) + 1);
      for (let iy = 0; iy < ys.length - 1; iy++) {
        const cy0 = ys[iy], cy1 = ys[iy + 1];
        for (let iz = 0; iz < zs.length - 1; iz++) {
          const cz0 = zs[iz], cz1 = zs[iz + 1];
          for (let ix = 0; ix < xs.length - 1; ix++) {
            const cx0 = xs[ix], cx1 = xs[ix + 1];
            const cw = cx1 - cx0, ch = cy1 - cy0, cd = cz1 - cz0;
            if (cw < .05 || ch < .05 || cd < .05) continue;
            const cx = x - w / 2 + (cx0 + cx1) / 2;
            const cz = z - d / 2 + (cz0 + cz1) / 2;
            const cy = y + cy0;
            const aabb = _addChunkInstance(parent, world, cx, cy, cz, cw, ch, cd, mat || MAT.concrete, tag, opts.noCollide, opts.noShadow, opts.invisible);
            aabb.building = gid;
          }
        }
      }
      return null;
    }
  }
  const aabb = aabbFromBase(x, y, z, w, h, d, tag);
  if (!opts.noCollide) world.addBox(aabb);
  if (opts.destructible !== false && _destructibleTag(tag)) {
    aabb.destructible = true;
    aabb.hp = aabb.maxHp = Math.max(30, w * h * d * 26);
    MAP.destructibles.push(aabb);
  }
  if (opts.invisible) return aabb;
  const mesh = makeBoxMesh(w, h, d, mat || MAT.concrete);
  mesh.position.set(x, y + h / 2, z);
  if (opts.rotY) mesh.rotation.y = opts.rotY;
  if (opts.noShadow) { mesh.castShadow = false; }
  parent.add(mesh);
  if (aabb) aabb.mesh = mesh;
  return aabb;
}

/* decorative box (no collision), centered on y */
function decor(parent, x, y, z, w, h, d, mat, rotY) {
  const mesh = makeBoxMesh(w, h, d, mat || MAT.concrete);
  mesh.position.set(x, y + h / 2, z);
  if (rotY) mesh.rotation.y = rotY;
  mesh.castShadow = true; mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

/* ============================================================
   ENVIRONMENTAL HAZARDS
   Lava pools (burn), spike strips (chill) and presses (slam). They sit inside
   MAP.hazards and are ticked by Game.updateHazards. Geometry is purely visual;
   the damage check is a circle test in the game loop.
   ============================================================ */
function hazardLava(parent, x, z, r) {
  const g = new THREE.Group();
  const pool = new THREE.Mesh(new THREE.CircleGeometry(r, 22),
    new THREE.MeshBasicMaterial({ color: 0xff5a1a, transparent: true, opacity: .9 }));
  pool.rotation.x = -Math.PI / 2; pool.position.y = .03; g.add(pool);
  const rim = new THREE.Mesh(new THREE.RingGeometry(r, r + .35, 24),
    new THREE.MeshBasicMaterial({ color: 0x2a1408, transparent: true, opacity: .7 }));
  rim.rotation.x = -Math.PI / 2; rim.position.y = .02; g.add(rim);
  const glow = new THREE.PointLight(0xff6a2a, 30, r * 3, 2);
  glow.position.set(0, 1, 0); g.add(glow);
  g.position.set(x, 0, z);
  parent.add(g);
  MAP.hazards.push({ kind: 'lava', x: x, z: z, r: r, dps: 26, mesh: g, light: glow });
}
function hazardSpikes(parent, x, z, r) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CircleGeometry(r, 18),
    new THREE.MeshLambertMaterial({ color: 0x2a2e33 }));
  base.rotation.x = -Math.PI / 2; base.position.y = .02; g.add(base);
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2, rr = r * .55;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(.09, .42, 6),
      new THREE.MeshLambertMaterial({ color: 0xb9c2cc }));
    spike.position.set(Math.cos(a) * rr, .21, Math.sin(a) * rr);
    g.add(spike);
  }
  g.position.set(x, 0, z);
  parent.add(g);
  MAP.hazards.push({ kind: 'spikes', x: x, z: z, r: r * .85, dps: 34, slow: .45, mesh: g });
}
function hazardPress(parent, x, z, r) {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(r * 2.2, .3, r * 2.2),
    new THREE.MeshLambertMaterial({ color: 0x3a4149 }));
  frame.position.y = .12; g.add(frame);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(r * 1.9, .45, r * 1.9),
    new THREE.MeshLambertMaterial({ color: 0x6b7480 }));
  plate.position.y = 4.2; g.add(plate);
  for (const s of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(.22, 4.6, .22),
      new THREE.MeshLambertMaterial({ color: 0x2b3038 }));
    rail.position.set(s * r * .95, 2.3, -r * .95); g.add(rail);
    const rail2 = rail.clone(); rail2.position.z = r * .95; g.add(rail2);
  }
  g.position.set(x, 0, z);
  parent.add(g);
  MAP.hazards.push({ kind: 'press', x: x, z: z, r: r, dps: 70, mesh: g, plate: plate, phase: 0 });
}
/* scatter a handful of hazards on the open floor (avoiding the map centre) */
function buildHazards(parent, world) {
  MAP.hazards = [];
  if (Store.data.trapsEnabled === 0) return;
  const S = MAP.size;
  const spots = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + U.rand(-.3, .3);
    const rr = 16 + U.rand(0, 18);
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    const gy = world.groundAt(x, z, 3);
    if (gy === null || Math.abs(gy) > .3) continue;                // keep them on the flat arena floor
    if (Math.hypot(x, z) < 10) continue;
    spots.push({ x: x, z: z });
  }
  spots.forEach((s, i) => {
    const kind = ['lava', 'spikes', 'press'][i % 3];
    if (kind === 'lava') hazardLava(parent, s.x, s.z, 2.6);
    else if (kind === 'spikes') hazardSpikes(parent, s.x, s.z, 2.2);
    else hazardPress(parent, s.x, s.z, 1.8);
  });
}

/* ============================================================
   COMMON MAP PIECES
   ============================================================ */
function mapGround(parent, world, opts) {
  opts = opts || {};
  const S = MAP.size;
  world.addBox(AABB(-(S / 2 + 20), -2, -(S / 2 + 20), S / 2 + 20, 0, S / 2 + 20, 'ground'));
  const gpMat = MAT.floor.clone();
  gpMat.map = canvasTexture(TEXTURES.floor, 18, 4);
  if (opts.tint !== undefined) gpMat.color.setHex(opts.tint);
  const gp = new THREE.Mesh(new THREE.PlaneGeometry(S + 40, S + 40), gpMat);
  gp.rotation.x = -Math.PI / 2;
  gp.position.y = 0.01;
  gp.receiveShadow = true;
  parent.add(gp);
}

function mapPerimeter(parent, world, mat) {
  const S = MAP.size, H = MAP.wallH, t = 2.5, half = S / 2;
  mat = mat || MAT.concrete;
  solid(parent, world, 0, 0, -half, S + t, H, t, mat, { tag: 'boundary' });
  solid(parent, world, 0, 0, half, S + t, H, t, mat, { tag: 'boundary' });
  solid(parent, world, -half, 0, 0, t, H, S + t, mat, { tag: 'boundary' });
  solid(parent, world, half, 0, 0, t, H, S + t, mat, { tag: 'boundary' });
}

/* Cut a doorway through a wall by splitting it into two segments + lintel.
   Работает и когда стена уже раздроблена на чанки: удаляем все боксы, чьи
   центры попадают в прямоугольник стены, затем строим сегменты двери. */
function doorwayCut(parent, world, x, z, axis, len, h, thick) {
  const halfLen = len / 2 + 0.01, halfThick = thick / 2 + 0.01;
  /* Берём ТОЛЬКО стены (tag 'wall') внутри прямоугольника проёма и не выше
     самой стены. Раньше проверка высоты пропускала бокс ПОЛА (он ниже нуля),
     и doorwayCut на картах БУНКЕР/ЛАБОРАТОРИЯ удалял пол — игрок проваливался.
     Учитываем и чанки стен: их высота может отличаться от `h`, поэтому высоту
     не сверяем точно, а ограничиваем сверху. */
  const inRect = (b) => {
    if (b.tag !== 'wall') return false;
    const bcx = (b.minX + b.maxX) / 2, bcz = (b.minZ + b.maxZ) / 2;
    if (Math.abs(bcx - x) > halfLen) return false;
    if (Math.abs(bcz - z) > halfThick) return false;
    if (b.minY < -0.1 || b.maxY > h + 0.1) return false;   // только тело стены
    return true;
  };
  let removedAny = false;
  for (let i = world.boxes.length - 1; i >= 0; i--) {
    const b = world.boxes[i];
    if (!inRect(b)) continue;
    removedAny = true;
    if (b.mesh) { parent.remove(b.mesh); if (b.mesh.geometry) b.mesh.geometry.dispose(); }
    _killChunkInstance(b);                 // невидимым — иначе дверь «зарастает»
    world.boxes.splice(i, 1);
    const di = MAP.destructibles.indexOf(b); if (di >= 0) MAP.destructibles.splice(di, 1);
  }
  if (!removedAny) return;
  world.grid.clear();
  world.boxes.forEach((bb, i) => world._insert(bb, i));

  const gap = 4.2;
  const seg = (len - gap) / 2;
  const y = 0;
  const wallMat = MAT.brick;
  if (axis === 'z') {
    solid(parent, world, x, y, z - (gap / 2 + seg / 2), thick, h, seg, wallMat, { tag: 'wall' });
    solid(parent, world, x, y, z + (gap / 2 + seg / 2), thick, h, seg, wallMat, { tag: 'wall' });
    solid(parent, world, x, y + h - .9, z, thick, .9, gap, wallMat, { tag: 'wall' });
  } else {
    solid(parent, world, x - (gap / 2 + seg / 2), y, z, seg, h, thick, wallMat, { tag: 'wall' });
    solid(parent, world, x + (gap / 2 + seg / 2), y, z, seg, h, thick, wallMat, { tag: 'wall' });
    solid(parent, world, x, y + h - .9, z, gap, .9, thick, wallMat, { tag: 'wall' });
  }
}

/* ---------------- stepped ramp ---------------- */
function makeRamp(parent, world, x, z, width, height, dir) {
  const steps = Math.max(4, Math.ceil(height / 0.38));
  const depth = height * 1.5;
  for (let i = 0; i < steps; i++) {
    const h = (i + 1) / steps * height;
    const off = (i + .5) / steps * depth;
    let px = x, pz = z;
    let w = width, d = depth / steps + .02;
    if (dir === 'south') { pz = z + off; w = width; d = depth / steps + .02; }
    if (dir === 'north') { pz = z - off; }
    if (dir === 'east') { px = x + off; w = depth / steps + .02; d = width; }
    if (dir === 'west') { px = x - off; w = depth / steps + .02; d = width; }
    solid(parent, world, px, 0, pz, w, h, d, MAT.concrete, { tag: 'ramp' });
  }
}

/* ---------------- building with interior ---------------- */
function buildBuilding(parent, world, cx, cz, w, d, h, site) {
  const wall = .55;
  const door = 3.4;
  const hw = w / 2, hd = d / 2;
  const mat = site ? MAT.brick : MAT.concrete;

  solid(parent, world, cx - (door / 2 + (w - door) / 4), 0, cz - hd, (w - door) / 2, h, wall, mat, { tag: 'wall' });
  solid(parent, world, cx + (door / 2 + (w - door) / 4), 0, cz - hd, (w - door) / 2, h, wall, mat, { tag: 'wall' });
  solid(parent, world, cx, h - 1.1, cz - hd, door, 1.1, wall, mat, { tag: 'wall' });
  solid(parent, world, cx - (door / 2 + (w - door) / 4), 0, cz + hd, (w - door) / 2, h, wall, mat, { tag: 'wall' });
  solid(parent, world, cx + (door / 2 + (w - door) / 4), 0, cz + hd, (w - door) / 2, h, wall, mat, { tag: 'wall' });
  solid(parent, world, cx, h - 1.1, cz + hd, door, 1.1, wall, mat, { tag: 'wall' });
  solid(parent, world, cx - hw, 0, cz - (door / 2 + (d - door) / 4), wall, h, (d - door) / 2, mat, { tag: 'wall' });
  solid(parent, world, cx - hw, 0, cz + (door / 2 + (d - door) / 4), wall, h, (d - door) / 2, mat, { tag: 'wall' });
  solid(parent, world, cx - hw, h - 1.1, cz, wall, 1.1, door, mat, { tag: 'wall' });
  solid(parent, world, cx + hw, 0, cz - (door / 2 + (d - door) / 4), wall, h, (d - door) / 2, mat, { tag: 'wall' });
  solid(parent, world, cx + hw, 0, cz + (door / 2 + (d - door) / 4), wall, h, (d - door) / 2, mat, { tag: 'wall' });
  solid(parent, world, cx + hw, h - 1.1, cz, wall, 1.1, door, mat, { tag: 'wall' });

  solid(parent, world, cx, h, cz, w + .6, .5, d + .6, MAT.concrete, { tag: 'roof' });
  decor(parent, cx, h + .5, cz - hd, w + .6, .8, .35, MAT.dark);
  decor(parent, cx, h + .5, cz + hd, w + .6, .8, .35, MAT.dark);
  decor(parent, cx - hw, h + .5, cz, .35, .8, d + .6, MAT.dark);
  decor(parent, cx + hw, h + .5, cz, .35, .8, d + .6, MAT.dark);
  const side = cz > 0 ? -1 : 1;
  makeRamp(parent, world, cx, cz + side * (hd + 1.2), 3, h + .5, cz > 0 ? 'north' : 'south');

  world.addBox(aabbFromCenter(cx, 1.1, cz, 3, 2.2, 1.2, 'cover'));
  decor(parent, cx, 0, cz, 3, 2.2, 1.2, MAT.wood);

  if (site) {
    const l = new THREE.PointLight(0xffb050, 22, 22, 2);
    l.position.set(cx, h - 1, cz);
    parent.add(l);
  }
  return { cx, cz, w, d, h };
}

/* ---------------- watchtower ---------------- */
function buildTower(parent, world, x, z) {
  const legOff = 3.2, legH = 7.5;
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(o => {
    solid(parent, world, x + o[0] * legOff, 0, z + o[1] * legOff, .8, legH, .8, MAT.wood, { tag: 'cover' });
  });
  solid(parent, world, x, legH, z, legOff * 2 + 1.2, .7, legOff * 2 + 1.2, MAT.wood, { tag: 'deck' });
  const R = legOff + .6;
  decor(parent, x, legH + .7, z - R, R * 2, 1.1, .25, MAT.wood);
  decor(parent, x, legH + .7, z + R, R * 2, 1.1, .25, MAT.wood);
  decor(parent, x - R, legH + .7, z, .25, 1.1, R * 2, MAT.wood);
  decor(parent, x + R, legH + .7, z, .25, 1.1, R * 2, MAT.wood);
  solid(parent, world, x, legH + 3.2, z, R * 2 + 2, .45, R * 2 + 2, MAT.metal, { tag: 'roof' });
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(o => {
    solid(parent, world, x + o[0] * R, legH + .7, z + o[1] * R, .4, 2.5, .4, MAT.wood, { tag: 'cover' });
  });
  makeRamp(parent, world, x, z + legOff + 2.2, 3, legH + .7, 'north');
}

/* ---------------- barrel mesh ---------------- */
function barrelMesh(parent, world, x, z) {
  const g = new THREE.CylinderGeometry(.48, .48, 1.15, 12);
  const m = new THREE.Mesh(g, MAT.metal);
  m.position.set(x, .575, z);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(.51, .51, .12, 12), MAT.dark);
  ring.position.set(x, .82, z); parent.add(ring);
  const ring2 = ring.clone(); ring2.position.y = .32; parent.add(ring2);
  world.addBox(AABB(x - .48, 0, z - .48, x + .48, 1.15, z + .48, 'cover'));
  return m;
}

/* container: 2.9 m tall, climbable from a crate, solid wall from the ground */
function container(parent, world, x, z, rot, len) {
  len = len || 12;
  const w = 2.9, h = 2.9;
  solid(parent, world, x, 0, z, rot ? w : len, h, rot ? len : w, MAT.metal, { tag: 'cover' });
  decor(parent, x + (rot ? 0 : len / 2 - .06), h / 2, z + (rot ? len / 2 - .06 : 0),
    rot ? w + .1 : .12, h, rot ? .12 : w + .1, MAT.dark);
}

function sandbag(parent, world, x, z, len, rot) {
  for (let i = 0; i < len; i++) {
    const ox = rot ? 0 : (i - len / 2 + .5) * 1.15;
    const oz = rot ? (i - len / 2 + .5) * 1.15 : 0;
    solid(parent, world, x + ox, 0, z + oz, 1.15, .72, 1.15, MAT.sand, { tag: 'cover' });
    if (i % 2 === 0) solid(parent, world, x + ox, .72, z + oz, 1.15, .72, 1.15, MAT.sand, { tag: 'cover' });
  }
}

/* ============================================================
   MAP 1 — BANANA ARENA (the original layout)
   ============================================================ */
function buildMapArena(parent, world) {
  mapGround(parent, world);
  mapPerimeter(parent, world);

  const PH = 2.6, PS = 20;
  solid(parent, world, 0, 0, 0, PS, PH, PS, MAT.concrete, { tag: 'plat' });
  decor(parent, 0, PH, PS / 2 - .3, PS, .35, .6, MAT.dark);
  decor(parent, 0, PH, -PS / 2 + .3, PS, .35, .6, MAT.dark);
  decor(parent, PS / 2 - .3, PH, 0, .6, .35, PS, MAT.dark);
  decor(parent, -PS / 2 + .3, PH, 0, .6, .35, PS, MAT.dark);
  makeRamp(parent, world, 0, PS / 2, 4, PH, 'south');
  makeRamp(parent, world, 0, -PS / 2, 4, PH, 'north');
  makeRamp(parent, world, PS / 2, 0, 4, PH, 'east');
  makeRamp(parent, world, -PS / 2, 0, 4, PH, 'west');
  solid(parent, world, 0, PH, 0, 3.2, 1.5, 3.2, MAT.metal, { tag: 'cover' });
  solid(parent, world, 6.4, PH, 6.4, 1.8, 2.2, 1.8, MAT.wood, { tag: 'cover' });
  solid(parent, world, -6.4, PH, -6.4, 1.8, 2.2, 1.8, MAT.wood, { tag: 'cover' });

  const bd = 22;
  buildBuilding(parent, world, -bd, -bd, 18, 14, 5.2, 'A');
  buildBuilding(parent, world, bd, bd, 18, 14, 5.2, 'B');
  buildBuilding(parent, world, -bd, bd, 16, 12, 4.6, null);
  buildBuilding(parent, world, bd, -bd, 16, 12, 4.6, null);

  solid(parent, world, -34, 0, 0, 2, 3.4, 30, MAT.brick, { tag: 'wall' });
  solid(parent, world, 34, 0, 0, 2, 3.4, 30, MAT.brick, { tag: 'wall' });
  solid(parent, world, 0, 0, -34, 30, 3.4, 2, MAT.brick, { tag: 'wall' });
  solid(parent, world, 0, 0, 34, 30, 3.4, 2, MAT.brick, { tag: 'wall' });
  doorwayCut(parent, world, -34, 0, 'z', 30, 3.4, 2);
  doorwayCut(parent, world, 34, 0, 'z', 30, 3.4, 2);
  doorwayCut(parent, world, 0, -34, 'x', 30, 3.4, 2);
  doorwayCut(parent, world, 0, 34, 'x', 30, 3.4, 2);

  container(parent, world, -14, 32, false, 13);
  container(parent, world, 20, -36, true, 11);
  container(parent, world, -40, -18, true, 12);
  container(parent, world, 38, 16, false, 12);
  container(parent, world, -8, -46, false, 10);

  const rng = makeRng(90210);
  for (let i = 0; i < 40; i++) {
    const x = (rng() * 2 - 1) * 42, z = (rng() * 2 - 1) * 42;
    if (Math.hypot(x, z) < 15) continue;
    if (world.overlaps(x, .1, z, 1.3, 1.3)) continue;
    const s = .95 + rng() * .35;
    solid(parent, world, x, 0, z, s, s, s, MAT.wood, { tag: 'cover' });
    if (rng() < .45) solid(parent, world, x + s * .1, s, z - s * .1, s * .85, s * .85, s * .85, MAT.wood, { tag: 'cover' });
  }
  for (let i = 0; i < 22; i++) {
    const x = (rng() * 2 - 1) * 44, z = (rng() * 2 - 1) * 44;
    if (Math.hypot(x, z) < 15) continue;
    if (world.overlaps(x, .1, z, 1.1, 1.2)) continue;
    barrelMesh(parent, world, x, z);
  }

  sandbag(parent, world, -18, -20, 5, false);
  sandbag(parent, world, 18, 20, 5, false);
  sandbag(parent, world, -18, 20, 4, false);
  sandbag(parent, world, 18, -20, 4, false);
  sandbag(parent, world, -44, 8, 6, true);
  sandbag(parent, world, 44, -8, 6, true);

  [[-26, -26], [26, 26], [-26, 26], [26, -26]].forEach(p => {
    solid(parent, world, p[0], 0, p[1], 2.2, 6.5, 2.2, MAT.concrete, { tag: 'cover' });
    solid(parent, world, p[0], 6.5, p[1], 3.2, .5, 3.2, MAT.dark, { tag: 'cover' });
  });

  buildTower(parent, world, 0, -44);

  siteMesh(parent, MAT.siteA, -20, -20, 9);
  siteMesh(parent, MAT.siteB, 20, 20, 9);
  MAP.sites = { A: { x: -20, z: -20 }, B: { x: 20, z: 20 } };
}

/* ============================================================
   MAP 2 — WAREHOUSE: shelf rows, a loading dock and a mezzanine
   ============================================================ */
function buildMapWarehouse(parent, world) {
  mapGround(parent, world, { tint: 0xc9ccc4 });
  mapPerimeter(parent, world, MAT.concrete);

  // loading dock along the north wall, reachable by two ramps
  solid(parent, world, 0, 0, -36, 60, 1.7, 14, MAT.concrete, { tag: 'plat' });
  makeRamp(parent, world, -18, -28.4, 5, 1.7, 'south');
  makeRamp(parent, world, 18, -28.4, 5, 1.7, 'south');
  solid(parent, world, -18, 1.7, -36, 3, 1.0, 8, MAT.metal, { tag: 'cover' });
  solid(parent, world, 18, 1.7, -36, 3, 1.0, 8, MAT.metal, { tag: 'cover' });

  // long shelf rows split by a central cross aisle
  for (let i = 0; i < 6; i++) {
    const x = -30 + i * 12;
    solid(parent, world, x, 0, -14, 1.5, 4.3, 17, MAT.metal, { tag: 'cover' });
    solid(parent, world, x, 0, 15, 1.5, 4.3, 16, MAT.metal, { tag: 'cover' });
    // a low shelf section so you can climb onto the rack
    solid(parent, world, x, 2.2, -6.5, 1.5, 1.0, 3.0, MAT.wood, { tag: 'cover' });
  }
  // cross shelves
  for (let k = -1; k <= 1; k++) {
    const z = k * 8;
    solid(parent, world, -24, 0, z, 20, 3.4, 1.5, MAT.metal, { tag: 'cover' });
    solid(parent, world, 24, 0, z, 20, 3.4, 1.5, MAT.metal, { tag: 'cover' });
  }

  // mezzanine in the south-east corner
  solid(parent, world, 34, 0, 34, 20, 3.0, 20, MAT.concrete, { tag: 'plat' });
  makeRamp(parent, world, 34, 21.6, 5, 3.0, 'south');
  solid(parent, world, 34, 3.0, 34, 2.4, 1.2, 10, MAT.wood, { tag: 'cover' });

  // crate / pallet clutter
  const rng = makeRng(5150);
  for (let i = 0; i < 46; i++) {
    const x = (rng() * 2 - 1) * 44, z = (rng() * 2 - 1) * 44;
    if (Math.abs(z) < 10 && Math.abs(x) < 40) continue;
    if (world.overlaps(x, .1, z, 1.4, 1.4)) continue;
    const s = 1.0 + rng() * .5;
    solid(parent, world, x, 0, z, s, s, s, MAT.wood, { tag: 'cover' });
    if (rng() < .5) solid(parent, world, x, s, z, s * .9, s * .9, s * .9, MAT.wood, { tag: 'cover' });
  }
  for (let i = 0; i < 16; i++) {
    const x = (rng() * 2 - 1) * 44, z = (rng() * 2 - 1) * 44;
    if (world.overlaps(x, .1, z, 1.1, 1.2)) continue;
    barrelMesh(parent, world, x, z);
  }

  sandbag(parent, world, -44, -20, 5, true);
  sandbag(parent, world, 44, 20, 5, true);

  buildTower(parent, world, -42, 42);

  siteMesh(parent, MAT.siteA, -34, 30, 8);
  siteMesh(parent, MAT.siteB, 36, -6, 8);
  MAP.sites = { A: { x: -34, z: 30 }, B: { x: 36, z: -6 } };
}

/* ============================================================
   MAP 3 — TOWERS: verticality, four corner towers joined by catwalks
   ============================================================ */
function buildMapTowers(parent, world) {
  mapGround(parent, world);
  mapPerimeter(parent, world);

  // four corner towers with decks at ~6 m
  const T = [[-34, -34], [34, -34], [-34, 34], [34, 34]];
  T.forEach(t => buildTower(parent, world, t[0], t[1]));

  // catwalks joining adjacent towers (solid decks with rails). They are well
  // above the nav sample window, so the arena floor stays walkable underneath.
  const deckH = 6.5, deckW = 3.2;
  const edge = (x, z, w, d) => {
    solid(parent, world, x, deckH, z, w, .55, d, MAT.metal, { tag: 'deck' });
    if (w > d) {
      decor(parent, x, deckH + .55, z - d / 2 + .2, w, 1.0, .25, MAT.metal);
      decor(parent, x, deckH + .55, z + d / 2 - .2, w, 1.0, .25, MAT.metal);
    } else {
      decor(parent, x - w / 2 + .2, deckH + .55, z, .25, 1.0, d, MAT.metal);
      decor(parent, x + w / 2 - .2, deckH + .55, z, .25, 1.0, d, MAT.metal);
    }
  };
  edge(0, -34, 68, deckW);
  edge(0, 34, 68, deckW);
  edge(-34, 0, deckW, 68);
  edge(34, 0, deckW, 68);

  // central raised bunker with ramps (an objective point)
  solid(parent, world, 0, 0, 0, 16, 2.4, 16, MAT.concrete, { tag: 'plat' });
  makeRamp(parent, world, 0, 10.2, 5, 2.4, 'south');
  makeRamp(parent, world, 0, -10.2, 5, 2.4, 'north');
  solid(parent, world, 0, 2.4, 0, 4, 1.6, 4, MAT.metal, { tag: 'cover' });

  // ground cover so the open floor is not a killing field
  container(parent, world, -14, 10, false, 12);
  container(parent, world, 14, -10, true, 12);
  const rng = makeRng(3110);
  for (let i = 0; i < 34; i++) {
    const x = (rng() * 2 - 1) * 42, z = (rng() * 2 - 1) * 42;
    if (Math.abs(x) < 12 && Math.abs(z) < 12) continue;
    if (world.overlaps(x, .1, z, 1.3, 1.3)) continue;
    const s = .95 + rng() * .4;
    solid(parent, world, x, 0, z, s, s, s, MAT.wood, { tag: 'cover' });
  }
  sandbag(parent, world, -20, 0, 4, true);
  sandbag(parent, world, 20, 0, 4, true);
  sandbag(parent, world, 0, -20, 4, false);
  sandbag(parent, world, 0, 20, 4, false);

  siteMesh(parent, MAT.siteA, 0, -24, 8);
  siteMesh(parent, MAT.siteB, 0, 24, 8);
  MAP.sites = { A: { x: 0, z: -24 }, B: { x: 0, z: 24 } };
}

/* ============================================================
   MAP 4 — CRATES: a climbable crate maze (the vaulting playground)
   ============================================================ */
function buildMapCrates(parent, world) {
  mapGround(parent, world, { tint: 0xc6c0b2 });
  mapPerimeter(parent, world, MAT.brick);

  // A grid of stacked crates with wide corridors between blocks. Blocks are kept
  // modest in height (1–2 crates) so the floor plan stays open and connected.
  const rng = makeRng(7777);
  const block = (cx, cz) => {
    const s = 1.15;
    const h = 1 + Math.floor(rng() * 2);           // 1 or 2 crates tall
    for (let iy = 0; iy < h; iy++) {
      for (let ix = -1; ix <= 1; ix++) {
        for (let iz = -1; iz <= 1; iz++) {
          if (iy === h - 1 && rng() < .45 && (ix !== 0 || iz !== 0)) continue;
          solid(parent, world, cx + ix * s, iy * s, cz + iz * s, s * .94, s * .94, s * .94, MAT.wood, { tag: 'cover' });
        }
      }
    }
  };
  for (let gx = -2; gx <= 2; gx++) {
    for (let gz = -2; gz <= 2; gz++) {
      const x = gx * 18, z = gz * 18;
      if (Math.hypot(x, z) < 10) continue;          // keep a clear centre
      block(x, z);
    }
  }

  // centre: a stepped pyramid you can climb to the top of (0.55 m steps keep it
  // walkable for the player AND navigable for the horde)
  for (let k = 0; k < 8; k++) {
    const size = 12 - k * 1.35;
    solid(parent, world, 0, k * 0.55, 0, size, 0.55, size, MAT.concrete, { tag: 'plat' });
  }

  // sandbag lines and a few tall pillars for sightline breaks
  sandbag(parent, world, -40, -40, 6, false);
  sandbag(parent, world, 40, 40, 6, false);
  sandbag(parent, world, -40, 40, 6, true);
  sandbag(parent, world, 40, -40, 6, true);
  [[-30, 0], [30, 0], [0, -30], [0, 30]].forEach(p => {
    solid(parent, world, p[0], 0, p[1], 2.0, 5.0, 2.0, MAT.concrete, { tag: 'cover' });
  });
  container(parent, world, -30, 24, false, 12);
  container(parent, world, 30, -24, true, 12);

  siteMesh(parent, MAT.siteA, -18, -18, 8);
  siteMesh(parent, MAT.siteB, 18, 18, 8);
  MAP.sites = { A: { x: -18, z: -18 }, B: { x: 18, z: 18 } };
}

/* ============================================================
   MAP 5 — DESERT: open dunes, rocks and ruins (long sightlines)
   ============================================================ */
function buildMapDesert(parent, world) {
  mapGround(parent, world, { tint: 0xd9c48d });
  mapPerimeter(parent, world, MAT.sand);

  const rng = makeRng(4242);
  // low dunes: wide, gently stepped platforms
  for (let i = 0; i < 26; i++) {
    const x = (rng() * 2 - 1) * 44, z = (rng() * 2 - 1) * 44;
    if (Math.hypot(x, z) < 8) continue;
    if (world.overlaps(x, .1, z, 4.5, 1.0)) continue;
    const w = 7 + rng() * 9, d = 7 + rng() * 9, h = .7 + rng() * .9;
    solid(parent, world, x, 0, z, w, h, d, MAT.sand, { tag: 'cover' });
  }
  // rock formations: tall, unclimbable cover
  for (let i = 0; i < 14; i++) {
    const x = (rng() * 2 - 1) * 42, z = (rng() * 2 - 1) * 42;
    if (Math.hypot(x, z) < 10) continue;
    if (world.overlaps(x, .1, z, 3.4, 3)); continue;
    const w = 2.6 + rng() * 3.4, d = 2.6 + rng() * 3.4, h = 4.2 + rng() * 3.2;
    solid(parent, world, x, 0, z, w, h, d, MAT.brick, { tag: 'wall' });
    solid(parent, world, x, h, z, w * .8, .4, d * .8, MAT.sand, { tag: 'cover' });
  }

  // ruined compound in the north
  const rx = 0, rz = -36;
  solid(parent, world, rx - 14, 0, rz, 20, 3.6, 1.8, MAT.brick, { tag: 'wall' });
  solid(parent, world, rx + 14, 0, rz, 20, 3.6, 1.8, MAT.brick, { tag: 'wall' });
  solid(parent, world, rx, 0, rz - 0, 1.8, 3.6, 10, MAT.brick, { tag: 'wall' });
  solid(parent, world, rx, 0, rz + 12, 34, 3.6, 1.8, MAT.brick, { tag: 'wall' });
  doorwayCut(parent, world, rx, rz + 12, 'x', 34, 3.6, 1.8);
  solid(parent, world, rx, 0, rz + 4, 6, 2.2, 6, MAT.concrete, { tag: 'plat' });
  makeRamp(parent, world, rx + 5, rz + 4, 3.5, 2.2, 'east');

  // a wrecked container and a water tower
  container(parent, world, -30, 30, false, 12);
  buildTower(parent, world, 34, 26);

  sandbag(parent, world, -10, 24, 5, false);
  sandbag(parent, world, 12, 20, 5, false);
  sandbag(parent, world, -26, -6, 5, true);

  siteMesh(parent, MAT.siteA, -26, 6, 8);
  siteMesh(parent, MAT.siteB, 30, -14, 8);
  MAP.sites = { A: { x: -26, z: 6 }, B: { x: 30, z: -14 } };
}

/* ---------------- bomb site marker ---------------- */
function siteMesh(parent, mat, x, z, s) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, .02, z);
  m.renderOrder = 1;
  parent.add(m);
  return m;
}

/* ============================================================
   MAP 6 — ГОРОД: streets between ruined blocks (room-to-room fights)
   ============================================================ */
function buildMapCity(parent, world) {
  mapGround(parent, world, { tint: 0x9aa0a6 });
  mapPerimeter(parent, world, MAT.concrete);

  // a grid of city blocks with a cross-shaped avenue between them
  const B = 15;
  for (let gx = -2; gx <= 2; gx++) {
    for (let gz = -2; gz <= 2; gz++) {
      if (gx === 0 || gz === 0) continue;                  // leave the avenues open
      const cx = gx * 22, cz = gz * 22;
      const w = B - 5 + Math.abs(gx), d = B - 5 + Math.abs(gz);
      const h = 6 + ((gx + gz + 4) % 3) * 2.4;
      buildBuilding(parent, world, cx, cz, w, d, h, (gx === 1 && gz === 1) ? 'A' : (gx === -1 && gz === -1) ? 'B' : null);
      // rooftop parapet bits to break silhouettes
      solid(parent, world, cx, h, cz, w + 1, .5, .6, MAT.dark, { tag: 'cover' });
    }
  }
  // avenue cover: cars (low metal boxes), planters and a bus wreck
  const rng = makeRng(20240);
  for (let i = 0; i < 26; i++) {
    const alongX = rng() < .5;
    const x = alongX ? (rng() * 2 - 1) * 46 : (rng() < .5 ? -11 : 11) + (rng() * 2 - 1) * 2;
    const z = alongX ? ((rng() < .5 ? -11 : 11) + (rng() * 2 - 1) * 2) : (rng() * 2 - 1) * 46;
    if (world.overlaps(x, .1, z, 2.4, 1.4)) continue;
    const w = 3.4 + rng() * 1.2, d = 1.8;
    solid(parent, world, x, .25, z, alongX ? d : w, .9, alongX ? w : d, alongX ? MAT.metal : MAT.wood, { tag: 'cover' });
  }
  // street props
  for (let i = 0; i < 20; i++) {
    const x = (rng() * 2 - 1) * 46, z = (rng() * 2 - 1) * 46;
    if (world.overlaps(x, .1, z, 1.0, 1.0)) continue;
    barrelMesh(parent, world, x, z);
  }
  // central plaza with sandbags (objective)
  solid(parent, world, 0, 0, 0, 10, .8, 10, MAT.sand, { tag: 'plat' });
  makeRamp(parent, world, 0, 6.6, 4, .8, 'south');
  sandbag(parent, world, -8, 0, 5, true);
  sandbag(parent, world, 8, 0, 5, true);
  sandbag(parent, world, 0, -8, 5, false);

  container(parent, world, -42, 20, true, 12);
  container(parent, world, 42, -20, false, 12);
  buildTower(parent, world, 40, 40);

  siteMesh(parent, MAT.siteA, 22, 22, 9);
  siteMesh(parent, MAT.siteB, -22, -22, 9);
  MAP.sites = { A: { x: 22, z: 22 }, B: { x: -22, z: -22 } };
}

/* ============================================================
   MAP 7 — БУНКЕР: a tight indoor maze of corridors and rooms
   ============================================================ */
function buildMapBunker(parent, world) {
  mapGround(parent, world, { tint: 0x8c949c });
  mapPerimeter(parent, world, MAT.metal);

  // Outer ring corridor wall with doorways, and an inner core.
  const H = 4.2, T = 1.4;
  const wall = (x, z, w, d) => solid(parent, world, x, 0, z, w, H, d, MAT.metal, { tag: 'wall' });
  // outer square (36 half-size) with doors on each side
  wall(0, -36, 72, T); wall(0, 36, 72, T); wall(-36, 0, T, 72); wall(36, 0, T, 72);
  doorwayCut(parent, world, 0, -36, 'x', 72, H, T);
  doorwayCut(parent, world, 0, 36, 'x', 72, H, T);
  doorwayCut(parent, world, -36, 0, 'z', 72, H, T);
  doorwayCut(parent, world, 36, 0, 'z', 72, H, T);
  // inner square (16 half-size) — the vault
  wall(0, -16, 32, T); wall(0, 16, 32, T); wall(-16, 0, T, 32); wall(16, 0, T, 32);
  doorwayCut(parent, world, 0, -16, 'x', 32, H, T);
  doorwayCut(parent, world, 0, 16, 'x', 32, H, T);
  doorwayCut(parent, world, -16, 0, 'z', 32, H, T);
  doorwayCut(parent, world, 16, 0, 'z', 32, H, T);

  // radial dividers making the ring a maze of rooms
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const x = Math.cos(a) * 26, z = Math.sin(a) * 26;
    if (Math.abs(Math.cos(a)) > Math.abs(Math.sin(a))) wall(x, z, T, 18);
    else wall(x, z, 18, T);
  }
  // central objective inside the vault
  solid(parent, world, 0, 0, 0, 8, 1.6, 8, MAT.concrete, { tag: 'plat' });
  makeRamp(parent, world, 0, 5, 3.2, 1.6, 'south');
  solid(parent, world, 0, 1.6, 0, 2.4, 1.2, 2.4, MAT.metal, { tag: 'cover' });

  // crates and barrels in the rooms
  const rng = makeRng(8888);
  for (let i = 0; i < 34; i++) {
    const x = (rng() * 2 - 1) * 32, z = (rng() * 2 - 1) * 32;
    if (Math.hypot(x, z) < 12) continue;
    if (world.overlaps(x, .1, z, 1.3, 1.3)) continue;
    const s = 1.0 + rng() * .4;
    solid(parent, world, x, 0, z, s, s, s, MAT.wood, { tag: 'cover' });
  }
  for (let i = 0; i < 14; i++) {
    const x = (rng() * 2 - 1) * 32, z = (rng() * 2 - 1) * 32;
    if (world.overlaps(x, .1, z, 1.0, 1.0)) continue;
    barrelMesh(parent, world, x, z);
  }

  siteMesh(parent, MAT.siteA, -27, 0, 7);
  siteMesh(parent, MAT.siteB, 27, 0, 7);
  MAP.sites = { A: { x: -27, z: 0 }, B: { x: 27, z: 0 } };
}

/* ============================================================
   MAP 8 — КРЫШИ: rooftop platforms over a lethal drop (parkour)
   ============================================================ */
function buildMapRooftops(parent, world) {
  mapGround(parent, world, { tint: 0x6f7780 });
  mapPerimeter(parent, world, MAT.concrete);

  // a grid of rooftop "islands" at varying heights, linked by planks/ramps.
  const rng = makeRng(13579);
  const roofs = [
    [-24, -24, 20, 20, 3.2], [24, -24, 18, 18, 4.6], [-24, 24, 18, 22, 2.4],
    [24, 24, 22, 18, 5.4], [0, 0, 20, 20, 6.0], [-40, 0, 12, 26, 1.6],
    [40, 0, 12, 26, 3.8], [0, -40, 26, 12, 2.8], [0, 40, 26, 12, 4.2]
  ];
  roofs.forEach(r => {
    const x = r[0], z = r[1], w = r[2], d = r[3], h = r[4];
    solid(parent, world, x, 0, z, w, h, d, MAT.concrete, { tag: 'plat' });
    // parapet
    solid(parent, world, x, h, z - d / 2 + .5, w, 1.0, .5, MAT.dark, { tag: 'cover' });
    solid(parent, world, x, h, z + d / 2 - .5, w, 1.0, .5, MAT.dark, { tag: 'cover' });
    solid(parent, world, x - w / 2 + .5, h, z, .5, 1.0, d, MAT.dark, { tag: 'cover' });
    solid(parent, world, x + w / 2 - .5, h, z, .5, 1.0, d, MAT.dark, { tag: 'cover' });
    // rooftop clutter / cover
    for (let i = 0; i < 4; i++) {
      const cx = x + (rng() * 2 - 1) * (w / 2 - 3), cz = z + (rng() * 2 - 1) * (d / 2 - 3);
      if (world.overlaps(cx, h + .1, cz, 1.2, 1.2)) continue;
      const s = 1.0 + rng() * .5;
      solid(parent, world, cx, h, cz, s, s, s, MAT.wood, { tag: 'cover' });
    }
  });
  // ramps up to the central roof from two sides
  makeRamp(parent, world, 0, 11.2, 4.5, 6.0, 'south');
  makeRamp(parent, world, 0, -11.2, 4.5, 6.0, 'north');
  // ground-level cover beneath the roofs so it is not a total death trap
  for (let i = 0; i < 22; i++) {
    const x = (rng() * 2 - 1) * 44, z = (rng() * 2 - 1) * 44;
    if (world.overlaps(x, .1, z, 1.4, 1.4)) continue;
    const s = 1.0 + rng() * .5;
    solid(parent, world, x, 0, z, s, s, s, MAT.wood, { tag: 'cover' });
  }
  sandbag(parent, world, -40, -40, 5, false);
  sandbag(parent, world, 40, 40, 5, false);

  siteMesh(parent, MAT.siteA, 0, -40, 7);
  siteMesh(parent, MAT.siteB, 0, 40, 7);
  MAP.sites = { A: { x: 0, z: -40 }, B: { x: 0, z: 40 } };
}

/* ============================================================
   MAP 9 — ЛАБОРАТОРИЯ: clean sci-fi rooms with glass partitions
   ============================================================ */
function buildMapLab(parent, world) {
  mapGround(parent, world, { tint: 0xc4ccd4 });
  mapPerimeter(parent, world, MAT.metal);

  const H = 4.0, T = 0.6;
  // a clean grid of glass-partitioned rooms
  const cell = 18;
  const wallPiece = (x, z, w, d, mat) => solid(parent, world, x, 0, z, w, H, d, mat || MAT.metal, { tag: 'wall' });
  // four long partition lines with doors
  for (let i = -1; i <= 1; i++) {
    const z = i * cell;
    wallPiece(0, z, 86, T);
    doorwayCut(parent, world, 0, z, 'x', 86, H, T);
    doorwayCut(parent, world, i * 38, z, 'x', 86, H, T);
    wallPiece(z, 0, T, 86);
    doorwayCut(parent, world, z, 0, 'z', 86, H, T);
    doorwayCut(parent, world, z, i * 38, 'z', 86, H, T);
  }
  // central hazardous reactor (a tall glowing-ish core)
  solid(parent, world, 0, 0, 0, 10, 5.0, 10, MAT.metal, { tag: 'wall' });
  solid(parent, world, 0, 5.0, 0, 6, 1.2, 6, MAT.dark, { tag: 'cover' });
  solid(parent, world, 0, 0, 0, 14, .8, 14, MAT.concrete, { tag: 'plat' });
  makeRamp(parent, world, 0, 8, 4, .8, 'south');
  makeRamp(parent, world, 0, -8, 4, .8, 'north');

  // lab benches / equipment cover in the rooms
  const rng = makeRng(24680);
  for (let i = 0; i < 40; i++) {
    const x = (rng() * 2 - 1) * 44, z = (rng() * 2 - 1) * 44;
    if (Math.hypot(x, z) < 12) continue;
    if (world.overlaps(x, .1, z, 1.6, 1.2)) continue;
    const w = 1.6 + rng() * 1.4, d = 1.0;
    solid(parent, world, x, 0, z, rng() < .5 ? w : d, 1.1, rng() < .5 ? d : w, MAT.metal, { tag: 'cover' });
  }
  // server racks and crates
  for (let i = 0; i < 18; i++) {
    const x = (rng() * 2 - 1) * 44, z = (rng() * 2 - 1) * 44;
    if (world.overlaps(x, .1, z, 1.0, 1.0)) continue;
    barrelMesh(parent, world, x, z);
  }
  container(parent, world, -40, 40, true, 12);
  container(parent, world, 40, -40, false, 12);

  siteMesh(parent, MAT.siteA, -30, -30, 8);
  siteMesh(parent, MAT.siteB, 30, 30, 8);
  MAP.sites = { A: { x: -30, z: -30 }, B: { x: 30, z: 30 } };
}

/* ============================================================
   MAP 10 — АРЕНА СМЕРТИ: a circular pit with a ring of pillars
   ============================================================ */
function buildMapPit(parent, world) {
  mapGround(parent, world, { tint: 0x7a6a5a });
  mapPerimeter(parent, world, MAT.brick);

  // a raised circular arena wall (built from short segments) with four gates
  const R = 40, H = 5.5;
  const SEG = 40;
  for (let i = 0; i < SEG; i++) {
    const a = (i / SEG) * Math.PI * 2;
    // leave gaps at the four compass points for entrances
    const deg = (a * 180 / Math.PI);
    if (Math.min(Math.abs(deg - 0), Math.abs(deg - 90), Math.abs(deg - 180), Math.abs(deg - 270), Math.abs(deg - 360)) < 9) continue;
    const x = Math.cos(a) * R, z = Math.sin(a) * R;
    const w = (2 * Math.PI * R / SEG) * 1.15;
    solid(parent, world, x, 0, z, w, H, 2.2, MAT.brick, { tag: 'wall', rotY: -a });
  }
  // central pit: a sunken floor you can drop into, with ramps out
  solid(parent, world, 0, 0, 0, 22, .4, 22, MAT.dark, { tag: 'plat' });
  makeRamp(parent, world, 0, 12, 4, .4, 'south');
  makeRamp(parent, world, 0, -12, 4, .4, 'north');
  makeRamp(parent, world, 12, 0, 4, .4, 'east');
  makeRamp(parent, world, -12, 0, 4, .4, 'west');
  // ring of tall pillars between pit and wall
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + Math.PI / 12;
    const x = Math.cos(a) * 28, z = Math.sin(a) * 28;
    solid(parent, world, x, 0, z, 2.2, 6.0, 2.2, MAT.concrete, { tag: 'cover' });
    solid(parent, world, x, 6.0, z, 3.0, .5, 3.0, MAT.dark, { tag: 'cover' });
  }
  // scattered cover and hazards
  const rng = makeRng(31415);
  for (let i = 0; i < 28; i++) {
    const x = (rng() * 2 - 1) * 36, z = (rng() * 2 - 1) * 36;
    if (Math.hypot(x, z) < 14) continue;
    if (world.overlaps(x, .1, z, 1.4, 1.4)) continue;
    const s = 1.0 + rng() * .5;
    solid(parent, world, x, 0, z, s, s, s, MAT.wood, { tag: 'cover' });
  }
  for (let i = 0; i < 18; i++) {
    const x = (rng() * 2 - 1) * 36, z = (rng() * 2 - 1) * 36;
    if (world.overlaps(x, .1, z, 1.0, 1.0)) continue;
    barrelMesh(parent, world, x, z);
  }
  sandbag(parent, world, 20, 20, 5, false);
  sandbag(parent, world, -20, -20, 5, false);
  container(parent, world, -34, 8, true, 11);
  container(parent, world, 34, -8, false, 11);

  siteMesh(parent, MAT.siteA, -18, 18, 8);
  siteMesh(parent, MAT.siteB, 18, -18, 8);
  MAP.sites = { A: { x: -18, z: 18 }, B: { x: 18, z: -18 } };
}

/* ---------------- registry ---------------- */
const MAPS = [
  { id: 'arena',     name: 'БАНАНОВАЯ АРЕНА', short: 'АРЕНА',   desc: 'Центральная платформа и четыре здания', build: buildMapArena },
  { id: 'warehouse', name: 'СКЛАД',           short: 'СКЛАД',   desc: 'Стеллажи, пандус и антресоль',          build: buildMapWarehouse },
  { id: 'towers',    name: 'ВЫШКИ',           short: 'ВЫШКИ',   desc: 'Вертикальный бой: вышки и мосты',       build: buildMapTowers },
  { id: 'crates',    name: 'ЯЩИКИ',           short: 'ЯЩИКИ',   desc: 'Лабиринт из ящиков — залезай и стреляй', build: buildMapCrates },
  { id: 'desert',    name: 'ПУСТЫНЯ',         short: 'ПУСТЫНЯ', desc: 'Дюны, скалы и руины',                   build: buildMapDesert },
  { id: 'city',      name: 'ГОРОД',           short: 'ГОРОД',   desc: 'Улицы между руин — бой в переулках',    build: buildMapCity },
  { id: 'bunker',    name: 'БУНКЕР',          short: 'БУНКЕР',  desc: 'Тесный лабиринт коридоров и комнат',    build: buildMapBunker },
  { id: 'rooftops',  name: 'КРЫШИ',           short: 'КРЫШИ',   desc: 'Паркур по крышам над пропастью',        build: buildMapRooftops },
  { id: 'lab',       name: 'ЛАБОРАТОРИЯ',     short: 'ЛАБА',    desc: 'Стерильные комнаты и реактор в центре', build: buildMapLab },
  { id: 'pit',       name: 'АРЕНА СМЕРТИ',    short: 'ПИТ',     desc: 'Круглая яма, колонны и проходы',        build: buildMapPit }
];

function mapById(id) {
  return MAPS.find(m => m.id === id) || MAPS[0];
}

/* ============================================================
   BUILD / REBUILD
   ============================================================ */
function disposeGroupDeep(g) {
  if (!g) return;
  g.traverse(o => {
    if (o.geometry) o.geometry.dispose();
  });
}

function buildMap(scene, quality, mapId) {
  MAP.scene = scene;
  MAP.id = mapById(mapId).id;
  MAP.def = mapById(mapId);

  // tear down the previous arena (everything lives under MAP.group)
  if (MAP.group) {
    scene.remove(MAP.group);
    disposeGroupDeep(MAP.group);
  }

  buildMaterials();

  const group = MAP.group = new THREE.Group();
  scene.add(group);
  const world = MAP.world = new CollisionWorld();

  MAP.playerSpawns = [];
  MAP.zombieSpawns = [];
  MAP.sites = {};
  MAP.aimRoom = null;
  MAP.destructibles = [];
  MAP._chunkGid = 0;
  MAP._chunkGroups = {};

  MAP.def.build(group, world);

  /* все разрушаемые чанки собираются в InstancedMesh — сотни кусков дают
     несколько draw call вместо сотен (важно для телефона) */
  _buildChunkInstances();

  buildAimRoom(group, world);
  buildLighting(group, quality);
  buildSky(group);

  MAP.nav = buildNav(world, MAP);

  scene.fog = new THREE.FogExp2(MAP.def.fog || 0xbcc6cf, MAP.def.fogDensity || 0.0055);

  computeSpawns(world);
  if (typeof Game !== 'undefined' && Game.applyTimeOfDay) { try { Game.applyTimeOfDay(); } catch (e) { } }
  return MAP;
}

function buildSky(parent) {
  const skyGeo = new THREE.SphereGeometry(340, 32, 20);
  const skyMat = new THREE.MeshBasicMaterial({
    map: canvasTexture(TEXTURES.sky, 1, 1),
    side: THREE.BackSide,
    fog: false,
    depthWrite: false
  });
  skyMat.map.repeat.set(1, 1);
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.renderOrder = -1000;
  sky.frustumCulled = false;
  parent.add(sky);
  parent.userData.sky = sky;
}

/* player + zombie spawns, validated against the world */
function computeSpawns(world) {
  const clearAt = (x, z, radius, height) => {
    const g = world.groundAt(x, z, 3);
    if (g === null || g === undefined) return false;
    if (Math.abs(g) > 0.001) return false;          // must be on the flat arena floor
    if (world.overlaps(x, g + 0.06, z, radius, height)) return false;
    return !world.overlaps(x, g + 0.06, z, radius + 0.5, height * 0.5);
  };

  const candidates = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    candidates.push({ x: Math.cos(a) * 42, z: Math.sin(a) * 42 });
  }
  candidates.push({ x: 0, z: 42 }, { x: 42, z: 0 }, { x: 0, z: -40 }, { x: -42, z: 0 });
  candidates.push({ x: -30, z: 30 }, { x: 30, z: -30 }, { x: 30, z: 30 }, { x: -30, z: -30 });

  MAP.playerSpawns = [];
  for (let i = 0; i < candidates.length && MAP.playerSpawns.length < 10; i++) {
    const c = candidates[i];
    if (!clearAt(c.x, c.z, CFG.playerRadius + 0.05, CFG.playerHeight)) continue;
    if (MAP.playerSpawns.some(s => Math.hypot(s.x - c.x, s.z - c.z) < 9)) continue;
    MAP.playerSpawns.push({ x: c.x, y: 0, z: c.z });
  }
  if (MAP.playerSpawns.length === 0) MAP.playerSpawns.push({ x: 0, y: 0, z: 42 });
  MAP.spawns = MAP.playerSpawns.map(p => ({ x: p.x, z: p.z }));

  MAP.zombieSpawns = [];
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    for (let r = 46; r >= 24; r -= 3) {
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.abs(x) > MAP.size / 2 - 4 || Math.abs(z) > MAP.size / 2 - 4) continue;
      if (world.overlaps(x, (world.groundAt(x, z, 3) || 0) + 0.06, z, 0.55, 1.4)) continue;
      MAP.zombieSpawns.push({ x: x, y: 0.1, z: z });
      break;
    }
  }
  if (MAP.zombieSpawns.length < 6) {
    MAP.zombieSpawns = [{ x: 0, z: 42 }, { x: 42, z: 0 }, { x: 0, z: -36 }, { x: -42, z: 0 }];
  }
  // Prefer spawn points the horde can actually walk from. A point sealed in by
  // geometry would spawn a zombie that just presses against a rock forever.
  if (MAP.nav) {
    const good = MAP.zombieSpawns.filter(s => MAP.nav.ok(MAP.nav.nearest(s.x, s.z)));
    if (good.length >= 6) MAP.zombieSpawns = good;
  }
  MAP.spawnReport = {
    players: MAP.playerSpawns.map(s => '(' + s.x + ',' + s.z + ')').join(' '),
    zombies: MAP.zombieSpawns.length
  };
}

/* ============================================================
   AIM-TRAINING ROOM
   A sealed room outside the arena, used by the test range. It is rebuilt with
   the map (cheap) and `MAP.aimRoom` describes its bounds and entry point.
   ============================================================ */
function buildAimRoom(parent, world) {
  const cx = 0, cz = -84;
  const halfW = 15, halfD = 22;
  const H = 8, T = 1.6;
  const minX = cx - halfW, maxX = cx + halfW;
  const minZ = cz - halfD, maxZ = cz + halfD;

  world.addBox(AABB(cx - (halfW + T), -2, cz - (halfD + T), cx + (halfW + T), 0, cz + (halfD + T), 'ground'));
  const gpMat = MAT.floor.clone();
  gpMat.map = canvasTexture(TEXTURES.floor, 4, 4);
  const gp = new THREE.Mesh(new THREE.PlaneGeometry(halfW * 2 + T * 2, halfD * 2 + T * 2), gpMat);
  gp.rotation.x = -Math.PI / 2;
  gp.position.set(cx, .01, cz);
  gp.receiveShadow = true;
  parent.add(gp);

  solid(parent, world, minX - T / 2, 0, cz, T, H, halfD * 2 + T * 2, MAT.concrete, { tag: 'wall' });
  solid(parent, world, maxX + T / 2, 0, cz, T, H, halfD * 2 + T * 2, MAT.concrete, { tag: 'wall' });
  solid(parent, world, cx, 0, minZ - T / 2, halfW * 2 + T * 2, H, T, MAT.concrete, { tag: 'wall' });
  solid(parent, world, cx, 0, maxZ + T / 2, halfW * 2 + T * 2, H, T, MAT.concrete, { tag: 'wall' });

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(halfW * 2 + T * 2, .5, halfD * 2 + T * 2),
    MAT.dark
  );
  roof.position.set(cx, H + .25, cz);
  roof.castShadow = false; roof.receiveShadow = true;
  parent.add(roof);

  const roomHemi = new THREE.HemisphereLight(0xdfe9f5, 0x8a8070, 2.4);
  roomHemi.position.set(cx, H * .6, cz);
  parent.add(roomHemi);

  const roomSun = new THREE.DirectionalLight(0xfff6e6, 2.6);
  roomSun.position.set(cx + 12, H + 10, cz + 14);
  roomSun.target.position.set(cx, 0, cz);
  parent.add(roomSun.target);
  parent.add(roomSun);

  const roomSun2 = new THREE.DirectionalLight(0xdfe9f5, 1.1);
  roomSun2.position.set(cx - 14, H + 8, cz - 16);
  roomSun2.target.position.set(cx, 0, cz);
  parent.add(roomSun2.target);
  parent.add(roomSun2);

  const roomAmb = new THREE.AmbientLight(0xffffff, 0.55);
  parent.add(roomAmb);

  const roomLights = [roomHemi, roomSun, roomSun2, roomAmb];

  const line = (z, w, col) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, .18),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .5, fog: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(cx, .02, z);
    m.renderOrder = 1;
    parent.add(m);
  };
  line(maxZ - 3, halfW * 2 - 1, 0xff9d21);
  for (let d = 10; d <= 35; d += 5) line(maxZ - 3 - d, halfW * 1.4, 0x4aa3ff);

  for (let d = 10; d <= 35; d += 5) {
    const c = makeCanvas(64); c.height = 64;
    const g2 = c.getContext('2d');
    g2.fillStyle = 'rgba(74,163,255,.85)';
    g2.font = 'bold 44px Arial'; g2.textAlign = 'center'; g2.textBaseline = 'middle';
    g2.fillText(String(d), 32, 34);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.7),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, fog: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(cx - 6, .03, maxZ - 3 - d);
    m.renderOrder = 2;
    parent.add(m);
  }

  MAP.aimRoom = {
    minX: minX, maxX: maxX, minZ: minZ, maxZ: maxZ,
    entry: { x: cx, z: maxZ - 3, yaw: 0 },
    floorY: 0,
    lights: roomLights
  };
  setAimRoomLights(false);
  return MAP.aimRoom;
}

/* Aim-room lights are global in three.js, so they are switched on only while
   the player is inside the room. Otherwise they brighten the whole arena. */
function setAimRoomLights(on) {
  const room = MAP.aimRoom;
  if (!room || !room.lights) return;
  for (const l of room.lights) l.visible = !!on;
}

/* ---------------- lighting ---------------- */
function buildLighting(parent, quality) {
  const hemi = new THREE.HemisphereLight(0xbdd6f2, 0x554e42, 0.85);
  parent.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff2dc, 2.0);
  sun.position.set(48, 72, 26);
  sun.target.position.set(0, 0, 0);
  parent.add(sun.target);
  parent.add(sun);
  // tagged so the day/night toggle can dim and cool it
  sun.userData.dayLight = true;
  sun.userData.dayIntensity = 2.0;

  const shadowSize = quality === 0 ? 1024 : quality === 1 ? 2048 : 4096;
  sun.castShadow = true;
  sun.shadow.mapSize.width = shadowSize;
  sun.shadow.mapSize.height = shadowSize;
  const d = 82;
  sun.shadow.camera.left = -d; sun.shadow.camera.right = d;
  sun.shadow.camera.top = d; sun.shadow.camera.bottom = -d;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 290;
  sun.shadow.bias = -0.0012;
  sun.shadow.normalBias = 0.055;
  sun.shadow.camera.updateProjectionMatrix();
  parent.userData.sun = sun;

  const amb = new THREE.AmbientLight(0xffffff, 0.18);
  parent.add(amb);

  return { sun, hemi };
}

/* ============================================================
   NAVIGATION GRID + A*
   ============================================================ */
function buildNav(world, map) {
  const cell = 1.0;
  const minX = -map.size / 2 + 1, maxX = map.size / 2 - 1;
  const minZ = -map.size / 2 + 1, maxZ = map.size / 2 - 1;
  const W = Math.ceil((maxX - minX) / cell), H = Math.ceil((maxZ - minZ) / cell);
  const walk = new Uint8Array(W * H);
  const groundY = new Float32Array(W * H);
  const AGENT_H = 1.5, AGENT_R = 0.46;
  // Only sample surfaces in this window above the floor. Overhead decks and
  // catwalks sit higher; sampling them would put nav cells in mid-air and the
  // flood fill could never cross beneath them, splitting the arena into islands.
  const NAV_SAMPLE_CEIL = 1.5;

  for (let gz = 0; gz < H; gz++) {
    for (let gx = 0; gx < W; gx++) {
      const x = minX + (gx + .5) * cell, z = minZ + (gz + .5) * cell;
      // Sample only LOW surfaces (floor, steps, ramp treads). Overhead decks and
      // catwalks sit above this window; sampling them would place nav cells up in
      // the air, and the flood fill could then never cross beneath them, chopping
      // the arena into disconnected islands.
      const gy = world.groundAt(x, z, NAV_SAMPLE_CEIL);
      groundY[gz * W + gx] = gy;
      const blocked = world.overlaps(x, gy + .06, z, AGENT_R, AGENT_H);
      walk[gz * W + gx] = blocked ? 0 : 1;
    }
  }

  const reach = new Uint8Array(W * H);
  const startX = Math.round((0 - minX) / cell), startZ = Math.round((-44 - minZ) / cell);
  const q = [startZ * W + startX];
  if (walk[q[0]]) reach[q[0]] = 1;
  else {
    for (let i = 0; i < walk.length; i++) if (walk[i]) { q[0] = i; reach[i] = 1; break; }
  }
  const dirs4 = [1, -1, W, -W];
  while (q.length) {
    const i = q.pop();
    const gx = i % W, gz = (i / W) | 0;
    for (let k = 0; k < 4; k++) {
      const nx = gx + (k === 0 ? 1 : k === 1 ? -1 : 0);
      const nz = gz + (k === 2 ? 1 : k === 3 ? -1 : 0);
      if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue;
      const j = nz * W + nx;
      if (reach[j] || !walk[j]) continue;
      if (Math.abs(groundY[j] - groundY[i]) > 1.35) continue;
      reach[j] = 1; q.push(j);
    }
  }

  const nav = {
    cell, minX, minZ, W, H, walk, reach, groundY,
    idx(x, z) {
      const gx = Math.floor((x - minX) / cell), gz = Math.floor((z - minZ) / cell);
      if (gx < 0 || gz < 0 || gx >= W || gz >= H) return -1;
      return gz * W + gx;
    },
    cellCenter(i) {
      const gx = i % W, gz = (i / W) | 0;
      return { x: minX + (gx + .5) * cell, z: minZ + (gz + .5) * cell, y: groundY[i] };
    },
    ok(i) { return i >= 0 && reach[i] === 1; },
    nearest(x, z) {
      let i = this.idx(x, z);
      if (this.ok(i)) return i;
      const gx = U.clamp(Math.floor((x - minX) / cell), 0, W - 1);
      const gz = U.clamp(Math.floor((z - minZ) / cell), 0, H - 1);
      for (let r = 1; r < 22; r++) {
        for (let a = 0; a < 24; a++) {
          const ang = a / 24 * Math.PI * 2;
          const nx = U.clamp(gx + Math.round(Math.cos(ang) * r), 0, W - 1);
          const nz = U.clamp(gz + Math.round(Math.sin(ang) * r), 0, H - 1);
          const j = nz * W + nx;
          if (this.ok(j)) return j;
        }
      }
      return -1;
    }
  };
  return nav;
}

/* A* on the nav grid. Returns an array of {x,y,z} waypoints (already smoothed). */
function navPath(nav, from, to, maxNodes) {
  const s = nav.nearest(from.x, from.z);
  const g = nav.nearest(to.x, to.z);
  if (s < 0 || g < 0) return null;
  if (s === g) return [{ x: to.x, y: nav.groundY[g], z: to.z }];

  const W = nav.W, H = nav.H;
  const gScore = new Float32Array(W * H).fill(Infinity);
  const came = new Int32Array(W * H).fill(-1);
  const closed = new Uint8Array(W * H);
  gScore[s] = 0;
  const gx = g % W, gz = (g / W) | 0;
  const hf = (i) => { const x = i % W, z = (i / W) | 0; const dx = Math.abs(x - gx), dz = Math.abs(z - gz); return (dx + dz) + 0.414 * Math.min(dx, dz); };

  const heap = [s], f = new Float32Array(W * H); f[s] = hf(s);
  const push = (i) => {
    heap.push(i); let c = heap.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (f[heap[p]] <= f[heap[c]]) break;
      const t = heap[p]; heap[p] = heap[c]; heap[c] = t; c = p;
    }
  };
  const pop = () => {
    const top = heap[0], last = heap.pop();
    if (heap.length) {
      heap[0] = last; let p = 0;
      for (;;) {
        const l = p * 2 + 1, r = l + 1; let m = p;
        if (l < heap.length && f[heap[l]] < f[heap[m]]) m = l;
        if (r < heap.length && f[heap[r]] < f[heap[m]]) m = r;
        if (m === p) break;
        const t = heap[p]; heap[p] = heap[m]; heap[m] = t; p = m;
      }
    }
    return top;
  };

  let expanded = 0, found = false;
  const limit = maxNodes || 8000;
  while (heap.length && expanded < limit) {
    const cur = pop();
    if (closed[cur]) continue;
    closed[cur] = 1; expanded++;
    if (cur === g) { found = true; break; }
    const cxg = cur % W, czg = (cur / W) | 0;
    for (let k = 0; k < 8; k++) {
      const nx = cxg + (k === 0 ? 1 : k === 1 ? -1 : k === 2 ? 0 : k === 3 ? 0 : k === 4 ? 1 : k === 5 ? 1 : k === 6 ? -1 : -1);
      const nz = czg + (k === 0 ? 0 : k === 1 ? 0 : k === 2 ? 1 : k === 3 ? -1 : k === 4 ? 1 : k === 5 ? -1 : k === 6 ? 1 : -1);
      if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue;
      const j = nz * W + nx;
      if (!nav.reach[j] || closed[j]) continue;
      const dy = Math.abs(nav.groundY[j] - nav.groundY[cur]);
      if (dy > .62) continue;
      if (k >= 4) {
        if (!nav.reach[czg * W + nx] || !nav.reach[nz * W + cxg]) continue;
        if (Math.abs(nav.groundY[czg * W + nx] - nav.groundY[cur]) > .62) continue;
        if (Math.abs(nav.groundY[nz * W + cxg] - nav.groundY[cur]) > .62) continue;
      }
      const step = (k >= 4 ? 1.414 : 1) + dy * 0.6;
      const t = gScore[cur] + step;
      if (t < gScore[j]) {
        gScore[j] = t; came[j] = cur; f[j] = t + hf(j) * 1.08;
        push(j);
      }
    }
  }
  if (!found) return null;

  const cells = [];
  for (let i = g; i >= 0; i = came[i]) { cells.push(i); if (i === s) break; }
  cells.reverse();
  if (cells.length < 2) return [{ x: to.x, y: to.y, z: to.z }];

  const out = [];
  let anchor = 0;
  out.push(nav.cellCenter(cells[0]));
  for (let i = 2; i < cells.length; i++) {
    if (!navLineClear(nav, cells[anchor], cells[i])) {
      anchor = i - 1;
      out.push(nav.cellCenter(cells[anchor]));
    }
  }
  const last = nav.cellCenter(cells[cells.length - 1]);
  out.push(last);
  out[out.length - 1] = { x: to.x, y: U.lerp(last.y, to.y === undefined ? last.y : to.y, .25), z: to.z };
  return out;
}

function navLineClear(nav, a, b) {
  const x0 = a % nav.W, z0 = (a / nav.W) | 0;
  const x1 = b % nav.W, z1 = (b / nav.W) | 0;
  let dx = Math.abs(x1 - x0), dz = Math.abs(z1 - z0);
  const sx = x0 < x1 ? 1 : -1, sz = z0 < z1 ? 1 : -1;
  let err = dx - dz, x = x0, z = z0, guard = 0;
  while (guard++ < 600) {
    const i = z * nav.W + x;
    if (!nav.reach[i]) return false;
    if (x === x1 && z === z1) return true;
    const e2 = 2 * err;
    if (e2 > -dz) { err -= dz; x += sx; }
    if (e2 < dx) { err += dx; z += sz; }
  }
  return true;
}
