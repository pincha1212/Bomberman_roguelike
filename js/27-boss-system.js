/*
 * BOMBERMAN ROGUELIKE v4.1
 * Boss Bomb System
 *
 * Boss attacks are deliberately reduced to the game's core fantasy:
 * - throw bombs to random valid cells;
 * - ground slam to create a wide bomb-style explosion.
 *
 * No boss projectiles, no charge attack, no enemy summoning.
 */

const BOSS_V41_CONFIG = Object.freeze({
    enabled: true,
    phaseThresholds: Object.freeze({ phase2: 0.66, phase3: 0.33 }),
    telegraphMs: 520,
    bossBombCap: 6,
    bombFuseMs: 2100,
    bombMoveMs: 420,
    bombArcPx: 22,
    bombThrowCount: Object.freeze({ 1: 1, 2: 2, 3: 3 }),
    bombIntervalMs: Object.freeze({ phase1: 2700, phase2: 2150, phase3: 1700 }),
    bombRange: Object.freeze({ phase1: 2, phase2: 3, phase3: 4 }),
    bombMinFromPlayer: 3,
    bombMinFromBoss: 2,
    slamIntervalMs: Object.freeze({ phase1: 5200, phase2: 4300, phase3: 3400 }),
    slamRange: Object.freeze({ phase1: 5, phase2: 6, phase3: 7 }),
    phaseSpeedMultiplier: Object.freeze({ 1: 1.00, 2: 1.08, 3: 1.16 })
});

const BossV41 = {
    state: null,
    originalUpdate: null,
    originalDraw: null,
    originalInitLevel: null,
    originalStartGame: null,
    installed: false,
    updateWrapped: false,
    drawWrapped: false,
    initWrapped: false,
    startWrapped: false
};

function bossV41HealthRatio(boss) {
    if (!boss || boss.defeated) return 0;
    const hp = Number.isFinite(boss.health) ? boss.health : boss.hp;
    const max = Number.isFinite(boss.maxHealth) ? boss.maxHealth : boss.maxHp;
    if (!Number.isFinite(hp) || !Number.isFinite(max) || max <= 0) return 1;
    return Math.max(0, Math.min(1, hp / max));
}

function bossV41GetPhase(boss) {
    const ratio = bossV41HealthRatio(boss);
    if (ratio <= BOSS_V41_CONFIG.phaseThresholds.phase3) return 3;
    if (ratio <= BOSS_V41_CONFIG.phaseThresholds.phase2) return 2;
    return 1;
}

function bossV41GetPosition(boss) {
    if (!boss) return null;
    const x = Number.isFinite(boss.x) ? boss.x : (Number.isFinite(boss.cx) ? boss.cx : null);
    const y = Number.isFinite(boss.y) ? boss.y : (Number.isFinite(boss.cy) ? boss.cy : null);
    return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

function bossV41EnsureState() {
    if (!BossV41.state) BossV41.state = bossV41CreateState();
    return BossV41.state;
}

function bossV41CreateState() {
    return {
        lastBossRef: null,
        phase: 1,
        pattern: 'bomb-throw',
        patternTimer: 0,
        bombTimer: 0,
        slamTimer: 0,
        telegraphTimer: 0,
        pendingAttack: null,
        telegraphKind: null,
        patternCount: 0,
        phaseTransitions: 0,
        bombShotsFired: 0,
        slamCount: 0,
        lastBombTarget: null,
        active: false,
        lastAttack: 'bomb-throw'
    };
}

function bossV41Reset() {
    BossV41.state = bossV41CreateState();
    try {
        gameState.bossProjectilesV325 = [];
        gameState.bossProjectiles = [];
    } catch (_) {}
}

function bossV41IsActive() {
    try {
        return !!(gameState && gameState.isPlaying && gameState.boss && !gameState.boss.defeated);
    } catch (_) {
        return false;
    }
}

function bossV41SetHUD(boss, phase) {
    const phaseEl = document.getElementById('boss-phase');
    const barEl = document.getElementById('boss-bar');
    const hudEl = document.getElementById('boss-hud');
    if (phaseEl) phaseEl.textContent = `FASE ${phase}`;
    if (barEl) barEl.style.width = `${Math.round(bossV41HealthRatio(boss) * 100)}%`;
    if (hudEl) hudEl.classList.toggle('hidden', !bossV41IsActive());
    const badge = document.getElementById('ui-boss-bombs');
    if (badge) {
        const count = bossV4BombCount();
        badge.classList.toggle('hidden', !bossV41IsActive());
        const value = badge.querySelector('span');
        if (value) value.textContent = String(count);
    }
}

function bossV4BombCount() {
    try {
        return Array.isArray(gameState.bombs) ? gameState.bombs.filter(b => b && b.owner === 'boss').length : 0;
    } catch (_) { return 0; }
}

function bossV41IsBombTargetValid(x, y, bossCell, playerCell) {
    if (x <= 0 || y <= 0 || x >= gameState.gridWidth - 1 || y >= gameState.gridHeight - 1) return false;
    if (gameState.grid?.[y]?.[x] !== TYPES.EMPTY) return false;
    if (Array.isArray(gameState.bombs) && gameState.bombs.some(b => b && b.x === x && b.y === y)) return false;
    if (Math.abs(x - bossCell.x) + Math.abs(y - bossCell.y) < BOSS_V41_CONFIG.bombMinFromBoss) return false;
    if (Math.abs(x - playerCell.x) + Math.abs(y - playerCell.y) < BOSS_V41_CONFIG.bombMinFromPlayer) return false;
    return true;
}

function bossV41FindBombTarget() {
    const boss = gameState.boss;
    if (!boss || !player) return null;
    const bx = Math.floor(boss.x / TILE_SIZE);
    const by = Math.floor(boss.y / TILE_SIZE);
    const px = Math.floor((player.x + player.width / 2) / TILE_SIZE);
    const py = Math.floor((player.y + player.height / 2) / TILE_SIZE);
    const bossCell = { x: bx, y: by };
    const playerCell = { x: px, y: py };

    // 64 intentos aleatorios: el boss apunta al mapa, no al jugador.
    for (let attempt = 0; attempt < 64; attempt++) {
        const x = 1 + Math.floor(Math.random() * Math.max(1, gameState.gridWidth - 2));
        const y = 1 + Math.floor(Math.random() * Math.max(1, gameState.gridHeight - 2));
        if (bossV41IsBombTargetValid(x, y, bossCell, playerCell)) return { x, y };
    }

    // Fallback acotado por anillos; solo ocurre cuando el mapa está cargado.
    for (let radius = 3; radius <= Math.max(gameState.gridWidth, gameState.gridHeight); radius++) {
        for (let y = 1; y < gameState.gridHeight - 1; y++) {
            for (let x = 1; x < gameState.gridWidth - 1; x++) {
                if (Math.abs(x - bx) + Math.abs(y - by) < radius) continue;
                if (bossV41IsBombTargetValid(x, y, bossCell, playerCell)) return { x, y };
            }
        }
    }
    return null;
}

function bossV41SpawnBomb() {
    const state = bossV41EnsureState();
    if (!bossV41IsActive()) return false;
    if (bossV4BombCount() >= BOSS_V41_CONFIG.bossBombCap) return false;
    const target = bossV41FindBombTarget();
    if (!target) return false;
    const boss = gameState.boss;
    const range = BOSS_V41_CONFIG.bombRange[`phase${state.phase}`] || 2;
    const bomb = {
        id: `boss-bomb-${gameState.animFrame}-${Math.random().toString(36).slice(2, 6)}`,
        owner: 'boss',
        bombType: 'boss-throw',
        x: target.x,
        y: target.y,
        range,
        timer: BOSS_V41_CONFIG.bombFuseMs,
        fuseTotal: BOSS_V41_CONFIG.bombFuseMs,
        warnBucket: Math.ceil(BOSS_V41_CONFIG.bombFuseMs / 300),
        scalePulse: 1,
        playerPassThrough: true,
        justArmed: false,
        placedAtFrame: gameState.animFrame,
        placementReason: 'boss-throw',
        countsTowardPlayerCapacity: false,
        state: BOMB_V4_STATES.MOVING,
        motionState: BOMB_V4_STATES.MOVING,
        worldX: boss.x,
        worldY: boss.y,
        motionProgress: 0,
        motionTimer: BOSS_V41_CONFIG.bombMoveMs,
        motionDuration: BOSS_V41_CONFIG.bombMoveMs,
        motionStartX: boss.x,
        motionStartY: boss.y,
        motionTargetX: (target.x + 0.5) * TILE_SIZE,
        motionTargetY: (target.y + 0.5) * TILE_SIZE,
        motionArc: BOSS_V41_CONFIG.bombArcPx,
        motionRotation: 0,
        motionRotationSpeed: 0.22,
        bobPhase: 0,
        canCarry: false,
        carriedBy: null
    };
    if (typeof ensureBombV4State === 'function') ensureBombV4State(bomb);
    gameState.bombs.push(bomb);
    state.bombShotsFired += 1;
    state.lastBombTarget = { ...target };
    return true;
}

function bossV41FireBombVolley() {
    const state = bossV41EnsureState();
    const count = Number(BOSS_V41_CONFIG.bombThrowCount[state.phase] || 1);
    let spawned = 0;
    for (let i = 0; i < count; i++) if (bossV41SpawnBomb()) spawned++;
    state.lastAttack = 'bomb-throw';
    state.pattern = 'bomb-throw';
    return spawned;
}

function bossV41BuildSlamBomb() {
    const boss = gameState.boss;
    const centerX = Math.max(1, Math.min(gameState.gridWidth - 2, Math.floor(boss.x / TILE_SIZE)));
    const centerY = Math.max(1, Math.min(gameState.gridHeight - 2, Math.floor(boss.y / TILE_SIZE)));
    return {
        id: `boss-slam-${gameState.animFrame}`,
        owner: 'boss',
        bombType: 'boss-slam',
        x: centerX,
        y: centerY,
        range: BOSS_V41_CONFIG.slamRange[`phase${BossV41.state?.phase || 1}`] || 5,
        timer: 0,
        fuseTotal: 0,
        playerPassThrough: false,
        countsTowardPlayerCapacity: false,
        state: BOMB_V4_STATES.ARMED,
        motionState: 'idle',
        worldX: (centerX + 0.5) * TILE_SIZE,
        worldY: (centerY + 0.5) * TILE_SIZE,
        motionProgress: 1,
        motionTimer: 0,
        motionDuration: 0,
    };
}

function bossV41GroundSlam() {
    if (!bossV41IsActive() || typeof explodeBomb !== 'function') return 0;
    const boss = gameState.boss;
    const state = bossV41EnsureState();
    const slamBomb = bossV41BuildSlamBomb();
    gameState.bombs.push(slamBomb);
    const index = gameState.bombs.length - 1;
    const range = slamBomb.range;
    explodeBomb(index);
    state.slamCount += 1;
    state.lastAttack = 'ground-slam';
    state.pattern = 'ground-slam';
    addFloatingText('¡APLASTAMIENTO!', boss.x, boss.y - boss.height * 0.58, '#facc15');
    triggerScreenShake(10, 360);
    if (typeof sfx === 'function') sfx('boss');
    return range;
}

function bossV41ApplyPhase(boss, phase) {
    const state = bossV41EnsureState();
    if (state.lastBossRef !== boss) {
        state.lastBossRef = boss;
        state.phase = phase;
        state.patternTimer = 0;
        state.bombTimer = 0;
        state.slamTimer = BOSS_V41_CONFIG.slamIntervalMs[`phase${phase}`] * 0.55;
        state.telegraphTimer = 0;
        state.telegraphKind = null;
        state.pendingAttack = null;
        state.patternCount = 0;
        state.bombShotsFired = 0;
        state.slamCount = 0;
        state.lastBombTarget = null;
        state.active = true;
    }
    if (state.phase !== phase) {
        state.phase = phase;
        state.phaseTransitions += 1;
        state.patternTimer = 0;
        state.bombTimer = 0;
        state.pendingAttack = null;
        state.slamTimer = BOSS_V41_CONFIG.slamIntervalMs[`phase${phase}`] * 0.55;
    }
    boss.phase = phase;
    boss.bossPhase = phase;
    boss.phaseSpeedMultiplier = BOSS_V41_CONFIG.phaseSpeedMultiplier[phase];
    boss.bossAttack = state.pattern;
}

function updateBossV41(dt) {
    if (!BOSS_V41_CONFIG.enabled) return;
    if (!bossV41IsActive()) {
        bossV41EnsureState().active = false;
        return;
    }

    const boss = gameState.boss;
    const state = bossV41EnsureState();
    const phase = bossV41GetPhase(boss);
    bossV41ApplyPhase(boss, phase);
    bossV41SetHUD(boss, phase);

    state.bombTimer -= dt;
    state.slamTimer -= dt;
    state.patternTimer = Math.max(0, state.patternTimer - dt);

    if (state.telegraphTimer > 0) {
        state.telegraphTimer = Math.max(0, state.telegraphTimer - dt);
        if (state.telegraphTimer === 0 && state.pendingAttack) {
            const attack = state.pendingAttack;
            state.pendingAttack = null;
            state.patternCount += 1;
            if (attack === 'ground-slam') {
                bossV41GroundSlam();
                state.slamTimer = BOSS_V41_CONFIG.slamIntervalMs[`phase${phase}`];
            } else {
                bossV41FireBombVolley();
                state.bombTimer = BOSS_V41_CONFIG.bombIntervalMs[`phase${phase}`];
            }
            state.patternTimer = 260;
        }
    } else if (state.patternTimer <= 0) {
        let attack = null;
        if (state.slamTimer <= 0) attack = 'ground-slam';
        else if (state.bombTimer <= 0) attack = 'bomb-throw';
        if (attack) {
            state.pendingAttack = attack;
            state.telegraphKind = attack;
            state.telegraphTimer = BOSS_V41_CONFIG.telegraphMs;
            state.patternTimer = BOSS_V41_CONFIG.telegraphMs + 80;
        } else {
            state.patternTimer = 120;
        }
    }

    // Las bombas lanzadas se manejan en js/11-bombs.js como parte del runtime común.
}

function bossV41DrawTelegraphWorld() {
    if (!bossV41IsActive()) return;
    const state = bossV41EnsureState();
    if (state.telegraphTimer <= 0) return;
    const boss = gameState.boss;
    const t = state.telegraphTimer / BOSS_V41_CONFIG.telegraphMs;
    const cx = boss.x;
    const cy = boss.y;
    const range = BOSS_V41_CONFIG.slamRange[`phase${state.phase}`] || 5;
    const radius = state.telegraphKind === 'ground-slam' ? range * TILE_SIZE : TILE_SIZE * 1.15;
    const cam = gameState.camera || { x: 0, y: 0 };
    ctx.save();
    ctx.translate(-Math.floor(cam.x || 0), -Math.floor(cam.y || 0));
    ctx.globalAlpha = 0.18 + t * 0.28;
    ctx.strokeStyle = state.telegraphKind === 'ground-slam' ? '#facc15' : '#fb7185';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.arc(cx, cy, radius * (1.0 + (1 - t) * 0.10), 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    if (state.telegraphKind === 'ground-slam') {
        ctx.fillStyle = 'rgba(250,204,21,.08)';
        ctx.fillRect(cx - range * TILE_SIZE, cy - TILE_SIZE * 0.18, range * TILE_SIZE * 2, TILE_SIZE * 0.36);
        ctx.fillRect(cx - TILE_SIZE * 0.18, cy - range * TILE_SIZE, TILE_SIZE * 0.36, range * TILE_SIZE * 2);
    }
    ctx.restore();
}

function bossV41WrapFunctions() {
    if (BossV41.installed) return true;
    if (typeof update !== 'function' || typeof draw !== 'function' || typeof initLevel !== 'function') return false;

    BossV41.originalUpdate = update;
    BossV41.originalDraw = draw;
    BossV41.originalInitLevel = initLevel;

    window.update = function updateV41(dt) {
        BossV41.originalUpdate(dt);
        updateBossV41(dt);
    };

    window.draw = function drawV41() {
        BossV41.originalDraw();
        bossV41DrawTelegraphWorld();
    };

    window.initLevel = function initLevelV41(...args) {
        const result = BossV41.originalInitLevel(...args);
        bossV41Reset();
        return result;
    };

    if (typeof startGame === 'function') {
        BossV41.originalStartGame = startGame;
        window.startGame = function startGameV41(...args) {
            bossV41Reset();
            return BossV41.originalStartGame(...args);
        };
        BossV41.startWrapped = true;
    }

    BossV41.installed = true;
    BossV41.updateWrapped = true;
    BossV41.drawWrapped = true;
    BossV41.initWrapped = true;
    bossV41EnsureState();
    return true;
}

function bossV41Bootstrap() {
    if (bossV41WrapFunctions()) return;
    setTimeout(bossV41Bootstrap, 50);
}

// Compatibilidad de diagnóstico v3.x/v4.0: mismos puntos de acceso, nueva implementación.
window.BOSS_V41_CONFIG = BOSS_V41_CONFIG;
window.BOSS_V325_CONFIG = BOSS_V41_CONFIG;
window.BossV41 = BossV41;
window.BossV325 = BossV41;
window.updateBossV41 = updateBossV41;
window.updateBossV325 = updateBossV41;
window.resetBossV41 = bossV41Reset;
window.resetBossV325 = bossV41Reset;
window.bossV41GetPhase = bossV41GetPhase;
window.bossV325GetPhase = bossV41GetPhase;
window.bossV41SpawnBomb = bossV41SpawnBomb;
window.bossV4SpawnBomb = bossV41SpawnBomb;
window.bossV4BombVolley = bossV41FireBombVolley;
window.bossV4BombCount = bossV4BombCount;
window.bossV41GroundSlam = bossV41GroundSlam;
window.BOSS_V4_CONFIG = BOSS_V41_CONFIG;

bossV41Bootstrap();
