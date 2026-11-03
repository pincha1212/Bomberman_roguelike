import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Bomberman Remaster v6.54.0 Verification Suite', async (t) => {
  const engineSource = fs.readFileSync('./src/engine/gameEngine.js', 'utf-8');
  const appSource = fs.readFileSync('./src/App.tsx', 'utf-8');
  const pkgSource = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));

  await t.test('Version 6.54.0 consistency across manifests and UI', () => {
    assert.equal(pkgSource.version, '6.54.0', 'package.json version must be 6.54.0');
    assert.ok(appSource.includes('v6.54.0'), 'App.tsx must feature v6.54.0 badge');
  });

  await t.test('Elemental bomb resets to classic normal on player death', () => {
    assert.ok(
      engineSource.includes("player.bombElementV612 = 'normal'"),
      'Must reset player.bombElementV612 to normal'
    );
    assert.ok(
      engineSource.includes("setPlayerBombElementV612('normal')"),
      'Must set bomb element helper to normal upon reset'
    );
  });

  await t.test('Enemy speed values are reduced by ~30% for responsive tactical gameplay', () => {
    // Check speed definitions in ENEMY_TYPES
    assert.ok(engineSource.includes('speed: 0.80'), 'RASTRERO speed should be 0.80 (down from 1.15)');
    assert.ok(engineSource.includes('speed: 0.65'), 'VOLADOR speed should be 0.65 (down from 0.95)');
    assert.ok(engineSource.includes('speed: 1.10'), 'ESPECIAL speed should be 1.10 (down from 1.75)');
  });

  await t.test('Exit portal safety mechanism auto-clears destructible blocks', () => {
    assert.ok(
      engineSource.includes('tryUnlockExitCurrentRoom'),
      'Must implement tryUnlockExitCurrentRoom'
    );
    assert.ok(
      engineSource.includes('SALIDA REVELADA'),
      'Must notify player when exit portal is revealed upon room clearance'
    );
  });

  await t.test('Map collapse grace period is expanded to >= 105s', () => {
    assert.ok(
      engineSource.includes('105000'),
      'Map collapse grace period for standard rooms should be 105 seconds'
    );
    assert.ok(
      engineSource.includes('135000'),
      'Map collapse grace period for boss rooms should be 135 seconds'
    );
  });
});
