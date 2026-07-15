'use strict';

const VISIBLE_OUTER_SEA_SCENARIOS = new Set([
  'test_builder',
  'test_builder_56',
  'cartographer_4_manual', 'cartographer_4_random', 'cartographer_4',
  'cartographer_56_manual', 'cartographer_56_random', 'cartographer_56',
]);

function isUnrevealedFogTile(tile) {
  return !!(tile && tile.fog && !tile.revealed);
}

function isFogIslandRules(rules) {
  if (String(rules?.mapMode || 'classic').toLowerCase() !== 'seafarers') return false;
  const scenario = String(rules?.seafarersScenario || '').toLowerCase().replace(/-/g, '_');
  return scenario === 'fog_island' || scenario === 'fog_island_56';
}

function rulesHideOuterSeaBorder(rules) {
  if (String(rules?.mapMode || 'classic').toLowerCase() !== 'seafarers') return false;
  const scenario = String(rules?.seafarersScenario || 'four_islands').toLowerCase().replace(/-/g, '_');
  return !VISIBLE_OUTER_SEA_SCENARIOS.has(scenario);
}

function pirateCanOccupyTile(rules, tile, geom = null) {
  if (!tile || tile.type !== 'sea') return false;
  if (isFogIslandRules(rules) && isUnrevealedFogTile(tile)) return false;
  if (rulesHideOuterSeaBorder(rules)) {
    const neighbors = geom?.tileNeighbors?.[tile.id];
    if (Array.isArray(neighbors) && neighbors.length < 6) return false;
  }
  return true;
}

function startingPirateTileIds(tiles, opts = null) {
  const excludeUnrevealedFog = !!opts?.excludeUnrevealedFog;
  const out = [];
  for (const tile of (tiles || [])) {
    if (!tile || tile.type !== 'sea') continue;
    if (excludeUnrevealedFog && isUnrevealedFogTile(tile)) continue;
    if (opts?.rules && !pirateCanOccupyTile(opts.rules, tile, opts.geom)) continue;
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

module.exports = { isFogIslandRules, isUnrevealedFogTile, pirateCanOccupyTile, placeRandomPirate, rulesHideOuterSeaBorder, startingPirateTileIds };
