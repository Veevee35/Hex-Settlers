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
