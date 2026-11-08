'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const source = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('Timer Off disables all server phase deadlines in unranked/casual games', () => {
  const code = source('server.js');
  const fn = code.slice(code.indexOf('function phaseDurationMs(game, phase) {'), code.indexOf('\nfunction microActionSeconds(game) {'));
  const context = { DEFAULT_RULES: {}, microActionDurationMs: () => 15000, isPairedTurnPlayerTwoStage: () => true };
  vm.runInNewContext(`${fn}; this.phaseDurationMs=phaseDurationMs`, context);
  for (const phase of ['setup1-settlement','setup1-road','setup2-settlement','setup2-road','main-await-roll','main-actions','discard','production-gold','robber-move','robber-steal','pirate-move','pirate-steal','cartographer-draft']) {
    assert.equal(context.phaseDurationMs({ranked:false,rules:{setupTurnMs:0,playTurnMs:0,microPhaseMs:0}}, phase), 0, phase);
  }
  assert.equal(context.phaseDurationMs({ranked:false,rules:{setupTurnMs:60000,playTurnMs:30000}}, 'main-actions'),30000);
});

test('Game setup order, timer option, AI controls, language entrances and ready colors exist', () => {
  const html = source('public/index.html');
  const order = ['id="playerCountSelect"','id="mapFamilySelect"','id="scenarioRow"','id="timerSpeedSelect"','id="victoryPointsSelect"','id="diceAlgorithmSelect"','id="discardLimitInput"','id="baseResourceCountSelect"','id="devDeckModeSelect"','id="friendlyRobberToggle"','id="randomMapAtStartToggle"','id="explorationPointsRow"'];
  let last = -1;
  for (const tag of order) { const at=html.indexOf(tag); assert.ok(at > last, `misordered or missing ${tag}`); last=at; }
  assert.match(html, /<option value="off">Off/);
  assert.ok(html.includes('id="loginLanguageBtn"'));
  assert.ok(html.includes('id="accountLanguageBtn"'));
  assert.ok(html.includes('id="languagePage"'));
  assert.ok(!html.includes('id="aiFillBtn"'));
  assert.ok(!html.includes('id="aiClearBtn"'));
  const css=source('public/styles.css');
  assert.match(css, /\.readyYes/);
  assert.match(css, /\.readyNo/);
  const js=source('public/app.js');
  assert.match(js, /type: 'fill_ai', targetCount: target/);
  assert.match(js, /factor = preset === 'off' \? 0/);
  assert.match(js, /Timer Off — choose a resource when you are ready/);
});

test('30 supported language options and translated page script load before app', () => {
  const script = source('public/languages.js');
  const window = {};
  vm.runInNewContext(script, { window, document: {readyState:'loading',addEventListener() {}}, localStorage: {getItem() { return null; }} });
  assert.equal(window.HexSettlersLanguages.supported.length,30);
  for (const code of ['en','es','fr','de','pt','zh','ja','ko','ru','ar','hi']) assert.ok(window.HexSettlersLanguages.supported.includes(code));
  const html = source('public/index.html');
  assert.ok(html.indexOf('src="languages.js?') > 0);
  assert.ok(html.indexOf('src="languages.js?') < html.indexOf('src="app.js?'));
});

test('commit stamper busts browser caches without GitHub bot commits', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(),'hex-v50-stamp-'));
  try {
    for (const p of ['scripts/stamp-git-build.cjs','build-version.json','public/index.html','public/app.js','public/sw.js']) {
      const dest=path.join(temp,p);
      fs.mkdirSync(path.dirname(dest),{recursive:true});
      fs.copyFileSync(path.join(ROOT,p),dest);
    }
    execFileSync(process.execPath,[path.join(temp,'scripts/stamp-git-build.cjs')],{env:{...process.env,CF_COMMIT_SHA:'1234567890abcdef'},stdio:'pipe'});
    const html=fs.readFileSync(path.join(temp,'public/index.html'),'utf8');
    const app=fs.readFileSync(path.join(temp,'public/app.js'),'utf8');
    assert.ok(html.includes('languages.js?v=release-g1234567890ab'));
    assert.ok(html.includes('app.js?v=release-g1234567890ab'));
    assert.ok(html.includes('styles.css?v=release-g1234567890ab'));
    assert.ok(app.includes("const ASSET_CACHE_SW_BUILD = 'release-g1234567890ab';"));
  } finally { fs.rmSync(temp,{recursive:true,force:true}); }
});
