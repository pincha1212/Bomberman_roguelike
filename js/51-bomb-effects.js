// Bomberman Roguelike v6.4 — Bomb Effect Registry
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

    const VERSION = '6.4.1';
    const EVENT = global.GAME_EVENTS_V60?.BOMBA_EXPLOTO || global.GAME_EVENTS_V59?.BOMBA_EXPLOTO;
    const LISTENER_KEY = 'bomb-explosion:effects';
    const MAX_FIELDS = 420;
    const MAX_ENTITY_STATUSES = 128;

    const EFFECTS = Object.freeze({
        HEAT: 'heat',
        COLD: 'cold'
    });

    const EFFECT_DEFS = Object.freeze({
        [EFFECTS.HEAT]: Object.freeze({
            id: EFFECTS.HEAT,
            label: 'Calor',
            color: '#ffb347',
            core: '#fff7ed',
            defaultDurationMs: 3000,
            tickMs: 250,
            damage: 0,
            sourceKinds: Object.freeze(['bomb']),
            warmingPerSecond: 2400,
            movementMultiplier: 1.05,
            tags: Object.freeze(['bomb', 'winter', 'support'])
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
        })
    });

    // Una tabla de combinaciones. Se puede ampliar con pares nuevos sin tocar
    // los sistemas de bomba, render o entidades.
    const COMBINATIONS = Object.freeze({
        'cold|heat': Object.freeze({
            result: EFFECTS.HEAT,
            consume: Object.freeze([EFFECTS.COLD, EFFECTS.HEAT]),
            message: 'DESCONGELADO'
        })
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

    function getBombEffectMovementModifiersV64(entity) {
        const cold = getEffectStatusV64(entity, EFFECTS.COLD);
        const heat = getEffectStatusV64(entity, EFFECTS.HEAT);
        let speedMultiplier = 1;
        let inputBufferMultiplier = 1;
        let brakingMultiplier = 1;
        let turnCarryMultiplier = 1;

        if (heat) speedMultiplier *= getEffectConfigV64(EFFECTS.HEAT)?.movementMultiplier || 1;
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

    function getEntityId(entity) {
        if (!entity || typeof entity !== 'object') return null;
        if (!Object.prototype.hasOwnProperty.call(entity, '__bombEffectEntityIdV64')) {
            Object.defineProperty(entity, '__bombEffectEntityIdV64', {
                value: `efx-${Math.random().toString(36).slice(2, 10)}`,
                enumerable: false,
                configurable: false,
                writable: false
            });
        }
        return entity.__bombEffectEntityIdV64;
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

    function showEffectMessage(effectId, x, y) {
        if (typeof global.addFloatingText !== 'function') return;
        const def = definition(effectId);
        if (!def) return;
        global.addFloatingText(
            def.label.toUpperCase(),
            (x + 0.5) * TILE_SIZE,
            (y + 0.28) * TILE_SIZE,
            def.color
        );
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

    function combinationFor(a, b) {
        const pair = [String(a), String(b)].sort().join('|');
        return COMBINATIONS[pair] || null;
    }

    function depositField(effectId, x, y, options = {}) {
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
            if (existing.effectId === effectId) continue;
            const combo = combinationFor(existing.effectId, effectId);
            if (!combo) continue;

            for (const consumedId of combo.consume || []) {
                const consumed = findField(fields, consumedId, tx, ty);
                if (consumed) removeField(fields, consumed);
            }
            if (combo.result) {
                const created = depositField(combo.result, tx, ty, {
                    source: 'combination',
                    durationMs: options.durationMs
                });
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

    function clearEntityEffect(entity, effectId) {
        const statuses = ensureEntityStatuses(entity);
        if (!statuses || !statuses[effectId]) return false;
        delete statuses[effectId];
        return true;
    }

    function applyEntityStatus(target, effectId, options = {}) {
        const entity = target?.entity || target;
        const kind = target?.kind || 'generic';
        const config = getEffectConfigV64(effectId);
        if (!entity || !config) return false;

        const statuses = ensureEntityStatuses(entity);
        if (!statuses) return false;
        const defaultDuration = config.persistent ? Infinity : config.durationMs;
        const durationMs = config.persistent ? Infinity : Math.max(80, finite(options.durationMs, defaultDuration));
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
        if (target?.kind === 'player' && typeof global.winterPowerupBlocksHeatHealingV67 === 'function' && global.winterPowerupBlocksHeatHealingV67()) return false;
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
        if (typeof global.tryUnlockExitV44 === 'function') global.tryUnlockExitV44();
        return true;
    }

    function forcePlayerColdDeathV64(source = 'effect:cold') {
        const p = getPlayer();
        const state = getState();
        if (!p || !state || !state.isPlaying) return false;
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
            return !!global.damageBoss(amount);
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
                if (target?.kind === 'player' && typeof global.winterPowerupBlocksColdV67 === 'function' && global.winterPowerupBlocksColdV67()) {
                    delete target.entity.__bombEffectStatusesV64[EFFECTS.COLD];
                    continue;
                }
                const exposureMultiplier = target?.kind === 'player' && typeof global.getWinterPowerupColdExposureMultiplierV67 === 'function'
                    ? Number(global.getWinterPowerupColdExposureMultiplierV67()) || 1
                    : 1;
                status.exposureMs = clamp(
                    finite(status.exposureMs, 0) + config.tickMs * Math.max(0.1, status.intensity) * exposureMultiplier,
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

            if (config.damage > 0) {
                damageTarget(target, Math.max(1, Math.round(config.damage * status.intensity)), `effect:${status.effectId}`);
            }
        }
    }

    function syncFieldToEntities(field, dt) {
        const targets = collectEntities();
        for (const target of targets) {
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
        const effectIds = resolveBombEffectIds(bomb);
        if (!effectIds.length) return;

        for (const effectId of effectIds) {
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
        for (const target of collectEntities()) {
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
    global.getBombEffectVisualStateV64 = getBombEffectVisualStateV64;
    global.forcePlayerColdDeathV64 = forcePlayerColdDeathV64;
    global.applyBombEffectToAllEntitiesV64 = applyEffectToAllEntitiesV64;
    global.bombEffectUpdateV64 = update;
    global.bombEffectResetV64 = reset;
    global.bombEffectSnapshotV64 = snapshot;
    global.bombEffectValidateV64 = validate;
    global.drawBombEffectsV64 = draw;

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
