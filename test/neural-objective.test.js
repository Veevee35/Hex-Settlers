'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { FEATURE_NAMES, opponentFeatures, upgradeNeuralModel, victoryTrainingTarget } = require('../server/neural-objective');
const { ALL_MAPS } = require('../scripts/train_neural_ai_all_maps');
const { mergeModels } = require('../scripts/train_neural_ai_distributed');

test('fast victories and holding rivals away from victory earn higher rewards', () => {
  const base = { won: true, totalTurns: 80, expectedTurns: 100, opponentProgress: 0.6, terminal: true };
  assert.ok(victoryTrainingTarget(base) > victoryTrainingTarget({ ...base, totalTurns: 180 }));
  assert.ok(victoryTrainingTarget(base) > victoryTrainingTarget({ ...base, opponentProgress: 0.9 }));
  assert.equal(victoryTrainingTarget({ ...base, won: false }), victoryTrainingTarget({ ...base, won: false, totalTurns: 180 }));
  for (const won of [true, false]) for (const totalTurns of [1, 80, 10000]) for (const lead of [-1, 0, 1]) {
    const reward = victoryTrainingTarget({ ...base, won, totalTurns, lead, terminal: false, remainingTurns: totalTurns });
    assert.ok(Number.isFinite(reward) && Math.abs(reward) <= 0.98);
    assert.equal(reward > 0, won);
  }
});

test('opponent signals track the leader, blocked production, and departed players', () => {
  const state = {
    rules: { victoryPointsToWin: 10 },
    players: [{ id: 'me', vp: 6 }, { id: 'rival', vp: 8 }, { id: 'gone', vp: 10, departed: true }],
    geom: { nodes: [{ id: 0, building: { owner: 'rival', type: 'city' } }], nodeAdjTiles: [[0]], tiles: [{ type: 'field', number: 6 }] },
  };
  const open = opponentFeatures(state, 'me');
  assert.equal(open[0], 0.8);
  assert.equal(open[1], 0.8);
  assert.ok(Math.abs(open[2] + 0.2) < 1e-10);
  state.geom.tiles[0].robber = true;
  const blocked = opponentFeatures(state, 'me');
  assert.ok(blocked[3] < open[3]);
  assert.ok(blocked[4] > open[4]);
  state.geom.tiles[0].fog = true;
  assert.equal(opponentFeatures(state, 'me')[4], 0);
});

test('migration and distributed merging preserve old weights and train new opponent inputs', () => {
  const initial = { trainedGames: 5, params: { w1: [Array(12).fill(0.25)], b1: [0], w2: [1], b2: 0 } };
  upgradeNeuralModel(initial);
  assert.equal(initial.params.w1[0].length, FEATURE_NAMES.length);
  assert.deepEqual(initial.params.w1[0].slice(0, 12), Array(12).fill(0.25));
  assert.deepEqual(initial.params.w1[0].slice(12), Array(5).fill(0));
  const a = structuredClone(initial);
  const b = structuredClone(initial);
  a.params.w1[0][12] = 0.6;
  b.params.w1[0][12] = -0.2;
  const merged = mergeModels(initial, [a, b], [3, 1]);
  assert.ok(Math.abs(merged.params.w1[0][12] - 0.4) < 1e-10);
  assert.equal(merged.trainedGames, 9);
});

test('standard curriculum has exactly thirteen modes at full victory targets', () => {
  const standard = ALL_MAPS.filter(map => !map.customBuilder);
  assert.equal(standard.length, 13);
  assert.ok(standard.every(map => map.victoryPoints >= 10));
  const previous = process.env.MAP_SET;
  try {
    process.env.MAP_SET = 'standard';
    delete require.cache[require.resolve('../scripts/train_neural_ai_all_maps')];
    const games = require('../scripts/train_neural_ai_all_maps').curriculum(13000);
    const counts = new Map();
    for (const item of games) counts.set(item.map.id, (counts.get(item.map.id) || 0) + 1);
    assert.equal(counts.size, 13);
    assert.ok([...counts.values()].every(count => count === 1000));
  } finally {
    if (previous === undefined) delete process.env.MAP_SET;
    else process.env.MAP_SET = previous;
  }
});
