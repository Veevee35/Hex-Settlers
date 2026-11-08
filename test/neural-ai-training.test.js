'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { FEATURE_NAMES, upgradeNeuralModel } = require('../server/neural-objective');

const projectRoot = path.resolve(__dirname, '..');
const serverJs = fs.readFileSync(path.join(projectRoot, 'server.js'), 'utf8');
const model = upgradeNeuralModel(JSON.parse(fs.readFileSync(path.join(projectRoot, 'neural_ai_model.json'), 'utf8')));
const historicalReport = JSON.parse(fs.readFileSync(path.join(projectRoot, 'scripts', 'output', 'neural_ai_500_all_maps.json'), 'utf8'));
const report = JSON.parse(fs.readFileSync(path.join(projectRoot, 'scripts', 'output', 'neural_ai_5000_fast_victory_all_scenarios.json'), 'utf8'));

test('neural training ignores hypothetical lookahead games', () => {
  const guards = serverJs.match(/if \(!\(room && room\._dryRun\)\)/g) || [];
  assert.ok(guards.length >= 2);
  assert.match(serverJs, /function trainNeuralAiFromFinishedGame/);
});

test('neural policy has a Gold-income signal and goal-directed Gold choices', () => {
  assert.equal(model.meta.featureVersion, 4);
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
  assert.ok(model.trainedGames >= report.finalTrainedGames);
  assert.equal(report.trainingObjective, 'discounted-fastest-victory-v1');
  assert.equal(model.meta.trainingObjective, 'fast-victory-opponent-denial-v2');
  assert.equal(model.meta.featureNames[2], 'victory_pace');
  assert.equal(report.mapsCovered.length, 15);
  assert.ok(report.mapsCovered.includes('test_builder'));
  assert.ok(report.mapsCovered.includes('test_builder_56'));
  assert.ok(Object.values(report.byMap).every((entry) => entry.games === 333 || entry.games === 334));
  assert.ok(Object.values(report.byMap).every((entry) => entry.victoryPointsToWin >= 10 && entry.victoryPointsToWin <= 14));
  assert.ok(report.totalGoldProductionCards >= 100_000);
  assert.ok(report.averageVictoryTurn > 0);
  assert.ok(model.speedTraining.games >= 5000);
  assert.notEqual(report.startingModelSha256, report.finalModelSha256);
});

test('fast-victory trajectories are bounded and omitted from serialized game state', () => {
  assert.match(serverJs, /function recordNeuralAiTrainingSnapshot/);
  assert.match(serverJs, /enumerable: false/);
  assert.match(serverJs, /_neuralTrainingTrace\.length > 240/);
  assert.match(serverJs, /victoryTrainingTarget\(/);
  assert.match(serverJs, /AI_TRAINING_MODE \? 1/);
});

test('trained neural parameters remain finite and structurally valid', () => {
  assert.equal(model.meta.inputSize, FEATURE_NAMES.length);
  assert.equal(model.params.w1.length, model.meta.hiddenSize);
  assert.equal(model.params.w2.length, model.meta.hiddenSize);
  assert.ok(model.params.w1.every(row => row.length === model.meta.inputSize));
  const numbers = [
    ...model.params.w1.flat(),
    ...model.params.b1,
    ...model.params.w2,
    model.params.b2,
  ];
  assert.ok(numbers.length > 0);
  assert.ok(numbers.every(Number.isFinite));
});

test('13000-game fast-win and denial training records exactly 1000 real victories per standard mode', () => {
  const outputRoot = path.join(projectRoot, 'scripts', 'output');
  const latest = JSON.parse(fs.readFileSync(path.join(outputRoot, 'neural_ai_13000_fast_victory_opponent_denial.json'), 'utf8'));
  const backupBytes = fs.readFileSync(path.join(outputRoot, 'neural_ai_model_before_13000.json'));
  const backup = JSON.parse(backupBytes);
  const currentBytes = fs.readFileSync(path.join(projectRoot, 'neural_ai_model.json'));
  const current = JSON.parse(currentBytes);
  const standardModes = require('../scripts/train_neural_ai_all_maps').ALL_MAPS.filter(map => !map.customBuilder);
  const counts = new Map(standardModes.map(map => [map.id, 0]));
  assert.equal(latest.requestedGames, 13000);
  assert.equal(latest.completedGames, 13000);
  assert.equal(latest.games.length, 13000);
  assert.equal(latest.finalTrainedGames - latest.startingTrainedGames, 13000);
  assert.equal(latest.startingTrainedGames, backup.trainedGames);
  assert.equal(latest.startingModelSha256, crypto.createHash('sha256').update(backupBytes).digest('hex'));
  assert.equal(latest.trainingObjective, 'fast-victory-opponent-denial-v2');
  assert.equal(latest.mapSet, 'standard');
  assert.deepEqual([...latest.mapsCovered].sort(), standardModes.map(map => map.id).sort());
  assert.equal(new Set(latest.games.map(game => game.curriculumIndex)).size, 13000);
  for (const game of latest.games) {
    const mode = standardModes.find(map => map.id === game.mapId);
    assert.ok(mode, `Unknown mode: ${game.mapId}`);
    assert.equal(game.victoryPointsToWin, mode.victoryPoints);
    assert.equal(game.players, mode.players);
    assert.ok(game.winnerVp >= mode.victoryPoints);
    assert.ok(Number.isFinite(game.turnNumber) && game.turnNumber > 0);
    assert.equal(game.winnerMargin, game.winnerVp - game.highestOpponentVp);
    counts.set(game.mapId, counts.get(game.mapId) + 1);
  }
  for (const [mapId, count] of counts) {
    assert.equal(count, 1000, mapId);
    assert.equal(latest.byMap[mapId].games, 1000, mapId);
  }
  assert.equal(current.meta.inputSize, 17);
  assert.equal(current.meta.featureVersion, 4);
  assert.ok(current.params.w1.some(row => row.slice(12).some(weight => weight !== 0)));
  assert.ok(current.trainedGames >= latest.finalTrainedGames);
  if (current.trainedGames === latest.finalTrainedGames) {
    assert.equal(current.speedTraining.games - backup.speedTraining.games, 13000);
    assert.equal(latest.finalModelSha256, crypto.createHash('sha256').update(currentBytes).digest('hex'));
  }
  assert.notEqual(latest.startingModelSha256, latest.finalModelSha256);
});
