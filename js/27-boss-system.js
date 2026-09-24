/*
 * BOMBERMAN ROGUELIKE v3.25.0
 * Boss System Update
 *
 * Purpose:
 * - Add deterministic boss phases and low-cost attack patterns.
 * - Reuse the existing gameState/player/update/draw runtime.
 * - Keep a strict projectile cap.
 * - Avoid per-frame pathfinding or expensive searches.
 * - Keep the existing boss entity as the source of health/position.
 */

const BOSS_V325_CONFIG = Object.freeze({
    enabled: true,
    projectileCap: 6,
    projectileSpeed: 3.2,
    projectileLifeMs: 2400,
    phaseThresholds: Object.freeze({
        phase2: 0.66,
        phase3: 0.33
    }),
    patternIntervalMs: Object.freeze({
        phase1: 1550,
        phase2: 1325,
        phase3: 1100
    }),
    telegraphMs: 260,
    damage: 1,
    phaseSpeedMultiplier: Object.freeze({
        1: 1.00,
        2: 1.08,
        3: 1.16
    })
});

const BossV325 = {
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

function bossV325Distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function bossV325HealthRatio(boss) {
    if (!boss || boss.defeated) return 0;
    const hp = Number.isFinite(boss.health) ? boss.health : boss.hp;
    const max = Number.isFinite(boss.maxHealth) ? boss.maxHealth : boss.maxHp;
    if (!Number.isFinite(hp) || !Number.isFinite(max) || max <= 0) return 1;
    return Math.max(0, Math.min(1, hp / max));
}

function bossV325GetPhase(boss) {
    const ratio = bossV325HealthRatio(boss);
    if (ratio <= BOSS_V325_CONFIG.phaseThresholds.phase3) return 3;
    if (ratio <= BOSS_V325_CONFIG.phaseThresholds.phase2) return 2;
    return 1;
}

function bossV325GetPosition(boss) {
    if (!boss) return null;
    const x = Number.isFinite(boss.x) ? boss.x :
        (Number.isFinite(boss.cx) ? boss.cx : null);
    const y = Number.isFinite(boss.y) ? boss.y :
        (Number.isFinite(boss.cy) ? boss.cy : null);
    return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

function bossV325EnsureState() {
    if (!BossV325.state) {
        BossV325.state = {
            lastBossRef: null,
            phase: 1,
            pattern: 'aimed',
            patternTimer: 0,
            telegraphTimer: 0,
            patternCount: 0,
            phaseTransitions: 0,
            shotsFired: 0,
            hits: 0,
            blockedByCap: 0,
            active: false
        };
    }
    return BossV325.state;
}

function bossV325Reset() {
    BossV325.state = {
        lastBossRef: null,
        phase: 1,
        pattern: 'aimed',
        patternTimer: 0,
        telegraphTimer: 0,
        patternCount: 0,
        phaseTransitions: 0,
        shotsFired: 0,
        hits: 0,
        blockedByCap: 0,
        active: false
    };
    try {
        if (Array.isArray(gameState.bossProjectilesV325)) {
            gameState.bossProjectilesV325.length = 0;
        } else {
            gameState.bossProjectilesV325 = [];
        }
    } catch (_) {}
}

function bossV325IsActive() {
    try {
        return !!(gameState && gameState.isPlaying && gameState.boss && !gameState.boss.defeated);
    } catch (_) {
        return false;
    }
}

function bossV325SetHUD(boss, phase) {
    const phaseEl = document.getElementById('boss-phase');
    const barEl = document.getElementById('boss-bar');
    const hudEl = document.getElementById('boss-hud');
    if (phaseEl) phaseEl.textContent = `FASE ${phase}`;
    if (barEl) {
        const ratio = bossV325HealthRatio(boss);
        barEl.style.width = `${Math.round(ratio * 100)}%`;
    }
    if (hudEl) hudEl.classList.toggle('hidden', !bossV325IsActive());
}

function bossV325DirectionToPlayer(boss) {
    const bp = bossV325GetPosition(boss);
    if (!bp || typeof player === 'undefined' || !player) return { x: 1, y: 0 };
    const px = Number.isFinite(player.x) ? player.x + (player.width || 0) / 2 : bp.x;
    const py = Number.isFinite(player.y) ? player.y + (player.height || 0) / 2 : bp.y;
    const dx = px - bp.x;
    const dy = py - bp.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: dy / len };
}

function bossV325ProjectileCount() {
    try {
        return Array.isArray(gameState.bossProjectilesV325) ? gameState.bossProjectilesV325.length : 0;
    } catch (_) {
        return 0;
    }
}

function bossV325SpawnProjectile(angle, speedMultiplier = 1) {
    const state = bossV325EnsureState();
    if (bossV325ProjectileCount() >= BOSS_V325_CONFIG.projectileCap) {
        state.blockedByCap += 1;
        return false;
    }
    const boss = gameState.boss;
    const bp = bossV325GetPosition(boss);
    if (!bp) return false;

    if (!Array.isArray(gameState.bossProjectilesV325)) gameState.bossProjectilesV325 = [];
    const speed = BOSS_V325_CONFIG.projectileSpeed * speedMultiplier;
    gameState.bossProjectilesV325.push({
        x: bp.x,
        y: bp.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 5,
        damage: BOSS_V325_CONFIG.damage,
        lifeMs: BOSS_V325_CONFIG.projectileLifeMs,
        bornAt: performance.now(),
        owner: 'boss-v325'
    });
    state.shotsFired += 1;
    return true;
}

function bossV325FirePattern() {
    const state = bossV325EnsureState();
    const boss = gameState.boss;
    const aim = bossV325DirectionToPlayer(boss);
    const baseAngle = Math.atan2(aim.y, aim.x);
    const phase = state.phase;

    if (phase === 1) {
        state.pattern = 'aimed';
        bossV325SpawnProjectile(baseAngle, 1.00);
        return;
    }

    if (phase === 2) {
        state.pattern = 'cross';
        for (let i = 0; i < 4; i++) {
            bossV325SpawnProjectile(i * Math.PI / 2, 1.00);
        }
        return;
    }

    state.pattern = 'tri-shot';
    const spread = Math.PI / 10;
    bossV325SpawnProjectile(baseAngle, 1.08);
    bossV325SpawnProjectile(baseAngle - spread, 1.08);
    bossV325SpawnProjectile(baseAngle + spread, 1.08);
}

function bossV325UpdateProjectiles(dt) {
    const list = Array.isArray(gameState.bossProjectilesV325) ? gameState.bossProjectilesV325 : [];
    if (!list.length) return;

    const dtScale = Math.max(0.5, Math.min(2, dt / 16.6667));
    const now = performance.now();

    for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        p.x += p.vx * dtScale;
        p.y += p.vy * dtScale;
        p.lifeMs -= dt;

        let hit = false;
        if (typeof player !== 'undefined' && player) {
            const pw = Number.isFinite(player.width) ? player.width : 24;
            const ph = Number.isFinite(player.height) ? player.height : 24;
            const px = (Number.isFinite(player.x) ? player.x : 0) + pw / 2;
            const py = (Number.isFinite(player.y) ? player.y : 0) + ph / 2;
            const r = Math.max(pw, ph) * 0.35 + p.radius;
            const dx = p.x - px;
            const dy = p.y - py;
            if (dx * dx + dy * dy <= r * r) {
                hit = true;
                const state = bossV325EnsureState();
                state.hits += 1;
                if (!player.isInvincible && typeof takeDamage === 'function') takeDamage();
            }
        }

        const outside = p.x < -24 || p.y < -24 || p.x > gameState.gridWidth * TILE_SIZE + 24 || p.y > gameState.gridHeight * TILE_SIZE + 24;
        if (hit || outside || p.lifeMs <= 0 || now - p.bornAt > BOSS_V325_CONFIG.projectileLifeMs) {
            list.splice(i, 1);
        }
    }
}

function bossV325BeginWorldDraw() {
    const cam = gameState && gameState.camera ? gameState.camera : { x: 0, y: 0 };
    ctx.save();
    ctx.translate(-Math.floor(Number.isFinite(cam.x) ? cam.x : 0), -Math.floor(Number.isFinite(cam.y) ? cam.y : 0));
}

function bossV325DrawProjectiles() {
    const list = Array.isArray(gameState.bossProjectilesV325) ? gameState.bossProjectilesV325 : [];
    if (!list.length) return;

    bossV325BeginWorldDraw();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of list) {
        ctx.fillStyle = '#ef4444';
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fecaca';
        ctx.globalAlpha = 0.45;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius + 2, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.restore();
}

function bossV325DrawTelegraphWorld() {
    if (!bossV325IsActive()) return;
    const state = bossV325EnsureState();
    if (state.telegraphTimer <= 0) return;
    const bp = bossV325GetPosition(gameState.boss);
    if (!bp) return;
    const t = state.telegraphTimer / BOSS_V325_CONFIG.telegraphMs;
    bossV325BeginWorldDraw();
    ctx.globalAlpha = 0.35 + t * 0.35;
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bp.x, bp.y, 24 + (1 - t) * 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

function bossV325ApplyPhase(boss, phase) {
    const state = bossV325EnsureState();
    if (state.lastBossRef !== boss) {
        state.lastBossRef = boss;
        state.phase = phase;
        state.patternTimer = 0;
        state.telegraphTimer = 0;
        state.patternCount = 0;
        state.active = true;
    }

    if (state.phase !== phase) {
        state.phase = phase;
        state.phaseTransitions += 1;
        state.patternTimer = 0;
        state.telegraphTimer = BOSS_V325_CONFIG.telegraphMs;
        state.pattern = phase === 1 ? 'aimed' : (phase === 2 ? 'cross' : 'tri-shot');
    }

    boss.phase = phase;
    boss.bossPhase = phase;
    boss.phaseSpeedMultiplier = BOSS_V325_CONFIG.phaseSpeedMultiplier[phase];
    boss.patternV325 = state.pattern;
}

function updateBossV325(dt) {
    if (!BOSS_V325_CONFIG.enabled) return;
    if (!bossV325IsActive()) {
        bossV325EnsureState().active = false;
        return;
    }

    const boss = gameState.boss;
    const state = bossV325EnsureState();
    const phase = bossV325GetPhase(boss);
    bossV325ApplyPhase(boss, phase);
    bossV325SetHUD(boss, phase);

    state.patternTimer -= dt;
    if (state.telegraphTimer > 0) state.telegraphTimer = Math.max(0, state.telegraphTimer - dt);

    const interval = BOSS_V325_CONFIG.patternIntervalMs[`phase${phase}`];
    if (state.patternTimer <= 0) {
        state.patternTimer = interval;
        state.patternCount += 1;
        state.telegraphTimer = BOSS_V325_CONFIG.telegraphMs;
        bossV325FirePattern();
    }

    bossV325UpdateProjectiles(dt);
}

function drawBossV325Telegraph() {
    bossV325DrawTelegraphWorld();
}

function bossV325WrapFunctions() {
    if (BossV325.installed) return true;
    if (typeof update !== 'function' || typeof draw !== 'function' || typeof initLevel !== 'function') return false;

    BossV325.originalUpdate = update;
    BossV325.originalDraw = draw;
    BossV325.originalInitLevel = initLevel;

    window.update = function updateV325(dt) {
        BossV325.originalUpdate(dt);
        updateBossV325(dt);
    };

    window.draw = function drawV325() {
        BossV325.originalDraw();
        drawBossV325Telegraph();
        bossV325DrawProjectiles();
    };

    window.initLevel = function initLevelV325(...args) {
        const result = BossV325.originalInitLevel(...args);
        bossV325Reset();
        return result;
    };

    if (typeof startGame === 'function') {
        BossV325.originalStartGame = startGame;
        window.startGame = function startGameV325(...args) {
            bossV325Reset();
            return BossV325.originalStartGame(...args);
        };
        BossV325.startWrapped = true;
    }

    BossV325.installed = true;
    BossV325.updateWrapped = true;
    BossV325.drawWrapped = true;
    BossV325.initWrapped = true;
    bossV325EnsureState();
    return true;
}

function bossV325Bootstrap() {
    if (bossV325WrapFunctions()) return;
    setTimeout(bossV325Bootstrap, 50);
}

window.BOSS_V325_CONFIG = BOSS_V325_CONFIG;
window.BossV325 = BossV325;
window.updateBossV325 = updateBossV325;
window.resetBossV325 = bossV325Reset;
window.bossV325GetPhase = bossV325GetPhase;
window.bossV325SpawnProjectile = bossV325SpawnProjectile;

bossV325Bootstrap();
