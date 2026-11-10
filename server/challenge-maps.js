'use strict';

const crypto = require('crypto');
const { DEFAULT_RULES } = require('./game-rules');

const TIME_ZONE = 'America/Chicago';
const CHALLENGE_COUNTS = Object.freeze([4, 5, 6, 7, 8]);
// Each family supports all five capacities. Scattered Tiles retains the
// existing random-scatter engine IDs for 4–6 seats, but the distinct manual
// Cartographer scenario is never selected.
const FAMILIES = Object.freeze(['classic', 'islands', 'desert', 'fog', 'scattered']);

function chicagoParts(timestamp = Date.now()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    weekday: 'short', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(timestamp));
  return Object.fromEntries(parts.map(part => [part.type, part.value]));
}

function challengeDayId(timestamp = Date.now()) {
  const p = chicagoParts(timestamp);
  const local = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day));
  return new Date(local - (Number(p.hour) < 1 ? 86400000 : 0)).toISOString().slice(0, 10);
}

function challengeWeekId(timestamp = Date.now()) {
  const id = challengeDayId(timestamp);
  const local = new Date(`${id}T00:00:00.000Z`);
  const daysSinceMonday = (local.getUTCDay() + 6) % 7;
  return new Date(local.getTime() - daysSinceMonday * 86400000).toISOString().slice(0, 10);
}

function challengePeriodId(kind, timestamp = Date.now()) {
  if (kind === 'daily') return challengeDayId(timestamp);
  if (kind === 'weekly') return challengeWeekId(timestamp);
  throw new RangeError('Unknown challenge period');
}

function deterministicRandom(seedText) {
  let state = crypto.createHash('sha256').update(seedText).digest().readUInt32LE(0);
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function challengeScenario(kind, periodId) {
  if (!['daily', 'weekly'].includes(kind) || !/^\d{4}-\d{2}-\d{2}$/.test(periodId)) throw new Error('Invalid challenge period.');
  const rng = deterministicRandom(`hex-settlers-challenge-scenario-v2:${kind}:${periodId}`);
  return FAMILIES[Math.floor(rng() * FAMILIES.length)];
}

function challengeRules(playerCount, family = 'classic') {
  const n = Number(playerCount);
  if (!CHALLENGE_COUNTS.includes(n)) throw new RangeError('Challenge Maps support 4–8 players.');
  if (!FAMILIES.includes(family)) throw new RangeError('Unknown challenge map scenario');
  const big = n >= 7;
  let mapMode = big ? 'classic78' : n >= 5 ? 'classic56' : 'classic';
  let seafarersScenario = 'four_islands';
  if (family !== 'classic') {
    mapMode = 'seafarers';
    seafarersScenario = big
      ? ({ islands: 'eight_islands_78', desert: 'through_the_desert_78', fog: 'fog_island_78', scattered: `scattered_tiles_78_${n}` })[family]
      : n >= 5
        ? ({ islands: 'six_islands', desert: 'through_the_desert_56', fog: 'fog_island_56', scattered: 'cartographer_56_random' })[family]
        : ({ islands: 'four_islands', desert: 'through_the_desert', fog: 'fog_island', scattered: 'cartographer_4_random' })[family];
  }
  return {
    ...DEFAULT_RULES, mapMode, seafarersScenario,
    playerCount: n, diceAlgorithm: 'balanced', randomMapAtStart: false,
    customMap: false, victoryPointsToWin: family === 'classic' ? (n <= 4 ? 10 : n <= 6 ? 12 : 14) : (n === 4 ? 12 : 14),
    explorationPointsEnabled: family !== 'fog',
  };
}

// RNG scope is intentionally synchronous and restored before returning.
function generateChallengeMap(kind, periodId, playerCount, generate) {
  const family = challengeScenario(kind, periodId);
  const rules = challengeRules(playerCount, family);
  const original = Math.random;
  Math.random = deterministicRandom(`hex-settlers-challenge-geom-v2:${kind}:${periodId}:${playerCount}:${family}`);
  try { return generate(rules); }
  finally { Math.random = original; }
}
function generateWeeklyMap(weekId, playerCount, generate) {
  return generateChallengeMap('weekly', weekId, playerCount, generate);
}

module.exports = { TIME_ZONE, CHALLENGE_COUNTS, FAMILIES, challengeDayId, challengeWeekId,
  challengePeriodId, challengeScenario, challengeRules, generateChallengeMap, generateWeeklyMap };
