'use strict';

const OUTER_BOUNDARY_SHIP_SCENARIOS = new Set([
  'cartographer_4_manual',
  'cartographer_4_random',
  'cartographer_4',
  'cartographer_56_manual',
  'cartographer_56_random',
  'cartographer_56',
]);

function rulesTreatOuterBoundaryAsSea(rules) {
  if (String(rules?.mapMode || 'classic').toLowerCase() !== 'seafarers') return false;
  const scenario = String(rules?.seafarersScenario || '').toLowerCase().replace(/-/g, '_');
  return OUTER_BOUNDARY_SHIP_SCENARIOS.has(scenario);
}


function shipMoveOpportunityKey(state, playerId = state?.currentPlayerId) {
  const turnNumber = Math.max(0, Math.floor(Number(state?.turnNumber || 0)));
  const ownerId = String(playerId || '');
  const pairedStage = state?.paired?.enabled ? String(state.paired.stage || '') : 'solo';
  return `${turnNumber}:${ownerId}:${pairedStage}`;
}

function markShipPlacedThisOpportunity(state, edgeId, playerId) {
  if (!state || edgeId == null || !playerId) return null;
  if (!state.shipPlacedOpportunityByEdge || typeof state.shipPlacedOpportunityByEdge !== 'object') {
    state.shipPlacedOpportunityByEdge = {};
  }
  const marker = {
    ownerId: String(playerId),
    opportunityKey: shipMoveOpportunityKey(state, playerId),
  };
  state.shipPlacedOpportunityByEdge[String(edgeId)] = marker;
  return marker;
}

function shipWasPlacedThisOpportunity(state, edgeId, playerId) {
  if (!state || edgeId == null || !playerId) return false;
  const marker = state.shipPlacedOpportunityByEdge?.[String(edgeId)];
  if (!marker || String(marker.ownerId || '') !== String(playerId)) return false;
  return String(marker.opportunityKey || '') === shipMoveOpportunityKey(state, playerId);
}

function clearShipPlacementMarker(state, edgeId) {
  if (!state?.shipPlacedOpportunityByEdge || edgeId == null) return;
  delete state.shipPlacedOpportunityByEdge[String(edgeId)];
}

function edgeTouchesSeaForShip(state, edgeId, visibleAdjacentTileIds = null) {
  const rawAdjacentTileIds = Array.isArray(state?.geom?.edgeAdjTiles?.[edgeId])
    ? state.geom.edgeAdjTiles[edgeId]
    : [];
  const adjacentTileIds = Array.isArray(visibleAdjacentTileIds)
    ? visibleAdjacentTileIds
    : rawAdjacentTileIds;
  if (!adjacentTileIds.length) return false;

  const tileIsSea = (tileId) => String(state?.geom?.tiles?.[tileId]?.type || '').toLowerCase() === 'sea';
  if (adjacentTileIds.some(tileIsSea)) return true;

  // A trimmed outer sea tile still makes its remaining land edge a coastline.
  if (rawAdjacentTileIds.some((tileId) => !adjacentTileIds.includes(tileId) && tileIsSea(tileId))) return true;

  // Cartographer boards may place land directly on the geometry boundary. The missing
  // second tile represents open ocean, so that perimeter edge is a valid ship edge.
  return rawAdjacentTileIds.length === 1 && rulesTreatOuterBoundaryAsSea(state?.rules);
}

module.exports = {
  OUTER_BOUNDARY_SHIP_SCENARIOS,
  clearShipPlacementMarker,
  edgeTouchesSeaForShip,
  markShipPlacedThisOpportunity,
  rulesTreatOuterBoundaryAsSea,
  shipMoveOpportunityKey,
  shipWasPlacedThisOpportunity,
};
