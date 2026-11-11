import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const mfa = require('../server/admin-mfa.js');
import { isAdminHost, isAllowedAdminPortalPath, isMfaPublicPath,
  isAdminMfaInternalPath, isPrivatePortalAsset } from '../cloudflare/admin-routing.mjs';
const source = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('TOTP follows RFC6238 SHA1, accepts 6 digits and stops replay', () => {
  const secret = mfa.base32(Buffer.from('12345678901234567890'));
  assert.equal(mfa.hotp(secret, 1), '287082'); // RFC6238: 94287082 truncated to 6 digits at 59 sec
  assert.equal(mfa.verifyTotp(secret, '287082', 59_000), 1);
  assert.equal(mfa.verifyTotp(secret, '287082', 59_000, 1), null);
  assert.equal(mfa.verifyTotp(secret, ' 287082 ', 59_000), 1);
  assert.equal(mfa.verifyTotp(secret, '287082-', 59_000), null);
});

test('fresh TOTP secret is random, encrypted with AES-GCM and cannot be read under a different key', () => {
  const a = mfa.newSecret(), b = mfa.newSecret();
  assert.match(a, /^[A-Z2-7]{32}$/);
  assert.notEqual(a, b);
  assert.deepEqual(mfa.unbase32(a), mfa.unbase32(mfa.base32(mfa.unbase32(a))));
  const key = mfa.encryptionKey(Buffer.alloc(32, 12).toString('base64'));
  assert.equal(key.length, 32);
  assert.equal(mfa.encryptionKey('weak-secret'), null);
  const record = mfa.encryptedSecret(a, key);
  assert.equal(record.version, 1);
  assert.ok(!JSON.stringify(record).includes(a));
  assert.equal(mfa.decryptedSecret(record, key), a);
  assert.equal(mfa.decryptedSecret(record, Buffer.alloc(32, 13)), null);
  record.tag = Buffer.alloc(16, 0).toString('base64');
  assert.equal(mfa.decryptedSecret(record, key), null);
});

test('recovery codes are single-use, high entropy and stored only as hashes', () => {
  const codes = mfa.recoveryCodes();
  assert.equal(codes.length, 10);
  assert.equal(new Set(codes).size, 10);
  const record = { recoveryHashes: codes.map(mfa.recoveryHash) };
  assert.equal(JSON.stringify(record).includes(codes[0]), false);
  assert.equal(mfa.consumeRecoveryCode(record, codes[0].toLowerCase()), true);
  assert.equal(mfa.consumeRecoveryCode(record, codes[0]), false);
  assert.equal(mfa.consumeRecoveryCode(record, 'invalid'), false);
  assert.equal(record.recoveryHashes.length, 9);
});

test('MFA cookies are host-only HTTP-only and 8h sessions require valid matching account session', () => {
  const cookie = mfa.cookie(mfa.COOKIE_MFA, 'opaque', mfa.SESSION_MS / 1000);
  assert.match(cookie, /^__Host-/);
  for (const flag of ['Path=/', 'HttpOnly', 'SameSite=Strict', 'Secure']) assert.ok(cookie.includes(flag));
  assert.ok(!cookie.includes('Domain='));
  const user = { adminMfa: { enabledAt: Date.now() }, adminMfaSessions: [] };
  const normal = mfa.token(); const mfaToken = mfa.createSession(user, normal);
  assert.equal(mfa.validSession(user, mfaToken, normal), true);
  assert.equal(mfa.validSession(user, mfaToken, mfa.token()), false);
  assert.equal(mfa.validSession(user, mfa.token(), normal), false);
  assert.equal(mfa.validSession(user, mfaToken, normal, Date.now() + mfa.SESSION_MS + 1), false);
  assert.equal(mfa.revokeSession(user, mfaToken), true);
  assert.equal(mfa.validSession(user, mfaToken, normal), false);
});

test('MFA login is only possible on exact admin host; internal check never publicly available', () => {
  assert.equal(isAdminHost(new Request('https://admin.hexsettlers.org/')), true);
  assert.equal(isAdminHost(new Request('https://hexsettlers.org/')), false);
  assert.equal(isAdminHost(new Request('https://admin.hexsettlers.org.attacker.test/')), false);
  assert.equal(isMfaPublicPath('/admin-login.html'), true);
  assert.equal(isPrivatePortalAsset('/admin-login.html'), true);
  assert.equal(isMfaPublicPath('/api/admin/mfa/login'), true);
  assert.equal(isMfaPublicPath('/api/admin/mfa/check'), false);
  assert.equal(isAdminMfaInternalPath('/api/admin/mfa/check'), true);
  assert.equal(isMfaPublicPath('/'), false);
  assert.equal(isMfaPublicPath('/api/admin/rooms'), false);
  assert.equal(isAllowedAdminPortalPath('/api/admin/mfa/login'), true);
  assert.equal(isAllowedAdminPortalPath('/ws'), false);
});

test('Worker gates all admin pages, assets and APIs through backend revocation check', () => {
  const worker = source('cloudflare/container-worker.mjs');
  assert.match(worker, /!isMfaPublicPath\(path\)/);
  assert.match(worker, /\/api\/admin\/mfa\/check/);
  assert.match(worker, /backend\.fetch\(probe\)/);
  assert.match(worker, /!adminHost && \(isAdminApiPath\(path\) \|\| isPrivatePortalAsset\(path\)\)/);
  assert.match(worker, /if \(adminHost && \(!isAllowedAdminPortalPath\(path\) \|\| isAdminMfaInternalPath\(path\)\)\)/);
  assert.match(worker, /HEX_ADMIN_MFA_ENCRYPTION_KEY/);
});

test('Admin requests require MFA, CSRF and role checks; no public admin access through account APIs', () => {
  const server = source('server.js');
  const app = source('public/app.js');
  assert.match(server, /if \(!mfa\) \{ sendHttpJson\(req, res, 401, \{ ok: false, error: 'Administrator MFA required\.' \}\)/);
  assert.match(server, /if \(!validAdminCsrf\(req, mfa\)\)/);
  assert.match(server, /if \(!isAdminUser\(admin\)\)/);
  assert.match(server, /process\.env\.HEX_ADMIN_HOST && requestIsAdminHostname\(req\)/);
  assert.match(server, /if \(requestIsAdminHostname\(req\) && process\.env\.HEX_ADMIN_HOST\)/);
  assert.match(app, /'X-Hex-Admin-CSRF'/);
  assert.match(app, /\/api\/admin\/mfa\/status/);
});


test('public OAuth callbacks cannot create or link administrator sessions as an MFA bypass', () => {
  const server = source('server.js');
  assert.match(server, /if \(isAdminUser\(user\) && process\.env\.HEX_ADMIN_HOST\)\s*throw new Error\('Administrators must use password and authenticator sign-in\.'\)/);
  assert.match(server, /if \(intent === 'link' && isAdminUser\(viewer\) && process\.env\.HEX_ADMIN_HOST && !requestIsAdminHostname\(req\)\)/);
  assert.match(server, /if \(isAdminUser\(viewer\) && process\.env\.HEX_ADMIN_HOST && !requestIsAdminHostname\(req\)\)\s*throw new Error\('Administrator OAuth accounts cannot be linked from the public game\.'\)/);
});
