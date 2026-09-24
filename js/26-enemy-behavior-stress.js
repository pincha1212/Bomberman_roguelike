// Bomberman Roguelike v3.28.3 — Enemy Behavior Stress
// Stress funcional de los cinco arquetipos. Aísla estado de IA y restaura el runtime al finalizar.
(() => {
    'use strict';
    const ROLES = ['chaser','patroller','evasive','aggressive','flyer'];
    const FRAME_DT = 100;
    const FRAMES = 30;
    const MIN_MOVE = 20;
    const MIN_EXPECTED_ALERT_FRAMES = 3;

    function snapshotRuntime() {
        const state = gameState;
        const p = player;
        const ai = window.enemyAI_V312;
        return {
            state: {
                gridWidth: state.gridWidth,
                gridHeight: state.gridHeight,
                grid: state.grid,
                bombs: state.bombs,
                explosions: state.explosions,
                hazards: state.hazards,
                enemies: state.enemies,
                bossProjectiles: state.bossProjectiles,
                particles: state.particles,
                floaters: state.floaters,
                level: state.level,
                roomType: state.roomType,
                threatLevel: state.threatLevel,
                roomDesign: state.roomDesign
            },
            player: {
                x: p.x, y: p.y, vx: p.vx, vy: p.vy,
                isMoving: p.isMoving, inputAxis: p.inputAxis,
                inputBuffer: p.inputBuffer, inputBufferTimer: p.inputBufferTimer
            },
            ai: ai ? {
                roomKey: ai.roomKey,
                dangerCooldown: ai.dangerCooldown,
                dangerSignature: ai.dangerSignature,
                danger: ai.danger instanceof Set ? new Set(ai.danger) : new Set(),
                cursor: ai.cursor,
                decisionCursor: ai.decisionCursor
            } : null
        };
    }

    function restoreRuntime(snapshot) {
        const state = gameState;
        Object.assign(state, snapshot.state);
        Object.assign(player, snapshot.player);
        const ai = window.enemyAI_V312;
        if (ai && snapshot.ai) {
            ai.roomKey = snapshot.ai.roomKey;
            ai.dangerCooldown = snapshot.ai.dangerCooldown;
            ai.dangerSignature = snapshot.ai.dangerSignature;
            ai.danger = new Set(snapshot.ai.danger);
            ai.cursor = snapshot.ai.cursor;
            ai.decisionCursor = snapshot.ai.decisionCursor;
        }
    }

    function resetAIForCase() {
        const ai = window.enemyAI_V312;
        if (!ai) return;
        ai.roomKey = '';
        ai.dangerCooldown = 0;
        ai.dangerSignature = '';
        ai.danger = new Set();
        ai.cursor = 0;
        ai.decisionCursor = 0;
    }

    function makeEnemyRole(role, index) {
        const profiles = Object.values(window.ENEMY_BEHAVIORS_V324 || {});
        const profile = profiles.find(p => p.id === role);
        const type = role === 'flyer' ? ENEMY_TYPES.VOLADOR : role === 'aggressive' ? ENEMY_TYPES.ESPECIAL : ENEMY_TYPES.RASTRERO;
        return {
            x: (3 + index) * TILE_SIZE + TILE_SIZE / 2,
            y: 7 * TILE_SIZE + TILE_SIZE / 2,
            width: TILE_SIZE * 0.75,
            height: TILE_SIZE * 0.75,
            type,
            vx: 0,
            vy: 0,
            baseSpeed: type.speed,
            lastDirection: 'right',
            desiredDirection: 'right',
            __gridAnchor: 'center',
            aiBehavior: profile?.id || role
        };
    }

    function buildGrid() {
        const w = 15, h = 15;
        gameState.gridWidth = w;
        gameState.gridHeight = h;
        gameState.grid = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) =>
            (x === 0 || y === 0 || x === w - 1 || y === h - 1) ? TYPES.WALL : TYPES.EMPTY
        ));
        for (let x = 4; x < 11; x++) gameState.grid[5][x] = TYPES.WALL;
        gameState.grid[7][7] = TYPES.BLOCK;
    }

    function runOne(role, index) {
        buildGrid();
        resetAIForCase();
        gameState.bombs = [];
        gameState.explosions = [];
        gameState.hazards = [];
        gameState.enemies = [];
        gameState.bossProjectiles = [];
        gameState.particles = [];
        gameState.floaters = [];
        gameState.level = 1;
        gameState.threatLevel = 0;
        gameState.isPlaying = true;
        gameState.paused = false;
        player.x = 13 * TILE_SIZE;
        player.y = 7 * TILE_SIZE;
        player.vx = 0;
        player.vy = 0;
        const enemy = makeEnemyRole(role, index);
        if (role === 'flyer') enemy.x = 6 * TILE_SIZE + TILE_SIZE / 2;
        gameState.enemies.push(enemy);
        ensureEnemyMotionStateV312(enemy, index);
        enemy.ai.visionTimer = Number.MAX_SAFE_INTEGER;
        enemy.ai.decisionTimer = 0;
        enemy.ai.seesPlayer = true;
        enemy.ai.memoryTimer = 900;
        enemy.ai.patrolX = role === 'patroller' ? -1 : enemy.ai.patrolX;
        enemy.ai.patrolY = role === 'patroller' ? -1 : enemy.ai.patrolY;
        enemy.ai.direction = 'right';
        enemy.ai.desiredDirection = 'right';
        enemy.lastDirection = 'right';

        const startX = enemy.x, startY = enemy.y;
        const alerts = new Map();
        let totalMoved = 0;
        let maxStep = 0;
        const beforeBfs = Number(enemy.ai.recoveryPathCalls || 0);

        for (let frame = 0; frame < FRAMES; frame++) {
            const bx = enemy.x, by = enemy.y;
            updateEnemyAI(FRAME_DT);
            const stepMoved = Math.hypot(enemy.x - bx, enemy.y - by);
            totalMoved += stepMoved;
            maxStep = Math.max(maxStep, stepMoved);
            const alert = String(enemy.ai?.alert || '—');
            alerts.set(alert, Number(alerts.get(alert) || 0) + 1);
        }

        const profile = enemyBehaviorProfileV324(enemy, index);
        const moved = Math.hypot(enemy.x - startX, enemy.y - startY);
        const bfsCalls = Number(enemy.ai.recoveryPathCalls || 0) - beforeBfs;
        const expectedAlert = role === 'chaser' ? 'chase'
            : role === 'patroller' ? 'patrol'
            : role === 'evasive' ? 'flee'
            : role === 'aggressive' ? 'aggressive'
            : null;
        const expectedFrames = expectedAlert ? Number(alerts.get(expectedAlert) || 0) : 0;

        return {
            role,
            resolved: enemy.ai.archetype,
            expectedAlert,
            alert: enemy.ai.alert,
            alerts: Object.fromEntries(alerts),
            expectedAlertFrames: expectedFrames,
            moved: Number(moved.toFixed(2)),
            totalMoved: Number(totalMoved.toFixed(2)),
            maxStep: Number(maxStep.toFixed(2)),
            speedMultiplier: Number(profile.speedMultiplier || 1),
            canFly: !!enemy.type.canFly,
            bfsCalls,
            direction: enemy.ai.direction
        };
    }

    async function runBehaviorStress() {
        const snapshot = snapshotRuntime();
        const started = performance.now();
        try {
            const cases = ROLES.map(runOne);
            const failures = [];
            for (const c of cases) {
                if (c.resolved !== c.role) failures.push(`${c.role}: resolved=${c.resolved}`);
                if (c.totalMoved < MIN_MOVE) failures.push(`${c.role}: movimiento ${c.totalMoved}<${MIN_MOVE}px`);
                if (c.bfsCalls > 0) failures.push(`${c.role}: BFS=${c.bfsCalls}`);
                if (c.expectedAlert && c.expectedAlertFrames < MIN_EXPECTED_ALERT_FRAMES) {
                    failures.push(`${c.role}: ${c.expectedAlert} observado ${c.expectedAlertFrames}/${FRAMES}f`);
                }
                if (c.role === 'flyer' && !c.canFly) failures.push('flyer: perdió canFly');
            }
            const aggressive = cases.find(c => c.role === 'aggressive');
            const chaser = cases.find(c => c.role === 'chaser');
            if (aggressive && chaser && aggressive.speedMultiplier <= chaser.speedMultiplier) failures.push('aggressive: no supera velocidad base de chaser');
            const distinctAlerts = new Set(cases.flatMap(c => Object.keys(c.alerts)));
            if (distinctAlerts.size < 3) failures.push(`estados insuficientemente diferenciados (${distinctAlerts.size})`);
            const passed = failures.length === 0;
            const details = {
                cases,
                distinctAlerts: [...distinctAlerts],
                bfsCalls: cases.reduce((n, c) => n + c.bfsCalls, 0),
                thresholds: { minMove: MIN_MOVE, minExpectedAlertFrames: MIN_EXPECTED_ALERT_FRAMES, frames: FRAMES, dt: FRAME_DT },
                isolated: true,
                restored: true
            };
            const summary = `Enemy Behavior Stress: ${passed ? '5/5 roles' : `${cases.filter(c => !failures.some(f => f.startsWith(c.role + ':'))).length}/5 roles`} · estados=${distinctAlerts.size} · BFS=${details.bfsCalls}`;
            return { status: passed ? 'PASS' : 'FAIL', summary, details, ms: performance.now() - started, error: failures.join(' | ') || null };
        } finally {
            restoreRuntime(snapshot);
        }
    }

    function register() {
        if (!window.DEBUG_TESTS || typeof window.DEBUG_TESTS !== 'object') { setTimeout(register, 0); return; }
        window.DEBUG_TESTS['enemy-behavior-stress'] = async () => {
            const r = await runBehaviorStress();
            if (typeof debugRecordEvent === 'function') debugRecordEvent(r.status, r.summary, r.details);
            if (r.status !== 'PASS') throw new Error(r.error || r.summary);
            return { summary: r.summary, details: r.details };
        };
        window.BOMBER_ENEMY_BEHAVIOR_STRESS_V3283 = Object.freeze({ run: runBehaviorStress, roles: ROLES.slice() });
    }
    register();
})();
