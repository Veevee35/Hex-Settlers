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
const { TRAINING_OBJECTIVE } = require('../server/neural-objective');
const { atomicWriteJson } = require('../server/persistence');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const MODEL_PATH = path.resolve(process.env.MODEL_PATH || path.join(PROJECT_ROOT, 'neural_ai_model.json'));
const TOTAL_GAMES = Math.max(1, Math.floor(Number(process.env.SIMS || 500)));
const BATCH_SIZE = Math.max(1, Math.floor(Number(process.env.BATCH_SIZE || 25)));
const CONCURRENCY = Math.max(1, Math.floor(Number(process.env.CONCURRENCY || 5)));
const CURRICULUM_OFFSET = Math.max(0, Math.floor(Number(process.env.CURRICULUM_OFFSET || 0)));
const VP_TO_WIN_RAW = String(process.env.VP_TO_WIN || '').trim();
const VP_TO_WIN_PARSED = Math.floor(Number(VP_TO_WIN_RAW));
const VP_TO_WIN_OVERRIDE = VP_TO_WIN_RAW && Number.isFinite(VP_TO_WIN_PARSED) ? Math.max(3, VP_TO_WIN_PARSED) : null;
const GAME_TIMEOUT_MS = Math.max(20_000, Math.floor(Number(process.env.GAME_TIMEOUT_MS || 180_000)));
const KEEP_TEMP = String(process.env.KEEP_TRAINING_TEMP || '').toLowerCase() === '1';
const OUTPUT_PATH = path.resolve(process.env.TRAINING_OUTPUT || path.join(PROJECT_ROOT, 'scripts', 'output', `neural_ai_${TOTAL_GAMES}_fast_victory_all_scenarios.json`));

// Every lobby scenario is represented. Test Builder has no authored default
// board, so those rounds paint a varied, valid Gold-bearing training board.
const ALL_MAPS = Object.freeze([
  { id: 'classic', label: 'Classic', mapMode: 'classic', scenario: 'four_islands', players: 4, victoryPoints: 10 },
  { id: 'classic56', label: 'Classic 5-6', mapMode: 'classic56', scenario: 'four_islands', players: 6, victoryPoints: 10 },
  { id: 'four_islands', label: 'Four Islands', mapMode: 'seafarers', scenario: 'four_islands', players: 4, victoryPoints: 13, gold: true },
  { id: 'through_the_desert', label: 'Through the Desert', mapMode: 'seafarers', scenario: 'through_the_desert', players: 4, victoryPoints: 14, gold: true },
  { id: 'fog_island', label: 'Fog Island', mapMode: 'seafarers', scenario: 'fog_island', players: 4, victoryPoints: 12, gold: true },
  { id: 'heading_for_new_shores', label: 'Heading for New Shores', mapMode: 'seafarers', scenario: 'heading_for_new_shores', players: 4, victoryPoints: 14, gold: true },
  { id: 'cartographer_4_manual', label: 'Cartographer 4', mapMode: 'seafarers', scenario: 'cartographer_4_manual', players: 4, victoryPoints: 12, gold: true },
  { id: 'cartographer_4_random', label: 'Scattered Tiles 4', mapMode: 'seafarers', scenario: 'cartographer_4_random', players: 4, victoryPoints: 12, gold: true },
  { id: 'test_builder', label: 'Test Builder 4', mapMode: 'seafarers', scenario: 'test_builder', players: 4, victoryPoints: 13, gold: true, customBuilder: true },
  { id: 'six_islands', label: 'Six Islands', mapMode: 'seafarers', scenario: 'six_islands', players: 6, victoryPoints: 14, gold: true },
  { id: 'through_the_desert_56', label: 'Through the Desert 5-6', mapMode: 'seafarers', scenario: 'through_the_desert_56', players: 6, victoryPoints: 14, gold: true },
  { id: 'fog_island_56', label: 'Fog Island 5-6', mapMode: 'seafarers', scenario: 'fog_island_56', players: 6, victoryPoints: 12, gold: true },
  { id: 'cartographer_56_manual', label: 'Cartographer 5-6', mapMode: 'seafarers', scenario: 'cartographer_56_manual', players: 6, victoryPoints: 12, gold: true },
  { id: 'cartographer_56_random', label: 'Scattered Tiles 5-6', mapMode: 'seafarers', scenario: 'cartographer_56_random', players: 6, victoryPoints: 12, gold: true },
  { id: 'test_builder_56', label: 'Test Builder 5-6', mapMode: 'seafarers', scenario: 'test_builder_56', players: 6, victoryPoints: 13, gold: true, customBuilder: true },
]);
const MAP_SET = process.env.MAP_SET || 'all';
if (!['all', 'standard'].includes(MAP_SET)) throw new Error(`Unknown MAP_SET: ${MAP_SET}`);
const MAPS = Object.freeze(ALL_MAPS.filter(map => MAP_SET !== 'standard' || !map.customBuilder));

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
      AI_TRAINING: '1',
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

function seededRandom(seed) {
  let value = (Math.floor(Number(seed || 1)) || 1) >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function shuffleWith(items, random) {
  const result = items.slice();
  for (let index = result.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

function paintTrainingTestBuilder(peer, state, item) {
  const tiles = state?.geom?.tiles || [];
  if (!tiles.length) throw new Error(`No Test Builder preview geometry for ${item.map.id}`);
  const random = seededRandom(item.curriculumIndex + 0x5eed);
  const landRadius = item.map.players > 4 ? 3 : 2;
  const land = tiles.filter((tile) => {
    const q = Number(tile.q || 0);
    const r = Number(tile.r || 0);
    return Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) <= landRadius;
  });
  const center = land.find((tile) => Number(tile.q || 0) === 0 && Number(tile.r || 0) === 0) || land[0];
  if (!center || land.length < (item.map.players > 4 ? 28 : 19)) {
    throw new Error(`Test Builder land frame is too small for ${item.map.id}: ${land.length}`);
  }

  const resourcePool = shuffleWith(
    land.filter((tile) => tile.id !== center.id).map((_, index) => {
      if (index % 7 === 0) return 'gold';
      return ['forest', 'hills', 'pasture', 'field', 'mountains'][index % 5];
    }),
    random,
  );
  const numbers = shuffleWith([2, 3, 3, 4, 4, 5, 5, 6, 8, 9, 9, 10, 10, 11, 11, 12], random);
  let resourceIndex = 0;
  for (const tile of shuffleWith(land, random)) {
    if (tile.id === center.id) {
      peer.send({ type: 'edit_preview_tile', tileId: tile.id, tileType: 'desert', number: null });
      continue;
    }
    peer.send({
      type: 'edit_preview_tile',
      tileId: tile.id,
      tileType: resourcePool[resourceIndex],
      number: numbers[resourceIndex % numbers.length],
    });
    resourceIndex += 1;
  }
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
        victoryPointsToWin: VP_TO_WIN_OVERRIDE || item.map.victoryPoints,
        setupTurnMs: 30_000,
        playTurnMs: 30_000,
        microPhaseMs: 15_000,
        explorationPointsEnabled: true,
      },
    });
    await peer.waitFor((message) => message.type === 'room'
      && message.room.rules?.mapMode === item.map.mapMode
      && (item.map.mapMode !== 'seafarers' || message.room.rules?.seafarersScenario === item.map.scenario));

    if (item.map.customBuilder) {
      const preview = await peer.waitFor((message) => message.type === 'state'
        && message.state?.phase === 'lobby'
        && message.state?.previewKey === `seafarers:${item.map.scenario}`);
      paintTrainingTestBuilder(peer, preview.state, item);
    }

    peer.send({ type: 'fill_ai', targetCount: item.map.players });
    await peer.waitFor((message) => message.type === 'room' && (message.room.players || []).length === item.map.players);

    peer.send({ type: 'start_game' });
    const finished = await peer.waitFor((message) => message.type === 'state' && message.state?.phase === 'game-over', GAME_TIMEOUT_MS);
    const state = finished.state;
    const winner = (state.players || []).find((player) => player.id === state.winnerId);
    const victoryTarget = VP_TO_WIN_OVERRIDE || item.map.victoryPoints;
    if (!winner || Number(winner.vp || 0) < victoryTarget) throw new Error('Game ended without a valid victory');
    const opponentVp = (state.players || []).filter(player => player.id !== winner.id).map(player => Number(player.vp || 0));
    return {
      sessionIndex: item.sessionIndex,
      curriculumIndex: item.curriculumIndex,
      mapId: item.map.id,
      mapLabel: item.map.label,
      players: item.map.players,
      victoryPointsToWin: VP_TO_WIN_OVERRIDE || item.map.victoryPoints,
      turnNumber: Number(state.turnNumber || 0),
      winner: String(winner?.name || winner?.id || 'unknown'),
      winnerVp: Number(winner?.vp || 0),
      highestOpponentVp: Math.max(0, ...opponentVp),
      winnerMargin: Number(winner.vp) - Math.max(0, ...opponentVp),
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
    curriculumIndex: CURRICULUM_OFFSET + sessionIndex,
    map: MAPS[(CURRICULUM_OFFSET + sessionIndex) % MAPS.length],
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
  for (const map of MAPS) byMap[map.id] = { label: map.label, victoryPointsToWin: VP_TO_WIN_OVERRIDE || map.victoryPoints, games: 0, turns: 0, minTurn: Infinity, maxTurn: 0, goldProductionCards: 0 };
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
      // Commit completed batches together so a long interrupted run is recoverable.
      await atomicWriteJson(`${OUTPUT_PATH}.checkpoint.json`, { startingTrainedGames: Number(startingModel.trainedGames || 0), model: batchModel, games: results });
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
      curriculumOffset: CURRICULUM_OFFSET,
      victoryPointsToWin: VP_TO_WIN_OVERRIDE || 'scenario-defaults',
      trainingObjective: TRAINING_OBJECTIVE,
      mapSet: MAP_SET,
      mapsCovered: MAPS.map((map) => map.id),
      startingTrainedGames: Number(startingModel.trainedGames || 0),
      finalTrainedGames: Number(finalModel.trainedGames || 0),
      startingModelSha256: startingHash,
      finalModelSha256: modelHash(MODEL_PATH),
      totalGoldProductionCards: results.reduce((sum, result) => sum + result.goldProductionCards, 0),
      averageVictoryTurn: results.reduce((sum, result) => sum + result.turnNumber, 0) / Math.max(1, results.length),
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

module.exports = { ALL_MAPS, MAPS, curriculum, summarize };
if (require.main === module) main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
