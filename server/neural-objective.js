'use strict';

const TRAINING_OBJECTIVE = 'fast-victory-opponent-denial-v2';
const FEATURE_VERSION = 4;
const FEATURE_NAMES = Object.freeze([
  'vp_progress', 'gold_income', 'victory_pace', 'late_game_vp', 'hand_size', 'city_readiness',
  'settlement_readiness', 'dev_readiness', 'city_upgrades', 'network_size', 'unplayed_dev', 'bias',
  'opponent_max_progress', 'opponent_mean_progress', 'vp_lead', 'opponent_income', 'opponent_blocked_income',
]);

function upgradeNeuralModel(model) {
  // Preserve learned inputs exactly; new inputs start neutral until trained.
  const oldSize = model.params.w1[0].length;
  if (oldSize !== 12 && oldSize !== FEATURE_NAMES.length) throw new Error(`Unsupported neural input size: ${oldSize}`);
  for (const row of model.params.w1) {
    if (row.length !== oldSize) throw new Error('Inconsistent neural input dimensions');
    while (row.length < FEATURE_NAMES.length) row.push(0);
  }
  model.meta = {
    ...(model.meta || {}), inputSize: FEATURE_NAMES.length, hiddenSize: model.params.w1.length,
    featureVersion: FEATURE_VERSION, featureNames: [...FEATURE_NAMES], trainingObjective: TRAINING_OBJECTIVE,
  };
  return model;
}

function opponentFeatures(state, pid) {
  const target = Math.max(3, Number(state?.rules?.victoryPointsToWin || 10));
  const opponents = (state.players || []).filter(p => p && p.id !== pid && !p.departed);
  const own = (state.players || []).find(p => p && p.id === pid);
  const progresses = opponents.map(p => Math.max(0, Number(p.vp || 0)) / target);
  const highest = Math.max(0, ...progresses);
  const owners = new Set(opponents.map(p => p.id));
  const incomes = new Map(opponents.map(p => [p.id, 0]));
  let blocked = 0;
  const pips = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1 };
  for (const [index, node] of (state.geom?.nodes || []).entries()) {
    const building = node?.building;
    if (!building || !owners.has(building.owner)) continue;
    for (const tileId of (state.geom?.nodeAdjTiles?.[node.id ?? index] || [])) {
      const tile = state.geom?.tiles?.[tileId];
      if (!tile || (tile.fog && !tile.revealed) || ['sea', 'desert', 'unexplored', '?'].includes(tile.type)) continue;
      const income = (pips[tile.number] || 0) * (building.type === 'city' ? 2 : 1);
      if (tile.robber) blocked += income;
      else incomes.set(building.owner, incomes.get(building.owner) + income);
    }
  }
  return [
    Math.min(1, highest),
    Math.min(1, progresses.reduce((sum, n) => sum + n, 0) / Math.max(1, opponents.length)),
    Math.max(-1, Math.min(1, Number(own?.vp || 0) / target - highest)),
    Math.min(1, Math.max(0, ...incomes.values()) / 60),
    Math.min(1, blocked / 30),
  ];
}

function victoryTrainingTarget({ won, totalTurns, expectedTurns, remainingTurns = 0, opponentProgress = 0, lead = 0, terminal = false }) {
  const discount = Math.exp(-Math.max(0, remainingTurns) / expectedTurns);
  const winnerReward = 0.3 + 0.58 * Math.exp(-totalTurns / (expectedTurns * 1.5))
    + 0.1 * (1 - Math.max(0, Math.min(1, opponentProgress)));
  // A delayed loss never becomes a win. Denial is a small bonus subordinate to
  // actually winning, so merely holding up a game cannot earn a positive result.
  const outcome = won ? winnerReward : -0.9;
  const shaping = terminal ? 0 : 0.06 * Math.max(-1, Math.min(1, lead)) - 0.04 * opponentProgress ** 4;
  return Math.max(-0.98, Math.min(0.98, outcome * (terminal ? 1 : 0.55 + 0.45 * discount) + shaping));
}

module.exports = { FEATURE_NAMES, FEATURE_VERSION, TRAINING_OBJECTIVE, opponentFeatures, upgradeNeuralModel, victoryTrainingTarget };
