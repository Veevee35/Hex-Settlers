'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { restoreRoom, serializeRoom } = require('../server/active-rooms');
const { DEFAULT_RULES } = require('../server/game-rules');

test('active room snapshots omit sockets and restore reconnectable state', () => {
  const room = {
    code: 'ABCD',
    hostId: 'host',
    createdAt: 123,
    players: [{ id: 'host', name: 'Host' }],
    spectators: [],
    sockets: new Map([['host', { transient: true }]]),
    preview: { transient: true },
    game: { roomCode: 'ABCD', phase: 'main-actions', players: [{ id: 'host' }] },
    rules: { mapMode: 'seafarers' },
    chat: [{ text: 'hello' }],
    sharedTexturePacks: {},
  };
  const snapshot = serializeRoom(room);
  assert.equal(snapshot.sockets, undefined);
  assert.equal(snapshot.preview, undefined);

  const restored = restoreRoom(JSON.parse(JSON.stringify(snapshot)), DEFAULT_RULES);
  assert.equal(restored.code, 'ABCD');
  assert.equal(restored.sockets instanceof Map, true);
  assert.equal(restored.sockets.size, 0);
  assert.equal(restored.preview, null);
  assert.equal(restored.game.phase, 'main-actions');
  assert.equal(restored.rules.discardLimit, DEFAULT_RULES.discardLimit);
  assert.equal(restored.rules.mapMode, 'seafarers');
});

test('invalid or hostless room snapshots are rejected', () => {
  assert.equal(restoreRoom({ code: '../bad', hostId: 'x', players: [{ id: 'x' }] }, DEFAULT_RULES), null);
  assert.equal(restoreRoom({ code: 'ABCD', hostId: 'x', players: [] }, DEFAULT_RULES), null);
});
