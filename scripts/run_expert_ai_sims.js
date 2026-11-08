const WebSocket = require('ws');

const TOTAL_GAMES = Math.min(500, Number(process.env.SIMS || 500));
const SERVER_URL = process.env.SERVER_URL || 'ws://127.0.0.1:3000/ws';
const TARGET_AVG = Number(process.env.TARGET_AVG || 70);
const ROLLING_WINDOW = 10;
const SIM_USERNAME = process.env.SIM_USERNAME || 'test1';
const SIM_PASSWORD = process.env.SIM_PASSWORD || 'password';
const VICTORY_POINTS_TO_WIN = Number(process.env.VP_TO_WIN || 10);
const SETUP_TURN_OFFSET = Number(process.env.SETUP_TURN_OFFSET || 16);

function waitForMessage(ws, pred, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      cleanup();
      reject(new Error(`Timeout waiting for message (${timeoutMs}ms)`));
    }, timeoutMs);

    const onMsg = (buf) => {
      let m;
      try { m = JSON.parse(String(buf)); } catch (_) { return; }
      if (pred(m)) {
        cleanup();
        resolve(m);
      }
    };
    const onErr = (e) => { cleanup(); reject(e instanceof Error ? e : new Error(String(e))); };
    const onClose = () => { cleanup(); reject(new Error('Socket closed')); };

    function cleanup() {
      clearTimeout(t);
      ws.off('message', onMsg);
      ws.off('error', onErr);
      ws.off('close', onClose);
    }

    ws.on('message', onMsg);
    ws.on('error', onErr);
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


async function authWithConfiguredUser(ws, idx) {
  ws.send(JSON.stringify({ type: 'auth_login', username: SIM_USERNAME, password: SIM_PASSWORD }));
  let authResp = await waitForMessage(ws, m => m.type === 'auth_ok' || m.type === 'error', 15000);
  if (authResp.type === 'auth_ok') return authResp;

  const err = String(authResp.error || '').toLowerCase();
  if (!err.includes('invalid username or password') && !err.includes('not found')) {
    throw new Error(`auth failed: ${authResp.error || 'unknown'}`);
  }

  ws.send(JSON.stringify({ type: 'auth_register', username: SIM_USERNAME, password: SIM_PASSWORD, displayName: `SimHost${idx}` }));
  authResp = await waitForMessage(ws, m => m.type === 'auth_ok' || m.type === 'error', 15000);
  if (authResp.type === 'error') throw new Error(`auth failed: ${authResp.error || 'unknown'}`);
  return authResp;
}

async function runOneGame(idx) {
  const ws = await openSocket();
  await authWithConfiguredUser(ws, idx);

  ws.send(JSON.stringify({ type: 'create_room', displayName: `${SIM_USERNAME}-sim-${idx}` }));
  const joined = await waitForMessage(ws, m => m.type === 'joined', 15000);
  const code = joined.room && joined.room.code;
  if (!code) throw new Error('No room code from create_room');

  ws.send(JSON.stringify({ type: 'set_spectator_mode', enabled: true }));
  await new Promise(r => setTimeout(r, 20));

  ws.send(JSON.stringify({ type: 'set_ai_difficulty', difficulty: 'expert' }));
  await new Promise(r => setTimeout(r, 20));

  ws.send(JSON.stringify({ type: 'fill_ai', targetCount: 4 }));
  await new Promise(r => setTimeout(r, 20));

  ws.send(JSON.stringify({
    type: 'set_rules',
    rules: {
      mapMode: 'classic',
      victoryPointsToWin: VICTORY_POINTS_TO_WIN,
      playTurnMs: 30000,
      setupTurnMs: 30000,
      microPhaseMs: 15000,
    }
  }));
  await new Promise(r => setTimeout(r, 20));

  ws.send(JSON.stringify({ type: 'start_game' }));

  const result = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Game timeout (90s)'));
    }, 90000);

    const onMsg = (buf) => {
      let m;
      try { m = JSON.parse(String(buf)); } catch (_) { return; }
      if (m.type !== 'state' || !m.state) return;
      const st = m.state;
      if (st.phase !== 'game-over') return;
      const players = st.players || [];
      const winner = players.reduce((best, p) => (!best || (p.vp || 0) > (best.vp || 0)) ? p : best, null);
      const maxVp = winner ? (winner.vp || 0) : 0;
      const turnRaw = st.turnNumber || 0;
      const effectiveTurn = Math.max(0, turnRaw - SETUP_TURN_OFFSET);
      cleanup();
      resolve({ turn: effectiveTurn, rawTurn: turnRaw, maxVp, winner: winner ? winner.name : null });
    };
    const onErr = (e) => { cleanup(); reject(e instanceof Error ? e : new Error(String(e))); };
    const onClose = () => { cleanup(); reject(new Error('Socket closed before game-over')); };

    function cleanup() {
      clearTimeout(timeout);
      ws.off('message', onMsg);
      ws.off('error', onErr);
      ws.off('close', onClose);
    }

    ws.on('message', onMsg);
    ws.on('error', onErr);
    ws.on('close', onClose);
  });

  try { ws.close(); } catch (_) {}
  return result;
}

async function main() {
  const turns = [];
  const rawTurns = [];
  let completed = 0;
  for (let i = 1; i <= TOTAL_GAMES; i++) {
    try {
      const r = await runOneGame(i);
      turns.push(r.turn || 0);
      rawTurns.push(r.rawTurn || 0);
      completed++;
      const rolling = turns.slice(-ROLLING_WINDOW);
      const rollingAvg = rolling.reduce((a, b) => a + b, 0) / Math.max(1, rolling.length);
      if (i % 10 === 0 || i === TOTAL_GAMES) {
        const avg = turns.reduce((a, b) => a + b, 0) / Math.max(1, turns.length);
        const rawAvg = rawTurns.reduce((a, b) => a + b, 0) / Math.max(1, rawTurns.length);
        console.log(`[sim] ${completed}/${i} complete, avg effective winning turn=${avg.toFixed(2)}, raw=${rawAvg.toFixed(2)}, last${rolling.length}=${rollingAvg.toFixed(2)}`);
      }
      if (rolling.length >= ROLLING_WINDOW && rollingAvg < TARGET_AVG) {
        console.log(`[sim] stopping early: last ${ROLLING_WINDOW} game average ${rollingAvg.toFixed(2)} < target ${TARGET_AVG}`);
        break;
      }
    } catch (e) {
      console.error(`[sim] game ${i} failed: ${e.message}`);
    }
  }

  const avg = turns.reduce((a, b) => a + b, 0) / Math.max(1, turns.length);
  const min = turns.length ? Math.min(...turns) : 0;
  const max = turns.length ? Math.max(...turns) : 0;
  const rawAvg = rawTurns.reduce((a, b) => a + b, 0) / Math.max(1, rawTurns.length);
  const rawMin = rawTurns.length ? Math.min(...rawTurns) : 0;
  const rawMax = rawTurns.length ? Math.max(...rawTurns) : 0;
  const rolling = turns.slice(-ROLLING_WINDOW);
  const rollingAvg = rolling.reduce((a, b) => a + b, 0) / Math.max(1, rolling.length);
  console.log(JSON.stringify({ totalRequested: TOTAL_GAMES, completed, avgWinningTurn: avg, avgRawWinningTurn: rawAvg, avgLast10: rollingAvg, minWinningTurn: min, maxWinningTurn: max, minRawWinningTurn: rawMin, maxRawWinningTurn: rawMax, targetAvg: TARGET_AVG, rollingWindow: ROLLING_WINDOW, victoryPointsToWin: VICTORY_POINTS_TO_WIN, setupTurnOffset: SETUP_TURN_OFFSET }, null, 2));

  if (!completed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
