// Bomberman Roguelike v6.30.10 — Bomb explosion event listeners
//
// These listeners intentionally know nothing about explodeBomb().
// The bomb system only publishes BOMBA_EXPLOTO.

(function installBombExplosionListeners(global) {
    'use strict';

    const bus = global.gameEventBus;
    const EVENT = global.GAME_EVENTS_V60?.BOMBA_EXPLOTO || global.GAME_EVENTS_V59?.BOMBA_EXPLOTO;

    if (!bus || !EVENT) {
        throw new Error('v5.9: Event Bus no disponible para BOMBA_EXPLOTO');
    }

    // Contrato completo del evento. El listener elemental se registra desde
    // 38-bomb-effects.js; no debe contarse como duplicado ni omitirse del audit.
    const LISTENER_KEYS = Object.freeze({
        SOUND: 'bomb-explosion:sound',
        BLOCKS: 'bomb-explosion:destroy-blocks',
        EFFECTS: 'bomb-explosion:effects'
    });

    const BASE_LISTENER_KEYS = Object.freeze([LISTENER_KEYS.SOUND, LISTENER_KEYS.BLOCKS]);

    function handleBombExplosionSound(payload) {
        if (!payload?.bomb) return;
        sfx('boom');
    }

    function handleBombExplosionBlockDestruction(payload) {
        const cells = Array.isArray(payload?.cells) ? payload.cells : [];

        for (const cell of cells) {
            if (!cell?.block) continue;

            const tx = Number(cell.x);
            const ty = Number(cell.y);
            const row = gameState.grid?.[ty];
            if (!row || tx < 0 || tx >= gameState.gridWidth) continue;

            // Listener idempotency: the event payload describes one blast,
            // but the grid is checked before mutating it. A duplicate event
            // cannot grant block rewards twice for the same cell.
            if (row[tx] !== TYPES.BLOCK) continue;

            row[tx] = TYPES.EMPTY;
            gameState.gridRevision = (gameState.gridRevision || 0) + 1;
            if (typeof invalidateRenderCacheV317 === 'function') invalidateRenderCacheV317();
            gameState.score += 10;
            gameState.blocksBroken++;

            const coins = Math.max(
                1,
                Math.round(
                    (1 + Math.random() * 2) *
                    (1 + gameState.coinBonus) *
                    gameState.roomType.coinMult
                )
            );
            gameState.coins += coins;
            addFloatingText(
                `+10  +${coins}¢`,
                (tx + 0.5) * TILE_SIZE,
                (ty + 0.5) * TILE_SIZE,
                '#fbbf24'
            );
            addParticles(
                (tx + 0.5) * TILE_SIZE,
                (ty + 0.5) * TILE_SIZE,
                'particleBlock',
                12
            );

            if (gameState.exitPos && gameState.exitPos.x === tx && gameState.exitPos.y === ty) {
                // La salida se revela bloqueada al destruir su cobertura.
                // Solo se abre cuando no quedan enemigos.
                gameState.grid[ty][tx] = TYPES.EXIT_LOCKED;
                gameState.exitUnlocked = false;
                if (typeof tryUnlockExitCurrentRoom === 'function' && tryUnlockExitCurrentRoom()) {
                    addFloatingText(
                        '🚪 SALIDA DESBLOQUEADA',
                        (tx + 0.5) * TILE_SIZE,
                        (ty + 0.5) * TILE_SIZE,
                        '#facc15'
                    );
                }
            } else if (Math.random() < gameState.roomType.dropChance) {
                const pool = typeof getPowerupDropPoolV67 === 'function' ? getPowerupDropPoolV67() : [POWERUPS.SPEED_UP, POWERUPS.HEALTH_UP, POWERUPS.SHIELD_UP];
                gameState.items.push({ x: tx, y: ty, type: pool[Math.floor(Math.random() * pool.length)] });
            }

            if (
                getAvailableRelics().length &&
                Math.random() < (gameState.roomType.id === 'TREASURE' ? 0.10 : 0.035)
            ) {
                const relicPool = getAvailableRelics();
                const relic = relicPool[Math.floor(Math.random() * relicPool.length)];
                gameState.items.push({
                    x: tx,
                    y: ty,
                    type: 'RELIC',
                    relicId: relic.id
                });
            }
        }
    }

    function install() {
        // Idempotencia a nivel de módulo: reinicializar el instalador no vuelve
        // a registrar listeners ni genera falsos positivos en la auditoría.
        if (global.__BOMB_EXPLOSION_LISTENERS_V59__) {
            return global.__BOMB_EXPLOSION_LISTENERS_V59__.subscriptions;
        }

        const soundOff = bus.on(EVENT, handleBombExplosionSound, { key: LISTENER_KEYS.SOUND });
        const blocksOff = bus.on(EVENT, handleBombExplosionBlockDestruction, { key: LISTENER_KEYS.BLOCKS });
        const subscriptions = Object.freeze({ soundOff, blocksOff });

        global.__BOMB_EXPLOSION_LISTENERS_V59__ = Object.freeze({ subscriptions });
        return subscriptions;
    }

    const subscriptions = install();

    function audit() {
        const base = bus.audit();
        const actual = bus.getListenerKeys(EVENT).slice().sort();
        const expected = Object.values(LISTENER_KEYS).slice().sort();
        const actualSet = new Set(actual);
        const errors = base.errors.slice();
        const missing = expected.filter(key => !actualSet.has(key));
        const unexpected = actual.filter(key => !expected.includes(key));

        if (missing.length) errors.push(`BOMBA_EXPLOTO sin listeners requeridos: ${missing.join(', ')}`);
        if (unexpected.length) errors.push(`BOMBA_EXPLOTO con listeners no registrados en el contrato: ${unexpected.join(', ')}`);
        if (actual.length !== actualSet.size) errors.push('BOMBA_EXPLOTO contiene claves de listener repetidas');

        return {
            ...base,
            event: EVENT,
            baseListenerKeys: BASE_LISTENER_KEYS.slice().sort(),
            expectedListenerKeys: expected,
            actualListenerKeys: actual,
            missingListenerKeys: missing,
            unexpectedListenerKeys: unexpected,
            valid: errors.length === 0,
            errors
        };
    }

    global.BOMB_EXPLOSION_EVENT_LISTENER_KEYS_V59 = LISTENER_KEYS;
    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.installBombExplosionListeners = install;
    global.BOMBER_ENGINE.getBombExplosionListenerKeys = () => Array.from(Object.values(LISTENER_KEYS));
    global.BOMBER_ENGINE.getBombExplosionSubscriptions = () => subscriptions;
    global.BOMBER_ENGINE.auditBombExplosionListeners = audit;
})(window);
