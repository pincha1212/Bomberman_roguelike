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
    const BASE_POWERUP_TYPES = Object.freeze(['BOMB_UP', 'FIRE_UP', 'SPEED_UP', 'HEALTH_UP', 'SHIELD_UP']);
    const CAPABILITY_POWERUP_TYPES = Object.freeze(['KICK', 'GRAB', 'THROW']);
    const ELEMENTAL_POWERUP_TYPES = Object.freeze(['BOMB_FIRE','BOMB_ICE','BOMB_ELECTRIC']);
    const BASE_POWERUP_META = Object.freeze({
        BOMB_UP: { id:'BOMB_UP', name:'BOMBA', icon:'💣', rarity:'BASE', category:'BASE', desc:'Aumenta maxBombs en 1 hasta el límite actual; las reliquias pueden ampliar ese límite.', implemented:true },
        FIRE_UP: { id:'FIRE_UP', name:'RANGO', icon:'🔥', rarity:'BASE', category:'BASE', desc:'Aumenta bombRange en 1 hasta el límite actual; las reliquias pueden ampliar ese límite.', implemented:true },
        SPEED_UP: { id:'SPEED_UP', name:'BOTAS', icon:'👟', rarity:'BASE', category:'BASE', desc:'Aumenta la velocidad del jugador mediante el pickup real.', implemented:true },
        HEALTH_UP: { id:'HEALTH_UP', name:'VIDA', icon:'❤️', rarity:'BASE', category:'BASE', desc:'Recupera 1 punto de vida, limitado por maxHealth.', implemented:true },
        SHIELD_UP: { id:'SHIELD_UP', name:'ESCUDO', icon:'🛡️', rarity:'BASE', category:'BASE', desc:'Activa el escudo mediante el sistema real de pickup.', implemented:true },
        KICK: { id:'KICK', name:'PATADA', icon:'🥾', rarity:'BASE', category:'INTERACCION', desc:'Capacidad permanente: empujar bombas al caminar contra ellas.', implemented:true },
        GRAB: { id:'GRAB', name:'AGARRE', icon:'🧤', rarity:'BASE', category:'INTERACCION', desc:'Capacidad permanente: levantar y transportar bombas; GRAB implica CARRY.', implemented:true },
        THROW: { id:'THROW', name:'LANZAMIENTO', icon:'🎯', rarity:'BASE', category:'INTERACCION', desc:'Capacidad permanente: lanzar la bomba transportada hasta 3 celdas. Requiere GRAB.', implemented:true, experimental:true },
        BOMB_FIRE: { id:'BOMB_FIRE', name:'BOMBA FUEGO', icon:'🔥', rarity:'ELEMENTAL', category:'BOMBAS', desc:'Selecciona FUEGO para las próximas bombas.', implemented:true },
        BOMB_ICE: { id:'BOMB_ICE', name:'BOMBA HIELO', icon:'❄️', rarity:'ELEMENTAL', category:'BOMBAS', desc:'Selecciona HIELO para las próximas bombas.', implemented:true },
        BOMB_ELECTRIC: { id:'BOMB_ELECTRIC', name:'BOMBA ELÉCTRICA', icon:'⚡', rarity:'ELEMENTAL', category:'BOMBAS', desc:'Selecciona ELÉCTRICA para las próximas bombas.', implemented:true },
    });
    const POWERUP_CATEGORY_LABELS = Object.freeze({
        ALL:'TODOS', BASE:'BASE', INTERACCION:'INTERACCION', MOVIMIENTO:'MOVIMIENTO', BOMBAS:'BOMBAS', ENEMIGOS:'ENEMIGOS'
    });
    const DEFAULT_SELECTOR_FILTER = 'BASE';
    const SELECTOR_NORMAL = 'BOMB_NORMAL';
    const ELEMENTAL_TEST_CASES = Object.freeze([
        { id:'NORMAL', label:'NORMAL', element:'normal', powerup:null },
        { id:'FIRE', label:'FUEGO', element:'fire', powerup:'BOMB_FIRE' },
        { id:'ICE', label:'HIELO', element:'ice', powerup:'BOMB_ICE' },
        { id:'ELECTRIC', label:'ELÉCTRICA', element:'electric', powerup:'BOMB_ELECTRIC' }
    ]);

    function getLabSelectorTypes() {
        const gameplay = typeof global.BOMBER_ENGINE?.getGameplayPowerupIds === 'function' ? global.BOMBER_ENGINE.getGameplayPowerupIds() : [];
        const capability = typeof global.getCapabilityPowerupIdsV681 === 'function' ? global.getCapabilityPowerupIdsV681() : CAPABILITY_POWERUP_TYPES;
        const all = [SELECTOR_NORMAL, ...BASE_POWERUP_TYPES, ...ELEMENTAL_POWERUP_TYPES, ...gameplay, ...capability];
        return Object.freeze([...new Set(all)]);
    }

    function getPowerupMeta(type) {
        const key = String(type || '');
        if (key === SELECTOR_NORMAL) return { id:key, name:'BOMBA NORMAL', icon:'○', rarity:'BASE', category:'BOMBAS', desc:'Restablece el elemento de las próximas bombas a NORMAL.', implemented:true };
        return global.getPowerupDefinitionV69?.(key)
            || BASE_POWERUP_META[key]
            || global.getPowerupDefinitionV612?.(key)
            || global.GAMEPLAY_POWERUP_DEFS_V676?.[key]
            || global.CAPABILITY_POWERUPS_V681?.[key]
            || { id:key, name:key, icon:'?', rarity:'UNKNOWN', category:'BASE', desc:'Sin descripción registrada todavía.', implemented:false };
    }

    function getPowerupCategory(type) {
        const meta = getPowerupMeta(type);
        return BASE_POWERUP_META[type] ? 'BASE' : String(meta.category || 'BASE');
    }

    function getAvailableSelectorCategories() {
        const categories = new Set(['ALL', 'BASE']);
        for (const type of getLabSelectorTypes()) categories.add(getPowerupCategory(type));
        return [...categories];
    }

    function getVisibleSelectorTypes(state = getState()) {
        const all = getLabSelectorTypes();
        if (!state?.testLabV673?.active) return [];
        const filter = String(state.testLabPowerupFilterV676 || DEFAULT_SELECTOR_FILTER);
        if (filter === 'ALL') return all;
        return all.filter(type => getPowerupCategory(type) === filter);
    }

    const runtime = {
        installed: false,
        wrappedInitLevel: false,
        originalInitLevel: null,
        originalUpdateRoguePresentation: null,
        wrappedPresentation: false,
        arenaActive: false
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
        if (typeof global.playerFSMReset === 'function') global.playerFSMReset('test-lab-player-reset');
        if (typeof global.resetGameplayPowerupsV676 === 'function') global.resetGameplayPowerupsV676();
        if (typeof global.resetEntityCapabilitiesV681 === 'function') global.resetEntityCapabilitiesV681(player);
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
            powerupRespawn: true,
            reason: String(reason)
        };
        state.testLabPowerupFilterV676 = String(state.testLabPowerupFilterV676 || DEFAULT_SELECTOR_FILTER);
        state.testLabPowerupSelectionV676 = state.testLabPowerupSelectionV676 || SELECTOR_NORMAL;

        if (typeof global.setActiveThemeV46 === 'function') global.setActiveThemeV46('classic', false);
        state.biomeV49 = null;
        state.roomType = TEST_ROOM_TYPE;
        state.roomTime = Number.POSITIVE_INFINITY;
        state.nextReinforcement = Number.MAX_SAFE_INTEGER;
        state.threatLevel = 0;
        state.exitPos = null;
        state.dungeonV44 = null;
        state.roomDesign = null;
        clearDynamicRuntime(state);
        if (typeof global.materialResetV60 === 'function') global.materialResetV60();
        createNeutralGrid(state);
        spawnNeutralTestEnemies(state);
        if (typeof global.releaseCarriedBombV682 === 'function') global.releaseCarriedBombV682(player, 'reset');
        centerPlayer(player);
        resetPlayerToBase(player);
        centerPlayer(player);
        // Las bombas no se precargan en el laboratorio.
        // Deben colocarse exclusivamente mediante el flujo real del jugador.
        state.bombs = [];
        if (typeof global.resetGameplayPowerupsV676 === 'function') global.resetGameplayPowerupsV676();
        clearPowerupInfo();
        updatePowerupSelectorUI();
        state.isPlaying = true;
        state.paused = false;
        state.lastTime = global.performance.now();
        runtime.arenaActive = true;

        if (typeof global.updateRoguePresentation === 'function') global.updateRoguePresentation();
        setTestUiState();
        syncDepthInput();
        getNode('test-controls')?.classList.add('test-arena-active');
        setStatus(`TEST LAB · neutral · ${getLabSelectorTypes().length - 1} opciones · aplicación directa · ${reason}`);
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

    function updatePowerupSelectorUI() {
        const state = getState();
        const select = getNode('test-powerup-filter');
        const powerup = getNode('test-powerup-select');
        if (select) {
            const filter = String(state?.testLabPowerupFilterV676 || DEFAULT_SELECTOR_FILTER);
            select.value = getAvailableSelectorCategories().includes(filter) ? filter : DEFAULT_SELECTOR_FILTER;
        }
        if (powerup) {
            const selected = String(state?.testLabPowerupSelectionV676 || SELECTOR_NORMAL);
            const types = getVisibleSelectorTypes(state);
            powerup.innerHTML = '';
            for (const type of types) {
                const meta = getPowerupMeta(type);
                const option = global.document.createElement('option');
                option.value = type;
                option.textContent = `${meta.icon || ''} ${meta.name || type}`.trim();
                powerup.appendChild(option);
            }
            powerup.value = types.includes(selected) ? selected : (types[0] || SELECTOR_NORMAL);
        }
    }

    function selectTestPowerup(type) {
        if (!isActive()) return false;
        const key = String(type || '');
        if (!getLabSelectorTypes().includes(key)) return false;
        const state = getState();
        state.testLabPowerupSelectionV676 = key;
        updatePowerupSelectorUI();
        updatePowerupInfo(key, null);
        return true;
    }

    function applyTestPowerup(type = null) {
        if (!isActive()) return false;
        const state = getState();
        const key = String(type || state?.testLabPowerupSelectionV676 || SELECTOR_NORMAL);
        let result = false;
        if (key === SELECTOR_NORMAL) {
            result = typeof global.setPlayerBombElementV612 === 'function' && !!global.setPlayerBombElementV612('normal');
        } else if (ELEMENTAL_POWERUP_TYPES.includes(key)) {
            result = typeof global.applyElementalPowerupV612 === 'function' && !!global.applyElementalPowerupV612(key);
        } else if (typeof global.applyPowerupV67 === 'function') {
            result = !!global.applyPowerupV67(key);
        }
        updatePowerupInfo(key, result);
        const meta = getPowerupMeta(key);
        setStatus(result ? `TEST LAB · APLICADO · ${meta.name || key}` : `TEST LAB · SIN CAMBIO · ${meta.name || key}`);
        if (typeof global.updateUI === 'function') global.updateUI(true);
        return result;
    }

    function setPowerupFilter(filter) {
        if (!isActive()) return false;
        const state = getState();
        const value = String(filter || DEFAULT_SELECTOR_FILTER);
        if (!getAvailableSelectorCategories().includes(value)) return false;
        state.testLabPowerupFilterV676 = value;
        updatePowerupSelectorUI();
        const types = getVisibleSelectorTypes(state);
        if (types.length) state.testLabPowerupSelectionV676 = types[0];
        updatePowerupSelectorUI();
        clearPowerupInfo();
        setStatus(`TEST LAB · selector: ${POWERUP_CATEGORY_LABELS[value] || value}`);
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

    function getElementalTestStatus() {
        const state = getState();
        const bombs = Array.isArray(state?.bombs) ? state.bombs : [];
        const activeElements = new Set(bombs.map(b => String(b?.elementV612 || 'normal')));
        return {
            bombs: bombs.length,
            elements: [...activeElements],
            cases: ELEMENTAL_TEST_CASES.map(test => ({
                id: test.id,
                element: test.element,
                placed: bombs.some(b => String(b?.elementV612 || 'normal') === test.element),
                carried: bombs.some(b => String(b?.elementV612 || 'normal') === test.element && b?.state === 'carried'),
                moving: bombs.some(b => String(b?.elementV612 || 'normal') === test.element && b?.state === 'moving')
            }))
        };
    }

    function setPlayerElementForTest(element) {
        if (!isActive()) return false;
        if (typeof global.setPlayerBombElementV612 !== 'function') return false;
        return !!global.setPlayerBombElementV612(element);
    }

    function spawnElementalTestKit() {
        if (!isActive()) return false;
        const state = getState();
        const player = getPlayer();
        if (!state || !player || typeof global.placeBomb !== 'function') return false;

        // Kit físico real: usa placeBomb() para que mecha, rango, elemento,
        // FSM y lifecycle sean exactamente los del gameplay.
        const original = {
            x: player.x, y: player.y, dir: player.dir,
            maxBombs: player.maxBombs, bombsPlaced: player.bombsPlaced,
            cooldown: player.bombCooldown, element: player.bombElementV612
        };
        const targets = [[4,6,'normal'],[6,4,'fire'],[8,6,'ice'],[6,8,'electric']];
        const occupied = new Set((state.bombs || []).map(b => `${b.x},${b.y}`));
        player.maxBombs = Math.max(8, Number(player.maxBombs) || 1);
        player.bombsPlaced = (state.bombs || []).filter(b => b?.countsTowardPlayerCapacity !== false).length;

        for (const [gx, gy, element] of targets) {
            if (state.grid?.[gy]?.[gx] !== TYPES.EMPTY || occupied.has(`${gx},${gy}`)) continue;
            player.x = gx * TILE_SIZE + (TILE_SIZE - player.width) / 2;
            player.y = gy * TILE_SIZE + (TILE_SIZE - player.height) / 2;
            player.bombCooldown = 0;
            if (typeof global.setPlayerBombElementV612 === 'function') global.setPlayerBombElementV612(element);
            if (global.placeBomb('test-lab-elemental-kit')) {
                occupied.add(`${gx},${gy}`);
            }
        }

        player.x = original.x; player.y = original.y; player.dir = original.dir;
        player.maxBombs = original.maxBombs;
        player.bombsPlaced = (state.bombs || []).filter(b => b?.countsTowardPlayerCapacity !== false).length;
        player.bombCooldown = original.cooldown;
        if (typeof global.setPlayerBombElementV612 === 'function') global.setPlayerBombElementV612(original.element || 'normal');
        setStatus('TEST LAB · KIT ELEMENTAL creado con bombas reales: NORMAL / FUEGO / HIELO / ELÉCTRICA');
        if (typeof global.updateUI === 'function') global.updateUI(true);
        if (typeof global.draw === 'function') global.draw();
        return true;
    }

    function spawnElementalInteractionTest() {
        if (!isActive()) return false;
        const state = getState();
        const player = getPlayer();
        if (!state || !player || typeof global.placeBomb !== 'function') return false;
        const target = [Math.floor((player.x + player.width / 2) / TILE_SIZE) + 1, Math.floor((player.y + player.height / 2) / TILE_SIZE)];
        const [gx, gy] = target;
        if (state.grid?.[gy]?.[gx] !== TYPES.EMPTY || state.bombs?.some(b => b.x === gx && b.y === gy)) return false;
        const original = { x:player.x, y:player.y, maxBombs:player.maxBombs, bombsPlaced:player.bombsPlaced, cooldown:player.bombCooldown };
        player.maxBombs = Math.max(8, Number(player.maxBombs) || 1);
        player.bombsPlaced = (state.bombs || []).filter(b => b?.countsTowardPlayerCapacity !== false).length;
        player.x = (gx - 1) * TILE_SIZE + (TILE_SIZE - player.width) / 2;
        player.y = gy * TILE_SIZE + (TILE_SIZE - player.height) / 2;
        player.bombCooldown = 0;
        const ok = global.placeBomb('test-lab-elemental-grab-throw');
        player.x = original.x; player.y = original.y; player.maxBombs = original.maxBombs;
        player.bombsPlaced = (state.bombs || []).filter(b => b?.countsTowardPlayerCapacity !== false).length;
        player.bombCooldown = original.cooldown;
        setStatus(ok ? 'TEST LAB · bomba real adyacente lista para GRAB / THROW' : 'TEST LAB · no se pudo crear la bomba de interacción');
        return ok;
    }

    function clearTestBombs() {
        if (!isActive()) return false;
        const state = getState();
        state.bombs = [];
        if (getPlayer()) getPlayer().bombsPlaced = 0;
        setStatus('TEST LAB · bombas de prueba eliminadas');
        if (typeof global.draw === 'function') global.draw();
        return true;
    }


    function runGameplayAuditV676() {
        if (!isActive()) return false;
        const state = getState();
        const player = getPlayer();
        const checks = [];
        const push = (name, ok, detail='') => checks.push({ name, ok: !!ok, detail });
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
        const labTypes = getLabSelectorTypes();
        const baseDefs = global.POWERUP_DEFS_V67 || {};
        push('5 power-ups base con aplicación real', BASE_POWERUP_TYPES.every(type => typeof baseDefs[type]?.apply === 'function'));
        const dropPool = typeof global.getPowerupDropPoolV67 === 'function' ? global.getPowerupDropPoolV67() : [];
        push('Pool base disponible', BASE_POWERUP_TYPES.every(type => dropPool.includes(type)));
        push('Capacidades experimentales en Test Lab', CAPABILITY_POWERUP_TYPES.every(type => labTypes.includes(type)));
        const capabilityAudit = {
            kickEligible: typeof global.canKick === 'function' && global.canKick(player),
            grabEligible: typeof global.canGrab === 'function' && global.canGrab(player),
            initiallyInactive: typeof global.isKickActiveV681 === 'function' && typeof global.isGrabActiveV681 === 'function' && !global.isKickActiveV681(player) && !global.isGrabActiveV681(player)
        };
        push('Capacidades KICK/GRAB declaradas', capabilityAudit.kickEligible && capabilityAudit.grabEligible);
        push('KICK/GRAB inactivos al reset', capabilityAudit.initiallyInactive);
        const activeCaps = typeof global.getActiveCapabilityPowerupsV681 === 'function' ? global.getActiveCapabilityPowerupsV681(player) : [];
        push('KICK y GRAB pueden coexistir', !global.CAPABILITY_POWERUPS_V681?.KICK?.exclusiveGroup && !global.CAPABILITY_POWERUPS_V681?.GRAB?.exclusiveGroup);
        push('Capacidades aplicables desde Test Lab', ['KICK','GRAB'].every(type => typeof global.activateCapabilityPowerupV681 === 'function' && !!global.CAPABILITY_POWERUPS_V681?.[type]));
        if (activeCaps.includes('THROW')) push('THROW requiere GRAB activo', activeCaps.includes('GRAB'));
        push('THROW registrado', labTypes.includes('THROW') && !!global.CAPABILITY_POWERUPS_V681?.THROW);
        push('THROW requiere GRAB', Array.isArray(global.CAPABILITY_POWERUPS_V681?.THROW?.requires) && global.CAPABILITY_POWERUPS_V681.THROW.requires.includes('grab'));

        push('Catálogo Lab = base + elementales + capacidades', labTypes.length === 1 + BASE_POWERUP_TYPES.length + ELEMENTAL_POWERUP_TYPES.length + CAPABILITY_POWERUP_TYPES.length);
        push('Todos los power-ups con metadatos', labTypes.every(type => !!getPowerupMeta(type)?.desc && getPowerupMeta(type)?.implemented !== false));
        push('Elementales registradas', ELEMENTAL_POWERUP_TYPES.every(type => labTypes.includes(type)));
        push('Definiciones elementales completas', ELEMENTAL_TEST_CASES.every(test => test.element === 'normal' || !!global.ELEMENTAL_BOMB_DEFS_V612?.[test.element]));
        push('Aplicación elemental disponible', ELEMENTAL_POWERUP_TYPES.every(type => typeof global.applyElementalPowerupV612 === 'function'));
        push('Bomba conserva elemento', (state?.bombs || []).filter(b => b?.elementV612).every(b => !!global.ELEMENTAL_BOMB_DEFS_V612?.[b.elementV612]));
        push('Efectos elementales conectados', ['heat','frost','shock'].every(id => Object.values(global.ELEMENTAL_BOMB_DEFS_V612 || {}).some(def => Array.isArray(def.effectIds) && def.effectIds.includes(id))));
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
        getNode('test-powerup-apply')?.addEventListener('click', () => applyTestPowerup());
        getNode('test-powerup-select')?.addEventListener('change', event => selectTestPowerup(event.currentTarget.value));
        getNode('test-lab-audit-btn')?.addEventListener('click', runGameplayAuditV676);
        getNode('test-powerup-filter')?.addEventListener('change', event => setPowerupFilter(event.currentTarget.value));
        getNode('test-elemental-kit')?.addEventListener('click', spawnElementalTestKit);
        getNode('test-elemental-interaction')?.addEventListener('click', spawnElementalInteractionTest);
        getNode('test-elemental-clear')?.addEventListener('click', clearTestBombs);

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
        if (!wrapPresentation() || !wrapInitLevel()) {
            global.setTimeout(bootstrap, 40);
            return;
        }
        const root = getNode('test-controls');
        setTestPanelVisible(false);
        updatePowerupSelectorUI();
        if (!runtime.installed) {
            runtime.installed = true;
            jump(Number(getState()?.level) || 1);
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
        version: '6.7.9',
        neutral: true,
        arena: { ...TEST_ARENA },
        powerupFilter: getState()?.testLabPowerupFilterV676 || DEFAULT_SELECTOR_FILTER,
        selectedPowerup: getState()?.testLabPowerupSelectionV676 || SELECTOR_NORMAL,
        powerups: [...getLabSelectorTypes()]
    });
    global.BOMBER_ENGINE.getTestLabPowerupCatalog = () => Object.freeze(Object.fromEntries(getLabSelectorTypes().map(type => [type, getPowerupMeta(type)])));
    global.BOMBER_ENGINE.setTestLabPowerupFilter = setPowerupFilter;
    global.BOMBER_ENGINE.selectTestLabPowerup = selectTestPowerup;
    global.BOMBER_ENGINE.applyTestLabPowerup = applyTestPowerup;
    global.BOMBER_ENGINE.toggleTestLabPanel = toggleTestPanel;
    global.BOMBER_ENGINE.skipToDepth = jump;
    global.BOMBER_ENGINE.auditTestLabGameplay = runGameplayAuditV676;
    global.BOMBER_ENGINE.spawnElementalTestKitV612 = spawnElementalTestKit;
    global.BOMBER_ENGINE.spawnElementalInteractionTestV612 = spawnElementalInteractionTest;
    global.BOMBER_ENGINE.clearTestBombsV612 = clearTestBombs;
    global.BOMBER_ENGINE.getElementalTestStatusV612 = getElementalTestStatus;
    global.BOMBER_ENGINE.spawnTestPowerup = selectTestPowerup;

    bootstrap();
})(window);
