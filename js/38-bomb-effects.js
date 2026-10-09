// Bomberman Roguelike v6.30.9 — Independent bomb effects / one field authority
// Base simple y extensible para rastros/efectos de bombas.
//
// PRINCIPIOS
// - La bomba colocada declara exactamente su elemento y sus effectIds.
// - Cada efecto de campo funciona de forma independiente; no requiere que otra
//   bomba elemental alcance la misma casilla.
// - Dos efectos diferentes pueden coexistir en una casilla sin consumirse ni
//   crear un tercer efecto implícito.
// - Una bomba del mismo elemento que vuelva a alcanzar una casilla refresca el
//   campo existente; no multiplica el daño por acumulación artificial.
// - Solo el sistema base de detonación resuelve daño/hitboxes inmediatos.

(function installBombEffectSystemV64(global) {
    'use strict';

    const VERSION = '6.30.9';
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
        [EFFECTS.STEAM]: Object.freeze({ id:EFFECTS.STEAM, label:'Vapor', color:'#e2e8f0', core:'#ffffff', defaultDurationMs:2200, tickMs:300, damage:0, movementMultiplier:0.58, enemyMovementMultiplier:0.58, sourceKinds:Object.freeze(['bomb']), tags:Object.freeze(['bomb','steam','slow']), materialType: global.MATERIALS_V60?.STEAM || 'steam' }),
        [EFFECTS.PLASMA]: Object.freeze({ id:EFFECTS.PLASMA, label:'Plasma', color:'#c084fc', core:'#f5d0fe', defaultDurationMs:1500, tickMs:300, damage:1, movementMultiplier:0.92, enemyMovementMultiplier:0.92, sourceKinds:Object.freeze(['bomb']), tags:Object.freeze(['bomb','plasma','damage']) }),
        [EFFECTS.ARC]: Object.freeze({ id:EFFECTS.ARC, label:'Rayo extendido', color:'#fde047', core:'#ffffff', defaultDurationMs:900, tickMs:250, damage:1, movementMultiplier:0.90, enemyMovementMultiplier:0.90, sourceKinds:Object.freeze(['bomb']), tags:Object.freeze(['bomb','electric','extended','damage']) })
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

    function triggerBombFeedbackV61210(bomb, chainIndex = 1) {
        if (!bomb) return false;
        const originX = (finite(bomb.x) + 0.5) * TILE_SIZE;
        const originY = (finite(bomb.y) + 0.5) * TILE_SIZE;
        // Limpiar residuos circulares históricos en el origen de cada detonación,
        // incluidas las bombas que explotan por cadena.
        if (typeof global.feedbackPoolClearExplosionResidue === 'function') {
            global.feedbackPoolClearExplosionResidue(originX, originY, TILE_SIZE * 1.1);
        }
        const range = Math.max(1, finite(bomb.range, 1));
        const chain = clamp(finite(chainIndex, 1), 1, 8);
        const intensity = clamp(3.4 + range * 0.22 + chain * 0.28, 3.5, 7);
        // La vibración es breve y limitada; no se acumula como un temblor largo.
        const duration = clamp(50 + range * 1.5 + chain * 4, 50, 100);
        if (typeof global.triggerScreenShake === 'function') global.triggerScreenShake(intensity, duration);
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
        // La bomba colocada es la fuente de verdad. Un array vacío es deliberado
        // (bomba normal) y no debe convertirse en todos los efectos del tema/etapa.
        if (Array.isArray(bomb.effectIds)) return normalizeEffectIds(bomb.effectIds);

        // Compatibilidad con bombas antiguas que solo guarden elementV612.
        const element = String(bomb.elementV612 || 'normal').toLowerCase();
        if (typeof global.getBombElementDefV612 === 'function') {
            const def = global.getBombElementDefV612(bomb);
            if (def && Array.isArray(def.effectIds)) return normalizeEffectIds(def.effectIds);
        }
        const elementalMap = {
            normal: [],
            fire: [EFFECTS.HEAT],
            ice: [EFFECTS.FROST],
            electric: [EFFECTS.SHOCK]
        };
        return normalizeEffectIds(elementalMap[element] || []);
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
    // los efectos elementales de control (escarcha, vapor y descarga) ralentizan mientras el estado viva.
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

    function findField(fields, effectId, x, y) {
        const key = tileKey(x, y);
        return fields.find(field => field?.key === key && field.effectId === effectId) || null;
    }

    function depositFieldInternal(effectId, x, y, options = {}) {
        const fields = ensureFields();
        const config = getEffectConfigV64(effectId);
        const tx = Math.trunc(Number(x));
        const ty = Math.trunc(Number(y));
        if (!fields || !config || !Number.isInteger(tx) || !Number.isInteger(ty)) return false;

        const durationMs = Math.max(80, finite(options.durationMs, config.durationMs));
        const intensity = clamp(finite(options.intensity, 1), 0.1, 2);
        const existing = findField(fields, effectId, tx, ty);

        // Mismo efecto en la misma casilla: refrescar duración. No acumular
        // intensidad ni reemplazar el efecto por una combinación implícita.
        if (existing) {
            existing.remainingMs = Math.max(existing.remainingMs, durationMs);
            existing.visualAgeMs = 0;
            existing.visualTotalMs = Math.max(existing.visualTotalMs, durationMs);
            existing.intensity = Math.max(existing.intensity, intensity);
            existing.source = String(options.source || existing.source || 'system');
            existing.owner = String(options.owner || existing.owner || 'system');
            if (options.sourceBombId != null) existing.sourceBombId = String(options.sourceBombId);
            existing.lastEventId = runtime.lastEventId;
            existing.createdEventId = runtime.lastEventId;
            return true;
        }

        if (fields.length >= MAX_FIELDS) return false;
        fields.push({
            key: tileKey(tx, ty),
            x: tx,
            y: ty,
            effectId,
            intensity,
            remainingMs: durationMs,
            visualAgeMs: 0,
            visualTotalMs: durationMs,
            tickAccumulatorMs: 0,
            source: String(options.source || 'system'),
            owner: String(options.owner || 'system'),
            sourceBombId: options.sourceBombId == null ? null : String(options.sourceBombId),
            createdEventId: runtime.lastEventId
        });
        return true;
    }


    function depositField(effectId, x, y, options = {}) {
        return depositFieldInternal(effectId, x, y, options);
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
            // de una explosión elemental.
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
        if (!state || !fields) return;
        if (!state.isPlaying) {
            if (typeof global.resetBombBlastVisualsV6308 === 'function') global.resetBombBlastVisualsV6308();
            return;
        }
        if (state.paused) return;
        const safeDt = clamp(Number(dt) || 16.6667, 0, 100);
        if (typeof global.updateBombBlastVisualsV6308 === 'function') global.updateBombBlastVisualsV6308(safeDt);

        for (let i = fields.length - 1; i >= 0; i--) {
            const field = fields[i];
            if (!field || !definition(field.effectId)) {
                fields.splice(i, 1);
                continue;
            }
            field.remainingMs -= safeDt;
            field.visualAgeMs = Math.max(0, finite(field.visualAgeMs, 0) + safeDt);
            field.visualTotalMs = Math.max(finite(field.visualTotalMs, 0), field.visualAgeMs + Math.max(0, field.remainingMs));
            if (field.remainingMs <= 0) {
                fields.splice(i, 1);
                continue;
            }
            syncFieldToEntities(field, safeDt);
        }

        updateEntityStatuses(safeDt);
    }

    function resolveBombEffectIds(bomb) {
        return getBombEffectIdsV64(bomb || {});
    }


    function handleBombExplosion(payload) {
        const cells = Array.isArray(payload?.cells) ? payload.cells : [];
        if (!cells.length) return;
        runtime.lastEventId = Number(payload?.eventId || payload?.blastId || runtime.lastEventId + 1);
        const bomb = payload?.bomb || {};

        // Las hitboxes inmediatas siguen siendo responsabilidad de 20-combat.js.
        // Esta ruta registra solamente la animación y los campos persistentes.
        if (typeof global.registerBombBlastVisualV6308 === 'function') {
            global.registerBombBlastVisualV6308(payload);
        }
        triggerBombFeedbackV61210(bomb, payload?.chainIndex || 1);

        const effectIds = resolveBombEffectIds(bomb);
        if (!effectIds.length) return;
        const sourceBombId = bomb.id == null
            ? String(payload?.blastId ?? runtime.lastEventId)
            : String(bomb.id);

        // Deduplicar coordenadas dentro de este evento. Cada effectId deposita
        // su propio campo; no se combinan, consumen ni transforman por tocarse.
        const uniqueCells = new Map();
        for (const cell of cells) {
            const x = Math.trunc(Number(cell?.x));
            const y = Math.trunc(Number(cell?.y));
            if (Number.isInteger(x) && Number.isInteger(y)) uniqueCells.set(tileKey(x, y), { x, y });
        }

        for (const effectId of effectIds) {
            const config = getEffectConfigV64(effectId);
            if (!config) continue;
            for (const cell of uniqueCells.values()) {
                depositField(effectId, cell.x, cell.y, {
                    durationMs: config.durationMs,
                    intensity: 1,
                    source: 'bomb',
                    owner: bomb.owner || 'player',
                    sourceBombId
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
        if (typeof global.resetBombBlastVisualsV6308 === 'function') global.resetBombBlastVisualsV6308();
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
            errors
        };
    }

    function draw(targetCtx) {
        // Compatibilidad sin dibujo duplicado: el único renderer de residuos es 07-render.js.
        // No se dibujan rectángulos/contornos por tile desde este registro de lógica.
        return 0;
    }

    installListener();

    global.BOMB_EFFECTS_V64 = EFFECTS;
    global.BOMB_EFFECT_DEFS_V64 = EFFECT_DEFS;
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

    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.getBombEffects = () => ({ effects: EFFECTS, definitions: EFFECT_DEFS, snapshot });
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
