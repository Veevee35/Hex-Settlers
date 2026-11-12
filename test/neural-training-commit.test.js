'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { victoryTrainingTarget } = require('../server/neural-objective');
const { parseClientMessage } = require('../server/protocol');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const trainer = fs.readFileSync(path.join(root, 'scripts', 'train_neural_ai_all_maps.js'), 'utf8');
const original = JSON.parse(fs.readFileSync(path.join(root, 'neural_ai_model.json'), 'utf8'));

// Exercise the production trainer functions directly with a small, deterministic
// terminal game. This test needs no network or live WebSocket dependency.
function makeContext(save = () => Promise.resolve()) {
  const gameFns = source.slice(source.indexOf('function neuralPlayersInGame('), source.indexOf('function checkWin('));
  assert.ok(gameFns.startsWith('function neuralPlayersInGame('));
  const model = structuredClone(original);
  const context = vm.createContext({
    NEURAL_AI_MODEL: model,
    NEURAL_FEATURE_NAMES: original.meta.featureNames,
    NEURAL_FEATURE_VERSION: original.meta.featureVersion,
    NEURAL_TRAINING_OBJECTIVE: original.meta.trainingObjective,
    neuralFeaturesFromState(_game, pid) {
      return [pid === 'ai_winner' ? 0.9 : 0.6, 0.2, 0.4, 0, 0.4, 0.3, 0.2, 0.4, 0.2, 0.1, 0, 1, 0.8, 0.6, 0.1, 0.2, 0.1];
    },
    neuralModelPredict(x) {
      const prm = model.params;
      const hidden = prm.w1.map((row, i) => Math.tanh((prm.b1[i] || 0) + row.reduce((a, w, j) => a + w * x[j], 0)));
      return { hidden, out: Math.tanh(prm.b2 + hidden.reduce((a, h, i) => a + h * prm.w2[i], 0)) };
    },
    victoryTrainingTarget,
    saveNeuralAiModel: save,
    createDefaultNeuralAiModel: () => structuredClone(original),
    console,
  });
  vm.runInContext(gameFns, context);
  return { context, model };
}

function finishedGame() {
  return {
    id: 'training-game-1', phase: 'game-over', winnerId: 'ai_winner', turnNumber: 54,
    rules: { victoryPointsToWin: 10 },
    players: [
      { id: 'ai_winner', isAI: true, aiDifficulty: 'neural_net', vp: 10 },
      { id: 'ai_runnerup', isAI: true, aiDifficulty: 'neural_net', vp: 8 },
    ],
  };
}

test('terminal self-play increments and commits model exactly once', async () => {
  let saves = 0;
  const { context, model } = makeContext(() => { saves++; return Promise.resolve(); });
  const game = finishedGame();
  const prior = model.trainedGames;
  assert.equal(vm.runInContext('trainNeuralAiFromFinishedGame', context)(game), true);
  assert.equal(model.trainedGames, prior + 1);
  assert.equal(game._neuralTrainingCommit.gameId, game.id);
  assert.equal(game._neuralTrainingCommit.trainedGames, prior + 1);
  assert.equal(Object.keys(game).includes('_neuralTrainingCommit'), false);
  assert.equal((await game._neuralTrainingCommit.promise).ok, true);
  assert.equal(vm.runInContext('trainNeuralAiFromFinishedGame', context)(game), undefined);
  assert.equal(model.trainedGames, prior + 1);
  assert.equal(saves, 1);
});

test('save failure is visible to receipt instead of silently counting a finished game', async () => {
  const { context } = makeContext(() => Promise.reject(new Error('disk unavailable')));
  const game = finishedGame();
  assert.equal(vm.runInContext('trainNeuralAiFromFinishedGame', context)(game), true);
  assert.deepEqual(JSON.parse(JSON.stringify(await game._neuralTrainingCommit.promise)), { ok: false, error: 'disk unavailable' });
});

test('non-neural finished game is refused, rather than counted as trained', () => {
  const { context, model } = makeContext();
  const game = finishedGame();
  game.players.forEach(player => { player.aiDifficulty = 'easy'; });
  const prev = model.trainedGames;
  assert.equal(vm.runInContext('trainNeuralAiFromFinishedGame', context)(game), undefined);
  assert.equal(model.trainedGames, prev);
  assert.equal(game._neuralTrainingCommit, undefined);
});

test('local runner asks for the durable training receipt before crediting a win', () => {
  assert.match(trainer, /peer\.send\(\{ type: 'get_training_receipt' \}\)/);
  assert.match(trainer, /if \(!receipt\.ok \|\| receipt\.gameId !== state\.id/);
  assert.match(source, /if \(msg\.type === 'get_training_receipt'\)/);
  assert.match(source, /await commit\.promise/);
  assert.equal(parseClientMessage(JSON.stringify({ type: 'get_training_receipt' })).ok, true);
  assert.match(source, /room\.game\.phase === 'game-over' && room\.game\.winnerId && !room\.game\._neuralTrained/);
});
