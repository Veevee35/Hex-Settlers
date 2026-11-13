'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.join(__dirname, '..');
const serverSource = fs.readFileSync(path.join(projectRoot, 'server.js'), 'utf8');
const clientSource = fs.readFileSync(path.join(projectRoot, 'public', 'app.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(projectRoot, 'public', 'index.html'), 'utf8');
const { DEFAULT_RULES, RANKED_SCENARIOS, rankedRulesForScenario } = require('../server/game-rules');
const { CLIENT_MESSAGE_TYPES } = require('../server/protocol');
const { restoreRoom, serializeRoom } = require('../server/active-rooms');

test('ranked scenarios each receive a complete locked ruleset', () => {
  assert.deepEqual(RANKED_SCENARIOS.map((scenario) => scenario.id), [
    'classic', 'four_islands', 'through_the_desert', 'fog_island',
    'heading_for_new_shores', 'cartographer_4_random',
  ]);
  for (const scenario of RANKED_SCENARIOS) {
    const rules = rankedRulesForScenario(scenario.id);
    assert.equal(rules.mapMode, scenario.mapMode);
    assert.equal(rules.seafarersScenario, scenario.seafarersScenario || 'four_islands');
    assert.equal(rules.setupTurnMs, 60_000);
    assert.equal(rules.playTurnMs, 30_000);
    assert.equal(rules.microPhaseMs, 15_000);
    assert.equal(rules.friendlyRobber, false);
    assert.equal(rules.diceAlgorithm, 'probability_corrected');
    assert.equal(rules.explorationPointsEnabled, scenario.id !== 'fog_island');
    assert.ok(rules.victoryPointsToWin >= 10 && rules.victoryPointsToWin <= 14);
  }
  assert.equal(rankedRulesForScenario('classic').victoryPointsToWin, 10);
  assert.equal(rankedRulesForScenario('four_islands').victoryPointsToWin, 13);
  assert.equal(rankedRulesForScenario('through_the_desert').victoryPointsToWin, 14);
  assert.equal(rankedRulesForScenario('fog_island').victoryPointsToWin, 12);
});

test('ranked ballot protocol and persistence retain options and votes', () => {
  assert.ok(CLIENT_MESSAGE_TYPES.includes('ranked_scenario_vote'));
  const room = {
    code: 'ABCD', hostId: 'p1', ranked: true, players: [{ id: 'p1' }], spectators: [],
    sockets: new Map(), game: null, rules: rankedRulesForScenario('classic'), chat: [],
    rankedScenarioVote: { options: RANKED_SCENARIOS.slice(0, 3), votes: { p1: 'classic' }, createdAt: 123 },
  };
  const restored = restoreRoom(serializeRoom(room), DEFAULT_RULES);
  assert.equal(restored.rankedScenarioVote.votes.p1, 'classic');
  assert.equal(restored.rankedScenarioVote.options.length, 3);
});

test('ranked matchmaking is one four-player server-owned queue with a three-option ballot', () => {
  assert.doesNotMatch(indexHtml, /id="rankedMap"|id="rankedPlayers"/);
  assert.match(serverSource, /const RANKED_PLAYER_COUNT = 4/);
  assert.match(serverSource, /randomRankedScenarioOptions\(3\)/);
  assert.match(serverSource, /leaders\[crypto\.randomInt\(leaders\.length\)\]/);
  assert.match(serverSource, /now\(\) < Number\(ballot\.endsAt/);
  assert.match(serverSource, /const RANKED_SCENARIO_VOTE_MS/);
  assert.match(serverSource, /for \(const room of rooms\.values\(\)\)/);
  assert.match(serverSource, /hostId: room\.ranked \? null : room\.hostId/);
  assert.match(serverSource, /Ranked matches are server-controlled/);
  assert.match(serverSource, /if \(room\.ranked\)[\s\S]*?enqueueRankedPlayer\(ws, user\)/);
  assert.match(clientSource, /type: 'ranked_queue_join'/);
  assert.match(clientSource, /type: 'ranked_scenario_vote'/);
});

test('ranked Back and End Game controls are disabled but available in unranked', () => {
  assert.doesNotMatch(serverSource, /playerId !== game\.hostId[\s\S]{0,100}end-game vote/);
  assert.match(serverSource, /Only an active player can start an end-game vote/);
  assert.match(clientSource, /canRequestEndVote = !!\(inGame && state\?\.phase !== 'game-over' && !amSpectator/);
  assert.match(serverSource, /Back and End Game votes are disabled in ranked matches/);
  assert.match(clientSource, /!room\?\.ranked/);
});

test('Player Stats exposes Ranked, Unranked, and Combined with independent ratings', () => {
  for (const label of ['Ranked Play', 'Unranked Play', 'Combined']) assert.ok(clientSource.includes(label));
  assert.match(clientSource, /if \(mode !== 'unranked'\) columns\.push\(\{ key: 'rankedRating', label: 'Ranked Rating' \}\)/);
  assert.match(clientSource, /\{ key: 'unrankedRating', label: 'Unranked Rating' \}/);
  assert.match(serverSource, /combined: emptyLeaderboardAggregate\(\)/);
  assert.match(serverSource, /if \(g\.ranked === true\).*rec\.ranked/);
  assert.match(serverSource, /if \(g\.ranked !== true\).*rec\.unranked/);
});

