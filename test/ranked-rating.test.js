'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const client = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
const { rankedRating, calculateRankedChanges } = require('../server/ranked-rating');
const { computePolicyRatingChanges, DEFAULT_RATING_POLICY } = require('../server/rating-policy');
const { serializeRoom, restoreRoom } = require('../server/active-rooms');

function extractFunction(startName, endName) {
  const begin = source.indexOf(`function ${startName}(`);
  const end = source.indexOf(`\nfunction ${endName}(`, begin);
  assert.ok(begin !== -1 && end > begin, `${startName} exists and precedes ${endName}`);
  return source.slice(begin, end);
}

const players = Array.from({ length: 4 }, (_, i) => ({ id: `p${i + 1}`, rating: 1000 }));

test('all new or invalid ratings default to 1000 without deriving anything from win/loss stats', () => {
  for (const value of [undefined, null, '', NaN, Infinity, 'invalid']) assert.equal(rankedRating(value), 1000);
  assert.equal(rankedRating(1172.8), 1173);
});

test('four equal ranked players: winner gains 24 and three losers lose 8 each', () => {
  const result = calculateRankedChanges(players, 'p1');
  assert.deepEqual(result.p1, { before: 1000, delta: 24, after: 1024 });
  for (const id of ['p2', 'p3', 'p4']) assert.deepEqual(result[id], { before: 1000, delta: -8, after: 992 });
  assert.equal(Object.values(result).reduce((sum, row) => sum + row.delta, 0), 0);
});

test('five and six player ratings retain the point pool and reward underdog wins', () => {
  for (const n of [5, 6]) {
    const equal = calculateRankedChanges(players.concat(
      Array.from({ length: n - 4 }, (_, i) => ({ id: `extra${i}`, rating: 1000 }))
    ), 'p1');
    assert.equal(Object.values(equal).reduce((sum, change) => sum + change.delta, 0), 0);
    assert.ok(equal.p1.delta > 0);
    assert.ok(Object.values(equal).filter(change => change.delta < 0).length >= n - 1);
  }
  const uneven = players.map((player, index) => ({ ...player, rating: 900 + index * 100 }));
  assert.ok(calculateRankedChanges(uneven, 'p1').p1.delta > calculateRankedChanges(uneven, 'p4').p4.delta);
});

test('invalid ranked outcomes cannot change ratings, and AI does not enter the rating pool', () => {
  assert.deepEqual(calculateRankedChanges(players, 'stranger'), {});
  assert.deepEqual(calculateRankedChanges([players[0]], 'p1'), {});
  const result = calculateRankedChanges([...players, { id: 'bot', rating: 1000, isAI: true }], 'p1');
  assert.equal(result.bot, undefined);
  assert.equal(Object.keys(result).length, 4);
});

test('initial migration resets every legacy account once, then never overwrites earned ratings', () => {
  let stored = { version: 2, users: [
    { id: 'a', username: 'Alice', rankedRating: 3000 },
    { id: 'b', username: 'Bob', stats: { gamesPlayed: 14, wins: 12 } },
  ] };
  let saves = 0;
  const ctx = vm.createContext({
    fs: { existsSync: () => true, readFileSync: () => JSON.stringify(stored) },
    USERS_DB: {}, USERS_DB_PATH: 'users.json', RANKED_RATING_SEASON: 1, INITIAL_RANKED_RATING: 1000,
    hashSessionToken: (token) => token, console,
    saveUsersDb: () => { saves++; stored = JSON.parse(JSON.stringify(ctx.USERS_DB)); },
  });
  vm.runInContext(extractFunction('loadUsersDb', 'saveUsersDb'), ctx);
  ctx.loadUsersDb();
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.USERS_DB.users.map((u) => u.rankedRating))), [1000, 1000]);
  assert.equal(stored.rankedRatingSeason, 1);
  assert.equal(saves, 1);
  stored.users[0].rankedRating = 1120;
  ctx.loadUsersDb();
  assert.equal(ctx.USERS_DB.users[0].rankedRating, 1120);
  assert.equal(saves, 1);
});

test('only authoritative ranked games update ratings, and results apply only once', () => {
  const ctx = vm.createContext({
    findUserById: (id) => ctx.users[id] || null,
    rankedRating, calculateRankedChanges, computePolicyRatingChanges, RATING_POLICY: DEFAULT_RATING_POLICY,
    now: () => 123456,
    saveUsersDb: () => { ctx.saves++; },
    sendJson: () => {},
    safeUserPublic: (u) => ({ id: u.id, rankedRating: u.rankedRating }),
    WebSocket: { OPEN: 1 },
    users: {}, saves: 0,
  });
  for (const player of players) ctx.users[player.id] = { id: player.id, rankedRating: 1000, stats: {} };
  vm.runInContext(extractFunction('persistUserStatsFromGame', 'hasSettlementOrCityAt'), ctx);
  const makeGame = () => ({
    phase: 'game-over', ranked: true, winnerId: 'p1',
    players: players.map((p) => ({ id: p.id, vp: p.id === 'p1' ? 10 : 7 })),
  });
  const room = { ranked: false, code: 'ABCD', sockets: new Map() };
  const unrankedGame = makeGame();
  ctx.persistUserStatsFromGame(room, unrankedGame, 'p1');
  assert.deepEqual(Array.from(Object.values(ctx.users), (u) => u.rankedRating), [1000, 1000, 1000, 1000]);
  assert.deepEqual(Object.keys(unrankedGame.ratingChanges), []);

  room.ranked = true;
  const rankedGame = makeGame();
  ctx.persistUserStatsFromGame(room, rankedGame, 'p1');
  assert.deepEqual(Array.from(Object.values(ctx.users), (u) => u.rankedRating), [1024, 992, 992, 992]);
  assert.equal(rankedGame.ratingChanges.p1.delta, 24);
  assert.equal(ctx.users.p1.stats.gamesPlayed, 2); // unranked remains in lifetime stats
  ctx.persistUserStatsFromGame(room, rankedGame, 'p1');
  assert.equal(ctx.users.p1.rankedRating, 1024);
  assert.equal(ctx.users.p1.stats.gamesPlayed, 2);
});

test('active ranked rooms retain their ranked flag after persistence and restore', () => {
  const room = { code: 'ABCD', hostId: 'p1', ranked: true, rankedPreferences: { map: 'classic', playerCount: 4 },
    players: [{ id: 'p1', name: 'Alice' }], spectators: [], sockets: new Map(), rules: {}, game: { ranked: true } };
  const recovered = restoreRoom(serializeRoom(room), {});
  assert.equal(recovered.ranked, true);
  assert.equal(recovered.game.ranked, true);
  assert.equal(recovered.rankedPreferences.playerCount, 4);
  assert.equal(restoreRoom({ ...serializeRoom(room), ranked: false }, {}).ranked, false);
});

test('game history includes the ranked flag and per-user rating changes in its saved snapshot', () => {
  const makeEntry = extractFunction('makeGameHistoryEntry', 'persistGameHistoryFromGame');
  const ctx = vm.createContext({
    _historyPlayerSummary: (p) => ({ id: p.id, name: p.name, vp: p.vp }),
    now: () => 123456,
    crypto: { randomUUID: () => 'new-game-id' },
    deepClone: (obj) => JSON.parse(JSON.stringify(obj)),
    sanitizeLogEntriesForViewer: (entries) => entries,
    RATING_POLICY: DEFAULT_RATING_POLICY,
  });
  vm.runInContext(makeEntry, ctx);
  const game = { phase: 'game-over', ranked: true, winnerId: 'p1', turnNumber: 10,
    players: [{ id: 'p1', name: 'Alice', vp: 10 }, { id: 'p2', name: 'Bob', vp: 7 }],
    ratingChanges: { p1: { before: 1000, delta: 16, after: 1016 }, p2: { before: 1000, delta: -16, after: 984 } },
    rules: { mapMode: 'classic' }, stats: { endedAt: 123456 },
  };
  const entry = ctx.makeGameHistoryEntry({ code: 'ABCD' }, game, 'p1');
  assert.equal(entry.ranked, true);
  assert.equal(entry.snapshot.ranked, true);
  assert.equal(entry.snapshot.ratingChanges.p1.after, 1016);
  assert.equal(entry.ratingChanges.p2.delta, -16);
});

test('Player Stats uses ranked rating instead of resource change columns, and summaries show rating changes', () => {
  assert.match(client, /\{ key: 'rankedRating', label: 'Rating' \}/);
  assert.doesNotMatch(client, /\{ key: 'resGained', label: 'Res\+' \}/);
  assert.doesNotMatch(client, /\{ key: 'resLost', label: 'Res-' \}/);
  assert.match(client, /ratingText: ratingLabel/);
  assert.match(client, /Unranked · Rating change: 0/);
  assert.match(source, /const rating = rankedRating\(user\?\.rankedRating\)/);
});
