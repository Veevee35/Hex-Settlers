#!/usr/bin/env node
'use strict';
/**
 * Local-only neural training dashboard. No Electron build, cloud account, or
 * production API is involved: it simply supervises the existing trainer.
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { ensureCuda } = require('./neural-gpu');
const { atomicWriteJson } = require('./training-file');
const { validateImportedModel, listWeightSnapshots } = require('./trainer-models');
const {
  listTrainingRuns, openTrainingRun, trainingProgression, summarizeTrainingRun,
  trainingGamePage, exportTrainingRun,
} = require('./trainer-analytics');
const { PRIORITIES, normalizeCandidatePriorities } = require('../server/neural-priorities');
const {
  OUTPUT: BENCHMARK_OUTPUT, PROFILES, MAX_GAMES, SCENARIOS, REFERENCE_LOBBY,
  listBenchmarks, runBenchmark, readBenchmark, compareRuns,
} = require('./neural-benchmark');
const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(__dirname, 'output');
const UI = path.join(__dirname, 'trainer-gui');
const SETTINGS = path.join(OUTPUT, 'neural_gui_settings.json');
const MODEL = path.join(ROOT, 'neural_ai_model.json');
const BACKUPS = path.join(OUTPUT, 'model-backups');
const BENCHMARK_IMPORTS = path.join(BENCHMARK_OUTPUT, 'imported');
const CSRF_TOKEN = crypto.randomBytes(24).toString('hex');
fs.mkdirSync(OUTPUT, { recursive: true });
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const defaults = {
  sims: 20000, generation: 1000, shards: 4, batch: 100, concurrency: 2,
  mapSet: 'standard', rules: 'auto', gpuMode: 'auto', epochs: 3, miniBatch: 256, python: 'python',
  victoryPoints: 0, maxTurns: 900, benchmarkGames: PROFILES.checkpoint,
};
let saved = normalize(defaults);
try { saved = normalize({ ...defaults, ...readJson(SETTINGS) }); } catch (_) { /* first launch */ }
let active = null;
let last = null;
let gpuStatus = null;
let checking = false;
let importing = false;
let benchmarkJob = null;
let serverPort = 0;

function normalize(raw) {
  const number = (key, min, max, defaultValue) => {
    const n = Number(raw[key] ?? defaultValue);
    if (!Number.isSafeInteger(n) || n < min || n > max) throw new Error(`${key} must be an integer from ${min} to ${max}`);
    return n;
  };
  const sims = number('sims', 1, 10000000, defaults.sims);
  const generation = number('generation', 1, 1000000, defaults.generation);
  const shards = number('shards', 1, 64, defaults.shards);
  const batch = number('batch', 1, 1000, defaults.batch);
  const concurrency = number('concurrency', 1, 32, defaults.concurrency);
  if (sims % generation !== 0 || shards > generation) throw new Error('Total games must be divisible by generation size, and shards cannot exceed games per generation.');
  const mapSet = raw.mapSet === 'all' ? 'all' : 'standard';
  const gpuMode = raw.gpuMode ?? defaults.gpuMode;
  if (!['auto', 'cpu', 'cuda'].includes(gpuMode)) throw new Error('Invalid GPU mode');
  const rules = raw.rules || defaults.rules;
  if (!['auto', 'javascript', 'cpp'].includes(rules)) throw new Error('Invalid self-play rules backend');
  const python = String(raw.python || 'python').trim();
  if (!python || python.length > 260 || /[\r\n]/.test(python)) throw new Error('Invalid Python executable path');
  const victoryPoints = number('victoryPoints', 0, 30, defaults.victoryPoints);
  if (victoryPoints !== 0 && victoryPoints < 3) throw new Error('Victory target must be 0 (scenario default) or 3–30 points');
  const benchmarkGames = number('benchmarkGames', 0, MAX_GAMES, defaults.benchmarkGames);
  if (benchmarkGames && benchmarkGames < PROFILES.checkpoint) throw new Error('Benchmark budget must be 0 or at least 1,000 games');
  return {
    sims, generation, shards, batch, concurrency, mapSet, rules,
    victoryPoints, benchmarkGames, maxTurns: number('maxTurns', 50, 10000, defaults.maxTurns),
    candidatePriorities: normalizeCandidatePriorities(raw.candidatePriorities, shards),
    gpuMode, epochs: number('epochs', 1, 20, defaults.epochs),
    miniBatch: number('miniBatch', 16, 8192, defaults.miniBatch), python,
  };
}
function listRuns() {
  let entries = [];
  try { entries = fs.readdirSync(OUTPUT, { withFileTypes: true }); } catch (_) { return []; }
  return entries.filter(item => item.isDirectory() && item.name.startsWith('.neural-evolution-'))
    .map(item => {
      const dir = path.join(OUTPUT, item.name);
      let manifest = null;
      try { manifest = readJson(path.join(dir, 'run.json')); } catch (_) {}
      const stats = fs.statSync(dir);
      const completedGenerations = fs.readdirSync(dir).filter(name => /^generation-\d+$/.test(name) && fs.existsSync(path.join(dir, name, 'selection.json'))).length;
      return {
        id: item.name, updated: stats.mtime.toISOString(),
        completedGenerations, totalGenerations: manifest ? manifest.totalGames / manifest.generationGames : null,
        config: manifest ? {
          sims: manifest.totalGames, generation: manifest.generationGames,
          shards: manifest.shards, mapSet: manifest.mapSet, rules: manifest.rules || 'javascript',
          victoryPoints: manifest.victoryPoints ?? defaults.victoryPoints,
          maxTurns: manifest.maxTurns ?? defaults.maxTurns,
          benchmarkGames: manifest.benchmark?.games || 0,
          candidatePriorities: normalizeCandidatePriorities(manifest.candidatePriorities, manifest.shards),
        } : null,
      };
    }).sort((a,b) => b.updated.localeCompare(a.updated)).slice(0, 50);
}
function writeControl(job, pause) {
  fs.writeFileSync(job.controlFile, JSON.stringify({ pause, at: new Date().toISOString() }));
}
function emit(job, line) {
  const clean = String(line).replace(/\x1b\[[\d;]*m/g, '').slice(0, 2000);
  if (!clean.trim()) return;
  job.logs.push({ t: new Date().toLocaleTimeString(), line: clean });
  if (job.logs.length > 250) job.logs.shift();
  try { fs.appendFileSync(job.logPath, `${new Date().toISOString()} ${clean}\n`); } catch (_) {}
  let match = clean.match(/\[evolution\]\s+(?:checkpoints|resuming)=([^\r\n]+)/);
  if (match) job.runFolder = path.basename(match[1].trim());
  match = clean.match(/\[evolution\]\s+(\d+)\/(\d+)\s+completed/);
  if (match) {
    const progress = Math.max(job.progress, Number(match[1]));
    if (clean.includes('(reused completed generation ') || clean.endsWith('(recovered checkpoint)')) {
      if (job.rateStart) job.rateStart.games += progress - job.progress;
    } else {
      job.rateStart ??= { at: Date.now(), games: progress };
    }
    job.progress = progress;
  }
  match = clean.match(/\[evolution\]\s+generation\s+(\d+)\/(\d+):/);
  if (match) {
    job.generation = Number(match[1]);
    job.progress = Math.max(job.progress, Number(match[1]) * job.settings.generation);
    job.winner = clean.match(/selected candidate\s+(\d+)/)?.[1] || job.winner;
  }
  const cudaLine = clean.match(/^(?:\[candidate \d+\] )?(\[cuda\].*)$/);
  if (cudaLine) job.lastCuda = cudaLine[1];
}
function pipe(job, stream, tag) {
  let buffer = '';
  stream.on('data', part => {
    buffer += String(part);
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || '';
    for (const line of lines) emit(job, tag === 'stderr' ? `[error] ${line}` : line);
    if (buffer.length > 8000) { emit(job, buffer.slice(-2000)); buffer = ''; }
  });
  stream.on('end', () => { if (buffer) emit(job, buffer); });
}
async function start(raw) {
  if (active) throw new Error('A training session is already running');
  if (checking) throw new Error('The trainer is already checking hardware');
  if (importing) throw new Error('Wait for the model import to finish');
  if (benchmarkJob?.state === 'running') throw new Error('Wait for the benchmark to finish or cancel it before starting training');
  let resumeFolder = '';
  let resumeConfig;
  if (raw.resumeFolder) {
    resumeFolder = String(raw.resumeFolder);
    const run = listRuns().find(run => run.id === resumeFolder);
    if (!run) throw new Error('Selected checkpoint folder was not found');
    resumeConfig = run.config;
  }
  const settings = normalize({ ...raw.settings, ...resumeConfig });
  if (!fs.existsSync(MODEL)) throw new Error(`Missing model: ${MODEL}`);
  checking = true;
  let accelerator = 'cpu';
  try {
    if (settings.gpuMode !== 'cpu') {
      try {
        const gpu = await ensureCuda(settings.python);
        gpuStatus = { ok: true, ...gpu, checkedAt: new Date().toISOString() };
        accelerator = 'cuda';
      } catch (error) {
        gpuStatus = { ok: false, error: error.message, checkedAt: new Date().toISOString() };
        if (settings.gpuMode === 'cuda') throw new Error(`CUDA selected but unavailable: ${error.message}`);
      }
    }
    const binding = path.join(ROOT, 'native', 'hex-core', 'hex_rules_v5.node');
    const resumeRules = resumeFolder ? resumeConfig?.rules || 'javascript' : null;
    const native = settings.rules === 'cpp' ||
      (settings.rules === 'auto' && (resumeRules ? resumeRules === 'cpp' : fs.existsSync(binding)));
    if (native) {
      if (!fs.existsSync(binding)) throw new Error('Build the C++ addon using native/hex-core/Build-Node-Windows.cmd first');
      require('../server/native-rules');
    }
    if (!resumeFolder) {
      fs.writeFileSync(SETTINGS, JSON.stringify(settings, null, 2));
      saved = settings;
    }
    const id = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const job = {
      id, settings, accelerator, state: 'running', startedAt: Date.now(), endedAt: null,
      progress: 0, generation: 0, winner: null, lastCuda: null, runFolder: resumeFolder || null,
      logs: [], logPath: path.join(OUTPUT, `neural_gui_${id}.log`),
      controlFile: path.join(OUTPUT, `.neural-gui-control-${id}.json`),
      child: null,
    };
    writeControl(job, false);
    const env = {
      ...process.env,
      SIMS: String(settings.sims), SELECTION_INTERVAL: String(settings.generation),
      SHARDS: String(settings.shards), BATCH_SIZE: String(settings.batch),
      CONCURRENCY: String(settings.concurrency), MAP_SET: settings.mapSet,
      VP_TO_WIN: settings.victoryPoints ? String(settings.victoryPoints) : '',
      MAX_TRAINING_TURNS: String(settings.maxTurns),
      BENCHMARK_GAMES: String(settings.benchmarkGames),
      TRAINING_CANDIDATE_PRIORITIES: JSON.stringify(settings.candidatePriorities),
      MODEL_PATH: MODEL,
      HEX_TRAINING_RULES: native ? 'cpp' : 'javascript', HEX_TRAINING_FAST: '1',
      TRAINING_SCRATCH: OUTPUT,
      KEEP_TRAINING_TEMP: '1', KEEP_TRAINING_SCRATCH: '0', TRAINING_ACCELERATOR: accelerator,
      GPU_EPOCHS: String(settings.epochs), GPU_MINIBATCH: String(settings.miniBatch),
      TRAINER_PYTHON: settings.python, TRAINING_CONTROL_FILE: job.controlFile,
      RESUME_RUN_DIR: resumeFolder ? path.join(OUTPUT, resumeFolder) : '',
    };
    const child = spawn(process.execPath, [path.join(__dirname, 'train_neural_ai_evolutionary.js')], {
      cwd: ROOT, env, windowsHide: true, detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    job.child = child;
    active = job;
    last = job;
    emit(job, `[dashboard] Started ${settings.sims.toLocaleString()} games; ${native ? 'native-assisted' : 'JavaScript'} rules; ${accelerator.toUpperCase()} refinement; ${settings.mapSet} maps${resumeFolder ? `; resuming ${resumeFolder}` : ''}`);
    if (settings.gpuMode === 'auto' && accelerator === 'cpu' && gpuStatus?.error) {
      emit(job, `[dashboard] CUDA unavailable; Auto selected CPU: ${gpuStatus.error}`);
    }
    pipe(job, child.stdout, 'stdout');
    pipe(job, child.stderr, 'stderr');
    child.once('error', error => { emit(job, `[dashboard] Process error: ${error.message}`); });
    child.once('close', code => {
      job.endedAt = Date.now();
      job.state = code === 0 ? 'completed' : code === 75 ? 'paused' : job.state === 'stopping' ? 'stopped' : 'failed';
      emit(job, `[dashboard] Trainer exited (${code}); ${job.state}. Checkpoints: ${job.runFolder || 'see log'}`);
      try { fs.unlinkSync(job.controlFile); } catch (_) {}
      if (active === job) active = null;
    });
    return viewJob(job);
  } finally { checking = false; }
}
async function pause() {
  if (!active || active.state !== 'running') throw new Error('No running session to pause');
  active.state = 'pausing';
  writeControl(active, true);
  emit(active, '[dashboard] Pause requested. The trainer will stop after the next durable batch checkpoint.');
  return viewJob(active);
}
async function stop() {
  if (!active) throw new Error('No running session');
  const job = active;
  job.state = 'stopping';
  emit(job, '[dashboard] Emergency stop requested. The current uncommitted batch may be lost.');
  if (process.platform === 'win32') {
    spawn('taskkill', ['/PID', String(job.child.pid), '/T', '/F'], { windowsHide: true });
  } else {
    try { process.kill(-job.child.pid, 'SIGKILL'); } catch (_) { job.child.kill('SIGKILL'); }
  }
  return viewJob(job);
}
function viewJob(job) {
  if (!job) return null;
  const elapsed = job.rateStart ? (job.endedAt || Date.now()) - job.rateStart.at : 0;
  const gamesPerHour = elapsed >= 60_000 ? (job.progress - job.rateStart.games) * 3_600_000 / elapsed : 0;
  return {
    id: job.id, settings: job.settings, accelerator: job.accelerator,
    state: job.state, startedAt: job.startedAt, endedAt: job.endedAt,
    progress: job.progress, generation: job.generation, winner: job.winner,
    lastCuda: job.lastCuda, runFolder: job.runFolder, gamesPerHour,
    logPath: job.logPath, logs: job.logs.slice(-180),
  };
}
function readModelOverview() {
  try {
    const m = readJson(MODEL);
    return { trainedGames: m.trainedGames, featureVersion: m.meta?.featureVersion,
      lastCudaRefinement: m.meta?.lastCudaRefinement || null };
  } catch (_) { return null; }
}
function weightSnapshots(runId) {
  const run = runId && listRuns().find(entry => entry.id === runId);
  if (runId && !run) throw new Error('Selected checkpoint folder was not found');
  if (run) return listWeightSnapshots(path.join(OUTPUT, run.id));
  const snapshots = [{ id: 'current', label: 'Current model', file: MODEL }];
  if (fs.existsSync(BACKUPS)) {
    const files = fs.readdirSync(BACKUPS).filter(name => /^before-import-\d+-[0-9a-f]{8}\.json$/.test(name)).sort().reverse();
    for (const file of files) {
      const date = new Date(Number(file.split('-')[2]));
      snapshots.push({ id: file, file: path.join(BACKUPS, file), label: `Before import · ${date.toLocaleString()}` });
    }
  }
  return snapshots.filter(snapshot => fs.existsSync(snapshot.file));
}
async function importWeights(payload) {
  if (active || checking || importing) throw new Error('Wait until the trainer is idle to import weights');
  const model = validateImportedModel(payload);
  importing = true;
  try {
    let backup = null;
    if (fs.existsSync(MODEL)) {
      fs.mkdirSync(BACKUPS, { recursive: true });
      backup = `before-import-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.json`;
      fs.copyFileSync(MODEL, path.join(BACKUPS, backup), fs.constants.COPYFILE_EXCL);
    }
    await atomicWriteJson(MODEL, model);
    return { ok: true, backup, trainedGames: model.trainedGames };
  } finally { importing = false; }
}

function benchmarkSnapshots(run) {
  if (run === 'registry') {
    const directory = path.join(BENCHMARK_OUTPUT, 'models');
    if (!fs.existsSync(directory)) return [];
    return fs.readdirSync(directory).filter(file => /^[a-f0-9]{64}\.json$/.test(file)).map(name => {
      const file = path.join(directory, name);
      const data = readJson(file);
      return { id: data.id, file, label: `${data.label || 'Model'} · ${data.id.slice(0, 8)}` };
    }).sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  }
  const snapshots = weightSnapshots(run);
  if (run) return snapshots;
  if (fs.existsSync(BENCHMARK_IMPORTS)) {
    for (const name of fs.readdirSync(BENCHMARK_IMPORTS).filter(file => /^[a-f0-9]{64}\.json$/.test(file))) {
      const file = path.join(BENCHMARK_IMPORTS, name);
      snapshots.push({ id: name, file, label: readJson(file).meta?.benchmarkLabel || name });
    }
  }
  return snapshots;
}

function benchmarkPolicy(selection) {
  if (['rules', 'random'].includes(selection?.id)) return selection.id;
  const snapshot = benchmarkSnapshots(selection?.run).find(entry => entry.id === selection?.id);
  if (!snapshot) throw new Error('The selected benchmark model was not found');
  if (selection.run === 'registry') {
    const data = readJson(snapshot.file);
    return { ...(data.sourceJson ? { bytes: Buffer.from(data.sourceJson) } : { model: data.model }), label: data.label };
  }
  return snapshot.checkpoint
    ? { model: readJson(snapshot.file).model, label: snapshot.label }
    : { file: snapshot.file, label: snapshot.label };
}

async function addBenchmarkModel(payload) {
  const model = validateImportedModel(payload.model);
  const label = String(payload.label || 'Imported model').trim().slice(0, 120) || 'Imported model';
  model.meta.benchmarkLabel = label;
  const id = crypto.createHash('sha256').update(JSON.stringify(model)).digest('hex') + '.json';
  await atomicWriteJson(path.join(BENCHMARK_IMPORTS, id), model);
  return { id, label };
}

function startBenchmark(payload) {
  if (benchmarkJob?.state === 'running') throw new Error('A benchmark is already running');
  if (active || checking || importing) throw new Error('Wait for the trainer to finish or pause training first');
  const candidate = benchmarkPolicy(payload.candidate);
  const opponent = benchmarkPolicy(payload.opponent);
  const games = PROFILES[payload.profile];
  if (!Number.isInteger(games)) throw new Error('Invalid benchmark profile');
  const maps = payload.maps?.length ? payload.maps
    : payload.profile === 'quick' ? ['classic'] : payload.profile === 'release' ? SCENARIOS.map(map => map.id) : REFERENCE_LOBBY;
  if (!Array.isArray(maps) || maps.some(id => !SCENARIOS.some(map => map.id === id))) throw new Error('Invalid scenario selection');
  const seed = String(payload.seed || '').trim().slice(0, 160) ||
    (payload.profile === 'release' ? `holdout-${crypto.randomUUID()}` : undefined);
  const controller = new AbortController();
  const job = benchmarkJob = { state: 'running', done: 0, total: games, controller };
  void runBenchmark({
    candidate, opponent, maps, games, seed, signal: controller.signal,
    context: { profile: payload.profile, candidateSnapshot: payload.candidate, opponentSnapshot: payload.opponent },
    onProgress: (done, total) => { Object.assign(job, { done, total }); },
  }).then(report => Object.assign(job, { state: 'completed', report: report.id }))
    .catch(error => Object.assign(job, { state: controller.signal.aborted ? 'cancelled' : 'failed', error: error.message }));
  return { state: job.state, done: job.done, total: job.total };
}

let matchCache = new Map();
async function benchmarkMatches(id) {
  if (!matchCache.has(id)) {
    if (matchCache.size >= 2) matchCache.delete(matchCache.keys().next().value);
    matchCache.set(id, readBenchmark(id, 'matches'));
  }
  try { return await matchCache.get(id); }
  catch (error) { matchCache.delete(id); throw error; }
}

async function benchmarkApi(res, pathname, params) {
  if (pathname === '/api/benchmarks/status') {
    const { controller, ...job } = benchmarkJob || {};
    return send(res, 200, { token: CSRF_TOKEN, job, busy: !!(active || checking || importing) });
  }
  if (pathname === '/api/benchmarks/config') {
    return send(res, 200, { profiles: PROFILES, scenarios: SCENARIOS, runs: listRuns().map(({ id, updated, completedGenerations }) => ({ id, updated, completedGenerations })) });
  }
  if (pathname === '/api/benchmarks/models') {
    return send(res, 200, benchmarkSnapshots(params.get('run')).map(({ id, label }) => ({ id, label })));
  }
  if (pathname === '/api/benchmarks/history') {
    const reports = await listBenchmarks();
    const rows = reports.filter(report => params.get('screens') === '1' || report.context?.purpose !== 'screen');
    return send(res, 200, rows.map(({ id, candidate, opponent, config, context, engineHash, startedAt, byPlayerCount, durationMs }) => ({
      id, candidate, opponent, config, context, engineHash, startedAt, durationMs,
      ratings: Object.fromEntries(Object.entries(byPlayerCount).map(([count, row]) => [count, row.openSkill])),
    })));
  }
  const id = params.get('id');
  if (pathname === '/api/benchmarks/report') return send(res, 200, await readBenchmark(id, 'report'));
  if (pathname === '/api/benchmarks/compare') {
    const baseline = params.get('baseline');
    const [a, b] = await Promise.all([readBenchmark(id, 'report'), readBenchmark(baseline, 'report')]);
    const comparable = (a.opponent.weightsSha256 || a.opponent.id) === (b.opponent.weightsSha256 || b.opponent.id) &&
      a.engineHash === b.engineHash && a.config.maxTurns === b.config.maxTurns;
    const matched = comparable ? compareRuns(...await Promise.all([benchmarkMatches(id), benchmarkMatches(baseline)])) : null;
    return send(res, 200, { comparable, matched });
  }
  if (pathname === '/api/benchmarks/matches') {
    const all = await benchmarkMatches(id);
    const map = params.get('map');
    const outcome = params.get('outcome');
    const matches = all.filter(row => (!map || row.mapId === map) && (!outcome ||
      (outcome === 'win' ? row.winnerSeat === row.candidateSeat : outcome === 'issue'
        ? row.status !== 'completed' || row.invalid?.length : row.status === 'completed' && row.winnerSeat !== row.candidateSeat)));
    const page = Math.max(1, Math.min(Math.ceil(matches.length / 30), Number(params.get('page')) || 1));
    return send(res, 200, { page, total: matches.length, matches: matches.slice((page - 1) * 30, page * 30)
      .map(({ standings, ...match }) => ({ ...match, standings: standings?.map(({ seat, vp, rank }) => ({ seat, vp, rank })) })) });
  }
  if (pathname === '/api/benchmarks/match') {
    const matchId = Number(params.get('match'));
    const result = (await benchmarkMatches(id))[matchId - 1];
    if (!result) return send(res, 404, { error: 'Match not found' });
    const replay = result.hasReplay ? await readBenchmark(id, matchId) : null;
    return send(res, 200, { result, replay });
  }
  return send(res, 404, { error: 'Not found' });
}

function send(res, status, data) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  res.end(JSON.stringify(data));
}
function staticFile(res, file, type) {
  const body = fs.readFileSync(path.join(UI, file));
  res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'content-security-policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'" });
  res.end(body);
}
async function analytics(res, pathname, params) {
  if (pathname === '/api/analytics/runs') return send(res, 200, await listTrainingRuns(OUTPUT));
  const run = await openTrainingRun(OUTPUT, params.get('run'), { includeIncomplete: true });
  if (!run) return send(res, 404, { error: 'Training run not found' });
  if (pathname === '/api/analytics/summary') return send(res, 200, await summarizeTrainingRun(run));
  if (pathname === '/api/analytics/games') {
    const generation = Number(params.get('generation') || 1);
    const candidate = Number(params.get('candidate') || 0);
    const page = Number(params.get('page') || 1);
    if (!Number.isSafeInteger(generation) || generation < 1 || generation > run.generations ||
        !Number.isSafeInteger(candidate) || candidate < 0 || candidate > run.manifest.shards ||
        !Number.isSafeInteger(page) || page < 1) {
      return send(res, 400, { error: 'Invalid generation, candidate, or page' });
    }
    return send(res, 200, await trainingGamePage(run, { generation, candidate, map: params.get('map'), page }));
  }
  if (pathname === '/api/analytics/download') {
    if (!run.generations) return send(res, 404, { error: 'No completed generations to export' });
    const suffix = run.completedAt ? '' : `-through-generation-${run.generations}`;
    res.writeHead(200, {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="${run.id.slice(1)}-analytics${suffix}.json"`,
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    });
    return pipeline(Readable.from(exportTrainingRun(run)), res);
  }
  return send(res, 404, { error: 'Not found' });
}

async function trainerStatus() {
  const current = viewJob(active || last);
  const runs = listRuns();
  const selected = current
    ? runs.find(run => run.id === current.runFolder)
    : runs.find(run => run.completedGenerations);
  const run = selected && await openTrainingRun(OUTPUT, selected.id, { includeIncomplete: true });
  let progression;
  if (run) {
    try {
      const history = await trainingProgression(run);
      progression = { run: run.id, history };
      const latest = history.at(-1);
      if (current && latest && latest.generation >= current.generation) {
        current.generation = latest.generation;
        current.winner = latest.selectedCandidate;
        current.progress = Math.max(current.progress, latest.generation * run.manifest.generationGames);
      }
    } catch (error) {
      progression = { run: run.id, error: `Could not read generation selections: ${error.message}` };
    }
  }
  return {
    token: CSRF_TOKEN, current, progression, settings: saved, runs,
    gpu: gpuStatus, checking, importing, model: readModelOverview(), priorities: PRIORITIES,
  };
}
async function handle(req, res) {
  const expectedHost = `127.0.0.1:${serverPort}`;
  if (req.headers.host !== expectedHost) return send(res, 403, { error: 'Localhost only' });
  const { pathname, searchParams } = new URL(req.url, `http://${expectedHost}`);
  if (req.method === 'GET') {
    if (pathname === '/') return staticFile(res, 'index.html', 'text/html; charset=utf-8');
    if (pathname === '/app.js') return staticFile(res, 'app.js', 'text/javascript; charset=utf-8');
    if (pathname === '/analytics') return staticFile(res, 'analytics.html', 'text/html; charset=utf-8');
    if (pathname === '/analytics.js') return staticFile(res, 'analytics.js', 'text/javascript; charset=utf-8');
    if (pathname === '/benchmarks') return staticFile(res, 'benchmarks.html', 'text/html; charset=utf-8');
    if (pathname === '/benchmarks.js') return staticFile(res, 'benchmarks.js', 'text/javascript; charset=utf-8');
    if (pathname === '/progression.js') return staticFile(res, 'progression.js', 'text/javascript; charset=utf-8');
    if (pathname === '/style.css') return staticFile(res, 'style.css', 'text/css; charset=utf-8');
    if (pathname.startsWith('/api/analytics/')) return analytics(res, pathname, searchParams);
    if (pathname.startsWith('/api/benchmarks/')) return benchmarkApi(res, pathname, searchParams);
    if (pathname === '/api/status') return send(res, 200, await trainerStatus());
    if (pathname === '/api/weights' || pathname === '/api/weights/download') {
      const runId = searchParams.get('run');
      let snapshots;
      try { snapshots = weightSnapshots(runId); } catch (error) { return send(res, 404, { error: error.message }); }
      if (pathname === '/api/weights') return send(res, 200, snapshots.map(({ id, label }) => ({ id, label })));
      const snapshot = snapshots.find(({ id }) => id === searchParams.get('id'));
      if (!snapshot) return send(res, 404, { error: 'Model snapshot not found' });
      const data = readJson(snapshot.file);
      const filename = snapshot.id === 'current' ? 'neural_ai_model.json'
        : snapshot.id.endsWith('.json') ? snapshot.id : `${runId}-${snapshot.id}.json`;
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store',
        'x-content-type-options': 'nosniff', 'content-disposition': `attachment; filename="${filename}"` });
      return res.end(JSON.stringify(snapshot.checkpoint ? data.model : data, null, 2));
    }
    return send(res, 404, { error: 'Not found' });
  }
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  if (req.headers.origin !== `http://${expectedHost}` || req.headers['x-hex-trainer-token'] !== CSRF_TOKEN) {
    return send(res, 403, { error: 'Invalid local request token or origin' });
  }
  const maxBytes = ['/api/weights/upload', '/api/benchmarks/import'].includes(pathname) ? 256 * 1024 : 32 * 1024;
  let bytes = 0;
  const content = [];
  for await (const part of req) {
    bytes += part.length;
    if (bytes > maxBytes) return send(res, 413, { error: 'Request too large' });
    content.push(part);
  }
  let payload = {};
  try { payload = bytes ? JSON.parse(Buffer.concat(content).toString('utf8')) : {}; } catch (_) { return send(res, 400, { error: 'Invalid JSON' }); }
  try {
    if (pathname === '/api/benchmarks/start') return send(res, 202, startBenchmark(payload));
    if (pathname === '/api/benchmarks/stop') {
      if (benchmarkJob?.state === 'running') benchmarkJob.controller.abort();
      return send(res, 200, { ok: true });
    }
    if (pathname === '/api/benchmarks/import') return send(res, 200, await addBenchmarkModel(payload));
    if (pathname === '/api/weights/upload') return send(res, 200, await importWeights(payload));
    if (pathname === '/api/settings') {
      if (active || checking || importing) throw new Error('Wait until the trainer is idle to save settings');
      const settings = normalize(payload);
      fs.writeFileSync(SETTINGS, JSON.stringify(settings, null, 2));
      saved = settings;
      return send(res, 200, { ok: true });
    }
    if (pathname === '/api/start') return send(res, 200, { ok: true, job: await start(payload) });
    if (pathname === '/api/pause') return send(res, 200, { ok: true, job: await pause() });
    if (pathname === '/api/stop') return send(res, 200, { ok: true, job: await stop() });
    if (pathname === '/api/gpu') {
      const python = String(payload.python || saved.python).trim();
      if (python.length > 260 || /[\r\n]/.test(python)) throw new Error('Invalid Python executable');
      try {
        gpuStatus = { ok: true, ...await ensureCuda(python), checkedAt: new Date().toISOString() };
      } catch (error) {
        gpuStatus = { ok: false, error: error.message, checkedAt: new Date().toISOString() };
      }
      return send(res, 200, gpuStatus);
    }
    return send(res, 404, { error: 'Not found' });
  } catch (error) { return send(res, 400, { error: error.message }); }
}
function openBrowser(url) {
  const platform = process.platform;
  const program = platform === 'win32' ? 'cmd.exe' : platform === 'darwin' ? 'open' : 'xdg-open';
  const args = platform === 'win32' ? ['/c', 'start', '', url] : [url];
  try { const child = spawn(program, args, { stdio: 'ignore', windowsHide: true, detached: true }); child.once('error', () => {}); child.unref(); } catch (_) {}
}
if (require.main === module) {
  const server = http.createServer((req, res) => {
    handle(req, res).catch(error => {
      if (res.destroyed) return;
      if (res.headersSent) res.destroy(error);
      else send(res, 500, { error: error.message });
    });
  });
  server.listen(0, '127.0.0.1', () => {
    serverPort = server.address().port;
    const url = `http://127.0.0.1:${serverPort}/`;
    console.log(`\nHex Settlers Neural Trainer Control Center\n${url}\n`);
    if (process.env.TRAINER_GUI_NO_BROWSER !== '1') openBrowser(url);
  });
  process.on('SIGINT', () => {
    if (active) {
      console.error('Training is still running. Use Pause in the dashboard to save progress.');
      return;
    }
    benchmarkJob?.controller.abort();
    server.close();
  });
}
module.exports = { normalize, listRuns, readModelOverview, viewJob };
