'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..', 'public');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

test('all game panel and statistics tab scales allow 300% while retaining saved preferences', () => {
  assert.match(app, /const TAB_UI_SCALE_MAX = 3\.0;/);
  assert.match(app, /const TOOL_UI_SCALE_MAX = 3\.0;/);
  assert.match(app, /return Math\.max\(TOOL_UI_SCALE_MIN, Math\.min\(TOOL_UI_SCALE_MAX/);
  assert.match(app, /return Math\.max\(TAB_UI_SCALE_MIN, Math\.min\(TAB_UI_SCALE_MAX/);
  assert.match(app, /localStorage\.setItem\(`\$\{TOOL_UI_SCALE_PREFIX\}/);
});

test('mobile selected Resources fills the width and does not repeat its title', () => {
  assert.match(css, /rightSidebar\[data-active-panel="resources"\] #resourcesCard\s*\{\s*display:block!important/);
  assert.match(css, /rightSidebar #resourcesCard \.resourcesHeaderRow,\s*body\.in-game \.rightSidebar #resourcesCard > h2 \{display:none!important;/);
  assert.match(css, /rightSidebar #resourcesCard \.resourcesBox,\s*body\.in-game \.rightSidebar #resourcesCard \.resSummaryRow\s*\{\s*width:100%!important/);
});

test('log/dev split moves with pointer or keyboard and persists ratio', () => {
  assert.match(app, /function ensureLogDevSplitter\(\)/);
  assert.match(app, /separator\.id = 'sidebarLogDevSplitter'/);
  assert.match(app, /separator\.setPointerCapture\?\.\(event\.pointerId\)/);
  assert.match(app, /initialShare \+ \(event\.clientY - initialY\) \/ availableOnStart/);
  assert.match(app, /event\.key === 'ArrowDown'/);
  assert.match(app, /event\.key === 'ArrowUp'/);
  assert.match(app, /localStorage\.setItem\(LOG_DEV_SPLIT_KEY/);
  assert.match(app, /ui\.rightSidebarInner\.insertBefore\(logDevSplitter, ui\.devCard\)/);
  assert.match(css, /\.sidebarLogDevSplitter \{display:none;\}/);
  assert.match(css, /\.sidebarLogDevSplitter\.dragging/);
});

test('dev card list stays below cost note and can clip/scroll as log expands', () => {
  assert.match(css, /#devCard \.panelScaleContent > \.smallNote\s*\{\s*flex:0 0 auto/);
  assert.match(css, /#devCard \.panelScaleContent > \.devHand\s*\{[\s\S]*?min-height:0;[\s\S]*?overflow-y:auto/);
  assert.match(css, /#devCard \.devRow\s*\{\s*flex:0 0 auto;/);
  assert.match(app, /Math\.min\(Math\.max\(118, devTopHeight \+ 34\), available \* 0\.55\)/);
});

test('resource icons no longer stop growing at the width of the grid column', () => {
  assert.match(css, /body\.in-game \.resCell \.resIcon,[\s\S]*?max-width:none;[\s\S]*?flex-shrink:0/);
  assert.match(css, /body\.in-game \.rightSidebarResStrip,[\s\S]*?overflow-x:auto/);
});

test('client JS, CSS, and service worker share fresh v31 cache key', () => {
  const key = 'log-dev-resources-scale-v31';
  assert.ok(html.includes(`styles.css?v=${key}`));
  assert.ok(html.includes(`app.js?v=${key}`));
  assert.ok(app.includes(`ASSET_CACHE_SW_BUILD = '${key}'`));
  assert.ok(sw.includes(`CACHE_NAME = CACHE_PREFIX + '${key}'`));
});
