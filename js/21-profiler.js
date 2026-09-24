// Bomberman Roguelike v3.17 — Real Runtime Profiler
// Se activa con ?debug=1&profile=1 o mediante F8 desde Debug Mode.
// Medición únicamente durante frames reales del juego; fuera de un frame no registra tests.
(() => {
    'use strict';

    const params = new URLSearchParams(window.location.search);
    const autoEnabled = params.get('profile') === '1';
    const SAMPLE_SIZE = 180;
    const FRAME_BUDGET_MS = 1000 / 60;
    const SLOW_FRAME_MS = 33.4;
    const HITCH_FRAME_MS = 50;
    const UI_REFRESH_MS = 180;

    const profiler = {
        enabled: autoEnabled,
        activeFrame: false,
        frameStart: 0,
        frameTimestamp: 0,
        lastTimestamp: 0,
        currentSystems: Object.create(null),
        frames: [],
        systemStats: new Map(),
        lastUiRefresh: 0,
        totalFrames: 0,
        overBudgetFrames: 0,
        slowFrames: 0,
        hitchFrames: 0,
        resetCount: 0,

        beginFrame(timestamp) {
            if (!this.enabled || this.activeFrame) return;
            this.activeFrame = true;
            this.frameStart = performance.now();
            this.frameTimestamp = Number(timestamp) || performance.now();
            this.currentSystems = Object.create(null);
        },

        endFrame(timestamp) {
            if (!this.enabled || !this.activeFrame) return;
            const workMs = Math.max(0, performance.now() - this.frameStart);
            const currentTimestamp = Number(timestamp) || this.frameTimestamp;
            const intervalMs = this.lastTimestamp > 0
                ? Math.max(0, currentTimestamp - this.lastTimestamp)
                : 0;

            this.lastTimestamp = currentTimestamp;
            this.activeFrame = false;
            this.totalFrames += 1;
            if (workMs > FRAME_BUDGET_MS) this.overBudgetFrames += 1;
            if (intervalMs > SLOW_FRAME_MS) this.slowFrames += 1;
            if (intervalMs > HITCH_FRAME_MS) this.hitchFrames += 1;

            pushCapped(this.frames, { workMs, intervalMs }, SAMPLE_SIZE);

            for (const [label, value] of Object.entries(this.currentSystems)) {
                let stats = this.systemStats.get(label);
                if (!stats) {
                    stats = {
                        samples: [],
                        calls: 0,
                        totalMs: 0,
                        lastMs: 0,
                        maxMs: 0
                    };
                    this.systemStats.set(label, stats);
                }
                stats.calls += value.calls;
                stats.totalMs += value.ms;
                stats.lastMs = value.ms;
                stats.maxMs = Math.max(stats.maxMs, value.ms);
                pushCapped(stats.samples, value.ms, SAMPLE_SIZE);
            }
        },

        measure(label, fn) {
            if (!this.enabled || !this.activeFrame) return fn();
            const start = performance.now();
            try {
                return fn();
            } finally {
                const ms = Math.max(0, performance.now() - start);
                const entry = this.currentSystems[label] || { ms: 0, calls: 0 };
                entry.ms += ms;
                entry.calls += 1;
                this.currentSystems[label] = entry;
            }
        },

        toggle() {
            this.enabled = !this.enabled;
            this.activeFrame = false;
            this.lastTimestamp = 0;
            dispatchProfilerUpdate();
            return this.enabled;
        },

        reset() {
            this.frames.length = 0;
            this.systemStats.clear();
            this.totalFrames = 0;
            this.overBudgetFrames = 0;
            this.slowFrames = 0;
            this.hitchFrames = 0;
            this.lastTimestamp = 0;
            this.currentSystems = Object.create(null);
            this.resetCount += 1;
            dispatchProfilerUpdate();
        },

        snapshot() {
            const frame = summarizeFrameHistory(this.frames);
            const systems = [...this.systemStats.entries()]
                .map(([label, stats]) => ({
                    label,
                    calls: stats.calls,
                    callsPerFrame: this.totalFrames ? stats.calls / this.totalFrames : 0,
                    avgMs: average(stats.samples),
                    p95Ms: percentile(stats.samples, 95),
                    lastMs: stats.lastMs,
                    maxMs: stats.maxMs
                }))
                .filter(item => item.avgMs > 0 || item.calls > 0)
                .sort((a, b) => b.avgMs - a.avgMs || b.p95Ms - a.p95Ms);

            return {
                enabled: this.enabled,
                totalFrames: this.totalFrames,
                frame: frame,
                overBudgetPercent: this.totalFrames ? (this.overBudgetFrames / this.totalFrames) * 100 : 0,
                slowFrames: this.slowFrames,
                hitchFrames: this.hitchFrames,
                systems,
                counts: readRuntimeCounts(),
                memory: readMemory()
            };
        }
    };

    function pushCapped(array, value, max) {
        array.push(value);
        if (array.length > max) array.splice(0, array.length - max);
    }

    function average(values) {
        if (!values.length) return 0;
        let total = 0;
        for (const value of values) total += Number(value) || 0;
        return total / values.length;
    }

    function percentile(values, p) {
        if (!values.length) return 0;
        const sorted = values.slice().sort((a, b) => a - b);
        const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
        return Number(sorted[index]) || 0;
    }

    function summarizeFrameHistory(frames) {
        if (!frames.length) {
            return { lastMs: 0, avgMs: 0, p95Ms: 0, minMs: 0, maxMs: 0, fps: 0, avgIntervalMs: 0 };
        }
        const work = frames.map(frame => frame.workMs);
        const intervals = frames.map(frame => frame.intervalMs).filter(value => value > 0);
        const avgIntervalMs = average(intervals);
        return {
            lastMs: frames[frames.length - 1].workMs,
            avgMs: average(work),
            p95Ms: percentile(work, 95),
            minMs: Math.min(...work),
            maxMs: Math.max(...work),
            avgIntervalMs,
            fps: avgIntervalMs > 0 ? 1000 / avgIntervalMs : 0
        };
    }

    function readRuntimeCounts() {
        const gs = window.BOMBER_ENGINE?.getState?.();
        if (!gs) return {};
        return {
            enemies: Array.isArray(gs.enemies) ? gs.enemies.length : 0,
            bombs: Array.isArray(gs.bombs) ? gs.bombs.length : 0,
            explosions: Array.isArray(gs.explosions) ? gs.explosions.length : 0,
            particles: Array.isArray(gs.particles) ? gs.particles.length : 0,
            floaters: Array.isArray(gs.floaters) ? gs.floaters.length : 0,
            items: Array.isArray(gs.items) ? gs.items.length : 0,
            traps: Array.isArray(gs.traps) ? gs.traps.length : 0,
            bossProjectiles: Array.isArray(gs.bossProjectiles) ? gs.bossProjectiles.length : 0
        };
    }

    function readMemory() {
        const memory = performance.memory;
        if (!memory) return { available: false, usedMB: 0, totalMB: 0, limitMB: 0 };
        return {
            available: true,
            usedMB: memory.usedJSHeapSize / 1048576,
            totalMB: memory.totalJSHeapSize / 1048576,
            limitMB: memory.jsHeapSizeLimit / 1048576
        };
    }

    function dispatchProfilerUpdate() {
        if (window.DEBUG_MODE?.enabled) {
            window.dispatchEvent(new CustomEvent('bomber-profiler-updated'));
        }
    }

    function wrapFunction(name, label = name) {
        const original = window[name];
        if (typeof original !== 'function' || original.__bomberProfilerWrapped) return false;
        const wrapped = function profilerWrappedFunction(...args) {
            return profiler.measure(label, () => original.apply(this, args));
        };
        Object.defineProperty(wrapped, '__bomberProfilerWrapped', { value: true });
        Object.defineProperty(wrapped, '__bomberProfilerOriginal', { value: original });
        window[name] = wrapped;
        return true;
    }

    // Estas son las fronteras de trabajo más útiles para el diagnóstico.
    const SYSTEMS = [
        ['update', 'UPDATE / TOTAL'],
        ['clampLargeEntities', 'UPDATE / LIMITES'],
        ['tickRunClock', 'UPDATE / RUN CLOCK'],
        ['updateCombatFeedback', 'UPDATE / COMBAT FEEDBACK'],
        ['renderImmersion', 'UPDATE / INMERSION'],
        ['updatePlayerInvulnerability', 'UPDATE / PLAYER INVULN'],
        ['updateRoomThreat', 'UPDATE / THREAT'],
        ['updateHazards', 'UPDATE / TRAPS'],
        ['updateBoss', 'UPDATE / BOSS'],
        ['updatePlayerMovement', 'UPDATE / PLAYER MOVEMENT'],
        ['updateCamera', 'UPDATE / CAMERA'],
        ['updateAdaptiveInterface', 'UPDATE / ADAPTIVE UI'],
        ['updateBombHandling', 'UPDATE / BOMBS'],
        ['updateEnemyAI', 'UPDATE / ENEMY AI'],
        ['updateUI', 'UPDATE / HUD'],
        ['draw', 'RENDER / TOTAL'],
        ['ensureTerrainCacheV317', 'RENDER / TERRAIN CACHE'],
        ['drawRoomDesignLayerV313', 'RENDER / ROOM DESIGN'],
        ['drawHazards', 'RENDER / HAZARDS'],
        ['renderBombRangePreview', 'RENDER / BOMB PREVIEW'],
        ['drawBombChainLinks', 'RENDER / BOMB LINKS'],
        ['drawExplosionSprite', 'RENDER / EXPLOSIONS'],
        ['drawEnemySprite', 'RENDER / ENEMY SPRITES'],
        ['drawBoss', 'RENDER / BOSS'],
        ['drawBombermanSprite', 'RENDER / PLAYER SPRITE'],
        ['drawAmbientDust', 'RENDER / AMBIENT DUST'],
        ['drawLighting', 'RENDER / LIGHTING'],
        ['renderCombatFeedback', 'RENDER / COMBAT FX'],
        ['drawDebugWorldOverlay', 'RENDER / DEBUG OVERLAY']
    ];

    for (const [name, label] of SYSTEMS) wrapFunction(name, label);

    window.BOMBER_PROFILER = profiler;
    window.BOMBER_PROFILER.snapshot = profiler.snapshot.bind(profiler);

    // Permite consultar estadísticas desde consola sin activar el profiler.
    window.bomberProfilerSnapshot = () => profiler.snapshot();
})();
