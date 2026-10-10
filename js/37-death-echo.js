// Bomberman Roguelike v6.31.20 — Death Echo: bomba visible y transporte prolongado
// Echo representa al personaje que murió: conserva su build y utiliza los mismos
// verbos de interacción, pero con una IA autónoma y movimiento estrictamente tile-to-tile.
(function installDeathEchoV620(global) {
    'use strict';

    const VERSION = '6.31.20';
    const COMPATIBLE_VERSIONS = new Set([
        '6.3.0','6.3.1','6.5.1','6.7.0','6.7.1','6.7.1.1','6.11.0','6.12.12','6.12.13','6.12.17','6.12.18','6.28.0','6.31.18','6.31.19','6.31.20'
    ]);
    if (global.__DEATH_ECHO_V618_INSTALLED__) return;
    global.__DEATH_ECHO_V618_INSTALLED__ = true;

    const STORAGE_KEY = 'bombermanDeathEchoesV63';
    const MAX_ECHOES = 44;
    const GHOST_OWNER = 'death_echo';

    const ECHO_AI = Object.freeze({
        // Encuentro sencillo: visión más corta, decisiones pausadas y pocos ataques.
        visionRange: 4,
        thinkMs: 680,
        patrolThinkMs: 1120,
        directionCommitMs: 650,
        reactionMs: 1250,
        wallPauseMs: 900,
        blockedRetryMs: 300,
        bombCooldownMs: 3600,
        carryTimeoutMs: 10000,
        minimumCarryMs: 4200,
        carryReplanMs: 850,
        dangerFuseMs: 950,
        escapeThinkMs: 180,
        bombSpatialRange: 2,
        patrolSideChance: 0.20,
        attackChance: 0.48,
        minimumFuseMs: 2600,
        maxBombRange: 2
    });

    const state = {
        checkedLevel: null,
        active: null,
        originalInitLevel: null,
        wrappedInitLevel: false
    };

    function num(value, fallback = 0) {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function clone(value) {
        return value == null ? value : JSON.parse(JSON.stringify(value));
    }

    function cellKey(x, y) {
        return `${x},${y}`;
    }

    function inside(x, y) {
        return !!gameState && x >= 0 && y >= 0 && x < gameState.gridWidth && y < gameState.gridHeight;
    }

    function tileFromEntity(entity) {
        if (!entity) return { x: 1, y: 1 };
        if (typeof global.gridEntityTileV628 === 'function') return global.gridEntityTileV628(entity);
        // Compatibilidad defensiva si el helper central no está disponible.
        if (entity.__gridAnchor === 'center') {
            return {
                x: Math.max(0, Math.min(gameState.gridWidth - 1, Math.round((num(entity.x) - TILE_SIZE / 2) / TILE_SIZE))),
                y: Math.max(0, Math.min(gameState.gridHeight - 1, Math.round((num(entity.y) - TILE_SIZE / 2) / TILE_SIZE)))
            };
        }
        return {
            x: Math.floor((num(entity.x) + num(entity.width) / 2) / TILE_SIZE),
            y: Math.floor((num(entity.y) + num(entity.height) / 2) / TILE_SIZE)
        };
    }

    function isCenteredOnTile(ghost) {
        if (!ghost || ghost._tileMoveActive) return false;
        if (typeof global.gridEntityCenteredV628 === 'function') return global.gridEntityCenteredV628(ghost, 1.25);
        const tile = tileFromEntity(ghost);
        return Math.abs(num(ghost.x) - (tile.x + 0.5) * TILE_SIZE) <= 1.25 &&
            Math.abs(num(ghost.y) - (tile.y + 0.5) * TILE_SIZE) <= 1.25;
    }

    function snapEchoToGrid(ghost) {
        if (!ghost || ghost._tileMoveActive) return false;
        const tile = tileFromEntity(ghost);
        if (typeof global.gridSnapEntityCenteredV628 === 'function') {
            return global.gridSnapEntityCenteredV628(ghost, tile.x, tile.y);
        }
        ghost.x = (tile.x + 0.5) * TILE_SIZE;
        ghost.y = (tile.y + 0.5) * TILE_SIZE;
        ghost.__gridAnchor = 'center';
        ghost._tileMoveTargetGX = tile.x;
        ghost._tileMoveTargetGY = tile.y;
        ghost._tileMoveTargetX = ghost.x;
        ghost._tileMoveTargetY = ghost.y;
        return true;
    }

    function playerTile() {
        return {
            x: Math.floor((num(player?.x) + num(player?.width) / 2) / TILE_SIZE),
            y: Math.floor((num(player?.y) + num(player?.height) / 2) / TILE_SIZE)
        };
    }

    function passableTile(x, y, entity = null) {
        if (!inside(x, y)) return false;
        const type = gameState.grid?.[y]?.[x];
        if (!(type === TYPES.EMPTY || type === TYPES.EXIT_OPEN || type === TYPES.EXIT_LOCKED)) return false;
        const bomb = bombAt(x, y);
        if (bomb && bomb.carriedBy !== entity) return false;
        return true;
    }

    function bombAt(x, y) {
        return (gameState.bombs || []).find(b => {
            if (!b) return false;
            if (b.state === BOMB_V4_STATES?.CARRIED || b.carriedBy) return false;
            return Number(b.x) === x && Number(b.y) === y;
        }) || null;
    }

    function visibleToPlayer(ghost) {
        if (!ghost || typeof player === 'undefined' || !player) return false;
        const a = tileFromEntity(ghost);
        const b = playerTile();
        const distance = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
        if (distance > ECHO_AI.visionRange) return false;
        if (distance <= 1) return true;

        // Echo ve al jugador como los demás enemigos: solo hay visión en línea recta.
        if (a.x !== b.x && a.y !== b.y) return false;
        const dx = Math.sign(b.x - a.x);
        const dy = Math.sign(b.y - a.y);
        let x = a.x + dx;
        let y = a.y + dy;
        while (x !== b.x || y !== b.y) {
            if (!inside(x, y)) return false;
            const tile = gameState.grid?.[y]?.[x];
            if (tile === TYPES.WALL || tile === TYPES.BLOCK) return false;
            if (bombAt(x, y)) return false;
            x += dx;
            y += dy;
        }
        return true;
    }

    function snapshotRelics() {
        const result = [];
        const seen = new Set();
        const relics = Array.isArray(gameState?.relics) ? gameState.relics : [];
        for (const relic of relics) {
            const id = String(relic?.id || '');
            if (!id || seen.has(id)) continue;
            seen.add(id);
            result.push({ id, name:String(relic?.name || ''), icon:String(relic?.icon || '◆'), category:String(relic?.category || 'BOMB') });
        }
        return result;
    }

    function snapshotBuild() {
        const mods = gameState?.relicMods || {};
        const capabilities = typeof global.getActiveCapabilityPowerupsV681 === 'function'
            ? global.getActiveCapabilityPowerupsV681(player)
            : [];
        const activeCaps = Array.isArray(capabilities)
            ? capabilities.map(String).filter(id => ['KICK','GRAB','THROW'].includes(id))
            : [];

        return {
            speed: clamp(num(player?.speed, 3), 1, 8),
            maxBombs: clamp(Math.floor(num(player?.maxBombs, 1)), 1, 10),
            bombRange: clamp(Math.floor(num(player?.bombRange, 1)), 1, 16),
            bombElementV612: ['normal','fire','ice','electric'].includes(String(player?.bombElementV612)) ? String(player.bombElementV612) : 'normal',
            dir: ['up','down','left','right'].includes(player?.dir) ? player.dir : 'down',
            capabilities: activeCaps,
            relicMods: clone({
                bombFuseMultiplier: num(mods.bombFuseMultiplier, 1),
                turnAssistBonus: num(mods.turnAssistBonus, 0),
                turnSnapBonus: num(mods.turnSnapBonus, 0),
                inputBufferBonus: num(mods.inputBufferBonus, 0),
                unstablePowder: !!mods.unstablePowder,
                economyBonus: num(mods.economyBonus, 0)
            })
        };
    }

    function createDeathEchoSnapshot(source = 'unknown') {
        if (typeof gameState === 'undefined' || !player) return null;
        const level = Math.floor(num(gameState.level, 0));
        if (level < 1 || level > MAX_ECHOES) return null;
        const tile = playerTile();
        return {
            version: VERSION,
            echoId: `echo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            createdAt: Date.now(),
            sourceRun: Math.floor(num(gameState.runNumber, 0)),
            level,
            cause: String(source || 'unknown'),
            position: { x: tile.x, y: tile.y },
            build: snapshotBuild(),
            relics: snapshotRelics()
        };
    }

    function readStore() {
        try {
            const raw = global.localStorage?.getItem(STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : {};
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
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

    function saveEcho(echo) {
        if (!echo) return false;
        const store = readStore();
        store[String(Math.floor(num(echo.level, 0)))] = clone(echo);
        return writeStore(store);
    }

    function clearEcho(level) {
        const store = readStore();
        delete store[String(Math.floor(num(level, 0)))];
        writeStore(store);
    }

    function getEcho(level) {
        const echo = readStore()[String(Math.floor(num(level, 0)))];
        return echo && COMPATIBLE_VERSIONS.has(String(echo.version)) ? echo : null;
    }

    function recordDeathEchoV61(source = 'unknown') {
        const echo = createDeathEchoSnapshot(source);
        return echo && saveEcho(echo) ? echo : null;
    }

    function chooseSpawnTile(savedPosition, playerPos) {
        const preferred = { x: 1, y: Math.max(1, gameState.gridHeight - 2) };
        const candidates = [];
        for (let y = 1; y < gameState.gridHeight - 1; y++) {
            for (let x = 1; x < gameState.gridWidth - 1; x++) {
                if (!passableTile(x, y)) continue;
                const playerDistance = Math.abs(x - playerPos.x) + Math.abs(y - playerPos.y);
                if (playerDistance < 4) continue;
                const savedDistance = Math.abs(x - savedPosition.x) + Math.abs(y - savedPosition.y);
                const cornerDistance = Math.abs(x - preferred.x) + Math.abs(y - preferred.y);
                candidates.push({ x, y, score: savedDistance * 2 + cornerDistance - playerDistance * 0.2 });
            }
        }
        candidates.sort((a, b) => a.score - b.score || a.y - b.y || a.x - b.x);
        return candidates[0] || preferred;
    }

    function hasAbility(ghost, capability) {
        return Array.isArray(ghost?.inheritedCapabilities) && ghost.inheritedCapabilities.includes(String(capability).toUpperCase());
    }

    function getDirections() {
        return [
            { x: 0, y: -1, dir: 'up' },
            { x: 1, y: 0, dir: 'right' },
            { x: 0, y: 1, dir: 'down' },
            { x: -1, y: 0, dir: 'left' }
        ];
    }

    function opposite(dir) {
        return ({ up:'down', down:'up', left:'right', right:'left' })[dir] || null;
    }

    function facingVector(dir) {
        return getDirections().find(item => item.dir === dir) || { x:0, y:1, dir:'down' };
    }

    function echoRoll(ghost, salt = 0) {
        const seed = Math.abs(Math.floor(num(ghost?.aiSeed, 0))) +
            Math.abs(Math.floor(num(ghost?.thinkCount, 0))) * 17 +
            Math.abs(Math.floor(num(ghost?.patrolTurnCount, 0))) * 31 +
            Math.abs(Math.floor(num(salt, 0))) * 97;
        const value = Math.sin(seed * 12.9898) * 43758.5453;
        return value - Math.floor(value);
    }

    function adjacentOptions(ghost) {
        const tile = tileFromEntity(ghost);
        return getDirections().filter(dir => passableTile(tile.x + dir.x, tile.y + dir.y, ghost));
    }

    function choosePatrolDirection(ghost) {
        const current = ghost.dir || 'down';
        const options = adjacentOptions(ghost);
        if (!options.length) return null;

        const forward = options.find(item => item.dir === current);
        const reverse = options.find(item => item.dir === opposite(current));
        const sides = options.filter(item => item.dir !== current && item.dir !== opposite(current));

        // En corredores sigue recto. En cruces decide ocasionalmente un giro,
        // pero no cambia de dirección cada tile. Esto evita el movimiento mecánico.
        if (forward && sides.length === 0) return forward;
        if (forward && echoRoll(ghost, 3) >= ECHO_AI.patrolSideChance) return forward;
        if (sides.length) {
            const index = Math.floor(echoRoll(ghost, 5) * sides.length) % sides.length;
            return sides[index];
        }
        return reverse || forward || options[0];
    }

    function chooseChaseDirection(ghost, target) {
        const tile = tileFromEntity(ghost);
        const options = adjacentOptions(ghost);
        if (!options.length) return null;

        const reverseDir = opposite(ghost.dir);
        const scored = options.map((dir, index) => {
            const nx = tile.x + dir.x;
            const ny = tile.y + dir.y;
            const distance = Math.abs(nx - target.x) + Math.abs(ny - target.y);
            const sameColumn = nx === target.x;
            const sameRow = ny === target.y;
            const keepsHeading = dir.dir === ghost.dir;
            const reverses = dir.dir === reverseDir && options.length > 1;

            let score = distance * 2.2;
            if (keepsHeading) score -= 0.65;
            if (sameColumn || sameRow) score -= 0.8;
            if (reverses) score += 1.8;
            score += echoRoll(ghost, 11 + index) * 0.22;

            return { ...dir, score };
        });

        scored.sort((a, b) => a.score - b.score);
        return scored[0] || null;
    }

    function dangerCells() {
        const danger = new Set();
        for (const bomb of (gameState.bombs || [])) {
            if (!bomb || bomb.state === BOMB_V4_STATES?.CARRIED || bomb.carriedBy) continue;
            const timer = num(bomb.timer, num(bomb.fuseTotal, 0));
            // Una bomba con mecha larga no convierte toda su línea de explosión
            // en peligro instantáneo. El Echo puede manipularla y huir cuando
            // queda poco tiempo; las bombas en movimiento siguen siendo amenaza.
            const isOwnEchoBomb = bomb.owner === GHOST_OWNER && bomb.echoId === state.active?.echoId;
            const imminent = isOwnEchoBomb || bomb.pendingDetonation === true ||
                bomb.state === BOMB_V4_STATES?.MOVING || timer <= ECHO_AI.dangerFuseMs;
            if (!imminent) continue;
            danger.add(cellKey(Number(bomb.x), Number(bomb.y)));
            if (typeof calculateBombBlastCells === 'function') {
                for (const cell of calculateBombBlastCells(bomb)) danger.add(cellKey(Number(cell.x), Number(cell.y)));
            }
        }
        for (const exp of (gameState.explosions || [])) {
            if (exp) danger.add(cellKey(Number(exp.x), Number(exp.y)));
        }
        return danger;
    }

    function chooseEscapeDirection(ghost) {
        if (!isCenteredOnTile(ghost)) return null;
        const current = tileFromEntity(ghost);
        const danger = dangerCells();
        const options = adjacentOptions(ghost);
        if (!options.length) return null;
        const forwardDir = ghost.dir;
        const reverseDir = opposite(ghost.dir);
        const scored = options.map((dir, index) => {
            const x = current.x + dir.x;
            const y = current.y + dir.y;
            const key = cellKey(x, y);
            const dangerPenalty = danger.has(key) ? 10000 : 0;
            const localDanger = [
                cellKey(x + 1, y), cellKey(x - 1, y),
                cellKey(x, y + 1), cellKey(x, y - 1)
            ].reduce((sum, k) => sum + (danger.has(k) ? 1 : 0), 0);
            let score = dangerPenalty + localDanger * 4;
            if (dir.dir === forwardDir) score -= 0.75;
            if (dir.dir === reverseDir && options.length > 1) score += 0.35;
            score += echoRoll(ghost, 23 + index) * 0.15;
            return { ...dir, score };
        });
        scored.sort((a, b) => a.score - b.score);
        return scored[0] || null;
    }

    function chooseInteractionBomb(ghost) {
        if (!hasAbility(ghost, 'GRAB')) return null;
        if (typeof global.getAdjacentGrabBombAnyDirectionV687 !== 'function') return null;
        const bomb = global.getAdjacentGrabBombAnyDirectionV687(ghost) || null;
        if (!bomb) return null;

        // No recoge bombas por rozarlas: sólo aprovecha una oportunidad actual.
        const tile = tileFromEntity(ghost);
        const target = playerTile();
        const aligned = tile.x === target.x || tile.y === target.y;
        const front = facingVector(ghost.dir);
        const frontBomb = Number(bomb.x) === tile.x + front.x && Number(bomb.y) === tile.y + front.y;
        // Una bomba adyacente puede tapar la línea de visión al jugador. Eso
        // no debe impedir que el Echo identifique y manipule esa misma bomba.
        if (aligned || frontBomb) return bomb;
        if (!visibleToPlayer(ghost)) return null;
        return echoRoll(ghost, 29) > 0.45 ? bomb : null;
    }

    function isOtherEntityAtTile(x, y, ghost) {
        const p = playerTile();
        if (p.x === x && p.y === y) return true;
        const candidates = [...(gameState.enemies || []), gameState.boss].filter(Boolean);
        for (const entity of candidates) {
            if (!entity || entity === ghost || entity.defeated) continue;
            const tile = tileFromEntity(entity);
            if (tile.x === x && tile.y === y) return true;
        }
        return false;
    }

    function collectReachableTiles(ghost) {
        const start = tileFromEntity(ghost);
        const reachable = new Map();
        const queue = [{ x:start.x, y:start.y, distance:0, firstDirection:null }];
        reachable.set(cellKey(start.x, start.y), queue[0]);
        for (let i = 0; i < queue.length; i++) {
            const node = queue[i];
            for (const direction of getDirections()) {
                const x = node.x + direction.x;
                const y = node.y + direction.y;
                const key = cellKey(x, y);
                if (reachable.has(key) || !passableTile(x, y, ghost)) continue;
                if (isOtherEntityAtTile(x, y, ghost)) continue;
                const next = {
                    x, y,
                    distance: node.distance + 1,
                    firstDirection: node.firstDirection || direction
                };
                reachable.set(key, next);
                queue.push(next);
            }
        }
        return reachable;
    }

    function axisDirectionBetween(from, to) {
        if (from.x === to.x && from.y !== to.y) return { x:0, y:Math.sign(to.y - from.y), dir:to.y < from.y ? 'up' : 'down' };
        if (from.y === to.y && from.x !== to.x) return { x:Math.sign(to.x - from.x), y:0, dir:to.x < from.x ? 'left' : 'right' };
        return null;
    }

    function clearAxisToPlayer(from, maxDistance = ECHO_AI.visionRange) {
        const target = playerTile();
        const direction = axisDirectionBetween(from, target);
        if (!direction) return false;
        const distance = Math.abs(target.x - from.x) + Math.abs(target.y - from.y);
        if (distance < 1 || distance > maxDistance) return false;
        let x = from.x + direction.x;
        let y = from.y + direction.y;
        while (x !== target.x || y !== target.y) {
            if (!inside(x, y)) return false;
            const type = gameState.grid?.[y]?.[x];
            if (type === TYPES.WALL || type === TYPES.BLOCK || bombAt(x, y)) return false;
            x += direction.x;
            y += direction.y;
        }
        return true;
    }

    function isValidBombDropTile(x, y, ghost) {
        if (!passableTile(x, y, ghost)) return false;
        if (isOtherEntityAtTile(x, y, ghost)) return false;
        return true;
    }

    // El plan sólo contiene el objetivo de la acción actual. No se guardan rutas,
    // movimientos anteriores ni patrones del jugador entre decisiones o partidas.
    function chooseBombCarryPlan(ghost) {
        const reachable = collectReachableTiles(ghost);
        const target = playerTile();
        const canThrow = hasAbility(ghost, 'THROW');
        const canKick = hasAbility(ghost, 'KICK');
        const candidates = [];

        for (const node of reachable.values()) {
            if (node.distance < 1 || !isValidBombDropTile(node.x, node.y, ghost)) continue;
            const distanceToPlayer = Math.abs(target.x - node.x) + Math.abs(target.y - node.y);
            if (distanceToPlayer < 2 || distanceToPlayer > ECHO_AI.visionRange) continue;
            const directionToPlayer = axisDirectionBetween({ x:node.x, y:node.y }, target);
            if (!directionToPlayer || !clearAxisToPlayer({ x:node.x, y:node.y }, ECHO_AI.visionRange)) continue;

            let kickPlan = null;
            if (canKick) {
                const approach = { x:node.x - directionToPlayer.x, y:node.y - directionToPlayer.y };
                if (isValidBombDropTile(approach.x, approach.y, ghost) && reachable.has(cellKey(approach.x, approach.y))) {
                    kickPlan = { approachTile:approach, direction:directionToPlayer };
                }
            }
            const canThrowFromHere = canThrow && distanceToPlayer <= 3;
            const preferredDistance = canThrowFromHere ? 2 : (kickPlan ? 3 : 2.5);
            const score = node.distance * 0.85 + Math.abs(distanceToPlayer - preferredDistance) * 1.8;
            candidates.push({
                targetTile:{ x:node.x, y:node.y },
                kickPlan,
                score
            });
        }

        candidates.sort((a, b) => a.score - b.score);
        if (candidates.length) return candidates[0];

        // En habitaciones cerradas también puede transportar y soltar una bomba;
        // no queda bloqueado esperando una alineación perfecta.
        const fallback = [...reachable.values()]
            .filter(node => node.distance >= 1 && isValidBombDropTile(node.x, node.y, ghost))
            .sort((a, b) => {
                const da = Math.abs(target.x - a.x) + Math.abs(target.y - a.y);
                const db = Math.abs(target.x - b.x) + Math.abs(target.y - b.y);
                return Math.abs(da - 2.5) + a.distance * 0.35 - (Math.abs(db - 2.5) + b.distance * 0.35);
            });
        if (!fallback.length) return null;
        return { targetTile:{ x:fallback[0].x, y:fallback[0].y }, kickPlan:null, score:Infinity };
    }

    function chooseRouteDirection(ghost, targetTile) {
        if (!targetTile) return null;
        const current = tileFromEntity(ghost);
        if (current.x === targetTile.x && current.y === targetTile.y) return null;
        const reachable = collectReachableTiles(ghost);
        return reachable.get(cellKey(targetTile.x, targetTile.y))?.firstDirection || null;
    }

    function updateInteraction(ghost) {
        const carried = typeof global.getCarriedBombForEntityV682 === 'function'
            ? global.getCarriedBombForEntityV682(ghost)
            : null;

        if (carried) {
            const tile = tileFromEntity(ghost);
            const destination = ghost.carryPlan?.targetTile || null;
            const reachedDestination = destination && tile.x === destination.x && tile.y === destination.y;
            const timedOut = ghost.carryTimer <= 0;
            if (ghost.interactionTimer > 0) return true;
            if (!reachedDestination && !timedOut) return true;

            // No suelta la bomba en cuanto llega al primer destino. La transporta
            // durante varios segundos y reevalúa otra posición mientras todavía
            // tenga tiempo; esto usa sólo el tablero actual, sin memoria del jugador.
            if (reachedDestination && !timedOut && num(ghost.carryElapsedMs, 0) < ECHO_AI.minimumCarryMs) {
                if (ghost.carryReplanTimerMs <= 0) {
                    const nextPlan = chooseBombCarryPlan(ghost);
                    if (nextPlan) {
                        ghost.carryPlan = nextPlan;
                    } else {
                        // Sin una colocación táctica válida, continúa moviéndose
                        // con la bomba y volverá a evaluarlo al vencer el tiempo.
                        ghost.carryPlan = null;
                        ghost.aiTargetTile = null;
                    }
                    ghost.carryReplanTimerMs = ECHO_AI.carryReplanMs;
                }
                return true;
            }

            const target = playerTile();
            const aligned = tile.x === target.x || tile.y === target.y;
            if (reachedDestination && hasAbility(ghost, 'THROW') && visibleToPlayer(ghost) && aligned && typeof global.throwCarriedBombV683 === 'function') {
                ghost.dir = tile.x === target.x
                    ? (target.y < tile.y ? 'up' : 'down')
                    : (target.x < tile.x ? 'left' : 'right');
                ghost.lastDirection = ghost.dir;
                if (global.throwCarriedBombV683(ghost)) {
                    ghost.carryTimer = 0;
                    ghost.carryPlan = null;
                    ghost.mode = 'ESCAPE';
                    ghost.interactionTimer = 650;
                    ghost.aiTargetTile = null;
                    return true;
                }
            }

            // Si llegó al sector elegido, conserva una posible maniobra de patada.
            // Si se agotó el tiempo, deja la bomba donde está y abandona la maniobra.
            const kickPlan = reachedDestination && !timedOut && hasAbility(ghost, 'KICK')
                ? ghost.carryPlan?.kickPlan
                : null;
            if (typeof global.releaseCarriedBombV682 === 'function' && global.releaseCarriedBombV682(ghost, 'drop')) {
                ghost.carryTimer = 0;
                ghost.carryPlan = null;
                ghost.aiTargetTile = null;
                if (kickPlan) {
                    ghost.kickPlan = {
                        bombRef:carried,
                        approachTile:{ x:kickPlan.approachTile.x, y:kickPlan.approachTile.y },
                        direction:{ x:kickPlan.direction.x, y:kickPlan.direction.y, dir:kickPlan.direction.dir }
                    };
                    ghost.mode = 'KICK_ALIGN';
                    ghost.interactionTimer = 0;
                } else {
                    ghost.mode = 'PATROL';
                    ghost.interactionTimer = 240;
                }
                return true;
            }
            return true;
        }

        if (ghost.interactionTimer > 0) return false;
        const bomb = chooseInteractionBomb(ghost);
        if (!bomb || typeof global.grabBombV682 !== 'function') return false;
        if (!global.grabBombV682(ghost, bomb)) return false;
        ghost.carryPlan = chooseBombCarryPlan(ghost);
        ghost.carryTimer = ECHO_AI.carryTimeoutMs;
        ghost.carryElapsedMs = 0;
        ghost.carryReplanTimerMs = 0;
        ghost.mode = 'CARRY';
        ghost.interactionTimer = 180;
        return true;
    }

    function tryKickAdjacentBomb(ghost) {
        if (!hasAbility(ghost, 'KICK')) return false;
        if (typeof global.startBombKickV682 !== 'function') return false;
        const tile = tileFromEntity(ghost);
        const dir = facingVector(ghost.dir);
        const bomb = (gameState.bombs || []).find(b => b && b.state === BOMB_V4_STATES.ARMED && !b.carriedBy && Number(b.x) === tile.x + dir.x && Number(b.y) === tile.y + dir.y);
        if (!bomb) return false;
        return !!global.startBombKickV682(bomb, ghost, { x:dir.x, y:dir.y });
    }

    function chooseAttack(ghost) {
        if (ghost._tileMoveActive || !isCenteredOnTile(ghost) || !visibleToPlayer(ghost)) return null;
        const a = tileFromEntity(ghost);
        const b = playerTile();
        if (a.x !== b.x && a.y !== b.y) return null;
        const distance = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
        // El rango de la bomba debe determinar la oportunidad. La condición anterior
        // exigía SIEMPRE 2 casillas y anulaba todos los ataques con alcance 1.
        const effectiveRange = Math.max(1, Math.min(ECHO_AI.bombSpatialRange, Math.floor(num(ghost.bombRange, 1))));
        if (distance < 1 || distance > effectiveRange) return null;
        if (!passableTile(a.x, a.y, ghost) || bombAt(a.x, a.y)) return null;
        if (typeof calculateBombBlastCells !== 'function') return null;
        const cells = calculateBombBlastCells({ x:a.x, y:a.y, range:ghost.bombRange });
        if (!cells.some(c => Number(c.x) === b.x && Number(c.y) === b.y)) return null;
        return { x:a.x, y:a.y };
    }

    function ghostBombCount(ghost) {
        return (gameState.bombs || []).filter(b => b && b.owner === GHOST_OWNER && b.echoId === ghost.echoId).length;
    }

    function createGhostBomb(ghost) {
        if (!ghost || ghost._tileMoveActive || !snapEchoToGrid(ghost) || !isCenteredOnTile(ghost)) return false;
        if (ghost.bombCooldown > 0 || ghostBombCount(ghost) >= ghost.maxBombs) return false;
        const tile = tileFromEntity(ghost);
        if (bombAt(tile.x, tile.y)) return false;
        const baseFuse = gameState.roomType?.id === 'CURSED' ? BOMB_HANDLING.cursedFuse : BOMB_HANDLING.normalFuse;
        const fuseTotal = Math.max(ECHO_AI.minimumFuseMs, Math.round(baseFuse * Math.max(1.2, num(ghost.relicMods?.bombFuseMultiplier, 1))));
        const worldX = (tile.x + 0.5) * TILE_SIZE;
        const worldY = (tile.y + 0.5) * TILE_SIZE;
        const bomb = {
            id:`echo-bomb-${ghost.echoId}-${gameState.animFrame}-${Math.random().toString(36).slice(2,6)}`,
            owner:GHOST_OWNER,
            echoId:ghost.echoId,
            x:tile.x,
            y:tile.y,
            range:Math.min(ECHO_AI.maxBombRange, Math.max(1, Math.floor(num(ghost.bombRange, 1)))),
            timer:fuseTotal,
            fuseTotal,
            warnBucket:Math.ceil(fuseTotal / 300),
            scalePulse:1,
            playerPassThrough:false,
            justArmed:false,
            placedAtFrame:gameState.animFrame,
            placementReason:'death-echo-placed',
            state:BOMB_V4_STATES.ARMED,
            motionState:'idle',
            worldX,
            worldY,
            motionProgress:1,
            motionTimer:0,
            motionDuration:0,
            motionStartX:worldX,
            motionStartY:worldY,
            motionTargetX:worldX,
            motionTargetY:worldY,
            motionArc:0,
            motionRotation:0,
            motionRotationSpeed:0,
            bobPhase:0,
            motionQueue:[],
            preserveTimerOnArm:false,
            countsTowardPlayerCapacity:false,
            canKick:false,
            canPush:false,
            canCarry:false,
            carriedBy:null,
            elementV612:ghost.bombElementV612,
            effectIds:Array.isArray(global.ELEMENTAL_BOMB_DEFS_V612?.[ghost.bombElementV612]?.effectIds) ? [...global.ELEMENTAL_BOMB_DEFS_V612[ghost.bombElementV612].effectIds] : []
        };
        gameState.bombs.push(bomb);
        ghost.bombCooldown = ECHO_AI.bombCooldownMs;
        ghost.mode = 'ESCAPE';
        ghost.escapeTimer = 0;
        ghost.aiTargetTile = null;
        ghost.thinkTimer = 0;
        ghost.attackFlash = 180;
        if (typeof addParticles === 'function') addParticles(worldX, worldY, 'particleDanger', 8);
        if (typeof sfx === 'function') sfx('bomb');
        return true;
    }

    function updatePlannedKick(ghost, dt) {
        const plan = ghost?.kickPlan;
        if (!plan || ghost.mode !== 'KICK_ALIGN') return false;
        const bomb = plan.bombRef;
        if (!bomb || !(gameState.bombs || []).includes(bomb) || bomb.state !== BOMB_V4_STATES.ARMED || bomb.carriedBy) {
            ghost.kickPlan = null;
            ghost.mode = 'PATROL';
            return true;
        }
        // La preparación para patear se cancela si ya no hay una mecha segura.
        // El flujo general de peligro decide la huida en este mismo frame.
        if (bomb.pendingDetonation === true || num(bomb.timer, num(bomb.fuseTotal, 0)) <= ECHO_AI.dangerFuseMs) {
            ghost.kickPlan = null;
            ghost.mode = 'ESCAPE';
            ghost.aiTargetTile = null;
            ghost.thinkTimer = 0;
            return false;
        }

        const tile = tileFromEntity(ghost);
        const approach = plan.approachTile;
        if (tile.x === approach.x && tile.y === approach.y) {
            ghost.dir = plan.direction.dir;
            ghost.lastDirection = ghost.dir;
            const kicked = typeof global.startBombKickV682 === 'function' &&
                global.startBombKickV682(bomb, ghost, { x:plan.direction.x, y:plan.direction.y });
            ghost.kickPlan = null;
            ghost.aiTargetTile = null;
            ghost.mode = kicked ? 'ESCAPE' : 'PATROL';
            ghost.thinkTimer = kicked ? 360 : 0;
            ghost.directionCommitMs = 260;
            return true;
        }

        const direction = chooseRouteDirection(ghost, approach);
        if (!direction) {
            ghost.kickPlan = null;
            ghost.mode = 'PATROL';
            ghost.aiTargetTile = null;
            return true;
        }
        updateEchoMovement(ghost, direction, dt);
        return true;
    }

    function beginTileMove(ghost, direction) {
        if (!direction || ghost._tileMoveActive) return false;
        if (!snapEchoToGrid(ghost) || !isCenteredOnTile(ghost)) return false;
        const tile = tileFromEntity(ghost);
        const gx = tile.x + direction.x;
        const gy = tile.y + direction.y;
        if (!passableTile(gx, gy, ghost)) return false;
        if (!gridBeginTileMove(ghost, gx, gy, { kind:'enemy', allowCurrentBombTile:false })) return false;
        ghost.dir = direction.dir;
        ghost.lastDirection = direction.dir;
        ghost.moving = true;
        ghost.isMoving = true;
        ghost.blockedDirection = null;
        ghost.wallPauseMs = 0;
        ghost.blockedRetryMs = 0;
        return true;
    }

    function moveTileByTile(ghost, direction, dt) {
        if (ghost._tileMoveActive) {
            const result = gridAdvanceTileMove(ghost, ghost.speed, dt, { kind:'enemy', allowCurrentBombTile:false });
            ghost.moving = !result.arrived;
            ghost.isMoving = ghost.moving;
            if (result.arrived) {
                const gx = Number(ghost._tileMoveTargetGX);
                const gy = Number(ghost._tileMoveTargetGY);
                if (Number.isInteger(gx) && Number.isInteger(gy) && typeof global.gridSnapEntityCenteredV628 === 'function') {
                    global.gridSnapEntityCenteredV628(ghost, gx, gy);
                }
                ghost.moving = false;
                ghost.isMoving = false;
                ghost.moveDistance += TILE_SIZE;
            }
            return true;
        }

        ghost.wallPauseMs = Math.max(0, num(ghost.wallPauseMs, 0) - num(dt, 16));
        ghost.blockedRetryMs = Math.max(0, num(ghost.blockedRetryMs, 0) - num(dt, 16));
        if (ghost.wallPauseMs > 0 || ghost.blockedRetryMs > 0) {
            ghost.moving = false;
            ghost.isMoving = false;
            return false;
        }

        if (beginTileMove(ghost, direction)) return true;

        // La entidad acaba de chocar con pared/bloque/bomba: no gira enseguida.
        // Espera 2 segundos y recién después decide el siguiente corredor.
        ghost.wallPauseMs = ECHO_AI.wallPauseMs;
        ghost.blockedRetryMs = 0;
        ghost.blockedDirection = direction.dir;
        ghost.moving = false;
        ghost.isMoving = false;
        ghost.wallHits = num(ghost.wallHits, 0) + 1;
        return false;
    }

    function chooseAfterWall(ghost) {
        const tile = tileFromEntity(ghost);
        const options = adjacentOptions(ghost);
        if (!options.length) return null;
        const blocked = ghost.blockedDirection;
        const sides = options.filter(dir => dir.dir !== blocked && dir.dir !== opposite(blocked));
        if (sides.length) return sides[Math.floor((num(ghost.wallHits, 0) + num(ghost.aiSeed, 0)) % sides.length)];
        return options.find(dir => dir.dir === opposite(blocked)) || options[0];
    }

    function updateEchoMovement(ghost, desiredDirection, dt) {
        if (ghost._tileMoveActive) return moveTileByTile(ghost, desiredDirection, dt);

        ghost.wallPauseMs = Math.max(0, num(ghost.wallPauseMs, 0) - num(dt, 16));
        ghost.blockedRetryMs = Math.max(0, num(ghost.blockedRetryMs, 0) - num(dt, 16));

        if (ghost.wallPauseMs > 0) {
            if (ghost.blockedDirection && ghost.blockedRetryMs <= 0) {
                const blocked = facingVector(ghost.blockedDirection);
                if (passableTile(tileFromEntity(ghost).x + blocked.x, tileFromEntity(ghost).y + blocked.y, ghost)) {
                    ghost.wallPauseMs = 0;
                    ghost.blockedRetryMs = 0;
                    ghost.blockedDirection = null;
                    if (beginTileMove(ghost, blocked)) return true;
                } else {
                    ghost.blockedRetryMs = ECHO_AI.blockedRetryMs;
                }
            }
            ghost.moving = false;
            ghost.isMoving = false;
            return false;
        }

        if (ghost.blockedDirection) {
            const afterWall = chooseAfterWall(ghost);
            if (afterWall && beginTileMove(ghost, afterWall)) {
                ghost.blockedDirection = null;
                ghost.wallPauseMs = 0;
                ghost.blockedRetryMs = 0;
                return true;
            }
            // Sigue encerrado: no se congela indefinidamente. Revisa de nuevo
            // cada pocos milisegundos hasta que aparezca una casilla libre.
            ghost.blockedRetryMs = ECHO_AI.blockedRetryMs;
            ghost.moving = false;
            ghost.isMoving = false;
            return false;
        }

        return moveTileByTile(ghost, desiredDirection, dt);
    }

    function syncDeathEchoV61() {
        if (typeof gameState === 'undefined') return null;
        const level = Math.floor(num(gameState.level, 0));
        if (level < 1 || level > MAX_ECHOES) return null;
        if (state.checkedLevel === level && state.active && !state.active.defeated) return state.active;
        if (state.checkedLevel === level && !state.active) return null;

        state.checkedLevel = level;
        state.active = null;
        gameState.deathEchoV61 = null;
        const saved = getEcho(level);
        if (!saved) return null;

        const spawn = chooseSpawnTile(saved.position || {x:1,y:1}, playerTile());
        const build = saved.build || {};
        const inheritedCapabilities = new Set(
            (Array.isArray(build.capabilities) ? build.capabilities : [])
                .map(String).map(id => id.toUpperCase())
                .filter(id => ['KICK','GRAB','THROW'].includes(id))
        );
        // GRAB forma parte del bucle táctico central de Death Echo, aunque el
        // jugador no haya conseguido GRAB en esa partida. THROW sí se hereda.
        inheritedCapabilities.add('GRAB');

        const ghost = {
            ...clone(saved),
            archetype:'echo',
            x:spawn.x * TILE_SIZE + TILE_SIZE / 2,
            y:spawn.y * TILE_SIZE + TILE_SIZE / 2,
            width:TILE_SIZE * 0.68,
            height:TILE_SIZE * 0.68,
            // El Echo conserva la identidad de su build, pero combate despacio y con una sola bomba corta.
            speed:clamp(Math.min(num(build.speed, 2) * 0.42, 1.35), 0.75, 1.35),
            sourceSpeed:clamp(Math.min(num(build.speed, 2) * 0.42, 1.35), 0.75, 1.35),
            maxBombs:1,
            bombRange:clamp(Math.floor(num(build.bombRange, 1)), 1, ECHO_AI.maxBombRange),
            bombElementV612:['normal','fire','ice','electric'].includes(String(build.bombElementV612)) ? String(build.bombElementV612) : 'normal',
            dir:['up','down','left','right'].includes(build.dir) ? build.dir : 'down',
            lastDirection:['up','down','left','right'].includes(build.dir) ? build.dir : 'down',
            inheritedCapabilities:[...inheritedCapabilities],
            capabilityProfileV681:{
                permanent:Array.isArray(build.capabilities) ? build.capabilities.map(id => String(id).toLowerCase()).filter(id => ['kick','grab','throw'].includes(id)) : [],
                byGroup:Object.create(null)
            },
            relicMods:clone(build.relicMods || {}),
            maxHealth:1,
            health:1,
            hasShield:false,
            hitFlash:0,
            attackFlash:0,
            lastHitBlastId:-1,
            defeated:false,
            visualTime:0,
            moveDistance:0,
            moving:false,
            isMoving:false,
            mode:'PATROL',
            aiTargetTile:null,
            wallPauseMs:0,
            blockedRetryMs:0,
            blockedDirection:null,
            wallHits:0,
            bombCooldown:ECHO_AI.bombCooldownMs,
            interactionTimer:0,
            carryTimer:0,
            carryElapsedMs:0,
            carryReplanTimerMs:0,
            reactionTimer:ECHO_AI.reactionMs,
            directionCommitMs:ECHO_AI.directionCommitMs,
            wasVisible:false,
            thinkTimer:ECHO_AI.thinkMs,
            thinkCount:0,
            patrolTurnCount:0,
            aiSeed:Math.floor(num(saved.createdAt, Date.now()) % 97),
            escapeTimer:0,
            _tileMoveActive:false,
            _tileMoveTargetX:spawn.x * TILE_SIZE + TILE_SIZE / 2,
            _tileMoveTargetY:spawn.y * TILE_SIZE + TILE_SIZE / 2,
            _tileMoveTargetGX:spawn.x,
            _tileMoveTargetGY:spawn.y,
            __gridAnchor:'center'
        };

        if (typeof global.gridSnapEntityCenteredV628 === 'function') {
            global.gridSnapEntityCenteredV628(ghost, spawn.x, spawn.y);
        } else {
            ghost.x = (spawn.x + 0.5) * TILE_SIZE;
            ghost.y = (spawn.y + 0.5) * TILE_SIZE;
        }
        state.active = ghost;
        gameState.deathEchoV61 = ghost;
        return ghost;
    }

    function releaseCarriedBombOnDeath(ghost) {
        if (typeof global.getCarriedBombForEntityV682 !== 'function' || typeof global.releaseCarriedBombV682 !== 'function') return;
        const carried = global.getCarriedBombForEntityV682(ghost);
        if (carried) global.releaseCarriedBombV682(ghost, 'death');
    }

    function recoverEchoItems(ghost) {
        const relics = Array.isArray(ghost.relics) ? ghost.relics : [];
        const recovered = [];
        for (const saved of relics) {
            let restored = false;
            if (typeof RELICS !== 'undefined' && typeof grantRelic === 'function') {
                const relic = RELICS.find(candidate => candidate.id === saved.id);
                if (relic && grantRelic(relic)) {
                    recovered.push(relic);
                    restored = true;
                }
            }
        }
        if (typeof addFloatingText === 'function') addFloatingText(recovered.length ? `ECO RECUPERADO ×${recovered.length}` : 'ECO DISIPADO', ghost.x, ghost.y, recovered.length ? '#c4b5fd' : '#94a3b8');
        if (typeof addParticles === 'function') addParticles(ghost.x, ghost.y, recovered.length ? 'particleImpact' : 'particleDanger', 18);
        clearEcho(ghost.level);
        state.active = null;
        gameState.deathEchoV61 = null;
        state.checkedLevel = Number(gameState.level);
        return recovered;
    }

    function damageDeathEchoV61(explosion) {
        const ghost = state.active;
        if (!ghost || ghost.defeated || !explosion || ghost.lastHitBlastId === explosion.blastId) return false;
        const left = ghost.x - ghost.width * 0.32;
        const right = ghost.x + ghost.width * 0.32;
        const top = ghost.y - ghost.height * 0.38;
        const bottom = ghost.y + ghost.height * 0.38;
        const cellLeft = Number(explosion.x) * TILE_SIZE + 5;
        const cellRight = (Number(explosion.x) + 1) * TILE_SIZE - 5;
        const cellTop = Number(explosion.y) * TILE_SIZE + 5;
        const cellBottom = (Number(explosion.y) + 1) * TILE_SIZE - 5;
        if (!(right > cellLeft && left < cellRight && bottom > cellTop && top < cellBottom)) return false;

        ghost.lastHitBlastId = explosion.blastId;
        releaseCarriedBombOnDeath(ghost);
        ghost.health = 0;
        ghost.maxHealth = 1;
        ghost.hasShield = false;
        ghost.defeated = true;
        ghost.hitFlash = 180;
        if (typeof addParticles === 'function') addParticles(ghost.x, ghost.y, 'particleDanger', 16);
        recoverEchoItems(ghost);
        return true;
    }

    function updateDeathEchoV61(dt) {
        if (typeof gameState === 'undefined' || !gameState.isPlaying || gameState.paused) return;
        const ghost = syncDeathEchoV61();
        if (!ghost || ghost.defeated) return;

        const delta = num(dt, 16);
        ghost.visualTime += Math.max(0, delta);
        ghost.bombCooldown = Math.max(0, num(ghost.bombCooldown, 0) - delta);
        ghost.interactionTimer = Math.max(0, num(ghost.interactionTimer, 0) - delta);
        ghost.carryTimer = Math.max(0, num(ghost.carryTimer, 0) - delta);
        ghost.carryReplanTimerMs = Math.max(0, num(ghost.carryReplanTimerMs, 0) - delta);
        const carriedAtFrameStart = typeof global.getCarriedBombForEntityV682 === 'function'
            ? global.getCarriedBombForEntityV682(ghost)
            : null;
        ghost.carryElapsedMs = carriedAtFrameStart
            ? num(ghost.carryElapsedMs, 0) + Math.max(0, delta)
            : 0;
        ghost.thinkTimer = Math.max(0, num(ghost.thinkTimer, 0) - delta);
        ghost.reactionTimer = Math.max(0, num(ghost.reactionTimer, 0) - delta);
        ghost.attackFlash = Math.max(0, num(ghost.attackFlash, 0) - delta);
        ghost.hitFlash = Math.max(0, num(ghost.hitFlash, 0) - delta);
        ghost.directionCommitMs = Math.max(0, num(ghost.directionCommitMs, 0) - delta);

        const visible = visibleToPlayer(ghost);
        if (visible && !ghost.wasVisible) ghost.reactionTimer = ECHO_AI.reactionMs;
        ghost.wasVisible = visible;

        // v6.28: una transición reservada se completa antes de evaluar otra
        // casilla. No se replantea una ruta ni se planta una bomba desde media celda.
        if (ghost._tileMoveActive) {
            moveTileByTile(ghost, null, delta);
            if (ghost._tileMoveActive) return;
        }
        snapEchoToGrid(ghost);

        // Una patada planificada se resuelve antes del detector general de peligro:
        // la casilla de preparación queda alineada con la bomba por diseño y debe
        // ejecutar la patada en cuanto llega, en vez de entrar en un bucle de huida.
        if (ghost.mode === 'KICK_ALIGN' && ghost.kickPlan) {
            if (updatePlannedKick(ghost, delta)) return;
        }

        // Interactúa con una bomba cercana antes de decidir huir de su radio potencial.
        // Sólo inicia la maniobra si la mecha aún da margen; si no, prima escapar.
        const currentlyCarryingBomb = typeof global.getCarriedBombForEntityV682 === 'function' && !!global.getCarriedBombForEntityV682(ghost);
        if (!currentlyCarryingBomb && ghost.mode !== 'CARRY' && !ghost._tileMoveActive && isCenteredOnTile(ghost) && ghost.interactionTimer <= 0) {
            const tile = tileFromEntity(ghost);
            const facing = facingVector(ghost.dir);
            const frontBomb = (gameState.bombs || []).find(b => b && b.state === BOMB_V4_STATES.ARMED && !b.carriedBy &&
                Number(b.x) === tile.x + facing.x && Number(b.y) === tile.y + facing.y);
            const frontFuse = frontBomb ? num(frontBomb.timer, num(frontBomb.fuseTotal, 0)) : 0;

            const candidate = hasAbility(ghost, 'GRAB') ? chooseInteractionBomb(ghost) : null;
            const candidateFuse = candidate ? num(candidate.timer, num(candidate.fuseTotal, 0)) : 0;
            const safeGrab = !!candidate && candidateFuse > ECHO_AI.dangerFuseMs;
            // Si la bomba es del jugador, suele convenir robarla. Si no está delante,
            // agarrarla permite trasladarla; si está delante y no es del jugador,
            // alterna entre agarrar y patear para no repetir siempre la misma acción.
            const preferGrab = safeGrab && (
                candidate !== frontBomb ||
                (candidate.owner === 'player' && echoRoll(ghost, 47) < 0.58) ||
                echoRoll(ghost, 48) < 0.25
            );
            if (preferGrab && updateInteraction(ghost)) return;

            // La patada se intenta después de la decisión de agarre; si está bloqueada,
            // el intento de agarre inferior sirve como alternativa real de reposición.
            if (frontBomb && frontFuse > ECHO_AI.dangerFuseMs && tryKickAdjacentBomb(ghost)) {
                ghost.mode = 'ESCAPE';
                ghost.thinkTimer = 360;
                ghost.directionCommitMs = 300;
                return;
            }
            if (safeGrab && updateInteraction(ghost)) return;
        }

        // 1. Primero resuelve peligro real. No intenta atacar mientras está en peligro.
        const danger = dangerCells();
        const current = tileFromEntity(ghost);
        if (danger.has(cellKey(current.x, current.y))) {
            ghost.mode = 'ESCAPE';
            const escape = chooseEscapeDirection(ghost);
            if (escape) {
                ghost.aiTargetTile = { x:current.x + escape.x, y:current.y + escape.y, dir:escape.dir };
                updateEchoMovement(ghost, escape, delta);
            }
            return;
        }

        // 2. Una bomba propia activa mantiene la prioridad de escapar.
        const ownBombs = (gameState.bombs || []).filter(b =>
            b && b.owner === GHOST_OWNER && b.echoId === ghost.echoId &&
            !b.carriedBy && b.state !== BOMB_V4_STATES.EXPLODING
        );
        if (ghost.mode === 'ESCAPE' && ownBombs.length) {
            if (ghost.thinkTimer <= 0 || !ghost.aiTargetTile) {
                ghost.thinkTimer = ECHO_AI.escapeThinkMs;
                const escape = chooseEscapeDirection(ghost);
                ghost.aiTargetTile = escape ? { x:current.x + escape.x, y:current.y + escape.y, dir:escape.dir } : null;
            }
            if (ghost.aiTargetTile) {
                const dir = facingVector(ghost.aiTargetTile.dir);
                updateEchoMovement(ghost, dir, delta);
            }
            return;
        }
        if (ghost.mode === 'ESCAPE' && !ownBombs.length) {
            ghost.mode = visible ? 'CHASE' : 'PATROL';
            ghost.aiTargetTile = null;
        }

        // 3. Interacción física. El jugador muerto conserva sus verbos, no una
        // IA nueva para cada capacidad.
        if (ghost.mode === 'CARRY') {
            const handled = updateInteraction(ghost);
            const carried = typeof global.getCarriedBombForEntityV682 === 'function'
                ? global.getCarriedBombForEntityV682(ghost)
                : null;
            if (carried) {
                const target = ghost.carryPlan?.targetTile || null;
                let direction = target ? chooseRouteDirection(ghost, target) : null;
                if (!direction && !target) {
                    direction = visible ? chooseChaseDirection(ghost, playerTile()) : choosePatrolDirection(ghost);
                }
                if (!direction && target) {
                    const here = tileFromEntity(ghost);
                    if (here.x !== target.x || here.y !== target.y) direction = choosePatrolDirection(ghost);
                }
                if (direction) updateEchoMovement(ghost, direction, delta);
                return;
            }
            if (handled) return;
        }

        // 4. Si hay una bomba delante y tenía KICK, puede usarla como lo haría
        // un jugador al encontrarse un obstáculo interactivo.
        if (ghost.directionCommitMs <= 0 && tryKickAdjacentBomb(ghost)) {
            ghost.mode = 'ESCAPE';
            ghost.thinkTimer = 360;
            ghost.directionCommitMs = 300;
            return;
        }

        // 5. Decisión ofensiva sólo tras una reacción humana mínima.
        if (!ghost._tileMoveActive && isCenteredOnTile(ghost) && visible && ghost.reactionTimer <= 0 && ghost.bombCooldown <= 0 && ghost.thinkTimer <= 0) {
            const attack = chooseAttack(ghost);
            if (attack && echoRoll(ghost, 41) <= ECHO_AI.attackChance && createGhostBomb(ghost)) {
                return;
            }
        }

        // 6. Elegir sólo un tile por decisión. Una vez iniciada la transición,
        // la completa antes de volver a pensar.
        if (!ghost._tileMoveActive && (ghost.thinkTimer <= 0 || !ghost.aiTargetTile || ghost.directionCommitMs <= 0)) {
            ghost.thinkCount += 1;
            const target = playerTile();
            const direction = visible
                ? chooseChaseDirection(ghost, target)
                : choosePatrolDirection(ghost);
            ghost.mode = visible ? 'CHASE' : 'PATROL';
            ghost.aiTargetTile = direction
                ? { x:current.x + direction.x, y:current.y + direction.y, dir:direction.dir }
                : null;
            ghost.thinkTimer = visible ? ECHO_AI.thinkMs : ECHO_AI.patrolThinkMs;
            ghost.directionCommitMs = ECHO_AI.directionCommitMs;
            if (!visible && direction && direction.dir !== ghost.dir) ghost.patrolTurnCount += 1;
        }

        if (ghost.aiTargetTile) {
            const direction = facingVector(ghost.aiTargetTile.dir);
            const moved = updateEchoMovement(ghost, direction, delta);
            if (moved && !ghost._tileMoveActive &&
                tileFromEntity(ghost).x === ghost.aiTargetTile.x &&
                tileFromEntity(ghost).y === ghost.aiTargetTile.y) {
                ghost.aiTargetTile = null;
            }
        }

        // Death Echo no causa daño por contacto. Sólo sus bombas y explosiones
        // pueden amenazar al jugador; el eco sigue recibiendo daño normalmente.
    }

    function installInitWrapper() {
        if (state.wrappedInitLevel || typeof global.initLevel !== 'function') return state.wrappedInitLevel;
        state.originalInitLevel = global.initLevel;
        global.initLevel = function initLevelV618(...args) {
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
        const target = depth == null ? Number(gameState?.level) : Number(depth);
        if (!state.active || state.active.defeated) return null;
        if (Number.isFinite(target) && Number(state.active.level) !== target) return null;
        return state.active;
    }

    function auditDeathEchoV61() {
        const stored = readStore();
        const errors = [];
        const levels = Object.keys(stored).filter(key => /^\d+$/.test(key));
        for (const level of levels) {
            const echo = stored[level];
            if (!echo || !COMPATIBLE_VERSIONS.has(String(echo.version))) errors.push(`Eco inválido en profundidad ${level}`);
            if (!echo?.build || !Number.isFinite(Number(echo.build.bombRange))) errors.push(`Build inválida en profundidad ${level}`);
        }
        return { valid:errors.length === 0, version:VERSION, storedLevels:levels.map(Number).sort((a,b)=>a-b), activeLevel:state.active ? Number(state.active.level) : null, errors };
    }

    installInitWrapper();

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
    global.BOMBER_ENGINE.getDeathEcho = getActiveDeathEchoV61;
    global.BOMBER_ENGINE.getActiveDeathEcho = getActiveDeathEchoV61;
    global.BOMBER_ENGINE.getPersistedDeathEcho = getEcho;
    global.BOMBER_ENGINE.auditDeathEcho = auditDeathEchoV61;
    global.BOMBER_ENGINE.canDeathEchoTracePlayer = visibleToPlayer;
})(window);
