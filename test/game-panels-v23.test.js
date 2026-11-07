'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..', 'public');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

test('settings changes autosave independently of named template storage', () => {
  assert.match(html, /id="saveRulesBtn"[^>]*>Save Settings Template/);
  assert.match(js, /function scheduleSettingsAutosave\(/);
  assert.match(js, /setTimeout\(commitLobbySettings,\s*170\)/);
  assert.match(js, /send\(\{ type: 'set_rules', rules \}\)/);
  assert.match(js, /changedSettingsForTemplate\.add\(id\)/);
  assert.match(js, /openModal\(\{ title: 'Save Settings Template'/);
  assert.match(js, /SETTINGS_TEMPLATE_STORAGE/);
  assert.match(css, /\.settingsTemplateSelectAll/);
});

test('gameplay preserves roll and end turn game action targets outside action bar', () => {
  assert.match(html, /id="rollDockBtn"[^>]*>Roll Dice/);
  assert.match(html, /id="endDockBtn"[^>]*>End Turn/);
  assert.match(js, /rollDockBtn\.addEventListener\('click', \(\) => sendGameAction\(\{ kind: 'roll_dice' \}\)\)/);
  assert.match(js, /endDockBtn\.addEventListener\('click'/);
  assert.match(js, /clockActionInfo/);
  assert.match(css, /\.hudTopLeft[\s\S]*?\.hudBottomLeft/);
  assert.match(css, /body\.in-game \.clockActionInfo/);
});

test('game panels button toggles whole sidebar and mobile exposes three tabs', () => {
  assert.match(html, /id="logBtn"[^>]*>Game Panels/);
  assert.match(html, /id="mobilePanelTabs"/);
  for (const panel of ['resources', 'log', 'dev']) {
    assert.match(html, new RegExp('data-panel="' + panel + '"'));
  }
  assert.match(js, /function setGamePanelsExpanded\(/);
  assert.match(js, /logPanelOpen = true/);
  assert.match(css, /body\.gamePanelsCollapsed\.in-game \.rightSidebar\s*\{/);
  assert.match(css, /body\.in-game \.rightSidebar\[data-active-panel="log"\] #logCard/);
});

test('mobile action grid and condensed resource strip are present', () => {
  for (const id of ['buyDevBtn', 'bankTradeBtn', 'playerTradeBtn', 'backTurnBtn', 'pauseBtn', 'playBtn']) {
    assert.match(css, new RegExp('\\.hudBtns #' + id + '\\{grid-column:'));
  }
  assert.match(css, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\);grid-template-rows:repeat\(2/);
  assert.match(css, /\.rightSidebarResourceDock\s*\{[\s\S]*?order:0/);
  assert.match(css, /\.rightSidebarResStrip\{flex:1 1 195px/);
  assert.match(css, /\.toolScaleControl\{display:none!important;\}/);
  assert.match(js, /mobileBuildMenuToggle/);
});

test('current release advances all frontend cache versions', () => {
  assert.match(html, /styles\.css\?v=unranked-rating-v25/);
  assert.match(html, /app\.js\?v=unranked-rating-v25/);
  assert.match(sw, /unranked-rating-v25/);
});
