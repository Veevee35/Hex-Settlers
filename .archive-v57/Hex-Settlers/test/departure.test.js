'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { resolveDepartedTitleChallenge, returnPlayerResourcesToBank } = require('../server/departure');

test('departing player returns every resource while leaving unrelated state untouched', () => {
  const game = { bank: { brick: 10, grain: 5 } };
  const player = { id: 'gone', resources: { brick: 3, grain: 2 }, army: 4 };
  const returned = returnPlayerResourcesToBank(game, player, ['brick', 'grain'], (state, kind, amount) => { state.bank[kind] += amount; });
  assert.deepEqual({ ...returned }, { brick: 3, grain: 2 });
  assert.deepEqual(player.resources, { brick: 0, grain: 0 });
  assert.deepEqual(game.bank, { brick: 13, grain: 7 });
  assert.equal(player.army, 4);
});

test('departed title holder remains until one active player strictly surpasses the benchmark', () => {
  const players = [
    { id: 'gone', departed: true, score: 7 },
    { id: 'a', score: 7 },
    { id: 'b', score: 6 },
  ];
  const held = resolveDepartedTitleChallenge({ players, ownerId: 'gone', benchmark: 7, minimum: 5, scoreForPlayer: (p) => p.score });
  assert.deepEqual(held, { playerId: 'gone', score: 7, surpassed: false });
  players[1].score = 8;
  const passed = resolveDepartedTitleChallenge({ players, ownerId: 'gone', benchmark: 7, minimum: 5, scoreForPlayer: (p) => p.score });
  assert.deepEqual(passed, { playerId: 'a', score: 8, surpassed: true });
  players[2].score = 8;
  const tied = resolveDepartedTitleChallenge({ players, ownerId: 'gone', benchmark: 7, minimum: 5, scoreForPlayer: (p) => p.score });
  assert.deepEqual(tied, { playerId: 'gone', score: 7, surpassed: false });
});
