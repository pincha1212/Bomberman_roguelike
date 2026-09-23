// Bomberman Roguelike v3.11 — Enemy AI, navigation and bomb awareness
// Diseñado para conservar un game loop estable: como máximo 1 reconstrucción
// de ruta cada AI_PATH_INTERVAL_MS. Los enemigos siguen moviéndose mientras
// esperan su siguiente cálculo.

const enemyAI = {
    roomKey: '',
    pathCooldown: 0,
    cursor: 0,
    dangerCooldown: 0,
    dangerSignature: '',
    danger: new Set(),
    maxNodes: 72,
    pathIntervalMs: 85,
    repathMs: 240,
    patrolRepathMs: 900,
    stuckMs: 420
};

const AI_DIRS = [
    { x: 1, y: 0, dir: 'right' },
    { x: -1, y: 0, dir: 'left' },
    { x: 0, y: 1, dir: 'down' },
    { x: 0, y: -1, dir: 'up' }
];

function enemyTile(e) {
    return {
        x: Math.max(0, Math.min(gameState.gridWidth - 1, Math.floor(e.x / TILE_SIZE))),
        y: Math.max(0, Math.min(gameState.gridHeight - 1, Math.floor(e.y / TILE_SIZE)))
    };
}

function enemyTileKey(x, y) {
    return `${x},${y}`;
}

function enemyTileIndex(x, y) {
    return y * gameState.gridWidth + x;
}

function enemyCenter(x, y) {
    return {
        x: x * TILE_SIZE + TILE_SIZE / 2,
        y: y * TILE_SIZE + TILE_SIZE / 2
    };
}

function isEnemyBombDanger(x, y) {
    return enemyAI.danger.has(enemyTileKey(x, y));
}

function enemyHasBombAt(x, y) {
    return gameState.bombs.some(b => b.x === x && b.y === y);
}

function rebuildEnemyDangerMap() {
    const danger = new Set();
    for (const b of gameState.bombs) {
        danger.add(enemyTileKey(b.x, b.y));
        if (typeof calculateBombBlastCells === 'function') {
            for (const cell of calculateBombBlastCells(b)) danger.add(enemyTileKey(cell.x, cell.y));
        }
    }
    for (const exp of gameState.explosions) {
        danger.add(enemyTileKey(exp.x, exp.y));
    }
    enemyAI.danger = danger;
}

function updateEnemyDanger(dt) {
    const bombSig = gameState.bombs.map(b => `${b.x},${b.y},${Math.floor(b.timer / 100)}`).join('|');
    const expSig = gameState.explosions.map(e => `${e.x},${e.y}`).join('|');
    const signature = `${bombSig}#${expSig}`;
    enemyAI.dangerCooldown -= dt;
    if (signature !== enemyAI.dangerSignature || enemyAI.dangerCooldown <= 0) {
        enemyAI.dangerSignature = signature;
        enemyAI.dangerCooldown = 120;
        rebuildEnemyDangerMap();
    }
}

function ensureEnemyAIState(e, index) {
    if (!e.ai) {
        e.ai = {
            behavior: e.type === ENEMY_TYPES.VOLADOR ? 'patrol' : (e.type === ENEMY_TYPES.ESPECIAL ? 'surround' : 'chase'),
            path: [],
            pathIndex: 0,
            targetX: -1,
            targetY: -1,
            repathTimer: 80 + (index * 25) % 140,
            patrolTimer: 0,
            patrolX: -1,
            patrolY: -1,
            stuckTimer: 0,
            lastX: e.x,
            lastY: e.y,
            turnDir: AI_DIRS[index % AI_DIRS.length].dir,
            alert: 'idle',
            fleeUntil: 0,
            slot: index % 4,
            targetKind: 'none'
        };
    }
    if (!Array.isArray(e.ai.path)) e.ai.path = [];
    return e.ai;
}

function enemyIsPassable(x, y, canFly, allowDanger) {
    if (x < 1 || y < 1 || x >= gameState.gridWidth - 1 || y >= gameState.gridHeight - 1) return false;
    const tile = gameState.grid[y][x];
    if (canFly) {
        if (tile === TYPES.WALL) return false;
    } else if (tile === TYPES.WALL || tile === TYPES.BLOCK) {
        return false;
    }
    if (!allowDanger && isEnemyBombDanger(x, y)) return false;
    return true;
}

function enemyRectCollides(e, x, y) {
    const halfW = e.width * 0.47;
    const halfH = e.height * 0.47;
    const left = x - halfW, right = x + halfW;
    const top = y - halfH, bottom = y + halfH;
    const minGX = Math.max(0, Math.floor(left / TILE_SIZE));
    const maxGX = Math.min(gameState.gridWidth - 1, Math.floor((right - 0.001) / TILE_SIZE));
    const minGY = Math.max(0, Math.floor(top / TILE_SIZE));
    const maxGY = Math.min(gameState.gridHeight - 1, Math.floor((bottom - 0.001) / TILE_SIZE));

    for (let gy = minGY; gy <= maxGY; gy++) {
        for (let gx = minGX; gx <= maxGX; gx++) {
            if (!enemyIsPassable(gx, gy, !!e.type.canFly, false)) return true;
        }
    }
    return false;
}

function chooseSpecialTarget(e, playerTile) {
    const candidates = [
        { x: playerTile.x + 1, y: playerTile.y, slot: 0 },
        { x: playerTile.x - 1, y: playerTile.y, slot: 1 },
        { x: playerTile.x, y: playerTile.y + 1, slot: 2 },
        { x: playerTile.x, y: playerTile.y - 1, slot: 3 }
    ];
    const occupied = new Set(gameState.enemies.map(other => {
        const t = enemyTile(other);
        return enemyTileKey(t.x, t.y);
    }));

    candidates.sort((a, b) => {
        const ad = Math.abs(a.x - enemyTile(e).x) + Math.abs(a.y - enemyTile(e).y);
        const bd = Math.abs(b.x - enemyTile(e).x) + Math.abs(b.y - enemyTile(e).y);
        const ao = occupied.has(enemyTileKey(a.x, a.y)) ? 1 : 0;
        const bo = occupied.has(enemyTileKey(b.x, b.y)) ? 1 : 0;
        const as = a.slot === e.ai.slot ? 0 : 1;
        const bs = b.slot === e.ai.slot ? 0 : 1;
        return (ao - bo) * 20 + (ad - bd) + (as - bs) * 2;
    });

    for (const target of candidates) {
        if (!enemyIsPassable(target.x, target.y, !!e.type.canFly, true)) continue;
        return { x: target.x, y: target.y, kind: 'surround' };
    }
    return { x: playerTile.x, y: playerTile.y, kind: 'chase' };
}

function pickPatrolTarget(e) {
    const start = enemyTile(e);
    const candidates = [];
    for (let i = 0; i < 10; i++) {
        const x = 1 + Math.floor(Math.random() * Math.max(1, gameState.gridWidth - 2));
        const y = 1 + Math.floor(Math.random() * Math.max(1, gameState.gridHeight - 2));
        if (!enemyIsPassable(x, y, !!e.type.canFly, true)) continue;
        const d = Math.abs(x - start.x) + Math.abs(y - start.y);
        if (d >= 3) candidates.push({ x, y, d });
    }
    candidates.sort((a, b) => a.d - b.d);
    if (candidates.length) return { x: candidates[0].x, y: candidates[0].y, kind: 'patrol' };
    return { x: start.x, y: start.y, kind: 'patrol' };
}

function findNearestSafeTile(startX, startY, e) {
    const total = gameState.gridWidth * gameState.gridHeight;
    const visited = new Uint8Array(total);
    const parent = new Int32Array(total);
    parent.fill(-1);
    const queue = new Int32Array(total);
    let head = 0, tail = 0, nodes = 0;
    const start = enemyTileIndex(startX, startY);
    queue[tail++] = start;
    visited[start] = 1;

    while (head < tail && nodes < 55) {
        const current = queue[head++];
        nodes++;
        const x = current % gameState.gridWidth;
        const y = Math.floor(current / gameState.gridWidth);
        if (!(x === startX && y === startY) && enemyIsPassable(x, y, !!e.type.canFly, false) && !isEnemyBombDanger(x, y)) {
            return { x, y };
        }
        for (const d of AI_DIRS) {
            const nx = x + d.x, ny = y + d.y;
            if (nx < 1 || ny < 1 || nx >= gameState.gridWidth - 1 || ny >= gameState.gridHeight - 1) continue;
            const idx = enemyTileIndex(nx, ny);
            if (visited[idx]) continue;
            if (!enemyIsPassable(nx, ny, !!e.type.canFly, false)) continue;
            visited[idx] = 1;
            parent[idx] = current;
            queue[tail++] = idx;
        }
    }
    return null;
}

function buildEnemyPath(e, targetX, targetY, avoidDanger = true) {
    const start = enemyTile(e);
    if (start.x === targetX && start.y === targetY) {
        e.ai.path = [];
        e.ai.pathIndex = 0;
        return true;
    }
    if (!enemyIsPassable(targetX, targetY, !!e.type.canFly, !avoidDanger)) return false;

    const width = gameState.gridWidth;
    const height = gameState.gridHeight;
    const total = width * height;
    const visited = new Uint8Array(total);
    const parent = new Int32Array(total);
    const dirFromParent = new Int8Array(total);
    const queue = new Int32Array(total);
    parent.fill(-2);

    const startIdx = enemyTileIndex(start.x, start.y);
    const goalIdx = enemyTileIndex(targetX, targetY);
    let head = 0, tail = 0, nodes = 0;
    queue[tail++] = startIdx;
    visited[startIdx] = 1;
    parent[startIdx] = -1;

    while (head < tail && nodes < enemyAI.maxNodes) {
        const current = queue[head++];
        nodes++;
        if (current === goalIdx) break;
        const cx = current % width;
        const cy = Math.floor(current / width);
        for (let d = 0; d < AI_DIRS.length; d++) {
            const nx = cx + AI_DIRS[d].x;
            const ny = cy + AI_DIRS[d].y;
            if (nx < 1 || ny < 1 || nx >= width - 1 || ny >= height - 1) continue;
            const nextIdx = enemyTileIndex(nx, ny);
            if (visited[nextIdx]) continue;
            if (!enemyIsPassable(nx, ny, !!e.type.canFly, !avoidDanger)) continue;
            visited[nextIdx] = 1;
            parent[nextIdx] = current;
            dirFromParent[nextIdx] = d;
            queue[tail++] = nextIdx;
            if (nextIdx === goalIdx) break;
        }
        if (visited[goalIdx]) break;
    }

    if (!visited[goalIdx]) {
        e.ai.path = [];
        e.ai.pathIndex = 0;
        return false;
    }

    const reversed = [];
    let cursor = goalIdx;
    while (cursor !== startIdx && cursor >= 0) {
        reversed.push(dirFromParent[cursor]);
        cursor = parent[cursor];
        if (reversed.length > 80) break;
    }
    reversed.reverse();
    e.ai.path = reversed;
    e.ai.pathIndex = 0;
    return true;
}

function enemyNeedsPath(e) {
    return !e.ai.path || e.ai.pathIndex >= e.ai.path.length;
}

function setEnemyTarget(e, target) {
    const changed = e.ai.targetX !== target.x || e.ai.targetY !== target.y || e.ai.targetKind !== target.kind;
    e.ai.targetX = target.x;
    e.ai.targetY = target.y;
    e.ai.targetKind = target.kind;
    if (changed) {
        e.ai.path = [];
        e.ai.pathIndex = 0;
        e.ai.repathTimer = 0;
    }
}

function updateEnemyIntent(e, index, dt) {
    const ai = ensureEnemyAIState(e, index);
    ai.repathTimer -= dt;
    ai.patrolTimer -= dt;
    const et = enemyTile(e);
    const pt = enemyTile({ x: player.x + player.width / 2, y: player.y + player.height / 2 });
    const distance = Math.abs(et.x - pt.x) + Math.abs(et.y - pt.y);
    const dangerHere = isEnemyBombDanger(et.x, et.y);

    if (dangerHere) {
        ai.alert = 'flee';
        ai.fleeUntil = performance.now() + 550;
        const safe = findNearestSafeTile(et.x, et.y, e);
        if (safe) setEnemyTarget(e, { ...safe, kind: 'flee' });
        return ai;
    }

    if (ai.fleeUntil > performance.now() && !enemyHasBombAt(et.x, et.y)) {
        ai.alert = 'flee';
        return ai;
    }

    if (e.type === ENEMY_TYPES.VOLADOR) {
        if (distance <= 7 || gameState.threatLevel >= 3) {
            ai.alert = 'chase';
            setEnemyTarget(e, { x: pt.x, y: pt.y, kind: 'chase' });
        } else {
            ai.alert = 'patrol';
            if (ai.patrolTimer <= 0 || ai.patrolX < 0) {
                const patrol = pickPatrolTarget(e);
                ai.patrolX = patrol.x;
                ai.patrolY = patrol.y;
                ai.patrolTimer = enemyAI.patrolRepathMs;
                setEnemyTarget(e, patrol);
            }
        }
    } else if (e.type === ENEMY_TYPES.ESPECIAL) {
        ai.alert = 'surround';
        const surround = chooseSpecialTarget(e, pt);
        setEnemyTarget(e, surround);
    } else {
        ai.alert = 'chase';
        setEnemyTarget(e, { x: pt.x, y: pt.y, kind: 'chase' });
    }
    return ai;
}

function chooseFallbackDirection(e) {
    const tile = enemyTile(e);
    const possible = AI_DIRS.filter(d => enemyIsPassable(tile.x + d.x, tile.y + d.y, !!e.type.canFly, false));
    if (!possible.length) return AI_DIRS[0];
    possible.sort((a, b) => {
        const an = isEnemyBombDanger(tile.x + a.x, tile.y + a.y) ? 1 : 0;
        const bn = isEnemyBombDanger(tile.x + b.x, tile.y + b.y) ? 1 : 0;
        return an - bn;
    });
    return possible[0];
}

function advanceEnemyPath(e, dt) {
    const ai = e.ai;
    if (!ai.path.length || ai.pathIndex >= ai.path.length) {
        const fallback = chooseFallbackDirection(e);
        e.vx = fallback.x * e.baseSpeed * (1 + gameState.threatLevel * 0.04);
        e.vy = fallback.y * e.baseSpeed * (1 + gameState.threatLevel * 0.04);
        ai.alert = ai.alert === 'flee' ? 'flee' : ai.alert;
    } else {
        const dir = AI_DIRS[ai.path[ai.pathIndex]] || AI_DIRS[0];
        const speed = e.baseSpeed * (1 + gameState.threatLevel * 0.04);
        const target = enemyCenter(Math.floor(e.ai.targetX), Math.floor(e.ai.targetY));
        const cx = e.x, cy = e.y;
        if (dir.x !== 0) {
            e.vx = dir.x * speed;
            e.vy = 0;
        } else {
            e.vx = 0;
            e.vy = dir.y * speed;
        }
        const nextX = cx + e.vx * Math.min(dt / 16.6667, 2);
        const nextY = cy + e.vy * Math.min(dt / 16.6667, 2);
        if (!enemyRectCollides(e, nextX, nextY) && !isEnemyBombDanger(Math.floor(nextX / TILE_SIZE), Math.floor(nextY / TILE_SIZE))) {
            e.x = nextX;
            e.y = nextY;
        } else {
            e.vx = 0;
            e.vy = 0;
            ai.path = [];
            ai.pathIndex = 0;
            ai.repathTimer = 0;
            return;
        }

        const waypoint = enemyCenter(Math.floor(e.ai.targetX), Math.floor(e.ai.targetY));
        const threshold = 3.0;
        if (Math.abs(e.x - waypoint.x) <= threshold && Math.abs(e.y - waypoint.y) <= threshold) {
            e.x = waypoint.x;
            e.y = waypoint.y;
            ai.pathIndex++;
            if (ai.pathIndex >= ai.path.length) ai.repathTimer = 0;
        }
    }

    if (Math.abs(e.vx) > 0.01) e.lastDirection = e.vx > 0 ? 'right' : 'left';
    else if (Math.abs(e.vy) > 0.01) e.lastDirection = e.vy > 0 ? 'down' : 'up';

    const movedDistance = Math.hypot(e.x - ai.lastX, e.y - ai.lastY);
    if (movedDistance < 0.3) ai.stuckTimer += dt;
    else ai.stuckTimer = Math.max(0, ai.stuckTimer - dt * 0.5);
    ai.lastX = e.x;
    ai.lastY = e.y;
    if (ai.stuckTimer >= enemyAI.stuckMs) {
        ai.stuckTimer = 0;
        ai.path = [];
        ai.pathIndex = 0;
        ai.repathTimer = 0;
    }
}

function serviceEnemyPathScheduler() {
    if (!gameState.enemies.length) return;
    if (enemyAI.pathCooldown > 0) return;

    const count = gameState.enemies.length;
    for (let step = 0; step < count; step++) {
        const index = (enemyAI.cursor + step) % count;
        const e = gameState.enemies[index];
        if (!e) continue;
        const ai = ensureEnemyAIState(e, index);
        if (ai.repathTimer > 0 && !enemyNeedsPath(e) && ai.alert !== 'flee') continue;
        if (ai.targetX < 0 || ai.targetY < 0) continue;

        const urgent = ai.alert === 'flee' || ai.repathTimer <= 0 || enemyNeedsPath(e);
        if (!urgent) continue;
        const avoidDanger = ai.alert !== 'flee';
        const built = buildEnemyPath(e, ai.targetX, ai.targetY, avoidDanger);
        ai.repathTimer = ai.alert === 'patrol' ? enemyAI.patrolRepathMs : enemyAI.repathMs;
        if (!built && ai.alert !== 'flee') {
            e.ai.targetX = -1;
            e.ai.targetY = -1;
        }
        enemyAI.cursor = (index + 1) % count;
        enemyAI.pathCooldown = enemyAI.pathIntervalMs;
        return;
    }
}

function updateEnemyAI(dt) {
    if (!gameState.isPlaying || gameState.paused) return;

    const roomKey = `${gameState.level}:${gameState.roomType.id}`;
    if (enemyAI.roomKey !== roomKey) {
        enemyAI.roomKey = roomKey;
        enemyAI.pathCooldown = 140;
        enemyAI.cursor = 0;
        enemyAI.dangerSignature = '';
        enemyAI.danger.clear();
        for (let i = 0; i < gameState.enemies.length; i++) {
            ensureEnemyAIState(gameState.enemies[i], i);
        }
    }

    updateEnemyDanger(dt);
    enemyAI.pathCooldown -= dt;

    // Intención y movimiento son baratos y corren cada frame; el pathfinding
    // pesado está limitado por serviceEnemyPathScheduler().
    for (let i = 0; i < gameState.enemies.length; i++) {
        const e = gameState.enemies[i];
        if (!e) continue;
        updateEnemyIntent(e, i, dt);
        advanceEnemyPath(e, dt);
    }

    serviceEnemyPathScheduler();
}

function drawEnemyAISignals() {
    if (!gameState.enemies.length) return;
    for (const e of gameState.enemies) {
        if (!e.ai || !e.ai.alert || e.ai.alert === 'patrol' || e.ai.alert === 'idle') continue;
        let color = '#facc15';
        let label = '';
        if (e.ai.alert === 'flee') { color = '#f97316'; label = '!'; }
        else if (e.ai.alert === 'surround') { color = '#22c55e'; label = '×'; }
        else if (e.ai.alert === 'chase') { color = '#ef4444'; label = '>'; }
        ctx.save();
        ctx.globalAlpha = 0.7 + Math.sin(gameState.animFrame * 0.14 + e.x) * 0.15;
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
