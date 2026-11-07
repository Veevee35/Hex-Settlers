'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/styles.css'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');

test('friends can enter a username without recipient enumeration', () => {
  assert.match(html, /id="friendRequestForm"/);
  assert.match(html, /id="friendUsernameInput"/);
  assert.match(js, /accountApi\('friend-request', \{ username \}\)/);
  const route = server.slice(server.indexOf("if (urlPath === '/api/account/friend-request')"), server.indexOf("if (urlPath === '/api/account/invite-to-lobby')"));
  assert.match(route, /findUserByUsername\(submittedUsername\)/);
  assert.match(route, /message: 'Request sent\.'/);
  assert.match(js, /status\.textContent = 'Request sent\.'/);
});

test('in-lobby friends get a contextual invite button and receive an actionable invitation', () => {
  assert.match(js, /const canInvite = !!\(roomConnectionReady && room\?\.code && myPlayerId && currentRoomPhase\(\) === 'lobby'\)/);
  assert.match(js, /room\.ranked \? 'Invite to Watch' : 'Invite to Lobby'/);
  assert.match(js, /accountApi\('invite-to-lobby', \{ userId: friend\.id, roomCode: room\.code \}\)/);
  assert.match(js, /msg\.type === 'lobby_invite'/);
  assert.match(js, /buildDirectJoinUrl\(code, \{ spectator: !!msg\.spectator \}\)/);
  const route = server.slice(server.indexOf("if (urlPath === '/api/account/invite-to-lobby')"), server.indexOf("if (urlPath === '/api/account/friend-response')"));
  assert.match(route, /viewer\.friendIds\.includes\(target\.id\)/);
  assert.match(route, /senderInRoom/);
  assert.match(route, /invitedRoom\.game && invitedRoom\.game\.phase !== 'lobby'/);
  assert.match(route, /type: 'lobby_invite'/);
  assert.match(route, /spectator: !!invitedRoom\.ranked/);
});

test('mobile unranked lobby has a map drawer and eliminates the permanently reserved board', () => {
  assert.match(html, /id="mobileLobbyMapToggle"/);
  assert.match(html, /id="mobileLobbyMapClose"/);
  assert.match(js, /function setMobileLobbyMapOpen\(open\)/);
  assert.match(js, /document\.body\.classList\.toggle\('hasLobbyMapPreview'/);
  assert.match(css, /body:not\(\.in-game\) \.layout>\.boardWrap\{display:none!important;\}/);
  assert.match(css, /body\.mobileLobbyMapOpen:not\(\.in-game\):not\(\.ranked-lobby\) \.layout>\.boardWrap/);
  assert.match(css, /body:not\(\.in-game\) \.layout>\.panel\{display:flex;height:100%;max-height:none/);
});

test('ranked previews use intrinsic 3:2 dimensions while hidden control rows do not take space', () => {
  assert.match(js, /preview\.width = 420;[\s\S]*?preview\.height = 280;/);
  assert.match(css, /body\.ranked-lobby \.rankedScenarioMapPreview\{[\s\S]*?aspect-ratio:3 \/ 2!important/);
  assert.match(css, /\.hudBottomLeft \.hudBtns:not\(:has\(#backTurnBtn:not\(\.hidden\),#pauseBtn:not\(\.hidden\),#playBtn:not\(\.hidden\)\)\)/);
  assert.match(css, /body\.in-game \.hudBottomLeft\{padding-bottom:calc\(5px \+ var\(--safe-bottom\)\)!important;/);
});

test('turn badges use the roll dock and map drawing clips/culls off-canvas terrain', () => {
  assert.match(js, /ui\.rollDockBtn\.insertAdjacentElement\('afterend', badges\)/);
  assert.match(js, /badges\.appendChild\(ui\.placementTurnBanner\)/);
  assert.match(js, /badges\.appendChild\(ui\.extraTurnBanner\)/);
  assert.match(css, /body\.in-game \.rollDockTurnBadges \.extraTurnBanner,[\s\S]*?position:static!important/);
  assert.match(js, /ctx\.rect\(0, 0, w, h\);\s*ctx\.clip\(\)/);
  assert.match(js, /maxDrawX < 0 \|\| minDrawX > w \|\| maxDrawY < 0 \|\| minDrawY > h/);
  assert.match(js, /pixelsWide = Math\.max\(1, Math\.round\(boardRenderRect\.width \* dpr\)\)/);
});
