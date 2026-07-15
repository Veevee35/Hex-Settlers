'use strict';

function isUnrevealedFogTile(tile) {
  return !!(tile && tile.fog && !tile.revealed);
}

function isFogIslandRules(rules) {
  if (String(rules?.mapMode || 'classic').toLowerCase() !== 'seafarers') return false;
  const scenario = String(rules?.seafarersScenario || '').toLowerCase().replace(/-/g, '_');
  return scenario === 'fog_island' || scenario === 'fog_island_56';
}

function pirateCanOccupyTile(rules, tile) {
  if (!tile || tile.type !== 'sea') return false;
  return !(isFogIslandRules(rules) && isUnrevealedFogTile(tile));
}

function startingPirateTileIds(tiles, opts = null) {
  const excludeUnrevealedFog = !!opts?.excludeUnrevealedFog;
  const out = [];
  for (const tile of (tiles || [])) {
    if (!tile || tile.type !== 'sea') continue;
    if (excludeUnrevealedFog && isUnrevealedFogTile(tile)) continue;
    out.push(tile.id);
  }
  return out;
}

module.exports = { isFogIslandRules, isUnrevealedFogTile, pirateCanOccupyTile, startingPirateTileIds };
