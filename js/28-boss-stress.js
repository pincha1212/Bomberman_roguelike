/* v4.1 Boss Bomb Stress Test */

function bossV41BuildSyntheticBoss(hpRatio) {
    return { health: 1000 * hpRatio, maxHealth: 1000, x: 7.5 * TILE_SIZE, y: 7.5 * TILE_SIZE, width: TILE_SIZE * 2, height: TILE_SIZE * 2, defeated: false, phase: 1 };
}

function bossV41Stress() {
    const phaseCases = [
        { name: 'phase-1', ratio: 0.90, expected: 1 },
        { name: 'phase-2', ratio: 0.50, expected: 2 },
        { name: 'phase-3', ratio: 0.20, expected: 3 },
        { name: 'threshold-2', ratio: 0.66, expected: 2 },
        { name: 'threshold-3', ratio: 0.33, expected: 3 }
    ];
    const phaseResults = phaseCases.map(c => {
        const boss = bossV41BuildSyntheticBoss(c.ratio);
        const phase = bossV41GetPhase(boss);
        return { name: c.name, phase, expected: c.expected, pass: phase === c.expected };
    });

    const oldBoss = gameState?.boss;
    const oldBombs = Array.isArray(gameState?.bombs) ? gameState.bombs : [];
    const oldPlaying = gameState?.isPlaying;
    const oldPlayer = { x: player.x, y: player.y, width: player.width, height: player.height };
    const oldGrid = gameState?.grid;
    const oldW = gameState?.gridWidth;
    const oldH = gameState?.gridHeight;
    const oldRoomType = gameState?.roomType;
    const oldScore = gameState?.score;
    const oldBlocks = gameState?.blocksBroken;
    const oldGridRevision = gameState?.gridRevision;
    const oldExplosions = gameState?.explosions;
    const oldItems = gameState?.items;
    const oldBossProjectiles = gameState?.bossProjectiles;
    const oldBossProjectilesV325 = gameState?.bossProjectilesV325;
    let bombPass = false;
    let movementPass = false;
    let capPass = false;
    let slamPass = false;
    let noProjectilePass = false;

    try {
        gameState.isPlaying = true;
        gameState.gridWidth = 15;
        gameState.gridHeight = 15;
        gameState.grid = Array.from({ length: 15 }, () => Array(15).fill(TYPES.EMPTY));
        for (let i = 0; i < 15; i++) { gameState.grid[0][i] = TYPES.WALL; gameState.grid[14][i] = TYPES.WALL; gameState.grid[i][0] = TYPES.WALL; gameState.grid[i][14] = TYPES.WALL; }
        gameState.bombs = [];
        gameState.explosions = [];
        gameState.bossProjectiles = [];
        gameState.bossProjectilesV325 = [];
        gameState.boss = { x: 7.5 * TILE_SIZE, y: 7.5 * TILE_SIZE, width: TILE_SIZE * 2, height: TILE_SIZE * 2, hp: 200, maxHp: 200, phase: 2, defeated: false };
        gameState.roomType = { coinMult: 1, dropChance: 0 };
        gameState.score = 0;
        gameState.blocksBroken = 0;
        gameState.gridRevision = 0;
        player.x = 2 * TILE_SIZE; player.y = 2 * TILE_SIZE; player.width = TILE_SIZE * .7; player.height = TILE_SIZE * .7;
        BossV41.state = null;
        bossV41EnsureState();
        BossV41.state.phase = 2;

        const spawned = bossV41FireBombVolley();
        const bombs = gameState.bombs.filter(b => b.owner === 'boss');
        const targets = new Set(bombs.map(b => `${b.x},${b.y}`));
        bombPass = spawned === 2 && bombs.length === 2 && targets.size === 2 && bombs.every(b => b.countsTowardPlayerCapacity === false && b.state === BOMB_V4_STATES.MOVING && b.range === 3);

        const first = bombs[0];
        if (first) {
            const start = { x: first.worldX, y: first.worldY };
            for (let i = 0; i < 40; i++) updateBombV4Motion(first, 16.6667);
            movementPass = first.state === BOMB_V4_STATES.ARMED && first.motionProgress === 1 && (Math.abs(first.worldX - start.x) + Math.abs(first.worldY - start.y) > 5);
        }

        gameState.bombs.length = 0;
        for (let i = 0; i < BOSS_V41_CONFIG.bossBombCap + 3; i++) bossV41SpawnBomb();
        capPass = gameState.bombs.filter(b => b.owner === 'boss').length <= BOSS_V41_CONFIG.bossBombCap;

        gameState.bombs.length = 0;
        BossV41.state.phase = 3;
        slamPass = bossV41GroundSlam() === BOSS_V41_CONFIG.slamRange.phase3 && gameState.explosions.filter(e => e.owner === 'boss').length >= 13;
        noProjectilePass = (!gameState.bossProjectilesV325 || gameState.bossProjectilesV325.length === 0) && (!gameState.bossProjectiles || gameState.bossProjectiles.length === 0);
    } finally {
        gameState.boss = oldBoss; gameState.bombs = oldBombs; gameState.isPlaying = oldPlaying; gameState.grid = oldGrid; gameState.gridWidth = oldW; gameState.gridHeight = oldH;
        gameState.roomType = oldRoomType; gameState.score = oldScore; gameState.blocksBroken = oldBlocks; gameState.gridRevision = oldGridRevision;
        gameState.explosions = oldExplosions; gameState.items = oldItems;
        gameState.bossProjectiles = oldBossProjectiles;
        gameState.bossProjectilesV325 = oldBossProjectilesV325;
        player.x = oldPlayer.x; player.y = oldPlayer.y; player.width = oldPlayer.width; player.height = oldPlayer.height;
        BossV41.state = null;
    }

    const phasePassed = phaseResults.filter(r => r.pass).length;
    if (phasePassed !== phaseResults.length || !bombPass || !movementPass || !capPass || !slamPass || !noProjectilePass) {
        throw new Error(`Boss Stress: ${phasePassed}/${phaseResults.length} fases PASS · bombas=${bombPass?'PASS':'FAIL'} · movimiento=${movementPass?'PASS':'FAIL'} · slam=${slamPass?'PASS':'FAIL'} · proyectiles=${noProjectilePass?'0':'FAIL'} · cap=${capPass?'PASS':'FAIL'}`);
    }

    return {
        summary: `Boss Bomb Stress: ${phasePassed}/${phaseResults.length} fases · bombas=PASS · movimiento=PASS · slam=PASS · proyectiles=0 · cap=${BOSS_V41_CONFIG.bossBombCap}`,
        details: {
            phases: phaseResults,
            attacks: ['bomb-throw', 'ground-slam'],
            bombStates: [BOMB_V4_STATES.MOVING, BOMB_V4_STATES.ARMED, BOMB_V4_STATES.EXPLODING],
            ranges: BOSS_V41_CONFIG.bombRange,
            slamRange: BOSS_V41_CONFIG.slamRange,
            noProjectiles: true,
            perFramePathfinding: false
        }
    };
}

if (window.DEBUG_TESTS) window.DEBUG_TESTS['boss-stress'] = bossV41Stress;
window.bossV41Stress = bossV41Stress;
window.bossV325Stress = bossV41Stress;
