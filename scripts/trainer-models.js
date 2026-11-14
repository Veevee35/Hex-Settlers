'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { FEATURE_NAMES, upgradeNeuralModel } = require('../server/neural-objective');
const { assertFiniteModel } = require('./train_neural_ai_distributed');

function validateImportedModel(value) {
  const params = value?.params ?? value;
  const { w1, b1, w2, b2 } = params || {};
  const inputSize = w1?.[0]?.length;
  const hiddenSize = w1?.length;
  if (!Array.isArray(w1) || hiddenSize !== 8 || ![12, FEATURE_NAMES.length].includes(inputSize) ||
      !w1.every(row => Array.isArray(row) && row.length === inputSize) ||
      !Array.isArray(b1) || b1.length !== hiddenSize || !Array.isArray(w2) || w2.length !== hiddenSize) {
    throw new Error('Expected an 8-unit Hex Settlers model with 17 inputs or 12 legacy inputs');
  }
  const trainedGames = value.trainedGames ?? 0;
  if ((value.version ?? 1) !== 1 || !Number.isSafeInteger(trainedGames) || trainedGames < 0) {
    throw new Error('Invalid model version or trained-game count');
  }
  const model = {
    version: 1, trainedGames,
    ...(value.meta && typeof value.meta === 'object' && !Array.isArray(value.meta) ? { meta: value.meta } : {}),
    ...(value.speedTraining && typeof value.speedTraining === 'object' && !Array.isArray(value.speedTraining)
      ? { speedTraining: value.speedTraining } : {}),
    params: { w1: w1.map(row => [...row]), b1, w2, b2 },
  };
  assertFiniteModel(model);
  return upgradeNeuralModel(model);
}

function listWeightSnapshots(directory) {
  if (!directory || !fs.existsSync(directory)) return [];
  const snapshots = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^generation-\d+$/.test(entry.name)) continue;
    const generation = Number(entry.name.slice('generation-'.length));
    const dir = path.join(directory, entry.name);
    const selected = path.join(dir, 'selected_model.json');
    if (fs.existsSync(path.join(dir, 'selection.json')) && fs.existsSync(selected)) {
      snapshots.push({ id: `${entry.name}-selected`, label: `Generation ${generation} · Selected model`, file: selected });
    }
    for (const candidateEntry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!candidateEntry.isDirectory() || !/^candidate-\d+$/.test(candidateEntry.name)) continue;
      const candidate = Number(candidateEntry.name.slice('candidate-'.length));
      const candidateDir = path.join(dir, candidateEntry.name);
      const model = path.join(candidateDir, 'neural_ai_model.json');
      const checkpoint = path.join(candidateDir, 'report.json.checkpoint.json');
      const completed = fs.existsSync(path.join(candidateDir, 'report.json'));
      const file = completed ? model : checkpoint;
      if (fs.existsSync(file)) {
        snapshots.push({
          id: `${entry.name}-${candidateEntry.name}`,
          label: `Generation ${generation} · Candidate ${candidate}${completed ? '' : ' (checkpoint)'}`,
          file, checkpoint: !completed,
        });
      }
    }
  }
  return snapshots.sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true }));
}

module.exports = { validateImportedModel, listWeightSnapshots };
