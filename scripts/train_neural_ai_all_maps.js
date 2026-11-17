'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { once, setMaxListeners } = require('node:events');
const WebSocket = require('ws');
const { TRAINING_OBJECTIVE } = require('../server/neural-objective');
const { defaultVictoryPointsToWin } = require('../server/victory-target');
const { atomicWriteJson } = require('./training-file');
const { fallbackMap, trainingAnchorSeat, validateCheckpoint } = require('./training-recovery');
const { ensureCuda, refine } = require('./neural-gpu');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const MODEL_PATH = path.resolve(process.env.MODEL_PATH || path.join(PROJECT_ROOT, 'neural_ai_model.json'));
const TOTAL_GAMES = Math.max(1, Math.floor(Number(process.env.SIMS || 500)));
const REQUESTED_BATCH_SIZE = Math.max(1, Math.floor(Number(process.env.BATCH_SIZE || 25)));
const REQUESTED_CONCURRENCY = Math.max(1, Math.floor(Number(process.env.CONCURRENCY || 2)));
const CURRICULUM_OFFSET = Math.max(0, Math.floor(Number(process.env.CURRICULUM_OFFSET || 0)));
const VP_TO_WIN_RAW = String(process.env.VP_TO_WIN || '').trim();
const VP_TO_WIN_PARSED = Math.floor(Number(VP_TO_WIN_RAW));
const VP_TO_WIN_OVERRIDE = VP_TO_WIN_RAW && Number.isFinite(VP_TO_WIN_PARSED) ? Math.max(3, VP_TO_WIN_PARSED) : null;
const GAME_TIMEOUT_MS = Math.max(20_000, Math.floor(Number(process.env.GAME_TIMEOUT_MS || 240_000)));
const KEEP_TEMP = String(process.env.KEEP_TRAINING_TEMP || '').toLowerCase() === '1';
const RESUME_TRAINING = process.env.RESUME_TRAINING === '1';
const NATIVE_SELF_PLAY = process.env.HEX_TRAINING_RULES === 'cpp';
const ANCHOR_MODEL = process.env.TRAINING_ANCHOR_MODEL || '';
const STYLE_CURRICULUM = process.env.TRAINING_STYLE_POLICY === '1';
const LEARNING_LOOP = Number(process.env.TRAINING_LEARNING_LOOP || 0);
const GPU_TRAINING = String(process.env.TRAINING_ACCELERATOR || 'cpu').toLowerCase() === 'cuda';
// A candidate's matches share one event loop and one online model.
const CONCURRENCY = NATIVE_SELF_PLAY ? REQUESTED_CONCURRENCY : Math.min(2, REQUESTED_CONCURRENCY);
const BATCH_SIZE = NATIVE_SELF_PLAY ? REQUESTED_BATCH_SIZE : Math.min(50, REQUESTED_BATCH_SIZE);
const CONTROL_FILE = String(process.env.TRAINING_CONTROL_FILE || '').trim();
let supervisorPaused = false;
function isPauseRequested() {
  if (supervisorPaused) return true;
  if (!CONTROL_FILE) return false;
  try { return JSON.parse(fs.readFileSync(CONTROL_FILE, 'utf8')).pause === true; } catch (_) { return false; }
}

const IDLE_TIMEOUT_MS = Math.max(15_000, Math.floor(Number(process.env.IDLE_TIMEOUT_MS || 75_000)));
const MAX_TRAINING_TURNS = Math.max(50, Math.floor(Number(process.env.MAX_TRAINING_TURNS || 900)));
const MAX_ATTEMPTS_PER_MAP = Math.max(1, Math.floor(Number(process.env.MAX_ATTEMPTS_PER_MAP || 2)));
const MAX_MAP_REPLACEMENTS = Math.max(0, Math.floor(Number(process.env.MAX_MAP_REPLACEMENTS || 6)));
const MAX_BATCH_RESTARTS = Math.max(0, Math.floor(Number(process.env.MAX_BATCH_RESTARTS || 2)));
const MAX_CONSECUTIVE_FAILURES = Math.max(2, Math.floor(Number(process.env.MAX_CONSECUTIVE_FAILURES || 4)));
const MAP_QUARANTINE_FAILURES = Math.max(1, Math.floor(Number(process.env.MAP_QUARANTINE_FAILURES || 3)));
const MAP_QUARANTINE_GAMES = Math.max(1, Math.floor(Number(process.env.MAP_QUARANTINE_GAMES || 80)));
const OUTPUT_PATH = path.resolve(process.env.TRAINING_OUTPUT || path.join(PROJECT_ROOT, 'scripts', 'output', `neural_ai_${TOTAL_GAMES}_fast_victory_all_scenarios.json`));

// Include the 7-8 player and New Shores curricula alongside original maps.
// Test Builder has no authored default
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
  { id: 'heading_for_new_shores_56', label: 'Heading for New Shores 5-6', mapMode: 'seafarers', scenario: 'heading_for_new_shores_56', players: 6, victoryPoints: 14, gold: true },
  { id: 'through_the_desert_56', label: 'Through the Desert 5-6', mapMode: 'seafarers', scenario: 'through_the_desert_56', players: 6, victoryPoints: 14, gold: true },
  { id: 'fog_island_56', label: 'Fog Island 5-6', mapMode: 'seafarers', scenario: 'fog_island_56', players: 6, victoryPoints: 12, gold: true },
  { id: 'cartographer_56_manual', label: 'Cartographer 5-6', mapMode: 'seafarers', scenario: 'cartographer_56_manual', players: 6, victoryPoints: 12, gold: true },
  { id: 'cartographer_56_random', label: 'Scattered Tiles 5-6', mapMode: 'seafarers', scenario: 'cartographer_56_random', players: 6, victoryPoints: 12, gold: true },
  { id: 'test_builder_56', label: 'Test Builder 5-6', mapMode: 'seafarers', scenario: 'test_builder_56', players: 6, victoryPoints: 13, gold: true, customBuilder: true },
  { id: 'classic78', label: 'Classic 7-8', mapMode: 'classic78', scenario: 'four_islands', players: 8, victoryPoints: 14 },
  { id: 'eight_islands_78', label: 'Eight Islands 7-8', mapMode: 'seafarers', scenario: 'eight_islands_78', players: 8, victoryPoints: 14, gold: true },
  { id: 'through_the_desert_78', label: 'Through the Desert 7-8', mapMode: 'seafarers', scenario: 'through_the_desert_78', players: 8, victoryPoints: 14, gold: true },
  { id: 'fog_island_78', label: 'Fog Island 7-8', mapMode: 'seafarers', scenario: 'fog_island_78', players: 8, victoryPoints: 14, gold: true },
  { id: 'heading_for_new_shores_78', label: 'Heading for New Shores 7-8', mapMode: 'seafarers', scenario: 'heading_for_new_shores_78', players: 8, victoryPoints: 14, gold: true },
]);
const LARGE_DRAFT_MAPS = [
  { id: 'cartographer_78', label: 'Cartographer 7-8', mapMode: 'seafarers', scenario: 'cartographer_78', players: 8, victoryPoints: 14, gold: true },
  { id: 'scattered_tiles_78', label: 'Scattered Tiles 7-8', mapMode: 'seafarers', scenario: 'scattered_tiles_78', players: 8, victoryPoints: 14, gold: true },
];

const variants = [...ALL_MAPS, ...LARGE_DRAFT_MAPS].flatMap(map => {
  const smaller = map.players === 4 ? [2, 3] : [map.players - 1];
  return [map, ...smaller.map(players => ({ ...map, id: `${map.id}_${players}p`, players }))];
});
const byCount = [2, 3, 4, 5, 6, 7, 8].map(count => variants.filter(map => map.players === count));
const STYLE_MAPS = Object.freeze(Array.from({ length: Math.max(...byCount.map(rows => rows.length)) },
  (_, index) => byCount.map(rows => rows[index]).filter(Boolean)).flat());
const MAP_SET = process.env.MAP_SET || 'all';
if (!['all', 'standard'].includes(MAP_SET)) throw new Error(`Unknown MAP_SET: ${MAP_SET}`);
const withLiveVictoryTarget = map => ({
  ...map, victoryPoints: defaultVictoryPointsToWin({ mapMode: map.mapMode, seafarersScenario: map.scenario }),
});
const MAPS = Object.freeze((STYLE_CURRICULUM ? STYLE_MAPS : ALL_MAPS)
  .filter(map => MAP_SET !== 'standard' || !map.customBuilder)
  .map(map => LEARNING_LOOP >= 4 ? withLiveVictoryTarget(map) : map));

function readModel(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function modelHash(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

async function startTrainingServer(dataDir) {
  let output = '';
  const child = spawn(process.execPath, ['server.js'], {
    cwd: PROJECT_ROOT,
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      DATA_DIR: dataDir,
      RAILWAY_VOLUME_MOUNT_PATH: '',
      NODE_ENV: 'test',
      AI_FAST: '1',
      AI_TRAINING: '1',
      HEX_TRAINING_MANAGED: '1',
      HEX_TRAINING_FAST: process.env.HEX_TRAINING_FAST ?? '1',
      NEURAL_GPU_TRAINING: GPU_TRAINING ? '1' : '0',
      HEX_BUILTIN_ADMIN_ENABLED: '0',
      // Never inherit production persistence/auth bridge settings in self-play.
      CLOUDFLARE_STATE_ENDPOINT: '',
      HEX_UPSTREAM_SHARED_SECRET: '',
      HEX_ADMIN_HOST: '',
      HEX_TRUST_PROXY: '0',
      HEX_EMAIL_MODE: 'none',
    },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    windowsHide: true,
  });
  const appendOutput = chunk => { output = (output + String(chunk)).slice(-24_000); };
  child.stdout.on('data', appendOutput);
  child.stderr.on('data', appendOutput);
  let launchError;
  child.on('error', error => { launchError = error; appendOutput(error.message); });
  const closed = new Promise(resolve => child.once('close', (code, signal) => resolve({ code, signal })));
  const stop = async () => {
    if (!child.pid || child.exitCode !== null || child.signalCode) return closed;
    if (child.connected) child.send({ type: 'shutdown' }, () => {});
    let timer;
    try {
      const exited = await Promise.race([
        closed.then(() => true),
        new Promise(resolve => { timer = setTimeout(() => resolve(false), 8000); }),
      ]);
      if (!exited) {
        child.kill('SIGKILL');
        await closed;
      }
    } finally { clearTimeout(timer); }
  };
  let port;
  let timer;
  const ready = new Promise(resolve => {
    child.on('message', message => {
      if (message?.type === 'training_ready' && Number.isInteger(message.port) && message.port > 0) resolve(message.port);
    });
  });
  try {
    port = await Promise.race([
      ready,
      closed.then(({ code, signal }) => {
        throw new Error(launchError?.message || `Training server exited before readiness (exit=${code}, signal=${signal})`);
      }),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Training server startup timed out')), 30_000); }),
    ]);
  } catch (error) {
    await stop();
    throw new Error(`${error.message}\n${output}`, { cause: error });
  } finally {
    clearTimeout(timer);
  }
  return { child, port, output: () => output, stop };
}

class Peer {
  constructor(ws) {
    this.ws = ws;
    this.messages = [];
    this.waiters = [];
    this.closedError = null;
    ws.on('message', (raw) => {
      try { this.accept(JSON.parse(String(raw))); }
      catch (error) { this.fail(error); }
    });
    ws.on('error', (error) => this.fail(error));
    ws.on('close', (code) => this.fail(new Error(`Training WebSocket closed (${code})`)));
  }

  static async connect(port, signal) {
    signal?.throwIfAborted();
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const peer = new Peer(ws);
    const abort = () => {
      peer.fail(signal.reason);
      ws.terminate();
    };
    signal?.addEventListener('abort', abort, { once: true });
    ws.once('close', () => signal?.removeEventListener('abort', abort));
    try {
      let timer;
      try {
        await Promise.race([
          once(ws, 'open'),
          new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('WebSocket connection timed out')), 5000); }),
        ]);
      } finally { clearTimeout(timer); }
      await peer.waitFor((message) => message.type === 'hello');
      return peer;
    } catch (error) {
      peer.close();
      throw error;
    }
  }

  fail(error) {
    if (this.closedError) return;
    this.closedError = error;
    for (const waiter of this.waiters.splice(0)) {
      clearTimeout(waiter.timer);
      waiter.reject(error);
    }
  }

  accept(message) {
    const index = this.waiters.findIndex((waiter) => waiter.predicate(message) || message.type === 'error' || message.type === 'auth_required');
    if (index >= 0) {
      const [waiter] = this.waiters.splice(index, 1);
      clearTimeout(waiter.timer);
      if (!waiter.predicate(message)) waiter.reject(new Error(message.error || message.reason || 'Server rejected trainer request'));
      else waiter.resolve(message);
    } else {
      this.messages.push(message);
      if (this.messages.length > 250) this.messages.shift();
    }
  }

  waitFor(predicate, timeoutMs = 25_000) {
    if (this.closedError) return Promise.reject(this.closedError);
    const queuedIndex = this.messages.findIndex(m => predicate(m) || m.type === 'error' || m.type === 'auth_required');
    if (queuedIndex >= 0) {
      const message = this.messages.splice(queuedIndex, 1)[0];
      return predicate(message) ? Promise.resolve(message) : Promise.reject(new Error(message.error || message.reason || 'Server rejected trainer request'));
    }
    return new Promise((resolve, reject) => {
      const waiter = { predicate, resolve, reject, timer: null };
      waiter.timer = setTimeout(() => {
        const index = this.waiters.indexOf(waiter);
        if (index >= 0) this.waiters.splice(index, 1);
        reject(new Error(`Timed out after ${timeoutMs}ms; last messages: ${this.messages.slice(-3).map(m => m.type).join(', ')}`));
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

class GameLimitError extends Error {}

async function runOneGame(port, token, item, signal) {
  let peer;
  let stage = 'connect';
  try {
    peer = await Peer.connect(port, signal);
    stage = 'authenticate';
    peer.send({ type: 'auth_token', token });
    const auth = await peer.waitFor((message) => message.type === 'auth_ok' || message.type === 'error');
    if (auth.type !== 'auth_ok') throw new Error(auth.error || 'Token authentication failed');

    stage = 'create lobby';
    peer.send({ type: 'create_room', displayName: `Neural ${item.sessionIndex + 1}` });
    const joined = await peer.waitFor((message) => message.type === 'joined' || message.type === 'error');
    if (joined.type === 'error') throw new Error(joined.error);
    const trainerId = joined.playerId;

    stage = 'set spectator mode';
    peer.send({ type: 'set_spectator_mode', enabled: true });
    await peer.waitFor((message) => message.type === 'room'
      && (message.room.spectators || []).some((member) => member.id === trainerId));

    stage = 'set AI difficulty';
    peer.send({ type: 'set_ai_difficulty', difficulty: 'neural_net' });
    await peer.waitFor((message) => message.type === 'room' && message.room.aiDifficulty === 'neural_net');

    stage = 'set rules';
    peer.send({
      type: 'set_rules',
      rules: {
        mapMode: item.map.mapMode,
        seafarersScenario: item.map.scenario,
        ...(STYLE_CURRICULUM ? { playerCount: item.map.players } : {}),
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
      stage = 'paint Test Builder preview';
      const preview = await peer.waitFor((message) => message.type === 'state'
        && message.state?.phase === 'lobby'
        && message.state?.previewKey === `seafarers:${item.map.scenario}`);
      paintTrainingTestBuilder(peer, preview.state, item);
    }

    stage = 'fill AI seats';
    peer.send({ type: 'fill_ai', targetCount: item.map.players });
    const populated = await peer.waitFor((message) => message.type === 'room' && (message.room.players || []).length === item.map.players);
    // Some lobby settings can silently fall back to easy AI. Such games are
    // valid matches but do not train the neural model and must not be counted.
    const seats = populated.room.players || [];
    if (seats.some(player => !player.isAI || player.aiDifficulty !== 'neural_net')) {
      throw new Error(`Trainer lobby has non-neural seats: ${seats.map(player => `${player.name}:${player.isAI ? player.aiDifficulty : 'human'}`).join(', ')}`);
    }
    const seat = ANCHOR_MODEL ? trainingAnchorSeat(item.curriculumIndex, MAPS.length, item.map.players, LEARNING_LOOP, STYLE_CURRICULUM) : null;
    if (seat !== null) {
      stage = 'set frozen opponent';
      peer.send({ type: 'set_training_anchor', seat });
      await peer.waitFor(message => message.type === 'training_anchor' && message.seat === seat);
    }

    stage = 'play';
    const gameStarted = performance.now();
    peer.send({ type: 'start_game' });
    // Larger 5–8 player maps need more CPU turns than Classic, especially on desktops.
    const gameTimeout = GAME_TIMEOUT_MS * (item.map.players >= 7 ? 2 : item.map.players >= 5 ? 1.5 : 1);
    const hardDeadline = Date.now() + gameTimeout;
    let idleDeadline = Date.now() + IDLE_TIMEOUT_MS;
    let lastMoves = -1;
    let lastTurn = 0;
    let lastPhase = 'starting';
    let finished;
    while (!finished) {
      const remaining = Math.min(hardDeadline - Date.now(), idleDeadline - Date.now());
      if (remaining <= 0) {
        throw new GameLimitError(`Game exceeded its idle or wall-clock limit at turn=${lastTurn} phase=${lastPhase} moves=${lastMoves} idleLimit=${IDLE_TIMEOUT_MS}ms hardLimit=${gameTimeout}ms`);
      }
      let event;
      try {
        event = await peer.waitFor((message) => (message.type === 'state' && message.state?.phase === 'game-over') || message.type === 'training_progress', remaining);
      } catch (error) {
        if (error.message.includes('Timed out') && lastMoves >= 0) {
          throw new GameLimitError(`Game exceeded its idle or wall-clock limit at turn=${lastTurn} phase=${lastPhase} moves=${lastMoves}: ${error.message}`);
        }
        throw error;
      }
      if (event.type === 'state') { finished = event; break; }
      const moves = Number(event.moves || 0);
      const turn = Number(event.turnNumber || 0);
      lastPhase = event.phase || lastPhase;
      if (moves > lastMoves || turn !== lastTurn) idleDeadline = Date.now() + IDLE_TIMEOUT_MS;
      lastMoves = Math.max(lastMoves, moves);
      lastTurn = turn;
      if (lastTurn > MAX_TRAINING_TURNS) throw new GameLimitError(`Game exceeded ${MAX_TRAINING_TURNS} turns`);
    }
    const state = finished.state;
    const playDurationMs = Math.round(performance.now() - gameStarted);
    const winner = (state.players || []).find((player) => player.id === state.winnerId);
    const victoryTarget = Number(state.rules?.victoryPointsToWin || VP_TO_WIN_OVERRIDE || item.map.victoryPoints);
    if (!winner || Number(winner.vp || 0) < victoryTarget) throw new Error('Game ended without a valid victory');
    // A terminal WebSocket state proves only that a game ended. It does NOT
    // prove that neural gradient updates were persisted. Require the local
    // server's per-game durable-write receipt before this game earns credit.
    stage = 'commit weights';
    peer.send({ type: 'get_training_receipt' });
    const receipt = await peer.waitFor((message) => message.type === 'training_receipt', 30_000);
    if (!receipt.ok || receipt.gameId !== state.id || !Number.isSafeInteger(Number(receipt.trainedGames))) {
      throw new Error(`Game finished, but neural weights were not committed: ${receipt.error || `receipt gameId=${receipt.gameId}, expected ${state.id}, trainedGames=${receipt.trainedGames}`}`);
    }
    const opponentVp = (state.players || []).filter(player => player.id !== winner.id).map(player => Number(player.vp || 0));
    return {
      modelTrainedGames: Number(receipt.trainedGames),
      ...(receipt.policyDecisions ? { policyDecisions: Number(receipt.policyDecisions) } : {}),
      gameId: state.id,
      nativeScoringCalls: Number(receipt.nativeScoringCalls || 0),
      nativeRouteCalls: Number(receipt.nativeRouteCalls || 0),
      nativeProductionCalls: Number(receipt.nativeProductionCalls || 0),
      nativeBankTradeCalls: Number(receipt.nativeBankTradeCalls || 0),
      nativeArmyCalls: Number(receipt.nativeArmyCalls || 0),
      sessionIndex: item.sessionIndex,
      curriculumIndex: item.curriculumIndex,
      mapId: item.map.id,
      mapLabel: item.map.label,
      players: item.map.players,
      ...(seat !== null ? { anchored: true, learnerSeat: seat, learnerWon: receipt.learnerWon } : {}),
      victoryPointsToWin: victoryTarget,
      turnNumber: Number(state.turnNumber || 0),
      winner: String(winner?.name || winner?.id || 'unknown'),
      winnerVp: Number(winner?.vp || 0),
      highestOpponentVp: Math.max(0, ...opponentVp),
      winnerMargin: Number(winner.vp) - Math.max(0, ...opponentVp),
      goldProductionCards: goldProductionCards(state),
      playDurationMs,
      diceTotals: state.stats?.rolls?.byNumber,
      standings: state.players.map(player => ({ name: player.name, vp: player.vp })),
    };
  } catch (error) {
    signal?.throwIfAborted();
    error.message = `map=${item.map.id} game=${item.sessionIndex + 1} during ${stage}: ${error.message}`;
    throw error;
  } finally {
    peer?.close();
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

function logTrainingFailure(message) {
  const line = `${new Date().toISOString()} ${message}\n`;
  process.stderr.write(`[train] ${message}\n`);
  try {
    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.appendFileSync(`${OUTPUT_PATH}.failures.log`, line);
  } catch (error) { process.stderr.write(`[train] could not write failure log: ${error.message}\n`); }
}

async function runBatch(server, token, items, completedBefore, mapHealth, concurrency) {
  const queue = items.map(item => {
    const quarantined = (mapHealth[item.map.id]?.quarantineUntil || -1) > item.sessionIndex;
    const excluded = Object.keys(mapHealth).filter(id => (mapHealth[id]?.quarantineUntil || -1) > item.sessionIndex);
    const mapped = quarantined ? fallbackMap(MAPS, item.map, 1, excluded) : item.map;
    return { ...item, map: mapped, originalMapId: item.map.id, retries: 0,
      replacements: mapped.id === item.map.id ? 0 : 1, attemptedMapIds: [item.map.id, mapped.id] };
  });
  const results = [];
  const abort = new AbortController();
  setMaxListeners(concurrency + 1, abort.signal);
  let consecutiveFailures = 0;
  const worker = async () => {
    while (queue.length && !abort.signal.aborted) {
      const item = queue.shift();
      if (!item) return;
      try {
        const result = await runOneGame(server.port, token, item, abort.signal);
        if (item.originalMapId !== result.mapId) result.requestedMapId = item.originalMapId;
        results.push(result);
        if (mapHealth[result.mapId]) mapHealth[result.mapId].successes = (mapHealth[result.mapId].successes || 0) + 1;
        consecutiveFailures = 0;
        const totalComplete = completedBefore + results.length;
        if (totalComplete % 10 === 0 || totalComplete === TOTAL_GAMES) {
          process.stdout.write(`[train] ${totalComplete}/${TOTAL_GAMES} map=${result.mapId} turn=${result.turnNumber} gold=${result.goldProductionCards}\n`);
        }
      } catch (error) {
        if (abort.signal.aborted) return;
        const health = mapHealth[item.map.id] || (mapHealth[item.map.id] = { failures: 0, successes: 0, quarantineUntil: -1 });
        health.failures += 1;
        if (health.failures >= MAP_QUARANTINE_FAILURES && health.quarantineUntil <= item.sessionIndex) {
          health.quarantineUntil = item.sessionIndex + MAP_QUARANTINE_GAMES;
          health.failures = 0;
          logTrainingFailure(`cooldown ${item.map.id} for ${MAP_QUARANTINE_GAMES} curriculum slots after repeated failed games`);
        }
        if (!(error instanceof GameLimitError)) consecutiveFailures += 1;
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES || server.child.exitCode !== null || server.child.signalCode) {
          abort.abort(new Error(`Training server unhealthy after ${consecutiveFailures} consecutive request failures. Last error: ${error.message}`));
          break;
        }
        if (item.retries + 1 >= MAX_ATTEMPTS_PER_MAP) {
          if (item.replacements >= MAX_MAP_REPLACEMENTS) {
            abort.abort(new Error(`Trainer could not finish ${item.originalMapId} (game ${item.sessionIndex + 1}) after ${item.replacements + 1} map choices: ${error.message}`));
            break;
          }
          const replacement = fallbackMap(MAPS, item.map, item.replacements + 1, item.attemptedMapIds);
          if (!replacement || replacement.id === item.map.id) {
            abort.abort(new Error(`No replacement scenario for failed ${item.map.id}: ${error.message}`));
            break;
          }
          logTrainingFailure(`quarantined ${item.map.id} game=${item.sessionIndex + 1} after ${MAX_ATTEMPTS_PER_MAP} failed attempts; trying ${replacement.id} (${replacement.players} players): ${error.message}`);
          queue.push({ ...item, map: replacement, retries: 0, replacements: item.replacements + 1, attemptedMapIds: [...item.attemptedMapIds, replacement.id] });
        } else {
          logTrainingFailure(`retry ${item.retries + 1}/${MAX_ATTEMPTS_PER_MAP - 1} map=${item.map.id} game=${item.sessionIndex + 1}: ${error.message}`);
          queue.push({ ...item, retries: item.retries + 1 });
        }
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  abort.signal.throwIfAborted();
  if (results.length !== items.length) throw new Error(`Batch incomplete: ${results.length}/${items.length} games`);
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
  if (NATIVE_SELF_PLAY) require('../server/native-rules');
  if (GPU_TRAINING) {
    const info = await ensureCuda();
    console.log(`[cuda] available: ${info.device} (torch ${info.torch}); running ${NATIVE_SELF_PLAY ? 'native-assisted' : 'JavaScript'} self-play + CUDA minibatch refinement`);
  }
  const started = performance.now();
  const startingModel = readModel(MODEL_PATH);
  let startingHash = modelHash(MODEL_PATH);
  const anchorModelSha256 = ANCHOR_MODEL ? modelHash(ANCHOR_MODEL) : null;
  const scratch = path.resolve(process.env.TRAINING_SCRATCH || os.tmpdir());
  fs.mkdirSync(scratch, { recursive: true });
  const tempRoot = fs.mkdtempSync(path.join(scratch, 'hex-neural-curriculum-'));
  const items = curriculum(TOTAL_GAMES);
  const checkpointPath = `${OUTPUT_PATH}.checkpoint.json`;
  let startingTrainedGames = Number(startingModel.trainedGames || 0);
  let results = [];
  let latestModel = startingModel;
  let mapHealth = {};
  const rules = NATIVE_SELF_PLAY ? 'cpp-assisted' : 'javascript';
  const gpuBatches = [];
  console.log(`[train] ${rules}: up to ${CONCURRENCY} concurrent games per candidate (requested ${REQUESTED_CONCURRENCY}); checkpoint every ${BATCH_SIZE} games (requested ${REQUESTED_BATCH_SIZE})`);
  if (RESUME_TRAINING && fs.existsSync(checkpointPath)) {
    const checkpoint = readModel(checkpointPath);
    // Final model publication can complete just before a crash writing the
    // report. Accept only the exact weights from a fully committed checkpoint.
    const committedHash = crypto.createHash('sha256').update(`${JSON.stringify(checkpoint.model, null, 2)}\n`).digest('hex');
    if (checkpoint.games?.length === TOTAL_GAMES && checkpoint.startingModelSha256 && committedHash === startingHash) {
      startingHash = checkpoint.startingModelSha256;
      startingTrainedGames = Number(checkpoint.startingTrainedGames);
    }
    validateCheckpoint(checkpoint, startingTrainedGames, items, new Set(MAPS.map(map => map.id)), startingHash);
    if ((checkpoint.rules || 'javascript') !== rules) {
      throw new Error('Use the self-play rules backend from the saved checkpoint');
    }
    if ((checkpoint.anchorModelSha256 ?? null) !== anchorModelSha256) {
      throw new Error('Use the frozen anchor model from the saved checkpoint');
    }
    if ((checkpoint.styleCurriculum ?? false) !== STYLE_CURRICULUM) throw new Error('Use the scenario curriculum from the saved checkpoint');
    if ((checkpoint.learningLoop ?? 0) !== LEARNING_LOOP) throw new Error('Use the learning loop from the saved checkpoint');
    results = checkpoint.games;
    gpuBatches.push(...(checkpoint.gpuBatches || []));
    latestModel = checkpoint.model;
    mapHealth = checkpoint.mapHealth || {};
    process.stdout.write(`[train] ${results.length}/${TOTAL_GAMES} resumed from ${checkpointPath}\n`);
  }
  const completed = new Set(results.map(game => game.sessionIndex));
  let succeeded = false;
  try {
    for (let offset = 0, batchNo = 1; offset < items.length; offset += BATCH_SIZE, batchNo++) {
      const batchItems = items.slice(offset, offset + BATCH_SIZE).filter(item => !completed.has(item.sessionIndex));
      if (!batchItems.length) continue;
      if (isPauseRequested()) {
        console.log(`[train] pause requested: ${results.length}/${TOTAL_GAMES} games safely checkpointed`);
        process.exitCode = 75;
        return;
      }
      let newGames;
      let batchModel;
      let gpuBatch;
      // If a simulator server wedges, discard that uncommitted batch and
      // restart from the last checkpoint. Never use partially trained weights.
      for (let attempt = 0; attempt <= MAX_BATCH_RESTARTS; attempt++) {
        const batchDir = path.join(tempRoot, `batch-${String(batchNo).padStart(3, '0')}-attempt-${attempt + 1}`);
        fs.mkdirSync(batchDir, { recursive: true });
        const batchModelPath = path.join(batchDir, 'neural_ai_model.json');
        await atomicWriteJson(batchModelPath, latestModel);
        const batchHealth = structuredClone(mapHealth);
        let server;
        try {
          server = await startTrainingServer(batchDir);
          const token = await createTrainerToken(server.port, batchNo);
          newGames = await runBatch(server, token, batchItems, results.length, batchHealth, attempt ? 1 : CONCURRENCY);
          batchModel = readModel(batchModelPath);
          const expectedBatchCount = startingTrainedGames + results.length + newGames.length;
          if (Number(batchModel.trainedGames || 0) !== expectedBatchCount) {
            throw new Error(`Local server returned ${newGames.length} completed games, but saved model trainedGames=${batchModel.trainedGames}, expected ${expectedBatchCount}. This batch will not be counted.`);
          }
          if (GPU_TRAINING) {
            // The server MUST stop before CUDA writes weights; otherwise its
            // pending saves could overwrite the GPU-refined model.
            await server.stop();
            server = null;
            const gpu = await refine(batchModelPath, path.join(batchDir, 'neural_gpu_samples.jsonl'));
            console.log(`[cuda] batch ${batchNo}: ${gpu.examples} examples, ${gpu.games} games, loss ${gpu.initialLoss} -> ${gpu.finalLoss}, weights ${gpu.committed ? 'updated' : 'unchanged'}`);
            if (gpu.games !== newGames.length) throw new Error(`CUDA sample count ${gpu.games} != committed game count ${newGames.length}`);
            batchModel = readModel(batchModelPath);
            gpuBatch = { batch: batchNo, ...gpu };
          }
          mapHealth = batchHealth;
          break;
        } catch (error) {
          const diagnosis = `${error.message}${server ? `\nTraining server logs:\n${server.output().slice(-6000)}` : ''}`;
          if (attempt >= MAX_BATCH_RESTARTS) {
            const recovery = results.length ? `${results.length} checkpointed games can be resumed` : 'no games checkpointed';
            throw new Error(`Batch ${batchNo} failed after ${attempt + 1} isolated-server attempts (${recovery}): ${diagnosis}`);
          }
          logTrainingFailure(`batch ${batchNo} server restart ${attempt + 1}/${MAX_BATCH_RESTARTS} with one concurrent game: ${diagnosis}`);
        } finally {
          if (server) await server.stop();
        }
      }
      const expected = startingTrainedGames + results.length + newGames.length;
      if (Number(batchModel.trainedGames || 0) !== expected) {
        throw new Error(`Model trainedGames=${batchModel.trainedGames}; expected ${expected} after batch ${batchNo}. Every completed game must receive a persisted training receipt; inspect ${OUTPUT_PATH}.failures.log and the local training-server log.`);
      }
      results.push(...newGames);
      if (gpuBatch) gpuBatches.push(gpuBatch);
      for (const game of newGames) completed.add(game.sessionIndex);
      latestModel = batchModel;
      // Save both completed games and their matching weights atomically. A crash
      // can lose at most the currently active batch, never completed batches.
      await atomicWriteJson(checkpointPath, {
        startingTrainedGames, startingModelSha256: startingHash, totalGames: TOTAL_GAMES,
        mapSet: MAP_SET, curriculumOffset: CURRICULUM_OFFSET, model: latestModel, games: results,
        mapHealth, rules, gpuBatches, anchorModelSha256, styleCurriculum: STYLE_CURRICULUM, learningLoop: LEARNING_LOOP,
      });
      console.log(`[train] ${results.length}/${TOTAL_GAMES} checkpoint committed`);
      if (isPauseRequested()) {
        console.log(`[train] pause requested: ${results.length}/${TOTAL_GAMES} games safely checkpointed`);
        process.exitCode = 75;
        return;
      }
    }
    if (results.length !== TOTAL_GAMES) throw new Error(`Incomplete run: ${results.length}/${TOTAL_GAMES}`);
    results.sort((a, b) => a.sessionIndex - b.sessionIndex);
    await atomicWriteJson(MODEL_PATH, latestModel);
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
      policyDecisions: results.reduce((total, game) => total + (game.policyDecisions || 0), 0),
      styleCurriculum: STYLE_CURRICULUM,
      learningLoop: LEARNING_LOOP,
      anchorModelSha256,
      anchoredGames: results.filter(game => game.anchored).length,
      mapSet: MAP_SET,
      accelerator: GPU_TRAINING ? 'cuda' : 'cpu',
      rules, gpuBatches,
      nativeProduction: NATIVE_SELF_PLAY && results.every(game => game.nativeProductionCalls > 0),
      elapsedSeconds: (performance.now() - started) / 1000,
      mapsCovered: MAPS.map((map) => map.id),
      scenariosReplaced: results.filter(game => game.requestedMapId).map(game => ({ game: game.sessionIndex + 1, requested: game.requestedMapId, trained: game.mapId })),
      resumed: RESUME_TRAINING,
      mapHealth,
      startingTrainedGames,
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
    await atomicWriteJson(OUTPUT_PATH, report);
    succeeded = true;
    console.log(JSON.stringify({ ...report, games: undefined, reportPath: OUTPUT_PATH }, null, 2));
  } finally {
    if (!KEEP_TEMP && succeeded) fs.rmSync(tempRoot, { recursive: true, force: true });
    else console.log(`[train] kept training checkpoints at ${tempRoot}`);
  }
}

module.exports = { ALL_MAPS, STYLE_MAPS, MAPS, withLiveVictoryTarget, curriculum, summarize };
if (require.main === module) {
  if (process.connected) {
    process.on('message', message => {
      if (message?.type === 'pause') supervisorPaused = true;
    });
    process.once('disconnect', () => { supervisorPaused = true; });
  }
  main().catch((error) => {
    console.error(error && error.stack ? error.stack : error);
    process.exitCode = 1;
  }).finally(() => {
    if (process.connected) process.disconnect();
  });
}
