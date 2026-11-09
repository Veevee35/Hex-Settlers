'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/styles.css'), 'utf8');

function runBack({ mode, room = null } = {}) {
  const start = app.indexOf('  function navigateBackFromUncreatedLobby() {');
  const end = app.indexOf('\n  function choosePlayMode(', start);
  assert.ok(start >= 0 && end > start, 'Back action exists and is isolated');
  const events = [];
  const ctx = {
    room,
    authUser: { id:'player' },
    selectedPlayMode: mode,
    roomNotFoundVisible:true,
    roomNotFoundReturnView:'private',
    journeyView:'private',
    pendingRecentRoomRejoinCode:'ABCD',
    pendingAutoRejoin:true,
    sessionStorage: {setItem: (key,value) => events.push(['session',key,value])},
    returnToGameTypeSelection: (reason) => events.push(['game-types', reason]),
    setError: (reason) => events.push(['error', reason]),
    updateAuthUi: () => events.push(['update']),
  };
  vm.runInNewContext(`${app.slice(start, end)}\nnavigateBackFromUncreatedLobby();`, ctx);
  return { ctx, events };
}

test('pre-lobby Back button is available on the shared uncreated-lobby entry page', () => {
  assert.match(html, /id="uncreatedLobbyIntro"[\s\S]*?id="preLobbyBackBtn"/);
  assert.match(css, /\.uncreatedLobbyNav\{display:flex/);
  assert.match(app, /\('preLobbyBackBtn'\)\?\.addEventListener\('click', navigateBackFromUncreatedLobby\)/);
  assert.match(app, /const destination = selectedPlayMode === 'casual' \? 'Change Game Type' : 'All Games';/);
  assert.match(app, /preLobbyBackBtn\.disabled = !!room;/);
});

test('Casual pre-lobby Back goes to Change Game Type screen', () => {
  const {events} = runBack({mode:'casual'});
  assert.deepEqual(events, [['game-types','']]);
});

test('public and private post-leave pre-lobby Back goes straight to All Games', () => {
  for (const sourceView of ['public','private']) {
    const {ctx,events} = runBack({mode:'unranked'});
    assert.equal(ctx.selectedPlayMode,'journey',sourceView);
    assert.equal(ctx.journeyView,'home',sourceView);
    assert.equal(ctx.pendingRecentRoomRejoinCode,'',sourceView);
    assert.equal(ctx.pendingAutoRejoin,false,sourceView);
    assert.equal(ctx.roomNotFoundVisible,false,sourceView);
    assert.ok(events.some(e => e[0]==='session' && e[2]==='journey'),sourceView);
    assert.ok(events.some(e => e[0]==='update'),sourceView);
    assert.ok(!events.some(e => e[0]==='game-types'),sourceView);
  }
});

test('pre-lobby Back never lets a player escape a connected lobby', () => {
  for (const mode of ['unranked','casual']) {
    const {events} = runBack({mode, room:{code:'ABCD'}});
    assert.deepEqual(events,[]);
  }
});
