// Bomberman Roguelike v6.30.7 — Bomb Effect Registry / single explosion-field authority
// Base simple y extensible para rastros/efectos de bombas.
//
// PRINCIPIOS
// - Una bomba declara effectIds; el sistema decide cómo se materializan.
// - Los efectos son datos + pequeñas funciones de aplicación/combina­ción.
// - Un efecto de campo es independiente de la bomba que lo creó.
// - El daño de efectos usa una capa común para PLAYER, ENEMY, BOSS y DEATH_ECHO.
// - Las combinaciones se declaran en una tabla; agregar una nueva no requiere
//   modificar explodeBomb().
// - Las áreas se limitan por celda y el update está acotado para mantenerlo barato.

(function installBombEffectSystemV64(global) {
    'use strict';

    const VERSION = '6.12.10';
    const EVENT = global.GAME_EVENTS_V60?.BOMBA_EXPLOTO || global.GAME_EVENTS_V59?.BOMBA_EXPLOTO;
    const LISTENER_KEY = 'bomb-explosion:effects';
    const MAX_FIELDS = 420;
    const MAX_ENTITY_STATUSES = 128;

    const EFFECTS = Object.freeze({
        HEAT: 'heat',
        COLD: 'cold',
        FROST: 'frost',
        SHOCK: 'shock',
        STEAM: 'steam',
        PLASMA: 'plasma',
        ARC: 'arc'
    });

    const EFFECT_DEFS = Object.freeze({
        [EFFECTS.HEAT]: Object.freeze({
            id: EFFECTS.HEAT,
            label: 'Calor',
            color: '#ffb347',
            core: '#fff7ed',
            defaultDurationMs: 3000,
            // El rastro de fuego quema a enemigos que permanecen en la zona.
            // Tres pulsos a lo largo del campo evitan daño explosivo por frame.
            tickMs: 750,
            damage: 0,
            enemyDamage: 1,
            sourceKinds: Object.freeze(['bomb']),
            warmingPerSecond: 2400,
            movementMultiplier: 1.05,
            tags: Object.freeze(['bomb', 'fire', 'damage', 'winter', 'support'])
        }),
        [EFFECTS.COLD]: Object.freeze({
            id: EFFECTS.COLD,
            label: 'Frío',
            color: '#93c5fd',
            core: '#eff6ff',
            defaultDurationMs: 25000,
            tickMs: 250,
            damage: 0,
            sourceKinds: Object.freeze(['hazard']),
            persistent: true,
            maxExposureMs: 25000,
            fatalDamage: 999,
            movementSlowAtMs: 10000,
            inputBufferHalfAtMs: 15000,
            extraSlipAtMs: 20000,
            tags: Object.freeze(['hazard', 'winter', 'damage', 'status'])
        }),
        [EFFECTS.FROST]: Object.freeze({ id:EFFECTS.FROST, label:'Escarcha', color:'#7dd3fc', core:'#e0f2fe', defaultDurationMs:2800, tickMs:250, damage:0, movementMultiplier:0.62, enemyMovementMultiplier:0.62, sourceKinds:Object.freeze(['bomb']), tags:Object.freeze(['bomb','ice','slow']) }),
        [EFFECTS.SHOCK]: Object.freeze({ id:EFFECTS.SHOCK, label:'Descarga', color:'#facc15', core:'#fef9c3', defaultDurationMs:1800, tickMs:600, damage:1, movementMultiplier:0.86, enemyMovementMultiplier:0.86, sourceKinds:Object.freeze(['bomb']), tags:Object.freeze(['bomb','electric','damage']) }),
        [EFFECTS.STEAM]: Object.freeze({ id:EFFECTS.STEAM, label:'Vapor', color:'#e2e8f0', core:'#ffffff', defaultDurationMs:2200, tickMs:300, damage:0, movementMultiplier:0.58, enemyMovementMultiplier:0.58, sourceKinds:Object.freeze(['bomb']), tags:Object.freeze(['bomb','combo','steam','slow']), materialType: global.MATERIALS_V60?.STEAM || 'steam' }),
        [EFFECTS.PLASMA]: Object.freeze({ id:EFFECTS.PLASMA, label:'Plasma', color:'#c084fc', core:'#f5d0fe', defaultDurationMs:1500, tickMs:300, damage:1, movementMultiplier:0.92, enemyMovementMultiplier:0.92, sourceKinds:Object.freeze(['bomb']), tags:Object.freeze(['bomb','combo','plasma','damage']) }),
        [EFFECTS.ARC]: Object.freeze({ id:EFFECTS.ARC, label:'Rayo extendido', color:'#fde047', core:'#ffffff', defaultDurationMs:900, tickMs:250, damage:1, movementMultiplier:0.90, enemyMovementMultiplier:0.90, sourceKinds:Object.freeze(['bomb']), tags:Object.freeze(['bomb','combo','electric','extended','damage']) })
    });

    // Una tabla de combinaciones. Se puede ampliar con pares nuevos sin tocar
    // los sistemas de bomba, render o entidades.
    const COMBINATIONS = Object.freeze({
        'cold|heat': Object.freeze({
            result: EFFECTS.HEAT,
            consume: Object.freeze([EFFECTS.COLD, EFFECTS.HEAT]),
            message: 'DESCONGELADO'
        }),
        'frost|heat': Object.freeze({
            result: EFFECTS.STEAM,
            consume: Object.freeze([EFFECTS.FROST, EFFECTS.HEAT]),
            message: 'VAPOR'
        }),
        'heat|shock': Object.freeze({
            result: EFFECTS.PLASMA,
            consume: Object.freeze([EFFECTS.HEAT, EFFECTS.SHOCK]),
            message: 'PLASMA'
        }),
        'frost|shock': Object.freeze({
            result: EFFECTS.ARC,
            consume: Object.freeze([EFFECTS.FROST, EFFECTS.SHOCK]),
            message: 'RAYO EXTENDIDO'
        })
    });

    const COMBO_RADIUS_V6129 = Object.freeze({
        steam: 1,
        plasmaChainTargets: 4,
        arcLength: 2
    });

    const runtime = {
        fields: null,
        listenerInstalled: false,
        duplicateInstallAttempts: 0,
        lastEventId: 0
    };

    function getState() {
        return global.BOMBER_ENGINE?.getState?.() || global.gameState || null;
    }

    function getPlayer() {
        return global.BOMBER_ENGINE?.getPlayer?.() || global.player || null;
    }

    function ensureFields(state = getState()) {
        if (!state) return null;
        if (!Array.isArray(state.bombEffectFieldsV64)) state.bombEffectFieldsV64 = [];
        runtime.fields = state.bombEffectFieldsV64;
        return runtime.fields;
    }

    function tileKey(x, y) {
        return `${Math.trunc(x)},${Math.trunc(y)}`;
    }

    function finite(value, fallback = 0) {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    const ELEMENTAL_FEEDBACK_V61210 = Object.freeze({
        heat: Object.freeze({ label: 'BRASA', color: '#fb923c' }),
        frost: Object.freeze({ label: 'ESCARCHA', color: '#7dd3fc' }),
        shock: Object.freeze({ label: 'CHISPA', color: '#facc15' }),
        steam: Object.freeze({ label: 'VAPOR', color: '#e2e8f0' }),
        plasma: Object.freeze({ label: 'PLASMA', color: '#c084fc' }),
        arc: Object.freeze({ label: 'RAYO', color: '#fde047' })
    });

    function triggerElementalFeedbackV61210(effectId, x, y, options = {}) {
        const meta = ELEMENTAL_FEEDBACK_V61210[effectId];
        if (!meta) return false;
        const worldX = (finite(x) + 0.5) * TILE_SIZE;
        const worldY = (finite(y) + 0.5) * TILE_SIZE;
        // La explosión ya se representa con la llama continua del renderer.
        // No generar discos/partículas radiales superpuestos en el origen.
        if (typeof global.addFloatingText === 'function') {
            global.addFloatingText(meta.label, worldX, worldY - TILE_SIZE * 0.24, meta.color);
        }
        return true;
    }

    function triggerBombFeedbackV61210(bomb) {
        if (!bomb) return false;
        const range = Math.max(1, finite(bomb.range, 1));
        const intensity = clamp(5 + range * 0.9, 7, 12);
        const duration = clamp(170 + range * 16, 190, 360);
        if (typeof global.triggerScreenShake === 'function') {
            global.triggerScreenShake(intensity, duration);
        }
        return true;
    }

    function definition(id) {
        return EFFECT_DEFS[id] || null;
    }

    function normalizeEffectIds(ids) {
        if (!Array.isArray(ids)) return [];
        return [...new Set(ids.map(id => String(id)).filter(id => !!definition(id)))];
    }

    function stageBombEffectConfig() {
        const state = getState();
        return state?.biomeV49?.stageConfig?.bombEffects || {};
    }

    function themeBombEffectConfig() {
        const theme = typeof global.getThemeV46 === 'function' ? global.getThemeV46() : null;
        return theme?.bombEffects || {};
    }

    function getBombEffectIdsV64(bomb = {}) {
        const direct = normalizeEffectIds(bomb.effectIds);
        if (direct.length) return direct;

        const stage = stageBombEffectConfig();
        const theme = themeBombEffectConfig();
        const stageIds = Array.isArray(stage) ? stage : Object.keys(stage);
        const themeIds = Array.isArray(theme) ? theme : Object.keys(theme);
        const ids = stageIds.length ? stageIds : themeIds;
        return normalizeEffectIds(ids);
    }

    function getEffectConfigV64(id) {
        const def = definition(id);
        if (!def) return null;
        const theme = themeBombEffectConfig();
        const stage = stageBombEffectConfig();
        const themeEntry = Array.isArray(theme) ? {} : (theme?.[id] || {});
        const stageEntry = Array.isArray(stage) ? {} : (stage?.[id] || {});
        return Object.freeze({
            ...def,
            ...themeEntry,
            ...stageEntry,
            durationMs: Math.max(80, finite(stageEntry.durationMs, finite(themeEntry.durationMs, def.defaultDurationMs))),
            tickMs: Math.max(100, finite(stageEntry.tickMs, finite(themeEntry.tickMs, def.tickMs))),
            damage: Math.max(0, finite(stageEntry.damage, finite(themeEntry.damage, def.damage)))
        });
    }

    function getEffectStatusV64(entity, effectId) {
        const statuses = entity?.__bombEffectStatusesV64;
        return statuses && typeof statuses === 'object' ? (statuses[effectId] || null) : null;
    }

    function getBombEffectConfigSafe(id){ return getEffectConfigV64(id) || {}; }

    function getBombEffectMovementModifiersV64(entity) {
        const cold = getEffectStatusV64(entity, EFFECTS.COLD);
        const heat = getEffectStatusV64(entity, EFFECTS.HEAT);
        let speedMultiplier = 1;
        let inputBufferMultiplier = 1;
        let brakingMultiplier = 1;
        let turnCarryMultiplier = 1;

        if (heat) speedMultiplier *= getEffectConfigV64(EFFECTS.HEAT)?.movementMultiplier || 1;
        const frost = getEffectStatusV64(entity, EFFECTS.FROST);
        const shock = getEffectStatusV64(entity, EFFECTS.SHOCK);
        const steam = getEffectStatusV64(entity, EFFECTS.STEAM);
        if (frost) speedMultiplier *= getBombEffectConfigSafe(EFFECTS.FROST)?.movementMultiplier || 0.62;
        if (shock) speedMultiplier *= getBombEffectConfigSafe(EFFECTS.SHOCK)?.movementMultiplier || 0.86;
        if (steam) speedMultiplier *= getBombEffectConfigSafe(EFFECTS.STEAM)?.movementMultiplier || 0.58;
        if (cold) {
            const exposure = finite(cold.exposureMs, 0);
            if (exposure >= EFFECT_DEFS[EFFECTS.COLD].movementSlowAtMs) speedMultiplier *= 0.90;
            if (exposure >= EFFECT_DEFS[EFFECTS.COLD].inputBufferHalfAtMs) inputBufferMultiplier *= 0.50;
            if (exposure >= EFFECT_DEFS[EFFECTS.COLD].extraSlipAtMs) {
                brakingMultiplier *= 0.84;
                turnCarryMultiplier *= 1.04;
            }
        }
        return Object.freeze({ speedMultiplier, inputBufferMultiplier, brakingMultiplier, turnCarryMultiplier });
    }

    // Multiplicador separado para IA enemiga: el calor no acelera enemigos,
    // pero escarcha/vapor/descarga y combos sí ralentizan mientras el estado viva.
    function getBombEffectEnemyMovementMultiplierV6306(entity) {
        const statuses = entity?.__bombEffectStatusesV64;
        if (!statuses || typeof statuses !== 'object') return 1;
        let multiplier = 1;
        for (const [effectId, status] of Object.entries(statuses)) {
            if (!status || status.sourceBombId == null) continue;
            const config = getEffectConfigV64(effectId);
            const effectMultiplier = Number(config?.enemyMovementMultiplier);
            if (!Number.isFinite(effectMultiplier) || effectMultiplier <= 0 || effectMultiplier >= 1) continue;
            multiplier *= clamp(effectMultiplier, 0.3, 1);
        }
        return clamp(multiplier, 0.28, 1);
    }

    function getBombEffectVisualStateV64(entity) {
        const cold = getEffectStatusV64(entity, EFFECTS.COLD);
        const heat = getEffectStatusV64(entity, EFFECTS.HEAT);
        const maxExposure = EFFECT_DEFS[EFFECTS.COLD].maxExposureMs;
        const exposureMs = cold ? clamp(finite(cold.exposureMs, 0), 0, maxExposure) : 0;
        return Object.freeze({
            coldExposureMs: exposureMs,
            coldSeverity: maxExposure > 0 ? exposureMs / maxExposure : 0,
            heatActive: !!heat
        });
    }

    function ensureEntityStatuses(entity) {
        if (!entity || typeof entity !== 'object') return null;
        if (!entity.__bombEffectStatusesV64 || typeof entity.__bombEffectStatusesV64 !== 'object') {
            Object.defineProperty(entity, '__bombEffectStatusesV64', {
                value: Object.create(null),
                enumerable: false,
                configurable: true,
                writable: true
            });
        }
        return entity.__bombEffectStatusesV64;
    }

    function entityCenter(entity) {
        if (!entity) return null;
        const width = finite(entity.width, TILE_SIZE);
        const height = finite(entity.height, TILE_SIZE);
        return {
            x: finite(entity.x) + width / 2,
            y: finite(entity.y) + height / 2
        };
    }

    function entityCell(entity) {
        const center = entityCenter(entity);
        if (!center) return null;
        return {
            x: Math.floor(center.x / TILE_SIZE),
            y: Math.floor(center.y / TILE_SIZE)
        };
    }

    function collectEntities() {
        const state = getState();
        const targets = [];
        const p = getPlayer();
        if (p) targets.push({ kind: 'player', entity: p });

        for (const enemy of Array.isArray(state?.enemies) ? state.enemies : []) {
            if (enemy && !enemy.defeated) targets.push({ kind: 'enemy', entity: enemy });
        }

        if (state?.boss && !state.boss.defeated) targets.push({ kind: 'boss', entity: state.boss });

        const echo = typeof global.getActiveDeathEchoV61 === 'function'
            ? global.getActiveDeathEchoV61(state?.level)
            : (state?.deathEchoV61 || null);
        if (echo && !echo.defeated) targets.push({ kind: 'death_echo', entity: echo });

        return targets;
    }

    function effectFieldsAt(fields, x, y) {
        const key = tileKey(x, y);
        return fields.filter(field => field?.key === key);
    }

    function removeField(fields, field) {
        const index = fields.indexOf(field);
        if (index < 0) return false;
        fields.splice(index, 1);
        return true;
    }

    function findField(fields, effectId, x, y) {
        const key = tileKey(x, y);
        return fields.find(field => field?.key === key && field.effectId === effectId) || null;
    }

    function comboCellOpenV6129(x, y) {
        const state = getState();
        if (!state || !isFiniteNumber(Number(x)) || !isFiniteNumber(Number(y))) return false;
        const tx = Math.trunc(Number(x));
        const ty = Math.trunc(Number(y));
        if (tx < 0 || ty < 0 || tx >= Number(state.gridWidth) || ty >= Number(state.gridHeight)) return false;
        const type = state.grid?.[ty]?.[tx];
        const wall = global.TYPES?.WALL;
        const locked = global.TYPES?.EXIT_LOCKED;
        const block = global.TYPES?.BLOCK;
        return type !== wall && type !== locked && type !== block;
    }

    function triggerPlasmaChainV6129(originX, originY, sourceBombId) {
        const candidates = collectEntities().filter(target => target.kind === 'enemy' || target.kind === 'boss');
        if (!candidates.length) return 0;
        const hitToken = `plasma:${runtime.lastEventId}:${sourceBombId || 'none'}`;
        let currentCell = { x: Math.trunc(originX), y: Math.trunc(originY) };
        let totalHits = 0;

        for (let hop = 0; hop <= COMBO_RADIUS_V6129.plasmaChainTargets; hop++) {
            const available = candidates.filter(target => {
                const entity = target.entity;
                if (!entity || entity.__plasmaChainHitV6129 === hitToken) return false;
                const cell = entityCell(entity);
                if (!cell) return false;
                return Math.abs(cell.x - currentCell.x) + Math.abs(cell.y - currentCell.y) === 0 ||
                       Math.abs(cell.x - currentCell.x) + Math.abs(cell.y - currentCell.y) === 1;
            });
            if (!available.length) break;
            available.sort((a, b) => {
                const ac = entityCell(a.entity);
                const bc = entityCell(b.entity);
                return (Math.abs(ac.x - currentCell.x) + Math.abs(ac.y - currentCell.y)) -
                       (Math.abs(bc.x - currentCell.x) + Math.abs(bc.y - currentCell.y));
            });
            const target = available[0];
            const cell = entityCell(target.entity);
            target.entity.__plasmaChainHitV6129 = hitToken;
            if (damageTarget(target, 1, 'effect:plasma-chain')) totalHits++;
            if (!cell) break;
            currentCell = cell;
        }
        return totalHits;
    }

    function spawnSteamCloudV6129(fields, x, y, options = {}) {
        const offsets = [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: -1, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: -1 }
        ];
        let created = 0;
        for (const offset of offsets) {
            const tx = Math.trunc(x) + offset.x;
            const ty = Math.trunc(y) + offset.y;
            if (!comboCellOpenV6129(tx, ty)) continue;
            if (depositFieldInternal(EFFECTS.STEAM, tx, ty, {
                durationMs: 2200, intensity: 1, source: 'combo:steam', owner: options.owner, sourceBombId: options.sourceBombId
            })) created++;
        }
        return created;
    }

    function spawnExtendedLightningV6129(x, y, options = {}) {
        const dirs = [
            { x: 1, y: 0 }, { x: -1, y: 0 },
            { x: 0, y: 1 }, { x: 0, y: -1 }
        ];
        let created = 0;
        for (const dir of dirs) {
            for (let step = 1; step <= COMBO_RADIUS_V6129.arcLength; step++) {
                const tx = Math.trunc(x) + dir.x * step;
                const ty = Math.trunc(y) + dir.y * step;
                if (!comboCellOpenV6129(tx, ty)) break;
                if (depositFieldInternal(EFFECTS.ARC, tx, ty, {
                    durationMs: 900, intensity: 1, source: 'combo:arc', owner: options.owner, sourceBombId: options.sourceBombId
                })) created++;
            }
        }
        return created;
    }

    function combinationFor(a, b) {
        const pair = [String(a), String(b)].sort().join('|');
        return COMBINATIONS[pair] || null;
    }

    function depositFieldInternal(effectId, x, y, options = {}, resolveCombinations = true) {
        const fields = ensureFields();
        const config = getEffectConfigV64(effectId);
        const tx = Math.trunc(Number(x));
        const ty = Math.trunc(Number(y));
        if (!fields || !config || !Number.isInteger(tx) || !Number.isInteger(ty)) return false;
        if (fields.length >= MAX_FIELDS && !findField(fields, effectId, tx, ty)) return false;

        const existingFields = effectFieldsAt(fields, tx, ty);

        // Las combinaciones tienen prioridad sobre la simple acumulación del
        // mismo efecto. Así, si una celda contiene HEAT + COLD y entra otro
        // HEAT, primero resolvemos COLD+HEAT y no dejamos efectos incompatibles.
        for (const existing of [...existingFields]) {
            if (!resolveCombinations || existing.effectId === effectId) continue;
            const combo = combinationFor(existing.effectId, effectId);
            if (!combo) continue;

            for (const consumedId of combo.consume || []) {
                const consumed = findField(fields, consumedId, tx, ty);
                if (consumed) removeField(fields, consumed);
            }
            if (combo.result) {
                const created = depositFieldInternal(combo.result, tx, ty, {
                    source: 'combination',
                    durationMs: options.durationMs,
                    owner: options.owner,
                    sourceBombId: options.sourceBombId
                }, false);
                if (created && combo.result === EFFECTS.STEAM) {
                    spawnSteamCloudV6129(fields, tx, ty, options);
                } else if (created && combo.result === EFFECTS.PLASMA) {
                    triggerPlasmaChainV6129(tx, ty, options.sourceBombId);
                } else if (created && combo.result === EFFECTS.ARC) {
                    spawnExtendedLightningV6129(tx, ty, options);
                }
                if (created) triggerElementalFeedbackV61210(combo.result, tx, ty, { intensity: 1.15 });
                if (combo.message && typeof global.addFloatingText === 'function') {
                    global.addFloatingText(
                        combo.message,
                        (tx + 0.5) * TILE_SIZE,
                        (ty + 0.25) * TILE_SIZE,
                        '#f8fafc'
                    );
                }
                return created;
            }
            return true;
        }

        // Si no hubo combinación, acumulamos intensidad del mismo efecto.
        const same = findField(fields, effectId, tx, ty);
        if (same) {
            same.remainingMs = Math.max(same.remainingMs, finite(options.durationMs, config.durationMs));
            same.intensity = clamp(same.intensity + finite(options.intensity, 1) * 0.35, 0.1, 2);
            same.lastEventId = runtime.lastEventId;
            return true;
        }

        fields.push({
            key: tileKey(tx, ty),
            x: tx,
            y: ty,
            effectId,
            intensity: clamp(finite(options.intensity, 1), 0.1, 2),
            remainingMs: Math.max(80, finite(options.durationMs, config.durationMs)),
            tickAccumulatorMs: 0,
            source: String(options.source || 'system'),
            owner: String(options.owner || 'system'),
            sourceBombId: options.sourceBombId == null ? null : String(options.sourceBombId),
            createdEventId: runtime.lastEventId
        });
        return true;
    }

    function depositField(effectId, x, y, options = {}) {
        return depositFieldInternal(effectId, x, y, options, true);
    }

    function isFiniteNumber(value) {
        return Number.isFinite(Number(value));
    }

    function applyEntityStatus(target, effectId, options = {}) {
        const entity = target?.entity || target;
        const kind = target?.kind || 'generic';
        const config = getEffectConfigV64(effectId);
        if (!entity || !config) return false;

        const statuses = ensureEntityStatuses(entity);
        if (!statuses) return false;
        const defaultDuration = config.persistent ? Infinity : config.durationMs;
        const speciesDurationMultiplier = kind === 'enemy' && typeof global.getEnemyBiomeSpeciesEffectDurationMultiplierV615 === 'function'
            ? Math.max(0.1, Number(global.getEnemyBiomeSpeciesEffectDurationMultiplierV615(entity, effectId)) || 1)
            : 1;
        const durationMs = config.persistent ? Infinity : Math.max(80, finite(options.durationMs, defaultDuration) * speciesDurationMultiplier);
        const intensity = clamp(finite(options.intensity, 1), 0.1, 2);
        const existing = statuses[effectId];

        if (existing) {
            existing.remainingMs = config.persistent ? Infinity : Math.max(existing.remainingMs, durationMs);
            existing.intensity = clamp(Math.max(existing.intensity, intensity), 0.1, 2);
            if (effectId === EFFECTS.COLD && Number.isFinite(Number(options.exposureBoostMs))) {
                existing.exposureMs = clamp(
                    finite(existing.exposureMs, 0) + Math.max(0, finite(options.exposureBoostMs, 0)),
                    0,
                    config.maxExposureMs
                );
            }
            existing.lastSource = String(options.source || existing.lastSource || 'system');
            return true;
        }

        if (Object.keys(statuses).length >= MAX_ENTITY_STATUSES) return false;

        statuses[effectId] = {
            effectId,
            remainingMs: durationMs,
            intensity,
            tickAccumulatorMs: 0,
            source: String(options.source || 'system'),
            sourceBombId: options.sourceBombId == null ? null : String(options.sourceBombId),
            kind,
            exposureMs: effectId === EFFECTS.COLD
                ? clamp(Math.max(0, finite(options.exposureBoostMs, 0)), 0, config.maxExposureMs)
                : 0,
            fatalTriggered: false
        };
        return true;
    }

    function warmEntityV64(target, dt, intensity = 1) {
        const entity = target?.entity || target;
        const cold = getEffectStatusV64(entity, EFFECTS.COLD);
        if (!cold) return false;
        const config = getEffectConfigV64(EFFECTS.HEAT);
        cold.exposureMs = Math.max(0, finite(cold.exposureMs, 0) - (config?.warmingPerSecond || 2400) * Math.max(0, Number(dt) || 0) / 1000 * Math.max(0.1, intensity));
        if (cold.exposureMs <= 25) delete entity.__bombEffectStatusesV64[EFFECTS.COLD];
        return true;
    }

    function damageEnemy(target, amount, source) {
        const state = getState();
        const enemy = target?.entity || target;
        if (!enemy || !Array.isArray(state?.enemies)) return false;
        enemy.__effectHealthV64 = Number.isFinite(Number(enemy.__effectHealthV64))
            ? Number(enemy.__effectHealthV64)
            : 3;
        enemy.__effectHealthV64 -= Math.max(1, Number(amount) || 1);
        if (enemy.__effectHealthV64 > 0) {
            enemy.effectHitFlashV64 = 120;
            if (typeof global.addParticles === 'function') global.addParticles(enemy.x, enemy.y, 'particleDanger', 4);
            return true;
        }

        const index = state.enemies.indexOf(enemy);
        if (index < 0) return false;
        if (typeof global.triggerEnemyDefeatFeedback === 'function') global.triggerEnemyDefeatFeedback(enemy);
        state.enemies.splice(index, 1);
        state.totalKills = (Number(state.totalKills) || 0) + 1;
        if (typeof global.addFloatingText === 'function') global.addFloatingText('EFECTO', enemy.x, enemy.y, '#93c5fd');
        if (typeof global.tryUnlockExitCurrentRoom === 'function') global.tryUnlockExitCurrentRoom();
        return true;
    }

    function forcePlayerColdDeathV64(source = 'effect:cold') {
        const p = getPlayer();
        const state = getState();
        if (!p || !state || !state.isPlaying) return false;
        if (typeof global.isGodModeActiveV616 === 'function' && global.isGodModeActiveV616()) return false;
        if (typeof global.playerFSMDeath === 'function') global.playerFSMDeath(source);
        if (typeof global.gameOver === 'function') {
            global.gameOver(source);
            return true;
        }
        p.health = 0;
        return true;
    }

    function damageTarget(target, amount, source) {
        const entity = target?.entity || target;
        const kind = target?.kind || 'generic';
        if (!entity || amount <= 0) return false;
        const cell = entityCell(entity);
        const sx = cell ? (cell.x + 0.5) * TILE_SIZE : finite(entity.x);
        const sy = cell ? (cell.y + 0.5) * TILE_SIZE : finite(entity.y);

        if (kind === 'player' && typeof global.takeDamage === 'function') {
            return !!global.takeDamage(source, sx, sy);
        }
        if (kind === 'enemy') return damageEnemy(target, amount, source);
        if (kind === 'boss' && typeof global.damageBoss === 'function') {
            const beforeHp = finite(entity.hp, finite(entity.health, 1));
            const applied = !!global.damageBoss(amount);
            const afterHp = finite(entity.hp, finite(entity.health, 0));
            if (applied && beforeHp > 0 && afterHp <= 0 && typeof global.triggerHitStop === 'function') global.triggerHitStop(50);
            return applied;
        }
        if (kind === 'death_echo' && typeof global.damageDeathEchoByEffectV63 === 'function') {
            return !!global.damageDeathEchoByEffectV63(amount, source);
        }
        if (Number.isFinite(Number(entity.health))) {
            entity.health = Math.max(0, Number(entity.health) - amount);
            return true;
        }
        return false;
    }

    function tickEntityStatus(target, status, dt) {
        const config = getEffectConfigV64(status.effectId);
        if (!config) return;

        if (!config.persistent) {
            status.remainingMs -= dt;
            if (status.remainingMs <= 0) return;
        }

        status.tickAccumulatorMs += dt;
        while (status.tickAccumulatorMs >= config.tickMs) {
            status.tickAccumulatorMs -= config.tickMs;

            if (status.effectId === EFFECTS.COLD) {
                status.exposureMs = clamp(
                    finite(status.exposureMs, 0) + config.tickMs * Math.max(0.1, status.intensity),
                    0,
                    config.maxExposureMs
                );
                if (status.exposureMs >= config.maxExposureMs && !status.fatalTriggered) {
                    status.fatalTriggered = true;
                    if (target?.kind === 'player') {
                        forcePlayerColdDeathV64('effect:cold');
                    } else {
                        damageTarget(target, config.fatalDamage, 'effect:cold');
                    }
                }
                continue;
            }

            const isHostile = target?.kind === 'enemy' || target?.kind === 'boss' || target?.kind === 'death_echo';
            const configuredDamage = isHostile && Number.isFinite(Number(config.enemyDamage))
                ? Math.max(0, Number(config.enemyDamage))
                : Math.max(0, Number(config.damage) || 0);
            if (configuredDamage > 0) {
                damageTarget(target, Math.max(1, Math.round(configuredDamage * status.intensity)), `effect:${status.effectId}`);
            }
        }
    }

    function isBombEffectFieldV61232(field) {
        return !!field && field.sourceBombId != null;
    }

    function isBombEffectTargetV61232(target) {
        const kind = target?.kind;
        return kind === 'enemy' || kind === 'boss' || kind === 'death_echo';
    }

    function syncFieldToEntities(field, dt) {
        const targets = collectEntities();
        for (const target of targets) {
            // Los efectos producidos por una bomba son ofensivos: solo afectan
            // a entidades hostiles. El jugador nunca recibe SLOW/DAMAGE/STATUS
            // de una explosión elemental o de sus combinaciones.
            if (isBombEffectFieldV61232(field) && !isBombEffectTargetV61232(target)) continue;

            const cell = entityCell(target.entity);
            if (!cell || cell.x !== field.x || cell.y !== field.y) continue;
            const config = getEffectConfigV64(field.effectId);
            if (!config) continue;

            if (field.effectId === EFFECTS.HEAT) {
                applyEntityStatus(target, field.effectId, {
                    durationMs: Math.min(field.remainingMs, config.durationMs),
                    intensity: field.intensity,
                    source: field.source,
                    sourceBombId: field.sourceBombId
                });
                warmEntityV64(target, dt, field.intensity);
                continue;
            }

            applyEntityStatus(target, field.effectId, {
                durationMs: config.durationMs,
                intensity: field.intensity,
                source: field.source,
                sourceBombId: field.sourceBombId
            });
        }
    }

    function updateEntityStatuses(dt) {
        for (const target of collectEntities()) {
            const statuses = ensureEntityStatuses(target.entity);
            if (!statuses) continue;
            for (const [effectId, status] of Object.entries(statuses)) {
                if (!status) {
                    delete statuses[effectId];
                    continue;
                }
                // Limpieza defensiva: si un estado de bomba quedó guardado en
                // el jugador, se elimina y no vuelve a aplicar ningún efecto.
                if (target?.kind === 'player' && status.sourceBombId != null) {
                    delete statuses[effectId];
                    continue;
                }
                tickEntityStatus(target, status, dt);
                if (!getEffectConfigV64(effectId)?.persistent && status.remainingMs <= 0) delete statuses[effectId];
            }
        }
    }

    function update(dt = 16.6667) {
        const state = getState();
        const fields = ensureFields(state);
        if (!state || !fields || !state.isPlaying || state.paused) return;
        const safeDt = clamp(Number(dt) || 16.6667, 0, 100);

        for (let i = fields.length - 1; i >= 0; i--) {
            const field = fields[i];
            if (!field || !definition(field.effectId)) {
                fields.splice(i, 1);
                continue;
            }
            field.remainingMs -= safeDt;
            if (field.remainingMs <= 0) {
                fields.splice(i, 1);
                continue;
            }
            syncFieldToEntities(field, safeDt);
        }

        updateEntityStatuses(safeDt);
    }

    function resolveBombEffectIds(bomb) {
        // La bomba no conoce el bioma: su configuración llega por datos de
        // instancia, etapa o Theme. Así agregar heat+cold, acid, vapor, etc.
        // no exige cambiar explodeBomb().
        return getBombEffectIdsV64(bomb);
    }

    function handleBombExplosion(payload) {
        const cells = Array.isArray(payload?.cells) ? payload.cells : [];
        if (!cells.length) return;
        runtime.lastEventId = Number(payload?.eventId || payload?.blastId || runtime.lastEventId + 1);
        const bomb = payload?.bomb || {};
        triggerBombFeedbackV61210(bomb);
        const effectIds = resolveBombEffectIds(bomb);
        if (!effectIds.length) return;

        for (const effectId of effectIds) {
            const feedbackCell = cells[0];
            if (feedbackCell) triggerElementalFeedbackV61210(effectId, feedbackCell.x, feedbackCell.y);
            const config = getEffectConfigV64(effectId);
            if (!config) continue;
            for (const cell of cells) {
                if (!cell) continue;
                depositField(effectId, cell.x, cell.y, {
                    durationMs: config.durationMs,
                    intensity: 1,
                    source: 'bomb',
                    owner: bomb.owner || 'player',
                    sourceBombId: bomb.id
                });
            }
        }
    }

    function applyEffectToAllEntitiesV64(effectId, options = {}) {
        const config = getEffectConfigV64(effectId);
        if (!config) return 0;
        let applied = 0;
        const bombOrigin = options.sourceBombId != null || String(options.source || '').includes('bomb');
        for (const target of collectEntities()) {
            if (bombOrigin && !isBombEffectTargetV61232(target)) continue;
            if (applyEntityStatus(target, effectId, options)) applied++;
        }
        return applied;
    }

    function installListener() {
        if (!global.gameEventBus || !EVENT) return false;
        if (global.__BOMB_EFFECTS_V64_INSTALLED__) {
            runtime.duplicateInstallAttempts++;
            return true;
        }
        global.gameEventBus.on(EVENT, handleBombExplosion, { key: LISTENER_KEY });
        global.__BOMB_EFFECTS_V64_INSTALLED__ = true;
        runtime.listenerInstalled = true;
        return true;
    }

    function reset() {
        const fields = ensureFields();
        if (fields) fields.length = 0;
        for (const target of collectEntities()) {
            if (target.entity?.__bombEffectStatusesV64) target.entity.__bombEffectStatusesV64 = Object.create(null);
        }
    }

    function snapshot() {
        const fields = ensureFields() || [];
        return fields.map(field => ({
            key: field.key,
            x: field.x,
            y: field.y,
            effectId: field.effectId,
            intensity: field.intensity,
            remainingMs: field.remainingMs,
            source: field.source,
            owner: field.owner,
            sourceBombId: field.sourceBombId
        }));
    }

    function validate() {
        const state = getState();
        const fields = ensureFields(state) || [];
        const errors = [];
        const keys = new Set();
        for (const field of fields) {
            const key = `${field?.key}|${field?.effectId}`;
            if (!definition(field?.effectId)) errors.push(`Efecto inválido: ${field?.effectId}`);
            if (!Number.isInteger(field?.x) || !Number.isInteger(field?.y)) errors.push('Campo con coordenada inválida');
            if (keys.has(key)) errors.push(`Campo duplicado: ${key}`);
            keys.add(key);
            if (Number(field?.remainingMs) <= 0) errors.push(`Campo expirado: ${key}`);
        }
        if (fields.length > MAX_FIELDS) errors.push(`Límite de campos superado: ${fields.length}/${MAX_FIELDS}`);

        for (const [pair, combo] of Object.entries(COMBINATIONS)) {
            const [a, b] = String(pair).split('|');
            if (!definition(a) || !definition(b)) errors.push(`Combinación inválida: ${pair}`);
            if (combo?.result && !definition(combo.result)) errors.push(`Resultado inválido en combinación: ${pair}`);
            for (const consumedId of combo?.consume || []) {
                if (!definition(consumedId)) errors.push(`Consumo inválido en combinación: ${pair} → ${consumedId}`);
            }
        }

        const listenerCount = global.gameEventBus?.listenerCount?.(EVENT) || 0;
        return {
            valid: errors.length === 0,
            version: VERSION,
            count: fields.length,
            max: MAX_FIELDS,
            listenerInstalled: global.gameEventBus ? listenerCount >= 1 : false,
            listenerCount,
            duplicateInstallAttempts: runtime.duplicateInstallAttempts,
            effects: Object.values(EFFECTS),
            combinations: Object.keys(COMBINATIONS),
            errors
        };
    }

    function draw(targetCtx) {
        const state = getState();
        const fields = ensureFields(state);
        const renderCtx = targetCtx;
        if (!state || !fields?.length || !renderCtx) return;

        renderCtx.save();
        const size = Number(global.BOMBER_ENGINE?.getTileSize?.() || TILE_SIZE || 48);
        const renderBudget = Number(global.getBomberRenderProfileV65?.().bombEffectBudget) || 360;
        let rendered = 0;
        for (const field of fields) {
            if (rendered >= renderBudget) break;
            const def = definition(field.effectId);
            if (!def) continue;
            const alpha = clamp(0.10 + Number(field.intensity || 1) * 0.15, 0.10, 0.34);
            const x = field.x * size;
            const y = field.y * size;
            renderCtx.globalAlpha = alpha;
            renderCtx.fillStyle = def.color;
            renderCtx.fillRect(x + 4, y + 4, size - 8, size - 8);
            renderCtx.globalAlpha = Math.min(0.55, alpha + 0.12);
            renderCtx.strokeStyle = def.core;
            renderCtx.lineWidth = 2;
            renderCtx.strokeRect(x + 7, y + 7, size - 14, size - 14);
            rendered++;
        }
        renderCtx.restore();
        renderCtx.globalAlpha = 1;
    }

    installListener();

    global.BOMB_EFFECTS_V64 = EFFECTS;
    global.BOMB_EFFECT_DEFS_V64 = EFFECT_DEFS;
    global.BOMB_EFFECT_COMBINATIONS_V64 = COMBINATIONS;
    global.getBombEffectIdsV64 = getBombEffectIdsV64;
    global.getBombEffectConfigV64 = getEffectConfigV64;
    global.getBombEffectStatusV64 = getEffectStatusV64;
    global.getBombEffectMovementModifiersV64 = getBombEffectMovementModifiersV64;
    global.getBombEffectEnemyMovementMultiplierV6306 = getBombEffectEnemyMovementMultiplierV6306;
    global.getBombEffectVisualStateV64 = getBombEffectVisualStateV64;
    global.forcePlayerColdDeathV64 = forcePlayerColdDeathV64;
    global.applyBombEffectToAllEntitiesV64 = applyEffectToAllEntitiesV64;
    global.depositBombEffectFieldV64 = depositField;
    global.bombEffectUpdateV64 = update;
    global.bombEffectResetV64 = reset;
    global.bombEffectSnapshotV64 = snapshot;
    global.bombEffectValidateV64 = validate;
    global.drawBombEffectsV64 = draw;
    global.triggerElementalFeedbackV61210 = triggerElementalFeedbackV61210;

    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.getBombEffects = () => ({ effects: EFFECTS, definitions: EFFECT_DEFS, combinations: COMBINATIONS, snapshot });
    global.BOMBER_ENGINE.getBombEffectStatus = getEffectStatusV64;
    global.BOMBER_ENGINE.getBombEffectMovementModifiers = getBombEffectMovementModifiersV64;
    global.BOMBER_ENGINE.validateBombEffects = validate;
    global.BOMBER_ENGINE.resetBombEffects = reset;
    global.BOMBER_ENGINE.getBombEffectSnapshot = snapshot;
    global.BOMBER_ENGINE.getBombEffectListenerAudit = () => ({
        event: EVENT,
        key: LISTENER_KEY,
        listenerCount: global.gameEventBus?.listenerCount?.(EVENT) || 0,
        installed: !!global.__BOMB_EFFECTS_V64_INSTALLED__,
        duplicateInstallAttempts: runtime.duplicateInstallAttempts
    });
})(window);
