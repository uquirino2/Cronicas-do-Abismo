// ============================================================================
// CRÔNICAS DO ABISMO 8-BIT — Compilador de Sprites Pixel Art & Fonte Bitmap 8-bit
// ============================================================================

window.Game8Bit = window.Game8Bit || {};

(function (G) {
  'use strict';

  const P = G.PAL;

  // Fonte bitmap 4x6 / 5x7 compacta para texto pixel-perfect no canvas 384x240
  const GLYPHS = {
    'A': [0b0110,0b1001,0b1111,0b1001,0b1001],
    'B': [0b1110,0b1001,0b1110,0b1001,0b1110],
    'C': [0b0111,0b1000,0b1000,0b1000,0b0111],
    'D': [0b1110,0b1001,0b1001,0b1001,0b1110],
    'E': [0b1111,0b1000,0b1110,0b1000,0b1111],
    'F': [0b1111,0b1000,0b1110,0b1000,0b1000],
    'G': [0b0111,0b1000,0b1011,0b1001,0b0111],
    'H': [0b1001,0b1001,0b1111,0b1001,0b1001],
    'I': [0b1110,0b0100,0b0100,0b0100,0b1110],
    'J': [0b0011,0b0001,0b0001,0b1001,0b0110],
    'K': [0b1001,0b1010,0b1100,0b1010,0b1001],
    'L': [0b1000,0b1000,0b1000,0b1000,0b1111],
    'M': [0b10001,0b11011,0b10101,0b10001,0b10001],
    'N': [0b1001,0b1101,0b1011,0b1001,0b1001],
    'O': [0b0110,0b1001,0b1001,0b1001,0b0110],
    'P': [0b1110,0b1001,0b1110,0b1000,0b1000],
    'Q': [0b0110,0b1001,0b1001,0b1010,0b0101],
    'R': [0b1110,0b1001,0b1110,0b1010,0b1001],
    'S': [0b0111,0b1000,0b0110,0b0001,0b1110],
    'T': [0b11111,0b00100,0b00100,0b00100,0b00100],
    'U': [0b1001,0b1001,0b1001,0b1001,0b0110],
    'V': [0b1001,0b1001,0b1001,0b0110,0b0110],
    'W': [0b10001,0b10001,0b10101,0b11011,0b10001],
    'X': [0b1001,0b1001,0b0110,0b1001,0b1001],
    'Y': [0b10001,0b01010,0b00100,0b00100,0b00100],
    'Z': [0b1111,0b0010,0b0100,0b1000,0b1111],
    '0': [0b0110,0b1011,0b1101,0b1001,0b0110],
    '1': [0b0100,0b1100,0b0100,0b0100,0b1110],
    '2': [0b1110,0b0001,0b0110,0b1000,0b1111],
    '3': [0b1110,0b0001,0b0110,0b0001,0b1110],
    '4': [0b1001,0b1001,0b1111,0b0001,0b0001],
    '5': [0b1111,0b1000,0b1110,0b0001,0b1110],
    '6': [0b0111,0b1000,0b1110,0b1001,0b0110],
    '7': [0b1111,0b0001,0b0010,0b0100,0b0100],
    '8': [0b0110,0b1001,0b0110,0b1001,0b0110],
    '9': [0b0110,0b1001,0b0111,0b0001,0b1110],
    '+': [0b000,0b010,0b111,0b010,0b000],
    '-': [0b000,0b000,0b111,0b000,0b000],
    '!': [0b1,0b1,0b1,0b0,0b1],
    '?': [0b1110,0b0001,0b0110,0b0000,0b0100],
    ':': [0b0,0b1,0b0,0b1,0b0],
    '.': [0b0,0b0,0b0,0b0,0b1],
    ',': [0b0,0b0,0b0,0b1,0b1],
    '/': [0b001,0b001,0b010,0b100,0b100],
    '[': [0b11,0b10,0b10,0b10,0b11],
    ']': [0b11,0b01,0b01,0b01,0b11],
    '%': [0b1001,0b0010,0b0100,0b1001,0b0000],
    '$': [0b0111,0b1100,0b0110,0b0011,0b1110],
    ' ': [0b000,0b000,0b000,0b000,0b000]
  };

  const WIDE_GLYPHS = new Set(['M', 'T', 'W', 'Y']);
  const NARROW_WIDTH = { '!': 1, ':': 1, '.': 1, ',': 1, '[': 2, ']': 2, '+': 3, '-': 3, '/': 3, ' ': 3 };

  const ACCENT_MAP = {
    'Á': 'A', 'À': 'A', 'Â': 'A', 'Ã': 'A',
    'É': 'E', 'Ê': 'E',
    'Í': 'I',
    'Ó': 'O', 'Ô': 'O', 'Õ': 'O',
    'Ú': 'U',
    'Ç': 'C'
  };

  function normalizePixelChar(ch) {
    const up = ch.toUpperCase();
    return ACCENT_MAP[up] || up;
  }

  function glyphWidth(ch) {
    if (WIDE_GLYPHS.has(ch)) return 5;
    if (NARROW_WIDTH[ch] !== undefined) return NARROW_WIDTH[ch];
    return 4;
  }

  function measurePixelText(text, scale = 1) {
    const str = String(text || '');
    let total = 0;
    for (let i = 0; i < str.length; i++) {
      const ch = normalizePixelChar(str[i]);
      total += (glyphWidth(ch) + 1) * scale;
    }
    return Math.max(0, total - scale);
  }

  function drawPixelText(ctx, text, x, y, color = P.white, shadow = P.black, align = 'left', scale = 1) {
    const str = String(text || '');
    const width = measurePixelText(str, scale);
    let cx = Math.round(x);
    if (align === 'center') cx = Math.round(x - width / 2);
    else if (align === 'right') cx = Math.round(x - width);
    const cy = Math.round(y);

    const renderPass = (ox, oy, fill) => {
      ctx.fillStyle = fill;
      let px = cx + ox;
      for (let i = 0; i < str.length; i++) {
        const raw = str[i].toUpperCase();
        const ch = ACCENT_MAP[raw] || raw;
        const rows = GLYPHS[ch] || GLYPHS[' '];
        const w = glyphWidth(ch);
        // Acento acima do caractere para legibilidade PT-BR
        if (ACCENT_MAP[raw]) {
          ctx.fillRect(px + Math.floor(w / 2) * scale, oy + cy - 2 * scale, scale, scale);
        }
        for (let r = 0; r < rows.length; r++) {
          const bits = rows[r];
          for (let c = 0; c < w; c++) {
            if ((bits >> (w - 1 - c)) & 1) {
              ctx.fillRect(px + c * scale, oy + cy + r * scale, scale, scale);
            }
          }
        }
        px += (w + 1) * scale;
      }
    };

    if (shadow) renderPass(scale, scale, shadow);
    renderPass(0, 0, color);
  }

  const SpriteBank = {
    cache: {},
    flashCache: {},
    urlCache: {},

    compile(id, rows, cmap) {
      const h = rows.length;
      const w = rows[0].length;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');

      const flashCanvas = document.createElement('canvas');
      flashCanvas.width = w;
      flashCanvas.height = h;
      const fctx = flashCanvas.getContext('2d');

      for (let y = 0; y < h; y++) {
        const row = rows[y];
        for (let x = 0; x < w; x++) {
          const ch = row[x];
          const color = cmap[ch];
          if (color) {
            ctx.fillStyle = color;
            ctx.fillRect(x, y, 1, 1);
            fctx.fillStyle = P.white;
            fctx.fillRect(x, y, 1, 1);
          }
        }
      }

      this.cache[id] = canvas;
      this.flashCache[id] = flashCanvas;
      return canvas;
    },

    get(id) {
      return this.cache[id] || null;
    },

    getFlash(id) {
      return this.flashCache[id] || this.cache[id] || null;
    },

    getIcon(id) {
      if (this.urlCache[id]) return this.urlCache[id];
      const c = this.cache[id];
      if (!c) return '';
      const url = c.toDataURL();
      this.urlCache[id] = url;
      return url;
    },

    initAll() {
      if (this._initialized) return;
      this._initialized = true;

      // ======================================================================
      // HERÓIS (16x16) — Cavaleiro, Maga, Assassino (2 frames de passo)
      // ======================================================================
      const knightRows0 = [
        '.....kkkkkk.....',
        '....kssssssk....',
        '...ksbbbbbbbs...',
        '...ksbkkkkkbs...',
        '...kskbbbbksk...',
        '....kkppppkk....',
        '...kssrrrrssk...',
        '..kssrrssrrssk..',
        '..kppssssssppk..',
        '..k.kssssssk.k..',
        '....kssggssk....',
        '....kssssssk....',
        '....kss..ssk....',
        '....kbb..bbk....',
        '....kkk..kkk....',
        '................'
      ];
      const knightRows1 = [
        '................',
        '.....kkkkkk.....',
        '....kssssssk....',
        '...ksbbbbbbbs...',
        '...ksbkkkkkbs...',
        '...kskbbbbksk...',
        '....kkppppkk....',
        '...kssrrrrssk...',
        '..kssrrssrrssk..',
        '..kppssssssppk..',
        '..k.kssssssk.k..',
        '....kssggssk....',
        '....kssssssk....',
        '...kbb....bbk...',
        '...kkk....kkk...',
        '................'
      ];
      const knightMap = {
        '.': null, k: P.ink, s: P.lightGray, b: P.blue, p: P.peach, r: P.red, g: P.gold
      };
      this.compile('hero_knight_0', knightRows0, knightMap);
      this.compile('hero_knight_1', knightRows1, knightMap);

      const mageRows0 = [
        '......kkkk......',
        '.....kppppk.....',
        '....kppppppk....',
        '...kppppppppk...',
        '..kkggggggggkk..',
        '..k.kppffppk.k..',
        '....kfkkkkfk....',
        '....kppppppk....',
        '...kppccccppk...',
        '..kppccppccppk..',
        '..k.kppppppk.k..',
        '....kppggppk....',
        '....kppppppk....',
        '....kdd..ddk....',
        '....kkk..kkk....',
        '................'
      ];
      const mageRows1 = [
        '................',
        '......kkkk......',
        '.....kppppk.....',
        '....kppppppk....',
        '...kppppppppk...',
        '..kkggggggggkk..',
        '..k.kppffppk.k..',
        '....kfkkkkfk....',
        '....kppppppk....',
        '...kppccccppk...',
        '..kppccppccppk..',
        '..k.kppppppk.k..',
        '....kppggppk....',
        '...kdd....ddk...',
        '...kkk....kkk...',
        '................'
      ];
      const mageMap = {
        '.': null, k: P.ink, p: P.purple, g: P.gold, f: P.peach, c: P.cyan, d: P.darkPurple
      };
      this.compile('hero_mage_0', mageRows0, mageMap);
      this.compile('hero_mage_1', mageRows1, mageMap);

      const assassinRows0 = [
        '.....kkkkkk.....',
        '....kddddddk....',
        '...kddddddddk...',
        '...kdkkkkkkdk...',
        '...kdfkkkkfdk...',
        '....krrrrrrk....',
        '...kdrrrrrrdk...',
        '..kddggggggddk..',
        '..kffddddddffk..',
        '....kddddddk....',
        '....kdggggdk....',
        '....kddddddk....',
        '....kdd..ddk....',
        '....kgg..ggk....',
        '....kkk..kkk....',
        '................'
      ];
      const assassinRows1 = [
        '................',
        '.....kkkkkk.....',
        '....kddddddk....',
        '...kddddddddk...',
        '...kdkkkkkkdk...',
        '...kdfkkkkfdk...',
        '....krrrrrrk....',
        '...kdrrrrrrdk...',
        '..kddggggggddk..',
        '..kffddddddffk..',
        '....kddddddk....',
        '....kdggggdk....',
        '....kddddddk....',
        '...kdd....ddk...',
        '...kkk....kkk...',
        '................'
      ];
      const assassinMap = {
        '.': null, k: P.ink, d: P.darkGray, f: P.peach, r: P.crimson || P.red, g: P.green
      };
      this.compile('hero_assassin_0', assassinRows0, assassinMap);
      this.compile('hero_assassin_1', assassinRows1, assassinMap);

      // 4. Paladino Solar
      const paladinMap = {
        '.': null, k: P.ink, g: P.gold, y: P.yellow, w: P.white, s: P.lightGray, f: P.peach, r: P.red
      };
      this.compile('hero_paladin_0', [
        '......rrrr......',
        '.....kggggk.....',
        '....kggyyggk....',
        '....kgkkkkggk...',
        '....kgkffkggk...',
        '.....kffffk.....',
        '...kkggggggkk...',
        '..kwwkwwwwkwwk..',
        '..kwwkgwwgkwwk..',
        '..kffkwwwwkffk..',
        '....kggggggk....',
        '....kwwggwwk....',
        '....kww..wwk....',
        '....kgg..ggk....',
        '....kkk..kkk....',
        '................'
      ], paladinMap);
      this.compile('hero_paladin_1', [
        '................',
        '......rrrr......',
        '.....kggggk.....',
        '....kggyyggk....',
        '....kgkkkkggk...',
        '....kgkffkggk...',
        '.....kffffk.....',
        '...kkggggggkk...',
        '..kwwkwwwwkwwk..',
        '..kwwkgwwgkwwk..',
        '..kffkwwwwkffk..',
        '....kggggggk....',
        '....kwwggwwk....',
        '...kww....wwk...',
        '...kgg....ggk...',
        '...kkk....kkk...'
      ], paladinMap);

      // 5. Patrulheiro Astral
      const rangerMap = {
        '.': null, k: P.ink, g: P.green, l: P.lime, b: P.brown, t: P.tan, f: P.peach
      };
      this.compile('hero_ranger_0', [
        '.....kkkkkk.....',
        '....kggggggk....',
        '...kggllllggk...',
        '...kgkkkkkkgk...',
        '...kgkffffkgk...',
        '....kffffffk....',
        '...kkbbbbbbkk...',
        '..kggbtggtbggk..',
        '..kggkggggkggk..',
        '..kffkggggkffk..',
        '....kbbggbbk....',
        '....kggggggk....',
        '....kbb..bbk....',
        '....ktt..ttk....',
        '....kkk..kkk....',
        '................'
      ], rangerMap);
      this.compile('hero_ranger_1', [
        '................',
        '.....kkkkkk.....',
        '....kggggggk....',
        '...kggllllggk...',
        '...kgkkkkkkgk...',
        '...kgkffffkgk...',
        '....kffffffk....',
        '...kkbbbbbbkk...',
        '..kggbtggtbggk..',
        '..kggkggggkggk..',
        '..kffkggggkffk..',
        '....kbbggbbk....',
        '....kggggggk....',
        '...kbb....bbk...',
        '...kkk....kkk...',
        '................'
      ], rangerMap);

      // 6. Necromante do Vazio
      const necroHeroMap = {
        '.': null, k: P.ink, p: P.deepPurple, v: P.purple, m: P.violet, c: P.cyan, w: P.white, a: P.acid
      };
      this.compile('hero_necromancer_0', [
        '.....kkkkkk.....',
        '....kppppppk....',
        '...kpvvvvvvpk...',
        '...kpkcccckpk...',
        '...kpkckkckpk...',
        '....kpkkkkpk....',
        '...kkmmwwmmkk...',
        '..kppvwwwwvppk..',
        '..kppkvvvvkpkk..',
        '..kaakvvvvkaak..',
        '....kvvvvvvk....',
        '....kpvmvvpk....',
        '....kppppppk....',
        '....kpp..ppk....',
        '....kkk..kkk....',
        '................'
      ], necroHeroMap);
      this.compile('hero_necromancer_1', [
        '................',
        '.....kkkkkk.....',
        '....kppppppk....',
        '...kpvvvvvvpk...',
        '...kpkcccckpk...',
        '...kpkckkckpk...',
        '....kpkkkkpk....',
        '...kkmmwwmmkk...',
        '..kppvwwwwvppk..',
        '..kppkvvvvkpkk..',
        '..kaakvvvvkaak..',
        '....kvvvvvvk....',
        '....kpvmvvpk....',
        '...kpp....ppk...',
        '...kkk....kkk...',
        '................'
      ], necroHeroMap);

      // ======================================================================
      // INIMIGOS (16x16)
      // ======================================================================
      const skelMap = { '.': null, k: P.ink, w: P.white, g: P.lightGray, r: P.red, b: P.brown };
      this.compile('enemy_skeleton_0', [
        '.....kkkkkk.....',
        '....kwwwwwwk....',
        '...kwwkwwkwwk...',
        '...kwwrwwrwwk...',
        '....kwwwwwwk....',
        '.....kwkkwk.....',
        '...kkggggggkk...',
        '..kwwkwwwwkwwk..',
        '..kw.kwwwwk.wk..',
        '.....kggggk.....',
        '....kww..wwk....',
        '....kww..wwk....',
        '....kgg..ggk....',
        '....kkk..kkk....',
        '................',
        '................'
      ], skelMap);
      this.compile('enemy_skeleton_1', [
        '................',
        '.....kkkkkk.....',
        '....kwwwwwwk....',
        '...kwwkwwkwwk...',
        '...kwwrwwrwwk...',
        '....kwwwwwwk....',
        '.....kwkkwk.....',
        '...kkggggggkk...',
        '..kwwkwwwwkwwk..',
        '.....kwwwwk.....',
        '.....kggggk.....',
        '...kww....wwk...',
        '...kgg....ggk...',
        '...kkk....kkk...',
        '................',
        '................'
      ], skelMap);

      const shieldMap = { '.': null, k: P.ink, w: P.white, s: P.gold, d: P.darkGray, b: P.blue };
      this.compile('enemy_shield_0', [
        '.....kkkkkk.....',
        '....kddddddk....',
        '...kddwwwwddk...',
        '...kdkkwwkkdk...',
        '....kwwwwwwk....',
        '..kkkkddddkkkk..',
        '.ksssskddkbbbbk.',
        '.ksssskddkbbbbk.',
        '.ksssskddkbbbbk.',
        '.ksssskddkbbbbk.',
        '..kkkkkddkbbbk..',
        '....kdd..ddk....',
        '....kdd..ddk....',
        '....kkk..kkk....',
        '................',
        '................'
      ], shieldMap);
      this.compile('enemy_shield_1', [
        '................',
        '.....kkkkkk.....',
        '....kddddddk....',
        '...kddwwwwddk...',
        '...kdkkwwkkdk...',
        '....kwwwwwwk....',
        '..kkkkddddkkkk..',
        '.ksssskddkbbbbk.',
        '.ksssskddkbbbbk.',
        '.ksssskddkbbbbk.',
        '.ksssskddkbbbbk.',
        '..kkkkkddkbbbk..',
        '...kdd....ddk...',
        '...kkk....kkk...',
        '................',
        '................'
      ], shieldMap);

      const batMap = { '.': null, k: P.ink, p: P.purple, d: P.darkPurple, r: P.red };
      this.compile('enemy_bat_0', [
        '................',
        '.kk..........kk.',
        'kppk..kkkk..kppk',
        'kpppkppppppkpppk',
        '.kpppkprrpkpppk.',
        '..kppkppppkppk..',
        '...kkkkkkkkkk...',
        '....kddddddk....',
        '.....kddddk.....',
        '......kkkk......',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................'
      ], batMap);
      this.compile('enemy_bat_1', [
        '................',
        '................',
        '......kkkk......',
        '.....kppppk.....',
        '....kppddppk....',
        '...kpkprrpkpk...',
        '..kppkppppkppk..',
        '.kpp.kkkkkk.ppk.',
        'kpk...kddk...kpk',
        '.k....kkkk....k.',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................'
      ], batMap);

      const slimeMap = { '.': null, k: P.ink, g: P.lime, d: P.green, a: P.acid, w: P.white };
      this.compile('enemy_slime_0', [
        '................',
        '................',
        '......kkkk......',
        '....kkaaaakk....',
        '...kaaggggaak...',
        '..kaaggggggaak..',
        '..kagwwggwwgak..',
        '.kaggwkggkwggak.',
        '.kaggggggggggak.',
        '.kadddddddddaak.',
        '..kddddddddddk..',
        '...kkkkkkkkkk...',
        '................',
        '................',
        '................',
        '................'
      ], slimeMap);
      this.compile('enemy_slime_1', [
        '................',
        '................',
        '................',
        '................',
        '.....kkkkkk.....',
        '...kkaaaaaakk...',
        '..kaaggggggaak..',
        '.kaggwwggwwggak.',
        '.kaggwkggkwggak.',
        '.kaggggggggggak.',
        '.kadddddddddaak.',
        '..kkkkkkkkkkkk..',
        '................',
        '................',
        '................',
        '................'
      ], slimeMap);

      const goblinMap = { '.': null, k: P.ink, g: P.green, l: P.lime, b: P.brown, r: P.red, y: P.gold };
      this.compile('enemy_goblin_0', [
        '....kk....kk....',
        '...kglk..klgk...',
        '....kggggggk....',
        '....kgrggrgk....',
        '.....kggggk.....',
        '...kkbbbbbbkk...',
        '..kggkbbbbkggk..',
        '..k..kybbby..k..',
        '.....kbbbbk.....',
        '....kbb..bbk....',
        '....kgg..ggk....',
        '....kkk..kkk....',
        '................',
        '................',
        '................',
        '................'
      ], goblinMap);
      this.compile('enemy_goblin_1', [
        '................',
        '....kk....kk....',
        '...kglk..klgk...',
        '....kggggggk....',
        '....kgrggrgk....',
        '.....kggggk.....',
        '...kkbbbbbbkk...',
        '..kggkbbbbkggk..',
        '.....kybbby.....',
        '.....kbbbbk.....',
        '...kbb....bbk...',
        '...kkk....kkk...',
        '................',
        '................',
        '................',
        '................'
      ], goblinMap);

      const pyroMap = { '.': null, k: P.ink, r: P.darkRed, o: P.orange, y: P.yellow, f: P.red };
      this.compile('enemy_pyro_0', [
        '......kkkk......',
        '.....krrrrk.....',
        '....krrrrrrk....',
        '...krrkkkkrrk...',
        '...krkyyyykrrk..',
        '....krrrrrrk....',
        '...krrroorrrk...',
        '..krrfooofrrrk..',
        '..k.krroorrr.k..',
        '....krrrrrrk....',
        '....krrrrrrk....',
        '....kff..ffk....',
        '....kkk..kkk....',
        '................',
        '................',
        '................'
      ], pyroMap);
      this.compile('enemy_pyro_1', [
        '................',
        '......kkkk......',
        '.....krrrrk.....',
        '....krrrrrrk....',
        '...krrkkkkrrk...',
        '...krkyyyykrrk..',
        '....krrrrrrk....',
        '...krrroorrrk...',
        '..krrfooofrrrk..',
        '....krroorrr....',
        '....krrrrrrk....',
        '...kff....ffk...',
        '...kkk....kkk...',
        '................',
        '................',
        '................'
      ], pyroMap);

      const stalkerMap = { '.': null, k: P.ink, p: P.darkPurple, v: P.violet, c: P.cyan };
      this.compile('enemy_stalker_0', [
        '.....kkkkkk.....',
        '....kppppppk....',
        '...kpvvvvvvpk...',
        '...kpccppccpk...',
        '....kppppppk....',
        '...kkppppppkk...',
        '..kpvvppppvvpk..',
        '..k.kppppppk.k..',
        '....kppvvppk....',
        '....kp.pp.pk....',
        '...kp..pp..pk...',
        '.......kk.......',
        '................',
        '................',
        '................',
        '................'
      ], stalkerMap);
      this.compile('enemy_stalker_1', [
        '................',
        '.....kkkkkk.....',
        '....kppppppk....',
        '...kpvvvvvvpk...',
        '...kpccppccpk...',
        '....kppppppk....',
        '...kkppppppkk...',
        '..kpvvppppvvpk..',
        '....kppppppk....',
        '....kppvvppk....',
        '...kp..pp..pk...',
        '....k......k....',
        '................',
        '................',
        '................',
        '................'
      ], stalkerMap);

      const golemMap = { '.': null, k: P.ink, g: P.darkGray, s: P.gray, o: P.orange, y: P.yellow };
      this.compile('enemy_golem_0', [
        '...kkkkkkkkkk...',
        '..kggggggggggk..',
        '.kggssggggssggk.',
        '.kgsoosggsoosgk.',
        '.kggggggggggggk.',
        'kkgggooooooggkk.',
        'kssggyyyyyyggssk',
        'kssggggggggggssk',
        'kssgggoooogggssk',
        '.kkggggggggggkk.',
        '..kggg....gggk..',
        '..kssg....gssk..',
        '..kkkk....kkkk..',
        '................',
        '................',
        '................'
      ], golemMap);
      this.compile('enemy_golem_1', [
        '................',
        '...kkkkkkkkkk...',
        '..kggggggggggk..',
        '.kggssggggssggk.',
        '.kgsoosggsoosgk.',
        '.kggggggggggggk.',
        'kkgggooooooggkk.',
        'kssggyyyyyyggssk',
        'kssggggggggggssk',
        'kssgggoooogggssk',
        '.kkggggggggggkk.',
        '..kggg....gggk..',
        '..kkkk....kkkk..',
        '................',
        '................',
        '................'
      ], golemMap);

      const necroMap = { '.': null, k: P.ink, p: P.deepPurple, v: P.purple, c: P.acid, w: P.white };
      this.compile('enemy_necro_0', [
        '.....kkkkkk.....',
        '....kppppppk....',
        '...kppkkkkppk...',
        '...kpkcccckpk...',
        '....kppppppk....',
        '...kppvvvvppk...',
        '..kppvccccvppk..',
        '..k.kppppppk.k..',
        '....kpvvvvpk....',
        '....kppppppk....',
        '....kpp..ppk....',
        '....kkk..kkk....',
        '................',
        '................',
        '................',
        '................'
      ], necroMap);
      this.compile('enemy_necro_1', [
        '................',
        '.....kkkkkk.....',
        '....kppppppk....',
        '...kppkkkkppk...',
        '...kpkcccckpk...',
        '....kppppppk....',
        '...kppvvvvppk...',
        '..kppvccccvppk..',
        '....kppppppk....',
        '....kpvvvvpk....',
        '...kpp....ppk...',
        '...kkk....kkk...',
        '................',
        '................',
        '................',
        '................'
      ], necroMap);

      const turretMap = { '.': null, k: P.ink, g: P.gray, l: P.lightGray, c: P.cyan, b: P.darkBlue };
      this.compile('enemy_turret_0', [
        '....kkkkkkkk....',
        '...kllllllllk...',
        '..kllbbbbbbllk..',
        '..klbbccccbbbk..',
        '..klbccwwccbbk..',
        '..klbbccccbbbk..',
        '..kllbbbbbbllk..',
        '...kggggggggk...',
        '..kggggggggggk..',
        '..kllggggggllk..',
        '..kkkkkkkkkkkk..',
        '................',
        '................',
        '................',
        '................',
        '................'
      ], turretMap);
      this.compile('enemy_turret_1', [
        '....kkkkkkkk....',
        '...kllllllllk...',
        '..kllbbbbbbllk..',
        '..klbbccccbbbk..',
        '..klbcwwwwcbbk..',
        '..klbbccccbbbk..',
        '..kllbbbbbbllk..',
        '...kggggggggk...',
        '..kggggggggggk..',
        '..kllggggggllk..',
        '..kkkkkkkkkkkk..',
        '................',
        '................',
        '................',
        '................',
        '................'
      ], turretMap);

      const mimicMap = { '.': null, k: P.ink, b: P.brown, g: P.gold, r: P.red, w: P.white };
      this.compile('enemy_mimic_0', [
        '................',
        '..kkkkkkkkkkkk..',
        '.kbbbbggggbbbbk.',
        '.kbbbbbbbbbbbbk.',
        '.krrrrrrrrrrrrk.',
        '.krwwrrwwrrwwrk.',
        '.krrrrrrrrrrrrk.',
        '.krwwrrwwrrwwrk.',
        '.kbbbbggggbbbbk.',
        '.kbbbbbbbbbbbbk.',
        '..kkkkkkkkkkkk..',
        '..k..k....k..k..',
        '................',
        '................',
        '................',
        '................'
      ], mimicMap);
      this.compile('enemy_mimic_1', [
        '..kkkkkkkkkkkk..',
        '.kbbbbggggbbbbk.',
        '.kbbbbbbbbbbbbk.',
        '.krrrrrrrrrrrrk.',
        '.krwwrrwwrrwwrk.',
        '.krrrrrrrrrrrrk.',
        '.krrrrrrrrrrrrk.',
        '.krwwrrwwrrwwrk.',
        '.kbbbbggggbbbbk.',
        '.kbbbbbbbbbbbbk.',
        '..kkkkkkkkkkkk..',
        '.k...k....k...k.',
        '................',
        '................',
        '................',
        '................'
      ], mimicMap);

      // Esporo Venenoso (Fungoid)
      const fungMap = { '.': null, k: P.ink, p: P.purple, a: P.acid, l: P.lime, w: P.white, t: P.tan };
      this.compile('enemy_fungoid_0', [
        '....kkkkkkkk....',
        '..kkppppppppkk..',
        '.kppwwppppwwppk.',
        'kpppwwppppwwpppk',
        'kppppppwwppppppk',
        '.kkllllllllllkk.',
        '...kttttttttk...',
        '...ktkttttktk...',
        '...ktattttatk...',
        '....kttttttk....',
        '...ktattttatk...',
        '....ktt..ttk....',
        '....kpp..ppk....',
        '....kkk..kkk....',
        '................',
        '................'
      ], fungMap);
      this.compile('enemy_fungoid_1', [
        '................',
        '....kkkkkkkk....',
        '..kkppppppppkk..',
        '.kppwwppppwwppk.',
        'kpppwwppppwwpppk',
        'kppppppwwppppppk',
        '.kkllllllllllkk.',
        '...kttttttttk...',
        '...ktkttttktk...',
        '...ktattttatk...',
        '....kttttttk....',
        '...ktattttatk...',
        '...ktt....ttk...',
        '...kkk....kkk...',
        '................',
        '................'
      ], fungMap);

      // Criomante Perdido (Cryo)
      const cryoMap = { '.': null, k: P.ink, b: P.blue, c: P.cyan, i: P.ice, w: P.white, d: P.deepBlue };
      this.compile('enemy_cryo_0', [
        '......kkkk......',
        '.....kiiik......',
        '....kicccick....',
        '...kicbkkbcik...',
        '...kicbwwbcik...',
        '....kcccccck....',
        '..kkkbbbbbbkkk..',
        '.kcckbiiiiikcck.',
        '.kcckbbbbbbkcck.',
        '..kk.kddddk.kk..',
        '....kddccddk....',
        '....kddddddk....',
        '....kcc..cck....',
        '....kkk..kkk....',
        '................',
        '................'
      ], cryoMap);
      this.compile('enemy_cryo_1', [
        '................',
        '......kkkk......',
        '.....kiiik......',
        '....kicccick....',
        '...kicbkkbcik...',
        '...kicbwwbcik...',
        '....kcccccck....',
        '..kkkbbbbbbkkk..',
        '.kcckbiiiiikcck.',
        '.kcckbbbbbbkcck.',
        '..kk.kddddk.kk..',
        '....kddccddk....',
        '...kdd....ddk...',
        '...kcc....cck...',
        '...kkk....kkk...',
        '................'
      ], cryoMap);

      // Paladino Caído (Fallen Knight)
      const fkMap = { '.': null, k: P.ink, d: P.darkGray, g: P.gray, c: P.cyan, v: P.violet, s: P.lightGray };
      this.compile('enemy_fallen_knight_0', [
        '...k........k...',
        '...kk.kkkk.kk...',
        '....kkddddkk....',
        '...kdddssdddk...',
        '...kddkcckddk...',
        '....kddddddk....',
        '..kkkggggggkkk..',
        '.ksskddvvddkssk.',
        '.ks.kddddddk.sk.',
        '....kggssggk....',
        '....kddddddk....',
        '....kdd..ddk....',
        '....kss..ssk....',
        '....kkk..kkk....',
        '................',
        '................'
      ], fkMap);
      this.compile('enemy_fallen_knight_1', [
        '................',
        '...k........k...',
        '...kk.kkkk.kk...',
        '....kkddddkk....',
        '...kdddssdddk...',
        '...kddkcckddk...',
        '....kddddddk....',
        '..kkkggggggkkk..',
        '.ksskddvvddkssk.',
        '.ks.kddddddk.sk.',
        '....kggssggk....',
        '....kddddddk....',
        '...kdd....ddk...',
        '...kkk....kkk...',
        '................',
        '................'
      ], fkMap);

      // ======================================================================
      // CHEFES (24x24 compilados dinamicamente para imponência 8-bit)
      // ======================================================================
      this._buildBossSprites();

      // ======================================================================
      // TILES & OBJETOS (16x16)
      // ======================================================================
      this._buildTilesAndItems();
    },

    _buildBossSprites() {
      // Gera sprites 24x24 simétricos detalhados para os 4 Chefes
      const buildSym24 = (id, halfRows, cmap) => {
        const full = halfRows.map(r => r + r.split('').reverse().join(''));
        this.compile(id, full, cmap);
      };

      // 1. Rei Ossário Vael
      const boneMap = { '.': null, k: P.ink, w: P.white, l: P.lightGray, g: P.gold, r: P.red, p: P.purple };
      buildSym24('boss_bone_king_0', [
        '........k..k',
        '.......kgkkg',
        '.......kgggg',
        '......kkwwww',
        '.....kwwwwww',
        '.....kwwkkww',
        '.....kwwrkww',
        '.....kwwwwww',
        '......kwwkkw',
        '....kkkllkkk',
        '...kppkwwkpp',
        '..kpppkwwkpp',
        '..kpp.kwwkpp',
        '..k...kggk..',
        '......kwwk..',
        '.....kwwwwk.',
        '.....kww..k.',
        '.....kll....',
        '.....kkk....',
        '............',
        '............',
        '............',
        '............',
        '............'
      ], boneMap);
      buildSym24('boss_bone_king_1', [
        '............',
        '........k..k',
        '.......kgkkg',
        '.......kgggg',
        '......kkwwww',
        '.....kwwwwww',
        '.....kwwkkww',
        '.....kwwrkww',
        '.....kwwwwww',
        '......kwwkkw',
        '....kkkllkkk',
        '...kppkwwkpp',
        '..kpppkwwkpp',
        '..kpp.kwwkpp',
        '..k...kggk..',
        '......kwwk..',
        '....kwwwwk..',
        '....kll.....',
        '....kkk.....',
        '............',
        '............',
        '............',
        '............',
        '............'
      ], boneMap);

      // 2. Ignis Rex
      const ignisMap = { '.': null, k: P.ink, d: P.darkRed, r: P.red, o: P.orange, y: P.yellow, g: P.darkGray };
      buildSym24('boss_ignis_rex_0', [
        '......kk....',
        '.....koyk...',
        '....kooyk...',
        '....kddddkkk',
        '...kdddddddd',
        '...kddyyyydd',
        '...kdddddddd',
        '..kkgggggggg',
        '.kggddoooood',
        '.kggddyyyyyd',
        '.kggdddddddd',
        '.kggddoooood',
        '..kkgggggggg',
        '....kdddddd.',
        '....kdd..dd.',
        '....kgg..gg.',
        '....kkk..kkk',
        '............',
        '............',
        '............',
        '............',
        '............',
        '............',
        '............'
      ], ignisMap);
      buildSym24('boss_ignis_rex_1', [
        '.....kk.....',
        '....koyk....',
        '...kooyk....',
        '....kddddkkk',
        '...kdddddddd',
        '...kddyyyydd',
        '...kdddddddd',
        '..kkgggggggg',
        '.kggddoooood',
        '.kggddyyyyyd',
        '.kggdddddddd',
        '.kggddoooood',
        '..kkgggggggg',
        '....kdddddd.',
        '...kdd....dd',
        '...kgg....gg',
        '...kkk....kk',
        '............',
        '............',
        '............',
        '............',
        '............',
        '............',
        '............'
      ], ignisMap);

      // 3. Arquimaga Lyra
      const lyraMap = { '.': null, k: P.ink, b: P.blue, c: P.cyan, w: P.white, v: P.violet, g: P.gold };
      buildSym24('boss_lyra_0', [
        '........kkkk',
        '.......kcccc',
        '......kccwwc',
        '......kccccc',
        '.....kkggggk',
        '.....kbbbbbb',
        '....kbbccbbb',
        '....kbbkkbbb',
        '....kbbbbbbb',
        '...kbbvvvvbb',
        '..kbbvvccvvb',
        '..kb.kbbbbbb',
        '.....kbbggbb',
        '.....kbbbbbb',
        '....kbbccbbb',
        '....kbbbbbbb',
        '....kbb..bbb',
        '....kkk..kkk',
        '............',
        '............',
        '............',
        '............',
        '............',
        '............'
      ], lyraMap);
      buildSym24('boss_lyra_1', [
        '............',
        '........kkkk',
        '.......kcccc',
        '......kccwwc',
        '......kccccc',
        '.....kkggggk',
        '.....kbbbbbb',
        '....kbbccbbb',
        '....kbbkkbbb',
        '....kbbbbbbb',
        '...kbbvvvvbb',
        '..kbbvvccvvb',
        '.....kbbbbbb',
        '.....kbbggbb',
        '.....kbbbbbb',
        '....kbbccbbb',
        '....kbb..bbb',
        '....kkk..kkk',
        '............',
        '............',
        '............',
        '............',
        '............',
        '............'
      ], lyraMap);

      // 4. Malakor, Senhor do Abismo
      const malMap = { '.': null, k: P.ink, p: P.deepPurple, v: P.violet, m: P.magenta, r: P.red, w: P.white };
      buildSym24('boss_malakor_0', [
        '...kk.......',
        '..kmmk...kkk',
        '..kmmkk.kppp',
        '...kmmmkpppp',
        '...kpppppppp',
        '....kppkkppp',
        '....kpprrppp',
        '....kppppppp',
        '..kkkmmmmmkk',
        '.kpppmmmmmpp',
        'kppvpmmwmmpp',
        'kppvpmmmmmpp',
        '.kpkpppppppp',
        '...kppvvvppp',
        '....kppppppp',
        '....kpp..ppp',
        '....kmm..mmm',
        '....kkk..kkk',
        '............',
        '............',
        '............',
        '............',
        '............',
        '............'
      ], malMap);
      buildSym24('boss_malakor_1', [
        '..kk........',
        '.kmmk....kkk',
        '..kmmkk.kppp',
        '...kmmmkpppp',
        '...kpppppppp',
        '....kppkkppp',
        '....kpprrppp',
        '....kppppppp',
        '..kkkmmmmmkk',
        '.kpppmmmmmpp',
        'kppvpmmwmmpp',
        'kppvpmmmmmpp',
        '.kpkpppppppp',
        '...kppvvvppp',
        '....kppppppp',
        '...kpp....pp',
        '...kmm....mm',
        '...kkk....kk',
        '............',
        '............',
        '............',
        '............',
        '............',
        '............'
      ], malMap);

      // 5. Hidra de Miasma, Vespera
      const vespMap = { '.': null, k: P.ink, g: P.darkGreen, l: P.green, a: P.acid, y: P.yellow, p: P.purple, r: P.red };
      buildSym24('boss_vespera_0', [
        '..kkk...kkk.',
        '.klllk.klllk',
        '.klrrk.klrrk',
        '..kllkkklllk',
        '..kaalllllaa',
        '...kaallllla',
        '...kgggggggg',
        '..kggllllllg',
        '.kgglaaaaalg',
        '.kglppppppgl',
        '..kglaaaaalg',
        '..kggggggggg',
        '..k.kggggggk',
        '....kll..llk',
        '...kll....ll',
        '...kaa....aa',
        '...kkk....kk',
        '............',
        '............',
        '............',
        '............',
        '............',
        '............',
        '............'
      ], vespMap);
      buildSym24('boss_vespera_1', [
        '............',
        '..kkk...kkk.',
        '.klllk.klllk',
        '.klrrk.klrrk',
        '..kllkkklllk',
        '..kaalllllaa',
        '...kaallllla',
        '...kgggggggg',
        '..kggllllllg',
        '.kgglaaaaalg',
        '.kglppppppgl',
        '..kglaaaaalg',
        '..kggggggggg',
        '..k.kggggggk',
        '....kll..llk',
        '....kaa..aak',
        '....kkk..kkk',
        '............',
        '............',
        '............',
        '............',
        '............',
        '............',
        '............'
      ], vespMap);

      // 6. Kaelen, o Cavaleiro do Eclipse
      const kaelMap = { '.': null, k: P.ink, d: P.deepBlue, b: P.blue, c: P.cyan, i: P.ice, s: P.lightGray, v: P.violet };
      buildSym24('boss_kaelen_0', [
        '..kk........',
        '.kiik...kkk.',
        '..kiik.kdddk',
        '...kiikddddk',
        '....kkddsssd',
        '....kddkccsd',
        '....kddddddk',
        '...kkbbbbbbk',
        '..kssbiiiiib',
        '.ksskbcccccb',
        '.ks.kbdddddb',
        '....kssvvssk',
        '....kddddddk',
        '...kbb....bb',
        '...kcc....cc',
        '...kdd....dd',
        '...kkk....kk',
        '............',
        '............',
        '............',
        '............',
        '............',
        '............',
        '............'
      ], kaelMap);
      buildSym24('boss_kaelen_1', [
        '............',
        '..kk........',
        '.kiik...kkk.',
        '..kiik.kdddk',
        '...kiikddddk',
        '....kkddsssd',
        '....kddkccsd',
        '....kddddddk',
        '...kkbbbbbbk',
        '..kssbiiiiib',
        '.ksskbcccccb',
        '.ks.kbdddddb',
        '....kssvvssk',
        '....kddddddk',
        '....kbb..bbk',
        '....kcc..cck',
        '....kkk..kkk',
        '............',
        '............',
        '............',
        '............',
        '............',
        '............',
        '............'
      ], kaelMap);
    },

    _buildTilesAndItems() {
      // Tocha (2 frames)
      const torchMap = { '.': null, k: P.ink, b: P.brown, o: P.orange, y: P.yellow, w: P.white, r: P.red };
      this.compile('obj_torch_0', [
        '.......yy.......',
        '......ywwy......',
        '.....yoowoy.....',
        '.....rroooor....',
        '......rorr......',
        '......kkkk......',
        '......kbbk......',
        '......kbbk......',
        '......kbbk......',
        '......kbbk......',
        '......kbbk......',
        '......kkkk......',
        '................',
        '................',
        '................',
        '................'
      ], torchMap);
      this.compile('obj_torch_1', [
        '......y.........',
        '.....ywwy.......',
        '......yoow......',
        '.....rooyor.....',
        '......rror......',
        '......kkkk......',
        '......kbbk......',
        '......kbbk......',
        '......kbbk......',
        '......kbbk......',
        '......kbbk......',
        '......kkkk......',
        '................',
        '................',
        '................',
        '................'
      ], torchMap);

      // Baú fechado & aberto
      const chestMap = { '.': null, k: P.ink, b: P.brown, o: P.ochre, g: P.gold, d: P.darkBrown };
      this.compile('obj_chest_closed', [
        '................',
        '..kkkkkkkkkkkk..',
        '.kooooooooooook.',
        '.kobbbbbbbbbbbo.',
        '.kggggggggggggk.',
        '.kbbbbggggbbbbk.',
        '.kbbbbgkkggbbbk.',
        '.kbbbbggggbbbbk.',
        '.kddddddddddddk.',
        '.kddddddddddddk.',
        '..kkkkkkkkkkkk..',
        '................',
        '................',
        '................',
        '................',
        '................'
      ].map(r => r.length === 16 ? r : r.slice(0, 16)), chestMap);

      this.compile('obj_chest_open', [
        '..kkkkkkkkkkkk..',
        '.kddddddddddddk.',
        '.kggggggggggggk.',
        '.kddddddddddddk.',
        '.kkkkkkkkkkkkkk.',
        '.kbbbbbbbbbbbbk.',
        '.kbbggggggggbbk.',
        '.kbbbbbbbbbbbbk.',
        '.kddddddddddddk.',
        '..kkkkkkkkkkkk..',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................'
      ], chestMap);

      // Barril normal e Barril Explosivo
      const barrelMap = { '.': null, k: P.ink, b: P.brown, o: P.ochre, g: P.gray, r: P.red, y: P.yellow };
      this.compile('obj_barrel', [
        '....kkkkkkkk....',
        '...koooooooook..'.slice(0, 16),
        '..kbbbbbbbbbbk..',
        '..kggggggggggk..',
        '..kbbbbbbbbbbk..',
        '..kbbboooobbbk..',
        '..kbbbbbbbbbbk..',
        '..kggggggggggk..',
        '..kbbbbbbbbbbk..',
        '...kbbbbbbbbk...',
        '....kkkkkkkk....',
        '................',
        '................',
        '................',
        '................',
        '................'
      ], barrelMap);
      this.compile('obj_barrel_exp', [
        '....kkkkkkkk....',
        '...krrrrrrrrk...',
        '..krrrrrrrrrrk..',
        '..kggggggggggk..',
        '..krrryyyyrrrk..',
        '..krrryrryrrrk..',
        '..krrryyyyrrrk..',
        '..kggggggggggk..',
        '..krrrrrrrrrrk..',
        '...krrrrrrrrk...',
        '....kkkkkkkk....',
        '................',
        '................',
        '................',
        '................',
        '................'
      ], barrelMap);

      // Bigorna (Forja Rúnica)
      const anvilMap = { '.': null, k: P.ink, s: P.lightGray, g: P.gray, d: P.darkGray, c: P.cyan };
      this.compile('obj_anvil', [
        '................',
        '.kkkkkkkkkkkkkk.',
        '.kssssssssssssk.',
        '..kggggggggggk..',
        '...kkddddddkk...',
        '.....kddddk.....',
        '.....kdcddk.....',
        '....kddddddk....',
        '...kggggggggk...',
        '..kkkkkkkkkkkk..',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................'
      ], anvilMap);

      // Santuário (Shrine)
      const shrineMap = { '.': null, k: P.ink, s: P.lightGray, g: P.gray, c: P.cyan, w: P.white, v: P.violet };
      this.compile('obj_shrine', [
        '......kkkk......',
        '.....kcccck.....',
        '....kcwwwwck....',
        '....kcccccck....',
        '.....kcccck.....',
        '...kksssssskk...',
        '..kssssssssssk..',
        '..ksggggggggsk..',
        '..ksggvvvvggsk..',
        '..ksggggggggsk..',
        '.kkggggggggggkk.',
        '.kkkkkkkkkkkkkk.',
        '................',
        '................',
        '................',
        '................'
      ], shrineMap);

      // Fogueira (Campfire)
      const fireMap = { '.': null, k: P.ink, o: P.orange, y: P.yellow, r: P.red, b: P.brown };
      this.compile('obj_campfire_0', [
        '.......yy.......',
        '......yooy......',
        '.....yooyoy.....',
        '....rooooyor....',
        '....rrroorrr....',
        '...kkbbbbbbkk...',
        '..kbbkkkkkkbbk..',
        '..kbbbbbbbbbbk..',
        '...kkkkkkkkkk...',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................'
      ], fireMap);
      this.compile('obj_campfire_1', [
        '......y.........',
        '.....yooy.......',
        '......oyoo......',
        '....rooooyr.....',
        '....rrroorrr....',
        '...kkbbbbbbkk...',
        '..kbbkkkkkkbbk..',
        '..kbbbbbbbbbbk..',
        '...kkkkkkkkkk...',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................'
      ], fireMap);

      // Mercador NPC
      const merchMap = { '.': null, k: P.ink, b: P.blue, g: P.gold, p: P.peach, d: P.darkBlue };
      this.compile('obj_merchant', [
        '.....kkkkkk.....',
        '....kbbbbbbk....',
        '...kbbbbbbbbk...',
        '...kbkkkkkkbk...',
        '...kbppppppbk...',
        '....kppppppk....',
        '...kkggggggkk...',
        '..kbbggggggbbk..',
        '..k.kddddddk.k..',
        '....kddddddk....',
        '....kddggddk....',
        '....kddddddk....',
        '....kkk..kkk....',
        '................',
        '................',
        '................'
      ], merchMap);

      // Bloco empurrável & Placa de Pressão & Escada & Tábua de Lore
      const blockMap = { '.': null, k: P.ink, g: P.gray, l: P.lightGray, d: P.darkGray, c: P.cyan };
      this.compile('obj_block', [
        'kkkkkkkkkkkkkkkk',
        'kllllllllllllllk',
        'klggggggggggggdk',
        'klgllllllllllgdk',
        'klglgddddddglgdk',
        'klglgdccccdglgdk',
        'klglgdccccdglgdk',
        'klglgddddddglgdk',
        'klgllllllllllgdk',
        'klggggggggggggdk',
        'kddddddddddddddk',
        'kkkkkkkkkkkkkkkk',
        'kddddddddddddddk',
        'kddddddddddddddk',
        'kkkkkkkkkkkkkkkk',
        '................'
      ], blockMap);

      this.compile('obj_stairs', [
        'kkkkkkkkkkkkkkkk',
        'kllllllllllllllk',
        'klkkkkkkkkkkkklk',
        'klkggggggggggklk',
        'klkddddddddddklk',
        'klkggggggggggklk',
        'klkddddddddddklk',
        'klkggggggggggklk',
        'klkddddddddddklk',
        'klkggggggggggklk',
        'klkddddddddddklk',
        'klkggggggggggklk',
        'klkddddddddddklk',
        'klkkkkkkkkkkkklk',
        'kkkkkkkkkkkkkkkk',
        '................'
      ], blockMap);

      // ======================================================================
      // ÍCONES DE ITENS & CONSUMÍVEIS (16x16) — Usados no mapa E no Inventário UI
      // ======================================================================
      const swordMap = { '.': null, k: P.ink, s: P.white, l: P.lightGray, g: P.gold, b: P.brown };
      this.compile('item_sword', [
        '............kkk.',
        '...........ksslk',
        '..........ksslk.',
        '.........ksslk..',
        '........ksslk...',
        '.......ksslk....',
        '......ksslk.....',
        '...kk.ksslk.....',
        '..kggksslk......',
        '...kggglk.......',
        '...kbbggk.......',
        '..kbbk.kk.......',
        '.kggk...........',
        '.kkk............',
        '................',
        '................'
      ], swordMap);

      const axeMap = { '.': null, k: P.ink, s: P.lightGray, w: P.white, b: P.brown, g: P.gold };
      this.compile('item_axe', [
        '......kkkk......',
        '....kksssskk....',
        '...ksswwwwssk...',
        '..ksswwkkbbssk..',
        '..ksssk..kbbk...',
        '...kkk...kbbk...',
        '.........kbbk...',
        '........kbbk....',
        '.......kbbk.....',
        '......kbbk......',
        '.....kbbk.......',
        '....kggk........',
        '....kkk.........',
        '................',
        '................',
        '................'
      ], axeMap);

      const staffMap = { '.': null, k: P.ink, c: P.cyan, w: P.white, b: P.brown, g: P.gold };
      this.compile('item_staff', [
        '..........kkkk..',
        '.........kcccck.',
        '........kcwwwwck',
        '........kcccccck',
        '.........kggggk.',
        '........kbbkk...',
        '.......kbbk.....',
        '......kbbk......',
        '.....kbbk.......',
        '....kbbk........',
        '...kbbk.........',
        '..kbbk..........',
        '.kggk...........',
        '.kkk............',
        '................',
        '................'
      ], staffMap);

      const daggerMap = { '.': null, k: P.ink, w: P.white, l: P.lightGray, g: P.green, d: P.darkGray };
      this.compile('item_dagger', [
        '................',
        '...........kkk..',
        '..........kwwlk.',
        '.........kwwlk..',
        '........kgglk...',
        '.......kgglk....',
        '......kddlk.....',
        '....kkddkk......',
        '...kggggk.......',
        '....kddk........',
        '...kddk.........',
        '..kggk..........',
        '..kkk...........',
        '................',
        '................',
        '................'
      ], daggerMap);

      const bowMap = { '.': null, k: P.ink, b: P.brown, o: P.ochre, w: P.lightGray, g: P.gold };
      this.compile('item_bow', [
        '.....kkkk.......',
        '....kobbk.......',
        '...kobk.wk......',
        '..kobk...wk.....',
        '..kbk.....wk....',
        '.kobk......wk...',
        '.kggk......wk...',
        '.kobk......wk...',
        '..kbk.....wk....',
        '..kobk...wk.....',
        '...kobk.wk......',
        '....kobbk.......',
        '.....kkkk.......',
        '................',
        '................',
        '................'
      ], bowMap);

      const spearMap = { '.': null, k: P.ink, w: P.white, c: P.cyan, b: P.brown, g: P.gold };
      this.compile('item_spear', [
        '.............kkk',
        '............kwck',
        '...........kwwck',
        '..........kwwkk.',
        '.........kggk...',
        '........kbbk....',
        '.......kbbk.....',
        '......kbbk......',
        '.....kbbk.......',
        '....kbbk........',
        '...kbbk.........',
        '..kbbk..........',
        '.kggk...........',
        '.kkk............',
        '................',
        '................'
      ], spearMap);

      const hammerMap = { '.': null, k: P.ink, s: P.lightGray, g: P.gold, o: P.orange, b: P.brown };
      this.compile('item_hammer', [
        '................',
        '...kkkkkkkkkk...',
        '..kggggggggggk..',
        '..kgoooooooogk..',
        '..kggggggggggk..',
        '...kkkkbbkkkk...',
        '......kbbk......',
        '......kbbk......',
        '......kbbk......',
        '......kbbk......',
        '......kbbk......',
        '......kbbk......',
        '.....kggggk.....',
        '.....kkkkkk.....',
        '................',
        '................'
      ], hammerMap);

      const scytheMap = { '.': null, k: P.ink, v: P.violet, a: P.acid, p: P.purple, b: P.darkGray };
      this.compile('item_scythe', [
        '....kkkkkkkkk...',
        '..kkvvvvvvvvvk..',
        '.kvaaaaaaaaaavk.',
        '.kvkkkppppppk.k.',
        '..kk......kbk...',
        '.........kbbk...',
        '........kbbk....',
        '.......kbbk.....',
        '......kbbk......',
        '.....kbbk.......',
        '....kbbk........',
        '...kbbk.........',
        '..kppk..........',
        '..kkk...........',
        '................',
        '................'
      ], scytheMap);

      const grimMap = { '.': null, k: P.ink, p: P.purple, v: P.violet, w: P.peach, g: P.gold, c: P.cyan };
      this.compile('item_grimoire', [
        '................',
        '..kkkkk..kkkkk..',
        '.kppppk..kppppk.',
        '.kpwwwk..kwwwpk.',
        '.kpwcwk..kwgwpk.',
        '.kpwwwk..kwwwpk.',
        '.kpwcwk..kwcwpk.',
        '.kpwwwk..kwwwpk.',
        '.kppppkggkppppk.',
        '..kkkkkkkkkkkk..',
        '...kggggggggk...',
        '...kkkkkkkkkk...',
        '................',
        '................',
        '................',
        '................'
      ], grimMap);

      const xbowMap = { '.': null, k: P.ink, b: P.brown, s: P.lightGray, w: P.white, g: P.gold };
      this.compile('item_crossbow', [
        '................',
        '.....kkkkkk.....',
        '...kksssssskk...',
        '..ksskkkkkkssk..',
        '..ksk..ww..ksk..',
        '.......ww.......',
        '..kkkggggggkkk..',
        '..kbbbbbbbbbbk..',
        '......kbbk......',
        '......kbbk......',
        '......kbbk......',
        '.....kggggk.....',
        '.....kkkkkk.....',
        '................',
        '................',
        '................'
      ], xbowMap);

      const armorMap = { '.': null, k: P.ink, s: P.lightGray, g: P.gray, b: P.blue, y: P.gold };
      this.compile('item_armor', [
        '................',
        '..kkkk....kkkk..',
        '.kssssk..kssssk.',
        'kssbbsskkssbbssk',
        'kssbbbbssbbbbssk',
        '.kkssbbyybbsskk.',
        '...kssbbbbssk...',
        '...kssggggssk...',
        '...kssggggssk...',
        '...kssggggssk...',
        '...kssggggssk...',
        '...kkkkkkkkkk...',
        '................',
        '................',
        '................',
        '................'
      ], armorMap);

      const relicMap = { '.': null, k: P.ink, g: P.gold, y: P.yellow, c: P.cyan, r: P.red };
      this.compile('item_relic', [
        '................',
        '......kkkk......',
        '.....kcccck.....',
        '....kcggggck....',
        '....kggggggk....',
        '...kggyyyyggk...',
        '..kggk....kggk..',
        '..kggk....kggk..',
        '..kggk....kggk..',
        '...kggk..kggk...',
        '....kggggggk....',
        '.....kkkkkk.....',
        '................',
        '................',
        '................',
        '................'
      ], relicMap);

      const potRedMap = { '.': null, k: P.ink, w: P.white, r: P.red, c: P.coral, g: P.lightGray, b: P.brown };
      this.compile('item_potion_hp', [
        '......kkkk......',
        '......kbbk......',
        '......kggk......',
        '.....kggggk.....',
        '....krrrrrrk....',
        '...krcrrrrrrk...',
        '..krcwrrrrrrrk..',
        '..krrrrrrrrrrk..',
        '..krrrrrrrrrrk..',
        '..krrrrrrrrrrk..',
        '...krrrrrrrrk...',
        '....kkkkkkkk....',
        '................',
        '................',
        '................',
        '................'
      ], potRedMap);

      const potBlueMap = { '.': null, k: P.ink, w: P.white, r: P.blue, c: P.cyan, g: P.lightGray, b: P.brown };
      this.compile('item_potion_mp', [
        '......kkkk......',
        '......kbbk......',
        '......kggk......',
        '.....kggggk.....',
        '....krrrrrrk....',
        '...krcrrrrrrk...',
        '..krcwrrrrrrrk..',
        '..krrrrrrrrrrk..',
        '..krrrrrrrrrrk..',
        '..krrrrrrrrrrk..',
        '...krrrrrrrrk...',
        '....kkkkkkkk....',
        '................',
        '................',
        '................',
        '................'
      ], potBlueMap);

      const potGoldMap = { '.': null, k: P.ink, w: P.white, r: P.gold, c: P.yellow, g: P.lightGray, b: P.brown };
      this.compile('item_potion_elixir', [
        '......kkkk......',
        '......kbbk......',
        '......kggk......',
        '.....kggggk.....',
        '....krrrrrrk....',
        '...krcrrrrrrk...',
        '..krcwrrrrrrrk..',
        '..krrrrrrrrrrk..',
        '..krrrrrrrrrrk..',
        '..krrrrrrrrrrk..',
        '...krrrrrrrrk...',
        '....kkkkkkkk....',
        '................',
        '................',
        '................',
        '................'
      ], potGoldMap);

      const potGreenMap = { '.': null, k: P.ink, w: P.white, r: P.green, c: P.acid, g: P.lightGray, b: P.brown };
      this.compile('item_potion_antidote', [
        '......kkkk......',
        '......kbbk......',
        '......kggk......',
        '.....kggggk.....',
        '....krrrrrrk....',
        '...krcrrrrrrk...',
        '..krcwrrrrrrrk..',
        '..krrrrrrrrrrk..',
        '..krrrrrrrrrrk..',
        '..krrrrrrrrrrk..',
        '...krrrrrrrrk...',
        '....kkkkkkkk....',
        '................',
        '................',
        '................',
        '................'
      ], potGreenMap);

      const bombMap = { '.': null, k: P.ink, d: P.darkGray, g: P.gray, y: P.yellow, o: P.orange, w: P.white };
      this.compile('item_bomb', [
        '.........yy.....',
        '........yoo.....',
        '.......kk.......',
        '......kggk......',
        '....kkddddkk....',
        '...kddwddddddk..',
        '..kddwdddddddk..',
        '..kddddddddddk..',
        '..kddddddddddk..',
        '..kddddddddddk..',
        '...kddddddddk...',
        '....kkkkkkkk....',
        '................',
        '................',
        '................',
        '................'
      ], bombMap);

      const keyMap = { '.': null, k: P.ink, g: P.gold, y: P.yellow };
      this.compile('item_key', [
        '................',
        '.....kkkkkk.....',
        '....kggggggk....',
        '...kggyyyyggk...',
        '...kggk..kggk...',
        '....kggggggk....',
        '.....kkggkk.....',
        '.......kggk.....',
        '.......kggkkk...',
        '.......kggggk...',
        '.......kggk.....',
        '.......kggkkk...',
        '.......kggggk...',
        '........kkkk....',
        '................',
        '................'
      ], keyMap);

      const bossKeyMap = { '.': null, k: P.ink, r: P.red, g: P.gold, y: P.yellow };
      this.compile('item_boss_key', [
        '....kkkkkkkk....',
        '...kggggggggk...',
        '..kgggrrrrgggk..',
        '..kggryyyyrggk..',
        '..kgggrrrrgggk..',
        '...kkggggggkk...',
        '......kggk......',
        '......kggkkk....',
        '......kggggk....',
        '......kggk......',
        '......kggkkk....',
        '......kggggk....',
        '.......kkkk.....',
        '................',
        '................',
        '................'
      ], bossKeyMap);

      const scrollMap = { '.': null, k: P.ink, t: P.tan, p: P.peach, r: P.purple, g: P.gold };
      this.compile('item_scroll', [
        '....kkkkkkkkk...',
        '...ktttttttttk..',
        '..kttpppppppttk.',
        '..kttprrrrppttk.',
        '..kttpppppppttk.',
        '..kttpggggppttk.',
        '..kttpppppppttk.',
        '..kttprrrrppttk.',
        '..kttpppppppttk.',
        '...ktttttttttk..',
        '....kkkkkkkkk...',
        '................',
        '................',
        '................',
        '................',
        '................'
      ], scrollMap);

      const coinMap = { '.': null, k: P.ink, g: P.gold, y: P.yellow, o: P.ochre };
      this.compile('item_coin', [
        '................',
        '................',
        '.....kkkkkk.....',
        '....kggggggk....',
        '...kggyyyyggk...',
        '...kgyyoooygk...',
        '...kgyyoooygk...',
        '...kgyyoooygk...',
        '...kggyyyyggk...',
        '....kggggggk....',
        '.....kkkkkk.....',
        '................',
        '................',
        '................',
        '................',
        '................'
      ], coinMap);

      // Fragmentos Elementais
      const shardRows = [
        '................',
        '.......kk.......',
        '......kcck......',
        '.....kcwwck.....',
        '....kccwwcck....',
        '....kcccccck....',
        '....kcddddck....',
        '.....kddddk.....',
        '......kddk......',
        '.......kk.......',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................'
      ];
      this.compile('shard_fire', shardRows, { '.': null, k: P.ink, c: P.orange, w: P.yellow, d: P.red });
      this.compile('shard_ice', shardRows, { '.': null, k: P.ink, c: P.cyan, w: P.white, d: P.blue });
      this.compile('shard_lightning', shardRows, { '.': null, k: P.ink, c: P.yellow, w: P.white, d: P.gold });
      this.compile('shard_poison', shardRows, { '.': null, k: P.ink, c: P.acid, w: P.lime, d: P.darkGreen });
      this.compile('shard_arcane', shardRows, { '.': null, k: P.ink, c: P.violet, w: P.pink, d: P.purple });

      const soulMap = { '.': null, k: P.ink, c: P.cyan, w: P.white, b: P.sky };
      this.compile('item_soul', [
        '......kkkk......',
        '....kkbbbbkk....',
        '...kbbccccbbk...',
        '..kbbcwwwwcbbk..',
        '..kbbcwwwwcbbk..',
        '...kbbccccbbk...',
        '....kbbbbbbk....',
        '.....kbbbbk.....',
        '......kbbk......',
        '.......kk.......',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................'
      ], soulMap);
    }
  };

  G.SpriteBank = SpriteBank;
  G.drawPixelText = drawPixelText;
  G.measurePixelText = measurePixelText;
})(window.Game8Bit);
