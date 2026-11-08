'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..', 'public');
const js = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');

test('entire clock panel starts pointer drag, including time and action information', () => {
  assert.match(js, /const clockHandle = ui\.countdownClock;/);
  assert.match(js, /makeDraggablePanel\(rh, clockHandle, 'hexsettlers_rightHud_pos_v2'\)/);
  assert.match(js, /handleEl\.addEventListener\('pointerdown', \(ev\) =>/);
  assert.match(js, /handleEl\.setPointerCapture\(ev\.pointerId\)/);
  assert.match(css, /body\.in-game \.countdownClock \.clockTime,[\s\S]*?body\.in-game \.countdownClock \.clockActionInfo \{touch-action:none!important;\}/);
});
test('no grip icon is generated and no empty clock header renders on mobile', () => {
  assert.doesNotMatch(js, /grip\.textContent = '⋮⋮';\s*topRow\.insertBefore\(grip/);
  assert.doesNotMatch(css, /\.clockDragGrip\s*\{/);
  assert.match(css, /body\.in-game \.countdownClock \.clockTopRow \{display:none!important;\}/);
});
test('clock remains constrained to board space and preserves its position', () => {
  assert.match(js, /topBar\.bottom \+ pad/);
  assert.match(js, /dockRect\.top - pad/);
  assert.match(js, /localStorage\.setItem\(scopedKey, JSON\.stringify\(\{ left, top \}\)\)/);
});
