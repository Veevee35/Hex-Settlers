'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { bestScoredTarget, richestVictim, scorePirateTile, scoreRobberTile } = require('../server/ai-tactics');

const kinds = ['brick', 'lumber', 'wool', 'grain', 'ore'];

test('robber scoring targets productive opponents and avoids the AI', () => {
  const game = {
    players: [
      { id: 'ai', vp: 4, resources: { brick: 1 } },
      { id: 'opp', vp: 8, resources: { brick: 3, grain: 2 } },
    ],
    geom: {
      tiles: [{ id: 0, type: 'hills', number: 6 }, { id: 1, type: 'field', number: 8 }],
      nodes: [{ building: { owner: 'ai', type: 'city' } }, { building: { owner: 'opp', type: 'city' } }],
      nodeAdjTiles: [[0], [1]],
    },
  };
  const pips = { 6: 5, 8: 5 };
  assert.ok(scoreRobberTile(game, 'ai', 1, pips, kinds) > scoreRobberTile(game, 'ai', 0, pips, kinds));
  assert.deepEqual(bestScoredTarget([0, 1], (id) => scoreRobberTile(game, 'ai', id, pips, kinds)).id, 1);
});

test('pirate and victim scoring prefer opponent ships and richer hands', () => {
  const game = {
    players: [
      { id: 'ai', vp: 3, resources: {} },
      { id: 'poor', vp: 3, resources: { brick: 1 } },
      { id: 'rich', vp: 7, resources: { brick: 3, ore: 3 } },
    ],
    geom: {
      tiles: [{ id: 0, type: 'sea' }, { id: 1, type: 'sea' }],
      edges: [{ id: 0, shipOwner: 'ai' }, { id: 1, shipOwner: 'rich' }],
      edgeAdjTiles: [[0], [1]],
    },
  };
  assert.ok(scorePirateTile(game, 'ai', 1, kinds) > scorePirateTile(game, 'ai', 0, kinds));
  assert.equal(richestVictim(game, ['poor', 'rich'], kinds), 'rich');
});
