'use strict';

function handSize(player, resourceKinds) {
  return (resourceKinds || []).reduce((sum, kind) => sum + Math.max(0, Number(player && player.resources && player.resources[kind] || 0)), 0);
}

function scoreRobberTile(game, aiId, tileId, dicePips, resourceKinds) {
  const tile = game && game.geom && game.geom.tiles && game.geom.tiles[tileId];
  if (!tile || tile.type === 'sea') return -Infinity;
  const pips = Math.max(0, Number(dicePips && dicePips[tile.number] || 0));
  let score = pips * 0.15;
  const seen = new Set();
  for (let nodeId = 0; nodeId < (game.geom.nodes || []).length; nodeId++) {
    if (!(game.geom.nodeAdjTiles && game.geom.nodeAdjTiles[nodeId] || []).includes(tileId)) continue;
    const building = game.geom.nodes[nodeId] && game.geom.nodes[nodeId].building;
    if (!building || !building.owner) continue;
    const owner = (game.players || []).find((player) => player && player.id === building.owner);
    if (!owner || owner.departed) continue;
    const production = pips * (building.type === 'city' ? 2 : 1);
    if (owner.id === aiId) score -= production * 2.2;
    else {
      score += production * (1.25 + Math.max(0, Number(owner.vp || 0)) * 0.05);
      if (!seen.has(owner.id)) score += Math.min(3, handSize(owner, resourceKinds) * 0.25);
    }
    seen.add(owner.id);
  }
  if (tile.type === 'desert') score -= 2;
  return score;
}

function scorePirateTile(game, aiId, tileId, resourceKinds) {
  const tile = game && game.geom && game.geom.tiles && game.geom.tiles[tileId];
  if (!tile || tile.type !== 'sea') return -Infinity;
  let score = 0;
  const seen = new Set();
  for (const edge of (game.geom.edges || [])) {
    if (!edge || !edge.shipOwner || !(game.geom.edgeAdjTiles && game.geom.edgeAdjTiles[edge.id] || []).includes(tileId)) continue;
    const owner = (game.players || []).find((player) => player && player.id === edge.shipOwner);
    if (!owner || owner.departed) continue;
    if (owner.id === aiId) score -= 5;
    else {
      score += 4 + Math.max(0, Number(owner.vp || 0)) * 0.35;
      if (!seen.has(owner.id)) score += Math.min(4, handSize(owner, resourceKinds) * 0.3);
    }
    seen.add(owner.id);
  }
  return score;
}

function bestScoredTarget(ids, scorer) {
  let bestId = null;
  let bestScore = -Infinity;
  for (const id of (ids || [])) {
    const score = Number(scorer(id));
    if (score > bestScore) { bestId = id; bestScore = score; }
  }
  return { id: bestId, score: bestScore };
}

function richestVictim(game, victimIds, resourceKinds) {
  let bestId = null;
  let bestScore = -Infinity;
  for (const id of (victimIds || [])) {
    const player = (game.players || []).find((candidate) => candidate && candidate.id === id);
    if (!player || player.departed) continue;
    const score = handSize(player, resourceKinds) + Math.max(0, Number(player.vp || 0)) * 0.2;
    if (score > bestScore) { bestId = id; bestScore = score; }
  }
  return bestId;
}

module.exports = { bestScoredTarget, richestVictim, scorePirateTile, scoreRobberTile };
