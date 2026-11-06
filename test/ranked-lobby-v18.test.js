'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (...segments) => fs.readFileSync(path.join(root, ...segments), 'utf8');

test('login and game-type screens both expose Terms of Service and Privacy Policy actions', () => {
  const markup = read('public', 'index.html');
  for (const screen of ['authLanding', 'playModeScreen']) {
    const begin = markup.indexOf(`id="${screen}"`);
    assert.ok(begin >= 0, `${screen} exists`);
    const end = screen === 'authLanding' ? markup.indexOf('id="playModeScreen"') : markup.indexOf('id="legalOverlay"');
    const fragment = markup.slice(begin, end);
    assert.match(fragment, /data-legal-page="terms"/);
    assert.match(fragment, /data-legal-page="privacy"/);
    assert.match(fragment, /aria-label="Legal information"/);
  }
});

test('legal dialog can close and opens the published legal documents', () => {
  const markup = read('public', 'index.html');
  const js = read('public', 'app.js');
  assert.match(markup, /id="legalOverlay"[^>]*aria-hidden="true"/);
  assert.match(markup, /id="legalDialog"[^>]*role="dialog" aria-modal="true"/);
  assert.match(markup, /id="legalDialogClose"/);
  assert.match(js, /legalDialogClose/);
  assert.match(js, /event\.key === 'Escape'/);
  assert.match(js, /event\.target === overlay/);
  for (const filename of ['terms_of_service.html','privacy_policy.html']) {
    assert.equal(read('public', filename), read(filename), `${filename} is served and matches root document`);
    assert.match(read('public', filename), /support@hexsettlers\.org/);
  }
});

test('ranked lobby has viewport layout, compact vote cards and safe small-screen fallback', () => {
  const css = read('public', 'styles.css');
  const markup = read('public', 'index.html');
  assert.match(css, /body\.ranked-lobby \.layout>\.panel\{[^}]*overflow-x:hidden; overflow-y:hidden/);
  assert.match(css, /body\.ranked-lobby #rankedScenarioMapPreview|body\.ranked-lobby \.rankedScenarioMapPreview/);
  assert.match(css, /body\.ranked-lobby #roomBox>\.roomShareControls/);
  assert.match(css, /body\.ranked-lobby #roomBox>\.roomAccountControls/);
  assert.match(css, /body\.ranked-lobby #playersList/);
  assert.match(css, /body\.ranked-lobby \.layout>\.panel\{overflow-y:auto/);
  assert.match(markup, /class="roomShareControls"/);
  assert.match(markup, /class="row roomAccountControls"/);
});
