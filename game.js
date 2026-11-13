// ============================================================================
// CRÔNICAS DO ABISMO 8-BIT — Motor Principal, Renderização 8-bit & Persistência
// ============================================================================

window.Game8Bit = window.Game8Bit || {};

(function (G) {
  'use strict';

  const P = G.PAL;
  const D = G.Dungeon;
  const TILE = D.TILE;
  const TS = D.TILE_SIZE;
  const U = G.Utils;
  const CANVAS_W = D.ROOM_W * TS; // 384
  const CANVAS_H = D.ROOM_H * TS; // 240
  const STORAGE_KEY = 'cronicas_abismo_8bit_v1';

  const GameEngine = {
    canvas: null,
    ctx: null,
    state: 'title', // 'title', 'playing', 'modal', 'gameover', 'victory'
    elapsed: 0,
    hitStop: 0,
    shake: 0,

    // Temporizador global de armadilhas de espinhos
    spikeCycle: 0,
    spikeActive: false,

    // Dados persistentes
    meta: {
      souls: 0,
      upgrades: {},
      codexEnemies: {},
      runs: 0,
      wins: 0,
      bestFloor: 1,
      settings: {
        musicVolume: 0.45,
        sfxVolume: 0.70,
        muted: false,
        crt: true,
        pixelGrid: false,
        touch: false
      }
    },

    // Estado da partida atual
    rng: null,
    seed: '',
    difficulty: G.GameData.DIFFICULTIES.normal,
    floor: 1,
    dungeon: null,
    currentRoom: null,
    player: null,
    projectiles: [],
    particles: [],
    floatingTexts: [],
    hazards: [],
    drops: [],
    bombs: [],
    stats: null,
    roomBanner: { text: '', sub: '', timer: 0 },

    // Input
    keys: {},
    mouse: { x: CANVAS_W / 2, y: CANVAS_H / 2, active: false },
    touchMove: { x: 0, y: 0 },

    init() {
      G.SpriteBank.initAll();
      this.canvas = document.getElementById('game-canvas');
      this.ctx = this.canvas.getContext('2d');
      this.ctx.imageSmoothingEnabled = false;

      this.loadMeta();
      G.AudioEngine.setSettings(this.meta.settings);
      this._bindInputs();

      let last = performance.now();
      const loop = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        this.update(dt);
        this.render();
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);

      G.UI.init(this);
    },

    loadMeta() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          this.meta = Object.assign({}, this.meta, parsed);
          this.meta.settings = Object.assign({}, this.meta.settings, parsed.settings || {});
        }
      } catch (e) {
        // Ignora erro de storage bloqueado
      }
    },

    saveMeta() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.meta));
      } catch (e) {}
    },

    hasSavedRun() {
      try {
        return !!localStorage.getItem(STORAGE_KEY + '_run');
      } catch (e) {
        return false;
      }
    },

    saveActiveRun() {
      if (!this.player || !this.dungeon) return false;
      try {
        const snap = {
          seed: this.seed,
          difficultyId: this.difficulty.id,
          floor: this.floor,
          currentRoomId: this.currentRoom.id,
          dungeon: this.dungeon,
          stats: this.stats,
          player: {
            classId: this.player.classId,
            x: this.player.x,
            y: this.player.y,
            hp: this.player.hp,
            mp: this.player.mp,
            stamina: this.player.stamina,
            level: this.player.level,
            xp: this.player.xp,
            xpNext: this.player.xpNext,
            bonusMaxHp: this.player.bonusMaxHp,
            bonusMaxMp: this.player.bonusMaxMp,
            bonusAtk: this.player.bonusAtk,
            bonusMag: this.player.bonusMag,
            bonusCrit: this.player.bonusCrit,
            gold: this.player.gold,
            keys: this.player.keys,
            bombs: this.player.bombs,
            hasBossKey: this.player.hasBossKey,
            soulsEarned: this.player.soulsEarned,
            shards: this.player.shards,
            equip: this.player.equip,
            inventory: this.player.inventory,
            perks: this.player.perks,
            blessings: this.player.blessings,
            revivedThisFloor: this.player.revivedThisFloor
          }
        };
        localStorage.setItem(STORAGE_KEY + '_run', JSON.stringify(snap));
        return true;
      } catch (e) {
        return false;
      }
    },

    loadActiveRun() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY + '_run');
        if (!raw) return false;
        const snap = JSON.parse(raw);
        this.seed = snap.seed;
        this.rng = G.createRNG(this.seed + ':' + snap.floor);
        this.difficulty = G.GameData.DIFFICULTIES[snap.difficultyId] || G.GameData.DIFFICULTIES.normal;
        this.floor = snap.floor;
        this.dungeon = snap.dungeon;
        this.stats = snap.stats;
        this.player = this._createPlayerObj(snap.player.classId);
        Object.assign(this.player, snap.player);
        this.currentRoom = this.dungeon.rooms[snap.currentRoomId];
        this.projectiles = [];
        this.particles = [];
        this.floatingTexts = [];
        this.hazards = [];
        this.drops = [];
        this.bombs = [];
        this.state = 'playing';
        G.AudioEngine.unlock();
        G.AudioEngine.playMusic(this.currentRoom.biome.music);
        this.showBanner(this.currentRoom.biome.name, `Andar ${this.floor} — Continuando`);
        G.UI.onRunStart();
        return true;
      } catch (e) {
        return false;
      }
    },

    clearSavedRun() {
      try {
        localStorage.removeItem(STORAGE_KEY + '_run');
      } catch (e) {}
    },

    _createPlayerObj(classId) {
      const cls = G.GameData.CLASSES[classId];
      const metaUp = this.meta.upgrades || {};
      const hpMeta = (metaUp.meta_hp || 0) * 10;
      const atkMeta = (metaUp.meta_atk || 0) * 2;
      const critMeta = (metaUp.meta_crit || 0) * 0.03;

      const p = {
        classId,
        classDef: cls,
        x: 12 * TS,
        y: 8 * TS,
        w: 11,
        h: 11,
        aimAngle: Math.PI / 2,
        moveX: 0,
        moveY: 0,
        knockVx: 0,
        knockVy: 0,
        dashTimer: 0,
        dashCd: 0,
        dashVx: 0,
        dashVy: 0,
        attackCd: 0,
        attackAnim: 0,
        slashEffect: null,
        skillCd: 0,
        blocking: false,
        parryTimer: 0,
        iFrames: 0,
        guaranteedCrit: false,
        revivedThisFloor: false,
        statuses: {},

        level: 1,
        xp: 0,
        xpNext: 45,
        bonusMaxHp: hpMeta,
        bonusMaxMp: 0,
        bonusAtk: atkMeta,
        bonusMag: atkMeta,
        bonusCrit: critMeta,

        hp: cls.stats.maxHp + hpMeta,
        mp: cls.stats.maxMp,
        stamina: cls.stats.maxStamina,

        gold: 15 + (metaUp.meta_gold || 0) * 20,
        keys: 1,
        bombs: 2 + (metaUp.meta_potions || 0),
        hasBossKey: false,
        soulsEarned: 0,

        shards: { fire: 0, ice: 0, lightning: 0, poison: 0, arcane: 0 },
        equip: {
          weapon: G.GameData.makeTemplateItem(cls.startWeapon, 'comum'),
          armor: G.GameData.makeTemplateItem(cls.startArmor, 'comum'),
          relic1: null,
          relic2: null
        },
        inventory: [],
        blessings: [],
        perks: {
          dmgMult: 1.0,
          magMult: 1.0,
          flatDef: 0,
          cdr: 0,
          lifesteal: 0,
          hpRegen: 0,
          potionMult: 0,
          bonusCrit: 0,
          critMult: 1.75,
          goldMult: 0,
          bombMult: 0,
          shockDash: false,
          emberHit: false,
          immuneFire: false,
          frostParry: false,
          venomBurst: false,
          reviveFloor: false
        },

        getMaxHp() {
          const eq = (this.equip.armor?.bonusHp || 0) + (this.equip.relic1?.bonusHp || 0) + (this.equip.relic2?.bonusHp || 0) + (this.equip.weapon?.bonusHp || 0);
          return this.classDef.stats.maxHp + (this.level - 1) * this.classDef.growth.hp + this.bonusMaxHp + eq;
        },
        getMaxMp() {
          const eq = (this.equip.armor?.bonusMp || 0) + (this.equip.relic1?.bonusMp || 0) + (this.equip.relic2?.bonusMp || 0) + (this.equip.weapon?.bonusMp || 0);
          return this.classDef.stats.maxMp + (this.level - 1) * this.classDef.growth.mp + this.bonusMaxMp + eq;
        },
        getMaxStamina() {
          return this.classDef.stats.maxStamina;
        },
        getAtk() {
          const w = this.equip.weapon;
          const up = w ? w.upgrade * 3 : 0;
          const eq = (w?.atk || 0) + up + (this.equip.relic1?.bonusAtk || 0) + (this.equip.relic2?.bonusAtk || 0);
          const base = this.classDef.stats.atk + (this.level - 1) * this.classDef.growth.atk + this.bonusAtk + eq;
          return Math.round(base * this.perks.dmgMult);
        },
        getMag() {
          const w = this.equip.weapon;
          const up = w ? w.upgrade * 3 : 0;
          const eq = (w?.mag || 0) + up + (this.equip.armor?.bonusMag || 0) + (this.equip.relic1?.bonusMag || 0) + (this.equip.relic2?.bonusMag || 0);
          const base = this.classDef.stats.mag + (this.level - 1) * this.classDef.growth.mag + this.bonusMag + eq;
          return Math.round(base * this.perks.magMult * this.perks.dmgMult);
        },
        getDef() {
          const a = this.equip.armor;
          const up = a ? a.upgrade * 2 : 0;
          return this.classDef.stats.def + (this.level - 1) * this.classDef.growth.def + (a?.def || 0) + up + this.perks.flatDef;
        },
        getSpeed() {
          const eq = (this.equip.armor?.bonusSpeed || 0) + (this.equip.relic1?.bonusSpeed || 0) + (this.equip.relic2?.bonusSpeed || 0) + (this.equip.weapon?.bonusSpeed || 0);
          return this.classDef.stats.speed + eq;
        },
        getCritChance() {
          const eq = (this.equip.weapon?.bonusCrit || 0) + (this.equip.armor?.bonusCrit || 0) + (this.equip.relic1?.bonusCrit || 0) + (this.equip.relic2?.bonusCrit || 0);
          return Math.min(0.85, this.classDef.stats.crit + this.bonusCrit + this.perks.bonusCrit + eq);
        },
        getCritMult() {
          return this.perks.critMult;
        },
        getLifesteal() {
          return this.perks.lifesteal + (this.equip.weapon?.vampiric || 0) + (this.equip.relic1?.vampiric || 0) + (this.equip.relic2?.vampiric || 0);
        }
      };

      // Itens iniciais de meta-progressão e poções
      const potCount = 1 + (metaUp.meta_potions || 0);
      for (let i = 0; i < potCount; i++) {
        this._addStackItemRaw(p, G.GameData.makeTemplateItem('cons_hp_pot'));
      }
      this._addStackItemRaw(p, G.GameData.makeTemplateItem('cons_mp_pot'));

      const shardPairs = metaUp.meta_shards || 0;
      const shardKeys = ['fire', 'ice', 'lightning', 'poison', 'arcane'];
      for (let i = 0; i < shardPairs * 2; i++) {
        p.shards[shardKeys[i % shardKeys.length]] += 1;
      }

      return p;
    },

    _addStackItemRaw(p, item) {
      if (!item) return false;
      if (item.stackable) {
        const existing = p.inventory.find(it => it.id === item.id);
        if (existing) {
          existing.qty = (existing.qty || 1) + (item.qty || 1);
          return true;
        }
      }
      if (p.inventory.length >= 20) return false;
      p.inventory.push(item);
      return true;
    },

    startNewRun(classId, diffId, seedInput) {
      G.AudioEngine.unlock();
      this.difficulty = G.GameData.DIFFICULTIES[diffId] || G.GameData.DIFFICULTIES.normal;
      this.rng = G.createRNG(seedInput);
      this.seed = this.rng.seed;
      this.floor = 1;
      this.stats = { kills: 0, bosses: 0, roomsCleared: 0, itemsFound: 0, time: 0 };

      this.player = this._createPlayerObj(classId);
      this._enterFloor(1, true);
      this.state = 'playing';
      this.meta.runs += 1;
      this.saveMeta();
      G.UI.onRunStart();
    },

    _enterFloor(floorNum, isFirst = false) {
      this.floor = floorNum;
      this.player.hasBossKey = false;
      this.player.revivedThisFloor = false;
      if (floorNum > this.meta.bestFloor) {
        this.meta.bestFloor = floorNum;
        this.saveMeta();
      }

      const floorRng = this.rng.fork('floor_' + floorNum);
      this.dungeon = D.generateFloor(floorRng, floorNum, this.difficulty);
      this.enterRoom(this.dungeon.startRoomId, null);

      if (!isFirst) {
        this.player.hp = Math.min(this.player.getMaxHp(), this.player.hp + Math.round(this.player.getMaxHp() * 0.25));
        this.player.mp = Math.min(this.player.getMaxMp(), this.player.mp + Math.round(this.player.getMaxMp() * 0.4));
      }
      this.showBanner(this.dungeon.biome.name, `Andar ${floorNum} — Seed: ${this.seed}`);
      G.AudioEngine.playMusic(this.dungeon.biome.music);
    },

    enterRoom(roomId, fromDir) {
      const room = this.dungeon.rooms[roomId];
      if (!room) return;
      this.currentRoom = room;
      room.visited = true;
      room.revealed = true;

      // Revela salas vizinhas não-secretas no minimapa
      for (const nb of Object.values(room.neighbors)) {
        if (nb.lock !== 'secret') {
          const adj = this.dungeon.rooms[nb.roomId];
          if (adj) adj.revealed = true;
        }
      }

      this.projectiles = [];
      this.particles = [];
      this.floatingTexts = [];
      this.hazards = [];
      this.drops = [];
      this.bombs = [];

      if (fromDir) {
        const entry = D.getEntryPos(fromDir);
        this.player.x = entry.x;
        this.player.y = entry.y;
      } else {
        this.player.x = 12 * TS;
        this.player.y = 8 * TS;
      }

      if (!room.cleared && room.enemies.length > 0) {
        G.Combat.spawnEnemiesForRoom(this, room);
        room.lockedCombat = true;
        if (room.type === 'boss') {
          G.AudioEngine.playSFX('bossRoar');
          G.AudioEngine.playMusic('boss');
          const boss = room.activeEnemies.find(e => e.isBoss);
          if (boss) this.showBanner(boss.name, boss.title);
        }
      } else if (room.type === 'forge' || room.type === 'shop' || room.type === 'shrine') {
        G.AudioEngine.playMusic('sanctuary');
      } else if (G.AudioEngine.currentTrack === 'sanctuary' || G.AudioEngine.currentTrack === 'boss') {
        G.AudioEngine.playMusic(room.biome.music);
      }

      G.UI.dirty = true;
    },

    showBanner(text, sub = '') {
      this.roomBanner = { text, sub, timer: 2.6 };
    },

    // ========================================================================
    // UPDATE LOOP (60 FPS)
    // ========================================================================
    update(dt) {
      this.elapsed += dt;
      if (this.roomBanner.timer > 0) this.roomBanner.timer -= dt;

      if (this.state !== 'playing') return;

      this.stats.time += dt;

      if (this.hitStop > 0) {
        this.hitStop -= dt;
        return;
      }

      if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 28);

      // Ciclo das armadilhas de espinhos (1.8s recolhido, 1.0s ativo)
      this.spikeCycle = (this.spikeCycle + dt) % 2.8;
      this.spikeActive = this.spikeCycle >= 1.8;

      this._updatePlayer(dt);
      G.Combat.updateEnemies(this, dt);
      G.Combat.updateProjectiles(this, dt);
      G.Combat.updateHazardsAndBombs(this, dt);
      this._updateDrops(dt);
      this._updateParticlesAndText(dt);
      G.UI.updateHUD();
    },

    _updatePlayer(dt) {
      const p = this.player;
      if (p.iFrames > 0) p.iFrames -= dt;
      if (p.attackCd > 0) p.attackCd -= dt;
      if (p.attackAnim > 0) p.attackAnim -= dt;
      if (p.dashCd > 0) p.dashCd -= dt;
      if (p.skillCd > 0) p.skillCd -= dt;
      if (p.parryTimer > 0) p.parryTimer -= dt;
      if (p.slashEffect) {
        p.slashEffect.timer -= dt;
        if (p.slashEffect.timer <= 0) p.slashEffect = null;
      }

      // Regeneração de MP, Vigor e Vida (fora de combate / relíquias)
      const stamRate = 24 + (p.equip.relic1?.stamRegen || 0) + (p.equip.relic2?.stamRegen || 0);
      p.stamina = Math.min(p.getMaxStamina(), p.stamina + stamRate * dt);
      const mpRate = (p.classId === 'mage' ? 2.6 : 1.0) + (p.equip.relic1?.mpRegen || 0) + (p.equip.relic2?.mpRegen || 0);
      p.mp = Math.min(p.getMaxMp(), p.mp + mpRate * dt);
      if (p.perks.hpRegen > 0 && this.currentRoom.cleared) {
        p.hp = Math.min(p.getMaxHp(), p.hp + p.perks.hpRegen * dt);
      }

      // Movimento por teclado ou D-Pad touch
      let mx = this.touchMove.x;
      let my = this.touchMove.y;
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) mx -= 1;
      if (this.keys['KeyD'] || this.keys['ArrowRight']) mx += 1;
      if (this.keys['KeyW'] || this.keys['ArrowUp']) my -= 1;
      if (this.keys['KeyS'] || this.keys['ArrowDown']) my += 1;

      p.moveX = mx;
      p.moveY = my;

      if (this.mouse.active) {
        p.aimAngle = Math.atan2(this.mouse.y - p.y, this.mouse.x - p.x);
      } else if (mx !== 0 || my !== 0) {
        p.aimAngle = Math.atan2(my, mx);
      }

      let vx = 0;
      let vy = 0;
      if (p.dashTimer > 0) {
        p.dashTimer -= dt;
        vx = p.dashVx;
        vy = p.dashVy;
        if (Math.random() < 0.7) {
          this.particles.push({ x: p.x, y: p.y, vx: 0, vy: 0, color: P.cyan, life: 0.16, maxLife: 0.16, size: 4 });
        }
      } else {
        if (mx !== 0 || my !== 0) {
          const len = Math.hypot(mx, my);
          const curTile = D.getTile(this.currentRoom, Math.floor(p.x / TS), Math.floor(p.y / TS));
          let spd = p.getSpeed();
          if (p.blocking) spd *= 0.55;
          if (curTile === TILE.WATER) spd *= 0.72;
          if (curTile === TILE.ICE) spd *= 1.28;
          vx = (mx / len) * spd;
          vy = (my / len) * spd;
        }
        vx += p.knockVx;
        vy += p.knockVy;
        p.knockVx *= Math.pow(0.001, dt);
        p.knockVy *= Math.pow(0.001, dt);
      }

      this._movePlayerWithCollisions(vx * dt, vy * dt);
    },

    _movePlayerWithCollisions(dx, dy) {
      const p = this.player;
      const room = this.currentRoom;

      const tryMove = (nx, ny) => {
        const half = 5;
        const corners = [[nx - half, ny - half], [nx + half, ny - half], [nx - half, ny + half], [nx + half, ny + half]];
        for (const [cx, cy] of corners) {
          const tx = Math.floor(cx / TS);
          const ty = Math.floor(cy / TS);
          if (tx < 0 || ty < 0 || tx >= D.ROOM_W || ty >= D.ROOM_H) return false;
          const tile = D.getTile(room, tx, ty);

          // Verifica portas para transição de sala
          if (tile === TILE.DOOR_OPEN || tile === TILE.DOOR_SECRET) {
            if (!room.lockedCombat) {
              this._checkDoorTransition(tx, ty);
              return 'transition';
            }
            return false; // Trancado durante combate!
          }
          if (tile === TILE.DOOR_LOCKED) {
            if (p.keys > 0 && !room.lockedCombat) {
              p.keys -= 1;
              this._unlockDoorTile(room, tx, ty);
              G.AudioEngine.playSFX('doorOpen');
              this.addFloatingText(tx * TS + 8, ty * TS, 'DESTRANCADA!', P.gold);
            } else {
              if (!this._doorMsgCd) {
                this._doorMsgCd = 1.0;
                setTimeout(() => (this._doorMsgCd = 0), 800);
                G.AudioEngine.playSFX('locked');
                this.addFloatingText(tx * TS + 8, ty * TS, 'PRECISA CHAVE!', P.red);
              }
            }
            return false;
          }
          if (tile === TILE.DOOR_BOSS) {
            if (p.hasBossKey && !room.lockedCombat) {
              p.hasBossKey = false;
              this._unlockDoorTile(room, tx, ty);
              G.AudioEngine.playSFX('doorOpen');
              this.addFloatingText(tx * TS + 8, ty * TS, 'PORTAL DO CHEFE!', P.gold);
            } else {
              if (!this._doorMsgCd) {
                this._doorMsgCd = 1.0;
                setTimeout(() => (this._doorMsgCd = 0), 800);
                G.AudioEngine.playSFX('locked');
                this.addFloatingText(tx * TS + 8, ty * TS, 'CHAVE DO CHEFE!', P.orange);
              }
            }
            return false;
          }

          if (tile === TILE.BLOCK) {
            // Tenta empurrar bloco no quebra-cabeça
            const dirX = Math.abs(dx) > Math.abs(dy) ? Math.sign(dx) : 0;
            const dirY = Math.abs(dy) >= Math.abs(dx) ? Math.sign(dy) : 0;
            if (this._tryPushBlock(room, tx, ty, dirX, dirY)) return true;
            return false;
          }

          if (D.isSolidTile(tile)) return false;
        }
        return true;
      };

      const rx = tryMove(p.x + dx, p.y);
      if (rx === 'transition') return;
      if (rx) p.x += dx;
      const ry = tryMove(p.x, p.y + dy);
      if (ry === 'transition') return;
      if (ry) p.y += dy;

      // Escada para próximo andar
      const ptx = Math.floor(p.x / TS);
      const pty = Math.floor(p.y / TS);
      if (D.getTile(this.currentRoom, ptx, pty) === TILE.STAIRS_DOWN) {
        this._onStepStairs();
      }
    },

    _unlockDoorTile(room, tx, ty) {
      let dir = null;
      if (ty === 0) dir = 'N';
      else if (ty === D.ROOM_H - 1) dir = 'S';
      else if (tx === 0) dir = 'W';
      else if (tx === D.ROOM_W - 1) dir = 'E';
      if (!dir) return;

      for (const c of D.getDoorCoords(dir)) {
        D.setTile(room, c.x, c.y, TILE.DOOR_OPEN);
      }
      const nb = room.neighbors[dir];
      if (nb) {
        nb.lock = 'none';
        const other = this.dungeon.rooms[nb.roomId];
        if (other) {
          const opp = D.DIRS[dir].opp;
          if (other.neighbors[opp]) other.neighbors[opp].lock = 'none';
          for (const oc of D.getDoorCoords(opp)) {
            D.setTile(other, oc.x, oc.y, TILE.DOOR_OPEN);
          }
        }
      }
    },

    _checkDoorTransition(tx, ty) {
      const room = this.currentRoom;
      let dir = null;
      if (ty === 0) dir = 'N';
      else if (ty === D.ROOM_H - 1) dir = 'S';
      else if (tx === 0) dir = 'W';
      else if (tx === D.ROOM_W - 1) dir = 'E';
      if (!dir || !room.neighbors[dir]) return;
      const targetId = room.neighbors[dir].roomId;
      this.enterRoom(targetId, D.DIRS[dir].opp);
    },

    _tryPushBlock(room, bx, by, dirX, dirY) {
      if (this._pushCd) return false;
      const nx = bx + dirX;
      const ny = by + dirY;
      if (nx <= 1 || ny <= 1 || nx >= D.ROOM_W - 2 || ny >= D.ROOM_H - 2) return false;
      const dest = D.getTile(room, nx, ny);
      if (dest !== TILE.FLOOR && dest !== TILE.FLOOR_ALT && dest !== TILE.PLATE) return false;

      this._pushCd = true;
      setTimeout(() => (this._pushCd = false), 220);

      // Restaura placa se o bloco estava sobre uma
      const wasPlate = room.plates.some(pl => pl.x === bx && pl.y === by);
      D.setTile(room, bx, by, wasPlate ? TILE.PLATE : TILE.FLOOR);
      D.setTile(room, nx, ny, TILE.BLOCK);
      G.AudioEngine.playSFX('hit');

      // Verifica se todas as placas estão cobertas
      if (!room.puzzleSolved && room.plates.length > 0 && room.plates.every(pl => D.getTile(room, pl.x, pl.y) === TILE.BLOCK)) {
        room.puzzleSolved = true;
        G.AudioEngine.playSFX('levelUp');
        D.setTile(room, 12, 7, TILE.CHEST);
        room.chests['12,7'] = {
          opened: false,
          gold: 35 + this.floor * 12,
          loot: G.GameData.generateProceduralLoot(this.rng, this.floor, null, 'raro'),
          mimic: false
        };
        this.addFloatingText(12 * TS, 6 * TS, 'ENIGMA RESOLVIDO!', P.gold);
      }
      return false;
    },

    _onStepStairs() {
      if (this._stairsLock) return;
      this._stairsLock = true;
      setTimeout(() => (this._stairsLock = false), 800);

      if (this.floor === 4) {
        // Vitória épica ou Abismo Infinito!
        this.state = 'victory';
        this.meta.wins += 1;
        const bonusSouls = Math.round(40 * this.difficulty.soulMult);
        this.player.soulsEarned += bonusSouls;
        this.meta.souls += this.player.soulsEarned;
        this.clearSavedRun();
        this.saveMeta();
        G.AudioEngine.playSFX('victory');
        G.UI.showVictoryModal(this.player.soulsEarned);
      } else {
        G.AudioEngine.playSFX('doorOpen');
        this._enterFloor(this.floor + 1);
      }
    },

    continueEndlessAbyss() {
      this.player.soulsEarned = 0;
      this.state = 'playing';
      this._enterFloor(this.floor + 1);
      G.UI.closeAllModals();
    },

    // ========================================================================
    // INTERAÇÃO COM OBJETOS DA SALA [E]
    // ========================================================================
    interact() {
      if (this.state !== 'playing') return;
      const p = this.player;
      const room = this.currentRoom;

      // Procura tile interativo num raio de 24px ao redor do jogador
      const ptx = Math.floor(p.x / TS);
      const pty = Math.floor(p.y / TS);
      let best = null;
      let bestD = 999;

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const tx = ptx + dx;
          const ty = pty + dy;
          const t = D.getTile(room, tx, ty);
          if ([TILE.CHEST, TILE.ANVIL, TILE.SHRINE, TILE.CAMPFIRE, TILE.MERCHANT, TILE.LORE_TABLET].includes(t)) {
            const d = U.dist(p.x, p.y, tx * TS + 8, ty * TS + 8);
            if (d < bestD && d <= 28) {
              bestD = d;
              best = { tx, ty, t };
            }
          }
        }
      }

      if (!best) return;
      const { tx, ty, t } = best;

      if (t === TILE.CHEST) {
        const key = `${tx},${ty}`;
        const chest = room.chests[key];
        if (!chest || chest.opened) return;
        if (chest.mimic) {
          D.setTile(room, tx, ty, TILE.FLOOR);
          delete room.chests[key];
          const tpl = G.GameData.ENEMIES.mimic;
          room.activeEnemies = room.activeEnemies || [];
          room.activeEnemies.push({
            id: 'en_mimic_' + Date.now(),
            isBoss: false, elite: true, tplId: 'mimic', name: 'Mímico Traiçoeiro', sprite: 'enemy_mimic',
            x: tx * TS + 8, y: ty * TS + 8, w: 14, h: 14,
            hp: Math.round(tpl.hp * this.difficulty.enemyHpMult), maxHp: Math.round(tpl.hp * this.difficulty.enemyHpMult),
            atk: Math.round(tpl.atk * this.difficulty.enemyDmgMult), speed: tpl.speed, range: tpl.range,
            windup: tpl.windup, cooldown: tpl.cooldown, ai: 'melee', element: 'physical', weak: 'fire', resist: null,
            xp: tpl.xp, goldRange: tpl.gold, state: 'chase', stateTimer: 0.2, cdTimer: 0.2,
            vx: 0, vy: 0, facingX: 0, facingY: 1, hitFlash: 0, statuses: {}
          });
          G.AudioEngine.playSFX('bossRoar');
          this.addFloatingText(tx * TS + 8, ty * TS, 'MÍMICO!!', P.red);
          return;
        }
        chest.opened = true;
        G.AudioEngine.playSFX('pickup');
        if (chest.gold) this.spawnDrop(tx * TS + 8, ty * TS + 14, 'gold', chest.gold);
        if (chest.loot) this.spawnDrop(tx * TS + 8, ty * TS + 16, 'item', chest.loot);
        this.spawnDrop(tx * TS + 14, ty * TS + 14, 'shard');
        if (p.perks.goldMult > 0) this.spawnDrop(tx * TS + 2, ty * TS + 14, 'shard');
      } else if (t === TILE.CAMPFIRE) {
        if (room.campfireUsed) {
          this.addFloatingText(tx * TS + 8, ty * TS, 'FOGUEIRA APAGADA', P.gray);
          return;
        }
        room.campfireUsed = true;
        p.hp = Math.min(p.getMaxHp(), p.hp + Math.round(p.getMaxHp() * 0.65));
        p.mp = Math.min(p.getMaxMp(), p.mp + Math.round(p.getMaxMp() * 0.65));
        p.statuses = {};
        G.AudioEngine.playSFX('pickup');
        this.spawnParticles(tx * TS + 8, ty * TS + 8, P.orange, 14, 50);
        this.addFloatingText(p.x, p.y - 12, 'DESCANSO RESTAURADOR!', P.lime);
      } else if (t === TILE.ANVIL) {
        G.UI.openModal('forge');
      } else if (t === TILE.MERCHANT) {
        G.UI.openModal('shop');
      } else if (t === TILE.SHRINE) {
        if (room.shrineUsed) {
          this.addFloatingText(tx * TS + 8, ty * TS, 'SANTUÁRIO EXAURIDO', P.gray);
          return;
        }
        G.UI.openBlessingModal(() => {
          room.shrineUsed = true;
        });
      } else if (t === TILE.LORE_TABLET) {
        G.AudioEngine.playSFX('uiConfirm');
        this.showBanner('TÁBUA ANTIGA', room.loreText || 'Explore cada sala e domine os elementos.');
      }
    },

    // ========================================================================
    // DROPS, INVENTÁRIO, XP & EQUIPAMENTO
    // ========================================================================
    spawnDrop(x, y, type, payload = null) {
      let item = payload;
      if (type === 'loot') {
        type = 'item';
        item = G.GameData.generateProceduralLoot(this.rng, this.floor);
      } else if (type === 'shard') {
        const sKeys = ['fire', 'ice', 'lightning', 'poison', 'arcane'];
        item = sKeys[Math.floor(Math.random() * sKeys.length)];
      }
      this.drops.push({
        x: U.clamp(x, 22, CANVAS_W - 22),
        y: U.clamp(y, 22, CANVAS_H - 22),
        type,
        payload: item,
        bob: Math.random() * 6
      });
    },

    _updateDrops(dt) {
      const p = this.player;
      for (let i = this.drops.length - 1; i >= 0; i--) {
        const d = this.drops[i];
        d.bob += dt * 4;
        const dist = U.dist(p.x, p.y, d.x, d.y);
        if (dist < 38) {
          // Atração magnética leve
          const a = Math.atan2(p.y - d.y, p.x - d.x);
          d.x += Math.cos(a) * 85 * dt;
          d.y += Math.sin(a) * 85 * dt;
        }
        if (dist <= 13) {
          let picked = true;
          if (d.type === 'gold') {
            p.gold += d.payload || 5;
            G.AudioEngine.playSFX('coin');
            this.addFloatingText(p.x, p.y - 10, `+${d.payload}G`, P.gold);
          } else if (d.type === 'hp_orb') {
            p.hp = Math.min(p.getMaxHp(), p.hp + 18);
            G.AudioEngine.playSFX('pickup');
            this.addFloatingText(p.x, p.y - 10, '+18 HP', P.lime);
          } else if (d.type === 'bomb') {
            p.bombs += 1;
            G.AudioEngine.playSFX('pickup');
            this.addFloatingText(p.x, p.y - 10, '+1 BOMBA', P.orange);
          } else if (d.type === 'key') {
            p.keys += 1;
            G.AudioEngine.playSFX('pickup');
            this.addFloatingText(p.x, p.y - 10, '+1 CHAVE', P.gold);
          } else if (d.type === 'boss_key') {
            p.hasBossKey = true;
            G.AudioEngine.playSFX('levelUp');
            this.addFloatingText(p.x, p.y - 14, 'CHAVE DO CHEFE OBTIDA!', P.gold);
          } else if (d.type === 'shard') {
            p.shards[d.payload] = (p.shards[d.payload] || 0) + 1;
            G.AudioEngine.playSFX('pickup');
            const sInfo = G.GameData.SHARDS[d.payload];
            this.addFloatingText(p.x, p.y - 10, `+1 ${sInfo.name}`, sInfo.color);
          } else if (d.type === 'item') {
            if (this._addStackItemRaw(p, d.payload)) {
              this.stats.itemsFound += 1;
              G.AudioEngine.playSFX('pickup');
              this.addFloatingText(p.x, p.y - 12, d.payload.name, d.payload.rarityColor || P.cyan);
            } else {
              picked = false;
              if (!this._invFullCd) {
                this._invFullCd = true;
                setTimeout(() => (this._invFullCd = false), 1200);
                this.addFloatingText(p.x, p.y - 12, 'MOCHILA CHEIA!', P.red);
              }
            }
          }
          if (picked) {
            this.drops.splice(i, 1);
            G.UI.dirty = true;
          }
        }
      }
    },

    gainXp(amount) {
      const p = this.player;
      p.xp += amount;
      while (p.xp >= p.xpNext) {
        p.xp -= p.xpNext;
        p.level += 1;
        p.xpNext = Math.round(p.xpNext * 1.38 + 20);
        p.hp = p.getMaxHp();
        p.mp = p.getMaxMp();
        G.AudioEngine.playSFX('levelUp');
        this.addFloatingText(p.x, p.y - 18, `NÍVEL ${p.level}!`, P.yellow);
        this.spawnParticles(p.x, p.y, P.yellow, 20, 80);
        // A cada nível par, oferece escolha de Bênção!
        if (p.level % 2 === 0 && this.state === 'playing') {
          G.UI.openBlessingModal(null, `NÍVEL ${p.level} ALCANÇADO!`);
        }
      }
      G.UI.dirty = true;
    },

    useConsumable(indexOrId) {
      const p = this.player;
      let idx = -1;
      if (typeof indexOrId === 'number') {
        idx = indexOrId;
      } else {
        idx = p.inventory.findIndex(it => it.id === indexOrId);
      }
      const item = p.inventory[idx];
      if (!item || item.slot !== 'consumable') return false;

      if (item.healHp) {
        const amt = Math.round(item.healHp * (1 + p.perks.potionMult));
        p.hp = Math.min(p.getMaxHp(), p.hp + amt);
        this.addFloatingText(p.x, p.y - 12, `+${amt} HP`, P.lime);
      }
      if (item.healMp) {
        p.mp = Math.min(p.getMaxMp(), p.mp + item.healMp);
        this.addFloatingText(p.x, p.y - 16, `+${item.healMp} MP`, P.sky);
      }
      if (item.cureAll) {
        p.statuses = {};
        this.addFloatingText(p.x, p.y - 20, 'PURIFICADO!', P.cyan);
      }
      if (item.spell) {
        this._castScrollSpell(item.spell);
      } else {
        G.AudioEngine.playSFX('pickup');
      }

      if ((item.qty || 1) > 1) item.qty -= 1;
      else p.inventory.splice(idx, 1);
      G.UI.dirty = true;
      return true;
    },

    _castScrollSpell(spell) {
      const p = this.player;
      const room = this.currentRoom;
      const power = p.getMag() * 2.2 + 22;
      if (spell === 'fire_ring') {
        G.AudioEngine.playSFX('explosion');
        this.spawnParticles(p.x, p.y, P.orange, 26, 95);
        for (let ty = 1; ty < D.ROOM_H - 1; ty++) {
          for (let tx = 1; tx < D.ROOM_W - 1; tx++) {
            if (U.dist(p.x, p.y, tx * TS + 8, ty * TS + 8) <= 68) {
              G.Combat.applyElementToTile(this, room, tx, ty, 'fire');
            }
          }
        }
        for (const en of (room.activeEnemies || [])) {
          if (U.dist(p.x, p.y, en.x, en.y) <= 72) G.Combat.damageEnemy(this, en, power, 'fire', 0, 0, true);
        }
      } else if (spell === 'ice_nova') {
        G.AudioEngine.playSFX('freeze');
        this.spawnParticles(p.x, p.y, P.cyan, 26, 95);
        for (let ty = 1; ty < D.ROOM_H - 1; ty++) {
          for (let tx = 1; tx < D.ROOM_W - 1; tx++) {
            if (U.dist(p.x, p.y, tx * TS + 8, ty * TS + 8) <= 76) {
              G.Combat.applyElementToTile(this, room, tx, ty, 'ice');
            }
          }
        }
        for (const en of (room.activeEnemies || [])) {
          if (U.dist(p.x, p.y, en.x, en.y) <= 82) {
            G.Combat.damageEnemy(this, en, power * 0.85, 'ice', 0, 0, false);
            G.Combat.applyStatus(en, 'freeze', 3.5, 0);
          }
        }
      } else if (spell === 'lightning_storm') {
        G.AudioEngine.playSFX('shock');
        for (const en of (room.activeEnemies || [])) {
          this.spawnParticles(en.x, en.y, P.yellow, 14, 70);
          G.Combat.damageEnemy(this, en, power * 1.1, 'lightning', 0, 0, true);
          G.Combat.applyStatus(en, 'stun', 1.4, 0);
        }
      }
    },

    equipItem(invIndex) {
      const p = this.player;
      const item = p.inventory[invIndex];
      if (!item || item.slot === 'consumable') return;

      let targetSlot = item.slot;
      if (item.slot === 'relic') {
        targetSlot = !p.equip.relic1 ? 'relic1' : (!p.equip.relic2 ? 'relic2' : 'relic1');
      }

      const prev = p.equip[targetSlot];
      p.equip[targetSlot] = item;
      p.inventory.splice(invIndex, 1);
      if (prev) p.inventory.push(prev);

      p.hp = Math.min(p.hp, p.getMaxHp());
      p.mp = Math.min(p.mp, p.getMaxMp());
      G.AudioEngine.playSFX('uiConfirm');
      G.UI.dirty = true;
    },

    salvageItem(invIndex) {
      const p = this.player;
      const item = p.inventory[invIndex];
      if (!item) return;
      if (item.slot === 'consumable') {
        const g = Math.max(4, Math.round((item.value || 12) * 0.45));
        p.gold += g;
        if ((item.qty || 1) > 1) item.qty -= 1;
        else p.inventory.splice(invIndex, 1);
        G.AudioEngine.playSFX('coin');
        G.UI.dirty = true;
        return;
      }

      const rarGold = { comum: 8, incomum: 14, raro: 24, epico: 38, lendario: 60 };
      p.gold += rarGold[item.rarity] || 10;
      const el = (item.element && item.element !== 'physical') ? item.element : 'arcane';
      p.shards[el] = (p.shards[el] || 0) + 1;
      p.inventory.splice(invIndex, 1);
      G.AudioEngine.playSFX('craft');
      G.UI.dirty = true;
    },

    recordCodexEnemy(tplId) {
      if (!this.meta.codexEnemies[tplId]) {
        this.meta.codexEnemies[tplId] = 1;
      } else {
        this.meta.codexEnemies[tplId] += 1;
      }
      this.saveMeta();
    },

    triggerGameOver() {
      this.state = 'gameover';
      const souls = Math.max(3, this.player.soulsEarned + this.floor * 4 + Math.floor(this.stats.kills / 4));
      this.meta.souls += souls;
      this.clearSavedRun();
      this.saveMeta();
      G.AudioEngine.stopMusic();
      G.AudioEngine.playSFX('gameOver');
      G.UI.showGameOverModal(souls);
    },

    // ========================================================================
    // PARTÍCULAS, TEXTOS & COLISÃO AUXILIAR
    // ========================================================================
    isPointBlocked(px, py, radius = 5) {
      const room = this.currentRoom;
      for (const [ox, oy] of [[-radius, -radius], [radius, -radius], [-radius, radius], [radius, radius]]) {
        const tx = Math.floor((px + ox) / TS);
        const ty = Math.floor((py + oy) / TS);
        if (tx <= 0 || ty <= 0 || tx >= D.ROOM_W - 1 || ty >= D.ROOM_H - 1) return true;
        if (D.isSolidTile(D.getTile(room, tx, ty))) return true;
      }
      return false;
    },

    spawnParticles(x, y, color, count = 8, speed = 60) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = (0.3 + Math.random() * 0.7) * speed;
        const life = 0.18 + Math.random() * 0.28;
        this.particles.push({
          x, y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          color,
          life,
          maxLife: life,
          size: Math.random() < 0.5 ? 2 : 3
        });
      }
    },

    addFloatingText(x, y, text, color = P.white) {
      this.floatingTexts.push({
        x, y,
        text: String(text),
        color,
        life: 0.85,
        vy: -20
      });
    },

    _updateParticlesAndText(dt) {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const pt = this.particles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.life -= dt;
        if (pt.life <= 0) this.particles.splice(i, 1);
      }
      for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
        const ft = this.floatingTexts[i];
        ft.y += ft.vy * dt;
        ft.vy *= 0.94;
        ft.life -= dt;
        if (ft.life <= 0) this.floatingTexts.splice(i, 1);
      }
    },

    // ========================================================================
    // RENDERIZAÇÃO PIXEL-PERFECT (384x240)
    // ========================================================================
    render() {
      const ctx = this.ctx;
      ctx.fillStyle = P.black;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      if (!this.currentRoom || !this.player) return;

      ctx.save();
      if (this.shake > 0) {
        const sx = Math.round((Math.random() - 0.5) * this.shake);
        const sy = Math.round((Math.random() - 0.5) * this.shake);
        ctx.translate(sx, sy);
      }

      const room = this.currentRoom;
      const biome = room.biome;
      const animFrame = Math.floor(this.elapsed * 4) % 2;

      // 1. Tiles do chão e paredes
      this._renderTiles(ctx, room, biome, animFrame);

      // 2. Hazards de chão (fogo, nuvem venenosa)
      for (const h of this.hazards) {
        if (h.type === 'fire') {
          ctx.fillStyle = animFrame ? P.orange : P.red;
          ctx.fillRect(Math.round(h.x - 5), Math.round(h.y - 5), 10, 10);
          ctx.fillStyle = P.yellow;
          ctx.fillRect(Math.round(h.x - 2), Math.round(h.y - 3), 4, 5);
        } else if (h.type === 'poison_cloud') {
          ctx.fillStyle = 'rgba(184, 248, 72, 0.32)';
          ctx.beginPath();
          ctx.arc(Math.round(h.x), Math.round(h.y), h.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 3. Drops no chão
      for (const d of this.drops) {
        const dy = Math.round(d.y + Math.sin(d.bob) * 2);
        const dx = Math.round(d.x);
        if (d.type === 'gold') {
          const sp = G.SpriteBank.get('item_coin');
          if (sp) ctx.drawImage(sp, dx - 6, dy - 6, 12, 12);
        } else if (d.type === 'hp_orb') {
          ctx.fillStyle = P.red;
          ctx.fillRect(dx - 3, dy - 3, 6, 6);
          ctx.fillStyle = P.white;
          ctx.fillRect(dx - 1, dy - 2, 2, 2);
        } else if (d.type === 'bomb') {
          const sp = G.SpriteBank.get('item_bomb');
          if (sp) ctx.drawImage(sp, dx - 7, dy - 7, 14, 14);
        } else if (d.type === 'key') {
          const sp = G.SpriteBank.get('item_key');
          if (sp) ctx.drawImage(sp, dx - 7, dy - 7, 14, 14);
        } else if (d.type === 'boss_key') {
          const sp = G.SpriteBank.get('item_boss_key');
          if (sp) ctx.drawImage(sp, dx - 8, dy - 8, 16, 16);
        } else if (d.type === 'shard') {
          const sp = G.SpriteBank.get('shard_' + d.payload);
          if (sp) ctx.drawImage(sp, dx - 7, dy - 7, 14, 14);
        } else if (d.type === 'item') {
          ctx.fillStyle = d.payload.rarityColor || P.white;
          ctx.fillRect(dx - 6, dy + 3, 12, 2);
          const sp = G.SpriteBank.get(d.payload.icon);
          if (sp) ctx.drawImage(sp, dx - 7, dy - 7, 14, 14);
        }
      }

      // 4. Bombas piscantes
      for (const b of this.bombs) {
        const blink = b.timer < 0.5 && Math.floor(this.elapsed * 16) % 2 === 0;
        const sp = blink ? G.SpriteBank.getFlash('item_bomb') : G.SpriteBank.get('item_bomb');
        if (sp) ctx.drawImage(sp, Math.round(b.x - 8), Math.round(b.y - 8));
      }

      // 5. Inimigos
      for (const en of (room.activeEnemies || [])) {
        this._renderEnemy(ctx, en, animFrame);
      }

      // 6. Jogador & Arco de Ataque
      this._renderPlayer(ctx, animFrame);

      // 7. Projéteis
      for (const pr of this.projectiles) {
        ctx.fillStyle = P.black;
        ctx.fillRect(Math.round(pr.x - pr.radius - 1), Math.round(pr.y - pr.radius - 1), pr.radius * 2 + 2, pr.radius * 2 + 2);
        ctx.fillStyle = pr.color || P.white;
        ctx.fillRect(Math.round(pr.x - pr.radius), Math.round(pr.y - pr.radius), pr.radius * 2, pr.radius * 2);
        ctx.fillStyle = P.white;
        ctx.fillRect(Math.round(pr.x - 1), Math.round(pr.y - 1), 2, 2);
      }

      // 8. Partículas
      for (const pt of this.particles) {
        ctx.fillStyle = pt.color;
        ctx.fillRect(Math.round(pt.x), Math.round(pt.y), pt.size, pt.size);
      }

      // 9. Iluminação 8-bit sutil (escurecimento radial nos cantos distantes do herói)
      this._renderLighting(ctx, room, biome);

      // 10. Textos flutuantes pixel-art
      for (const ft of this.floatingTexts) {
        G.drawPixelText(ctx, ft.text, ft.x, ft.y, ft.color, P.black, 'center', 1);
      }

      // 11. Barra de Chefe no rodapé do canvas
      const boss = (room.activeEnemies || []).find(e => e.isBoss && e.hp > 0);
      if (boss) {
        this._renderBossBar(ctx, boss);
      }

      // 12. Banner de sala / andar
      if (this.roomBanner.timer > 0) {
        ctx.fillStyle = 'rgba(8, 8, 12, 0.82)';
        ctx.fillRect(52, 16, CANVAS_W - 104, 28);
        ctx.strokeStyle = P.gold;
        ctx.strokeRect(52.5, 16.5, CANVAS_W - 105, 27);
        G.drawPixelText(ctx, this.roomBanner.text, CANVAS_W / 2, 22, P.gold, P.black, 'center', 1);
        if (this.roomBanner.sub) {
          G.drawPixelText(ctx, this.roomBanner.sub, CANVAS_W / 2, 32, P.lightGray, P.black, 'center', 1);
        }
      }

      ctx.restore();
    },

    _renderTiles(ctx, room, biome, animFrame) {
      for (let ty = 0; ty < D.ROOM_H; ty++) {
        for (let tx = 0; tx < D.ROOM_W; tx++) {
          const t = D.getTile(room, tx, ty);
          const px = tx * TS;
          const py = ty * TS;

          // Chão base
          ctx.fillStyle = (tx + ty) % 2 === 0 ? biome.floorA : biome.floorB;
          ctx.fillRect(px, py, TS, TS);
          if (t === TILE.FLOOR_ALT) {
            ctx.fillStyle = biome.floorAccent;
            ctx.fillRect(px + 2, py + 2, 4, 4);
            ctx.fillRect(px + 10, py + 9, 3, 3);
          }

          if (t === TILE.WALL || t === TILE.CRACKED_WALL) {
            ctx.fillStyle = biome.wallTop;
            ctx.fillRect(px, py, TS, 10);
            ctx.fillStyle = biome.wallFace;
            ctx.fillRect(px, py + 10, TS, 6);
            ctx.fillStyle = biome.wallTrim;
            ctx.fillRect(px, py, TS, 2);
            ctx.fillRect(px, py + 10, TS, 1);
            if (t === TILE.CRACKED_WALL) {
              // Rachadura visível sutil para indicar parede bombardeável
              ctx.fillStyle = P.black;
              ctx.fillRect(px + 6, py + 3, 2, 5);
              ctx.fillRect(px + 8, py + 7, 3, 4);
              ctx.fillRect(px + 5, py + 10, 3, 3);
            }
          } else if (t === TILE.DOOR_OPEN || t === TILE.DOOR_SECRET) {
            ctx.fillStyle = t === TILE.DOOR_SECRET ? P.darkPurple : P.black;
            ctx.fillRect(px + 1, py + 1, TS - 2, TS - 2);
            ctx.fillStyle = t === TILE.DOOR_SECRET ? P.violet : biome.wallTrim;
            ctx.fillRect(px, py, 2, TS);
            ctx.fillRect(px + TS - 2, py, 2, TS);
          } else if (t === TILE.DOOR_LOCKED || t === TILE.DOOR_BOSS) {
            ctx.fillStyle = t === TILE.DOOR_BOSS ? P.darkRed : P.darkBrown;
            ctx.fillRect(px, py, TS, TS);
            ctx.fillStyle = t === TILE.DOOR_BOSS ? P.gold : P.ochre;
            ctx.fillRect(px + 3, py + 3, TS - 6, TS - 6);
            ctx.fillStyle = P.black;
            ctx.fillRect(px + 7, py + 6, 2, 4);
          } else if (t === TILE.WATER) {
            ctx.fillStyle = P.darkBlue;
            ctx.fillRect(px, py, TS, TS);
            ctx.fillStyle = P.blue;
            ctx.fillRect(px + (animFrame ? 2 : 5), py + 4, 6, 2);
            ctx.fillRect(px + (animFrame ? 8 : 3), py + 10, 5, 2);
          } else if (t === TILE.ICE) {
            ctx.fillStyle = P.sky;
            ctx.fillRect(px, py, TS, TS);
            ctx.fillStyle = P.ice;
            ctx.fillRect(px + 2, py + 2, 6, 2);
            ctx.fillRect(px + 9, py + 10, 4, 2);
          } else if (t === TILE.OIL) {
            ctx.fillStyle = P.ink;
            ctx.fillRect(px + 1, py + 1, TS - 2, TS - 2);
            ctx.fillStyle = P.darkPurple;
            ctx.fillRect(px + 4, py + 4, 5, 2);
          } else if (t === TILE.LAVA) {
            ctx.fillStyle = P.red;
            ctx.fillRect(px, py, TS, TS);
            ctx.fillStyle = animFrame ? P.orange : P.yellow;
            ctx.fillRect(px + 3, py + 4, 6, 4);
            ctx.fillRect(px + 9, py + 10, 4, 3);
          } else if (t === TILE.SPIKES) {
            ctx.fillStyle = P.darkGray;
            ctx.fillRect(px + 2, py + 2, TS - 4, TS - 4);
            if (this.spikeActive) {
              ctx.fillStyle = P.white;
              ctx.fillRect(px + 3, py + 3, 3, 5);
              ctx.fillRect(px + 10, py + 3, 3, 5);
              ctx.fillRect(px + 3, py + 9, 3, 5);
              ctx.fillRect(px + 10, py + 9, 3, 5);
            } else {
              ctx.fillStyle = P.black;
              ctx.fillRect(px + 4, py + 4, 2, 2);
              ctx.fillRect(px + 10, py + 4, 2, 2);
              ctx.fillRect(px + 4, py + 10, 2, 2);
              ctx.fillRect(px + 10, py + 10, 2, 2);
            }
          } else if (t === TILE.PLATE) {
            ctx.fillStyle = P.gray;
            ctx.fillRect(px + 2, py + 2, TS - 4, TS - 4);
            ctx.fillStyle = P.cyan;
            ctx.fillRect(px + 5, py + 5, 6, 6);
          } else if (t === TILE.BLOCK) {
            ctx.drawImage(G.SpriteBank.get('obj_block'), px, py);
          } else if (t === TILE.STAIRS_DOWN) {
            ctx.drawImage(G.SpriteBank.get('obj_stairs'), px, py);
          } else if (t === TILE.CHEST) {
            const chest = room.chests[`${tx},${ty}`];
            const sp = G.SpriteBank.get(chest?.opened ? 'obj_chest_open' : 'obj_chest_closed');
            ctx.drawImage(sp, px, py);
          } else if (t === TILE.BARREL) {
            ctx.drawImage(G.SpriteBank.get('obj_barrel'), px, py);
          } else if (t === TILE.BARREL_EXP) {
            ctx.drawImage(G.SpriteBank.get('obj_barrel_exp'), px, py);
          } else if (t === TILE.TORCH) {
            ctx.drawImage(G.SpriteBank.get('obj_torch_' + animFrame), px, py);
          } else if (t === TILE.ANVIL) {
            ctx.drawImage(G.SpriteBank.get('obj_anvil'), px, py);
            G.drawPixelText(ctx, '[E] FORJA', px + 8, py - 6, P.cyan, P.black, 'center', 1);
          } else if (t === TILE.SHRINE) {
            ctx.drawImage(G.SpriteBank.get('obj_shrine'), px, py);
            if (!room.shrineUsed) G.drawPixelText(ctx, '[E] BÊNÇÃO', px + 8, py - 6, P.gold, P.black, 'center', 1);
          } else if (t === TILE.CAMPFIRE) {
            ctx.drawImage(G.SpriteBank.get('obj_campfire_' + animFrame), px, py);
            if (!room.campfireUsed) G.drawPixelText(ctx, '[E] CURA', px + 8, py - 6, P.orange, P.black, 'center', 1);
          } else if (t === TILE.MERCHANT) {
            ctx.drawImage(G.SpriteBank.get('obj_merchant'), px, py);
            G.drawPixelText(ctx, '[E] LOJA', px + 8, py - 6, P.gold, P.black, 'center', 1);
          } else if (t === TILE.LORE_TABLET) {
            ctx.fillStyle = P.gray;
            ctx.fillRect(px + 3, py + 2, 10, 12);
            ctx.fillStyle = P.cyan;
            ctx.fillRect(px + 5, py + 5, 6, 2);
            ctx.fillRect(px + 5, py + 9, 6, 2);
            G.drawPixelText(ctx, '[E] LER', px + 8, py - 6, P.lightGray, P.black, 'center', 1);
          }
        }
      }
    },

    _renderEnemy(ctx, en, animFrame) {
      const spId = `${en.sprite}_${animFrame}`;
      const sp = en.hitFlash > 0 ? G.SpriteBank.getFlash(spId) : G.SpriteBank.get(spId);
      const size = en.isBoss ? 24 : (en.mini ? 12 : 16);
      const drawX = Math.round(en.x - size / 2);
      const drawY = Math.round(en.y - size / 2);

      // Sombra pixelada
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(Math.round(en.x - size * 0.35), Math.round(en.y + size * 0.32), Math.round(size * 0.7), 3);

      // Aura de Elite / Chave do Chefe
      if (en.dropsBossKey) {
        ctx.strokeStyle = P.gold;
        ctx.strokeRect(drawX - 1.5, drawY - 1.5, size + 3, size + 3);
      } else if (en.elite) {
        ctx.strokeStyle = P.violet;
        ctx.strokeRect(drawX - 1.5, drawY - 1.5, size + 3, size + 3);
      }

      if (sp) ctx.drawImage(sp, drawX, drawY, size, size);

      // Congelamento visual
      if (en.statuses.freeze) {
        ctx.fillStyle = 'rgba(180, 244, 252, 0.45)';
        ctx.fillRect(drawX, drawY, size, size);
      }

      // Telegrafagem de ataque (!)
      if (en.state === 'windup') {
        G.drawPixelText(ctx, '!', en.x, drawY - 8, P.red, P.black, 'center', 1);
      }

      // Barra de vida compacta para inimigos normais feridos
      if (!en.isBoss && en.hp < en.maxHp) {
        const bw = 14;
        const bx = Math.round(en.x - bw / 2);
        const by = drawY - 4;
        ctx.fillStyle = P.black;
        ctx.fillRect(bx - 1, by - 1, bw + 2, 4);
        ctx.fillStyle = P.red;
        ctx.fillRect(bx, by, Math.max(1, Math.round((en.hp / en.maxHp) * bw)), 2);
      }
    },

    _renderPlayer(ctx, animFrame) {
      const p = this.player;
      if (p.iFrames > 0 && Math.floor(this.elapsed * 20) % 2 === 0) {
        // Pisca durante invulnerabilidade
      } else {
        const moving = p.moveX !== 0 || p.moveY !== 0;
        const sp = G.SpriteBank.get(`${p.classDef.spritePrefix}_${moving ? animFrame : 0}`);
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(Math.round(p.x - 5), Math.round(p.y + 5), 10, 3);
        if (sp) ctx.drawImage(sp, Math.round(p.x - 8), Math.round(p.y - 8));
      }

      // Escudo erguido / Janela de Parry brilhante
      if (p.blocking) {
        ctx.strokeStyle = p.parryTimer > 0 ? P.cyan : P.gold;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(Math.round(p.x), Math.round(p.y), 10, p.aimAngle - 1.1, p.aimAngle + 1.1);
        ctx.stroke();
        ctx.lineWidth = 1;
      }

      // Arco de corte corpo-a-corpo
      if (p.slashEffect) {
        const s = p.slashEffect;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(Math.round(p.x), Math.round(p.y), s.reach * 0.72, s.angle - s.arc * 0.5, s.angle + s.arc * 0.5);
        ctx.stroke();
        ctx.lineWidth = 1;
      }
    },

    _renderLighting(ctx, room, biome) {
      const p = this.player;
      const grad = ctx.createRadialGradient(p.x, p.y, 48, p.x, p.y, 210);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, `rgba(8, 8, 14, ${biome.ambientDarkness})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    },

    _renderBossBar(ctx, boss) {
      const bw = 220;
      const bx = Math.round((CANVAS_W - bw) / 2);
      const by = CANVAS_H - 18;
      ctx.fillStyle = P.black;
      ctx.fillRect(bx - 2, by - 2, bw + 4, 10);
      ctx.fillStyle = P.darkRed;
      ctx.fillRect(bx, by, bw, 6);
      ctx.fillStyle = boss.phase === 2 ? P.orange : P.red;
      ctx.fillRect(bx, by, Math.max(2, Math.round((boss.hp / boss.maxHp) * bw)), 6);
      G.drawPixelText(ctx, boss.name.toUpperCase(), CANVAS_W / 2, by - 8, P.gold, P.black, 'center', 1);
    },

    // ========================================================================
    // INPUTS TECLADO & MOUSE
    // ========================================================================
    _bindInputs() {
      window.addEventListener('keydown', (e) => {
        G.AudioEngine.unlock();
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) {
          if (this.state === 'playing') e.preventDefault();
        }
        this.keys[e.code] = true;

        if (e.code === 'Escape' || e.code === 'KeyP') {
          G.UI.togglePause();
          return;
        }
        if (e.code === 'KeyI' || e.code === 'Tab') {
          if (this.state === 'playing' || G.UI.activeModal === 'inventory') {
            e.preventDefault();
            G.UI.toggleModal('inventory');
          }
          return;
        }
        if (e.code === 'KeyC') {
          if (this.state === 'playing' || G.UI.activeModal === 'codex') {
            G.UI.toggleModal('codex');
          }
          return;
        }

        if (this.state !== 'playing') return;
        this.mouse.active = false;

        if (e.code === 'KeyJ' || e.code === 'KeyZ') G.Combat.triggerAttack(this);
        else if (e.code === 'KeyK' || e.code === 'KeyX' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') G.Combat.triggerDash(this);
        else if (e.code === 'Space') G.Combat.triggerBlockStart(this);
        else if (e.code === 'KeyL' || e.code === 'KeyQ') G.Combat.triggerSkill(this);
        else if (e.code === 'KeyB' || e.code === 'KeyV') G.Combat.placeBomb(this);
        else if (e.code === 'KeyE' || e.code === 'Enter') this.interact();
        else if (e.code === 'Digit1') this.useConsumable('cons_hp_pot');
        else if (e.code === 'Digit2') this.useConsumable('cons_mp_pot');
        else if (e.code === 'Digit3') this.useConsumable('cons_elixir');
        else if (e.code === 'Digit4') {
          const p = this.player;
          const scrollIdx = p.inventory.findIndex(it => it.slot === 'consumable' && it.spell);
          if (scrollIdx !== -1) this.useConsumable(scrollIdx);
        }
      });

      window.addEventListener('keyup', (e) => {
        this.keys[e.code] = false;
        if (e.code === 'Space' && this.player) G.Combat.triggerBlockEnd(this);
      });

      this.canvas.addEventListener('mousemove', (e) => {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * CANVAS_W;
        this.mouse.y = ((e.clientY - rect.top) / rect.height) * CANVAS_H;
        this.mouse.active = true;
      });

      this.canvas.addEventListener('mousedown', (e) => {
        G.AudioEngine.unlock();
        if (this.state !== 'playing') return;
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * CANVAS_W;
        this.mouse.y = ((e.clientY - rect.top) / rect.height) * CANVAS_H;
        this.mouse.active = true;
        this.player.aimAngle = Math.atan2(this.mouse.y - this.player.y, this.mouse.x - this.player.x);

        if (e.button === 0) G.Combat.triggerAttack(this);
        else if (e.button === 2) G.Combat.triggerSkill(this);
      });

      this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
  };

  G.Game = GameEngine;
})(window.Game8Bit);
