'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  consumeRoadBuildingPlacement,
  hasRoadBuildingPlacement,
  roadBuildingPlacementsRemaining,
} = require('../server/road-building');

test('Road Building uses one shared two-placement allowance for a road and a ship', () => {
  const game = { special: { kind: 'free_routes', forPlayerId: 'p1', remaining: 2 } };
  assert.equal(hasRoadBuildingPlacement(game, 'p1'), true);

  const road = consumeRoadBuildingPlacement(game, 'p1');
  assert.deepEqual(road, { used: true, remaining: 1 });
  assert.equal(roadBuildingPlacementsRemaining(game, 'p1'), 1);

  const ship = consumeRoadBuildingPlacement(game, 'p1');
  assert.deepEqual(ship, { used: true, remaining: 0 });
  assert.equal(game.special, null);
});

test('Road Building allowance is private to its player and restores legacy active games', () => {
  const game = { special: { kind: 'free_roads', forPlayerId: 'p1', remaining: 2 } };
  assert.equal(hasRoadBuildingPlacement(game, 'p2'), false);
  assert.deepEqual(consumeRoadBuildingPlacement(game, 'p2'), { used: false, remaining: 0 });
  assert.equal(game.special.remaining, 2);
  assert.equal(hasRoadBuildingPlacement(game, 'p1'), true);
});

test('server and client apply the shared allowance to ships, roads, and pre-roll placement', () => {
  const root = path.resolve(__dirname, '..');
  const serverJs = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  const appJs = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');

  assert.match(serverJs, /game\.special = \{ kind: 'free_routes', forPlayerId: playerId, remaining: 2 \}/);
  assert.match(serverJs, /if \(!freeRoute && !canAfford\(p\.resources, BUILD_COSTS\.ship\)\)/);
  assert.match(serverJs, /consumeRoadBuildingPlacement\(game, playerId\)/);
  assert.match(serverJs, /roads, ships, or one of each for free/);
  assert.match(appJs, /phase === 'main-await-roll' && roadBuildingPlacementActiveClient\(\)/);
  assert.match(appJs, /choose a legal road or ship edge/);
});
