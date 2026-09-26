// Bomberman Roguelike v6.7.3 — Gameplay Test Lab
// ?test=1 convierte el runtime en un entorno neutral para verificar gameplay real.
(function initTestLabV673(global) {
    'use strict';

    const TEST_MODE = new URLSearchParams(global.location.search).get('test') === '1';
    const TEST_ARENA = Object.freeze({ width: 13, height: 13, playerX: 6, playerY: 6 });
    const TEST_ROOM_TYPE = Object.freeze({
        id: 'TEST_LAB',
        icon: '·',
        name: 'TEST LAB',
        subtitle: 'ENTORNO NEUTRO',
        color: '#94a3b8',
        enemySpeedMult: 1,
        coinMult: 1,
        rewardCoins: 0,
        blockBonus: 0
    });
    const POWERUP_TYPES = Object.freeze(['BOMB_UP', 'FIRE_UP', 'SPEED_UP', 'HEALTH_UP', 'SHIELD_UP', 'BOMB_KICK']);
    const POWERUP_LABELS = Object.freeze({
        BOMB_KICK: 'PATADA',
        SPEED_UP: 'BOTAS',
        HEALTH_UP: 'VIDA',
        SHIELD_UP: 'ESCUDO',
        BOMB_UP: 'BOMBA*',
        FIRE_UP: 'RANGO*'
    });
    const POWERUP_SLOTS = Object.freeze({
        BOMB_KICK: [10, 2],
        SPEED_UP: [10, 3],
        HEALTH_UP: [10, 4],
        SHIELD_UP: [10, 5],
        BOMB_UP: [10, 6],
        FIRE_UP: [10, 7]
    });
    const POWERUP_RESPAWN_MS = 650;

    const runtime = {
        installed: false,
        wrappedInitLevel: false,
        originalInitLevel: null,
        originalUpdateRoguePresentation: null,
        wrappedPresentation: false,
        arenaActive: false,
        respawnDue: new Map()
    };

    function getNode(id) { return global.document?.getElementById(id) || null; }
    function getState() { return global.BOMBER_ENGINE?.getState?.() || null; }
    function getPlayer() { return global.BOMBER_ENGINE?.getPlayer?.() || null; }
    function isActive() { return TEST_MODE && !!getState()?.testLabV673?.active; }

    function clampDepth(value) {
        const total = typeof global.getBiomeProgressionSummaryV49 === 'function'
            ? Number(global.getBiomeProgressionSummaryV49().totalDepths) || 44
            : 44;
        return Math.max(1, Math.min(total, Math.floor(Number(value) || 1)));
    }

    function setStatus(message) {
        const node = getNode('test-lab-status');
        if (node) node.textContent = message;
    }

    function syncDepthInput() {
        const input = getNode('test-depth-input');
        const state = getState();
        if (input && state) input.value = String(state.level || 1);
    }

    function setTestUiState() {
        const body = global.document?.body;
        if (body) body.setAttribute('data-test-lab', TEST_MODE ? 'neutral' : 'off');
        const roomIntro = getNode('room-intro');
        if (roomIntro) roomIntro.classList.add('hidden');
        const transition = getNode('biome-transition');
        if (transition) transition.classList.add('hidden');
        const roomBanner = getNode('room-banner');
        if (roomBanner) {
            roomBanner.textContent = `TEST LAB · ENTORNO NEUTRO`;
            roomBanner.style.setProperty('--room-accent', '#94a3b8');
        }
        const runBanner = getNode('run-banner');
        if (runBanner) {
            const level = Number(getState()?.level) || 1;
            runBanner.textContent = `TEST LAB · PROFUNDIDAD ${String(level).padStart(2, '0')}`;
        }
        const bossHud = getNode('boss-hud');
        if (bossHud) bossHud.classList.add('hidden');
    }

    function resetPowerupRespawnTracking() {
        runtime.respawnDue.clear();
        const state = getState();
        if (state) state.testLabPowerupRespawnsV673 = [];
    }

    function resetPlayerToBase(player) {
        if (!player) return;
        player.speed = 3.0;
        player.maxBombs = 1;
        player.bombsPlaced = 0;
        player.bombCooldown = 0;
        player.bombRange = 1;
        player.health = 3;
        player.maxHealth = 5;
        player.hasShield = false;
        player.isInvincible = false;
        player.invincibleTimer = 0;
        player.lastDamageFrame = -1;
        player.kickTimer = 0;
        player.kickCooldown = 0;
        player.lastKickInputAt = 0;
        player.dir = 'down';
        player.isMoving = false;
        player.walkCycle = 0;
        player._frameScale = 1;
        player.vx = 0;
        player.vy = 0;
        player.inputDir = 0;
        player.inputAxis = null;
        player.inputBuffer = null;
        player.inputBufferTimer = 0;
        player.hazardSlowTimer = 0;
        player.hazardSlowFactor = 1;
        player.hazardSlowType = '';
        player.__bombEffectStatusesV64 = {};
        if (typeof global.playerFSMReset === 'function') global.playerFSMReset('test-lab-player-reset');
    }

    function centerPlayer(player, gx = TEST_ARENA.playerX, gy = TEST_ARENA.playerY) {
        if (!player) return;
        player.x = gx * TILE_SIZE + (TILE_SIZE - player.width) / 2;
        player.y = gy * TILE_SIZE + (TILE_SIZE - player.height) / 2;
        player.dir = 'down';
        player.isMoving = false;
        player.vx = 0;
        player.vy = 0;
    }

    function createNeutralGrid(state) {
        state.gridWidth = TEST_ARENA.width;
        state.gridHeight = TEST_ARENA.height;
        state.grid = Array.from({ length: TEST_ARENA.height }, (_, y) =>
            Array.from({ length: TEST_ARENA.width }, (_, x) =>
                x === 0 || y === 0 || x === TEST_ARENA.width - 1 || y === TEST_ARENA.height - 1 ? TYPES.WALL : TYPES.EMPTY
            )
        );

        // Obstáculos básicos. No hay geometría temática ni layout de bioma.
        const basicBlocks = [[3,3], [3,9], [8,3], [8,9]];
        for (const [x, y] of basicBlocks) state.grid[y][x] = TYPES.BLOCK;
        state.exitPos = null;
        state.gridRevision = Number(state.gridRevision || 0) + 1;
        if (typeof global.invalidateRenderCacheV317 === 'function') global.invalidateRenderCacheV317();
    }

    function makeTestBomb(owner, x, y) {
        return {
            id: `test-bomb-${owner}-${x}-${y}`,
            owner,
            x, y,
            range: 1,
            timer: 15000,
            fuseTotal: 15000,
            warnBucket: Math.ceil(15000 / 300),
            scalePulse: 1,
            previewTimer: 0,
            previewCells: [],
            previewGrid: null,
            previewGridRevision: 0,
            playerPassThrough: true,
            justArmed: false,
            placedAtFrame: 0,
            placementReason: 'test-lab-cardinal',
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

    function createKickTestBombs(state) {
        const bombPositions = [[5,6], [7,6], [6,5], [6,7]];
        state.bombs = bombPositions.map(([x, y]) => makeTestBomb('player', x, y));
        const player = getPlayer();
        if (player) player.bombsPlaced = state.bombs.length;
    }

    function clearDynamicRuntime(state) {
        state.bombs = [];
        state.explosions = [];
        state.enemies = [];
        state.items = [];
        state.particles = [];
        state.floaters = [];
        state.hazards = [];
        state.environmentHazards = [];
        state.materialResiduesV60 = [];
        state.deathEchoV61 = null;
        state.boss = null;
        state.bossProjectiles = [];
        state.threatLevel = 0;
        state.shakeTimer = 0;
        state.shakeIntensity = 0;
        state.blastSerial = 0;
        state.lastMoveInputAt = 0;
        state.dungeonV44 = null;
        state.roomDesign = null;
        state.runJourneyV50 = typeof global.createJourneyStateV50 === 'function'
            ? global.createJourneyStateV50()
            : { visitedBiomes: [], discoveredVerbs: [], currentBiomeId: null, currentStage: 1, maxDepth: 0 };
        state.relics = [];
        state.coins = 0;
        state.score = 0;
        state.blocksBroken = 0;
        state.totalKills = 0;
    }

    function spawnShelfPowerups(state) {
        state.items = POWERUP_TYPES.map(type => {
            const [x, y] = POWERUP_SLOTS[type];
            return {
                x, y, type,
                testLabShelfSlotV673: type,
                testLabRespawnableV673: true
            };
        });
        resetPowerupRespawnTracking();
    }

    function applyNeutralTestLabEnvironment(reason = 'neutralize') {
        const state = getState();
        const player = getPlayer();
        if (!state || !player || !TEST_MODE) return false;

        state.testLabV673 = {
            active: true,
            neutral: true,
            immortal: true,
            biomeEffects: false,
            hazards: false,
            enemies: false,
            deathEcho: false,
            materials: false,
            powerupRespawn: true,
            reason: String(reason)
        };

        if (typeof global.setActiveThemeV46 === 'function') global.setActiveThemeV46('classic', false);
        state.biomeV49 = null;
        state.winterWindV64 = null;
        state.roomType = TEST_ROOM_TYPE;
        state.roomTime = Number.POSITIVE_INFINITY;
        state.nextReinforcement = Number.MAX_SAFE_INTEGER;
        state.threatLevel = 0;
        state.exitPos = null;
        state.dungeonV44 = null;
        state.roomDesign = null;
        clearDynamicRuntime(state);
        createNeutralGrid(state);
        centerPlayer(player);
        resetPlayerToBase(player);
        centerPlayer(player);
        createKickTestBombs(state);
        spawnShelfPowerups(state);
        state.isPlaying = true;
        state.paused = false;
        state.lastTime = global.performance.now();
        runtime.arenaActive = true;

        if (typeof global.updateRoguePresentation === 'function') global.updateRoguePresentation();
        setTestUiState();
        syncDepthInput();
        getNode('test-controls')?.classList.add('test-arena-active');
        setStatus(`TEST LAB · neutral · ${POWERUP_TYPES.length} power-ups · bombas cardinales · ${reason}`);
        if (typeof global.updateUI === 'function') global.updateUI(true);
        setTestUiState();
        if (typeof global.draw === 'function') global.draw();
        return true;
    }

    function wrapPresentation() {
        if (runtime.wrappedPresentation) return true;
        if (typeof global.updateRoguePresentation !== 'function') return false;
        runtime.originalUpdateRoguePresentation = global.updateRoguePresentation;
        global.updateRoguePresentation = function updateRoguePresentationV673(...args) {
            const result = runtime.originalUpdateRoguePresentation(...args);
            if (TEST_MODE) setTestUiState();
            return result;
        };
        runtime.wrappedPresentation = true;
        return true;
    }

    function wrapInitLevel() {
        if (runtime.wrappedInitLevel) return true;
        if (typeof global.initLevel !== 'function') return false;
        runtime.originalInitLevel = global.initLevel;
        global.initLevel = function initLevelV673(...args) {
            const result = runtime.originalInitLevel(...args);
            if (TEST_MODE) applyNeutralTestLabEnvironment('initLevel');
            return result;
        };
        runtime.wrappedInitLevel = true;
        return true;
    }

    function ensureGameLoop(depth) {
        const startDepth = global.startDepthForTestV53 || global.BOMBER_ENGINE?.startDepthForTest;
        if (typeof startDepth !== 'function') return false;
        startDepth(clampDepth(depth));
        return true;
    }

    function jump(value) {
        if (!TEST_MODE) return false;
        const depth = clampDepth(value);
        if (!ensureGameLoop(depth)) return false;
        // initLevel wrapper reapplies the neutral world; keep this call for hosts
        // where the wrapper was installed after startDepthForTestV53 returned.
        applyNeutralTestLabEnvironment(`depth ${depth}`);
        return true;
    }

    function resetMap() {
        const state = getState();
        return jump(Number(state?.level) || 1);
    }

    function resetPlayerOnly() {
        if (!isActive()) return false;
        const player = getPlayer();
        if (!player) return false;
        centerPlayer(player);
        resetPlayerToBase(player);
        centerPlayer(player);
        if (typeof global.updateUI === 'function') global.updateUI(true);
        setStatus('TEST LAB · jugador restablecido a capacidades base');
        return true;
    }

    function testKickDirection(direction) {
        if (!isActive()) return false;
        const state = getState();
        const player = getPlayer();
        const keyByDir = { up:'ArrowUp', down:'ArrowDown', left:'ArrowLeft', right:'ArrowRight' };
        const key = keyByDir[direction];
        if (!state || !player || !key) return false;

        state.keys.ArrowUp = state.keys.ArrowDown = state.keys.ArrowLeft = state.keys.ArrowRight = false;
        state.keys[key] = true;
        player.dir = direction;
        player.kickCooldown = 0;
        const ok = typeof global.tryKickPlayerBombsV67 === 'function' ? global.tryKickPlayerBombsV67() : false;
        state.keys[key] = false;
        const labels = { up:'ARRIBA', down:'ABAJO', left:'IZQUIERDA', right:'DERECHA' };
        setStatus(ok
            ? `PASS · PATADA ${labels[direction]} · flujo real`
            : `FAIL · PATADA ${labels[direction]} · requiere BOMB_KICK activo`);
        return ok;
    }

    function refillPowerups() {
        if (!isActive()) return false;
        const state = getState();
        const existing = new Set((Array.isArray(state.items) ? state.items : [])
            .filter(item => item?.testLabShelfSlotV673)
            .map(item => item.testLabShelfSlotV673));
        POWERUP_TYPES.forEach(type => {
            if (!existing.has(type)) {
                const [x, y] = POWERUP_SLOTS[type];
                state.items.push({ x, y, type, testLabShelfSlotV673: type, testLabRespawnableV673: true });
            }
        });
        resetPowerupRespawnTracking();
        setStatus('TEST LAB · estantería de power-ups repuesta');
        return true;
    }

    function playerOverTile(x, y) {
        const player = getPlayer();
        if (!player) return false;
        const rect = {
            left: player.x,
            right: player.x + player.width,
            top: player.y,
            bottom: player.y + player.height
        };
        const tile = {
            left: x * TILE_SIZE,
            right: (x + 1) * TILE_SIZE,
            top: y * TILE_SIZE,
            bottom: (y + 1) * TILE_SIZE
        };
        return !(tile.right <= rect.left || tile.left >= rect.right || tile.bottom <= rect.top || tile.top >= rect.bottom);
    }

    function tickPowerupShelfRespawn() {
        if (!isActive()) return;
        const state = getState();
        const now = global.performance.now();
        if (!Array.isArray(state.items)) state.items = [];

        POWERUP_TYPES.forEach(type => {
            const present = state.items.some(item => item?.testLabShelfSlotV673 === type);
            if (present) {
                runtime.respawnDue.delete(type);
                return;
            }
            const due = runtime.respawnDue.get(type);
            if (!Number.isFinite(due)) {
                runtime.respawnDue.set(type, now + POWERUP_RESPAWN_MS);
                return;
            }
            if (now < due) return;
            const [x, y] = POWERUP_SLOTS[type];
            if (playerOverTile(x, y)) {
                // No recolocamos el objeto debajo del jugador: espera a que el
                // tester abandone la celda y vuelve a habilitar el pickup.
                runtime.respawnDue.set(type, now + 150);
                return;
            }
            state.items.push({ x, y, type, testLabShelfSlotV673: type, testLabRespawnableV673: true });
            runtime.respawnDue.delete(type);
        });
    }

    function bindControls() {
        const root = getNode('test-controls');
        if (!root || root.dataset.bound === '1') return !!root;
        root.dataset.bound = '1';

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
        getNode('test-arena-reset')?.addEventListener('click', resetMap);
        getNode('test-player-reset')?.addEventListener('click', resetPlayerOnly);
        getNode('test-powerups-refill')?.addEventListener('click', refillPowerups);
        root.querySelectorAll('[data-test-kick]').forEach(button => {
            button.addEventListener('click', () => testKickDirection(button.getAttribute('data-test-kick')));
        });

        global.document.addEventListener('keydown', event => {
            if (!TEST_MODE || event.target?.matches?.('input,textarea,select,button')) return;
            if (event.key === '[') { event.preventDefault(); jump((Number(getState()?.level) || 1) - 1); }
            if (event.key === ']') { event.preventDefault(); jump((Number(getState()?.level) || 1) + 1); }
        });
        return true;
    }

    function bootstrap() {
        if (!TEST_MODE) {
            const root = getNode('test-controls');
            if (root) root.classList.add('hidden');
            return;
        }
        if (!global.document || global.document.readyState === 'loading') {
            global.document?.addEventListener?.('DOMContentLoaded', bootstrap, { once: true });
            return;
        }
        if (!bindControls()) {
            global.setTimeout(bootstrap, 40);
            return;
        }
        if (!wrapPresentation() || !wrapInitLevel()) {
            global.setTimeout(bootstrap, 40);
            return;
        }
        const root = getNode('test-controls');
        if (root) root.classList.remove('hidden');
        if (!runtime.installed) {
            runtime.installed = true;
            jump(Number(getState()?.level) || 1);
            const loop = () => {
                if (TEST_MODE) tickPowerupShelfRespawn();
                if (TEST_MODE) global.requestAnimationFrame(loop);
            };
            global.requestAnimationFrame(loop);
        }
    }

    global.BOMBER_TEST_MODE_V53 = TEST_MODE;
    global.BOMBER_TEST_MODE_V672 = TEST_MODE;
    global.BOMBER_TEST_MODE_V673 = TEST_MODE;
    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.isTestMode = () => TEST_MODE;
    global.BOMBER_ENGINE.isTestLabNeutral = () => isActive();
    global.BOMBER_ENGINE.getTestLabConfig = () => ({
        active: isActive(),
        version: '6.7.3',
        neutral: true,
        arena: { ...TEST_ARENA },
        powerups: [...POWERUP_TYPES]
    });
    global.BOMBER_ENGINE.skipToDepth = jump;
    global.BOMBER_ENGINE.buildBombKickTestArena = resetMap;
    global.BOMBER_ENGINE.testBombKickDirection = testKickDirection;
    global.BOMBER_ENGINE.spawnTestPowerup = (type) => {
        // Compatibilidad API: solo permite devolver/reponer un power-up real en
        // la estantería, nunca altera capacidades directamente.
        if (!POWERUP_TYPES.includes(type)) return false;
        const state = getState();
        if (!isActive() || !state) return false;
        const [x, y] = POWERUP_SLOTS[type];
        if (!state.items.some(item => item?.testLabShelfSlotV673 === type)) {
            state.items.push({ x, y, type, testLabShelfSlotV673: type, testLabRespawnableV673: true });
        }
        return true;
    };

    bootstrap();
})(window);
