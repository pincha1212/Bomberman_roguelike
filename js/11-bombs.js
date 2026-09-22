// Bomberman Roguelike v3.10 — Bomb handling, input gating and bomb occupancy
// Este módulo concentra las reglas de colocación, temporizadores y salida segura de bombas.

const BOMB_HANDLING = {
    normalFuse: 2000,
    cursedFuse: 1600,
    warningStart: 900,
    placementCooldown: 140,
    escapeCenterPadding: 0.12
};

function getBombAtTile(gx, gy){
    return gameState.bombs.find(b => b.x === gx && b.y === gy) || null;
}

function isBombSolidForPlayer(gx, gy){
    const bomb = getBombAtTile(gx, gy);
    if (!bomb) return false;

    // La bomba recién colocada puede atravesarse desde su propia casilla.
    // En cuanto el jugador abandona esa casilla, la bomba se convierte en un bloqueo.
    return !bomb.playerPassThrough;
}

function markBombEscapeState(){
    const pgx = Math.floor((player.x + player.width / 2) / TILE_SIZE);
    const pgy = Math.floor((player.y + player.height / 2) / TILE_SIZE);

    gameState.bombs.forEach(bomb => {
        if (!bomb.playerPassThrough) return;

        if (pgx !== bomb.x || pgy !== bomb.y) {
            bomb.playerPassThrough = false;
            bomb.justArmed = true;
        }
    });
}

function requestBombPlacement(){
    if (!gameState.isPlaying || gameState.paused) return false;
    const before = player.bombsPlaced;
    placeBomb();
    const placed = player.bombsPlaced > before;

    if (placed && navigator.vibrate) {
        try { navigator.vibrate(12); } catch (_) {}
    }
    return placed;
}

function placeBomb(){
    if (!gameState.isPlaying || gameState.paused) return false;
    if (player.bombCooldown > 0) return false;
    if (player.bombsPlaced >= player.maxBombs) return false;

    const gx = Math.floor((player.x + player.width / 2) / TILE_SIZE);
    const gy = Math.floor((player.y + player.height / 2) / TILE_SIZE);

    if (getBombAtTile(gx, gy)) return false;

    const fuseTotal = gameState.roomType.id === 'CURSED'
        ? BOMB_HANDLING.cursedFuse
        : BOMB_HANDLING.normalFuse;

    gameState.bombs.push({
        x: gx,
        y: gy,
        range: player.bombRange,
        timer: fuseTotal,
        fuseTotal,
        warnBucket: Math.ceil(fuseTotal / 300),
        scalePulse: 1.0,
        playerPassThrough: true,
        justArmed: false
    });

    player.bombsPlaced++;
    player.bombCooldown = BOMB_HANDLING.placementCooldown;

    sfx('bomb');
    if (typeof feedbackBombPlaced === 'function') feedbackBombPlaced(gx, gy);
    updateUI(true);
    return true;
}

function updateBombHandling(dt){
    player.bombCooldown = Math.max(0, (player.bombCooldown || 0) - dt);
    markBombEscapeState();

    for (let i = gameState.bombs.length - 1; i >= 0; i--) {
        const bomb = gameState.bombs[i];
        bomb.timer -= dt;

        if (bomb.timer > 0 && bomb.timer <= BOMB_HANDLING.warningStart) {
            const warnBucket = Math.ceil(bomb.timer / 300);
            if (warnBucket !== bomb.warnBucket) {
                bomb.warnBucket = warnBucket;
                sfx('bomb');
                if (typeof feedbackBombWarning === 'function') feedbackBombWarning(bomb.x, bomb.y);
            }
        }

        if (bomb.timer <= 0) explodeBomb(i);
    }
}
