'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { performance, poolCandidates } = require('../scripts/train_neural_ai_evolutionary');
const { createPolicy } = require('../server/neural-policy');

test('evolutionary selection rewards larger margins and faster victories', () => {
  const quick = performance({ games: [{ turnNumber: 80, winnerMargin: 3 }] });
  const slow = performance({ games: [{ turnNumber: 120, winnerMargin: 3 }] });
  const dominant = performance({ games: [{ turnNumber: 80, winnerMargin: 4 }] });
  assert.ok(quick.score > slow.score);
  assert.ok(dominant.score > quick.score);
});

test('the pooled checkpoint combines compatible branches from their common starting model', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'hex-pooled-checkpoint-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const base = { params: { w1: [[0]], b1: [0], w2: [0], b2: 0 }, policy: createPolicy(), trainedGames: 50 };
  base.policy.decisions = 100;
  const branch = (index, games, weight, decisions) => {
    const model = structuredClone(base);
    model.trainedGames += games;
    model.policy.weights[0][0] = weight;
    model.policy.decisions += decisions;
    model.policy.byAction.end_turn = decisions;
    return { candidate: { index, games }, model };
  };
  const candidates = [branch(1, 3, -1, 6), branch(2, 2, 3, 20), branch(0, 2, 1, 4)];
  const result = await poolCandidates(base, candidates, [{}, {}, { economy: 125 }], directory);
  assert.deepEqual(result.sourceCandidates, [1, 2]);
  assert.equal(result.model.trainedGames, 55);
  assert.equal(result.model.policy.weights[0][0], -0.2);
  assert.equal(result.model.policy.decisions, 110);
  assert.equal(result.model.policy.byAction.end_turn, 10);
  assert.deepEqual(JSON.parse(await fs.readFile(result.candidate.modelPath, 'utf8')), result.model);
});
