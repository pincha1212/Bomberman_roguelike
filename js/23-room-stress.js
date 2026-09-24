// Bomberman Roguelike v3.22 — procedural room stress suite.
(() => {
    'use strict';

    window.ROOM_STRESS_V322 = Object.freeze({
        version: '3.22.0',
        layouts: typeof ROOM_LAYOUTS_V322 !== 'undefined' ? ROOM_LAYOUTS_V322.slice() : []
    });

    window.RUN_ROOM_STRESS_V322 = async function() {
        if (typeof DEBUG_MODE === 'undefined') throw new Error('Debug Engine no disponible.');
        if (typeof applyRoomDesignV313 !== 'function') throw new Error('Generador procedural v3.22 no disponible.');

        const state = DEBUG_MODE.snapshot?.()?.engine?.stateAvailable ? gameState : null;
        if (!state) throw new Error('gameState no disponible.');

        const layouts = typeof ROOM_LAYOUTS_V322 !== 'undefined'
            ? ROOM_LAYOUTS_V322.slice()
            : ['corridors','intersection','small-chambers','large-chamber','open-zone','dead-end'];
        const results = [];
        const started = performance.now();
        const previousForced = window.FORCE_ROOM_LAYOUT_V322;

        try {
            for (const variant of layouts) {
                window.FORCE_ROOM_LAYOUT_V322 = variant;
                state.roomType = ROOM_TYPES.STANDARD;
                state.gridWidth = 15;
                state.gridHeight = 15;
                state.grid = Array.from({length:15}, () => Array(15).fill(TYPES.WALL));
                for (let y=1; y<14; y++) {
                    for (let x=1; x<14; x++) {
                        if (!(x % 2 === 0 && y % 2 === 0)) state.grid[y][x] = TYPES.BLOCK;
                    }
                }
                state.items = [];
                state.roomDesign = roomDesignV313;
                applyRoomDesignV313();

                const start = {x:2,y:2};
                const goal = state.roomDesign?.exitGate || {x:12,y:12};
                const topology = collectRoomTopologyV322(start, goal);
                const metrics = state.roomDesign?.layoutMetrics || {};
                const routeValid = topology.routeLength > 0 && metrics.routeValid === true;
                const pass = routeValid && topology.reachable >= 8 && String(metrics.variant) === variant;

                results.push({
                    variant,
                    status: pass ? 'PASS' : 'FAIL',
                    reachableTiles: topology.reachable,
                    routeLength: Math.max(0, topology.routeLength - 1),
                    junctions: topology.junctions,
                    deadEnds: topology.deadEnds,
                    repairApplied: !!metrics.repairApplied,
                    roomCount: Number(metrics.rooms || 0),
                    routeValid,
                    failure: pass ? null : 'ruta inválida o topología no registrada'
                });
            }
        } finally {
            if (previousForced == null) delete window.FORCE_ROOM_LAYOUT_V322;
            else window.FORCE_ROOM_LAYOUT_V322 = previousForced;
            applyRoomDesignV313();
        }

        const passed = results.filter(r => r.status === 'PASS').length;
        const durationMs = performance.now() - started;
        DEBUG_MODE.roomStress = { total: results.length, passed, failed: results.length - passed, cases: results, durationMs };
        const failureText = results.filter(r => r.failure).map(r => `${r.variant}: ${r.failure}`).join(' | ');
        if (passed !== results.length) throw new Error(`Room Stress: ${passed}/${results.length} layouts válidos. ${failureText}`);

        return {
            summary: `${passed}/${results.length} layouts válidos · rutas=OK · reparaciones=${results.filter(r=>r.repairApplied).length}`,
            details: {
                cases: results,
                durationMs: Number(durationMs.toFixed(1)),
                focus: 'variedad procedural, topología y ruta jugador→salida',
                note: 'El stress prueba únicamente el generador de rooms; no modifica IA ni física.'
            }
        };
    };
})();
