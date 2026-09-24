/*
 * BOMBERMAN ROGUELIKE v3.26.0
 * Feedback Update
 *
 * Purpose:
 * - Add lightweight impact/explosion feedback.
 * - Use pooled particles to avoid per-frame allocations.
 * - Add short-lived screen flash and camera response.
 * - Add small synthesized combat sounds with lazy AudioContext.
 * - Layer over the existing runtime without replacing core systems.
 */

const FEEDBACK_V326_CONFIG = Object.freeze({
    enabled: true,
    maxParticles: 96,
    maxBursts: 24,
    maxRings: 12,
    particleLifeMin: 180,
    particleLifeMax: 460,
    particleSpeedMin: 0.8,
    particleSpeedMax: 2.8,
    flashMaxAlpha: 0.22,
    impactFlashMs: 90,
    explosionFlashMs: 140,
    cameraKickImpact: 1.6,
    cameraKickExplosion: 3.4,
    ringLifeMs: 260,
    soundEnabled: true,
    soundCooldownMs: 55,
    maxSoundsPerSecond: 10
});

const FeedbackV326 = {
    installed: false,
    originalUpdate: null,
    originalDraw: null,
    originalExplodeBomb: null,
    originalTakeDamage: null,
    particles: [],
    rings: [],
    flashAlpha: 0,
    flashTimer: 0,
    flashDuration: FEEDBACK_V326_CONFIG.impactFlashMs,
    impactCount: 0,
    explosionCount: 0,
    damageCount: 0,
    particlesSpawned: 0,
    soundsPlayed: 0,
    lastSoundAt: -Infinity,
    soundWindowStart: 0,
    soundWindowCount: 0,
    audioContext: null
};

function feedbackV326Clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function feedbackV326PoolInit() {
    if (FeedbackV326.particles.length !== FEEDBACK_V326_CONFIG.maxParticles) {
        FeedbackV326.particles = Array.from({ length: FEEDBACK_V326_CONFIG.maxParticles }, () => ({
            active: false,
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            size: 0,
            life: 0,
            maxLife: 1,
            alpha: 1,
            gravity: 0,
            color: '#fff'
        }));
    }

    if (FeedbackV326.rings.length !== FEEDBACK_V326_CONFIG.maxRings) {
        FeedbackV326.rings = Array.from({ length: FEEDBACK_V326_CONFIG.maxRings }, () => ({
            active: false,
            x: 0,
            y: 0,
            radius: 0,
            maxRadius: 0,
            life: 0,
            maxLife: FEEDBACK_V326_CONFIG.ringLifeMs,
            color: '#fff',
            width: 2
        }));
    }
}

function feedbackV326FindParticle() {
    for (let i = 0; i < FeedbackV326.particles.length; i++) {
        if (!FeedbackV326.particles[i].active) return FeedbackV326.particles[i];
    }
    return null;
}

function feedbackV326FindRing() {
    for (let i = 0; i < FeedbackV326.rings.length; i++) {
        if (!FeedbackV326.rings[i].active) return FeedbackV326.rings[i];
    }
    return null;
}

function feedbackV326SpawnParticles(x, y, color, count, scale = 1) {
    if (!FEEDBACK_V326_CONFIG.enabled) return;

    const targetCount = Math.min(count, FEEDBACK_V326_CONFIG.maxParticles);
    for (let i = 0; i < targetCount; i++) {
        const p = feedbackV326FindParticle();
        if (!p) break;

        const angle = Math.random() * Math.PI * 2;
        const speed = (
            FEEDBACK_V326_CONFIG.particleSpeedMin +
            Math.random() * (FEEDBACK_V326_CONFIG.particleSpeedMax - FEEDBACK_V326_CONFIG.particleSpeedMin)
        ) * scale;

        p.active = true;
        p.x = x;
        p.y = y;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.size = (1.2 + Math.random() * 2.6) * scale;
        p.maxLife = FEEDBACK_V326_CONFIG.particleLifeMin +
            Math.random() * (FEEDBACK_V326_CONFIG.particleLifeMax - FEEDBACK_V326_CONFIG.particleLifeMin);
        p.life = p.maxLife;
        p.alpha = 0.8 + Math.random() * 0.2;
        p.gravity = 0.012 + Math.random() * 0.02;
        p.color = color;
        FeedbackV326.particlesSpawned += 1;
    }
}

function feedbackV326SpawnRing(x, y, color, scale = 1) {
    const ring = feedbackV326FindRing();
    if (!ring) return;

    ring.active = true;
    ring.x = x;
    ring.y = y;
    ring.radius = 5 * scale;
    ring.maxRadius = 28 * scale;
    ring.life = FEEDBACK_V326_CONFIG.ringLifeMs;
    ring.maxLife = FEEDBACK_V326_CONFIG.ringLifeMs;
    ring.color = color;
    ring.width = 1.5 + scale;
}

function feedbackV326KickCamera(amount) {
    try {
        if (!gameState || !gameState.camera) return;
        const camera = gameState.camera;
        if (Number.isFinite(camera.targetX)) camera.targetX += (Math.random() - 0.5) * amount;
        if (Number.isFinite(camera.targetY)) camera.targetY += (Math.random() - 0.5) * amount;
    } catch (_) {}
}

function feedbackV326Flash(alpha, durationMs) {
    FeedbackV326.flashAlpha = Math.max(
        FeedbackV326.flashAlpha,
        Math.min(FEEDBACK_V326_CONFIG.flashMaxAlpha, alpha)
    );
    FeedbackV326.flashTimer = Math.max(FeedbackV326.flashTimer, durationMs);
    FeedbackV326.flashDuration = Math.max(1, durationMs);
}

function feedbackV326Impact(x, y, color = '#fde68a', scale = 1) {
    FeedbackV326.impactCount += 1;
    feedbackV326SpawnParticles(x, y, color, Math.round(7 * scale), scale);
    feedbackV326SpawnRing(x, y, color, 0.8 * scale);
    feedbackV326Flash(0.12 * scale, FEEDBACK_V326_CONFIG.impactFlashMs);
    feedbackV326KickCamera(FEEDBACK_V326_CONFIG.cameraKickImpact * scale);
    feedbackV326PlaySound('impact', scale);
}

function feedbackV326Explosion(x, y, color = '#fb923c', scale = 1) {
    FeedbackV326.explosionCount += 1;
    feedbackV326SpawnParticles(x, y, color, Math.round(14 * scale), 1.15 * scale);
    feedbackV326SpawnRing(x, y, '#fed7aa', 1.25 * scale);
    feedbackV326SpawnRing(x, y, color, 0.8 * scale);
    feedbackV326Flash(0.18 * scale, FEEDBACK_V326_CONFIG.explosionFlashMs);
    feedbackV326KickCamera(FEEDBACK_V326_CONFIG.cameraKickExplosion * scale);
    feedbackV326PlaySound('explosion', scale);
}

function feedbackV326Damage(x, y) {
    FeedbackV326.damageCount += 1;
    feedbackV326SpawnParticles(x, y, '#f87171', 8, 0.9);
    feedbackV326SpawnRing(x, y, '#fecaca', 0.75);
    feedbackV326Flash(0.16, FEEDBACK_V326_CONFIG.impactFlashMs);
    feedbackV326KickCamera(2.2);
    feedbackV326PlaySound('damage', 0.9);
}

function feedbackV326GetAudioContext() {
    if (!FEEDBACK_V326_CONFIG.soundEnabled) return null;
    if (FeedbackV326.audioContext) return FeedbackV326.audioContext;

    try {
        const AudioCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtor) return null;
        FeedbackV326.audioContext = new AudioCtor();
        return FeedbackV326.audioContext;
    } catch (_) {
        return null;
    }
}

function feedbackV326PlaySound(kind, scale = 1) {
    if (!FEEDBACK_V326_CONFIG.soundEnabled) return;

    const now = performance.now();
    if (now - FeedbackV326.lastSoundAt < FEEDBACK_V326_CONFIG.soundCooldownMs) return;
    if (now - FeedbackV326.soundWindowStart >= 1000) {
        FeedbackV326.soundWindowStart = now;
        FeedbackV326.soundWindowCount = 0;
    }
    if (FeedbackV326.soundWindowCount >= FEEDBACK_V326_CONFIG.maxSoundsPerSecond) return;

    const audio = feedbackV326GetAudioContext();
    if (!audio) return;

    try {
        if (audio.state === 'suspended') audio.resume().catch(() => {});

        const osc = audio.createOscillator();
        const gain = audio.createGain();
        const t = audio.currentTime;
        const safeScale = feedbackV326Clamp(scale, 0.6, 1.6);

        if (kind === 'explosion') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(120 * safeScale, t);
            osc.frequency.exponentialRampToValueAtTime(58, t + 0.14);
        } else if (kind === 'damage') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(180 * safeScale, t);
            osc.frequency.exponentialRampToValueAtTime(90, t + 0.09);
        } else {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(280 * safeScale, t);
            osc.frequency.exponentialRampToValueAtTime(140, t + 0.06);
        }

        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.05, t + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 'explosion' ? 0.16 : 0.08));

        osc.connect(gain);
        gain.connect(audio.destination);
        osc.start(t);
        osc.stop(t + (kind === 'explosion' ? 0.17 : 0.09));

        FeedbackV326.lastSoundAt = now;
        FeedbackV326.soundWindowCount += 1;
        FeedbackV326.soundsPlayed += 1;
    } catch (_) {}
}

function updateFeedbackV326(dt) {
    const safeDt = feedbackV326Clamp(Number(dt) || 16.6667, 8, 40);

    for (let i = 0; i < FeedbackV326.particles.length; i++) {
        const p = FeedbackV326.particles[i];
        if (!p.active) continue;

        const scale = safeDt / 16.6667;
        p.x += p.vx * scale;
        p.y += p.vy * scale;
        p.vy += p.gravity * safeDt;
        p.life -= safeDt;

        if (p.life <= 0) p.active = false;
    }

    for (let i = 0; i < FeedbackV326.rings.length; i++) {
        const r = FeedbackV326.rings[i];
        if (!r.active) continue;

        r.life -= safeDt;
        const progress = 1 - feedbackV326Clamp(r.life / r.maxLife, 0, 1);
        r.radius = 5 * (r.maxRadius / 28) + (r.maxRadius - 5 * (r.maxRadius / 28)) * progress;
        if (r.life <= 0) r.active = false;
    }

    if (FeedbackV326.flashTimer > 0) {
        FeedbackV326.flashTimer -= safeDt;
        FeedbackV326.flashAlpha *= Math.pow(0.82, safeDt / 16.6667);
        if (FeedbackV326.flashTimer <= 0 || FeedbackV326.flashAlpha < 0.005) {
            FeedbackV326.flashTimer = 0;
            FeedbackV326.flashAlpha = 0;
        }
    }
}

function feedbackV326BeginWorldDraw() {
    const cam = gameState && gameState.camera ? gameState.camera : { x: 0, y: 0 };
    ctx.save();
    ctx.translate(-Math.floor(Number.isFinite(cam.x) ? cam.x : 0), -Math.floor(Number.isFinite(cam.y) ? cam.y : 0));
}

function drawFeedbackV326() {
    const particlesActive = FeedbackV326.particles.some(p => p.active);
    const ringsActive = FeedbackV326.rings.some(r => r.active);

    if (particlesActive || ringsActive) {
        feedbackV326BeginWorldDraw();
        ctx.globalCompositeOperation = 'lighter';

        for (let i = 0; i < FeedbackV326.rings.length; i++) {
            const r = FeedbackV326.rings[i];
            if (!r.active) continue;
            ctx.globalAlpha = feedbackV326Clamp(r.life / r.maxLife, 0, 1) * 0.7;
            ctx.strokeStyle = r.color;
            ctx.lineWidth = r.width;
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
            ctx.stroke();
        }

        for (let i = 0; i < FeedbackV326.particles.length; i++) {
            const p = FeedbackV326.particles[i];
            if (!p.active) continue;
            ctx.globalAlpha = feedbackV326Clamp(p.life / p.maxLife, 0, 1) * p.alpha;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }

        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
    }

    if (FeedbackV326.flashAlpha > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = FeedbackV326.flashAlpha;
        ctx.fillStyle = '#fff7ed';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }
}

function feedbackV326CaptureBombPosition(indexOrBomb) {
    try {
        if (indexOrBomb && typeof indexOrBomb === 'object') {
            const bx = Number(indexOrBomb.x);
            const by = Number(indexOrBomb.y);
            return Number.isFinite(bx) && Number.isFinite(by)
                ? { x: (bx + 0.5) * TILE_SIZE, y: (by + 0.5) * TILE_SIZE }
                : null;
        }

        if (typeof indexOrBomb === 'number' && Array.isArray(gameState.bombs)) {
            const bomb = gameState.bombs[indexOrBomb];
            if (bomb) {
                return {
                    x: (bomb.x + 0.5) * TILE_SIZE,
                    y: (bomb.y + 0.5) * TILE_SIZE
                };
            }
        }
    } catch (_) {}
    return null;
}

function feedbackV326Wrap() {
    if (FeedbackV326.installed) return true;
    if (typeof update !== 'function' || typeof draw !== 'function') return false;

    feedbackV326PoolInit();

    FeedbackV326.originalUpdate = update;
    FeedbackV326.originalDraw = draw;

    window.update = function updateV326(dt) {
        const result = FeedbackV326.originalUpdate(dt);
        updateFeedbackV326(dt);
        return result;
    };

    window.draw = function drawV326() {
        FeedbackV326.originalDraw();
        drawFeedbackV326();
    };

    if (typeof explodeBomb === 'function') {
        FeedbackV326.originalExplodeBomb = explodeBomb;
        window.explodeBomb = function explodeBombV326(indexOrBomb, ...rest) {
            const point = feedbackV326CaptureBombPosition(indexOrBomb);
            const result = FeedbackV326.originalExplodeBomb(indexOrBomb, ...rest);
            if (point) feedbackV326Explosion(point.x, point.y, '#fb923c', 1);
            return result;
        };
    }

    if (typeof takeDamage === 'function') {
        FeedbackV326.originalTakeDamage = takeDamage;
        window.takeDamage = function takeDamageV326(...args) {
            const result = FeedbackV326.originalTakeDamage(...args);
            try {
                const px = (player.x || 0) + (player.width || 24) / 2;
                const py = (player.y || 0) + (player.height || 24) / 2;
                feedbackV326Damage(px, py);
            } catch (_) {}
            return result;
        };
    }

    FeedbackV326.installed = true;
    return true;
}

function feedbackV326Bootstrap() {
    if (feedbackV326Wrap()) return;
    setTimeout(feedbackV326Bootstrap, 50);
}

window.FEEDBACK_V326_CONFIG = FEEDBACK_V326_CONFIG;
window.FeedbackV326 = FeedbackV326;
window.feedbackV326Impact = feedbackV326Impact;
window.feedbackV326Explosion = feedbackV326Explosion;
window.feedbackV326Damage = feedbackV326Damage;
window.resetFeedbackV326 = function resetFeedbackV326() {
    for (let i = 0; i < FeedbackV326.particles.length; i++) FeedbackV326.particles[i].active = false;
    for (let i = 0; i < FeedbackV326.rings.length; i++) FeedbackV326.rings[i].active = false;
    FeedbackV326.flashAlpha = 0;
    FeedbackV326.flashTimer = 0;
};

feedbackV326Bootstrap();
