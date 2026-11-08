'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const publicDir = path.join(__dirname, '..', 'public');
const css = fs.readFileSync(path.join(publicDir, 'styles.css'), 'utf8');
const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(publicDir, 'sw.js'), 'utf8');
const layout = css.split('/* v45 — Size the turn clock to its actual time, turn, and action text.')[1];

test('turn clock keeps a readable desktop width but shrinks vertically to its content', () => {
  assert.ok(layout, 'expected content-fitting v45 clock layout');
  assert.match(layout, /width:clamp\(190px,19vw,250px\)!important;/);
  assert.match(layout, /height:auto!important;/);
  assert.match(layout, /min-height:0!important;/);
  assert.match(layout, /max-height:min\(65dvh,340px\)!important;/);
  assert.doesNotMatch(layout, /(?:height|min-height|max-height):(?:190|176|150)px!important;/);
});

test('clock action message sizes naturally, keeps wraps, and only scrolls for long text', () => {
  assert.match(layout, /\.countdownClock \.clockActionInfo \{[\s\S]*?flex:0 1 auto;[\s\S]*?max-height:min\(34dvh,180px\)!important;[\s\S]*?overflow-y:auto;/);
  assert.match(layout, /\.countdownClock \.clockActionInfo \.turnInfo \{[\s\S]*?font-size:11px!important;[\s\S]*?white-space:normal!important;[\s\S]*?overflow-wrap:anywhere;/);
  assert.match(layout, /\.countdownClock \.clockMeta \{[\s\S]*?overflow-wrap:anywhere;/);
  assert.match(layout, /padding-bottom:0!important;/);
});

test('mobile clock maintains 190px footprint with auto height in portrait and landscape', () => {
  assert.match(layout, /width:min\(190px,calc\(100vw - 12px\)\)!important;/);
  assert.match(layout, /max-height:min\(60dvh,290px\)!important;/);
  assert.match(layout, /max-height:min\(64dvh,220px\)!important;/);
});

test('updated stylesheet is versioned to invalidate browser cache', () => {
  const version = html.match(/styles\.css\?v=(release-v\d+\.\d+\.\d+)/)?.[1];
  assert.ok(version);
  assert.ok(sw.includes(`CACHE_NAME = CACHE_PREFIX + '${version}'`));
});
