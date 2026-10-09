// Bomberman Roguelike v6.12.10 — Combat & Feedback
// Feedback visual/audio aislado para facilitar futuras iteraciones.
const combatFeedback = {
    hitStop: 0,
    hitStopScale: 0.18,
    flash: 0,
    flashColor: 'rgba(255,255,255,1)',
    flashAlpha: 0,
    playerHit: 0,
    playerHitColor: '#ef4444',
    playerRecoilX: 0,
    playerRecoilY: 0,
    death: 0,
    bombPulse: 0,
    lastBomb: null
};

function clamp01(v){ return Math.max(0, Math.min(1, v)); }

// Solo ralentiza el movimiento/animación durante el impacto.
// Bombas, explosiones, inmunidad, amenazas y timers críticos siguen corriendo.
function getCombatMotionDt(dt){
    return combatFeedback.hitStop > 0 ? dt * combatFeedback.hitStopScale : dt;
}

function updateCombatFeedback(dt){
    combatFeedback.hitStop = Math.max(0, combatFeedback.hitStop - dt);
    combatFeedback.flash = Math.max(0, combatFeedback.flash - dt);
    combatFeedback.playerHit = Math.max(0, combatFeedback.playerHit - dt);
    combatFeedback.bombPulse = Math.max(0, combatFeedback.bombPulse - dt);
    combatFeedback.death = Math.max(0, combatFeedback.death - dt);

    const recoilScale = combatFeedback.playerHit > 0 ? Math.max(0, combatFeedback.playerHit / 220) : 0;
    combatFeedback.playerRecoilX *= Math.pow(0.0008, dt / 220);
    combatFeedback.playerRecoilY *= Math.pow(0.0008, dt / 220);
    if(recoilScale <= 0){
        combatFeedback.playerRecoilX = 0;
        combatFeedback.playerRecoilY = 0;
    }
}

function triggerCombatFlash(color='rgba(255,255,255,1)', alpha=.35, duration=110){
    const scaledAlpha = typeof deviceQualityV45FeedbackFlash === 'function'
        ? deviceQualityV45FeedbackFlash(alpha)
        : alpha;
    combatFeedback.flashColor = color;
    combatFeedback.flashAlpha = scaledAlpha;
    combatFeedback.flash = Math.max(combatFeedback.flash, duration);
}

function triggerHitStop(duration=85){
    combatFeedback.hitStop = Math.max(combatFeedback.hitStop, duration);
}

function triggerBombPlacedFeedback(bomb){
    combatFeedback.bombPulse = 420;
    combatFeedback.lastBomb = bomb;
    triggerCombatFlash('rgba(251,191,36,1)', .12, 70);
    sfx('bombReady');
    addParticles((bomb.x + .5) * TILE_SIZE, (bomb.y + .5) * TILE_SIZE, 'particleImpact', 8);
}

function triggerEnemyDefeatFeedback(e){
    const color = e.elite ? (typeof themeColorV46 === 'function' ? themeColorV46('particleEnemyElite', '#fb7185') : '#fb7185') : (typeof themeColorV46 === 'function' ? themeColorV46('particleEnemy', '#38bdf8') : '#38bdf8');
    addParticles(e.x, e.y, e.elite ? 'particleEnemyElite' : 'particleEnemy', e.elite ? 22 : 15);
    addFloatingText(e.elite ? '★ KO ELITE' : 'KO', e.x, e.y - e.height * .55, color);
    triggerCombatFlash('rgba(56,189,248,1)', e.elite ? .16 : .09, 75);
    triggerHitStop(50);
    sfx('enemyKill');
}

function triggerBossHitFeedback(b){
    addParticles(b.x, b.y, 'particleBoss', 12);
    triggerCombatFlash('rgba(244,63,94,1)', .12, 80);
    triggerHitStop(70);
}

function triggerPlayerDamageFeedback(source='unknown', sourceX=null, sourceY=null, lethal=false, shield=false){
    const p = window.BOMBER_ENGINE?.getPlayer?.() || player;
    const px = p.x + p.width / 2;
    const py = p.y + p.height / 2;
    const sx = sourceX == null ? p.x : sourceX;
    const sy = sourceY == null ? p.y : sourceY;
    const dx = px - sx;
    const dy = py - sy;
    const len = Math.hypot(dx,dy) || 1;
    const strength = shield ? 3.5 : 5.5;

    combatFeedback.playerRecoilX = dx / len * strength;
    combatFeedback.playerRecoilY = dy / len * strength;
    combatFeedback.playerHit = shield ? 180 : 240;
    combatFeedback.playerHitColor = shield ? '#38bdf8' :
        source === 'boss-contact' ? '#c084fc' :
        source === 'trap' ? '#f43f5e' : '#ef4444';

    const sourceLabel = shield ? 'ESCUDO' :
        source === 'boss-contact' ? 'JEFE' :
        source === 'trap' ? 'TRAMPA' :
        source === 'explosion' ? 'EXPLOSIÓN' : 'IMPACTO';
    const sourceColor = shield ? '#38bdf8' :
        source === 'boss-contact' ? '#c084fc' :
        source === 'trap' ? '#f43f5e' : '#ef4444';
    if(!shield || source !== 'unknown') addFloatingText(`¡${sourceLabel}!`, p.x, p.y - p.height * .7, sourceColor);
    triggerCombatFlash(shield ? 'rgba(56,189,248,1)' :
        source === 'boss-contact' ? 'rgba(192,132,252,1)' :
        'rgba(239,68,68,1)', shield ? .22 : .20, shield ? 95 : 120);
    triggerHitStop(shield ? 70 : 90);
    if(lethal){
        combatFeedback.death = 900;
        triggerCombatFlash('rgba(239,68,68,1)', .32, 260);
    }
}

function getPlayerRenderRecoil(){
    return { x: combatFeedback.playerRecoilX, y: combatFeedback.playerRecoilY };
}

// El daño al jugador ya tenía inmunidad temporal. Este guard añade una segunda
// barrera explícita: una sola aplicación de daño por frame.
function canApplyPlayerDamage(){
    const p = window.BOMBER_ENGINE?.getPlayer?.() || player;
    const gs = window.BOMBER_ENGINE?.getState?.() || gameState;
    if(p.isInvincible) return false;
    if(p.lastDamageFrame === gs.animFrame) return false;
    p.lastDamageFrame = gs.animFrame;
    return true;
}

function renderBombFuseFeedback(cx,cy,bomb){
    const max= Math.max(1, bomb.maxTimer || 2000);
    const progress=1-clamp01(bomb.timer/max);
    const urgent=bomb.timer<650;
    const pulse=urgent ? (0.65+Math.sin(gameState.animFrame*.7)*.35) : (0.45+Math.sin(gameState.animFrame*.22)*.2);
    ctx.save();
    ctx.strokeStyle=urgent ? `rgba(239,68,68,${pulse})` : `rgba(250,204,21,.72)`;
    ctx.lineWidth=urgent ? 4 : 2;
    ctx.beginPath();
    ctx.arc(cx,cy,TILE_SIZE*.45,-Math.PI/2,-Math.PI/2+progress*Math.PI*2);
    ctx.stroke();

    if(urgent){
        ctx.fillStyle=`rgba(239,68,68,${.10+pulse*.08})`;
        ctx.beginPath(); ctx.arc(cx,cy,TILE_SIZE*.48,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
}

function renderPlayerDamageFeedback(){
    const r=getPlayerRenderRecoil();
    if(combatFeedback.playerHit>0){
        const x=player.x+player.width/2-gameState.camera.x+r.x, y=player.y+player.height/2-gameState.camera.y+r.y;
        const a=Math.min(1, combatFeedback.playerHit/150);
        ctx.save();
        ctx.strokeStyle=combatFeedback.playerHitColor;
        ctx.globalAlpha=.7*a;
        ctx.lineWidth=3;
        ctx.beginPath(); ctx.arc(x,y,player.width*.72+(1-a)*8,0,Math.PI*2); ctx.stroke();
        ctx.restore();
    }
}

function renderCombatFeedback(){
    renderPlayerDamageFeedback();
    if(combatFeedback.flash>0){
        const a=combatFeedback.flashAlpha*Math.min(1,combatFeedback.flash/120);
        ctx.save();
        ctx.fillStyle=combatFeedback.flashColor;
        ctx.globalAlpha=Math.max(0,a);
        ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.restore();
    }
    if(combatFeedback.death>0){
        const p=1-clamp01(combatFeedback.death/900);
        const baseAlpha=(1-p)*.28;
        const alpha=typeof deviceQualityV45FeedbackFlash === 'function'
            ? deviceQualityV45FeedbackFlash(baseAlpha)
            : baseAlpha;
        ctx.save();
        ctx.fillStyle='rgba(127,29,29,1)';
        ctx.globalAlpha=alpha;
        ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.restore();
    }
}

/* Unified pooled visual/audio feedback. */
const FEEDBACK_POOL_CONFIG = Object.freeze({
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

const feedbackPool = {
    installed: false,
    originalUpdate: null,
    originalDraw: null,
    originalExplodeBomb: null,
    originalTakeDamage: null,
    particles: [],
    rings: [],
    flashAlpha: 0,
    flashTimer: 0,
    flashDuration: FEEDBACK_POOL_CONFIG.impactFlashMs,
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

function feedbackPoolClamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function feedbackPoolPoolInit() {
    if (feedbackPool.particles.length !== FEEDBACK_POOL_CONFIG.maxParticles) {
        feedbackPool.particles = Array.from({ length: FEEDBACK_POOL_CONFIG.maxParticles }, () => ({
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

    if (feedbackPool.rings.length !== FEEDBACK_POOL_CONFIG.maxRings) {
        feedbackPool.rings = Array.from({ length: FEEDBACK_POOL_CONFIG.maxRings }, () => ({
            active: false,
            x: 0,
            y: 0,
            radius: 0,
            maxRadius: 0,
            life: 0,
            maxLife: FEEDBACK_POOL_CONFIG.ringLifeMs,
            color: '#fff',
            width: 2
        }));
    }
}

function feedbackPoolFindParticle() {
    for (let i = 0; i < feedbackPool.particles.length; i++) {
        if (!feedbackPool.particles[i].active) return feedbackPool.particles[i];
    }
    return null;
}

function feedbackPoolFindRing() {
    for (let i = 0; i < feedbackPool.rings.length; i++) {
        if (!feedbackPool.rings[i].active) return feedbackPool.rings[i];
    }
    return null;
}

function feedbackPoolSpawnParticles(x, y, color, count, scale = 1) {
    if (!FEEDBACK_POOL_CONFIG.enabled) return;

    const scaledCount = typeof deviceQualityV45FeedbackCount === 'function' ? deviceQualityV45FeedbackCount(count, 'particles') : count;
    const targetCount = Math.min(scaledCount, FEEDBACK_POOL_CONFIG.maxParticles);
    for (let i = 0; i < targetCount; i++) {
        const p = feedbackPoolFindParticle();
        if (!p) break;

        const angle = Math.random() * Math.PI * 2;
        const speed = (
            FEEDBACK_POOL_CONFIG.particleSpeedMin +
            Math.random() * (FEEDBACK_POOL_CONFIG.particleSpeedMax - FEEDBACK_POOL_CONFIG.particleSpeedMin)
        ) * scale;

        p.active = true;
        p.x = x;
        p.y = y;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.size = (1.2 + Math.random() * 2.6) * scale;
        p.maxLife = FEEDBACK_POOL_CONFIG.particleLifeMin +
            Math.random() * (FEEDBACK_POOL_CONFIG.particleLifeMax - FEEDBACK_POOL_CONFIG.particleLifeMin);
        p.life = p.maxLife;
        p.alpha = 0.8 + Math.random() * 0.2;
        p.gravity = 0.012 + Math.random() * 0.02;
        p.color = color;
        feedbackPool.particlesSpawned += 1;
    }
}

function feedbackPoolSpawnRing(x, y, color, scale = 1) {
    if (typeof deviceQualityV45FeedbackCount === 'function' && deviceQualityV45FeedbackCount(1, 'rings') <= 0) return;
    const ring = feedbackPoolFindRing();
    if (!ring) return;

    ring.active = true;
    ring.x = x;
    ring.y = y;
    ring.radius = 5 * scale;
    ring.maxRadius = 28 * scale;
    ring.life = FEEDBACK_POOL_CONFIG.ringLifeMs;
    ring.maxLife = FEEDBACK_POOL_CONFIG.ringLifeMs;
    ring.color = color;
    ring.width = 1.5 + scale;
}

function feedbackPoolKickCamera(amount) {
    try {
        if (!gameState || !gameState.camera) return;
        const camera = gameState.camera;
        if (Number.isFinite(camera.targetX)) camera.targetX += (Math.random() - 0.5) * amount;
        if (Number.isFinite(camera.targetY)) camera.targetY += (Math.random() - 0.5) * amount;
    } catch (_) {}
}

function feedbackPoolFlash(alpha, durationMs) {
    feedbackPool.flashAlpha = Math.max(
        feedbackPool.flashAlpha,
        Math.min(FEEDBACK_POOL_CONFIG.flashMaxAlpha, alpha)
    );
    feedbackPool.flashTimer = Math.max(feedbackPool.flashTimer, durationMs);
    feedbackPool.flashDuration = Math.max(1, durationMs);
}

function feedbackPoolImpact(x, y, color = null, scale = 1) {
    color = color || (typeof themeColorV46 === 'function' ? themeColorV46('particleImpact', '#fde68a') : '#fde68a');
    feedbackPool.impactCount += 1;
    feedbackPoolSpawnParticles(x, y, color, Math.round(7 * scale), scale);
    feedbackPoolSpawnRing(x, y, color, 0.8 * scale);
    feedbackPoolFlash(typeof deviceQualityV45FeedbackFlash === 'function' ? deviceQualityV45FeedbackFlash(0.12 * scale) : 0.12 * scale, FEEDBACK_POOL_CONFIG.impactFlashMs);
    feedbackPoolKickCamera(typeof deviceQualityV45CameraKick === 'function' ? deviceQualityV45CameraKick(FEEDBACK_POOL_CONFIG.cameraKickImpact * scale) : FEEDBACK_POOL_CONFIG.cameraKickImpact * scale);
    feedbackPoolPlaySound('impact', scale);
}

function feedbackPoolExplosion(x, y, color = null, scale = 1) {
    color = color || (typeof themeColorV46 === 'function' ? themeColorV46('particleFire', '#fb923c') : '#fb923c');
    feedbackPool.explosionCount += 1;

    // v6.30.6: al detonar, cancelar cualquier anillo de feedback heredado que
    // coincida con el centro de la bomba. La única silueta de explosión es la
    // llama conectada de 07-render.js; no dibujar círculos ni una segunda capa.
    const tileSize = typeof TILE_SIZE === 'number' && TILE_SIZE > 0 ? TILE_SIZE : 48;
    const clearRadius = tileSize * 1.15;
    for (const ring of feedbackPool.rings) {
        if (!ring.active) continue;
        if (Math.hypot(Number(ring.x) - x, Number(ring.y) - y) <= clearRadius) ring.active = false;
    }
    feedbackPoolFlash(typeof deviceQualityV45FeedbackFlash === 'function' ? deviceQualityV45FeedbackFlash(0.18 * scale) : 0.18 * scale, FEEDBACK_POOL_CONFIG.explosionFlashMs);
    feedbackPoolKickCamera(typeof deviceQualityV45CameraKick === 'function' ? deviceQualityV45CameraKick(FEEDBACK_POOL_CONFIG.cameraKickExplosion * scale) : FEEDBACK_POOL_CONFIG.cameraKickExplosion * scale);
    feedbackPoolPlaySound('explosion', scale);
}

function feedbackPoolDamage(x, y) {
    feedbackPool.damageCount += 1;
    const dangerColor = typeof themeColorV46 === 'function' ? themeColorV46('particleDanger', '#f87171') : '#f87171';
    const softColor = typeof themeColorV46 === 'function' ? themeColorV46('feedbackRingSoft', '#fecaca') : '#fecaca';
    feedbackPoolSpawnParticles(x, y, dangerColor, 8, 0.9);
    feedbackPoolSpawnRing(x, y, softColor, 0.75);
    feedbackPoolFlash(typeof deviceQualityV45FeedbackFlash === 'function' ? deviceQualityV45FeedbackFlash(0.16) : 0.16, FEEDBACK_POOL_CONFIG.impactFlashMs);
    feedbackPoolKickCamera(typeof deviceQualityV45CameraKick === 'function' ? deviceQualityV45CameraKick(2.2) : 2.2);
    feedbackPoolPlaySound('damage', 0.9);
}

function feedbackPoolGetAudioContext() {
    if (!FEEDBACK_POOL_CONFIG.soundEnabled) return null;
    if (feedbackPool.audioContext) return feedbackPool.audioContext;

    try {
        const AudioCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtor) return null;
        feedbackPool.audioContext = new AudioCtor();
        return feedbackPool.audioContext;
    } catch (_) {
        return null;
    }
}

function feedbackPoolPlaySound(kind, scale = 1) {
    if (!FEEDBACK_POOL_CONFIG.soundEnabled) return;

    const now = performance.now();
    if (now - feedbackPool.lastSoundAt < FEEDBACK_POOL_CONFIG.soundCooldownMs) return;
    if (now - feedbackPool.soundWindowStart >= 1000) {
        feedbackPool.soundWindowStart = now;
        feedbackPool.soundWindowCount = 0;
    }
    const maxSounds = typeof getDeviceQualityV45 === 'function'
        ? Math.min(FEEDBACK_POOL_CONFIG.maxSoundsPerSecond, getDeviceQualityV45().maxSoundsPerSecond)
        : FEEDBACK_POOL_CONFIG.maxSoundsPerSecond;
    if (feedbackPool.soundWindowCount >= maxSounds) return;

    const audio = feedbackPoolGetAudioContext();
    if (!audio) return;

    try {
        if (audio.state === 'suspended') audio.resume().catch(() => {});

        const osc = audio.createOscillator();
        const gain = audio.createGain();
        const t = audio.currentTime;
        const safeScale = feedbackPoolClamp(scale, 0.6, 1.6);

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

        feedbackPool.lastSoundAt = now;
        feedbackPool.soundWindowCount += 1;
        feedbackPool.soundsPlayed += 1;
    } catch (_) {}
}

function updatefeedbackPool(dt) {
    const safeDt = feedbackPoolClamp(Number(dt) || 16.6667, 8, 40);

    for (let i = 0; i < feedbackPool.particles.length; i++) {
        const p = feedbackPool.particles[i];
        if (!p.active) continue;

        const scale = safeDt / 16.6667;
        p.x += p.vx * scale;
        p.y += p.vy * scale;
        p.vy += p.gravity * safeDt;
        p.life -= safeDt;

        if (p.life <= 0) p.active = false;
    }

    for (let i = 0; i < feedbackPool.rings.length; i++) {
        const r = feedbackPool.rings[i];
        if (!r.active) continue;

        r.life -= safeDt;
        const progress = 1 - feedbackPoolClamp(r.life / r.maxLife, 0, 1);
        r.radius = 5 * (r.maxRadius / 28) + (r.maxRadius - 5 * (r.maxRadius / 28)) * progress;
        if (r.life <= 0) r.active = false;
    }

    if (feedbackPool.flashTimer > 0) {
        feedbackPool.flashTimer -= safeDt;
        feedbackPool.flashAlpha *= Math.pow(0.82, safeDt / 16.6667);
        if (feedbackPool.flashTimer <= 0 || feedbackPool.flashAlpha < 0.005) {
            feedbackPool.flashTimer = 0;
            feedbackPool.flashAlpha = 0;
        }
    }
}

function feedbackPoolBeginWorldDraw() {
    const cam = gameState && gameState.camera ? gameState.camera : { x: 0, y: 0 };
    ctx.save();
    ctx.translate(-Math.floor(Number.isFinite(cam.x) ? cam.x : 0), -Math.floor(Number.isFinite(cam.y) ? cam.y : 0));
}

function drawfeedbackPool() {
    const quality = typeof getDeviceQualityV45 === 'function' ? getDeviceQualityV45() : null;
    const particlesActive = feedbackPool.particles.some(p => p.active);
    const ringsActive = feedbackPool.rings.some(r => r.active);

    if (particlesActive || ringsActive) {
        feedbackPoolBeginWorldDraw();
        ctx.globalCompositeOperation = 'lighter';

        for (let i = 0; i < feedbackPool.rings.length; i++) {
            const r = feedbackPool.rings[i];
            if (!r.active) continue;
            ctx.globalAlpha = feedbackPoolClamp(r.life / r.maxLife, 0, 1) * 0.7;
            ctx.strokeStyle = r.color;
            ctx.lineWidth = r.width;
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
            ctx.stroke();
        }

        for (let i = 0; i < feedbackPool.particles.length; i++) {
            const p = feedbackPool.particles[i];
            if (!p.active) continue;
            ctx.globalAlpha = feedbackPoolClamp(p.life / p.maxLife, 0, 1) * p.alpha;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }

        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
    }

    if (feedbackPool.flashAlpha > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = feedbackPool.flashAlpha;
        ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('feedbackFlash', '#fff7ed') : '#fff7ed';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }
}

function feedbackPoolCaptureBombPosition(indexOrBomb) {
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

function feedbackPoolWrap() {
    if (feedbackPool.installed) return true;
    if (typeof update !== 'function' || typeof draw !== 'function') return false;

    feedbackPoolPoolInit();

    feedbackPool.originalUpdate = update;
    feedbackPool.originalDraw = draw;

    window.update = function updateV326(dt) {
        const result = feedbackPool.originalUpdate(dt);
        updatefeedbackPool(dt);
        return result;
    };

    window.draw = function drawV326() {
        feedbackPool.originalDraw();
        drawfeedbackPool();
    };

    if (typeof explodeBomb === 'function') {
        feedbackPool.originalExplodeBomb = explodeBomb;
        window.explodeBomb = function explodeBombV326(indexOrBomb, ...rest) {
            const point = feedbackPoolCaptureBombPosition(indexOrBomb);
            const result = feedbackPool.originalExplodeBomb(indexOrBomb, ...rest);
            if (point) feedbackPoolExplosion(point.x, point.y, null, 1);
            return result;
        };
    }

    if (typeof takeDamage === 'function') {
        feedbackPool.originalTakeDamage = takeDamage;
        window.takeDamage = function takeDamageV326(...args) {
            const result = feedbackPool.originalTakeDamage(...args);
            try {
                const px = (player.x || 0) + (player.width || 24) / 2;
                const py = (player.y || 0) + (player.height || 24) / 2;
                feedbackPoolDamage(px, py);
            } catch (_) {}
            return result;
        };
    }

    feedbackPool.installed = true;
    return true;
}

function feedbackPoolBootstrap() {
    if (feedbackPoolWrap()) return;
    setTimeout(feedbackPoolBootstrap, 50);
}

window.FEEDBACK_POOL_CONFIG = FEEDBACK_POOL_CONFIG;
window.feedbackPool = feedbackPool;
window.feedbackPoolImpact = feedbackPoolImpact;
window.feedbackPoolExplosion = feedbackPoolExplosion;
window.feedbackPoolDamage = feedbackPoolDamage;
window.resetfeedbackPool = function resetfeedbackPool() {
    for (let i = 0; i < feedbackPool.particles.length; i++) feedbackPool.particles[i].active = false;
    for (let i = 0; i < feedbackPool.rings.length; i++) feedbackPool.rings[i].active = false;
    feedbackPool.flashAlpha = 0;
    feedbackPool.flashTimer = 0;
};

feedbackPoolBootstrap();
