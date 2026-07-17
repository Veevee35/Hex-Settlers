'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(ROOT, 'public', 'app.js'), 'utf8');
const stylesCss = fs.readFileSync(path.join(ROOT, 'public', 'styles.css'), 'utf8');

test('lobby exposes a full rules page next to Create Lobby', () => {
  const actions = indexHtml.match(/<div class="row lobbyPrimaryActions">[\s\S]*?<\/div>/)?.[0] || '';
  assert.match(actions, /id="createBtn"/);
  assert.match(actions, /id="lobbyRulesBtn"/);

  for (const id of ['rulesPage', 'rulesPageTitle', 'rulesPageSubtitle', 'rulesPageCloseBtn', 'rulesPageNav', 'rulesPageContent']) {
    assert.match(indexHtml, new RegExp(`id="${id}"`));
  }
  assert.match(appJs, /lobbyRulesBtn\.addEventListener\('click', openLobbyRulesPage\)/);
  assert.match(appJs, /renderLobbyRulesPage\(\)/);
});

test('rules guide covers every selectable map and Seafarers scenario', () => {
  for (const mapMode of ['classic', 'classic56', 'seafarers', 'seafarers56']) {
    assert.match(indexHtml, new RegExp(`<option value="${mapMode}"`));
  }

  const scenarios = [
    'four_islands',
    'through_the_desert',
    'fog_island',
    'heading_for_new_shores',
    'cartographer_4_manual',
    'cartographer_4_random',
    'test_builder',
    'test_builder_56',
    'six_islands',
    'through_the_desert_56',
    'fog_island_56',
    'cartographer_56_manual',
    'cartographer_56_random',
  ];
  for (const scenario of scenarios) {
    assert.match(indexHtml, new RegExp(`<option value="${scenario}"`));
    assert.match(appJs, new RegExp(`\\n    ${scenario}: \\{`));
  }
});

test('rules guide documents core game functions and responsive page styling', () => {
  const requiredRuleText = [
    'Turn process',
    'Building costs and placement',
    'Development cards',
    'Robber and pirate',
    'Longest Road and Largest Army',
    '10 seconds are added',
    'timer continues while any trade window is open',
    'removed from the player’s Resources tab',
    'all resources in their hand return to the bank',
    'step-by-step replay',
  ];
  for (const text of requiredRuleText) assert.ok(appJs.includes(text), `missing rules text: ${text}`);

  assert.match(stylesCss, /\.rulesPage\s*\{/);
  assert.match(stylesCss, /\.rulesPageLayout\s*\{/);
  assert.match(stylesCss, /@media \(max-width: 900px\)[\s\S]*?\.rulesPageLayout/);
});

test('Test Builder exposes tile and typed-port tools for both board sizes', () => {
  for (const id of ['testToolSelect', 'testBrushSelect', 'testNumberSelect', 'testPortSelect', 'testResetBtn']) {
    assert.match(indexHtml, new RegExp(`id="${id}"`));
  }
  for (const kind of ['generic', 'brick', 'lumber', 'wool', 'grain', 'ore', 'remove']) {
    assert.match(indexHtml, new RegExp(`<option value="${kind}"`));
  }
  assert.match(appJs, /send\(\{ type: 'edit_preview_port', edgeId, portKind \}\)/);
  assert.match(appJs, /scenario === 'test_builder' \|\| scenario === 'test_builder_56'/);
});

test('all Seafarers scenarios expose the exploration victory-point toggle', () => {
  assert.match(indexHtml, /id="explorationPointsRow"/);
  assert.match(indexHtml, /id="explorationPointsToggle"[^>]*type="checkbox"[^>]*checked/);
  assert.match(appJs, /explorationPointsEnabled: ui\.explorationPointsToggle \? !!ui\.explorationPointsToggle\.checked : true/);
  assert.match(appJs, /Exploration victory points are disabled for this game/);
});

test('Cartographer placement highlights treat outer land edges as open ocean', () => {
  assert.match(appJs, /function rulesTreatOuterBoundaryAsSeaForShipsClient\(\)/);
  assert.match(appJs, /rawAdj\.length === 1 && rulesTreatOuterBoundaryAsSeaForShipsClient\(\)/);
});


test('Fog Island rules describe the enabled exploration settlement bonus', () => {
  assert.match(appJs, /newly revealed land mass after setup awards 2 bonus victory points/);
  assert.doesNotMatch(appJs, /Fog Island does not award the normal 2-point new-island settlement bonus/);
  assert.doesNotMatch(appJs, /There is no new-island settlement bonus/);
});
