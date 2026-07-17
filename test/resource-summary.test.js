'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  RESOURCE_GAIN_SOURCES,
  RESOURCE_LOSS_SOURCES,
  applyResourceDelta,
  applyResourceOpportunityLoss,
  blockedProductionByPlayer,
  ensurePlayerResourceStats,
  ensureResourceStatsForPlayers,
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
  assert.deepEqual(stats.byTurn[4], { brick: -3, lumber: 0, wool: 1, grain: 2, ore: -1, gold: 0 });
});

test('Gold Field picks retain their selected cards in a distinct production source', () => {
  const stats = ensurePlayerResourceStats({});
  applyResourceDelta(stats, { grain: 1, ore: 1 }, 'gold_production', 5);

  assert.equal(stats.gainedBySource.gold_production.grain, 1);
  assert.equal(stats.gainedBySource.gold_production.ore, 1);
  assert.equal(stats.gainedBySource.production.grain, 0);
  assert.ok(RESOURCE_GAIN_SOURCES.includes('gold_production'));
});

test('blocked production is an opportunity loss without changing hand deltas', () => {
  const stats = ensurePlayerResourceStats({});
  applyResourceOpportunityLoss(stats, { lumber: 2 }, 'blocked');

  assert.equal(stats.lostBySource.blocked.lumber, 2);
  assert.equal(stats.lost.lumber, 0);
  assert.deepEqual(stats.byTurn, {});
});

test('robber-blocked tiles count each adjacent settlement and city as lost production', () => {
  const tile = { robber: true, cornerNodeIds: [0, 1, 2, 3] };
  const nodes = [
    { building: { owner: 'red', type: 'settlement' } },
    { building: { owner: 'blue', type: 'city' } },
    { building: { owner: 'red', type: 'city' } },
    { building: null },
  ];

  assert.deepEqual(blockedProductionByPlayer(tile, nodes, 'grain'), {
    red: { brick: 0, lumber: 0, wool: 0, grain: 3, ore: 0, gold: 0 },
    blue: { brick: 0, lumber: 0, wool: 0, grain: 2, ore: 0, gold: 0 },
  });
  assert.deepEqual(blockedProductionByPlayer(tile, nodes, 'gold'), {
    red: { brick: 0, lumber: 0, wool: 0, grain: 0, ore: 0, gold: 3 },
    blue: { brick: 0, lumber: 0, wool: 0, grain: 0, ore: 0, gold: 2 },
  });
  assert.deepEqual(blockedProductionByPlayer({ ...tile, robber: false }, nodes, 'grain'), {});
});

test('restored games backfill blocked-production buckets for every current player', () => {
  const stats = {
    resources: {
      byPlayer: {
        red: { gained: { grain: 4 }, lostBySource: { trade: { ore: 2 } } },
      },
    },
  };

  ensureResourceStatsForPlayers(stats, [{ id: 'red' }, { id: 'blue' }]);
  assert.equal(stats.resources.byPlayer.red.gained.grain, 4);
  assert.equal(stats.resources.byPlayer.red.lostBySource.trade.ore, 2);
  assert.equal(stats.resources.byPlayer.red.lostBySource.blocked.grain, 0);
  assert.equal(stats.resources.byPlayer.red.lostBySource.blocked.gold, 0);
  assert.equal(stats.resources.byPlayer.blue.lostBySource.blocked.grain, 0);

  applyResourceOpportunityLoss(stats.resources.byPlayer.blue, { grain: 2 }, 'blocked');
  assert.equal(stats.resources.byPlayer.blue.lostBySource.blocked.grain, 2);
});

test('legacy resource summaries gain the new loss buckets without losing old data', () => {
  const stats = ensurePlayerResourceStats({ lostBySource: { dev: { ore: 3 } } });
  assert.equal(stats.lostBySource.dev.ore, 3);
  assert.equal(stats.lostBySource.monopoly.ore, 0);
  assert.equal(stats.lostBySource.blocked.ore, 0);
  assert.equal(stats.lostBySource.blocked.gold, 0);
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
  assert.match(appJs, /image\.src = key === 'gold' \? '\/assets\/gold-resource\.png' : getTextureAssetUrl\(`Ports\/\$\{key\}\.png`\)/);
  assert.match(stylesCss, /\.pgResPlayerLanes\s*\{[^}]*grid-template-columns:repeat\(2,/s);
  assert.doesNotMatch(stylesCss, /\.pgResStackBlock img\s*\{[^}]*brightness\(0\)/s);
});

test('resources overview can display Gold Field production and blocked Gold with the supplied icon', () => {
  assert.match(appJs, /sources: \['production', 'gold_production'\]/);
  assert.match(appJs, /source === 'gold_production' && postgameState\.showGoldProductionAsGold/);
  assert.match(appJs, /goldModeCheckbox\.type = 'checkbox'/);
  assert.match(appJs, /Show Gold Field production as Gold/);
  assert.match(appJs, /goldModeIcon\.src = '\/assets\/gold-resource\.png'/);
  assert.match(stylesCss, /\.pgResStackBlock\.gold\{/);
  assert.match(serverJs, /const blockedKind = isGold \? 'gold' : resKind/);
  assert.match(serverJs, /grantFromBankStats\(game, playerId, p\.resources, rk, 1, 'gold_production'\)/);
  assert.ok(fs.existsSync(path.join(projectRoot, 'public', 'assets', 'gold-resource.png')));
});

test('development purchases count as spent and Monopoly victims use their own loss source', () => {
  assert.match(serverJs, /payCostStats\(game, playerId, p\.resources, DEV_CARD_COST, 'build'\)/);
  assert.match(serverJs, /recordResourceDelta\(game, op\.id, \{ \[rk\]: -n \}, 'monopoly'\)/);
  assert.match(serverJs, /const blocked = blockedProductionByPlayer\(t, game\.geom\.nodes, blockedKind\)/);
  assert.match(serverJs, /recordBlockedProduction\(game, playerId, losses\)/);
});

test('resource overview uses one shared proportional stack scale that is stable when Gold display changes', () => {
  assert.match(appJs, /const maxStackMagnitude = Math\.max\(1, \.\.\.resourceSummaries\.flatMap/);
  assert.match(appJs, /const maxVisualStackHeight = Math\.max\(320, Math\.min\(560,/);
  assert.match(appJs, /Math\.round\(\(laneSpec\.total \/ maxStackMagnitude\) \* maxVisualStackHeight\)/);
  assert.match(appJs, /stack\.style\.height = `\$\{stackHeight\}px`/);
  assert.match(appJs, /block\.style\.flexGrow = String\(value\)/);
  assert.match(appJs, /Gold mode only[\s\S]*cannot alter a lane's[\s\S]*total visual height/);
  assert.doesNotMatch(appJs, /const height = 34 \+ Math\.round\(\(value \/ maxStackMagnitude\)/);
  assert.match(stylesCss, /\.pgResPlayerStack\s*\{[^}]*align-self:end;[^}]*max-height:var\(--pg-res-stack-ceiling/s);
  assert.match(stylesCss, /\.pgResStackBlock\s*\{[^}]*min-height:0;/s);
});
