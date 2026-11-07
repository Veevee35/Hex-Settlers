'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../public/styles.css'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
const sw = fs.readFileSync(path.join(__dirname, '../public/sw.js'), 'utf8');

test('resource counts render as an accessible overlaid badge above the icon', () => {
  const render = app.match(/function makeResCell\(k, v\)\s*\{([\s\S]*?)\n    \}/);
  assert.ok(render, 'resource cell renderer exists');
  assert.match(render[1], /role', 'img'/);
  assert.match(render[1], /aria-label/);
  assert.ok(render[1].indexOf('cell.appendChild(img)') < render[1].indexOf('cell.appendChild(val)'), 'count is above art');
  assert.match(css, /body\.in-game \.resCell \.resVal[\s\S]*?background:rgba\(6,15,25,\.92\)/);
  assert.match(css, /body\.in-game \.resCell \.resIcon[\s\S]*?width:clamp\(38px/);
});

test('desktop collapsed sidebar exposes a draggable, live Resources window', () => {
  assert.match(app, /function syncFloatingResourcesPanel\(/);
  assert.match(app, /content\.appendChild\(ui\.resourcesCard\)/);
  assert.match(app, /content\.appendChild\(ui\.rightSidebarResourcesDock\)/);
  assert.match(app, /makeDraggablePanel\(panel, header, 'hexsettlers_floating_resources_pos_v1'\)/);
  assert.match(app, /syncFloatingResourcesPanel\(true\)/);
  assert.match(app, /syncFloatingResourcesPanel\(false\)/);
  assert.match(css, /body\.in-game\.gamePanelsCollapsed \.floatingResourcesPanel:not\(\.hidden\)/);
  assert.match(app, /inGame && !isMobileGameSplit\(\) && !gamePanelsExpanded/);
});

test('bottom bar scaling also updates standalone roll and end turn buttons', () => {
  assert.match(app, /String\(scaleId \|\| ''\) === 'turn_bar'/);
  assert.match(app, /'--turn-button-scale'/);
  assert.match(css, /#rollDockBtn,[\s\S]*?#endDockBtn[\s\S]*?--turn-button-scale/);
});

test('v30 has consistent cache bust keys for all deployed entry points', () => {
  assert.match(html, /styles\.css\?v=mobile-lobby-friends-v30/);
  assert.match(html, /app\.js\?v=mobile-lobby-friends-v30/);
  assert.match(app, /ASSET_CACHE_SW_BUILD = 'mobile-lobby-friends-v30'/);
  assert.match(sw, /CACHE_NAME = CACHE_PREFIX \+ 'mobile-lobby-friends-v30'/);
});
