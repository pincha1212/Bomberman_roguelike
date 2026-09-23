// Bomberman Roguelike v3.12 — Enemy AI: local grid decisions
// Inspirado en navegación por corredores/intersecciones: la IA decide la
// dirección, mientras 13-collision.js se encarga de que el movimiento sea real.

const enemyAI_V312 = {
    roomKey: '',
    dangerCooldown: 0,
    dangerSignature: '',
    danger: new Set(),
    visionInterval: 110,
    decisionInterval: 85,
    memoryMs: 700,
    turnRadius: 7,
    stuckMs: 260,
    cursor: 0
};

const ENEMY_DIRS_V312 = [
    { x: 0, y: -1, dir: 'up' },
    { x: 0, y: 1, dir: 'down' },
    { x: -1, y: 0, dir: 'left' },
    { x: 1, y: 0, dir: 'right' }
];

const ENEMY_DIR_INDEX_V312 = new Map(ENEMY_DIRS_V312.map((d, i) => [d.dir, i]));
const ENEMY_OPPOSITE_V312 = { up: 'down', down: 'up', left: 'right', right: 'left' };

function enemyTileV312(e) {
    return {
        x: Math.max(0, Math.min(gameState.gridWidth - 1, Math.floor(e.x / TILE_SIZE))),
        y: Math.max(0, Math.min(gameState.gridHeight - 1, Math.floor(e.y / TILE_SIZE)))
    };
}

function enemyTileKeyV312(x, y) {
    return `${x},${y}`;
}

function enemyCenterV312(x, y) {
    return gridTileCenter(x, y);
}

function enemyDangerV312(x, y) {
    return enemyAI_V312.danger.has(enemyTileKeyV312(x, y));
}

function rebuildEnemyDangerV312() {
    const danger = new Set();
    for (const bomb of gameState.bombs) {
        danger.add(enemyTileKeyV312(bomb.x, bomb.y));
        if (typeof calculateBombBlastCells === 'function') {
            for (const cell of calculateBombBlastCells(bomb)) danger.add(enemyTileKeyV312(cell.x, cell.y));
        }
    }
    for (const exp of gameState.explosions) danger.add(enemyTileKeyV312(exp.x, exp.y));
    enemyAI_V312.danger = danger;
}

function updateEnemyDangerV312(dt) {
    const bombSig = gameState.bombs.map(b => `${b.x},${b.y},${Math.floor(b.timer / 120)}`).join('|');
    const expSig = gameState.explosions.map(e => `${e.x},${e.y}`).join('|');
    const signature = `${bombSig}#${expSig}`;
    enemyAI_V312.dangerCooldown -= dt;
    if (signature !== enemyAI_V312.dangerSignature || enemyAI_V312.dangerCooldown <= 0) {
        enemyAI_V312.dangerSignature = signature;
        enemyAI_V312.dangerCooldown = 100;
        rebuildEnemyDangerV312();
    }
}

function ensureEnemyMotionStateV312(e, index) {
    if (!e.__gridAnchor) e.__gridAnchor = 'center';
    if (!e.ai) {
        e.ai = {
            behavior: 'patrol',
            alert: 'patrol',
            direction: e.lastDirection || (ENEMY_DIRS_V312[index % ENEMY_DIRS_V312.length]?.dir || 'down'),
            desiredDirection: e.desiredDirection || e.lastDirection || 'down',
            decisionTimer: 35 + (index * 17) % 70,
            visionTimer: 0,
            seesPlayer: false,
            lastSeenX: -1,
            lastSeenY: -1,
            memoryTimer: 0,
            patrolX: -1,
            patrolY: -1,
            stuckTimer: 0,
            lastX: e.x,
            lastY: e.y,
            slot: index % 4
        };
    }
    return e.ai;
}

function enemyVisionBlockedV312(gx, gy) {
    if (!gridIsInside(gx, gy)) return true;
    const tile = gameState.grid[gy]?.[gx];
    return tile === TYPES.WALL || tile === TYPES.BLOCK;
}

function enemyCanSeePlayerV312(e) {
    const ex = e.x;
    const ey = e.y;
    const px = player.x + player.width / 2;
    const py = player.y + player.height / 2;
    const dx = px - ex;
    const dy = py - ey;
    const dist = Math.hypot(dx, dy);
    if (dist > TILE_SIZE * 8.5) return false;

    const steps = Math.max(1, Math.ceil(dist / (TILE_SIZE * 0.22)));
    let previousKey = '';
    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const sx = ex + dx * t;
        const sy = ey + dy * t;
        const gx = Math.floor(sx / TILE_SIZE);
        const gy = Math.floor(sy / TILE_SIZE);
        const key = `${gx},${gy}`;
        if (key === previousKey) continue;
        previousKey = key;
        if (enemyVisionBlockedV312(gx, gy)) return i === steps;
    }
    return true;
}

function enemyDirectionV312(dir) {
    return ENEMY_DIRS_V312.find(d => d.dir === dir) || ENEMY_DIRS_V312[1];
}

function enemyDirectionPassableV312(e, dir, avoidDanger = false) {
    const tile = enemyTileV312(e);
    const next = { x: tile.x + dir.x, y: tile.y + dir.y };
    if (!gridIsInside(next.x, next.y)) return false;
    const center = enemyCenterV312(next.x, next.y);
    return gridCanOccupy(e, center.x, center.y, {
        kind: 'enemy',
        canFly: !!e.type.canFly,
        avoidDanger,
        allowCurrentBombTile: true
    });
}

function enemyAvailableDirectionsV312(e, avoidDanger = false) {
    return ENEMY_DIRS_V312.filter(dir => enemyDirectionPassableV312(e, dir, avoidDanger));
}

function enemyIsNearCenterV312(e) {
    return gridIsNearTileCenter(e, enemyAI_V312.turnRadius);
}

function enemyDistanceToV312(x1, y1, x2, y2) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

function enemyChoosePatrolTargetV312(e) {
    const start = enemyTileV312(e);
    const candidates = [];
    for (let i = 0; i < 14; i++) {
        const x = 1 + Math.floor(Math.random() * Math.max(1, gameState.gridWidth - 2));
        const y = 1 + Math.floor(Math.random() * Math.max(1, gameState.gridHeight - 2));
        const center = enemyCenterV312(x, y);
        if (!gridCanOccupy(e, center.x, center.y, { kind: 'enemy', canFly: !!e.type.canFly, avoidDanger: true })) continue;
        const d = enemyDistanceToV312(x, y, start.x, start.y);
        if (d >= 3) candidates.push({ x, y, d });
    }
    candidates.sort((a, b) => a.d - b.d);
    return candidates[0] || { x: start.x, y: start.y };
}

function enemyChooseSurroundTargetV312(e) {
    const pt = {
        x: Math.floor((player.x + player.width / 2) / TILE_SIZE),
        y: Math.floor((player.y + player.height / 2) / TILE_SIZE)
    };
    const offsets = [
        { x: 1, y: 0, slot: 0 },
        { x: -1, y: 0, slot: 1 },
        { x: 0, y: 1, slot: 2 },
        { x: 0, y: -1, slot: 3 }
    ];
    let best = null;
    for (const o of offsets) {
        const tx = pt.x + o.x;
        const ty = pt.y + o.y;
        const center = enemyCenterV312(tx, ty);
        if (!gridCanOccupy(e, center.x, center.y, { kind: 'enemy', canFly: !!e.type.canFly, avoidDanger: true })) continue;
        const d = enemyDistanceToV312(tx, ty, enemyTileV312(e).x, enemyTileV312(e).y);
        const slotPenalty = o.slot === e.ai.slot ? 0 : 0.4;
        const score = d + slotPenalty;
        if (!best || score < best.score) best = { x: tx, y: ty, score };
    }
    return best || { x: pt.x, y: pt.y, score: 0 };
}

function enemyClosestDangerDistanceV312(tile) {
    if (!enemyAI_V312.danger.size) return 99;
    let best = 99;
    for (const key of enemyAI_V312.danger) {
        const [x, y] = key.split(',').map(Number);
        best = Math.min(best, enemyDistanceToV312(tile.x, tile.y, x, y));
    }
    return best;
}

function enemyChooseFleeDirectionV312(e) {
    const possible = enemyAvailableDirectionsV312(e, false);
    if (!possible.length) return null;
    const tile = enemyTileV312(e);
    const playerTile = {
        x: Math.floor((player.x + player.width / 2) / TILE_SIZE),
        y: Math.floor((player.y + player.height / 2) / TILE_SIZE)
    };

    let best = null;
    for (const dir of possible) {
        const nx = tile.x + dir.x;
        const ny = tile.y + dir.y;
        const danger = enemyDangerV312(nx, ny) ? 1 : 0;
        const dangerDistance = enemyClosestDangerDistanceV312({ x: nx, y: ny });
        const playerDistance = enemyDistanceToV312(nx, ny, playerTile.x, playerTile.y);
        const score = danger * 1000 + (20 - Math.min(20, dangerDistance)) * 80 - playerDistance * 2;
        if (!best || score < best.score) best = { dir, score };
    }
    return best ? best.dir : null;
}

function enemyScoreDirectionV312(e, dir, target, options = {}) {
    const tile = enemyTileV312(e);
    const nx = tile.x + dir.x;
    const ny = tile.y + dir.y;
    const distance = enemyDistanceToV312(nx, ny, target.x, target.y);
    const danger = enemyDangerV312(nx, ny) ? 1 : 0;
    const currentDir = e.ai.direction;
    const reverse = ENEMY_OPPOSITE_V312[currentDir] === dir.dir;
    const same = currentDir === dir.dir;

    let score = distance * 1.0;
    score += danger * 1000;
    score += reverse ? 8 : 0;
    score -= same ? 2.5 : 0;
    score += Math.random() * 1.4;
    if (options.patrol) score += Math.random() * 6;
    return score;
}

function enemyTargetForStateV312(e) {
    const ai = e.ai;
    if (ai.alert === 'flee') return { x: ai.lastSeenX, y: ai.lastSeenY };

    if (ai.seesPlayer) {
        if (e.type === ENEMY_TYPES.ESPECIAL) return enemyChooseSurroundTargetV312(e);
        return {
            x: Math.floor((player.x + player.width / 2) / TILE_SIZE),
            y: Math.floor((player.y + player.height / 2) / TILE_SIZE)
        };
    }

    if (ai.memoryTimer > 0 && ai.lastSeenX >= 0) {
        return { x: ai.lastSeenX, y: ai.lastSeenY };
    }

    if (ai.patrolX < 0 || ai.patrolY < 0) {
        const patrol = enemyChoosePatrolTargetV312(e);
        ai.patrolX = patrol.x;
        ai.patrolY = patrol.y;
    }
    return { x: ai.patrolX, y: ai.patrolY };
}

function enemyChooseDirectionAtIntersectionV312(e) {
    const ai = e.ai;
    const flee = enemyChooseFleeDirectionV312(e);
    if (ai.alert === 'flee' && flee) return flee;

    const possible = enemyAvailableDirectionsV312(e, true);
    if (!possible.length) return enemyAvailableDirectionsV312(e, false)[0] || enemyDirectionV312(ai.direction);

    const filtered = possible.length > 1
        ? possible.filter(dir => dir.dir !== ENEMY_OPPOSITE_V312[ai.direction])
        : possible;
    const options = filtered.length ? filtered : possible;
    const target = enemyTargetForStateV312(e);

    let best = options[0];
    let bestScore = Infinity;
    for (const dir of options) {
        const score = enemyScoreDirectionV312(e, dir, target, { patrol: !ai.seesPlayer && ai.memoryTimer <= 0 });
        if (score < bestScore) {
            bestScore = score;
            best = dir;
        }
    }
    return best;
}

function updateEnemyIntentV312(e, index, dt) {
    const ai = ensureEnemyMotionStateV312(e, index);
    ai.decisionTimer -= dt;
    ai.visionTimer -= dt;
    ai.memoryTimer = Math.max(0, ai.memoryTimer - dt);

    if (ai.visionTimer <= 0) {
        ai.visionTimer = enemyAI_V312.visionInterval;
        ai.seesPlayer = enemyCanSeePlayerV312(e);
        if (ai.seesPlayer) {
            ai.lastSeenX = Math.floor((player.x + player.width / 2) / TILE_SIZE);
            ai.lastSeenY = Math.floor((player.y + player.height / 2) / TILE_SIZE);
            ai.memoryTimer = enemyAI_V312.memoryMs;
        }
    }

    const tile = enemyTileV312(e);
    if (enemyDangerV312(tile.x, tile.y)) {
        ai.alert = 'flee';
        ai.behavior = 'flee';
    } else if (ai.seesPlayer || ai.memoryTimer > 0) {
        ai.alert = e.type === ENEMY_TYPES.ESPECIAL && ai.seesPlayer ? 'surround' : 'chase';
        ai.behavior = ai.alert;
    } else {
        ai.alert = 'patrol';
        ai.behavior = 'patrol';
    }

    if (ai.decisionTimer > 0 && !enemyIsNearCenterV312(e) && ai.alert !== 'flee') return;

    if (ai.decisionTimer <= 0 || enemyIsNearCenterV312(e) || ai.alert === 'flee') {
        if (ai.patrolX >= 0 && tile.x === ai.patrolX && tile.y === ai.patrolY) {
            ai.patrolX = -1;
            ai.patrolY = -1;
        }
        const chosen = enemyChooseDirectionAtIntersectionV312(e);
        ai.desiredDirection = chosen.dir;
        ai.decisionTimer = enemyAI_V312.decisionInterval + (index % 3) * 12;
    }
}

function applyEnemyDirectionAtCenterV312(e) {
    const ai = e.ai;
    const desired = enemyDirectionV312(ai.desiredDirection);
    if (!enemyIsNearCenterV312(e)) return false;

    const tile = enemyTileV312(e);
    const center = enemyCenterV312(tile.x, tile.y);
    if (Math.abs(e.x - center.x) <= enemyAI_V312.turnRadius && Math.abs(e.y - center.y) <= enemyAI_V312.turnRadius) {
        if (enemyDirectionPassableV312(e, desired, ai.alert !== 'flee')) {
            e.x = center.x;
            e.y = center.y;
            ai.direction = desired.dir;
            e.lastDirection = desired.dir;
            return true;
        }
    }
    return false;
}

function moveEnemyV312(e, dt) {
    const ai = e.ai;
    const speed = e.baseSpeed * (1 + gameState.threatLevel * 0.04);
    const dir = enemyDirectionV312(ai.direction);
    const scale = Math.min(dt / 16.6667, 2);
    const result = gridMoveCardinal(e, dir.x * speed * scale, dir.y * speed * scale, {
        kind: 'enemy',
        canFly: !!e.type.canFly,
        maxStep: 2.0,
        allowCurrentBombTile: true
    });

    if (result.moved) {
        ai.stuckTimer = Math.max(0, ai.stuckTimer - dt * 0.75);
        if (dir.x) e.vx = dir.x * speed, e.vy = 0;
        else e.vx = 0, e.vy = dir.y * speed;
        e.lastDirection = dir.dir;
    } else {
        e.vx = 0;
        e.vy = 0;
        ai.stuckTimer += dt;
        if (ai.stuckTimer >= enemyAI_V312.stuckMs) {
            ai.stuckTimer = 0;
            const tile = enemyTileV312(e);
            const center = enemyCenterV312(tile.x, tile.y);
            if (Math.abs(e.x - center.x) <= enemyAI_V312.turnRadius && Math.abs(e.y - center.y) <= enemyAI_V312.turnRadius) {
                e.x = center.x;
                e.y = center.y;
            }
            const fallback = enemyChooseDirectionAtIntersectionV312(e);
            ai.desiredDirection = fallback.dir;
            ai.direction = fallback.dir;
        }
    }

    if (enemyIsNearCenterV312(e)) applyEnemyDirectionAtCenterV312(e);
}

function updateEnemyAI(dt) {
    if (!gameState.isPlaying || gameState.paused) return;

    const roomKey = `${gameState.level}:${gameState.roomType.id}`;
    if (enemyAI_V312.roomKey !== roomKey) {
        enemyAI_V312.roomKey = roomKey;
        enemyAI_V312.dangerCooldown = 0;
        enemyAI_V312.dangerSignature = '';
        enemyAI_V312.danger.clear();
        enemyAI_V312.cursor = 0;
        for (let i = 0; i < gameState.enemies.length; i++) ensureEnemyMotionStateV312(gameState.enemies[i], i);
    }

    updateEnemyDangerV312(dt);

    const count = gameState.enemies.length;
    if (!count) return;

    // La intención se escalona para que una sala llena no concentre decisiones.
    for (let offset = 0; offset < count; offset++) {
        const i = (enemyAI_V312.cursor + offset) % count;
        const e = gameState.enemies[i];
        if (!e) continue;
        updateEnemyIntentV312(e, i, dt);
        moveEnemyV312(e, dt);
    }
    enemyAI_V312.cursor = (enemyAI_V312.cursor + 1) % count;
}

function drawEnemyAISignals() {
    if (!gameState.enemies.length) return;
    for (const e of gameState.enemies) {
        if (!e.ai || e.ai.alert === 'patrol') continue;
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
