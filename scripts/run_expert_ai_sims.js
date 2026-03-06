const WebSocket = require('ws');

const TOTAL_GAMES = Number(process.env.SIMS || 200);
const SERVER_URL = process.env.SERVER_URL || 'ws://127.0.0.1:3000/ws';

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

async function runOneGame(idx) {
  const ws = await openSocket();
  const uid = `s${(Date.now()%1e8).toString(36)}${idx.toString(36)}${Math.random().toString(36).slice(2, 6)}`.slice(0, 24);
  const pw = 'pw123456';

  ws.send(JSON.stringify({ type: 'auth_register', username: uid, password: pw, displayName: `SimHost${idx}` }));
  const authResp = await waitForMessage(ws, m => m.type === 'auth_ok' || m.type === 'error', 15000);
  if (authResp.type === 'error') throw new Error(`auth failed: ${authResp.error || 'unknown'}`);

  ws.send(JSON.stringify({ type: 'create_room', displayName: `SimHost${idx}` }));
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
      victoryPointsToWin: 10,
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
      const turn = st.turnNumber || 0;
      cleanup();
      resolve({ turn, maxVp, winner: winner ? winner.name : null });
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
  let completed = 0;
  for (let i = 1; i <= TOTAL_GAMES; i++) {
    try {
      const r = await runOneGame(i);
      turns.push(r.turn || 0);
      completed++;
      if (i % 10 === 0 || i === TOTAL_GAMES) {
        const avg = turns.reduce((a, b) => a + b, 0) / Math.max(1, turns.length);
        console.log(`[sim] ${completed}/${i} complete, avg winning turn=${avg.toFixed(2)}`);
      }
    } catch (e) {
      console.error(`[sim] game ${i} failed: ${e.message}`);
    }
  }

  const avg = turns.reduce((a, b) => a + b, 0) / Math.max(1, turns.length);
  const min = turns.length ? Math.min(...turns) : 0;
  const max = turns.length ? Math.max(...turns) : 0;
  console.log(JSON.stringify({ totalRequested: TOTAL_GAMES, completed, avgWinningTurn: avg, minWinningTurn: min, maxWinningTurn: max }, null, 2));

  if (!completed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
