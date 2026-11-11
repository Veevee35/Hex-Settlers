'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public', 'styles.css'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');

const from = app.indexOf("  const RECENT_ROOM_KEY = 'hexsettlers_recent_room_v32';");
const to = app.indexOf('  const AUTO_CREATE_ROOM_KEY', from);
assert.ok(from >= 0 && to > from);
const helpers = app.slice(from, to);
const FIVE_MINUTES = 5 * 60 * 1000;

function client(now = 1_790_000_000_000, address = 'https://hexsettlers.org/?room=ABCD&spectator=1#board') {
  const storage = new Map();
  const url = new URL(address);
  let renders = 0;
  const window = {
    location: url,
    history: {
      state: { breadcrumb: 1 },
      replaceState(state, title, next) {
        this.state = state;
        this.last = next;
        window.location = new URL(next, url.origin);
      },
    },
  };
  const ui = { codeInput: { value: 'ABCD' } };
  const context = vm.createContext({
    window, URL, Date: class extends Date { static now() { return now; } },
    authUser: { id: 'player-1', username: 'player' },
    room: null, roomConnectionReady: false,
    state: null,
    ui, pendingDirectJoinRoomCode: 'ABCD', pendingDirectJoinAsSpectator: true,
    pendingManualRejoinCode: '',
    renderLobby: () => { renders++; }, updateButtons() {},
    localStorage: {
      getItem: key => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: key => storage.delete(key),
    },
  });
  vm.runInContext(helpers, context);
  return { context, storage, window, ui, renders: () => renders, now };
}

function recent(client) {
  return vm.runInContext('recentRoomCodeForUser()', client.context);
}

test('only a server-confirmed lobby visited in the last five minutes is automatically eligible', () => {
  const c = client();
  vm.runInContext('noteRecentRoom({code:"AAAA"})', c.context);
  assert.equal(recent(c), '', 'not joined/confirmed yet');
  c.context.roomConnectionReady = true;
  vm.runInContext('noteRecentRoom({code:"ABCD"})', c.context);
  assert.equal(recent(c), 'ABCD');
  assert.equal(JSON.parse(c.storage.get('hexsettlers_recent_room_v32')).userId, 'player-1');
  assert.equal(vm.runInContext(`recentRoomCodeForUser(authUser, ${c.now + FIVE_MINUTES})`, c.context), 'ABCD');
  assert.equal(vm.runInContext(`recentRoomCodeForUser(authUser, ${c.now + FIVE_MINUTES + 1})`, c.context), '');
  assert.equal(c.storage.has('hexsettlers_recent_room_v32'), false);
});

test('recent lobby record does not carry across accounts or a backwards clock', () => {
  const c = client();
  c.context.roomConnectionReady = true;
  vm.runInContext('noteRecentRoom({code:"CDEF"})', c.context);
  assert.equal(vm.runInContext('recentRoomCodeForUser({id:"another-player"})', c.context), '');
  assert.equal(recent(c), 'CDEF', 'account mismatch should not delete another account record');
  assert.equal(vm.runInContext(`recentRoomCodeForUser(authUser, ${c.now - 1})`, c.context), '');
});

test('completed games are not recorded as recent active lobbies', () => {
  const c = client();
  c.context.roomConnectionReady = true;
  c.context.state = { phase: 'game-over' };
  vm.runInContext('noteRecentRoom({code:"CDEF"})', c.context);
  assert.equal(recent(c), '');
});

test('uncreated lobby navigation removes stale room and spectator query parameters', () => {
  const c = client(undefined, 'https://hexsettlers.org/play/?room=ABCD&spectator=1&theme=dark#map');
  vm.runInContext('prepareUncreatedLobby()', c.context);
  assert.equal(c.window.location.href, 'https://hexsettlers.org/play/?theme=dark#map');
  assert.equal(c.ui.codeInput.value, '');
  assert.equal(c.context.pendingDirectJoinRoomCode, null);
  assert.equal(c.context.pendingDirectJoinAsSpectator, false);
  assert.equal(c.renders(), 1);
});

test('uncreated lobby hides the board and all room-only setup cards instead of drawing a blank map', () => {
  assert.match(app, /classList\.toggle\('uncreated-lobby', !room\)/);
  assert.match(app, /if \(!room\) \{[\s\S]*?ui\.setupCard\) ui\.setupCard\.classList\.add\('hidden'\)/);
  assert.match(css, /body\.uncreated-lobby:not\(\.in-game\):not\(\.ranked-lobby\) \.layout>\.boardWrap/);
  assert.match(css, /body\.uncreated-lobby:not\(\.in-game\):not\(\.ranked-lobby\) \.layout>\.panel/);
});

test('direct invitations take priority over auto-rejoin, and old un-timed saved codes cannot auto-rejoin', () => {
  const auth = app.slice(app.indexOf("      if (msg.type === 'auth_ok')"), app.indexOf("      if (msg.type === 'lobby_invite')"));
  assert.ok(auth.indexOf('if (pendingDirectJoinRoomCode && authUser)') < auth.indexOf('if (pendingAutoRejoin)'));
  assert.match(auth, /const recent = recentRoomCodeForUser\(authUser\)/);
  assert.doesNotMatch(auth, /localStorage\.getItem\(LAST_ROOM_KEY\)/);
  assert.match(server, /if \(msg\.type === 'rejoin_room'\)[\s\S]*?const jr = rejoinRoom\(code, ws\._userId\)/);
});
