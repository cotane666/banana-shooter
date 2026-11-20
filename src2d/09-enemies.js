/* ============================================================
   09 — ВРАГИ: зомби всех типов из таблицы ZOMBIES, ИИ, мини-боссы и боссы
   ============================================================ */

const Enemies = {

  /** Создать зомби данного типа. mods — множители волны. */
  make(G, type, x, y, mods) {
    const d = ZOMBIES[type] || ZOMBIES.walker;
    const s = d.scale || 1;
    const m = mods || {};
    const hpMul = (m.hp || 1) * (G.diffHp || 1);
    const spMul = (m.speed || 1) * (G.diffSpeed || 1);
    const dmMul = (m.dmg || 1) * (G.diffDmg || 1);

    const z = {
      type, def: d, name: d.name,
      w: 14 * s, h: 34 * s,
      x, y: y - 34 * s,
      vx: 0, vy: 0, face: 1, onGround: false,
      hp: d.hp * hpMul, maxHp: d.hp * hpMul,
      speed: d.speed * CFG2.PPM * 0.55 * spMul,
      dmg: d.dmg * dmMul,
      score: d.score, money: d.money,
      anim: Math.random() * 10,
      atkCd: 0, shootCd: rnd(0.5, 2), abilityCd: (d.abilityCd || 6) * rnd(0.6, 1.0),
      hurtT: 0, dead: false, flying: !!d.flying, hover: d.hover || 0,
      armor: (d.armor || 0) + (m.armor || 0),
      slow: 0, burn: 0, burnT: 0,
      charge: 0, chargeCd: 0,
      jumpCd: 0, stuck: 0, elite: false,
      boss: !!d.boss, mini: !!d.miniBoss,
      scale: s,
    };
    if (G.wave >= 12 && !z.boss && Math.random() < 0.14) {
      z.elite = true; z.hp *= 2.2; z.maxHp = z.hp; z.speed *= 1.12; z.dmg *= 1.3;
      z.score = Math.round(z.score * 2); z.money = Math.round(z.money * 2);
      z.armor += 0.15;
    }
    if (d.miniBoss || d.boss) z.elite = false;
    return z;
  },

  /* -------------------------------------------------- ИИ -------------------------------------------------- */
  update(G, z, dt) {
    const p = G.player, L = G.L;
    if (z.hurtT > 0) z.hurtT -= dt;
    if (z.slow > 0) z.slow -= dt;
    if (z.burn > 0) {
      z.burn -= dt * 12;
      z.hp -= dt * 26;
      if (Math.random() < 0.25) FX.spawn(z.x + z.w / 2 + rnd(-5, 5), z.y + rnd(0, z.h), rnd(-20, 20), -rnd(30, 70), 0.35, '#ff9a2a', 2, -60);
      if (z.hp <= 0) return G.killEnemy(z, 'burn');
    }
    if (z.dead) return;

    const cx = z.x + z.w / 2, cy = z.y + z.h / 2;
    const px = p.x + p.w / 2, py = p.y + p.h / 2;
    const dx = px - cx, dy = py - cy;
    const distV = Math.hypot(dx, dy);
    const distH = Math.abs(dx);

    /* способности боссов */
    if (z.def.abilities && z.def.abilities.length) {
      z.abilityCd -= dt;
      if (z.abilityCd <= 0 && !p.dead && distV < 420) {
        z.abilityCd = (z.def.abilityCd || 6) * rnd(0.85, 1.2);
        this.ability(G, z, pick(z.def.abilities), dx, dy, distV);
      }
    }
    if (z.def.separation !== undefined) { /* зарезервировано */ }

    const spd = z.speed * (z.slow > 0 ? 0.45 : 1) * (z.charge > 0 ? 3.1 : 1);
    if (z.charge > 0) z.charge -= dt;

    if (z.flying) {
      /* летун: держит высоту над игроком и пикирует */
      const targetY = p.y - z.def.hover * CFG2.PPM * 0.5 + Math.sin(G2.time * 2 + z.anim) * 12;
      z.vy = approach(z.vy, clamp((targetY - z.y) * 3.2, -230, 230), 900 * dt);
      z.vx = approach(z.vx, sign(dx) * spd * 0.9, 620 * dt);
      z.x += z.vx * dt; z.y += z.vy * dt;
      z.anim += dt * 4;
    } else {
      /* наземный: идёт к игроку, прыгает через препятствия и наверх */
      const want = (distH > 5 ? sign(dx) : 0) * spd;
      z.vx = approach(z.vx, want, 900 * dt);
      z.vy = Math.min(z.vy + CFG2.GRAV * dt, CFG2.MAX_FALL);

      z.jumpCd -= dt;
      if (z.onGround && z.jumpCd <= 0) {
        const blocked = (want > 0 && this.solidAt(G, z.x + z.w + 3, z.y + z.h - 6)) ||
          (want < 0 && this.solidAt(G, z.x - 3, z.y + z.h - 6));
        const needUp = dy < -26 && distH < 90;
        const noFloor = !groundAhead(L, z.x + (want > 0 ? z.w : -8), z.y + z.h + 1, 10, 8);
        if (blocked || needUp || (noFloor && distH > 20)) {
          z.vy = -(CFG2.JUMP_V * (z.mini ? 0.86 : 0.95));
          z.jumpCd = rnd(0.35, 0.8);
          z.onGround = false;
        }
      }
      const res = moveBody(z, z.vx * dt, z.vy * dt, L, false);
      if (res.ground) { z.onGround = true; if (z.vy > 0) z.vy = 0; }
      if (res.hitX) { z.vy = -CFG2.JUMP_V * 0.8; z.jumpCd = 0.3; }
      if (res.hitY) z.vy = 0;
      z.anim += dt * (2.4 + Math.abs(z.vx) * 0.02);

      /* --- зомби прогрызает себе путь сквозь блоки --- */
      z.digCd = (z.digCd || 0) - dt;
      if (z.digCd <= 0 && !p.dead) {
        const bx = cx + z.face * (z.w * 0.5 + 5);
        const by = z.y + z.h * 0.5;
        const cxm = Math.floor(bx / DEST.cw), cym = Math.floor(by / DEST.ch);
        const m = DEST.mat(cxm, cym);
        if (m && MAT2[m] && !MAT2[m].hard) {
          const bp = (z.def.breakPower || 1) * (z.boss ? 2.4 : z.mini ? 1.6 : 1);
          const r = 5 + bp * 4.5;
          DEST.carve(bx, by, r, 1);
          const n = Math.round(3 + bp * 2);
          FX.burst(bx, by, n, '#9a8a70', 130, 2, 560);
          FX.debris(bx, by, 2, Math.round(DEST.cw));
          BULLETS.spawn({
            x: bx, y: by, vx: (bx - cx) * 8 + rnd(-40, 40), vy: rnd(-160, -60),
            life: 0.5, dmg: 0, owner: 'z', kind: 'debris', col: '#9a8a70', size: 2, grav: 700, trail: 0,
          });
          z.digCd = clamp(0.5 / bp, 0.12, 0.6);
          if (Math.random() < 0.5) Audio3D_SFX.hit(bx, 0, 0);
        }
      }
    }

    if (Math.abs(z.vx) > 4) z.face = z.vx > 0 ? 1 : -1;
    else if (distH > 4) z.face = dx > 0 ? 1 : -1;

    /* --- антизастревание: зомби не должен навсегда зависнуть за стеной --- */
    if (!z.flying && !z.boss) {
      const moved = Math.abs(cx - (z._lastX === undefined ? cx : z._lastX));
      z._lastX = cx;
      if (moved < 0.5 && Math.abs(dx) > 30) z.stuck += dt; else z.stuck = Math.max(0, z.stuck - dt * 2);
      if (z.stuck > 2.5 && z.stuck < 2.7) {
        /* прыжок в сторону игрока */
        z.vy = -CFG2.JUMP_V * 1.15;
        z.vx = sign(dx) * z.speed * 2.4;
        z.onGround = false;
      }
      if (z.stuck > 7) {
        /* не смог дойти — перебрасываем ближе к игроку */
        const nx = clamp(px + sign(dx) * -rnd(240, 380) + rnd(-40, 40), 30, L.w - 40);
        const ny = Game.findGround(nx);
        z.x = nx - z.w / 2; z.y = (ny > 0 ? ny : z.y) - z.h - 4;
        z.vx = 0; z.vy = 0; z.stuck = 0;
        FX.ring(nx, z.y + z.h / 2, 34, '#c24bff', 0.4);
      }
    }

    /* урон от опасных зон */
    const hz = pointHazard(L, cx, z.y + z.h - 2);
    if (hz) {
      if (hz.kind === 'acid' || hz.kind === 'lava') { z.hp -= dt * 60; if (z.hp <= 0) return G.killEnemy(z, 'hazard'); }
      else if (z.vy > -10 && z.onGround) { z.y = hz.y - z.h - 0.5; z.onGround = false; }
    }
    if (z.y > L.h + 160) { z.y = -80; }
    if (z.x < 0) z.x = 0; else if (z.x > L.w - z.w) z.x = L.w - z.w;

    /* атака вблизи */
    z.atkCd -= dt;
    const reach = (z.def.atkRange || 1.5) * CFG2.PPM;
    if (z.atkCd <= 0 && distH < reach + z.w && Math.abs(dy) < z.h * 0.9 + 14) {
      z.atkCd = z.mini ? 1.0 : 1.15;
      G.hurtPlayer(z.dmg, cx + sign(dx) * 10, cy);
      /* удар зомби крошит землю под ногами цели */
      if (!z.flying) {
        const bp = z.def.breakPower || 1;
        DEST.carve(cx + sign(dx) * 12, cy, 6 + bp * 4, 1);
        FX.debris(cx + sign(dx) * 12, cy, 2, DEST.cw);
      }
      FX.burst(cx + sign(dx) * 12, cy, 5, '#c01824', 120, 2, 400);
      Audio3D_SFX.hit(cx, 0, 0);
      if (z.def.explosive) { G.explode(cx, cy, (z.def.blastR || 6.5) * CFG2.PPM, z.def.blastDmg || 90, 'z'); return G.killEnemy(z, 'boom'); }
    }

    /* стрельба */
    if (z.def.shoot) {
      z.shootCd -= dt;
      if (z.shootCd <= 0 && distH < (z.def.shootRange || 20) * CFG2.PPM && distH > 24 && !p.dead) {
        z.shootCd = (z.def.shootCd || 2.4) * rnd(0.85, 1.2);
        this.shoot(G, z, cx, cy - z.h * 0.2, px, py);
      }
    }
    /* лекрь лечит союзников */
    if (z.def.heals) {
      z.healCd = (z.healCd || 0) - dt;
      if (z.healCd <= 0) {
        z.healCd = z.def.healCd || 3;
        for (const o of G.enemies) {
          if (o === z || o.dead) continue;
          if (Math.hypot(o.x - z.x, o.y - z.y) < (z.def.healRange || 9) * CFG2.PPM &&
            o.hp < o.maxHp) {
            o.hp = Math.min(o.maxHp, o.hp + (z.def.healAmount || 55));
            FX.num(o.x + o.w / 2, o.y - 6, z.def.healAmount || 55, '#6de06d');
          }
        }
      }
    }
    /* призыватель */
    if (z.def.summons) {
      z.sumCd = (z.sumCd || 0) - dt;
      if (z.sumCd <= 0) {
        z.sumCd = z.def.summonCd || 6.5;
        for (let i = 0; i < (z.def.summonCount || 4); i++) {
          G.spawnZombie(pick(['walker', 'crawler', 'runner']), cx + rnd(-90, 90), cy - 30);
        }
        FX.ring(cx, cy, 60, '#c24bff', 0.5);
      }
    }
  },

  solidAt(G, x, y) {
    return DEST.solidPx(x, y);
  },

  shoot(G, z, x, y, tx, ty) {
    const d = z.def;
    const sp = (d.shootSpeed || 24) * CFG2.PPM * 0.55;
    const dy = d.shootGrav ? d.shootGrav * CFG2.PPM : 0;
    let a = Math.atan2(ty - y, tx - x);
    if (d.shootGrav) a -= 0.16;   // компенсация гравитации
    const col = { spit: '#a8d84a', plasma: '#7fd8ff', frost: '#a8e8ff' }[d.shoot] || '#ff9a6a';
    const n = d.abilities && d.abilities.indexOf('barrage') >= 0 ? 3 : 1;
    for (let i = 0; i < n; i++) {
      const aa = a + (i - (n - 1) / 2) * 0.13;
      BULLETS.spawn({
        x, y, vx: Math.cos(aa) * sp, vy: Math.sin(aa) * sp, life: 4.2,
        dmg: (d.shootDmg || 15) * (G.diffDmg || 1), owner: 'z', kind: d.shoot,
        col, size: 3, grav: dy, trail: 6, hitR: 0,
      });
    }
    Audio3D_SFX.shot(d.shoot === 'plasma' ? 'laser' : 'pistol', x, 0, 0);
  },

  ability(G, z, kind, dx, dy, dist) {
    const cx = z.x + z.w / 2, cy = z.y + z.h / 2;
    const p = G.player;
    FX.label(cx, z.y - 12, kind === 'charge' ? 'РЫВОК!' : kind === 'shockwave' ? 'УДАР!' :
      kind === 'summon' ? 'ПРИЗЫВ!' : kind === 'barrage' ? 'ЗАЛП!' : kind === 'frost' ? 'МОРОЗ!' :
        kind === 'devour' ? 'ПОЖИРАНИЕ!' : 'МИНИ-БОССЫ!', z.def.aura ? hex(z.def.aura) : '#ff8a4a', 1.0);
    switch (kind) {
      case 'charge':
        z.charge = 0.55; Audio3D_SFX.growl(cx, 0, 0); break;
      case 'shockwave':
        G.explode(cx, cy, 110, z.dmg * 1.6, 'z', null, true);
        FX.ring(cx, cy, 130, '#ffb060', 0.5); Cam.add(0.5); break;
      case 'summon':
        for (let i = 0; i < 3; i++) G.spawnZombie(pick(['walker', 'crawler', 'runner']), cx + rnd(-70, 70), cy - 20);
        FX.ring(cx, cy, 70, '#c24bff', 0.5); break;
      case 'summonMinions':
        for (let i = 0; i < 2; i++) G.spawnZombie(pick(['stalker', 'spider', 'cryomancer']), cx + rnd(-120, 120), cy - 30);
        FX.ring(cx, cy, 140, '#9a3aff', 0.7); Cam.add(0.7); break;
      case 'barrage':
        for (let i = 0; i < 5; i++) {
          const a = Math.atan2(dy, dx) + (i - 2) * 0.18;
          BULLETS.spawn({
            x: cx, y: cy - z.h * 0.2, vx: Math.cos(a) * 330, vy: Math.sin(a) * 330,
            life: 3.0, dmg: z.dmg * 0.5, owner: 'z', kind: 'bolt',
            col: '#ff7a4a', size: 3, grav: 40, trail: 7, hitR: 0,
          });
        }
        break;
      case 'frost':
        for (let i = 0; i < 3; i++) {
          const a = Math.atan2(dy, dx) + (i - 1) * 0.14;
          BULLETS.spawn({
            x: cx, y: cy - z.h * 0.2, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300,
            life: 3.0, dmg: z.dmg * 0.4, owner: 'z', kind: 'frost', col: '#a8e8ff',
            size: 3, grav: 0, trail: 8, hitR: 0, frost: true,
          });
        }
        break;
      case 'devour':
        z.hp = Math.min(z.maxHp, z.hp + z.maxHp * 0.08);
        FX.num(cx, z.y - 8, z.maxHp * 0.08, '#6de06d');
        FX.ring(cx, cy, 80, '#ff2a3a', 0.5); break;
    }
  },

  /* -------------------------------------------------- отрисовка -------------------------------------------------- */
  draw(G, ctx, z) {
    if (z.flying) {
      ctx.save();
      ctx.globalAlpha = 0.25;
      circle(ctx, z.x + z.w / 2, z.y + z.h + 6, 7, '#000');
      ctx.restore();
    } else {
      ctx.save();
      ctx.globalAlpha = 0.28;
      rect(ctx, z.x + 1, z.y + z.h - 2, z.w - 2, 3, '#000');
      ctx.restore();
    }
    if (z.hurtT > 0) { ctx.save(); ctx.globalAlpha = 0.85; }
    drawZombie(ctx, z);
    if (z.hurtT > 0) ctx.restore();

    /* горящий */
    if (z.burn > 0) {
      for (let i = 0; i < 3; i++)
        FX.spawn(z.x + rnd(0, z.w), z.y + rnd(0, z.h), rnd(-15, 15), -rnd(20, 60), 0.25, pick(['#ff9a2a', '#ffd24a']), 2, -40);
    }
  },

  /** Полоска ХП (только для раненых, мини-боссов и боссов). */
  drawBar(ctx, z) {
    if (z.hp >= z.maxHp && !z.mini && !z.boss) return;
    const w = z.boss ? 62 : z.mini ? 44 : 20;
    const x = z.x + z.w / 2 - w / 2, y = z.y - (z.mini || z.boss ? 12 : 7);
    const col = z.boss ? '#ff3a5a' : z.mini ? '#ff9a2a' : '#6de06d';
    drawHpBar(ctx, x, y, w, z.hp, z.maxHp, col);
    if (z.armor > 0.05) {
      rect(ctx, x, y + 4, w, 2, 'rgba(120,170,255,.65)');
    }
  },
};
