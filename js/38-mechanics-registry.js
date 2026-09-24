// Bomberman Roguelike v4.7.1 — Mechanics Registry
// Theme declara IDs. Este módulo resuelve esos IDs a comportamiento reutilizable.
// Ninguna mecánica conoce ni depende de un tema concreto.
(function initMechanicsRegistryV47(global) {
    'use strict';

    const DEFAULT_MOVEMENT = Object.freeze({
        acceleration: 1,
        braking: 1,
        turnCarrySpeed: 1
    });

    const MECHANICS = Object.freeze({
        slippery: Object.freeze({
            id: 'slippery',
            nombre: 'Suelo resbaladizo',
            category: 'movement',
            movement: Object.freeze({
                // Menor frenado = conserva velocidad al soltar la dirección.
                braking: 0.38,
                // Conserva más inercia al entrar en un giro cardinal.
                turnCarrySpeed: 1.08,
                // La aceleración baja ligeramente para que el deslizamiento
                // provenga de la inercia y no de una velocidad artificial.
                acceleration: 0.92
            })
        }),
        wind_push: Object.freeze({
            id: 'wind_push',
            nombre: 'Viento',
            category: 'environment',
            wind: Object.freeze({
                cycleMs: 2800,
                gustMs: 900,
                strength: 0.72,
                decay: 0.68
            })
        }),
        darkness: Object.freeze({
            id: 'darkness',
            nombre: 'Oscuridad',
            category: 'visibility',
            visibility: Object.freeze({
                radius: 145,
                midStop: 0.56,
                midAlpha: 0.28,
                outerAlpha: 0.84
            })
        })
    });

    function getActiveMechanicIds() {
        const theme = typeof global.getThemeV46 === 'function' ? global.getThemeV46() : null;
        if (!theme || !Array.isArray(theme.mechanics)) return [];
        return theme.mechanics.filter(id => !!MECHANICS[id]);
    }

    function getActiveMechanics() {
        return getActiveMechanicIds().map(id => MECHANICS[id]);
    }

    function getMovementModifiersV47() {
        const result = {
            acceleration: DEFAULT_MOVEMENT.acceleration,
            braking: DEFAULT_MOVEMENT.braking,
            turnCarrySpeed: DEFAULT_MOVEMENT.turnCarrySpeed
        };

        for (const id of getActiveMechanicIds()) {
            const movement = MECHANICS[id].movement;
            if (!movement) continue;
            result.acceleration *= Number.isFinite(movement.acceleration) ? movement.acceleration : 1;
            result.braking *= Number.isFinite(movement.braking) ? movement.braking : 1;
            result.turnCarrySpeed *= Number.isFinite(movement.turnCarrySpeed) ? movement.turnCarrySpeed : 1;
        }

        return Object.freeze(result);
    }

    function getWindPushV471() {
        const mechanic = MECHANICS.wind_push;
        if (!getActiveMechanicIds().includes('wind_push')) {
            return Object.freeze({ active: false, axis: null, dir: 0, strength: 0 });
        }

        const state = global.BOMBER_ENGINE?.getState?.();
        const roomTime = Math.max(0, Number(state?.roomTime) || 0);
        const cycleMs = Math.max(100, mechanic.wind.cycleMs);
        const gustMs = Math.min(cycleMs, Math.max(0, mechanic.wind.gustMs));
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
        const strength = mechanic.wind.strength * (mechanic.wind.decay + (1 - mechanic.wind.decay) * envelope);

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
        return Object.freeze({
            enabled: true,
            radius: mechanic.visibility.radius,
            midStop: mechanic.visibility.midStop,
            midAlpha: mechanic.visibility.midAlpha,
            outerAlpha: mechanic.visibility.outerAlpha
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
    global.getWindPushV471 = getWindPushV471;
    global.getDarknessProfileV471 = getDarknessProfileV471;

    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.getMechanicsRegistry = () => ({ ...MECHANICS });
    global.BOMBER_ENGINE.getActiveMechanicIds = getActiveMechanicIds;
    global.BOMBER_ENGINE.getActiveMechanics = getMechanicsMetadataV47;
    global.BOMBER_ENGINE.getMovementModifiers = getMovementModifiersV47;
    global.BOMBER_ENGINE.getWindPush = getWindPushV471;
    global.BOMBER_ENGINE.getDarknessProfile = getDarknessProfileV471;

})(window);
