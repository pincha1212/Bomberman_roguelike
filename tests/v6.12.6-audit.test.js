#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const JS_DIR = path.join(ROOT, 'js');

function read(rel) {
    return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function testRepositoryShape() {
    const jsFiles = fs.readdirSync(JS_DIR).filter(name => name.endsWith('.js'));
    assert(jsFiles.length === 42, `Expected 42 JS modules, got ${jsFiles.length}`);
    const index = read('index.html');
    const refs = [...index.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m => m[1].split('?')[0]);
    assert(refs.length === 40, `Expected 40 script tags, got ${refs.length}`);
    assert(!index.includes('tests/v6.12.6-audit.test.js'), 'Node audit test must not be loaded by gameplay runtime');
    for (const ref of refs) assert(fs.existsSync(path.join(ROOT, ref)), `Missing script: ${ref}`);
    for (const name of ['01-core.js','11-bombs.js','31-roguelike-update.js','44-run-save.js','55-bomb-interactions.js']) {
        assert(index.includes(`js/${name}?v=6.12.6`), `Cache-bust missing for ${name}`);
    }
}

function loadInteractionModules() {
    const context = {
        console,
        Math,
        Set,
        Object,
        Number,
        String,
        Boolean,
        Array,
        JSON,
        parseInt,
        parseFloat,
        isFinite,
        window: null
    };
    context.window = context;

    const player = {
        x: 4 * 48,
        y: 4 * 48,
        width: 48,
        height: 48,
        dir: 'right',
        archetype: 'player',
        capabilityProfileV681: { permanent: ['kick','grab','carry','throw'], byGroup: {} },
        kickCooldown: 0
    };
    const state = {
        gridWidth: 12,
        gridHeight: 12,
        grid: Array.from({ length: 12 }, () => Array(12).fill(0)),
        bombs: [],
        enemies: [],
        boss: null,
        level: 1,
        keys: {},
        touchControls: {}
    };
    context.BOMBER_ENGINE = {
        getState: () => state,
        getPlayer: () => player,
        getTileSize: () => 48,
        getWorldTypes: () => ({ WALL: 1, BLOCK: 2 })
    };
    context.BOMB_V4_STATES = Object.freeze({ MOVING:'moving', ARMED:'armed', CARRIED:'carried', EXPLODING:'exploding' });
    context.startBombV4Motion = (bomb, targetWorldX, targetWorldY, duration, arc) => {
        bomb.state = context.BOMB_V4_STATES.MOVING;
        bomb.motionState = context.BOMB_V4_STATES.MOVING;
        bomb.motionTargetX = targetWorldX;
        bomb.motionTargetY = targetWorldY;
        bomb.motionTargetTileX = Math.floor(targetWorldX / 48);
        bomb.motionTargetTileY = Math.floor(targetWorldY / 48);
        bomb.motionTimer = duration;
        bomb.motionDuration = duration;
        bomb.motionArc = arc;
        return true;
    };
    context.armBombV4 = bomb => {
        bomb.state = context.BOMB_V4_STATES.ARMED;
        bomb.motionState = 'idle';
        return true;
    };

    vm.createContext(context);
    vm.runInContext(read('js/54-entity-capabilities.js'), context, { filename:'54-entity-capabilities.js' });
    vm.runInContext(read('js/55-bomb-interactions.js'), context, { filename:'55-bomb-interactions.js' });
    return { context, player, state };
}

function makeBomb(state, x, y, timer = 1500) {
    const bomb = {
        x, y,
        worldX: (x + 0.5) * 48,
        worldY: (y + 0.5) * 48,
        timer,
        fuseTotal: 1500,
        state: 'armed',
        motionState: 'idle',
        playerPassThrough: false,
        carriedBy: null,
        motionQueue: []
    };
    state.bombs.push(bomb);
    return bomb;
}

function testKickGrabThrow() {
    const { context, player, state } = loadInteractionModules();

    const kickBomb = makeBomb(state, 5, 4, 1400);
    assert(context.startBombKickV682(kickBomb, player, {x:1,y:0}) === true, 'KICK should start');
    assert(kickBomb.state === 'moving', 'KICK must put bomb in MOVING');
    assert(kickBomb.kickRemainingV682 === 4, 'Player KICK hard range must be 4 tiles');
    assert(context.startBombKickV682(kickBomb, player, {x:1,y:0}) === false, 'KICK must reject re-kicking a bomb already MOVING');
    const oneTileMs = 1000 / 6;
    context.updateBombKickMotionV682(kickBomb, oneTileMs);
    context.updateBombKickMotionV682(kickBomb, oneTileMs);
    context.updateBombKickMotionV682(kickBomb, oneTileMs);
    context.updateBombKickMotionV682(kickBomb, oneTileMs);
    context.updateBombKickMotionV682(kickBomb, oneTileMs);
    assert(kickBomb.x === 9 && kickBomb.state === 'armed', 'Player KICK must stop after exactly 4 tiles');

    player.kickCooldown = 180;
    const blockedKickBomb = makeBomb(state, 5, 5, 1400);
    assert(context.startBombKickV682(blockedKickBomb, player, {x:1,y:0}) === false, 'KICK cooldown must block frequency only');

    state.bombs = [];
    const grabBomb = makeBomb(state, 4, 3, 1200);
    player.dir = 'right';
    player.kickCooldown = 0;
    assert(context.handlePlayerBombActionV683() === true, 'GRAB action should succeed from any adjacent tile');
    assert(grabBomb.state === 'carried', 'GRAB must transition bomb to CARRIED');
    assert(grabBomb.carriedBy === player, 'GRAB must bind carriedBy to player');
    assert(player.carriedBombV682 === grabBomb, 'GRAB must bind player.carriedBombV682');
    assert(grabBomb.x === -999 && grabBomb.y === -999, 'CARRIED bomb must leave grid coordinates');
    assert(grabBomb.timer === 0 && grabBomb.carriedTimer === 1200, 'Fuse must pause while CARRIED');

    assert(context.throwCarriedBombV683(player) === true, 'THROW should succeed with THROW + CARRIED');
    assert(grabBomb.interactionMotionV682 === 'throw', 'THROW must use throw interaction');
    assert(grabBomb.timer === 1200, 'THROW must conserve remaining fuse');
    assert(grabBomb.state === 'moving', 'THROW must launch into MOVING');

    const deathGrab = makeBomb(state, 4, 3, 900);
    player.carriedBombV682 = null;
    player.kickCooldown = 0;
    assert(context.grabBombV682(player, deathGrab) === true, 'GRAB must allow death-path verification');
    assert(context.releaseCarriedBombV682(player, 'death') === true, 'Death release must explicitly release CARRIED bomb');
    assert(deathGrab.state === 'armed' && deathGrab.releasedFromDeathV682 === true, 'Death release must return carried bomb to ARMADA and mark death reason');

    const boss = { x: 7 * 48, y: 4 * 48, width:48, height:48, archetype:'boss', dir:'left', vx:0, vy:0, capabilityProfileV681:{permanent:[], byGroup:{}} };
    state.boss = boss;
    const bossBomb = makeBomb(state, 8, 4, 1200);
    assert(context.canKick(boss) === true, 'Boss canKick must come from archetype eligibility');
    assert(context.isKickActiveV681(boss) === false, 'Boss canKick eligibility is distinct from player active capability state');
    assert(context.startBombKickV682(bossBomb, boss, {x:-1,y:0}) === true, 'Non-player KICK path must use canKick eligibility');

    const chaser = { x: 8 * 48, y: 5 * 48, width:48, height:48, archetype:'chaser', dir:'left', vx:0, vy:0, capabilityProfileV681:{permanent:[], byGroup:{}} };
    assert(context.canKick(chaser) === false, 'Chaser must not be KICK-eligible');
}

function testNoLegacyKickAuthority() {
    const core = read('js/11-bombs.js');
    const interactions = read('js/55-bomb-interactions.js');
    assert(!core.includes('player.kickTimer'), 'Legacy kickTimer must not remain in 11-bombs.js');
    assert(!core.includes('kickDurationMs'), 'Legacy kickDurationMs must not remain in 11-bombs.js');
    assert(/function kickBombV67[\s\S]*startBombKickV682\(bomb,currentPlayer/.test(core), 'Compatibility kick wrapper must delegate');
    assert(!/function kickBombV67[\s\S]*isKickActiveV681/.test(core), 'Compatibility wrapper must not pre-gate KICK');
    assert(core.includes('getRuntimePlayerV682'), 'Compatibility wrappers must resolve player through a safe runtime guard');
    assert(core.includes("typeof player !== 'undefined'"), 'Compatibility wrappers must guard undeclared player global');
    assert(core.includes('globalThis.startBombKickV682') && core.includes('globalThis.getAdjacentPlayerBombV682'), 'Wrappers must use globalThis consistently');
    assert(interactions.trimEnd().endsWith('})(globalThis);'), 'Bomb interactions must publish through globalThis consistently');
    assert(/if \(capability === 'kick'\) return !!global\.isKickActiveV681/.test(interactions), 'Player KICK gate must be isKickActiveV681');
    const core01 = read('js/01-core.js');
    const cap54 = read('js/54-entity-capabilities.js');
    assert(!core01.includes('function isKickActiveV681'), '01-core must not define a competing KICK authority');
    assert(cap54.includes('function isKickActiveV681(entity)'), '54-entity-capabilities must own isKickActiveV681');
    assert(interactions.includes('const PLAYER_KICK_COOLDOWN_MS_V682 = 180;'), 'KICK cooldown must declare milliseconds explicitly');
    assert(interactions.includes('entity.kickCooldown = PLAYER_KICK_COOLDOWN_MS_V682'), 'KICK must use explicit millisecond cooldown constant');
    assert(core.includes('player.kickCooldown=Math.max(0,(player.kickCooldown||0)-dt);'), 'KICK cooldown must decrement inside bombUpdate(dt)');
    const loop = read('js/08-loop-ui.js');
    assert(loop.includes('let dt = timestamp - gameState.lastTime;'), 'Game loop dt must derive from requestAnimationFrame timestamps');
    assert(loop.includes('update(dt);'), 'Game loop must pass dt into update');
    const base55 = fs.readFileSync(path.resolve(ROOT, '../bm_base/Bomberman_roguelike-main/js/55-bomb-interactions.js'), 'utf8');
    const current55 = read('js/55-bomb-interactions.js');
    const throwNames = ['function getThrowPathV683', 'function throwCarriedBombV683', 'function handlePlayerBombActionV683'];
    for (const name of throwNames) {
        const baseIndex = base55.indexOf(name);
        const currentIndex = current55.indexOf(name);
        assert(baseIndex >= 0 && currentIndex >= 0, `Missing THROW function: ${name}`);
    }
    const normalizeThrow = source => source.replace(/\/\* current v6\.\d+\.\d+.*?\*\//g, '').replace(/v6\.\d+\.\d+/g, 'VERSION');
    // v6.12.6 must not claim a THROW behavioral change; its audited THROW functions are identical to v6.12.3.
    for (const name of throwNames) {
        const start = current55.indexOf(name);
        const next = current55.indexOf('\n    function ', start + 10);
        const baseStart = base55.indexOf(name);
        const baseNext = base55.indexOf('\n    function ', baseStart + 10);
        const curBlock = normalizeThrow(current55.slice(start, next < 0 ? current55.length : next));
        const baseBlock = normalizeThrow(base55.slice(baseStart, baseNext < 0 ? base55.length : baseNext));
        assert(curBlock === baseBlock, `THROW implementation changed unexpectedly: ${name}`);
    }
}

function testSpeedCapSemantics() {
    const core = read('js/01-core.js');
    assert(core.includes("hard: Object.freeze({ maxHealth: 10, maxBombs: 8, bombRange: 12, speed: 7.0 })"), 'Central speed hard cap must be 7');
    assert(/player\.speed>=cap\.speed\) return false/.test(core), 'SPEED_UP must be a no-op at cap');
    assert(core.includes('El no-op en 7.0 es intencional.'), 'SPEED_UP cap semantics must be documented');
}

function testSaveMigrationContract() {
    const saveSource = read('js/44-run-save.js');
    assert(saveSource.includes('const SCHEMA_VERSION = 2;'), 'Save schema must be 2');
    assert(saveSource.includes('function migrateSaveSchemaV55'), 'v1->v2 migration must exist');
    assert(saveSource.includes('save.schemaVersion !== 1'), 'Schema 1 must be explicitly migratable');
    assert(saveSource.includes("migrated.run.relicMods = migrated.run.relicMods || deriveLegacyRelicModsV55"), 'Legacy relic modifiers must be derived');
    assert(saveSource.includes("migrated.player.bombElementV612 = migrated.player.bombElementV612 || 'normal'"), 'Legacy element default must be normal');
    assert(saveSource.includes('restoreEntityRef(bomb.carriedByRefV6124, player, state)'), 'Restore must rebind carriedBy');
    assert(saveSource.includes('player.carriedBombV682 = carried'), 'Restore must rebind singleton player carried bomb');
    assert(saveSource.includes('migratedFromSchemaVersion = 1'), 'Migration origin must remain auditable');
    assert(saveSource.includes("if (!save.run || !save.world?.grid?.length) return null;"), 'Migration must reject missing run or world grid');
    assert(saveSource.includes("if (ref.kind === 'boss') return state?.boss || null;"), 'Restore must support boss carriedBy references');
    assert(saveSource.includes("if (ref.kind === 'enemy') return Array.isArray(state?.enemies) ? (state.enemies[Number(ref.index)] || null) : null;"), 'Restore must support enemy carriedBy references');
    const rogueSource = read('js/31-roguelike-update.js');
    const bonusStart = rogueSource.indexOf('function rogueV327GetRelicBonuses()');
    const bonusEnd = rogueSource.indexOf('\nfunction ', bonusStart + 10);
    const bonusFn = rogueSource.slice(bonusStart, bonusEnd > 0 ? bonusEnd : rogueSource.length);
    assert(bonusFn.includes('for (const id of ROGUELIKE_V327.relics)'), 'Derived relic bonuses must read relic identities, not already-applied player stats');
    assert(!bonusFn.includes('player.speed') && !bonusFn.includes('player.maxBombs') && !bonusFn.includes('player.maxHealth'), 'Derived relic bonus function must not read already-applied player capacities');
    const restoreStart = saveSource.indexOf('if (global.ROGUELIKE_V327 && Array.isArray(save.run.roguelikeV327Relics))');
    const restoreEnd = saveSource.indexOf('\n            }', restoreStart);
    const restoreBlock = saveSource.slice(restoreStart, restoreEnd > 0 ? restoreEnd : saveSource.length);
    assert(restoreBlock.indexOf('global.ROGUELIKE_V327.relics = save.run.roguelikeV327Relics.slice()') < restoreBlock.indexOf('rogueV327GetRelicBonuses()'), 'Restore must set relic identities before rebuilding appliedBonus');

    const storage = { value: null, getItem(){ return this.value; }, setItem(_key, value){ this.value = value; }, removeItem(){ this.value = null; } };
    const player = {
        x: 192, y: 192, width: 48, height: 48,
        speed: 5.1, maxBombs: 2, bombsPlaced: 1, bombCooldown: 0, bombRange: 3,
        health: 5, maxHealth: 6, hasShield: false,
        dir: 'right', isMoving: false,
        bombElementV612: 'ice',
        capabilityProfileV681: { permanent: ['kick','grab','carry','throw'], byGroup: {} }
    };
    const carriedBomb = {
        x: -999, y: -999,
        worldX: 216, worldY: 180,
        timer: 0, carriedTimer: 930,
        fuseTotal: 1500,
        state: 'carried', motionState: 'carried', countsTowardPlayerCapacity: true,
        owner: 'player', carriedBy: player, interactionActorV682: player,
        motionQueue: []
    };
    const state = {
        runNumber: 7, level: 4, score: 123, coins: 40, bestDepth: 4,
        coinBonus: 0, killScoreMult: 1, fireScoreMult: 1, hitInvulnerabilityBonus: 0,
        rerollDiscount: 0, rerolls: 0, relics: [], relicMods: { bombFuseMultiplier:0.72, turnAssistBonus:4, turnSnapBonus:1.25, inputBufferBonus:75, unstablePowder:true, economyBonus:0.2 },
        runElapsedMs: 9000, roomTime: 3000, threatLevel: 1, lastMoveAxis:'horizontal', lastMoveInputAt:10,
        blocksBroken: 2, totalKills: 3,
        biomeV49: null, runJourneyV50: null, runHistoryV51: null,
        gridWidth: 9, gridHeight: 9, grid: Array.from({length:9},()=>Array(9).fill(0)), gridRevision:1,
        bombs:[carriedBomb], explosions:[], enemies:[], items:[], hazards:[], environmentHazards:[], materialResiduesV60:[], hazardCooldown:0,
        boss:null, bossProjectiles:[], blastSerial:0, difficulty:null, exitPos:null, roomDesign:null, roomType:{id:'STANDARD'},
        isPlaying:true, paused:false, rafId:0,
        camera:{x:0,y:0}, keys:{}, touchControls:{x:0,y:0}
    };

    const nodes = new Map();
    function node() { return { dataset:{}, classList:{ add(){}, remove(){}, toggle(){} }, addEventListener(){}, textContent:'' }; }
    const doc = { getElementById(id){ if(!nodes.has(id)) nodes.set(id,node()); return nodes.get(id); } };
    const context = {
        console, Object, Array, Number, String, Boolean, JSON, Set, Math, Date,
        window:null, document:doc, localStorage:storage,
        setInterval:()=>1, setTimeout:()=>1, addEventListener(){},
        performance:{now:()=>12345}, requestAnimationFrame:()=>1, cancelAnimationFrame(){},
        BOMB_V4_STATES:{ MOVING:'moving', ARMED:'armed', CARRIED:'carried', EXPLODING:'exploding' },
        BOMBER_ENGINE:{ getState:()=>state, getPlayer:()=>player }
    };
    context.window = context;
    context.clampPlayerCapacitiesV67 = () => {};
    context.playerFSMReset = () => {};
    context.resetBombHandlingState = () => {};
    context.updateRoguePresentation = () => {};
    context.updateUI = () => {};
    context.draw = () => {};
    context.ROGUELIKE_V327 = { relics:['hot_boots'], selectedRelic:null, relicOffers:[], appliedBonus:{bombs:0,range:0,speed:0,maxHealth:0} };
    context.rogueV327GetRelicBonuses = () => ({ bombs:0, range:0, speed:0.6, maxHealth:0 });

    vm.createContext(context);
    vm.runInContext(saveSource, context, { filename:'44-run-save.js' });

    assert(context.saveRunV55() === true, 'Schema 2 save must serialize carried bomb without circular JSON failure');
    const saved = JSON.parse(storage.value);
    assert(saved.schemaVersion === 2, 'Saved schema must be 2');
    assert(saved.player.capabilityProfileV681.permanent.includes('throw'), 'Capabilities must persist');
    assert(saved.player.bombElementV612 === 'ice', 'Element must persist');
    assert(saved.run.relicMods.turnAssistBonus === 4, 'relicMods must persist');
    assert(saved.world.bombs[0].carriedByRefV6124.kind === 'player', 'carriedBy must serialize as player reference');
    assert(saveSource.includes('serializeEntityRef(bomb.carriedBy, player, state)'), 'Save must serialize non-player carriedBy through the common ref serializer');
    assert(saved.world.bombs[0].interactionActorRefV6124.kind === 'player', 'interactionActor must serialize as player reference');
    assert(saved.world.bombs[0].carriedBy === undefined, 'Circular carriedBy object must not be serialized');

    player.carriedBombV682 = null;
    state.bombs = [];
    state.isPlaying = false;
    assert(context.restoreRunV55() === true, 'Schema 2 restore must succeed');
    assert(state.bombs.length === 1, 'Restore must reconstruct saved bomb');
    assert(state.bombs[0].state === 'carried', 'Restore must retain CARRIED state');
    assert(state.bombs[0].carriedBy === player, 'Restore must rebind carriedBy to singleton player');
    assert(player.carriedBombV682 === state.bombs[0], 'Restore must rebind player.carriedBombV682');
    assert(state.relicMods.turnAssistBonus === 4, 'Restore must restore relicMods');
    assert(player.bombElementV612 === 'ice', 'Restore must restore element');
    assert(context.ROGUELIKE_V327.appliedBonus.speed === 0.6, 'Restore must set appliedBonus from relics to avoid double application');


    const savedEnemy = { id:'enemy-save-ref' };
    const savedBoss = { id:'boss-save-ref' };
    state.enemies = [savedEnemy];
    state.boss = savedBoss;
    state.bombs[0].carriedBy = savedEnemy;
    state.bombs[0].interactionActorV682 = savedEnemy;
    assert(context.saveRunV55() === true, 'Save must support enemy carriedBy references');
    const enemySaved = JSON.parse(storage.value);
    assert(enemySaved.world.bombs[0].carriedByRefV6124.kind === 'enemy' && enemySaved.world.bombs[0].carriedByRefV6124.index === 0, 'Enemy carriedBy must persist as indexed reference');
    assert(enemySaved.world.bombs[0].interactionActorRefV6124.kind === 'enemy', 'Enemy interactionActor must persist as indexed reference');

    state.bombs[0].carriedBy = savedBoss;
    state.bombs[0].interactionActorV682 = savedBoss;
    assert(context.saveRunV55() === true, 'Save must support boss carriedBy references');
    const bossSaved = JSON.parse(storage.value);
    assert(bossSaved.world.bombs[0].carriedByRefV6124.kind === 'boss', 'Boss carriedBy must persist as boss reference');
    assert(bossSaved.world.bombs[0].interactionActorRefV6124.kind === 'boss', 'Boss interactionActor must persist as boss reference');
    player.carriedBombV682 = null;
    state.bombs = [];
    state.isPlaying = false;
    assert(context.restoreRunV55() === true, 'Boss-reference save restore must succeed');
    assert(state.bombs[0].carriedBy === state.boss, 'Restore must rebind boss carriedBy to restored boss instance');

    assert(context.migrateRunSaveV55({schemaVersion:1, run:{}, world:{grid:[]}, player:{}}) === null, 'Schema 1 with empty world grid must be rejected');
    assert(context.migrateRunSaveV55({schemaVersion:1, world:{grid:[[0]]}, player:{}}) === null, 'Schema 1 without run must be rejected');

    const legacy = {
        schemaVersion: 1,
        run: { relics: [{ id:'short_fuse' }, { id:'magnetic_boots' }, { id:'salvage_core' }] },
        player: { x: 192, y: 192, width: 48, height: 48 },
        world: { grid: [[0]], bombs: [] }
    };
    const migrated = context.migrateRunSaveV55(legacy);
    assert(migrated.schemaVersion === 2, 'Schema 1 must migrate to schema 2');
    assert(migrated.migratedFromSchemaVersion === 1, 'Migration origin must be preserved');
    assert(migrated.player.bombElementV612 === 'normal', 'Migrated element must default to normal');
    assert(Array.isArray(migrated.player.capabilityProfileV681.permanent), 'Migrated capability profile must exist');
    assert(migrated.run.relicMods.bombFuseMultiplier === 0.72, 'Legacy short_fuse modifier must be reconstructed');
    assert(migrated.run.relicMods.turnAssistBonus === 4, 'Legacy magnetic_boots modifier must be reconstructed');
    assert(migrated.run.relicMods.economyBonus === 0.2, 'Legacy salvage_core modifier must be reconstructed');
}

function testDeathCarriedContract() {
    const combat = read('js/06-combat.js');
    assert(combat.includes("releaseCarriedBombV682(p, 'death')"), 'Lethal player death must release carried bomb');
    assert(combat.indexOf("releaseCarriedBombV682(p, 'death')") < combat.indexOf('gameOver(source)'), 'Carried bomb release must happen before game over');
}

const tests = [
    ['repository shape + cache busting', testRepositoryShape],
    ['KICK + GRAB + THROW transitions', testKickGrabThrow],
    ['single KICK authority', testNoLegacyKickAuthority],
    ['SPEED_UP hard-cap semantics', testSpeedCapSemantics],
    ['save schema migration + rebind', testSaveMigrationContract],
    ['death with carried bomb', testDeathCarriedContract]
];

let passed = 0;
for (const [name, fn] of tests) {
    try {
        fn();
        console.log(`PASS ${name}`);
        passed++;
    } catch (error) {
        console.error(`FAIL ${name}: ${error.message}`);
        process.exitCode = 1;
    }
}

if (passed === tests.length) console.log(`PASS ${passed}/${tests.length} v6.12.6 audit tests`);
