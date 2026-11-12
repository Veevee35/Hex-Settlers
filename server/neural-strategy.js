'use strict';

// Tactical action rewards complement the learned state value. They MUST not
// replace the neural model: they preserve information lost by state aggregation
// (which node/edge was chosen, fog discovery, title race milestones).
const RESOURCE_KINDS = ['brick', 'lumber', 'wool', 'grain', 'ore'];
const CITY = { grain: 2, ore: 3 };
const SETTLEMENT = { brick: 1, lumber: 1, wool: 1, grain: 1 };
const DEVELOPMENT = { wool: 1, grain: 1, ore: 1 };
const clamp = (number, lo, hi) => Math.max(lo, Math.min(hi, Number(number) || 0));
const enough = (resources, cost) => Object.entries(cost).every(([k, n]) => Number(resources?.[k] || 0) >= n);

function strategicNeuralBonus({ kind, siteScore = 0, fogRevealed = 0, availableSpots = 0,
  newlyAvailableSpots = 0, routeLengthBefore = 0, routeLengthAfter = 0,
  longestRoadLength = 0, ownsLongestRoad = false, army = 0, largestArmySize = 0,
  ownsLargestArmy = false, vpGap = 10, devDeckSize = 0 } = {}) {
  if (kind === 'place_settlement') return 45 + clamp(siteScore, 0, 40) * 14;
  if (kind === 'upgrade_city') return 35 + clamp(siteScore, 0, 40) * 9;
  if (kind === 'place_road' || kind === 'place_ship') {
    const fog = Math.max(0, Number(fogRevealed) || 0);
    const scarcityBoost = availableSpots <= 0 ? 1.65 : (availableSpots <= 2 ? 1.3 : 1);
    let result = -38; // Unproductive, aimless road/ship placement costs resources.
    if (fog) result += (135 + Math.min(3, fog - 1) * 45) * scarcityBoost;
    if (newlyAvailableSpots > 0) result += 65 + Math.min(3, newlyAvailableSpots) * 33 * scarcityBoost;
    const progress = Math.max(0, routeLengthAfter - routeLengthBefore);
    if (progress > 0 && !ownsLongestRoad) {
      result += progress * 28;
      if (routeLengthAfter >= 3 && routeLengthAfter >= Math.max(5, longestRoadLength) - 2) result += 85;
    }
    return result;
  }
  if (kind === 'buy_dev_card' && devDeckSize > 0) {
    let result = 40;
    // VP cards can close a one-point gap; Knights can earn Largest Army.
    if (vpGap <= 2) result += 100;
    if (!ownsLargestArmy && army >= Math.max(1, largestArmySize - 2)) result += 72;
    return result;
  }
  return 0;
}

function riskyOpponentTrade({ player, proposer, trade, victoryTarget = 10, income = {},
  proposerCanCity = false, proposerCanSettle = false, devDeckSize = 0 } = {}) {
  if (!proposer || !player || proposer.id === player.id) return true;
  const remaining = Math.max(0, Number(victoryTarget) - Number(proposer.vp || 0));
  if (remaining > 2) return false;
  const give = trade?.request || {}; // Our resources, received by the proposer.
  const requestedKinds = RESOURCE_KINDS.filter(k => Number(give[k] || 0) > 0);
  if (!requestedKinds.length) return false;
  const proposerBefore = proposer.resources || {};
  const proposerAfter = { ...proposerBefore };
  for (const kind of RESOURCE_KINDS) {
    proposerAfter[kind] = Number(proposerBefore[kind] || 0)
      + Number(trade.request?.[kind] || 0) - Number(trade.offer?.[kind] || 0);
  }
  // Never supply the resource that directly completes a potential winning build.
  const createsWinningBuild = [
    [CITY, proposerCanCity],
    [SETTLEMENT, proposerCanSettle],
    [DEVELOPMENT, devDeckSize > 0],
  ].some(([cost, enabled]) => enabled && !enough(proposerBefore, cost) && enough(proposerAfter, cost));
  if (createsWinningBuild) return true;
  // At one VP, the value of an extra card (including a hidden VP dev card) is
  // too dangerous to assume a favorable-looking trade is safe.
  if (remaining <= 1) return true;
  // Two VP away: withhold grain, ore, or our weak-income production.
  return requestedKinds.some(kind => kind === 'grain' || kind === 'ore' || Number(income[kind] || 0) < 4);
}

function tradeIsWorthAccepting({ diff, player, proposer, trade, income = {}, victoryTarget,
  enabling = false, proposerCanCity = false, proposerCanSettle = false, devDeckSize = 0 } = {}) {
  if (!player || !trade || diff === 'test' || diff === 'easy') return false;
  for (const kind of RESOURCE_KINDS) {
    if (Number(player.resources?.[kind] || 0) < Number(trade.request?.[kind] || 0)) return false;
  }
  if (riskyOpponentTrade({ player, proposer, trade, victoryTarget, income, proposerCanCity, proposerCanSettle, devDeckSize })) return false;
  const hasCityUpgrade = !!player.hasCityUpgrade;
  const weights = { brick: 1.4, lumber: 1.4, wool: 1.3, grain: 1.2, ore: 1 };
  if (hasCityUpgrade) { weights.grain += 0.6; weights.ore += 0.9; }
  const value = (items) => RESOURCE_KINDS.reduce((sum, kind) => sum + Number(items?.[kind] || 0) * weights[kind], 0);
  const paid = value(trade.request);
  const got = value(trade.offer);
  if (paid <= 0) return got > 0;
  // A good-looking hand exchange is not automatically a good deal: the other
  // player benefits too, and future acquisition of a low-income resource hurts.
  const criticalGive = RESOURCE_KINDS.some(k => Number(trade.request?.[k] || 0) > 0 && Number(income[k] || 0) < 4);
  if (criticalGive && !enabling) return false;
  const minimumMultiplier = enabling ? (diff === 'medium' ? 1.18 : 1.08)
    : (diff === 'medium' ? 1.65 : 1.5);
  return got >= paid * minimumMultiplier;
}

module.exports = { strategicNeuralBonus, riskyOpponentTrade, tradeIsWorthAccepting };
