/* BOMBERMAN ROGUELIKE v3.26.0 - Feedback Stress */

function runFeedbackStressV326() {
    const state = window.FeedbackV326;
    if (!state) throw new Error('FeedbackV326 no disponible.');

    window.resetFeedbackV326();

    const started = performance.now();
    const originalRandom = Math.random;
    let deterministicSeed = 42;
    Math.random = () => {
        deterministicSeed = (deterministicSeed * 1664525 + 1013904223) >>> 0;
        return deterministicSeed / 4294967296;
    };

    try {
        for (let i = 0; i < 12; i++) {
            window.feedbackV326Impact(96 + i * 4, 96 + i * 2, '#fde68a', 0.8);
            window.feedbackV326Explosion(160 + i * 3, 160 + i, '#fb923c', 0.85);
        }

        for (let i = 0; i < 18; i++) {
            updateFeedbackV326(16.6667);
        }

        let activeParticles = 0;
        let activeRings = 0;
        for (const p of state.particles) if (p.active) activeParticles++;
        for (const r of state.rings) if (r.active) activeRings++;

        const result = {
            status: activeParticles <= FEEDBACK_V326_CONFIG.maxParticles && activeRings <= FEEDBACK_V326_CONFIG.maxRings ? 'PASS' : 'FAIL',
            maxParticles: FEEDBACK_V326_CONFIG.maxParticles,
            activeParticles,
            maxRings: FEEDBACK_V326_CONFIG.maxRings,
            activeRings,
            impactCount: state.impactCount,
            explosionCount: state.explosionCount,
            particlesSpawned: state.particlesSpawned,
            durationMs: Number((performance.now() - started).toFixed(3))
        };

        if (result.status !== 'PASS') throw new Error(`Feedback Stress FAIL: ${JSON.stringify(result)}`);
        return result;
    } finally {
        Math.random = originalRandom;
        window.resetFeedbackV326();
    }
}

window.runFeedbackStressV326 = runFeedbackStressV326;
