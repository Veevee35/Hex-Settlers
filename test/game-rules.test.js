'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { DEFAULT_RULES, bankMaxForRules, normalizedMapModeRaw } = require('../server/game-rules');

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
