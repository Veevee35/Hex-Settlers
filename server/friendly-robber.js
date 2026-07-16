'use strict';

const FRIENDLY_ROBBER_MAX_VP = 2;

function friendlyRobberEnabled(rules) {
  return !!(rules && rules.friendlyRobber === true);
}

function friendlyRobberProtectedPlayerIds(game, tileId) {
  if (!friendlyRobberEnabled(game && game.rules)) return [];
  const tile = game && game.geom && game.geom.tiles && game.geom.tiles[tileId];
  if (!tile) return [];

  const protectedIds = new Set();
  for (const nodeId of (Array.isArray(tile.cornerNodeIds) ? tile.cornerNodeIds : [])) {
    const building = game.geom.nodes && game.geom.nodes[nodeId] && game.geom.nodes[nodeId].building;
    if (!building || !building.owner) continue;
    const player = (game.players || []).find((candidate) => candidate && candidate.id === building.owner);
    if (!player || player.departed) continue;
    const vp = Math.max(0, Number(player.vp || 0));
    if (vp <= FRIENDLY_ROBBER_MAX_VP) protectedIds.add(player.id);
  }
  return Array.from(protectedIds);
}

function friendlyPirateProtectedPlayerIds(game, tileId) {
  if (!friendlyRobberEnabled(game && game.rules)) return [];
  const tile = game && game.geom && game.geom.tiles && game.geom.tiles[tileId];
  if (!tile || tile.type !== 'sea') return [];

  const protectedIds = new Set();
  for (const edge of (game.geom.edges || [])) {
    if (!edge || !edge.shipOwner) continue;
    const adjacentTileIds = game.geom.edgeAdjTiles && game.geom.edgeAdjTiles[edge.id];
    if (!Array.isArray(adjacentTileIds) || !adjacentTileIds.includes(tileId)) continue;
    const player = (game.players || []).find((candidate) => candidate && candidate.id === edge.shipOwner);
    if (!player || player.departed) continue;
    const vp = Math.max(0, Number(player.vp || 0));
    if (vp <= FRIENDLY_ROBBER_MAX_VP) protectedIds.add(player.id);
  }
  return Array.from(protectedIds);
}

function robberCanOccupyTile(game, tileId) {
  const tile = game && game.geom && game.geom.tiles && game.geom.tiles[tileId];
  if (!tile || tile.type === 'sea') return false;
  return friendlyRobberProtectedPlayerIds(game, tileId).length === 0;
}

function friendlyPirateCanOccupyTile(game, tileId) {
  const tile = game && game.geom && game.geom.tiles && game.geom.tiles[tileId];
  if (!tile || tile.type !== 'sea') return false;
  return friendlyPirateProtectedPlayerIds(game, tileId).length === 0;
}

module.exports = {
  FRIENDLY_ROBBER_MAX_VP,
  friendlyPirateCanOccupyTile,
  friendlyPirateProtectedPlayerIds,
  friendlyRobberEnabled,
  friendlyRobberProtectedPlayerIds,
  robberCanOccupyTile,
};
