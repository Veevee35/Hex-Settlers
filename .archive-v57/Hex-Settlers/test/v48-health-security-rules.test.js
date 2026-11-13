'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { ROOM_LIFETIMES_MS, roomExpiry, isPlayerActivity } = require('../server/room-lifecycle');
const { restoreRoom, serializeRoom } = require('../server/active-rooms');
const { SlidingWindowRateLimiter } = require('../server/security');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');

const t0 = 1_700_000_000_000;
const room = (game = null, activity = t0) => ({ createdAt: t0, lastActiveAt: t0, lastHumanActivityAt: activity, game });

test('inactivity leases ignore timer broadcasts and favor ongoing connected games', () => {
  const waiting = room();
  waiting.lastActiveAt = t0 + 25 * 60_000; // sent-state updates must not extend the lease
  assert.equal(roomExpiry(waiting, t0 + ROOM_LIFETIMES_MS.emptyLobby + 1, false).expired, true);
  assert.equal(roomExpiry(waiting, t0 + ROOM_LIFETIMES_MS.occupiedLobbyIdle - 1, true).expired, false);
  assert.equal(roomExpiry(waiting, t0 + ROOM_LIFETIMES_MS.occupiedLobbyIdle + 1, true).expired, true);

  const live = room({ phase: 'main-actions' });
  assert.equal(roomExpiry(live, t0 + 24 * 60 * 60_000, true).expired, false);
  assert.equal(roomExpiry(live, t0 + ROOM_LIFETIMES_MS.activeDisconnected + 1, false).expired, true);
});

test('finished-game room cleanup uses game end time even while state broadcasts occur', () => {
  const finished = room({ phase: 'game-over', stats: { endedAt: t0 } });
  finished.lastActiveAt = t0 + 40 * 60_000;
  assert.equal(roomExpiry(finished, t0 + ROOM_LIFETIMES_MS.finishedDisconnected + 1, false).expired, true);
  assert.equal(roomExpiry(finished, t0 + ROOM_LIFETIMES_MS.finishedConnected - 1, true).expired, false);
  assert.equal(roomExpiry(finished, t0 + ROOM_LIFETIMES_MS.finishedConnected + 1, true).expired, true);
});

test('player activity ignores heartbeat, state polling, and preview queries', () => {
  for (const action of ['client_ping', 'get_state', 'query_build_options', 'get_game_history']) assert.equal(isPlayerActivity(action), false);
  for (const action of ['game_action', 'set_rules', 'start_game', 'set_ready']) assert.equal(isPlayerActivity(action), true);
});

test('restored rooms preserve human activity so old entries cannot resurrect forever', () => {
  const saved = serializeRoom({ ...room(), code: 'ABCD', hostId: 'user1', players: [{ id: 'user1' }], spectators: [], rules: {}, chat: [] });
  assert.equal(saved.lastHumanActivityAt, t0);
  assert.equal(restoreRoom(saved, {}).lastHumanActivityAt, t0);
});

test('websocket flooding is rate limited per connection independently', () => {
  let clock = t0;
  const limit = new SlidingWindowRateLimiter({ maxAttempts: 3, windowMs: 10_000, clock: () => clock });
  for (let i = 0; i < 3; i++) assert.equal(limit.consume('socket').allowed, true);
  assert.equal(limit.consume('socket').allowed, false);
  clock += 10_001;
  assert.equal(limit.consume('socket').allowed, true);
  assert.match(server, /ws\._messageLimiter\.consume\('message'\)/);
  assert.match(server, /ws\._expensiveMessageLimiter\.consume\('expensive'\)/);
});

test('in-game rules modal resolves scenario labels via same catalog as lobby guide', () => {
  const modal = app.slice(app.indexOf('function openRulesModal()'), app.indexOf('let diceStatsScope', app.indexOf('function openRulesModal()')));
  assert.match(modal, /LOBBY_RULES_SCENARIOS\[normalizedScenario\]/);
  assert.match(modal, /Unknown scenario \(\$\{scenRaw\}\)/);
  assert.match(modal, /usesPairedTurns/);
  for (const scenario of ['eight_islands_78', 'through_the_desert_78', 'fog_island_78', 'scattered_tiles_78', 'cartographer_78']) {
    assert.match(app, new RegExp(`\\n    ${scenario}: \\{`));
  }
});
