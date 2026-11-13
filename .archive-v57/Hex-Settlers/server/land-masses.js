'use strict';

function computeLandIslands(geom, opts = null) {
  const tiles = geom?.tiles || [];
  const tileToIsland = new Array(tiles.length).fill(-1);
  const neighbors = geom?.tileNeighbors || [];
  const desertSeparates = !!opts?.desertSeparates;
  const isLandMassTile = (tile) => !!tile && tile.type !== 'sea' && !(desertSeparates && tile.type === 'desert');

  let islandId = 0;
  for (let tileId = 0; tileId < tiles.length; tileId++) {
    if (!isLandMassTile(tiles[tileId]) || tileToIsland[tileId] !== -1) continue;

    const stack = [tileId];
    tileToIsland[tileId] = islandId;
    while (stack.length) {
      const current = stack.pop();
      for (const neighborId of (neighbors[current] || [])) {
        if (neighborId == null || !isLandMassTile(tiles[neighborId]) || tileToIsland[neighborId] !== -1) continue;
        tileToIsland[neighborId] = islandId;
        stack.push(neighborId);
      }
    }
    islandId++;
  }

  return tileToIsland;
}

function islandIdForNode(geom, nodeId, tileToIsland) {
  const adjacentTileIds = geom?.nodeAdjTiles?.[nodeId] || [];
  for (const tileId of adjacentTileIds) {
    const islandId = tileToIsland?.[tileId];
    if (islandId != null && islandId !== -1) return islandId;
  }
  return null;
}

function playerHasBuildingOnIsland(game, playerId, islandId, tileToIsland) {
  if (islandId == null) return false;
  for (const node of (game?.geom?.nodes || [])) {
    if (!node?.building || node.building.owner !== playerId) continue;
    if (islandIdForNode(game.geom, node.id, tileToIsland) === islandId) return true;
  }
  return false;
}

module.exports = { computeLandIslands, islandIdForNode, playerHasBuildingOnIsland };
