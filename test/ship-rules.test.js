'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { edgeTouchesSeaForShip, rulesTreatOuterBoundaryAsSea } = require('../server/ship-rules');

function stateFor(scenario, tileTypes, edgeAdjTiles) {
  return {
    rules: { mapMode: 'seafarers', seafarersScenario: scenario },
    geom: {
      tiles: tileTypes.map((type, id) => ({ id, type })),
      edgeAdjTiles,
    },
  };
}

test('Cartographer and Scattered Tiles treat the outside of every board boundary as sea', () => {
  for (const scenario of [
    'cartographer_4_manual',
    'cartographer_4_random',
    'cartographer_56_manual',
    'cartographer_56_random',
  ]) {
    const state = stateFor(scenario, ['hills'], [[0]]);
    assert.equal(rulesTreatOuterBoundaryAsSea(state.rules), true, scenario);
    assert.equal(edgeTouchesSeaForShip(state, 0, [0]), true, scenario);
  }
});

test('ordinary land-only edges remain invalid ship edges', () => {
  const internalLandEdge = stateFor('cartographer_4_random', ['hills', 'forest'], [[0, 1]]);
  assert.equal(edgeTouchesSeaForShip(internalLandEdge, 0, [0, 1]), false);

  const ordinaryBoundary = stateFor('four_islands', ['hills'], [[0]]);
  assert.equal(rulesTreatOuterBoundaryAsSea(ordinaryBoundary.rules), false);
  assert.equal(edgeTouchesSeaForShip(ordinaryBoundary, 0, [0]), false);
});

test('explicit and trimmed sea adjacency remain valid for every Seafarers scenario', () => {
  const coastline = stateFor('four_islands', ['hills', 'sea'], [[0, 1]]);
  assert.equal(edgeTouchesSeaForShip(coastline, 0, [0, 1]), true);
  assert.equal(edgeTouchesSeaForShip(coastline, 0, [0]), true);
});
