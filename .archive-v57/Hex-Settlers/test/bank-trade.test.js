'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  normalizeBankTradeAction,
  validateBankTradeAvailability,
} = require('../server/bank-trade');

const ratios = {
  brick: 4,
  lumber: 4,
  wool: 4,
  grain: 2,
  ore: 4,
};

function normalize(action) {
  return normalizeBankTradeAction(action, { ratioFor: (kind) => ratios[kind] });
}

test('mixed bank basket applies each offered resource own port ratio', () => {
  const result = normalize({
    kind: 'bank_trade',
    give: { grain: 2, wool: 4 },
    take: { brick: 1, ore: 1 },
  });

  assert.equal(result.ok, true);
  assert.equal(result.plan.tradeCount, 2);
  assert.deepEqual(result.plan.ratios, { wool: 4, grain: 2 });
  assert.equal(result.plan.give.grain, 2);
  assert.equal(result.plan.give.wool, 4);
  assert.equal(result.plan.take.brick, 1);
  assert.equal(result.plan.take.ore, 1);
});

test('mixed bank basket requires enough of every offered resource', () => {
  const normalized = normalize({
    give: { grain: 2, wool: 4 },
    take: { brick: 1, ore: 1 },
  });
  assert.equal(normalized.ok, true);

  const availability = validateBankTradeAvailability(
    normalized.plan,
    { grain: 2, wool: 3 },
    { brick: 19, lumber: 19, wool: 19, grain: 19, ore: 19 },
  );
  assert.deepEqual(availability, { ok: false, error: 'Not enough wool to trade.' });
});

test('mixed bank basket must have one incoming card per completed outgoing trade', () => {
  const result = normalize({
    give: { grain: 2, wool: 4 },
    take: { ore: 1 },
  });

  assert.equal(result.ok, false);
  assert.match(result.error, /unbalanced: 2 trades offered for 1 resource/);
});

test('mixed bank basket rejects partial port payments', () => {
  const result = normalize({
    give: { grain: 2, wool: 3 },
    take: { brick: 1, ore: 1 },
  });

  assert.deepEqual(result, { ok: false, error: '3 wool does not make a complete 4:1 trade.' });
});

test('mixed bank basket cannot give and receive the same resource', () => {
  const result = normalize({
    give: { grain: 2 },
    take: { grain: 1 },
  });

  assert.deepEqual(result, { ok: false, error: 'You cannot give and receive grain in the same bank trade.' });
});

test('legacy one-resource bank trade actions remain supported for AI and older clients', () => {
  const result = normalize({ giveKind: 'grain', takeKind: 'ore', takeQty: 2 });

  assert.equal(result.ok, true);
  assert.equal(result.plan.legacy, true);
  assert.equal(result.plan.give.grain, 4);
  assert.equal(result.plan.take.ore, 2);
  assert.equal(result.plan.tradeCount, 2);
});

test('force 4 to 1 applies independently to every offered resource', () => {
  const result = normalize({
    give: { grain: 4, wool: 4 },
    take: { brick: 1, ore: 1 },
    forceRatio: 4,
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.plan.ratios, { wool: 4, grain: 4 });
  assert.equal(result.plan.tradeCount, 2);
});
