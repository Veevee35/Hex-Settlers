'use strict';
// Admin-only orchestrator. Every experiment runs against an isolated, loopback
// copy of the REAL game server and game engine, never live player rooms.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { atomicWriteJson, JsonFileWriter } = require('./persistence');
const { FEATURE_NAMES, upgradeNeuralModel } = require('./neural-objective');

const MAX_VIRTUAL_SERVERS = 1000;
const MAX_TOTAL_GAMES = 100000;
const FILES = Object.freeze({
  runs: 'training_runs.json', candidate: 'training_candidate.json',
  report: 'training_report.json', previous: 'training_previous_candidate.json',
});
function integer(value, min, max, fallback) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= min && n <= max ? n : fallback;
}
function validateConfig(input = {}, maxParallel = 2) {
  const perBatch = integer(input.gamesPerBatch, 1, 10000, NaN);
  const batches = integer(input.batches, 1, 1000, NaN);
  const requestedServers = integer(input.servers, 1, MAX_VIRTUAL_SERVERS, NaN);
  const checkpointSize = integer(input.checkpointSize, 1, 1000, NaN);
  if (![perBatch, batches, requestedServers, checkpointSize].every(Number.isFinite)) throw new Error('Provide 1–10,000 games per batch, 1–1,000 batches, 1–1,000 virtual servers, and a 1–1,000-game checkpoint interval.');
  const games = perBatch * batches;
  if (games > MAX_TOTAL_GAMES) throw new Error(`This experiment exceeds the ${MAX_TOTAL_GAMES.toLocaleString()}-game limit. Split it into separate runs.`);
  if (!['train', 'stress'].includes(input.purpose)) throw new Error('Choose training or isolated server load testing.');
  if (!['standard', 'all'].includes(input.mapSet)) throw new Error('Choose standard maps or all supported maps.');
  if (!['candidate', 'live'].includes(input.source)) throw new Error('Choose the saved candidate or live model.');
  const parallel = Math.min(maxParallel, requestedServers, games);
  return { gamesPerBatch: perBatch, batches, games, servers: requestedServers,
    parallel, checkpointSize: Math.min(checkpointSize, games), purpose: input.purpose,
    mapSet: input.mapSet, source: input.source };
}
function validModel(input) {
  if (!input || typeof input !== 'object') throw new Error('Missing neural model.');
  const model = upgradeNeuralModel(structuredClone(input));
  const p = model.params;
  const hidden = p.w1.length;
  if (!Number.isInteger(hidden) || hidden < 1 || hidden > 128 || !Array.isArray(p.b1) || !Array.isArray(p.w2)
    || p.b1.length !== hidden || p.w2.length !== hidden || !Number.isFinite(p.b2)) throw new Error('Invalid neural network dimensions.');
  for (const row of p.w1) if (!Array.isArray(row) || row.length !== FEATURE_NAMES.length || !row.every(Number.isFinite)) throw new Error('Invalid or non-finite neural weights.');
  if (![...p.b1, ...p.w2].every(Number.isFinite)) throw new Error('Invalid neural biases.');
  if (!Number.isSafeInteger(model.trainedGames) || model.trainedGames < 0) throw new Error('Invalid training count.');
  return model;
}
const fingerprint = (value) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);
const readJson = (name) => JSON.parse(fs.readFileSync(name, 'utf8'));
function scoreReport(report) {
  if (!report) return null;
  const avg = Number(report.averageVictoryTurn || 0);
  const games = Array.isArray(report.games) ? report.games : [];
  const margin = games.length ? games.reduce((sum, g) => sum + Number(g.winnerMargin || 0), 0) / games.length : null;
  const durations = games.map(g => Number(g.elapsedMs || 0)).filter(n => n > 0).sort((a,b) => a-b);
  const percentile = q => durations.length ? Math.round(durations[Math.min(durations.length - 1, Math.ceil(q * durations.length) - 1)]) : null;
  return { requested: Number(report.requestedGames || 0), completed: Number(report.completedGames || 0),
    averageWinningTurn: avg, averageWinningMargin: margin, mapBreakdown: report.byMap || {},
    p50GameMs: percentile(.5), p95GameMs: percentile(.95), p99GameMs: percentile(.99),
    totalGoldProductionCards: Number(report.totalGoldProductionCards || 0),
    objective: String(report.trainingObjective || ''),
    finalTrainedGames: Number(report.finalTrainedGames || 0),
    mapsCovered: report.mapsCovered || [] };
}
function killTree(child) {
  if (!child || !child.pid) return;
  try { if (process.platform !== 'win32') process.kill(-child.pid, 'SIGTERM'); else child.kill('SIGTERM'); }
  catch (_) { try { child.kill('SIGTERM'); } catch (_) {} }
}
class TrainingLab {
  constructor({ dataDir, projectRoot, getLiveModel, promote, spawnProcess = spawn }) {
    this.dataDir = dataDir; this.projectRoot = projectRoot;
    this.getLiveModel = getLiveModel; this.promoteLive = promote; this.spawnProcess = spawnProcess;
    this.maxParallel = integer(Number(process.env.HEX_TRAINING_MAX_CONCURRENCY || 2), 1, 32, 2);
    this.paths = Object.fromEntries(Object.entries(FILES).map(([key, file]) => [key, path.join(dataDir, file)]));
    this.writer = new JsonFileWriter(this.paths.runs);
    this.child = null; this.timer = null; this.busy = false; this.current = null;
    try {
      const restored = readJson(this.paths.runs);
      this.history = Array.isArray(restored.jobs) ? restored.jobs.slice(0, 25) : [];
      for (const job of this.history) if (['running','cancelling','starting'].includes(job.status)) {
        job.status = 'interrupted'; job.error = 'Container restarted. Saved checkpoints can be used in the next run.';
        job.endedAt = Date.now();
      }
    } catch (_) { this.history = []; }
    this.candidate = this._safeReadModel(this.paths.candidate);
    this.previous = this._safeReadModel(this.paths.previous);
  }
  _safeReadModel(file) { try { return validModel(readJson(file)); } catch (_) { return null; } }
  async _saveHistory() { await this.writer.write({ version: 1, jobs: this.history }); }
  status() {
    const live = validModel(this.getLiveModel());
    return { ok:true, limits: { maxVirtualServers: MAX_VIRTUAL_SERVERS, maxConcurrentGames: this.maxParallel,
      maxGamesPerRun: MAX_TOTAL_GAMES, containerInstances: 1 },
      active: this.current ? { ...this.current } : null,
      jobs: this.history.slice(0, 15).map(job => ({ ...job })),
      live: { trainedGames: live.trainedGames, fingerprint: fingerprint(live) },
      candidate: this.candidate ? { trainedGames: this.candidate.trainedGames, fingerprint: fingerprint(this.candidate) } : null,
      previousCandidate: this.previous ? { trainedGames: this.previous.trainedGames, fingerprint: fingerprint(this.previous) } : null,
      previousLiveAvailable: !!this._safeReadModel(path.join(this.dataDir, 'training_previous_live.json')) };
  }
  async start(input) {
    if (this.busy || this.child || this.current) throw new Error('A training or load-test run is already active. Stop it before starting another.');
    const config = validateConfig(input, this.maxParallel);
    if (config.source === 'candidate' && !this.candidate) throw new Error('No saved candidate yet. Choose the live model as your starting point.');
    this.busy = true;
    let job;
    try {
      const startModel = validModel(config.source === 'candidate' ? this.candidate : this.getLiveModel());
      if (config.purpose === 'train') await this.savePreviousCandidate();
      const id = `train-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
      const directory = path.join(this.dataDir, 'training-work', id);
      fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
      const seed = path.join(directory, 'seed-model.json');
      const output = path.join(directory, 'report.json');
      fs.writeFileSync(seed, JSON.stringify(startModel), { mode: 0o600 });
      job = { id, status:'starting', createdAt:Date.now(), startedAt:Date.now(),
        updatedAt:Date.now(), completed:0, failures:0, pct:0, config, sourceFingerprint:fingerprint(startModel),
        sourceTrainedGames:startModel.trainedGames, summary:null, error:'', lastLog:'' };
      this.history.unshift(job); this.history = this.history.slice(0, 25); this.current = job;
      await this._saveHistory();
      const env = { ...process.env,
        SIMS:String(config.games), BATCH_SIZE:String(config.checkpointSize),
        CONCURRENCY:String(config.parallel), MAP_SET:config.mapSet,
        MODEL_PATH:seed, TRAINING_OUTPUT:output, TRAINING_PURPOSE:config.purpose,
        CURRICULUM_OFFSET:String(startModel.trainedGames),
        CLOUDFLARE_STATE_ENDPOINT:'', HEX_UPSTREAM_SHARED_SECRET:'',
        HEX_ADMIN_PASSWORD:'', HEX_BUILTIN_ADMIN_ENABLED:'0',
        HEX_PUBLIC_BASE_URL:'', HEX_ALLOWED_ORIGINS:'', HEX_ADMIN_HOST:'',
        HEX_TRUST_PROXY:'false', HEX_EMAIL_MODE:'disabled', RESEND_API_KEY:'',
      };
      const child = this.spawnProcess(process.execPath, [path.join(this.projectRoot, 'scripts', 'train_neural_ai_all_maps.js')], {
        cwd:this.projectRoot, env, stdio:['ignore','pipe','pipe'], windowsHide:true, detached:process.platform !== 'win32',
      });
      this.child = child; job.status = 'running';
      let logBuffer = '';
      child.stdout.on('data', chunk => {
        logBuffer += String(chunk);
        const lines = logBuffer.split(/\r?\n/); logBuffer = lines.pop().slice(-1000);
        for (const line of lines) {
          const match = /^\[train\]\s+(\d+)\/(\d+)\s+map=(\S+)/.exec(line);
          if (match) {
            job.completed = Math.min(config.games, Number(match[1]));
            job.pct = Math.round(job.completed / config.games * 1000) / 10;
            job.lastMap = match[3]; job.updatedAt = Date.now();
          }
          if (line.trim()) job.lastLog = line.slice(0, 240);
        }
      });
      child.stderr.on('data', chunk => {
        const line = String(chunk).trim().slice(-400);
        if (line) { job.lastLog = line; if (/^\[train\] retry/.test(line)) job.failures++; }
      });
      this.timer = setInterval(() => void this._checkpoint(job, output).catch(error => {
        job.error = `Checkpoint persistence failed: ${error.message}`;
      }), 6500);
      // Promise callbacks rather than long-lived request handlers: HTTP starts the
      // job and returns immediately; status requests poll this single process.
      let finalized = false;
      const finish = async (code, error) => {
        if (finalized) return; finalized = true;
        if (this.timer) clearInterval(this.timer); this.timer = null;
        this.child = null;
        try { await this._checkpoint(job, output); } catch (e) { job.error = e.message; }
        try {
          if (job.status === 'cancelling') job.status = 'cancelled';
          else if (error || code !== 0) {
            job.status = 'failed'; job.error = error?.message || job.error || `Training worker exited with code ${code}. ${job.lastLog}`;
          } else {
            const report = readJson(output);
            if (Number(report.completedGames) !== config.games) throw new Error('The batch did not complete all requested real games.');
            const model = validModel(readJson(seed));
            if (config.purpose === 'train') {
              if (model.trainedGames !== startModel.trainedGames + config.games) throw new Error('Trained game count did not match completed games.');
              await this._persistCandidate(model, job.id);
            } else if (fingerprint(model) !== fingerprint(startModel)) {
              throw new Error('Load test modified model weights.');
            }
            job.completed = config.games; job.pct = 100; job.summary = scoreReport(report);
            // Persist the full report only for the most recent completed run;
            // job metadata is retained separately for the last 25 runs.
            await atomicWriteJson(this.paths.report, { runId:job.id, ...report });
            job.error = ''; job.status = 'completed';
          }
        } catch (e) { job.status = 'failed'; job.error = e.message; }
        job.updatedAt = Date.now(); job.endedAt = Date.now();
        this.current = null; this.busy = false;
        await this._saveHistory().catch(e => console.error('[training] Could not save history', e));
        try { fs.rmSync(directory, { recursive:true, force:true }); } catch (_) {}
      };
      child.once('error', error => void finish(-1, error));
      child.once('exit', (code, signal) => void finish(code, signal && job.status !== 'cancelling' ? new Error(`Trainer stopped: ${signal}`) : null));
      return this.status();
    } catch (error) {
      this.busy = false; this.current = null;
      if (job) { job.status = 'failed'; job.error = error.message; await this._saveHistory().catch(() => {}); }
      throw error;
    }
  }
  async _persistCandidate(model, runId) {
    const safe = validModel(model);
    await atomicWriteJson(this.paths.candidate, safe);
    this.candidate = safe;
    this.candidateRunId = runId;
  }
  async _checkpoint(job, output) {
    if (!job || job.config.purpose !== 'train') return;
    const pathName = `${output}.checkpoint.json`;
    let stat;
    try { stat = fs.statSync(pathName); } catch (_) { return; }
    if (job.lastCheckpointMtime === stat.mtimeMs) return;
    const checkpoint = readJson(pathName);
    const model = validModel(checkpoint.model);
    const count = Array.isArray(checkpoint.games) ? checkpoint.games.length : 0;
    if (model.trainedGames !== job.sourceTrainedGames + count || count < (job.savedCheckpointGames || 0)) throw new Error('Invalid training checkpoint.');
    await this._persistCandidate(model, job.id);
    job.savedCheckpointGames = count; job.lastCheckpointMtime = stat.mtimeMs;
    job.completed = Math.max(job.completed, count);
    job.pct = Math.round(job.completed / job.config.games * 1000) / 10;
    job.updatedAt = Date.now();
    await this._saveHistory();
  }
  async stop() {
    if (!this.child || !this.current) throw new Error('No training job is running.');
    this.current.status = 'cancelling';
    killTree(this.child);
    return this.status();
  }
  async promote(confirm) {
    if (this.busy || this.current) throw new Error('Stop the experiment before promoting weights.');
    if (confirm !== 'PROMOTE MODEL') throw new Error('Type PROMOTE MODEL to explicitly replace the live AI model.');
    if (!this.candidate) throw new Error('No trained candidate available.');
    const safe = validModel(this.candidate);
    await this.promoteLive(safe);
    return this.status();
  }
  async rollbackLive(confirm) {
    if (this.current || this.busy) throw new Error('Stop training before rolling back the live model.');
    if (confirm !== 'ROLLBACK MODEL') throw new Error('Type ROLLBACK MODEL to confirm the live AI rollback.');
    const previous = this._safeReadModel(path.join(this.dataDir, 'training_previous_live.json'));
    if (!previous) throw new Error('No live model rollback checkpoint is available.');
    await this.promoteLive(previous); // Saves current live weights as the new rollback point.
    return this.status();
  }
  exportCandidate() {
    if (!this.candidate) throw new Error('No saved neural candidate is available.');
    return { ok:true, model:this.candidate };
  }
  async restorePreviousCandidate() {
    if (this.current || this.busy) throw new Error('Stop training before restoring a candidate.');
    if (!this.previous) throw new Error('No previous candidate checkpoint exists.');
    await this._persistCandidate(this.previous, 'restored');
    return this.status();
  }
  async savePreviousCandidate() {
    if (this.candidate) { await atomicWriteJson(this.paths.previous, this.candidate); this.previous = this.candidate; }
  }
  report() {
    try { const report = readJson(this.paths.report); return { ok:true, report }; }
    catch (_) { return { ok:true, report:null }; }
  }
  async shutdown() { if (this.child) killTree(this.child); if (this.timer) clearInterval(this.timer); await this.writer.flush(); }
}
module.exports = { TrainingLab, validateConfig, validModel, scoreReport, MAX_VIRTUAL_SERVERS };
