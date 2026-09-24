// Bomberman Roguelike v3.28.5 — Unified Debug Overlay
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
                <div class="debug-kicker">BOMBERMAN ENGINE · v3.28.5</div>
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
            <button type="button" data-debug-action="copy-tests" title="Copia resultados de tests y diagnóstico en texto plano">COPIAR RESULTADOS</button>
        </div>

        <nav class="debug-jump" aria-label="Navegación rápida de Debug Mode">
            <button type="button" class="is-active" data-debug-jump="dbg-section-state">ESTADO</button>
            <button type="button" data-debug-jump="dbg-section-profile">PERFIL</button>
            <button type="button" data-debug-jump="dbg-section-player">PLAYER</button>
            <button type="button" data-debug-jump="dbg-section-world">WORLD</button>
            <button type="button" data-debug-jump="dbg-section-navigation">NAVEGACIÓN</button>
            <button type="button" data-debug-jump="dbg-section-tests">TESTS</button>
            <button type="button" data-debug-jump="dbg-section-diagnostic">DIAGNÓSTICO</button>
            <button type="button" data-debug-jump="dbg-section-events">LOG</button>
            <button type="button" data-debug-jump="dbg-section-errors">ERRORES</button>
            <button type="button" data-debug-jump="dbg-section-actions">ACCIONES</button>
        </nav>

        <div class="debug-scroll" id="debug-scroll">
        <section id="dbg-section-state" class="debug-section">
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

        <section id="dbg-section-profile" class="debug-section">
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

        <section id="dbg-section-player" class="debug-section">
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

        <section id="dbg-section-world" class="debug-section">
            <div class="debug-section-head"><div class="debug-section-title">WORLD</div><span id="dbg-world-room">—</span></div>
            <div class="debug-grid debug-grid-4">
                <div><span>DEPTH</span><strong id="dbg-depth">—</strong></div>
                <div><span>RUN</span><strong id="dbg-run">—</strong></div>
                <div><span>ROOM</span><strong id="dbg-room">—</strong></div>
                <div><span>THREAT</span><strong id="dbg-threat">—</strong></div>
                <div><span>DIFICULTAD</span><strong id="dbg-difficulty">—</strong></div>
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

        <section id="dbg-section-navigation" class="debug-section debug-section-navigation">
            <div class="debug-section-title">NAVEGACIÓN</div>
            <div class="debug-nav-controls">
                <label>OBJETIVO <select id="dbg-nav-selected"><option value="player">JUGADOR</option></select></label>
                <button type="button" data-debug-action="navigation-refresh">ACTUALIZAR NAVEGACIÓN</button>
            </div>
            <div class="debug-checks">
                <label><input type="checkbox" data-debug-visual="paths" checked> Rutas</label>
                <label><input type="checkbox" data-debug-visual="reachable" checked> Alcance</label>
                <label><input type="checkbox" data-debug-visual="grid"> Grid</label>
                <label><input type="checkbox" data-debug-visual="collision"> Colisión</label>
                <label><input type="checkbox" data-debug-visual="hitboxes"> Hitboxes</label>
                <label><input type="checkbox" data-debug-visual="bombs"> Bombas</label>
                <label><input type="checkbox" data-debug-visual="explosions"> Explosiones</label>
                <label><input type="checkbox" data-debug-visual="ai"> IA</label>
                <label><input type="checkbox" data-debug-visual="camera"> Cámara</label>
                <label><input type="checkbox" data-debug-visual="spawns"> Spawns</label>
            </div>
            <div class="debug-nav-visual-wrap">
                <canvas id="dbg-nav-map" width="420" height="420" aria-label="Mapa de navegación del nivel"></canvas>
                <div id="dbg-nav-map-status" class="debug-nav-map-status">MAPA: esperando datos</div>
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

        <section id="dbg-section-inspector" class="debug-section">
            <div class="debug-section-head"><div class="debug-section-title">INSPECTOR DE TEST</div><span id="dbg-last-test">—</span></div>
            <div id="dbg-test-summary" class="debug-note">Todavía no hay una prueba seleccionada.</div>
            <pre id="dbg-test-data" class="debug-log">Los detalles aparecerán acá al ejecutar un test.</pre>
        </section>

        <section id="dbg-section-tests" class="debug-section debug-tests">
            <div class="debug-section-head"><div class="debug-section-title">TEST RUNNER</div><span id="dbg-suite">0/${Object.keys(window.DEBUG_TESTS || {}).length}</span></div>
            <div id="dbg-test-list" class="debug-test-list"></div>
        </section>

        <section id="dbg-section-stress" class="debug-section">
            <div class="debug-section-head"><div class="debug-section-title">AI STRESS</div><span id="dbg-stress-head">PENDIENTE</span></div>
            <div id="dbg-stress-summary" class="debug-note">Ejecutá AI STRESS para probar movimiento, giros, rutas, bloqueos y evasión.</div>
            <pre id="dbg-stress-cases" class="debug-log">Sin resultados.</pre>
        </section>

        <section id="dbg-section-stress-detail" class="debug-section">
            <div class="debug-section-head"><div class="debug-section-title">COLLISION STRESS</div><span id="dbg-collision-stress-head">PENDIENTE</span></div>
            <div id="dbg-collision-stress-summary" class="debug-note">Ejecutá COLLISION STRESS para probar esquinas, corredores, obstáculos, bombas, overlaps y lane-lock.</div>

            <div class="debug-section-head"><div class="debug-section-title">ROOM STRESS</div><span id="dbg-room-stress-head">PENDIENTE</span></div>
            <div id="dbg-room-stress-summary" class="debug-note">Ejecutá ROOM STRESS para validar las seis topologías procedurales y sus rutas.</div>
            <pre id="dbg-collision-stress-data" class="debug-log">Sin resultados.</pre>
            <div class="debug-section-head"><div class="debug-section-title">DIFFICULTY STRESS</div><span id="dbg-difficulty-stress-head">PENDIENTE</span></div>
            <div id="dbg-difficulty-stress-summary" class="debug-note">Ejecutá DIFFICULTY STRESS para validar progresión por profundidad.</div>
        </section>

        <section id="dbg-section-diagnostic" class="debug-section">
            <div class="debug-section-head"><div class="debug-section-title">DIAGNÓSTICO UNIFICADO</div><span id="dbg-health-status">PENDIENTE</span></div>
            <div class="debug-action-grid">
                <button type="button" data-debug-action="health">DIAGNÓSTICO</button>
                <button type="button" data-debug-action="snapshot">SNAPSHOT</button>
                <button type="button" data-debug-action="timeline">TIMELINE</button>
                <button type="button" data-debug-action="copy-tests">COPIAR RESULTADOS</button>
            </div>
            <div class="debug-note" id="dbg-health-summary">Sin diagnóstico.</div>
            <pre id="dbg-health-data" class="debug-log">Ejecutá DIAGNÓSTICO para comprobar el runtime.</pre>
            <div class="debug-note" id="dbg-snapshot-summary">Snapshot: pendiente.</div>
            <pre id="dbg-timeline-data" class="debug-log">Timeline: 0/120 muestras.</pre>
            <pre id="dbg-copy-preview" class="debug-log">La copia será texto plano.</pre>
        </section>

        <section id="dbg-section-events" class="debug-section">
            <div class="debug-section-head"><div class="debug-section-title">EVENT LOG</div><span id="dbg-event-count">0</span></div>
            <div class="debug-action-grid">
                <button type="button" data-debug-action="clear-events">LIMPIAR EVENTOS</button>
            </div>
            <pre id="dbg-events" class="debug-log">Sin eventos.</pre>
        </section>

        <section id="dbg-section-errors" class="debug-section">
            <div class="debug-section-head"><div class="debug-section-title">RUNTIME ERRORS</div><span id="dbg-error-count">0</span></div>
            <div class="debug-action-grid">
                <button type="button" data-debug-action="clear-errors">LIMPIAR ERRORES</button>
            </div>
            <pre id="dbg-error-log" class="debug-log debug-error-log">Sin errores.</pre>
        </section>

        <section id="dbg-section-actions" class="debug-section">
            <div class="debug-section-title">ACCIONES</div>
            <div class="debug-action-grid">
                <button type="button" data-debug-action="bomb">💣 BOMBA</button>
                <button type="button" data-debug-action="damage">❤ DAÑO</button>
                <button type="button" data-debug-action="enemy">👾 ENEMIGO</button>
                <button type="button" data-debug-action="exit">SALIR DEBUG</button>
            </div>
        </section>
        </div>
    `;
    document.body.appendChild(root);
    document.body.classList.add('debug-page');
    document.getElementById('game-container')?.classList.add('debug-enabled');

    const style = document.createElement('style');
    style.id = 'debug-v3285-inline-style';
    style.textContent = `
#debug-overlay{position:fixed;top:12px;right:12px;bottom:12px;width:min(500px,calc(100vw - 24px));z-index:99999;display:flex;flex-direction:column;overflow:hidden;background:rgba(7,12,22,.97);color:#e5e7eb;border:1px solid rgba(148,163,184,.35);border-radius:14px;box-shadow:0 18px 60px rgba(0,0,0,.55);font:12px/1.4 Inter,system-ui,sans-serif;backdrop-filter:blur(10px)}
#debug-overlay.hidden{display:none}
#debug-overlay .debug-header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:14px 16px 10px;border-bottom:1px solid rgba(148,163,184,.18)}
#debug-overlay .debug-kicker{font-size:10px;letter-spacing:.08em;opacity:.65}
#debug-overlay h2{margin:3px 0 0;font-size:18px;letter-spacing:.04em}
#debug-overlay .debug-toolbar,#debug-overlay .debug-action-grid{display:flex;flex-wrap:wrap;gap:6px;padding:8px 12px}
#debug-overlay button,#debug-overlay select{font:600 11px/1.1 Inter,system-ui,sans-serif;color:#e5e7eb;background:#111827;border:1px solid #334155;border-radius:7px;padding:7px 9px;cursor:pointer}
#debug-overlay button:hover{border-color:#64748b;background:#172033}
#debug-overlay .debug-jump{flex:0 0 auto;display:flex;gap:5px;overflow-x:auto;overflow-y:hidden;padding:7px 12px;background:rgba(7,12,22,.995);border-top:1px solid rgba(148,163,184,.12);border-bottom:1px solid rgba(148,163,184,.16);scrollbar-width:thin}
#debug-overlay .debug-jump button{white-space:nowrap;padding:6px 8px;font-size:10px;flex:0 0 auto}
#debug-overlay .debug-jump button.is-active{border-color:#60a5fa;background:#1d4ed8;color:#fff}
#debug-overlay .debug-scroll{min-height:0;flex:1 1 auto;overflow-y:auto;overflow-x:hidden;scroll-behavior:smooth;overscroll-behavior:contain;scroll-padding-top:8px}
#debug-overlay .debug-scroll::-webkit-scrollbar{width:8px}
#debug-overlay .debug-scroll::-webkit-scrollbar-thumb{background:rgba(148,163,184,.32);border-radius:8px}
#debug-overlay .debug-section{padding:12px;border-bottom:1px solid rgba(148,163,184,.12)}
#debug-overlay .debug-section{scroll-margin-top:8px}
#debug-overlay .debug-section-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px}
#debug-overlay .debug-section-title{font-weight:800;letter-spacing:.08em;font-size:11px}
#debug-overlay .debug-grid{display:grid;gap:5px}
#debug-overlay .debug-grid-3{grid-template-columns:repeat(3,minmax(0,1fr))}
#debug-overlay .debug-grid-4{grid-template-columns:repeat(4,minmax(0,1fr))}
#debug-overlay .debug-grid>div{min-width:0;padding:7px 8px;border:1px solid rgba(148,163,184,.14);border-radius:7px;background:rgba(15,23,42,.72)}
#debug-overlay .debug-grid span{display:block;font-size:9px;opacity:.55;text-transform:uppercase}
#debug-overlay .debug-grid strong{display:block;margin-top:2px;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#debug-overlay .debug-checks{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
#debug-overlay .debug-checks label,#debug-overlay .debug-nav-controls label{display:flex;align-items:center;gap:5px;font-size:10px}
#debug-overlay .debug-nav-controls{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:7px 0;flex-wrap:wrap}
#debug-overlay .debug-nav-controls select{padding:6px 8px}
#debug-overlay .debug-nav-visual-wrap{position:relative;width:100%;display:grid;place-items:center;margin:8px 0 10px;padding:8px;border:1px solid rgba(148,163,184,.16);border-radius:10px;background:#050a12}
#debug-overlay #dbg-nav-map{width:min(100%,420px);height:auto;aspect-ratio:1;display:block;image-rendering:pixelated}
#debug-overlay .debug-nav-map-status{width:100%;margin-top:7px;text-align:center;font:10px/1.2 ui-monospace,SFMono-Regular,Consolas,monospace;opacity:.72}
#debug-overlay .debug-note{margin:7px 0;padding:7px 8px;border-left:2px solid #475569;background:rgba(15,23,42,.65);font-size:10px}
#debug-overlay .debug-log{margin:8px 0 0;max-height:190px;overflow:auto;padding:8px;border:1px solid rgba(148,163,184,.14);border-radius:7px;background:#030712;color:#cbd5e1;white-space:pre-wrap;word-break:break-word;font:10px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace}
#debug-overlay .debug-test-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}
#debug-overlay .debug-test-list button{display:flex;justify-content:space-between;align-items:center;text-align:left;gap:6px}
#debug-overlay .debug-test-list em{font-style:normal;font-size:9px;opacity:.7}
#debug-overlay .is-pass{border-color:#3f8f5d!important}
#debug-overlay .is-fail{border-color:#b24b4b!important}
@media(max-width:700px){#debug-overlay{top:6px;right:6px;bottom:6px;width:calc(100vw - 12px)}#debug-overlay .debug-grid-4{grid-template-columns:repeat(2,minmax(0,1fr))}#debug-overlay .debug-grid-3{grid-template-columns:repeat(2,minmax(0,1fr))}}
`;
    document.head.appendChild(style);

    const fmt = (value, decimals = 1) => Number.isFinite(Number(value)) ? Number(value).toFixed(decimals) : '—';
    const setText = (id, value) => { const node = document.getElementById(id); if (node) node.textContent = String(value); };

    let selectedNavTarget = 'player';

    function refreshNavSelector(enemyNav) {
        const select = document.getElementById('dbg-nav-selected');
        if (!select) return;
        const wanted = selectedNavTarget;
        const options = ['<option value="player">JUGADOR</option>'];
        for (const e of enemyNav) options.push(`<option value="enemy:${e.index}">ENEMIGO E${e.index} · ${e.archetypeLabel || e.behavior || 'ENEMY'}</option>`);
        select.innerHTML = options.join('');
        const valid = Array.from(select.options).some(o => o.value === wanted);
        selectedNavTarget = valid ? wanted : 'player';
        select.value = selectedNavTarget;
    }

    function drawNavigationMap(snapshot) {
        const canvas = document.getElementById('dbg-nav-map');
        const status = document.getElementById('dbg-nav-map-status');
        const state = window.BOMBER_ENGINE?.getState?.();
        if (!canvas || !state || !Array.isArray(state.grid)) {
            if (status) status.textContent = 'MAPA: sin rejilla';
            return;
        }
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const cols = Number(state.gridWidth || state.grid[0]?.length || 0);
        const rows = Number(state.gridHeight || state.grid.length || 0);
        if (!cols || !rows) return;
        const cw = canvas.width / cols;
        const ch = canvas.height / rows;
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle = '#050a12';
        ctx.fillRect(0,0,canvas.width,canvas.height);

        const tileType = (x,y) => state.grid[y]?.[x];
        for (let y=0;y<rows;y++) for (let x=0;x<cols;x++) {
            const type = tileType(x,y);
            if (type === window.TYPES?.WALL) ctx.fillStyle = '#263245';
            else if (type === window.TYPES?.BLOCK) ctx.fillStyle = '#4b3a2a';
            else ctx.fillStyle = '#0d1522';
            ctx.fillRect(x*cw+1,y*ch+1,Math.max(1,cw-2),Math.max(1,ch-2));
        }

        const nav = snapshot?.navigation || {};
        const reachable = new Set((nav.player?.cells || []).map(c => `${c.x},${c.y}`));
        if (D.selectedVisuals.reachable !== false) {
            ctx.fillStyle = 'rgba(34,197,94,.12)';
            for (const key of reachable) {
                const [x,y] = key.split(',').map(Number);
                ctx.fillRect(x*cw+2,y*ch+2,Math.max(1,cw-4),Math.max(1,ch-4));
            }
        }

        const drawRoute = (route) => {
            if (!D.selectedVisuals.paths || !Array.isArray(route) || route.length < 2) return;
            ctx.beginPath();
            route.forEach((p,i)=>{ const px=(p.x+.5)*cw, py=(p.y+.5)*ch; if(i===0)ctx.moveTo(px,py); else ctx.lineTo(px,py); });
            ctx.strokeStyle = 'rgba(56,189,248,.9)';
            ctx.lineWidth = Math.max(2,Math.min(5,cw*.18));
            ctx.stroke();
        };

        const selectedEnemy = selectedNavTarget.startsWith('enemy:') ? nav.enemies?.find(e => `enemy:${e.index}`===selectedNavTarget) : null;
        if (selectedEnemy) drawRoute(selectedEnemy.route);
        else if (D.selectedVisuals.paths && Array.isArray(nav.player?.trail) && nav.player.trail.length > 1) {
            drawRoute(nav.player.trail.map(t=>({x:t.x,y:t.y})));
        }

        if (D.selectedVisuals.bombs) {
            for (const b of state.bombs || []) {
                ctx.beginPath(); ctx.arc((b.x+.5)*cw,(b.y+.5)*ch,Math.max(3,cw*.23),0,Math.PI*2); ctx.fillStyle='#f59e0b'; ctx.fill();
            }
        }
        if (D.selectedVisuals.explosions) {
            for (const e of state.explosions || []) {
                ctx.fillStyle='rgba(249,115,22,.75)'; ctx.fillRect(e.x*cw+2,e.y*ch+2,Math.max(1,cw-4),Math.max(1,ch-4));
            }
        }

        const playerTile = nav.player?.tile || {x:-1,y:-1};
        if (playerTile.x >= 0) {
            ctx.beginPath(); ctx.arc((playerTile.x+.5)*cw,(playerTile.y+.5)*ch,Math.max(4,cw*.27),0,Math.PI*2); ctx.fillStyle='#22c55e'; ctx.fill();
            ctx.strokeStyle='#dcfce7'; ctx.lineWidth=1.5; ctx.stroke();
        }

        for (const e of nav.enemies || []) {
            const x=e.tile?.x, y=e.tile?.y; if(!Number.isFinite(x)||!Number.isFinite(y))continue;
            const size=Math.max(5,cw*.32); const px=x*cw+cw/2-size/2, py=y*ch+ch/2-size/2;
            ctx.fillStyle = e.stuckLikely ? '#ef4444' : (e.physicalBlocked || e.currentPassable === false ? '#f59e0b' : '#a855f7');
            ctx.fillRect(px,py,size,size);
            if (D.selectedVisuals.ai) {
                const dir=e.actualDirection||'STILL';
                const vec={UP:[0,-1],DOWN:[0,1],LEFT:[-1,0],RIGHT:[1,0]}[dir]||[0,0];
                ctx.beginPath(); ctx.moveTo((x+.5)*cw,(y+.5)*ch); ctx.lineTo((x+.5+vec[0]*.34)*cw,(y+.5+vec[1]*.34)*ch); ctx.strokeStyle='#f8fafc'; ctx.lineWidth=1.5; ctx.stroke();
            }
        }

        if (D.selectedVisuals.grid) {
            ctx.strokeStyle='rgba(148,163,184,.14)'; ctx.lineWidth=1;
            for(let x=0;x<=cols;x++){ctx.beginPath();ctx.moveTo(x*cw,0);ctx.lineTo(x*cw,canvas.height);ctx.stroke();}
            for(let y=0;y<=rows;y++){ctx.beginPath();ctx.moveTo(0,y*ch);ctx.lineTo(canvas.width,y*ch);ctx.stroke();}
        }

        if (D.selectedVisuals.camera && snapshot.camera) {
            const cam=snapshot.camera; const viewportW=600, viewportH=600;
            ctx.strokeStyle='rgba(236,72,153,.85)'; ctx.lineWidth=2; ctx.strokeRect((cam.x/48)*cw,(cam.y/48)*ch,(viewportW/48)*cw,(viewportH/48)*ch);
        }
        if (D.selectedVisuals.spawns) {
            const exit=state.exitPos; if(exit){ctx.strokeStyle='#38bdf8';ctx.lineWidth=2;ctx.strokeRect(exit.x*cw+cw*.2,exit.y*ch+ch*.2,cw*.6,ch*.6);}
        }
        if (status) status.textContent = `MAPA ${cols}×${rows} · ${selectedNavTarget==='player'?'JUGADOR':selectedNavTarget.replace('enemy:','E')} · ${nav.available?'DATOS ACTUALES':'SIN DATOS DE NAVEGACIÓN'}`;
    }

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
            setText('dbg-difficulty', w.difficulty || '—');
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
            return `E${e.index} · tile ${e.tile.x},${e.tile.y} · prev ${e.previousTile?.x},${e.previousTile?.y} · ${e.archetypeLabel || e.archetype || '—'} · ${e.behavior}/${e.alert} · actual ${e.currentDirection} · deseada ${e.desiredDirection} · REAL ${e.actualDirection} · estado ${e.movementState} · progreso ${e.progressStatus} · mov ${fmt(e.movedPx,2)}px · trans ${e.tileTransitions || 0} · giros ${e.directionChanges || 0} · ruta ${route} · ref ${e.routeNextDirection}/${e.routeAlignment} · centro ${fmt(e.distanceToCenter,1)}px · fisBloq ${fmt(e.physicalBlockedMs,0)}ms · rec ${e.recoveryCount || 0} · BFS ${e.recoveryPathCalls || 0} · mem ${e.navigationMemoryTiles || 0} · navTurns ${e.navigationTurnCount || 0} · lock ${fmt(e.turnLockMs,0)}ms · sinProg ${e.framesSinceProgress || 0}f · ${flags} · target ${e.target?.x},${e.target?.y}`;
        });
        const navNode = document.getElementById('dbg-nav-enemies');
        if (navNode) navNode.textContent = enemyLines.length ? enemyLines.join('\n') : 'Sin enemigos en la escena.';
        refreshNavSelector(enemyNav);
        drawNavigationMap(s);

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

        const difficultyStress = D.testResults.slice().reverse().find(r => r.name === 'difficulty-stress');
        if (difficultyStress) {
            setText('dbg-difficulty-stress-head', difficultyStress.status || '—');
            setText('dbg-difficulty-stress-summary', difficultyStress.summary || 'Sin resultados.');
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
        if (dataNode) dataNode.textContent = last ? (last.output || last.summary || 'Sin resultado.') : 'Los detalles aparecerán acá al ejecutar un test.';

        const testNames = D.getAvailableTestNames ? D.getAvailableTestNames() : Object.keys(window.DEBUG_TESTS || {});
        const passed = D.testResults.filter(r => r.status === 'PASS').length;
        const failed = D.testResults.filter(r => r.status === 'FAIL').length;
        setText('dbg-suite', `${passed} PASS · ${failed} FAIL · ${testNames.length}`);
        const testList = document.getElementById('dbg-test-list');
        if (testList) {
            const signature = testNames.join('|');
            if (testList.dataset.signature !== signature) {
                testList.dataset.signature = signature;
                testList.innerHTML = testNames.map(name => `<button type="button" data-debug-test="${name}"><span>${name.replace('ai-stress','AI STRESS').replace('navigation-stress','NAVIGATION STRESS').replace('room-stress','ROOM STRESS').replace('difficulty-stress','DIFFICULTY STRESS').replace('collision-stress','COLLISION STRESS').replace('enemy-behavior-stress','ENEMY BEHAVIOR').replace('boss-stress','BOSS STRESS').replace('roguelike-stress','ROGUELIKE STRESS').replace('debug-lab-stress','DEBUG LAB STRESS').toUpperCase()}</span><em id="dbg-test-${name}">PENDIENTE</em></button>`).join('');
            }
        }
        for (const name of testNames) {
            const node = document.getElementById(`dbg-test-${name}`);
            if (!node) continue;
            const result = [...D.testResults].reverse().find(r => r.name === name);
            node.textContent = result ? `${result.status} · ${Number(result.ms || 0).toFixed(0)}ms` : 'PENDIENTE';
            node.className = result ? (result.status === 'PASS' ? 'debug-pass' : 'debug-fail') : '';
            node.closest('button')?.classList.toggle('is-pass', result?.status === 'PASS');
            node.closest('button')?.classList.toggle('is-fail', result?.status === 'FAIL');
        }
        const health = D.lastHealth;
        setText('dbg-health-status', health ? health.status : 'PENDIENTE');
        setText('dbg-health-summary', health ? `${health.passed} PASS · ${health.warnings} WARN · ${health.failed} FAIL` : 'Sin diagnóstico.');
        const healthNode = document.getElementById('dbg-health-data');
        if (healthNode) healthNode.textContent = health?.checks?.length ? health.checks.map(c => `${c.status} ${c.id} — ${c.detail}`).join('\n') : 'Ejecutá DIAGNÓSTICO para comprobar el runtime.';
        setText('dbg-snapshot-summary', D.lastDiff ? `Snapshot: +${D.lastDiff.added.length} · Δ${D.lastDiff.changed.length} · -${D.lastDiff.removed.length} · historial ${D.snapshotHistory.length}/12` : 'Snapshot: pendiente.');
        const timelineNode = document.getElementById('dbg-timeline-data');
        if (timelineNode) timelineNode.textContent = D.timeline.length ? D.timeline.slice(-12).map(x => `${x.time} F${x.frame} · ${Number(x.fps || 0).toFixed(1)} FPS · D${x.depth} · E${x.enemies} · B${x.bombs} · X${x.explosions} · ERR${x.runtimeErrors}`).join('\n') : `Timeline: 0/120 muestras.${D.timelineRecording ? ' GRABANDO' : ''}`;
        const copyPreview = document.getElementById('dbg-copy-preview');
        if (copyPreview) copyPreview.textContent = D.buildTestReport();

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
        else if (name === 'health') D.runHealthChecks();
        else if (name === 'navigation-refresh') { D.getNavigationSnapshot(true); refresh(); }
        else if (name === 'snapshot') D.captureSnapshot();
        else if (name === 'timeline') D.toggleTimeline();
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
            D.runTest(testButton.dataset.debugTest).then(refresh);
            return;
        }
    });

    root.addEventListener('change', event => {
        const checkbox = event.target.closest('[data-debug-visual]');
        if (!checkbox) return;
        D.setVisual(checkbox.dataset.debugVisual, checkbox.checked);
        refresh();
    });

    root.addEventListener('change', event => {
        const select = event.target.closest('#dbg-nav-selected');
        if (select) { selectedNavTarget = select.value; drawNavigationMap(D.snapshot()); }
    });

    function setActiveJump(id) {
        root.querySelectorAll('[data-debug-jump]').forEach(button => {
            button.classList.toggle('is-active', button.dataset.debugJump === id);
        });
    }

    root.addEventListener('click', event => {
        const jump = event.target.closest('[data-debug-jump]');
        if (!jump) return;
        const section = document.getElementById(jump.dataset.debugJump);
        const scroll = document.getElementById('debug-scroll');
        if (!section || !scroll) return;
        scroll.scrollTo({ top: Math.max(0, section.offsetTop - 6), behavior: 'smooth' });
        setActiveJump(section.id);
    });

    const debugScroll = document.getElementById('debug-scroll');
    if (debugScroll && 'IntersectionObserver' in window) {
        const observer = new IntersectionObserver(entries => {
            const visible = entries.filter(entry => entry.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
            if (visible?.target?.id) setActiveJump(visible.target.id);
        }, { root: debugScroll, threshold: [0.15, 0.35, 0.6] });
        root.querySelectorAll('.debug-section').forEach(section => observer.observe(section));
    }

    window.addEventListener('bomber-debug-updated', refresh);
    window.setInterval(refresh, 120);
    refresh();
})();
