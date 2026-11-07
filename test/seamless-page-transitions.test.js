'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const client = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');

function section(source, start, end) {
  const from = source.indexOf(start);
  assert.notEqual(from, -1, `missing start marker: ${start}`);
  const to = source.indexOf(end, from + start.length);
  assert.notEqual(to, -1, `missing end marker: ${end}`);
  return source.slice(from, to);
}

test('the no-room page restores the lobby card before its early return', () => {
  const renderLobby = section(client, '  function renderLobby() {', '\n  function updateButtons() {');
  const restore = renderLobby.indexOf("ui.lobbyCard.classList.toggle('hidden', gameStarted)");
  const noRoom = renderLobby.indexOf('    if (!room) {');
  const earlyReturn = renderLobby.indexOf('      return;', noRoom);
  assert.ok(restore >= 0 && restore < noRoom && noRoom < earlyReturn,
    'lobby card visibility must be restored before the no-room return');
});

test('every local room exit rebuilds page chrome without reloading', () => {
  const exit = section(client, '  function handleLocalRoomExit(reason, options = {}) {', '\n  // The game-type selection');
  assert.match(exit, /room = null;\s*state = null;/);
  assert.match(exit, /updateAuthUi\(\);\s*updateButtons\(\);\s*renderLobby\(\);\s*render\(\);/);
  assert.doesNotMatch(exit, /location\.reload|location\.replace/);
});

test('winning actions and room changes push state to all connected participants', () => {
  const gameAction = section(server, "    if (msg.type === 'game_action') {", "\n    if (msg.type === 'get_state')");
  assert.match(gameAction, /applyAction\(room, pid, msg\.action\)/);
  assert.match(gameAction, /broadcastState\(room\)/);

  const broadcast = section(server, 'function broadcastState(room) {', '\n\nfunction roomHasOpenSocket');
  assert.match(broadcast, /for \(const \[pid, ws\] of room\.sockets\.entries\(\)\)/);
  assert.match(broadcast, /sendJson\(ws, \{ type: 'state', state \}\)/);

  const rematch = section(server, "    if (msg.type === 'rematch_room') {", "\n    if (msg.type === 'set_ready')");
  assert.match(rematch, /sendJson\(ws, \{ type: 'joined'/);
  assert.match(rematch, /broadcastRoom\(room\)/);
  assert.match(rematch, /broadcastRoom\(newRoom\)/);
  assert.match(rematch, /broadcastPreviewState\(newRoom\)/);
});
