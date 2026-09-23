// Bomberman Roguelike v3.16.8 — Enemy lane-lock update
// Navegación local tipo corredor/intersección: la IA decide una dirección
// y 13-collision.js se ocupa del movimiento y las paredes.

const enemyAI_V312 = {
    roomKey: '',
    dangerCooldown: 0,
    dangerSignature: '',
    danger: new Set(),
    visionInterval: 75,
    decisionInterval: 62,
    memoryMs: 900,
    turnRadius: 9,
    lookaheadTiles: 3,
    stuckMs: 180,
    physicalRecoveryMs: 220,
    cornerAssistSpeed: 1.15,
    recoveryPathNodes: 240,
    cursor: 0,
    decisionCursor: 0
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
    const bombSig = gameState.bombs.map(b => `${b.x},${b.y},${Math.floor(b.timer / 100)}`).join('|');
    const expSig = gameState.explosions.map(e => `${e.x},${e.y}`).join('|');
    const signature = `${bombSig}#${expSig}`;
    enemyAI_V312.dangerCooldown -= dt;
    if (signature !== enemyAI_V312.dangerSignature || enemyAI_V312.dangerCooldown <= 0) {
        enemyAI_V312.dangerSignature = signature;
        enemyAI_V312.dangerCooldown = 95;
        rebuildEnemyDangerV312();
    }
}

function ensureEnemyMotionStateV312(e, index) {
    if (!e.__gridAnchor) e.__gridAnchor = 'center';
    if (!e.ai) {
        e.ai = {
            behavior: 'patrol',
            alert: 'patrol',
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
            lastDecisionTileY: -1
        };
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

function enemyDirectionV312(dir) {
    return ENEMY_DIRS_V312.find(d => d.dir === dir) || ENEMY_DIRS_V312[1];
}

function enemyImmediateDirectionPassableV312(e, dir, avoidDanger = false, probe = 1.0) {
    if (!e || !dir) return false;
    const nx = e.x + dir.x * probe;
    const ny = e.y + dir.y * probe;
    return gridCanOccupy(e, nx, ny, {
        kind: 'enemy',
        canFly: !!e.type.canFly,
        avoidDanger,
        allowCurrentBombTile: true
    });
}

function enemyPhysicalDirectionChoicesV312(e, avoidDanger = false) {
    return ENEMY_DIRS_V312.filter(dir => enemyImmediateDirectionPassableV312(e, dir, avoidDanger));
}

function enemyRecoveryDirectionByPathV312(e) {
    if (!e || !gameState.grid?.length) return null;
    const start = enemyTileV312(e);
    const target = enemyTargetForStateV312(e);
    if (!target) return null;
    const tx = Math.max(0, Math.min(gameState.gridWidth - 1, Number(target.x) || 0));
    const ty = Math.max(0, Math.min(gameState.gridHeight - 1, Number(target.y) || 0));
    if (start.x === tx && start.y === ty) return null;

    const queue = [{ x: start.x, y: start.y }];
    let cursor = 0;
    const parent = new Map();
    const visited = new Set([`${start.x},${start.y}`]);
    const keyOf = (x, y) => `${x},${y}`;
    const avoidDanger = e.ai?.alert === 'flee';
    let found = null;

    while (cursor < queue.length && visited.size <= enemyAI_V312.recoveryPathNodes) {
        const current = queue[cursor++];
        if (current.x === tx && current.y === ty) {
            found = current;
            break;
        }

        for (const dir of ENEMY_DIRS_V312) {
            const nx = current.x + dir.x;
            const ny = current.y + dir.y;
            if (!gridIsInside(nx, ny)) continue;
            const key = keyOf(nx, ny);
            if (visited.has(key)) continue;
            const center = enemyCenterV312(nx, ny);
            if (!gridCanOccupy(e, center.x, center.y, {
                kind: 'enemy',
                canFly: !!e.type.canFly,
                avoidDanger,
                allowCurrentBombTile: true
            })) continue;
            visited.add(key);
            parent.set(key, current);
            queue.push({ x: nx, y: ny });
        }
    }

    if (!found) return null;

    let current = found;
    while (true) {
        const prev = parent.get(keyOf(current.x, current.y));
        if (!prev) return null;
        if (prev.x === start.x && prev.y === start.y) {
            return {
                dir: directionBetweenEnemyCellsV312(start, current),
                nodes: visited.size
            };
        }
        current = prev;
    }
}

function directionBetweenEnemyCellsV312(from, to) {
    if (to.x > from.x) return 'right';
    if (to.x < from.x) return 'left';
    if (to.y > from.y) return 'down';
    if (to.y < from.y) return 'up';
    return null;
}

function enemyCornerAssistV312(e, dir, dt, avoidDanger = false) {
    if (!e || !dir || !gameState.grid?.length) return false;
    const tile = enemyTileV312(e);
    const center = enemyCenterV312(tile.x, tile.y);
    // Solo corregimos el eje perpendicular al avance. Nunca movemos X e Y en
    // el mismo frame y no hacemos snap: es una asistencia gradual.
    const perpendicularAxis = dir.x !== 0 ? 'y' : 'x';
    const current = e[perpendicularAxis];
    const target = center[perpendicularAxis];
    const offset = target - current;
    const absOffset = Math.abs(offset);
    if (absOffset < 0.5 || absOffset > TILE_SIZE * 0.5) return false;

    const scale = Math.min(Math.max(dt / 16.6667, 0.5), 2);
    const amount = Math.min(absOffset, enemyAI_V312.cornerAssistSpeed * scale);
    const delta = Math.sign(offset) * amount;
    const nx = perpendicularAxis === 'x' ? e.x + delta : e.x;
    const ny = perpendicularAxis === 'y' ? e.y + delta : e.y;
    if (!gridCanOccupy(e, nx, ny, {
        kind: 'enemy',
        canFly: !!e.type.canFly,
        avoidDanger,
        allowCurrentBombTile: true
    })) return false;

    e[perpendicularAxis] = perpendicularAxis === 'x' ? nx : ny;
    return true;
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

function enemyPlayerTileV312() {
    return {
        x: Math.floor((player.x + player.width / 2) / TILE_SIZE),
        y: Math.floor((player.y + player.height / 2) / TILE_SIZE)
    };
}

function enemyProjectedTileV312(e, dir, steps = 1) {
    const start = enemyTileV312(e);
    return {
        x: start.x + dir.x * steps,
        y: start.y + dir.y * steps
    };
}

function enemyDirectionDangerDistanceV312(e, dir) {
    const start = enemyTileV312(e);
    let safeSteps = 0;
    for (let i = 1; i <= enemyAI_V312.lookaheadTiles; i++) {
        const tx = start.x + dir.x * i;
        const ty = start.y + dir.y * i;
        if (!gridIsInside(tx, ty)) break;
        if (enemyDangerV312(tx, ty)) break;
        if (!gridTileIsBlocked(tx, ty, { canFly: !!e.type.canFly })) safeSteps++;
        else break;
    }
    return safeSteps;
}

function enemyCountOpenNeighborsV312(e, x, y) {
    let count = 0;
    for (const dir of ENEMY_DIRS_V312) {
        const nx = x + dir.x;
        const ny = y + dir.y;
        if (!gridIsInside(nx, ny)) continue;
        const center = enemyCenterV312(nx, ny);
        if (gridCanOccupy(e, center.x, center.y, {
            kind: 'enemy',
            canFly: !!e.type.canFly,
            avoidDanger: false,
            allowCurrentBombTile: true
        })) count++;
    }
    return count;
}

function enemyChoosePatrolTargetV312(e) {
    const start = enemyTileV312(e);
    const candidates = [];
    for (let i = 0; i < 20; i++) {
        const x = 1 + Math.floor(Math.random() * Math.max(1, gameState.gridWidth - 2));
        const y = 1 + Math.floor(Math.random() * Math.max(1, gameState.gridHeight - 2));
        const center = enemyCenterV312(x, y);
        if (!gridCanOccupy(e, center.x, center.y, { kind: 'enemy', canFly: !!e.type.canFly, avoidDanger: true })) continue;
        const d = enemyDistanceToV312(x, y, start.x, start.y);
        const options = enemyCountOpenNeighborsV312(e, x, y);
        if (d >= 3 && options >= 2) candidates.push({ x, y, d, options });
    }

    candidates.sort((a, b) => {
        const sa = a.d + a.options * 0.9;
        const sb = b.d + b.options * 0.9;
        return sb - sa;
    });
    return candidates[0] || { x: start.x, y: start.y };
}

function enemyChooseSurroundTargetV312(e) {
    const pt = enemyPlayerTileV312();
    const candidates = [
        { x: pt.x + 1, y: pt.y, slot: 0 },
        { x: pt.x - 1, y: pt.y, slot: 1 },
        { x: pt.x, y: pt.y + 1, slot: 2 },
        { x: pt.x, y: pt.y - 1, slot: 3 }
    ];

    let best = null;
    const et = enemyTileV312(e);
    for (const c of candidates) {
        const center = enemyCenterV312(c.x, c.y);
        if (!gridCanOccupy(e, center.x, center.y, { kind: 'enemy', canFly: !!e.type.canFly, avoidDanger: true })) continue;
        const distance = enemyDistanceToV312(c.x, c.y, et.x, et.y);
        const slotPenalty = c.slot === e.ai.slot ? 0 : 0.45;
        const playerEdgePenalty = c.x === et.x && c.y === et.y ? 100 : 0;
        const score = distance + slotPenalty + playerEdgePenalty;
        if (!best || score < best.score) best = { x: c.x, y: c.y, score };
    }
    return best || { x: pt.x, y: pt.y, score: 0 };
}

function enemyDirectionScoreV312(e, dir, target, options = {}) {
    const next = enemyProjectedTileV312(e, dir, 1);
    const next2 = enemyProjectedTileV312(e, dir, 2);
    const currentDir = e.ai.direction;
    const reverse = ENEMY_OPPOSITE_V312[currentDir] === dir.dir;
    const same = currentDir === dir.dir;
    const danger = enemyDangerV312(next.x, next.y) ? 1 : 0;
    const danger2 = enemyDangerV312(next2.x, next2.y) ? 1 : 0;
    const distance = enemyDistanceToV312(next.x, next.y, target.x, target.y);
    const distance2 = enemyDistanceToV312(next2.x, next2.y, target.x, target.y);
    const openAhead = enemyDirectionDangerDistanceV312(e, dir);

    let score = distance * 2.0 + distance2 * 0.55;
    score += danger * 2500 + danger2 * 750;
    score -= same ? 2.8 : 0;
    score += reverse ? (options.allowReverse ? 3 : 24) : 0;
    score -= openAhead * 0.7;

    if (options.patrol) score += Math.random() * 3.2;
    if (options.urgent) score += reverse ? 4 : 0;
    return score;
}

function enemyChooseFleeDirectionV312(e) {
    const possible = enemyAvailableDirectionsV312(e, true);
    if (!possible.length) return null;

    const tile = enemyTileV312(e);
    let best = null;
    for (const dir of possible) {
        const next = enemyProjectedTileV312(e, dir, 1);
        const next2 = enemyProjectedTileV312(e, dir, 2);
        const dangerNow = enemyDangerV312(next.x, next.y) ? 1 : 0;
        const dangerSoon = enemyDangerV312(next2.x, next2.y) ? 1 : 0;
        const safety = enemyDirectionDangerDistanceV312(e, dir);
        const playerTile = enemyPlayerTileV312();
        const awayFromPlayer = enemyDistanceToV312(next.x, next.y, playerTile.x, playerTile.y);
        const reverse = ENEMY_OPPOSITE_V312[e.ai.direction] === dir.dir;
        const same = e.ai.direction === dir.dir;
        const score = dangerNow * 4000 + dangerSoon * 1200 - safety * 30 - awayFromPlayer * 1.8 + (reverse ? 2 : 0) - (same ? 2 : 0);
        if (!best || score < best.score) best = { dir, score, tile };
    }
    return best ? best.dir : null;
}

function enemyTargetForStateV312(e) {
    const ai = e.ai;
    const playerTile = enemyPlayerTileV312();

    if (ai.alert === 'flee') {
        return {
            x: playerTile.x + (playerTile.x >= enemyTileV312(e).x ? -4 : 4),
            y: playerTile.y + (playerTile.y >= enemyTileV312(e).y ? -4 : 4)
        };
    }

    if (ai.seesPlayer) {
        if (e.type === ENEMY_TYPES.ESPECIAL) {
            if (ai.surroundTimer <= 0 || ai.surroundX < 0 || ai.surroundY < 0) {
                const surround = enemyChooseSurroundTargetV312(e);
                ai.surroundX = surround.x;
                ai.surroundY = surround.y;
                ai.surroundTimer = 320;
            }
            return { x: ai.surroundX, y: ai.surroundY };
        }

        // En corredores rectos, perseguir la celda del jugador es más importante
        // que cualquier preferencia de patrulla.
        return playerTile;
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
    const dangerHere = enemyDangerV312(enemyTileV312(e).x, enemyTileV312(e).y);
    const physicalChoices = enemyPhysicalDirectionChoicesV312(e, ai.alert === 'flee');
    const possible = ai.physicalBlocked && physicalChoices.length ? physicalChoices : enemyAvailableDirectionsV312(e, false);
    if (!possible.length) return null;

    // Recuperación excepcional: solo ante bloqueo físico/stuck usamos una ruta
    // limitada para salir de la esquina. La IA normal sigue siendo local.
    if (ai.physicalBlocked || Number(ai.blockedTimer || 0) > 0 || Number(ai.stuckTimer || 0) > 0) {
        const recovery = enemyRecoveryDirectionByPathV312(e);
        if (recovery?.dir) {
            ai.lastRecoveryPathNodes = recovery.nodes;
            const recoveryDir = enemyDirectionV312(recovery.dir);
            if (physicalChoices.some(dir => dir.dir === recovery.dir) && enemyImmediateDirectionPassableV312(e, recoveryDir, ai.alert === 'flee', 0.75)) {
                return recoveryDir;
            }
        }
    }

    if (dangerHere || ai.alert === 'flee') {
        return enemyChooseFleeDirectionV312(e) || possible[0];
    }

    const filtered = possible.length > 1
        ? possible.filter(dir => dir.dir !== ENEMY_OPPOSITE_V312[ai.direction])
        : possible;
    let options = filtered.length ? filtered : possible;
    if (ai.physicalBlocked && options.length > 1) {
        const nonCurrent = options.filter(dir => dir.dir !== ai.direction);
        if (nonCurrent.length) options = nonCurrent;
    }

    // Si el jugador está directamente en el mismo corredor, la respuesta es inmediata.
    if (ai.seesPlayer) {
        const pt = enemyPlayerTileV312();
        const et = enemyTileV312(e);
        if (pt.x === et.x) {
            const wanted = pt.y < et.y ? 'up' : pt.y > et.y ? 'down' : null;
            const direct = options.find(dir => dir.dir === wanted);
            if (direct) return direct;
        }
        if (pt.y === et.y) {
            const wanted = pt.x < et.x ? 'left' : pt.x > et.x ? 'right' : null;
            const direct = options.find(dir => dir.dir === wanted);
            if (direct) return direct;
        }
    }

    const target = enemyTargetForStateV312(e);
    let best = options[0];
    let bestScore = Infinity;
    for (const dir of options) {
        const score = enemyDirectionScoreV312(e, dir, target, {
            patrol: !ai.seesPlayer && ai.memoryTimer <= 0,
            urgent: ai.alert === 'chase' || ai.alert === 'surround'
        });
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
    const dangerHere = enemyDangerV312(tile.x, tile.y);
    const imminentDanger = enemyAvailableDirectionsV312(e, false).some(dir => {
        const next = enemyProjectedTileV312(e, dir, 1);
        return enemyDangerV312(next.x, next.y);
    });

    if (dangerHere || imminentDanger) {
        ai.alert = 'flee';
        ai.behavior = 'flee';
    } else if (ai.seesPlayer || ai.memoryTimer > 0) {
        ai.alert = e.type === ENEMY_TYPES.ESPECIAL && ai.seesPlayer ? 'surround' : 'chase';
        ai.behavior = ai.alert;
    } else {
        ai.alert = 'patrol';
        ai.behavior = 'patrol';
    }

    const currentDir = enemyDirectionV312(ai.direction);
    const currentPassable = enemyDirectionPassableV312(e, currentDir, ai.alert === 'flee');
    const atCenterRaw = enemyIsNearCenterV312(e);
    // Durante una recuperación física no tratamos la cercanía al centro como
    // una intersección normal: primero dejamos terminar la corrección lateral.
    const atCenter = atCenterRaw && !(ai.physicalBlocked && ai.physicalBlockedTimer < enemyAI_V312.physicalRecoveryMs);

    // La rejilla sirve para anticipar paredes. El bloqueo físico se confirma
    // solamente después de que gridMoveCardinal() falle con el hitbox real.
    // Así la IA puede corregir la alineación lateral antes de abandonar la ruta.
    if (!currentPassable) ai.blockedTimer += dt;
    else ai.blockedTimer = 0;

    const shouldDecide = atCenter || !currentPassable || ai.physicalBlockedTimer >= enemyAI_V312.physicalRecoveryMs || ai.decisionTimer <= 0 || ai.alert === 'flee';
    if (!shouldDecide) return;

    if (ai.patrolX >= 0 && tile.x === ai.patrolX && tile.y === ai.patrolY && ai.alert === 'patrol') {
        ai.patrolX = -1;
        ai.patrolY = -1;
    }

    const chosen = enemyChooseDirectionAtIntersectionV312(e);
    if (!chosen) return;

    ai.desiredDirection = chosen.dir;
    ai.decisionTimer = enemyAI_V312.decisionInterval + (index % 3) * 10;
    if (ai.physicalBlockedTimer > 0) {
        ai.physicalBlocked = true;
        if (chosen.dir !== currentDir.dir && enemyImmediateDirectionPassableV312(e, chosen, ai.alert === 'flee', 0.75)) {
            ai.direction = chosen.dir;
            e.lastDirection = chosen.dir;
            ai.recoveryCount += 1;
            ai.lastRecoveryReason = ai.lastRecoveryPathNodes > 0 ? 'replan-ruta' : 'bloqueo-fisico';
            ai.blockedTimer = 0;
            ai.physicalBlockedTimer = 0;
            ai.physicalBlocked = false;
        }
    }
    ai.lastDecisionTileX = tile.x;
    ai.lastDecisionTileY = tile.y;

    if (!currentPassable || ai.alert === 'flee') {
        ai.direction = chosen.dir;
        e.lastDirection = chosen.dir;
        ai.blockedTimer = 0;
    }

    if (typeof debugRecordEvent === 'function' && (ai.alert !== 'patrol' || chosen.dir !== currentDir.dir || ai.lastRecoveryReason)) {
        debugRecordEvent('AI', `Enemy ${index} · ${ai.alert} · ${currentDir.dir || '?'} → ${chosen.dir}`, {
            index, behavior: ai.behavior, alert: ai.alert, desired: chosen.dir, tile,
            physicalBlocked: !!ai.physicalBlocked, physicalBlockedMs: Number(ai.physicalBlockedTimer.toFixed(1)),
            recoveryCount: Number(ai.recoveryCount || 0), recoveryReason: ai.lastRecoveryReason || '—', recoveryPathNodes: Number(ai.lastRecoveryPathNodes || 0)
        });
        ai.lastRecoveryReason = '';
        ai.lastRecoveryPathNodes = 0;
    }
}

function applyEnemyDirectionAtCenterV312(e) {
    const ai = e.ai;
    const desired = enemyDirectionV312(ai.desiredDirection);

    // FIX v3.12.2: no volver a centrar al enemigo mientras sigue avanzando en
    // la misma dirección. Antes, cada frame dentro del radio de 9 px hacía
    // `snap -> avanzar -> snap -> avanzar`, produciendo el temblor en el lugar.
    // El centrado solo debe ocurrir cuando realmente hay un giro pendiente.
    const wantsTurn = desired.dir !== ai.direction;
    if (!wantsTurn || !enemyIsNearCenterV312(e)) return false;

    const tile = enemyTileV312(e);
    const center = enemyCenterV312(tile.x, tile.y);
    if (Math.abs(e.x - center.x) <= enemyAI_V312.turnRadius && Math.abs(e.y - center.y) <= enemyAI_V312.turnRadius) {
        if (enemyDirectionPassableV312(e, desired, ai.alert === 'flee')) {
            e.x = center.x;
            e.y = center.y;
            ai.direction = desired.dir;
            e.lastDirection = desired.dir;
            ai.blockedTimer = 0;
            return true;
        }

        // Desired direction quedó obstruida: elegir otra antes de que la entidad
        // vuelva a salir del centro de la intersección.
        const fallback = enemyChooseDirectionAtIntersectionV312(e);
        if (fallback && enemyDirectionPassableV312(e, fallback, ai.alert === 'flee')) {
            ai.direction = fallback.dir;
            ai.desiredDirection = fallback.dir;
            e.lastDirection = fallback.dir;
            ai.blockedTimer = 0;
            return true;
        }
    }
    return false;
}

function moveEnemyV312(e, dt) {
    const ai = e.ai;
    const speed = e.baseSpeed * (1 + gameState.threatLevel * 0.04);
    const scale = Math.min(dt / 16.6667, 2);

    // La dirección solicitada se aplica en un centro de celda, como en un juego
    // de laberinto: no se corta una esquina y no se cambia X/Y a la vez.
    if (enemyIsNearCenterV312(e)) applyEnemyDirectionAtCenterV312(e);

    let dir = enemyDirectionV312(ai.direction);
    const result = gridMoveCardinal(e, dir.x * speed * scale, dir.y * speed * scale, {
        kind: 'enemy',
        canFly: !!e.type.canFly,
        maxStep: 2.0,
        laneLock: true,
        laneTolerance: 2.0,
        laneCorrectionStep: 1.8,
        allowCurrentBombTile: true
    });

    if (result.laneCorrected && !result.blocked) {
        // La corrección de carril es un movimiento cardinal de alineación; no
        // contamos ese frame como avance en la dirección anterior. Esto evita
        // que el diagnóstico confunda "se está corrigiendo" con "está atascado".
        e.vx = 0;
        e.vy = 0;
        ai.lastX = e.x;
        ai.lastY = e.y;
        return;
    }

    if (result.moved) {
        ai.stuckTimer = 0;
        ai.physicalBlockedTimer = 0;
        ai.physicalBlocked = false;
        ai.lastX = e.x;
        ai.lastY = e.y;
        if (dir.x) e.vx = dir.x * speed, e.vy = 0;
        else e.vx = 0, e.vy = dir.y * speed;
        e.lastDirection = dir.dir;
        return;
    }

    e.vx = 0;
    e.vy = 0;
    ai.stuckTimer += dt;
    ai.physicalBlocked = true;
    ai.physicalBlockedTimer += dt;

    // Primero corregimos la alineación lateral de forma gradual. No hace snap
    // ni movimiento diagonal: solo desplaza el eje perpendicular del corredor.
    if (ai.physicalBlockedTimer <= enemyAI_V312.physicalRecoveryMs) {
        if (enemyCornerAssistV312(e, dir, dt, ai.alert === 'flee')) {
            ai.cornerCorrectionMs += dt;
            ai.lastRecoveryReason = 'asistencia-esquina';
            return;
        }
    }

    // Si el corredor sigue bloqueado, hacemos una decisión de recuperación
    // basada en la posición física actual, no en la presencia del jugador.
    if (ai.physicalBlockedTimer >= enemyAI_V312.physicalRecoveryMs || ai.stuckTimer >= enemyAI_V312.stuckMs || ai.blockedTimer >= 50) {
        ai.stuckTimer = 0;
        ai.blockedTimer = 0;
        const fallback = enemyChooseDirectionAtIntersectionV312(e);
        if (fallback && enemyImmediateDirectionPassableV312(e, fallback, ai.alert === 'flee', 0.75)) {
            ai.desiredDirection = fallback.dir;
            ai.direction = fallback.dir;
            e.lastDirection = fallback.dir;
            ai.recoveryCount += 1;
            ai.lastRecoveryReason = ai.lastRecoveryPathNodes > 0 ? 'replan-ruta' : 'replan-fisico';
            ai.physicalBlockedTimer = 0;
            ai.physicalBlocked = false;
        }
    }
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
