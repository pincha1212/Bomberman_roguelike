// Bomberman Roguelike v5.5 — Run Save
// Persistencia de una run en localStorage. Schema versionado. Sin dependencia de Theme/Mechanics/Hazards.
(function initRunSaveV55(global) {
    'use strict';

    const STORAGE_KEY = 'bombermanRoguelikeRunSaveV55';
    const SCHEMA_VERSION = 1;
    const AUTOSAVE_MS = 8000;
    let autosaveTimer = 0;

    function getState() { return global.BOMBER_ENGINE?.getState?.() || null; }
    function getPlayer() { return global.BOMBER_ENGINE?.getPlayer?.() || null; }

    function clone(value) {
        try { return JSON.parse(JSON.stringify(value)); } catch (_) { return null; }
    }

    function serializeDungeon(dungeon) {
        if (!dungeon) return null;
        const copy = clone({ ...dungeon, hardWallCells: undefined });
        if (!copy) return null;
        const isSet = Object.prototype.toString.call(dungeon.hardWallCells) === '[object Set]';
        if (isSet) copy.hardWallCells = [...dungeon.hardWallCells];
        else if (Array.isArray(dungeon.hardWallCells)) copy.hardWallCells = [...dungeon.hardWallCells];
        return copy;
    }

    function serializeRoomDesign(design) {
        if (!design) return null;
        const sets = ['riskCells','combatCells','treasureCells','secretCells','secretInterior'];
        const isSet = value => Object.prototype.toString.call(value) === '[object Set]';
        const out = {
            rooms: clone(design.rooms || []),
            exitGate: clone(design.exitGate),
            secretRoom: clone(design.secretRoom),
            version: design.version || '4.5.2',
            layoutVariant: design.layoutVariant || 'corridors',
            layoutMetrics: clone(design.layoutMetrics)
        };
        for (const key of sets) out[key] = isSet(design[key]) ? [...design[key]] : (Array.isArray(design[key]) ? [...design[key]] : []);
        return out;
    }

    function restoreRoomDesign(design) {
        if (!design) return null;
        const out = {
            rooms: Array.isArray(design.rooms) ? clone(design.rooms) : [],
            riskCells: new Set(design.riskCells || []),
            combatCells: new Set(design.combatCells || []),
            treasureCells: new Set(design.treasureCells || []),
            secretCells: new Set(design.secretCells || []),
            secretInterior: new Set(design.secretInterior || []),
            exitGate: clone(design.exitGate),
            secretRoom: clone(design.secretRoom),
            version: design.version || '4.5.2',
            layoutVariant: design.layoutVariant || 'corridors',
            layoutMetrics: clone(design.layoutMetrics)
        };
        if (typeof roomDesignV313 !== 'undefined') {
            roomDesignV313.rooms = out.rooms;
            roomDesignV313.riskCells = new Set(out.riskCells);
            roomDesignV313.combatCells = new Set(out.combatCells);
            roomDesignV313.treasureCells = new Set(out.treasureCells);
            roomDesignV313.secretCells = new Set(out.secretCells);
            roomDesignV313.secretInterior = new Set(out.secretInterior);
            roomDesignV313.exitGate = clone(out.exitGate);
            roomDesignV313.secretRoom = clone(out.secretRoom);
            roomDesignV313.version = out.version;
            roomDesignV313.layoutVariant = out.layoutVariant;
            roomDesignV313.layoutMetrics = clone(out.layoutMetrics);
        }
        return out;
    }

    function restoreCanonicalRelics(ids) {
        if (!Array.isArray(ids) || typeof RELICS === 'undefined') return [];
        return ids.map(item => RELICS.find(relic => relic.id === item?.id)).filter(Boolean);
    }

    function serializePlayer(player) {
        if (!player) return null;
        return clone({
            x: player.x, y: player.y, width: player.width, height: player.height,
            speed: player.speed, maxBombs: player.maxBombs, bombsPlaced: player.bombsPlaced,
            bombCooldown: player.bombCooldown, bombRange: player.bombRange,
            health: player.health, maxHealth: player.maxHealth, hasShield: player.hasShield,
            isInvincible: player.isInvincible, invincibleTimer: player.invincibleTimer,
            lastDamageFrame: player.lastDamageFrame, dir: player.dir, isMoving: player.isMoving,
            walkCycle: player.walkCycle, _frameScale: player._frameScale,
            vx: player.vx, vy: player.vy, inputDir: player.inputDir,
            inputAxis: player.inputAxis, inputBuffer: player.inputBuffer,
            inputBufferTimer: player.inputBufferTimer, hazardSlowTimer: player.hazardSlowTimer,
            hazardSlowFactor: player.hazardSlowFactor, hazardSlowType: player.hazardSlowType
        });
    }

    function createSnapshot(reason = 'manual') {
        const state = getState();
        const player = getPlayer();
        if (!state || !player || !state.runNumber || Number(state.level) < 1) return null;
        return {
            schemaVersion: SCHEMA_VERSION,
            savedAt: Date.now(),
            reason: String(reason || 'manual'),
            themeId: global.BOMBER_ENGINE?.getThemeId?.() || state.biomeV49?.themeId || 'classic',
            run: {
                runNumber: Number(state.runNumber) || 1,
                level: Number(state.level) || 1,
                score: Number(state.score) || 0,
                coins: Number(state.coins) || 0,
                bestDepth: Number(state.bestDepth) || 0,
                coinBonus: Number(state.coinBonus) || 0,
                killScoreMult: Number(state.killScoreMult) || 1,
                fireScoreMult: Number(state.fireScoreMult) || 1,
                hitInvulnerabilityBonus: Number(state.hitInvulnerabilityBonus) || 0,
                rerollDiscount: Number(state.rerollDiscount) || 0,
                rerolls: Number(state.rerolls) || 0,
                relics: clone((state.relics || []).map(r => ({ id:r.id, icon:r.icon, name:r.name, rarity:r.rarity, desc:r.desc, category:r.category || 'BOMB' }))),
                runElapsedMs: Number(state.runElapsedMs) || 0,
                roomTime: Number(state.roomTime) || 0,
                threatLevel: Number(state.threatLevel) || 0,
                lastMoveAxis: state.lastMoveAxis || 'vertical',
                lastMoveInputAt: Number(state.lastMoveInputAt) || 0,
                blocksBroken: Number(state.blocksBroken) || 0,
                totalKills: Number(state.totalKills) || 0
            },
            player: serializePlayer(player),
            biome: clone(state.biomeV49),
            journey: clone(state.runJourneyV50),
            history: clone(state.runHistoryV51),
            world: {
                gridWidth: Number(state.gridWidth) || 0,
                gridHeight: Number(state.gridHeight) || 0,
                grid: clone(state.grid),
                gridRevision: Number(state.gridRevision) || 0,
                roomTypeId: state.roomType?.id || 'STANDARD',
                exitPos: clone(state.exitPos),
                roomDesign: serializeRoomDesign(state.roomDesign),
                dungeonV44: serializeDungeon(state.dungeonV44),
                bombs: clone(state.bombs || []),
                explosions: [],
                enemies: clone(state.enemies || []),
                items: clone(state.items || []),
                hazards: clone(state.hazards || []),
                environmentHazards: clone(state.environmentHazards || []),
                materialResiduesV60: clone(state.materialResiduesV60 || []),
                hazardCooldown: Number(state.hazardCooldown) || 0,
                boss: clone(state.boss),
                bossProjectiles: clone(state.bossProjectiles || []),
                blastSerial: Number(state.blastSerial) || 0,
                difficulty: clone(state.difficulty)
            }
        };
    }

    function saveRunV55(reason = 'manual') {
        const snapshot = createSnapshot(reason);
        if (!snapshot) return false;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
            return true;
        } catch (_) {
            return false;
        }
    }

    function readSaveV55() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            const save = JSON.parse(raw);
            if (!save || save.schemaVersion !== SCHEMA_VERSION || !save.run || !save.world?.grid?.length) return null;
            return save;
        } catch (_) { return null; }
    }

    function clearRunSaveV55() {
        try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
        updateResumeButton();
    }

    function restoreRunV55() {
        const save = readSaveV55();
        const state = getState();
        const player = getPlayer();
        if (!save || !state || !player) return false;

        try {
            if (global.BOMBER_ENGINE?.getThemeId && typeof global.setActiveThemeV46 === 'function') {
                global.setActiveThemeV46(save.themeId || save.biome?.themeId || 'classic', false);
            }

            state.isPlaying = false;
            state.paused = false;
            if (state.rafId && global.cancelAnimationFrame) global.cancelAnimationFrame(state.rafId);
            state.rafId = 0;

            Object.assign(state, {
                runNumber: save.run.runNumber,
                level: save.run.level,
                score: save.run.score,
                coins: save.run.coins,
                bestDepth: save.run.bestDepth,
                coinBonus: save.run.coinBonus,
                killScoreMult: save.run.killScoreMult,
                fireScoreMult: save.run.fireScoreMult,
                hitInvulnerabilityBonus: save.run.hitInvulnerabilityBonus,
                rerollDiscount: save.run.rerollDiscount,
                rerolls: save.run.rerolls,
                relics: restoreCanonicalRelics(save.run.relics),
                runElapsedMs: save.run.runElapsedMs,
                roomTime: save.run.roomTime,
                threatLevel: save.run.threatLevel,
                lastMoveAxis: save.run.lastMoveAxis,
                lastMoveInputAt: save.run.lastMoveInputAt,
                blocksBroken: save.run.blocksBroken,
                totalKills: save.run.totalKills,
                biomeV49: clone(save.biome),
                runJourneyV50: clone(save.journey) || { visitedBiomes:[], discoveredVerbs:[], currentBiomeId:null, currentStage:1, maxDepth:0 },
                runHistoryV51: clone(save.history),
                gridWidth: save.world.gridWidth,
                gridHeight: save.world.gridHeight,
                grid: clone(save.world.grid),
                gridRevision: save.world.gridRevision,
                bombs: clone(save.world.bombs) || [],
                explosions: [],
                enemies: clone(save.world.enemies) || [],
                items: clone(save.world.items) || [],
                hazards: clone(save.world.hazards) || [],
                environmentHazards: clone(save.world.environmentHazards) || [],
                materialResiduesV60: clone(save.world.materialResiduesV60) || [],
                hazardCooldown: save.world.hazardCooldown,
                boss: clone(save.world.boss),
                bossProjectiles: clone(save.world.bossProjectiles) || [],
                blastSerial: save.world.blastSerial,
                difficulty: clone(save.world.difficulty),
                exitPos: clone(save.world.exitPos),
                roomDesign: restoreRoomDesign(save.world.roomDesign),
                roomType: typeof ROOM_TYPES !== 'undefined' ? (ROOM_TYPES[save.world.roomTypeId] || ROOM_TYPES.STANDARD) : state.roomType
            });

            const dungeon = clone(save.world.dungeonV44);
            if (dungeon && Array.isArray(dungeon.hardWallCells)) dungeon.hardWallCells = new Set(dungeon.hardWallCells);
            state.dungeonV44 = dungeon;

            Object.assign(player, clone(save.player) || {});
            if (typeof playerFSMReset === 'function') playerFSMReset('save-restore');
            state.keys = {};
            state.touchControls = { x:0, y:0 };
            if (typeof resetBombHandlingState === 'function') resetBombHandlingState();
            if (typeof updateRoguePresentation === 'function') updateRoguePresentation();
            if (typeof updateUI === 'function') updateUI(true);
            if (typeof draw === 'function') draw();

            document.getElementById('start-screen')?.classList.add('hidden');
            document.getElementById('game-over-screen')?.classList.add('hidden');
            document.getElementById('level-complete-screen')?.classList.add('hidden');
            document.getElementById('pause-screen')?.classList.add('hidden');
            document.getElementById('main-menu')?.classList.add('run-active');

            state.isPlaying = true;
            state.paused = false;
            state.lastTime = performance.now();
            state.rafId = requestAnimationFrame(typeof gameLoop === 'function' ? gameLoop : () => {});
            updateResumeButton();
            return true;
        } catch (_) {
            return false;
        }
    }

    function updateResumeButton() {
        const node = global.document?.getElementById?.('btn-resume-run');
        if (!node) return false;
        const save = readSaveV55();
        if (!save) {
            node.classList.add('hidden');
            return false;
        }
        const level = Number(save.run?.level) || 1;
        const biome = save.biome?.name ? `${save.biome.name} ${save.biome.stage || ''}`.trim() : `PROFUNDIDAD ${level}`;
        node.textContent = `CONTINUAR · ${biome.toUpperCase()}`;
        node.classList.remove('hidden');
        return true;
    }

    function install() {
        const resume = global.document?.getElementById?.('btn-resume-run');
        if (!resume) return false;
        if (!resume.dataset.bound) {
            resume.dataset.bound = '1';
            resume.addEventListener('click', () => {
                if (!restoreRunV55()) updateResumeButton();
            });
        }
        updateResumeButton();
        if (!autosaveTimer) autosaveTimer = global.setInterval(() => {
            const state = getState();
            if (state?.isPlaying && !state.paused) saveRunV55('autosave');
        }, AUTOSAVE_MS);
        return true;
    }

    global.saveRunV55 = saveRunV55;
    global.readRunSaveV55 = readSaveV55;
    global.clearRunSaveV55 = clearRunSaveV55;
    global.restoreRunV55 = restoreRunV55;
    global.updateResumeButtonV55 = updateResumeButton;
    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.saveRun = saveRunV55;
    global.BOMBER_ENGINE.loadRun = restoreRunV55;
    global.BOMBER_ENGINE.hasRunSave = () => !!readSaveV55();
    global.BOMBER_ENGINE.clearRunSave = clearRunSaveV55;

    global.addEventListener('pagehide', () => {
        const state = getState();
        if (state?.isPlaying) saveRunV55('pagehide');
    });
    global.addEventListener('beforeunload', () => {
        const state = getState();
        if (state?.isPlaying) saveRunV55('beforeunload');
    });

    function bootstrap() {
        if (install()) return;
        global.setTimeout(bootstrap, 50);
    }
    bootstrap();
})(window);
