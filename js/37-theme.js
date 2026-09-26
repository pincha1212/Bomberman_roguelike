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
        hazards: Object.freeze([]),
        nivelGen: Object.freeze({ source: 'v4.4-bomberman-number-generator', densityMin: 0.25, densityMax: 0.72, classicPillarSpacing: 2, symmetry: 'current' }),
        enemigos: Object.freeze({
            pool: Object.freeze(['RASTRERO', 'VOLADOR', 'ESPECIAL']),
            colors: Object.freeze({ RASTRERO: 'enemyRastrero', VOLADOR: 'enemyVolador', ESPECIAL: 'enemyEspecial' })
        }),
        powerups: Object.freeze({ pool: Object.freeze(['SPEED_UP', 'HEALTH_UP', 'SHIELD_UP', 'BOMB_KICK', 'RELIC']) })
    });

    function createVisualThemeV461(id, nombre, paletteOverrides, spriteOverrides, ambientOverrides) {
        return Object.freeze({
            ...CLASSIC_THEME,
            id,
            nombre,
            paleta: Object.freeze({ ...CLASSIC_THEME.paleta, ...paletteOverrides }),
            sprites: Object.freeze({ ...CLASSIC_THEME.sprites, ...spriteOverrides }),
            ambiente: Object.freeze({ ...CLASSIC_THEME.ambiente, ...ambientOverrides }),
            mecanicas: Object.freeze([]),
            hazards: Object.freeze([])
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
            enemyBear: '#e5e7eb',
            enemyObstructor: '#93c5fd',
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
        mecanicas: Object.freeze(['slippery']),
        mechanics: Object.freeze(['slippery']),
        hazards: Object.freeze(['blizzard']),
        enemigos: Object.freeze({
            ...WINTER_THEME_BASE.enemigos,
            pool: Object.freeze(['OSO_NIEVE', 'ESTORBADOR_HIELO']),
            colors: Object.freeze({ OSO_NIEVE: 'enemyBear', ESTORBADOR_HIELO: 'enemyObstructor' })
        }),
        bombEffects: Object.freeze({ heat: Object.freeze({ durationMs: 3000 }) })
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

    const registry = { classic: CLASSIC_THEME, winter: WINTER_THEME, inferno: INFERNO_THEME };
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
        if (summary) summary.textContent = `${theme.nombre.toUpperCase()} · SOLO VISUAL`;
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
        return ['winter', 'inferno'].map(id => registry[id]);
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
            hazards: [...theme.hazards],
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
