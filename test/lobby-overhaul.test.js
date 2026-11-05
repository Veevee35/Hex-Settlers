'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const protocol = fs.readFileSync(path.join(root, 'src', 'shared', 'protocol.ts'), 'utf8');

test('landing page owns login and account creation requires email verification', () => {
  assert.match(html, /id="authLanding"[\s\S]*?src="\/favicon\.png"[\s\S]*?id="landingLoginBtn"/);
  assert.match(html, /id="registerOverlay"[\s\S]*?id="registerEmail"[\s\S]*?Send Verification/);
  assert.match(app, /authApi\('register-with-email'/);
  assert.match(server, /urlPath === '\/api\/auth\/register-with-email'/);
  assert.match(server, /requiresEmailVerification && !user\.emailVerifiedAt/);
});

test('authenticated portal offers ranked and unranked paths plus an account menu', () => {
  assert.match(html, /id="playModeScreen"[\s\S]*?id="rankedModeBtn"[\s\S]*?id="unrankedModeBtn"/);
  assert.match(html, /id="accountOrb"[\s\S]*?id="accountManageBtn"[\s\S]*?id="friendsBtn"[\s\S]*?id="accountLogoutBtn"/);
  assert.match(html, /id="accountOrb"[^>]*aria-expanded="false"[^>]*aria-controls="accountMenu"/);
  assert.match(app, /document\.addEventListener\('click'[\s\S]*?menu\.contains\(target\)[\s\S]*?setAccountMenuOpen\(false\)/);
  assert.match(html, /class="legacyLobbyAuth hidden"/);
});

test('ranked matchmaking is server authoritative and preference based', () => {
  assert.match(protocol, /'ranked_queue_join', 'ranked_queue_leave'/);
  assert.match(app, /type: 'ranked_queue_join'[\s\S]*?mapMode:[\s\S]*?playerCount:/);
  assert.match(server, /msg\.type === 'ranked_queue_join'[\s\S]*?const bucket = Math\.floor\(rating \/ 200\)/);
  assert.match(server, /rankedRoom\.ranked = true[\s\S]*?startGame\(rankedRoom\)/);
  const rankedOptions = html.match(/id="rankedScreen"[\s\S]*?<\/section>/)?.[0] || '';
  assert.match(rankedOptions, /value="classic">Classic/);
  assert.match(rankedOptions, /value="seafarers">Seafarers/);
  assert.doesNotMatch(rankedOptions, /Classic 5–6|<option>3<\/option>/);
  for (const count of [4, 5, 6]) assert.match(rankedOptions, new RegExp(`<option(?: selected)?>${count}<\\/option>`));
  assert.match(rankedOptions, /id="rankedReadyBtn"[^>]*>Start Matchmaking<\/button>/);
  assert.match(server, /const key = `\$\{mapFamily\}:\$\{playerCount\}:\$\{bucket\}`/);
  assert.match(server, /mapFamily === 'classic' && playerCount > 4 \? 'classic56' : mapFamily/);
  assert.match(server, /playerCount > 4 \? 'six_islands' : 'four_islands'/);
});

test('friends persist on accounts and lobby rows support friend requests', () => {
  assert.match(server, /urlPath === '\/api\/account\/friend-request'/);
  assert.match(server, /urlPath === '\/api\/account\/friend-response'/);
  assert.match(app, /addEventListener\('contextmenu'[\s\S]*?accountApi\('friend-request'/);
  assert.match(app, /msg\.type === 'friend_request'/);
});
