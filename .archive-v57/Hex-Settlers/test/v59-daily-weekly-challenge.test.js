'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  challengeDayId, challengeWeekId, challengeScenario, challengeRules,
  generateChallengeMap, FAMILIES
} = require('../server/challenge-maps');
const { buildChallengeLeaderboard } = require('../server/challenge-leaderboard');
const { serializeRoom, restoreRoom } = require('../server/active-rooms');
const { DEFAULT_RULES } = require('../server/game-rules');
const { parseClientMessage } = require('../server/protocol');
const root = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(root,'server.js'),'utf8');
const app = fs.readFileSync(path.join(root,'public/app.js'),'utf8');
const html = fs.readFileSync(path.join(root,'public/index.html'),'utf8');

test('daily/weekly reset at 1 AM Chicago through both DST transitions', () => {
  for (const [before, after, previous, current] of [
    ['2026-11-09T06:59:59Z','2026-11-09T07:00:00Z','2026-11-08','2026-11-09'],
    ['2026-07-06T05:59:59Z','2026-07-06T06:00:00Z','2026-07-05','2026-07-06'],
  ]) {
    assert.equal(challengeDayId(Date.parse(before)), previous);
    assert.equal(challengeDayId(Date.parse(after)), current);
  }
  assert.equal(challengeWeekId(Date.parse('2026-11-09T06:59:59Z')), '2026-11-02');
  assert.equal(challengeWeekId(Date.parse('2026-11-09T07:00:00Z')), '2026-11-09');
});

test('each period shares one supported scenario for all capacities; no Cartographer', () => {
  for (const kind of ['daily','weekly']) for (const period of ['2026-11-09','2026-11-10','2026-11-11','2026-11-12','2026-11-13']) {
    const family = challengeScenario(kind,period);
    assert.ok(FAMILIES.includes(family));
    for (const seats of [4,5,6,7,8]) {
      const rules = challengeRules(seats,family);
      assert.equal(rules.playerCount,seats);
      assert.equal(rules.diceAlgorithm,'balanced');
      assert.equal(rules.randomMapAtStart,false);
      if (family !== 'scattered') assert.doesNotMatch(rules.seafarersScenario,/cartographer|scattered/);
      if (family === 'scattered') assert.match(rules.seafarersScenario,/cartographer_.*_random|scattered_tiles_78/);
      assert.equal(rules.mapMode === 'classic' || rules.mapMode === 'classic56' || rules.mapMode === 'classic78', family === 'classic');
    }
  }
});

test('per-period fixed seed produces repeatable maps and restores global RNG', () => {
  const original = Math.random;
  const sample = () => Array.from({length:10},()=>Math.random());
  const sameA = generateChallengeMap('daily','2026-11-09',7,sample);
  const sameB = generateChallengeMap('daily','2026-11-09',7,sample);
  const diff = generateChallengeMap('daily','2026-11-10',7,sample);
  assert.deepEqual(sameA,sameB);
  assert.notDeepEqual(sameA,diff);
  assert.equal(Math.random,original);
});

test('daily challenge room restores without downgrading to weekly', () => {
  const input = { code:'ABCD',hostId:'user',players:[{id:'user',name:'Player'}],
    spectators:[],rules:challengeRules(8,'fog'),challenge:{kind:'daily',dayId:'2026-11-09',playerCount:8},visibility:'private' };
  const out = restoreRoom(serializeRoom(input), DEFAULT_RULES);
  assert.deepEqual(out.challenge,input.challenge);
});

test('daily leaderboard only sees daily results and weekly only sees weekly', () => {
  const mk = (kind,id) => ({challenge:{kind,playerCount:4,...(kind==='daily'?{dayId:id}:{weekId:id})},
    ranked:false,casual:false,winnerId:'p1', players:[{id:'p1',name:'P1',vp:12}],
    rules:{victoryPointsToWin:10},turns:5,startedAt:100,endedAt:1000,snapshot:{stats:{}}});
  const data = [mk('daily','2026-11-09'),mk('weekly','2026-11-09')];
  const find = () => ({displayName:'P1'});
  assert.equal(buildChallengeLeaderboard(data,'2026-11-09',4,find,'daily').length,1);
  assert.equal(buildChallengeLeaderboard(data,'2026-11-09',4,find,'weekly').length,1);
});

test('protocol and UI wire daily archive, single attempt, movable tutorial and nested archive filters', () => {
  assert.equal(parseClientMessage(JSON.stringify({type:'get_challenge_archive'})).ok,true);
  assert.equal(parseClientMessage(JSON.stringify({type:'create_challenge_room',kind:'daily',playerCount:7})).ok,true);
  assert.match(server,/dailyChallengeAttempts/);
  assert.match(server,/room\.hostId !== pid/);
  assert.match(server,/room\.preview\?\.key : mapPreviewKey/);
  assert.match(app,/function renderChallengeExplorer\(section\)/);
  assert.match(app,/pointerdown/);
  assert.match(html,/id="challengePeriodTabs"/);
  assert.match(html,/data-period="daily"/);
});
