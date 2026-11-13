// ============================================================================
// CRÔNICAS DO ABISMO 8-BIT — Combate, Parry, Química Elemental, IA & Chefes
// ============================================================================

window.Game8Bit = window.Game8Bit || {};

(function (G) {
  'use strict';

  const P = G.PAL;
  const D = G.Dungeon;
  const TILE = D.TILE;
  const TS = D.TILE_SIZE;
  const U = G.Utils;

  const Combat = {
    spawnEnemiesForRoom(game, room) {
      if (room.spawnedInstances) return;
      room.spawnedInstances = true;
      room.activeEnemies = [];

      for (const spec of room.enemies) {
        if (spec.isBoss) {
          const tpl = G.GameData.BOSSES[spec.tplId];
          if (!tpl) continue;
          const mult = game.difficulty.enemyHpMult * (1 + Math.floor((room.floorNum - 1) / 4) * 0.65);
          const dmgMult = game.difficulty.enemyDmgMult * (1 + Math.floor((room.floorNum - 1) / 4) * 0.4);
          room.activeEnemies.push({
            id: 'boss_' + Math.random().toString(36).slice(2, 8),
            isBoss: true,
            tplId: tpl.id,
            name: tpl.name,
            title: tpl.title,
            sprite: tpl.sprite,
            x: spec.tx * TS + TS / 2,
            y: spec.ty * TS + TS / 2,
            w: 22,
            h: 22,
            hp: Math.round(tpl.hp * mult),
            maxHp: Math.round(tpl.hp * mult),
            atk: Math.round(tpl.atk * dmgMult),
            speed: tpl.speed,
            element: tpl.element,
            weak: tpl.weak,
            xp: tpl.xp,
            goldRange: tpl.gold,
            phase: 1,
            state: 'chase',
            timer: 0.9,
            patternIdx: 0,
            vx: 0,
            vy: 0,
            facingX: 0,
            facingY: 1,
            hitFlash: 0,
            statuses: {},
            telegraph: null
          });
        } else {
          const tpl = G.GameData.ENEMIES[spec.tplId];
          if (!tpl) continue;
          const hp = Math.round(tpl.hp * (spec.hpScale || 1));
          room.activeEnemies.push({
            id: 'en_' + Math.random().toString(36).slice(2, 8),
            isBoss: false,
            elite: !!spec.elite,
            dropsBossKey: !!spec.dropsBossKey,
            tplId: tpl.id,
            name: (spec.elite ? 'Elite ' : '') + tpl.name,
            sprite: tpl.sprite,
            x: spec.tx * TS + TS / 2,
            y: spec.ty * TS + TS / 2,
            w: 12,
            h: 12,
            hp,
            maxHp: hp,
            atk: Math.round(tpl.atk * (spec.dmgScale || 1)),
            speed: tpl.speed * (spec.elite ? 1.12 : 1.0),
            range: tpl.range,
            windup: tpl.windup,
            cooldown: tpl.cooldown,
            ai: tpl.ai,
            element: tpl.element,
            weak: tpl.weak,
            resist: tpl.resist,
            flying: !!tpl.flying,
            xp: Math.round(tpl.xp * (spec.elite ? 1.8 : 1)),
            goldRange: tpl.gold,
            state: 'chase',
            stateTimer: 0.4 + Math.random() * 0.4,
            cdTimer: 0.5,
            vx: 0,
            vy: 0,
            facingX: 0,
            facingY: 1,
            hitFlash: 0,
            summonCount: 0,
            mini: !!spec.mini,
            statuses: {}
          });
        }
      }
    },

    // ========================================================================
    // AÇÕES DO JOGADOR
    // ========================================================================
    triggerAttack(game) {
      const p = game.player;
      if (p.attackCd > 0 || p.dashTimer > 0) return;

      const weapon = p.equip.weapon;
      const speed = weapon ? weapon.speed : 1.0;
      p.attackCd = 0.34 / speed;
      p.blocking = false;

      const angle = p.aimAngle;
      const elem = weapon ? weapon.element : 'physical';
      const isCritRoll = p.guaranteedCrit || Math.random() < p.getCritChance();
      if (p.guaranteedCrit) p.guaranteedCrit = false;

      if (weapon && weapon.ranged) {
        // Disparo à distância (Cajado / Arco)
        if (weapon.kind === 'staff' && p.mp >= 3) {
          p.mp -= 3;
          G.AudioEngine.playSFX('magic');
        } else {
          G.AudioEngine.playSFX('bow');
        }
        const baseDmg = weapon.kind === 'staff' ? p.getMag() : p.getAtk();
        const dmg = Math.round(baseDmg * (isCritRoll ? p.getCritMult() : 1.0));
        const projSpeed = weapon.kind === 'bow' ? 210 : 165;

        game.projectiles.push({
          fromPlayer: true,
          x: p.x + Math.cos(angle) * 10,
          y: p.y + Math.sin(angle) * 10,
          vx: Math.cos(angle) * projSpeed,
          vy: Math.sin(angle) * projSpeed,
          dmg,
          element: elem,
          isCrit: isCritRoll,
          radius: 4,
          life: 1.2,
          color: G.ELEMENT_META[elem].color
        });
        p.attackAnim = 0.16;
      } else {
        // Corte corpo-a-corpo em arco
        G.AudioEngine.playSFX('slash');
        const reach = (weapon ? weapon.range : 24) + 4;
        const arc = weapon ? weapon.arc : 1.9;
        p.attackAnim = 0.18;
        p.slashEffect = {
          angle,
          arc,
          reach,
          timer: 0.16,
          maxTimer: 0.16,
          color: G.ELEMENT_META[elem].color
        };

        // Ativa química elemental nos tiles à frente
        const hitTx = Math.floor((p.x + Math.cos(angle) * (reach * 0.7)) / TS);
        const hitTy = Math.floor((p.y + Math.sin(angle) * (reach * 0.7)) / TS);
        this.applyElementToTile(game, game.currentRoom, hitTx, hitTy, elem);

        // Acertar barris no arco
        this._hitBarrelsInArc(game, p.x, p.y, reach, angle, arc, elem);

        // Acertar inimigos no arco
        const room = game.currentRoom;
        const enemies = room.activeEnemies || [];
        for (const en of enemies) {
          if (en.hp <= 0) continue;
          const d = U.dist(p.x, p.y, en.x, en.y);
          if (d > reach + en.w * 0.6) continue;
          const angTo = Math.atan2(en.y - p.y, en.x - p.x);
          const diff = Math.abs(Math.atan2(Math.sin(angTo - angle), Math.cos(angTo - angle)));
          if (diff <= arc * 0.55 || d < 14) {
            let dmg = p.getAtk();
            let crit = isCritRoll;
            // Bônus de costas para Assassino
            if (p.classId === 'assassin') {
              const dot = Math.cos(angle) * en.facingX + Math.sin(angle) * en.facingY;
              if (dot > 0.35) {
                dmg = Math.round(dmg * 1.45);
                crit = true;
              }
            }
            if (crit) dmg = Math.round(dmg * p.getCritMult());
            const kx = Math.cos(angTo) * 95;
            const ky = Math.sin(angTo) * 95;
            this.damageEnemy(game, en, dmg, elem, kx, ky, crit, angle);

            if (p.perks.emberHit && Math.random() < 0.35) {
              this.applyStatus(en, 'burn', 3.0, 4);
            }
          }
        }
      }
    },

    triggerDash(game) {
      const p = game.player;
      if (p.dashCd > 0 || p.dashTimer > 0 || p.stamina < 22) return;
      p.stamina -= 22;
      p.dashTimer = 0.22;
      p.dashCd = 0.55;
      p.iFrames = Math.max(p.iFrames, 0.26);
      p.blocking = false;

      let dx = p.moveX;
      let dy = p.moveY;
      if (dx === 0 && dy === 0) {
        dx = Math.cos(p.aimAngle);
        dy = Math.sin(p.aimAngle);
      }
      const len = Math.hypot(dx, dy) || 1;
      p.dashVx = (dx / len) * 215;
      p.dashVy = (dy / len) * 215;
      G.AudioEngine.playSFX('dash');

      if (p.perks.shockDash) {
        this._aoeShock(game, p.x, p.y, 44, Math.round(p.getMag() * 1.2 + 8));
      }
    },

    triggerBlockStart(game) {
      const p = game.player;
      if (p.dashTimer > 0) return;
      if (!p.blocking) {
        p.blocking = true;
        const relicBonus = (p.equip.relic1?.parryWindow || 0) + (p.equip.relic2?.parryWindow || 0);
        p.parryTimer = 0.24 + (p.classDef.parryBonus || 0) + relicBonus;
      }
    },

    triggerBlockEnd(game) {
      game.player.blocking = false;
      game.player.parryTimer = 0;
    },

    triggerSkill(game) {
      const p = game.player;
      const sk = p.classDef.skill;
      if (p.skillCd > 0) {
        game.addFloatingText(p.x, p.y - 12, 'RECARGA!', P.gray);
        return;
      }
      if (p.mp < sk.cost) {
        game.addFloatingText(p.x, p.y - 12, 'SEM MANA!', P.sky);
        G.AudioEngine.playSFX('locked');
        return;
      }
      p.mp -= sk.cost;
      p.skillCd = sk.cooldown * Math.max(0.5, 1 - p.perks.cdr);

      if (p.classId === 'knight') {
        // Investida Sísmica
        const ang = p.aimAngle;
        p.dashTimer = 0.20;
        p.iFrames = 0.28;
        p.dashVx = Math.cos(ang) * 220;
        p.dashVy = Math.sin(ang) * 220;
        G.AudioEngine.playSFX('explosion');
        game.shake = 5;

        const slamX = p.x + Math.cos(ang) * 22;
        const slamY = p.y + Math.sin(ang) * 22;
        game.spawnParticles(slamX, slamY, P.gold, 18, 85);
        const dmg = Math.round(p.getAtk() * 2.1);
        for (const en of (game.currentRoom.activeEnemies || [])) {
          if (en.hp <= 0) continue;
          if (U.dist(slamX, slamY, en.x, en.y) <= 50) {
            this.damageEnemy(game, en, dmg, 'physical', Math.cos(ang) * 140, Math.sin(ang) * 140, true);
            this.applyStatus(en, 'stun', 1.4, 0);
          }
        }
        game.addFloatingText(p.x, p.y - 14, 'IMPACTO!', P.gold);
      } else if (p.classId === 'mage') {
        // Nova Elemental (8 orbes)
        const elem = p.equip.weapon ? p.equip.weapon.element : 'arcane';
        const dmg = Math.round(p.getMag() * 1.45 + 6);
        G.AudioEngine.playSFX('magic');
        for (let i = 0; i < 8; i++) {
          const a = (Math.PI * 2 * i) / 8 + p.aimAngle;
          game.projectiles.push({
            fromPlayer: true,
            x: p.x,
            y: p.y,
            vx: Math.cos(a) * 155,
            vy: Math.sin(a) * 155,
            dmg,
            element: elem,
            isCrit: false,
            radius: 4,
            life: 1.1,
            color: G.ELEMENT_META[elem].color
          });
        }
        game.addFloatingText(p.x, p.y - 14, 'NOVA!', G.ELEMENT_META[elem].color);
      } else if (p.classId === 'assassin') {
        // Passo Sombrio
        const oldX = p.x;
        const oldY = p.y;
        const ang = p.aimAngle;
        for (let step = 56; step >= 16; step -= 8) {
          const nx = p.x + Math.cos(ang) * step;
          const ny = p.y + Math.sin(ang) * step;
          if (!game.isPointBlocked(nx, ny, 5)) {
            p.x = nx;
            p.y = ny;
            break;
          }
        }
        p.iFrames = 0.38;
        p.guaranteedCrit = true;
        G.AudioEngine.playSFX('dash');
        game.spawnParticles(oldX, oldY, P.acid, 16, 65);
        game.spawnParticles(p.x, p.y, P.purple, 14, 55);
        // Nuvem tóxica na origem
        game.hazards.push({
          type: 'poison_cloud',
          x: oldX,
          y: oldY,
          radius: 30,
          life: 4.5,
          tickTimer: 0.1
        });
        game.addFloatingText(p.x, p.y - 14, 'CRÍTICO PRONTO!', P.acid);
      }
    },

    placeBomb(game) {
      const p = game.player;
      if (p.bombs <= 0) {
        game.addFloatingText(p.x, p.y - 10, 'SEM BOMBAS!', P.gray);
        return;
      }
      p.bombs -= 1;
      G.AudioEngine.playSFX('uiConfirm');
      game.bombs.push({
        x: p.x,
        y: p.y,
        timer: 1.55,
        radius: 44
      });
    },

    explodeAt(game, x, y, radius, baseDmg, fromPlayer = true) {
      G.AudioEngine.playSFX('explosion');
      game.shake = 7;
      game.spawnParticles(x, y, P.orange, 24, 110);
      game.spawnParticles(x, y, P.yellow, 14, 75);

      const room = game.currentRoom;
      const minTx = Math.max(0, Math.floor((x - radius) / TS));
      const maxTx = Math.min(D.ROOM_W - 1, Math.floor((x + radius) / TS));
      const minTy = Math.max(0, Math.floor((y - radius) / TS));
      const maxTy = Math.min(D.ROOM_H - 1, Math.floor((y + radius) / TS));

      for (let ty = minTy; ty <= maxTy; ty++) {
        for (let tx = minTx; tx <= maxTx; tx++) {
          const cx = tx * TS + TS / 2;
          const cy = ty * TS + TS / 2;
          if (U.dist(x, y, cx, cy) > radius + 6) continue;

          const t = D.getTile(room, tx, ty);
          if (t === TILE.CRACKED_WALL) {
            D.setTile(room, tx, ty, TILE.DOOR_SECRET);
            game.addFloatingText(cx, cy - 8, 'PASSAGEM SECRETA!', P.gold);
            G.AudioEngine.playSFX('doorOpen');
            // Abre ambos os tiles da porta secreta e na sala secreta conectada
            for (const dk of Object.keys(room.neighbors)) {
              const nb = room.neighbors[dk];
              if (nb.lock === 'secret') {
                for (const dc of D.getDoorCoords(dk)) D.setTile(room, dc.x, dc.y, TILE.DOOR_SECRET);
                const secRoom = game.dungeon.rooms[nb.roomId];
                if (secRoom) {
                  secRoom.revealed = true;
                  const oppCoords = D.getDoorCoords(D.DIRS[dk].opp);
                  for (const oc of oppCoords) D.setTile(secRoom, oc.x, oc.y, TILE.DOOR_SECRET);
                }
              }
            }
          } else if (t === TILE.BARREL) {
            D.setTile(room, tx, ty, TILE.FLOOR);
            game.spawnParticles(cx, cy, P.brown, 8, 50);
          } else if (t === TILE.BARREL_EXP) {
            D.setTile(room, tx, ty, TILE.FLOOR);
            // Reação em cadeia controlada
            setTimeout(() => {
              if (game.currentRoom === room && game.state === 'playing') {
                this.explodeAt(game, cx, cy, 44, 38, true);
              }
            }, 90);
          } else {
            this.applyElementToTile(game, room, tx, ty, 'fire');
          }
        }
      }

      const dmgMult = fromPlayer ? (1 + game.player.perks.bombMult) : 1;
      const dmg = Math.round(baseDmg * dmgMult);
      for (const en of (room.activeEnemies || [])) {
        if (en.hp <= 0) continue;
        const d = U.dist(x, y, en.x, en.y);
        if (d <= radius + 8) {
          const ang = Math.atan2(en.y - y, en.x - x);
          this.damageEnemy(game, en, dmg, 'fire', Math.cos(ang) * 140, Math.sin(ang) * 140, true);
        }
      }

      // Dano moderado no jogador se ficar em cima da explosão
      const dp = U.dist(x, y, game.player.x, game.player.y);
      if (dp <= radius - 6) {
        this.damagePlayer(game, Math.round(dmg * 0.38), 'fire', x, y, false);
      }
    },

    _hitBarrelsInArc(game, px, py, reach, angle, arc, elem) {
      const room = game.currentRoom;
      const minTx = Math.max(1, Math.floor((px - reach) / TS));
      const maxTx = Math.min(D.ROOM_W - 2, Math.floor((px + reach) / TS));
      const minTy = Math.max(1, Math.floor((py - reach) / TS));
      const maxTy = Math.min(D.ROOM_H - 2, Math.floor((py + reach) / TS));

      for (let ty = minTy; ty <= maxTy; ty++) {
        for (let tx = minTx; tx <= maxTx; tx++) {
          const t = D.getTile(room, tx, ty);
          if (t !== TILE.BARREL && t !== TILE.BARREL_EXP) continue;
          const cx = tx * TS + TS / 2;
          const cy = ty * TS + TS / 2;
          if (U.dist(px, py, cx, cy) > reach + 6) continue;
          const ang = Math.atan2(cy - py, cx - px);
          const diff = Math.abs(Math.atan2(Math.sin(ang - angle), Math.cos(ang - angle)));
          if (diff <= arc * 0.6) {
            this._breakBarrel(game, room, tx, ty, elem);
          }
        }
      }
    },

    _breakBarrel(game, room, tx, ty, elem) {
      const t = D.getTile(room, tx, ty);
      const cx = tx * TS + TS / 2;
      const cy = ty * TS + TS / 2;
      if (t === TILE.BARREL) {
        D.setTile(room, tx, ty, TILE.FLOOR);
        G.AudioEngine.playSFX('hit');
        game.spawnParticles(cx, cy, P.ochre, 10, 55);
        if (Math.random() < 0.45) {
          game.spawnDrop(cx, cy, Math.random() < 0.65 ? 'gold' : 'hp_orb');
        }
      } else if (t === TILE.BARREL_EXP) {
        D.setTile(room, tx, ty, TILE.FLOOR);
        this.explodeAt(game, cx, cy, 46, 40, true);
      }
    },

    // ========================================================================
    // QUÍMICA ELEMENTAL DE TILES
    // ========================================================================
    applyElementToTile(game, room, tx, ty, element) {
      if (!element || element === 'physical') return;
      const t = D.getTile(room, tx, ty);

      if (t === TILE.OIL && element === 'fire') {
        // Ignitar poça inteira de óleo conectada
        this._floodTile(room, tx, ty, TILE.OIL, 30, (fx, fy) => {
          D.setTile(room, fx, fy, TILE.FLOOR);
          game.hazards.push({
            type: 'fire',
            x: fx * TS + TS / 2,
            y: fy * TS + TS / 2,
            radius: 10,
            life: 6.5,
            tickTimer: 0.1
          });
        });
        G.AudioEngine.playSFX('burn');
        game.addFloatingText(tx * TS + 8, ty * TS, 'ÓLEO INCENDIADO!', P.orange);
      } else if (t === TILE.WATER && element === 'lightning') {
        // Eletrificar toda água conectada
        const shocked = [];
        this._floodTile(room, tx, ty, TILE.WATER, 40, (fx, fy) => {
          shocked.push({ x: fx * TS + TS / 2, y: fy * TS + TS / 2 });
          game.spawnParticles(fx * TS + 8, fy * TS + 8, P.yellow, 4, 45);
        });
        G.AudioEngine.playSFX('shock');
        for (const pt of shocked) {
          for (const en of (room.activeEnemies || [])) {
            if (en.hp > 0 && !en.flying && U.dist(pt.x, pt.y, en.x, en.y) <= 13) {
              this.damageEnemy(game, en, 14 + Math.round(game.player.getMag() * 0.6), 'lightning', 0, 0, false);
              this.applyStatus(en, 'stun', 1.1, 0);
            }
          }
        }
        game.addFloatingText(tx * TS + 8, ty * TS, 'ÁGUA ELETRIFICADA!', P.yellow);
      } else if (t === TILE.WATER && element === 'ice') {
        this._floodTile(room, tx, ty, TILE.WATER, 16, (fx, fy) => {
          D.setTile(room, fx, fy, TILE.ICE);
          game.spawnParticles(fx * TS + 8, fy * TS + 8, P.ice, 3, 35);
        });
        G.AudioEngine.playSFX('freeze');
        game.addFloatingText(tx * TS + 8, ty * TS, 'CONGELADO!', P.cyan);
      } else if (t === TILE.ICE && element === 'fire') {
        D.setTile(room, tx, ty, TILE.WATER);
        game.spawnParticles(tx * TS + 8, ty * TS + 8, P.white, 6, 40);
      }

      // Nuvem venenosa + Fogo = Explosão Tóxica!
      if (element === 'fire') {
        const cx = tx * TS + TS / 2;
        const cy = ty * TS + TS / 2;
        for (let i = game.hazards.length - 1; i >= 0; i--) {
          const h = game.hazards[i];
          if (h.type === 'poison_cloud' && U.dist(cx, cy, h.x, h.y) <= h.radius + 10) {
            game.hazards.splice(i, 1);
            this.explodeAt(game, h.x, h.y, 38, 28, true);
          }
        }
      }
    },

    _floodTile(room, startX, startY, targetTile, limit, cb) {
      const q = [[startX, startY]];
      const seen = new Set([`${startX},${startY}`]);
      let count = 0;
      while (q.length > 0 && count < limit) {
        const [cx, cy] = q.shift();
        if (D.getTile(room, cx, cy) !== targetTile) continue;
        cb(cx, cy);
        count++;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx;
          const ny = cy + dy;
          const k = `${nx},${ny}`;
          if (!seen.has(k) && D.getTile(room, nx, ny) === targetTile) {
            seen.add(k);
            q.push([nx, ny]);
          }
        }
      }
    },

    _aoeShock(game, x, y, radius, dmg) {
      G.AudioEngine.playSFX('shock');
      game.spawnParticles(x, y, P.yellow, 14, 75);
      for (const en of (game.currentRoom.activeEnemies || [])) {
        if (en.hp > 0 && U.dist(x, y, en.x, en.y) <= radius) {
          this.damageEnemy(game, en, dmg, 'lightning', 0, 0, false);
          this.applyStatus(en, 'stun', 0.9, 0);
        }
      }
    },

    // ========================================================================
    // DANO & STATUS
    // ========================================================================
    applyStatus(target, type, duration, power) {
      if (!target || target.hp <= 0) return;
      target.statuses[type] = { timer: duration, power: power || 3, tick: 0.45 };
    },

    damageEnemy(game, en, rawAmount, element = 'physical', kx = 0, ky = 0, isCrit = false, hitAngle = null) {
      if (!en || en.hp <= 0) return;

      // Escudo frontal de Guardião de Escudo
      if (en.ai === 'shield' && element === 'physical' && hitAngle !== null && !en.statuses.stun && !en.statuses.freeze) {
        const dot = Math.cos(hitAngle) * en.facingX + Math.sin(hitAngle) * en.facingY;
        if (dot < -0.25) {
          // Ataque frontal bloqueado!
          rawAmount = Math.max(1, Math.round(rawAmount * 0.25));
          G.AudioEngine.playSFX('parry');
          game.addFloatingText(en.x, en.y - 10, 'ESCUDO!', P.lightGray);
        }
      }

      let mult = 1.0;
      let tag = '';
      if (en.weak === element) {
        mult *= 1.45;
        tag = '!';
      } else if (en.resist === element) {
        mult *= 0.6;
      }
      if (en.statuses.freeze && element === 'physical') {
        mult *= 1.5; // Quebrar gelo causa dano extra!
        delete en.statuses.freeze;
        tag = ' ESTILHAÇO!';
      }

      const dmg = Math.max(1, Math.round(rawAmount * mult));
      en.hp -= dmg;
      en.hitFlash = 0.12;

      if (!en.isBoss) {
        en.vx += kx;
        en.vy += ky;
      }

      // Efeitos elementais secundários
      if (element === 'fire') this.applyStatus(en, 'burn', 3.0, 4);
      else if (element === 'ice') this.applyStatus(en, 'freeze', en.isBoss ? 1.0 : 2.2, 0);
      else if (element === 'poison') this.applyStatus(en, 'poison', 4.0, game.player.perks.venomBurst ? 6 : 3);
      else if (element === 'lightning' && Math.random() < 0.35) this.applyStatus(en, 'stun', 0.65, 0);

      // Roubo de vida do jogador
      const lifesteal = game.player.getLifesteal();
      if (lifesteal > 0) {
        const heal = Math.max(1, Math.round(dmg * lifesteal));
        game.player.hp = Math.min(game.player.getMaxHp(), game.player.hp + heal);
      }

      // Feedback audiovisual
      G.AudioEngine.playSFX(isCrit ? 'crit' : 'hit');
      if (isCrit) game.hitStop = 0.035;
      const col = isCrit ? P.yellow : (G.ELEMENT_META[element]?.color || P.white);
      game.addFloatingText(en.x, en.y - 10, `-${dmg}${isCrit ? '!' : ''}${tag}`, col);
      game.spawnParticles(en.x, en.y, col, isCrit ? 10 : 5, 65);

      // Espectro teletransporta ao apanhar
      if (en.ai === 'stalker' && en.hp > 0 && Math.random() < 0.45) {
        this._teleportEnemy(game, en);
      }

      if (en.hp <= 0) {
        this._onEnemyKilled(game, en);
      }
    },

    _onEnemyKilled(game, en) {
      const room = game.currentRoom;
      game.recordCodexEnemy(en.tplId);
      game.stats.kills += 1;

      // Explodir em veneno se perk ativo
      if (en.statuses.poison && game.player.perks.venomBurst) {
        game.hazards.push({ type: 'poison_cloud', x: en.x, y: en.y, radius: 28, life: 3.5, tickTimer: 0.1 });
      }

      // Slime se divide em 2 mini-slimes se não estava congelado
      if (en.ai === 'slime' && !en.mini && !en.statuses.freeze) {
        for (const ox of [-10, 10]) {
          const tpl = G.GameData.ENEMIES.slime;
          room.activeEnemies.push({
            id: 'en_mini_' + Math.random().toString(36).slice(2, 7),
            isBoss: false,
            mini: true,
            tplId: 'slime',
            name: 'Mini Slime',
            sprite: 'enemy_slime',
            x: U.clamp(en.x + ox, 24, D.ROOM_W * TS - 24),
            y: en.y,
            w: 10,
            h: 10,
            hp: Math.round(tpl.hp * 0.42),
            maxHp: Math.round(tpl.hp * 0.42),
            atk: Math.round(tpl.atk * 0.7),
            speed: tpl.speed * 1.25,
            range: 14,
            windup: 0.4,
            cooldown: 1.1,
            ai: 'melee',
            element: 'poison',
            weak: 'ice',
            resist: 'poison',
            xp: 6,
            goldRange: [1, 4],
            state: 'chase',
            stateTimer: 0.4,
            cdTimer: 0.4,
            vx: ox * 5,
            vy: -20,
            facingX: 0,
            facingY: 1,
            hitFlash: 0,
            statuses: {}
          });
        }
      }

      // XP & Ouro & Drops
      game.gainXp(en.xp);
      const gold = Math.round(U.lerp(en.goldRange[0], en.goldRange[1], Math.random()) * (1 + game.player.perks.goldMult));
      if (gold > 0) game.spawnDrop(en.x - 4, en.y, 'gold', gold);

      if (en.dropsBossKey) {
        game.spawnDrop(en.x + 6, en.y, 'boss_key');
        game.addFloatingText(en.x, en.y - 16, 'CHAVE DO CHEFE!', P.gold);
      } else if (en.elite || Math.random() < 0.28) {
        const dropRoll = Math.random();
        if (dropRoll < 0.35) game.spawnDrop(en.x, en.y, 'hp_orb');
        else if (dropRoll < 0.55) game.spawnDrop(en.x, en.y, 'shard');
        else if (dropRoll < 0.75) game.spawnDrop(en.x, en.y, 'bomb');
        else if (dropRoll < 0.90) game.spawnDrop(en.x, en.y, 'key');
        else game.spawnDrop(en.x, en.y, 'loot');
      }

      if (en.isBoss) {
        room.bossDefeated = true;
        room.cleared = true;
        game.stats.bosses += 1;
        game.player.soulsEarned += Math.round((10 + room.floorNum * 6) * game.difficulty.soulMult);
        G.AudioEngine.playSFX('explosion');
        game.shake = 10;
        game.spawnParticles(en.x, en.y, P.gold, 34, 120);

        // Drop garantido de baú/recompensa do Chefe + Escada para o próximo andar
        const rar = room.floorNum >= 3 ? 'lendario' : 'epico';
        const bossItem = G.GameData.generateProceduralLoot(game.rng, room.floorNum + 1, null, rar);
        game.spawnDrop(en.x, en.y + 10, 'item', bossItem);
        game.spawnDrop(en.x - 14, en.y, 'shard');
        game.spawnDrop(en.x + 14, en.y, 'shard');

        // Spawn Escada no centro norte da sala do chefe
        D.setTile(room, 12, 4, TILE.STAIRS_DOWN);
        game.addFloatingText(12 * TS, 4 * TS - 6, 'ESCADA ABERTA!', P.cyan);

        // Voltar música do bioma após derrotar chefe
        G.AudioEngine.playMusic(room.biome.music);
      }
    },

    damagePlayer(game, rawAmount, element = 'physical', srcX = 0, srcY = 0, canBlock = true) {
      const p = game.player;
      if (p.iFrames > 0 || game.state !== 'playing') return false;

      // Parry Perfeito contra golpe corpo-a-corpo
      if (canBlock && p.blocking && p.parryTimer > 0) {
        G.AudioEngine.playSFX('parry');
        game.hitStop = 0.05;
        game.shake = 4;
        p.stamina = Math.min(p.getMaxStamina(), p.stamina + 20);
        p.mp = Math.min(p.getMaxMp(), p.mp + 6);
        game.addFloatingText(p.x, p.y - 14, 'PARRY!', P.cyan);
        game.spawnParticles(p.x, p.y, P.cyan, 12, 80);

        // Atordoa/congela inimigos próximos
        for (const en of (game.currentRoom.activeEnemies || [])) {
          if (en.hp > 0 && U.dist(p.x, p.y, en.x, en.y) <= 40) {
            this.applyStatus(en, p.perks.frostParry ? 'freeze' : 'stun', p.perks.frostParry ? 2.5 : 1.6, 0);
          }
        }
        return false;
      }

      let dmg = rawAmount;
      if (canBlock && p.blocking) {
        const blockRed = p.perks.flatDef >= 4 ? 0.88 : 0.72;
        dmg = Math.max(1, Math.round(dmg * (1 - blockRed)));
        p.stamina = Math.max(0, p.stamina - 10);
        G.AudioEngine.playSFX('hit');
      } else {
        // Subtrai Defesa
        const def = p.getDef();
        dmg = Math.max(1, Math.round(dmg - def * 0.65));
        if (p.equip.armor?.resist === element) dmg = Math.max(1, Math.round(dmg * 0.55));
        if (element === 'fire' && p.perks.immuneFire) dmg = 0;
      }

      if (dmg <= 0) return false;

      p.hp -= dmg;
      p.iFrames = 0.65;
      game.shake = 5;
      G.AudioEngine.playSFX('playerHurt');
      game.addFloatingText(p.x, p.y - 12, `-${dmg}`, P.red);
      game.spawnParticles(p.x, p.y, P.red, 10, 70);

      // Knockback
      const ang = Math.atan2(p.y - srcY, p.x - srcX);
      p.knockVx = Math.cos(ang) * 110;
      p.knockVy = Math.sin(ang) * 110;

      if (element === 'poison') this.applyStatus(p, 'poison', 3.5, 2);
      else if (element === 'fire' && !p.perks.immuneFire) this.applyStatus(p, 'burn', 2.5, 3);

      // Centelha da Fênix salva de golpe fatal
      if (p.hp <= 0 && p.perks.reviveFloor && !p.revivedThisFloor) {
        p.revivedThisFloor = true;
        p.hp = Math.round(p.getMaxHp() * 0.42);
        p.iFrames = 1.6;
        this.explodeAt(game, p.x, p.y, 52, 45, true);
        game.addFloatingText(p.x, p.y - 18, 'RENASCER DA FÊNIX!', P.gold);
        return true;
      }

      if (p.hp <= 0) {
        p.hp = 0;
        game.triggerGameOver();
      }
      return true;
    },

    // ========================================================================
    // ATUALIZAÇÃO DE INIMIGOS, CHEFES, PROJÉTEIS & HAZARDS
    // ========================================================================
    updateEnemies(game, dt) {
      const room = game.currentRoom;
      const enemies = room.activeEnemies;
      if (!enemies) return;
      const p = game.player;

      for (let i = enemies.length - 1; i >= 0; i--) {
        const en = enemies[i];
        if (en.hp <= 0) {
          enemies.splice(i, 1);
          continue;
        }
        if (en.hitFlash > 0) en.hitFlash -= dt;

        // Status ticks
        this._tickStatuses(game, en, dt);
        if (en.hp <= 0) {
          enemies.splice(i, 1);
          continue;
        }

        // Aplicar knockback com atrito
        if (Math.abs(en.vx) > 1 || Math.abs(en.vy) > 1) {
          this._moveEntity(game, en, en.vx * dt, en.vy * dt, en.flying);
          en.vx *= Math.pow(0.001, dt);
          en.vy *= Math.pow(0.001, dt);
        }

        if (en.statuses.stun || en.statuses.freeze) continue;

        if (en.isBoss) {
          this._updateBoss(game, en, dt);
          continue;
        }

        this._updateRegularEnemy(game, en, dt, p);
      }

      // Checar limpeza da sala de combate
      if (!room.cleared && enemies.length === 0) {
        room.cleared = true;
        room.lockedCombat = false;
        G.AudioEngine.playSFX('doorOpen');
        game.addFloatingText(p.x, p.y - 16, 'SALA LIMPA!', P.lime);
        // Pequena recompensa bônus de limpeza
        if (Math.random() < 0.35) {
          game.spawnDrop(12 * TS, 7 * TS, Math.random() < 0.5 ? 'gold' : 'hp_orb');
        }
      }
    },

    _tickStatuses(game, entity, dt) {
      for (const stKey of Object.keys(entity.statuses)) {
        const st = entity.statuses[stKey];
        st.timer -= dt;
        if (stKey === 'burn' || stKey === 'poison') {
          st.tick -= dt;
          if (st.tick <= 0) {
            st.tick = 0.55;
            if (entity === game.player) {
              if (!entity.perks.immuneFire || stKey === 'poison') {
                entity.hp -= st.power;
                game.addFloatingText(entity.x, entity.y - 10, `-${st.power}`, stKey === 'burn' ? P.orange : P.acid);
                if (entity.hp <= 0) {
                  entity.hp = 0;
                  game.triggerGameOver();
                }
              }
            } else {
              entity.hp -= st.power;
              entity.hitFlash = 0.06;
              game.addFloatingText(entity.x, entity.y - 8, `-${st.power}`, stKey === 'burn' ? P.orange : P.acid);
              if (entity.hp <= 0) this._onEnemyKilled(game, entity);
            }
          }
        }
        if (st.timer <= 0) delete entity.statuses[stKey];
      }
    },

    _updateRegularEnemy(game, en, dt, p) {
      const dist = U.dist(en.x, en.y, p.x, p.y);
      const ang = Math.atan2(p.y - en.y, p.x - en.x);
      if (en.cdTimer > 0) en.cdTimer -= dt;

      if (en.state === 'windup') {
        en.stateTimer -= dt;
        if (en.stateTimer <= 0) {
          this._executeEnemyAttack(game, en, p, ang);
          en.state = 'chase';
          en.cdTimer = en.cooldown;
        }
        return;
      }

      // Atualiza direção olhando para o jogador
      en.facingX = Math.cos(ang);
      en.facingY = Math.sin(ang);

      if (en.ai === 'turret') {
        if (en.cdTimer <= 0 && dist <= en.range) {
          en.state = 'windup';
          en.stateTimer = en.windup;
        }
        return;
      }

      // Movimento por arquétipo
      const desiredDist = (en.ai === 'ranged' || en.ai === 'caster' || en.ai === 'necro') ? 88 : (en.range - 3);
      if (dist > desiredDist) {
        if (en.ai === 'erratic') {
          const wobble = Math.sin(game.elapsed * 7 + en.x * 0.1) * 0.8;
          this._moveEntity(game, en, Math.cos(ang + wobble) * en.speed * dt, Math.sin(ang + wobble) * en.speed * dt, true);
        } else {
          const room = game.currentRoom;
          const etx = Math.floor(en.x / TS);
          const ety = Math.floor(en.y / TS);
          const ptx = Math.floor(p.x / TS);
          const pty = Math.floor(p.y / TS);
          let moveAng = ang;
          if (!U.lineOfSight((x, y) => !D.isWalkableForEnemy(D.getTile(room, x, y), en.flying), etx, ety, ptx, pty)) {
            const step = U.findNextStep(D.ROOM_W, D.ROOM_H, (x, y) => !D.isWalkableForEnemy(D.getTile(room, x, y), en.flying), etx, ety, ptx, pty);
            if (step) {
              moveAng = Math.atan2(step.y * TS + 8 - en.y, step.x * TS + 8 - en.x);
            }
          }
          this._moveEntity(game, en, Math.cos(moveAng) * en.speed * dt, Math.sin(moveAng) * en.speed * dt, en.flying);
        }
      } else if ((en.ai === 'ranged' || en.ai === 'caster') && dist < 48) {
        // Kiting para arqueiros/piromantes
        this._moveEntity(game, en, -Math.cos(ang) * en.speed * 0.7 * dt, -Math.sin(ang) * en.speed * 0.7 * dt, en.flying);
      }

      // Iniciar ataque se pronto
      if (en.cdTimer <= 0 && dist <= en.range + 6) {
        en.state = 'windup';
        en.stateTimer = en.windup;
        en.targetAng = ang;
      }
    },

    _executeEnemyAttack(game, en, p, ang) {
      const a = en.targetAng !== undefined ? en.targetAng : ang;
      if (en.ai === 'melee' || en.ai === 'erratic' || en.ai === 'slime' || en.ai === 'shield' || en.ai === 'stalker') {
        if (U.dist(en.x, en.y, p.x, p.y) <= en.range + 12) {
          this.damagePlayer(game, en.atk, en.element, en.x, en.y, true);
        }
      } else if (en.ai === 'golem') {
        G.AudioEngine.playSFX('explosion');
        game.shake = 4;
        game.spawnParticles(en.x, en.y, P.orange, 14, 70);
        if (U.dist(en.x, en.y, p.x, p.y) <= 36) {
          this.damagePlayer(game, en.atk, 'fire', en.x, en.y, true);
        }
        // Lança 4 brasas cardinais
        for (let k = 0; k < 4; k++) {
          const ka = (Math.PI / 2) * k;
          game.projectiles.push({
            fromPlayer: false,
            x: en.x,
            y: en.y,
            vx: Math.cos(ka) * 95,
            vy: Math.sin(ka) * 95,
            dmg: Math.round(en.atk * 0.75),
            element: 'fire',
            radius: 4,
            life: 1.0,
            color: P.orange
          });
        }
      } else if (en.ai === 'ranged' || en.ai === 'caster' || en.ai === 'turret') {
        const spd = en.ai === 'ranged' ? 140 : 120;
        game.projectiles.push({
          fromPlayer: false,
          x: en.x,
          y: en.y,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          dmg: en.atk,
          element: en.element,
          radius: 4,
          life: 1.8,
          color: G.ELEMENT_META[en.element].color
        });
      } else if (en.ai === 'necro') {
        if (en.summonCount < 2 && game.currentRoom.activeEnemies.length < 7 && Math.random() < 0.45) {
          en.summonCount += 1;
          const tpl = G.GameData.ENEMIES.skeleton;
          const sx = U.clamp(en.x + 18, 32, D.ROOM_W * TS - 32);
          game.spawnParticles(sx, en.y, P.acid, 10, 50);
          game.currentRoom.activeEnemies.push({
            id: 'en_sum_' + Math.random().toString(36).slice(2, 7),
            isBoss: false,
            tplId: 'skeleton',
            name: 'Esqueleto Invocado',
            sprite: 'enemy_skeleton',
            x: sx,
            y: en.y,
            w: 12,
            h: 12,
            hp: Math.round(tpl.hp * 0.75),
            maxHp: Math.round(tpl.hp * 0.75),
            atk: tpl.atk,
            speed: tpl.speed,
            range: tpl.range,
            windup: tpl.windup,
            cooldown: tpl.cooldown,
            ai: 'melee',
            element: 'physical',
            weak: 'fire',
            resist: 'poison',
            xp: 8,
            goldRange: [1, 3],
            state: 'chase',
            stateTimer: 0.5,
            cdTimer: 0.7,
            vx: 0,
            vy: 0,
            facingX: 0,
            facingY: 1,
            hitFlash: 0,
            statuses: {}
          });
        } else {
          game.projectiles.push({
            fromPlayer: false,
            x: en.x,
            y: en.y,
            vx: Math.cos(a) * 115,
            vy: Math.sin(a) * 115,
            dmg: en.atk,
            element: 'poison',
            radius: 4,
            life: 1.8,
            color: P.acid
          });
        }
      }
    },

    _teleportEnemy(game, en) {
      const p = game.player;
      for (let t = 0; t < 8; t++) {
        const a = Math.random() * Math.PI * 2;
        const nx = p.x + Math.cos(a) * 44;
        const ny = p.y + Math.sin(a) * 44;
        if (!game.isPointBlocked(nx, ny, 7)) {
          game.spawnParticles(en.x, en.y, P.violet, 8, 50);
          en.x = nx;
          en.y = ny;
          game.spawnParticles(en.x, en.y, P.violet, 8, 50);
          en.cdTimer = 0.55;
          break;
        }
      }
    },

    // ========================================================================
    // IA DE CHEFES MULTI-FASE
    // ========================================================================
    _updateBoss(game, boss, dt) {
      const p = game.player;
      const dist = U.dist(boss.x, boss.y, p.x, p.y);
      const ang = Math.atan2(p.y - boss.y, p.x - boss.x);
      boss.facingX = Math.cos(ang);
      boss.facingY = Math.sin(ang);

      // Transição Fase 2 (< 50% HP)
      if (boss.phase === 1 && boss.hp <= boss.maxHp * 0.5) {
        boss.phase = 2;
        G.AudioEngine.playSFX('bossRoar');
        game.shake = 8;
        game.spawnParticles(boss.x, boss.y, P.red, 26, 95);
        game.addFloatingText(boss.x, boss.y - 20, 'FASE II: FURIA!', P.red);
        boss.timer = 0.8;
      }

      boss.timer -= dt;
      if (boss.state === 'chase') {
        if (dist > 34) {
          this._moveEntity(game, boss, Math.cos(ang) * boss.speed * dt, Math.sin(ang) * boss.speed * dt, false);
        }
        if (boss.timer <= 0) {
          boss.state = 'windup';
          boss.timer = boss.phase === 2 ? 0.45 : 0.62;
          boss.patternIdx = (boss.patternIdx + 1) % 3;
          boss.telegraph = { ang };
        }
      } else if (boss.state === 'windup') {
        if (boss.timer <= 0) {
          boss.telegraph = null;
          this._executeBossPattern(game, boss, p);
          boss.state = 'chase';
          boss.timer = boss.phase === 2 ? 1.15 : 1.55;
        }
      }
    },

    _executeBossPattern(game, boss, p) {
      const ang = Math.atan2(p.y - boss.y, p.x - boss.x);
      const pat = boss.patternIdx;

      if (boss.tplId === 'boss_bone_king') {
        if (pat === 0) {
          // Leque de ossos
          const count = boss.phase === 2 ? 5 : 3;
          for (let i = 0; i < count; i++) {
            const a = ang + (i - (count - 1) / 2) * 0.25;
            game.projectiles.push({ fromPlayer: false, x: boss.x, y: boss.y, vx: Math.cos(a) * 135, vy: Math.sin(a) * 135, dmg: boss.atk, element: 'physical', radius: 5, life: 2.0, color: P.white });
          }
        } else if (pat === 1) {
          // Anel de 8 ossos
          for (let i = 0; i < 8; i++) {
            const a = (Math.PI * 2 * i) / 8;
            game.projectiles.push({ fromPlayer: false, x: boss.x, y: boss.y, vx: Math.cos(a) * 110, vy: Math.sin(a) * 110, dmg: boss.atk, element: 'physical', radius: 4, life: 2.0, color: P.lightGray });
          }
        } else {
          // Invoca 1 Esqueleto (se houver menos de 4 inimigos)
          if (game.currentRoom.activeEnemies.length < 4) {
            const tpl = G.GameData.ENEMIES.skeleton;
            const sx = U.clamp(boss.x + (Math.random() < 0.5 ? -26 : 26), 36, D.ROOM_W * TS - 36);
            game.currentRoom.activeEnemies.push({
              id: 'en_b_' + Math.random().toString(36).slice(2, 7),
              isBoss: false, tplId: 'skeleton', name: 'Guarda Ossário', sprite: 'enemy_skeleton',
              x: sx, y: boss.y, w: 12, h: 12, hp: tpl.hp, maxHp: tpl.hp, atk: tpl.atk,
              speed: tpl.speed, range: tpl.range, windup: tpl.windup, cooldown: tpl.cooldown,
              ai: 'melee', element: 'physical', weak: 'fire', resist: 'poison',
              xp: 10, goldRange: [2, 5], state: 'chase', stateTimer: 0.4, cdTimer: 0.6,
              vx: 0, vy: 0, facingX: 0, facingY: 1, hitFlash: 0, statuses: {}
            });
          }
        }
      } else if (boss.tplId === 'boss_ignis_rex') {
        if (pat === 0) {
          // Investida deixando fogo
          boss.vx = Math.cos(ang) * 240;
          boss.vy = Math.sin(ang) * 240;
          game.hazards.push({ type: 'fire', x: boss.x, y: boss.y, radius: 14, life: 4.5, tickTimer: 0.1 });
        } else if (pat === 1) {
          // 5 bolas de fogo
          const n = boss.phase === 2 ? 5 : 3;
          for (let i = 0; i < n; i++) {
            const a = ang + (i - (n - 1) / 2) * 0.28;
            game.projectiles.push({ fromPlayer: false, x: boss.x, y: boss.y, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, dmg: boss.atk, element: 'fire', radius: 5, life: 1.9, color: P.orange });
          }
        } else {
          // Onda de choque da bigorna
          G.AudioEngine.playSFX('explosion');
          game.shake = 6;
          if (U.dist(boss.x, boss.y, p.x, p.y) <= 56) this.damagePlayer(game, boss.atk, 'fire', boss.x, boss.y, true);
          for (let i = 0; i < 10; i++) {
            const a = (Math.PI * 2 * i) / 10;
            game.projectiles.push({ fromPlayer: false, x: boss.x, y: boss.y, vx: Math.cos(a) * 100, vy: Math.sin(a) * 100, dmg: Math.round(boss.atk * 0.8), element: 'fire', radius: 4, life: 1.4, color: P.red });
          }
        }
      } else if (boss.tplId === 'boss_lyra') {
        if (pat === 0) {
          this._teleportEnemy(game, boss);
          for (let i = 0; i < 6; i++) {
            const a = ang + (i * Math.PI) / 3;
            game.projectiles.push({ fromPlayer: false, x: boss.x, y: boss.y, vx: Math.cos(a) * 125, vy: Math.sin(a) * 125, dmg: boss.atk, element: 'ice', radius: 4, life: 1.8, color: P.cyan });
          }
        } else {
          const n = boss.phase === 2 ? 5 : 3;
          for (let i = 0; i < n; i++) {
            const a = ang + (i - (n - 1) / 2) * 0.22;
            game.projectiles.push({ fromPlayer: false, x: boss.x, y: boss.y, vx: Math.cos(a) * 155, vy: Math.sin(a) * 155, dmg: boss.atk, element: 'lightning', radius: 4, life: 1.8, color: P.yellow });
          }
        }
      } else {
        // Malakor, Senhor do Abismo (Alterna todos os elementos)
        const elems = ['arcane', 'fire', 'ice', 'lightning'];
        const el = elems[(boss.patternIdx + (boss.phase === 2 ? 1 : 0)) % elems.length];
        const col = G.ELEMENT_META[el].color;
        if (pat === 0) {
          const count = boss.phase === 2 ? 12 : 8;
          for (let i = 0; i < count; i++) {
            const a = (Math.PI * 2 * i) / count + game.elapsed;
            game.projectiles.push({ fromPlayer: false, x: boss.x, y: boss.y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, dmg: boss.atk, element: el, radius: 5, life: 2.2, color: col });
          }
        } else if (pat === 1) {
          this._teleportEnemy(game, boss);
          for (let i = -2; i <= 2; i++) {
            const a = ang + i * 0.18;
            game.projectiles.push({ fromPlayer: false, x: boss.x, y: boss.y, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, dmg: boss.atk, element: el, radius: 5, life: 1.9, color: col });
          }
        } else {
          boss.vx = Math.cos(ang) * 230;
          boss.vy = Math.sin(ang) * 230;
          game.hazards.push({ type: 'poison_cloud', x: boss.x, y: boss.y, radius: 24, life: 4.0, tickTimer: 0.1 });
        }
      }
    },

    _moveEntity(game, ent, dx, dy, flying) {
      const room = game.currentRoom;
      const half = (ent.w || 12) * 0.45;
      const canStand = (nx, ny) => {
        const pts = [[nx - half, ny - half], [nx + half, ny - half], [nx - half, ny + half], [nx + half, ny + half]];
        for (const [px, py] of pts) {
          const tx = Math.floor(px / TS);
          const ty = Math.floor(py / TS);
          if (tx <= 0 || ty <= 0 || tx >= D.ROOM_W - 1 || ty >= D.ROOM_H - 1) return false;
          const tile = D.getTile(room, tx, ty);
          if (!D.isWalkableForEnemy(tile, flying)) return false;
        }
        return true;
      };
      if (canStand(ent.x + dx, ent.y)) ent.x += dx;
      if (canStand(ent.x, ent.y + dy)) ent.y += dy;
    },

    // ========================================================================
    // PROJÉTEIS & HAZARDS
    // ========================================================================
    updateProjectiles(game, dt) {
      const room = game.currentRoom;
      const p = game.player;

      for (let i = game.projectiles.length - 1; i >= 0; i--) {
        const pr = game.projectiles[i];
        pr.x += pr.vx * dt;
        pr.y += pr.vy * dt;
        pr.life -= dt;

        const tx = Math.floor(pr.x / TS);
        const ty = Math.floor(pr.y / TS);
        const tile = D.getTile(room, tx, ty);

        // Química elemental de voo sobre água/óleo/gelo
        if (pr.element && pr.element !== 'physical') {
          this.applyElementToTile(game, room, tx, ty, pr.element);
        }

        // Colisão com barris
        if (tile === TILE.BARREL || tile === TILE.BARREL_EXP) {
          this._breakBarrel(game, room, tx, ty, pr.element);
          game.projectiles.splice(i, 1);
          continue;
        }

        // Colisão com paredes sólidas
        if (pr.life <= 0 || D.isSolidTile(tile)) {
          game.spawnParticles(pr.x, pr.y, pr.color || P.white, 4, 40);
          game.projectiles.splice(i, 1);
          continue;
        }

        if (pr.fromPlayer) {
          let hit = false;
          for (const en of (room.activeEnemies || [])) {
            if (en.hp <= 0) continue;
            if (U.dist(pr.x, pr.y, en.x, en.y) <= (en.w * 0.6 + pr.radius)) {
              const ang = Math.atan2(pr.vy, pr.vx);
              this.damageEnemy(game, en, pr.dmg, pr.element, Math.cos(ang) * 75, Math.sin(ang) * 75, pr.isCrit, ang);
              hit = true;
              break;
            }
          }
          if (hit) {
            game.projectiles.splice(i, 1);
            continue;
          }
        } else {
          if (U.dist(pr.x, pr.y, p.x, p.y) <= (7 + pr.radius)) {
            // Parry de projétil! Reflete contra inimigos!
            if (p.blocking && p.parryTimer > 0 && p.iFrames <= 0) {
              G.AudioEngine.playSFX('parry');
              game.hitStop = 0.045;
              pr.fromPlayer = true;
              pr.vx = -pr.vx * 1.9;
              pr.vy = -pr.vy * 1.9;
              pr.dmg = Math.round(pr.dmg * 2.4);
              pr.isCrit = true;
              pr.life = 1.6;
              pr.color = P.cyan;
              p.mp = Math.min(p.getMaxMp(), p.mp + 8);
              game.addFloatingText(p.x, p.y - 14, 'REFLETIDO!', P.cyan);
              continue;
            }
            this.damagePlayer(game, pr.dmg, pr.element, pr.x, pr.y, true);
            game.projectiles.splice(i, 1);
            continue;
          }
        }
      }
    },

    updateHazardsAndBombs(game, dt) {
      const p = game.player;
      const room = game.currentRoom;

      // Bombas
      for (let i = game.bombs.length - 1; i >= 0; i--) {
        const b = game.bombs[i];
        b.timer -= dt;
        if (b.timer <= 0) {
          game.bombs.splice(i, 1);
          this.explodeAt(game, b.x, b.y, b.radius, 48 + game.player.level * 5, true);
        }
      }

      // Hazards dinâmicos (fogo, nuvem de veneno)
      for (let i = game.hazards.length - 1; i >= 0; i--) {
        const h = game.hazards[i];
        h.life -= dt;
        h.tickTimer -= dt;
        if (h.tickTimer <= 0) {
          h.tickTimer = 0.45;
          for (const en of (room.activeEnemies || [])) {
            if (en.hp > 0 && U.dist(h.x, h.y, en.x, en.y) <= h.radius + 6) {
              this.damageEnemy(game, en, h.type === 'fire' ? 7 : 5, h.type === 'fire' ? 'fire' : 'poison', 0, 0, false);
            }
          }
          if (U.dist(h.x, h.y, p.x, p.y) <= h.radius + 4) {
            this.damagePlayer(game, h.type === 'fire' ? 6 : 5, h.type === 'fire' ? 'fire' : 'poison', h.x, h.y, false);
          }
        }
        if (h.life <= 0) game.hazards.splice(i, 1);
      }

      // Efeitos de tiles sob o jogador e inimigos (Lava, Espinhos, Status ticks)
      const ptx = Math.floor(p.x / TS);
      const pty = Math.floor(p.y / TS);
      const pt = D.getTile(room, ptx, pty);
      if (pt === TILE.LAVA && p.dashTimer <= 0) {
        this.damagePlayer(game, 10, 'fire', ptx * TS + 8, pty * TS + 8, false);
      } else if (pt === TILE.SPIKES && game.spikeActive && p.dashTimer <= 0) {
        this.damagePlayer(game, 8, 'physical', ptx * TS + 8, pty * TS + 8, false);
      }

      if (game.spikeActive) {
        for (const en of (room.activeEnemies || [])) {
          if (en.hp <= 0 || en.flying) continue;
          en.spikeTick = (en.spikeTick || 0) - dt;
          if (en.spikeTick <= 0) {
            const et = D.getTile(room, Math.floor(en.x / TS), Math.floor(en.y / TS));
            if (et === TILE.SPIKES) {
              en.spikeTick = 0.6;
              this.damageEnemy(game, en, 8, 'physical', 0, 0, false);
            }
          }
        }
      }

      // Status ticks do jogador
      this._tickStatuses(game, p, dt);
    }
  };

  G.Combat = Combat;
})(window.Game8Bit);
