'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');
const {
  SlidingWindowRateLimiter,
  derivePasswordHash,
  hashSessionToken,
  migrateLegacySessionToken,
  sessionTokenMatches,
  verifyPasswordHash,
} = require('../server/security');

test('password hashes remain verifiable without blocking-compatible format changes', async () => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await derivePasswordHash('correct horse battery staple', salt);
  assert.equal(await verifyPasswordHash('correct horse battery staple', { salt, hash }), true);
  assert.equal(await verifyPasswordHash('wrong', { salt, hash }), false);
});

test('session tokens are stored as hashes and legacy records migrate safely', () => {
  const token = 'secret-session-token';
  const modern = { tokenHash: hashSessionToken(token) };
  assert.equal(sessionTokenMatches(modern, token), true);
  assert.equal(sessionTokenMatches(modern, `${token}x`), false);

  const legacy = { token };
  assert.equal(migrateLegacySessionToken(legacy, token), true);
  assert.equal(legacy.token, undefined);
  assert.equal(legacy.tokenHash, hashSessionToken(token));
  assert.equal(sessionTokenMatches(legacy, token), true);
});

test('sliding-window limiter allows the configured attempts and reports retry time', () => {
  let now = 1_000;
  const limiter = new SlidingWindowRateLimiter({ maxAttempts: 2, windowMs: 500, clock: () => now });
  assert.equal(limiter.consume('client').allowed, true);
  assert.equal(limiter.consume('client').allowed, true);
  const blocked = limiter.consume('client');
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterMs, 500);
  now += 501;
  assert.equal(limiter.consume('client').allowed, true);
});
