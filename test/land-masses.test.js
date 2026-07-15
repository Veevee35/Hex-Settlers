'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { computeLandIslands, islandIdForNode, playerHasBuildingOnIsland } = require('../server/land-masses');

function desertBridgeGeometry() {
  return {
    tiles: [
      { id: 0, type: 'hills' },
      { id: 1, type: 'desert' },
      { id: 2, type: 'forest' },
    ],
    tileNeighbors: [[1], [0, 2], [1]],
    nodeAdjTiles: [[0], [2]],
    nodes: [
      { id: 0, building: { owner: 'player-1', type: 'settlement' } },
      { id: 1, building: null },
    ],
  };
}

test('desert tiles split Cartographer exploration land masses', () => {
  const geom = desertBridgeGeometry();
  const tileToIsland = computeLandIslands(geom, { desertSeparates: true });
  assert.deepEqual(tileToIsland, [0, -1, 1]);

  const farSideIsland = islandIdForNode(geom, 1, tileToIsland);
  assert.equal(farSideIsland, 1);
  assert.equal(playerHasBuildingOnIsland({ geom }, 'player-1', farSideIsland, tileToIsland), false);
});

test('desert remains part of a land mass in scenarios without the special exploration rule', () => {
  const geom = desertBridgeGeometry();
  const tileToIsland = computeLandIslands(geom);
  assert.deepEqual(tileToIsland, [0, 0, 0]);
  assert.equal(playerHasBuildingOnIsland({ geom }, 'player-1', 0, tileToIsland), true);
});
