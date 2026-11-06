'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const client = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');

test('pre-game tools are hidden in markup and postgame navigation is player-specific', () => {
  assert.match(html, /class="card hidden" id="toolsCard"/);
  assert.match(html, /id="pgMainMenuBtn"[\s\S]*?id="pgRematchBtn"/);
  assert.match(client, /pgMainMenuBtn[\s\S]*?returnToModeSelectionAfterLeave = wasRanked[\s\S]*?send\(\{ type: 'leave_room' \}\)/);
  assert.match(client, /msg\.type === 'left_room'[\s\S]*?handleLocalRoomExit[\s\S]*?returnToRankedQueue[\s\S]*?returnToModeSelection/);
  assert.match(server, /const gameOver = [\s\S]*?room\.game\.phase === 'game-over'[\s\S]*?leavingHost[\s\S]*?nextHost/);
  assert.match(server, /room\.rematchRoomCode = newRoom\.code/);
  assert.match(server, /Transfer ONLY the player who clicked Rematch[\s\S]*?room\.sockets\.delete\(pid\)[\s\S]*?bindSocketToRoomMember\(newRoom, pid, ws\)/);
  assert.match(server, /newRoom\.players = newRoom\.players\.filter\(\(player\) => player\.id === pid \|\| player\.isAI\)/);
});

test('pause, play, and voted previous-turn restoration are separate server-authoritative controls', () => {
  assert.match(html, /id="backTurnBtn"[\s\S]*?id="pauseBtn"[\s\S]*?id="playBtn"/);
  assert.match(client, /ui\.playerTradeBtn,[\s\S]*?ui\.backTurnBtn,[\s\S]*?ui\.pauseBtn,[\s\S]*?ui\.playBtn/);
  assert.match(client, /pause_game', paused: true/);
  assert.match(client, /pause_game', paused: false/);
  assert.match(server, /kind === 'propose_turn_undo'[\s\S]*?kind === 'respond_turn_undo'/);
  assert.doesNotMatch(server, /kind === 'propose_turn_undo'[\s\S]{0,300}Only the host can propose/);
  assert.match(server, /_previousTurnSnapshot[\s\S]*?Object\.assign\(game, restored\)/);
  assert.match(server, /const current = game\._currentTurnStartSnapshot[\s\S]*?game\._previousTurnSnapshot = current[\s\S]*?game\._currentTurnStartSnapshot = deepClone/);
  assert.match(server, /turnUndoVote[\s\S]*?must remain paused until the turn-undo vote finishes/);
  assert.match(client, /turnUndoResponsePendingVoteId[\s\S]*?stale state packet[\s\S]*?turnUndoResponsePendingVoteId === voteId/);
});

test('administrator account merging combines identity data without exposing email addresses', () => {
  assert.match(client, /Merge Duplicate Accounts[\s\S]*?adminApi\('merge-users'/);
  assert.match(server, /urlPath === '\/api\/admin\/merge-users'/);
  assert.match(server, /secondaryEmailTime > primaryEmailTime/);
  assert.match(server, /friendIds[\s\S]*?HISTORY_DB\.games[\s\S]*?saveHistoryDb/);
});

test('administrator room management stays server-authorized and surprise maps ignore previews at start', () => {
  assert.match(server, /urlPath === '\/api\/admin\/rooms'/);
  assert.match(server, /urlPath === '\/api\/admin\/close-rooms'/);
  assert.match(server, /urlPath === '\/api\/admin\/kick-room-member'/);
  assert.match(server, /if \(!isAdminUser\(admin\)\)/);
  assert.match(server, /game\.rules\?\.randomMapAtStart !== true && room\.preview/);
  assert.match(client, /openServerManagementConsole/);
  assert.match(client, /if \(loggedIn && authUser\.isAdmin\)/);
  assert.doesNotMatch(html, /id="serverManagementBtn"/);
  assert.match(html, /id="randomMapAtStartToggle"/);
});

test('obsolete public backup artifacts are removed', () => {
  assert.equal(fs.existsSync(path.join(root, 'public', 'styles - Copy.txt')), false);
  assert.equal(fs.existsSync(path.join(root, 'public', 'sw.js.bak')), false);
});
