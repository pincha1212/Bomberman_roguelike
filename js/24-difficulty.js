// Bomberman Roguelike v3.23 — Progressive difficulty controller.
// Una sola fuente de verdad para escalado de enemigos, presión, trampas y densidad.
(() => {
    'use strict';

    const LIMITS = Object.freeze({
        minRoomTime: 32000,
        maxEnemies: 22,
        maxEnemySpeedMult: 1.24,
        maxTrapBonus: 6,
        maxBlockDensityBonus: 0.08,
        minReinforcementInterval: 10500
    });

    function depthV323(value) {
        const depth = Number(value);
        return Number.isFinite(depth) ? Math.max(1, Math.floor(depth)) : 1;
    }

    function getDifficultyV323(depth = gameState?.level || 1) {
        const d = depthV323(depth);
        const steps = d - 1;
        const tier = Math.floor(steps / 5);

        const enemyCountMult = 1 + Math.min(0.72, steps * 0.045);
        const enemySpeedMult = 1 + Math.min(0.20, steps * 0.012);
        const trapBonus = Math.min(LIMITS.maxTrapBonus, Math.floor(steps / 2));
        const blockDensityBonus = Math.min(LIMITS.maxBlockDensityBonus, Math.floor(steps / 3) * 0.01);
        const roomTimeMult = 1 - Math.min(0.22, steps * 0.012);
        const reinforcementIntervalMult = 1 - Math.min(0.28, steps * 0.014);
        const reinforcementAmountBonus = Math.min(2, Math.floor(steps / 5));
        const maxEnemies = Math.min(LIMITS.maxEnemies, 8 + Math.floor(d * 0.85));
        const eliteBonus = Math.min(0.24, tier * 0.04);

        return Object.freeze({
            version: '3.23.0',
            depth: d,
            tier,
            intensity: 1 + Math.min(1.5, steps * 0.06),
            enemyCountMult,
            enemySpeedMult: Math.min(LIMITS.maxEnemySpeedMult, enemySpeedMult),
            trapBonus,
            blockDensityBonus,
            roomTimeMult,
            reinforcementIntervalMult,
            reinforcementAmountBonus,
            maxEnemies,
            eliteBonus,
            limits: LIMITS
        });
    }

    function applyDifficultyV323() {
        const profile = getDifficultyV323(gameState?.level || 1);
        gameState.difficulty = profile;
        return profile;
    }

    function getDifficultyRoomTimeV323(baseMs) {
        const profile = gameState?.difficulty || getDifficultyV323();
        const base = Math.max(0, Number(baseMs) || 0);
        return Math.max(LIMITS.minRoomTime, Math.round(base * profile.roomTimeMult));
    }

    function getDifficultyReinforcementIntervalV323(baseMs) {
        const profile = gameState?.difficulty || getDifficultyV323();
        const base = Math.max(0, Number(baseMs) || 0);
        return Math.max(LIMITS.minReinforcementInterval, Math.round(base * profile.reinforcementIntervalMult));
    }

    function getDifficultyTrapCountV323(baseCount) {
        const profile = gameState?.difficulty || getDifficultyV323();
        return Math.max(0, Math.round((Number(baseCount) || 0) + profile.trapBonus));
    }

    window.BOMBER_DIFFICULTY_V323 = Object.freeze({
        version: '3.23.0',
        limits: LIMITS,
        get: getDifficultyV323,
        apply: applyDifficultyV323,
        roomTime: getDifficultyRoomTimeV323,
        reinforcementInterval: getDifficultyReinforcementIntervalV323,
        trapCount: getDifficultyTrapCountV323
    });

    window.getDifficultyV323 = getDifficultyV323;
    window.applyDifficultyV323 = applyDifficultyV323;
    window.getDifficultyRoomTimeV323 = getDifficultyRoomTimeV323;
    window.getDifficultyReinforcementIntervalV323 = getDifficultyReinforcementIntervalV323;
    window.getDifficultyTrapCountV323 = getDifficultyTrapCountV323;
})();
