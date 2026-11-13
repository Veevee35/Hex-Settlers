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
const CONTROL_FILE = String(process.env.TRAINING_CONTROL_FILE || '').trim();
const isPaused = () => { try { return !!CONTROL_FILE && JSON.parse(fs.readFileSync(CONTROL_FILE, 'utf8')).pause === true; } catch (_) { return false; } };
const RESUME_RUN_DIR = String(process.env.RESUME_RUN_DIR || '').trim();
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
        RESUME_TRAINING: '1',
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
        if (/^\[(cuda|train)\]/.test(line)) {
          // Forward status and CUDA optimization results to the local GUI.
          // Avoid dumping the final JSON report, but preserve training errors.
          process.stdout.write(`[candidate ${candidate.index + 1}] ${line}\n`);
        }
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
    child.once('exit', (code) => code === 0 ? resolve() : reject(Object.assign(new Error(`Candidate ${candidate.index + 1} exited ${code}:\n${errors}`), { paused: code === 75 && isPaused() })));
  });
}

async function main() {
  if (!fs.existsSync(MODEL_PATH)) throw new Error(`Model not found: ${MODEL_PATH}`);
  if (TOTAL_GAMES % GENERATION_GAMES !== 0) throw new Error('SIMS must be divisible by SELECTION_INTERVAL');
  const startedAt = new Date();
  const isResume = !!RESUME_RUN_DIR;
  fs.mkdirSync(path.join(ROOT, 'scripts', 'output'), { recursive: true });
  const tempRoot = isResume ? path.resolve(RESUME_RUN_DIR) : fs.mkdtempSync(path.join(ROOT, 'scripts', 'output', '.neural-evolution-'));
  if (isResume && !fs.statSync(tempRoot).isDirectory()) throw new Error(`Resume path is not a directory: ${tempRoot}`);
  const manifestPath = path.join(tempRoot, 'run.json');
  const originalModelPath = path.join(tempRoot, 'starting_model.json');
  if (!isResume) fs.copyFileSync(MODEL_PATH, originalModelPath);
  if (isResume && !fs.existsSync(originalModelPath)) {
    // Backward-compatible recovery of the 1.0.52 generation-1 failure: candidate
    // files still contain the untouched starting model until their final report.
    let legacyBase = null;
    for (let index = 1; index <= SHARDS; index++) {
      const dir = path.join(tempRoot, 'generation-01', `candidate-${String(index).padStart(2, '0')}`);
      const candidatePath = path.join(dir, 'neural_ai_model.json');
      const reportPath = path.join(dir, 'report.json');
      if (!fs.existsSync(candidatePath) || fs.existsSync(reportPath)) continue;
      const checkpointPath = `${reportPath}.checkpoint.json`;
      if (fs.existsSync(checkpointPath) && Number(readJson(candidatePath).trainedGames) !== Number(readJson(checkpointPath).startingTrainedGames)) continue;
      legacyBase = candidatePath;
      break;
    }
    // An old generation could have completed every candidate immediately
    // before selection; in that case root weights still equal the original.
    if (!legacyBase) {
      const firstReport = path.join(tempRoot, 'generation-01', 'candidate-01', 'report.json');
      if (fs.existsSync(firstReport) && readJson(firstReport).startingModelSha256 === hashFile(MODEL_PATH)) legacyBase = MODEL_PATH;
    }
    if (!legacyBase) throw new Error('Old checkpoint cannot safely determine its original model; keep it for manual recovery');
    fs.copyFileSync(legacyBase, originalModelPath);
    console.log('[evolution] recovered V1.0.52 starting model from unfinished first generation');
  }
  const startingModel = upgradeNeuralModel(readJson(originalModelPath));
  const startingHash = hashFile(originalModelPath);
  if (fs.existsSync(manifestPath)) {
    const manifest = readJson(manifestPath);
    if (manifest.totalGames !== TOTAL_GAMES || manifest.generationGames !== GENERATION_GAMES || manifest.shards !== SHARDS || manifest.mapSet !== MAP_SET || manifest.startingHash !== startingHash)
      throw new Error('Run parameters or base model differ from saved checkpoint. Use original SIMS, SELECTION_INTERVAL, SHARDS and MAP_SET.');
  } else {
    fs.writeFileSync(manifestPath, JSON.stringify({ totalGames: TOTAL_GAMES, generationGames: GENERATION_GAMES, shards: SHARDS, mapSet: MAP_SET, startingHash, createdAt: startedAt.toISOString() }, null, 2));
  }
  const generations = [];
  const allGames = [];
  let incumbent = startingModel;
  let incumbentBytes = fs.readFileSync(originalModelPath);
  let succeeded = false;
  console.log(`[evolution] ${isResume ? 'resuming' : 'checkpoints'}=${tempRoot}`);

  try {
    for (let generation = 0; generation < TOTAL_GAMES / GENERATION_GAMES; generation++) {
      if (isPaused()) {
        console.log(`[evolution] pause requested at generation boundary; checkpoints retained at ${tempRoot}`);
        process.exitCode = 75;
        return;
      }
      const generationStart = generation * GENERATION_GAMES;
      const generationDir = path.join(tempRoot, `generation-${String(generation + 1).padStart(2, '0')}`);
      fs.mkdirSync(generationDir, { recursive: true });
      const selectionPath = path.join(generationDir, 'selection.json');
      const selectedModelPath = path.join(generationDir, 'selected_model.json');
      if (isResume && fs.existsSync(selectionPath)) {
        if (!fs.existsSync(selectedModelPath)) throw new Error(`Cannot resume generation ${generation + 1}: selected model snapshot missing`);
        const record = readJson(selectionPath);
        if (record.generation !== generation + 1 || !Array.isArray(record.candidates)) throw new Error('Invalid generation selection checkpoint');
        const generationGames = [];
        for (let index = 0; index < SHARDS; index++) {
          const reportPath = path.join(generationDir, `candidate-${String(index + 1).padStart(2, '0')}`, 'report.json');
          if (!fs.existsSync(reportPath)) throw new Error(`Missing candidate report in completed generation ${generation + 1}`);
          generationGames.push(...(readJson(reportPath).games || []));
        }
        if (generationGames.length !== GENERATION_GAMES) throw new Error(`Generation ${generation + 1} is incomplete`);
        incumbentBytes = fs.readFileSync(selectedModelPath);
        if (hashBytes(incumbentBytes) !== record.selectedModelSha256) throw new Error('Selected model checkpoint integrity failure');
        incumbent = readJson(selectedModelPath);
        allGames.push(...generationGames);
        generations.push(record);
        console.log(`[evolution] reused completed generation ${generation + 1}/${TOTAL_GAMES / GENERATION_GAMES}`);
        continue;
      }
      const candidates = [];
      let offset = generationStart;
      for (let index = 0; index < SHARDS; index++) {
        const games = Math.floor(GENERATION_GAMES / SHARDS) + (index < GENERATION_GAMES % SHARDS ? 1 : 0);
        const dir = path.join(generationDir, `candidate-${String(index + 1).padStart(2, '0')}`);
        fs.mkdirSync(dir, { recursive: true });
        const modelPath = path.join(dir, 'neural_ai_model.json');
        const reportPath = path.join(dir, 'report.json');
        if (!fs.existsSync(modelPath)) fs.writeFileSync(modelPath, incumbentBytes);
        candidates.push({ index, games, offset, modelPath, reportPath, progress: 0 });
        offset += games;
      }

      const totalProgress = { value: 0, nextReport: 50 };
      try {
        await Promise.all(candidates.map((candidate) => {
        if (!fs.existsSync(candidate.reportPath)) return runCandidate(candidate, generationStart, totalProgress);
        const report = readJson(candidate.reportPath);
        if ((report.games || []).length !== candidate.games) throw new Error(`Existing candidate ${candidate.index + 1} report is incomplete`);
        candidate.progress = candidate.games;
        totalProgress.value += candidate.games;
        console.log(`[evolution] reused completed candidate ${candidate.index + 1} in generation ${generation + 1}`);
        return Promise.resolve();
        }));
      } catch (error) {
        if (isPaused() && error.paused) {
          console.log(`[evolution] paused at committed candidate batch; resume with RESUME_RUN_DIR=${tempRoot}`);
          process.exitCode = 75;
          return;
        }
        throw error;
      }
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
      // Selected weights and records are durable before progressing. Reopening
      // this run does not retrain or discard already completed generations.
      await atomicWriteJson(selectedModelPath, incumbent);
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
        selectedModelSha256: hashFile(selectedModelPath),
        candidates: evaluated.map((entry) => ({
          candidate: entry.candidate.index + 1,
          games: entry.candidate.games,
          score: entry.score,
          averageVictoryTurn: entry.averageTurn,
          averageWinnerMargin: entry.averageMargin,
        })),
      };
      generations.push(record);
      await atomicWriteJson(selectionPath, record);
      console.log(`[evolution] generation ${generation + 1}/${TOTAL_GAMES / GENERATION_GAMES}: selected candidate ${record.selectedCandidate} score=${record.selectionScore.toFixed(4)}; propagated to all candidates`);
    }

    if (allGames.length !== TOTAL_GAMES) throw new Error(`Recorded ${allGames.length} games; expected ${TOTAL_GAMES}`);
    // After restoring completed generations, repair the public local model
    // from the matching selected snapshot (unless already identical).
    if (hashFile(MODEL_PATH) !== hashBytes(incumbentBytes)) await atomicWriteJson(MODEL_PATH, incumbent);
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
      resumedFrom: isResume ? tempRoot : null,
      scenariosReplaced: allGames.filter(game => game.requestedMapId).length,
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
