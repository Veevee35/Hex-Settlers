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
  assert.match(appJs, /downloadSharedTexturePack\(targetId\)/);
  assert.match(appJs, /publishTexturePackToRoom\(announcingRoomCode, active\.id\)/);
  assert.match(serverJs, /handleTexturePackHttp\(req, res, urlPath\)/);
  assert.match(serverJs, /type: 'texture_pack_manifest'/);
  assert.match(serverJs, /msg\.type === 'get_texture_pack'/);
});

test('Simplified is exposed as a built-in texture pack for every player', () => {
  assert.match(appJs, /const SIMPLIFIED_TEXTURE_PACK_ID = 'simplified'/);
  assert.match(appJs, /name: 'Simplified'[^\n]*builtin: true/);
  assert.match(appJs, /`\/texture-packs\/\$\{encodeURIComponent\(builtin\.id\)\}/);
  assert.match(serverJs, /builtinTexturePack\(packId\)/);
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



test('robber and pirate legal placement tiles are noticeable and render below player structures without checkmarks', () => {
  assert.match(appJs, /const legalFill = isSeaTile \? 'rgba\(55,190,255,\.88\)' : 'rgba\(255,201,48,\.88\)'/);
  assert.match(appJs, /ctx\.globalAlpha = 0\.26 \+ 0\.12 \* thiefPulse/);
  assert.match(appJs, /ctx\.setLineDash\(/);
  assert.doesNotMatch(appJs, /drawThiefLegalTileOverlayPass/);
  const highlight = appJs.indexOf("const legalFill = isSeaTile");
  const roads = appJs.indexOf('// Draw roads + ships');
  const buildings = appJs.indexOf('// Draw nodes + buildings');
  assert.ok(highlight >= 0 && highlight < roads && roads < buildings);
});

test('paired extra action turns show a red Extra Turn banner above the action bar', () => {
  assert.match(indexHtml, /id="extraTurnBanner"[^>]*>Extra Turn<\/div>/);
  assert.match(styles, /\.extraTurnBanner,\s*\.placementTurnBanner\{[\s\S]*?color:#ff2638[\s\S]*?font-weight:950/);
  assert.match(styles, /\.hudBar \.extraTurnBanner,\s*\.hudBar \.placementTurnBanner\{[\s\S]*?bottom:calc\(100% \+ 7px\)/);
  assert.match(appJs, /ui\.extraTurnBanner\.classList\.toggle\('hidden', !showExtraTurn\)/);
  assert.match(appJs, /myTurn &&[\s\S]*?String\(state\.paired\.stage \|\| ''\) === 'p2'[\s\S]*?state\.phase === 'main-actions'/);
});

test('setup placement turns show a red Your Turn banner above the action bar', () => {
  assert.match(indexHtml, /id="placementTurnBanner"[^>]*>Your Turn<\/div>/);
  assert.match(styles, /\.placementTurnBanner\{?[\s\S]*?color:#ff2638/);
  assert.match(appJs, /'setup1-settlement', 'setup1-road'/);
  assert.match(appJs, /'setup2-settlement', 'setup2-road'/);
  assert.match(appJs, /ui\.placementTurnBanner\.classList\.toggle\('hidden', !showPlacementTurn\)/);
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


test('ships placed during the current action opportunity cannot be moved immediately', () => {
  assert.match(serverJs, /markShipPlacedThisOpportunity\(game, edgeId, playerId\)/);
  assert.match(serverJs, /shipWasPlacedThisOpportunity\(game, fromEdgeId, playerId\)/);
  assert.match(serverJs, /A ship just placed cannot be moved until your next turn or extra turn/);
  assert.match(appJs, /function shipMoveOpportunityKeyClient\(st = state, playerId = myPlayerId\)/);
  assert.match(appJs, /function shipWasPlacedThisOpportunityClient\(edgeId, st = state, playerId = myPlayerId\)/);
  assert.match(appJs, /shipWasPlacedThisOpportunityClient\(edgeId\)[\s\S]*?A ship just placed cannot be moved/);
});
