// Bomberman Roguelike v5.4 — Visual Themes + gameplay contracts
// Los temas declaran datos visuales y IDs de mecánicas.
// La lógica de mecánicas y hazards vive en sus registries independientes.
(function initThemeFoundationV47(global) {
    'use strict';

    const THEME_STORAGE_V47 = 'bombermanRoguelikeTheme';

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

        mechanics: Object.freeze([]),
        hazards: Object.freeze([]),
        nivelGen: Object.freeze({ source: 'v4.4-bomberman-number-generator', densityMin: 0.25, densityMax: 0.72, classicPillarSpacing: 2, symmetry: 'current' }),
        enemigos: Object.freeze({
            pool: Object.freeze(['RASTRERO', 'VOLADOR', 'ESPECIAL']),
            colors: Object.freeze({ RASTRERO: 'enemyRastrero', VOLADOR: 'enemyVolador', ESPECIAL: 'enemyEspecial' })
        }),
        powerups: Object.freeze({ pool: Object.freeze(['BOMB_UP', 'FIRE_UP', 'SPEED_UP', 'HEALTH_UP', 'SHIELD_UP', 'RELIC']) })
    });

    function createVisualThemeV47(id, nombre, paletteOverrides = {}, spriteOverrides = {}, ambientOverrides = {}, mechanicIds = [], hazardIds = [], mechanicConfig = {}, hazardConfig = {}) {
        return Object.freeze({
            ...CLASSIC_THEME,
            id,
            nombre,
            tipo: mechanicIds.length ? 'gameplay-theme' : 'visual-only',
            paleta: Object.freeze({ ...CLASSIC_THEME.paleta, ...paletteOverrides }),
            sprites: Object.freeze({ ...CLASSIC_THEME.sprites, ...spriteOverrides }),
            ambiente: Object.freeze({ ...CLASSIC_THEME.ambiente, ...ambientOverrides }),
            mechanics: Object.freeze([...mechanicIds]),
            mechanicConfig: Object.freeze(JSON.parse(JSON.stringify(mechanicConfig))),
            hazards: Object.freeze([...hazardIds]),
            hazardConfig: Object.freeze(JSON.parse(JSON.stringify(hazardConfig)))
        });
    }

    const WINTER_THEME = createVisualThemeV47(
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
        { tipo: 'snow', color: 'ambientDust', densidad: 1, velocidad: 0.42, sizeMin: 1, sizeMax: 3, alpha: 0.55 },
        ['slippery'],
        ['blizzard']
    );

    const INFERNO_THEME = createVisualThemeV47(
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
        { tipo: 'ember', color: 'ambientDust', densidad: 0.9, velocidad: 0.52, sizeMin: 1, sizeMax: 2, alpha: 0.58 },
        ['darkness'],
        ['lava', 'lightning', 'landslide']
    );


    const AUTUMN_THEME = createVisualThemeV47(
        'autumn', 'Otoño',
        { background:'#171108', floorA:'#342512', floorB:'#4a3217', wallBase:'#765127', wallHighlight:'#d8a15a', wallShadow:'#4a2f13', wallInset:'#2a1b0b', wallDeep:'#120b04', wallAccent:'#f59e0b', blockBase:'#92400e', blockHighlight:'#d97706', blockShadow:'#5b2505', blockPattern:'#7c2d12', blockCore:'#2b0e03', fireOuter:'rgba(245,158,11,.82)', fireMiddle:'#f59e0b', fireCore:'#fff1b2', bombBody:'#201407', bombCap:'#8f6a3c', bombSparkHot:'#ffe8a3', bombSparkDanger:'#ef4444', particleImpact:'#f6d58a', particleFire:'#fbbf24', particleBlock:'#b45309', particleDanger:'#fb7185', ambientDust:'rgba(255,190,80,.72)', lightingMid:'rgba(42,24,2,.12)', lightingDark:'rgba(20,9,0,.52)' },
        { floor:'procedural:leaf-floor', wall:'procedural:autumn-wall', brick:'procedural:dry-brick', bomb:'procedural:amber-bomb', fire:'procedural:leaf-fire' },
        { tipo:'leaf', color:'ambientDust', densidad:.72, velocidad:.55, sizeMin:1, sizeMax:3, alpha:.46, drift:1.2 },
        ['wind_push'], ['landslide'],
        { wind_push:{ wind:{ cycleMs:3200, gustMs:1050, strength:.58, decay:.72 } } },
        { landslide:{ intervalMs:9800, maxActive:1 } }
    );
    const SPRING_THEME = createVisualThemeV47(
        'spring', 'Primavera',
        { background:'#07180f', floorA:'#12351d', floorB:'#1b4a29', wallBase:'#46734d', wallHighlight:'#a7d8a9', wallShadow:'#2e5135', wallInset:'#17301f', wallDeep:'#08130c', wallAccent:'#86efac', blockBase:'#497a45', blockHighlight:'#8fca75', blockShadow:'#2d5530', blockPattern:'#3f6f36', blockCore:'#152c18', fireOuter:'rgba(74,222,128,.72)', fireMiddle:'#86efac', fireCore:'#f0fdf4', bombBody:'#0c2012', bombCap:'#5b7d65', bombSparkHot:'#e7fff1', bombSparkDanger:'#ef4444', particleImpact:'#bbf7d0', particleFire:'#86efac', particleBlock:'#65a30d', particleDanger:'#fb7185', ambientDust:'rgba(166,255,195,.68)', lightingMid:'rgba(4,31,15,.10)', lightingDark:'rgba(0,15,7,.48)' },
        { floor:'procedural:moss-floor', wall:'procedural:moss-wall', brick:'procedural:vine-block', bomb:'procedural:mint-bomb', fire:'procedural:spring-fire' },
        { tipo:'pollen', color:'ambientDust', densidad:.55, velocidad:.28, sizeMin:1, sizeMax:2, alpha:.38 },
        ['water_drag'], ['lightning'],
        { water_drag:{ movement:{ speedMultiplier:.90, acceleration:.86, braking:1.12, turnCarrySpeed:.98 } } },
        { lightning:{ intervalMs:9200, maxActive:1 } }
    );
    const SUMMER_THEME = createVisualThemeV47(
        'summer', 'Verano',
        { background:'#211506', floorA:'#584015', floorB:'#76571d', wallBase:'#a07831', wallHighlight:'#f2d18a', wallShadow:'#6e4c1d', wallInset:'#4a3110', wallDeep:'#261806', wallAccent:'#fde68a', blockBase:'#c07a19', blockHighlight:'#fbbf24', blockShadow:'#7a4308', blockPattern:'#a65e09', blockCore:'#321700', fireOuter:'rgba(250,204,21,.84)', fireMiddle:'#fb923c', fireCore:'#fff7cc', bombBody:'#241706', bombCap:'#a67b35', bombSparkHot:'#fff0b8', bombSparkDanger:'#f97316', particleImpact:'#fde68a', particleFire:'#fb923c', particleBlock:'#d97706', particleDanger:'#f87171', ambientDust:'rgba(255,220,120,.68)', lightingMid:'rgba(56,32,2,.12)', lightingDark:'rgba(25,10,0,.52)' },
        { floor:'procedural:sand-floor', wall:'procedural:sandstone-wall', brick:'procedural:sand-block', bomb:'procedural:gold-bomb', fire:'procedural:sun-fire' },
        { tipo:'sand', color:'ambientDust', densidad:.65, velocidad:.48, sizeMin:1, sizeMax:2, alpha:.34, drift:1.5 },
        ['sand_drift'], ['lightning'],
        { sand_drift:{ movement:{ speedMultiplier:.96, acceleration:.86, braking:.66, turnCarrySpeed:1.05 } } },
        { lightning:{ intervalMs:7800, maxActive:1 } }
    );
    const UNDERGROUND_THEME = createVisualThemeV47(
        'underground', 'Bajo tierra',
        { background:'#08080b', floorA:'#19191f', floorB:'#26262d', wallBase:'#4b4650', wallHighlight:'#aaa3ab', wallShadow:'#302b31', wallInset:'#1d1a1f', wallDeep:'#0b0a0d', wallAccent:'#c4b5fd', blockBase:'#5b5560', blockHighlight:'#8e8593', blockShadow:'#39343d', blockPattern:'#4d4754', blockCore:'#17141a', fireOuter:'rgba(192,132,252,.72)', fireMiddle:'#c084fc', fireCore:'#f5f3ff', bombBody:'#121015', bombCap:'#756d7f', bombSparkHot:'#f5efff', bombSparkDanger:'#ef4444', particleImpact:'#ddd6fe', particleFire:'#c4b5fd', particleBlock:'#78716c', particleDanger:'#f87171', ambientDust:'rgba(205,193,218,.50)', lightingMid:'rgba(0,0,0,.18)', lightingDark:'rgba(0,0,0,.62)' },
        { floor:'procedural:cave-floor', wall:'procedural:granite-wall', brick:'procedural:ore-block', bomb:'procedural:obsidian-bomb', fire:'procedural:cave-fire' },
        { tipo:'mist', color:'ambientDust', densidad:.35, velocidad:.18, sizeMin:1, sizeMax:3, alpha:.24 },
        ['darkness','muddy'], ['landslide'],
        { darkness:{ visibility:{ radius:118, midStop:.50, midAlpha:.34, outerAlpha:.91 } }, muddy:{ movement:{ speedMultiplier:.84, acceleration:.74, braking:1.28, turnCarrySpeed:.80 } } },
        { landslide:{ intervalMs:6200, maxActive:2 } }
    );
    const CLOUDS_THEME = createVisualThemeV47(
        'clouds', 'Nubes',
        { background:'#0c1830', floorA:'#dbeafe', floorB:'#bfdbfe', floorHighlight:'rgba(255,255,255,.18)', floorShadow:'rgba(30,64,175,.14)', wallBase:'#93c5fd', wallHighlight:'#f8fbff', wallShadow:'#5d8fd0', wallInset:'#648dbd', wallDeep:'#335d8b', wallAccent:'#e0f2fe', blockBase:'#a5b4fc', blockHighlight:'#e0e7ff', blockShadow:'#6366f1', blockPattern:'#818cf8', blockCore:'#3730a3', fireOuter:'rgba(96,165,250,.75)', fireMiddle:'#7dd3fc', fireCore:'#ffffff', bombBody:'#172554', bombCap:'#93c5fd', bombSparkHot:'#fff', bombSparkDanger:'#ef4444', particleImpact:'#e0f2fe', particleFire:'#bae6fd', particleBlock:'#c7d2fe', particleDanger:'#93c5fd', ambientDust:'rgba(255,255,255,.72)', lightingMid:'rgba(59,130,246,.08)', lightingDark:'rgba(14,30,60,.46)' },
        { floor:'procedural:cloud-floor', wall:'procedural:cloud-wall', brick:'procedural:sky-brick', bomb:'procedural:storm-bomb', fire:'procedural:cloud-fire' },
        { tipo:'cloud', color:'ambientDust', densidad:.34, velocidad:.10, sizeMin:8, sizeMax:16, alpha:.11 },
        ['low_gravity','wind_push'], ['lightning'],
        { low_gravity:{ movement:{ acceleration:.74, braking:.58, turnCarrySpeed:1.18, speedMultiplier:1.05 } }, wind_push:{ wind:{ cycleMs:2400, gustMs:780, strength:.48, decay:.64 } } },
        { lightning:{ intervalMs:6400, maxActive:2 } }
    );
    const MOUNTAINS_THEME = createVisualThemeV47(
        'mountains', 'Montañas',
        { background:'#0b1115', floorA:'#27363d', floorB:'#334c55', wallBase:'#647780', wallHighlight:'#cbd5d8', wallShadow:'#45555c', wallInset:'#33434a', wallDeep:'#141e23', wallAccent:'#d1fae5', blockBase:'#64748b', blockHighlight:'#cbd5e1', blockShadow:'#475569', blockPattern:'#526476', blockCore:'#1e293b', fireOuter:'rgba(203,213,225,.64)', fireMiddle:'#e2e8f0', fireCore:'#ffffff', bombBody:'#111827', bombCap:'#94a3b8', bombSparkHot:'#f8fafc', bombSparkDanger:'#ef4444', particleImpact:'#e2e8f0', particleFire:'#cbd5e1', particleBlock:'#94a3b8', particleDanger:'#fb7185', ambientDust:'rgba(220,239,245,.62)', lightingMid:'rgba(30,50,60,.10)', lightingDark:'rgba(5,12,17,.50)' },
        { floor:'procedural:rock-floor', wall:'procedural:mountain-wall', brick:'procedural:stone-block', bomb:'procedural:iron-bomb', fire:'procedural:storm-fire' },
        { tipo:'snow', color:'ambientDust', densidad:.42, velocidad:.62, sizeMin:1, sizeMax:2, alpha:.40, drift:.7 },
        ['slippery','wind_push'], ['blizzard','landslide'],
        { slippery:{ movement:{ braking:.46, acceleration:.90, turnCarrySpeed:1.06 } }, wind_push:{ wind:{ cycleMs:3000, gustMs:900, strength:.42, decay:.70 } } },
        { blizzard:{ intervalMs:14500, maxActive:1 }, landslide:{ intervalMs:10300, maxActive:1 } }
    );
    const BEACH_THEME = createVisualThemeV47(
        'beach', 'Playa',
        { background:'#051923', floorA:'#d7c28a', floorB:'#ead8a3', floorHighlight:'rgba(255,255,255,.18)', floorShadow:'rgba(72,51,20,.16)', wallBase:'#c49b5f', wallHighlight:'#ffe5b5', wallShadow:'#8d6a3a', wallInset:'#705027', wallDeep:'#30210e', wallAccent:'#67e8f9', blockBase:'#c38b4d', blockHighlight:'#efc27d', blockShadow:'#865828', blockPattern:'#a66d35', blockCore:'#45260e', fireOuter:'rgba(34,211,238,.70)', fireMiddle:'#67e8f9', fireCore:'#ecfeff', bombBody:'#082f49', bombCap:'#60a5fa', bombSparkHot:'#ecfeff', bombSparkDanger:'#f97316', particleImpact:'#cffafe', particleFire:'#67e8f9', particleBlock:'#d6b27a', particleDanger:'#fb7185', ambientDust:'rgba(245,239,204,.66)', lightingMid:'rgba(6,65,90,.08)', lightingDark:'rgba(0,25,40,.48)' },
        { floor:'procedural:beach-floor', wall:'procedural:shell-wall', brick:'procedural:driftwood-block', bomb:'procedural:pearl-bomb', fire:'procedural:wave-fire' },
        { tipo:'sand', color:'ambientDust', densidad:.48, velocidad:.34, sizeMin:1, sizeMax:2, alpha:.28, drift:1.1 },
        ['sand_drift','water_drag'], ['tide'],
        { sand_drift:{ movement:{ speedMultiplier:.97, acceleration:.88, braking:.70, turnCarrySpeed:1.02 } }, water_drag:{ movement:{ speedMultiplier:.90, acceleration:.85, braking:1.10, turnCarrySpeed:.97 } } },
        { tide:{ intervalMs:9000, maxActive:1 } }
    );
    const SPACE_THEME = createVisualThemeV47(
        'space', 'Espacio',
        { background:'#02030b', floorA:'#0b1024', floorB:'#151b35', wallBase:'#4c527a', wallHighlight:'#b8c2ff', wallShadow:'#313757', wallInset:'#181c31', wallDeep:'#060712', wallAccent:'#a5b4fc', blockBase:'#42496e', blockHighlight:'#7c83b1', blockShadow:'#252a47', blockPattern:'#343b63', blockCore:'#141729', fireOuter:'rgba(129,140,248,.76)', fireMiddle:'#a5b4fc', fireCore:'#ffffff', bombBody:'#0a0d1b', bombCap:'#818cf8', bombSparkHot:'#ffffff', bombSparkDanger:'#f472b6', particleImpact:'#c7d2fe', particleFire:'#a5b4fc', particleBlock:'#6366f1', particleDanger:'#f472b6', ambientDust:'rgba(210,220,255,.66)', lightingMid:'rgba(17,24,65,.10)', lightingDark:'rgba(0,0,10,.68)' },
        { floor:'procedural:starship-floor', wall:'procedural:metal-wall', brick:'procedural:panel-block', bomb:'procedural:plasma-bomb', fire:'procedural:plasma-fire' },
        { tipo:'stars', color:'ambientDust', densidad:.28, velocidad:.03, sizeMin:1, sizeMax:2, alpha:.55 },
        ['low_gravity'], ['lightning'],
        { low_gravity:{ movement:{ acceleration:.76, braking:.60, turnCarrySpeed:1.17, speedMultiplier:1.06 } } },
        { lightning:{ intervalMs:11200, initialDelayMs:9000, maxActive:1 } }
    );
    const SKY_THEME = createVisualThemeV47(
        'sky', 'Cielo',
        { background:'#071a2e', floorA:'#b9e4ff', floorB:'#8fd0f5', floorHighlight:'rgba(255,255,255,.24)', floorShadow:'rgba(27,94,125,.14)', wallBase:'#73a9c8', wallHighlight:'#eefaff', wallShadow:'#4e7e98', wallInset:'#31536b', wallDeep:'#173044', wallAccent:'#f0abfc', blockBase:'#7c83c9', blockHighlight:'#b9bdf5', blockShadow:'#545a9a', blockPattern:'#696fb4', blockCore:'#2d315f', fireOuter:'rgba(244,114,182,.72)', fireMiddle:'#f0abfc', fireCore:'#ffffff', bombBody:'#1e1b4b', bombCap:'#c4b5fd', bombSparkHot:'#fff7ff', bombSparkDanger:'#fb7185', particleImpact:'#e0f2fe', particleFire:'#f0abfc', particleBlock:'#a5b4fc', particleDanger:'#fb7185', ambientDust:'rgba(239,248,255,.74)', lightingMid:'rgba(59,130,246,.07)', lightingDark:'rgba(11,30,55,.44)' },
        { floor:'procedural:cloudstone-floor', wall:'procedural:skycastle-wall', brick:'procedural:air-block', bomb:'procedural:violet-bomb', fire:'procedural:sky-fire' },
        { tipo:'cloud', color:'ambientDust', densidad:.22, velocidad:.08, sizeMin:10, sizeMax:18, alpha:.10 },
        ['low_gravity','wind_push'], ['lightning'],
        { low_gravity:{ movement:{ acceleration:.80, braking:.64, turnCarrySpeed:1.12, speedMultiplier:1.03 } }, wind_push:{ wind:{ cycleMs:3400, gustMs:1000, strength:.52, decay:.74 } } },
        { lightning:{ intervalMs:8400, maxActive:1 } }
    );

    const registry = Object.freeze({ classic: CLASSIC_THEME, winter: WINTER_THEME, autumn: AUTUMN_THEME, spring: SPRING_THEME, summer: SUMMER_THEME, underground: UNDERGROUND_THEME, clouds: CLOUDS_THEME, mountains: MOUNTAINS_THEME, beach: BEACH_THEME, space: SPACE_THEME, sky: SKY_THEME, inferno: INFERNO_THEME });
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
        const summary = global.document?.getElementById?.('theme-selected-summary');
        if (summary) {
            const mechanicsLabel = theme.mechanics.length
                ? ` · ${theme.mechanics.length} MECÁNICA${theme.mechanics.length === 1 ? '' : 'S'}`
                : '';
            const hazardsLabel = theme.hazards.length
                ? ` · ${theme.hazards.length} HAZARD${theme.hazards.length === 1 ? '' : 'S'}`
                : '';
            summary.textContent = `${theme.nombre.toUpperCase()}${mechanicsLabel}${hazardsLabel || (!mechanicsLabel ? ' · SOLO VISUAL' : '')}`;
        }
    }

    function setActiveThemeV46(id, persist = true) {
        if (!registry[id]) return false;
        activeThemeId = id;
        global.BOMBER_THEME = registry[id];
        applyThemeCssTokensV46();
        if (typeof global.invalidateRenderCacheV317 === 'function') global.invalidateRenderCacheV317();
        if (persist) {
            try { global.localStorage.setItem(THEME_STORAGE_V47, id); } catch (_) {}
        }
        updateThemeSelectorV461();
        return true;
    }

    function getThemeOptionsV461() {
        return Object.values(registry).filter(theme => theme.id !== 'classic');
    }

    function initializeThemeV47() {
        let stored = null;
        try { stored = global.localStorage.getItem(THEME_STORAGE_V47); } catch (_) {}
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
    global.initializeThemeV47 = initializeThemeV47;

    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.getTheme = getThemeV46;
    global.BOMBER_ENGINE.getThemeRegistry = () => ({ ...registry });
    global.BOMBER_ENGINE.getThemeId = () => activeThemeId;
    global.BOMBER_ENGINE.getThemeMechanicIds = () => [...getThemeV46().mechanics];
    global.BOMBER_ENGINE.getThemeMetadata = () => {
        const theme = getThemeV46();
        return {
            id: theme.id,
            nombre: theme.nombre,
            type: theme.tipo,
            visualOnly: theme.mechanics.length === 0 && theme.hazards.length === 0,
            mechanics: [...theme.mechanics],
            mechanicConfig: JSON.parse(JSON.stringify(theme.mechanicConfig || {})),
            hazards: [...theme.hazards],
            hazardConfig: JSON.parse(JSON.stringify(theme.hazardConfig || {})),
            levelGeneration: { ...theme.nivelGen },
            enemyPool: [...theme.enemigos.pool],
            powerupPool: [...theme.powerups.pool]
        };
    };

    if (global.document?.readyState === 'loading') {
        global.document.addEventListener('DOMContentLoaded', initializeThemeV47, { once: true });
    } else {
        initializeThemeV47();
    }
})(window);
