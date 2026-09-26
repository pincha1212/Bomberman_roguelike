// Bomberman Roguelike v6.7.1.1 — Bomb Handling + shared bomb states
// Núcleo de colocación, retención segura, ocupación, mecha y cadenas.

const BOMB_HANDLING = {
    normalFuse: 2000,
    cursedFuse: 1600,
    warningStart: 900,
    placementCooldown: 150,
    holdInitialDelay: 300,
    holdRepeat: 180,
    movePlacementGrace: 90,
    playerKickDistance: 4,
    materialKickDistance: 1,
    kickJumpDuration: 190,
    kickJumpArc: TILE_SIZE * .30,
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
    if (!Number.isFinite(bomb.motionTargetTileX)) bomb.motionTargetTileX = Math.round(bomb.motionTargetX / TILE_SIZE - .5);
    if (!Number.isFinite(bomb.motionTargetTileY)) bomb.motionTargetTileY = Math.round(bomb.motionTargetY / TILE_SIZE - .5);
    if (typeof bomb.pendingDetonation !== 'boolean') bomb.pendingDetonation = false;
    if (!Number.isFinite(bomb.motionArc)) bomb.motionArc = 0;
    if (!Number.isFinite(bomb.motionRotation)) bomb.motionRotation = 0;
    if (!Number.isFinite(bomb.motionRotationSpeed)) bomb.motionRotationSpeed = 0;
    if (!Number.isFinite(bomb.bobPhase)) bomb.bobPhase = 0;
    if (!Array.isArray(bomb.motionQueue)) bomb.motionQueue = []; // destinos en coordenadas de CASILLA {x,y}
    if (typeof bomb.preserveTimerOnArm !== 'boolean') bomb.preserveTimerOnArm = false;
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

    const worldTargetX = Number(targetX);
    const worldTargetY = Number(targetY);
    if (!Number.isFinite(worldTargetX) || !Number.isFinite(worldTargetY)) return false;

    const targetTileX = Math.round(worldTargetX / TILE_SIZE - 0.5);
    const targetTileY = Math.round(worldTargetY / TILE_SIZE - 0.5);
    if (targetTileX < 0 || targetTileY < 0 ||
        targetTileX >= gameState.gridWidth || targetTileY >= gameState.gridHeight) {
        // Nunca permitimos que una bomba tenga un objetivo aéreo fuera del mapa.
        return false;
    }

    const startWorldX = Number.isFinite(bomb.worldX)
        ? bomb.worldX
        : (Number(bomb.x) + .5) * TILE_SIZE;
    const startWorldY = Number.isFinite(bomb.worldY)
        ? bomb.worldY
        : (Number(bomb.y) + .5) * TILE_SIZE;
    if (!Number.isFinite(startWorldX) || !Number.isFinite(startWorldY)) return false;

    bomb.state = BOMB_V4_STATES.MOVING;
    bomb.motionState = BOMB_V4_STATES.MOVING;
    bomb.motionProgress = 0;
    bomb.motionTimer = Math.max(80, Number(durationMs) || 360);
    bomb.motionDuration = bomb.motionTimer;
    bomb.motionStartX = startWorldX;
    bomb.motionStartY = startWorldY;
    bomb.motionTargetX = worldTargetX;
    bomb.motionTargetY = worldTargetY;
    bomb.motionTargetTileX = targetTileX;
    bomb.motionTargetTileY = targetTileY;
    bomb.motionArc = Number.isFinite(arc) ? arc : 18;
    bomb.motionRotation = 0;
    bomb.motionRotationSpeed = 0.18;
    bomb.playerPassThrough = true;
    return true;
}

function armBombV4(bomb){
    if (!bomb) return false;
    ensureBombV4State(bomb);
    const preserveTimer = bomb.preserveTimerOnArm === true;
    const remainingTimer = Number(bomb.timer);
    bomb.state = BOMB_V4_STATES.ARMED;
    bomb.motionState = 'idle';
    bomb.motionProgress = 1;
    bomb.motionTimer = 0;
    bomb.motionDuration = 0;
    bomb.worldX = (Number(bomb.x) + .5) * TILE_SIZE;
    bomb.worldY = (Number(bomb.y) + .5) * TILE_SIZE;
    bomb.playerPassThrough = false;
    bomb.justArmed = true;
    if (preserveTimer && Number.isFinite(remainingTimer)) {
        // El salto no regala mecha: si llegó a cero durante el vuelo, queda
        // pendiente de detonación y explota apenas toca suelo.
        bomb.timer = Math.max(0, remainingTimer);
    } else {
        bomb.timer = Math.max(120, Number(bomb.fuseTotal || bomb.timer || 120));
    }
    bomb.preserveTimerOnArm = false;
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
        const targetTileX = Number(bomb.motionTargetTileX);
        const targetTileY = Number(bomb.motionTargetTileY);
        const targetInBounds = Number.isInteger(targetTileX) && Number.isInteger(targetTileY) &&
            targetTileX >= 0 && targetTileY >= 0 &&
            targetTileX < gameState.gridWidth && targetTileY < gameState.gridHeight;

        if (!targetInBounds) {
            // Guardia final: una bomba jamás puede armarse fuera del tablero.
            const safeX = Math.max(0, Math.min(gameState.gridWidth - 1, Number(bomb.x) || 0));
            const safeY = Math.max(0, Math.min(gameState.gridHeight - 1, Number(bomb.y) || 0));
            bomb.x = safeX;
            bomb.y = safeY;
            bomb.worldX = (safeX + .5) * TILE_SIZE;
            bomb.worldY = (safeY + .5) * TILE_SIZE;
            bomb.motionQueue.length = 0;
            bomb.pendingDetonation = false;
            armBombV4(bomb);
            return true;
        }

        bomb.x = targetTileX;
        bomb.y = targetTileY;
        bomb.worldX = (targetTileX + .5) * TILE_SIZE;
        bomb.worldY = (targetTileY + .5) * TILE_SIZE;

        if (bomb.motionQueue.length) {
            // motionQueue SIEMPRE usa coordenadas de CASILLA.
            const next = bomb.motionQueue.shift();
            const nextTileX = Number(next.x);
            const nextTileY = Number(next.y);
            const nextInBounds = Number.isInteger(nextTileX) && Number.isInteger(nextTileY) &&
                nextTileX >= 0 && nextTileY >= 0 &&
                nextTileX < gameState.gridWidth && nextTileY < gameState.gridHeight;

            if (!nextInBounds) {
                bomb.motionQueue.length = 0;
                armBombV4(bomb);
                return true;
            }

            const nextWorldX = (nextTileX + 0.5) * TILE_SIZE;
            const nextWorldY = (nextTileY + 0.5) * TILE_SIZE;
            bomb.motionTargetTileX = nextTileX;
            bomb.motionTargetTileY = nextTileY;
            bomb.preserveTimerOnArm = true;
            if (!startBombV4Motion(
                bomb,
                nextWorldX,
                nextWorldY,
                Number(next.durationMs) || 220,
                Number(next.arc) || TILE_SIZE * .30
            )) {
                bomb.motionQueue.length = 0;
                armBombV4(bomb);
            }
            return true;
        }

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

function getBombKickDirectionV67(){
    const touch=gameState?.touchControls||{};
    if(Math.abs(Number(touch.x))>=Math.abs(Number(touch.y)) && Math.abs(Number(touch.x))>=.25) return {dx:Math.sign(Number(touch.x)),dy:0};
    if(Math.abs(Number(touch.y))>=.25) return {dx:0,dy:Math.sign(Number(touch.y))};
    const keys=gameState?.keys||{};
    if(keys.ArrowLeft||keys.KeyA) return {dx:-1,dy:0};
    if(keys.ArrowRight||keys.KeyD) return {dx:1,dy:0};
    if(keys.ArrowUp||keys.KeyW) return {dx:0,dy:-1};
    if(keys.ArrowDown||keys.KeyS) return {dx:0,dy:1};
    if (['up','down','left','right'].includes(player?.dir)) {
        if (player.dir === 'left') return {dx:-1,dy:0};
        if (player.dir === 'right') return {dx:1,dy:0};
        if (player.dir === 'up') return {dx:0,dy:-1};
        if (player.dir === 'down') return {dx:0,dy:1};
    }
    return {dx:0,dy:0};
}

function isBombKickTileFreeV67(gx,gy,bomb){
    if(gx<0||gy<0||gx>=gameState.gridWidth||gy>=gameState.gridHeight) return false;
    const tile=gameState.grid?.[gy]?.[gx];
    if(tile===TYPES.WALL||tile===TYPES.BLOCK) return false;
    if(typeof isMaterialBlockingTileV67==='function' && isMaterialBlockingTileV67(gx,gy)) return false;
    return !gameState.bombs.some(other=>other&&other!==bomb&&other.x===gx&&other.y===gy);
}

function queueBombJumpSequenceV67(bomb, dx, dy, distance, durationMs = 190, arc = TILE_SIZE * .30){
    if(!bomb) return false;
    ensureBombV4State(bomb);
    if(Math.abs(dx)+Math.abs(dy)!==1) return false;

    const jumpDistance = Math.max(1, Math.floor(Number(distance) || 1));
    const sx = Math.floor(Number(bomb.x));
    const sy = Math.floor(Number(bomb.y));
    const tx = sx + dx * jumpDistance;
    const ty = sy + dy * jumpDistance;

    // La trayectoria aérea puede atravesar paredes y bloques.
    // La ÚLTIMA casilla debe ser suelo real para que la bomba pueda caer.
    if(!isBombKickTileFreeV67(tx,ty,bomb)) return false;

    bomb.motionQueue.length=0;
    for(let step=1; step<=jumpDistance; step++){
        bomb.motionQueue.push({
            x:sx + dx * step,
            y:sy + dy * step,
            durationMs,
            arc
        });
    }

    const first=bomb.motionQueue.shift();
    if(!first){
        bomb.motionQueue.length=0;
        return false;
    }

    bomb.preserveTimerOnArm=true;
    bomb.interactionState='kicked';
    bomb.kickCount=Number(bomb.kickCount||0)+1;
    startBombV4Motion(
        bomb,
        (first.x+.5)*TILE_SIZE,
        (first.y+.5)*TILE_SIZE,
        Number(first.durationMs)||durationMs,
        Number(first.arc)||arc
    );
    return true;
}

function kickBombV67(bomb,dx,dy){
    if(!bomb||!player||player.kickTimer<=0) return false;
    ensureBombV4State(bomb);
    if(!bomb.canKick||bomb.owner!=='player'||bomb.state!==BOMB_V4_STATES.ARMED||player.kickCooldown>0) return false;
    if(Math.abs(dx)+Math.abs(dy)!==1) return false;
    const kickDistance = Math.max(1, Math.floor(Number(BOMB_HANDLING.playerKickDistance) || 4));
    if(!queueBombJumpSequenceV67(bomb,dx,dy,kickDistance,BOMB_HANDLING.kickJumpDuration,BOMB_HANDLING.kickJumpArc)) return false;
    player.kickCooldown=180;
    return true;
}

function tryKickPlayerBombsV67(){
    if(!player||player.kickTimer<=0||player.kickCooldown>0) return false;
    const dir=getBombKickDirectionV67(); if(!dir.dx&&!dir.dy) return false;
    const px=Math.floor((player.x+player.width/2)/TILE_SIZE), py=Math.floor((player.y+player.height/2)/TILE_SIZE);
    const bomb=gameState.bombs.find(b=>b&&b.owner==='player'&&b.x===px+dir.dx&&b.y===py+dir.dy&&b.state===BOMB_V4_STATES.ARMED);
    return !!bomb&&kickBombV67(bomb,dir.dx,dir.dy);
}

function placeBomb(reason='manual'){
    if (!gameState.isPlaying || gameState.paused) return false;
    if ((player.bombCooldown || 0) > 0) return false;
    if (player.bombsPlaced >= player.maxBombs) return false;

    const gx = Math.floor((player.x + player.width / 2) / TILE_SIZE);
    const gy = Math.floor((player.y + player.height / 2) / TILE_SIZE);
    if (getBombAtTile(gx, gy)) return false;
    if (!gameState.grid[gy] || gameState.grid[gy][gx] === TYPES.WALL || gameState.grid[gy][gx] === TYPES.BLOCK) return false;
    const materialMods = typeof getBombMaterialModifiersV67 === 'function' ? getBombMaterialModifiersV67(gx, gy) : { fuseMultiplier:1, canPlace:true, kickOnPlace:false };
    if (!materialMods.canPlace) return false;

    const baseFuse = gameState.roomType.id === 'CURSED' ? BOMB_HANDLING.cursedFuse : BOMB_HANDLING.normalFuse;
    const fuseTotal = Math.max(700, Math.round(baseFuse * (typeof getBombFuseMultiplier === 'function' ? getBombFuseMultiplier() : 1) * materialMods.fuseMultiplier));
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
        motionQueue: [],
        preserveTimerOnArm: false,
        countsTowardPlayerCapacity: true
    };

    gameState.bombs.push(bomb);
    player.bombsPlaced++;
    if (materialMods.kickOnPlace) {
        const dir = getBombKickDirectionV67();
        if (dir.dx || dir.dy) {
            const tx = gx + dir.dx, ty = gy + dir.dy;
            queueBombJumpSequenceV67(
                bomb,
                dir.dx,
                dir.dy,
                Math.max(1, Math.floor(Number(BOMB_HANDLING.materialKickDistance) || 1)),
                220,
                TILE_SIZE * .22
            );
        }
    }
    if (typeof playerFSMStartBomb === 'function') playerFSMStartBomb();
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

function bombUpdate(dt){
    // ÚNICA FUENTE DE VERDAD DEL CICLO DE VIDA DE LAS BOMBAS.
    // Todo: cooldowns, movimiento, salto, mecha, límites y detonación pasa por aquí.
    player.bombCooldown=Math.max(0,(player.bombCooldown||0)-dt);
    player.kickTimer=Math.max(0,(player.kickTimer||0)-dt);
    player.kickCooldown=Math.max(0,(player.kickCooldown||0)-dt);
    tryKickPlayerBombsV67();
    updateBombInput(dt);
    markBombEscapeState();

    for(let i=bombHandlingFx.chainLinks.length-1;i>=0;i--){
        bombHandlingFx.chainLinks[i].timer-=dt;
        if(bombHandlingFx.chainLinks[i].timer<=0) bombHandlingFx.chainLinks.splice(i,1);
    }

    for(let i=gameState.bombs.length-1;i>=0;i--){
        const bomb=gameState.bombs[i];
        if(!bomb) continue;
        ensureBombV4State(bomb);

        // La mecha corre también durante el vuelo. Si llega a cero, se marca
        // pendiente y se resuelve al aterrizar; nunca explota en mitad del aire.
        bomb.timer-=dt;
        if(bomb.timer<=0) bomb.pendingDetonation=true;

        updateBombV4Motion(bomb, dt);
        ensureBombV4State(bomb);

        if(bomb.state !== BOMB_V4_STATES.ARMED) continue;
        if(bomb.timer>0 && bomb.timer<=BOMB_HANDLING.warningStart){
            const bucket=Math.ceil(bomb.timer/300);
            if(bucket!==bomb.warnBucket){
                bomb.warnBucket=bucket;
                sfx('bomb');
            }
        }

        if(bomb.pendingDetonation || bomb.timer<=0){
            bomb.pendingDetonation=false;
            explodeBomb(i);
        }
    }
}

// Compatibilidad: el loop existente sigue llamando updateBombHandling(), pero
// ya no contiene lógica propia. Desde v6.7.1 todo desemboca en bombUpdate().
function updateBombHandling(dt){
    return bombUpdate(dt);
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
window.kickBombV67 = kickBombV67;
window.queueBombJumpSequenceV67 = queueBombJumpSequenceV67;
window.bombUpdate = bombUpdate;
window.updateBombHandling = updateBombHandling;
window.tryKickPlayerBombsV67 = tryKickPlayerBombsV67;
