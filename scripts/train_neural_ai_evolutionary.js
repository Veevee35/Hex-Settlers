'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { atomicWriteJson, atomicWriteBytes, atomicWriteGameReport } = require('./training-file');
const { TRAINING_OBJECTIVE, upgradeNeuralModel } = require('../server/neural-objective');
const { POLICY_OBJECTIVE } = require('../server/neural-policy');
const { normalizeCandidatePriorities } = require('../server/neural-priorities');
const { assertFiniteModel, mergeModels, summarizeGames } = require('./train_neural_ai_distributed');
const { benchmarkSelection, QUALIFICATION_GAMES } = require('./benchmark-selection');
const { MAX_GAMES, PROFILES } = require('./neural-benchmark');

const ROOT = path.resolve(__dirname, '..');
const TRAINER = path.join(__dirname, 'train_neural_ai_all_maps.js');
const MODEL_PATH = path.resolve(process.env.MODEL_PATH || path.join(ROOT, 'neural_ai_model.json'));
const TOTAL_GAMES = Math.max(1, Math.floor(Number(process.env.SIMS || 20000)));
const GENERATION_GAMES = Math.max(1, Math.floor(Number(process.env.SELECTION_INTERVAL || 1000)));
const SHARDS = Math.max(1, Math.min(GENERATION_GAMES, Math.floor(Number(process.env.SHARDS || Math.min(4, os.cpus().length)))));
const BATCH_SIZE = Math.max(1, Math.floor(Number(process.env.BATCH_SIZE || 100)));
const CONCURRENCY = Math.max(1, Math.floor(Number(process.env.CONCURRENCY || 3)));
const MAP_SET = process.env.MAP_SET || 'standard';
const RULES = process.env.HEX_TRAINING_RULES === 'cpp' ? 'cpp' : 'javascript';
const VICTORY_POINTS = Number(process.env.VP_TO_WIN || 0);
const MAX_TURNS = Number(process.env.MAX_TRAINING_TURNS || 900);
const BENCHMARK_GAMES = Number(process.env.BENCHMARK_GAMES ?? PROFILES.release);
const STYLE_ROTATIONS = Number(process.env.BENCHMARK_STYLE_ROTATIONS ?? 2);
const PRIORITIES = normalizeCandidatePriorities(JSON.parse(process.env.TRAINING_CANDIDATE_PRIORITIES || '[]'), SHARDS);
const CONTROL_FILE = String(process.env.TRAINING_CONTROL_FILE || '').trim();
const isPaused = () => { try { return !!CONTROL_FILE && JSON.parse(fs.readFileSync(CONTROL_FILE, 'utf8')).pause === true; } catch (_) { return false; } };
const RESUME_RUN_DIR = String(process.env.RESUME_RUN_DIR || '').trim();
const OUTPUT = path.resolve(process.env.TRAINING_OUTPUT || path.join(ROOT, 'scripts', 'output', `neural_ai_${TOTAL_GAMES}_evolutionary.json`));

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const hashBytes = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const hashFile = (file) => hashBytes(fs.readFileSync(file));
const continuedLearningPath = path.join(ROOT, 'scripts', 'output', 'learning-checkpoints', `${hashBytes(MODEL_PATH)}.json`);

function readContinuedLearning(file, { championHash, profile }) {
  let saved;
  try { saved = readJson(file); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  if (saved.championHash !== championHash || saved.profile !== profile) return null;
  if (typeof saved.model !== 'string' || !/^\.neural-evolution-[a-zA-Z0-9-]+$/.test(saved.run)) {
    throw new Error('Invalid continuing checkpoint');
  }
  const bytes = Buffer.from(saved.model);
  if (hashBytes(bytes) !== saved.modelHash) throw new Error('Continuing checkpoint integrity failure');
  return { bytes, source: { run: saved.run, modelHash: saved.modelHash } };
}

function performance(report) {
  const games = report.games || [];
  const count = Math.max(1, games.length);
  const averageTurn = games.reduce((sum, game) => sum + Number(game.turnNumber || 0), 0) / count;
  const averageMargin = games.reduce((sum, game) => sum + Number(game.winnerMargin || 0), 0) / count;
  // Higher is better: a full VP of margin is worth ten turns of victory speed.
  return { averageTurn, averageMargin, score: averageMargin - averageTurn / 10 };
}

async function poolCandidates(startingModel, evaluated, priorities, directory) {
  const groups = new Map();
  for (const entry of evaluated) {
    const key = JSON.stringify(priorities[entry.candidate.index]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  }
  const group = [...groups.values()].sort((a, b) => b.length - a.length ||
    Math.min(...a.map(entry => entry.candidate.index)) - Math.min(...b.map(entry => entry.candidate.index)))[0];
  if (!group || group.length < 2) return null;
  group.sort((a, b) => a.candidate.index - b.candidate.index);
  const sourceCandidates = group.map(entry => entry.candidate.index + 1);
  const counts = group.map(entry => entry.candidate.games);
  const model = mergeModels(startingModel, group.map(entry => entry.model), counts);
  delete model.meta.lastCudaRefinement;
  const modelPath = path.join(directory, 'pooled_model.json');
  await atomicWriteJson(modelPath, model);
  return {
    candidate: { index: evaluated.length, modelPath, games: counts.reduce((total, count) => total + count, 0) },
    model, sourceCandidates,
  };
}

function runCandidate(candidate, generationStart, totalProgress, activeChildren, championPath, learnActions, learnStyles, learningLoop) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [TRAINER], {
      cwd: ROOT,
      env: {
        ...process.env,
        SIMS: String(candidate.games),
        MODEL_PATH: candidate.modelPath,
        TRAINING_OUTPUT: candidate.reportPath,
        CURRICULUM_OFFSET: String(candidate.offset),
        NEURAL_AI_PRIORITIES: JSON.stringify(PRIORITIES[candidate.index]),
        BATCH_SIZE: String(BATCH_SIZE),
        CONCURRENCY: String(CONCURRENCY),
        MAP_SET,
        TRAINING_ANCHOR_MODEL: championPath || '',
        TRAINING_ACTION_POLICY: learnActions ? '1' : '0',
        TRAINING_STYLE_POLICY: learnStyles ? '1' : '0',
        TRAINING_LEARNING_LOOP: String(learningLoop),
        RESUME_TRAINING: '1',
        KEEP_TRAINING_TEMP: process.env.KEEP_TRAINING_SCRATCH ?? process.env.KEEP_TRAINING_TEMP ?? '0',
      },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      windowsHide: true,
    });
    activeChildren.add(child);
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
        const match = line.match(/^\[train\]\s+(\d+)\/\d+ (checkpoint committed|resumed from)/);
        if (!match) continue;
        const current = Number(match[1]);
        if (current > candidate.progress) {
          totalProgress.value += current - candidate.progress;
          candidate.progress = current;
          const recovery = match[2] === 'resumed from' ? ' (recovered checkpoint)' : '';
          process.stdout.write(`[evolution] ${generationStart + totalProgress.value}/${TOTAL_GAMES} completed${recovery}\n`);
        }
      }
    });
    child.stderr.on('data', (chunk) => {
      errors += String(chunk);
      if (errors.length > 20000) errors = errors.slice(-20000);
    });
    child.on('error', error => { errors += `${error.message}\n`; });
    child.once('close', (code, signal) => {
      activeChildren.delete(child);
      if (code === 0 || code === 75) resolve(code);
      else reject(new Error(`Candidate ${candidate.index + 1} exited ${signal || code}:\n${errors}`));
    });
  });
}

async function main() {
  if (!fs.existsSync(MODEL_PATH)) throw new Error(`Model not found: ${MODEL_PATH}`);
  if (TOTAL_GAMES % GENERATION_GAMES !== 0) throw new Error('SIMS must be divisible by SELECTION_INTERVAL');
  if (!Number.isSafeInteger(BENCHMARK_GAMES) || (BENCHMARK_GAMES !== 0 && (BENCHMARK_GAMES < QUALIFICATION_GAMES || BENCHMARK_GAMES > MAX_GAMES))) {
    throw new Error(`BENCHMARK_GAMES must be 0 (legacy selection) or an integer from ${QUALIFICATION_GAMES} to ${MAX_GAMES}`);
  }
  if (!Number.isSafeInteger(STYLE_ROTATIONS) || STYLE_ROTATIONS < 1 || STYLE_ROTATIONS > 10) {
    throw new Error('BENCHMARK_STYLE_ROTATIONS must be an integer from 1 to 10');
  }
  const startedAt = new Date();
  const isResume = !!RESUME_RUN_DIR;
  fs.mkdirSync(path.join(ROOT, 'scripts', 'output'), { recursive: true });
  const tempRoot = isResume ? path.resolve(RESUME_RUN_DIR) : fs.mkdtempSync(path.join(ROOT, 'scripts', 'output', '.neural-evolution-'));
  if (isResume && !fs.statSync(tempRoot).isDirectory()) throw new Error(`Resume path is not a directory: ${tempRoot}`);
  const manifestPath = path.join(tempRoot, 'run.json');
  const originalModelPath = path.join(tempRoot, 'starting_model.json');
  const learningStartPath = path.join(tempRoot, 'starting_learning_model.json');
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
  let benchmark = BENCHMARK_GAMES && !isResume
    ? { games: BENCHMARK_GAMES, seed: crypto.randomUUID(), version: 4, styleRotations: STYLE_ROTATIONS } : null;
  let learnActions = !!benchmark && process.env.TRAINING_ACTION_POLICY !== '0';
  let learnStyles = learnActions;
  let learningStart;
  const trainingProfile = () => hashBytes(JSON.stringify({
    loop: benchmark?.version, learnActions, learnStyles, MAP_SET, RULES, VICTORY_POINTS, MAX_TURNS,
    priorities: [...new Set(PRIORITIES.map(priorities => JSON.stringify(priorities)))].sort(),
  }));
  if (fs.existsSync(manifestPath)) {
    const manifest = readJson(manifestPath);
    benchmark = manifest.benchmark || null;
    learnActions = manifest.learnActions === true;
    learnStyles = manifest.learnStyles === true;
    learningStart = manifest.learningStart;
    if (learningStart && hashFile(learningStartPath) !== learningStart.modelHash) throw new Error('Starting learning checkpoint integrity failure');
    if ((manifest.rules || 'javascript') !== RULES) throw new Error('Use the self-play rules backend from the saved run');
    if (manifest.totalGames !== TOTAL_GAMES || manifest.generationGames !== GENERATION_GAMES || manifest.shards !== SHARDS || manifest.mapSet !== MAP_SET || manifest.startingHash !== startingHash)
      throw new Error('Run parameters or base model differ from saved checkpoint. Use original SIMS, SELECTION_INTERVAL, SHARDS and MAP_SET.');
    if ((manifest.victoryPoints ?? 0) !== VICTORY_POINTS || (manifest.maxTurns ?? 900) !== MAX_TURNS ||
        JSON.stringify(normalizeCandidatePriorities(manifest.candidatePriorities, SHARDS)) !== JSON.stringify(PRIORITIES)) {
      throw new Error('Use the AI priorities, victory target, and turn limit from the saved run');
    }
  } else {
    if (benchmark?.version >= 4) {
      const previous = readContinuedLearning(continuedLearningPath, { championHash: startingHash, profile: trainingProfile() });
      if (previous) {
        await atomicWriteBytes(learningStartPath, previous.bytes);
        learningStart = previous.source;
        console.log(`[evolution] continuing learning from ${learningStart.run}`);
      }
    }
    await atomicWriteJson(manifestPath, {
      totalGames: TOTAL_GAMES, generationGames: GENERATION_GAMES, shards: SHARDS, mapSet: MAP_SET, rules: RULES,
      victoryPoints: VICTORY_POINTS, maxTurns: MAX_TURNS, candidatePriorities: PRIORITIES,
      startingHash, benchmark, learnActions, learnStyles, policyObjective: learnActions ? POLICY_OBJECTIVE : null,
      ...(learningStart ? { learningStart } : {}),
      accelerator: process.env.TRAINING_ACCELERATOR || 'cpu',
      gpuEpochs: Number(process.env.GPU_EPOCHS || 3), gpuMinibatch: Number(process.env.GPU_MINIBATCH || 256),
      childBatchSize: BATCH_SIZE, childConcurrency: CONCURRENCY, trainingObjective: TRAINING_OBJECTIVE,
      createdAt: startedAt.toISOString(),
    });
  }
  const generations = [];
  const allGames = [];
  let incumbentPath = learningStart ? learningStartPath : originalModelPath;
  let incumbentBytes = fs.readFileSync(incumbentPath);
  let incumbent = learningStart ? upgradeNeuralModel(JSON.parse(incumbentBytes)) : startingModel;
  let championPath = originalModelPath;
  let championHash = startingHash;
  const knownChampionHashes = new Set([startingHash]);
  async function publishChampion() {
    const current = hashFile(MODEL_PATH);
    if (current === championHash) return;
    if (!knownChampionHashes.has(current)) throw new Error('Local model changed after this run started. Restore its champion before resuming.');
    await atomicWriteBytes(MODEL_PATH, fs.readFileSync(championPath));
  }
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
      const championModelPath = path.join(generationDir, 'champion_model.json');
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
        incumbentPath = selectedModelPath;
        if (benchmark) {
          if (hashFile(championModelPath) !== record.championModelSha256) throw new Error('Champion checkpoint integrity failure');
          championPath = championModelPath;
          championHash = record.championModelSha256;
          knownChampionHashes.add(championHash);
        }
        allGames.push(...generationGames);
        generations.push(record);
        console.log(`[evolution] ${generationStart + GENERATION_GAMES}/${TOTAL_GAMES} completed (reused completed generation ${generation + 1})`);
        continue;
      }
      if (benchmark) await publishChampion();
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

      const totalProgress = { value: 0 };
      const pending = [];
      for (const candidate of candidates) {
        if (!fs.existsSync(candidate.reportPath)) {
          pending.push(candidate);
          continue;
        }
        const report = readJson(candidate.reportPath);
        if ((report.games || []).length !== candidate.games) throw new Error(`Existing candidate ${candidate.index + 1} report is incomplete`);
        candidate.progress = candidate.games;
        totalProgress.value += candidate.games;
        console.log(`[evolution] reused completed candidate ${candidate.index + 1} in generation ${generation + 1}`);
      }
      if (totalProgress.value) console.log(`[evolution] ${generationStart + totalProgress.value}/${TOTAL_GAMES} completed (recovered checkpoint)`);
      const activeChildren = new Set();
      const runs = await Promise.allSettled(pending.map(async candidate => {
        try {
          return await runCandidate(candidate, generationStart, totalProgress, activeChildren, benchmark ? championPath : null,
            learnActions, learnStyles, benchmark?.version >= 4 ? benchmark.version : 0);
        } catch (error) {
          console.error(`[evolution] Candidate ${candidate.index + 1} failed; pausing other candidates at their checkpoints.`);
          for (const child of activeChildren) {
            if (child.connected) child.send({ type: 'pause' }, () => {});
          }
          throw error;
        }
      }));
      const failure = runs.find(run => run.status === 'rejected');
      if (failure) throw failure.reason;
      if (runs.some(run => run.value === 75)) {
        console.log(`[evolution] paused at committed candidate batch; resume with RESUME_RUN_DIR=${tempRoot}`);
        process.exitCode = 75;
        return;
      }
      const evaluated = candidates.map((candidate) => {
        const report = readJson(candidate.reportPath);
        const model = upgradeNeuralModel(readJson(candidate.modelPath));
        assertFiniteModel(model);
        if ((report.games || []).length !== candidate.games) throw new Error(`Candidate ${candidate.index + 1} report is incomplete`);
        return { candidate, report, model, ...performance(report) };
      }).sort((a, b) => b.score - a.score || a.averageTurn - b.averageTurn || b.averageMargin - a.averageMargin);

      const pooled = benchmark?.version >= 3 ? await poolCandidates(incumbent, evaluated, PRIORITIES, generationDir) : null;
      const challengers = pooled ? [...evaluated, pooled] : evaluated;
      let evaluation = null;
      if (benchmark) {
        const controller = new AbortController();
        const timer = setInterval(() => { if (isPaused()) controller.abort(); }, 500);
        try {
          if (isPaused()) controller.abort();
          evaluation = await benchmarkSelection({
            candidates: challengers.map(({ candidate, sourceCandidates }) => ({
              index: candidate.index + 1, file: candidate.modelPath,
              pooled: !!sourceCandidates,
              label: `Generation ${generation + 1} · ${sourceCandidates ? 'Pooled checkpoint' : `Candidate ${candidate.index + 1}`}`,
            })).sort((a, b) => a.index - b.index),
            champion: { file: championPath, label: 'Training champion' }, settings: benchmark,
            incumbent: hashBytes(incumbentBytes) === championHash
              ? null : { file: incumbentPath, label: 'Previous training checkpoint' },
            runId: path.basename(tempRoot), generation: generation + 1, finalGeneration: generationStart + GENERATION_GAMES === TOTAL_GAMES,
            directory: generationDir, signal: controller.signal,
            context: { training: readJson(manifestPath) }, startingModelFile: originalModelPath,
            styleReference: learnStyles ? { file: originalModelPath, label: 'Starting model (style reference)' } : null,
            onProgress: (phase, done, count) => console.log(`[benchmark] generation ${generation + 1} ${phase}: ${done}/${count}`),
          });
        } catch (error) {
          if (!controller.signal.aborted) throw error;
          console.log('[evolution] paused during benchmark; completed evaluations and candidate weights retained');
          process.exitCode = 75;
          return;
        } finally { clearInterval(timer); }
      }
      const winner = evaluation
        ? challengers.find(entry => entry.candidate.index + 1 === (evaluation.promoted ?? evaluation.frontier))
        : evaluated[0];
      const previousHash = hashBytes(incumbentBytes);
      const retainIncumbent = benchmark?.version >= 3 && !winner && !evaluation?.resetToChampion;
      if (!retainIncumbent) incumbent = winner?.model || upgradeNeuralModel(readJson(championPath));
      if (!benchmark) {
        incumbent.trainedGames = Number(startingModel.trainedGames || 0) + generationStart + GENERATION_GAMES;
        incumbent.meta = { ...(incumbent.meta || {}), trainingObjective: TRAINING_OBJECTIVE };
      }
      assertFiniteModel(incumbent);
      if (!retainIncumbent) incumbentBytes = benchmark?.version >= 4
        ? fs.readFileSync(winner?.candidate.modelPath || championPath)
        : Buffer.from(`${JSON.stringify(incumbent, null, 2)}\n`);
      // Selected weights and records are durable before progressing. Reopening
      // this run does not retrain or discard already completed generations.
      await atomicWriteBytes(selectedModelPath, incumbentBytes);
      incumbentPath = selectedModelPath;
      if (benchmark) {
        const championBytes = fs.readFileSync(evaluation.promoted ? winner.candidate.modelPath : championPath);
        await atomicWriteBytes(championModelPath, championBytes);
        championPath = championModelPath;
        championHash = hashBytes(championBytes);
        knownChampionHashes.add(championHash);
      } else {
        await atomicWriteJson(MODEL_PATH, incumbent);
      }

      const generationGames = evaluated.flatMap((entry) => entry.report.games || []);
      allGames.push(...generationGames);
      const anchorGames = generationGames.filter(game => game.anchored);
      const scoredAnchorGames = anchorGames.filter(game => typeof game.learnerWon === 'boolean');
      const championModel = evaluation ? readJson(championPath) : incumbent;
      const record = {
        generation: generation + 1,
        games: GENERATION_GAMES,
        selectedCandidate: winner ? winner.candidate.index + 1 : null,
        selectionScore: winner?.score ?? null,
        averageVictoryTurn: winner?.averageTurn ?? null,
        averageWinnerMargin: winner?.averageMargin ?? null,
        work: {
          decisionSamples: generationGames.reduce((total, game) => total + (game.policyDecisions || 0), 0),
          anchoredGames: anchorGames.length,
          scoredAnchorGames: scoredAnchorGames.length,
          anchorWins: scoredAnchorGames.filter(game => game.learnerWon).length,
          anchorExpectedWins: scoredAnchorGames.reduce((total, game) => total + 1 / game.players, 0),
          continuedGames: winner?.candidate.games ?? 0,
          learningModelGames: Number(incumbent.trainedGames || 0),
          learningModelDecisions: incumbent.policy?.decisions ?? null,
          championModelGames: Number(championModel.trainedGames || 0),
          championModelDecisions: championModel.policy?.decisions ?? null,
        },
        previousModelSha256: previousHash,
        selectedModelSha256: hashFile(selectedModelPath),
        ...(benchmark ? { evaluation, championModelSha256: championHash } : {}),
        ...(pooled ? { pooledCandidate: { candidate: pooled.candidate.index + 1,
          sources: pooled.sourceCandidates, games: pooled.candidate.games } } : {}),
        candidates: evaluated.map((entry) => ({
          candidate: entry.candidate.index + 1,
          priorities: PRIORITIES[entry.candidate.index],
          games: entry.candidate.games,
          score: entry.score,
          averageVictoryTurn: entry.averageTurn,
          averageWinnerMargin: entry.averageMargin,
          policyDecisions: entry.report.policyDecisions || 0,
        })),
      };
      generations.push(record);
      await atomicWriteJson(selectionPath, record);
      if (evaluation) {
        if (evaluation.promoted) await publishChampion();
        const status = evaluation.promoted ? `promoted candidate ${evaluation.promoted}` : 'retained';
        const frontier = evaluation.frontier === pooled?.candidate.index + 1 ? 'pooled' :
          evaluation.frontier ?? (retainIncumbent ? 'retained' : 'champion');
        console.log(`[evolution] generation ${generation + 1}/${TOTAL_GAMES / GENERATION_GAMES}: frontier=${frontier}, champion=${status}`);
      } else {
        console.log(`[evolution] generation ${generation + 1}/${TOTAL_GAMES / GENERATION_GAMES}: selected candidate ${record.selectedCandidate} score=${record.selectionScore.toFixed(4)}; propagated to all candidates`);
      }
    }

    if (allGames.length !== TOTAL_GAMES) throw new Error(`Recorded ${allGames.length} games; expected ${TOTAL_GAMES}`);
    // After restoring completed generations, repair the public local model
    // from the matching selected snapshot (unless already identical).
    if (benchmark) await publishChampion();
    else if (hashFile(MODEL_PATH) !== hashBytes(incumbentBytes)) await atomicWriteJson(MODEL_PATH, incumbent);
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
      selectionRule: benchmark ? 'rotating-seat competitive screening and independent champion qualification' : 'maximize averageWinnerMargin - averageVictoryTurn / 10',
      propagation: benchmark?.version >= 4 ? 'continue pooled learning and reset confirmed regressions; promote only independently qualified challengers' :
        benchmark?.version >= 3 ? 'independently confirmed improvements seed the next generation' :
        benchmark ? 'screened weights seed the next generation; only qualified models replace the champion' : 'winning weights seed every candidate in the next generation',
      benchmark,
      learnActions,
      learnStyles,
      policyObjective: learnActions ? POLICY_OBJECTIVE : null,
      policyDecisions: allGames.reduce((total, game) => total + (game.policyDecisions || 0), 0),
      trainingObjective: TRAINING_OBJECTIVE,
      mapSet: MAP_SET,
      victoryPointsToWin: VICTORY_POINTS || 'scenario-defaults',
      maxTurns: MAX_TURNS,
      resumedFrom: isResume ? tempRoot : null,
      scenariosReplaced: allGames.filter(game => game.requestedMapId).length,
      startingTrainedGames: Number(startingModel.trainedGames || 0),
      ...(learningStart ? { continuedLearningFrom: learningStart.run } : {}),
      finalTrainedGames: Number((benchmark ? readJson(championPath) : incumbent).trainedGames || 0),
      frontierTrainedGames: Number(incumbent.trainedGames || 0),
      startingModelSha256: startingHash,
      finalModelSha256: hashFile(MODEL_PATH),
      averageVictoryTurn: allGames.reduce((sum, game) => sum + Number(game.turnNumber || 0), 0) / allGames.length,
      averageWinnerMargin: allGames.reduce((sum, game) => sum + Number(game.winnerMargin || 0), 0) / allGames.length,
      byMap,
      generationSelections: generations,
      startedAt: startedAt.toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt.getTime(),
    };
    await atomicWriteGameReport(OUTPUT, report, allGames);
    if (benchmark?.version >= 4) {
      await atomicWriteJson(continuedLearningPath, {
        championHash, profile: trainingProfile(), modelHash: hashBytes(incumbentBytes),
        run: path.basename(tempRoot), model: incumbentBytes.toString('utf8'),
      });
    }
    succeeded = true;
    console.log(`[evolution] report=${OUTPUT}`);
  } finally {
    if (succeeded && !benchmark && String(process.env.KEEP_TRAINING_TEMP || '') !== '1') fs.rmSync(tempRoot, { recursive: true, force: true });
    else console.log(`[evolution] retained checkpoints at ${tempRoot}`);
  }
}

module.exports = { performance, poolCandidates, readContinuedLearning };
if (require.main === module) main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
