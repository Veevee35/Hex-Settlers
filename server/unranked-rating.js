'use strict';

// Global Unranked Rating: a cumulative signed score, independent of ranked Elo.
// A win is by far the largest single award. A poor loss can cost points, even
// when the account is already below zero. Only completed unranked games count.
const { playerMetrics } = require('./rating-policy');
const UNRANKED_RATING_VERSION = 1;
const INITIAL_UNRANKED_RATING = 0;
const WEIGHTS = Object.freeze({
  victoryPoints: 6,
  vpLead: 2,
  roads: 1,
  ships: 1,
  shipMoves: 0.25,
  settlements: 3,
  cities: 5,
  explorationVP: 4,
  knights: 1,
  devBought: 0.75,
  devPlayed: 1.5,
  bankTrades: 0.25,
  playerTrades: 0.75,
  robberMoves: 0.3,
  pirateMoves: 0.3,
  turnsPlayed: -0.25,
  resourcesGained: 0.05,
  resourcesLost: -0.04,
  robberSteals: 2,
  pirateSteals: 2,
  stolenFrom: -1.5,
  discardEvents: -2,
  resourcesProduced: 0.12,
  goldProduced: 0.1,
  resourcesSpent: 0.1,
  blockedResources: -0.3,
  longestRoad: 10,
  largestArmy: 10,
  devMonopoly: 1,
  devInvention: 1,
  devRoadBuilding: 1,
});
// Prevent farming an arbitrary number of moves/trades/resources in a long game.
const CAPS = Object.freeze({
  victoryPoints: 20, vpLead: 15, roads: 20, ships: 20, shipMoves: 20,
  settlements: 10, cities: 10, explorationVP: 10, knights: 20,
  devBought: 20, devPlayed: 20, bankTrades: 25, playerTrades: 25,
  robberMoves: 30, pirateMoves: 30, turnsPlayed: 60,
  resourcesGained: 120, resourcesLost: 120,
  robberSteals: 20, pirateSteals: 20, stolenFrom: 20, discardEvents: 20,
  resourcesProduced: 100, goldProduced: 30, resourcesSpent: 100,
  blockedResources: 30, longestRoad: 1, largestArmy: 1,
  devMonopoly: 10, devInvention: 10, devRoadBuilding: 10,
});
function unrankedRating(value) {
  if (value === null || value === undefined || value === '') return INITIAL_UNRANKED_RATING;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : INITIAL_UNRANKED_RATING;
}
function unrankedScoreForPlayer(entry, player) {
  if (!entry || !player) return null;
  const winnerId = String(entry.winnerId || '');
  if (!winnerId || !Array.isArray(entry.players) || !entry.players.some(p => String(p?.id) === winnerId)) return null;
  const metrics = playerMetrics(entry, player);
  const won = String(player.id) === winnerId;
  const parts = { participation: -45, victory: won ? 120 : 0 };
  for (const [key, weight] of Object.entries(WEIGHTS)) {
    const value = Number(metrics[key]) || 0;
    const cap = CAPS[key];
    parts[key] = Math.round(weight * Math.max(-cap, Math.min(cap, value)) * 100) / 100;
  }
  return { delta: Math.round(Object.values(parts).reduce((sum, val) => sum + val, 0)), won, parts };
}
function calculateUnrankedChanges(entry, ratings = {}, eligibleIds = null) {
  if (!entry || entry.ranked === true || !Array.isArray(entry.players)) return {};
  if (!entry.snapshot || entry.snapshot.phase !== 'game-over') return {};
  const results = {};
  const eligible = eligibleIds == null ? null : new Set(Array.from(eligibleIds, String));
  for (const player of entry.players) {
    if (!player || !player.id || player.isAI || player.ai) continue;
    const id = String(player.id);
    if (eligible && !eligible.has(id)) continue;
    const scored = unrankedScoreForPlayer(entry, player);
    if (!scored) continue;
    const before = unrankedRating(ratings[id]);
    const after = before + scored.delta; // Negative totals are intentional.
    results[id] = { before, delta: scored.delta, after };
  }
  return results;
}
function replayUnrankedHistory(games, userIds = []) {
  const ratings = Object.fromEntries(userIds.map(id => [String(id), INITIAL_UNRANKED_RATING]));
  const eligible = new Set(userIds.map(String));
  const changesByGame = {};
  let applied = 0;
  const unranked = (Array.isArray(games) ? games : []).filter(g => g && g.ranked !== true)
    .sort((a, b) => Number(a.endedAt || 0) - Number(b.endedAt || 0) || String(a.id).localeCompare(String(b.id)));
  for (const game of unranked) {
    const changes = calculateUnrankedChanges(game, ratings, eligible);
    if (!Object.keys(changes).length) continue;
    if (game.id) changesByGame[game.id] = changes;
    for (const [id, change] of Object.entries(changes)) ratings[id] = change.after;
    applied++;
  }
  return { ratings, changesByGame, applied };
}
module.exports = {
  UNRANKED_RATING_VERSION, INITIAL_UNRANKED_RATING, WEIGHTS,
  unrankedRating, unrankedScoreForPlayer, calculateUnrankedChanges, replayUnrankedHistory,
};
