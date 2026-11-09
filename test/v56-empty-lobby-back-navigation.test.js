'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/styles.css'), 'utf8');

test('an empty lobby has a contextual Back button visible on desktop and mobile', () => {
  assert.match(html, /id="uncreatedLobbyIntro"[\s\S]*?id="uncreatedLobbyBackBtn"/);
  assert.match(css, /body\.uncreated-lobby:not\(\.in-game\):not\(\.ranked-lobby\) #uncreatedLobbyIntro/);
  assert.match(css, /\.uncreatedLobbyNavigation\{display:flex;justify-content:flex-start/);
  assert.match(app, /uncreatedLobbyBack\.textContent = selectedPlayMode === 'casual'[\s\S]*?'← Back to Game Types' : '← Back to All Games'/);
});

test('Casual Back goes to game types; unranked Back goes to All Games; active lobbies cannot use it', () => {
  const source = app.match(/\$\('uncreatedLobbyBackBtn'\)\?\.addEventListener\('click', \(\) => \{[\s\S]*?\n  \}\);/);
  assert.ok(source, 'missing Back handler');
  let handler;
  const calls = [];
  const ctx = {
    $: () => ({ addEventListener: (_name, cb) => { handler = cb; } }),
    room: null, selectedPlayMode: 'casual',
    returnToGameTypeSelection: reason => calls.push(['types', reason]),
    returnToAllGamesAfterExit: () => calls.push(['all-games']),
  };
  vm.runInNewContext(source[0], ctx);
  handler();
  assert.deepEqual(calls, [['types', '']]);
  ctx.selectedPlayMode = 'unranked';
  handler();
  assert.deepEqual(calls, [['types', ''], ['all-games']]);
  ctx.room = {code:'ABCD'};
  handler();
  assert.equal(calls.length, 2, 'must never abandon an active lobby');
});

test('returning to All Games clears stale exit UI without launching tutorial or restoring a room', () => {
  const source = app.match(/  function returnToAllGamesAfterExit\(\) \{[\s\S]*?\n  \}/);
  assert.ok(source, 'missing All Games navigation function');
  const saved = {};
  const called = [];
  const ctx = {
    room: null, roomNotFoundVisible:true, roomNotFoundReturnView:'public',
    pendingRecentRoomRejoinCode: 'ABCD', pendingDirectJoinRoomCode:'WXYZ',
    pendingDirectJoinAsSpectator: true, selectedPlayMode: 'unranked',
    journeyView: 'public',
    sessionStorage: {setItem: (k,v) => { saved[k]=v; }},
    clearRoomQueryFromUrl: () => called.push('clear-url'),
    setError: val => called.push(['error', val]),
    updateAuthUi: () => called.push('update-ui'),
  };
  vm.runInNewContext(source[0], ctx);
  ctx.returnToAllGamesAfterExit();
  assert.equal(ctx.selectedPlayMode, 'journey');
  assert.equal(ctx.journeyView, 'home');
  assert.equal(ctx.roomNotFoundReturnView, '');
  assert.equal(ctx.pendingDirectJoinRoomCode, null);
  assert.equal(ctx.pendingRecentRoomRejoinCode, '');
  assert.equal(ctx.pendingDirectJoinAsSpectator, false);
  assert.equal(ctx.roomNotFoundVisible, false);
  assert.equal(saved.hexsettlers_play_mode, 'journey');
  assert.deepEqual(called, ['clear-url', ['error',null], 'update-ui']);
});
