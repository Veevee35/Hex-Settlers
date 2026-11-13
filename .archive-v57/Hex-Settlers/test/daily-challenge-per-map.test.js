'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { challengeDayId, dailyChallengeAttemptKey, hasDailyChallengeAttempt } = require('../server/challenge-maps');
const server = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
const client = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');

const day = '2026-11-11';

test('each of the five Daily capacities has a distinct server-side attempt key', () => {
  const attempts = {};
  for (const count of [4, 5, 6, 7, 8]) {
    assert.equal(hasDailyChallengeAttempt(attempts, day, count), false);
    attempts[dailyChallengeAttemptKey(day, count)] = { playerCount: count, roomCode: `TEST${count}` };
    assert.equal(hasDailyChallengeAttempt(attempts, day, count), true);
    for (const other of [4, 5, 6, 7, 8].filter(other => other !== count && !attempts[dailyChallengeAttemptKey(day, other)])) {
      assert.equal(hasDailyChallengeAttempt(attempts, day, other), false);
    }
  }
  assert.equal(Object.keys(attempts).length, 5);
});

test('legacy single daily marker consumes only its historical player count', () => {
  const attempts = { [day]: { roomCode: 'PREV', playerCount: 6, startedAt: 100 } };
  assert.equal(hasDailyChallengeAttempt(attempts, day, 6), true);
  for (const count of [4, 5, 7, 8]) assert.equal(hasDailyChallengeAttempt(attempts, day, count), false);
  attempts[dailyChallengeAttemptKey(day, 4)] = { roomCode: 'NEW', playerCount: 4 };
  assert.equal(hasDailyChallengeAttempt(attempts, day, 4), true);
  assert.equal(hasDailyChallengeAttempt(attempts, day, 6), true);
  assert.equal(hasDailyChallengeAttempt(attempts, day, 5), false);
});

test('new reset day starts with five unused attempts, including before 1 AM Central', () => {
  const attempts = { [dailyChallengeAttemptKey(day, 4)]: { playerCount: 4 } };
  assert.equal(challengeDayId(Date.parse('2026-11-12T06:59:00Z')), day); // 00:59 CST
  assert.equal(challengeDayId(Date.parse('2026-11-12T07:00:00Z')), '2026-11-12'); // 01:00 CST
  assert.equal(hasDailyChallengeAttempt(attempts, '2026-11-12', 4), false);
});

test('server checks and claims daily attempts per map and only rolls back that map', () => {
  assert.match(server, /hasDailyChallengeAttempt\(findUserById\(ws\._userId\)\?\.dailyChallengeAttempts, dailyId, requestedSize\)/);
  assert.match(server, /hasDailyChallengeAttempt\(user\.dailyChallengeAttempts, currentId, room\.challenge\.playerCount\)/);
  assert.match(server, /dailyUser\.dailyChallengeAttempts\[dailyAttemptKey\] =/);
  assert.match(server, /delete dailyUser\.dailyChallengeAttempts\[dailyAttemptKey\]/);
  assert.doesNotMatch(server, /dailyChallengeAttempts\[dailyId\] =/);
});

test('client renders attempted status from the selected map rather than the whole day', () => {
  assert.match(server, /return \{ playerCount, attempted: kind === 'daily'/);
  assert.match(client, /play\.disabled = selectedChallengeKind === 'daily' && !!map\.attempted/);
  assert.doesNotMatch(client, /play\.disabled = selectedChallengeKind === 'daily' && !!catalog\.attempted/);
  assert.match(client, /One attempt for each of the five daily maps/);
});
