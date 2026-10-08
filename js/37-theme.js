// Bomberman Roguelike v4.6.1 — Visual Themes
// Solo visuales: terreno, bombas, fuego, fondo, partículas y ambiente.
// No introduce mecánicas, hazards, cambios de física ni generación alternativa.
(function initThemeFoundationV461(global) {
    'use strict';

    const THEME_STORAGE_V461 = 'bombermanRoguelikeTheme';

    const CLASSIC_THEME = Object.freeze({
        id: 'classic',
        nombre: 'Clásico',
        tipo: 'visual-only',

        paleta: Object.freeze({
            background: '#090d16',
            floorA: '#0f172a',
            floorB: '#1e293b',
            floorHighlight: 'rgba(255,255,255,0.03)',
            floorShadow: 'rgba(0,0,0,0.2)',

            wallBase: '#475569',
            wallHighlight: '#94a3b8',
            wallShadow: '#334155',
            wallInset: '#1e293b',
            wallDeep: '#0f172a',
            wallAccent: '#38bdf8',

            blockBase: '#b45309',
            blockHighlight: '#f59e0b',
            blockShadow: '#78350f',
            blockPattern: '#92400e',
            blockCore: '#451a03',

            exit: '#facc15',
            exitDark: '#000000',

            playerSuit: '#2563eb',
            playerDark: '#0f172a',
            playerBuckle: '#facc15',
            playerShield: 'rgba(56,189,248,0.8)',
            playerHelmet: '#f8fafc',
            playerFace: '#ffedd5',
            playerAccent: '#ec4899',
            playerBoot: '#dc2626',
            playerMetal: '#94a3b8',

            enemyShadow: 'rgba(0,0,0,0.4)',
            enemyEye: '#ffffff',
            enemyPupil: '#000000',
            enemyRastrero: '#ef4444',
            enemyVolador: '#3b82f6',
            enemyEspecial: '#22c55e',

            bombPlayerRing: 'rgba(34,211,238,.78)',
            bombBossRing: 'rgba(248,113,113,.82)',
            bombMovingFill: 'rgba(255,210,63,.14)',
            bombMovingStroke: 'rgba(255,138,0,.7)',
            bombShadow: 'rgba(0,0,0,0.5)',
            bombBody: '#0f172a',
            bombReflect: 'rgba(255,255,255,0.2)',
            bombCap: '#64748b',
            bombSparkHot: '#facc15',
            bombSparkDanger: '#ef4444',
            bombFuse: '#fee2e2',

            fireOuter: 'rgba(220,38,38,0.8)',
            lightingTransparent: 'rgba(0,0,0,0)',
            lightingMid: 'rgba(0,0,0,.12)',
            lightingDark: 'rgba(0,0,0,.52)',
            bombGlow: 'rgba(255,170,50,.20)',
            bombGlowOuter: 'rgba(255,80,20,0)',
            fireMiddle: '#f97316',
            fireCore: '#fef08a',

            particleImpact: '#fde68a',
            particleFire: '#fb923c',
            particleBlock: '#b45309',
            particleDanger: '#f87171',
            particleShield: '#38bdf8',
            particleLoot: '#fbbf24',
            particleEnemy: '#38bdf8',
            particleEnemyElite: '#fb7185',
            particleBoss: '#f43f5e',
            feedbackRingSoft: '#fed7aa',
            feedbackFlash: '#fff7ed',

            powerupBase: '#0284c7',
            powerupAccent: '#38bdf8',
            relicBase: '#3b1d6b',
            relicAccent: '#c084fc',
            bossBase: '#312e81',
            bossOutline: '#a78bfa',
            bossShoulder: '#4c1d95',
            bossFacePlate: '#111827',
            bossEye: '#e9d5ff',
            bossCrown: '#facc15',
            bossCore: '#c084fc',
            bossRageBase: '#581c1c',
            bossRageOutline: '#fb7185',
            bossRageShoulder: '#991b1b',
            bossRageEye: '#fda4af',
            bossRageCore: '#ef4444',
            bossPhaseMarker: '#fef08a',
            bossShadow: 'rgba(0,0,0,.42)',
            ambientDust: 'rgba(226,232,240,0.06)',
            white: '#ffffff'
        }),

        sprites: Object.freeze({
            floor: 'procedural:floor',
            wall: 'procedural:steel-wall',
            brick: 'procedural:wood-block',
            bomb: 'procedural:bomb',
            fire: 'procedural:explosion',
            player: 'procedural:bomberman',
            enemy: 'procedural:enemy',
            powerup: 'procedural:powerup',
            relic: 'procedural:relic',
            exit: 'procedural:exit',
            boss: 'procedural:boss'
        }),

        fondo: Object.freeze({ base: 'background', capas: Object.freeze([]) }),
        ambiente: Object.freeze({ tipo: 'dust', color: 'ambientDust', densidad: 1, velocidad: 0.35, sizeMin: 1, sizeMax: 2, alpha: 0.45 }),
        audio: Object.freeze({
            musica: null,
            sfx: Object.freeze({
                bomb: 'bomb', boom: 'boom', pickup: 'pickup', hurt: 'hurt', exit: 'exit', click: 'click',
                trap: 'trap', alarm: 'alarm', boss: 'boss', bossHit: 'bossHit', bossRoar: 'bossRoar',
                bossCharge: 'bossCharge', bossWave: 'bossWave', damageHit: 'damageHit', enemyKill: 'enemyKill',
                death: 'death', bombReady: 'bombReady'
            })
        }),

        mecanicas: Object.freeze([]),
        nivelGen: Object.freeze({ source: 'v4.4-bomberman-number-generator', densityMin: 0.25, densityMax: 0.72, classicPillarSpacing: 2, symmetry: 'current' }),
        enemigos: Object.freeze({
            pool: Object.freeze(['RASTRERO', 'VOLADOR', 'ESPECIAL']),
            colors: Object.freeze({ RASTRERO: 'enemyRastrero', VOLADOR: 'enemyVolador', ESPECIAL: 'enemyEspecial' })
        }),
        // Pool universal: genéricos + capacidades de interacción.
        // THROW forma parte de las capacidades de interacción.
        powerups: Object.freeze({ pool: Object.freeze(['BOMB_UP','FIRE_UP','SPEED_UP','HEALTH_UP','SHIELD_UP','KICK','GRAB']) })
    });

    function createVisualThemeV461(id, nombre, paletteOverrides, spriteOverrides, ambientOverrides) {
        return Object.freeze({
            ...CLASSIC_THEME,
            id,
            nombre,
            paleta: Object.freeze({ ...CLASSIC_THEME.paleta, ...paletteOverrides }),
            sprites: Object.freeze({ ...CLASSIC_THEME.sprites, ...spriteOverrides }),
            ambiente: Object.freeze({ ...CLASSIC_THEME.ambiente, ...ambientOverrides }),
            mecanicas: Object.freeze([])
        });
    }

    const WINTER_THEME_BASE = createVisualThemeV461(
        'winter',
        'Invierno',
        {
            background: '#071321',
            floorA: '#17334a',
            floorB: '#1d465f',
            floorHighlight: 'rgba(226,247,255,.07)',
            floorShadow: 'rgba(1,13,25,.30)',
            wallBase: '#7196aa',
            wallHighlight: '#e1f6ff',
            wallShadow: '#426172',
            wallInset: '#294856',
            wallDeep: '#122b38',
            wallAccent: '#bdeeff',
            blockBase: '#738f9a',
            blockHighlight: '#d8eef4',
            blockShadow: '#47616d',
            blockPattern: '#587782',
            blockCore: '#29434f',
            bombPlayerRing: 'rgba(191,239,255,.90)',
            bombBossRing: 'rgba(248,113,113,.82)',
            bombMovingFill: 'rgba(186,230,253,.18)',
            bombMovingStroke: 'rgba(125,211,252,.84)',
            bombBody: '#10232e',
            bombReflect: 'rgba(255,255,255,.28)',
            bombCap: '#7eaebe',
            bombSparkHot: '#f8fdff',
            bombSparkDanger: '#67d9ff',
            bombFuse: '#ecfeff',
            fireOuter: 'rgba(56,189,248,.88)',
            lightingMid: 'rgba(3,24,42,.10)',
            lightingDark: 'rgba(0,11,24,.48)',
            bombGlow: 'rgba(103,232,249,.20)',
            bombGlowOuter: 'rgba(56,189,248,0)',
            fireMiddle: '#7dd3fc',
            fireCore: '#f0f9ff',
            particleImpact: '#dff7ff',
            particleFire: '#7dd3fc',
            particleBlock: '#a8c8d4',
            particleDanger: '#8be9ff',
            particleShield: '#bae6fd',
            particleLoot: '#e0f2fe',
            particleEnemy: '#67e8f9',
            particleEnemyElite: '#fda4af',
            particleBoss: '#fb7185',
            feedbackRingSoft: '#dbeafe',
            feedbackFlash: '#e0f2fe',
            ambientDust: 'rgba(233,248,255,.82)'
        },
        {
            floor: 'procedural:ice-floor', wall: 'procedural:ice-wall', brick: 'procedural:frozen-block',
            bomb: 'procedural:ice-bomb', fire: 'procedural:frost-fire'
        },
        { tipo: 'snow', color: 'ambientDust', densidad: 1, velocidad: 0.42, sizeMin: 1, sizeMax: 3, alpha: 0.55 }
    );

    const WINTER_THEME = Object.freeze({
        ...WINTER_THEME_BASE,
        // Winter conserva identidad visual, pero no declara mecánicas, hazards ni power-ups propios.
        mecanicas: Object.freeze([]),
        enemigos: WINTER_THEME_BASE.enemigos,
        powerups: Object.freeze({ pool: Object.freeze(['BOMB_UP','FIRE_UP','SPEED_UP','HEALTH_UP','SHIELD_UP','KICK','GRAB']) })
    });

    const INFERNO_THEME = createVisualThemeV461(
        'inferno',
        'Infierno',
        {
            background: '#160504',
            floorA: '#2a0b07',
            floorB: '#3b1209',
            floorHighlight: 'rgba(255,218,170,.045)',
            floorShadow: 'rgba(10,0,0,.40)',
            wallBase: '#6b2b1c',
            wallHighlight: '#d0784a',
            wallShadow: '#3d120b',
            wallInset: '#2a0d08',
            wallDeep: '#140403',
            wallAccent: '#ff9b3d',
            blockBase: '#7c2d12',
            blockHighlight: '#fb923c',
            blockShadow: '#451407',
            blockPattern: '#9a3412',
            blockCore: '#2a0a03',
            bombPlayerRing: 'rgba(255,138,69,.90)',
            bombBossRing: 'rgba(255,68,43,.92)',
            bombMovingFill: 'rgba(255,160,80,.17)',
            bombMovingStroke: 'rgba(255,138,0,.84)',
            bombBody: '#170907',
            bombReflect: 'rgba(255,230,210,.24)',
            bombCap: '#8b5e48',
            bombSparkHot: '#ffd166',
            bombSparkDanger: '#ff4b2b',
            bombFuse: '#ffe4cc',
            fireOuter: 'rgba(239,68,68,.90)',
            lightingMid: 'rgba(42,0,0,.14)',
            lightingDark: 'rgba(20,0,0,.58)',
            bombGlow: 'rgba(255,112,0,.25)',
            bombGlowOuter: 'rgba(255,70,0,0)',
            fireMiddle: '#ff7a18',
            fireCore: '#ffe066',
            particleImpact: '#ffd166',
            particleFire: '#ff8a3d',
            particleBlock: '#c2410c',
            particleDanger: '#ff5b57',
            particleShield: '#ffb38a',
            particleLoot: '#ffd166',
            particleEnemy: '#fb7185',
            particleEnemyElite: '#ffb4a8',
            particleBoss: '#ff3d2e',
            feedbackRingSoft: '#fed7aa',
            feedbackFlash: '#fff0d6',
            ambientDust: 'rgba(255,153,92,.76)'
        },
        {
            floor: 'procedural:scorched-floor', wall: 'procedural:basalt-wall', brick: 'procedural:charred-block',
            bomb: 'procedural:inferno-bomb', fire: 'procedural:inferno-flame'
        },
        { tipo: 'ember', color: 'ambientDust', densidad: 0.9, velocidad: 0.52, sizeMin: 1, sizeMax: 2, alpha: 0.58 }
    );

    const AUTUMN_THEME = createVisualThemeV461(
        'autumn',
        'Otoño',
        {
            background:'#140d08', floorA:'#2f1b12', floorB:'#4a2917', floorHighlight:'rgba(255,214,153,.055)', floorShadow:'rgba(15,5,0,.34)',
            wallBase:'#765033', wallHighlight:'#c79a63', wallShadow:'#4a2d1b', wallInset:'#2d1a10', wallDeep:'#170b06', wallAccent:'#e8a24a',
            blockBase:'#8b451f', blockHighlight:'#d48a3a', blockShadow:'#5a2612', blockPattern:'#a85a28', blockCore:'#351207',
            bombPlayerRing:'rgba(251,191,36,.88)', bombMovingFill:'rgba(245,158,11,.18)', bombMovingStroke:'rgba(251,191,36,.82)', bombBody:'#1a100b', bombCap:'#8d6b4d', bombSparkHot:'#fde68a', bombSparkDanger:'#f97316', bombFuse:'#ffedd5',
            fireOuter:'rgba(234,88,12,.90)', bombGlow:'rgba(245,158,11,.24)', bombGlowOuter:'rgba(180,83,9,0)', fireMiddle:'#f97316', fireCore:'#fde68a',
            particleImpact:'#f7d18a', particleFire:'#fb923c', particleBlock:'#b45309', particleDanger:'#ef4444', particleShield:'#f59e0b', particleLoot:'#fbbf24', particleEnemy:'#fb923c', particleEnemyElite:'#fda4af', particleBoss:'#dc2626',
            feedbackRingSoft:'#fed7aa', feedbackFlash:'#fff7ed', ambientDust:'rgba(255,191,105,.48)'
        },
        { floor:'procedural:autumn-floor', wall:'procedural:autumn-wall', brick:'procedural:autumn-block', bomb:'procedural:autumn-bomb', fire:'procedural:autumn-flame' },
        { tipo:'dust', color:'ambientDust', densidad:1.15, velocidad:.26, sizeMin:1, sizeMax:2, alpha:.5 }
    );

    const SPRING_THEME = createVisualThemeV461(
        'spring',
        'Primavera',
        {
            background:'#07130d', floorA:'#163321', floorB:'#20462d', floorHighlight:'rgba(187,247,208,.055)', floorShadow:'rgba(0,18,8,.30)',
            wallBase:'#52745b', wallHighlight:'#9bd3a7', wallShadow:'#304b36', wallInset:'#1d3223', wallDeep:'#0c1c11', wallAccent:'#7ee2a1',
            blockBase:'#5c7f4c', blockHighlight:'#a3c969', blockShadow:'#36502a', blockPattern:'#6f944f', blockCore:'#1e3318',
            bombPlayerRing:'rgba(134,239,172,.88)', bombMovingFill:'rgba(74,222,128,.15)', bombMovingStroke:'rgba(134,239,172,.82)', bombBody:'#0c1b12', bombCap:'#668b70', bombSparkHot:'#dcfce7', bombSparkDanger:'#fb7185', bombFuse:'#ecfdf5',
            fireOuter:'rgba(34,197,94,.84)', bombGlow:'rgba(74,222,128,.20)', bombGlowOuter:'rgba(22,101,52,0)', fireMiddle:'#4ade80', fireCore:'#ecfccb',
            particleImpact:'#d9f99d', particleFire:'#86efac', particleBlock:'#65a30d', particleDanger:'#fb7185', particleShield:'#67e8f9', particleLoot:'#facc15', particleEnemy:'#34d399', particleEnemyElite:'#f9a8d4', particleBoss:'#e879f9',
            feedbackRingSoft:'#bbf7d0', feedbackFlash:'#f0fdf4', ambientDust:'rgba(187,247,208,.42)'
        },
        { floor:'procedural:spring-floor', wall:'procedural:moss-wall', brick:'procedural:hedge-block', bomb:'procedural:spring-bomb', fire:'procedural:verdant-flame' },
        { tipo:'dust', color:'ambientDust', densidad:1.2, velocidad:.18, sizeMin:1, sizeMax:2, alpha:.4 }
    );

    const SUMMER_THEME = createVisualThemeV461(
        'summer',
        'Verano',
        {
            background:'#10100a', floorA:'#40371a', floorB:'#655523', floorHighlight:'rgba(255,244,180,.06)', floorShadow:'rgba(28,21,0,.34)',
            wallBase:'#8a7440', wallHighlight:'#e4c66a', wallShadow:'#5b471f', wallInset:'#392a10', wallDeep:'#1b1306', wallAccent:'#f6d36b',
            blockBase:'#b2742a', blockHighlight:'#f0b85a', blockShadow:'#70410f', blockPattern:'#c88732', blockCore:'#3f2108',
            bombPlayerRing:'rgba(45,212,191,.88)', bombMovingFill:'rgba(20,184,166,.16)', bombMovingStroke:'rgba(45,212,191,.80)', bombBody:'#14201e', bombCap:'#7b8f86', bombSparkHot:'#fef3c7', bombSparkDanger:'#14b8a6', bombFuse:'#fff7ed',
            fireOuter:'rgba(249,115,22,.90)', bombGlow:'rgba(245,158,11,.22)', bombGlowOuter:'rgba(180,83,9,0)', fireMiddle:'#fb923c', fireCore:'#fef08a',
            particleImpact:'#fde68a', particleFire:'#fdba74', particleBlock:'#d97706', particleDanger:'#f43f5e', particleShield:'#2dd4bf', particleLoot:'#fde047', particleEnemy:'#f59e0b', particleEnemyElite:'#fb7185', particleBoss:'#ef4444',
            feedbackRingSoft:'#ccfbf1', feedbackFlash:'#fffbeb', ambientDust:'rgba(253,224,71,.38)'
        },
        { floor:'procedural:sand-floor', wall:'procedural:sunstone-wall', brick:'procedural:sand-block', bomb:'procedural:sun-bomb', fire:'procedural:solar-flame' },
        { tipo:'dust', color:'ambientDust', densidad:.8, velocidad:.12, sizeMin:1, sizeMax:2, alpha:.36 }
    );

    const UNDERGROUND_THEME = createVisualThemeV461(
        'underground',
        'Bajo tierra',
        {
            background:'#0b0713', floorA:'#211532', floorB:'#33204a', floorHighlight:'rgba(221,214,254,.045)', floorShadow:'rgba(8,3,15,.42)',
            wallBase:'#5b4f6f', wallHighlight:'#9f8fbe', wallShadow:'#3a3048', wallInset:'#241b31', wallDeep:'#110b18', wallAccent:'#c4b5fd',
            blockBase:'#66506f', blockHighlight:'#a989ad', blockShadow:'#402d48', blockPattern:'#745a80', blockCore:'#241329',
            bombPlayerRing:'rgba(196,181,253,.88)', bombMovingFill:'rgba(167,139,250,.16)', bombMovingStroke:'rgba(196,181,253,.82)', bombBody:'#110c17', bombCap:'#746888', bombSparkHot:'#f5f3ff', bombSparkDanger:'#e879f9', bombFuse:'#f5f3ff',
            fireOuter:'rgba(192,132,252,.88)', bombGlow:'rgba(168,85,247,.22)', bombGlowOuter:'rgba(76,29,149,0)', fireMiddle:'#c084fc', fireCore:'#f5d0fe',
            particleImpact:'#e9d5ff', particleFire:'#d8b4fe', particleBlock:'#8b5cf6', particleDanger:'#f472b6', particleShield:'#a78bfa', particleLoot:'#f5d0fe', particleEnemy:'#8b5cf6', particleEnemyElite:'#f0abfc', particleBoss:'#c026d3',
            feedbackRingSoft:'#ddd6fe', feedbackFlash:'#faf5ff', ambientDust:'rgba(196,181,253,.36)'
        },
        { floor:'procedural:cavern-floor', wall:'procedural:deep-wall', brick:'procedural:ore-block', bomb:'procedural:crystal-bomb', fire:'procedural:arcane-flame' },
        { tipo:'dust', color:'ambientDust', densidad:1.05, velocidad:.2, sizeMin:1, sizeMax:2, alpha:.34 }
    );

    const CLOUDS_THEME = createVisualThemeV461(
        'clouds',
        'Nubes',
        {
            background:'#07101c', floorA:'#23364c', floorB:'#38556f', floorHighlight:'rgba(224,242,254,.08)', floorShadow:'rgba(4,14,25,.34)',
            wallBase:'#72869a', wallHighlight:'#c7d8e7', wallShadow:'#4a5e71', wallInset:'#304150', wallDeep:'#152431', wallAccent:'#dbeafe',
            blockBase:'#8299ab', blockHighlight:'#d8e6f1', blockShadow:'#586e81', blockPattern:'#6f8799', blockCore:'#2d4050',
            bombPlayerRing:'rgba(224,242,254,.92)', bombMovingFill:'rgba(147,197,253,.16)', bombMovingStroke:'rgba(191,219,254,.84)', bombBody:'#10202e', bombCap:'#8da7b9', bombSparkHot:'#ffffff', bombSparkDanger:'#60a5fa', bombFuse:'#eff6ff',
            fireOuter:'rgba(96,165,250,.86)', bombGlow:'rgba(125,211,252,.20)', bombGlowOuter:'rgba(59,130,246,0)', fireMiddle:'#93c5fd', fireCore:'#f0f9ff',
            particleImpact:'#e0f2fe', particleFire:'#bae6fd', particleBlock:'#94a3b8', particleDanger:'#60a5fa', particleShield:'#a5f3fc', particleLoot:'#fde68a', particleEnemy:'#38bdf8', particleEnemyElite:'#c4b5fd', particleBoss:'#818cf8',
            feedbackRingSoft:'#dbeafe', feedbackFlash:'#f8fafc', ambientDust:'rgba(219,234,254,.54)'
        },
        { floor:'procedural:cloud-floor', wall:'procedural:sky-wall', brick:'procedural:cloud-block', bomb:'procedural:cloud-bomb', fire:'procedural:sky-flame' },
        { tipo:'snow', color:'ambientDust', densidad:.75, velocidad:.28, sizeMin:1, sizeMax:3, alpha:.38 }
    );

    const MOUNTAINS_THEME = createVisualThemeV461(
        'mountains',
        'Montañas',
        {
            background:'#080e13', floorA:'#27333a', floorB:'#38464f', floorHighlight:'rgba(226,232,240,.05)', floorShadow:'rgba(1,6,10,.42)',
            wallBase:'#68747b', wallHighlight:'#b9c5cb', wallShadow:'#3d484e', wallInset:'#273137', wallDeep:'#12191e', wallAccent:'#cbd5e1',
            blockBase:'#6b6258', blockHighlight:'#a8a097', blockShadow:'#464039', blockPattern:'#7d7368', blockCore:'#28231e',
            bombPlayerRing:'rgba(186,230,253,.90)', bombMovingFill:'rgba(148,163,184,.16)', bombMovingStroke:'rgba(203,213,225,.82)', bombBody:'#11171b', bombCap:'#7e8b91', bombSparkHot:'#f8fafc', bombSparkDanger:'#38bdf8', bombFuse:'#f8fafc',
            fireOuter:'rgba(56,189,248,.82)', bombGlow:'rgba(125,211,252,.18)', bombGlowOuter:'rgba(14,116,144,0)', fireMiddle:'#38bdf8', fireCore:'#f0f9ff',
            particleImpact:'#e2e8f0', particleFire:'#7dd3fc', particleBlock:'#a8a29e', particleDanger:'#fb7185', particleShield:'#bae6fd', particleLoot:'#fde68a', particleEnemy:'#94a3b8', particleEnemyElite:'#fca5a5', particleBoss:'#64748b',
            feedbackRingSoft:'#e2e8f0', feedbackFlash:'#f8fafc', ambientDust:'rgba(203,213,225,.34)'
        },
        { floor:'procedural:mountain-floor', wall:'procedural:rock-wall', brick:'procedural:stone-block', bomb:'procedural:granite-bomb', fire:'procedural:blue-flame' },
        { tipo:'snow', color:'ambientDust', densidad:.48, velocidad:.2, sizeMin:1, sizeMax:2, alpha:.3 }
    );

    const BEACH_THEME = createVisualThemeV461(
        'beach',
        'Playa',
        {
            background:'#061218', floorA:'#16434c', floorB:'#20616a', floorHighlight:'rgba(207,250,254,.065)', floorShadow:'rgba(0,13,18,.36)',
            wallBase:'#557e7d', wallHighlight:'#a9d9cf', wallShadow:'#365b59', wallInset:'#203c3d', wallDeep:'#0c2023', wallAccent:'#67e8f9',
            blockBase:'#a07c4f', blockHighlight:'#d8b985', blockShadow:'#725333', blockPattern:'#b18e5c', blockCore:'#3d2919',
            bombPlayerRing:'rgba(34,211,238,.90)', bombMovingFill:'rgba(45,212,191,.16)', bombMovingStroke:'rgba(103,232,249,.84)', bombBody:'#092027', bombCap:'#6f8e8f', bombSparkHot:'#ecfeff', bombSparkDanger:'#2dd4bf', bombFuse:'#ecfeff',
            fireOuter:'rgba(6,182,212,.84)', bombGlow:'rgba(45,212,191,.20)', bombGlowOuter:'rgba(8,145,178,0)', fireMiddle:'#22d3ee', fireCore:'#ecfeff',
            particleImpact:'#cffafe', particleFire:'#67e8f9', particleBlock:'#d6a76d', particleDanger:'#fb7185', particleShield:'#5eead4', particleLoot:'#fef08a', particleEnemy:'#06b6d4', particleEnemyElite:'#f9a8d4', particleBoss:'#0ea5e9',
            feedbackRingSoft:'#ccfbf1', feedbackFlash:'#ecfeff', ambientDust:'rgba(103,232,249,.34)'
        },
        { floor:'procedural:shore-floor', wall:'procedural:coral-wall', brick:'procedural:sandstone-block', bomb:'procedural:tide-bomb', fire:'procedural:water-flame' },
        { tipo:'dust', color:'ambientDust', densidad:.65, velocidad:.09, sizeMin:1, sizeMax:2, alpha:.3 }
    );

    const SPACE_THEME = createVisualThemeV461(
        'space',
        'Espacio',
        {
            background:'#030514', floorA:'#11183a', floorB:'#1b2752', floorHighlight:'rgba(165,180,252,.055)', floorShadow:'rgba(0,0,12,.46)',
            wallBase:'#3a466b', wallHighlight:'#7181b8', wallShadow:'#202a4a', wallInset:'#131b31', wallDeep:'#080d1d', wallAccent:'#a5b4fc',
            blockBase:'#414b73', blockHighlight:'#7c8fca', blockShadow:'#252f4f', blockPattern:'#51608e', blockCore:'#141a32',
            bombPlayerRing:'rgba(129,140,248,.92)', bombMovingFill:'rgba(99,102,241,.17)', bombMovingStroke:'rgba(165,180,252,.86)', bombBody:'#080c18', bombCap:'#59658e', bombSparkHot:'#eef2ff', bombSparkDanger:'#22d3ee', bombFuse:'#eef2ff',
            fireOuter:'rgba(99,102,241,.90)', bombGlow:'rgba(129,140,248,.24)', bombGlowOuter:'rgba(79,70,229,0)', fireMiddle:'#818cf8', fireCore:'#e0e7ff',
            particleImpact:'#c7d2fe', particleFire:'#a5b4fc', particleBlock:'#6366f1', particleDanger:'#f472b6', particleShield:'#67e8f9', particleLoot:'#fde68a', particleEnemy:'#22d3ee', particleEnemyElite:'#c084fc', particleBoss:'#e879f9',
            feedbackRingSoft:'#c7d2fe', feedbackFlash:'#eef2ff', ambientDust:'rgba(165,180,252,.42)'
        },
        { floor:'procedural:space-floor', wall:'procedural:starship-wall', brick:'procedural:asteroid-block', bomb:'procedural:cosmic-bomb', fire:'procedural:void-flame' },
        { tipo:'dust', color:'ambientDust', densidad:.7, velocidad:.2, sizeMin:1, sizeMax:2, alpha:.42 }
    );

    const SKY_THEME = createVisualThemeV461(
        'sky',
        'Cielo',
        {
            background:'#10071a', floorA:'#352046', floorB:'#4e2b63', floorHighlight:'rgba(250,232,255,.055)', floorShadow:'rgba(17,3,24,.44)',
            wallBase:'#69547c', wallHighlight:'#b99bc9', wallShadow:'#473556', wallInset:'#2d2038', wallDeep:'#130b19', wallAccent:'#f0abfc',
            blockBase:'#725070', blockHighlight:'#b77a9f', blockShadow:'#4b2d49', blockPattern:'#855d7e', blockCore:'#281526',
            bombPlayerRing:'rgba(240,171,252,.90)', bombMovingFill:'rgba(217,70,239,.16)', bombMovingStroke:'rgba(240,171,252,.84)', bombBody:'#170b1a', bombCap:'#826382', bombSparkHot:'#fdf4ff', bombSparkDanger:'#e879f9', bombFuse:'#fdf4ff',
            fireOuter:'rgba(217,70,239,.86)', bombGlow:'rgba(232,121,249,.22)', bombGlowOuter:'rgba(126,34,206,0)', fireMiddle:'#e879f9', fireCore:'#fdf4ff',
            particleImpact:'#fae8ff', particleFire:'#f0abfc', particleBlock:'#a855f7', particleDanger:'#fb7185', particleShield:'#67e8f9', particleLoot:'#fde68a', particleEnemy:'#d946ef', particleEnemyElite:'#fda4af', particleBoss:'#c026d3',
            feedbackRingSoft:'#f5d0fe', feedbackFlash:'#fdf4ff', ambientDust:'rgba(240,171,252,.40)'
        },
        { floor:'procedural:sky-floor', wall:'procedural:cloudstone-wall', brick:'procedural:twilight-block', bomb:'procedural:aurora-bomb', fire:'procedural:nebula-flame' },
        { tipo:'snow', color:'ambientDust', densidad:.62, velocidad:.16, sizeMin:1, sizeMax:2, alpha:.34 }
    );

    const registry = { classic: CLASSIC_THEME, winter: WINTER_THEME, autumn: AUTUMN_THEME, spring: SPRING_THEME, summer: SUMMER_THEME, underground: UNDERGROUND_THEME, clouds: CLOUDS_THEME, mountains: MOUNTAINS_THEME, beach: BEACH_THEME, space: SPACE_THEME, sky: SKY_THEME, inferno: INFERNO_THEME };
    let activeThemeId = 'classic';

    function getThemeV46() {
        return registry[activeThemeId] || CLASSIC_THEME;
    }

    function getThemePaletteV46() {
        return getThemeV46().paleta;
    }

    function themeColorV46(key, fallback = '#ffffff') {
        const palette = getThemePaletteV46();
        return Object.prototype.hasOwnProperty.call(palette, key) ? palette[key] : fallback;
    }

    function themeSpriteV46(key, fallback = null) {
        const sprites = getThemeV46().sprites;
        return Object.prototype.hasOwnProperty.call(sprites, key) ? sprites[key] : fallback;
    }

    function themeAudioV46(key, fallback = key) {
        const sfx = getThemeV46().audio?.sfx || {};
        return Object.prototype.hasOwnProperty.call(sfx, key) ? sfx[key] : fallback;
    }

    function themeParticleColorV46(key, fallback = '#ffffff') {
        return themeColorV46(key, fallback);
    }

    function applyThemeCssTokensV46() {
        if (!global.document?.documentElement) return false;
        const root = global.document.documentElement;
        const palette = getThemePaletteV46();
        root.style.setProperty('--theme-background', palette.background);
        root.style.setProperty('--theme-floor-a', palette.floorA);
        root.style.setProperty('--theme-floor-b', palette.floorB);
        root.style.setProperty('--theme-accent', palette.wallAccent);
        if (global.document.body) global.document.body.setAttribute('data-theme', activeThemeId);
        return true;
    }

    function updateThemeSelectorV461() {
        const theme = getThemeV46();
        global.document?.querySelectorAll?.('[data-theme-option]').forEach(button => {
            const active = button.getAttribute('data-theme-option') === activeThemeId;
            button.classList.toggle('is-selected', active);
            button.setAttribute('aria-checked', active ? 'true' : 'false');
        });
    }

    function setActiveThemeV46(id, persist = true) {
        if (!registry[id]) return false;
        activeThemeId = id;
        global.BOMBER_THEME = registry[id];
        applyThemeCssTokensV46();
        if (typeof global.invalidateRenderCacheV317 === 'function') global.invalidateRenderCacheV317();
        if (persist) {
            try { global.localStorage.setItem(THEME_STORAGE_V461, id); } catch (_) {}
        }
        updateThemeSelectorV461();
        return true;
    }

    function getThemeOptionsV461() {
        return Object.keys(registry).filter(id => id !== 'classic').map(id => registry[id]);
    }

    function initializeThemeV461() {
        let stored = null;
        try { stored = global.localStorage.getItem(THEME_STORAGE_V461); } catch (_) {}
        setActiveThemeV46(registry[stored] ? stored : 'classic', false);

        global.document?.querySelectorAll?.('[data-theme-option]').forEach(button => {
            button.addEventListener('click', () => {
                if (typeof global.initAudio === 'function') global.initAudio();
                if (global.audioCtx?.resume) global.audioCtx.resume();
                if (typeof global.sfx === 'function') global.sfx('click');
                setActiveThemeV46(button.getAttribute('data-theme-option'));
            });
        });
        updateThemeSelectorV461();
        return getThemeV46();
    }

    global.BOMBER_THEME = CLASSIC_THEME;
    global.THEMES_V46 = registry;
    global.getThemeV46 = getThemeV46;
    global.getThemePaletteV46 = getThemePaletteV46;
    global.themeColorV46 = themeColorV46;
    global.themeSpriteV46 = themeSpriteV46;
    global.themeAudioV46 = themeAudioV46;
    global.themeParticleColorV46 = themeParticleColorV46;
    global.setActiveThemeV46 = setActiveThemeV46;
    global.getThemeOptionsV461 = getThemeOptionsV461;
    global.applyThemeCssTokensV46 = applyThemeCssTokensV46;
    global.initializeThemeV461 = initializeThemeV461;

    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.getTheme = getThemeV46;
    global.BOMBER_ENGINE.getThemeRegistry = () => ({ ...registry });
    global.BOMBER_ENGINE.getThemeId = () => activeThemeId;
    global.BOMBER_ENGINE.getThemeMetadata = () => {
        const theme = getThemeV46();
        return {
            id: theme.id,
            nombre: theme.nombre,
            type: theme.tipo,
            visualOnly: theme.tipo === 'visual-only',
            mechanics: [...theme.mecanicas],
            hazards: [],
            levelGeneration: { ...theme.nivelGen },
            enemyPool: [...theme.enemigos.pool],
            powerupPool: [...theme.powerups.pool]
        };
    };

    if (global.document?.readyState === 'loading') {
        global.document.addEventListener('DOMContentLoaded', initializeThemeV461, { once: true });
    } else {
        initializeThemeV461();
    }
})(window);
