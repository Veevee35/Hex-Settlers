'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { METRICS, DEFAULT_RATING_POLICY, validatedRatingPolicy, computePolicyRatingChanges, replayRankedHistory } = require('../server/rating-policy');
const root = path.resolve(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const client = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/styles.css'), 'utf8');
const participants = ['a', 'b', 'c', 'd'].map((id, i) => ({ id, name: id, vp: i === 0 ? 10 : 7 }));
const history = (id, ranked, winnerId = 'a', endedAt = 100) => ({
  id, roomCode: 'ABCD', ranked, endedAt, winnerId, players: participants,
  snapshot: { phase: 'game-over', players: participants, stats: { builds: { byPlayer: { a: { road: 5 }, b: { road: 2 } } }, resources: { byPlayer: {} } } },
});
const baseline = Object.fromEntries(participants.map(p => [p.id, 1000]));

test('policy defaults reproduce v13 and support detailed gameplay categories', () => {
  assert.ok(METRICS.length >= 35);
  const r = computePolicyRatingChanges(history('first', true), baseline, DEFAULT_RATING_POLICY);
  assert.equal(r.a.delta, 24);
  assert.equal(r.b.delta, -8);
  assert.equal(Object.values(r).reduce((t, item) => t + item.delta, 0), 0);
});

test('weighting gives or subtracts points from recorded behaviors without affecting unranked', () => {
  const policy = validatedRatingPolicy({ ...DEFAULT_RATING_POLICY, weights: { ...DEFAULT_RATING_POLICY.weights, roads: 2 } });
  const rated = computePolicyRatingChanges(history('x', true), baseline, policy);
  assert.equal(rated.a.delta, 34); // 24 Elo plus 5 road builds * 2
  assert.equal(rated.b.delta, -4); // -8 Elo plus 2 * 2
  assert.deepEqual(computePolicyRatingChanges(history('x', false), baseline, policy), {});
  const negative = validatedRatingPolicy({ ...policy, weights: { ...policy.weights, roads: -3 } });
  assert.equal(computePolicyRatingChanges(history('x', true), baseline, negative).a.delta, 9);
});

test('rebuild replays ranked in date order and excludes unranked without modifying inputs', () => {
  const games = [history('later', true, 'b', 300), history('unranked', false, 'a', 200), history('first', true, 'a', 100)];
  const original = JSON.stringify(games);
  const result = replayRankedHistory(games, DEFAULT_RATING_POLICY, ['a', 'b', 'c', 'd', 'newcomer']);
  assert.equal(result.applied, 2);
  assert.equal(result.rankedCount, 2);
  assert.deepEqual(Object.keys(result.changesByGame).sort(), ['first', 'later']);
  assert.equal(result.changesByGame.first.a.before, 1000);
  assert.equal(result.changesByGame.later.a.before, 1024);
  assert.equal(result.ratings.newcomer, 1000);
  assert.equal(JSON.stringify(games), original);
});

test('weight parameters are validated against malformed/out of bounds admin input', () => {
  for (const invalid of [NaN, Infinity, -30, 200]) {
    assert.throws(() => validatedRatingPolicy({ ...DEFAULT_RATING_POLICY, weights: { roads: invalid } }));
  }
  assert.throws(() => validatedRatingPolicy({ ...DEFAULT_RATING_POLICY, kFactor: 10000 }));
  assert.throws(() => validatedRatingPolicy(null));
});

test('ranked matchmaking uses one four-player queue before the scenario ballot', () => {
  assert.match(server, /const RANKED_PLAYER_COUNT = 4/);
  assert.match(server, /const key = String\(RANKED_PLAYER_COUNT\)/);
  assert.match(server, /queue\.push\(\{ ws, user, rating, queuedAt \}\)/);
  assert.match(server, /options: randomRankedScenarioOptions\(3\)/);
  assert.match(server, /const leaders = ballot\.options\.filter/);
  assert.match(server, /leaders\[crypto\.randomInt\(leaders\.length\)\]/);
});

test('mobile UI exposes accessible action and panel controls and board aligned prompts', () => {
  for (const id of ['mobilePanelsToggle', 'mobileActionsToggle', 'mobileFitBoard', 'mobilePanelsClose']) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(css, /body\.in-game \.yourRollBanner,\s*body\.in-game \.extraTurnCenterBanner/);
  assert.match(css, /body\.in-game\.mobilePanelsOpen \.rightSidebar/);
  assert.match(client, /function setMobilePanelsOpen\(/);
});

test('admin rating endpoints require confirmation, preview hash, and preserve backups', () => {
  for (const path of ['rating-policy', 'rating-policy-preview', 'rating-policy-save', 'rating-policy-rebuild']) assert.ok(server.includes(`/api/admin/${path}`));
  assert.match(server, /body\.confirm !== 'RECALCULATE'/);
  assert.match(server, /body\.token !== projection\.token/);
  assert.match(server, /rating_rebuild_backup_/);
  assert.match(client, /openRatingManagementScreen/);
});
