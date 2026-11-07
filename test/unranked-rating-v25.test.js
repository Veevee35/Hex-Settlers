'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { calculateUnrankedChanges, replayUnrankedHistory, unrankedRating, unrankedScoreForPlayer, UNRANKED_RATING_VERSION } = require('../server/unranked-rating');
const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
const client = fs.readFileSync(path.join(__dirname, '..', 'public/app.js'), 'utf8');
const players = [
  { id: 'alice', name: 'Alice', vp: 10 },
  { id: 'bob', name: 'Bob', vp: 1 },
  { id: 'bot', name: 'AI', vp: 5, isAI: true },
];
function game(id, ranked = false, winnerId = 'alice', endedAt = 100) {
  return { id, ranked, endedAt, roomCode: 'GAME', winnerId, players,
    snapshot: { phase: 'game-over', players, stats: { builds: { byPlayer: { alice: { city: 2, road: 6, settlement: 3 }, bob: {} } },
      trades: { byPlayer: { alice: { bank: 4, player: 3 } } },
      dev: { byPlayer: { alice: { bought: 3, played: 2 } } },
      resources: { byPlayer: {} } } },
  };
}
test('ratings start at zero, are signed integers, and victory dominates individual awards', () => {
  assert.equal(unrankedRating(null), 0);
  assert.equal(unrankedRating(undefined), 0);
  assert.equal(unrankedRating(-89.5), -89);
  assert.equal(unrankedRating('garbage'), 0);
  const changes = calculateUnrankedChanges(game('g1'), { alice: 0, bob: 0 }, ['alice', 'bob']);
  assert.ok(changes.alice.delta > 120);
  assert.ok(changes.bob.delta < 0, 'weak losses must be able to lower a rating');
  assert.equal(changes.bob.after, changes.bob.delta);
  assert.equal(changes.bot, undefined);
  const scored = unrankedScoreForPlayer(game('g1'), players[0]);
  assert.equal(scored.parts.victory, 120);
  assert.ok(Object.values(scored.parts).every((part) => Math.abs(part) <= 120));
});
test('unranked-only replay includes legacy games, accumulates losses below zero, and excludes ranked games', () => {
  const history = [game('ranked', true, 'alice', 250), game('later', false, 'alice', 300), game('legacy', null, 'alice', 100)];
  const initial = JSON.stringify(history);
  const result = replayUnrankedHistory(history, ['alice', 'bob', 'new']);
  assert.equal(result.applied, 2);
  assert.deepEqual(Object.keys(result.changesByGame).sort(), ['later', 'legacy']);
  assert.equal(result.changesByGame.legacy.alice.before, 0);
  assert.equal(result.changesByGame.later.alice.before, result.changesByGame.legacy.alice.after);
  assert.ok(result.ratings.bob < 0);
  assert.equal(result.ratings.new, 0);
  assert.equal(JSON.stringify(history), initial);
  assert.deepEqual(calculateUnrankedChanges(game('ranked', true)), {});
  assert.deepEqual(calculateUnrankedChanges({ ...game('g1'), snapshot: {} }), {});
});
test('server migrates historic unranked scores once and does not reset them on restart', () => {
  const start = server.indexOf('function migrateUnrankedRatingsFromHistory() {');
  const end = server.indexOf('// Rebuild per-user aggregate stats', start);
  assert.ok(start > 0 && end > start);
  let saves = 0, historySaves = 0;
  const entries = [game('legacy', null), game('ranked', true)];
  const ctx = {
    USERS_DB: { users: [{ id: 'alice' }, { id: 'bob' }, { id: 'new' }] },
    HISTORY_DB: { games: entries },
    UNRANKED_RATING_VERSION, unrankedRating, replayUnrankedHistory,
    isValidHistoryEntry: () => true,
    saveUsersDb: () => { saves++; }, saveHistoryDb: () => { historySaves++; },
  };
  vm.runInNewContext(`${server.slice(start, end)}\nmigrateUnrankedRatingsFromHistory();`, ctx);
  assert.equal(ctx.USERS_DB.users[0].unrankedRating, replayUnrankedHistory(entries, ['alice']).ratings.alice);
  assert.ok(ctx.USERS_DB.users[1].unrankedRating < 0);
  assert.equal(ctx.USERS_DB.users[2].unrankedRating, 0);
  assert.equal(saves, 1);
  assert.equal(historySaves, 1);
  assert.equal(entries[0].unrankedRatingChanges.alice.delta > 0, true);
  vm.runInNewContext(`${server.slice(start, end)}\nmigrateUnrankedRatingsFromHistory();`, ctx);
  assert.equal(saves, 1, 'restarting must not double-count archived games');
});
test('live unranked games update only signed unranked scores exactly once', () => {
  const begin = server.indexOf('function persistUserStatsFromGame(');
  const end = server.indexOf('\nfunction missingFor(', begin);
  assert.ok(begin > 0 && end > begin);
  const users = Object.fromEntries(players.filter(p => !p.isAI).map(p => [p.id, { id: p.id, rankedRating: 1000, unrankedRating: 0, stats: {} }]));
  let saved = 0;
  const ctx = {
    findUserById: id => users[id] || null, computePolicyRatingChanges: () => ({}),
    calculateUnrankedChanges, unrankedRating, UNRANKED_RATING_VERSION,
    WebSocket: { OPEN: 1 }, now: () => 100, RATING_POLICY: {},
    saveUsersDb: () => { saved++; }, safeUserPublic: x => x, sendJson: () => {},
  };
  vm.runInNewContext(server.slice(begin, end), ctx);
  const entry = game('live');
  const live = { phase: 'game-over', ranked: false, winnerId: 'alice', players, stats: entry.snapshot.stats };
  const room = { ranked: false, code: 'ROOM', sockets: new Map() };
  ctx.persistUserStatsFromGame(room, live, 'alice');
  assert.equal(users.alice.unrankedRating, live.unrankedRatingChanges.alice.after);
  assert.ok(users.bob.unrankedRating < 0);
  assert.equal(users.alice.rankedRating, 1000);
  const one = users.alice.unrankedRating;
  ctx.persistUserStatsFromGame(room, live, 'alice');
  assert.equal(users.alice.unrankedRating, one);
  assert.equal(saved, 1);
  const rankedRoom = { ranked: true, code: 'ROOM2', sockets: new Map() };
  const rankedLive = { phase: 'game-over', ranked: true, winnerId: 'alice', players, stats: entry.snapshot.stats };
  ctx.persistUserStatsFromGame(rankedRoom, rankedLive, 'alice');
  assert.equal(users.alice.unrankedRating, one);
  assert.equal(Object.keys(rankedLive.unrankedRatingChanges).length, 0);
});
test('profiles and leaderboards expose both ratings and the unranked ladder sorts by its own score', () => {
  assert.match(server, /unrankedRating: unrankedRating\(target\.unrankedRating\)/);
  assert.match(server, /unrankedRating: unrankedRating\(u\.unrankedRating\)/);
  assert.match(server, /unrankedRating: unrankedRating\(findUserById\(rec\.id\)\?\.unrankedRating\)/);
  assert.match(client, /\['UNRANKED RATING', unranked\]/);
  assert.match(client, /historyState\.leaderboardMode === 'unranked' \? 'unrankedRating'/);
  assert.match(client, /\{ key: 'unrankedRating', label: 'Unranked Rating' \}/);
});
