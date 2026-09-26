// Bomberman Roguelike v6.7.1.1 — Eco de Muerte
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
(function installDeathEchoV631(global) {
    'use strict';

    const VERSION = '6.7.1.1';
    const COMPATIBLE_VERSIONS = new Set(['6.3.0', '6.3.1', '6.5.1', '6.7.0', '6.7.1','6.7.1.1']);
    if (global.__DEATH_ECHO_V631_INSTALLED__) return;
    global.__DEATH_ECHO_V631_INSTALLED__ = true;

    const STORAGE_KEY = 'bombermanDeathEchoesV63';
    const MAX_ECHOES = 44;
    const GHOST_OWNER = 'death_echo';
    const DECISION_MS = 200;
    const BOMB_COOLDOWN_MS = 1400;
    const GHOST_SPATIAL_RANGE = 2;
    const GHOST_THROW_DURATION_MS = 180;

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
            kickTimer: Math.max(0, number(player?.kickTimer, 0)),
            dir: ['up', 'down', 'left', 'right'].includes(player?.dir) ? player.dir : 'down',
            effectStatuses: clone(player?.__bombEffectStatusesV64 || {}),
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

    function chooseSafeStep(ghost) {
        const start = tileFromGhost(ghost);
        const target = tileFromPlayer();
        const danger = collectDangerCells();
        const dirs = [
            { dx: 0, dy: 0, bias: 0 },
            { dx: 1, dy: 0, bias: 1 },
            { dx: -1, dy: 0, bias: 1 },
            { dx: 0, dy: 1, bias: 1 },
            { dx: 0, dy: -1, bias: 1 }
        ];
        const ranked = [];
        for (const dir of dirs) {
            const x = start.x + dir.dx;
            const y = start.y + dir.dy;
            if (!isPassableTile(x, y) || (bombAtTile(x, y) && !(x === start.x && y === start.y))) continue;
            const key = cellKey(x, y);
            const playerDistanceScore = Math.abs(x - target.x) + Math.abs(y - target.y);
            ranked.push({ x, y, score: (danger.has(key) ? -1200 : 0) + playerDistanceScore * 8 + pathDistance({x, y}, target, danger) * 2 + dir.bias });
        }
        ranked.sort((a, b) => b.score - a.score || a.y - b.y || a.x - b.x);
        return ranked[0] || start;
    }

    function chooseStep(ghost) {
        const start = tileFromGhost(ghost);
        const target = tileFromPlayer();
        const danger = collectDangerCells();
        if (danger.has(cellKey(start.x, start.y))) return chooseSafeStep(ghost);

        // El eco juega a distancia de mini-jefe: se mueve hacia una posición
        // de 3 casilleros del jugador, no directamente encima de él.
        const stagingCandidates = [];
        const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
        for (const [dx, dy] of dirs) {
            const x = target.x + dx * (GHOST_SPATIAL_RANGE + 1);
            const y = target.y + dy * (GHOST_SPATIAL_RANGE + 1);
            if (!isPassableTile(x, y)) continue;
            const key = cellKey(x, y);
            stagingCandidates.push({
                x, y,
                score: (danger.has(key) ? 1200 : 0) + pathDistance(start, {x, y}, danger) * 10,
                danger: danger.has(key)
            });
        }
        stagingCandidates.sort((a, b) => a.score - b.score || a.y - b.y || a.x - b.x);
        const staging = stagingCandidates[0];
        if (staging && Number.isFinite(staging.x) && Number.isFinite(staging.y)) {
            const moves = [
                { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
                { dx: 0, dy: 1 }, { dx: 0, dy: -1 }, { dx: 0, dy: 0 }
            ];
            const ranked = [];
            for (const move of moves) {
                const x = start.x + move.dx;
                const y = start.y + move.dy;
                if (!isPassableTile(x, y) || (bombAtTile(x, y) && !(x === start.x && y === start.y))) continue;
                const key = cellKey(x, y);
                ranked.push({ x, y, score: (danger.has(key) ? 1000 : 0) + pathDistance({x, y}, {x: staging.x, y: staging.y}, danger) });
            }
            ranked.sort((a, b) => a.score - b.score || a.y - b.y || a.x - b.x);
            return ranked[0] || start;
        }

        return chooseSafeStep(ghost);
    }

    function ghostBombCount(ghost) {
        return (gameState.bombs || []).filter(b => b && b.owner === GHOST_OWNER && b.echoId === ghost.echoId).length;
    }

    function canGhostEscapeAfterBombAt(ghost, targetTile) {
        const start = tileFromGhost(ghost);
        const testBomb = { x: targetTile.x, y: targetTile.y, range: ghost.bombRange };
        const blastCells = typeof calculateBombBlastCells === 'function' ? calculateBombBlastCells(testBomb) : [];
        const blast = new Set(blastCells.map(cell => cellKey(Number(cell.x), Number(cell.y))));
        const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
        const queue = [{ x: start.x, y: start.y, distance: 0 }];
        const visited = new Set([cellKey(start.x, start.y)]);
        const MAX_ESCAPE_STEPS = Math.max(5, ghost.bombRange + 3);

        // El fantasma lanza la bomba lejos de sí. Su supervivencia se calcula
        // desde su posición actual hasta una celda fuera del blast del objetivo.
        if (!blast.has(cellKey(start.x, start.y))) return true;

        while (queue.length) {
            const current = queue.shift();
            for (const [dx, dy] of dirs) {
                const x = current.x + dx;
                const y = current.y + dy;
                const key = cellKey(x, y);
                if (visited.has(key) || !isPassableTile(x, y) || bombAtTile(x, y)) continue;
                const distance = current.distance + 1;
                visited.add(key);

                if (!blast.has(key) && distance <= MAX_ESCAPE_STEPS) return true;
                if (distance < MAX_ESCAPE_STEPS) queue.push({ x, y, distance });
            }
        }
        return false;
    }

    function playerDistance(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    function canGhostTraceRouteToPlayer(ghost, danger = collectDangerCells()) {
        if (!ghost || typeof player === 'undefined' || !player) return false;
        const start = tileFromGhost(ghost);
        const target = tileFromPlayer();
        if (!isInsideGrid(start.x, start.y) || !isInsideGrid(target.x, target.y)) return false;

        // La ruta puede rodear bombas/explosiones, pero no puede atravesar
        // paredes ni otras celdas físicamente bloqueadas. Si el jugador está
        // separado por una barrera, el eco NO tiene ataque válido todavía.
        return pathDistance(start, target, danger) < 999;
    }

    function chooseTwoTileBombTarget(ghost) {
        const target = tileFromPlayer();
        const danger = collectDangerCells();

        // Regla fundamental del mini-jefe: primero tiene que existir una ruta
        // trazable hasta el jugador. Si está encerrado detrás de paredes, no
        // lanza bombas a distancia ni "adivina" ataques atravesándolas.
        if (!canGhostTraceRouteToPlayer(ghost, danger)) return null;

        const candidates = [];
        const directions = [[1,0],[-1,0],[0,1],[0,-1]];

        for (const [dx, dy] of directions) {
            const x = target.x + dx * GHOST_SPATIAL_RANGE;
            const y = target.y + dy * GHOST_SPATIAL_RANGE;
            if (!isPassableTile(x, y) || bombAtTile(x, y)) continue;

            const blastCells = typeof calculateBombBlastCells === 'function'
                ? calculateBombBlastCells({ x, y, range: ghost.bombRange })
                : [];
            const hitsPlayer = blastCells.some(cell => Number(cell.x) === target.x && Number(cell.y) === target.y);
            const attackDistance = pathDistance(tileFromGhost(ghost), { x, y }, danger);

            // También exigimos ruta hasta la propia casilla de lanzamiento.
            // Esto evita que el eco ataque desde una "posición imposible"
            // aunque el jugador sí sea alcanzable por otro camino.
            if (attackDistance >= 999) continue;

            const safePlayerExits = directions.reduce((count, [sx, sy]) => {
                const ex = target.x + sx;
                const ey = target.y + sy;
                if (!isPassableTile(ex, ey)) return count;
                return blastCells.some(cell => Number(cell.x) === ex && Number(cell.y) === ey) ? count : count + 1;
            }, 0);
            const targetKey = cellKey(x, y);
            const score =
                (hitsPlayer ? 1200 : 350) +
                (4 - safePlayerExits) * 90 -
                (danger.has(targetKey) ? 220 : 0) -
                Math.min(attackDistance, 40) * 4;

            candidates.push({ x, y, score, hitsPlayer, safePlayerExits, attackDistance });
        }

        candidates.sort((a, b) =>
            b.score - a.score ||
            a.safePlayerExits - b.safePlayerExits ||
            a.attackDistance - b.attackDistance ||
            a.y - b.y ||
            a.x - b.x
        );
        return candidates[0] || null;
    }

    function createGhostBomb(ghost, targetTile) {
        if (!ghost || !targetTile || !gameState.isPlaying || gameState.paused) return false;
        if (ghostBombCount(ghost) >= ghost.maxBombs) return false;
        if (state.bombCooldown > 0) return false;

        const playerTile = tileFromPlayer();
        if (playerDistance(targetTile, playerTile) !== GHOST_SPATIAL_RANGE) return false;
        if (!isPassableTile(targetTile.x, targetTile.y) || bombAtTile(targetTile.x, targetTile.y)) return false;
        if (!canGhostEscapeAfterBombAt(ghost, targetTile)) return false;

        const ghostTile = tileFromGhost(ghost);
        const jumpDx = Math.sign(targetTile.x - ghostTile.x);
        const jumpDy = Math.sign(targetTile.y - ghostTile.y);
        const jumpDistance = Math.abs(targetTile.x - ghostTile.x) + Math.abs(targetTile.y - ghostTile.y);

        // El eco NO lanza la bomba a distancia arbitraria.
        // Solo puede hacer el mismo tipo de salto discreto que una patada:
        // exactamente 2 casillas y en una sola dirección cardinal.
        if (jumpDistance !== GHOST_SPATIAL_RANGE || (jumpDx !== 0 && jumpDy !== 0)) return false;

        const baseFuse = gameState.roomType?.id === 'CURSED' ? BOMB_HANDLING.cursedFuse : BOMB_HANDLING.normalFuse;
        const fuseTotal = Math.max(700, Math.round(baseFuse * ghost.bombFuseMultiplier));
        // La bomba siempre nace en el CENTRO DE LA CASILLA del eco.
        // No reutilizamos la posición visual del sprite, que puede estar entre
        // píxeles y provocar un desfasaje en el resolver de movimiento.
        const startX = (ghostTile.x + 0.5) * TILE_SIZE;
        const startY = (ghostTile.y + 0.5) * TILE_SIZE;
        const targetX = (targetTile.x + 0.5) * TILE_SIZE;
        const targetY = (targetTile.y + 0.5) * TILE_SIZE;

        const bomb = {
            id: `echo-bomb-${ghost.echoId}-${gameState.animFrame}-${Math.random().toString(36).slice(2, 6)}`,
            owner: GHOST_OWNER,
            echoId: ghost.echoId,
            x: Math.floor(startX / TILE_SIZE),
            y: Math.floor(startY / TILE_SIZE),
            range: ghost.bombRange,
            timer: fuseTotal,
            fuseTotal,
            warnBucket: Math.ceil(fuseTotal / 300),
            scalePulse: 1,
            previewTimer: 0,
            previewCells: [],
            previewGrid: gameState.grid,
            previewGridRevision: gameState.gridRevision || 0,
            state: typeof BOMB_V4_STATES !== 'undefined' ? BOMB_V4_STATES.MOVING : 'moving',
            motionState: 'moving',
            worldX: startX,
            worldY: startY,
            motionProgress: 0,
            motionTimer: GHOST_THROW_DURATION_MS,
            motionDuration: GHOST_THROW_DURATION_MS,
            motionStartX: startX,
            motionStartY: startY,
            motionTargetX: targetX,
            motionTargetY: targetY,
            motionArc: 10,
            motionRotation: 0,
            motionRotationSpeed: 0.18,
            bobPhase: 0,
            playerPassThrough: true,
            justArmed: false,
            placedAtFrame: gameState.animFrame,
            placementReason: 'death-echo-spatial',
            spatialRange: GHOST_SPATIAL_RANGE,
            spatialTarget: { x: targetTile.x, y: targetTile.y },
            countsTowardPlayerCapacity: false,
            canKick: false,
            canPush: false,
            canCarry: false,
            carriedBy: null,
            interactionState: 'free',
            motionQueue: [],
            preserveTimerOnArm: true
        };

        // Reutilizamos exactamente la misma secuencia de salto del jugador, pero
        // limitada a 2 casillas para el eco. Las paredes intermedias no bloquean
        // el salto; la segunda casilla debe ser un piso válido para caer.
        if (typeof queueBombJumpSequenceV67 !== 'function') return false;
        if (!queueBombJumpSequenceV67(
            bomb,
            jumpDx,
            jumpDy,
            GHOST_SPATIAL_RANGE,
            GHOST_THROW_DURATION_MS,
            TILE_SIZE * .30
        )) return false;

        gameState.bombs.push(bomb);
        state.bombCooldown = BOMB_COOLDOWN_MS;
        ghost.lastAttackTarget = { x: targetTile.x, y: targetTile.y };
        ghost.attackFlash = 120;
        if (typeof addParticles === 'function') addParticles(startX, startY, 'particleDanger', 8);
        return true;
    }

    function moveGhostToward(ghost, targetTile, dt) {
        if (!ghost || !targetTile) return false;
        const targetX = targetTile.x * TILE_SIZE + TILE_SIZE / 2 - ghost.width / 2;
        const targetY = targetTile.y * TILE_SIZE + TILE_SIZE / 2 - ghost.height / 2;
        const dx = targetX - ghost.x;
        const dy = targetY - ghost.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 0.5) {
            ghost.x = targetX;
            ghost.y = targetY;
            ghost.moving = false;
            return false;
        }

        // La decisión sigue siendo discreta; el movimiento NO. Esto elimina el
        // salto de 220 ms que hacía sentir al eco pesado o con delay.
        const frameScale = Math.max(0.25, Math.min(2, number(dt, 16.6667) / 16.6667));
        const maxStep = ghost.speed * frameScale;
        const step = Math.min(maxStep, distance);
        ghost.x += dx / distance * step;
        ghost.y += dy / distance * step;
        ghost.moveDistance += step;
        ghost.moving = step > 0.01;
        ghost.dir = Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
        if (step >= distance - 0.01) {
            ghost.x = targetX;
            ghost.y = targetY;
            ghost.moving = false;
            return true;
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
            speed: clamp(number(build.speed, number(build.sourceSpeed, 3)), 1, 8),
            sourceSpeed: clamp(number(build.sourceSpeed, 3), 1, 8),
            maxBombs: clamp(Math.floor(number(build.maxBombs, 1)), 1, 8),
            bombRange: Math.max(GHOST_SPATIAL_RANGE, clamp(Math.floor(number(build.bombRange, 1)), 1, 12)),
            bombFuseMultiplier: Math.max(0.5, number(build.bombFuseMultiplier, number(relicMods.bombFuseMultiplier, 1))),
            maxHealth: 1,
            health: 1,
            hasShield: false,
            kickTimer: Math.max(0, number(build.kickTimer, 0)),
            dir: ['up', 'down', 'left', 'right'].includes(build.dir) ? build.dir : 'down',
            hitFlash: 0,
            attackFlash: 0,
            lastHitBlastId: -1,
            defeated: false,
            visualTime: 0,
            moveDistance: 0,
            moving: false,
            aiTargetTile: null
        };
        if (build.effectStatuses && typeof ghost === 'object') {
            try { Object.defineProperty(ghost, '__bombEffectStatusesV64', { value: clone(build.effectStatuses), enumerable:false, configurable:true, writable:true }); }
            catch (_) { ghost.__bombEffectStatusesV64 = clone(build.effectStatuses); }
        }

        ghost.echoStrength = Object.freeze({
            bombRange: ghost.bombRange,
            maxBombs: ghost.maxBombs,
            speed: ghost.speed,
            sourceSpeed: number(build.sourceSpeed, number(build.speed, 3)),
            kickTimer: ghost.kickTimer,
            spatialRange: GHOST_SPATIAL_RANGE,
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
        ghost.attackFlash = Math.max(0, ghost.attackFlash - number(dt, 16));

        const target = tileFromPlayer();
        const ghostTile = tileFromGhost(ghost);
        const distance = Math.abs(ghostTile.x - target.x) + Math.abs(ghostTile.y - target.y);

        if (state.decisionTimer <= 0) {
            state.decisionTimer = DECISION_MS;
            state.aiStep++;

            // Prioridad 1: ataque espacial. Solo existe si el eco puede trazar
            // una ruta físicamente válida hasta el jugador y, además, hasta la
            // casilla concreta desde la que lanzará la bomba.
            const attackTarget = chooseTwoTileBombTarget(ghost);
            if (attackTarget) createGhostBomb(ghost, attackTarget);

            // Solo elegimos el siguiente destino aquí. El desplazamiento ocurre
            // cada frame abajo, con dt real.
            state.smoothMoveTarget = chooseStep(ghost);
            ghost.aiTargetTile = state.smoothMoveTarget;
        }

        if (ghost.aiTargetTile) {
            const reached = moveGhostToward(ghost, ghost.aiTargetTile, dt);
            const current = tileFromGhost(ghost);
            if (!reached || (current.x === ghost.aiTargetTile.x && current.y === ghost.aiTargetTile.y)) {
                ghost.aiTargetTile = null;
                state.smoothMoveTarget = null;
                // El siguiente destino se decide enseguida: no dejamos una pausa
                // artificial de hasta DECISION_MS en cada intersección.
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
