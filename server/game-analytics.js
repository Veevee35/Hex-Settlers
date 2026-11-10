'use strict';

// Non-invasive, aggregate game telemetry. No IP addresses, tokens or chat text.
// Five-minute samples are retained for seven days and hourly samples for 90 days.
// Distinct online account IDs are held only for rolling unique-user counts.
const fs = require('node:fs');
const crypto = require('node:crypto');
const { CoalescingJsonFileWriter } = require('./persistence');
const FIVE_MINUTES = 5 * 60_000;
const HOUR = 60 * 60_000;
const DAY = 24 * HOUR;
const DAYS = 90;
const FIELDS = Object.freeze([
  'onlineAccounts', 'webSockets', 'playingHumans', 'connectedPlayers', 'spectators',
  'aiSeats', 'rankedQueue', 'waitingLobbies', 'activeGames', 'pausedGames',
  'finishedRooms', 'totalRooms', 'publicLobbies', 'privateLobbies',
  'rankedRooms', 'unrankedRooms', 'casualRooms', 'dailyRooms', 'weeklyRooms',
]);
const DAY_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit',
});
function dayId(at) {
  const parts = DAY_FORMATTER.formatToParts(new Date(at));
  const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}
function modeForRoom(room) {
  if (room?.challenge?.kind === 'daily') return 'daily';
  if (room?.challenge) return 'weekly';
  return room?.ranked ? 'ranked' : room?.casual ? 'casual' : 'unranked';
}
function newMetrics() { return Object.fromEntries(FIELDS.map(name => [name, 0])); }
function normalizeSample(source) {
  const sample = { at: Number(source?.at || 0) };
  for (const name of FIELDS) sample[name] = Math.max(0, Number(source?.[name]) || 0);
  return sample;
}
function rangeMs(range) {
  return ({ day: DAY, week: 7 * DAY, month: 30 * DAY, quarter: 90 * DAY })[range] || DAY;
}
function historyMode(game) {
  return game?.challenge ? (game.challenge.kind === 'daily' ? 'daily' : 'weekly')
    : game?.ranked ? 'ranked' : game?.casual ? 'casual' : 'unranked';
}
function historySummary(games, since, at) {
  const entries = (Array.isArray(games) ? games : []).filter(game =>
    game && typeof game === 'object' && game.snapshot?.phase === 'game-over' &&
    Number(game.endedAt) >= since && Number(game.endedAt) <= at &&
    Array.isArray(game.players) && String(game.roomCode || '').length >= 3);
  const modes = { ranked: 0, unranked: 0, casual: 0, daily: 0, weekly: 0 };
  const scenarioCounts = new Map();
  const players = new Set();
  const dailyGames = new Map();
  let totalDuration = 0, durationCount = 0, totalTurns = 0, turnCount = 0, totalVp = 0;
  for (const entry of entries) {
    modes[historyMode(entry)]++;
    const label = entry.challenge ? `${historyMode(entry)} challenge` :
      entry.rules?.mapMode === 'seafarers' ? String(entry.rules.seafarersScenario || 'Seafarers').replaceAll('_',' ') :
      String(entry.rules?.mapMode || 'Classic').replaceAll('_',' ');
    scenarioCounts.set(label, (scenarioCounts.get(label) || 0) + 1);
    const day = dayId(entry.endedAt);
    dailyGames.set(day, (dailyGames.get(day) || 0) + 1);
    for (const player of entry.players || []) if (player?.id && !/^ai[_-]/i.test(String(player.id)) && !player.isAI) players.add(String(player.id));
    const duration = Number(entry.endedAt) - Number(entry.startedAt);
    if (Number.isFinite(duration) && duration >= 0 && duration <= 14 * DAY) { durationCount++; totalDuration += duration; }
    const turns = Number(entry.turns);
    if (Number.isFinite(turns) && turns > 0) { turnCount++; totalTurns += turns; }
    for (const player of entry.players || []) totalVp += Math.max(0, Number(player?.vp) || 0);
  }
  return {
    completed: entries.length, byMode: modes, uniqueParticipants: players.size,
    averageMinutes: durationCount ? Math.round(totalDuration / durationCount / 60000 * 10) / 10 : null,
    averageTurns: turnCount ? Math.round(totalTurns / turnCount * 10) / 10 : null,
    totalVictoryPoints: Math.round(totalVp),
    topScenarios: [...scenarioCounts].sort((a,b) => b[1] - a[1]).slice(0, 8).map(([name, games]) => ({ name, games })),
    dailyGames: Object.fromEntries(dailyGames),
  };
}

class GameAnalytics {
  constructor(filePath, { writer = null, now = Date.now } = {}) {
    this.filePath = filePath;
    this.writer = writer || new CoalescingJsonFileWriter(filePath, { space: 0 });
    this.now = now;
    this.samples = [];
    this.hourly = [];
    this.dailyUsers = new Map();
    this.lastSeenByUser = new Map(); // pseudonymous ID -> most recent authenticated connection
    this.startedCollectingAt = this.now();
    this.load();
  }
  load() {
    if (!this.filePath) return;
    try {
      if (!fs.existsSync(this.filePath)) return;
      const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      if (!parsed || parsed.version !== 1) return;
      this.samples = (Array.isArray(parsed.samples) ? parsed.samples : []).filter(x => Number.isFinite(x?.at)).map(normalizeSample);
      this.hourly = (Array.isArray(parsed.hourly) ? parsed.hourly : []).filter(x => Number.isFinite(x?.at)).map(normalizeSample);
      for (const [date, ids] of Object.entries(parsed.dailyUsers || {})) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(date) && Array.isArray(ids))
          this.dailyUsers.set(date, new Set(ids.filter(id => typeof id === 'string' && id.length <= 120)));
      }
      for (const [id, at] of Object.entries(parsed.lastSeenByUser || {})) {
        if (/^[a-f0-9]{24}$/.test(id) && Number.isFinite(Number(at))) this.lastSeenByUser.set(id, Number(at));
      }
      this.startedCollectingAt = Number(parsed.startedCollectingAt) || this.startedCollectingAt;
      this.prune(this.now());
    } catch (error) { console.warn('[analytics] Could not load historical telemetry:', error.message); }
  }
  markUser(userId, at = this.now()) {
    const id = String(userId || '').trim();
    if (!id || id.length > 120) return;
    const key = dayId(at);
    if (!this.dailyUsers.has(key)) this.dailyUsers.set(key, new Set());
    // Stable pseudonymous ID: enough for distinct-account counting across days,
    // without placing game account identifiers in the analytics archive.
    const hashed = crypto.createHash('sha256').update(id).digest('hex').slice(0, 24);
    this.dailyUsers.get(key).add(hashed);
    this.lastSeenByUser.set(hashed, Math.max(Number(this.lastSeenByUser.get(hashed) || 0), at));
  }
  markOnline(ids, at = this.now()) { for (const id of ids) this.markUser(id, at); }
  prune(at = this.now()) {
    this.samples = this.samples.filter(s => s.at >= at - 7 * DAY);
    this.hourly = this.hourly.filter(s => s.at >= at - DAYS * DAY);
    const earliest = dayId(at - (DAYS + 2) * DAY);
    for (const day of this.dailyUsers.keys()) if (day < earliest) this.dailyUsers.delete(day);
    for (const [id, last] of this.lastSeenByUser) if (last < at - DAYS * DAY) this.lastSeenByUser.delete(id);
  }
  capture(values, at = this.now()) {
    const bucket = Math.floor(at / FIVE_MINUTES) * FIVE_MINUTES;
    const sample = normalizeSample({ ...values, at: bucket });
    const last = this.samples[this.samples.length - 1];
    if (last?.at === bucket) {
      // Preserve short-lived concurrency peaks within the current five-minute slot.
      for (const name of FIELDS) last[name] = Math.max(last[name], sample[name]);
      return false;
    }
    this.samples.push(sample);
    const hourBucket = Math.floor(at / HOUR) * HOUR;
    const h = this.hourly[this.hourly.length - 1];
    if (h?.at === hourBucket) {
      for (const name of FIELDS) h[name] = Math.max(h[name], sample[name]);
    } else this.hourly.push({ ...sample, at: hourBucket });
    this.prune(at);
    return true;
  }
  async save() {
    this.prune(this.now());
    const dailyUsers = Object.fromEntries([...this.dailyUsers].map(([day, ids]) => [day, [...ids]]));
    return this.writer.write({ version: 1, startedCollectingAt: this.startedCollectingAt, samples: this.samples,
      hourly: this.hourly, dailyUsers, lastSeenByUser: Object.fromEntries(this.lastSeenByUser) });
  }
  async flush() { await this.writer.flush(); }
  uniqueAccounts(since, at) {
    let count = 0;
    for (const last of this.lastSeenByUser.values()) if (last >= since && last <= at) count++;
    return count;
  }
  report({ range = 'day', at = this.now(), live = newMetrics(), games = [], users = [] } = {}) {
    const duration = rangeMs(range), since = at - duration;
    const history = historySummary(games, since, at);
    const source = duration <= 7 * DAY ? this.samples : this.hourly;
    const series = source.filter(s => s.at >= since && s.at <= at).map(s => ({ ...s }));
    // The last point is always live (and does not overwrite the stored peaks).
    series.push(normalizeSample({ ...live, at }));
    const peaks = {};
    for (const field of ['onlineAccounts', 'webSockets', 'playingHumans', 'activeGames', 'waitingLobbies', 'rankedQueue'])
      peaks[field] = Math.max(...series.map(s => s[field]), 0);
    const days = [];
    const seenDays = new Set();
    for (let t = since; t <= at; t += DAY) {
      const key = dayId(t);
      if (!seenDays.has(key)) { seenDays.add(key); days.push(key); }
    }
    const last = dayId(at);
    if (!seenDays.has(last)) days.push(last);
    const created = new Map();
    for (const user of users) {
      const creation = Number(user?.createdAt);
      if (Number.isFinite(creation) && creation >= since && creation <= at) {
        const key = dayId(creation);
        created.set(key, (created.get(key) || 0) + 1);
      }
    }
    return {
      range, sampledAt: at, startedCollectingAt: this.startedCollectingAt,
      timezone: 'America/Chicago', sampleIntervalMinutes: 5,
      dataCoverage: { firstFiveMinuteSample: this.samples[0]?.at || null, firstHourlySample: this.hourly[0]?.at || null },
      live: normalizeSample({ ...live, at }), peaks, uniqueAccounts: this.uniqueAccounts(since, at),
      registeredAccounts: users.length, newAccounts: [...created.values()].reduce((a,b) => a+b,0),
      history, series, daily: days.map(day => ({ day, activeUsers: this.dailyUsers.get(day)?.size || 0,
        completedGames: history.dailyGames[day] || 0, newAccounts: created.get(day) || 0 })),
    };
  }
}
module.exports = { GameAnalytics, FIELDS, modeForRoom, historySummary, rangeMs, dayId, newMetrics };
