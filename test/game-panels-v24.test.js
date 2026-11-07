'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const root = join(__dirname, '..', 'public');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const css = readFileSync(join(root, 'styles.css'), 'utf8');
const js = readFileSync(join(root, 'app.js'), 'utf8');

test('mobile resources are in a separate persistent element above the divider', () => {
  assert.match(html, /id="mobilePinnedResources"[^>]*>[\s\S]*?id="mobileGameSplitter"/);
  assert.match(js, /anchor\.parentNode !== mobilePinnedResources/);
  assert.match(css, /body\.gamePanelsCollapsed\.in-game \.mobilePinnedResources\s*\{display:block!important;\}/);
});

test('mobile controls occupy real flex rows rather than absolute overlays', () => {
  assert.match(css, /body\.in-game \.hudBottomLeft\s*\{\s*order:2;position:relative!important/);
  assert.match(css, /body\.in-game \.rollDock\s*\{\s*order:1;position:relative!important/);
  assert.match(css, /body\.in-game #app \{height:100dvh!important;min-height:0!important;max-height:100dvh!important;\}/);
});

test('desktop toolbars stop at sidebar and collapsed pause overlay fills empty space', () => {
  assert.match(css, /body\.in-game:not\(\.gamePanelsCollapsed\) \.hudTopLeft,/);
  assert.match(css, /right:var\(--right-sidebar-width,520px\)!important/);
  assert.match(css, /body\.in-game\.gamePanelsCollapsed \.pausedOverlay \{right:0!important;\}/);
});

test('timer drag grip and important inline positioning restore touch/pointer movement', () => {
  assert.match(css, /body\.in-game \.rightHud \.clockDragGrip\s*\{[\s\S]*?display:flex!important/);
  assert.match(js, /panelEl\.style\.setProperty\('top', top \+ 'px', 'important'\)/);
  assert.match(js, /panelEl\.style\.setProperty\('right', 'auto', 'important'\)/);
});
