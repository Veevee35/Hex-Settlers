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
  assert.match(html, /id="landingPasswordReveal"[^>]*Hold to reveal password/);
  assert.match(app, /setPasswordRevealed[\s\S]*?pointerdown[\s\S]*?pointerup[\s\S]*?pointerleave/);
  assert.match(html, /class="loginSupport"[\s\S]*?href="https:\/\/ko-fi\.com\/L6D82A3L9Z"[\s\S]*?src="https:\/\/storage\.ko-fi\.com\/cdn\/kofi6\.png\?v=6"/);
});

test('Cartographer and Scattered Tiles allow high-probability numbers on Gold Fields', () => {
  assert.match(server, /function hasGoldSixOrEight[\s\S]*?tile\.type === 'gold'[\s\S]*?tile\.number === 6 \|\| tile\.number === 8/);
  assert.match(server, /generateBoardSeafarersCartographer4[\s\S]*?hasGoldSixOrEight\(landLocal\)/);
  assert.match(server, /generateBoardSeafarersCartographer56[\s\S]*?hasGoldSixOrEight\(landLocal\)/);
  assert.match(server, /assignCartographer4NumbersRobberPirateAndPorts[\s\S]*?hasGoldSixOrEight\(cand\)/);
});

test('authenticated portal offers ranked and unranked paths plus an account menu', () => {
  assert.match(html, /id="playModeScreen"[\s\S]*?id="rankedModeBtn"[\s\S]*?id="unrankedModeBtn"/);
  assert.match(html, /id="accountOrb"[\s\S]*?id="accountManageBtn"[\s\S]*?id="friendsBtn"[\s\S]*?id="accountLogoutBtn"/);
  assert.match(html, /id="accountOrb"[^>]*aria-expanded="false"[^>]*aria-controls="accountMenu"/);
  assert.match(app, /document\.addEventListener\('click'[\s\S]*?menu\.contains\(target\)[\s\S]*?setAccountMenuOpen\(false\)/);
  assert.match(html, /class="legacyLobbyAuth hidden"/);
  assert.match(html, /id="playModeScreen"[\s\S]*?class="loginSupport gameTypeSupport"[\s\S]*?href="https:\/\/ko-fi\.com\/L6D82A3L9Z"/);
});

test('ranked matchmaking is server authoritative and preference based', () => {
  assert.match(protocol, /'ranked_queue_join', 'ranked_queue_leave'/);
  assert.match(app, /type: 'ranked_queue_join'[\s\S]*?mapMode:[\s\S]*?playerCount:/);
  assert.match(server, /function rankedRatingRange[\s\S]*?RANKED_RANGE_STEP_MS/);
  assert.match(server, /rankedRoom\.ranked = true[\s\S]*?startGame\(rankedRoom\)/);
  const rankedOptions = html.match(/id="rankedScreen"[\s\S]*?<\/section>/)?.[0] || '';
  assert.match(rankedOptions, /value="classic">Classic/);
  assert.match(rankedOptions, /value="seafarers">Seafarers/);
  assert.doesNotMatch(rankedOptions, /Classic 5–6|<option>3<\/option>/);
  for (const count of [4, 5, 6]) assert.match(rankedOptions, new RegExp(`<option(?: selected)?>${count}<\\/option>`));
  assert.match(rankedOptions, /id="rankedReadyBtn"[^>]*>Start Matchmaking<\/button>/);
  assert.match(server, /const key = `\$\{mapFamily\}:\$\{playerCount\}`/);
  assert.match(server, /processRankedQueue[\s\S]*?Math\.abs\(entry\.rating - anchor\.rating\) <= range/);
  assert.match(server, /mapFamily === 'classic' && playerCount > 4 \? 'classic56' : mapFamily/);
  assert.match(server, /playerCount > 4 \? 'six_islands' : 'four_islands'/);
});

test('friends persist on accounts and lobby rows support friend requests', () => {
  assert.match(server, /urlPath === '\/api\/account\/friend-request'/);
  assert.match(server, /urlPath === '\/api\/account\/friend-response'/);
  assert.match(app, /addEventListener\('contextmenu'[\s\S]*?accountApi\('friend-request'/);
  assert.match(app, /msg\.type === 'friend_request'/);
  assert.match(server, /urlPath === '\/api\/account\/profile'[\s\S]*?gamesPlayed[\s\S]*?totalVP/);
  assert.match(app, /function openPlayerProfile[\s\S]*?playerProfileStats[\s\S]*?Average VP/);
  assert.match(app, /playerProfileLink[\s\S]*?openPlayerProfileById\(p\.id\)/);
  assert.match(app, /friendRowProfile[\s\S]*?openPlayerProfileById\(friend\.id\)/);
});
