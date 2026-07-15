'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { applyReplayPatch, diffReplayState, ensureReplay, materializeReplayFrame, recordReplayStep } = require('../server/replay');

test('replay patches reconstruct array, object, addition, and deletion changes', () => {
  const before = { phase: 'setup', players: [{ id: 'a', resources: { brick: 1 }, cards: [] }], temporary: true };
  const after = { phase: 'play', players: [{ id: 'a', resources: { brick: 0 }, cards: [{ id: 1 }] }], added: 4 };
  const patch = diffReplayState(before, after);
  assert.deepEqual(applyReplayPatch(before, patch), after);
});

test('recorded replay materializes every successful game frame without embedding itself', () => {
  const game = {
    phase: 'setup',
    currentPlayerId: 'a',
    players: [{ id: 'a', resources: { brick: 1 } }],
    devDeck: ['knight'],
    stats: { rolls: { history: [{ roll: 8 }] } },
    log: [{ id: 1, text: 'Game started.' }],
  };
  ensureReplay(game);
  game.phase = 'main-actions';
  game.players[0].resources.brick = 0;
  game.log.push({ id: 2, text: 'Built a road.' });
  recordReplayStep(game, { actorId: 'a', action: { kind: 'place_road', edgeId: 2 }, at: 123 });
  const frame = materializeReplayFrame(game.replay, 0);
  assert.equal(frame.phase, 'main-actions');
  assert.equal(frame.players[0].resources.brick, 0);
  assert.equal(frame.replay, undefined);
  assert.equal(game.replay.initialLogCount, 1);
  assert.equal(game.replay.steps[0].logCount, 2);
  assert.deepEqual(game.replay.log.map((entry) => entry.text), ['Game started.', 'Built a road.']);
  assert.equal(game.replay.initial.devDeck, undefined);
  assert.equal(game.replay.initial.devDeckCount, 1);
  assert.equal(game.replay.initial.stats, undefined);
  assert.deepEqual(game.replay.steps[0].action, { kind: 'place_road', edgeId: 2 });
});
