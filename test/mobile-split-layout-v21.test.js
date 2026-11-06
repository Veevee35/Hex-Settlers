'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public', 'styles.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');

test('mobile gameplay exposes a labeled divider between the map and sidebar', () => {
  const boardAt = html.indexOf('<canvas id="board"');
  const handleAt = html.indexOf('id="mobileGameSplitter"');
  const panelsAt = html.indexOf('id="rightSidebar"');
  assert.ok(boardAt >= 0 && handleAt > boardAt && panelsAt > handleAt);
  assert.match(html, /id="mobileGameSplitter"[^>]+role="separator"[^>]+aria-orientation="horizontal"/);
  assert.match(html, /id="mobileGameSplitter"[^>]+tabindex="0"/);
  assert.match(css, /body\.in-game\s+\.rightSidebar,\s*body\.in-game\.mobilePanelsOpen\s+\.rightSidebar\s*\{[^}]*position:relative\s*!important/);
  assert.match(css, /body\.in-game\s+\.rightSidebarInner\s*\{[^}]*overflow-y:auto\s*!important/);
});

test('mobile divider supports touch dragging, keyboard resizing, and persistence', () => {
  assert.match(js, /hexsettlers_mobile_game_panel_ratio_v21/);
  assert.match(js, /mobileGameSplitter\.addEventListener\('pointerdown'/);
  assert.match(js, /mobileGameSplitter\.addEventListener\('pointermove'/);
  assert.match(js, /mobileGameSplitter\.addEventListener\('pointerup'/);
  assert.match(js, /mobileGameSplitter\.addEventListener\('keydown'/);
  assert.match(js, /setMobileSplitRatio\([^\n]*persist: true/);
  assert.match(css, /--mobile-sidebar-height/);
  assert.match(css, /body\.in-game\s+\.mobileGameControls\s*\{\s*bottom:calc\(var\(--mobile-sidebar-height\)/);
});

test('mobile assets are cache-busted together while desktop retains right dock', () => {
  const sw = fs.readFileSync(path.join(root, 'public', 'sw.js'), 'utf8');
  assert.match(html, /styles\.css\?v=mobile-split-v21/);
  assert.match(html, /app\.js\?v=mobile-split-v21/);
  assert.match(sw, /mobile-split-v21/);
  assert.match(css, /\.rightSidebar\s*\{\s*position:absolute;/);
});
