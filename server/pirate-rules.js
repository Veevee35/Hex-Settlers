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

function placeRandomPirate(tiles, opts = null, random = Math.random) {
  const allTiles = Array.isArray(tiles) ? tiles : [];
  for (const tile of allTiles) {
    if (tile) tile.pirate = false;
  }

  const candidateIds = startingPirateTileIds(allTiles, opts);
  if (!candidateIds.length) return null;

  const value = Number(random());
  const normalized = Number.isFinite(value) ? Math.max(0, Math.min(0.9999999999999999, value)) : 0;
  const selectedId = candidateIds[Math.floor(normalized * candidateIds.length)];
  const selectedTile = allTiles.find((tile) => tile && tile.id === selectedId);
  if (!selectedTile) return null;
  selectedTile.pirate = true;
  return selectedId;
}

module.exports = { isFogIslandRules, isUnrevealedFogTile, pirateCanOccupyTile, placeRandomPirate, startingPirateTileIds };
