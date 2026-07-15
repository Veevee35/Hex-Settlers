'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { test } = require('node:test');
const {
  SlidingWindowRateLimiter,
  derivePasswordHash,
  hashSessionToken,
  migrateLegacySessionToken,
  sessionTokenMatches,
  verifyPasswordHash,
} = require('../server/security');

test('password hashes verify asynchronously with the existing PBKDF2 format', async () => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await derivePasswordHash('correct horse', salt);
  assert.equal(await verifyPasswordHash('correct horse', { salt, hash }), true);
  assert.equal(await verifyPasswordHash('wrong horse', { salt, hash }), false);
});

test('new session records store only hashes and legacy records migrate', () => {
  const token = 'a bearer token';
  const current = { tokenHash: hashSessionToken(token) };
  assert.equal(sessionTokenMatches(current, token), true);
  assert.equal(sessionTokenMatches(current, 'wrong'), false);

  const legacy = { token };
  assert.equal(migrateLegacySessionToken(legacy, token), true);
  assert.equal(legacy.token, undefined);
  assert.equal(sessionTokenMatches(legacy, token), true);
});

test('rate limiter resets after its sliding window', () => {
  let now = 1_000;
  const limiter = new SlidingWindowRateLimiter({ maxAttempts: 2, windowMs: 100, clock: () => now });
  assert.equal(limiter.consume('ip').allowed, true);
  assert.equal(limiter.consume('ip').allowed, true);
  assert.equal(limiter.consume('ip').allowed, false);
  now += 101;
  assert.equal(limiter.consume('ip').allowed, true);
});
