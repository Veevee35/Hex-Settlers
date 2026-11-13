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
const { ensureCuda } = require('./neural-gpu');
const { gpuTelemetry, estimateGpuMemory } = require('./neural-gpu-capacity');
const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(__dirname, 'output');
const UI = path.join(__dirname, 'trainer-gui');
const SETTINGS = path.join(OUTPUT, 'neural_gui_settings.json');
const MODEL = path.join(ROOT, 'neural_ai_model.json');
const CSRF_TOKEN = crypto.randomBytes(24).toString('hex');
fs.mkdirSync(OUTPUT, { recursive: true });
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const defaults = {
  sims: 20000, generation: 1000, shards: 4, batch: 100, concurrency: 2,
  mapSet: 'standard', gpuMode: 'auto', epochs: 3, miniBatch: 256, python: 'python',
  idleTimeoutSec: 75, maxTrainingTurns: 900, aiActionBudget: 4, batchRestarts: 2,
};
let saved = defaults;
try { saved = normalize({ ...defaults, ...readJson(SETTINGS) }); } catch (_) { /* first launch */ }
let active = null;
let last = null;
let gpuStatus = null;
let checking = false;
let serverPort = 0;
let exactParityBusy = false;

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
  if (!['auto', 'cpu', 'cuda'].includes(raw.gpuMode)) throw new Error('Invalid GPU mode');
  const python = String(raw.python || 'python').trim();
  if (!python || python.length > 260 || /[\r\n]/.test(python)) throw new Error('Invalid Python executable path');
  return {
    sims, generation, shards, batch, concurrency, mapSet,
    gpuMode: raw.gpuMode, epochs: number('epochs', 1, 20, defaults.epochs),
    miniBatch: number('miniBatch', 16, 8192, defaults.miniBatch), python,
    idleTimeoutSec: number('idleTimeoutSec', 15, 900, defaults.idleTimeoutSec),
    maxTrainingTurns: number('maxTrainingTurns', 50, 5000, defaults.maxTrainingTurns),
    aiActionBudget: number('aiActionBudget', 2, 8, defaults.aiActionBudget),
    batchRestarts: number('batchRestarts', 0, 20, defaults.batchRestarts),
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
          shards: manifest.shards, mapSet: manifest.mapSet,
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
  if (match) job.progress = Math.max(job.progress, Number(match[1]));
  match = clean.match(/\[evolution\]\s+generation\s+(\d+)\/(\d+):/);
  if (match) {
    job.generation = Number(match[1]);
    job.progress = Math.max(job.progress, Number(match[1]) * job.settings.generation);
    job.winner = clean.match(/selected candidate\s+(\d+)/)?.[1] || job.winner;
  }
  if (clean.startsWith('[cuda]')) job.lastCuda = clean;
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
  const settings = normalize(raw.settings || {});
  let resumeFolder = '';
  if (raw.resumeFolder) {
    resumeFolder = String(raw.resumeFolder);
    if (!listRuns().some(run => run.id === resumeFolder)) throw new Error('Selected checkpoint folder was not found');
  }
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
    saved = settings;
    fs.writeFileSync(SETTINGS, JSON.stringify(settings, null, 2));
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
      KEEP_TRAINING_TEMP: '1', TRAINING_ACCELERATOR: accelerator,
      GPU_EPOCHS: String(settings.epochs), GPU_MINIBATCH: String(settings.miniBatch),
      IDLE_TIMEOUT_MS: String(settings.idleTimeoutSec * 1000),
      MAX_TRAINING_TURNS: String(settings.maxTrainingTurns),
      TRAINING_AI_ACTION_BUDGET: String(settings.aiActionBudget),
      MAX_BATCH_RESTARTS: String(settings.batchRestarts),
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
    emit(job, `[dashboard] Started ${settings.sims.toLocaleString()} games; ${accelerator.toUpperCase()} refinement; ${settings.mapSet} maps${resumeFolder ? `; resuming ${resumeFolder}` : ''}`);
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
  return {
    id: job.id, settings: job.settings, accelerator: job.accelerator,
    state: job.state, startedAt: job.startedAt, endedAt: job.endedAt,
    progress: job.progress, generation: job.generation, winner: job.winner,
    lastCuda: job.lastCuda, runFolder: job.runFolder,
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
async function handle(req, res) {
  const expectedHost = `127.0.0.1:${serverPort}`;
  if (req.headers.host !== expectedHost) return send(res, 403, { error: 'Localhost only' });
  const pathname = new URL(req.url, `http://${expectedHost}`).pathname;
  if (req.method === 'GET') {
    if (pathname === '/') return staticFile(res, 'index.html', 'text/html; charset=utf-8');
    if (pathname === '/app.js') return staticFile(res, 'app.js', 'text/javascript; charset=utf-8');
    if (pathname === '/style.css') return staticFile(res, 'style.css', 'text/css; charset=utf-8');
    if (pathname === '/api/hardware') return send(res, 200, { telemetry: await gpuTelemetry(), estimate:estimateGpuMemory({batch:saved.batch,miniBatch:saved.miniBatch}), exact: {bytesPerGame:26296, fullGameGpu:false, transitions:['dice production / bank scarcity / robber blocked / gold queues', 'normalized bank trade inventory updates']} });
    if (pathname === '/api/status') return send(res, 200, {
      token: CSRF_TOKEN, current: viewJob(active || last), settings: saved,
      runs: listRuns(), gpu: gpuStatus, checking, model: readModelOverview(),
    });
    return send(res, 404, { error: 'Not found' });
  }
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  if (req.headers.origin !== `http://${expectedHost}` || req.headers['x-hex-trainer-token'] !== CSRF_TOKEN) {
    return send(res, 403, { error: 'Invalid local request token or origin' });
  }
  let content = '';
  for await (const part of req) {
    content += part.toString('utf8');
    if (content.length > 16384) return send(res, 413, { error: 'Request too large' });
  }
  let payload = {};
  try { payload = content ? JSON.parse(content) : {}; } catch (_) { return send(res, 400, { error: 'Invalid JSON' }); }
  try {
    if (pathname === '/api/start') return send(res, 200, { ok: true, job: await start(payload) });
    if (pathname === '/api/pause') return send(res, 200, { ok: true, job: await pause() });
    if (pathname === '/api/stop') return send(res, 200, { ok: true, job: await stop() });
    if (pathname === '/api/exact-parity') {
      if (exactParityBusy) throw new Error('Native parity validation is already running');
      const backend = payload.backend === 'cuda' ? 'cuda' : 'cpu';
      const count = Number(payload.count || 250);
      if (!Number.isSafeInteger(count) || count < 1 || count > 2000) throw new Error('Parity cases must be 1–2000');
      exactParityBusy = true;
      try {
        const result = await new Promise((resolve, reject) => {
          const child = spawn(process.execPath, [path.join(__dirname, 'cuda-exact','exact_parity.js'), '--backend', backend, '--count', String(count)], { cwd:ROOT, windowsHide:true, stdio:['ignore','pipe','pipe'] });
          let out='', err='';
          const timeout = setTimeout(() => { child.kill(); reject(new Error('Parity check timed out after 120 seconds')); },120000);
          child.stdout.on('data',d=>{out=(out+d).slice(-6000);});
          child.stderr.on('data',d=>{err=(err+d).slice(-6000);});
          child.once('error', e=>{clearTimeout(timeout);reject(e);});
          child.once('close', code=>{clearTimeout(timeout); code===0 ? resolve(out.trim()) : reject(new Error(err.trim()||out.trim()||`Exited ${code}`)); });
        });
        return send(res, 200, { ok:true, backend, result, fullGameGpu:false });
      } finally { exactParityBusy = false; }
    }
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
    handle(req, res).catch(error => send(res, 500, { error: error.message }));
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
    server.close();
  });
}
module.exports = { normalize, listRuns, readModelOverview, viewJob };
