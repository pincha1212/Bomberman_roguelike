// Bomberman Roguelike v6.4 — Winter System
// Integración específica de Invierno para la arquitectura de efectos.
// El registry de efectos sigue siendo genérico; este módulo solo consume
// cold/heat y el estado de ventisca para cambiar las reglas del mundo.
(function installWinterSystemV64(global) {
    'use strict';

    const VERSION = '6.4.1';
    const ROLL_INTERVAL_MS = 360;
    const ENTITY_PUSH_PER_FRAME = 1.05;
    const GHOST_PUSH_PER_FRAME = 0.90;

    const runtime = {
        rollTimer: 0
    };

    function state() {
        return global.BOMBER_ENGINE?.getState?.() || global.gameState || null;
    }

    function isWinter(s = state()) {
        return String(s?.biomeV49?.id || '') === 'winter';
    }

    function getWindV64() {
        const s = state();
        if (!isWinter(s)) return null;
        const wind = s?.winterWindV64;
        if (!wind?.active) return null;
        if (!['x', 'y'].includes(wind.axis)) return null;
        const dir = Number(wind.dir);
        if (![-1, 1].includes(dir)) return null;
        return {
            axis: wind.axis,
            dir,
            strength: Math.max(0, Math.min(1.5, Number(wind.strength) || 0)),
            remainingMs: Math.max(0, Number(wind.remainingMs) || 0),
            source: String(wind.source || 'blizzard')
        };
    }

    function moveCardinal(entity, kind, axis, amount) {
        if (!entity || !amount || typeof global.gridMoveCardinal !== 'function') return false;
        const options = kind === 'enemy'
            ? { kind: 'enemy', canFly: !!entity.type?.canFly, laneLock: false, maxStep: 2, allowCurrentBombTile: true }
            : { kind: 'player', maxStep: 2, allowCurrentBombTile: true };
        const result = global.gridMoveCardinal(
            entity,
            axis === 'x' ? amount : 0,
            axis === 'y' ? amount : 0,
            options
        );
        return !!result?.moved;
    }

    function pushActor(entity, kind, wind, dt) {
        if (!entity || entity.defeated) return false;
        const frameScale = Math.max(0.5, Math.min(2, (Number(dt) || 16.6667) / 16.6667));
        const base = kind === 'death_echo' ? GHOST_PUSH_PER_FRAME : ENTITY_PUSH_PER_FRAME;
        return moveCardinal(entity, kind === 'enemy' ? 'enemy' : 'player', wind.axis, wind.dir * wind.strength * base * frameScale);
    }

    function bombAt(x, y, except = null) {
        const s = state();
        return Array.isArray(s?.bombs)
            ? s.bombs.find(b => b && b !== except && b.x === x && b.y === y && b.state !== 'moving' && b.motionState !== 'moving') || null
            : null;
    }

    function rollBombs(wind) {
        const s = state();
        if (!s || !Array.isArray(s.bombs)) return 0;
        let moved = 0;
        for (const bomb of s.bombs) {
            if (!bomb || bomb.state === 'moving' || bomb.motionState === 'moving') continue;
            if (bomb.timer <= 0) continue;
            const nx = bomb.x + (wind.axis === 'x' ? wind.dir : 0);
            const ny = bomb.y + (wind.axis === 'y' ? wind.dir : 0);
            if (nx < 1 || nx >= s.gridWidth - 1 || ny < 1 || ny >= s.gridHeight - 1) continue;
            if (s.grid?.[ny]?.[nx] !== TYPES.EMPTY) continue;
            if (bombAt(nx, ny, bomb)) continue;
            bomb.x = nx;
            bomb.y = ny;
            bomb.windRolls = (Number(bomb.windRolls) || 0) + 1;
            bomb.worldX = (nx + 0.5) * TILE_SIZE;
            bomb.worldY = (ny + 0.5) * TILE_SIZE;
            bomb.windTilt = wind.dir * 0.10;
            moved++;
        }
        return moved;
    }

    function update(dt = 16.6667) {
        const s = state();
        if (!s || !s.isPlaying || s.paused || !isWinter(s)) {
            if (s) s.winterWindV64 = null;
            runtime.rollTimer = 0;
            return;
        }

        const wind = getWindV64();
        if (!wind) {
            runtime.rollTimer = 0;
            return;
        }

        // El mundo comparte la misma regla de viento: jugador, enemigos y eco.
        pushActor(global.BOMBER_ENGINE?.getPlayer?.() || global.player, 'player', wind, dt);
        for (const enemy of Array.isArray(s.enemies) ? s.enemies : []) pushActor(enemy, 'enemy', wind, dt);
        const echo = typeof global.getActiveDeathEchoV61 === 'function'
            ? global.getActiveDeathEchoV61(s.level)
            : null;
        if (echo && !echo.defeated) pushActor(echo, 'death_echo', wind, dt);

        runtime.rollTimer -= Math.max(0, Number(dt) || 0);
        if (runtime.rollTimer <= 0) {
            runtime.rollTimer += ROLL_INTERVAL_MS;
            const rolled = rollBombs(wind);
            if (rolled && typeof global.recordRunEventV51 === 'function') {
                global.recordRunEventV51('hazard_interaction', {
                    kind: 'blizzard',
                    interaction: 'bomb_roll',
                    axis: wind.axis,
                    dir: wind.dir,
                    count: rolled
                });
            }
        }
    }

    function reset() {
        runtime.rollTimer = 0;
        const s = state();
        if (s) s.winterWindV64 = null;
    }

    function validate() {
        const s = state();
        const errors = [];
        const wind = getWindV64();
        if (wind && (!Number.isFinite(wind.remainingMs) || wind.remainingMs < 0)) errors.push('Viento con duración inválida');
        if (runtime.rollTimer < 0) errors.push('Temporizador de rodado inválido');
        return {
            valid: errors.length === 0,
            version: VERSION,
            winterActive: isWinter(s),
            windActive: !!wind,
            rollIntervalMs: ROLL_INTERVAL_MS,
            errors
        };
    }

    global.getWinterWindV64 = getWindV64;
    global.winterSystemUpdateV64 = update;
    global.winterSystemResetV64 = reset;
    global.winterSystemValidateV64 = validate;

    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.getWinterWind = getWindV64;
    global.BOMBER_ENGINE.updateWinterSystem = update;
    global.BOMBER_ENGINE.validateWinterSystem = validate;
})(window);
