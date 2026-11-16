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
      desc: '6 Andares, 1 Enigma/andar e XP 1.0x. Clássico 8-bit aprimorado com chefes mais resistentes.',
      enemyHpMult: 1.35,
      enemyDmgMult: 1.20,
      enemySpeedMult: 1.0,
      enemyCdMult: 0.92,
      projSpeedMult: 1.0,
      roomBonus: 0,
      puzzleRooms: 1,
      puzzlePlates: 2,
      spawnBonus: 0,
      lootMult: 1.15,
      xpMult: 1.0,
      soulMult: 1.0,
      shopMult: 1.0,
      healScale: 1.0,
      oneHitDeath: false
    },
    veteran: {
      id: 'veteran',
      name: 'Veterano',
      desc: 'Mapas maiores, 2 Enigmas (3 peças/sequência), elites ferozes. XP 1.35x, Drop 1.35x e Almas 1.45x.',
      enemyHpMult: 1.80,
      enemyDmgMult: 1.48,
      enemySpeedMult: 1.12,
      enemyCdMult: 0.82,
      projSpeedMult: 1.12,
      roomBonus: 2,
      puzzleRooms: 2,
      puzzlePlates: 3,
      spawnBonus: 1,
      lootMult: 1.35,
      xpMult: 1.35,
      soulMult: 1.45,
      shopMult: 1.15,
      healScale: 0.75,
      oneHitDeath: false
    },
    nightmare: {
      id: 'nightmare',
      name: 'Pesadelo',
      desc: 'Labirintos extensos, +2 monstros/sala, 2 Enigmas complexos (4 peças). XP 1.75x, Drop 1.6x e Almas 2.0x.',
      enemyHpMult: 2.35,
      enemyDmgMult: 1.85,
      enemySpeedMult: 1.22,
      enemyCdMult: 0.70,
      projSpeedMult: 1.22,
      roomBonus: 4,
      puzzleRooms: 2,
      puzzlePlates: 4,
      spawnBonus: 2,
      lootMult: 1.60,
      xpMult: 1.75,
      soulMult: 2.0,
      shopMult: 1.30,
      healScale: 0.55,
      oneHitDeath: false
    },
    descomunal: {
      id: 'descomunal',
      name: 'DESCOMUNAL',
      desc: 'QUALQUER DANO MATA NA HORA! Chefes velozes, 3 Enigmas/andar. XP 2.5x, Drop 1.9x e Almas 3.0x!',
      enemyHpMult: 2.95,
      enemyDmgMult: 2.50,
      enemySpeedMult: 1.32,
      enemyCdMult: 0.60,
      projSpeedMult: 1.32,
      roomBonus: 5,
      puzzleRooms: 3,
      puzzlePlates: 4,
      spawnBonus: 2,
      lootMult: 1.90,
      xpMult: 2.50,
      soulMult: 3.0,
      shopMult: 1.40,
      healScale: 0.0,
      oneHitDeath: true
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
      parryBonus: 0.10,
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
    },

    paladin: {
      id: 'paladin',
      name: 'Templário Solar',
      title: 'Arauto da Aurora',
      spritePrefix: 'hero_paladin',
      desc: 'Cruzado sagrado que combina martelos flamejantes, alta resistência e purificação solar em área.',
      stats: {
        maxHp: 132,
        maxMp: 65,
        maxStamina: 105,
        atk: 13,
        mag: 11,
        def: 7,
        speed: 76,
        crit: 0.09
      },
      growth: { hp: 20, mp: 8, atk: 3, mag: 2, def: 2 },
      skill: {
        name: 'Consagração Solar',
        cost: 18,
        cooldown: 5.8,
        desc: 'Explode em aura sagrada que incendeia inimigos próximos, purifica debuffs e concede invulnerabilidade breve.'
      },
      parryBonus: 0.08,
      startWeapon: 'tpl_sun_mace',
      startArmor: 'tpl_templar_aegis'
    },

    ranger: {
      id: 'ranger',
      name: 'Caçador Astral',
      title: 'Olho de Falcão',
      spritePrefix: 'hero_ranger',
      desc: 'Atirador ágil de longo alcance com arco e besta. Alta taxa crítica e manobra evasiva acrobática.',
      stats: {
        maxHp: 90,
        maxMp: 60,
        maxStamina: 125,
        atk: 13,
        mag: 7,
        def: 3,
        speed: 92,
        crit: 0.20
      },
      growth: { hp: 12, mp: 7, atk: 3, mag: 1, def: 1 },
      skill: {
        name: 'Chuva de Flechas',
        cost: 15,
        cooldown: 4.4,
        desc: 'Dispara um leque de 5 flechas perfurantes enquanto salta para trás em segurança.'
      },
      parryBonus: 0.02,
      startWeapon: 'tpl_rune_bow',
      startArmor: 'tpl_ranger_cloak'
    },

    necromancer: {
      id: 'necromancer',
      name: 'Ocultista do Vazio',
      title: 'Senhor das Sombras',
      spritePrefix: 'hero_necromancer',
      desc: 'Ceifador sombrio que empunha foices drenadoras e invoca espectros aliados para caçar inimigos.',
      stats: {
        maxHp: 88,
        maxMp: 95,
        maxStamina: 100,
        atk: 9,
        mag: 15,
        def: 3,
        speed: 82,
        crit: 0.12
      },
      growth: { hp: 11, mp: 13, atk: 2, mag: 4, def: 1 },
      skill: {
        name: 'Legião Espectral',
        cost: 22,
        cooldown: 6.0,
        desc: 'Drena essência ao redor e invoca 2 Espectros Aliados que perseguem inimigos por 9s.'
      },
      parryBonus: 0.02,
      startWeapon: 'tpl_venom_scythe',
      startArmor: 'tpl_void_shroud'
    }
  };

  const BIOMES = [
    {
      id: 'catacombs',
      floor: 1,
      name: 'Catacumbas de Obsidiana',
      subtitle: 'Andar I — A Queda de Aurelia',
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
      lore: 'Primeiro selo da Cidadela. Aqui jazem os Sentinelas que tentaram conter a fenda quando a Coroa se partiu.'
    },
    {
      id: 'mire',
      floor: 2,
      name: 'Pântano de Miasma',
      subtitle: 'Andar II — Raízes da Praga',
      music: 'dungeon5',
      wallTop: '#102818',
      wallFace: '#1c4628',
      wallTrim: '#3c8044',
      floorA: '#0b1810',
      floorB: '#112217',
      floorAccent: '#183020',
      ambientDarkness: 0.30,
      enemies: ['fungoid', 'slime', 'necro', 'bat', 'goblin'],
      hazards: ['water', 'oil', 'spikes'],
      bossId: 'boss_vespera',
      lore: 'As águas subterrâneas apodreceram com o sangue sombrio do Abismo. Esporos tóxicos reagem violentamente ao fogo.'
    },
    {
      id: 'forge',
      floor: 3,
      name: 'Forja Vulcânica de Ignis',
      subtitle: 'Andar III — Brasas Eternas',
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
      lore: 'Nas bigornas titânicas, Ignis Rex forjou as armas amaldiçoadas que selaram o destino dos sete reinos.'
    },
    {
      id: 'library',
      floor: 4,
      name: 'Biblioteca Arcana',
      subtitle: 'Andar IV — Tomos Proibidos',
      music: 'dungeon3',
      wallTop: '#162442',
      wallFace: '#243c6e',
      wallTrim: '#486cb4',
      floorA: '#0f1628',
      floorB: '#141e36',
      floorAccent: '#1c2a48',
      ambientDarkness: 0.26,
      enemies: ['stalker', 'turret', 'cryo', 'necro', 'goblin'],
      hazards: ['water', 'ice', 'spikes'],
      bossId: 'boss_lyra',
      lore: 'Os espelhos rúnicos ainda ecoam os últimos feitiços de Lyra antes que o éter consumisse sua lucidez.'
    },
    {
      id: 'glacier',
      floor: 5,
      name: 'Bastilha Glacial do Eclipse',
      subtitle: 'Andar V — O Traidor Congelado',
      music: 'dungeon6',
      wallTop: '#122638',
      wallFace: '#1e4260',
      wallTrim: '#3888b8',
      floorA: '#0b1622',
      floorB: '#102030',
      floorAccent: '#183044',
      ambientDarkness: 0.28,
      enemies: ['cryo', 'fallen_knight', 'stalker', 'turret', 'golem'],
      hazards: ['ice', 'water', 'spikes'],
      bossId: 'boss_kaelen',
      lore: 'Lorde Kaelen congelou toda a vanguarda da Aurora num único voto de silêncio para proteger a entrada do trono.'
    },
    {
      id: 'citadel',
      floor: 6,
      name: 'Cidadela do Abismo',
      subtitle: 'Andar VI — Trono de Malakor',
      music: 'dungeon4',
      wallTop: '#2a0e38',
      wallFace: '#48185e',
      wallTrim: '#7a2c9c',
      floorA: '#14081c',
      floorB: '#1c0c26',
      floorAccent: '#2b123b',
      ambientDarkness: 0.34,
      enemies: ['fallen_knight', 'cryo', 'fungoid', 'stalker', 'necro', 'golem', 'pyro', 'turret'],
      hazards: ['oil', 'water', 'lava', 'spikes'],
      bossId: 'boss_malakor',
      lore: 'Onde o véu do mundo rasgou. Malakor empunha os quatro fragmentos da Coroa Partida aguardando o duelo final.'
    }
  ];

  const ENEMIES = {
    skeleton: {
      id: 'skeleton',
      name: 'Esqueleto Lanceiro',
      sprite: 'enemy_skeleton',
      hp: 48,
      atk: 12,
      speed: 48,
      range: 20,
      windup: 0.40,
      cooldown: 1.05,
      ai: 'melee',
      element: 'physical',
      weak: 'fire',
      resist: 'poison',
      xp: 18,
      gold: [4, 10],
      lore: 'Avança direto e telegrafa estocadas. Fácil de punir com Parry no momento do clarão.'
    },
    bat: {
      id: 'bat',
      name: 'Morcego Sombrio',
      sprite: 'enemy_bat',
      hp: 34,
      atk: 9,
      speed: 74,
      range: 16,
      windup: 0.25,
      cooldown: 0.85,
      ai: 'erratic',
      element: 'physical',
      weak: 'lightning',
      resist: null,
      xp: 14,
      gold: [2, 6],
      flying: true,
      lore: 'Voa sobre poças, espinhos e blocos. Ataca em mergulhos imprevisíveis.'
    },
    slime: {
      id: 'slime',
      name: 'Slime Ácido',
      sprite: 'enemy_slime',
      hp: 56,
      atk: 11,
      speed: 35,
      range: 16,
      windup: 0.42,
      cooldown: 1.2,
      ai: 'slime',
      element: 'poison',
      weak: 'ice',
      resist: 'poison',
      xp: 20,
      gold: [5, 11],
      lore: 'Slimes grandes se dividem em dois mini-slimes ao morrer se não forem congelados.'
    },
    shield: {
      id: 'shield',
      name: 'Guardião de Escudo',
      sprite: 'enemy_shield',
      hp: 78,
      atk: 15,
      speed: 36,
      range: 20,
      windup: 0.50,
      cooldown: 1.3,
      ai: 'shield',
      element: 'physical',
      weak: 'lightning',
      resist: 'physical',
      xp: 28,
      gold: [8, 16],
      lore: 'Bloqueia ataques frontais! Contorne-o com Dash, use bombas ou acerte com Raio/Fogo.'
    },
    goblin: {
      id: 'goblin',
      name: 'Goblin Arqueiro',
      sprite: 'enemy_goblin',
      hp: 42,
      atk: 13,
      speed: 55,
      range: 145,
      windup: 0.50,
      cooldown: 1.45,
      ai: 'ranged',
      element: 'physical',
      weak: 'fire',
      resist: null,
      xp: 22,
      gold: [5, 12],
      lore: 'Mantém distância e dispara flechas rápidas que podem ser refletidas com Escudo (Parry).'
    },
    fungoid: {
      id: 'fungoid',
      name: 'Esporo Tóxico',
      sprite: 'enemy_fungoid',
      hp: 64,
      atk: 13,
      speed: 40,
      range: 120,
      windup: 0.52,
      cooldown: 1.65,
      ai: 'caster',
      element: 'poison',
      weak: 'fire',
      resist: 'poison',
      xp: 26,
      gold: [7, 15],
      lore: 'Lança glóbulos de miasma e libera uma nuvem venenosa letal ao morrer. Queime-o à distância!'
    },
    pyro: {
      id: 'pyro',
      name: 'Piromante Cultista',
      sprite: 'enemy_pyro',
      hp: 54,
      atk: 16,
      speed: 44,
      range: 135,
      windup: 0.60,
      cooldown: 1.75,
      ai: 'caster',
      element: 'fire',
      weak: 'ice',
      resist: 'fire',
      xp: 28,
      gold: [9, 18],
      lore: 'Lança bolas de fogo que incendeiam óleo e explodem barris no caminho.'
    },
    stalker: {
      id: 'stalker',
      name: 'Espectro Teletransportador',
      sprite: 'enemy_stalker',
      hp: 62,
      atk: 17,
      speed: 52,
      range: 24,
      windup: 0.42,
      cooldown: 1.35,
      ai: 'stalker',
      element: 'arcane',
      weak: 'lightning',
      resist: 'arcane',
      xp: 34,
      gold: [10, 20],
      lore: 'Teleporta-se para perto do jogador após sofrer dano ou a cada ciclo de caça.'
    },
    cryo: {
      id: 'cryo',
      name: 'Criomante Perdido',
      sprite: 'enemy_cryo',
      hp: 68,
      atk: 15,
      speed: 42,
      range: 145,
      windup: 0.56,
      cooldown: 1.7,
      ai: 'caster',
      element: 'ice',
      weak: 'fire',
      resist: 'ice',
      xp: 34,
      gold: [10, 20],
      lore: 'Dispara estilhaços glaciais que congelam a água sob seus pés e reduzem sua velocidade.'
    },
    golem: {
      id: 'golem',
      name: 'Golem de Magma',
      sprite: 'enemy_golem',
      hp: 125,
      atk: 21,
      speed: 27,
      range: 24,
      windup: 0.68,
      cooldown: 1.75,
      ai: 'golem',
      element: 'fire',
      weak: 'ice',
      resist: 'fire',
      xp: 44,
      gold: [14, 26],
      lore: 'Colosso de pedra ígnea. Golpeia o chão criando ondas sísmicas flamejantes.'
    },
    necro: {
      id: 'necro',
      name: 'Necromante Sombrio',
      sprite: 'enemy_necro',
      hp: 68,
      atk: 15,
      speed: 38,
      range: 145,
      windup: 0.68,
      cooldown: 2.35,
      ai: 'necro',
      element: 'poison',
      weak: 'fire',
      resist: 'arcane',
      xp: 38,
      gold: [12, 22],
      lore: 'Dispara orbes venenosos e invoca Esqueletos se não for eliminado rapidamente.'
    },
    turret: {
      id: 'turret',
      name: 'Totem Arcano',
      sprite: 'enemy_turret',
      hp: 82,
      atk: 15,
      speed: 0,
      range: 185,
      windup: 0.45,
      cooldown: 1.65,
      ai: 'turret',
      element: 'lightning',
      weak: 'physical',
      resist: 'lightning',
      xp: 32,
      gold: [10, 18],
      lore: 'Torreta imóvel que dispara rajadas elétricas em cruz ou mirando o intruso.'
    },
    fallen_knight: {
      id: 'fallen_knight',
      name: 'Paladino Caído',
      sprite: 'enemy_fallen_knight',
      hp: 105,
      atk: 20,
      speed: 52,
      range: 26,
      windup: 0.45,
      cooldown: 1.25,
      ai: 'charger',
      element: 'lightning',
      weak: 'poison',
      resist: 'physical',
      xp: 48,
      gold: [16, 28],
      lore: 'Antigo cavaleiro corrompido pelo Eclipse. Executa investidas velozes carregadas de raio!'
    },
    mimic: {
      id: 'mimic',
      name: 'Baú Mímico',
      sprite: 'enemy_mimic',
      hp: 96,
      atk: 20,
      speed: 62,
      range: 20,
      windup: 0.35,
      cooldown: 1.0,
      ai: 'melee',
      element: 'physical',
      weak: 'fire',
      resist: null,
      xp: 55,
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
      hp: 480,
      atk: 19,
      speed: 48,
      element: 'physical',
      weak: 'fire',
      xp: 180,
      gold: [75, 110],
      lore: 'O primeiro monarca sepultado em Obsidiana. Arremessa foices de osso e convoca sua guarda.'
    },
    boss_vespera: {
      id: 'boss_vespera',
      name: 'Hidra de Miasma, Vespera',
      title: 'Matriarca da Praga',
      sprite: 'boss_vespera',
      hp: 700,
      atk: 22,
      speed: 46,
      element: 'poison',
      weak: 'fire',
      xp: 260,
      gold: [95, 145],
      lore: 'Serpente tri-cabeça nutrida pela corrupção do Pântano. Cospe leques venenosos e poças ácidas.'
    },
    boss_ignis_rex: {
      id: 'boss_ignis_rex',
      name: 'Ignis Rex, o Forjador',
      title: 'Titã das Brasas',
      sprite: 'boss_ignis_rex',
      hp: 940,
      atk: 24,
      speed: 44,
      element: 'fire',
      weak: 'ice',
      xp: 350,
      gold: [120, 175],
      lore: 'Forjou as lâminas demoníacas do Abismo. Suas investidas deixam rastros de fogo.'
    },
    boss_lyra: {
      id: 'boss_lyra',
      name: 'Arquimaga Lyra',
      title: 'Guardiã dos Espelhos',
      sprite: 'boss_lyra',
      hp: 1180,
      atk: 26,
      speed: 55,
      element: 'lightning',
      weak: 'poison',
      xp: 460,
      gold: [155, 220],
      lore: 'Enlouquecida pelo éter proibido. Teleporta-se entre runas alternando gelo e trovão.'
    },
    boss_kaelen: {
      id: 'boss_kaelen',
      name: 'Kaelen do Eclipse',
      title: 'General da Bastilha Glacial',
      sprite: 'boss_kaelen',
      hp: 1450,
      atk: 28,
      speed: 56,
      element: 'ice',
      weak: 'fire',
      xp: 580,
      gold: [190, 270],
      lore: 'O maior campeão humano antes de trair Aurelia por imortalidade. Domina gelo e raios abissais.'
    },
    boss_malakor: {
      id: 'boss_malakor',
      name: 'Malakor, Senhor do Abismo',
      title: 'Soberano da Coroa Partida',
      sprite: 'boss_malakor',
      hp: 1900,
      atk: 32,
      speed: 58,
      element: 'arcane',
      weak: null,
      xp: 900,
      gold: [280, 400],
      lore: 'A entidade primordial no fundo da Cidadela. Alterna todos os elementos com fúria implacável.'
    }
  };

  const RARITIES = {
    comum: { id: 'comum', name: 'Comum', color: '#a4a2b8', mult: 1.0, affixCount: 0 },
    incomum: { id: 'incomum', name: 'Incomum', color: '#78d838', mult: 1.24, affixCount: 1 },
    raro: { id: 'raro', name: 'Raro', color: '#4898f8', mult: 1.52, affixCount: 1 },
    epico: { id: 'epico', name: 'Épico', color: '#c458f8', mult: 1.88, affixCount: 2 },
    lendario: { id: 'lendario', name: 'Lendário', color: '#f8b818', mult: 2.35, affixCount: 2 }
  };

  const ITEM_TEMPLATES = {
    // Armas (20 armas variadas em 8 arquétipos)
    tpl_iron_sword: { id: 'tpl_iron_sword', name: 'Espada de Ferro', slot: 'weapon', kind: 'sword', icon: 'item_sword', baseAtk: 10, baseMag: 0, range: 26, arc: 1.9, speed: 1.0, element: 'physical', value: 30, desc: 'Espada equilibrada com corte amplo.' },
    tpl_broad_axe: { id: 'tpl_broad_axe', name: 'Machado de Guerra', slot: 'weapon', kind: 'axe', icon: 'item_axe', baseAtk: 15, baseMag: 0, range: 28, arc: 2.4, speed: 0.78, element: 'physical', value: 45, desc: 'Golpe pesado de grande arco.' },
    tpl_apprentice_staff: { id: 'tpl_apprentice_staff', name: 'Cajado Rúnico', slot: 'weapon', kind: 'staff', icon: 'item_staff', baseAtk: 4, baseMag: 12, range: 155, ranged: true, speed: 1.0, element: 'arcane', value: 34, desc: 'Dispara orbes arcanos à distância.' },
    tpl_shadow_daggers: { id: 'tpl_shadow_daggers', name: 'Adagas Sombrias', slot: 'weapon', kind: 'dagger', icon: 'item_dagger', baseAtk: 9, baseMag: 2, range: 22, arc: 1.4, speed: 1.40, element: 'poison', value: 36, desc: 'Ataques velozes com veneno.' },
    tpl_rune_bow: { id: 'tpl_rune_bow', name: 'Arco Élfico', slot: 'weapon', kind: 'bow', icon: 'item_bow', baseAtk: 11, baseMag: 4, range: 185, ranged: true, speed: 1.15, element: 'physical', value: 42, desc: 'Dispara flechas velozes sem gastar mana.' },
    tpl_flame_blade: { id: 'tpl_flame_blade', name: 'Lâmina Solar', slot: 'weapon', kind: 'sword', icon: 'item_sword', baseAtk: 14, baseMag: 6, range: 28, arc: 2.0, speed: 1.06, element: 'fire', value: 65, desc: 'Espada flamejante que inflama óleo e inimigos.' },
    tpl_frost_wand: { id: 'tpl_frost_wand', name: 'Cetro Glacial', slot: 'weapon', kind: 'staff', icon: 'item_staff', baseAtk: 5, baseMag: 15, range: 165, ranged: true, speed: 1.04, element: 'ice', value: 68, desc: 'Lança esferas glaciais congelantes.' },
    tpl_storm_halberd: { id: 'tpl_storm_halberd', name: 'Machado Tempestuoso', slot: 'weapon', kind: 'axe', icon: 'item_axe', baseAtk: 17, baseMag: 8, range: 30, arc: 2.4, speed: 0.86, element: 'lightning', value: 74, desc: 'Eletrocuta água e inimigos em arco.' },
    tpl_iron_spear: { id: 'tpl_iron_spear', name: 'Lança de Aço', slot: 'weapon', kind: 'spear', icon: 'item_spear', baseAtk: 13, baseMag: 0, range: 42, arc: 0.75, speed: 1.10, element: 'physical', value: 48, desc: 'Estocada perfurante de alcance longo (42px).' },
    tpl_frost_glaive: { id: 'tpl_frost_glaive', name: 'Alabarda Glacial', slot: 'weapon', kind: 'spear', icon: 'item_spear', baseAtk: 15, baseMag: 7, range: 44, arc: 0.85, speed: 1.05, element: 'ice', value: 76, desc: 'Alabarda gélida que perfura em fila.' },
    tpl_sun_mace: { id: 'tpl_sun_mace', name: 'Maça da Aurora', slot: 'weapon', kind: 'hammer', icon: 'item_hammer', baseAtk: 13, baseMag: 6, range: 27, arc: 2.2, speed: 0.88, element: 'fire', value: 52, desc: 'Martelo sagrado com forte repulsão e chance de atordoar.' },
    tpl_inferno_hammer: { id: 'tpl_inferno_hammer', name: 'Martelo Vulcânico', slot: 'weapon', kind: 'hammer', icon: 'item_hammer', baseAtk: 20, baseMag: 8, range: 31, arc: 2.5, speed: 0.76, element: 'fire', value: 84, desc: 'Impacto devastador que atordoa e explode brasas.' },
    tpl_venom_scythe: { id: 'tpl_venom_scythe', name: 'Foice do Miasma', slot: 'weapon', kind: 'scythe', icon: 'item_scythe', baseAtk: 11, baseMag: 10, range: 32, arc: 2.6, speed: 0.96, element: 'poison', vampiric: 0.04, value: 58, desc: 'Varredura ampla que drena mana e veneno a cada golpe.' },
    tpl_soul_grimoire: { id: 'tpl_soul_grimoire', name: 'Grimório das Almas', slot: 'weapon', kind: 'grimoire', icon: 'item_grimoire', baseAtk: 4, baseMag: 16, range: 170, ranged: true, speed: 1.05, element: 'arcane', value: 78, desc: 'Dispara dois projéteis duplos teleguiados!' },
    tpl_heavy_crossbow: { id: 'tpl_heavy_crossbow', name: 'Besta de Cerco', slot: 'weapon', kind: 'crossbow', icon: 'item_crossbow', baseAtk: 16, baseMag: 2, range: 200, ranged: true, speed: 0.90, element: 'physical', bonusCrit: 0.08, value: 72, desc: 'Virotes de altíssima velocidade com +8% Crítico.' },
    tpl_twin_fangs: { id: 'tpl_twin_fangs', name: 'Presas Voltaicas', slot: 'weapon', kind: 'dagger', icon: 'item_dagger', baseAtk: 12, baseMag: 6, range: 24, arc: 1.5, speed: 1.55, element: 'lightning', bonusCrit: 0.06, value: 76, desc: 'Adagas elétricas ultrarrápidas (+6% Crítico).' },
    tpl_storm_bow: { id: 'tpl_storm_bow', name: 'Arco Voltaico', slot: 'weapon', kind: 'bow', icon: 'item_bow', baseAtk: 14, baseMag: 8, range: 195, ranged: true, speed: 1.24, element: 'lightning', value: 82, desc: 'Flechas relâmpago que eletrificam poças d’água.' },
    tpl_void_katana: { id: 'tpl_void_katana', name: 'Katana do Vazio', slot: 'weapon', kind: 'sword', icon: 'item_sword', baseAtk: 16, baseMag: 9, range: 32, arc: 2.1, speed: 1.24, element: 'arcane', bonusCrit: 0.10, value: 92, desc: 'Lâmina abissal ágil com +10% Crítico.' },
    tpl_crystal_greatsword: { id: 'tpl_crystal_greatsword', name: 'Montante Cristalina', slot: 'weapon', kind: 'sword', icon: 'item_sword', baseAtk: 21, baseMag: 10, range: 34, arc: 2.5, speed: 0.80, element: 'arcane', value: 95, desc: 'Montante gigante de enorme alcance e dano mágico.' },
    tpl_eclipse_blade: { id: 'tpl_eclipse_blade', name: 'Lâmina do Eclipse', slot: 'weapon', kind: 'sword', icon: 'item_sword', baseAtk: 19, baseMag: 11, range: 31, arc: 2.2, speed: 1.05, element: 'ice', bonusCrit: 0.07, value: 98, desc: 'Espada real de Kaelen banhada em gelo eterno.' },

    // Armaduras (9 opções)
    tpl_guard_plate: { id: 'tpl_guard_plate', name: 'Armadura da Guarda', slot: 'armor', icon: 'item_armor', baseDef: 5, bonusHp: 15, value: 32 },
    tpl_rune_robe: { id: 'tpl_rune_robe', name: 'Manto Arcano', slot: 'armor', icon: 'item_armor', baseDef: 2, bonusMp: 24, bonusMag: 5, value: 32 },
    tpl_night_leather: { id: 'tpl_night_leather', name: 'Couro das Sombras', slot: 'armor', icon: 'item_armor', baseDef: 3, bonusSpeed: 10, bonusCrit: 0.06, value: 34 },
    tpl_templar_aegis: { id: 'tpl_templar_aegis', name: 'Couraça Solar', slot: 'armor', icon: 'item_armor', baseDef: 6, bonusHp: 22, resist: 'fire', value: 48 },
    tpl_ranger_cloak: { id: 'tpl_ranger_cloak', name: 'Manto do Caçador', slot: 'armor', icon: 'item_armor', baseDef: 3, bonusSpeed: 12, bonusCrit: 0.08, value: 46 },
    tpl_dragon_mail: { id: 'tpl_dragon_mail', name: 'Cota Dracônica', slot: 'armor', icon: 'item_armor', baseDef: 9, bonusHp: 35, resist: 'fire', value: 82 },
    tpl_glacier_plate: { id: 'tpl_glacier_plate', name: 'Placa Glacial', slot: 'armor', icon: 'item_armor', baseDef: 9, bonusHp: 28, bonusMag: 4, resist: 'ice', value: 85 },
    tpl_shadow_vestments: { id: 'tpl_shadow_vestments', name: 'Veste Venenosa', slot: 'armor', icon: 'item_armor', baseDef: 6, bonusSpeed: 12, bonusCrit: 0.07, resist: 'poison', value: 78 },
    tpl_void_shroud: { id: 'tpl_void_shroud', name: 'Mortalha do Abismo', slot: 'armor', icon: 'item_armor', baseDef: 7, bonusMp: 28, bonusCrit: 0.09, resist: 'arcane', value: 88 },

    // Relíquias (10 opções)
    tpl_vamp_ring: { id: 'tpl_vamp_ring', name: 'Anel Carmesim', slot: 'relic', icon: 'item_relic', vampiric: 0.08, bonusHp: 12, value: 55, desc: 'Drena 8% do dano causado como Vida.' },
    tpl_mana_amulet: { id: 'tpl_mana_amulet', name: 'Amuleto Etéreo', slot: 'relic', icon: 'item_relic', mpRegen: 2.8, bonusMp: 22, value: 52, desc: '+2.8/s de regeneração de Mana e +22 MP.' },
    tpl_parry_seal: { id: 'tpl_parry_seal', name: 'Selo do Duelista', slot: 'relic', icon: 'item_relic', parryWindow: 0.14, bonusAtk: 5, value: 58, desc: 'Aumenta janela de Parry e +5 ATQ.' },
    tpl_swift_boots: { id: 'tpl_swift_boots', name: 'Talismã do Vento', slot: 'relic', icon: 'item_relic', bonusSpeed: 15, stamRegen: 12, value: 50, desc: '+15 Velocidade e +12 Vigor/s.' },
    tpl_prism_core: { id: 'tpl_prism_core', name: 'Núcleo Prismático', slot: 'relic', icon: 'item_relic', bonusMag: 8, bonusCrit: 0.08, value: 70, desc: '+8 Poder Mágico e +8% Chance Crítica.' },
    tpl_glass_cannon: { id: 'tpl_glass_cannon', name: 'Olho do Abismo', slot: 'relic', icon: 'item_relic', bonusAtk: 10, bonusMag: 10, bonusCrit: 0.12, bonusHp: -20, value: 85, desc: '+10 ATQ/MAG e +12% Crítico (-20 HP). Ideal para Descomunal!' },
    tpl_chrono_gear: { id: 'tpl_chrono_gear', name: 'Ampulheta Rúnica', slot: 'relic', icon: 'item_relic', bonusCdr: 0.18, bonusSpeed: 8, value: 78, desc: '-18% Tempo de Recarga das Habilidades e +8 Velocidade.' },
    tpl_greed_idol: { id: 'tpl_greed_idol', name: 'Ídolo da Sabedoria', slot: 'relic', icon: 'item_relic', xpBonus: 0.25, goldBonus: 0.30, value: 74, desc: '+25% Experiência obtida e +30% Ouro.' },
    tpl_thunder_crest: { id: 'tpl_thunder_crest', name: 'Brasão da Tormenta', slot: 'relic', icon: 'item_relic', bonusAtk: 7, bonusCrit: 0.10, resist: 'lightning', value: 76, desc: '+7 ATQ, +10% Crítico e resiste a Raio.' },
    tpl_guardian_heart: { id: 'tpl_guardian_heart', name: 'Coração de Bastião', slot: 'relic', icon: 'item_relic', bonusHp: 40, bonusDef: 4, value: 75, desc: '+40 HP Máximo e +4 Defesa.' },

    // Consumíveis & Utilitários
    cons_hp_pot: { id: 'cons_hp_pot', name: 'Poção de Vida', slot: 'consumable', icon: 'item_potion_hp', healHp: 55, stackable: true, value: 18, desc: 'Restaura 55 de Vida imediatamente.' },
    cons_elixir: { id: 'cons_elixir', name: 'Elixir Supremo', slot: 'consumable', icon: 'item_potion_elixir', healHp: 120, healMp: 60, cureAll: true, stackable: true, value: 48, desc: 'Restaura 120 HP, 60 MP e cura veneno/queimadura.' },
    cons_mp_pot: { id: 'cons_mp_pot', name: 'Éter Arcano', slot: 'consumable', icon: 'item_potion_mp', healMp: 50, stackable: true, value: 18, desc: 'Restaura 50 de Mana imediatamente.' },
    cons_antidote: { id: 'cons_antidote', name: 'Antídoto Herbal', slot: 'consumable', icon: 'item_potion_antidote', cureAll: true, healHp: 20, stackable: true, value: 14, desc: 'Remove efeitos negativos e cura 20 HP.' },
    cons_fury_tonic: { id: 'cons_fury_tonic', name: 'Tônico de Fúria', slot: 'consumable', icon: 'item_potion_elixir', healMp: 30, buffFury: true, stackable: true, value: 32, desc: 'Restaura Vigor máximo, +30 MP e garante próximo golpe Crítico!' },
    cons_scroll_fire: { id: 'cons_scroll_fire', name: 'Pergaminho Ígneo', slot: 'consumable', icon: 'item_scroll', spell: 'fire_ring', stackable: true, value: 28, desc: 'Explode onda de fogo ao redor, incendiando inimigos e óleo.' },
    cons_scroll_ice: { id: 'cons_scroll_ice', name: 'Pergaminho Glacial', slot: 'consumable', icon: 'item_scroll', spell: 'ice_nova', stackable: true, value: 28, desc: 'Congela inimigos próximos e transforma água em gelo.' },
    cons_scroll_shock: { id: 'cons_scroll_shock', name: 'Pergaminho Voltaico', slot: 'consumable', icon: 'item_scroll', spell: 'lightning_storm', stackable: true, value: 30, desc: 'Dispara raios em cadeia pela sala inteira.' },
    cons_scroll_void: { id: 'cons_scroll_void', name: 'Pergaminho do Vazio', slot: 'consumable', icon: 'item_scroll', spell: 'void_implosion', stackable: true, value: 36, desc: 'Implode a sala com dano arcano massivo e atordoa todos os inimigos.' }
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
      bonusAtk: Math.round((tpl.bonusAtk || 0) * rar.mult),
      bonusMag: Math.round((tpl.bonusMag || 0) * rar.mult),
      bonusHp: Math.round((tpl.bonusHp || 0) * rar.mult),
      bonusMp: Math.round((tpl.bonusMp || 0) * rar.mult),
      bonusSpeed: tpl.bonusSpeed || 0,
      bonusCrit: tpl.bonusCrit || 0,
      vampiric: tpl.vampiric || 0,
      mpRegen: tpl.mpRegen || 0,
      stamRegen: tpl.stamRegen || 0,
      parryWindow: tpl.parryWindow || 0,
      bonusCdr: tpl.bonusCdr || 0,
      xpBonus: tpl.xpBonus || 0,
      goldBonus: tpl.goldBonus || 0,
      resist: tpl.resist || null,
      affixes: [],
      value: Math.round((tpl.value || 25) * rar.mult),
      desc: tpl.desc || ''
    };
    return item;
  }

  function generateProceduralLoot(rng, floorNum, forcedSlot = null, minRarity = null) {
    // Chance de consumível vs equipamento (ajustada para dropar mais armas/relíquias ricas!)
    if (!forcedSlot && rng.chance(0.28)) {
      const pool = ['cons_hp_pot', 'cons_mp_pot', 'cons_antidote', 'cons_fury_tonic', 'cons_scroll_fire', 'cons_scroll_ice', 'cons_scroll_shock', 'cons_scroll_void', 'cons_elixir'];
      const weights = floorNum >= 3 ? pool : pool.slice(0, 7);
      return makeTemplateItem(rng.pick(weights));
    }

    const slots = forcedSlot ? [forcedSlot] : ['weapon', 'weapon', 'weapon', 'armor', 'relic'];
    const targetSlot = rng.pick(slots);
    const pool = Object.values(ITEM_TEMPLATES).filter(t => t.slot === targetSlot);
    const tpl = rng.pick(pool);

    const roll = rng.next() + (floorNum - 1) * 0.14;
    let rarityId = 'comum';
    if (roll > 1.24) rarityId = 'lendario';
    else if (roll > 0.94) rarityId = 'epico';
    else if (roll > 0.64) rarityId = 'raro';
    else if (roll > 0.30) rarityId = 'incomum';

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

  // Receitas da Forja Rúnica (6 receitas)
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
      id: 'craft_fury_tonic',
      name: 'Destilar Tônico de Fúria',
      icon: 'item_potion_elixir',
      desc: 'Recupera Vigor total + 30 MP e garante próximo ataque Crítico.',
      gold: 16,
      shards: { fire: 1, lightning: 1 },
      type: 'consumable',
      resultTpl: 'cons_fury_tonic'
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
      id: 'craft_epic_weapon',
      name: 'Forjar Arma Rúnica (Épico+)',
      icon: 'item_sword',
      desc: 'Forja uma Arma aleatória de raridade Épica garantida.',
      gold: 55,
      shards: { fire: 1, arcane: 1 },
      type: 'loot',
      slot: 'weapon',
      minRarity: 'epico'
    },
    {
      id: 'craft_legend_relic',
      name: 'Forjar Relíquia Lendária',
      icon: 'item_relic',
      desc: 'Cria uma Relíquia Lendária com bônus raros.',
      gold: 85,
      shards: { fire: 1, ice: 1, lightning: 1, arcane: 1 },
      type: 'loot',
      slot: 'relic',
      minRarity: 'lendario'
    }
  ];

  // Bênçãos de Santuário & Nível (16 perks sinérgicos)
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
    { id: 'phoenix_spark', name: 'Centelha da Fênix', desc: '1x por andar, sobrevive a um golpe fatal com 40% HP (desativado em Descomunal).', icon: 'item_potion_elixir', apply: p => { p.perks.reviveFloor = true; } },
    { id: 'bomb_expert', name: 'Alquimista Explosivo', desc: '+3 Bombas imediatas e explosões causam +50% de dano.', icon: 'item_bomb', apply: p => { p.bombs += 3; p.perks.bombMult += 0.50; } },
    { id: 'vital_surge', name: 'Fluxo Vital', desc: 'Regenera 1.5 HP/s fora de combate e +25% eficácia de Poções.', icon: 'item_potion_hp', apply: p => { p.perks.hpRegen += 1.5; p.perks.potionMult += 0.25; } },
    { id: 'wind_runner', name: 'Passos do Vendaval', desc: '+14 Velocidade e recarga de Dash 30% mais rápida.', icon: 'item_bow', apply: p => { p.bonusSpeed = (p.bonusSpeed || 0) + 14; p.perks.dashCdr = (p.perks.dashCdr || 0) + 0.30; } },
    { id: 'sage_wisdom', name: 'Sabedoria Antiga', desc: '+30% Experiência obtida e +15 Poder Mágico.', icon: 'item_grimoire', apply: p => { p.perks.xpMult = (p.perks.xpMult || 0) + 0.30; p.bonusMag += 15; } },
    { id: 'duelist_reflex', name: 'Reflexo de Duelista', desc: 'Aumenta janela de Parry Perfeito em +120ms e +8 ATQ.', icon: 'item_spear', apply: p => { p.perks.parryBonus = (p.perks.parryBonus || 0) + 0.12; p.bonusAtk += 8; } },
    { id: 'loot_seeker', name: 'Faro do Caçador', desc: '+35% Chance de Drops raros e +2 Chaves imediatas.', icon: 'item_key', apply: p => { p.keys += 2; p.perks.dropBonus = (p.perks.dropBonus || 0) + 0.35; } }
  ];

  // Meta-progressão permanente (Altar das Almas Ancestrais — 9 melhorias)
  const META_UPGRADES = [
    { id: 'meta_hp', name: 'Vigor Ancestral', maxRank: 5, baseCost: 12, desc: '+10 HP inicial por nível.', perRank: '+10 HP' },
    { id: 'meta_atk', name: 'Têmpera Rúnica', maxRank: 5, baseCost: 15, desc: '+2 ATQ e +2 MAG por nível.', perRank: '+2 ATQ/MAG' },
    { id: 'meta_gold', name: 'Herança Mercante', maxRank: 4, baseCost: 10, desc: '+20 Ouro inicial por nível.', perRank: '+20 Ouro' },
    { id: 'meta_potions', name: 'Alforje Reforçado', maxRank: 3, baseCost: 16, desc: '+1 Poção de Vida e +1 Bomba ao iniciar.', perRank: '+1 Poção/Bomba' },
    { id: 'meta_crit', name: 'Instinto Sombrio', maxRank: 4, baseCost: 18, desc: '+3% Chance Crítica base por nível.', perRank: '+3% Crit' },
    { id: 'meta_shards', name: 'Sintonia Elemental', maxRank: 3, baseCost: 20, desc: 'Começa a expedição com Fragmentos Elementais aleatórios.', perRank: '+2 Fragmentos' },
    { id: 'meta_xp', name: 'Erudição Ancestral', maxRank: 4, baseCost: 14, desc: '+12% de Experiência obtida por nível.', perRank: '+12% XP' },
    { id: 'meta_greed', name: 'Fortuna do Abismo', maxRank: 4, baseCost: 16, desc: '+12% Taxa de Drop e +10% Ouro por nível.', perRank: '+12% Drop' },
    { id: 'meta_cdr', name: 'Reflexo Etéreo', maxRank: 3, baseCost: 22, desc: '-8% Recarga de Skills e Dash por nível.', perRank: '-8% Recarga' }
  ];

  // História Expandida (6 Capítulos da Crônica)
  const STORY_CHAPTERS = [
    {
      floor: 1,
      id: 'ch_1',
      title: 'Prólogo — A Coroa Partida de Aurelia',
      text: 'Há trezentos anos, o Reino de Aurelia brilhava sob a Coroa Prismática. Quando o Arquiduque Malakor rompeu o selo para usurpar a imortalidade, a capital afundou em seis estratos abissais. Apenas as Catacumbas de Obsidiana separam você da descida.'
    },
    {
      floor: 2,
      id: 'ch_2',
      title: 'Capítulo II — Águas Podres de Miasma',
      text: 'Abaixo das criptas, os antigos aquedutos reais transformaram-se num pântano vivo de esporos e veneno. Dizem as crônicas que Vespera, a Hidra Guardiã, bebeu o primeiro fragmento da Coroa e envenenou toda a nascente.'
    },
    {
      floor: 3,
      id: 'ch_3',
      title: 'Capítulo III — Os Martelos de Ignis',
      text: 'O calor das profundezas anuncia as grandes fornalhas onde o titã Ignis Rex fundiu legiões de ferro e obsidiana. Aqui, aço e alquimia se chocam: apenas quem domina óleo e chamas atravessa vivo.'
    },
    {
      floor: 4,
      id: 'ch_4',
      title: 'Capítulo IV — Os Espelhos de Lyra',
      text: 'A Grande Biblioteca de Aurelia flutua num oceano de água rúnica. A Arquimaga Lyra tentou reescrever o ritual para aprisionar Malakor, mas o éter estilhaçou sua mente em mil reflexos elétricos.'
    },
    {
      floor: 5,
      id: 'ch_5',
      title: 'Capítulo V — O Voto Congelado',
      text: 'Na Bastilha Glacial, Lorde Kaelen — outrora o maior campeão da Guarda Solar — congelou seu próprio coração para impedir qualquer herdeiro de alcançar a sala do trono antes do Eclipse eterno.'
    },
    {
      floor: 6,
      id: 'ch_6',
      title: 'Capítulo Final — O Trono do Abismo',
      text: 'No sexto círculo não há mais retorno. Malakor reúne fogo, gelo, raio e veneno em sua forma primordial. Purifique a Coroa Partida e reescreva a história de Aurelia — ou torne-se mais uma alma errante do Altar.'
    }
  ];

  // Inscrições antigas encontradas em Tábuas de Lore (12 fragmentos)
  const LORE_FRAGMENTS = [
    { id: 'lore_1', floor: 1, title: 'Juramento da Guarda', text: '“Seguramos o escudo até a lâmina partir. Um Parry no instante do clarão devolve a fúria do inimigo.”' },
    { id: 'lore_2', floor: 1, title: 'Selo Secreto das Pedras', text: '“Paredes rachadas escondem câmaras antigas de tesouro. Nenhuma pedra resiste a uma bomba rúnica bem posta.”' },
    { id: 'lore_3', floor: 2, title: 'Diário do Boticário', text: '“O miasma do pântano detona em contato com o fogo. Jamais carregue tochas descuidadas sobre poças de óleo.”' },
    { id: 'lore_4', floor: 2, title: 'Lamento de Vespera', text: '“Antes de se tornar hidra, Vespera guardava os jardins reais. A ambição da Coroa retorceu até as raízes.”' },
    { id: 'lore_5', floor: 3, title: 'Tratado da Forja Viva', text: '“Dois fragmentos elementais moldam o destino de uma arma comum. A bigorna nunca recusa sangue e ouro.”' },
    { id: 'lore_6', floor: 3, title: 'Segredo do Relâmpago', text: '“Água parada conduz a tempestade. Um raio lançado na poça atordoa todo o batalhão inimigo de uma só vez.”' },
    { id: 'lore_7', floor: 4, title: 'Notas da Arquimaga Lyra', text: '“Malakor não quer governar Aurelia. Ele alimenta-se das Almas Ancestrais presas no ciclo eterno do Altar.”' },
    { id: 'lore_8', floor: 4, title: 'Código dos Enigmas', text: '“As placas rúnicas só reconhecem ordem e equilíbrio. Se errar o caminho, ative o pedestal rúnico para recomeçar.”' },
    { id: 'lore_9', floor: 5, title: 'Carta de Kaelen', text: '“Perdoem-me, irmãos solares. Selo este andar em gelo porque temo o que despertará se alguém falhar no Trono.”' },
    { id: 'lore_10', floor: 5, title: 'O Modo Descomunal', text: '“Apenas os escolhidos do Eclipse atravessam a cidadela sem sofrer um único arranhão. A perfeição cobra sua taxa.”' },
    { id: 'lore_11', floor: 6, title: 'Profecia da Coroa', text: '“Seis selos caídos, quatro elementos em guerra. Somente quem forjar mente, aço e alquimia restaurará a aurora.”' },
    { id: 'lore_12', floor: 6, title: 'Ecos da Eternidade', text: '“Mesmo após a queda do Soberano, o Abismo Infinito chama pelos audazes além do sétimo portão.”' }
  ];

  // Sistema de Conquistas (16 Achievements persistentes)
  const ACHIEVEMENTS = [
    { id: 'first_blood', name: 'Primeiro Sangue', desc: 'Derrote seu primeiro monstro no Abismo.', icon: 'item_sword', reward: 5, target: 1, stat: 'totalKills' },
    { id: 'slayer_100', name: 'Exterminador do Abismo', desc: 'Derrote 100 monstros ao longo de suas expedições.', icon: 'item_axe', reward: 20, target: 100, stat: 'totalKills' },
    { id: 'parry_master', name: 'Muro Impenetrável', desc: 'Execute 10 Parrys Perfeitos com escudo.', icon: 'item_armor', reward: 15, target: 10, stat: 'totalParries' },
    { id: 'alchemist', name: 'Alquimista Caótico', desc: 'Ative 10 reações elementais no terreno.', icon: 'shard_fire', reward: 12, target: 10, stat: 'totalReactions' },
    { id: 'secret_finder', name: 'Olho de Lince', desc: 'Exploda uma parede rachada e encontre uma Câmara Secreta.', icon: 'item_bomb', reward: 15, target: 1, stat: 'secretsFound' },
    { id: 'puzzle_solver', name: 'Mente Brilhante', desc: 'Resolva 3 enigmas completos nas salas de puzzle.', icon: 'item_key', reward: 18, target: 3, stat: 'puzzlesSolved' },
    { id: 'forger', name: 'Mestre Ferreiro', desc: 'Reforje ou fabrique 3 itens na Forja Rúnica.', icon: 'item_hammer', reward: 15, target: 3, stat: 'itemsForged' },
    { id: 'boss_bane', name: 'Caçador de Titãs', desc: 'Derrote 5 Chefes de andar.', icon: 'boss_bone_king', reward: 25, target: 5, stat: 'totalBosses' },
    { id: 'collector', name: 'Relíquia Dourada', desc: 'Encontre ou equipe um equipamento Lendário.', icon: 'item_relic', reward: 20 },
    { id: 'lore_scholar', name: 'Cronista de Aurelia', desc: 'Descubra 6 inscrições diferentes em Tábuas de Lore.', icon: 'item_grimoire', reward: 18 },
    { id: 'class_explorer', name: 'Força Versátil', desc: 'Alcance o Andar 3 com pelo menos 3 classes diferentes.', icon: 'hero_ranger', reward: 25 },
    { id: 'high_level', name: 'Poder Crescente', desc: 'Alcance o Nível 8 em uma única expedição.', icon: 'item_potion_elixir', reward: 20 },
    { id: 'campaign_clear', name: 'Luz no Abismo', desc: 'Derrote Malakor no Andar 6 em qualquer dificuldade.', icon: 'item_boss_key', reward: 35 },
    { id: 'veteran_clear', name: 'Sobrevivente Tático', desc: 'Vença os 6 Andares na dificuldade Veterano ou superior.', icon: 'item_spear', reward: 45 },
    { id: 'nightmare_clear', name: 'Senhor do Pesadelo', desc: 'Vença os 6 Andares na dificuldade Pesadelo ou Descomunal.', icon: 'item_scythe', reward: 70 },
    { id: 'descomunal_clear', name: 'LENDA DESCOMUNAL', desc: 'Vença a campanha na dificuldade DESCOMUNAL (Sem levar dano)!', icon: 'item_soul', reward: 150 }
  ];

  const CHEMISTRY_GUIDE = [
    { title: 'FOGO + ÓLEO', color: '#f87818', desc: 'Projéteis de Fogo ou Explosões incendeiam poças de óleo em cadeia, criando chamas contínuas letais.' },
    { title: 'RAIO + ÁGUA', color: '#f8e858', desc: 'Ataques de Raio em água eletrificam toda a poça conectada, causando dano elétrico e atordoamento em área!' },
    { title: 'GELO + ÁGUA', color: '#38d8e8', desc: 'Magias de Gelo congelam água em piso escorregadio e aplicam Lentidão/Congelamento.' },
    { title: 'FOGO + GELO / VENENO', color: '#b8f848', desc: 'Fogo derrete gelo em água e detona nuvens tóxicas causando explosões térmicas!' },
    { title: 'PARRY PERFEITO [ESPAÇO]', color: '#4898f8', desc: 'Erguer o escudo nos 240ms antes de um golpe reflete projéteis em 2x e anula qualquer dano (essencial em Descomunal!).' },
    { title: 'PAREDES RACHADAS & ENIGMAS', color: '#f8b818', desc: 'Use Bombas [B] em paredes rachadas para achar Câmaras Secretas. Em enigmas de sequência ou blocos, aperte [E] na pedra rúnica para reiniciar.' }
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
    STORY_CHAPTERS,
    LORE_FRAGMENTS,
    ACHIEVEMENTS,
    CHEMISTRY_GUIDE,
    makeTemplateItem,
    generateProceduralLoot
  };
})(window.Game8Bit);
