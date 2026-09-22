// Bomberman Roguelike v3.9 — Combat feedback system
// Visual/temporal feedback only: does not alter damage values, enemy stats or movement rules.
const combatFeedback = {
    hitStopTimer: 0,
    damageFlash: 0,
    impactFlash: 0,
    bombFlash: 0,
    events: [],
    lastReset: 0
};

function resetCombatFeedback(){
    combatFeedback.hitStopTimer = 0;
    combatFeedback.damageFlash = 0;
    combatFeedback.impactFlash = 0;
    combatFeedback.bombFlash = 0;
    combatFeedback.events.length = 0;
    combatFeedback.lastReset = performance.now();
}

function feedbackHitStop(duration = 45){
    combatFeedback.hitStopTimer = Math.max(combatFeedback.hitStopTimer, duration);
}

function feedbackRing(x, y, color, scale = 1){
    combatFeedback.events.push({
        kind: 'ring', x, y,
        radius: 5,
        maxRadius: 28 * scale,
        life: 220,
        maxLife: 220,
        color
    });
    if (combatFeedback.events.length > 28) combatFeedback.events.splice(0, combatFeedback.events.length - 28);
}

function feedbackPlayerDamage(shieldBreak = false){
    combatFeedback.damageFlash = Math.max(combatFeedback.damageFlash, shieldBreak ? 130 : 180);
    combatFeedback.impactFlash = Math.max(combatFeedback.impactFlash, shieldBreak ? 90 : 120);
    feedbackHitStop(shieldBreak ? 45 : 75);
    feedbackRing(player.x + player.width / 2, player.y + player.height / 2, shieldBreak ? '#38bdf8' : '#ef4444', shieldBreak ? 1.15 : 1.35);
}

function feedbackEnemyDefeat(x, y, elite = false){
    feedbackHitStop(elite ? 50 : 35);
    feedbackRing(x, y, elite ? '#fb7185' : '#38bdf8', elite ? 1.35 : 1);
    combatFeedback.impactFlash = Math.max(combatFeedback.impactFlash, elite ? 80 : 45);
}

function feedbackBossHit(x, y){
    feedbackHitStop(65);
    feedbackRing(x, y, '#fb7185', 1.35);
    combatFeedback.impactFlash = Math.max(combatFeedback.impactFlash, 85);
}

function feedbackBossDefeat(x, y){
    feedbackHitStop(90);
    for(let i = 0; i < 5; i++) feedbackRing(x + (Math.random() - .5) * 30, y + (Math.random() - .5) * 30, '#f43f5e', 1 + i * .18);
    combatFeedback.impactFlash = Math.max(combatFeedback.impactFlash, 170);
}

function feedbackBombPlaced(x, y){
    combatFeedback.bombFlash = 110;
    feedbackRing((x + .5) * TILE_SIZE, (y + .5) * TILE_SIZE, '#facc15', .72);
}

function feedbackBombWarning(x, y){
    feedbackRing((x + .5) * TILE_SIZE, (y + .5) * TILE_SIZE, '#ef4444', .62);
}

function feedbackExplosion(x, y){
    feedbackHitStop(32);
    combatFeedback.impactFlash = Math.max(combatFeedback.impactFlash, 50);
    feedbackRing((x + .5) * TILE_SIZE, (y + .5) * TILE_SIZE, '#fb923c', 1.6);
}

function updateCombatFeedback(dt){
    combatFeedback.hitStopTimer = Math.max(0, combatFeedback.hitStopTimer - dt);
    combatFeedback.damageFlash = Math.max(0, combatFeedback.damageFlash - dt);
    combatFeedback.impactFlash = Math.max(0, combatFeedback.impactFlash - dt);
    combatFeedback.bombFlash = Math.max(0, combatFeedback.bombFlash - dt);

    for(let i = combatFeedback.events.length - 1; i >= 0; i--){
        const ev = combatFeedback.events[i];
        ev.life -= dt;
        if(ev.life <= 0){
            combatFeedback.events.splice(i, 1);
            continue;
        }
        const progress = 1 - ev.life / ev.maxLife;
        ev.radius = 5 + (ev.maxRadius - 5) * Math.min(1, progress);
    }
}

function drawCombatFeedbackOverlay(){
    const hasWorldEvents = combatFeedback.events.length > 0;
    if(hasWorldEvents){
        ctx.save();
        ctx.lineWidth = 2;
        for(const ev of combatFeedback.events){
            const sx = ev.x - gameState.camera.x;
            const sy = ev.y - gameState.camera.y;
            const alpha = Math.max(0, ev.life / ev.maxLife);
            ctx.globalAlpha = alpha * .9;
            ctx.strokeStyle = ev.color;
            ctx.beginPath();
            ctx.arc(sx, sy, ev.radius, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
    }

    if(combatFeedback.impactFlash > 0){
        const alpha = (combatFeedback.impactFlash / 170) * .12;
        ctx.fillStyle = `rgba(255,255,255,${Math.min(.12, alpha)})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if(combatFeedback.damageFlash > 0){
        const alpha = Math.min(.24, (combatFeedback.damageFlash / 180) * .24);
        const gradient = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.width * .08, canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * .72);
        gradient.addColorStop(0, `rgba(239,68,68,0)`);
        gradient.addColorStop(.62, `rgba(239,68,68,${alpha * .35})`);
        gradient.addColorStop(1, `rgba(127,29,29,${alpha})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}
