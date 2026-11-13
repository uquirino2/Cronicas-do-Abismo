// ============================================================================
// CRÔNICAS DO ABISMO 8-BIT — Paleta NES, PRNG Determinístico e Utilitários
// ============================================================================

window.Game8Bit = window.Game8Bit || {};

(function (G) {
  'use strict';

  // Paleta autêntica inspirada no PPU 2C02 do NES + tons profundos para masmorras
  const PAL = {
    transparent: null,
    black: '#08080c',
    ink: '#12101a',
    darkGray: '#2a2836',
    gray: '#5c5a6e',
    lightGray: '#a4a2b8',
    white: '#f4f4f8',

    // Azuis & Cianos
    deepBlue: '#141842',
    darkBlue: '#1c2c6e',
    blue: '#285cc4',
    sky: '#4898f8',
    cyan: '#38d8e8',
    ice: '#b4f4fc',

    // Vermelhos & Laranjas
    deepRed: '#480814',
    darkRed: '#8c1020',
    red: '#d82828',
    coral: '#f85848',
    orange: '#f87818',
    gold: '#f8b818',
    yellow: '#f8e858',

    // Verdes
    deepGreen: '#0c2c18',
    darkGreen: '#145828',
    green: '#24983c',
    lime: '#78d838',
    acid: '#b8f848',

    // Roxos & Magentas
    deepPurple: '#240c34',
    darkPurple: '#4c186c',
    purple: '#8830b8',
    violet: '#c458f8',
    magenta: '#f04098',
    pink: '#f898c8',

    // Terras & Peles
    darkBrown: '#3c2010',
    brown: '#6c3c18',
    ochre: '#a86428',
    tan: '#d49858',
    peach: '#f8cca0'
  };

  // Mapeamento de elementos para cores 8-bit e nomes PT-BR
  const ELEMENT_META = {
    physical: { name: 'Físico', color: PAL.lightGray, badge: '#a4a2b8' },
    fire: { name: 'Fogo', color: PAL.orange, badge: '#f87818' },
    ice: { name: 'Gelo', color: PAL.cyan, badge: '#38d8e8' },
    lightning: { name: 'Raio', color: PAL.yellow, badge: '#f8e858' },
    poison: { name: 'Veneno', color: PAL.acid, badge: '#b8f848' },
    arcane: { name: 'Arcano', color: PAL.violet, badge: '#c458f8' }
  };

  // Hash FNV-1a para converter seeds textuais em inteiro de 32 bits
  function hashSeed(str) {
    const s = String(str || 'ABISMO8BIT').toUpperCase().trim();
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0) || 0x1337beef;
  }

  function randomSeedString() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < 6; i++) {
      out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
  }

  // PRNG Mulberry32 determinístico
  function createRNG(seedInput) {
    const seedStr = seedInput ? String(seedInput).toUpperCase().trim() : randomSeedString();
    let state = hashSeed(seedStr);

    function next() {
      state = (state + 0x6D2B79F5) >>> 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    function int(min, max) {
      return Math.floor(next() * (max - min + 1)) + min;
    }

    function float(min, max) {
      return next() * (max - min) + min;
    }

    function chance(p) {
      return next() < p;
    }

    function pick(arr) {
      if (!arr || arr.length === 0) return null;
      return arr[Math.floor(next() * arr.length)];
    }

    function shuffle(arr) {
      const copy = arr.slice();
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        const tmp = copy[i];
        copy[i] = copy[j];
        copy[j] = tmp;
      }
      return copy;
    }

    function fork(salt) {
      return createRNG(seedStr + ':' + salt + ':' + Math.floor(next() * 999999));
    }

    return {
      seed: seedStr,
      next,
      int,
      float,
      chance,
      pick,
      shuffle,
      fork
    };
  }

  const Utils = {
    clamp(val, min, max) {
      return val < min ? min : val > max ? max : val;
    },

    lerp(a, b, t) {
      return a + (b - a) * t;
    },

    dist(x1, y1, x2, y2) {
      return Math.hypot(x2 - x1, y2 - y1);
    },

    distSq(x1, y1, x2, y2) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      return dx * dx + dy * dy;
    },

    rectOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
      return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
    },

    // Raycast de Bresenham em grade de tiles para checar linha de visão
    lineOfSight(isBlockedFn, tx1, ty1, tx2, ty2) {
      let x = tx1 | 0;
      let y = ty1 | 0;
      const x2 = tx2 | 0;
      const y2 = ty2 | 0;
      const dx = Math.abs(x2 - x);
      const dy = Math.abs(y2 - y);
      const sx = x < x2 ? 1 : -1;
      const sy = y < y2 ? 1 : -1;
      let err = dx - dy;
      let steps = 0;

      while (steps++ < 64) {
        if (x === x2 && y === y2) return true;
        if (!(x === tx1 && y === ty1) && isBlockedFn(x, y)) return false;
        const e2 = 2 * err;
        if (e2 > -dy) {
          err -= dy;
          x += sx;
        }
        if (e2 < dx) {
          err += dx;
          y += sy;
        }
      }
      return false;
    },

    // Busca BFS simples em grade 24x15 para IA contornar paredes
    findNextStep(width, height, isSolidFn, sx, sy, tx, ty) {
      sx |= 0;
      sy |= 0;
      tx |= 0;
      ty |= 0;
      if (sx === tx && sy === ty) return { x: sx, y: sy };
      if (tx < 0 || ty < 0 || tx >= width || ty >= height) return null;

      const size = width * height;
      const visited = new Uint8Array(size);
      const parent = new Int16Array(size).fill(-1);
      const queue = new Int16Array(size);
      let head = 0;
      let tail = 0;

      const startIdx = sy * width + sx;
      const targetIdx = ty * width + tx;
      visited[startIdx] = 1;
      queue[tail++] = startIdx;

      const dirs = [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0]
      ];

      let found = false;
      while (head < tail) {
        const cur = queue[head++];
        if (cur === targetIdx) {
          found = true;
          break;
        }
        const cx = cur % width;
        const cy = (cur / width) | 0;

        for (let i = 0; i < 4; i++) {
          const nx = cx + dirs[i][0];
          const ny = cy + dirs[i][1];
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const nIdx = ny * width + nx;
          if (visited[nIdx]) continue;
          if (nIdx !== targetIdx && isSolidFn(nx, ny)) continue;
          visited[nIdx] = 1;
          parent[nIdx] = cur;
          queue[tail++] = nIdx;
        }
      }

      if (!found) return null;

      let step = targetIdx;
      while (parent[step] !== -1 && parent[step] !== startIdx) {
        step = parent[step];
      }
      return { x: step % width, y: (step / width) | 0 };
    }
  };

  G.PAL = PAL;
  G.ELEMENT_META = ELEMENT_META;
  G.createRNG = createRNG;
  G.randomSeedString = randomSeedString;
  G.Utils = Utils;
})(window.Game8Bit);
