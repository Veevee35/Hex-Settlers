'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const serverJs = fs.readFileSync(path.join(projectRoot, 'server.js'), 'utf8');
const model = JSON.parse(fs.readFileSync(path.join(projectRoot, 'neural_ai_model.json'), 'utf8'));
const report = JSON.parse(fs.readFileSync(path.join(projectRoot, 'scripts', 'output', 'neural_ai_500_all_maps.json'), 'utf8'));

test('neural training ignores hypothetical lookahead games', () => {
  const guards = serverJs.match(/if \(!\(room && room\._dryRun\)\)/g) || [];
  assert.ok(guards.length >= 2);
  assert.match(serverJs, /function trainNeuralAiFromFinishedGame/);
});

test('neural policy has a Gold-income signal and goal-directed Gold choices', () => {
  assert.equal(model.meta.featureVersion, 2);
  assert.equal(model.meta.featureNames[1], 'gold_income');
  assert.match(serverJs, /Math\.min\(1, goldIncome \/ 15\)/);
  assert.match(serverJs, /const chooseGoldResourceChoices = \(pid, amount\) =>/);
  assert.match(serverJs, /scoreCost\(BUILD_COSTS\.city, 38, hasCityUpgrade\)/);
  assert.match(serverJs, /chooseGoldResourceChoices\(pid, amount\)/);
});

test('500-game curriculum trained exactly once per completed game across every canonical map', () => {
  assert.equal(report.requestedGames, 500);
  assert.equal(report.completedGames, 500);
  assert.equal(report.finalTrainedGames - report.startingTrainedGames, 500);
  assert.equal(model.trainedGames, report.finalTrainedGames);
  assert.equal(report.mapsCovered.length, 13);
  assert.ok(Object.values(report.byMap).every((entry) => entry.games >= 38));
  assert.ok(report.totalGoldProductionCards >= 4_000);
  assert.notEqual(report.startingModelSha256, report.finalModelSha256);
});

test('trained neural parameters remain finite and structurally valid', () => {
  assert.equal(model.meta.inputSize, 12);
  assert.equal(model.params.w1.length, model.meta.hiddenSize);
  assert.equal(model.params.w2.length, model.meta.hiddenSize);
  const numbers = [
    ...model.params.w1.flat(),
    ...model.params.b1,
    ...model.params.w2,
    model.params.b2,
  ];
  assert.ok(numbers.length > 0);
  assert.ok(numbers.every(Number.isFinite));
});
