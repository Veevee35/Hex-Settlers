'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  RESOURCE_LOSS_SOURCES,
  applyResourceDelta,
  applyResourceOpportunityLoss,
  ensurePlayerResourceStats,
} = require('../server/resource-summary');

const projectRoot = path.resolve(__dirname, '..');
const appJs = fs.readFileSync(path.join(projectRoot, 'public', 'app.js'), 'utf8');
const stylesCss = fs.readFileSync(path.join(projectRoot, 'public', 'styles.css'), 'utf8');
const serverJs = fs.readFileSync(path.join(projectRoot, 'server.js'), 'utf8');

test('resource summary separates actual deltas by source and turn', () => {
  const stats = ensurePlayerResourceStats({});
  applyResourceDelta(stats, { grain: 2, ore: -1 }, 'production', 4);
  applyResourceDelta(stats, { wool: 1, brick: -3 }, 'trade', 4);

  assert.equal(stats.gainedBySource.production.grain, 2);
  assert.equal(stats.gainedBySource.trade.wool, 1);
  assert.equal(stats.lostBySource.trade.brick, 3);
  assert.equal(stats.lostBySource.production.ore, 1);
  assert.deepEqual(stats.byTurn[4], { brick: -3, lumber: 0, wool: 1, grain: 2, ore: -1 });
});

test('blocked production is an opportunity loss without changing hand deltas', () => {
  const stats = ensurePlayerResourceStats({});
  applyResourceOpportunityLoss(stats, { lumber: 2 }, 'blocked');

  assert.equal(stats.lostBySource.blocked.lumber, 2);
  assert.equal(stats.lost.lumber, 0);
  assert.deepEqual(stats.byTurn, {});
});

test('legacy resource summaries gain the new loss buckets without losing old data', () => {
  const stats = ensurePlayerResourceStats({ lostBySource: { dev: { ore: 3 } } });
  assert.equal(stats.lostBySource.dev.ore, 3);
  assert.equal(stats.lostBySource.monopoly.ore, 0);
  assert.equal(stats.lostBySource.blocked.ore, 0);
  assert.ok(RESOURCE_LOSS_SOURCES.includes('dev'));
});

test('resources overview exposes the ten requested toggles in order', () => {
  const labels = [
    'Resources gained from dice rolls',
    'Resources gained from robber and pirate',
    'Resources gained from Monopolies and Years of Plenty',
    'Resources gained from trading',
    'Spent resources',
    'Resources lost to 7 rolls',
    'Resources lost to blocked production',
    'Resources lost to trading',
    'Resources lost to stealing',
    'Resources lost from Monopolies',
  ];
  let previous = -1;
  for (const label of labels) {
    const position = appJs.indexOf(`label: '${label}'`);
    assert.ok(position > previous, `${label} appears in the requested order`);
    previous = position;
  }
  assert.match(appJs, /button\.dataset\.resourceCategory = category\.key/);
  assert.match(appJs, /button\.setAttribute\('aria-pressed', String\(enabled\)\)/);
});

test('resources overview compares gained and lost resources in separate full-color lanes', () => {
  assert.match(appJs, /\{ direction: 'gain', label: 'Gained', values: summary\.gained/);
  assert.match(appJs, /\{ direction: 'loss', label: 'Lost', values: summary\.lost/);
  assert.match(appJs, /image\.src = getTextureAssetUrl\(`Ports\/\$\{key\}\.png`\)/);
  assert.match(stylesCss, /\.pgResPlayerLanes\s*\{[^}]*grid-template-columns:repeat\(2,/s);
  assert.doesNotMatch(stylesCss, /\.pgResStackBlock img\s*\{[^}]*brightness\(0\)/s);
});

test('development purchases count as spent and Monopoly victims use their own loss source', () => {
  assert.match(serverJs, /payCostStats\(game, playerId, p\.resources, DEV_CARD_COST, 'build'\)/);
  assert.match(serverJs, /recordResourceDelta\(game, op\.id, \{ \[rk\]: -n \}, 'monopoly'\)/);
  assert.match(serverJs, /recordBlockedProduction\(game, b\.owner, \{ \[resKind\]: b\.type === 'city' \? 2 : 1 \}\)/);
});
