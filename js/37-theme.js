// Bomberman Roguelike v4.6 — Theme Foundation
// Arquitectura data-driven. Esta versión registra únicamente el tema clásico actual;
// no introduce cambios de gameplay ni mecánicas nuevas.
(function initThemeFoundationV46(global) {
    'use strict';

    const CLASSIC_THEME = Object.freeze({
        id: 'classic',
        nombre: 'Clásico',

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

        fondo: Object.freeze({
            base: 'background',
            capas: Object.freeze([])
        }),

        ambiente: Object.freeze({
            tipo: 'dust',
            color: 'ambientDust',
            persistente: true
        }),

        audio: Object.freeze({
            musica: null,
            sfx: Object.freeze({
                bomb: 'bomb',
                boom: 'boom',
                pickup: 'pickup',
                hurt: 'hurt',
                exit: 'exit',
                click: 'click',
                trap: 'trap',
                alarm: 'alarm',
                boss: 'boss',
                bossHit: 'bossHit',
                bossRoar: 'bossRoar',
                bossCharge: 'bossCharge',
                bossWave: 'bossWave',
                damageHit: 'damageHit',
                enemyKill: 'enemyKill',
                death: 'death',
                bombReady: 'bombReady'
            })
        }),

        mecanicas: Object.freeze([]),
        hazards: Object.freeze([]),

        nivelGen: Object.freeze({
            source: 'v4.4-bomberman-number-generator',
            densityMin: 0.25,
            densityMax: 0.72,
            classicPillarSpacing: 2,
            symmetry: 'current'
        }),

        enemigos: Object.freeze({
            pool: Object.freeze(['RASTRERO', 'VOLADOR', 'ESPECIAL']),
            colors: Object.freeze({
                RASTRERO: 'enemyRastrero',
                VOLADOR: 'enemyVolador',
                ESPECIAL: 'enemyEspecial'
            })
        }),

        powerups: Object.freeze({
            pool: Object.freeze([
                'BOMB_UP',
                'FIRE_UP',
                'SPEED_UP',
                'HEALTH_UP',
                'SHIELD_UP',
                'RELIC'
            ])
        })
    });

    const registry = { classic: CLASSIC_THEME };
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

    function registerThemeV46(theme) {
        if (!theme || !theme.id || !theme.paleta || !theme.sprites) return false;
        registry[theme.id] = Object.freeze(theme);
        return true;
    }

    function setActiveThemeV46(id) {
        if (!registry[id]) return false;
        activeThemeId = id;
        return true;
    }

    function applyThemeCssTokensV46() {
        if (!global.document?.documentElement) return false;
        const root = global.document.documentElement;
        const palette = getThemePaletteV46();
        root.style.setProperty('--theme-background', palette.background);
        root.style.setProperty('--theme-floor-a', palette.floorA);
        root.style.setProperty('--theme-floor-b', palette.floorB);
        root.style.setProperty('--theme-accent', palette.wallAccent);
        return true;
    }

    global.BOMBER_THEME = CLASSIC_THEME;
    global.THEMES_V46 = registry;
    global.getThemeV46 = getThemeV46;
    global.getThemePaletteV46 = getThemePaletteV46;
    global.themeColorV46 = themeColorV46;
    global.themeSpriteV46 = themeSpriteV46;
    global.themeAudioV46 = themeAudioV46;
    global.registerThemeV46 = registerThemeV46;
    global.setActiveThemeV46 = setActiveThemeV46;
    global.applyThemeCssTokensV46 = applyThemeCssTokensV46;

    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.getTheme = getThemeV46;
    global.BOMBER_ENGINE.getThemeRegistry = () => ({ ...registry });
    global.BOMBER_ENGINE.getThemeId = () => activeThemeId;
    global.BOMBER_ENGINE.getThemeMetadata = () => {
        const theme = getThemeV46();
        return {
            id: theme.id,
            nombre: theme.nombre,
            mechanics: [...theme.mecanicas],
            hazards: [...theme.hazards],
            levelGeneration: { ...theme.nivelGen },
            enemyPool: [...theme.enemigos.pool],
            powerupPool: [...theme.powerups.pool]
        };
    };

    applyThemeCssTokensV46();
})(window);
