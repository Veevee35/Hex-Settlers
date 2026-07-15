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
  edgeTouchesSeaForShip,
  rulesTreatOuterBoundaryAsSea,
};
