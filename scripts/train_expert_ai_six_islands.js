const WebSocket = require('ws');

const TOTAL_GAMES = Number(process.env.SIMS || 100);
const BATCH_SIZE = 10;
const SERVER_URL = process.env.SERVER_URL || 'ws://127.0.0.1:3000/ws';
const SIM_USERNAME = process.env.SIM_USERNAME || 'test1';
const SIM_PASSWORD = process.env.SIM_PASSWORD || 'password';
const VP_TO_WIN = Number(process.env.VP_TO_WIN || 10);
const SETUP_TURN_OFFSET = Number(process.env.SETUP_TURN_OFFSET || 24);

function waitForMessage(ws, pred, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => { cleanup(); reject(new Error(`Timeout waiting for message (${timeoutMs}ms)`)); }, timeoutMs);
    const onMsg = (buf) => {
      let m;
      try { m = JSON.parse(String(buf)); } catch (_) { return; }
      if (!pred(m)) return;
      cleanup();
      resolve(m);
    };
    const onErr = (e) => { cleanup(); reject(e instanceof Error ? e : new Error(String(e))); };
    const onClose = () => { cleanup(); reject(new Error('Socket closed')); };
    const cleanup = () => {
      clearTimeout(t);
      ws.off('message', onMsg);
      ws.off('error', onErr);
      ws.off('close', onClose);
    };
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

async function auth(ws, idx) {
  ws.send(JSON.stringify({ type: 'auth_login', username: SIM_USERNAME, password: SIM_PASSWORD }));
  let resp = await waitForMessage(ws, m => m.type === 'auth_ok' || m.type === 'error');
  if (resp.type === 'auth_ok') return;
  ws.send(JSON.stringify({ type: 'auth_register', username: SIM_USERNAME, password: SIM_PASSWORD, displayName: `Trainer${idx}` }));
  resp = await waitForMessage(ws, m => m.type === 'auth_ok' || m.type === 'error');
  if (resp.type !== 'auth_ok') throw new Error(resp.error || 'auth failed');
}

async function runOneGame(idx, tuning) {
  const ws = await openSocket();
  await auth(ws, idx);

  ws.send(JSON.stringify({ type: 'create_room', displayName: `trainer-${idx}` }));
  const joined = await waitForMessage(ws, m => m.type === 'joined');
  if (!joined?.room?.code) throw new Error('failed to create room');

  ws.send(JSON.stringify({ type: 'set_spectator_mode', enabled: true }));
  await new Promise(r => setTimeout(r, 10));

  ws.send(JSON.stringify({ type: 'set_ai_difficulty', difficulty: 'expert' }));
  await new Promise(r => setTimeout(r, 10));

  ws.send(JSON.stringify({ type: 'set_expert_ai_tuning', tuning }));
  await waitForMessage(ws, m => m.type === 'expert_ai_tuning_ok' || m.type === 'error');

  ws.send(JSON.stringify({ type: 'set_rules', rules: {
    mapMode: 'seafarers',
    seafarersScenario: 'six_islands',
    victoryPointsToWin: VP_TO_WIN,
    playTurnMs: 30000,
    setupTurnMs: 30000,
    microPhaseMs: 15000,
  }}));
  await new Promise(r => setTimeout(r, 10));

  ws.send(JSON.stringify({ type: 'fill_ai', targetCount: 6 }));
  await new Promise(r => setTimeout(r, 10));

  ws.send(JSON.stringify({ type: 'start_game' }));

  const result = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { cleanup(); reject(new Error('Game timeout 180s')); }, 180000);
    const onMsg = (buf) => {
      let m;
      try { m = JSON.parse(String(buf)); } catch (_) { return; }
      if (m.type !== 'state' || !m.state || m.state.phase !== 'game-over') return;
      const st = m.state;
      const players = st.players || [];
      const winner = players.reduce((best, p) => (!best || (p.vp || 0) > (best.vp || 0)) ? p : best, null);
      const rawTurn = Number(st.turnNumber || 0);
      resolve({
        winner: winner?.name || 'unknown',
        maxVp: Number(winner?.vp || 0),
        rawTurn,
        effectiveTurn: Math.max(0, rawTurn - SETUP_TURN_OFFSET),
      });
      cleanup();
    };
    const onErr = (e) => { cleanup(); reject(e instanceof Error ? e : new Error(String(e))); };
    const onClose = () => { cleanup(); reject(new Error('Socket closed before game over')); };
    const cleanup = () => {
      clearTimeout(timeout);
      ws.off('message', onMsg);
      ws.off('error', onErr);
      ws.off('close', onClose);
    };
    ws.on('message', onMsg);
    ws.on('error', onErr);
    ws.on('close', onClose);
  });

  try { ws.close(); } catch (_) {}
  return result;
}

function tuneFromBatch(tuning, batchTurns, prevBatchAvg) {
  const avg = batchTurns.reduce((a, b) => a + b, 0) / Math.max(1, batchTurns.length);
  const improved = prevBatchAvg == null || avg <= prevBatchAvg;
  const dir = improved ? 1 : -1;
  return {
    avg,
    improved,
    next: {
      ...tuning,
      vpGainWeight: Math.max(120, Math.min(360, tuning.vpGainWeight + dir * 10)),
      vpBuildBonus: Math.max(30, Math.min(140, tuning.vpBuildBonus + dir * 4)),
      newSettlementSpotBase: Math.max(10, Math.min(90, tuning.newSettlementSpotBase + dir * 3)),
      newSettlementSpotStep: Math.max(1, Math.min(16, tuning.newSettlementSpotStep + dir * 1)),
      neutralTradePenalty: Math.max(4, Math.min(40, tuning.neutralTradePenalty + dir * 2)),
      minActionGain: Math.max(-20, Math.min(6, tuning.minActionGain - dir * 1)),
      bankTradeMinGain: Math.max(0, Math.min(1, tuning.bankTradeMinGain + dir * 0.02)),
    }
  };
}

async function main() {
  let tuning = {
    vpGainWeight: 220,
    vpBuildBonus: 70,
    newSettlementSpotBase: 40,
    newSettlementSpotStep: 6,
    neutralTradePenalty: 16,
    minActionGain: -8,
    bankTradeMinGain: 0.05,
  };

  let prevBatchAvg = null;
  const allTurns = [];
  const batches = [];

  for (let game = 1; game <= TOTAL_GAMES; game++) {
    const r = await runOneGame(game, tuning);
    allTurns.push(r.effectiveTurn);
    process.stdout.write(`[sim] game ${game}/${TOTAL_GAMES} winner=${r.winner} rawTurn=${r.rawTurn} effectiveTurn=${r.effectiveTurn}\n`);

    if (game % BATCH_SIZE === 0 || game === TOTAL_GAMES) {
      const slice = allTurns.slice(-BATCH_SIZE);
      const tuned = tuneFromBatch(tuning, slice, prevBatchAvg);
      const batchNo = Math.ceil(game / BATCH_SIZE);
      batches.push({ batch: batchNo, avgEffectiveTurn: tuned.avg, improved: tuned.improved, tuningBefore: tuning, tuningAfter: tuned.next });
      process.stdout.write(`[tune] batch ${batchNo} avg=${tuned.avg.toFixed(2)} improved=${tuned.improved} next=${JSON.stringify(tuned.next)}\n`);
      prevBatchAvg = tuned.avg;
      tuning = tuned.next;
    }
  }

  const avg = allTurns.reduce((a, b) => a + b, 0) / Math.max(1, allTurns.length);
  const min = Math.min(...allTurns);
  const max = Math.max(...allTurns);
  console.log(JSON.stringify({
    totalGames: TOTAL_GAMES,
    avgEffectiveTurn: avg,
    minEffectiveTurn: min,
    maxEffectiveTurn: max,
    finalTuning: tuning,
    batches,
  }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
