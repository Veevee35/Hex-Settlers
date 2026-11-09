'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root,file), 'utf8');
const html = read('public/index.html'), js = read('public/app.js'), css = read('public/styles.css');
const server = read('server.js'), protocol = read('server/protocol.js');

test('v34 friend-only history filter and portable replays are wired in both Game Log and History', () => {
  for (const id of ['historyFriendsOnly','historyDownloadSelectedBtn','historyUploadReplayBtn',
    'historyUploadReplayInput','logReplayExportBtn','logReplayImportBtn']) {
    assert.ok(html.includes(`id="${id}"`), `${id} exists`);
  }
  assert.match(js, /historyState\.friendIds = new Set/);
  assert.match(js, /historyState\.friendsOnly/);
  assert.match(js, /hex-settlers-replay-pack/);
  assert.match(js, /indexedDB\.open\('hexsettlers-offline-replays'/);
  assert.match(js, /replayLibraryOp\('put'/);
  assert.match(js, /replayLibraryOp\('getAll'/);
});

test('v53 casual supports human invitations and keeps matchmaking history untouched', () => {
  assert.ok(html.includes('id="casualModeBtn"'));
  assert.match(js, /if \(mode === 'casual' && !room\)/);
  assert.match(js, /send\(\{ type: 'create_room', displayName, casual: selectedPlayMode === 'casual'/);
  assert.match(server, /room\.casual = msg\.casual === true;/);
  assert.doesNotMatch(server, /if \(room\.casual\) addAIPlayersToRoom\(room, 4\)/);
  assert.match(server, /room\._dryRun \|\| room\.casual/);
  assert.doesNotMatch(server, /invitedRoom\.casual \|\| !senderInRoom/);
  assert.doesNotMatch(css, /body\.casual-mode #joinBtn[^\n]*display:none!important/);
});

test('v34 Classic 4 and Classic 5–6 expose custom map files and an adjustable settings sidebar', () => {
  for (const id of ['classicCustomMapToggle', 'customMapDownloadBtn', 'customMapUploadBtn', 'lobbyPanelSplitter']) {
    assert.ok(html.includes(`id="${id}"`));
  }
  assert.match(server, /function customMapEnabled\(rules\)/);
  assert.match(server, /'hex-settlers-custom-map'/);
  assert.match(protocol, /'download_custom_map', 'upload_custom_map'/);
  assert.match(js, /setLobbyPanelWidth\(/);
  assert.match(css, /--lobby-sidebar-width/);
});
