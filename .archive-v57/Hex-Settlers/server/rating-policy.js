'use strict';

// Only archived, completed, explicitly ranked matches participate in replays.
// Zero bonus weights preserve the v13 multiplayer Elo behavior.
const { rankedRating, calculateRankedChanges, INITIAL_RANKED_RATING } = require('./ranked-rating');

const METRICS = Object.freeze([
  ['victoryPoints', 'Victory points'],
  ['vpLead', 'VP lead over other players'],
  ['roads', 'Roads built'],
  ['ships', 'Ships built'],
  ['shipMoves', 'Ships moved'],
  ['settlements', 'Settlements built'],
  ['cities', 'Cities upgraded'],
  ['explorationVP', 'Exploration victory points'],
  ['knights', 'Knights played'],
  ['devBought', 'Development cards bought'],
  ['devPlayed', 'Development cards played'],
  ['bankTrades', 'Bank trades'],
  ['playerTrades', 'Player trades'],
  ['robberMoves', 'Robber moves'],
  ['pirateMoves', 'Pirate moves'],
  ['robberSteals', 'Robber steals'],
  ['pirateSteals', 'Pirate steals'],
  ['stolenFrom', 'Times stolen from'],
  ['discardEvents', 'Discard events'],
  ['resourcesProduced', 'Resources produced'],
  ['goldProduced', 'Gold field resources'],
  ['resourcesSpent', 'Resources spent on builds'],
  ['blockedResources', 'Production blocked by robber'],
  ['turnsPlayed', 'Turns taken'],
  ['longestRoad', 'Held longest road at finish'],
  ['largestArmy', 'Held largest army at finish'],
  ['rolls', 'Dice rolls taken'],
  ['sevensRolled', 'Sevens rolled'],
  ['resourcesGained', 'All resources acquired'],
  ['resourcesLost', 'All resources lost'],
  ['brickProduced', 'Brick produced'],
  ['lumberProduced', 'Lumber produced'],
  ['woolProduced', 'Wool produced'],
  ['grainProduced', 'Grain produced'],
  ['oreProduced', 'Ore produced'],
  ['devMonopoly', 'Monopoly cards played'],
  ['devInvention', 'Invention cards played'],
  ['devRoadBuilding', 'Road Building cards played'],
]);
const DEFAULT_RATING_POLICY = Object.freeze({
  kFactor: 32,
  eloScale: 400,
  maxPerformanceAdjustment: 64,
  winBonus: 0,
  lossBonus: 0,
  weights: Object.freeze(Object.fromEntries(METRICS.map(([key]) => [key, 0]))),
});
const num = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const sumMap = (values) => Object.values(values && typeof values === 'object' ? values : {}).reduce((sum, n) => sum + Math.max(0, num(n)), 0);
function validatedRatingPolicy(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('A rating policy object is required.');
  const bounded = (value, min, max, key) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n < min || n > max) throw new Error(`${key} must be between ${min} and ${max}.`);
    return n;
  };
  const weights = {};
  const supplied = input.weights || {};
  for (const [key] of METRICS) weights[key] = bounded(supplied[key] ?? 0, -25, 25, key);
  return {
    kFactor: bounded(input.kFactor ?? 32, 0, 128, 'Elo K-factor'),
    eloScale: bounded(input.eloScale ?? 400, 100, 2000, 'Elo rating scale'),
    maxPerformanceAdjustment: bounded(input.maxPerformanceAdjustment ?? 64, 0, 256, 'Maximum performance adjustment'),
    winBonus: bounded(input.winBonus ?? 0, -100, 100, 'Winner bonus'),
    lossBonus: bounded(input.lossBonus ?? 0, -100, 100, 'Non-winner bonus'),
    weights,
  };
}
function playerMetrics(entry, player) {
  const s = entry.snapshot?.stats || {};
  const id = String(player.id || '');
  const builds = s.builds?.byPlayer?.[id] || {};
  const actions = s.actions?.byPlayer?.[id] || {};
  const trades = s.trades?.byPlayer?.[id] || {};
  const dev = s.dev?.byPlayer?.[id] || {};
  const resource = s.resources?.byPlayer?.[id] || {};
  const otherVP = Math.max(0, ...(entry.players || []).filter(p => String(p.id) !== id).map(p => num(p.vp)));
  return {
    victoryPoints: num(player.vp), vpLead: num(player.vp) - otherVP,
    roads: num(builds.road), ships: num(builds.ship), shipMoves: num(builds.ship_move),
    settlements: num(builds.settlement), cities: num(builds.city),
    explorationVP: num(player.newIslandVP) + num(player.ttdFarSideVP),
    knights: num(dev.playedByType?.knight ?? player.army),
    devBought: num(dev.bought), devPlayed: num(dev.played),
    bankTrades: num(trades.bank), playerTrades: num(trades.player),
    robberMoves: num(actions.robberMoves), pirateMoves: num(actions.pirateMoves),
    robberSteals: num(actions.robberSteals), pirateSteals: num(actions.pirateSteals),
    stolenFrom: num(s.thieves?.robber?.stolenFromByPlayer?.[id]) + num(s.thieves?.pirate?.stolenFromByPlayer?.[id]),
    discardEvents: num(actions.discards),
    resourcesProduced: sumMap(resource.gainedBySource?.production),
    goldProduced: sumMap(resource.gainedBySource?.gold_production),
    resourcesSpent: sumMap(resource.lostBySource?.build),
    blockedResources: sumMap(resource.lostBySource?.blocked),
    turnsPlayed: num(s.turnTimes?.byPlayer?.[id]?.turns),
    longestRoad: entry.snapshot?.longestRoad?.playerId === id ? 1 : 0,
    largestArmy: entry.snapshot?.largestArmy?.playerId === id ? 1 : 0,
    rolls: sumMap(s.rolls?.byPlayer?.[id]),
    sevensRolled: num(s.rolls?.byPlayer?.[id]?.[7]),
    resourcesGained: sumMap(resource.gained),
    resourcesLost: sumMap(resource.lost),
    brickProduced: num(resource.gainedBySource?.production?.brick),
    lumberProduced: num(resource.gainedBySource?.production?.lumber),
    woolProduced: num(resource.gainedBySource?.production?.wool),
    grainProduced: num(resource.gainedBySource?.production?.grain),
    oreProduced: num(resource.gainedBySource?.production?.ore),
    devMonopoly: num(dev.playedByType?.monopoly),
    devInvention: num(dev.playedByType?.invention),
    devRoadBuilding: num(dev.playedByType?.road_building ?? dev.playedByType?.roadBuilding),
  };
}
function computePolicyRatingChanges(entry, ratings, settings = DEFAULT_RATING_POLICY) {
  const policy = validatedRatingPolicy(settings);
  if (entry?.ranked !== true || !Array.isArray(entry.players)) return {};
  const participants = entry.players.filter(p => p && p.id && !p.isAI).map(p => ({ id: String(p.id), rating: rankedRating(ratings[String(p.id)]) }));
  if (participants.length < 2 || !participants.some(p => p.id === String(entry.winnerId))) return {};
  const base = calculateRankedChanges(participants, entry.winnerId, { kFactor: policy.kFactor, eloScale: policy.eloScale });
  const results = {};
  for (const p of participants) {
    const data = (entry.snapshot?.players || entry.players).find(x => String(x?.id) === p.id) || entry.players.find(x => String(x.id) === p.id);
    const metrics = playerMetrics(entry, data);
    let performance = p.id === String(entry.winnerId) ? policy.winBonus : policy.lossBonus;
    for (const [key] of METRICS) performance += policy.weights[key] * metrics[key];
    performance = Math.max(-policy.maxPerformanceAdjustment, Math.min(policy.maxPerformanceAdjustment, performance));
    const before = rankedRating(ratings[p.id]);
    const after = Math.max(0, Math.round(before + base[p.id].delta + performance));
    results[p.id] = { before, delta: after - before, after };
  }
  return results;
}
function replayRankedHistory(games, settings, userIds = []) {
  const policy = validatedRatingPolicy(settings);
  const ratings = Object.fromEntries(userIds.map(id => [String(id), INITIAL_RANKED_RATING]));
  const changesByGame = {};
  let applied = 0, skipped = 0;
  const ranked = (Array.isArray(games) ? games : []).filter(g => g?.ranked === true)
    .sort((a, b) => num(a.endedAt) - num(b.endedAt) || String(a.id).localeCompare(String(b.id)));
  for (const game of ranked) {
    if (!Array.isArray(game.players) || !game.winnerId || !game.id || !game.snapshot || game.snapshot.phase !== 'game-over') { skipped++; continue; }
    const changes = computePolicyRatingChanges(game, ratings, policy);
    if (!Object.keys(changes).length) { skipped++; continue; }
    changesByGame[game.id] = changes;
    for (const [id, result] of Object.entries(changes)) ratings[id] = result.after;
    applied++;
  }
  return { ratings, changesByGame, applied, skipped, rankedCount: ranked.length };
}
module.exports = {
  METRICS, DEFAULT_RATING_POLICY, validatedRatingPolicy, playerMetrics,
  computePolicyRatingChanges, replayRankedHistory,
};
