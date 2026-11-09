'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { challengeWeekId, challengeRules, generateWeeklyMap } = require('../server/challenge-maps');

test('Challenge weeks rotate Monday 01:00 America/Chicago (CST and CDT)', () => {
  assert.equal(challengeWeekId(Date.parse('2026-11-09T06:59:59Z')), '2026-11-02');
  assert.equal(challengeWeekId(Date.parse('2026-11-09T07:00:00Z')), '2026-11-09');
  assert.equal(challengeWeekId(Date.parse('2026-07-06T05:59:59Z')), '2026-06-29');
  assert.equal(challengeWeekId(Date.parse('2026-07-06T06:00:00Z')), '2026-07-06');
  assert.equal(challengeWeekId(Date.parse('2026-11-10T16:00:00Z')), '2026-11-09');
});

test('All five sizes have fixed scenario rules, Balanced Bag and fixed roster target', () => {
  const scenario = ['cartographer_4_random', 'cartographer_56_random', 'cartographer_56_random', 'scattered_tiles_78_7', 'scattered_tiles_78_8'];
  for (let count = 4; count <= 8; count++) {
    const r = challengeRules(count);
    assert.equal(r.mapMode, 'seafarers');
    assert.equal(r.seafarersScenario, scenario[count - 4]);
    assert.equal(r.playerCount, count);
    assert.equal(r.diceAlgorithm, 'balanced');
    assert.equal(r.randomMapAtStart, false);
    assert.equal(r.victoryPointsToWin, count === 4 ? 12 : 14);
  }
  assert.throws(() => challengeRules(3));
  assert.throws(() => challengeRules(9));
});

test('Seeded challenge generation repeats per map/week and restores Math.random', () => {
  const sample = () => Array.from({length:20}, () => Math.random());
  const original = Math.random;
  const a = generateWeeklyMap('2026-11-09', 4, sample);
  const b = generateWeeklyMap('2026-11-09', 4, sample);
  const c = generateWeeklyMap('2026-11-09', 5, sample);
  const d = generateWeeklyMap('2026-11-16', 4, sample);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  assert.notDeepEqual(a, d);
  assert.equal(Math.random, original);
  assert.throws(() => generateWeeklyMap('2026-11-09', 5, () => { throw Error('failure'); }));
  assert.equal(Math.random, original);
});

test('Challenge rooms persist their weekly identity and remain private', () => {
  const { serializeRoom, restoreRoom } = require('../server/active-rooms');
  const { DEFAULT_RULES } = require('../server/game-rules');
  const original = {
    code: 'ABCD', hostId: 'human', players: [{ id: 'human', name: 'Host' }],
    spectators: [], rules: challengeRules(7), ranked: false, casual: false,
    visibility: 'private', challenge: { weekId: '2026-11-09', playerCount: 7 },
  };
  const reloaded = restoreRoom(serializeRoom(original), DEFAULT_RULES);
  assert.deepEqual(reloaded.challenge, original.challenge);
  assert.equal(reloaded.visibility, 'private');
  assert.equal(reloaded.casual, false);
  assert.equal(reloaded.rules.diceAlgorithm, 'balanced');
});

test('Authenticated WebSocket protocol supports challenge discovery and creation', () => {
  const { parseClientMessage } = require('../server/protocol');
  assert.equal(parseClientMessage(JSON.stringify({ type: 'get_challenge_maps' })).ok, true);
  assert.equal(parseClientMessage(JSON.stringify({ type: 'create_challenge_room', playerCount: 8 })).ok, true);
});
