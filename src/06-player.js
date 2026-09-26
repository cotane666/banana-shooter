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

function buildWeaponModel(id) {
  const g = new THREE.Group();
  const add = (...ms) => { for (const m of ms) g.add(m); return ms[0]; };

  switch (id) {

    /* ---------------- GLOCK-18: compact polymer pistol ---------------- */
    case 'glock': {
      add(B(.052, .052, .17, PAL.poly, 0, 0, -.075));                 // slide
      add(B(.046, .030, .155, PAL.gun, 0, -.038, -.07));              // frame
      add(CYL(.011, .06, PAL.steel, 0, .004, -.19, 8));               // barrel
      add(B(.040, .020, .022, PAL.black, 0, -.004, -.165));           // muzzle block
      add(B(.044, .105, .052, PAL.poly, 0, -.085, .005, .16));        // grip
      add(B(.048, .026, .050, PAL.mag, 0, -.11, .004, .16));          // mag floorplate
      add(B(.020, .012, .012, PAL.steel, 0, .032, -.145));            // front sight
      add(B(.030, .014, .014, PAL.steel, 0, .032, -.005));            // rear sight
      add(B(.026, .022, .028, PAL.black, 0, -.048, -.036));           // trigger guard
      break;
    }

    /* ---------------- USP-S: silenced pistol ---------------- */
    case 'usp': {
      add(B(.050, .054, .185, PAL.black, 0, 0, -.08));
      add(B(.044, .030, .16, PAL.gun, 0, -.040, -.075));
      add(CYL(.017, .20, PAL.poly, 0, .004, -.255, 10));              // long suppressor
      add(CYL(.019, .012, PAL.steel, 0, .004, -.158, 10));            // thread collar
      add(B(.042, .105, .050, PAL.black, 0, -.088, .008, .15));
      add(B(.020, .012, .012, PAL.steel, 0, .034, -.155));
      add(B(.028, .013, .014, PAL.steel, 0, .034, -.012));
      add(B(.024, .020, .026, PAL.black, 0, -.050, -.038));
      break;
    }

    /* ---------------- P250: compact duty pistol ---------------- */
    case 'p250': {
      add(B(.054, .050, .165, PAL.gunLight, 0, 0, -.072));
      add(B(.046, .032, .15, PAL.poly, 0, -.038, -.068));
      add(CYL(.012, .05, PAL.steel, 0, .002, -.178, 8));
      add(B(.046, .10, .052, PAL.poly, 0, -.082, .006, .14));
      add(B(.050, .024, .052, PAL.mag, 0, -.106, .005, .14));         // wide floorplate
      add(B(.020, .011, .012, PAL.steel, 0, .030, -.135));
      add(B(.028, .013, .013, PAL.steel, 0, .030, -.008));
      add(B(.024, .020, .026, PAL.black, 0, -.046, -.036));
      break;
    }

    /* ---------------- Desert Eagle: huge silver hand cannon ---------------- */
    case 'deagle': {
      add(B(.062, .070, .215, PAL.steel, 0, 0, -.095));               // massive slide
      add(B(.056, .038, .18, PAL.gun, 0, -.052, -.085));
      add(B(.048, .036, .20, PAL.steel, 0, .020, -.115));             // full-length top rib
      add(CYL(.014, .05, PAL.black, 0, .004, -.225, 8));
      add(B(.052, .115, .058, PAL.poly, 0, -.098, .010, .17));        // grip
      add(B(.020, .016, .014, PAL.black, 0, .044, -.20));             // front sight
      add(B(.032, .016, .016, PAL.black, 0, .044, -.005));            // rear sight
      add(B(.028, .022, .030, PAL.black, 0, -.058, -.046));
      break;
    }

    /* ---------------- R8 Revolver: swinging cylinder ---------------- */
    case 'revolver': {
      add(B(.048, .054, .19, PAL.gun, 0, 0, -.085));
      add(B(.042, .028, .16, PAL.black, 0, -.036, -.08));
      const cyl = CYL(.036, .085, PAL.steel, 0, 0, -.105, 12);        // the cylinder
      add(cyl);
      add(CYL(.014, .13, PAL.steel, 0, .002, -.215, 8));              // barrel
      add(B(.046, .115, .055, PAL.wood, 0, -.095, .012, .19));        // wooden grip
      add(B(.020, .014, .014, PAL.black, 0, .040, -.19));
      add(B(.030, .014, .015, PAL.black, 0, .038, -.015));
      add(B(.022, .032, .022, PAL.steel, 0, -.045, -.03));            // hammer area
      break;
    }

    /* ---------------- MP5-SD: integrally suppressed SMG ---------------- */
    case 'mp5': {
      add(B(.052, .075, .30, PAL.black, 0, 0, -.14));                 // receiver
      add(CYL(.021, .28, PAL.gun, 0, .006, -.43, 12));                // fat suppressor
      add(CYL(.024, .015, PAL.steel, 0, .006, -.295, 12));
      add(B(.048, .060, .20, PAL.poly, 0, -.008, -.30));              // slim handguard
      add(B(.040, .150, .055, PAL.black, 0, -.115, -.06));            // curved mag
      add(B(.044, .028, .058, PAL.mag, 0, -.185, -.06));              // mag floor
      add(B(.042, .115, .058, PAL.poly, 0, -.085, .015, .18));        // pistol grip
      add(B(.050, .060, .13, PAL.black, 0, -.004, .085));             // stock body
      add(B(.040, .050, .10, PAL.poly, 0, -.004, .20));               // sliding stock
      add(B(.030, .034, .09, PAL.black, 0, .052, -.13));              // optic hood
      add(CYL(.013, .05, PAL.steel, 0, .052, -.20, 8));               // optic tube
      add(B(.024, .020, .026, PAL.black, 0, -.058, -.10));
      break;
    }

    /* ---------------- P90: bullpup with a top magazine ---------------- */
    case 'p90': {
      add(B(.075, .105, .34, PAL.oliv, 0, 0, -.14));                  // chunky shell
      add(B(.058, .072, .10, PAL.poly, 0, -.005, .05));               // rear
      add(CYL(.014, .11, PAL.steel, 0, .004, -.345, 8));              // stubby barrel
      add(B(.070, .040, .13, PAL.poly, 0, .070, -.13));               // TOP magazine
      add(B(.066, .020, .12, PAL.mag, 0, .095, -.13));
      add(B(.030, .110, .050, PAL.poly, 0, -.075, .01, .10));         // grip
      add(B(.052, .058, .06, PAL.black, 0, -.008, -.045));            // trigger housing
      add(B(.026, .030, .11, PAL.black, 0, .048, -.02));              // built-in optic
      add(B(.020, .014, .016, PAL.steel, 0, .035, -.045));
      break;
    }

    /* ---------------- UMP-45: angular polymer SMG ---------------- */
    case 'ump': {
      add(B(.058, .072, .30, PAL.poly, 0, 0, -.135));
      add(B(.046, .062, .22, PAL.black, 0, -.006, -.30));             // squared handguard
      add(CYL(.016, .11, PAL.steel, 0, .004, -.41, 8));
      add(B(.044, .135, .055, PAL.mag, 0, -.105, -.075));             // thick .45 mag
      add(B(.048, .024, .060, PAL.black, 0, -.175, -.075));
      add(B(.044, .115, .058, PAL.poly, 0, -.085, .015, .22));
      add(B(.048, .058, .14, PAL.poly, 0, -.006, .09));               // folding stock
      add(B(.040, .058, .06, PAL.black, 0, -.006, .17));
      add(B(.025, .028, .11, PAL.black, 0, .050, -.10));              // rail
      add(B(.024, .020, .026, PAL.black, 0, -.058, -.105));
      break;
    }

    /* ---------------- Nova: pump-action shotgun ---------------- */
    case 'nova': {
      add(B(.050, .075, .17, PAL.gun, 0, 0, -.08));                   // receiver
      add(CYL(.017, .42, PAL.steel, 0, .030, -.375, 10));             // barrel
      add(CYL(.016, .32, PAL.black, 0, .000, -.32, 10));              // mag tube
      add(B(.058, .046, .13, PAL.wood, 0, .002, -.28));               // pump forend
      add(B(.048, .115, .055, PAL.wood, 0, -.085, .015, .20));
      add(B(.052, .085, .20, PAL.wood, 0, -.012, .11));               // stock
      add(B(.044, .075, .05, PAL.gun, 0, -.012, .215));               // recoil pad
      add(B(.020, .014, .014, PAL.steel, 0, .062, -.55));
      add(B(.024, .020, .026, PAL.black, 0, -.055, -.06));
      break;
    }

    /* ---------------- XM1014: semi-auto shotgun ---------------- */
    case 'xm': {
      add(B(.058, .085, .28, PAL.black, 0, 0, -.135));                // bulky receiver
      add(CYL(.019, .40, PAL.steel, 0, .028, -.38, 10));
      add(CYL(.018, .34, PAL.gun, 0, -.002, -.35, 10));               // gas tube
      add(B(.056, .048, .16, PAL.poly, 0, .000, -.30));               // broad forend
      add(B(.050, .115, .058, PAL.black, 0, -.088, .015, .20));
      add(B(.052, .075, .18, PAL.poly, 0, -.008, .10));               // stock
      add(B(.058, .028, .055, PAL.mag, 0, .075, -.20));               // shell holder
      add(B(.024, .020, .026, PAL.black, 0, -.058, -.055));
      break;
    }

    /* ---------------- Galil AR: utilitarian assault rifle ---------------- */
    case 'galil': {
      add(B(.060, .080, .40, PAL.poly, 0, 0, -.19));                  // slab receiver
      add(B(.046, .060, .26, PAL.black, 0, -.006, -.43));             // handguard
      add(B(.020, .020, .10, PAL.steel, 0, .032, -.52));              // gas block
      add(CYL(.015, .16, PAL.steel, 0, .008, -.62, 8));               // barrel
      add(B(.030, .026, .045, PAL.black, 0, .008, -.70));             // birdcage flash hider
      add(B(.046, .175, .070, PAL.mag, 0, -.125, -.16, -.06));        // long curved mag
      add(B(.046, .130, .058, PAL.poly, 0, -.092, .015, .22));
      add(B(.048, .070, .16, PAL.poly, 0, .004, .10));                // folding stock
      add(B(.044, .062, .05, PAL.black, 0, .004, .19));
      add(B(.022, .030, .12, PAL.black, 0, .058, -.10));              // rail
      add(B(.030, .030, .012, PAL.glass, 0, .062, -.05));             // rear peep
      add(B(.024, .020, .026, PAL.black, 0, -.060, -.13));
      break;
    }

    /* ---------------- FAMAS: bullpup, carry handle ---------------- */
    case 'famas': {
      add(B(.058, .095, .50, PAL.poly, 0, 0, -.19));                  // long single shell
      add(B(.030, .030, .30, PAL.black, 0, .088, -.20));              // tall carry handle
      add(B(.026, .028, .30, PAL.poly, 0, .060, -.20));
      add(B(.020, .026, .06, PAL.steel, 0, .088, -.03));              // rear sight notch
      add(B(.018, .030, .04, PAL.steel, 0, .088, -.37));              // front post
      add(CYL(.013, .13, PAL.steel, 0, .010, -.47, 8));               // barrel
      add(B(.046, .150, .070, PAL.mag, 0, -.120, .02));               // rear mag (bullpup)
      add(B(.044, .115, .056, PAL.poly, 0, -.085, -.08, .18));
      add(B(.052, .045, .24, PAL.black, 0, -.020, -.42));             // handguard/bipod rail
      add(B(.020, .050, .10, PAL.poly, 0, -.062, -.44));              // folded bipod
      add(B(.024, .020, .026, PAL.black, 0, -.055, -.20));
      break;
    }

    /* ---------------- AK-47: wood furniture, curved mag ---------------- */
    case 'ak47': {
      add(B(.056, .078, .34, PAL.gun, 0, 0, -.16));                   // stamped receiver
      add(B(.024, .026, .30, PAL.black, 0, .052, -.17));              // dust-cover rail
      add(B(.052, .062, .22, PAL.wood, 0, -.004, -.35));              // wooden handguard
      add(B(.020, .020, .09, PAL.steel, 0, .030, -.44));              // gas block
      add(CYL(.014, .20, PAL.steel, 0, .008, -.56, 8));
      add(B(.026, .024, .05, PAL.black, 0, .008, -.67));              // slant brake
      // the signature curved magazine (three stacked segments)
      add(B(.044, .080, .070, PAL.mag, 0, -.085, -.13, -.05));
      add(B(.044, .080, .072, PAL.mag, 0, -.155, -.155, -.16));
      add(B(.044, .070, .074, PAL.mag, 0, -.215, -.195, -.30));
      add(B(.046, .120, .056, PAL.wood, 0, -.082, .025, .20));        // wooden grip
      add(B(.050, .100, .17, PAL.wood, 0, -.005, .14));               // wooden stock
      add(B(.036, .070, .05, PAL.gun, 0, -.048, .215, -.10));         // stock comb
      add(B(.022, .026, .10, PAL.black, 0, .060, -.06));
      add(B(.024, .020, .028, PAL.black, 0, -.056, -.09));
      break;
    }

    /* ---------------- M4A4: carbine, flat-top, carry handle stock ---------------- */
    case 'm4a4': {
      add(B(.054, .072, .38, PAL.black, 0, 0, -.18));
      add(B(.030, .020, .30, PAL.steel, 0, .048, -.19));              // flat-top rail
      add(B(.032, .034, .035, PAL.black, 0, .042, -.02));             // rear sight block
      add(B(.050, .058, .26, PAL.poly, 0, -.004, -.42));              // round handguard
      add(CYL(.014, .17, PAL.steel, 0, .006, -.60, 8));
      add(B(.028, .028, .05, PAL.black, 0, .006, -.70));              // A2 flash hider
      add(B(.030, .030, .10, PAL.gun, 0, .040, -.34));                // carry handle / optic
      add(B(.046, .140, .068, PAL.mag, 0, -.100, -.16, .02));         // straight STANAG mag
      add(B(.044, .115, .056, PAL.poly, 0, -.082, .015, .20));
      add(B(.048, .078, .16, PAL.poly, 0, -.004, .10));               // buffer tube
      add(B(.052, .080, .07, PAL.black, 0, -.004, .19));              // collapsible stock
      add(B(.024, .020, .026, PAL.black, 0, -.056, -.12));
      break;
    }

    /* ---------------- SG 553: heavy rifle with a scope ---------------- */
    case 'sg553': {
      add(B(.062, .085, .40, PAL.oliv, 0, 0, -.19));
      add(B(.060, .062, .24, PAL.black, 0, -.004, -.43));
      add(CYL(.016, .15, PAL.steel, 0, .006, -.60, 8));
      add(B(.030, .028, .05, PAL.black, 0, .006, -.69));
      add(CYL(.026, .19, PAL.black, 0, .080, -.20, 12));              // big scope tube
      add(CYL(.030, .035, PAL.gun, 0, .080, -.10, 12));               // eyepiece
      add(CYL(.031, .030, PAL.gun, 0, .080, -.30, 12));               // objective
      add(B(.026, .070, .022, PAL.black, 0, .050, -.16));             // scope mount
      add(B(.046, .150, .068, PAL.mag, 0, -.105, -.16, .04));         // translucent mag
      add(B(.046, .115, .058, PAL.poly, 0, -.082, .015, .20));
      add(B(.050, .080, .17, PAL.poly, 0, -.004, .10));
      add(B(.054, .085, .075, PAL.black, 0, -.006, .20));
      add(B(.024, .020, .026, PAL.black, 0, -.056, -.13));
      break;
    }

    /* ---------------- AWP: bolt-action sniper ---------------- */
    case 'awp': {
      add(B(.056, .082, .48, PAL.oliv, 0, 0, -.23));                  // long receiver
      add(B(.044, .060, .30, PAL.oliv, 0, -.004, -.52));              // handguard
      add(CYL(.016, .34, PAL.steel, 0, .008, -.80, 8));               // long barrel
      add(CYL(.021, .09, PAL.black, 0, .008, -.99, 8));               // muzzle brake
      add(CYL(.032, .30, PAL.black, 0, .090, -.28, 12));              // LONG scope
      add(CYL(.037, .05, PAL.gun, 0, .090, -.10, 12));                // eyepiece
      add(CYL(.039, .045, PAL.gun, 0, .090, -.45, 12));               // objective
      add(B(.028, .080, .024, PAL.black, 0, .052, -.22));             // scope mount
      add(B(.028, .080, .024, PAL.black, 0, .052, -.35));
      add(B(.022, .040, .13, PAL.steel, 0, -.004, -.22));             // bolt body
      add(CYL(.011, .06, PAL.steel, .034, .004, -.20, 8));            // bolt handle
      add(B(.048, .150, .080, PAL.mag, 0, -.105, -.24));              // low magazine
      add(B(.048, .120, .060, PAL.oliv, 0, -.085, .020, .20));
      add(B(.052, .115, .22, PAL.oliv, 0, -.005, .14));               // thumbhole stock
      add(B(.046, .088, .06, PAL.black, 0, -.012, .26));              // butt pad
      add(B(.030, .046, .10, PAL.steel, 0, -.040, .08));              // cheek riser
      break;
    }

    /* ---------------- SSG 08 (Scout): light bolt-action ---------------- */
    case 'scout': {
      add(B(.048, .070, .42, PAL.black, 0, 0, -.20));
      add(B(.042, .054, .24, PAL.poly, 0, -.004, -.46));
      add(CYL(.013, .26, PAL.steel, 0, .006, -.68, 8));
      add(CYL(.024, .22, PAL.black, 0, .080, -.26, 12));              // smaller scope
      add(CYL(.029, .04, PAL.gun, 0, .080, -.12, 12));
      add(CYL(.030, .038, PAL.gun, 0, .080, -.39, 12));
      add(B(.026, .068, .022, PAL.black, 0, .046, -.20));
      add(B(.024, .020, .09, PAL.steel, 0, -.002, -.20));             // bolt
      add(CYL(.010, .05, PAL.steel, .030, .004, -.19, 8));
      add(B(.042, .120, .070, PAL.mag, 0, -.090, -.22));
      add(B(.044, .110, .055, PAL.poly, 0, -.078, .015, .20));
      add(B(.048, .088, .19, PAL.poly, 0, -.006, .12));
      add(B(.046, .080, .05, PAL.black, 0, -.010, .22));
      break;
    }

    /* ---------------- Negev: heavy machine gun ---------------- */
    case 'negev': {
      add(B(.075, .100, .46, PAL.gun, 0, 0, -.22));                   // huge receiver
      add(B(.070, .080, .26, PAL.black, 0, -.004, -.47));
      add(CYL(.019, .22, PAL.steel, 0, .008, -.70, 8));
      add(B(.034, .034, .06, PAL.black, 0, .008, -.82));
      add(B(.170, .185, .190, PAL.oliv, 0, -.150, -.20));             // big ammo box
      add(B(.150, .020, .170, PAL.gun, 0, -.055, -.20));              // box lid
      add(B(.030, .120, .10, PAL.black, 0, -.075, -.05));             // belt feed
      add(B(.056, .120, .060, PAL.poly, 0, -.088, .035, .20));
      add(B(.052, .090, .17, PAL.gun, 0, -.004, .12));                // stock
      add(B(.048, .080, .05, PAL.black, 0, -.010, .21));
      add(B(.028, .034, .30, PAL.black, 0, .062, -.15));              // top rail
      add(B(.034, .040, .05, PAL.steel, 0, .066, -.02));              // rear sight
      add(CYL(.022, .05, PAL.steel, 0, .066, -.32, 10));              // front sight
      add(B(.024, .026, .10, PAL.black, 0, -.070, -.60));             // foregrip
      break;
    }

    /* ---------------- M134 Minigun: rotating multi-barrel ---------------- */
    case 'minigun': {
      add(B(.090, .110, .34, PAL.gun, 0, 0, -.16));                   // motor housing
      add(B(.100, .120, .14, PAL.black, 0, 0, .01));                  // gearbox
      // The barrel cluster is its own group so the barrels can visibly spin up
      // before firing (and coast down after). Everything that turns rides in
      // here: six barrels, their clamps and the muzzle ring.
      const barrels = new THREE.Group();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const b = CYL(.014, .62, PAL.steel, Math.cos(a) * .052, Math.sin(a) * .052, -.62, 6);
        barrels.add(b);
      }
      barrels.add(CYL(.060, .07, PAL.black, 0, 0, -.30, 12));          // barrel clamp front
      barrels.add(CYL(.058, .06, PAL.black, 0, 0, -.52, 12));          // barrel clamp rear
      barrels.add(CYL(.056, .05, PAL.gun, 0, 0, -.94, 12));            // muzzle ring
      barrels.name = 'barrels';                                        // found by name (clone-safe)
      g.add(barrels);
      add(B(.150, .170, .170, PAL.oliv, 0, -.165, -.02));             // ammo drum
      add(CYL(.085, .10, PAL.oliv, 0, -.165, .085, 14));              // drum body
      add(B(.034, .120, .11, PAL.black, 0, -.070, -.14));             // feed chute
      add(B(.026, .034, .28, PAL.black, 0, .078, -.14));              // top rail
      add(B(.034, .044, .05, PAL.steel, 0, .082, -.02));              // rear sight
      add(CYL(.020, .045, PAL.steel, 0, .082, -.36, 8));              // front sight
      add(B(.040, .105, .26, PAL.poly, 0, -.020, .16));               // rear grip
      add(B(.026, .070, .09, PAL.black, 0, -.075, -.48));             // foregrip
      break;
    }

    /* ---------------- RPG-7: rocket launcher ---------------- */
    case 'rpg': {
      add(CYL(.052, 1.02, PAL.oliv, 0, .020, -.40, 14));              // long launch tube
      add(CYL(.060, .10, PAL.black, 0, .020, .08, 14));               // rear flare
      add(CYL(.086, .14, PAL.oliv, 0, .020, -.92, 14));               // muzzle bell
      add(B(.055, .062, .20, PAL.black, 0, .020, -.14));              // heat shield band
      add(B(.048, .054, .18, PAL.wood, 0, .020, .16));                // wooden rear grip
      add(B(.048, .054, .14, PAL.wood, 0, .020, -.44));               // wooden foregrip
      add(CYL(.030, .24, PAL.steel, 0, .098, -.46, 10));              // optic tube
      add(CYL(.036, .05, PAL.gun, 0, .098, -.34, 10));                // eyepiece
      add(CYL(.038, .05, PAL.gun, 0, .098, -.58, 10));                // objective
      add(B(.024, .062, .022, PAL.black, 0, .058, -.44));             // scope mount
      // loaded rocket: a cone poking out of the muzzle
      add(CYL(.040, .16, PAL.gun, 0, .020, -1.04, 12));               // rocket body
      const cone = new THREE.Mesh(new THREE.ConeGeometry(.062, .16, 12), gunMat(0x8a3b2a));
      cone.position.set(0, .020, -1.19); cone.rotation.x = -Math.PI / 2;
      add(cone);                                                      // warhead
      add(B(.028, .040, .12, PAL.black, 0, -.030, -.06));             // trigger group
      add(B(.030, .050, .07, PAL.black, 0, -.060, -.02));             // pistol grip
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

    /* ---------------- АТОМНОЕ РПГ СВОБОДЫ: bulky green launcher ---------------- */
    case 'atomicRpg': {
      const GREEN = 0x2f7d3a, GREEN2 = 0x1c4f24, DARK = 0x14181c, GLOW = 0x39ff5a;
      add(CYL(.058, .86, GREEN, 0, .030, -.30, 12));                // fat launch tube
      add(CYL(.070, .16, GREEN2, 0, .030, -.72, 12));               // muzzle bell
      add(CYL(.066, .12, GREEN2, 0, .030, .14, 12));                // rear bell
      add(CYL(.062, .06, GLOW, 0, .030, -.80, 12));                 // glowing muzzle ring
      // warhead poking out front
      add(CYL(.040, .16, PAL.black, 0, .030, -.90, 10));
      add(B(.050, .050, .05, GLOW, 0, .030, -.99));
      // grips and sight
      add(B(.046, .120, .060, DARK, 0, -.078, -.14, .12));          // pistol grip
      add(B(.040, .110, .055, DARK, 0, -.075, -.44, -.05));         // foregrip
      add(B(.028, .070, .12, DARK, 0, .098, -.20));                 // optic
      add(B(.026, .026, .05, GLOW, 0, .135, -.24));
      add(B(.030, .030, .10, GREEN2, 0, .105, -.50));               // front sight block
      break;
    }

    /* ---------------- Y.H.S: huge multi-barrel super gun ---------------- */
    case 'yhs': {
      const BODY = 0x3a2f4a, TRIM = 0x5a4a72, HOT = 0xff9d21;
      add(B(.110, .130, .40, BODY, 0, 0, -.20));                    // massive housing
      add(B(.120, .140, .16, PAL.black, 0, 0, .01));                 // gearbox
      const barrels = new THREE.Group();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        barrels.add(CYL(.016, .74, PAL.steel, Math.cos(a) * .062, Math.sin(a) * .062, -.72, 6));
      }
      barrels.add(CYL(.072, .08, PAL.black, 0, 0, -.34, 12));
      barrels.add(CYL(.070, .07, TRIM, 0, 0, -.62, 12));
      barrels.add(CYL(.066, .06, HOT, 0, 0, -1.10, 12));             // hot muzzle ring
      barrels.name = 'barrels';
      g.add(barrels);
      add(B(.180, .220, .220, PAL.oliv, 0, -.205, -.02));           // giant ammo drum
      add(CYL(.105, .12, PAL.oliv, 0, -.205, .11, 16));
      add(B(.046, .140, .12, PAL.black, 0, -.085, -.18));           // feed chute
      add(B(.032, .040, .34, PAL.black, 0, .092, -.18));            // top rail
      add(B(.040, .052, .06, PAL.steel, 0, .098, -.02));
      add(CYL(.022, .05, TRIM, 0, .098, -.44, 8));
      add(B(.050, .120, .28, PAL.poly, 0, -.025, .18));             // rear grip
      add(B(.030, .080, .10, PAL.black, 0, -.085, -.56));           // foregrip
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
      break;
    }

    /* ---------------- Knife ---------------- */
    default:
    case 'knife': {
      add(B(.012, .048, .26, PAL.steel, 0, .014, -.16));              // blade
      add(B(.014, .030, .06, PAL.steel, 0, -.010, -.03));             // choil
      add(B(.010, .058, .02, PAL.black, 0, .002, -.028));             // guard
      add(B(.030, .040, .13, PAL.poly, 0, -.004, .07));               // handle
      add(B(.032, .012, .02, PAL.black, 0, .006, .135));              // pommel
      add(B(.006, .014, .006, PAL.steel, 0, .006, .14));
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
  banana: -0.92
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
    // a flat disc reads as a spinning rotor at distance
    const blade = new THREE.Mesh(new THREE.BoxGeometry(.30, .010, .032), rotorMat);
    blade.position.set(a[0], .06, a[1]);
    g.add(blade);
    rotors.push(blade);
  }
  g.userData.rotors = rotors;
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
     call for any weapon: models without barrels simply do nothing. */
  applyBarrelSpin() {
    if (!this.vmInner) return;
    const barrels = this.vmInner.getObjectByName('barrels');
    if (barrels) barrels.rotation.z = this.spinPhase || 0;
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

    // minigun spin-up: the barrels must wind up before it can fire, and they
    // wind back down when the trigger is released
    if (def.spinUp) {
      const want = this.triggerDown && this.reloadT <= 0 && this.deployT <= 0 && this.weapon.mag > 0;
      const rate = want ? 1 / def.spinUp : 1 / (def.spinUp * 1.4);
      this.spinT = U.clamp(this.spinT + (want ? rate : -rate) * dt, 0, 1);
      if (!this.isLocal && this.spinT > .05 && !this._spinSnd) {
        Audio3D_SFX.minigunSpin(this.pos.x, this.pos.y + 1.2, this.pos.z);
        this._spinSnd = true;
      }
      if (this.spinT <= .05) this._spinSnd = false;
      // Visible spin: the barrel cluster turns steadily while winding up, then
      // very fast once it is up to speed. The rotation keeps its own phase so
      // stopping and restarting does not snap the barrels to a new angle.
      this.spinPhase = (this.spinPhase || 0) + (6 + this.spinT * this.spinT * 78) * this.spinT * dt;
      this.applyBarrelSpin();
    } else {
      this.spinT = 0;
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
