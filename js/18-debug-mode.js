// Bomberman Roguelike v3.16.3 — Debug Engine
// Depuración interna del mismo runtime. Se activa solo con ?debug=1.
(() => {
    'use strict';

    const params = new URLSearchParams(window.location.search);
    const enabled = params.get('debug') === '1';

    const DIRS = Object.freeze([
        { dx: 0, dy: -1, dir: 'UP' },
        { dx: 1, dy: 0, dir: 'RIGHT' },
        { dx: 0, dy: 1, dir: 'DOWN' },
        { dx: -1, dy: 0, dir: 'LEFT' }
    ]);

    const TEST_NAMES = Object.freeze(['movement', 'bombs', 'damage', 'traps', 'enemies', 'camera', 'restart']);
    const MAX_EVENTS = 220;
    const MAX_ERRORS = 100;
    const MAX_TEST_RESULTS = 30;
    const MAX_NAV_NODES = 900;

    const getState = () => window.BOMBER_ENGINE?.getState?.() || null;
    const getPlayer = () => window.BOMBER_ENGINE?.getPlayer?.() || null;

    const DEBUG_MODE = {
        enabled,
        visible: enabled,
        paused: false,
        stepRequested: false,
        busy: false,
        frameCount: 0,
        fps: 0,
        avgFrameMs: 0,
        minFrameMs: Infinity,
        maxFrameMs: 0,
        updateMs: 0,
        drawMs: 0,
        loopMs: 0,
        frameWindowStart: 0,
        frameWindowCount: 0,
        eventLog: [],
        runtimeErrors: [],
        testResults: [],
        lastTest: null,
        lastAction: '—',
        navigationCache: null,
        navigationSignature: '',
        navigationAt: 0,
        selectedVisuals: {
            grid: false,
            collision: false,
            hitboxes: false,
            bombs: false,
            explosions: false,
            ai: false,
            camera: false,
            spawns: false,
            paths: true
        },

        recordFrame(timestamp, frameMs, updateMs, drawMs) {
            if (!this.enabled) return;
            this.frameCount += 1;
            this.frameWindowCount += 1;
            this.updateMs = Number(updateMs) || 0;
            this.drawMs = Number(drawMs) || 0;
            this.loopMs = Number(frameMs) || 0;
            this.avgFrameMs = this.avgFrameMs ? this.avgFrameMs * 0.90 + this.loopMs * 0.10 : this.loopMs;
            this.minFrameMs = Math.min(this.minFrameMs, this.loopMs);
            this.maxFrameMs = Math.max(this.maxFrameMs, this.loopMs);

            if (!this.frameWindowStart) this.frameWindowStart = timestamp;
            const elapsed = timestamp - this.frameWindowStart;
            if (elapsed >= 500) {
                this.fps = this.frameWindowCount * 1000 / Math.max(1, elapsed);
                this.frameWindowCount = 0;
                this.frameWindowStart = timestamp;
            }
        },

        recordEvent(type, message, data = null) {
            if (!this.enabled) return;
            const normalizedType = String(type || 'INFO').toUpperCase();
            const item = {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                time: performance.now(),
                wallTime: new Date().toLocaleTimeString('es-AR', { hour12: false }),
                type: normalizedType,
                message: String(message || ''),
                data: data && typeof data === 'object' ? data : null
            };
            this.eventLog.push(item);
            if (this.eventLog.length > MAX_EVENTS) this.eventLog.splice(0, this.eventLog.length - MAX_EVENTS);
            dispatchUpdate();
        },

        captureError(error, source = 'runtime', extra = null) {
            if (!this.enabled) return;
            const message = error?.message || String(error || 'Error desconocido');
            const stack = error?.stack || '';
            const url = extra?.url || '';
            const fingerprint = `${source}|${message}|${url}|${stack.split('\n')[1] || ''}`;
            const previous = this.runtimeErrors[this.runtimeErrors.length - 1];
            if (previous?.fingerprint === fingerprint && performance.now() - previous.time < 500) return;

            const item = {
                time: performance.now(),
                wallTime: new Date().toLocaleTimeString('es-AR', { hour12: false }),
                source: String(source),
                message,
                stack,
                url,
                fingerprint
            };
            this.runtimeErrors.push(item);
            if (this.runtimeErrors.length > MAX_ERRORS) this.runtimeErrors.splice(0, this.runtimeErrors.length - MAX_ERRORS);
            this.recordEvent('ERROR', message, { source, url });
        },

        requestPause() {
            if (!this.enabled || this.busy) return;
            this.paused = !this.paused;
            this.stepRequested = false;
            this.recordEvent('DEBUG', this.paused ? 'Simulación pausada.' : 'Simulación reanudada.');
        },

        requestStep() {
            if (!this.enabled || this.busy) return;
            const state = getState();
            if (!state?.isPlaying) {
                this.recordEvent('WARN', 'STEP rechazado: la escena no está activa. Usá RESET.');
                return;
            }
            this.paused = true;
            this.stepRequested = true;
            this.recordEvent('DEBUG', 'STEP: se ejecutará un único frame lógico.');
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
            this.recordEvent('DEBUG', this.visible ? 'Panel mostrado.' : 'Panel oculto.');
        },

        snapshot() {
            const state = getState();
            const player = getPlayer();
            const playerTile = player ? entityTile(player, 'player') : { x: -1, y: -1 };
            const room = state?.roomType || null;
            const hazards = Array.isArray(state?.hazards) ? state.hazards : [];
            const bombs = Array.isArray(state?.bombs) ? state.bombs : [];
            const enemies = Array.isArray(state?.enemies) ? state.enemies : [];
            const explosions = Array.isArray(state?.explosions) ? state.explosions : [];

            return {
                status: !state ? 'ENGINE NO DISPONIBLE' : (state.isPlaying ? (this.paused ? 'PAUSADO' : 'ACTIVO') : 'DETENIDO'),
                engine: {
                    stateAvailable: !!state,
                    playerAvailable: !!player,
                    playing: !!state?.isPlaying,
                    gamePaused: !!state?.paused,
                    debugPaused: !!this.paused,
                    rafId: Number(state?.rafId || 0),
                    lastTime: Number(state?.lastTime || 0)
                },
                player: player ? {
                    x: num(player.x), y: num(player.y),
                    vx: num(player.vx), vy: num(player.vy),
                    dir: player.dir || '—',
                    desiredDirection: player.desiredDirection || player.inputAxis || '—',
                    isMoving: !!player.isMoving,
                    hp: Number(player.health ?? 0),
                    maxHp: Number(player.maxHealth ?? 0),
                    bombsAvailable: Math.max(0, Number(player.maxBombs || 0) - Number(player.bombsPlaced || 0)),
                    bombsMax: Number(player.maxBombs || 0),
                    bombsPlaced: Number(player.bombsPlaced || 0),
                    range: Number(player.bombRange || 0),
                    speed: num(player.speed),
                    shield: !!player.hasShield,
                    invulnerable: !!player.isInvincible,
                    invulnerabilityMs: Number(player.invincibleTimer || 0),
                    tile: playerTile,
                    inputAxis: player.inputAxis || '—',
                    inputDir: Number(player.inputDir || 0)
                } : null,
                world: state ? {
                    width: Number(state.gridWidth || 0),
                    height: Number(state.gridHeight || 0),
                    depth: Number(state.level || 0),
                    room: room?.id || '—',
                    roomName: room?.name || '—',
                    threat: Number(state.threatLevel || 0),
                    roomTimeMs: Number(state.roomTime || 0),
                    run: Number(state.runNumber || 0),
                    score: Number(state.score || 0),
                    coins: Number(state.coins || 0),
                    blocksBroken: Number(state.blocksBroken || 0),
                    enemies: enemies.length,
                    bombs: bombs.length,
                    explosions: explosions.length,
                    traps: hazards.length,
                    activeTraps: hazards.filter(h => !!h?.triggered).length,
                    particles: Array.isArray(state.particles) ? state.particles.length : 0,
                    projectiles: Array.isArray(state.bossProjectiles) ? state.bossProjectiles.length : 0,
                    boss: !!state.boss && !state.boss.defeated,
                    exit: state.exitPos ? `${state.exitPos.x},${state.exitPos.y}` : '—'
                } : null,
                camera: state ? {
                    x: num(state.camera?.x),
                    y: num(state.camera?.y),
                    targetX: num(state.camera?.targetX),
                    targetY: num(state.camera?.targetY)
                } : null,
                performance: {
                    fps: this.fps,
                    frameMs: this.avgFrameMs,
                    loopMs: this.loopMs,
                    updateMs: this.updateMs,
                    drawMs: this.drawMs,
                    minMs: Number.isFinite(this.minFrameMs) ? this.minFrameMs : 0,
                    maxMs: this.maxFrameMs
                },
                tests: {
                    passed: this.testResults.filter(r => r.status === 'PASS').length,
                    failed: this.testResults.filter(r => r.status === 'FAIL').length,
                    total: TEST_NAMES.length,
                    busy: this.busy,
                    last: this.lastTest
                },
                errors: this.runtimeErrors.length,
                events: this.eventLog.length,
                navigation: this.getNavigationSnapshot()
            };
        },

        getNavigationSnapshot(force = false) {
            const state = getState();
            const player = getPlayer();
            if (!state || !player || !Array.isArray(state.grid) || !state.grid.length || !Number(state.gridWidth) || !Number(state.gridHeight)) {
                return emptyNavigation('Sin rejilla o jugador.');
            }

            const signature = buildNavigationSignature(state, player);
            const now = performance.now();
            if (!force && this.navigationCache && signature === this.navigationSignature && now - this.navigationAt < 1000) {
                return this.navigationCache;
            }

            const playerTile = entityTile(player, 'player');
            const playerReach = buildReachable('player', player, playerTile, MAX_NAV_NODES);
            const enemies = (state.enemies || []).slice(0, 16).map((enemy, index) => {
                const tile = entityTile(enemy, 'enemy');
                const reach = buildReachable('enemy', enemy, tile, MAX_NAV_NODES);
                const path = shortestPathTo(tile, playerTile, 'enemy', enemy, reach);
                const options = cellOptions('enemy', enemy, tile);
                const junctions = countJunctions(reach.cells, 'enemy', enemy);
                return {
                    index,
                    tile,
                    behavior: enemy.ai?.behavior || '—',
                    alert: enemy.ai?.alert || '—',
                    currentDirection: enemy.ai?.direction || enemy.lastDirection || '—',
                    desiredDirection: enemy.ai?.desiredDirection || enemy.desiredDirection || '—',
                    seesPlayer: !!enemy.ai?.seesPlayer,
                    options,
                    reachableTiles: reach.cells.length,
                    truncated: reach.truncated,
                    junctions,
                    route: path,
                    routeLength: Math.max(0, path.length - 1),
                    canReachPlayer: path.length > 0,
                    target: { ...playerTile }
                };
            });

            const playerOptions = cellOptions('player', player, playerTile);
            const playerJunctions = countJunctions(playerReach.cells, 'player', player);
            const result = {
                available: true,
                mode: 'collision-grid-reference',
                note: 'Visualización de navegación basada en la misma rejilla y reglas de colisión del juego. No modifica la IA.',
                signature,
                player: {
                    tile: playerTile,
                    reachableTiles: playerReach.cells.length,
                    truncated: playerReach.truncated,
                    junctions: playerJunctions,
                    deadEnds: countDeadEnds(playerReach.cells, 'player', player),
                    options: playerOptions,
                    treeEdges: playerReach.edges,
                    cells: playerReach.cells
                },
                enemies
            };

            this.navigationCache = result;
            this.navigationSignature = signature;
            this.navigationAt = now;
            return result;
        },

        resetNavigation() {
            this.navigationCache = null;
            this.navigationSignature = '';
            this.navigationAt = 0;
        },

        async runTest(name) {
            if (!this.enabled || this.busy || !DEBUG_TESTS[name]) return;
            await this.executeTests([name]);
        },

        async runAllTests() {
            if (!this.enabled || this.busy) return;
            await this.executeTests(TEST_NAMES);
        },

        async executeTests(names) {
            this.busy = true;
            this.testResults = [];
            const storage = captureStorage();
            const startedSuite = performance.now();
            this.recordEvent('TEST', `Inicio de suite: ${names.length} prueba(s).`);

            try {
                for (const name of names) {
                    const started = performance.now();
                    let result = null;
                    try {
                        result = await DEBUG_TESTS[name]();
                        const normalized = normalizeResult(result);
                        this.lastTest = {
                            name,
                            status: 'PASS',
                            summary: normalized.summary,
                            details: normalized.details,
                            ms: performance.now() - started
                        };
                        this.testResults.push({ ...this.lastTest, result: normalized.summary });
                        this.recordEvent('PASS', `${name}: ${normalized.summary}`, normalized.details);
                    } catch (error) {
                        const message = error?.message || String(error);
                        this.lastTest = {
                            name,
                            status: 'FAIL',
                            summary: message,
                            details: { error: message, stack: error?.stack || '' },
                            ms: performance.now() - started
                        };
                        this.testResults.push({ ...this.lastTest, result: message });
                        this.captureError(error, `test:${name}`);
                        this.recordEvent('FAIL', `${name}: ${message}`, this.lastTest.details);
                    }
                    if (this.testResults.length > MAX_TEST_RESULTS) this.testResults.shift();
                    dispatchUpdate();
                    await nextFrame();
                }
            } finally {
                restoreStorage(storage);
                this.busy = false;
                this.resetNavigation();
                restorePlayableDebugScene();
                const passed = this.testResults.filter(r => r.status === 'PASS').length;
                const failed = this.testResults.filter(r => r.status === 'FAIL').length;
                this.recordEvent(failed === 0 ? 'PASS' : 'WARN', `Suite finalizada: ${passed}/${names.length} PASS · ${failed} FAIL · ${(performance.now() - startedSuite).toFixed(0)}ms.`);
                dispatchUpdate();
            }
        },

        clearEvents() {
            this.eventLog.length = 0;
            this.recordEvent('DEBUG', 'Event Log limpiado.');
        },

        clearErrors() {
            this.runtimeErrors.length = 0;
            this.recordEvent('DEBUG', 'Runtime Errors limpiado.');
        },

        setVisual(key, value) {
            if (!Object.prototype.hasOwnProperty.call(this.selectedVisuals, key)) return;
            this.selectedVisuals[key] = !!value;
            this.recordEvent('VISUAL', `${key}: ${value ? 'ON' : 'OFF'}`);
        },

        manualBomb() {
            try {
                const placed = typeof placeBomb === 'function' ? placeBomb('debug-manual') : false;
                this.lastAction = placed ? 'BOMBA COLOCADA' : 'BOMBA RECHAZADA';
                this.recordEvent(placed ? 'BOMB' : 'WARN', this.lastAction);
            } catch (error) {
                this.captureError(error, 'action:bomb');
            }
        },

        manualDamage() {
            try {
                const player = getPlayer();
                const before = Number(player?.health ?? 0);
                const result = typeof takeDamage === 'function' ? takeDamage('debug-manual', player?.x || 0, player?.y || 0) : false;
                const after = Number(player?.health ?? before);
                this.lastAction = result ? `DAÑO ${before} → ${after}` : 'DAÑO BLOQUEADO';
                this.recordEvent(result ? 'DAMAGE' : 'INFO', this.lastAction, { before, after });
            } catch (error) {
                this.captureError(error, 'action:damage');
            }
        },

        manualEnemy() {
            try {
                if (typeof spawnEnemies !== 'function') throw new Error('spawnEnemies() no disponible.');
                spawnEnemies();
                const count = getState()?.enemies?.length || 0;
                this.lastAction = `ENEMIGOS: ${count}`;
                this.recordEvent('AI', this.lastAction, { count });
            } catch (error) {
                this.captureError(error, 'action:enemy');
            }
        },

        resetScene() {
            try {
                prepareCleanDebugScene();
                this.lastAction = 'ESCENA REINICIADA';
                this.recordEvent('LIFECYCLE', 'Escena de depuración reconstruida.');
                dispatchUpdate();
            } catch (error) {
                this.captureError(error, 'action:reset');
            }
        }
    };

    function num(value) {
        return Number.isFinite(Number(value)) ? Number(value) : 0;
    }

    function normalizeResult(result) {
        if (result && typeof result === 'object' && 'summary' in result) {
            return { summary: String(result.summary), details: result.details ?? {} };
        }
        return { summary: String(result ?? 'OK'), details: {} };
    }

    function nextFrame() {
        return new Promise(resolve => requestAnimationFrame(() => resolve()));
    }

    function captureStorage() {
        const keys = ['bombermanRogueRun', 'bombermanBestDepth', 'bombermanBestScore'];
        return Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)]));
    }

    function restoreStorage(snapshot) {
        if (!snapshot) return;
        for (const [key, value] of Object.entries(snapshot)) {
            if (value === null) localStorage.removeItem(key);
            else localStorage.setItem(key, value);
        }
    }

    function stopDebugLoop() {
        const state = getState();
        if (!state) return;
        if (state.rafId) cancelAnimationFrame(state.rafId);
        state.rafId = 0;
        state.isPlaying = false;
    }

    function startDebugLoop() {
        const state = getState();
        if (!state || !state.isPlaying || state.rafId) return;
        state.lastTime = performance.now();
        state.rafId = requestAnimationFrame(gameLoop);
    }

    function prepareCleanDebugScene() {
        stopDebugLoop();
        const state = getState();
        if (!state) throw new Error('gameState no disponible.');

        if (typeof resetWorldRuntimeState === 'function') resetWorldRuntimeState();
        if (typeof resetPlayerRuntimeState === 'function') resetPlayerRuntimeState();
        if (typeof resetRelicModifiers === 'function') resetRelicModifiers();
        if (typeof resetBombHandlingState === 'function') resetBombHandlingState();
        if (typeof resetCombatFeedbackForRun === 'function') resetCombatFeedbackForRun();

        state.runNumber = Math.max(1, Number(localStorage.getItem('bombermanRogueRun') || 1));
        if (typeof initLevel !== 'function') throw new Error('initLevel() no disponible.');
        initLevel();
        state.isPlaying = true;
        state.paused = false;
        state.lastTime = performance.now();
        state.rafId = 0;
        DEBUG_MODE.paused = false;
        DEBUG_MODE.stepRequested = false;
        DEBUG_MODE.resetNavigation();
        if (typeof updateUI === 'function') updateUI(true);
        if (typeof draw === 'function') draw();
        startDebugLoop();
    }

    function restorePlayableDebugScene() {
        try {
            prepareCleanDebugScene();
        } catch (error) {
            DEBUG_MODE.captureError(error, 'restore-debug-scene');
        }
    }

    function emptyNavigation(note) {
        return {
            available: false,
            mode: 'none',
            note,
            player: { tile: { x: -1, y: -1 }, reachableTiles: 0, truncated: false, junctions: 0, deadEnds: 0, options: [], treeEdges: [], cells: [] },
            enemies: []
        };
    }

    function entityTile(entity, kind) {
        if (typeof gridCurrentTile === 'function') {
            try { return gridCurrentTile(entity, kind); } catch (_) {}
        }
        const state = getState();
        if (!entity || !state) return { x: -1, y: -1 };
        if (kind === 'player') {
            return { x: Math.floor((num(entity.x) + num(entity.width) / 2) / TILE_SIZE), y: Math.floor((num(entity.y) + num(entity.height) / 2) / TILE_SIZE) };
        }
        return { x: Math.floor(num(entity.x) / TILE_SIZE), y: Math.floor(num(entity.y) / TILE_SIZE) };
    }

    function cellOptions(kind, entity, tile) {
        return DIRS.filter(dir => isCellPassable(kind, entity, tile.x + dir.dx, tile.y + dir.dy, tile, false)).map(d => d.dir);
    }

    function isCellPassable(kind, entity, x, y, currentTile, ignoreBombs = false) {
        const state = getState();
        if (!state || !Array.isArray(state.grid) || !gridInsideLocal(x, y)) return false;

        const canFly = kind === 'enemy' && !!entity?.type?.canFly;
        if (typeof gridTileIsBlocked === 'function' && gridTileIsBlocked(x, y, { canFly })) return false;
        const tileType = state.grid[y]?.[x];
        if (tileType === TYPES.WALL || (!canFly && tileType === TYPES.BLOCK)) return false;
        if (ignoreBombs) return true;

        if (kind === 'player') {
            const bomb = state.bombs?.find(b => b.x === x && b.y === y);
            if (bomb && !(currentTile && currentTile.x === x && currentTile.y === y)) return false;
            if (typeof gridCanOccupy === 'function') {
                const center = { x: x * TILE_SIZE + TILE_SIZE / 2, y: y * TILE_SIZE + TILE_SIZE / 2 };
                const topLeft = { x: center.x - entity.width / 2, y: center.y - entity.height / 2 };
                return gridCanOccupy(entity, topLeft.x, topLeft.y, { kind: 'player' });
            }
            return true;
        }

        const bomb = state.bombs?.find(b => b.x === x && b.y === y);
        if (bomb && !(currentTile && currentTile.x === x && currentTile.y === y)) return false;
        if (typeof gridCanOccupy === 'function') {
            const center = { x: x * TILE_SIZE + TILE_SIZE / 2, y: y * TILE_SIZE + TILE_SIZE / 2 };
            return gridCanOccupy(entity, center.x, center.y, {
                kind: 'enemy',
                canFly,
                allowCurrentBombTile: true,
                ignoreBombs: false
            });
        }
        return true;
    }

    function gridInsideLocal(x, y) {
        const state = getState();
        return !!state && x >= 0 && y >= 0 && x < state.gridWidth && y < state.gridHeight;
    }

    function buildReachable(kind, entity, start, maxNodes) {
        const queue = [{ x: start.x, y: start.y }];
        let cursor = 0;
        const visited = new Set([`${start.x},${start.y}`]);
        const parent = new Map();
        const cells = [];
        const edges = [];
        const startKey = `${start.x},${start.y}`;

        while (cursor < queue.length && visited.size <= maxNodes) {
            const current = queue[cursor++];
            const currentKey = `${current.x},${current.y}`;
            cells.push({ x: current.x, y: current.y });

            for (const dir of DIRS) {
                const nx = current.x + dir.dx;
                const ny = current.y + dir.dy;
                const key = `${nx},${ny}`;
                if (visited.has(key) || !isCellPassable(kind, entity, nx, ny, start, false)) continue;
                visited.add(key);
                parent.set(key, currentKey);
                edges.push([{ x: current.x, y: current.y }, { x: nx, y: ny }]);
                queue.push({ x: nx, y: ny });
                if (visited.size >= maxNodes) break;
            }
        }

        return {
            parent,
            cells,
            edges,
            truncated: cursor < queue.length,
            startKey
        };
    }

    function shortestPathTo(start, target, kind, entity, reachable) {
        const targetKey = `${target.x},${target.y}`;
        if (start.x === target.x && start.y === target.y) return [{ ...start }];
        if (!reachable.parent.has(targetKey)) return [];

        const path = [];
        let key = targetKey;
        let guard = 0;
        while (key && guard++ < 120) {
            const [x, y] = key.split(',').map(Number);
            path.push({ x, y });
            if (x === start.x && y === start.y) break;
            key = reachable.parent.get(key);
        }
        if (!path.length || path[path.length - 1].x !== start.x || path[path.length - 1].y !== start.y) return [];
        path.reverse();
        return path;
    }

    function countJunctions(cells, kind, entity) {
        let count = 0;
        for (const cell of cells) {
            if (cellOptions(kind, entity, cell).length >= 3) count++;
        }
        return count;
    }

    function countDeadEnds(cells, kind, entity) {
        let count = 0;
        for (const cell of cells) {
            if (cellOptions(kind, entity, cell).length <= 1) count++;
        }
        return count;
    }

    function buildNavigationSignature(state, player) {
        const p = entityTile(player, 'player');
        const enemyPart = (state.enemies || []).slice(0, 16).map(e => {
            const t = entityTile(e, 'enemy');
            return `${t.x},${t.y}`;
        }).join(';');
        const bombPart = (state.bombs || []).map(b => `${b.x},${b.y}`).sort().join(';');
        return [state.gridWidth, state.gridHeight, state.level, state.blocksBroken || 0, p.x, p.y, enemyPart, bombPart].join('|');
    }

    function instrumentRuntime() {
        if (!enabled || window.__BOMBER_DEBUG_INSTRUMENTED) return;
        window.__BOMBER_DEBUG_INSTRUMENTED = true;

        const originalRAF = window.requestAnimationFrame.bind(window);
        void originalRAF; // Mantener referencia explícita; el engine sigue usando el RAF nativo.

        const runtimeErrorHandler = event => {
            if (event instanceof ErrorEvent || event.error || event.message) {
                DEBUG_MODE.captureError(event.error || event.message, 'window.error', {
                    url: event.filename || '',
                    line: event.lineno || 0,
                    column: event.colno || 0
                });
            }
        };
        window.addEventListener('error', runtimeErrorHandler);
        window.addEventListener('error', event => {
            const target = event.target;
            if (target && target !== window) {
                const url = target.src || target.href || '';
                DEBUG_MODE.captureError(new Error(`Recurso no cargado: ${url || target.tagName}`), 'resource.error', { url });
            }
        }, true);
        window.addEventListener('unhandledrejection', event => DEBUG_MODE.captureError(event.reason, 'unhandledrejection'));

        if (!window.__BOMBER_DEBUG_CONSOLE_HOOKED) {
            const originalConsoleError = console.error.bind(console);
            console.error = (...args) => {
                try { DEBUG_MODE.captureError(new Error(args.map(String).join(' ')), 'console.error'); } catch (_) {}
                originalConsoleError(...args);
            };
            window.__BOMBER_DEBUG_CONSOLE_HOOKED = true;
        }

        const hooks = [
            ['initLevel', 'WORLD', args => `initLevel() · depth=${getState()?.level ?? '—'}`],
            ['completeLevel', 'WORLD', () => `completeLevel() · depth=${getState()?.level ?? '—'}`],
            ['gameOver', 'LIFECYCLE', args => `gameOver(${String(args?.[0] ?? 'unknown')})`],
            ['startNextDepth', 'WORLD', () => `startNextDepth() · depth=${getState()?.level ?? '—'}`],
            ['beginNewRun', 'LIFECYCLE', () => 'beginNewRun()'],
            ['finishRun', 'LIFECYCLE', args => `finishRun(${String(args?.[0] ?? 'unknown')})`]
        ];

        for (const [name, type, formatter] of hooks) wrapGlobalFunction(name, type, formatter);
    }

    function wrapGlobalFunction(name, type, formatter) {
        if (typeof window[name] !== 'function') return;
        const marker = `__BOMBER_DEBUG_WRAPPED_${name}`;
        if (window[marker]) return;
        const original = window[name];
        const wrapped = function(...args) {
            DEBUG_MODE.recordEvent(type, formatter(args));
            return original.apply(this, args);
        };
        try {
            window[name] = wrapped;
            window[marker] = true;
        } catch (_) {}
    }

    const DEBUG_TESTS = {
        movement: async () => {
            prepareTestScene();
            const p = getPlayer();
            const state = getState();
            const cell = findEmptyCell(true);
            setPlayerAt(cell);
            const before = { x: p.x, y: p.y };
            state.keys = { ArrowRight: true };
            for (let i = 0; i < 12; i++) updatePlayerMovement(16.6667);
            state.keys = {};
            const after = { x: p.x, y: p.y };
            if (!(after.x > before.x + 1)) throw new Error('El jugador no avanzó hacia la derecha.');
            if (Math.abs(Number(p.vy) || 0) > 0.05) throw new Error('El movimiento cardinal produjo VY.');
            return {
                summary: `X ${before.x.toFixed(1)} → ${after.x.toFixed(1)} · Δ${(after.x - before.x).toFixed(1)}px`,
                details: { cell, before, after, deltaX: after.x - before.x, vx: p.vx, vy: p.vy, cardinal: true }
            };
        },

        bombs: async () => {
            prepareTestScene();
            const p = getPlayer();
            const state = getState();
            const cell = findEmptyCell();
            setPlayerAt(cell);
            state.enemies = [];
            state.hazards = [];
            const placed = typeof placeBomb === 'function' && placeBomb('debug-test');
            if (!placed) throw new Error('No se pudo colocar la bomba.');
            if (state.bombs.length !== 1) throw new Error(`Bombas inesperadas: ${state.bombs.length}.`);
            const bomb = state.bombs[0];
            if (typeof explodeBomb !== 'function') throw new Error('explodeBomb() no disponible.');
            explodeBomb(0);
            if (state.bombs.length !== 0) throw new Error('La bomba no fue removida.');
            if (!state.explosions.length) throw new Error('No se generaron celdas de explosión.');
            if (p.bombsPlaced !== 0) throw new Error(`bombsPlaced quedó en ${p.bombsPlaced}.`);
            return {
                summary: `${state.explosions.length} celdas · rango ${bomb.range}`,
                details: {
                    bomb: { x: bomb.x, y: bomb.y, range: bomb.range, fuseTotal: bomb.fuseTotal },
                    explosionCells: state.explosions.map(e => ({ x: e.x, y: e.y })),
                    bombsRemaining: state.bombs.length,
                    bombsPlaced: p.bombsPlaced
                }
            };
        },

        damage: async () => {
            prepareTestScene();
            const p = getPlayer();
            const state = getState();
            if (typeof takeDamage !== 'function') throw new Error('takeDamage() no disponible.');
            p.health = 3;
            p.isInvincible = false;
            p.invincibleTimer = 0;
            p.lastDamageFrame = -1;
            state.animFrame = 1;
            const first = takeDamage('debug-test-1', p.x, p.y);
            const afterFirst = p.health;
            const second = takeDamage('debug-test-2', p.x, p.y);
            const blocked = second === false && p.health === afterFirst;
            if (first !== true) throw new Error('El primer daño no fue aplicado.');
            if (!blocked) throw new Error('El segundo golpe no quedó bloqueado por inmunidad.');
            if (typeof updatePlayerInvulnerability === 'function') updatePlayerInvulnerability(1600);
            p.isInvincible = false;
            p.invincibleTimer = 0;
            state.animFrame += 1;
            const third = takeDamage('debug-test-3', p.x, p.y);
            if (third !== true || p.health !== 1) throw new Error('El tercer golpe no restó el HP esperado.');
            return {
                summary: `HP 3 → ${afterFirst} → ${p.health} · inmunidad OK`,
                details: { initialHp: 3, afterFirst, afterSecond: afterFirst, finalHp: p.health, firstApplied: first, secondBlocked: blocked, thirdApplied: third }
            };
        },

        traps: async () => {
            prepareTestScene();
            const state = getState();
            if (typeof triggerHazard !== 'function' || typeof TRAP_TYPES === 'undefined') throw new Error('Sistema de trampas no disponible.');
            const cell = findEmptyCell();
            const types = Object.values(TRAP_TYPES);
            const results = [];
            for (const type of types) {
                const hazard = { x: cell.x, y: cell.y, id: `debug-${type}`, type, triggered: false, visible: false, telegraphTimer: 0, flashTimer: 0, effectTimer: 0, delayTimer: 0, effectConsumed: false, detonated: false, phase: 0 };
                const first = triggerHazard(hazard, 'debug-test');
                const second = triggerHazard(hazard, 'debug-test-second');
                if (first !== true || second !== false) throw new Error(`Trampa inválida: ${type}.`);
                results.push({ type, first, second, triggered: hazard.triggered, visible: hazard.visible, effectConsumed: hazard.effectConsumed });
            }
            state.hazards = [];
            return { summary: `${types.length} tipos · 1 activación c/u`, details: { cell, traps: results } };
        },

        enemies: async () => {
            prepareTestScene();
            const state = getState();
            const p = getPlayer();
            state.bombs = [];
            state.explosions = [];
            state.hazards = [];
            state.enemies = [];
            const cell = findEmptyCell(true);
            setPlayerAt(cell);
            let enemyCell = findEnemyTestCell(cell);
            const e = {
                x: enemyCell.x * TILE_SIZE + TILE_SIZE / 2,
                y: enemyCell.y * TILE_SIZE + TILE_SIZE / 2,
                width: TILE_SIZE * 0.75,
                height: TILE_SIZE * 0.75,
                type: ENEMY_TYPES.RASTRERO,
                vx: -1.4, vy: 0, baseSpeed: 1.4,
                lastDirection: 'left', desiredDirection: 'left', __gridAnchor: 'center'
            };
            state.enemies.push(e);
            if (typeof ensureEnemyMotionStateV312 === 'function') ensureEnemyMotionStateV312(e, 0);
            for (let i = 0; i < 20; i++) updateEnemyAI(100);
            const nav = DEBUG_MODE.getNavigationSnapshot(true);
            const item = nav.enemies[0];
            if (!e.ai) throw new Error('La IA no creó su estado.');
            if (!item) throw new Error('La navegación no encontró al enemigo.');
            return {
                summary: `${e.ai.behavior || '—'} · ${e.ai.direction || '—'} · ruta ${item.routeLength}`,
                details: { playerTile: entityTile(p, 'player'), enemyTile: item.tile, behavior: e.ai.behavior, alert: e.ai.alert, currentDirection: item.currentDirection, desiredDirection: item.desiredDirection, seesPlayer: item.seesPlayer, reachableTiles: item.reachableTiles, routeLength: item.routeLength, canReachPlayer: item.canReachPlayer, options: item.options }
            };
        },

        camera: async () => {
            prepareTestScene();
            const p = getPlayer();
            const state = getState();
            const cell = findEmptyCell();
            setPlayerAt(cell);
            resetCameraToPlayer();
            const before = { x: state.camera.x, y: state.camera.y };
            p.x = Math.max(TILE_SIZE, (state.gridWidth - 3) * TILE_SIZE - p.width / 2);
            p.y = Math.max(TILE_SIZE, (state.gridHeight - 3) * TILE_SIZE - p.height / 2);
            for (let i = 0; i < 12; i++) updateCamera(16.6667);
            const bounds = getCameraBounds();
            const after = { x: state.camera.x, y: state.camera.y };
            if (after.x < -0.01 || after.x > bounds.maxX + 0.01 || after.y < -0.01 || after.y > bounds.maxY + 0.01) throw new Error('La cámara salió de sus límites.');
            if (Math.abs(after.x - before.x) < 0.01 && Math.abs(after.y - before.y) < 0.01) throw new Error('La cámara no siguió al jugador.');
            return { summary: `(${before.x.toFixed(0)},${before.y.toFixed(0)}) → (${after.x.toFixed(0)},${after.y.toFixed(0)})`, details: { before, after, target: { x: state.camera.targetX, y: state.camera.targetY }, bounds } };
        },

        restart: async () => {
            prepareTestScene();
            const state = getState();
            const p = getPlayer();
            p.health = 1; p.vx = 4; p.vy = 2; p.bombsPlaced = 2;
            state.bombs = [{ x: 2, y: 2, timer: 10 }];
            state.explosions = [{ x: 2, y: 2, timer: 300 }];
            state.enemies = [{ x: 100, y: 100 }];
            state.hazards = [{ x: 3, y: 3, triggered: true }];
            state.bossProjectiles = [{ x: 1, y: 1 }];
            state.particles = [{ x: 1, y: 1 }];
            state.shakeTimer = 100;
            state.shakeIntensity = 9;
            if (typeof resetWorldRuntimeState !== 'function' || typeof resetPlayerRuntimeState !== 'function') throw new Error('Funciones de reset no disponibles.');
            resetWorldRuntimeState();
            resetPlayerRuntimeState();
            initLevel();
            if (p.health !== 3) throw new Error(`HP quedó en ${p.health}.`);
            if (p.bombsPlaced !== 0) throw new Error(`bombsPlaced quedó en ${p.bombsPlaced}.`);
            if (p.vx !== 0 || p.vy !== 0) throw new Error('La velocidad no fue limpiada.');
            if (state.bombs.length || state.explosions.length || state.bossProjectiles.length || state.shakeTimer) throw new Error('Persistieron objetos del estado anterior.');
            return { summary: 'estado limpio · reset verificado', details: { health: p.health, bombsPlaced: p.bombsPlaced, velocity: { x: p.vx, y: p.vy }, bombs: state.bombs.length, explosions: state.explosions.length, projectiles: state.bossProjectiles.length, shakeTimer: state.shakeTimer } };
        }
    };

    function prepareTestScene() {
        stopDebugLoop();
        const state = getState();
        if (!state) throw new Error('gameState no disponible.');
        if (typeof resetWorldRuntimeState === 'function') resetWorldRuntimeState();
        if (typeof resetPlayerRuntimeState === 'function') resetPlayerRuntimeState();
        if (typeof resetRelicModifiers === 'function') resetRelicModifiers();
        if (typeof resetBombHandlingState === 'function') resetBombHandlingState();
        if (typeof resetCombatFeedbackForRun === 'function') resetCombatFeedbackForRun();
        state.runNumber = 1;
        initLevel();
        state.isPlaying = true;
        state.paused = false;
        state.lastTime = performance.now();
        state.rafId = 0;
        DEBUG_MODE.paused = false;
        DEBUG_MODE.stepRequested = false;
        DEBUG_MODE.resetNavigation();
    }

    function findEmptyCell(preferCorridor = false) {
        const state = getState();
        const candidates = [];
        for (let y = 1; y < state.gridHeight - 1; y++) {
            for (let x = 1; x < state.gridWidth - 1; x++) {
                if (state.grid[y]?.[x] !== TYPES.EMPTY) continue;
                if (preferCorridor && state.grid[y]?.[x + 1] === TYPES.EMPTY && state.grid[y]?.[x + 2] === TYPES.EMPTY) return { x, y };
                candidates.push({ x, y });
            }
        }
        return candidates[0] || { x: 1, y: 1 };
    }

    function findEnemyTestCell(playerCell) {
        const state = getState();
        for (let radius = 3; radius < 10; radius++) {
            const candidates = [
                { x: playerCell.x + radius, y: playerCell.y },
                { x: playerCell.x - radius, y: playerCell.y },
                { x: playerCell.x, y: playerCell.y + radius },
                { x: playerCell.x, y: playerCell.y - radius }
            ];
            for (const cell of candidates) {
                if (gridInsideLocal(cell.x, cell.y) && state.grid[cell.y]?.[cell.x] === TYPES.EMPTY) return cell;
            }
        }
        return findEmptyCell(true);
    }

    function setPlayerAt(cell) {
        const p = getPlayer();
        const center = { x: cell.x * TILE_SIZE + TILE_SIZE / 2, y: cell.y * TILE_SIZE + TILE_SIZE / 2 };
        p.x = center.x - p.width / 2;
        p.y = center.y - p.height / 2;
        p.vx = 0; p.vy = 0;
        p.isMoving = false;
        p.inputAxis = null;
        p.inputBuffer = null;
        p.inputBufferTimer = 0;
        const state = getState();
        state.keys = {};
        state.touchControls = { x: 0, y: 0 };
        if (typeof resetCameraToPlayer === 'function') resetCameraToPlayer();
    }

    function dispatchUpdate() {
        if (!enabled) return;
        window.dispatchEvent(new CustomEvent('bomber-debug-updated'));
    }

    instrumentRuntime();

    window.DEBUG_MODE = DEBUG_MODE;
    window.DEBUG_TESTS = DEBUG_TESTS;
    window.debugRecordEvent = (...args) => DEBUG_MODE.recordEvent(...args);
    window.debugCaptureError = (...args) => DEBUG_MODE.captureError(...args);
    window.debugStateSnapshot = () => DEBUG_MODE.snapshot();
    window.debugNavigationSnapshot = force => DEBUG_MODE.getNavigationSnapshot(!!force);

    if (!enabled) return;

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

    DEBUG_MODE.recordEvent('DEBUG', 'Debug Engine v3.16.3 cargado en el mismo runtime.');
    DEBUG_MODE.recordEvent('DEBUG', 'Usá RESET para activar una escena de depuración limpia.');
})();
