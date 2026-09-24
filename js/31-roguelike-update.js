/*
 * BOMBERMAN ROGUELIKE v3.27.0
 * Roguelike Update
 *
 * Adds a lightweight meta layer over the existing run:
 * - Better in-run coin economy with clear/resource sinks.
 * - Relic offers with rarity, duplicate protection and reroll.
 * - Tag-based synergies with derived bonuses.
 * - Next-room route choices: standard, treasure, elite, shrine.
 * - Safe wrappers around the existing run lifecycle; no replacement game loop.
 */

const ROGUELIKE_V327_CONFIG = Object.freeze({
    enabled: true,
    rerollCost: 4,
    relicOfferCount: 3,
    roomOfferCount: 3,
    maxRelics: 12,
    minBombFuseMs: 700,
    roomClearBaseCoins: 6,
    blockCoinBase: 0,
    enemyCoinBase: 0,
    treasureStartCoins: 8,
    eliteExtraEnemies: 1,
    eliteRelicQualityBoost: 1,
    shrineHeal: 1,
    version: '3.27.0'
});

const ROGUELIKE_RELICS_V327 = Object.freeze([
    {
        id: 'ember_core',
        name: 'NÚCLEO ÍGNEO',
        rarity: 'common',
        tags: ['combustion'],
        icon: '🔥',
        desc: '+1 rango de bomba.',
        bonuses: { range: 1 }
    },
    {
        id: 'double_charge',
        name: 'DOBLE CARGA',
        rarity: 'common',
        tags: ['demolition'],
        icon: '💣',
        desc: '+1 bomba máxima.',
        bonuses: { bombs: 1 }
    },
    {
        id: 'hot_boots',
        name: 'BOTAS CALIENTES',
        rarity: 'common',
        tags: ['mobility'],
        icon: '👟',
        desc: '+0.35 velocidad.',
        bonuses: { speed: 0.35 }
    },
    {
        id: 'salvage_hook',
        name: 'GANCHO CHATARRERO',
        rarity: 'common',
        tags: ['economy'],
        icon: '🪝',
        desc: '+1 moneda por bloque destruido.',
        bonuses: { coinBlock: 1 }
    },
    {
        id: 'bounty_seal',
        name: 'SELLO DE COBRO',
        rarity: 'common',
        tags: ['economy', 'combat'],
        icon: '¢',
        desc: '+2 monedas por enemigo eliminado.',
        bonuses: { coinEnemy: 2 }
    },
    {
        id: 'iron_heart',
        name: 'CORAZÓN DE HIERRO',
        rarity: 'uncommon',
        tags: ['survival'],
        icon: '❤',
        desc: '+1 vida máxima.',
        bonuses: { maxHealth: 1 }
    },
    {
        id: 'blast_capacitor',
        name: 'CAPACITOR DE ESTALLIDO',
        rarity: 'uncommon',
        tags: ['combustion', 'demolition'],
        icon: '⚡',
        desc: '+1 rango y mecha 200 ms más corta.',
        bonuses: { range: 1, fuseMs: -200 }
    },
    {
        id: 'quick_wick',
        name: 'MECHA CORTA',
        rarity: 'uncommon',
        tags: ['demolition', 'mobility'],
        icon: '⏱',
        desc: 'Mecha 350 ms más corta.',
        bonuses: { fuseMs: -350 }
    },
    {
        id: 'greedy_spark',
        name: 'CHISPA CODICIOSA',
        rarity: 'uncommon',
        tags: ['economy'],
        icon: '✦',
        desc: '+20% a todas las monedas ganadas.',
        bonuses: { coinMultiplier: 0.20 }
    },
    {
        id: 'glass_fuse',
        name: 'MECHA DE VIDRIO',
        rarity: 'rare',
        tags: ['combustion', 'risk'],
        icon: '◆',
        desc: '+2 rango, -1 vida máxima.',
        bonuses: { range: 2, maxHealth: -1 }
    },
    {
        id: 'redline',
        name: 'LÍNEA ROJA',
        rarity: 'rare',
        tags: ['mobility', 'risk'],
        icon: '↯',
        desc: '+0.6 velocidad, -1 vida máxima.',
        bonuses: { speed: 0.6, maxHealth: -1 }
    },
    {
        id: 'last_stand',
        name: 'ÚLTIMA RESERVA',
        rarity: 'rare',
        tags: ['survival', 'risk'],
        icon: '🛡',
        desc: 'Recuperás 1 vida al entrar a cada sala.',
        bonuses: { roomHeal: 1 }
    }
]);

const ROGUELIKE_ROOM_PLANS_V327 = Object.freeze([
    {
        id: 'standard',
        name: 'ESTÁNDAR',
        icon: '◆',
        desc: 'Equilibrio entre combate y recursos.',
        startCoins: 0,
        clearBonus: 0,
        risk: 'normal',
        relicQualityBoost: 0
    },
    {
        id: 'treasure',
        name: 'TESORO',
        icon: '✦',
        desc: `+${ROGUELIKE_V327_CONFIG.treasureStartCoins} monedas al entrar.`,
        startCoins: ROGUELIKE_V327_CONFIG.treasureStartCoins,
        clearBonus: 2,
        risk: 'bajo',
        relicQualityBoost: 0
    },
    {
        id: 'elite',
        name: 'ÉLITE',
        icon: '☠',
        desc: `+${ROGUELIKE_V327_CONFIG.eliteExtraEnemies} enemigo y mejor oferta de reliquias.`,
        startCoins: 0,
        clearBonus: 8,
        risk: 'alto',
        relicQualityBoost: ROGUELIKE_V327_CONFIG.eliteRelicQualityBoost
    },
    {
        id: 'shrine',
        name: 'SANTUARIO',
        icon: '✚',
        desc: `+${ROGUELIKE_V327_CONFIG.shrineHeal} vida al entrar si falta vida.`,
        startCoins: 0,
        clearBonus: 1,
        risk: 'bajo',
        relicQualityBoost: 1
    }
]);

const ROGUELIKE_SYNERGIES_V327 = Object.freeze([
    {
        id: 'double_burn',
        name: 'DOBLE COMBUSTIÓN',
        req: { combustion: 2 },
        desc: '+1 rango.'
    },
    {
        id: 'chain_crew',
        name: 'CUADRILLA DE DEMOLICIÓN',
        req: { demolition: 2 },
        desc: '+1 bomba máxima.'
    },
    {
        id: 'merchant_route',
        name: 'RUTA DE COMERCIANTES',
        req: { economy: 2 },
        desc: '+25% monedas.'
    },
    {
        id: 'overclock',
        name: 'SOBRECARGA',
        req: { mobility: 2 },
        desc: '+0.2 velocidad.'
    },
    {
        id: 'fortress',
        name: 'FORTALEZA',
        req: { survival: 2 },
        desc: '+1 vida máxima.'
    },
    {
        id: 'volatile_chain',
        name: 'CADENA VOLÁTIL',
        req: { risk: 1, demolition: 1 },
        desc: '+1 rango.'
    }
]);

const ROGUELIKE_V327 = {
    installed: false,
    original: {
        updateUI: null,
        startGame: null,
        initLevel: null,
        completeLevel: null,
        explodeBomb: null,
        placeBomb: null,
        gameOver: null
    },
    runActive: false,
    currentRoomPlan: 'standard',
    pendingRoomPlan: 'standard',
    relicOffers: [],
    roomOffers: [],
    selectedRelic: null,
    rerollsUsed: 0,
    relics: [],
    coinStats: {
        blocks: 0,
        enemies: 0,
        roomClear: 0,
        rerolls: 0
    },
    appliedBonus: {
        bombs: 0,
        range: 0,
        speed: 0,
        maxHealth: 0
    },
    lastRoomOfferKey: '',
    lastRelicOfferKey: ''
};

function rogueV327Num(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function rogueV327Clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function rogueV327Random() {
    return Math.random();
}

function rogueV327GetRelic(id) {
    return ROGUELIKE_RELICS_V327.find(relic => relic.id === id) || null;
}

function rogueV327GetPlan(id) {
    return ROGUELIKE_ROOM_PLANS_V327.find(plan => plan.id === id) || ROGUELIKE_ROOM_PLANS_V327[0];
}

function rogueV327ResetRelicRuntime() {
    ROGUELIKE_V327.relics = [];
    ROGUELIKE_V327.relicOffers = [];
    ROGUELIKE_V327.roomOffers = [];
    ROGUELIKE_V327.selectedRelic = null;
    ROGUELIKE_V327.rerollsUsed = 0;
    ROGUELIKE_V327.appliedBonus = { bombs: 0, range: 0, speed: 0, maxHealth: 0 };
}

function rogueV327EnsureEconomyState() {
    if (!gameState) return;
    const current = rogueV327Num(gameState.coins, NaN);
    if (!Number.isFinite(current)) gameState.coins = 0;
    if (!gameState.roguelikeV327) {
        gameState.roguelikeV327 = {
            version: ROGUELIKE_V327_CONFIG.version,
            currentRoomPlan: 'standard',
            pendingRoomPlan: 'standard',
            relics: [],
            synergies: [],
            totalCoinsEarned: 0,
            totalCoinsSpent: 0
        };
    }
}

function rogueV327RefreshGameStateMirror() {
    rogueV327EnsureEconomyState();
    if (!gameState || !gameState.roguelikeV327) return;
    gameState.roguelikeV327.currentRoomPlan = ROGUELIKE_V327.currentRoomPlan;
    gameState.roguelikeV327.pendingRoomPlan = ROGUELIKE_V327.pendingRoomPlan;
    gameState.roguelikeV327.relics = ROGUELIKE_V327.relics.slice();
    gameState.roguelikeV327.synergies = rogueV327GetActiveSynergies().map(s => s.id);
}

function rogueV327GetCoins() {
    try {
        if (gameState && Number.isFinite(Number(gameState.coins))) return Math.max(0, Math.floor(Number(gameState.coins)));
    } catch (_) {}
    return 0;
}

function rogueV327SetCoins(value) {
    if (!gameState) return;
    gameState.coins = Math.max(0, Math.floor(rogueV327Num(value)));
    try {
        if (typeof updateUI === 'function') updateUI();
    } catch (_) {}
}

function rogueV327AddCoins(amount, source = 'other') {
    const base = Math.max(0, rogueV327Num(amount));
    if (base <= 0) return 0;

    const multiplier = 1 + rogueV327GetRelicBonuses().coinMultiplier;
    const finalAmount = Math.max(0, Math.round(base * multiplier));
    rogueV327SetCoins(rogueV327GetCoins() + finalAmount);

    if (gameState && gameState.roguelikeV327) {
        gameState.roguelikeV327.totalCoinsEarned += finalAmount;
    }

    if (source === 'block') ROGUELIKE_V327.coinStats.blocks += finalAmount;
    if (source === 'enemy') ROGUELIKE_V327.coinStats.enemies += finalAmount;
    if (source === 'room-clear') ROGUELIKE_V327.coinStats.roomClear += finalAmount;
    return finalAmount;
}

function rogueV327SpendCoins(amount, source = 'other') {
    const cost = Math.max(0, Math.floor(rogueV327Num(amount)));
    if (cost <= 0) return true;
    if (rogueV327GetCoins() < cost) return false;

    rogueV327SetCoins(rogueV327GetCoins() - cost);
    ROGUELIKE_V327.coinStats.rerolls += source === 'reroll' ? 1 : 0;
    if (gameState && gameState.roguelikeV327) gameState.roguelikeV327.totalCoinsSpent += cost;
    return true;
}

function rogueV327GetRelicBonuses() {
    const result = {
        bombs: 0,
        range: 0,
        speed: 0,
        maxHealth: 0,
        coinBlock: ROGUELIKE_V327_CONFIG.blockCoinBase,
        coinEnemy: ROGUELIKE_V327_CONFIG.enemyCoinBase,
        coinClear: 0,
        coinMultiplier: 0,
        fuseMs: 0,
        roomHeal: 0
    };

    for (const id of ROGUELIKE_V327.relics) {
        const relic = rogueV327GetRelic(id);
        if (!relic) continue;
        const b = relic.bonuses || {};
        for (const key of Object.keys(result)) result[key] += rogueV327Num(b[key]);
    }

    const counts = rogueV327GetTagCounts();
    for (const synergy of ROGUELIKE_SYNERGIES_V327) {
        if (!rogueV327ReqMet(counts, synergy.req)) continue;
        if (synergy.id === 'double_burn') result.range += 1;
        if (synergy.id === 'chain_crew') result.bombs += 1;
        if (synergy.id === 'merchant_route') result.coinMultiplier += 0.25;
        if (synergy.id === 'overclock') result.speed += 0.2;
        if (synergy.id === 'fortress') result.maxHealth += 1;
        if (synergy.id === 'volatile_chain') result.range += 1;
    }

    return result;
}

function rogueV327GetTagCounts() {
    const counts = {};
    for (const id of ROGUELIKE_V327.relics) {
        const relic = rogueV327GetRelic(id);
        if (!relic) continue;
        for (const tag of relic.tags || []) counts[tag] = (counts[tag] || 0) + 1;
    }
    return counts;
}

function rogueV327ReqMet(counts, req) {
    return Object.entries(req).every(([tag, needed]) => (counts[tag] || 0) >= needed);
}

function rogueV327GetActiveSynergies() {
    const counts = rogueV327GetTagCounts();
    return ROGUELIKE_SYNERGIES_V327.filter(synergy => rogueV327ReqMet(counts, synergy.req));
}

function rogueV327ApplyDerivedBonuses() {
    if (!player) return;
    const target = rogueV327GetRelicBonuses();
    const delta = {
        bombs: target.bombs - ROGUELIKE_V327.appliedBonus.bombs,
        range: target.range - ROGUELIKE_V327.appliedBonus.range,
        speed: target.speed - ROGUELIKE_V327.appliedBonus.speed,
        maxHealth: target.maxHealth - ROGUELIKE_V327.appliedBonus.maxHealth
    };

    if ('maxBombs' in player) player.maxBombs = Math.max(1, rogueV327Num(player.maxBombs, 1) + delta.bombs);
    if ('bombRange' in player) player.bombRange = Math.max(1, rogueV327Num(player.bombRange, 1) + delta.range);
    if ('speed' in player) player.speed = rogueV327Clamp(rogueV327Num(player.speed, 3) + delta.speed, 1, 7);

    if (delta.maxHealth !== 0) {
        if ('maxHealth' in player) player.maxHealth = Math.max(1, rogueV327Num(player.maxHealth, 1) + delta.maxHealth);
        else if ('maxHp' in player) player.maxHp = Math.max(1, rogueV327Num(player.maxHp, 1) + delta.maxHealth);

        const cap = 'maxHealth' in player ? player.maxHealth : player.maxHp;
        if (delta.maxHealth > 0 && 'health' in player) player.health = Math.min(cap, rogueV327Num(player.health) + delta.maxHealth);
        if ('health' in player) player.health = Math.max(1, Math.min(cap, rogueV327Num(player.health, cap)));
        if ('hp' in player) player.hp = Math.max(1, Math.min(cap, rogueV327Num(player.hp, cap)));
    }

    ROGUELIKE_V327.appliedBonus = target;
}

function rogueV327AcquireRelic(id) {
    const relic = rogueV327GetRelic(id);
    if (!relic) return false;
    if (ROGUELIKE_V327.relics.includes(id)) return false;
    if (ROGUELIKE_V327.relics.length >= ROGUELIKE_V327_CONFIG.maxRelics) return false;

    ROGUELIKE_V327.relics.push(id);
    ROGUELIKE_V327.selectedRelic = id;
    rogueV327ApplyDerivedBonuses();
    rogueV327RefreshGameStateMirror();
    try {
        const textColor = relic.rarity === 'rare' ? '#fca5a5' : relic.rarity === 'uncommon' ? '#93c5fd' : '#fde68a';
        if (typeof addFloatingText === 'function' && player) addFloatingText(`+ ${relic.name}`, player.x, player.y, textColor);
    } catch (_) {}
    return true;
}

function rogueV327RollRelicOffers(count = ROGUELIKE_V327_CONFIG.relicOfferCount, qualityBoost = 0) {
    const owned = new Set(ROGUELIKE_V327.relics);
    const candidates = ROGUELIKE_RELICS_V327.filter(relic => !owned.has(relic.id));
    if (!candidates.length) return [];

    const weighted = [];
    for (const relic of candidates) {
        let weight = relic.rarity === 'common' ? 8 : relic.rarity === 'uncommon' ? 4 : 1;
        if (qualityBoost > 0 && relic.rarity !== 'common') weight += qualityBoost * (relic.rarity === 'rare' ? 5 : 2);
        const tagCounts = rogueV327GetTagCounts();
        for (const tag of relic.tags || []) {
            if (tagCounts[tag] > 0) weight += 2 * Math.min(3, tagCounts[tag]);
        }
        weighted.push({ relic, weight });
    }

    const result = [];
    const pool = weighted.slice();
    const target = Math.min(count, pool.length);
    while (result.length < target && pool.length) {
        const total = pool.reduce((sum, item) => sum + item.weight, 0);
        let cursor = rogueV327Random() * total;
        let selectedIndex = 0;
        for (let i = 0; i < pool.length; i++) {
            cursor -= pool[i].weight;
            if (cursor <= 0) {
                selectedIndex = i;
                break;
            }
        }
        result.push(pool[selectedIndex].relic);
        pool.splice(selectedIndex, 1);
    }

    ROGUELIKE_V327.relicOffers = result.map(relic => relic.id);
    ROGUELIKE_V327.lastRelicOfferKey = result.map(relic => relic.id).join('|');
    return result;
}

function rogueV327RollRoomOffers(count = ROGUELIKE_V327_CONFIG.roomOfferCount) {
    const pool = ROGUELIKE_ROOM_PLANS_V327.slice();
    const result = [];
    const target = Math.min(count, pool.length);

    while (result.length < target && pool.length) {
        const index = Math.floor(rogueV327Random() * pool.length);
        result.push(pool.splice(index, 1)[0]);
    }

    // Evitamos una pantalla donde no exista la opción estándar.
    if (result.length && !result.some(plan => plan.id === 'standard')) {
        const standard = rogueV327GetPlan('standard');
        result[result.length - 1] = standard;
    }

    ROGUELIKE_V327.roomOffers = result;
    ROGUELIKE_V327.pendingRoomPlan = result[0]?.id || 'standard';
    ROGUELIKE_V327.lastRoomOfferKey = result.map(plan => plan.id).join('|');
    rogueV327RefreshGameStateMirror();
    return result;
}

function rogueV327ChooseRoomPlan(id) {
    const plan = rogueV327GetPlan(id);
    if (ROGUELIKE_V327.roomOffers.length && !ROGUELIKE_V327.roomOffers.some(item => item.id === plan.id)) return false;
    ROGUELIKE_V327.pendingRoomPlan = plan.id;
    rogueV327RefreshGameStateMirror();
    rogueV327RenderStrategyPanel();
    return true;
}

function rogueV327ApplyRoomPlan() {
    const plan = rogueV327GetPlan(ROGUELIKE_V327.pendingRoomPlan);
    ROGUELIKE_V327.currentRoomPlan = plan.id;
    ROGUELIKE_V327.pendingRoomPlan = 'standard';

    rogueV327EnsureEconomyState();
    if (gameState && gameState.roguelikeV327) gameState.roguelikeV327.currentRoomPlan = plan.id;

    if (plan.startCoins > 0) rogueV327AddCoins(plan.startCoins, 'room-start');

    const extraHeal = plan.id === 'shrine' ? ROGUELIKE_V327_CONFIG.shrineHeal : 0;
    const relicHeal = rogueV327GetRelicBonuses().roomHeal;
    const heal = extraHeal + relicHeal;
    if (heal > 0) rogueV327HealPlayer(heal);

    if (plan.id === 'elite') rogueV327SpawnExtraEnemy();

    rogueV327RefreshGameStateMirror();
    rogueV327UpdateRoomBanner(plan);
}

function rogueV327HealPlayer(amount) {
    if (!player || amount <= 0) return;
    const cap = 'maxHealth' in player ? player.maxHealth : ('maxHp' in player ? player.maxHp : undefined);
    if ('health' in player) player.health = cap ? Math.min(cap, rogueV327Num(player.health) + amount) : rogueV327Num(player.health) + amount;
    if ('hp' in player && !('health' in player)) player.hp = cap ? Math.min(cap, rogueV327Num(player.hp) + amount) : rogueV327Num(player.hp) + amount;
    try {
        if (typeof updateUI === 'function') updateUI();
    } catch (_) {}
}

function rogueV327SpawnExtraEnemy() {
    try {
        if (!gameState || !Array.isArray(gameState.enemies) || !Array.isArray(gameState.grid)) return;
        if (!gameState.enemies.length) return;
        const template = gameState.enemies[0];
        const width = gameState.gridWidth || gameState.grid[0]?.length || 15;
        const height = gameState.gridHeight || gameState.grid.length || 15;
        let spot = null;

        for (let attempts = 0; attempts < 80 && !spot; attempts++) {
            const gx = 1 + Math.floor(rogueV327Random() * Math.max(1, width - 2));
            const gy = 1 + Math.floor(rogueV327Random() * Math.max(1, height - 2));
            const tile = gameState.grid[gy] && gameState.grid[gy][gx];
            if (tile !== 0 && tile !== 'EMPTY') continue;
            if (player) {
                const px = Math.floor((rogueV327Num(player.x) + rogueV327Num(player.width, 24) / 2) / rogueV327Num(window.TILE_SIZE, 48));
                const py = Math.floor((rogueV327Num(player.y) + rogueV327Num(player.height, 24) / 2) / rogueV327Num(window.TILE_SIZE, 48));
                if (Math.abs(gx - px) + Math.abs(gy - py) < 5) continue;
            }
            spot = { gx, gy };
        }

        if (!spot) return;
        const clone = { ...template };
        const tileSize = rogueV327Num(window.TILE_SIZE, 48);
        clone.x = spot.gx * tileSize + tileSize / 2;
        clone.y = spot.gy * tileSize + tileSize / 2;
        clone.vx = rogueV327Num(template.vx, 1);
        clone.vy = 0;
        clone.changeTimer = 20;
        gameState.enemies.push(clone);
    } catch (_) {}
}

function rogueV327RewardRoomClear() {
    const current = rogueV327GetPlan(ROGUELIKE_V327.currentRoomPlan);
    const bonuses = rogueV327GetRelicBonuses();
    const amount = ROGUELIKE_V327_CONFIG.roomClearBaseCoins + current.clearBonus + bonuses.coinClear;
    const gained = rogueV327AddCoins(amount, 'room-clear');
    return gained;
}

function rogueV327HandleExplosionEconomy(beforeState) {
    try {
        if (!gameState) return;

        const afterBlocks = Number.isFinite(Number(gameState.blocksBroken)) ? Number(gameState.blocksBroken) : null;
        const blockDelta = afterBlocks !== null && beforeState.blocksBroken !== null
            ? Math.max(0, afterBlocks - beforeState.blocksBroken)
            : 0;
        const enemyDelta = beforeState.enemyCount - (Array.isArray(gameState.enemies) ? gameState.enemies.length : beforeState.enemyCount);

        const coinsAfterOriginal = rogueV327GetCoins();
        const existingCoinGain = Math.max(0, coinsAfterOriginal - beforeState.coins);
        const bonuses = rogueV327GetRelicBonuses();

        // No duplicamos la economía base de la versión anterior.
        // Solo añadimos el bonus propio de v3.27 y el porcentaje derivado de reliquias.
        const relicBonusCoins = Math.round(existingCoinGain * bonuses.coinMultiplier);
        const salvageCoins = Math.max(0, Math.floor(blockDelta * bonuses.coinBlock));
        const bountyCoins = Math.max(0, Math.floor(enemyDelta * bonuses.coinEnemy));
        const extra = relicBonusCoins + salvageCoins + bountyCoins;

        if (extra > 0) {
            rogueV327SetCoins(coinsAfterOriginal + extra);
            if (gameState.roguelikeV327) gameState.roguelikeV327.totalCoinsEarned += extra;
            ROGUELIKE_V327.coinStats.blocks += salvageCoins;
            ROGUELIKE_V327.coinStats.enemies += bountyCoins;
            if (typeof addFloatingText === 'function' && player) {
                addFloatingText(`+${extra}¢`, player.x, player.y, '#fbbf24');
            }
        }
    } catch (_) {}
}

function rogueV327EnhanceRewardScreen() {
    if (!document) return;
    const screen = document.getElementById('level-complete-screen');
    const legacyOptions = document.getElementById('upgrade-options');
    if (!screen || !legacyOptions) return;

    let panel = document.getElementById('rogue-v327-strategy');
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'rogue-v327-strategy';
        panel.className = 'rogue-v327-strategy';
        screen.insertBefore(panel, legacyOptions);
    }

    if (!ROGUELIKE_V327.roomOffers.length) rogueV327RollRoomOffers();
    const relicQuality = rogueV327GetPlan(ROGUELIKE_V327.pendingRoomPlan).relicQualityBoost;
    if (!ROGUELIKE_V327.relicOffers.length) rogueV327RollRelicOffers(ROGUELIKE_V327_CONFIG.relicOfferCount, relicQuality);
    rogueV327RenderStrategyPanel();

    const previousHandlers = new WeakMap();
    Array.from(legacyOptions.children).forEach(card => {
        if (!card || previousHandlers.has(card)) return;
        const oldHandler = card.onclick;
        if (typeof oldHandler !== 'function') return;
        previousHandlers.set(card, oldHandler);
        card.onclick = event => {
            rogueV327CommitRewardChoice();
            return oldHandler.call(card, event);
        };
    });
}

function rogueV327CommitRewardChoice() {
    if (ROGUELIKE_V327.selectedRelic) rogueV327AcquireRelic(ROGUELIKE_V327.selectedRelic);
    else if (ROGUELIKE_V327.relicOffers[0]) {
        rogueV327AcquireRelic(ROGUELIKE_V327.relicOffers[0]);
    }

    ROGUELIKE_V327.currentRoomPlan = rogueV327GetPlan(ROGUELIKE_V327.pendingRoomPlan).id;
    rogueV327RefreshGameStateMirror();
}

function rogueV327RenderStrategyPanel() {
    if (!document) return;
    const panel = document.getElementById('rogue-v327-strategy');
    if (!panel) return;

    const coins = rogueV327GetCoins();
    const pending = rogueV327GetPlan(ROGUELIKE_V327.pendingRoomPlan);
    const activeSynergies = rogueV327GetActiveSynergies();

    panel.innerHTML = `
        <div class="rogue-v327-head">
            <div>
                <div class="rogue-v327-kicker">DECISIONES DE RUN</div>
                <div class="rogue-v327-sub">Ruta + reliquia + mejora</div>
            </div>
            <div class="rogue-v327-wallet">¢ ${coins}</div>
        </div>
        <div class="rogue-v327-section-title">RUTA SIGUIENTE</div>
        <div class="rogue-v327-room-grid">
            ${ROGUELIKE_V327.roomOffers.map(plan => `
                <button type="button" class="rogue-v327-room-card ${plan.id === pending.id ? 'is-selected' : ''}" data-room-v327="${plan.id}">
                    <span class="rogue-v327-card-icon">${plan.icon}</span>
                    <span class="rogue-v327-card-title">${plan.name}</span>
                    <span class="rogue-v327-card-desc">${plan.desc}</span>
                    <span class="rogue-v327-risk risk-${plan.risk}">${plan.risk}</span>
                </button>
            `).join('')}
        </div>
        <div class="rogue-v327-section-row">
            <div class="rogue-v327-section-title">RELIQUIA · ELEGÍ 1</div>
            <button type="button" id="rogue-v327-reroll" class="rogue-v327-reroll" ${ROGUELIKE_V327.rerollsUsed > 0 || coins < ROGUELIKE_V327_CONFIG.rerollCost ? 'disabled' : ''}>
                ${ROGUELIKE_V327.rerollsUsed > 0 ? 'REROLL USADO' : `REROLL · ${ROGUELIKE_V327_CONFIG.rerollCost}¢`}
            </button>
        </div>
        <div class="rogue-v327-relic-grid">
            ${ROGUELIKE_V327.relicOffers.map(id => {
                const relic = rogueV327GetRelic(id);
                if (!relic) return '';
                const selected = ROGUELIKE_V327.selectedRelic === relic.id;
                return `
                    <button type="button" class="rogue-v327-relic-card rarity-${relic.rarity} ${selected ? 'is-selected' : ''}" data-relic-v327="${relic.id}">
                        <span class="rogue-v327-card-icon">${relic.icon}</span>
                        <span class="rogue-v327-card-title">${relic.name}</span>
                        <span class="rogue-v327-rarity">${relic.rarity}</span>
                        <span class="rogue-v327-card-desc">${relic.desc}</span>
                    </button>
                `;
            }).join('')}
        </div>
        <div class="rogue-v327-synergy-line">
            <span class="rogue-v327-section-title">CONSTRUCCIÓN</span>
            <div class="rogue-v327-synergy-list">
                ${Object.entries(rogueV327GetTagCounts()).map(([tag, count]) => `<span class="rogue-v327-synergy-chip">${tag} ×${count}</span>`).join('') || '<span class="rogue-v327-empty">Todavía no hay una construcción marcada.</span>'}
            </div>
            <span class="rogue-v327-section-title">SINERGIAS ACTIVAS</span>
            <div class="rogue-v327-synergy-list">
                ${activeSynergies.length ? activeSynergies.map(s => `<span class="rogue-v327-synergy-chip">${s.name} · ${s.desc}</span>`).join('') : '<span class="rogue-v327-empty">Todavía no hay sinergias activas.</span>'}
            </div>
        </div>
        <div class="rogue-v327-note">La ruta se aplica al entrar a la próxima sala. El reroll consume monedas, no reliquias.</div>
    `;

    panel.querySelectorAll('[data-room-v327]').forEach(button => {
        button.addEventListener('click', () => rogueV327ChooseRoomPlan(button.dataset.roomV327));
    });
    panel.querySelectorAll('[data-relic-v327]').forEach(button => {
        button.addEventListener('click', () => {
            ROGUELIKE_V327.selectedRelic = button.dataset.relicV327;
            rogueV327RenderStrategyPanel();
        });
    });

    const reroll = document.getElementById('rogue-v327-reroll');
    if (reroll) reroll.addEventListener('click', rogueV327RerollRelics);
}

function rogueV327RerollRelics() {
    if (ROGUELIKE_V327.rerollsUsed > 0) return;
    if (!rogueV327SpendCoins(ROGUELIKE_V327_CONFIG.rerollCost, 'reroll')) return;

    ROGUELIKE_V327.rerollsUsed = 1;
    ROGUELIKE_V327.selectedRelic = null;
    const qualityBoost = rogueV327GetPlan(ROGUELIKE_V327.pendingRoomPlan).relicQualityBoost;
    rogueV327RollRelicOffers(ROGUELIKE_V327_CONFIG.relicOfferCount, qualityBoost);
    rogueV327RenderStrategyPanel();
}

function rogueV327UpdateRoomBanner(plan = rogueV327GetPlan(ROGUELIKE_V327.currentRoomPlan)) {
    try {
        const el = document.getElementById('room-banner');
        if (!el) return;
        el.textContent = `◆ ${plan.name} · ${plan.desc}`;
    } catch (_) {}
}

function rogueV327UpdateRelicHUD() {
    try {
        const el = document.getElementById('ui-relics');
        if (!el) return;
        const legacy = gameState && Array.isArray(gameState.relics) ? gameState.relics.length : 0;
        el.textContent = String(legacy + ROGUELIKE_V327.relics.length);
    } catch (_) {}
}

function rogueV327RenderDeathRelics() {
    try {
        const list = document.getElementById('go-relic-list');
        const count = document.getElementById('go-relics');
        if (!list) return;
        const relics = ROGUELIKE_V327.relics.map(rogueV327GetRelic).filter(Boolean);
        if (count) count.textContent = String(relics.length);
        list.innerHTML = relics.length
            ? relics.map(relic => `<div class="death-relic-item"><span>${relic.icon}</span><strong>${relic.name}</strong><small>${relic.desc}</small></div>`).join('')
            : '<div class="death-relic-item"><small>No conseguiste reliquias v3.27 en esta run.</small></div>';
    } catch (_) {}
}

function rogueV327Install() {
    if (ROGUELIKE_V327.installed) return true;
    if (typeof gameState === 'undefined' || typeof player === 'undefined') return false;
    if (typeof updateUI !== 'function' || typeof startGame !== 'function' || typeof initLevel !== 'function') return false;

    rogueV327EnsureEconomyState();

    ROGUELIKE_V327.original.updateUI = updateUI;
    ROGUELIKE_V327.original.startGame = startGame;
    ROGUELIKE_V327.original.initLevel = initLevel;
    ROGUELIKE_V327.original.completeLevel = typeof completeLevel === 'function' ? completeLevel : null;
    ROGUELIKE_V327.original.explodeBomb = typeof explodeBomb === 'function' ? explodeBomb : null;
    ROGUELIKE_V327.original.placeBomb = typeof placeBomb === 'function' ? placeBomb : null;
    ROGUELIKE_V327.original.gameOver = typeof gameOver === 'function' ? gameOver : null;

    window.updateUI = function updateUIV327(...args) {
        const result = ROGUELIKE_V327.original.updateUI(...args);
        rogueV327UpdateRelicHUD();
        return result;
    };

    window.startGame = function startGameV327(...args) {
        rogueV327ResetRelicRuntime();
        ROGUELIKE_V327.runActive = true;
        ROGUELIKE_V327.currentRoomPlan = 'standard';
        ROGUELIKE_V327.pendingRoomPlan = 'standard';
        ROGUELIKE_V327.roomOffers = [];
        ROGUELIKE_V327.coinStats = { blocks: 0, enemies: 0, roomClear: 0, rerolls: 0 };

        const result = ROGUELIKE_V327.original.startGame(...args);
        rogueV327EnsureEconomyState();
        gameState.roguelikeV327.currentRoomPlan = 'standard';
        gameState.roguelikeV327.pendingRoomPlan = 'standard';
        rogueV327ApplyDerivedBonuses();
        rogueV327RefreshGameStateMirror();
        return result;
    };

    window.initLevel = function initLevelV327(...args) {
        const result = ROGUELIKE_V327.original.initLevel(...args);
        rogueV327EnsureEconomyState();
        rogueV327ApplyDerivedBonuses();
        rogueV327ApplyRoomPlan();
        return result;
    };

    if (ROGUELIKE_V327.original.completeLevel) {
        window.completeLevel = function completeLevelV327(...args) {
            if (!ROGUELIKE_V327.runActive) ROGUELIKE_V327.runActive = true;
            rogueV327RewardRoomClear();
            ROGUELIKE_V327.rerollsUsed = 0;
            ROGUELIKE_V327.selectedRelic = null;
            rogueV327RollRoomOffers();
            const qualityBoost = rogueV327GetPlan(ROGUELIKE_V327.pendingRoomPlan).relicQualityBoost;
            rogueV327RollRelicOffers(ROGUELIKE_V327_CONFIG.relicOfferCount, qualityBoost);

            const result = ROGUELIKE_V327.original.completeLevel(...args);
            rogueV327EnhanceRewardScreen();
            rogueV327RefreshGameStateMirror();
            rogueV327UpdateRelicHUD();
            return result;
        };
    }

    if (ROGUELIKE_V327.original.explodeBomb) {
        window.explodeBomb = function explodeBombV327(...args) {
            const beforeState = {
                blocksBroken: Number.isFinite(Number(gameState && gameState.blocksBroken)) ? Number(gameState.blocksBroken) : null,
                enemyCount: Array.isArray(gameState && gameState.enemies) ? gameState.enemies.length : 0,
                coins: rogueV327GetCoins()
            };
            const result = ROGUELIKE_V327.original.explodeBomb(...args);
            rogueV327HandleExplosionEconomy(beforeState);
            return result;
        };
    }

    if (ROGUELIKE_V327.original.placeBomb) {
        window.placeBomb = function placeBombV327(...args) {
            const before = Array.isArray(gameState && gameState.bombs) ? gameState.bombs.length : 0;
            const result = ROGUELIKE_V327.original.placeBomb(...args);
            const afterBombs = Array.isArray(gameState && gameState.bombs) ? gameState.bombs : [];
            const fuseReduction = Math.max(0, -rogueV327GetRelicBonuses().fuseMs);
            if (fuseReduction > 0 && afterBombs.length > before) {
                for (let i = before; i < afterBombs.length; i++) {
                    afterBombs[i].timer = Math.max(
                        ROGUELIKE_V327_CONFIG.minBombFuseMs,
                        rogueV327Num(afterBombs[i].timer, 2000) - fuseReduction
                    );
                }
            }
            return result;
        };
    }

    if (ROGUELIKE_V327.original.gameOver) {
        window.gameOver = function gameOverV327(...args) {
            const result = ROGUELIKE_V327.original.gameOver(...args);
            rogueV327RenderDeathRelics();
            ROGUELIKE_V327.runActive = false;
            return result;
        };
    }

    rogueV327UpdateRoomBanner();
    ROGUELIKE_V327.installed = true;
    rogueV327UpdateRelicHUD();
    return true;
}

function rogueV327Bootstrap() {
    if (typeof document !== 'undefined') rogueV327InstallStyles();
    if (rogueV327Install()) return;
    setTimeout(rogueV327Bootstrap, 50);
}

function rogueV327InstallStyles() {
    if (document.getElementById('rogue-v327-styles')) return;
    const style = document.createElement('style');
    style.id = 'rogue-v327-styles';
    style.textContent = `
        #level-complete-screen { gap: 7px; }
        .rogue-v327-strategy { width: min(100%, 540px); max-height: 420px; overflow: hidden; text-align: left; }
        .rogue-v327-head { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:6px 8px; border:1px solid rgba(255,255,255,.10); background:rgba(15,23,42,.62); border-radius:8px; }
        .rogue-v327-kicker { font: 9px 'Press Start 2P', cursive; color:#c4b5fd; letter-spacing:.04em; }
        .rogue-v327-sub { margin-top:4px; font: 9px Inter, sans-serif; color:#94a3b8; }
        .rogue-v327-wallet { min-width:64px; padding:7px 9px; border-radius:7px; background:rgba(245,158,11,.13); border:1px solid rgba(245,158,11,.28); color:#fde68a; font:11px 'Press Start 2P', cursive; text-align:center; }
        .rogue-v327-section-title { font: 8px 'Press Start 2P', cursive; color:#cbd5e1; margin:7px 0 5px; }
        .rogue-v327-room-grid, .rogue-v327-relic-grid { display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:5px; }
        .rogue-v327-relic-grid { grid-template-columns: repeat(3, minmax(0,1fr)); }
        .rogue-v327-room-card, .rogue-v327-relic-card { min-width:0; padding:6px; border:1px solid rgba(255,255,255,.10); border-radius:8px; background:rgba(30,41,59,.82); color:#fff; text-align:left; cursor:pointer; display:flex; flex-direction:column; gap:3px; }
        .rogue-v327-room-card:hover, .rogue-v327-relic-card:hover { border-color:rgba(148,163,184,.45); }
        .rogue-v327-room-card.is-selected, .rogue-v327-relic-card.is-selected { border-color:#facc15; box-shadow:0 0 0 1px rgba(250,204,21,.25) inset; background:rgba(120,53,15,.18); }
        .rogue-v327-card-icon { font-size:15px; line-height:1; }
        .rogue-v327-card-title { font: 8px 'Press Start 2P', cursive; line-height:1.3; color:#f8fafc; }
        .rogue-v327-card-desc { font: 9px Inter, sans-serif; color:#cbd5e1; line-height:1.25; }
        .rogue-v327-risk { font: 8px 'Press Start 2P', cursive; text-transform:uppercase; color:#94a3b8; }
        .risk-bajo { color:#86efac; }
        .risk-normal { color:#cbd5e1; }
        .risk-alto { color:#fca5a5; }
        .rogue-v327-section-row { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:3px; }
        .rogue-v327-reroll { border:1px solid rgba(59,130,246,.38); background:rgba(30,64,175,.25); color:#bfdbfe; border-radius:6px; padding:5px 7px; font:8px 'Press Start 2P', cursive; cursor:pointer; }
        .rogue-v327-reroll:disabled { opacity:.42; cursor:default; }
        .rogue-v327-rarity { font: 8px 'Press Start 2P', cursive; text-transform:uppercase; color:#94a3b8; }
        .rarity-uncommon .rogue-v327-rarity { color:#93c5fd; }
        .rarity-rare .rogue-v327-rarity { color:#fca5a5; }
        .rogue-v327-synergy-line { margin-top:5px; padding:5px 7px; border:1px solid rgba(167,139,250,.18); border-radius:7px; background:rgba(91,33,182,.10); }
        .rogue-v327-synergy-line .rogue-v327-section-title { margin:0 0 4px; }
        .rogue-v327-synergy-list { display:flex; flex-wrap:wrap; gap:4px; }
        .rogue-v327-synergy-chip { padding:3px 5px; border-radius:999px; background:rgba(139,92,246,.16); border:1px solid rgba(167,139,250,.25); color:#ddd6fe; font:8px Inter, sans-serif; }
        .rogue-v327-empty { color:#94a3b8; font:9px Inter, sans-serif; }
        .rogue-v327-note { margin-top:5px; color:#64748b; font:8px Inter, sans-serif; }
        .death-relic-item { display:grid; grid-template-columns:auto 1fr; column-gap:7px; row-gap:1px; padding:5px 0; border-bottom:1px solid rgba(255,255,255,.06); }
        .death-relic-item span { grid-row:span 2; }
        .death-relic-item strong { font-size:9px; }
        .death-relic-item small { color:#94a3b8; font-size:8px; }
        @media (max-width: 520px) {
            .rogue-v327-room-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
            .rogue-v327-relic-grid { grid-template-columns: 1fr; }
            .rogue-v327-strategy { max-height: 360px; }
        }
    `;
    document.head.appendChild(style);
}

window.ROGUELIKE_V327_CONFIG = ROGUELIKE_V327_CONFIG;
window.ROGUELIKE_RELICS_V327 = ROGUELIKE_RELICS_V327;
window.ROGUELIKE_ROOM_PLANS_V327 = ROGUELIKE_ROOM_PLANS_V327;
window.ROGUELIKE_SYNERGIES_V327 = ROGUELIKE_SYNERGIES_V327;
window.ROGUELIKE_V327 = ROGUELIKE_V327;
window.rogueV327GetRelicBonuses = rogueV327GetRelicBonuses;
window.rogueV327GetActiveSynergies = rogueV327GetActiveSynergies;
window.rogueV327RollRelicOffers = rogueV327RollRelicOffers;
window.rogueV327AcquireRelic = rogueV327AcquireRelic;
window.rogueV327ChooseRoomPlan = rogueV327ChooseRoomPlan;
window.rogueV327RollRoomOffers = rogueV327RollRoomOffers;
window.rogueV327AddCoins = rogueV327AddCoins;
window.rogueV327SpendCoins = rogueV327SpendCoins;

rogueV327Bootstrap();
