'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'public/styles.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'public/sw.js'), 'utf8');
const mobileSection = css.split('/* v22: Mobile postgame header.')[1];

test('postgame screen keeps its summary heading and actions in separate mobile grid rows', () => {
  assert.ok(mobileSection, 'v22 responsive header styles should exist');
  for (const area of ['"result result"', '"navigation navigation"', '"type-size hide"']) {
    assert.ok(mobileSection.includes(area), `missing distinct mobile header row ${area}`);
  }
  assert.match(mobileSection, /\.postgameTopCenter\s*\{\s*grid-area:\s*result/);
  assert.match(mobileSection, /\.postgameTopLeft\s*\{\s*grid-area:\s*navigation/);
  assert.match(mobileSection, /\.postgameTopRight\s*\{\s*display:\s*contents/);
  assert.match(mobileSection, /\.postgameTopRight\s*>\s*\.tabScaleControl\s*\{\s*grid-area:\s*type-size/);
  assert.match(mobileSection, /\.postgameTopRight\s*>\s*#pgHideBtn\s*\{\s*grid-area:\s*hide/);
});

test('long names wrap, while tabs and summary content remain scrollable on mobile', () => {
  assert.match(mobileSection, /\.postgameWinnerLine\s*\{[^}]*white-space:\s*normal/s);
  assert.match(mobileSection, /\.postgameWinnerLine\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(css, /\.postgameTabs\s*\{[^}]*overflow-x:\s*auto/s);
  assert.match(css, /\.postgameBody\s*\{[^}]*overflow:\s*auto/s);
  assert.match(mobileSection, /height:\s*100dvh/);
});

test('postgame markup preserves main menu, rematch, hide and all result tabs', () => {
  for (const id of ['pgWinnerLine', 'pgMetaLine', 'pgMainMenuBtn', 'pgRematchBtn', 'pgHideBtn', 'postgameTabs', 'pgTabBody']) {
    assert.ok(html.includes(`id="${id}"`), `missing ${id}`);
  }
  // The responsive v22 layout is retained; asset cache tags must advance with each release.
  const assetVersion = html.match(/styles\.css\?v=([a-z0-9.-]+)/)?.[1];
  assert.ok(assetVersion, 'CSS has an asset version');
  assert.ok(html.includes(`app.js?v=${assetVersion}`), 'JS shares CSS asset version');
  assert.ok(sw.includes(assetVersion), 'service worker shares asset version');
});
