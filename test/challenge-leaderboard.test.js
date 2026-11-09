'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildChallengeLeaderboard, compareChallengeResults } = require('../server/challenge-leaderboard');

const weekId = '2026-11-09';
const users = {
  alice: { username: 'Alice' },
  bob: { username: 'Bob' },
  carol: { username: 'Carol' },
  dave: { username: 'Dave' },
};
const findUser = (id) => users[id] || null;
function game(winnerId, turns, durationMs, vp, options = {}) {
  const startedAt = 1794200000000;
  return {
    challenge: { weekId, playerCount: 4 },
    roomCode: 'ABCD',
    ranked: false, casual: false,
    winnerId, turns,
    startedAt,
    endedAt: durationMs == null ? null : startedAt + durationMs,
    rules: { victoryPointsToWin: 12 },
    players: [{ id: winnerId, name: winnerId, vp, isAI: winnerId.startsWith('ai_') }],
    snapshot: { phase: 'game-over', stats: { endedReason: 'vp' } },
    ...options,
  };
}

test('official leaderboard ranks by fewest turns, then least elapsed time, then fewer VP', () => {
  const games = [
    game('alice', 7, 85000, 12),
    game('bob', 6, 95000, 12),
    game('carol', 6, 90000, 14),
    game('dave', 6, 90000, 12),
  ];
  const results = buildChallengeLeaderboard(games, weekId, 4, findUser);
  assert.deepEqual(results.map(row => row.id), ['dave', 'carol', 'bob', 'alice']);
  assert.deepEqual(results.map(row => row.lowestTurns), [7, 7, 7, 8]);
  assert.equal(results[0].lowestTimeMs, 90000);
  assert.equal(results[0].totalVP, 12);
  assert.deepEqual(Object.keys(results[0]), ['id', 'name', 'lowestTimeMs', 'lowestTurns', 'totalVP']);
});

test('one complete winning run supplies all three stats, never mixing independent personal bests', () => {
  const games = [
    game('alice', 5, 100000, 15),
    game('alice', 6, 1000, 12),
    game('alice', 5, 90000, 14),
    game('alice', 5, 90000, 12),
    game('bob', 7, 1000, 14),
  ];
  const results = buildChallengeLeaderboard(games, weekId, 4, findUser);
  assert.equal(results.length, 2);
  assert.deepEqual(results[0], {
    id: 'alice', name: 'Alice', lowestTimeMs: 90000, lowestTurns: 6, totalVP: 12,
  });
});

test('exclude nonwinners, AI, out-of-week games, casual/ranked and vote-finished matches', () => {
  const history = [
    game('alice', 0, 10, 11), // below the VP victory target
    game('bob', 0, 10, 14, { snapshot: { phase: 'game-over', stats: { endedReason: 'vote' } } }),
    game('carol', 0, 10, 13, { ranked: true }),
    game('dave', 0, 10, 13, { casual: true }),
    game('alice', 0, 10, 13, { challenge: { weekId: '2026-11-02', playerCount: 4 } }),
    game('alice', 0, 10, 13, { challenge: { weekId, playerCount: 5 } }),
    game('alice', 0, 10, 13, { winnerId: 'ai_fake', players: [{ id: 'ai_fake', vp: 13 }] }),
    game('alice', 3, 15000, 12),
  ];
  assert.deepEqual(buildChallengeLeaderboard(history, weekId, 4, findUser).map(r => r.id), ['alice']);
});

test('missing timing data is explicit and ranks after known time at the same turn count', () => {
  const history = [
    game('alice', 5, null, 12),
    game('bob', 5, 15000, 15),
  ];
  const leaderboard = buildChallengeLeaderboard(history, weekId, 4, findUser);
  assert.deepEqual(leaderboard.map(r => r.id), ['bob', 'alice']);
  assert.equal(leaderboard[1].lowestTimeMs, null);
});

test('reject missing turn count and keep results stable for identical rankings', () => {
  const history = [
    game('bob', null, 10, 12, { turns: undefined, snapshot: { stats: { endedReason: 'vp' } } }),
    game('carol', 6, 15000, 12),
    game('alice', 6, 15000, 12),
  ];
  assert.deepEqual(buildChallengeLeaderboard(history, weekId, 4, findUser).map(r => r.id), ['alice', 'carol']);
  const a = { id:'a', name:'A', lowestTurns:1, lowestTimeMs:0, totalVP:12 };
  const b = { id:'b', name:'B', lowestTurns:1, lowestTimeMs:0, totalVP:12 };
  assert.ok(compareChallengeResults(a,b) < 0);
});

test('challenge page renders four sortable requested headers and official rank labels', () => {
  const page = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
  for (const heading of ['Player', 'Lowest Time', 'Lowest Turns to Win', 'Total VP earned']) {
    assert.match(page, new RegExp(`label: '${heading}'`));
  }
  assert.match(page, /button\.addEventListener\('click', \(\) => \{/);
  assert.match(page, /th\.setAttribute\('aria-sort'/);
  assert.match(page, /`#\$\{rank\}/);
  assert.doesNotMatch(page.slice(page.indexOf('function renderChallengeMaps()'), page.indexOf('function beginChallengeHost')), /'Best VP', 'Turns', 'Wins', 'Games'/);
});
