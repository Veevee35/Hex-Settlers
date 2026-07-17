'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  friendlyPirateCanOccupyTile,
  friendlyPirateProtectedPlayerIds,
  friendlyRobberProtectedPlayerIds,
  robberCanOccupyTile,
} = require('../server/friendly-robber');

const projectRoot = path.resolve(__dirname, '..');
const appJs = fs.readFileSync(path.join(projectRoot, 'public', 'app.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(projectRoot, 'public', 'index.html'), 'utf8');
const serverJs = fs.readFileSync(path.join(projectRoot, 'server.js'), 'utf8');

function makeGame(friendlyRobber = true) {
  return {
    rules: { friendlyRobber },
    players: [
      { id: 'new', name: 'New Player', vp: 2 },
      { id: 'leader', name: 'Leader', vp: 3 },
      { id: 'gone', name: 'Gone', vp: 1, departed: true },
    ],
    geom: {
      tiles: [
        { id: 0, type: 'field', cornerNodeIds: [0, 2] },
        { id: 1, type: 'forest', cornerNodeIds: [1, 2] },
        { id: 2, type: 'sea', cornerNodeIds: [] },
      ],
      nodes: [
        { building: { owner: 'new', type: 'settlement' } },
        { building: { owner: 'leader', type: 'settlement' } },
        { building: { owner: 'gone', type: 'settlement' } },
      ],
      edges: [
        { id: 0, shipOwner: 'new' },
        { id: 1, shipOwner: 'leader' },
        { id: 2, shipOwner: 'gone' },
      ],
      edgeAdjTiles: [[2], [2], [2]],
    },
  };
}

test('friendly robber protects adjacent active players until they exceed 2 VP', () => {
  const game = makeGame(true);
  assert.deepEqual(friendlyRobberProtectedPlayerIds(game, 0), ['new']);
  assert.equal(robberCanOccupyTile(game, 0), false);
  assert.equal(robberCanOccupyTile(game, 1), true);
  assert.equal(robberCanOccupyTile(game, 2), false);

  game.players[0].vp = 3;
  assert.equal(robberCanOccupyTile(game, 0), true);
  game.players[0].vp = 1;
  assert.equal(robberCanOccupyTile(game, 0), false);
});

test('friendly robber also protects sea tiles beside ships owned by active players with 2 VP or fewer', () => {
  const game = makeGame(true);
  assert.deepEqual(friendlyPirateProtectedPlayerIds(game, 2), ['new']);
  assert.equal(friendlyPirateCanOccupyTile(game, 2), false);

  game.players[0].vp = 3;
  assert.deepEqual(friendlyPirateProtectedPlayerIds(game, 2), []);
  assert.equal(friendlyPirateCanOccupyTile(game, 2), true);

  game.rules.friendlyRobber = false;
  game.players[0].vp = 1;
  assert.deepEqual(friendlyPirateProtectedPlayerIds(game, 2), []);
  assert.equal(friendlyPirateCanOccupyTile(game, 2), true);
});

test('friendly robber remains opt-in', () => {
  const game = makeGame(false);
  assert.deepEqual(friendlyRobberProtectedPlayerIds(game, 0), []);
  assert.equal(robberCanOccupyTile(game, 0), true);
});

test('setup, client targeting, server validation, timeout, and AI paths share friendly robber rules', () => {
  assert.match(indexHtml, /id="friendlyRobberToggle"[^>]*type="checkbox"/);
  assert.match(appJs, /friendlyRobber: ui\.friendlyRobberToggle \? !!ui\.friendlyRobberToggle\.checked : false/);
  assert.ok((appJs.match(/rejectFriendlyRobberTileClient\(tid\)/g) || []).length >= 4);
  assert.ok(appJs.includes("const canPirateHere = (isSeaTile && !(t.fog && !t.revealed) && !t.pirate && !friendlyRobberTileBlockedClient(t.id));"));
  assert.match(appJs, /addRow\('Friendly Robber', rules\.friendlyRobber === true \? 'Enabled' : 'Disabled'\)/);
  assert.match(serverJs, /const protectedIds = friendlyRobberProtectedPlayerIds\(game, tileId\)/);
  assert.match(serverJs, /const protectedIds = friendlyPirateProtectedPlayerIds\(game, tileId\)/);
  assert.ok((serverJs.match(/robberCanOccupyTile\(game, i\)/g) || []).length >= 4);
  assert.ok((serverJs.match(/pirateCanOccupyGameTile\(game, i\)/g) || []).length >= 4);
});
