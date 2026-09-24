/* v3.25.0 Boss Stress Test */

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
    const cases = [
        { name: 'phase-1', ratio: 0.90, expected: 1 },
        { name: 'phase-2', ratio: 0.50, expected: 2 },
        { name: 'phase-3', ratio: 0.20, expected: 3 },
        { name: 'threshold-2', ratio: 0.66, expected: 2 },
        { name: 'threshold-3', ratio: 0.33, expected: 3 }
    ];
    const results = [];
    for (const c of cases) {
        const boss = bossV325BuildSyntheticBoss(c.ratio);
        const phase = bossV325GetPhase(boss);
        results.push({ name: c.name, phase, expected: c.expected, pass: phase === c.expected });
    }

    const oldState = BossV325.state;
    const oldGameState = typeof gameState !== 'undefined' ? gameState.boss : undefined;
    let projectileCapPass = false;
    try {
        if (typeof gameState !== 'undefined') {
            gameState.boss = bossV325BuildSyntheticBoss(0.20);
            gameState.bossProjectilesV325 = [];
            for (let i = 0; i < BOSS_V325_CONFIG.projectileCap + 3; i++) {
                bossV325SpawnProjectile(i * 0.2);
            }
            projectileCapPass = gameState.bossProjectilesV325.length <= BOSS_V325_CONFIG.projectileCap;
        }
    } finally {
        if (typeof gameState !== 'undefined') {
            gameState.boss = oldGameState;
            gameState.bossProjectilesV325 = [];
        }
        BossV325.state = oldState;
    }

    const passed = results.filter(r => r.pass).length;
    if (passed !== results.length || !projectileCapPass) {
        throw new Error(`Boss Stress: ${passed}/${results.length} fases PASS · projectile-cap=${projectileCapPass ? 'PASS' : 'FAIL'}`);
    }

    return {
        summary: `Boss Stress: ${passed}/${results.length} fases PASS · cap=${BOSS_V325_CONFIG.projectileCap}`,
        details: {
            phases: results,
            projectileCap: BOSS_V325_CONFIG.projectileCap,
            patterns: ['aimed', 'cross', 'tri-shot'],
            perFramePathfinding: false,
            maxPatternWork: 'O(1) por trigger'
        }
    };
}

if (window.DEBUG_TESTS) {
    window.DEBUG_TESTS['boss-stress'] = bossV325Stress;
}
window.bossV325Stress = bossV325Stress;
