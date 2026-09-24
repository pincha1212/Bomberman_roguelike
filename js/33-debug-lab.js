/*
 * BOMBERMAN ROGUELIKE v3.28.0
 * Debug Lab
 *
 * Diagnostic layer over the existing Debug Engine.
 * Does not replace game logic or tests.
 */

const DEBUG_LAB_V328_CONFIG = Object.freeze({
    version: '3.28.0',
    maxTimelineSamples: 120,
    sampleIntervalMs: 250,
    maxEvents: 240,
    maxConsoleEntries: 120,
    maxDiffKeys: 80,
    snapshotHistory: 12,
    performanceWindow: 90
});

const DebugLabV328 = {
    installed: false,
    open: false,
    recording: false,
    lastSnapshot: null,
    snapshotHistory: [],
    timeline: [],
    events: [],
    runtimeErrors: [],
    selectedEnemy: 0,
    lastFrameTime: 0,
    frameIntervals: [],
    monitorRaf: 0,
    timelineTimer: 0,
    frameCount: 0,
    startedAt: 0,
    originalConsoleError: null,
    originalConsoleWarn: null,
    consoleHooked: false,
    bootedAt: Date.now()
};

function debugLabV328SafeGet(name, fallback = null) {
    try {
        return typeof window !== 'undefined' && name in window ? window[name] : fallback;
    } catch (_) {
        return fallback;
    }
}

function debugLabV328GetGameState() {
    try { return typeof gameState !== 'undefined' ? gameState : null; } catch (_) { return null; }
}

function debugLabV328GetPlayer() {
    try { return typeof player !== 'undefined' ? player : null; } catch (_) { return null; }
}

function debugLabV328GetRogue() {
    try { return typeof ROGUELIKE_V327 !== 'undefined' ? ROGUELIKE_V327 : null; } catch (_) { return null; }
}

function debugLabV328GetFeedback() {
    try { return typeof FeedbackV326 !== 'undefined' ? FeedbackV326 : debugLabV328SafeGet('FeedbackV326', null); } catch (_) { return debugLabV328SafeGet('FeedbackV326', null); }
}

function debugLabV328GetBoss() {
    try { return typeof BossV325 !== 'undefined' ? BossV325 : debugLabV328SafeGet('BossV325', null); } catch (_) { return debugLabV328SafeGet('BossV325', null); }
}

function debugLabV328Num(value, fallback = 0) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function debugLabV328Round(value, decimals = 2) {
    const n = debugLabV328Num(value, 0);
    const pow = 10 ** decimals;
    return Math.round(n * pow) / pow;
}

function debugLabV328ClampText(value, max = 180) {
    const text = String(value ?? '');
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function debugLabV328Clone(value) {
    try {
        return JSON.parse(JSON.stringify(value));
    } catch (_) {
        return String(value);
    }
}

function debugLabV328PushLimited(list, entry, max) {
    list.push(entry);
    if (list.length > max) list.splice(0, list.length - max);
}

function debugLabV328Timestamp() {
    const d = new Date();
    return d.toLocaleTimeString('es-AR', { hour12: false });
}

function debugLabV328AddEvent(level, source, message, details = null) {
    debugLabV328PushLimited(DebugLabV328.events, {
        t: Date.now(),
        time: debugLabV328Timestamp(),
        level,
        source,
        message: debugLabV328ClampText(message),
        details: details == null ? null : debugLabV328Clone(details)
    }, DEBUG_LAB_V328_CONFIG.maxEvents);
}

function debugLabV328CaptureError(type, message, extra = {}) {
    const entry = {
        t: Date.now(),
        time: debugLabV328Timestamp(),
        type,
        message: debugLabV328ClampText(message, 260),
        ...extra
    };
    debugLabV328PushLimited(DebugLabV328.runtimeErrors, entry, DEBUG_LAB_V328_CONFIG.maxEvents);
    debugLabV328AddEvent('ERROR', 'runtime', entry.message, extra);
    debugLabV328RenderIfOpen();
}

function debugLabV328GridSummary(state) {
    if (!state || !Array.isArray(state.grid)) return null;
    let walls = 0;
    let blocks = 0;
    let empty = 0;
    let exits = 0;
    for (const row of state.grid) {
        if (!Array.isArray(row)) continue;
        for (const tile of row) {
            if (tile === 1) walls++;
            else if (tile === 2) blocks++;
            else if (tile === 3 || tile === 4) exits++;
            else empty++;
        }
    }
    return {
        width: state.gridWidth,
        height: state.gridHeight,
        cells: debugLabV328Num(state.gridWidth) * debugLabV328Num(state.gridHeight),
        walls,
        blocks,
        empty,
        exits
    };
}

function debugLabV328PlayerSummary(p) {
    if (!p) return null;
    return {
        x: debugLabV328Round(p.x),
        y: debugLabV328Round(p.y),
        vx: debugLabV328Round(p.vx),
        vy: debugLabV328Round(p.vy),
        tile: {
            x: Math.floor((debugLabV328Num(p.x) + debugLabV328Num(p.width) / 2) / debugLabV328Num(debugLabV328SafeGet('TILE_SIZE', 48), 48)),
            y: Math.floor((debugLabV328Num(p.y) + debugLabV328Num(p.height) / 2) / debugLabV328Num(debugLabV328SafeGet('TILE_SIZE', 48), 48))
        },
        dir: p.dir ?? p.direction ?? '—',
        desiredDirection: p.desiredDirection ?? '—',
        speed: debugLabV328Round(p.speed),
        hp: p.health ?? p.hp ?? null,
        maxHp: p.maxHealth ?? p.maxHp ?? null,
        shield: Boolean(p.hasShield ?? p.shield),
        invulnerable: Boolean(p.isInvincible ?? p.invulnerable),
        bombsPlaced: debugLabV328Num(p.bombsPlaced),
        maxBombs: debugLabV328Num(p.maxBombs),
        range: debugLabV328Num(p.bombRange)
    };
}

function debugLabV328EnemySummary(e, index) {
    if (!e) return null;
    const type = e.type || {};
    const x = debugLabV328Num(e.x);
    const y = debugLabV328Num(e.y);
    const tileSize = debugLabV328Num(debugLabV328SafeGet('TILE_SIZE', 48), 48);
    const vx = debugLabV328Num(e.vx);
    const vy = debugLabV328Num(e.vy);
    return {
        index,
        behavior: e.behavior ?? type.behavior ?? type.name ?? '—',
        alert: e.alert ?? e.state ?? '—',
        x: debugLabV328Round(x),
        y: debugLabV328Round(y),
        tile: { x: Math.floor(x / tileSize), y: Math.floor(y / tileSize) },
        width: debugLabV328Round(e.width),
        height: debugLabV328Round(e.height),
        vx: debugLabV328Round(vx),
        vy: debugLabV328Round(vy),
        diagonalVelocity: Math.abs(vx) > 0.001 && Math.abs(vy) > 0.001,
        desiredDirection: e.desiredDirection ?? e.desired ?? '—',
        direction: e.direction ?? e.dir ?? '—',
        physicalBlocked: Boolean(e.physicalBlocked),
        physicalBlockedMs: debugLabV328Round(e.physicalBlockedMs),
        stuckTimer: debugLabV328Round(e.stuckTimer),
        recoveryCount: debugLabV328Num(e.recoveryCount),
        recoveryReason: e.recoveryReason ?? '—',
        routeLength: Array.isArray(e.route) ? e.route.length : debugLabV328Num(e.recoveryPathNodes),
        recoveryPathNodes: debugLabV328Num(e.recoveryPathNodes),
        navigationMemory: debugLabV328Num(e.navigationMemory),
        navigationTurns: debugLabV328Num(e.navigationTurns),
        canFly: Boolean(e.canFly ?? type.canFly),
        speed: debugLabV328Round(e.speed ?? type.speed)
    };
}

function debugLabV328RogueSummary(rogue) {
    if (!rogue) return null;
    let relicBonuses = null;
    let synergies = [];
    try {
        if (typeof rogueV327GetRelicBonuses === 'function') relicBonuses = debugLabV328Clone(rogueV327GetRelicBonuses());
        if (typeof rogueV327GetActiveSynergies === 'function') synergies = debugLabV328Clone(rogueV327GetActiveSynergies()).map(s => s.id || s.name);
    } catch (_) {}
    return {
        runActive: Boolean(rogue.runActive),
        coins: debugLabV328Num(rogue.coins ?? rogue.currency ?? (debugLabV328GetGameState()?.coins)),
        score: debugLabV328Num(debugLabV328GetGameState()?.score),
        relics: Array.isArray(rogue.relics) ? rogue.relics.slice() : [],
        relicOffers: Array.isArray(rogue.relicOffers) ? rogue.relicOffers.map(r => r.id ?? r) : [],
        activeSynergies: synergies,
        relicBonuses,
        currentRoomPlan: rogue.currentRoomPlan ?? 'standard',
        pendingRoomPlan: rogue.pendingRoomPlan ?? 'standard',
        roomOffers: Array.isArray(rogue.roomOffers) ? rogue.roomOffers.map(p => p.id ?? p) : [],
        rerollsUsed: debugLabV328Num(rogue.rerollsUsed),
        coinStats: debugLabV328Clone(rogue.coinStats ?? {})
    };
}

function debugLabV328FeedbackSummary(fb) {
    if (!fb) return null;
    let particles = Array.isArray(fb.particles) ? fb.particles.filter(p => p && p.active).length : 0;
    let rings = Array.isArray(fb.rings) ? fb.rings.filter(r => r && r.active).length : 0;
    return {
        installed: Boolean(fb.installed),
        activeParticles: particles,
        poolParticles: Array.isArray(fb.particles) ? fb.particles.length : null,
        activeRings: rings,
        poolRings: Array.isArray(fb.rings) ? fb.rings.length : null,
        impactCount: debugLabV328Num(fb.impactCount),
        explosionCount: debugLabV328Num(fb.explosionCount),
        damageCount: debugLabV328Num(fb.damageCount),
        soundCount: debugLabV328Num(fb.soundCount)
    };
}

function debugLabV328BossSummary(boss) {
    if (!boss) return null;
    const projectiles = Array.isArray(boss.projectiles) ? boss.projectiles : [];
    return {
        active: Boolean(boss.active ?? boss.exists),
        phase: boss.phase ?? boss.currentPhase ?? null,
        hp: boss.hp ?? boss.health ?? null,
        maxHp: boss.maxHp ?? boss.maxHealth ?? null,
        projectiles: projectiles.length,
        telegraph: Boolean(boss.telegraphActive ?? boss.telegraph)
    };
}

function debugLabV328GetPerformance() {
    const intervals = DebugLabV328.frameIntervals;
    if (!intervals.length) return { fps: 0, avgIntervalMs: 0, p95IntervalMs: 0, maxIntervalMs: 0 };
    const sorted = intervals.slice().sort((a, b) => a - b);
    const sum = intervals.reduce((a, b) => a + b, 0);
    const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
    return {
        fps: debugLabV328Round(1000 / (sum / intervals.length), 1),
        avgIntervalMs: debugLabV328Round(sum / intervals.length),
        p95IntervalMs: debugLabV328Round(p95),
        maxIntervalMs: debugLabV328Round(sorted[sorted.length - 1])
    };
}

function debugLabV328GetSnapshot() {
    const state = debugLabV328GetGameState();
    const p = debugLabV328GetPlayer();
    const enemies = state && Array.isArray(state.enemies) ? state.enemies : [];
    const rogue = debugLabV328GetRogue();
    const feedback = debugLabV328GetFeedback();
    const boss = debugLabV328GetBoss();
    const tests = debugLabV328SafeGet('DEBUG_TESTS', null);
    const bootErrors = debugLabV328SafeGet('__BOMBER_DEBUG_BOOT_ERRORS', []);
    const scripts = Array.from(document.querySelectorAll('script[src]')).map(s => s.getAttribute('src')).filter(Boolean);

    return {
        meta: {
            version: DEBUG_LAB_V328_CONFIG.version,
            capturedAt: new Date().toISOString(),
            url: location.href,
            debugQuery: new URLSearchParams(location.search).get('debug') === '1'
        },
        engine: {
            stateAvailable: Boolean(state),
            playerAvailable: Boolean(p),
            playing: Boolean(state?.isPlaying),
            animFrame: debugLabV328Num(state?.animFrame),
            lastTime: debugLabV328Num(state?.lastTime),
            debugTestsAvailable: Boolean(tests)
        },
        performance: debugLabV328GetPerformance(),
        player: debugLabV328PlayerSummary(p),
        world: state ? {
            width: state.gridWidth,
            height: state.gridHeight,
            depth: state.level ?? state.depth ?? null,
            room: state.room ?? state.roomType ?? state.roomName ?? 'STANDARD',
            threat: state.threat ?? null,
            score: debugLabV328Num(state.score),
            coins: debugLabV328Num(state.coins ?? rogue?.coins),
            enemies: enemies.length,
            bombs: Array.isArray(state.bombs) ? state.bombs.length : 0,
            explosions: Array.isArray(state.explosions) ? state.explosions.length : 0,
            traps: Array.isArray(state.traps) ? state.traps.length : 0,
            activeTraps: Array.isArray(state.traps) ? state.traps.filter(t => t && (t.active || t.triggered)).length : 0,
            projectiles: Array.isArray(state.projectiles) ? state.projectiles.length : 0,
            boss: Boolean(state.boss || state.hasBoss),
            grid: debugLabV328GridSummary(state),
            exit: state.exitPos ? debugLabV328Clone(state.exitPos) : null
        } : null,
        enemies: enemies.slice(0, 32).map((e, i) => debugLabV328EnemySummary(e, i)),
        selectedEnemy: debugLabV328EnemySummary(enemies[DebugLabV328.selectedEnemy] || null, DebugLabV328.selectedEnemy),
        rogue: debugLabV328RogueSummary(rogue),
        feedback: debugLabV328FeedbackSummary(feedback),
        boss: debugLabV328BossSummary(boss),
        runtime: {
            capturedErrors: DebugLabV328.runtimeErrors.slice(-30),
            bootErrors: Array.isArray(bootErrors) ? bootErrors.slice(-20) : [],
            recentEvents: DebugLabV328.events.slice(-30),
            scriptsLoaded: scripts
        },
        tests: {
            names: tests && typeof tests === 'object' ? Object.keys(tests).filter(k => typeof tests[k] === 'function') : [],
            availableCount: tests && typeof tests === 'object' ? Object.keys(tests).filter(k => typeof tests[k] === 'function').length : 0
        }
    };
}

function debugLabV328Flatten(obj, prefix = '', out = {}) {
    if (out.__count >= DEBUG_LAB_V328_CONFIG.maxDiffKeys) return out;
    if (obj === null || obj === undefined || typeof obj !== 'object') {
        out[prefix] = obj;
        out.__count = (out.__count || 0) + 1;
        return out;
    }
    if (Array.isArray(obj)) {
        out[prefix] = JSON.stringify(obj);
        out.__count = (out.__count || 0) + 1;
        return out;
    }
    for (const [key, value] of Object.entries(obj)) {
        const next = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            debugLabV328Flatten(value, next, out);
        } else {
            out[next] = value;
            out.__count = (out.__count || 0) + 1;
            if (out.__count >= DEBUG_LAB_V328_CONFIG.maxDiffKeys) break;
        }
    }
    return out;
}

function debugLabV328Diff(previous, current) {
    if (!previous) return { added: Object.keys(debugLabV328Flatten(current)), removed: [], changed: [] };
    const a = debugLabV328Flatten(previous);
    const b = debugLabV328Flatten(current);
    delete a.__count;
    delete b.__count;
    const added = [];
    const removed = [];
    const changed = [];
    for (const key of Object.keys(b)) {
        if (!(key in a)) added.push(key);
        else if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) changed.push({ key, from: a[key], to: b[key] });
    }
    for (const key of Object.keys(a)) {
        if (!(key in b)) removed.push(key);
    }
    return { added, removed, changed: changed.slice(0, DEBUG_LAB_V328_CONFIG.maxDiffKeys) };
}

function debugLabV328HealthChecks(snapshot) {
    const checks = [];
    const add = (id, ok, detail) => checks.push({ id, status: ok ? 'PASS' : 'FAIL', detail });
    const state = debugLabV328GetGameState();
    const enemies = state && Array.isArray(state.enemies) ? state.enemies : [];
    const rogue = debugLabV328GetRogue();
    const feedback = debugLabV328GetFeedback();
    const boss = debugLabV328GetBoss();

    add('engine-state', Boolean(snapshot.engine.stateAvailable), snapshot.engine.stateAvailable ? 'gameState disponible' : 'gameState no expuesto');
    add('player-state', Boolean(snapshot.engine.playerAvailable), snapshot.engine.playerAvailable ? 'player disponible' : 'player no expuesto');
    add('grid-shape', Boolean(snapshot.world?.grid?.width && snapshot.world?.grid?.height), snapshot.world?.grid ? `${snapshot.world.grid.width}×${snapshot.world.grid.height}` : 'grid no disponible');
    add('player-finite', Boolean(snapshot.player && Number.isFinite(snapshot.player.x) && Number.isFinite(snapshot.player.y)), snapshot.player ? `${snapshot.player.x}, ${snapshot.player.y}` : 'player N/D');
    add('relic-module', Boolean(rogue && typeof window.rogueV327GetRelicBonuses === 'function'), rogue ? 'ROGUELIKE_V327 disponible' : 'roguelike layer no disponible');
    add('relic-unique', Boolean(rogue?.relics && new Set(rogue.relics).size === rogue.relics.length), rogue?.relics ? `${rogue.relics.length} reliquias` : 'N/D');
    add('economy-finite', Number.isFinite(Number(snapshot.rogue?.coins ?? snapshot.world?.coins)), `coins=${snapshot.rogue?.coins ?? snapshot.world?.coins ?? 'N/D'}`);
    add('relic-synergy', Array.isArray(snapshot.rogue?.activeSynergies), `${snapshot.rogue?.activeSynergies?.length ?? 0} activas`);
    add('feedback-cap', !feedback || !Array.isArray(feedback.particles) || feedback.particles.filter(p => p?.active).length <= 96, feedback ? `partículas=${snapshot.feedback?.activeParticles}` : 'feedback N/D');
    add('boss-projectile-cap', !boss || !Array.isArray(boss.projectiles) || boss.projectiles.length <= debugLabV328Num(debugLabV328SafeGet('BOSS_V325_CONFIG', {})?.maxProjectiles, 6), boss ? `projectiles=${snapshot.boss?.projectiles}` : 'boss N/D');
    const diagonal = enemies.filter(e => debugLabV328Num(e.vx) !== 0 && debugLabV328Num(e.vy) !== 0).length;
    add('enemy-cardinal', diagonal === 0, diagonal === 0 ? 'sin velocidades diagonales' : `${diagonal} enemigo(s) con vx/vy simultáneos`);
    const blocked = enemies.filter(e => e && e.physicalBlocked).length;
    add('enemy-blocking', blocked === 0, blocked === 0 ? 'sin bloqueos físicos activos' : `${blocked} bloqueado(s)`);
    add('runtime-errors', snapshot.runtime.capturedErrors.length === 0 && snapshot.runtime.bootErrors.length === 0, `${snapshot.runtime.capturedErrors.length + snapshot.runtime.bootErrors.length} error(es) registrados`);

    return checks;
}

function debugLabV328RunChecks() {
    const snapshot = debugLabV328GetSnapshot();
    const checks = debugLabV328HealthChecks(snapshot);
    const passed = checks.filter(c => c.status === 'PASS').length;
    const failed = checks.length - passed;
    const result = {
        status: failed ? 'FAIL' : 'PASS',
        passed,
        failed,
        checks,
        capturedAt: new Date().toISOString()
    };
    DebugLabV328.lastChecks = result;
    debugLabV328AddEvent(failed ? 'WARN' : 'DEBUG', 'debug-lab', `Diagnóstico ${result.status}: ${passed}/${checks.length} checks PASS`, result);
    debugLabV328RenderIfOpen();
    return result;
}

function debugLabV328RunExistingTests() {
    const tests = debugLabV328SafeGet('DEBUG_TESTS', null);
    if (!tests) throw new Error('DEBUG_TESTS no disponible.');
    const runner = [tests.runAllTests, tests.executeTests, debugLabV328SafeGet('runAllTests', null)].find(fn => typeof fn === 'function');
    if (!runner) throw new Error('No se encontró runner de tests compatible.');
    debugLabV328AddEvent('TEST', 'debug-lab', 'Ejecutando suite existente…');
    return Promise.resolve().then(() => runner.call(tests));
}

function debugLabV328CaptureSnapshot() {
    const snapshot = debugLabV328GetSnapshot();
    const diff = debugLabV328Diff(DebugLabV328.lastSnapshot, snapshot);
    DebugLabV328.snapshotHistory.push(snapshot);
    if (DebugLabV328.snapshotHistory.length > DEBUG_LAB_V328_CONFIG.snapshotHistory) {
        DebugLabV328.snapshotHistory.splice(0, DebugLabV328.snapshotHistory.length - DEBUG_LAB_V328_CONFIG.snapshotHistory);
    }
    DebugLabV328.lastSnapshot = snapshot;
    DebugLabV328.lastDiff = diff;
    debugLabV328AddEvent('DEBUG', 'snapshot', `Snapshot capturado · ${diff.changed.length} cambios`, { diff });
    debugLabV328RenderIfOpen();
    return { snapshot, diff };
}

function debugLabV328PushTimelineSample() {
    const snapshot = debugLabV328GetSnapshot();
    const sample = {
        t: Date.now(),
        time: debugLabV328Timestamp(),
        frame: snapshot.engine.animFrame,
        fps: snapshot.performance.fps,
        depth: snapshot.world?.depth,
        room: snapshot.rogue?.currentRoomPlan ?? snapshot.world?.room,
        coins: snapshot.rogue?.coins ?? snapshot.world?.coins,
        relics: snapshot.rogue?.relics?.length ?? 0,
        enemies: snapshot.world?.enemies ?? 0,
        bombs: snapshot.world?.bombs ?? 0,
        explosions: snapshot.world?.explosions ?? 0,
        blockedEnemies: snapshot.enemies.filter(e => e.physicalBlocked).length,
        runtimeErrors: snapshot.runtime.capturedErrors.length + snapshot.runtime.bootErrors.length
    };
    debugLabV328PushLimited(DebugLabV328.timeline, sample, DEBUG_LAB_V328_CONFIG.maxTimelineSamples);
    DebugLabV328.frameCount = debugLabV328Num(DebugLabV328.frameCount) + 1;
}

function debugLabV328MonitorFrame(timestamp) {
    if (!DebugLabV328.open) return;
    if (DebugLabV328.lastFrameTime > 0) {
        const delta = timestamp - DebugLabV328.lastFrameTime;
        if (delta > 0 && delta < 250) {
            debugLabV328PushLimited(DebugLabV328.frameIntervals, delta, DEBUG_LAB_V328_CONFIG.performanceWindow);
        }
    }
    DebugLabV328.lastFrameTime = timestamp;
    DebugLabV328.monitorRaf = requestAnimationFrame(debugLabV328MonitorFrame);
}

function debugLabV328StartRecording() {
    if (DebugLabV328.recording) return false;
    DebugLabV328.recording = true;
    DebugLabV328.startedAt = Date.now();
    DebugLabV328.timeline = [];
    debugLabV328PushTimelineSample();
    DebugLabV328.timelineTimer = window.setInterval(() => {
        if (DebugLabV328.recording) debugLabV328PushTimelineSample();
    }, DEBUG_LAB_V328_CONFIG.sampleIntervalMs);
    debugLabV328AddEvent('DEBUG', 'timeline', 'Timeline iniciada.');
    debugLabV328RenderIfOpen();
    return true;
}

function debugLabV328StopRecording() {
    if (!DebugLabV328.recording) return false;
    DebugLabV328.recording = false;
    if (DebugLabV328.timelineTimer) window.clearInterval(DebugLabV328.timelineTimer);
    DebugLabV328.timelineTimer = 0;
    debugLabV328AddEvent('DEBUG', 'timeline', `Timeline detenida · ${DebugLabV328.timeline.length} muestras.`);
    debugLabV328RenderIfOpen();
    return true;
}

function debugLabV328ExportSnapshot() {
    const payload = {
        exportedAt: new Date().toISOString(),
        version: DEBUG_LAB_V328_CONFIG.version,
        latestSnapshot: DebugLabV328.lastSnapshot || debugLabV328GetSnapshot(),
        lastDiff: DebugLabV328.lastDiff || null,
        lastChecks: DebugLabV328.lastChecks || null,
        timeline: DebugLabV328.timeline,
        events: DebugLabV328.events,
        runtimeErrors: DebugLabV328.runtimeErrors
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bomberman-debug-lab-v3.28-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    debugLabV328AddEvent('DEBUG', 'export', 'Reporte JSON exportado.');
    return payload;
}

function debugLabV328Clear() {
    DebugLabV328.events = [];
    DebugLabV328.runtimeErrors = [];
    DebugLabV328.timeline = [];
    DebugLabV328.snapshotHistory = [];
    DebugLabV328.lastSnapshot = null;
    DebugLabV328.lastDiff = null;
    DebugLabV328.lastChecks = null;
    DebugLabV328AddEvent('DEBUG', 'debug-lab', 'Historial local del laboratorio limpiado.');
    debugLabV328RenderIfOpen();
}

function debugLabV328Escape(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function debugLabV328Format(value) {
    if (value === null || value === undefined) return 'N/D';
    if (typeof value === 'object') return debugLabV328Escape(JSON.stringify(value));
    return debugLabV328Escape(value);
}

function debugLabV328Metric(label, value) {
    return `<div class="dbgl-v328-metric"><span>${debugLabV328Escape(label)}</span><strong>${debugLabV328Format(value)}</strong></div>`;
}

function debugLabV328PanelHtml(snapshot) {
    const checks = DebugLabV328.lastChecks?.checks || [];
    const selected = snapshot.selectedEnemy;
    const changed = DebugLabV328.lastDiff?.changed || [];
    const timelineLast = DebugLabV328.timeline.slice(-12);
    const rogue = snapshot.rogue;
    const perf = snapshot.performance;

    return `
    <div class="dbgl-v328-head">
        <div><span class="dbgl-v328-kicker">DEBUG LAB</span><strong>Diagnóstico v3.28</strong></div>
        <div class="dbgl-v328-head-actions">
            <button data-dbgl-action="snapshot">SNAPSHOT</button>
            <button data-dbgl-action="checks">DIAGNÓSTICO</button>
            <button data-dbgl-action="tests">TEST SUITE</button>
            <button data-dbgl-action="record">${DebugLabV328.recording ? 'STOP' : 'RECORD'}</button>
            <button data-dbgl-action="export">EXPORT JSON</button>
            <button data-dbgl-action="close">×</button>
        </div>
    </div>
    <div class="dbgl-v328-tabs">
        <button class="is-active" data-dbgl-tab="overview">Overview</button>
        <button data-dbgl-tab="enemy">Enemy</button>
        <button data-dbgl-tab="timeline">Timeline</button>
        <button data-dbgl-tab="events">Events</button>
        <button data-dbgl-tab="checks">Health</button>
    </div>
    <div class="dbgl-v328-body">
        <section data-dbgl-section="overview" class="dbgl-v328-section is-active">
            <div class="dbgl-v328-grid2">
                <article class="dbgl-v328-card"><h3>ENGINE</h3>${debugLabV328Metric('playing', snapshot.engine.playing)}${debugLabV328Metric('frame', snapshot.engine.animFrame)}${debugLabV328Metric('debug tests', snapshot.engine.debugTestsAvailable)}${debugLabV328Metric('errors', snapshot.runtime.capturedErrors.length + snapshot.runtime.bootErrors.length)}</article>
                <article class="dbgl-v328-card"><h3>PERFORMANCE</h3>${debugLabV328Metric('FPS medido', perf.fps)}${debugLabV328Metric('intervalo medio', `${perf.avgIntervalMs} ms`)}${debugLabV328Metric('P95 intervalo', `${perf.p95IntervalMs} ms`)}${debugLabV328Metric('max intervalo', `${perf.maxIntervalMs} ms`)}</article>
                <article class="dbgl-v328-card"><h3>WORLD</h3>${debugLabV328Metric('mapa', `${snapshot.world?.width ?? '?'}×${snapshot.world?.height ?? '?'}`)}${debugLabV328Metric('depth', snapshot.world?.depth)}${debugLabV328Metric('room', snapshot.world?.room)}${debugLabV328Metric('threat', snapshot.world?.threat)}${debugLabV328Metric('enemies', snapshot.world?.enemies)}${debugLabV328Metric('bombs / explosions', `${snapshot.world?.bombs ?? 0} / ${snapshot.world?.explosions ?? 0}`)}</article>
                <article class="dbgl-v328-card"><h3>ECONOMY / RELICS</h3>${debugLabV328Metric('coins', rogue?.coins ?? snapshot.world?.coins)}${debugLabV328Metric('relics', rogue?.relics?.length ?? 0)}${debugLabV328Metric('synergies', rogue?.activeSynergies?.join(', ') || '—')}${debugLabV328Metric('room route', rogue?.currentRoomPlan ?? 'standard')}${debugLabV328Metric('rerolls', rogue?.rerollsUsed ?? 0)}</article>
            </div>
            <div class="dbgl-v328-card"><h3>SELECTED ENEMY</h3>${selected ? `<div class="dbgl-v328-grid2">${debugLabV328Metric('index', selected.index)}${debugLabV328Metric('behavior', selected.behavior)}${debugLabV328Metric('tile', `${selected.tile.x}, ${selected.tile.y}`)}${debugLabV328Metric('actual', selected.direction)}${debugLabV328Metric('desired', selected.desiredDirection)}${debugLabV328Metric('blocked', selected.physicalBlocked)}${debugLabV328Metric('blocked ms', selected.physicalBlockedMs)}${debugLabV328Metric('recovery', selected.recoveryCount)}${debugLabV328Metric('reason', selected.recoveryReason)}${debugLabV328Metric('route', selected.routeLength)}${debugLabV328Metric('diagonal', selected.diagonalVelocity)}</div>` : '<div class="dbgl-v328-empty">No hay enemigo seleccionado.</div>'}</div>
            <div class="dbgl-v328-card"><h3>STATE DIFF</h3>${changed.length ? `<div class="dbgl-v328-list">${changed.slice(0, 24).map(c => `<div><code>${debugLabV328Escape(c.key)}</code><span>${debugLabV328Format(c.from)} → ${debugLabV328Format(c.to)}</span></div>`).join('')}</div>` : '<div class="dbgl-v328-empty">Tomá otro SNAPSHOT para comparar cambios.</div>'}</div>
        </section>

        <section data-dbgl-section="enemy" class="dbgl-v328-section">
            <div class="dbgl-v328-card"><h3>ENEMY INSPECTOR</h3><div class="dbgl-v328-select-row"><label>Enemigo <select id="dbgl-v328-enemy-select">${snapshot.enemies.map((e, i) => `<option value="${i}" ${i === DebugLabV328.selectedEnemy ? 'selected' : ''}>E${i} · ${debugLabV328Escape(e.behavior)} · ${e.tile.x},${e.tile.y}</option>`).join('')}</select></label><button data-dbgl-action="refresh">REFRESH</button></div></div>
            <div class="dbgl-v328-grid2">${selected ? Object.entries(selected).filter(([k]) => !['tile'].includes(k)).map(([k,v]) => debugLabV328Metric(k, v)).join('') : '<div class="dbgl-v328-empty">N/D</div>'}</div>
            <div class="dbgl-v328-card"><h3>ENEMIES AT A GLANCE</h3>${snapshot.enemies.length ? `<div class="dbgl-v328-table">${snapshot.enemies.map(e => `<div class="dbgl-v328-row"><span>E${e.index}</span><span>${debugLabV328Escape(e.behavior)}</span><span>${e.tile.x},${e.tile.y}</span><span>${e.direction}</span><span>${e.physicalBlocked ? 'BLOCKED' : 'OK'}</span><span>${e.recoveryCount}</span></div>`).join('')}</div>` : '<div class="dbgl-v328-empty">Sin enemigos.</div>'}</div>
        </section>

        <section data-dbgl-section="timeline" class="dbgl-v328-section">
            <div class="dbgl-v328-card"><h3>TIMELINE ${DebugLabV328.recording ? '· REC' : ''}</h3><div class="dbgl-v328-toolbar"><span>${DebugLabV328.timeline.length}/${DEBUG_LAB_V328_CONFIG.maxTimelineSamples} muestras</span><button data-dbgl-action="record">${DebugLabV328.recording ? 'DETENER' : 'GRABAR'}</button><button data-dbgl-action="clear">LIMPIAR</button></div></div>
            <div class="dbgl-v328-table">${timelineLast.length ? timelineLast.map(s => `<div class="dbgl-v328-row"><span>${s.time}</span><span>F${s.frame}</span><span>${s.fps} FPS</span><span>D${s.depth}</span><span>${s.room}</span><span>¢${s.coins}</span><span>E${s.enemies}</span><span>B${s.blockedEnemies}</span></div>`).join('') : '<div class="dbgl-v328-empty">Sin muestras.</div>'}</div>
        </section>

        <section data-dbgl-section="events" class="dbgl-v328-section">
            <div class="dbgl-v328-card"><h3>EVENTOS / ERRORES</h3><div class="dbgl-v328-toolbar"><span>${DebugLabV328.events.length} eventos · ${DebugLabV328.runtimeErrors.length} errores capturados</span><button data-dbgl-action="clear">LIMPIAR</button></div></div>
            <div class="dbgl-v328-log">${DebugLabV328.events.slice(-80).reverse().map(e => `<div class="dbgl-v328-logrow level-${String(e.level).toLowerCase()}"><span>${e.time}</span><strong>${debugLabV328Escape(e.source)}</strong><span>${debugLabV328Escape(e.message)}</span></div>`).join('') || '<div class="dbgl-v328-empty">Sin eventos propios del laboratorio.</div>'}</div>
        </section>

        <section data-dbgl-section="checks" class="dbgl-v328-section">
            <div class="dbgl-v328-card"><h3>SYSTEM HEALTH</h3><div class="dbgl-v328-toolbar"><span>${DebugLabV328.lastChecks ? `${DebugLabV328.lastChecks.passed}/${DebugLabV328.lastChecks.checks.length} PASS` : 'No ejecutado'}</span><button data-dbgl-action="checks">EJECUTAR</button><button data-dbgl-action="tests">SUITE EXISTENTE</button></div></div>
            <div class="dbgl-v328-checks">${checks.length ? checks.map(c => `<div class="dbgl-v328-check ${c.status === 'PASS' ? 'pass' : 'fail'}"><span>${c.status}</span><strong>${debugLabV328Escape(c.id)}</strong><small>${debugLabV328Escape(c.detail)}</small></div>`).join('') : '<div class="dbgl-v328-empty">Ejecutá DIAGNÓSTICO.</div>'}</div>
            <div class="dbgl-v328-card"><h3>RUNTIME ERRORS</h3>${snapshot.runtime.capturedErrors.concat(snapshot.runtime.bootErrors.map(x => ({time:'boot',type:'boot',message:x}))).slice(-30).reverse().map(e => `<div class="dbgl-v328-logrow level-error"><span>${debugLabV328Escape(e.time)}</span><strong>${debugLabV328Escape(e.type || 'runtime')}</strong><span>${debugLabV328Escape(e.message)}</span></div>`).join('') || '<div class="dbgl-v328-empty">Sin errores capturados.</div>'}</div>
        </section>
    </div>`;
}

function debugLabV328InstallStyles() {
    if (document.getElementById('dbgl-v328-styles')) return;
    const style = document.createElement('style');
    style.id = 'dbgl-v328-styles';
    style.textContent = `
    #dbgl-v328{position:fixed;inset:18px;z-index:100000;display:none;background:rgba(5,8,17,.97);color:#e5e7eb;border:1px solid rgba(96,165,250,.45);border-radius:12px;box-shadow:0 20px 70px rgba(0,0,0,.65);backdrop-filter:blur(10px);font:12px Inter,system-ui,sans-serif;overflow:hidden}
    #dbgl-v328.is-open{display:flex;flex-direction:column}
    .dbgl-v328-head{display:flex;justify-content:space-between;gap:12px;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.08);background:rgba(15,23,42,.9)}
    .dbgl-v328-kicker{display:block;color:#60a5fa;font:9px "Press Start 2P",monospace;letter-spacing:.08em;margin-bottom:4px}.dbgl-v328-head strong{font-size:14px}.dbgl-v328-head-actions,.dbgl-v328-tabs,.dbgl-v328-toolbar,.dbgl-v328-select-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.dbgl-v328-head-actions button,.dbgl-v328-tabs button,.dbgl-v328-toolbar button,.dbgl-v328-select-row button{border:1px solid rgba(255,255,255,.12);background:#111827;color:#cbd5e1;border-radius:6px;padding:5px 7px;font-size:10px;cursor:pointer}.dbgl-v328-head-actions button:hover,.dbgl-v328-tabs button:hover,.dbgl-v328-toolbar button:hover{border-color:rgba(96,165,250,.6);color:white}.dbgl-v328-tabs{padding:7px 12px;border-bottom:1px solid rgba(255,255,255,.06);background:rgba(2,6,23,.7)}.dbgl-v328-tabs button.is-active{border-color:#60a5fa;color:#bfdbfe;background:#172554}.dbgl-v328-body{flex:1;overflow:auto;padding:10px}.dbgl-v328-section{display:none}.dbgl-v328-section.is-active{display:block}.dbgl-v328-grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:8px}.dbgl-v328-card{border:1px solid rgba(255,255,255,.07);background:rgba(15,23,42,.75);border-radius:8px;padding:8px;margin-bottom:8px}.dbgl-v328-card h3{margin:0 0 7px;color:#93c5fd;font:9px "Press Start 2P",monospace}.dbgl-v328-metric{display:flex;justify-content:space-between;gap:8px;border-bottom:1px solid rgba(255,255,255,.045);padding:4px 0}.dbgl-v328-metric span{color:#94a3b8}.dbgl-v328-metric strong{color:#f8fafc;text-align:right;word-break:break-word}.dbgl-v328-empty{color:#64748b;padding:12px 2px}.dbgl-v328-list>div,.dbgl-v328-logrow,.dbgl-v328-row{display:grid;gap:7px;padding:4px 6px;border-bottom:1px solid rgba(255,255,255,.04);align-items:center}.dbgl-v328-list>div{grid-template-columns:minmax(140px,1fr) minmax(120px,1.6fr)}.dbgl-v328-table{overflow:auto}.dbgl-v328-row{grid-template-columns:70px 70px 80px 55px 80px 70px;min-width:500px}.dbgl-v328-log{max-height:55vh;overflow:auto}.dbgl-v328-logrow{grid-template-columns:70px 100px 1fr}.dbgl-v328-logrow.level-error strong,.dbgl-v328-logrow.level-warn strong{color:#fca5a5}.dbgl-v328-checks{display:grid;gap:6px}.dbgl-v328-check{display:grid;grid-template-columns:45px 160px 1fr;gap:8px;padding:6px;border-radius:7px;border:1px solid rgba(255,255,255,.05);background:rgba(15,23,42,.6)}.dbgl-v328-check.pass>span{color:#86efac}.dbgl-v328-check.fail{border-color:rgba(248,113,113,.35)}.dbgl-v328-check.fail>span{color:#fca5a5}.dbgl-v328-check small{color:#94a3b8}.dbgl-v328-select-row select{background:#0f172a;color:#e5e7eb;border:1px solid rgba(255,255,255,.12);border-radius:6px;padding:5px;min-width:250px}.dbgl-v328-select-row label{display:flex;gap:7px;align-items:center;color:#94a3b8}.dbgl-v328-status{position:fixed;right:18px;bottom:18px;z-index:100001;background:#0f172a;color:#93c5fd;padding:6px 8px;border:1px solid rgba(96,165,250,.3);border-radius:6px;font:9px "Press Start 2P",monospace}
    @media(max-width:900px){#dbgl-v328{inset:6px}.dbgl-v328-grid2{grid-template-columns:1fr}.dbgl-v328-head{flex-direction:column}.dbgl-v328-head-actions{justify-content:flex-start}.dbgl-v328-check{grid-template-columns:45px 1fr}.dbgl-v328-check small{grid-column:2}}
    `;
    document.head.appendChild(style);
}

function debugLabV328EnsureDom() {
    debugLabV328InstallStyles();
    let root = document.getElementById('dbgl-v328');
    if (root) return root;
    root = document.createElement('div');
    root.id = 'dbgl-v328';
    root.setAttribute('aria-label', 'Debug Lab v3.28');
    document.body.appendChild(root);
    root.addEventListener('click', event => {
        const tab = event.target.closest('[data-dbgl-tab]');
        if (tab) {
            root.querySelectorAll('[data-dbgl-tab]').forEach(b => b.classList.remove('is-active'));
            root.querySelectorAll('[data-dbgl-section]').forEach(s => s.classList.remove('is-active'));
            tab.classList.add('is-active');
            const section = root.querySelector(`[data-dbgl-section="${tab.dataset.dbglTab}"]`);
            if (section) section.classList.add('is-active');
            return;
        }
        const action = event.target.closest('[data-dbgl-action]');
        if (!action) return;
        const name = action.dataset.dbglAction;
        if (name === 'close') debugLabV328Close();
        else if (name === 'snapshot') debugLabV328CaptureSnapshot();
        else if (name === 'checks') debugLabV328RunChecks();
        else if (name === 'record') DebugLabV328.recording ? debugLabV328StopRecording() : debugLabV328StartRecording();
        else if (name === 'export') debugLabV328ExportSnapshot();
        else if (name === 'clear') debugLabV328Clear();
        else if (name === 'refresh') debugLabV328RenderIfOpen();
        else if (name === 'tests') {
            debugLabV328RunExistingTests().catch(error => debugLabV328CaptureError('tests', error?.message || error));
        }
    });
    root.addEventListener('change', event => {
        if (event.target.id === 'dbgl-v328-enemy-select') {
            DebugLabV328.selectedEnemy = Number(event.target.value) || 0;
            debugLabV328RenderIfOpen();
        }
    });
    return root;
}

function debugLabV328RenderIfOpen() {
    if (!DebugLabV328.open) return;
    const root = debugLabV328EnsureDom();
    root.innerHTML = debugLabV328PanelHtml(debugLabV328GetSnapshot());
}

function debugLabV328Open() {
    DebugLabV328.open = true;
    const root = debugLabV328EnsureDom();
    root.classList.add('is-open');
    root.innerHTML = debugLabV328PanelHtml(debugLabV328GetSnapshot());
    if (!DebugLabV328.monitorRaf) {
        DebugLabV328.lastFrameTime = 0;
        DebugLabV328.monitorRaf = requestAnimationFrame(debugLabV328MonitorFrame);
    }
    debugLabV328AddEvent('DEBUG', 'debug-lab', 'Debug Lab abierto.');
    return true;
}

function debugLabV328Close() {
    DebugLabV328.open = false;
    const root = document.getElementById('dbgl-v328');
    if (root) root.classList.remove('is-open');
    if (DebugLabV328.monitorRaf) {
        cancelAnimationFrame(DebugLabV328.monitorRaf);
        DebugLabV328.monitorRaf = 0;
    }
    DebugLabV328.lastFrameTime = 0;
    return true;
}

function debugLabV328Toggle() {
    return DebugLabV328.open ? debugLabV328Close() : debugLabV328Open();
}

function debugLabV328InstallConsoleHooks() {
    if (DebugLabV328.consoleHooked) return;
    DebugLabV328.consoleHooked = true;
    DebugLabV328.originalConsoleError = console.error.bind(console);
    DebugLabV328.originalConsoleWarn = console.warn.bind(console);
    console.error = (...args) => {
        DebugLabV328.originalConsoleError(...args);
        debugLabV328CaptureError('console.error', args.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '));
    };
    console.warn = (...args) => {
        DebugLabV328.originalConsoleWarn(...args);
        debugLabV328PushLimited(DebugLabV328.events, { t: Date.now(), time: debugLabV328Timestamp(), level: 'WARN', source: 'console.warn', message: debugLabV328ClampText(args.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' ')), details: null }, DEBUG_LAB_V328_CONFIG.maxEvents);
        debugLabV328RenderIfOpen();
    };
}

function debugLabV328InstallErrorHooks() {
    window.addEventListener('error', event => {
        debugLabV328CaptureError('window.error', event.message || 'Unknown error', {
            source: event.filename || '',
            line: event.lineno || 0,
            column: event.colno || 0
        });
    }, true);
    window.addEventListener('unhandledrejection', event => {
        debugLabV328CaptureError('unhandledrejection', String(event.reason || 'Unknown rejection'));
    });
}

function debugLabV328InstallKeyboard() {
    window.addEventListener('keydown', event => {
        if (event.key === 'F8') {
            event.preventDefault();
            debugLabV328Toggle();
        } else if (event.key === 'F9') {
            event.preventDefault();
            debugLabV328CaptureSnapshot();
        } else if (event.key === 'F10' && event.shiftKey) {
            event.preventDefault();
            DebugLabV328.recording ? debugLabV328StopRecording() : debugLabV328StartRecording();
        }
    });
}

function debugLabV328WireMenuButton() {
    const button = document.getElementById('btn-debug-mode');
    if (!button) return;
    button.addEventListener('click', () => {
        window.setTimeout(debugLabV328Open, 0);
    });
}

function debugLabV328Bootstrap() {
    if (DebugLabV328.installed) return true;
    if (typeof window === 'undefined' || typeof document === 'undefined') return false;
    debugLabV328EnsureDom();
    debugLabV328InstallConsoleHooks();
    debugLabV328InstallErrorHooks();
    debugLabV328InstallKeyboard();
    debugLabV328WireMenuButton();
    DebugLabV328.installed = true;
    debugLabV328AddEvent('DEBUG', 'debug-lab', 'Debug Lab v3.28 cargado. F8 abre/cierra; F9 captura snapshot; Shift+F10 graba timeline.');
    if (new URLSearchParams(location.search).get('debug') === '1') {
        window.setTimeout(() => debugLabV328Open(), 60);
    }
    return true;
}

window.DEBUG_LAB_V328_CONFIG = DEBUG_LAB_V328_CONFIG;
window.DebugLabV328 = DebugLabV328;
window.debugLabV328Open = debugLabV328Open;
window.debugLabV328Close = debugLabV328Close;
window.debugLabV328Toggle = debugLabV328Toggle;
window.debugLabV328GetSnapshot = debugLabV328GetSnapshot;
window.debugLabV328CaptureSnapshot = debugLabV328CaptureSnapshot;
window.debugLabV328RunChecks = debugLabV328RunChecks;
window.debugLabV328RunExistingTests = debugLabV328RunExistingTests;
window.debugLabV328StartRecording = debugLabV328StartRecording;
window.debugLabV328StopRecording = debugLabV328StopRecording;
window.debugLabV328ExportSnapshot = debugLabV328ExportSnapshot;
window.debugLabV328Clear = debugLabV328Clear;
window.debugLabV328GetGameState = debugLabV328GetGameState;
window.debugLabV328GetRogue = debugLabV328GetRogue;
window.debugLabV328Diff = debugLabV328Diff;
window.debugLabV328HealthChecks = debugLabV328HealthChecks;
window.debugLabV328PushTimelineSample = debugLabV328PushTimelineSample;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', debugLabV328Bootstrap, { once: true });
} else {
    debugLabV328Bootstrap();
}
