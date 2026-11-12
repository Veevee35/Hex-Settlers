'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { atomicWriteJson } = require('./training-file');
const { TRAINING_OBJECTIVE, upgradeNeuralModel } = require('../server/neural-objective');
const { assertFiniteModel, summarizeGames } = require('./train_neural_ai_distributed');

const ROOT = path.resolve(__dirname, '..');
const TRAINER = path.join(__dirname, 'train_neural_ai_all_maps.js');
const MODEL_PATH = path.resolve(process.env.MODEL_PATH || path.join(ROOT, 'neural_ai_model.json'));
const TOTAL_GAMES = Math.max(1, Math.floor(Number(process.env.SIMS || 20000)));
const GENERATION_GAMES = Math.max(1, Math.floor(Number(process.env.SELECTION_INTERVAL || 1000)));
const SHARDS = Math.max(1, Math.min(GENERATION_GAMES, Math.floor(Number(process.env.SHARDS || Math.min(4, os.cpus().length)))));
const BATCH_SIZE = Math.max(1, Math.floor(Number(process.env.BATCH_SIZE || 100)));
const CONCURRENCY = Math.max(1, Math.floor(Number(process.env.CONCURRENCY || 3)));
const MAP_SET = process.env.MAP_SET || 'standard';
const OUTPUT = path.resolve(process.env.TRAINING_OUTPUT || path.join(ROOT, 'scripts', 'output', `neural_ai_${TOTAL_GAMES}_evolutionary.json`));

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const hashBytes = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const hashFile = (file) => hashBytes(fs.readFileSync(file));

function performance(report) {
  const games = report.games || [];
  const count = Math.max(1, games.length);
  const averageTurn = games.reduce((sum, game) => sum + Number(game.turnNumber || 0), 0) / count;
  const averageMargin = games.reduce((sum, game) => sum + Number(game.winnerMargin || 0), 0) / count;
  // Higher is better: a full VP of margin is worth ten turns of victory speed.
  return { averageTurn, averageMargin, score: averageMargin - averageTurn / 10 };
}

function runCandidate(candidate, generationStart, totalProgress) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [TRAINER], {
      cwd: ROOT,
      env: {
        ...process.env,
        SIMS: String(candidate.games),
        MODEL_PATH: candidate.modelPath,
        TRAINING_OUTPUT: candidate.reportPath,
        CURRICULUM_OFFSET: String(candidate.offset),
        BATCH_SIZE: String(BATCH_SIZE),
        CONCURRENCY: String(CONCURRENCY),
        MAP_SET,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let buffer = '';
    let errors = '';
    child.stdout.on('data', (chunk) => {
      buffer += String(chunk);
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';
      for (const line of lines) {
        const match = line.match(/^\[train\]\s+(\d+)\/(\d+)/);
        if (!match) continue;
        const current = Number(match[1]);
        if (current > candidate.progress) {
          totalProgress.value += current - candidate.progress;
          candidate.progress = current;
          if (totalProgress.value >= totalProgress.nextReport) {
            process.stdout.write(`[evolution] ${generationStart + totalProgress.value}/${TOTAL_GAMES} completed\n`);
            totalProgress.nextReport += 50;
          }
        }
      }
    });
    child.stderr.on('data', (chunk) => {
      errors += String(chunk);
      if (errors.length > 20000) errors = errors.slice(-20000);
    });
    child.once('error', reject);
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`Candidate ${candidate.index + 1} exited ${code}:\n${errors}`)));
  });
}

async function main() {
  if (!fs.existsSync(MODEL_PATH)) throw new Error(`Model not found: ${MODEL_PATH}`);
  if (TOTAL_GAMES % GENERATION_GAMES !== 0) throw new Error('SIMS must be divisible by SELECTION_INTERVAL');
  const startedAt = new Date();
  const startingModel = upgradeNeuralModel(readJson(MODEL_PATH));
  const startingHash = hashFile(MODEL_PATH);
  fs.mkdirSync(path.join(ROOT, 'scripts', 'output'), { recursive: true });
  const tempRoot = fs.mkdtempSync(path.join(ROOT, 'scripts', 'output', '.neural-evolution-'));
  const generations = [];
  const allGames = [];
  let incumbent = startingModel;
  let incumbentBytes = fs.readFileSync(MODEL_PATH);
  let succeeded = false;
  console.log(`[evolution] checkpoints=${tempRoot}`);

  try {
    for (let generation = 0; generation < TOTAL_GAMES / GENERATION_GAMES; generation++) {
      const generationStart = generation * GENERATION_GAMES;
      const generationDir = path.join(tempRoot, `generation-${String(generation + 1).padStart(2, '0')}`);
      fs.mkdirSync(generationDir, { recursive: true });
      const candidates = [];
      let offset = generationStart;
      for (let index = 0; index < SHARDS; index++) {
        const games = Math.floor(GENERATION_GAMES / SHARDS) + (index < GENERATION_GAMES % SHARDS ? 1 : 0);
        const dir = path.join(generationDir, `candidate-${String(index + 1).padStart(2, '0')}`);
        fs.mkdirSync(dir, { recursive: true });
        const modelPath = path.join(dir, 'neural_ai_model.json');
        const reportPath = path.join(dir, 'report.json');
        fs.writeFileSync(modelPath, incumbentBytes);
        candidates.push({ index, games, offset, modelPath, reportPath, progress: 0 });
        offset += games;
      }

      const totalProgress = { value: 0, nextReport: 50 };
      await Promise.all(candidates.map((candidate) => runCandidate(candidate, generationStart, totalProgress)));
      const evaluated = candidates.map((candidate) => {
        const report = readJson(candidate.reportPath);
        const model = upgradeNeuralModel(readJson(candidate.modelPath));
        assertFiniteModel(model);
        if ((report.games || []).length !== candidate.games) throw new Error(`Candidate ${candidate.index + 1} report is incomplete`);
        return { candidate, report, model, ...performance(report) };
      }).sort((a, b) => b.score - a.score || a.averageTurn - b.averageTurn || b.averageMargin - a.averageMargin);

      const winner = evaluated[0];
      const previousHash = hashBytes(incumbentBytes);
      incumbent = JSON.parse(JSON.stringify(winner.model));
      incumbent.trainedGames = Number(startingModel.trainedGames || 0) + generationStart + GENERATION_GAMES;
      incumbent.meta = { ...(incumbent.meta || {}), trainingObjective: TRAINING_OBJECTIVE };
      assertFiniteModel(incumbent);
      incumbentBytes = Buffer.from(`${JSON.stringify(incumbent, null, 2)}\n`);
      await atomicWriteJson(MODEL_PATH, incumbent);

      const generationGames = evaluated.flatMap((entry) => entry.report.games || []);
      allGames.push(...generationGames);
      const record = {
        generation: generation + 1,
        games: GENERATION_GAMES,
        selectedCandidate: winner.candidate.index + 1,
        selectionScore: winner.score,
        averageVictoryTurn: winner.averageTurn,
        averageWinnerMargin: winner.averageMargin,
        previousModelSha256: previousHash,
        selectedModelSha256: hashFile(MODEL_PATH),
        candidates: evaluated.map((entry) => ({
          candidate: entry.candidate.index + 1,
          games: entry.candidate.games,
          score: entry.score,
          averageVictoryTurn: entry.averageTurn,
          averageWinnerMargin: entry.averageMargin,
        })),
      };
      generations.push(record);
      fs.writeFileSync(path.join(generationDir, 'selection.json'), `${JSON.stringify(record, null, 2)}\n`);
      console.log(`[evolution] generation ${generation + 1}/${TOTAL_GAMES / GENERATION_GAMES}: selected candidate ${record.selectedCandidate} score=${record.selectionScore.toFixed(4)}; propagated to all candidates`);
    }

    if (allGames.length !== TOTAL_GAMES) throw new Error(`Recorded ${allGames.length} games; expected ${TOTAL_GAMES}`);
    const templates = {};
    for (const game of allGames) if (!templates[game.mapId]) templates[game.mapId] = { label: game.mapId, victoryPointsToWin: game.victoryPointsToWin };
    const byMap = summarizeGames(allGames, templates);
    const report = {
      mode: 'evolutionary_neural_net_self_play',
      requestedGames: TOTAL_GAMES,
      completedGames: allGames.length,
      selectionInterval: GENERATION_GAMES,
      generations: generations.length,
      shards: SHARDS,
      childBatchSize: BATCH_SIZE,
      childConcurrency: CONCURRENCY,
      selectionRule: 'maximize averageWinnerMargin - averageVictoryTurn / 10',
      propagation: 'winning weights seed every candidate in the next generation',
      trainingObjective: TRAINING_OBJECTIVE,
      mapSet: MAP_SET,
      startingTrainedGames: Number(startingModel.trainedGames || 0),
      finalTrainedGames: Number(incumbent.trainedGames || 0),
      startingModelSha256: startingHash,
      finalModelSha256: hashFile(MODEL_PATH),
      averageVictoryTurn: allGames.reduce((sum, game) => sum + Number(game.turnNumber || 0), 0) / allGames.length,
      averageWinnerMargin: allGames.reduce((sum, game) => sum + Number(game.winnerMargin || 0), 0) / allGames.length,
      byMap,
      generationSelections: generations,
      games: allGames,
      startedAt: startedAt.toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt.getTime(),
    };
    await atomicWriteJson(OUTPUT, report);
    succeeded = true;
    console.log(JSON.stringify({ ...report, games: undefined, reportPath: OUTPUT }, null, 2));
  } finally {
    if (succeeded && String(process.env.KEEP_TRAINING_TEMP || '') !== '1') fs.rmSync(tempRoot, { recursive: true, force: true });
    else console.error(`[evolution] retained checkpoints at ${tempRoot}`);
  }
}

module.exports = { performance };
if (require.main === module) main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
