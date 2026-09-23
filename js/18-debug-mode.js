// Bomberman Roguelike v3.16.2 — Debug Engine
// Se activa únicamente con ?debug=1. El modo normal no muestra ni ejecuta el panel.
(() => {
    'use strict';

    const params = new URLSearchParams(window.location.search);
    const enabled = params.get('debug') === '1';

    const NAV_DIRS = [
        { dx: 0, dy: -1, dir: 'UP' },
        { dx: 1, dy: 0, dir: 'RIGHT' },
        { dx: 0, dy: 1, dir: 'DOWN' },
        { dx: -1, dy: 0, dir: 'LEFT' }
    ];

    function navKey(x, y) { return `${x},${y}`; }

    function navTilePassable(kind, entity, x, y, startX, startY) {
        if (!gridIsInside(x, y)) return false;
        const canFly = kind === 'enemy' && !!entity?.type?.canFly;
        if (gridTileIsBlocked(x, y, { canFly })) return false;

        if (x === startX && y === startY) return true;

        const bombAtTile = gameState.bombs?.some(b => b && b.x === x && b.y === y);
        return !bombAtTile;
    }

    function buildReachableMap(kind, entity, start, maxNodes = 900) {
        const queue = [{ x: start.x, y: start.y }];
        let cursor = 0;
        const visited = new Set([navKey(start.x, start.y)]);
        const parent = new Map();
        const depth = new Map([[navKey(start.x, start.y), 0]]);

        while (cursor < queue.length && visited.size < maxNodes) {
            const current = queue[cursor++];
            for (const dir of NAV_DIRS) {
                const nx = current.x + dir.dx;
                const ny = current.y + dir.dy;
                const key = navKey(nx, ny);
                if (visited.has(key) || !navTilePassable(kind, entity, nx, ny, start.x, start.y)) continue;
                visited.add(key);
                parent.set(key, navKey(current.x, current.y));
                depth.set(key, (depth.get(navKey(current.x, current.y)) || 0) + 1);
                queue.push({ x: nx, y: ny });
            }
        }

        return { visited, parent, depth, truncated: queue.length > 0 };
    }

    function buildPath(parent, start, target, maxLength = 80) {
        const targetKey = navKey(target.x, target.y);
        if (start.x === target.x && start.y === target.y) return [{ x: start.x, y: start.y }];
        if (!parent.has(targetKey)) return [];

        const path = [];
        let current = targetKey;
        let guard = 0;
        while (current && guard++ < maxLength) {
            const [x, y] = current.split(',').map(Number);
            path.push({ x, y });
            if (x === start.x && y === start.y) break;
            current = parent.get(current);
        }
        if (!path.length || path[path.length - 1].x !== start.x || path[path.length - 1].y !== start.y) return [];
        path.reverse();
        return path;
    }

    function getNavigationSnapshot() {
        const playerEntity = window.BOMBER_ENGINE?.getPlayer?.() || window.player || globalThis.player;
        const playerTile = typeof gridCurrentTile === 'function'
            ? gridCurrentTile(playerEntity, 'player')
            : { x: Math.floor((playerEntity?.x || 0) / TILE_SIZE), y: Math.floor((playerEntity?.y || 0) / TILE_SIZE) };

        const now = performance.now();
        if (DEBUG_MODE.navigationCache && now - DEBUG_MODE.navigationCacheAt < 220) return DEBUG_MODE.navigationCache;

        const playerReach = buildReachableMap('player', playerEntity, playerTile, 900);
        const enemies = (gameState.enemies || []).slice(0, 12).map((enemy, index) => {
            const tile = typeof gridCurrentTile === 'function' ? gridCurrentTile(enemy, 'enemy') : {
                x: Math.floor(enemy.x / TILE_SIZE), y: Math.floor(enemy.y / TILE_SIZE)
            };
            const reach = buildReachableMap('enemy', enemy, tile, 900);
            const path = buildPath(reach.parent, tile, playerTile, 80);
            const options = NAV_DIRS.filter(dir => navTilePassable('enemy', enemy, tile.x + dir.dx, tile.y + dir.dy, tile.x, tile.y)).map(dir => dir.dir);
            return {
                index,
                tile,
                behavior: enemy.ai?.behavior || '?',
                alert: enemy.ai?.alert || '?',
                direction: enemy.ai?.direction || enemy.lastDirection || '?',
                desiredDirection: enemy.ai?.desiredDirection || enemy.desiredDirection || '?',
                seesPlayer: !!enemy.ai?.seesPlayer,
                reachableTiles: reach.visited.size,
                truncated: reach.truncated,
                options,
                route: path,
                routeLength: Math.max(0, path.length - 1),
                canReachPlayer: path.length > 0
            };
        });

        DEBUG_MODE.navigationCache = {
            mode: 'reference-bfs',
            player: {
                tile: playerTile,
                reachableTiles: playerReach.visited.size,
                truncated: playerReach.truncated,
                cells: Array.from(playerReach.visited).map(k => k.split(',').map(Number)),
                    options: NAV_DIRS.filter(dir => navTilePassable('player', playerEntity, playerTile.x + dir.dx, playerTile.y + dir.dy, playerTile.x, playerTile.y)).map(dir => dir.dir)
            },
            enemies
        };
        DEBUG_MODE.navigationCacheAt = now;
        return DEBUG_MODE.navigationCache;
    }

    const DEBUG_MODE = {
        enabled,
        visible: enabled,
        paused: false,
        stepRequested: false,
        frameCount: 0,
        fps: 0,
        avgFrameMs: 0,
        minFrameMs: Infinity,
        maxFrameMs: 0,
        updateMs: 0,
        drawMs: 0,
        lastTimestamp: 0,
        frameWindowStart: 0,
        frameWindowCount: 0,
        eventLog: [],
        runtimeErrors: (window.__BOMBER_DEBUG_BOOT_ERRORS || []).map(item => ({ time: performance.now(), source: 'boot', message: String(item), stack: '' })),
        testResults: [],
        busy: false,
        storageSnapshot: null,
        lastState: null,
        lastTest: null,
        navigationCache: null,
        navigationCacheAt: 0,
        selectedVisuals: {
            grid: false,
            collision: false,
            hitboxes: false,
            bombs: false,
            explosions: false,
            ai: false,
            camera: false,
            spawns: false,
            paths: false
        },

        frameStart() {
            if (!this.enabled) return performance.now();
            return performance.now();
        },

        recordFrame(timestamp, frameMs, updateMs, drawMs) {
            if (!this.enabled) return;
            this.frameCount++;
            this.frameWindowCount++;
            this.updateMs = updateMs;
            this.drawMs = drawMs;
            this.avgFrameMs = this.avgFrameMs ? this.avgFrameMs * 0.92 + frameMs * 0.08 : frameMs;
            this.minFrameMs = Math.min(this.minFrameMs, frameMs);
            this.maxFrameMs = Math.max(this.maxFrameMs, frameMs);

            if (!this.frameWindowStart) this.frameWindowStart = timestamp;
            const elapsed = timestamp - this.frameWindowStart;
            if (elapsed >= 500) {
                this.fps = this.frameWindowCount * 1000 / elapsed;
                this.frameWindowCount = 0;
                this.frameWindowStart = timestamp;
            }
        },

        recordEvent(type, message, data = null) {
            if (!this.enabled) return;
            const item = {
                time: performance.now(),
                wallTime: new Date().toLocaleTimeString('es-AR', { hour12: false }),
                type: String(type || 'INFO').toUpperCase(),
                message: String(message || ''),
                data
            };
            this.eventLog.push(item);
            if (this.eventLog.length > 180) this.eventLog.shift();
        },

        captureError(error, source = 'runtime') {
            if (!this.enabled) return;
            const message = error?.message || String(error || 'Error');
            const stack = error?.stack || '';
            this.runtimeErrors.push({
                time: performance.now(),
                source,
                message,
                stack
            });
            if (this.runtimeErrors.length > 80) this.runtimeErrors.shift();
            this.recordEvent('ERROR', message, { source });
        },

        requestPause() {
            if (!this.enabled) return;
            this.paused = !this.paused;
            this.stepRequested = false;
            this.recordEvent('DEBUG', this.paused ? 'Simulación pausada.' : 'Simulación reanudada.');
        },

        requestStep() {
            if (!this.enabled) return;
            if (!gameState.isPlaying) {
                this.recordEvent('WARN', 'STEP ignorado: la run no está activa.');
                return;
            }
            this.paused = true;
            this.stepRequested = true;
            this.recordEvent('DEBUG', 'STEP solicitado: se ejecutará un frame lógico.');
        },

        shouldUpdate() {
            if (!this.enabled) return true;
            if (!this.paused) return true;
            if (this.stepRequested) {
                this.stepRequested = false;
                return true;
            }
            return false;
        },

        toggleVisible() {
            if (!this.enabled) return;
            this.visible = !this.visible;
            document.getElementById('debug-overlay')?.classList.toggle('hidden', !this.visible);
        },

        snapshot() {
            const playerTile = typeof gridCurrentTile === 'function' ? gridCurrentTile(player, 'player') : { x: -1, y: -1 };
            const state = {
                playing: !!gameState.isPlaying,
                paused: !!gameState.paused,
                debugPaused: this.paused,
                run: Number(gameState.runNumber || 0),
                depth: Number(gameState.level || 0),
                room: gameState.roomType?.id || '?',
                threat: Number(gameState.threatLevel || 0),
                roomTime: Number(gameState.roomTime || 0),
                player: {
                    x: Number(player.x || 0),
                    y: Number(player.y || 0),
                    vx: Number(player.vx || 0),
                    vy: Number(player.vy || 0),
                    dir: player.dir || '?',
                    inputAxis: player.inputAxis || null,
                    hp: Number(player.health || 0),
                    speed: Number(player.speed || 0),
                    bombs: Number(player.maxBombs || 0),
                    bombsPlaced: Number(player.bombsPlaced || 0),
                    range: Number(player.bombRange || 0),
                    shield: !!player.hasShield,
                    tile: playerTile
                },
                world: {
                    width: Number(gameState.gridWidth || 0),
                    height: Number(gameState.gridHeight || 0),
                    enemies: gameState.enemies?.length || 0,
                    bombs: gameState.bombs?.length || 0,
                    explosions: gameState.explosions?.length || 0,
                    hazards: gameState.hazards?.length || 0,
                    particles: gameState.particles?.length || 0,
                    projectiles: gameState.bossProjectiles?.length || 0,
                    boss: !!gameState.boss && !gameState.boss.defeated
                },
                camera: {
                    x: Number(gameState.camera?.x || 0),
                    y: Number(gameState.camera?.y || 0),
                    targetX: Number(gameState.camera?.targetX || 0),
                    targetY: Number(gameState.camera?.targetY || 0)
                },
                performance: {
                    fps: this.fps,
                    frameMs: this.avgFrameMs,
                    updateMs: this.updateMs,
                    drawMs: this.drawMs,
                    minMs: Number.isFinite(this.minFrameMs) ? this.minFrameMs : 0,
                    maxMs: this.maxFrameMs
                },
                errors: this.runtimeErrors.length,
                lastTest: this.lastTest,
                navigation: getNavigationSnapshot()
            };
            this.lastState = state;
            return state;
        },

        async runTest(name) {
            if (!this.enabled || this.busy || !DEBUG_TESTS[name]) return;
            this.busy = true;
            this.storageSnapshot = captureDebugStorage();
            const started = performance.now();
            this.recordEvent('TEST', `Inicio: ${name}`);
            try {
                const result = await DEBUG_TESTS[name]();
                const normalized = normalizeTestResult(result);
                const ms = performance.now() - started;
                this.lastTest = { name, status: 'PASS', summary: normalized.summary, details: normalized.details, ms };
                this.testResults.push({ name, status: 'PASS', result: normalized.summary, details: normalized.details, ms });
                this.recordEvent('PASS', `${name}: ${normalized.summary}`, normalized.details);
            } catch (error) {
                const message = error?.message || String(error);
                const ms = performance.now() - started;
                this.lastTest = { name, status: 'FAIL', summary: message, details: { error: message, stack: error?.stack || '' }, ms };
                this.testResults.push({ name, status: 'FAIL', result: message, details: this.lastTest.details, ms });
                this.captureError(error, `test:${name}`);
            } finally {
                restoreDebugStorage(this.storageSnapshot);
                this.storageSnapshot = null;
                if (this.testResults.length > 40) this.testResults.splice(0, this.testResults.length - 40);
                this.busy = false;
                window.dispatchEvent(new CustomEvent('bomber-debug-updated'));
            }
        },

        async runAllTests() {
            if (!this.enabled || this.busy) return;
            this.busy = true;
            this.storageSnapshot = captureDebugStorage();
            this.testResults = [];
            const names = Object.keys(DEBUG_TESTS);
            this.recordEvent('TEST', `Suite v3.16.2 iniciada: ${names.length} pruebas.`);
            for (const name of names) {
                const started = performance.now();
                try {
                    const result = await DEBUG_TESTS[name]();
                    const normalized = normalizeTestResult(result);
                    const ms = performance.now() - started;
                    this.lastTest = { name, status: 'PASS', summary: normalized.summary, details: normalized.details, ms };
                    this.testResults.push({ name, status: 'PASS', result: normalized.summary, details: normalized.details, ms });
                    this.recordEvent('PASS', `${name}: ${normalized.summary}`, normalized.details);
                } catch (error) {
                    const message = error?.message || String(error);
                    const ms = performance.now() - started;
                    this.lastTest = { name, status: 'FAIL', summary: message, details: { error: message, stack: error?.stack || '' }, ms };
                    this.testResults.push({ name, status: 'FAIL', result: message, details: this.lastTest.details, ms });
                    this.captureError(error, `test:${name}`);
                }
                window.dispatchEvent(new CustomEvent('bomber-debug-updated'));
                await new Promise(resolve => setTimeout(resolve, 40));
            }
            const passed = this.testResults.filter(r => r.status === 'PASS').length;
            this.recordEvent(passed === names.length ? 'PASS' : 'WARN', `Suite finalizada: ${passed}/${names.length}.`);
            restoreDebugStorage(this.storageSnapshot);
            this.storageSnapshot = null;
            this.busy = false;
            restorePlayableScene();
            window.dispatchEvent(new CustomEvent('bomber-debug-updated'));
        },

        clearEvents() {
            this.eventLog.length = 0;
            this.runtimeErrors.length = 0;
            this.lastTest = null;
            this.recordEvent('DEBUG', 'Registro limpiado.');
        },

        setVisual(key, enabled) {
            if (!Object.prototype.hasOwnProperty.call(this.selectedVisuals, key)) return;
            this.selectedVisuals[key] = !!enabled;
        },

        manualBomb() {
            try {
                const result = placeBomb('debug-manual');
                this.recordEvent(result ? 'BOMB' : 'WARN', result ? 'Bomba colocada manualmente.' : 'Bomba rechazada.');
            } catch (error) { this.captureError(error, 'manual-bomb'); }
        },

        manualDamage() {
            try {
                const result = takeDamage('debug', player.x, player.y);
                this.recordEvent(result ? 'DAMAGE' : 'INFO', result ? 'Daño aplicado manualmente.' : 'Daño bloqueado por inmunidad.');
            } catch (error) { this.captureError(error, 'manual-damage'); }
        },

        manualEnemy() {
            try {
                spawnEnemies();
                this.recordEvent('AI', `Enemigos en escena: ${gameState.enemies.length}.`);
            } catch (error) { this.captureError(error, 'manual-enemy'); }
        },

        resetScene() {
            try {
                stopGameLoopForDebug();
                if (typeof resetWorldRuntimeState === 'function') resetWorldRuntimeState();
                if (typeof resetPlayerRuntimeState === 'function') resetPlayerRuntimeState();
                if (typeof resetRelicModifiers === 'function') resetRelicModifiers();
                if (typeof resetBombHandlingState === 'function') resetBombHandlingState();
                if (typeof resetCombatFeedbackForRun === 'function') resetCombatFeedbackForRun();
                initLevel();
                gameState.runNumber = Math.max(1, Number(localStorage.getItem('bombermanRogueRun') || 1));
                gameState.isPlaying = true;
                gameState.paused = false;
                gameState.lastTime = performance.now();
                DEBUG_MODE.paused = false;
                DEBUG_MODE.stepRequested = false;
                updateUI(true);
                draw();
                ensureDebugLoop();
                this.recordEvent('LIFECYCLE', 'Escena de depuración reiniciada sin modificar estadísticas persistentes.');
            } catch (error) { this.captureError(error, 'reset-scene'); }
        }
    };

    function captureDebugStorage() {
        const keys = ['bombermanRogueRun', 'bombermanBestDepth', 'bombermanBestScore'];
        return Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)]));
    }

    function restoreDebugStorage(snapshot) {
        if (!snapshot) return;
        for (const [key, value] of Object.entries(snapshot)) {
            if (value === null) localStorage.removeItem(key);
            else localStorage.setItem(key, value);
        }
    }

    function stopGameLoopForDebug() {
        if (gameState?.rafId) {
            cancelAnimationFrame(gameState.rafId);
            gameState.rafId = 0;
        }
        gameState.isPlaying = false;
    }

    function ensureDebugLoop() {
        if (!gameState.isPlaying || gameState.rafId) return;
        gameState.lastTime = performance.now();
        gameState.rafId = requestAnimationFrame(gameLoop);
    }

    function findEmptyCell(preferCorridor = false) {
        const candidates = [];
        for (let y = 1; y < gameState.gridHeight - 1; y++) {
            for (let x = 1; x < gameState.gridWidth - 1; x++) {
                if (gameState.grid[y]?.[x] !== TYPES.EMPTY) continue;
                if (preferCorridor && gameState.grid[y]?.[x + 1] === TYPES.EMPTY && gameState.grid[y]?.[x + 2] === TYPES.EMPTY) {
                    return { x, y };
                }
                candidates.push({ x, y });
            }
        }
        return candidates[0] || { x: 1, y: 1 };
    }

    function setPlayerAt(cell) {
        const center = { x: cell.x * TILE_SIZE + TILE_SIZE / 2, y: cell.y * TILE_SIZE + TILE_SIZE / 2 };
        player.x = center.x - player.width / 2;
        player.y = center.y - player.height / 2;
        player.vx = 0;
        player.vy = 0;
        player.isMoving = false;
        player.inputAxis = null;
        player.inputBuffer = null;
        player.inputBufferTimer = 0;
        gameState.keys = {};
        gameState.touchControls = { x: 0, y: 0 };
        resetCameraToPlayer();
    }

    function prepareTest() {
        stopGameLoopForDebug();
        gameState.paused = false;
        if (typeof resetWorldRuntimeState === 'function') resetWorldRuntimeState();
        if (typeof resetPlayerRuntimeState === 'function') resetPlayerRuntimeState();
        if (typeof resetRelicModifiers === 'function') resetRelicModifiers();
        if (typeof resetBombHandlingState === 'function') resetBombHandlingState();
        if (typeof resetCombatFeedbackForRun === 'function') resetCombatFeedbackForRun();
        if (typeof RUN_LIFECYCLE !== 'undefined') {
            RUN_LIFECYCLE.elapsedMs = 0;
            RUN_LIFECYCLE.lastSummary = null;
        }
        gameState.runNumber = 1;
        initLevel();
        gameState.isPlaying = true;
        gameState.paused = false;
        gameState.lastTime = performance.now();
        updateUI(true);
        draw();
    }

    function restorePlayableScene() {
        try {
            stopGameLoopForDebug();
            gameState.paused = false;
            if (typeof resetWorldRuntimeState === 'function') resetWorldRuntimeState();
            if (typeof resetPlayerRuntimeState === 'function') resetPlayerRuntimeState();
            if (typeof resetRelicModifiers === 'function') resetRelicModifiers();
            if (typeof resetBombHandlingState === 'function') resetBombHandlingState();
            if (typeof resetCombatFeedbackForRun === 'function') resetCombatFeedbackForRun();
            gameState.runNumber = Math.max(1, Number(localStorage.getItem('bombermanRogueRun') || 1));
            initLevel();
            gameState.isPlaying = false;
            gameState.lastTime = performance.now();
            gameState.isPlaying = true;
            gameState.paused = false;
            updateRoguePresentation();
            updateUI(true);
            draw();
            DEBUG_MODE.paused = false;
            DEBUG_MODE.stepRequested = false;
            ensureDebugLoop();
            DEBUG_MODE.recordEvent('LIFECYCLE', 'Escena restaurada. La run de depuración quedó activa.');
        } catch (error) {
            DEBUG_MODE.captureError(error, 'restore-scene');
        }
    }

    function normalizeTestResult(result) {
        if (result && typeof result === 'object' && Object.prototype.hasOwnProperty.call(result, 'summary')) {
            return { summary: String(result.summary), details: result.details ?? {} };
        }
        return { summary: String(result ?? 'OK'), details: {} };
    }

    const DEBUG_TESTS = {
        movement: async () => {
            prepareTest();
            const c = findEmptyCell(true);
            setPlayerAt(c);
            const before = player.x;
            gameState.keys = { ArrowRight: true };
            for (let i = 0; i < 12; i++) updatePlayerMovement(16.6667);
            gameState.keys = {};
            if (!(player.x > before + 1)) throw new Error('El jugador no avanzó hacia la derecha.');
            if (Math.abs(player.vy) > 0.05) throw new Error('El movimiento cardinal generó componente Y.');
            return { summary: `OK · X ${before.toFixed(1)} → ${player.x.toFixed(1)}`, details: { beforeX: before, afterX: player.x, deltaX: player.x - before, velocityX: player.vx, velocityY: player.vy, input: 'ArrowRight' } };
        },

        bombs: async () => {
            prepareTest();
            gameState.enemies = [];
            gameState.hazards = [];
            gameState.explosions = [];
            const c = findEmptyCell();
            setPlayerAt(c);
            const placed = placeBomb('debug-test');
            if (placed !== true) throw new Error('No se pudo colocar la bomba.');
            if (gameState.bombs.length !== 1) throw new Error('El conteo de bombas no aumentó correctamente.');
            explodeBomb(0);
            if (gameState.bombs.length !== 0) throw new Error('La bomba no fue removida.');
            if (gameState.explosions.length === 0) throw new Error('La detonación no creó explosiones.');
            if (player.bombsPlaced !== 0) throw new Error('bombsPlaced no volvió a cero.');
            return { summary: `OK · ${gameState.explosions.length} celdas de explosión`, details: { bomb: { x: c.x, y: c.y }, explosionCells: gameState.explosions.map(e => ({ x: e.x, y: e.y })), bombsRemaining: gameState.bombs.length, bombsPlaced: player.bombsPlaced } };
        },

        damage: async () => {
            prepareTest();
            const p = window.BOMBER_ENGINE?.getPlayer?.() || player;
            const gs = window.BOMBER_ENGINE?.getState?.() || gameState;
            p.health = 3;
            p.isInvincible = false;
            p.invincibleTimer = 0;
            p.lastDamageFrame = -1;
            gs.animFrame = 1;
            if (takeDamage('debug', p.x, p.y) !== true) throw new Error('El primer daño no fue aplicado.');
            const hp1 = p.health;
            if (takeDamage('debug-second', p.x, p.y) !== false) throw new Error('Se aplicó daño doble durante la inmunidad.');
            updatePlayerInvulnerability(1600);
            gs.animFrame = 2;
            if (takeDamage('debug-third', p.x, p.y) !== true) throw new Error('No volvió a recibir daño tras la inmunidad.');
            if (p.health !== 1) throw new Error('El segundo golpe no restó exactamente 1 HP.');
            return { summary: `OK · HP ${hp1} → ${p.health}`, details: { firstHitHp: hp1, finalHp: p.health, invulnerabilityMs: 1600, secondHitBlocked: true } };
        },

        traps: async () => {
            prepareTest();
            const c = findEmptyCell();
            const types = Object.values(TRAP_TYPES);
            for (const type of types) {
                const hazard = {
                    x: c.x, y: c.y, id: `debug-${type}`, type,
                    triggered: false, visible: false, telegraphTimer: 0,
                    flashTimer: 0, effectTimer: 0, delayTimer: 0,
                    effectConsumed: false, detonated: false, phase: 0
                };
                if (triggerHazard(hazard, 'debug') !== true) throw new Error(`No activó ${type}.`);
                if (triggerHazard(hazard, 'debug-second') !== false) throw new Error(`${type} se activó dos veces.`);
            }
            return { summary: `OK · ${types.length} tipos · activación única`, details: { trapTypes: types, activationCountPerType: 1 } };
        },

        enemies: async () => {
            prepareTest();
            gameState.bombs = [];
            gameState.explosions = [];
            gameState.hazards = [];
            gameState.enemies = [];
            const c = findEmptyCell(true);
            setPlayerAt(c);
            const startX = Math.min(gameState.gridWidth - 2, c.x + 3);
            const e = {
                x: startX * TILE_SIZE + TILE_SIZE / 2,
                y: c.y * TILE_SIZE + TILE_SIZE / 2,
                width: TILE_SIZE * 0.75,
                height: TILE_SIZE * 0.75,
                type: ENEMY_TYPES.RASTRERO,
                vx: -1.4, vy: 0, baseSpeed: 1.4,
                lastDirection: 'left', desiredDirection: 'left', __gridAnchor: 'center'
            };
            gameState.enemies.push(e);
            ensureEnemyMotionStateV312(e, 0);
            for (let i = 0; i < 20; i++) updateEnemyAI(100);
            if (!e.ai || !['chase', 'surround', 'flee', 'patrol'].includes(e.ai.behavior)) throw new Error('El estado de IA no se inicializó.');
            if (typeof gridCurrentTile === 'function' && e.ai.lastDecisionTileX < 0) throw new Error('La IA no tomó ninguna decisión de intersección.');
            return { summary: `OK · behavior=${e.ai.behavior} · dir=${e.ai.direction || '?'}`, details: { tile: gridCurrentTile(e, 'enemy'), behavior: e.ai.behavior, alert: e.ai.alert, direction: e.ai.direction, desiredDirection: e.ai.desiredDirection, seesPlayer: e.ai.seesPlayer, reachableTiles: DEBUG_MODE.snapshot().navigation.enemies.find(n => n.index === 0)?.reachableTiles ?? null, routeLength: DEBUG_MODE.snapshot().navigation.enemies.find(n => n.index === 0)?.routeLength ?? null } };
        },

        camera: async () => {
            prepareTest();
            const c = findEmptyCell();
            setPlayerAt(c);
            resetCameraToPlayer();
            const before = { x: gameState.camera.x, y: gameState.camera.y };
            player.x = Math.max(TILE_SIZE, (gameState.gridWidth - 3) * TILE_SIZE);
            player.y = Math.max(TILE_SIZE, (gameState.gridHeight - 3) * TILE_SIZE);
            for (let i = 0; i < 12; i++) updateCamera(16.6667);
            const bounds = getCameraBounds();
            if (gameState.camera.x < -0.01 || gameState.camera.x > bounds.maxX + 0.01) throw new Error('Cámara fuera de límites X.');
            if (gameState.camera.y < -0.01 || gameState.camera.y > bounds.maxY + 0.01) throw new Error('Cámara fuera de límites Y.');
            if (gameState.camera.x === before.x && gameState.camera.y === before.y) throw new Error('La cámara no siguió al jugador.');
            return { summary: `OK · (${before.x.toFixed(0)},${before.y.toFixed(0)}) → (${gameState.camera.x.toFixed(0)},${gameState.camera.y.toFixed(0)})`, details: { before, after: { x: gameState.camera.x, y: gameState.camera.y }, target: { x: gameState.camera.targetX, y: gameState.camera.targetY }, bounds } };
        },

        restart: async () => {
            prepareTest();
            player.health = 1;
            player.vx = 4;
            player.vy = 2;
            player.bombsPlaced = 2;
            gameState.bombs = [{ x: 2, y: 2, timer: 10 }];
            gameState.explosions = [{ x: 2, y: 2, timer: 300 }];
            gameState.enemies = [{ x: 100, y: 100 }];
            gameState.hazards = [{ x: 3, y: 3, triggered: true }];
            gameState.bossProjectiles = [{ x: 1, y: 1 }];
            gameState.particles = [{ x: 1, y: 1 }];
            gameState.shakeTimer = 100;
            gameState.shakeIntensity = 9;
            finishRun('debug-test');
            beginNewRun();
            initLevel();
            if (player.health !== 3) throw new Error('La vida no se restableció.');
            if (player.bombsPlaced !== 0) throw new Error('bombsPlaced quedó contaminado.');
            if (player.vx !== 0 || player.vy !== 0) throw new Error('La velocidad del jugador no se restableció.');
            if (gameState.bombs.length !== 0 || gameState.explosions.length !== 0) throw new Error('Persistieron bombas/explosiones.');
            if (gameState.bossProjectiles.length !== 0 || gameState.shakeTimer !== 0) throw new Error('Persistieron proyectiles o shake.');
            return { summary: 'OK · estado limpio después del reinicio', details: { health: player.health, bombsPlaced: player.bombsPlaced, velocity: { x: player.vx, y: player.vy }, bombs: gameState.bombs.length, explosions: gameState.explosions.length, projectiles: gameState.bossProjectiles.length, shakeTimer: gameState.shakeTimer } };
        }
    };

    window.DEBUG_MODE = DEBUG_MODE;
    window.DEBUG_TESTS = DEBUG_TESTS;
    window.debugRecordEvent = (...args) => DEBUG_MODE.recordEvent(...args);
    window.debugCaptureError = (...args) => DEBUG_MODE.captureError(...args);
    window.debugStateSnapshot = () => DEBUG_MODE.snapshot();
    window.debugNavigationSnapshot = () => getNavigationSnapshot();

    if (!enabled) return;

    window.addEventListener('error', event => DEBUG_MODE.captureError(event.error || event.message, 'window.error'));
    window.addEventListener('unhandledrejection', event => DEBUG_MODE.captureError(event.reason, 'unhandledrejection'));
    window.addEventListener('keydown', event => {
        if (event.code === 'F3') {
            event.preventDefault();
            DEBUG_MODE.toggleVisible();
        } else if (event.code === 'F4') {
            event.preventDefault();
            DEBUG_MODE.requestPause();
        } else if (event.code === 'F6') {
            event.preventDefault();
            DEBUG_MODE.requestStep();
        } else if (event.code === 'F7') {
            event.preventDefault();
            DEBUG_MODE.runAllTests();
        }
    });
})();
