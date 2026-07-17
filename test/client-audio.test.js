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

test('audio settings split local and other-player end-turn warnings', () => {
  assert.match(appJs, /\{ key: 'end_turn_self', label: 'Your End Turn Warning' \}/);
  assert.match(appJs, /\{ key: 'end_turn_others', label: "Other Players' End Turn Warnings" \}/);
  assert.match(appJs, /isSplitEndTurnLevel && src\.end_turn != null \? src\.end_turn/);
  assert.match(appJs, /warnedPlayerId === localPlayerId\s*\? 'end_turn_self'\s*:\s*'end_turn_others'/);
});

test('dice-roll broadcasts identify the roller and clients route the sound by local player', () => {
  assert.match(serverJs, /broadcastSfx\(room, 'dice_roll', \{ rollerId: playerId \}\)/);
  assert.match(appJs, /rollerId === localPlayerId\s*\? 'dice_roll_self'\s*:\s*'dice_roll_others'/);
  assert.match(appJs, /playSfx\(msg\.name, msg\)/);
});

test('stolen-from audio is configurable and uses the supplied local sound asset', () => {
  assert.match(appJs, /\{ key: 'stolen_from', label: 'Stolen From \(Robber \/ Pirate \/ Monopoly\)' \}/);
  assert.match(appJs, /stolen_from: makeSfxPool\('assets\/sfx\/stolen_from\.wav'/);
  assert.equal(fs.existsSync(path.join(projectRoot, 'public', 'assets', 'sfx', 'stolen_from.wav')), true);
});

test('successful robber, pirate, and monopoly losses send stolen-from audio only to affected players', () => {
  assert.match(serverJs, /function sendPlayerSfx\(room, playerId, name, extra\)[\s\S]*room\.sockets\.get\(playerId\)/);
  assert.match(serverJs, /sendPlayerSfx\(room, victimId, 'stolen_from', \{ source: 'robber', thiefId: playerId, amount: 1 \}\)/);
  assert.match(serverJs, /sendPlayerSfx\(room, victimId, 'stolen_from', \{ source: 'pirate', thiefId: playerId, amount: 1 \}\)/);
  assert.match(serverJs, /if \(n > 0\) \{[\s\S]*sendPlayerSfx\(room, op\.id, 'stolen_from', \{ source: 'monopoly', thiefId: playerId, amount: n \}\)/);
});
