// Bomberman Roguelike v3.20.1 — Debug Engine
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

    const TEST_NAMES = Object.freeze(['movement', 'bombs', 'damage', 'traps', 'enemies', 'ai-stress', 'camera', 'restart']);
    const MAX_EVENTS = 220;
    const MAX_ERRORS = 100;
    const MAX_TEST_RESULTS = 30;
    const MAX_NAV_NODES = 900;
    const MAX_MOTION_TRAIL = 24;
    const AI_STRESS_CASES = 8;
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
        playerProgress: null,
        motionSampleCount: 0,
        aiStress: null,
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

            sampleLiveMotion(timestamp);
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
            const navigation = this.getNavigationSnapshot();
            const livePlayer = this.playerProgress || sampleLiveMotion(performance.now(), true)?.player || null;

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
                    inputDir: Number(player.inputDir || 0),
                    movementState: livePlayer?.movementState || playerMovementState(player, navigation?.player?.options || []),
                    distanceToCenter: num(livePlayer?.distanceToCenter ?? distanceToTileCenter(player, playerTile, 'player')),
                    actualDirection: livePlayer?.actualDirection || movementDirection(player.vx, player.vy),
                    movedPx: num(livePlayer?.movedPx),
                    tileTransitions: Number(livePlayer?.tileTransitions || 0),
                    framesSinceProgress: Number(livePlayer?.framesSinceProgress || 0),
                    sameTileMs: num(livePlayer?.sameTileMs),
                    progressStatus: livePlayer?.progressStatus || 'SIN MUESTRA',
                    trail: Array.isArray(livePlayer?.trail) ? livePlayer.trail.slice(-MAX_MOTION_TRAIL) : []
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
                    workMs: this.loopMs,
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
                navigation,
                aiStress: this.aiStress,
                profiler: window.BOMBER_PROFILER?.snapshot?.() || null
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
            if (!force && this.navigationCache && signature === this.navigationSignature && now - this.navigationAt < 250) {
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
                    previousTile: progress.previousTile,
                    tileTransitions: progress.tileTransitions,
                    movedPx: progress.movedPx,
                    framesSinceProgress: progress.framesSinceProgress,
                    directionChanges: progress.directionChanges,
                    progressStatus: progress.progressStatus,
                    physicalBlocked: !!ai.physicalBlocked,
                    physicalBlockedMs: Number(ai.physicalBlockedTimer || 0),
                    cornerCorrectionMs: Number(ai.cornerCorrectionMs || 0),
                    recoveryCount: Number(ai.recoveryCount || 0),
                    lastRecoveryReason: ai.lastRecoveryReason || '—',
                    recoveryPathNodes: Number(ai.lastRecoveryPathNodes || 0),
                    recoveryPathCalls: Number(ai.recoveryPathCalls || 0),
                    turnLockMs: Number(ai.turnLockTimer || 0),
                    lastTurnDirection: ai.lastTurnDirection || '—',
                    trail: progress.trail,
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

            // El snapshot debe usar una muestra de movimiento válida antes de
            // construir los datos de navegación del jugador.
            const livePlayer = this.playerProgress || sampleLiveMotion(now, true)?.player || null;
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
                    movementState: livePlayer?.movementState || playerMovementState(player, playerOptions),
                    distanceToCenter: num(livePlayer?.distanceToCenter ?? distanceToTileCenter(player, playerTile, 'player')),
                    actualDirection: livePlayer?.actualDirection || movementDirection(player.vx, player.vy),
                    movedPx: num(livePlayer?.movedPx),
                    tileTransitions: Number(livePlayer?.tileTransitions || 0),
                    framesSinceProgress: Number(livePlayer?.framesSinceProgress || 0),
                    progressStatus: livePlayer?.progressStatus || 'SIN MUESTRA',
                    trail: Array.isArray(livePlayer?.trail) ? livePlayer.trail.slice(-MAX_MOTION_TRAIL) : [],
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
            this.playerProgress = null;
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
            this.aiStress = null;
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
                '=== REAL PROFILING ===',
                snapshot.profiler ? `estado=${snapshot.profiler.enabled ? 'ON' : 'OFF'} · muestras=${snapshot.profiler.totalFrames} · FPS=${Number(snapshot.profiler.frame?.fps || 0).toFixed(1)} · avg=${Number(snapshot.profiler.frame?.avgMs || 0).toFixed(2)}ms · p95=${Number(snapshot.profiler.frame?.p95Ms || 0).toFixed(2)}ms · max=${Number(snapshot.profiler.frame?.maxMs || 0).toFixed(2)}ms · sobre presupuesto=${Number(snapshot.profiler.overBudgetPercent || 0).toFixed(1)}%` : 'Profiler sin datos.',
                snapshot.profiler?.systems?.length ? snapshot.profiler.systems.slice(0, 12).map((item, index) => `${index + 1}. ${item.label} · avg=${Number(item.avgMs || 0).toFixed(3)}ms · p95=${Number(item.p95Ms || 0).toFixed(3)}ms · max=${Number(item.maxMs || 0).toFixed(3)}ms`).join('\n') : 'Sin muestras de sistemas.',
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
                '=== DIAGNÓSTICO IA / MOVIMIENTO REAL ===',
                compactMotionDiagnostic(snapshot.navigation),
                '',
                '=== AI STRESS TEST ===',
                compactStressReport(this.aiStress),
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

    function distanceToTileCenter(entity, tile, kind = 'player') {
        if (!entity || !tile) return 0;
        const cx = tile.x * TILE_SIZE + TILE_SIZE / 2;
        const cy = tile.y * TILE_SIZE + TILE_SIZE / 2;
        // Player usa x/y como esquina superior izquierda. Enemy usa x/y como centro.
        const ex = kind === 'enemy' ? Number(entity.x) : Number(entity.x) + (entity.width ? Number(entity.width) / 2 : 0);
        const ey = kind === 'enemy' ? Number(entity.y) : Number(entity.y) + (entity.height ? Number(entity.height) / 2 : 0);
        return Math.hypot(ex - cx, ey - cy);
    }

    function sampleLiveMotion(timestamp = performance.now(), force = false) {
        if (!DEBUG_MODE.enabled) return null;
        const state = getState();
        const player = getPlayer();
        if (!state || !player) return null;
        const now = Number(timestamp) || performance.now();

        const playerTile = entityTile(player, 'player');
        const prevP = DEBUG_MODE.playerProgress;
        const px = Number(player.x) || 0;
        const py = Number(player.y) || 0;
        const pdx = prevP ? px - prevP.x : 0;
        const pdy = prevP ? py - prevP.y : 0;
        const pMoved = Math.hypot(pdx, pdy);
        const pTileKey = `${playerTile.x},${playerTile.y}`;
        const pSameTileSince = prevP?.tileKey === pTileKey ? prevP.sameTileSince : now;
        const pLastProgressAt = pMoved > 0.05 ? now : (prevP?.lastProgressAt || now);
        const pFramesSince = pMoved > 0.05 ? 0 : (prevP?.framesSinceProgress || 0) + 1;
        const pTrail = prevP?.trail ? prevP.trail.slice() : [];
        if (!pTrail.length || pTrail[pTrail.length - 1].x !== playerTile.x || pTrail[pTrail.length - 1].y !== playerTile.y) pTrail.push({ x: playerTile.x, y: playerTile.y });
        if (pTrail.length > MAX_MOTION_TRAIL) pTrail.splice(0, pTrail.length - MAX_MOTION_TRAIL);
        const pSpeed = Math.hypot(Number(player.vx) || 0, Number(player.vy) || 0);
        let pStatus = pSpeed > 0.08 ? 'AVANZANDO' : 'DETENIDO';
        if (pMoved > 0.05) pStatus = 'AVANZANDO';
        else if (pFramesSince >= 30 && pMoved <= 0.05) pStatus = 'SIN PROGRESO';
        DEBUG_MODE.playerProgress = {
            x: px, y: py, tileKey: pTileKey, tile: playerTile,
            previousTile: prevP?.tile || playerTile,
            sameTileSince: pSameTileSince, sameTileMs: Math.max(0, now - pSameTileSince), lastProgressAt: pLastProgressAt,
            framesSinceProgress: pFramesSince, movedPx: pMoved,
            actualDirection: movementDirection(player.vx, player.vy),
            actualSpeed: pSpeed, distanceToCenter: distanceToTileCenter(player, playerTile, 'player'),
            tileTransitions: (prevP?.tileTransitions || 0) + (prevP && prevP.tileKey !== pTileKey ? 1 : 0),
            progressStatus: pStatus, movementState: playerMovementState(player), trail: pTrail,
            lastSampleAt: now
        };

        for (let index = 0; index < Math.min(16, state.enemies?.length || 0); index++) {
            const enemy = state.enemies[index];
            if (!enemy) continue;
            sampleEnemyMotion(enemy, index, now);
        }
        DEBUG_MODE.motionSampleCount += 1;
        return { player: DEBUG_MODE.playerProgress };
    }

    function sampleEnemyMotion(enemy, index, now = performance.now()) {
        const tile = entityTile(enemy, 'enemy');
        const previous = DEBUG_MODE.enemyProgress.get(enemy);
        const x = Number(enemy?.x) || 0;
        const y = Number(enemy?.y) || 0;
        const dx = previous ? x - previous.x : 0;
        const dy = previous ? y - previous.y : 0;
        const movedPx = Math.hypot(dx, dy);
        const speed = Math.hypot(Number(enemy?.vx) || 0, Number(enemy?.vy) || 0);
        const key = `${tile.x},${tile.y}`;
        const sameTileSince = previous?.tileKey === key ? previous.sameTileSince : now;
        const lastProgressAt = movedPx > 0.05 ? now : (previous?.lastProgressAt || now);
        const framesSinceProgress = movedPx > 0.05 ? 0 : (previous?.framesSinceProgress || 0) + 1;
        const actualDirection = movementDirection(enemy?.vx, enemy?.vy);
        const ai = enemy?.ai || {};
        const dir = String(ai.direction || enemy.lastDirection || '—').toUpperCase();
        const previousDir = previous?.aiDirection || dir;
        const directionChanges = (previous?.directionChanges || 0) + (previous && dir !== previousDir && dir !== '—' ? 1 : 0);
        const trail = previous?.trail ? previous.trail.slice() : [];
        if (!trail.length || trail[trail.length - 1].x !== tile.x || trail[trail.length - 1].y !== tile.y) trail.push({ x: tile.x, y: tile.y });
        if (trail.length > MAX_MOTION_TRAIL) trail.splice(0, trail.length - MAX_MOTION_TRAIL);
        const distanceToCenter = distanceToTileCenter(enemy, tile, 'enemy');
        const currentPassable = enemyCurrentDirectionPassable(enemy, dir, ai.alert);
        const blockedMs = Number(ai.blockedTimer) || 0;
        const stuckMs = Number(ai.stuckTimer) || 0;
        const sameTileMs = now - sameTileSince;
        const noProgressMs = now - lastProgressAt;
        const stuckLikely = speed < 0.08 && noProgressMs >= 500 && currentPassable !== false;
        let progressStatus = movedPx > 0.05 ? 'AVANZANDO' : 'DETENIDO';
        if (currentPassable === false) progressStatus = 'BLOQUEADO';
        if (stuckLikely) progressStatus = 'ATASCADO';
        const movementState = progressStatus === 'AVANZANDO'
            ? (distanceToCenter <= 9 && String(ai.desiredDirection || '').toUpperCase() !== dir ? 'LISTO PARA GIRAR' : 'MOVIÉNDOSE')
            : progressStatus;
        DEBUG_MODE.enemyProgress.set(enemy, {
            x, y, tileKey: key, tile, previousTile: previous?.tile || tile,
            sameTileSince, sameTileMs, lastProgressAt, framesSinceProgress, movedPx,
            actualDirection, actualSpeed: speed, distanceToCenter, blockedMs, stuckMs,
            stuckLikely, progressStatus, movementState, directionChanges,
            tileTransitions: (previous?.tileTransitions || 0) + (previous && previous.tileKey !== key ? 1 : 0),
            aiDirection: dir, trail, lastSampleAt: now
        });
        return DEBUG_MODE.enemyProgress.get(enemy);
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
        const live = DEBUG_MODE.enemyProgress.get(enemy) || sampleEnemyMotion(enemy, index, performance.now());
        const ai = enemy?.ai || {};
        const currentPassable = enemyCurrentDirectionPassable(enemy, currentDirection, ai.alert);
        const turnReady = Number(live?.distanceToCenter || 0) <= 9;
        const wantsTurn = desiredDirection !== '—' && desiredDirection !== currentDirection;
        let movementState = live?.movementState || 'SIN MUESTRA';
        if (currentPassable === false && movementState !== 'ATASCADO') movementState = 'BLOQUEADO';
        else if (wantsTurn && turnReady && movementState === 'AVANZANDO') movementState = 'LISTO PARA GIRAR';
        let nextTile = null;
        const dir = String(currentDirection || '').toLowerCase();
        if (dir === 'up') nextTile = { x: tile.x, y: tile.y - 1 };
        if (dir === 'down') nextTile = { x: tile.x, y: tile.y + 1 };
        if (dir === 'left') nextTile = { x: tile.x - 1, y: tile.y };
        if (dir === 'right') nextTile = { x: tile.x + 1, y: tile.y };
        return {
            actualDirection: live?.actualDirection || movementDirection(enemy?.vx, enemy?.vy),
            actualSpeed: Number(live?.actualSpeed || 0),
            movementState,
            distanceToCenter: Number(live?.distanceToCenter || 0),
            sameTileMs: Number(live?.sameTileMs || (performance.now() - (live?.sameTileSince || performance.now()))),
            noProgressMs: Number(performance.now() - (live?.lastProgressAt || performance.now())),
            stuckLikely: !!live?.stuckLikely,
            turnReady,
            blockedMs: Number(live?.blockedMs || ai.blockedTimer || 0),
            stuckMs: Number(live?.stuckMs || ai.stuckTimer || 0),
            nextTile,
            previousTile: live?.previousTile || tile,
            tileTransitions: Number(live?.tileTransitions || 0),
            movedPx: Number(live?.movedPx || 0),
            framesSinceProgress: Number(live?.framesSinceProgress || 0),
            directionChanges: Number(live?.directionChanges || 0),
            progressStatus: live?.progressStatus || 'SIN MUESTRA',
            trail: live?.trail || [],
            options
        };
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

    function compactMotionDiagnostic(nav) {
        if (!nav?.available) return 'Sin diagnóstico de movimiento.';
        const p = nav.player || {};
        const lines = [
            `PLAYER · estado=${p.movementState || '—'} · real=${p.actualDirection || '—'} · centro=${Number(p.distanceToCenter || 0).toFixed(1)}px · movimiento=${Number(p.movedPx || 0).toFixed(2)}px/muestra · transiciones=${p.tileTransitions || 0} · sinProgreso=${p.framesSinceProgress || 0}f`
        ];
        for (const e of nav.enemies || []) {
            lines.push(`E${e.index} · real=${e.actualDirection} · estado=${e.movementState} · tile=${e.tile.x},${e.tile.y} · previo=${e.previousTile?.x},${e.previousTile?.y} · mov=${Number(e.movedPx || 0).toFixed(2)}px · trans=${e.tileTransitions || 0} · giros=${e.directionChanges || 0} · centro=${Number(e.distanceToCenter || 0).toFixed(1)}px · bloqueo=${e.currentPassable === false ? 'SI' : 'NO'} · sinProgreso=${Number(e.framesSinceProgress || 0)}f · atascado=${e.stuckLikely ? 'SI' : 'NO'}`);
        }
        return lines.join('\n');
    }

    function compactStressReport(stress) {
        if (!stress?.cases?.length) return 'Sin ejecución de AI Stress Test.';
        const lines = [`resumen=${stress.passed}/${stress.total} PASS · ${stress.failed} FAIL`];
        for (const c of stress.cases) {
            lines.push(`${c.status} ${c.name} · mov=${c.movedPx}px · trans=${c.tileTransitions} · giros=${c.directionChanges} · ruta=${c.routeLength} · alerta=${c.finalAlert} · bloqueos=${c.blockedFrames} · atascado=${c.stuckLikely ? 'SI' : 'NO'}${c.failure ? ` · ${c.failure}` : ''}`);
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
        sampleLiveMotion(performance.now(), true);
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

        'ai-stress': async () => {
            prepareControlledStressScene();
            const stressStarted = performance.now();
            const cases = [
                { name: 'direct-chase', player: { x: 5, y: 7 }, enemy: { x: 1, y: 7 }, dir: 'right', minMove: 8, minTurns: 0 },
                { name: 'intersection-stability', player: { x: 7, y: 5 }, enemy: { x: 5, y: 7 }, dir: 'right', minMove: 8, minTurns: 1, maxTurns: 1, forceChase: true, persistChase: true, requiresRoute: true, stopOnPlayer: true, expectBfsMax: 0 },
                { name: 'corner-turn', player: { x: 7, y: 7 }, enemy: { x: 3, y: 3 }, dir: 'down', minMove: 8, minTurns: 1 },
                { name: 'long-corridor', player: { x: 13, y: 7 }, enemy: { x: 1, y: 7 }, dir: 'right', minMove: 40, minTurns: 0 },
                { name: 'intersection', player: { x: 3, y: 3 }, enemy: { x: 7, y: 3 }, dir: 'down', minMove: 8, minTurns: 1 },
                { name: 'dead-end', player: { x: 5, y: 10 }, enemy: { x: 5, y: 13 }, dir: 'down', minMove: 8, minTurns: 1, recoveryExpected: true },
                { name: 'corner-recovery-no-player', player: { x: 13, y: 13 }, enemy: { x: 7, y: 7 }, dir: 'up', minMove: 8, minTurns: 0, recoveryExpected: true, recoveryMode: 'lane-correction', cornerOffset: 12, patrolTarget: { x: 7, y: 1 }, requiresRoute: false, expectBfsMax: 0 },
                { name: 'bomb-flee', player: { x: 13, y: 7 }, enemy: { x: 5, y: 7 }, dir: 'right', minMove: 8, minTurns: 0, bomb: { x: 6, y: 7, timer: 1200, range: 3 } }
            ];
            const results = [];
            for (const spec of cases) {
                buildStressGrid();
                window.GRID_COLLISION_V320?.reset?.();
                const state = getState();
                const p = getPlayer();
                state.bombs = [];
                state.explosions = [];
                state.hazards = [];
                state.enemies = [];
                state.bossProjectiles = [];
                state.particles = [];
                state.floaters = [];
                setPlayerAt(spec.player);
                p.vx = 0; p.vy = 0;
                const enemy = createStressEnemy(spec.enemy, spec.dir, results.length);
                state.enemies.push(enemy);
                if (spec.bomb) state.bombs.push({ x: spec.bomb.x, y: spec.bomb.y, timer: spec.bomb.timer, range: spec.bomb.range, fuseTotal: 2000, owner: 'debug-stress' });
                if (typeof ensureEnemyMotionStateV312 === 'function') ensureEnemyMotionStateV312(enemy, results.length);
                enemy.ai.visionTimer = spec.persistChase ? Number.MAX_SAFE_INTEGER : 0;
                enemy.ai.decisionTimer = 0;
                enemy.ai.seesPlayer = !!spec.forceChase;
                enemy.ai.memoryTimer = spec.forceChase ? 900 : 0;
                enemy.ai.patrolX = -1;
                enemy.ai.patrolY = -1;
                enemy.ai.direction = spec.dir;
                enemy.ai.desiredDirection = spec.dir;
                enemy.lastDirection = spec.dir;
                if (!spec.forceChase) {
                    enemy.ai.seesPlayer = false;
                    enemy.ai.memoryTimer = 0;
                }
                if (spec.patrolTarget) {
                    enemy.ai.patrolX = spec.patrolTarget.x;
                    enemy.ai.patrolY = spec.patrolTarget.y;
                }
                if (spec.cornerOffset) enemy.x += Number(spec.cornerOffset);

                const start = { x: enemy.x, y: enemy.y, tile: entityTile(enemy, 'enemy'), dir: spec.dir };
                let maxMove = 0;
                let tileTransitions = 0;
                let directionChanges = 0;
                let firstDirectionChangeFrame = -1;
                let firstRecoveredDirection = '—';
                let previousTile = { ...start.tile };
                let previousDir = spec.dir;
                let minBombDistance = Infinity;
                let maxBombDistance = 0;
                let finalAlert = '—';
                let firstNonPatrolFrame = -1;
                let blockedFrames = 0;
                let maxStuckMs = 0;
                let consecutiveNoMoveFrames = 0;
                let maxNoMoveFrames = 0;
                let fleeFrames = 0;
                let dangerNextFrames = 0;
                let maxCenterDistance = 0;
                let routeDirectionMatches = 0;
                let routeDirectionSamples = 0;
                let physicalBlockedFrames = 0;
                let cornerCorrectionFrames = 0;
                let maxPhysicalBlockedMs = 0;
                let laneCorrections = 0;
                let laneCorrectionPx = 0;
                let laneCorrectionFrames = 0;
                let initialCanReachPlayer = false;
                let canReachAnyFrame = false;
                let targetReachedFrame = -1;

                const initialNav = DEBUG_MODE.getNavigationSnapshot(true);
                const initialItem = initialNav?.enemies?.[0] || null;
                initialCanReachPlayer = !!initialItem?.canReachPlayer;

                for (let frame = 0; frame < 180; frame++) {
                    const beforeX = enemy.x;
                    const beforeY = enemy.y;
                    updateEnemyAI(16.6667);
                    const collisionSnapshot = window.GRID_COLLISION_V320?.snapshot?.() || {};
                    const caseLaneCorrections = Number(collisionSnapshot.laneCorrections || 0);
                    const caseLaneCorrectionPx = Number(collisionSnapshot.laneCorrectionPx || 0);
                    if (caseLaneCorrections > laneCorrections) laneCorrectionFrames += 1;
                    laneCorrections = caseLaneCorrections;
                    laneCorrectionPx = caseLaneCorrectionPx;
                    const moved = Math.hypot(enemy.x - beforeX, enemy.y - beforeY);
                    maxMove = Math.max(maxMove, moved);
                    if (moved > 0.05) consecutiveNoMoveFrames = 0;
                    else { consecutiveNoMoveFrames += 1; maxNoMoveFrames = Math.max(maxNoMoveFrames, consecutiveNoMoveFrames); }
                    const tile = entityTile(enemy, 'enemy');
                    if (tile.x !== previousTile.x || tile.y !== previousTile.y) {
                        tileTransitions += 1;
                        previousTile = { ...tile };
                    }
                    const dirNow = String(enemy.ai?.direction || '—').toUpperCase();
                    if (dirNow !== String(previousDir).toUpperCase() && dirNow !== '—') {
                        directionChanges += 1;
                        if (firstDirectionChangeFrame < 0) {
                            firstDirectionChangeFrame = frame;
                            firstRecoveredDirection = dirNow;
                        }
                    }
                    previousDir = enemy.ai?.direction || previousDir;
                    finalAlert = enemy.ai?.alert || enemy.ai?.behavior || '—';
                    if (firstNonPatrolFrame < 0 && finalAlert !== 'patrol') firstNonPatrolFrame = frame;
                    if (finalAlert === 'flee') fleeFrames += 1;
                    if (Number(enemy.ai?.blockedTimer || 0) > 0 || Number(enemy.ai?.stuckTimer || 0) > 0) blockedFrames += 1;
                    if (enemy.ai?.physicalBlocked) physicalBlockedFrames += 1;
                    if (Number(enemy.ai?.cornerCorrectionMs || 0) > 0) cornerCorrectionFrames += 1;
                    maxPhysicalBlockedMs = Math.max(maxPhysicalBlockedMs, Number(enemy.ai?.physicalBlockedTimer || 0));
                    maxStuckMs = Math.max(maxStuckMs, Number(enemy.ai?.stuckTimer || 0));
                    const center = gridTileCenter(tile.x, tile.y);
                    maxCenterDistance = Math.max(maxCenterDistance, Math.hypot(enemy.x - center.x, enemy.y - center.y));
                    if (spec.bomb) {
                        const bombDistance = Math.abs(entityTile(enemy, 'enemy').x - spec.bomb.x) + Math.abs(entityTile(enemy, 'enemy').y - spec.bomb.y);
                        minBombDistance = Math.min(minBombDistance, bombDistance);
                        maxBombDistance = Math.max(maxBombDistance, bombDistance);
                        const nextByDir = enemyProjectedTileV312(enemy, enemyDirectionV312(String(enemy.ai?.direction || '').toLowerCase()), 1);
                        if (typeof enemyDangerV312 === 'function' && enemyDangerV312(nextByDir.x, nextByDir.y)) dangerNextFrames += 1;
                    }
                    sampleLiveMotion(performance.now(), true);
                    const currentDirObserved = movementDirection(enemy.vx, enemy.vy);
                    const routeSnap = getState() && getPlayer() ? DEBUG_MODE.getNavigationSnapshot(true).enemies?.[0] : null;
                    const routeNext = routeSnap?.routeNextDirection || '—';
                    if (routeSnap?.canReachPlayer) canReachAnyFrame = true;
                    if (spec.stopOnPlayer && routeSnap?.canReachPlayer && routeSnap.routeLength === 0 && targetReachedFrame < 0) {
                        targetReachedFrame = frame;
                        break;
                    }
                    if (currentDirObserved !== '—' && routeNext !== '—') {
                        routeDirectionSamples += 1;
                        if (currentDirObserved === routeNext) routeDirectionMatches += 1;
                    }
                }

                const nav = getState() && getPlayer() ? DEBUG_MODE.getNavigationSnapshot(true) : null;
                const item = nav?.enemies?.[0] || null;
                const final = { x: enemy.x, y: enemy.y, tile: entityTile(enemy, 'enemy') };
                const movedTotal = Math.hypot(final.x - start.x, final.y - start.y);
                const routeLength = item?.routeLength ?? 0;
                const canReach = item?.canReachPlayer ?? false;
                const stuckLikely = !!item?.stuckLikely;
                const recoveryOk = spec.name !== 'recovery' || String(enemy.ai?.direction || '').toLowerCase() !== 'up';
                const noPlayerAssist = spec.name !== 'corner-recovery-no-player' || (!enemy.ai?.seesPlayer && Number(enemy.ai?.memoryTimer || 0) <= 0);
                const cornerCorrected = spec.name !== 'corner-recovery-no-player' || laneCorrections > 0 || Number(enemy.ai?.recoveryCount || 0) > 0 || Number(enemy.ai?.cornerCorrectionMs || 0) > 0 || cornerCorrectionFrames > 0;
                let pass = true;
                const failures = [];
                if (movedTotal < spec.minMove) { pass = false; failures.push(`movimiento ${movedTotal.toFixed(1)}<${spec.minMove}`); }
                if (directionChanges < spec.minTurns) { pass = false; failures.push(`giros ${directionChanges}<${spec.minTurns}`); }
                if (Number.isFinite(spec.maxTurns) && directionChanges > spec.maxTurns) { pass = false; failures.push(`giros inestables ${directionChanges}>${spec.maxTurns}`); }
                const recoveryPathCalls = Number(enemy.ai?.recoveryPathCalls || 0);
                if (Number.isFinite(spec.expectBfsMax) && recoveryPathCalls > spec.expectBfsMax) { pass = false; failures.push(`BFS ${recoveryPathCalls}>${spec.expectBfsMax}`); }
                if (stuckLikely) { pass = false; failures.push('atasco detectado'); }
                if (blockedFrames > 120) { pass = false; failures.push(`bloqueo prolongado ${blockedFrames}/180`); }
                const requiresRoute = spec.requiresRoute !== false && spec.name !== 'bomb-flee';
                if (requiresRoute && !initialCanReachPlayer && !canReachAnyFrame) { pass = false; failures.push('sin ruta al jugador'); }
                if (spec.recoveryExpected) {
                    const recovered = spec.recoveryMode === 'lane-correction'
                        ? (laneCorrections > 0 || laneCorrectionFrames > 0 || cornerCorrectionFrames > 0 || Number(enemy.ai?.recoveryCount || 0) > 0)
                        : (firstDirectionChangeFrame >= 0 || Number(enemy.ai?.recoveryCount || 0) > 0 || cornerCorrectionFrames > 0 || laneCorrections > 0);
                    if (!recovered) failures.push('no se detectó recuperación física');
                    if (!recovered) pass = false;
                }
                if (spec.name === 'bomb-flee' && fleeFrames < 5) { pass = false; failures.push(`flee insuficiente (${fleeFrames} frames)`); }
                if (spec.name === 'bomb-flee' && maxBombDistance <= 1) { pass = false; failures.push(`no aumentó distancia a bomba (máx ${maxBombDistance})`); }
                if (spec.name === 'corner-recovery-no-player' && !noPlayerAssist) { pass = false; failures.push('necesitó ver al jugador'); }
                if (spec.name === 'corner-recovery-no-player' && !cornerCorrected) { pass = false; failures.push('no corrigió la esquina'); }

                results.push({
                    name: spec.name,
                    status: pass ? 'PASS' : 'FAIL',
                    startTile: start.tile,
                    finalTile: final.tile,
                    movedPx: Number(movedTotal.toFixed(1)),
                    maxStepPx: Number(maxMove.toFixed(2)),
                    tileTransitions,
                    directionChanges,
                    firstDirectionChangeFrame,
                    firstRecoveredDirection,
                    routeLength,
                    canReachPlayer: canReach,
                    finalAlert,
                    firstNonPatrolFrame,
                    blockedFrames,
                    maxStuckMs: Number(maxStuckMs.toFixed(1)),
                    maxNoMoveFrames,
                    maxCenterDistance: Number(maxCenterDistance.toFixed(1)),
                    routeDirectionAgreement: routeDirectionSamples ? Number((routeDirectionMatches / routeDirectionSamples * 100).toFixed(1)) : null,
                    fleeFrames,
                    dangerNextFrames,
                    physicalBlockedFrames,
                    cornerCorrectionFrames,
                    laneCorrections,
                    laneCorrectionPx: Number(laneCorrectionPx.toFixed(2)),
                    laneCorrectionFrames,
                    initialCanReachPlayer,
                    canReachAnyFrame,
                    targetReachedFrame,
                    maxPhysicalBlockedMs: Number(maxPhysicalBlockedMs.toFixed(1)),
                    recoveryCount: Number(enemy.ai?.recoveryCount || 0),
                    recoveryReason: enemy.ai?.lastRecoveryReason || '—',
                    recoveryPathNodes: Number(enemy.ai?.lastRecoveryPathNodes || 0),
                    recoveryPathCalls,
                    turnLockMs: Number(enemy.ai?.turnLockTimer || 0),
                    lastTurnDirection: enemy.ai?.lastTurnDirection || '—',
                    noPlayerAssist,
                    cornerCorrected,
                    stuckLikely,
                    minBombDistance: Number.isFinite(minBombDistance) ? minBombDistance : null,
                    maxBombDistance: Number.isFinite(maxBombDistance) ? maxBombDistance : null,
                    failure: failures.join(' · ') || null
                });
            }
            const passed = results.filter(r => r.status === 'PASS').length;
            if (results.length !== AI_STRESS_CASES) {
                DEBUG_MODE.recordEvent('WARN', `AI Stress: se esperaban ${AI_STRESS_CASES} escenarios y se ejecutaron ${results.length}.`);
            }
            DEBUG_MODE.aiStress = { total: results.length, passed, failed: results.length - passed, cases: results, durationMs: null };
            const elapsed = performance.now() - stressStarted;
            DEBUG_MODE.aiStress.durationMs = elapsed;
            const stuckCases = results.filter(r => r.stuckLikely).length;
            const blockedCases = results.filter(r => r.blockedFrames > 0).length;
            const failureText = results.filter(r => r.failure).map(r => `${r.name}: ${r.failure}`).join(' | ');
            if (passed !== results.length) throw new Error(`AI Stress: ${passed}/${results.length} casos PASS. ${failureText}`);
            return {
                summary: `${passed}/${results.length} escenarios PASS · atascos=${stuckCases} · bloqueos con registro=${blockedCases}`,
                details: {
                    cases: results,
                    durationMs: Number((performance.now() - stressStarted).toFixed(1)),
                    focus: 'movimiento real, giros, rutas, bloqueos físicos, corrección de esquinas, recuperación y evasión de bomba',
                    note: 'La prueba observa updateEnemyAI() y GRID_COLLISION_V320; no modifica 12-enemy-ai.js ni 13-collision.js.'
                }
            };
        },

        camera: async () => {
            prepareTestScene();
            const p = getPlayer();
            const state = getState();
            const cell = findEmptyCell();
            setPlayerAt(cell);
            resetCameraToPlayer();
            const before = { x: Number(state.camera.x), y: Number(state.camera.y) };
            if (!Number.isFinite(before.x) || !Number.isFinite(before.y)) throw new Error('La cámara no expuso coordenadas numéricas antes de la prueba.');
            p.x = Math.max(TILE_SIZE, (state.gridWidth - 3) * TILE_SIZE - p.width / 2);
            p.y = Math.max(TILE_SIZE, (state.gridHeight - 3) * TILE_SIZE - p.height / 2);
            for (let i = 0; i < 12; i++) updateCamera(16.6667);
            const bounds = getCameraBounds();
            const after = { x: Number(state.camera.x), y: Number(state.camera.y) };
            if (!Number.isFinite(after.x) || !Number.isFinite(after.y)) throw new Error('La cámara no produjo coordenadas numéricas después del seguimiento.');
            if (!Number.isFinite(bounds.maxX) || !Number.isFinite(bounds.maxY)) throw new Error('Los límites de cámara no son numéricos.');
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

    function buildStressGrid() {
        const state = getState();
        if (!state) throw new Error('gameState no disponible.');
        state.gridWidth = 15;
        state.gridHeight = 15;
        state.grid = Array.from({ length: 15 }, () => Array(15).fill(TYPES.WALL));
        const carve = (x, y) => { if (x > 0 && x < 14 && y > 0 && y < 14) state.grid[y][x] = TYPES.EMPTY; };
        for (let x = 1; x <= 13; x++) carve(x, 7);
        for (let y = 1; y <= 13; y++) carve(7, y);
        for (let x = 3; x <= 11; x++) carve(x, 3);
        for (let y = 3; y <= 7; y++) carve(3, y);
        for (let y = 3; y <= 7; y++) carve(11, y);
        for (let y = 7; y <= 13; y++) carve(5, y);
        for (let y = 7; y <= 13; y++) carve(9, y);
        for (let x = 5; x <= 7; x++) carve(x, 11);
        state.bombs = [];
        state.explosions = [];
        state.hazards = [];
        state.enemies = [];
        state.bossProjectiles = [];
        state.particles = [];
        state.floaters = [];
        state.items = [];
        state.exitPos = null;
        state.isPlaying = true;
        state.paused = false;
        state.shakeTimer = 0;
        state.shakeIntensity = 0;
        DEBUG_MODE.resetNavigation();
    }

    function prepareControlledStressScene() {
        stopDebugLoop();
        const state = getState();
        if (!state) throw new Error('gameState no disponible.');
        if (typeof resetWorldRuntimeState === 'function') resetWorldRuntimeState();
        if (typeof resetPlayerRuntimeState === 'function') resetPlayerRuntimeState();
        if (typeof resetRelicModifiers === 'function') resetRelicModifiers();
        if (typeof resetBombHandlingState === 'function') resetBombHandlingState();
        if (typeof resetCombatFeedbackForRun === 'function') resetCombatFeedbackForRun();
        state.level = 1;
        state.runNumber = 1;
        if (typeof initLevel === 'function') initLevel();
        buildStressGrid();
        state.isPlaying = true;
        state.paused = false;
        state.rafId = 0;
        state.lastTime = performance.now();
        DEBUG_MODE.paused = false;
        DEBUG_MODE.stepRequested = false;
        DEBUG_MODE.resetNavigation();
    }

    function createStressEnemy(cell, direction, index) {
        const enemy = {
            x: cell.x * TILE_SIZE + TILE_SIZE / 2,
            y: cell.y * TILE_SIZE + TILE_SIZE / 2,
            width: TILE_SIZE * 0.75,
            height: TILE_SIZE * 0.75,
            type: ENEMY_TYPES.RASTRERO,
            vx: 0,
            vy: 0,
            baseSpeed: 1.4,
            lastDirection: direction,
            desiredDirection: direction,
            __gridAnchor: 'center'
        };
        if (typeof ensureEnemyMotionStateV312 === 'function') ensureEnemyMotionStateV312(enemy, index);
        enemy.ai.direction = direction;
        enemy.ai.desiredDirection = direction;
        enemy.ai.visionTimer = 0;
        enemy.ai.decisionTimer = 0;
        enemy.lastDirection = direction;
        return enemy;
    }

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
        } else if (event.code === 'F8') {
            event.preventDefault();
            window.BOMBER_PROFILER?.toggle?.();
            dispatchUpdate();
        }
    });

    DEBUG_MODE.recordEvent('DEBUG', 'Debug Engine v3.20.1 cargado en el mismo runtime.');
    DEBUG_MODE.recordEvent('DEBUG', 'Usá RESET para activar una escena de depuración limpia.');
})();
