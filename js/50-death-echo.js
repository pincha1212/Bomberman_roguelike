// Bomberman Roguelike v6.11.0 — Death Echo Rework
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
(function installDeathEchoV611(global) {
    'use strict';

    const VERSION = '6.11.0';
    const COMPATIBLE_VERSIONS = new Set(['6.3.0', '6.3.1', '6.5.1', '6.7.0', '6.7.1', '6.7.1.1', '6.11.0']);
    if (global.__DEATH_ECHO_V611_INSTALLED__) return;
    global.__DEATH_ECHO_V611_INSTALLED__ = true;

    const STORAGE_KEY = 'bombermanDeathEchoesV63';
    const MAX_ECHOES = 44;
    const GHOST_OWNER = 'death_echo';
    const DECISION_MS = 120;
    const BOMB_COOLDOWN_MS = 1600;
    const GHOST_SPATIAL_RANGE = 2;
    const ECHO_SPEED = 1.15;

    const state = {
        checkedLevel: null,
        active: null,
        installCount: 0,
        decisionTimer: 0,
        bombCooldown: 0,
        aiStep: 0,
        smoothMoveTarget: null,
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
        if (!echo || !COMPATIBLE_VERSIONS.has(String(echo.version))) return null;
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
        const result = [];
        const seen = new Set();
        const legacy = typeof gameState !== 'undefined' && Array.isArray(gameState.relics) ? gameState.relics : [];
        for (const relic of legacy) {
            const id = String(relic?.id || '');
            if (!id || seen.has(id)) continue;
            seen.add(id);
            result.push({ id, name:String(relic?.name || ''), icon:String(relic?.icon || '◆'), category:String(relic?.category || 'BOMB') });
        }
        const v327Ids = global.ROGUELIKE_V327?.relics;
        const v327Defs = Array.isArray(global.ROGUELIKE_RELICS_V327) ? global.ROGUELIKE_RELICS_V327 : [];
        for (const idRaw of (Array.isArray(v327Ids) ? v327Ids : [])) {
            const id=String(idRaw || '');
            if (!id || seen.has(id)) continue;
            const relic=v327Defs.find(item => item.id === id);
            if (!relic) continue;
            seen.add(id);
            result.push({ id, name:String(relic.name || ''), icon:String(relic.icon || '◆'), category:String(relic.category || 'BOMB') });
        }
        return result;
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
            sourceSpeed: clamp(number(player?.speed, 3), 1, 8),
            speed: clamp(number(player?.speed, 3), 1, 8),
            maxBombs: clamp(Math.floor(number(player?.maxBombs, 1)), 1, 8),
            bombRange: clamp(Math.floor(number(player?.bombRange, 1)), 1, 12),
            maxHealth: clamp(Math.floor(number(player?.maxHealth, 5)), 1, 10),
            hasShield: false,
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
        // v6.5.1: el eco aparece en la esquina inferior izquierda del mapa
        // para dar al jugador un inicio más fácil. La casilla (1, H-2) es
        // la esquina interior porque el perímetro exterior está amurallado.
        const preferred = {
            x: 1,
            y: Math.max(1, gameState.gridHeight - 2)
        };
        const minSeparation = 4;

        if (
            isPassableTile(preferred.x, preferred.y) &&
            !bombAtTile(preferred.x, preferred.y) &&
            (Math.abs(preferred.x - playerTile.x) + Math.abs(preferred.y - playerTile.y)) >= minSeparation
        ) {
            return preferred;
        }

        // Si la esquina exacta está ocupada, buscamos la casilla pasable más
        // cercana a esa esquina, manteniendo una distancia mínima del jugador.
        const candidates = [];
        for (let y = 1; y < gameState.gridHeight - 1; y++) {
            for (let x = 1; x < gameState.gridWidth - 1; x++) {
                if (!isPassableTile(x, y) || bombAtTile(x, y)) continue;

                const targetDistance = Math.abs(x - playerTile.x) + Math.abs(y - playerTile.y);
                if (targetDistance < minSeparation) continue;

                const cornerDistance = Math.abs(x - preferred.x) + Math.abs(y - preferred.y);
                candidates.push({ x, y, cornerDistance, targetDistance });
            }
        }

        candidates.sort((a, b) =>
            a.cornerDistance - b.cornerDistance ||
            b.y - a.y ||
            a.x - b.x ||
            b.targetDistance - a.targetDistance
        );

        if (candidates.length) return candidates[0];

        // Fallback de último recurso para mapas excepcionales.
        const ox = clamp(Math.floor(number(origin?.x, 1)), 1, gameState.gridWidth - 2);
        const oy = clamp(Math.floor(number(origin?.y, 1)), 1, gameState.gridHeight - 2);
        return { x: ox, y: oy };
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

    function pathDistance(start, goal, danger = new Set()) {
        if (start.x === goal.x && start.y === goal.y) return 0;

        // Dijkstra mínimo y acotado: las casillas peligrosas son transitables
        // pero tienen un coste muy alto. Así el eco puede rodear una explosión
        // en vez de cruzarla solo porque sea el camino geométricamente corto.
        const nodes = [{ x: start.x, y: start.y, cost: 0 }];
        const best = new Map([[cellKey(start.x, start.y), 0]]);
        const dirs = [[1,0],[-1,0],[0,1],[0,-1]];

        while (nodes.length) {
            nodes.sort((a, b) => a.cost - b.cost);
            const current = nodes.shift();
            if (!current) break;
            const currentKey = cellKey(current.x, current.y);
            if (current.cost !== best.get(currentKey)) continue;
            if (current.x === goal.x && current.y === goal.y) return current.cost;

            for (const [dx, dy] of dirs) {
                const x = current.x + dx;
                const y = current.y + dy;
                if (!isPassableTile(x, y)) continue;
                const key = cellKey(x, y);
                const stepCost = danger.has(key) ? 120 : 1;
                const nextCost = current.cost + stepCost;
                const known = best.get(key);
                if (known !== undefined && known <= nextCost) continue;
                best.set(key, nextCost);
                nodes.push({ x, y, cost: nextCost });
            }
        }
        return 999;
    }

    function playerDistance(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    function chooseEscapeTile(ghost, bomb) {
        const start = tileFromGhost(ghost);
        const blastCells = typeof calculateBombBlastCells === 'function'
            ? calculateBombBlastCells(bomb)
            : [];
        const blast = new Set(blastCells.map(cell => cellKey(Number(cell.x), Number(cell.y))));
        for (const key of collectDangerCells()) blast.add(key);
        const queue = [{ x: start.x, y: start.y, distance: 0 }];
        const visited = new Set([cellKey(start.x, start.y)]);
        const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
        let fallback = null;

        while (queue.length) {
            const current = queue.shift();
            const currentKey = cellKey(current.x, current.y);
            if (!blast.has(currentKey) && !(current.x === start.x && current.y === start.y)) {
                return { x: current.x, y: current.y, distance: current.distance };
            }
            if (current.distance >= Math.max(4, ghost.bombRange + 2)) continue;

            for (const [dx, dy] of dirs) {
                const x = current.x + dx;
                const y = current.y + dy;
                const key = cellKey(x, y);
                if (visited.has(key) || !isPassableTile(x, y) || bombAtTile(x, y)) continue;
                visited.add(key);
                const next = { x, y, distance: current.distance + 1 };
                if (!blast.has(key) && !fallback) fallback = next;
                queue.push(next);
            }
        }
        return fallback;
    }

    function chooseSafeStep(ghost, targetTile = null) {
        const start = tileFromGhost(ghost);
        const target = targetTile || tileFromPlayer();
        const danger = collectDangerCells();
        const dirs = [
            { dx: 0, dy: 0 },
            { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
            { dx: 0, dy: 1 }, { dx: 0, dy: -1 }
        ];
        const ranked = [];
        for (const dir of dirs) {
            const x = start.x + dir.dx;
            const y = start.y + dir.dy;
            if (!isPassableTile(x, y)) continue;
            if (bombAtTile(x, y) && !(x === start.x && y === start.y)) continue;
            const key = cellKey(x, y);
            const dangerPenalty = danger.has(key) ? 100000 : 0;
            const distance = pathDistance({ x, y }, target, danger);
            ranked.push({ x, y, score: dangerPenalty + distance * 4 + Math.abs(x - target.x) + Math.abs(y - target.y) });
        }
        ranked.sort((a, b) => a.score - b.score || a.y - b.y || a.x - b.x);
        return ranked[0] || start;
    }

    function canGhostTraceRouteToPlayer(ghost, danger = collectDangerCells()) {
        if (!ghost || typeof player === 'undefined' || !player) return false;
        const start = tileFromGhost(ghost);
        const target = tileFromPlayer();
        if (!isInsideGrid(start.x, start.y) || !isInsideGrid(target.x, target.y)) return false;
        return pathDistance(start, target, danger) < 999;
    }

    function chooseAttackTile(ghost) {
        const ghostTile = tileFromGhost(ghost);
        const playerTile = tileFromPlayer();
        const distance = playerDistance(ghostTile, playerTile);

        // El Echo ataca desde su propia casilla. La posición debe estar
        // exactamente a dos tiles del jugador y alineada cardinalmente.
        if (distance !== GHOST_SPATIAL_RANGE) return null;
        if (ghostTile.x !== playerTile.x && ghostTile.y !== playerTile.y) return null;
        if (!isPassableTile(ghostTile.x, ghostTile.y) || bombAtTile(ghostTile.x, ghostTile.y)) return null;

        const blast = typeof calculateBombBlastCells === 'function'
            ? calculateBombBlastCells({ x: ghostTile.x, y: ghostTile.y, range: ghost.bombRange })
            : [];
        const hitsPlayer = blast.some(cell => Number(cell.x) === playerTile.x && Number(cell.y) === playerTile.y);
        if (!hitsPlayer) return null;

        const testBomb = { x: ghostTile.x, y: ghostTile.y, range: ghost.bombRange };
        const escape = chooseEscapeTile(ghost, testBomb);
        if (!escape) return null;
        return { x: ghostTile.x, y: ghostTile.y, escape };
    }

    function ghostBombCount(ghost) {
        return (gameState.bombs || []).filter(b => b && b.owner === GHOST_OWNER && b.echoId === ghost.echoId).length;
    }

    function createGhostBomb(ghost, targetTile) {
        if (!ghost || !targetTile || !gameState.isPlaying || gameState.paused) return false;
        if (ghostBombCount(ghost) >= ghost.maxBombs) return false;
        if (state.bombCooldown > 0) return false;

        const ghostTile = tileFromGhost(ghost);
        if (ghostTile.x !== targetTile.x || ghostTile.y !== targetTile.y) return false;
        if (!isPassableTile(ghostTile.x, ghostTile.y) || bombAtTile(ghostTile.x, ghostTile.y)) return false;

        const baseFuse = gameState.roomType?.id === 'CURSED'
            ? BOMB_HANDLING.cursedFuse
            : BOMB_HANDLING.normalFuse;
        const fuseTotal = Math.max(700, Math.round(baseFuse * ghost.bombFuseMultiplier));
        const gx = ghostTile.x;
        const gy = ghostTile.y;
        const worldX = (gx + 0.5) * TILE_SIZE;
        const worldY = (gy + 0.5) * TILE_SIZE;

        const bomb = {
            id: `echo-bomb-${ghost.echoId}-${gameState.animFrame}-${Math.random().toString(36).slice(2, 6)}`,
            owner: GHOST_OWNER,
            echoId: ghost.echoId,
            x: gx,
            y: gy,
            range: ghost.bombRange,
            timer: fuseTotal,
            fuseTotal,
            warnBucket: Math.ceil(fuseTotal / 300),
            scalePulse: 1,
            playerPassThrough: false,
            justArmed: false,
            placedAtFrame: gameState.animFrame,
            placementReason: 'death-echo-placed',
            state: BOMB_V4_STATES.ARMED,
            motionState: 'idle',
            worldX,
            worldY,
            motionProgress: 1,
            motionTimer: 0,
            motionDuration: 0,
            motionStartX: worldX,
            motionStartY: worldY,
            motionTargetX: worldX,
            motionTargetY: worldY,
            motionArc: 0,
            motionRotation: 0,
            motionRotationSpeed: 0,
            bobPhase: 0,
            motionQueue: [],
            preserveTimerOnArm: false,
            countsTowardPlayerCapacity: false,
            canKick: false,
            canPush: false,
            canCarry: false,
            carriedBy: null
        };

        gameState.bombs.push(bomb);
        state.bombCooldown = BOMB_COOLDOWN_MS;
        ghost.mode = 'ESCAPE';
        ghost.escapeTargetTile = targetTile.escape || null;
        ghost.lastAttackTarget = { x: gx, y: gy };
        ghost.attackFlash = 180;
        if (typeof addParticles === 'function') addParticles(worldX, worldY, 'particleDanger', 8);
        if (typeof sfx === 'function') sfx('bomb');
        return true;
    }

    function chooseChaseStep(ghost) {
        const start = tileFromGhost(ghost);
        const target = tileFromPlayer();
        const danger = collectDangerCells();
        const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
        const candidates = [];

        for (const [dx, dy] of dirs) {
            const x = start.x + dx;
            const y = start.y + dy;
            if (!isPassableTile(x, y) || bombAtTile(x, y)) continue;
            const key = cellKey(x, y);
            if (danger.has(key)) continue;
            const distance = pathDistance({ x, y }, target, danger);
            if (distance >= 999) continue;
            candidates.push({ x, y, score: distance * 4 + Math.abs(x - target.x) + Math.abs(y - target.y) });
        }
        candidates.push({ x: start.x, y: start.y, score: pathDistance(start, target, danger) * 4 });
        candidates.sort((a, b) => a.score - b.score || a.y - b.y || a.x - b.x);
        return candidates[0] || start;
    }

    function moveGhostToward(ghost, targetTile, dt) {
        if (!ghost || !targetTile) return false;
        if (ghost._tileMoveActive) {
            const result = gridAdvanceTileMove(ghost, ghost.speed, dt, { kind: 'enemy', allowCurrentBombTile: false });
            if (result.arrived) {
                ghost.moving = false;
                ghost.moveDistance += TILE_SIZE;
                return true;
            }
            ghost.moving = true;
            return true;
        }

        const current = tileFromGhost(ghost);
        if (current.x === targetTile.x && current.y === targetTile.y) {
            gridSnapEntityToTile(ghost, current.x, current.y, 'enemy');
            ghost.moving = false;
            return false;
        }

        const dx = targetTile.x - current.x;
        const dy = targetTile.y - current.y;
        let stepX = 0;
        let stepY = 0;
        if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) stepX = Math.sign(dx);
        else if (dy !== 0) stepY = Math.sign(dy);
        else return false;

        const gx = current.x + stepX;
        const gy = current.y + stepY;
        if (!gridBeginTileMove(ghost, gx, gy, { kind: 'enemy', allowCurrentBombTile: false })) {
            ghost.moving = false;
            return false;
        }

        ghost.dir = stepX < 0 ? 'left' : stepX > 0 ? 'right' : stepY < 0 ? 'up' : 'down';
        ghost.lastDirection = ghost.dir;
        ghost.moving = true;
        const result = gridAdvanceTileMove(ghost, ghost.speed, dt, { kind: 'enemy', allowCurrentBombTile: false });
        if (result.arrived) {
            ghost.moving = false;
            ghost.moveDistance += TILE_SIZE;
        }
        return true;
    }

    function recoverEchoItems(ghost) {
        const relics = Array.isArray(ghost.relics) ? ghost.relics : [];
        const recovered = [];
        for (const saved of relics) {
            let restored = false;
            if (typeof RELICS !== 'undefined' && typeof grantRelic === 'function') {
                const relic = RELICS.find(candidate => candidate.id === saved.id);
                if (relic && grantRelic(relic)) { recovered.push(relic); restored = true; }
            }
            if (!restored && typeof global.rogueV327AcquireRelic === 'function') {
                if (global.rogueV327AcquireRelic(saved.id)) { restored = true; recovered.push({ ...saved }); }
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
        ghost.health = 0;
        ghost.maxHealth = 1;
        ghost.hasShield = false;
        ghost.defeated = true;
        ghost.hitFlash = 180;
        if (typeof addParticles === 'function') addParticles(ghost.x + ghost.width / 2, ghost.y + ghost.height / 2, 'particleDanger', 16);
        recoverEchoItems(ghost);
        return true;
    }

    function syncDeathEchoV61() {
        // La materialización también debe funcionar durante initLevel, antes de
        // que el caller marque isPlaying=true. Así el primer render ya encuentra
        // una instancia activa del eco.
        if (typeof gameState === 'undefined') return state.active;
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
            speed: ECHO_SPEED,
            sourceSpeed: clamp(number(build.sourceSpeed, 3), 1, 8),
            maxBombs: clamp(Math.floor(number(build.maxBombs, 1)), 1, 8),
            bombRange: Math.max(GHOST_SPATIAL_RANGE, clamp(Math.floor(number(build.bombRange, 1)), 1, 12)),
            bombFuseMultiplier: Math.max(0.5, number(build.bombFuseMultiplier, number(relicMods.bombFuseMultiplier, 1))),
            maxHealth: 1,
            health: 1,
            hasShield: false,
            dir: ['up', 'down', 'left', 'right'].includes(build.dir) ? build.dir : 'down',
            hitFlash: 0,
            attackFlash: 0,
            lastHitBlastId: -1,
            defeated: false,
            visualTime: 0,
            moveDistance: 0,
            moving: false,
            aiTargetTile: null,
            mode: 'HUNT',
            escapeTargetTile: null,
            _tileMoveActive: false,
            _tileMoveTargetX: 0,
            _tileMoveTargetY: 0,
            _tileMoveTargetGX: spawn.x,
            _tileMoveTargetGY: spawn.y,
            __gridAnchor: 'center'
        };

        ghost.echoStrength = Object.freeze({
            bombRange: ghost.bombRange,
            maxBombs: ghost.maxBombs,
            speed: ghost.speed,
            sourceSpeed: number(build.sourceSpeed, number(build.speed, 3)),
            spatialRange: GHOST_SPATIAL_RANGE,
            bombFuseMultiplier: ghost.bombFuseMultiplier,
            unstablePowder: !!relicMods.unstablePowder
        });

        state.active = ghost;
        gameState.deathEchoV61 = ghost;
        state.decisionTimer = 0;
        state.bombCooldown = 0;
        return ghost;
    }

    function updateDeathEchoV61(dt) {
        if (typeof gameState === 'undefined' || !gameState.isPlaying || gameState.paused) return;
        const ghost = syncDeathEchoV61();
        if (!ghost || ghost.defeated) return;

        state.decisionTimer = Math.max(0, state.decisionTimer - number(dt, 16));
        state.bombCooldown = Math.max(0, state.bombCooldown - number(dt, 16));
        ghost.hitFlash = Math.max(0, ghost.hitFlash - number(dt, 16));
        ghost.attackFlash = Math.max(0, ghost.attackFlash - number(dt, 16));

        const ghostTile = tileFromGhost(ghost);
        const activeEchoBombs = (gameState.bombs || []).filter(b =>
            b && b.owner === GHOST_OWNER && b.echoId === ghost.echoId && b.state !== BOMB_V4_STATES.EXPLODING
        );
        const danger = collectDangerCells();

        // ESCAPE tiene prioridad absoluta: el Echo nunca sigue persiguiendo
        // mientras una bomba propia puede matarlo.
        if (ghost.mode === 'ESCAPE' && activeEchoBombs.length) {
            const bomb = activeEchoBombs[0];
            const escape = ghost.escapeTargetTile || chooseEscapeTile(ghost, bomb);
            if (escape) {
                ghost.aiTargetTile = escape;
                moveGhostToward(ghost, escape, dt);
            } else {
                const safe = chooseSafeStep(ghost, tileFromPlayer());
                moveGhostToward(ghost, safe, dt);
            }
            ghost.visualTime += Math.max(0, number(dt, 16));
            return;
        }

        if (ghost.mode === 'ESCAPE') {
            ghost.mode = 'HUNT';
            ghost.escapeTargetTile = null;
            ghost.aiTargetTile = null;
        }

        // Si quedó parado en una casilla peligrosa por una explosión externa,
        // escapar tiene prioridad sobre cualquier ataque.
        if (danger.has(cellKey(ghostTile.x, ghostTile.y))) {
            const safe = chooseSafeStep(ghost, tileFromPlayer());
            moveGhostToward(ghost, safe, dt);
            ghost.visualTime += Math.max(0, number(dt, 16));
            return;
        }

        if (state.decisionTimer <= 0 && !ghost._tileMoveActive) {
            state.decisionTimer = DECISION_MS;
            state.aiStep++;

            const attackTarget = chooseAttackTile(ghost);
            if (attackTarget && createGhostBomb(ghost, attackTarget)) {
                ghost.aiTargetTile = null;
                ghost.visualTime += Math.max(0, number(dt, 16));
                return;
            }

            // El Echo primero intenta acercarse. Si no existe ruta directa,
            // pathDistance mantiene la navegación cardinal alrededor de paredes.
            ghost.aiTargetTile = chooseChaseStep(ghost);
        }

        if (ghost.aiTargetTile && !ghost._tileMoveActive) {
            const current = tileFromGhost(ghost);
            if (current.x === ghost.aiTargetTile.x && current.y === ghost.aiTargetTile.y) {
                ghost.aiTargetTile = null;
            }
        }

        if (ghost.aiTargetTile) {
            const reached = moveGhostToward(ghost, ghost.aiTargetTile, dt);
            if (!reached || (!ghost._tileMoveActive && tileFromGhost(ghost).x === ghost.aiTargetTile.x && tileFromGhost(ghost).y === ghost.aiTargetTile.y)) {
                ghost.aiTargetTile = null;
                state.decisionTimer = 0;
            }
        }

        ghost.visualTime += Math.max(0, number(dt, 16));

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
            if (!echo || !COMPATIBLE_VERSIONS.has(String(echo.version))) errors.push(`Eco inválido en profundidad ${level}`);
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
    global.BOMBER_ENGINE.getActiveDeathEcho = getActiveDeathEchoV61;
    global.BOMBER_ENGINE.getPersistedDeathEcho = getEcho;
    global.BOMBER_ENGINE.auditDeathEcho = auditDeathEchoV61;
    global.BOMBER_ENGINE.canDeathEchoTracePlayer = canGhostTraceRouteToPlayer;

    bootstrap();
})(window);
