// Bomberman Roguelike v3.20.0 — Debug Overlay
// Panel reconstruido para inspección en vivo. Solo se crea con ?debug=1.
(() => {
    'use strict';
    if (!window.DEBUG_MODE?.enabled) return;

    const D = window.DEBUG_MODE;

    const root = document.createElement('aside');
    root.id = 'debug-overlay';
    root.className = 'debug-overlay';
    root.innerHTML = `
        <div class="debug-header">
            <div>
                <div class="debug-kicker">BOMBERMAN ENGINE · v3.17</div>
                <h2>DEBUG MODE <span id="debug-status" class="debug-status">CARGANDO</span></h2>
            </div>
            <button type="button" class="debug-icon-btn" data-debug-action="toggle" title="Mostrar/ocultar panel">F3</button>
        </div>

        <div class="debug-toolbar">
            <button type="button" data-debug-action="reset">RESET</button>
            <button type="button" data-debug-action="pause">PAUSA <kbd>F4</kbd></button>
            <button type="button" data-debug-action="step">STEP <kbd>F6</kbd></button>
            <button type="button" data-debug-action="run-tests">TESTS <kbd>F7</kbd></button>
            <button type="button" data-debug-action="profile">PROFILE <kbd>F8</kbd></button>
            <button type="button" data-debug-action="copy-tests" title="Copia el informe completo de tests, estado, eventos y errores">COPIAR TEST</button>
        </div>

        <section class="debug-section">
            <div class="debug-section-head"><div class="debug-section-title">ESTADO</div><span id="dbg-state-status">—</span></div>
            <div class="debug-grid debug-grid-3">
                <div><span>ENGINE</span><strong id="dbg-engine">—</strong></div>
                <div><span>LOOP</span><strong id="dbg-loop">—</strong></div>
                <div><span>PAUSA</span><strong id="dbg-pause">NO</strong></div>
                <div><span>FPS</span><strong id="dbg-fps">0</strong></div>
                <div><span>TRABAJO/FRAME</span><strong id="dbg-frame-ms">0</strong></div>
                <div><span>UPDATE/DRAW</span><strong id="dbg-update-draw">0 / 0</strong></div>
                <div><span>INTERVALO RAF</span><strong id="dbg-frame-interval">0</strong></div>
                <div><span>RAF MIN/MAX</span><strong id="dbg-raf-range">0 / 0</strong></div>
                <div><span>FRAME</span><strong id="dbg-frame">0</strong></div>
                <div><span>RAF ID</span><strong id="dbg-raf">0</strong></div>
                <div><span>ERRORES</span><strong id="dbg-errors">0</strong></div>
                <div><span>EVENTOS</span><strong id="dbg-event-total">0/0</strong></div>
                <div><span>COLAPSADOS</span><strong id="dbg-event-collapsed">0</strong></div>
            </div>
        </section>

        <section class="debug-section">
            <div class="debug-section-head"><div class="debug-section-title">REAL PROFILING</div><span id="dbg-profiler-status">OFF</span></div>
            <div class="debug-action-grid">
                <button type="button" data-debug-action="profile">ACTIVAR / PAUSAR <kbd>F8</kbd></button>
                <button type="button" data-debug-action="profile-reset">RESETEAR MUESTRAS</button>
            </div>
            <div class="debug-grid debug-grid-4">
                <div><span>FPS</span><strong id="dbg-prof-fps">0</strong></div>
                <div><span>TRABAJO/FRAME</span><strong id="dbg-prof-work">0ms</strong></div>
                <div><span>P95 FRAME</span><strong id="dbg-prof-p95">0ms</strong></div>
                <div><span>MÁX FRAME</span><strong id="dbg-prof-max">0ms</strong></div>
                <div><span>SOBRE 16.67ms</span><strong id="dbg-prof-budget">0%</strong></div>
                <div><span>FRAME >33.4ms</span><strong id="dbg-prof-slow">0</strong></div>
                <div><span>HITCH >50ms</span><strong id="dbg-prof-hitch">0</strong></div>
                <div><span>MUESTRAS</span><strong id="dbg-prof-samples">0</strong></div>
            </div>
            <div class="debug-note" id="dbg-prof-memory">MEMORIA · N/D</div>
            <pre id="dbg-prof-systems" class="debug-log">Activa PROFILE para medir los sistemas reales.</pre>
        </section>

        <section class="debug-section">
            <div class="debug-section-title">PLAYER · MOVIMIENTO REAL</div>
            <div class="debug-grid debug-grid-4">
                <div><span>X</span><strong id="dbg-px">—</strong></div>
                <div><span>Y</span><strong id="dbg-py">—</strong></div>
                <div><span>VX</span><strong id="dbg-vx">—</strong></div>
                <div><span>VY</span><strong id="dbg-vy">—</strong></div>
                <div><span>DIR</span><strong id="dbg-dir">—</strong></div>
                <div><span>DESEADA</span><strong id="dbg-desired">—</strong></div>
                <div><span>REAL</span><strong id="dbg-p-real">—</strong></div>
                <div><span>ESTADO</span><strong id="dbg-p-state">—</strong></div>
                <div><span>TILE</span><strong id="dbg-tile">—</strong></div>
                <div><span>INPUT</span><strong id="dbg-input">—</strong></div>
                <div><span>ALCANZABLES</span><strong id="dbg-p-reachable">—</strong></div>
                <div><span>CENTRO</span><strong id="dbg-p-center">—</strong></div>
                <div><span>MOVIDO/MUESTRA</span><strong id="dbg-p-moved">—</strong></div>
                <div><span>TRANSICIONES</span><strong id="dbg-p-transitions">—</strong></div>
                <div><span>SIN PROGRESO</span><strong id="dbg-p-stallframes">—</strong></div>
                <div><span>MISMO TILE</span><strong id="dbg-p-sametile">—</strong></div>
                <div><span>PROGRESO</span><strong id="dbg-p-progress">—</strong></div>
                <div><span>HP</span><strong id="dbg-hp">—</strong></div>
                <div><span>BOMBAS</span><strong id="dbg-bombs">—</strong></div>
                <div><span>RANGO</span><strong id="dbg-range">—</strong></div>
                <div><span>SPEED</span><strong id="dbg-speed">—</strong></div>
                <div><span>ESCUDO</span><strong id="dbg-shield">—</strong></div>
                <div><span>INVULN</span><strong id="dbg-invuln">—</strong></div>
                <div><span>MOVIÉNDOSE</span><strong id="dbg-moving">—</strong></div>
            </div>
        </section>

        <section class="debug-section">
            <div class="debug-section-head"><div class="debug-section-title">WORLD</div><span id="dbg-world-room">—</span></div>
            <div class="debug-grid debug-grid-4">
                <div><span>DEPTH</span><strong id="dbg-depth">—</strong></div>
                <div><span>RUN</span><strong id="dbg-run">—</strong></div>
                <div><span>ROOM</span><strong id="dbg-room">—</strong></div>
                <div><span>THREAT</span><strong id="dbg-threat">—</strong></div>
                <div><span>TIME</span><strong id="dbg-time">—</strong></div>
                <div><span>SCORE</span><strong id="dbg-score">—</strong></div>
                <div><span>COINS</span><strong id="dbg-coins">—</strong></div>
                <div><span>BLOQUES</span><strong id="dbg-blocks">—</strong></div>
                <div><span>MAPA</span><strong id="dbg-map">—</strong></div>
                <div><span>ENEMIGOS</span><strong id="dbg-enemies">—</strong></div>
                <div><span>BOMBAS</span><strong id="dbg-world-bombs">—</strong></div>
                <div><span>EXPLOSIONES</span><strong id="dbg-explosions">—</strong></div>
                <div><span>TRAMPAS</span><strong id="dbg-traps">—</strong></div>
                <div><span>ACTIVAS</span><strong id="dbg-active-traps">—</strong></div>
                <div><span>PARTÍCULAS</span><strong id="dbg-particles">—</strong></div>
                <div><span>PROJECTILES</span><strong id="dbg-projectiles">—</strong></div>
                <div><span>BOSS</span><strong id="dbg-boss">—</strong></div>
                <div><span>SALIDA</span><strong id="dbg-exit">—</strong></div>
                <div><span>LAYOUT</span><strong id="dbg-layout">—</strong></div>
            </div>
        </section>

        <section class="debug-section">
            <div class="debug-section-title">NAVEGACIÓN</div>
            <div class="debug-checks">
                <label><input type="checkbox" data-debug-visual="paths" checked> Rutas / alcance</label>
                <label><input type="checkbox" data-debug-visual="grid"> Grid</label>
                <label><input type="checkbox" data-debug-visual="collision"> Colisión</label>
                <label><input type="checkbox" data-debug-visual="hitboxes"> Hitboxes</label>
                <label><input type="checkbox" data-debug-visual="bombs"> Bombas</label>
                <label><input type="checkbox" data-debug-visual="explosions"> Explosiones</label>
                <label><input type="checkbox" data-debug-visual="ai"> IA</label>
                <label><input type="checkbox" data-debug-visual="camera"> Cámara</label>
                <label><input type="checkbox" data-debug-visual="spawns"> Spawns</label>
            </div>
            <div class="debug-grid debug-grid-4">
                <div><span>PLAYER TILE</span><strong id="dbg-nav-player-tile">—</strong></div>
                <div><span>ALCANZABLES</span><strong id="dbg-nav-player-reachable">0</strong></div>
                <div><span>GIROS</span><strong id="dbg-nav-player-options">—</strong></div>
                <div><span>JUNCIONES</span><strong id="dbg-nav-player-junctions">0</strong></div>
                <div><span>CALLEJONES</span><strong id="dbg-nav-player-deadends">0</strong></div>
                <div><span>ENEMIGOS CON RUTA</span><strong id="dbg-nav-routes">0/0</strong></div>
                <div><span>NODOS LIMITADOS</span><strong id="dbg-nav-truncated">NO</strong></div>
                <div><span>MODO</span><strong id="dbg-nav-mode">—</strong></div>
                <div><span>DIAGNÓSTICO</span><strong id="dbg-nav-diagnostic">—</strong></div>
                <div><span>JUGADOR ESTADO</span><strong id="dbg-nav-player-state">—</strong></div>
                <div><span>JUGADOR CENTRO</span><strong id="dbg-nav-player-center">—</strong></div>
            </div>
            <div id="dbg-nav-note" class="debug-note">—</div>
            <div id="dbg-nav-legend" class="debug-note">RUTA REF = ruta teórica · REAL = velocidad observada · C = dirección actual · D = deseada · LOS = visión · TRAZA = recorrido real.</div>
            <pre id="dbg-nav-enemies" class="debug-log">Sin datos de navegación.</pre>
        </section>

        <section class="debug-section">
            <div class="debug-section-head"><div class="debug-section-title">INSPECTOR DE TEST</div><span id="dbg-last-test">—</span></div>
            <div id="dbg-test-summary" class="debug-note">Todavía no hay una prueba seleccionada.</div>
            <pre id="dbg-test-data" class="debug-log">Los detalles aparecerán acá al ejecutar un test.</pre>
        </section>

        <section class="debug-section debug-tests">
            <div class="debug-section-head"><div class="debug-section-title">TEST RUNNER</div><span id="dbg-suite">0/${Object.keys(window.DEBUG_TESTS || {}).length}</span></div>
            <div class="debug-test-list">
                ${Object.keys(window.DEBUG_TESTS || {}).map(name => `<button type="button" data-debug-test="${name}"><span>${name.replace('ai-stress','AI STRESS').replace('collision-stress','COLLISION STRESS').replace('room-stress','ROOM STRESS').toUpperCase()}</span><em id="dbg-test-${name}">PENDIENTE</em></button>`).join('')}
            </div>
        </section>

        <section class="debug-section">
            <div class="debug-section-head"><div class="debug-section-title">AI STRESS</div><span id="dbg-stress-head">PENDIENTE</span></div>
            <div id="dbg-stress-summary" class="debug-note">Ejecutá AI STRESS para probar movimiento, giros, rutas, bloqueos y evasión.</div>
            <pre id="dbg-stress-cases" class="debug-log">Sin resultados.</pre>
        </section>

        <section class="debug-section">
            <div class="debug-section-head"><div class="debug-section-title">COLLISION STRESS</div><span id="dbg-collision-stress-head">PENDIENTE</span></div>
            <div id="dbg-collision-stress-summary" class="debug-note">Ejecutá COLLISION STRESS para probar esquinas, corredores, obstáculos, bombas, overlaps y lane-lock.</div>

            <div class="debug-section-head"><div class="debug-section-title">ROOM STRESS</div><span id="dbg-room-stress-head">PENDIENTE</span></div>
            <div id="dbg-room-stress-summary" class="debug-note">Ejecutá ROOM STRESS para validar las seis topologías procedurales y sus rutas.</div>
            <pre id="dbg-collision-stress-data" class="debug-log">Sin resultados.</pre>
        </section>

        <section class="debug-section">
            <div class="debug-section-head"><div class="debug-section-title">EVENT LOG</div><span id="dbg-event-count">0</span></div>
            <div class="debug-action-grid">
                <button type="button" data-debug-action="clear-events">LIMPIAR EVENTOS</button>
            </div>
            <pre id="dbg-events" class="debug-log">Sin eventos.</pre>
        </section>

        <section class="debug-section">
            <div class="debug-section-head"><div class="debug-section-title">RUNTIME ERRORS</div><span id="dbg-error-count">0</span></div>
            <div class="debug-action-grid">
                <button type="button" data-debug-action="clear-errors">LIMPIAR ERRORES</button>
            </div>
            <pre id="dbg-error-log" class="debug-log debug-error-log">Sin errores.</pre>
        </section>

        <section class="debug-section">
            <div class="debug-section-title">ACCIONES</div>
            <div class="debug-action-grid">
                <button type="button" data-debug-action="bomb">💣 BOMBA</button>
                <button type="button" data-debug-action="damage">❤ DAÑO</button>
                <button type="button" data-debug-action="enemy">👾 ENEMIGO</button>
                <button type="button" data-debug-action="exit">SALIR DEBUG</button>
            </div>
        </section>
    `;
    document.body.appendChild(root);
    document.body.classList.add('debug-page');
    document.getElementById('game-container')?.classList.add('debug-enabled');

    const fmt = (value, decimals = 1) => Number.isFinite(Number(value)) ? Number(value).toFixed(decimals) : '—';
    const setText = (id, value) => { const node = document.getElementById(id); if (node) node.textContent = String(value); };

    function refresh() {
        const s = D.snapshot();
        setText('debug-status', s.status);
        setText('dbg-state-status', s.status);
        setText('dbg-engine', s.engine?.stateAvailable ? 'OK' : 'NO');
        setText('dbg-loop', s.engine?.playing ? (s.engine?.rafId ? 'RAF' : 'SIN RAF') : 'STOP');
        setText('dbg-pause', s.engine?.debugPaused ? 'DEBUG' : (s.engine?.gamePaused ? 'GAME' : 'NO'));
        setText('dbg-fps', fmt(s.performance.fps, 1));
        setText('dbg-frame-ms', fmt(s.performance.workMs ?? s.performance.frameMs, 2));
        setText('dbg-frame-interval', `${fmt(s.performance.avgFrameIntervalMs, 2)}ms`);
        setText('dbg-raf-range', `${fmt(s.performance.minIntervalMs, 1)} / ${fmt(s.performance.maxIntervalMs, 1)}`);
        setText('dbg-update-draw', `${fmt(s.performance.updateMs,1)} / ${fmt(s.performance.drawMs,1)}`);
        setText('dbg-frame', D.frameCount);
        setText('dbg-raf', s.engine?.rafId || 0);
        setText('dbg-errors', s.errors);
        setText('dbg-event-total', `${s.events}/${s.rawEvents || s.events}`);
        setText('dbg-event-collapsed', s.suppressedEvents || 0);

        const profiler = window.BOMBER_PROFILER?.snapshot?.() || null;
        if (profiler) {
            setText('dbg-profiler-status', profiler.enabled ? 'ON' : 'OFF');
            setText('dbg-prof-fps', profiler.frame.fps ? profiler.frame.fps.toFixed(1) : '0');
            setText('dbg-prof-work', `${profiler.frame.avgMs.toFixed(2)}ms`);
            setText('dbg-prof-p95', `${profiler.frame.p95Ms.toFixed(2)}ms`);
            setText('dbg-prof-max', `${profiler.frame.maxMs.toFixed(2)}ms`);
            setText('dbg-prof-budget', `${profiler.overBudgetPercent.toFixed(1)}%`);
            setText('dbg-prof-slow', profiler.slowFrames);
            setText('dbg-prof-hitch', profiler.hitchFrames);
            setText('dbg-prof-samples', profiler.totalFrames);
            if (profiler.memory.available) {
                setText('dbg-prof-memory', `MEMORIA · heap usada ${profiler.memory.usedMB.toFixed(1)}MB · total ${profiler.memory.totalMB.toFixed(1)}MB · límite ${profiler.memory.limitMB.toFixed(0)}MB`);
            } else {
                setText('dbg-prof-memory', 'MEMORIA · N/D en este navegador');
            }
            const systemLines = profiler.systems.slice(0, 14).map((item, index) =>
                `${String(index + 1).padStart(2, '0')} · ${item.label.padEnd(28)} avg ${item.avgMs.toFixed(3)}ms · p95 ${item.p95Ms.toFixed(3)}ms · max ${item.maxMs.toFixed(3)}ms · calls/f ${item.callsPerFrame.toFixed(1)}`
            );
            setText('dbg-prof-systems', profiler.enabled
                ? (systemLines.length ? systemLines.join('\n') : 'Recolectando muestras...')
                : 'Profiler OFF · activá PROFILE/F8 para recolectar muestras.');
        } else {
            setText('dbg-profiler-status', 'NO DISPONIBLE');
            setText('dbg-prof-systems', 'Profiler no cargado.');
        }

        const p = s.player;
        if (p) {
            setText('dbg-px', fmt(p.x, 1));
            setText('dbg-py', fmt(p.y, 1));
            setText('dbg-vx', fmt(p.vx, 2));
            setText('dbg-vy', fmt(p.vy, 2));
            setText('dbg-dir', p.dir);
            setText('dbg-desired', p.desiredDirection);
            setText('dbg-p-real', p.actualDirection || '—');
            setText('dbg-p-state', p.movementState || 'NO EXPUESTO');
            setText('dbg-tile', `${p.tile.x},${p.tile.y}`);
            setText('dbg-input', p.inputAxis);
            setText('dbg-p-reachable', p.reachableTiles ?? s.navigation?.player?.reachableTiles ?? '—');
            setText('dbg-p-center', p.distanceToCenter != null ? `${fmt(p.distanceToCenter,1)}px` : '—');
            setText('dbg-p-moved', p.movedPx != null ? `${fmt(p.movedPx,2)}px` : '—');
            setText('dbg-p-transitions', p.tileTransitions ?? '—');
            setText('dbg-p-stallframes', p.framesSinceProgress ?? '—');
            setText('dbg-p-sametile', p.sameTileMs != null ? `${fmt(p.sameTileMs,0)}ms` : '—');
            setText('dbg-p-progress', p.progressStatus || 'NO EXPUESTO');
            setText('dbg-hp', `${p.hp}/${p.maxHp}`);
            setText('dbg-bombs', `${p.bombsAvailable}/${p.bombsMax} · ${p.bombsPlaced} puestos`);
            setText('dbg-range', p.range);
            setText('dbg-speed', fmt(p.speed, 2));
            setText('dbg-shield', p.shield ? 'SI' : 'NO');
            setText('dbg-invuln', p.invulnerable ? `${Math.ceil(p.invulnerabilityMs)}ms` : 'NO');
            setText('dbg-moving', p.isMoving ? 'SI' : 'NO');
        } else {
            ['dbg-px','dbg-py','dbg-vx','dbg-vy','dbg-dir','dbg-desired','dbg-p-real','dbg-p-state','dbg-tile','dbg-input','dbg-p-reachable','dbg-p-center','dbg-p-moved','dbg-p-transitions','dbg-p-stallframes','dbg-p-sametile','dbg-p-progress','dbg-hp','dbg-bombs','dbg-range','dbg-speed','dbg-shield','dbg-invuln','dbg-moving'].forEach(id => setText(id, '—'));
        }

        const w = s.world;
        if (w) {
            setText('dbg-world-room', w.roomName || w.room);
            setText('dbg-depth', w.depth);
            setText('dbg-run', w.run);
            setText('dbg-room', w.room);
            setText('dbg-threat', w.threat);
            setText('dbg-time', `${Math.ceil(Math.max(0,w.roomTimeMs)/1000)}s`);
            setText('dbg-score', w.score);
            setText('dbg-coins', w.coins);
            setText('dbg-blocks', w.blocksBroken);
            setText('dbg-map', `${w.width}×${w.height}`);
            setText('dbg-enemies', w.enemies);
            setText('dbg-world-bombs', w.bombs);
            setText('dbg-explosions', w.explosions);
            setText('dbg-traps', w.traps);
            setText('dbg-active-traps', w.activeTraps);
            setText('dbg-particles', w.particles);
            setText('dbg-projectiles', w.projectiles);
            setText('dbg-boss', w.boss ? 'SI' : 'NO');
            setText('dbg-exit', w.exit);
            setText('dbg-layout', w.layout || '—');
        } else {
            ['dbg-world-room','dbg-depth','dbg-run','dbg-room','dbg-threat','dbg-time','dbg-score','dbg-coins','dbg-blocks','dbg-map','dbg-enemies','dbg-world-bombs','dbg-explosions','dbg-traps','dbg-active-traps','dbg-particles','dbg-projectiles','dbg-boss','dbg-exit'].forEach(id => setText(id, '—'));
        }

        const nav = s.navigation || {};
        const np = nav.player || {};
        setText('dbg-nav-player-tile', np.tile ? `${np.tile.x},${np.tile.y}` : '—');
        setText('dbg-nav-player-reachable', np.reachableTiles ?? 0);
        setText('dbg-nav-player-options', (np.options || []).join(' · ') || '—');
        setText('dbg-nav-player-junctions', np.junctions ?? 0);
        setText('dbg-nav-player-deadends', np.deadEnds ?? 0);
        const enemyNav = nav.enemies || [];
        setText('dbg-nav-routes', `${enemyNav.filter(e => e.canReachPlayer).length}/${enemyNav.length}`);
        setText('dbg-nav-truncated', np.truncated || enemyNav.some(e => e.truncated) ? 'SI' : 'NO');
        setText('dbg-nav-mode', nav.mode || '—');
        setText('dbg-nav-note', nav.note || 'Sin datos.');
        setText('dbg-nav-diagnostic', nav.available ? 'REFERENCIA + ESTADO REAL' : 'SIN DATOS');
        setText('dbg-nav-player-state', np.movementState || '—');
        setText('dbg-nav-player-center', np.distanceToCenter != null ? `${fmt(np.distanceToCenter,1)}px` : '—');
        const enemyLines = enemyNav.map(e => {
            const route = e.canReachPlayer ? `${e.routeLength} celdas` : 'SIN RUTA';
            const flags = [e.stuckLikely ? 'ATASCADO' : null, e.currentPassable === false ? 'BLOQUEADO-GRID' : null, e.physicalBlocked ? 'BLOQUEADO-HITBOX' : null, e.cornerCorrectionMs > 0 ? 'CORR-ESQUINA' : null, e.recoveryCount > 0 ? `REC#${e.recoveryCount}` : null, e.turnReady ? 'CENTRO' : null].filter(Boolean).join(',') || 'OK';
            return `E${e.index} · tile ${e.tile.x},${e.tile.y} · prev ${e.previousTile?.x},${e.previousTile?.y} · ${e.behavior}/${e.alert} · actual ${e.currentDirection} · deseada ${e.desiredDirection} · REAL ${e.actualDirection} · estado ${e.movementState} · progreso ${e.progressStatus} · mov ${fmt(e.movedPx,2)}px · trans ${e.tileTransitions || 0} · giros ${e.directionChanges || 0} · ruta ${route} · ref ${e.routeNextDirection}/${e.routeAlignment} · centro ${fmt(e.distanceToCenter,1)}px · fisBloq ${fmt(e.physicalBlockedMs,0)}ms · rec ${e.recoveryCount || 0} · BFS ${e.recoveryPathCalls || 0} · mem ${e.navigationMemoryTiles || 0} · navTurns ${e.navigationTurnCount || 0} · lock ${fmt(e.turnLockMs,0)}ms · sinProg ${e.framesSinceProgress || 0}f · ${flags} · target ${e.target?.x},${e.target?.y}`;
        });
        const navNode = document.getElementById('dbg-nav-enemies');
        if (navNode) navNode.textContent = enemyLines.length ? enemyLines.join('\n') : 'Sin enemigos en la escena.';

        const stress = s.aiStress;
        if (stress?.cases?.length) {
            setText('dbg-stress-head', `${stress.passed}/${stress.total} PASS`);
            const stuckCases = stress.cases.filter(c => c.stuckLikely).length;
            const blockedCases = stress.cases.filter(c => c.blockedFrames > 0).length;
            setText('dbg-stress-summary', `Movimiento real: ${stress.passed}/${stress.total} PASS · ${stress.failed} FAIL · atascos=${stuckCases} · bloqueos=${blockedCases}`);
            const stressNode = document.getElementById('dbg-stress-cases');
            if (stressNode) stressNode.textContent = stress.cases.map(c => {
                const bomb = c.maxBombDistance > 0 ? ` · bomba=${c.minBombDistance}→${c.maxBombDistance} · flee=${c.fleeFrames}` : '';
                const agree = c.routeDirectionAgreement != null ? ` · acuerdo=${c.routeDirectionAgreement}%` : '';
                const recovery = c.firstRecoveredDirection && c.firstRecoveredDirection !== '—' ? ` · rec=${c.firstRecoveredDirection}@${c.firstDirectionChangeFrame}f` : '';
                const corner = c.cornerCorrectionFrames ? ` · esquina=${c.cornerCorrectionFrames}f` : '';
                const physical = c.physicalBlockedFrames ? ` · fisBloq=${c.physicalBlockedFrames}f/${c.maxPhysicalBlockedMs}ms` : '';
                const noAssist = c.name === 'corner-recovery-no-player' ? ` · sinPlayer=${c.noPlayerAssist ? 'OK' : 'NO'}` : ''; 
                return `${c.status} ${c.name} · mov=${c.movedPx}px · trans=${c.tileTransitions} · giros=${c.directionChanges} · BFS=${c.recoveryPathCalls || 0} · lock=${Number(c.turnLockMs || 0).toFixed(0)}ms · ruta=${c.routeLength} · REAL=${c.finalAlert} · bloqueos=${c.blockedFrames} · pausaMax=${c.maxNoMoveFrames}f · centroMax=${c.maxCenterDistance}px · atascado=${c.stuckLikely ? 'SI' : 'NO'}${recovery}${corner}${physical}${noAssist}${agree}${bomb}${c.failure ? ` · ${c.failure}` : ''}`;
            }).join('\n');
        } else {
            setText('dbg-stress-head', 'PENDIENTE');
            setText('dbg-stress-summary', 'Ejecutá AI STRESS para probar movimiento, giros, rutas, bloqueos y evasión.');
            const stressNode = document.getElementById('dbg-stress-cases');
            if (stressNode) stressNode.textContent = 'Sin resultados.';
        }

        const navigationStressResult = D.testResults.slice().reverse().find(r => r.name === 'navigation-stress');
        if (navigationStressResult) {
            setText('dbg-nav-mode', `${navigationStressResult.status} · NAV STRESS`);
        }

        const roomStress = D.testResults.slice().reverse().find(r => r.name === 'room-stress');
        if (roomStress) {
            setText('dbg-room-stress-head', roomStress.status);
            setText('dbg-room-stress-summary', roomStress.summary);
        } else {
            setText('dbg-room-stress-head', 'PENDIENTE');
            setText('dbg-room-stress-summary', 'Ejecutá ROOM STRESS para validar las seis topologías procedurales y sus rutas.');
        }

        const collisionStress = D.testResults.slice().reverse().find(r => r.name === 'collision-stress');
        if (collisionStress) {
            setText('dbg-collision-stress-head', collisionStress.status || '—');
            setText('dbg-collision-stress-summary', collisionStress.summary || 'Sin resumen.');
            const collisionNode = document.getElementById('dbg-collision-stress-data');
            if (collisionNode) collisionNode.textContent = JSON.stringify(collisionStress.details || {}, null, 2);
        } else {
            setText('dbg-collision-stress-head', 'PENDIENTE');
            setText('dbg-collision-stress-summary', 'Ejecutá COLLISION STRESS para probar esquinas, corredores, obstáculos, bombas, overlaps y lane-lock.');
            const collisionNode = document.getElementById('dbg-collision-stress-data');
            if (collisionNode) collisionNode.textContent = 'Sin resultados.';
        }

        const last = D.lastTest;
        setText('dbg-last-test', last ? `${last.name.toUpperCase()} · ${last.status} · ${last.ms.toFixed(1)}ms` : '—');
        setText('dbg-test-summary', last ? last.summary : 'Todavía no hay una prueba seleccionada.');
        const dataNode = document.getElementById('dbg-test-data');
        if (dataNode) dataNode.textContent = last ? JSON.stringify(last.details ?? {}, null, 2) : 'Los detalles aparecerán acá al ejecutar un test.';

        const total = Object.keys(window.DEBUG_TESTS || {}).length;
        const passed = D.testResults.filter(r => r.status === 'PASS').length;
        const failed = D.testResults.filter(r => r.status === 'FAIL').length;
        setText('dbg-suite', `${passed} PASS · ${failed} FAIL · ${total}`);
        for (const name of Object.keys(window.DEBUG_TESTS || {})) {
            const node = document.getElementById(`dbg-test-${name}`);
            if (!node) continue;
            const result = [...D.testResults].reverse().find(r => r.name === name);
            node.textContent = result ? `${result.status} · ${Number(result.ms || 0).toFixed(0)}ms` : 'PENDIENTE';
            node.className = result ? (result.status === 'PASS' ? 'debug-pass' : 'debug-fail') : '';
            node.closest('button')?.classList.toggle('is-pass', result?.status === 'PASS');
            node.closest('button')?.classList.toggle('is-fail', result?.status === 'FAIL');
        }

        const eventNode = document.getElementById('dbg-events');
        if (eventNode) {
            eventNode.textContent = D.eventLog.slice(-100).map(item => {
                const suffix = item.data ? ` · ${safeInlineJson(item.data)}` : '';
                const repeat = Number(item.repeatCount || 1);
                return `[${item.wallTime}] ${item.type.padEnd(8)} ${item.message}${repeat > 1 ? ` · ×${repeat}` : ''}${suffix}`;
            }).join('\n') || 'Sin eventos.';
        }
        setText('dbg-event-count', D.eventLog.length);

        const errorNode = document.getElementById('dbg-error-log');
        if (errorNode) {
            errorNode.textContent = D.runtimeErrors.slice(-50).map((e, i) => {
                const loc = e.url ? ` · ${e.url}` : '';
                return `${i + 1}. [${e.wallTime}] ${e.source}: ${e.message}${loc}${e.stack ? `\n   ${e.stack.split('\n').slice(0,3).join('\n   ')}` : ''}`;
            }).join('\n\n') || 'Sin errores.';
        }
        setText('dbg-error-count', D.runtimeErrors.length);
    }

    function safeInlineJson(value) {
        try { return JSON.stringify(value); } catch (_) { return '[datos]'; }
    }

    function action(name) {
        if (name === 'toggle') D.toggleVisible();
        else if (name === 'pause') D.requestPause();
        else if (name === 'step') D.requestStep();
        else if (name === 'run-tests') D.runAllTests();
        else if (name === 'copy-tests') D.copyTestReport().then(result => {
            const button = root.querySelector('[data-debug-action="copy-tests"]');
            if (!button) return;
            const original = button.textContent;
            button.textContent = result.ok ? 'COPIADO ✓' : 'ERROR ✕';
            button.classList.toggle('is-pass', !!result.ok);
            button.classList.toggle('is-fail', !result.ok);
            window.setTimeout(() => {
                button.textContent = original;
                button.classList.remove('is-pass', 'is-fail');
            }, 1600);
        });
        else if (name === 'reset') D.resetScene();
        else if (name === 'bomb') D.manualBomb();
        else if (name === 'damage') D.manualDamage();
        else if (name === 'enemy') D.manualEnemy();
        else if (name === 'clear-events') D.clearEvents();
        else if (name === 'clear-errors') D.clearErrors();
        else if (name === 'profile') window.BOMBER_PROFILER?.toggle?.();
        else if (name === 'profile-reset') window.BOMBER_PROFILER?.reset?.();
        else if (name === 'exit') window.location.href = './';
    }

    root.addEventListener('click', event => {
        const actionButton = event.target.closest('[data-debug-action]');
        if (actionButton) {
            action(actionButton.dataset.debugAction);
            refresh();
            return;
        }
        const testButton = event.target.closest('[data-debug-test]');
        if (testButton) {
            D.runTest(testButton.dataset.debugTest);
            return;
        }
    });

    root.addEventListener('change', event => {
        const checkbox = event.target.closest('[data-debug-visual]');
        if (!checkbox) return;
        D.setVisual(checkbox.dataset.debugVisual, checkbox.checked);
        refresh();
    });

    window.addEventListener('bomber-debug-updated', refresh);
    window.setInterval(refresh, 120);
    refresh();
})();
