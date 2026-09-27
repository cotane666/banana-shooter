/* ============================================================
   06 — PLAYER: physics, inventory, recoil, first-person view model
   ============================================================ */

/* ============================================================
   FIRST-PERSON WEAPON MODELS
   Every weapon has its own silhouette — receiver proportions, magazine
   shape/angle, stock, sights, muzzle device and material mix. Weapons are
   built along -Z (the barrel points away from the player).
   ============================================================ */

/* weapon materials: mid-tones, because ACES tone mapping darkens them */
function gunMat(color) {
  return new THREE.MeshLambertMaterial({ color: color === undefined ? 0x4d545c : color, emissive: 0x0a0b0d });
}

/* material palette */
const PAL = {
  black: 0x2b2f34,
  steel: 0x8b939d,
  gun: 0x4a5057,
  gunLight: 0x5b626b,
  poly: 0x353a40,
  wood: 0x9c6a36,
  tan: 0xa8926a,
  oliv: 0x5d6247,
  mag: 0x3a4046,
  glass: 0x0e1114,
  accent: 0x646c76
};

function gunMesh(w, h, d, color, x, y, z) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), gunMat(color));
}
/* box at a position (bottom-anchored is not used; these are centre-anchored) */
function B(w, h, d, color, x, y, z, rotZ, rotX, rotY) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), gunMat(color));
  m.position.set(x, y, z);
  if (rotZ) m.rotation.z = rotZ;
  if (rotX) m.rotation.x = rotX;
  if (rotY) m.rotation.y = rotY;
  return m;
}
/* cylinder along the Z axis (barrels, tubes, scopes) */
function CYL(r, len, color, x, y, z, seg) {
  const g = new THREE.CylinderGeometry(r, r, len, seg || 10);
  g.rotateX(Math.PI / 2);
  const m = new THREE.Mesh(g, gunMat(color));
  m.position.set(x, y, z);
  return m;
}
/* angled magazine: a box tilted forward around the X axis */
function MAG(w, h, d, color, x, y, z, tiltZ) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), gunMat(color));
  m.position.set(x, y, z);
  m.rotation.z = tiltZ || 0;
  return m;
}

/* ---- small detail helpers used to dress up the weapon models ---- */
/* a Picatinny rail: a base bar topped by evenly spaced teeth */
function RAIL(len, color, x, y, z, rotZ) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(.030, .012, len), gunMat(color || 0x22262b));
  g.add(base);
  const n = Math.max(3, Math.round(len / .034));
  for (let i = 0; i < n; i++) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(.034, .010, .016), gunMat(color || 0x22262b));
    t.position.set(0, .010, -len / 2 + .017 + i * (len / n));
    g.add(t);
  }
  g.position.set(x, y, z);
  if (rotZ) g.rotation.z = rotZ;
  return g;
}
/* a line of small bolts / rivets along a surface */
function BOLTS(count, spacing, r, color, x, y, z, axis) {
  const g = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const geo = new THREE.CylinderGeometry(r, r, .012, 8);
    if (axis === 'x') geo.rotateZ(Math.PI / 2);
    else geo.rotateX(Math.PI / 2);
    const m = new THREE.Mesh(geo, gunMat(color || 0x2a2f34));
    if (axis === 'x') m.position.set(0, (i - (count - 1) / 2) * spacing, 0);
    else m.position.set(0, 0, (i - (count - 1) / 2) * spacing);
    g.add(m);
  }
  g.position.set(x, y, z);
  return g;
}
/* a small self-lit indicator light */
function DOT(r, color, x, y, z) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), new THREE.MeshBasicMaterial({ color }));
  m.position.set(x, y, z);
  return m;
}

function buildWeaponModel(id) {
  const g = new THREE.Group();
  const add = (...ms) => { for (const m of ms) g.add(m); return ms[0]; };

  switch (id) {

    /* ---------------- GLOCK-18: compact polymer pistol ---------------- */
    case 'glock': {
      add(B(.052, .052, .17, PAL.poly, 0, 0, -.075));                 // slide
      add(B(.044, .014, .17, PAL.black, 0, .026, -.075));             // slide top bevel
      // slide serrations
      for (let i = 0; i < 5; i++) add(B(.054, .036, .008, PAL.poly, 0, -.002, -.14 + i * .016));
      add(B(.046, .030, .155, PAL.gun, 0, -.038, -.07));              // frame
      add(CYL(.011, .06, PAL.steel, 0, .004, -.19, 8));               // barrel
      add(B(.040, .020, .022, PAL.black, 0, -.004, -.165));           // muzzle block
      add(B(.030, .008, .012, PAL.steel, 0, .030, -.19));             // front cocking step
      add(B(.044, .105, .052, PAL.poly, 0, -.085, .005, .16));        // grip
      for (let i = 0; i < 4; i++) add(B(.046, .008, .036, PAL.black, 0, -.060 + i * .022, .006, .16));   // grip texture
      add(B(.048, .026, .050, PAL.mag, 0, -.11, .004, .16));          // mag floorplate
      add(B(.020, .012, .012, PAL.steel, 0, .032, -.145));            // front sight
      add(DOT(.006, 0x8affa0, 0, .038, -.145));                       // front sight dot
      add(B(.030, .014, .014, PAL.steel, 0, .032, -.005));            // rear sight
      add(B(.026, .022, .028, PAL.black, 0, -.048, -.036));           // trigger guard
      add(B(.011, .020, .010, PAL.steel, 0, -.040, -.030));           // trigger
      add(B(.010, .014, .030, PAL.black, 0, -.020, -.085));           // takedown lever
      break;
    }

    /* ---------------- USP-S: silenced pistol ---------------- */
    case 'usp': {
      add(B(.050, .054, .185, PAL.black, 0, 0, -.08));
      add(B(.042, .014, .185, PAL.gun, 0, .027, -.08));                // slide top
      for (let i = 0; i < 5; i++) add(B(.052, .038, .008, PAL.gun, 0, -.002, -.15 + i * .015));
      add(B(.044, .030, .16, PAL.gun, 0, -.040, -.075));
      add(CYL(.017, .20, PAL.poly, 0, .004, -.255, 10));              // long suppressor
      add(CYL(.020, .020, PAL.steel, 0, .004, -.16, 10));             // thread collar
      // suppressor ribs
      for (let i = 0; i < 4; i++) add(CYL(.0185, .012, PAL.steel, 0, .004, -.20 - i * .045, 10));
      add(B(.042, .105, .050, PAL.black, 0, -.088, .008, .15));
      add(B(.020, .012, .012, PAL.steel, 0, .034, -.155));
      add(DOT(.006, 0x8affa0, 0, .040, -.155));
      add(B(.028, .013, .014, PAL.steel, 0, .034, -.012));
      add(B(.024, .020, .026, PAL.black, 0, -.050, -.038));
      add(B(.010, .018, .010, PAL.steel, 0, -.042, -.032));           // trigger
      break;
    }

    /* ---------------- P250: compact duty pistol ---------------- */
    case 'p250': {
      add(B(.054, .050, .165, PAL.gunLight, 0, 0, -.072));
      add(B(.044, .012, .165, PAL.gun, 0, .025, -.072));
      // slide serrations + a slide-stop lever
      for (let i = 0; i < 5; i++) add(B(.056, .034, .008, PAL.gun, 0, -.002, -.13 + i * .015));
      add(B(.010, .016, .028, PAL.black, 0, -.014, -.09));
      add(B(.046, .032, .15, PAL.poly, 0, -.038, -.068));
      add(CYL(.012, .05, PAL.steel, 0, .002, -.178, 8));
      add(B(.030, .008, .014, PAL.steel, 0, .028, -.18));             // muzzle step
      add(B(.046, .10, .052, PAL.poly, 0, -.082, .006, .14));
      for (let i = 0; i < 3; i++) add(B(.048, .008, .038, PAL.black, 0, -.058 + i * .022, .006, .14));
      add(B(.050, .024, .052, PAL.mag, 0, -.106, .005, .14));         // wide floorplate
      add(B(.020, .011, .012, PAL.steel, 0, .030, -.135));
      add(DOT(.005, 0xffd06a, 0, .035, -.135));
      add(B(.028, .013, .013, PAL.steel, 0, .030, -.008));
      add(B(.024, .020, .026, PAL.black, 0, -.046, -.036));
      add(B(.010, .017, .010, PAL.steel, 0, -.039, -.030));           // trigger
      break;
    }

    /* ---------------- Desert Eagle: huge silver hand cannon ---------------- */
    case 'deagle': {
      add(B(.062, .070, .215, PAL.steel, 0, 0, -.095));               // massive slide
      // deep slide serrations
      for (let i = 0; i < 6; i++) add(B(.064, .050, .009, PAL.gun, 0, -.004, -.16 + i * .016));
      add(B(.056, .038, .18, PAL.gun, 0, -.052, -.085));
      add(B(.048, .036, .20, PAL.steel, 0, .020, -.115));             // full-length top rib
      for (let i = 0; i < 6; i++) add(B(.050, .010, .012, PAL.black, 0, .042, -.19 + i * .030));   // rib vents
      add(CYL(.014, .05, PAL.black, 0, .004, -.225, 8));
      add(B(.026, .014, .022, PAL.steel, 0, .004, -.24));             // muzzle crown
      add(B(.052, .115, .058, PAL.poly, 0, -.098, .010, .17));        // grip
      for (let i = 0; i < 4; i++) add(B(.054, .009, .040, PAL.black, 0, -.066 + i * .024, .011, .17));
      add(B(.020, .016, .014, PAL.black, 0, .044, -.20));             // front sight
      add(DOT(.007, 0xff5a3a, 0, .052, -.20));
      add(B(.032, .016, .016, PAL.black, 0, .044, -.005));            // rear sight
      add(B(.028, .022, .030, PAL.black, 0, -.058, -.046));
      add(B(.011, .020, .010, PAL.steel, 0, -.050, -.040));           // trigger
      break;
    }

    /* ---------------- R8 Revolver: swinging cylinder ---------------- */
    case 'revolver': {
      add(B(.048, .054, .19, PAL.gun, 0, 0, -.085));
      add(B(.038, .012, .19, PAL.steel, 0, .026, -.085));             // top strap
      add(B(.042, .028, .16, PAL.black, 0, -.036, -.08));
      const cyl = CYL(.036, .085, PAL.steel, 0, 0, -.105, 12);        // the cylinder
      add(cyl);
      // fluted cylinder chambers
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        add(CYL(.008, .088, PAL.black, Math.cos(a) * .022, Math.sin(a) * .022, -.105, 6));
      }
      add(CYL(.014, .13, PAL.steel, 0, .002, -.215, 8));              // barrel
      add(B(.030, .020, .030, PAL.steel, 0, .014, -.255));            // underlug
      add(B(.046, .115, .055, PAL.wood, 0, -.095, .012, .19));        // wooden grip
      for (let i = 0; i < 3; i++) add(B(.048, .010, .044, PAL.black, 0, -.066 + i * .024, .012, .19));
      add(B(.020, .014, .014, PAL.black, 0, .040, -.19));
      add(DOT(.006, 0xff5a3a, 0, .046, -.19));
      add(B(.030, .014, .015, PAL.black, 0, .038, -.015));
      add(B(.022, .032, .022, PAL.steel, 0, -.045, -.03));            // hammer area
      add(CYL(.013, .022, PAL.steel, 0, -.028, -.045, 8));            // hammer spur
      add(B(.010, .020, .012, PAL.steel, 0, -.036, -.036));           // trigger
      add(B(.006, .014, .050, PAL.steel, 0, -.006, -.14));            // ejector rod
      break;
    }

    /* ---------------- MP5-SD: integrally suppressed SMG ---------------- */
    case 'mp5': {
      add(B(.052, .075, .30, PAL.black, 0, 0, -.14));                 // receiver
      add(B(.046, .014, .30, PAL.gun, 0, .034, -.14));                // receiver top
      add(CYL(.021, .28, PAL.gun, 0, .006, -.43, 12));                // fat suppressor
      add(CYL(.024, .015, PAL.steel, 0, .006, -.295, 12));
      for (let i = 0; i < 5; i++) add(CYL(.0225, .010, PAL.steel, 0, .006, -.33 - i * .045, 12));   // suppressor ribs
      add(B(.020, .016, .26, PAL.steel, 0, .040, -.44));              // top rail on suppressor shroud
      add(B(.048, .060, .20, PAL.poly, 0, -.008, -.30));              // slim handguard
      add(B(.040, .150, .055, PAL.black, 0, -.115, -.06));            // curved mag
      add(B(.044, .028, .058, PAL.mag, 0, -.185, -.06));              // mag floor
      add(B(.042, .115, .058, PAL.poly, 0, -.085, .015, .18));        // pistol grip
      for (let i = 0; i < 3; i++) add(B(.044, .008, .042, PAL.black, 0, -.055 + i * .022, .016, .18));
      add(B(.050, .060, .13, PAL.black, 0, -.004, .085));             // stock body
      add(B(.040, .050, .10, PAL.poly, 0, -.004, .20));               // sliding stock
      add(B(.030, .034, .09, PAL.black, 0, .052, -.13));              // optic hood
      add(CYL(.013, .05, PAL.steel, 0, .052, -.20, 8));               // optic tube
      add(DOT(.006, 0xff5a3a, 0, .052, -.225));                       // dot
      add(B(.024, .020, .026, PAL.black, 0, -.058, -.10));
      add(B(.011, .018, .010, PAL.steel, 0, -.050, -.096));           // trigger
      add(B(.012, .026, .030, PAL.black, 0, -.014, -.16));            // mag release / paddle
      break;
    }

    /* ---------------- P90: bullpup with a top magazine ---------------- */
    case 'p90': {
      add(B(.075, .105, .34, PAL.oliv, 0, 0, -.14));                  // chunky shell
      add(B(.070, .014, .34, PAL.poly, 0, .056, -.14));               // shell top seam
      add(B(.058, .072, .10, PAL.poly, 0, -.005, .05));               // rear
      add(CYL(.014, .11, PAL.steel, 0, .004, -.345, 8));              // stubby barrel
      add(B(.070, .040, .13, PAL.poly, 0, .070, -.13));               // TOP magazine
      add(B(.066, .020, .12, PAL.mag, 0, .095, -.13));
      for (let i = 0; i < 4; i++) add(B(.064, .038, .006, PAL.mag, 0, .070, -.175 + i * .028));   // mag witness slots
      add(B(.030, .110, .050, PAL.poly, 0, -.075, .01, .10));         // grip
      add(B(.052, .058, .06, PAL.black, 0, -.008, -.045));            // trigger housing
      add(B(.026, .030, .11, PAL.black, 0, .048, -.02));              // built-in optic
      add(CYL(.010, .026, PAL.glass, 0, .052, -.075, 8));             // optic lens
      add(B(.020, .014, .016, PAL.steel, 0, .035, -.045));
      add(B(.010, .016, .010, PAL.steel, 0, -.030, -.040));           // trigger
      add(CYL(.010, .026, PAL.steel, 0, .004, -.30, 8));              // barrel shroud
      add(B(.014, .014, .030, PAL.steel, 0, -.006, .05));             // charging handle
      break;
    }

    /* ---------------- UMP-45: angular polymer SMG ---------------- */
    case 'ump': {
      add(B(.058, .072, .30, PAL.poly, 0, 0, -.135));
      add(B(.052, .014, .30, PAL.black, 0, .032, -.135));             // receiver top
      add(RAIL(.22, PAL.black, 0, .042, -.24));                       // top rail
      add(B(.046, .062, .22, PAL.black, 0, -.006, -.30));             // squared handguard
      add(B(.034, .010, .18, PAL.poly, 0, .026, -.30));               // handguard rib
      add(CYL(.016, .11, PAL.steel, 0, .004, -.41, 8));
      add(B(.028, .030, .04, PAL.black, 0, .004, -.45));              // muzzle device
      add(B(.044, .135, .055, PAL.mag, 0, -.105, -.075));             // thick .45 mag
      add(B(.048, .024, .060, PAL.black, 0, -.175, -.075));
      add(B(.044, .115, .058, PAL.poly, 0, -.085, .015, .22));
      for (let i = 0; i < 3; i++) add(B(.046, .008, .042, PAL.black, 0, -.055 + i * .022, .016, .22));
      add(B(.048, .058, .14, PAL.poly, 0, -.006, .09));               // folding stock
      add(B(.040, .058, .06, PAL.black, 0, -.006, .17));
      add(B(.025, .028, .11, PAL.black, 0, .050, -.10));              // rail riser
      add(B(.024, .020, .026, PAL.black, 0, -.058, -.105));
      add(B(.011, .018, .010, PAL.steel, 0, -.050, -.10));            // trigger
      break;
    }

    /* ---------------- Nova: pump-action shotgun ---------------- */
    case 'nova': {
      add(B(.050, .075, .17, PAL.gun, 0, 0, -.08));                   // receiver
      add(B(.044, .014, .17, PAL.black, 0, .032, -.08));              // receiver top
      add(CYL(.017, .42, PAL.steel, 0, .030, -.375, 10));             // barrel
      add(CYL(.019, .05, PAL.black, 0, .030, -.58, 10));              // muzzle
      add(CYL(.016, .32, PAL.black, 0, .000, -.32, 10));              // mag tube
      add(CYL(.010, .30, PAL.steel, 0, .030, -.375, 8));              // barrel rib
      add(B(.058, .046, .13, PAL.wood, 0, .002, -.28));               // pump forend
      for (let i = 0; i < 5; i++) add(B(.060, .008, .010, PAL.wood, 0, .002, -.33 + i * .024));   // forend grooves
      add(B(.048, .115, .055, PAL.wood, 0, -.085, .015, .20));
      add(B(.052, .085, .20, PAL.wood, 0, -.012, .11));               // stock
      add(B(.044, .075, .05, PAL.gun, 0, -.012, .215));               // recoil pad
      add(B(.020, .014, .014, PAL.steel, 0, .062, -.55));
      add(B(.014, .012, .012, PAL.steel, 0, .062, -.62));             // front bead
      add(B(.024, .020, .026, PAL.black, 0, -.055, -.06));
      break;
    }

    /* ---------------- XM1014: semi-auto shotgun ---------------- */
    case 'xm': {
      add(B(.058, .085, .28, PAL.black, 0, 0, -.135));                // bulky receiver
      add(B(.052, .012, .28, PAL.gun, 0, .040, -.135));               // receiver top
      add(CYL(.019, .40, PAL.steel, 0, .028, -.38, 10));
      add(CYL(.022, .06, PAL.black, 0, .028, -.57, 10));              // muzzle brake
      add(CYL(.018, .34, PAL.gun, 0, -.002, -.35, 10));               // gas tube
      add(B(.056, .048, .16, PAL.poly, 0, .000, -.30));               // broad forend
      for (let i = 0; i < 4; i++) add(B(.058, .008, .012, PAL.black, 0, .000, -.26 + i * .036));
      add(B(.050, .115, .058, PAL.black, 0, -.088, .015, .20));
      add(B(.052, .075, .18, PAL.poly, 0, -.008, .10));               // stock
      add(B(.046, .070, .05, PAL.black, 0, -.008, .20));              // recoil pad
      add(B(.058, .028, .055, PAL.mag, 0, .075, -.20));               // shell holder
      for (let i = 0; i < 3; i++) add(CYL(.010, .020, 0xb03020, 0, .075, -.185 + i * .020, 8));   // spare shells
      add(RAIL(.16, PAL.black, 0, .052, -.135));                      // optic rail
      add(B(.024, .020, .026, PAL.black, 0, -.058, -.055));
      break;
    }

    /* ---------------- Galil AR: utilitarian assault rifle ---------------- */
    case 'galil': {
      add(B(.060, .080, .40, PAL.poly, 0, 0, -.19));                  // slab receiver
      add(B(.054, .014, .40, PAL.black, 0, .034, -.19));              // receiver top
      add(B(.046, .060, .26, PAL.black, 0, -.006, -.43));             // handguard
      for (let i = 0; i < 4; i++) add(B(.048, .008, .012, PAL.poly, 0, -.006, -.37 + i * .036));
      add(B(.020, .020, .10, PAL.steel, 0, .032, -.52));              // gas block
      add(CYL(.015, .16, PAL.steel, 0, .008, -.62, 8));               // barrel
      add(B(.030, .026, .045, PAL.black, 0, .008, -.70));             // birdcage flash hider
      for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; add(B(.046, .008, .008, PAL.black, Math.cos(a) * .014, .008 + Math.sin(a) * .014, -.70)); }
      add(B(.046, .175, .070, PAL.mag, 0, -.125, -.16, -.06));        // long curved mag
      add(B(.046, .130, .058, PAL.poly, 0, -.092, .015, .22));
      for (let i = 0; i < 3; i++) add(B(.048, .008, .042, PAL.black, 0, -.062 + i * .022, .016, .22));
      add(B(.048, .070, .16, PAL.poly, 0, .004, .10));                // folding stock
      add(B(.044, .062, .05, PAL.black, 0, .004, .19));
      add(B(.022, .030, .12, PAL.black, 0, .058, -.10));              // rail
      add(B(.030, .030, .012, PAL.glass, 0, .062, -.05));             // rear peep
      add(B(.024, .020, .026, PAL.black, 0, -.060, -.13));
      add(B(.011, .020, .010, PAL.steel, 0, -.052, -.126));           // trigger
      add(B(.014, .030, .034, PAL.black, 0, -.030, -.24));            // charging handle knob
      break;
    }

    /* ---------------- FAMAS: bullpup, carry handle ---------------- */
    case 'famas': {
      add(B(.058, .095, .50, PAL.poly, 0, 0, -.19));                  // long single shell
      add(B(.052, .014, .50, PAL.black, 0, .040, -.19));              // shell top seam
      add(B(.030, .030, .30, PAL.black, 0, .088, -.20));              // tall carry handle
      add(B(.026, .028, .30, PAL.poly, 0, .060, -.20));
      add(B(.020, .026, .06, PAL.steel, 0, .088, -.03));              // rear sight notch
      add(B(.018, .030, .04, PAL.steel, 0, .088, -.37));              // front post
      add(CYL(.013, .13, PAL.steel, 0, .010, -.47, 8));               // barrel
      add(B(.026, .028, .05, PAL.black, 0, .010, -.52));              // muzzle
      add(B(.046, .150, .070, PAL.mag, 0, -.120, .02));               // rear mag (bullpup)
      for (let i = 0; i < 3; i++) add(B(.048, .010, .068, PAL.black, 0, -.08 - i * .030, .02));   // mag ribs
      add(B(.044, .115, .056, PAL.poly, 0, -.085, -.08, .18));
      add(B(.052, .045, .24, PAL.black, 0, -.020, -.42));             // handguard/bipod rail
      add(B(.020, .050, .10, PAL.poly, 0, -.062, -.44));              // folded bipod
      add(B(.024, .020, .026, PAL.black, 0, -.055, -.20));
      add(B(.010, .018, .010, PAL.steel, 0, -.049, -.196));           // trigger
      add(B(.016, .020, .040, PAL.steel, 0, .040, -.30));             // charging handle
      add(DOT(.006, 0xffd06a, 0, .100, -.36));                        // front sight dot
      break;
    }

    /* ---------------- AK-47: wood furniture, curved mag ---------------- */
    case 'ak47': {
      add(B(.056, .078, .34, PAL.gun, 0, 0, -.16));                   // stamped receiver
      add(B(.024, .026, .30, PAL.black, 0, .052, -.17));              // dust-cover rail
      add(B(.052, .062, .22, PAL.wood, 0, -.004, -.35));              // wooden handguard
      for (let i = 0; i < 4; i++) add(B(.054, .008, .012, PAL.wood, 0, -.004, -.30 + i * .034));   // handguard grooves
      add(B(.020, .020, .09, PAL.steel, 0, .030, -.44));              // gas block
      add(B(.016, .016, .05, PAL.black, 0, .030, -.48));              // gas tube front
      add(CYL(.014, .20, PAL.steel, 0, .008, -.56, 8));
      add(B(.026, .024, .05, PAL.black, 0, .008, -.67));              // slant brake
      // the signature curved magazine (three stacked segments)
      add(B(.044, .080, .070, PAL.mag, 0, -.085, -.13, -.05));
      add(B(.044, .080, .072, PAL.mag, 0, -.155, -.155, -.16));
      add(B(.044, .070, .074, PAL.mag, 0, -.215, -.195, -.30));
      for (let i = 0; i < 3; i++) add(B(.046, .010, .072, PAL.black, 0, -.12 - i * .055, -.15 - i * .03, -.18));   // mag ribs
      add(B(.046, .120, .056, PAL.wood, 0, -.082, .025, .20));        // wooden grip
      add(B(.050, .100, .17, PAL.wood, 0, -.005, .14));               // wooden stock
      add(B(.036, .070, .05, PAL.gun, 0, -.048, .215, -.10));         // stock comb
      add(B(.022, .026, .10, PAL.black, 0, .060, -.06));
      add(B(.024, .020, .028, PAL.black, 0, -.056, -.09));
      add(B(.011, .020, .010, PAL.steel, 0, -.048, -.086));           // trigger
      add(B(.014, .034, .036, PAL.black, 0, -.010, .035));            // safety lever
      add(B(.016, .016, .020, PAL.steel, .036, .004, -.16));          // charging handle
      break;
    }

    /* ---------------- M4A4: carbine, flat-top, carry handle stock ---------------- */
    case 'm4a4': {
      add(B(.054, .072, .38, PAL.black, 0, 0, -.18));
      add(B(.030, .020, .30, PAL.steel, 0, .048, -.19));              // flat-top rail
      for (let i = 0; i < 8; i++) add(B(.034, .010, .014, PAL.steel, 0, .052, -.33 + i * .036));   // rail teeth
      add(B(.032, .034, .035, PAL.black, 0, .042, -.02));             // rear sight block
      add(B(.050, .058, .26, PAL.poly, 0, -.004, -.42));              // round handguard
      for (let i = 0; i < 5; i++) add(B(.052, .008, .010, PAL.black, 0, -.004, -.34 + i * .038));   // heat-shield vents
      add(CYL(.014, .17, PAL.steel, 0, .006, -.60, 8));
      add(B(.028, .028, .05, PAL.black, 0, .006, -.70));              // A2 flash hider
      add(B(.030, .030, .10, PAL.gun, 0, .040, -.34));                // carry handle / optic
      add(CYL(.011, .05, PAL.glass, 0, .040, -.34, 8));
      add(B(.046, .140, .068, PAL.mag, 0, -.100, -.16, .02));         // straight STANAG mag
      add(B(.048, .012, .070, PAL.black, 0, -.055, -.16, .02));       // mag catch line
      add(B(.044, .115, .056, PAL.poly, 0, -.082, .015, .20));
      for (let i = 0; i < 3; i++) add(B(.046, .008, .040, PAL.black, 0, -.052 + i * .022, .016, .20));
      add(B(.048, .078, .16, PAL.poly, 0, -.004, .10));               // buffer tube
      add(B(.052, .080, .07, PAL.black, 0, -.004, .19));              // collapsible stock
      add(B(.024, .020, .026, PAL.black, 0, -.056, -.12));
      add(B(.011, .020, .010, PAL.steel, 0, -.048, -.116));           // trigger
      add(B(.014, .030, .030, PAL.black, 0, -.030, .02));             // bolt catch
      break;
    }

    /* ---------------- SG 553: heavy rifle with a scope ---------------- */
    case 'sg553': {
      add(B(.062, .085, .40, PAL.oliv, 0, 0, -.19));
      add(B(.056, .014, .40, PAL.black, 0, .036, -.19));              // receiver top
      add(B(.060, .062, .24, PAL.black, 0, -.004, -.43));
      for (let i = 0; i < 4; i++) add(B(.062, .008, .012, PAL.oliv, 0, -.004, -.37 + i * .036));
      add(CYL(.016, .15, PAL.steel, 0, .006, -.60, 8));
      add(B(.030, .028, .05, PAL.black, 0, .006, -.69));
      add(B(.026, .026, .03, PAL.steel, 0, .006, -.72));              // muzzle cap
      add(CYL(.026, .19, PAL.black, 0, .080, -.20, 12));              // big scope tube
      add(CYL(.030, .035, PAL.gun, 0, .080, -.10, 12));               // eyepiece
      add(CYL(.031, .030, PAL.gun, 0, .080, -.30, 12));               // objective
      add(CYL(.028, .012, PAL.glass, 0, .080, -.315, 12));            // objective lens
      add(B(.026, .070, .022, PAL.black, 0, .050, -.16));             // scope mount
      add(B(.026, .070, .022, PAL.black, 0, .050, -.26));             // scope mount (front)
      add(B(.046, .150, .068, PAL.mag, 0, -.105, -.16, .04));         // translucent mag
      add(B(.048, .012, .070, PAL.black, 0, -.06, -.16, .04));        // mag bands
      add(B(.046, .115, .058, PAL.poly, 0, -.082, .015, .20));
      add(B(.050, .080, .17, PAL.poly, 0, -.004, .10));
      add(B(.054, .085, .075, PAL.black, 0, -.006, .20));
      add(B(.024, .020, .026, PAL.black, 0, -.056, -.13));
      add(B(.011, .020, .010, PAL.steel, 0, -.048, -.126));           // trigger
      break;
    }

    /* ---------------- AWP: bolt-action sniper ---------------- */
    case 'awp': {
      add(B(.056, .082, .48, PAL.oliv, 0, 0, -.23));                  // long receiver
      add(B(.050, .012, .48, PAL.black, 0, .034, -.23));              // receiver top
      add(B(.044, .060, .30, PAL.oliv, 0, -.004, -.52));              // handguard
      for (let i = 0; i < 5; i++) add(B(.046, .008, .010, PAL.black, 0, -.004, -.44 + i * .036));
      add(CYL(.016, .34, PAL.steel, 0, .008, -.80, 8));               // long barrel
      for (let i = 0; i < 6; i++) add(CYL(.019, .010, PAL.black, 0, .008, -.66 - i * .045, 8));   // barrel flutes
      add(CYL(.021, .09, PAL.black, 0, .008, -.99, 8));               // muzzle brake
      add(CYL(.032, .30, PAL.black, 0, .090, -.28, 12));              // LONG scope
      add(CYL(.037, .05, PAL.gun, 0, .090, -.10, 12));                // eyepiece
      add(CYL(.039, .045, PAL.gun, 0, .090, -.45, 12));               // objective
      add(CYL(.036, .014, PAL.glass, 0, .090, -.468, 12));            // objective lens
      add(CYL(.010, .05, PAL.steel, 0, .126, -.20, 8));               // elevation turret
      add(B(.020, .020, .020, PAL.steel, .034, .090, -.20));          // windage turret
      add(B(.028, .080, .024, PAL.black, 0, .052, -.22));             // scope mount
      add(B(.028, .080, .024, PAL.black, 0, .052, -.35));
      add(B(.022, .040, .13, PAL.steel, 0, -.004, -.22));             // bolt body
      add(CYL(.011, .06, PAL.steel, .034, .004, -.20, 8));            // bolt handle
      add(B(.048, .150, .080, PAL.mag, 0, -.105, -.24));              // low magazine
      add(B(.048, .120, .060, PAL.oliv, 0, -.085, .020, .20));
      add(B(.052, .115, .22, PAL.oliv, 0, -.005, .14));               // thumbhole stock
      add(B(.046, .088, .06, PAL.black, 0, -.012, .26));              // butt pad
      add(B(.030, .046, .10, PAL.steel, 0, -.040, .08));              // cheek riser
      add(B(.011, .020, .010, PAL.steel, 0, -.048, .04));             // trigger
      break;
    }

    /* ---------------- SSG 08 (Scout): light bolt-action ---------------- */
    case 'scout': {
      add(B(.048, .070, .42, PAL.black, 0, 0, -.20));
      add(B(.042, .012, .42, PAL.gun, 0, .030, -.20));                // receiver top
      add(B(.042, .054, .24, PAL.poly, 0, -.004, -.46));
      for (let i = 0; i < 4; i++) add(B(.044, .008, .010, PAL.black, 0, -.004, -.40 + i * .034));
      add(CYL(.013, .26, PAL.steel, 0, .006, -.68, 8));
      add(B(.024, .024, .04, PAL.black, 0, .006, -.81));              // muzzle
      add(CYL(.024, .22, PAL.black, 0, .080, -.26, 12));              // smaller scope
      add(CYL(.029, .04, PAL.gun, 0, .080, -.12, 12));
      add(CYL(.030, .038, PAL.gun, 0, .080, -.39, 12));
      add(CYL(.027, .010, PAL.glass, 0, .080, -.402, 12));            // lens
      add(CYL(.009, .04, PAL.steel, 0, .108, -.20, 8));               // turret
      add(B(.026, .068, .022, PAL.black, 0, .046, -.20));
      add(B(.024, .020, .09, PAL.steel, 0, -.002, -.20));             // bolt
      add(CYL(.010, .05, PAL.steel, .030, .004, -.19, 8));
      add(B(.042, .120, .070, PAL.mag, 0, -.090, -.22));
      add(B(.044, .110, .055, PAL.poly, 0, -.078, .015, .20));
      add(B(.048, .088, .19, PAL.poly, 0, -.006, .12));
      add(B(.046, .080, .05, PAL.black, 0, -.010, .22));
      add(B(.011, .020, .010, PAL.steel, 0, -.046, .04));             // trigger
      break;
    }

    /* ---------------- Negev: heavy machine gun ---------------- */
    case 'negev': {
      add(B(.075, .100, .46, PAL.gun, 0, 0, -.22));                   // huge receiver
      add(B(.068, .014, .46, PAL.black, 0, .040, -.22));              // receiver top
      add(B(.070, .080, .26, PAL.black, 0, -.004, -.47));
      for (let i = 0; i < 4; i++) add(B(.072, .008, .012, PAL.gun, 0, -.004, -.40 + i * .040));
      add(CYL(.019, .22, PAL.steel, 0, .008, -.70, 8));
      add(B(.034, .034, .06, PAL.black, 0, .008, -.82));
      add(B(.170, .185, .190, PAL.oliv, 0, -.150, -.20));             // big ammo box
      add(B(.150, .020, .170, PAL.gun, 0, -.055, -.20));              // box lid
      add(B(.014, .020, .170, PAL.black, 0, -.098, -.20));            // box latch strip
      add(RAIL(.30, PAL.black, 0, .062, -.15));                       // top rail
      add(B(.030, .120, .10, PAL.black, 0, -.075, -.05));             // belt feed
      add(B(.056, .120, .060, PAL.poly, 0, -.088, .035, .20));
      add(B(.052, .090, .17, PAL.gun, 0, -.004, .12));                // stock
      add(B(.048, .080, .05, PAL.black, 0, -.010, .21));
      add(B(.034, .040, .05, PAL.steel, 0, .066, -.02));              // rear sight
      add(CYL(.022, .05, PAL.steel, 0, .066, -.32, 10));              // front sight
      add(B(.024, .026, .10, PAL.black, 0, -.070, -.60));             // foregrip
      add(B(.011, .020, .010, PAL.steel, 0, -.052, .02));             // trigger
      break;
    }

    /* ---------------- M134 Minigun: rotating multi-barrel ---------------- */
    case 'minigun': {
      add(B(.090, .110, .34, PAL.gun, 0, 0, -.16));                   // motor housing
      add(B(.084, .014, .34, PAL.black, 0, .050, -.16));              // housing top
      for (let i = 0; i < 4; i++) add(B(.092, .010, .014, PAL.black, 0, -.030 + i * .028, -.16));   // housing ribs
      add(B(.100, .120, .14, PAL.black, 0, 0, .01));                  // gearbox
      add(CYL(.056, .05, PAL.steel, 0, 0, .07, 14));                  // gearbox cap
      // The barrel cluster is its own group so the barrels can visibly spin up
      // before firing (and coast down after). Everything that turns rides in
      // here: six barrels, their clamps and the muzzle ring.
      const barrels = new THREE.Group();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const b = CYL(.014, .62, PAL.steel, Math.cos(a) * .052, Math.sin(a) * .052, -.62, 6);
        barrels.add(b);
        barrels.add(CYL(.017, .05, PAL.black, Math.cos(a) * .052, Math.sin(a) * .052, -.36, 8));   // muzzle collar
      }
      barrels.add(CYL(.060, .07, PAL.black, 0, 0, -.30, 12));          // barrel clamp front
      barrels.add(CYL(.058, .06, PAL.black, 0, 0, -.52, 12));          // barrel clamp rear
      barrels.add(CYL(.056, .05, PAL.gun, 0, 0, -.94, 12));            // muzzle ring
      barrels.add(CYL(.048, .03, PAL.steel, 0, 0, -.97, 12));          // muzzle face
      barrels.name = 'barrels';                                        // found by name (clone-safe)
      g.add(barrels);
      add(B(.150, .170, .170, PAL.oliv, 0, -.165, -.02));             // ammo drum
      add(CYL(.085, .10, PAL.oliv, 0, -.165, .085, 14));              // drum body
      add(CYL(.050, .012, PAL.black, 0, -.165, .14, 14));             // drum hub
      add(B(.034, .120, .11, PAL.black, 0, -.070, -.14));             // feed chute
      add(RAIL(.28, PAL.black, 0, .078, -.14));                       // top rail
      add(B(.034, .044, .05, PAL.steel, 0, .082, -.02));              // rear sight
      add(CYL(.020, .045, PAL.steel, 0, .082, -.36, 8));              // front sight
      add(B(.040, .105, .26, PAL.poly, 0, -.020, .16));               // rear grip
      add(B(.026, .070, .09, PAL.black, 0, -.075, -.44));             // foregrip
      add(B(.012, .030, .030, PAL.steel, 0, -.030, .02));             // spade grip
      break;
    }

    /* ---------------- RPG-7: rocket launcher ---------------- */
    case 'rpg': {
      const WOOD = PAL.wood, STEEL = PAL.steel, DARK = PAL.black, OLIVE = PAL.oliv;
      add(CYL(.052, 1.02, OLIVE, 0, .020, -.40, 16));                // long launch tube
      // tube seams / rings
      for (let i = 0; i < 5; i++) add(CYL(.054, .014, DARK, 0, .020, -.88 + i * .20, 16));
      add(CYL(.060, .10, DARK, 0, .020, .08, 16));                   // rear flare
      add(CYL(.070, .05, DARK, 0, .020, .135, 16));                  // rear rim
      add(CYL(.086, .14, OLIVE, 0, .020, -.92, 16));                 // muzzle bell
      add(CYL(.074, .03, DARK, 0, .020, -.985, 16));                 // muzzle rim
      add(CYL(.090, .02, DARK, 0, .020, -1.0, 16));                  // muzzle lip
      // heat-shield / grip band with wooden panels
      add(B(.055, .062, .22, DARK, 0, .020, -.14));                  // heat shield band
      add(B(.058, .048, .06, WOOD, 0, .020, -.05));
      add(B(.058, .048, .06, WOOD, 0, .020, -.23));
      add(BOLTS(2, .16, .011, STEEL, .030, .020, -.14, 'z'));        // band bolts
      // wooden grips
      add(B(.052, .058, .20, WOOD, 0, .020, .16));                   // wooden rear grip
      add(B(.048, .054, .16, WOOD, 0, .020, -.46));                  // wooden foregrip
      add(B(.052, .014, .18, DARK, 0, .048, .16));                   // grip strap
      // iron sights (folding)
      add(B(.026, .052, .022, DARK, 0, .066, .05));                  // rear sight
      add(B(.014, .020, .014, STEEL, 0, .066, .05));
      add(B(.028, .060, .024, DARK, 0, .066, -.74));                 // front sight tower
      add(B(.012, .030, .012, STEEL, 0, .092, -.74));
      // optical sight (PGO-7 style)
      add(CYL(.030, .26, STEEL, 0, .104, -.46, 12));                 // optic tube
      add(CYL(.036, .05, PAL.gun, 0, .104, -.33, 12));               // eyepiece
      add(CYL(.038, .05, PAL.gun, 0, .104, -.60, 12));               // objective
      add(CYL(.034, .012, PAL.glass, 0, .104, -.615, 12));           // lens
      add(B(.022, .022, .05, PAL.gun, .030, .104, -.50));            // windage turret
      add(B(.024, .064, .024, DARK, 0, .060, -.46));                 // scope mount
      add(B(.026, .070, .022, DARK, 0, .060, -.56));                 // scope mount (front)
      // loaded rocket: body + pointed warhead with a booster
      add(CYL(.040, .18, PAL.gun, 0, .020, -1.04, 14));              // rocket body
      for (let i = 0; i < 3; i++) add(CYL(.042, .012, DARK, 0, .020, -1.00 + i * .05, 14));
      const cone = new THREE.Mesh(new THREE.ConeGeometry(.062, .18, 16), gunMat(0x8a3b2a));
      cone.position.set(0, .020, -1.21); cone.rotation.x = -Math.PI / 2;
      add(cone);                                                      // warhead
      add(B(.016, .016, .016, 0x1a1a1a, 0, .020, -1.30));            // fuze tip
      // trigger group + grip
      add(B(.028, .042, .13, DARK, 0, -.030, -.06));                 // trigger housing
      add(B(.030, .052, .07, PAL.poly, 0, -.062, -.02, .18));        // pistol grip
      add(B(.012, .024, .012, STEEL, 0, -.046, -.05));               // trigger
      add(B(.022, .030, .024, DARK, 0, .078, -.02));                 // front iron sight
      add(CYL(.014, .06, STEEL, 0, .078, .10, 10));                  // rear sight base
      add(B(.010, .020, .022, STEEL, .032, .020, -.14));             // sling loop
      add(B(.020, .020, .040, DARK, 0, .020, -.60));                 // band bracket
      add(CYL(.010, .14, DARK, 0, .058, -.14, 8));                   // top carry handle bar
      break;
    }

    /* ---------------- ЛАЗЕРНАЯ ВИНТОВКА: sleek energy rifle ---------------- */
    case 'laser': {
      const GLOW = 0x39ff5a, GLOW2 = 0x1b9b3a, BODY = 0x2b3340, TRIM = 0x50596b;
      add(B(.070, .090, .50, BODY, 0, 0, -.22));                    // long receiver
      add(B(.052, .058, .30, TRIM, 0, .005, -.50));                 // upper rail shroud
      add(CYL(.024, .42, PAL.steel, 0, .020, -.72, 10));            // emitter barrel
      add(CYL(.030, .05, GLOW, 0, .020, -.93, 10));                 // glowing emitter
      add(B(.040, .048, .10, PAL.black, 0, .020, -.90));            // muzzle shroud
      // energy core in the receiver
      add(B(.034, .030, .16, GLOW, 0, .050, -.30));
      add(B(.030, .026, .10, GLOW2, 0, .050, -.16));
      // magazine cell
      add(B(.044, .120, .070, PAL.poly, 0, -.098, -.26, .10));
      add(B(.040, .030, .062, GLOW2, 0, -.152, -.27, .10));
      // grip + stock
      add(B(.046, .115, .058, PAL.poly, 0, -.086, -.03, .18));
      add(B(.052, .078, .20, BODY, 0, -.006, .12));
      add(B(.046, .070, .05, PAL.black, 0, -.006, .225));
      // scope
      add(B(.028, .030, .12, PAL.black, 0, .062, -.20));
      add(CYL(.016, .10, TRIM, 0, .062, -.20, 8));
      add(B(.020, .012, .012, GLOW, 0, .092, -.52));
      break;
    }

    /* ---------------- ЛАЗЕРНАЯ ПУШКА: divided-barrel laser cannon ----------------
       A long olive-grey slab frame with a scope, a copper generator drum and a
       rear grille. The barrel is SPLIT lengthwise: two long half-shells orbit a
       glowing red-hot core with ribbed teeth between them, and that divided part
       spins (its group is named `barrels`, see applyBarrelSpin). Added detail:
       glowing energy coils, a copper trim ring, vent slots and an emitter lens. */
    case 'laserCannon': {
      const OLIV = 0xb2b6a0, OLIV2 = 0x8f947c, DARK = 0x2a2e26, BLACK = 0x161a17,
            HOT = 0xff6a2a, GLOW = 0xffc070, RED = 0xff3a1a, COPPER = 0xc98a3c, BLUE = 0x8fd8ff;
      // a basic-material (self-lit) cylinder, used for all the glowing parts
      const glowCyl = (r, len, color, z, seg) => {
        const geo = new THREE.CylinderGeometry(r, r, len, seg || 12);
        geo.rotateX(Math.PI / 2);
        const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color }));
        m.position.set(0, 0, z);
        return m;
      };
      /* ---- static frame ---- */
      add(B(.164, .150, .48, OLIV, 0, .005, -.10));                 // rear receiver housing
      add(B(.150, .020, .48, OLIV2, 0, .082, -.10));                // housing top bevel
      add(B(.130, .070, .34, OLIV2, 0, .095, -.12));                // top deck
      add(B(.182, .116, .17, OLIV2, 0, -.006, -.36));               // mid collar
      add(B(.156, .028, .64, OLIV2, 0, -.090, -.60));               // under-rail
      // angled side cheek plates (front of the receiver)
      [-1, 1].forEach(sgn => {
        add(B(.026, .10, .22, OLIV2, sgn * .084, -.02, -.30, sgn * .12));
        add(B(.014, .058, .16, DARK, sgn * .096, .05, -.28));       // dark inset panel
        add(B(.010, .010, .05, HOT, sgn * .100, .07, -.33));        // glowing screw
      });
      // copper trim ring around the collar
      add(CYL(.095, .022, COPPER, 0, 0, -.44, 20));
      // scope / sight block with a glowing screen
      add(B(.080, .062, .14, OLIV2, 0, .158, -.06));
      add(B(.064, .042, .012, BLUE, 0, .160, -.130));               // glowing screen
      add(B(.070, .010, .14, DARK, 0, .190, -.06));                 // scope hood
      add(B(.032, .032, .05, DARK, 0, .156, .02));
      add(B(.028, .028, .028, HOT, 0, .182, .02));
      // rear heat-sink with a grille and copper bolts
      add(B(.156, .176, .14, DARK, 0, .000, .20));
      add(B(.156, .154, .05, OLIV2, 0, .000, .272));
      for (let i = 0; i < 4; i++) add(B(.146, .012, .014, BLACK, 0, -.056 + i * .040, .140));
      add(CYL(.012, .02, COPPER, .05, .066, .272, 8));
      add(CYL(.012, .02, COPPER, -.05, .066, .272, 8));
      // support rod running back to the heat-sink
      add(CYL(.019, .30, OLIV2, 0, .066, .07, 8));
      // front muzzle block + sights
      add(B(.160, .146, .16, OLIV2, 0, .006, -1.16));
      add(B(.034, .090, .030, DARK, 0, .126, -1.14));
      add(B(.028, .028, .028, HOT, 0, .160, -1.14));
      // retaining rings that hold the rotating barrel
      add(CYL(.110, .052, OLIV2, 0, 0, -.38, 20));
      add(CYL(.110, .052, OLIV2, 0, 0, -1.08, 20));
      add(CYL(.094, .030, COPPER, 0, 0, -.56, 20));
      // the big copper generator drum just behind the barrel
      add(CYL(.100, .080, DARK, 0, 0, -.28, 20));
      add(CYL(.104, .030, COPPER, 0, 0, -.248, 20));
      add(glowCyl(.084, .014, RED, -.324, 20));
      add(glowCyl(.062, .016, 0xff9a5a, -.330, 20));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        add(B(.030, .011, .011, GLOW, Math.cos(a) * .046, Math.sin(a) * .046, -.332));
      }
      // cooling fins under the receiver
      for (let i = 0; i < 5; i++) add(B(.104, .022, .014, DARK, 0, -.064, -.46 - i * .050));
      // pistol grip + trigger guard + a glowing ammo-cell
      add(B(.056, .158, .066, DARK, 0, -.120, -.05, .16));
      add(B(.044, .016, .11, DARK, 0, -.066, -.09));
      add(B(.030, .052, .022, GLOW, 0, -.070, .02));
      /* ---- ROTATING split barrel: two half-shells orbiting a hot core ---- */
      const barrels = new THREE.Group();
      barrels.add(glowCyl(.030, .80, RED, -.74, 16));               // core rod
      barrels.add(glowCyl(.020, .78, GLOW, -.74, 16));              // brighter inner
      // ribbed teeth rings around the core
      for (let i = 0; i < 12; i++) {
        const z = -.40 - i * .060;
        barrels.add(CYL(.050, .018, HOT, 0, 0, z, 14));
        barrels.add(B(.104, .014, .016, GLOW, 0, 0, z));
        barrels.add(B(.016, .104, .014, GLOW, 0, 0, z));
      }
      // glowing energy coils wound along the core
      for (let i = 0; i < 9; i++) {
        const z = -.42 - i * .078;
        const coil = new THREE.Mesh(new THREE.TorusGeometry(.038, .008, 6, 16),
          new THREE.MeshBasicMaterial({ color: i % 2 ? GLOW : HOT }));
        coil.position.z = z; barrels.add(coil);
      }
      // the two long half-shells (they spin around the core as one divided part)
      const halfShell = (sgn) => {
        const s = new THREE.Group();
        s.add(B(.060, .062, .80, OLIV, sgn * .078, 0, 0));          // sculpted side shell
        s.add(B(.052, .050, .82, OLIV2, sgn * .050, 0, 0));         // inner shell
        s.add(B(.026, .012, .80, BLACK, sgn * .104, -.020, 0));     // dark stripe
        for (let i = 0; i < 10; i++) s.add(B(.020, .018, .016, HOT, sgn * .096, 0, -.36 + i * .080));
        s.position.z = -.74;
        return s;
      };
      barrels.add(halfShell(1), halfShell(-1));
      // vent slots on top of the barrel shroud
      for (let i = 0; i < 6; i++) barrels.add(B(.030, .008, .030, BLACK, 0, .088, -.46 - i * .09));
      barrels.name = 'barrels';
      g.add(barrels);
      // emitter lens at the very tip
      const lens = new THREE.Mesh(new THREE.SphereGeometry(.034, 12, 10),
        new THREE.MeshBasicMaterial({ color: 0xfff0d0 }));
      lens.position.set(0, 0, -1.235); g.add(lens);
      break;
    }

    /* ---------------- АТОМНОЕ РПГ СВОБОДЫ: bulky green launcher ---------------- */
    case 'atomicRpg': {
      const GREEN = 0x2f7d3a, GREEN2 = 0x1c4f24, DARK = 0x14181c, GLOW = 0x39ff5a;
      add(CYL(.058, .86, GREEN, 0, .030, -.30, 12));                // fat launch tube
      add(CYL(.070, .16, GREEN2, 0, .030, -.72, 12));               // muzzle bell
      add(CYL(.066, .12, GREEN2, 0, .030, .14, 12));                // rear bell
      add(CYL(.062, .06, GLOW, 0, .030, -.80, 12));                 // glowing muzzle ring
      for (let i = 0; i < 4; i++) add(CYL(.060, .012, GREEN2, 0, .030, -.50 - i * .06, 12));   // hazard rings
      // warhead poking out front
      add(CYL(.040, .16, PAL.black, 0, .030, -.90, 10));
      add(B(.050, .050, .05, GLOW, 0, .030, -.99));
      add(CYL(.024, .05, 0x39ff5a, 0, .030, -1.03, 10));            // glowing tip
      // grips and sight
      add(B(.046, .120, .060, DARK, 0, -.078, -.14, .12));          // pistol grip
      add(B(.040, .110, .055, DARK, 0, -.075, -.44, -.05));         // foregrip
      add(B(.028, .070, .12, DARK, 0, .098, -.20));                 // optic
      add(CYL(.014, .04, 0x39ff5a, 0, .098, -.28, 8));              // optic glow
      add(B(.026, .026, .05, GLOW, 0, .135, -.24));
      add(B(.030, .030, .10, GREEN2, 0, .105, -.50));               // front sight block
      add(CYL(.014, .020, GLOW, 0, .030, -.20, 8));                 // glowing indicator
      add(B(.024, .030, .024, DARK, 0, .095, -.34));                // rear sight
      add(B(.016, .020, .016, DARK, 0, .100, -.62));                // front sight post
      break;
    }

    /* ---------------- Y.H.S: huge multi-barrel super gun ---------------- */
    case 'yhs': {
      const BODY = 0x3a2f4a, TRIM = 0x5a4a72, HOT = 0xff9d21;
      add(B(.110, .130, .40, BODY, 0, 0, -.20));                    // massive housing
      add(B(.104, .014, .40, PAL.black, 0, .060, -.20));            // housing top
      for (let i = 0; i < 4; i++) add(B(.112, .010, .014, PAL.black, 0, -.042 + i * .030, -.20));   // housing ribs
      add(B(.120, .140, .16, PAL.black, 0, 0, .01));                 // gearbox
      add(CYL(.070, .05, TRIM, 0, 0, .085, 16));                     // gearbox cap
      add(CYL(.030, .03, HOT, 0, 0, .105, 12));                      // rear glowing hub
      const barrels = new THREE.Group();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        barrels.add(CYL(.016, .74, PAL.steel, Math.cos(a) * .062, Math.sin(a) * .062, -.72, 6));
        barrels.add(CYL(.019, .05, PAL.black, Math.cos(a) * .062, Math.sin(a) * .062, -.44, 8));   // front collars
      }
      barrels.add(CYL(.072, .08, PAL.black, 0, 0, -.34, 12));
      barrels.add(CYL(.070, .07, TRIM, 0, 0, -.62, 12));
      barrels.add(CYL(.066, .06, HOT, 0, 0, -1.10, 12));             // hot muzzle ring
      barrels.add(CYL(.056, .03, PAL.steel, 0, 0, -1.14, 12));       // muzzle face
      barrels.name = 'barrels';
      g.add(barrels);

      /* Three extra heavy barrels on an OUTER ring. They ride in their own group
         so they can counter-rotate for a livelier look (animated in both the
         first-person view and on remote players). */
      const outer = new THREE.Group();
      const OUTER_R = .112;
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
        const ox = Math.cos(a) * OUTER_R, oy = Math.sin(a) * OUTER_R;
        outer.add(CYL(.026, .96, TRIM, ox, oy, -.80, 8));            // thick barrel
        outer.add(CYL(.034, .09, PAL.black, ox, oy, -.36, 8));       // rear collar
        outer.add(CYL(.030, .08, HOT, ox, oy, -1.22, 8));            // glowing muzzle tip
      }
      // a brace ring that visibly ties the three outer barrels together
      outer.add(CYL(.120, .07, PAL.black, 0, 0, -.64, 16));
      outer.add(CYL(.118, .06, TRIM, 0, 0, -1.02, 16));
      outer.name = 'barrels2';
      g.add(outer);

      add(B(.180, .220, .220, PAL.oliv, 0, -.205, -.02));           // giant ammo drum
      add(CYL(.105, .12, PAL.oliv, 0, -.205, .11, 16));
      add(CYL(.060, .016, PAL.black, 0, -.205, .175, 16));          // drum hub
      add(B(.046, .140, .12, PAL.black, 0, -.085, -.18));           // feed chute
      add(RAIL(.34, PAL.black, 0, .092, -.18));                     // top rail
      add(B(.040, .052, .06, PAL.steel, 0, .098, -.02));            // rear sight
      add(CYL(.022, .05, TRIM, 0, .098, -.44, 8));                  // front sight
      add(B(.050, .120, .28, PAL.poly, 0, -.025, .18));             // rear grip
      add(B(.030, .080, .10, PAL.black, 0, -.085, -.56));           // foregrip
      add(B(.012, .030, .030, PAL.steel, 0, -.020, .04));           // trigger
      break;
    }

    /* ---------------- РАКЕТНИЦА: guided-missile launcher ---------------- */
    case 'rocketgun': {
      const BODY = 0x39424d, TRIM = 0x59657a, HOT = 0xff8a3a, GLOW = 0xffb060;
      add(B(.110, .120, .52, BODY, 0, 0, -.22));                    // boxy launcher body
      add(B(.102, .014, .52, PAL.black, 0, .055, -.22));            // body top
      add(CYL(.060, .68, TRIM, 0, .040, -.44, 12));                 // launch tube
      add(CYL(.074, .10, PAL.black, 0, .040, -.80, 12));            // muzzle ring
      add(CYL(.066, .07, HOT, 0, .040, -.86, 12));                  // glowing muzzle
      add(CYL(.050, .03, PAL.steel, 0, .040, -.895, 12));           // muzzle face
      add(B(.060, .050, .16, PAL.black, 0, .040, -.72));            // tube clamp
      add(B(.060, .050, .16, PAL.black, 0, .040, -.18));            // rear tube clamp
      // targeting pod on top (the guided sight)
      add(B(.056, .060, .20, PAL.black, 0, .098, -.20));
      add(CYL(.020, .08, GLOW, 0, .098, -.32, 8));                  // lens glow
      add(CYL(.024, .02, PAL.black, 0, .098, -.36, 10));            // lens hood
      // grips + shoulder rest
      add(B(.048, .130, .062, PAL.poly, 0, -.082, -.10, .14));      // pistol grip
      add(B(.044, .115, .058, PAL.poly, 0, -.078, -.40, -.05));     // foregrip
      add(B(.058, .070, .16, BODY, 0, -.010, .16));                 // shoulder stock
      add(B(.052, .058, .05, PAL.black, 0, -.010, .255));
      add(B(.012, .024, .012, PAL.steel, 0, -.048, -.13));          // trigger
      add(B(.030, .030, .028, PAL.black, 0, .070, -.06));           // rear sight
      add(CYL(.014, .03, PAL.steel, 0, .078, -.60, 8));             // front sight
      break;
    }

    /* ---------------- ЭНЕРГОЩИТ: large blue energy shield plate ---------------- */
    case 'shield': {
      const EDGE = 0x4aa3ff, EDGE2 = 0x8fd0ff, CORE = 0x2f7ad0;
      // the emitter gauntlet the player holds
      add(B(.050, .140, .050, 0x2b3340, 0, -.090, .02, .16));       // grip/arm
      add(B(.042, .070, .13, 0x39424d, 0, -.022, -.06));            // forearm mount
      add(B(.030, .036, .05, EDGE, 0, -.010, -.13));                // emitter block
      // a BIG flat energy plate in front of the player (its own group so the
      // game can show/hide it when the shield is actually up)
      const field = new THREE.Group();
      field.name = 'shieldField';
      field.position.set(0, .10, -.42);
      field.visible = false;
      // outline frame: a rounded shield silhouette built from edge bars
      const edgeMat = new THREE.MeshBasicMaterial({ color: EDGE, transparent: true, opacity: .9, depthWrite: false, blending: THREE.AdditiveBlending });
      const fillMat = new THREE.MeshBasicMaterial({ color: CORE, transparent: true, opacity: .28, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
      const rimMat = new THREE.MeshBasicMaterial({ color: EDGE2, transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending });
      field.userData.mats = [edgeMat, fillMat, rimMat];
      // the translucent body of the shield (a tall hexagonal panel)
      const shape = new THREE.Shape();
      shape.moveTo(0, -.85);
      shape.lineTo(-.55, -.55);
      shape.lineTo(-.62, .10);
      shape.lineTo(-.40, .72);
      shape.lineTo(0, .90);
      shape.lineTo(.40, .72);
      shape.lineTo(.62, .10);
      shape.lineTo(.55, -.55);
      shape.lineTo(0, -.85);
      const panel = new THREE.Mesh(new THREE.ShapeGeometry(shape), fillMat);
      panel.renderOrder = 4;
      field.add(panel);
      // glowing rim around the panel
      const rim = new THREE.Line(new THREE.BufferGeometry().setFromPoints(shape.getPoints(40)),
        new THREE.LineBasicMaterial({ color: EDGE2, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false }));
      rim.position.z = .01;
      field.add(rim);
      // vertical spine + two side struts (the glowing circuitry look)
      const strut = (w, h, x, y, mat) => {
        const s = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
        s.position.set(x, y, .02);
        return s;
      };
      field.add(strut(.05, 1.35, 0, .0, edgeMat));                   // central spine
      field.add(strut(.045, 1.0, -.30, -.05, rimMat));               // left strut
      field.add(strut(.045, 1.0, .30, -.05, rimMat));                // right strut
      field.add(strut(.30, .05, 0, .45, rimMat));                    // upper bar
      field.add(strut(.30, .05, 0, -.45, rimMat));                   // lower bar
      // small emitter nodes around the rim
      [[-.5, .25], [.5, .25], [-.42, -.5], [.42, -.5], [0, .8]].forEach(p => {
        const n = new THREE.Mesh(new THREE.CircleGeometry(.06, 10), edgeMat);
        n.position.set(p[0], p[1], .03);
        field.add(n);
      });
      g.add(field);
      g.userData.field = field;
      break;
    }


    /* ---------------- БАНАН: the banana launcher ---------------- */
    case 'banana': {
      const YELLOW = 0xf2c93b, YELLOW2 = 0xd9a92a, BROWN = 0x7a5a24, GREEN = 0x6f8f3a;
      // curved banana body: many overlapping segments form a smooth arc
      const SEG = 14;
      for (let i = 0; i < SEG; i++) {
        const t = i / (SEG - 1);
        const w = .082 - t * .026;                     // tapers toward the tip
        const seg = new THREE.Mesh(new THREE.BoxGeometry(w, w, .075), gunMat(i === SEG - 1 ? BROWN : (i % 2 ? YELLOW : YELLOW2)));
        // arc: rises at the back, dips in the middle, tip flicks up
        const curve = -Math.sin(t * Math.PI) * .17 + t * .06;
        seg.position.set(0, curve + .06, -.10 - i * .062);
        seg.rotation.x = -(-Math.cos(t * Math.PI) * .30 + .30) * 1.0 + t * .55;
        seg.rotation.z = Math.sin(t * 3.1) * .04;
        add(seg);
      }
      // stem at the back (grip end)
      add(B(.046, .046, .09, GREEN, 0, .085, .045, 0, -0.30));
      add(B(.032, .032, .045, BROWN, 0, .112, .078));
      // second banana taped alongside for the "magazine"
      for (let i = 0; i < 8; i++) {
        const t = i / 7;
        const seg = new THREE.Mesh(new THREE.BoxGeometry(.05, .05, .07), gunMat(i % 2 ? YELLOW2 : YELLOW));
        const cv = -Math.sin(t * Math.PI) * .12 + t * .03;
        seg.position.set(.095, cv - .075, -.13 - i * .058);
        seg.rotation.x = -(-Math.cos(t * Math.PI) * .28 + .28) + t * .40;
        add(seg);
      }
      // duct-tape bands holding the pair together
      add(B(.15, .020, .032, PAL.black, .048, -.105, -.21));
      add(B(.15, .020, .032, PAL.black, .045, -.095, -.40));
      // grip wrap
      add(B(.056, .125, .068, PAL.black, 0, -.095, .012, .18));
      add(B(.060, .018, .072, BROWN, 0, -.05, .012));
      add(B(.060, .018, .072, BROWN, 0, -.145, .022));
      // sight: a little banana peel stuck on top
      add(B(.028, .048, .028, GREEN, 0, .10, -.16, .30));
      add(B(.024, .028, .024, YELLOW, 0, .135, -.205, .50));
      // stock: a small third banana
      for (let i = 0; i < 5; i++) {
        const seg = new THREE.Mesh(new THREE.BoxGeometry(.055, .055, .08), gunMat(YELLOW));
        seg.position.set(0, .015 + i * .020, .12 + i * .055);
        seg.rotation.x = i * .12;
        add(seg);
      }
      // a leaf sight and a ripe-brown tip on the front banana
      add(B(.024, .010, .030, GREEN, 0, .072, -.30, 0, .30));
      add(B(.018, .018, .020, BROWN, 0, -.030, -.72));
      add(B(.140, .014, .030, PAL.black, .050, -.045, -.30));   // extra tape band
      break;
    }

    /* ============ ЭКСПЕРИМЕНТАЛЬНЫЕ СТВОЛЫ (20к–80к) ============ */

    /* КИСЛОТОМЁТ: баллон с кислотой и распылительное сопло */
    case 'acid': {
      const ACC = 0x9fd23a, DARK = 0x3d4a1f;
      add(B(.09, .10, .30, PAL.gun, 0, .04, -.18));            // ствольная коробка
      add(B(.10, .11, .16, DARK, 0, .05, .02));                // затвор
      add(CYL(.055, .46, PAL.steel, 0, .02, -.48));            // ствол
      add(CYL(.085, .10, ACC, 0, .02, -.72));                  // сопло
      add(B(.13, .016, .03, ACC, 0, .08, -.66));               // усы распыла
      add(B(.13, .016, .03, ACC, 0, -.04, -.66));
      add(B(.052, .13, .07, PAL.black, 0, -.075, .04, .16));   // рукоять
      add(B(.09, .17, .12, 0x2f3a16, 0, .02, .20));            // баллон
      add(B(.075, .15, .10, 0x7fae2a, 0, .02, .205));          // свечение баллона
      add(CYL(.030, .10, PAL.black, 0, .13, .18));             // крышка баллона
      add(B(.06, .02, .30, PAL.gunLight, 0, .10, -.18));       // планка
      add(DOT(.014, 0xd6ff5a, 0, .13, -.34));
      break;
    }

    /* РОЙ: улей-пусковая с сотами */
    case 'hive': {
      const AMB = 0xe0a021, AMB2 = 0x8a5a12, CELL = 0xffc94a;
      add(B(.13, .13, .26, 0x6a4a17, 0, .05, -.12));           // корпус улья
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {  // соты на срезе
        add(CYL(.017, .05, CELL, (c - 1) * .042, .05 + (r - 1) * .042, -.245, 6));
      }
      add(CYL(.05, .16, AMB, 0, .05, .10));                    // задняя камера
      add(B(.05, .12, .06, PAL.black, 0, -.07, .06, .18));     // рукоять
      add(B(.10, .02, .26, AMB2, 0, .13, -.12));               // верхняя лента
      add(DOT(.016, 0xffd25a, 0, .16, -.26));
      add(B(.03, .03, .03, 0x2b2b2b, .06, .11, -.03));         // «глаза» пчёл
      add(B(.03, .03, .03, 0x2b2b2b, -.06, .11, -.03));
      break;
    }

    /* ДИСКОБОЛ: пусковая с видимым диском */
    case 'disc': {
      const T = 0x35d6c0, TD = 0x1c6f64;
      add(CYL(.11, .12, PAL.gun, 0, .04, -.16));               // круглый кожух
      add(CYL(.13, .03, TD, 0, .04, -.225));                   // передняя плита
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(.10, .10, .018, 16), gunMat(T));
      disc.rotation.x = Math.PI / 2; disc.position.set(0, .04, -.30); add(disc);
      add(B(.05, .11, .06, PAL.black, 0, -.07, .02, .14));     // рукоять
      add(B(.14, .03, .18, PAL.gunLight, 0, .12, -.14));       // верх
      add(B(.02, .10, .05, T, .10, .06, -.24, 0, .3));         // эмиттеры-рожки
      add(B(.02, .10, .05, T, -.10, .06, -.24, 0, -.3));
      add(B(.02, .06, .14, TD, .11, .04, -.10));               // направляющие диска
      add(B(.02, .06, .14, TD, -.11, .04, -.10));
      add(B(.05, .04, .05, PAL.steel, 0, -.02, -.20));         // нижняя планка
      add(DOT(.015, T, 0, .13, -.05));
      break;
    }

    /* АБСОЛЮТНЫЙ НОЛЬ: крио-пушка, катушки и бак хладагента */
    case 'freeze': {
      const ICE = 0x8fe6ff, ICE2 = 0x2f7fa8;
      add(B(.09, .10, .32, PAL.gun, 0, .05, -.16));            // коробка
      add(CYL(.05, .44, ICE2, 0, .03, -.46));                  // ствол
      for (let i = 0; i < 5; i++) add(CYL(.062, .022, ICE, 0, .03, -.30 - i * .075));  // катушки
      add(CYL(.09, .10, ICE, 0, .03, -.70));                   // морозное сопло
      add(B(.055, .13, .07, PAL.black, 0, -.075, .04, .16));   // рукоять
      add(B(.08, .16, .11, 0x1f4a63, 0, .02, .21));            // бак
      add(CYL(.03, .12, PAL.black, 0, .12, .21));              // крышка бака
      add(DOT(.015, ICE, 0, .14, -.30));
      break;
    }

    /* ТЕСЛА-ПУШКА: a heavy coil gun — layered copper coils, a forked spark gap
       at the muzzle and a glowing energy core. Reads as a lightning thrower. */
    /* ТЕСЛА-ПУШКА: компактный молниевый пулемёт — катушки, разрядник, ядро */
    case 'tesla': {
      const ARC = 0x9ad6ff, CU = 0xb5762f, CUD = 0x7a4c18, CORE = 0xdff2ff;
      // compact receiver body (noticeably smaller than the other heavies)
      add(B(.075, .075, .22, PAL.gun, 0, .035, -.05));         // ствольная коробка
      add(B(.088, .020, .17, PAL.gunLight, 0, .082, -.05));    // верхняя планка
      add(B(.06, .035, .09, PAL.black, 0, .035, .06));         // затвор
      add(MAG(.045, .095, .05, PAL.mag, 0, -.048, .02, .18));  // магазин-катушка
      // the coil stack: copper rings shrinking toward the muzzle
      const coilN = 4;
      for (let i = 0; i < coilN; i++) {
        const t = i / (coilN - 1);
        const r = .052 - t * .018;
        add(CYL(r, .020, i % 2 ? CU : CUD, 0, .035, -.15 - i * .048, 10));
      }
      // inner conducting rod the coils wrap
      add(CYL(.014, .28, PAL.steel, 0, .035, -.24));
      // twin prongs forming the spark gap
      add(B(.015, .09, .04, PAL.steel, .050, .070, -.42, 0, .22));
      add(B(.015, .09, .04, PAL.steel, -.050, .070, -.42, 0, -.22));
      add(B(.015, .09, .04, PAL.steel, .050, .000, -.42, 0, -.22));
      add(B(.015, .09, .04, PAL.steel, -.050, .000, -.42, 0, .22));
      // glowing energy core at the gap
      const core = new THREE.Mesh(new THREE.SphereGeometry(.032, 10, 8),
        new THREE.MeshBasicMaterial({ color: CORE }));
      core.position.set(0, .035, -.44); add(core);
      // a ring electrode around the gap
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.046, .009, 8, 16),
        new THREE.MeshBasicMaterial({ color: ARC }));
      ring.position.set(0, .035, -.45); add(ring);
      // side arc-rails (glow) and indicators
      add(B(.010, .06, .16, ARC, .072, .048, -.15, 0, .1));
      add(B(.010, .06, .16, ARC, -.072, .048, -.15, 0, -.1));
      // grip + trigger
      add(B(.04, .10, .055, PAL.black, 0, -.052, .03, .16));
      add(B(.014, .022, .045, PAL.steel, 0, -.030, .025));
      // rear capacitor with glow + vent fins
      add(CYL(.045, .10, 0x24404f, 0, .035, .13));
      add(CYL(.049, .014, CU, 0, .035, .09));
      add(CYL(.049, .014, CU, 0, .035, .17));
      add(DOT(.011, ARC, 0, .095, -.09));
      break;
    }

    /* ЗЕРКАЛЬНАЯ ПУШКА: эмиттер с рожками и линзой */
    case 'portal': {
      const MG = 0xc9a0ff, MGD = 0x5b3a8a;
      add(B(.09, .09, .30, PAL.gun, 0, .05, -.14));            // корпус
      add(CYL(.06, .16, MGD, 0, .05, -.34));                   // обойма
      for (let i = 0; i < 4; i++) {                            // четыре рожка
        const a = i / 4 * Math.PI * 2;
        add(B(.02, .10, .04, MG, Math.cos(a) * .09, .05 + Math.sin(a) * .09, -.46));
      }
      const lens = new THREE.Mesh(new THREE.SphereGeometry(.045, 10, 8), new THREE.MeshBasicMaterial({ color: MG }));
      lens.position.set(0, .05, -.46); add(lens);
      add(B(.055, .12, .07, PAL.black, 0, -.075, .04, .16));   // рукоять
      add(B(.07, .10, .12, 0x2a2140, 0, .02, .20));            // батарея
      add(DOT(.015, MG, 0, .13, -.10));
      break;
    }

    /* ЧЁРНАЯ ДЫРА: гравитационный проектор с сингулярностью */
    case 'blackhole': {
      const VI = 0xb27bff, VID = 0x2a1240;
      add(B(.10, .11, .36, 0x2a2f3a, 0, .05, -.14));           // корпус
      add(CYL(.075, .22, VID, 0, .05, -.40));                  // конус проектора
      add(CYL(.11, .05, VI, 0, .05, -.51));                    // устье
      const core = new THREE.Mesh(new THREE.SphereGeometry(.06, 12, 10), new THREE.MeshBasicMaterial({ color: VI }));
      core.position.set(0, .05, -.46); add(core);
      for (let i = 0; i < 3; i++) {                            // три стяжки
        const a = i / 3 * Math.PI * 2;
        add(B(.018, .12, .02, PAL.steel, Math.cos(a) * .085, .05 + Math.sin(a) * .085, -.34));
      }
      add(B(.06, .13, .08, PAL.black, 0, -.08, .04, .16));     // рукоять
      add(B(.09, .14, .14, 0x1a1030, 0, .03, .22));            // энергоячейка
      add(DOT(.02, VI, 0, .15, -.14));
      break;
    }

    /* ДРОН-ТУРЕЛЬ: пусковой блок, из которого вылетает дрон-помощник */
    case 'turretDrone': {
      const RD = 0xe33a2e;
      add(B(.14, .14, .20, 0x2f353b, 0, .04, -.06));           // блок
      add(B(.15, .02, .21, PAL.gunLight, 0, .12, -.06));       // верхняя плита
      add(CYL(.05, .10, 0x1b1f23, 0, .04, -.20));              // пусковая труба
      add(CYL(.06, .03, RD, 0, .04, -.25));                    // сопло трубы
      [-1, 1].forEach(s => {                                   // сложенные лучи роторов
        add(B(.10, .015, .05, PAL.gunLight, s * .10, .06, -.02, 0, 0, s * .3));
        add(CYL(.04, .012, PAL.black, s * .15, .075, -.02));
      });
      add(B(.05, .12, .06, PAL.black, 0, -.075, .04, .16));    // рукоять
      add(DOT(.016, RD, 0, .15, -.12));
      break;
    }

    /* ХРОНО-ПУШКА: эмиттер с циферблатом и светящимся ядром */
    case 'chrono': {
      const TQ = 0x7fe6d0, TQD = 0x1e5a52;
      add(B(.09, .10, .34, PAL.gun, 0, .05, -.14));            // корпус
      add(CYL(.075, .18, TQD, 0, .05, -.36));                  // обойма эмиттера
      add(CYL(.10, .04, TQ, 0, .05, -.46));                    // дульное кольцо
      const dial = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, .02, 16), new THREE.MeshBasicMaterial({ color: TQ }));
      dial.rotation.z = Math.PI / 2; dial.position.set(.075, .06, -.06); add(dial);
      const hand = new THREE.Mesh(new THREE.BoxGeometry(.008, .05, .012), gunMat(0x0c2b28));
      hand.position.set(.086, .07, -.06); add(hand);
      const core = new THREE.Mesh(new THREE.SphereGeometry(.035, 10, 8), new THREE.MeshBasicMaterial({ color: 0xbafff2 }));
      core.position.set(0, .05, -.42); add(core);
      add(B(.055, .13, .07, PAL.black, 0, -.075, .04, .16));   // рукоять
      add(B(.08, .13, .12, 0x123a36, 0, .02, .20));            // хроно-ячейка
      add(CYL(.03, .10, PAL.black, 0, .12, .20));              // крышка ячейки
      add(B(.10, .02, .22, TQD, 0, .115, -.14));               // верхняя планка
      add(B(.02, .09, .06, TQ, .055, .06, -.30, 0, .25));      // боковые дуги
      add(B(.02, .09, .06, TQ, -.055, .06, -.30, 0, -.25));
      add(B(.05, .03, .05, PAL.steel, 0, -.03, -.18));         // нижняя планка
      add(DOT(.015, TQ, 0, .14, -.18));
      break;
    }

    /* ---------------- ОГНЕМЁТ: flamethrower ---------------- */
    case 'flamer': {
      const TANK = 0x9a3b1a, TANK2 = 0x6f2a12, NOZ = 0x3a3f45;
      add(B(.10, .11, .30, PAL.gun, 0, .04, -.12));                    // ствольная коробка
      add(B(.11, .12, .16, NOZ, 0, .05, .04));                         // бак-камера
      add(CYL(.045, .52, PAL.steel, 0, .02, -.44));                    // ствол-труба
      add(CYL(.06, .07, NOZ, 0, .02, -.70));                           // сопло
      add(CYL(.075, .05, 0xff8a2a, 0, .02, -.735, 12));                // раскалённый срез
      for (let i = 0; i < 3; i++) add(B(.11, .010, .020, PAL.steel, 0, .09, -.22 - i * .14));  // кожух
      add(B(.05, .12, .07, PAL.black, 0, -.075, .03, .16));            // рукоять
      add(CYL(.07, .22, TANK, 0, -.02, .22));                          // баллон
      add(CYL(.066, .03, TANK2, 0, -.02, .11));
      add(CYL(.066, .03, TANK2, 0, -.02, .33));
      add(CYL(.03, .10, PAL.black, 0, .08, .22));                      // вентиль
      add(B(.028, .028, .028, 0xffd24a, 0, .14, .22));                 // индикатор
      break;
    }

    /* ---------------- МЕХА-МИНИГАН: левая рука дредноута — бронированный многозарядный пулемёт ---------------- */
    case 'mechMinigun': {
      // дредноутская палитра: синяя броня, белые полосы, золото, тёмный металл
      const BLUE = 0x2b4a8f, BLUE2 = 0x1d3568, WHITE = 0xdfe6f0, GOLD = 0xd8b45a, DK = 0x1b2026;
      const GLOW = 0x4ad6ff;
      // большей корпус-плечо (мощная броневая коробка)
      add(B(.20, .20, .30, BLUE, 0, .01, -.10));                     // главный бронеблок
      add(B(.22, .036, .30, BLUE2, 0, .12, -.10));                   // верхняя бронеплита
      add(B(.205, .05, .13, WHITE, 0, .095, .02));                   // белая полоса-акцент
      // заклёпки по краю
      for (let i = 0; i < 5; i++) add(B(.010, .010, .010, GOLD, -.095, .12, -.22 + i * .055));
      for (let i = 0; i < 5; i++) add(B(.010, .010, .010, GOLD, .095, .12, -.22 + i * .055));
      // орлиная эмблема (упрощённая: золотой крест с крыльями)
      add(B(.05, .03, .012, GOLD, .06, .05, -.26));
      add(B(.016, .05, .012, GOLD, .06, .05, -.26));
      [-1, 1].forEach(s => add(B(.02, .038, .012, GOLD, .06 + s * .035, .05, -.26, 0, 0, s * .5)));
      // тяжёлый ствольный узел с 6 вращающимися стволами
      const barrels = new THREE.Group();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        barrels.add(CYL(.026, .82, DK, Math.cos(a) * .085, Math.sin(a) * .085, -.78, 8));   // ствол
        barrels.add(CYL(.032, .08, GOLD, Math.cos(a) * .085, Math.sin(a) * .085, -.40, 8)); // латунное кольцо
        barrels.add(CYL(.034, .07, DK, Math.cos(a) * .085, Math.sin(a) * .085, -1.06, 8));  // дульный кожух
      }
      barrels.add(CYL(.10, .10, DK, 0, 0, -.40, 16));                // передний хомут
      barrels.add(CYL(.098, .09, DK, 0, 0, -.78, 16));               // задний хомут
      barrels.add(CYL(.086, .06, GLOW, 0, 0, -1.14, 16));            // раскалённое дульное кольцо
      barrels.add(CYL(.070, .03, DK, 0, 0, -1.18, 16));              // срез
      barrels.name = 'barrels';
      g.add(barrels);
      // кожух между бронёй и стволами + золотые болты
      add(CYL(.115, .20, BLUE, 0, 0, -.30, 16));
      add(CYL(.12, .03, GOLD, 0, 0, -.22, 16));
      // кабели питания сбоку (тянутся назад)
      for (let i = 0; i < 3; i++) {
        const cbl = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .30, 6), gunMat(0x14181c));
        cbl.position.set(-.11, .10 - i * .03, .12); cbl.rotation.x = .5 + i * .15; g.add(cbl);
      }
      // амуниционный барабан снизу
      add(CYL(.11, .16, BLUE2, 0, -.175, -.02, 16));
      add(CYL(.06, .18, DK, 0, -.175, -.02, 14));
      add(B(.04, .05, .06, GLOW, 0, .14, .06));                      // огонёк ядра
      break;
    }

    /* ---------------- ГИПЕР-ЛАЗЕР: правая рука дредноута — ракетный под + лазерный эмиттер ---------------- */
    case 'mechLaser': {
      const BLUE = 0x2b4a8f, BLUE2 = 0x1d3568, WHITE = 0xdfe6f0, GOLD = 0xd8b45a, DK = 0x1b2026, RED = 0xc4302a;
      const GLOW = 0x39ff6a;
      // бронепод (как ракетный под дредноута)
      add(B(.20, .22, .24, BLUE, .05, .02, -.06));                   // корпус пода
      add(B(.21, .034, .25, BLUE2, .05, .14, -.06));                 // верх плита
      add(B(.045, .20, .24, WHITE, .145, .02, -.06));                // белая боковая полоса
      for (let i = 0; i < 4; i++) add(B(.010, .010, .010, GOLD, -.045, .13, -.16 + i * .05));  // заклёпки
      // красные ракетные трубы (сетка 2×3) — как на фото
      for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) {
        add(CYL(.026, .06, RED, .05 + (c - .5) * .065, .10 - r * .07, -.19, 10));
        add(CYL(.020, .02, DK, .05 + (c - .5) * .065, .10 - r * .07, -.215, 10));
      }
      // лазерный эмиттер снизу-вперёд (гипер-пушка)
      const barrels = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        barrels.add(CYL(.018, .66, DK, Math.cos(a) * .05, .02 + Math.sin(a) * .05, -.66, 8));
      }
      barrels.add(CYL(.028, .72, GLOW, 0, .02, -.68, 12));           // светящийся стержень
      barrels.add(CYL(.056, .05, GLOW, 0, .02, -1.00, 14));          // эмиттер-кольцо
      for (let i = 0; i < 5; i++) barrels.add(CYL(.05, .018, GLOW, 0, .02, -.30 - i * .11, 12)); // катушки
      barrels.name = 'barrels';
      g.add(barrels);
      // кормовой блок питания + золотая отделка
      add(B(.10, .12, .15, BLUE2, .05, .02, .16));
      add(CYL(.03, .10, DK, .05, .13, .16));
      add(B(.03, .04, .05, GLOW, .05, .16, -.02));                   // огонёк ядра
      add(B(.03, .03, .03, GOLD, .13, -.06, .05));                   // золотая деталь
      break;
    }

    /* ---------------- Knife ---------------- */
    default:
    case 'knife': {
      add(B(.012, .050, .27, PAL.steel, 0, .014, -.16));              // blade
      add(B(.014, .010, .24, PAL.black, 0, .014, -.15));              // fuller (blood groove)
      add(B(.004, .040, .14, PAL.gunLight, 0, .014, -.20, .20));      // clip-point bevel
      // serrations on the spine
      for (let i = 0; i < 5; i++) add(B(.016, .010, .012, PAL.black, 0, .036, -.075 + i * .016));
      add(B(.014, .030, .06, PAL.steel, 0, -.010, -.03));             // choil
      add(B(.010, .060, .022, PAL.black, 0, .002, -.028));            // guard
      add(B(.030, .044, .13, PAL.poly, 0, -.004, .07));               // handle
      for (let i = 0; i < 4; i++) add(B(.033, .012, .014, PAL.black, 0, -.004, .025 + i * .028));   // grip rings
      add(B(.034, .014, .022, PAL.black, 0, .006, .135));             // pommel
      add(B(.007, .016, .007, PAL.steel, 0, .006, .142));
      break;
    }
  }

  /* every model gets a muzzle marker at the barrel tip so flashes and
     tracers line up per weapon */
  const muzzleZ = MUZZLE_Z[id] !== undefined ? MUZZLE_Z[id] : -0.6;
  g.userData.muzzleZ = muzzleZ;
  return g;
}

/* barrel-tip Z per weapon (used for the muzzle flash / tracer origin) */
const MUZZLE_Z = {
  knife: -0.28,
  glock: -0.22, usp: -0.36, p250: -0.20, deagle: -0.25, revolver: -0.28,
  mp5: -0.58, p90: -0.42, ump: -0.47,
  nova: -0.60, xm: -0.58,
  galil: -0.74, famas: -0.54, ak47: -0.70, m4a4: -0.73, sg553: -0.72,
  awp: -1.04, scout: -0.82,
  negev: -0.86,
  minigun: -0.98, rpg: -1.20,
  laser: -0.98, atomicRpg: -1.06, yhs: -1.16,
  laserCannon: -1.20,
  rocketgun: -0.94, shield: -0.30,
  banana: -0.92,
  acid: -0.76, hive: -0.26, disc: -0.32, freeze: -0.76, tesla: -0.72,
  portal: -0.48, blackhole: -0.54, turretDrone: -0.28, chrono: -0.48,
  tesla: -0.50,
  flamer: -0.78,
  mechMinigun: -1.22, mechLaser: -1.04
};

/* An RPG rocket: a tube body with a pointed warhead and fins */
let _rocketGeoCache = null;
function buildRocketProjectile() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.038, .038, .34, 10), gunMat(0x5d6247));
  body.rotation.x = Math.PI / 2;
  g.add(body);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(.055, .18, 10), gunMat(0x8a3b2a));
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -.26;
  g.add(nose);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(.050, .038, .09, 10), gunMat(0x2b2f34));
  tail.rotation.x = Math.PI / 2;
  tail.position.z = .20;
  g.add(tail);
  // four stabiliser fins
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const fin = new THREE.Mesh(new THREE.BoxGeometry(.010, .075, .10), gunMat(0x2b2f34));
    fin.position.set(Math.cos(a) * .045, Math.sin(a) * .045, .16);
    fin.rotation.z = a;
    g.add(fin);
  }
  return g;
}

/* A guided missile: slimmer body, a bright seeker eye and a glowing exhaust */
function buildGuidedMissile() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.036, .036, .40, 10), gunMat(0x3a4149));
  body.rotation.x = Math.PI / 2;
  g.add(body);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(.048, .16, 10), gunMat(0x20252b));
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -.28;
  g.add(nose);
  // glowing seeker eye in the nose
  const eye = new THREE.Mesh(new THREE.SphereGeometry(.022, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff8a3a }));
  eye.position.z = -.34;
  g.add(eye);
  // exhaust plume
  const flame = new THREE.Mesh(new THREE.ConeGeometry(.045, .22, 8),
    new THREE.MeshBasicMaterial({ color: 0xffb060, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false }));
  flame.rotation.x = Math.PI / 2;
  flame.position.z = .30;
  g.add(flame);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const fin = new THREE.Mesh(new THREE.BoxGeometry(.010, .070, .09), gunMat(0x20252b));
    fin.position.set(Math.cos(a) * .042, Math.sin(a) * .042, .18);
    fin.rotation.z = a;
    g.add(fin);
  }
  return g;
}

/* A small curved banana used as the flying projectile */
let _bananaProjGeo = null, _bananaProjMats = null;
function buildBananaProjectile() {
  if (!_bananaProjMats) {
    _bananaProjMats = [
      new THREE.MeshLambertMaterial({ color: 0xf2c93b, emissive: 0x2a2008 }),
      new THREE.MeshLambertMaterial({ color: 0xd9a92a, emissive: 0x241a05 }),
      new THREE.MeshLambertMaterial({ color: 0x6f8f3a, emissive: 0x14200a })
    ];
  }
  const g = new THREE.Group();
  const SEG = 7;
  for (let i = 0; i < SEG; i++) {
    const t = i / (SEG - 1);
    const w = .085 - t * .028;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, w, .09), _bananaProjMats[i === SEG - 1 ? 2 : (i % 2)]);
    m.position.set(0, -Math.pow(t, 2) * .22, (i - (SEG - 1) / 2) * .085);
    m.rotation.x = -t * .85;
    g.add(m);
  }
  const tip = new THREE.Mesh(new THREE.BoxGeometry(.035, .035, .05), _bananaProjMats[2]);
  tip.position.set(0, .03, -(SEG - 1) / 2 * .085 - .05);
  g.add(tip);
  return g;
}

/* ---- experimental weapon projectiles ---- */
/* ДИСКОБОЛ: a flat spinning plasma disc */
function buildDiscProjectile() {
  const g = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(.20, .20, .035, 18),
    new THREE.MeshLambertMaterial({ color: 0x35d6c0, emissive: 0x0d5a50 }));
  disc.rotation.x = Math.PI / 2;
  g.add(disc);
  const halo = new THREE.Mesh(new THREE.CylinderGeometry(.27, .27, .02, 18),
    new THREE.MeshBasicMaterial({ color: 0x7dffe8, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.rotation.x = Math.PI / 2; g.add(halo);
  const hub = new THREE.Mesh(new THREE.SphereGeometry(.05, 8, 6), new THREE.MeshBasicMaterial({ color: 0xddfff6 }));
  g.add(hub);
  return g;
}
/* КИСЛОТОМЁТ: a fat drop of acid */
function buildAcidProjectile() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(.15, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0x9fd23a, emissive: 0x33500c })));
  addGlowSphere(g, .21, 0x7fbf2a, .4);
  return g;
}
/* РОЙ: a buzzing hive pod */
function buildHivePod() {
  const g = new THREE.Group();
  const pod = new THREE.Mesh(new THREE.SphereGeometry(.22, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0xe0a021, emissive: 0x3a2406 }));
  pod.scale.y = 1.25; g.add(pod);
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2;
    const cell = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .02, 6),
      new THREE.MeshBasicMaterial({ color: 0xffd25a }));
    cell.rotation.z = Math.PI / 2;
    cell.position.set(Math.cos(a) * .18, Math.sin(a) * .18, .20);
    g.add(cell);
  }
  addGlowSphere(g, .30, 0xffc94a, .28);
  return g;
}
/* АБСОЛЮТНЫЙ НОЛЬ: a shard of blue ice */
function buildFreezeOrb() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(.15, 0),
    new THREE.MeshLambertMaterial({ color: 0x8fe6ff, emissive: 0x1e5a78 })));
  addGlowSphere(g, .24, 0x6fd6ff, .45);
  return g;
}
/* ЧЁРНАЯ ДЫРА: a dark core ringed by an accretion halo */
function buildBlackHoleShell() {
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.SphereGeometry(.30, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0x08040f }));
  g.add(core);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.42, .05, 8, 28),
    new THREE.MeshBasicMaterial({ color: 0xb27bff, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false }));
  g.add(ring);
  const haloS = new THREE.Mesh(new THREE.SphereGeometry(.5, 14, 10),
    new THREE.MeshBasicMaterial({ color: 0x7a3aff, transparent: true, opacity: .28, blending: THREE.AdditiveBlending, depthWrite: false }));
  g.add(haloS);
  g.userData.ring = ring;
  return g;
}
/* ХРОНО-ПУШКА: a clockwork orb with a tick ring */
function buildChronoOrb() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(.16, 12, 10),
    new THREE.MeshLambertMaterial({ color: 0x2f7f74, emissive: 0x0f3a34 })));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.30, .022, 8, 24),
    new THREE.MeshBasicMaterial({ color: 0x7fe6d0, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false }));
  g.add(ring);
  const core = new THREE.Mesh(new THREE.SphereGeometry(.07, 10, 8), new THREE.MeshBasicMaterial({ color: 0xd6fff8 }));
  g.add(core);
  g.userData.ring = ring;
  return g;
}
/* small helper: an additive glow sphere around a projectile core */
function addGlowSphere(g, r, color, opacity) {
  const halo = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: opacity === undefined ? .4 : opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  g.add(halo);
  return halo;
}

/* ---------- environment props: player turret / barricade / mine ---------- */
function buildPlayerTurret() {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.24, .30, .16, 12), gunMat(0x3a4149));
  base.position.y = .08; g.add(base);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(.07, .08, .62, 10), gunMat(0x2b3038));
  post.position.y = .48; g.add(post);
  const head = new THREE.Mesh(new THREE.BoxGeometry(.42, .30, .46), gunMat(0x4a525c));
  head.position.y = .95; g.add(head);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, .55, 8), gunMat(0x22262b));
  barrel.rotation.x = Math.PI / 2; barrel.position.set(.12, .98, -.30); g.add(barrel);
  const barrel2 = barrel.clone(); barrel2.position.set(-.12, .98, -.30); g.add(barrel2);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(.05, 8, 6), new THREE.MeshBasicMaterial({ color: 0x4ad6ff }));
  eye.position.set(0, 1.12, -.16); g.add(eye);
  return g;
}
function buildBarricade() {
  const g = new THREE.Group();
  const mat = gunMat(0x6b5a3a);
  const mat2 = gunMat(0x4a3f28);
  for (let i = 0; i < 5; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(.14, .14, 2.1, 8), i % 2 ? mat : mat2);
    log.rotation.z = Math.PI / 2;
    log.position.set(0, .18 + i * .26, 0);
    g.add(log);
  }
  [-.85, .85].forEach(ox => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(.16, 1.35, .20), mat2);
    post.position.set(ox, .67, 0); g.add(post);
  });
  return g;
}
function buildMine() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.26, .30, .12, 14), gunMat(0x3a4139));
  body.position.y = .06; g.add(body);
  for (let i = 0; i < 3; i++) {
    const spike = new THREE.Mesh(new THREE.CylinderGeometry(.015, .015, .07, 6), gunMat(0x1e231e));
    spike.position.y = .14; spike.rotation.z = i * 2.1; g.add(spike);
  }
  const led = new THREE.Mesh(new THREE.SphereGeometry(.05, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3a2a }));
  led.position.y = .14; g.add(led);
  return g;
}

/* A grenade: a small round body with a lever, coloured by kind */
function buildGrenadeModel(kind) {
  const col = kind === 'freeze' ? 0x8fe6ff : kind === 'napalm' ? 0xd8641a : 0x4a5a3a;
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(.10, 10, 8),
    new THREE.MeshLambertMaterial({ color: col, emissive: 0x0a0c0a }));
  body.scale.y = 1.25;
  g.add(body);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(.035, .045, .06, 8), gunMat(0x2b2f34));
  cap.position.y = .14; g.add(cap);
  const lever = new THREE.Mesh(new THREE.BoxGeometry(.02, .10, .04), gunMat(0x8b939d));
  lever.position.set(.05, .10, 0); lever.rotation.z = .25; g.add(lever);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.03, .008, 6, 12), gunMat(0xb0b6bd));
  ring.position.set(.08, .14, 0); ring.rotation.y = Math.PI / 2; g.add(ring);
  // a faint glow so it reads in flight
  const halo = new THREE.Mesh(new THREE.SphereGeometry(.16, 8, 6),
    new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .18, blending: THREE.AdditiveBlending, depthWrite: false }));
  g.add(halo);
  return g;
}

/* A glob of acid thrown by a spitter: a sickly green sphere with a soft glow */
function buildAcidBlob() {
  const g = new THREE.Group();
  const blob = new THREE.Mesh(new THREE.SphereGeometry(.13, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0x9fd23a, emissive: 0x35500e }));
  g.add(blob);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(.20, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0x7fbf2a, transparent: true, opacity: .35, blending: THREE.AdditiveBlending, depthWrite: false }));
  g.add(halo);
  return g;
}

/* A robot zombie's plasma bolt: a hot cyan core in a bright halo */
function buildPlasmaBolt() {
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.SphereGeometry(.10, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xbdf0ff }));
  g.add(core);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(.18, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0x4ad6ff, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false }));
  g.add(halo);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(.07, .30, 8),
    new THREE.MeshBasicMaterial({ color: 0x4ad6ff, transparent: true, opacity: .45, blending: THREE.AdditiveBlending, depthWrite: false }));
  tail.rotation.x = Math.PI / 2;
  tail.position.z = .22;
  g.add(tail);
  return g;
}

/* A mech chassis shell the player sits inside (visible around the camera).
   Blue armoured dreadnought body: shoulder blocks, cockpit hatch, arms with the
   minigun and the laser pod, and two heavy legs. Built around the origin with
   the floor at y=0 and the cockpit around eye height. */
function buildMechChassis() {
  const BLUE = 0x2b4a8f, BLUE2 = 0x1d3568, WHITE = 0xdfe6f0, GOLD = 0xd8b45a, DK = 0x1b2026, RED = 0xc4302a;
  const matB = new THREE.MeshLambertMaterial({ color: BLUE });
  const matB2 = new THREE.MeshLambertMaterial({ color: BLUE2 });
  const matW = new THREE.MeshLambertMaterial({ color: WHITE });
  const matG = new THREE.MeshLambertMaterial({ color: GOLD, emissive: 0x1a1405 });
  const matD = new THREE.MeshLambertMaterial({ color: DK });
  const g = new THREE.Group();
  const box = (w, h, d, m, x, y, z, rx, ry, rz) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z);
    if (rx) b.rotation.x = rx; if (ry) b.rotation.y = ry; if (rz) b.rotation.z = rz;
    b.castShadow = true; b.receiveShadow = true;
    g.add(b); return b;
  };
  /* OPEN COCKPIT layout: the eye sits at ~3.3, so every structural piece is kept
     BELOW that line or pushed to the sides — nothing crosses the centre of view. */
  // ------- torso: a low chest the pilot's legs sit in (top well under the eyes) -------
  box(1.06, .62, .80, matB, 0, 2.42, -.06);            // chest (top ≈ 2.73)
  box(1.12, .12, .84, matB2, 0, 2.74, -.06);           // chest rim
  box(1.02, .12, .80, matB2, 0, 2.10, -.06);           // belt
  box(.42, .40, .10, matW, 0, 2.42, -.44);              // white front panel (below eyes, ahead)
  box(.16, .09, .04, matG, 0, 2.44, -.50);              // eagle emblem
  box(.05, .16, .04, matG, 0, 2.44, -.50);
  [-1, 1].forEach(s => box(.08, .11, .04, matG, s * .09, 2.44, -.50, 0, 0, s * .5));
  // ------- side shoulder blocks (out at ±1, tops kept low so they frame the view) -------
  [-1, 1].forEach(s => {
    box(.50, .40, .60, matB, s * 1.02, 2.92, -.02);    // pauldron (top ≈ 3.12, at the very side)
    box(.54, .10, .64, matB2, s * 1.02, 3.14, -.02);
    for (let i = 0; i < 3; i++) box(.055, .055, .055, matG, s * 1.24, 3.02 - i * .12, .20);
  });
  // ------- open roll-cage: thin bars around the view, NOT across it -------
  // two uprights behind the pilot + a top rail at the very top (above eye line)
  [-.62, .62].forEach(x => box(.06, 1.9, .06, matD, x, 3.0, .40, .12, 0, 0));
  box(1.34, .07, .07, matD, 0, 3.94, .34, .12, 0, 0);  // over-head rail (well above eyes)
  box(.07, 1.9, .06, matD, -.62, 3.0, .40, .12, 0, 0);
  // small angled corner braces so the cage reads as a structure
  box(.07, .06, .5, matD, -.62, 3.86, .16, .5, 0, 0);
  box(.07, .06, .5, matD, .62, 3.86, .16, .5, 0, 0);
  // ------- right arm: the actual MECH-MINIGUN model, mounted on the arm -------
  const mgArm = new THREE.Group();
  const mgGun = buildWeaponModel('mechMinigun');
  mgGun.scale.setScalar(1.15);
  mgArm.add(mgGun);
  mgArm.position.set(1.28, 2.55, -.08);
  g.add(mgArm);
  box(.40, .38, .58, matB2, 1.30, 2.90, .12);          // right shoulder housing
  const cluster = mgGun.getObjectByName('barrels');    // spin this
  // ------- left arm: the actual HYPER-LASER model + red missile tubes -------
  const lzArm = new THREE.Group();
  const lzGun = buildWeaponModel('mechLaser');
  lzGun.scale.setScalar(1.1);
  lzArm.add(lzGun);
  lzArm.position.set(-1.28, 2.58, -.08);
  g.add(lzArm);
  // a shoulder pod with red missile tubes above the laser
  const pod = new THREE.Group();
  box(.42, .30, .50, matB2, 0, 0, 0);
  box(.44, .08, .52, matB2, 0, .16, 0);
  box(.09, .28, .50, matW, -.24, 0, 0);
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .10, 10), new THREE.MeshLambertMaterial({ color: RED }));
    tube.rotation.x = Math.PI / 2;
    tube.position.set((c - 1) * .12, .06 - r * .12, -.28);
    pod.add(tube);
  }
  pod.position.set(-1.28, 3.02, .05);
  g.add(pod);
  // ------- pelvis + legs -------
  box(.88, .40, .62, matB2, 0, 1.90, -.02);
  [-1, 1].forEach(s => {
    box(.40, .72, .46, matB, s * .42, 1.44, 0);        // thigh
    box(.42, .12, .48, matB2, s * .42, 1.76, 0);
    box(.46, .82, .40, matD, s * .42, .80, .05);       // shin
    box(.42, .16, .44, matB, s * .42, 1.14, .02);
    box(.52, .22, .78, matB, s * .42, .14, .10);       // foot
    box(.54, .10, .84, matB2, s * .42, .26, .10);
    box(.16, .16, .04, matG, s * .42, 1.24, .28);      // golden badge
  });
  // exhaust stacks on the BACK (+z is behind the pilot, since forward is -z)
  [-.55, .55].forEach(x => { const e = new THREE.Mesh(new THREE.CylinderGeometry(.09, .11, .5, 10), matD); e.position.set(x, 2.9, .5); g.add(e); });
  // power cables (behind)
  for (let i = 0; i < 3; i++) box(.03, .03, .6, matD, -.85 + i * .06, 2.4, .42, .5, 0, 0);
  for (let i = 0; i < 3; i++) box(.03, .03, .6, matD, .85 - i * .06, 2.4, .42, .5, 0, 0);
  g.userData.barrels = cluster;
  return g;
}

/* A homing mech missile (small, with a blue flame) */
function buildMechMissile() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .34, 10), gunMat(0x3a4149));
  body.rotation.x = Math.PI / 2; g.add(body);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(.08, .20, 10), gunMat(0x20252b));
  nose.rotation.x = -Math.PI / 2; nose.position.z = -.24; g.add(nose);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(.07, .28, 8),
    new THREE.MeshBasicMaterial({ color: 0x7fd8ff, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false }));
  flame.rotation.x = Math.PI / 2; flame.position.z = .28; g.add(flame);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const fin = new THREE.Mesh(new THREE.BoxGeometry(.012, .07, .09), gunMat(0x20252b));
    fin.position.set(Math.cos(a) * .06, Math.sin(a) * .06, .16); fin.rotation.z = a; g.add(fin);
  }
  return g;
}

/* A small kamikaze drone: a flat body with four arms, spinning rotors, a camera
   pod and a red warhead light on the nose. Points along -Z like the weapons. */
let _droneGeo = null;
function buildDroneModel() {
  const g = new THREE.Group();
  const bodyMat = gunMat(0x2f353b);
  const accentMat = new THREE.MeshLambertMaterial({ color: 0xe33a2e, emissive: 0x3a0d08 });
  const darkMat = gunMat(0x1b1f23);

  // fuselage
  const body = new THREE.Mesh(new THREE.BoxGeometry(.30, .11, .40), bodyMat);
  g.add(body);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(.20, .09, .11), accentMat);
  nose.position.z = -.25;
  g.add(nose);
  // camera pod underneath
  const cam = new THREE.Mesh(new THREE.SphereGeometry(.055, 8, 6), darkMat);
  cam.position.set(0, -.08, -.12);
  g.add(cam);

  // arms + rotors
  const rotorMat = new THREE.MeshLambertMaterial({ color: 0x8b939d, emissive: 0x0a0b0d });
  const blurMat = new THREE.MeshBasicMaterial({ color: 0xb8c0c8, transparent: true, opacity: .16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const rotors = [];
  const ARMS = [[-.24, -.16], [.24, -.16], [-.24, .16], [.24, .16]];
  for (const a of ARMS) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(.06, .035, .26), darkMat);
    arm.position.set(a[0] * .7, 0, a[1]);
    arm.rotation.y = Math.atan2(a[0], a[1]);
    g.add(arm);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, .05, 8), darkMat);
    hub.position.set(a[0], .03, a[1]);
    g.add(hub);
    // a two-blade rotor on its own pivot so it can spin every frame
    const pivot = new THREE.Group();
    pivot.position.set(a[0], .06, a[1]);
    pivot.add(new THREE.Mesh(new THREE.BoxGeometry(.30, .010, .030), rotorMat));
    pivot.add(new THREE.Mesh(new THREE.BoxGeometry(.030, .010, .30), rotorMat));
    const blur = new THREE.Mesh(new THREE.CircleGeometry(.17, 18), blurMat);
    blur.rotation.x = -Math.PI / 2; blur.position.y = .005;
    pivot.add(blur);
    g.add(pivot);
    rotors.push(pivot);
  }
  g.userData.rotors = rotors;
  g.userData.rotorSpin = 0;
  return g;
}

/* An ammo crate: a wooden supply chest with metal bands, a lid and a glowing
   yellow padlock so it reads as a pickup from a distance. Built around the
   origin, sitting on the ground (y = 0 is the floor). */
function buildAmmoCrate() {
  const g = new THREE.Group();
  const wood = new THREE.MeshLambertMaterial({ color: 0x8a5a2b, emissive: 0x140c04 });
  const woodDark = new THREE.MeshLambertMaterial({ color: 0x5f3d1c, emissive: 0x0e0803 });
  const metal = new THREE.MeshLambertMaterial({ color: 0x6f7681, emissive: 0x0a0b0d });
  const glow = new THREE.MeshBasicMaterial({ color: 0xffd24a });

  const box = (w, h, d, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  };

  // body + lid
  g.add(box(.90, .40, .60, wood, 0, .20, 0));
  g.add(box(.94, .10, .64, woodDark, 0, .45, 0));
  // metal bands and corner posts
  g.add(box(.96, .06, .10, metal, 0, .20, -.26));
  g.add(box(.96, .06, .10, metal, 0, .20, .26));
  g.add(box(.08, .52, .62, metal, -.44, .26, 0));
  g.add(box(.08, .52, .62, metal, .44, .26, 0));
  // glowing padlock on the front
  const lock = new THREE.Mesh(new THREE.BoxGeometry(.12, .16, .06), glow);
  lock.position.set(0, .28, .33);
  g.add(lock);
  g.userData.glow = lock;
  return g;
}

/* A field medkit: a white/red medical case with a glowing green cross, sitting
   on the ground. Used for the "50% health" pickups. */
function buildMedBox() {
  const g = new THREE.Group();
  const white = new THREE.MeshLambertMaterial({ color: 0xe8ecef, emissive: 0x141618 });
  const red = new THREE.MeshLambertMaterial({ color: 0xc4342a, emissive: 0x1a0806 });
  const cross = new THREE.MeshBasicMaterial({ color: 0x57ff7a });

  const box = (w, h, d, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  };
  g.add(box(.68, .44, .48, white, 0, .22, 0));          // case
  g.add(box(.72, .07, .52, red, 0, .45, 0));             // red lid band
  g.add(box(.22, .10, .10, red, 0, .50, 0));             // handle
  // glowing cross on the front face
  g.add(box(.08, .26, .03, cross, 0, .22, .25));
  g.add(box(.26, .08, .03, cross, 0, .22, .25));
  g.userData.glow = g.children[g.children.length - 1];
  return g;
}

/* ============================================================
   PLAYER
   ============================================================ */
class Player {
  constructor(opts) {
    opts = opts || {};
    this.id = opts.id || 'p1';
    this.name = opts.name || 'Игрок';
    this.team = opts.team || 'ct';
    this.isLocal = !!opts.isLocal;

    // ---- transform ----
    this.pos = { x: 0, y: 0, z: 0 };
    this.vel = { x: 0, y: 0, z: 0 };
    this.yaw = 0; this.pitch = 0;
    this.onGround = false;
    this.crouching = false;
    this.height = CFG.playerHeight;
    this.radius = CFG.playerRadius;

    // CollisionWorld.moveCylinder works on {x,y,z,radius,height}. Expose the
    // player's position through those names so physics can move us directly.
    Object.defineProperties(this, {
      x: { get() { return this.pos.x; }, set(v) { this.pos.x = v; } },
      y: { get() { return this.pos.y; }, set(v) { this.pos.y = v; } },
      z: { get() { return this.pos.z; }, set(v) { this.pos.z = v; } }
    });
    // ---- state ----
    this.maxHealth = CFG.maxHP;
    this.health = CFG.maxHP;
    this.armor = 0;
    this.helmet = false;
    this.heavyArmor = false;   // reinforced armour soaks a larger share of damage
    this.energyArmor = false;  // best suit: AP 300, soaks the most
    this.alive = true;
    this.money = 800;
    this.kills = 0;
    this.deaths = 0;
    this.score = 0;
    this.zombieKills = 0;
    this.bulletsFired = 0;
    this.bulletsHit = 0;
    this.headshots = 0;
    this.damageDealt = 0;

    // ---- gear: consumables ----
    this.medkits = 0;         // аптечки in reserve, used with H / touch button
    this.medkitUnlimited = false;  // the medkit-box upgrade removed the carry cap
    this.drone = 0;           // kamikaze drones ready to launch, with F
    this.droneOwned = false;  // has bought the drone: it recharges every online round
    this.turretDrone = 0;     // turret-drone charges (gear, launched with V)
    this.mechOwned = false;   // has bought the mech suit (can re-enter it)
    this.mechSuit = false;    // currently sitting in the mech cockpit
    this.grenades = { frag: 0, freeze: 0, napalm: 0 };   // thrown with G
    this.builds = { turret: 0, barricade: 0, mine: 0 };  // placed with K
    // energy shield (active shield): raised by LMB for a few seconds, then cools
    this.shieldActive = false;
    this.shieldT = 0;         // seconds left while the field is up
    this.shieldCd = 0;        // seconds left until it can be raised again

    // ---- inventory ----
    this.inv = { 1: null, 2: null, 3: { id: 'knife', mag: Infinity, reserve: 0 } };
    this.slot = 3;
    this.lastPrimary = 2;

    // ---- weapon runtime ----
    this.fireCd = 0;
    this.reloadT = 0;
    this.reloadTotal = 0;
    this.recoil = 0;          // accumulated recoil (radians)
    this.recoilYaw = 0;
    this.viewPunchP = 0; this.viewPunchY = 0;
    this.spread = 0;
    this.zoom = 0;            // 0..1 scope blend
    this.isAiming = false;
    this.spinT = 0;           // minigun spin-up (0..1)
    this.spinPhase = 0;       // accumulated barrel-cluster rotation (radians)
    this._spinSnd = false;
    // laser cannon: continuous-beam heat
    this.beamHeat = 0;        // seconds the beam has burned (per trigger-pull)
    this.beamVent = 0;        // seconds still venting after an overheat
    this.climbing = false;    // mid-vault onto a ledge
    this.climbT = 0;
    this.climbDur = CFG.climbDuration;
    this.climbHold = 0;
    this.climbFrom = null;
    this.climbTo = null;
    this.climbQueued = false; // dedicated climb input (button / key) pressed
    this.deployT = 0;
    this.triggerDown = false;
    this.shotsSinceRelease = 0;
    this.lastStep = 0;
    this.bobPhase = 0;
    this.landImpact = 0;

    // ---- input (local only) ----
    this.in = { f: 0, r: 0, jump: false, run: false, crouch: false, wantJump: false };

    // ---- view model ----
    this.vmGroup = null;
    this.muzzle = null;
    this.flashLight = null;
    this.flashT = 0;
    this.skin = opts.skin || 0;
  }

  /* ---------- inventory helpers ---------- */
  get weapon() {
    const s = this.inv[this.slot];
    if (!s) {
      // fall back to whatever we have
      if (this.inv[2]) { this.slot = 2; } else if (this.inv[1]) { this.slot = 1; } else { this.slot = 3; }
      return this.inv[this.slot];
    }
    return s;
  }
  get def() { const w = this.weapon; return w ? WEAPONS[w.id] : WEAPONS.knife; }

  give(id) {
    const def = WEAPONS[id];
    if (!def) return false;
    const slot = def.slot;
    if (slot === 3) { this.inv[3] = { id: 'knife', mag: Infinity, reserve: 0 }; return true; }
    const had = this.inv[slot];
    this.inv[slot] = { id, mag: def.mag, reserve: def.reserve };
    if (had && had.id === id) { this.inv[slot].mag = had.mag; this.inv[slot].reserve = had.reserve; }
    if (slot === 2) this.lastPrimary = 2;
    return true;
  }
  has(id) { return [1, 2, 3].some(s => this.inv[s] && this.inv[s].id === id); }
  takeWeapon(slot) {
    if (!this.inv[slot]) return false;
    if (this.slot === slot) return true;
    this.slot = slot;
    this.reloadT = 0;          // switching cancels a reload
    this.deployT = 0.5;        // and costs deploy time, so swaps are not free
    this.zoom = 0;
    if (this.vmGroup) this.buildViewModel();
    return true;
  }
  nextSlot() {
    const order = this.inv[2] ? [2, 1, 3] : [1, 3];
    const i = order.indexOf(this.slot);
    return order[(i + 1) % order.length];
  }

  resetSpawn(x, y, z, yaw) {
    this.pos.x = x; this.pos.y = y; this.pos.z = z;
    this.vel.x = this.vel.y = this.vel.z = 0;
    this.yaw = yaw === undefined ? 0 : yaw;
    this.pitch = 0;
    this.health = this.maxHealth || CFG.maxHP;
    this.alive = true;
    this.recoil = this.recoilYaw = this.viewPunchP = this.viewPunchY = 0;
    this.reloadT = 0; this.fireCd = 0; this.zoom = 0; this.deployT = .3;
    this.crouching = false; this.height = CFG.playerHeight;
    this.triggerDown = false;
    // NOTE: ammo is deliberately NOT refilled here. Respawning happens at the
    // start of every online round, and topping up every magazine made the
    // "ПАТРОНЫ" buy option pointless. Ammo carries over between rounds; only a
    // fresh match (or buying ammo) refills it.
  }

  /* total ammo for HUD */
  ammoInfo() {
    const w = this.weapon; if (!w) return { mag: 0, reserve: 0 };
    return { mag: w.mag === Infinity ? 1 : w.mag, reserve: w.reserve === Infinity ? 1 : w.reserve };
  }

  /* ---------- view model construction ---------- */
  buildViewModel() {
    const parent = this.vmGroup ? this.vmGroup.parent : null;
    if (this.vmGroup) { parent && parent.remove(this.vmGroup); disposeGroup(this.vmGroup); }
    const w = this.weapon;
    const id = !w ? 'knife' : w.id;
    const vm = buildWeaponModel(id);
    vm.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; o.renderOrder = 5; } });
    const group = new THREE.Group();
    group.add(vm);
    // muzzle point at this weapon's barrel tip, so flashes and tracers line up
    const mz = new THREE.Object3D();
    mz.position.set(0, .015, vm.userData.muzzleZ !== undefined ? vm.userData.muzzleZ : -0.6);
    vm.add(mz);
    // muzzle flash sprite
    const flash = new THREE.Mesh(new THREE.PlaneGeometry(.34, .34), new THREE.MeshBasicMaterial({
      color: 0xffdd88, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false
    }));
    flash.position.copy(mz.position); flash.position.z -= .10;
    vm.add(flash);
    this.flashMesh = flash;
    const light = new THREE.PointLight(0xffcc66, 0, 9, 2);
    light.position.copy(mz.position); light.position.z += .1;
    vm.add(light);
    this.flashLight = light;
    this.muzzle = mz;
    this.vmGroup = group;
    this.vmInner = vm;
    this.vmKind = id;
    if (parent) parent.add(group);
    return group;
  }

  /* Probe the space directly in front of the player for a climbable surface.
     The movement collision only reports a wall while we are actually pushing
     into it, but the dedicated climb action must also work from a standstill,
     so it looks ahead by a hand's reach instead. Returns {top, low} or null. */
  probeWall(world) {
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    const fx = -sy, fz = -cy;                        // forward
    const reach = this.radius + 0.5;
    const px = this.pos.x + fx * reach, pz = this.pos.z + fz * reach;
    const r = this.radius * 0.9;
    const cyl = { x: px, y: this.pos.y, z: pz, radius: r, height: this.height };
    const bb = AABB(px - r, this.pos.y, pz - r, px + r, this.pos.y + this.height, pz + r);
    const list = world.query(bb, []);
    let top = -Infinity, low = Infinity;
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      if (b.tag === 'ground') continue;
      if (!cylinderOverlapsAABB(cyl, b)) continue;
      if (b.maxY > top) top = b.maxY;
      if (b.minY < low) low = b.minY;
    }
    return top === -Infinity ? null : { top, low };
  }

  /* ---------- climb mechanic ----------
     An explicit action: press the climb button (phone) or key (PC) while facing
     a surface and the player pulls themselves up onto it — a deliberate animated
     vault, not a teleport. It never triggers by itself, so leaning against cover
     no longer throws you on top of it by accident.
     Height is not limited: a crate, a container, a roof or the 9 m perimeter
     wall can all be scaled. Taller climbs simply take longer to animate, and
     the vault is refused only if there is genuinely nowhere to stand on top. */
  updateClimb(dt, world, input, res, wl) {    let top = res.blockTop, low = res.blockLow;
    let blocked = !!(res.hitX || res.hitZ);

    if (this.climbing) {
      // animate the vault: rise, then step forward onto the ledge. The easing is
      // symmetric so tall climbs accelerate smoothly instead of snapping.
      this.climbT += dt;
      const k = U.clamp(this.climbT / this.climbDur, 0, 1);
      const ease = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      this.pos.y = U.lerp(this.climbFrom.y, this.climbTo.y, ease);
      this.pos.x = U.lerp(this.climbFrom.x, this.climbTo.x, ease);
      this.pos.z = U.lerp(this.climbFrom.z, this.climbTo.z, ease);
      this.vel.x = this.vel.y = this.vel.z = 0;
      this.onGround = true;
      if (k >= 1) { this.climbing = false; this.climbHold = 0; }
      return;
    }

    // consume the explicit request (edge-triggered, so holding does not repeat)
    const want = this.climbQueued;
    this.climbQueued = false;
    if (!want || !this.onGround) { this.climbHold = 0; return; }

    const probe = this.probeWall(world);
    if (probe) { blocked = true; top = probe.top; low = probe.low; }

    // the surface must be a real ledge (above stepping height) and must actually
    // rise from around our feet, so we never latch onto a floating platform above
    const climbable = blocked && top !== undefined && isFinite(top) &&
      top > this.pos.y + CFG.stepUp + 0.05 &&
      this.pos.y > (low === undefined ? -Infinity : low) - 1;
    if (!climbable) { this.climbHold = 0; return; }

    // Pick a landing spot on top of the obstacle, just past its near face.
    // Stepping too far in overshoots narrow cover (the climber landed past a
    // 2 m wall and fell off the far side), so the step is kept small and the
    // spot is validated against the world before committing.
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    const fx = -sy, fz = -cy;                     // forward
    let tx = this.pos.x, tz = this.pos.z, landY = top;
    let found = false;
    for (const step of [this.radius + 0.25, this.radius + 0.55, this.radius + 0.95]) {
      const px = this.pos.x + fx * step, pz = this.pos.z + fz * step;
      const gy = world.groundAt(px, pz, top + 1.2);
      const y = (gy === null || gy === undefined || gy < top - 0.4) ? top : gy;
      if (!world.overlaps(px, y + 0.05, pz, this.radius * 0.95, this.height)) {
        tx = px; tz = pz; landY = y; found = true; break;
      }
    }
    // nothing clear on top: refuse the climb rather than vault into a wall
    if (!found) { Audio3D_SFX && Audio3D_SFX.deny && this.isLocal && Audio3D_SFX.deny(); return; }

    const rise = Math.max(0, landY - this.pos.y);
    this.climbing = true;
    this.climbT = 0;
    this.climbDur = U.clamp(CFG.climbDuration + rise * CFG.climbDurationPerM, CFG.climbDuration, CFG.climbDurationMax);
    this.climbFrom = { x: this.pos.x, y: this.pos.y, z: this.pos.z };
    this.climbTo = { x: tx, y: landY, z: tz };
    this.climbHold = 0;
    Bus.emit('climb', this);
    if (this.isLocal && typeof Audio3D_SFX !== 'undefined') Audio3D_SFX.pickup();
  }

  /* ---------- movement + physics ---------- */
  update(dt, world, input) {
    const w = this.weapon, def = this.def;

    // crouch (smooth height)
    const wantCrouch = !!input.crouch;
    const targetH = wantCrouch ? CFG.crouchHeight : CFG.playerHeight;
    if (Math.abs(this.height - targetH) > .001) {
      // don't uncrouch into geometry
      if (targetH > this.height && world.overlaps(this.pos.x, this.pos.y + this.height, this.pos.z, this.radius, targetH - this.height + .05)) {
        // blocked — stay crouched
      } else {
        this.height = U.lerp(this.height, targetH, 1 - Math.pow(.0006, dt));
      }
    }
    this.crouching = this.height < CFG.playerHeight * .82;

    // ---- wish direction ----
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    let wishX = 0, wishZ = 0;
    if (input.f) { wishX += -sy * input.f; wishZ += -cy * input.f; }
    if (input.r) { wishX += cy * input.r; wishZ += -sy * input.r; }
    const wl = Math.hypot(wishX, wishZ);
    if (wl > 0) { wishX /= wl; wishZ /= wl; }

    let maxSpeed = input.run && !this.crouching ? CFG.runSpeed : CFG.walkSpeed;
    if (this.crouching) maxSpeed = CFG.crouchSpeed;
    if (this.isAiming && def.zoom) maxSpeed *= .35;
    maxSpeed *= (1 - U.clamp(this.reloadT > 0 ? .16 : 0, 0, 1));

    // ---- horizontal acceleration ----
    const accel = this.onGround ? CFG.accel : CFG.airAccel;
    const curSpeedAlongWish = this.vel.x * wishX + this.vel.z * wishZ;
    const addSpeed = maxSpeed - curSpeedAlongWish;
    if (addSpeed > 0 && wl > 0) {
      const a = Math.min(accel * maxSpeed * dt, addSpeed);
      this.vel.x += wishX * a; this.vel.z += wishZ * a;
    }
    // friction
    if (this.onGround) {
      const sp = Math.hypot(this.vel.x, this.vel.z);
      if (sp > 0.01) {
        const drop = Math.max(sp, 2) * CFG.friction * dt;
        const nf = Math.max(sp - drop, 0) / sp;
        this.vel.x *= nf; this.vel.z *= nf;
      } else { this.vel.x = 0; this.vel.z = 0; }
    }

    // ---- jump ----
    if (input.wantJump && this.onGround) {
      this.vel.y = CFG.jumpSpeed;
      this.onGround = false;
    }

    // ---- gravity ----
    this.vel.y -= CFG.gravity * dt;
    if (this.vel.y < -55) this.vel.y = -55;

    // ---- move with collision ----
    const disp = { x: this.vel.x * dt, y: this.vel.y * dt, z: this.vel.z * dt };
    const res = world.moveCylinder(this, disp, { stepUp: CFG.stepUp, snap: CFG.stepUp });
    if (res.hitX) this.vel.x = 0;
    if (res.hitZ) this.vel.z = 0;
    if (res.ceiling) this.vel.y = Math.min(this.vel.y, 0);

     /* ---- climb: an explicit action (ЗАЛЕЗТЬ / E) ----
        Walking into a wall used to teleport the player to its top in a single
        frame (fixed in moveCylinder). In its place this is a deliberate move:
        press the climb button or key while facing a surface and the player
        vaults onto it. It never triggers on its own, so brushing against cover
        is safe — and there is no height limit, taller surfaces just take longer. */
    this.updateClimb(dt, world, input, res, wl);

    // ---- ground: land on, or step up to, the surface under our feet ----
    // A ground snap must only pull us DOWN by a small amount (stairs and
    // ledges). Snapping from any height would teleport a jumping player back
    // to the floor the moment their vertical velocity crosses zero, so the
    // snap window is limited to roughly this frame's fall distance.
    const gy = res.groundY;
    const snapDown = Math.max(CFG.snapDown, -disp.y + 0.05);
    if (res.hitY && this.vel.y <= 0) {
      // we struck something while descending → this is a landing
      if (!this.onGround && this.vel.y < -6) this.landImpact = Math.min(1, -this.vel.y / 18);
      this.vel.y = 0;
      this.onGround = true;
    } else if (gy !== null && gy !== undefined && this.vel.y <= 0.001) {
      const gap = gy - this.pos.y;                  // >0 means stepping up
      if (gap >= -snapDown && gap <= CFG.stepUp + 0.001) {
        if (gap > 0.001 && !this.onGround && this.vel.y < -8) {
          // falling too fast to climb — keep airborne, gravity finishes the job
          this.onGround = false;
        } else {
          if (!this.onGround && this.vel.y < -6) this.landImpact = Math.min(1, -this.vel.y / 18);
          this.pos.y = gy;
          this.vel.y = 0;
          this.onGround = true;
        }
      } else {
        // surface is far below (or above) — we are genuinely airborne
        this.onGround = false;
      }
    } else {
      this.onGround = false;
    }
    // keep inside the world — but never clamp the player out of the aim room,
    // which sits outside the arena bounds. The perimeter wall is climbable now,
    // so the clamp relaxes just enough to touch its inner face at ground level
    // and to stand on top of it, while still never letting the player walk off
    // the outer edge into the void.
    const room = (typeof MAP !== 'undefined') ? MAP.aimRoom : null;
    const inRoom = room && this.pos.z < room.maxZ + 6 && this.pos.z > room.minZ - 6 &&
      this.pos.x > room.minX - 6 && this.pos.x < room.maxX + 6;
    if (!inRoom) {
      const half = MAP.size / 2;
      const inner = half - 1.5;                        // reach the wall's inner face
      const onWall = this.pos.y > (MAP.wallH || 9) - 2.5;
      const lim = onWall ? half : inner;               // on the wall, don't step outward
      this.pos.x = U.clamp(this.pos.x, -lim, lim);
      this.pos.z = U.clamp(this.pos.z, -lim, lim);
    }
    if (this.pos.y < -8) {
      this.pos.y = world ? world.groundAt(this.pos.x, this.pos.z, 4) : 0;
      this.vel.x = this.vel.y = this.vel.z = 0;
    }

    // ---- footsteps ----
    const hspeed = Math.hypot(this.vel.x, this.vel.z);
    if (this.onGround && hspeed > 1.4) {
      const interval = (this.crouching ? .62 : input.run ? .30 : .44) * (CFG.runSpeed / Math.max(hspeed, 1));
      this.bobPhase += dt / interval;
      if (this.bobPhase >= 1) {
        this.bobPhase -= 1;
        if (this.isLocal) Audio3D_SFX.step(this.pos.x, this.pos.y, this.pos.z);
      }
    } else {
      this.bobPhase = U.lerp(this.bobPhase % 1, 0, dt * 6);
    }

    return res;
  }

  /* Turn the minigun's barrel cluster to match the current spin phase. Safe to
     call for any weapon: models without barrels simply do nothing. The Y.H.S
     has a second, outer barrel ring that counter-rotates for extra motion. */
  applyBarrelSpin() {
    if (!this.vmInner) return;
    const ph = this.spinPhase || 0;
    const barrels = this.vmInner.getObjectByName('barrels');
    if (barrels) barrels.rotation.z = ph;
    const outer = this.vmInner.getObjectByName('barrels2');
    if (outer) outer.rotation.z = -ph * .65;
  }

  /* ---------- per-frame weapon logic ---------- */
  tickWeapon(dt, game) {
    const w = this.weapon; if (!w) return;
    const def = this.def;

    if (this.fireCd > 0) this.fireCd -= dt;
    if (this.deployT > 0) this.deployT -= dt;

    // reload
    if (this.reloadT > 0) {
      this.reloadT -= dt;
      const prog = 1 - this.reloadT / Math.max(this.reloadTotal, .001);
      if (Math.floor(prog * 6) !== this._reloadTick) {
        this._reloadTick = Math.floor(prog * 6);
        if (this.isLocal) Audio3D_SFX.reloadStep(this._reloadTick);
      }
      if (this.reloadT <= 0) {
        const need = def.mag - w.mag;
        const take = Math.min(need, w.reserve);
        w.mag += take; w.reserve -= take;
        this.reloadT = 0;
      }
    }

    // recoil recovery
    const rec = Math.pow(0.0009, dt);
    this.recoil = U.lerp(this.recoil, 0, 1 - rec);
    this.recoilYaw = U.lerp(this.recoilYaw, 0, 1 - rec);
    this.viewPunchP = U.lerp(this.viewPunchP, 0, 1 - Math.pow(0.00005, dt));
    this.viewPunchY = U.lerp(this.viewPunchY, 0, 1 - Math.pow(0.00005, dt));

    // spread decay
    const moveSpread = this.onGround ? Math.min(Math.hypot(this.vel.x, this.vel.z) / CFG.runSpeed, 1) : 1;
    this.spread = U.lerp(this.spread, 0, 1 - Math.pow(0.02, dt));
    this.moveSpreadNow = moveSpread;

    // zoom / scope
    const canZoom = !!def.zoom && this.reloadT <= 0 && this.deployT <= 0;
    this.isAiming = this._wantAim && canZoom;
    this.zoom = U.lerp(this.zoom, this.isAiming ? 1 : 0, 1 - Math.pow(0.0000015, dt));

    // spin-up: the barrels must wind up before the weapon can fire, and they
    // wind back down when the trigger is released
    if (def.spinUp) {
      const want = this.triggerDown && this.reloadT <= 0 && this.deployT <= 0 && this.weapon.mag > 0;
      const rate = want ? 1 / def.spinUp : 1 / (def.spinUp * 1.4);
      const was = this.spinT;
      this.spinT = U.clamp(this.spinT + (want ? rate : -rate) * dt, 0, 1);
      if (!this.isLocal && this.spinT > .05 && !this._spinSnd) {
        Audio3D_SFX.minigunSpin(this.pos.x, this.pos.y + 1.2, this.pos.z);
        this._spinSnd = true;
      }
      if (this.spinT <= .05) this._spinSnd = false;
      // local laser cannon: a dedicated charging whirr the first time it spins up
      if (this.isLocal && def.beam && was < .05 && this.spinT > .05) {
        Audio3D_SFX.cannonSpin(this.pos.x, this.pos.y + 1.2, this.pos.z);
      }
      // Visible spin: the barrel cluster turns steadily while winding up, then
      // very fast once it is up to speed. The rotation keeps its own phase so
      // stopping and restarting does not snap the barrels to a new angle.
      this.spinPhase = (this.spinPhase || 0) + (6 + this.spinT * this.spinT * 78) * this.spinT * dt;
      this.applyBarrelSpin();
    } else {
      this.spinT = 0;
    }
    // laser cannon heat: burn while the beam is up, vent when it is not
    if (def.beam) {
      if (this.beamVent > 0) {
        this.beamVent = Math.max(0, this.beamVent - dt);
        this.beamHeat = 0;
        // overheated barrel: sparks and smoke pour off the muzzle while it vents
        if (this.isLocal && game && game.effects) {
          const eye = game.eyePos ? game.eyePos() : this.pos;
          const dir = game.cameraDir ? game.cameraDir() : { x: -Math.sin(this.yaw), y: 0, z: -Math.cos(this.yaw) };
          const tip = { x: eye.x + dir.x * .9 - Math.sin(this.yaw) * .12, y: eye.y - .18 + dir.y * .9, z: eye.z + dir.z * .9 - Math.cos(this.yaw) * .12 };
          const k = U.clamp(this.beamVent / Math.max(.001, (def.beamVent || 3.5)), 0, 1);   // 1 → 0 as it cools
          // sparks: more at first, thinning out as it cools
          if (Math.random() < .6 + k * .4) {
            for (let i = 0; i < 2; i++) {
              game.effects.particle(
                tip.x + U.rand(-.12, .12), tip.y + U.rand(-.10, .10), tip.z + U.rand(-.12, .12),
                dir.x * U.rand(1, 5) + U.rand(-2, 2), U.rand(1, 4), dir.z * U.rand(1, 5) + U.rand(-2, 2),
                U.rand(.03, .07), 'spark', U.rand(.12, .35));
            }
          }
          // smoke: a steady plume that thins as the barrel cools
          if (Math.random() < .5 + k * .5) {
            game.effects.particle(
              tip.x + U.rand(-.10, .10), tip.y + U.rand(-.06, .14), tip.z + U.rand(-.10, .10),
              dir.x * U.rand(.3, 1.4) + U.rand(-.5, .5), U.rand(.6, 2.0), dir.z * U.rand(.3, 1.4) + U.rand(-.5, .5),
              U.rand(.05, .12), 'smoke', U.rand(.6, 1.6));
          }
          // a flicker of heat-light on the first, hottest moment
          if (k > .8 && Math.random() < .25) {
            game.effects.particle(tip.x, tip.y, tip.z, 0, .6, 0, .06, 'spark', .1);
          }
        }
      } else if (this.alive && this.triggerDown && this.spinT > .85 && this.reloadT <= 0 && this.deployT <= 0 && this.weapon.mag > 0) {
        if (this.isLocal && !this._beamSnd) Audio3D_SFX.cannonBeamStart(this.pos.x, this.pos.y + 1.2, this.pos.z);
        this.beamHeat += dt;
        // the whine rises with the burn time: 0 → 1 over the full beam window
        if (this.isLocal) Audio3D_SFX.cannonBeamHeat(this.beamHeat / Math.max(.001, (def.beamMax || 10)));
        if (this.beamHeat >= (def.beamMax || 10)) {
          this.beamHeat = 0;                       // overheat — forced vent
          this.beamVent = def.beamVent || 3.5;
          if (this.isLocal) { Audio3D_SFX.cannonOverheat(); UI.toast('ПЕРЕГРЕВ · остывает', '#e33a2e'); }
          Audio3D_SFX.deny();
        }
      } else {
        this.beamHeat = Math.max(0, this.beamHeat - dt * 2.5);   // cools off fast between bursts
        if (this.isLocal) Audio3D_SFX.cannonBeamStop();
      }
    } else {
      this.beamHeat = 0; this.beamVent = 0;
      if (this.isLocal) Audio3D_SFX.cannonBeamStop();
    }

    if (this.flashT > 0) {
      this.flashT -= dt;
      const k = U.clamp(this.flashT / .05, 0, 1);
      if (this.flashMesh) this.flashMesh.material.opacity = k * .95;
      if (this.flashLight) this.flashLight.intensity = k * 14;
      if (this.flashMesh) this.flashMesh.rotation.z += dt * 40;
    }
  }

  reload(game) {
    const w = this.weapon; if (!w) return false;
    const def = this.def;
    if (def.mag === Infinity) return false;
    if (this.reloadT > 0 || this.deployT > 0) return false;
    if (w.mag >= def.mag || w.reserve <= 0) return false;
    this.reloadTotal = def.mag <= 12 ? 2.2 : def.mag <= 30 ? 2.5 : 3.6;
    this.reloadT = this.reloadTotal;
    this._reloadTick = 0;
    this.zoom = 0;
    return true;
  }

  canFire() {
    const w = this.weapon; if (!w) return false;
    if (!this.alive) return false;
    if (this.def.spinUp && this.spinT < 1) return false;   // minigun must wind up
    if (this.def.beam && this.beamVent > 0) return false;  // laser cannon is venting
    if (this.fireCd > 0 || this.reloadT > 0 || this.deployT > 0) return false;
    if (w.mag <= 0) return false;
    return true;
  }

  /* current inaccuracy in radians */
  aimSpread() {
    const def = this.def;
    let s = def.spread;
    s += (def.moveSpread || 0) * (this.moveSpreadNow || 0) * (this.onGround ? 1 : 1.7);
    s += this.spread;
    if (this.crouching) s *= .62;
    if (this.isAiming) s *= .18;
    return s;
  }
}

function disposeGroup(g) {
  g.traverse(o => {
    if (o.geometry) o.geometry.dispose();
  });
}
