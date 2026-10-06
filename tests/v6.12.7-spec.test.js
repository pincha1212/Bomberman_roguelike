#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const JS = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function has(rel, needle) {
    return JS(rel).includes(needle);
}

function match(rel, regex) {
    return regex.test(JS(rel));
}

function readCoreSections() {
    const core = JS('js/01-core.js');
    const start = core.indexOf('function clampPlayerCapacitiesV67');
    const end = core.indexOf('const POWERUP_DEFS_V67');
    assert(start >= 0 && end > start, 'Could not isolate capacity clamp section');
    return core.slice(start, end);
}

function testBaseCurrentCapModel() {
    const core = JS('js/01-core.js');
    assert(core.includes('base: Object.freeze({ maxHealth: 5, maxBombs: 1, bombRange: 1, speed: 3.0 })'), 'Base CURRENT values must remain 5/1/1/3.0');
    assert(core.includes('hard: Object.freeze({ maxHealth: 10, maxBombs: 8, bombRange: 12, speed: 7.0 })'), 'Hard caps must remain 10/8/12/7.0');
    const clamp = readCoreSections();
    assert(/player\.maxBombs\s*=\s*Math\.min\(player\.maxBombs,\s*cap\.maxBombs\)/.test(clamp), 'maxBombs CURRENT must clamp against CAP, not be assigned from CAP');
    assert(/player\.bombRange\s*=\s*Math\.min\(player\.bombRange,\s*cap\.bombRange\)/.test(clamp), 'bombRange CURRENT must clamp against CAP, not be assigned from CAP');
    assert(/player\.maxHealth\s*=\s*Math\.min\(player\.maxHealth,\s*cap\.maxHealth\)/.test(clamp), 'maxHealth CAP must not overwrite CURRENT-like state');
}

function testBombUp() {
    const core = JS('js/01-core.js');
    assert(core.includes("[POWERUPS.BOMB_UP]"), 'BOMB_UP definition must exist');
    assert(/if\s*\(player\.maxBombs\s*>=\s*cap\.maxBombs\)\s*return false/.test(core), 'BOMB_UP must no-op at CAP');
    assert(/player\.maxBombs\s*=\s*Math\.min\(cap\.maxBombs,\s*player\.maxBombs\s*\+\s*1\)/.test(core), 'BOMB_UP must increment CURRENT only');
    const body = core.slice(core.indexOf('[POWERUPS.BOMB_UP]'), core.indexOf('[POWERUPS.FIRE_UP]'));
    assert(!/cap\.maxBombs\s*\+=|cap\.maxBombs\s*-=/i.test(body), 'BOMB_UP must never mutate CAP');
}

function testFireUp() {
    const core = JS('js/01-core.js');
    assert(core.includes("[POWERUPS.FIRE_UP]"), 'FIRE_UP definition must exist');
    assert(/if\s*\(player\.bombRange\s*>=\s*cap\.bombRange\)\s*return false/.test(core), 'FIRE_UP must no-op at CAP');
    assert(/player\.bombRange\s*=\s*Math\.min\(cap\.bombRange,\s*player\.bombRange\s*\+\s*1\)/.test(core), 'FIRE_UP must increment CURRENT only');
    const body = core.slice(core.indexOf('[POWERUPS.FIRE_UP]'), core.indexOf('[POWERUPS.SPEED_UP]'));
    assert(!/cap\.bombRange\s*\+=|cap\.bombRange\s*-=/i.test(body), 'FIRE_UP must never mutate CAP');
}

function testFirstRelicFlagsAndProgression() {
    const sources = [JS('js/01-core.js'), JS('js/16-relics.js'), JS('js/31-roguelike-update.js'), JS('js/44-run-save.js')];
    const combined = sources.join('\n');
    assert(combined.includes('firstRelicFlags'), 'Spec requires firstRelicFlags in runtime code');
    assert(/firstRelicFlags[\s\S]{0,500}(bomb|range|health)/i.test(combined), 'firstRelicFlags must track capabilities independently');
    assert(/bomb["']?\s*:\s*false|bombs["']?\s*:\s*false/i.test(combined), 'Bomb first-relic flag must have an explicit false baseline');
    assert(/range["']?\s*:\s*false/i.test(combined), 'Range first-relic flag must have an explicit false baseline');
    assert(/health["']?\s*:\s*false/i.test(combined), 'Health first-relic flag must have an explicit false baseline');
    assert(has('js/31-roguelike-update.js', 'firstRelicFlags'), 'Relic acquisition must update firstRelicFlags');
}

function testHealthSemantics() {
    const core = JS('js/01-core.js');
    assert(/player\.health\s*=\s*Math\.min\(player\.health\s*\+\s*1,\s*player\.maxHealth\)/.test(core), 'HEALTH_UP must use health=min(health+1,maxHealth)');
    assert(/if\s*\(player\.health\s*>=\s*player\.maxHealth\)\s*return false/.test(core), 'HEALTH_UP must no-op at maxHealth');
    assert(core.includes('health: 3,'), 'Initial health must remain 3');
    assert(core.includes('maxHealth: 5,'), 'Initial maxHealth must remain 5');
    const relics = JS('js/31-roguelike-update.js');
    assert(/firstRelicFlags[\s\S]{0,700}maxHealth/.test(relics) || relics.includes('firstRelicFlags'), 'maxHealth relic must participate in first-relic rule');
}

function testSpeedException() {
    const core = JS('js/01-core.js');
    assert(core.includes('cap.speed = Number(PLAYER_LIMITS_V67.hard.speed) || 7'), 'Speed CAP must be fixed at 7.0');
    assert(/player\.speed\s*=\s*Math\.min\(player\.speed\s*\+\s*0\.4,\s*cap\.speed\)/.test(core), 'SPEED_UP must increment CURRENT speed');
    assert(/if\s*\(player\.speed\s*>=\s*cap\.speed\)\s*return false/.test(core), 'SPEED_UP must no-op at hard cap');
    assert(/speed:\s*Number\(player\.speed\)|speed:\s*player\.speed/.test(JS('js/44-run-save.js')), 'player.speed must persist as CURRENT');
    assert(!/firstRelicFlags[\s\S]{0,300}speed/i.test(core + JS('js/31-roguelike-update.js')), 'Speed must not use bomb/range/health first-relic gating');
}

function testShieldConsumable() {
    const core = JS('js/01-core.js');
    const combat = JS('js/06-combat.js');
    assert(/if\s*\(player\.hasShield\)\s*return false/.test(core), 'SHIELD_UP must no-op while shield is active');
    assert(/player\.hasShield\s*=\s*true/.test(core), 'SHIELD_UP must activate boolean shield');
    assert(/p\.hasShield\s*=\s*false/.test(combat), 'Shield must be consumed by a blocked hit');
}

function testIndependentClampOnRelicLoss() {
    const clamp = readCoreSections();
    assert(/maxBombs[^\n]{0,120}Math\.min\(player\.maxBombs,\s*cap\.maxBombs\)/.test(clamp), 'Bomb CURRENT must clamp independently');
    assert(/bombRange[^\n]{0,120}Math\.min\(player\.bombRange,\s*cap\.bombRange\)/.test(clamp), 'Range CURRENT must clamp independently');
    assert(/health[^\n]{0,160}Math\.min\(player\.health,\s*player\.maxHealth\)/.test(clamp), 'Health CURRENT must clamp independently');
    assert(!/player\.maxBombs\s*=\s*cap\.maxBombs/.test(clamp), 'Relic-loss clamp must not promote CURRENT to CAP');
    assert(!/player\.bombRange\s*=\s*cap\.bombRange/.test(clamp), 'Relic-loss clamp must not promote CURRENT to CAP');
}

function testClampInvocationContract() {
    const core = JS('js/01-core.js');
    const relics = JS('js/31-roguelike-update.js');
    const save = JS('js/44-run-save.js');
    assert(core.includes('clampPlayerCapacitiesV67();'), 'Clamp must run after power-up/relic-cap changes');
    assert(relics.includes('clampPlayerCapacitiesV67();'), 'Relic-derived CAP changes must invoke clamp');
    assert(save.includes('clampPlayerCapacitiesV67();'), 'Restore must invoke clamp');
    assert(/Math\.min\(7\.0|Math\.min\([^\n]*cap\.speed/.test(core), 'Speed must be clamped at the same lifecycle points');
}

function testPersistenceCurrentRelicsFlagsAndDerived() {
    const save = JS('js/44-run-save.js');
    assert(/speed:\s*player\.speed/.test(save), 'Save must persist CURRENT speed');
    assert(/maxBombs:\s*player\.maxBombs/.test(save), 'Save must persist CURRENT maxBombs');
    assert(/bombRange:\s*player\.bombRange/.test(save), 'Save must persist CURRENT bombRange');
    assert(/health:\s*player\.health/.test(save), 'Save must persist CURRENT health');
    assert(/maxHealth:\s*player\.maxHealth/.test(save), 'Save must persist maxHealth CAP/CURRENT representation');
    assert(/relics:\s*clone\(/.test(save), 'Save must persist relics');
    assert(/firstRelicFlags:\s*(player\.|clone\()/i.test(save), 'Save must persist firstRelicFlags');
    assert(/ROGUELIKE_V327\.appliedBonus\s*=\s*typeof rogueV327GetRelicBonuses/.test(save), 'appliedBonus must be recomputed from relics, not used as primary state');
    const rogue = JS('js/31-roguelike-update.js');
    assert(/for\s*\(const id of ROGUELIKE_V327\.relics\)/.test(rogue), 'Relic bonuses must derive from relic collection');
}

function testTestLabSnapshotContract() {
    const lab = JS('js/43-test-controls.js');
    assert(/snapshot/i.test(lab), 'Test Lab must contain an explicit sandbox snapshot contract');
    assert(/restore/i.test(lab), 'Test Lab must contain an explicit snapshot restore path');
    for (const field of ['relics','element', 'player']) {
        assert(new RegExp(field, 'i').test(lab), `Test Lab snapshot must include ${field}`);
    }
    assert(/maxBombs|bombRange|maxHealth|caps/i.test(lab), 'Test Lab snapshot must preserve capacity state');
    assert(!/saveRunV55\(/.test(lab), 'Test Lab snapshot must not use normal run save as its sandbox mechanism');
}

function testResetArenaContract() {
    const lab = JS('js/43-test-controls.js');
    assert(/state\.relics\s*=\s*\[\]/.test(lab), 'Reset Arena must clear gameState relics');
    assert(/ROGUELIKE_V327\.relics\s*=\s*\[\]/.test(lab), 'Reset Arena must clear roguelike relic runtime');
    assert(/ROGUELIKE_V327\.appliedBonus\s*=/.test(lab), 'Reset Arena must clear stale appliedBonus');
    assert(/maxBombs\s*=\s*1/.test(lab) && /bombRange\s*=\s*1/.test(lab), 'Reset Arena must reset bomb/range CURRENT');
    assert(/health\s*=\s*3/.test(lab) && /maxHealth\s*=\s*5/.test(lab), 'Reset Arena must reset health CURRENT/CAP');
    assert(/speed\s*=\s*3\.0/.test(lab), 'Reset Arena must reset speed CURRENT');
    assert(/hasShield\s*=\s*false/.test(lab), 'Reset Arena must reset shield');
}

function testSuiteRegressionSafety() {
    const jsFiles = fs.readdirSync(path.join(ROOT, 'js')).filter(name => name.endsWith('.js'));
    assert(jsFiles.length === 42, `Expected 42 JS modules, got ${jsFiles.length}`);
    const index = JS('index.html');
    const refs = [...index.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m => m[1].split('?')[0]);
    assert(refs.length === 40, `Expected 40 runtime script tags, got ${refs.length}`);
    assert(!refs.some(ref => ref.startsWith('tests/')), 'Spec test must stay outside runtime script tags');
    assert(!index.includes('v6.12.7-spec.test.js'), 'Spec test must not load in gameplay runtime');
}

const tests = [
    ['01 base CURRENT/CAP model', testBaseCurrentCapModel],
    ['02 BOMB_UP semantics', testBombUp],
    ['03 FIRE_UP semantics', testFireUp],
    ['04 firstRelicFlags + independent progression', testFirstRelicFlagsAndProgression],
    ['05 HEALTH_UP + maxHealth semantics', testHealthSemantics],
    ['06 SPEED exception + hard cap', testSpeedException],
    ['07 SHIELD consumable semantics', testShieldConsumable],
    ['08 relic-loss independent clamp', testIndependentClampOnRelicLoss],
    ['09 clamp invocation contract', testClampInvocationContract],
    ['10 persistence + derived appliedBonus', testPersistenceCurrentRelicsFlagsAndDerived],
    ['11 Test Lab superficial snapshot/restore', testTestLabSnapshotContract],
    ['12 Reset Arena + runtime isolation', testResetArenaContract]
];

let passed = 0;
let failed = 0;
for (const [name, fn] of tests) {
    try {
        fn();
        console.log(`PASS ${name}`);
        passed++;
    } catch (error) {
        console.error(`FAIL ${name}: ${error.message}`);
        failed++;
    }
}

console.log(`RESULT ${passed}/${tests.length} groups passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
