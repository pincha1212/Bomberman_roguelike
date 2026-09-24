// Bomberman Roguelike v4.1 — Bomb Handling + shared bomb states
// Núcleo de colocación, retención segura, ocupación, mecha y cadenas.

const BOMB_HANDLING = {
    normalFuse: 2000,
    cursedFuse: 1600,
    warningStart: 900,
    placementCooldown: 150,
    holdInitialDelay: 300,
    holdRepeat: 180,
    movePlacementGrace: 90,
};

const bombInputState = {
    held: false,
    source: null,
    startedAt: 0,
    lastRepeatAt: 0,
    blockedByMovement: false
};

const bombHandlingFx = { chainLinks: [] };


// v4.0: todas las bombas comparten una pequeña máquina de estados.
// Separamos lógica de detonación (tile x/y) de su posición visual (worldX/worldY)
// para permitir bombas lanzadas, empujadas, atrapadas o desviadas en futuras habilidades.
const BOMB_V4_STATES = Object.freeze({ MOVING: 'moving', ARMED: 'armed', EXPLODING: 'exploding' });

function ensureBombV4State(bomb){
    if (!bomb || typeof bomb !== 'object') return null;
    if (!bomb.state) bomb.state = bomb.owner === 'boss' ? BOMB_V4_STATES.MOVING : BOMB_V4_STATES.ARMED;
    if (!bomb.motionState) bomb.motionState = bomb.state === BOMB_V4_STATES.MOVING ? BOMB_V4_STATES.MOVING : 'idle';
    if (!Number.isFinite(bomb.worldX)) bomb.worldX = (Number(bomb.x) + .5) * TILE_SIZE;
    if (!Number.isFinite(bomb.worldY)) bomb.worldY = (Number(bomb.y) + .5) * TILE_SIZE;
    if (!Number.isFinite(bomb.motionProgress)) bomb.motionProgress = bomb.state === BOMB_V4_STATES.MOVING ? 0 : 1;
    if (!Number.isFinite(bomb.motionTimer)) bomb.motionTimer = 0;
    if (!Number.isFinite(bomb.motionDuration)) bomb.motionDuration = 0;
    if (!Number.isFinite(bomb.motionStartX)) bomb.motionStartX = bomb.worldX;
    if (!Number.isFinite(bomb.motionStartY)) bomb.motionStartY = bomb.worldY;
    if (!Number.isFinite(bomb.motionTargetX)) bomb.motionTargetX = bomb.worldX;
    if (!Number.isFinite(bomb.motionTargetY)) bomb.motionTargetY = bomb.worldY;
    if (!Number.isFinite(bomb.motionArc)) bomb.motionArc = 0;
    if (!Number.isFinite(bomb.motionRotation)) bomb.motionRotation = 0;
    if (!Number.isFinite(bomb.motionRotationSpeed)) bomb.motionRotationSpeed = 0;
    if (!Number.isFinite(bomb.bobPhase)) bomb.bobPhase = 0;
    if (!bomb.interactionState) bomb.interactionState = 'free';
    if (typeof bomb.canKick !== 'boolean') bomb.canKick = bomb.owner !== 'boss';
    if (typeof bomb.canPush !== 'boolean') bomb.canPush = bomb.owner !== 'boss';
    if (typeof bomb.canCarry !== 'boolean') bomb.canCarry = false;
    if (!Object.prototype.hasOwnProperty.call(bomb, 'carriedBy')) bomb.carriedBy = null;
    if (!Number.isFinite(bomb.timer)) bomb.timer = Number(bomb.fuseTotal || 0);
    return bomb;
}

function startBombV4Motion(bomb, targetX, targetY, durationMs = 360, arc = 18){
    if (!bomb) return false;
    ensureBombV4State(bomb);
    bomb.state = BOMB_V4_STATES.MOVING;
    bomb.motionState = BOMB_V4_STATES.MOVING;
    bomb.motionProgress = 0;
    bomb.motionTimer = Math.max(80, Number(durationMs) || 360);
    bomb.motionDuration = bomb.motionTimer;
    bomb.motionStartX = Number.isFinite(bomb.worldX) ? bomb.worldX : (bomb.x + .5) * TILE_SIZE;
    bomb.motionStartY = Number.isFinite(bomb.worldY) ? bomb.worldY : (bomb.y + .5) * TILE_SIZE;
    bomb.motionTargetX = Number(targetX);
    bomb.motionTargetY = Number(targetY);
    bomb.motionArc = Number.isFinite(arc) ? arc : 18;
    bomb.motionRotation = 0;
    bomb.motionRotationSpeed = 0.18;
    bomb.playerPassThrough = true;
    return true;
}

function armBombV4(bomb){
    if (!bomb) return false;
    ensureBombV4State(bomb);
    bomb.state = BOMB_V4_STATES.ARMED;
    bomb.motionState = 'idle';
    bomb.motionProgress = 1;
    bomb.motionTimer = 0;
    bomb.motionDuration = 0;
    bomb.worldX = (Number(bomb.x) + .5) * TILE_SIZE;
    bomb.worldY = (Number(bomb.y) + .5) * TILE_SIZE;
    bomb.playerPassThrough = false;
    bomb.justArmed = true;
    bomb.timer = Math.max(120, Number(bomb.fuseTotal || bomb.timer || 120));
    bomb.warnBucket = Math.ceil(bomb.timer / 300);
    return true;
}

function getBombV4WorldPosition(bomb){
    ensureBombV4State(bomb);
    return { x: Number(bomb.worldX), y: Number(bomb.worldY) };
}

function updateBombV4Motion(bomb, dt){
    if (!bomb) return false;
    ensureBombV4State(bomb);
    bomb.bobPhase += dt * 0.009;
    if (bomb.state !== BOMB_V4_STATES.MOVING) return false;

    bomb.motionTimer = Math.max(0, bomb.motionTimer - dt);
    const duration = Math.max(1, bomb.motionDuration);
    const raw = 1 - bomb.motionTimer / duration;
    const t = Math.max(0, Math.min(1, raw));
    bomb.motionProgress = t;
    const eased = t * t * (3 - 2 * t);
    const baseX = bomb.motionStartX + (bomb.motionTargetX - bomb.motionStartX) * eased;
    const baseY = bomb.motionStartY + (bomb.motionTargetY - bomb.motionStartY) * eased;
    const arc = Math.sin(Math.PI * eased) * bomb.motionArc;
    bomb.worldX = baseX;
    bomb.worldY = baseY - arc;
    bomb.motionRotation += (bomb.motionRotationSpeed || 0) * Math.max(0.5, Math.min(2, dt / 16.6667));

    if (bomb.motionTimer <= 0) {
        bomb.x = Math.round(bomb.motionTargetX / TILE_SIZE - .5);
        bomb.y = Math.round(bomb.motionTargetY / TILE_SIZE - .5);
        armBombV4(bomb);
        return true;
    }
    return false;
}

function bombV4StateSummary(bomb){
    if (!bomb) return 'N/D';
    ensureBombV4State(bomb);
    return `${bomb.state}/${bomb.motionState}`;
}

function getBombAtTile(gx, gy){
    return gameState.bombs.find(b => {
        if (!b || b.x !== gx || b.y !== gy) return false;
        ensureBombV4State(b);
        return b.state !== BOMB_V4_STATES.MOVING;
    }) || null;
}

function isBombSolidForPlayer(gx, gy){
    const bomb = getBombAtTile(gx, gy);
    if (!bomb) return false;
    return !bomb.playerPassThrough;
}

function markBombEscapeState(){
    // La salida segura termina SOLO cuando la hitbox de movimiento del jugador
    // deja de tocar por completo la casilla de la bomba. Antes se usaba el
    // centro del jugador; eso podía volver sólida la bomba un frame demasiado
    // pronto y dejar al jugador atrapado en su propio borde.
    const playerBox = typeof getMovementHitbox === 'function'
        ? getMovementHitbox(player.x, player.y, player.width, player.height)
        : {
            left: player.x, right: player.x + player.width,
            top: player.y, bottom: player.y + player.height
        };

    gameState.bombs.forEach(bomb => {
        if (!bomb.playerPassThrough) return;

        const bombRect = {
            left: bomb.x * TILE_SIZE,
            right: (bomb.x + 1) * TILE_SIZE,
            top: bomb.y * TILE_SIZE,
            bottom: (bomb.y + 1) * TILE_SIZE
        };

        const stillOverlaps = playerBox.right > bombRect.left &&
            playerBox.left < bombRect.right &&
            playerBox.bottom > bombRect.top &&
            playerBox.top < bombRect.bottom;

        // Mientras cualquier parte de la hitbox siga dentro de la celda,
        // la bomba continúa atravesable para garantizar una huida completa.
        if (!stillOverlaps) {
            bomb.playerPassThrough = false;
            bomb.justArmed = true;
        }
    });
}

function beginBombHold(source='input'){
    if (bombInputState.held) return false;
    bombInputState.held = true;
    bombInputState.source = source;
    bombInputState.startedAt = performance.now();
    bombInputState.lastRepeatAt = 0;
    bombInputState.blockedByMovement = false;
    const placed = requestBombPlacement('press');
    if (!placed && isRecentMovementInput()) {
        bombInputState.blockedByMovement = true;
    }
    return placed;
}

function endBombHold(){
    bombInputState.held = false;
    bombInputState.source = null;
    bombInputState.startedAt = 0;
    bombInputState.lastRepeatAt = 0;
    bombInputState.blockedByMovement = false;
}

function isRecentMovementInput(){
    return player.isMoving && performance.now() - (gameState.lastMoveInputAt || 0) < BOMB_HANDLING.movePlacementGrace;
}

function requestBombPlacement(reason='press'){
    if (!gameState.isPlaying || gameState.paused) return false;
    if (reason === 'press' && isRecentMovementInput()) return false;
    const before = player.bombsPlaced;
    const placed = placeBomb(reason);
    if (placed && player.bombsPlaced > before && navigator.vibrate) {
        try { navigator.vibrate(10); } catch (_) {}
    }
    return placed;
}

function placeBomb(reason='manual'){
    if (!gameState.isPlaying || gameState.paused) return false;
    if ((player.bombCooldown || 0) > 0) return false;
    if (player.bombsPlaced >= player.maxBombs) return false;

    const gx = Math.floor((player.x + player.width / 2) / TILE_SIZE);
    const gy = Math.floor((player.y + player.height / 2) / TILE_SIZE);
    if (getBombAtTile(gx, gy)) return false;
    if (!gameState.grid[gy] || gameState.grid[gy][gx] === TYPES.WALL || gameState.grid[gy][gx] === TYPES.BLOCK) return false;

    const baseFuse = gameState.roomType.id === 'CURSED' ? BOMB_HANDLING.cursedFuse : BOMB_HANDLING.normalFuse;
    const fuseTotal = Math.max(700, Math.round(baseFuse * (typeof getBombFuseMultiplier === 'function' ? getBombFuseMultiplier() : 1)));
    const bomb = {
        id: `bomb-${gameState.animFrame}-${Math.random().toString(36).slice(2,7)}`,
        owner: 'player',
        x: gx, y: gy,
        range: Math.max(1, player.bombRange),
        timer: fuseTotal,
        fuseTotal,
        warnBucket: Math.ceil(fuseTotal / 300),
        scalePulse: 1,
        previewTimer: 650,
        playerPassThrough: true,
        justArmed: false,
        placedAtFrame: gameState.animFrame,
        placementReason: reason,
        previewCells: calculateBombBlastCells({ x: gx, y: gy, range: Math.max(1, player.bombRange) }),
        previewGrid: gameState.grid,
        previewGridRevision: gameState.gridRevision || 0,
        state: BOMB_V4_STATES.ARMED,
        motionState: 'idle',
        worldX: (gx + .5) * TILE_SIZE,
        worldY: (gy + .5) * TILE_SIZE,
        motionProgress: 1,
        motionTimer: 0,
        motionDuration: 0,
        motionStartX: (gx + .5) * TILE_SIZE,
        motionStartY: (gy + .5) * TILE_SIZE,
        motionTargetX: (gx + .5) * TILE_SIZE,
        motionTargetY: (gy + .5) * TILE_SIZE,
        motionArc: 0,
        motionRotation: 0,
        motionRotationSpeed: 0,
        bobPhase: 0,
        countsTowardPlayerCapacity: true
    };

    gameState.bombs.push(bomb);
    player.bombsPlaced++;
    player.bombCooldown = BOMB_HANDLING.placementCooldown;
    if (typeof triggerBombPlacedFeedback === 'function') triggerBombPlacedFeedback(bomb);
    sfx('bomb');
    updateUI(true);
    return true;
}

function resetBombHandlingState(){
    endBombHold();
    player.bombCooldown = 0;
    bombHandlingFx.chainLinks.length = 0;
}

function getExplosionCellRect(exp, inset=5){
    return {
        left: exp.x * TILE_SIZE + inset,
        right: (exp.x + 1) * TILE_SIZE - inset,
        top: exp.y * TILE_SIZE + inset,
        bottom: (exp.y + 1) * TILE_SIZE - inset
    };
}

function explosionOverlapsRect(rect, exp, inset=5){
    const cell = getExplosionCellRect(exp, inset);
    return rect.right > cell.left && rect.left < cell.right &&
           rect.bottom > cell.top && rect.top < cell.bottom;
}

function calculateBombBlastCells(bomb){
    if (!bomb) return [];
    const cells = [{x:bomb.x, y:bomb.y, block:false}];
    const dirs = [{dx:0,dy:-1},{dx:0,dy:1},{dx:-1,dy:0},{dx:1,dy:0}];
    for (const dir of dirs){
        for (let r=1; r<=bomb.range; r++){
            const x=bomb.x+dir.dx*r, y=bomb.y+dir.dy*r;
            if(x<0 || x>=gameState.gridWidth || y<0 || y>=gameState.gridHeight) break;
            const type=gameState.grid[y]?.[x];
            if(type===TYPES.WALL) break;
            const block=type===TYPES.BLOCK;
            cells.push({x,y,block});
            if(block) break;
        }
    }
    return cells;
}



function registerBombChainLink(from,to,index,total){
    bombHandlingFx.chainLinks.push({
        x1:from.x,y1:from.y,x2:to.x,y2:to.y,
        timer:220,max:220,index,total
    });
}

function updateBombInput(dt){
    if(!bombInputState.held || !gameState.isPlaying || gameState.paused) return;
    if(bombInputState.blockedByMovement) return;
    const now=performance.now();
    const heldFor=now-bombInputState.startedAt;
    if(heldFor < BOMB_HANDLING.holdInitialDelay) return;
    if(now-bombInputState.lastRepeatAt < BOMB_HANDLING.holdRepeat) return;
    requestBombPlacement('hold');
    bombInputState.lastRepeatAt=now;
}

function updateBombHandling(dt){
    player.bombCooldown=Math.max(0,(player.bombCooldown||0)-dt);
    updateBombInput(dt);
    markBombEscapeState();

    for(let i=bombHandlingFx.chainLinks.length-1;i>=0;i--){
        bombHandlingFx.chainLinks[i].timer-=dt;
        if(bombHandlingFx.chainLinks[i].timer<=0) bombHandlingFx.chainLinks.splice(i,1);
    }

    for(let i=gameState.bombs.length-1;i>=0;i--){
        const bomb=gameState.bombs[i];
        if(!bomb) continue;
        updateBombV4Motion(bomb, dt);
        ensureBombV4State(bomb);
        if(bomb.state !== BOMB_V4_STATES.ARMED) continue;
        bomb.timer-=dt;
        if(bomb.timer>0 && bomb.timer<=BOMB_HANDLING.warningStart){
            const bucket=Math.ceil(bomb.timer/300);
            if(bucket!==bomb.warnBucket){
                bomb.warnBucket=bucket;
                sfx('bomb');
            }
        }
        if(bomb.timer<=0) explodeBomb(i);
    }
}

function drawBombChainLinks(){
    if(!bombHandlingFx.chainLinks.length) return;
    ctx.save();
    ctx.lineCap='round';
    for(const link of bombHandlingFx.chainLinks){
        const a=link.timer/link.max;
        const x1=(link.x1+.5)*TILE_SIZE, y1=(link.y1+.5)*TILE_SIZE;
        const x2=(link.x2+.5)*TILE_SIZE, y2=(link.y2+.5)*TILE_SIZE;
        ctx.strokeStyle=`rgba(251,191,36,${.25+.7*a})`;
        ctx.lineWidth=2+a*2;
        ctx.setLineDash([6,5]);
        ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle=`rgba(34,211,238,${.15+.45*a})`;
        ctx.beginPath(); ctx.arc(x2,y2,5+4*a,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
}

window.BOMB_V4_STATES = BOMB_V4_STATES;
window.ensureBombV4State = ensureBombV4State;
window.startBombV4Motion = startBombV4Motion;
window.armBombV4 = armBombV4;
window.getBombV4WorldPosition = getBombV4WorldPosition;
window.bombV4StateSummary = bombV4StateSummary;
