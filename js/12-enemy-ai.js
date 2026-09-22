// Bomberman Roguelike v3.11 — Enemy AI
// Cardinal navigation, player pursuit, bomb avoidance and stuck recovery.
// The player remains strictly cardinal; enemies also use one axis at a time
// so they do not cut corners or slide through walls.

const ENEMY_AI = {
    maxPathNodes: 180,
    dangerHorizonMs: 1100,
    stuckWindowMs: 260,
    maxStuckCount: 2,
    accel: 0.42,
    brake: 0.72,
    snapDistance: 5.5,
    configs: {
        RASTRERO: { think: 430, chaseRadius: 10, patrolSteps: 4, prediction: 0 },
        VOLADOR: { think: 330, chaseRadius: 15, patrolSteps: 5, prediction: 1 },
        ESPECIAL: { think: 235, chaseRadius: 18, patrolSteps: 5, prediction: 2 }
    }
};

function ensureEnemyAIState(e) {
    if (!e.ai) {
        e.ai = {
            mode: 'patrol',
            path: [],
            pathIndex: 0,
            target: null,
            thinkTimer: Math.random() * 220,
            stuckTimer: ENEMY_AI.stuckWindowMs,
            stuckCount: 0,
            lastX: e.x,
            lastY: e.y,
            patrolDir: Math.floor(Math.random() * 4),
            patrolTimer: 0,
            lastPlayerX: 0,
            lastPlayerY: 0
        };
    }
    if (!e.ai.mode) e.ai.mode = 'patrol';
    e.aiMode = e.ai.mode;
    return e.ai;
}

function enemyConfig(e) {
    return ENEMY_AI.configs[e.type === ENEMY_TYPES.VOLADOR ? 'VOLADOR' : e.type === ENEMY_TYPES.ESPECIAL ? 'ESPECIAL' : 'RASTRERO'];
}

function enemyCell(e) {
    return {
        x: Math.max(0, Math.min(gameState.gridWidth - 1, Math.floor(e.x / TILE_SIZE))),
        y: Math.max(0, Math.min(gameState.gridHeight - 1, Math.floor(e.y / TILE_SIZE)))
    };
}

function playerCell() {
    return {
        x: Math.max(0, Math.min(gameState.gridWidth - 1, Math.floor((player.x + player.width / 2) / TILE_SIZE))),
        y: Math.max(0, Math.min(gameState.gridHeight - 1, Math.floor((player.y + player.height / 2) / TILE_SIZE)))
    };
}

function cellKey(x, y) {
    return `${x},${y}`;
}

function isExplosionOnCell(gx, gy) {
    return gameState.explosions.some(exp => exp.x === gx && exp.y === gy);
}

function blastLineClear(x1, y1, x2, y2) {
    if (x1 !== x2 && y1 !== y2) return false;
    const stepX = Math.sign(x2 - x1);
    const stepY = Math.sign(y2 - y1);
    let x = x1 + stepX;
    let y = y1 + stepY;
    while (x !== x2 || y !== y2) {
        if (x < 0 || y < 0 || x >= gameState.gridWidth || y >= gameState.gridHeight) return false;
        const tile = gameState.grid[y][x];
        if (tile === TYPES.WALL || tile === TYPES.BLOCK) return false;
        x += stepX;
        y += stepY;
    }
    return true;
}

function isCellInBombDanger(gx, gy, horizon = ENEMY_AI.dangerHorizonMs) {
    if (isExplosionOnCell(gx, gy)) return true;

    for (const bomb of gameState.bombs) {
        if (bomb.timer > horizon) continue;
        const distance = Math.abs(bomb.x - gx) + Math.abs(bomb.y - gy);
        if (distance > (bomb.range || 1)) continue;
        if (bomb.x === gx && bomb.y === gy) return true;
        if ((bomb.x === gx || bomb.y === gy) && blastLineClear(bomb.x, bomb.y, gx, gy)) return true;
    }
    return false;
}

function hasBombAtCell(gx, gy) {
    return gameState.bombs.some(b => b.x === gx && b.y === gy);
}

function isEnemyWalkableCell(e, gx, gy, allowCurrent = true) {
    if (gx < 1 || gy < 1 || gx >= gameState.gridWidth - 1 || gy >= gameState.gridHeight - 1) return false;
    if (isSolid(gx, gy, e.type.canFly)) return false;

    const current = enemyCell(e);
    if (!(allowCurrent && current.x === gx && current.y === gy) && hasBombAtCell(gx, gy)) return false;
    return true;
}

function cardinalNeighbors(cell) {
    return [
        { x: cell.x + 1, y: cell.y, axis: 'x', dir: 1 },
        { x: cell.x - 1, y: cell.y, axis: 'x', dir: -1 },
        { x: cell.x, y: cell.y + 1, axis: 'y', dir: 1 },
        { x: cell.x, y: cell.y - 1, axis: 'y', dir: -1 }
    ];
}

function orderedNeighbors(e, cell, goal, avoidDanger) {
    return cardinalNeighbors(cell)
        .filter(n => isEnemyWalkableCell(e, n.x, n.y, false))
        .sort((a, b) => {
            const ad = isCellInBombDanger(a.x, a.y);
            const bd = isCellInBombDanger(b.x, b.y);
            if (avoidDanger && ad !== bd) return ad ? 1 : -1;
            const da = Math.abs(a.x - goal.x) + Math.abs(a.y - goal.y);
            const db = Math.abs(b.x - goal.x) + Math.abs(b.y - goal.y);
            if (da !== db) return da - db;
            return Math.random() - 0.5;
        });
}

function bfsEnemyPath(e, start, goal, avoidDanger) {
    if (start.x === goal.x && start.y === goal.y) return [];
    const queue = [start];
    const visited = new Set([cellKey(start.x, start.y)]);
    const previous = new Map();
    let head = 0;
    let explored = 0;

    while (head < queue.length && explored < ENEMY_AI.maxPathNodes) {
        const current = queue[head++];
        explored++;
        for (const next of orderedNeighbors(e, current, goal, avoidDanger)) {
            const key = cellKey(next.x, next.y);
            if (visited.has(key)) continue;
            if (avoidDanger && isCellInBombDanger(next.x, next.y)) continue;
            visited.add(key);
            previous.set(key, current);

            if (next.x === goal.x && next.y === goal.y) {
                const path = [];
                let cursor = next;
                while (cursor.x !== start.x || cursor.y !== start.y) {
                    path.push(cursor);
                    cursor = previous.get(cellKey(cursor.x, cursor.y));
                    if (!cursor) return [];
                }
                path.reverse();
                return path;
            }
            queue.push({ x: next.x, y: next.y });
        }
    }
    return [];
}

function buildEnemyPath(e, start, goal) {
    let path = bfsEnemyPath(e, start, goal, true);
    if (!path.length) path = bfsEnemyPath(e, start, goal, false);
    return path;
}

function predictedPlayerTarget(e) {
    const target = playerCell();
    const prediction = enemyConfig(e).prediction;
    if (!prediction) return target;

    if (player.vx < -0.01) target.x -= prediction;
    else if (player.vx > 0.01) target.x += prediction;
    else if (player.vy < -0.01) target.y -= prediction;
    else if (player.vy > 0.01) target.y += prediction;

    target.x = Math.max(1, Math.min(gameState.gridWidth - 2, target.x));
    target.y = Math.max(1, Math.min(gameState.gridHeight - 2, target.y));
    return target;
}

function chooseEscapeCell(e) {
    const current = enemyCell(e);
    const pCell = playerCell();
    const candidates = cardinalNeighbors(current).filter(n => isEnemyWalkableCell(e, n.x, n.y, false));
    if (!candidates.length) return null;

    const bombs = gameState.bombs.filter(b => b.timer <= ENEMY_AI.dangerHorizonMs);
    let best = null;
    let bestScore = -Infinity;
    for (const c of candidates) {
        let score = isCellInBombDanger(c.x, c.y) ? -1000 : 1000;
        for (const b of bombs) {
            const distance = Math.abs(c.x - b.x) + Math.abs(c.y - b.y);
            if (distance > (b.range || 1)) continue;
            const clear = blastLineClear(b.x, b.y, c.x, c.y);
            if (clear || distance <= 1) score -= (clear ? 240 : 90) / Math.max(1, distance);
            score += distance * 8;
        }
        score += (Math.abs(c.x - pCell.x) + Math.abs(c.y - pCell.y)) * 1.2;
        score += Math.random() * 3;
        if (score > bestScore) {
            bestScore = score;
            best = c;
        }
    }
    return best;
}

function choosePatrolTarget(e) {
    const current = enemyCell(e);
    const config = enemyConfig(e);
    const directions = cardinalNeighbors(current);
    let preferred = e.ai.patrolDir;

    if (Math.random() < 0.34) preferred = Math.floor(Math.random() * directions.length);
    else if (Math.random() < 0.28) preferred = (preferred + (Math.random() < 0.5 ? 1 : 3)) % directions.length;

    const ordered = [directions[preferred], ...directions.filter((_, i) => i !== preferred)];
    for (const dir of ordered) {
        if (!isEnemyWalkableCell(e, dir.x, dir.y, false)) continue;
        e.ai.patrolDir = directions.indexOf(dir);
        let target = { x: dir.x, y: dir.y };
        for (let i = 1; i < config.patrolSteps; i++) {
            const next = { x: target.x + (dir.x - current.x), y: target.y + (dir.y - current.y) };
            if (!isEnemyWalkableCell(e, next.x, next.y, false) || hasBombAtCell(next.x, next.y)) break;
            target = next;
        }
        return target;
    }
    return null;
}

function enemyRectCollides(e, x, y) {
    const left = x - e.width / 2 + 2;
    const right = x + e.width / 2 - 2;
    const top = y - e.height / 2 + 2;
    const bottom = y + e.height / 2 - 2;
    if (right <= left || bottom <= top) return false;

    const minGX = Math.max(0, Math.floor(left / TILE_SIZE));
    const maxGX = Math.min(gameState.gridWidth - 1, Math.floor((right - 0.001) / TILE_SIZE));
    const minGY = Math.max(0, Math.floor(top / TILE_SIZE));
    const maxGY = Math.min(gameState.gridHeight - 1, Math.floor((bottom - 0.001) / TILE_SIZE));

    for (let gy = minGY; gy <= maxGY; gy++) {
        for (let gx = minGX; gx <= maxGX; gx++) {
            if (!isSolid(gx, gy, e.type.canFly)) continue;
            const wallLeft = gx * TILE_SIZE;
            const wallRight = wallLeft + TILE_SIZE;
            const wallTop = gy * TILE_SIZE;
            const wallBottom = gy * TILE_SIZE + TILE_SIZE;
            if (right > wallLeft && left < wallRight && bottom > wallTop && top < wallBottom) return true;
        }
    }
    return false;
}

function moveEnemyAxis(e, axis, amount) {
    if (!amount) return false;
    const steps = Math.max(1, Math.ceil(Math.abs(amount) / 2));
    const step = amount / steps;
    let moved = false;
    for (let i = 0; i < steps; i++) {
        const nx = axis === 'x' ? e.x + step : e.x;
        const ny = axis === 'y' ? e.y + step : e.y;
        if (enemyRectCollides(e, nx, ny)) break;
        e.x = nx;
        e.y = ny;
        moved = true;
    }
    return moved;
}

function enemyApproach(value, target, amount) {
    if (value < target) return Math.min(value + amount, target);
    if (value > target) return Math.max(value - amount, target);
    return target;
}

function steerEnemyToCell(e, target, dt) {
    const tx = target.x * TILE_SIZE + TILE_SIZE / 2;
    const ty = target.y * TILE_SIZE + TILE_SIZE / 2;
    const dx = tx - e.x;
    const dy = ty - e.y;
    const scale = Math.min(dt / 16.6667, 2);
    const speed = e.baseSpeed * (1 + gameState.threatLevel * 0.04);

    if (Math.abs(dx) <= ENEMY_AI.snapDistance && Math.abs(dy) <= ENEMY_AI.snapDistance) {
        e.x = tx;
        e.y = ty;
        e.vx = 0;
        e.vy = 0;
        return true;
    }

    let axis;
    if (Math.abs(dx) > 2 && Math.abs(dx) >= Math.abs(dy)) axis = 'x';
    else if (Math.abs(dy) > 2) axis = 'y';
    else axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';

    const desired = axis === 'x' ? Math.sign(dx) * speed : Math.sign(dy) * speed;
    if (axis === 'x') {
        e.vy = 0;
        e.vx = enemyApproach(e.vx, desired, ENEMY_AI.accel * scale);
        if (!moveEnemyAxis(e, 'x', e.vx * scale)) {
            e.vx = enemyApproach(e.vx, 0, ENEMY_AI.brake * scale);
            return false;
        }
    } else {
        e.vx = 0;
        e.vy = enemyApproach(e.vy, desired, ENEMY_AI.accel * scale);
        if (!moveEnemyAxis(e, 'y', e.vy * scale)) {
            e.vy = enemyApproach(e.vy, 0, ENEMY_AI.brake * scale);
            return false;
        }
    }
    return true;
}

function updateEnemyOne(e, dt) {
    const ai = ensureEnemyAIState(e);
    const config = enemyConfig(e);
    const current = enemyCell(e);
    const pCell = playerCell();
    const distanceToPlayer = Math.abs(current.x - pCell.x) + Math.abs(current.y - pCell.y);
    const threatened = isCellInBombDanger(current);

    ai.thinkTimer -= dt;
    ai.stuckTimer -= dt;

    if (ai.stuckTimer <= 0) {
        const moved = Math.hypot(e.x - ai.lastX, e.y - ai.lastY);
        if (moved < 2.5) ai.stuckCount++;
        else ai.stuckCount = 0;
        ai.lastX = e.x;
        ai.lastY = e.y;
        ai.stuckTimer = ENEMY_AI.stuckWindowMs;
    }

    if (ai.stuckCount >= ENEMY_AI.maxStuckCount) {
        ai.path = [];
        ai.pathIndex = 0;
        ai.thinkTimer = 0;
        ai.stuckCount = 0;
        e.vx = 0;
        e.vy = 0;
    }

    if (threatened) {
        ai.mode = 'flee';
        ai.thinkTimer = Math.min(ai.thinkTimer, 90);
        const escape = chooseEscapeCell(e);
        if (escape) {
            ai.path = [escape];
            ai.pathIndex = 0;
            ai.target = escape;
        }
    } else if (ai.thinkTimer <= 0 || !ai.path.length || ai.pathIndex >= ai.path.length) {
        ai.thinkTimer = config.think;
        ai.path = [];
        ai.pathIndex = 0;
        ai.target = null;

        const shouldChase = e.type === ENEMY_TYPES.ESPECIAL || distanceToPlayer <= config.chaseRadius;
        if (shouldChase) {
            const target = predictedPlayerTarget(e);
            const path = buildEnemyPath(e, current, target);
            if (path.length) {
                ai.mode = 'chase';
                ai.path = path;
                ai.pathIndex = 0;
                ai.target = target;
            } else {
                ai.mode = 'patrol';
                const patrol = choosePatrolTarget(e);
                if (patrol) {
                    ai.path = buildEnemyPath(e, current, patrol);
                    ai.target = patrol;
                }
            }
        } else {
            ai.mode = 'patrol';
            const patrol = choosePatrolTarget(e);
            if (patrol) {
                ai.path = buildEnemyPath(e, current, patrol);
                ai.target = patrol;
            }
        }
    }

    e.aiMode = ai.mode;
    const target = ai.path[ai.pathIndex];
    if (!target) {
        e.vx = enemyApproach(e.vx, 0, ENEMY_AI.brake * Math.min(dt / 16.6667, 2));
        e.vy = enemyApproach(e.vy, 0, ENEMY_AI.brake * Math.min(dt / 16.6667, 2));
        return;
    }

    const tx = target.x * TILE_SIZE + TILE_SIZE / 2;
    const ty = target.y * TILE_SIZE + TILE_SIZE / 2;
    if (Math.abs(e.x - tx) <= ENEMY_AI.snapDistance && Math.abs(e.y - ty) <= ENEMY_AI.snapDistance) {
        e.x = tx;
        e.y = ty;
        e.vx = 0;
        e.vy = 0;
        ai.pathIndex++;
        if (ai.pathIndex >= ai.path.length) ai.thinkTimer = 0;
        return;
    }

    if (!steerEnemyToCell(e, target, dt)) {
        ai.path = [];
        ai.pathIndex = 0;
        ai.thinkTimer = 0;
    }
}

function updateEnemiesAI(dt) {
    if (!gameState.enemies.length) return;
    for (const e of gameState.enemies) updateEnemyOne(e, dt);
}
