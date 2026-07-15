'use strict';

function returnPlayerResourcesToBank(game, player, resourceKinds, receiveResource) {
  const returned = Object.create(null);
  if (!game || !player || !player.resources) return returned;
  for (const kind of (resourceKinds || [])) {
    const amount = Math.max(0, Math.floor(Number(player.resources[kind] || 0)));
    player.resources[kind] = 0;
    if (!amount) continue;
    returned[kind] = amount;
    receiveResource(game, kind, amount);
  }
  return returned;
}

function resolveDepartedTitleChallenge({ players, ownerId, benchmark, minimum, scoreForPlayer }) {
  const list = Array.isArray(players) ? players : [];
  const owner = list.find((player) => player && player.id === ownerId);
  if (!owner || !owner.departed) return null;

  const threshold = Math.max(0, Math.floor(Number(benchmark || 0)));
  let best = 0;
  let candidates = [];
  for (const player of list) {
    if (!player || player.departed || !player.id) continue;
    const score = Math.max(0, Math.floor(Number(scoreForPlayer(player) || 0)));
    if (score > best) {
      best = score;
      candidates = [player.id];
    } else if (score === best && score > 0) {
      candidates.push(player.id);
    }
  }

  if (best >= minimum && best > threshold && candidates.length === 1) {
    return { playerId: candidates[0], score: best, surpassed: true };
  }
  return { playerId: ownerId, score: threshold, surpassed: false };
}

module.exports = { resolveDepartedTitleChallenge, returnPlayerResourcesToBank };
