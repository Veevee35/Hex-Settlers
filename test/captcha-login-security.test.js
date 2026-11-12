'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  LOGIN_LOCK_MS, CAPTCHA_AFTER_FAILURES, LOCK_AFTER_FAILURES,
  loginState, recordFailedLogin, clearLoginFailures, cleanupUnknownLogins,
} = require('../server/login-protection');
const { turnstileConfig, verifyTurnstile } = require('../server/turnstile');
const { beginOAuth, finishOAuth } = require('../server/oauth-login');

const t0 = Date.now();

test('two failures trigger CAPTCHA; the fifth locks the account for twenty minutes', () => {
  const user = { id: 'A', username: 'player' };
  assert.equal(CAPTCHA_AFTER_FAILURES, 2);
  assert.equal(LOCK_AFTER_FAILURES, 5);
  assert.equal(LOGIN_LOCK_MS, 20 * 60 * 1000);
  assert.equal(loginState(user, 'player', t0).captchaRequired, false);
  recordFailedLogin(user, 'player', t0);
  assert.equal(loginState(user, 'player', t0).failures, 1);
  recordFailedLogin(user, 'player', t0 + 1);
  assert.equal(loginState(user, 'player', t0 + 2).captchaRequired, true);
  recordFailedLogin(user, 'player', t0 + 3);
  recordFailedLogin(user, 'player', t0 + 4);
  const fifth = recordFailedLogin(user, 'player', t0 + 5);
  assert.equal(fifth.failures, 5);
  assert.equal(fifth.lockedUntil, t0 + 5 + LOGIN_LOCK_MS);
  assert.equal(loginState(user, 'player', t0 + 10000).lockedUntil, fifth.lockedUntil);
  assert.equal(loginState(user, 'player', fifth.lockedUntil).failures, 0);
  assert.equal('loginProtection' in user, false);
});

test('password change immediately removes the lock; a successful login resets attempts', () => {
  const user = { id: 'B' };
  for (let n = 0; n < 5; n++) recordFailedLogin(user, 'player', t0 + n);
  clearLoginFailures(user);
  assert.deepEqual(loginState(user, 'player', t0 + 5), { failures: 0, lockedUntil: 0, captchaRequired: false });
});

test('existing-account login state is persisted on record and independent of alias', () => {
  const user = { id: 'C', username: 'player', email: 'player@example.com' };
  recordFailedLogin(user, 'player', t0);
  recordFailedLogin(user, 'player@example.com', t0 + 1);
  const restored = JSON.parse(JSON.stringify(user));
  assert.equal(loginState(restored, 'player', t0 + 2).captchaRequired, true);
  assert.equal(loginState(restored, 'player@example.com', t0 + 2).failures, 2);
});

test('unknown identifiers also require CAPTCHA and lock, without storing raw identifiers', () => {
  const unknown = `nonexistent-${Math.random().toString(36).slice(2)}`;
  recordFailedLogin(null, unknown, t0);
  recordFailedLogin(null, unknown, t0 + 1);
  assert.equal(loginState(null, unknown.toUpperCase(), t0 + 1).captchaRequired, true);
  for (let i = 2; i < 5; i++) recordFailedLogin(null, unknown, t0 + i);
  assert.equal(loginState(null, unknown, t0 + 10).failures, 5);
  cleanupUnknownLogins(t0 + LOGIN_LOCK_MS + 10);
  assert.equal(loginState(null, unknown, t0 + LOGIN_LOCK_MS + 10).failures, 0);
});

test('Turnstile verifies success, action, hostname, and five-minute validity', async () => {
  let calls = 0;
  const fetchImpl = async (url, options) => {
    calls++;
    assert.equal(url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify');
    assert.equal(options.method, 'POST');
    const form = new URLSearchParams(options.body);
    assert.equal(form.get('secret'), 'backend-secret');
    assert.equal(form.get('response'), 'user-token');
    assert.equal(form.get('remoteip'), '203.0.113.8');
    return { ok: true, json: async () => ({ success: true, hostname: 'hexsettlers.org', action: 'login', challenge_ts: new Date().toISOString() }) };
  };
  assert.equal((await verifyTurnstile('user-token', { secret: 'backend-secret', action: 'login', hostname: 'hexsettlers.org', remoteIp: '203.0.113.8', fetchImpl })).ok, true);
  assert.equal((await verifyTurnstile('user-token', { secret: 'backend-secret', action: 'register', hostname: 'hexsettlers.org', fetchImpl })).ok, false);
  assert.equal((await verifyTurnstile('user-token', { secret: 'backend-secret', action: 'login', hostname: 'admin.hexsettlers.org', fetchImpl })).ok, false);
  assert.equal((await verifyTurnstile('', { secret: 'backend-secret', action: 'login', fetchImpl })).ok, false);
  assert.equal((await verifyTurnstile('user-token', { secret: '', action: 'login', fetchImpl })).ok, false);
  assert.equal(calls, 3);
});

test('Turnstile fails closed for offline, expired, rejected or malformed responses', async () => {
  const opts = { secret: 'server-only', action: 'register', hostname: 'hexsettlers.org' };
  assert.equal((await verifyTurnstile('test', { ...opts, fetchImpl: async () => { throw Error('offline'); } })).ok, false);
  assert.equal((await verifyTurnstile('test', { ...opts, fetchImpl: async () => ({ ok: false }) })).ok, false);
  assert.equal((await verifyTurnstile('test', { ...opts, fetchImpl: async () => ({ ok: true, json: async () => ({ success: false }) }) })).ok, false);
  assert.equal((await verifyTurnstile('test', { ...opts, fetchImpl: async () => ({ ok: true, json: async () => ({ success: true, action: 'register', hostname: 'hexsettlers.org', challenge_ts: new Date(Date.now() - 10 * 60 * 1000).toISOString() }) }) })).ok, false);
  assert.deepEqual(turnstileConfig({ TURNSTILE_SITE_KEY: 'site', TURNSTILE_SECRET_KEY: 'secret' }), { siteKey: 'site', secret: 'secret' });
});

test('encrypted OAuth flow distinguishes verified registration from existing-account login', async () => {
  const env = { OAUTH_STATE_SECRET: 'x'.repeat(64), OAUTH_GOOGLE_CLIENT_ID: 'client', OAUTH_GOOGLE_CLIENT_SECRET: 'secret' };
  const baseUrl = 'https://hexsettlers.org';
  async function finish(allowRegistration) {
    const flow = beginOAuth({ provider: 'google', baseUrl, env, allowRegistration });
    const callback = `/api/auth/oauth/google/callback?code=code&state=${new URL(flow.location).searchParams.get('state')}`;
    const fetchImpl = async url => ({ ok: true, json: async () => url.endsWith('/token')
      ? { access_token: 'a', token_type: 'Bearer' }
      : { sub: 'new-user', name: 'New User', email_verified: true } });
    return (await finishOAuth({ provider: 'google', callbackUrl: callback, cookieHeader: flow.cookie.split(';')[0], baseUrl, env, fetchImpl })).flow.allowRegistration;
  }
  assert.equal(await finish(false), false);
  assert.equal(await finish(true), true);
});
