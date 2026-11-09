'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  claimOAuthUsername, finishVerifiedEmailLink, usernameAvailability,
} = require('../server/account-onboarding');

function provisional() {
  return {
    id: 'permanent-user-1', username: 'pending_abc123', needsUsernameSetup: true,
    stats: { gamesPlayed: 11, totalVP: 82 }, rankedRating: 1098,
    friendIds: ['friend-1'], oauthAccounts: [{ provider: 'github', subject: 'abc' }],
    tokens: [{ tokenHash: 'hash' }],
  };
}

test('OAuth username onboarding accepts only unique allowed usernames, once', () => {
  const user = provisional();
  const lookup = name => name.toLowerCase() === 'taken' ? { id: 'another-user' } : null;
  assert.equal(usernameAvailability('taken', lookup).available, false);
  assert.equal(usernameAvailability('ab', lookup).available, false);
  assert.equal(usernameAvailability('Hello.World', lookup).available, true);
  for (const bad of ['ab', 'has spaces', 'taken', 'Benleethom', 'a'.repeat(25)]) {
    assert.equal(claimOAuthUsername(user, bad, lookup).ok, false, bad);
    assert.equal(user.needsUsernameSetup, true);
  }
  const result = claimOAuthUsername(user, 'My_Name-1', lookup);
  assert.deepEqual(result, { ok: true, username: 'My_Name-1' });
  assert.equal(user.id, 'permanent-user-1');
  assert.equal(user.displayName, 'My_Name-1');
  assert.equal(user.stats.totalVP, 82);
  assert.deepEqual(user.friendIds, ['friend-1']);
  assert.equal(user.rankedRating, 1098);
  assert.equal(user.needsUsernameSetup, undefined);
  assert.equal(claimOAuthUsername(user, 'AnotherName', lookup).ok, false);
});

test('provider to email conversion preserves player ID/history and revokes provider login only after verification', () => {
  const user = provisional();
  user.needsUsernameSetup = false;
  user.username = 'real_player';
  user.oauthAccounts.push({ provider: 'google', subject: 'other-identity' });
  const record = {
    email: 'verified@example.org', convertToDirectLogin: true,
    pendingPassword: { salt: 'salt', hash: 'hashed-password' },
  };
  user.emailVerification = record;
  assert.equal(user.pass, undefined);
  assert.equal(user.oauthAccounts.length, 2);
  const response = finishVerifiedEmailLink(user, record, 123456);
  assert.deepEqual(response, { convertedToEmailLogin: true });
  assert.equal(user.email, 'verified@example.org');
  assert.equal(user.emailVerifiedAt, 123456);
  assert.deepEqual(user.pass, record.pendingPassword);
  assert.deepEqual(user.oauthAccounts, []);
  assert.deepEqual(user.tokens, []);
  assert.equal(user.id, 'permanent-user-1');
  assert.equal(user.username, 'real_player');
  assert.deepEqual(user.stats, { gamesPlayed: 11, totalVP: 82 });
  assert.deepEqual(user.friendIds, ['friend-1']);
});

test('conversion cannot unlink a passwordless OAuth account without a verified new password', () => {
  const user = provisional();
  assert.throws(() => finishVerifiedEmailLink(user, {
    email: 'verified@example.org', convertToDirectLogin: true,
  }, 123), /password/);
  assert.equal(user.email, undefined);
  assert.equal(user.oauthAccounts.length, 1);
  assert.equal(user.tokens.length, 1);
});

test('ordinary email link leaves existing OAuth links alone when it is not a conversion', () => {
  const user = provisional();
  const result = finishVerifiedEmailLink(user, { email: 'verified@example.org' }, 200);
  assert.equal(result.convertedToEmailLogin, false);
  assert.equal(user.oauthAccounts.length, 1);
  assert.equal(user.tokens.length, 1);
});

test('existing password is retained when converting a linked OAuth account to direct email', () => {
  const user = provisional();
  user.pass = { salt: 'prior', hash: 'original' };
  const result = finishVerifiedEmailLink(user, {
    email: 'verified@example.org', convertToDirectLogin: true,
  }, 200);
  assert.equal(result.convertedToEmailLogin, true);
  assert.deepEqual(user.pass, { salt: 'prior', hash: 'original' });
  assert.deepEqual(user.oauthAccounts, []);
});

test('client and server wire OAuth username setup and verified email/password switching', () => {
  const root = path.join(__dirname, '..');
  const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
  const server = read('server.js');
  const app = read('public/app.js');
  const html = read('public/index.html');
  assert.match(server, /needsUsernameSetup: true/);
  assert.match(server, /complete-oauth-username/);
  assert.match(server, /check-username/);
  assert.match(server, /findUserByUsername\(identifier\) \|\| findUserByEmail\(identifier\)/);
  assert.match(server, /finishVerifiedEmailLink/);
  assert.match(server, /clearSessionCookie\(\{ secure \}\)/);
  assert.match(app, /authUser\?\.needsUsernameSetup/);
  assert.match(app, /complete-oauth-username/);
  assert.match(app, /convertedToEmailLogin/);
  assert.match(app, /newPassword: currentValue/);
  assert.match(html, /id="oauthUsernameSetup"/);
  assert.match(html, /id="oauthUsernameForm"/);
  assert.match(html, /Username or verified email/);
});
