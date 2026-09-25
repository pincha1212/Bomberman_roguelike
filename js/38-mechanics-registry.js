// Bomberman Roguelike v5.1 — Mechanics Registry
// Theme declara IDs. Este módulo resuelve esos IDs a comportamiento reutilizable.
// Ninguna mecánica conoce ni depende de un tema concreto.
(function initMechanicsRegistryV47(global) {
    'use strict';

    const DEFAULT_MOVEMENT = Object.freeze({
        acceleration: 1,
        braking: 1,
        turnCarrySpeed: 1,
        speedMultiplier: 1
    });

    const MECHANICS = Object.freeze({
        slippery: Object.freeze({
            id: 'slippery',
            nombre: 'Suelo resbaladizo',
            category: 'movement',
            movement: Object.freeze({ acceleration: 0.92, braking: 0.38, turnCarrySpeed: 1.08, speedMultiplier: 1 })
        }),
        wind_push: Object.freeze({
            id: 'wind_push',
            nombre: 'Viento',
            category: 'environment',
            wind: Object.freeze({ cycleMs: 2800, gustMs: 900, strength: 0.72, decay: 0.68 })
        }),
        darkness: Object.freeze({
            id: 'darkness',
            nombre: 'Oscuridad',
            category: 'visibility',
            visibility: Object.freeze({ radius: 145, midStop: 0.56, midAlpha: 0.28, outerAlpha: 0.84 })
        }),
        low_gravity: Object.freeze({
            id: 'low_gravity',
            nombre: 'Baja gravedad',
            category: 'movement',
            movement: Object.freeze({ acceleration: 0.78, braking: 0.62, turnCarrySpeed: 1.15, speedMultiplier: 1.04 })
        }),
        sand_drift: Object.freeze({
            id: 'sand_drift',
            nombre: 'Deriva de arena',
            category: 'movement',
            movement: Object.freeze({ acceleration: 0.88, braking: 0.72, turnCarrySpeed: 1.03, speedMultiplier: 0.94 })
        }),
        water_drag: Object.freeze({
            id: 'water_drag',
            nombre: 'Arrastre de agua',
            category: 'movement',
            movement: Object.freeze({ acceleration: 0.82, braking: 1.18, turnCarrySpeed: 0.96, speedMultiplier: 0.86 })
        }),
        muddy: Object.freeze({
            id: 'muddy',
            nombre: 'Terreno pesado',
            category: 'movement',
            movement: Object.freeze({ acceleration: 0.72, braking: 1.25, turnCarrySpeed: 0.82, speedMultiplier: 0.82 })
        })
    });

    function mergeConfig(base, override) {
        if (!base || typeof base !== 'object') return override && typeof override === 'object' ? { ...override } : {};
        if (!override || typeof override !== 'object') return { ...base };
        const result = { ...base };
        for (const [key, value] of Object.entries(override)) {
            if (value && typeof value === 'object' && !Array.isArray(value) && result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])) result[key] = mergeConfig(result[key], value);
            else result[key] = value;
        }
        return result;
    }

    function getMechanicConfig(id) {
        const theme = typeof global.getThemeV46 === 'function' ? global.getThemeV46() : null;
        const themeConfig = theme?.mechanicConfig?.[id] || {};
        const stageConfig = (typeof gameState !== 'undefined' ? gameState.biomeV49?.stageConfig?.mechanics?.[id] : null) || {};
        return mergeConfig(themeConfig, stageConfig);
    }

    function getActiveMechanicIds() {
        const theme = typeof global.getThemeV46 === 'function' ? global.getThemeV46() : null;
        if (!theme || !Array.isArray(theme.mechanics)) return [];
        return theme.mechanics.filter(id => !!MECHANICS[id]);
    }

    function getActiveMechanics() {
        return getActiveMechanicIds().map(id => MECHANICS[id]);
    }

    function getMovementModifiersV47() {
        const result = { ...DEFAULT_MOVEMENT };

        for (const id of getActiveMechanicIds()) {
            const movement = MECHANICS[id].movement;
            if (!movement) continue;
            const configured = getMechanicConfig(id).movement || getMechanicConfig(id);
            result.acceleration *= Number.isFinite(configured.acceleration) ? configured.acceleration : (Number.isFinite(movement.acceleration) ? movement.acceleration : 1);
            result.braking *= Number.isFinite(configured.braking) ? configured.braking : (Number.isFinite(movement.braking) ? movement.braking : 1);
            result.turnCarrySpeed *= Number.isFinite(configured.turnCarrySpeed) ? configured.turnCarrySpeed : (Number.isFinite(movement.turnCarrySpeed) ? movement.turnCarrySpeed : 1);
            result.speedMultiplier *= Number.isFinite(configured.speedMultiplier) ? configured.speedMultiplier : (Number.isFinite(movement.speedMultiplier) ? movement.speedMultiplier : 1);
        }

        return Object.freeze(result);
    }

    function getWindPushV471() {
        const mechanic = MECHANICS.wind_push;
        if (!getActiveMechanicIds().includes('wind_push')) {
            return Object.freeze({ active: false, axis: null, dir: 0, strength: 0 });
        }
        const configured = { ...mechanic.wind, ...(getMechanicConfig('wind_push').wind || getMechanicConfig('wind_push')) };

        const state = global.BOMBER_ENGINE?.getState?.();
        const roomTime = Math.max(0, Number(state?.roomTime) || 0);
        const cycleMs = Math.max(100, Number(configured.cycleMs) || mechanic.wind.cycleMs);
        const gustMs = Math.min(cycleMs, Math.max(0, Number(configured.gustMs) || mechanic.wind.gustMs));
        const phase = roomTime % cycleMs;
        if (phase >= gustMs) {
            return Object.freeze({ active: false, axis: null, dir: 0, strength: 0 });
        }

        const step = Math.floor(roomTime / cycleMs) % 4;
        const directions = [
            { axis: 'x', dir: 1 },
            { axis: 'y', dir: 1 },
            { axis: 'x', dir: -1 },
            { axis: 'y', dir: -1 }
        ];
        const direction = directions[step];
        const progress = phase / gustMs;
        const envelope = progress < 0.35
            ? progress / 0.35
            : Math.max(0, 1 - (progress - 0.35) / 0.65);
        const configuredStrength = Number(configured.strength);
        const configuredDecay = Number(configured.decay);
        const baseStrength = Number.isFinite(configuredStrength) ? configuredStrength : mechanic.wind.strength;
        const decay = Number.isFinite(configuredDecay) ? configuredDecay : mechanic.wind.decay;
        const strength = baseStrength * (decay + (1 - decay) * envelope);

        return Object.freeze({
            active: strength > 0.001,
            axis: direction.axis,
            dir: direction.dir,
            strength
        });
    }

    function getDarknessProfileV471() {
        const mechanic = MECHANICS.darkness;
        const active = getActiveMechanicIds().includes('darkness');
        if (!active) return Object.freeze({ enabled: false });
        const configured = { ...mechanic.visibility, ...(getMechanicConfig('darkness').visibility || getMechanicConfig('darkness')) };
        return Object.freeze({
            enabled: true,
            radius: Number(configured.radius) || mechanic.visibility.radius,
            midStop: Number(configured.midStop) || mechanic.visibility.midStop,
            midAlpha: Number.isFinite(Number(configured.midAlpha)) ? Number(configured.midAlpha) : mechanic.visibility.midAlpha,
            outerAlpha: Number.isFinite(Number(configured.outerAlpha)) ? Number(configured.outerAlpha) : mechanic.visibility.outerAlpha
        });
    }

    function getMechanicsMetadataV47() {
        return getActiveMechanics().map(mechanic => ({
            id: mechanic.id,
            nombre: mechanic.nombre,
            category: mechanic.category
        }));
    }

    global.MECHANICS = MECHANICS;
    global.getActiveMechanicIdsV47 = getActiveMechanicIds;
    global.getActiveMechanicsV47 = getActiveMechanics;
    global.getMovementModifiersV47 = getMovementModifiersV47;
    global.getMechanicConfigV49 = getMechanicConfig;
    global.getWindPushV471 = getWindPushV471;
    global.getDarknessProfileV471 = getDarknessProfileV471;

    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.getMechanicsRegistry = () => ({ ...MECHANICS });
    global.BOMBER_ENGINE.getActiveMechanicIds = getActiveMechanicIds;
    global.BOMBER_ENGINE.getActiveMechanics = getMechanicsMetadataV47;
    global.BOMBER_ENGINE.getMovementModifiers = getMovementModifiersV47;
    global.BOMBER_ENGINE.getMechanicConfig = getMechanicConfig;
    global.BOMBER_ENGINE.getWindPush = getWindPushV471;
    global.BOMBER_ENGINE.getDarknessProfile = getDarknessProfileV471;

})(window);
