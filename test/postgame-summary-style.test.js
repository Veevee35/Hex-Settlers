'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const appJs = fs.readFileSync(path.join(projectRoot, 'public', 'app.js'), 'utf8');
const stylesCss = fs.readFileSync(path.join(projectRoot, 'public', 'styles.css'), 'utf8');

test('all postgame summary tabs use the shared player-card visual system', () => {
  assert.match(appJs, /const makePlayerOverviewCard = \(player, options=\{\}\) =>/);
  assert.match(appJs, /const section = makeSection\('Game Overview'\)/);
  assert.match(appJs, /const section = makeSection\('Player Activity'\)/);
  assert.match(appJs, /const section = makeSection\('Dev Cards Overview'\)/);
  assert.match(stylesCss, /\.pgOverviewPlayerGrid\s*\{/);
  assert.match(stylesCss, /\.pgOverviewPlayerCard\s*\{/);
});

test('summary player cards contain only the requested eight breakdown metrics', () => {
  const summaryStart = appJs.indexOf('// -------------------- SUMMARY --------------------');
  const diceStart = appJs.indexOf('// -------------------- DICE --------------------');
  const summary = appJs.slice(summaryStart, diceStart);
  const metricsStart = summary.indexOf('metrics: [');
  const metricsEnd = summary.indexOf('],', metricsStart);
  const metrics = summary.slice(metricsStart, metricsEnd);
  const labels = [...metrics.matchAll(/label: '([^']+)'/g)].map((match) => match[1]);
  assert.deepEqual(labels, [
    'Settlement VP',
    'City VP',
    'Exploration VP',
    'Ships',
    'Roads',
    'Knights Played',
    'Stolen From',
    'Steals',
  ]);
  assert.match(summary, /const explorationVP = safeNum\(p\.newIslandVP\) \+ safeNum\(p\.ttdFarSideVP\)/);
});

test('game overview uses larger cards, metric boxes, and readable text', () => {
  assert.match(appJs, /section\.classList\.add\('pgStyledSection', 'pgGameOverviewSection'\)/);
  assert.match(stylesCss, /\.pgGameOverviewSection \.pgOverviewPlayerGrid\s*\{[^}]*minmax\(280px,/s);
  assert.match(stylesCss, /\.pgGameOverviewSection \.pgOverviewMetric\s*\{[^}]*min-height:64px/s);
  assert.match(stylesCss, /\.pgGameOverviewSection \.pgOverviewMetricLabel\{font-size:9px/);
  assert.match(stylesCss, /\.pgGameOverviewSection \.pgOverviewMetricValue\{font-size:14px/);
});

test('dice keeps all three views and presents rolls as aligned bar charts', () => {
  assert.match(appJs, /mkBtn\('totals', 'View Totals'\)/);
  assert.match(appJs, /mkBtn\('players', 'View Per Player'\)/);
  assert.match(appJs, /mkBtn\('prob', 'View Probability'\)/);
  assert.match(appJs, /chart\.className = `pgDiceChart \$\{postgameState\.diceView\}`/);
  assert.match(stylesCss, /grid-template-columns:repeat\(11,/);
  assert.match(appJs, /segment\.className = 'pgDicePlayerSegment'/);
  assert.match(appJs, /overlay\.className = `pgDiceProbabilityDelta/);
  assert.match(stylesCss, /\.pgDiceProbabilityDelta\.negative\s*\{[^}]*repeating-linear-gradient/s);
});

test('the Game Tools box is hidden in the lobby but remains available in game', () => {
  assert.match(appJs, /ui\.toolsCard\.classList\.toggle\('hidden', !inGame\)/);
  assert.match(appJs, /ui\.toolsCard\.classList\.add\('hudBar', 'hudTopLeft'\)/);
});

test('development-card summaries use full-color game artwork and retain focus controls', () => {
  for (const asset of ['Knight.png', 'VictoryPoint.png', 'RoadBuilding.png', 'Invention.png', 'Monopoly.png']) {
    assert.ok(appJs.includes(`Dev Cards/${asset}`), `${asset} is used in the summary`);
  }
  assert.match(appJs, /makePlayerSelect\('Focus player', 'devFocusId', winnerId\)/);
  assert.match(appJs, /typeGrid\.className = 'pgDevTypeGrid'/);
  assert.doesNotMatch(stylesCss, /\.pgOverviewMetricIcon img\s*\{[^}]*brightness\(0\)/s);
});
