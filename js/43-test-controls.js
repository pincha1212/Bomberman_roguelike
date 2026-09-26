// Bomberman Roguelike v6.7.6 — Gameplay Test Lab
// ?test=1 convierte el runtime en un entorno neutral para verificar gameplay real.
(function initTestLabV675(global) {
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
    const BASE_POWERUP_TYPES = Object.freeze(['BOMB_UP', 'FIRE_UP', 'SPEED_UP', 'HEALTH_UP', 'SHIELD_UP', 'BOMB_KICK']);
    const BASE_POWERUP_META = Object.freeze({
        BOMB_UP: { id:'BOMB_UP', name:'BOMBA', icon:'💣', rarity:'BASE', category:'BASE', desc:'Aumenta maxBombs en 1 hasta el límite duro del jugador.', implemented:true },
        FIRE_UP: { id:'FIRE_UP', name:'RANGO', icon:'🔥', rarity:'BASE', category:'BASE', desc:'Aumenta bombRange en 1 hasta el límite duro del jugador.', implemented:true },
        SPEED_UP: { id:'SPEED_UP', name:'BOTAS', icon:'👟', rarity:'BASE', category:'BASE', desc:'Aumenta la velocidad del jugador mediante el pickup real.', implemented:true },
        HEALTH_UP: { id:'HEALTH_UP', name:'VIDA', icon:'❤️', rarity:'BASE', category:'BASE', desc:'Recupera 1 punto de vida, limitado por maxHealth.', implemented:true },
        SHIELD_UP: { id:'SHIELD_UP', name:'ESCUDO', icon:'🛡️', rarity:'BASE', category:'BASE', desc:'Activa el escudo mediante el sistema real de pickup.', implemented:true },
        BOMB_KICK: { id:'BOMB_KICK', name:'PATADA', icon:'👢', rarity:'BASE', category:'BASE', desc:'Permite patear bombas durante la duración real configurada.', implemented:true }
    });
    const POWERUP_CATEGORY_LABELS = Object.freeze({
        ALL:'TODOS', BASE:'BASE', MOVIMIENTO:'MOVIMIENTO', MATERIALES:'MATERIALES / ALQUIMIA', BOMBAS:'BOMBAS', ENEMIGOS:'ENEMIGOS'
    });
    const POWERUP_RESPAWN_MS = 500;
    const DEFAULT_SHELF_FILTER = 'BASE';

    function getLabPowerupTypes() {
        const extra = typeof global.BOMBER_ENGINE?.getGameplayPowerupIds === 'function' ? global.BOMBER_ENGINE.getGameplayPowerupIds() : [];
        return Object.freeze([...BASE_POWERUP_TYPES, ...extra]);
    }

    function getPowerupMeta(type) {
        const key = String(type || '');
        return BASE_POWERUP_META[key]
            || global.GAMEPLAY_POWERUP_DEFS_V676?.[key]
            || { id:key, name:key, icon:'?', rarity:'UNKNOWN', category:'BASE', desc:'Sin descripción registrada todavía.', implemented:false };
    }

    function getPowerupCategory(type) {
        const meta = getPowerupMeta(type);
        return BASE_POWERUP_META[type] ? 'BASE' : String(meta.category || 'BASE');
    }

    function getAvailableShelfCategories() {
        const categories = new Set(['ALL', 'BASE']);
        for (const type of getLabPowerupTypes()) categories.add(getPowerupCategory(type));
        return [...categories];
    }

    function getVisiblePowerupTypes(state = getState()) {
        const all = getLabPowerupTypes();
        if (!state?.testLabV673?.active || state.testLabShelfVisibleV676 === false) return [];
        const filter = String(state.testLabPowerupFilterV676 || DEFAULT_SHELF_FILTER);
        if (filter === 'ALL') return all;
        return all.filter(type => getPowerupCategory(type) === filter);
    }

    function getPowerupSlots(types = getVisiblePowerupTypes()) {
        const slots = {};
        const columns = [8, 9, 10, 11];
        types.forEach((type, index) => {
            slots[type] = [columns[index % columns.length], 1 + Math.floor(index / columns.length)];
        });
        return slots;
    }

    const runtime = {
        installed: false,
        wrappedInitLevel: false,
        originalInitLevel: null,
        originalUpdateRoguePresentation: null,
        wrappedPresentation: false,
        originalApplyPowerup: null,
        wrappedApplyPowerup: false,
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

    function updatePowerupInfo(type, result = null) {
        const meta = getPowerupMeta(type);
        const info = getNode('test-powerup-info');
        if (!info) return;
        const icon = getNode('test-powerup-info-icon');
        const name = getNode('test-powerup-info-name');
        const category = getNode('test-powerup-info-category');
        const rarity = getNode('test-powerup-info-rarity');
        const desc = getNode('test-powerup-info-desc');
        const status = getNode('test-powerup-info-status');
        const state = getState();
        const pickups = Number(state?.testLabPowerupPickupsV676?.[type] || 0);
        const implemented = meta.implemented !== false;
        if (icon) icon.textContent = meta.icon || '?';
        if (name) name.textContent = meta.name || String(type);
        if (category) category.textContent = POWERUP_CATEGORY_LABELS[getPowerupCategory(type)] || getPowerupCategory(type);
        if (rarity) rarity.textContent = String(meta.rarity || '—');
        if (desc) desc.textContent = meta.desc || 'Sin descripción registrada todavía.';
        if (status) {
            if (!implemented) status.textContent = `NO IMPLEMENTADO · pickups: ${pickups}`;
            else if (result === false) status.textContent = `SIN CAMBIO · límite o condición real · pickups: ${pickups}`;
            else status.textContent = `APLICADO · pickups: ${pickups}`;
        }
        info.classList.remove('is-empty');
        info.setAttribute('data-powerup-type', String(type));
    }

    function clearPowerupInfo() {
        const info = getNode('test-powerup-info');
        if (!info) return;
        const icon = getNode('test-powerup-info-icon');
        const name = getNode('test-powerup-info-name');
        const category = getNode('test-powerup-info-category');
        const rarity = getNode('test-powerup-info-rarity');
        const desc = getNode('test-powerup-info-desc');
        const status = getNode('test-powerup-info-status');
        if (icon) icon.textContent = '·';
        if (name) name.textContent = 'Ninguno';
        if (category) category.textContent = '—';
        if (rarity) rarity.textContent = '—';
        if (desc) desc.textContent = 'Recogé un power-up físico del laboratorio para ver qué debería hacer.';
        if (status) status.textContent = 'ESPERANDO PICKUP REAL';
        info.classList.add('is-empty');
        info.removeAttribute('data-powerup-type');
    }

    function syncDepthInput() {
        const input = getNode('test-depth-input');
        const state = getState();
        if (input && state) input.value = String(state.level || 1);
    }

    function setTestUiState() {
        // La presentación del juego puede recalcular tema/bioma en otros módulos;
        // el Test Lab vuelve a fijar el tema neutral clásico después de cada actualización.
        if (typeof global.setActiveThemeV46 === 'function') global.setActiveThemeV46('classic', false);
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
        if (typeof global.resetGameplayPowerupsV676 === 'function') global.resetGameplayPowerupsV676();
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
        const basicBlocks = [[3,3], [3,9], [7,3], [7,9]];
        for (const [x, y] of basicBlocks) state.grid[y][x] = TYPES.BLOCK;
        state.exitPos = null;
        state.gridRevision = Number(state.gridRevision || 0) + 1;
        if (typeof global.invalidateRenderCacheV317 === 'function') global.invalidateRenderCacheV317();
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

    function spawnNeutralTestEnemies(state) {
        const defs = [
            { type: global.ENEMY_TYPES?.RASTRERO || { name:'Rastrero', color:'#ef4444', speed:1.4, canFly:false }, x:2, y:2 },
            { type: global.ENEMY_TYPES?.ESPECIAL || { name:'Especial', color:'#22c55e', speed:2.2, canFly:false }, x:10, y:10 }
        ];
        state.enemies = defs.map((entry, index) => ({
            x: entry.x * TILE_SIZE + TILE_SIZE / 2,
            y: entry.y * TILE_SIZE + TILE_SIZE / 2,
            width: TILE_SIZE * 0.75,
            height: TILE_SIZE * 0.75,
            type: entry.type,
            vx: Number(entry.type?.speed) || 1.2,
            vy: 0,
            baseSpeed: Number(entry.type?.speed) || 1.2,
            changeTimer: 0,
            elite: false,
            lastDirection: index === 0 ? 'right' : 'left',
            __gridAnchor: 'center',
            desiredDirection: index === 0 ? 'right' : 'left',
            aiBehavior: null
        }));
    }

    function spawnShelfPowerups(state) {
        const types = getVisiblePowerupTypes(state);
        const slots = getPowerupSlots(types);
        state.items = types.map(type => {
            const [x, y] = slots[type];
            return {
                x, y, type,
                testLabShelfSlotV676: type,
                testLabShelfSlotV673: type,
                testLabRespawnableV676: true,
                testLabRespawnableV673: true
            };
        });
        resetPowerupRespawnTracking();
    }

    function refreshPowerupShelf() {
        if (!isActive()) return false;
        const state = getState();
        if (!state) return false;
        state.items = Array.isArray(state.items) ? state.items.filter(item => !item?.testLabShelfSlotV676 && !item?.testLabShelfSlotV673) : [];
        spawnShelfPowerups(state);
        updatePowerupShelfControls();
        if (typeof global.updateUI === 'function') global.updateUI(true);
        if (typeof global.draw === 'function') global.draw();
        return true;
    }

    function updatePowerupShelfControls() {
        const state = getState();
        const select = getNode('test-powerup-filter');
        const toggle = getNode('test-powerup-shelf-toggle');
        if (select) {
            const filter = String(state?.testLabPowerupFilterV676 || DEFAULT_SHELF_FILTER);
            select.value = getAvailableShelfCategories().includes(filter) ? filter : DEFAULT_SHELF_FILTER;
        }
        if (toggle) toggle.textContent = state?.testLabShelfVisibleV676 === false ? 'MOSTRAR ESTANTERÍA' : 'OCULTAR ESTANTERÍA';
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
            enemies: true,
            deathEcho: false,
            materials: true,
            powerupRespawn: true,
            reason: String(reason)
        };
        state.testLabPowerupFilterV676 = String(state.testLabPowerupFilterV676 || DEFAULT_SHELF_FILTER);
        state.testLabShelfVisibleV676 = state.testLabShelfVisibleV676 !== false;
        state.testLabPowerupPickupsV676 = Object.create(null);

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
        spawnNeutralTestEnemies(state);
        centerPlayer(player);
        resetPlayerToBase(player);
        centerPlayer(player);
        // Las bombas no se precargan en el laboratorio.
        // Deben colocarse exclusivamente mediante el flujo real del jugador.
        state.bombs = [];
        if (typeof global.resetGameplayPowerupsV676 === 'function') global.resetGameplayPowerupsV676();
        clearPowerupInfo();
        spawnShelfPowerups(state);
        state.isPlaying = true;
        state.paused = false;
        state.lastTime = global.performance.now();
        runtime.arenaActive = true;

        if (typeof global.updateRoguePresentation === 'function') global.updateRoguePresentation();
        setTestUiState();
        syncDepthInput();
        getNode('test-controls')?.classList.add('test-arena-active');
        setStatus(`TEST LAB · neutral · ${getLabPowerupTypes().length} power-ups · bombas manuales · ${reason}`);
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
            ? `PASS · PATADA ${labels[direction]} · bomba real colocada por el jugador`
            : `FAIL · PATADA ${labels[direction]} · coloca una bomba adyacente y activa BOMB_KICK`);
        return ok;
    }

    function refillPowerups() {
        if (!isActive()) return false;
        const state = getState();
        if (state.testLabShelfVisibleV676 === false) state.testLabShelfVisibleV676 = true;
        refreshPowerupShelf();
        setStatus(`TEST LAB · ${POWERUP_CATEGORY_LABELS[String(state.testLabPowerupFilterV676 || DEFAULT_SHELF_FILTER)] || 'filtro'} repuesto`);
        return true;
    }

    function setPowerupFilter(filter) {
        if (!isActive()) return false;
        const state = getState();
        const value = String(filter || DEFAULT_SHELF_FILTER);
        if (!getAvailableShelfCategories().includes(value)) return false;
        state.testLabPowerupFilterV676 = value;
        state.testLabShelfVisibleV676 = true;
        refreshPowerupShelf();
        clearPowerupInfo();
        setStatus(`TEST LAB · estantería: ${POWERUP_CATEGORY_LABELS[value] || value}`);
        return true;
    }

    function togglePowerupShelf() {
        if (!isActive()) return false;
        const state = getState();
        state.testLabShelfVisibleV676 = state.testLabShelfVisibleV676 === false;
        refreshPowerupShelf();
        clearPowerupInfo();
        setStatus(state.testLabShelfVisibleV676 ? 'TEST LAB · estantería visible' : 'TEST LAB · estantería oculta');
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
        const types = getVisiblePowerupTypes(state);
        const slots = getPowerupSlots(types);
        for (const type of types) {
            const present = state.items.some(item => item?.testLabShelfSlotV676 === type || item?.testLabShelfSlotV673 === type);
            if (present) {
                runtime.respawnDue.delete(type);
                continue;
            }
            const due = runtime.respawnDue.get(type);
            if (!Number.isFinite(due)) {
                runtime.respawnDue.set(type, now + POWERUP_RESPAWN_MS);
                continue;
            }
            if (now < due) continue;
            const [x, y] = slots[type];
            if (playerOverTile(x, y)) {
                runtime.respawnDue.set(type, now + 150);
                continue;
            }
            state.items.push({ x, y, type, testLabShelfSlotV676: type, testLabShelfSlotV673: type, testLabRespawnableV676: true, testLabRespawnableV673: true });
            runtime.respawnDue.delete(type);
        }
    }

    function handleTestPowerupPickup(type, result) {
        if (!isActive()) return;
        const key = String(type || '');
        if (!getLabPowerupTypes().includes(key)) return;
        const state = getState();
        state.testLabPowerupPickupsV676 = state.testLabPowerupPickupsV676 || Object.create(null);
        state.testLabPowerupPickupsV676[key] = Number(state.testLabPowerupPickupsV676[key] || 0) + 1;
        updatePowerupInfo(key, result);
        const meta = getPowerupMeta(key);
        setStatus(`${meta.name || key} · ${meta.implemented === false ? 'registrado' : 'pickup real aplicado'}`);
    }

    function wrapPowerupApplication() {
        if (runtime.wrappedApplyPowerup) return true;
        if (typeof global.applyPowerupV67 !== 'function') return false;
        runtime.originalApplyPowerup = global.applyPowerupV67;
        global.applyPowerupV67 = function applyPowerupV67TestLab(type) {
            const result = runtime.originalApplyPowerup(type);
            if (TEST_MODE) handleTestPowerupPickup(type, result);
            return result;
        };
        runtime.wrappedApplyPowerup = true;
        return true;
    }

    function runGameplayAuditV676() {
        if (!isActive()) return false;
        const state = getState();
        const player = getPlayer();
        const checks = [];
        const push = (name, ok, detail='') => checks.push({ name, ok: !!ok, detail });
        const expectedUniversalIds = new Set([
            'LONG_FUSE','BOMB_SLIDE','ALCHEMIST_GLOVE','CATALYST','ACID_FLASK','AVALANCHE','SLOW_AURA','HUNTER_MARK'
        ]);
        push('TEST LAB activo', !!state?.testLabV673?.active);
        push('Entorno neutral', !!state?.testLabV673?.neutral && !state?.biomeV49);
        push('Jugador presente', !!player);
        push('Bombas manuales', Array.isArray(state?.bombs));
        push('Enemigos básicos de auditoría', Array.isArray(state?.enemies) && state.enemies.length >= 2);
        push('Capacidad válida', !!player && Number.isFinite(player.maxBombs) && Number.isFinite(player.bombRange) && player.maxBombs >= 1 && player.bombRange >= 1);
        push('Capacidad dentro de límites', !!player && player.maxBombs <= Number(global.PLAYER_LIMITS_V67?.hard?.maxBombs || Infinity) && player.bombRange <= Number(global.PLAYER_LIMITS_V67?.hard?.bombRange || Infinity));
        const bombCount = (state?.bombs || []).filter(b => b?.countsTowardPlayerCapacity !== false).length;
        push('BombsPlaced coherente', !!player && Number(player.bombsPlaced) === bombCount, `${player?.bombsPlaced ?? '—'} / ${bombCount}`);
        const occupied = new Set();
        let bombBounds = true;
        for (const b of state?.bombs || []) {
            const key = `${b.x},${b.y}`;
            if (occupied.has(key)) bombBounds = false;
            occupied.add(key);
            if (!(b.x >= 0 && b.y >= 0 && b.x < state.gridWidth && b.y < state.gridHeight)) bombBounds = false;
        }
        push('Bombas sin duplicados/fuera de grid', bombBounds);
        const gameplayAudit = typeof global.auditGameplayPowerupsV676 === 'function' ? global.auditGameplayPowerupsV676() : null;
        push('Power-ups universales auditables', !!gameplayAudit?.valid, gameplayAudit?.errors?.join('; ') || '');
        const labTypes = getLabPowerupTypes();
        const baseDefs = global.POWERUP_DEFS_V67 || {};
        push('6 power-ups base con aplicación real', BASE_POWERUP_TYPES.every(type => typeof baseDefs[type]?.apply === 'function'));
        const dropPool = typeof global.getPowerupDropPoolV67 === 'function' ? global.getPowerupDropPoolV67() : [];
        push('Pool universal disponible', labTypes.every(type => dropPool.includes(type)));
        push('Hooks universales conectados', typeof global.gameplayPowerupUpdateV676 === 'function' && typeof global.getGameplayPowerupEnemySpeedMultiplierV676 === 'function' && typeof global.applyGameplayPowerupToBombV676 === 'function');
        push('Sin hooks Winter de power-ups', typeof global.winterPowerupUpdateV67 !== 'function' && typeof global.getWinterPowerupMovementModifiersV67 !== 'function');
        push('Catálogo universal', labTypes.filter(type => !BASE_POWERUP_TYPES.includes(type)).every(type => expectedUniversalIds.has(type)) && labTypes.length === BASE_POWERUP_TYPES.length + expectedUniversalIds.size);
        push('Todos los power-ups con metadatos', labTypes.every(type => !!getPowerupMeta(type)?.desc && getPowerupMeta(type)?.implemented !== false));
        push('Preview de rango eliminado', typeof global.renderBombRangePreview !== 'function' && typeof global.getBombBlastPreviewCells !== 'function' && !(state?.bombs || []).some(b => 'previewCells' in b || 'previewGrid' in b || 'previewTimer' in b));
        const valid = checks.every(check => check.ok);
        const audit = getNode('test-lab-audit');
        if (audit) {
            audit.textContent = `${valid ? 'PASS' : 'FAIL'} · ${checks.filter(c=>c.ok).length}/${checks.length} checks` + (checks.filter(c=>!c.ok).length ? ` · ${checks.filter(c=>!c.ok).map(c=>c.name).join(', ')}` : '');
            audit.classList.toggle('is-fail', !valid);
        }
        setStatus(valid ? 'TEST LAB · AUDITORÍA PASS' : `TEST LAB · AUDITORÍA FAIL · ${checks.filter(c=>!c.ok).map(c=>c.name).join(', ')}`);
        return valid;
    }

    function setTestPanelVisible(visible) {
        const root = getNode('test-controls');
        if (!root || !TEST_MODE) return false;
        const show = !!visible;
        root.classList.toggle('hidden', !show);
        root.setAttribute('aria-hidden', show ? 'false' : 'true');
        return show;
    }

    function toggleTestPanel() {
        const root = getNode('test-controls');
        if (!root || !TEST_MODE) return false;
        return setTestPanelVisible(root.classList.contains('hidden'));
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
        getNode('test-lab-audit-btn')?.addEventListener('click', runGameplayAuditV676);
        getNode('test-powerup-filter')?.addEventListener('change', event => setPowerupFilter(event.currentTarget.value));
        getNode('test-powerup-shelf-toggle')?.addEventListener('click', togglePowerupShelf);
        root.querySelectorAll('[data-test-kick]').forEach(button => {
            button.addEventListener('click', () => testKickDirection(button.getAttribute('data-test-kick')));
        });

        global.document.addEventListener('keydown', event => {
            if (!TEST_MODE) return;
            if (event.key === 'F2') {
                event.preventDefault();
                toggleTestPanel();
                return;
            }
            if (event.target?.matches?.('input,textarea,select,button')) return;
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
        if (!wrapPresentation() || !wrapInitLevel() || !wrapPowerupApplication()) {
            global.setTimeout(bootstrap, 40);
            return;
        }
        const root = getNode('test-controls');
        setTestPanelVisible(false);
        updatePowerupShelfControls();
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
    global.BOMBER_TEST_MODE_V676 = TEST_MODE;
    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.isTestMode = () => TEST_MODE;
    global.BOMBER_ENGINE.isTestLabNeutral = () => isActive();
    global.BOMBER_ENGINE.getTestLabConfig = () => ({
        active: isActive(),
        version: '6.7.8',
        neutral: true,
        arena: { ...TEST_ARENA },
        powerupFilter: getState()?.testLabPowerupFilterV676 || DEFAULT_SHELF_FILTER,
        shelfVisible: getState()?.testLabShelfVisibleV676 !== false,
        powerups: [...getLabPowerupTypes()]
    });
    global.BOMBER_ENGINE.getTestLabPowerupCatalog = () => Object.freeze(Object.fromEntries(getLabPowerupTypes().map(type => [type, getPowerupMeta(type)])));
    global.BOMBER_ENGINE.setTestLabPowerupFilter = setPowerupFilter;
    global.BOMBER_ENGINE.toggleTestLabPowerupShelf = togglePowerupShelf;
    global.BOMBER_ENGINE.toggleTestLabPanel = toggleTestPanel;
    global.BOMBER_ENGINE.skipToDepth = jump;
    global.BOMBER_ENGINE.buildBombKickTestArena = resetMap;
    global.BOMBER_ENGINE.testBombKickDirection = testKickDirection;
    global.BOMBER_ENGINE.auditTestLabGameplay = runGameplayAuditV676;
    global.BOMBER_ENGINE.spawnTestPowerup = (type) => {
        // Compatibilidad API: devuelve/restituye un power-up real en la estantería;
        // nunca altera capacidades directamente.
        if (!getLabPowerupTypes().includes(type)) return false;
        const state = getState();
        if (!isActive() || !state) return false;
        const [x, y] = getPowerupSlots()[type];
        if (!state.items.some(item => item?.testLabShelfSlotV676 === type || item?.testLabShelfSlotV673 === type)) {
            state.items.push({ x, y, type, testLabShelfSlotV676: type, testLabShelfSlotV673: type, testLabRespawnableV676: true, testLabRespawnableV673: true });
        }
        return true;
    };

    bootstrap();
})(window);
