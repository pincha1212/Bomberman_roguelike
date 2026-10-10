// Bomberman Roguelike v6.10.2 — Enemy Behaviors Update
// Navegación local tipo corredor/intersección: la IA decide una dirección
// v3.21: decisiones locales + memoria corta + continuidad de ruta; BFS solo para recovery excepcional.
// y 15-collision.js se ocupa del movimiento y las paredes.

const enemyAI_V312 = {
    roomKey: '',
    dangerCooldown: 0,
    dangerSignature: '',
    dangerBombCount: -1,
    dangerExplosionCount: -1,
    dangerBlastSerial: -1,
    danger: new Set(),
    playerTileFrame: -1,
    playerTileX: -1,
    playerTileY: -1,
    visionInterval: 75,
    decisionInterval: 62,
    memoryMs: 900,
    turnRadius: 9,
    lookaheadTiles: 3,
    stuckMs: 180,
    physicalRecoveryMs: 220,
    wallPauseMs: 2000,
    blockedRetryMs: 180,
    cornerAssistSpeed: 1.15,
    recoveryPathNodes: 240,
    cursor: 0,
    decisionCursor: 0,
    // v3.19: estabilización de decisiones y recovery.
    turnHysteresis: 3.5,
    turnCommitMs: 150,
    recoveryCooldownMs: 280,
    recoveryTriggerMs: 220,
    // v3.24.1: una dirección que falla repetidamente queda temporalmente vetada
    // para evitar que el recovery seleccione de nuevo el mismo bloqueo físico.
    repeatedBlockTriggerFrames: 6,
    // v3.21: memoria corta de navegación y protección contra ciclos locales.
    navigationMemoryMs: 900,
    navigationMemoryTiles: 6,
    recentTilePenalty: 1.8,
    repeatedTilePenalty: 3.2,
    branchPreference: 0.45,
    navigationTurnCommitMs: 240,
    behaviorVersion: '3.24.1'
};

const ENEMY_DIRS_V312 = [
    { x: 0, y: -1, dir: 'up' },
    { x: 0, y: 1, dir: 'down' },
    { x: -1, y: 0, dir: 'left' },
    { x: 1, y: 0, dir: 'right' }
];

const ENEMY_DIR_INDEX_V312 = new Map(ENEMY_DIRS_V312.map((d, i) => [d.dir, i]));
const ENEMY_OPPOSITE_V312 = { up: 'down', down: 'up', left: 'right', right: 'left' };


// v6.28 — helpers de grid para entidades centradas (Death Echo).
// No cambian la navegación de los enemigos normales: se usan explícitamente
// desde Death Echo para que sus decisiones tácticas siempre partan de una celda.
function gridEntityTileV628(entity) {
    if (!entity || typeof TILE_SIZE !== 'number' || TILE_SIZE <= 0) return { x: 0, y: 0 };
    const width = Math.max(1, Number(gameState?.gridWidth) || 1);
    const height = Math.max(1, Number(gameState?.gridHeight) || 1);
    const clampTile = (value, max) => Math.max(0, Math.min(max - 1, Math.trunc(value)));

    // Mientras hay un desplazamiento tile-to-tile, la celda lógica es el
    // destino ya reservado, no el lado de la línea media que ocupa el sprite.
    if (entity._tileMoveActive && Number.isFinite(Number(entity._tileMoveTargetGX)) && Number.isFinite(Number(entity._tileMoveTargetGY))) {
        return {
            x: clampTile(Number(entity._tileMoveTargetGX), width),
            y: clampTile(Number(entity._tileMoveTargetGY), height)
        };
    }

    if (entity.__gridAnchor === 'center') {
        return {
            x: clampTile(Math.round((Number(entity.x) - TILE_SIZE / 2) / TILE_SIZE), width),
            y: clampTile(Math.round((Number(entity.y) - TILE_SIZE / 2) / TILE_SIZE), height)
        };
    }

    const x = Number(entity.x) + (Number(entity.width) || 0) / 2;
    const y = Number(entity.y) + (Number(entity.height) || 0) / 2;
    return {
        x: clampTile(Math.floor(x / TILE_SIZE), width),
        y: clampTile(Math.floor(y / TILE_SIZE), height)
    };
}

function gridEntityCenteredV628(entity, tolerancePx = 1.25) {
    if (!entity || entity._tileMoveActive || typeof TILE_SIZE !== 'number' || TILE_SIZE <= 0) return false;
    const tile = gridEntityTileV628(entity);
    const centerX = (tile.x + 0.5) * TILE_SIZE;
    const centerY = (tile.y + 0.5) * TILE_SIZE;
    const tolerance = Math.max(0.1, Number(tolerancePx) || 1.25);
    return Math.abs(Number(entity.x) - centerX) <= tolerance && Math.abs(Number(entity.y) - centerY) <= tolerance;
}

function gridSnapEntityCenteredV628(entity, gx, gy) {
    if (!entity || !Number.isInteger(Number(gx)) || !Number.isInteger(Number(gy))) return false;
    const x = Number(gx);
    const y = Number(gy);
    if (typeof gridIsInside === 'function' && !gridIsInside(x, y)) return false;
    entity.__gridAnchor = 'center';
    if (typeof gridSnapEntityToTile === 'function') {
        if (!gridSnapEntityToTile(entity, x, y, 'enemy')) return false;
    } else {
        entity.x = (x + 0.5) * TILE_SIZE;
        entity.y = (y + 0.5) * TILE_SIZE;
    }
    entity._tileMoveActive = false;
    entity._tileMoveTargetGX = x;
    entity._tileMoveTargetGY = y;
    entity._tileMoveTargetX = (x + 0.5) * TILE_SIZE;
    entity._tileMoveTargetY = (y + 0.5) * TILE_SIZE;
    return true;
}

window.gridEntityTileV628 = gridEntityTileV628;
window.gridEntityCenteredV628 = gridEntityCenteredV628;
window.gridSnapEntityCenteredV628 = gridSnapEntityCenteredV628;

let enemyBehaviorProfileMapV329 = null;
let enemyBehaviorProfileSourceV329 = null;

function getEnemyBehaviorProfileMapV329() {
    const source = window.ENEMY_BEHAVIORS_V324 || {};
    if (source === enemyBehaviorProfileSourceV329 && enemyBehaviorProfileMapV329) return enemyBehaviorProfileMapV329;
    enemyBehaviorProfileSourceV329 = source;
    enemyBehaviorProfileMapV329 = new Map();
    for (const profile of Object.values(source)) {
        if (profile?.id) enemyBehaviorProfileMapV329.set(profile.id, profile);
    }
    return enemyBehaviorProfileMapV329;
}

function enemyBehaviorProfileV324(e, index = 0) {
    const id = String(e?.aiBehavior || e?.ai?.archetype || '').toLowerCase();
    const fallbackId = ['chaser','patroller','evasive'][Math.abs(Number(index) || 0) % 3];
    const cacheKey = id || (e?.type === ENEMY_TYPES.VOLADOR || e?.type?.canFly ? 'flyer' : e?.type === ENEMY_TYPES.ESPECIAL ? 'aggressive' : fallbackId);
    if (e?.ai && e.ai.__behaviorProfileKey === cacheKey && e.ai.__behaviorProfile) return e.ai.__behaviorProfile;
    const profiles = getEnemyBehaviorProfileMapV329();
    let profile = profiles.get(cacheKey);
    if (!profile && (e?.type === ENEMY_TYPES.VOLADOR || e?.type?.canFly)) profile = profiles.get('flyer');
    if (!profile && e?.type === ENEMY_TYPES.ESPECIAL) profile = profiles.get('aggressive');
    profile = profile || profiles.get('chaser') || profiles.values().next().value || null;
    if (e?.ai) {
        e.ai.__behaviorProfileKey = cacheKey;
        e.ai.__behaviorProfile = profile;
    }
    return profile;
}


function enemyTileV312(e) {
    const x = Math.max(0, Math.min(gameState.gridWidth - 1, Math.floor(e.x / TILE_SIZE)));
    const y = Math.max(0, Math.min(gameState.gridHeight - 1, Math.floor(e.y / TILE_SIZE)));
    const cache = e.__v329TileCache;
    if (cache && cache.x === x && cache.y === y && cache.w === gameState.gridWidth && cache.h === gameState.gridHeight) return cache.tile;
    const tile = { x, y };
    e.__v329TileCache = { x, y, w: gameState.gridWidth, h: gameState.gridHeight, tile };
    return tile;
}

function enemyTileKeyV312(x, y) {
    // V3.17: keys numéricas evitan crear strings temporales en cada consulta de peligro.
    return y * gameState.gridWidth + x;
}

function enemyCenterV312(x, y) {
    return gridTileCenter(x, y);
}

function enemyDangerV312(x, y, e = null) {
    // La Criatura de Nube atraviesa bombas y sus zonas proyectadas; las llamas
    // que ya están activas siguen siendo peligrosas.
    if (e && typeof enemyIgnoresBombsV630 === 'function' && enemyIgnoresBombsV630(e)) {
        return !!gameState.explosions?.some(exp => exp && exp.x === x && exp.y === y);
    }
    return enemyAI_V312.danger.has(enemyTileKeyV312(x, y));
}

function rebuildEnemyDangerV312() {
    const danger = new Set();
    for (const bomb of gameState.bombs) {
        if (!bomb) continue;
        danger.add(enemyTileKeyV312(bomb.x, bomb.y));
        if (typeof calculateBombBlastCells === 'function') {
            for (const cell of calculateBombBlastCells(bomb)) {
                danger.add(enemyTileKeyV312(cell.x, cell.y));
            }
        }
    }
    for (const exp of gameState.explosions) {
        if (exp) danger.add(enemyTileKeyV312(exp.x, exp.y));
    }
    enemyAI_V312.danger = danger;
}

function updateEnemyDangerV312(dt) {
    const bombCount = gameState.bombs.length;
    const explosionCount = gameState.explosions.length;
    const blastSerial = Number(gameState.blastSerial || 0);
    enemyAI_V312.dangerCooldown -= dt;
    const structureChanged = bombCount !== enemyAI_V312.dangerBombCount || explosionCount !== enemyAI_V312.dangerExplosionCount || blastSerial !== enemyAI_V312.dangerBlastSerial;
    if (structureChanged || enemyAI_V312.dangerCooldown <= 0) {
        enemyAI_V312.dangerCooldown = 95;
        enemyAI_V312.dangerBombCount = bombCount;
        enemyAI_V312.dangerExplosionCount = explosionCount;
        enemyAI_V312.dangerBlastSerial = blastSerial;
        rebuildEnemyDangerV312();
    }
}

function ensureEnemyMotionStateV312(e, index) {
    if (!e.__gridAnchor) e.__gridAnchor = 'center';
    if (!e.ai) {
        e.ai = {
            behavior: 'patrol',
            alert: 'patrol',
            archetype: String(e.aiBehavior || ''),
            direction: e.lastDirection || null,
            desiredDirection: e.desiredDirection || e.lastDirection || null,
            decisionTimer: 15 + (index * 19) % 45,
            visionTimer: (index * 23) % 60,
            seesPlayer: false,
            lastSeenX: -1,
            lastSeenY: -1,
            memoryTimer: 0,
            patrolX: -1,
            patrolY: -1,
            surroundX: -1,
            surroundY: -1,
            surroundTimer: 0,
            stuckTimer: 0,
            blockedTimer: 0,
            physicalBlockedTimer: 0,
            physicalBlocked: false,
            cornerCorrectionMs: 0,
            recoveryCount: 0,
            lastRecoveryReason: '',
            lastRecoveryPathNodes: 0,
            lastX: e.x,
            lastY: e.y,
            slot: index % 4,
            lastDecisionTileX: -1,
            lastDecisionTileY: -1,
            turnLockTimer: 0,
            lastTurnTileKey: -1,
            lastTurnDirection: null,
            recoveryCooldownTimer: 0,
            recoveryPathCalls: 0,
            wallPauseMs: 0,
            blockedRetryMs: 0,
            blockedDirection: null,
            wallPauseExpired: false,
            blockedDirection: null,
            blockedDirectionFrames: 0,
            // v3.21: memoria corta de tiles visitados para evitar ciclos locales.
            recentTileKeys: [],
            navigationMemoryTimer: 0,
            lastNavigationTileKey: -1,
            navigationTurnCount: 0,
            lastTurnFromDirection: null,
            lastTurnAtTileKey: -1
        };
    }

    const ai = e.ai;
    const profile = enemyBehaviorProfileV324(e, index);
    ai.archetype = profile?.id || ai.archetype || 'chaser';
    ai.archetypeLabel = profile?.label || ai.archetypeLabel || ai.archetype;

    // Compatibilidad de estados antiguos: se normaliza una sola vez por enemigo.
    if (!ai.__compatNormalizedV329) {
        ai.turnLockTimer = Number.isFinite(Number(ai.turnLockTimer)) ? Number(ai.turnLockTimer) : 0;
        ai.lastTurnTileKey = Number.isFinite(Number(ai.lastTurnTileKey)) ? Number(ai.lastTurnTileKey) : -1;
        ai.lastTurnDirection = ai.lastTurnDirection || null;
        ai.recoveryCooldownTimer = Number.isFinite(Number(ai.recoveryCooldownTimer)) ? Number(ai.recoveryCooldownTimer) : 0;
        ai.recoveryPathCalls = Number.isFinite(Number(ai.recoveryPathCalls)) ? Number(ai.recoveryPathCalls) : 0;
        ai.blockedDirection = ai.blockedDirection || null;
        ai.blockedDirectionFrames = Number.isFinite(Number(ai.blockedDirectionFrames)) ? Number(ai.blockedDirectionFrames) : 0;
        ai.recentTileKeys = Array.isArray(ai.recentTileKeys) ? ai.recentTileKeys.filter(Number.isFinite).slice(-enemyAI_V312.navigationMemoryTiles) : [];
        ai.navigationMemoryTimer = Number.isFinite(Number(ai.navigationMemoryTimer)) ? Number(ai.navigationMemoryTimer) : 0;
        ai.lastNavigationTileKey = Number.isFinite(Number(ai.lastNavigationTileKey)) ? Number(ai.lastNavigationTileKey) : -1;
        ai.navigationTurnCount = Number.isFinite(Number(ai.navigationTurnCount)) ? Number(ai.navigationTurnCount) : 0;
        ai.lastTurnFromDirection = ai.lastTurnFromDirection || null;
        ai.lastTurnAtTileKey = Number.isFinite(Number(ai.lastTurnAtTileKey)) ? Number(ai.lastTurnAtTileKey) : -1;
        ai.__compatNormalizedV329 = true;
    }
    if (!Array.isArray(ai.recentTileKeys)) ai.recentTileKeys = [];
    if (ai.recentTileKeys.length > enemyAI_V312.navigationMemoryTiles) ai.recentTileKeys.splice(0, ai.recentTileKeys.length - enemyAI_V312.navigationMemoryTiles);
    if (!ai.recentTileKeys.length) {
        const initialTile = enemyTileV312(e);
        const initialKey = enemyTileKeyV312(initialTile.x, initialTile.y);
        ai.recentTileKeys.push(initialKey);
        ai.lastNavigationTileKey = initialKey;
        ai.navigationMemoryTimer = enemyAI_V312.navigationMemoryMs;
    }

    // Un enemigo nunca arranca con una dirección que choque contra una pared.
    if (!e.ai.direction || !enemyDirectionPassableV312(e, enemyDirectionV312(e.ai.direction), false)) {
        const choices = enemyAvailableDirectionsV312(e, false);
        const safeChoices = choices.filter(d => d.dir !== ENEMY_OPPOSITE_V312[e.lastDirection || '']);
        const chosen = safeChoices[0] || choices[0] || ENEMY_DIRS_V312[index % ENEMY_DIRS_V312.length];
        e.ai.direction = chosen.dir;
        e.ai.desiredDirection = chosen.dir;
        e.lastDirection = chosen.dir;
    }
    if (!e.ai.desiredDirection) e.ai.desiredDirection = e.ai.direction;
    return e.ai;
}

function enemyVisionBlockedV312(gx, gy) {
    if (!gridIsInside(gx, gy)) return true;
    const tile = gameState.grid[gy]?.[gx];
    return tile === TYPES.WALL || tile === TYPES.BLOCK;
}

function enemyAxisLineClearV312(ex, ey, px, py) {
    const egx = Math.floor(ex / TILE_SIZE);
    const egy = Math.floor(ey / TILE_SIZE);
    const pgx = Math.floor(px / TILE_SIZE);
    const pgy = Math.floor(py / TILE_SIZE);

    if (egx === pgx) {
        const step = pgy >= egy ? 1 : -1;
        for (let gy = egy + step; gy !== pgy; gy += step) {
            if (enemyVisionBlockedV312(egx, gy)) return false;
        }
        return true;
    }
    if (egy === pgy) {
        const step = pgx >= egx ? 1 : -1;
        for (let gx = egx + step; gx !== pgx; gx += step) {
            if (enemyVisionBlockedV312(gx, egy)) return false;
        }
        return true;
    }
    return false;
}

function enemyCanSeePlayerV312(e) {
    const ex = e.x;
    const ey = e.y;
    const px = player.x + player.width / 2;
    const py = player.y + player.height / 2;
    const exTile = enemyTileV312(e);
    const pxTile = {
        x: Math.floor(px / TILE_SIZE),
        y: Math.floor(py / TILE_SIZE)
    };
    const tileDistance = Math.abs(pxTile.x - exTile.x) + Math.abs(pxTile.y - exTile.y);
    if (tileDistance > 9) return false;

    // En proximidad inmediata, el enemigo detecta al jugador aunque haya girado
    // apenas dentro de la misma zona del corredor.
    if (tileDistance <= 1) return true;

    return enemyAxisLineClearV312(ex, ey, px, py);
}

function enemyPlayerTileV312() {
    const frame = Number(gameState.animFrame || 0);
    if (enemyAI_V312.playerTileFrame === frame) return { x: enemyAI_V312.playerTileX, y: enemyAI_V312.playerTileY };
    const px = player.x + player.width / 2;
    const py = player.y + player.height / 2;
    enemyAI_V312.playerTileFrame = frame;
    enemyAI_V312.playerTileX = Math.max(0, Math.min(gameState.gridWidth - 1, Math.floor(px / TILE_SIZE)));
    enemyAI_V312.playerTileY = Math.max(0, Math.min(gameState.gridHeight - 1, Math.floor(py / TILE_SIZE)));
    return { x: enemyAI_V312.playerTileX, y: enemyAI_V312.playerTileY };
}

function enemyDirectionV312(dir) {
    const index = ENEMY_DIR_INDEX_V312.get(String(dir || '').toLowerCase());
    return ENEMY_DIRS_V312[index == null ? 1 : index];
}

function enemyImmediateDirectionPassableV312(e, dir, avoidDanger = false, probe = 1.0) {
    if (!e || !dir) return false;
    const nx = e.x + dir.x * probe;
    const ny = e.y + dir.y * probe;
    return gridCanOccupy(e, nx, ny, {
        kind: 'enemy',
        canFly: !!e.type.canFly,
        ignoreBombs: typeof enemyIgnoresBombsV630 === 'function' && enemyIgnoresBombsV630(e),
        avoidDanger,
        allowCurrentBombTile: true
    });
}

function enemyPhysicalDirectionChoicesV312(e, avoidDanger = false) {
    return ENEMY_DIRS_V312.filter(dir => enemyImmediateDirectionPassableV312(e, dir, avoidDanger));
}

function updateEnemyIntentV312(e, index, dt) {
    const ai = ensureEnemyMotionStateV312(e, index);
    ai.decisionTimer -= dt;
    ai.visionTimer -= dt;
    ai.turnLockTimer = Math.max(0, Number(ai.turnLockTimer || 0) - dt);
    ai.recoveryCooldownTimer = Math.max(0, Number(ai.recoveryCooldownTimer || 0) - dt);

    const wasWallPaused = Number(ai.wallPauseMs || 0) > 0;
    ai.wallPauseMs = Math.max(0, Number(ai.wallPauseMs || 0) - Number(dt || 0));
    ai.blockedRetryMs = Math.max(0, Number(ai.blockedRetryMs || 0) - Number(dt || 0));
    if (ai.wallPauseMs > 0 || ai.wallPauseExpired) {
        // Al chocar contra una pared/bloque/bomba, el enemigo conserva su
        // dirección y queda inmóvil. La decisión de giro se hace recién después
        // de los 2 s; moveEnemyV312 ejecuta ese giro de forma tile-to-tile.
        return;
    }
    if (wasWallPaused && !ai.wallPauseExpired && ai.blockedDirection) {
        ai.wallPauseExpired = true;
    }
    ai.navigationMemoryTimer = Math.max(0, Number(ai.navigationMemoryTimer || 0) - dt);
    if (ai.navigationMemoryTimer <= 0 && Array.isArray(ai.recentTileKeys)) {
        const currentTile = enemyTileV312(e);
        ai.recentTileKeys = [enemyTileKeyV312(currentTile.x, currentTile.y)];
        ai.lastNavigationTileKey = ai.recentTileKeys[0];
        ai.navigationMemoryTimer = enemyAI_V312.navigationMemoryMs;
    }
    ai.memoryTimer = Math.max(0, ai.memoryTimer - dt);
    ai.surroundTimer = Math.max(0, ai.surroundTimer - dt);

    if (ai.visionTimer <= 0) {
        ai.visionTimer = enemyAI_V312.visionInterval + (index % 3) * 9;
        const sees = enemyCanSeePlayerV312(e);
        ai.seesPlayer = sees;
        if (sees) {
            const pt = enemyPlayerTileV312();
            ai.lastSeenX = pt.x;
            ai.lastSeenY = pt.y;
            ai.memoryTimer = enemyAI_V312.memoryMs;
            if (e.type === ENEMY_TYPES.ESPECIAL) ai.surroundTimer = 0;
        }
    }

    const tile = enemyTileV312(e);
    const dangerHere = enemyDangerV312(tile.x, tile.y, e);
    if (!Number.isFinite(ai.dangerCheckTimer)) ai.dangerCheckTimer = 0;
    ai.dangerCheckTimer -= dt;
    let imminentDanger = false;
    if (enemyAI_V312.danger.size > 0 && ai.dangerCheckTimer <= 0) {
        ai.dangerCheckTimer = 75 + (index % 3) * 12;
        imminentDanger = enemyAvailableDirectionsV312(e, false).some(dir => {
            const next = enemyProjectedTileV312(e, dir, 1);
            return enemyDangerV312(next.x, next.y, e);
        });
        ai.imminentDanger = imminentDanger;
    } else {
        imminentDanger = !!ai.imminentDanger;
    }

    const profile = enemyBehaviorProfileV324(e, index);
    const playerTile = enemyPlayerTileV312();
    const playerDistance = enemyDistanceToV312(tile.x, tile.y, playerTile.x, playerTile.y);
    const evasiveEngaged = profile.id === 'evasive' && (ai.seesPlayer || playerDistance <= Number(profile.fleeRadius || 5));
    const patrollerEngaged = profile.id === 'patroller' && playerDistance <= 4 && (ai.seesPlayer || ai.memoryTimer > 0);
    if (dangerHere || imminentDanger || evasiveEngaged) {
        ai.alert = 'flee';
        ai.behavior = profile.id;
    } else if ((ai.seesPlayer || ai.memoryTimer > 0) && profile.id !== 'patroller') {
        ai.alert = profile.id === 'aggressive' ? 'aggressive' : 'chase';
        ai.behavior = profile.id;
    } else if (patrollerEngaged) {
        ai.alert = 'chase';
        ai.behavior = profile.id;
    } else {
        ai.alert = 'patrol';
        ai.behavior = profile.id;
    }

    const currentDir = enemyDirectionV312(ai.direction);
    const physicalPassable = enemyDirectionPassableV312(e, currentDir, false);
    const currentPassable = enemyDirectionPassableV312(e, currentDir, ai.alert === 'flee');

    // Una pared/bloque/bomba no produce un giro instantáneo. El choque físico
    // abre una pausa de 2 s; solo el peligro real puede saltarse esta espera.
    if (!physicalPassable && !ai.wallPauseExpired && Number(ai.wallPauseMs || 0) <= 0) {
        ai.wallPauseMs = enemyAI_V312.wallPauseMs;
        ai.blockedRetryMs = enemyAI_V312.blockedRetryMs;
        ai.blockedDirection = currentDir.dir;
        ai.wallPauseExpired = false;
        e.vx = 0;
        e.vy = 0;
        return;
    }

    const atCenterRaw = enemyIsNearCenterV312(e);
    // Durante una recuperación física no tratamos la cercanía al centro como
    // una intersección normal: primero dejamos terminar la corrección lateral.
    const atCenter = atCenterRaw && !(ai.physicalBlocked && ai.physicalBlockedTimer < enemyAI_V312.physicalRecoveryMs);

    // La rejilla sirve para anticipar paredes. El bloqueo físico se confirma
    // solamente después de que gridMoveCardinal() falle con el hitbox real.
    // Así la IA puede corregir la alineación lateral antes de abandonar la ruta.
    if (!currentPassable) ai.blockedTimer += dt;
    else ai.blockedTimer = 0;

    const repeatedBlock = Number(ai.blockedDirectionFrames || 0) >= enemyAI_V312.repeatedBlockTriggerFrames;
    const shouldDecide = atCenter || !currentPassable || repeatedBlock || ai.physicalBlockedTimer >= enemyAI_V312.physicalRecoveryMs || ai.decisionTimer <= 0 || ai.alert === 'flee';
    if (!shouldDecide) return;

    if (ai.patrolX >= 0 && tile.x === ai.patrolX && tile.y === ai.patrolY && ai.alert === 'patrol') {
        ai.patrolX = -1;
        ai.patrolY = -1;
    }

    let chosen = enemyChooseDirectionAtIntersectionV312(e);
    if (!chosen) return;

    if (repeatedBlock && ai.blockedDirection === currentDir.dir && chosen.dir === currentDir.dir) {
        const recovery = enemyChooseLocalRecoveryDirectionV319(e);
        if (recovery) chosen = recovery;
    }

    ai.desiredDirection = chosen.dir;
    ai.decisionTimer = enemyAI_V312.decisionInterval + (index % 3) * 10;
    if (chosen.dir !== currentDir.dir && enemyImmediateDirectionPassableV312(e, chosen, ai.alert === 'flee', 0.75)) {
        const wasRecovery = Number(ai.physicalBlockedTimer || 0) > 0 || Number(ai.stuckTimer || 0) > 0;
        ai.direction = chosen.dir;
        e.lastDirection = chosen.dir;
        if (wasRecovery) {
            ai.recoveryCount += 1;
            ai.lastRecoveryReason = ai.lastRecoveryPathNodes > 0 ? 'replan-ruta' : 'replan-fisico';
            ai.blockedTimer = 0;
            ai.physicalBlockedTimer = 0;
            ai.physicalBlocked = false;
            ai.recoveryCooldownTimer = Math.max(Number(ai.recoveryCooldownTimer || 0), enemyAI_V312.recoveryCooldownMs);
        } else {
            ai.turnLockTimer = Number(profile.turnCommitMs || enemyAI_V312.navigationTurnCommitMs);
            ai.lastTurnTileKey = enemyTileKeyV312(tile.x, tile.y);
            ai.lastTurnDirection = chosen.dir;
            ai.lastTurnFromDirection = currentDir.dir;
            ai.lastTurnAtTileKey = enemyTileKeyV312(tile.x, tile.y);
            ai.navigationTurnCount = Number(ai.navigationTurnCount || 0) + 1;
        }
    }
    ai.lastDecisionTileX = tile.x;
    ai.lastDecisionTileY = tile.y;

    if (!currentPassable || ai.alert === 'flee') {
        ai.direction = chosen.dir;
        e.lastDirection = chosen.dir;
        ai.blockedTimer = 0;
    }


}

function getEnemyMovementSpeedV610(e) {
    const profile = enemyBehaviorProfileV324(e);
    const gameplaySpeedMultiplier = typeof getGameplayPowerupEnemySpeedMultiplierV676 === 'function'
        ? Math.max(0.1, Number(getGameplayPowerupEnemySpeedMultiplierV676(e)) || 1)
        : 1;
    const elementalEffectMultiplier = typeof getBombEffectEnemyMovementMultiplierV6306 === 'function'
        ? Math.max(0.28, Number(getBombEffectEnemyMovementMultiplierV6306(e)) || 1)
        : 1;
    return Math.max(0.1, Number(e.baseSpeed) || 1)
        * Number(profile.speedMultiplier || 1)
        * gameplaySpeedMultiplier
        * elementalEffectMultiplier;
}

function moveEnemyV312(e, dt) {
    const ai = e.ai;
    const speed = getEnemyMovementSpeedV610(e);
    const safeDt = Math.max(0, Number(dt) || 0);

    if (!e._tileMoveInitialized) {
        const tile = enemyTileV312(e);
        gridSnapEntityToTile(e, tile.x, tile.y, 'enemy');
        e._tileMoveInitialized = true;
    }

    if (e._tileMoveActive) {
        const result = gridAdvanceTileMove(e, speed, dt, { kind:'enemy', canFly:!!e.type.canFly, ignoreBombs: typeof enemyIgnoresBombsV630 === 'function' && enemyIgnoresBombsV630(e), allowCurrentBombTile:false });
        if (result.arrived) {
            e.vx = 0;
            e.vy = 0;
            ai.stuckTimer = 0;
            ai.physicalBlockedTimer = 0;
            ai.physicalBlocked = false;
            ai.cornerCorrectionMs = 0;
            ai.blockedDirection = null;
            ai.blockedDirectionFrames = 0;
            e.lastX = e.x;
            e.lastY = e.y;
        }
        return;
    }

    // Si una pared/bloque/bomba desaparece mientras el enemigo está esperando,
    // reintenta primero la dirección que quería seguir. No queda congelado en
    // un bloqueo antiguo.
    if (Number(ai.wallPauseMs || 0) > 0) {
        ai.wallPauseMs = Math.max(0, Number(ai.wallPauseMs || 0) - safeDt);
        ai.blockedRetryMs = Math.max(0, Number(ai.blockedRetryMs || 0) - safeDt);
        if (ai.blockedDirection && ai.blockedRetryMs <= 0) {
            const blockedDir = enemyDirectionV312(ai.blockedDirection);
            if (enemyImmediateDirectionPassableV312(e, blockedDir, false, 1.0)) {
                ai.wallPauseMs = 0;
                ai.wallPauseExpired = false;
                ai.blockedRetryMs = 0;
                ai.direction = blockedDir.dir;
                ai.desiredDirection = blockedDir.dir;
            } else {
                ai.blockedRetryMs = enemyAI_V312.blockedRetryMs;
            }
        }
        e.vx = 0;
        e.vy = 0;
        return;
    }

    if (ai.wallPauseExpired && ai.blockedDirection) {
        const current = enemyDirectionV312(ai.direction);
        let next = enemyChooseLocalRecoveryDirectionV319(e);
        if (!next) {
            const options = enemyAvailableDirectionsV312(e, false);
            next = options.find(dir => dir.dir !== ai.blockedDirection && dir.dir !== current.dir)
                || options.find(dir => dir.dir === ENEMY_OPPOSITE_V312[ai.blockedDirection])
                || options[0]
                || null;
        }
        if (next) {
            ai.direction = next.dir;
            ai.desiredDirection = next.dir;
            e.lastDirection = next.dir;
            ai.blockedDirection = null;
            ai.wallPauseExpired = false;
            ai.blockedTimer = 0;
            ai.physicalBlocked = false;
            ai.physicalBlockedTimer = 0;
        } else {
            ai.blockedRetryMs = enemyAI_V312.blockedRetryMs;
            return;
        }
    }

    const dir = enemyDirectionV312(ai.direction);
    const tile = enemyTileV312(e);
    const gx = tile.x + dir.x;
    const gy = tile.y + dir.y;
    const started = gridBeginTileMove(e, gx, gy, {
        kind: 'enemy',
        canFly: !!e.type.canFly,
        ignoreBombs: typeof enemyIgnoresBombsV630 === 'function' && enemyIgnoresBombsV630(e),
        allowCurrentBombTile: false
    });
    if (!started) {
        // El giro no es instantáneo: 2 s de pausa visible antes de cambiar de
        // corredor. Si durante la espera aparece espacio, puede continuar recto.
        ai.wallPauseMs = enemyAI_V312.wallPauseMs;
        ai.blockedRetryMs = enemyAI_V312.blockedRetryMs;
        ai.blockedDirection = dir.dir;
        ai.wallPauseExpired = false;
        e.vx = 0;
        e.vy = 0;
        ai.blockedTimer = (ai.blockedTimer || 0) + safeDt;
        return;
    }

    e.vx = dir.x * speed;
    e.vy = dir.y * speed;
}

function updateEnemyAI(dt) {
    if (!gameState.isPlaying || gameState.paused) return;

    const roomKey = `${gameState.level}:${gameState.roomType.id}`;
    if (enemyAI_V312.roomKey !== roomKey) {
        enemyAI_V312.roomKey = roomKey;
        enemyAI_V312.dangerCooldown = 0;
        enemyAI_V312.dangerSignature = '';
        enemyAI_V312.dangerBombCount = -1;
        enemyAI_V312.dangerExplosionCount = -1;
        enemyAI_V312.dangerBlastSerial = -1;
        enemyAI_V312.danger.clear();
        enemyAI_V312.cursor = 0;
        enemyAI_V312.decisionCursor = 0;
        for (let i = 0; i < gameState.enemies.length; i++) {
            ensureEnemyMotionStateV312(gameState.enemies[i], i);
        }
    }

    updateEnemyDangerV312(dt);

    const count = gameState.enemies.length;
    if (!count) return;

    // Movimiento todos los frames para que no pierda fluidez.
    // La parte costosa (visión/decisión) ya está temporizada por enemigo.
    for (let i = 0; i < count; i++) {
        const e = gameState.enemies[i];
        if (!e) continue;
        updateEnemyIntentV312(e, i, dt);
        moveEnemyV312(e, dt);
    }
}

function drawEnemyAISignals() {
    if (!gameState.enemies.length) return;
    if (!perfRenderEveryV329(2)) return;
    for (const e of gameState.enemies) {
        if (!e.ai || e.ai.alert === 'patrol') continue;
        if (typeof isWorldRectVisibleV329 === 'function' && !isWorldRectVisibleV329(e.x - e.width, e.y - e.height, e.width * 2, e.height * 2, TILE_SIZE)) continue;
        let color = '#facc15';
        let label = '';
        if (e.ai.alert === 'flee') { color = '#f97316'; label = '!'; }
        else if (e.ai.alert === 'surround') { color = '#22c55e'; label = '×'; }
        else if (e.ai.alert === 'chase') { color = '#ef4444'; label = '>'; }
        ctx.save();
        ctx.globalAlpha = 0.66 + Math.sin(gameState.animFrame * 0.14 + e.x) * 0.14;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(e.x, e.y - e.height * 0.56, 7, 0, Math.PI * 2);
        ctx.stroke();
        if (label) {
            ctx.fillStyle = color;
            ctx.font = '9px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText(label, e.x, e.y - e.height * 0.82);
        }
        ctx.restore();
    }
}
