'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { performance, poolCandidates, readContinuedLearning } = require('../scripts/train_neural_ai_evolutionary');
const { createPolicy } = require('../server/neural-policy');
const { learningCheckpoint } = require('../scripts/benchmark-selection');
const { trainingAnchorSeat } = require('../scripts/training-recovery');

test('evolutionary selection rewards larger margins and faster victories', () => {
  const quick = performance({ games: [{ turnNumber: 80, winnerMargin: 3 }] });
  const slow = performance({ games: [{ turnNumber: 120, winnerMargin: 3 }] });
  const dominant = performance({ games: [{ turnNumber: 80, winnerMargin: 4 }] });
  assert.ok(quick.score > slow.score);
  assert.ok(dominant.score > quick.score);
});

test('continuation keeps compatible learning even when an individual wins screening', () => {
  const screened = [
    { candidate: 2, clean: true, stage: 'full', estimate: 0.06 },
    { candidate: 1, clean: true, stage: 'full', estimate: 0.01 },
    { candidate: 3, clean: true, stage: 'full', estimate: -0.01 },
  ];
  assert.equal(learningCheckpoint(screened, 3).candidate, 3);
  assert.equal(learningCheckpoint(screened, undefined).candidate, 1);
  screened[2].clean = false;
  assert.equal(learningCheckpoint(screened, 3).candidate, 1);
  assert.equal(learningCheckpoint([{ candidate: 3, clean: true, stage: 'initial' }], 3), null);
});

test('three quarters of the new curriculum play a champion and all learner seats rotate evenly', () => {
  for (let players = 2; players <= 8; players++) {
    const counts = Array(players).fill(0);
    let selfPlay = 0;
    for (let cycle = 0; cycle < 4 * players; cycle++) {
      const seat = trainingAnchorSeat(cycle * 49 + 17, 49, players, 4, true);
      if (seat === null) selfPlay++;
      else counts[seat]++;
    }
    assert.equal(selfPlay, players);
    assert.deepEqual(counts, Array(players).fill(3));
  }
});

test('a later run reuses only an intact checkpoint tied to its champion and training profile', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'hex-continued-learning-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'learning.json');
  const model = JSON.stringify(createPolicy());
  const modelHash = createHash('sha256').update(model).digest('hex');
  const settings = { championHash: 'champion', profile: 'standard' };
  const saved = { ...settings, model, modelHash, run: '.neural-evolution-test' };
  await fs.writeFile(file, JSON.stringify(saved));
  assert.deepEqual(readContinuedLearning(file, settings), { bytes: Buffer.from(model), source: { run: saved.run, modelHash } });
  assert.equal(readContinuedLearning(file, { ...settings, profile: 'custom' }), null);
  assert.equal(readContinuedLearning(file, { ...settings, championHash: 'imported' }), null);
  await fs.writeFile(file, JSON.stringify({ ...saved, model: '{}' }));
  assert.throws(() => readContinuedLearning(file, settings), /integrity/);
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
