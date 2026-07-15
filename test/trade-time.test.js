'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { extendPlayerTurn } = require('../server/trade-time');

test('successful player trade adds ten seconds to an active timer', () => {
  const game = { phase: 'main-actions', currentPlayerId: 'p1', timer: { phase: 'main-actions', segmentKey: 'turn:p1', endsAt: 5_000, durationMs: 30_000 } };
  assert.equal(extendPlayerTurn(game, 'p1', 10_000, 'turn:p1', () => 1_000), true);
  assert.equal(game.timer.endsAt, 15_000);
  assert.equal(game.timer.durationMs, 40_000);
  assert.equal(extendPlayerTurn(game, 'p2', 10_000, 'turn:p1', () => 1_000), false);
});

test('trade-time bonus extends a paused trade hold', () => {
  const game = {
    phase: 'main-actions', currentPlayerId: 'p1', timer: { phase: 'main-actions', segmentKey: 'turn:p1', durationMs: 30_000 },
    tradeTimerPause: { hold: { phase: 'main-actions', segmentKey: 'turn:p1', remainingMs: 12_000 } },
  };
  assert.equal(extendPlayerTurn(game, 'p1', 10_000, 'turn:p1'), true);
  assert.equal(game.tradeTimerPause.hold.remainingMs, 22_000);
  assert.equal(game.timer.durationMs, 40_000);
});
