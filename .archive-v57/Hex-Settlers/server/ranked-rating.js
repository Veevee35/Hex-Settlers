'use strict';

// Separate ranked-season rating from lifetime win/loss statistics.
// A multiplayer Elo-style winner-takes-first outcome gives the winner a
// positive change and splits the offsetting losses among the other players.
const INITIAL_RANKED_RATING = 1000;
const RANKED_K_FACTOR = 32;

function rankedRating(value) {
  const n = Number(value);
  return value !== null && value !== undefined && value !== '' && Number.isFinite(n) && n >= 0
    ? Math.round(n)
    : INITIAL_RANKED_RATING;
}

function calculateRankedChanges(participants, winnerId, settings = {}) {
  const kFactor = Number.isFinite(Number(settings.kFactor)) ? Math.max(0, Number(settings.kFactor)) : RANKED_K_FACTOR;
  const eloScale = Number.isFinite(Number(settings.eloScale)) ? Math.max(100, Number(settings.eloScale)) : 400;
  const unique = new Set();
  const players = (Array.isArray(participants) ? participants : []).filter((player) => {
    const id = String(player?.id || '');
    if (!id || unique.has(id) || player.isAI) return false;
    unique.add(id);
    return true;
  });
  if (players.length < 2 || !players.some((player) => String(player.id) === String(winnerId))) return {};

  const before = players.map((player) => rankedRating(player.rating));
  const highest = Math.max(...before);
  const weights = before.map((rating) => Math.pow(10, (rating - highest) / eloScale));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const rawChanges = players.map((player, index) => kFactor * (
    (String(player.id) === String(winnerId) ? 1 : 0) - (weights[index] / total)
  ));

  // Largest-remainder rounding preserves the rating pool for multi-player games.
  const rounded = rawChanges.map(Math.floor);
  const remainder = -rounded.reduce((sum, delta) => sum + delta, 0);
  const ordering = players.map((_, index) => index).sort((left, right) =>
    ((rawChanges[right] - Math.floor(rawChanges[right])) - (rawChanges[left] - Math.floor(rawChanges[left]))) || (left - right)
  );
  for (let i = 0; i < remainder; i++) rounded[ordering[i % ordering.length]] += 1;

  const changes = {};
  for (let i = 0; i < players.length; i++) {
    const after = Math.max(0, before[i] + rounded[i]);
    changes[String(players[i].id)] = { before: before[i], delta: after - before[i], after };
  }
  return changes;
}

module.exports = { INITIAL_RANKED_RATING, rankedRating, calculateRankedChanges };
