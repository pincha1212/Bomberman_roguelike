// Bomberman Roguelike v6.12.31 — Biome liquid terrain + bomb/player interactions.
// The liquid layer remains separate from TYPES/collision and uses the real bomb lifecycle.
(function installBiomeLiquidsV631(global) {
    'use strict';

    const LIQUIDS = Object.freeze({
        autumn: Object.freeze({
            id: 'mud', label: 'BARRO', color: '#8a5a3b', edge: '#5f3b27', hi: '#b77b55', shimmer: false,
            playerSpeed: 0.62, bombMotionMultiplier: 1.50, sinkBombAfterMs: 4000, playerDamageIntervalMs: 0,
            bombFuseRate: 0, bombMessage: 'LA BOMBA SE HUNDE EN EL BARRO'
        }),
        spring: Object.freeze({
            id: 'pond', label: 'AGUA', color: '#3ca7b8', edge: '#1f6d7a', hi: '#8fe4ed', shimmer: true,
            playerSpeed: 0.72, bombMotionMultiplier: 1.65, sinkBombAfterMs: 3000, playerDamageIntervalMs: 0,
            bombFuseRate: 0, bombMessage: 'LA BOMBA SE HUNDE'
        }),
        mountains: Object.freeze({
            id: 'glacial-water', label: 'AGUA GLACIAL', color: '#6cb8d9', edge: '#326f99', hi: '#dff7ff', shimmer: true,
            playerSpeed: 0.55, bombMotionMultiplier: 1.80, sinkBombAfterMs: 0, playerDamageIntervalMs: 0,
            bombFuseRate: 0.45, bombMessage: 'LA MECHA SE CONGELA'
        }),
        beach: Object.freeze({
            id: 'sea', label: 'AGUA DE MAR', color: '#2d9ec7', edge: '#145a75', hi: '#b9f1ff', shimmer: true,
            playerSpeed: 0.80, bombMotionMultiplier: 1.35, sinkBombAfterMs: 3000, playerDamageIntervalMs: 0,
            bombFuseRate: 0, bombMessage: 'LA BOMBA ES ARRASTRADA POR EL MAR'
        }),
        underground: Object.freeze({
            id: 'toxic', label: 'LÍQUIDO TÓXICO', color: '#5da83f', edge: '#274f1d', hi: '#c5f07d', shimmer: true,
            playerSpeed: 0.76, bombMotionMultiplier: 1.40, sinkBombAfterMs: 2500, playerDamageIntervalMs: 900,
            bombFuseRate: 0, bombMessage: 'EL LÍQUIDO CORROE LA BOMBA'
        }),
        inferno: Object.freeze({
            id: 'lava', label: 'LAVA', color: '#dd5b2a', edge: '#6f2415', hi: '#ffd166', shimmer: true,
            playerSpeed: 0.78, bombMotionMultiplier: 1.10, sinkBombAfterMs: 0, playerDamageIntervalMs: 650,
            bombFuseRate: 1, instantBombDetonation: true, bombMessage: '¡LA LAVA DETONA LA BOMBA!'
        })
    });

    const runtime = {
        lastBiomeId: null,
        lastLevel: null,
        installed: false
    };

    function getBiomeId() {
        if (typeof gameState === 'undefined') return 'classic';
        return String(gameState.biomeOverrideV49 || gameState.biomeV49?.id || 'classic');
    }

    function getConfig() {
        return LIQUIDS[getBiomeId()] || null;
    }

    function hashString(text) {
        let h = 2166136261 >>> 0;
        const input = String(text ?? '');
        for (let i = 0; i < input.length; i++) {
            h ^= input.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return h >>> 0;
    }

    function createRng(seed) {
        let state = hashString(seed) || 0x9e3779b9;
        return function next() {
            state = (state + 0x6D2B79F5) >>> 0;
            let t = state;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function key(x, y) { return `${x},${y}`; }

    function isCandidate(x, y, blocked) {
        if (x <= 0 || y <= 0 || x >= gameState.gridWidth - 1 || y >= gameState.gridHeight - 1) return false;
        if (gameState.grid?.[y]?.[x] !== TYPES.EMPTY) return false;
        if (blocked.has(key(x, y))) return false;
        if (Math.abs(x - 1) <= 2 && Math.abs(y - 1) <= 2) return false;
        if (gameState.exitPos && x === gameState.exitPos.x && y === gameState.exitPos.y) return false;
        return true;
    }

    function collectCandidates(blocked) {
        const cells = [];
        for (let y = 1; y < gameState.gridHeight - 1; y++) {
            for (let x = 1; x < gameState.gridWidth - 1; x++) {
                if (isCandidate(x, y, blocked)) cells.push({ x, y });
            }
        }
        return cells;
    }

    function growPatch(start, targetSize, blocked, rng) {
        const patch = [{ x: start.x, y: start.y }];
        const patchKeys = new Set([key(start.x, start.y)]);
        const frontier = [start];
        const dirs = [[1,0],[-1,0],[0,1],[0,-1]];

        while (patch.length < targetSize && frontier.length) {
            const frontierIndex = Math.floor(rng() * frontier.length);
            const origin = frontier[frontierIndex];
            const ordered = dirs.slice().sort(() => rng() - 0.5);
            let added = false;
            for (const [dx, dy] of ordered) {
                const nx = origin.x + dx;
                const ny = origin.y + dy;
                const k = key(nx, ny);
                if (patchKeys.has(k)) continue;
                if (!isCandidate(nx, ny, blocked)) continue;
                const cell = { x: nx, y: ny };
                patch.push(cell);
                patchKeys.add(k);
                frontier.push(cell);
                added = true;
                break;
            }
            if (!added) frontier.splice(frontierIndex, 1);
        }

        if (patch.length < 3) return null;
        patch.forEach(cell => blocked.add(key(cell.x, cell.y)));
        return patch;
    }

    function generatePatchesV631() {
        if (typeof gameState === 'undefined' || !getConfig()) return [];

        const blocked = new Set();
        const rng = createRng(`liquid|${gameState.proceduralMapSeed || gameState.runNumber || 1}|${gameState.level}|${getBiomeId()}`);
        const cells = collectCandidates(blocked);
        if (cells.length < 3) return [];

        const area = gameState.gridWidth * gameState.gridHeight;
        const patchCount = Math.max(1, Math.min(4, Math.floor(area / 170) + 1));
        const patches = [];
        const maxAttempts = Math.max(20, cells.length * 2);

        for (let attempt = 0; attempt < maxAttempts && patches.length < patchCount * 3; attempt++) {
            const pool = collectCandidates(blocked);
            if (!pool.length) break;
            const start = pool[Math.floor(rng() * pool.length)];
            const targetSize = 3 + Math.floor(rng() * 5); // 3–7 tiles, siempre conectados cardinalmente.
            const patch = growPatch(start, targetSize, blocked, rng);
            if (patch) patches.push(...patch);
        }

        return patches;
    }

    function rebuildBiomeLiquidsV631(force = false) {
        if (typeof gameState === 'undefined') return false;
        const biomeId = getBiomeId();
        const level = Number(gameState.level) || 1;
        if (!force && runtime.lastBiomeId === biomeId && runtime.lastLevel === level && Array.isArray(gameState.biomeLiquidTilesV630)) {
            return true;
        }

        gameState.biomeLiquidTilesV630 = generatePatchesV631();
        runtime.lastBiomeId = biomeId;
        runtime.lastLevel = level;
        if (typeof global.invalidateRenderCacheV317 === 'function') global.invalidateRenderCacheV317();
        return true;
    }

    function hasLiquidTileV631(x, y) {
        const list = Array.isArray(gameState?.biomeLiquidTilesV630) ? gameState.biomeLiquidTilesV630 : [];
        return list.some(cell => cell.x === x && cell.y === y);
    }

    function getLiquidKindV631() {
        return getConfig();
    }

    function getLiquidBombEffectV631(x, y) {
        const liquid = getConfig();
        if (!liquid || !hasLiquidTileV631(Number(x), Number(y))) return null;
        return {
            liquidId: liquid.id,
            playerSpeed: liquid.playerSpeed,
            bombMotionMultiplier: liquid.bombMotionMultiplier,
            sinkBombAfterMs: liquid.sinkBombAfterMs,
            bombFuseRate: liquid.bombFuseRate,
            instantBombDetonation: !!liquid.instantBombDetonation,
            message: liquid.bombMessage || liquid.label
        };
    }

    function getBiomeLiquidPlayerEffectV631(entity) {
        const target = entity || global.player;
        if (!target || typeof gameState === 'undefined') return null;
        const size = Number(global.TILE_SIZE || 48);
        const gx = Math.floor((Number(target.x) + Number(target.width || 0) / 2) / size);
        const gy = Math.floor((Number(target.y) + Number(target.height || 0) / 2) / size);
        if (!hasLiquidTileV631(gx, gy)) return null;
        const liquid = getConfig();
        if (!liquid) return null;
        return {
            liquidId: liquid.id,
            playerSpeed: liquid.playerSpeed,
            damageIntervalMs: liquid.playerDamageIntervalMs,
            damageSource: liquid.id === 'lava' ? 'lava' : 'liquid'
        };
    }

    function getBombLiquidMotionMultiplierV631(x, y) {
        const effect = getLiquidBombEffectV631(x, y);
        return effect ? Math.max(1, Number(effect.bombMotionMultiplier) || 1) : 1;
    }

    function isBombSubmergedV631(bomb) {
        return !!bomb?.biomeLiquidState?.submerged;
    }

    function showLiquidBombMessageV631(bomb, effect) {
        if (!bomb || !effect || bomb.biomeLiquidState?.messageShown) return;
        bomb.biomeLiquidState.messageShown = true;
        if (typeof global.addFloatingText === 'function') {
            global.addFloatingText(effect.message, (Number(bomb.x) + 0.5) * Number(global.TILE_SIZE || 48), (Number(bomb.y) + 0.2) * Number(global.TILE_SIZE || 48), '#dff7ff');
        }
    }

    function processBombLiquidV631(bomb, dt) {
        if (!bomb || typeof gameState === 'undefined') return { consumed: false, pausedFuse: false, instant: false };
        const state = String(bomb.state || '').toLowerCase();
        if (state === 'carried') return { consumed: false, pausedFuse: true, instant: false };

        const effect = getLiquidBombEffectV631(bomb.x, bomb.y);
        if (!effect) {
            if (bomb.biomeLiquidState && !bomb.biomeLiquidState.submerged) bomb.biomeLiquidState = null;
            return { consumed: false, pausedFuse: false, instant: false };
        }

        if (!bomb.biomeLiquidState || bomb.biomeLiquidState.liquidId !== effect.liquidId) {
            bomb.biomeLiquidState = {
                liquidId: effect.liquidId,
                elapsedMs: 0,
                submerged: false,
                messageShown: false
            };
        }

        const liquidState = bomb.biomeLiquidState;
        liquidState.elapsedMs += Math.max(0, Number(dt) || 0);

        if (effect.instantBombDetonation) {
            liquidState.submerged = false;
            showLiquidBombMessageV631(bomb, effect);
            return { consumed: false, pausedFuse: false, instant: true };
        }

        if (effect.sinkBombAfterMs > 0) {
            liquidState.submerged = true;
            showLiquidBombMessageV631(bomb, effect);
            bomb.pendingDetonation = false;
            bomb.timer = Math.max(Number(bomb.timer) || 0, Number(bomb.fuseTotal) || 0);
            if (liquidState.elapsedMs >= effect.sinkBombAfterMs) {
                return { consumed: true, pausedFuse: true, instant: false };
            }
            return { consumed: false, pausedFuse: true, instant: false };
        }

        liquidState.submerged = false;
        return {
            consumed: false,
            pausedFuse: Number(effect.bombFuseRate) === 0,
            fuseRate: Number(effect.bombFuseRate) || 0,
            instant: false
        };
    }

    function updateBiomeLiquidPlayerEffectsV631(dt) {
        if (typeof gameState === 'undefined' || !gameState.isPlaying || typeof player === 'undefined') return;
        const effect = getBiomeLiquidPlayerEffectV631(player);
        if (!effect || effect.damageIntervalMs <= 0) {
            player._biomeLiquidDamageTimerV631 = 0;
            player._biomeLiquidDamageLiquidV631 = null;
            return;
        }

        if (player._biomeLiquidDamageLiquidV631 !== effect.liquidId) {
            player._biomeLiquidDamageLiquidV631 = effect.liquidId;
            player._biomeLiquidDamageTimerV631 = effect.damageIntervalMs;
        }

        player._biomeLiquidDamageTimerV631 = Math.max(0, Number(player._biomeLiquidDamageTimerV631) - Math.max(0, Number(dt) || 0));
        if (player._biomeLiquidDamageTimerV631 > 0) return;

        player._biomeLiquidDamageTimerV631 += effect.damageIntervalMs;
        if (typeof global.takeDamage === 'function') {
            global.takeDamage(effect.damageSource, player.x, player.y);
        } else if (typeof takeDamage === 'function') {
            takeDamage(effect.damageSource, player.x, player.y);
        }
    }


    function install() {
        if (runtime.installed) return true;
        if (typeof global.initLevel !== 'function') return false;
        const originalInitLevel = global.initLevel;
        global.initLevel = function initLevelV631(...args) {
            const result = originalInitLevel(...args);
            rebuildBiomeLiquidsV631(true);
            return result;
        };
        runtime.installed = true;
        rebuildBiomeLiquidsV631(true);
        global.setInterval(() => {
            if (typeof gameState === 'undefined' || !gameState.isPlaying) return;
            rebuildBiomeLiquidsV631(false);
        }, 250);
        return true;
    }

    function bootstrap() {
        if (install()) return;
        global.setTimeout(bootstrap, 40);
    }

    global.hasLiquidTileV630 = hasLiquidTileV631;
    global.getLiquidKindV630 = getLiquidKindV631;
    global.rebuildBiomeLiquidsV630 = rebuildBiomeLiquidsV631;
    global.getBiomeLiquidPlayerEffectV631 = getBiomeLiquidPlayerEffectV631;
    global.getLiquidBombEffectV631 = getLiquidBombEffectV631;
    global.getBombLiquidMotionMultiplierV631 = getBombLiquidMotionMultiplierV631;
    global.processBombLiquidV631 = processBombLiquidV631;
    global.isBombSubmergedV631 = isBombSubmergedV631;
    global.updateBiomeLiquidPlayerEffectsV631 = updateBiomeLiquidPlayerEffectsV631;
    global.BIOME_LIQUIDS_V630 = LIQUIDS;
    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.getBiomeLiquidKinds = () => ({ ...LIQUIDS });

    if (global.document?.readyState === 'loading') global.document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
    else bootstrap();
})(window);
