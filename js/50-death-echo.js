// Bomberman Roguelike v6.12.13 — Death Echo: personaje muerto
// Echo representa al personaje que murió: conserva su build y utiliza los mismos
// verbos de interacción, pero con una IA autónoma y movimiento estrictamente tile-to-tile.
(function installDeathEchoV613(global) {
    'use strict';

    const VERSION = '6.12.13';
    const COMPATIBLE_VERSIONS = new Set([
        '6.3.0','6.3.1','6.5.1','6.7.0','6.7.1','6.7.1.1','6.11.0','6.12.12','6.12.13'
    ]);
    if (global.__DEATH_ECHO_V613_INSTALLED__) return;
    global.__DEATH_ECHO_V613_INSTALLED__ = true;

    const STORAGE_KEY = 'bombermanDeathEchoesV63';
    const MAX_ECHOES = 44;
    const GHOST_OWNER = 'death_echo';

    const ECHO_AI = Object.freeze({
        visionRange: 5,
        thinkMs: 160,
        patrolThinkMs: 420,
        wallPauseMs: 2000,
        blockedRetryMs: 220,
        bombCooldownMs: 1700,
        grabCooldownMs: 320,
        throwDelayMs: 300,
        escapeThinkMs: 120,
        bombSpatialRange: 2
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
        return {
            x: Math.floor(num(entity.x) / TILE_SIZE),
            y: Math.floor(num(entity.y) / TILE_SIZE)
        };
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
        const legacy = Array.isArray(gameState?.relics) ? gameState.relics : [];
        for (const relic of legacy) {
            const id = String(relic?.id || '');
            if (!id || seen.has(id)) continue;
            seen.add(id);
            result.push({ id, name:String(relic?.name || ''), icon:String(relic?.icon || '◆'), category:String(relic?.category || 'BOMB') });
        }
        const ids = global.ROGUELIKE_V327?.relics;
        const defs = Array.isArray(global.ROGUELIKE_RELICS_V327) ? global.ROGUELIKE_RELICS_V327 : [];
        for (const raw of (Array.isArray(ids) ? ids : [])) {
            const id = String(raw || '');
            if (!id || seen.has(id)) continue;
            const relic = defs.find(item => item.id === id);
            if (!relic) continue;
            seen.add(id);
            result.push({ id, name:String(relic.name || ''), icon:String(relic.icon || '◆'), category:String(relic.category || 'BOMB') });
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

    function adjacentOptions(ghost) {
        const tile = tileFromEntity(ghost);
        return getDirections().filter(dir => passableTile(tile.x + dir.x, tile.y + dir.y, ghost));
    }

    function choosePatrolDirection(ghost) {
        const current = ghost.dir;
        const options = adjacentOptions(ghost);
        if (!options.length) return null;
        const forward = options.find(item => item.dir === current);
        const sides = options.filter(item => item.dir !== current && item.dir !== opposite(current));
        if (forward) return forward;
        if (sides.length) return sides[Math.floor((num(ghost.aiSeed, 0) + ghost.patrolTurnCount) % sides.length)];
        return options.find(item => item.dir === opposite(current)) || options[0];
    }

    function chooseChaseDirection(ghost, target) {
        const tile = tileFromEntity(ghost);
        const options = adjacentOptions(ghost);
        if (!options.length) return null;
        const reverseDir = opposite(ghost.dir);
        const visible = visibleToPlayer(ghost);
        const ranked = options.map((dir, index) => {
            const nx = tile.x + dir.x;
            const ny = tile.y + dir.y;
            const directDistance = Math.abs(nx - target.x) + Math.abs(ny - target.y);
            const alignedX = nx === target.x ? 0 : 1;
            const alignedY = ny === target.y ? 0 : 1;
            const reversePenalty = dir.dir === reverseDir && options.length > 1 ? 1.5 : 0;
            const forwardBonus = dir.dir === ghost.dir ? -0.35 : 0;
            const alignmentBonus = visible ? -(alignedX + alignedY) * 0.45 : 0;
            const stability = ((num(ghost.aiSeed, 0) + ghost.thinkCount + index) % 7) * 0.03;
            return { ...dir, score: directDistance * 2 + reversePenalty + forwardBonus + alignmentBonus + stability };
        });
        ranked.sort((a, b) => a.score - b.score);
        return ranked[0] || null;
    }

    function dangerCells() {
        const danger = new Set();
        for (const bomb of (gameState.bombs || [])) {
            if (!bomb || bomb.state === BOMB_V4_STATES?.CARRIED || bomb.carriedBy) continue;
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
        const current = tileFromEntity(ghost);
        const danger = dangerCells();
        const target = playerTile();
        const options = adjacentOptions(ghost);
        const ranked = options.map(dir => {
            const x = current.x + dir.x;
            const y = current.y + dir.y;
            const key = cellKey(x, y);
            const playerDistance = Math.abs(x - target.x) + Math.abs(y - target.y);
            const hazardPenalty = danger.has(key) ? 10000 : 0;
            const reversePenalty = dir.dir === opposite(ghost.dir) ? 1.4 : 0;
            return { ...dir, score: hazardPenalty - playerDistance * 2 + reversePenalty };
        });
        ranked.sort((a, b) => a.score - b.score);
        return ranked[0] || null;
    }

    function chooseInteractionBomb(ghost) {
        if (!hasAbility(ghost, 'GRAB')) return null;
        if (typeof global.getAdjacentGrabBombAnyDirectionV687 !== 'function') return null;
        return global.getAdjacentGrabBombAnyDirectionV687(ghost) || null;
    }

    function updateInteraction(ghost, dt) {
        const carried = typeof global.getCarriedBombForEntityV682 === 'function'
            ? global.getCarriedBombForEntityV682(ghost)
            : null;

        ghost.interactionTimer = Math.max(0, num(ghost.interactionTimer, 0) - num(dt, 16));

        if (carried) {
            if (ghost.interactionTimer > 0) return true;
            if (hasAbility(ghost, 'THROW') && visibleToPlayer(ghost) && typeof global.throwCarriedBombV683 === 'function') {
                const target = playerTile();
                const tile = tileFromEntity(ghost);
                if (tile.x === target.x || tile.y === target.y) {
                    ghost.dir = tile.x === target.x ? (target.y < tile.y ? 'up' : 'down') : (target.x < tile.x ? 'left' : 'right');
                    ghost.lastDirection = ghost.dir;
                    if (global.throwCarriedBombV683(ghost)) {
                        ghost.mode = 'ESCAPE';
                        ghost.interactionTimer = 900;
                        return true;
                    }
                }
            }
            if (typeof global.releaseCarriedBombV682 === 'function') global.releaseCarriedBombV682(ghost, 'drop');
            ghost.interactionTimer = 260;
            ghost.mode = 'PATROL';
            return true;
        }

        if (ghost.interactionTimer > 0) return false;
        const bomb = chooseInteractionBomb(ghost);
        if (!bomb || typeof global.grabBombV682 !== 'function') return false;
        if (!global.grabBombV682(ghost, bomb)) return false;
        ghost.mode = 'CARRY';
        ghost.interactionTimer = hasAbility(ghost, 'THROW') ? ECHO_AI.throwDelayMs : 650;
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
        if (!visibleToPlayer(ghost)) return null;
        const a = tileFromEntity(ghost);
        const b = playerTile();
        if (a.x !== b.x && a.y !== b.y) return null;
        if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) !== ECHO_AI.bombSpatialRange) return null;
        if (!passableTile(a.x, a.y, ghost) || bombAt(a.x, a.y)) return null;
        if (typeof calculateBombBlastCells !== 'function') return null;
        const cells = calculateBombBlastCells({ x:a.x, y:a.y, range:ghost.bombRange });
        if (!cells.some(c => Number(c.x) === b.x && Number(c.y) === b.y)) return null;
        return { x:a.x, y:a.y };
    }

    function ghostBombCount(ghost) {
        return (gameState.bombs || []).filter(b => b && b.owner === GHOST_OWNER && b.echoId === ghost.echoId && !b.carriedBy).length;
    }

    function createGhostBomb(ghost) {
        if (ghost.bombCooldown > 0 || ghostBombCount(ghost) >= ghost.maxBombs) return false;
        const tile = tileFromEntity(ghost);
        const baseFuse = gameState.roomType?.id === 'CURSED' ? BOMB_HANDLING.cursedFuse : BOMB_HANDLING.normalFuse;
        const fuseTotal = Math.max(700, Math.round(baseFuse * Math.max(0.5, num(ghost.relicMods?.bombFuseMultiplier, 1))));
        const worldX = (tile.x + 0.5) * TILE_SIZE;
        const worldY = (tile.y + 0.5) * TILE_SIZE;
        const bomb = {
            id:`echo-bomb-${ghost.echoId}-${gameState.animFrame}-${Math.random().toString(36).slice(2,6)}`,
            owner:GHOST_OWNER,
            echoId:ghost.echoId,
            x:tile.x,
            y:tile.y,
            range:ghost.bombRange,
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
        ghost.attackFlash = 180;
        if (typeof addParticles === 'function') addParticles(worldX, worldY, 'particleDanger', 8);
        if (typeof sfx === 'function') sfx('bomb');
        return true;
    }

    function beginTileMove(ghost, direction) {
        if (!direction) return false;
        const tile = tileFromEntity(ghost);
        const gx = tile.x + direction.x;
        const gy = tile.y + direction.y;
        if (!passableTile(gx, gy, ghost)) return false;
        if (!gridBeginTileMove(ghost, gx, gy, { kind:'enemy', allowCurrentBombTile:false })) return false;
        ghost.dir = direction.dir;
        ghost.lastDirection = direction.dir;
        ghost.moving = true;
        ghost.blockedDirection = null;
        ghost.wallPauseMs = 0;
        ghost.blockedRetryMs = 0;
        return true;
    }

    function moveTileByTile(ghost, direction, dt) {
        if (ghost._tileMoveActive) {
            const result = gridAdvanceTileMove(ghost, ghost.speed, dt, { kind:'enemy', allowCurrentBombTile:false });
            ghost.moving = !result.arrived;
            if (result.arrived) {
                ghost.moving = false;
                ghost.moveDistance += TILE_SIZE;
            }
            return true;
        }

        ghost.wallPauseMs = Math.max(0, num(ghost.wallPauseMs, 0) - num(dt, 16));
        ghost.blockedRetryMs = Math.max(0, num(ghost.blockedRetryMs, 0) - num(dt, 16));
        if (ghost.wallPauseMs > 0 || ghost.blockedRetryMs > 0) {
            ghost.moving = false;
            return false;
        }

        if (beginTileMove(ghost, direction)) return true;

        // La entidad acaba de chocar con pared/bloque/bomba: no gira enseguida.
        // Espera 2 segundos y recién después decide el siguiente corredor.
        ghost.wallPauseMs = ECHO_AI.wallPauseMs;
        ghost.blockedRetryMs = 0;
        ghost.blockedDirection = direction.dir;
        ghost.moving = false;
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
        const ghost = {
            ...clone(saved),
            archetype:'echo',
            x:spawn.x * TILE_SIZE + TILE_SIZE / 2,
            y:spawn.y * TILE_SIZE + TILE_SIZE / 2,
            width:TILE_SIZE * 0.68,
            height:TILE_SIZE * 0.68,
            speed:clamp(num(build.speed, 3), 1, 8),
            sourceSpeed:clamp(num(build.speed, 3), 1, 8),
            maxBombs:clamp(Math.floor(num(build.maxBombs, 1)), 1, 10),
            bombRange:clamp(Math.floor(num(build.bombRange, 1)), 1, 16),
            bombElementV612:['normal','fire','ice','electric'].includes(String(build.bombElementV612)) ? String(build.bombElementV612) : 'normal',
            dir:['up','down','left','right'].includes(build.dir) ? build.dir : 'down',
            lastDirection:['up','down','left','right'].includes(build.dir) ? build.dir : 'down',
            inheritedCapabilities:Array.isArray(build.capabilities) ? build.capabilities.map(String).map(id => id.toUpperCase()).filter(id => ['KICK','GRAB','THROW'].includes(id)) : [],
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
            mode:'PATROL',
            aiTargetTile:null,
            wallPauseMs:0,
            blockedRetryMs:0,
            blockedDirection:null,
            wallHits:0,
            bombCooldown:0,
            interactionTimer:0,
            thinkTimer:0,
            thinkCount:0,
            patrolTurnCount:0,
            aiSeed:Math.floor(num(saved.createdAt, Date.now()) % 97),
            escapeTimer:0,
            _tileMoveActive:false,
            _tileMoveTargetX:spawn.x * TILE_SIZE + TILE_SIZE / 2,
            _tileMoveTargetY:spawn.y * TILE_SIZE + TILE_SIZE / 2,
            __gridAnchor:'center'
        };

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
            if (!restored && typeof global.rogueV327AcquireRelic === 'function' && global.rogueV327AcquireRelic(saved.id)) {
                recovered.push({ ...saved });
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

        ghost.visualTime += Math.max(0, num(dt, 16));
        ghost.bombCooldown = Math.max(0, num(ghost.bombCooldown, 0) - num(dt, 16));
        ghost.interactionTimer = Math.max(0, num(ghost.interactionTimer, 0) - num(dt, 16));
        ghost.thinkTimer = Math.max(0, num(ghost.thinkTimer, 0) - num(dt, 16));
        ghost.attackFlash = Math.max(0, num(ghost.attackFlash, 0) - num(dt, 16));
        ghost.hitFlash = Math.max(0, num(ghost.hitFlash, 0) - num(dt, 16));

        const visible = visibleToPlayer(ghost);
        const currentDanger = dangerCells();
        const currentTile = tileFromEntity(ghost);

        if (ghost.mode === 'CARRY') {
            updateInteraction(ghost, dt);
            const carried = typeof global.getCarriedBombForEntityV682 === 'function'
                ? global.getCarriedBombForEntityV682(ghost)
                : null;
            if (!carried) {
                ghost.mode = visible ? 'CHASE' : 'PATROL';
                return;
            }

            if (ghost._tileMoveActive) {
                moveTileByTile(ghost, facingVector(ghost.dir), dt);
                return;
            }

            const target = playerTile();
            const direction = visible
                ? chooseChaseDirection(ghost, target)
                : choosePatrolDirection(ghost);
            if (direction) updateEchoMovement(ghost, direction, dt);
            return;
        }

        const ownBombs = (gameState.bombs || []).filter(b => b && b.owner === GHOST_OWNER && b.echoId === ghost.echoId && !b.carriedBy && b.state !== BOMB_V4_STATES.EXPLODING);
        if (ghost.mode === 'ESCAPE' && ownBombs.length) {
            ghost.escapeTimer = Math.max(0, num(ghost.escapeTimer, 0) - num(dt, 16));
            if (ghost.thinkTimer <= 0 || !ghost.aiTargetTile) {
                const escape = chooseEscapeDirection(ghost);
                ghost.aiTargetTile = escape ? { x: currentTile.x + escape.x, y: currentTile.y + escape.y } : null;
                ghost.thinkTimer = ECHO_AI.escapeThinkMs;
            }
            if (ghost.aiTargetTile) {
                const dir = {
                    x: Math.sign(ghost.aiTargetTile.x - currentTile.x),
                    y: Math.sign(ghost.aiTargetTile.y - currentTile.y),
                    dir: ghost.aiTargetTile.x > currentTile.x ? 'right' : ghost.aiTargetTile.x < currentTile.x ? 'left' : ghost.aiTargetTile.y > currentTile.y ? 'down' : 'up'
                };
                updateEchoMovement(ghost, dir, dt);
            }
            return;
        }

        if (ghost.mode === 'ESCAPE' && !ownBombs.length) {
            ghost.mode = 'PATROL';
            ghost.aiTargetTile = null;
        }

        if (currentDanger.has(cellKey(currentTile.x, currentTile.y))) {
            const escape = chooseEscapeDirection(ghost);
            if (escape) updateEchoMovement(ghost, escape, dt);
            return;
        }

        updateInteraction(ghost, dt);
        if (ghost.mode === 'CARRY') return;

        // La decisión de ataque solo existe cuando Echo realmente ve al jugador.
        if (visible && ghost.thinkTimer <= 0 && ghost.bombCooldown <= 0) {
            if (tryKickAdjacentBomb(ghost)) {
                ghost.mode = 'ESCAPE';
                ghost.thinkTimer = 420;
                return;
            }
            const attack = chooseAttack(ghost);
            if (attack && createGhostBomb(ghost)) return;
        }

        if (ghost.thinkTimer <= 0 || !ghost.aiTargetTile) {
            ghost.thinkCount += 1;
            const target = playerTile();
            const direction = visible ? chooseChaseDirection(ghost, target) : choosePatrolDirection(ghost);
            ghost.mode = visible ? 'CHASE' : 'PATROL';
            ghost.aiTargetTile = direction ? { x: currentTile.x + direction.x, y: currentTile.y + direction.y, dir: direction.dir } : null;
            ghost.thinkTimer = visible ? ECHO_AI.thinkMs : ECHO_AI.patrolThinkMs;
            if (!visible && direction && direction.dir !== ghost.dir) ghost.patrolTurnCount += 1;
        }

        if (ghost.aiTargetTile) {
            const direction = {
                x: Math.sign(ghost.aiTargetTile.x - currentTile.x),
                y: Math.sign(ghost.aiTargetTile.y - currentTile.y),
                dir: ghost.aiTargetTile.dir || (ghost.aiTargetTile.x > currentTile.x ? 'right' : ghost.aiTargetTile.x < currentTile.x ? 'left' : ghost.aiTargetTile.y > currentTile.y ? 'down' : 'up')
            };
            const moved = updateEchoMovement(ghost, direction, dt);
            if (moved && !ghost._tileMoveActive && tileFromEntity(ghost).x === ghost.aiTargetTile.x && tileFromEntity(ghost).y === ghost.aiTargetTile.y) {
                ghost.aiTargetTile = null;
            }
        }

        if (visible) {
            const pRect = { left:player.x + player.width * 0.25, right:player.x + player.width * 0.75, top:player.y + player.height * 0.20, bottom:player.y + player.height * 0.82 };
            const gRect = { left:ghost.x - ghost.width * 0.32, right:ghost.x + ghost.width * 0.32, top:ghost.y - ghost.height * 0.38, bottom:ghost.y + ghost.height * 0.38 };
            if (pRect.right > gRect.left && pRect.left < gRect.right && pRect.bottom > gRect.top && pRect.top < gRect.bottom && typeof takeDamage === 'function') {
                takeDamage('death-echo', ghost.x, ghost.y);
            }
        }
    }

    function installInitWrapper() {
        if (state.wrappedInitLevel || typeof global.initLevel !== 'function') return state.wrappedInitLevel;
        state.originalInitLevel = global.initLevel;
        global.initLevel = function initLevelV613(...args) {
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
