'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const guide = require('../server/tutorial-guide');
const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
const client = fs.readFileSync(path.join(__dirname, '..', 'public/app.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'public/index.html'), 'utf8');

test('V66 tutorial requires seven build/trade tasks, both seven roles and settings', () => {
  const p = guide.newProgress('owner');
  assert.equal(p.completed, false);
  assert.equal(guide.readyForSettings(p), false);
  for (const key of guide.GOALS) assert.equal(p.goals[key], false);
  guide.recordPlayerAction(p, 'place_settlement', 'setup1-settlement', 'setup1-road');
  guide.recordPlayerAction(p, 'place_road', 'setup1-road', 'setup2-settlement');
  assert.equal(p.goals.road, false);
  const map = { city:'upgrade_city', development:'buy_dev_card', road:'place_road', ship:'place_ship', settlement:'place_settlement', bankTrade:'bank_trade', playerTrade:'finalize_trade' };
  for (const [goal,kind] of Object.entries(map)) {
    guide.recordPlayerAction(p, kind, 'main-actions', 'main-actions');
    assert.equal(p.goals[goal], true);
  }
  assert.equal(guide.goalsComplete(p), true);
  assert.equal(guide.readyForSettings(p), false);
  p.aiRolledSeven = true;
  guide.recordPlayerAction(p, 'discard_cards', 'discard', 'pirate-or-robber');
  guide.recordPlayerAction(p, 'roll_dice', 'main-await-roll', 'pirate-or-robber', {roll:7});
  guide.recordPlayerAction(p, 'move_robber', 'pirate-or-robber', 'main-actions');
  assert.equal(guide.readyForSettings(p), true);
  assert.equal(p.completed, false, 'only explicit tutorial_finish can complete the tutorial');
});

test('V66 scripted dice demonstrate real production, AI seven discard and player seven', () => {
  const game = { tutorial:guide.newProgress('owner') };
  assert.equal(guide.chooseTutorialDice(game, 'owner').roll, 8);
  assert.equal(guide.chooseTutorialDice(game, 'ai').roll, 8);
  for (const k of guide.GOALS) game.tutorial.goals[k] = true;
  assert.equal(guide.chooseTutorialDice(game, 'ai').roll, 7);
  assert.equal(game.tutorial.aiRolledSeven, true);
  assert.equal(guide.chooseTutorialDice(game, 'ai'), null);
  assert.equal(guide.chooseTutorialDice(game, 'owner'), null);
  game.tutorial.discardedForSeven = true;
  assert.equal(guide.chooseTutorialDice(game, 'owner').roll, 7);
  game.tutorial.playerRolledSeven = true;
  assert.equal(guide.chooseTutorialDice(game, 'owner'), null);
});

test('V66 server uses real Seafarers build mechanics, player trades, and explicit replay', () => {
  assert.match(server, /mapMode: 'seafarers', seafarersScenario: 'heading_for_new_shores'/);
  assert.match(server, /tutorialGuide\.recordPlayerAction/);
  assert.match(server, /if \(msg\.type === 'restart_tutorial_game'\)/);
  assert.match(server, /room\.game = null;[\s\S]*?startGame\(room\)/);
  assert.match(server, /if \(msg\.type === 'tutorial_finish'\)/);
  assert.match(server, /tutorialGuide\.readyForSettings\(t\)/);
  assert.match(server, /if \(msg\.type === 'tutorial_prepare_routes'\)/);
  assert.match(server, /const accept = room\.tutorial \? true : wouldAcceptTrade/);
  assert.match(server, /'restart_tutorial_game',[\s\S]*?'tutorial_finish', 'tutorial_prepare_routes'/);
  assert.doesNotMatch(server, /sendJson\(ws, \{ type: 'tutorial_complete', user: safeUserPublic\(user\), skipped: true/);
  assert.doesNotMatch(server, /progress\.rolls >= 2 && progress\.endedTurns >= 2/);
});

test('V66 mobile and desktop tutorial give separate guidance and replay ignores prior completion', () => {
  assert.match(client, /const mobile = tutorialMobile\(\)/);
  assert.match(client, /const tips = mobile \? \[/);
  assert.match(client, /if \(state\?\.phase === 'lobby'\) \{[\s\S]*?send\(\{ type: 'start_game' \}\)/);
  assert.match(client, /else if \(t\.completed\) \{[\s\S]*?send\(\{ type: 'restart_tutorial_game' \}\)/);
  assert.match(client, /send\(\{ type: 'tutorial_finish' \}\)/);
  assert.match(html, /id="tutorialGuideAssist"/);
  assert.match(html, /app\.js\?v=release-v\d+/);
});

test('V66 protocol accepts tutorial replay and completion actions', () => {
  const {parseClientMessage} = require('../server/protocol');
  for (const msg of [
    {type:'restart_tutorial_game'}, {type:'tutorial_finish'},
    {type:'tutorial_prepare_routes',kind:'ship'}, {type:'tutorial_prepare_routes',kind:'settlement'},
  ]) assert.equal(parseClientMessage(JSON.stringify(msg)).ok, true);
});
