'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const root = path.resolve(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public', 'styles.css'), 'utf8');
const client = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');

// Evaluate the real undo snapshot capture function with minimal dependencies.
test('turn snapshots only advance on a new player turn, including paired second player', () => {
  const begin = server.indexOf('function captureTurnUndoPoint(');
  const end = server.indexOf('\nfunction recordTurnEnd(', begin);
  assert.ok(begin > 0 && end > begin);
  const ctx = vm.createContext({ deepClone: (value) => JSON.parse(JSON.stringify(value)) });
  vm.runInContext(server.slice(begin, end), ctx);
  const game = { phase: 'main-await-roll', currentPlayerId: 'A', turnNumber: 1, paired: { stage: 'p1' }, value: 0 };
  ctx.captureTurnUndoPoint(game);
  assert.equal(game._previousTurnSnapshot, null);
  game.phase = 'main-actions';
  game.value = 10;
  ctx.captureTurnUndoPoint(game); // phase change, not a new player turn
  assert.equal(game._previousTurnSnapshot, null);
  assert.equal(game._currentTurnStartSnapshot.value, 0);
  game.currentPlayerId = 'B';
  game.paired.stage = 'p2';
  game.value = 20;
  ctx.captureTurnUndoPoint(game);
  assert.equal(game._previousTurnSnapshot.currentPlayerId, 'A');
  assert.equal(game._previousTurnSnapshot.value, 0);
  game.value = 30;
  ctx.captureTurnUndoPoint(game);
  assert.equal(game._previousTurnSnapshot.currentPlayerId, 'A'); // no accidental overwrite
  game.currentPlayerId = 'C';
  game.turnNumber = 2;
  game.paired.stage = 'p1';
  ctx.captureTurnUndoPoint(game);
  assert.equal(game._previousTurnSnapshot.currentPlayerId, 'B');
});

test('undo holds the previous player at the beginning with a fresh timer until Play', () => {
  const undoBegin = server.indexOf("if (kind === 'respond_turn_undo')");
  const undoEnd = server.indexOf("if (kind === 'propose_endgame')", undoBegin);
  const undo = server.slice(undoBegin, undoEnd);
  assert.match(undo, /deepClone\(game\._previousTurnSnapshot\)/);
  assert.match(undo, /setTimerForCurrentPhase\(game, restoredTurnMs, restoredTurnMs\)/);
  assert.match(undo, /pauseGame\(game, playerId\)/);
  assert.doesNotMatch(undo, /resumeGame\(game\);\s*game\.message = `Returned/);
});

test('rematch uses one persisted room code and admits others only when clicking', () => {
  const begin = server.indexOf("if (msg.type === 'rematch_room')");
  const end = server.indexOf("if (msg.type === 'set_ready')", begin);
  const rematch = server.slice(begin, end);
  assert.match(rematch, /room\.rematchRoomCode/);
  assert.match(rematch, /let newRoom = existingCode \? roomByCodeWithPersistence\(existingCode\) : null/);
  assert.match(rematch, /if \(!newRoom\) \{\s*newRoom = createRematchRoomFrom\(room, pid\)/);
  assert.match(rematch, /else if \(!findRoomPlayer\(newRoom, pid\)\)/);
  assert.match(rematch, /room\.sockets\.delete\(pid\)/);
  assert.match(rematch, /bindSocketToRoomMember\(newRoom, pid, ws\)/);
  const persistence = fs.readFileSync(path.join(root, 'server', 'active-rooms.js'), 'utf8');
  assert.match(persistence, /rematchRoomCode: String\(room\.rematchRoomCode \|\| ''\)/);
  assert.match(persistence, /rematchRoomCode: String\(record\.rematchRoomCode \|\| ''\)/);
});

test('account orb tracks the adjustable right sidebar and management modal has its own width', () => {
  assert.match(css, /body\.in-game \.accountOrb\s*\{[\s\S]*?right:calc\(var\(--right-sidebar-width, 520px\) \+ 8px\)/);
  assert.match(css, /\.modalBox:has\(\.serverManagementPanel\)[\s\S]*?width:min\(1010px/);
  assert.match(css, /\.serverManagementMember\{[\s\S]*?grid-template-columns:minmax\(0,1fr\) auto/);
  assert.match(client, /body\.className = 'modalText serverManagementPanel'/);
});

test('successive rematch actions join first player lobby without moving nonparticipants', async () => {
  const begin = server.indexOf("if (msg.type === 'rematch_room')");
  const end = server.indexOf("if (msg.type === 'set_ready')", begin);
  const clause = server.slice(begin, end);
  const ctx = vm.createContext({
    now: () => 123456,
    COLORS: ['red', 'green', 'blue'],
    DEFAULT_RULES: { mapMode: 'classic' },
    Map, Object, String,
    sendJson: (ws, packet) => { ws.events.push(packet); },
    findRoomPlayer: (r, id) => (r.players || []).find(p => p.id === id),
    maxPlayersForRules: () => 6,
    pickAvailableColor: () => 'blue',
    ensurePreview: () => {},
    broadcastRoom: () => {},
    broadcastPreviewState: () => {},
    roomSnapshot: (r) => ({ code: r.code, players: r.players.map(p => ({ id: p.id, isAI: p.isAI })), hostId: r.hostId }),
    scheduleActiveRoomsSave: async () => {},
  });
  const rooms = new Map();
  let created = 0;
  ctx.roomByCodeWithPersistence = code => rooms.get(code);
  ctx.createRematchRoomFrom = old => {
    const r = { code: `NEW${++created}`, players: old.players.map(p => ({ ...p })), spectators: [], hostId: old.hostId, sockets: new Map(), rules: old.rules, game: null };
    rooms.set(r.code, r);
    return r;
  };
  ctx.bindSocketToRoomMember = (r, id, ws) => { r.sockets.set(id, ws); ws._roomCode = r.code; ws._playerId = id; };
  vm.runInContext(`async function act(room, pid, ws, msg) { ${clause} }`, ctx);
  const room = {
    hostId: 'oldHost', game: { phase: 'game-over' },
    rules: { mapMode: 'classic' },
    players: [
      { id: 'oldHost', name: 'Original host', color: 'red' },
      { id: 'first', name: 'First player', color: 'green' },
      { id: 'later', name: 'Later player', color: 'blue' },
      { id: 'bot', name: 'Bot', isAI: true, color: 'purple' },
    ],
    sockets: new Map(),
  };
  for (const id of ['oldHost', 'first', 'later']) room.sockets.set(id, { id, events: [] });
  const firstSocket = room.sockets.get('first');
  await ctx.act(room, 'first', firstSocket, { type: 'rematch_room' });
  assert.equal(created, 1);
  const target = rooms.get(room.rematchRoomCode);
  assert.equal(target.hostId, 'first');
  assert.deepEqual(target.players.map(p => p.id), ['first', 'bot']);
  assert.equal(room.sockets.has('oldHost'), true); // not auto-moved
  assert.equal(room.sockets.has('later'), true);
  assert.equal(firstSocket.events.at(-1).isHost, true);
  const nextSocket = room.sockets.get('later');
  await ctx.act(room, 'later', nextSocket, { type: 'rematch_room' });
  assert.equal(created, 1); // no second room
  assert.equal(nextSocket.events.at(-1).room.code, target.code);
  assert.equal(nextSocket.events.at(-1).isHost, false);
  assert.deepEqual(target.players.map(p => p.id), ['first', 'bot', 'later']);
  assert.equal(room.sockets.has('oldHost'), true);
  assert.equal(target.sockets.size, 2);
});
