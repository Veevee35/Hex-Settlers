'use strict';

const crypto = require('crypto');
const { DEFAULT_RULES } = require('./game-rules');

// Every challenge rotates at 01:00 Monday in America/Chicago, including DST.
// The id is the local calendar date of the Monday which began the challenge.
function challengeWeekId(timestamp = Date.now()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit',
    weekday: 'short', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map(p => [p.type, p.value]));
  const localDate = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day));
  const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(values.weekday);
  const monday = localDate - ((dow + 6) % 7) * 86400000 - (dow === 1 && Number(values.hour) < 1 ? 7 * 86400000 : 0);
  return new Date(monday).toISOString().slice(0, 10);
}

function challengeRules(playerCount) {
  const n = Number(playerCount);
  if (!Number.isInteger(n) || n < 4 || n > 8) throw new RangeError('Challenge Maps support 4–8 players.');
  const seafarersScenario = n === 4 ? 'cartographer_4_random'
    : n <= 6 ? 'cartographer_56_random' : `scattered_tiles_78_${n}`;
  return {
    ...DEFAULT_RULES, mapMode: 'seafarers', seafarersScenario,
    playerCount: n, diceAlgorithm: 'balanced', randomMapAtStart: false,
    customMap: false, victoryPointsToWin: n === 4 ? 12 : 14,
  };
}

function seededRandom(weekId, playerCount) {
  const seed = crypto.createHash('sha256').update(`hex-settlers-challenge-maps-v1:${weekId}:${playerCount}`).digest().readUInt32LE(0);
  let s = seed >>> 0;
  return function next() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Map generators are synchronous. Temporarily supply a seeded RNG and restore
// it in finally so other game processes use normal randomness.
function generateWeeklyMap(weekId, playerCount, generate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(weekId))) throw new Error('Invalid challenge week.');
  const rules = challengeRules(playerCount);
  const original = Math.random;
  Math.random = seededRandom(weekId, playerCount);
  try { return generate(rules); }
  finally { Math.random = original; }
}

module.exports = { challengeWeekId, challengeRules, generateWeeklyMap };
