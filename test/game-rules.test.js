'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  DEFAULT_RULES,
  bankMaxForRules,
  normalizedMapModeRaw,
  seafarersAwardsNewIslandBonus,
  seafarersDesertsSeparateLandMasses,
} = require('../server/game-rules');

test('default rules preserve the established game defaults', () => {
  assert.deepEqual(DEFAULT_RULES, {
    discardLimit: 7,
    setupTurnMs: 60_000,
    playTurnMs: 30_000,
    microMs: 15_000,
    microPhaseMs: 15_000,
    mapMode: 'classic',
    seafarersScenario: 'four_islands',
    victoryPointsToWin: 10,
    devDeckMode: 25,
  });
});

test('bank sizing keeps classic, 5-6 player, seafarers, and custom behavior', () => {
  assert.equal(bankMaxForRules({ mapMode: 'classic' }), 19);
  assert.equal(bankMaxForRules({ mapMode: 'classic-5-6' }), 24);
  assert.equal(bankMaxForRules({ mapMode: 'seafarers', seafarersScenario: 'cartographer_56' }), 24);
  assert.equal(bankMaxForRules({ mapMode: 'seafarers', seafarersScenario: 'test_builder_56' }), 24);
  assert.equal(bankMaxForRules({ mapMode: 'seafarers', seafarersScenario: 'four_islands' }), 19);
  assert.equal(bankMaxForRules({ baseResourcesPerType: 31 }), 31);
  assert.equal(bankMaxForRules({ baseResourceCount: 100 }), 40);
  assert.equal(bankMaxForRules({ baseResourcesPerType: 0 }), 1);
  assert.equal(normalizedMapModeRaw('classic_5_6'), 'classic56');
});

test('Cartographer and Scattered Tiles award normal new-land-mass exploration points', () => {
  for (const seafarersScenario of [
    'cartographer_4_manual',
    'cartographer_4_random',
    'cartographer_56_manual',
    'cartographer_56_random',
  ]) {
    assert.equal(seafarersAwardsNewIslandBonus({ mapMode: 'seafarers', seafarersScenario }), true, seafarersScenario);
    assert.equal(seafarersDesertsSeparateLandMasses({ mapMode: 'seafarers', seafarersScenario }), true, seafarersScenario);
  }

  assert.equal(seafarersAwardsNewIslandBonus({ mapMode: 'seafarers', seafarersScenario: 'four_islands' }), true);
  assert.equal(seafarersAwardsNewIslandBonus({ mapMode: 'seafarers', seafarersScenario: 'fog_island' }), false);
  assert.equal(seafarersAwardsNewIslandBonus({ mapMode: 'seafarers', seafarersScenario: 'fog_island_56' }), false);
  assert.equal(seafarersAwardsNewIslandBonus({ mapMode: 'classic', seafarersScenario: 'cartographer_4_random' }), false);
  assert.equal(seafarersDesertsSeparateLandMasses({ mapMode: 'seafarers', seafarersScenario: 'four_islands' }), false);
});
