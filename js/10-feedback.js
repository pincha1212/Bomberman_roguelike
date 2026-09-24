// Bomberman Roguelike v3.9 — Combat & Feedback
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
    addParticles((bomb.x + .5) * TILE_SIZE, (bomb.y + .5) * TILE_SIZE, '#fbbf24', 8);
}

function triggerEnemyDefeatFeedback(e){
    const color = e.elite ? '#fb7185' : '#38bdf8';
    addParticles(e.x, e.y, color, e.elite ? 22 : 15);
    addFloatingText(e.elite ? '★ KO ELITE' : 'KO', e.x, e.y - e.height * .55, color);
    triggerCombatFlash('rgba(56,189,248,1)', e.elite ? .16 : .09, 75);
    sfx('enemyKill');
}

function triggerBossHitFeedback(b){
    addParticles(b.x, b.y, '#fb7185', 12);
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
        source === 'boss-contact' || source === 'boss-projectile' ? '#c084fc' :
        source === 'trap' ? '#f43f5e' : '#ef4444';

    const sourceLabel = shield ? 'ESCUDO' :
        source === 'boss-contact' || source === 'boss-projectile' ? 'JEFE' :
        source === 'trap' ? 'TRAMPA' :
        source === 'explosion' ? 'EXPLOSIÓN' : 'IMPACTO';
    const sourceColor = shield ? '#38bdf8' :
        source === 'boss-contact' || source === 'boss-projectile' ? '#c084fc' :
        source === 'trap' ? '#f43f5e' : '#ef4444';
    if(!shield || source !== 'unknown') addFloatingText(`¡${sourceLabel}!`, p.x, p.y - p.height * .7, sourceColor);
    triggerCombatFlash(shield ? 'rgba(56,189,248,1)' :
        source === 'boss-contact' || source === 'boss-projectile' ? 'rgba(192,132,252,1)' :
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

function getBombBlastPreviewCells(bomb){
    if(!bomb) return [];
    if (bomb.previewCells && bomb.previewGrid === gameState.grid && bomb.previewGridRevision === (gameState.gridRevision || 0)) return bomb.previewCells;
    if(typeof calculateBombBlastCells === 'function') {
        bomb.previewCells = calculateBombBlastCells(bomb);
        bomb.previewGrid = gameState.grid;
        bomb.previewGridRevision = gameState.gridRevision || 0;
        return bomb.previewCells;
    }
    const cells = [{x:bomb.x,y:bomb.y}];
    const dirs = [{dx:0,dy:-1},{dx:0,dy:1},{dx:-1,dy:0},{dx:1,dy:0}];
    for(const dir of dirs){
        for(let r=1;r<=bomb.range;r++){
            const x=bomb.x+dir.dx*r, y=bomb.y+dir.dy*r;
            if(x<0||x>=gameState.gridWidth||y<0||y>=gameState.gridHeight) break;
            const type=gameState.grid[y][x];
            if(type===TYPES.WALL) break;
            cells.push({x,y,block:type===TYPES.BLOCK});
            if(type===TYPES.BLOCK) break;
        }
    }
    return cells;
}

function renderBombRangePreview(bomb){
    if(!bomb || !bomb.previewTimer || bomb.previewTimer<=0) return;
    const cells=getBombBlastPreviewCells(bomb);
    const alpha=0.08 + clamp01(bomb.previewTimer/650)*0.15;
    ctx.save();
    ctx.lineWidth=2;
    for(const c of cells){
        const x=c.x*TILE_SIZE+4, y=c.y*TILE_SIZE+4;
        ctx.fillStyle=`rgba(251,191,36,${alpha})`;
        ctx.fillRect(x,y,TILE_SIZE-8,TILE_SIZE-8);
        ctx.strokeStyle=`rgba(254,240,138,${Math.min(.85,alpha*4.3)})`;
        ctx.strokeRect(x,y,TILE_SIZE-8,TILE_SIZE-8);
        if(c.block){
            ctx.strokeStyle='rgba(249,115,22,.7)';
            ctx.strokeRect(x+5,y+5,TILE_SIZE-18,TILE_SIZE-18);
        }
    }
    ctx.restore();
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
