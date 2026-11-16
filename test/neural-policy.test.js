'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { createPolicy, validatePolicy, selectPolicyAction, trainPolicy } = require('../server/neural-policy');
const { validateImportedModel } = require('../scripts/trainer-models');
const { playStyleKeys } = require('../server/ai-play-styles');

function position() {
  const player = { id: 'learner', vp: 5, resources: { ore: 2, grain: 2, wool: 1 }, devCards: [] };
  const game = {
    phase: 'main-actions', turnNumber: 32, rules: { victoryPointsToWin: 10, mapMode: 'seafarers' },
    players: [player, { id: 'rival', vp: 6, resources: { ore: 3 } }],
    devDeck: ['knight', 'victory_point'], geom: { nodes: [], tiles: [{ fog: true, revealed: false, hiddenType: 'gold' }],
      edges: [], ports: [], nodeAdjTiles: [], edgeAdjTiles: [] },
  };
  return { game, player };
}

test('winning explored actions become preferred and losing actions become less likely', () => {
  const setup = position();
  const options = [{ action: { kind: 'end_turn' }, score: 1 }, { action: { kind: 'buy_dev_card' }, score: 0 }];
  const policy = createPolicy();
  const greedy = () => selectPolicyAction({ ...setup, policy, options, scale: 1, explore: false,
    random: () => { throw new Error('A frozen policy must not explore'); } }).action.kind;
  const explore = () => {
    const draws = [0, 0.99];
    return selectPolicyAction({ ...setup, policy, options, scale: 1, explore: true, random: () => draws.shift() });
  };
  assert.equal(greedy(), 'end_turn');
  for (let i = 0; i < 60; i++) {
    const chosen = explore();
    assert.equal(chosen.action.kind, 'buy_dev_card');
    trainPolicy(policy, [chosen.sample], setup.player.id);
  }
  assert.equal(greedy(), 'buy_dev_card');
  for (let i = 0; i < 100; i++) {
    const chosen = explore();
    trainPolicy(policy, [chosen.sample], 'rival');
  }
  assert.equal(greedy(), 'end_turn');
  assert.equal(policy.byPhase['main-actions'], 160);
  assert.equal(validatePolicy(policy), policy);
});

test('policy features ignore hidden deck order, opponent resource kinds and unrevealed terrain', () => {
  const a = position();
  const b = structuredClone(a);
  b.game.devDeck.reverse();
  b.game.players[1].resources = { lumber: 3 };
  b.game.geom.tiles[0].hiddenType = 'sea';
  const policy = createPolicy();
  const options = [{ action: { kind: 'move_robber', tileId: 0 }, score: 0 },
    { action: { kind: 'robber_steal', victimId: 'rival' }, score: 0 }];
  const choose = setup => selectPolicyAction({ ...setup, policy, options, scale: 1, explore: true, random: () => 0 });
  assert.deepEqual(choose(a), choose(b));
});

test('model import preserves a valid action policy and rejects corrupt policy weights', () => {
  const original = require('../neural_ai_model.json');
  const model = { ...original, policy: createPolicy() };
  model.policy.weights[0][0] = 0.5;
  assert.deepEqual(validateImportedModel(model).policy, model.policy);
  model.policy.weights[0][0] = NaN;
  assert.throws(() => validateImportedModel(model), /Invalid adaptive action policy/);
});

test('learned matchup weights can change a choice only in that scenario and player count', () => {
  function withTable(players, scenario) {
    const setup = position();
    setup.game.rules.seafarersScenario = scenario;
    while (setup.game.players.length < players) {
      setup.game.players.push({ id: `rival-${setup.game.players.length}`, vp: 2, resources: {} });
    }
    return setup;
  }
  const policy = createPolicy();
  policy.styles = {};
  const options = [{ action: { kind: 'end_turn' }, score: 1 }, { action: { kind: 'buy_dev_card' }, score: 0 }];
  const fogFive = withTable(5, 'fog_island_56');
  for (let i = 0; i < 60; i++) {
    const draws = [0, 0.99];
    const chosen = selectPolicyAction({ ...fogFive, policy, options, scale: 1, explore: true, random: () => draws.shift() });
    assert.equal(chosen.action.kind, 'buy_dev_card');
    trainPolicy(policy, [chosen.sample], fogFive.player.id);
  }
  assert.deepEqual(Object.keys(policy.styles), ['players:5', 'scenario:fog_island_56', 'matchup:fog_island_56:5']);
  assert.equal(policy.styles['matchup:fog_island_56:5'].decisions, 60);
  const isolated = createPolicy();
  isolated.styles = { 'matchup:fog_island_56:5': policy.styles['matchup:fog_island_56:5'] };
  validatePolicy(isolated);
  const closeOptions = [{ ...options[0], score: 0.05 }, options[1]];
  const choose = setup => selectPolicyAction({ ...setup, policy: isolated, options: closeOptions, scale: 1, explore: false }).action.kind;
  assert.equal(choose(fogFive), 'buy_dev_card');
  assert.equal(choose(withTable(6, 'fog_island_56')), 'end_turn');
  assert.equal(choose(withTable(5, 'six_islands')), 'end_turn');
  assert.deepEqual(playStyleKeys({ mapMode: 'seafarers', seafarersScenario: 'cartographer_78_7' }, 7),
    ['players:7', 'scenario:cartographer_78', 'matchup:cartographer_78:7']);
});
