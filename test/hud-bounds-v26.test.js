'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const css = fs.readFileSync(path.join(__dirname, '..', 'public', 'styles.css'), 'utf8');
const js = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');

test('roll/end dock is above the measured bottom bar instead of a fixed guess', () => {
  assert.match(js, /function syncTurnBarHeight\(\)/);
  assert.match(js, /ui\.turnCard\.getBoundingClientRect\(\)\.height/);
  assert.match(js, /--hud-bottom-bar-height/);
  assert.match(css, /bottom:calc\(var\(--hud-bottom-bar-height, 54px\) \+ 8px\)!important/);
});
test('top bar reserves space for orb and scale controls while tools scroll', () => {
  assert.match(css, /body\.in-game \.hudTopLeft \.hudBarRow\s*\{\s*zoom:1!important/);
  assert.match(css, /body\.in-game \.hudTopLeft \.hudBtns\s*\{[\s\S]*?overflow-x:auto!important/);
  assert.match(css, /body\.in-game \.hudTopLeft \.hudBarScaleHost \{flex:0 0 auto!important/);
});
test('mobile Build dropdown and proxy buttons are gone, without removing node building actions', () => {
  assert.doesNotMatch(js, /mobileBuildMenuToggle|mobileBuildMenu/);
  assert.doesNotMatch(css, /mobileBuildMenuToggle|mobileBuildMenu/);
  assert.match(js, /ui\.buildRoadBtn/);
  assert.match(js, /ui\.buildSettlementBtn/);
});
test('clock drag bounds are calculated from the board and its top and bottom controls', () => {
  assert.match(js, /function draggablePanelBounds\(/);
  assert.match(js, /topBar\.bottom \+ pad/);
  assert.match(js, /dockRect\.top - pad/);
  assert.match(js, /makeDraggablePanel\(rh, clockHandle/);
  assert.match(js, /const clockHandle = ui\.countdownClock/);
  assert.match(js, /const limits = draggablePanelBounds\(panelEl, r\.width, r\.height\)/);
});
