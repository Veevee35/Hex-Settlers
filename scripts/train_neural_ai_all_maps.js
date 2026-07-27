'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const WebSocket = require('ws');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const MODEL_PATH = path.resolve(process.env.MODEL_PATH || path.join(PROJECT_ROOT, 'neural_ai_model.json'));
const TOTAL_GAMES = Math.max(1, Math.floor(Number(process.env.SIMS || 500)));
const BATCH_SIZE = Math.max(1, Math.floor(Number(process.env.BATCH_SIZE || 25)));
const CONCURRENCY = Math.max(1, Math.floor(Number(process.env.CONCURRENCY || 5)));
const VP_TO_WIN = Math.max(3, Math.floor(Number(process.env.VP_TO_WIN || 7)));
const GAME_TIMEOUT_MS = Math.max(20_000, Math.floor(Number(process.env.GAME_TIMEOUT_MS || 180_000)));
const KEEP_TEMP = String(process.env.KEEP_TRAINING_TEMP || '').toLowerCase() === '1';
const OUTPUT_PATH = path.resolve(process.env.TRAINING_OUTPUT || path.join(PROJECT_ROOT, 'scripts', 'output', `neural_ai_${TOTAL_GAMES}_all_maps.json`));

// Test Builder is a player-authored editor rather than a canonical map. Every
// standard, generated, and draftable map offered by the lobby is represented.
const MAPS = Object.freeze([
  { id: 'classic', label: 'Classic', mapMode: 'classic', scenario: 'four_islands', players: 4 },
  { id: 'classic56', label: 'Classic 5-6', mapMode: 'classic56', scenario: 'four_islands', players: 6 },
  { id: 'four_islands', label: 'Four Islands', mapMode: 'seafarers', scenario: 'four_islands', players: 4, gold: true },
  { id: 'through_the_desert', label: 'Through the Desert', mapMode: 'seafarers', scenario: 'through_the_desert', players: 4, gold: true },
  { id: 'fog_island', label: 'Fog Island', mapMode: 'seafarers', scenario: 'fog_island', players: 4, gold: true },
  { id: 'heading_for_new_shores', label: 'Heading for New Shores', mapMode: 'seafarers', scenario: 'heading_for_new_shores', players: 4, gold: true },
  { id: 'cartographer_4_manual', label: 'Cartographer 4', mapMode: 'seafarers', scenario: 'cartographer_4_manual', players: 4, gold: true },
  { id: 'cartographer_4_random', label: 'Scattered Tiles 4', mapMode: 'seafarers', scenario: 'cartographer_4_random', players: 4, gold: true },
  { id: 'six_islands', label: 'Six Islands', mapMode: 'seafarers', scenario: 'six_islands', players: 6, gold: true },
  { id: 'through_the_desert_56', label: 'Through the Desert 5-6', mapMode: 'seafarers', scenario: 'through_the_desert_56', players: 6, gold: true },
  { id: 'fog_island_56', label: 'Fog Island 5-6', mapMode: 'seafarers', scenario: 'fog_island_56', players: 6, gold: true },
  { id: 'cartographer_56_manual', label: 'Cartographer 5-6', mapMode: 'seafarers', scenario: 'cartographer_56_manual', players: 6, gold: true },
  { id: 'cartographer_56_random', label: 'Scattered Tiles 5-6', mapMode: 'seafarers', scenario: 'cartographer_56_random', players: 6, gold: true },
]);

function readModel(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function modelHash(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

async function unusedPort() {
  const server = net.createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = server.address().port;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function waitForServer(port, output) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      await new Promise((resolve, reject) => {
        const request = http.get(`http://127.0.0.1:${port}/`, (response) => {
          response.resume();
          response.statusCode === 200 ? resolve() : reject(new Error(`HTTP ${response.statusCode}`));
        });
        request.once('error', reject);
      });
      return;
    } catch (_) {
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
  }
  throw new Error(`Training server did not start.\n${output()}`);
}

async function startTrainingServer(dataDir) {
  const port = await unusedPort();
  let output = '';
  const child = spawn(process.execPath, ['server.js'], {
    cwd: PROJECT_ROOT,
    env: {
      ...process.env,
      PORT: String(port),
      HOST: '127.0.0.1',
      DATA_DIR: dataDir,
      NODE_ENV: 'test',
      AI_FAST: '1',
      HEX_BUILTIN_ADMIN_ENABLED: '0',
    },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    windowsHide: true,
  });
  child.stdout.on('data', (chunk) => { output += String(chunk); });
  child.stderr.on('data', (chunk) => { output += String(chunk); });
  await waitForServer(port, () => output);
  return {
    child,
    port,
    output: () => output,
    async stop() {
      if (child.exitCode !== null) return;
      const exited = once(child, 'exit');
      if (child.connected) child.send({ type: 'shutdown' });
      else child.kill('SIGTERM');
      const clean = await Promise.race([
        exited.then(() => true),
        new Promise((resolve) => setTimeout(() => resolve(false), 8_000)),
      ]);
      if (!clean && child.exitCode === null) {
        child.kill('SIGTERM');
        await once(child, 'exit');
      }
    },
  };
}

class Peer {
  constructor(ws) {
    this.ws = ws;
    this.messages = [];
    this.waiters = [];
    ws.on('message', (raw) => this.accept(JSON.parse(String(raw))));
  }

  static async connect(port) {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const peer = new Peer(ws);
    await once(ws, 'open');
    await peer.waitFor((message) => message.type === 'hello');
    return peer;
  }

  accept(message) {
    const index = this.waiters.findIndex((waiter) => waiter.predicate(message));
    if (index >= 0) {
      const [waiter] = this.waiters.splice(index, 1);
      clearTimeout(waiter.timer);
      waiter.resolve(message);
    } else {
      this.messages.push(message);
      if (this.messages.length > 250) this.messages.shift();
    }
  }

  waitFor(predicate, timeoutMs = 25_000) {
    const queuedIndex = this.messages.findIndex(predicate);
    if (queuedIndex >= 0) return Promise.resolve(this.messages.splice(queuedIndex, 1)[0]);
    return new Promise((resolve, reject) => {
      const waiter = { predicate, resolve, reject, timer: null };
      waiter.timer = setTimeout(() => {
        const index = this.waiters.indexOf(waiter);
        if (index >= 0) this.waiters.splice(index, 1);
        reject(new Error(`Timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      this.waiters.push(waiter);
    });
  }

  send(payload) { this.ws.send(JSON.stringify(payload)); }
  close() { try { this.ws.close(); } catch (_) {} }
}

async function createTrainerToken(port, batchNo) {
  const peer = await Peer.connect(port);
  try {
    const suffix = `${Date.now().toString(36)}_${batchNo}`;
    peer.send({
      type: 'auth_register',
      username: `nt_${batchNo}_${Date.now().toString(36)}`,
      password: `training-${suffix}-pass`,
      displayName: `Curriculum ${batchNo}`,
    });
    const response = await peer.waitFor((message) => message.type === 'auth_ok' || message.type === 'error');
    if (response.type !== 'auth_ok' || !response.token) throw new Error(response.error || 'Could not register trainer');
    return response.token;
  } finally {
    peer.close();
  }
}

function goldProductionCards(state) {
  let total = 0;
  for (const playerStats of Object.values(state?.stats?.resources?.byPlayer || {})) {
    const source = playerStats?.gainedBySource?.gold_production || {};
    for (const kind of ['brick', 'lumber', 'wool', 'grain', 'ore']) total += Number(source[kind] || 0);
  }
  return total;
}

async function runOneGame(port, token, item) {
  const peer = await Peer.connect(port);
  try {
    peer.send({ type: 'auth_token', token });
    const auth = await peer.waitFor((message) => message.type === 'auth_ok' || message.type === 'error');
    if (auth.type !== 'auth_ok') throw new Error(auth.error || 'Token authentication failed');

    peer.send({ type: 'create_room', displayName: `Neural ${item.sessionIndex + 1}` });
    const joined = await peer.waitFor((message) => message.type === 'joined' || message.type === 'error');
    if (joined.type === 'error') throw new Error(joined.error);
    const trainerId = joined.playerId;

    peer.send({ type: 'set_spectator_mode', enabled: true });
    await peer.waitFor((message) => message.type === 'room'
      && (message.room.spectators || []).some((member) => member.id === trainerId));

    peer.send({ type: 'set_ai_difficulty', difficulty: 'neural_net' });
    await peer.waitFor((message) => message.type === 'room' && message.room.aiDifficulty === 'neural_net');

    peer.send({
      type: 'set_rules',
      rules: {
        mapMode: item.map.mapMode,
        seafarersScenario: item.map.scenario,
        victoryPointsToWin: VP_TO_WIN,
        setupTurnMs: 30_000,
        playTurnMs: 30_000,
        microPhaseMs: 15_000,
        explorationPointsEnabled: true,
      },
    });
    await peer.waitFor((message) => message.type === 'room'
      && message.room.rules?.mapMode === item.map.mapMode
      && (item.map.mapMode !== 'seafarers' || message.room.rules?.seafarersScenario === item.map.scenario));

    peer.send({ type: 'fill_ai', targetCount: item.map.players });
    await peer.waitFor((message) => message.type === 'room' && (message.room.players || []).length === item.map.players);

    peer.send({ type: 'start_game' });
    const finished = await peer.waitFor((message) => message.type === 'state' && message.state?.phase === 'game-over', GAME_TIMEOUT_MS);
    const state = finished.state;
    const winner = (state.players || []).find((player) => player.id === state.winnerId)
      || (state.players || []).reduce((best, player) => (!best || Number(player.vp || 0) > Number(best.vp || 0)) ? player : best, null);
    return {
      sessionIndex: item.sessionIndex,
      mapId: item.map.id,
      mapLabel: item.map.label,
      players: item.map.players,
      turnNumber: Number(state.turnNumber || 0),
      winner: String(winner?.name || winner?.id || 'unknown'),
      winnerVp: Number(winner?.vp || 0),
      goldProductionCards: goldProductionCards(state),
    };
  } finally {
    peer.close();
  }
}

function curriculum(total) {
  // Round-robin order guarantees every prefix remains balanced. Gold-bearing
  // maps make up most of the lobby's standard map catalog by design.
  return Array.from({ length: total }, (_, sessionIndex) => ({
    sessionIndex,
    map: MAPS[sessionIndex % MAPS.length],
  }));
}

async function runBatch(server, token, items, completedBefore) {
  const queue = items.slice();
  const results = [];
  let attempts = 0;
  const maxAttempts = Math.max(items.length * 4, items.length + 10);

  const worker = async () => {
    while (queue.length) {
      const item = queue.shift();
      if (!item) return;
      attempts += 1;
      if (attempts > maxAttempts) throw new Error(`Batch exceeded ${maxAttempts} attempts`);
      try {
        const result = await runOneGame(server.port, token, item);
        results.push(result);
        const totalComplete = completedBefore + results.length;
        if (totalComplete % 10 === 0 || totalComplete === TOTAL_GAMES) {
          process.stdout.write(`[train] ${totalComplete}/${TOTAL_GAMES} map=${result.mapId} turn=${result.turnNumber} gold=${result.goldProductionCards}\n`);
        }
      } catch (error) {
        process.stderr.write(`[train] retry map=${item.map.id} game=${item.sessionIndex + 1}: ${error.message}\n`);
        queue.push(item);
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker));
  return results;
}

function summarize(results) {
  const byMap = {};
  for (const map of MAPS) byMap[map.id] = { label: map.label, games: 0, turns: 0, minTurn: Infinity, maxTurn: 0, goldProductionCards: 0 };
  for (const result of results) {
    const summary = byMap[result.mapId];
    summary.games += 1;
    summary.turns += result.turnNumber;
    summary.minTurn = Math.min(summary.minTurn, result.turnNumber);
    summary.maxTurn = Math.max(summary.maxTurn, result.turnNumber);
    summary.goldProductionCards += result.goldProductionCards;
  }
  for (const summary of Object.values(byMap)) {
    summary.averageTurn = summary.games ? summary.turns / summary.games : 0;
    if (!Number.isFinite(summary.minTurn)) summary.minTurn = 0;
    delete summary.turns;
  }
  return byMap;
}

async function main() {
  if (!fs.existsSync(MODEL_PATH)) throw new Error(`Model not found: ${MODEL_PATH}`);
  const startingModel = readModel(MODEL_PATH);
  const startingHash = modelHash(MODEL_PATH);
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hex-neural-curriculum-'));
  const items = curriculum(TOTAL_GAMES);
  const results = [];
  let latestModelPath = MODEL_PATH;

  try {
    for (let offset = 0, batchNo = 1; offset < items.length; offset += BATCH_SIZE, batchNo++) {
      const batchItems = items.slice(offset, offset + BATCH_SIZE);
      const batchDir = path.join(tempRoot, `batch-${String(batchNo).padStart(3, '0')}`);
      fs.mkdirSync(batchDir, { recursive: true });
      fs.copyFileSync(latestModelPath, path.join(batchDir, 'neural_ai_model.json'));

      const server = await startTrainingServer(batchDir);
      try {
        const token = await createTrainerToken(server.port, batchNo);
        results.push(...await runBatch(server, token, batchItems, results.length));
      } finally {
        await server.stop();
      }

      latestModelPath = path.join(batchDir, 'neural_ai_model.json');
      const batchModel = readModel(latestModelPath);
      const expected = Number(startingModel.trainedGames || 0) + results.length;
      if (Number(batchModel.trainedGames || 0) !== expected) {
        throw new Error(`Model trainedGames=${batchModel.trainedGames}; expected ${expected} after batch ${batchNo}`);
      }
    }

    results.sort((a, b) => a.sessionIndex - b.sessionIndex);
    fs.copyFileSync(latestModelPath, MODEL_PATH);
    const finalModel = readModel(MODEL_PATH);
    const report = {
      mode: 'neural_net_self_play',
      requestedGames: TOTAL_GAMES,
      completedGames: results.length,
      batchSize: BATCH_SIZE,
      concurrency: CONCURRENCY,
      victoryPointsToWin: VP_TO_WIN,
      mapsCovered: MAPS.map((map) => map.id),
      startingTrainedGames: Number(startingModel.trainedGames || 0),
      finalTrainedGames: Number(finalModel.trainedGames || 0),
      startingModelSha256: startingHash,
      finalModelSha256: modelHash(MODEL_PATH),
      totalGoldProductionCards: results.reduce((sum, result) => sum + result.goldProductionCards, 0),
      byMap: summarize(results),
      games: results,
      completedAt: new Date().toISOString(),
    };
    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log(JSON.stringify({ ...report, games: undefined, reportPath: OUTPUT_PATH }, null, 2));
  } finally {
    if (!KEEP_TEMP) fs.rmSync(tempRoot, { recursive: true, force: true });
    else console.log(`[train] kept temporary data at ${tempRoot}`);
  }
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
