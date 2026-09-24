// Bomberman Roguelike v3.20.0 — Robust Grid Motion & Collision
// Una única fuente de verdad para colisiones contra la rejilla.
// El movimiento sigue siendo continuo, pero paredes/bloques se resuelven por celdas.

const GRID_COLLISION_V312 = {
    epsilon: 0.001,
    playerInset: 5,
    playerPadding: 1.5,
    entityInsetRatio: 0.47,
    defaultMaxStep: 2.0,
    centerSnapRadius: 7.0,
    enemyLaneTolerance: 2.0,
    enemyLaneCorrectionStep: 1.8,
    // v3.20: corrección controlada; nunca se hace snap exacto salvo una
    // diferencia subpíxel residual.
    enemyLaneSnapEpsilon: 0.15
};

const GRID_COLLISION_STATS_V320 = {
    moveCalls: 0,
    blockedCalls: 0,
    movedCalls: 0,
    laneCorrections: 0,
    laneCorrectionPx: 0,
    maxLaneCorrectionPx: 0,
    laneSnaps: 0,
    diagonalInputs: 0,
    diagonalResolved: 0,
    noProgressAfterCorrection: 0,
    laneCorrectionOnlyCalls: 0
};

function gridCollisionResetStatsV320() {
    for (const key of Object.keys(GRID_COLLISION_STATS_V320)) GRID_COLLISION_STATS_V320[key] = 0;
}

function gridCollisionSnapshotV320() {
    return { ...GRID_COLLISION_STATS_V320 };
}

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
    // v3.20: una entidad parcialmente fuera del mundo no puede ser ocupable.
    const worldRight = gameState.gridWidth * TILE_SIZE;
    const worldBottom = gameState.gridHeight * TILE_SIZE;
    if (rect.left < 0 || rect.top < 0 || rect.right > worldRight || rect.bottom > worldBottom) return [];

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
    GRID_COLLISION_STATS_V320.moveCalls += 1;
    if (!dx && !dy) return { moved: false, blocked: false, laneCorrected: false, movedPx: 0, laneCorrectionPx: 0, diagonalInputResolved: false };

    const originalDx = dx;
    const originalDy = dy;
    let diagonalInputResolved = false;

    // La navegación del juego es estrictamente cardinal.
    if (dx && dy) {
        GRID_COLLISION_STATS_V320.diagonalInputs += 1;
        diagonalInputResolved = true;
        GRID_COLLISION_STATS_V320.diagonalResolved += 1;
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
    let laneCorrected = false;
    let laneCorrectionConsumed = false;
    let movedPx = 0;
    let laneCorrectionPx = 0;

    for (let i = 0; i < steps; i++) {
        // Enemigos: un corredor tiene un eje de avance y otro eje bloqueado al
        // centro de su celda. Así no pueden quedar "entre dos pisos/celdas" ni
        // cortar una esquina mientras siguen desplazándose. La corrección es
        // gradual y cardinal; nunca combina X e Y en el mismo paso.
        if (options.kind === 'enemy' && options.laneLock) {
            const tile = gridCurrentTile(entity, 'enemy');
            const center = gridTileCenter(tile.x, tile.y);
            const laneAxis = axis === 'x' ? 'y' : 'x';
            const currentLane = entity[laneAxis];
            const targetLane = center[laneAxis];
            const offset = targetLane - currentLane;
            const tolerance = options.laneTolerance ?? GRID_COLLISION_V312.enemyLaneTolerance;

            if (Math.abs(offset) > tolerance) {
                const correctionStep = options.laneCorrectionStep || GRID_COLLISION_V312.enemyLaneCorrectionStep;
                const correction = Math.sign(offset) * Math.min(Math.abs(offset), correctionStep, maxStep);
                const nextX = laneAxis === 'x' ? entity.x + correction : entity.x;
                const nextY = laneAxis === 'y' ? entity.y + correction : entity.y;
                if (!gridCanOccupy(entity, nextX, nextY, options)) {
                    blocked = true;
                    break;
                }
                entity.x = nextX;
                entity.y = nextY;
                moved = true;
                movedPx += Math.abs(correction);
                laneCorrectionPx += Math.abs(correction);
                laneCorrected = true;
                laneCorrectionConsumed = true;
                GRID_COLLISION_STATS_V320.laneCorrections += 1;
                GRID_COLLISION_STATS_V320.laneCorrectionPx += Math.abs(correction);
                GRID_COLLISION_STATS_V320.maxLaneCorrectionPx = Math.max(
                    GRID_COLLISION_STATS_V320.maxLaneCorrectionPx,
                    Math.abs(correction)
                );
                // La corrección lateral sigue siendo estrictamente cardinal.
                // No se agrega avance longitudinal en este mismo substep.
                continue;
            }

            // v3.20: dentro de tolerancia NO hacemos snap al centro. El pequeño
            // error lateral se conserva para evitar micro-parones y saltos
            // visuales. Solo un residuo subpíxel puede normalizarse.
            const residual = Math.abs(offset);
            if (residual > GRID_COLLISION_V312.enemyLaneSnapEpsilon) {
                // Mantener la posición dentro de la tolerancia es suficiente.
                // El movimiento longitudinal puede continuar normalmente.
            } else if (residual > 0) {
                const snapX = laneAxis === 'x' ? center.x : entity.x;
                const snapY = laneAxis === 'y' ? center.y : entity.y;
                if (!gridCanOccupy(entity, snapX, snapY, options)) {
                    blocked = true;
                    break;
                }
                const snapDistance = Math.abs(center[laneAxis] - entity[laneAxis]);
                if (snapDistance > 0) {
                    entity.x = snapX;
                    entity.y = snapY;
                    laneCorrected = true;
                    laneCorrectionConsumed = true;
                    laneCorrectionPx += snapDistance;
                    movedPx += snapDistance;
                    GRID_COLLISION_STATS_V320.laneSnaps += 1;
                }
            }
        }

        // Una corrección de lane consume el frame lógico completo. No dejamos
        // que los substeps restantes avancen por el eje longitudinal: el punto
        // final del frame debe seguir siendo estrictamente cardinal.
        if (laneCorrectionConsumed) break;

        const nextX = axis === 'x' ? entity.x + step : entity.x;
        const nextY = axis === 'y' ? entity.y + step : entity.y;
        if (!gridCanOccupy(entity, nextX, nextY, options)) {
            blocked = true;
            break;
        }
        entity.x = nextX;
        entity.y = nextY;
        moved = true;
        movedPx += Math.abs(step);
        GRID_COLLISION_STATS_V320.movedCalls += 1;
    }

    if (blocked) GRID_COLLISION_STATS_V320.blockedCalls += 1;
    if (laneCorrected && !moved) GRID_COLLISION_STATS_V320.noProgressAfterCorrection += 1;
    return {
        moved,
        blocked,
        laneCorrected,
        movedPx,
        laneCorrectionPx,
        diagonalInputResolved,
        laneCorrectionConsumed,
        input: { dx: originalDx, dy: originalDy }
    };
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

// v3.20: API mínima para el Debug Engine. No expone estado mutable.
window.GRID_COLLISION_V320 = Object.freeze({
    reset: gridCollisionResetStatsV320,
    snapshot: gridCollisionSnapshotV320
});
