
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);

  const ui = {
    connDot: $('connDot'),
    connText: $('connText'),
    nameInput: $('nameInput'),
    codeInput: $('codeInput'),
    usernameInput: $('usernameInput'),
    passwordInput: $('passwordInput'),
    registerBtn: $('registerBtn'),
    loginBtn: $('loginBtn'),
    logoutBtn: $('logoutBtn'),
    authStatus: $('authStatus'),
    authStats: $('authStats'),
    rejoinLastBtn: $('rejoinLastBtn'),
    lastRoomHint: $('lastRoomHint'),
    myAccountLabel: $('myAccountLabel'),
    rejoinIdInput: $('rejoinIdInput'),
    createBtn: $('createBtn'),
    joinBtn: $('joinBtn'),
    rejoinBtn: $('rejoinBtn'),
    startBtn: $('startBtn'),
    lobbyCard: $('lobbyCard'),
    setupCard: $('setupCard'),
    discardLimitInput: $('discardLimitInput'),
    timerSpeedSelect: $('timerSpeedSelect'),
    mapModeSelect: $('mapModeSelect'),
    classic56Note: $('classic56Note'),
    sixIslandsNote: $('sixIslandsNote'),
    scenarioRow: $('scenarioRow'),
    mapScenarioSelect: $('mapScenarioSelect'),
    scenario56Row: $('scenario56Row'),
    mapScenario56Select: $('mapScenario56Select'),
    testBuilderRow: $('testBuilderRow'),
    testBrushSelect: $('testBrushSelect'),
    testNumberSelect: $('testNumberSelect'),
    testResetBtn: $('testResetBtn'),
    victoryPointsSelect: $('victoryPointsSelect'),
    regenMapBtn: $('regenMapBtn'),
    mapGenNote: $('mapGenNote'),
    saveRulesBtn: $('saveRulesBtn'),
    rulesPreview: $('rulesPreview'),
    turnCard: $('turnCard'),
    toolsCard: $('toolsCard'),
    devCard: $('devCard'),
    logBtn: $('logBtn'),
    rulesBtn: $('rulesBtn'),
    diceBtn: $('diceBtn'),
    chatBtn: $('chatBtn'),
    endGameVoteBtn: $('endGameVoteBtn'),
    idsBtn: $('idsBtn'),
    resourcesCard: $('resourcesCard'),
    logCard: $('logCard'),
    logList: $('logList'),
    logHideBtn: $('logHideBtn'),
    rollBtn: $('rollBtn'),
    endBtn: $('endBtn'),
    buildRoadBtn: $('buildRoadBtn'),
    buildShipBtn: $('buildShipBtn'),
    moveShipBtn: $('moveShipBtn'),
    buildSettlementBtn: $('buildSettlementBtn'),
    buildCityBtn: $('buildCityBtn'),
    roomBox: $('roomBox'),
    roomCode: $('roomCode'),
    myPlayerIdFull: $('myPlayerIdFull'),
    copyMyIdBtn: $('copyMyIdBtn'),
    playersList: $('playersList'),
    colorPickerRow: $('colorPickerRow'),
    colorPicker: $('colorPicker'),
    aiFillRow: $('aiFillRow'),
    aiDifficultySelect: $('aiDifficultySelect'),
    aiFillSelect: $('aiFillSelect'),
    aiFillBtn: $('aiFillBtn'),
    aiClearBtn: $('aiClearBtn'),
    aiFillNote: $('aiFillNote'),
    errBox: $('errBox'),
    turnInfo: $('turnInfo'),
    timerInfo: $('timerInfo'),
    resourcesBox: $('resourcesBox'),
    buyDevBtn: $('buyDevBtn'),
    bankTradeBtn: $('bankTradeBtn'),
    playerTradeBtn: $('playerTradeBtn'),
    rollDock: $('rollDock'),
    rollDockBtn: $('rollDockBtn'),
    endDockBtn: $('endDockBtn'),
    devHand: $('devHand'),
    devRemaining: $('devRemaining'),
    hintBox: $('hintBox'),
    canvas: $('board'),
    countdownClock: $('countdownClock'),
    pauseBtn: $('pauseBtn'),
    pausedOverlay: $('pausedOverlay'),
    modal: $('modal'),
    modalBackdrop: $('modalBackdrop'),
    modalTitle: $('modalTitle'),
    modalBody: $('modalBody'),
    modalActions: $('modalActions'),

    postgameOverlay: $('postgameOverlay'),
    postgameSplash: $('postgameSplash'),
    postgameSplashTitle: $('postgameSplashTitle'),
    postgameSplashSub: $('postgameSplashSub'),
    postgamePanel: $('postgamePanel'),
    postgameTabs: $('postgameTabs'),
    pgTabBody: $('pgTabBody'),
    pgMainMenuBtn: $('pgMainMenuBtn'),
    pgHideBtn: $('pgHideBtn'),
    pgWinnerLine: $('pgWinnerLine'),
    pgMetaLine: $('pgMetaLine'),
    pgShowBtn: $('pgShowBtn'),

    // History / Leaderboard
    historyBtn: $('historyBtn'),
    leaderboardBtn: $('leaderboardBtn'),
    historyOverlay: $('historyOverlay'),
    historyCloseBtn: $('historyCloseBtn'),
    historyRefreshBtn: $('historyRefreshBtn'),
    historyTabs: $('historyTabs'),
    historyBody: $('historyBody'),
    historySub: $('historySub'),
  };

  const ctx = ui.canvas.getContext('2d');

  // Lobby: track whether the host explicitly changed the VP target so we don't
  // auto-overwrite it when toggling map/scenario.
  let vpTouched = false;

  const AUTH_TOKEN_KEY = 'hexsettlers_auth_token_v1';
  const LAST_ROOM_KEY = 'hexsettlers_last_room_v1';
  const AUTO_CREATE_ROOM_KEY = 'hexsettlers_auto_create_room_v1';

  let authUser = null;
  let authToken = null;
  let pendingAutoRejoin = false;

  function formatStatsLine(stats) {
    if (!stats) return '';
    const gp = Math.max(0, Number(stats.gamesPlayed || 0));
    const w = Math.max(0, Number(stats.wins || 0));
    const l = Math.max(0, Number(stats.losses || 0));
    const tvp = Math.max(0, Number(stats.totalVP || 0));
    return `Games: ${gp}  Wins: ${w}  Losses: ${l}  Total VP: ${tvp}`;
  }

  function setAuthState(user, token) {
    authUser = user || null;
    if (typeof token === 'string' && token.trim()) {
      authToken = token.trim();
      try { localStorage.setItem(AUTH_TOKEN_KEY, authToken); } catch (_) {}
    } else if (!user) {
      authToken = null;
      try { localStorage.removeItem(AUTH_TOKEN_KEY); } catch (_) {}
    }
    updateAuthUi();
  }

  function updateAuthUi() {
    const loggedIn = !!authUser;
    if (ui.authStatus) {
      ui.authStatus.textContent = loggedIn ? `Logged in as ${authUser.username}` : 'Not logged in.';
    }
    if (ui.authStats) {
      ui.authStats.textContent = loggedIn ? formatStatsLine(authUser.stats) : '';
    }
    if (ui.logoutBtn) ui.logoutBtn.classList.toggle('hidden', !loggedIn);
    if (ui.loginBtn) ui.loginBtn.disabled = loggedIn;
    if (ui.registerBtn) ui.registerBtn.disabled = loggedIn;
    if (ui.usernameInput) ui.usernameInput.disabled = loggedIn;
    if (ui.passwordInput) ui.passwordInput.disabled = loggedIn;

    if (ui.createBtn) ui.createBtn.disabled = !loggedIn;
    if (ui.joinBtn) ui.joinBtn.disabled = !loggedIn;
    if (ui.rejoinLastBtn) ui.rejoinLastBtn.disabled = !loggedIn;

    const last = (() => { try { return localStorage.getItem(LAST_ROOM_KEY) || ''; } catch (_) { return ''; } })();
    if (ui.lastRoomHint) ui.lastRoomHint.textContent = last ? `Last room: ${last}` : '';
    if (ui.myAccountLabel) ui.myAccountLabel.textContent = loggedIn ? `${authUser.username} (${authUser.displayName || authUser.username})` : '—';
  }

  function clearAuthLocal() {
    authUser = null;
    authToken = null;
    try { localStorage.removeItem(AUTH_TOKEN_KEY); } catch (_) {}
    updateAuthUi();
  }

// -------------------- Post-game overlay (splash + stats) --------------------
let postgameState = {
  active: false,
  hidden: false,
  tab: 'summary',
  diceView: 'totals',
  resFocusId: null,
  devFocusId: null,
  splashTimer: null,
  lastGameId: null,
  lastPhase: null,

  // When viewing history, we render postgame UI from a stored snapshot instead of the live state.
  snapshot: null,
  historyMode: false,
};


// -------------------- History + Player Stats --------------------
let historyState = {
  active: false,
  tab: 'games',
  games: [],
  leaderboard: [],
  sortKey: 'wins',
  sortDir: 'desc',
  loadingGames: false,
  loadingBoard: false,
};
function clearPostgameTimers() {
  try { if (postgameState.splashTimer) clearTimeout(postgameState.splashTimer); } catch(_) {}
  postgameState.splashTimer = null;
}

function fmtMs(ms) {
  const t = Math.max(0, Math.floor((ms || 0) / 1000));
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function computeWinner(st) {
  if (!st || !Array.isArray(st.players) || !st.players.length) return null;
  // Prefer parsing the server message: "Name wins!"
  try {
    const msg = String(st.message || '');
    const m = msg.match(/^(.+?)\s+wins!\s*$/i);
    if (m && m[1]) {
      const name = m[1].trim();
      const p = st.players.find(pp => pp.name === name) || null;
      if (p) return p;
    }
  } catch(_) {}
  // Fallback: max VP
  let best = st.players[0];
  for (const p of st.players) if ((p.vp||0) > (best.vp||0)) best = p;
  return best;
}

function computePieceCounts(st, pid) {
  const edges = st?.geom?.edges || [];
  const nodes = st?.geom?.nodes || [];
  let roads = 0, ships = 0, settlements = 0, cities = 0;
  for (const e of edges) {
    if (!e) continue;
    if (e.roadOwner === pid) roads++;
    if (e.shipOwner === pid) ships++;
  }
  for (const n of nodes) {
    const b = n && n.building;
    if (!b || b.owner !== pid) continue;
    if (b.type === 'settlement') settlements++;
    if (b.type === 'city') cities++;
  }
  return { roads, ships, settlements, cities };
}

function gameDurationMs(st) {
  const entries = (st && st.log) ? st.log : [];
  if (!entries.length) return 0;
  const t0 = Number(entries[0].ts || 0);
  const t1 = Number(entries[entries.length - 1].ts || 0);
  if (!t0 || !t1) return 0;
  return Math.max(0, t1 - t0);
}

function setPostgameVisible(visible) {
  if (!ui.postgameOverlay) return;
  ui.postgameOverlay.classList.toggle('hidden', !visible);
}

function setPostgamePanelVisible(visible) {
  if (!ui.postgamePanel || !ui.postgameSplash) return;
  ui.postgamePanel.classList.toggle('hidden', !visible);
  ui.postgameSplash.classList.toggle('hidden', visible);
}

function setPostgameHidden(hidden) {
  postgameState.hidden = !!hidden;
  if (ui.pgShowBtn) ui.pgShowBtn.classList.toggle('hidden', !postgameState.hidden);
  setPostgameVisible(!postgameState.hidden);
}


function renderPostgameTab(tab) {
  const st = postgameState.snapshot || state;
  if (!ui.pgTabBody || !st) return;
  postgameState.tab = tab || 'summary';

  // Tab button state
  try {
    const tabs = ui.postgameTabs ? ui.postgameTabs.querySelectorAll('.pgTab') : [];
    tabs.forEach(b => b.classList.toggle('active', b.dataset.tab === postgameState.tab));
  } catch(_) {}

  const stats = st.stats || null;
  const players = Array.isArray(st.players) ? st.players : [];
  const winner = computeWinner(st);
  const winnerId = winner ? winner.id : (players[0] ? players[0].id : null);

  // Persist per-tab focus selections
  if (!postgameState.resFocusId) postgameState.resFocusId = winnerId;
  if (!postgameState.devFocusId) postgameState.devFocusId = winnerId;

  const RESOURCE_KEYS = ['brick','lumber','wool','grain','ore'];
  const RESOURCE_LABEL = { brick:'Brick', lumber:'Wood', wool:'Wool', grain:'Grain', ore:'Ore' };

  const SOURCE_LABEL = {
    // gains
    production: 'Production',
    setup: 'Setup',
    trade: 'Trades',
    steal: 'Steals',
    dev: 'Dev Cards',
    other: 'Other',
    // losses
    build: 'Building',
    discard: 'Discards',
  };

  const clamp01 = (x) => Math.max(0, Math.min(1, x || 0));

  const parseHex = (hex) => {
    const h = String(hex || '').trim();
    if (!h || h[0] !== '#') return null;
    const s = h.slice(1);
    const v = (s.length === 3)
      ? (s[0]+s[0]+s[1]+s[1]+s[2]+s[2])
      : s;
    if (v.length !== 6) return null;
    const r = parseInt(v.slice(0,2), 16);
    const g = parseInt(v.slice(2,4), 16);
    const b = parseInt(v.slice(4,6), 16);
    if ([r,g,b].some(n => Number.isNaN(n))) return null;
    return { r, g, b };
  };

  const rgbaFromHex = (hex, a) => {
    const rgb = parseHex(hex);
    if (!rgb) return `rgba(74,163,255,${a})`;
    return `rgba(${rgb.r},${rgb.g},${rgb.b},${a})`;
  };

  const sumRes = (m) => {
    if (!m) return 0;
    let t = 0;
    for (const k of RESOURCE_KEYS) t += Number(m[k] || 0);
    return t;
  };

  const safeNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const playerCell = (p, suffix) => {
    const wrap = document.createElement('div');
    wrap.className = 'pgName';
    const dot = document.createElement('div');
    dot.className = 'pgBadge';
    dot.style.background = p.color || '#777';
    const nm = document.createElement('div');
    nm.textContent = `${p.name}${suffix || ''}`;
    nm.style.minWidth = '0';
    nm.style.overflow = 'hidden';
    nm.style.textOverflow = 'ellipsis';
    wrap.appendChild(dot);
    wrap.appendChild(nm);
    return wrap;
  };

  const barNode = (value, max, colorHex, text, opts={}) => {
    const v = safeNum(value);
    const m = Math.max(0.00001, safeNum(max));
    const pct = clamp01(v / m);
    const wrap = document.createElement('div');
    wrap.className = 'pgBarCell' + (opts.alignRight ? ' right' : '');
    const fill = document.createElement('div');
    fill.className = 'pgBarFill';
    fill.style.width = `${Math.round(pct * 100)}%`;
    fill.style.background = rgbaFromHex(colorHex, opts.alpha ?? 0.18);
    const label = document.createElement('div');
    label.className = 'pgBarLabel';
    label.textContent = (text != null) ? String(text) : String(v);
    wrap.appendChild(fill);
    wrap.appendChild(label);
    return wrap;
  };

const stackedBarNode = (segments, max, labelText, opts={}) => {
  const m = Math.max(0.00001, safeNum(max));
  const wrap = document.createElement('div');
  wrap.className = 'pgBarCell pgStack' + (opts.alignRight ? ' right' : '');
  const stack = document.createElement('div');
  stack.className = 'pgBarStack';

  let total = 0;
  for (const s of (segments || [])) total += safeNum(s?.value || 0);

  for (const s of (segments || [])) {
    const v = safeNum(s?.value || 0);
    if (!v) continue;
    const pct = clamp01(v / m) * 100;
    const seg = document.createElement('div');
    seg.className = 'pgBarStackSeg';
    seg.style.width = `${pct}%`;
    seg.style.background = rgbaFromHex(s?.color, opts.alpha ?? 0.22);
    stack.appendChild(seg);
  }

  const label = document.createElement('div');
  label.className = 'pgBarLabel';
  label.textContent = (labelText != null) ? String(labelText) : String(total);

  wrap.appendChild(stack);
  wrap.appendChild(label);
  return wrap;
};

const diceTotalFor = (ds) => {
  if (!ds) return 0;
  let t = 0;
  for (let r = 2; r <= 12; r++) t += safeNum(ds[r] || 0);
  return t;
};

  const makeSection = (title, rightNode) => {
    const sec = document.createElement('div');
    sec.className = 'pgSection';
    const head = document.createElement('div');
    head.className = 'pgSectionHead';
    const h = document.createElement('div');
    h.className = 'pgSectionTitle';
    h.textContent = title;
    head.appendChild(h);
    if (rightNode) head.appendChild(rightNode);
    sec.appendChild(head);
    return sec;
  };

  const makeTable = (headers, rows) => {
    const table = document.createElement('table');
    table.className = 'pgTable';
    const thead = document.createElement('thead');
    const trh = document.createElement('tr');
    for (const h of headers) {
      const th = document.createElement('th');
      if (h instanceof Node) th.appendChild(h);
      else th.textContent = h;
      trh.appendChild(th);
    }
    thead.appendChild(trh);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (const r of rows) {
      const tr = document.createElement('tr');
      for (const c of r) {
        const td = document.createElement('td');
        if (c instanceof Node) td.appendChild(c);
        else td.textContent = String(c);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    return table;
  };

  const makePlayerSelect = (labelText, keyName, defaultId) => {
    const wrap = document.createElement('div');
    wrap.className = 'pgControl';
    const lab = document.createElement('div');
    lab.className = 'pgControlLabel';
    lab.textContent = labelText;
    const sel = document.createElement('select');
    sel.className = 'pgSelect';
    for (const p of players) {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      sel.appendChild(opt);
    }
    const cur = postgameState[keyName] || defaultId;
    if (cur) sel.value = cur;
    sel.addEventListener('change', () => {
      postgameState[keyName] = sel.value;
      renderPostgameTab(postgameState.tab);
    });
    wrap.appendChild(lab);
    wrap.appendChild(sel);
    return wrap;
  };

  const addNote = (txt) => {
    const note = document.createElement('div');
    note.className = 'pgNote';
    note.textContent = txt;
    ui.pgTabBody.appendChild(note);
  };

  ui.pgTabBody.innerHTML = '';

  // -------------------- SUMMARY --------------------
  if (postgameState.tab === 'summary') {
    const sec1 = makeSection('Score & Pieces');

    const maxVP = Math.max(1, ...players.map(p => safeNum(p.vp || 0)));
    const maxSet = Math.max(1, ...players.map(p => computePieceCounts(st, p.id).settlements));
    const maxCity = Math.max(1, ...players.map(p => computePieceCounts(st, p.id).cities));
    const maxRoad = Math.max(1, ...players.map(p => computePieceCounts(st, p.id).roads));
    const maxShip = Math.max(1, ...players.map(p => computePieceCounts(st, p.id).ships));
    const maxArmy = Math.max(1, ...players.map(p => safeNum(p.army || 0)));

    const headers1 = ['Player','VP','VP (Dev)','Army','Settlements','Cities','Roads','Ships','Island VP','Desert VP','Badges'];
    const rows1 = players.map(p => {
      const pc = computePieceCounts(st, p.id);
      const badges = [];
      if (st.largestArmy && st.largestArmy.playerId === p.id) badges.push('LA');
      if (st.longestRoad && st.longestRoad.playerId === p.id) badges.push('LR');
      return [
        playerCell(p, p.id === myPlayerId ? ' (you)' : ''),
        barNode(p.vp || 0, maxVP, p.color, p.vp || 0, { alignRight: true }),
        barNode(p.vpDev || 0, Math.max(1, ...players.map(pp => safeNum(pp.vpDev || 0))), p.color, p.vpDev || 0, { alignRight: true, alpha: 0.14 }),
        barNode(p.army || 0, maxArmy, p.color, p.army || 0, { alignRight: true, alpha: 0.14 }),
        barNode(pc.settlements, maxSet, p.color, pc.settlements, { alignRight: true, alpha: 0.12 }),
        barNode(pc.cities, maxCity, p.color, pc.cities, { alignRight: true, alpha: 0.12 }),
        barNode(pc.roads, maxRoad, p.color, pc.roads, { alignRight: true, alpha: 0.12 }),
        barNode(pc.ships, maxShip, p.color, pc.ships, { alignRight: true, alpha: 0.12 }),
        barNode(p.newIslandVP || 0, Math.max(1, ...players.map(pp => safeNum(pp.newIslandVP || 0))), p.color, p.newIslandVP || 0, { alignRight: true, alpha: 0.10 }),
        barNode(p.ttdFarSideVP || 0, Math.max(1, ...players.map(pp => safeNum(pp.ttdFarSideVP || 0))), p.color, p.ttdFarSideVP || 0, { alignRight: true, alpha: 0.10 }),
        badges.length ? badges.join(' • ') : '—'
      ];
    });

    sec1.appendChild(makeTable(headers1, rows1));
ui.pgTabBody.appendChild(sec1);

// VP breakdown (buildings + bonuses + badges)
const secVp = makeSection('VP Breakdown');

const lrPid = st.longestRoad?.playerId || null;
const laPid = st.largestArmy?.playerId || null;

const rawVp = players.map(p => {
  const pc = pieceCount(p);
  const buildingVP = safeNum(pc.settlements) * 1 + safeNum(pc.cities) * 2;
  const devVP = safeNum(p.vpDev || 0);
  const islandVP = safeNum(p.newIslandVP || 0);
  const desertVP = safeNum(p.ttdFarSideVP || 0);
  const badgeVP = (p.id === lrPid ? 2 : 0) + (p.id === laPid ? 2 : 0);
  const total = buildingVP + devVP + islandVP + desertVP + badgeVP;
  return { p, buildingVP, devVP, islandVP, desertVP, badgeVP, total, shown: safeNum(p.vp || 0) };
});

const maxB = Math.max(1, ...rawVp.map(r => r.buildingVP));
const maxD = Math.max(1, ...rawVp.map(r => r.devVP));
const maxI = Math.max(1, ...rawVp.map(r => r.islandVP));
const maxT = Math.max(1, ...rawVp.map(r => r.desertVP));
const maxBad = Math.max(1, ...rawVp.map(r => r.badgeVP));
const maxTot = Math.max(1, ...rawVp.map(r => r.total));

const rowsVp = rawVp.map(r => ([
  playerCell(r.p),
  barNode(r.buildingVP, maxB, r.p.color, r.buildingVP, { alignRight: true, alpha: 0.12 }),
  barNode(r.devVP, maxD, r.p.color, r.devVP, { alignRight: true, alpha: 0.12 }),
  barNode(r.islandVP, maxI, r.p.color, r.islandVP, { alignRight: true, alpha: 0.10 }),
  barNode(r.desertVP, maxT, r.p.color, r.desertVP, { alignRight: true, alpha: 0.10 }),
  barNode(r.badgeVP, maxBad, r.p.color, r.badgeVP, { alignRight: true, alpha: 0.10 }),
  barNode(r.total, maxTot, r.p.color, r.total, { alignRight: true, alpha: 0.14 }),
  (r.total === r.shown) ? '—' : (r.shown - r.total >= 0 ? `+${r.shown - r.total}` : String(r.shown - r.total)),
]));

secVp.appendChild(makeTable(['Player','Buildings','Dev VP','Island','Desert','Badges','Total (calc)','Δ'], rowsVp));
ui.pgTabBody.appendChild(secVp);

const sec2 = makeSection('Activity Totals');

const turnsByPlayer = (stats && stats.turnTimes && stats.turnTimes.byPlayer) ? stats.turnTimes.byPlayer : null;
const tradesByPlayer = (stats && stats.trades && stats.trades.byPlayer) ? stats.trades.byPlayer : null;
const devByPlayer = (stats && stats.dev && stats.dev.byPlayer) ? stats.dev.byPlayer : null;
const actionsByPlayer = (stats && stats.actions && stats.actions.byPlayer) ? stats.actions.byPlayer : null;
const buildsByPlayer = (stats && stats.builds && stats.builds.byPlayer) ? stats.builds.byPlayer : null;
const thieves = (stats && stats.thieves) ? stats.thieves : null;

const rows2_raw = players.map(p => {
  const tt = turnsByPlayer ? (turnsByPlayer[p.id] || null) : null;
  const tr = tradesByPlayer ? (tradesByPlayer[p.id] || null) : null;
  const dv = devByPlayer ? (devByPlayer[p.id] || null) : null;
  const ac = actionsByPlayer ? (actionsByPlayer[p.id] || null) : null;
  const bl = buildsByPlayer ? (buildsByPlayer[p.id] || null) : null;

  const turns = tt ? safeNum(tt.turns) : 0;
  const avgMs = tt ? safeNum(tt.avgMs) : 0;
  const devBought = dv ? safeNum(dv.bought) : 0;
  const devPlayed = dv ? safeNum(dv.played) : 0;
  const bankTrades = tr ? safeNum(tr.bank) : 0;
  const playerTrades = tr ? safeNum(tr.player) : 0;

  const robberMoves = ac ? safeNum(ac.robberMoves) : 0;
  const pirateMoves = ac ? safeNum(ac.pirateMoves) : 0;
  const steals = ac ? (safeNum(ac.robberSteals) + safeNum(ac.pirateSteals)) : 0;
  const stolenFrom = thieves ? (safeNum(thieves.robber?.stolenFromByPlayer?.[p.id]) + safeNum(thieves.pirate?.stolenFromByPlayer?.[p.id])) : 0;

  const shipMoves = bl ? safeNum(bl.ship_move) : 0;
  const discards = ac ? safeNum(ac.discards) : 0;

  return { p, turns, avgMs, devBought, devPlayed, bankTrades, playerTrades, robberMoves, pirateMoves, steals, stolenFrom, shipMoves, discards };
});

const maxTurns = Math.max(1, ...rows2_raw.map(r => r.turns));
const maxDevB = Math.max(1, ...rows2_raw.map(r => r.devBought));
const maxDevP = Math.max(1, ...rows2_raw.map(r => r.devPlayed));
const maxTrades = Math.max(1, ...rows2_raw.map(r => (r.bankTrades + r.playerTrades)));
const maxRobberMoves = Math.max(1, ...rows2_raw.map(r => r.robberMoves));
const maxPirateMoves = Math.max(1, ...rows2_raw.map(r => r.pirateMoves));
const maxSteals = Math.max(1, ...rows2_raw.map(r => r.steals));
const maxStolenFrom = Math.max(1, ...rows2_raw.map(r => r.stolenFrom));
const maxShipMoves = Math.max(1, ...rows2_raw.map(r => r.shipMoves));
const maxDiscards = Math.max(1, ...rows2_raw.map(r => r.discards));

const headers2 = ['Player','Turns','Avg Turn','Dev Bought','Dev Played','Trades','Robber Moves','Pirate Moves','Steals','Stolen From','Ship Moves','Discards'];
const rows2 = rows2_raw.map(r => {
  const trades = r.bankTrades + r.playerTrades;
  return [
    playerCell(r.p),
    barNode(r.turns, maxTurns, r.p.color, r.turns, { alignRight: true, alpha: 0.14 }),
    barNode(r.avgMs, Math.max(1, ...rows2_raw.map(x => x.avgMs || 0)), r.p.color, fmtMs(r.avgMs), { alignRight: true, alpha: 0.10 }),
    barNode(r.devBought, maxDevB, r.p.color, r.devBought, { alignRight: true, alpha: 0.12 }),
    barNode(r.devPlayed, maxDevP, r.p.color, r.devPlayed, { alignRight: true, alpha: 0.12 }),
    barNode(trades, maxTrades, r.p.color, `${r.bankTrades}/${r.playerTrades}`, { alignRight: true, alpha: 0.12 }),
    barNode(r.robberMoves, maxRobberMoves, r.p.color, r.robberMoves, { alignRight: true, alpha: 0.10 }),
    barNode(r.pirateMoves, maxPirateMoves, r.p.color, r.pirateMoves, { alignRight: true, alpha: 0.10 }),
    barNode(r.steals, maxSteals, r.p.color, r.steals, { alignRight: true, alpha: 0.12 }),
    barNode(r.stolenFrom, maxStolenFrom, r.p.color, r.stolenFrom, { alignRight: true, alpha: 0.10 }),
    barNode(r.shipMoves, maxShipMoves, r.p.color, r.shipMoves, { alignRight: true, alpha: 0.12 }),
    barNode(r.discards, maxDiscards, r.p.color, r.discards, { alignRight: true, alpha: 0.12 }),
  ];
});


    sec2.appendChild(makeTable(headers2, rows2));
    ui.pgTabBody.appendChild(sec2);

    const note = document.createElement('div');
    note.className = 'pgNote';
    const target = Math.floor(Number(st?.rules?.victoryPointsToWin ?? st?.rules?.victoryTarget ?? st?.rules?.vpToWin) || 10);
    const lr = st.longestRoad?.playerId ? (players.find(p=>p.id===st.longestRoad.playerId)?.name || '—') : '—';
    const la = st.largestArmy?.playerId ? (players.find(p=>p.id===st.largestArmy.playerId)?.name || '—') : '—';
    note.textContent = `Win target: ${target} VP • Longest Road: ${lr} (${st.longestRoad?.length ?? 0}) • Largest Army: ${la} (${st.largestArmy?.size ?? 0})`;
    ui.pgTabBody.appendChild(note);
    return;
  }

  // -------------------- DICE --------------------
  if (postgameState.tab === 'dice') {
    const ctrl = document.createElement('div');
    ctrl.className = 'pgSubTabs';
    const mkBtn = (key, label) => {
      const b = document.createElement('button');
      b.className = 'pgSubTab' + (postgameState.diceView === key ? ' active' : '');
      b.textContent = label;
      b.addEventListener('click', () => {
        postgameState.diceView = key;
        renderPostgameTab('dice');
      });
      return b;
    };
    ctrl.appendChild(mkBtn('totals','View Totals'));
    ctrl.appendChild(mkBtn('players','View Per Player'));
    ctrl.appendChild(mkBtn('prob','View Probability'));

    const sec = makeSection('Dice Rolls', ctrl);

    const byNum = (stats && stats.rolls && stats.rolls.byNumber) ? stats.rolls.byNumber : (st.diceStats || {});
    const total = (stats && stats.rolls && Number.isFinite(stats.rolls.total)) ? stats.rolls.total : Object.values(byNum||{}).reduce((a,v)=>a+safeNum(v),0);

    const probs = {2:1/36,3:2/36,4:3/36,5:4/36,6:5/36,7:6/36,8:5/36,9:4/36,10:3/36,11:2/36,12:1/36};

    if (postgameState.diceView === 'players') {
  const byPlayer = (stats && stats.rolls && stats.rolls.byPlayer) ? stats.rolls.byPlayer : {};
  const rowsRaw = players.map(p => {
    const r = byPlayer[p.id] || {};
    const t = diceTotalFor(r);
    const s7 = safeNum(r[7] || 0);
    return { p, total: t, sevens: s7 };
  });
  const maxT = Math.max(1, ...rowsRaw.map(r => r.total));
  const max7 = Math.max(1, ...rowsRaw.map(r => r.sevens));

  const headers = ['Player','Total Rolls','7s'];
  const rows = rowsRaw.map(r => [
    playerCell(r.p),
    barNode(r.total, maxT, r.p.color, r.total, { alignRight: true }),
    barNode(r.sevens, max7, r.p.color, r.sevens, { alignRight: true, alpha: 0.12 }),
  ]);
  sec.appendChild(makeTable(headers, rows));
  ui.pgTabBody.appendChild(sec);
  addNote(`Total rolls: ${total}`);
  return;
}


    if (postgameState.diceView === 'prob') {
      const rows = [];
      let maxAbsDiff = 1;
      for (let r=2; r<=12; r++) {
        const c = safeNum(byNum[r] || 0);
        const exp = total ? (total * (probs[r] || 0)) : 0;
        const diff = c - exp;
        maxAbsDiff = Math.max(maxAbsDiff, Math.abs(diff));
        rows.push({ r, c, exp, diff });
      }
      const headers = ['Roll','Actual','Expected','Δ'];
      const tableRows = rows.map(o => {
        const diffTxt = (o.diff >= 0 ? '+' : '') + o.diff.toFixed(1);
        const col = (o.diff >= 0) ? '#4aa3ff' : '#ff6a6a';
        return [
          String(o.r),
          barNode(o.c, Math.max(1, ...rows.map(x => x.c)), '#9aa7b4', o.c, { alignRight: true, alpha: 0.12 }),
          o.exp.toFixed(1),
          barNode(Math.abs(o.diff), maxAbsDiff, col, diffTxt, { alignRight: true, alpha: 0.14 }),
        ];
      });
      sec.appendChild(makeTable(headers, tableRows));
      ui.pgTabBody.appendChild(sec);
      addNote('Expected values use the standard 2d6 distribution.');
      return;
    }

    // totals view (stacked by player)
const byPlayer = (stats && stats.rolls && stats.rolls.byPlayer) ? stats.rolls.byPlayer : {};

const counts = [];
for (let r=2; r<=12; r++) {
  let c = safeNum(byNum[r] || 0);
  if (!c) {
    // fallback: sum from per-player buckets
    for (const p of players) c += safeNum((byPlayer[p.id] || {})[r] || 0);
  }
  counts.push({ r, c });
}
const maxCount = Math.max(1, ...counts.map(o => o.c));

// Legend
if (players.length) {
  const legend = document.createElement('div');
  legend.className = 'pgLegend';
  for (const p of players) {
    const it = document.createElement('div');
    it.className = 'pgLegendItem';
    const dot = document.createElement('div');
    dot.className = 'pgLegendDot';
    dot.style.background = p.color || '#777';
    const nm = document.createElement('div');
    nm.textContent = p.name;
    it.appendChild(dot);
    it.appendChild(nm);
    legend.appendChild(it);
  }
  sec.appendChild(legend);
}

const headers = ['Roll','Count (by player)','%'];
const rows = counts.map(o => {
  const r = o.r;
  const c = o.c;
  const pct = total ? Math.round((c/total)*1000)/10 : 0;

  const segs = players.map(p => ({
    value: safeNum((byPlayer[p.id] || {})[r] || 0),
    color: p.color || '#777',
  })).filter(s => safeNum(s.value) > 0);

  return [
    String(r),
    stackedBarNode(segs, maxCount, c, { alignRight: true, alpha: 0.22 }),
    pct.toFixed(1)
  ];
});

sec.appendChild(makeTable(headers, rows));
ui.pgTabBody.appendChild(sec);
addNote(`Total rolls: ${total}. Bars are stacked by player.`);
return;
  }

  // -------------------- RESOURCES --------------------
  if (postgameState.tab === 'resources') {
    const secTop = makeSection('Resources Overview');

    const resByPlayer = (stats && stats.resources && stats.resources.byPlayer) ? stats.resources.byPlayer : null;

    const rowsRaw = players.map(p => {
      const rs = resByPlayer ? (resByPlayer[p.id] || null) : null;
      const gained = rs ? sumRes(rs.gained) : 0;
      const lost = rs ? sumRes(rs.lost) : 0;
      const net = gained - lost;
      const finalHand = sumRes(p.resources || {});
      return { p, gained, lost, net, finalHand };
    });

    const maxGain = Math.max(1, ...rowsRaw.map(r => r.gained));
    const maxLost = Math.max(1, ...rowsRaw.map(r => r.lost));
    const maxFinal = Math.max(1, ...rowsRaw.map(r => r.finalHand));

    const headers = ['Player','Gained','Lost','Net','Final Hand'];
    const rows = rowsRaw.map(r => {
      const netTxt = (r.net >= 0 ? '+' : '') + r.net;
      const netCol = (r.net >= 0) ? '#4aa3ff' : '#ff6a6a';
      return [
        playerCell(r.p),
        barNode(r.gained, maxGain, r.p.color, r.gained, { alignRight: true }),
        barNode(r.lost, maxLost, r.p.color, r.lost, { alignRight: true, alpha: 0.12 }),
        barNode(Math.abs(r.net), Math.max(1, ...rowsRaw.map(x => Math.abs(x.net))), netCol, netTxt, { alignRight: true, alpha: 0.14 }),
        barNode(r.finalHand, maxFinal, r.p.color, r.finalHand, { alignRight: true, alpha: 0.10 }),
      ];
    });

    secTop.appendChild(makeTable(headers, rows));
    ui.pgTabBody.appendChild(secTop);

    if (!resByPlayer) {
      addNote('Detailed resource breakdown is unavailable for this match.');
      return;
    }

    const secTurn = makeSection('Per Turn Resource Deltas');

    // Prefer the dice history to define the displayed turns (main game turns).
    const rollHist = (stats && stats.rolls && Array.isArray(stats.rolls.history)) ? stats.rolls.history : [];
    const turnSet = new Set();
    for (const e of rollHist) {
      const t = Number(e?.turn);
      if (Number.isFinite(t) && t > 0) turnSet.add(t);
    }
    // Fallback to any resource-byTurn keys if dice history is missing.
    if (turnSet.size === 0) {
      for (const pid of Object.keys(resByPlayer || {})) {
        const bt = resByPlayer[pid]?.byTurn || null;
        if (!bt) continue;
        for (const k of Object.keys(bt)) {
          const t = parseInt(k, 10);
          if (Number.isFinite(t) && t > 0) turnSet.add(t);
        }
      }
    }

    const turns = Array.from(turnSet).sort((a,b) => a-b);
    if (!turns.length) {
      secTurn.appendChild(document.createTextNode('Per-turn resource timeline is unavailable for this match.'));
      ui.pgTabBody.appendChild(secTurn);
      return;
    }

    const maxTurn = Math.max(...turns);

    // Map turn -> roll info
    const rollByTurn = {};
    for (const e of rollHist) {
      const t = Number(e?.turn);
      if (!Number.isFinite(t) || t <= 0) continue;
      if (!rollByTurn[t]) rollByTurn[t] = e;
    }

    // Build per-player cumulative resource totals by turn (end-of-turn snapshot).
    const snapshots = {}; // pid -> { [turn]: {k:total} }
    const deltas = {};    // pid -> { [turn]: {k:delta} }
    for (const pl of players) {
      const pid = pl.id;
      const pr = resByPlayer[pid] || {};
      const bt = pr.byTurn || {};
      deltas[pid] = bt;

      const cum = { brick: 0, lumber: 0, wool: 0, grain: 0, ore: 0 };
      const snap = {};

      // Include setup deltas (usually stored under turn 0) so totals for turn 1+ are correct.
      for (let t = 0; t <= maxTurn; t++) {
        const m = bt[t] || bt[String(t)] || {};
        for (const k of RESOURCE_KEYS) cum[k] = safeNum(cum[k]) + safeNum(m[k] || 0);
        snap[t] = { ...cum };
      }

      snapshots[pid] = snap;
    }

    const thPlayer = (pl) => {
      const wrap = document.createElement('div');
      wrap.className = 'pgThPlayer';
      const dot = document.createElement('div');
      dot.className = 'pgLegendDot';
      dot.style.background = pl.color || '#777';
      const nm = document.createElement('div');
      nm.textContent = pl.name;
      wrap.appendChild(dot);
      wrap.appendChild(nm);
      return wrap;
    };

    const resIconSrc = (k) => `assets/ports/${k}.png`;

    const resTurnCard = (pid, turn) => {
      const bt = deltas[pid] || {};
      const d = bt[turn] || bt[String(turn)] || {};
      const tot = (snapshots[pid] && snapshots[pid][turn]) ? snapshots[pid][turn] : ({ brick: 0, lumber: 0, wool: 0, grain: 0, ore: 0 });

      const card = document.createElement('div');
      card.className = 'pgResTurnCard';

      for (const rk of RESOURCE_KEYS) {
        const slot = document.createElement('div');
        slot.className = 'pgResSlot';

        const img = document.createElement('img');
        img.className = 'pgResIcon';
        img.src = resIconSrc(rk);
        img.alt = rk;
        img.draggable = false;

        const nums = document.createElement('div');
        nums.className = 'pgResNums';

        const totalSpan = document.createElement('span');
        totalSpan.className = 'pgResTotal';
        totalSpan.textContent = String(Math.max(0, safeNum(tot[rk] || 0)));

        const dv = safeNum(d[rk] || 0);
        const deltaSpan = document.createElement('span');
        deltaSpan.className = 'pgResDelta ' + (dv > 0 ? 'pos' : (dv < 0 ? 'neg' : 'zero'));
        deltaSpan.textContent = (dv >= 0 ? '+' : '') + String(dv);

        nums.appendChild(totalSpan);
        nums.appendChild(deltaSpan);
        slot.appendChild(img);
        slot.appendChild(nums);
        card.appendChild(slot);
      }

      return card;
    };

    const headersT = [
      'Turn',
      'Roll',
      ...players.map(p => thPlayer(p)),
    ];

    const rowsT = turns.map(t => {
      const e = rollByTurn[t] || null;
      let rollTxt = '—';
      if (e && Number.isFinite(Number(e.roll))) {
        const r = Number(e.roll);
        const d1 = Number(e.d1);
        const d2 = Number(e.d2);
        rollTxt = (Number.isFinite(d1) && Number.isFinite(d2)) ? `${r} (${d1}+${d2})` : String(r);
      }

      const turnNode = document.createElement('div');
      turnNode.className = 'pgTurnCell';
      turnNode.textContent = String(t);

      const rollNode = document.createElement('div');
      rollNode.className = 'pgRollCell';
      rollNode.textContent = rollTxt;

      return [
        turnNode,
        rollNode,
        ...players.map(p => resTurnCard(p.id, t)),
      ];
    });

    const tbl = makeTable(headersT, rowsT);
    tbl.classList.add('pgResTurnTable');
    secTurn.appendChild(tbl);
    ui.pgTabBody.appendChild(secTurn);

    addNote('Each cell shows (total, delta) for every resource on that turn. Green = gained, red = spent/lost.');
    return;
  }

  // -------------------- ACTIVITY --------------------
  if (postgameState.tab === 'activity') {
    const secTime = makeSection('Turn Time');

    const byPlayer = (stats && stats.turnTimes && stats.turnTimes.byPlayer) ? stats.turnTimes.byPlayer : null;
    if (!byPlayer) {
      secTime.appendChild(document.createTextNode('Turn timing data is unavailable for this match.'));
      ui.pgTabBody.appendChild(secTime);
      return;
    }

    const rowsRaw = players.map(p => {
      const tt = byPlayer[p.id] || {};
      return { p, turns: safeNum(tt.turns), totalMs: safeNum(tt.totalMs), avgMs: safeNum(tt.avgMs) };
    });

    const maxTurns = Math.max(1, ...rowsRaw.map(r => r.turns));
    const maxTotalMs = Math.max(1, ...rowsRaw.map(r => r.totalMs));

    const headers = ['Player','Turns','Total Time','Avg Turn'];
    const rows = rowsRaw.map(r => [
      playerCell(r.p),
      barNode(r.turns, maxTurns, r.p.color, r.turns, { alignRight: true, alpha: 0.14 }),
      barNode(r.totalMs, maxTotalMs, r.p.color, fmtMs(r.totalMs), { alignRight: true, alpha: 0.12 }),
      barNode(r.avgMs, Math.max(1, ...rowsRaw.map(x => x.avgMs)), r.p.color, fmtMs(r.avgMs), { alignRight: true, alpha: 0.10 }),
    ]);

    secTime.appendChild(makeTable(headers, rows));
    ui.pgTabBody.appendChild(secTime);

    const secActs = makeSection('Action Counts');

const actions = (stats && stats.actions && stats.actions.byPlayer) ? stats.actions.byPlayer : {};
const trades = (stats && stats.trades && stats.trades.byPlayer) ? stats.trades.byPlayer : {};
const dev = (stats && stats.dev && stats.dev.byPlayer) ? stats.dev.byPlayer : {};
const builds = (stats && stats.builds && stats.builds.byPlayer) ? stats.builds.byPlayer : {};
const rolls = (stats && stats.rolls && stats.rolls.byPlayer) ? stats.rolls.byPlayer : {};
const thieves = (stats && stats.thieves) ? stats.thieves : null;

const raw = players.map(p => {
  const ac = actions[p.id] || {};
  const tr = trades[p.id] || {};
  const dv = dev[p.id] || {};
  const bl = builds[p.id] || {};
  const rl = rolls[p.id] || {};

  const stolenFrom = thieves ? (
    safeNum(thieves.robber?.stolenFromByPlayer?.[p.id]) +
    safeNum(thieves.pirate?.stolenFromByPlayer?.[p.id])
  ) : 0;

  return {
    p,
    rolls: diceTotalFor(rl),
    settlements: safeNum(bl.settlement),
    cities: safeNum(bl.city),
    roads: safeNum(bl.road),
    ships: safeNum(bl.ship),
    shipMoves: safeNum(bl.ship_move),
    devPlayed: safeNum(dv.played),
    trades: safeNum(tr.bank) + safeNum(tr.player),
    robberMoves: safeNum(ac.robberMoves),
    pirateMoves: safeNum(ac.pirateMoves),
    robberSteals: safeNum(ac.robberSteals),
    pirateSteals: safeNum(ac.pirateSteals),
    stolenFrom,
    discards: safeNum(ac.discards),
  };
});

const max = {
  rolls: Math.max(1, ...raw.map(r => r.rolls)),
  settlement: Math.max(1, ...raw.map(r => r.settlements)),
  city: Math.max(1, ...raw.map(r => r.cities)),
  road: Math.max(1, ...raw.map(r => r.roads)),
  ship: Math.max(1, ...raw.map(r => r.ships)),
  shipMoves: Math.max(1, ...raw.map(r => r.shipMoves)),
  devPlayed: Math.max(1, ...raw.map(r => r.devPlayed)),
  trades: Math.max(1, ...raw.map(r => r.trades)),
  robberMoves: Math.max(1, ...raw.map(r => r.robberMoves)),
  pirateMoves: Math.max(1, ...raw.map(r => r.pirateMoves)),
  robberSteals: Math.max(1, ...raw.map(r => r.robberSteals)),
  pirateSteals: Math.max(1, ...raw.map(r => r.pirateSteals)),
  stolenFrom: Math.max(1, ...raw.map(r => r.stolenFrom)),
  discards: Math.max(1, ...raw.map(r => r.discards)),
};

const headers2 = ['Player','Rolls','S','C','R','Sh','Ship Moves','Dev Played','Trades','RM','PM','RS','PS','Stolen From','Discards'];
const rows2 = raw.map(r => [
  playerCell(r.p),
  barNode(r.rolls, max.rolls, r.p.color, r.rolls, { alignRight: true, alpha: 0.14 }),
  barNode(r.settlements, max.settlement, r.p.color, r.settlements, { alignRight: true, alpha: 0.10 }),
  barNode(r.cities, max.city, r.p.color, r.cities, { alignRight: true, alpha: 0.10 }),
  barNode(r.roads, max.road, r.p.color, r.roads, { alignRight: true, alpha: 0.10 }),
  barNode(r.ships, max.ship, r.p.color, r.ships, { alignRight: true, alpha: 0.10 }),
  barNode(r.shipMoves, max.shipMoves, r.p.color, r.shipMoves, { alignRight: true, alpha: 0.10 }),
  barNode(r.devPlayed, max.devPlayed, r.p.color, r.devPlayed, { alignRight: true, alpha: 0.10 }),
  barNode(r.trades, max.trades, r.p.color, r.trades, { alignRight: true, alpha: 0.10 }),
  barNode(r.robberMoves, max.robberMoves, r.p.color, r.robberMoves, { alignRight: true, alpha: 0.10 }),
  barNode(r.pirateMoves, max.pirateMoves, r.p.color, r.pirateMoves, { alignRight: true, alpha: 0.10 }),
  barNode(r.robberSteals, max.robberSteals, r.p.color, r.robberSteals, { alignRight: true, alpha: 0.10 }),
  barNode(r.pirateSteals, max.pirateSteals, r.p.color, r.pirateSteals, { alignRight: true, alpha: 0.10 }),
  barNode(r.stolenFrom, max.stolenFrom, r.p.color, r.stolenFrom, { alignRight: true, alpha: 0.10 }),
  barNode(r.discards, max.discards, r.p.color, r.discards, { alignRight: true, alpha: 0.10 }),
]);

secActs.appendChild(makeTable(headers2, rows2));
ui.pgTabBody.appendChild(secActs);
addNote('S=Settlements, C=Cities, R=Roads, Sh=Ships, RM/PM=Robber/Pirate Moves, RS/PS=Robber/Pirate Steals.');
return;
  }

  // -------------------- DEV CARDS --------------------
  if (postgameState.tab === 'devcards') {
    const controls = document.createElement('div');
    controls.className = 'pgControls';
    controls.appendChild(makePlayerSelect('Focus player', 'devFocusId', winnerId));

    const sec1 = makeSection('Dev Cards Overview');

    const byPlayer = (stats && stats.dev && stats.dev.byPlayer) ? stats.dev.byPlayer : null;
    if (!byPlayer) {
      sec1.appendChild(document.createTextNode('Dev card statistics are unavailable for this match.'));
      ui.pgTabBody.appendChild(sec1);
      return;
    }

    const raw = players.map(p => {
      const d = byPlayer[p.id] || {};
      const bought = safeNum(d.bought);
      const played = safeNum(d.played);
      const byType = d.playedByType || {};
      const knights = safeNum(byType.knight);
      const vp = safeNum(byType.victory_point);
      return { p, bought, played, knights, vp };
    });

    const maxBought = Math.max(1, ...raw.map(r => r.bought));
    const maxPlayed = Math.max(1, ...raw.map(r => r.played));
    const maxKnights = Math.max(1, ...raw.map(r => r.knights));

    const headers = ['Player','Bought','Played','Knights Played','VP Cards Played'];
    const rows = raw.map(r => [
      playerCell(r.p),
      barNode(r.bought, maxBought, r.p.color, r.bought, { alignRight: true, alpha: 0.14 }),
      barNode(r.played, maxPlayed, r.p.color, r.played, { alignRight: true, alpha: 0.12 }),
      barNode(r.knights, maxKnights, r.p.color, r.knights, { alignRight: true, alpha: 0.12 }),
      barNode(r.vp, Math.max(1, ...raw.map(x => x.vp)), r.p.color, r.vp, { alignRight: true, alpha: 0.10 }),
    ]);

    sec1.appendChild(makeTable(headers, rows));
    ui.pgTabBody.appendChild(sec1);

    const pid = postgameState.devFocusId || winnerId;
    const focus = players.find(pp => pp.id === pid) || players[0];
    const d = byPlayer[pid] || {};
    const types = [
      ['knight','Knight'],
      ['victory_point','Victory Point'],
      ['road_building','Road Building'],
      ['year_of_plenty','Year of Plenty'],
      ['invention','Year of Plenty'],
      ['monopoly','Monopoly'],
    ];

    const boughtByType = d.boughtByType || {};
    const playedByType = d.playedByType || {};

    const rowsT = [];
    let maxB = 1, maxP = 1;
    for (const [k,label] of types) {
      const b = safeNum(boughtByType[k]);
      const p = safeNum(playedByType[k]);
      if (b || p) {
        maxB = Math.max(maxB, b);
        maxP = Math.max(maxP, p);
      }
    }

    for (const [k,label] of types) {
      const b = safeNum(boughtByType[k]);
      const p = safeNum(playedByType[k]);
      if (!b && !p) continue;
      rowsT.push([
        label,
        barNode(b, maxB, focus.color, b, { alignRight: true, alpha: 0.12 }),
        barNode(p, maxP, focus.color, p, { alignRight: true, alpha: 0.12 }),
      ]);
    }

    const sec2 = makeSection('Focus: Breakdown by Type', controls);
    sec2.appendChild(makeTable(['Card Type','Bought','Played'], rowsT));
    ui.pgTabBody.appendChild(sec2);

    addNote('Dev stats are derived from purchases and plays tracked by the server.');
    return;
  }
}


function enterPostgame() {
  if (!ui.postgameOverlay) return;
  clearPostgameTimers();

  postgameState.active = true;
  postgameState.hidden = false;
  if (ui.pgShowBtn) ui.pgShowBtn.classList.add('hidden');

  setPostgameVisible(true);
  setPostgamePanelVisible(false);

  const winner = computeWinner(state);
  const wName = winner ? winner.name : 'Victory';
  if (ui.postgameSplashTitle) ui.postgameSplashTitle.textContent = `${wName} Victory!`;
  if (ui.postgameSplashSub) ui.postgameSplashSub.textContent = 'Calculating final results…';

  // After 2 seconds, switch to stats panel.
  postgameState.splashTimer = setTimeout(() => {
    if (!state || state.phase !== 'game-over') return;
    if (postgameState.hidden) return;
    setPostgamePanelVisible(true);
    refreshPostgameHeader();
    renderPostgameTab(postgameState.tab || 'summary');
  }, 2000);
}

function refreshPostgameHeader() {
  const st = postgameState.snapshot || state;
  if (!st) return;
  const winner = computeWinner(st);
  const wName = winner ? winner.name : '—';
  const turns = Number(st.turnNumber || 0);
  const dur = fmtMs(gameDurationMs(st));
  if (ui.pgWinnerLine) ui.pgWinnerLine.textContent = `${wName} Victory!`;
  if (ui.pgMetaLine) ui.pgMetaLine.textContent = `Turns: ${turns}   Time: ${dur}`;
}

function exitPostgame() {
  clearPostgameTimers();
  postgameState.active = false;
  postgameState.hidden = false;
  setPostgameVisible(false);
  if (ui.pgShowBtn) ui.pgShowBtn.classList.add('hidden');
}

// -------------------- History UI --------------------
function fmtDateTime(ms) {
  const t = Number(ms || 0);
  if (!t) return '—';
  const d = new Date(t);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  const hh = String(d.getHours()).padStart(2,'0');
  const mi = String(d.getMinutes()).padStart(2,'0');
  return `${yy}-${mm}-${dd} ${hh}:${mi}`;
}

function mapLabelFromRules(rules) {
  const r = rules || {};
  const mode = String(r.mapMode || r.mode || '').toLowerCase();
  const scenario = String(r.mapScenario || r.scenario || '').toLowerCase();
  if (mode === 'seafarers') {
    if (scenario) return `Seafarers / ${scenario.replaceAll('_',' ')}`;
    return 'Seafarers';
  }
  if (mode) return mode.replaceAll('_',' ');
  return '—';
}

function setHistoryVisible(visible) {
  historyState.active = !!visible;
  if (!ui.historyOverlay) return;
  ui.historyOverlay.classList.toggle('hidden', !historyState.active);
  if (historyState.active) renderHistory();
}

function openHistoryOverlay(tab) {
  historyState.tab = tab || 'games';
  historyState.loadingGames = true;
  historyState.loadingBoard = true;
  setHistoryVisible(true);
  requestHistoryData();
}

function closeHistoryOverlay() {
  setHistoryVisible(false);
}

function requestHistoryData() {
  if (!authUser) {
    historyState.loadingGames = false;
    historyState.loadingBoard = false;
    renderHistory();
    return;
  }
  try {
    send({ type: 'get_game_history', limit: 500 });
    send({ type: 'get_player_leaderboard' });
  } catch(_) {}
}

function renderHistory() {
  if (!ui.historyBody) return;

  // tab button state
  try {
    const tabs = ui.historyTabs ? ui.historyTabs.querySelectorAll('.hTab') : [];
    tabs.forEach(b => b.classList.toggle('active', b.dataset.tab === historyState.tab));
  } catch(_) {}

  if (ui.historySub) {
    const gN = Array.isArray(historyState.games) ? historyState.games.length : 0;
    const pN = Array.isArray(historyState.leaderboard) ? historyState.leaderboard.length : 0;
    ui.historySub.textContent = authUser ? `${gN} games • ${pN} players` : 'Log in to view your server history';
  }

  ui.historyBody.innerHTML = '';

  if (!authUser) {
    const d = document.createElement('div');
    d.className = 'hint';
    d.textContent = 'Log in to view game history and player stats.';
    ui.historyBody.appendChild(d);
    return;
  }

  if (historyState.tab === 'players') renderLeaderboardTab();
  else renderGamesHistoryTab();
}

function renderGamesHistoryTab() {
  const wrap = document.createElement('div');
  wrap.className = 'historyList';

  const games = Array.isArray(historyState.games) ? historyState.games : [];
  if (historyState.loadingGames) {
    const h = document.createElement('div');
    h.className = 'hint';
    h.textContent = 'Loading…';
    wrap.appendChild(h);
  } else if (!games.length) {
    const h = document.createElement('div');
    h.className = 'hint';
    h.textContent = 'No completed games in history yet.';
    wrap.appendChild(h);
  } else {
    for (const g of games) {
      const card = document.createElement('div');
      card.className = 'historyCard';

      const meta = document.createElement('div');
      meta.className = 'historyMeta';

      const pLine = (Array.isArray(g.players) ? g.players : []).map(p => `${p.name} (${p.vp})`).join(' • ');
      const line1 = document.createElement('div');
      line1.className = 'historyLine1';
      const w = g.winnerName ? `${g.winnerName} won` : 'Completed game';
      line1.textContent = `${w} — ${pLine || '—'}`;

      const line2 = document.createElement('div');
      line2.className = 'historyLine2';
      line2.textContent = `${fmtDateTime(g.endedAt)}  •  Turns: ${Number(g.turns || 0)}  •  ${mapLabelFromRules(g.rules)}`;

      meta.appendChild(line1);
      meta.appendChild(line2);

      const actions = document.createElement('div');
      actions.className = 'historyActions';
      const viewBtn = document.createElement('button');
      viewBtn.className = 'btn primary';
      viewBtn.textContent = 'View Summary';
      viewBtn.addEventListener('click', () => {
        if (!g.id) return;
        try { send({ type: 'get_game_history_entry', id: g.id }); } catch(_) {}
      });

      actions.appendChild(viewBtn);

      card.appendChild(meta);
      card.appendChild(actions);
      wrap.appendChild(card);
    }
  }

  ui.historyBody.appendChild(wrap);
}

function sortLeaderboardRows(rows) {
  const key = historyState.sortKey || 'wins';
  const dir = historyState.sortDir === 'asc' ? 1 : -1;

  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const str = (v) => String(v || '').toLowerCase();

  const sorted = rows.slice().sort((a,b) => {
    if (key === 'name') return str(a.name).localeCompare(str(b.name)) * dir;
    return (num(a[key]) - num(b[key])) * dir;
  });

  return sorted;
}

function setLeaderboardSort(key) {
  if (historyState.sortKey === key) {
    historyState.sortDir = (historyState.sortDir === 'asc') ? 'desc' : 'asc';
  } else {
    historyState.sortKey = key;
    historyState.sortDir = 'desc';
  }
  renderHistory();
}

function renderLeaderboardTab() {
  const rows = Array.isArray(historyState.leaderboard) ? historyState.leaderboard : [];

  if (historyState.loadingBoard) {
    const h = document.createElement('div');
    h.className = 'hint';
    h.textContent = 'Loading…';
    ui.historyBody.appendChild(h);
    return;
  }

  if (!rows.length) {
    const h = document.createElement('div');
    h.className = 'hint';
    h.textContent = 'No player stats yet (finish at least one game).';
    ui.historyBody.appendChild(h);
    return;
  }

  const sorted = sortLeaderboardRows(rows);

  const wrap = document.createElement('div');
  wrap.style.overflow = 'auto';

  const table = document.createElement('table');
  table.className = 'standingsTable';

  const thead = document.createElement('thead');
  const trh = document.createElement('tr');

  const columns = [
    { key: 'name', label: 'Player' },
    { key: 'gamesPlayed', label: 'GP' },
    { key: 'wins', label: 'W' },
    { key: 'losses', label: 'L' },
    { key: 'winPct', label: 'WIN%' },
    { key: 'avgVP', label: 'AVG VP' },
    { key: 'totalVP', label: 'VP' },
    { key: 'avgTurnSec', label: 'AVG TURN (s)' },
    { key: 'roads', label: 'Roads' },
    { key: 'ships', label: 'Ships' },
    { key: 'settlements', label: 'Sett' },
    { key: 'cities', label: 'Cities' },
    { key: 'devBought', label: 'Dev+' },
    { key: 'devPlayed', label: 'Dev▶' },
    { key: 'resGained', label: 'Res+' },
    { key: 'resLost', label: 'Res-' },
  ];

  for (const c of columns) {
    const th = document.createElement('th');
    th.textContent = c.label;
    th.addEventListener('click', () => setLeaderboardSort(c.key));
    if (historyState.sortKey === c.key) th.classList.add(historyState.sortDir === 'asc' ? 'sortAsc' : 'sortDesc');
    trh.appendChild(th);
  }

  thead.appendChild(trh);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  let rank = 1;
  for (const r of sorted) {
    const tr = document.createElement('tr');

    const tdName = document.createElement('td');
    const nameWrap = document.createElement('div');
    nameWrap.className = 'standName';
    const dot = document.createElement('div');
    dot.className = 'standDot';
    dot.style.background = r.color || '#777';
    const nm = document.createElement('div');
    nm.className = 'standNameText';
    nm.textContent = `${rank}. ${r.name || r.username || r.id || '—'}`;
    nameWrap.appendChild(dot);
    nameWrap.appendChild(nm);
    tdName.appendChild(nameWrap);
    tr.appendChild(tdName);

    const add = (v) => {
      const td = document.createElement('td');
      td.textContent = String(v);
      tr.appendChild(td);
    };

    add(r.gamesPlayed);
    add(r.wins);
    add(r.losses);
    add((Number(r.winPct || 0) * 100).toFixed(1));
    add(Number(r.avgVP || 0).toFixed(2));
    add(r.totalVP);
    add(Number(r.avgTurnSec || 0).toFixed(1));
    add(r.roads);
    add(r.ships);
    add(r.settlements);
    add(r.cities);
    add(r.devBought);
    add(r.devPlayed);
    add(r.resGained);
    add(r.resLost);

    tbody.appendChild(tr);
    rank += 1;
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  ui.historyBody.appendChild(wrap);
}

function openPostgameSnapshot(snapshot) {
  if (!snapshot) return;
  clearPostgameTimers();

  postgameState.snapshot = snapshot;
  postgameState.historyMode = true;
  postgameState.hidden = false;
  postgameState.active = true;

  if (ui.pgShowBtn) ui.pgShowBtn.classList.add('hidden');
  if (ui.pgMainMenuBtn) ui.pgMainMenuBtn.textContent = 'Back';
  if (ui.pgHideBtn) ui.pgHideBtn.textContent = 'Close';

  setPostgameVisible(true);
  setPostgamePanelVisible(true);

  refreshPostgameHeader();
  renderPostgameTab('summary');
}

function closePostgameSnapshot() {
  postgameState.snapshot = null;
  postgameState.historyMode = false;
  clearPostgameTimers();
  setPostgameVisible(false);
  if (ui.pgMainMenuBtn) ui.pgMainMenuBtn.textContent = 'Main Menu';
  if (ui.pgHideBtn) ui.pgHideBtn.textContent = 'Hide Stats';
  try { if (ui.pgShowBtn) ui.pgShowBtn.classList.add('hidden'); } catch(_) {}
}

function syncPostgameToState() {
  if (postgameState.historyMode) return;
  if (!state) { exitPostgame(); return; }
  const phase = state.phase;
  if (phase === 'game-over') {
    if (!postgameState.active) {
      enterPostgame();
    } else {
      // keep header fresh
      if (!postgameState.hidden && !ui.postgamePanel?.classList.contains('hidden')) {
        refreshPostgameHeader();
        renderPostgameTab(postgameState.tab || 'summary');
      }
    }
  } else {
    if (postgameState.active) exitPostgame();
  }
  postgameState.lastPhase = phase;
}

  function defaultVictoryPointsFor(rules) {
    const mmRaw = String(rules?.mapMode || 'classic').toLowerCase();
    // UI can use a synthetic mapMode 'seafarers56' to represent 5–6 player Seafarers scenarios.
    const mm = (mmRaw === 'seafarers56') ? 'seafarers' : mmRaw;
    const scen = (mmRaw === 'seafarers56')
      ? String(rules?.seafarersScenario56 || rules?.seafarersScenario || 'six_islands').toLowerCase()
      : String(rules?.seafarersScenario || 'four_islands').toLowerCase();
    if (mm !== 'seafarers') return 10;
    if (scen === 'fog_island' || scen === 'fog-island' || scen === 'fog' || scen === 'fog_island_56') return 12;
    if (scen === 'through_the_desert' || scen === 'through-the-desert' || scen === 'desert' || scen === 'through_the_desert_56') return 14;
    if (scen === 'heading_for_new_shores' || scen === 'heading-for-new-shores' || scen === 'new_shores' || scen === 'newshores' || scen === 'heading') return 14;
    if (scen === 'six_islands' || scen === 'six-islands' || scen === 'sixislands' || scen === 'six') return 14;
    return 13; // four islands
  }

  function uiMapModeFromRules(rules) {
    const mm = String(rules?.mapMode || 'classic').toLowerCase();
    const scen = String(rules?.seafarersScenario || 'four_islands').toLowerCase().replace(/-/g,'_');
    if (mm === 'seafarers' && (scen === 'six_islands' || scen === 'through_the_desert_56' || scen === 'fog_island_56')) return 'seafarers56';
    return rules?.mapMode || 'classic';
  }

  function uiIsSixIslands(rulesOrSelection) {
    const mm = String(rulesOrSelection?.mapMode || 'classic').toLowerCase();
    if (mm === 'seafarers56') return true;
    const scen = String(rulesOrSelection?.seafarersScenario || 'four_islands').toLowerCase().replace(/-/g,'_');
    return (mm === 'seafarers' && (scen === 'six_islands' || scen === 'through_the_desert_56' || scen === 'fog_island_56'));
  }

  // -------------------- Structure sprites (settlement/city/road/ship) --------------------

  const STRUCT = {
    imgs: [new Image(), new Image(), new Image(), new Image(), new Image(), new Image(), new Image(), new Image()],
    ready: false,
    tile: 512,
    loaded: 0,
  };

  const STRUCT_IMG_SRC = ['tokens_red.png', 'tokens_blue.png', 'tokens_green.png', 'tokens_yellow.png', 'tokens_purple.png', 'tokens_teal.png', 'tokens_white.png', 'tokens_orange.png'];

  const STRUCT_CELL = {
    settlement: { r: 0, c: 0 },
    city: { r: 0, c: 1 },
    road: { r: 1, c: 0 },
    ship: { r: 1, c: 1 },
  };

  try {
    STRUCT.imgs.forEach((img, idx) => {
      img.src = STRUCT_IMG_SRC[idx];
      img.onload = () => {
        STRUCT.loaded++;
        const w = img.naturalWidth || img.width || 1024;
        STRUCT.tile = Math.max(1, Math.floor(w / 2)); // 2x2 grid
        STRUCT.ready = true; // at least one sprite loaded
        try { render(); } catch (_) {}
      };
    });
  } catch (_) {}

  function playerColorIndex(color) {
    const c = String(color || '').toLowerCase();
    if (c === '#e74c3c') return 0; // red
    if (c === '#3498db') return 1; // blue
    if (c === '#2ecc71') return 2; // green
    if (c === '#f1c40f') return 3; // yellow
    if (c === '#8000f8') return 4; // purple
    if (c === '#88f8f8') return 5; // teal
    if (c === '#f8f8f8' || c === '#ffffff') return 6; // white
    if (c === '#f86800') return 7; // orange
    return 0;
  }

  function tokenBgPosPct(kind) {
    const cell = STRUCT_CELL[kind] || STRUCT_CELL.settlement;
    return { x: cell.c * 100, y: cell.r * 100 };
  }

  // -------------------- HUD docking (board overlays) -------------------- (board overlays) --------------------

  const hudDock = {
    isDocked: false,
    originals: null,
    builtTurnHud: false,
    builtToolsHud: false,
    movedDevInline: false,
  };

  function rememberOriginal(el) {
    return {
      parent: el && el.parentNode ? el.parentNode : null,
      next: el && el.parentNode ? el.nextSibling : null,
    };
  }

  function restoreOriginal(el, rec) {
    if (!el || !rec || !rec.parent) return;
    if (rec.next && rec.next.parentNode === rec.parent) rec.parent.insertBefore(el, rec.next);
    else rec.parent.appendChild(el);
  }

  function buildToolsHudOnce() {
    if (!ui.toolsCard || hudDock.builtToolsHud) return;
    hudDock.builtToolsHud = true;

    const card = ui.toolsCard;
    card.innerHTML = '';

    const row = document.createElement('div');
    row.className = 'hudBarRow';

    const grip = document.createElement('div');
    grip.className = 'dragGrip';
    grip.textContent = '⋮⋮';
    row.appendChild(grip);

    const conn = document.createElement('div');
    conn.className = 'hudConn connInline connTight';
    if (ui.connDot) conn.appendChild(ui.connDot);
    if (ui.connText) conn.appendChild(ui.connText);
    row.appendChild(conn);

    const btns = document.createElement('div');
    btns.className = 'hudBtns';
    // In-game: keep the same tools as the lobby, but in a compact HUD bar.
    // The user expects Rules to be available in-game next to Game Log.
    for (const b of [ui.logBtn, ui.rulesBtn, ui.diceBtn, ui.chatBtn, ui.endGameVoteBtn, ui.idsBtn]) {
      if (!b) continue;
      b.classList.add('btnTiny');
      btns.appendChild(b);
    }
    row.appendChild(btns);

    card.appendChild(row);
  }

  function buildTurnHudOnce() {
    if (!ui.turnCard || hudDock.builtTurnHud) return;
    hudDock.builtTurnHud = true;

    const card = ui.turnCard;
    card.innerHTML = '';

    const row = document.createElement('div');
    row.className = 'hudBarRow';

    const grip = document.createElement('div');
    grip.className = 'dragGrip';
    grip.textContent = '⋮⋮';
    row.appendChild(grip);

    const info = document.createElement('div');
    info.className = 'hudTurnInfo';
    if (ui.turnInfo) info.appendChild(ui.turnInfo);
    if (ui.timerInfo) info.appendChild(ui.timerInfo);
    row.appendChild(info);

    const actions = document.createElement('div');
    actions.className = 'hudBtns';
    const order = [
      ui.rollBtn,
      ui.endBtn,
      ui.buildRoadBtn,
      ui.buildShipBtn,
      ui.moveShipBtn,
      ui.buildSettlementBtn,
      ui.buildCityBtn,
      ui.bankTradeBtn,
      ui.playerTradeBtn,
      ui.pauseBtn,
    ];
    for (const b of order) {
      if (!b) continue;
      b.classList.add('btnTiny');
      actions.appendChild(b);
    }
    row.appendChild(actions);

    const dev = document.createElement('div');
    dev.className = 'hudDev';
    if (ui.devRemaining) dev.appendChild(ui.devRemaining);
    if (ui.buyDevBtn) {
      ui.buyDevBtn.classList.add('btnTiny');
      dev.appendChild(ui.buyDevBtn);
    }
    row.appendChild(dev);

    card.appendChild(row);
  }

  function dockHudToBoard(inGame) {
    const panel = document.querySelector('section.panel');
    const boardWrap = document.querySelector('section.boardWrap');
    if (!panel || !boardWrap) return;

    if (inGame && !hudDock.isDocked) {
      hudDock.isDocked = true;
      hudDock.originals = {
        tools: ui.toolsCard ? rememberOriginal(ui.toolsCard) : null,
        turn: ui.turnCard ? rememberOriginal(ui.turnCard) : null,
        dev: ui.devCard ? rememberOriginal(ui.devCard) : null,
        dock: ui.rollDock ? rememberOriginal(ui.rollDock) : null,
      };

      buildToolsHudOnce();
      buildTurnHudOnce();

      if (ui.toolsCard) {
        ui.toolsCard.classList.add('hudBar', 'hudTopLeft');
        boardWrap.appendChild(ui.toolsCard);
        // Drag handle lives inside the HUD bar so button clicks don't start dragging.
        try {
          const grip = ui.toolsCard.querySelector('.dragGrip');
          if (grip && !ui.toolsCard.dataset.dragReady) {
            makeDraggablePanel(ui.toolsCard, grip, 'hexsettlers_tools_pos_v2');
            ui.toolsCard.dataset.dragReady = '1';
          }
        } catch (_) {}
      }
      if (ui.turnCard) {
        ui.turnCard.classList.add('hudBar', 'hudBottomLeft');
        boardWrap.appendChild(ui.turnCard);
        try {
          const grip = ui.turnCard.querySelector('.dragGrip');
          if (grip && !ui.turnCard.dataset.dragReady) {
            makeDraggablePanel(ui.turnCard, grip, 'hexsettlers_turn_pos_v2');
            ui.turnCard.dataset.dragReady = '1';
          }
        } catch (_) {}
      }
      if (ui.devCard) {
        ui.devCard.classList.add('hudDevOverlay');
        boardWrap.appendChild(ui.devCard);
        try {
          const handle = ui.devCard.querySelector('h2');
          if (handle && !ui.devCard.dataset.dragReady) {
            makeDraggablePanel(ui.devCard, handle, 'hexsettlers_dev_pos_v2');
            ui.devCard.dataset.dragReady = '1';
          }
        } catch (_) {}
      }
      if (ui.rollDock) {
        ui.rollDock.classList.add('hudRollDock');
        boardWrap.appendChild(ui.rollDock);
      }
    }

    if (!inGame && hudDock.isDocked) {
      hudDock.isDocked = false;
      if (ui.toolsCard) ui.toolsCard.classList.remove('hudBar', 'hudTopLeft');
      if (ui.turnCard) ui.turnCard.classList.remove('hudBar', 'hudBottomLeft');
      if (ui.devCard) ui.devCard.classList.remove('hudDevOverlay');
      if (ui.rollDock) ui.rollDock.classList.remove('hudRollDock');

      // When undocking back to the side panel, clear fixed positioning so the layout is normal.
      for (const el of [ui.toolsCard, ui.turnCard, ui.devCard]) {
        if (!el) continue;
        el.style.position = '';
        el.style.left = '';
        el.style.top = '';
        el.style.right = '';
        el.style.bottom = '';
      }

      restoreOriginal(ui.toolsCard, hudDock.originals?.tools);
      restoreOriginal(ui.turnCard, hudDock.originals?.turn);
      restoreOriginal(ui.devCard, hudDock.originals?.dev);
      restoreOriginal(ui.rollDock, hudDock.originals?.dock);
    }
  }

  // Make a floating panel draggable (pointer-based, desktop + touch).
  function makeDraggablePanel(panelEl, handleEl, storageKey) {
    if (!panelEl || !handleEl) return;

    handleEl.style.cursor = 'grab';
    handleEl.style.userSelect = 'none';
    handleEl.style.touchAction = 'none';

    // Restore saved position.
    try {
      if (storageKey) {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const p = JSON.parse(raw);
          if (p && typeof p.left === 'number' && typeof p.top === 'number') {
            panelEl.style.position = 'fixed';
            panelEl.style.left = p.left + 'px';
            panelEl.style.top = p.top + 'px';
            panelEl.style.right = 'auto';
            panelEl.style.bottom = 'auto';
          }
        }
      }
    } catch (_) {}

    let dragging = false;
    let startX = 0, startY = 0;
    let startLeft = 0, startTop = 0;

    function clamp(v, lo, hi) {
      return Math.max(lo, Math.min(hi, v));
    }

    handleEl.addEventListener('pointerdown', (ev) => {
      if (ev.button != null && ev.button !== 0) return;
      dragging = true;
      handleEl.style.cursor = 'grabbing';
      const r = panelEl.getBoundingClientRect();
      panelEl.style.position = 'fixed';
      panelEl.style.left = r.left + 'px';
      panelEl.style.top = r.top + 'px';
      panelEl.style.right = 'auto';
      panelEl.style.bottom = 'auto';
      startLeft = r.left;
      startTop = r.top;
      startX = ev.clientX;
      startY = ev.clientY;
      try { handleEl.setPointerCapture(ev.pointerId); } catch (_) {}
      ev.preventDefault();
    });

    handleEl.addEventListener('pointermove', (ev) => {
      if (!dragging) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const r = panelEl.getBoundingClientRect();
      const maxLeft = window.innerWidth - r.width - 6;
      const maxTop = window.innerHeight - r.height - 6;
      const left = clamp(startLeft + dx, 6, maxLeft);
      const top = clamp(startTop + dy, 6, maxTop);
      panelEl.style.left = left + 'px';
      panelEl.style.top = top + 'px';
      if (storageKey) {
        try { localStorage.setItem(storageKey, JSON.stringify({ left, top })); } catch (_) {}
      }
    });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      handleEl.style.cursor = 'grab';
    }

    handleEl.addEventListener('pointerup', endDrag);
    handleEl.addEventListener('pointercancel', endDrag);
  }

  // Build popup (context menu) for click-to-build.
  let buildPopup = null;
  let pendingBuildClick = null; // { absX, absY, targetKind, targetId }

  function ensureBuildPopup() {
    if (buildPopup) return;
    buildPopup = document.createElement('div');
    buildPopup.className = 'buildPopup hidden';
    buildPopup.innerHTML = `
      <div class="buildPopupTitle">Build</div>
      <div class="buildPopupBtns" id="buildPopupBtns"></div>
    `;
    document.body.appendChild(buildPopup);

    // Close on outside click
    document.addEventListener('mousedown', (ev) => {
      if (!buildPopup || buildPopup.classList.contains('hidden')) return;
      if (ev.target === buildPopup || buildPopup.contains(ev.target)) return;
      hideBuildPopup();
    });
    window.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') hideBuildPopup();
    });
  }

  function hideBuildPopup() {
    if (!buildPopup) return;
    buildPopup.classList.add('hidden');
    buildPopup.style.left = '-9999px';
    buildPopup.style.top = '-9999px';
    pendingBuildClick = null;
  }

  function showBuildPopup(absX, absY, options, onPick) {
    ensureBuildPopup();
    const btnWrap = buildPopup.querySelector('#buildPopupBtns');
    btnWrap.innerHTML = '';

    for (const opt of options) {
      const b = document.createElement('button');
      b.className = 'choiceBtn';
      b.textContent = opt.label || opt.kind;
      b.addEventListener('click', () => {
        hideBuildPopup();
        onPick(opt);
      });
      btnWrap.appendChild(b);
    }

    // Position near cursor, keep on-screen.
    buildPopup.classList.remove('hidden');
    buildPopup.style.left = `${Math.round(absX)}px`;
    buildPopup.style.top = `${Math.round(absY)}px`;

    const r = buildPopup.getBoundingClientRect();
    const pad = 8;
    let nx = absX;
    let ny = absY;
    if (r.right > window.innerWidth - pad) nx = Math.max(pad, window.innerWidth - pad - r.width);
    if (r.bottom > window.innerHeight - pad) ny = Math.max(pad, window.innerHeight - pad - r.height);
    if (nx !== absX || ny !== absY) {
      buildPopup.style.left = `${Math.round(nx)}px`;
      buildPopup.style.top = `${Math.round(ny)}px`;
    }
  }

  // HiDPI canvas
  function resizeCanvas() {
    const rect = ui.canvas.getBoundingClientRect();
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    ui.canvas.width = Math.floor(rect.width * dpr);
    ui.canvas.height = Math.floor((rect.height) * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', () => { resizeCanvas(); render(); });
  resizeCanvas();

  // Allow the Resources panel to be moved freely.
  try {
    const handle = ui.resourcesCard ? ui.resourcesCard.querySelector('h2') : null;
    makeDraggablePanel(ui.resourcesCard, handle, 'hexsettlers_resources_pos_v2');
  } catch (_) {}

  // Allow the Game Log panel to be moved freely.
  try {
    const handle = ui.logCard ? ui.logCard.querySelector('h2') : null;
    makeDraggablePanel(ui.logCard, handle, 'hexsettlers_log_pos_v2');
  } catch (_) {}

  // Allow the top-right timer/pause HUD to be moved freely.
  try {
    const rh = document.querySelector('.rightHud');
    if (rh) {
      let grip = rh.querySelector('.dragGrip');
      if (!grip) {
        grip = document.createElement('div');
        grip.className = 'dragGrip';
        grip.textContent = '⋮⋮';
        grip.style.marginBottom = '6px';
        rh.insertBefore(grip, rh.firstChild);
      }
      if (!rh.dataset.dragReady) {
        makeDraggablePanel(rh, grip, 'hexsettlers_rightHud_pos_v2');
        rh.dataset.dragReady = '1';
      }
    }
  } catch (_) {}

  // Pan/zoom
  const view = { scale: 150, ox: 0, oy: 0, dragging: false, lastX: 0, lastY: 0 };
  ui.canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = -Math.sign(e.deltaY);
    const factor = delta > 0 ? 1.08 : 0.92;
    // Allow much further zoom out (and a bit further in).
    // Allow zooming further out/in.
    view.scale = clamp(view.scale * factor, 10, 800);
    render();
  }, { passive: false });

  ui.canvas.addEventListener('mousedown', (e) => {
    hideBuildPopup();
    view.dragging = true;
    view.lastX = e.clientX;
    view.lastY = e.clientY;
  });
  window.addEventListener('mouseup', () => view.dragging = false);
  window.addEventListener('mousemove', (e) => {
    if (!view.dragging) return;
    const dx = e.clientX - view.lastX;
    const dy = e.clientY - view.lastY;
    view.lastX = e.clientX;
    view.lastY = e.clientY;
    view.ox += dx;
    view.oy += dy;
    render();
  });

  // Networking
  let ws = null;
  let myPlayerId = null;
  let room = null;
  let state = null;
  let isHost = false;
  let lastEventIdSeen = 0;
  let serverTimeOffsetMs = 0;
  let timerUiInterval = null;
  let modalLocked = false;
  let modalType = null;
  let activeToolModal = null; // 'log' | 'dice' | 'chat'
  let chatRefs = null;
  let lastDiscardPromptId = 0;
  let lastStealPromptId = 0;
  let lastPirateStealPromptId = 0;
  let lastPirateChoicePromptId = 0;
  let lastTileCountForView = 0;
  // Track canvas CSS size so we can resync the backing store when the layout changes
  // (e.g., when the game transitions into full-screen board mode). Without this,
  // some browsers can end up with mismatched hit-testing until the next real resize.
  let lastCanvasSizeKey = '';

  // Game Log panel (toggleable overlay)
  let logPanelOpen = false;
  try {
    logPanelOpen = localStorage.getItem('hexsettlers_log_open_v1') === '1';
  } catch (_) {}

  const images = {};
  const TILE_IMG = {
    desert: 'assets/Desert.png',
    field: 'assets/Field.png',
    forest: 'assets/Forest.png',
    gold: 'assets/GoldFields.png',
    hills: 'assets/Hills.png',
    mountains: 'assets/Mountains.png',
    pasture: 'assets/Pasture.png',
    sea: 'assets/Seas.png',
    unexplored: 'assets/Unexplored.png',
  };

  const DEV_IMG = {
    knight: 'assets/devcards/Knight.png',
    road_building: 'assets/devcards/RoadBuilding.png',
    invention: 'assets/devcards/Invention.png',
    monopoly: 'assets/devcards/Monopoly.png',
    victory_point: 'assets/devcards/VictoryPoint.png',
  };


  const NUM_TOKEN_IMG = {
    2: 'assets/num/2.png',
    3: 'assets/num/3.png',
    4: 'assets/num/4.png',
    5: 'assets/num/5.png',
    6: 'assets/num/6.png',
    8: 'assets/num/8.png',
    9: 'assets/num/9.png',
    10: 'assets/num/10.png',
    11: 'assets/num/11.png',
    12: 'assets/num/12.png',
  };

  const PORT_IMG = {
    generic: 'assets/ports/generic.png',
    brick: 'assets/ports/brick.png',
    lumber: 'assets/ports/lumber.png',
    wool: 'assets/ports/wool.png',
    grain: 'assets/ports/grain.png',
    ore: 'assets/ports/ore.png',
  };

  const THIEF_IMG = {
    robber: 'assets/thief_robber.png',
    pirate: 'assets/thief_pirate.png',
  };


  // Turn notification sound (played only for the active player when it's time to roll)
  const turnBell = new Audio('assets/sfx/turn_bell.wav');
  turnBell.preload = 'auto';
  turnBell.volume = 0.85;
  let lastBellTurnNumber = -1;


  // --- Shared SFX (broadcast by server; played locally on all clients) ---
  function makeSfxPool(src, volume = 0.9, poolSize = 4) {
    const pool = [];
    for (let i = 0; i < poolSize; i++) {
      const a = new Audio(src);
      a.preload = 'auto';
      a.volume = volume;
      pool.push(a);
    }
    let idx = 0;
    return {
      play() {
        const a = pool[idx++ % pool.length];
        try { a.currentTime = 0; } catch (_) {}
        const p = a.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      },
      prime() {
        for (const a of pool) {
          try {
            const p = a.play();
            if (p && typeof p.then === 'function') {
              p.then(() => { try { a.pause(); a.currentTime = 0; } catch (_) {} }).catch(() => {});
            }
          } catch (_) {}
        }
      }
    };
  }

  const sfx = {
    dice_roll: makeSfxPool('assets/sfx/dice_roll.wav', 0.9, 4),
    robber_pirate: makeSfxPool('assets/sfx/robber_pirate.wav', 0.9, 3),
    structure: makeSfxPool('assets/sfx/structure.wav', 0.85, 4),
    end_turn: makeSfxPool('assets/sfx/end_turn.wav', 0.9, 2),
  };

  let sfxUnlocked = false;
  function unlockSfxOnce() {
    if (sfxUnlocked) return;
    sfxUnlocked = true;
    try { Object.values(sfx).forEach(x => x.prime()); } catch (_) {}
  }
  window.addEventListener('pointerdown', unlockSfxOnce, { once: true, passive: true });
  window.addEventListener('keydown', unlockSfxOnce, { once: true });

  function playSfx(name) {
    const key = String(name || '').toLowerCase();
    const snd = sfx[key];
    if (!snd) return;
    snd.play();
  }

  // End-of-turn warning (played 6s before auto end-turn)
  let endTurnWarnTimeout = null;
  let lastEndTurnWarnKey = null;

  function clearEndTurnWarn() {
    if (endTurnWarnTimeout) {
      clearTimeout(endTurnWarnTimeout);
      endTurnWarnTimeout = null;
    }
  }

  function scheduleEndTurnWarn() {
    clearEndTurnWarn();
    try {
      if (!state || state.paused) return;
      if (state.phase !== 'main-actions') return;
      const t = state.timer;
      if (!t || !t.endsAt) return;

      const endsAt = Number(t.endsAt);
      const key = `${state.turnNumber || 0}:${state.currentPlayerId || ''}:${endsAt}`;
      if (lastEndTurnWarnKey === key) return;

      const nowMs = serverNowMs();
      const remainingMs = endsAt - nowMs;
      if (remainingMs <= 0) return;

      const warnAtMs = endsAt - 6000;
      const delay = warnAtMs - nowMs;

      if (delay <= 0) {
        // Already inside the last 6 seconds window; play immediately (once).
        lastEndTurnWarnKey = key;
        playSfx('end_turn');
        return;
      }

      endTurnWarnTimeout = setTimeout(() => {
        // Re-check current state hasn't moved on.
        try {
          if (!state || state.paused) return;
          if (state.phase !== 'main-actions') return;
          if (!state.timer || Number(state.timer.endsAt) !== endsAt) return;
          const curKey = `${state.turnNumber || 0}:${state.currentPlayerId || ''}:${endsAt}`;
          if (lastEndTurnWarnKey === curKey) return;
          lastEndTurnWarnKey = curKey;
          playSfx('end_turn');
        } catch (_) {}
      }, Math.max(0, delay));
    } catch (_) {}
  }


  function setError(msg) {
    if (!msg) {
      ui.errBox.classList.add('hidden');
      ui.errBox.textContent = '';
      return;
    }
    ui.errBox.classList.remove('hidden');
    ui.errBox.textContent = msg;
  }

  function setConn(ok, text) {
    ui.connDot.classList.toggle('ok', !!ok);
    ui.connDot.classList.toggle('bad', !ok);
    ui.connText.textContent = text || (ok ? 'Connected' : 'Disconnected');
  }

  function toast(msg) {
    if (!msg) return;
    // Don't stomp a real error.
    if (!ui.errBox.classList.contains('hidden')) return;
    setError(msg);
    setTimeout(() => {
      if (ui.errBox.textContent === msg) setError(null);
    }, 900);
  }

  async function copyText(text) {
    const t = String(text || '');
    if (!t) return;
    try {
      await navigator.clipboard.writeText(t);
      toast('Copied.');
    } catch (e) {
      // Clipboard may be blocked; fall back to prompt.
      window.prompt('Copy to clipboard:', t);
    }
  }

  function connect() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${location.host}/ws`;
    ws = new WebSocket(url);

    ws.addEventListener('open', () => {
      setConn(true, 'Connected');
      setError(null);
      // Try auto-login with a saved token (allows login from any device/server instance).
      pendingAutoRejoin = true;
      let t = null;
      try { t = localStorage.getItem(AUTH_TOKEN_KEY); } catch (_) { t = null; }
      if (t) {
        send({ type: 'auth_token', token: t });
      } else {
        updateAuthUi();
      }
    });

    ws.addEventListener('close', () => {
      setConn(false, 'Disconnected');
      // simple retry
      setTimeout(connect, 1200);
    });

    ws.addEventListener('message', (ev) => {
      let msg = null;
      try { msg = JSON.parse(ev.data); } catch { return; }
      if (!msg || !msg.type) return;

      if (msg.type === 'build_options') {
        // Response to a click-to-build query.
        const tk = msg.targetKind;
        const tid = msg.targetId;
        const opts = Array.isArray(msg.options) ? msg.options : [];
        if (!pendingBuildClick) return;
        if (pendingBuildClick.targetKind !== tk || pendingBuildClick.targetId !== tid) return;

        if (!opts.length) {
          hideBuildPopup();
          return;
        }

        const doAction = (opt) => {
          if (!opt || !opt.kind) return;
          if (opt.kind === 'place_settlement' || opt.kind === 'upgrade_city') {
            sendGameAction({ kind: opt.kind, nodeId: tid });
          } else if (opt.kind === 'place_road' || opt.kind === 'place_ship') {
            sendGameAction({ kind: opt.kind, edgeId: tid });
          }
        };

        if (opts.length === 1) {
          hideBuildPopup();
          doAction(opts[0]);
          return;
        }

        showBuildPopup(pendingBuildClick.absX, pendingBuildClick.absY, opts, doAction);
        return;
      }

      if (msg.type === 'sfx') {
        playSfx(msg.name);
        return;
      }

      if (msg.type === 'error') {
        const e = msg.error || 'Error';
        setError(e);
        // If a rematch attempt failed, re-enable the postgame Main Menu button.
        try {
          if (ui.pgMainMenuBtn) {
            ui.pgMainMenuBtn.disabled = false;
            ui.pgMainMenuBtn.textContent = postgameState.historyMode ? 'Back' : 'Main Menu';
          }
        } catch (_) {}
        try {
          if (/room (not found|expired)/i.test(e)) localStorage.removeItem(LAST_ROOM_KEY);
        } catch (_) {}
        updateAuthUi();
        return;
      }


      if (msg.type === 'game_history_list') {
        historyState.games = Array.isArray(msg.games) ? msg.games : [];
        historyState.loadingGames = false;
        if (historyState.active) renderHistory();
        return;
      }

      if (msg.type === 'game_history_entry') {
        const g = msg.game || null;
        const snap = g && (g.snapshot || g);
        openPostgameSnapshot(snap);
        return;
      }

      if (msg.type === 'player_leaderboard') {
        historyState.leaderboard = Array.isArray(msg.rows) ? msg.rows : [];
        historyState.loadingBoard = false;
        if (historyState.active) renderHistory();
        return;
      }

      if (msg.type === 'hello') {
        const st = Number(msg.serverTime || 0);
        if (st) serverTimeOffsetMs = st - Date.now();
        return;
      }


      if (msg.type === 'auth_ok') {
        if (msg.user) {
          // Keep prior token if server didn't send one (e.g., display-name update)
          setAuthState(msg.user, (typeof msg.token === 'string' && msg.token.trim()) ? msg.token : authToken);
        } else {
          updateAuthUi();
        }

        if (pendingAutoRejoin) {
          pendingAutoRejoin = false;

          // One-shot: after clicking "Main Menu" from a finished game, start a fresh lobby instead of rejoining.
          let autoCreate = false;
          try { autoCreate = sessionStorage.getItem(AUTO_CREATE_ROOM_KEY) === '1'; } catch (_) { autoCreate = false; }
          if (autoCreate) {
            try { sessionStorage.removeItem(AUTO_CREATE_ROOM_KEY); } catch (_) {}
            try { localStorage.removeItem(LAST_ROOM_KEY); } catch (_) {}
            const displayName =
              (ui.nameInput?.value || '').trim() ||
              (authUser ? (authUser.displayName || authUser.username) : '') ||
              'Host';
            send({ type: 'create_room', displayName });
            return;
          }

          let code = '';
          try { code = (room && room.code) ? room.code : (localStorage.getItem(LAST_ROOM_KEY) || ''); } catch (_) { code = (room && room.code) ? room.code : ''; }
          code = String(code || '').trim().toUpperCase();
          if (code) {
            send({ type: 'rejoin_room', code, displayName: (ui.nameInput?.value || '').trim() });
          }
        }
        return;
      }

      if (msg.type === 'auth_required') {
        clearAuthLocal();
        pendingAutoRejoin = false;
        return;
      }

      if (msg.type === 'user_stats') {
        if (msg.user && authUser && msg.user.id === authUser.id) {
          authUser = msg.user;
        } else if (msg.stats && authUser && msg.user && msg.user.id === authUser.id) {
          authUser.stats = msg.stats;
        }
        updateAuthUi();
        return;
      }

      if (msg.type === 'joined') {
        myPlayerId = msg.playerId;
        room = msg.room;
        isHost = !!msg.isHost;
        if (ui.rejoinIdInput) ui.rejoinIdInput.value = myPlayerId || '';
        if (ui.codeInput && room?.code) ui.codeInput.value = room.code;
        ui.roomBox.classList.remove('hidden');
        ui.roomCode.textContent = room.code;
        try { localStorage.setItem(LAST_ROOM_KEY, room.code); } catch (_) {}
        updateAuthUi();
        ui.startBtn.classList.toggle('hidden', !isHost);
        setError(null);
        renderLobby();
        send({ type: 'get_state' });
        return;
      }

      if (msg.type === 'room') {
        room = msg.room;
        ui.roomBox.classList.remove('hidden');
        ui.roomCode.textContent = room.code;
        try { localStorage.setItem(LAST_ROOM_KEY, room.code); } catch (_) {}
        updateAuthUi();
        ui.startBtn.classList.toggle('hidden', !(myPlayerId && room.hostId === myPlayerId));
        renderLobby();
        return;
      }

      if (msg.type === 'state') {
        state = msg.state;
        // Any state change should clear click-to-build UI.
        hideBuildPopup();
        // Auto-fit view for larger boards (Seafarers)
        const tc = (state && state.geom && state.geom.tiles) ? state.geom.tiles.length : 0;
        if (tc && tc !== lastTileCountForView) {
          lastTileCountForView = tc;
          if (tc > 45) { view.scale = 95; view.ox = 0; view.oy = 0; }
          else if (tc > 19) { view.scale = 120; view.ox = 0; view.oy = 0; }
          else { view.scale = 150; view.ox = 0; view.oy = 0; }
        }
        maybePlayTurnBell();
        scheduleEndTurnWarn();
        handleLastEvent();
        handlePendingTradePrompt();
        handleEndGameVotePrompt();
        handleDiscardPrompt();
        handleRobberStealPrompt();
        handlePirateChoicePrompt();
        handlePirateStealPrompt();
        handleDiscoveryGoldPrompt();
        refreshToolModals();

        // Keep the draggable Game Log overlay in sync while it's open.
        try {
          const inGame = !!(state && state.phase && state.phase !== 'lobby');
          if (ui.logCard) ui.logCard.classList.toggle('hidden', !inGame || !logPanelOpen);
          if (ui.logList && inGame && logPanelOpen) renderLogList(ui.logList);
        } catch (_) {}

        updateButtons();
        renderLobby();
        render();
        syncPostgameToState();
        return;
      }
    });
  }

  function send(obj) {
    if (!ws || ws.readyState !== 1) return;
    ws.send(JSON.stringify(obj));
  }

  function maybePlayTurnBell() {
    try {
      if (!state || !myPlayerId) return;
      const myTurn = (state.currentPlayerId === myPlayerId);
      if (!myTurn) return;
      if (state.phase !== 'main-await-roll') return;
      const tn = (state.turnNumber ?? 0);
      if (tn === lastBellTurnNumber) return;
      lastBellTurnNumber = tn;
      turnBell.currentTime = 0;
      const p = turnBell.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (e) {
      // ignore autoplay restrictions/errors
    }
  }

  updateAuthUi();
  connect();
  // Keep the countdown clock ticking even when no state messages arrive.
  ensureTimerUiInterval();

  // Load images
  async function loadImages() {
    const load = (k, src) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { images[k] = img; resolve(); };
      img.onerror = () => { images[k] = null; resolve(); };
      img.src = src;
    });
    const entries = [
      ...Object.entries(TILE_IMG),
      ...Object.entries(DEV_IMG).map(([k, v]) => [`dev_${k}`, v]),
      ...Object.entries(NUM_TOKEN_IMG).map(([k, v]) => [`num_${k}`, v]),
      ...Object.entries(PORT_IMG).map(([k, v]) => [`port_${k}`, v]),
      ...Object.entries(THIEF_IMG).map(([k, v]) => [`thief_${k}`, v]),
    ];
    await Promise.all(entries.map(([k, src]) => load(k, src)));
  }
  loadImages().then(render);

  // Modal helpers
  function closeModal() {
    if (modalLocked) return;

    // If a player dismisses the proposed-trade popup, treat it as a reject.
    try {
      if (modalType === 'pendingTrade' && state && state.pendingTrade && myPlayerId) {
        const t = state.pendingTrade;
        if (t && t.id && myPlayerId !== t.fromId) {
          // Always reject on close (even if previously accepted).
          send({ type: 'game_action', action: { kind: 'respond_trade', tradeId: t.id, accept: false } });
        }
      }
    } catch (_) {}

    // If a player dismisses the end-game vote popup, treat it as a reject.
    try {
      if (modalType === 'endVote' && state && state.endVote && myPlayerId) {
        const v = state.endVote;
        if (v && v.id) {
          send({ type: 'game_action', action: { kind: 'respond_endgame', voteId: v.id, accept: false } });
        }
      }
    } catch (_) {}

    ui.modal.classList.add('hidden');
    ui.modalTitle.textContent = '';
    ui.modalBody.innerHTML = '';
    ui.modalActions.innerHTML = '';
    modalType = null;
    activeToolModal = null;
    chatRefs = null;
  }

  function forceCloseModal() {
    modalLocked = false;
    closeModal();
  }

  function openModal({ title, bodyNode, actions }) {
    ui.modalTitle.textContent = title || '';
    ui.modalBody.innerHTML = '';
    if (bodyNode) ui.modalBody.appendChild(bodyNode);
    ui.modalActions.innerHTML = '';
    for (const a of (actions || [])) {
      const b = document.createElement('button');
      b.className = 'btn' + (a.primary ? ' primary' : '');
      b.textContent = a.label;
      b.disabled = !!a.disabled;
      b.addEventListener('click', () => a.onClick && a.onClick());
      ui.modalActions.appendChild(b);
    }
    ui.modal.classList.remove('hidden');
  }
  ui.modalBackdrop.addEventListener('click', closeModal);
  window.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') closeModal();
  });

  function prettyCardName(type) {
    switch (type) {
      case 'knight': return 'Knight';
      case 'road_building': return 'Road Building';
      case 'invention': return 'Invention';
      case 'monopoly': return 'Monopoly';
      case 'victory_point': return 'Victory Point';
      default: return type;
    }
  }


  // -------------------- Tools: Log / Dice / Chat --------------------

  function formatTs(ts) {
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  function getChatMessages() {
    if (state && state.chat) return state.chat;
    if (room && room.chat) return room.chat;
    return [];
  }

  function renderChatList(listEl) {
    const msgs = getChatMessages();
    listEl.innerHTML = '';
    for (const m of msgs) {
      const row = document.createElement('div');
      row.className = 'chatRow';

      const meta = document.createElement('div');
      meta.className = 'chatMeta';
      meta.textContent = `[${formatTs(m.ts)}] ${m.from || 'Player'}`;

      const body = document.createElement('div');
      body.className = 'chatBody';
      body.textContent = m.text;

      row.appendChild(meta);
      row.appendChild(body);
      listEl.appendChild(row);
    }
    listEl.scrollTop = listEl.scrollHeight;
  }

  function openChatModal() {
    activeToolModal = 'chat';

    const wrap = document.createElement('div');
    wrap.className = 'toolWrap';

    const list = document.createElement('div');
    list.className = 'chatList';
    wrap.appendChild(list);

    const row = document.createElement('div');
    row.className = 'chatInputRow';

    const input = document.createElement('input');
    input.className = 'input';
    input.placeholder = 'Type a message…';

    const sendBtn = document.createElement('button');
    sendBtn.className = 'btn primary';
    sendBtn.textContent = 'Send';

    function doSend() {
      const t = input.value.trim();
      if (!t) return;
      send({ type: 'chat', text: t });
      input.value = '';
    }

    sendBtn.addEventListener('click', doSend);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doSend();
    });

    row.appendChild(input);
    row.appendChild(sendBtn);
    wrap.appendChild(row);

    chatRefs = { list, input };

    renderChatList(list);

    openModal({
      title: 'Chat',
      bodyNode: wrap,
      actions: [{ label: 'Close', primary: true, onClick: closeModal }],
    });

    setTimeout(() => input.focus(), 50);
  }

  function openRoomIdsModal() {
    if (!room || !myPlayerId || room.hostId !== myPlayerId) return;

    const wrap = document.createElement('div');
    wrap.className = 'toolWrap';

    const codeRow = document.createElement('div');
    codeRow.style.display = 'flex';
    codeRow.style.gap = '8px';
    codeRow.style.alignItems = 'center';
    codeRow.style.marginBottom = '10px';

    const codeLabel = document.createElement('div');
    codeLabel.textContent = 'Room code:';
    codeLabel.style.color = '#9fb0c6';

    const codeVal = document.createElement('div');
    codeVal.textContent = room.code || '—';
    codeVal.style.fontFamily = 'ui-monospace, monospace';
    codeVal.style.fontSize = '14px';
    codeVal.style.color = '#e8eef6';

    const copyCode = document.createElement('button');
    copyCode.className = 'btn';
    copyCode.textContent = 'Copy';
    copyCode.addEventListener('click', () => copyText(room.code || ''));

    codeRow.appendChild(codeLabel);
    codeRow.appendChild(codeVal);
    codeRow.appendChild(copyCode);
    wrap.appendChild(codeRow);

    const list = document.createElement('div');
    list.style.display = 'flex';
    list.style.flexDirection = 'column';
    list.style.gap = '8px';

    for (const p of (room.players || [])) {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '10px';
      row.style.padding = '8px';
      row.style.background = 'rgba(0,0,0,.10)';
      row.style.border = '1px solid rgba(255,255,255,.08)';
      row.style.borderRadius = '10px';

      const left = document.createElement('div');
      left.style.display = 'flex';
      left.style.alignItems = 'center';
      left.style.gap = '8px';
      left.style.minWidth = '140px';

      const badge = document.createElement('div');
      badge.className = 'badge';
      badge.style.background = p.color;

      const name = document.createElement('div');
      name.textContent = p.name + (p.id === room.hostId ? ' (host)' : '');
      name.style.color = '#e8eef6';

      left.appendChild(badge);
      left.appendChild(name);

      const id = document.createElement('div');
      id.textContent = p.id;
      id.style.flex = '1';
      id.style.minWidth = '0';
      id.style.color = '#9fb0c6';
      id.style.fontFamily = 'ui-monospace, monospace';
      id.style.fontSize = '11px';
      id.style.wordBreak = 'break-all';

      const copy = document.createElement('button');
      copy.className = 'btn';
      copy.textContent = 'Copy ID';
      copy.addEventListener('click', () => copyText(p.id));

      row.appendChild(left);
      row.appendChild(id);
      row.appendChild(copy);
      list.appendChild(row);
    }

    wrap.appendChild(list);

    openModal({
      title: 'Room IDs (host only)',
      bodyNode: wrap,
      actions: [{ label: 'Close', primary: true, onClick: closeModal }],
    });
  }

  function setLogPanelVisible(next) {
    logPanelOpen = !!next;
    try { localStorage.setItem('hexsettlers_log_open_v1', logPanelOpen ? '1' : '0'); } catch (_) {}

    const inGame = !!(state && state.phase && state.phase !== 'lobby');
    if (ui.logCard) ui.logCard.classList.toggle('hidden', !inGame || !logPanelOpen);
    if (ui.logList && inGame && logPanelOpen) renderLogList(ui.logList);
  }

  function toggleLogPanel() {
    const inGame = !!(state && state.phase && state.phase !== 'lobby');
    if (!inGame) {
      openLogModal();
      return;
    }
    setLogPanelVisible(!logPanelOpen);
  }

  function makeLogRow(entry) {
    const row = document.createElement('div');
    row.className = 'logRow';

    const ts = document.createElement('span');
    ts.className = 'logTs';
    ts.textContent = `[${formatTs(entry.ts)}]`;
    row.appendChild(ts);

    // Rich production rows: show per-player gains with resource icons.
    if (entry && entry.kind === 'production' && entry.data && entry.data.gains) {
      const data = entry.data;
      const title = document.createElement('span');
      const d1 = (typeof data.d1 === 'number') ? data.d1 : null;
      const d2 = (typeof data.d2 === 'number') ? data.d2 : null;
      const roll = (typeof data.roll === 'number') ? data.roll : null;

      const rollTxt = (roll != null) ? `Resources (${roll}${(d1 != null && d2 != null) ? ` ${d1}+${d2}` : ''}):` : 'Resources:';
      title.textContent = ` ${rollTxt}`;
      row.appendChild(title);

      const gains = data.gains || {};
      const pids = Object.keys(gains);
      // Keep stable ordering (turn order if possible)
      const order = (state && state.players) ? state.players.map(p => p.id) : [];
      pids.sort((a, b) => {
        const ia = order.indexOf(a);
        const ib = order.indexOf(b);
        if (ia === -1 && ib === -1) return String(a).localeCompare(String(b));
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      });

      for (const pid of pids) {
        const g = gains[pid] || {};
        const sum = ['brick','lumber','wool','grain','ore'].reduce((a, k) => a + (g[k] || 0), 0);
        if (!sum) continue;

        const p = (state && state.players) ? state.players.find(pp => pp.id === pid) : null;

        const seg = document.createElement('span');
        seg.className = 'logPlayerSeg';

        const dot = document.createElement('span');
        dot.className = 'logDot';
        dot.style.background = (p && p.color) ? p.color : '#8899aa';
        seg.appendChild(dot);

        const name = document.createElement('span');
        name.textContent = (p && p.name) ? p.name : 'Player';
        seg.appendChild(name);

        for (const k of ['brick','lumber','wool','grain','ore']) {
          const n = g[k] || 0;
          if (!n) continue;

          const r = document.createElement('span');
          r.className = 'logRes';

          const img = document.createElement('img');
          img.className = 'logResIcon';
          img.src = PORT_IMG[k] || `assets/ports/${k}.png`;
          img.alt = k;
          r.appendChild(img);

          const num = document.createElement('span');
          num.className = 'logResNum';
          num.textContent = `+${n}`;
          r.appendChild(num);

          seg.appendChild(r);
        }

        row.appendChild(seg);
      }

      return row;
    }

    const body = document.createElement('span');
    body.textContent = ` ${entry && entry.text ? entry.text : ''}`;
    row.appendChild(body);
    return row;
  }

  function renderLogList(listEl) {
    if (!listEl) return;
    const entries = (state && state.log) ? state.log : [];
    const stickToBottom = (listEl.scrollTop + listEl.clientHeight) >= (listEl.scrollHeight - 12);

    listEl.innerHTML = '';
    for (const e of entries) listEl.appendChild(makeLogRow(e));

    if (stickToBottom) listEl.scrollTop = listEl.scrollHeight;
  }

  function openLogModal() {
    activeToolModal = 'log';

    const wrap = document.createElement('div');
    wrap.className = 'toolWrap';

    const list = document.createElement('div');
    list.className = 'logList';

    renderLogList(list);

    wrap.appendChild(list);
    openModal({
      title: 'Game Log',
      bodyNode: wrap,
      actions: [{ label: 'Close', primary: true, onClick: closeModal }],
    });

    list.scrollTop = list.scrollHeight;
  }

  function openRulesModal() {
    activeToolModal = 'rules';

    const r = (state && state.rules) ? state.rules : (room && room.rules) ? room.rules : null;
    const rules = r || {};

    const discardLimit = Math.max(0, Math.floor(Number(rules.discardLimit ?? 7)));
    const setupMs = Math.max(0, Math.floor(Number(rules.setupTurnMs ?? 60000)));
    const playMs = Math.max(0, Math.floor(Number(rules.playTurnMs ?? 30000)));
    const microMs = Math.max(0, Math.floor(Number(rules.microPhaseMs ?? rules.microMs ?? 15000)));

    function msToS(ms) { return `${Math.round(ms / 1000)}s`; }

    function timerSpeedName() {
      const ratio = playMs / 30000;
      if (Math.abs(ratio - 0.5) < 0.12) return 'Fast';
      if (Math.abs(ratio - 1.0) < 0.12) return 'Normal';
      if (Math.abs(ratio - 2.0) < 0.25) return 'Slow';
      return 'Custom';
    }

    const mmRaw = String(rules.mapMode || 'classic').toLowerCase();
    const is56 = (mmRaw === 'classic56' || mmRaw === 'classic_5_6' || mmRaw === 'classic-5-6' || mmRaw === 'classic5_6' || mmRaw === 'classic5-6');
    const mapMode = (mmRaw === 'seafarers') ? 'Seafarers' : (is56 ? 'Classic 5–6' : 'Classic');
    const scenRaw = String(rules.seafarersScenario || '').toLowerCase();
    const scenario = (mmRaw === 'seafarers')
      ? (scenRaw === 'through_the_desert' || scenRaw === 'through-the-desert' || scenRaw === 'desert' || scenRaw === 'throughdesert' || scenRaw === 'through_the_desert_56')
        ? 'Through the Desert'
        : (scenRaw === 'fog_island' || scenRaw === 'fog-island' || scenRaw === 'fog' || scenRaw === 'fogisland' || scenRaw === 'fog_island_56' || scenRaw === 'fog-island-56' || scenRaw === 'fog56')
          ? 'Fog Island'
          : (scenRaw === 'heading_for_new_shores' || scenRaw === 'heading-for-new-shores' || scenRaw === 'new_shores' || scenRaw === 'newshores' || scenRaw === 'heading')
            ? 'Heading for New Shores'
            : (scenRaw === 'test_builder' || scenRaw === 'test-builder' || scenRaw === 'test' || scenRaw === 'builder')
              ? 'Test Builder'
              : ((scenRaw === 'six_islands' || scenRaw === 'six-islands' || scenRaw === 'sixislands' || scenRaw === 'six')
                  ? 'Six Islands'
                  : 'Four Islands')
      : (is56 ? 'Paired players' : '—');

    const vpToWin = Math.max(0, Math.floor(Number(rules.victoryPointsToWin ?? rules.victoryTarget ?? 10)));

    const wrap = document.createElement('div');
    wrap.className = 'toolWrap';

    const table = document.createElement('table');
    table.className = 'diceTable';
    const tbody = document.createElement('tbody');
    function addRow(k, v) {
      const tr = document.createElement('tr');
      const td1 = document.createElement('td');
      td1.textContent = k;
      const td2 = document.createElement('td');
      td2.textContent = v;
      tr.appendChild(td1);
      tr.appendChild(td2);
      tbody.appendChild(tr);
    }

    addRow('Map', mapMode);
    addRow('Scenario', scenario);
    addRow('Victory Condition', `${vpToWin} VP`);
    addRow('Discard Limit', `${discardLimit}`);
    addRow('Timer Speed', `${timerSpeedName()} (setup ${msToS(setupMs)} / turn ${msToS(playMs)} / micro ${msToS(microMs)})`);

    table.appendChild(tbody);
    wrap.appendChild(table);

    if (is56) {
      const note = document.createElement('div');
      note.className = 'smallNote';
      note.style.marginTop = '10px';
      note.textContent = 'Paired turns: Player 1 rolls + takes a full action phase. If they do not win, Player 2 takes an action phase (bank trade only). The third player to the left of Player 1 is Player 2. After Player 2 ends, pass to the next Player 1.';
      wrap.appendChild(note);
    }

    openModal({
      title: 'Game Rules',
      bodyNode: wrap,
      actions: [{ label: 'Close', primary: true, onClick: closeModal }],
    });
  }

  function openDiceModal() {
    activeToolModal = 'dice';

    const wrap = document.createElement('div');
    wrap.className = 'toolWrap';

    const ds = (state && state.diceStats) ? state.diceStats : null;
    const total = ds ? Object.values(ds).reduce((a, v) => a + v, 0) : 0;

    const table = document.createElement('table');
    table.className = 'diceTable';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Roll</th><th>Count</th><th>%</th></tr>';
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (let r = 2; r <= 12; r++) {
      const c = ds ? (ds[r] || 0) : 0;
      const pct = total ? Math.round((c / total) * 1000) / 10 : 0;
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${r}</td><td>${c}</td><td>${pct.toFixed(1)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    const note = document.createElement('div');
    note.className = 'smallNote';
    note.textContent = `Total rolls: ${total}`;

    wrap.appendChild(note);
    wrap.appendChild(table);

    openModal({
      title: 'Dice Statistics',
      bodyNode: wrap,
      actions: [{ label: 'Close', primary: true, onClick: closeModal }],
    });
  }

  function refreshToolModals() {
    if (!activeToolModal) return;
    if (ui.modal.classList.contains('hidden')) return;

    if (activeToolModal === 'chat' && chatRefs && chatRefs.list) {
      renderChatList(chatRefs.list);
      return;
    }
    if (activeToolModal === 'log') {
      // Rebuild log body
      const wrap = document.createElement('div');
      wrap.className = 'toolWrap';
      const list = document.createElement('div');
      list.className = 'logList';
      renderLogList(list);
      wrap.appendChild(list);
      ui.modalBody.innerHTML = '';
      ui.modalBody.appendChild(wrap);
      list.scrollTop = list.scrollHeight;
      return;
    }
    if (activeToolModal === 'rules') {
      // Rules rarely change, but if they do, rebuild.
      openRulesModal();
      return;
    }
    if (activeToolModal === 'dice') {
      // Rebuild dice body
      const wrap = document.createElement('div');
      wrap.className = 'toolWrap';
      const ds = (state && state.diceStats) ? state.diceStats : null;
      const total = ds ? Object.values(ds).reduce((a, v) => a + v, 0) : 0;

      const table = document.createElement('table');
      table.className = 'diceTable';
      const thead = document.createElement('thead');
      thead.innerHTML = '<tr><th>Roll</th><th>Count</th><th>%</th></tr>';
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      for (let r = 2; r <= 12; r++) {
        const c = ds ? (ds[r] || 0) : 0;
        const pct = total ? Math.round((c / total) * 1000) / 10 : 0;
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${r}</td><td>${c}</td><td>${pct.toFixed(1)}</td>`;
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);

      const note = document.createElement('div');
      note.className = 'smallNote';
      note.textContent = `Total rolls: ${total}`;

      wrap.appendChild(note);
      wrap.appendChild(table);

      ui.modalBody.innerHTML = '';
      ui.modalBody.appendChild(wrap);
      return;
    }
  }



  function handleLastEvent() {
    if (!state || !state.lastEvent) return;
    const ev = state.lastEvent;
    if (!ev.id || ev.id <= lastEventIdSeen) return;
    lastEventIdSeen = ev.id;

    if (ev.type === 'devcard_draw' && ev.playerId === myPlayerId) {
      const wrap = document.createElement('div');
      const img = document.createElement('img');
      img.className = 'modalImg';
      img.src = DEV_IMG[ev.cardType] || '';
      img.alt = prettyCardName(ev.cardType);
      wrap.appendChild(img);
      openModal({
        title: `Development Card: ${prettyCardName(ev.cardType)}`,
        bodyNode: wrap,
        actions: [{ label: 'OK', primary: true, onClick: closeModal }]
      });
    }

    if (ev.type === 'steal_result' && ev.playerId === myPlayerId && ev.resourceKind) {
      const wrap2 = document.createElement('div');
      wrap2.className = 'modalText';
      wrap2.textContent = `You stole: ${ev.resourceKind}`;
      openModal({
        title: 'Steal Result',
        bodyNode: wrap2,
        actions: [{ label: 'OK', primary: true, onClick: closeModal }]
      });
    }
  }

  // Lobby UI
  function renderLobby() {
    if (!room) return;

    const showAllIds = !!(myPlayerId && room.hostId === myPlayerId);

    if (ui.myAccountLabel) ui.myAccountLabel.textContent = authUser ? `${authUser.username} (${authUser.displayName || authUser.username})` : '—';

    ui.playersList.innerHTML = '';
    for (const p of room.players) {
      const row = document.createElement('div');
      row.className = 'playerRow';

      const tag = document.createElement('div');
      tag.className = 'playerTag';
      const badge = document.createElement('div');
      badge.className = 'badge';
      badge.style.background = p.color;
      const name = document.createElement('div');
      let label = p.name;
      if (p.isAI) label += ' (AI)';
      if (p.id === room.hostId) label += ' (host)';
      if (p.id === myPlayerId) label += ' (you)';
      name.textContent = label;
      tag.appendChild(badge);
      tag.appendChild(name);

      row.appendChild(tag);

      if (showAllIds) {
        const right = document.createElement('button');
        right.className = 'btn';
        right.style.padding = '6px 8px';
        right.style.fontSize = '11px';
        right.style.fontFamily = 'ui-monospace, monospace';
        right.style.color = '#93a4b8';
        right.style.background = 'rgba(0,0,0,.10)';
        right.style.cursor = 'pointer';
        right.style.whiteSpace = 'nowrap';
        const short = (p.id.length > 16) ? `${p.id.slice(0, 8)}…${p.id.slice(-4)}` : p.id;
        right.textContent = short;
        right.title = 'Click to copy full player ID';
        right.addEventListener('click', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          copyText(p.id);
        });
        row.appendChild(right);
      }

      ui.playersList.appendChild(row);
    }

    // AI fill controls (host-only, lobby only)
    try {
      const gameStartedNow = !!(state && state.phase && state.phase !== 'lobby');
      const canManageAI = !!(myPlayerId && room.hostId === myPlayerId && !gameStartedNow);
      if (ui.aiFillRow) ui.aiFillRow.classList.toggle('hidden', !canManageAI);

      // AI difficulty (host-only, lobby only)
      if (ui.aiDifficultySelect) {
        ui.aiDifficultySelect.disabled = !canManageAI;
        const rawDiff = String(room?.aiDifficulty || 'test').toLowerCase();
        const diff = (rawDiff === 'easy' || rawDiff === 'medium' || rawDiff === 'hard') ? rawDiff : 'test';
        ui.aiDifficultySelect.value = diff;
      }

      if (canManageAI && ui.aiFillSelect) {
        const raw = String(room?.rules?.mapMode || 'classic').toLowerCase();
        const mm = (raw === 'seafarers') ? 'seafarers'
          : (raw === 'classic56' || raw === 'classic_5_6' || raw === 'classic-5-6' || raw === 'classic5_6' || raw === 'classic5-6')
            ? 'classic56'
            : 'classic';
        const allowSolo = (mm === 'seafarers') && String(room?.rules?.seafarersScenario || '').toLowerCase() === 'test_builder';
        const scen = String(room?.rules?.seafarersScenario || 'four_islands').toLowerCase().replace(/-/g,'_');
        const isSeafarers56 = (mm === 'seafarers' && (scen === 'six_islands' || scen === 'through_the_desert_56' || scen === 'fog_island_56'));
        const minPlayers = (mm === 'classic56') ? 5 : (isSeafarers56 ? 5 : (allowSolo ? 1 : 2));
        const maxPlayers = (mm === 'classic56') ? 6 : (isSeafarers56 ? 6 : 4);
        const humans = (room.players || []).filter(pp => pp && !pp.isAI).length;
        const current = (room.players || []).length;
        const start = Math.max(humans, 1);
        const prev = ui.aiFillSelect.value;
        ui.aiFillSelect.innerHTML = '';
        for (let target = start; target <= maxPlayers; target++) {
          const opt = document.createElement('option');
          const add = Math.max(0, target - current);
          const rem = Math.max(0, current - target);
          let suffix = '';
          if (add > 0) suffix = `(+${add} AI)`;
          else if (rem > 0) suffix = `(-${rem} AI)`;
          opt.value = String(target);
          opt.textContent = `Fill to ${target} ${suffix}`.trim();
          ui.aiFillSelect.appendChild(opt);
        }
        // Keep selection if possible, otherwise default to the minimum needed to start.
        const desired = (prev && [...ui.aiFillSelect.options].some(o => o.value === prev)) ? prev : String(Math.max(minPlayers, Math.min(maxPlayers, current)));
        ui.aiFillSelect.value = desired;
      }
    } catch (_) {}


    // Color picker (unique per player)
    try {
      const myP = (myPlayerId && room && Array.isArray(room.players)) ? room.players.find(x => x && x.id === myPlayerId) : null;
      const gameStartedNow = !!(state && state.phase && state.phase !== 'lobby');
      const canPick = !!myP && !gameStartedNow;

      if (ui.colorPickerRow) ui.colorPickerRow.classList.toggle('hidden', !canPick);
      if (ui.colorPicker) {
        if (!canPick) {
          ui.colorPicker.innerHTML = '';
        } else {
          const PLAYER_COLOR_OPTIONS = [
            { name: 'Red', hex: '#e74c3c' },
            { name: 'Blue', hex: '#3498db' },
            { name: 'Green', hex: '#2ecc71' },
            { name: 'Yellow', hex: '#f1c40f' },
            { name: 'Purple', hex: '#8000f8' },
            { name: 'Teal', hex: '#88f8f8' },
            { name: 'White', hex: '#f8f8f8' },
            { name: 'Orange', hex: '#f86800' },
          ];

          const taken = new Map();
          for (const pl of room.players) {
            if (!pl) continue;
            const hc = String(pl.color || '').toLowerCase();
            if (hc) taken.set(hc, pl.id);
          }

          const myHex = String(myP.color || '').toLowerCase();
          const isLight = (hex) => {
            const h = String(hex || '').replace('#','');
            if (h.length !== 6) return false;
            const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
            // relative luminance
            const lum = (0.2126*r + 0.7152*g + 0.0722*b) / 255;
            return lum > 0.62;
          };

          ui.colorPicker.innerHTML = '';
          for (const opt of PLAYER_COLOR_OPTIONS) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'colorChip';
            btn.style.background = opt.hex;

            const usedBy = taken.get(String(opt.hex).toLowerCase());
            const mine = (myHex && myHex === String(opt.hex).toLowerCase());

            if (mine) btn.classList.add('selected');
            if (usedBy && usedBy !== myPlayerId) {
              btn.classList.add('disabled');
              btn.disabled = true;
              btn.title = `${opt.name} (taken)`;
            } else {
              btn.title = opt.name;
            }

            const check = document.createElement('div');
            check.className = 'check';
            check.textContent = mine ? '✓' : '';
            check.style.color = isLight(opt.hex) ? 'rgba(0,0,0,.78)' : 'rgba(255,255,255,.92)';
            btn.appendChild(check);

            btn.addEventListener('click', (ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              if (btn.disabled) return;
              if (mine) return;
              setError(null);
              send({ type: 'set_player_color', color: opt.hex });
            });

            ui.colorPicker.appendChild(btn);
          }
        }
      }
    } catch (_) {}

    // Setup visibility & controls
    const gameStarted = !!(state && state.phase && state.phase !== 'lobby');
    if (ui.lobbyCard) ui.lobbyCard.classList.toggle('hidden', gameStarted);
    if (ui.setupCard) ui.setupCard.classList.toggle('hidden', gameStarted);

    const r = room.rules || { discardLimit: 7, setupTurnMs: 60000, playTurnMs: 30000, microPhaseMs: 15000 };
    const isHost = !!(myPlayerId && room.hostId === myPlayerId) && !gameStarted;

    if (ui.discardLimitInput) {
      ui.discardLimitInput.value = r.discardLimit ?? 7;
      ui.discardLimitInput.disabled = !isHost;
    }
    if (ui.timerSpeedSelect) {
      const factor = (r.setupTurnMs || 60000) / 60000;
      const preset = factor <= 0.75 ? 'fast' : (factor >= 1.5 ? 'slow' : 'normal');
      ui.timerSpeedSelect.value = preset;
      ui.timerSpeedSelect.disabled = !isHost;
    }
    if (ui.mapModeSelect) {
      ui.mapModeSelect.value = uiMapModeFromRules(r);
      ui.mapModeSelect.disabled = !isHost;
    }
    // Seafarers scenario selector
    const mmNow = uiMapModeFromRules(r);
    if (ui.scenarioRow) ui.scenarioRow.classList.toggle('hidden', mmNow !== 'seafarers');
    if (ui.scenario56Row) ui.scenario56Row.classList.toggle('hidden', mmNow !== 'seafarers56');
    if (ui.classic56Note) ui.classic56Note.classList.toggle('hidden', mmNow !== 'classic56');
    if (ui.sixIslandsNote) ui.sixIslandsNote.classList.toggle('hidden', mmNow !== 'seafarers56');
    if (ui.mapScenarioSelect) {
      // Only meaningful when mapMode === 'seafarers'.
      ui.mapScenarioSelect.value = (mmNow === 'seafarers') ? (r.seafarersScenario || 'four_islands') : 'four_islands';
      ui.mapScenarioSelect.disabled = !isHost || (mmNow !== 'seafarers');
    }
    if (ui.mapScenario56Select) {
      const scen56 = (mmNow === 'seafarers56') ? String(r.seafarersScenario || 'six_islands').toLowerCase() : 'six_islands';
      ui.mapScenario56Select.value = (scen56 === 'through_the_desert_56')
        ? 'through_the_desert_56'
        : ((scen56 === 'fog_island_56') ? 'fog_island_56' : 'six_islands');
      ui.mapScenario56Select.disabled = !isHost || (mmNow !== 'seafarers56');
    }

    // Test Builder (Solo) map painting UI (host-only)
    const scenNow = String(r.seafarersScenario || 'four_islands').toLowerCase();
    const showTestBuilder = (mmNow === 'seafarers' && scenNow === 'test_builder');
    if (ui.testBuilderRow) ui.testBuilderRow.classList.toggle('hidden', !showTestBuilder || gameStarted);
    if (ui.testBrushSelect) ui.testBrushSelect.disabled = !isHost || !showTestBuilder || gameStarted;
    if (ui.testNumberSelect) ui.testNumberSelect.disabled = !isHost || !showTestBuilder || gameStarted;
    if (ui.testResetBtn) ui.testResetBtn.disabled = !isHost || !showTestBuilder || gameStarted;

    // Victory points to win
    if (ui.victoryPointsSelect) {
      const defVp = defaultVictoryPointsFor(r);
      const curVp = Math.floor(Number(r.victoryPointsToWin ?? r.victoryTarget ?? defVp));
      const safeVp = Number.isFinite(curVp) ? String(Math.max(3, Math.min(30, curVp))) : String(defVp);
      ui.victoryPointsSelect.value = safeVp;
      ui.victoryPointsSelect.disabled = !isHost;

      // If the current rules are non-default for the chosen map/scenario,
      // consider the VP target "touched" so we don't auto-reset it.
      vpTouched = (Number(ui.victoryPointsSelect.value) !== defVp);
    }
    if (ui.saveRulesBtn) ui.saveRulesBtn.disabled = !isHost;

    // Lobby map preview controls
    if (ui.regenMapBtn) {
      ui.regenMapBtn.classList.toggle('hidden', !!(gameStarted || !isHost));
      ui.regenMapBtn.disabled = !(isHost && !gameStarted);
    }
    if (ui.mapGenNote) {
      if (gameStarted) {
        ui.mapGenNote.classList.add('hidden');
        ui.mapGenNote.textContent = '';
      } else {
        ui.mapGenNote.classList.remove('hidden');
        const ts = (state && state.previewAt) ? new Date(state.previewAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
        ui.mapGenNote.textContent = ts ? `Preview generated at ${ts}.` : 'Preview map will lock when the game starts.';
      }
    }

    if (ui.rulesPreview) {
      const s1 = Math.round((r.setupTurnMs || 60000) / 1000);
      const s2 = Math.round((r.playTurnMs || 30000) / 1000);
      const s3 = Math.round((r.microPhaseMs || 15000) / 1000);
      const mmUi = uiMapModeFromRules(r);
      const mmL = String(mmUi || 'classic').toLowerCase();
      const scen = (mmL === 'seafarers56')
        ? (((r.seafarersScenario === 'through_the_desert_56') || (r.seafarersScenario === 'fog_island_56')) ? r.seafarersScenario : 'six_islands')
        : (r.seafarersScenario || 'four_islands');
      const scenLabel = (scen === 'through_the_desert') ? 'Through the Desert'
        : (scen === 'through_the_desert_56') ? 'Through the Desert'
        : (scen === 'fog_island' || scen === 'fog_island_56' ? 'Fog Island'
          : (scen === 'heading_for_new_shores' ? 'Heading for New Shores'
            : (scen === 'test_builder' ? 'Test Builder'
              : (scen === 'six_islands' ? 'Six Islands' : 'Four Islands'))));
      const is56 = (mmL === 'classic56' || mmL === 'classic_5_6' || mmL === 'classic-5-6' || mmL === 'classic5_6' || mmL === 'classic5-6');
      const mapLabel = (mmL === 'seafarers56') ? `seafarers 5–6 (${scenLabel.toLowerCase()}, paired turns)`
        : (mmL === 'seafarers') ? `seafarers (${scenLabel})`
          : (is56 ? 'classic 5–6 (paired turns)' : 'classic');
      const vpWin = Math.floor(Number(r.victoryPointsToWin ?? r.victoryTarget ?? defaultVictoryPointsFor(r)));
      ui.rulesPreview.textContent = `Map: ${mapLabel} • Win: ${vpWin} VP • Discard limit: ${r.discardLimit ?? 7} • Setup turn: ${s1}s • Turn: ${s2}s • Micro: ${s3}s`;
    }

    const allowSolo = (mmNow === 'seafarers' && scenNow === 'test_builder');
    const mmLow = String(mmNow || 'classic').toLowerCase();
    const isClassic56 = (mmLow === 'classic56' || mmLow === 'classic_5_6' || mmLow === 'classic-5-6' || mmLow === 'classic5_6' || mmLow === 'classic5-6');
    const isSix = uiIsSixIslands(r);
    const minPlayers = isClassic56 ? 5 : (isSix ? 5 : (allowSolo ? 1 : 2));
    ui.startBtn.disabled = !(myPlayerId && room.hostId === myPlayerId && room.players.length >= minPlayers && (!state || state.phase === 'lobby'));
  }

    // ---- Account / Auth ----
  if (ui.registerBtn) ui.registerBtn.addEventListener('click', () => {
    setError(null);
    const username = (ui.usernameInput?.value || '').trim();
    const password = (ui.passwordInput?.value || '').trim();
    const displayName = (ui.nameInput?.value || '').trim();
    if (!username || !password) { setError('Enter a username and password.'); return; }
    send({ type: 'auth_register', username, password, displayName });
  });

  if (ui.loginBtn) ui.loginBtn.addEventListener('click', () => {
    setError(null);
    const username = (ui.usernameInput?.value || '').trim();
    const password = (ui.passwordInput?.value || '').trim();
    const displayName = (ui.nameInput?.value || '').trim();
    if (!username || !password) { setError('Enter a username and password.'); return; }
    send({ type: 'auth_login', username, password, displayName });
  });

  if (ui.logoutBtn) ui.logoutBtn.addEventListener('click', () => {
    setError(null);
    clearAuthLocal();
    // Optional: drop room state
    room = null;
    myPlayerId = null;
    isHost = false;
    if (ui.roomBox) ui.roomBox.classList.add('hidden');
  });

  if (ui.rejoinLastBtn) ui.rejoinLastBtn.addEventListener('click', () => {
    setError(null);
    if (!authUser) { setError('Log in first.'); return; }
    const code = (ui.codeInput?.value || '').trim().toUpperCase() || (() => { try { return localStorage.getItem(LAST_ROOM_KEY) || ''; } catch (_) { return ''; } })();
    if (!code) { setError('Enter a room code first.'); return; }
    send({ type: 'rejoin_room', code, displayName: (ui.nameInput?.value || '').trim() });
  });

  // ---- Lobby ----
  ui.createBtn.addEventListener('click', () => {
    setError(null);
    if (!authUser) { setError('Log in first.'); return; }
    const displayName = (ui.nameInput?.value || '').trim() || authUser.displayName || 'Host';
    send({ type: 'create_room', displayName });
  });

  ui.joinBtn.addEventListener('click', () => {
    setError(null);
    if (!authUser) { setError('Log in first.'); return; }
    const code = (ui.codeInput?.value || '').trim().toUpperCase();
    const displayName = (ui.nameInput?.value || '').trim() || authUser.displayName || 'Player';
    send({ type: 'join_room', code, displayName });
  });

if (ui.copyMyIdBtn) {
    ui.copyMyIdBtn.addEventListener('click', () => {
      if (!myPlayerId) return;
      copyText(myPlayerId);
    });
  }
  ui.startBtn.addEventListener('click', () => {
    setError(null);
    send({ type: 'start_game' });
  });

  if (ui.aiDifficultySelect) ui.aiDifficultySelect.addEventListener('change', () => {
    if (!room || !myPlayerId || room.hostId !== myPlayerId) return;
    const difficulty = String(ui.aiDifficultySelect.value || 'test').toLowerCase();
    send({ type: 'set_ai_difficulty', difficulty });
  });

  if (ui.aiFillBtn) ui.aiFillBtn.addEventListener('click', () => {
    if (!room || !myPlayerId || room.hostId !== myPlayerId) return;
    const target = Math.floor(Number(ui.aiFillSelect?.value || 0));
    if (!Number.isFinite(target) || target <= 0) return;
    send({ type: 'fill_ai', targetCount: target });
  });

  if (ui.aiClearBtn) ui.aiClearBtn.addEventListener('click', () => {
    if (!room || !myPlayerId || room.hostId !== myPlayerId) return;
    send({ type: 'clear_ai' });
  });

  if (ui.mapModeSelect && ui.scenarioRow) {
    ui.mapModeSelect.addEventListener('change', () => {
      const mm = (ui.mapModeSelect.value || 'classic');
      ui.scenarioRow.classList.toggle('hidden', mm !== 'seafarers');
      if (ui.scenario56Row) ui.scenario56Row.classList.toggle('hidden', mm !== 'seafarers56');
      if (ui.classic56Note) ui.classic56Note.classList.toggle('hidden', mm !== 'classic56');
      if (ui.sixIslandsNote) {
        ui.sixIslandsNote.classList.toggle('hidden', mm !== 'seafarers56');
      }
      if (ui.mapScenarioSelect) ui.mapScenarioSelect.disabled = (mm !== 'seafarers') || (room && room.hostId !== myPlayerId);
      if (ui.mapScenario56Select) ui.mapScenario56Select.disabled = (mm !== 'seafarers56') || (room && room.hostId !== myPlayerId);

      // Test Builder UI only appears for seafarers:test_builder
      const showTest = (mm === 'seafarers' && ui.mapScenarioSelect && String(ui.mapScenarioSelect.value).toLowerCase() === 'test_builder');
      if (ui.testBuilderRow) ui.testBuilderRow.classList.toggle('hidden', !showTest);

      // If the host hasn't manually set a win target yet, auto-fill the scenario default.
      if (ui.victoryPointsSelect && !vpTouched) {
        const scen = (mm === 'seafarers')
          ? (ui.mapScenarioSelect ? ui.mapScenarioSelect.value : (room?.rules?.seafarersScenario || 'four_islands'))
          : ((mm === 'seafarers56') ? (ui.mapScenario56Select?.value || 'six_islands') : 'six_islands');
        ui.victoryPointsSelect.value = String(defaultVictoryPointsFor({ mapMode: mm, seafarersScenario: scen }));
      }
    });
  }

  if (ui.mapScenarioSelect) {
    ui.mapScenarioSelect.addEventListener('change', () => {
      if (!ui.victoryPointsSelect) return;
      const mm = (ui.mapModeSelect ? (ui.mapModeSelect.value || 'classic') : 'classic');
      if (ui.testBuilderRow) {
        const showTest = (mm === 'seafarers' && String(ui.mapScenarioSelect.value).toLowerCase() === 'test_builder');
        ui.testBuilderRow.classList.toggle('hidden', !showTest);
      }
      if (ui.sixIslandsNote) {
        // Six Islands is exposed as its own map type (seafarers56), not a seafarers sub-scenario.
        ui.sixIslandsNote.classList.add('hidden');
      }
      if (mm !== 'seafarers') return;
      if (!vpTouched) ui.victoryPointsSelect.value = String(defaultVictoryPointsFor({ mapMode: mm, seafarersScenario: ui.mapScenarioSelect.value }));
    });
  }

  if (ui.mapScenario56Select) {
    ui.mapScenario56Select.addEventListener('change', () => {
      if (!ui.victoryPointsSelect) return;
      const mm = (ui.mapModeSelect ? (ui.mapModeSelect.value || 'classic') : 'classic');
      if (mm !== 'seafarers56') return;
      if (!vpTouched) ui.victoryPointsSelect.value = String(defaultVictoryPointsFor({ mapMode: mm, seafarersScenario56: ui.mapScenario56Select.value }));
    });
  }

  if (ui.victoryPointsSelect) {
    ui.victoryPointsSelect.addEventListener('change', () => { vpTouched = true; });
  }

  // Lobby setup
  ui.saveRulesBtn.addEventListener('click', () => {
    if (!room || room.hostId !== myPlayerId) return;
    const discardLimit = parseInt(ui.discardLimitInput.value, 10);
    const vpToWin = ui.victoryPointsSelect ? parseInt(ui.victoryPointsSelect.value, 10) : NaN;
    const preset = (ui.timerSpeedSelect.value || 'normal');
    const factor = preset === 'fast' ? 0.5 : (preset === 'slow' ? 2 : 1);
    const mmSel = (ui.mapModeSelect ? ui.mapModeSelect.value : 'classic');
    // 'seafarers56' is a UI convenience. The server stores this as seafarers + scenario.
    const mm = (String(mmSel).toLowerCase() === 'seafarers56') ? 'seafarers' : mmSel;
    const scenario = (String(mmSel).toLowerCase() === 'seafarers56')
      ? (ui.mapScenario56Select?.value || 'six_islands')
      : ((ui.mapScenarioSelect && mm === 'seafarers') ? ui.mapScenarioSelect.value : (room?.rules?.seafarersScenario || 'four_islands'));
    const rules = {
      discardLimit: Number.isFinite(discardLimit) ? discardLimit : 7,
      setupTurnMs: Math.round(60000 * factor),
      playTurnMs: Math.round(30000 * factor),
      microPhaseMs: Math.round(15000 * factor),
      mapMode: mm,
      victoryPointsToWin: Number.isFinite(vpToWin) ? vpToWin : undefined,
      // Only used if mapMode === 'seafarers'
      seafarersScenario: (mm === 'seafarers') ? scenario : (room?.rules?.seafarersScenario || 'four_islands'),
    };
    send({ type: 'set_rules', rules });
  });

  if (ui.regenMapBtn) {
    ui.regenMapBtn.addEventListener('click', () => {
      if (!room || room.hostId !== myPlayerId) return;
      send({ type: 'generate_map' });
    });
  }

  if (ui.testResetBtn) {
    ui.testResetBtn.addEventListener('click', () => {
      if (!room || room.hostId !== myPlayerId) return;
      send({ type: 'generate_map' });
    });
  }

  // Tools
  ui.logBtn.addEventListener('click', () => toggleLogPanel());
  if (ui.rulesBtn) ui.rulesBtn.addEventListener('click', () => openRulesModal());
  ui.diceBtn.addEventListener('click', () => openDiceModal());
  ui.chatBtn.addEventListener('click', () => openChatModal());
  if (ui.endGameVoteBtn) ui.endGameVoteBtn.addEventListener('click', () => {
    const inGame = !!(state && state.phase && state.phase !== 'lobby');
    const isHostNow = !!(room && myPlayerId && room.hostId === myPlayerId);
    if (!inGame || !isHostNow) return;
    // If a vote is already open, just re-open the panel.
    if (state && state.endVote && state.endVote.id) {
      openEndGameVoteModal(true);
      return;
    }
    sendGameAction({ kind: 'propose_endgame' });
  });
  if (ui.idsBtn) ui.idsBtn.addEventListener('click', () => openRoomIdsModal());

  if (ui.logHideBtn) {
    ui.logHideBtn.addEventListener('click', () => setLogPanelVisible(false));
  }

  // Game action mode
  const inputMode = { kind: null, moveShipFrom: null }; // 'place_settlement' | 'place_road' | 'upgrade_city' | 'move_robber'
  function setMode(kind) {
    // Clear any partial ship-move selection when leaving that mode.
    if (kind !== 'move_ship') inputMode.moveShipFrom = null;

    inputMode.kind = kind;
    let msg = '';
    if (!kind) {
      msg = 'Tip: Click nodes (corners) to place settlements/cities, and click edges to place roads (and ships in Seafarers).';
    } else if (kind === 'place_ship') {
      msg = 'Click an eligible sea edge to place a ship.';
    } else if (kind === 'move_ship') {
      msg = inputMode.moveShipFrom == null
        ? 'Click one of your end ships to select it, then click an empty sea edge to move it.'
        : 'Now click an empty sea edge to move the selected ship.';
    } else if (kind === 'move_thief') {
      msg = 'Click a land tile to move the robber, or a sea tile to move the pirate.';
    } else if (kind === 'move_pirate') {
      msg = 'Click a sea tile to move the pirate.';
    } else if (kind === 'move_robber') {
      msg = 'Click a land tile to move the robber.';
    } else {
      msg = `Click on the board to ${kind.replaceAll('_', ' ')}.`;
    }
    ui.hintBox.textContent = msg;
  }

  function sendGameAction(action) {
    if (!action) return;
    if (state && state.paused) {
      setError('Game is paused.');
      return;
    }
    send({ type: 'game_action', action });
  }

  function queryBuildOptions(targetKind, targetId, absX, absY) {
    if (!ws || ws.readyState !== 1) return;
    ensureBuildPopup();
    pendingBuildClick = { absX, absY, targetKind, targetId };
    send({ type: 'query_build_options', targetKind, targetId });
  }

  ui.pauseBtn.addEventListener('click', () => {
    if (!room || room.hostId !== myPlayerId) return;
    const desired = !(state && state.paused);
    send({ type: 'pause_game', paused: desired });
  });



// History / Leaderboard overlay controls
if (ui.historyBtn) ui.historyBtn.addEventListener('click', () => openHistoryOverlay('games'));
if (ui.leaderboardBtn) ui.leaderboardBtn.addEventListener('click', () => openHistoryOverlay('players'));

if (ui.historyCloseBtn) ui.historyCloseBtn.addEventListener('click', () => closeHistoryOverlay());
if (ui.historyRefreshBtn) ui.historyRefreshBtn.addEventListener('click', () => {
  historyState.loadingGames = true;
  historyState.loadingBoard = true;
  renderHistory();
  requestHistoryData();
});

if (ui.historyTabs) {
  ui.historyTabs.addEventListener('click', (ev) => {
    const btn = ev.target && ev.target.closest ? ev.target.closest('.hTab') : null;
    if (!btn) return;
    historyState.tab = btn.dataset.tab || 'games';
    renderHistory();
  });
}

// Post-game overlay controls
if (ui.pgMainMenuBtn) ui.pgMainMenuBtn.addEventListener('click', () => {
  if (postgameState.historyMode) {
    closePostgameSnapshot();
    return;
  }
  // After a victory, "Main Menu" acts as a rematch button:
  // it creates a new lobby with the same players and host, and moves everyone into it.
  try {
    if (ws && ws.readyState === 1) {
      ui.pgMainMenuBtn.disabled = true;
      ui.pgMainMenuBtn.textContent = 'Starting...';
      send({ type: 'rematch_room' });
      // If something goes wrong, the server will send an error and UI will re-enable below.
      return;
    }
  } catch (_) {}

  // Fallback: Back to lobby, but default to a NEW lobby so we don't auto-rejoin a finished game.
  try { sessionStorage.setItem(AUTO_CREATE_ROOM_KEY, '1'); } catch (_) {}
  try { localStorage.removeItem(LAST_ROOM_KEY); } catch (_) {}
  location.reload();
});

if (ui.pgHideBtn) ui.pgHideBtn.addEventListener('click', () => {
  if (postgameState.historyMode) {
    closePostgameSnapshot();
    return;
  }
  // hide overlay to view the final board
  setPostgameHidden(true);
});

if (ui.pgShowBtn) ui.pgShowBtn.addEventListener('click', () => {
  const st = postgameState.snapshot || state;
  if (!st || st.phase !== 'game-over') return;
  setPostgameHidden(false);
  // if panel isn't visible yet (still in splash), force the panel visible
  setPostgamePanelVisible(true);
  refreshPostgameHeader();
  renderPostgameTab(postgameState.tab || 'summary');
});

if (ui.postgameTabs) {
  ui.postgameTabs.addEventListener('click', (ev) => {
    const b = ev.target && ev.target.closest ? ev.target.closest('.pgTab') : null;
    if (!b) return;
    const tab = String(b.dataset.tab || 'summary');
    renderPostgameTab(tab);
  });
}

  ui.rollBtn.addEventListener('click', () => sendGameAction({ kind: 'roll_dice' }));
  ui.endBtn.addEventListener('click', () => sendGameAction({ kind: 'end_turn' }));

  if (ui.rollDockBtn) ui.rollDockBtn.addEventListener('click', () => sendGameAction({ kind: 'roll_dice' }));
  if (ui.endDockBtn) ui.endDockBtn.addEventListener('click', () => sendGameAction({ kind: 'end_turn' }));

  ui.buildRoadBtn.addEventListener('click', () => setMode('place_road'));
  ui.buildShipBtn.addEventListener('click', () => setMode('place_ship'));
  if (ui.moveShipBtn) ui.moveShipBtn.addEventListener('click', () => {
    if (inputMode.kind === 'move_ship') setMode(null);
    else setMode('move_ship');
  });
  ui.buildSettlementBtn.addEventListener('click', () => setMode('place_settlement'));
  ui.buildCityBtn.addEventListener('click', () => setMode('upgrade_city'));
  ui.buyDevBtn.addEventListener('click', () => sendGameAction({ kind: 'buy_dev_card' }));
  if (ui.bankTradeBtn) ui.bankTradeBtn.addEventListener('click', () => openBankTradeModal());
  if (ui.playerTradeBtn) ui.playerTradeBtn.addEventListener('click', () => openPlayerTradeModal());

  function canAffordClient(res, cost) {
    for (const k of Object.keys(cost)) if ((res?.[k] || 0) < cost[k]) return false;
    return true;
  }

  function myPlayer() {
    if (!state || !myPlayerId) return null;
    return (state.players || []).find(p => p.id === myPlayerId) || null;
  }

  // Interaction hit-testing cache (screen-space)
  let screenCache = null;


function serverNowMs() { return Date.now() + (serverTimeOffsetMs || 0); }

function timerSecondsLeft() {
  if (state && state.paused && state.pause && typeof state.pause.remainingMs === 'number') {
    return Math.max(0, Number(state.pause.remainingMs) / 1000);
  }
  const t = state && state.timer;
  if (!t || !t.endsAt) return null;
  const left = (Number(t.endsAt) - serverNowMs()) / 1000;
  return Math.max(0, left);
}

function formatClock(secs) {
  if (secs == null || !Number.isFinite(secs)) return '--:--';
  const s = Math.max(0, Math.ceil(secs));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${String(ss).padStart(2, '0')}`;
}

function updateTimerInfo() {
  if (!ui.timerInfo) return;
  const t = state && state.timer;
  if (!t || !t.endsAt || !state || state.phase === 'lobby') {
    ui.timerInfo.classList.add('hidden');
    ui.timerInfo.textContent = '—';
    if (ui.countdownClock) ui.countdownClock.classList.add('hidden');
    if (ui.pausedOverlay) ui.pausedOverlay.classList.add('hidden');
    return;
  }
  const left = timerSecondsLeft();
  const sec = left == null ? '—' : String(Math.ceil(left));
  ui.timerInfo.classList.remove('hidden');
  ui.timerInfo.textContent = `${state.paused ? '⏸' : '⏱'} ${sec}s · ${state.phase}`;

  // Right-side clock (all players)
  if (ui.countdownClock) {
    ui.countdownClock.classList.remove('hidden');
    const timeEl = ui.countdownClock.querySelector('.clockTime');
    const metaEl = ui.countdownClock.querySelector('.clockMeta');
    if (timeEl) timeEl.textContent = formatClock(left);
    const who = (state.players || []).find(p => p.id === state.currentPlayerId)?.name || '—';
    let pairTag = '';
    try {
      const mm = String((state && state.rules && state.rules.mapMode) || '').toLowerCase();
      const is56 = (mm === 'classic56' || mm === 'classic_5_6' || mm === 'classic-5-6' || mm === 'classic5_6' || mm === 'classic5-6');
      if (is56 && state && state.paired && state.paired.stage) {
        pairTag = ` · ${state.paired.stage === 'p2' ? 'P2' : 'P1'}`;
      }
    } catch (_) {}
    const meta = `${state.paused ? 'Paused' : 'Turn'}: ${who}${pairTag} · ${state.phase}`;
    if (metaEl) metaEl.textContent = meta;
  }

  if (ui.pausedOverlay) ui.pausedOverlay.classList.toggle('hidden', !state.paused);
}

function ensureTimerUiInterval() {
  if (timerUiInterval) return;
  // Update once per second so the countdown is always readable and stable.
  timerUiInterval = setInterval(() => {
    updateTimerInfo();
  }, 1000);
  // Run immediately so you don't wait up to 1s after joining.
  updateTimerInfo();
}

  function updateButtons() {
    const inGame = !!state && state.phase !== 'lobby';

    // Hide in-game HUD cards during lobby.
    if (ui.turnCard) ui.turnCard.classList.toggle('hidden', !inGame);
    if (ui.devCard) ui.devCard.classList.toggle('hidden', !inGame);
    if (ui.resourcesCard) ui.resourcesCard.classList.toggle('hidden', !inGame);
    if (ui.logCard) ui.logCard.classList.toggle('hidden', !inGame || !logPanelOpen);
    const myTurn = inGame && state.currentPlayerId === myPlayerId;

    // Global page state + HUD docking.
    try { document.body.classList.toggle('in-game', inGame); } catch (_) {}
    dockHudToBoard(inGame);

    // IMPORTANT: the board layout (and thus the canvas CSS pixel size) changes when the
    // game transitions into the in-game full-page view. If we don't resync the canvas
    // backing store + transform at that moment, clicks can miss until a manual window
    // resize occurs (people end up hitting F12 / triggering a resize to "fix" it).
    try {
      const r = ui.canvas.getBoundingClientRect();
      const key = `${Math.round(r.width)}x${Math.round(r.height)}`;
      if (key && key !== lastCanvasSizeKey) {
        lastCanvasSizeKey = key;
        resizeCanvas();
      }
    } catch (_) {}

    // Host pause/resume (available during any player's turn)
    const isHostNow = !!(room && myPlayerId && room.hostId === myPlayerId);
    if (ui.pauseBtn) {
      ui.pauseBtn.classList.toggle('hidden', !(inGame && isHostNow));
      ui.pauseBtn.textContent = (state && state.paused) ? 'Resume' : 'Pause';
    }

    // Host-only room ID helper
    if (ui.idsBtn) {
      ui.idsBtn.classList.toggle('hidden', !isHostNow);
      ui.idsBtn.disabled = !isHostNow;
    }

    // Host-only end-game vote
    if (ui.endGameVoteBtn) {
      ui.endGameVoteBtn.classList.toggle('hidden', !(inGame && isHostNow));
      ui.endGameVoteBtn.disabled = !(inGame && isHostNow) || !!(state && state.endVote && state.endVote.id);
    }

    const paused = inGame && !!(state && state.paused);

    if (paused) {
      ui.rollBtn.disabled = true;
      ui.endBtn.disabled = true;
      if (ui.rollDockBtn) ui.rollDockBtn.disabled = true;
      if (ui.endDockBtn) ui.endDockBtn.disabled = true;
      if (ui.rollDock) ui.rollDock.classList.add('hidden');
      ui.buildRoadBtn.disabled = true;
      ui.buildShipBtn.disabled = true;
      if (ui.moveShipBtn) ui.moveShipBtn.disabled = true;
      ui.buildSettlementBtn.disabled = true;
      ui.buildCityBtn.disabled = true;
      if (ui.bankTradeBtn) ui.bankTradeBtn.disabled = true;
      if (ui.playerTradeBtn) ui.playerTradeBtn.disabled = true;
      ui.buyDevBtn.disabled = true;
      setMode(null);
      // still render resources + dev hand (view-only)
      if (!inGame) {
        ui.turnInfo.textContent = room ? 'In lobby. Host can start when ready.' : 'Create or join a lobby.';
        ui.resourcesBox.textContent = '—';
        ui.devHand.textContent = '—';
        return;
      }
      ui.turnInfo.textContent = state.message || '—';
      renderResources();
      renderDevCards();
      if (ui.devRemaining) {
        const n = (state && typeof state.devDeckCount === 'number') ? state.devDeckCount : null;
        ui.devRemaining.textContent = `Dev deck: ${n == null ? '—' : String(n)}`;
      }
      updateTimerInfo();
      return;
    }

    ui.rollBtn.disabled = !(myTurn && state.phase === 'main-await-roll');
    ui.endBtn.disabled = !(myTurn && state.phase === 'main-actions');

    // Duplicate quick-turn buttons (bottom dock)
    if (ui.rollDockBtn) ui.rollDockBtn.disabled = ui.rollBtn.disabled;
    if (ui.endDockBtn) ui.endDockBtn.disabled = ui.endBtn.disabled;
    if (ui.rollDock) {
      const showDock = !!(myTurn && state.phase === 'main-await-roll');
      ui.rollDock.classList.toggle('hidden', !showDock);
    }

    const setupSettlement = myTurn && (state.phase === 'setup1-settlement' || state.phase === 'setup2-settlement');
    const setupRoad = myTurn && (state.phase === 'setup1-road' || state.phase === 'setup2-road');
	    const thiefPick = myTurn && state.phase === 'pirate-or-robber';
    const robber = myTurn && state.phase === 'robber-move';
    const pirateMove = myTurn && state.phase === 'pirate-move';
    const seafarers = ((state && state.rules && state.rules.mapMode) || (room && room.rules && room.rules.mapMode) || 'classic') === 'seafarers';

    const awaiting = state.setup && state.setup.awaiting;
    const awaitingMine = !!(awaiting && awaiting.playerId === myPlayerId);

    // building buttons (main actions, plus initial setup road/ship selection)
    ui.buildRoadBtn.disabled = !((myTurn && state.phase === 'main-actions') || (setupRoad && awaitingMine));
    if (ui.buildShipBtn) {
      ui.buildShipBtn.classList.toggle('hidden', !seafarers);
      ui.buildShipBtn.disabled = !(seafarers && ((myTurn && state.phase === 'main-actions') || (setupRoad && awaitingMine)));
    }
if (ui.moveShipBtn) {
  ui.moveShipBtn.classList.toggle('hidden', !seafarers);
  // Once per turn, any time during your turn (including before rolling).
  let enabled = (seafarers && myTurn && (state.phase === 'main-actions' || state.phase === 'main-await-roll'));
  if (enabled) {
    const used = state.shipMoveUsed && state.shipMoveUsed[myPlayerId] === state.turnNumber;
    enabled = !used;
  }
  ui.moveShipBtn.disabled = !enabled;
}
    ui.buildSettlementBtn.disabled = !(myTurn && state.phase === 'main-actions');
    ui.buildCityBtn.disabled = !(myTurn && state.phase === 'main-actions');

    // Trading
    const mmTrade = String(((state && state.rules && state.rules.mapMode) || (room && room.rules && room.rules.mapMode) || 'classic')).toLowerCase();
    const isClassic56Trade = (mmTrade === 'classic56' || mmTrade === 'classic_5_6' || mmTrade === 'classic-5-6' || mmTrade === 'classic5_6' || mmTrade === 'classic5-6');
    const p2Stage = !!(isClassic56Trade && state && state.paired && state.paired.stage === 'p2');
    if (ui.bankTradeBtn) ui.bankTradeBtn.disabled = !(myTurn && state.phase === 'main-actions');
    if (ui.playerTradeBtn) ui.playerTradeBtn.disabled = !(myTurn && state.phase === 'main-actions') || (myTurn && p2Stage);

    // Dev cards
    const me = myPlayer();
    const devCost = { wool: 1, grain: 1, ore: 1 };
    const deckOk = (state.devDeckCount ?? 0) > 0;
    ui.buyDevBtn.disabled = !(myTurn && state.phase === 'main-actions' && deckOk && me && canAffordClient(me.resources, devCost));

    // setup/robber uses click mode implicitly
    if (setupSettlement) {
      setMode('place_settlement');
    } else if (setupRoad) {
      // default to road, but allow the player to pick ship (Seafarers) during setup if coastal
      const k = inputMode && inputMode.kind;
      if (!(k === 'place_road' || k === 'place_ship')) setMode('place_road');
	    } else if (thiefPick) {
	      setMode('move_thief');
	    } else if (robber) {
      setMode('move_robber');
    } else if (pirateMove) {
      setMode('move_pirate');
    } else {
      setMode(null);
    }

    // Turn info + resources
    if (!inGame) {
      ui.turnInfo.textContent = room ? 'In lobby. Host can start when ready.' : 'Create or join a lobby.';
      ui.resourcesBox.textContent = '—';
      ui.devHand.textContent = '—';
      if (ui.devRemaining) ui.devRemaining.textContent = 'Dev deck: —';
      return;
    }
    ui.turnInfo.textContent = state.message || '—';
    renderResources();
    renderDevCards();
    if (ui.devRemaining) {
      const n = (state && typeof state.devDeckCount === 'number') ? state.devDeckCount : null;
      ui.devRemaining.textContent = `Dev deck: ${n == null ? '—' : String(n)}`;
    }
    updateTimerInfo();
  }

  function renderResources() {
    if (!state) return;
    const box = ui.resourcesBox;
    box.innerHTML = '';

    const seafarers = ((state && state.rules && state.rules.mapMode) || 'classic') === 'seafarers';

    const RES_KEYS = ['brick','lumber','wool','grain','ore'];
    function resIconSrc(k) {
      return `assets/ports/${k}.png`;
    }

    function makeResCell(k, v) {
      const cell = document.createElement('div');
      cell.className = 'resCell';
      const img = document.createElement('img');
      img.className = 'resIcon';
      img.src = resIconSrc(k);
      img.alt = k;
      img.draggable = false;
      const val = document.createElement('span');
      val.className = 'resVal';
      val.textContent = String(v ?? 0);
      cell.appendChild(val);
      cell.appendChild(img);
      return cell;
    }

    function pieceCounts(pid) {
      const edges = state?.geom?.edges || [];
      const nodes = state?.geom?.nodes || [];
      let roadsPlaced = 0;
      let shipsPlaced = 0;
      for (const e of edges) {
        if (!e) continue;
        if (e.roadOwner === pid) roadsPlaced++;
        if (e.shipOwner === pid) shipsPlaced++;
      }
      let settlementsPlaced = 0;
      let citiesPlaced = 0;
      for (const n of nodes) {
        const b = n && n.building;
        if (!b || b.owner !== pid) continue;
        if (b.type === 'settlement') settlementsPlaced++;
        if (b.type === 'city') citiesPlaced++;
      }
      const TOTAL = { roads: 15, ships: 15, settlements: 5, cities: 4 };
      return {
        roadsLeft: Math.max(0, TOTAL.roads - roadsPlaced),
        shipsLeft: Math.max(0, TOTAL.ships - shipsPlaced),
        settlementsLeft: Math.max(0, TOTAL.settlements - settlementsPlaced),
        citiesLeft: Math.max(0, TOTAL.cities - citiesPlaced),
      };
    }

    for (const p of state.players) {
      const wrap = document.createElement('div');
      wrap.className = 'pRes';
      if (p.id === state.currentPlayerId) wrap.classList.add('turnActive');
      const head = document.createElement('div');
      head.className = 'pResHead';

      const left = document.createElement('div');
      left.className = 'pResName';
      const badge = document.createElement('div');
      badge.className = 'badge';
      badge.style.background = p.color;
      const name = document.createElement('div');
      name.textContent = p.name + (p.id === myPlayerId ? ' (you)' : '') + (p.id === state.currentPlayerId ? ' • turn' : '');
      left.appendChild(badge);
      left.appendChild(name);


	      const right = document.createElement('div');
	      right.style.display = 'flex';
	      right.style.flexDirection = 'column';
	      right.style.alignItems = 'flex-end';
	      right.style.gap = '2px';

	      const vp = document.createElement('div');
	      vp.style.fontFamily = 'ui-monospace, monospace';
	      vp.style.color = '#e8eef6';
	      const tags = [];
	      if (state && state.largestArmy && state.largestArmy.playerId === p.id) tags.push('LA');
	      if (state && state.longestRoad && state.longestRoad.playerId === p.id) tags.push('LR');
	      vp.textContent = `VP ${p.vp}${tags.length ? ` • ${tags.join(' • ')}` : ''}`;
	      right.appendChild(vp);

	      // Longest road length (per player)
	      const lrLine = document.createElement('div');
	      lrLine.style.display = 'flex';
	      lrLine.style.alignItems = 'center';
	      lrLine.style.gap = '6px';
	      lrLine.style.fontFamily = 'ui-monospace, monospace';
	      lrLine.style.color = '#e8eef6';

	      const lrIcon = document.createElement('div');
	      lrIcon.style.width = '16px';
	      lrIcon.style.height = '16px';
	      lrIcon.style.borderRadius = '6px';
	      const colIdx2 = playerColorIndex(p.color);
	      const src = STRUCT_IMG_SRC[colIdx2] || STRUCT_IMG_SRC[0];
	      lrIcon.style.backgroundImage = `url('${src}')`;
	      lrIcon.style.backgroundSize = '200% 200%';
	      const pos = tokenBgPosPct('road');
	      lrIcon.style.backgroundPosition = `${pos.x}% ${pos.y}%`;
	      lrIcon.title = 'Longest road length';

	      const lrVal = document.createElement('span');
	      lrVal.textContent = String(Math.max(0, p.longestRoadLen || 0));
	      lrLine.appendChild(lrIcon);
	      lrLine.appendChild(lrVal);
	      right.appendChild(lrLine);

	      head.appendChild(left);
	      head.appendChild(right);

      const grid = document.createElement('div');
      grid.className = 'pResGrid';

      const isMe = p.id === myPlayerId;
      if (isMe) {
        for (const k of RES_KEYS) {
          grid.appendChild(makeResCell(k, p.resources?.[k] ?? 0));
        }
      } else {
        const hand = p.handCount ?? 0;
        const dev = p.devCount ?? 0;
        const cell1 = document.createElement('div');
        cell1.textContent = `CARDS:${String(hand).padStart(2,' ')}`;
        const cell2 = document.createElement('div');
        cell2.textContent = `DEV:${String(dev).padStart(2,' ')}`;
        grid.appendChild(cell1);
        grid.appendChild(cell2);
        // pad to keep the grid layout stable
        for (let i = 0; i < 3; i++) grid.appendChild(document.createElement('div'));
      }

      // Public piece counts (how many remain)
      const pc = pieceCounts(p.id);
      const pgrid = document.createElement('div');
      pgrid.className = 'pPieceGrid';

      const colIdx = playerColorIndex(p.color);
      function makePieceCell(kind, count) {
        const cell = document.createElement('div');
        cell.className = 'pieceCell';

        const left = document.createElement('div');
        left.className = 'pieceLeft';

        const icon = document.createElement('div');
        icon.className = 'pieceIcon';
        const src = STRUCT_IMG_SRC[colIdx] || STRUCT_IMG_SRC[0];
        icon.style.backgroundImage = `url('${src}')`;
        icon.style.backgroundSize = '200% 200%';
        const pos = tokenBgPosPct(kind);
        icon.style.backgroundPosition = `${pos.x}% ${pos.y}%`;

        const val = document.createElement('span');
        val.className = 'pieceVal';
        val.textContent = String(count);

        left.appendChild(val);
        left.appendChild(icon);
        cell.appendChild(left);
        return cell;
      }
      // Piece icons: settlement/city/road/ship (2x2 per-color sheet)
      pgrid.appendChild(makePieceCell('road', pc.roadsLeft));
      pgrid.appendChild(makePieceCell('ship', seafarers ? pc.shipsLeft : '--'));
      pgrid.appendChild(makePieceCell('settlement', pc.settlementsLeft));
      pgrid.appendChild(makePieceCell('city', pc.citiesLeft));
      wrap.appendChild(head);
      wrap.appendChild(grid);
      // Only show piece counts to the owning player.
      if (isMe) wrap.appendChild(pgrid);
      box.appendChild(wrap);
    }

    // Bank resources (visible to all)
    const bankWrap = document.createElement('div');
    bankWrap.className = 'bankRes';
    const bh = document.createElement('div');
    bh.className = 'bankResHead';
    bh.textContent = 'Bank resources';
    bankWrap.appendChild(bh);
    const bgrid = document.createElement('div');
    bgrid.className = 'pResGrid';
    for (const k of RES_KEYS) {
      bgrid.appendChild(makeResCell(k, (state.bank && state.bank[k]) ?? 0));
    }
    bankWrap.appendChild(bgrid);
    box.appendChild(bankWrap);
  }

  function renderDevCards() {
    if (!state) return;
    const me = myPlayer();
    const box = ui.devHand;
    box.innerHTML = '';

    if (!me) {
      box.textContent = '—';
      return;
    }

    const hand = Array.isArray(me.devCards) ? me.devCards : [];
    if (hand.length === 0) {
      box.textContent = 'No development cards.';
      return;
    }

    const myTurn = state.currentPlayerId === myPlayerId;
    const canPlayPhase = myTurn && state.phase === 'main-actions';

    for (const card of hand) {
      const row = document.createElement('div');
      row.className = 'devRow';

      const left = document.createElement('div');
      left.className = 'devLeft';

      const thumb = document.createElement('img');
      thumb.className = 'devThumb';
      thumb.src = DEV_IMG[card.type] || '';
      thumb.alt = prettyCardName(card.type);

      const text = document.createElement('div');
      text.style.minWidth = '0';
      const name = document.createElement('div');
      name.className = 'devName';
      name.textContent = prettyCardName(card.type);
      const meta = document.createElement('div');
      meta.className = 'devMeta';

      const isVP = card.type === 'victory_point';
      const isNew = (card.boughtTurn === state.turnNumber);
      const alreadyPlayedThisTurn = (me.devPlayedTurn === state.turnNumber);
      const blockedByNew = (!isVP && isNew);
      const blockedByLimit = (!isVP && alreadyPlayedThisTurn);
      const playable = !card.played && ((isVP && myTurn) || (!isVP && canPlayPhase && !blockedByNew && !blockedByLimit));

      if (card.played) meta.textContent = 'Used.';
      else if (isVP) meta.textContent = 'Playable any time on your turn.';
      else if (!myTurn) meta.textContent = 'Wait for your turn.';
      else if (!canPlayPhase) meta.textContent = 'Roll first.';
      else if (blockedByNew) meta.textContent = 'New (can’t play this turn).';
      else if (blockedByLimit) meta.textContent = 'Already played a dev card this turn.';
      else meta.textContent = 'Ready.';

      text.appendChild(name);
      text.appendChild(meta);
      left.appendChild(thumb);
      left.appendChild(text);

      const right = document.createElement('div');
      right.className = 'devRight';
      if (card.played) {
        const t = document.createElement('span');
        t.className = 'tag';
        t.textContent = 'played';
        right.appendChild(t);
      } else {
        const play = document.createElement('button');
        play.className = 'btn' + (playable ? ' primary' : '');
        play.textContent = 'Play';
        play.disabled = !playable;
        play.addEventListener('click', () => playDevCard(card));
        right.appendChild(play);
      }

      row.appendChild(left);
      row.appendChild(right);
      box.appendChild(row);
    }
  }

  // -------------------- Trading UI --------------------

  let lastTradePromptIdSeen = 0;
  let lastEndVotePromptIdSeen = 0;
  // When the trade proposer hits "Revise Trade" from the proposed-trade popup,
  // we keep track of which trade is being replaced so the server can atomically
  // close the old offer and broadcast the updated one.
  let revisingTradeId = null;

  function playerHasPortClient(pid, port) {
    const nodes = state?.geom?.nodes || [];
    for (const nid of (port.nodeIds || [])) {
      const b = nodes[nid]?.building;
      if (b && b.owner === pid) return true;
    }
    return false;
  }

  function portsForPlayer(pid) {
    const ports = state?.geom?.ports || [];
    return ports.filter(p => playerHasPortClient(pid, p));
  }

  function tradeRatioForClient(giveKind) {
    let ratio = 4;
    for (const p of portsForPlayer(myPlayerId)) {
      if (p.kind === 'generic') ratio = Math.min(ratio, 3);
      if (p.kind === giveKind) ratio = Math.min(ratio, 2);
    }
    return ratio;
  }

  function portLabel(p) {
    if (!p) return '';
    if (p.kind === 'generic') return '3:1 (any)';
    return `2:1 (${p.kind})`;
  }

  function openBankTradeModal() {
    if (!state || !myPlayerId) return;
    const me = myPlayer();
    if (!me) return;

    const wrap = document.createElement('div');
    wrap.className = 'tradeWrap';

    const ports = portsForPlayer(myPlayerId);
    const portLine = document.createElement('div');
    portLine.className = 'smallNote';
    portLine.textContent = ports.length ? `Your ports: ${ports.map(portLabel).join(', ')}` : 'Your ports: none (default 4:1)';
    wrap.appendChild(portLine);

    const bankBox = document.createElement('div');
    bankBox.className = 'tradeBox';
    bankBox.innerHTML = `<div class="tradeTitle">Bank / Port trade</div>`;

    const row = document.createElement('div');
    row.className = 'tradeRow';

    const giveSel = document.createElement('select');
    const takeSel = document.createElement('select');
    const qty = document.createElement('input');
    qty.type = 'number';
    qty.min = '1';
    qty.value = '1';
    qty.className = 'input';
    qty.style.maxWidth = '90px';

    const keys = ['brick','lumber','wool','grain','ore'];
    for (const k of keys) {
      const o1 = document.createElement('option');
      o1.value = k; o1.textContent = k;
      giveSel.appendChild(o1);
      const o2 = document.createElement('option');
      o2.value = k; o2.textContent = k;
      takeSel.appendChild(o2);
    }
    takeSel.value = 'grain';

    row.appendChild(labelNode('Give'));
    row.appendChild(giveSel);
    row.appendChild(labelNode('Get'));
    row.appendChild(takeSel);
    row.appendChild(labelNode('Qty'));
    row.appendChild(qty);
    bankBox.appendChild(row);

    const bankInfo = document.createElement('div');
    bankInfo.className = 'smallNote';
    bankBox.appendChild(bankInfo);

    const forceRow = document.createElement('label');
    forceRow.style.display = 'flex';
    forceRow.style.gap = '8px';
    forceRow.style.alignItems = 'center';
    forceRow.style.marginTop = '6px';
    forceRow.style.color = '#aab4c2';
    forceRow.style.fontSize = '12px';
    const force4 = document.createElement('input');
    force4.type = 'checkbox';
    force4.checked = false;
    forceRow.appendChild(force4);
    forceRow.appendChild(document.createTextNode('Force 4:1 (ignore ports)'));
    bankBox.appendChild(forceRow);

    function updateBankInfo() {
      const g = giveSel.value;
      const q = Math.max(1, Math.floor(Number(qty.value || 1)));
      qty.value = String(q);
      const r = force4.checked ? 4 : tradeRatioForClient(g);
      bankInfo.textContent = `Rate: ${r}:1 — Cost: ${r * q} ${g} for ${q} ${takeSel.value}.`;
    }
    giveSel.addEventListener('change', updateBankInfo);
    takeSel.addEventListener('change', updateBankInfo);
    qty.addEventListener('input', updateBankInfo);
    force4.addEventListener('change', updateBankInfo);
    updateBankInfo();

    wrap.appendChild(bankBox);

    openModal({
      title: 'Bank Trade',
      bodyNode: wrap,
      actions: [
        { label: 'Close', onClick: closeModal },
        { label: 'Trade', primary: true, onClick: () => {
          const giveKind = giveSel.value;
          const takeKind = takeSel.value;
          const takeQty = Math.max(1, Math.floor(Number(qty.value || 1)));
          closeModal();
          sendGameAction({ kind: 'bank_trade', giveKind, takeKind, takeQty, forceRatio: force4.checked ? 4 : null });
        } },
      ]
    });
  }

  function resIconSrcForTrade(k) {
    return `assets/ports/${k}.png`;
  }

  function openPendingTradeModal(forceOpen = false) {
    if (!state || !state.pendingTrade || !myPlayerId) return;
    const t = state.pendingTrade;

    // Don't interrupt other locked flows
    if (!forceOpen && !ui.modal.classList.contains('hidden') && modalType !== 'pendingTrade') return;

    const proposer = (state.players || []).find(p => p.id === t.fromId) || null;

    const wrap = document.createElement('div');
    wrap.className = 'tradeWrap';

    const box = document.createElement('div');
    box.className = 'tradeBox';
    box.innerHTML = `<div class="tradeTitle">Proposed Trade</div>`;

    // --- Header: proposer + delta chips (net from acceptor's perspective)
    const head = document.createElement('div');
    head.className = 'ptHead';

    const left = document.createElement('div');
    left.className = 'ptProposer';
    const badge = document.createElement('div');
    badge.className = 'badge';
    badge.style.background = proposer ? proposer.color : '#777';
    const nm = document.createElement('div');
    nm.className = 'ptName';
    nm.textContent = proposer ? proposer.name : 'Player';
    left.appendChild(badge);
    left.appendChild(nm);

    const chips = document.createElement('div');
    chips.className = 'ptChips';

    for (const k of ['brick','lumber','wool','grain','ore']) {
      const giveN = Number((t.offer && t.offer[k]) || 0);
      const getN = Number((t.request && t.request[k]) || 0);
      // Show from the perspective of a player accepting the trade.
      // If the proposer would net (request - offer), the acceptor nets the opposite.
      const delta = giveN - getN; // acceptor net
      const chip = document.createElement('div');
      chip.className = 'resChip' + (delta > 0 ? ' pos' : (delta < 0 ? ' neg' : ' zero'));
      const img = document.createElement('img');
      img.src = resIconSrcForTrade(k);
      img.alt = k;
      img.draggable = false;
      const val = document.createElement('div');
      val.className = 'delta';
      val.textContent = `${delta >= 0 ? '+' : ''}${delta}`;
      chip.appendChild(img);
      chip.appendChild(val);
      chips.appendChild(chip);
    }

    head.appendChild(left);
    head.appendChild(chips);
    box.appendChild(head);

    // --- Grid: players + approve/reject
    const grid = document.createElement('div');
    grid.className = 'ptGrid';

    const h1 = document.createElement('div');
    h1.className = 'ptCell ptHeader';
    h1.textContent = '';
    const h2 = document.createElement('div');
    h2.className = 'ptCell ptHeader';
    h2.textContent = 'Approve';
    const h3 = document.createElement('div');
    h3.className = 'ptCell ptHeader';
    h3.textContent = 'Reject';
    grid.appendChild(h1); grid.appendChild(h2); grid.appendChild(h3);

    const responses = (t.responses || {});
    const isProposer = myPlayerId === t.fromId;

    for (const p of (state.players || [])) {
      const nameCell = document.createElement('div');
      nameCell.className = 'ptCell ptNameCell';
      const rowBadge = document.createElement('div');
      rowBadge.className = 'badge';
      rowBadge.style.background = p.color;
      const rowName = document.createElement('div');
      rowName.className = 'ptRowName';
      rowName.textContent = p.name;
      nameCell.appendChild(rowBadge);
      nameCell.appendChild(rowName);

      const approveCell = document.createElement('div');
      approveCell.className = 'ptCell ptVoteCell';
      const rejectCell = document.createElement('div');
      rejectCell.className = 'ptCell ptVoteCell';

      if (p.id === t.fromId) {
        // proposer row: no votes
        approveCell.innerHTML = '';
        rejectCell.innerHTML = '';
      } else {
        const status = responses[p.id] || null;

        // Approve button/icon
        const approveBtn = document.createElement('button');
        approveBtn.className = 'voteBtn' + (status === 'accept' ? ' on ok' : '');
        approveBtn.type = 'button';
        approveBtn.innerHTML = status === 'accept' ? '✔' : '';
        approveBtn.title = status === 'accept' ? 'Approved' : 'Approve';

        // Reject button/icon
        const rejectBtn = document.createElement('button');
        rejectBtn.className = 'voteBtn' + (status === 'reject' ? ' on bad' : '');
        rejectBtn.type = 'button';
        rejectBtn.innerHTML = status === 'reject' ? '✖' : '';
        rejectBtn.title = status === 'reject' ? 'Rejected' : 'Reject';

        const isMeRow = p.id === myPlayerId;
        if (isMeRow && !isProposer) {
          approveBtn.disabled = false;
          rejectBtn.disabled = false;

          approveBtn.addEventListener('click', () => {
            sendGameAction({ kind: 'respond_trade', tradeId: t.id, accept: true });
          });
          rejectBtn.addEventListener('click', () => {
            sendGameAction({ kind: 'respond_trade', tradeId: t.id, accept: false });
          });
        } else if (isProposer) {
          // proposer can finalize by clicking an accepted player's checkmark
          approveBtn.disabled = !(status === 'accept');
          rejectBtn.disabled = true;

          approveBtn.addEventListener('click', () => {
            if (status !== 'accept') return;
            sendGameAction({ kind: 'finalize_trade', tradeId: t.id, withPlayerId: p.id });
          });
        } else {
          // other players: read-only
          approveBtn.disabled = true;
          rejectBtn.disabled = true;
        }

        approveCell.appendChild(approveBtn);
        rejectCell.appendChild(rejectBtn);
      }

      grid.appendChild(nameCell);
      grid.appendChild(approveCell);
      grid.appendChild(rejectCell);
    }

    box.appendChild(grid);
    wrap.appendChild(box);

    modalType = 'pendingTrade';
    modalLocked = false;

    const modalActions = [];
    if (isProposer) {
      modalActions.push({
        label: 'Revise Trade',
        onClick: () => {
          revisingTradeId = t.id;
          closeModal();
          // Open the proposer editor with the current offer/request prefilled.
          openPlayerTradeModal({
            reviseOfTradeId: t.id,
            initOffer: (t.offer || {}),
            initRequest: (t.request || {}),
          });
        }
      });
    }
    modalActions.push({ label: 'Close', onClick: closeModal });

    openModal({
      title: 'Player Trade',
      bodyNode: wrap,
      actions: modalActions
    });
  }


  function openEndGameVoteModal(forceOpen = false) {
    if (!state || !state.endVote || !myPlayerId) return;
    const v = state.endVote;

    // Don't interrupt other locked flows
    if (!forceOpen && !ui.modal.classList.contains('hidden') && modalType !== 'endVote') return;

    const proposer = (state.players || []).find(p => p.id === v.fromId) || null;

    const wrap = document.createElement('div');
    wrap.className = 'tradeWrap';

    const box = document.createElement('div');
    box.className = 'tradeBox';
    box.innerHTML = `<div class="tradeTitle">End Game Vote</div>`;
    wrap.appendChild(box);

    const info = document.createElement('div');
    info.className = 'smallNote';
    info.textContent = (proposer ? `${proposer.name} (host)` : 'Host') + ' wants to end the game early. Everyone must approve.';
    box.appendChild(info);

    const grid = document.createElement('div');
    grid.className = 'ptGrid';

    const h1 = document.createElement('div');
    h1.className = 'ptCell ptHeader';
    h1.textContent = '';
    const h2 = document.createElement('div');
    h2.className = 'ptCell ptHeader';
    h2.textContent = 'Approve';
    const h3 = document.createElement('div');
    h3.className = 'ptCell ptHeader';
    h3.textContent = 'Reject';
    grid.appendChild(h1); grid.appendChild(h2); grid.appendChild(h3);

    const responses = (v.responses || {});
    for (const p of (state.players || [])) {
      const nameCell = document.createElement('div');
      nameCell.className = 'ptCell ptNameCell';
      const rowBadge = document.createElement('div');
      rowBadge.className = 'badge';
      rowBadge.style.background = p.color;
      const rowName = document.createElement('div');
      rowName.className = 'ptRowName';
      rowName.textContent = p.name + (p.id === v.fromId ? ' (host)' : '');
      nameCell.appendChild(rowBadge);
      nameCell.appendChild(rowName);

      const approveCell = document.createElement('div');
      approveCell.className = 'ptCell ptVoteCell';
      const rejectCell = document.createElement('div');
      rejectCell.className = 'ptCell ptVoteCell';

      const status = responses[p.id] || null;

      const approveBtn = document.createElement('button');
      approveBtn.className = 'voteBtn' + (status === 'accept' ? ' on ok' : '');
      approveBtn.type = 'button';
      approveBtn.innerHTML = status === 'accept' ? '✔' : '';
      approveBtn.title = status === 'accept' ? 'Approved' : 'Approve';

      const rejectBtn = document.createElement('button');
      rejectBtn.className = 'voteBtn' + (status === 'reject' ? ' on bad' : '');
      rejectBtn.type = 'button';
      rejectBtn.innerHTML = status === 'reject' ? '✖' : '';
      rejectBtn.title = status === 'reject' ? 'Rejected' : 'Reject';

      const isMeRow = (p.id === myPlayerId);
      if (isMeRow) {
        approveBtn.disabled = false;
        rejectBtn.disabled = false;

        approveBtn.addEventListener('click', () => {
          sendGameAction({ kind: 'respond_endgame', voteId: v.id, accept: true });
        });
        rejectBtn.addEventListener('click', () => {
          sendGameAction({ kind: 'respond_endgame', voteId: v.id, accept: false });
        });
      } else {
        approveBtn.disabled = true;
        rejectBtn.disabled = true;
      }

      approveCell.appendChild(approveBtn);
      rejectCell.appendChild(rejectBtn);

      grid.appendChild(nameCell);
      grid.appendChild(approveCell);
      grid.appendChild(rejectCell);
    }

    box.appendChild(grid);

    modalType = 'endVote';
    modalLocked = false;
    activeToolModal = null;

    openModal({
      title: 'End Game Vote',
      bodyNode: wrap,
      actions: [
        { label: 'Close', onClick: closeModal }
      ]
    });
  }


  function openPlayerTradeModal(opts = null) {
    if (!state || !myPlayerId) return;
    const me = myPlayer();
    if (!me) return;

    const reviseOfTradeId = opts && opts.reviseOfTradeId ? Number(opts.reviseOfTradeId) : 0;

    // If there's an active proposed trade, show it (unless we are revising it)
    if (!reviseOfTradeId && state.pendingTrade && state.pendingTrade.id) {
      openPendingTradeModal(true);
      return;
    }

    const wrap = document.createElement('div');
    wrap.className = 'tradeWrap';

    const playerBox = document.createElement('div');
    playerBox.className = 'tradeBox';
    playerBox.innerHTML = `<div class="tradeTitle">Player trade (multi‑unit)</div>`;

    const recv = { brick:0, lumber:0, wool:0, grain:0, ore:0 };
    const give = { brick:0, lumber:0, wool:0, grain:0, ore:0 };

    // Prefill when revising an existing pending trade.
    if (opts && (opts.initOffer || opts.initRequest)) {
      const io = opts.initOffer || {};
      const ir = opts.initRequest || {};
      for (const k of ['brick','lumber','wool','grain','ore']) {
        give[k] = Math.max(0, Math.floor(Number(io[k] || 0)));
        recv[k] = Math.max(0, Math.floor(Number(ir[k] || 0)));
      }
    }

    function makeChip(k, getVal, setVal, signMode) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'resChipBtn';
      chip.title = 'Click +1 · Shift‑click −1';
      chip.addEventListener('click', (ev) => {
        const down = !!ev.shiftKey;
        const v = Number(getVal() || 0);
        const next = Math.max(0, v + (down ? -1 : 1));
        setVal(next);
        refresh();
      });
      chip.addEventListener('contextmenu', (ev) => {
        ev.preventDefault();
        const v = Number(getVal() || 0);
        const next = Math.max(0, v - 1);
        setVal(next);
        refresh();
      });

      const img = document.createElement('img');
      img.src = resIconSrcForTrade(k);
      img.alt = k;
      img.draggable = false;

      const val = document.createElement('div');
      val.className = 'delta';

      chip.appendChild(img);
      chip.appendChild(val);

      return {
        node: chip,
        update: () => {
          const n = Number(getVal() || 0);
          const shown = (signMode === 'minus') ? -n : n;
          chip.classList.toggle('pos', shown > 0);
          chip.classList.toggle('neg', shown < 0);
          chip.classList.toggle('zero', shown === 0);
          val.textContent = `${shown >= 0 ? '+' : ''}${shown}`;
        }
      };
    }

    const rows = document.createElement('div');
    rows.className = 'gTradeRows';

    function makeRow(kindLabel, arrowKind) {
      const row = document.createElement('div');
      row.className = 'gTradeRow';

      const chipsWrap = document.createElement('div');
      chipsWrap.className = 'gTradeChips';

      const chips = [];
      for (const k of ['brick','lumber','wool','grain','ore']) {
        const src = (arrowKind === 'down') ? recv : give;
        const sign = (arrowKind === 'down') ? 'plus' : 'minus';
        const c = makeChip(k, () => src[k], (v) => { src[k] = v; }, sign);
        chips.push(c);
        chipsWrap.appendChild(c.node);
      }

      const arrow = document.createElement('div');
      arrow.className = 'gTradeArrow ' + (arrowKind === 'down' ? 'ok' : 'bad');
      arrow.textContent = arrowKind === 'down' ? '⬇' : '⬆';

      row.appendChild(chipsWrap);
      row.appendChild(arrow);

      return { row, chips };
    }

    const topRow = makeRow('You receive', 'down');
    const bottomRow = makeRow('You give', 'up');
    rows.appendChild(topRow.row);
    rows.appendChild(bottomRow.row);

    playerBox.appendChild(rows);
    wrap.appendChild(playerBox);

    function totals(m) {
      let t = 0;
      for (const k of ['brick','lumber','wool','grain','ore']) t += (m[k] || 0);
      return t;
    }

    function getOffer() {
      const out = {};
      for (const k of ['brick','lumber','wool','grain','ore']) {
        const n = Math.max(0, Math.floor(Number(give[k] || 0)));
        if (n > 0) out[k] = n;
      }
      return out;
    }
    function getRequest() {
      const out = {};
      for (const k of ['brick','lumber','wool','grain','ore']) {
        const n = Math.max(0, Math.floor(Number(recv[k] || 0)));
        if (n > 0) out[k] = n;
      }
      return out;
    }

    let proposeBtn = null;

    function refresh() {
      for (const c of [...topRow.chips, ...bottomRow.chips]) c.update();
      if (proposeBtn) {
        const offer = getOffer();
        const request = getRequest();
        proposeBtn.disabled = (totals(offer) === 0 || totals(request) === 0);
      }
    }

    openModal({
      title: reviseOfTradeId ? 'Revise Trade' : 'Player Trade',
      bodyNode: wrap,
      actions: [
        { label: 'Close', onClick: closeModal },
        { label: 'Propose', primary: true, onClick: () => {
          const offer = getOffer();
          const request = getRequest();
          closeModal();
          const payload = { kind: 'propose_trade', offer, request };
          if (reviseOfTradeId) payload.replaceTradeId = reviseOfTradeId;
          sendGameAction(payload);
          if (reviseOfTradeId && revisingTradeId === reviseOfTradeId) revisingTradeId = null;
        }, disabled: false },
      ]
    });

    // Grab the propose button to enable/disable
    try {
      const btns = ui.modalActions.querySelectorAll('button');
      proposeBtn = btns && btns.length ? btns[btns.length - 1] : null;
    } catch {}
    refresh();
  }


  function openTradeModal() {
    if (!state || !myPlayerId) return;
    const me = myPlayer();
    if (!me) return;

    const wrap = document.createElement('div');
    wrap.className = 'tradeWrap';

    const ports = portsForPlayer(myPlayerId);
    const portLine = document.createElement('div');
    portLine.className = 'smallNote';
    portLine.textContent = ports.length ? `Your ports: ${ports.map(portLabel).join(', ')}` : 'Your ports: none (default 4:1)';
    wrap.appendChild(portLine);

    // --- Bank trade
    const bankBox = document.createElement('div');
    bankBox.className = 'tradeBox';
    bankBox.innerHTML = `<div class="tradeTitle">Bank / Port trade</div>`;

    const row = document.createElement('div');
    row.className = 'tradeRow';

    const giveSel = document.createElement('select');
    const takeSel = document.createElement('select');
    const qty = document.createElement('input');
    qty.type = 'number';
    qty.min = '1';
    qty.value = '1';
    qty.className = 'input';
    qty.style.maxWidth = '90px';

    const keys = ['brick','lumber','wool','grain','ore'];
    for (const k of keys) {
      const o1 = document.createElement('option');
      o1.value = k; o1.textContent = k;
      giveSel.appendChild(o1);
      const o2 = document.createElement('option');
      o2.value = k; o2.textContent = k;
      takeSel.appendChild(o2);
    }
    takeSel.value = 'grain';

    row.appendChild(labelNode('Give'));
    row.appendChild(giveSel);
    row.appendChild(labelNode('Get'));
    row.appendChild(takeSel);
    row.appendChild(labelNode('Qty'));
    row.appendChild(qty);
    bankBox.appendChild(row);

    const bankInfo = document.createElement('div');
    bankInfo.className = 'smallNote';
    bankBox.appendChild(bankInfo);

    // Optional: force a classic 4:1 bank trade even if ports are owned
    const forceRow = document.createElement('label');
    forceRow.style.display = 'flex';
    forceRow.style.gap = '8px';
    forceRow.style.alignItems = 'center';
    forceRow.style.marginTop = '6px';
    forceRow.style.color = '#aab4c2';
    forceRow.style.fontSize = '12px';
    const force4 = document.createElement('input');
    force4.type = 'checkbox';
    force4.checked = false;
    forceRow.appendChild(force4);
    forceRow.appendChild(document.createTextNode('Force 4:1 (ignore ports)'));
    bankBox.appendChild(forceRow);

    function updateBankInfo() {
      const g = giveSel.value;
      const q = Math.max(1, Math.floor(Number(qty.value || 1)));
      qty.value = String(q);
      const r = force4.checked ? 4 : tradeRatioForClient(g);
      bankInfo.textContent = `Rate: ${r}:1 — Cost: ${r * q} ${g} for ${q} ${takeSel.value}.`;
    }
    giveSel.addEventListener('change', updateBankInfo);
    takeSel.addEventListener('change', updateBankInfo);
    qty.addEventListener('input', updateBankInfo);
    force4.addEventListener('change', updateBankInfo);
    updateBankInfo();

    wrap.appendChild(bankBox);

    // --- Player trade
    const playerBox = document.createElement('div');
    playerBox.className = 'tradeBox';
    playerBox.innerHTML = `<div class="tradeTitle">Player trade (multi‑unit)</div>`;

    const targetRow = document.createElement('div');
    targetRow.className = 'tradeRow';
    const toSel = document.createElement('select');
    for (const p of (state.players || [])) {
      if (p.id === myPlayerId) continue;
      const o = document.createElement('option');
      o.value = p.id;
      o.textContent = p.name;
      toSel.appendChild(o);
    }
    targetRow.appendChild(labelNode('To'));
    targetRow.appendChild(toSel);
    playerBox.appendChild(targetRow);

    const grids = document.createElement('div');
    grids.className = 'tradeGrids';
    const offerGrid = tradeQtyGrid('You give');
    const reqGrid = tradeQtyGrid('You get');
    grids.appendChild(offerGrid.wrap);
    grids.appendChild(reqGrid.wrap);
    playerBox.appendChild(grids);

    wrap.appendChild(playerBox);

    openModal({
      title: 'Trade',
      bodyNode: wrap,
      actions: [
        { label: 'Close', onClick: closeModal },
        { label: 'Bank Trade', primary: true, onClick: () => {
          const giveKind = giveSel.value;
          const takeKind = takeSel.value;
          const takeQty = Math.max(1, Math.floor(Number(qty.value || 1)));
          closeModal();
          sendGameAction({ kind: 'bank_trade', giveKind, takeKind, takeQty, forceRatio: force4.checked ? 4 : null });
        } },
        { label: 'Propose Player Trade', onClick: () => {
          const toPlayerId = toSel.value;
          const offer = offerGrid.get();
          const request = reqGrid.get();
          closeModal();
          sendGameAction({ kind: 'propose_trade', offer, request });
        } },
      ]
    });
  }

  function labelNode(txt) {
    const d = document.createElement('div');
    d.className = 'labelTiny';
    d.style.minWidth = '50px';
    d.textContent = txt;
    return d;
  }

  function tradeQtyGrid(title) {
    const wrap = document.createElement('div');
    wrap.className = 'tradeGrid';
    const h = document.createElement('div');
    h.className = 'labelTiny';
    h.textContent = title;
    wrap.appendChild(h);

    const g = document.createElement('div');
    g.className = 'tradeGridInner';
    const inputs = {};
    for (const k of ['brick','lumber','wool','grain','ore']) {
      const cell = document.createElement('div');
      cell.className = 'tradeCell';
      const lab = document.createElement('div');
      lab.className = 'tradeCellLab';
      lab.textContent = k;
      const inp = document.createElement('input');
      inp.type = 'number';
      inp.min = '0';
      inp.value = '0';
      inp.className = 'input';
      inp.style.maxWidth = '80px';
      inputs[k] = inp;
      cell.appendChild(lab);
      cell.appendChild(inp);
      g.appendChild(cell);
    }
    wrap.appendChild(g);
    return {
      wrap,
      get: () => {
        const out = {};
        let total = 0;
        for (const [k, inp] of Object.entries(inputs)) {
          const n = Math.max(0, Math.floor(Number(inp.value || 0)));
          inp.value = String(n);
          if (n > 0) { out[k] = n; total += n; }
        }
        if (total === 0) return {};
        return out;
      }
    };
  }

  function handlePendingTradePrompt() {
    if (!state || !myPlayerId) return;

    const t = state.pendingTrade;

    // If trade cleared, close any open trade modal
    if (!t || !t.id) {
      if (modalType === 'pendingTrade') forceCloseModal();
      return;
    }

    // Keep the proposed-trade modal live-updated while it's open
    if (modalType === 'pendingTrade' && !ui.modal.classList.contains('hidden')) {
      openPendingTradeModal(true);
      return;
    }

    // Don't interrupt other modals
    if (!ui.modal.classList.contains('hidden')) return;

    if (t.id <= lastTradePromptIdSeen) return;
    lastTradePromptIdSeen = t.id;

    openPendingTradeModal(true);
  }



  function handleEndGameVotePrompt() {
    if (!state || !myPlayerId) return;

    const v = state.endVote;

    // If vote cleared, close any open end-vote modal
    if (!v || !v.id) {
      if (modalType === 'endVote') forceCloseModal();
      return;
    }

    // Keep the end-vote modal live-updated while it's open
    if (modalType === 'endVote' && !ui.modal.classList.contains('hidden')) {
      openEndGameVoteModal(true);
      return;
    }

    // Don't interrupt other modals
    if (!ui.modal.classList.contains('hidden')) return;

    if (v.id <= lastEndVotePromptIdSeen) return;
    lastEndVotePromptIdSeen = v.id;

    openEndGameVoteModal(true);
  }


function handleDiscardPrompt() {
  if (!state || !myPlayerId) return;
  const disc = state.discard;
  const req = disc && disc.required && disc.required[myPlayerId];
  const done = disc && disc.done && disc.done[myPlayerId];

  const needsDiscard = !!req && !done;
  if (!needsDiscard) {
    if (modalType === 'discard') forceCloseModal();
    return;
  }

  const discId = Number(disc.id || 0);
  if (modalType === 'discard' && discId === lastDiscardPromptId && !ui.modal.classList.contains('hidden')) return;
  lastDiscardPromptId = discId;

  if (!ui.modal.classList.contains('hidden') && modalType !== 'discard') forceCloseModal();

  const me = (state.players || []).find(p => p.id === myPlayerId);
  const avail = (me && me.resources) || { brick:0, lumber:0, wool:0, grain:0, ore:0 };
  const sel = { brick:0, lumber:0, wool:0, grain:0, ore:0 };

  const wrap = document.createElement('div');
  const top = document.createElement('div');
  top.style.marginBottom = '8px';
  top.textContent = `Discard ${req} card${req === 1 ? '' : 's'} (manual selection).`;
  wrap.appendChild(top);

  const grid = document.createElement('div');
  grid.className = 'discardGrid';
  wrap.appendChild(grid);

  const footer = document.createElement('div');
  footer.style.display = 'flex';
  footer.style.justifyContent = 'space-between';
  footer.style.alignItems = 'center';
  footer.style.gap = '10px';
  footer.style.marginTop = '12px';

  const totalPill = document.createElement('div');
  totalPill.className = 'countPill';
  footer.appendChild(totalPill);

  const submit = document.createElement('button');
  submit.className = 'btn primary';
  submit.textContent = 'Discard';
  submit.disabled = true;
  footer.appendChild(submit);

  wrap.appendChild(footer);

  function totalSel() {
    return sel.brick + sel.lumber + sel.wool + sel.grain + sel.ore;
  }

  function rebuild() {
    grid.innerHTML = '';
    const rows = [
      ['brick','Brick'],
      ['lumber','Lumber'],
      ['wool','Wool'],
      ['grain','Grain'],
      ['ore','Ore'],
    ];

    for (const [k,label] of rows) {
      const row = document.createElement('div');
      row.className = 'discardRow';

      const left = document.createElement('div');
      left.className = 'discardLabel';
      left.textContent = `${label} (have ${avail[k] || 0})`;
      row.appendChild(left);

      const controls = document.createElement('div');
      controls.className = 'discardControls';

      const minus = document.createElement('button');
      minus.className = 'stepBtn';
      minus.textContent = '−';
      minus.disabled = (sel[k] <= 0);
      minus.addEventListener('click', () => {
        sel[k] = Math.max(0, (sel[k] || 0) - 1);
        rebuild();
      });

      const pill = document.createElement('div');
      pill.className = 'countPill';
      pill.textContent = `${sel[k] || 0}`;

      const plus = document.createElement('button');
      plus.className = 'stepBtn';
      plus.textContent = '+';
      const maxForK = Math.min(avail[k] || 0, (sel[k] || 0) + Math.max(0, req - totalSel()));
      plus.disabled = (totalSel() >= req) || ((sel[k] || 0) >= (avail[k] || 0));
      plus.addEventListener('click', () => {
        if (totalSel() >= req) return;
        if ((sel[k] || 0) >= (avail[k] || 0)) return;
        sel[k] = (sel[k] || 0) + 1;
        rebuild();
      });

      controls.appendChild(minus);
      controls.appendChild(pill);
      controls.appendChild(plus);
      row.appendChild(controls);

      grid.appendChild(row);
    }

    totalPill.textContent = `${totalSel()} / ${req}`;
    submit.disabled = (totalSel() !== req);
  }

  submit.addEventListener('click', () => {
    if (submit.disabled) return;
    submit.disabled = true;
    sendGameAction({ kind: 'discard_cards', cards: sel });
  });

  rebuild();

  modalLocked = true;
  modalType = 'discard';
  openModal({ title: 'Discard Cards', bodyNode: wrap, actions: [] });
}

function handleRobberStealPrompt() {
  if (!state || !myPlayerId) return;

  const isMySteal = state.phase === 'robber-steal' && state.currentPlayerId === myPlayerId;
  const ctx = state.robberSteal;
  if (!isMySteal || !ctx || !(ctx.victims || []).length) {
    if (modalType === 'robber-steal') forceCloseModal();
    return;
  }

  const sid = Number(ctx.id || 0);
  if (modalType === 'robber-steal' && sid === lastStealPromptId && !ui.modal.classList.contains('hidden')) return;
  lastStealPromptId = sid;

  if (!ui.modal.classList.contains('hidden') && modalType !== 'robber-steal') forceCloseModal();

  const wrap = document.createElement('div');
  const top = document.createElement('div');
  top.style.marginBottom = '10px';
  top.textContent = 'Choose a player to steal 1 random resource from:';
  wrap.appendChild(top);

  const list = document.createElement('div');
  list.style.display = 'flex';
  list.style.flexDirection = 'column';
  list.style.gap = '8px';

  for (const vid of ctx.victims || []) {
    const vp = (state.players || []).find(p => p.id === vid);
    const cardCount = vp ? (vp.handCount ?? ((vp.resources?.brick||0) + (vp.resources?.lumber||0) + (vp.resources?.wool||0) + (vp.resources?.grain||0) + (vp.resources?.ore||0))) : 0;
    const b = document.createElement('button');
    b.className = 'btn';
    b.textContent = `${vp ? vp.name : 'Player'} (${cardCount} cards)`;
    b.addEventListener('click', () => {
      sendGameAction({ kind: 'robber_steal', victimId: vid });
    });
    list.appendChild(b);
  }

  wrap.appendChild(list);

  modalLocked = true;
  modalType = 'robber-steal';
  openModal({ title: 'Choose Victim', bodyNode: wrap, actions: [] });
}

function handlePirateChoicePrompt() {
  if (!state || !myPlayerId) return;

  // No popup: during this phase, the active player chooses by clicking a land tile (robber)
  // or a sea tile (pirate).
  const isMyChoice = state.phase === 'pirate-or-robber' && state.currentPlayerId === myPlayerId;
  const ctx = state.thiefChoice;
  if (!isMyChoice || !ctx || ctx.playerId !== myPlayerId) {
    if (modalType === 'thief-choice') forceCloseModal();
    lastPirateChoicePromptId = null;
    return;
  }

  // If an old modal is still open from a previous version/client, close it.
  if (modalType === 'thief-choice') forceCloseModal();
  lastPirateChoicePromptId = Number(ctx.id || 0);
}

function handlePirateStealPrompt() {
  if (!state || !myPlayerId) return;

  const isMySteal = state.phase === 'pirate-steal' && state.currentPlayerId === myPlayerId;
  const ctx = state.pirateSteal;
  if (!isMySteal || !ctx || !(ctx.victims || []).length) {
    if (modalType === 'pirate-steal') forceCloseModal();
    return;
  }

  const sid = Number(ctx.id || 0);
  if (modalType === 'pirate-steal' && sid === lastPirateStealPromptId && !ui.modal.classList.contains('hidden')) return;
  lastPirateStealPromptId = sid;

  if (!ui.modal.classList.contains('hidden') && modalType !== 'pirate-steal') forceCloseModal();

  const wrap = document.createElement('div');
  const top = document.createElement('div');
  top.style.marginBottom = '10px';
  top.textContent = 'Choose a player to steal 1 random resource from (pirate):';
  wrap.appendChild(top);

  const list = document.createElement('div');
  list.style.display = 'flex';
  list.style.flexDirection = 'column';
  list.style.gap = '8px';

  for (const vid of ctx.victims || []) {
    const vp = (state.players || []).find(p => p.id === vid);
    const cardCount = vp ? (vp.handCount ?? ((vp.resources?.brick||0) + (vp.resources?.lumber||0) + (vp.resources?.wool||0) + (vp.resources?.grain||0) + (vp.resources?.ore||0))) : 0;
    const b = document.createElement('button');
    b.className = 'btn';
    b.textContent = `${vp ? vp.name : 'Player'} (${cardCount} cards)`;
    b.addEventListener('click', () => {
      sendGameAction({ kind: 'pirate_steal', victimId: vid });
    });
    list.appendChild(b);
  }

  wrap.appendChild(list);

  modalLocked = true;
  modalType = 'pirate-steal';
  openModal({ title: 'Pirate Steal', bodyNode: wrap, actions: [] });
}

let lastDiscoveryGoldPromptId = 0;

function handleDiscoveryGoldPrompt() {
  if (!state || !myPlayerId) return;
  const sp = state.special;
  const needs = sp && sp.kind === 'discovery_gold' && sp.forPlayerId === myPlayerId;
  if (!needs) {
    if (modalType === 'discovery-gold') forceCloseModal();
    return;
  }

  const sid = Number(sp.id || 0);
  if (modalType === 'discovery-gold' && sid === lastDiscoveryGoldPromptId && !ui.modal.classList.contains('hidden')) return;
  lastDiscoveryGoldPromptId = sid;

  if (!ui.modal.classList.contains('hidden') && modalType !== 'discovery-gold') forceCloseModal();

  const wrap = document.createElement('div');
  const top = document.createElement('div');
  top.style.marginBottom = '10px';
  top.textContent = 'Gold Field discovered! Choose 1 resource to take from the bank:';
  wrap.appendChild(top);

  const row = document.createElement('div');
  row.style.display = 'flex';
  row.style.flexWrap = 'wrap';
  row.style.gap = '8px';

  const choices = [
    ['brick', 'Brick'],
    ['lumber', 'Lumber'],
    ['wool', 'Wool'],
    ['grain', 'Grain'],
    ['ore', 'Ore'],
  ];

  for (const [k,label] of choices) {
    const b = document.createElement('button');
    b.className = 'btn primary';
    b.textContent = label;
    b.addEventListener('click', () => {
      sendGameAction({ kind: 'choose_discovery', resourceKind: k });
    });
    row.appendChild(b);
  }

  wrap.appendChild(row);

  modalLocked = true;
  modalType = 'discovery-gold';
  openModal({ title: 'Discovery', bodyNode: wrap, actions: [] });
}



  function playDevCard(card) {
    if (!card) return;

    if (card.type === 'invention') {
      const wrap = document.createElement('div');
      wrap.innerHTML = `<div>Take any 2 resource cards from the supply.</div>`;

      const choices = ['brick','lumber','wool','grain','ore'];
      const row = document.createElement('div');
      row.className = 'choiceRow';

      const sel1 = document.createElement('select');
      const sel2 = document.createElement('select');
      for (const s of [sel1, sel2]) {
        for (const k of choices) {
          const opt = document.createElement('option');
          opt.value = k;
          opt.textContent = k;
          s.appendChild(opt);
        }
      }
      row.appendChild(sel1);
      row.appendChild(sel2);
      wrap.appendChild(row);

      openModal({
        title: 'Invention',
        bodyNode: wrap,
        actions: [
          { label: 'Cancel', onClick: closeModal },
          { label: 'Take', primary: true, onClick: () => {
            closeModal();
            sendGameAction({ kind: 'play_dev_card', cardId: card.id, choices: [sel1.value, sel2.value] });
          } },
        ]
      });
      return;
    }

    if (card.type === 'monopoly') {
      const wrap = document.createElement('div');
      wrap.innerHTML = `<div>Choose a resource type. Each other player gives you all cards of that type.</div>`;
      const row = document.createElement('div');
      row.className = 'choiceRow';
      const choices = ['brick','lumber','wool','grain','ore'];
      for (const k of choices) {
        const b = document.createElement('button');
        b.className = 'choiceBtn';
        b.textContent = k;
        b.addEventListener('click', () => {
          closeModal();
          sendGameAction({ kind: 'play_dev_card', cardId: card.id, resourceKind: k });
        });
        row.appendChild(b);
      }
      wrap.appendChild(row);

      openModal({
        title: 'Monopoly',
        bodyNode: wrap,
        actions: [{ label: 'Cancel', onClick: closeModal }]
      });
      return;
    }

    // Knight / Road Building / Victory Point: no extra UI
    sendGameAction({ kind: 'play_dev_card', cardId: card.id });

    if (card.type === 'road_building') {
      setMode('place_road');
    }
  }

  function robberVictims(tileId) {
    if (!state) return [];
    const tile = state.geom?.tiles?.[tileId];
    if (!tile) return [];
    const set = new Set();
    for (const nid of (tile.cornerNodeIds || [])) {
      const b = state.geom.nodes?.[nid]?.building;
      if (b && b.owner && b.owner !== myPlayerId) set.add(b.owner);
    }
    return Array.from(set);
  }

  // Click on board
  ui.canvas.addEventListener('click', (e) => {
    if (!state || !myPlayerId) return;
    if (state.paused) { setError('Game is paused.'); return; }
    hideBuildPopup();
    const rect = ui.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (!screenCache) return;

    // Test Builder (Solo) map painting in lobby (host only)
    if (state && state.phase === 'lobby' && room && room.hostId === myPlayerId) {
      const rr = room.rules || state.rules || {};
      const mm = String(rr.mapMode || 'classic').toLowerCase();
      const scen = String(rr.seafarersScenario || 'four_islands').toLowerCase();
      if (mm === 'seafarers' && scen === 'test_builder') {
        const tid = pickTile(x, y);
        if (tid != null) {
          const tileType = (ui.testBrushSelect && ui.testBrushSelect.value) ? ui.testBrushSelect.value : 'sea';
          const nstr = (ui.testNumberSelect && ui.testNumberSelect.value) ? ui.testNumberSelect.value : '';
          const num = nstr ? parseInt(nstr, 10) : null;
          send({ type: 'edit_preview_tile', tileId: tid, tileType, number: num });
        }
        return;
      }
    }

    const myTurn = state.currentPlayerId === myPlayerId;
    if (!myTurn) return;

    const phase = state.phase;

    // Setup/robber/pirate override modes
    if (phase === 'setup1-settlement' || phase === 'setup2-settlement') {
      const hit = pickNode(x, y);
      if (hit != null) queryBuildOptions('node', hit, e.clientX, e.clientY);
      return;
    }
    if (phase === 'setup1-road' || phase === 'setup2-road') {
      const hit = pickEdge(x, y);
      if (hit != null) queryBuildOptions('edge', hit, e.clientX, e.clientY);
      return;
    }
    if (phase === 'pirate-or-robber') {
      const tid = pickTile(x, y);
      if (tid != null) {
        const tile = state.geom?.tiles?.[tid];
        const isSea = (tile && tile.type === 'sea');

        if (isSea) {
          if (tile?.pirate) {
            setError('Pirate must move to a different tile.');
            return;
          }
          sendGameAction({ kind: 'move_pirate', tileId: tid });
        } else {
          if (tile?.robber) {
            setError('Robber must move to a different tile.');
            return;
          }
          sendGameAction({ kind: 'move_robber', tileId: tid });
        }
      }
      return;
    }
    if (phase === 'robber-move') {
      const tid = pickTile(x, y);
      if (tid != null) {
        if (state.geom?.tiles?.[tid]?.robber) {
          setError('Robber must move to a different tile.');
          return;
        }
        sendGameAction({ kind: 'move_robber', tileId: tid });
      }
      return;
    }
    if (phase === 'pirate-move') {
      const tid = pickTile(x, y);
      if (tid != null) {
        if (state.geom?.tiles?.[tid]?.pirate) {
          setError('Pirate must move to a different tile.');
          return;
        }
        sendGameAction({ kind: 'move_pirate', tileId: tid });
      }
      return;
    }

    // Main turn phases (before or after rolling)
    const inMainTurn = (phase === 'main-actions' || phase === 'main-await-roll');
    if (!inMainTurn) return;

    // Ship movement is allowed any time during your turn (once per turn).
    if (inputMode.kind === 'move_ship') {
      const hit = pickEdge(x, y);
      if (hit == null) return;

      // First click selects a ship edge you own.
      if (inputMode.moveShipFrom == null) {
        const e = state.geom?.edges?.[hit];
        if (!e || e.shipOwner !== myPlayerId) {
          setError('Click one of your ships to select it.');
          return;
        }
        inputMode.moveShipFrom = hit;
        setMode('move_ship');
        render();
        return;
      }

      // Second click chooses a destination edge (clicking the same edge cancels).
      if (hit === inputMode.moveShipFrom) {
        inputMode.moveShipFrom = null;
        setMode('move_ship');
        render();
        return;
      }

      const from = inputMode.moveShipFrom;
      inputMode.moveShipFrom = null;
      setMode('move_ship');
      sendGameAction({ kind: 'move_ship', fromEdgeId: from, toEdgeId: hit });
      return;
    }

    // Click-to-build menu (after rolling).
    if (phase !== 'main-actions') return;

    // If the player chose a build mode, prefer the matching target type.
    // This makes settlement placement reliable on dense/small-scaled boards (e.g., Through the Desert).
    if (inputMode.kind === 'place_settlement' || inputMode.kind === 'upgrade_city') {
      const hit = pickNode(x, y);
      if (hit != null) {
        queryBuildOptions('node', hit, e.clientX, e.clientY);
        return;
      }
    }
    if (inputMode.kind === 'place_road' || inputMode.kind === 'place_ship') {
      const hit = pickEdge(x, y);
      if (hit != null) {
        queryBuildOptions('edge', hit, e.clientX, e.clientY);
        return;
      }
    }

    const tgt = pickTarget(x, y);
    if (!tgt) return;
    queryBuildOptions(tgt.kind, tgt.id, e.clientX, e.clientY);
  });

  // Drawing helpers
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function worldToScreen(pt) {
    return {
      x: (pt.x * view.scale) + (ui.canvas.getBoundingClientRect().width / 2) + view.ox,
      y: (pt.y * view.scale) + (ui.canvas.getBoundingClientRect().height / 2) + view.oy,
    };
  }
  function screenToWorld(pt) {
    return {
      x: (pt.x - (ui.canvas.getBoundingClientRect().width / 2) - view.ox) / view.scale,
      y: (pt.y - (ui.canvas.getBoundingClientRect().height / 2) - view.oy) / view.scale,
    };
  }

  function tilePolygonScreen(tile) {
    // use corner nodes for exact polygon
    const ids = tile.cornerNodeIds || [];
    const pts = ids.map(nid => worldToScreen({ x: state.geom.nodes[nid].x, y: state.geom.nodes[nid].y }));
    return pts;
  }

  function pointInPoly(px, py, poly) {
    // ray casting
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, yi = poly[i].y;
      const xj = poly[j].x, yj = poly[j].y;
      const intersect = ((yi > py) !== (yj > py)) &&
        (px < (xj - xi) * (py - yi) / ((yj - yi) || 1e-9) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function distToSeg(px, py, ax, ay, bx, by) {
    const vx = bx - ax, vy = by - ay;
    const wx = px - ax, wy = py - ay;
    const c1 = vx * wx + vy * wy;
    if (c1 <= 0) return Math.hypot(px - ax, py - ay);
    const c2 = vx * vx + vy * vy;
    if (c2 <= c1) return Math.hypot(px - bx, py - by);
    const t = c1 / c2;
    const ix = ax + t * vx;
    const iy = ay + t * vy;
    return Math.hypot(px - ix, py - iy);
  }

  function pickNode(sx, sy) {
    if (!screenCache) return null;
    // Slightly larger hit radius makes setup placement feel reliable.
    const rad = 18;
    let best = { id: null, d: 1e9 };
    for (const n of screenCache.nodes) {
      const d = Math.hypot(sx - n.sx, sy - n.sy);
      if (d < rad && d < best.d) best = { id: n.id, d };
    }
    return best.id;
  }

  function pickTarget(sx, sy) {
    if (!screenCache) return null;

    // Find nearest node/edge under thresholds, then choose the closer one.
    const nodeRad = 22;
    let bestNode = { id: null, d: 1e9 };
    for (const n of screenCache.nodes) {
      const d = Math.hypot(sx - n.sx, sy - n.sy);
      if (d < nodeRad && d < bestNode.d) bestNode = { id: n.id, d };
    }

    const edgeThr = 13;
    let bestEdge = { id: null, d: 1e9 };
    for (const e of screenCache.edges) {
      const d = distToSeg(sx, sy, e.ax, e.ay, e.bx, e.by);
      if (d < edgeThr && d < bestEdge.d) bestEdge = { id: e.id, d };
    }

    if (bestNode.id == null && bestEdge.id == null) return null;
    if (bestNode.id != null && bestEdge.id == null) return { kind: 'node', id: bestNode.id };
    if (bestEdge.id != null && bestNode.id == null) return { kind: 'edge', id: bestEdge.id };

    const nd = bestNode.d / nodeRad;
    const ed = bestEdge.d / edgeThr;
    return (nd <= ed) ? { kind: 'node', id: bestNode.id } : { kind: 'edge', id: bestEdge.id };
  }

  function pickEdge(sx, sy) {
    if (!screenCache) return null;
    // Roads are thin lines; use a more forgiving threshold.
    const thr = 14;
    let best = { id: null, d: 1e9 };
    for (const e of screenCache.edges) {
      const d = distToSeg(sx, sy, e.ax, e.ay, e.bx, e.by);
      if (d < thr && d < best.d) best = { id: e.id, d };
    }
    return best.id;
  }

  function pickTile(sx, sy) {
    if (!screenCache) return null;
    for (const t of screenCache.tiles) {
      if (pointInPoly(sx, sy, t.poly)) return t.id;
    }
    return null;
  }

  function render() {
    // Clear
    const w = ui.canvas.getBoundingClientRect().width;
    const h = ui.canvas.getBoundingClientRect().height;
    ctx.clearRect(0, 0, w, h);

    if (!state || !state.geom || !state.geom.tiles) {
      // soft title
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#e8eef6';
      ctx.font = '600 18px ui-sans-serif, system-ui';
      ctx.fillText('Create or join a lobby to begin.', 18, 34);
      ctx.restore();
      screenCache = null;
      return;
    }

    // Build cache
    screenCache = { nodes: [], edges: [], tiles: [] };

    // Draw tiles
    for (const t of state.geom.tiles) {
      const c = worldToScreen({ x: t.cx, y: t.cy });
      const poly = tilePolygonScreen(t);
      screenCache.tiles.push({ id: t.id, poly });

      // Clip to hex then draw image
      ctx.save();
      ctx.beginPath();
      poly.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.clip();

      const fogHidden = !!(t.fog && !t.revealed);
      const imgKey = fogHidden ? 'unexplored' : t.type;
      const img = images[imgKey] || null;
      // world hex bbox for size=1: width sqrt(3), height 2. add slight padding
      const imgW = Math.sqrt(3) * view.scale * 1.06;
      const imgH = 2 * view.scale * 1.06;
      if (img) {
        ctx.drawImage(img, c.x - imgW / 2, c.y - imgH / 2, imgW, imgH);
      } else {
        ctx.fillStyle = '#cccccc';
        ctx.fillRect(c.x - imgW / 2, c.y - imgH / 2, imgW, imgH);
      }
      ctx.restore();

      // Outline
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = 'rgba(0,0,0,.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      poly.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
      ctx.closePath();
      ctx.stroke();
      ctx.restore();

      // Number token
      if (t.number && !(t.fog && !t.revealed)) {
        const numImg = images[`num_${t.number}`] || null;
        // Keep the center number readable at any zoom: never smaller than 1/3 of the hex height.
        const hexH = 2 * view.scale;
        const sz = Math.round(hexH / 3);
        if (numImg) {
          ctx.save();
          ctx.globalAlpha = 0.95;
          ctx.drawImage(numImg, c.x - sz / 2, c.y - sz / 2, sz, sz);
          ctx.restore();
        } else {
        ctx.save();
        ctx.globalAlpha = 0.92;
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.strokeStyle = 'rgba(0,0,0,.25)';
        ctx.lineWidth = 2;
        const r = Math.max(16, Math.round(sz / 2));
        ctx.beginPath();
        ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        const hot = (t.number === 6 || t.number === 8);
        ctx.fillStyle = hot ? '#b00020' : '#111827';
        const fs = Math.max(14, Math.round(r * 0.9));
        ctx.font = `700 ${fs}px ui-monospace, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(t.number), c.x, c.y);
        ctx.restore();
        }
      }
      // Robber marker
      if (t.robber) {
        const hexH = 2 * view.scale;
        const tokenSz = Math.round(hexH / 3);
    // Pirate should be ~1/3 the tile height.
    const iconSz = Math.round(hexH / 3);
        const rImg = images['thief_robber'] || null;

        // Place robber next to the number token (top-right of the token).
        const ox = (t.number ? tokenSz * 0.72 : iconSz * 0.65);
        const oy = (t.number ? tokenSz * 0.72 : iconSz * 0.65);
        const rx = c.x + ox;
        const ry = c.y - oy;

        ctx.save();
        ctx.globalAlpha = 0.98;
        if (rImg) {
          ctx.drawImage(rImg, rx - iconSz / 2, ry - iconSz / 2, iconSz, iconSz);
        } else {
          // Fallback
          ctx.fillStyle = 'rgba(0,0,0,.65)';
          ctx.beginPath();
          ctx.arc(rx, ry, Math.max(10, Math.round(iconSz * 0.38)), 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.9)';
          ctx.font = '700 11px ui-monospace, monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('R', rx, ry);
        }
        ctx.restore();
      }

      // Pirate marker
      if (t.pirate) {
        const hexH = 2 * view.scale;
        const iconSz = Math.round(hexH / 4);
        const pImg = images['thief_pirate'] || null;
        const px = c.x;
        const py = c.y;

        ctx.save();
        ctx.globalAlpha = 0.98;
        if (pImg) {
          ctx.drawImage(pImg, px - iconSz / 2, py - iconSz / 2, iconSz, iconSz);
        } else {
          // Fallback
          ctx.fillStyle = 'rgba(0,0,0,.65)';
          ctx.beginPath();
          ctx.arc(px, py, Math.max(10, Math.round(iconSz * 0.38)), 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.9)';
          ctx.font = '700 11px ui-monospace, monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('P', px, py);
        }
        ctx.restore();
      }

    }

    // Draw ports (harbors) on coastal edges (each port covers two adjacent settlement nodes).
    const ports = state.geom.ports || [];
    if (ports.length) {
      for (const p of ports) {
        const e = state.geom.edges && state.geom.edges[p.edgeId];
        if (!e) continue;
        const na = state.geom.nodes && state.geom.nodes[e.a];
        const nb = state.geom.nodes && state.geom.nodes[e.b];
        if (!na || !nb) continue;

        const mid = { x: (na.x + nb.x) / 2, y: (na.y + nb.y) / 2 };

        // Prefer placing the marker toward the sea-side of the coast edge (land->sea direction).
        let dx = mid.x, dy = mid.y;
        if (p.seaTileId != null && p.landTileId != null) {
          const sea = state.geom.tiles && state.geom.tiles[p.seaTileId];
          const land = state.geom.tiles && state.geom.tiles[p.landTileId];
          if (sea && land) {
            dx = sea.cx - land.cx;
            dy = sea.cy - land.cy;
          }
        }
        const dlen = Math.hypot(dx, dy) || 1;
        dx /= dlen; dy /= dlen;

        const portPos = { x: mid.x + dx * 0.30, y: mid.y + dy * 0.30 };
        const ms = worldToScreen(mid);
        const ps = worldToScreen(portPos);

        // Highlight the exact edge the port applies to and draw a short leader line to the marker.
        const as = worldToScreen({ x: na.x, y: na.y });
        const bs = worldToScreen({ x: nb.x, y: nb.y });
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.strokeStyle = 'rgba(255,255,255,.95)';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(as.x, as.y);
        ctx.lineTo(bs.x, bs.y);
        ctx.stroke();

        ctx.globalAlpha = 0.38;
        ctx.strokeStyle = 'rgba(0,0,0,.45)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ms.x, ms.y);
        ctx.lineTo(ps.x, ps.y);
        ctx.stroke();
        ctx.restore();

        // Port marker (icon)
        const pk = (p.kind === 'generic') ? 'generic' : String(p.kind);
        const portImg = images[`port_${pk}`];

        ctx.save();
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = 'rgba(0,0,0,.55)';
        ctx.strokeStyle = 'rgba(255,255,255,.65)';
        ctx.lineWidth = 1;
        const hexH2 = 2 * view.scale;
        const pr = Math.max(10, Math.round((hexH2 / 4) * 0.52));
        ctx.beginPath();
        ctx.arc(ps.x, ps.y, pr, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        if (portImg) {
          const hexH = 2 * view.scale;
          const sz = Math.round(hexH / 4);
          ctx.globalAlpha = 1;
          ctx.drawImage(portImg, ps.x - sz / 2, ps.y - sz / 2, sz, sz);
        } else {
          // Fallback to text if the asset isn't available
          ctx.fillStyle = 'rgba(255,255,255,.92)';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '700 10px ui-monospace, monospace';
          if (p.kind === 'generic') ctx.fillText('3:1', ps.x, ps.y);
          else ctx.fillText('2:1', ps.x, ps.y);
        }
        ctx.restore();
      }
    }

    // Setup helpers: subtle highlights for valid placements
    const myTurn = (state.currentPlayerId === myPlayerId);
    if (myTurn) {
      const phase = state.phase;

      if (phase === 'setup1-settlement' || phase === 'setup2-settlement') {
        ctx.save();
        ctx.globalAlpha = 0.32;
        ctx.strokeStyle = 'rgba(255,255,255,.9)';
        ctx.lineWidth = 2;
        for (const n of state.geom.nodes) {
          if (n.building) continue;
          let ok = true;
          for (const nb of n.adj || []) {
            if (state.geom.nodes[nb].building) { ok = false; break; }
          }
          if (!ok) continue;
          const s = worldToScreen({ x: n.x, y: n.y });
          ctx.beginPath();
          ctx.arc(s.x, s.y, 9, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      if (phase === 'setup1-road' || phase === 'setup2-road') {
        const awaiting = state.setup && state.setup.awaiting;
        if (awaiting && awaiting.playerId === myPlayerId) {
          const nid = awaiting.nodeId;
          ctx.save();
          ctx.globalAlpha = 0.28;
          ctx.strokeStyle = 'rgba(255,255,255,.85)';
          ctx.lineWidth = 10;
          ctx.lineCap = 'round';
          const seafarers = ((state && state.rules && state.rules.mapMode) || 'classic') === 'seafarers';
          const wantShip = seafarers && inputMode && inputMode.kind === 'place_ship';
          for (const e of state.geom.edges) {
            if (e.roadOwner || e.shipOwner) continue;
            if (e.a !== nid && e.b !== nid) continue;

            const adj = (state.geom.edgeAdjTiles && state.geom.edgeAdjTiles[e.id]) || [];
            const touchesSea = adj.length === 1 || adj.some(tid => (state.geom.tiles[tid] && state.geom.tiles[tid].type) === 'sea');
            const touchesLand = adj.some(tid => (state.geom.tiles[tid] && state.geom.tiles[tid].type) && state.geom.tiles[tid].type !== 'sea');
            if (wantShip) {
              if (!touchesSea) continue;
            } else {
              if (!touchesLand) continue;
            }

            const a = state.geom.nodes[e.a];
            const b = state.geom.nodes[e.b];
            const as = worldToScreen({ x: a.x, y: a.y });
            const bs = worldToScreen({ x: b.x, y: b.y });
            ctx.beginPath();
            ctx.moveTo(as.x, as.y);
            ctx.lineTo(bs.x, bs.y);
            ctx.stroke();
          }
          ctx.restore();
        }
      }
    }

    // Draw roads + ships
    for (const e of state.geom.edges) {
      const a = state.geom.nodes[e.a];
      const b = state.geom.nodes[e.b];
      const as = worldToScreen({ x: a.x, y: a.y });
      const bs = worldToScreen({ x: b.x, y: b.y });
      screenCache.edges.push({ id: e.id, ax: as.x, ay: as.y, bx: bs.x, by: bs.y });

      if (e.roadOwner) {
        const p = state.players.find(pp => pp.id === e.roadOwner);
        const colIdx = playerColorIndex(p?.color);
        if (!drawEdgeStructureSprite('road', colIdx, as.x, as.y, bs.x, bs.y)) {
          ctx.save();
          ctx.strokeStyle = p?.color || '#ffffff';
          ctx.lineWidth = 8;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(as.x, as.y);
          ctx.lineTo(bs.x, bs.y);
          ctx.stroke();
          ctx.restore();
        }
      }

      if (e.shipOwner) {
        const p = state.players.find(pp => pp.id === e.shipOwner);
        const colIdx = playerColorIndex(p?.color);
        if (!drawEdgeStructureSprite('ship', colIdx, as.x, as.y, bs.x, bs.y)) {
          ctx.save();
          ctx.strokeStyle = p?.color || '#ffffff';
          ctx.lineWidth = 6;
          ctx.lineCap = 'round';
          ctx.setLineDash([10, 8]);
          ctx.beginPath();
          ctx.moveTo(as.x, as.y);
          ctx.lineTo(bs.x, bs.y);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }
      }
    }

    // Highlight selected ship when moving ships
    if (inputMode.kind === 'move_ship' && inputMode.moveShipFrom != null) {
      const e = state.geom.edges?.[inputMode.moveShipFrom];
      if (e) {
        const a = state.geom.nodes[e.a];
        const b = state.geom.nodes[e.b];
        const as = worldToScreen({ x: a.x, y: a.y });
        const bs = worldToScreen({ x: b.x, y: b.y });
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,.92)';
        ctx.lineWidth = 12;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(as.x, as.y);
        ctx.lineTo(bs.x, bs.y);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Draw nodes + buildings
    for (const n of state.geom.nodes) {
      const s = worldToScreen({ x: n.x, y: n.y });
      screenCache.nodes.push({ id: n.id, sx: s.x, sy: s.y });

      // node dot
      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = 'rgba(0,0,0,.55)';
      ctx.beginPath();
      ctx.arc(s.x, s.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (!n.building) continue;
      const p = state.players.find(pp => pp.id === n.building.owner);
      const col = p?.color || '#ffffff';

      if (n.building.type === 'settlement') {
        drawSettlement(s.x, s.y, col);
      } else {
        drawCity(s.x, s.y, col);
      }
    }

    // Overlay current selection mode
    if (state.currentPlayerId === myPlayerId) {
      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = 'rgba(0,0,0,.28)';
      ctx.fillRect(10, 10, 260, 40);
      ctx.fillStyle = '#e8eef6';
      ctx.font = '600 12px ui-sans-serif, system-ui';
      ctx.fillText(`Mode: ${inputMode.kind ? inputMode.kind.replaceAll('_',' ') : 'view'}`, 20, 34);
      ctx.restore();
    }
  }

  function pickStructImg(colorIdx) {
    const i = (colorIdx == null ? 0 : (colorIdx | 0));
    const cand = STRUCT.imgs[i];
    if (cand && cand.complete && (cand.naturalWidth || cand.width)) return cand;
    for (const im of STRUCT.imgs) {
      if (im && im.complete && (im.naturalWidth || im.width)) return im;
    }
    return null;
  }

  function drawStructureSprite(kind, colorIdx, x, y, w, h, rotRad) {
    if (!STRUCT.ready) return false;
    const img = pickStructImg(colorIdx);
    if (!img) return false;

    const t = STRUCT.tile;
    const cell = STRUCT_CELL[kind] || STRUCT_CELL.settlement;
    const sx = cell.c * t;
    const sy = cell.r * t;

    ctx.save();
    if (rotRad) {
      ctx.translate(x, y);
      ctx.rotate(rotRad);
      ctx.drawImage(img, sx, sy, t, t, -w / 2, -h / 2, w, h);
    } else {
      ctx.drawImage(img, sx, sy, t, t, x - w / 2, y - h / 2, w, h);
    }
    ctx.restore();
    return true;
  }

  function drawEdgeStructureSprite(kind, colorIdx, ax, ay, bx, by) {
    if (!STRUCT.ready) return false;
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    const dx = bx - ax;
    const dy = by - ay;
    const ang = Math.atan2(dy, dx);

    // Size roads/ships relative to the actual edge length so they don't stretch across the whole path.
    // Requested: render at ~half the edge length.
    const dist = Math.hypot(dx, dy);
    const hexH = 2 * view.scale;
    const isShip = kind === 'ship';
    const len = Math.max(16, Math.round(dist * 0.5));
    const thick = Math.max(10, Math.round(hexH * (isShip ? 0.08 : 0.07)));

    return drawStructureSprite(kind, colorIdx, mx, my, len, thick, ang);
  }

  function drawSettlement(x, y, color) {
    const colIdx = playerColorIndex(color);
    const hexH = 2 * view.scale;
    const sz = Math.max(22, Math.round(hexH / 3)); // match number token size
    if (drawStructureSprite('settlement', colIdx, x, y, sz, sz, 0)) return;

    // Fallback simple shape
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x + 10, y + 8);
    ctx.lineTo(x - 10, y + 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawCity(x, y, color) {
    const colIdx = playerColorIndex(color);
    const hexH = 2 * view.scale;
    const sz = Math.max(22, Math.round(hexH / 3)); // match number token size
    if (drawStructureSprite('city', colIdx, x, y, sz, sz, 0)) return;

    // Fallback simple shape
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.lineWidth = 2;
    const w = 18, h = 14;
    ctx.beginPath();
    ctx.rect(x - w/2, y - h/2, w, h);
    ctx.fill();
    ctx.stroke();
    // little roof
    ctx.beginPath();
    ctx.moveTo(x - w/2, y - h/2);
    ctx.lineTo(x, y - h/2 - 10);
    ctx.lineTo(x + w/2, y - h/2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // initial view centering
  function autoCenterOnce() {
    if (!state) return;
    // put origin near center of board in screen
    view.ox = 0;
    view.oy = 0;
  }
  autoCenterOnce();

})();
