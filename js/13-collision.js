// Bomberman Roguelike v3.12 — Grid Motion & Collision
// Una única fuente de verdad para colisiones contra la rejilla.
// El movimiento sigue siendo continuo, pero paredes/bloques se resuelven por celdas.

const GRID_COLLISION_V312 = {
    epsilon: 0.001,
    playerInset: 5,
    playerPadding: 1.5,
    entityInsetRatio: 0.47,
    defaultMaxStep: 2.0,
    centerSnapRadius: 7.0
};

function gridGetEntityRect(entity, x, y, kind = null) {
    const resolvedKind = kind || (entity && entity.__gridAnchor === 'center' ? 'enemy' : 'player');

    if (resolvedKind === 'player') {
        const inset = GRID_COLLISION_V312.playerInset;
        const pad = GRID_COLLISION_V312.playerPadding;
        return {
            left: x + inset + pad,
            right: x + entity.width - inset - pad,
            top: y + inset + pad,
            bottom: y + entity.height - inset - pad
        };
    }

    const halfW = entity.width * GRID_COLLISION_V312.entityInsetRatio;
    const halfH = entity.height * GRID_COLLISION_V312.entityInsetRatio;
    return {
        left: x - halfW,
        right: x + halfW,
        top: y - halfH,
        bottom: y + halfH
    };
}

function gridGetOverlappedTiles(rect) {
    if (!rect || rect.right <= rect.left || rect.bottom <= rect.top) return [];

    const minGX = Math.max(0, Math.floor(rect.left / TILE_SIZE));
    const maxGX = Math.min(gameState.gridWidth - 1, Math.floor((rect.right - GRID_COLLISION_V312.epsilon) / TILE_SIZE));
    const minGY = Math.max(0, Math.floor(rect.top / TILE_SIZE));
    const maxGY = Math.min(gameState.gridHeight - 1, Math.floor((rect.bottom - GRID_COLLISION_V312.epsilon) / TILE_SIZE));
    const tiles = [];

    for (let gy = minGY; gy <= maxGY; gy++) {
        for (let gx = minGX; gx <= maxGX; gx++) tiles.push({ x: gx, y: gy });
    }
    return tiles;
}

function gridIsInside(x, y) {
    return x >= 0 && y >= 0 && x < gameState.gridWidth && y < gameState.gridHeight;
}

function gridTileIsBlocked(gx, gy, options = {}) {
    if (!gridIsInside(gx, gy)) return true;
    const tile = gameState.grid[gy]?.[gx];
    const canFly = !!options.canFly;

    if (tile === TYPES.WALL) return true;
    if (!canFly && tile === TYPES.BLOCK) return true;
    return false;
}

function gridCurrentTile(entity, kind = null) {
    const resolvedKind = kind || (entity && entity.__gridAnchor === 'center' ? 'enemy' : 'player');
    if (resolvedKind === 'player') {
        return {
            x: Math.floor((entity.x + entity.width / 2) / TILE_SIZE),
            y: Math.floor((entity.y + entity.height / 2) / TILE_SIZE)
        };
    }
    return {
        x: Math.floor(entity.x / TILE_SIZE),
        y: Math.floor(entity.y / TILE_SIZE)
    };
}

function gridTileCenter(gx, gy) {
    return {
        x: gx * TILE_SIZE + TILE_SIZE / 2,
        y: gy * TILE_SIZE + TILE_SIZE / 2
    };
}

function gridCanOccupy(entity, x, y, options = {}) {
    const kind = options.kind || (entity && entity.__gridAnchor === 'center' ? 'enemy' : 'player');
    const rect = gridGetEntityRect(entity, x, y, kind);
    const tiles = gridGetOverlappedTiles(rect);

    if (!tiles.length) return false;

    const current = gridCurrentTile(entity, kind);
    const allowCurrentBombTile = options.allowCurrentBombTile !== false;

    for (const tile of tiles) {
        if (gridTileIsBlocked(tile.x, tile.y, options)) return false;

        if (kind === 'player') {
            if (typeof isBombSolidForPlayer === 'function' && isBombSolidForPlayer(tile.x, tile.y)) return false;
        } else if (!options.ignoreBombs) {
            const currentTile = tile.x === current.x && tile.y === current.y;
            if (!(allowCurrentBombTile && currentTile)) {
                const bomb = typeof getBombAtTile === 'function'
                    ? getBombAtTile(tile.x, tile.y)
                    : gameState.bombs?.find(b => b.x === tile.x && b.y === tile.y);
                if (bomb) return false;
            }
        }

        if (options.avoidDanger && typeof isEnemyBombDanger === 'function' && isEnemyBombDanger(tile.x, tile.y)) {
            const currentTile = tile.x === current.x && tile.y === current.y;
            if (!currentTile) return false;
        }
    }

    return true;
}

function gridMoveCardinal(entity, dx, dy, options = {}) {
    if (!dx && !dy) return { moved: false, blocked: false };

    // La navegación del juego es estrictamente cardinal.
    if (dx && dy) {
        if (Math.abs(dx) >= Math.abs(dy)) dy = 0;
        else dx = 0;
    }

    const amount = dx || dy;
    const axis = dx ? 'x' : 'y';
    const maxStep = options.maxStep || GRID_COLLISION_V312.defaultMaxStep;
    const steps = Math.max(1, Math.ceil(Math.abs(amount) / maxStep));
    const step = amount / steps;
    let moved = false;
    let blocked = false;

    for (let i = 0; i < steps; i++) {
        const nextX = axis === 'x' ? entity.x + step : entity.x;
        const nextY = axis === 'y' ? entity.y + step : entity.y;
        if (!gridCanOccupy(entity, nextX, nextY, options)) {
            blocked = true;
            break;
        }
        entity.x = nextX;
        entity.y = nextY;
        moved = true;
    }

    return { moved, blocked };
}

function gridIsNearTileCenter(entity, radius = GRID_COLLISION_V312.centerSnapRadius) {
    const kind = entity && entity.__gridAnchor === 'center' ? 'enemy' : 'player';
    const tile = gridCurrentTile(entity, kind);
    const center = gridTileCenter(tile.x, tile.y);
    if (kind === 'player') {
        const cx = entity.x + entity.width / 2;
        const cy = entity.y + entity.height / 2;
        return Math.abs(cx - center.x) <= radius && Math.abs(cy - center.y) <= radius;
    }
    return Math.abs(entity.x - center.x) <= radius && Math.abs(entity.y - center.y) <= radius;
}

function gridSnapEntityToCenter(entity, radius = GRID_COLLISION_V312.centerSnapRadius, options = {}) {
    const kind = options.kind || (entity && entity.__gridAnchor === 'center' ? 'enemy' : 'player');
    const tile = gridCurrentTile(entity, kind);
    const center = gridTileCenter(tile.x, tile.y);

    if (kind === 'player') {
        const targetX = center.x - entity.width / 2;
        const targetY = center.y - entity.height / 2;
        if (Math.abs(entity.x - targetX) > radius || Math.abs(entity.y - targetY) > radius) return false;
        if (!gridCanOccupy(entity, targetX, targetY, options)) return false;
        entity.x = targetX;
        entity.y = targetY;
        return true;
    }

    if (Math.abs(entity.x - center.x) > radius || Math.abs(entity.y - center.y) > radius) return false;
    if (!gridCanOccupy(entity, center.x, center.y, options)) return false;
    entity.x = center.x;
    entity.y = center.y;
    return true;
}

function gridGetNeighborCell(entity, dir) {
    const tile = gridCurrentTile(entity, 'enemy');
    return { x: tile.x + dir.x, y: tile.y + dir.y };
}
