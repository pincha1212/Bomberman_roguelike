// Bomberman Roguelike v5.1 — Run History
// Captura primero; interpreta después. Solo memoria de la run actual.
(function initRunHistoryV51(global) {
    'use strict';

    const MAX_EVENTS = 240;
    const COUNTER_KEYS = Object.freeze([
        'roomsStarted', 'roomsCompleted', 'bombsPlaced', 'explosions',
        'damageTaken', 'hazardInteractions', 'enemiesKilled', 'blocksBroken', 'deaths'
    ]);

    function createRunHistoryV51(runNumber = 0) {
        const counters = {};
        for (const key of COUNTER_KEYS) counters[key] = 0;
        return {
            version: 1,
            runNumber: Number(runNumber) || 0,
            startedAt: Date.now(),
            lastEventAt: 0,
            counters,
            events: []
        };
    }

    function ensureRunHistoryV51() {
        if (typeof gameState === 'undefined') return null;
        if (!gameState.runHistoryV51) gameState.runHistoryV51 = createRunHistoryV51(gameState.runNumber);
        return gameState.runHistoryV51;
    }

    function resetRunHistoryV51() {
        if (typeof gameState === 'undefined') return null;
        gameState.runHistoryV51 = createRunHistoryV51(gameState.runNumber);
        return gameState.runHistoryV51;
    }

    function incrementCounter(history, kind, data) {
        const map = {
            room_started: 'roomsStarted',
            room_completed: 'roomsCompleted',
            bomb_placed: 'bombsPlaced',
            explosion: 'explosions',
            damage_taken: 'damageTaken',
            hazard_interaction: 'hazardInteractions',
            enemy_killed: 'enemiesKilled',
            block_broken: 'blocksBroken',
            run_finished: 'deaths'
        };
        const counter = map[kind];
        if (counter) history.counters[counter] += Math.max(1, Number(data?.count) || 1);
        if (kind === 'run_finished' && data?.count == null) history.counters.deaths = Math.max(1, history.counters.deaths);
    }

    function recordRunEventV51(kind, data = {}) {
        const history = ensureRunHistoryV51();
        if (!history || !kind) return false;
        const event = Object.freeze({
            t: Math.max(0, Number(typeof gameState !== 'undefined' ? gameState.runElapsedMs : 0) || 0),
            kind: String(kind),
            level: Number(typeof gameState !== 'undefined' ? gameState.level : 0) || 0,
            biome: typeof gameState !== 'undefined' ? gameState.biomeV49?.id || null : null,
            stage: typeof gameState !== 'undefined' ? Number(gameState.biomeV49?.stage) || null : null,
            data: { ...data }
        });
        incrementCounter(history, event.kind, event.data);
        history.events.push(event);
        if (history.events.length > MAX_EVENTS) history.events.splice(0, history.events.length - MAX_EVENTS);
        history.lastEventAt = Date.now();
        return true;
    }

    function getRunHistorySummaryV51() {
        const history = ensureRunHistoryV51();
        if (!history) return null;
        return Object.freeze({
            version: history.version,
            runNumber: history.runNumber,
            counters: Object.freeze({ ...history.counters }),
            events: history.events.map(event => ({ ...event, data: { ...event.data } }))
        });
    }

    function wrapRuntime() {
        if (wrapRuntime.installed) return true;
        if (typeof global.startGame !== 'function' || typeof global.initLevel !== 'function') return false;

        wrapRuntime.originalStartGame = global.startGame;
        wrapRuntime.originalInitLevel = global.initLevel;
        wrapRuntime.originalPlaceBomb = typeof global.placeBomb === 'function' ? global.placeBomb : null;
        wrapRuntime.originalExplodeBomb = typeof global.explodeBomb === 'function' ? global.explodeBomb : null;
        wrapRuntime.originalTakeDamage = typeof global.takeDamage === 'function' ? global.takeDamage : null;
        wrapRuntime.originalCompleteLevel = typeof global.completeLevel === 'function' ? global.completeLevel : null;

        global.startGame = function startGameV51(...args) {
            const result = wrapRuntime.originalStartGame(...args);
            resetRunHistoryV51();
            recordRunEventV51('run_started');
            recordRunEventV51('room_started', {
                biome: gameState.biomeV49?.id || null,
                stage: Number(gameState.biomeV49?.stage) || null,
                roomType: gameState.roomType?.id || null,
                enemyTarget: Number(gameState.dungeonV44?.enemyTarget) || 0
            });
            return result;
        };

        global.initLevel = function initLevelV51(...args) {
            const result = wrapRuntime.originalInitLevel(...args);
            if (typeof gameState !== 'undefined' && gameState.runNumber) {
                recordRunEventV51('room_started', {
                    biome: gameState.biomeV49?.id || null,
                    stage: Number(gameState.biomeV49?.stage) || null,
                    roomType: gameState.roomType?.id || null,
                    enemyTarget: Number(gameState.dungeonV44?.enemyTarget) || 0
                });
            }
            return result;
        };

        if (wrapRuntime.originalPlaceBomb) {
            global.placeBomb = function placeBombV51(...args) {
                const result = wrapRuntime.originalPlaceBomb(...args);
                if (result) recordRunEventV51('bomb_placed', { reason: args[0] || 'manual' });
                return result;
            };
        }

        if (wrapRuntime.originalExplodeBomb) {
            global.explodeBomb = function explodeBombV51(...args) {
                const beforeBombs = Array.isArray(gameState?.bombs) ? gameState.bombs.length : 0;
                const beforeBlocks = Number(gameState?.blocksBroken) || 0;
                const beforeKills = Number(gameState?.totalKills) || 0;
                const result = wrapRuntime.originalExplodeBomb(...args);
                const afterBombs = Array.isArray(gameState?.bombs) ? gameState.bombs.length : 0;
                const detonated = Math.max(0, beforeBombs - afterBombs);
                const blocksBroken = Math.max(0, (Number(gameState?.blocksBroken) || 0) - beforeBlocks);
                const enemiesKilled = Math.max(0, (Number(gameState?.totalKills) || 0) - beforeKills);
                if (detonated || Array.isArray(gameState?.explosions) && gameState.explosions.length) recordRunEventV51('explosion', { count: Math.max(1, detonated) });
                if (blocksBroken) recordRunEventV51('block_broken', { count: blocksBroken });
                if (enemiesKilled) recordRunEventV51('enemy_killed', { count: enemiesKilled });
                return result;
            };
        }

        if (wrapRuntime.originalTakeDamage) {
            global.takeDamage = function takeDamageV51(...args) {
                const result = wrapRuntime.originalTakeDamage(...args);
                if (result) recordRunEventV51('damage_taken', { source: String(args[0] || 'unknown') });
                return result;
            };
        }

        if (wrapRuntime.originalCompleteLevel) {
            global.completeLevel = function completeLevelV51(...args) {
                recordRunEventV51('room_completed', { roomType: gameState.roomType?.id || null });
                return wrapRuntime.originalCompleteLevel(...args);
            };
        }

        wrapRuntime.installed = true;
        return true;
    }

    global.createRunHistoryV51 = createRunHistoryV51;
    global.resetRunHistoryV51 = resetRunHistoryV51;
    global.recordRunEventV51 = recordRunEventV51;
    global.getRunHistorySummaryV51 = getRunHistorySummaryV51;
    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.getRunHistory = getRunHistorySummaryV51;

    function bootstrap() {
        if (wrapRuntime()) return;
        setTimeout(bootstrap, 50);
    }
    bootstrap();
})(window);
