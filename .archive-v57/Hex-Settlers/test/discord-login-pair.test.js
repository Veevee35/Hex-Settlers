'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createPairingStore, validPairId, PAIR_TTL_MS } = require('../server/discord-login-pair');
const { sessionCookie, clearSessionCookie } = require('../server/http-auth');

const SESSION_HASH = 'd'.repeat(64);

test('Activity pairing uses two independent random secrets; website receives only the public ID', () => {
  const pairs = createPairingStore();
  const one = pairs.start();
  const two = pairs.start();
  assert.equal(one.pairId.length, 24);
  assert.equal(one.secret.length, 43);
  assert.notEqual(one.pairId, two.pairId);
  assert.notEqual(one.secret, two.secret);
  assert.equal(validPairId(one.pairId), true);
  assert.equal(validPairId(one.secret), false);
  assert.equal(pairs.getStatus(one.pairId), 'pending');
  assert.deepEqual(pairs.redeem(one.pairId, two.secret), { state: 'expired' });
  assert.equal(pairs.getStatus(one.pairId), 'pending');
  assert.equal(pairs.approve(one.pairId, 'account-1', SESSION_HASH), true);
  assert.equal(pairs.getStatus(one.pairId), 'approved');
  assert.equal(pairs.approve(one.pairId, 'account-2', SESSION_HASH), false);
  assert.deepEqual(pairs.redeem(one.pairId, one.secret), { state: 'approved', userId: 'account-1', sessionHash: SESSION_HASH });
  assert.deepEqual(pairs.redeem(one.pairId, one.secret), { state: 'expired' });
});

test('Pair request is strictly 10-minute limited and cannot be reused', () => {
  let now = 4000;
  const pairs = createPairingStore({ clock: () => now });
  const a = pairs.start();
  now += PAIR_TTL_MS - 1;
  assert.equal(pairs.approve(a.pairId, 'player', SESSION_HASH), true);
  now += 1;
  assert.equal(pairs.getStatus(a.pairId), 'expired');
  assert.deepEqual(pairs.redeem(a.pairId, a.secret), { state: 'expired' });
  assert.equal(pairs.count(), 0);
});

test('Bad, forged, partial, or missing pairing codes never receive approval', () => {
  const pairs = createPairingStore();
  const a = pairs.start();
  assert.equal(pairs.approve('../bad', 'user', SESSION_HASH), false);
  assert.equal(pairs.approve(a.pairId, '', SESSION_HASH), false);
  assert.equal(pairs.approve(a.pairId, 'user', 'bad'), false);
  assert.equal(pairs.getStatus(a.pairId), 'pending');
  for (const code of [null, '', 'a'.repeat(23), 'a'.repeat(25), '../etc/passwd']) {
    assert.deepEqual(pairs.redeem(a.pairId, code), { state: 'expired' });
  }
});

test('Normal browser cookies remain Strict; Discord cookies have correct proxy Domain and Partitioned flag', () => {
  const normal = sessionCookie('token', { secure:true });
  assert.match(normal, /SameSite=Strict/);
  assert.doesNotMatch(normal, /Domain=/);
  const embedded = sessionCookie('token', { secure:true, embedded:true, discordProxy:true });
  assert.match(embedded, /SameSite=None/);
  assert.match(embedded, /Domain=1477895334406656101\.discordsays\.com/);
  assert.match(embedded, /Secure/);
  assert.match(embedded, /Partitioned/);
  assert.match(clearSessionCookie({secure:true, embedded:true, discordProxy:true}), /Max-Age=0; Secure; Domain=1477895334406656101\.discordsays\.com; Partitioned/);
});

test('OAuth is enabled in the Activity and always routed to external-browser pairing', () => {
  const root = path.join(__dirname, '..');
  const app = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
  const activity = fs.readFileSync(path.join(root, 'client/discord-activity.mjs'), 'utf8');
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  assert.match(app, /if \(!IS_ADMIN_PORTAL\) void setupOAuthSignIn\(\)/);
  assert.doesNotMatch(app, /if \(!IS_DISCORD_ACTIVITY\) void setupOAuthSignIn\(\)/);
  assert.match(app, /window\.HexDiscordOpenOAuth\(provider\)/);
  assert.match(activity, /sdk\.commands\.openExternalLink/);
  assert.match(activity, /api\/auth\/discord-pair\/start/);
  assert.match(activity, /api\/auth\/discord-pair\/status/);
  assert.match(server, /api\/auth\/discord-pair\/approve/);
  assert.match(server, /timingSafeHexEqual\(t\.tokenHash, result\.sessionHash\)/);
  assert.match(app, /Discord could not retain your login session/);
});
