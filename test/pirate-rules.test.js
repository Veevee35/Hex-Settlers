'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { pirateCanOccupyTile, startingPirateTileIds } = require('../server/pirate-rules');

const projectRoot = path.resolve(__dirname, '..');
const appJs = fs.readFileSync(path.join(projectRoot, 'public', 'app.js'), 'utf8');
const serverJs = fs.readFileSync(path.join(projectRoot, 'server.js'), 'utf8');

const hiddenFogSea = { id: 1, type: 'sea', fog: true, revealed: false };
const revealedFogSea = { id: 2, type: 'sea', fog: true, revealed: true };
const knownSea = { id: 3, type: 'sea' };
const land = { id: 4, type: 'forest' };

for (const scenario of ['fog_island', 'fog_island_56']) {
  test(`${scenario} only allows the pirate on revealed sea tiles`, () => {
    const rules = { mapMode: 'seafarers', seafarersScenario: scenario };
    assert.equal(pirateCanOccupyTile(rules, hiddenFogSea), false);
    assert.equal(pirateCanOccupyTile(rules, revealedFogSea), true);
    assert.equal(pirateCanOccupyTile(rules, knownSea), true);
    assert.equal(pirateCanOccupyTile(rules, land), false);
  });
}

test('Fog Island starting pirate candidates exclude every unrevealed fog tile', () => {
  assert.deepEqual(
    startingPirateTileIds([hiddenFogSea, revealedFogSea, knownSea, land], { excludeUnrevealedFog: true }),
    [2, 3],
  );
});

test('the fog restriction is scoped to Fog Island rules', () => {
  assert.equal(
    pirateCanOccupyTile({ mapMode: 'seafarers', seafarersScenario: 'four_islands' }, hiddenFogSea),
    true,
  );
});

test('gameplay and client targeting use the Fog Island pirate restriction', () => {
  assert.match(serverJs, /if \(!pirateCanOccupyTile\(game\.rules, tt\)\) return \{ ok: false, error: 'Pirate cannot be placed on an unrevealed fog tile\.' \}/);
  assert.match(appJs, /canPirateHere = \(isSeaTile && !\(t\.fog && !t\.revealed\) && !t\.pirate\)/);
});
