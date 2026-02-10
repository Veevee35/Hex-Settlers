
/**
 * Hex Settlers - single-file Node server:
 * - Serves static files from ./public
 * - Runs a WebSocket server at /ws for lobby + game state
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const WebSocket = require('ws');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
};

function sendJson(ws, obj) {
  try { ws.send(JSON.stringify(obj)); } catch (_) {}
}

function deepClone(obj) {
  try { return JSON.parse(JSON.stringify(obj)); } catch { return null; }
}

function now() { return Date.now(); }

function randCode(len = 4) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

// -------------------- Persistent Storage --------------------
// Railway note: attach a Volume and this server will store users/history in that mount.
const DATA_DIR =
  process.env.RAILWAY_VOLUME_MOUNT_PATH ||
  process.env.DATA_DIR ||
  __dirname;

try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) {}

// -------------------- User Accounts (persistent) --------------------
// Accounts are stored on disk in users.json (DATA_DIR).
// Passwords are salted + hashed (PBKDF2). Session tokens allow auto-login on refresh.
const USERS_DB_PATH = path.join(DATA_DIR, 'users.json');
const AUTH_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const AUTH_TOKENS_MAX = 8;

let USERS_DB = { version: 1, users: [] };
let userSockets = new Map(); // userId -> ws (enforce one active connection per user)

// -------------------- Game History (persistent) --------------------
// Completed games are stored on disk in game_history.json (DATA_DIR).
// Each entry includes a compact metadata header + a postgame snapshot (stats + players + rules) for viewing later.
const HISTORY_DB_PATH = path.join(DATA_DIR, 'game_history.json');
const HISTORY_MAX_GAMES = 500;

let HISTORY_DB = { version: 1, games: [] };

function loadHistoryDb() {
  try {
    if (fs.existsSync(HISTORY_DB_PATH)) {
      const raw = fs.readFileSync(HISTORY_DB_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        HISTORY_DB = {
          version: Number(parsed.version || 1),
          games: Array.isArray(parsed.games) ? parsed.games : [],
        };

        // Clean up any corrupted/phantom entries that may have been written by older builds
        // (for example, dry-run simulations that accidentally persisted history).
        try {
          const before = Array.isArray(HISTORY_DB.games) ? HISTORY_DB.games : [];
          const cleaned = [];
          const seen = new Set();
          for (const g of before) {
            if (!isValidHistoryEntry(g)) continue;
            const ids = (Array.isArray(g.players) ? g.players : [])
              .map(p => String(p && p.id || '').trim())
              .filter(Boolean)
              .sort()
              .join(',');
            const t = Math.floor(Number(g.endedAt || 0) / 5000); // 5s bucket
            const key = `${String(g.roomCode || '').trim()}|${t}|${String(g.winnerId || '').trim()}|${ids}`;
            if (seen.has(key)) continue;
            seen.add(key);
            cleaned.push(g);
          }
          if (cleaned.length !== before.length) {
            HISTORY_DB.games = cleaned;
            saveHistoryDb();
          }
        } catch (_) {}
      }
    }
  } catch (e) {
    console.error('[history] Failed to load game_history.json:', e && e.message ? e.message : e);
    HISTORY_DB = { version: 1, games: [] };
  }
}

function saveHistoryDb() {
  try {
    // prune oldest
    const games = Array.isArray(HISTORY_DB.games) ? HISTORY_DB.games : [];
    if (games.length > HISTORY_MAX_GAMES) {
      HISTORY_DB.games = games.slice(-HISTORY_MAX_GAMES);
    }
    const safe = { version: 1, games: HISTORY_DB.games || [] };
    fs.writeFileSync(HISTORY_DB_PATH, JSON.stringify(safe, null, 2), 'utf-8');
  } catch (e) {
    console.error('[history] Failed to save game_history.json:', e && e.message ? e.message : e);
  }
}

// Filter out corrupted/phantom history entries (e.g. created during dry-run simulations).
function isValidHistoryEntry(g) {
  if (!g || typeof g !== 'object') return false;
  const rc = String(g.roomCode || '').trim();
  // Real rooms have a code; dry-run simulations often don't.
  if (rc.length < 3) return false;
  if (!Array.isArray(g.players) || g.players.length < 1) return false;
  if (!g.snapshot || typeof g.snapshot !== 'object') return false;
  if (String(g.snapshot.phase || '').toLowerCase() !== 'game-over') return false;
  return true;
}

function _historyPlayerSummary(p) {
  if (!p) return null;
  return {
    id: String(p.id || ''),
    name: String(p.name || '').slice(0, 40),
    color: p.color || '#777',
    vp: Math.max(0, Math.floor(Number(p.vp || 0))),
  };
}

function makeGameHistoryEntry(room, game, winnerId) {
  if (!room || !game) return null;

  const endedAt = Number(game?.stats?.endedAt || now());
  const startedAt = Number(game?.stats?.startedAt || game?.createdAt || endedAt);

  const players = Array.isArray(game.players) ? game.players.map(_historyPlayerSummary).filter(Boolean) : [];
  const wid = String(winnerId || '');
  const w = players.find(p => p.id === wid) || null;

  // keep snapshot limited to what postgame UI needs
  const snapshot = deepClone({
    phase: 'game-over',
    turnNumber: game.turnNumber || 0,
    rules: game.rules || null,
    players: Array.isArray(game.players) ? game.players : [],
    stats: game.stats || null,
    longestRoad: game.longestRoad || null,
    largestArmy: game.largestArmy || null,
    diceStats: game.diceStats || null,
  });

  return {
    id: crypto.randomUUID(),
    roomCode: String(room.code || ''),
    startedAt,
    endedAt,
    turns: Math.max(0, Math.floor(Number(game.turnNumber || 0))),
    winnerId: wid || (w ? w.id : ''),
    winnerName: w ? w.name : '',
    rules: deepClone(game.rules || null),
    players,
    snapshot,
  };
}

function persistGameHistoryFromGame(room, game, winnerId) {
  if (!room || !game) return;
  // Prevent accidental persistence from simulation/dry-run rooms (e.g. build option previews).
  if (room._dryRun) return;
  // Real rooms always have a code + sockets map.
  if (!room.code || !room.sockets) return;
  if (game._historyPersisted) return;
  if (game.phase !== 'game-over') return;

  game._historyPersisted = true;

  try { ensureGameStats(game); } catch (_) {}
  if (game.stats && !game.stats.endedAt) game.stats.endedAt = now();

  const entry = makeGameHistoryEntry(room, game, winnerId);
  if (!entry) return;

  if (!Array.isArray(HISTORY_DB.games)) HISTORY_DB.games = [];
  HISTORY_DB.games.push(entry);
  saveHistoryDb();
}

function listGameHistory(limit = 200) {
  const games = (Array.isArray(HISTORY_DB.games) ? HISTORY_DB.games : []).filter(isValidHistoryEntry);
  const lim = clamp(Math.floor(Number(limit || 200)), 1, 2000);
  const slice = games.slice(-lim).reverse(); // most recent first
  // return metadata only
  return slice.map(g => ({
    id: g.id,
    roomCode: g.roomCode,
    startedAt: g.startedAt,
    endedAt: g.endedAt,
    turns: g.turns,
    winnerId: g.winnerId,
    winnerName: g.winnerName,
    rules: g.rules || null,
    players: g.players || [],
  }));
}

function getGameHistoryEntry(id) {
  const gid = String(id || '').trim();
  if (!gid) return null;
  const games = (Array.isArray(HISTORY_DB.games) ? HISTORY_DB.games : []).filter(isValidHistoryEntry);
  for (let i = games.length - 1; i >= 0; i--) {
    const g = games[i];
    if (g && g.id === gid) return g;
  }
  return null;
}

function computeLeaderboardFromHistory() {
  const games = (Array.isArray(HISTORY_DB.games) ? HISTORY_DB.games : []).filter(isValidHistoryEntry);
  const by = new Map(); // pid -> agg

  const sumRes = (m) => {
    if (!m || typeof m !== 'object') return 0;
    return (Number(m.brick||0)+Number(m.lumber||0)+Number(m.wool||0)+Number(m.grain||0)+Number(m.ore||0));
  };

  for (const g of games) {
    if (!g || !Array.isArray(g.players)) continue;
    const wid = String(g.winnerId || '');
    const snap = g.snapshot || null;
    const st = snap && snap.stats ? snap.stats : null;

    for (const p of g.players) {
      const pid = String(p.id || '');
      if (!pid) continue;
      let rec = by.get(pid);
      if (!rec) {
        const u = findUserById(pid);
        rec = {
          id: pid,
          username: u ? u.username : '',
          name: u ? (u.displayName || u.username || p.name || pid) : (p.name || pid),
          color: p.color || (u && u.color) || '#777',
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          totalVP: 0,

          totalTurnMs: 0,
          totalTurns: 0,

          roads: 0,
          ships: 0,
          settlements: 0,
          cities: 0,

          devBought: 0,
          devPlayed: 0,

          resGained: 0,
          resLost: 0,

          lastGameAt: 0,
        };
        by.set(pid, rec);
      }

      rec.gamesPlayed += 1;
      if (pid === wid) rec.wins += 1; else rec.losses += 1;
      rec.totalVP += Math.max(0, Math.floor(Number(p.vp || 0)));
      rec.lastGameAt = Math.max(rec.lastGameAt, Number(g.endedAt || 0));

      // Pull richer stats from snapshot if present
      if (st && st.turnTimes && st.turnTimes.byPlayer && st.turnTimes.byPlayer[pid]) {
        const tt = st.turnTimes.byPlayer[pid];
        rec.totalTurnMs += Math.max(0, Number(tt.totalMs || 0));
        rec.totalTurns += Math.max(0, Number(tt.turns || 0));
      }
      if (st && st.builds && st.builds.byPlayer && st.builds.byPlayer[pid]) {
        const b = st.builds.byPlayer[pid];
        rec.roads += Math.max(0, Number(b.road || 0));
        rec.ships += Math.max(0, Number(b.ship || 0));
        rec.settlements += Math.max(0, Number(b.settlement || 0));
        rec.cities += Math.max(0, Number(b.city || 0));
      }
      if (st && st.dev && st.dev.byPlayer && st.dev.byPlayer[pid]) {
        const d = st.dev.byPlayer[pid];
        rec.devBought += Math.max(0, Number(d.bought || 0));
        rec.devPlayed += Math.max(0, Number(d.played || 0));
      }
      if (st && st.resources && st.resources.byPlayer && st.resources.byPlayer[pid]) {
        const r = st.resources.byPlayer[pid];
        rec.resGained += sumRes(r.gained);
        rec.resLost += sumRes(r.lost);
      }
    }
  }

  const rows = [];
  for (const rec of by.values()) {
    const gp = rec.gamesPlayed || 0;
    const winPct = gp ? (rec.wins / gp) : 0;
    const avgVP = gp ? (rec.totalVP / gp) : 0;
    const avgTurnSec = rec.totalTurns ? (rec.totalTurnMs / rec.totalTurns / 1000) : 0;

    rows.push({
      id: rec.id,
      username: rec.username,
      name: rec.name,
      color: rec.color,
      gamesPlayed: gp,
      wins: rec.wins,
      losses: rec.losses,
      winPct: Math.round(winPct * 1000) / 1000,
      totalVP: rec.totalVP,
      avgVP: Math.round(avgVP * 1000) / 1000,
      avgTurnSec: Math.round(avgTurnSec * 1000) / 1000,
      roads: rec.roads,
      ships: rec.ships,
      settlements: rec.settlements,
      cities: rec.cities,
      devBought: rec.devBought,
      devPlayed: rec.devPlayed,
      resGained: rec.resGained,
      resLost: rec.resLost,
      lastGameAt: rec.lastGameAt,
    });
  }

  // default sort: wins desc, win% desc, avgVP desc
  rows.sort((a,b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.winPct !== a.winPct) return b.winPct - a.winPct;
    if (b.avgVP !== a.avgVP) return b.avgVP - a.avgVP;
    return (b.lastGameAt||0) - (a.lastGameAt||0);
  });

  return rows;
}

// Rebuild per-user aggregate stats from *valid* game history.
// This repairs any inflated stats caused by older builds that accidentally persisted dry-runs.
function rebuildUserStatsFromHistory() {
  try {
    if (!USERS_DB || !Array.isArray(USERS_DB.users)) return;

    // Reset
    for (const u of USERS_DB.users) {
      if (!u || !u.id) continue;
      u.stats = { gamesPlayed: 0, wins: 0, losses: 0, totalVP: 0, lastGameAt: 0 };
    }

    const games = (Array.isArray(HISTORY_DB.games) ? HISTORY_DB.games : []).filter(isValidHistoryEntry);
    for (const g of games) {
      const wid = String(g.winnerId || '').trim();
      const endedAt = Math.max(0, Number(g.endedAt || 0));
      for (const p of (Array.isArray(g.players) ? g.players : [])) {
        const pid = String(p && p.id || '').trim();
        if (!pid) continue;
        const u = findUserById(pid);
        if (!u) continue;
        if (!u.stats || typeof u.stats !== 'object') u.stats = { gamesPlayed: 0, wins: 0, losses: 0, totalVP: 0, lastGameAt: 0 };
        u.stats.gamesPlayed += 1;
        if (pid === wid) u.stats.wins += 1;
        else u.stats.losses += 1;
        u.stats.totalVP += Math.max(0, Math.floor(Number(p.vp || 0)));
        u.stats.lastGameAt = Math.max(Number(u.stats.lastGameAt || 0), endedAt);
      }
    }

    saveUsersDb();
  } catch (_) {}
}

function normalizeUsername(u) {
  return String(u || '').trim().toLowerCase();
}

function cleanDisplayName(n) {
  const s = String(n || '').trim();
  if (!s) return '';
  // allow letters, numbers, punctuation, spaces; clamp length
  return s.slice(0, 20);
}

function loadUsersDb() {
  try {
    if (fs.existsSync(USERS_DB_PATH)) {
      const raw = fs.readFileSync(USERS_DB_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        USERS_DB = {
          version: Number(parsed.version || 1),
          users: Array.isArray(parsed.users) ? parsed.users : [],
        };
      }
    }
  } catch (e) {
    console.error('[users] Failed to load users.json:', e && e.message ? e.message : e);
    USERS_DB = { version: 1, users: [] };
  }
}

function saveUsersDb() {
  try {
    const safe = { version: 1, users: USERS_DB.users || [] };
    fs.writeFileSync(USERS_DB_PATH, JSON.stringify(safe, null, 2), 'utf-8');
  } catch (e) {
    console.error('[users] Failed to save users.json:', e && e.message ? e.message : e);
  }
}

function findUserById(id) {
  const pid = String(id || '').trim();
  if (!pid) return null;
  return (USERS_DB.users || []).find(u => u && u.id === pid) || null;
}

function findUserByUsername(username) {
  const nu = normalizeUsername(username);
  if (!nu) return null;
  return (USERS_DB.users || []).find(u => u && normalizeUsername(u.username) === nu) || null;
}

function pbkdf2Hash(password, saltHex) {
  const pw = String(password || '');
  const salt = Buffer.from(String(saltHex || ''), 'hex');
  // keep runtime reasonable; increase if desired
  const iters = 120_000;
  const dk = crypto.pbkdf2Sync(pw, salt, iters, 32, 'sha256');
  return dk.toString('hex');
}

function safeUserPublic(u) {
  if (!u) return null;
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName || u.username,
    stats: u.stats || { gamesPlayed: 0, wins: 0, losses: 0, totalVP: 0, lastGameAt: 0 },
    createdAt: u.createdAt || 0,
    lastLoginAt: u.lastLoginAt || 0,
  };
}

function validateUsername(username) {
  const u = String(username || '').trim();
  // 3-24 chars: letters/numbers/underscore/dot/hyphen
  if (!/^[a-zA-Z0-9_.-]{3,24}$/.test(u)) return { ok: false, error: 'Username must be 3–24 chars (letters, numbers, _ . -).' };
  return { ok: true, value: u };
}

function validatePassword(password) {
  const p = String(password || '');
  if (p.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };
  if (p.length > 200) return { ok: false, error: 'Password too long.' };
  return { ok: true, value: p };
}

function issueAuthToken(user) {
  const token = crypto.randomBytes(32).toString('base64url');
  const nowMs = now();
  if (!user.tokens || !Array.isArray(user.tokens)) user.tokens = [];
  // prune expired
  user.tokens = user.tokens.filter(t => t && t.token && (t.expiresAt || 0) > nowMs);
  user.tokens.unshift({ token, createdAt: nowMs, lastUsedAt: nowMs, expiresAt: nowMs + AUTH_TOKEN_TTL_MS });
  if (user.tokens.length > AUTH_TOKENS_MAX) user.tokens.length = AUTH_TOKENS_MAX;
  return token;
}

function authenticateByToken(token) {
  const t = String(token || '').trim();
  if (!t) return null;
  const nowMs = now();
  for (const u of (USERS_DB.users || [])) {
    if (!u || !Array.isArray(u.tokens)) continue;
    const rec = u.tokens.find(x => x && x.token === t);
    if (!rec) continue;
    if ((rec.expiresAt || 0) <= nowMs) continue;
    rec.lastUsedAt = nowMs;
    return u;
  }
  return null;
}

function createUser({ username, password, displayName }) {
  const vu = validateUsername(username);
  if (!vu.ok) return { ok: false, error: vu.error };
  const vp = validatePassword(password);
  if (!vp.ok) return { ok: false, error: vp.error };
  const un = normalizeUsername(vu.value);
  if (findUserByUsername(un)) return { ok: false, error: 'Username already exists.' };

  const id = crypto.randomUUID();
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = pbkdf2Hash(vp.value, salt);
  const dn = cleanDisplayName(displayName) || vu.value.slice(0, 20);

  const user = {
    id,
    username: vu.value,
    displayName: dn,
    pass: { salt, hash },
    tokens: [],
    stats: { gamesPlayed: 0, wins: 0, losses: 0, totalVP: 0, lastGameAt: 0 },
    createdAt: now(),
    lastLoginAt: 0,
  };
  USERS_DB.users.push(user);
  saveUsersDb();
  return { ok: true, user };
}

function verifyPassword(user, password) {
  if (!user || !user.pass || !user.pass.salt || !user.pass.hash) return false;
  try {
    const hash = pbkdf2Hash(password, user.pass.salt);
    // constant-time compare
    const a = Buffer.from(hash, 'hex');
    const b = Buffer.from(String(user.pass.hash), 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch (_) {
    return false;
  }
}

function setUserDisplayName(user, displayName) {
  if (!user) return;
  const dn = cleanDisplayName(displayName);
  if (dn) user.displayName = dn;
}

loadUsersDb();

loadHistoryDb();

// Repair any inflated user stats caused by older builds (stats should match *valid* history).
rebuildUserStatsFromHistory();


// -------------------- Geometry + Rules --------------------

const HEX_DIRS = [
  [1, 0], [1, -1], [0, -1],
  [-1, 0], [-1, 1], [0, 1],
];

function axialKey(q, r) { return `${q},${r}`; }

function axialDist(q, r) {
  const s = -q - r;
  return Math.max(Math.abs(q), Math.abs(r), Math.abs(s));
}

function generateAxials(radius = 2) {
  const coords = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      const s = -q - r;
      if (Math.max(Math.abs(q), Math.abs(r), Math.abs(s)) <= radius) coords.push({ q, r });
    }
  }
  return coords; // length 19 when radius=2
}

// Custom Seafarers geometry for the "Through the Desert" layout (70 tiles).
// This matches the provided template: 9 rows with lengths 6,7,8,9,10,9,8,7,6.
function generateThroughTheDesertAxials() {
  const coords = [];
  for (let r = -4; r <= 4; r++) {
    const qMin = (r <= 0) ? (-4 - r) : -4;
    const qMax = (r <= 0) ? 5 : (5 - r);
    for (let q = qMin; q <= qMax; q++) coords.push({ q, r });
  }
  return coords; // length 70
}

// Through the Desert: starting island restriction for *initial* settlement placement.
// During setup, players may only place settlements on the starting island (pink region in the provided template)
// which includes those land tiles plus the three fixed desert tiles.
const TTD_START_ISLAND_KEYS = new Set([
  // Pink land tiles
  '2,-3',
  '1,-2','2,-2',
  '0,-1','1,-1','2,-1',
  '-1,0','0,0','1,0',
  '-3,1','-2,1','-1,1','0,1',
  '-3,2','-2,2','-1,2',
  '-2,3',
  // Fixed deserts (yellow in the template)
  '1,-3','0,-2','-1,-1',
]);

const FOG_ISLAND_FOG_KEYS = new Set([
  '0,-3',
  '-1,-2', '0,-2',
  '0,-1',
  '0,0', '1,0',
  '0,1', '1,1',
  '0,2', '1,2',
  '0,3', '1,3',
]);

const FOG_ISLAND_START_LAND_KEYS = new Set([
  // Upper-right island
  '2,-3','3,-3','4,-3',
  '2,-2','3,-2','4,-2',
  '3,-1','4,-1',
  '3,0',
  '3,1',
  // Lower-left island
  '-2,0',
  '-3,1','-2,1',
  '-3,2','-2,2',
  '-3,3','-2,3',
]);

// Fog Island: keep the two starting islands separated for constraints (e.g., red-number distribution).
const FOG_ISLAND_START_ISLAND_A_KEYS = new Set([
  // Upper-right island
  '2,-3','3,-3','4,-3',
  '2,-2','3,-2','4,-2',
  '3,-1','4,-1',
  '3,0',
  '3,1',
]);

const FOG_ISLAND_START_ISLAND_B_KEYS = new Set([
  // Lower-left island
  '-2,0',
  '-3,1','-2,1',
  '-3,2','-2,2',
  '-3,3','-2,3',
]);


// Through the Desert: "across the desert" bonus locations (3 red tiles in the template).
// When a player places their first settlement touching any of these tiles (during main-actions),
// they gain +2 VP once (similar to the new-island bonus).
const TTD_ACROSS_DESERT_KEYS = new Set([
  '0,-3',
  '-1,-2',
  '-2,-1',
]);

function nodeTouchesTTDAcrossDesert(game, nodeId) {
  const adj = game?.geom?.nodeAdjTiles?.[nodeId] || [];
  for (const tid of adj) {
    const t = game?.geom?.tiles?.[tid];
    if (!t) continue;
    const key = `${t.q},${t.r}`;
    if (TTD_ACROSS_DESERT_KEYS.has(key)) return true;
  }
  return false;
}


function nodeIsOnTTDStartIsland(game, nodeId) {
  const adj = game?.geom?.nodeAdjTiles?.[nodeId] || [];
  let sawLand = false;
  for (const tid of adj) {
    const t = game?.geom?.tiles?.[tid];
    if (!t) continue;
    if (t.type === 'sea') continue;
    sawLand = true;
    const key = `${t.q},${t.r}`;
    if (!TTD_START_ISLAND_KEYS.has(key)) return false;
  }
  return sawLand;
}

function nodeIsOnFogStartIslands(game, nodeId) {
  const adj = game?.geom?.nodeAdjTiles?.[nodeId] || [];
  let sawLand = false;
  for (const tid of adj) {
    const t = game?.geom?.tiles?.[tid];
    if (!t) continue;
    // Treat unrevealed fog tiles as sea during setup.
    if (t.fog && !t.revealed) continue;
    if (t.type === 'sea') continue;
    sawLand = true;
    const key = `${t.q},${t.r}`;
    if (!FOG_ISLAND_START_LAND_KEYS.has(key)) return false;
  }
  return sawLand;
}

function seafarersScenarioKey(game) {
  return String((game && game.rules && game.rules.seafarersScenario) || 'four_islands').toLowerCase().replace(/-/g,'_');
}

function isFogIslandGame(game) {
  return !!(game && (game.rules?.mapMode || 'classic') === 'seafarers' && seafarersScenarioKey(game) === 'fog_island');
}

// Fog Island exploration (Option B):
// Whenever a road/ship is placed (or a ship is moved) on an edge that borders unrevealed fog,
// reveal exactly ONE fog tile. If the edge borders multiple unrevealed fog tiles, always pick
// the first tile in a fixed order (lowest tileId).
function pickFirstUnrevealedFogTileOnEdge(game, edgeId) {
  const adj = (game && game.geom && game.geom.edgeAdjTiles) ? (game.geom.edgeAdjTiles[edgeId] || []) : [];
  if (!Array.isArray(adj) || adj.length === 0) return null;
  const ids = adj.slice().sort((a, b) => a - b);
  for (const tid of ids) {
    const t = game.geom.tiles && game.geom.tiles[tid];
    if (t && t.fog && !t.revealed) return tid;
  }
  return null;
}

function revealFogTile(game, tileId) {
  const t = game && game.geom && game.geom.tiles ? game.geom.tiles[tileId] : null;
  if (!t || !t.fog || t.revealed) return null;

  t.revealed = true;

  const ht = (t.hiddenType || 'sea');
  const hn = (ht === 'sea' || ht === 'desert') ? null : (t.hiddenNumber ?? null);

  t.type = ht;
  t.number = hn;

  // Hidden info should never be needed client-side once revealed.
  try { delete t.hiddenType; } catch (_) {}
  try { delete t.hiddenNumber; } catch (_) {}

  return t;
}

function awardFogDiscovery(game, playerId, tileId) {
  const t = game && game.geom && game.geom.tiles ? game.geom.tiles[tileId] : null;
  if (!t || !t.revealed) return null;

  if (t.type === 'sea') {
    pushLog(game, `${playerName(game, playerId)} revealed sea.`, 'discover', { tileId, tileType: 'sea' });
    return { kind: 'sea' };
  }

  if (t.type === 'gold') {
    game.discoverySeq = game.discoverySeq || 1;
    game.special = { kind: 'discovery_gold', id: game.discoverySeq++, forPlayerId: playerId, tileId };
    game.message = `Gold Field discovered. ${playerName(game, playerId)} must choose a resource.`;
    pushLog(game, `${playerName(game, playerId)} discovered a Gold Field.`, 'discover', { tileId, tileType: 'gold' });
    return { kind: 'gold' };
  }

  const rk = RESOURCE_MAP[t.type];
  if (rk) {
    const p = playerById(game, playerId);
    const got = p ? grantFromBankStats(game, playerId, p.resources, rk, 1, 'discover') : 0;
    if (got > 0) {
      pushLog(game, `${playerName(game, playerId)} discovered ${t.type} (+1 ${rk}).`, 'discover', { tileId, tileType: t.type, resourceKind: rk, amount: got });
    } else {
      pushLog(game, `${playerName(game, playerId)} discovered ${t.type}. (Bank out of ${rk}.)`, 'discover', { tileId, tileType: t.type, resourceKind: rk, amount: 0 });
    }
    return { kind: 'resource', resourceKind: rk, amount: got };
  }

  pushLog(game, `${playerName(game, playerId)} discovered ${t.type}.`, 'discover', { tileId, tileType: t.type });
  return { kind: 'other' };
}

function maybeExploreFogFromEdge(game, playerId, edgeId) {
  if (!isFogIslandGame(game)) return null;
  // Exploration only applies during main gameplay, including ship move before rolling.
  if (game.phase !== 'main-actions' && game.phase !== 'main-await-roll') return null;
  if (game.special && game.special.kind === 'discovery_gold') return null;

  const tid = pickFirstUnrevealedFogTileOnEdge(game, edgeId);
  if (tid == null) return null;

  const tile = revealFogTile(game, tid);
  if (!tile) return null;

  const award = awardFogDiscovery(game, playerId, tid);
  return { tileId: tid, tileType: tile.type, award };
}



function axialToPixel(q, r, size = 1) {
  // Pointy-top axial -> pixel
  const x = Math.sqrt(3) * (q + r / 2) * size;
  const y = (3 / 2) * r * size;
  return { x, y };
}

function hexCorners(center, size = 1) {
  const corners = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (30 + 60 * i); // pointy-top
    corners.push({
      x: center.x + Math.cos(angle) * size,
      y: center.y + Math.sin(angle) * size,
    });
  }
  return corners;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function buildGeometry(radius = 2) {
  const axials = generateAxials(radius);
  const tiles = axials.map((a, idx) => {
    const c = axialToPixel(a.q, a.r, 1);
    return {
      id: idx,
      q: a.q,
      r: a.r,
      cx: c.x,
      cy: c.y,
      type: 'unknown',
      number: null,
      robber: false,
      pirate: false,
      cornerNodeIds: [],
    };
  });

  // Build nodes by de-duplicating corners
  const nodeMap = new Map(); // key -> nodeId
  const nodes = [];
  const nodeAdjTiles = []; // nodeId -> [tileIds]
  function keyForPoint(p) {
    // round hard to stable keys
    return `${Math.round(p.x * 10000) / 10000},${Math.round(p.y * 10000) / 10000}`;
  }

  for (const t of tiles) {
    const corners = hexCorners({ x: t.cx, y: t.cy }, 1);
    const ids = [];
    for (const p of corners) {
      const k = keyForPoint(p);
      let nid = nodeMap.get(k);
      if (nid === undefined) {
        nid = nodes.length;
        nodeMap.set(k, nid);
        nodes.push({ id: nid, x: p.x, y: p.y, building: null, adj: [] });
        nodeAdjTiles.push([]);
      }
      ids.push(nid);
      nodeAdjTiles[nid].push(t.id);
    }
    t.cornerNodeIds = ids;
  }

  // Build edges
  const edgeMap = new Map(); // "a-b" -> edgeId
  const edges = [];
  const edgeAdjTiles = []; // edgeId -> [tileIds]
  const nodeEdges = Array.from({ length: nodes.length }, () => []);
  for (const t of tiles) {
    const ids = t.cornerNodeIds;
    for (let i = 0; i < 6; i++) {
      const a = ids[i];
      const b = ids[(i + 1) % 6];
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      const k = `${lo}-${hi}`;
      let eid = edgeMap.get(k);
      if (eid === undefined) {
        eid = edges.length;
        edgeMap.set(k, eid);
        const ax = nodes[lo].x, ay = nodes[lo].y;
        const bx = nodes[hi].x, by = nodes[hi].y;
        edges.push({
          id: eid,
          a: lo,
          b: hi,
          roadOwner: null,
          shipOwner: null,
          mx: (ax + bx) / 2,
          my: (ay + by) / 2,
        });
        edgeAdjTiles[eid] = [];
      }
      nodeEdges[a].push(eid);
      nodeEdges[b].push(eid);

      // Track tile adjacency for coastline/ports.
      // Each edge belongs to 1 tile on the coast or 2 tiles in the interior.
      if (!edgeAdjTiles[eid].includes(t.id)) edgeAdjTiles[eid].push(t.id);
    }
  }

  // Node adjacency via edges
  for (const e of edges) {
    if (!nodes[e.a].adj.includes(e.b)) nodes[e.a].adj.push(e.b);
    if (!nodes[e.b].adj.includes(e.a)) nodes[e.b].adj.push(e.a);
  }

  // Tile neighbor lists (useful for placement constraints)
  const tileCoordMap = new Map();
  for (const t of tiles) tileCoordMap.set(axialKey(t.q, t.r), t.id);
  const tileNeighbors = Array.from({ length: tiles.length }, () => []);
  for (const t of tiles) {
    const nbs = [];
    for (const [dq, dr] of HEX_DIRS) {
      const nid = tileCoordMap.get(axialKey(t.q + dq, t.r + dr));
      if (nid !== undefined) nbs.push(nid);
    }
    tileNeighbors[t.id] = nbs;
  }

  return {
    tiles,
    nodes,
    edges,
    nodeAdjTiles,
    nodeEdges,
    edgeAdjTiles,
    tileNeighbors,
  };
}

function buildGeometryFromAxials(axials) {
  const tiles = axials.map((a, idx) => {
    const c = axialToPixel(a.q, a.r, 1);
    return {
      id: idx,
      q: a.q,
      r: a.r,
      cx: c.x,
      cy: c.y,
      type: 'unknown',
      number: null,
      robber: false,
      pirate: false,
      cornerNodeIds: [],
    };
  });

  // Build nodes by de-duplicating corners
  const nodeMap = new Map(); // key -> nodeId
  const nodes = [];
  const nodeAdjTiles = []; // nodeId -> [tileIds]
  function keyForPoint(p) {
    // round hard to stable keys
    return `${Math.round(p.x * 10000) / 10000},${Math.round(p.y * 10000) / 10000}`;
  }

  for (const t of tiles) {
    const corners = hexCorners({ x: t.cx, y: t.cy }, 1);
    const ids = [];
    for (const p of corners) {
      const k = keyForPoint(p);
      let nid = nodeMap.get(k);
      if (nid === undefined) {
        nid = nodes.length;
        nodeMap.set(k, nid);
        nodes.push({ id: nid, x: p.x, y: p.y, building: null, adj: [] });
        nodeAdjTiles.push([]);
      }
      ids.push(nid);
      nodeAdjTiles[nid].push(t.id);
    }
    t.cornerNodeIds = ids;
  }

  // Build edges
  const edgeMap = new Map(); // "a-b" -> edgeId
  const edges = [];
  const edgeAdjTiles = []; // edgeId -> [tileIds]
  const nodeEdges = Array.from({ length: nodes.length }, () => []);
  for (const t of tiles) {
    const ids = t.cornerNodeIds;
    for (let i = 0; i < 6; i++) {
      const a = ids[i];
      const b = ids[(i + 1) % 6];
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      const k = `${lo}-${hi}`;
      let eid = edgeMap.get(k);
      if (eid === undefined) {
        eid = edges.length;
        edgeMap.set(k, eid);
        const ax = nodes[lo].x, ay = nodes[lo].y;
        const bx = nodes[hi].x, by = nodes[hi].y;
        edges.push({
          id: eid,
          a: lo,
          b: hi,
          roadOwner: null,
          shipOwner: null,
          mx: (ax + bx) / 2,
          my: (ay + by) / 2,
        });
        edgeAdjTiles[eid] = [];
      }
      nodeEdges[a].push(eid);
      nodeEdges[b].push(eid);

      // Track tile adjacency for coastline/ports.
      // Each edge belongs to 1 tile on the coast or 2 tiles in the interior.
      if (!edgeAdjTiles[eid].includes(t.id)) edgeAdjTiles[eid].push(t.id);
    }
  }

  // Node adjacency via edges
  for (const e of edges) {
    if (!nodes[e.a].adj.includes(e.b)) nodes[e.a].adj.push(e.b);
    if (!nodes[e.b].adj.includes(e.a)) nodes[e.b].adj.push(e.a);
  }

  // Tile neighbor lists (useful for placement constraints)
  const tileCoordMap = new Map();
  for (const t of tiles) tileCoordMap.set(axialKey(t.q, t.r), t.id);
  const tileNeighbors = Array.from({ length: tiles.length }, () => []);
  for (const t of tiles) {
    const nbs = [];
    for (const [dq, dr] of HEX_DIRS) {
      const nid = tileCoordMap.get(axialKey(t.q + dq, t.r + dr));
      if (nid !== undefined) nbs.push(nid);
    }
    tileNeighbors[t.id] = nbs;
  }

  return {
    tiles,
    nodes,
    edges,
    nodeAdjTiles,
    nodeEdges,
    edgeAdjTiles,
    tileNeighbors,
  };
}

function tileAdjacency(tiles) {
  const map = new Map();
  for (const t of tiles) map.set(axialKey(t.q, t.r), t.id);

  const adj = new Map(); // tileId -> [tileId]
  for (const t of tiles) {
    const neighbors = [];
    for (const [dq, dr] of HEX_DIRS) {
      const nid = map.get(axialKey(t.q + dq, t.r + dr));
      if (nid !== undefined) neighbors.push(nid);
    }
    adj.set(t.id, neighbors);
  }
  return adj;
}

const RESOURCE_MAP = {
  forest: 'lumber',
  hills: 'brick',
  pasture: 'wool',
  field: 'grain',
  mountains: 'ore',
  gold: null,
  desert: null,
  sea: null,
};

const BUILD_COSTS = {
  road: { brick: 1, lumber: 1 },
  ship: { lumber: 1, wool: 1 },
  settlement: { brick: 1, lumber: 1, wool: 1, grain: 1 },
  city: { grain: 2, ore: 3 },
};

const DEV_CARD_COST = { wool: 1, grain: 1, ore: 1 };

const DEV_CARD_TYPES = {
  KNIGHT: 'knight',
  ROAD_BUILDING: 'road_building',
  INVENTION: 'invention', // Year of Plenty
  MONOPOLY: 'monopoly',
  VICTORY_POINT: 'victory_point',
};

const RESOURCE_KINDS = ['brick', 'lumber', 'wool', 'grain', 'ore'];

const BANK_MAX = 19;

function ensureBank(game) {
  if (!game) return;
  if (!game.bank) game.bank = {};
  for (const k of RESOURCE_KINDS) {
    let v = Number(game.bank[k]);
    if (!Number.isFinite(v)) v = BANK_MAX;
    v = Math.max(0, Math.min(BANK_MAX, Math.floor(v)));
    game.bank[k] = v;
  }
}

function bankGive(game, kind, n) {
  if (!game || !RESOURCE_KINDS.includes(kind)) return 0;
  ensureBank(game);
  const want = Math.max(0, Math.floor(Number(n || 0)));
  const avail = Math.max(0, Math.floor(Number(game.bank[kind] || 0)));
  const give = Math.min(avail, want);
  game.bank[kind] = avail - give;
  return give;
}

function bankReceive(game, kind, n) {
  if (!game || !RESOURCE_KINDS.includes(kind)) return 0;
  ensureBank(game);
  const add = Math.max(0, Math.floor(Number(n || 0)));
  const cur = Math.max(0, Math.floor(Number(game.bank[kind] || 0)));
  const next = Math.min(BANK_MAX, cur + add);
  game.bank[kind] = next;
  return next - cur;
}

function grantFromBankStats(game, playerId, res, kind, n, source) {
  const g = bankGive(game, kind, n);
  if (g > 0) grantStats(game, playerId, res, kind, g, source);
  return g;
}


function emptyDiceStats() {
  const ds = {};
  for (let i = 2; i <= 12; i++) ds[i] = 0;
  return ds;
}





// -------------------- Game Stats (post-game breakdown) --------------------
const STAT_RESOURCE_SOURCES_GAIN = ['setup','production','discover','trade','steal','dev','other'];
const STAT_RESOURCE_SOURCES_LOSS = ['build','trade','steal','discard','dev','other'];

function _emptyResMap() {
  return { brick: 0, lumber: 0, wool: 0, grain: 0, ore: 0 };
}

function initGameStats(game) {
  const nowMs = Date.now();
  const stats = {
    startedAt: nowMs,
    endedAt: null,
    rolls: {
      total: 0,
      byNumber: emptyDiceStats(),
      byPlayer: {},
      history: [],
    },
    turnTimes: {
      byPlayer: {},
      history: [],
    },
    resources: {
      byPlayer: {},
    },
    builds: {
      byPlayer: {},
    },
    trades: {
      byPlayer: {},
    },
    thieves: {
      robber: { movesByPlayer: {}, stealsByPlayer: {}, stolenFromByPlayer: {} },
      pirate: { movesByPlayer: {}, stealsByPlayer: {}, stolenFromByPlayer: {} },
    },
    dev: {
      byPlayer: {},
    },
    actions: {
      byPlayer: {},
    },
    turnClock: { currentTurn: null, currentPlayerId: null, startedAt: null },
  };

  for (const p of (game.players || [])) {
    const pid = p.id;
    stats.rolls.byPlayer[pid] = emptyDiceStats();
    stats.turnTimes.byPlayer[pid] = { totalMs: 0, turns: 0, avgMs: 0 };

    const res = {
      gained: _emptyResMap(),
      lost: _emptyResMap(),
      gainedBySource: {},
      lostBySource: {},
      byTurn: {},
    };
    for (const src of STAT_RESOURCE_SOURCES_GAIN) res.gainedBySource[src] = _emptyResMap();
    for (const src of STAT_RESOURCE_SOURCES_LOSS) res.lostBySource[src] = _emptyResMap();
    stats.resources.byPlayer[pid] = res;

    stats.builds.byPlayer[pid] = { road: 0, ship: 0, ship_move: 0, settlement: 0, city: 0 };
    stats.trades.byPlayer[pid] = { bank: 0, player: 0 };
    stats.dev.byPlayer[pid] = { bought: 0, played: 0, boughtByType: {}, playedByType: {} };
    stats.actions.byPlayer[pid] = { robberMoves: 0, pirateMoves: 0, robberSteals: 0, pirateSteals: 0, discards: 0 };
    stats.thieves.robber.movesByPlayer[pid] = 0;
    stats.thieves.robber.stealsByPlayer[pid] = 0;
    stats.thieves.robber.stolenFromByPlayer[pid] = 0;
    stats.thieves.pirate.movesByPlayer[pid] = 0;
    stats.thieves.pirate.stealsByPlayer[pid] = 0;
    stats.thieves.pirate.stolenFromByPlayer[pid] = 0;
  }

  game.stats = stats;
  return stats;
}

function ensureGameStats(game) {
  if (!game) return null;
  if (!game.stats) return initGameStats(game);
  return game.stats;
}

function recordTurnStart(game) {
  const st = ensureGameStats(game);
  if (!st) return;
  st.turnClock.currentTurn = game.turnNumber;
  st.turnClock.currentPlayerId = game.currentPlayerId;
  st.turnClock.startedAt = Date.now();
}

function recordTurnEnd(game, playerId) {
  const st = ensureGameStats(game);
  if (!st) return;
  const tc = st.turnClock || {};
  if (!tc.startedAt || tc.currentPlayerId !== playerId) return;
  const ms = Math.max(0, Date.now() - tc.startedAt);
  const rec = st.turnTimes.byPlayer[playerId];
  if (rec) {
    rec.totalMs += ms;
    rec.turns += 1;
    rec.avgMs = rec.turns ? Math.round(rec.totalMs / rec.turns) : 0;
  }
  st.turnTimes.history.push({ turn: tc.currentTurn, playerId, ms });
  st.turnClock = { currentTurn: null, currentPlayerId: null, startedAt: null };
}

function recordRoll(game, playerId, roll, d1, d2) {
  const st = ensureGameStats(game);
  if (!st) return;
  st.rolls.total += 1;
  st.rolls.byNumber[roll] = (st.rolls.byNumber[roll] || 0) + 1;
  const bp = st.rolls.byPlayer[playerId];
  if (bp) bp[roll] = (bp[roll] || 0) + 1;
  st.rolls.history.push({ turn: game.turnNumber, playerId, roll, d1, d2, ts: Date.now() });
  if (st.rolls.history.length > 5000) st.rolls.history.splice(0, st.rolls.history.length - 5000);
}

function recordBuild(game, playerId, kind) {
  const st = ensureGameStats(game);
  if (!st) return;
  const b = st.builds.byPlayer[playerId];
  if (b && Object.prototype.hasOwnProperty.call(b, kind)) b[kind] += 1;
}

function recordTrade(game, playerId, kind) {
  const st = ensureGameStats(game);
  if (!st) return;
  const t = st.trades.byPlayer[playerId];
  if (t && Object.prototype.hasOwnProperty.call(t, kind)) t[kind] += 1;
}

function recordDevBought(game, playerId, cardType) {
  const st = ensureGameStats(game);
  if (!st) return;
  const d = st.dev.byPlayer[playerId];
  if (!d) return;
  d.bought += 1;
  d.boughtByType[cardType] = (d.boughtByType[cardType] || 0) + 1;
}

function recordDevPlayed(game, playerId, cardType) {
  const st = ensureGameStats(game);
  if (!st) return;
  const d = st.dev.byPlayer[playerId];
  if (!d) return;
  d.played += 1;
  d.playedByType[cardType] = (d.playedByType[cardType] || 0) + 1;
}

function recordResourceDelta(game, playerId, delta, source) {
  const st = ensureGameStats(game);
  if (!st) return;
  const pr = st.resources?.byPlayer?.[playerId];
  if (!pr || !delta) return;
  const src = String(source || 'other');

  

  // Per-turn net delta tracking (signed). Uses game.turnNumber as the turn index.
  const t = (game && Number.isFinite(game.turnNumber)) ? game.turnNumber : 0;
  if (!pr.byTurn) pr.byTurn = {};
  if (!pr.byTurn[t]) pr.byTurn[t] = _emptyResMap();


  for (const k of RESOURCE_KINDS) {
    const v = Number(delta[k] || 0);
    if (!v) continue;
    if (v > 0) {
      pr.gained[k] = (pr.gained[k] || 0) + v;
      pr.gainedBySource[src][k] = (pr.gainedBySource[src][k] || 0) + v;
    } else {
      const n = -v;
      pr.lost[k] = (pr.lost[k] || 0) + n;
      pr.lostBySource[src][k] = (pr.lostBySource[src][k] || 0) + n;
    }
    // Net delta for this turn (signed)
    pr.byTurn[t][k] = (pr.byTurn[t][k] || 0) + v;
  }
}

function payCostStats(game, playerId, res, cost, source) {
  payCost(res, cost);

  // Spent resources return to the bank (bank is capped at 19 of each resource).
  ensureBank(game);
  for (const k of Object.keys(cost || {})) {
    const n = Math.max(0, Math.floor(Number(cost[k] || 0)));
    if (n > 0 && RESOURCE_KINDS.includes(k)) bankReceive(game, k, n);
  }

  const delta = {};
  for (const k of Object.keys(cost || {})) delta[k] = -(cost[k] || 0);
  recordResourceDelta(game, playerId, delta, source || 'build');
}

function grantStats(game, playerId, res, kind, n, source) {
  grant(res, kind, n);
  if (!kind) return;
  recordResourceDelta(game, playerId, { [kind]: Number(n || 0) }, source || 'production');
}

function recordRobberMove(game, playerId) {
  const st = ensureGameStats(game);
  if (!st) return;
  st.actions.byPlayer[playerId].robberMoves += 1;
  st.thieves.robber.movesByPlayer[playerId] = (st.thieves.robber.movesByPlayer[playerId] || 0) + 1;
}

function recordPirateMove(game, playerId) {
  const st = ensureGameStats(game);
  if (!st) return;
  st.actions.byPlayer[playerId].pirateMoves += 1;
  st.thieves.pirate.movesByPlayer[playerId] = (st.thieves.pirate.movesByPlayer[playerId] || 0) + 1;
}

function recordRobberSteal(game, thiefId, victimId, resourceKind) {
  const st = ensureGameStats(game);
  if (!st) return;
  st.actions.byPlayer[thiefId].robberSteals += 1;
  st.thieves.robber.stealsByPlayer[thiefId] = (st.thieves.robber.stealsByPlayer[thiefId] || 0) + 1;
  st.thieves.robber.stolenFromByPlayer[victimId] = (st.thieves.robber.stolenFromByPlayer[victimId] || 0) + 1;
  if (resourceKind) {
    recordResourceDelta(game, thiefId, { [resourceKind]: 1 }, 'steal');
    recordResourceDelta(game, victimId, { [resourceKind]: -1 }, 'steal');
  }
}

function recordPirateSteal(game, thiefId, victimId, resourceKind) {
  const st = ensureGameStats(game);
  if (!st) return;
  st.actions.byPlayer[thiefId].pirateSteals += 1;
  st.thieves.pirate.stealsByPlayer[thiefId] = (st.thieves.pirate.stealsByPlayer[thiefId] || 0) + 1;
  st.thieves.pirate.stolenFromByPlayer[victimId] = (st.thieves.pirate.stolenFromByPlayer[victimId] || 0) + 1;
  if (resourceKind) {
    recordResourceDelta(game, thiefId, { [resourceKind]: 1 }, 'steal');
    recordResourceDelta(game, victimId, { [resourceKind]: -1 }, 'steal');
  }
}

function recordDiscard(game, playerId, discards) {
  const st = ensureGameStats(game);
  if (!st) return;
  st.actions.byPlayer[playerId].discards += 1;
  const delta = {};
  for (const k of RESOURCE_KINDS) {
    const n = Number(discards?.[k] || 0);
    if (n) delta[k] = -(n);
  }
  recordResourceDelta(game, playerId, delta, 'discard');
}

function recordShipMove(game, playerId) {
  const st = ensureGameStats(game);
  if (!st) return;
  const b = st.builds.byPlayer[playerId];
  if (b) b.ship_move = (b.ship_move || 0) + 1;
}

function filterStatsForViewer(stats, viewerId) {
  if (!stats || !viewerId) return null;
  const s = JSON.parse(JSON.stringify(stats));
  // Keep global roll totals, but only keep per-player sensitive sections for the viewer.
  for (const pid of Object.keys(s.rolls?.byPlayer || {})) {
    if (pid !== viewerId) delete s.rolls.byPlayer[pid];
  }
  for (const pid of Object.keys(s.turnTimes?.byPlayer || {})) {
    if (pid !== viewerId) delete s.turnTimes.byPlayer[pid];
  }
  for (const pid of Object.keys(s.resources?.byPlayer || {})) {
    if (pid !== viewerId) delete s.resources.byPlayer[pid];
  }
  for (const pid of Object.keys(s.builds?.byPlayer || {})) {
    if (pid !== viewerId) delete s.builds.byPlayer[pid];
  }
  for (const pid of Object.keys(s.trades?.byPlayer || {})) {
    if (pid !== viewerId) delete s.trades.byPlayer[pid];
  }
  for (const pid of Object.keys(s.dev?.byPlayer || {})) {
    if (pid !== viewerId) delete s.dev.byPlayer[pid];
  }
  for (const pid of Object.keys(s.actions?.byPlayer || {})) {
    if (pid !== viewerId) delete s.actions.byPlayer[pid];
  }
  for (const pid of Object.keys(s.thieves?.robber?.movesByPlayer || {})) {
    if (pid !== viewerId) delete s.thieves.robber.movesByPlayer[pid];
  }
  for (const pid of Object.keys(s.thieves?.robber?.stealsByPlayer || {})) {
    if (pid !== viewerId) delete s.thieves.robber.stealsByPlayer[pid];
  }
  for (const pid of Object.keys(s.thieves?.robber?.stolenFromByPlayer || {})) {
    if (pid !== viewerId) delete s.thieves.robber.stolenFromByPlayer[pid];
  }
  for (const pid of Object.keys(s.thieves?.pirate?.movesByPlayer || {})) {
    if (pid !== viewerId) delete s.thieves.pirate.movesByPlayer[pid];
  }
  for (const pid of Object.keys(s.thieves?.pirate?.stealsByPlayer || {})) {
    if (pid !== viewerId) delete s.thieves.pirate.stealsByPlayer[pid];
  }
  for (const pid of Object.keys(s.thieves?.pirate?.stolenFromByPlayer || {})) {
    if (pid !== viewerId) delete s.thieves.pirate.stolenFromByPlayer[pid];
  }
  return s;
}

// -------------------- Timers & Rules --------------------
const DEFAULT_RULES = Object.freeze({
  discardLimit: 7,
  setupTurnMs: 60_000,   // initial placement phases
  playTurnMs: 30_000,    // main action phase
  // "micro" phases: roll / robber / steal / discard
  // NOTE: the lobby UI and set_rules use microPhaseMs; keep both keys for compatibility.
  microMs: 15_000,
  microPhaseMs: 15_000,
  mapMode: 'classic',
  seafarersScenario: 'four_islands',
  victoryPointsToWin: 10,
});

function defaultVictoryPointsToWin(rules) {
  const mm = String(rules?.mapMode || 'classic').toLowerCase();
  if (mm !== 'seafarers') return 10;
  const scen = String(rules?.seafarersScenario || 'four_islands').toLowerCase();
  if (scen === 'fog_island' || scen === 'fog-island' || scen === 'fog') return 12;
  if (scen === 'through_the_desert' || scen === 'through-the-desert' || scen === 'desert' || scen === 'throughdesert') return 14;
  return 13; // four islands
}

function phaseDurationMs(game, phase) {
  const rules = game?.rules || DEFAULT_RULES;
  const micro = (rules.microPhaseMs ?? rules.microMs ?? DEFAULT_RULES.microMs);
  switch (phase) {
    case 'setup1-settlement':
    case 'setup1-road':
    case 'setup2-settlement':
    case 'setup2-road':
      return rules.setupTurnMs;
    case 'main-await-roll':
      return micro;
    case 'main-actions':
      return rules.playTurnMs;
    case 'discard':
      return micro;
    case 'robber-move':
      return micro;
    case 'robber-steal':
      return micro;
    default:
      return 0;
  }
}

function syncTimer(game) {
  if (!game) return;
  const dur = phaseDurationMs(game, game.phase);
  if (!dur) {
    game.timer = null;
    return;
  }
  if (!game.timer || game.timer.phase !== game.phase) {
    const t0 = now();
    game.timer = { phase: game.phase, startedAt: t0, endsAt: t0 + dur, durationMs: dur };
  }
}

function pauseGame(game, byId) {
  if (!game || game.paused) return;
  syncTimer(game);
  const t = game.timer;
  const remainingMs = (t && t.endsAt) ? Math.max(0, t.endsAt - now()) : 0;
  game.paused = true;
  game.pause = { byId, at: now(), remainingMs };
}

function resumeGame(game) {
  if (!game || !game.paused) return;
  const remainingMs = Math.max(0, Math.floor(Number(game.pause?.remainingMs || 0)));
  // Rebase the current phase timer so the remaining time resumes from now.
  if (game.timer && game.timer.phase === game.phase) {
    const dur = Math.max(0, Math.floor(Number(game.timer.durationMs || phaseDurationMs(game, game.phase) || remainingMs)));
    const t0 = now();
    game.timer = {
      phase: game.phase,
      durationMs: dur,
      startedAt: t0 - Math.max(0, dur - remainingMs),
      endsAt: t0 + remainingMs,
    };
  } else {
    // If timer was missing for some reason, create a fresh one.
    const dur = phaseDurationMs(game, game.phase);
    const t0 = now();
    game.timer = dur ? { phase: game.phase, startedAt: t0, endsAt: t0 + dur, durationMs: dur } : null;
  }
  game.paused = false;
  game.pause = null;
}

function resTotal(p) {
  let t = 0;
  for (const k of RESOURCE_KINDS) t += (p?.resources?.[k] || 0);
  return t;
}

function discardRequired(p, limit) {
  const total = resTotal(p);
  return total > limit ? Math.floor(total / 2) : 0;
}

function randomDiscardMap(p, required) {
  const out = {};
  let need = Math.max(0, required | 0);
  while (need > 0) {
    // weighted pick among remaining cards
    const pool = [];
    for (const k of RESOURCE_KINDS) {
      const n = (p.resources?.[k] || 0) - (out[k] || 0);
      for (let i = 0; i < n; i++) pool.push(k);
    }
    if (!pool.length) break;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    out[pick] = (out[pick] || 0) + 1;
    need--;
  }
  return out;
}

function bestVictimByResources(state, victimIds) {
  let best = [];
  let bestN = -1;
  for (const vid of (victimIds || [])) {
    const vp = playerById(state, vid);
    const n = resTotal(vp);
    if (n > bestN) { bestN = n; best = [vid]; }
    else if (n === bestN) best.push(vid);
  }
  if (!best.length) return null;
  return best[Math.floor(Math.random() * best.length)];
}

function canAfford(res, cost) {
  for (const k of Object.keys(cost)) if ((res[k] || 0) < cost[k]) return false;
  return true;
}
function payCost(res, cost) {
  for (const k of Object.keys(cost)) res[k] = (res[k] || 0) - cost[k];
}
function grant(res, kind, n) {
  if (!kind) return;
  res[kind] = (res[kind] || 0) + n;
}

function randomResourceFrom(player) {
  const kinds = RESOURCE_KINDS.filter(k => (player.resources?.[k] || 0) > 0);
  if (!kinds.length) return null;
  return kinds[Math.floor(Math.random() * kinds.length)];
}

function buildDevDeck() {
  // Standard base-game-ish distribution (25 cards)
  const deck = [];
  deck.push(...Array(14).fill(DEV_CARD_TYPES.KNIGHT));
  deck.push(...Array(2).fill(DEV_CARD_TYPES.ROAD_BUILDING));
  deck.push(...Array(2).fill(DEV_CARD_TYPES.INVENTION));
  deck.push(...Array(2).fill(DEV_CARD_TYPES.MONOPOLY));
  deck.push(...Array(5).fill(DEV_CARD_TYPES.VICTORY_POINT));
  return shuffle(deck);
}

function computeVP(state) {
  const vp = {};
  for (const p of state.players) vp[p.id] = 0;

  // Buildings
  for (const n of state.geom.nodes) {
    if (n.building) vp[n.building.owner] += (n.building.type === 'city') ? 2 : 1;
  }

  // Victory point dev cards (played/revealed)
  for (const p of state.players) vp[p.id] += (p.vpDev || 0);

  // Seafarers: "new island" bonus VP (tracked per-player as a running total)
  for (const p of state.players) vp[p.id] += (p.newIslandVP || 0);

  // Through the Desert: across-the-desert bonus VP (tracked per-player).
  for (const p of state.players) vp[p.id] += (p.ttdFarSideVP || 0);

  // Largest Army (2 VP)
  if (state.largestArmy && state.largestArmy.playerId) vp[state.largestArmy.playerId] += 2;

  // Longest Road (2 VP)
  if (state.longestRoad && state.longestRoad.playerId) vp[state.longestRoad.playerId] += 2;

  for (const p of state.players) p.vp = vp[p.id] || 0;
}

// -------------------- Seafarers: New Island Bonus --------------------

// Returns an array tileId -> islandId (land components), with -1 for sea.
function computeLandIslands(geom) {
  const tiles = geom?.tiles || [];
  const n = tiles.length;
  const tileToIsland = new Array(n).fill(-1);
  const nbs = geom?.tileNeighbors || [];

  let islandId = 0;
  for (let i = 0; i < n; i++) {
    const t = tiles[i];
    if (!t || t.type === 'sea') continue;
    if (tileToIsland[i] !== -1) continue;

    const stack = [i];
    tileToIsland[i] = islandId;
    while (stack.length) {
      const cur = stack.pop();
      for (const nb of (nbs[cur] || [])) {
        if (nb == null) continue;
        const tt = tiles[nb];
        if (!tt || tt.type === 'sea') continue;
        if (tileToIsland[nb] !== -1) continue;
        tileToIsland[nb] = islandId;
        stack.push(nb);
      }
    }
    islandId++;
  }

  return tileToIsland;
}

function islandIdForNode(geom, nodeId, tileToIsland) {
  const adj = geom?.nodeAdjTiles?.[nodeId] || [];
  for (const tid of adj) {
    const id = tileToIsland?.[tid];
    if (id != null && id !== -1) return id;
  }
  return null;
}

function playerHasBuildingOnIsland(game, playerId, islandId, tileToIsland) {
  if (islandId == null) return false;
  const nodes = game?.geom?.nodes || [];
  for (const n of nodes) {
    if (!n.building || n.building.owner !== playerId) continue;
    const nid = n.id;
    const id = islandIdForNode(game.geom, nid, tileToIsland);
    if (id === islandId) return true;
  }
  return false;
}

// -------------------- Through the Desert: Far Side (Beyond Desert) Bonus --------------------

function ttdOuterTileIdSet(geom) {
  // "Other side of the desert" is defined as any non-sea land tile that is NOT part of the
  // TTD_START_ISLAND_KEYS set (the starting island + fixed desert tiles).
  const out = new Set();
  const tiles = geom?.tiles || [];
  for (let tid = 0; tid < tiles.length; tid++) {
    const t = tiles[tid];
    if (!t) continue;
    if (t.type === 'sea') continue;
    const key = `${t.q},${t.r}`;
    if (!TTD_START_ISLAND_KEYS.has(key)) out.add(tid);
  }
  return out;
}

function countPlayerSettledTilesInSet(game, playerId, tileIdSet) {
  // Count unique tiles in tileIdSet that the player has a settlement/city touching.
  const settled = new Set();
  const nodes = game?.geom?.nodes || [];
  for (const n of nodes) {
    if (!n || !n.building) continue;
    if (n.building.owner !== playerId) continue;
    if (n.building.type !== 'settlement' && n.building.type !== 'city') continue;
    const adj = game?.geom?.nodeAdjTiles?.[n.id] || [];
    for (const tid of adj) {
      if (tileIdSet.has(tid)) settled.add(tid);
    }
  }
  return settled.size;
}

// -------------------- Longest Road --------------------

function computeLongestRoadForPlayer(game, playerId) {
  if (!game || !game.geom || !game.geom.edges || !game.geom.nodes) return 0;
  const edges = game.geom.edges;
  const nodes = game.geom.nodes;

  // Build set of route edges owned by player (roads + ships)
  const playerEdges = [];
  for (const e of edges) {
    if (e.roadOwner === playerId || e.shipOwner === playerId) playerEdges.push(e.id);
  }
  if (playerEdges.length === 0) return 0;

  // Nodes that block continuation (opponent settlement/city)
  const blocked = new Set();
  for (const n of nodes) {
    if (n.building && n.building.owner && n.building.owner !== playerId) blocked.add(n.id);
  }

  // Adjacency: nodeId -> [edgeId]
  const adj = new Map();
  for (const eid of playerEdges) {
    const e = edges[eid];
    if (!adj.has(e.a)) adj.set(e.a, []);
    if (!adj.has(e.b)) adj.set(e.b, []);
    adj.get(e.a).push(eid);
    adj.get(e.b).push(eid);
  }

  function dfs(nodeId, prevNodeId, usedEdges) {
    // You may end at a blocked node, but you cannot pass through it.
    if (blocked.has(nodeId) && prevNodeId !== null) return 0;

    const list = adj.get(nodeId) || [];
    let best = 0;
    for (const eid of list) {
      if (usedEdges.has(eid)) continue;
      usedEdges.add(eid);
      const e = edges[eid];
      const next = (e.a === nodeId) ? e.b : e.a;
      const len = 1 + dfs(next, nodeId, usedEdges);
      if (len > best) best = len;
      usedEdges.delete(eid);
    }
    return best;
  }

  let maxLen = 0;
  for (const startNode of adj.keys()) {
    const len = dfs(startNode, null, new Set());
    if (len > maxLen) maxLen = len;
  }
  return maxLen;
}

function recomputeLongestRoad(game) {
  if (!game) return;
  if (!game.longestRoad) game.longestRoad = { playerId: null, length: 0 };

  const lengths = new Map();
  let bestLen = 0;
  for (const p of (game.players || [])) {
    const len = computeLongestRoadForPlayer(game, p.id);
    lengths.set(p.id, len);
    p.longestRoadLen = len;
    if (len > bestLen) bestLen = len;
  }

  const eligible = bestLen >= 5;
  const candidates = eligible
    ? Array.from(lengths.entries()).filter(([, l]) => l === bestLen).map(([pid]) => pid)
    : [];

  const prevOwner = game.longestRoad.playerId || null;
  let nextOwner = null;

  if (candidates.length === 1) {
    nextOwner = candidates[0];
  } else if (candidates.length > 1) {
    // Tie: existing holder keeps if they're part of the tie, otherwise unclaimed.
    if (prevOwner && candidates.includes(prevOwner)) nextOwner = prevOwner;
    else nextOwner = null;
  } else {
    nextOwner = null;
  }

  // Update holder + log transitions
  const changed = prevOwner !== nextOwner;
  game.longestRoad = { playerId: nextOwner, length: bestLen };

  if (changed) {
    if (prevOwner && nextOwner) {
      pushLog(game, `${playerName(game, nextOwner)} claimed Longest Road (${bestLen}).`, 'system', { kind: 'longest_road', from: prevOwner, to: nextOwner, length: bestLen });
    } else if (!prevOwner && nextOwner) {
      pushLog(game, `${playerName(game, nextOwner)} claimed Longest Road (${bestLen}).`, 'system', { kind: 'longest_road', to: nextOwner, length: bestLen });
    } else if (prevOwner && !nextOwner) {
      pushLog(game, `Longest Road is now unclaimed.`, 'system', { kind: 'longest_road', from: prevOwner, length: bestLen });
    }
  } else {
    // Keep length in sync
    if (game.longestRoad) game.longestRoad.length = bestLen;
  }
}

function persistUserStatsFromGame(room, game, winnerId) {
  if (!room || !game) return;
  // Prevent accidental persistence from simulation/dry-run rooms (e.g. build option previews).
  if (room._dryRun) return;
  if (!room.code || !room.sockets) return;
  if (game._userStatsPersisted) return;
  game._userStatsPersisted = true;

  const endedAt = now();
  let changed = false;

  for (const gp of (game.players || [])) {
    const u = findUserById(gp && gp.id);
    if (!u) continue;
    if (!u.stats || typeof u.stats !== 'object') u.stats = { gamesPlayed: 0, wins: 0, losses: 0, totalVP: 0, lastGameAt: 0 };
    u.stats.gamesPlayed = Math.max(0, Math.floor(Number(u.stats.gamesPlayed || 0))) + 1;
    u.stats.wins = Math.max(0, Math.floor(Number(u.stats.wins || 0))) + ((gp.id === winnerId) ? 1 : 0);
    u.stats.losses = Math.max(0, Math.floor(Number(u.stats.losses || 0))) + ((gp.id !== winnerId) ? 1 : 0);
    u.stats.totalVP = Math.max(0, Math.floor(Number(u.stats.totalVP || 0))) + Math.max(0, Math.floor(Number(gp.vp || 0)));
    u.stats.lastGameAt = endedAt;
    changed = true;
  }

  if (changed) saveUsersDb();

  // Push updated stats to connected players
  try {
    for (const gp of (game.players || [])) {
      const ws = room.sockets && room.sockets.get(gp.id);
      const u = findUserById(gp && gp.id);
      if (ws && ws.readyState === WebSocket.OPEN && u) {
        sendJson(ws, { type: 'user_stats', user: safeUserPublic(u), stats: u.stats });
      }
    }
  } catch (_) {}
}

function checkWin(room, state, pid) {
  const p = playerById(state, pid);
  if (!p) return;
  const raw = (state?.rules?.victoryPointsToWin ?? state?.rules?.victoryTarget ?? state?.rules?.vpToWin);
  const n = Math.floor(Number(raw));
  const target = Number.isFinite(n)
    ? Math.max(3, Math.min(30, n))
    : defaultVictoryPointsToWin(state?.rules);

  if (p.vp >= target) {
    const wasOver = state.phase === 'game-over';
    state.phase = 'game-over';
    state.message = `${playerName(state, pid)} wins!`;
    try {
      ensureGameStats(state);
      if (state.stats && !state.stats.endedAt) state.stats.endedAt = Date.now();
      recordTurnEnd(state, state.currentPlayerId);
    } catch (_) {}

    if (!wasOver) {
      try { persistUserStatsFromGame(room, state, pid); } catch (_) {}
      try { persistGameHistoryFromGame(room, state, pid); } catch (_) {}
    }
  }
}

function hasSettlementOrCityAt(state, nodeId, playerId) {
  const b = state.geom.nodes[nodeId].building;
  return b && b.owner === playerId;
}

function edgeConnectsToPlayer(state, edgeId, playerId) {
  const e = state.geom.edges[edgeId];
  if (e.roadOwner === playerId) return true;
  const aEdges = state.geom.nodeEdges[e.a];
  const bEdges = state.geom.nodeEdges[e.b];
  for (const eid of aEdges) if (state.geom.edges[eid].roadOwner === playerId) return true;
  for (const eid of bEdges) if (state.geom.edges[eid].roadOwner === playerId) return true;
  // buildings
  if (hasSettlementOrCityAt(state, e.a, playerId)) return true;
  if (hasSettlementOrCityAt(state, e.b, playerId)) return true;
  return false;
}

function settlementDistanceOk(state, nodeId) {
  const node = state.geom.nodes[nodeId];
  if (node.building) return false;
  for (const nb of node.adj) {
    if (state.geom.nodes[nb].building) return false;
  }
  return true;
}

function isNodeOnBoard(state, nodeId) {
  return nodeId >= 0 && nodeId < state.geom.nodes.length;
}
function isEdgeOnBoard(state, edgeId) {
  return edgeId >= 0 && edgeId < state.geom.edges.length;
}

function generateBoard(geom) {
  // Assign resource types + number tokens like standard 19-hex Catan
  const types = [
    ...Array(4).fill('forest'),
    ...Array(4).fill('pasture'),
    ...Array(4).fill('field'),
    ...Array(3).fill('hills'),
    ...Array(3).fill('mountains'),
    'desert',
  ];

  const tokens = [2,3,3,4,4,5,5,6,6,8,8,9,9,10,10,11,11,12];

  const adj = tileAdjacency(geom.tiles);

  function attempt() {
    const ttypes = shuffle(types.slice());
    const ttokens = shuffle(tokens.slice());
    const tiles = geom.tiles.map(t => ({ ...t }));
    // Place types
    for (let i = 0; i < tiles.length; i++) tiles[i].type = ttypes[i];
    // Place tokens
    let k = 0;
    for (let i = 0; i < tiles.length; i++) {
      if (tiles[i].type === 'desert') {
        tiles[i].number = null;
        tiles[i].robber = true;
      } else {
        tiles[i].number = ttokens[k++];
        tiles[i].robber = false;
      }
    }
    // check 6/8 adjacency
    for (const t of tiles) {
      if (t.number === 6 || t.number === 8) {
        for (const nid of adj.get(t.id) || []) {
          const n = tiles[nid].number;
          if (n === 6 || n === 8) return null;
        }
      }
    }
    return tiles;
  }

  let tiles = null;
  for (let i = 0; i < 250 && !tiles; i++) tiles = attempt();
  if (!tiles) {
    // fallback (no constraint)
    const ttypes = shuffle(types.slice());
    const ttokens = shuffle(tokens.slice());
    tiles = geom.tiles.map(t => ({ ...t }));
    for (let i = 0; i < tiles.length; i++) tiles[i].type = ttypes[i];
    let k = 0;
    for (let i = 0; i < tiles.length; i++) {
      if (tiles[i].type === 'desert') { tiles[i].number = null; tiles[i].robber = true; }
      else tiles[i].number = ttokens[k++];
    }
  }
  return tiles;
}

function generateBoardClassicWithSea(geom) {
  // Classic Catan land (19 tiles) surrounded by a ring of sea tiles.
  // Assumes geom radius >= 3.
  const base = geom.tiles || [];
  const allTiles = base.map(t => ({ ...t, type: 'sea', number: null, robber: false, pirate: false }));

  // Inner 19 tiles are those within axial distance 2.
  const inner = allTiles.filter(t => axialDist(t.q, t.r) <= 2).map(t => t.id);

  const types = [
    ...Array(4).fill('forest'),
    ...Array(4).fill('pasture'),
    ...Array(4).fill('field'),
    ...Array(3).fill('hills'),
    ...Array(3).fill('mountains'),
    'desert',
  ];
  const tokens = [2,3,3,4,4,5,5,6,6,8,8,9,9,10,10,11,11,12];

  const nbs = geom.tileNeighbors || [];

  function attempt() {
    const tiles = allTiles.map(t => ({ ...t }));
    const ttypes = shuffle(types.slice());
    const ttokens = shuffle(tokens.slice());

    // Assign land types
    for (let i = 0; i < inner.length; i++) {
      const id = inner[i];
      tiles[id].type = ttypes[i];
    }

    // Assign number tokens
    let k = 0;
    for (const id of inner) {
      if (tiles[id].type === 'desert') {
        tiles[id].number = null;
        tiles[id].robber = true;
      } else {
        tiles[id].number = ttokens[k++];
        tiles[id].robber = false;
      }
    }

    // 6/8 adjacency only among inner land tiles
    const innerSet = new Set(inner);
    for (const id of inner) {
      const num = tiles[id].number;
      if (num === 6 || num === 8) {
        for (const nb of (nbs[id] || [])) {
          if (!innerSet.has(nb)) continue;
          const nn = tiles[nb].number;
          if (nn === 6 || nn === 8) return null;
        }
      }
    }

    return tiles;
  }

  let tiles = null;
  for (let i = 0; i < 300 && !tiles; i++) tiles = attempt();
  if (!tiles) {
    // fallback without the adjacency constraint
    tiles = allTiles.map(t => ({ ...t }));
    const ttypes = shuffle(types.slice());
    const ttokens = shuffle(tokens.slice());
    for (let i = 0; i < inner.length; i++) tiles[inner[i]].type = ttypes[i];
    let k = 0;
    for (const id of inner) {
      if (tiles[id].type === 'desert') { tiles[id].number = null; tiles[id].robber = true; }
      else tiles[id].number = ttokens[k++];
    }
  }

  return tiles;
}

function seafarersBaseAllSea(geom) {
  const tiles = geom.tiles || [];
  return tiles.map(t => ({ ...t, type: 'sea', number: null, robber: false, pirate: false }));
}

function hasAdjacentSixEightForPlacement(geom, localTiles) {
  const byId = new Map(localTiles.map(t => [t.id, t]));
  for (const t of localTiles) {
    if (t.number !== 6 && t.number !== 8) continue;
    const nbs = geom.tileNeighbors?.[t.id] || [];
    for (const nid of nbs) {
      const ot = byId.get(nid);
      if (!ot) continue;
      if (ot.number === 6 || ot.number === 8) return true;
    }
  }
  return false;
}

function pickLandTileIds(allTiles, landKeys) {
  const landTileIds = [];
  for (const t of allTiles) {
    const key = `${t.q},${t.r}`;
    if (landKeys.has(key)) landTileIds.push(t.id);
  }
  return landTileIds;
}

function startSeafarersRobberAndPirate(allTiles, preferDesertIds = null) {
  // Robber: prefer a desert if the scenario has one, otherwise any land.
  const landIds = allTiles.filter(t => t.type !== 'sea').map(t => t.id);
  const desertIds = preferDesertIds || allTiles.filter(t => t.type === 'desert').map(t => t.id);
  const robberPool = (desertIds && desertIds.length) ? desertIds : landIds;
  if (robberPool && robberPool.length) {
    const rid = robberPool[Math.floor(Math.random() * robberPool.length)];
    allTiles[rid].robber = true;
  }

  // Pirate: random sea tile.
  const seaIds = allTiles.filter(t => t.type === 'sea').map(t => t.id);
  if (seaIds.length) {
    const pid = seaIds[Math.floor(Math.random() * seaIds.length)];
    allTiles[pid].pirate = true;
  }
}

function generateBoardSeafarersFourIslands(geom) {
  // Seafarers scenario: "Four Islands" (embedded within a 1-hex sea border).
  const allTiles = seafarersBaseAllSea(geom);

  const landKeys = new Set([
    '0,-3', '2,-3', '3,-3',
    '-1,-2', '1,-2', '2,-2', '3,-2',
    '-2,-1', '-1,-1', '1,-1', '2,-1',
    '0,0',
    '-3,1', '-2,1', '1,1', '2,1',
    '-3,2', '-2,2', '-1,2', '1,2',
    '-3,3', '-2,3', '0,3'
  ]);

  const landTileIds = pickLandTileIds(allTiles, landKeys);

  const types = shuffle([
    ...Array(5).fill('forest'),
    ...Array(5).fill('pasture'),
    ...Array(5).fill('field'),
    ...Array(4).fill('hills'),
    ...Array(4).fill('mountains'),
  ]);

  const numbers = shuffle([
    2,
    3, 3,
    4, 4, 4,
    5, 5, 5,
    6, 6,
    8, 8,
    9, 9, 9,
    10, 10, 10,
    11, 11, 11,
    12,
  ]);

  let placed = null;
  for (let attempt = 0; attempt < 120; attempt++) {
    const tt = shuffle(types.slice());
    const nn = shuffle(numbers.slice());
    const local = [];
    for (let i = 0; i < landTileIds.length; i++) {
      const id = landTileIds[i];
      local.push({ id, type: tt[i], number: nn[i] });
    }
    if (!hasAdjacentSixEightForPlacement(geom, local)) { placed = local; break; }
  }
  if (!placed) {
    const tt = shuffle(types.slice());
    const nn = shuffle(numbers.slice());
    placed = landTileIds.map((id, i) => ({ id, type: tt[i], number: nn[i] }));
  }

  for (const upd of placed) {
    const t = allTiles[upd.id];
    if (!t) continue;
    t.type = upd.type;
    t.number = upd.number;
  }

  startSeafarersRobberAndPirate(allTiles);
  return allTiles;
}

function generateBoardSeafarersThroughTheDesert(geom) {
  // Seafarers scenario: "Through the Desert" (exact mask from the provided template PNG).
  // Board geometry for this scenario is a custom 70-tile shape (see generateThroughTheDesertAxials).
  const allTiles = seafarersBaseAllSea(geom);

  // Land + desert locations (30 total), matching the attached template.
  const landKeys = new Set([
    '0,-3','1,-3','2,-3','4,-3',
    '-1,-2','0,-2','1,-2','2,-2','4,-2',
    '-2,-1','-1,-1','0,-1','1,-1','2,-1','4,-1',
    '-1,0','0,0','1,0',
    '-3,1','-2,1','-1,1','0,1','2,1','3,1',
    '-3,2','-2,2','-1,2',
    '-2,3','0,3','1,3',
  ]);

  // Fixed desert locations from the template (3 deserts).
  const desertKeys = new Set([
    '-1,-1',
    '0,-2',
    '1,-3',
  ]);

  const landTileIds = pickLandTileIds(allTiles, landKeys);

  // 27 resource tiles + 3 deserts = 30 land tiles total.
  // Resource types are randomized; we will additionally place 2 Gold Fields on the 10 "outer" tiles
  // (the 3 islands + strip past the desert) per scenario rules.
  const resourceTypesBase = [
    ...Array(6).fill('forest'),
    ...Array(6).fill('pasture'),
    ...Array(5).fill('field'),
    ...Array(5).fill('hills'),
    ...Array(5).fill('mountains'),
  ];

  // Number discs: 27 total (deserts have no number).
  // Special rule: the 10 "outer" tiles get their own pool containing each of:
  // 2,3,4,5,6,8,9,10,11,12 (each exactly once). The remaining 17 resource tiles get the remainder.
  const numbersBase = [
    2,
    3,3,3,
    4,4,4,
    5,5,5,
    6,6,6,
    8,8,8,
    9,9,9,
    10,10,10,
    11,11,11,
    12,12,
  ];
  const outerNumberPool = [2,3,4,5,6,8,9,10,11,12];
  const remainderNumberPool = [
    // After removing one of each in outerNumberPool from numbersBase:
    3,3,
    4,4,
    5,5,
    6,6,
    8,8,
    9,9,
    10,10,
    11,11,
    12,
  ];

  // Identify the 10 "outer" land tiles as the land keys that are NOT part of the starting island set.
  // (TTD_START_ISLAND_KEYS includes the pink region plus the 3 fixed deserts.)
  const outerLandKeys = new Set(
    Array.from(landKeys).filter(k => !TTD_START_ISLAND_KEYS.has(k))
  );

  // Convert outer land keys -> tile ids for number/gold placement.
  const outerTileIds = [];
  for (const t of allTiles) {
    const key = `${t.q},${t.r}`;
    if (outerLandKeys.has(key)) outerTileIds.push(t.id);
  }

  // Build connected components of the outer tiles so we can ensure the 2 gold tiles do not
  // start on the same island (component). The "strip past the desert" is treated as a component too.
  function outerComponents() {
    const set = new Set(outerTileIds);
    const seen = new Set();
    const comps = [];
    for (const id of outerTileIds) {
      if (seen.has(id)) continue;
      const stack = [id];
      const comp = [];
      seen.add(id);
      while (stack.length) {
        const cur = stack.pop();
        comp.push(cur);
        const nbs = geom.tileNeighbors?.[cur] || [];
        for (const nb of nbs) {
          if (!set.has(nb) || seen.has(nb)) continue;
          seen.add(nb);
          stack.push(nb);
        }
      }
      comps.push(comp);
    }
    return comps;
  }

  let placed = null;
  for (let attempt = 0; attempt < 420; attempt++) {
    // Choose 2 distinct components for the 2 gold tiles.
    const comps = outerComponents();
    let goldIds = [];
    if (comps.length >= 2) {
      const pick = shuffle(comps.slice());
      const a = pick[0];
      const b = pick[1];
      const ga = a[Math.floor(Math.random() * a.length)];
      const gb = b[Math.floor(Math.random() * b.length)];
      if (ga !== gb) goldIds = [ga, gb];
    }
    if (goldIds.length !== 2) {
      // Fallback: any 2 distinct outer tiles.
      const shuffledOuter = shuffle(outerTileIds.slice());
      goldIds = shuffledOuter.slice(0, 2);
    }

    const tt = shuffle(resourceTypesBase.slice());

    // Assign number pools.
    const outerNums = shuffle(outerNumberPool.slice());
    const remNums = shuffle(remainderNumberPool.slice());
    const shuffledOuterIds = shuffle(outerTileIds.slice());

    const local = [];
    let ti = 0;
    let remNi = 0;

    // Helper: number for a given tile id.
    const outerNumById = new Map();
    for (let i = 0; i < shuffledOuterIds.length; i++) {
      outerNumById.set(shuffledOuterIds[i], outerNums[i]);
    }

    for (let i = 0; i < landTileIds.length; i++) {
      const id = landTileIds[i];
      const t = allTiles[id];
      const key = t ? `${t.q},${t.r}` : '';
      if (desertKeys.has(key)) {
        local.push({ id, type: 'desert', number: null });
        continue;
      }

      // Base randomized resource type.
      let type = tt[ti++];

      // Force gold fields onto the chosen 2 outer tiles.
      if (goldIds.includes(id)) type = 'gold';

      // Numbers: outer tiles use the dedicated pool; everything else uses remainder pool.
      const num = outerNumById.has(id) ? outerNumById.get(id) : remNums[remNi++];
      local.push({ id, type, number: num });
    }

    if (!hasAdjacentSixEightForPlacement(geom, local)) { placed = local; break; }
  }

  if (!placed) {
    // Fallback without adjacency constraint.
    const comps = outerComponents();
    let goldIds = [];
    if (comps.length >= 2) {
      const pick = shuffle(comps.slice());
      const ga = pick[0][0];
      const gb = pick[1][0];
      if (ga !== gb) goldIds = [ga, gb];
    }
    if (goldIds.length !== 2) {
      const shuffledOuter = shuffle(outerTileIds.slice());
      goldIds = shuffledOuter.slice(0, 2);
    }

    const tt = shuffle(resourceTypesBase.slice());
    const outerNums = shuffle(outerNumberPool.slice());
    const remNums = shuffle(remainderNumberPool.slice());
    const shuffledOuterIds = shuffle(outerTileIds.slice());
    const outerNumById = new Map();
    for (let i = 0; i < shuffledOuterIds.length; i++) outerNumById.set(shuffledOuterIds[i], outerNums[i]);

    placed = [];
    let ti = 0;
    let remNi = 0;
    for (let i = 0; i < landTileIds.length; i++) {
      const id = landTileIds[i];
      const t = allTiles[id];
      const key = t ? `${t.q},${t.r}` : '';
      if (desertKeys.has(key)) { placed.push({ id, type: 'desert', number: null }); continue; }
      let type = tt[ti++];
      if (goldIds.includes(id)) type = 'gold';
      const num = outerNumById.has(id) ? outerNumById.get(id) : remNums[remNi++];
      placed.push({ id, type, number: num });
    }
  }

  const desertIds = [];
  for (const upd of placed) {
    const t = allTiles[upd.id];
    if (!t) continue;
    t.type = upd.type;
    t.number = upd.number;
    if (upd.type === 'desert') desertIds.push(upd.id);
  }

  startSeafarersRobberAndPirate(allTiles, desertIds);
  return allTiles;
}



function generateBoardSeafarersFogIsland(geom) {
  // Build on the Through-the-Desert sized geometry (70 tiles). All sea by default.
  const tiles = seafarersBaseAllSea(geom);

  // Face-up land: two starting islands (17 land tiles) with a standard 17-token distribution.
  const startLandIds = pickLandTileIds(tiles, FOG_ISLAND_START_LAND_KEYS);
  const startIslandAIds = pickLandTileIds(tiles, FOG_ISLAND_START_ISLAND_A_KEYS);
  const startIslandBIds = pickLandTileIds(tiles, FOG_ISLAND_START_ISLAND_B_KEYS);

  // Face-down fog band: 12 tiles. They begin as sea, but store hidden contents.
  const fogIds = pickLandTileIds(tiles, FOG_ISLAND_FOG_KEYS);

  // Resource mix for starting islands (17 tiles).
  const startTypes = [
    ...Array(3).fill('hills'),
    ...Array(4).fill('forest'),
    ...Array(4).fill('pasture'),
    ...Array(3).fill('field'),
    ...Array(3).fill('mountains'),
  ];

  // Numbers for starting islands (17).
  const startNumbers = [2,3,3,4,4,5,5,6,6,8,8,9,9,10,10,11,12];

  // Resource mix for fog tiles (12 total): 2 sea, 2 gold, and 8 resource lands.
  const fogHiddenTypes = [
    'sea','sea',
    'gold','gold',
    'hills','hills',
    'forest',
    'pasture',
    'field','field',
    'mountains','mountains',
  ];

  // Numbers for fog *land* tiles only (10 land tiles).
  const fogLandNumbers = [3,4,5,6,8,9,10,11,11,12];

  // Attempt random placements with a 6/8 adjacency constraint across all land tiles,
  // plus "2 red tokens per starting island" distribution.
  for (let attempt = 0; attempt < 2000; attempt++) {
    // Reset everything
    for (const t of tiles) {
      delete t.fog;
      delete t.revealed;
      delete t.hiddenType;
      delete t.hiddenNumber;
      t.number = null;
      t.type = 'sea';
    }

    // Place starting land
    const stTypes = startTypes.slice();
    const stNums = startNumbers.slice();
    shuffle(stTypes);
    shuffle(stNums);
    for (let i = 0; i < startLandIds.length; i++) {
      const tid = startLandIds[i];
      const t = tiles[tid];
      t.type = stTypes[i];
      t.number = stNums[i];
    }

    // Starting islands constraint: exactly two red numbers (6/8) per starting island.
    // (Prevents 3+ reds on one island and 0/1 on the other.)
    let redsA = 0;
    for (const tid of startIslandAIds) {
      const n = tiles[tid]?.number;
      if (n === 6 || n === 8) redsA++;
    }
    let redsB = 0;
    for (const tid of startIslandBIds) {
      const n = tiles[tid]?.number;
      if (n === 6 || n === 8) redsB++;
    }
    if (redsA !== 2 || redsB !== 2) continue;

    // Place fog hidden contents
    const fhTypes = fogHiddenTypes.slice();
    shuffle(fhTypes);
    const landNums = fogLandNumbers.slice();
    shuffle(landNums);
    let landNumIdx = 0;

    for (const tid of fogIds) {
      const t = tiles[tid];
      t.fog = true;
      t.revealed = false;
      const ht = fhTypes.pop();
      t.hiddenType = ht;
      if (ht !== 'sea') {
        t.hiddenNumber = landNums[landNumIdx++];
      } else {
        t.hiddenNumber = null;
      }
      // Visible state: sea + no number until revealed.
      t.type = 'sea';
      t.number = null;
    }

    // Validate: no adjacent 6/8 among (visible + hidden) land placements.
    let ok = true;
    // Build a temporary view of numbers for adjacency checks.
    const temp = tiles.map(t => ({
      id: t.id,
      type: t.fog && !t.revealed ? (t.hiddenType === 'sea' ? 'sea' : t.hiddenType) : t.type,
      number: t.fog && !t.revealed ? (t.hiddenType === 'sea' ? null : t.hiddenNumber) : t.number,
    }));

    for (const t of temp) {
      if (!t.number) continue;
      if (t.number !== 6 && t.number !== 8) continue;
      const adj = geom.tileNeighbors?.[t.id] || [];
      for (const aid of adj) {
        const at = temp[aid];
        if (!at || !at.number) continue;
        if (at.number === 6 || at.number === 8) { ok = false; break; }
      }
      if (!ok) break;
    }
    if (!ok) continue;

    // Ensure fog land numbers pool used fully.
    if (landNumIdx !== fogLandNumbers.length) continue;

    return tiles;
  }

  // Very rare: if we didn't hit a valid placement within the normal attempt budget,
  // keep searching rather than returning an illegal board.
  for (let attempt = 0; attempt < 20000; attempt++) {
    // Reset everything
    for (const t of tiles) {
      delete t.fog;
      delete t.revealed;
      delete t.hiddenType;
      delete t.hiddenNumber;
      t.number = null;
      t.type = 'sea';
    }

    // Place starting land
    const stTypes = startTypes.slice();
    const stNums = startNumbers.slice();
    shuffle(stTypes);
    shuffle(stNums);
    for (let i = 0; i < startLandIds.length; i++) {
      const tid = startLandIds[i];
      const t = tiles[tid];
      t.type = stTypes[i];
      t.number = stNums[i];
    }

    // Starting islands constraint: exactly two red numbers (6/8) per starting island.
    let redsA = 0;
    for (const tid of startIslandAIds) {
      const n = tiles[tid]?.number;
      if (n === 6 || n === 8) redsA++;
    }
    let redsB = 0;
    for (const tid of startIslandBIds) {
      const n = tiles[tid]?.number;
      if (n === 6 || n === 8) redsB++;
    }
    if (redsA !== 2 || redsB !== 2) continue;

    // Place fog hidden contents
    const fhTypes = fogHiddenTypes.slice();
    shuffle(fhTypes);
    const landNums = fogLandNumbers.slice();
    shuffle(landNums);
    let landNumIdx = 0;
    for (const tid of fogIds) {
      const t = tiles[tid];
      t.fog = true;
      t.revealed = false;
      const ht = fhTypes.pop();
      t.hiddenType = ht;
      if (ht !== 'sea') t.hiddenNumber = landNums[landNumIdx++];
      else t.hiddenNumber = null;
      t.type = 'sea';
      t.number = null;
    }

    // Validate: no adjacent 6/8 among (visible + hidden) land placements.
    let ok = true;
    const temp = tiles.map(t => ({
      id: t.id,
      type: t.fog && !t.revealed ? (t.hiddenType === 'sea' ? 'sea' : t.hiddenType) : t.type,
      number: t.fog && !t.revealed ? (t.hiddenType === 'sea' ? null : t.hiddenNumber) : t.number,
    }));
    for (const tt of temp) {
      if (!tt.number) continue;
      if (tt.number !== 6 && tt.number !== 8) continue;
      const adj = geom.tileNeighbors?.[tt.id] || [];
      for (const aid of adj) {
        const at = temp[aid];
        if (!at || !at.number) continue;
        if (at.number === 6 || at.number === 8) { ok = false; break; }
      }
      if (!ok) break;
    }
    if (!ok) continue;
    if (landNumIdx !== fogLandNumbers.length) continue;

    return tiles;
  }

  // Absolute last resort: return the board as-is.
  // (This should basically never happen, but avoids a hard crash if the geometry changes.)
  return tiles;
}

function generateBoardSeafarersTestBuilder(geom) {
  // Blank editable map: all sea with a center desert + robber and one sea tile with the pirate.
  const allTiles = seafarersBaseAllSea(geom);

  // Clear any existing robber/pirate flags
  for (const t of allTiles) { t.robber = false; t.pirate = false; }

  const center = allTiles.find(t => t.q === 0 && t.r === 0) || allTiles[0];
  if (center) {
    center.type = 'desert';
    center.number = null;
    center.robber = true;
  }

  const seaIds = allTiles.filter(t => t.type === 'sea').map(t => t.id);
  if (seaIds.length) {
    const pid = seaIds[Math.floor(Math.random() * seaIds.length)];
    if (allTiles[pid]) allTiles[pid].pirate = true;
  }

  return allTiles;
}



function generateBoardSeafarers(geom, scenario = 'four_islands') {
  const s = String(scenario || 'four_islands').toLowerCase().replace(/-/g,'_');
  if (s === 'through_the_desert') return generateBoardSeafarersThroughTheDesert(geom);
  if (s === 'fog_island') return generateBoardSeafarersFogIsland(geom);
  if (s === 'test_builder') return generateBoardSeafarersTestBuilder(geom);
  return generateBoardSeafarersFourIslands(geom);
}

// -------------------- Ports (Harbors) --------------------

// Classic-style ports: each port covers 2 adjacent coastal nodes (a single coastline edge).
// We implement 9 ports total: 4 generic (3:1) and 5 resource-specific (2:1).
function generatePorts(geom) {
  // Ports (Harbors): 9 total. 4 generic (3:1) and 5 resource-specific (2:1).
  // If a coastline (land/sea) exists, we place ports on coastline edges; otherwise we fall back to boundary edges.
  const tiles = geom.tiles || [];

  const coastlineEdgeIds = [];
  const boundaryEdgeIds = [];

  for (const e of geom.edges) {
    const adj = geom.edgeAdjTiles?.[e.id] || [];
    if (adj.length === 2) {
      const t0 = tiles[adj[0]];
      const t1 = tiles[adj[1]];
      if (!t0 || !t1) continue;
      const s0 = t0.type === 'sea';
      const s1 = t1.type === 'sea';
      if (s0 !== s1) coastlineEdgeIds.push(e.id);
    } else if (adj.length === 1) {
      boundaryEdgeIds.push(e.id);
    }
  }

  const candidate = (coastlineEdgeIds.length > 0) ? coastlineEdgeIds : boundaryEdgeIds;
  if (!candidate.length) return [];

  // Sort candidate edges by angle around center.
  const ordered = candidate
    .map((eid) => {
      const e = geom.edges[eid];
      return { eid, a: e.a, b: e.b, mx: e.mx, my: e.my, ang: Math.atan2(e.my, e.mx) };
    })
    .sort((u, v) => u.ang - v.ang);

  const PORT_COUNT = 9;
  const n = ordered.length;
  const step = n / PORT_COUNT;
  const minSep = Math.max(2, Math.floor(step * 0.65));

  const selectedIdx = [];
  const usedNodes = new Set();

  function circDist(i, j) {
    const d = Math.abs(i - j);
    return Math.min(d, n - d);
  }

  function okSep(idx) {
    for (const si of selectedIdx) {
      if (circDist(si, idx) < minSep) return false;
    }
    return true;
  }

  function okNodes(e) {
    return !usedNodes.has(e.a) && !usedNodes.has(e.b);
  }

  function pickNear(target) {
    // First pass: enforce separation + node uniqueness
    for (let d = 0; d < n; d++) {
      const cands = [(target + d) % n, (target - d + n) % n];
      for (const idx of cands) {
        if (!okSep(idx)) continue;
        const e = ordered[idx];
        if (!okNodes(e)) continue;
        return idx;
      }
    }
    // Second pass: enforce separation only
    for (let d = 0; d < n; d++) {
      const cands = [(target + d) % n, (target - d + n) % n];
      for (const idx of cands) {
        if (!okSep(idx)) continue;
        return idx;
      }
    }
    return target % n;
  }

  for (let i = 0; i < PORT_COUNT; i++) {
    const target = Math.round(i * step) % n;
    const idx = pickNear(target);
    selectedIdx.push(idx);
    const e = ordered[idx];
    usedNodes.add(e.a);
    usedNodes.add(e.b);
  }

  const kinds = shuffle([
    'generic', 'generic', 'generic', 'generic',
    'brick', 'lumber', 'wool', 'grain', 'ore',
  ]);

  return selectedIdx.slice(0, PORT_COUNT).map((idx, i) => {
    const e = ordered[idx];
    const adj = geom.edgeAdjTiles?.[e.eid] || [];
    let landTileId = null;
    let seaTileId = null;
    if (adj.length === 2) {
      const t0 = tiles[adj[0]];
      const t1 = tiles[adj[1]];
      if (t0 && t1) {
        const s0 = t0.type === 'sea';
        const s1 = t1.type === 'sea';
        if (s0 && !s1) { seaTileId = adj[0]; landTileId = adj[1]; }
        else if (s1 && !s0) { seaTileId = adj[1]; landTileId = adj[0]; }
      }
    } else if (adj.length === 1) {
      landTileId = adj[0];
    }

    return {
      id: i,
      edgeId: e.eid,
      nodeIds: [e.a, e.b],
      kind: kinds[i],
      mx: e.mx,
      my: e.my,
      landTileId,
      seaTileId,
    };
  });
}

function generatePortsSeafarers(geom) {
  // Seafarers uses the same port placement logic, but the coastline edge set will be preferred.
  return generatePorts(geom);
}

function playerHasPort(game, playerId, port) {
  const nodes = game.geom?.nodes;
  if (!nodes) return false;
  for (const nid of port.nodeIds || []) {
    const b = nodes[nid]?.building;
    if (b && b.owner === playerId) return true;
  }
  return false;
}

function tradeRatioFor(game, playerId, giveKind) {
  let ratio = 4;
  const ports = game.geom?.ports || [];
  for (const p of ports) {
    if (!playerHasPort(game, playerId, p)) continue;
    if (p.kind === 'generic') ratio = Math.min(ratio, 3);
    if (p.kind === giveKind) ratio = Math.min(ratio, 2);
  }
  return ratio;
}

// -------------------- Room/Game State --------------------

function newEmptyGame(room) {
  const mapMode = (room && room.rules && room.rules.mapMode) ? String(room.rules.mapMode) : 'classic';
  const geom = buildGeometry(mapMode === 'seafarers' ? 4 : 3);
  return {
    id: crypto.randomUUID(),
    createdAt: now(),
    phase: 'lobby', // lobby | setup1-settlement | setup1-road | setup2-settlement | setup2-road | main-await-roll | main-actions | robber-move | game-over
    message: 'Waiting in lobby…',
    roomCode: room.code,
    hostId: room.hostId,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      color: p.color,
      resources: { brick: 0, lumber: 0, wool: 0, grain: 0, ore: 0 },
      vp: 0,
      newIslandVP: 0,
      ttdFarSideVP: 0,
      // Development cards
      devCards: [], // [{id,type,boughtTurn,played:boolean}]
      vpDev: 0,
      army: 0,
      devPlayedTurn: -1,
    })),
    turnOrder: [],
    currentPlayerId: null,
    lastRoll: null,
    turnNumber: 0,
    geom: geom, // includes tiles/nodes/edges and adjacency helpers
    bank: { brick: 19, lumber: 19, wool: 19, grain: 19, ore: 19 }, // not enforced tightly

    // Development deck and public event feed (for client popups)
    devDeck: [],
    devSeq: 1,
    eventSeq: 1,
    lastEvent: null,

    // Trading
    tradeSeq: 1,
    pendingTrade: null, // {id, fromId, offer:{}, request:{}, responses:{pid:'accept'|'reject'|null}, createdAt}

    // Special action contexts
    largestArmy: { playerId: null, size: 0 },
    longestRoad: { playerId: null, length: 0 },
    special: null, // e.g. { kind:'free_roads', forPlayerId, remaining }
    robberContext: null, // e.g. { source:'roll7'|'knight', playerId }

    // setup.awaiting is used during setup rounds to enforce:
    // settlement -> road must connect to the *just placed* settlement.
    setup: { round: 1, index: 0, dir: 1, awaiting: null }, // internal

    // Rules & timers
    rules: { ...(room.rules || DEFAULT_RULES) },
    timer: null,

    // Pause state (host-controlled)
    paused: false,
    pause: null, // { byId, at, remainingMs }

    // Logs / dice stats / chat
    logSeq: 1,
    log: [],
    diceStats: emptyDiceStats(),
    chat: room.chat || [],

    // Discard phase (when a 7 is rolled)
    discard: null, // { id, required:{[playerId]:n}, done:{[playerId]:true} }
    discardSeq: 1,

    // Robber steal selection (separate from placement)
    robberSteal: null, // { id, tileId, victims:[playerId] }
    robberStealSeq: 1,
    // Seafarers thief pieces + ship move
    thiefChoice: null,
    thiefChoiceSeq: 1,
    pirateSteal: null,
    pirateStealSeq: 1,
        shipMoveUsed: {},
    discoverySeq: 1,
  };
}


// -------------------- Game Feed (Log/Chat) --------------------

function pushLog(game, text, kind = 'info', data = null) {
  if (!game) return;
  game.log = game.log || [];
  game.logSeq = game.logSeq || 1;
  const entry = { id: game.logSeq++, ts: now(), kind, text: String(text || ''), data };
  game.log.push(entry);
  const MAX = 300;
  if (game.log.length > MAX) game.log.splice(0, game.log.length - MAX);
}

function sanitizeChatText(t) {
  const s = String(t || '').replace(/\s+/g, ' ').trim();
  return s.slice(0, 240);
}

function pushChat(room, fromId, text) {
  if (!room) return null;
  room.chat = room.chat || [];
  room.chatSeq = room.chatSeq || 1;
  const from = room.players.find(p => p.id === fromId);
  const msg = { id: room.chatSeq++, ts: now(), fromId, from: from ? from.name : 'Player', text: sanitizeChatText(text) };
  if (!msg.text) return null;
  room.chat.push(msg);
  const MAX = 200;
  if (room.chat.length > MAX) room.chat.splice(0, room.chat.length - MAX);
  // If a game is live, keep a reference on the game object too.
  if (room.game) room.game.chat = room.chat;
  return msg;
}

function startGame(room) {
  if (room.game && room.game.phase !== 'lobby') return false;
  const game = newEmptyGame(room);

  initGameStats(game);

  // Normalize VP target (supports older clients that might not send the field)
  const vpRaw = Math.floor(Number(game?.rules?.victoryPointsToWin ?? game?.rules?.victoryTarget ?? game?.rules?.vpToWin));
  game.rules.victoryPointsToWin = Number.isFinite(vpRaw)
    ? Math.max(3, Math.min(30, vpRaw))
    : defaultVictoryPointsToWin(game.rules);

  // Carry over room-level chat (lobby + game)
  game.chat = room.chat || [];

  pushLog(game, `Game started. Win: ${game.rules.victoryPointsToWin} VP • Discard limit: ${game.rules.discardLimit}.`, 'system');

  // Randomize turn order (and starting player)
  const order = room.players.map(p => p.id);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = order[i];
    order[i] = order[j];
    order[j] = tmp;
  }
  game.turnOrder = order;
  game.currentPlayerId = order[0] || null;
  game.phase = 'setup1-settlement';
  game.message = `Setup: ${playerName(game, game.currentPlayerId)} place a settlement.`;

  // Generate board
  let usedPreview = false;
  try {
    const wantKey = mapPreviewKey(game.rules || DEFAULT_RULES);
    if (room.preview && room.preview.key === wantKey && room.preview.geom) {
      const geom = deepClone(room.preview.geom);
      if (geom && Array.isArray(geom.tiles) && geom.tiles.length) {
        game.geom = geom;
        usedPreview = true;
      }
    }
  } catch (_) { usedPreview = false; }

  if (!usedPreview) {
    if ((game.rules?.mapMode || 'classic') === 'seafarers') {
      const scen = String(game?.rules?.seafarersScenario || 'four_islands').toLowerCase().replace(/-/g,'_');
      // The "Through the Desert" scenario uses a custom 70-tile geometry to match the provided layout.
      if (scen === 'through_the_desert' || scen === 'fog_island') {
        game.geom = buildGeometryFromAxials(generateThroughTheDesertAxials());
      }
      game.geom.tiles = generateBoardSeafarers(game.geom, scen);
      game.geom.ports = (String(scen).toLowerCase() === 'test_builder') ? [] : generatePortsSeafarers(game.geom);
    } else {
      game.geom.tiles = generateBoardClassicWithSea(game.geom);
      game.geom.ports = generatePorts(game.geom);
    }
  }

  // Once the game starts, the lobby preview is no longer needed.
  room.preview = null;

  // Development cards
  game.devDeck = buildDevDeck();

  recomputeLongestRoad(game);
  computeVP(game);
  room.game = game;
  return true;
}

function playerById(game, pid) {
  return game.players.find(p => p.id === pid) || null;
}
function playerName(game, pid) {
  const p = playerById(game, pid);
  return p ? p.name : 'Unknown';
}
function isPlayersTurn(game, pid) { return game.currentPlayerId === pid; }

function advanceSetup(game) {
  const order = game.turnOrder;
  const s = game.setup;

  const atEndForward = (s.index >= order.length - 1);
  const atStartBackward = (s.index <= 0);

  if (game.phase === 'setup1-road') {
    // move to next player (forward)
    if (atEndForward) {
      // switch to round 2, reverse
      s.round = 2;
      s.dir = -1;
      s.index = order.length - 1;
      game.currentPlayerId = order[s.index];
      game.phase = 'setup2-settlement';
      game.message = `Setup: ${playerName(game, game.currentPlayerId)} place a settlement.`;
      return;
    } else {
      s.index += 1;
      game.currentPlayerId = order[s.index];
      game.phase = 'setup1-settlement';
      game.message = `Setup: ${playerName(game, game.currentPlayerId)} place a settlement.`;
      return;
    }
  }

  if (game.phase === 'setup2-road') {
    // after road in round 2, move backward
    if (atStartBackward) {
      // setup complete -> main
      game.currentPlayerId = order[0];
      game.phase = 'main-await-roll';
      game.message = `${playerName(game, game.currentPlayerId)}: Roll the dice.`;
      recordTurnStart(game);
      return;
    } else {
      s.index -= 1;
      game.currentPlayerId = order[s.index];
      game.phase = 'setup2-settlement';
      game.message = `Setup: ${playerName(game, game.currentPlayerId)} place a settlement.`;
      return;
    }
  }
}

function distributeResources(game, roll) {
  // For each tile with matching number and not robbed, grant to adjacent buildings.
  // Returns a per-player gain map so the client can render a rich "production" log row.
  ensureBank(game);

  const gains = {}; // { [playerId]: { brick,lumber,wool,grain,ore } }
  const tiles = game.geom.tiles;

  for (const t of tiles) {
    if (t.number !== roll) continue;
    if (t.robber) continue;
    const resKind = RESOURCE_MAP[t.type];
    if (!resKind) continue;

    const corners = t.cornerNodeIds || [];
    for (const nid of corners) {
      const b = game.geom.nodes[nid].building;
      if (!b) continue;
      const p = playerById(game, b.owner);
      if (!p) continue;

      const want = (b.type === 'city') ? 2 : 1;
      const got = grantFromBankStats(game, b.owner, p.resources, resKind, want, 'production');
      if (!got) continue;

      if (!gains[b.owner]) gains[b.owner] = { brick: 0, lumber: 0, wool: 0, grain: 0, ore: 0 };
      gains[b.owner][resKind] = (gains[b.owner][resKind] || 0) + got;
    }
  }

  return gains;
}

function grantStartingResourcesForSecondSettlement(game, nodeId, ownerId) {
  // on setup2 settlement placement: give 1 of each adjacent resource (not robbed doesn't matter)
  const p = playerById(game, ownerId);
  if (!p) return;
  const adjTiles = game.geom.nodeAdjTiles[nodeId] || [];
  for (const tid of adjTiles) {
    const t = game.geom.tiles[tid];
    const kind = RESOURCE_MAP[t.type];
    if (kind) grantFromBankStats(game, ownerId, p.resources, kind, 1, 'setup');
  }
}

function setRobber(game, tileId) {
  if (tileId < 0 || tileId >= game.geom.tiles.length) return false;
  for (const t of game.geom.tiles) t.robber = false;
  game.geom.tiles[tileId].robber = true;
  return true;
}

function getPirateTileId(game) {
  for (const t of game.geom.tiles) if (t.pirate) return t.id;
  return null;
}

function setPirate(game, tileId) {
  const tiles = game.geom.tiles;
  if (!tiles[tileId]) return false;
  // Pirate can only be placed on sea tiles.
  if (tiles[tileId].type !== 'sea') return false;
  for (const t of tiles) t.pirate = false;
  tiles[tileId].pirate = true;
  return true;
}

function startThiefChoice(game, source, playerId) {
  // Seafarers: after a 7 (or Knight), the current player chooses robber vs pirate.
  game.thiefChoice = { id: game.thiefChoiceSeq++, playerId, source };
  game.phase = 'pirate-or-robber';
  const who = playerName(game, playerId);
  const verb = (source === 'knight') ? 'played a Knight' : 'rolled 7';
  game.message = `${who} ${verb}. Choose to move the robber or the pirate, then steal 1 random resource.`;
}

function edgeTouchesPirate(game, edgeId) {
  const pid = getPirateTileId(game);
  if (pid == null) return false;
  const adj = game.geom.edgeAdjTiles?.[edgeId] || [];
  return adj.includes(pid);
}

function shipIsMovable(game, edgeId, playerId) {
  const e = game.geom.edges?.[edgeId];
  if (!e || e.shipOwner !== playerId) return false;

  function openSeaEndpoint(nodeId) {
    const node = game.geom.nodes?.[nodeId];
    if (!node) return false;
    if (node.building && node.building.owner === playerId) return false;
    // Open if no other ships owned by this player touch this node.
    const edges = game.geom.nodeEdges?.[nodeId] || [];
    for (const eid of edges) {
      if (eid === edgeId) continue;
      const oe = game.geom.edges?.[eid];
      if (oe && oe.shipOwner === playerId) return false;
    }
    return true;
  }

  return openSeaEndpoint(e.a) || openSeaEndpoint(e.b);
}

function shipEdgeConnectsToPlayer(game, edgeId, playerId, ignoreEdgeId = null) {
  const e = game.geom.edges?.[edgeId];
  if (!e) return false;

  // Connection: must connect to your coastal building or another of your ships.
  const aNode = game.geom.nodes[e.a];
  const bNode = game.geom.nodes[e.b];
  const aBuild = aNode?.building;
  const bBuild = bNode?.building;

  if (aBuild && aBuild.owner === playerId) return true;
  if (bBuild && bBuild.owner === playerId) return true;

  const aEdges = game.geom.nodeEdges?.[e.a] || [];
  const bEdges = game.geom.nodeEdges?.[e.b] || [];

  for (const eid of aEdges) {
    if (eid === ignoreEdgeId) continue;
    if (game.geom.edges[eid].shipOwner === playerId) return true;
  }
  for (const eid of bEdges) {
    if (eid === ignoreEdgeId) continue;
    if (game.geom.edges[eid].shipOwner === playerId) return true;
  }
  return false;
}

function pirateVictims(game, pirateTileId, thiefId) {
  const victims = new Set();
  for (const e of game.geom.edges || []) {
    if (!e.shipOwner) continue;
    if (e.shipOwner === thiefId) continue;
    const adj = game.geom.edgeAdjTiles?.[e.id] || [];
    if (adj.includes(pirateTileId)) victims.add(e.shipOwner);
  }
  return Array.from(victims);
}

function getRobberTileId(game) {
  const tiles = game.geom?.tiles || [];
  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i].robber) return i;
  }
  return null;
}

// -------------------- Actions (authoritative) --------------------

function applyAction(room, playerId, action) {
  const game = room.game;
  if (!game) return { ok: false, error: 'No active game.' };

  if (game.phase === 'lobby') return { ok: false, error: 'Game not started.' };
  if (game.phase === 'game-over') return { ok: false, error: 'Game is over.' };

  if (game.paused) return { ok: false, error: 'Game is paused.' };

  const kind = action && action.kind;
  if (!kind) return { ok: false, error: 'Invalid action.' };

  // Only current player may act (except trade responses and simultaneous discard selections)
  const outOfTurnOk =
    (kind === 'respond_trade') ||
    (kind === 'discard_cards' && game.phase === 'discard' && game.discard && game.discard.required && game.discard.required[playerId] && !(game.discard.done && game.discard.done[playerId]));
  if (!isPlayersTurn(game, playerId) && !outOfTurnOk) return { ok: false, error: "Not your turn." };


  // Fog Island: if a Gold Field discovery choice is pending for this player, it must be resolved first.
  if (game.special && game.special.kind === 'discovery_gold' && game.special.forPlayerId === playerId && kind !== 'choose_discovery') {
    return { ok: false, error: 'Choose a resource for the discovered Gold Field first.' };
  }

  // --- Setup placements
  if (kind === 'place_settlement') {
    const nodeId = action.nodeId;
    if (!isNodeOnBoard(game, nodeId)) return { ok: false, error: 'Bad node.' };

    // If the board has sea tiles, settlements must touch at least one non-sea tile (no pure ocean corners).
    const boardHasSea = (game.geom.tiles || []).some(t => t.type === 'sea');
    if (boardHasSea) {
      const adjT = game.geom.nodeAdjTiles?.[nodeId] || [];
      const okLand = adjT.some(tid => (game.geom.tiles?.[tid]?.type || '') !== 'sea');
      if (!okLand) return { ok: false, error: 'You can only build settlements connected to land.' };
    }

    if (game.phase !== 'setup1-settlement' && game.phase !== 'setup2-settlement' && game.phase !== 'main-actions') {
      return { ok: false, error: 'Not the right phase for settlement.' };
    }

    // Through the Desert: initial settlements are restricted to the starting island (pink region in the template).
    if ((game.rules?.mapMode || 'classic') === 'seafarers' && seafarersScenarioKey(game) === 'through_the_desert') {
      if (game.phase === 'setup1-settlement' || game.phase === 'setup2-settlement') {
        if (!nodeIsOnTTDStartIsland(game, nodeId)) return { ok: false, error: 'Setup settlements must be placed on the starting island.' };

        // Also prevent starting settlements from being placed on (i.e., touching) Gold Fields.
        // Gold Fields for this scenario are placed only on the outer islands/strip, but this keeps the rule explicit.
        const adjT = game.geom.nodeAdjTiles?.[nodeId] || [];
        if (adjT.some(tid => (game.geom.tiles?.[tid]?.type || '') === 'gold')) {
          return { ok: false, error: 'Setup settlements may not be placed on Gold Fields.' };
        }
      }
    }


    // Fog Island: initial settlements are restricted to the two starting islands (unrevealed fog counts as sea during setup).
    if ((game.rules?.mapMode || 'classic') === 'seafarers' && seafarersScenarioKey(game) === 'fog_island') {
      if (game.phase === 'setup1-settlement' || game.phase === 'setup2-settlement') {
        if (!nodeIsOnFogStartIslands(game, nodeId)) return { ok: false, error: 'Setup settlements must be placed on the starting islands.' };
      }
    }

    if (!settlementDistanceOk(game, nodeId)) return { ok: false, error: 'Too close to another settlement/city.' };

    // in main-actions, require road connection and cost
    if (game.phase === 'main-actions') {
      const p = playerById(game, playerId);
      if (!p) return { ok: false, error: 'Missing player.' };
      if (!canAfford(p.resources, BUILD_COSTS.settlement)) return { ok: false, error: 'Not enough resources.' };

      // must touch your road (or ships in Seafarers)
      let connected = false;
      for (const eid of game.geom.nodeEdges[nodeId]) {
        const ed = game.geom.edges[eid];
        if (ed.roadOwner === playerId) { connected = true; break; }
        if ((game.rules?.mapMode || 'classic') === 'seafarers' && ed.shipOwner === playerId) { connected = true; break; }
      }
      if (!connected) return { ok: false, error: ((game.rules?.mapMode || 'classic') === 'seafarers') ? 'Settlement must connect to your network (road or ship).' : 'Settlement must connect to your road.' };

      payCostStats(game, playerId, p.resources, BUILD_COSTS.settlement, 'build');
    }

    // Seafarers: when you build a settlement on an island where you have no buildings yet,
    // you immediately gain +2 VP. (Not awarded during setup.)
    let newIslandBonus = false;
    if ((game.rules?.mapMode || 'classic') === 'seafarers' && game.phase === 'main-actions' && String((game.rules?.seafarersScenario || 'four_islands')).toLowerCase().replace(/-/g,'_') !== 'fog_island') {
      const tileToIsland = computeLandIslands(game.geom);
      const islandId = islandIdForNode(game.geom, nodeId, tileToIsland);
      if (islandId != null) {
        const alreadyThere = playerHasBuildingOnIsland(game, playerId, islandId, tileToIsland);
        if (!alreadyThere) {
          const p = playerById(game, playerId);
          if (p) {
            p.newIslandVP = (p.newIslandVP || 0) + 2;
            newIslandBonus = true;
          }
        }
      }
    }

    // Through the Desert: when a player places their first settlement touching one of the
    // three "across the desert" tiles (red in the provided template), they gain +2 VP once.
    // (Not awarded during setup.)
    let ttdFarSideBonus = false;

    // place it
    game.geom.nodes[nodeId].building = { owner: playerId, type: 'settlement' };
    recordBuild(game, playerId, 'settlement');
    broadcastSfx(room, 'structure');

    // During setup, remember which settlement was just placed so the next road must connect to it.
    if (game.phase === 'setup1-settlement' || game.phase === 'setup2-settlement') {
      game.setup.awaiting = { playerId, nodeId };
    } else {
      game.setup.awaiting = null;
    }

	    // setup2: grant starting resources
    if (game.phase === 'setup2-settlement') {
      grantStartingResourcesForSecondSettlement(game, nodeId, playerId);
    }

	    if ((game.rules?.mapMode || 'classic') === 'seafarers' && (game.rules?.seafarersScenario || 'four_islands') === 'through_the_desert' && game.phase === 'main-actions') {
	      const p = playerById(game, playerId);
	      if (p && (p.ttdFarSideVP || 0) === 0) {
	        if (nodeTouchesTTDAcrossDesert(game, nodeId)) {
	          p.ttdFarSideVP = (p.ttdFarSideVP || 0) + 2;
	          ttdFarSideBonus = true;
	        }
	      }
	    }
    recomputeLongestRoad(game);
    computeVP(game);

    if (newIslandBonus) {
      pushLog(game, `${playerName(game, playerId)} settled a new island (+2 VP).`, 'vp', { kind: 'new_island', amount: 2 });
    }

	    if (ttdFarSideBonus) {
	      pushLog(game, `${playerName(game, playerId)} established beyond the desert (+2 VP).`, 'vp', { kind: 'ttd_across_desert', amount: 2 });
	    }

    // phase advance
    if (game.phase === 'setup1-settlement') {
      game.phase = 'setup1-road';
      game.message = `Setup: ${playerName(game, playerId)} place a ${(game.rules?.mapMode || 'classic') === 'seafarers' ? 'road or ship' : 'road'} connected to your new settlement.`;
    } else if (game.phase === 'setup2-settlement') {
      game.phase = 'setup2-road';
      game.message = `Setup: ${playerName(game, playerId)} place a ${(game.rules?.mapMode || 'classic') === 'seafarers' ? 'road or ship' : 'road'} connected to your new settlement.`;
    } else {
      game.message = `${playerName(game, playerId)} built a settlement.`;
      checkWin(room, game, playerId);
    }

    pushLog(game, `${playerName(game, playerId)} placed a settlement.`, 'build', { kind: 'settlement' });
    return { ok: true };
  }

  if (kind === 'place_road') {
    const edgeId = action.edgeId;
    if (!isEdgeOnBoard(game, edgeId)) return { ok: false, error: 'Bad edge.' };
    const e = game.geom.edges[edgeId];
    if (e.roadOwner) return { ok: false, error: 'Road already exists there.' };
    if (e.shipOwner) return { ok: false, error: 'A ship already exists there.' };

    if (game.phase !== 'setup1-road' && game.phase !== 'setup2-road' && game.phase !== 'main-actions') {
      return { ok: false, error: 'Not the right phase for road.' };
    }

    const p = playerById(game, playerId);
    if (!p) return { ok: false, error: 'Missing player.' };

    // If the board has sea tiles, roads can only be placed on edges that touch at least one non-sea tile.
    const boardHasSea = (game.geom.tiles || []).some(t => t.type === 'sea');
    if (boardHasSea) {
      const adj = game.geom.edgeAdjTiles?.[edgeId] || [];
      const ok = adj.some(tid => (game.geom.tiles?.[tid]?.type || '') !== 'sea');
      if (!ok) return { ok: false, error: 'Roads must be built on land or the coastline.' };
    }

    // setup roads must connect to a building you own
    if (game.phase === 'setup1-road' || game.phase === 'setup2-road') {
      // Enforce: road must connect to the settlement just placed this setup step.
      const awaiting = game.setup && game.setup.awaiting;
      if (!awaiting || awaiting.playerId !== playerId) {
        return { ok: false, error: 'You must place a settlement first.' };
      }
      const nid = awaiting.nodeId;
      const ok = (e.a === nid) || (e.b === nid);
      if (!ok) return { ok: false, error: 'Setup road must touch the settlement you just placed.' };
    } else {
      // main roads require cost + connection (unless a Road Building dev card is active)
      const freeRoad = !!(game.special && game.special.kind === 'free_roads' && game.special.forPlayerId === playerId && game.special.remaining > 0);
      if (!edgeConnectsToPlayer(game, edgeId, playerId)) return { ok: false, error: 'Road must connect to your network.' };
      if (!freeRoad) {
        if (!canAfford(p.resources, BUILD_COSTS.road)) return { ok: false, error: 'Not enough resources.' };
        payCostStats(game, playerId, p.resources, BUILD_COSTS.road, 'build');
      }
    }

    e.roadOwner = playerId;
    recordBuild(game, playerId, 'road');
    broadcastSfx(room, 'structure');

    // Fog Island exploration (Option B)
    maybeExploreFogFromEdge(game, playerId, edgeId);

    // Consume free roads if active
    if (game.phase === 'main-actions' && game.special && game.special.kind === 'free_roads' && game.special.forPlayerId === playerId) {
      game.special.remaining = Math.max(0, (game.special.remaining || 0) - 1);
      if (game.special.remaining <= 0) game.special = null;
    }

    // phase advance for setup
    if (game.phase === 'setup1-road' || game.phase === 'setup2-road') {
      game.setup.awaiting = null;
      advanceSetup(game);
    } else {
      if (game.special && game.special.kind === 'free_roads' && game.special.forPlayerId === playerId) {
        game.message = `${playerName(game, playerId)} built a free road (${game.special.remaining} remaining).`;
      } else {
        game.message = `${playerName(game, playerId)} built a road.`;
      }
    }

    recomputeLongestRoad(game);
    computeVP(game);
    // Building a road can win via Longest Road.
    checkWin(room, game, playerId);
    pushLog(game, `${playerName(game, playerId)} placed a road.`, 'build', { kind: 'road' });
    return { ok: true };
  }

  if (kind === 'place_ship') {
    if ((game.rules?.mapMode || 'classic') !== 'seafarers') return { ok: false, error: 'Ships are only available in Seafarers mode.' };
    const edgeId = action.edgeId;
    if (!isEdgeOnBoard(game, edgeId)) return { ok: false, error: 'Bad edge.' };
    const e = game.geom.edges[edgeId];
    if (e.shipOwner) return { ok: false, error: 'Ship already exists there.' };
    if (e.roadOwner) return { ok: false, error: 'A road already exists there.' };

    const inSetup = (game.phase === 'setup1-road' || game.phase === 'setup2-road');
    if (!inSetup && game.phase !== 'main-actions') return { ok: false, error: 'You can only build ships after rolling.' };

    // Must touch sea
    const adj = game.geom.edgeAdjTiles?.[edgeId] || [];
    const touchesSea = adj.some(tid => (game.geom.tiles?.[tid]?.type || '') === 'sea') || adj.length === 1; // boundary edges are sea perimeter
    if (!touchesSea) return { ok: false, error: 'Ships must be placed on sea edges.' };

    if (edgeTouchesPirate(game, edgeId)) return { ok: false, error: 'The pirate blocks building ships adjacent to it.' };

    const p = playerById(game, playerId);
    if (!p) return { ok: false, error: 'Missing player.' };

    if (inSetup) {
      // Setup ships must connect to the settlement just placed this setup step.
      const awaiting = game.setup && game.setup.awaiting;
      if (!awaiting || awaiting.playerId !== playerId) {
        return { ok: false, error: 'You must place a settlement first.' };
      }
      const nid = awaiting.nodeId;
      const ok = (e.a === nid) || (e.b === nid);
      if (!ok) return { ok: false, error: 'Setup ship must touch the settlement you just placed.' };

      e.shipOwner = playerId;
    recordBuild(game, playerId, 'ship');
    broadcastSfx(room, 'structure');

    // Fog Island exploration (Option B)
    maybeExploreFogFromEdge(game, playerId, edgeId);

      game.setup.awaiting = null;
      // Ships contribute to Longest Road (trade route) too.
      recomputeLongestRoad(game);
      computeVP(game);
      pushLog(game, `${playerName(game, playerId)} placed a setup ship.`, 'build', { kind: 'ship', setup: true });
      advanceSetup(game);
      return { ok: true };
    }

    // Main-phase ships cost + connect to your network.
    if (!canAfford(p.resources, BUILD_COSTS.ship)) return { ok: false, error: 'Not enough resources.' };

    // Connection: must connect to your coastal building or another of your ships.
    const aNode = game.geom.nodes[e.a];
    const bNode = game.geom.nodes[e.b];
    const aBuild = aNode?.building;
    const bBuild = bNode?.building;
    let connected = false;
    if (aBuild && aBuild.owner === playerId) connected = true;
    if (bBuild && bBuild.owner === playerId) connected = true;

    if (!connected) {
      const aEdges = game.geom.nodeEdges?.[e.a] || [];
      const bEdges = game.geom.nodeEdges?.[e.b] || [];
      for (const eid of aEdges) if (game.geom.edges[eid].shipOwner === playerId) { connected = true; break; }
      if (!connected) for (const eid of bEdges) if (game.geom.edges[eid].shipOwner === playerId) { connected = true; break; }
    }

    if (!connected) return { ok: false, error: 'Ship must connect to your ships or a settlement/city.' };

    payCostStats(game, playerId, p.resources, BUILD_COSTS.ship, 'build');
    e.shipOwner = playerId;

    recomputeLongestRoad(game);
    computeVP(game);
    // Building a ship can change Longest Road / win state.
    checkWin(room, game, playerId);

    recomputeLongestRoad(game);
    computeVP(game);
    // Ships can change Longest Road holder.
    checkWin(room, game, playerId);

    game.message = `${playerName(game, playerId)} built a ship.`;
    pushLog(game, `${playerName(game, playerId)} placed a ship.`, 'build', { kind: 'ship' });

    return { ok: true };
  }

  if (kind === 'move_ship') {
    if ((game.rules?.mapMode || 'classic') !== 'seafarers') return { ok: false, error: 'Ships are only available in Seafarers mode.' };
    const okPhase = (game.phase === 'main-actions' || game.phase === 'main-await-roll');
    if (!okPhase) return { ok: false, error: 'You can only move ships during your turn.' };

    const fromEdgeId = action.fromEdgeId;
    const toEdgeId = action.toEdgeId;
    if (!isEdgeOnBoard(game, fromEdgeId) || !isEdgeOnBoard(game, toEdgeId)) return { ok: false, error: 'Bad edge.' };
    if (fromEdgeId === toEdgeId) return { ok: false, error: 'Choose a different destination.' };

    const used = (game.shipMoveUsed && game.shipMoveUsed[playerId] === game.turnNumber);
    if (used) return { ok: false, error: 'You already moved a ship this turn.' };

    const fromE = game.geom.edges[fromEdgeId];
    const toE = game.geom.edges[toEdgeId];
    // Pirate blocks moving ships both into and out of adjacent edges.
    if (edgeTouchesPirate(game, fromEdgeId)) return { ok: false, error: 'The pirate blocks moving that ship.' };
    if (!fromE || !toE) return { ok: false, error: 'Bad edge.' };
    if (fromE.shipOwner !== playerId) return { ok: false, error: 'You can only move your own ship.' };
    if (toE.shipOwner || toE.roadOwner) return { ok: false, error: 'That edge is already occupied.' };

    // Must be a movable end-ship (classic Seafarers rule).
    if (!shipIsMovable(game, fromEdgeId, playerId)) return { ok: false, error: 'Only an end ship can be moved.' };

    // Destination must touch sea and must not be blocked by pirate.
    const adj = game.geom.edgeAdjTiles?.[toEdgeId] || [];
    const touchesSea = adj.some(tid => (game.geom.tiles?.[tid]?.type || '') === 'sea') || adj.length === 1;
    if (!touchesSea) return { ok: false, error: 'Ships must be moved to sea edges.' };
    if (edgeTouchesPirate(game, toEdgeId)) return { ok: false, error: 'The pirate blocks that destination.' };

    // Temporarily remove the ship, then require that the destination connects to your ship/building network.
    fromE.shipOwner = null;
    const connected = shipEdgeConnectsToPlayer(game, toEdgeId, playerId, fromEdgeId);
    if (!connected) {
      fromE.shipOwner = playerId;
      return { ok: false, error: 'Moved ship must remain connected to your ships or a settlement/city.' };
    }

        toE.shipOwner = playerId;

    // Fog Island exploration (Option B)
    maybeExploreFogFromEdge(game, playerId, toEdgeId);


    game.shipMoveUsed = game.shipMoveUsed || {};
    game.shipMoveUsed[playerId] = game.turnNumber;

    recordShipMove(game, playerId);

    recomputeLongestRoad(game);
    computeVP(game);
    checkWin(room, game, playerId);

    game.message = `${playerName(game, playerId)} moved a ship.`;
    pushLog(game, `${playerName(game, playerId)} moved a ship.`, 'build', { kind: 'ship_move', fromEdgeId, toEdgeId });
    return { ok: true };
  }

  if (kind === 'upgrade_city') {
    const nodeId = action.nodeId;
    if (!isNodeOnBoard(game, nodeId)) return { ok: false, error: 'Bad node.' };
    if (game.phase !== 'main-actions') return { ok: false, error: 'Not the right phase for city.' };

    const node = game.geom.nodes[nodeId];
    const b = node.building;
    if (!b || b.owner !== playerId || b.type !== 'settlement') return { ok: false, error: 'You need a settlement there.' };

    const p = playerById(game, playerId);
    if (!p) return { ok: false, error: 'Missing player.' };
    if (!canAfford(p.resources, BUILD_COSTS.city)) return { ok: false, error: 'Not enough resources.' };

    payCostStats(game, playerId, p.resources, BUILD_COSTS.city, 'build');
    node.building = { owner: playerId, type: 'city' };

    recordBuild(game, playerId, 'city');
    broadcastSfx(room, 'structure');

    computeVP(game);
    game.message = `${playerName(game, playerId)} upgraded to a city.`;
    checkWin(room, game, playerId);
    pushLog(game, `${playerName(game, playerId)} upgraded a settlement to a city.`, 'build', { kind: 'city' });
    return { ok: true };
  }

  if (kind === 'buy_dev_card') {
    if (game.phase !== 'main-actions') return { ok: false, error: 'You can only buy a development card after rolling.' };
    const p = playerById(game, playerId);
    if (!p) return { ok: false, error: 'Missing player.' };
    if (!canAfford(p.resources, DEV_CARD_COST)) return { ok: false, error: 'Not enough resources.' };
    if (!game.devDeck || game.devDeck.length === 0) return { ok: false, error: 'The development deck is empty.' };

    payCostStats(game, playerId, p.resources, DEV_CARD_COST, 'dev');
    const cardType = game.devDeck.pop();
    const card = { id: game.devSeq++, type: cardType, boughtTurn: game.turnNumber, played: false };
    p.devCards.push(card);

    recordDevBought(game, playerId, cardType);

    game.lastEvent = { id: game.eventSeq++, type: 'devcard_draw', playerId, cardType, cardId: card.id };
    game.message = `${playerName(game, playerId)} bought a development card.`;
    pushLog(game, `${playerName(game, playerId)} bought a development card.`, 'dev');
    return { ok: true };
  }

  if (kind === 'play_dev_card') {
    if (game.phase !== 'main-actions') return { ok: false, error: 'You can only play a development card during your action phase.' };
    const cardId = action.cardId;
    const p = playerById(game, playerId);
    if (!p) return { ok: false, error: 'Missing player.' };
    const card = (p.devCards || []).find(c => c.id === cardId);
    if (!card) return { ok: false, error: 'Card not found.' };
    if (card.played) return { ok: false, error: 'That card has already been played.' };

    const isVP = card.type === DEV_CARD_TYPES.VICTORY_POINT;
    if (!isVP && card.boughtTurn === game.turnNumber) return { ok: false, error: 'You cannot play a development card on the same turn you buy it.' };
    if (!isVP && p.devPlayedTurn === game.turnNumber) return { ok: false, error: 'You can only play 1 development card per turn.' };

    if (card.type === DEV_CARD_TYPES.VICTORY_POINT) {
      card.played = true;
      try { recordDevPlayed(game, playerId, card.type); } catch (_) {}
      p.vpDev = (p.vpDev || 0) + 1;
      computeVP(game);
      game.message = `${playerName(game, playerId)} played a Victory Point card.`;
      pushLog(game, `${playerName(game, playerId)} played a Victory Point card.`, 'dev', { card: 'victory_point' });
      checkWin(room, game, playerId);
      return { ok: true };
    }

    // Non-VP cards count toward the 1-per-turn limit
    p.devPlayedTurn = game.turnNumber;
    card.played = true;
    try { recordDevPlayed(game, playerId, card.type); } catch (_) {}

    if (card.type === DEV_CARD_TYPES.KNIGHT) {
      broadcastSfx(room, 'robber_pirate');
      p.army = (p.army || 0) + 1;
      // Largest Army
      if (p.army >= 3) {
        if (!game.largestArmy || !game.largestArmy.playerId || p.army > (game.largestArmy.size || 0)) {
          game.largestArmy = { playerId, size: p.army };
        }
      }
      computeVP(game);
      checkWin(room, game, playerId);
      if (game.phase === 'game-over') return { ok: true };

      game.robberContext = { source: 'knight', playerId, cardId };
      if ((game.rules?.mapMode || 'classic') === 'seafarers') {
        startThiefChoice(game, 'knight', playerId);
      } else {
        game.phase = 'robber-move';
        game.message = `${playerName(game, playerId)} played a Knight. Move the robber, then steal 1 random resource.`;
      }
      pushLog(game, `${playerName(game, playerId)} played a Knight.`, 'dev', { card: 'knight' });
      return { ok: true };
    }

    if (card.type === DEV_CARD_TYPES.ROAD_BUILDING) {
      game.special = { kind: 'free_roads', forPlayerId: playerId, remaining: 2 };
      game.message = `${playerName(game, playerId)} played Road Building. Place up to 2 roads for free.`;
      pushLog(game, `${playerName(game, playerId)} played Road Building.`, 'dev', { card: 'road_building' });
      return { ok: true };
    }

    if (card.type === DEV_CARD_TYPES.INVENTION) {
      const choices = Array.isArray(action.choices) ? action.choices : [];
      if (choices.length !== 2) return { ok: false, error: 'Choose exactly 2 resources.' };
      for (const c of choices) {
        if (!RESOURCE_KINDS.includes(c)) return { ok: false, error: 'Invalid resource choice.' };
      }
      for (const c of choices) grantFromBankStats(game, playerId, p.resources, c, 1, 'dev');
      game.message = `${playerName(game, playerId)} played Invention and took ${choices[0]} + ${choices[1]}.`;
      pushLog(game, `${playerName(game, playerId)} played Invention.`, 'dev', { card: 'invention' });
      return { ok: true };
    }

    if (card.type === DEV_CARD_TYPES.MONOPOLY) {
      const rk = action.resourceKind;
      if (!RESOURCE_KINDS.includes(rk)) return { ok: false, error: 'Choose a resource type.' };
      let total = 0;
      for (const op of game.players) {
        if (op.id === playerId) continue;
        const n = op.resources?.[rk] || 0;
        if (n > 0) {
          op.resources[rk] = 0;
          recordResourceDelta(game, op.id, { [rk]: -n }, 'dev');
          grantStats(game, playerId, p.resources, rk, n, 'dev');
          total += n;
        }
      }
      game.message = `${playerName(game, playerId)} played Monopoly on ${rk} and took ${total}.`;
      pushLog(game, `${playerName(game, playerId)} played Monopoly on ${rk}.`, 'dev', { card: 'monopoly', resourceKind: rk });
      return { ok: true };
    }

    return { ok: false, error: 'Unknown development card.' };
  }

  // Fog Island: Gold Field discovery choice
  if (kind === 'choose_discovery') {
    const sp = game.special;
    if (!sp || sp.kind !== 'discovery_gold') return { ok: false, error: 'No discovery choice is pending.' };
    if (sp.forPlayerId !== playerId) return { ok: false, error: 'This discovery choice is for another player.' };

    const rk = String(action.resourceKind || '').toLowerCase();
    if (!RESOURCE_KINDS.includes(rk)) return { ok: false, error: 'Invalid resource choice.' };

    const p = playerById(game, playerId);
    if (!p) return { ok: false, error: 'Missing player.' };

    const got = grantFromBankStats(game, playerId, p.resources, rk, 1, 'discover');
    game.special = null;

    // Public event for UI feedback
    game.lastEvent = { id: game.eventSeq++, type: 'discover_gold', playerId, resourceKind: rk, tileId: sp.tileId, amount: got };

    game.message = `${playerName(game, playerId)} claimed ${rk} from a Gold Field.`;
    pushLog(game, `${playerName(game, playerId)} claimed ${rk} from a Gold Field.`, 'discover', { tileId: sp.tileId, resourceKind: rk, amount: got });
    return { ok: true };
  }

  if (kind === 'roll_dice') {
    if (game.phase !== 'main-await-roll') return { ok: false, error: 'Already rolled.' };

    const d1 = 1 + Math.floor(Math.random() * 6);
    const d2 = 1 + Math.floor(Math.random() * 6);
    const roll = d1 + d2;
    game.lastRoll = { d1, d2, roll };
    game.diceStats = game.diceStats || emptyDiceStats();
    game.diceStats[roll] = (game.diceStats[roll] || 0) + 1;

    recordRoll(game, playerId, roll, d1, d2);
    pushLog(game, `${playerName(game, playerId)} rolled ${roll}.`, 'roll', { d1, d2, roll });

    broadcastSfx(room, 'dice_roll');
    if (roll === 7) broadcastSfx(room, 'robber_pirate');


    if (roll === 7) {
      const limit = (game.rules?.discardLimit ?? DEFAULT_RULES.discardLimit);
      const required = {};
      for (const p of game.players) {
        const req = discardRequired(p, limit);
        if (req > 0) required[p.id] = req;
      }

      game.robberContext = { source: 'roll7', playerId };

      if (Object.keys(required).length > 0) {
        game.discard = { id: game.discardSeq++, required, done: {} };
        game.phase = 'discard';
        game.message = `${playerName(game, playerId)} rolled 7. Players with more than ${limit} cards must discard half (rounded down).`;
      } else {
        if ((game.rules?.mapMode || 'classic') === 'seafarers') {
          startThiefChoice(game, 'roll7', playerId);
        } else {
          game.phase = 'robber-move';
          game.message = `${playerName(game, playerId)} rolled 7. Move the robber (click a tile), then steal 1 random resource.`;
        }
      }
    } else {
      const gains = distributeResources(game, roll);

      // Rich production log entry: who gained what from this roll (after bank depletion rules).
      try {
        const any = gains && Object.keys(gains).some(pid => {
          const g = gains[pid] || {};
          return RESOURCE_KINDS.some(k => (g[k] || 0) > 0);
        });
        if (any) {
          pushLog(game, '', 'production', { roll, d1, d2, gains });
        }
      } catch (_) {}

      game.phase = 'main-actions';
      game.message = `${playerName(game, playerId)} rolled ${roll}. Build or end turn.`;
    }
    return { ok: true };
  }

  if (kind === 'discard_cards') {
    if (game.phase !== 'discard') return { ok: false, error: 'Not discarding now.' };
    if (!game.discard || !game.discard.required) return { ok: false, error: 'No discard is pending.' };

    const req = game.discard.required[playerId] || 0;
    if (!req) return { ok: false, error: 'You do not need to discard.' };
    if (game.discard.done && game.discard.done[playerId]) return { ok: false, error: 'You already discarded.' };

    const p = playerById(game, playerId);
    if (!p) return { ok: false, error: 'Missing player.' };

    const cards = action.cards || {};
    let total = 0;
    const use = {};
    for (const k of RESOURCE_KINDS) {
      const n = Math.max(0, Math.floor(Number(cards[k] || 0)));
      if (n > (p.resources[k] || 0)) return { ok: false, error: `Not enough ${k}.` };
      if (n > 0) use[k] = n;
      total += n;
    }
    if (total !== req) return { ok: false, error: `You must discard exactly ${req} card(s).` };

    for (const k of RESOURCE_KINDS) {
      const n = use[k] || 0;
      if (n > 0) {
        p.resources[k] = (p.resources[k] || 0) - n;
        bankReceive(game, k, n);
      }
    }

    // Stats
    const discardDelta = {};
    for (const k of RESOURCE_KINDS) {
      const n = use[k] || 0;
      if (n > 0) discardDelta[k] = -n;
    }
    recordResourceDelta(game, playerId, discardDelta, 'discard');
    recordDiscard(game, playerId, req);

    game.discard.done = game.discard.done || {};
    game.discard.done[playerId] = true;
    game.message = `${playerName(game, playerId)} discarded ${req} card${req === 1 ? '' : 's'}.`;
    pushLog(game, `${playerName(game, playerId)} discarded ${req} card${req === 1 ? '' : 's'}.`, 'discard', { count: req });

    const allDone = Object.keys(game.discard.required).every(pid => game.discard.done && game.discard.done[pid]);
    if (allDone) {
      game.discard = null;
      if ((game.rules?.mapMode || 'classic') === 'seafarers') {
        startThiefChoice(game, 'roll7', game.currentPlayerId);
      } else {
        game.phase = 'robber-move';
        game.message = `Discards complete. ${playerName(game, game.currentPlayerId)} move the robber, then steal 1 random resource.`;
      }
      pushLog(game, `Discards complete.`, 'discard');
    }
    return { ok: true };
  }

  if (kind === 'move_robber') {
    if (game.phase !== 'robber-move') return { ok: false, error: 'Not moving robber now.' };
    const tileId = action.tileId;
    if ((game.rules?.mapMode || 'classic') === 'seafarers') {
      const tt = game.geom.tiles?.[tileId];
      if (tt && tt.type === 'sea') return { ok: false, error: 'Robber cannot be placed on the sea.' };
    }
    const current = getRobberTileId(game);
    if (current != null && tileId === current) return { ok: false, error: 'Robber must move to a different tile.' };
    if (!setRobber(game, tileId)) return { ok: false, error: 'Bad tile.' };

    const tileInfo = game.geom.tiles[tileId];
    pushLog(game, `${playerName(game, playerId)} moved the robber.`, 'robber', { tileId, tileType: tileInfo ? tileInfo.type : null, number: tileInfo ? tileInfo.number : null });

    recordRobberMove(game, playerId);


    // Eligible victims: any opponent with a building adjacent to the robber tile
    const victimsSet = new Set();
    const tile = game.geom.tiles[tileId];
    for (const nid of tile.cornerNodeIds || []) {
      const b = game.geom.nodes[nid].building;
      if (b && b.owner && b.owner !== playerId) victimsSet.add(b.owner);
    }
    const victims = Array.from(victimsSet);

    if (victims.length > 0) {
      game.robberSteal = { id: game.robberStealSeq++, tileId, victims };
      game.phase = 'robber-steal';
      game.message = `${playerName(game, playerId)} moved the robber. Choose a player to steal 1 random resource from.`;
    } else {
      game.robberContext = null;
    game.thiefChoice = null;
    game.pirateSteal = null;
      game.robberSteal = null;
      game.phase = 'main-actions';
      game.message = `Robber moved. ${playerName(game, playerId)} may build or end turn.`;
    }
    return { ok: true };
  }

  if (kind === 'robber_steal') {
    if (game.phase !== 'robber-steal') return { ok: false, error: 'Not stealing now.' };
    if (!game.robberSteal) return { ok: false, error: 'No steal is pending.' };

    const victims = game.robberSteal.victims || [];
    let stolenKind = null;
    let victimIdUsed = null;

    if (victims.length > 0) {
      const victimId = action.victimId;
      victimIdUsed = victimId;
      if (!victimId) return { ok: false, error: 'Choose a player to steal from.' };
      if (!victims.includes(victimId)) return { ok: false, error: 'You can only steal from a player with a building on that tile.' };

      const victim = playerById(game, victimId);
      const thief = playerById(game, playerId);
      if (victim && thief) {
        const rk = randomResourceFrom(victim);
        if (rk) {
          victim.resources[rk] = (victim.resources[rk] || 0) - 1;
          recordResourceDelta(game, victimId, { [rk]: -1 }, 'steal');
          grantStats(game, playerId, thief.resources, rk, 1, 'steal');
          recordRobberSteal(game, playerId, victimId);
          stolenKind = rk;
        }
      }
    }

    game.robberContext = null;
    game.thiefChoice = null;
    game.pirateSteal = null;
    game.robberSteal = null;
    game.phase = 'main-actions';
    if (stolenKind) {
      // Private event: only the thief sees which resource was stolen
      game.lastEvent = { id: game.eventSeq++, type: 'steal_result', playerId, victimId: victimIdUsed, resourceKind: stolenKind };
      game.message = `${playerName(game, playerId)} stole 1 resource.`;
      pushLog(game, `${playerName(game, playerId)} stole 1 resource from ${playerName(game, victimIdUsed)}.`, 'robber', { victimId: victimIdUsed });
    } else {
      game.message = `${playerName(game, playerId)} may build or end turn.`;
      pushLog(game, `${playerName(game, playerId)} attempted to steal, but no resource was taken.`, 'robber');
    }
    return { ok: true };
  }


if (kind === 'choose_thief') {
  if ((game.rules?.mapMode || 'classic') !== 'seafarers') return { ok: false, error: 'Pirate is only available in Seafarers mode.' };
  if (game.phase !== 'pirate-or-robber') return { ok: false, error: 'Not choosing now.' };
  const target = action.target;
  if (playerId !== game.currentPlayerId) return { ok: false, error: 'Only the current player may choose.' };
  if (target !== 'robber' && target !== 'pirate') return { ok: false, error: 'Invalid choice.' };

  game.thiefChoice = null;

  if (target === 'robber') {
    game.phase = 'robber-move';
    game.message = `${playerName(game, playerId)}: Move the robber (click a land tile), then steal 1 random resource.`;
    return { ok: true };
  }

  game.phase = 'pirate-move';
  game.message = `${playerName(game, playerId)}: Move the pirate (click a sea tile), then steal 1 random resource.`;
  return { ok: true };
}

if (kind === 'move_pirate') {
  if ((game.rules?.mapMode || 'classic') !== 'seafarers') return { ok: false, error: 'Pirate is only available in Seafarers mode.' };
  if (game.phase !== 'pirate-move') return { ok: false, error: 'Not moving pirate now.' };
  const tileId = action.tileId;
  const tt = game.geom.tiles?.[tileId];
  if (!tt) return { ok: false, error: 'Bad tile.' };
  if (tt.type !== 'sea') return { ok: false, error: 'Pirate must be placed on the sea.' };

  const current = getPirateTileId(game);
  if (current != null && tileId === current) return { ok: false, error: 'Pirate must move to a different tile.' };

  if (!setPirate(game, tileId)) return { ok: false, error: 'Bad tile.' };

  pushLog(game, `${playerName(game, playerId)} moved the pirate.`, 'robber', { tileId, tileType: tt.type });

  recordPirateMove(game, playerId);

  const victims = pirateVictims(game, tileId, playerId);
  if (victims.length > 0) {
    game.pirateSteal = { id: game.pirateStealSeq++, tileId, victims };
    game.phase = 'pirate-steal';
    game.message = `${playerName(game, playerId)} moved the pirate. Choose a player to steal 1 random resource from.`;
  } else {
    game.robberContext = null;
    game.thiefChoice = null;
    game.pirateSteal = null;
    game.pirateSteal = null;
    game.phase = 'main-actions';
    game.message = `Pirate moved. ${playerName(game, playerId)} may build or end turn.`;
  }
  return { ok: true };
}

if (kind === 'pirate_steal') {
  if (game.phase !== 'pirate-steal') return { ok: false, error: 'Not stealing now.' };
  if (!game.pirateSteal) return { ok: false, error: 'No steal is pending.' };

  const victims = game.pirateSteal.victims || [];
  let stolenKind = null;
  let victimIdUsed = null;

  if (victims.length > 0) {
    const victimId = action.victimId;
    victimIdUsed = victimId;
    if (!victimId) return { ok: false, error: 'Choose a player to steal from.' };
    if (!victims.includes(victimId)) return { ok: false, error: 'You can only steal from a player with a ship adjacent to the pirate.' };

    const victim = playerById(game, victimId);
    const thief = playerById(game, playerId);
    if (victim && thief) {
      const rk = randomResourceFrom(victim);
      if (rk) {
        victim.resources[rk] = (victim.resources[rk] || 0) - 1;
        recordResourceDelta(game, victimId, { [rk]: -1 }, 'steal');
        grantStats(game, playerId, thief.resources, rk, 1, 'steal');
        recordPirateSteal(game, playerId, victimId);
        stolenKind = rk;
      }
    }
  }

  game.robberContext = null;
  game.pirateSteal = null;
  game.phase = 'main-actions';
  if (stolenKind) {
    game.lastEvent = { id: game.eventSeq++, type: 'steal_result', playerId, victimId: victimIdUsed, resourceKind: stolenKind };
    game.message = `${playerName(game, playerId)} stole 1 resource.`;
    pushLog(game, `${playerName(game, playerId)} stole 1 resource from ${playerName(game, victimIdUsed)}.`, 'robber', { victimId: victimIdUsed, pirate: true });
  } else {
    game.message = `${playerName(game, playerId)} may build or end turn.`;
    pushLog(game, `${playerName(game, playerId)} attempted to steal, but no resource was taken.`, 'robber', { pirate: true });
  }
  return { ok: true };
}





  // -------------------- Trading --------------------

  if (kind === 'bank_trade') {
    if (game.phase !== 'main-actions') return { ok: false, error: 'You can only trade after rolling.' };

    const giveKind = action.giveKind;
    const takeKind = action.takeKind;
    const takeQty = Math.max(1, Math.floor(Number(action.takeQty || 1)));

    if (!RESOURCE_KINDS.includes(giveKind) || !RESOURCE_KINDS.includes(takeKind)) {
      return { ok: false, error: 'Invalid resource type.' };
    }
    if (giveKind === takeKind) return { ok: false, error: 'Choose two different resources.' };

    const p = playerById(game, playerId);
    if (!p) return { ok: false, error: 'Missing player.' };

    // Default: best available rate based on owned ports.
    // Allow client to explicitly force a 4:1 bank trade (requested behavior).
    const forced = Math.floor(Number(action.forceRatio || 0));
    const ratio = (forced === 4) ? 4 : tradeRatioFor(game, playerId, giveKind);
    const cost = ratio * takeQty;

    if ((p.resources[giveKind] || 0) < cost) return { ok: false, error: `Not enough ${giveKind} to trade.` };

    // Pay and receive
    ensureBank(game);

    // Ensure the bank can supply what is requested before taking payment.
    const avail = (game.bank && Number.isFinite(game.bank[takeKind])) ? game.bank[takeKind] : 0;
    if (avail < takeQty) return { ok: false, error: `Bank is out of ${takeKind}.` };

    // Pay into the bank (clamped at 19)
    p.resources[giveKind] = (p.resources[giveKind] || 0) - cost;
    bankReceive(game, giveKind, cost);

    // Take from the bank
    bankGive(game, takeKind, takeQty);
    grantStats(game, playerId, p.resources, takeKind, takeQty, 'trade');
    recordResourceDelta(game, playerId, { [giveKind]: -cost }, 'trade');
    recordTrade(game, playerId, 'bank');

    game.message = `${playerName(game, playerId)} traded with the bank (${ratio}:1).`;
    pushLog(game, `${playerName(game, playerId)} traded ${cost} ${giveKind} for ${takeQty} ${takeKind} (bank).`, 'trade', { kind: 'bank', giveKind, takeKind, takeQty, ratio });
    return { ok: true };
  }


  if (kind === 'propose_trade') {
    if (game.phase !== 'main-actions') return { ok: false, error: 'You can only trade after rolling.' };
    // Global trade system: only one pending trade at a time.
    // However, allow the original proposer to *revise* their own current offer.
    const replaceTradeId = Math.floor(Number(action.replaceTradeId || 0));
    const canReplace = !!game.pendingTrade
      && replaceTradeId
      && game.pendingTrade.id === replaceTradeId
      && game.pendingTrade.fromId === playerId;

    if (game.pendingTrade && !canReplace) return { ok: false, error: 'A trade is already pending.' };

    const fromP = playerById(game, playerId);
    if (!fromP) return { ok: false, error: 'Player not found.' };

    const offerRaw = action.offer || {};
    const reqRaw = action.request || {};

    const offer = {};
    const request = {};
    let offerTotal = 0;
    let reqTotal = 0;

    for (const k of RESOURCE_KINDS) {
      const o = Math.max(0, Math.floor(Number(offerRaw[k] || 0)));
      const r = Math.max(0, Math.floor(Number(reqRaw[k] || 0)));
      if (o > 0) { offer[k] = o; offerTotal += o; }
      if (r > 0) { request[k] = r; reqTotal += r; }
    }

    if (offerTotal === 0 || reqTotal === 0) return { ok: false, error: 'Trade must include both an offer and a request.' };

    // Ensure proposer can afford the offer now (will be re-checked on finalize)
    for (const [k, n] of Object.entries(offer)) {
      if ((fromP.resources[k] || 0) < n) return { ok: false, error: `Not enough ${k} to offer.` };
    }

    // Initialize response slots for all other players
    const responses = {};
    for (const p of game.players || []) {
      if (p && p.id && p.id !== playerId) responses[p.id] = null; // null | 'accept' | 'reject'
    }

    const tradeId = game.tradeSeq++;
    game.pendingTrade = { id: tradeId, fromId: playerId, offer, request, responses, createdAt: now() };

    if (canReplace) {
      game.message = `${playerName(game, playerId)} revised a trade offer.`;
      pushLog(game, `${playerName(game, playerId)} revised a trade offer.`, 'trade', { kind: 'revise_offer', oldTradeId: replaceTradeId, newTradeId: tradeId });
    } else {
      game.message = `${playerName(game, playerId)} proposed a trade.`;
      pushLog(game, `${playerName(game, playerId)} proposed a trade.`, 'trade', { kind: 'player_global', tradeId });
    }
    return { ok: true };
  }


  if (kind === 'respond_trade') {
    const tradeId = Number(action.tradeId || 0);
    const accept = !!action.accept;

    const t = game.pendingTrade;
    if (!t || !t.id || t.id !== tradeId) return { ok: false, error: 'No such pending trade.' };
    if (playerId === t.fromId) return { ok: false, error: 'Proposer cannot respond to their own trade.' };

    if (!t.responses || !(playerId in t.responses)) return { ok: false, error: 'You cannot respond to this trade.' };

    t.responses[playerId] = accept ? 'accept' : 'reject';

    if (accept) {
      game.message = `${playerName(game, playerId)} accepted the trade offer.`;
      pushLog(game, `${playerName(game, playerId)} accepted a trade offer from ${playerName(game, t.fromId)}.`, 'trade', { kind: 'accept_offer', tradeId });
      return { ok: true };
    }

    game.message = `${playerName(game, playerId)} rejected the trade offer.`;
    pushLog(game, `${playerName(game, playerId)} rejected a trade offer from ${playerName(game, t.fromId)}.`, 'trade', { kind: 'reject_offer', tradeId });

    const vals = Object.values(t.responses || {});
    const allReject = vals.length > 0 && vals.every(v => v === 'reject');
    if (allReject) {
      game.pendingTrade = null;
      game.message = `All players rejected the trade offer.`;
      pushLog(game, `All players rejected ${playerName(game, t.fromId)}'s trade offer.`, 'trade', { kind: 'reject_all', tradeId });
    }
    return { ok: true };
  }

  if (kind === 'finalize_trade') {
    const tradeId = Number(action.tradeId || 0);
    const withPlayerId = action.withPlayerId;

    const t = game.pendingTrade;
    if (!t || !t.id || t.id !== tradeId) return { ok: false, error: 'No such pending trade.' };
    if (playerId !== t.fromId) return { ok: false, error: 'Only the proposer can finalize this trade.' };
    if (!withPlayerId || withPlayerId === playerId) return { ok: false, error: 'Choose a player to trade with.' };

    if (!t.responses || t.responses[withPlayerId] !== 'accept') return { ok: false, error: 'That player has not accepted the trade.' };

    const fromP = playerById(game, t.fromId);
    const toP = playerById(game, withPlayerId);
    if (!fromP) {
      game.pendingTrade = null;
      return { ok: false, error: 'Trade proposer not found.' };
    }
    if (!toP) {
      if (t.responses) t.responses[withPlayerId] = 'reject';
      return { ok: false, error: 'Trade player not found.' };
    }

    // Validate affordability (hands may have changed)
    for (const [k, n] of Object.entries(t.offer || {})) {
      if ((fromP.resources[k] || 0) < n) {
        game.pendingTrade = null;
        return { ok: false, error: `${playerName(game, t.fromId)} no longer has enough ${k} to complete this trade.` };
      }
    }
    for (const [k, n] of Object.entries(t.request || {})) {
      if ((toP.resources[k] || 0) < n) {
        if (t.responses) t.responses[withPlayerId] = 'reject';
        const vals = Object.values(t.responses || {});
        const allReject = vals.length > 0 && vals.every(v => v === 'reject');
        if (allReject) {
          game.pendingTrade = null;
          game.message = `All players rejected the trade offer.`;
          pushLog(game, `All players rejected ${playerName(game, t.fromId)}'s trade offer.`, 'trade', { kind: 'reject_all', tradeId });
        }
        return { ok: false, error: `${playerName(game, withPlayerId)} no longer has enough ${k} to complete this trade.` };
      }
    }

    // Execute: counterparty gives request to proposer; proposer gives offer to counterparty
    for (const [k, n] of Object.entries(t.request || {})) {
      toP.resources[k] = (toP.resources[k] || 0) - n;
      recordResourceDelta(game, withPlayerId, { [k]: -n }, 'trade');
      grantStats(game, t.fromId, fromP.resources, k, n, 'trade');
    }
    for (const [k, n] of Object.entries(t.offer || {})) {
      fromP.resources[k] = (fromP.resources[k] || 0) - n;
      recordResourceDelta(game, t.fromId, { [k]: -n }, 'trade');
      grantStats(game, withPlayerId, toP.resources, k, n, 'trade');
    }

    recordTrade(game, t.fromId, 'player');
    recordTrade(game, withPlayerId, 'player');

    game.pendingTrade = null;
    game.message = `${playerName(game, t.fromId)} traded with ${playerName(game, withPlayerId)}.`;
    pushLog(game, `${playerName(game, t.fromId)} traded with ${playerName(game, withPlayerId)}.`, 'trade', { kind: 'accept', tradeId, withPlayerId });
    return { ok: true };
  }



  if (kind === 'end_turn') {
    if (game.phase !== 'main-actions') return { ok: false, error: 'Cannot end turn right now.' };

    // Any unanswered trade offer expires when the turn ends (keeps the game moving)
    game.pendingTrade = null;

    // Clear per-turn special contexts
    if (game.special && game.special.forPlayerId === playerId) game.special = null;
    game.robberContext = null;
    game.thiefChoice = null;
    game.pirateSteal = null;

    recordTurnEnd(game, playerId);

    // next player
    const idx = game.turnOrder.indexOf(game.currentPlayerId);
    const next = game.turnOrder[(idx + 1) % game.turnOrder.length];
    game.currentPlayerId = next;
    game.turnNumber += 1;
    game.phase = 'main-await-roll';
    game.message = `${playerName(game, next)}: Roll the dice.`;
    recordTurnStart(game);
    pushLog(game, `${playerName(game, playerId)} ended their turn.`, 'turn');
    return { ok: true };
  }

  return { ok: false, error: 'Unknown action.' };
}

// -------------------- Rooms + Networking --------------------

const COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f'];

const rooms = new Map(); // code -> room

function createRoom(hostUserId, hostName) {
  let code = randCode(4);
  while (rooms.has(code)) code = randCode(4);

  const hostId = String(hostUserId || '').trim() || crypto.randomUUID();
  const dn = (hostName || 'Host');
  const safeName = String(dn).slice(0, 20);

  const room = {
    code,
    hostId,
    createdAt: now(),
    players: [{
      id: hostId,
      name: safeName,
      color: COLORS[0],
      joinedAt: now(),
    }],
    sockets: new Map(), // playerId -> ws
    game: null,
    preview: null,
    rules: { ...DEFAULT_RULES },
    chat: [],
    chatSeq: 1,
  };
  rooms.set(code, room);
  return room;
}


function joinRoom(code, userId, name) {
  const room = rooms.get(code);
  if (!room) return { ok: false, error: 'Room not found.' };

  const pid = String(userId || '').trim();
  if (!pid) return { ok: false, error: 'Not logged in.' };

  const desiredName = (name == null) ? '' : String(name || '').slice(0, 20);

  // If this user is already in the room, treat this as a rejoin (even if game started)
  const existing = room.players.find(p => p && p.id === pid);
  if (existing) {
    if (desiredName) existing.name = desiredName;
    if (room.game && room.game.players) {
      const gp = room.game.players.find(p => p && p.id === pid);
      if (gp && desiredName) gp.name = desiredName;
    }
    return { ok: true, room, playerId: pid };
  }

  // New join
  if (room.players.length >= 4) return { ok: false, error: 'Room is full.' };
  if (room.game && room.game.phase !== 'lobby') return { ok: false, error: 'Game already started.' };

  const color = COLORS[room.players.length % COLORS.length];
  room.players.push({ id: pid, name: (desiredName || 'Player').slice(0, 20), color, joinedAt: now() });
  return { ok: true, room, playerId: pid };
}



function rejoinRoom(code, playerId) {
  const room = rooms.get(code);
  if (!room) return { ok: false, error: 'Room not found.' };
  const pid = String(playerId || '').trim();
  if (!pid) return { ok: false, error: 'Missing player ID.' };
  const exists = room.players.some(p => p.id === pid);
  if (!exists) return { ok: false, error: 'Player ID not found in this room.' };
  return { ok: true, room, playerId: pid };
}





function mapPreviewKey(rules) {
  const mm = (rules && String(rules.mapMode || 'classic').toLowerCase() === 'seafarers') ? 'seafarers' : 'classic';
  if (mm !== 'seafarers') return 'classic';
  const rawScen = String((rules && rules.seafarersScenario) || 'four_islands').toLowerCase();
  const scen = (rawScen === 'through_the_desert' || rawScen === 'through-the-desert' || rawScen === 'desert' || rawScen === 'throughdesert')
    ? 'through_the_desert'
    : (rawScen === 'fog_island' || rawScen === 'fog-island' || rawScen === 'fog' || rawScen === 'fogisland')
      ? 'fog_island'
      : (rawScen === 'test_builder' || rawScen === 'test-builder' || rawScen === 'test' || rawScen === 'builder')
        ? 'test_builder'
        : 'four_islands';
  return `seafarers:${scen}`;
}

function generatePreviewGeom(rules) {
  const mm = (rules && String(rules.mapMode || 'classic').toLowerCase() === 'seafarers') ? 'seafarers' : 'classic';
  if (mm === 'seafarers') {
    const key = mapPreviewKey(rules);
    const scen = key.split(':')[1] || 'four_islands';
    let geom = null;
    if (scen === 'through_the_desert' || scen === 'fog_island') {
      geom = buildGeometryFromAxials(generateThroughTheDesertAxials());
    } else {
      geom = buildGeometry(4);
    }
    geom.tiles = generateBoardSeafarers(geom, scen);
    geom.ports = (scen === 'test_builder') ? [] : generatePortsSeafarers(geom);
    return geom;
  }
  // classic
  const geom = buildGeometry(3);
  geom.tiles = generateBoardClassicWithSea(geom);
  geom.ports = generatePorts(geom);
  return geom;
}

function ensurePreview(room, force=false) {
  if (!room) return false;
  const rules = room.rules || DEFAULT_RULES;
  const key = mapPreviewKey(rules);
  if (!room.preview || force || room.preview.key !== key || !room.preview.geom) {
    room.preview = { key, geom: generatePreviewGeom(rules), at: now() };
    return true;
  }
  return false;
}

function makePreviewGame(room) {
  ensurePreview(room, false);
  const game = newEmptyGame(room);
  game.geom = deepClone(room.preview.geom);
  game.phase = 'lobby';
  game.message = 'Map preview';
  game.previewAt = room.preview.at;
  game.previewKey = room.preview.key;
  return game;
}

function broadcastPreviewState(room) {
  if (!room) return;
  const previewGame = makePreviewGame(room);
  for (const p of room.players) {
    const ws = room.sockets.get(p.id);
    if (ws && ws.readyState === WebSocket.OPEN) {
      sendJson(ws, { type: 'state', state: sanitizeStateFor(previewGame, p.id) });
    }
  }
}

function roomSnapshot(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    players: room.players.map(p => ({ id: p.id, name: p.name, color: p.color })),
    gamePhase: room.game ? room.game.phase : 'lobby',
    rules: room.rules || { ...DEFAULT_RULES },
    chat: room.chat || [],
  };
}

function broadcastRoom(room) {
  const snap = roomSnapshot(room);
  for (const [pid, ws] of room.sockets.entries()) {
    if (ws.readyState === WebSocket.OPEN) sendJson(ws, { type: 'room', room: snap });
  }
}

function broadcastSfx(room, name, extra) {
  // applyAction() is also used in "dry run" contexts (e.g., build-option probing)
  // where we pass a minimal { game } object that intentionally has no sockets.
  // Never crash the server in those cases.
  if (!room || !room.sockets || typeof room.sockets.values !== 'function') return;
  const payload = { type: 'sfx', name: String(name || '') };
  if (extra && typeof extra === 'object') {
    for (const k of Object.keys(extra)) payload[k] = extra[k];
  }
  for (const ws of room.sockets.values()) {
    if (ws.readyState === WebSocket.OPEN) sendJson(ws, payload);
  }
}




function sanitizeStateFor(game, viewerId) {
  // Per-player state view: keeps dev deck order hidden and other players' hands private.
  const state = JSON.parse(JSON.stringify(game));
  state.devDeckCount = (game.devDeck || []).length;
  delete state.devDeck;

  const isGameOver = state.phase === 'game-over';

  // Keep rich stats for the post-game overlay, but avoid leaking per-player
  // resource/trade details during an active game.
  if (state.stats) {
    try {
      state.stats = isGameOver ? state.stats : filterStatsForViewer(state.stats, viewerId);
    } catch (_) {}
  }

  // Hide other players' resource breakdown + dev card identities (classic Catan hand secrecy).
  for (const p of (state.players || [])) {
    const orig = (game.players || []).find(op => op.id === p.id) || null;
    const res = (orig && orig.resources) ? orig.resources : (p.resources || {});
    const handCount = RESOURCE_KINDS.reduce((a, k) => a + (res[k] || 0), 0);
    const devCount = (orig && orig.devCards) ? orig.devCards.length : ((p.devCards || []).length);
    p.handCount = handCount;
    p.devCount = devCount;

    if (!isGameOver && p.id !== viewerId) {
      delete p.resources;
      delete p.devCards;
    }
  }

  // Sanitize private events
  if (state.lastEvent) {
    if (state.lastEvent.type === 'devcard_draw' && state.lastEvent.playerId !== viewerId) {
      delete state.lastEvent.cardType;
      delete state.lastEvent.cardId;
    }
    if (state.lastEvent.type === 'steal_result' && state.lastEvent.playerId !== viewerId) {
      delete state.lastEvent.resourceKind;
    }
  }

  // Hide Fog Island hidden tile information from clients.
  if (state.geom && Array.isArray(state.geom.tiles)) {
    for (const t of state.geom.tiles) {
      if (t && t.fog && !t.revealed) {
        try { delete t.hiddenType; } catch (_) {}
        try { delete t.hiddenNumber; } catch (_) {}
      }
    }
  }





  return state;
}

function broadcastState(room) {
  if (!room.game) return;
  syncTimer(room.game);

  for (const [pid, ws] of room.sockets.entries()) {
    if (ws.readyState !== WebSocket.OPEN) continue;
    const state = sanitizeStateFor(room.game, pid);
    sendJson(ws, { type: 'state', state });
  }
}


function cleanupRooms() {
  const cutoff = now() - (1000 * 60 * 60 * 8); // 8 hours
  for (const [code, room] of rooms.entries()) {
    const anyOpen = Array.from(room.sockets.values()).some(ws => ws.readyState === WebSocket.OPEN);
    if (!anyOpen && room.createdAt < cutoff) rooms.delete(code);
  }
}

// -------------------- HTTP static server --------------------

function safePath(p) {
  const rel = p.replace(/\0/g, '').replace(/\.\./g, '');
  return path.join(PUBLIC_DIR, rel);
}

const server = http.createServer((req, res) => {
  try {
    let urlPath = req.url.split('?')[0];
    if (urlPath === '/') urlPath = '/index.html';

    // Block websocket path from static handling
    if (urlPath.startsWith('/ws')) {
      res.writeHead(426);
      res.end('Upgrade Required');
      return;
    }

    const filePath = safePath(urlPath);
    if (!filePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.stat(filePath, (err, st) => {
      if (err || !st.isFile()) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    });
  } catch (e) {
    res.writeHead(500);
    res.end('Server error');
  }
});

const wss = new WebSocket.Server({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  const urlPath = req.url.split('?')[0];
  if (urlPath !== '/ws') {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
});

wss.on('connection', (ws) => {
  ws._playerId = null;
  ws._roomCode = null;

  sendJson(ws, { type: 'hello', serverTime: now(), version: 1 });

  ws.on('message', (data) => {
    let msg = null;
    try { msg = JSON.parse(String(data)); } catch { return; }
    if (!msg || !msg.type) return;

    
    // ---- Auth (must happen before joining/creating rooms) ----
    if (msg.type === 'auth_register') {
      const res = createUser({
        username: msg.username,
        password: msg.password,
        displayName: msg.displayName || msg.name || '',
      });
      if (!res.ok) { sendJson(ws, { type: 'error', error: res.error || 'Register failed.' }); return; }
      const user = res.user;
      user.lastLoginAt = now();
      const token = issueAuthToken(user);
      saveUsersDb();

      const prev = userSockets.get(user.id);
      if (prev && prev !== ws && prev.readyState === WebSocket.OPEN) {
        sendJson(prev, { type: 'error', error: 'You were signed out because this account signed in from another device.' });
        try { prev.close(); } catch (_) {}
      }
      userSockets.set(user.id, ws);

      ws._userId = user.id;
      ws._username = user.username;
      ws._authed = true;

      sendJson(ws, { type: 'auth_ok', user: safeUserPublic(user), token });
      return;
    }

    if (msg.type === 'auth_login') {
      const user = findUserByUsername(msg.username);
      if (!user) { sendJson(ws, { type: 'error', error: 'Invalid username or password.' }); return; }
      if (!verifyPassword(user, msg.password)) { sendJson(ws, { type: 'error', error: 'Invalid username or password.' }); return; }
      if (msg.displayName || msg.name) {
        setUserDisplayName(user, msg.displayName || msg.name);
      }
      user.lastLoginAt = now();
      const token = issueAuthToken(user);
      saveUsersDb();

      const prev = userSockets.get(user.id);
      if (prev && prev !== ws && prev.readyState === WebSocket.OPEN) {
        sendJson(prev, { type: 'error', error: 'You were signed out because this account signed in from another device.' });
        try { prev.close(); } catch (_) {}
      }
      userSockets.set(user.id, ws);

      ws._userId = user.id;
      ws._username = user.username;
      ws._authed = true;

      sendJson(ws, { type: 'auth_ok', user: safeUserPublic(user), token });
      return;
    }

    if (msg.type === 'auth_token') {
      const user = authenticateByToken(msg.token);
      if (!user) { sendJson(ws, { type: 'auth_required' }); return; }

      const prev = userSockets.get(user.id);
      if (prev && prev !== ws && prev.readyState === WebSocket.OPEN) {
        sendJson(prev, { type: 'error', error: 'You were signed out because this account signed in from another device.' });
        try { prev.close(); } catch (_) {}
      }
      userSockets.set(user.id, ws);

      ws._userId = user.id;
      ws._username = user.username;
      ws._authed = true;

      sendJson(ws, { type: 'auth_ok', user: safeUserPublic(user), token: String(msg.token || '').trim() });
      saveUsersDb();
      return;
    }

    if (msg.type === 'auth_set_display_name') {
      if (!ws._userId) { sendJson(ws, { type: 'error', error: 'Not logged in.' }); return; }
      const user = findUserById(ws._userId);
      if (!user) { sendJson(ws, { type: 'error', error: 'Account not found.' }); return; }
      setUserDisplayName(user, msg.displayName || msg.name || '');
      saveUsersDb();
      sendJson(ws, { type: 'auth_ok', user: safeUserPublic(user), token: null });
      return;
    }

    // --- History / Leaderboard ---
    if (msg.type === 'get_game_history') {
      const limit = clamp(Math.floor(Number(msg.limit || 200)), 1, 2000);
      const games = listGameHistory(limit);
      sendJson(ws, { type: 'game_history_list', games });
      return;
    }

    if (msg.type === 'get_game_history_entry') {
      const id = String(msg.id || '').trim();
      const entry = getGameHistoryEntry(id);
      if (!entry) {
        sendJson(ws, { type: 'error', error: 'History item not found.' });
        return;
      }
      // Send full snapshot for postgame viewer
      sendJson(ws, { type: 'game_history_entry', game: entry });
      return;
    }

    if (msg.type === 'get_player_leaderboard') {
      const rows = computeLeaderboardFromHistory();
      sendJson(ws, { type: 'player_leaderboard', rows });
      return;
    }

if (msg.type === 'create_room') {
      if (!ws._userId) {
        sendJson(ws, { type: 'error', error: 'Please log in first.' });
        return;
      }
      const desiredName = cleanDisplayName(msg.displayName || msg.name || 'Host') || 'Host';
      const user = findUserById(ws._userId);
      if (user && desiredName) {
        setUserDisplayName(user, desiredName);
        saveUsersDb();
      }

      const room = createRoom(ws._userId, desiredName);
      ws._roomCode = room.code;
      ws._playerId = ws._userId;
      room.sockets.set(ws._userId, ws);
      ensurePreview(room, true);

      sendJson(ws, { type: 'joined', playerId: ws._userId, room: roomSnapshot(room), isHost: true });
      broadcastRoom(room);
      return;
    }

    if (msg.type === 'join_room') {
      if (!ws._userId) {
        sendJson(ws, { type: 'error', error: 'Please log in first.' });
        return;
      }
      const code = String(msg.code || '').toUpperCase().trim();
      const desiredName = cleanDisplayName(msg.displayName || msg.name || 'Player') || 'Player';
      const user = findUserById(ws._userId);
      if (user && desiredName) {
        setUserDisplayName(user, desiredName);
        saveUsersDb();
      }

      const result = joinRoom(code, ws._userId, desiredName);
      if (!result.ok) {
        sendJson(ws, { type: 'error', error: result.error });
        return;
      }
      const room = result.room;

      // If someone else is currently connected as this user in this room, replace them.
      const prev = room.sockets.get(ws._userId);
      room.sockets.set(ws._userId, ws);

      ws._roomCode = room.code;
      ws._playerId = ws._userId;

      if (prev && prev !== ws && prev.readyState === WebSocket.OPEN) {
        sendJson(prev, { type: 'error', error: 'You were disconnected because this account joined from another browser.' });
        try { prev.close(); } catch (_) {}
      }

      ensurePreview(room, false);

      sendJson(ws, { type: 'joined', playerId: ws._userId, room: roomSnapshot(room), isHost: ws._userId === room.hostId });
      broadcastRoom(room);
      return;
    }

    if (msg.type === 'rejoin_room') {
      const code = String(msg.code || '').toUpperCase().trim();

      // New behavior: if logged in, rejoin using your account (no player ID needed)
      if (ws._userId) {
        const desiredName = cleanDisplayName(msg.displayName || msg.name || '');
        const user = findUserById(ws._userId);
        if (user && desiredName) {
          setUserDisplayName(user, desiredName);
          saveUsersDb();
        }

        const jr = joinRoom(code, ws._userId, desiredName || null);
        if (!jr.ok) {
          sendJson(ws, { type: 'error', error: jr.error });
          return;
        }
        const room = jr.room;
        const pid = ws._userId;

        // If someone else is currently connected as this player, replace them.
        const prev = room.sockets.get(pid);
        room.sockets.set(pid, ws);

        ws._roomCode = room.code;
        ws._playerId = pid;

        if (prev && prev !== ws && prev.readyState === WebSocket.OPEN) {
          sendJson(prev, { type: 'error', error: 'You were disconnected because this account rejoined from another browser.' });
          try { prev.close(); } catch (_) {}
        }

        sendJson(ws, { type: 'joined', playerId: pid, room: roomSnapshot(room), isHost: pid === room.hostId });
        if (room.game) {
          syncTimer(room.game);
          sendJson(ws, { type: 'state', state: sanitizeStateFor(room.game, pid) });
        } else {
          ensurePreview(room, false);
          const pg = makePreviewGame(room);
          sendJson(ws, { type: 'state', state: sanitizeStateFor(pg, pid) });
        }
        broadcastRoom(room);
        return;
      }

      // Legacy behavior (older clients): requires explicit playerId
      const result = rejoinRoom(code, msg.playerId);
      if (!result.ok) {
        sendJson(ws, { type: 'error', error: result.error });
        return;
      }
      const room = result.room;
      const pid = result.playerId;

      // If someone else is currently connected as this player, replace them.
      const prev = room.sockets.get(pid);
      room.sockets.set(pid, ws);

      ws._roomCode = room.code;
      ws._playerId = pid;

      if (prev && prev !== ws && prev.readyState === WebSocket.OPEN) {
        sendJson(prev, { type: 'error', error: 'You were disconnected because this player rejoined from another browser.' });
        try { prev.close(); } catch (_) {}
      }

      sendJson(ws, { type: 'joined', playerId: pid, room: roomSnapshot(room), isHost: pid === room.hostId });
      if (room.game) {
        syncTimer(room.game);
        sendJson(ws, { type: 'state', state: sanitizeStateFor(room.game, pid) });
      } else {
        ensurePreview(room, false);
        const pg = makePreviewGame(room);
        sendJson(ws, { type: 'state', state: sanitizeStateFor(pg, pid) });
      }
      broadcastRoom(room);
      return;
    }

    // must be in a room after this
    const code = ws._roomCode;
    const pid = ws._playerId;
    if (!code || !pid) {
      sendJson(ws, { type: 'error', error: 'Not in a room.' });
      return;
    }
    const room = rooms.get(code);
    if (!room) {
      sendJson(ws, { type: 'error', error: 'Room expired.' });
      return;
    }


    if (msg.type === 'set_rules') {
      if (pid !== room.hostId) {
        sendJson(ws, { type: 'error', error: 'Only host can change settings.' });
        return;
      }
      if (room.game && room.game.phase !== 'lobby') {
        sendJson(ws, { type: 'error', error: 'Settings are locked once the game starts.' });
        return;
      }
      const r = msg.rules || {};
      const prevKey = mapPreviewKey(room.rules || DEFAULT_RULES);
      const next = { ...(room.rules || DEFAULT_RULES) };

      const dl = Math.floor(Number(r.discardLimit ?? next.discardLimit));
      if (Number.isFinite(dl)) next.discardLimit = Math.max(3, Math.min(30, dl));

      const clampMs = (v, def) => {
        const n = Math.floor(Number(v));
        if (!Number.isFinite(n)) return def;
        return Math.max(5000, Math.min(300000, n));
      };
      next.setupTurnMs = clampMs(r.setupTurnMs, next.setupTurnMs);
      next.playTurnMs = clampMs(r.playTurnMs, next.playTurnMs);
      next.microPhaseMs = clampMs(r.microPhaseMs, next.microPhaseMs);

      const mm = String(r.mapMode ?? next.mapMode ?? 'classic').toLowerCase();
      next.mapMode = (mm === 'seafarers') ? 'seafarers' : 'classic';

      const rawScen = String(r.seafarersScenario ?? next.seafarersScenario ?? 'four_islands').toLowerCase();
      next.seafarersScenario = (rawScen === 'through_the_desert' || rawScen === 'through-the-desert' || rawScen === 'desert' || rawScen === 'throughdesert')
        ? 'through_the_desert'
        : (rawScen === 'fog_island' || rawScen === 'fog-island' || rawScen === 'fog' || rawScen === 'fogisland')
          ? 'fog_island'
          : (rawScen === 'test_builder' || rawScen === 'test-builder' || rawScen === 'test' || rawScen === 'builder')
            ? 'test_builder'
            : 'four_islands';

      // Victory points to win (clamped) — scenario defaults:
      // - Classic: 10
      // - Seafarers Four Islands: 13
      // - Seafarers Through the Desert: 14
      const rawVp = (r.victoryPointsToWin ?? r.victoryTarget ?? r.vpToWin);
      const vp = Math.floor(Number(rawVp));
      if (Number.isFinite(vp)) {
        next.victoryPointsToWin = Math.max(3, Math.min(30, vp));
      } else {
        next.victoryPointsToWin = defaultVictoryPointsToWin(next);
      }

      room.rules = next;
      const nextKey = mapPreviewKey(next);
      const previewChanged = ensurePreview(room, (prevKey !== nextKey) || !room.preview);
      broadcastRoom(room);
      if (previewChanged) broadcastPreviewState(room);
      return;
    }


    if (msg.type === 'generate_map') {
      if (pid !== room.hostId) {
        sendJson(ws, { type: 'error', error: 'Only host can regenerate the map.' });
        return;
      }
      if (room.game && room.game.phase !== 'lobby') {
        sendJson(ws, { type: 'error', error: 'Cannot regenerate once the game starts.' });
        return;
      }
      ensurePreview(room, true);
      broadcastPreviewState(room);
      return;
    }

    if (msg.type === 'edit_preview_tile') {
      if (pid !== room.hostId) {
        sendJson(ws, { type: 'error', error: 'Only host can edit the test map.' });
        return;
      }
      if (room.game && room.game.phase !== 'lobby') {
        sendJson(ws, { type: 'error', error: 'Cannot edit once the game starts.' });
        return;
      }
      const rules = room.rules || DEFAULT_RULES;
      const mm = String(rules.mapMode || 'classic').toLowerCase();
      const scen = String(rules.seafarersScenario || 'four_islands').toLowerCase();
      if (mm !== 'seafarers' || scen !== 'test_builder') {
        sendJson(ws, { type: 'error', error: 'Map editing is only available in Seafarers → Test Builder.' });
        return;
      }
      ensurePreview(room, false);
      const geom = room.preview && room.preview.geom;
      if (!geom || !Array.isArray(geom.tiles)) {
        sendJson(ws, { type: 'error', error: 'No preview map available.' });
        return;
      }
      const tid = Math.floor(Number(msg.tileId));
      if (!Number.isFinite(tid) || tid < 0 || tid >= geom.tiles.length) {
        sendJson(ws, { type: 'error', error: 'Invalid tile ID.' });
        return;
      }
      const allowed = new Set(['sea','desert','forest','hills','pasture','field','mountains','gold']);
      let tt = String(msg.tileType || 'sea').toLowerCase();
      if (!allowed.has(tt)) tt = 'sea';
      const t = geom.tiles[tid];
      // If painting a desert, make the robber live here (matches typical setup expectations).
      if (tt === 'desert') {
        for (const x of geom.tiles) x.robber = false;
        t.robber = true;
      }
      t.type = tt;
      // Clear number for sea/desert; otherwise accept 2-12 excluding 7, or null
      let num = null;
      if (tt !== 'sea' && tt !== 'desert') {
        const n = Math.floor(Number(msg.number));
        if (Number.isFinite(n) && n >= 2 && n <= 12 && n !== 7) num = n;
      }
      t.number = num;
      // Robber must never be on sea
      if (t.robber && t.type === 'sea') t.robber = false;
      // Pirate must only be on sea
      if (t.pirate && t.type !== 'sea') t.pirate = false;

      // Ensure exactly one robber on a non-sea tile
      const robberIds = geom.tiles.filter(x => x.robber).map(x => x.id);
      if (robberIds.length > 1) {
        for (let i = 1; i < robberIds.length; i++) geom.tiles[robberIds[i]].robber = false;
      }
      let robberId = geom.tiles.find(x => x.robber)?.id;
      if (robberId == null || geom.tiles[robberId].type === 'sea') {
        if (robberId != null) geom.tiles[robberId].robber = false;
        const desert = geom.tiles.find(x => x.type === 'desert');
        const land = geom.tiles.find(x => x.type !== 'sea');
        const pick = desert || land;
        if (pick) pick.robber = true;
      }

      // Ensure exactly one pirate on a sea tile
      const pirateIds = geom.tiles.filter(x => x.pirate).map(x => x.id);
      if (pirateIds.length > 1) {
        for (let i = 1; i < pirateIds.length; i++) geom.tiles[pirateIds[i]].pirate = false;
      }
      let pirateId = geom.tiles.find(x => x.pirate)?.id;
      if (pirateId == null || geom.tiles[pirateId].type !== 'sea') {
        if (pirateId != null) geom.tiles[pirateId].pirate = false;
        const seaIds = geom.tiles.filter(x => x.type === 'sea').map(x => x.id);
        if (seaIds.length) geom.tiles[seaIds[Math.floor(Math.random() * seaIds.length)]].pirate = true;
      }

      room.preview.at = now();
      broadcastPreviewState(room);
      return;
    }

    if (msg.type === 'chat') {
      const pushed = pushChat(room, pid, msg.text);
      if (!pushed) return;
      if (room.game) broadcastState(room);
      else broadcastRoom(room);
      return;
    }

    if (msg.type === 'start_game') {
      if (pid !== room.hostId) {
        sendJson(ws, { type: 'error', error: 'Only host can start.' });
        return;
      }
      const allowSolo = String((room.rules && room.rules.mapMode) || 'classic').toLowerCase() === 'seafarers' && String((room.rules && room.rules.seafarersScenario) || '').toLowerCase() === 'test_builder';
      if (room.players.length < (allowSolo ? 1 : 2)) {
        sendJson(ws, { type: 'error', error: allowSolo ? 'Need at least 1 player.' : 'Need at least 2 players.' });
        return;
      }
      const ok = startGame(room);
      if (!ok) {
        sendJson(ws, { type: 'error', error: 'Could not start game.' });
        return;
      }
      broadcastRoom(room);
      broadcastState(room);
      return;
    }

    if (msg.type === 'pause_game') {
      if (!room.game || room.game.phase === 'lobby') {
        sendJson(ws, { type: 'error', error: 'No active game.' });
        return;
      }
      if (pid !== room.hostId) {
        sendJson(ws, { type: 'error', error: 'Only host can pause/resume.' });
        return;
      }

      const desired = (msg.paused == null) ? !room.game.paused : !!msg.paused;
      if (desired && !room.game.paused) {
        pauseGame(room.game, pid);
        room.game.message = `Game paused by ${playerName(room.game, pid)}.`;
        pushLog(room.game, `Game paused by ${playerName(room.game, pid)}.`, 'system');
      } else if (!desired && room.game.paused) {
        resumeGame(room.game);
        room.game.message = `Game resumed by ${playerName(room.game, pid)}.`;
        pushLog(room.game, `Game resumed by ${playerName(room.game, pid)}.`, 'system');
      }

      broadcastState(room);
      return;
    }

    if (msg.type === 'query_build_options') {
      if (!room.game) {
        sendJson(ws, { type: 'build_options', targetKind: msg.targetKind, targetId: msg.targetId, options: [] });
        return;
      }
      const game = room.game;
      const targetKind = String(msg.targetKind || '').toLowerCase();
      const targetId = Math.floor(Number(msg.targetId));
      if (!Number.isFinite(targetId)) {
        sendJson(ws, { type: 'build_options', targetKind, targetId: null, options: [] });
        return;
      }

      // Only provide options for the active player and when not paused.
      if (game.paused || !isPlayersTurn(game, pid)) {
        sendJson(ws, { type: 'build_options', targetKind, targetId, options: [] });
        return;
      }

      const candidates = [];
      if (targetKind === 'node') {
        if (targetId >= 0 && targetId < (game.geom?.nodes?.length || 0)) {
          candidates.push({ kind: 'place_settlement', label: 'Settlement', action: { kind: 'place_settlement', nodeId: targetId } });
          candidates.push({ kind: 'upgrade_city', label: 'City', action: { kind: 'upgrade_city', nodeId: targetId } });
        }
      } else if (targetKind === 'edge') {
        if (targetId >= 0 && targetId < (game.geom?.edges?.length || 0)) {
          candidates.push({ kind: 'place_road', label: 'Road', action: { kind: 'place_road', edgeId: targetId } });
          candidates.push({ kind: 'place_ship', label: 'Boat', action: { kind: 'place_ship', edgeId: targetId } });
        }
      }

      const options = [];
      for (const c of candidates) {
        const clonedGame = deepClone(game);
        if (!clonedGame) continue;
        // Dry-run simulation: used only to validate whether an action would be legal.
        // MUST NOT persist history or user stats.
        const tempRoom = { game: clonedGame, _dryRun: true };
        const r = applyAction(tempRoom, pid, c.action);
        if (r && r.ok) options.push({ kind: c.kind, label: c.label });
      }

      sendJson(ws, { type: 'build_options', targetKind, targetId, options });
      return;
    }

    if (msg.type === 'game_action') {
      if (!room.game) {
        sendJson(ws, { type: 'error', error: 'No active game.' });
        return;
      }
      const result = applyAction(room, pid, msg.action);
      if (!result.ok) sendJson(ws, { type: 'error', error: result.error });
      broadcastState(room);
      return;
    }

    if (msg.type === 'get_state') {
      sendJson(ws, { type: 'room', room: roomSnapshot(room) });
      if (room.game) {
        syncTimer(room.game);
        const state = sanitizeStateFor(room.game, pid);
        sendJson(ws, { type: 'state', state });
      } else {
        ensurePreview(room, false);
        const pg = makePreviewGame(room);
        sendJson(ws, { type: 'state', state: sanitizeStateFor(pg, pid) });
      }
      return;
    }
  });

  ws.on('close', () => {
    const uid = ws._userId;
    if (uid && userSockets.get(uid) === ws) userSockets.delete(uid);

    const code = ws._roomCode;
    const pid = ws._playerId;
    if (!code || !pid) return;
    const room = rooms.get(code);
    if (!room) return;
    // Only remove if this socket is still the active one for the player.
    if (room.sockets.get(pid) === ws) room.sockets.delete(pid);
    // keep players list (rejoin not implemented)
    broadcastRoom(room);
  });
});


function handleTimeout(room) {
  const game = room.game;
  if (!game) return false;
  if (game.paused) return false;
  syncTimer(game);
  if (!game.timer) return false;
  if (now() < game.timer.endsAt) return false;

  const phase = game.phase;

  // Setup auto placement
  if (phase === 'setup1-settlement' || phase === 'setup2-settlement') {
    const pid = game.currentPlayerId;
    if (!pid) return false;
    const nodeIds = [];
    const isTTD = ((game.rules?.mapMode || 'classic') === 'seafarers' && (game.rules?.seafarersScenario || 'four_islands') === 'through_the_desert');
    for (let i = 0; i < game.geom.nodes.length; i++) {
      if (!settlementDistanceOk(game, i)) continue;
      if (isTTD && !nodeIsOnTTDStartIsland(game, i)) continue;
      nodeIds.push(i);
    }
    const shuffled = shuffle(nodeIds);
    for (const nid of shuffled) {
      const r = applyAction(room, pid, { kind: 'place_settlement', nodeId: nid });
      if (r && r.ok) break;
    }
    syncTimer(game);
    return true;
  }

  if (phase === 'setup1-road' || phase === 'setup2-road') {
    const pid = game.currentPlayerId;
    if (!pid) return false;
    const awaiting = game.setup && game.setup.awaiting;
    const nid = awaiting && awaiting.playerId === pid ? awaiting.nodeId : null;
    const cand = nid != null ? (game.geom.nodeEdges[nid] || []) : [];
    const edgeIds = shuffle(cand.filter(eid => !game.geom.edges[eid].roadOwner));
    for (const eid of edgeIds) {
      const r = applyAction(room, pid, { kind: 'place_road', edgeId: eid });
      if (r && r.ok) break;
    }
    syncTimer(game);
    return true;
  }

  // Auto roll
  if (phase === 'main-await-roll') {
    const pid = game.currentPlayerId;
    if (!pid) return false;
    applyAction(room, pid, { kind: 'roll_dice' });
    syncTimer(game);
    return true;
  }

  // Auto discard for any pending players
  if (phase === 'discard') {
    // NOTE: Applying discard actions may complete the discard phase and clear game.discard.
    // So we snapshot the required/done maps up front to avoid dereferencing null mid-loop.
    const discard = game.discard;
    const required = discard && discard.required ? discard.required : null;
    const done = discard && discard.done ? discard.done : {};

    if (required) {
      const pending = Object.keys(required).filter(pid => !done[pid]);
      for (const pid of pending) {
        const p = playerById(game, pid);
        if (!p) continue;
        const req = required[pid] || 0;
        const cards = randomDiscardMap(p, req);
        applyAction(room, pid, { kind: 'discard_cards', cards });
      }

      // If something went sideways, force-exit discard.
      if (game.phase === 'discard') {
        game.discard = null;
        game.phase = 'robber-move';
        game.message = `Time expired. Discards auto-completed. ${playerName(game, game.currentPlayerId)} move the robber, then steal 1 random resource.`;
      }
    } else {
      // Defensive: discard phase with missing discard state.
      if (game.phase === 'discard') {
        game.discard = null;
        game.phase = 'robber-move';
        game.message = `Time expired. Discards auto-completed. ${playerName(game, game.currentPlayerId)} move the robber, then steal 1 random resource.`;
      }
    }

    syncTimer(game);
    return true;
  }

  // Auto move robber to a random different (non-sea) tile
  if (phase === 'robber-move') {
    const pid = game.currentPlayerId;
    if (!pid) return false;
    const current = getRobberTileId(game);
    const cands = [];
    for (let i = 0; i < game.geom.tiles.length; i++) {
      const t = game.geom.tiles[i];
      if (i === current) continue;
      if (t.type === 'sea') continue;
      cands.push(i);
    }
    const shuffled = shuffle(cands);
    for (const tid of shuffled) {
      const r = applyAction(room, pid, { kind: 'move_robber', tileId: tid });
      if (r && r.ok) break;
    }
    syncTimer(game);
    return true;
  }

  // Auto choose victim: steal from player with most resources
  if (phase === 'robber-steal') {
    const pid = game.currentPlayerId;
    if (!pid) return false;
    const victims = game.robberSteal?.victims || [];
    const victimId = bestVictimByResources(game, victims);
    if (victimId) applyAction(room, pid, { kind: 'robber_steal', victimId });
    else {
      game.robberContext = null;
    game.thiefChoice = null;
    game.pirateSteal = null;
      game.robberSteal = null;
      game.phase = 'main-actions';
      game.message = `${playerName(game, pid)} may build or end turn.`;
    }
    syncTimer(game);
    return true;
  }

  // Auto end turn on action timer
  if (phase === 'main-actions') {
    const pid = game.currentPlayerId;
    if (!pid) return false;
    applyAction(room, pid, { kind: 'end_turn' });
    syncTimer(game);
    return true;
  }

  // Fallback: reset timer so we don't spin
  game.timer = null;
  syncTimer(game);
  return true;
}

// Timer loop: server-authoritative timeouts (no per-tick broadcasts; clients count down locally)
setInterval(() => {
  for (const room of rooms.values()) {
    if (!room.game) continue;
    if (room.game.phase === 'lobby' || room.game.phase === 'game-over') continue;
    const changed = handleTimeout(room);
    if (changed) broadcastState(room);
  }
}, 250);


setInterval(cleanupRooms, 60_000);

server.listen(PORT, () => {
  console.log(`Hex Settlers server running on http://localhost:${PORT}`);
});
