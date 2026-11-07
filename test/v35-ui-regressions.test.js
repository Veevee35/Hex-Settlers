'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const root = join(__dirname, '..');
const html = readFileSync(join(root, 'public/index.html'), 'utf8');
const css = readFileSync(join(root, 'public/styles.css'), 'utf8');
const app = readFileSync(join(root, 'public/app.js'), 'utf8');

test('desktop mode choices are 3 columns while mobile choice cards are compact', () => {
  assert.match(css, /\.modeChoices\s*\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /#playModeScreen \.modeLogo\s*\{position:absolute;left:12px;top:11px;width:78px/);
  assert.match(css, /#playModeScreen \.modeChoices\s*\{grid-template-columns:1fr/);
  for (const name of ['rankedModeBtn','unrankedModeBtn','casualModeBtn']) assert.match(html, new RegExp(`id="${name}"`));
});

test('casual pre-lobby does not show room code; neither pre-lobby shows game panel splitter', () => {
  assert.match(html, /id="roomCodeLabel"/);
  assert.match(css, /body\.casual-mode:not\(\.in-game\) #roomCodeLabel/);
  assert.match(css, /body\.uncreated-lobby:not\(\.in-game\) \.lobbyPanelSplitter\s*\{display:none!important/);
});

test('lobby board resizes by repaint instead of clearing and receives a ResizeObserver', () => {
  const fn = app.slice(app.indexOf('function setLobbyPanelWidth('), app.indexOf('setLobbyPanelWidth(lobbySplitWidth);'));
  assert.match(fn, /render\(\)/);
  assert.doesNotMatch(fn, /try\s*\{\s*resizeCanvas\(\)/);
  assert.match(app, /new ResizeObserver\(\(\) => \{[\s\S]*?render\(\)/);
});

test('load settings template sits next to save and invokes the existing apply routine', () => {
  assert.match(html, /id="saveRulesBtn"[\s\S]{0,200}id="loadRulesBtn"/);
  assert.match(app, /function openLoadRulesTemplateDialog\(\)/);
  assert.match(app, /applyRulesTemplate\(template\); closeModal\(\)/);
  assert.match(app, /\$\('loadRulesBtn'\)\?\.addEventListener\('click', openLoadRulesTemplateDialog\)/);
  assert.match(app, /\$\('loadRulesBtn'\)\) \$\('loadRulesBtn'\)\.disabled = !isHost/);
});

test('replay toolbar is placed below the measured HUD, not under it', () => {
  assert.match(css, /top:var\(--replay-controls-top,94px\)/);
  assert.match(app, /function positionHistoryReplayBar\(\)/);
  assert.match(app, /hudRect\.bottom - boardRect\.top \+ 12/);
  assert.match(app, /requestAnimationFrame\(positionHistoryReplayBar\)/);
});

test('CSS, JS and service worker share the v35 asset revision', () => {
  const sw = readFileSync(join(root, 'public/sw.js'),'utf8');
  assert.ok(html.includes('styles.css?v=features-v35'));
  assert.ok(html.includes('app.js?v=features-v35'));
  assert.ok(sw.includes('features-v35'));
  assert.ok(app.includes("ASSET_CACHE_SW_BUILD = 'features-v35'"));
});
