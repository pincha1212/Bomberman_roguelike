// BOMBERMAN ROGUELIKE v6.26.0 — Catálogo unificado de especies por bioma.
// Una especie es: identidad + bioma + arquetipo base + regla ambiental pequeña.
// No crea un renderer ni una IA paralela.
(function installBiomeEnemySpeciesV626(global) {
    'use strict';

    const RULES = Object.freeze({
        ice_resistance: Object.freeze({ id: 'ice_resistance', label: 'Resistencia al hielo', frostDurationMultiplier: 0.45 }),
        leaf_camouflage: Object.freeze({ id: 'leaf_camouflage', label: 'Camuflaje leve en hojas', coveredVisionTiles: -2 }),
        vegetation_regen: Object.freeze({ id: 'vegetation_regen', label: 'Regeneración leve en vegetación', regenPerSecond: 0.55, regenMax: 3 }),
        heat_resistance: Object.freeze({ id: 'heat_resistance', label: 'Resistencia al calor', heatDurationMultiplier: 0.45 }),
        dark_vision: Object.freeze({ id: 'dark_vision', label: 'Visión en oscuridad', visionBonusTiles: 2 }),
        floatation: Object.freeze({ id: 'floatation', label: 'Flotación', speedMultiplier: 1.04 }),
        stability: Object.freeze({ id: 'stability', label: 'Estabilidad / resistencia a empujones', pushMultiplier: 0.35 }),
        terrain_mobility: Object.freeze({ id: 'terrain_mobility', label: 'Movimiento mejor en agua/arena', waterSpeedMultiplier: 1.18 }),
        environment_immunity: Object.freeze({ id: 'environment_immunity', label: 'Ignora penalización ambiental', ignoreEnvironmentalMovement: true }),
        high_altitude_speed: Object.freeze({ id: 'high_altitude_speed', label: '+Velocidad en alturas', speedMultiplier: 1.08, highAltitudeTopRatio: 0.34 }),
        lava_immunity: Object.freeze({ id: 'lava_immunity', label: 'Sin penalización por lava', lavaSpeedMultiplier: 1 })
    });

    const TYPE_KEYS = Object.freeze(['RASTRERO', 'VOLADOR', 'ESPECIAL']);
    const BIOME_IDS = Object.freeze([
        'winter', 'autumn', 'spring', 'summer', 'underground',
        'clouds', 'mountains', 'beach', 'space', 'sky', 'inferno'
    ]);

    // 11 biomas × 3 especies = 33 especies reales.
    // preferredAi es una preferencia de identidad; el arquetipo sigue siendo
    // el contrato físico/base que consume el resto del gameplay.
    const SPECIES_SEED = Object.freeze({
        winter: {
            RASTRERO: { id: 'winter_ice_wolf', name: 'Lobo de hielo', ruleId: 'ice_resistance', preferredAi: 'chaser', abilityId: 'ice_trail' },
            VOLADOR: { id: 'winter_arctic_owl', name: 'Búho ártico', ruleId: 'ice_resistance', preferredAi: 'flyer' },
            ESPECIAL: { id: 'winter_snow_bear', name: 'Oso de nieve', ruleId: 'ice_resistance', preferredAi: 'aggressive' }
        },
        autumn: {
            RASTRERO: { id: 'autumn_boar', name: 'Jabalí', ruleId: 'leaf_camouflage', preferredAi: 'patroller', abilityId: 'boar_charge' },
            VOLADOR: { id: 'autumn_crow', name: 'Cuervo', ruleId: 'leaf_camouflage', preferredAi: 'flyer' },
            ESPECIAL: { id: 'autumn_scarecrow', name: 'Espantapájaros', ruleId: 'leaf_camouflage', preferredAi: 'aggressive' }
        },
        spring: {
            RASTRERO: { id: 'spring_frog', name: 'Rana', ruleId: 'vegetation_regen', preferredAi: 'evasive', abilityId: 'frog_leap' },
            VOLADOR: { id: 'spring_bee', name: 'Abeja', ruleId: 'vegetation_regen', preferredAi: 'flyer' },
            ESPECIAL: { id: 'spring_carnivorous_plant', name: 'Planta carnívora', ruleId: 'vegetation_regen', preferredAi: 'aggressive' }
        },
        summer: {
            RASTRERO: { id: 'summer_lizard', name: 'Lagarto', ruleId: 'heat_resistance', preferredAi: 'chaser', abilityId: 'lizard_camouflage' },
            VOLADOR: { id: 'summer_seagull', name: 'Gaviota', ruleId: 'heat_resistance', preferredAi: 'flyer' },
            ESPECIAL: { id: 'summer_giant_beetle', name: 'Escarabajo gigante', ruleId: 'heat_resistance', preferredAi: 'aggressive' }
        },
        underground: {
            RASTRERO: { id: 'underground_mole', name: 'Topo', ruleId: 'dark_vision', preferredAi: 'patroller', abilityId: 'mole_burrow' },
            VOLADOR: { id: 'underground_bat', name: 'Murciélago', ruleId: 'dark_vision', preferredAi: 'flyer' },
            ESPECIAL: { id: 'underground_cave_worm', name: 'Gusano cavernario', ruleId: 'dark_vision', preferredAi: 'aggressive' }
        },
        clouds: {
            RASTRERO: { id: 'clouds_cloud_creature', name: 'Criatura de nube', ruleId: 'floatation', preferredAi: 'evasive', abilityId: 'cloud_ethereal' },
            VOLADOR: { id: 'clouds_celestial_bird', name: 'Ave celestial', ruleId: 'floatation', preferredAi: 'flyer' },
            ESPECIAL: { id: 'clouds_storm_elemental', name: 'Elemental de tormenta', ruleId: 'floatation', preferredAi: 'aggressive' }
        },
        mountains: {
            RASTRERO: { id: 'mountains_mountain_goat', name: 'Cabra montés', ruleId: 'stability', preferredAi: 'chaser', abilityId: 'goat_stomp' },
            VOLADOR: { id: 'mountains_eagle', name: 'Águila', ruleId: 'stability', preferredAi: 'flyer' },
            ESPECIAL: { id: 'mountains_stone_golem', name: 'Golem de piedra', ruleId: 'stability', preferredAi: 'aggressive' }
        },
        beach: {
            RASTRERO: { id: 'beach_crab', name: 'Cangrejo', ruleId: 'terrain_mobility', preferredAi: 'patroller', abilityId: 'crab_shell' },
            VOLADOR: { id: 'beach_coastal_gull', name: 'Gaviota costera', ruleId: 'terrain_mobility', preferredAi: 'flyer' },
            ESPECIAL: { id: 'beach_octopus', name: 'Pulpo', ruleId: 'terrain_mobility', preferredAi: 'aggressive' }
        },
        space: {
            RASTRERO: { id: 'space_alien_insect', name: 'Insecto alienígena', ruleId: 'environment_immunity', preferredAi: 'evasive', abilityId: 'alien_acid' },
            VOLADOR: { id: 'space_organic_drone', name: 'Dron orgánico', ruleId: 'environment_immunity', preferredAi: 'flyer' },
            ESPECIAL: { id: 'space_alien_creature', name: 'Criatura extraterrestre', ruleId: 'environment_immunity', preferredAi: 'aggressive' }
        },
        sky: {
            RASTRERO: { id: 'sky_celestial_being', name: 'Querubín', ruleId: 'high_altitude_speed', preferredAi: 'chaser', abilityId: 'cherub_aura' },
            VOLADOR: { id: 'sky_luminous_bird', name: 'Ave luminosa', ruleId: 'high_altitude_speed', preferredAi: 'flyer' },
            ESPECIAL: { id: 'sky_guardian', name: 'Guardián celeste', ruleId: 'high_altitude_speed', preferredAi: 'aggressive' }
        },
        inferno: {
            RASTRERO: { id: 'inferno_hellhound', name: 'Sabueso infernal', ruleId: 'lava_immunity', preferredAi: 'chaser', abilityId: 'hellhound_ember' },
            VOLADOR: { id: 'inferno_flying_demon', name: 'Demonio alado', ruleId: 'lava_immunity', preferredAi: 'flyer' },
            ESPECIAL: { id: 'inferno_imp', name: 'Diablillo', ruleId: 'lava_immunity', preferredAi: 'aggressive' }
        }
    });

    function stateObject() {
        return (typeof gameState !== 'undefined' && gameState)
            ? gameState
            : (global.BOMBER_ENGINE?.getState?.() || {});
    }

    function currentBiomeId(enemy = null) {
        const state = stateObject();
        const persisted = enemy?.biomeSpawnIdV626 || enemy?.biomeSpawnIdV625;
        if (persisted && SPECIES_SEED[persisted]) return String(persisted);
        const direct = state.biomeOverrideV49 || state.biomeV49?.id;
        if (direct && SPECIES_SEED[direct]) return String(direct);
        if (typeof global.getBiomeForDepthV49 === 'function') {
            const meta = global.getBiomeForDepthV49(state.level || 1);
            if (meta?.id && SPECIES_SEED[meta.id]) return String(meta.id);
        }
        return 'winter';
    }

    function getTypeKey(enemyOrType) {
        const type = enemyOrType?.type || enemyOrType;
        const map = (typeof ENEMY_TYPES !== 'undefined' && ENEMY_TYPES) ? ENEMY_TYPES : null;
        if (map && type === map.VOLADOR) return 'VOLADOR';
        if (map && type === map.ESPECIAL) return 'ESPECIAL';
        if (type?.canFly) return 'VOLADOR';
        if (type?.name === 'Especial') return 'ESPECIAL';
        return 'RASTRERO';
    }

    function mergeVisualProfile(biomeId, typeKey, seed) {
        const skin = global.ENEMY_SKIN_PROFILES_V614?.[biomeId]?.[typeKey]
            || global.ENEMY_SKIN_PROFILES_V614?.classic?.[typeKey]
            || {};
        return {
            ...seed,
            biomeId,
            typeKey,
            rule: RULES[seed.ruleId] || null,
            body: skin.body,
            shade: skin.shade,
            accent: skin.accent,
            motif: skin.motif
        };
    }

    function getProfile(enemyOrType) {
        const enemy = enemyOrType?.type ? enemyOrType : null;
        const biomeId = currentBiomeId(enemy);
        const typeKey = enemy?.speciesIdV626
            ? (SPECIES_SEED[biomeId] && Object.values(SPECIES_SEED[biomeId]).some(item => item.id === enemy.speciesIdV626)
                ? TYPE_KEYS.find(key => SPECIES_SEED[biomeId][key].id === enemy.speciesIdV626) || getTypeKey(enemyOrType)
                : getTypeKey(enemyOrType))
            : getTypeKey(enemyOrType);
        const seed = SPECIES_SEED[biomeId]?.[typeKey] || SPECIES_SEED.winter.RASTRERO;
        return Object.freeze(mergeVisualProfile(biomeId, typeKey, seed));
    }

    function getSpeciesDefinitionV626(biomeId, typeKey) {
        const id = SPECIES_SEED[biomeId]?.[typeKey] ? biomeId : 'winter';
        const key = SPECIES_SEED[id]?.[typeKey] ? typeKey : 'RASTRERO';
        return Object.freeze(mergeVisualProfile(id, key, SPECIES_SEED[id][key]));
    }

    function ruleId(enemyOrType) { return String(getProfile(enemyOrType).ruleId || 'none'); }
    function rule(enemyOrType) { return RULES[ruleId(enemyOrType)] || null; }

    function isLeafCover(enemy) {
        if (!enemy || currentBiomeId(enemy) !== 'autumn') return false;
        const cell = typeof global.gridCurrentTile === 'function' ? global.gridCurrentTile(enemy, 'enemy') : null;
        const state = stateObject();
        if (!cell || !state.grid) return false;
        const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
        return dirs.some(([dx, dy]) => state.grid[cell.y + dy]?.[cell.x + dx] === global.TYPES?.BLOCK);
    }

    function isHighAltitude(enemy) {
        if (!enemy || currentBiomeId(enemy) !== 'sky') return false;
        const state = stateObject();
        const h = Math.max(1, Number(state.gridHeight) || 1);
        const cy = (Number(enemy.y) + Number(enemy.height || 0) / 2) / Number(typeof TILE_SIZE !== 'undefined' ? TILE_SIZE : 48);
        return cy <= Math.max(1, h * 0.34);
    }

    function getMovementMultiplier(enemy) {
        const r = rule(enemy);
        if (!r) return 1;
        if (r.id === 'floatation') return r.speedMultiplier;
        if (r.id === 'high_altitude_speed' && isHighAltitude(enemy)) return r.speedMultiplier;
        if (r.id === 'terrain_mobility') {
            const liquid = typeof global.getBiomeLiquidPlayerEffectV631 === 'function'
                ? global.getBiomeLiquidPlayerEffectV631(enemy)
                : null;
            if (liquid?.liquidId === 'sea') return r.waterSpeedMultiplier;
        }
        return 1;
    }

    function getEnvironmentalMovementMultiplier(enemy) {
        const r = rule(enemy);
        if (r?.ignoreEnvironmentalMovement) return 1;
        let multiplier = 1;
        const material = typeof global.getMaterialMovementModifiersV67 === 'function'
            ? global.getMaterialMovementModifiersV67(enemy)
            : null;
        if (material) multiplier *= Math.max(0.35, Number(material.speedMultiplier) || 1);
        const liquid = typeof global.getBiomeLiquidPlayerEffectV631 === 'function'
            ? global.getBiomeLiquidPlayerEffectV631(enemy)
            : null;
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
        if (!enemy || currentBiomeId(enemy) !== 'spring') return false;
        const cell = typeof global.gridCurrentTile === 'function' ? global.gridCurrentTile(enemy, 'enemy') : null;
        const state = stateObject();
        if (!cell || !state.grid) return false;
        const dirs = [[0,0],[1,0],[-1,0],[0,1],[0,-1]];
        return dirs.some(([dx, dy]) => state.grid[cell.y + dy]?.[cell.x + dx] === global.TYPES?.BLOCK);
    }

    function updateVegetationRegen(enemy, dt) {
        const r = rule(enemy);
        if (r?.id !== 'vegetation_regen' || !isInVegetation(enemy)) return;
        if (!Number.isFinite(Number(enemy.__effectHealthV64))) return;
        enemy.__speciesRegenAccumulatorV626 = Math.max(0, Number(enemy.__speciesRegenAccumulatorV626) || 0)
            + Math.max(0, Number(dt) || 0) / 1000 * r.regenPerSecond;
        if (enemy.__speciesRegenAccumulatorV626 < 1) return;
        enemy.__effectHealthV64 = Math.min(
            r.regenMax,
            Number(enemy.__effectHealthV64) + enemy.__speciesRegenAccumulatorV626
        );
        enemy.__speciesRegenAccumulatorV626 = 0;
    }

    function getPushMultiplier(enemy) {
        return rule(enemy)?.id === 'stability' ? RULES.stability.pushMultiplier : 1;
    }

    function getSpeciesTableV626() {
        const result = {};
        for (const biomeId of BIOME_IDS) {
            result[biomeId] = {};
            for (const typeKey of TYPE_KEYS) {
                result[biomeId][typeKey] = Object.freeze({
                    ...getSpeciesDefinitionV626(biomeId, typeKey)
                });
            }
        }
        return Object.freeze(result);
    }

    global.BIOME_ENEMY_SPECIES_RULES_V615 = RULES;
    global.BIOME_ENEMY_SPECIES_CATALOG_V626 = getSpeciesTableV626();
    global.getEnemyBiomeSpeciesProfileV615 = getProfile;
    global.getEnemyBiomeSpeciesProfileV626 = getProfile;
    global.getEnemyBiomeSpeciesDefinitionV626 = getSpeciesDefinitionV626;
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
    global.BOMBER_ENGINE.getEnemySpeciesTable = getSpeciesTableV626;
})(window);
