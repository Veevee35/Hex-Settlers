'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  normalizeDiceAlgorithm,
  rollDiceWithAlgorithm,
} = require('../server/dice-algorithms');

function sequenceRng(values) {
  let index = 0;
  return () => values[index++ % values.length];
}

test('dice algorithm names normalize safely and unknown values fall back to random', () => {
  assert.equal(normalizeDiceAlgorithm(undefined), 'probability_corrected');
  assert.equal(normalizeDiceAlgorithm('Balanced Bag'), 'balanced');
  assert.equal(normalizeDiceAlgorithm('smooth'), 'probability_corrected');
  assert.equal(normalizeDiceAlgorithm('anti-streak'), 'streak_breaker');
  assert.equal(normalizeDiceAlgorithm('not-a-real-mode'), 'random');
});

test('random mode returns an authoritative valid dice pair', () => {
  const game = { rules: { diceAlgorithm: 'random' }, diceStats: {} };
  assert.deepEqual(rollDiceWithAlgorithm(game, () => 0), {
    d1: 1,
    d2: 1,
    roll: 2,
    algorithm: 'random',
  });
  const high = rollDiceWithAlgorithm(game, () => 0.999999);
  assert.deepEqual({ d1: high.d1, d2: high.d2, roll: high.roll }, { d1: 6, d2: 6, roll: 12 });
});

test('balanced bag contains every dice pair once and the exact 2d6 distribution per cycle', () => {
  const game = { rules: { diceAlgorithm: 'balanced' }, diceStats: {} };
  const rng = sequenceRng([0.13, 0.87, 0.42, 0.61, 0.05]);
  const rolls = Array.from({ length: 36 }, () => rollDiceWithAlgorithm(game, rng));
  assert.equal(new Set(rolls.map(({ d1, d2 }) => `${d1},${d2}`)).size, 36);
  const frequencies = Object.fromEntries(Array.from({ length: 11 }, (_, index) => [index + 2, 0]));
  for (const result of rolls) frequencies[result.roll]++;
  assert.deepEqual(frequencies, {
    2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6,
    8: 5, 9: 4, 10: 3, 11: 2, 12: 1,
  });
});

test('streak breaker guarantees that a total cannot occur three times consecutively', () => {
  const game = { rules: { diceAlgorithm: 'streak_breaker' }, diceStats: {} };
  const rolls = Array.from({ length: 12 }, () => rollDiceWithAlgorithm(game, () => 0).roll);
  for (let i = 2; i < rolls.length; i++) {
    assert.equal(rolls[i] === rolls[i - 1] && rolls[i] === rolls[i - 2], false);
  }
});

test('probability corrected mode remains valid while favoring an underrepresented tail', () => {
  const overloadedLowTail = { 2: 100, 3: 100, 4: 100, 5: 100, 6: 100, 7: 100, 8: 100, 9: 100, 10: 100, 11: 100, 12: 0 };
  const game = { rules: { diceAlgorithm: 'probability_corrected' }, diceStats: overloadedLowTail };
  const result = rollDiceWithAlgorithm(game, () => 0.999999);
  assert.equal(result.algorithm, 'probability_corrected');
  assert.ok(result.d1 >= 1 && result.d1 <= 6);
  assert.ok(result.d2 >= 1 && result.d2 <= 6);
  assert.equal(result.roll, result.d1 + result.d2);
  assert.equal(result.roll, 12);
});
