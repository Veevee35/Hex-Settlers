'use strict';

const { resourceKindForTileType } = require('./resource-summary');
const { playStyleKeys } = require('./ai-play-styles');

const POLICY_VERSION = 1;
const POLICY_OBJECTIVE = 'exploratory-action-win-policy-v1';
const RESOURCES = ['brick', 'lumber', 'wool', 'grain', 'ore'];
const KINDS = [
  'place_settlement', 'upgrade_city', 'place_road', 'place_ship', 'move_ship', 'buy_dev_card',
  'play_dev_card', 'bank_trade', 'propose_trade', 'accept_trade', 'reject_trade', 'finalize_trade',
  'end_turn', 'roll_dice', 'move_robber', 'move_pirate', 'robber_steal', 'pirate_steal',
  'choose_discovery', 'choose_production_gold', 'discard_cards', 'cartographer_draft_place',
];
const STATE_SIZE = 33;
const DETAIL_SIZE = 36;
const STYLE_SIZE = KINDS.length + DETAIL_SIZE;
const STYLE_BLEND = [0.55, 0.70, 1];
const clamp = (value, max = 1) => Math.max(-max, Math.min(max, value));
const sum = items => Object.values(items || {}).reduce((total, value) => total + (Number(value) || 0), 0);
const dot = (weights, features) => features.reduce((total, value, i) => total + value * weights[i], 0);
const pips = number => number >= 2 && number <= 12 && number !== 7 ? 6 - Math.abs(7 - number) : 0;

function createPolicy() {
  return { version: POLICY_VERSION, weights: KINDS.map(() => Array(STATE_SIZE + DETAIL_SIZE).fill(0)),
    critic: Array(STATE_SIZE).fill(0), games: 0, decisions: 0, byPhase: {}, byAction: {} };
}

function createStyle() {
  return { weights: Array(STYLE_SIZE).fill(0), games: 0, decisions: 0 };
}

function validatePolicy(policy) {
  const vector = (row, size) => Array.isArray(row) && row.length === size && row.every(x => Number.isFinite(x) && Math.abs(x) <= 8);
  const counters = counts => counts && typeof counts === 'object' && !Array.isArray(counts) &&
    Object.values(counts).every(n => Number.isSafeInteger(n) && n >= 0);
  if (policy?.version !== POLICY_VERSION || !Array.isArray(policy.weights) || policy.weights.length !== KINDS.length ||
      !policy.weights.every(row => vector(row, STATE_SIZE + DETAIL_SIZE)) || !vector(policy.critic, STATE_SIZE) ||
      !Number.isSafeInteger(policy.games) || policy.games < 0 || !Number.isSafeInteger(policy.decisions) || policy.decisions < 0 ||
      !counters(policy.byPhase) || (policy.byAction !== undefined && !counters(policy.byAction))) {
    throw new Error('Invalid adaptive action policy');
  }
  if (policy.styles !== undefined && (!policy.styles || typeof policy.styles !== 'object' || Array.isArray(policy.styles) ||
      Object.keys(policy.styles).length > 128 || !Object.entries(policy.styles).every(([key, style]) =>
        /^(?:players:[1-8]|scenario:[a-z0-9_]{1,64}|matchup:[a-z0-9_]{1,64}:[1-8])$/.test(key) &&
        vector(style?.weights, STYLE_SIZE) && Number.isSafeInteger(style.games) && style.games >= 0 &&
        Number.isSafeInteger(style.decisions) && style.decisions >= 0))) {
    throw new Error('Invalid adaptive play style weights');
  }
  return policy;
}

function publicProduction(game, pid, nodeIds, includeBlocked = false) {
  const result = { brick: 0, lumber: 0, wool: 0, grain: 0, ore: 0, gold: 0 };
  for (const id of nodeIds) {
    const owned = game.geom.nodes[id]?.building;
    if (pid && owned?.owner !== pid) continue;
    const multiplier = pid && owned.type === 'city' ? 2 : 1;
    for (const tileId of game.geom.nodeAdjTiles[id] || []) {
      const tile = game.geom.tiles[tileId];
      if (!tile || (tile.fog && !tile.revealed) || (!includeBlocked && tile.robber)) continue;
      const kind = resourceKindForTileType(tile.type);
      if (kind) result[kind] += pips(tile.number) * multiplier;
    }
  }
  return result;
}

function policyContext(game, player) {
  const opponents = game.players.filter(other => other.id !== player.id && !other.departed);
  const target = game.rules.victoryPointsToWin || 10;
  const threat = Math.max(0, ...opponents.map(other => other.vp || 0));
  const own = player.vp || 0;
  const nodes = game.geom.nodes.filter(node => node?.building?.owner === player.id).map(node => node.id);
  const income = publicProduction(game, player.id, nodes);
  const ports = (game.geom.ports || []).filter(port => port.nodeIds?.some(id => nodes.includes(id)));
  const population = Math.max(2, opponents.length + 1);
  const phase = game.phase;
  const context = [
    1, own / target, threat / target, (own - threat) / target, (population - 2) / 6,
    (phase.startsWith('setup') ? 1 : 0), Number(phase === 'main-await-roll'), Number(phase === 'main-actions'),
    Number(game.rules.mapMode === 'seafarers'), (game.turnNumber || 0) / (population * 35),
    (player.longestRoadLen || 0) / 12, (game.longestRoad?.length || 0) / 12,
    (player.army || 0) / 7, (game.largestArmy?.size || 0) / 7,
    sum(player.resources) / 12, (game.devDeck?.length || 0) / 25,
    ...RESOURCES.map(kind => (player.resources?.[kind] || 0) / 5),
    ...RESOURCES.map(kind => income[kind] / 20), income.gold / 12,
    opponents.reduce((total, other) => total + (other.vp || 0), 0) / Math.max(1, opponents.length) / target,
    ports.length / 4, ports.filter(port => port.kind !== 'generic').length / 4,
    nodes.length / 8, (player.devCards?.filter(card => !card.played).length || 0) / 5,
    Number(game.paired?.stage === 'p2'),
  ].map(value => clamp(value));
  return { context, income, target, population };
}

function actionDetail(game, player, analysis, option) {
  const { action } = option;
  const edge = game.geom.edges[action.toEdgeId ?? action.edgeId];
  const production = publicProduction(game, null, action.nodeId != null ? [action.nodeId] : edge ? [edge.a, edge.b] : [], true);
  const tile = game.geom.tiles[action.tileId];
  if (action.kind === 'cartographer_draft_place') {
    const draftKind = resourceKindForTileType(action.tileType);
    if (draftKind) production[draftKind] = 5;
  }
  const port = action.nodeId != null && game.geom.ports?.find(p => p.nodeIds?.includes(action.nodeId));
  const counterpartId = action.victimId ?? action.withPlayerId ??
    (action.kind === 'respond_trade' ? game.pendingTrade?.fromId : null);
  const counterpart = game.players.find(p => p.id === counterpartId);
  const card = player.devCards?.find(c => c.id === action.cardId);
  const change = {};
  const exchange = action.kind === 'respond_trade' && action.accept ? game.pendingTrade : action.kind === 'finalize_trade' ? game.pendingTrade : action;
  for (const kind of RESOURCES) {
    const direction = action.kind === 'respond_trade' ? -1 : 1;
    change[kind] = direction * ((exchange?.request?.[kind] || 0) - (exchange?.offer?.[kind] || 0)) - (action.cards?.[kind] || 0);
    if (action.giveKind === kind) change[kind] -= option.tradeRatio || 4;
    if (action.takeKind === kind || action.resourceKind === kind) change[kind]++;
    change[kind] += action.choices?.filter(choice => choice === kind).length || 0;
  }
  const fog = edge ? (game.geom.edgeAdjTiles[edge.id] || []).filter(id => game.geom.tiles[id]?.fog && !game.geom.tiles[id].revealed).length : 0;
  const threatenedOwners = action.kind === 'move_robber'
    ? (tile?.cornerNodeIds || []).map(id => game.geom.nodes[id]?.building?.owner)
    : action.kind === 'move_pirate'
      ? game.geom.edges.filter(edge => edge.shipOwner && game.geom.edgeAdjTiles[edge.id]?.includes(action.tileId)).map(edge => edge.shipOwner)
      : [];
  const blocked = game.players.filter(other => other.id !== player.id && threatenedOwners.includes(other.id));
  return [
    ...RESOURCES.map(kind => production[kind] / 10),
    production.gold / 10, Number(!!port), Number(port?.kind && port.kind !== 'generic') || 0, fog / 3,
    ...RESOURCES.map(kind => change[kind] / 4),
    ...RESOURCES.map(kind => change[kind] / (4 + analysis.income[kind])),
    (counterpart?.vp || 0) / analysis.target, sum(counterpart?.resources) / 12,
    tile?.fog && !tile.revealed ? 0 : pips(tile?.number) / 5,
    (option.routeGain || 0) / 4, (option.expansionGain || 0) / 4,
    ...RESOURCES.map(kind => production[kind] / (6 + analysis.income[kind])),
    ...['knight', 'road_building', 'invention', 'monopoly', 'victory_point'].map(type => Number(card?.type === type)),
    Math.max(0, ...blocked.map(other => other.vp || 0)) / analysis.target,
    blocked.length / 4,
  ].map(value => clamp(value));
}

function selectPolicyAction({ game, player, policy, options, scale, explore, random = Math.random }) {
  if (options.length < 2) return options[0];
  const analysis = policyContext(game, player);
  const keys = policy.styles ? playStyleKeys(game.rules, analysis.population) : [];
  const styles = keys.map(key => policy.styles[key]);
  const highest = Math.max(...options.map(option => option.score));
  const rows = options.map(option => {
    const { action } = option;
    const kind = action.kind === 'respond_trade' ? (action.accept ? 'accept_trade' : 'reject_trade') : action.kind;
    const index = KINDS.indexOf(kind);
    const detail = actionDetail(game, player, analysis, option);
    const features = [...analysis.context, ...detail];
    // A tactical prior gets a useful policy off the ground. A bounded prior
    // lets evidence from wins and losses eventually override its preferences.
    const prior = Math.max(-6, (option.score - highest) / scale);
    const adjustment = styles.reduce((score, style, i) => {
      if (!style) return score;
      const detailScore = detail.reduce((total, value, j) => total + value * style.weights[KINDS.length + j], 0);
      return score + STYLE_BLEND[i] * (style.weights[index] + detailScore);
    }, 0);
    return { option, index, features, logit: prior + dot(policy.weights[index], features) + adjustment };
  });
  const best = rows.reduce((a, b) => a.logit >= b.logit ? a : b);
  if (!explore || random() >= 0.28) return best.option;

  const distribution = rows.map(row => Math.exp(row.logit - best.logit));
  const total = sum(distribution);
  let remaining = random() * total;
  const choiceIndex = distribution.findIndex(mass => (remaining -= mass) < 0);
  const chosen = rows[choiceIndex < 0 ? rows.length - 1 : choiceIndex];
  const gradient = new Map();
  for (let i = 0; i < rows.length; i++) {
    const { index, features } = rows[i];
    if (!gradient.has(index)) gradient.set(index, Array(features.length).fill(0));
    const row = gradient.get(index);
    const weight = Number(rows[i] === chosen) - distribution[i] / total;
    for (let j = 0; j < row.length; j++) row[j] += weight * features[j];
  }
  const baseline = 1 / (1 + Math.exp(Math.log(analysis.population - 1) - dot(policy.critic, analysis.context)));
  return { ...chosen.option, sample: { context: analysis.context, gradient, baseline,
    phase: game.phase, actionKind: KINDS[chosen.index], playerId: player.id, styles: keys } };
}

function trainPolicy(policy, samples, winnerId) {
  if (!samples.length) return;
  policy.byAction ||= {};
  const rate = 0.055 / Math.sqrt(samples.length);
  const playedStyles = new Set();
  for (const sample of samples) {
    const advantage = Number(winnerId === sample.playerId) - sample.baseline;
    for (const [index, gradient] of sample.gradient) {
      const row = policy.weights[index];
      for (let i = 0; i < row.length; i++) row[i] = clamp(row[i] + rate * advantage * gradient[i], 3);
    }
    for (let i = 0; i < policy.critic.length; i++) {
      policy.critic[i] = clamp(policy.critic[i] + rate * advantage * sample.context[i], 6);
    }
    if (policy.styles && sample.styles?.length) {
      const detailGradient = Array(DETAIL_SIZE).fill(0);
      for (const row of sample.gradient.values()) {
        for (let j = 0; j < DETAIL_SIZE; j++) detailGradient[j] += row[STATE_SIZE + j];
      }
      for (const [i, key] of sample.styles.entries()) {
        const style = policy.styles[key] ??= createStyle();
        const step = rate * advantage * STYLE_BLEND[i];
        for (const [kind, row] of sample.gradient) style.weights[kind] = clamp(style.weights[kind] + step * row[0], 2);
        for (let j = 0; j < DETAIL_SIZE; j++) {
          const offset = KINDS.length + j;
          style.weights[offset] = clamp(style.weights[offset] + step * detailGradient[j], 2);
        }
        style.decisions++;
        playedStyles.add(key);
      }
    }
    policy.byPhase[sample.phase] = (policy.byPhase[sample.phase] || 0) + 1;
    policy.byAction[sample.actionKind] = (policy.byAction[sample.actionKind] || 0) + 1;
  }
  policy.games++;
  policy.decisions += samples.length;
  for (const key of playedStyles) policy.styles[key].games++;
}

module.exports = { POLICY_VERSION, POLICY_OBJECTIVE, createPolicy, createStyle, validatePolicy, selectPolicyAction, trainPolicy };
