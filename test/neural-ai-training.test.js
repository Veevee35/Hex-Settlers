'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const serverJs = fs.readFileSync(path.join(projectRoot, 'server.js'), 'utf8');
const model = JSON.parse(fs.readFileSync(path.join(projectRoot, 'neural_ai_model.json'), 'utf8'));
const historicalReport = JSON.parse(fs.readFileSync(path.join(projectRoot, 'scripts', 'output', 'neural_ai_500_all_maps.json'), 'utf8'));
const report = JSON.parse(fs.readFileSync(path.join(projectRoot, 'scripts', 'output', 'neural_ai_5000_fast_victory_all_scenarios.json'), 'utf8'));

test('neural training ignores hypothetical lookahead games', () => {
  const guards = serverJs.match(/if \(!\(room && room\._dryRun\)\)/g) || [];
  assert.ok(guards.length >= 2);
  assert.match(serverJs, /function trainNeuralAiFromFinishedGame/);
});

test('neural policy has a Gold-income signal and goal-directed Gold choices', () => {
  assert.equal(model.meta.featureVersion, 3);
  assert.equal(model.meta.featureNames[1], 'gold_income');
  assert.match(serverJs, /Math\.min\(1, goldIncome \/ 15\)/);
  assert.match(serverJs, /const chooseGoldResourceChoices = \(pid, amount\) =>/);
  assert.match(serverJs, /scoreCost\(BUILD_COSTS\.city, 38, hasCityUpgrade\)/);
  assert.match(serverJs, /chooseGoldResourceChoices\(pid, amount\)/);
});

test('historical 500-game curriculum trained exactly once per completed game', () => {
  assert.equal(historicalReport.requestedGames, 500);
  assert.equal(historicalReport.completedGames, 500);
  assert.equal(historicalReport.finalTrainedGames - historicalReport.startingTrainedGames, 500);
  assert.equal(historicalReport.mapsCovered.length, 13);
  assert.ok(Object.values(historicalReport.byMap).every((entry) => entry.games >= 38));
  assert.notEqual(historicalReport.startingModelSha256, historicalReport.finalModelSha256);
});

test('5000-game fastest-victory curriculum covers every scenario at full victory targets', () => {
  assert.equal(report.requestedGames, 5000);
  assert.equal(report.completedGames, 5000);
  assert.equal(report.finalTrainedGames - report.startingTrainedGames, 5000);
  assert.equal(model.trainedGames, report.finalTrainedGames);
  assert.equal(report.trainingObjective, 'discounted-fastest-victory-v1');
  assert.equal(model.meta.trainingObjective, report.trainingObjective);
  assert.equal(model.meta.featureNames[2], 'victory_pace');
  assert.equal(report.mapsCovered.length, 15);
  assert.ok(report.mapsCovered.includes('test_builder'));
  assert.ok(report.mapsCovered.includes('test_builder_56'));
  assert.ok(Object.values(report.byMap).every((entry) => entry.games === 333 || entry.games === 334));
  assert.ok(Object.values(report.byMap).every((entry) => entry.victoryPointsToWin >= 10 && entry.victoryPointsToWin <= 14));
  assert.ok(report.totalGoldProductionCards >= 100_000);
  assert.ok(report.averageVictoryTurn > 0);
  assert.equal(model.speedTraining.games, 5000);
  assert.notEqual(report.startingModelSha256, report.finalModelSha256);
});

test('fast-victory trajectories are bounded and omitted from serialized game state', () => {
  assert.match(serverJs, /function recordNeuralAiTrainingSnapshot/);
  assert.match(serverJs, /enumerable: false/);
  assert.match(serverJs, /_neuralTrainingTrace\.length > 240/);
  assert.match(serverJs, /winnerReward = 0\.3 \+ 0\.68 \* Math\.exp/);
  assert.match(serverJs, /AI_TRAINING_MODE \? 1/);
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
