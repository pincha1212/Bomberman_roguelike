// Bomberman Roguelike v3.16.5 — Debug Engine
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
    const EVENT_DEDUPE_MS = 850;
    const EVENT_DEDUPE_TYPES = new Set(['AI', 'DEBUG', 'VISUAL', 'INFO', 'WORLD']);

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
        lastFrameTimestamp: 0,
        frameIntervalMs: 0,
        avgFrameIntervalMs: 0,
        minFrameIntervalMs: Infinity,
        maxFrameIntervalMs: 0,
        eventCountRaw: 0,
        suppressedEvents: 0,
        eventLog: [],
        runtimeErrors: [],
        testResults: [],
        lastTest: null,
        lastAction: '—',
        navigationCache: null,
        navigationSignature: '',
        navigationAt: 0,
        enemyProgress: new WeakMap(),
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

            // "loopMs" es tiempo de trabajo del JS, no tiempo entre frames.
            // La cadencia real se mide usando los timestamps de requestAnimationFrame.
            if (this.lastFrameTimestamp > 0) {
                const interval = Math.max(0, timestamp - this.lastFrameTimestamp);
                if (interval < 1000) {
                    this.frameIntervalMs = interval;
                    this.avgFrameIntervalMs = this.avgFrameIntervalMs
                        ? this.avgFrameIntervalMs * 0.90 + interval * 0.10
                        : interval;
                    this.minFrameIntervalMs = Math.min(this.minFrameIntervalMs, interval);
                    this.maxFrameIntervalMs = Math.max(this.maxFrameIntervalMs, interval);
                }
            }
            this.lastFrameTimestamp = timestamp;

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
            const normalizedMessage = String(message || '');
            const normalizedData = data && typeof data === 'object' ? data : null;
            const now = performance.now();
            this.eventCountRaw += 1;

            // La IA puede llamar debugRecordEvent() muchas veces por segundo sin
            // haber cambiado realmente de estado. Colapsamos solo repeticiones
            // idénticas y conservamos el último contador. Los cambios reales
            // (tile, dirección, alerta, etc.) siguen apareciendo como eventos nuevos.
            const previous = this.eventLog[this.eventLog.length - 1];
            const fingerprint = normalizedType + '|' + normalizedMessage + '|' + safeJson(normalizedData);
            if (previous && EVENT_DEDUPE_TYPES.has(normalizedType) && previous.fingerprint === fingerprint && now - previous.time <= EVENT_DEDUPE_MS) {
                previous.repeatCount = Number(previous.repeatCount || 1) + 1;
                previous.lastTime = now;
                previous.lastWallTime = new Date().toLocaleTimeString('es-AR', { hour12: false });
                this.suppressedEvents += 1;
                dispatchUpdate();
                return;
            }

            const item = {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                time: now,
                wallTime: new Date().toLocaleTimeString('es-AR', { hour12: false }),
                type: normalizedType,
                message: normalizedMessage,
                data: normalizedData,
                fingerprint,
                repeatCount: 1,
                lastTime: now,
                lastWallTime: new Date().toLocaleTimeString('es-AR', { hour12: false })
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
                    workMs: this.avgFrameMs,
                    frameIntervalMs: this.frameIntervalMs,
                    avgFrameIntervalMs: this.avgFrameIntervalMs,
                    loopMs: this.loopMs,
                    updateMs: this.updateMs,
                    drawMs: this.drawMs,
                    minMs: Number.isFinite(this.minFrameMs) ? this.minFrameMs : 0,
                    maxMs: this.maxFrameMs,
                    minIntervalMs: Number.isFinite(this.minFrameIntervalMs) ? this.minFrameIntervalMs : 0,
                    maxIntervalMs: this.maxFrameIntervalMs
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
                rawEvents: this.eventCountRaw,
                suppressedEvents: this.suppressedEvents,
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
                const ai = enemy.ai || {};
                const currentDirection = String(ai.direction || enemy.lastDirection || '—').toUpperCase();
                const desiredDirection = String(ai.desiredDirection || enemy.desiredDirection || '—').toUpperCase();
                const routeNextDirection = path.length >= 2 ? directionBetween(path[0], path[1]) : '—';
                const progress = observeEnemyProgress(enemy, index, tile, currentDirection, desiredDirection, options);
                const target = inferEnemyTarget(ai, playerTile, enemy, tile);
                const currentPassable = enemyCurrentDirectionPassable(enemy, currentDirection, ai.alert);
                return {
                    index,
                    tile,
                    behavior: ai.behavior || '—',
                    alert: ai.alert || '—',
                    currentDirection,
                    desiredDirection,
                    actualDirection: progress.actualDirection,
                    actualSpeed: progress.actualSpeed,
                    movementState: progress.movementState,
                    distanceToCenter: progress.distanceToCenter,
                    sameTileMs: progress.sameTileMs,
                    noProgressMs: progress.noProgressMs,
                    stuckLikely: progress.stuckLikely,
                    turnReady: progress.turnReady,
                    currentPassable,
                    nextTile: progress.nextTile,
                    seesPlayer: !!ai.seesPlayer,
                    options,
                    reachableTiles: reach.cells.length,
                    truncated: reach.truncated,
                    junctions,
                    route: path,
                    routeLength: Math.max(0, path.length - 1),
                    routeNextDirection,
                    routeAlignment: compareRouteAlignment(routeNextDirection, currentDirection, desiredDirection),
                    canReachPlayer: path.length > 0,
                    target
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
                    currentDirection: String(player.dir || '—').toUpperCase(),
                    desiredDirection: String(player.desiredDirection || player.inputAxis || '—').toUpperCase(),
                    actualSpeed: Math.hypot(Number(player.vx) || 0, Number(player.vy) || 0),
                    movementState: playerMovementState(player, playerOptions),
                    distanceToCenter: distanceToTileCenter(player, playerTile),
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
            this.enemyProgress = new WeakMap();
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
            this.eventCountRaw = 0;
            this.suppressedEvents = 0;
            this.recordEvent('DEBUG', 'Event Log limpiado.');
        },

        buildTestReport() {
            const snapshot = this.snapshot();
            const total = this.testResults.length;
            const passed = this.testResults.filter(r => r.status === 'PASS').length;
            const failed = this.testResults.filter(r => r.status === 'FAIL').length;
            const lines = [
                'BOMBERMAN ROGUELIKE — DEBUG TEST COMPLETO',
                `Fecha: ${new Date().toLocaleString('es-AR')}`,
                `Suite: ${total} pruebas registradas · ${passed} PASS · ${failed} FAIL`,
                '',
                '=== RESUMEN TESTS ===',
                ...this.testResults.map((r, index) => `${index + 1}. ${String(r.name || 'TEST').toUpperCase()} — ${r.status} — ${Number(r.ms || 0).toFixed(1)} ms — ${r.summary || r.result || 'Sin resumen'}`),
                '',
                '=== INSPECTOR DE TEST ===',
                this.lastTest ? JSON.stringify({
                    name: this.lastTest.name,
                    status: this.lastTest.status,
                    summary: this.lastTest.summary,
                    ms: Number(this.lastTest.ms || 0).toFixed(1),
                    details: this.lastTest.details || {}
                }, null, 2) : 'Sin prueba seleccionada.',
                '',
                '=== ESTADO ===',
                `status=${snapshot.status} · playing=${snapshot.engine?.playing} · gamePaused=${snapshot.engine?.gamePaused} · debugPaused=${snapshot.engine?.debugPaused}`,
                `RAF=${snapshot.engine?.rafId || 0} · frame=${this.frameCount} · errors=${snapshot.errors} · eventos=${snapshot.events}/${snapshot.rawEvents || snapshot.events} · repetidos colapsados=${snapshot.suppressedEvents || 0}`,
                '',
                '=== PERFORMANCE ===',
                `FPS=${Number(snapshot.performance.fps || 0).toFixed(1)} · intervalo RAF=${Number(snapshot.performance.avgFrameIntervalMs || 0).toFixed(2)}ms`,
                `trabajo JS/frame=${Number(snapshot.performance.workMs || 0).toFixed(2)}ms · update=${Number(snapshot.performance.updateMs || 0).toFixed(2)}ms · draw=${Number(snapshot.performance.drawMs || 0).toFixed(2)}ms`,
                `trabajo min/max=${Number(snapshot.performance.minMs || 0).toFixed(2)}/${Number(snapshot.performance.maxMs || 0).toFixed(2)}ms · intervalo min/max=${Number(snapshot.performance.minIntervalMs || 0).toFixed(2)}/${Number(snapshot.performance.maxIntervalMs || 0).toFixed(2)}ms`,
                '',
                '=== PLAYER ===',
                compactPlayerLine(snapshot.player),
                '',
                '=== WORLD ===',
                compactWorldLine(snapshot.world),
                '',
                '=== NAVEGACIÓN ===',
                compactNavigationReport(snapshot.navigation),
                '',
                '=== EVENT LOG (AGRUPADO) ===',
                this.eventLog.length ? this.eventLog.map(item => {
                    const repeat = Number(item.repeatCount || 1);
                    const suffix = item.data ? ` · ${safeJson(item.data)}` : '';
                    return `[${item.wallTime}] ${item.type} ${item.message}${repeat > 1 ? ` · ×${repeat}` : ''}${suffix}`;
                }).join('\n') : 'Sin eventos.',
                '',
                '=== RUNTIME ERRORS ===',
                this.runtimeErrors.length ? this.runtimeErrors.map((e, index) => {
                    const loc = e.url ? ` · ${e.url}` : '';
                    return `${index + 1}. [${e.wallTime}] ${e.source}: ${e.message}${loc}${e.stack ? `\n${e.stack.split('\n').slice(0,4).join('\n')}` : ''}`;
                }).join('\n\n') : 'Sin errores de runtime.'
            ];
            return lines.join('\n');
        },

        async copyTestReport() {
            if (!this.enabled) return { ok: false, message: 'Debug no activo.' };
            const report = this.buildTestReport();
            try {
                if (navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(report);
                } else {
                    const textarea = document.createElement('textarea');
                    textarea.value = report;
                    textarea.setAttribute('readonly', '');
                    textarea.style.position = 'fixed';
                    textarea.style.opacity = '0';
                    textarea.style.pointerEvents = 'none';
                    document.body.appendChild(textarea);
                    textarea.select();
                    const ok = document.execCommand('copy');
                    textarea.remove();
                    if (!ok) throw new Error('El navegador rechazó la copia al portapapeles.');
                }
                this.lastAction = 'Reporte de tests copiado';
                this.recordEvent('DEBUG', 'Reporte completo de tests copiado al portapapeles.', { tests: this.testResults.length });
                return { ok: true, message: 'Reporte copiado.' };
            } catch (error) {
                this.captureError(error, 'clipboard.copy');
                this.lastAction = 'Error al copiar reporte';
                return { ok: false, message: error?.message || 'No se pudo copiar el reporte.' };
            }
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

    function distanceToTileCenter(entity, tile) {
        if (!entity || !tile) return 0;
        const cx = tile.x * TILE_SIZE + TILE_SIZE / 2;
        const cy = tile.y * TILE_SIZE + TILE_SIZE / 2;
        const ex = Number(entity.x) + (entity.width ? Number(entity.width) / 2 : 0);
        const ey = Number(entity.y) + (entity.height ? Number(entity.height) / 2 : 0);
        return Math.hypot(ex - cx, ey - cy);
    }

    function movementDirection(vx, vy) {
        const x = Number(vx) || 0;
        const y = Number(vy) || 0;
        if (Math.abs(x) < 0.01 && Math.abs(y) < 0.01) return '—';
        return Math.abs(x) >= Math.abs(y) ? (x > 0 ? 'RIGHT' : 'LEFT') : (y > 0 ? 'DOWN' : 'UP');
    }

    function playerMovementState(player, options = []) {
        const speed = Math.hypot(Number(player?.vx) || 0, Number(player?.vy) || 0);
        if (speed > 0.08) return 'MOVIÉNDOSE';
        if (player?.isMoving) return 'INPUT';
        if ((player?.desiredDirection || player?.inputAxis) && options.length) return 'LISTO PARA GIRAR';
        return 'DETENIDO';
    }

    function enemyCurrentDirectionPassable(enemy, currentDirection, alert) {
        if (typeof enemyDirectionV312 !== 'function' || typeof enemyDirectionPassableV312 !== 'function') return null;
        try { return !!enemyDirectionPassableV312(enemy, enemyDirectionV312(String(currentDirection || '').toLowerCase()), alert === 'flee'); } catch (_) { return null; }
    }

    function observeEnemyProgress(enemy, index, tile, currentDirection, desiredDirection, options) {
        const now = performance.now();
        const previous = DEBUG_MODE.enemyProgress.get(enemy);
        const x = Number(enemy?.x) || 0;
        const y = Number(enemy?.y) || 0;
        const speed = Math.hypot(Number(enemy?.vx) || 0, Number(enemy?.vy) || 0);
        const center = { x: tile.x * TILE_SIZE + TILE_SIZE / 2, y: tile.y * TILE_SIZE + TILE_SIZE / 2 };
        const distanceToCenter = Math.hypot((x) - center.x, (y) - center.y);
        const actualDirection = movementDirection(enemy?.vx, enemy?.vy);
        const currentKey = `${tile.x},${tile.y}`;
        let sameTileSince = previous?.tileKey === currentKey ? previous.sameTileSince : now;
        let noProgressSince = previous?.movementDistance > 0.4 ? now : (previous?.noProgressSince || now);
        if (previous && Math.hypot(x - previous.x, y - previous.y) > 0.4) noProgressSince = now;
        DEBUG_MODE.enemyProgress.set(enemy, { x, y, tileKey: currentKey, sameTileSince, noProgressSince, movementDistance: previous ? Math.hypot(x - previous.x, y - previous.y) : 0 });

        const ai = enemy?.ai || {};
        const blockedMs = Number(ai.blockedTimer) || 0;
        const stuckMs = Number(ai.stuckTimer) || 0;
        const turnReady = distanceToCenter <= 9;
        const sameTileMs = now - sameTileSince;
        const noProgressMs = now - noProgressSince;
        const wantsTurn = desiredDirection !== '—' && desiredDirection !== currentDirection;
        const currentPassable = enemyCurrentDirectionPassable(enemy, currentDirection, ai.alert);
        const stuckLikely = speed < 0.08 && (blockedMs >= 45 || stuckMs >= 45 || (wantsTurn && turnReady && currentPassable === false));
        let movementState = 'MOVIÉNDOSE';
        if (stuckLikely) movementState = 'ATASCADO';
        else if (currentPassable === false) movementState = 'BLOQUEADO';
        else if (wantsTurn && turnReady) movementState = 'LISTO PARA GIRAR';
        else if (speed < 0.08) movementState = 'DETENIDO';

        let nextTile = null;
        const dir = String(currentDirection || '').toLowerCase();
        if (dir === 'up') nextTile = { x: tile.x, y: tile.y - 1 };
        if (dir === 'down') nextTile = { x: tile.x, y: tile.y + 1 };
        if (dir === 'left') nextTile = { x: tile.x - 1, y: tile.y };
        if (dir === 'right') nextTile = { x: tile.x + 1, y: tile.y };

        return { actualDirection, actualSpeed: speed, movementState, distanceToCenter, sameTileMs, noProgressMs, stuckLikely, turnReady, blockedMs, stuckMs, nextTile, options };
    }

    function inferEnemyTarget(ai, playerTile, enemy, enemyTile) {
        const alert = ai?.alert || ai?.behavior || '—';
        if (alert === 'flee') {
            const offsetX = playerTile.x >= enemyTile.x ? -4 : 4;
            const offsetY = playerTile.y >= enemyTile.y ? -4 : 4;
            return { x: playerTile.x + offsetX, y: playerTile.y + offsetY, reason: 'flee' };
        }
        if (alert === 'surround') {
            if (Number.isFinite(Number(ai?.surroundX)) && ai.surroundX >= 0 && Number.isFinite(Number(ai?.surroundY)) && ai.surroundY >= 0) {
                return { x: ai.surroundX, y: ai.surroundY, reason: 'surround' };
            }
            return { x: playerTile.x, y: playerTile.y, reason: 'surround-pending' };
        }
        if (alert === 'chase' || ai?.seesPlayer) return { x: playerTile.x, y: playerTile.y, reason: 'player' };
        if ((ai?.memoryTimer || 0) > 0 && Number.isFinite(Number(ai?.lastSeenX)) && ai.lastSeenX >= 0) return { x: ai.lastSeenX, y: ai.lastSeenY, reason: 'last-seen' };
        if (Number.isFinite(Number(ai?.patrolX)) && ai.patrolX >= 0 && Number.isFinite(Number(ai?.patrolY)) && ai.patrolY >= 0) return { x: ai.patrolX, y: ai.patrolY, reason: 'patrol' };
        return { x: playerTile.x, y: playerTile.y, reason: 'debug-target' };
    }

    function directionBetween(a, b) {
        if (!a || !b) return '—';
        const dx = Number(b.x) - Number(a.x);
        const dy = Number(b.y) - Number(a.y);
        if (dx > 0) return 'RIGHT';
        if (dx < 0) return 'LEFT';
        if (dy > 0) return 'DOWN';
        if (dy < 0) return 'UP';
        return '—';
    }

    function compareRouteAlignment(routeNextDirection, currentDirection, desiredDirection) {
        if (routeNextDirection === '—') return 'SIN RUTA';
        if (routeNextDirection === desiredDirection && routeNextDirection === currentDirection) return 'ALINEADA';
        if (routeNextDirection === desiredDirection) return 'DESEADA';
        if (routeNextDirection === currentDirection) return 'ACTUAL';
        return 'DESVIADA';
    }

    function compactPlayerLine(player) {
        if (!player) return 'player=NO DISPONIBLE';
        return `tile=${player.tile.x},${player.tile.y} · pos=${player.x.toFixed(1)},${player.y.toFixed(1)} · dir=${player.currentDirection || player.dir} · deseada=${player.desiredDirection || '—'} · speed=${Number(player.actualSpeed || 0).toFixed(2)} · estado=${player.movementState} · alcanzables=${player.reachableTiles}`;
    }

    function compactWorldLine(world) {
        if (!world) return 'world=NO DISPONIBLE';
        return `mapa=${world.width}×${world.height} · depth=${world.depth} · room=${world.room} · threat=${world.threat} · enemies=${world.enemies} · bombs=${world.bombs} · explosions=${world.explosions} · traps=${world.traps} · projectiles=${world.projectiles} · boss=${world.boss}`;
    }

    function compactNavigationReport(nav) {
        if (!nav?.available) return `DISPONIBLE=NO · ${nav?.note || 'sin datos'}`;
        const lines = [];
        lines.push(`modo=${nav.mode} · jugador alcanzables=${nav.player?.reachableTiles || 0} · junctions=${nav.player?.junctions || 0} · deadEnds=${nav.player?.deadEnds || 0} · opciones=${(nav.player?.options || []).join(',') || '—'}`);
        for (const e of (nav.enemies || [])) {
            lines.push(`E${e.index} tile=${e.tile.x},${e.tile.y} · ${e.behavior}/${e.alert} · actual=${e.currentDirection} · deseada=${e.desiredDirection} · real=${e.actualDirection} · estado=${e.movementState} · centro=${Number(e.distanceToCenter || 0).toFixed(1)}px · bloqueado=${e.currentPassable === false ? 'SI' : 'NO'} · atascado=${e.stuckLikely ? 'SI' : 'NO'} · ruta=${e.routeLength} · nextRuta=${e.routeNextDirection} · alineación=${e.routeAlignment} · target=${e.target?.x},${e.target?.y}`);
        }
        return lines.join('\n');
    }

    function num(value) {
        return Number.isFinite(Number(value)) ? Number(value) : 0;
    }

    function normalizeResult(result) {
        if (result && typeof result === 'object' && 'summary' in result) {
            return { summary: String(result.summary), details: result.details ?? {} };
        }
        return { summary: String(result ?? 'OK'), details: {} };
    }

    function safeJson(value) {
        try { return JSON.stringify(value); } catch (_) { return '[datos]'; }
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

    DEBUG_MODE.recordEvent('DEBUG', 'Debug Engine v3.16.5 cargado en el mismo runtime.');
    DEBUG_MODE.recordEvent('DEBUG', 'Usá RESET para activar una escena de depuración limpia.');
})();
