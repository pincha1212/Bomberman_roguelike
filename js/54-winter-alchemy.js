// Bomberman Roguelike v6.6.0 — Winter Alchemy: explosion trail
// Vertical slice 1: the bomb explosion becomes ICE in Winter and ICE affects movement.
// The material field owns the chemistry; this module only adapts movement to the
// material under an actor. No Winter rules are added to MECHANICS.
(function installWinterAlchemyV66(global) {
    'use strict';

    const VERSION = '6.6.0';
    const MATERIALS = global.MATERIALS_V60 || {};

    function state() {
        return global.BOMBER_ENGINE?.getState?.() || global.gameState || null;
    }

    function isWinter(s = state()) {
        return String(s?.biomeV49?.id || '') === 'winter';
    }

    function entityCell(entity) {
        const tile = Number(global.BOMBER_ENGINE?.getTileSize?.() || global.TILE_SIZE || 48);
        if (!entity) return null;
        return {
            x: Math.floor((Number(entity.x) + Number(entity.width || 0) / 2) / tile),
            y: Math.floor((Number(entity.y) + Number(entity.height || 0) / 2) / tile)
        };
    }

    function materialAt(entity) {
        const s = state();
        if (!s || !Array.isArray(s.materialResiduesV60)) return null;
        const cell = entityCell(entity);
        if (!cell) return null;
        const found = s.materialResiduesV60.find(r => r && r.x === cell.x && r.y === cell.y);
        return found?.type || null;
    }

    function getMovementModifiers(entity) {
        const base = { acceleration: 1, braking: 1, turnCarry: 1, speedMultiplier: 1, material: null };
        if (!isWinter()) return Object.freeze(base);

        const type = materialAt(entity);
        base.material = type;

        if (type === MATERIALS.ICE) {
            base.braking = 0.55;
            base.acceleration = 0.92;
            base.turnCarry = 1.05;
        } else if (type === MATERIALS.SLICK_ICE) {
            base.braking = 0.28;
            base.acceleration = 0.85;
            base.turnCarry = 1.15;
        }

        return Object.freeze(base);
    }

    function validate() {
        const s = state();
        const errors = [];
        if (!MATERIALS.ICE || !MATERIALS.SLICK_ICE) errors.push('Faltan materiales ICE/SLICK_ICE');
        const defs = global.MATERIAL_DEFS_V60 || {};
        if (!defs[MATERIALS.ICE]) errors.push('Falta definición de ice');
        if (!defs[MATERIALS.SLICK_ICE]) errors.push('Falta definición de slick_ice');
        return {
            valid: errors.length === 0,
            version: VERSION,
            winterActive: isWinter(s),
            material: materialAt(global.BOMBER_ENGINE?.getPlayer?.() || global.player),
            errors
        };
    }

    global.getWinterMaterialAtTileV66 = materialAt;
    global.getWinterMaterialMovementModifiersV66 = getMovementModifiers;
    global.validateWinterAlchemyV66 = validate;

    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.getWinterMaterial = materialAt;
    global.BOMBER_ENGINE.getWinterMaterialMovement = getMovementModifiers;
    global.BOMBER_ENGINE.validateWinterAlchemy = validate;
})(window);
