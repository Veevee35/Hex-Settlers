'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
function section(start, end) { return source.slice(source.indexOf(start), source.indexOf(end)); }

function element() {
  const classes = new Set(['hidden']);
  return {
    children: [], style: {}, textContent: '', innerHTML: '',
    classList: { contains: value => classes.has(value), add: value => classes.add(value), remove: value => classes.delete(value) },
    appendChild(child) { this.children.push(child); return child; },
  };
}

function client(playerId = 'guest') {
  const sent = [];
  const timers = [];
  const ui = { modal: element(), modalTitle: element(), modalBody: element(), modalActions: element(), playerTradeBtn: element() };
  const context = vm.createContext({
    ui, document: { createElement: element },
    state: {
      roomCode: 'TEST', phase: 'main-actions', currentPlayerId: 'host', paused: false,
      players: [{ id: 'host', name: 'Host', color: 'red' }, { id: 'guest', name: 'Guest', color: 'blue' }, { id: 'other', name: 'Other', color: 'green' }],
      pendingTrade: { id: 1, fromId: 'host', offer: { brick: 1 }, request: { ore: 1 }, responses: { guest: 'accept', other: null } },
    },
    room: { code: 'TEST' }, myPlayerId: playerId, historyReplay: { active: false },
    amRoomSpectator: () => playerId === 'spectator', isLocalPairedExtraTurn: () => false,
    myPlayer: () => ({}), resIconSrcForTrade: kind => kind,
    send: message => sent.push(message), sendGameAction: action => sent.push(action),
    setTimeout: callback => timers.push(callback),
    modalLocked: false, modalType: null, activeToolModal: null, chatRefs: null,
    lastTradePromptKeySeen: '', pendingTradePromptId: 0, pendingTradeModalKey: '', pendingEndVotePromptId: 0,
    openModal(options) { context.lastModal = options; context.opens++; ui.modal.classList.remove('hidden'); },
    opens: 0,
  });
  vm.runInContext([
    section('  function pendingTradeKey()', '  function playerHasPortClient('),
    section('  function closeModal()', '  function openModal('),
    section('  function openPendingTradeModal(', '  function openEndGameVoteModal('),
    section('  function openPlayerTradeModal(', '  function handlePendingTradePrompt('),
    section('  function handlePendingTradePrompt()', '  function handleEndGameVotePrompt('),
  ].join('\n'), context);
  return { context, ui, sent, timers, run: code => vm.runInContext(code, context) };
}

test('every trade participant can close and reopen the same offer without changing their response', () => {
  for (const playerId of ['host', 'guest', 'other']) {
    const c = client(playerId);
    c.run('handlePendingTradePrompt(); updatePlayerTradeButton();');
    assert.equal(c.context.opens, 1);
    assert.equal(c.ui.playerTradeBtn.disabled, false);
    const close = c.context.lastModal.actions.find(action => action.label === 'Close');
    assert.ok(close, `${playerId} has a Close action`);
    close.onClick();
    assert.equal(c.ui.modal.classList.contains('hidden'), true);
    assert.equal(c.context.state.pendingTrade.responses.guest, 'accept');
    assert.deepEqual(c.sent, []);

    c.run('handlePendingTradePrompt();');
    c.context.modalType = 'rules';
    c.ui.modal.classList.remove('hidden');
    c.run('handlePendingTradePrompt(); closeModal(); handlePendingTradePrompt();');
    assert.equal(c.context.opens, 1, 'timer checks and other menus do not reopen a dismissed trade');
    assert.equal(c.timers.length, 0);

    c.run('openPlayerTradeModal();');
    assert.equal(c.context.opens, 2);
    assert.equal(c.context.modalType, 'pendingTrade');
    assert.equal(c.context.state.pendingTrade.id, 1);
    assert.deepEqual(c.sent, []);
  }
});

test('trade responses refresh an open popup but unchanged timer and network updates preserve its controls', () => {
  const c = client();
  c.run('handlePendingTradePrompt();');
  const originalActions = c.context.lastModal.actions;
  c.run('for (let i = 0; i < 100; i++) handlePendingTradePrompt();');
  assert.equal(c.context.opens, 1);
  assert.equal(c.context.lastModal.actions, originalActions);
  originalActions.find(action => action.label === 'Reject').onClick();
  assert.equal(c.sent[0].kind, 'respond_trade');
  assert.equal(c.sent[0].accept, false);
  c.context.state.pendingTrade.responses.guest = 'reject';
  c.run('handlePendingTradePrompt();');
  assert.equal(c.context.opens, 2);
  assert.equal(c.ui.modal.classList.contains('hidden'), false);
});

test('revised offers prompt again, while completed or expired offers cannot be reopened by responders', () => {
  const c = client();
  c.run('handlePendingTradePrompt(); closeModal();');
  c.context.state.pendingTrade.id = 2;
  c.run('handlePendingTradePrompt();');
  assert.equal(c.context.opens, 2);
  c.context.state.pendingTrade = null;
  c.run('handlePendingTradePrompt(); updatePlayerTradeButton(); openPlayerTradeModal();');
  assert.equal(c.ui.modal.classList.contains('hidden'), true);
  assert.equal(c.ui.playerTradeBtn.disabled, true);
  assert.equal(c.context.opens, 2);
  assert.deepEqual(c.sent, []);
});

test('spectators and replay viewers cannot trade; paused participants can still view an existing offer', () => {
  const spectator = client('spectator');
  spectator.run('updatePlayerTradeButton(); openPlayerTradeModal();');
  assert.equal(spectator.ui.playerTradeBtn.disabled, true);
  assert.equal(spectator.context.opens, 0);
  const c = client();
  c.context.historyReplay.active = true;
  c.run('updatePlayerTradeButton(); openPlayerTradeModal();');
  assert.equal(c.ui.playerTradeBtn.disabled, true);
  c.context.historyReplay.active = false;
  c.context.state.paused = true;
  c.run('updatePlayerTradeButton(); openPlayerTradeModal();');
  assert.equal(c.ui.playerTradeBtn.disabled, false);
  assert.equal(c.context.opens, 1);
});
