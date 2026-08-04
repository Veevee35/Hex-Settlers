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
