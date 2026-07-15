'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const appJs = fs.readFileSync(path.join(projectRoot, 'public', 'app.js'), 'utf8');
const serverJs = fs.readFileSync(path.join(projectRoot, 'server.js'), 'utf8');

test('audio settings expose separate local volumes for your rolls and other players rolls', () => {
  assert.match(appJs, /\{ key: 'dice_roll_self', label: 'Your Dice Roll' \}/);
  assert.match(appJs, /\{ key: 'dice_roll_others', label: "Other Players' Dice Rolls" \}/);
  assert.match(appJs, /dice_roll_self: makeSfxPool\('assets\/sfx\/dice_roll\.wav'/);
  assert.match(appJs, /dice_roll_others: makeSfxPool\('assets\/sfx\/dice_roll\.wav'/);
});

test('legacy dice-roll volume initializes both split roll settings', () => {
  assert.match(appJs, /isSplitDiceLevel && src\.dice_roll != null \? src\.dice_roll/);
});

test('dice-roll broadcasts identify the roller and clients route the sound by local player', () => {
  assert.match(serverJs, /broadcastSfx\(room, 'dice_roll', \{ rollerId: playerId \}\)/);
  assert.match(appJs, /rollerId === localPlayerId\s*\? 'dice_roll_self'\s*:\s*'dice_roll_others'/);
  assert.match(appJs, /playSfx\(msg\.name, msg\)/);
});
