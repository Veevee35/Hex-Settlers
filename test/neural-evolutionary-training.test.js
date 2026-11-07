'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { performance } = require('../scripts/train_neural_ai_evolutionary');

test('evolutionary selection rewards larger margins and faster victories', () => {
  const quick = performance({ games: [{ turnNumber: 80, winnerMargin: 3 }] });
  const slow = performance({ games: [{ turnNumber: 120, winnerMargin: 3 }] });
  const dominant = performance({ games: [{ turnNumber: 80, winnerMargin: 4 }] });
  assert.ok(quick.score > slow.score);
  assert.ok(dominant.score > quick.score);
});
