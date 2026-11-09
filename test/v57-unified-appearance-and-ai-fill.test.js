'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/unified-theme.css'), 'utf8');

test('all pre-lobby routes have the shared legal/version/Ko-fi footer', () => {
  for (const id of ['authLanding','playModeScreen','journeyScreen','roomNotFoundScreen','rankedScreen','registerOverlay']) {
    const begin = html.indexOf(`id="${id}"`);
    assert.ok(begin !== -1, `${id} exists`);
    const end = html.indexOf(id === 'registerOverlay' ? '</div>\n\n  <div id="friendsOverlay"' : '</section>', begin);
    const segment = html.slice(begin, end);
    for (const required of ['class="appVersion"','class="portalLegalLinks"','data-legal-page="terms"','data-legal-page="privacy"','ko-fi.com/L6D82A3L9Z']) {
      assert.ok(segment.includes(required), `${id} is missing ${required}`);
    }
  }
  assert.match(html, /id="app"[\s\S]*?class="preLobbyAppFooter"[\s\S]*?ko-fi\.com/);
  assert.match(css, /\.portalScreen > \.appVersion/);
});

test('Game Log side panel has no replay upload/download buttons; Game History retains them', () => {
  assert.doesNotMatch(html, /id="logReplayExportBtn"|id="logReplayImportBtn"/);
  assert.match(html, /id="historyDownloadSelectedBtn"/);
  assert.match(html, /id="historyUploadReplayBtn"/);
});

test('seven/eight-player game overview uses a four-column desktop class', () => {
  assert.match(js, /postgameState\.tab === 'summary' && cards\.length >= 7 && cards\.length <= 8/);
  assert.match(js, /grid\.classList\.add\('pgOverviewEightPlayerGrid'\)/);
  assert.match(css, /\.pgGameOverviewSection \.pgOverviewPlayerGrid\.pgOverviewEightPlayerGrid[\s\S]*?grid-template-columns:\s*repeat\(4,minmax\(0,1fr\)\)/);
});

test('fill lobby to maximum seats sends fill_ai to the server, including boss permission', () => {
  assert.match(html, /id="aiFillMaxBtn"[^>]*>Fill Lobby to Max<\/button>/);
  const src = js.match(/  const canChangeLobbyAi = \(\) =>[\s\S]*?\n  ui\.aiFillMaxBtn\?\.addEventListener\('click', \(\) => \{[\s\S]*?\n  \}\);/);
  assert.ok(src, 'AI fill control implementation is present');
  const calls=[];
  let handler;
  const ctx = {
    ui:{ aiFillSelect: {addEventListener: () => {},options: [{value:'2'},{value:'3'},{value:'4'},{value:'5'},{value:'6'},{value:'7'},{value:'8'}]},
          aiFillMaxBtn: {addEventListener: (_event, cb) => {handler=cb;}} },
    room: {hostId:'host',bossIds:['boss'],ranked:false,players:[{id:'host'},{id:'other'}]},
    myPlayerId:'boss',state:{phase:'lobby'},send: payload=>calls.push(payload),
  };
  vm.runInNewContext(src[0],ctx);
  handler();
  assert.deepEqual(JSON.parse(JSON.stringify(calls)),[{type:'fill_ai',targetCount:8}]);
  ctx.state.phase='main-actions';handler();
  ctx.room.ranked=true;handler();
  assert.equal(calls.length,1,'AI button is disabled for active/ranked matches');
});
