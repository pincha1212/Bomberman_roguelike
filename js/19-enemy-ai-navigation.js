// BOMBERMAN ROGUELIKE v6.31.6 — Navegación y elección de rutas de la IA enemiga.
// Extracción mecánica desde js/19-enemy-ai.js; las implementaciones se conservan.

function enemyRecoveryDirectionByPathV312(e) {
    if (!e || !gameState.grid?.length) return null;
    e.ai = e.ai || {};
    e.ai.recoveryPathCalls = Number(e.ai.recoveryPathCalls || 0) + 1;
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
                ignoreBombs: typeof enemyIgnoresBombsV630 === 'function' && enemyIgnoresBombsV630(e),
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

function enemyDirectionPassableV312(e, dir, avoidDanger = false) {
    const tile = enemyTileV312(e);
    const next = { x: tile.x + dir.x, y: tile.y + dir.y };
    if (!gridIsInside(next.x, next.y)) return false;
    const center = enemyCenterV312(next.x, next.y);
    return gridCanOccupy(e, center.x, center.y, {
        kind: 'enemy',
        canFly: !!e.type.canFly,
        ignoreBombs: typeof enemyIgnoresBombsV630 === 'function' && enemyIgnoresBombsV630(e),
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
        if (enemyDangerV312(tx, ty, e)) break;
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
            ignoreBombs: typeof enemyIgnoresBombsV630 === 'function' && enemyIgnoresBombsV630(e),
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
        if (!gridCanOccupy(e, center.x, center.y, { kind: 'enemy', canFly: !!e.type.canFly,
            ignoreBombs: typeof enemyIgnoresBombsV630 === 'function' && enemyIgnoresBombsV630(e), avoidDanger: true })) continue;
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
        if (!gridCanOccupy(e, center.x, center.y, { kind: 'enemy', canFly: !!e.type.canFly,
            ignoreBombs: typeof enemyIgnoresBombsV630 === 'function' && enemyIgnoresBombsV630(e), avoidDanger: true })) continue;
        const distance = enemyDistanceToV312(c.x, c.y, et.x, et.y);
        const slotPenalty = c.slot === e.ai.slot ? 0 : 0.45;
        const playerEdgePenalty = c.x === et.x && c.y === et.y ? 100 : 0;
        const score = distance + slotPenalty + playerEdgePenalty;
        if (!best || score < best.score) best = { x: c.x, y: c.y, score };
    }
    return best || { x: pt.x, y: pt.y, score: 0 };
}


function enemyRecentNavigationPenaltyV321(e, key, options = {}) {
    const recent = e?.ai?.recentTileKeys;
    if (!Array.isArray(recent) || !recent.length) return 0;
    const index = recent.lastIndexOf(key);
    if (index < 0) return 0;
    const age = recent.length - 1 - index;
    const recencyWeight = Math.max(1, enemyAI_V312.navigationMemoryTiles - age);
    let penalty = recencyWeight * enemyAI_V312.recentTilePenalty;
    if (age <= 1) penalty += enemyAI_V312.repeatedTilePenalty;
    if (options.recovery) penalty *= 0.15;
    if (options.flee) penalty *= 0.35;
    return penalty;
}

function enemyNavigationLoopRiskV321(e, dir) {
    const next = enemyProjectedTileV312(e, dir, 1);
    const key = enemyTileKeyV312(next.x, next.y);
    const recent = e?.ai?.recentTileKeys || [];
    if (recent.length < 2) return 0;
    if (recent[recent.length - 2] === key) return 1;
    if (recent.length >= 3 && recent[recent.length - 3] === key) return 0.7;
    return 0;
}

function enemyLocalBranchScoreV321(e, dir) {
    const next = enemyProjectedTileV312(e, dir, 1);
    if (!gridIsInside(next.x, next.y)) return -2;
    // Solo necesitamos conectividad estática aquí. Evitar gridCanOccupy() y su
    // geometría de hitbox reduce el coste de puntuar hasta cuatro candidatos.
    let exits = 0;
    for (const probe of ENEMY_DIRS_V312) {
        const x = next.x + probe.x;
        const y = next.y + probe.y;
        if (!gridIsInside(x, y)) continue;
        if (!gridTileIsBlocked(x, y, { canFly: !!e.type.canFly })) exits += 1;
    }
    return exits;
}

function enemyDirectionScoreV312(e, dir, target, options = {}) {
    const next = enemyProjectedTileV312(e, dir, 1);
    const next2 = enemyProjectedTileV312(e, dir, 2);
    const currentDir = e.ai.direction;
    const reverse = ENEMY_OPPOSITE_V312[currentDir] === dir.dir;
    const same = currentDir === dir.dir;
    const danger = enemyDangerV312(next.x, next.y, e) ? 1 : 0;
    const danger2 = enemyDangerV312(next2.x, next2.y, e) ? 1 : 0;
    const distance = enemyDistanceToV312(next.x, next.y, target.x, target.y);
    const distance2 = enemyDistanceToV312(next2.x, next2.y, target.x, target.y);
    const openAhead = enemyDirectionDangerDistanceV312(e, dir);
    const branchScore = options.patrol ? enemyLocalBranchScoreV321(e, dir) : 0;
    const recentPenalty = enemyRecentNavigationPenaltyV321(e, enemyTileKeyV312(next.x, next.y), {
        recovery: !!options.recovery,
        flee: !!options.flee
    });
    const loopRisk = enemyNavigationLoopRiskV321(e, dir);

    const profile = enemyBehaviorProfileV324(e);
    const sameBonus = Number(profile.sameDirectionBonus ?? 2.8);
    const distanceWeight = Number(profile.distanceWeight ?? 2.0);
    const lookaheadWeight = Number(profile.distanceLookaheadWeight ?? 0.55);
    const reversePenalty = Number(profile.reversePenalty ?? 24);
    const branchWeight = Number(profile.branchPreference ?? enemyAI_V312.branchPreference);
    const recentWeight = Number(profile.recentPenalty ?? 1.8);
    const loopWeight = Number(profile.loopPenalty ?? 1.2);

    let score = distance * distanceWeight + distance2 * lookaheadWeight;
    score += danger * 2500 + danger2 * 750;
    score -= same ? sameBonus : 0;
    if (same && !reverse) score -= sameBonus * 0.45;
    score += reverse ? (options.allowReverse ? Math.min(8, reversePenalty * 0.18) : reversePenalty) : 0;
    score -= openAhead * 0.7;
    score -= branchScore * branchWeight * (options.patrol ? 1.0 : 0.35);
    score += recentPenalty * (recentWeight / Math.max(1, enemyAI_V312.recentTilePenalty));
    score += loopRisk * loopWeight;

    if (options.patrol) {
        // v3.19: ruido determinista. Evita que la misma intersección produzca
        // giros distintos en cada decisión solo por un random nuevo.
        const slot = Number(e.ai?.slot || 0);
        const seed = Math.abs(slot * 17 + next.x * 31 + next.y * 47) % 17;
        score += seed * 0.12;
    }
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
        const dangerNow = enemyDangerV312(next.x, next.y, e) ? 1 : 0;
        const dangerSoon = enemyDangerV312(next2.x, next2.y, e) ? 1 : 0;
        const safety = enemyDirectionDangerDistanceV312(e, dir);
        const playerTile = enemyPlayerTileV312();
        const awayFromPlayer = enemyDistanceToV312(next.x, next.y, playerTile.x, playerTile.y);
        const reverse = ENEMY_OPPOSITE_V312[e.ai.direction] === dir.dir;
        const same = e.ai.direction === dir.dir;
        const profile = enemyBehaviorProfileV324(e);
        const awayWeight = profile.id === 'evasive' ? 3.2 : profile.id === 'flyer' ? 1.6 : 1.8;
        const score = dangerNow * 4000 + dangerSoon * 1200 - safety * (profile.id === 'evasive' ? 34 : 30) - awayFromPlayer * awayWeight + (reverse ? 2 : 0) - (same ? 2 : 0);
        if (!best || score < best.score) best = { dir, score, tile };
    }
    return best ? best.dir : null;
}

function enemyTargetForStateV312(e) {
    const ai = e.ai;
    const playerTile = enemyPlayerTileV312();
    const profile = enemyBehaviorProfileV324(e);

    if (ai.alert === 'flee') {
        return {
            x: playerTile.x + (playerTile.x >= enemyTileV312(e).x ? -4 : 4),
            y: playerTile.y + (playerTile.y >= enemyTileV312(e).y ? -4 : 4)
        };
    }

    if (profile.id === 'patroller' && ai.alert === 'patrol') {
        if (ai.patrolX < 0 || ai.patrolY < 0) {
            const patrol = enemyChoosePatrolTargetV312(e);
            ai.patrolX = patrol.x;
            ai.patrolY = patrol.y;
        }
        return { x: ai.patrolX, y: ai.patrolY };
    }

    if (ai.seesPlayer) {
        if (profile.id === 'evasive') {
            return { x: playerTile.x + (playerTile.x >= enemyTileV312(e).x ? -4 : 4), y: playerTile.y + (playerTile.y >= enemyTileV312(e).y ? -4 : 4) };
        }
        if (profile.id === 'aggressive' || profile.id === 'flyer') return playerTile;
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

function enemyIsIntersectionNodeV319(e, possible, currentDir) {
    if (!e || !possible?.length) return false;
    if (possible.length >= 3) return true;
    // Esquina: continuar recto deja de ser posible; el giro sí es una decisión real.
    if (!currentDir) return true;
    const hasCurrent = possible.some(dir => dir.dir === currentDir.dir);
    if (!hasCurrent) return true;
    return possible.some(dir => dir.dir !== currentDir.dir && dir.dir !== ENEMY_OPPOSITE_V312[currentDir.dir]);
}

function enemyChooseLocalRecoveryDirectionV319(e) {
    const ai = e.ai;
    ai.lastRecoveryPathNodes = 0;
    const avoidDanger = ai.alert === 'flee';
    const physical = enemyPhysicalDirectionChoicesV312(e, avoidDanger);
    if (!physical.length) return null;

    const current = enemyDirectionV312(ai.direction);
    const blockedDirection = ai.blockedDirection || current.dir;
    const target = enemyTargetForStateV312(e) || enemyPlayerTileV312();

    // v3.24.1: no permitir que el recovery vuelva a elegir la dirección que
    // acaba de quedar físicamente bloqueada. Además exigimos una pequeña holgura
    // física, no solo un probe de 1 px, para evitar falsos positivos en esquinas.
    const executable = physical.filter(dir =>
        dir.dir !== blockedDirection &&
        enemyImmediateDirectionPassableV312(e, dir, avoidDanger, 2.0)
    );
    if (!executable.length) return null;

    const alternatives = executable.filter(dir => dir.dir !== current.dir && dir.dir !== ENEMY_OPPOSITE_V312[current.dir]);
    const options = alternatives.length
        ? alternatives
        : executable.filter(dir => dir.dir !== current.dir);
    if (!options.length) return null;

    let best = null;
    for (const dir of options) {
        const score = enemyDirectionScoreV312(e, dir, target, { allowReverse: true, urgent: true, recovery: true, flee: avoidDanger });
        if (!best || score < best.score) best = { dir, score };
    }
    return best?.dir || null;
}

function enemyChooseDirectionAtIntersectionV312(e) {
    const ai = e.ai;
    const profile = enemyBehaviorProfileV324(e);
    const tile = enemyTileV312(e);
    const dangerHere = enemyDangerV312(tile.x, tile.y, e);
    const physicalChoices = enemyPhysicalDirectionChoicesV312(e, ai.alert === 'flee');
    const possible = physicalChoices.length && ai.physicalBlocked
        ? physicalChoices
        : enemyAvailableDirectionsV312(e, false);
    if (!possible.length) return null;

    const currentDir = enemyDirectionV312(ai.direction);
    const currentPassable = possible.some(dir => dir.dir === currentDir.dir);
    const exceptionalRecovery =
        Number(ai.physicalBlockedTimer || 0) >= enemyAI_V312.recoveryTriggerMs ||
        Number(ai.stuckTimer || 0) >= enemyAI_V312.stuckMs ||
        Number(ai.blockedDirectionFrames || 0) >= enemyAI_V312.repeatedBlockTriggerFrames;

    const repeatedSameBlock =
        !!ai.blockedDirection &&
        ai.blockedDirection === currentDir.dir &&
        Number(ai.blockedDirectionFrames || 0) >= enemyAI_V312.repeatedBlockTriggerFrames;

    // v3.24.1: si el mismo vector ya falló suficientes veces, forzar una salida
    // local distinta antes de permitir que el scoring normal lo vuelva a escoger.
    if (repeatedSameBlock) {
        const forcedRecovery = enemyChooseLocalRecoveryDirectionV319(e);
        if (forcedRecovery) return forcedRecovery;
    }

    // v3.19: recovery local primero. BFS queda reservado para un bloqueo físico
    // persistente donde las alternativas inmediatas no permiten salir.
    if (exceptionalRecovery) {
        const localRecovery = enemyChooseLocalRecoveryDirectionV319(e);
        if (localRecovery) return localRecovery;

        if (ai.recoveryCooldownTimer <= 0) {
            const recovery = enemyRecoveryDirectionByPathV312(e);
            if (recovery?.dir && recovery.dir !== ai.blockedDirection && recovery.dir !== currentDir.dir) {
                ai.lastRecoveryPathNodes = recovery.nodes;
                ai.recoveryCooldownTimer = enemyAI_V312.recoveryCooldownMs;
                const recoveryDir = enemyDirectionV312(recovery.dir);
                if (enemyImmediateDirectionPassableV312(e, recoveryDir, ai.alert === 'flee', 2.0)) {
                    return recoveryDir;
                }
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

    // v3.21: durante el mismo nodo no encadenar un segundo giro salvo peligro
    // o bloqueo. Evita secuencias como RIGHT→UP→LEFT dentro de la misma zona.
    const currentTileKey = enemyTileKeyV312(tile.x, tile.y);
    const sameTurnNode = ai.lastTurnAtTileKey === currentTileKey;
    if (sameTurnNode && currentPassable && !dangerHere && ai.alert !== 'flee' && options.length > 1) {
        const committed = options.filter(dir => dir.dir === ai.direction);
        if (committed.length) options = committed;
    }

    // Prioridad estable de persecución: si el jugador está en el mismo
    // corredor y el giro requerido está disponible, no dejamos que el
    // scoring general lo reemplace por una dirección lateral equivalente.
    if (ai.seesPlayer && ['chaser','aggressive','flyer'].includes(profile.id)) {
        const pt = enemyPlayerTileV312();
        const et = enemyTileV312(e);
        if (pt.x === et.x) {
            const wanted = pt.y < et.y ? 'up' : pt.y > et.y ? 'down' : null;
            const direct = options.find(dir => dir.dir === wanted);
            if (direct && !(Number(ai.turnLockTimer || 0) > 0 && currentPassable && direct.dir !== currentDir.dir)) return direct;
        }
        if (pt.y === et.y) {
            const wanted = pt.x < et.x ? 'left' : pt.x > et.x ? 'right' : null;
            const direct = options.find(dir => dir.dir === wanted);
            if (direct && !(Number(ai.turnLockTimer || 0) > 0 && currentPassable && direct.dir !== currentDir.dir)) return direct;
        }
    }

    const atNode = enemyIsIntersectionNodeV319(e, options, currentDir);
    const target = enemyTargetForStateV312(e);
    let best = options[0];
    let bestScore = Infinity;
    for (const dir of options) {
        const score = enemyDirectionScoreV312(e, dir, target, {
            patrol: profile.id === 'patroller' && ai.alert === 'patrol',
            urgent: ai.alert === 'chase' || ai.alert === 'aggressive' || ai.alert === 'surround',
            recovery: exceptionalRecovery,
            flee: ai.alert === 'flee'
        });
        if (score < bestScore) {
            bestScore = score;
            best = dir;
        }
    }

    // v3.19: mantener dirección si sigue siendo válida. Un giro solo se acepta
    // cuando mejora de forma suficiente la puntuación o existe peligro real.
    if (currentPassable && best.dir !== currentDir.dir && atNode) {
        const currentScore = enemyDirectionScoreV312(e, currentDir, target, {
            patrol: profile.id === 'patroller' && ai.alert === 'patrol',
            urgent: ai.alert === 'chase' || ai.alert === 'aggressive' || ai.alert === 'surround',
            recovery: false,
            flee: ai.alert === 'flee'
        });
        const turnLocked = Number(ai.turnLockTimer || 0) > 0;
        const materiallyBetter = bestScore + enemyAI_V312.turnHysteresis < currentScore;
        if (turnLocked || !materiallyBetter) return currentDir;
    }

    // Fuera de una intersección/esquina real, no fabricamos giros.
    if (currentPassable && best.dir !== currentDir.dir && !atNode) return currentDir;

    return best;
}
