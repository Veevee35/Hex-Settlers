'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const TRAINER_PATH = path.join(__dirname, 'train_neural_ai_all_maps.js');
const MODEL_PATH = path.resolve(process.env.MODEL_PATH || path.join(PROJECT_ROOT, 'neural_ai_model.json'));
const TOTAL_GAMES = Math.max(1, Math.floor(Number(process.env.SIMS || 5000)));
const SHARD_COUNT = Math.max(1, Math.min(TOTAL_GAMES, Math.floor(Number(process.env.SHARDS || Math.min(12, os.cpus().length)))));
const CHILD_BATCH_SIZE = Math.max(1, Math.floor(Number(process.env.BATCH_SIZE || 20)));
const CHILD_CONCURRENCY = Math.max(1, Math.floor(Number(process.env.CONCURRENCY || 10)));
const OUTPUT_PATH = path.resolve(process.env.TRAINING_OUTPUT || path.join(PROJECT_ROOT, 'scripts', 'output', `neural_ai_${TOTAL_GAMES}_fast_victory_all_scenarios.json`));

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function assertFiniteModel(model) {
  const params = model?.params || {};
  const numbers = [
    ...(params.w1 || []).flat(),
    ...(params.b1 || []),
    ...(params.w2 || []),
    params.b2,
  ];
  if (!numbers.length || !numbers.every(Number.isFinite)) throw new Error('Merged model contains invalid parameters');
}

function mergeModels(startingModel, models, gameCounts) {
  const totalWeight = gameCounts.reduce((sum, count) => sum + count, 0);
  const merged = JSON.parse(JSON.stringify(startingModel));
  const weighted = (getter) => models.reduce((sum, model, index) => sum + Number(getter(model) || 0) * gameCounts[index], 0) / totalWeight;

  merged.params.w1 = startingModel.params.w1.map((row, rowIndex) => row.map((_, columnIndex) => weighted((model) => model.params.w1[rowIndex][columnIndex])));
  merged.params.b1 = startingModel.params.b1.map((_, index) => weighted((model) => model.params.b1[index]));
  merged.params.w2 = startingModel.params.w2.map((_, index) => weighted((model) => model.params.w2[index]));
  merged.params.b2 = weighted((model) => model.params.b2);
  merged.trainedGames = Math.max(0, Number(startingModel.trainedGames || 0)) + totalWeight;
  merged.meta = {
    ...(models[0]?.meta || startingModel.meta || {}),
    featureVersion: 3,
    trainingObjective: 'discounted-fastest-victory-v1',
  };

  const initialSpeed = startingModel.speedTraining || { games: 0, totalTurns: 0, bestTurns: null };
  let addedSpeedGames = 0;
  let addedTurns = 0;
  let bestTurns = initialSpeed.bestTurns == null ? Infinity : Number(initialSpeed.bestTurns);
  for (const model of models) {
    const speed = model.speedTraining || {};
    addedSpeedGames += Math.max(0, Number(speed.games || 0) - Number(initialSpeed.games || 0));
    addedTurns += Math.max(0, Number(speed.totalTurns || 0) - Number(initialSpeed.totalTurns || 0));
    if (Number.isFinite(Number(speed.bestTurns))) bestTurns = Math.min(bestTurns, Number(speed.bestTurns));
  }
  const speedGames = Number(initialSpeed.games || 0) + addedSpeedGames;
  const speedTurns = Number(initialSpeed.totalTurns || 0) + addedTurns;
  merged.speedTraining = {
    games: speedGames,
    totalTurns: speedTurns,
    bestTurns: Number.isFinite(bestTurns) ? bestTurns : null,
    averageTurns: speedGames ? speedTurns / speedGames : 0,
  };
  assertFiniteModel(merged);
  return merged;
}

function summarizeGames(games, mapTemplates) {
  const byMap = {};
  for (const [mapId, template] of Object.entries(mapTemplates)) {
    byMap[mapId] = {
      label: template.label,
      victoryPointsToWin: template.victoryPointsToWin,
      games: 0,
      totalTurns: 0,
      minTurn: Infinity,
      maxTurn: 0,
      goldProductionCards: 0,
    };
  }
  for (const game of games) {
    const summary = byMap[game.mapId];
    if (!summary) continue;
    summary.games += 1;
    summary.totalTurns += Number(game.turnNumber || 0);
    summary.minTurn = Math.min(summary.minTurn, Number(game.turnNumber || 0));
    summary.maxTurn = Math.max(summary.maxTurn, Number(game.turnNumber || 0));
    summary.goldProductionCards += Number(game.goldProductionCards || 0);
  }
  for (const summary of Object.values(byMap)) {
    summary.averageTurn = summary.games ? summary.totalTurns / summary.games : 0;
    if (!Number.isFinite(summary.minTurn)) summary.minTurn = 0;
    delete summary.totalTurns;
  }
  return byMap;
}

function runShard(shard, progress, onProgress) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [TRAINER_PATH], {
      cwd: PROJECT_ROOT,
      env: {
        ...process.env,
        SIMS: String(shard.games),
        MODEL_PATH: shard.modelPath,
        TRAINING_OUTPUT: shard.reportPath,
        CURRICULUM_OFFSET: String(shard.offset),
        BATCH_SIZE: String(CHILD_BATCH_SIZE),
        CONCURRENCY: String(CHILD_CONCURRENCY),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let lineBuffer = '';
    let errors = '';
    child.stdout.on('data', (chunk) => {
      lineBuffer += String(chunk);
      const lines = lineBuffer.split(/\r?\n/);
      lineBuffer = lines.pop() || '';
      for (const line of lines) {
        const match = line.match(/^\[train\]\s+(\d+)\/(\d+)/);
        if (!match) continue;
        progress[shard.index] = Math.max(progress[shard.index] || 0, Number(match[1]));
        onProgress();
      }
    });
    child.stderr.on('data', (chunk) => {
      errors += String(chunk);
      if (errors.length > 20_000) errors = errors.slice(-20_000);
    });
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code !== 0) reject(new Error(`Training shard ${shard.index + 1} exited ${code}:\n${errors}`));
      else resolve();
    });
  });
}

async function main() {
  if (!fs.existsSync(MODEL_PATH)) throw new Error(`Model not found: ${MODEL_PATH}`);
  const startedAt = new Date();
  const startingModel = readJson(MODEL_PATH);
  const startingHash = sha256(MODEL_PATH);
  const tempRoot = fs.mkdtempSync(path.join(PROJECT_ROOT, 'scripts', 'output', '.neural-shards-'));
  const shards = [];
  let offset = 0;
  for (let index = 0; index < SHARD_COUNT; index++) {
    const games = Math.floor(TOTAL_GAMES / SHARD_COUNT) + (index < (TOTAL_GAMES % SHARD_COUNT) ? 1 : 0);
    const dir = path.join(tempRoot, `shard-${String(index + 1).padStart(2, '0')}`);
    fs.mkdirSync(dir, { recursive: true });
    const modelPath = path.join(dir, 'neural_ai_model.json');
    const reportPath = path.join(dir, 'report.json');
    fs.copyFileSync(MODEL_PATH, modelPath);
    shards.push({ index, games, offset, dir, modelPath, reportPath });
    offset += games;
  }

  let succeeded = false;
  try {
    const progress = Array(SHARD_COUNT).fill(0);
    let lastReported = 0;
    const onProgress = () => {
      const completed = progress.reduce((sum, value) => sum + value, 0);
      if (completed >= lastReported + 50 || completed === TOTAL_GAMES) {
        lastReported = completed;
        process.stdout.write(`[distributed] ${completed}/${TOTAL_GAMES} completed across ${SHARD_COUNT} shards\n`);
      }
    };
    await Promise.all(shards.map((shard) => runShard(shard, progress, onProgress)));

    const reports = shards.map((shard) => readJson(shard.reportPath));
    const models = shards.map((shard) => readJson(shard.modelPath));
    for (let index = 0; index < shards.length; index++) {
      const expected = Number(startingModel.trainedGames || 0) + shards[index].games;
      if (Number(models[index].trainedGames || 0) !== expected) {
        throw new Error(`Shard ${index + 1} trainedGames=${models[index].trainedGames}; expected ${expected}`);
      }
    }

    const mergedModel = mergeModels(startingModel, models, shards.map((shard) => shard.games));
    fs.writeFileSync(MODEL_PATH, `${JSON.stringify(mergedModel, null, 2)}\n`, 'utf8');

    const games = reports.flatMap((report) => report.games || [])
      .sort((a, b) => Number(a.curriculumIndex || 0) - Number(b.curriculumIndex || 0))
      .map((game, index) => ({ ...game, sessionIndex: index }));
    const mapTemplates = {};
    for (const report of reports) {
      for (const [mapId, summary] of Object.entries(report.byMap || {})) mapTemplates[mapId] = summary;
    }
    const byMap = summarizeGames(games, mapTemplates);
    const completedGames = games.length;
    if (completedGames !== TOTAL_GAMES) throw new Error(`Merged report has ${completedGames} games; expected ${TOTAL_GAMES}`);

    const report = {
      mode: 'distributed_neural_net_self_play',
      requestedGames: TOTAL_GAMES,
      completedGames,
      shards: SHARD_COUNT,
      childBatchSize: CHILD_BATCH_SIZE,
      childConcurrency: CHILD_CONCURRENCY,
      victoryPointsToWin: 'scenario-defaults',
      trainingObjective: 'discounted-fastest-victory-v1',
      aggregation: 'weighted-parameter-average',
      mapsCovered: Object.keys(byMap),
      startingTrainedGames: Number(startingModel.trainedGames || 0),
      finalTrainedGames: Number(mergedModel.trainedGames || 0),
      startingModelSha256: startingHash,
      finalModelSha256: sha256(MODEL_PATH),
      totalGoldProductionCards: games.reduce((sum, game) => sum + Number(game.goldProductionCards || 0), 0),
      averageVictoryTurn: games.reduce((sum, game) => sum + Number(game.turnNumber || 0), 0) / Math.max(1, completedGames),
      byMap,
      games,
      startedAt: startedAt.toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt.getTime(),
    };
    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    succeeded = true;
    console.log(JSON.stringify({ ...report, games: undefined, reportPath: OUTPUT_PATH }, null, 2));
  } finally {
    if (succeeded || String(process.env.KEEP_TRAINING_TEMP || '') !== '1') fs.rmSync(tempRoot, { recursive: true, force: true });
    else console.error(`[distributed] retained failed shard data at ${tempRoot}`);
  }
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
