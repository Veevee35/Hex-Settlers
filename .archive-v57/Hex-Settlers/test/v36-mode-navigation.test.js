'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const root = join(__dirname, '..');
const app = readFileSync(join(root, 'public/app.js'), 'utf8');
const server = readFileSync(join(root, 'server.js'), 'utf8');
const css = readFileSync(join(root, 'public/styles.css'), 'utf8');

test('game type changes use server-acknowledged room exit before choosing new mode', () => {
  assert.match(app, /pendingPlayModeSwitch = mode;[\s\S]{0,100}send\(\{ type: 'leave_room', switchMode: mode \}\)/);
  assert.match(app, /const switchedTo = pendingPlayModeSwitch && msg\.switchMode === pendingPlayModeSwitch/);
  assert.match(app, /handleLocalRoomExit\(''\);\s*activatePlayMode\(switchedTo, \{ skipRecentRoom: true \}\)/);
  assert.match(server, /const switchMode = \['ranked', 'unranked', 'casual', 'journey'\]\.includes\(msg\.switchMode\)/);
  assert.match(server, /!remainingHumans\.length && \(\!room\.game[\s\S]{0,600}rooms\.delete\(code\)/);
  assert.match(server, /sort\(\(a,\s*b\) => Number\(a\.joinedAt \|\| 0\) - Number\(b\.joinedAt \|\| 0\)\)/);
});

test('ranked queue canceled on navigation except Player Stats, Game Log and Friends overlays', () => {
  assert.match(app, /function stopRankedMatchmaking\(\)/);
  assert.match(app, /\$\('changeModeBtn'\)\?\.addEventListener\('click',[\s\S]{0,550}stopRankedMatchmaking\(\)/);
  assert.match(app, /\$\('rankedCancelBtn'\)\?\.addEventListener\('click', stopRankedMatchmaking\)/);
  assert.match(app, /window\.addEventListener\('pagehide',[\s\S]{0,200}ranked_queue_leave/);
  assert.match(app, /\$\('friendsBtn'\)\?\.addEventListener\('click',[\s\S]{0,160}loadFriends\(\)/);
  assert.match(app, /\$\('accountPlayerStatsBtn'\)\?\.addEventListener\('click',[\s\S]{0,170}openHistoryOverlay\('players'\)/);
  assert.match(app, /\$\('accountGameLogBtn'\)\?\.addEventListener\('click'/);
});

test('ranked match finding closes browsing overlays and reveals joined ranked room', () => {
  const found = app.slice(app.indexOf("if (msg.type === 'ranked_match_found')"), app.indexOf("if (msg.type === 'auth_required')"));
  assert.match(found, /closeHistoryOverlay\(\)/);
  assert.match(found, /friendsOverlay'\)\?\.classList\.add\('hidden'\)/);
  assert.match(found, /setLogPanelVisible\(false\)/);
  assert.match(app, /if \(msg\.room\?\.ranked\) \{[\s\S]{0,250}closeHistoryOverlay\(\)/);
});

test('mobile mode heading wraps clear of account orb', () => {
  assert.match(css, /#playModeScreen \.modePortalCard h1 \{[\s\S]{0,180}padding-right:clamp\(45px,15vw,73px\)/);
});
