// Bomberman Roguelike v6.1 — Eco de Muerte
// Un eco persistente por profundidad, inspirado en el concepto de fantasma
// vengativo: conserva una copia inmutable del build que murió y la reutiliza
// como enemigo autónomo en futuros intentos.
//
// Diseño deliberadamente acotado:
// - El eco persiste en localStorage, separado del save de la run actual.
// - Solo se guarda el último eco de cada profundidad.
// - El eco no comparte la referencia del jugador ni reutiliza sus objetos.
// - Sus bombas entran al sistema de bombas/eventos existente con owner propio.
// - La IA es determinista por decisión: persigue, busca alineación y huye de
//   explosiones predecibles después de colocar una bomba.
(function installDeathEchoV61(global) {
    'use strict';

    const VERSION = '6.1.0';
    if (global.__DEATH_ECHO_V61_INSTALLED__) return;
    global.__DEATH_ECHO_V61_INSTALLED__ = true;

    const STORAGE_KEY = 'bombermanDeathEchoesV61';
    const MAX_ECHOES = 44;
    const GHOST_OWNER = 'death_echo';
    const DECISION_MS = 220;
    const BOMB_COOLDOWN_MS = 1150;
    const GHOST_HEALTH_DEFAULT = 3;

    const state = {
        checkedLevel: null,
        active: null,
        installCount: 0,
        decisionTimer: 0,
        bombCooldown: 0,
        aiStep: 0,
        originalInitLevel: null,
        wrappedInitLevel: false
    };

    function number(value, fallback = 0) {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function clone(value) {
        return value == null ? value : JSON.parse(JSON.stringify(value));
    }

    function centerTile(entity) {
        if (!entity) return { x: 1, y: 1 };
        return {
            x: Math.floor((number(entity.x) + number(entity.width, TILE_SIZE * 0.7) / 2) / TILE_SIZE),
            y: Math.floor((number(entity.y) + number(entity.height, TILE_SIZE * 0.7) / 2) / TILE_SIZE)
        };
    }

    function readStore() {
        try {
            const raw = global.localStorage?.getItem(STORAGE_KEY);
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
            return parsed;
        } catch (_) {
            return {};
        }
    }

    function writeStore(store) {
        try {
            global.localStorage?.setItem(STORAGE_KEY, JSON.stringify(store));
            return true;
        } catch (_) {
            return false;
        }
    }

    function getEcho(depth) {
        const store = readStore();
        const echo = store[String(depth)];
        if (!echo || echo.version !== VERSION) return null;
        return echo;
    }

    function saveEcho(echo) {
        const depth = clamp(Math.floor(number(echo?.level, 0)), 1, MAX_ECHOES);
        if (!depth || !echo) return false;
        const store = readStore();
        store[String(depth)] = clone(echo);
        const keys = Object.keys(store).sort((a, b) => Number(a) - Number(b));
        while (keys.length > MAX_ECHOES) {
            delete store[keys.shift()];
        }
        return writeStore(store);
    }

    function clearEcho(depth) {
        const store = readStore();
        delete store[String(Math.floor(number(depth)))];
        return writeStore(store);
    }

    function snapshotRelics() {
        if (typeof gameState === 'undefined' || !Array.isArray(gameState.relics)) return [];
        return gameState.relics.map(relic => ({
            id: String(relic?.id || ''),
            name: String(relic?.name || ''),
            icon: String(relic?.icon || '◆'),
            category: String(relic?.category || 'BOMB')
        })).filter(item => item.id);
    }

    function snapshotPlayerBuild() {
        const relicMods = typeof gameState !== 'undefined' && gameState.relicMods
            ? clone({
                bombFuseMultiplier: number(gameState.relicMods.bombFuseMultiplier, 1),
                turnAssistBonus: number(gameState.relicMods.turnAssistBonus, 0),
                turnSnapBonus: number(gameState.relicMods.turnSnapBonus, 0),
                inputBufferBonus: number(gameState.relicMods.inputBufferBonus, 0),
                unstablePowder: !!gameState.relicMods.unstablePowder,
                economyBonus: number(gameState.relicMods.economyBonus, 0)
            })
            : {};

        return {
            speed: clamp(number(player?.speed, 3), 1, 8),
            maxBombs: clamp(Math.floor(number(player?.maxBombs, 1)), 1, 8),
            bombRange: clamp(Math.floor(number(player?.bombRange, 1)), 1, 12),
            maxHealth: clamp(Math.floor(number(player?.maxHealth, 5)), 1, 10),
            hasShield: !!player?.hasShield,
            dir: ['up', 'down', 'left', 'right'].includes(player?.dir) ? player.dir : 'down',
            relicMods
        };
    }

    function createDeathEchoSnapshot(source = 'unknown') {
        if (typeof gameState === 'undefined' || !player) return null;
        const level = Math.floor(number(gameState.level, 0));
        if (level < 1 || level > MAX_ECHOES) return null;

        const tile = centerTile(player);
        const relics = snapshotRelics();
        const build = snapshotPlayerBuild();
        const bombFuseMultiplier = Math.max(0.5, number(build.relicMods.bombFuseMultiplier, 1));

        return Object.freeze({
            version: VERSION,
            echoId: `echo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            createdAt: Date.now(),
            sourceRun: Math.floor(number(gameState.runNumber, 0)),
            level,
            cause: String(source || 'unknown'),
            position: { x: tile.x, y: tile.y },
            build: Object.freeze({
                ...build,
                relicMods: Object.freeze(build.relicMods),
                bombFuseMultiplier
            }),
            relics: Object.freeze(relics.map(item => Object.freeze(item)))
        });
    }

    function recordDeathEchoV61(source = 'unknown') {
        const echo = createDeathEchoSnapshot(source);
        if (!echo) return null;
        if (!saveEcho(echo)) return null;
        return echo;
    }

    function isInsideGrid(x, y) {
        return x >= 0 && y >= 0 && x < gameState.gridWidth && y < gameState.gridHeight;
    }

    function isPassableTile(x, y) {
        if (!isInsideGrid(x, y)) return false;
        const type = gameState.grid?.[y]?.[x];
        return type === TYPES.EMPTY || type === TYPES.EXIT_OPEN || type === TYPES.EXIT_LOCKED;
    }

    function bombAtTile(x, y) {
        return gameState.bombs?.some(b => b && Number(b.x) === x && Number(b.y) === y) || false;
    }

    function nearestSpawnTile(origin, playerTile) {
        const ox = clamp(Math.floor(number(origin?.x, 1)), 1, gameState.gridWidth - 2);
        const oy = clamp(Math.floor(number(origin?.y, 1)), 1, gameState.gridHeight - 2);
        const candidates = [];

        for (let y = 1; y < gameState.gridHeight - 1; y++) {
            for (let x = 1; x < gameState.gridWidth - 1; x++) {
                if (!isPassableTile(x, y) || bombAtTile(x, y)) continue;
                const targetDistance = Math.abs(x - playerTile.x) + Math.abs(y - playerTile.y);
                const savedDistance = Math.abs(x - ox) + Math.abs(y - oy);
                candidates.push({ x, y, targetDistance, savedDistance });
            }
        }

        candidates.sort((a, b) => {
            const aSafe = a.targetDistance >= 5 ? 0 : 1;
            const bSafe = b.targetDistance >= 5 ? 0 : 1;
            return aSafe - bSafe || a.savedDistance - b.savedDistance || a.targetDistance - b.targetDistance || a.y - b.y || a.x - b.x;
        });

        return candidates[0] || { x: 1, y: 1 };
    }

    function tileFromGhost(ghost) {
        return {
            x: Math.floor((number(ghost.x) + ghost.width / 2) / TILE_SIZE),
            y: Math.floor((number(ghost.y) + ghost.height / 2) / TILE_SIZE)
        };
    }

    function tileFromPlayer() {
        return centerTile(player);
    }

    function cellKey(x, y) {
        return `${x},${y}`;
    }

    function collectDangerCells() {
        const danger = new Set();
        for (const explosion of gameState.explosions || []) {
            if (explosion) danger.add(cellKey(Number(explosion.x), Number(explosion.y)));
        }
        for (const bomb of gameState.bombs || []) {
            if (!bomb || bomb.state === 'moving' || bomb.motionState === 'moving') continue;
            try {
                const cells = typeof calculateBombBlastCells === 'function' ? calculateBombBlastCells(bomb) : [];
                for (const cell of cells) {
                    if (cell) danger.add(cellKey(Number(cell.x), Number(cell.y)));
                }
            } catch (_) {}
        }
        return danger;
    }

    function pathDistance(start, goal, danger) {
        if (start.x === goal.x && start.y === goal.y) return 0;
        const queue = [{ x: start.x, y: start.y, distance: 0 }];
        const visited = new Set([cellKey(start.x, start.y)]);
        const dirs = [[1,0],[-1,0],[0,1],[0,-1]];

        while (queue.length) {
            const current = queue.shift();
            for (const [dx, dy] of dirs) {
                const x = current.x + dx;
                const y = current.y + dy;
                const key = cellKey(x, y);
                if (visited.has(key) || !isPassableTile(x, y)) continue;
                if (x === goal.x && y === goal.y) return current.distance + 1;
                visited.add(key);
                queue.push({ x, y, distance: current.distance + 1 });
            }
        }
        return 999;
    }

    function chooseStep(ghost) {
        const start = tileFromGhost(ghost);
        const target = tileFromPlayer();
        const danger = collectDangerCells();
        const dirs = [
            { dx: 0, dy: 0, bias: 3 },
            { dx: 1, dy: 0, bias: 0 },
            { dx: -1, dy: 0, bias: 0 },
            { dx: 0, dy: 1, bias: 0 },
            { dx: 0, dy: -1, bias: 0 }
        ];

        const ranked = [];
        for (const dir of dirs) {
            const x = start.x + dir.dx;
            const y = start.y + dir.dy;
            if (!isPassableTile(x, y)) continue;
            if (bombAtTile(x, y) && !(x === start.x && y === start.y)) continue;
            const key = cellKey(x, y);
            const inDanger = danger.has(key);
            const distance = pathDistance({ x, y }, target, danger);
            const manhattan = Math.abs(x - target.x) + Math.abs(y - target.y);
            ranked.push({
                x,
                y,
                score: (inDanger ? 1200 : 0) + distance * 10 + manhattan * 1.5 + dir.bias
            });
        }

        ranked.sort((a, b) => a.score - b.score || a.y - b.y || a.x - b.x);
        return ranked[0] || start;
    }

    function hasLineToPlayer(ghost, range) {
        const start = tileFromGhost(ghost);
        const target = tileFromPlayer();
        const cells = typeof calculateBombBlastCells === 'function'
            ? calculateBombBlastCells({ x: start.x, y: start.y, range })
            : [];
        return cells.some(cell => Number(cell.x) === target.x && Number(cell.y) === target.y);
    }

    function ghostBombCount(ghost) {
        return (gameState.bombs || []).filter(b => b && b.owner === GHOST_OWNER && b.echoId === ghost.echoId).length;
    }

    function canGhostEscapeAfterBomb(ghost) {
        const start = tileFromGhost(ghost);
        const testBomb = { x: start.x, y: start.y, range: ghost.bombRange };
        const blastCells = typeof calculateBombBlastCells === 'function' ? calculateBombBlastCells(testBomb) : [];
        const blast = new Set(blastCells.map(cell => cellKey(Number(cell.x), Number(cell.y))));
        const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
        const queue = [{ x: start.x, y: start.y, distance: 0 }];
        const visited = new Set([cellKey(start.x, start.y)]);
        const MAX_ESCAPE_STEPS = Math.max(4, ghost.bombRange + 2);

        while (queue.length) {
            const current = queue.shift();
            for (const [dx, dy] of dirs) {
                const x = current.x + dx;
                const y = current.y + dy;
                const key = cellKey(x, y);
                if (visited.has(key) || !isPassableTile(x, y) || bombAtTile(x, y)) continue;
                const distance = current.distance + 1;
                visited.add(key);

                // Una casilla fuera del blast permite sobrevivir a la bomba.
                if (!blast.has(key) && distance <= MAX_ESCAPE_STEPS) return true;
                if (distance < MAX_ESCAPE_STEPS) queue.push({ x, y, distance });
            }
        }
        return false;
    }

    function createGhostBomb(ghost) {
        if (!ghost || !gameState.isPlaying || gameState.paused) return false;
        if (ghostBombCount(ghost) >= ghost.maxBombs) return false;
        if (state.bombCooldown > 0) return false;

        const tile = tileFromGhost(ghost);
        if (!isPassableTile(tile.x, tile.y) || bombAtTile(tile.x, tile.y)) return false;
        if (!canGhostEscapeAfterBomb(ghost)) return false;

        const baseFuse = gameState.roomType?.id === 'CURSED' ? BOMB_HANDLING.cursedFuse : BOMB_HANDLING.normalFuse;
        const fuseTotal = Math.max(700, Math.round(baseFuse * ghost.bombFuseMultiplier));
        const bomb = {
            id: `echo-bomb-${ghost.echoId}-${gameState.animFrame}-${Math.random().toString(36).slice(2, 6)}`,
            owner: GHOST_OWNER,
            echoId: ghost.echoId,
            x: tile.x,
            y: tile.y,
            range: ghost.bombRange,
            timer: fuseTotal,
            fuseTotal,
            warnBucket: Math.ceil(fuseTotal / 300),
            scalePulse: 1,
            previewTimer: 0,
            previewCells: [],
            previewGrid: gameState.grid,
            previewGridRevision: gameState.gridRevision || 0,
            state: BOMB_V4_STATES.ARMED,
            motionState: 'idle',
            worldX: (tile.x + .5) * TILE_SIZE,
            worldY: (tile.y + .5) * TILE_SIZE,
            motionProgress: 1,
            motionTimer: 0,
            motionDuration: 0,
            motionStartX: (tile.x + .5) * TILE_SIZE,
            motionStartY: (tile.y + .5) * TILE_SIZE,
            motionTargetX: (tile.x + .5) * TILE_SIZE,
            motionTargetY: (tile.y + .5) * TILE_SIZE,
            motionArc: 0,
            motionRotation: 0,
            motionRotationSpeed: 0,
            bobPhase: 0,
            playerPassThrough: false,
            justArmed: true,
            placedAtFrame: gameState.animFrame,
            placementReason: 'death-echo',
            countsTowardPlayerCapacity: false,
            canKick: false,
            canPush: false,
            canCarry: false,
            carriedBy: null,
            interactionState: 'free'
        };

        gameState.bombs.push(bomb);
        state.bombCooldown = BOMB_COOLDOWN_MS;
        if (typeof addParticles === 'function') addParticles(ghost.x + ghost.width / 2, ghost.y + ghost.height / 2, 'particleDanger', 8);
        return true;
    }

    function moveGhostToward(ghost, targetTile, dt) {
        const targetX = targetTile.x * TILE_SIZE + TILE_SIZE / 2 - ghost.width / 2;
        const targetY = targetTile.y * TILE_SIZE + TILE_SIZE / 2 - ghost.height / 2;
        const dx = targetX - ghost.x;
        const dy = targetY - ghost.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 0.5) return;

        const maxStep = ghost.speed * Math.max(0.5, Math.min(2, number(dt, 16.6667) / 16.6667));
        const step = Math.min(maxStep, distance);
        ghost.x += dx / distance * step;
        ghost.y += dy / distance * step;
        ghost.dir = Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
    }

    function recoverEchoItems(ghost) {
        const relics = Array.isArray(ghost.relics) ? ghost.relics : [];
        const recovered = [];
        if (typeof RELICS !== 'undefined' && typeof grantRelic === 'function') {
            for (const saved of relics) {
                const relic = RELICS.find(candidate => candidate.id === saved.id);
                if (!relic) continue;
                if (grantRelic(relic)) recovered.push(relic);
            }
        }

        if (recovered.length) {
            if (typeof addFloatingText === 'function') addFloatingText(`ECO RECUPERADO ×${recovered.length}`, ghost.x, ghost.y, '#c4b5fd');
            if (typeof addParticles === 'function') addParticles(ghost.x + ghost.width / 2, ghost.y + ghost.height / 2, 'particleImpact', 18);
        } else if (typeof addFloatingText === 'function') {
            addFloatingText('ECO DISIPADO', ghost.x, ghost.y, '#94a3b8');
        }

        clearEcho(ghost.level);
        state.active = null;
        gameState.deathEchoV61 = null;
        state.checkedLevel = Number(gameState.level);
        return recovered;
    }

    function damageDeathEchoV61(explosion) {
        const ghost = state.active;
        if (!ghost || ghost.defeated || !explosion) return false;
        if (ghost.lastHitBlastId === explosion.blastId) return false;
        const rect = {
            left: ghost.x + ghost.width * 0.25,
            right: ghost.x + ghost.width * 0.75,
            top: ghost.y + ghost.height * 0.20,
            bottom: ghost.y + ghost.height * 0.82
        };
        const cell = typeof getExplosionCellRect === 'function' ? getExplosionCellRect(explosion, 5) : {
            left: Number(explosion.x) * TILE_SIZE + 5,
            right: (Number(explosion.x) + 1) * TILE_SIZE - 5,
            top: Number(explosion.y) * TILE_SIZE + 5,
            bottom: (Number(explosion.y) + 1) * TILE_SIZE - 5
        };
        const overlap = rect.right > cell.left && rect.left < cell.right && rect.bottom > cell.top && rect.top < cell.bottom;
        if (!overlap) return false;

        ghost.lastHitBlastId = explosion.blastId;
        if (ghost.hasShield) {
            ghost.hasShield = false;
            ghost.hitFlash = 180;
            if (typeof addParticles === 'function') addParticles(ghost.x + ghost.width / 2, ghost.y + ghost.height / 2, 'particleShield', 12);
            return true;
        }

        ghost.health = Math.max(0, ghost.health - 1);
        ghost.hitFlash = 130;
        if (typeof addParticles === 'function') addParticles(ghost.x + ghost.width / 2, ghost.y + ghost.height / 2, 'particleDanger', 10);
        if (ghost.health <= 0) {
            ghost.defeated = true;
            recoverEchoItems(ghost);
        }
        return true;
    }

    function syncDeathEchoV61() {
        if (typeof gameState === 'undefined' || !gameState.isPlaying) return state.active;
        const level = Math.floor(number(gameState.level, 0));
        if (level < 1 || level > MAX_ECHOES) return null;

        if (state.checkedLevel === level && state.active && !state.active.defeated) return state.active;
        if (state.checkedLevel === level && !state.active) return null;

        state.checkedLevel = level;
        state.active = null;
        gameState.deathEchoV61 = null;
        const saved = getEcho(level);
        if (!saved) return null;

        const playerTile = tileFromPlayer();
        const spawn = nearestSpawnTile(saved.position, playerTile);
        const build = saved.build || {};
        const relicMods = build.relicMods || {};
        const ghost = {
            ...clone(saved),
            x: spawn.x * TILE_SIZE + TILE_SIZE / 2 - TILE_SIZE * 0.68 / 2,
            y: spawn.y * TILE_SIZE + TILE_SIZE / 2 - TILE_SIZE * 0.68 / 2,
            width: TILE_SIZE * 0.68,
            height: TILE_SIZE * 0.68,
            speed: clamp(number(build.speed, 3), 1, 7),
            maxBombs: clamp(Math.floor(number(build.maxBombs, 1)), 1, 8),
            bombRange: clamp(Math.floor(number(build.bombRange, 1)), 1, 12),
            bombFuseMultiplier: Math.max(0.5, number(build.bombFuseMultiplier, number(relicMods.bombFuseMultiplier, 1))),
            maxHealth: clamp(Math.floor(number(build.maxHealth, GHOST_HEALTH_DEFAULT)), 1, 10),
            health: clamp(Math.floor(number(build.maxHealth, GHOST_HEALTH_DEFAULT)), 1, 10),
            hasShield: !!build.hasShield,
            dir: ['up', 'down', 'left', 'right'].includes(build.dir) ? build.dir : 'down',
            hitFlash: 0,
            lastHitBlastId: -1,
            defeated: false
        };

        ghost.echoStrength = Object.freeze({
            bombRange: ghost.bombRange,
            maxBombs: ghost.maxBombs,
            speed: ghost.speed,
            bombFuseMultiplier: ghost.bombFuseMultiplier,
            unstablePowder: !!relicMods.unstablePowder
        });

        state.active = ghost;
        gameState.deathEchoV61 = ghost;
        state.decisionTimer = 0;
        state.bombCooldown = 450;
        return ghost;
    }

    function updateDeathEchoV61(dt) {
        if (typeof gameState === 'undefined' || !gameState.isPlaying || gameState.paused) return;
        const ghost = syncDeathEchoV61();
        if (!ghost || ghost.defeated) return;

        state.decisionTimer = Math.max(0, state.decisionTimer - number(dt, 16));
        state.bombCooldown = Math.max(0, state.bombCooldown - number(dt, 16));
        ghost.hitFlash = Math.max(0, ghost.hitFlash - number(dt, 16));

        const target = tileFromPlayer();
        const ghostTile = tileFromGhost(ghost);
        const distance = Math.abs(ghostTile.x - target.x) + Math.abs(ghostTile.y - target.y);

        if (state.decisionTimer <= 0) {
            state.decisionTimer = DECISION_MS;
            state.aiStep++;

            // Prioridad 1: si tiene tiro directo, intenta plantar bomba.
            if ((distance <= ghost.bombRange + 1 || hasLineToPlayer(ghost, ghost.bombRange)) && canGhostEscapeAfterBomb(ghost)) {
                createGhostBomb(ghost);
            }

            // Prioridad 2: movimiento hacia el jugador con rechazo de zonas peligrosas.
            const step = chooseStep(ghost);
            moveGhostToward(ghost, step, DECISION_MS);
        }

        const playerRect = {
            left: player.x + player.width * 0.25,
            right: player.x + player.width * 0.75,
            top: player.y + player.height * 0.2,
            bottom: player.y + player.height * 0.82
        };
        const ghostRect = {
            left: ghost.x + ghost.width * 0.2,
            right: ghost.x + ghost.width * 0.8,
            top: ghost.y + ghost.height * 0.2,
            bottom: ghost.y + ghost.height * 0.82
        };
        const overlaps = playerRect.right > ghostRect.left && playerRect.left < ghostRect.right && playerRect.bottom > ghostRect.top && playerRect.top < ghostRect.bottom;
        if (overlaps && typeof takeDamage === 'function') takeDamage('death-echo', ghost.x + ghost.width / 2, ghost.y + ghost.height / 2);
    }

    function installInitWrapper() {
        if (state.wrappedInitLevel) return true;
        if (typeof global.initLevel !== 'function') return false;
        state.originalInitLevel = global.initLevel;
        global.initLevel = function initLevelV61(...args) {
            const result = state.originalInitLevel(...args);
            state.checkedLevel = null;
            state.active = null;
            gameState.deathEchoV61 = null;
            syncDeathEchoV61();
            return result;
        };
        state.wrappedInitLevel = true;
        return true;
    }

    function getActiveDeathEchoV61(depth = null) {
        const targetLevel = depth == null && typeof gameState !== 'undefined' ? Number(gameState.level) : Number(depth);
        if (!state.active || state.active.defeated) return null;
        if (Number.isFinite(targetLevel) && Number(state.active.level) !== targetLevel) return null;
        return state.active;
    }

    function auditDeathEchoV61() {
        const stored = readStore();
        const errors = [];
        const levels = Object.keys(stored).filter(key => /^\d+$/.test(key));
        if (levels.length > MAX_ECHOES) errors.push(`Exceso de ecos persistidos: ${levels.length}`);
        for (const level of levels) {
            const echo = stored[level];
            if (!echo || echo.version !== VERSION) errors.push(`Eco inválido en profundidad ${level}`);
            if (!echo?.build || !Number.isFinite(Number(echo.build.bombRange))) errors.push(`Build inválida en profundidad ${level}`);
        }

        return {
            valid: errors.length === 0,
            version: VERSION,
            storedLevels: levels.map(Number).sort((a, b) => a - b),
            activeLevel: state.active ? Number(state.active.level) : null,
            installCount: state.installCount,
            errors
        };
    }

    function bootstrap() {
        state.installCount++;
        installInitWrapper();
    }

    global.recordDeathEchoV61 = recordDeathEchoV61;
    global.syncDeathEchoV61 = syncDeathEchoV61;
    global.updateDeathEchoV61 = updateDeathEchoV61;
    global.damageDeathEchoV61 = damageDeathEchoV61;
    global.auditDeathEchoV61 = auditDeathEchoV61;
    global.clearDeathEchoV61 = clearEcho;
    global.getDeathEchoV61 = getEcho;
    global.getActiveDeathEchoV61 = getActiveDeathEchoV61;
    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.recordDeathEcho = recordDeathEchoV61;
    // Renderer/API de runtime: siempre devuelve la instancia materializada,
    // nunca el snapshot crudo de localStorage.
    global.BOMBER_ENGINE.getDeathEcho = getActiveDeathEchoV61;
    global.BOMBER_ENGINE.getPersistedDeathEcho = getEcho;
    global.BOMBER_ENGINE.auditDeathEcho = auditDeathEchoV61;

    bootstrap();
})(window);
