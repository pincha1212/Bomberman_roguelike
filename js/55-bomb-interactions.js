// Bomberman Roguelike v6.8.5 — Bomb interaction capabilities
// KICK / GRAB son capacidades declarativas resueltas por 54-entity-capabilities.js.
// Este módulo contiene exclusivamente la interacción física con bombas.
(function installBombInteractionsV682(global) {
    'use strict';

    const KICK_SPEED_TILES_PER_SECOND = 6;
    const CARRY_HEIGHT = 0.38;
    const THROW_DISTANCE_TILES = 3; // distancia máxima de lanzamiento
    const THROW_SPEED_TILES_PER_SECOND = 8;
    const THROW_ARC = 10;

    function getState() { return global.BOMBER_ENGINE?.getState?.() || global.gameState || null; }
    function getPlayer() { return global.BOMBER_ENGINE?.getPlayer?.() || global.player || null; }
    function tileSize() { return Number(global.BOMBER_ENGINE?.getTileSize?.() || global.TILE_SIZE || 48); }

    function isBombCarried(bomb) {
        return !!bomb && typeof global.BOMB_V4_STATES === 'object' && bomb.state === global.BOMB_V4_STATES.CARRIED;
    }

    function getCarriedBombForEntity(entity) {
        if (!entity || typeof entity !== 'object') return null;
        if (entity.carriedBombV682 && isBombCarried(entity.carriedBombV682)) return entity.carriedBombV682;
        const state = getState();
        const found = state?.bombs?.find(b => isBombCarried(b) && b.carriedBy === entity);
        if (found) {
            entity.carriedBombV682 = found;
            return found;
        }
        return null;
    }

    function getEntityTile(entity) {
        if (!entity) return null;
        if (typeof global.gridCurrentTile === 'function') {
            try {
                const kind = entity === getPlayer() ? 'player' : 'enemy';
                return global.gridCurrentTile(entity, kind);
            } catch (_) {}
        }
        const tile = tileSize();
        if (entity === getPlayer()) {
            return { x: Math.floor((entity.x + entity.width / 2) / tile), y: Math.floor((entity.y + entity.height / 2) / tile) };
        }
        return { x: Math.floor(entity.x / tile), y: Math.floor(entity.y / tile) };
    }

    function parseDirection(value) {
        const key = String(value || '').toLowerCase();
        if (key === 'up' || key === 'north') return { x: 0, y: -1 };
        if (key === 'down' || key === 'south') return { x: 0, y: 1 };
        if (key === 'left' || key === 'west') return { x: -1, y: 0 };
        if (key === 'right' || key === 'east') return { x: 1, y: 0 };
        return null;
    }

    function getEntityInputDirection(entity) {
        const state = getState();
        if (!entity || !state) return null;
        const player = getPlayer();
        if (entity === player) {
            const keys = state.keys || {};
            let dx = 0, dy = 0;
            if (keys.ArrowLeft || keys.KeyA) dx = -1;
            else if (keys.ArrowRight || keys.KeyD) dx = 1;
            if (keys.ArrowUp || keys.KeyW) dy = -1;
            else if (keys.ArrowDown || keys.KeyS) dy = 1;

            if (!dx && !dy && state.touchControls) {
                const tx = Number(state.touchControls.x) || 0;
                const ty = Number(state.touchControls.y) || 0;
                if (Math.abs(tx) >= Math.abs(ty) && Math.abs(tx) >= 0.2) dx = tx < 0 ? -1 : 1;
                else if (Math.abs(ty) >= 0.2) dy = ty < 0 ? -1 : 1;
            }
            if (dx && dy) {
                if (state.lastMoveAxis === 'vertical') dx = 0;
                else dy = 0;
            }
            return dx || dy ? { x: dx, y: dy } : null;
        }

        const desired = parseDirection(entity.desiredDirection) || parseDirection(entity.lastDirection) || parseDirection(entity.dir);
        if (desired) return desired;
        const vx = Number(entity.vx) || 0;
        const vy = Number(entity.vy) || 0;
        if (Math.abs(vx) >= Math.abs(vy) && Math.abs(vx) > 0.01) return { x: vx < 0 ? -1 : 1, y: 0 };
        if (Math.abs(vy) > 0.01) return { x: 0, y: vy < 0 ? -1 : 1 };
        return null;
    }

    function getArchetype(entity) {
        return typeof global.getArchetypeV681 === 'function' ? global.getArchetypeV681(entity) : 'generic';
    }

    function entityCanUse(entity, capability) {
        const archetype = getArchetype(entity);
        if (archetype === 'player') {
            if (capability === 'kick') return !!global.isKickActiveV681?.(entity);
            if (capability === 'grab') return !!global.isGrabActiveV681?.(entity);
            if (capability === 'throw') return !!global.isThrowActiveV681?.(entity);
            return false;
        }
        if (capability === 'kick') return !!global.canKick?.(entity);
        if (capability === 'grab') return !!global.canGrab?.(entity);
        if (capability === 'throw') return !!global.canThrow?.(entity);
        return false;
    }

    function cellHasEntity(gx, gy, ignoredEntity = null) {
        const state = getState();
        if (!state) return false;
        const tile = tileSize();
        const rect = { left: gx * tile, right: (gx + 1) * tile, top: gy * tile, bottom: (gy + 1) * tile };
        const candidates = [];
        const player = getPlayer();
        if (player) candidates.push(player);
        if (Array.isArray(state.enemies)) candidates.push(...state.enemies);
        if (state.boss) candidates.push(state.boss);
        const echo = typeof global.getActiveDeathEchoV61 === 'function'
            ? global.getActiveDeathEchoV61(state.level)
            : state.deathEchoV61;
        if (echo) candidates.push(echo);

        for (const entity of candidates) {
            if (!entity || entity === ignoredEntity || entity.defeated) continue;
            const w = Number(entity.width) || tile * 0.7;
            const h = Number(entity.height) || tile * 0.7;
            const cx = entity === player ? entity.x + w / 2 : entity.x;
            const cy = entity === player ? entity.y + h / 2 : entity.y;
            if (cx + w / 2 > rect.left && cx - w / 2 < rect.right && cy + h / 2 > rect.top && cy - h / 2 < rect.bottom) return true;
        }
        return false;
    }

    function cellFreeForKick(gx, gy, bomb, ignoredEntity) {
        const state = getState();
        if (!state || gx < 0 || gy < 0 || gx >= state.gridWidth || gy >= state.gridHeight) return false;
        const tileValue = state.grid?.[gy]?.[gx];
        const types = global.BOMBER_ENGINE?.getWorldTypes?.() || global.TYPES || {};
        if (tileValue === types.WALL || tileValue === types.BLOCK) return false;
        if (typeof global.isBombMotionLandingTileFreeV67 === 'function' && !global.isBombMotionLandingTileFreeV67(gx, gy, bomb)) return false;
        if (cellHasEntity(gx, gy, ignoredEntity)) return false;
        return true;
    }

    function getAdjacentArmedBomb(entity, dir) {
        const state = getState();
        const tile = getEntityTile(entity);
        if (!state || !tile || !dir) return null;
        const gx = tile.x + dir.x;
        const gy = tile.y + dir.y;
        return state.bombs?.find(b => b && b.x === gx && b.y === gy && b.state === global.BOMB_V4_STATES.ARMED && !isBombCarried(b)) || null;
    }

    function getSameTileGrabBomb(entity) {
        const state = getState();
        const tile = getEntityTile(entity);
        if (!state || !tile) return null;
        const bomb = state.bombs?.find(b => b && b.x === tile.x && b.y === tile.y && b.state === global.BOMB_V4_STATES.ARMED && !isBombCarried(b)) || null;
        if (!bomb || bomb.playerPassThrough) return null;
        return bomb;
    }

    function startBombKickV682(bomb, entity, dir) {
        const state = getState();
        if (!bomb || !entity || !dir || !state) return false;
        if (bomb.state !== global.BOMB_V4_STATES.ARMED || bomb.carriedBy) return false;
        const entityTile = getEntityTile(entity);
        if (entityTile && entityTile.x === bomb.x && entityTile.y === bomb.y) return false;
        const targetX = Number(bomb.x) + dir.x;
        const targetY = Number(bomb.y) + dir.y;
        if (!cellFreeForKick(targetX, targetY, bomb, entity)) return false;

        const tile = tileSize();
        const startX = Number.isFinite(bomb.worldX) ? bomb.worldX : (bomb.x + 0.5) * tile;
        const startY = Number.isFinite(bomb.worldY) ? bomb.worldY : (bomb.y + 0.5) * tile;
        bomb.state = global.BOMB_V4_STATES.MOVING;
        bomb.motionState = global.BOMB_V4_STATES.MOVING;
        bomb.motionDirection = { x: dir.x, y: dir.y };
        bomb.motionSpeed = tile * KICK_SPEED_TILES_PER_SECOND / 1000;
        bomb.motionStartX = startX;
        bomb.motionStartY = startY;
        bomb.motionTargetTileX = targetX;
        bomb.motionTargetTileY = targetY;
        bomb.motionTargetX = (targetX + 0.5) * tile;
        bomb.motionTargetY = (targetY + 0.5) * tile;
        bomb.motionProgress = 0;
        bomb.motionTimer = 0;
        bomb.motionDuration = 0;
        bomb.motionArc = 0;
        bomb.motionRotation = 0;
        bomb.interactionMotionV682 = 'kick';
        bomb.interactionActorV682 = entity;
        bomb.playerPassThrough = true;
        bomb.justArmed = false;
        bomb.preserveTimerOnArm = true;
        return true;
    }

    function stopBombKickV682(bomb) {
        if (!bomb) return false;
        bomb.interactionMotionV682 = null;
        bomb.interactionActorV682 = null;
        bomb.motionDirection = null;
        bomb.motionSpeed = 0;
        bomb.motionQueue = [];
        bomb.preserveTimerOnArm = true;
        return typeof global.armBombV4 === 'function' ? global.armBombV4(bomb) : false;
    }

    function updateBombKickMotionV682(bomb, dt) {
        if (!bomb || bomb.state !== global.BOMB_V4_STATES.MOVING || bomb.interactionMotionV682 !== 'kick') return false;
        const dir = bomb.motionDirection;
        if (!dir || Math.abs(dir.x) + Math.abs(dir.y) !== 1) return stopBombKickV682(bomb);
        const tile = tileSize();
        const speed = Math.max(tile * 6 / 1000, Number(bomb.motionSpeed) || 0);
        let remaining = speed * Math.max(0, Number(dt) || 0);
        const state = getState();

        while (remaining > 0.0001) {
            const targetX = Number(bomb.motionTargetX);
            const targetY = Number(bomb.motionTargetY);
            const dx = targetX - Number(bomb.worldX);
            const dy = targetY - Number(bomb.worldY);
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (!Number.isFinite(dist) || dist <= 0.0001) {
                bomb.x = Number(bomb.motionTargetTileX);
                bomb.y = Number(bomb.motionTargetTileY);
                bomb.worldX = (bomb.x + 0.5) * tile;
                bomb.worldY = (bomb.y + 0.5) * tile;
                const nextX = bomb.x + dir.x;
                const nextY = bomb.y + dir.y;
                if (!cellFreeForKick(nextX, nextY, bomb, bomb.interactionActorV682)) return stopBombKickV682(bomb);
                bomb.motionStartX = bomb.worldX;
                bomb.motionStartY = bomb.worldY;
                bomb.motionTargetTileX = nextX;
                bomb.motionTargetTileY = nextY;
                bomb.motionTargetX = (nextX + 0.5) * tile;
                bomb.motionTargetY = (nextY + 0.5) * tile;
                bomb.motionProgress = 0;
                continue;
            }

            if (!cellFreeForKick(Number(bomb.motionTargetTileX), Number(bomb.motionTargetTileY), bomb, bomb.interactionActorV682)) {
                bomb.worldX = (bomb.x + 0.5) * tile;
                bomb.worldY = (bomb.y + 0.5) * tile;
                return stopBombKickV682(bomb);
            }

            const step = Math.min(remaining, dist);
            bomb.worldX += dir.x * step;
            bomb.worldY += dir.y * step;
            remaining -= step;
            const progressTotal = Math.max(1, tile);
            bomb.motionProgress = Math.max(0, Math.min(1, 1 - dist / progressTotal));

            if (step >= dist - 0.0001) {
                bomb.x = Number(bomb.motionTargetTileX);
                bomb.y = Number(bomb.motionTargetTileY);
                bomb.worldX = (bomb.x + 0.5) * tile;
                bomb.worldY = (bomb.y + 0.5) * tile;
            }
        }
        return true;
    }

    function cellFreeForThrow(gx, gy, bomb, ignoredEntity) {
        const state = getState();
        if (!state || gx < 0 || gy < 0 || gx >= state.gridWidth || gy >= state.gridHeight) return false;
        const tileValue = state.grid?.[gy]?.[gx];
        const types = global.BOMBER_ENGINE?.getWorldTypes?.() || global.TYPES || {};
        if (tileValue === types.WALL || tileValue === types.BLOCK) return false;
        const occupiedBomb = state.bombs?.find(other => other && other !== bomb && !isBombCarried(other) && other.x === gx && other.y === gy);
        if (occupiedBomb) return false;
        if (cellHasEntity(gx, gy, ignoredEntity)) return false;
        return true;
    }

    function updateCarriedBombPositionV682(bomb) {
        if (!isBombCarried(bomb)) return false;
        const carrier = bomb.carriedBy;
        if (!carrier || typeof carrier !== 'object') return false;
        const tile = tileSize();
        const cx = Number(carrier.x) + (Number(carrier.width) || tile * 0.7) / 2;
        const cy = Number(carrier.y) - tile * CARRY_HEIGHT;
        bomb.worldX = cx;
        bomb.worldY = cy;
        bomb.x = -999;
        bomb.y = -999;
        bomb.motionState = global.BOMB_V4_STATES.CARRIED;
        return true;
    }

    function grabBombV682(entity, bomb) {
        if (!entity || !bomb || bomb.state !== global.BOMB_V4_STATES.ARMED) return false;
        if (!entityCanUse(entity, 'grab')) return false;
        if (getCarriedBombForEntity(entity)) return false;
        if (bomb.carriedBy) return false;

        const tile = getEntityTile(entity);
        if (!tile) return false;
        if (bomb.playerPassThrough && entity === getPlayer()) return false;

        bomb.gridX = Number(bomb.x);
        bomb.gridY = Number(bomb.y);
        bomb.carriedTimer = Math.max(0, Number(bomb.timer) || 0);
        bomb.timer = 0;
        bomb.pendingDetonation = false;
        bomb.carriedBy = entity;
        bomb.state = global.BOMB_V4_STATES.CARRIED;
        bomb.motionState = global.BOMB_V4_STATES.CARRIED;
        bomb.interactionMotionV682 = null;
        bomb.motionDirection = null;
        bomb.x = -999;
        bomb.y = -999;
        bomb.playerPassThrough = false;
        bomb.justArmed = false;
        entity.carriedBombV682 = bomb;
        updateCarriedBombPositionV682(bomb);
        return true;
    }

    function releaseCarriedBombV682(entity, reason = 'drop') {
        const bomb = getCarriedBombForEntity(entity);
        if (!bomb) return false;
        const state = getState();
        const tile = getEntityTile(entity);
        if (!state || !tile) return false;
        const gx = tile.x, gy = tile.y;
        if (gx < 0 || gy < 0 || gx >= state.gridWidth || gy >= state.gridHeight) return false;
        const types = global.BOMBER_ENGINE?.getWorldTypes?.() || global.TYPES || {};
        if (state.grid?.[gy]?.[gx] === types.WALL || state.grid?.[gy]?.[gx] === types.BLOCK) return false;
        const other = typeof global.getBombAtTile === 'function' ? global.getBombAtTile(gx, gy) : null;
        if (other && other !== bomb) return false;

        bomb.x = gx;
        bomb.y = gy;
        bomb.gridX = gx;
        bomb.gridY = gy;
        bomb.worldX = (gx + 0.5) * tileSize();
        bomb.worldY = (gy + 0.5) * tileSize();
        bomb.carriedBy = null;
        bomb.carriedTimer = Math.max(0, Number(bomb.carriedTimer) || 0);
        bomb.timer = bomb.carriedTimer;
        bomb.carriedTimer = 0;
        bomb.pendingDetonation = bomb.timer <= 0;
        bomb.state = global.BOMB_V4_STATES.ARMED;
        bomb.motionState = 'idle';
        bomb.interactionMotionV682 = null;
        bomb.motionDirection = null;
        bomb.motionSpeed = 0;
        bomb.playerPassThrough = true;
        bomb.justArmed = true;
        bomb.preserveTimerOnArm = true;
        if (entity.carriedBombV682 === bomb) entity.carriedBombV682 = null;
        if (reason === 'death') bomb.releasedFromDeathV682 = true;
        return true;
    }

    function prepareCarriedBombForExplosionV682(bomb) {
        if (!isBombCarried(bomb)) return true;
        return !!(bomb.carriedBy && releaseCarriedBombV682(bomb.carriedBy, 'detonation'));
    }

    function processEntity(entity) {
        if (!entity) return;
        const dir = getEntityInputDirection(entity);
        const sameTileBomb = entityCanUse(entity, 'grab') ? getSameTileGrabBomb(entity) : null;
        if (sameTileBomb && grabBombV682(entity, sameTileBomb)) return;

        if (!dir) return;
        const adjacent = getAdjacentArmedBomb(entity, dir);
        if (!adjacent) return;

        if (entityCanUse(entity, 'grab')) {
            if (grabBombV682(entity, adjacent)) return;
        }
        if (entityCanUse(entity, 'kick')) {
            startBombKickV682(adjacent, entity, dir);
        }
    }

    function throwCarriedBombV685(entity, dir = null) {
        const bomb = getCarriedBombForEntity(entity);
        const state = getState();
        if (!entity || !bomb || !state || bomb.state !== global.BOMB_V4_STATES.CARRIED) return false;
        if (!entityCanUse(entity, 'throw')) return false;

        const direction = dir || getEntityInputDirection(entity);
        if (!direction || Math.abs(direction.x) + Math.abs(direction.y) !== 1) return false;
        const origin = getEntityTile(entity);
        if (!origin) return false;

        let targetX = origin.x;
        let targetY = origin.y;
        let distance = 0;
        for (let step = 1; step <= THROW_DISTANCE_TILES; step++) {
            const gx = origin.x + direction.x * step;
            const gy = origin.y + direction.y * step;
            if (!cellFreeForThrow(gx, gy, bomb, entity)) break;
            targetX = gx;
            targetY = gy;
            distance = step;
        }
        if (distance <= 0) return false;

        const tile = tileSize();
        const worldX = (origin.x + 0.5) * tile;
        const worldY = (origin.y + 0.5) * tile;
        const carriedTimer = Math.max(0, Number(bomb.carriedTimer) || 0);

        bomb.carriedBy = null;
        bomb.carriedTimer = 0;
        bomb.timer = carriedTimer;
        bomb.x = origin.x;
        bomb.y = origin.y;
        bomb.gridX = targetX;
        bomb.gridY = targetY;
        bomb.worldX = worldX;
        bomb.worldY = worldY;
        bomb.state = global.BOMB_V4_STATES.MOVING;
        bomb.motionState = global.BOMB_V4_STATES.MOVING;
        bomb.motionDirection = { x: direction.x, y: direction.y };
        bomb.motionSpeed = tile * THROW_SPEED_TILES_PER_SECOND / 1000;
        bomb.motionStartX = worldX;
        bomb.motionStartY = worldY;
        bomb.motionTargetTileX = targetX;
        bomb.motionTargetTileY = targetY;
        bomb.motionTargetX = (targetX + 0.5) * tile;
        bomb.motionTargetY = (targetY + 0.5) * tile;
        bomb.motionProgress = 0;
        bomb.motionTimer = Math.max(80, Math.round(distance / THROW_SPEED_TILES_PER_SECOND * 1000));
        bomb.motionDuration = bomb.motionTimer;
        bomb.motionArc = THROW_ARC;
        bomb.motionRotation = 0;
        bomb.motionRotationSpeed = 0.16;
        bomb.interactionMotionV682 = 'throw';
        bomb.interactionActorV682 = entity;
        bomb.playerPassThrough = true;
        bomb.justArmed = false;
        bomb.preserveTimerOnArm = true;
        if (entity.carriedBombV682 === bomb) entity.carriedBombV682 = null;
        return true;
    }

    function updateBombThrowMotionV685(bomb, dt) {
        if (!bomb || bomb.state !== global.BOMB_V4_STATES.MOVING || bomb.interactionMotionV682 !== 'throw') return false;
        const state = getState();
        const dir = bomb.motionDirection;
        if (!state || !dir) return false;
        const tile = tileSize();
        const targetX = Number(bomb.motionTargetTileX);
        const targetY = Number(bomb.motionTargetTileY);
        if (!cellFreeForThrow(targetX, targetY, bomb, bomb.interactionActorV682)) {
            bomb.worldX = (bomb.x + 0.5) * tile;
            bomb.worldY = (bomb.y + 0.5) * tile;
            bomb.motionTargetTileX = bomb.x;
            bomb.motionTargetTileY = bomb.y;
            bomb.preserveTimerOnArm = true;
            return stopThrowMotionV685(bomb);
        }

        bomb.motionTimer = Math.max(0, Number(bomb.motionTimer) - Math.max(0, Number(dt) || 0));
        const duration = Math.max(1, Number(bomb.motionDuration) || 1);
        const t = Math.max(0, Math.min(1, 1 - bomb.motionTimer / duration));
        const eased = t * t * (3 - 2 * t);
        bomb.worldX = Number(bomb.motionStartX) + (Number(bomb.motionTargetX) - Number(bomb.motionStartX)) * eased;
        bomb.worldY = Number(bomb.motionStartY) + (Number(bomb.motionTargetY) - Number(bomb.motionStartY)) * eased - Math.sin(Math.PI * eased) * Number(bomb.motionArc || 0);
        bomb.motionProgress = t;
        bomb.motionRotation += (Number(bomb.motionRotationSpeed) || 0) * Math.max(0.5, Math.min(2, (Number(dt) || 16.6667) / 16.6667));

        if (bomb.motionTimer <= 0) {
            bomb.x = targetX;
            bomb.y = targetY;
            bomb.worldX = (targetX + 0.5) * tile;
            bomb.worldY = (targetY + 0.5) * tile;
            return stopThrowMotionV685(bomb);
        }
        return true;
    }

    function stopThrowMotionV685(bomb) {
        if (!bomb) return false;
        bomb.interactionMotionV682 = null;
        bomb.interactionActorV682 = null;
        bomb.motionDirection = null;
        bomb.motionSpeed = 0;
        bomb.motionProgress = 1;
        bomb.preserveTimerOnArm = true;
        return typeof global.armBombV4 === 'function' ? global.armBombV4(bomb) : false;
    }

    function updateBombEntityInteractionsV682() {
        const state = getState();
        if (!state) return false;
        const entities = [];
        const player = getPlayer();
        if (player) entities.push(player);
        if (Array.isArray(state.enemies)) entities.push(...state.enemies);
        if (state.boss) entities.push(state.boss);
        const echo = typeof global.getActiveDeathEchoV61 === 'function'
            ? global.getActiveDeathEchoV61(state.level)
            : state.deathEchoV61;
        if (echo) entities.push(echo);

        const seen = new Set();
        for (const entity of entities) {
            if (!entity || seen.has(entity) || entity.defeated) continue;
            seen.add(entity);
            processEntity(entity);
        }
        for (const bomb of state.bombs || []) {
            if (isBombCarried(bomb)) updateCarriedBombPositionV682(bomb);
        }
        return true;
    }

    function handleBombThrowV685() {
        const player = getPlayer();
        if (!player || !getCarriedBombForEntity(player)) return false;
        return throwCarriedBombV685(player, getEntityInputDirection(player));
    }

    function handleBombActionV682() {
        const player = getPlayer();
        if (!player) return false;
        const carried = getCarriedBombForEntity(player);
        if (!carried) return false;
        return releaseCarriedBombV682(player, 'drop');
    }

    global.throwCarriedBombV685 = throwCarriedBombV685;
    global.updateBombThrowMotionV685 = updateBombThrowMotionV685;
    global.getCarriedBombForEntityV682 = getCarriedBombForEntity;
    global.startBombKickV682 = startBombKickV682;
    global.updateBombKickMotionV682 = updateBombKickMotionV682;
    global.grabBombV682 = grabBombV682;
    global.releaseCarriedBombV682 = releaseCarriedBombV682;
    global.prepareCarriedBombForExplosionV682 = prepareCarriedBombForExplosionV682;
    global.updateCarriedBombPositionV682 = updateCarriedBombPositionV682;
    global.updateBombEntityInteractionsV682 = updateBombEntityInteractionsV682;
    global.handleBombActionV682 = handleBombActionV682;
    global.handleBombThrowV685 = handleBombThrowV685;

    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.getCarriedBomb = getCarriedBombForEntity;
    global.BOMBER_ENGINE.startBombKick = startBombKickV682;
    global.BOMBER_ENGINE.grabBomb = grabBombV682;
    global.BOMBER_ENGINE.dropCarriedBomb = releaseCarriedBombV682;
    global.BOMBER_ENGINE.throwCarriedBomb = throwCarriedBombV685;
})(window);
