'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(projectRoot, 'public', 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(projectRoot, 'public', 'app.js'), 'utf8');
const stylesCss = fs.readFileSync(path.join(projectRoot, 'public', 'styles.css'), 'utf8');

test('game replay exposes a full-width action scrubber below its other controls', () => {
  const barStart = indexHtml.indexOf('id="historyReplayBar"');
  const barEnd = indexHtml.indexOf('</div>', indexHtml.indexOf('class="historyReplayTimeline"', barStart));
  const replayBar = indexHtml.slice(barStart, barEnd);

  assert.match(replayBar, /id="historyReplaySlider"[^>]*type="range"[^>]*min="0"[^>]*step="1"/);
  assert.ok(replayBar.indexOf('id="historyReplaySlider"') > replayBar.indexOf('id="historyReplayLogBtn"'));
  assert.match(stylesCss, /\.historyReplayTimeline\s*\{[^}]*flex:1 0 100%[^}]*width:100%/s);
});

test('replay scrubber spans every recorded action and stays synchronized with navigation', () => {
  assert.match(appJs, /ui\.historyReplaySlider\.max = String\(steps\.length\)/);
  assert.match(appJs, /ui\.historyReplaySlider\.value = String\(historyReplay\.index\)/);
  assert.match(appJs, /scheduleHistoryReplayFrame\(ui\.historyReplaySlider\.value\)/);
  assert.match(appJs, /historyReplayScrubFrame = requestAnimationFrame\(showPendingFrame\)/);
  assert.match(appJs, /showHistoryReplayFrame\(nextIndex\)/);
});
