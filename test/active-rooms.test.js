'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { restoreRoom, serializeRoom } = require('../server/active-rooms');
const { DEFAULT_RULES } = require('../server/game-rules');

test('active room snapshots omit sockets and previews while preserving game and expert AI state', () => {
  const room = {
    code: 'ABC23', hostId: 'host', createdAt: 123, lastActiveAt: 456, players: [{ id: 'host', name: 'Host' }], spectators: [],
    sockets: new Map([['host', {}]]), preview: { secret: true }, game: { phase: 'play' }, rules: { mapMode: 'classic' },
    chat: [{ id: 1, text: 'hi' }], chatSeq: 2, aiSeq: 3, aiDifficulty: 'expert',
    expertAiTuning: { vpGainWeight: 223 }, sharedTexturePacks: { host: { name: 'pack' } }, pendingLeaveRequests: {},
  };
  const snapshot = serializeRoom(room);
  assert.equal(snapshot.sockets, undefined);
  assert.equal(snapshot.preview, undefined);
  assert.deepEqual(snapshot.expertAiTuning, { vpGainWeight: 223 });

  const restored = restoreRoom(snapshot, DEFAULT_RULES);
  assert.equal(restored.code, 'ABC23');
  assert.equal(restored.game.roomCode, 'ABC23');
  assert.equal(restored.sockets.size, 0);
  assert.equal(restored.preview, null);
  assert.equal(restored.lastActiveAt, 456);
  assert.deepEqual(restored.expertAiTuning, { vpGainWeight: 223 });
  assert.equal(restored.rules.victoryPointsToWin, 10);
});

test('legacy room snapshots use their creation time as the last activity fallback', () => {
  const restored = restoreRoom({
    code: 'ABC23', hostId: 'host', createdAt: 123, players: [{ id: 'host' }],
  }, DEFAULT_RULES);
  assert.equal(restored.lastActiveAt, 123);
  assert.equal(serializeRoom(restored).lastActiveAt, 123);
});

test('invalid room records are ignored', () => {
  assert.equal(restoreRoom({ code: 'bad!', hostId: 'host', players: [{ id: 'host' }] }, DEFAULT_RULES), null);
  assert.equal(restoreRoom({ code: 'ABC23', hostId: 'missing', players: [] }, DEFAULT_RULES), null);
});
