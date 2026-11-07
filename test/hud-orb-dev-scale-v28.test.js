const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const css = fs.readFileSync(path.join(__dirname,'../public/styles.css'), 'utf8');
const app = fs.readFileSync(path.join(__dirname,'../public/app.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname,'../public/index.html'), 'utf8');
const sw = fs.readFileSync(path.join(__dirname,'../public/sw.js'), 'utf8');

test('in-game account orb follows measured top-bar height and remains centered', () => {
  assert.match(app, /--hud-top-bar-height/);
  assert.match(app, /ui\.toolsCard\?\.getBoundingClientRect\(\)\.height/);
  assert.match(css, /--hud-orb-size:clamp\(25px,calc\(var\(--hud-top-bar-height/);
  assert.match(css, /\.hudTopLeft \.inGameOrb\s*\{[\s\S]*?top:50%!important[\s\S]*?transform:translateY\(-50%\)!important/);
});

test('Development Cards header reserves a bounded grid column for scale controls', () => {
  assert.match(css, /#devCard \.devHeaderRow\s*\{[\s\S]*?grid-template-columns:minmax\(0,1fr\) max-content/);
  assert.match(css, /#devCard \.devHeaderRow > \.panelScaleHost\s*\{[\s\S]*?grid-column:2/);
  assert.match(css, /#devCard \.devHeaderRight\s*\{[\s\S]*?grid-row:2/);
});

test('cache keys agree for CSS, JS and service worker', () => {
  assert.match(html, /styles\.css\?v=recent-lobby-v32/);
  assert.match(html, /app\.js\?v=recent-lobby-v32/);
  assert.match(sw, /recent-lobby-v32/);
});
