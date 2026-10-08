// BOMBERMAN ROGUELIKE v6.25.0 — Biome Enemy Spawn Authority.
// Una sola fuente de verdad para: bioma + profundidad/etapa + rol + especie + entidad.
// No cambia la navegación, colisiones ni el algoritmo de IA existente.
(function installEnemySpawnAuthorityV625(global) {
    'use strict';

    const ROLE = Object.freeze({
        GROUND: 'ground',
        FLYING: 'flying',
        SPECIAL: 'special',
        WINTER_BEAR: 'winter_bear',
        WINTER_OBSTRUCTOR: 'winter_obstructor'
    });

    // Los nombres visuales se resuelven desde 43-biome-enemy-species.js.
    // Este catálogo decide únicamente qué familia/tipo entra en la sala.
    const BIOME_POOLS = Object.freeze({
        winter: Object.freeze([
            Object.freeze({ role: ROLE.GROUND, typeKey: 'RASTRERO' }),
            Object.freeze({ role: ROLE.FLYING, typeKey: 'VOLADOR' }),
            Object.freeze({ role: ROLE.WINTER_BEAR, typeKey: 'OSO_NIEVE' }),
            Object.freeze({ role: ROLE.WINTER_OBSTRUCTOR, typeKey: 'ESTORBADOR_HIELO' })
        ]),
        autumn: Object.freeze([
            Object.freeze({ role: ROLE.GROUND, typeKey: 'RASTRERO' }),
            Object.freeze({ role: ROLE.FLYING, typeKey: 'VOLADOR' }),
            Object.freeze({ role: ROLE.SPECIAL, typeKey: 'ESPECIAL' })
        ]),
        spring: Object.freeze([
            Object.freeze({ role: ROLE.GROUND, typeKey: 'RASTRERO' }),
            Object.freeze({ role: ROLE.FLYING, typeKey: 'VOLADOR' }),
            Object.freeze({ role: ROLE.SPECIAL, typeKey: 'ESPECIAL' })
        ]),
        summer: Object.freeze([
            Object.freeze({ role: ROLE.GROUND, typeKey: 'RASTRERO' }),
            Object.freeze({ role: ROLE.FLYING, typeKey: 'VOLADOR' }),
            Object.freeze({ role: ROLE.SPECIAL, typeKey: 'ESPECIAL' })
        ]),
        underground: Object.freeze([
            Object.freeze({ role: ROLE.GROUND, typeKey: 'RASTRERO' }),
            Object.freeze({ role: ROLE.FLYING, typeKey: 'VOLADOR' }),
            Object.freeze({ role: ROLE.SPECIAL, typeKey: 'ESPECIAL' })
        ]),
        clouds: Object.freeze([
            Object.freeze({ role: ROLE.GROUND, typeKey: 'RASTRERO' }),
            Object.freeze({ role: ROLE.FLYING, typeKey: 'VOLADOR' }),
            Object.freeze({ role: ROLE.SPECIAL, typeKey: 'ESPECIAL' })
        ]),
        mountains: Object.freeze([
            Object.freeze({ role: ROLE.GROUND, typeKey: 'RASTRERO' }),
            Object.freeze({ role: ROLE.FLYING, typeKey: 'VOLADOR' }),
            Object.freeze({ role: ROLE.SPECIAL, typeKey: 'ESPECIAL' })
        ]),
        beach: Object.freeze([
            Object.freeze({ role: ROLE.GROUND, typeKey: 'RASTRERO' }),
            Object.freeze({ role: ROLE.FLYING, typeKey: 'VOLADOR' }),
            Object.freeze({ role: ROLE.SPECIAL, typeKey: 'ESPECIAL' })
        ]),
        space: Object.freeze([
            Object.freeze({ role: ROLE.GROUND, typeKey: 'RASTRERO' }),
            Object.freeze({ role: ROLE.FLYING, typeKey: 'VOLADOR' }),
            Object.freeze({ role: ROLE.SPECIAL, typeKey: 'ESPECIAL' })
        ]),
        sky: Object.freeze([
            Object.freeze({ role: ROLE.GROUND, typeKey: 'RASTRERO' }),
            Object.freeze({ role: ROLE.FLYING, typeKey: 'VOLADOR' }),
            Object.freeze({ role: ROLE.SPECIAL, typeKey: 'ESPECIAL' })
        ]),
        inferno: Object.freeze([
            Object.freeze({ role: ROLE.GROUND, typeKey: 'RASTRERO' }),
            Object.freeze({ role: ROLE.FLYING, typeKey: 'VOLADOR' }),
            Object.freeze({ role: ROLE.SPECIAL, typeKey: 'ESPECIAL' })
        ])
    });

    const BASE_STAGE_WEIGHTS = Object.freeze({
        1: Object.freeze({ ground: 1, flying: 0, special: 0 }),
        2: Object.freeze({ ground: 0.70, flying: 0.30, special: 0 }),
        3: Object.freeze({ ground: 0.48, flying: 0.27, special: 0.25 }),
        4: Object.freeze({ ground: 0.38, flying: 0.27, special: 0.35 })
    });

    const WINTER_STAGE_WEIGHTS = Object.freeze({
        1: Object.freeze({ ground: 1, flying: 0, winter_bear: 0, winter_obstructor: 0 }),
        2: Object.freeze({ ground: 0.68, flying: 0.22, winter_bear: 0.10, winter_obstructor: 0 }),
        3: Object.freeze({ ground: 0.44, flying: 0.20, winter_bear: 0.24, winter_obstructor: 0.12 }),
        4: Object.freeze({ ground: 0.32, flying: 0.20, winter_bear: 0.28, winter_obstructor: 0.20 })
    });

    function tileSizeV625() {
        return typeof TILE_SIZE !== 'undefined' ? Number(TILE_SIZE) || 48 : 48;
    }

    function safeNumber(value, fallback = 0) {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    }

    function currentBiomeId() {
        const state = (typeof gameState !== 'undefined' && gameState) ? gameState : (global.BOMBER_ENGINE?.getState?.() || {});
        const direct = state.biomeOverrideV49 || state.biomeV49?.id;
        if (direct) return String(direct);
        if (typeof global.getBiomeForDepthV49 === 'function') {
            const meta = global.getBiomeForDepthV49(state.level || 1);
            if (meta?.id) return String(meta.id);
        }
        return typeof global.getThemeV46 === 'function' ? String(global.getThemeV46()?.id || 'classic') : 'classic';
    }

    function currentStage() {
        const state = (typeof gameState !== 'undefined' && gameState) ? gameState : (global.BOMBER_ENGINE?.getState?.() || {});
        const explicit = safeNumber(state.biomeV49?.stage, 0);
        if (explicit >= 1) return Math.max(1, Math.min(4, Math.floor(explicit)));
        if (typeof global.getBiomeStageV49 === 'function') {
            return Math.max(1, Math.min(4, Math.floor(safeNumber(global.getBiomeStageV49(state.level || 1), 1))));
        }
        return Math.max(1, Math.min(4, Math.ceil(Math.max(1, safeNumber(state.level, 1)) / 4)));
    }

    function stateLevel() {
        return safeNumber((typeof gameState !== 'undefined' && gameState) ? gameState.level : global.BOMBER_ENGINE?.getState?.()?.level, 1);
    }

    function stateObject() {
        return (typeof gameState !== 'undefined' && gameState) ? gameState : (global.BOMBER_ENGINE?.getState?.() || {});
    }

    function roomId() {
        return String(stateObject().roomType?.id || 'STANDARD').toUpperCase();
    }

    function getWeightTable(biomeId, stage) {
        if (biomeId === 'winter') return WINTER_STAGE_WEIGHTS[stage] || WINTER_STAGE_WEIGHTS[4];
        return BASE_STAGE_WEIGHTS[stage] || BASE_STAGE_WEIGHTS[4];
    }

    function applyRoomPressure(weights) {
        const out = { ...weights };
        const id = roomId();
        if (id === 'ELITE' || id === 'CURSED') {
            if (out.special !== undefined) out.special *= 1.35;
            if (out.flying !== undefined) out.flying *= 1.12;
            if (out.winter_bear !== undefined) out.winter_bear *= 1.18;
            if (out.winter_obstructor !== undefined) out.winter_obstructor *= 1.20;
        } else if (id === 'TREASURE') {
            if (out.special !== undefined) out.special *= 0.78;
            if (out.winter_bear !== undefined) out.winter_bear *= 0.85;
            if (out.winter_obstructor !== undefined) out.winter_obstructor *= 0.85;
        }
        return out;
    }

    function normalizeWeights(raw) {
        const entries = Object.entries(raw).filter(([, value]) => safeNumber(value) > 0);
        const total = entries.reduce((sum, [, value]) => sum + safeNumber(value), 0);
        if (!total) return [];
        return entries.map(([role, weight]) => ({ role, weight: safeNumber(weight) / total }));
    }

    function chooseWeightedRoleV625(weights, roll = Math.random()) {
        let cursor = Math.max(0, Math.min(0.999999, safeNumber(roll, Math.random())));
        for (const item of weights) {
            cursor -= item.weight;
            if (cursor < 0) return item.role;
        }
        return weights.length ? weights[weights.length - 1].role : ROLE.GROUND;
    }

    function chooseEntryForRoleV625(pool, role, roll = Math.random()) {
        const candidates = pool.filter(entry => entry.role === role);
        if (!candidates.length) return pool[0] || null;
        const index = Math.min(candidates.length - 1, Math.floor(Math.max(0, Math.min(0.999999, safeNumber(roll, Math.random()))) * candidates.length));
        return candidates[index];
    }

    function roleForIndexV625(index, count, biomeId, stage) {
        const weights = normalizeWeights(applyRoomPressure(getWeightTable(biomeId, stage)));
        const unlocked = new Set(weights.map(item => item.role));

        // Diversidad mínima por sala: no dejar una sala completa en un solo arquetipo
        // cuando ya existe más de un rol desbloqueado.
        if (count >= 2 && index === 1 && unlocked.has(ROLE.FLYING)) return ROLE.FLYING;
        if (biomeId === 'winter' && count >= 3 && index === 2 && unlocked.has(ROLE.WINTER_BEAR)) return ROLE.WINTER_BEAR;
        if (biomeId === 'winter' && count >= 4 && index === 3 && unlocked.has(ROLE.WINTER_OBSTRUCTOR)) return ROLE.WINTER_OBSTRUCTOR;
        if (count >= 3 && index === 2 && unlocked.has(ROLE.SPECIAL)) return ROLE.SPECIAL;

        return chooseWeightedRoleV625(weights, Math.random());
    }

    function resolveEnemySpawnSpecV625(options = {}) {
        const biomeId = currentBiomeId();
        const stage = Math.max(1, Math.min(4, Math.floor(safeNumber(options.stage, currentStage()))));
        const count = Math.max(1, Math.floor(safeNumber(options.count, 1)));
        const index = Math.max(0, Math.floor(safeNumber(options.index, 0)));
        const pool = BIOME_POOLS[biomeId] || BIOME_POOLS.autumn;
        const forcedRole = options.forceRole && pool.some(entry => entry.role === options.forceRole) ? options.forceRole : null;
        const role = forcedRole || roleForIndexV625(index, count, biomeId, stage);
        const entry = chooseEntryForRoleV625(pool, role, safeNumber(options.roll, Math.random()));
        const typeMap = (typeof ENEMY_TYPES !== 'undefined' && ENEMY_TYPES) ? ENEMY_TYPES : {};
        const type = typeMap[entry?.typeKey] || typeMap.RASTRERO;
        const behaviorRoll = safeNumber(options.behaviorRoll, Math.random());
        const behavior = typeof global.pickEnemyBehaviorV324 === 'function'
            ? global.pickEnemyBehaviorV324(type, stateLevel(), index, behaviorRoll)
            : null;
        const speciesProfile = typeof global.getEnemyBiomeSpeciesProfileV615 === 'function'
            ? global.getEnemyBiomeSpeciesProfileV615({ type })
            : null;
        return Object.freeze({
            biomeId,
            stage,
            role: entry?.role || ROLE.GROUND,
            typeKey: entry?.typeKey || 'RASTRERO',
            type,
            behaviorId: behavior?.id || null,
            behaviorLabel: behavior?.label || null,
            speciesName: speciesProfile?.name || type?.name || 'Rastrero',
            speciesRuleId: speciesProfile?.ruleId || 'none'
        });
    }

    function buildEnemySpawnPlanV625(count = 1, options = {}) {
        const safeCount = Math.max(0, Math.floor(safeNumber(count, 0)));
        const result = [];
        for (let i = 0; i < safeCount; i++) result.push(resolveEnemySpawnSpecV625({ ...options, count: safeCount, index: i }));
        return result;
    }

    function getEnemySpawnCapV625() {
        const configured = typeof global.getDifficultyEnemySpawnCapV619 === 'function'
            ? global.getDifficultyEnemySpawnCapV619(stateLevel())
            : Math.min(12, 2 + Math.max(1, Math.floor(stateLevel())));
        return Math.max(1, Math.floor(safeNumber(configured, 3)));
    }

    function canSpawnEnemyV625(requested = 1) {
        const current = Array.isArray(stateObject().enemies) ? stateObject().enemies.length : 0;
        return Math.max(0, Math.min(Math.floor(safeNumber(requested, 0)), getEnemySpawnCapV625() - current));
    }

    function makeEnemyEntityV625(position, spec, options = {}) {
        const state = stateObject();
        if (!spec?.type || !state) return null;
        const diff = state.difficulty || (typeof global.getDifficultyV323 === 'function' ? global.getDifficultyV323(state.level) : null);
        const roomMult = safeNumber(state.roomType?.enemySpeedMult, 1);
        const difficultyMult = safeNumber(diff?.enemySpeedMult, 1);
        const type = spec.type;
        const speed = typeof global.getEnemyBaseSpeedV610 === 'function'
            ? global.getEnemyBaseSpeedV610(type)
            : safeNumber(type.speed, 1) * roomMult * difficultyMult;
        const initialDirection = options.direction === 'up' || options.direction === 'down' || options.direction === 'left' || options.direction === 'right'
            ? options.direction : 'down';
        const vx = initialDirection === 'left' ? -speed : initialDirection === 'right' ? speed : 0;
        const vy = initialDirection === 'up' ? -speed : initialDirection === 'down' ? speed : 0;
        const species = typeof global.getEnemyBiomeSpeciesProfileV615 === 'function'
            ? global.getEnemyBiomeSpeciesProfileV615({ type })
            : null;
        const eliteDefault = state.roomType?.id === 'ELITE' || state.roomType?.id === 'CURSED' || (safeNumber(diff?.eliteBonus) > 0 && Math.random() < safeNumber(diff?.eliteBonus));
        return {
            x: safeNumber(position?.x) * tileSizeV625() + tileSizeV625() / 2,
            y: safeNumber(position?.y) * tileSizeV625() + tileSizeV625() / 2,
            width: tileSizeV625() * 0.75,
            height: tileSizeV625() * 0.75,
            type,
            vx: options.randomizeVelocity === false ? vx : speed * (Math.random() < 0.5 ? 1 : -1),
            vy: 0,
            baseSpeed: speed,
            changeTimer: options.changeTimer ?? Math.random() * 100,
            elite: options.elite ?? eliteDefault,
            lastDirection: initialDirection,
            __gridAnchor: 'center',
            desiredDirection: initialDirection,
            aiBehavior: spec.behaviorId || null,
            biomeSpawnIdV625: spec.biomeId,
            biomeStageV625: spec.stage,
            spawnRoleV625: spec.role,
            speciesNameV625: species?.name || spec.speciesName || type.name,
            speciesRuleIdV625: species?.ruleId || spec.speciesRuleId || 'none',
            reinforcement: Boolean(options.reinforcement),
            spawnedByV625: String(options.source || 'room')
        };
    }

    global.ENEMY_SPAWN_CATALOG_V625 = BIOME_POOLS;
    global.ENEMY_SPAWN_ROLES_V625 = ROLE;
    global.resolveEnemySpawnSpecV625 = resolveEnemySpawnSpecV625;
    global.buildEnemySpawnPlanV625 = buildEnemySpawnPlanV625;
    global.getEnemySpawnCapV625 = getEnemySpawnCapV625;
    global.canSpawnEnemyV625 = canSpawnEnemyV625;
    global.makeEnemyEntityV625 = makeEnemyEntityV625;
    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.getEnemySpawnCatalog = () => BIOME_POOLS;
    global.BOMBER_ENGINE.getEnemySpawnPlan = (count = 1) => buildEnemySpawnPlanV625(count);
})(window);
