/* BOMBERMAN ROGUELIKE v3.28.0 - Debug Lab Stress */

function runDebugLabStressV328() {
    if (!window.DebugLabV328) throw new Error('DebugLabV328 no disponible.');
    if (typeof window.debugLabV328GetSnapshot !== 'function') throw new Error('Snapshot API no disponible.');

    const lab = window.DebugLabV328;
    const original = {
        lastSnapshot: lab.lastSnapshot,
        lastDiff: lab.lastDiff,
        lastChecks: lab.lastChecks,
        selectedEnemy: lab.selectedEnemy,
        timeline: lab.timeline.slice(),
        events: lab.events.slice(),
        runtimeErrors: lab.runtimeErrors.slice(),
        frameIntervals: lab.frameIntervals.slice()
    };

    try {
        lab.lastSnapshot = null;
        lab.lastDiff = null;
        lab.lastChecks = null;
        lab.selectedEnemy = 0;
        lab.timeline = [];
        lab.events = [];
        lab.runtimeErrors = [];
        lab.frameIntervals = [];

        const before = JSON.stringify(debugLabV328GetGameState());
        const snapshotA = window.debugLabV328GetSnapshot();
        if (!snapshotA.engine.stateAvailable) throw new Error('Snapshot no detectó gameState.');
        if (!snapshotA.engine.playerAvailable) throw new Error('Snapshot no detectó player.');
        if (JSON.stringify(debugLabV328GetGameState()) !== before) throw new Error('Snapshot mutó gameState.');

        debugLabV328GetGameState().score = (debugLabV328GetGameState().score || 0) + 10;
        const snapshotB = window.debugLabV328GetSnapshot();
        const diff = window.debugLabV328Diff(snapshotA, snapshotB);
        if (!diff.changed.some(c => c.key === 'world.score')) throw new Error('State diff no detectó world.score.');

        const checksBaseline = window.debugLabV328HealthChecks(snapshotB);
        if (!checksBaseline.length) throw new Error('Health checks vacíos.');
        if (checksBaseline.some(c => String(c.detail).includes('undefined'))) {
            throw new Error('Health output expone undefined como estado.');
        }

        debugLabV328GetGameState().enemies = [
            { x: 48, y: 48, vx: 1, vy: 0, width: 30, height: 30, type: { speed: 1, canFly: false }, physicalBlocked: false },
            { x: 96, y: 48, vx: 1, vy: 1, width: 30, height: 30, type: { speed: 1, canFly: false }, physicalBlocked: true }
        ];
        debugLabV328GetRogue().relics = ['ember_core', 'ember_core'];
        const checksFault = window.debugLabV328HealthChecks(window.debugLabV328GetSnapshot());
        const failedIds = checksFault.filter(c => c.status === 'FAIL').map(c => c.id);
        if (!failedIds.includes('relic-unique')) throw new Error('No detectó relic duplication.');
        if (!failedIds.includes('enemy-cardinal')) throw new Error('No detectó velocidad diagonal.');
        if (!failedIds.includes('enemy-blocking')) throw new Error('No detectó enemigo bloqueado.');

        lab.timeline = [];
        for (let i = 0; i < 150; i++) {
            debugLabV328GetGameState().animFrame = i;
            window.debugLabV328PushTimelineSample();
        }
        if (lab.timeline.length !== 120) throw new Error(`Timeline cap incorrecto: ${lab.timeline.length}`);

        lab.snapshotHistory = [];
        lab.lastSnapshot = null;
        for (let i = 0; i < 20; i++) window.debugLabV328CaptureSnapshot();
        if (lab.snapshotHistory.length !== 12) throw new Error(`Snapshot history cap incorrecto: ${lab.snapshotHistory.length}`);

        for (let i = 0; i < 300; i++) window.debugLabV328RunChecks();
        if (!lab.lastChecks || !Array.isArray(lab.lastChecks.checks)) throw new Error('Health result no persistido.');

        return {
            status: 'PASS',
            snapshotStateAvailable: snapshotA.engine.stateAvailable,
            playerAvailable: snapshotA.engine.playerAvailable,
            diffDetectedScore: true,
            baselineChecks: checksBaseline.length,
            faultChecksDetected: failedIds,
            timelineSize: lab.timeline.length,
            snapshotHistorySize: lab.snapshotHistory.length,
            healthResult: lab.lastChecks.status
        };
    } finally {
        lab.lastSnapshot = original.lastSnapshot;
        lab.lastDiff = original.lastDiff;
        lab.lastChecks = original.lastChecks;
        lab.selectedEnemy = original.selectedEnemy;
        lab.timeline = original.timeline;
        lab.events = original.events;
        lab.runtimeErrors = original.runtimeErrors;
        lab.frameIntervals = original.frameIntervals;
    }
}

if (window.DEBUG_TESTS) window.DEBUG_TESTS['debug-lab-stress'] = runDebugLabStressV328;
window.runDebugLabStressV328 = runDebugLabStressV328;
