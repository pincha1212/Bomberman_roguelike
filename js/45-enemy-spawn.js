// BOMBERMAN ROGUELIKE v6.26.0 — Autoridad unificada de spawn de enemigos.
// Contexto único: bioma + etapa + sala + especie + arquetipo + IA.
(function installEnemySpawnAuthorityV626(global) {
    'use strict';

    const ROLE = Object.freeze({ GROUND: 'ground', FLYING: 'flying', SPECIAL: 'special' });
    const TYPE_BY_ROLE = Object.freeze({ ground: 'RASTRERO', flying: 'VOLADOR', special: 'ESPECIAL' });

    const STAGE_WEIGHTS = Object.freeze({
        1: Object.freeze({ ground: 1, flying: 0, special: 0 }),
        2: Object.freeze({ ground: 0.70, flying: 0.30, special: 0 }),
        3: Object.freeze({ ground: 0.48, flying: 0.27, special: 0.25 }),
        4: Object.freeze({ ground: 0.38, flying: 0.27, special: 0.35 })
    });

    const ROLE_BY_TYPE = Object.freeze({ RASTRERO: ROLE.GROUND, VOLADOR: ROLE.FLYING, ESPECIAL: ROLE.SPECIAL });
    const BIOMES = Object.freeze(['winter','autumn','spring','summer','underground','clouds','mountains','beach','space','sky','inferno']);

    function stateObject() {
        return (typeof gameState !== 'undefined' && gameState)
            ? gameState
            : (global.BOMBER_ENGINE?.getState?.() || {});
    }

    function safeNumber(value, fallback = 0) {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    }

    function tileSizeV626() {
        return typeof TILE_SIZE !== 'undefined' ? Number(TILE_SIZE) || 48 : 48;
    }

    function currentBiomeId() {
        const state = stateObject();
        const override = state.biomeOverrideV49;
        if (BIOMES.includes(override)) return String(override);
        if (typeof global.getBiomeForDepthV49 === 'function') {
            const meta = global.getBiomeForDepthV49(state.level || 1);
            if (BIOMES.includes(meta?.id)) return String(meta.id);
        }
        const snapshot = state.biomeV49?.id;
        if (BIOMES.includes(snapshot)) return String(snapshot);
        return 'winter';
    }

    function currentStage() {
        const state = stateObject();
        if (typeof global.getBiomeStageV49 === 'function') {
            return Math.max(1, Math.min(4, Math.floor(safeNumber(global.getBiomeStageV49(state.level || 1), 1))));
        }
        const explicit = safeNumber(state.biomeV49?.stage, 0);
        if (explicit >= 1) return Math.max(1, Math.min(4, Math.floor(explicit)));
        return Math.max(1, Math.min(4, Math.ceil(Math.max(1, safeNumber(state.level, 1)) / 4)));
    }

    function stateLevel() {
        return safeNumber(stateObject().level, 1);
    }

    function roomId() {
        return String(stateObject().roomType?.id || 'STANDARD').toUpperCase();
    }

    function isBossRoomV626() {
        return roomId() === 'BOSS';
    }

    function getStageWeights(stage) {
        return STAGE_WEIGHTS[stage] || STAGE_WEIGHTS[4];
    }

    function applyRoomPressure(weights) {
        const out = { ...weights };
        const id = roomId();
        if (id === 'ELITE' || id === 'CURSED') {
            out.special *= 1.25;
            out.flying *= 1.10;
        } else if (id === 'TREASURE' || id === 'SHRINE') {
            out.special *= 0.80;
            out.flying *= 0.95;
        }
        return out;
    }

    function normalizeWeights(raw) {
        const entries = Object.entries(raw).filter(([, value]) => safeNumber(value) > 0);
        const total = entries.reduce((sum, [, value]) => sum + safeNumber(value), 0);
        if (!total) return [];
        return entries.map(([role, weight]) => ({ role, weight: safeNumber(weight) / total }));
    }

    function chooseWeightedRole(weights, roll = Math.random()) {
        let cursor = Math.max(0, Math.min(0.999999, safeNumber(roll, Math.random())));
        for (const item of weights) {
            cursor -= item.weight;
            if (cursor < 0) return item.role;
        }
        return weights.length ? weights[weights.length - 1].role : ROLE.GROUND;
    }

    function resolveRoleForIndex(index, count, stage) {
        const weights = normalizeWeights(applyRoomPressure(getStageWeights(stage)));
        const unlocked = new Set(weights.map(item => item.role));
        if (count >= 2 && index === 1 && unlocked.has(ROLE.FLYING)) return ROLE.FLYING;
        if (count >= 3 && index === 2 && unlocked.has(ROLE.SPECIAL)) return ROLE.SPECIAL;
        return chooseWeightedRole(weights, Math.random());
    }

    function getSpeciesCatalog() {
        return global.BIOME_ENEMY_SPECIES_CATALOG_V626 || {};
    }

    function getSpeciesForRole(biomeId, role, roll = Math.random()) {
        const typeKey = TYPE_BY_ROLE[role] || TYPE_BY_ROLE.ground;
        const species = getSpeciesCatalog()?.[biomeId]?.[typeKey];
        return species || null;
    }

    function getBehaviorFromSpecies(species, type, level, roll) {
        const requested = species?.preferredAi;
        const table = global.ENEMY_BEHAVIORS_V324 || {};
        if (requested) {
            const behavior = Object.values(table).find(profile => profile?.id === requested);
            if (behavior) return behavior;
        }
        return typeof global.pickEnemyBehaviorV324 === 'function'
            ? global.pickEnemyBehaviorV324(type, level, 0, roll)
            : null;
    }

    function resolveEnemySpawnSpecV626(options = {}) {
        const biomeId = BIOMES.includes(options.biomeId) ? options.biomeId : currentBiomeId();
        const stage = Math.max(1, Math.min(4, Math.floor(safeNumber(options.stage, currentStage()))));
        const count = Math.max(1, Math.floor(safeNumber(options.count, 1)));
        const index = Math.max(0, Math.floor(safeNumber(options.index, 0)));
        const forcedRole = options.forceRole && ROLE_BY_TYPE[options.forceRole] ? ROLE_BY_TYPE[options.forceRole] : options.forceRole;
        const role = Object.values(ROLE).includes(forcedRole) ? forcedRole : resolveRoleForIndex(index, count, stage);
        const typeKey = TYPE_BY_ROLE[role] || 'RASTRERO';
        const species = getSpeciesForRole(biomeId, role, options.roll);
        if (!species) return null;
        const typeMap = (typeof ENEMY_TYPES !== 'undefined' && ENEMY_TYPES) ? ENEMY_TYPES : {};
        const type = typeMap[typeKey] || typeMap.RASTRERO;
        const behavior = getBehaviorFromSpecies(species, type, stateLevel(), safeNumber(options.behaviorRoll, Math.random()));
        return Object.freeze({
            biomeId,
            stage,
            role,
            archetype: typeKey,
            typeKey,
            type,
            speciesId: species?.id || `${biomeId}_${typeKey.toLowerCase()}`,
            speciesName: species?.name || type?.name || typeKey,
            speciesRuleId: species?.ruleId || 'none',
            preferredAi: species?.preferredAi || behavior?.id || null,
            behaviorId: behavior?.id || null,
            behaviorLabel: behavior?.label || null
        });
    }

    function buildEnemySpawnPlanV626(count = 1, options = {}) {
        if (isBossRoomV626()) return [];
        const safeCount = Math.max(0, Math.floor(safeNumber(count, 0)));
        const result = [];
        for (let i = 0; i < safeCount; i++) {
            result.push(resolveEnemySpawnSpecV626({ ...options, count: safeCount, index: i }));
        }
        return result;
    }

    function getEnemySpawnCapV626() {
        const configured = typeof global.getDifficultyEnemySpawnCapV619 === 'function'
            ? global.getDifficultyEnemySpawnCapV619(stateLevel())
            : Math.min(12, 2 + Math.max(1, Math.floor(stateLevel())));
        return Math.max(1, Math.floor(safeNumber(configured, 3)));
    }

    function canSpawnEnemyV626(requested = 1) {
        const current = Array.isArray(stateObject().enemies) ? stateObject().enemies.length : 0;
        return Math.max(0, Math.min(Math.floor(safeNumber(requested, 0)), getEnemySpawnCapV626() - current));
    }

    function makeEnemyEntityV626(position, spec, options = {}) {
        const state = stateObject();
        if (isBossRoomV626() || !spec?.type || !state) return null;
        const diff = state.difficulty || (typeof global.getDifficultyV323 === 'function' ? global.getDifficultyV323(state.level) : null);
        const roomMult = safeNumber(state.roomType?.enemySpeedMult, 1);
        const difficultyMult = safeNumber(diff?.enemySpeedMult, 1);
        const type = spec.type;
        const baseSpeed = typeof global.getEnemyBaseSpeedV610 === 'function'
            ? global.getEnemyBaseSpeedV610(type)
            : safeNumber(type.speed, 1) * roomMult * difficultyMult;
        const behaviorTable = global.ENEMY_BEHAVIORS_V324 || {};
        const behavior = spec.behaviorId ? Object.values(behaviorTable).find(profile => profile?.id === spec.behaviorId) : null;
        const movementMultiplier = behavior?.speedMultiplier || 1;
        const speed = baseSpeed * movementMultiplier;
        const initialDirection = ['up','down','left','right'].includes(options.direction) ? options.direction : 'down';
        const vx = initialDirection === 'left' ? -speed : initialDirection === 'right' ? speed : 0;
        const vy = initialDirection === 'up' ? -speed : initialDirection === 'down' ? speed : 0;
        const speciesProfile = typeof global.getEnemyBiomeSpeciesProfileV626 === 'function'
            ? global.getEnemyBiomeSpeciesProfileV626({ type, biomeSpawnIdV626: spec.biomeId, speciesIdV626: spec.speciesId })
            : null;
        const eliteDefault = state.roomType?.id === 'ELITE'
            || state.roomType?.id === 'CURSED'
            || (safeNumber(diff?.eliteBonus) > 0 && Math.random() < safeNumber(diff?.eliteBonus));
        return {
            x: safeNumber(position?.x) * tileSizeV626() + tileSizeV626() / 2,
            y: safeNumber(position?.y) * tileSizeV626() + tileSizeV626() / 2,
            width: tileSizeV626() * 0.75,
            height: tileSizeV626() * 0.75,
            type,
            vx: options.randomizeVelocity === false ? vx : speed * (Math.random() < 0.5 ? 1 : -1),
            vy: 0,
            baseSpeed: baseSpeed,
            speed,
            changeTimer: options.changeTimer ?? Math.random() * 100,
            elite: options.elite ?? eliteDefault,
            lastDirection: initialDirection,
            __gridAnchor: 'center',
            desiredDirection: initialDirection,
            aiBehavior: spec.behaviorId || null,
            biomeSpawnIdV626: spec.biomeId,
            biomeStageV626: spec.stage,
            spawnRoleV626: spec.role,
            archetypeV626: spec.archetype || spec.typeKey,
            speciesIdV626: spec.speciesId,
            speciesNameV626: speciesProfile?.name || spec.speciesName || type.name,
            speciesRuleIdV626: speciesProfile?.ruleId || spec.speciesRuleId || 'none',
            preferredAiV626: spec.preferredAi || spec.behaviorId || null,
            spawnedByV626: String(options.source || 'room')
        };
    }

    global.ENEMY_SPAWN_CATALOG_V626 = getSpeciesCatalog();
    global.ENEMY_SPAWN_ROLES_V626 = ROLE;
    global.resolveEnemySpawnSpecV626 = resolveEnemySpawnSpecV626;
    global.buildEnemySpawnPlanV626 = buildEnemySpawnPlanV626;
    global.getEnemySpawnCapV626 = getEnemySpawnCapV626;
    global.canSpawnEnemyV626 = canSpawnEnemyV626;
    global.makeEnemyEntityV626 = makeEnemyEntityV626;
    global.isBossRoomV626 = isBossRoomV626;
    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.getEnemySpawnCatalog = () => getSpeciesCatalog();
    global.BOMBER_ENGINE.getEnemySpawnPlan = (count = 1) => buildEnemySpawnPlanV626(count);
})(window);
