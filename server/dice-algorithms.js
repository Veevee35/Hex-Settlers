'use strict';

const DICE_ALGORITHMS = Object.freeze({
  random: Object.freeze({
    label: 'Random',
    description: 'Independent fair six-sided dice on every roll.',
  }),
  balanced: Object.freeze({
    label: 'Balanced Bag',
    description: 'Shuffles all 36 possible dice pairs, so every 36-roll cycle has the exact 2d6 distribution.',
  }),
  probability_corrected: Object.freeze({
    label: 'Probability Corrected',
    description: 'Keeps rolls random while gently favoring totals that are behind their expected frequency.',
  }),
  streak_breaker: Object.freeze({
    label: 'Streak Breaker',
    description: 'Uses fair random dice but prevents the same total from appearing three times in a row.',
  }),
});

const ALL_DICE_PAIRS = Object.freeze(Array.from({ length: 36 }, (_, index) =>
  Object.freeze([Math.floor(index / 6) + 1, (index % 6) + 1])));

function normalizeDiceAlgorithm(value) {
  const key = String(value || 'random').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (key === 'balanced' || key === 'balanced_bag' || key === 'bag') return 'balanced';
  if (key === 'probability_corrected' || key === 'corrected' || key === 'smooth' || key === 'smoothed') {
    return 'probability_corrected';
  }
  if (key === 'streak_breaker' || key === 'streakbreaker' || key === 'anti_streak') return 'streak_breaker';
  return 'random';
}

function randomUnit(rng) {
  const raw = Number((typeof rng === 'function' ? rng : Math.random)());
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  if (raw >= 1) return 1 - Number.EPSILON;
  return raw;
}

function randomIndex(length, rng) {
  return Math.floor(randomUnit(rng) * Math.max(1, length));
}

function randomPair(rng) {
  return ALL_DICE_PAIRS[randomIndex(ALL_DICE_PAIRS.length, rng)].slice();
}

function shuffledDiceBag(rng) {
  const bag = ALL_DICE_PAIRS.map((pair) => pair.slice());
  for (let i = bag.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1, rng);
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

function validPair(pair) {
  return Array.isArray(pair) && pair.length === 2 && pair.every((die) => Number.isInteger(die) && die >= 1 && die <= 6);
}

function balancedPair(state, rng) {
  if (!Array.isArray(state.balancedBag) || !state.balancedBag.every(validPair) || state.balancedBag.length === 0) {
    state.balancedBag = shuffledDiceBag(rng);
  }
  return state.balancedBag.pop();
}

function probabilityCorrectedPair(diceStats, rng) {
  const counts = {};
  let rolls = 0;
  for (let total = 2; total <= 12; total++) {
    counts[total] = Math.max(0, Math.floor(Number(diceStats && diceStats[total]) || 0));
    rolls += counts[total];
  }

  const weights = ALL_DICE_PAIRS.map((pair) => {
    const total = pair[0] + pair[1];
    const expected = (rolls + 1) * (6 - Math.abs(7 - total)) / 36;
    const standardizedDeficit = (expected - counts[total]) / Math.sqrt(expected + 1);
    return Math.max(0.2, Math.min(3, Math.exp(standardizedDeficit * 0.45)));
  });
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = randomUnit(rng) * weightTotal;
  for (let i = 0; i < ALL_DICE_PAIRS.length; i++) {
    cursor -= weights[i];
    if (cursor < 0) return ALL_DICE_PAIRS[i].slice();
  }
  return ALL_DICE_PAIRS[ALL_DICE_PAIRS.length - 1].slice();
}

function streakBreakerPair(state, rng) {
  const recent = Array.isArray(state.recentTotals) ? state.recentTotals : [];
  const blockedTotal = recent.length >= 2 && recent[recent.length - 1] === recent[recent.length - 2]
    ? recent[recent.length - 1]
    : null;
  if (blockedTotal == null) return randomPair(rng);
  const allowed = ALL_DICE_PAIRS.filter((pair) => pair[0] + pair[1] !== blockedTotal);
  return allowed[randomIndex(allowed.length, rng)].slice();
}

function rollDiceWithAlgorithm(game, rng = Math.random) {
  if (!game || typeof game !== 'object') throw new TypeError('A game state is required.');
  const algorithm = normalizeDiceAlgorithm(game.rules && game.rules.diceAlgorithm);
  const state = game.diceAlgorithmState && typeof game.diceAlgorithmState === 'object'
    ? game.diceAlgorithmState
    : (game.diceAlgorithmState = {});

  let pair;
  if (algorithm === 'balanced') pair = balancedPair(state, rng);
  else if (algorithm === 'probability_corrected') pair = probabilityCorrectedPair(game.diceStats, rng);
  else if (algorithm === 'streak_breaker') pair = streakBreakerPair(state, rng);
  else pair = randomPair(rng);

  const [d1, d2] = pair;
  const roll = d1 + d2;
  const recent = Array.isArray(state.recentTotals) ? state.recentTotals : [];
  state.recentTotals = recent.concat(roll).slice(-2);
  return { d1, d2, roll, algorithm };
}

module.exports = {
  ALL_DICE_PAIRS,
  DICE_ALGORITHMS,
  normalizeDiceAlgorithm,
  rollDiceWithAlgorithm,
};
