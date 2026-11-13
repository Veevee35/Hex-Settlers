'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');

function sourceBetween(start, end) {
  const from = app.indexOf(start);
  const to = app.indexOf(end, from + start.length);
  assert.ok(from !== -1 && to > from, `Missing source section: ${start}`);
  return app.slice(from, to);
}

function element() {
  const hidden = new Set();
  return {
    classList: {
      toggle(name, force) {
        if (force) hidden.add(name);
        else hidden.delete(name);
      },
      contains(name) { return hidden.has(name); },
    },
    textContent: '',
  };
}

function simulatedPortal({ invitedRoom, savedMode }) {
  const elements = Object.fromEntries(
    ['authLanding', 'playModeScreen', 'rankedScreen', 'app', 'accountOrb', 'accountOrbInitial', 'accountMenuName'].map((id) => [id, element()]),
  );
  const persisted = new Map();
  const context = vm.createContext({
    pendingDirectJoinRoomCode: invitedRoom || null,
    selectedPlayMode: savedMode || '',
    authUser: null,
    authToken: null,
    roomNotFoundVisible: false,
    journeyView: 'home',
    room: null,
    recentRoomSessionForUser: () => null,
    document: { body: { classList: { toggle() {} } }, querySelectorAll() { return []; } },
    ui: { nameInput: { value: '' } },
    $: (id) => elements[id],
    sessionStorage: {
      setItem: (k, v) => persisted.set(k, v),
      removeItem: (k) => persisted.delete(k),
    },
    localStorage: { setItem() {}, removeItem() {}, getItem() { return null; } },
    AUTH_TOKEN_KEY: 'auth-token',
    LAST_ROOM_KEY: 'last-room',
  });
  const helpers = [
    sourceBetween('  function selectInvitedLobbyMode()', '  function formatStatsLine('),
    sourceBetween('  function removePersistedAuthToken()', '  async function authApi('),
    sourceBetween('  function updateAuthUi()', '  function clearAuthLocal()'),
  ].join('\n');
  vm.runInContext(helpers, context);
  return { context, elements, persisted };
}

test('direct invite bypasses saved ranked selection after login and shows lobby', () => {
  const { context, elements, persisted } = simulatedPortal({ invitedRoom: 'ABCD', savedMode: 'ranked' });
  vm.runInContext('setAuthState({ id: "u1", username: "tester", displayName: "Player", tutorialCompleted: true }, null)', context);
  assert.equal(context.selectedPlayMode, 'unranked');
  assert.equal(persisted.get('hexsettlers_play_mode'), 'unranked');
  assert.equal(elements.app.classList.contains('hidden'), false);
  assert.equal(elements.playModeScreen.classList.contains('hidden'), true);
  assert.equal(elements.rankedScreen.classList.contains('hidden'), true);
  assert.equal(elements.authLanding.classList.contains('hidden'), true);
});

test('without an invitation, ranked/unranked selection remains unchanged', () => {
  const ranked = simulatedPortal({ invitedRoom: null, savedMode: 'ranked' });
  vm.runInContext('setAuthState({ id: "u1", username: "tester", tutorialCompleted: true }, null)', ranked.context);
  assert.equal(ranked.context.selectedPlayMode, 'ranked');
  assert.equal(ranked.elements.rankedScreen.classList.contains('hidden'), false);
  assert.equal(ranked.elements.app.classList.contains('hidden'), true);

  const choosing = simulatedPortal({ invitedRoom: null, savedMode: '' });
  vm.runInContext('setAuthState({ id: "u1", username: "tester", tutorialCompleted: true }, null)', choosing.context);
  assert.equal(choosing.elements.playModeScreen.classList.contains('hidden'), false);
});

test('the account orb puts Player Stats and Game Log immediately above Log Out', () => {
  const menu = html.slice(html.indexOf('id="accountMenu"'), html.indexOf('id="registerOverlay"'));
  assert.match(menu, /id="accountPlayerStatsBtn"[\s\S]*?id="accountGameLogBtn"[\s\S]*?id="accountLogoutBtn"/);
});

test('account orb actions open stats, live log, or past game logs as appropriate', () => {
  const handlers = new Map();
  const calls = [];
  const buttons = new Map(['accountPlayerStatsBtn', 'accountGameLogBtn', 'accountLogoutBtn'].map((id) => [id, {
    addEventListener(type, handler) { assert.equal(type, 'click'); handlers.set(id, handler); },
  }]));
  const context = vm.createContext({
    $: (id) => buttons.get(id),
    setAccountMenuOpen: (open) => calls.push(['menu', open]),
    openHistoryOverlay: (tab) => calls.push(['history', tab]),
    setLogPanelVisible: (visible) => calls.push(['live-log', visible]),
    ui: { logoutBtn: { click: () => calls.push(['logout']) } },
    state: null,
  });
  vm.runInContext(sourceBetween("  $('accountPlayerStatsBtn')?.addEventListener", '  async function loadFriends()'), context);

  handlers.get('accountPlayerStatsBtn')();
  assert.deepEqual(calls.splice(0), [['menu', false], ['history', 'players']]);

  handlers.get('accountGameLogBtn')();
  assert.deepEqual(calls.splice(0), [['menu', false], ['history', 'games']]);

  context.state = { phase: 'main-actions' };
  handlers.get('accountGameLogBtn')();
  assert.deepEqual(calls.splice(0), [['menu', false], ['live-log', true]]);

  handlers.get('accountLogoutBtn')();
  assert.deepEqual(calls.splice(0), [['menu', false], ['logout']]);
});

test('WebSocket login honors invite before last-room autorejoin and lobby displays on joined', () => {
  const authHandler = sourceBetween("      if (msg.type === 'auth_ok')", "      if (msg.type === 'friend_request')");
  assert.ok(authHandler.indexOf('if (pendingDirectJoinRoomCode && authUser)') < authHandler.indexOf('if (pendingAutoRejoin)'));
  assert.match(authHandler, /pendingAutoRejoin = false;[\s\S]*?type: 'join_room', code: targetCode/);
  const joinedHandler = sourceBetween("      if (msg.type === 'joined')", "      if (msg.type === 'room')");
  assert.match(joinedHandler, /selectedPlayMode !== 'unranked'[\s\S]*?selectedPlayMode = 'unranked'/);
});
