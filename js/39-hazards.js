// Bomberman Roguelike v5.4 — Hazards Registry
// Los hazards son entidades/timers independientes del Theme y del Mechanics Registry.
(function initHazardsRegistryV48(global) {
    'use strict';

    const HAZARD_LIMIT = 14;
    const HAZARD_RUNTIME = {
        sequence: 0,
        cooldowns: Object.create(null),
        roomToken: 0
    };

    function getState() {
        if (typeof gameState === 'undefined') return null;
        if (!Array.isArray(gameState.environmentHazards)) gameState.environmentHazards = [];
        return gameState;
    }

    function centerOfCell(x, y) {
        return {
            x: (x + 0.5) * TILE_SIZE,
            y: (y + 0.5) * TILE_SIZE
        };
    }

    function playerCenter() {
        if (typeof player === 'undefined') return { x: 0, y: 0 };
        return {
            x: player.x + player.width / 2,
            y: player.y + player.height / 2
        };
    }

    function playerCell() {
        const p = playerCenter();
        return {
            x: Math.max(0, Math.min(getState().gridWidth - 1, Math.floor(p.x / TILE_SIZE))),
            y: Math.max(0, Math.min(getState().gridHeight - 1, Math.floor(p.y / TILE_SIZE)))
        };
    }

    function cellKey(x, y) {
        return `${x},${y}`;
    }

    function isOpenCell(x, y) {
        const state = getState();
        if (!state || x <= 0 || y <= 0 || x >= state.gridWidth - 1 || y >= state.gridHeight - 1) return false;
        if (state.grid?.[y]?.[x] !== TYPES.EMPTY && state.grid?.[y]?.[x] !== TYPES.EXIT_OPEN) return false;
        if (state.exitPos && state.exitPos.x === x && state.exitPos.y === y) return false;
        if (state.roomDesign?.secretInterior?.has(cellKey(x, y))) return false;
        for (const bomb of state.bombs || []) {
            if (bomb && bomb.x === x && bomb.y === y) return false;
        }
        return true;
    }

    function randomOpenCell(minDistance = 3) {
        const state = getState();
        if (!state) return null;
        const pc = playerCell();
        const candidates = [];
        for (let y = 1; y < state.gridHeight - 1; y++) {
            for (let x = 1; x < state.gridWidth - 1; x++) {
                if (!isOpenCell(x, y)) continue;
                if (Math.abs(x - pc.x) + Math.abs(y - pc.y) < minDistance) continue;
                candidates.push({ x, y });
            }
        }
        if (!candidates.length) return null;
        return candidates[Math.floor(Math.random() * candidates.length)];
    }

    function nextId(kind) {
        HAZARD_RUNTIME.sequence += 1;
        return `hazard-v48-${kind}-${HAZARD_RUNTIME.sequence}`;
    }

    function themeHazardIds() {
        const theme = typeof global.getThemeV46 === 'function' ? global.getThemeV46() : null;
        return Array.isArray(theme?.hazards) ? theme.hazards.filter(id => !!HAZARDS[id] && getHazardConfig(id).enabled !== false) : [];
    }

    function activeCount(kind) {
        const state = getState();
        return state.environmentHazards.filter(h => h && h.kind === kind).length;
    }

    function removeExpiredHazards() {
        const state = getState();
        state.environmentHazards = state.environmentHazards.filter(h => h && h.lifeMs > 0);
    }

    function damagePlayer(entity, sourceLabel, x, y, cooldownMs = 750) {
        if (!entity || entity.damageCooldown > 0) return false;
        entity.damageCooldown = cooldownMs;
        if (typeof takeDamage === 'function') {
            takeDamage(sourceLabel, x, y);
            return true;
        }
        return false;
    }

    function pushPlayer(axis, amount) {
        const state = getState();
        if (!state || !player) return false;
        if (typeof gridMoveCardinal !== 'function') return false;
        const result = gridMoveCardinal(player, axis === 'x' ? amount : 0, axis === 'y' ? amount : 0, {
            kind: 'player',
            maxStep: 2
        });
        return !!result?.moved;
    }

    function addImpact(x, y, particleKey = 'particleDanger', count = 10, sound = 'trap') {
        if (typeof addParticles === 'function') addParticles(x, y, particleKey, count);
        if (typeof sfx === 'function') sfx(sound);
    }

    function blizzardCreate() {
        const directions = [
            { axis: 'x', dir: 1 }, { axis: 'y', dir: 1 },
            { axis: 'x', dir: -1 }, { axis: 'y', dir: -1 }
        ];
        const wind = directions[Math.floor(Math.random() * directions.length)];
        return {
            id: nextId('blizzard'),
            kind: 'blizzard',
            state: 'telegraph',
            telegraphMs: 1050,
            activeMs: 8000,
            lifeMs: 9050,
            gustTimer: 0,
            windAxis: wind.axis,
            windDir: wind.dir,
            windStrength: 0.72,
            coldTimer: 0,
            pulse: 0
        };
    }

    function blizzardUpdate(h, dt) {
        if (h.damageCooldown > 0) h.damageCooldown = Math.max(0, h.damageCooldown - dt);
        h.lifeMs -= dt;
        h.telegraphMs = Math.max(0, h.telegraphMs - dt);
        if (h.telegraphMs > 0) return;

        h.state = 'active';
        h.activeMs = Math.max(0, h.activeMs - dt);
        h.pulse += dt;
        h.coldTimer -= dt;

        const state = getState();
        if (state) {
            state.winterWindV64 = {
                active: h.activeMs > 0,
                axis: h.windAxis,
                dir: h.windDir,
                strength: h.windStrength,
                remainingMs: h.activeMs,
                source: h.id
            };
        }

        // Un pulso de frío refresca la exposición de todas las entidades.
        if (h.coldTimer <= 0 && h.activeMs > 0) {
            h.coldTimer += 900;
            if (typeof global.applyBombEffectToAllEntitiesV64 === 'function') {
                global.applyBombEffectToAllEntitiesV64('cold', {
                    durationMs: Infinity,
                    intensity: 1,
                    exposureBoostMs: 0,
                    source: 'blizzard'
                });
            }
            if (typeof global.recordRunEventV51 === 'function') {
                global.recordRunEventV51('hazard_interaction', {
                    kind: 'blizzard',
                    interaction: 'cold_pulse',
                    axis: h.windAxis,
                    dir: h.windDir
                });
            }
        }

        if (h.activeMs <= 0 && state) state.winterWindV64 = null;
    }

    function tideCreate() {
        const state = getState();
        const horizontal = Math.random() < 0.5;
        const line = horizontal ? 1 + Math.floor(Math.random() * Math.max(1, state.gridHeight - 2)) : 1 + Math.floor(Math.random() * Math.max(1, state.gridWidth - 2));
        const dir = Math.random() < 0.5 ? 1 : -1;
        return {
            id: nextId('tide'), kind: 'tide', state: 'telegraph', telegraphMs: 900,
            lifeMs: 3200, axis: horizontal ? 'x' : 'y', line, dir,
            progress: dir < 0 ? (horizontal ? state.gridWidth : state.gridHeight) + 1 : -1,
            speedCellsPerSec: 6.2, hit: false, pulse: 0
        };
    }

    function tideUpdate(h, dt) {
        const state = getState();
        h.lifeMs -= dt;
        h.telegraphMs = Math.max(0, h.telegraphMs - dt);
        h.pulse += dt;
        if (h.telegraphMs > 0) return;
        h.state = 'active';
        h.progress += h.dir * h.speedCellsPerSec * dt / 1000;
        const pc = playerCenter();
        const pCell = playerCell();
        const waveCell = Math.floor(h.progress);
        const onLine = h.axis === 'x' ? Math.abs(pCell.y - h.line) <= 1 : Math.abs(pCell.x - h.line) <= 1;
        const crossed = h.axis === 'x' ? Math.abs(pc.x / TILE_SIZE - waveCell) < 0.65 : Math.abs(pc.y / TILE_SIZE - waveCell) < 0.65;
        if (!h.hit && onLine && crossed) {
            h.hit = true;
            const amount = h.dir * TILE_SIZE * 0.72;
            pushPlayer(h.axis, amount);
            addImpact(pc.x, pc.y, 'particleImpact', 8, 'trap');
        }
    }

    function lavaCreate() {
        const cell = randomOpenCell(4);
        if (!cell) return null;
        return {
            id: nextId('lava'), kind: 'lava', x: cell.x, y: cell.y,
            state: 'telegraph', telegraphMs: 800, lifeMs: 4400,
            damageCooldown: 0, phase: Math.random() * Math.PI * 2
        };
    }

    function lavaUpdate(h, dt) {
        h.lifeMs -= dt;
        h.telegraphMs = Math.max(0, h.telegraphMs - dt);
        h.damageCooldown = Math.max(0, h.damageCooldown - dt);
        if (h.telegraphMs > 0) { h.state = 'telegraph'; return; }
        h.state = 'active';
        const p = playerCenter();
        const c = centerOfCell(h.x, h.y);
        const within = Math.abs(p.x - c.x) < TILE_SIZE * 0.44 && Math.abs(p.y - c.y) < TILE_SIZE * 0.44;
        if (within) damagePlayer(h, 'lava', c.x, c.y, 850);
    }

    function lightningCreate() {
        const cell = randomOpenCell(2) || playerCell();
        return {
            id: nextId('lightning'), kind: 'lightning', x: cell.x, y: cell.y,
            state: 'telegraph', telegraphMs: 820, strikeMs: 220, lifeMs: 1160,
            damageDone: false, phase: Math.random() * Math.PI * 2
        };
    }

    function lightningUpdate(h, dt) {
        h.lifeMs -= dt;
        if (h.state === 'telegraph') {
            h.telegraphMs = Math.max(0, h.telegraphMs - dt);
            if (h.telegraphMs <= 0) {
                h.state = 'strike';
                h.strikeMs = 220;
                const c = centerOfCell(h.x, h.y);
                addImpact(c.x, c.y, 'particleDanger', 20, 'alarm');
                if (typeof triggerScreenShake === 'function') triggerScreenShake(5, 150);
            }
            return;
        }
        if (h.state === 'strike') {
            h.strikeMs = Math.max(0, h.strikeMs - dt);
            if (!h.damageDone) {
                h.damageDone = true;
                const p = playerCenter();
                const c = centerOfCell(h.x, h.y);
                const radius = TILE_SIZE * 1.05;
                if (Math.hypot(p.x - c.x, p.y - c.y) <= radius) damagePlayer(h, 'lightning', c.x, c.y, 1200);
            }
            if (h.strikeMs <= 0) h.state = 'after';
        }
    }

    function landslideCreate() {
        const state = getState();
        const candidates = [];
        for (let y = 1; y < state.gridHeight - 1; y++) {
            for (let x = 1; x < state.gridWidth - 1; x++) {
                if (!isOpenCell(x, y)) continue;
                const nearSolid = [[0,-1],[0,1],[-1,0],[1,0]].some(([dx, dy]) => {
                    const t = state.grid[y + dy]?.[x + dx];
                    return t === TYPES.WALL || t === TYPES.BLOCK;
                });
                if (nearSolid) candidates.push({ x, y });
            }
        }
        if (!candidates.length) return null;
        const pc = playerCell();
        const safe = candidates.filter(c => Math.abs(c.x - pc.x) + Math.abs(c.y - pc.y) >= 2);
        const cell = (safe.length ? safe : candidates)[Math.floor(Math.random() * (safe.length ? safe : candidates).length)];
        return {
            id: nextId('landslide'), kind: 'landslide', x: cell.x, y: cell.y,
            state: 'telegraph', telegraphMs: 1100, impactMs: 260, lifeMs: 3300,
            damageDone: false, damageCooldown: 0, phase: Math.random() * Math.PI * 2
        };
    }

    function landslideUpdate(h, dt) {
        h.lifeMs -= dt;
        h.damageCooldown = Math.max(0, h.damageCooldown - dt);
        if (h.state === 'telegraph') {
            h.telegraphMs = Math.max(0, h.telegraphMs - dt);
            if (h.telegraphMs <= 0) {
                h.state = 'impact';
                const c = centerOfCell(h.x, h.y);
                addImpact(c.x, c.y, 'particleBlock', 18, 'trap');
                if (typeof triggerScreenShake === 'function') triggerScreenShake(4, 160);
            }
            return;
        }
        if (h.state === 'impact') {
            h.impactMs = Math.max(0, h.impactMs - dt);
            if (!h.damageDone) {
                h.damageDone = true;
                const p = playerCenter();
                const c = centerOfCell(h.x, h.y);
                if (Math.hypot(p.x - c.x, p.y - c.y) <= TILE_SIZE * 0.95) damagePlayer(h, 'landslide', c.x, c.y, 1100);
            }
            if (h.impactMs <= 0) h.state = 'debris';
        }
    }

    const HAZARDS = Object.freeze({
        blizzard: Object.freeze({ id: 'blizzard', nombre: 'Ventisca', intervalMs: 10500, initialDelayMs: 3500, maxActive: 1, create: blizzardCreate, update: blizzardUpdate }),
        tide: Object.freeze({ id: 'tide', nombre: 'Marea', intervalMs: 12500, initialDelayMs: 5000, maxActive: 1, create: tideCreate, update: tideUpdate }),
        lava: Object.freeze({ id: 'lava', nombre: 'Lava', intervalMs: 5200, initialDelayMs: 3000, maxActive: 3, create: lavaCreate, update: lavaUpdate }),
        lightning: Object.freeze({ id: 'lightning', nombre: 'Rayos', intervalMs: 4300, initialDelayMs: 4200, maxActive: 2, create: lightningCreate, update: lightningUpdate }),
        landslide: Object.freeze({ id: 'landslide', nombre: 'Derrumbes', intervalMs: 7200, initialDelayMs: 6000, maxActive: 2, create: landslideCreate, update: landslideUpdate })
    });


    function mergeConfig(base, override) {
        if (!base || typeof base !== 'object') return override && typeof override === 'object' ? { ...override } : {};
        if (!override || typeof override !== 'object') return { ...base };
        const result = { ...base };
        for (const [key, value] of Object.entries(override)) {
            if (value && typeof value === 'object' && !Array.isArray(value) && result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])) result[key] = mergeConfig(result[key], value);
            else result[key] = value;
        }
        return result;
    }

    function getHazardConfig(kind) {
        const theme = typeof global.getThemeV46 === 'function' ? global.getThemeV46() : null;
        const themeConfig = theme?.hazardConfig?.[kind] || {};
        const stageConfig = (typeof gameState !== 'undefined' ? gameState.biomeV49?.stageConfig?.hazards?.[kind] : null) || {};
        return mergeConfig(themeConfig, stageConfig);
    }

    function getHazardDefinition(kind) {
        const base = HAZARDS[kind];
        if (!base) return null;
        const config = getHazardConfig(kind);
        return { ...base, ...config, config };
    }

    function jitter(intervalMs) {
        const span = intervalMs * 0.22;
        return intervalMs - span + Math.random() * span * 2;
    }

    function resetHazardsV48() {
        const state = getState();
        if (!state) return false;
        state.environmentHazards = [];
        state.winterWindV64 = null;
        HAZARD_RUNTIME.roomToken += 1;
        HAZARD_RUNTIME.cooldowns = Object.create(null);
        for (const id of themeHazardIds()) {
            const def = getHazardDefinition(id);
            HAZARD_RUNTIME.cooldowns[id] = Math.max(1000, Number(def?.initialDelayMs) || HAZARDS[id].initialDelayMs);
        }
        return true;
    }

    function spawnScheduledHazards(dt) {
        const state = getState();
        if (!state || !state.isPlaying || state.paused) return;
        for (const id of themeHazardIds()) {
            const def = getHazardDefinition(id);
            if (!def) continue;
            HAZARD_RUNTIME.cooldowns[id] = Math.max(0, Number(HAZARD_RUNTIME.cooldowns[id]) - dt);
            if (HAZARD_RUNTIME.cooldowns[id] > 0) continue;
            if (activeCount(id) >= Number(def.maxActive) || state.environmentHazards.length >= HAZARD_LIMIT) {
                HAZARD_RUNTIME.cooldowns[id] = 250;
                continue;
            }
            const entity = def.create();
            if (entity) state.environmentHazards.push(entity);
            HAZARD_RUNTIME.cooldowns[id] = jitter(Number(def.intervalMs) || HAZARDS[id].intervalMs);
        }
    }

    function updateHazardsV48(dt) {
        const state = getState();
        if (!state || !state.isPlaying || state.paused) return;
        spawnScheduledHazards(dt);
        const active = themeHazardIds();
        if (!active.length) {
            if (state.environmentHazards.length) state.environmentHazards = [];
            state.winterWindV64 = null;
            return;
        }
        const activeSet = new Set(active);
        for (const h of state.environmentHazards) {
            if (!h || !HAZARDS[h.kind]) continue;
            if (!activeSet.has(h.kind)) {
                h.lifeMs = 0;
                continue;
            }
            if (h.lifeMs <= 0) continue;
            HAZARDS[h.kind].update(h, dt);
        }
        removeExpiredHazards();
        if (!state.environmentHazards.some(h => h?.kind === 'blizzard' && h.lifeMs > 0 && h.state === 'active')) {
            state.winterWindV64 = null;
        }
    }

    function rgba(hex, alpha) {
        const value = String(hex || '#ffffff').replace('#', '');
        const normalized = value.length === 3 ? value.split('').map(c => c + c).join('') : value;
        const n = parseInt(normalized, 16);
        if (!Number.isFinite(n)) return `rgba(255,255,255,${alpha})`;
        return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
    }

    function hazardColor(kind, fallback) {
        const map = {
            blizzard: ['wallHighlight', '#dff7ff'], tide: ['powerupAccent', '#38bdf8'],
            lava: ['particleFire', '#ff8a3d'], lightning: ['particleDanger', '#ffe066'],
            landslide: ['particleBlock', '#c2410c']
        };
        const key = map[kind];
        return typeof global.themeColorV46 === 'function' && key ? global.themeColorV46(key[0], key[1]) : fallback;
    }

    function drawHazardsV48() {
        const state = getState();
        if (!state || !state.environmentHazards?.length || !ctx) return;
        const cam = state.camera || { x: 0, y: 0 };
        ctx.save();
        ctx.translate(-Math.floor(cam.x || 0), -Math.floor(cam.y || 0));
        for (const h of state.environmentHazards) {
            if (!h || h.lifeMs <= 0) continue;
            const c = hazardColor(h.kind, '#ffffff');
            if (h.kind === 'blizzard') {
                ctx.fillStyle = rgba(c, h.state === 'active' ? 0.10 : 0.035);
                ctx.fillRect(cam.x || 0, cam.y || 0, canvas.width, canvas.height);
                ctx.strokeStyle = c;
                ctx.globalAlpha = h.state === 'active' ? 0.34 : 0.20;
                ctx.setLineDash([5, 7]);
                const pc = playerCenter();
                ctx.beginPath();
                ctx.arc(pc.x, pc.y, 120, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            } else if (h.kind === 'tide') {
                const pos = h.progress * TILE_SIZE;
                ctx.fillStyle = rgba(c, h.state === 'active' ? 0.22 : 0.07);
                if (h.axis === 'x') ctx.fillRect(pos - 18, h.line * TILE_SIZE, 36, TILE_SIZE);
                else ctx.fillRect(h.line * TILE_SIZE, pos - 18, TILE_SIZE, 36);
                ctx.strokeStyle = c;
                ctx.globalAlpha = 0.7;
                ctx.lineWidth = 2;
                ctx.beginPath();
                if (h.axis === 'x') { ctx.moveTo(pos, h.line * TILE_SIZE); ctx.lineTo(pos, (h.line + 1) * TILE_SIZE); }
                else { ctx.moveTo(h.line * TILE_SIZE, pos); ctx.lineTo((h.line + 1) * TILE_SIZE, pos); }
                ctx.stroke();
            } else {
                const x = h.x * TILE_SIZE;
                const y = h.y * TILE_SIZE;
                const cx = x + TILE_SIZE / 2;
                const cy = y + TILE_SIZE / 2;
                const pulse = 0.45 + Math.sin((state.animFrame || 0) * 0.25 + (h.phase || 0)) * 0.18;
                ctx.fillStyle = rgba(c, Math.max(0.08, pulse * (h.state === 'telegraph' ? 0.28 : 0.42)));
                ctx.fillRect(x + 3, y + 3, TILE_SIZE - 6, TILE_SIZE - 6);
                ctx.strokeStyle = c;
                ctx.globalAlpha = h.state === 'telegraph' ? 0.72 : 0.95;
                ctx.lineWidth = h.state === 'impact' || h.state === 'strike' ? 3 : 2;
                if (h.state === 'telegraph') ctx.setLineDash([4, 4]);
                ctx.strokeRect(x + 6, y + 6, TILE_SIZE - 12, TILE_SIZE - 12);
                ctx.setLineDash([]);
                ctx.fillStyle = c;
                ctx.font = 'bold 14px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const icons = { lava: '▲', lightning: '⚡', landslide: '◆' };
                ctx.fillText(icons[h.kind] || '!', cx, cy);
            }
        }
        ctx.restore();
    }

    function wrapRuntime() {
        if (wrapRuntime.installed) return true;
        if (typeof global.update !== 'function' || typeof global.draw !== 'function' || typeof global.initLevel !== 'function') return false;

        wrapRuntime.originalUpdate = global.update;
        wrapRuntime.originalDraw = global.draw;
        wrapRuntime.originalInitLevel = global.initLevel;

        global.update = function updateV48(dt) {
            const result = wrapRuntime.originalUpdate(dt);
            updateHazardsV48(dt);
            // v6.4: la ventisca debe actualizar primero su estado de viento y
            // recién después empujar jugador, enemigos, eco y bombas.
            if (typeof global.winterSystemUpdateV64 === 'function') {
                global.winterSystemUpdateV64(dt);
            }
            return result;
        };
        global.draw = function drawV48() {
            wrapRuntime.originalDraw();
            drawHazardsV48();
        };
        global.initLevel = function initLevelV48(...args) {
            const result = wrapRuntime.originalInitLevel(...args);
            resetHazardsV48();
            return result;
        };
        wrapRuntime.installed = true;
        return true;
    }

    function bootstrap() {
        if (wrapRuntime()) return;
        setTimeout(bootstrap, 50);
    }

    global.HAZARDS = HAZARDS;
    global.HazardV48 = Object.freeze({ reset: resetHazardsV48, update: updateHazardsV48, draw: drawHazardsV48 });
    global.getActiveHazardIdsV48 = themeHazardIds;
    global.getHazardRegistryV48 = () => ({ ...HAZARDS });
    global.getHazardConfigV49 = getHazardConfig;
    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.getHazardRegistry = () => ({ ...HAZARDS });
    global.BOMBER_ENGINE.getHazardConfig = getHazardConfig;
    global.BOMBER_ENGINE.getActiveHazardIds = themeHazardIds;
    global.BOMBER_ENGINE.getHazardEntities = () => [...(getState()?.environmentHazards || [])];

    bootstrap();
})(window);
