'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const client = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');

function section(source, from, until) {
  const a = source.indexOf(from);
  const b = source.indexOf(until, a + from.length);
  assert.ok(a >= 0 && b > a, `Could not locate ${from} / ${until}`);
  return source.slice(a, b);
}

test('End Game click handler uses spectator detection defined in its own scope', () => {
  const callback = section(client, "if (ui.endGameVoteBtn) ui.endGameVoteBtn.addEventListener('click'", '  if (ui.idsBtn)');
  assert.match(callback, /!amRoomSpectator\(\)/);
  assert.doesNotMatch(callback, /!amSpectator\b/, 'amSpectator is local to updateButtons and undefined in the click handler');
  assert.match(callback, /sendGameAction\(\{ kind: 'propose_endgame' \}\)/);
});

test('unranked End Game actions get through the browser when paused but regular actions do not', () => {
  const sent = [];
  const errors = [];
  const scope = vm.createContext({
    state: { phase: 'main-actions', paused: true },
    ws: { readyState: 1 },
    WebSocket: { OPEN: 1 },
    amRoomSpectator: () => false,
    setError: (error) => errors.push(error),
    settingsSandboxActive: false,
    send: (payload) => sent.push(payload),
  });
  vm.runInContext(section(client, '  function sendGameAction(action)', '  let hoverNodeBuild = '), scope);
  assert.equal(scope.sendGameAction({ kind: 'propose_endgame' }), true);
  assert.equal(scope.sendGameAction({ kind: 'respond_endgame', voteId: 1, withdraw: true }), true);
  assert.equal(scope.sendGameAction({ kind: 'propose_turn_undo' }), true);
  assert.equal(scope.sendGameAction({ kind: 'roll_dice' }), false);
  assert.deepEqual(sent.map(({ action }) => action.kind), ['propose_endgame', 'respond_endgame', 'propose_turn_undo']);
  assert.ok(errors.includes('Game is paused.'));
});

test('End Game modal prompt resets its deduplication when the next room starts a vote at ID 1', () => {
  const classes = new Set(['hidden']);
  let opens = 0;
  const scope = vm.createContext({
    room: { code: 'OLD1' }, myPlayerId: 'p1',
    state: { roomCode: 'OLD1', endVote: { id: 1 } },
    lastEndVotePromptIdSeen: 0, lastEndVotePromptRoomCode: '', pendingEndVotePromptId: 0,
    modalType: null,
    ui: { modal: { classList: { contains: (name) => classes.has(name) } } },
    openEndGameVoteModal: () => { opens += 1; },
    forceCloseModal: () => {},
  });
  vm.runInContext(section(client, '  function handleEndGameVotePrompt()', '\n\nfunction handleDiscardPrompt()'), scope);
  scope.handleEndGameVotePrompt();
  assert.equal(opens, 1);
  scope.handleEndGameVotePrompt();
  assert.equal(opens, 1, 'same vote should not reopen when its panel was dismissed');
  scope.room.code = 'NEW2';
  scope.state = { roomCode: 'NEW2', endVote: { id: 1 } };
  scope.handleEndGameVotePrompt();
  assert.equal(opens, 2, 'new room vote with reused ID must open');
});

test('admin closure and every Main Menu destination restore the game-type chooser', () => {
  assert.match(client, /function returnToGameTypeSelection\(reason = ''\)/);
  assert.match(client, /selectedPlayMode = ''[\s\S]*?sessionStorage\.removeItem\('hexsettlers_play_mode'\)/);
  assert.match(client, /msg\.type === 'room_closed_by_admin'[\s\S]*?returnToGameTypeSelection\(msg\.reason/);
  assert.match(client, /pgMainMenuBtn\.addEventListener\('click'[\s\S]*?returnToModeSelectionAfterLeave = true[\s\S]*?send\(\{ type: 'leave_room' \}\)/);
  assert.doesNotMatch(section(client, "if (msg.type === 'left_room')", "if (msg.type === 'leave_game_request')"), /location\.reload\(\)/);
  assert.match(html, /id="playModeNotice"/);
  assert.match(server, /room_closed_by_admin/);
});

test('ranked Rematch returns to ready state and never auto-enqueues', () => {
  const rankedClause = section(server, '      if (room.ranked) {\n        const user = findUserById(pid);', '\n      const existingCode = String(room.rematchRoomCode');
  assert.match(rankedClause, /rankedReady: true/);
  assert.doesNotMatch(rankedClause, /enqueueRankedPlayer/);
  assert.match(client, /const returnToRankedReady = !!msg\.rankedReady/);
  assert.match(client, /function returnToRankedReadyScreen\(\)[\s\S]*?rankedReadyBtn'\)\?\.classList\.remove\('hidden'\)/);
  assert.match(client, /ui\.pgRematchBtn\.textContent = rankedRematch \? 'Returning…' : 'Joining…'/);
});

test('ranked rematch server handler actually detaches only the requester without joining a queue', async () => {
  const src = section(server, '      if (room.ranked) {\n        const user = findUserById(pid);', '\n      const existingCode = String(room.rematchRoomCode');
  const events = [];
  let enqueueCount = 0;
  const ws = { _roomCode: 'RANK', _playerId: 'p1', events };
  const otherWs = { _roomCode: 'RANK', _playerId: 'p2' };
  const room = {
    code: 'RANK', ranked: true, hostId: 'p1',
    game: { phase: 'game-over' },
    players: [{ id: 'p1' }, { id: 'p2' }], spectators: [],
    sockets: new Map([['p1', ws], ['p2', otherWs]]),
  };
  const rooms = new Map([[room.code, room]]);
  const scope = vm.createContext({
    room, pid: 'p1', code: 'RANK', ws, rooms,
    findUserById: (id) => ({ id }),
    sendJson: (socket, packet) => socket.events.push(packet),
    removeRoomMember: (r, id) => { r.players = r.players.filter(p => p.id !== id); },
    enqueueRankedPlayer: () => { enqueueCount++; },
    broadcastRoom: () => {}, scheduleActiveRoomsSave: () => {},
  });
  vm.runInContext(`async function act() { ${src} }`, scope);
  await scope.act();
  assert.equal(enqueueCount, 0);
  assert.equal(ws._roomCode, null);
  assert.equal(ws._playerId, null);
  assert.deepEqual(room.players.map(p => p.id), ['p2']);
  assert.equal(room.sockets.size, 1);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'left_room');
  assert.equal(events[0].rankedReady, true);
});
