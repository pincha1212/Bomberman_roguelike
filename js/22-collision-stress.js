// Bomberman Roguelike v3.20.0 — Robust Collision Stress Test
// Testes automáticos contra la fuente real de colisión. No implementa una
// segunda física: solo crea escenas sintéticas y llama a gridMoveCardinal().
(() => {
    'use strict';

    const TEST_NAME = 'collision-stress';
    const STEP = 16.6667;
    const MAX_CASES = 6;
    let aggregateStats = null;

    const getState = () => window.BOMBER_ENGINE?.getState?.() || null;
    const enemyCenter = (x, y) => ({ x: x * TILE_SIZE + TILE_SIZE / 2, y: y * TILE_SIZE + TILE_SIZE / 2 });

    function makeEnemy(cell, offsetX = 0, offsetY = 0) {
        const c = enemyCenter(cell.x, cell.y);
        return {
            x: c.x + offsetX,
            y: c.y + offsetY,
            width: TILE_SIZE * 0.75,
            height: TILE_SIZE * 0.75,
            type: ENEMY_TYPES.RASTRERO,
            vx: 0,
            vy: 0,
            baseSpeed: 1.4,
            lastDirection: 'right',
            desiredDirection: 'right',
            __gridAnchor: 'center'
        };
    }

    function makeBaseGrid(width = 9, height = 9) {
        const grid = Array.from({ length: height }, () => Array(width).fill(TYPES.EMPTY));
        for (let y = 0; y < height; y++) {
            grid[y][0] = TYPES.WALL;
            grid[y][width - 1] = TYPES.WALL;
        }
        for (let x = 0; x < width; x++) {
            grid[0][x] = TYPES.WALL;
            grid[height - 1][x] = TYPES.WALL;
        }
        return grid;
    }

    function withCollisionScene(fn) {
        const state = getState();
        if (!state) throw new Error('gameState no disponible.');

        const backup = {
            grid: state.grid,
            gridWidth: state.gridWidth,
            gridHeight: state.gridHeight,
            bombs: state.bombs,
            explosions: state.explosions,
            enemies: state.enemies
        };

        try {
            state.gridWidth = 9;
            state.gridHeight = 9;
            state.grid = makeBaseGrid();
            state.bombs = [];
            state.explosions = [];
            state.enemies = [];
            window.GRID_COLLISION_V320?.reset?.();
            const result = fn(state);
            const snapshot = window.GRID_COLLISION_V320?.snapshot?.() || {};
            if (aggregateStats) {
                const maxKeys = new Set(['maxLaneCorrectionPx']);
                for (const key of Object.keys(snapshot)) {
                    const value = Number(snapshot[key] || 0);
                    aggregateStats[key] = maxKeys.has(key)
                        ? Math.max(Number(aggregateStats[key] || 0), value)
                        : (Number(aggregateStats[key] || 0) + value);
                }
            }
            return result;
        } finally {
            state.grid = backup.grid;
            state.gridWidth = backup.gridWidth;
            state.gridHeight = backup.gridHeight;
            state.bombs = backup.bombs;
            state.explosions = backup.explosions;
            state.enemies = backup.enemies;
            window.GRID_COLLISION_V320?.reset?.();
        }
    }

    function assertCardinalDelta(before, after, label) {
        const dx = after.x - before.x;
        const dy = after.y - before.y;
        if (Math.abs(dx) > 0.0001 && Math.abs(dy) > 0.0001) {
            throw new Error(`${label}: desplazamiento diagonal detectado (${dx.toFixed(3)}, ${dy.toFixed(3)}).`);
        }
        return { dx, dy };
    }

    function caseCorner() {
        return withCollisionScene(state => {
            state.grid[3][4] = TYPES.WALL;
            const enemy = makeEnemy({ x: 3, y: 3 });
            const blockedBefore = { x: enemy.x, y: enemy.y };
            const blocked = gridMoveCardinal(enemy, 8.4, 0, {
                kind: 'enemy', canFly: false, maxStep: 2, laneLock: true,
                laneTolerance: 2, laneCorrectionStep: 1.8, allowCurrentBombTile: true
            });
            if (!blocked.blocked) throw new Error('corner: el muro no bloqueó el avance.');
            const wallRect = gridGetEntityRect(enemy, enemy.x, enemy.y, 'enemy');
            const wallTile = gridGetOverlappedTiles(wallRect).some(t => t.x === 4 && t.y === 3);
            if (wallTile) throw new Error('corner: el hitbox terminó superpuesto al muro.');

            const beforeTurn = { x: enemy.x, y: enemy.y };
            const correction = gridMoveCardinal(enemy, 0, 6.2, {
                kind: 'enemy', canFly: false, maxStep: 2, laneLock: true,
                laneTolerance: 2, laneCorrectionStep: 1.8, allowCurrentBombTile: true
            });
            const afterCorrection = { x: enemy.x, y: enemy.y };
            assertCardinalDelta(beforeTurn, afterCorrection, 'corner correction');
            const turned = gridMoveCardinal(enemy, 0, 6.2, {
                kind: 'enemy', canFly: false, maxStep: 2, laneLock: true,
                laneTolerance: 2, laneCorrectionStep: 1.8, allowCurrentBombTile: true
            });
            if (!turned.moved || turned.blocked) throw new Error('corner: no pudo doblar después de la corrección.');
            const delta = assertCardinalDelta(afterCorrection, enemy, 'corner turn');
            if (delta.dy <= 0) throw new Error('corner: el giro no avanzó hacia abajo.');
            return { blocked: true, correctionConsumedFrame: !!correction.laneCorrectionConsumed, turnMoved: true, delta };
        });
    }

    function caseCorridorLane() {
        return withCollisionScene(state => {
            for (let x = 1; x <= 7; x++) {
                state.grid[3][x] = TYPES.WALL;
                state.grid[5][x] = TYPES.WALL;
            }
            const enemy = makeEnemy({ x: 2, y: 4 }, 0, 1.5);
            let movedFrames = 0;
            let laneCorrections = 0;
            let laneSnaps = 0;
            let diagonalFrames = 0;
            const start = { x: enemy.x, y: enemy.y };

            for (let i = 0; i < 20; i++) {
                const before = { x: enemy.x, y: enemy.y };
                const result = gridMoveCardinal(enemy, 1.4, 0, {
                    kind: 'enemy', canFly: false, maxStep: 2, laneLock: true,
                    laneTolerance: 2, laneCorrectionStep: 1.8, allowCurrentBombTile: true
                });
                const delta = assertCardinalDelta(before, enemy, `corridor frame ${i}`);
                if (Math.hypot(delta.dx, delta.dy) > 0.0001) movedFrames += 1;
                if (result.laneCorrected) laneCorrections += 1;
                if (window.GRID_COLLISION_V320?.snapshot?.().laneSnaps) laneSnaps += 1;
                if (delta.dx && delta.dy) diagonalFrames += 1;
            }

            if (movedFrames !== 20) throw new Error(`corridor: pausa detectada (${movedFrames}/20 frames con avance).`);
            if (laneCorrections !== 0) throw new Error(`corridor: lane-lock corrigió dentro de tolerancia (${laneCorrections}).`);
            if (laneSnaps !== 0) throw new Error(`corridor: snap detectado (${laneSnaps}).`);
            if (diagonalFrames !== 0) throw new Error(`corridor: ${diagonalFrames} frames diagonales.`);
            if (!(enemy.x > start.x + 20)) throw new Error('corridor: avance insuficiente.');
            return {
                movedFrames,
                laneCorrections,
                laneSnaps,
                diagonalFrames,
                movedPx: Number((enemy.x - start.x).toFixed(2))
            };
        });
    }

    function caseObstacle() {
        return withCollisionScene(state => {
            state.grid[4][4] = TYPES.BLOCK;
            const enemy = makeEnemy({ x: 3, y: 4 });
            const before = { x: enemy.x, y: enemy.y };
            const intoBlock = gridMoveCardinal(enemy, 8.4, 0, {
                kind: 'enemy', canFly: false, maxStep: 2, laneLock: true,
                laneTolerance: 2, laneCorrectionStep: 1.8, allowCurrentBombTile: true
            });
            if (!intoBlock.blocked) throw new Error('obstacle: BLOCK no bloqueó.');
            const obstacleRect = gridGetEntityRect(enemy, enemy.x, enemy.y, 'enemy');
            const obstacleTile = gridGetOverlappedTiles(obstacleRect).some(t => t.x === 4 && t.y === 4);
            if (obstacleTile) throw new Error('obstacle: el hitbox terminó superpuesto al BLOCK.');

            const around = gridMoveCardinal(enemy, 0, 6.2, {
                kind: 'enemy', canFly: false, maxStep: 2, laneLock: true,
                laneTolerance: 2, laneCorrectionStep: 1.8, allowCurrentBombTile: true
            });
            if (!around.moved) throw new Error('obstacle: no encontró paso lateral.');
            return { blocked: intoBlock.blocked, detourMoved: around.moved };
        });
    }

    function caseBomb() {
        return withCollisionScene(state => {
            state.bombs = [{ x: 4, y: 4, timer: 1500, range: 2 }];
            const enemy = makeEnemy({ x: 3, y: 4 });
            const before = { x: enemy.x, y: enemy.y };
            const result = gridMoveCardinal(enemy, 8.4, 0, {
                kind: 'enemy', canFly: false, maxStep: 2, laneLock: true,
                laneTolerance: 2, laneCorrectionStep: 1.8, allowCurrentBombTile: true
            });
            if (!result.blocked) throw new Error('bomb: la bomba adyacente no bloqueó.');
            const bombTile = gridCurrentTile(enemy, 'enemy');
            if (bombTile.x === 4 && bombTile.y === 4) throw new Error('bomb: el enemigo entró en la casilla de la bomba.');
            return { blocked: result.blocked, bombTileNotEntered: true };
        });
    }

    function caseOverlap() {
        return withCollisionScene(state => {
            const a = makeEnemy({ x: 4, y: 4 });
            const b = makeEnemy({ x: 4, y: 4 });
            state.enemies = [a, b];
            const beforeA = { x: a.x, y: a.y };
            const beforeB = { x: b.x, y: b.y };
            const resultA = gridMoveCardinal(a, 1.4, 0, {
                kind: 'enemy', canFly: false, maxStep: 2, laneLock: true,
                laneTolerance: 2, laneCorrectionStep: 1.8, allowCurrentBombTile: true
            });
            const resultB = gridMoveCardinal(b, -1.4, 0, {
                kind: 'enemy', canFly: false, maxStep: 2, laneLock: true,
                laneTolerance: 2, laneCorrectionStep: 1.8, allowCurrentBombTile: true
            });
            for (const [name, entity] of [['A', a], ['B', b]]) {
                if (!Number.isFinite(entity.x) || !Number.isFinite(entity.y)) throw new Error(`overlap: ${name} terminó en NaN/Infinity.`);
            }
            assertCardinalDelta(beforeA, a, 'overlap A');
            assertCardinalDelta(beforeB, b, 'overlap B');
            const diagonalBefore = { x: a.x, y: a.y };
            const diagonal = gridMoveCardinal(a, 1, 1, {
                kind: 'enemy', canFly: false, maxStep: 2, laneLock: true,
                laneTolerance: 2, laneCorrectionStep: 1.8, allowCurrentBombTile: true
            });
            const diagonalDelta = assertCardinalDelta(diagonalBefore, a, 'overlap diagonal input');
            if (!diagonal.diagonalInputResolved) throw new Error('overlap: la entrada diagonal no fue normalizada.');
            return { enemyCount: state.enemies.length, aMoved: resultA.moved, bMoved: resultB.moved, diagonalResolved: true, diagonalDelta, finite: true };
        });
    }

    function caseLaneRecovery() {
        return withCollisionScene(() => {
            const enemy = makeEnemy({ x: 2, y: 4 }, 0, 3.8);
            const opts = {
                kind: 'enemy', canFly: false, maxStep: 2, laneLock: true,
                laneTolerance: 2, laneCorrectionStep: 1.8, allowCurrentBombTile: true
            };
            const before1 = { x: enemy.x, y: enemy.y };
            const first = gridMoveCardinal(enemy, 1.4, 0, opts);
            const after1 = { x: enemy.x, y: enemy.y };
            assertCardinalDelta(before1, after1, 'lane-recovery frame 1');
            const correction = Math.abs(after1.y - before1.y);
            if (correction <= 0 || correction > 1.8001) throw new Error(`lane-recovery: corrección fuera de límite (${correction.toFixed(3)}px).`);
            if (Math.abs(after1.x - before1.x) > 0.0001) throw new Error('lane-recovery: avanzó longitudinalmente durante la corrección.');

            const before2 = { x: enemy.x, y: enemy.y };
            const second = gridMoveCardinal(enemy, 1.4, 0, opts);
            const after2 = { x: enemy.x, y: enemy.y };
            const delta2 = assertCardinalDelta(before2, after2, 'lane-recovery frame 2');
            if (!second.moved || delta2.dx <= 0) throw new Error('lane-recovery: no retomó el avance tras la corrección.');
            if (Math.abs(delta2.dy) > 0.0001) throw new Error('lane-recovery: desplazamiento lateral residual inesperado.');

            const stats = window.GRID_COLLISION_V320?.snapshot?.() || {};
            if (Number(stats.laneSnaps || 0) !== 0) throw new Error(`lane-recovery: snap=${stats.laneSnaps}.`);
            return {
                correctionPx: Number(correction.toFixed(2)),
                resumedNextFrame: true,
                firstLaneCorrected: !!first.laneCorrected,
                secondMoved: !!second.moved,
                laneSnaps: Number(stats.laneSnaps || 0)
            };
        });
    }

    function run() {
        if (!window.DEBUG_TESTS) return;
        window.DEBUG_TESTS[TEST_NAME] = async () => {
            const started = performance.now();
            aggregateStats = {};
            const runners = [
                ['corner', caseCorner],
                ['corridor-lane', caseCorridorLane],
                ['obstacle', caseObstacle],
                ['bomb', caseBomb],
                ['overlap-enemies', caseOverlap],
                ['lane-recovery', caseLaneRecovery]
            ].slice(0, MAX_CASES);
            const cases = [];
            for (const [name, runner] of runners) {
                const result = runner();
                cases.push({ name, status: 'PASS', details: result });
            }

            const stats = { ...(aggregateStats || {}) };
            const summary = `${cases.length}/${cases.length} PASS · snaps=${Number(stats.laneSnaps || 0)} · diagonales-resueltas=${Number(stats.diagonalResolved || 0)} · correcciones=${Number(stats.laneCorrections || 0)}`;
            if (typeof window.DEBUG_MODE?.recordEvent === 'function') window.DEBUG_MODE.recordEvent('DEBUG', `Collision Stress · ${summary}`);
            return {
                summary,
                details: {
                    cases,
                    collisionStats: stats,
                    durationMs: Number((performance.now() - started).toFixed(1)),
                    guarantees: ['sin snaps visibles > ε', 'sin movimiento diagonal', 'lane-lock tolerante', 'recuperación retoma movimiento', 'bombas respetadas', 'overlap sin NaN/Infinity']
                }
            };
        };
    }

    run();
})();
