'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  BANK_MAX_DEFAULT,
  BANK_MAX_56,
  DEFAULT_RULES,
  bankMaxForRules,
  normalizedMapModeRaw,
} = require('../server/game-rules');

test('map aliases and bank sizes preserve existing rules', () => {
  assert.equal(normalizedMapModeRaw('classic-5-6'), 'classic56');
  assert.equal(normalizedMapModeRaw('seafarers'), 'seafarers');
  assert.equal(normalizedMapModeRaw('unexpected'), 'unexpected');
  assert.equal(bankMaxForRules(DEFAULT_RULES), BANK_MAX_DEFAULT);
  assert.equal(bankMaxForRules({ mapMode: 'classic56' }), BANK_MAX_56);
  assert.equal(bankMaxForRules({ mapMode: 'seafarers', seafarersScenario: 'fog_island_56' }), BANK_MAX_56);
  assert.equal(bankMaxForRules({ mapMode: 'seafarers', seafarersScenario: 'four_islands' }), BANK_MAX_DEFAULT);
  assert.equal(bankMaxForRules({ mapMode: 'classic', baseResourcesPerType: 30 }), 30);
});

test('default rules are immutable and retain gameplay defaults', () => {
  assert.equal(Object.isFrozen(DEFAULT_RULES), true);
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
