'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const appJs = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const serverJs = fs.readFileSync(path.join(root, 'server.js'), 'utf8');

test('lobby readiness is visible and enforced by the server', () => {
  assert.match(indexHtml, /id="readyBtn"[^>]*>Ready<\/button>/);
  assert.match(appJs, /send\(\{ type: 'set_ready', ready: me\.ready !== true \}\)/);
  assert.match(appJs, /const allPlayersReady = [\s\S]*?every/);
  assert.match(serverJs, /if \(msg\.type === 'set_ready'\)/);
  assert.match(serverJs, /const unready = unreadyHumanRoomPlayers\(room\)/);
  assert.match(serverJs, /All players must be ready before starting/);
});

test('proposed trades stay open while responders can change their response', () => {
  assert.match(appJs, /let pendingTradePromptId = 0/);
  assert.match(appJs, /try \{ handlePendingTradePrompt\(\); \} catch \(_\) \{\}/);
  assert.match(appJs, /modalActions\.push\(\{ label: 'Reject'/);
  assert.match(appJs, /modalActions\.push\(\{ label: 'Accept', primary: true/);
  assert.match(appJs, /const respond = \(accept\) => \{\s*sendGameAction\(\{ kind: 'respond_trade', tradeId: t\.id, accept \}\);\s*\}/);
  assert.doesNotMatch(appJs, /clicking an accepted player's checkmark/);
  assert.doesNotMatch(serverJs, /allReject/);
  assert.match(serverJs, /If a player clicks approve but cannot afford[\s\S]*?accept = false/);
});

test('discard timers are 30 seconds without changing other micro-action timers', () => {
  assert.match(serverJs, /case 'discard':\s*return 30_000;/);
  assert.match(serverJs, /case 'robber-move':\s*return micro;/);
});

test('Monopoly logs the total and per-player resource breakdown', () => {
  assert.match(serverJs, /stolenFrom\.push\(\{ playerId: op\.id, playerName: playerName\(game, op\.id\), resourceKind: rk, amount: n \}\)/);
  assert.match(serverJs, /stolenFrom\.map\(\(entry\) => `\$\{entry\.amount\} \$\{rk\} from \$\{entry\.playerName\}`\)/);
  assert.match(serverJs, /pushLog\(game, monopolyText, 'dev', \{ card: 'monopoly', resourceKind: rk, total, stolenFrom \}\)/);
});

test('the host can select a persisted server-authoritative dice algorithm', () => {
  assert.match(indexHtml, /id="diceAlgorithmSelect"/);
  for (const mode of ['random', 'balanced', 'probability_corrected', 'streak_breaker']) {
    assert.match(indexHtml, new RegExp(`<option value="${mode}"`));
  }
  assert.match(appJs, /diceAlgorithm: normalizeDiceAlgorithmClient\(ui\.diceAlgorithmSelect\?\.value\)/);
  assert.match(serverJs, /next\.diceAlgorithm = normalizeDiceAlgorithm/);
  assert.match(serverJs, /rollDiceWithAlgorithm\(game\)/);
  assert.match(serverJs, /diceAlgorithmState: undefined/);
});

test('texture packs can be changed from the in-game tools bar', () => {
  assert.match(indexHtml, /id="texturePackBtn"[^>]*>Change Texture Pack<\/button>/);
  assert.match(appJs, /ui\.diceBtn, ui\.texturePackBtn, ui\.chatBtn/);
  assert.match(appJs, /function openTexturePackModal\(\)/);
  assert.match(appJs, /setActiveTexturePackById\(targetId, \{ announce: true, forcePublish: false \}\)/);
  assert.match(appJs, /ui\.texturePackBtn\.addEventListener\('click', \(\) => openTexturePackModal\(\)\)/);
});

test('port artwork is centered by visible pixels instead of inconsistent transparent padding', () => {
  assert.match(appJs, /const visibleImageBoundsCache = new WeakMap\(\)/);
  assert.match(appJs, /function visibleImageBounds\(image\)[\s\S]*?getImageData/);
  assert.match(appJs, /function drawVisibleImageCentered\(context, image, centerX, centerY, boxSize\)/);
  assert.match(appJs, /drawVisibleImageCentered\(ctx, portImg, ps\.x, ps\.y, sz \* 0\.94\)/);
  assert.doesNotMatch(appJs, /drawImage\(portImg, ps\.x - sz \/ 2, ps\.y - sz \/ 2, sz, sz\)/);
});
