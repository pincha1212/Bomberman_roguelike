// Bomberman Roguelike v6.15.0 — Especies por bioma.
// Cada variante combina la skin existente con un único override pequeño.
// No crea tipos de enemigo ni cambia el arquetipo de IA.
(function installBiomeEnemySpeciesV615(global) {
    'use strict';

    const RULES = Object.freeze({
        ice_resistance: Object.freeze({ id:'ice_resistance', label:'Resistencia al hielo', frostDurationMultiplier:0.45 }),
        leaf_camouflage: Object.freeze({ id:'leaf_camouflage', label:'Camuflaje leve en hojas', coveredVisionTiles:-2 }),
        vegetation_regen: Object.freeze({ id:'vegetation_regen', label:'Regeneración leve en vegetación', regenPerSecond:0.55, regenMax:3 }),
        heat_resistance: Object.freeze({ id:'heat_resistance', label:'Resistencia al calor', heatDurationMultiplier:0.45 }),
        dark_vision: Object.freeze({ id:'dark_vision', label:'Visión en oscuridad', visionBonusTiles:2 }),
        floatation: Object.freeze({ id:'floatation', label:'Flotación', speedMultiplier:1.04 }),
        stability: Object.freeze({ id:'stability', label:'Estabilidad / resistencia a empujones', pushMultiplier:0.35 }),
        terrain_mobility: Object.freeze({ id:'terrain_mobility', label:'Movimiento mejor en agua/arena', waterSpeedMultiplier:1.18 }),
        environment_immunity: Object.freeze({ id:'environment_immunity', label:'Ignora penalización ambiental', ignoreEnvironmentalMovement:true }),
        high_altitude_speed: Object.freeze({ id:'high_altitude_speed', label:'+Velocidad en alturas', speedMultiplier:1.08, highAltitudeTopRatio:0.34 }),
        lava_immunity: Object.freeze({ id:'lava_immunity', label:'Sin penalización por lava', lavaSpeedMultiplier:1 })
    });

    const BIOMES = Object.freeze([
        'winter','autumn','spring','summer','underground','clouds','mountains','beach','space','sky','inferno'
    ]);
    const TYPE_KEYS = Object.freeze(['RASTRERO','VOLADOR','ESPECIAL']);

    function currentBiomeId() {
        return String(global.gameState?.biomeOverrideV49 || global.gameState?.biomeV49?.id || global.getThemeV46?.()?.id || 'classic');
    }

    function getTypeKey(enemyOrType) {
        const type = enemyOrType?.type || enemyOrType;
        if ((typeof ENEMY_TYPES !== 'undefined' && type === ENEMY_TYPES.VOLADOR) || type?.name === 'Volador') return 'VOLADOR';
        if ((typeof ENEMY_TYPES !== 'undefined' && type === ENEMY_TYPES.ESPECIAL) || type?.name === 'Especial') return 'ESPECIAL';
        return 'RASTRERO';
    }

    function getProfile(enemyOrType) {
        const profile = typeof global.getEnemySkinV614 === 'function'
            ? global.getEnemySkinV614(enemyOrType)
            : null;
        const biomeId = currentBiomeId();
        const typeKey = getTypeKey(enemyOrType);
        if (profile) return Object.freeze({ ...profile, biomeId, typeKey, rule: RULES[profile.ruleId] || null });
        return Object.freeze({
            biomeId,
            typeKey,
            name: (typeof ENEMY_TYPES !== 'undefined' ? ENEMY_TYPES?.[typeKey]?.name : null) || typeKey,
            ruleId: 'none',
            rule: null
        });
    }

    function ruleId(enemyOrType) { return String(getProfile(enemyOrType).ruleId || 'none'); }
    function rule(enemyOrType) { return RULES[ruleId(enemyOrType)] || null; }

    function isLeafCover(enemy) {
        if (!enemy || currentBiomeId() !== 'autumn') return false;
        const cell = typeof global.gridCurrentTile === 'function' ? global.gridCurrentTile(enemy, 'enemy') : null;
        if (!cell || !global.gameState?.grid) return false;
        const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
        return dirs.some(([dx,dy]) => global.gameState.grid[cell.y + dy]?.[cell.x + dx] === global.TYPES?.BLOCK);
    }

    function isHighAltitude(enemy) {
        if (!enemy || currentBiomeId() !== 'sky') return false;
        const h = Math.max(1, Number(global.gameState?.gridHeight) || 1);
        const cy = (Number(enemy.y) + Number(enemy.height || 0) / 2) / Number(global.TILE_SIZE || 48);
        return cy <= Math.max(1, h * 0.34);
    }

    function getMovementMultiplier(enemy) {
        const r = rule(enemy);
        if (!r) return 1;
        if (r.id === 'floatation') return r.speedMultiplier;
        if (r.id === 'high_altitude_speed' && isHighAltitude(enemy)) return r.speedMultiplier;
        if (r.id === 'terrain_mobility') {
            const liquid = typeof global.getBiomeLiquidPlayerEffectV631 === 'function' ? global.getBiomeLiquidPlayerEffectV631(enemy) : null;
            if (liquid?.liquidId === 'sea') return r.waterSpeedMultiplier;
        }
        return 1;
    }

    function getEnvironmentalMovementMultiplier(enemy) {
        const r = rule(enemy);
        if (r?.ignoreEnvironmentalMovement) return 1;
        let multiplier = 1;
        const material = typeof global.getMaterialMovementModifiersV67 === 'function' ? global.getMaterialMovementModifiersV67(enemy) : null;
        if (material) multiplier *= Math.max(0.35, Number(material.speedMultiplier) || 1);
        const liquid = typeof global.getBiomeLiquidPlayerEffectV631 === 'function' ? global.getBiomeLiquidPlayerEffectV631(enemy) : null;
        if (liquid?.playerSpeed) {
            multiplier *= Math.max(0.35, Number(liquid.playerSpeed) || 1);
            if (r?.id === 'lava_immunity' && liquid.liquidId === 'lava') {
                multiplier /= Math.max(0.35, Number(liquid.playerSpeed) || 1);
                multiplier *= r.lavaSpeedMultiplier;
            }
        }
        return multiplier;
    }

    function getVisionRangeTiles(enemy) {
        const r = rule(enemy);
        if (r?.id === 'leaf_camouflage' && isLeafCover(enemy)) return Math.max(1, 9 + r.coveredVisionTiles);
        if (r?.id === 'dark_vision') return 9 + r.visionBonusTiles;
        return 9;
    }

    function getEffectDurationMultiplier(enemy, effectId) {
        const r = rule(enemy);
        if (r?.id === 'ice_resistance' && String(effectId) === 'frost') return r.frostDurationMultiplier;
        if (r?.id === 'heat_resistance' && String(effectId) === 'heat') return r.heatDurationMultiplier;
        return 1;
    }

    function isInVegetation(enemy) {
        if (!enemy || currentBiomeId() !== 'spring') return false;
        const cell = typeof global.gridCurrentTile === 'function' ? global.gridCurrentTile(enemy, 'enemy') : null;
        if (!cell || !global.gameState?.grid) return false;
        const dirs = [[0,0],[1,0],[-1,0],[0,1],[0,-1]];
        return dirs.some(([dx,dy]) => global.gameState.grid[cell.y + dy]?.[cell.x + dx] === global.TYPES?.BLOCK);
    }

    function updateVegetationRegen(enemy, dt) {
        const r = rule(enemy);
        if (r?.id !== 'vegetation_regen' || !isInVegetation(enemy)) return;
        if (!Number.isFinite(Number(enemy.__effectHealthV64))) return;
        enemy.__speciesRegenAccumulatorV615 = Math.max(0, Number(enemy.__speciesRegenAccumulatorV615) || 0) + Math.max(0, Number(dt) || 0) / 1000 * r.regenPerSecond;
        if (enemy.__speciesRegenAccumulatorV615 < 1) return;
        enemy.__effectHealthV64 = Math.min(r.regenMax, Number(enemy.__effectHealthV64) + enemy.__speciesRegenAccumulatorV615);
        enemy.__speciesRegenAccumulatorV615 = 0;
    }

    function getPushMultiplier(enemy) {
        return rule(enemy)?.id === 'stability' ? RULES.stability.pushMultiplier : 1;
    }

    function snapshot() {
        const result = {};
        for (const biomeId of BIOMES) {
            result[biomeId] = {};
            const profiles = global.ENEMY_SKIN_PROFILES_V614?.[biomeId] || {};
            for (const typeKey of TYPE_KEYS) {
                const p = profiles[typeKey];
                if (!p) continue;
                result[biomeId][typeKey] = Object.freeze({ name:p.name, ruleId:p.ruleId, ruleLabel:RULES[p.ruleId]?.label || '' });
            }
        }
        return Object.freeze(result);
    }

    global.BIOME_ENEMY_SPECIES_RULES_V615 = RULES;
    global.getEnemyBiomeSpeciesProfileV615 = getProfile;
    global.getEnemyBiomeSpeciesRuleV615 = rule;
    global.getEnemyBiomeSpeciesRuleIdV615 = ruleId;
    global.getEnemyBiomeSpeciesMovementMultiplierV615 = getMovementMultiplier;
    global.getEnemyBiomeSpeciesEnvironmentMovementMultiplierV615 = getEnvironmentalMovementMultiplier;
    global.getEnemyBiomeSpeciesVisionRangeV615 = getVisionRangeTiles;
    global.getEnemyBiomeSpeciesEffectDurationMultiplierV615 = getEffectDurationMultiplier;
    global.getEnemyBiomeSpeciesPushMultiplierV615 = getPushMultiplier;
    global.updateEnemyBiomeSpeciesV615 = updateVegetationRegen;
    global.isEnemyBiomeSpeciesLeafCoverV615 = isLeafCover;
    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.getEnemySpecies = getProfile;
    global.BOMBER_ENGINE.getEnemySpeciesRules = () => ({ ...RULES });
    global.BOMBER_ENGINE.getEnemySpeciesTable = snapshot;
})(window);
