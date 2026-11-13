'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
function loadLocales() {
  const listeners = {};
  const window = { addEventListener() {}, dispatchEvent() {} };
  const document = { readyState: 'loading', addEventListener(type, cb) { listeners[type] = cb; }, documentElement: {}, getElementById() { return null; } };
  const ctx = vm.createContext({ window, document, console, localStorage: { getItem() { return null; }, setItem() {} }, CustomEvent: class {} });
  for (const name of ['locale-expansion.js', 'languages.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'public', name), 'utf8'), ctx, { filename: name });
  }
  return window.HexSettlersLanguages;
}
test('v52 localizes gameplay vocabulary in every offered language with English fallback', () => {
  const api = loadLocales();
  assert.equal(api.supported.length, 30);
  const coverage = api.getCoverage();
  for (const lang of api.supported) {
    if (lang === 'en') continue;
    assert.ok(coverage[lang] >= 200, `${lang}: incomplete dictionary (${coverage[lang]})`);
    api.setLanguage(lang);
    for (const phrase of ['Roll Dice','Build Road','Build Ship','End Turn','Game Log','Bank Trade','Victory!','Development Cards','Longest Road','Welcome to Hex Settlers','How do you want to play?','Texture pack','Download Map','Six Islands']) {
      assert.notEqual(api.t(phrase), phrase, `Missing ${lang} translation: ${phrase}`);
    }
    assert.equal(api.t('Untranslated game term'), 'Untranslated game term');
  }
  api.setLanguage('en');
  assert.equal(api.t('Build Road'), 'Build Road');
});
test('v52 translates known numeric statuses without changing numbers and never alters arbitrary text', () => {
  const api = loadLocales();
  api.setLanguage('es');
  assert.equal(api.t('Ranked rating: 1000'), 'Clasificación: 1000');
  assert.equal(api.t('Remaining in deck: 14'), 'Restantes en el mazo: 14');
  assert.equal(api.t('Remaining in deck: —'), 'Restantes en el mazo: —');
  assert.equal(api.t('Not Ready'), 'No listo');
  assert.equal(api.t('5-6 Player'), '5-6 Jugadores');
  assert.equal(api.t('PlayerABC: 1000'), 'PlayerABC: 1000');
  assert.equal(api.t('Custom player message'), 'Custom player message');
  api.setLanguage('fr');
  assert.equal(api.t('Ranked rating: 1750'), 'Classement: 1750');
});
test('v52 deployment references the new language pack with GitHub revision cache stamping', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const stamp = fs.readFileSync(path.join(root, 'scripts/stamp-git-build.cjs'), 'utf8');
  const app = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
  assert.match(html, /<script src="locale-expansion\.js\?v=release-v\d+\.\d+\.\d+"><\/script>[\s\S]*?<script src="languages\.js/);
  assert.match(stamp, /locale-expansion\\\.js\\\?v=/);
  assert.match(app, /className = 'chatRow';\s*row\.setAttribute\('data-i18n-skip'/);
});
