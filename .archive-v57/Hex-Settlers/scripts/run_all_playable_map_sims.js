const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const SERVER_URL = process.env.SERVER_URL || 'ws://127.0.0.1:3000/ws';
const SIM_USERNAME = process.env.SIM_USERNAME || 'test1';
const SIM_PASSWORD = process.env.SIM_PASSWORD || 'password';
const GAMES_PER_OPTION = Number(process.env.GAMES_PER_OPTION || 100);
const BATCH_SIZE = 10;
const MAP_CONCURRENCY = Math.max(1, Number(process.env.MAP_CONCURRENCY || 3));

const MAP_OPTIONS = [
  { option: 'classic', rules: { mapMode: 'classic', seafarersScenario: 'four_islands' }, players: 4 },
  { option: 'classic56', rules: { mapMode: 'classic56', seafarersScenario: 'four_islands' }, players: 6 },
  { option: 'seafarers:four_islands', rules: { mapMode: 'seafarers', seafarersScenario: 'four_islands' }, players: 4 },
  { option: 'seafarers:through_the_desert', rules: { mapMode: 'seafarers', seafarersScenario: 'through_the_desert' }, players: 4 },
  { option: 'seafarers:fog_island', rules: { mapMode: 'seafarers', seafarersScenario: 'fog_island' }, players: 4 },
  { option: 'seafarers:heading_for_new_shores', rules: { mapMode: 'seafarers', seafarersScenario: 'heading_for_new_shores' }, players: 4 },
  { option: 'seafarers:cartographer_4_manual', rules: { mapMode: 'seafarers', seafarersScenario: 'cartographer_4_manual' }, players: 4 },
  { option: 'seafarers:cartographer_4_random', rules: { mapMode: 'seafarers', seafarersScenario: 'cartographer_4_random' }, players: 4 },
  { option: 'seafarers:six_islands', rules: { mapMode: 'seafarers', seafarersScenario: 'six_islands' }, players: 6 },
  { option: 'seafarers:through_the_desert_56', rules: { mapMode: 'seafarers', seafarersScenario: 'through_the_desert_56' }, players: 6 },
  { option: 'seafarers:fog_island_56', rules: { mapMode: 'seafarers', seafarersScenario: 'fog_island_56' }, players: 6 },
  { option: 'seafarers:cartographer_56_manual', rules: { mapMode: 'seafarers', seafarersScenario: 'cartographer_56_manual' }, players: 6 },
  { option: 'seafarers:cartographer_56_random', rules: { mapMode: 'seafarers', seafarersScenario: 'cartographer_56_random' }, players: 6 },
];

function waitForMessage(ws, pred, timeoutMs = 35000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timeout waiting for message (${timeoutMs}ms)`));
    }, timeoutMs);

    const onMessage = (buf) => {
      let msg;
      try { msg = JSON.parse(String(buf)); } catch (_) { return; }
      if (!pred(msg)) return;
      cleanup();
      resolve(msg);
    };
    const onErr = (e) => { cleanup(); reject(e instanceof Error ? e : new Error(String(e))); };
    const onClose = () => { cleanup(); reject(new Error('Socket closed')); };

    function cleanup() {
      clearTimeout(timer);
      ws.off('message', onMessage);
      ws.off('error', onErr);
      ws.off('close', onClose);
    }

    ws.on('message', onMessage);
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

async function auth(ws, idx, username) {
  ws.send(JSON.stringify({ type: 'auth_login', username, password: SIM_PASSWORD }));
  let resp = await waitForMessage(ws, m => m.type === 'auth_ok' || m.type === 'error');
  if (resp.type === 'auth_ok') return;

  ws.send(JSON.stringify({ type: 'auth_register', username, password: SIM_PASSWORD, displayName: `Sim-${idx}` }));
  resp = await waitForMessage(ws, m => m.type === 'auth_ok' || m.type === 'error');
  if (resp.type !== 'auth_ok') throw new Error(resp.error || 'auth failed');
}

function baseTuning(playerCount) {
  const t = {
    vpGainWeight: 220,
    vpBuildBonus: 70,
    newSettlementSpotBase: 40,
    newSettlementSpotStep: 6,
    neutralTradePenalty: 16,
    minActionGain: -8,
    bankTradeMinGain: 0.05,
  };
  for (let i = 1; i <= Math.max(6, playerCount); i++) t[`seat${i}VpGainWeight`] = t.vpGainWeight;
  return t;
}

function tuneBySeat(current, batchRows, playerCount) {
  const seatSums = Array(playerCount).fill(0);
  const seatCounts = Array(playerCount).fill(0);

  for (const row of batchRows) {
    for (let i = 0; i < Math.min(playerCount, row.seatVps.length); i++) {
      seatSums[i] += row.seatVps[i];
      seatCounts[i] += 1;
    }
  }

  const avgs = seatSums.map((sum, i) => seatCounts[i] ? (sum / seatCounts[i]) : 0);
  const best = Math.max(...avgs);
  const out = { ...current };
  for (let i = 0; i < playerCount; i++) {
    const gap = best - avgs[i];
    const adjust = Math.max(0, Math.round(gap * 16));
    const key = `seat${i + 1}VpGainWeight`;
    out[key] = Math.max(150, Math.min(420, Number(current.vpGainWeight) + adjust));
  }

  return out;
}

async function runOneGame(globalGameIndex, mapOpt, tuning, simUsername) {
  const ws = await openSocket();
  await auth(ws, globalGameIndex, simUsername);

  ws.send(JSON.stringify({ type: 'create_room', displayName: `${simUsername}-${mapOpt.option}-${globalGameIndex}` }));
  const joined = await waitForMessage(ws, m => m.type === 'joined');
  if (!joined?.room?.code) throw new Error('No room code');

  ws.send(JSON.stringify({ type: 'set_spectator_mode', enabled: true }));
  await new Promise(r => setTimeout(r, 5));

  ws.send(JSON.stringify({ type: 'set_ai_difficulty', difficulty: 'expert' }));
  await new Promise(r => setTimeout(r, 5));

  ws.send(JSON.stringify({ type: 'set_expert_ai_tuning', tuning }));
  await waitForMessage(ws, m => m.type === 'expert_ai_tuning_ok' || m.type === 'error');

  ws.send(JSON.stringify({ type: 'set_rules', rules: {
    ...mapOpt.rules,
    victoryPointsToWin: 3,
    playTurnMs: 15000,
    setupTurnMs: 15000,
    microPhaseMs: 10000,
  }}));
  await new Promise(r => setTimeout(r, 10));

  ws.send(JSON.stringify({ type: 'fill_ai', targetCount: mapOpt.players }));
  await new Promise(r => setTimeout(r, 10));

  ws.send(JSON.stringify({ type: 'start_game' }));

  const done = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Game timeout (150s)'));
    }, 150000);

    const onMsg = (buf) => {
      let m;
      try { m = JSON.parse(String(buf)); } catch (_) { return; }
      if (m.type !== 'state' || !m.state || m.state.phase !== 'game-over') return;
      const st = m.state;
      const players = Array.isArray(st.players) ? st.players : [];
      const byId = new Map(players.map(p => [p.id, p]));
      const order = Array.isArray(st.turnOrder) && st.turnOrder.length ? st.turnOrder : players.map(p => p.id);
      const orderedPlayers = order.map(id => byId.get(id)).filter(Boolean);
      const winner = players.reduce((best, p) => (!best || (p.vp || 0) > (best.vp || 0)) ? p : best, null);
      const rawTurn = Number(st.turnNumber || 0);
      const seatVps = orderedPlayers.map(p => Number(p.vp || 0));
      cleanup();
      resolve({
        mapOption: mapOpt.option,
        playerCount: mapOpt.players,
        rawTurn,
        winnerName: winner?.name || 'unknown',
        winnerVp: Number(winner?.vp || 0),
        seatVps,
      });
    };
    const onErr = (e) => { cleanup(); reject(e instanceof Error ? e : new Error(String(e))); };
    const onClose = () => { cleanup(); reject(new Error('Socket closed before game over')); };

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
  return done;
}


async function runOneGameWithRetry(globalGameIndex, mapOpt, tuning, simUsername) {
  let lastErr = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await runOneGame(globalGameIndex, mapOpt, tuning, simUsername);
    } catch (err) {
      lastErr = err;
      process.stderr.write(`[warn] ${mapOpt.option} game ${globalGameIndex} attempt ${attempt} failed: ${err.message}\n`);
      await new Promise(r => setTimeout(r, 100 * attempt));
    }
  }
  throw lastErr || new Error('game failed');
}

function escapeCsv(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function runMapOption(mapOpt, startIndex, workerId) {
  let tuning = baseTuning(mapOpt.players);
  const mapRows = [];
  let globalIdx = startIndex;

  for (let g = 1; g <= GAMES_PER_OPTION; g++) {
    globalIdx += 1;
    const simUsername = MAP_CONCURRENCY > 1 ? `${SIM_USERNAME}_w${workerId}` : SIM_USERNAME;
    const row = await runOneGameWithRetry(globalIdx, mapOpt, tuning, simUsername);
    row.gameNumber = g;
    mapRows.push(row);

    if (g % BATCH_SIZE === 0) {
      const batchRows = mapRows.slice(-BATCH_SIZE);
      tuning = tuneBySeat(tuning, batchRows, mapOpt.players);
    }

    const seatAvg = row.seatVps.reduce((a, b) => a + b, 0) / Math.max(1, row.seatVps.length);
    process.stdout.write(`[sim] ${mapOpt.option} game ${g}/${GAMES_PER_OPTION} turn=${row.rawTurn} winnerVp=${row.winnerVp} avgSeatVp=${seatAvg.toFixed(2)}\n`);
  }

  const avgTurn = mapRows.reduce((a, b) => a + b.rawTurn, 0) / Math.max(1, mapRows.length);
  const avgWinnerVp = mapRows.reduce((a, b) => a + b.winnerVp, 0) / Math.max(1, mapRows.length);
  return { mapRows, summary: { mapOption: mapOpt.option, games: mapRows.length, avgTurn, avgWinnerVp } };
}

async function main() {
  const allRows = [];
  const summaryRows = [];

  const starts = [];
  let base = 0;
  for (const _opt of MAP_OPTIONS) {
    starts.push(base);
    base += GAMES_PER_OPTION;
  }

  const results = [];
  let cursor = 0;
  const workerCount = Math.min(MAP_CONCURRENCY, MAP_OPTIONS.length);
  async function worker() {
    while (true) {
      const i = cursor;
      cursor += 1;
      if (i >= MAP_OPTIONS.length) return;
      const mapOpt = MAP_OPTIONS[i];
      const r = await runMapOption(mapOpt, starts[i], i + 1);
      results.push(r);
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  for (const r of results) {
    allRows.push(...r.mapRows);
    summaryRows.push(r.summary);
  }

  allRows.sort((a, b) => {
    const mo = String(a.mapOption).localeCompare(String(b.mapOption));
    if (mo) return mo;
    return Number(a.gameNumber) - Number(b.gameNumber);
  });

  const outDir = path.join(process.cwd(), 'scripts', 'output');
  fs.mkdirSync(outDir, { recursive: true });
  const csvPath = path.join(outDir, 'all_playable_map_simulations.csv');

  const header = [
    'map_option', 'game_number', 'player_count', 'raw_turn', 'winner_name', 'winner_vp',
    'seat1_vp', 'seat2_vp', 'seat3_vp', 'seat4_vp', 'seat5_vp', 'seat6_vp'
  ];

  const lines = [header.join(',')];
  for (const r of allRows) {
    lines.push([
      escapeCsv(r.mapOption),
      r.gameNumber,
      r.playerCount,
      r.rawTurn,
      escapeCsv(r.winnerName),
      r.winnerVp,
      r.seatVps[0] ?? '',
      r.seatVps[1] ?? '',
      r.seatVps[2] ?? '',
      r.seatVps[3] ?? '',
      r.seatVps[4] ?? '',
      r.seatVps[5] ?? '',
    ].join(','));
  }
  fs.writeFileSync(csvPath, lines.join('\n'));

  const summaryPath = path.join(outDir, 'all_playable_map_summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify({
    totalGames: allRows.length,
    gamesPerOption: GAMES_PER_OPTION,
    mapOptions: MAP_OPTIONS.map(m => m.option),
    summary: summaryRows,
    csvPath,
  }, null, 2));

  console.log(JSON.stringify({
    totalGames: allRows.length,
    gamesPerOption: GAMES_PER_OPTION,
    mapOptions: MAP_OPTIONS.length,
    csvPath,
    summaryPath,
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
