'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { execFileSync, fork } = require('node:child_process');
const { createHash, randomUUID } = require('node:crypto');
const { gzipSync, gunzipSync } = require('node:zlib');
const { rating, rate, ordinal } = require('openskill');
const { STYLE_MAPS } = require('./train_neural_ai_all_maps');
const { validateImportedModel } = require('./trainer-models');
const { atomicWriteJson, atomicWriteCompressedMatches } = require('./training-file');

const ROOT = path.resolve(__dirname, '..');
const OPENSKILL_VERSION = require('../package.json').devDependencies.openskill;
const OUTPUT = path.join(__dirname, 'output', 'benchmarks');
const PROFILES = Object.freeze({ quick: 100, checkpoint: 1000, release: 5000 });
const MAX_GAMES = 10000;
const SCENARIOS = STYLE_MAPS.filter(map => !map.customBuilder);
const REFERENCE_LOBBY = ['classic', 'four_islands', 'fog_island'];
const readJson = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const hash = input => createHash('sha256').update(input).digest('hex');
const mean = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

function buildSchedule({ games, maps, seed, candidate, opponent, maxTurns, replay }) {
  const tasks = [];
  for (let block = 0; tasks.length < games || block < maps.length; block++) {
    const map = maps[block % maps.length];
    const blockSeed = `${seed}:${map.id}:${Math.floor(block / maps.length)}`;
    for (let candidateSeat = 0; candidateSeat < map.players; candidateSeat++) {
      tasks.push({ map, seed: blockSeed, candidateSeat, candidate, opponent, maxTurns, replay });
    }
  }
  return tasks;
}

function grouped(values, key) {
  const groups = new Map();
  for (const value of values) {
    const id = key(value);
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(value);
  }
  return groups;
}

// Stratified cluster interval: entire seat rotations share a map and dice stream.
// Pool within-scenario variance for the overall result, and use a conservative
// variance floor to avoid spurious certainty when a small cohort sweeps.
function clusterInterval(games, value, min = 0, max = 1, critical = 1.96) {
  const total = games.length;
  if (!total) return { estimate: null, low: null, high: null, blocks: 0 };
  let estimate = 0;
  let variance = 0;
  let blocks = 0;
  for (const cohort of grouped(games, game => game.mapId).values()) {
    const samples = [...grouped(cohort, game => game.seed).values()].map(block => mean(block.map(value)));
    const n = samples.length;
    const average = mean(samples);
    const weight = cohort.length / total;
    const sampleVariance = n > 1 ? samples.reduce((sum, sample) => sum + (sample - average) ** 2, 0) / (n - 1) : 0;
    estimate += weight * average;
    variance += weight ** 2 * Math.max(sampleVariance, (max - min) ** 2 / (4 * n)) / n;
    blocks += n;
  }
  const margin = critical * Math.sqrt(variance);
  return { estimate, low: Math.max(min, estimate - margin), high: Math.min(max, estimate + margin), blocks };
}

const win = game => Number(game.status === 'completed' && game.winnerSeat === game.candidateSeat);

function summarize(games, rated = false) {
  const completed = games.filter(game => game.status === 'completed');
  const victories = completed.filter(win);
  const rows = completed.map(game => game.standings.find(seat => seat.seat === game.candidateSeat));
  const metrics = games.filter(game => game.technical).map(game => game.technical);
  const strategy = {};
  for (const row of rows) {
    const stats = row.strategy;
    const sumResources = resourceMap => Object.values(resourceMap || {}).reduce((sum, amount) => sum + amount, 0);
    const produced = sumResources(stats.resources.gainedBySource.production) + sumResources(stats.resources.gainedBySource.gold_production);
    const counters = {
      ...Object.fromEntries(Object.entries(stats).filter(([, val]) => typeof val === 'number' || val === null)),
      ...Object.fromEntries(Object.entries(stats.builds).map(([key, val]) => [`builds.${key}`, val])),
      bankTrades: stats.trades.bank, playerTrades: stats.trades.player,
      developmentBought: stats.development.bought, developmentPlayed: stats.development.played,
      produced, blockedProduction: sumResources(stats.resources.lostBySource.blocked),
      discarded: sumResources(stats.resources.lostBySource.discard), unspent: sumResources(stats.unspentResources),
      vpPerProducedCard: produced ? row.vp / produced : null,
      fogPerShip: stats.builds.ship ? stats.fogReveals / stats.builds.ship : null,
    };
    for (const [key, value] of Object.entries(counters)) {
      if (value === null) continue;
      const aggregate = strategy[key] ??= { total: 0, samples: 0 };
      aggregate.total += value;
      aggregate.samples++;
    }
  }
  const summary = {
    games: games.length, completed: completed.length, wins: victories.length, winRate: clusterInterval(games, win),
    equalPolicyWinRate: mean(games.map(game => 1 / game.players)),
    meanPlace: mean(rows.map(row => row.rank)), meanVp: mean(rows.map(row => row.vp)), turnsToWin: mean(victories.map(game => game.turn)),
    invalidActions: games.reduce((sum, game) => sum + (game.invalid?.length || 0), 0),
    outcomes: Object.fromEntries([...grouped(games, game => game.status)].map(([key, matches]) => [key, matches.length])),
    strategy: Object.fromEntries(Object.entries(strategy).map(([key, row]) => [key, row.total / row.samples])),
    technical: {
      meanDecisionMs: metrics.length ? metrics.reduce((sum, row) => sum + row.decisionMs, 0) / Math.max(1, metrics.reduce((sum, row) => sum + row.decisions, 0)) : null,
      maxDecisionMs: metrics.length ? Math.max(...metrics.map(row => row.longestDecisionMs)) : null,
      peakWorkerRssBytes: metrics.length ? Math.max(...metrics.map(row => row.rssBytes)) : null,
      workerCpuMs: metrics.reduce((sum, row) => sum + row.cpuMs, 0),
    },
  };
  if (rated && completed.length) {
    // Seat replicas are separate rating participants. Keep a fixed reference
    // panel within a matchup and never mix different player counts.
    let ratings = Array.from({ length: games[0].players }, () => rating());
    for (const game of completed) {
      const order = [game.candidateSeat, ...game.standings.map(row => row.seat).filter(seat => seat !== game.candidateSeat)];
      const ranks = order.map(seat => game.standings.find(row => row.seat === seat).rank);
      ratings = rate(ratings.map(player => [player]), { rank: ranks }).map(([player]) => player);
    }
    summary.openSkill = { ...ratings[0], ordinal: ordinal(ratings[0]), opponents: ratings.slice(1), version: OPENSKILL_VERSION };
  }
  return summary;
}

async function registerPolicy(source, output = OUTPUT) {
  if (['random', 'rules'].includes(source)) {
    return { id: source, label: source === 'random' ? 'Random legal-action baseline' : 'Hard rule-based AI',
      difficulty: source === 'random' ? 'benchmark_random' : 'hard' };
  }
  const bytes = source.bytes || (source.model ? Buffer.from(JSON.stringify(source.model)) : await fs.readFile(source.file));
  const model = validateImportedModel(JSON.parse(bytes));
  const id = hash(bytes);
  const weights = model.policy ? [model.params, model.policy.weights] : model.params;
  if (model.policy?.styles && Object.keys(model.policy.styles).length) {
    weights.push(Object.entries(model.policy.styles).sort(([a], [b]) => a.localeCompare(b)).map(([key, style]) => [key, style.weights]));
  }
  const weightsSha256 = hash(JSON.stringify(weights));
  const label = source.label || id.slice(0, 12);
  const archive = path.join(output, 'models', `${id}.json`);
  try { await fs.access(archive); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    try {
      await atomicWriteJson(archive, { id, model, weightsSha256, label, sourceJson: bytes.toString('utf8') });
    } catch (writeError) {
      // Another worker or CLI can register the same immutable snapshot first.
      const existing = await readJson(archive).catch(() => null);
      if (existing?.id !== id) throw writeError;
    }
  }
  return { id, model, label, weightsSha256, difficulty: 'neural_net' };
}

async function engineFingerprint() {
  const sourceFiles = ['server.js', ...((await fs.readdir(path.join(ROOT, 'server'))).filter(name => name.endsWith('.js')).sort()
    .map(name => `server/${name}`)), 'scripts/benchmark-engine.js'];
  return hash(Buffer.concat(await Promise.all(sourceFiles.map(file => fs.readFile(path.join(ROOT, file))))));
}

function workerCall(child, message, timeoutMs) {
  return new Promise((resolve, reject) => {
    const finish = (error, reply) => {
      clearTimeout(timer);
      child.off('message', onMessage);
      child.off('exit', onExit);
      child.off('error', onError);
      if (error) reject(error);
      else resolve(reply);
    };
    const onMessage = reply => finish(null, reply);
    const onExit = (code, signal) => finish(new Error(`Benchmark engine exited (${signal || code})`));
    const onError = error => finish(error);
    const timer = setTimeout(() => finish(new Error('Benchmark engine timed out')), timeoutMs);
    child.once('message', onMessage);
    child.once('exit', onExit);
    child.once('error', onError);
    child.send(message, error => { if (error) finish(error); });
  });
}

const DEFAULT_WORKERS = Math.min(8, os.availableParallelism());

function createBenchmarkWorkers(scratch, workers = DEFAULT_WORKERS, launchWorker = fork) {
  const slots = Array.from({ length: workers }, () => ({}));
  function close(slot, child = slot.child) {
    if (slot.child === child) {
      slot.child = undefined;
      slot.configuration = undefined;
    }
    child?.kill();
  }
  async function play(index, policies, task, signal) {
    const slot = slots[index];
    const configuration = JSON.stringify(Object.keys(policies).sort());
    for (let attempt = 0; attempt < 2; attempt++) {
      signal?.throwIfAborted();
      if (!slot.child) {
        await fs.mkdir(scratch, { recursive: true });
        signal?.throwIfAborted();
        const child = slot.child = launchWorker(path.join(ROOT, 'server.js'), [], {
          cwd: ROOT, silent: true, windowsHide: true, execArgv: [],
          env: { ...process.env, HOST: '127.0.0.1', DATA_DIR: scratch, RAILWAY_VOLUME_MOUNT_PATH: '', NODE_ENV: 'test',
            AI_FAST: '1', AI_TRAINING: '1', HEX_TRAINING_MANAGED: '1', HEX_BENCHMARK_WORKER: '1',
            HEX_TRAINING_FAST: '1', HEX_TRAINING_RULES: 'javascript', NEURAL_AI_PRIORITIES: '',
            HEX_BUILTIN_ADMIN_ENABLED: '0', CLOUDFLARE_STATE_ENDPOINT: '', HEX_UPSTREAM_SHARED_SECRET: '',
            HEX_ADMIN_HOST: '', HEX_TRUST_PROXY: '0', HEX_EMAIL_MODE: 'none' },
        });
        child.on('error', () => {});
        child.stdout.resume();
        slot.errors = '';
        child.stderr.on('data', chunk => { slot.errors = (slot.errors + chunk).slice(-4000); });
      }
      const child = slot.child;
      const abort = () => close(slot, child);
      signal?.addEventListener('abort', abort, { once: true });
      try {
        if (slot.configuration !== configuration) {
          const ready = await workerCall(child, { type: 'configure', policies }, 15000);
          slot.buildId = ready.buildId;
          slot.configuration = configuration;
        }
        const { result } = await workerCall(child, { type: 'match', task }, 120000);
        return { result, buildId: slot.buildId, retries: attempt };
      } catch (error) {
        const configured = slot.configuration === configuration;
        close(slot, child);
        signal?.throwIfAborted();
        if (attempt === 0) continue;
        if (!configured) throw new Error(`${error.message} ${slot.errors}`.trim());
        return { result: { status: 'crashed', infrastructure: true, error: `${error.message} ${slot.errors}`.trim() },
          buildId: slot.buildId, retries: attempt };
      } finally {
        signal?.removeEventListener('abort', abort);
      }
    }
  }
  return { workers, play, close: () => slots.forEach(slot => close(slot)) };
}

async function runBenchmark(options) {
  const {
    candidate, opponent, maps = REFERENCE_LOBBY, games = PROFILES.checkpoint, seed = 'comparison-v1',
    maxTurns = 900, workerPool, workers = workerPool?.workers ?? DEFAULT_WORKERS, output = OUTPUT, replay = true,
    onProgress = () => {}, signal, context = {}, prefix, interim,
  } = options;
  if (!Number.isInteger(games) || games < 1 || games > MAX_GAMES) throw new Error(`Game budget must be an integer from 1 to ${MAX_GAMES}`);
  if (!Number.isInteger(maxTurns) || maxTurns < 1 || maxTurns > 10000) throw new Error('Invalid benchmark turn limit');
  if (!Number.isInteger(workers) || workers < 1 || workers > 32) throw new Error('Worker count must be an integer from 1 to 32');
  if (!Array.isArray(maps) || !maps.length || new Set(maps).size !== maps.length) throw new Error('Choose unique benchmark scenarios');
  const scenarios = maps.map(id => {
    const map = SCENARIOS.find(entry => entry.id === id);
    if (!map) throw new Error(`Unknown benchmark scenario ${id}`);
    return map;
  });
  const [challenger, reference] = await Promise.all([registerPolicy(candidate, output), registerPolicy(opponent, output)]);
  const config = { games, maps, seed, maxTurns, replay };
  const policies = Object.fromEntries([challenger, reference].map(policy => [policy.id, policy]));
  const schedule = buildSchedule({ ...config, maps: scenarios, candidate: challenger.id, opponent: reference.id });
  const id = randomUUID();
  const directory = path.join(output, id);
  const scratch = path.join(directory, 'engine-data');
  await fs.mkdir(scratch, { recursive: true });
  const engineHash = await engineFingerprint();
  let revision = null;
  try { revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8', windowsHide: true }).trim(); } catch (_) {}
  const results = Array(schedule.length);
  if (prefix) {
    const { report, matches } = prefix;
    if (replay || report.config.replay || report.engineHash !== engineHash ||
        report.candidate.id !== challenger.id || report.opponent.id !== reference.id || report.config.maxTurns !== maxTurns ||
        matches.length > schedule.length || matches.some((game, i) => game.id !== i + 1 ||
          game.seed !== schedule[i].seed || game.mapId !== schedule[i].map.id || game.candidateSeat !== schedule[i].candidateSeat)) {
      throw new Error('Benchmark prefix does not match the engine, policies, and scheduled games');
    }
    for (let i = 0; i < matches.length; i++) results[i] = matches[i];
  }
  let cursor = prefix?.matches.length || 0;
  let completed = cursor;
  let engineBuild = prefix?.report.engineBuild;
  const started = Date.now();
  const pool = workerPool || createBenchmarkWorkers(scratch, workers);
  const simulate = async limit => {
    const settled = await Promise.allSettled(Array.from({ length: Math.min(workers, limit - cursor) }, async (_, slot) => {
      while (cursor < limit) {
        signal?.throwIfAborted();
        const index = cursor++;
        const task = schedule[index];
        const { result, buildId, retries } = await pool.play(slot, policies, task, signal);
        engineBuild = buildId || engineBuild;
        const { replay: trace, ...summary } = result;
        if (trace) await fs.writeFile(path.join(directory, `match-${index + 1}.json.gz`), gzipSync(JSON.stringify(trace), { level: 1 }));
        results[index] = { id: index + 1, mapId: task.map.id, players: task.map.players,
          seed: task.seed, candidateSeat: task.candidateSeat, hasReplay: !!trace, ...(retries ? { retries } : {}), ...summary };
        onProgress(++completed, schedule.length);
      }
    }));
    const failure = settled.find(row => row.status === 'rejected');
    if (failure) throw failure.reason;
  };
  let stoppedEarly = false;
  try {
    if (interim && interim.games < games) {
      const limit = buildSchedule({ ...config, maps: scenarios, games: interim.games }).length;
      await simulate(limit);
      stoppedEarly = interim.stop(results.slice(0, limit));
    }
    if (stoppedEarly) results.length = cursor;
    else await simulate(schedule.length);
    signal?.throwIfAborted();
  } catch (error) {
    await fs.rm(directory, { recursive: true, force: true }).catch(() => {});
    throw error;
  } finally {
    if (!workerPool) pool.close();
  }
  const durationMs = Date.now() - started;
  const publicPolicy = ({ model, ...policy }) => ({ ...policy, trainedGames: model?.trainedGames,
    objective: model?.meta?.policyObjective || model?.meta?.trainingObjective, metadata: model?.meta,
    ...(model?.policy ? { actionLearning: { version: model.policy.version, decisions: model.policy.decisions,
      games: model.policy.games, byPhase: model.policy.byPhase, byAction: model.policy.byAction,
      styles: model.policy.styles && Object.fromEntries(Object.entries(model.policy.styles).map(([key, { games, decisions }]) =>
        [key, { games, decisions }])) } } : {}) });
  const report = {
    id, config, context, revision, engineBuild, engineHash, workers, logicalCpus: os.availableParallelism(), rulesBackend: 'javascript',
    candidate: publicPolicy(challenger), opponent: publicPolicy(reference),
    startedAt: new Date(started).toISOString(), durationMs, stoppedEarly,
    simulatedGames: results.length - (prefix?.matches.length || 0),
    retriedGames: results.filter(game => game.retries).length,
    gamesPerSecond: (results.length - (prefix?.matches.length || 0)) / Math.max(0.001, durationMs / 1000),
    summary: summarize(results),
    byPlayerCount: Object.fromEntries([...grouped(results, game => game.players)].map(([count, rows]) => [count, summarize(rows, true)])),
    byScenario: Object.fromEntries([...grouped(results, game => game.mapId)].map(([map, rows]) => [map, summarize(rows)])),
  };
  await atomicWriteCompressedMatches(path.join(directory, 'matches.json.gz'), results);
  await atomicWriteJson(path.join(directory, 'report.json'), report);
  return report;
}

function compareRuns(current, baseline) {
  const key = game => JSON.stringify([game.mapId, game.seed, game.candidateSeat, game.boardHash]);
  const byMatch = new Map(baseline.map(game => [key(game), game]));
  const paired = current.filter(game => game.boardHash && byMatch.has(key(game))).map(game => ({
    ...game, delta: win(game) - win(byMatch.get(key(game))),
  }));
  const score = rows => clusterInterval(rows, game => game.delta, -1, 1);
  return {
    games: paired.length, winRateDelta: score(paired),
    byScenario: Object.fromEntries([...grouped(paired, game => game.mapId)].map(([map, rows]) => [map, score(rows)])),
    byPlayerCount: Object.fromEntries([...grouped(paired, game => game.players)].map(([count, rows]) => [count, score(rows)])),
  };
}

function directQualification(games) {
  return clusterInterval(games, game => win(game) - 1 / game.players, -1, 1, 2.576);
}

function cleanRun(games) {
  return games.length > 0 &&
    games.every(game => ['completed', 'turn-limit'].includes(game.status) && !game.invalid?.length) &&
    games.filter(game => game.status === 'turn-limit').length / games.length <= 0.02;
}

function promotionGate(againstChampion, againstReference, baselineReference) {
  const errors = [];
  const direct = directQualification(againstChampion);
  const reference = compareRuns(againstReference, baselineReference);
  if (againstChampion.length < PROFILES.checkpoint || !cleanRun(againstChampion)) {
    errors.push('Qualification requires at least 1,000 champion games, at most 2% turn-limit draws, and zero crashes, stalls or rejected actions.');
  }
  if (!(direct.low > 0) || direct.estimate < 0.02) errors.push('The lead over equal-policy win rate must reach two percentage points with a positive lower 99% bound.');
  if (!cleanRun(againstReference) || !cleanRun(baselineReference) ||
      reference.games !== againstReference.length || reference.games !== baselineReference.length) {
    errors.push('A matched reference comparison must meet the same turn-limit and legality requirements.');
  }
  for (const [map, interval] of Object.entries(reference.byScenario)) {
    if (interval.estimate < -0.10) errors.push(`${map} reference win rate fell by more than 10 percentage points.`);
  }
  const baselineByScenario = grouped(baselineReference, game => game.mapId);
  const drawRate = games => mean(games.map(game => Number(game.status === 'turn-limit')));
  for (const [map, games] of grouped(againstReference, game => game.mapId)) {
    if (baselineByScenario.has(map) && drawRate(games) - drawRate(baselineByScenario.get(map)) > 0.05) {
      errors.push(`${map} turn-limit draw rate increased by more than 5 percentage points.`);
    }
  }
  for (const [map, games] of grouped(againstChampion, game => game.mapId)) {
    if (directQualification(games).estimate < -0.10) errors.push(`${map} champion matchup fell more than 10 percentage points below equal-policy win rate.`);
  }
  return { promote: errors.length === 0, reasons: errors, direct, reference };
}

async function listBenchmarks(output = OUTPUT) {
  let entries;
  try { entries = await fs.readdir(output); } catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  const ids = entries.filter(isId);
  const reports = [];
  for (let index = 0; index < ids.length; index += 32) {
    const batch = await Promise.all(ids.slice(index, index + 32).map(async id => {
      try { return await readBenchmark(id, 'report', output); }
      catch (error) { if (error.code === 'ENOENT') return null; throw error; }
    }));
    reports.push(...batch.filter(Boolean));
  }
  return reports.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

const isId = id => typeof id === 'string' && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(id);
async function readBenchmark(id, entry, output = OUTPUT) {
  if (!isId(id)) throw new Error('Invalid benchmark ID');
  if (entry === 'report') return readJson(path.join(output, id, 'report.json'));
  if (entry === 'matches') {
    try { return JSON.parse(gunzipSync(await fs.readFile(path.join(output, id, 'matches.json.gz')))); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    return readJson(path.join(output, id, 'matches.json'));
  }
  if (!Number.isSafeInteger(entry) || entry < 1) throw new Error('Invalid match ID');
  return JSON.parse(gunzipSync(await fs.readFile(path.join(output, id, `match-${entry}.json.gz`))));
}

if (require.main === module) {
  const [candidate, opponent, profile = 'checkpoint', scenarioList, seed, workers] = process.argv.slice(2);
  const filePolicy = name => ['random', 'rules'].includes(name) ? name : { file: path.resolve(name), label: name };
  const count = PROFILES[profile] || Number(profile);
  const maps = scenarioList?.split(',') || (profile === 'quick' ? ['classic'] : profile === 'release' ? SCENARIOS.map(map => map.id) : REFERENCE_LOBBY);
  if (!candidate) {
    console.error('Usage: npm run benchmark:neural -- candidate.json [opponent.json|rules|random] [quick|checkpoint|release|games] [map1,map2] [seed] [workers]');
    process.exitCode = 1;
  } else runBenchmark({
    candidate: filePolicy(candidate), opponent: filePolicy(opponent || 'neural_ai_model.json'), games: count, maps,
    seed: seed || (profile === 'release' ? `holdout-${randomUUID()}` : undefined),
    workers: workers ? Number(workers) : undefined,
    onProgress: (done, total) => { if (done % 25 === 0 || done === total) console.log(`[benchmark] ${done}/${total}`); },
  }).then(report => {
    console.log(JSON.stringify({ id: report.id, durationMs: report.durationMs, ...report.summary }, null, 2));
  }).catch(error => { console.error(error); process.exitCode = 1; });
}

module.exports = { OUTPUT, PROFILES, MAX_GAMES, SCENARIOS, REFERENCE_LOBBY, buildSchedule, summarize, runBenchmark, createBenchmarkWorkers, listBenchmarks,
  readBenchmark, compareRuns, promotionGate, directQualification, cleanRun, engineFingerprint };
