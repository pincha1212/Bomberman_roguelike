// Bomberman Roguelike v4.5.2 — stress suite for the current v4.4 dungeon generator.
(() => {
    'use strict';

    const TEST_LEVELS = Object.freeze([1, 2, 3, 4, 5, 6]);

    window.ROOM_STRESS_V452 = Object.freeze({
        version: '4.5.2',
        levels: TEST_LEVELS.slice(),
        focus: 'generador Bomberman v4.4: figura numérica, muros duros, bloques destructibles y espacios de spawn'
    });

    function key(x, y) {
        return `${x},${y}`;
    }

    function isInsideGrid(state, x, y) {
        return x >= 0 && y >= 0 && x < state.gridWidth && y < state.gridHeight;
    }

    function countNonHardEmptySpawnCells(state, hardWalls) {
        let count = 0;
        for (let y = 1; y < state.gridHeight - 1; y++) {
            for (let x = 1; x < state.gridWidth - 1; x++) {
                if (hardWalls.has(key(x, y))) continue;
                if (state.grid[y]?.[x] === TYPES.EMPTY && Math.abs(x - 1) + Math.abs(y - 1) >= 7) count++;
            }
        }
        return count;
    }

    function countDigitCells(state, digitBounds, hardWalls) {
        let count = 0;
        for (let y = digitBounds.y; y < digitBounds.y + digitBounds.h; y++) {
            for (let x = digitBounds.x; x < digitBounds.x + digitBounds.w; x++) {
                if (!isInsideGrid(state, x, y)) continue;
                if (hardWalls.has(key(x, y))) count++;
            }
        }
        return count;
    }

    function validateCase(state, level) {
        if (!state.dungeonV44 || state.dungeonV44.version !== BOMBERMAN_DUNGEON_V44.version) {
            throw new Error(`Nivel ${level}: dungeonV44 no disponible.`);
        }

        const dungeon = state.dungeonV44;
        const metrics = state.roomDesign?.layoutMetrics || {};
        const expectedDigit = getDungeonDigitV44(level);

        if (dungeon.digit !== expectedDigit) {
            throw new Error(`Nivel ${level}: dígito ${dungeon.digit} != ${expectedDigit}.`);
        }

        if (!String(metrics.variant || '').startsWith('bomberman-digit-')) {
            throw new Error(`Nivel ${level}: variante Bomberman no registrada.`);
        }

        if (!Array.isArray(state.grid) || state.grid.length !== state.gridHeight) {
            throw new Error(`Nivel ${level}: grid inválido.`);
        }

        for (let y = 0; y < state.gridHeight; y++) {
            if (!Array.isArray(state.grid[y]) || state.grid[y].length !== state.gridWidth) {
                throw new Error(`Nivel ${level}: fila ${y} del grid inválida.`);
            }
        }

        // Independent spatial checks: hard walls recorded by the generator must really be WALL.
        for (const cell of dungeon.hardWallCells || []) {
            const [x, y] = cell.split(',').map(Number);
            if (!isInsideGrid(state, x, y) || state.grid[y]?.[x] !== TYPES.WALL) {
                throw new Error(`Nivel ${level}: hard wall inconsistente en ${cell}.`);
            }
        }

        const bounds = dungeon.digitBounds;
        if (!bounds || bounds.w !== 7 || bounds.h !== 9) {
            throw new Error(`Nivel ${level}: bounds de figura inválidos.`);
        }

        const digitCells = countDigitCells(state, bounds, dungeon.hardWallCells || new Set());
        if (digitCells < 4) {
            throw new Error(`Nivel ${level}: figura ${expectedDigit} casi vacía (${digitCells} muros).`);
        }

        const startSafe = [
            [1,1], [2,1], [1,2], [2,2], [1,3], [3,1]
        ];
        for (const [x, y] of startSafe) {
            if (state.grid[y]?.[x] !== TYPES.EMPTY) {
                throw new Error(`Nivel ${level}: celda segura (${x},${y}) dejó de estar libre.`);
            }
        }

        const exit = state.roomDesign?.exitGate;
        if (!exit || !isInsideGrid(state, exit.x, exit.y)) {
            throw new Error(`Nivel ${level}: salida fuera del mapa.`);
        }
        if (state.grid[exit.y]?.[exit.x] !== TYPES.BLOCK && state.grid[exit.y]?.[exit.x] !== TYPES.EXIT_OPEN) {
            throw new Error(`Nivel ${level}: salida en terreno inesperado.`);
        }

        const spawnCells = countNonHardEmptySpawnCells(state, dungeon.hardWallCells || new Set());
        const targetEnemies = getDungeonEnemyCountV44(level);
        if (spawnCells < targetEnemies) {
            throw new Error(`Nivel ${level}: ${spawnCells} celdas de spawn, se necesitan al menos ${targetEnemies}.`);
        }

        const blocks = Number(metrics.destructibleBlocks || 0);
        if (blocks <= 0) {
            throw new Error(`Nivel ${level}: no se generaron bloques destructibles.`);
        }

        const density = Number(metrics.density);
        if (!Number.isFinite(density) || density < 0.45 || density > BOMBERMAN_DUNGEON_V44.blockDensityMax + 0.001) {
            throw new Error(`Nivel ${level}: densidad registrada inválida (${density}).`);
        }

        return {
            level,
            digit: expectedDigit,
            variant: metrics.variant,
            hardWalls: dungeon.hardWallCells?.size || 0,
            digitCells,
            destructibleBlocks: blocks,
            density,
            spawnCells,
            enemyTarget: targetEnemies,
            exit: { x: exit.x, y: exit.y },
            exitLocked: dungeon.exitUnlocked === false
        };
    }

    window.ROOM_STRESS_V322 = Object.freeze({ version: '4.5.2', levels: TEST_LEVELS.slice() });

    window.RUN_ROOM_STRESS_V452 = async function() {
        if (typeof DEBUG_MODE === 'undefined') throw new Error('Debug Engine no disponible.');
        if (typeof applyRoomDesignV313 !== 'function') throw new Error('Generador de mazmorra v4.4 no disponible.');
        if (typeof buildBombermanDungeonV44 !== 'function') throw new Error('Generador Bomberman v4.4 no disponible.');

        const state = DEBUG_MODE.snapshot?.()?.engine?.stateAvailable ? gameState : null;
        if (!state) throw new Error('gameState no disponible.');

        const original = {
            level: state.level,
            gridWidth: state.gridWidth,
            gridHeight: state.gridHeight,
            grid: state.grid,
            items: state.items,
            enemies: state.enemies,
            bombs: state.bombs,
            explosions: state.explosions,
            hazards: state.hazards,
            bossProjectiles: state.bossProjectiles,
            roomType: state.roomType,
            exitPos: state.exitPos,
            roomDesign: (() => {
                const d = state.roomDesign || roomDesignV313;
                return {
                    ref: d,
                    rooms: Array.isArray(d.rooms) ? d.rooms.map(room => ({ ...room })) : [],
                    riskCells: new Set(d.riskCells || []),
                    combatCells: new Set(d.combatCells || []),
                    treasureCells: new Set(d.treasureCells || []),
                    secretCells: new Set(d.secretCells || []),
                    secretInterior: new Set(d.secretInterior || []),
                    exitGate: d.exitGate ? { ...d.exitGate } : null,
                    secretRoom: d.secretRoom ? { ...d.secretRoom, entrance: d.secretRoom.entrance ? { ...d.secretRoom.entrance } : null } : null,
                    version: d.version,
                    layoutVariant: d.layoutVariant,
                    layoutMetrics: d.layoutMetrics ? { ...d.layoutMetrics } : null
                };
            })(),
            dungeonV44: state.dungeonV44 ? { ...state.dungeonV44, hardWallCells: new Set(state.dungeonV44.hardWallCells || []) } : state.dungeonV44
        };

        const results = [];
        const started = performance.now();

        try {
            state.gridWidth = 15;
            state.gridHeight = 15;
            state.roomType = ROOM_TYPES.STANDARD;
            state.items = [];
            state.enemies = [];
            state.bombs = [];
            state.explosions = [];
            state.hazards = [];
            state.bossProjectiles = [];

            for (const level of TEST_LEVELS) {
                state.level = level;
                state.grid = Array.from({ length: state.gridHeight }, () => Array(state.gridWidth).fill(TYPES.WALL));
                applyRoomDesignV313();
                for (let sample = 0; sample < 5; sample++) {
                    if (sample > 0) {
                        state.grid = Array.from({ length: state.gridHeight }, () => Array(state.gridWidth).fill(TYPES.WALL));
                        applyRoomDesignV313();
                    }
                    results.push(validateCase(state, level));
                }
            }
        } finally {
            state.level = original.level;
            state.gridWidth = original.gridWidth;
            state.gridHeight = original.gridHeight;
            state.grid = original.grid;
            state.items = original.items;
            state.enemies = original.enemies;
            state.bombs = original.bombs;
            state.explosions = original.explosions;
            state.hazards = original.hazards;
            state.bossProjectiles = original.bossProjectiles;
            state.roomType = original.roomType;
            state.exitPos = original.exitPos;
            const d = original.roomDesign.ref || roomDesignV313;
            d.rooms = original.roomDesign.rooms.map(room => ({ ...room }));
            d.riskCells = new Set(original.roomDesign.riskCells);
            d.combatCells = new Set(original.roomDesign.combatCells);
            d.treasureCells = new Set(original.roomDesign.treasureCells);
            d.secretCells = new Set(original.roomDesign.secretCells);
            d.secretInterior = new Set(original.roomDesign.secretInterior);
            d.exitGate = original.roomDesign.exitGate ? { ...original.roomDesign.exitGate } : null;
            d.secretRoom = original.roomDesign.secretRoom ? { ...original.roomDesign.secretRoom, entrance: original.roomDesign.secretRoom.entrance ? { ...original.roomDesign.secretRoom.entrance } : null } : null;
            d.version = original.roomDesign.version;
            d.layoutVariant = original.roomDesign.layoutVariant;
            d.layoutMetrics = original.roomDesign.layoutMetrics ? { ...original.roomDesign.layoutMetrics } : null;
            state.roomDesign = d;
            state.dungeonV44 = original.dungeonV44;
        }

        const passed = results.length;
        const durationMs = performance.now() - started;
        DEBUG_MODE.roomStress = {
            version: '4.5.2',
            total: results.length,
            passed,
            failed: results.length - passed,
            cases: results,
            durationMs
        };

        return {
            summary: `${passed}/${results.length} generaciones Bomberman válidas · 6 niveles × 5 muestras · figura/densidad/spawn/salida=OK`,
            details: {
                cases: results,
                durationMs: Number(durationMs.toFixed(1)),
                focus: 'generador Bomberman v4.5.2 real, no topologías v3.22 obsoletas',
                note: 'La prueba no exige una ruta libre hasta la salida porque los bloques destructibles pueden cubrirla deliberadamente.'
            }
        };
    };

    // Debug Mode v4.5.x still calls the historical registry name.
    window.RUN_ROOM_STRESS_V322 = window.RUN_ROOM_STRESS_V452;
})();
