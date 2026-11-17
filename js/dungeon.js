// ============================================================================
// CRÔNICAS DO ABISMO 8-BIT — Gerador Procedural de Masmorras & Salas (24x15)
// ============================================================================

window.Game8Bit = window.Game8Bit || {};

(function (G) {
  'use strict';

  const ROOM_W = 24;
  const ROOM_H = 15;
  const TILE_SIZE = 16;

  const TILE = {
    VOID: 0,
    FLOOR: 1,
    FLOOR_ALT: 2,
    WALL: 3,
    CRACKED_WALL: 4,
    DOOR_OPEN: 5,
    DOOR_LOCKED: 6,
    DOOR_BOSS: 7,
    DOOR_SECRET: 8,
    STAIRS_DOWN: 9,
    WATER: 10,
    ICE: 11,
    OIL: 12,
    LAVA: 13,
    SPIKES: 14,
    BLOCK: 15,
    PLATE: 16,
    CHEST: 17,
    BARREL: 18,
    BARREL_EXP: 19,
    TORCH: 20,
    ANVIL: 21,
    SHRINE: 22,
    CAMPFIRE: 23,
    MERCHANT: 24,
    LORE_TABLET: 25
  };

  const SOLID_TILES = new Set([
    TILE.WALL,
    TILE.CRACKED_WALL,
    TILE.DOOR_LOCKED,
    TILE.DOOR_BOSS,
    TILE.BLOCK,
    TILE.CHEST,
    TILE.BARREL,
    TILE.BARREL_EXP,
    TILE.TORCH,
    TILE.ANVIL,
    TILE.SHRINE,
    TILE.CAMPFIRE,
    TILE.MERCHANT,
    TILE.LORE_TABLET
  ]);

  const DIRS = {
    N: { dx: 0, dy: -1, opp: 'S', doorX: 11, doorY: 0, doorX2: 12, doorY2: 0 },
    S: { dx: 0, dy: 1, opp: 'N', doorX: 11, doorY: 14, doorX2: 12, doorY2: 14 },
    W: { dx: -1, dy: 0, opp: 'E', doorX: 0, doorY: 7, doorX2: 0, doorY2: 7 },
    E: { dx: 1, dy: 0, opp: 'W', doorX: 23, doorY: 7, doorX2: 23, doorY2: 7 }
  };

  function isSolidTile(tile) {
    return SOLID_TILES.has(tile);
  }

  function isWalkableForEnemy(tile, flying) {
    if (SOLID_TILES.has(tile)) return false;
    if (!flying && tile === TILE.LAVA) return false;
    return true;
  }

  function getDoorCoords(dir) {
    if (dir === 'N') return [{ x: 11, y: 0 }, { x: 12, y: 0 }];
    if (dir === 'S') return [{ x: 11, y: 14 }, { x: 12, y: 14 }];
    if (dir === 'W') return [{ x: 0, y: 7 }, { x: 0, y: 8 }];
    return [{ x: 23, y: 7 }, { x: 23, y: 8 }];
  }

  function getEntryPos(fromDir) {
    // Posição segura do jogador ao entrar na sala vindo da direção oposta (folga de 2 tiles da porta)
    if (fromDir === 'N') return { x: 12 * TILE_SIZE, y: 1.85 * TILE_SIZE };
    if (fromDir === 'S') return { x: 12 * TILE_SIZE, y: 13.05 * TILE_SIZE };
    if (fromDir === 'W') return { x: 1.85 * TILE_SIZE, y: 7.8 * TILE_SIZE };
    if (fromDir === 'E') return { x: 22.15 * TILE_SIZE, y: 7.8 * TILE_SIZE };
    return { x: 12 * TILE_SIZE, y: 7.5 * TILE_SIZE };
  }

  function createEmptyGrid(rng) {
    const tiles = new Array(ROOM_W * ROOM_H);
    for (let y = 0; y < ROOM_H; y++) {
      for (let x = 0; x < ROOM_W; x++) {
        const isBorder = x === 0 || y === 0 || x === ROOM_W - 1 || y === ROOM_H - 1;
        tiles[y * ROOM_W + x] = isBorder
          ? TILE.WALL
          : (rng.chance(0.18) ? TILE.FLOOR_ALT : TILE.FLOOR);
      }
    }
    return tiles;
  }

  function setTile(room, x, y, t) {
    if (x < 0 || y < 0 || x >= ROOM_W || y >= ROOM_H) return;
    room.tiles[y * ROOM_W + x] = t;
  }

  function getTile(room, x, y) {
    if (x < 0 || y < 0 || x >= ROOM_W || y >= ROOM_H) return TILE.WALL;
    return room.tiles[y * ROOM_W + x];
  }

  function generateFloor(rng, floorNum, difficultyCfg) {
    const GRID = 8;
    const biomeIdx = (floorNum - 1) % G.GameData.BIOMES.length;
    const biome = G.GameData.BIOMES[biomeIdx];
    const loopScale = 1 + Math.floor((floorNum - 1) / G.GameData.BIOMES.length) * 0.75;
    const floorHpScale = Math.pow(1.24, floorNum - 1);
    const floorDmgScale = Math.pow(1.14, floorNum - 1);
    const targetRooms = Math.min(24, 9 + floorNum * 2 + (difficultyCfg.roomBonus || 0));

    const grid = {};
    const keyOf = (gx, gy) => `${gx},${gy}`;

    const startGx = 4;
    const startGy = 4;

    const makeRoomObj = (gx, gy, type) => ({
      id: keyOf(gx, gy),
      gx,
      gy,
      type,
      biome,
      floorNum,
      neighbors: {}, // dir -> { roomId, lock: 'none'|'key'|'boss'|'secret' }
      tiles: null,
      enemies: [],
      chests: {}, // "x,y" -> { opened, loot, gold, mimic }
      plates: [],
      puzzleKind: null,
      puzzleStep: 0,
      puzzleTimer: 0,
      puzzleTimerLimit: 0,
      puzzleBlocks: [],
      hasPuzzleReset: false,
      puzzleSolved: false,
      shopItems: [],
      shrineUsed: false,
      campfireUsed: false,
      loreId: null,
      loreTitle: '',
      loreText: '',
      visited: false,
      cleared: false,
      revealed: false,
      lockedCombat: false,
      bossSpawned: false,
      bossDefeated: false,
      hasBossKey: false
    });

    grid[keyOf(startGx, startGy)] = makeRoomObj(startGx, startGy, 'start');
    const coordsList = [{ gx: startGx, gy: startGy }];

    // Expansão estilo Isaac/Zelda com ramificações equilibradas
    let safety = 0;
    while (coordsList.length < targetRooms && safety++ < 400) {
      const base = rng.pick(coordsList);
      const dirKey = rng.pick(['N', 'S', 'E', 'W']);
      const d = DIRS[dirKey];
      const nx = base.gx + d.dx;
      const ny = base.gy + d.dy;
      if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) continue;
      const nKey = keyOf(nx, ny);
      if (grid[nKey]) continue;

      // Evita aglomerar 2x2 blocos sólidos para manter layout de labirinto legível
      let adjCount = 0;
      for (const dk of ['N', 'S', 'E', 'W']) {
        if (grid[keyOf(nx + DIRS[dk].dx, ny + DIRS[dk].dy)]) adjCount++;
      }
      if (adjCount > 1 && rng.chance(0.75)) continue;

      const newRoom = makeRoomObj(nx, ny, 'combat');
      grid[nKey] = newRoom;
      coordsList.push({ gx: nx, gy: ny });

      const baseRoom = grid[keyOf(base.gx, base.gy)];
      baseRoom.neighbors[dirKey] = { roomId: nKey, lock: 'none' };
      newRoom.neighbors[d.opp] = { roomId: baseRoom.id, lock: 'none' };
    }

    // Adiciona 1 sala secreta conectada a uma sala adjacente vazia
    let secretAdded = false;
    for (const c of rng.shuffle(coordsList)) {
      if (secretAdded) break;
      const parent = grid[keyOf(c.gx, c.gy)];
      if (parent.type === 'start') continue;
      for (const dk of rng.shuffle(['N', 'S', 'E', 'W'])) {
        const d = DIRS[dk];
        const sx = c.gx + d.dx;
        const sy = c.gy + d.dy;
        if (sx < 0 || sy < 0 || sx >= GRID || sy >= GRID) continue;
        const sKey = keyOf(sx, sy);
        if (!grid[sKey]) {
          const secRoom = makeRoomObj(sx, sy, 'secret');
          grid[sKey] = secRoom;
          parent.neighbors[dk] = { roomId: sKey, lock: 'secret' };
          secRoom.neighbors[d.opp] = { roomId: parent.id, lock: 'secret' };
          secretAdded = true;
          break;
        }
      }
    }

    // Calcular distância BFS a partir de start (ignorando secret)
    const distMap = {};
    const bfsQueue = [keyOf(startGx, startGy)];
    distMap[keyOf(startGx, startGy)] = 0;
    let head = 0;
    while (head < bfsQueue.length) {
      const curId = bfsQueue[head++];
      const cur = grid[curId];
      for (const dk of Object.keys(cur.neighbors)) {
        const nb = cur.neighbors[dk];
        if (nb.lock === 'secret') continue;
        if (distMap[nb.roomId] === undefined) {
          distMap[nb.roomId] = distMap[curId] + 1;
          bfsQueue.push(nb.roomId);
        }
      }
    }

    // Ordenar salas não-start por distância decrescente
    const nonStart = Object.values(grid)
      .filter(r => r.type !== 'start' && r.type !== 'secret')
      .sort((a, b) => (distMap[b.id] || 0) - (distMap[a.id] || 0));

    // Sala do Chefe: folha mais distante possível
    const leafRooms = nonStart.filter(r =>
      Object.values(r.neighbors).filter(n => n.lock !== 'secret').length === 1
    );
    const bossRoom = leafRooms[0] || nonStart[0];
    bossRoom.type = 'boss';

    // Tranca porta entrando na sala do chefe com DOOR_BOSS
    for (const dk of Object.keys(bossRoom.neighbors)) {
      const nb = bossRoom.neighbors[dk];
      if (nb.lock === 'secret') continue;
      nb.lock = 'boss';
      const parent = grid[nb.roomId];
      if (parent && parent.neighbors[DIRS[dk].opp]) {
        parent.neighbors[DIRS[dk].opp].lock = 'boss';
      }
    }

    // Atribuir salas especiais em salas livres
    const available = nonStart.filter(r => r.type === 'combat' && r.id !== bossRoom.id);
    const assignSpecial = (type) => {
      if (available.length <= 1) return null;
      // Preferir folhas para treasure/shop/shrine, ou qualquer meio para forge
      let idx = available.findIndex(r => Object.values(r.neighbors).filter(n => n.lock !== 'secret').length === 1);
      if (idx === -1 || type === 'forge') idx = Math.floor(available.length / 2);
      const picked = available.splice(idx, 1)[0];
      picked.type = type;
      return picked;
    };

    const shopRoom = assignSpecial('shop');
    const forgeRoom = assignSpecial('forge');
    const shrineRoom = assignSpecial('shrine');
    const treasureRoom = assignSpecial('treasure');

    const puzzleCount = Math.max(1, difficultyCfg.puzzleRooms || 1);
    const puzzleKinds = ['blocks', 'sequence', 'timed'];
    for (let pi = 0; pi < puzzleCount; pi++) {
      const pr = assignSpecial('puzzle');
      if (!pr) break;
      const diffId = difficultyCfg.id || 'normal';
      if (diffId === 'normal') pr.puzzleKind = pi === 0 && floorNum % 2 === 0 ? 'sequence' : 'blocks';
      else pr.puzzleKind = puzzleKinds[(pi + floorNum) % puzzleKinds.length];
    }

    // Trancar Sala do Tesouro (se for folha para não bloquear avanço!)
    if (treasureRoom) {
      const normalLinks = Object.keys(treasureRoom.neighbors).filter(k => treasureRoom.neighbors[k].lock === 'none');
      if (normalLinks.length === 1) {
        const dk = normalLinks[0];
        treasureRoom.neighbors[dk].lock = 'key';
        const parent = grid[treasureRoom.neighbors[dk].roomId];
        if (parent) parent.neighbors[DIRS[dk].opp].lock = 'key';
      }
    }

    // Garantir uma sala acessível (antes do Boss/Treasure) com o Guardião da Chave do Chefe
    const reachableForKey = Object.values(grid).filter(r =>
      r.type === 'combat' && r.id !== bossRoom.id
    );
    const guardianRoom = reachableForKey.length > 0
      ? reachableForKey[Math.floor(reachableForKey.length / 2)]
      : grid[keyOf(startGx, startGy)];
    guardianRoom.hasBossKey = true;

    // Construir geometria 24x15 e entidades de cada sala
    for (const room of Object.values(grid)) {
      _populateRoom(rng, room, floorNum, loopScale, floorHpScale, floorDmgScale, difficultyCfg);
    }

    const startRoom = grid[keyOf(startGx, startGy)];
    startRoom.visited = true;
    startRoom.revealed = true;
    startRoom.cleared = true;

    return {
      floorNum,
      biome,
      rooms: grid,
      startRoomId: startRoom.id,
      bossRoomId: bossRoom.id,
      guardianRoomId: guardianRoom.id
    };
  }

  function _carveDoors(room) {
    for (const dk of Object.keys(room.neighbors)) {
      const nb = room.neighbors[dk];
      const coords = getDoorCoords(dk);
      let tile = TILE.DOOR_OPEN;
      if (nb.lock === 'key') tile = TILE.DOOR_LOCKED;
      else if (nb.lock === 'boss') tile = TILE.DOOR_BOSS;
      else if (nb.lock === 'secret') tile = TILE.CRACKED_WALL;

      for (const c of coords) {
        setTile(room, c.x, c.y, tile);
        // Garante corredor livre de 2 tiles para dentro da porta (evita spawns dentro de placas/props)
        const dx = c.x === 0 ? 1 : c.x === ROOM_W - 1 ? -1 : 0;
        const dy = c.y === 0 ? 1 : c.y === ROOM_H - 1 ? -1 : 0;
        setTile(room, c.x + dx, c.y + dy, TILE.FLOOR);
        setTile(room, c.x + dx * 2, c.y + dy * 2, TILE.FLOOR);
      }
    }
  }

  function _buildPuzzleRoom(rng, room, floorNum, diff) {
    const corners = [[2, 2], [ROOM_W - 3, 2], [2, ROOM_H - 3], [ROOM_W - 3, ROOM_H - 3]];
    for (const [tx, ty] of corners) setTile(room, tx, ty, TILE.TORCH);

    // Pedestal Rúnico de Reinício em posição segura no canto noroeste (nunca bloqueia portas!)
    setTile(room, 3, 3, TILE.LORE_TABLET);
    room.hasPuzzleReset = true;

    const plateCount = Math.max(2, Math.min(4, diff.puzzlePlates || 2));
    const kind = room.puzzleKind || 'blocks';

    if (kind === 'sequence') {
      const stepCount = Math.min(5, plateCount + 1);
      const positions = rng.shuffle([
        { x: 5, y: 4 },
        { x: 18, y: 4 },
        { x: 5, y: 10 },
        { x: 18, y: 10 },
        { x: 8, y: 5 },
        { x: 15, y: 5 },
        { x: 9, y: 9 },
        { x: 15, y: 9 }
      ]).slice(0, stepCount);

      room.plates = positions.map((pos, idx) => ({
        x: pos.x,
        y: pos.y,
        order: idx + 1,
        active: false
      }));
      for (const pl of room.plates) setTile(room, pl.x, pl.y, TILE.PLATE);

      const hazardTile = diff.id === 'normal' ? TILE.WATER : (diff.id === 'veteran' ? TILE.SPIKES : TILE.LAVA);
      if (diff.id !== 'normal') {
        [[8, 7], [15, 7], [11, 5], [12, 9]].forEach(([hx, hy]) => {
          if (getTile(room, hx, hy) !== TILE.PLATE) setTile(room, hx, hy, hazardTile);
        });
      }
      room.loreTitle = 'ENIGMA DE SEQUÊNCIA';
      room.loreText = `Pise nas ${stepCount} runas na ordem numérica [1 -> ${stepCount}]. Use [E] na pedra rúnica no canto noroeste para reiniciar.`;
    } else if (kind === 'timed') {
      const switchCount = Math.min(4, plateCount + (diff.id === 'normal' ? 1 : 0));
      const positions = [
        { x: 5, y: 4 },
        { x: 18, y: 4 },
        { x: 5, y: 10 },
        { x: 18, y: 10 }
      ].slice(0, switchCount);

      room.plates = positions.map((pos, idx) => ({
        x: pos.x,
        y: pos.y,
        order: idx + 1,
        active: false
      }));
      for (const pl of room.plates) setTile(room, pl.x, pl.y, TILE.PLATE);

      room.puzzleTimerLimit = diff.id === 'descomunal' ? 11.5 : (diff.id === 'nightmare' ? 13.0 : 16.0);
      room.puzzleTimer = 0;

      [[10, 6], [13, 6], [10, 8], [13, 8]].forEach(([wx, wy]) => setTile(room, wx, wy, TILE.WALL));
      if (diff.id === 'nightmare' || diff.id === 'descomunal') {
        [[7, 7], [16, 7]].forEach(([sx, sy]) => setTile(room, sx, sy, TILE.SPIKES));
      }
      room.loreTitle = 'ENIGMA TEMPORIZADO';
      room.loreText = `Ative todas as ${switchCount} runas antes do tempo (${room.puzzleTimerLimit.toFixed(0)}s) acabar!`;
    } else {
      // Blocos + Placas (2 a 4 blocos sempre com folga para empurrar)
      const pairs = [
        { b: { x: 8, y: 7 }, p: { x: 6, y: 4 } },
        { b: { x: 15, y: 7 }, p: { x: 17, y: 10 } },
        { b: { x: 9, y: 10 }, p: { x: 6, y: 10 } },
        { b: { x: 14, y: 4 }, p: { x: 17, y: 4 } }
      ].slice(0, plateCount);

      room.puzzleBlocks = pairs.map(pr => ({ x: pr.b.x, y: pr.b.y }));
      room.plates = pairs.map(pr => ({ x: pr.p.x, y: pr.p.y }));
      for (const pr of pairs) {
        setTile(room, pr.b.x, pr.b.y, TILE.BLOCK);
        setTile(room, pr.p.x, pr.p.y, TILE.PLATE);
      }

      if (plateCount >= 3) {
        setTile(room, 11, 6, TILE.WALL);
        setTile(room, 12, 8, TILE.WALL);
      }
      if (diff.id === 'nightmare' || diff.id === 'descomunal') {
        setTile(room, 11, 8, TILE.SPIKES);
        setTile(room, 12, 6, TILE.SPIKES);
      }
      room.loreTitle = 'ENIGMA DOS BLOCOS';
      room.loreText = `Empurre os ${plateCount} blocos até as placas. Travou um bloco? Aperte [E] na pedra rúnica no canto noroeste para resetar!`;
    }
  }

  function _populateRoom(rng, room, floorNum, loopScale, floorHpScale, floorDmgScale, diff) {
    room.tiles = createEmptyGrid(rng);
    const biome = room.biome;
    const shopMult = diff.shopMult || 1.0;

    // Tochas nos cantos da maioria das salas
    const corners = [[2, 2], [ROOM_W - 3, 2], [2, ROOM_H - 3], [ROOM_W - 3, ROOM_H - 3]];

    if (room.type === 'start') {
      room.cleared = true;
      for (const [tx, ty] of corners) setTile(room, tx, ty, TILE.TORCH);
      setTile(room, 12, 4, TILE.LORE_TABLET);
      const frags = G.GameData.LORE_FRAGMENTS.filter(f => f.floor === ((floorNum - 1) % 6) + 1);
      const frag = frags.length ? rng.pick(frags) : null;
      room.loreId = frag ? frag.id : null;
      room.loreTitle = frag ? frag.title : biome.name;
      room.loreText = frag ? `${frag.text} (${biome.lore})` : `${biome.name}: ${biome.lore}`;
      // Pequenos barris no Andar 1
      if (floorNum === 1) {
        setTile(room, 9, 7, TILE.BARREL);
        setTile(room, 14, 7, TILE.BARREL);
      }
    } else if (room.type === 'shop') {
      room.cleared = true;
      setTile(room, 5, 3, TILE.TORCH);
      setTile(room, 18, 3, TILE.TORCH);
      setTile(room, 12, 4, TILE.MERCHANT);
      // Itens à venda
      room.shopItems = [
        { item: G.GameData.makeTemplateItem('cons_hp_pot'), price: Math.round((18 + floorNum * 4) * shopMult), bought: false },
        { item: G.GameData.makeTemplateItem('cons_mp_pot'), price: Math.round((16 + floorNum * 3) * shopMult), bought: false },
        { type: 'bomb_pack', name: 'Pacote 2 Bombas', icon: 'item_bomb', desc: '+2 Bombas para paredes secretas e dano em área.', price: Math.round(22 * shopMult), bought: false },
        { type: 'key', name: 'Chave de Ferro', icon: 'item_key', desc: 'Abre cofres e portas trancadas.', price: Math.round(25 * shopMult), bought: false },
        { item: G.GameData.generateProceduralLoot(rng, floorNum, 'weapon', floorNum >= 3 ? 'raro' : 'incomum'), price: Math.round((52 + floorNum * 15) * shopMult), bought: false }
      ];
    } else if (room.type === 'forge') {
      room.cleared = true;
      setTile(room, 6, 4, TILE.TORCH);
      setTile(room, 17, 4, TILE.TORCH);
      setTile(room, 10, 7, TILE.CAMPFIRE);
      setTile(room, 14, 7, TILE.ANVIL);
    } else if (room.type === 'shrine') {
      room.cleared = true;
      setTile(room, 5, 4, TILE.TORCH);
      setTile(room, 18, 4, TILE.TORCH);
      setTile(room, 12, 7, TILE.SHRINE);
      const frags = G.GameData.LORE_FRAGMENTS.filter(f => f.floor === ((floorNum - 1) % 6) + 1);
      const frag = frags[1] || frags[0];
      if (frag) {
        setTile(room, 8, 5, TILE.LORE_TABLET);
        room.loreId = frag.id;
        room.loreTitle = frag.title;
        room.loreText = frag.text;
      }
    } else if (room.type === 'puzzle') {
      room.cleared = true;
      _buildPuzzleRoom(rng, room, floorNum, diff);
    } else if (room.type === 'treasure') {
      room.cleared = true;
      for (const [tx, ty] of corners) setTile(room, tx, ty, TILE.TORCH);
      setTile(room, 11, 7, TILE.CHEST);
      setTile(room, 13, 7, TILE.CHEST);
      room.chests['11,7'] = {
        opened: false,
        gold: rng.int(26, 48) + floorNum * 12,
        loot: G.GameData.generateProceduralLoot(rng, floorNum + 1, 'weapon', floorNum >= 4 ? 'epico' : 'raro'),
        mimic: false
      };
      room.chests['13,7'] = {
        opened: false,
        gold: rng.int(18, 34) + floorNum * 6,
        loot: G.GameData.generateProceduralLoot(rng, floorNum, 'relic', 'incomum'),
        mimic: false
      };
    } else if (room.type === 'secret') {
      room.cleared = true;
      setTile(room, 4, 4, TILE.TORCH);
      setTile(room, 19, 4, TILE.TORCH);
      setTile(room, 12, 6, TILE.CHEST);
      room.chests['12,6'] = {
        opened: false,
        gold: rng.int(45, 85) + floorNum * 16,
        loot: G.GameData.generateProceduralLoot(rng, floorNum + 2, null, floorNum >= 4 ? 'lendario' : 'epico'),
        mimic: false
      };
      setTile(room, 10, 9, TILE.BARREL);
      setTile(room, 14, 9, TILE.BARREL);
    } else if (room.type === 'boss') {
      room.cleared = false;
      for (const [tx, ty] of corners) setTile(room, tx, ty, TILE.TORCH);
      // Adiciona elementos interativos na arena do chefe
      if (biome.id === 'forge') {
        setTile(room, 5, 7, TILE.OIL);
        setTile(room, 6, 7, TILE.OIL);
        setTile(room, 18, 7, TILE.OIL);
        setTile(room, 17, 7, TILE.OIL);
        setTile(room, 5, 4, TILE.BARREL_EXP);
        setTile(room, 18, 10, TILE.BARREL_EXP);
      } else if (biome.id === 'library' || biome.id === 'mire') {
        for (let x = 7; x <= 9; x++) setTile(room, x, 5, TILE.WATER);
        for (let x = 14; x <= 16; x++) setTile(room, x, 9, TILE.WATER);
      } else if (biome.id === 'glacier') {
        for (let x = 7; x <= 9; x++) setTile(room, x, 5, TILE.ICE);
        for (let x = 14; x <= 16; x++) setTile(room, x, 9, TILE.ICE);
      } else {
        setTile(room, 6, 5, TILE.WALL);
        setTile(room, 17, 5, TILE.WALL);
        setTile(room, 6, 9, TILE.WALL);
        setTile(room, 17, 9, TILE.WALL);
      }
      room.enemies.push({
        isBoss: true,
        tplId: biome.bossId,
        tx: 12,
        ty: 6,
        elite: false
      });
    } else {
      // Sala de combate procedural rica em tática e química elemental
      const pattern = rng.int(0, 4);
      setTile(room, 3, 2, TILE.TORCH);
      setTile(room, 20, 12, TILE.TORCH);

      if (pattern === 0) {
        [[6, 4], [17, 4], [6, 10], [17, 10]].forEach(([x, y]) => setTile(room, x, y, TILE.WALL));
        const haz = rng.pick(biome.hazards);
        const hTile = haz === 'water' ? TILE.WATER : haz === 'oil' ? TILE.OIL : haz === 'lava' ? TILE.LAVA : haz === 'ice' ? TILE.ICE : TILE.SPIKES;
        for (let x = 10; x <= 13; x++) {
          setTile(room, x, 7, hTile);
        }
        setTile(room, 9, 7, TILE.BARREL_EXP);
      } else if (pattern === 1) {
        const haz = rng.pick(biome.hazards) === 'ice' ? TILE.ICE : (rng.chance(0.5) ? TILE.WATER : TILE.OIL);
        for (let y = 4; y <= 10; y++) {
          if (y !== 7) {
            setTile(room, 8, y, haz);
            setTile(room, 15, y, haz);
          }
        }
        setTile(room, 12, 4, TILE.BARREL_EXP);
        setTile(room, 12, 10, TILE.BARREL);
      } else if (pattern === 2) {
        [[7, 7], [16, 7], [12, 4], [12, 10]].forEach(([x, y]) => setTile(room, x, y, TILE.SPIKES));
        [[5, 4], [5, 10], [18, 4], [18, 10]].forEach(([x, y]) => setTile(room, x, y, TILE.WALL));
        setTile(room, 10, 6, TILE.OIL);
        setTile(room, 11, 6, TILE.OIL);
      } else if (pattern === 3) {
        const pool = biome.id === 'glacier' ? TILE.ICE : (biome.id === 'library' || biome.id === 'mire' ? TILE.WATER : TILE.OIL);
        for (let dx = 0; dx < 2; dx++) {
          for (let dy = 0; dy < 2; dy++) {
            setTile(room, 6 + dx, 4 + dy, pool);
            setTile(room, 16 + dx, 9 + dy, pool);
          }
        }
        setTile(room, 8, 5, TILE.BARREL_EXP);
        setTile(room, 15, 9, TILE.BARREL_EXP);
      } else {
        for (let x = 8; x <= 15; x++) {
          if (x !== 11 && x !== 12) {
            setTile(room, x, 5, TILE.WALL);
            setTile(room, x, 9, TILE.WALL);
          }
        }
        setTile(room, 11, 7, TILE.BARREL);
      }

      // Chance de Baú bônus (ou Mímico!) numa sala de combate
      const chestChance = Math.min(0.45, 0.30 * (diff.lootMult || 1.0));
      if (rng.chance(chestChance)) {
        const isMimic = floorNum >= 2 && rng.chance(diff.id === 'descomunal' ? 0.34 : 0.25);
        setTile(room, 12, 3, TILE.CHEST);
        room.chests['12,3'] = {
          opened: false,
          gold: rng.int(14, 28) + floorNum * 4,
          loot: rng.chance(0.78) ? G.GameData.generateProceduralLoot(rng, floorNum) : null,
          mimic: isMimic
        };
      }

      // Spawn de inimigos escalado por andar + dificuldade
      const spawnBonus = diff.spawnBonus || 0;
      const minCount = Math.min(7, 3 + Math.floor(floorNum / 2) + spawnBonus);
      const maxCount = Math.min(9, 4 + Math.floor(floorNum * 0.75) + spawnBonus);
      const count = rng.int(minCount, Math.max(minCount, maxCount));
      let placed = 0;
      let tries = 0;
      while (placed < count && tries++ < 95) {
        const ex = rng.int(4, ROOM_W - 5);
        const ey = rng.int(3, ROOM_H - 4);
        const t = getTile(room, ex, ey);
        if (SOLID_TILES.has(t) || t === TILE.LAVA || t === TILE.SPIKES) continue;
        if (room.enemies.some(e => e.tx === ex && e.ty === ey)) continue;

        const tplId = rng.pick(biome.enemies);
        const eliteChance = Math.min(0.48, (0.09 + 0.04 * floorNum) * (diff.eliteMult || 1.0));
        const isElite = (room.hasBossKey && placed === 0) || rng.chance(eliteChance);
        room.enemies.push({
          isBoss: false,
          tplId,
          tx: ex,
          ty: ey,
          elite: isElite,
          dropsBossKey: room.hasBossKey && placed === 0,
          hpScale: loopScale * floorHpScale * diff.enemyHpMult * (isElite ? 1.65 : 1.0),
          dmgScale: loopScale * floorDmgScale * diff.enemyDmgMult * (isElite ? 1.28 : 1.0),
          speedScale: diff.enemySpeedMult || 1.0,
          cdScale: diff.enemyCdMult || 1.0
        });
        placed++;
      }
    }

    _carveDoors(room);
  }

  G.Dungeon = {
    ROOM_W,
    ROOM_H,
    TILE_SIZE,
    TILE,
    DIRS,
    isSolidTile,
    isWalkableForEnemy,
    getDoorCoords,
    getEntryPos,
    getTile,
    setTile,
    generateFloor
  };
})(window.Game8Bit);
