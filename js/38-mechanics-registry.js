// Bomberman Roguelike v4.7 — Mechanics Registry
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

    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.getMechanicsRegistry = () => ({ ...MECHANICS });
    global.BOMBER_ENGINE.getActiveMechanicIds = getActiveMechanicIds;
    global.BOMBER_ENGINE.getActiveMechanics = getMechanicsMetadataV47;
    global.BOMBER_ENGINE.getMovementModifiers = getMovementModifiersV47;

})(window);
