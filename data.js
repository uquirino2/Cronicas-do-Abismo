// ============================================================================
// CRÔNICAS DO ABISMO 8-BIT — Classes, Biomas, Inimigos, Itens, Forja & Lore
// ============================================================================

window.Game8Bit = window.Game8Bit || {};

(function (G) {
  'use strict';

  const P = G.PAL;

  const DIFFICULTIES = {
    normal: {
      id: 'normal',
      name: 'Aventureiro',
      desc: 'Equilíbrio clássico 8-bit. Inimigos padrão e recompensas normais.',
      enemyHpMult: 1.0,
      enemyDmgMult: 1.0,
      lootMult: 1.0,
      soulMult: 1.0
    },
    veteran: {
      id: 'veteran',
      name: 'Veterano',
      desc: 'Mais elites e armadilhas letais. +35% Ouro e Almas Ancestrais.',
      enemyHpMult: 1.32,
      enemyDmgMult: 1.25,
      lootMult: 1.25,
      soulMult: 1.35
    },
    nightmare: {
      id: 'nightmare',
      name: 'Pesadelo',
      desc: 'Brutal e implacável. Chefes ferozes, +75% Almas Ancestrais.',
      enemyHpMult: 1.65,
      enemyDmgMult: 1.55,
      lootMult: 1.5,
      soulMult: 1.75
    }
  };

  const CLASSES = {
    knight: {
      id: 'knight',
      name: 'Cavaleiro da Guarda',
      title: 'Bastião de Ferro',
      spritePrefix: 'hero_knight',
      desc: 'Guerreiro blindado especialista em combate corpo-a-corpo e Parry com escudo. Alta vitalidade e defesa.',
      stats: {
        maxHp: 120,
        maxMp: 40,
        maxStamina: 100,
        atk: 14,
        mag: 6,
        def: 6,
        speed: 78,
        crit: 0.08
      },
      growth: { hp: 18, mp: 5, atk: 3, mag: 1, def: 2 },
      skill: {
        name: 'Investida Sísmica',
        cost: 16,
        cooldown: 5.5,
        desc: 'Avança esmagando o chão em onda de choque que atordoa e causa dano em área.'
      },
      parryBonus: 0.10, // janela extra de parry
      startWeapon: 'tpl_iron_sword',
      startArmor: 'tpl_guard_plate'
    },

    mage: {
      id: 'mage',
      name: 'Maga Rúnica',
      title: 'Tecelã de Éter',
      spritePrefix: 'hero_mage',
      desc: 'Dispara projéteis arcanos à distância e amplifica reações elementais. Regenera mana rapidamente.',
      stats: {
        maxHp: 84,
        maxMp: 95,
        maxStamina: 95,
        atk: 7,
        mag: 16,
        def: 2,
        speed: 82,
        crit: 0.10
      },
      growth: { hp: 10, mp: 14, atk: 1, mag: 4, def: 1 },
      skill: {
        name: 'Nova Elemental',
        cost: 22,
        cooldown: 5.0,
        desc: 'Libera 8 orbes elementais em espiral usando a afinidade da sua arma equipada.'
      },
      parryBonus: 0.0,
      startWeapon: 'tpl_apprentice_staff',
      startArmor: 'tpl_rune_robe'
    },

    assassin: {
      id: 'assassin',
      name: 'Assassino Sombrio',
      title: 'Lâmina Oculta',
      spritePrefix: 'hero_assassin',
      desc: 'Ágil e mortal. Ataques rápidos com adagas envenenadas e golpes críticos devastadores pelas costas.',
      stats: {
        maxHp: 94,
        maxMp: 55,
        maxStamina: 130,
        atk: 12,
        mag: 9,
        def: 3,
        speed: 96,
        crit: 0.22
      },
      growth: { hp: 12, mp: 8, atk: 3, mag: 2, def: 1 },
      skill: {
        name: 'Passo Sombrio',
        cost: 14,
        cooldown: 4.0,
        desc: 'Teleporta-se deixando uma bomba de veneno e garante 100% de Crítico no próximo golpe.'
      },
      parryBonus: 0.04,
      startWeapon: 'tpl_shadow_daggers',
      startArmor: 'tpl_night_leather'
    }
  };

  const BIOMES = [
    {
      id: 'catacombs',
      floor: 1,
      name: 'Catacumbas de Obsidiana',
      subtitle: 'Andar I — Ossos e Ecos',
      music: 'dungeon1',
      wallTop: '#242234',
      wallFace: '#3d3a54',
      wallTrim: '#5c5a6e',
      floorA: '#171522',
      floorB: '#1d1a2c',
      floorAccent: '#28243b',
      ambientDarkness: 0.28,
      enemies: ['skeleton', 'bat', 'slime', 'shield'],
      hazards: ['oil', 'spikes', 'water'],
      bossId: 'boss_bone_king',
      lore: 'Criptas antigas onde guerreiros caídos ainda montam guarda sob ordens de Vael.'
    },
    {
      id: 'forge',
      floor: 2,
      name: 'Forja Vulcânica',
      subtitle: 'Andar II — Brasas Eternas',
      music: 'dungeon2',
      wallTop: '#361614',
      wallFace: '#5a221c',
      wallTrim: '#8c3b28',
      floorA: '#1c1012',
      floorB: '#261416',
      floorAccent: '#381a18',
      ambientDarkness: 0.22,
      enemies: ['goblin', 'pyro', 'golem', 'slime', 'shield'],
      hazards: ['oil', 'lava', 'spikes'],
      bossId: 'boss_ignis_rex',
      lore: 'Cuidado com poças de óleo e barris voláteis: uma faísca transforma a sala num inferno.'
    },
    {
      id: 'library',
      floor: 3,
      name: 'Biblioteca Arcana',
      subtitle: 'Andar III — Tomos Proibidos',
      music: 'dungeon3',
      wallTop: '#162442',
      wallFace: '#243c6e',
      wallTrim: '#486cb4',
      floorA: '#0f1628',
      floorB: '#141e36',
      floorAccent: '#1c2a48',
      ambientDarkness: 0.26,
      enemies: ['stalker', 'turret', 'necro', 'bat', 'goblin'],
      hazards: ['water', 'ice', 'spikes'],
      bossId: 'boss_lyra',
      lore: 'Canais de água rúnica conduzem eletricidade e congelam sob magia de gelo.'
    },
    {
      id: 'citadel',
      floor: 4,
      name: 'Cidadela do Abismo',
      subtitle: 'Andar IV — Trono de Malakor',
      music: 'dungeon4',
      wallTop: '#2a0e38',
      wallFace: '#48185e',
      wallTrim: '#7a2c9c',
      floorA: '#14081c',
      floorB: '#1c0c26',
      floorAccent: '#2b123b',
      ambientDarkness: 0.32,
      enemies: ['stalker', 'necro', 'golem', 'pyro', 'shield', 'turret'],
      hazards: ['oil', 'water', 'lava', 'spikes'],
      bossId: 'boss_malakor',
      lore: 'O coração corrompido do Abismo. Apenas mestres de espada, escudo e alquimia sobrevivem.'
    }
  ];

  const ENEMIES = {
    skeleton: {
      id: 'skeleton',
      name: 'Esqueleto Lanceiro',
      sprite: 'enemy_skeleton',
      hp: 34,
      atk: 10,
      speed: 44,
      range: 20,
      windup: 0.42,
      cooldown: 1.15,
      ai: 'melee',
      element: 'physical',
      weak: 'fire',
      resist: 'poison',
      xp: 16,
      gold: [4, 10],
      lore: 'Avança direto e telegrafa estocadas. Fácil de punir com Parry no momento do clarão.'
    },
    bat: {
      id: 'bat',
      name: 'Morcego Sombrio',
      sprite: 'enemy_bat',
      hp: 22,
      atk: 8,
      speed: 68,
      range: 16,
      windup: 0.28,
      cooldown: 0.9,
      ai: 'erratic',
      element: 'physical',
      weak: 'lightning',
      resist: null,
      xp: 12,
      gold: [2, 6],
      flying: true,
      lore: 'Voa sobre poças, espinhos e blocos. Ataca em mergulhos imprevisíveis.'
    },
    slime: {
      id: 'slime',
      name: 'Slime Ácido',
      sprite: 'enemy_slime',
      hp: 40,
      atk: 9,
      speed: 32,
      range: 16,
      windup: 0.45,
      cooldown: 1.3,
      ai: 'slime',
      element: 'poison',
      weak: 'ice',
      resist: 'poison',
      xp: 18,
      gold: [5, 11],
      lore: 'Slimes grandes se dividem em dois mini-slimes ao morrer se não forem congelados.'
    },
    shield: {
      id: 'shield',
      name: 'Guardião de Escudo',
      sprite: 'enemy_shield',
      hp: 54,
      atk: 13,
      speed: 34,
      range: 20,
      windup: 0.55,
      cooldown: 1.4,
      ai: 'shield',
      element: 'physical',
      weak: 'lightning',
      resist: 'physical',
      xp: 24,
      gold: [8, 16],
      lore: 'Bloqueia ataques frontais! Contorne-o com Dash, use bombas ou acerte com Raio/Fogo.'
    },
    goblin: {
      id: 'goblin',
      name: 'Goblin Arqueiro',
      sprite: 'enemy_goblin',
      hp: 28,
      atk: 11,
      speed: 52,
      range: 140,
      windup: 0.55,
      cooldown: 1.6,
      ai: 'ranged',
      element: 'physical',
      weak: 'fire',
      resist: null,
      xp: 18,
      gold: [5, 12],
      lore: 'Mantém distância e dispara flechas rápidas que podem ser refletidas com Escudo (Parry).'
    },
    pyro: {
      id: 'pyro',
      name: 'Piromante Cultista',
      sprite: 'enemy_pyro',
      hp: 36,
      atk: 14,
      speed: 40,
      range: 130,
      windup: 0.65,
      cooldown: 1.9,
      ai: 'caster',
      element: 'fire',
      weak: 'ice',
      resist: 'fire',
      xp: 26,
      gold: [9, 18],
      lore: 'Lança bolas de fogo que incendeiam óleo e explodem barris no caminho.'
    },
    stalker: {
      id: 'stalker',
      name: 'Espectro Teletransportador',
      sprite: 'enemy_stalker',
      hp: 42,
      atk: 15,
      speed: 48,
      range: 24,
      windup: 0.45,
      cooldown: 1.45,
      ai: 'stalker',
      element: 'arcane',
      weak: 'lightning',
      resist: 'arcane',
      xp: 30,
      gold: [10, 20],
      lore: 'Teleporta-se para perto do jogador após sofrer dano ou a cada ciclo de caça.'
    },
    golem: {
      id: 'golem',
      name: 'Golem de Magma',
      sprite: 'enemy_golem',
      hp: 86,
      atk: 18,
      speed: 25,
      range: 24,
      windup: 0.72,
      cooldown: 1.9,
      ai: 'golem',
      element: 'fire',
      weak: 'ice',
      resist: 'fire',
      xp: 38,
      gold: [14, 26],
      lore: 'Lento mas resistente. Golpeia o chão criando ondas sísmicas flamejantes.'
    },
    necro: {
      id: 'necro',
      name: 'Necromante Sombrio',
      sprite: 'enemy_necro',
      hp: 46,
      atk: 13,
      speed: 35,
      range: 145,
      windup: 0.75,
      cooldown: 2.6,
      ai: 'necro',
      element: 'poison',
      weak: 'fire',
      resist: 'arcane',
      xp: 34,
      gold: [12, 22],
      lore: 'Dispara orbes venenosos e invoca Esqueletos se não for eliminado rapidamente.'
    },
    turret: {
      id: 'turret',
      name: 'Totem Arcano',
      sprite: 'enemy_turret',
      hp: 58,
      atk: 13,
      speed: 0,
      range: 180,
      windup: 0.5,
      cooldown: 1.85,
      ai: 'turret',
      element: 'lightning',
      weak: 'physical',
      resist: 'lightning',
      xp: 28,
      gold: [10, 18],
      lore: 'Torreta imóvel que dispara rajadas elétricas em cruz ou mirando o intruso.'
    },
    mimic: {
      id: 'mimic',
      name: 'Baú Mímico',
      sprite: 'enemy_mimic',
      hp: 74,
      atk: 17,
      speed: 58,
      range: 20,
      windup: 0.38,
      cooldown: 1.1,
      ai: 'melee',
      element: 'physical',
      weak: 'fire',
      resist: null,
      xp: 45,
      gold: [28, 45],
      lore: 'Disfarça-se de baú comum! Se sobreviver à emboscada, derruba tesouros valiosos.'
    }
  };

  const BOSSES = {
    boss_bone_king: {
      id: 'boss_bone_king',
      name: 'Rei Ossário Vael',
      title: 'Senhor das Catacumbas',
      sprite: 'boss_bone_king',
      hp: 320,
      atk: 17,
      speed: 44,
      element: 'physical',
      weak: 'fire',
      xp: 150,
      gold: [75, 110],
      lore: 'O primeiro monarca sepultado em Obsidiana. Arremessa foices de osso e convoca sua guarda.'
    },
    boss_ignis_rex: {
      id: 'boss_ignis_rex',
      name: 'Ignis Rex, o Forjador',
      title: 'Titã das Brasas',
      sprite: 'boss_ignis_rex',
      hp: 460,
      atk: 21,
      speed: 40,
      element: 'fire',
      weak: 'ice',
      xp: 240,
      gold: [110, 160],
      lore: 'Forjou as lâminas demoníacas do Abismo. Suas investidas deixam rastros de fogo.'
    },
    boss_lyra: {
      id: 'boss_lyra',
      name: 'Arquimaga Lyra',
      title: 'Guardiã dos Espelhos',
      sprite: 'boss_lyra',
      hp: 580,
      atk: 23,
      speed: 52,
      element: 'lightning',
      weak: 'poison',
      xp: 340,
      gold: [150, 210],
      lore: 'Enlouquecida pelo éter proibido. Teleporta-se entre runas alternando gelo e trovão.'
    },
    boss_malakor: {
      id: 'boss_malakor',
      name: 'Malakor, Senhor do Abismo',
      title: 'Soberano da Coroa Partida',
      sprite: 'boss_malakor',
      hp: 820,
      atk: 27,
      speed: 54,
      element: 'arcane',
      weak: null,
      xp: 600,
      gold: [250, 350],
      lore: 'A entidade primordial no fundo da Cidadela. Alterna os 4 elementos na segunda fase.'
    }
  };

  const RARITIES = {
    comum: { id: 'comum', name: 'Comum', color: '#a4a2b8', mult: 1.0, affixCount: 0 },
    incomum: { id: 'incomum', name: 'Incomum', color: '#78d838', mult: 1.22, affixCount: 1 },
    raro: { id: 'raro', name: 'Raro', color: '#4898f8', mult: 1.48, affixCount: 1 },
    epico: { id: 'epico', name: 'Épico', color: '#c458f8', mult: 1.82, affixCount: 2 },
    lendario: { id: 'lendario', name: 'Lendário', color: '#f8b818', mult: 2.25, affixCount: 2 }
  };

  const ITEM_TEMPLATES = {
    // Armas
    tpl_iron_sword: { id: 'tpl_iron_sword', name: 'Espada de Ferro', slot: 'weapon', kind: 'sword', icon: 'item_sword', baseAtk: 10, baseMag: 0, range: 26, arc: 1.9, speed: 1.0, element: 'physical', value: 30 },
    tpl_broad_axe: { id: 'tpl_broad_axe', name: 'Machado de Guerra', slot: 'weapon', kind: 'axe', icon: 'item_axe', baseAtk: 15, baseMag: 0, range: 28, arc: 2.4, speed: 0.78, element: 'physical', value: 45 },
    tpl_apprentice_staff: { id: 'tpl_apprentice_staff', name: 'Cajado Rúnico', slot: 'weapon', kind: 'staff', icon: 'item_staff', baseAtk: 4, baseMag: 12, range: 155, ranged: true, speed: 1.0, element: 'arcane', value: 34 },
    tpl_shadow_daggers: { id: 'tpl_shadow_daggers', name: 'Adagas Sombrias', slot: 'weapon', kind: 'dagger', icon: 'item_dagger', baseAtk: 9, baseMag: 2, range: 22, arc: 1.4, speed: 1.38, element: 'poison', value: 36 },
    tpl_rune_bow: { id: 'tpl_rune_bow', name: 'Arco Élfico', slot: 'weapon', kind: 'bow', icon: 'item_bow', baseAtk: 11, baseMag: 4, range: 180, ranged: true, speed: 1.12, element: 'physical', value: 42 },
    tpl_flame_blade: { id: 'tpl_flame_blade', name: 'Lâmina Solar', slot: 'weapon', kind: 'sword', icon: 'item_sword', baseAtk: 14, baseMag: 6, range: 28, arc: 2.0, speed: 1.06, element: 'fire', value: 65 },
    tpl_frost_wand: { id: 'tpl_frost_wand', name: 'Cetro Glacial', slot: 'weapon', kind: 'staff', icon: 'item_staff', baseAtk: 5, baseMag: 15, range: 165, ranged: true, speed: 1.04, element: 'ice', value: 68 },
    tpl_storm_halberd: { id: 'tpl_storm_halberd', name: 'Machado Tempestuoso', slot: 'weapon', kind: 'axe', icon: 'item_axe', baseAtk: 17, baseMag: 8, range: 30, arc: 2.4, speed: 0.85, element: 'lightning', value: 74 },

    // Armaduras
    tpl_guard_plate: { id: 'tpl_guard_plate', name: 'Armadura da Guarda', slot: 'armor', icon: 'item_armor', baseDef: 5, bonusHp: 15, value: 32 },
    tpl_rune_robe: { id: 'tpl_rune_robe', name: 'Manto Arcano', slot: 'armor', icon: 'item_armor', baseDef: 2, bonusMp: 22, bonusMag: 4, value: 32 },
    tpl_night_leather: { id: 'tpl_night_leather', name: 'Couro das Sombras', slot: 'armor', icon: 'item_armor', baseDef: 3, bonusSpeed: 10, bonusCrit: 0.06, value: 34 },
    tpl_dragon_mail: { id: 'tpl_dragon_mail', name: 'Cota Dracônica', slot: 'armor', icon: 'item_armor', baseDef: 8, bonusHp: 30, resist: 'fire', value: 78 },
    tpl_void_shroud: { id: 'tpl_void_shroud', name: 'Mortalha do Abismo', slot: 'armor', icon: 'item_armor', baseDef: 6, bonusMp: 25, bonusCrit: 0.08, resist: 'arcane', value: 84 },

    // Relíquias
    tpl_vamp_ring: { id: 'tpl_vamp_ring', name: 'Anel Carmesim', slot: 'relic', icon: 'item_relic', vampiric: 0.08, bonusHp: 10, value: 55, desc: 'Drena 8% do dano causado como Vida.' },
    tpl_mana_amulet: { id: 'tpl_mana_amulet', name: 'Amuleto Etéreo', slot: 'relic', icon: 'item_relic', mpRegen: 2.5, bonusMp: 20, value: 52, desc: '+2.5/s de regeneração de Mana e +20 MP.' },
    tpl_parry_seal: { id: 'tpl_parry_seal', name: 'Selo do Duelista', slot: 'relic', icon: 'item_relic', parryWindow: 0.12, bonusAtk: 4, value: 58, desc: 'Aumenta janela de Parry e +4 ATQ.' },
    tpl_swift_boots: { id: 'tpl_swift_boots', name: 'Talismã do Vento', slot: 'relic', icon: 'item_relic', bonusSpeed: 14, stamRegen: 10, value: 50, desc: '+14 Velocidade e +10 Vigor/s.' },
    tpl_prism_core: { id: 'tpl_prism_core', name: 'Núcleo Prismático', slot: 'relic', icon: 'item_relic', bonusMag: 7, bonusCrit: 0.08, value: 70, desc: '+7 Poder Mágico e +8% Chance Crítica.' },

    // Consumíveis & Utilitários
    cons_hp_pot: { id: 'cons_hp_pot', name: 'Poção de Vida', slot: 'consumable', icon: 'item_potion_hp', healHp: 55, stackable: true, value: 18, desc: 'Restaura 55 de Vida imediatamente.' },
    cons_elixir: { id: 'cons_elixir', name: 'Elixir Supremo', slot: 'consumable', icon: 'item_potion_elixir', healHp: 120, healMp: 60, cureAll: true, stackable: true, value: 48, desc: 'Restaura 120 HP, 60 MP e cura veneno/queimadura.' },
    cons_mp_pot: { id: 'cons_mp_pot', name: 'Éter Arcano', slot: 'consumable', icon: 'item_potion_mp', healMp: 50, stackable: true, value: 18, desc: 'Restaura 50 de Mana imediatamente.' },
    cons_antidote: { id: 'cons_antidote', name: 'Antídoto Herbal', slot: 'consumable', icon: 'item_potion_antidote', cureAll: true, healHp: 20, stackable: true, value: 14, desc: 'Remove efeitos negativos e cura 20 HP.' },
    cons_scroll_fire: { id: 'cons_scroll_fire', name: 'Pergaminho Ígneo', slot: 'consumable', icon: 'item_scroll', spell: 'fire_ring', stackable: true, value: 28, desc: 'Explode onda de fogo ao redor, incendiando inimigos e óleo.' },
    cons_scroll_ice: { id: 'cons_scroll_ice', name: 'Pergaminho Glacial', slot: 'consumable', icon: 'item_scroll', spell: 'ice_nova', stackable: true, value: 28, desc: 'Congela inimigos próximos e transforma água em gelo.' },
    cons_scroll_shock: { id: 'cons_scroll_shock', name: 'Pergaminho Voltaico', slot: 'consumable', icon: 'item_scroll', spell: 'lightning_storm', stackable: true, value: 30, desc: 'Dispara raios em cadeia pela sala inteira.' }
  };

  const AFFIXES = [
    { id: 'flame', suffix: 'das Chamas', element: 'fire', bonusMag: 3, desc: 'Imbui ataques com Fogo.' },
    { id: 'frost', suffix: 'do Inverno', element: 'ice', bonusMag: 3, desc: 'Imbui ataques com Gelo (lentidão).' },
    { id: 'volt', suffix: 'da Tempestade', element: 'lightning', bonusAtk: 2, bonusCrit: 0.04, desc: 'Imbui com Raio e +4% Crítico.' },
    { id: 'venom', suffix: 'da Víbora', element: 'poison', bonusAtk: 2, desc: 'Imbui ataques com Veneno contínuo.' },
    { id: 'vamp', suffix: 'Sanguinário', vampiric: 0.06, desc: 'Rouba 6% de Vida ao causar dano.' },
    { id: 'titan', suffix: 'do Titã', bonusHp: 22, bonusDef: 2, desc: '+22 HP Máximo e +2 Defesa.' },
    { id: 'sage', suffix: 'do Sábio', bonusMp: 18, bonusMag: 5, desc: '+18 MP Máximo e +5 Magia.' },
    { id: 'swift', suffix: 'Veloz', bonusSpeed: 8, bonusCrit: 0.05, desc: '+8 Velocidade e +5% Crítico.' }
  ];

  const SHARDS = {
    fire: { id: 'shard_fire', name: 'Fragmento Ígneo', icon: 'shard_fire', element: 'fire', color: P.orange },
    ice: { id: 'shard_ice', name: 'Fragmento Glacial', icon: 'shard_ice', element: 'ice', color: P.cyan },
    lightning: { id: 'shard_lightning', name: 'Fragmento Voltaico', icon: 'shard_lightning', element: 'lightning', color: P.yellow },
    poison: { id: 'shard_poison', name: 'Fragmento Tóxico', icon: 'shard_poison', element: 'poison', color: P.acid },
    arcane: { id: 'shard_arcane', name: 'Fragmento Arcano', icon: 'shard_arcane', element: 'arcane', color: P.violet }
  };

  // Gera instância única de equipamento procedural
  let _uidCounter = 1;
  function makeTemplateItem(tplId, rarityId = 'comum', upgradeLevel = 0) {
    const tpl = ITEM_TEMPLATES[tplId];
    if (!tpl) return null;
    if (tpl.slot === 'consumable') {
      return Object.assign({}, tpl, { uid: 'item_' + (_uidCounter++), qty: 1 });
    }
    const rar = RARITIES[rarityId] || RARITIES.comum;
    const item = {
      uid: 'eq_' + (_uidCounter++),
      tplId: tpl.id,
      name: tpl.name,
      slot: tpl.slot,
      kind: tpl.kind || null,
      icon: tpl.icon,
      rarity: rar.id,
      rarityName: rar.name,
      rarityColor: rar.color,
      upgrade: upgradeLevel,
      element: tpl.element || 'physical',
      ranged: !!tpl.ranged,
      range: tpl.range || 24,
      arc: tpl.arc || 1.8,
      speed: tpl.speed || 1.0,
      atk: Math.round((tpl.baseAtk || 0) * rar.mult),
      mag: Math.round((tpl.baseMag || 0) * rar.mult),
      def: Math.round((tpl.baseDef || 0) * rar.mult),
      bonusHp: Math.round((tpl.bonusHp || 0) * rar.mult),
      bonusMp: Math.round((tpl.bonusMp || 0) * rar.mult),
      bonusSpeed: tpl.bonusSpeed || 0,
      bonusCrit: tpl.bonusCrit || 0,
      vampiric: tpl.vampiric || 0,
      mpRegen: tpl.mpRegen || 0,
      stamRegen: tpl.stamRegen || 0,
      parryWindow: tpl.parryWindow || 0,
      resist: tpl.resist || null,
      affixes: [],
      value: Math.round((tpl.value || 25) * rar.mult),
      desc: tpl.desc || ''
    };
    return item;
  }

  function generateProceduralLoot(rng, floorNum, forcedSlot = null, minRarity = null) {
    // Chance de consumível vs equipamento
    if (!forcedSlot && rng.chance(0.32)) {
      const pool = ['cons_hp_pot', 'cons_mp_pot', 'cons_antidote', 'cons_scroll_fire', 'cons_scroll_ice', 'cons_scroll_shock', 'cons_elixir'];
      const weights = floorNum >= 3 ? pool : pool.slice(0, 6);
      return makeTemplateItem(rng.pick(weights));
    }

    const slots = forcedSlot ? [forcedSlot] : ['weapon', 'weapon', 'armor', 'relic'];
    const targetSlot = rng.pick(slots);
    const pool = Object.values(ITEM_TEMPLATES).filter(t => t.slot === targetSlot);
    const tpl = rng.pick(pool);

    const roll = rng.next() + (floorNum - 1) * 0.12;
    let rarityId = 'comum';
    if (roll > 1.15) rarityId = 'lendario';
    else if (roll > 0.92) rarityId = 'epico';
    else if (roll > 0.65) rarityId = 'raro';
    else if (roll > 0.34) rarityId = 'incomum';

    const order = ['comum', 'incomum', 'raro', 'epico', 'lendario'];
    if (minRarity && order.indexOf(rarityId) < order.indexOf(minRarity)) {
      rarityId = minRarity;
    }

    const item = makeTemplateItem(tpl.id, rarityId, 0);
    const rar = RARITIES[rarityId];

    // Aplicar afixos procedurais
    const candidates = rng.shuffle(AFFIXES);
    for (let i = 0; i < rar.affixCount && i < candidates.length; i++) {
      const af = candidates[i];
      item.affixes.push(af.id);
      if (i === 0) item.name += ' ' + af.suffix;
      if (af.element && item.slot === 'weapon') item.element = af.element;
      if (af.bonusAtk) item.atk += af.bonusAtk;
      if (af.bonusMag) item.mag += af.bonusMag;
      if (af.bonusDef) item.def += af.bonusDef;
      if (af.bonusHp) item.bonusHp += af.bonusHp;
      if (af.bonusMp) item.bonusMp += af.bonusMp;
      if (af.bonusSpeed) item.bonusSpeed += af.bonusSpeed;
      if (af.bonusCrit) item.bonusCrit += af.bonusCrit;
      if (af.vampiric) item.vampiric += af.vampiric;
      item.value += 18;
    }
    return item;
  }

  // Receitas da Forja Rúnica
  const FORGE_RECIPES = [
    {
      id: 'craft_elixir',
      name: 'Destilar Elixir Supremo',
      icon: 'item_potion_elixir',
      desc: 'Restaura 120 HP, 60 MP e cura efeitos.',
      gold: 20,
      shards: { arcane: 1, poison: 1 },
      type: 'consumable',
      resultTpl: 'cons_elixir'
    },
    {
      id: 'craft_bombs',
      name: 'Forjar 3 Bombas Rúnicas',
      icon: 'item_bomb',
      desc: 'Adiciona +3 Bombas ao inventário para explodir paredes e chefes.',
      gold: 18,
      shards: { fire: 1 },
      type: 'bombs',
      qty: 3
    },
    {
      id: 'craft_key',
      name: 'Moldar Chave Mestra',
      icon: 'item_key',
      desc: 'Forja +1 Chave para abrir cofres e portas trancadas.',
      gold: 25,
      shards: { arcane: 1 },
      type: 'keys',
      qty: 1
    },
    {
      id: 'craft_legend_relic',
      name: 'Forjar Núcleo Prismático (Épico)',
      icon: 'item_relic',
      desc: 'Cria uma Relíquia Épica com bônus mágicos e críticos elevados.',
      gold: 60,
      shards: { fire: 1, ice: 1, lightning: 1 },
      type: 'loot',
      slot: 'relic',
      minRarity: 'epico'
    }
  ];

  // Bênçãos de Santuário & Nível (12 perks sinérgicos)
  const BLESSINGS = [
    { id: 'blood_pact', name: 'Pacto Carmesim', desc: '+18% Dano total e +5% Roubo de Vida.', icon: 'item_sword', apply: p => { p.perks.dmgMult += 0.18; p.perks.lifesteal += 0.05; } },
    { id: 'iron_bastion', name: 'Bastião de Ferro', desc: '+25 HP Máx, +4 Defesa e reduz dano bloqueado em 90%.', icon: 'item_armor', apply: p => { p.bonusMaxHp += 25; p.hp = Math.min(p.getMaxHp(), p.hp + 25); p.perks.flatDef += 4; } },
    { id: 'arcane_echo', name: 'Eco Arcano', desc: '+30 MP Máx, +20% Poder Mágico e -20% Recarga de Habilidade.', icon: 'item_staff', apply: p => { p.bonusMaxMp += 30; p.mp = Math.min(p.getMaxMp(), p.mp + 30); p.perks.magMult += 0.20; p.perks.cdr += 0.20; } },
    { id: 'storm_step', name: 'Passo Relâmpago', desc: 'Seu Dash libera um choque elétrico ao redor que atordoa.', icon: 'shard_lightning', apply: p => { p.perks.shockDash = true; } },
    { id: 'ember_soul', name: 'Alma Incandescente', desc: 'Ataques têm 35% de chance de incendiar e você é imune a Queimadura.', icon: 'shard_fire', apply: p => { p.perks.emberHit = true; p.perks.immuneFire = true; } },
    { id: 'frost_heart', name: 'Coração Glacial', desc: 'Parry Perfeito congela inimigos próximos por 2.5s.', icon: 'shard_ice', apply: p => { p.perks.frostParry = true; } },
    { id: 'venom_mastery', name: 'Mestre das Toxinas', desc: 'Dano de Veneno dobra e inimigos envenenados explodem ao morrer.', icon: 'shard_poison', apply: p => { p.perks.venomBurst = true; } },
    { id: 'treasure_hunter', name: 'Olho de Ouro', desc: '+40% Ouro encontrado e baús sempre dão Fragmentos extras.', icon: 'item_coin', apply: p => { p.perks.goldMult += 0.40; } },
    { id: 'critical_fury', name: 'Fúria Letal', desc: '+15% Chance Crítica e Críticos causam 2.1x de dano.', icon: 'item_dagger', apply: p => { p.perks.bonusCrit += 0.15; p.perks.critMult += 0.35; } },
    { id: 'phoenix_spark', name: 'Centelha da Fênix', desc: '1x por andar, sobrevive a um golpe fatal com 40% de Vida e explode em fogo.', icon: 'item_potion_elixir', apply: p => { p.perks.reviveFloor = true; } },
    { id: 'bomb_expert', name: 'Alquimista Explosivo', desc: '+3 Bombas imediatas e explosões causam +50% de dano.', icon: 'item_bomb', apply: p => { p.bombs += 3; p.perks.bombMult += 0.50; } },
    { id: 'vital_surge', name: 'Fluxo Vital', desc: 'Regenera 1.5 HP/s fora de combate e +25% eficácia de Poções.', icon: 'item_potion_hp', apply: p => { p.perks.hpRegen += 1.5; p.perks.potionMult += 0.25; } }
  ];

  // Meta-progressão permanente (Altar das Almas Ancestrais)
  const META_UPGRADES = [
    { id: 'meta_hp', name: 'Vigor Ancestral', maxRank: 5, baseCost: 12, desc: '+10 HP inicial por nível.', perRank: '+10 HP' },
    { id: 'meta_atk', name: 'Têmpera Rúnica', maxRank: 5, baseCost: 15, desc: '+2 ATQ e +2 MAG por nível.', perRank: '+2 ATQ/MAG' },
    { id: 'meta_gold', name: 'Herança Mercante', maxRank: 4, baseCost: 10, desc: '+20 Ouro inicial por nível.', perRank: '+20 Ouro' },
    { id: 'meta_potions', name: 'Alforje Reforçado', maxRank: 3, baseCost: 16, desc: '+1 Poção de Vida e +1 Bomba ao iniciar.', perRank: '+1 Poção/Bomba' },
    { id: 'meta_crit', name: 'Instinto Sombrio', maxRank: 4, baseCost: 18, desc: '+3% Chance Crítica base por nível.', perRank: '+3% Crit' },
    { id: 'meta_shards', name: 'Sintonia Elemental', maxRank: 3, baseCost: 20, desc: 'Começa a expedição com Fragmentos Elementais aleatórios.', perRank: '+2 Fragmentos' }
  ];

  const CHEMISTRY_GUIDE = [
    { title: 'FOGO + ÓLEO', color: '#f87818', desc: 'Projéteis de Fogo ou Explosões incendeiam poças de óleo em cadeia, criando chamas contínuas letais.' },
    { title: 'RAIO + ÁGUA', color: '#f8e858', desc: 'Ataques de Raio em água eletrificam toda a poça conectada, causando dano elétrico e atordoamento em área!' },
    { title: 'GELO + ÁGUA', color: '#38d8e8', desc: 'Magias de Gelo congelam água em piso escorregadio e aplicam Lentidão/Congelamento.' },
    { title: 'FOGO + GELO / VENENO', color: '#b8f848', desc: 'Fogo derrete gelo em água e detona nuvens tóxicas causando explosões térmicas!' },
    { title: 'PARRY PERFEITO [ESPAÇO]', color: '#4898f8', desc: 'Erguer o escudo nos 240ms antes de um golpe reflete projéteis em 2x e atordoa atacantes corpo-a-corpo!' },
    { title: 'PAREDES RACHADAS [B]', color: '#f8b818', desc: 'Use Bombas perto de paredes rachadas para revelar Câmaras Secretas com tesouros raros!' }
  ];

  G.GameData = {
    DIFFICULTIES,
    CLASSES,
    BIOMES,
    ENEMIES,
    BOSSES,
    RARITIES,
    ITEM_TEMPLATES,
    AFFIXES,
    SHARDS,
    FORGE_RECIPES,
    BLESSINGS,
    META_UPGRADES,
    CHEMISTRY_GUIDE,
    makeTemplateItem,
    generateProceduralLoot
  };
})(window.Game8Bit);
