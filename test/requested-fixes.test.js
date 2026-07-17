'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const appJs = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'public', 'styles.css'), 'utf8');
const serverJs = fs.readFileSync(path.join(root, 'server.js'), 'utf8');

test('lobby reconnects stale room state and defers safe lobby messages until rejoined', () => {
  assert.match(appJs, /let roomConnectionReady = false/);
  assert.match(appJs, /function beginRoomRecovery\(reason\)[\s\S]*?rejoin_room/);
  assert.match(appJs, /ROOM_SCOPED_MESSAGE_TYPES[\s\S]*?roomCode:/);
  assert.match(appJs, /RECONNECT_SAFE_ROOM_MESSAGE_TYPES[\s\S]*?pendingReconnectRoomMessages\.push\(payload\)/);
  assert.match(appJs, /const queuedRoomMessages = pendingReconnectRoomMessages\.splice\(0\)/);
  assert.match(appJs, /Heartbeat timeout/);
  assert.doesNotMatch(appJs, /setTimeout\(\(\) => \{[\s\S]{0,500}clearAuthLocal\(\);[\s\S]{0,200}\}, 3000\);/);
  assert.match(serverJs, /recoverSocketRoomBinding\(ws, msg\)/);
  assert.match(serverJs, /roomByCodeWithPersistence\(code\)/);
});

test('other-player texture packs wait for a confirmed room and can be fetched from their lobby row', () => {
  assert.match(appJs, /if \(!roomConnectionReady \|\| !room \|\| !room\.code/);
  assert.match(appJs, /useBtn\.textContent = `Use \$\{playerPackName\}`/);
  assert.match(appJs, /handlePlayerTexturePackChoice\(p\)/);
  assert.match(serverJs, /msg\.type === 'get_texture_pack'/);
});

test('setup highlights exclude ocean and unrevealed-fog-only nodes', () => {
  assert.match(appJs, /const touchesVisibleLand = adjacentTiles\.some/);
  assert.match(appJs, /tile\.type !== 'sea' && !\(tile\.fog && !tile\.revealed\)/);
  assert.match(appJs, /if \(!touchesVisibleLand\) continue/);
});

test('paired extra action turns suppress player-trade composition for every paired map', () => {
  assert.match(appJs, /function isLocalPairedExtraTurn/);
  assert.match(appJs, /String\(st\.paired\.stage \|\| ''\) === 'p2'/);
  assert.match(appJs, /if \(isLocalPairedExtraTurn\(state\)\)[\s\S]*?Player-to-player trades are unavailable/);
});

test('bank trades support mixed-resource baskets and add five seconds', () => {
  assert.match(appJs, /giveTrades: emptyResourceMap\(\)/);
  assert.match(appJs, /model\.giveTrades\[k\] = Math\.max\(0, Number\(model\.giveTrades\[k\] \|\| 0\) \+ delta\)/);
  assert.match(appJs, /sendGameAction\(\{ kind: 'bank_trade', give, take, forceRatio:/);
  assert.match(serverJs, /normalizeBankTradeAction\(action/);
  assert.match(serverJs, /for \(const resourceKind of RESOURCE_KINDS\) \{[\s\S]*?plan\.give\[resourceKind\]/);
  assert.match(serverJs, /extendPlayerTurn\(game, playerId, 5_000, timerSegmentKey\(game\)\)/);
});

test('player trades cannot give and receive the same resource', () => {
  assert.match(appJs, /const blockedByOppositeSide = n === 0 && Number\(getOppositeVal\(\) \|\| 0\) > 0/);
  assert.match(appJs, /chip\.disabled = blockedByOppositeSide/);
  assert.match(appJs, /selectedOverlapKind\(\)/);
  assert.match(serverJs, /validatePlayerTradeSides\(offer, request, RESOURCE_KINDS\)/);
  assert.match(serverJs, /validatePlayerTradeSides\(t\.offer \|\| \{\}, t\.request \|\| \{\}, RESOURCE_KINDS\)/);
});

test('the center-board YOUR ROLL banner is shown only for the local roll phase', () => {
  assert.match(indexHtml, /id="yourRollBanner"[^>]*>YOUR ROLL</);
  assert.match(styles, /\.yourRollBanner\{[\s\S]*?color:#ff1f2d[\s\S]*?font-size:clamp/);
  assert.match(appJs, /myTurn && !state\.paused && state\.phase === 'main-await-roll'/);
});
