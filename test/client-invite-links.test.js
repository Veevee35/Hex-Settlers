'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const appJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
const linkHelpers = appJs.slice(appJs.indexOf('  function parseDirectJoinCodeFromUrl('), appJs.indexOf('  function connect()'));

function clientAt(address) {
  const ui = { roomJoinLinkInput: {}, copyJoinLinkBtn: {}, genJoinLinkBtn: {} };
  let networkCalls = 0;
  const context = vm.createContext({
    URL,
    window: { location: new URL(address) },
    ui,
    room: { code: 'ABCD' },
    fetch: () => { networkCalls++; return new Promise(() => {}); },
  });
  vm.runInContext(linkHelpers, context, { timeout: 1000 });
  return { context, ui, networkCalls: () => networkCalls };
}

test('invite links preserve the serving host, port, and path without copying account-action parameters', () => {
  for (const origin of ['http://127.0.0.1:3127', 'http://localhost:3000', 'http://192.168.1.10:8080', 'http://[::1]:3000', 'https://hexsettlers.up.railway.app']) {
    const { context } = clientAt(`${origin}/game/?action=reset-password&token=private#account`);
    assert.equal(vm.runInContext("buildDirectJoinUrl(' abcd ')", context), `${origin}/game/?room=ABCD`);
    assert.equal(vm.runInContext("buildSpectatorJoinUrl('ABCD')", context), `${origin}/game/?room=ABCD&spectator=1`);
    assert.equal(vm.runInContext("buildDirectJoinUrl('')", context), '');
  }
});

test('refreshing lobby invite links is synchronous and makes no network requests', () => {
  const client = clientAt('http://127.0.0.1:3127/');
  vm.runInContext('for (let i = 0; i < 100; i++) refreshLobbyJoinLinkUi();', client.context, { timeout: 1000 });
  assert.equal(client.networkCalls(), 0);
  assert.equal(client.ui.roomJoinLinkInput.value, 'http://127.0.0.1:3127/?room=ABCD');
  assert.equal(client.ui.copyJoinLinkBtn.disabled, false);
  assert.equal(client.ui.genJoinLinkBtn.disabled, false);
  vm.runInContext('room = null; refreshLobbyJoinLinkUi();', client.context);
  assert.equal(client.ui.roomJoinLinkInput.value, '');
  assert.equal(client.ui.copyJoinLinkBtn.disabled, true);
  assert.equal(client.ui.genJoinLinkBtn.disabled, true);
});
