import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { trustedClientIp } from '../cloudflare/client-identity.mjs';

const require = createRequire(import.meta.url);
const { base32Encode, newTotpSecret, totpAt, verifyTotp, totpUri } = require('../server/admin-totp');
const source = fs.readFileSync(new URL('../server.js', import.meta.url), 'utf8');
const client = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');

test('TOTP matches RFC 6238 SHA1 vectors and rejects a reused time step', () => {
  const secret = base32Encode(Buffer.from('12345678901234567890'));
  assert.equal(totpAt(secret, 1), '287082');
  assert.equal(verifyTotp(secret, '287082', { timestamp: 59000, lastStep: -1 }), 1);
  assert.equal(verifyTotp(secret, '287082', { timestamp: 59000, lastStep: 1 }), null);
  assert.equal(verifyTotp(secret, '28708 ', { timestamp: 59000 }), null);
});

test('TOTP enrollment issues random secrets and standard authenticator URIs', () => {
  const secret = newTotpSecret();
  assert.match(secret, /^[A-Z2-7]{32}$/);
  assert.notEqual(secret, newTotpSecret());
  assert.match(totpUri(secret, 'Example'), /^otpauth:\/\/totp\//);
});

test('Cloudflare identity ignores a forged XFF and uses only edge client IP', () => {
  assert.equal(trustedClientIp(new Request('https://hexsettlers.org/ws', { headers: {
    'CF-Connecting-IP': '203.0.113.41', 'X-Forwarded-For': '1.2.3.4',
  } })), '203.0.113.41');
  assert.equal(trustedClientIp(new Request('https://hexsettlers.org/ws', { headers: { 'X-Forwarded-For': '1.2.3.4' } })), 'unknown');
  assert.equal(trustedClientIp(new Request('https://hexsettlers.org/ws', { headers: { 'CF-Connecting-IP': '2001:db8::41' } })), '2001:db8::41');
  assert.equal(trustedClientIp(new Request('https://hexsettlers.org/ws', { headers: { 'CF-Connecting-IP': 'not-an-ip' } })), 'unknown');
});

test('legacy anonymous rejoin and reset-on-success limiter paths are absent', () => {
  assert.doesNotMatch(source, /rejoinRoom\(code,\s*msg\.playerId\)/);
  assert.match(source, /rejoinRoom\(code, ws\._userId\)/);
  assert.doesNotMatch(source, /passwordAuthLimiter\.clear/);
  assert.match(source, /requireAdminMfa: true|requireAdminMfa: !!process\.env\.HEX_ADMIN_HOST/);
  assert.match(source, /process\.env\.NODE_ENV !== 'test'/);
  assert.doesNotMatch(client, /localStorage\.setItem\(AUTH_TOKEN_KEY/);
  assert.doesNotMatch(client, /send\(\{ type: 'auth_token', token: t \}\)/);
});
