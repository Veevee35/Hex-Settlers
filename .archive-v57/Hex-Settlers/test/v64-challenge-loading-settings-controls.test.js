'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const dir = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(dir,'server.js'),'utf8');
const app = fs.readFileSync(path.join(dir,'public/app.js'),'utf8');
const html = fs.readFileSync(path.join(dir,'public/index.html'),'utf8');
const css = fs.readFileSync(path.join(dir,'public/styles.css'),'utf8');

test('only the selected challenge map gets generated and cached, across Daily and Weekly', () => {
  const start = server.indexOf('const challengeCatalogPreviewCache = new Map();');
  const stop = server.indexOf('function ensureChallengeRoomInvariants(room)', start);
  assert.ok(start >= 0 && stop > start);
  const generated = [];
  const fakeGeom = {
    tiles: [{id:0,cx:0,cy:0,type:'sea'}, {id:1,cx:1.73,cy:0,type:'forest',number:8}],
    tileNeighbors: [[1,2,3,4,5],[0]], ports:[{edgeId:0,landTileId:1,seaTileId:0,kind:'generic'}],
    edges:[{a:0,b:1}], nodes:[{x:0,y:-1},{x:0,y:1}]
  };
  const sandbox = {
    challengeWeekId: () => '2026-11-09', challengeDayId: () => '2026-11-10',
    findUserById: () => ({}), challengeScenario: () => 'classic',
    challengeRules: () => ({mapMode:'classic'}), familyForPeriod: () => 'classic', rulesHideOuterSeaBorder: () => false,
    challengeGeom(challenge){generated.push(challenge);return fakeGeom;},
    challengeLeaderboard: () => [{name:'Winner',lowestTurns:33}],
  };
  vm.createContext(sandbox);
  vm.runInContext(server.slice(start,stop),sandbox);
  const first = sandbox.challengeMapsCatalog('user','weekly',7);
  assert.equal(generated.length,1);
  assert.equal(generated[0].playerCount,7);
  assert.equal(first.weekly.maps.length,5);
  assert.equal(first.daily.maps.length,5);
  assert.equal(first.weekly.maps.find(map=>map.playerCount===7).preview.length,2);
  assert.equal(first.weekly.maps.find(map=>map.playerCount===7).ports.length,1);
  assert.equal(first.weekly.maps.find(map=>map.playerCount===4).preview.length,0);
  assert.equal(first.daily.maps.find(map=>map.playerCount===7).preview.length,0);
  assert.equal(first.requestedKind,'weekly');
  assert.equal(first.requestedPlayerCount,7);
  sandbox.challengeMapsCatalog('user','weekly',7);
  assert.equal(generated.length,1,'refresh reuses already derived thumbnail');
  const second = sandbox.challengeMapsCatalog('user','daily',8);
  assert.equal(generated.length,2,'Daily is a separate map');
  assert.equal(second.daily.maps.find(map=>map.playerCount===8).preview.length,2);
  assert.equal(second.weekly.maps.find(map=>map.playerCount===8).preview.length,0);
  const third = sandbox.challengeMapsCatalog('user','weekly',4);
  assert.equal(generated.length,3,'new capacity generates only one map');
  assert.equal(third.weekly.maps.find(map=>map.playerCount===4).preview.length,2);
});

test('selected Daily/Weekly maps are requested on demand and obsolete replies ignored', () => {
  assert.match(app, /get_challenge_maps', kind: selectedChallengeKind, playerCount: selectedChallengePlayerCount/);
  assert.match(server, /challengeMapsCatalog\(ws\._userId, msg\.kind, msg\.playerCount\)/);
  assert.match(app, /if \(msg\.requestedKind && \(msg\.requestedKind !== selectedChallengeKind \|\|/);
  assert.match(app, /requestAnimationFrame\(paint\)/);
  assert.match(app, /miniMapPaintPending\.has\(canvas\)/);
  const tabScope = app.slice(app.indexOf("$('challengePeriodTabs')?.addEventListener"),app.indexOf("$('journeyBackBtn')?.addEventListener"));
  assert.match(tabScope,/requestChallengeMaps\(\)/);
});

test('real-board settings overlay contains only exit and reset controls', () => {
  const chunk = html.split('<div id="journeySettingsPanel"')[1].split('<button id="journeyTutorialBtn"')[0];
  assert.ok(chunk);
  assert.match(chunk,/id="journeySettingsBackBtn"/);
  assert.match(chunk,/id="sandboxResetBtn"/);
  assert.doesNotMatch(chunk,/type="range"|sandboxAudioBtn|settingsMockBoard|smallNote|<h2/);
  assert.match(css,/body\.settings-sandbox #journeySettingsPanel \{\s*display:flex!important/);
  assert.match(app,/sidebarCuts = \[\.20, \.57, \.79\];/);
  assert.match(app,/if \(settingsSandboxActive\) \{\s*updateButtons\(\); renderResources\(\); resizeCanvas\(\); render\(\);/);
});
