const WebSocket = require('ws');

const TOTAL_COMPLETED = Number(process.env.SIMS || 200);
const SERVER_URL = process.env.SERVER_URL || 'ws://127.0.0.1:3000/ws';
const SIM_USERNAME = process.env.SIM_USERNAME || 'neural_trainer';
const SIM_PASSWORD = process.env.SIM_PASSWORD || 'password';
const VICTORY_POINTS_TO_WIN = Number(process.env.VP_TO_WIN || 5);
const TARGET_COUNT = Number(process.env.TARGET_COUNT || 5);
const MAX_ATTEMPTS = Number(process.env.MAX_ATTEMPTS || 600);
const SCENARIO = process.env.SEAFARERS_SCENARIO || 'through_the_desert_56';

function waitForMessage(ws, predicate, timeoutMs = 25000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Timeout waiting for message (${timeoutMs}ms)`));
    }, timeoutMs);

    const onMessage = (raw) => {
      let msg;
      try { msg = JSON.parse(String(raw)); } catch (_) { return; }
      if (!predicate(msg)) return;
      cleanup();
      resolve(msg);
    };
    const onError = (err) => { cleanup(); reject(err instanceof Error ? err : new Error(String(err))); };
    const onClose = () => { cleanup(); reject(new Error('Socket closed')); };

    const cleanup = () => {
      clearTimeout(timeout);
      ws.off('message', onMessage);
      ws.off('error', onError);
      ws.off('close', onClose);
    };

    ws.on('message', onMessage);
    ws.on('error', onError);
    ws.on('close', onClose);
  });
}

async function openSocket() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(SERVER_URL);
    ws.once('open', () => resolve(ws));
    ws.once('error', reject);
  });
}

async function auth(ws, username, idx) {
  let pending = waitForMessage(ws, (m) => m.type === 'auth_ok' || m.type === 'error');
  ws.send(JSON.stringify({ type: 'auth_login', username, password: SIM_PASSWORD }));
  let authResp = await pending;
  if (authResp.type === 'auth_ok') return;

  pending = waitForMessage(ws, (m) => m.type === 'auth_ok' || m.type === 'error');
  ws.send(JSON.stringify({
    type: 'auth_register',
    username,
    password: SIM_PASSWORD,
    displayName: `NeuralTrainer${idx}`,
  }));
  authResp = await pending;
  if (authResp.type !== 'auth_ok') throw new Error(`auth failed: ${authResp.error || 'unknown'}`);
}

async function runOneGame(gameNo) {
  const ws = await openSocket();
  try {
    const username = `${SIM_USERNAME}_${gameNo}`;
    await auth(ws, username, gameNo);

    let pending = waitForMessage(ws, (m) => m.type === 'joined' || m.type === 'error');
    ws.send(JSON.stringify({ type: 'create_room', displayName: `neural-trainer-${gameNo}` }));
    const joined = await pending;
    if (joined.type === 'error') throw new Error(`create_room failed: ${joined.error || 'unknown error'}`);

    ws.send(JSON.stringify({ type: 'set_spectator_mode', enabled: true }));
    await new Promise(r => setTimeout(r, 20));

    ws.send(JSON.stringify({ type: 'set_ai_difficulty', difficulty: 'neural_net' }));
    await new Promise(r => setTimeout(r, 20));

    ws.send(JSON.stringify({
      type: 'set_rules',
      rules: {
        mapMode: 'seafarers',
        seafarersScenario: SCENARIO,
        victoryPointsToWin: VICTORY_POINTS_TO_WIN,
        playTurnMs: 30000,
        setupTurnMs: 30000,
        microPhaseMs: 15000,
      },
    }));
    await new Promise(r => setTimeout(r, 20));

    ws.send(JSON.stringify({ type: 'fill_ai', targetCount: TARGET_COUNT }));
    await new Promise(r => setTimeout(r, 20));

    ws.send(JSON.stringify({ type: 'start_game' }));

    const result = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Game timeout (180s)'));
      }, 180000);

      const onMessage = (raw) => {
        let msg;
        try { msg = JSON.parse(String(raw)); } catch (_) { return; }
        if (msg.type !== 'state' || !msg.state) return;
        if (msg.state.phase !== 'game-over') return;
        const players = Array.isArray(msg.state.players) ? msg.state.players : [];
        const winner = players.reduce((best, p) => (!best || (p.vp || 0) > (best.vp || 0)) ? p : best, null);
        cleanup();
        resolve({
          turnNumber: Number(msg.state.turnNumber || 0),
          winner: winner ? String(winner.name || winner.id || 'unknown') : 'unknown',
          winnerVp: Number(winner?.vp || 0),
        });
      };

      const onError = (err) => { cleanup(); reject(err instanceof Error ? err : new Error(String(err))); };
      const onClose = () => { cleanup(); reject(new Error('Socket closed before game-over')); };

      const cleanup = () => {
        clearTimeout(timeout);
        ws.off('message', onMessage);
        ws.off('error', onError);
        ws.off('close', onClose);
      };

      ws.on('message', onMessage);
      ws.on('error', onError);
      ws.on('close', onClose);
    });

    return result;
  } finally {
    try { ws.close(); } catch (_) {}
  }
}

async function main() {
  const completedTurns = [];
  let attempts = 0;

  while (completedTurns.length < TOTAL_COMPLETED) {
    attempts += 1;
    if (attempts > MAX_ATTEMPTS) {
      throw new Error(`Exceeded MAX_ATTEMPTS (${MAX_ATTEMPTS}) before reaching ${TOTAL_COMPLETED} completed games`);
    }

    const gameIndex = completedTurns.length + 1;
    try {
      const result = await runOneGame(gameIndex);
      completedTurns.push(result.turnNumber);
      const avg = completedTurns.reduce((a, b) => a + b, 0) / completedTurns.length;
      process.stdout.write(`[sim] complete ${completedTurns.length}/${TOTAL_COMPLETED} attempts=${attempts} turn=${result.turnNumber} winner=${result.winner} vp=${result.winnerVp} avgTurn=${avg.toFixed(2)}\n`);
    } catch (err) {
      process.stderr.write(`[sim] failed attempt ${attempts} (completed=${completedTurns.length}/${TOTAL_COMPLETED}): ${err.message}\n`);
      await new Promise(r => setTimeout(r, 250));
    }
  }

  const avgTurn = completedTurns.reduce((a, b) => a + b, 0) / completedTurns.length;
  const minTurn = Math.min(...completedTurns);
  const maxTurn = Math.max(...completedTurns);

  console.log(JSON.stringify({
    mode: 'neural_net',
    mapMode: 'seafarers',
    seafarersScenario: SCENARIO,
    targetCount: TARGET_COUNT,
    requestedGames: TOTAL_COMPLETED,
    completedGames: completedTurns.length,
    attempts,
    avgTurn,
    minTurn,
    maxTurn,
    victoryPointsToWin: VICTORY_POINTS_TO_WIN,
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
