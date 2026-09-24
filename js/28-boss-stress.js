/* v4.0 Boss Stress Test */

function bossV325BuildSyntheticBoss(hpRatio) {
    return {
        health: 1000 * hpRatio,
        maxHealth: 1000,
        x: 360,
        y: 360,
        defeated: false
    };
}

function bossV325Stress() {
    const phaseCases = [
        { name: 'phase-1', ratio: 0.90, expected: 1 },
        { name: 'phase-2', ratio: 0.50, expected: 2 },
        { name: 'phase-3', ratio: 0.20, expected: 3 },
        { name: 'threshold-2', ratio: 0.66, expected: 2 },
        { name: 'threshold-3', ratio: 0.33, expected: 3 }
    ];
    const phaseResults = phaseCases.map(c => {
        const boss = bossV325BuildSyntheticBoss(c.ratio);
        const phase = bossV325GetPhase(boss);
        return { name:c.name, phase, expected:c.expected, pass:phase===c.expected };
    });

    const oldBoss = gameState?.boss;
    const oldBombs = Array.isArray(gameState?.bombs) ? gameState.bombs : [];
    const oldPlaying = gameState?.isPlaying;
    const oldPlayer = {x:player.x,y:player.y,width:player.width,height:player.height};
    const oldGrid = gameState?.grid;
    const oldW = gameState?.gridWidth;
    const oldH = gameState?.gridHeight;
    let bossBombPass = false;
    let capPass = false;
    let movementPass = false;

    try {
        gameState.isPlaying = true;
        gameState.gridWidth = 15;
        gameState.gridHeight = 15;
        gameState.grid = Array.from({length:15},()=>Array(15).fill(TYPES.EMPTY));
        for(let i=0;i<15;i++){ gameState.grid[0][i]=TYPES.WALL; gameState.grid[14][i]=TYPES.WALL; gameState.grid[i][0]=TYPES.WALL; gameState.grid[i][14]=TYPES.WALL; }
        gameState.bombs = [];
        gameState.boss = { x:7*TILE_SIZE+TILE_SIZE/2, y:7*TILE_SIZE+TILE_SIZE/2, width:TILE_SIZE*2, height:TILE_SIZE*2, hp:200, maxHp:200, phase:2, defeated:false };
        player.x = 2*TILE_SIZE;
        player.y = 2*TILE_SIZE;
        player.width = TILE_SIZE*.7;
        player.height = TILE_SIZE*.7;
        BossV325.state = null;
        bossV325EnsureState();

        const spawned = bossV4FireBombVolley();
        const bossBombs = gameState.bombs.filter(b=>b.owner==='boss');
        const uniqueTargets = new Set(bossBombs.map(b=>`${b.x},${b.y}`));
        bossBombPass = spawned > 0 && bossBombs.length === spawned && uniqueTargets.size === bossBombs.length && bossBombs.every(b => b.countsTowardPlayerCapacity === false && b.state === BOMB_V4_STATES.MOVING);

        const first = bossBombs[0];
        if (first) {
            const start = {x:first.worldX,y:first.worldY};
            for(let i=0;i<40;i++) updateBombV4Motion(first,16.6667);
            movementPass = first.state === BOMB_V4_STATES.ARMED && first.motionProgress === 1 && (Math.abs(first.worldX-start.x) + Math.abs(first.worldY-start.y) > 5);
        }

        gameState.bombs.length = 0;
        for(let i=0;i<BOSS_V325_CONFIG.bossBombCap+3;i++) bossV4SpawnBomb();
        capPass = gameState.bombs.filter(b=>b.owner==='boss').length <= BOSS_V325_CONFIG.bossBombCap;
    } finally {
        gameState.boss = oldBoss;
        gameState.bombs = oldBombs;
        gameState.isPlaying = oldPlaying;
        gameState.grid = oldGrid;
        gameState.gridWidth = oldW;
        gameState.gridHeight = oldH;
        player.x=oldPlayer.x; player.y=oldPlayer.y; player.width=oldPlayer.width; player.height=oldPlayer.height;
        BossV325.state = null;
    }

    const phasePassed = phaseResults.filter(r=>r.pass).length;
    const total = phaseResults.length;
    if(phasePassed !== total || !bossBombPass || !movementPass || !capPass) {
        throw new Error(`Boss Stress: ${phasePassed}/${total} fases PASS · bombas=${bossBombPass?'PASS':'FAIL'} · movimiento=${movementPass?'PASS':'FAIL'} · cap=${capPass?'PASS':'FAIL'}`);
    }
    return {
        summary:`Boss Stress: ${phasePassed}/${total} fases PASS · bombas aleatorias · movimiento=PASS · cap=${BOSS_V325_CONFIG.bossBombCap}`,
        details:{
            phases:phaseResults,
            bossBombs:{spawnedRandom:true,movementState:BOMB_V4_STATES.MOVING,settlesTo:BOMB_V4_STATES.ARMED,cap:BOSS_V325_CONFIG.bossBombCap},
            patterns:['aimed','cross','tri-shot'],
            perFramePathfinding:false
        }
    };
}

if (window.DEBUG_TESTS) {
    window.DEBUG_TESTS['boss-stress'] = bossV325Stress;
}
window.bossV325Stress = bossV325Stress;
