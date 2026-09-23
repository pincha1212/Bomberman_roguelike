// Bomberman Roguelike v3.16.2 — Debug Overlay
// Interfaz visual del Debug Engine. Solo existe cuando la URL contiene ?debug=1.
(() => {
    'use strict';
    if (!window.DEBUG_MODE?.enabled) return;

    const D = window.DEBUG_MODE;

    const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

    const root = document.createElement('aside');
    root.id = 'debug-overlay';
    root.className = 'debug-overlay';
    root.innerHTML = `
        <div class="debug-header">
            <div>
                <div class="debug-kicker">BOMBERMAN ENGINE</div>
                <h2>DEBUG MODE <span id="debug-status" class="debug-status">ACTIVO</span></h2>
            </div>
            <button type="button" class="debug-icon-btn" data-debug-action="toggle" title="Mostrar/ocultar panel">F3</button>
        </div>
        <div class="debug-toolbar">
            <button type="button" data-debug-action="pause">PAUSA <kbd>F4</kbd></button>
            <button type="button" data-debug-action="step">STEP <kbd>F6</kbd></button>
            <button type="button" data-debug-action="run-tests">TESTS <kbd>F7</kbd></button>
            <button type="button" data-debug-action="reset">RESET</button>
        </div>

        <section class="debug-section">
            <div class="debug-section-title">ESTADO</div>
            <div class="debug-grid debug-grid-3">
                <div><span>FPS</span><strong id="dbg-fps">0</strong></div>
                <div><span>FRAME</span><strong id="dbg-frame">0</strong></div>
                <div><span>FRAME MS</span><strong id="dbg-frame-ms">0</strong></div>
                <div><span>UPDATE</span><strong id="dbg-update-ms">0</strong></div>
                <div><span>DRAW</span><strong id="dbg-draw-ms">0</strong></div>
                <div><span>ERRORES</span><strong id="dbg-errors">0</strong></div>
            </div>
        </section>

        <section class="debug-section">
            <div class="debug-section-title">PLAYER</div>
            <div class="debug-grid debug-grid-4">
                <div><span>X</span><strong id="dbg-px">0</strong></div>
                <div><span>Y</span><strong id="dbg-py">0</strong></div>
                <div><span>VX</span><strong id="dbg-vx">0</strong></div>
                <div><span>VY</span><strong id="dbg-vy">0</strong></div>
                <div><span>DIR</span><strong id="dbg-dir">-</strong></div>
                <div><span>HP</span><strong id="dbg-hp">0</strong></div>
                <div><span>BOMBAS</span><strong id="dbg-bombs">0/0</strong></div>
                <div><span>RANGO</span><strong id="dbg-range">0</strong></div>
                <div><span>TILE X</span><strong id="dbg-tile-x">0</strong></div>
                <div><span>TILE Y</span><strong id="dbg-tile-y">0</strong></div>
                <div><span>INPUT</span><strong id="dbg-input">-</strong></div>
                <div><span>ESCUDO</span><strong id="dbg-shield">NO</strong></div>
            </div>
        </section>

        <section class="debug-section">
            <div class="debug-section-title">WORLD</div>
            <div class="debug-grid debug-grid-4">
                <div><span>DEPTH</span><strong id="dbg-depth">0</strong></div>
                <div><span>ROOM</span><strong id="dbg-room">-</strong></div>
                <div><span>THREAT</span><strong id="dbg-threat">0</strong></div>
                <div><span>TIME</span><strong id="dbg-time">0s</strong></div>
                <div><span>ENEMIGOS</span><strong id="dbg-enemies">0</strong></div>
                <div><span>BOMBAS</span><strong id="dbg-world-bombs">0</strong></div>
                <div><span>EXPLOSIONES</span><strong id="dbg-explosions">0</strong></div>
                <div><span>TRAMPAS</span><strong id="dbg-traps">0</strong></div>
                <div><span>PARTÍCULAS</span><strong id="dbg-particles">0</strong></div>
                <div><span>PROJECTILES</span><strong id="dbg-projectiles">0</strong></div>
                <div><span>BOSS</span><strong id="dbg-boss">NO</strong></div>
                <div><span>RUN</span><strong id="dbg-run">0</strong></div>
            </div>
        </section>

        <section class="debug-section">
            <div class="debug-section-title">VISUALIZADORES</div>
            <div class="debug-checks">
                <label><input type="checkbox" data-debug-visual="grid"> Grid</label>
                <label><input type="checkbox" data-debug-visual="collision"> Colisión</label>
                <label><input type="checkbox" data-debug-visual="hitboxes"> Hitboxes</label>
                <label><input type="checkbox" data-debug-visual="bombs"> Bombas</label>
                <label><input type="checkbox" data-debug-visual="explosions"> Explosiones</label>
                <label><input type="checkbox" data-debug-visual="ai"> IA</label>
                <label><input type="checkbox" data-debug-visual="camera"> Cámara</label>
                <label><input type="checkbox" data-debug-visual="spawns"> Spawns</label>
                <label><input type="checkbox" data-debug-visual="paths"> Rutas / alcance</label>
            </div>
        </section>

        <section class="debug-section">
            <div class="debug-section-head"><div class="debug-section-title">NAVEGACIÓN</div><span id="dbg-nav-count">0</span></div>
            <div class="debug-grid debug-grid-3">
                <div><span>PLAYER TILE</span><strong id="dbg-nav-player-tile">-</strong></div>
                <div><span>ALCANZABLES</span><strong id="dbg-nav-player-reachable">0</strong></div>
                <div><span>GIROS POSIBLES</span><strong id="dbg-nav-player-options">-</strong></div>
            </div>
            <div id="dbg-nav-note" class="debug-note">Rutas de referencia: BFS sobre la rejilla actual. No modifica la IA ni el movimiento.</div>
            <pre id="dbg-nav-enemies" class="debug-log">Sin datos de navegación.</pre>
        </section>

        <section class="debug-section">
            <div class="debug-section-head"><div class="debug-section-title">INSPECTOR DE TEST</div><span id="dbg-last-test">—</span></div>
            <div id="dbg-test-summary" class="debug-note">Ejecutá una prueba para ver sus datos.</div>
            <pre id="dbg-test-data" class="debug-log">Ejecutá una prueba para ver sus datos.</pre>
        </section>

        <section class="debug-section">
            <div class="debug-section-title">ACCIONES</div>
            <div class="debug-action-grid">
                <button type="button" data-debug-action="bomb">💣 BOMBA</button>
                <button type="button" data-debug-action="damage">❤ DAÑO</button>
                <button type="button" data-debug-action="enemy">👾 ENEMIGO</button>
                <button type="button" data-debug-action="clear">⌫ LIMPIAR LOG</button>
                <button type="button" data-debug-action="exit">SALIR DEBUG</button>
            </div>
        </section>

        <section class="debug-section debug-tests">
            <div class="debug-section-head"><div class="debug-section-title">TEST RUNNER</div><span id="dbg-suite">0/7</span></div>
            <div class="debug-test-list">
                ${['movement','bombs','damage','traps','enemies','camera','restart'].map(name => `<button type="button" data-debug-test="${name}"><span>${name.toUpperCase()}</span><em id="dbg-test-${name}">—</em></button>`).join('')}
            </div>
        </section>

        <section class="debug-section">
            <div class="debug-section-head"><div class="debug-section-title">EVENT LOG</div><span id="dbg-event-count">0</span></div>
            <pre id="dbg-events" class="debug-log">Sin eventos.</pre>
        </section>

        <section class="debug-section">
            <div class="debug-section-head"><div class="debug-section-title">RUNTIME ERRORS</div><span id="dbg-error-count">0</span></div>
            <pre id="dbg-error-log" class="debug-log debug-error-log">Sin errores.</pre>
        </section>
    `;
    document.body.appendChild(root);

    document.body.classList.add('debug-page');
    const gameContainer = document.getElementById('game-container');
    gameContainer?.classList.add('debug-enabled');

    function setText(id, value) {
        const node = document.getElementById(id);
        if (node) node.textContent = String(value);
    }

    function refresh() {
        const s = D.snapshot();
        setText('dbg-fps', fmt(s.performance.fps, 1));
        setText('dbg-frame', s.performance.frameMs > 0 ? D.frameCount : 0);
        setText('dbg-frame-ms', fmt(s.performance.frameMs, 2));
        setText('dbg-update-ms', fmt(s.performance.updateMs, 2));
        setText('dbg-draw-ms', fmt(s.performance.drawMs, 2));
        setText('dbg-errors', s.errors);
        setText('dbg-px', fmt(s.player.x, 1));
        setText('dbg-py', fmt(s.player.y, 1));
        setText('dbg-vx', fmt(s.player.vx, 1));
        setText('dbg-vy', fmt(s.player.vy, 1));
        setText('dbg-dir', s.player.dir);
        setText('dbg-hp', s.player.hp);
        setText('dbg-bombs', `${s.player.bombsPlaced}/${s.player.bombs}`);
        setText('dbg-range', s.player.range);
        setText('dbg-tile-x', s.player.tile.x);
        setText('dbg-tile-y', s.player.tile.y);
        setText('dbg-input', s.player.inputAxis || '-');
        setText('dbg-shield', s.player.shield ? 'SI' : 'NO');
        setText('dbg-depth', s.depth);
        setText('dbg-room', s.room);
        setText('dbg-threat', s.threat);
        setText('dbg-time', `${Math.ceil(Math.max(0, s.roomTime) / 1000)}s`);
        setText('dbg-enemies', s.world.enemies);
        setText('dbg-world-bombs', s.world.bombs);
        setText('dbg-explosions', s.world.explosions);
        setText('dbg-traps', s.world.hazards);
        setText('dbg-particles', s.world.particles);
        setText('dbg-projectiles', s.world.projectiles);
        setText('dbg-boss', s.world.boss ? 'SI' : 'NO');
        setText('dbg-run', s.run);

        const nav = s.navigation || {};
        const playerNav = nav.player || {};
        setText('dbg-nav-player-tile', `${playerNav.tile?.x ?? '-'},${playerNav.tile?.y ?? '-'}`);
        setText('dbg-nav-player-reachable', playerNav.reachableTiles ?? 0);
        setText('dbg-nav-player-options', (playerNav.options || []).join(' · ') || '-');
        setText('dbg-nav-note', nav.mode === 'reference-bfs' ? 'Rutas de referencia: BFS sobre la rejilla actual. No modifica la IA ni el movimiento.' : 'Navegación no disponible.');
        setText('dbg-nav-count', `${(nav.enemies || []).filter(e => e.canReachPlayer).length}/${(nav.enemies || []).length}`);
        const navLines = (nav.enemies || []).map(e => {
            const route = e.canReachPlayer ? `${e.routeLength} celdas` : 'SIN RUTA';
            const opts = e.options?.join(',') || '-';
            return `E${e.index} · T${e.tile.x},${e.tile.y} · ${e.behavior}/${e.alert} · ${e.direction}→${e.desiredDirection} · ruta=${route} · opciones=${opts}`;
        }).join('\n');
        const navNode = document.getElementById('dbg-nav-enemies');
        if (navNode) { navNode.textContent = navLines || 'Sin enemigos.'; navNode.scrollTop = navNode.scrollHeight; }

        setText('debug-status', D.busy ? 'TESTS' : (!s.playing ? 'DETENIDO' : (D.paused ? 'PAUSADO' : 'ACTIVO')));

        const eventText = D.eventLog.slice(-80).map(item => {
            const t = item.wallTime || '--:--:--';
            return `[${t}] ${item.type.padEnd(6)} ${item.message}`;
        }).join('\n');
        const eventNode = document.getElementById('dbg-events');
        if (eventNode) {
            eventNode.textContent = eventText || 'Sin eventos.';
            eventNode.scrollTop = eventNode.scrollHeight;
        }
        setText('dbg-event-count', D.eventLog.length);

        const errorNode = document.getElementById('dbg-error-log');
        if (errorNode) {
            errorNode.textContent = D.runtimeErrors.slice(-40).map(e => `${e.source}: ${e.message}`).join('\n') || 'Sin errores.';
            errorNode.scrollTop = errorNode.scrollHeight;
        }
        setText('dbg-error-count', D.runtimeErrors.length);

        const lastTest = D.lastTest;
        setText('dbg-last-test', lastTest ? `${lastTest.name.toUpperCase()} · ${lastTest.status} · ${lastTest.ms.toFixed(1)}ms` : '—');
        const testDataNode = document.getElementById('dbg-test-data');
        setText('dbg-test-summary', lastTest ? lastTest.summary : 'Ejecutá una prueba para ver sus datos.');
        if (testDataNode) {
            testDataNode.textContent = lastTest ? JSON.stringify(lastTest.details ?? {}, null, 2) : 'Ejecutá una prueba para ver sus datos.';
            testDataNode.scrollTop = 0;
        }

        const results = D.testResults;
        const passed = results.filter(r => r.status === 'PASS').length;
        const tests = window.DEBUG_TESTS || {};
        setText('dbg-suite', `${passed}/${Object.keys(tests).length}`);
        for (const name of Object.keys(tests)) {
            const result = results.slice().reverse().find(r => r.name === name);
            const node = document.getElementById(`dbg-test-${name}`);
            if (!node) continue;
            node.textContent = result ? `${result.status === 'PASS' ? 'PASS' : 'FAIL'} · ${Number(result.ms || 0).toFixed(0)}ms` : '—';
            node.title = result ? String(result.result || '') : '';
            node.className = result ? (result.status === 'PASS' ? 'debug-pass' : 'debug-fail') : '';
            const parent = node.closest('button');
            parent?.classList.toggle('is-pass', result?.status === 'PASS');
            parent?.classList.toggle('is-fail', result?.status === 'FAIL');
        }
    }

    function action(name) {
        if (name === 'toggle') D.toggleVisible();
        else if (name === 'pause') D.requestPause();
        else if (name === 'step') D.requestStep();
        else if (name === 'run-tests') D.runAllTests();
        else if (name === 'reset') D.resetScene();
        else if (name === 'bomb') D.manualBomb();
        else if (name === 'damage') D.manualDamage();
        else if (name === 'enemy') D.manualEnemy();
        else if (name === 'clear') D.clearEvents();
        else if (name === 'exit') window.location.href = './';
    }

    root.addEventListener('click', event => {
        const actionButton = event.target.closest('[data-debug-action]');
        if (actionButton) action(actionButton.dataset.debugAction);
        const testButton = event.target.closest('[data-debug-test]');
        if (testButton) D.runTest(testButton.dataset.debugTest);
    });

    root.addEventListener('change', event => {
        const checkbox = event.target.closest('[data-debug-visual]');
        if (!checkbox) return;
        D.setVisual(checkbox.dataset.debugVisual, checkbox.checked);
        window.dispatchEvent(new CustomEvent('bomber-debug-visual-change'));
    });

    window.addEventListener('bomber-debug-updated', refresh);
    window.setInterval(refresh, 150);
    refresh();

    D.recordEvent('DEBUG', 'Debug Engine iniciado en el mismo runtime del juego.');
    D.recordEvent('DEBUG', 'Atajos: F3 panel · F4 pausa · F6 step · F7 suite.');
})();
