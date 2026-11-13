'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const client = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/styles.css'), 'utf8');
const { parseClientMessage } = require('../server/protocol');
const { serializeRoom, restoreRoom } = require('../server/active-rooms');

test('dedicated tutorial room is an accepted WebSocket request with fixed Classic rules and one AI', () => {
  assert.equal(parseClientMessage(JSON.stringify({ type: 'create_tutorial_room' })).ok, true);
  assert.match(server, /if \(msg\.type === 'create_tutorial_room'\)/);
  assert.match(server, /room\.tutorial = \{ ownerId: ws\._userId, version: 1 \}/);
  assert.match(server, /room\.casual = true;/);
  assert.match(server, /mapMode: 'classic', playerCount: 2, customMap: false/);
  assert.match(server, /addAIPlayersToRoom\(room, 2\)/);
  assert.match(server, /setupTurnMs: 0, playTurnMs: 0, microPhaseMs: 0, microMs: 0/);
  assert.match(server, /ensurePreview\(room, true\)/);
});

test('tutorial turns use real game setup and applyAction with server-issued completion', () => {
  assert.match(server, /if \(room\.tutorial\) \{[\s\S]*?order\.sort\(/);
  assert.match(server, /game\.phase = 'setup1-settlement'/);
  assert.match(server, /const result = applyAction\(room, pid, msg\.action\)/);
  for (const [kind, prop] of [
    ['place_settlement','settlements'], ['place_road','roads'],
    ['roll_dice','rolls'], ['end_turn','endedTurns']
  ]) {
    assert.ok(server.includes(`if (action === '${kind}') progress.${prop}++`));
    assert.ok(server.includes(`progress.${prop} >= 2`));
  }
  assert.match(server, /learner\.tutorialCompletedAt = learner\.tutorialCompletedAt \|\| now\(\)/);
  assert.match(server, /sendJson\(ws, \{ type: 'tutorial_complete', user: safeUserPublic\(learner\) \}\)/);
  assert.match(server, /if \(room\.tutorial\) \{[\s\S]*?Math\.max\(1900,/);
});

test('first-time account has locked other game modes with real lobby tutorial instead of mock overlay', () => {
  assert.match(client, /function tutorialUnlocked\(\) \{ return authUser\?\.tutorialCompleted === true; \}/);
  assert.match(client, /send\(\{ type:'create_tutorial_room' \}\)/);
  assert.match(client, /if \(!tutorialUnlocked\(\)\) \{ if \(mode === 'casual'\) beginLiveTutorial\(\)/);
  assert.match(client, /casual\.querySelector\('strong'\)\.textContent = unlocked \? 'Casual Play' : 'Start Your Adventure'/);
  assert.match(client, /btn\.disabled = ready && !unlocked/);
  assert.match(client, /const isHost = [^\n]+ && !room\.tutorial;/);
  assert.match(html, /id="tutorialGuide"/);
  assert.doesNotMatch(html, /id="journeyWalkthroughOverlay"/);
  assert.match(css, /\.tutorialAttention/);
});

test('server refuses pre-tutorial normal games even if user alters browser preferences', () => {
  for (const type of ['ranked_queue_join', 'create_room', 'join_room', 'rejoin_room']) {
    assert.ok(server.includes(`msg.type === '${type}'`) || server.includes(`'${type}'`));
  }
  assert.match(server, /!user\.tutorialCompletedAt/);
  assert.match(server, /!user\?\.tutorialCompletedAt/);
  assert.match(server, /!room\.tutorial && !findUserById\(ws\._userId\)\?\.tutorialCompletedAt/);
});

test('practice room and real progress can restore after restart', () => {
  const room = {
    code: 'ABCD', hostId: 'human-id', createdAt: Date.now(),
    players: [{ id: 'human-id', isAI: false }, { id: 'ai-id', isAI: true }],
    casual: true, tutorial: { ownerId: 'human-id', version: 1 },
    rules: { mapMode: 'classic', playerCount: 2 },
    game: { phase: 'main-await-roll', tutorial: { ownerId: 'human-id', settlements: 2, roads: 2, rolls: 1, endedTurns: 1 } }
  };
  const restored = restoreRoom(JSON.parse(JSON.stringify(serializeRoom(room))), {});
  assert.deepEqual(restored.tutorial, room.tutorial);
  assert.deepEqual(restored.game.tutorial, room.game.tutorial);
  assert.equal(restored.players.filter(p => p.isAI).length, 1);
  assert.equal(restored.rules.mapMode, 'classic');
  assert.match(client, /lastSeenAt: Date\.now\(\), tutorial: !!roomSnapshot\.tutorial/);
  assert.match(client, /user\.tutorialCompleted !== true && saved\.tutorial !== true/);
});
