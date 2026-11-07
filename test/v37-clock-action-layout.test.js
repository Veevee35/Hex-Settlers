'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const publicDir = path.join(__dirname, '..', 'public');
const css = fs.readFileSync(path.join(publicDir, 'styles.css'), 'utf8');
const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(publicDir, 'sw.js'), 'utf8');
const v37 = css.split('/* v37 — The clock has one stable footprint.')[1];

test('clock outer dimensions stay fixed at screenshot reference width independent of content', () => {
  assert.ok(v37, 'expected v37 clock styles');
  assert.match(v37, /width:190px!important;/);
  assert.match(v37, /min-width:190px!important;/);
  assert.match(v37, /max-width:190px!important;/);
  assert.match(v37, /height:190px!important;/);
  assert.match(v37, /max-height:190px!important;/);
  assert.match(v37, /box-sizing:border-box;/);
});

test('colored clock message is smaller, multi-line, and scrolls instead of growing clock', () => {
  assert.match(v37, /\.countdownClock \.clockActionInfo \{[\s\S]*?flex:1 1 auto;[\s\S]*?max-height:none!important;[\s\S]*?overflow-y:auto;/);
  assert.match(v37, /\.countdownClock \.clockActionInfo \.turnInfo \{[\s\S]*?font-size:11px!important;[\s\S]*?white-space:normal!important;[\s\S]*?overflow-wrap:anywhere;/);
  assert.match(v37, /\.countdownClock \.clockMeta \{[\s\S]*?overflow-wrap:anywhere;/);
});

test('mobile clock remains fixed-width and fixed-height with landscape accommodation', () => {
  assert.match(v37, /width:min\(190px,calc\(100vw - 12px\)\)!important;/);
  assert.match(v37, /height:176px!important;/);
  assert.match(v37, /height:150px!important;/);
});

test('updated stylesheet is versioned to invalidate browser cache', () => {
  assert.match(html, /styles\.css\?v=features-v38/);
  assert.match(sw, /CACHE_NAME = CACHE_PREFIX \+ 'features-v38'/);
});
