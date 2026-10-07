/* ============================================================
   04b — РЕДАКТОР КАРТ
   Простой блочный редактор: игрок ходит от первого лица, ставит/убирает
   блоки разных материалов и размеров, задаёт точку спавна, сохраняет карту
   в Store.data.customMaps. Сохранённые карты доступны и в ОФФЛАЙНЕ, и в
   ОНЛАЙНЕ (хост передаёт определение карты пирам по сети).

   Формат карты (компактный, сериализуется как есть):
     { id, name, blocks: [ {x,y,z,w,h,d,m} ], spawn: {x,z,yaw} }
     x,y,z — ЦЕНТР блока по горизонтали и НИЗ по вертикали (как aabbFromBase);
     m     — ключ материала (brick/wood/...).
   ============================================================ */
const MapEditor = {
  active: false,
  blocks: [],            // редактируемый список
  mapId: null,           // id редактируемой карты (null — новая)
  mapName: 'МОЯ КАРТА',
  mat: 'brick',          // выбранный материал
  size: 4,               // размер куба (м)
  step: 4,               // шаг курсора
  erase: false,          // режим удаления
  spawn: { x: 0, z: 40, yaw: 0 },
  cursor: { x: 0, y: 0, z: 40, valid: true },
  _grid: null,           // визуальная сетка-призрак
  _cursorMesh: null,     // подсветка курсора
  _spawnMesh: null,      // маркер спавна
  _undo: [],
  /* СВОБОДНАЯ КАМЕРА РЕДАКТОРА (в духе Stage Builder): полёт по арене,
     мышь — обзор, WASD — движение, Space/Ctrl — вверх/вниз, колесо — скорость. */
  freeCam: true,
  camPos: { x: 0, y: 12, z: 40 },
  camYaw: 0,
  camPitch: -0.15,
  camSpeed: 24,
  SIZES: [1, 2, 3, 4, 6, 8, 12],
  /* ИГРОВЫЕ ЭЛЕМЕНТЫ (Stage Builder): тип для размещения */
  elems: [],          // размещённые элементы (сериализуются)
  elemKind: null,     // текущий выбранный тип (null = режим блоков)
  ELEM_KINDS: [
    { k: 'mover',    name: 'ДВИЖ. ПЛАТФОРМА' },
    { k: 'faller',   name: 'ПАДАЮЩАЯ' },
    { k: 'vanish',   name: 'ИСЧЕЗАЮЩАЯ' },
    { k: 'spikes',   name: 'ШИПЫ' },
    { k: 'teleport', name: 'ТЕЛЕПОРТ' }
  ],
  MATS: [
    { id: 'brick',    name: 'КИРПИЧ' },
    { id: 'concrete', name: 'БЕТОН' },
    { id: 'wood',     name: 'ДЕРЕВО' },
    { id: 'metal',    name: 'МЕТАЛЛ' },
    { id: 'sand',     name: 'ПЕСОК' },
    { id: 'dark',     name: 'ТЁМНЫЙ' }
  ],

  /* ---------- список карт (штатные + пользовательские) ---------- */
  customList() {
    const a = Store.data.customMaps;
    return Array.isArray(a) ? a : (Store.data.customMaps = []);
  },
  findCustom(id) { return this.customList().find(m => m.id === id) || null; },

  /* Строитель кастомной карты: вызывается buildMap для встроенной в реестр карты */
  buildFromDef(def) {
    const parent = MAP.group, world = MAP.world;
    buildEditableGround(parent, world);
    buildEditablePerimeter(parent, world);
    const data = def && def.data ? def.data : def;
    const blocks = (data && data.blocks) || [];
    for (const b of blocks) this.placeBlock(parent, world, b);
    if (data && data.spawn) MAP.customSpawn = { x: data.spawn.x, z: data.spawn.z, yaw: data.spawn.yaw || 0 };
    /* игровые элементы карты (движущиеся платформы, шипы, телепорты) */
    if (typeof MapElements !== 'undefined' && data && data.elements) MapElements.build(data.elements, parent, world);
  },

  /* Один блок: коллайдер + обычный меш (разрушаемый, как геометрия карты).
     Для редактора используем обычные меши, а не InstancedMesh: блоков немного
     и они добавляются/удаляются поштучно. */
  placeBlock(parent, world, b) {
    const mat = MAT[b.m] || MAT.brick;
    const aabb = aabbFromBase(b.x, b.y, b.z, b.w, b.h, b.d, 'cover');
    aabb.destructible = true;
    aabb.hp = aabb.maxHp = Math.max(30, b.w * b.h * b.d * 26);
    aabb._mat = mat;
    aabb.editorBlock = true;
    aabb._orig = b;
    world.addBox(aabb);
    MAP.destructibles.push(aabb);
    const mesh = makeBoxMesh(b.w, b.h, b.d, mat);
    mesh.position.set(b.x, b.y + b.h / 2, b.z);
    mesh.castShadow = true; mesh.receiveShadow = true;
    parent.add(mesh);
    aabb.mesh = mesh;
    return aabb;
  },

  /* после пачки правок ничего пересобирать не нужно (обычные меши) */
  flushNew() { },

  /* ---------- жизненный цикл ---------- */
  start(mapId) {
    mapId = mapId || null;
    const existing = mapId ? this.findCustom(mapId) : null;
    this.mapId = mapId;
    this.mapName = existing ? existing.name : 'МОЯ КАРТА';
    this.blocks = existing ? JSON.parse(JSON.stringify(existing.blocks)) : [];
    this.elems = existing && existing.elements ? JSON.parse(JSON.stringify(existing.elements)) : [];
    this.elemKind = null;
    this.spawn = existing && existing.spawn ? Object.assign({ x: 0, z: 40, yaw: 0 }, existing.spawn)
                                           : { x: 0, z: 40, yaw: 0 };
    this.erase = false; this._undo = [];
    this.active = true;
    Game.editorActive = true;
    Game.mode = CS.MODE.EDITOR;
    /* карта-подложка: ровная площадка + границы */
    if (typeof buildMap === 'function') {
      buildMap(Game.scene, Store.data.quality, 'editorbase');
      Game.world = MAP.world;
      Game.applyQuality();
    }
    this.ensureVisuals();
    if (this.blocks.length) this.rebuildGeometry();
    if (typeof MapElements !== 'undefined' && this.elems.length) MapElements.build(this.elems, MAP.group, MAP.world);
    UI.show('hud');
    this.updatePanel();
    UI.toast('РЕДАКТОР: ЛКМ — поставить · ПКМ — убрать · [ ] — размер · G — материал · E — спавн · F — сохранить', '#9be564');
  },

  stop() {
    this.active = false;
    Game.editorActive = false;
    this.clearVisuals();
  },

  /* перепостроить всю геометрию из this.blocks (после правок) */
  rebuildGeometry() {
    if (typeof buildMap !== 'function') return;
    buildMap(Game.scene, Store.data.quality, 'editorbase');
    Game.world = MAP.world;
    Game.applyQuality();
    const parent = MAP.group, world = MAP.world;
    for (const b of this.blocks) this.placeBlock(parent, world, b);
    MAP.customSpawn = { x: this.spawn.x, z: this.spawn.z, yaw: this.spawn.yaw || 0 };
    this.ensureVisuals();
  },

  /* ---------- визуал редактора (сетка, курсор, маркер спавна) ---------- */
  ensureVisuals() {
    if (!MAP.group) return;
    if (!this._grid) {
      const g = new THREE.Group();
      const S = MAP.size, half = S / 2, step = this.step;
      const pts = [];
      for (let x = -half; x <= half + .01; x += step) { pts.push(x, .03, -half, x, .03, half); }
      for (let z = -half; z <= half + .01; z += step) { pts.push(-half, .03, z, half, .03, z); }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const line = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x33ff88, transparent: true, opacity: .18, depthWrite: false }));
      line.frustumCulled = false;
      g.add(line);
      this._grid = g;
      MAP.group.add(g);
    }
    if (!this._cursorMesh) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial({ color: 0x33ff88, transparent: true, opacity: .35, depthWrite: false }));
      this._cursorMesh = box;
      MAP.group.add(box);
    }
    if (!this._spawnMesh) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, 2.4, 12, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: .5, side: THREE.DoubleSide, depthWrite: false }));
      m.position.y = 1.2;
      const grp = new THREE.Group();
      grp.add(m);
      this._spawnMesh = grp;
      MAP.group.add(grp);
    }
    this._spawnMesh.position.set(this.spawn.x, 0, this.spawn.z);
  },

  clearVisuals() {
    for (const k of ['_grid', '_cursorMesh', '_spawnMesh']) {
      const o = this[k];
      if (o && o.parent) o.parent.remove(o);
      this[k] = null;
    }
  },

  /* ---------- управление в кадре ---------- */
  update(dt) {
    if (!this.active) return;
    /* СВОБОДНАЯ КАМЕРА: WASD — полёт, мышь — обзор (см. cameraUpdate) */
    if (this.freeCam) {
      const mv = Input.moveVector();
      const sp = this.camSpeed * (Input.keys && Input.keys.ShiftLeft ? 3 : 1) * dt;
      const yaw = this.camYaw;
      const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
      const rx = Math.cos(yaw), rz = -Math.sin(yaw);
      /* подъём/спуск: ПК — Space/Ctrl; телефон — кнопки ВЫШЕ/НИЖЕ */
      const climb = (IS_TOUCH ? ((this._touchUp ? 1 : 0) - (this._touchDown ? 1 : 0))
        : ((Input.keys && Input.keys.Space ? 1 : 0) - (Input.keys && Input.keys.ControlLeft ? 1 : 0)));
      this.camPos.x += (fx * mv.f + rx * mv.r) * sp;
      this.camPos.z += (fz * mv.f + rz * mv.r) * sp;
      this.camPos.y += climb * sp;
      const half = MAP.size / 2 + 30;
      this.camPos.x = U.clamp(this.camPos.x, -half, half);
      this.camPos.z = U.clamp(this.camPos.z, -half, half);
      this.camPos.y = U.clamp(this.camPos.y, 1, 90);
    }
    const p = Game.player;
    if (!p) return;
    /* луч от прицела до пола/стены — куда ставить */
    const eye = Game.eyePos();
    const dir = Game.cameraDir();
    const reach = 60;
    let hit = null;
    try { hit = Game.world.raycast({ x: eye.x, y: eye.y, z: eye.z }, dir, reach, ['ground']); } catch (e) { hit = null; }
    let cx, cy, cz;
    if (hit && hit.point) {
      const s = this.size;
      cx = Math.round((hit.point.x) / Math.max(1, this.step)) * Math.max(1, this.step);
      cz = Math.round((hit.point.z) / Math.max(1, this.step)) * Math.max(1, this.step);
      /* низ блока — поверх поверхности под курсором */
      cy = Math.max(0, Math.round(hit.point.y));
    } else {
      const gx = eye.x + dir.x * 20, gz = eye.z + dir.z * 20;
      const ground = Game.world.groundAt(gx, gz, eye.y + 4) || 0;
      cx = Math.round(gx / Math.max(1, this.step)) * Math.max(1, this.step);
      cz = Math.round(gz / Math.max(1, this.step)) * Math.max(1, this.step);
      cy = ground;
    }
    this.cursor.x = cx; this.cursor.y = cy; this.cursor.z = cz;
    this.cursor.valid = Math.abs(cx) < MAP.size / 2 - 1 && Math.abs(cz) < MAP.size / 2 - 1;
    if (this._cursorMesh) {
      this._cursorMesh.position.set(cx, cy + this.size / 2, cz);
      this._cursorMesh.scale.set(this.size, this.size, this.size);
      this._cursorMesh.material.color.setHex(this.erase ? 0xff4a4a : (this.cursor.valid ? 0x33ff88 : 0x888888));
    }
  },

  /* горячая клавиша редактора (вызывается из onKeyDown) */
  hotkey(code) {
    switch (code) {
      case 'BracketRight': case 'KeyR': this.cycleSize(1); return true;
      case 'BracketLeft': this.cycleSize(-1); return true;
      case 'KeyG': this.cycleMat(1); return true;
      case 'KeyT': this.cycleElem(1); return true;
      case 'KeyE': this.setSpawnHere(); return true;
      case 'KeyV': this.freeCam = !this.freeCam; UI.toast(this.freeCam ? 'Свободная камера' : 'Камера от игрока'); return true;
      case 'KeyZ': this.undo(); return true;
      case 'KeyC': this.erase = !this.erase; this.updatePanel(); UI.toast(this.erase ? 'РЕЖИМ: УБРАТЬ' : 'РЕЖИМ: ПОСТАВИТЬ', this.erase ? '#ff6a5a' : '#9be564'); return true;
    }
    return false;
  },

  cycleElem(d) {
    /* порядок: (нет) → mover → faller → vanish → spikes → teleport → (нет) */
    const kinds = this.ELEM_KINDS;
    const order = [null].concat(kinds.map(x => x.k));
    let i = order.indexOf(this.elemKind);
    if (i < 0) i = 0;
    i = (i + d + order.length) % order.length;
    this.elemKind = order[i];
    this.updatePanel();
    const nm = this.elemKind ? (kinds.find(x => x.k === this.elemKind) || {}).name : 'НЕТ (БЛОКИ)';
    UI.toast('Элемент: ' + nm, '#8a5cff');
  },

  cycleSize(d) {
    let i = this.SIZES.indexOf(this.size);
    i = (i + d + this.SIZES.length) % this.SIZES.length;
    this.size = this.SIZES[i];
    this.updatePanel(); UI.toast('Размер блока: ' + this.size + ' м');
  },
  cycleMat(d) {
    let i = this.MATS.findIndex(m => m.id === this.mat);
    i = (i + d + this.MATS.length) % this.MATS.length;
    this.mat = this.MATS[i].id;
    this.updatePanel(); UI.toast('Материал: ' + this.MATS[i].name);
  },
  setSpawnHere() {
    const p = Game.player;
    this.spawn = { x: p.pos.x, z: p.pos.z, yaw: p.yaw };
    if (this._spawnMesh) this._spawnMesh.position.set(this.spawn.x, 0, this.spawn.z);
    UI.toast('Точка спавна установлена');
  },

  /* ЛКМ — поставить блок ИЛИ игровой элемент (в зависимости от режима) */
  place() {
    if (!this.cursor.valid) { Audio3D_SFX.deny && Audio3D_SFX.deny(); return; }
    if (this.elemKind) { this.placeElement(); return; }
    this.pushUndo();
    const b = { x: this.cursor.x, y: this.cursor.y, z: this.cursor.z, w: this.size, h: this.size, d: this.size, m: this.mat };
    this.blocks.push(b);
    this.placeBlock(MAP.group, MAP.world, b);
    this.flushNew();
    Audio3D_SFX.uiClick && Audio3D_SFX.uiClick();
  },

  /* разместить игровой элемент в точке курсора */
  placeElement() {
    const c = this.cursor, k = this.elemKind;
    const e = { k: k, x: c.x, y: c.y, z: c.z, w: this.size, h: Math.max(1, this.size / 3), d: this.size };
    if (k === 'mover') { e.ax = 1; e.ay = 0; e.az = 0; e.amp = Math.max(4, this.size * 2); e.speed = 1; }
    if (k === 'spikes') { e.d = this.size; }
    if (k === 'teleport') {
      /* связываем телепорты попарно: каждые два — один link */
      const count = this.elems.filter(x => x.k === 'teleport').length;
      e.link = Math.floor(count / 2);
    }
    this.pushUndo();
    this.elems.push(e);
    if (typeof MapElements !== 'undefined') MapElements.build(this.elems, MAP.group, MAP.world);
    Audio3D_SFX.uiClick && Audio3D_SFX.uiClick();
    UI.toast('Элемент: ' + (this.ELEM_KINDS.find(x => x.k === k) || {}).name, '#8a5cff');
  },

  removeAt() {
    /* сначала пытаемся убрать игровой элемент рядом с курсором */
    if (typeof MapElements !== 'undefined' && MapElements.list.length) {
      const ne = MapElements.nearest(this.cursor.x, this.cursor.y, this.cursor.z);
      if (ne) {
        const i = this.elems.indexOf(ne.def);
        if (i >= 0) {
          this.pushUndo();
          this.elems.splice(i, 1);
          MapElements.build(this.elems, MAP.group, MAP.world);
          Audio3D_SFX.uiClick && Audio3D_SFX.uiClick();
          return;
        }
      }
    }
    /* иначе — блок */
    const c = this.cursor;
    let best = -1, bestD = 2.2 * 2.2;
    for (let i = 0; i < this.blocks.length; i++) {
      const b = this.blocks[i];
      const dx = b.x - c.x, dy = (b.y + b.h / 2) - (c.y + this.size / 2), dz = b.z - c.z;
      const d = dx * dx + dy * dy + dz * dz;
      if (d < bestD) { bestD = d; best = i; }
    }
    if (best < 0) { Audio3D_SFX.deny && Audio3D_SFX.deny(); return; }
    this.pushUndo();
    this.blocks.splice(best, 1);
    this.rebuildGeometry();
    Audio3D_SFX.uiClick && Audio3D_SFX.uiClick();
  },

  pushUndo() {
    this._undo.push(JSON.stringify(this.blocks));
    if (this._undo.length > 40) this._undo.shift();
  },
  undo() {
    if (!this._undo.length) return;
    this.blocks = JSON.parse(this._undo.pop());
    this.rebuildGeometry();
    UI.toast('Отменено');
  },

  _flush() { if (MAP._chunkGroups) { for (const k in MAP._chunkGroups) MAP._chunkGroups[k].dirty = true; } if (typeof _flushChunkInstances === 'function') _flushChunkInstances(); },

  /* ---------- сохранение ---------- */
  save() {
    const list = this.customList();
    const name = (UI.el.edName && UI.el.edName.value.trim()) || this.mapName || 'МОЯ КАРТА';
    let entry = this.mapId ? list.find(m => m.id === this.mapId) : null;
    if (!entry) {
      const id = 'custom_' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
      entry = { id: id, name: name, blocks: [], spawn: null };
      list.push(entry);
      this.mapId = id;
    }
    entry.name = name;
    entry.spawn = { x: this.spawn.x, z: this.spawn.z, yaw: this.spawn.yaw || 0 };
    entry.blocks = this.blocks.map(b => ({
      x: +b.x.toFixed(2), y: +b.y.toFixed(2), z: +b.z.toFixed(2),
      w: +b.w.toFixed(2), h: +b.h.toFixed(2), d: +b.d.toFixed(2), m: b.m
    }));
    /* игровые элементы (движущиеся платформы/шипы/телепорты) */
    entry.elements = (this.elems || []).map(e => JSON.parse(JSON.stringify(e)));
    Store.save();
    if (typeof uiRefreshCustomMaps === 'function') uiRefreshCustomMaps();
    UI.toast('Карта сохранена: «' + name + '» · блоков ' + entry.blocks.length, '#9be564');
  },

  /* ---------- панель ---------- */
  updatePanel() {
    const el = UI.el;
    if (!el.edPanel) return;
    if (el.edName) { el.edName.value = this.mapName; }
    if (el.edMat) el.edMat.textContent = (this.MATS.find(m => m.id === this.mat) || {}).name || this.mat;
    if (el.edSize) el.edSize.textContent = this.size + ' м';
    if (el.edMode) el.edMode.textContent = this.erase ? 'УБРАТЬ' : 'ПОСТАВИТЬ';
    if (el.edElem) el.edElem.textContent = this.elemKind ? ((this.ELEM_KINDS.find(x => x.k === this.elemKind) || {}).name || this.elemKind) : 'НЕТ';
    if (el.edCount) el.edCount.textContent = String(this.blocks.length);
    if (el.edSpawn) el.edSpawn.textContent = '(' + Math.round(this.spawn.x) + ', ' + Math.round(this.spawn.z) + ')';
  }
};

/* ---------- базовая площадка для пустой карты редактора ---------- */
function buildEditableGround(parent, world) {
  const S = MAP.size;
  world.addBox(AABB(-(S / 2 + 20), -2, -(S / 2 + 20), S / 2 + 20, 0, S / 2 + 20, 'ground'));
  const gpMat = MAT.floor.clone();
  gpMat.map = canvasTexture(TEXTURES.floor, 18, 4);
  const gp = new THREE.Mesh(new THREE.PlaneGeometry(S + 40, S + 40), gpMat);
  gp.rotation.x = -Math.PI / 2; gp.position.y = 0.01; gp.receiveShadow = true;
  parent.add(gp);
}
function buildEditablePerimeter(parent, world) {
  mapPerimeter(parent, world, MAT.concrete);
}

/* ============================================================
   ИНТЕГРАЦИЯ С РЕЕСТРОМ КАРТ
   Пользовательские карты добавляются в MAPS как обычные, с build-функцией,
   которая строит их из данных. Так и оффлайн, и онлайн-клиент строят их ОДИНАКОВО
   (определение карты едет по сети в сообщении settings).
   ============================================================ */
function registerCustomMapsIntoRegistry() {
  const list = (Store.data.customMaps && Array.isArray(Store.data.customMaps)) ? Store.data.customMaps : [];
  /* убираем прежние регистрации пользовательских карт */
  for (let i = MAPS.length - 1; i >= 0; i--) if (MAPS[i].custom) MAPS.splice(i, 1);
  for (const m of list) {
    MAPS.push({
      id: m.id, name: m.name, short: (m.name || 'КАРТА').slice(0, 8).toUpperCase(),
      desc: 'Своя карта · блоков ' + ((m.blocks && m.blocks.length) || 0),
      custom: true, data: m,
      build: (parent, world) => MapEditor.buildFromDef({ data: m })
    });
  }
  /* карта-подложка редактора */
  if (!MAPS.find(x => x.id === 'editorbase')) {
    MAPS.push({ id: 'editorbase', name: 'РЕДАКТОР', short: 'РЕД', desc: 'Пустая площадка редактора', custom: true,
      build: (parent, world) => { buildEditableGround(parent, world); buildEditablePerimeter(parent, world); } });
  }
}

/* Найти кастомную карту по id (для сети) */
function customMapById(id) {
  const list = (Store.data.customMaps && Array.isArray(Store.data.customMaps)) ? Store.data.customMaps : [];
  return list.find(m => m.id === id) || null;
}
