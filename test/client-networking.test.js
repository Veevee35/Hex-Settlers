'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const appJs = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'app.js'), 'utf8');

test('browser networking keeps only one reconnect timer and ignores retired sockets', () => {
  assert.match(appJs, /function scheduleWebsocketReconnect\(delayMs\)[\s\S]*?clearTimeout\(websocketReconnectTimer\)/);
  assert.match(appJs, /const activeSocket = ws;[\s\S]*?ws = null;[\s\S]*?scheduleWebsocketReconnect\(0\)/);

  const staleSocketGuards = appJs.match(/if \(ws !== socket\)/g) || [];
  assert.ok(staleSocketGuards.length >= 3, 'open, close, and message handlers all reject stale sockets');
  assert.match(appJs, /socket\.addEventListener\('close',[\s\S]*?scheduleWebsocketReconnect\(delay\)/);
});

test('browser sends tolerate a socket closing between the ready-state check and send', () => {
  assert.match(appJs, /function send\(obj\)[\s\S]*?try \{ ws\.send\(JSON\.stringify\(obj\)\); \}[\s\S]*?ws\.close\(\)/);
});

test('lobby room updates do not read game-only state before the preview arrives', () => {
  assert.match(appJs, /const inGame = !!state && state\.phase !== 'lobby';[\s\S]*?if \(!inGame \|\| paused\) \{/);
});
