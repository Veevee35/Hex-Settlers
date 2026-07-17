'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  BUILTIN_ADMIN_DISPLAY_NAME,
  BUILTIN_ADMIN_MARKER,
  BUILTIN_ADMIN_USERNAME,
  generateTemporaryPassword,
  isAdminUser,
  isBuiltInAdminUser,
  isReservedAdminUsername,
  safeManagedUser,
} = require('../server/user-management');

const ROOT = path.resolve(__dirname, '..');

test('built-in administrator identity and safe user projection are explicit', () => {
  const user = {
    id: 'admin-1',
    username: BUILTIN_ADMIN_USERNAME,
    displayName: BUILTIN_ADMIN_DISPLAY_NAME,
    role: 'admin',
    systemAccount: BUILTIN_ADMIN_MARKER,
    pass: { salt: 'secret', hash: 'secret' },
    tokens: [{ tokenHash: 'secret' }],
    email: 'ben@example.com',
    emailVerifiedAt: Date.now(),
    emailVerification: { email: 'pending@example.com', tokenHash: 'secret', expiresAt: Date.now() + 1000 },
  };
  assert.equal(isReservedAdminUsername('benLEEthom'), true);
  assert.equal(isAdminUser(user), true);
  assert.equal(isBuiltInAdminUser(user), true);
  const safe = safeManagedUser(user, { includeEmail: true });
  assert.equal(safe.isAdmin, true);
  assert.equal(safe.pass, undefined);
  assert.equal(safe.tokens, undefined);
  assert.equal(safe.email, 'ben@example.com');
  assert.equal(safe.pendingEmail, 'pending@example.com');
  assert.equal(safe.emailVerification, undefined);
  assert.equal(generateTemporaryPassword().length >= 20, true);
});

test('lobby exposes self-service account management and pre-login password recovery', () => {
  const html = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
  const client = fs.readFileSync(path.join(ROOT, 'public', 'app.js'), 'utf8');
  const styles = fs.readFileSync(path.join(ROOT, 'public', 'styles.css'), 'utf8');
  assert.match(html, /id="userManagementBtn"[^>]*hidden/);
  assert.match(html, /id="forgotPasswordBtn"/);
  assert.match(client, /accountApi\('users'/);
  assert.match(client, /accountApi\('change-password'/);
  assert.match(client, /accountApi\('request-email-link'/);
  assert.match(client, /authApi\('request-password-reset'/);
  assert.match(client, /authApi\('reset-password'/);
  assert.match(client, /adminApi\('reset-password'/);
  assert.match(styles, /\.passwordRecoveryPanel/);
});
