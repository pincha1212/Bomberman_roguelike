// Bomberman Roguelike v3.23 — difficulty stress suite.
(() => {
    'use strict';

    function near(a, b, eps = 1e-9) { return Math.abs(a - b) <= eps; }

    window.RUN_DIFFICULTY_STRESS_V323 = async function() {
        if (typeof window.getDifficultyV323 !== 'function') throw new Error('Difficulty controller v3.23 no disponible.');

        const depths = [1, 2, 5, 10, 15, 20];
        const cases = depths.map(depth => {
            const p = window.getDifficultyV323(depth);
            const next = window.getDifficultyV323(depth + 1);
            const baseRoom = Math.max(35000, 80000 - depth * 1500);
            return {
                depth,
                tier: p.tier,
                enemyCountMult: Number(p.enemyCountMult.toFixed(3)),
                enemySpeedMult: Number(p.enemySpeedMult.toFixed(3)),
                trapBonus: p.trapBonus,
                blockDensityBonus: Number(p.blockDensityBonus.toFixed(3)),
                roomTime: getDifficultyRoomTimeForStress(baseRoom, p),
                reinforcementInterval: getDifficultyReinforcementForStress(24000 - depth * 500, p),
                maxEnemies: p.maxEnemies,
                monotonic: next.enemyCountMult >= p.enemyCountMult && next.enemySpeedMult >= p.enemySpeedMult && next.trapBonus >= p.trapBonus
            };
        });

        const monotonic = cases.every(c => c.monotonic);
        const capped = cases.every(c => c.maxEnemies <= 22 && c.enemySpeedMult <= 1.24 && c.trapBonus <= 6);
        const first = window.getDifficultyV323(1);
        const late = window.getDifficultyV323(20);
        const baseline = near(first.enemyCountMult, 1) && near(first.enemySpeedMult, 1) && first.trapBonus === 0;
        const progressive = late.enemyCountMult > first.enemyCountMult && late.enemySpeedMult > first.enemySpeedMult && late.trapBonus > first.trapBonus;
        const pass = monotonic && capped && baseline && progressive;

        const result = {
            total: cases.length,
            passed: pass ? cases.length : Math.max(0, cases.length - 1),
            failed: pass ? 0 : 1,
            monotonic,
            capped,
            baseline,
            progressive,
            cases
        };

        if (typeof DEBUG_MODE !== 'undefined') DEBUG_MODE.difficultyStress = result;
        if (!pass) throw new Error(`Difficulty Stress: fallo de monotonicidad o límites.`);

        return {
            summary: `${cases.length}/${cases.length} perfiles válidos · progresión monotónica · límites OK`,
            details: result
        };
    };

    function getDifficultyRoomTimeForStress(baseMs, profile) {
        const base = Math.max(0, Number(baseMs) || 0);
        return Math.max(32000, Math.round(base * profile.roomTimeMult));
    }

    function getDifficultyReinforcementForStress(baseMs, profile) {
        const base = Math.max(0, Number(baseMs) || 0);
        return Math.max(10500, Math.round(base * profile.reinforcementIntervalMult));
    }
})();
