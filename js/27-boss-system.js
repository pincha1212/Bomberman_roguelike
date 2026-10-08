/*
 * BOMBERMAN ROGUELIKE v6.29.0
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
    telegraphMs: 650,
    bossBombCap: 4,
    bombFuseMs: 2100,
    bombMoveMs: 420,
    bombArcPx: 22,
    bombThrowCount: Object.freeze({ 1: 1, 2: 2, 3: 2 }),
    bombIntervalMs: Object.freeze({ phase1: 2900, phase2: 2450, phase3: 2050 }),
    bombRange: Object.freeze({ phase1: 2, phase2: 3, phase3: 4 }),
    bombMinFromPlayer: 0,
    bombMinFromBoss: 2,
    slamIntervalMs: Object.freeze({ phase1: 5400, phase2: 4700, phase3: 4000 }),
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
    // hp/maxHp are the combat authority in 10-world.js; health/maxHealth are
    // mirrored compatibility fields and may be stale in old save snapshots.
    const hp = Number.isFinite(boss.hp) ? boss.hp : boss.health;
    const max = Number.isFinite(boss.maxHp) ? boss.maxHp : boss.maxHealth;
    if (!Number.isFinite(hp) || !Number.isFinite(max) || max <= 0) return 1;
    return Math.max(0, Math.min(1, hp / max));
}

function bossV41GetPhase(boss) {
    const ratio = bossV41HealthRatio(boss);
    if (ratio <= BOSS_V41_CONFIG.phaseThresholds.phase3) return 3;
    if (ratio <= BOSS_V41_CONFIG.phaseThresholds.phase2) return 2;
    return 1;
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
        telegraphCells: [],
        pendingBombTargets: [],
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
    } catch (_) {}
}

function bossV41IsActive() {
    try {
        return !!(gameState && gameState.isPlaying && gameState.boss && !gameState.boss.defeated);
    } catch (_) {
        return false;
    }
}

function bossV41EnsureHUD() {
    if (typeof document === 'undefined') return null;
    let hud = document.getElementById('boss-hud');
    if (hud) return hud;
    const host = document.getElementById('game-container') || document.getElementById('game-stage');
    if (!host) return null;

    hud = document.createElement('div');
    hud.id = 'boss-hud';
    hud.className = 'boss-hud hidden';
    hud.setAttribute('role', 'region');
    hud.setAttribute('aria-label', 'Estado del jefe');
    hud.setAttribute('aria-live', 'polite');
    hud.innerHTML = `
        <div class="boss-hud-top">
            <span id="boss-name">GUARDIÁN DEL BIOMA</span>
            <span id="boss-phase">FASE I</span>
        </div>
        <div class="boss-bar-track">
            <div id="boss-bar" class="boss-bar" role="progressbar" aria-label="Vida del jefe" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"></div>
        </div>
        <div class="boss-hud-top" style="margin:5px 0 0;font-size:6px;opacity:.85">
            <span>EXPLOSIVOS ACTIVOS</span>
            <span id="ui-boss-bombs" class="v4-boss-bomb-badge">BOMBAS <span>0</span></span>
        </div>`;
    host.appendChild(hud);
    return hud;
}

function bossV41SetHUD(boss, phase) {
    if (typeof document === 'undefined') return;
    const active = bossV41IsActive();
    const hudEl = bossV41EnsureHUD();
    const phaseEl = document.getElementById('boss-phase');
    const nameEl = document.getElementById('boss-name');
    const barEl = document.getElementById('boss-bar');
    const badge = document.getElementById('ui-boss-bombs');
    const ratio = bossV41HealthRatio(boss);
    const percent = Math.round(ratio * 100);

    if (phaseEl) phaseEl.textContent = active ? `FASE ${['', 'I', 'II', 'III'][phase] || phase}` : 'JEFE';
    if (nameEl && boss) nameEl.textContent = String(boss.name || 'GUARDIÁN DEL BIOMA').toLocaleUpperCase('es');
    if (barEl) {
        barEl.style.width = `${percent}%`;
        barEl.setAttribute('aria-valuenow', String(percent));
    }
    if (hudEl) hudEl.classList.toggle('hidden', !active);
    if (badge) {
        badge.classList.toggle('hidden', !active);
        const value = badge.querySelector('span');
        if (value) value.textContent = String(bossV4BombCount());
    }
}

function bossV4BombCount() {
    try {
        return Array.isArray(gameState.bombs) ? gameState.bombs.filter(b => b && b.owner === 'boss').length : 0;
    } catch (_) { return 0; }
}

function bossV41IsBombTargetValid(x, y, bossCell, playerCell, excluded = []) {
    if (x <= 0 || y <= 0 || x >= gameState.gridWidth - 1 || y >= gameState.gridHeight - 1) return false;
    if (gameState.grid?.[y]?.[x] !== TYPES.EMPTY) return false;
    if (Array.isArray(gameState.bombs) && gameState.bombs.some(b => b && b.x === x && b.y === y)) return false;
    if (excluded.some(cell => cell.x === x && cell.y === y)) return false;
    if (Math.abs(x - bossCell.x) + Math.abs(y - bossCell.y) < BOSS_V41_CONFIG.bombMinFromBoss) return false;
    if (Math.abs(x - playerCell.x) + Math.abs(y - playerCell.y) < BOSS_V41_CONFIG.bombMinFromPlayer) return false;
    return true;
}

function bossV41FindBombTargets(count = 1, excluded = []) {
    const boss = gameState.boss;
    if (!boss || !player || !gameState.grid) return [];
    const tile = Number(TILE_SIZE || 48);
    const bossCell = { x: Math.floor(boss.x / tile), y: Math.floor(boss.y / tile) };
    const playerCell = { x: Math.floor((player.x + player.width / 2) / tile), y: Math.floor((player.y + player.height / 2) / tile) };
    const selected = [];
    const excludedAll = [...excluded];

    // The warning marks exact cells close to the player's current position.
    // A player can escape during the 650 ms telegraph and the bomb's travel/fuse.
    for (let radius = 0; radius <= 4 && selected.length < count; radius++) {
        const ring = [];
        for (let y = playerCell.y - radius; y <= playerCell.y + radius; y++) {
            for (let x = playerCell.x - radius; x <= playerCell.x + radius; x++) {
                if (Math.abs(x - playerCell.x) + Math.abs(y - playerCell.y) !== radius) continue;
                if (bossV41IsBombTargetValid(x, y, bossCell, playerCell, excludedAll)) ring.push({ x, y });
            }
        }
        // Randomness only varies equivalent cells in the same ring; it never hides the target.
        for (let i = ring.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [ring[i], ring[j]] = [ring[j], ring[i]];
        }
        for (const target of ring) {
            selected.push(target);
            excludedAll.push(target);
            if (selected.length >= count) break;
        }
    }

    // Fallback for crowded maps: find valid cells globally, closest to the player first.
    if (selected.length < count) {
        const fallback = [];
        for (let y = 1; y < gameState.gridHeight - 1; y++) {
            for (let x = 1; x < gameState.gridWidth - 1; x++) {
                if (bossV41IsBombTargetValid(x, y, bossCell, playerCell, excludedAll)) fallback.push({ x, y });
            }
        }
        fallback.sort((a, b) => {
            const da = Math.abs(a.x - playerCell.x) + Math.abs(a.y - playerCell.y);
            const db = Math.abs(b.x - playerCell.x) + Math.abs(b.y - playerCell.y);
            return da - db || Math.random() - 0.5;
        });
        for (const target of fallback) {
            selected.push(target);
            excludedAll.push(target);
            if (selected.length >= count) break;
        }
    }
    return selected;
}

function bossV41FindBombTarget(excluded = []) {
    return bossV41FindBombTargets(1, excluded)[0] || null;
}

function bossV41SpawnBomb(targetOverride = null) {
    const state = bossV41EnsureState();
    if (!bossV41IsActive()) return false;
    if (bossV4BombCount() >= BOSS_V41_CONFIG.bossBombCap) return false;
    const target = targetOverride || bossV41FindBombTarget();
    if (!target || !bossV41IsBombTargetValid(target.x, target.y, { x: Math.floor(gameState.boss.x / TILE_SIZE), y: Math.floor(gameState.boss.y / TILE_SIZE) }, { x: Math.floor((player.x + player.width / 2) / TILE_SIZE), y: Math.floor((player.y + player.height / 2) / TILE_SIZE) }, [])) return false;
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

function bossV41FireBombVolley(targets = null) {
    const state = bossV41EnsureState();
    const count = Number(BOSS_V41_CONFIG.bombThrowCount[state.phase] || 1);
    const planned = Array.isArray(targets) ? targets : bossV41FindBombTargets(count);
    let spawned = 0;
    for (let i = 0; i < Math.min(count, planned.length); i++) {
        if (bossV41SpawnBomb(planned[i])) spawned++;
    }
    // If some marked cells became blocked during the warning, replace only those
    // with a valid target instead of cancelling the whole attack.
    while (spawned < count && bossV4BombCount() < BOSS_V41_CONFIG.bossBombCap) {
        const fallback = bossV41FindBombTarget(planned);
        if (!fallback || !bossV41SpawnBomb(fallback)) break;
        planned.push(fallback);
        spawned++;
    }
    state.lastAttack = 'bomb-throw';
    state.pattern = 'bomb-throw';
    return spawned;
}

function bossV41StartTelegraph(attack) {
    const state = bossV41EnsureState();
    state.pendingAttack = attack;
    state.telegraphKind = attack;
    if (attack === 'bomb-throw') {
        const count = Math.min(BOSS_V41_CONFIG.bombThrowCount[state.phase] || 1, BOSS_V41_CONFIG.bossBombCap - bossV4BombCount());
        state.pendingBombTargets = bossV41FindBombTargets(Math.max(0, count));
        if (!state.pendingBombTargets.length) {
            state.pendingAttack = null;
            state.telegraphKind = null;
            state.telegraphTimer = 0;
            state.telegraphCells = [];
            state.bombTimer = 300;
            state.patternTimer = 180;
            return false;
        }
        state.telegraphCells = state.pendingBombTargets.map(cell => ({ ...cell, kind: 'bomb' }));
    } else {
        state.pendingBombTargets = [];
        const slamBomb = bossV41BuildSlamBomb();
        const cells = typeof calculateBombBlastCells === 'function' ? calculateBombBlastCells(slamBomb) : null;
        state.telegraphCells = Array.isArray(cells) && cells.length
            ? cells.map(cell => ({ x: cell.x, y: cell.y, kind: 'slam' }))
            : [{ x: slamBomb.x, y: slamBomb.y, kind: 'slam' }];
    }
    state.telegraphTimer = BOSS_V41_CONFIG.telegraphMs;
    state.patternTimer = BOSS_V41_CONFIG.telegraphMs + 80;
    return true;
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
        state.slamTimer = BOSS_V41_CONFIG.slamIntervalMs[`phase${phase}`] * 0.65;
        state.telegraphTimer = 0;
        state.telegraphKind = null;
        state.telegraphCells = [];
        state.pendingBombTargets = [];
        state.pendingAttack = null;
        state.patternCount = 0;
        state.bombShotsFired = 0;
        state.slamCount = 0;
        state.lastBombTarget = null;
        state.active = true;
    }
    if (state.phase !== phase) {
        const previousPhase = state.phase;
        state.phase = phase;
        state.phaseTransitions += 1;
        state.patternTimer = 850; // Brief, readable breath at each phase transition.
        state.bombTimer = 1050;
        state.pendingAttack = null;
        state.telegraphKind = null;
        state.telegraphTimer = 0;
        state.telegraphCells = [];
        state.pendingBombTargets = [];
        state.slamTimer = BOSS_V41_CONFIG.slamIntervalMs[`phase${phase}`] * 0.65;
        addFloatingText(phase === 2 ? 'FASE II' : 'FASE III', boss.x, boss.y - boss.height * 0.7, phase === 2 ? '#facc15' : '#fb7185');
        if (typeof addParticles === 'function') addParticles(boss.x, boss.y, 'particleBoss', phase === 3 ? 24 : 16);
        if (typeof triggerScreenShake === 'function') triggerScreenShake(phase === 3 ? 7 : 4, phase === 3 ? 260 : 170);
        if (typeof sfx === 'function') sfx('bossRoar');
        state.lastPhaseFeedback = { from: previousPhase, to: phase };
    }
    boss.phase = phase;
    boss.bossPhase = phase;
    boss.phaseSpeedMultiplier = BOSS_V41_CONFIG.phaseSpeedMultiplier[phase];
    boss.bossAttack = state.pattern;
}

function bossV41UpdateMovement(boss, phase, dt, freeze) {
    if (!boss || boss.defeated || !player || freeze) return;
    const tile = Number(TILE_SIZE || 48);
    const motionDt = typeof getCombatMotionDt === 'function' ? getCombatMotionDt(dt) : dt;
    const scale = Math.min(Math.max(0, motionDt / 16.6667), 2);
    boss.moveTimer = Math.max(0, (Number(boss.moveTimer) || 0) - dt);

    const colliderSize = Math.min(tile * 0.84, Math.min(Number(boss.width) || tile, Number(boss.height) || tile) * 0.72);
    const canOccupy = (cx, cy) => {
        if (typeof rectCollidesSolid !== 'function') return true;
        return !rectCollidesSolid(cx - colliderSize / 2, cy - colliderSize / 2, colliderSize, colliderSize);
    };

    if (boss.moveTimer <= 0) {
        const dx = player.x + player.width / 2 - boss.x;
        const dy = player.y + player.height / 2 - boss.y;
        const sx = Math.sign(dx);
        const sy = Math.sign(dy);
        const directions = Math.abs(dx) >= Math.abs(dy)
            ? [{ x: sx, y: 0 }, { x: 0, y: sy }, { x: -sx, y: 0 }, { x: 0, y: -sy }]
            : [{ x: 0, y: sy }, { x: sx, y: 0 }, { x: 0, y: -sy }, { x: -sx, y: 0 }];
        const speed = Math.max(0.55, (Number(boss.baseSpeed) || Number(boss.speed) || 0.8) * (boss.phaseSpeedMultiplier || 1));
        boss.vx = 0;
        boss.vy = 0;
        for (const dir of directions) {
            if (!dir.x && !dir.y) continue;
            const nx = boss.x + dir.x * speed * 8;
            const ny = boss.y + dir.y * speed * 8;
            if (canOccupy(nx, ny)) {
                boss.vx = dir.x;
                boss.vy = dir.y;
                break;
            }
        }
        boss.moveTimer = 640 - phase * 70;
        if (!boss.vx && !boss.vy) boss.moveTimer = 180;
    }

    if (boss.vx || boss.vy) {
        const speed = Math.max(0.55, (Number(boss.baseSpeed) || Number(boss.speed) || 0.8) * (boss.phaseSpeedMultiplier || 1));
        const nx = boss.x + boss.vx * speed * scale;
        const ny = boss.y + boss.vy * speed * scale;
        if (canOccupy(nx, ny)) {
            boss.x = nx;
            boss.y = ny;
        } else {
            boss.vx = 0;
            boss.vy = 0;
            boss.moveTimer = 0;
        }
    }

    const bossHitbox = {
        left: boss.x - boss.width * 0.38,
        right: boss.x + boss.width * 0.38,
        top: boss.y - boss.height * 0.38,
        bottom: boss.y + boss.height * 0.38
    };
    const playerHitbox = {
        left: player.x + 5,
        right: player.x + player.width - 5,
        top: player.y + 5,
        bottom: player.y + player.height - 5
    };
    if (typeof checkOverlap === 'function' && checkOverlap(bossHitbox, playerHitbox) && typeof takeDamage === 'function') {
        takeDamage('boss-contact', boss.x, boss.y);
    }
}

function updateBossV41(dt) {
    if (!BOSS_V41_CONFIG.enabled) return;
    const state = bossV41EnsureState();
    if (!bossV41IsActive()) {
        state.active = false;
        state.telegraphTimer = 0;
        state.pendingAttack = null;
        state.telegraphCells = [];
        state.pendingBombTargets = [];
        bossV41SetHUD(typeof gameState !== 'undefined' ? (gameState.boss || null) : null, 0);
        return;
    }

    const boss = gameState.boss;
    const elapsed = Math.max(0, Number(dt) || 0);
    // These timers used to live in the legacy updateBoss(), which now delegates
    // to this module. Without decrementing them here the boss stayed invulnerable.
    boss.invuln = Math.max(0, (Number(boss.invuln) || 0) - elapsed);
    boss.flash = Math.max(0, (Number(boss.flash) || 0) - elapsed);

    const phase = bossV41GetPhase(boss);
    bossV41ApplyPhase(boss, phase);
    bossV41SetHUD(boss, phase);

    state.bombTimer -= elapsed;
    state.slamTimer -= elapsed;
    state.patternTimer = Math.max(0, state.patternTimer - elapsed);
    let attackReleasedThisFrame = false;

    if (state.telegraphTimer > 0) {
        state.telegraphTimer = Math.max(0, state.telegraphTimer - elapsed);
        if (state.telegraphTimer === 0 && state.pendingAttack) {
            const attack = state.pendingAttack;
            state.pendingAttack = null;
            state.patternCount += 1;
            attackReleasedThisFrame = true;
            if (attack === 'ground-slam') {
                bossV41GroundSlam();
                state.slamTimer = BOSS_V41_CONFIG.slamIntervalMs[`phase${phase}`];
            } else {
                bossV41FireBombVolley(state.pendingBombTargets);
                state.bombTimer = BOSS_V41_CONFIG.bombIntervalMs[`phase${phase}`];
                state.bombShotsFired += 1;
            }
            state.pendingBombTargets = [];
            state.telegraphCells = [];
            state.telegraphKind = null;
            state.patternTimer = 260;
        }
    } else if (state.patternTimer <= 0) {
        let attack = null;
        if (state.slamTimer <= 0) attack = 'ground-slam';
        else if (state.bombTimer <= 0 && bossV4BombCount() < BOSS_V41_CONFIG.bossBombCap) attack = 'bomb-throw';
        if (attack) {
            if (!bossV41StartTelegraph(attack)) state.patternTimer = 180;
        } else {
            if (state.bombTimer <= 0) state.bombTimer = 180;
            state.patternTimer = 120;
        }
    }

    // A warning stays attached to its actual targets: the boss does not drift
    // during the tell, so a slam's marked blast cells match its release point.
    bossV41UpdateMovement(boss, phase, elapsed, state.telegraphTimer > 0 || attackReleasedThisFrame);
}

function bossV41DrawTelegraphWorld() {
    if (!bossV41IsActive()) return;
    const state = bossV41EnsureState();
    if (state.telegraphTimer <= 0 || typeof ctx === 'undefined' || !ctx) return;
    const cam = gameState.camera || { x: 0, y: 0 };
    const t = Math.max(0, Math.min(1, state.telegraphTimer / BOSS_V41_CONFIG.telegraphMs));
    const pulse = 0.18 + (1 - t) * 0.20;
    ctx.save();
    ctx.translate(-Math.floor(cam.x || 0), -Math.floor(cam.y || 0));

    if (Array.isArray(state.telegraphCells) && state.telegraphCells.length) {
        for (const cell of state.telegraphCells) {
            const px = cell.x * TILE_SIZE;
            const py = cell.y * TILE_SIZE;
            const isSlam = cell.kind === 'slam' || state.telegraphKind === 'ground-slam';
            ctx.globalAlpha = pulse + (isSlam ? 0.10 : 0.04);
            ctx.fillStyle = isSlam ? '#facc15' : '#fb7185';
            ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            ctx.globalAlpha = 0.75 + (1 - t) * 0.25;
            ctx.strokeStyle = isSlam ? '#fde68a' : '#fecdd3';
            ctx.lineWidth = 3;
            ctx.strokeRect(px + 3, py + 3, TILE_SIZE - 6, TILE_SIZE - 6);
            ctx.beginPath();
            ctx.moveTo(px + TILE_SIZE * 0.28, py + TILE_SIZE * 0.28);
            ctx.lineTo(px + TILE_SIZE * 0.72, py + TILE_SIZE * 0.72);
            ctx.moveTo(px + TILE_SIZE * 0.72, py + TILE_SIZE * 0.28);
            ctx.lineTo(px + TILE_SIZE * 0.28, py + TILE_SIZE * 0.72);
            ctx.stroke();
        }
    } else {
        // Fallback signal while map data is unavailable: never hide the warning.
        const boss = gameState.boss;
        ctx.globalAlpha = pulse + 0.15;
        ctx.strokeStyle = state.telegraphKind === 'ground-slam' ? '#facc15' : '#fb7185';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.arc(boss.x, boss.y, TILE_SIZE * 1.4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
    }
    ctx.restore();
}

function bossV41FindSpawnCellV626() {
    if (!gameState?.grid || !player) return null;
    const width = Math.max(3, Number(gameState.gridWidth) || gameState.grid[0]?.length || 15);
    const height = Math.max(3, Number(gameState.gridHeight) || gameState.grid.length || 15);
    const px = Math.floor((Number(player.x) + Number(player.width || 0) / 2) / Number(TILE_SIZE || 48));
    const py = Math.floor((Number(player.y) + Number(player.height || 0) / 2) / Number(TILE_SIZE || 48));
    const cx = Math.floor(width / 2);
    const cy = Math.floor(height / 2);
    const candidates = [];
    for (let radius = 0; radius <= Math.max(width, height); radius++) {
        for (let y = Math.max(1, cy - radius); y <= Math.min(height - 2, cy + radius); y++) {
            for (let x = Math.max(1, cx - radius); x <= Math.min(width - 2, cx + radius); x++) {
                if (Math.abs(x - cx) !== radius && Math.abs(y - cy) !== radius) continue;
                if (gameState.grid?.[y]?.[x] !== TYPES.EMPTY) continue;
                if (Math.abs(x - px) + Math.abs(y - py) < 6) continue;
                candidates.push({ x, y });
            }
        }
        if (candidates.length) break;
    }
    return candidates[0] || null;
}

function bossV41BuildEntityV626() {
    if (!gameState || gameState.roomType?.id !== 'BOSS' || !gameState.grid) return null;
    const spawn = bossV41FindSpawnCellV626();
    if (!spawn) return null;
    const tile = Number(TILE_SIZE || 48);
    const level = Math.max(1, Number(gameState.level) || 1);
    const meta = typeof getBiomeMetadataV49 === 'function' ? getBiomeMetadataV49(level) : null;
    const maxHp = Math.max(20, Math.round(18 + level * 0.9));
    const speed = Math.max(0.72, 0.72 + Math.min(0.45, level * 0.008));
    return {
        id: `boss-${level}-${gameState.gridRevision || 0}`,
        name: 'Guardián del bioma',
        x: spawn.x * tile + tile / 2,
        y: spawn.y * tile + tile / 2,
        width: tile * 1.35,
        height: tile * 1.35,
        vx: 0,
        vy: 0,
        baseSpeed: speed,
        speed,
        moveTimer: 420,
        hp: maxHp,
        maxHp,
        health: maxHp,
        maxHealth: maxHp,
        phase: 1,
        bossPhase: 1,
        phaseSpeedMultiplier: 1,
        invuln: 0,
        flash: 0,
        defeated: false,
        contactDamage: 1,
        biomeIdV626: meta?.id || gameState.biomeV49?.id || 'unknown',
        stageV626: Number(meta?.stage) || Number(gameState.biomeV49?.stage) || 4,
        spawnedByV626: 'biome-exam'
    };
}

function spawnBossV626() {
    if (!gameState || gameState.roomType?.id !== 'BOSS') return false;
    if (gameState.boss && !gameState.boss.defeated) return true;
    const boss = bossV41BuildEntityV626();
    if (!boss) return false;
    gameState.boss = boss;
    bossV41Reset();
    bossV41EnsureState().active = true;
    return true;
}

function bossV41WrapFunctions() {
    if (BossV41.installed) return true;
    if (typeof update !== 'function' || typeof draw !== 'function' || typeof initLevel !== 'function') return false;

    BossV41.originalUpdate = update;
    BossV41.originalDraw = draw;
    BossV41.originalInitLevel = initLevel;

    window.update = function updateV41(dt) {
        BossV41.originalUpdate(dt);
        // The legacy loop returns early while paused, but this wrapper used to
        // keep ticking the boss timers anyway. Pause must freeze the whole fight.
        if (typeof gameState === 'undefined' || !gameState.isPlaying || gameState.paused) return;
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
window.bossV41UpdateMovement = bossV41UpdateMovement;
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
window.spawnBossV626 = spawnBossV626;
window.bossV41BuildEntityV626 = bossV41BuildEntityV626;
window.BOSS_V4_CONFIG = BOSS_V41_CONFIG;

bossV41Bootstrap();
