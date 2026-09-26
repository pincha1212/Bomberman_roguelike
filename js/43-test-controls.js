// Bomberman Roguelike v6.7.2 — Test Controls / Power-Up Lab
// Solo se activa con ?test=1. No modifica la lógica de juego normal.
(function initTestControlsV672(global) {
    'use strict';

    const TEST_MODE = new URLSearchParams(global.location.search).get('test') === '1';
    const TEST_ARENA = { width: 13, height: 13, playerX: 6, playerY: 6 };
    const POWERUP_LABELS = {
        BOMB_KICK: 'PATADA',
        SPEED_UP: 'BOTAS',
        HEALTH_UP: 'VIDA',
        SHIELD_UP: 'ESCUDO',
        BOMB_UP: 'BOMBA*',
        FIRE_UP: 'RANGO*'
    };

    let arenaActive = false;

    function getNode(id) { return global.document?.getElementById(id) || null; }

    function clampDepth(value) {
        const total = typeof global.getBiomeProgressionSummaryV49 === 'function'
            ? Number(global.getBiomeProgressionSummaryV49().totalDepths) || 44
            : 44;
        return Math.max(1, Math.min(total, Math.floor(Number(value) || 1)));
    }

    function getState() { return global.BOMBER_ENGINE?.getState?.() || null; }
    function getPlayer() { return global.BOMBER_ENGINE?.getPlayer?.() || null; }

    function syncInput() {
        const input = getNode('test-depth-input');
        const state = getState();
        if (input && state) input.value = String(state.level || 1);
    }

    function setStatus(message) {
        const node = getNode('test-lab-status');
        if (node) node.textContent = message;
    }

    function jump(value) {
        const depth = clampDepth(value);
        const startDepth = typeof global.startDepthForTestV53 === 'function'
            ? global.startDepthForTestV53
            : global.BOMBER_ENGINE?.startDepthForTest;
        if (typeof startDepth !== 'function') return false;
        arenaActive = false;
        getNode('test-controls')?.classList.remove('test-arena-active');
        startDepth(depth);
        syncInput();
        setStatus(`Mapa normal · profundidad ${depth}`);
        return true;
    }

    function clearDynamicState(state) {
        state.bombs = [];
        state.explosions = [];
        state.enemies = [];
        state.items = [];
        state.particles = [];
        state.floaters = [];
        state.hazards = [];
        state.materialResiduesV60 = [];
        state.boss = null;
        state.bossProjectiles = [];
        state.threatLevel = 0;
        state.shakeTimer = 0;
        state.shakeIntensity = 0;
        state.gridRevision = Number(state.gridRevision || 0) + 1;
        state.lastMoveInputAt = 0;
    }

    function createEmptyTestGrid(state) {
        state.gridWidth = TEST_ARENA.width;
        state.gridHeight = TEST_ARENA.height;
        state.grid = Array.from({ length: TEST_ARENA.height }, (_, y) =>
            Array.from({ length: TEST_ARENA.width }, (_, x) =>
                x === 0 || y === 0 || x === TEST_ARENA.width - 1 || y === TEST_ARENA.height - 1 ? 1 : 0
            )
        );

        // Obstáculos INTERMEDIOS: la bomba debe sobrevolarlos.
        state.grid[6][4] = 1;
        state.grid[6][3] = 2;
        state.grid[6][8] = 2;
        state.grid[6][9] = 1;
        state.grid[4][6] = 2;
        state.grid[3][6] = 1;
        state.grid[8][6] = 1;
        state.grid[9][6] = 2;

        // Las cuatro casillas finales quedan libres.
        state.grid[6][1] = 0;
        state.grid[6][11] = 0;
        state.grid[1][6] = 0;
        state.grid[11][6] = 0;
        state.exitPos = { x: 11, y: 11 };
    }

    function centerPlayer(player, gx, gy) {
        player.x = gx * TILE_SIZE + (TILE_SIZE - player.width) / 2;
        player.y = gy * TILE_SIZE + (TILE_SIZE - player.height) / 2;
        player.dir = 'down';
        player.isMoving = false;
        player.walkCycle = 0;
        player.vx = 0;
        player.vy = 0;
        player.kickTimer = 12000;
        player.kickCooldown = 0;
        player.bombsPlaced = 0;
    }

    function makeTestBomb(owner, x, y) {
        return {
            id: `test-bomb-${owner}-${x}-${y}`,
            owner,
            x, y,
            range: 1,
            timer: 5000,
            fuseTotal: 5000,
            warnBucket: Math.ceil(5000 / 300),
            scalePulse: 1,
            previewTimer: 0,
            previewCells: [],
            previewGrid: null,
            previewGridRevision: 0,
            playerPassThrough: true,
            justArmed: false,
            placedAtFrame: 0,
            placementReason: 'test-lab',
            state: 'armed',
            motionState: 'idle',
            worldX: (x + 0.5) * TILE_SIZE,
            worldY: (y + 0.5) * TILE_SIZE,
            motionProgress: 1,
            motionTimer: 0,
            motionDuration: 0,
            motionStartX: (x + 0.5) * TILE_SIZE,
            motionStartY: (y + 0.5) * TILE_SIZE,
            motionTargetX: (x + 0.5) * TILE_SIZE,
            motionTargetY: (y + 0.5) * TILE_SIZE,
            motionTargetTileX: x,
            motionTargetTileY: y,
            motionArc: 0,
            motionRotation: 0,
            motionRotationSpeed: 0,
            bobPhase: 0,
            motionQueue: [],
            preserveTimerOnArm: false,
            interactionState: 'free',
            canKick: owner === 'player',
            canPush: owner === 'player',
            canCarry: false,
            carriedBy: null,
            pendingDetonation: false,
            countsTowardPlayerCapacity: owner === 'player'
        };
    }

    function buildBombKickArena() {
        const state = getState();
        const player = getPlayer();
        if (!state || !player) return false;

        // El laboratorio debe usar el loop real. Si todavía estamos en el menú
        // o la run está detenida, arrancamos una profundidad de prueba real y
        // recién después sustituimos el escenario por la arena controlada.
        const startDepth = typeof global.startDepthForTestV53 === 'function'
            ? global.startDepthForTestV53
            : global.BOMBER_ENGINE?.startDepthForTest;
        if (!state.isPlaying && typeof startDepth === 'function') {
            startDepth(clampDepth(state.level || 1));
        }

        getNode('start-screen')?.classList.add('hidden');
        getNode('game-over-screen')?.classList.add('hidden');
        getNode('level-complete-screen')?.classList.add('hidden');
        getNode('pause-screen')?.classList.add('hidden');
        getNode('main-menu')?.classList.add('run-active');

        state.isPlaying = true;
        state.paused = false;
        clearDynamicState(state);
        createEmptyTestGrid(state);
        centerPlayer(player, TEST_ARENA.playerX, TEST_ARENA.playerY);

        // Una bomba por punto cardinal.
        const bombPositions = [
            [5, 6], // izquierda -> aterriza en 1,6
            [7, 6], // derecha  -> aterriza en 11,6
            [6, 5], // arriba    -> aterriza en 6,1
            [6, 7]  // abajo     -> aterriza en 6,11
        ];
        state.bombs = bombPositions.map(([x, y]) => makeTestBomb('player', x, y));

        // Cámara centrada inmediatamente para que el laboratorio sea legible.
        const centerX = player.x + player.width / 2;
        const centerY = player.y + player.height / 2;
        const maxCamX = Math.max(0, state.gridWidth * TILE_SIZE - global.document.getElementById('gameCanvas').width);
        const maxCamY = Math.max(0, state.gridHeight * TILE_SIZE - global.document.getElementById('gameCanvas').height);
        state.camera.x = Math.max(0, Math.min(centerX - global.document.getElementById('gameCanvas').width / 2, maxCamX));
        state.camera.y = Math.max(0, Math.min(centerY - global.document.getElementById('gameCanvas').height / 2, maxCamY));
        state.camera.targetX = state.camera.x;
        state.camera.targetY = state.camera.y;
        state.lastTime = global.performance.now();
        arenaActive = true;
        getNode('test-controls')?.classList.add('test-arena-active');
        setStatus('Mapa BOMBAS · cuatro bombas · probá ↑ ← ↓ → · final libre; obstáculos intermedios sobrevolables');
        if (typeof global.updateUI === 'function') global.updateUI(true);
        return true;
    }

    function resetArena() {
        if (!arenaActive) return jump(getState()?.level || 1);
        return buildBombKickArena();
    }

    function testKickDirection(direction) {
        if (!arenaActive && !buildBombKickArena()) return false;
        const state = getState();
        const player = getPlayer();
        const keyByDir = { up:'ArrowUp', down:'ArrowDown', left:'ArrowLeft', right:'ArrowRight' };
        const key = keyByDir[direction];
        if (!state || !player || !key) return false;

        state.keys.ArrowUp = state.keys.ArrowDown = state.keys.ArrowLeft = state.keys.ArrowRight = false;
        state.keys[key] = true;
        player.dir = direction;
        player.kickTimer = Math.max(12000, Number(player.kickTimer) || 0);
        player.kickCooldown = 0;
        const ok = typeof global.tryKickPlayerBombsV67 === 'function' ? global.tryKickPlayerBombsV67() : false;
        state.keys[key] = false;

        const labels = { up:'ARRIBA', down:'ABAJO', left:'IZQUIERDA', right:'DERECHA' };
        setStatus(ok ? `PASS · PATADA ${labels[direction]} · salto iniciado` : `FAIL · PATADA ${labels[direction]} · no inició`);
        return ok;
    }

    function spawnPowerup(type) {
        if (!arenaActive && !buildBombKickArena()) return false;
        const state = getState();
        if (!state) return false;
        const defs = global.POWERUP_DEFS_V67 || {};
        if (!defs[type]) return false;
        const px = TEST_ARENA.playerX;
        const py = TEST_ARENA.playerY;
        const slots = { BOMB_KICK:[5,5], SPEED_UP:[7,5], HEALTH_UP:[5,7], SHIELD_UP:[7,7], BOMB_UP:[4,5], FIRE_UP:[8,5] };
        const [x, y] = slots[type] || [px, py - 1];
        state.items.push({ x, y, type });
        const label = POWERUP_LABELS[type] || type;
        setStatus(`SPAWN · ${label} · recogelo en el mapa para probar el flujo real`);
        return true;
    }

    function installPowerupButtons() {
        const root = getNode('test-powerup-buttons');
        if (!root || root.dataset.ready === '1') return;
        root.dataset.ready = '1';
        const defs = global.POWERUP_DEFS_V67 || {};
        Object.keys(defs).forEach(type => {
            const button = global.document.createElement('button');
            button.type = 'button';
            button.textContent = POWERUP_LABELS[type] || type;
            button.title = type === 'BOMB_UP' || type === 'FIRE_UP'
                ? `${type} · debería ser rechazado en v6.7+ porque las capacidades solo suben con reliquias`
                : `Colocar ${type} en el mapa de pruebas`;
            button.addEventListener('click', () => spawnPowerup(type));
            root.appendChild(button);
        });
    }

    function install() {
        const root = getNode('test-controls');
        if (!root) return false;
        if (!TEST_MODE) { root.classList.add('hidden'); return true; }
        root.classList.remove('hidden');

        root.querySelectorAll('[data-test-step]').forEach(button => {
            button.addEventListener('click', () => {
                const current = Number(getState()?.level) || 1;
                jump(current + Number(button.getAttribute('data-test-step') || 0));
            });
        });

        getNode('test-depth-go')?.addEventListener('click', () => jump(getNode('test-depth-input')?.value));
        getNode('test-depth-input')?.addEventListener('keydown', event => {
            if (event.key === 'Enter') jump(event.currentTarget.value);
        });

        getNode('test-bomb-arena')?.addEventListener('click', buildBombKickArena);
        getNode('test-arena-reset')?.addEventListener('click', resetArena);
        root.querySelectorAll('[data-test-kick]').forEach(button => {
            button.addEventListener('click', () => testKickDirection(button.getAttribute('data-test-kick')));
        });

        global.document.addEventListener('keydown', event => {
            if (!TEST_MODE || event.target?.matches?.('input,textarea,select,button')) return;
            if (event.key === '[') { event.preventDefault(); jump((Number(getState()?.level) || 1) - 1); }
            if (event.key === ']') { event.preventDefault(); jump((Number(getState()?.level) || 1) + 1); }
        });

        installPowerupButtons();
        syncInput();
        return true;
    }

    function bootstrap() {
        if (install()) return;
        global.setTimeout(bootstrap, 40);
    }

    global.BOMBER_TEST_MODE_V53 = TEST_MODE;
    global.BOMBER_TEST_MODE_V672 = TEST_MODE;
    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.isTestMode = () => TEST_MODE;
    global.BOMBER_ENGINE.skipToDepth = jump;
    global.BOMBER_ENGINE.buildBombKickTestArena = buildBombKickArena;
    global.BOMBER_ENGINE.testBombKickDirection = testKickDirection;
    global.BOMBER_ENGINE.spawnTestPowerup = spawnPowerup;
    bootstrap();
})(window);
