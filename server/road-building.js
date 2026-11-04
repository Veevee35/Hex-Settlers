'use strict';

const ROAD_BUILDING_SPECIAL_KINDS = new Set(['free_routes', 'free_roads']);

function roadBuildingPlacementsRemaining(game, playerId) {
  const special = game && game.special;
  if (!special || !ROAD_BUILDING_SPECIAL_KINDS.has(String(special.kind || ''))) return 0;
  if (special.forPlayerId !== playerId) return 0;
  return Math.max(0, Math.floor(Number(special.remaining) || 0));
}

function hasRoadBuildingPlacement(game, playerId) {
  return roadBuildingPlacementsRemaining(game, playerId) > 0;
}

function consumeRoadBuildingPlacement(game, playerId) {
  if (!hasRoadBuildingPlacement(game, playerId)) return { used: false, remaining: 0 };
  const remaining = Math.max(0, roadBuildingPlacementsRemaining(game, playerId) - 1);
  game.special.remaining = remaining;
  if (remaining === 0) game.special = null;
  return { used: true, remaining };
}

module.exports = {
  consumeRoadBuildingPlacement,
  hasRoadBuildingPlacement,
  roadBuildingPlacementsRemaining,
};
