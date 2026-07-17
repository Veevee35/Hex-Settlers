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

test('buy development card is placed in the turn action bar instead of the development-card panel', () => {
  const turnCardStart = indexHtml.indexOf('id="turnCard"');
  const devCardStart = indexHtml.indexOf('id="devCard"');
  const buyDevStart = indexHtml.indexOf('id="buyDevBtn"');
  assert.ok(turnCardStart >= 0 && devCardStart > turnCardStart && buyDevStart > turnCardStart && buyDevStart < devCardStart);
  assert.match(appJs, /ui\.buildCityBtn,\s*ui\.buyDevBtn,\s*ui\.bankTradeBtn/);
  assert.doesNotMatch(appJs, /right\.appendChild\(ui\.buyDevBtn\)/);
});



test('robber and pirate legal placement tiles use prominent accessible highlights', () => {
  assert.match(appJs, /const legalFill = isSeaTile \? 'rgba\(55,190,255,\.95\)' : 'rgba\(255,201,48,\.95\)'/);
  assert.match(appJs, /ctx\.globalAlpha = 0\.28 \+ 0\.14 \* thiefPulse/);
  assert.match(appJs, /ctx\.strokeStyle = 'rgba\(0,0,0,\.92\)'/);
  assert.match(appJs, /ctx\.shadowBlur = Math\.max\(10, view\.scale \* 0\.14\)/);
  assert.match(appJs, /ctx\.setLineDash\(/);
  assert.match(appJs, /ctx\.fillText\('✓', c\.x, badgeY \+ 1\)/);
  assert.match(appJs, /drawThiefLegalTileOverlayPass\(activePlayerThiefMove, thiefHighlightPhase, thiefPulse\)/);
});

test('paired extra action turns show a red Extra Turn banner above the action bar', () => {
  assert.match(indexHtml, /id="extraTurnBanner"[^>]*>Extra Turn<\/div>/);
  assert.match(styles, /\.extraTurnBanner\{[\s\S]*?color:#ff2638[\s\S]*?font-weight:950/);
  assert.match(styles, /\.hudBar \.extraTurnBanner\{[\s\S]*?bottom:calc\(100% \+ 7px\)/);
  assert.match(appJs, /ui\.extraTurnBanner\.classList\.toggle\('hidden', !showExtraTurn\)/);
  assert.match(appJs, /String\(state\.paired\.stage \|\| ''\) === 'p2'[\s\S]*?state\.phase === 'main-actions'/);
});

test('new roads, ships, settlements, and cities render 50 percent larger for two seconds', () => {
  assert.match(appJs, /const STRUCTURE_PLACEMENT_EMPHASIS_MS = 2_000/);
  assert.match(appJs, /const STRUCTURE_PLACEMENT_SCALE = 1\.5/);
  assert.match(appJs, /function trackNewStructurePlacements\(previousState, nextState\)/);
  assert.match(appJs, /emphasizePlacedStructure\('road', edgeId, nextEdge\.roadOwner, now\)/);
  assert.match(appJs, /emphasizePlacedStructure\('ship', added\.edgeId, added\.ownerId, now\)/);
  assert.match(appJs, /const kind = newBuilding\.type === 'city' \? 'city' : 'settlement'/);
  assert.match(appJs, /removedShipsByOwner[\s\S]*?Pair those changes so only newly purchased\/placed ships pulse/);
  assert.match(appJs, /drawEdgeStructureSprite\('road',[\s\S]*?placementScale\)/);
  assert.match(appJs, /drawSettlement\(s\.x, s\.y, col, structurePlacementScale\('settlement'/);
  assert.match(appJs, /drawCity\(s\.x, s\.y, col, structurePlacementScale\('city'/);
});
