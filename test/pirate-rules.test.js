'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { pirateCanOccupyTile, placeRandomPirate, startingPirateTileIds } = require('../server/pirate-rules');

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

test('map finalization replaces missing or duplicate pirates with exactly one random sea placement', () => {
  const tiles = [
    { id: 0, type: 'forest', pirate: true },
    { id: 1, type: 'sea', pirate: true },
    { id: 2, type: 'sea', pirate: false },
  ];

  assert.equal(placeRandomPirate(tiles, null, () => 0.99), 2);
  assert.deepEqual(tiles.filter((tile) => tile.pirate).map((tile) => tile.id), [2]);
});

test('map finalization keeps Fog Island pirates off unrevealed fog', () => {
  const tiles = [hiddenFogSea, { ...revealedFogSea }, { ...knownSea }].map((tile) => ({ ...tile }));
  assert.equal(placeRandomPirate(tiles, { excludeUnrevealedFog: true }, () => 0), 2);
  assert.deepEqual(tiles.filter((tile) => tile.pirate).map((tile) => tile.id), [2]);
});

test('map finalization excludes hidden outer-border sea tiles', () => {
  const rules = { mapMode: 'seafarers', seafarersScenario: 'four_islands' };
  const tiles = [
    { id: 0, type: 'sea' },
    { id: 1, type: 'sea' },
  ];
  const geom = { tileNeighbors: { 0: [1, 2, 3], 1: [0, 2, 3, 4, 5, 6] } };

  assert.equal(pirateCanOccupyTile(rules, tiles[0], geom), false);
  assert.equal(pirateCanOccupyTile(rules, tiles[1], geom), true);
  assert.equal(placeRandomPirate(tiles, { rules, geom }, () => 0), 1);
  assert.deepEqual(tiles.filter((tile) => tile.pirate).map((tile) => tile.id), [1]);
});

test('gameplay and client targeting use the pirate tile restriction', () => {
  assert.match(serverJs, /if \(!pirateCanOccupyTile\(game\.rules, tt, game\.geom\)\) return \{ ok: false, error: 'Pirate cannot be placed on an unavailable sea tile\.' \}/);
  assert.match(appJs, /canPirateHere = \(isSeaTile && !\(t\.fog && !t\.revealed\) && !t\.pirate && !friendlyRobberTileBlockedClient\(t\.id\)\)/);
});
