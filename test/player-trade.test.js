'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  overlappingPlayerTradeResource,
  validatePlayerTradeSides,
} = require('../server/player-trade');

const resources = ['brick', 'lumber', 'wool', 'grain', 'ore'];

test('player trade rejects every resource when it appears on both sides', () => {
  for (const kind of resources) {
    assert.equal(overlappingPlayerTradeResource({ [kind]: 1 }, { [kind]: 1 }), kind);
    assert.deepEqual(
      validatePlayerTradeSides({ [kind]: 1 }, { [kind]: 1 }),
      { ok: false, error: `You cannot give and receive ${kind} in the same player trade.` },
    );
  }
});

test('player trade allows multiple resources when the two sides do not overlap', () => {
  assert.deepEqual(
    validatePlayerTradeSides(
      { brick: 2, lumber: 1 },
      { wool: 1, grain: 2, ore: 1 },
    ),
    { ok: true },
  );
});

test('zero quantities do not create a false player-trade overlap', () => {
  assert.equal(
    overlappingPlayerTradeResource(
      { brick: 0, lumber: 1 },
      { brick: 2, lumber: 0 },
    ),
    null,
  );
});
