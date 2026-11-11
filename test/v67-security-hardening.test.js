'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { clientAddress } = require('../server/runtime-config');
const { ROOM_CODE_LENGTH, randomRoomCode, createAuthAttemptGuard, mayViewFullHistory, publicHistoryMetadata } = require('../server/security-hardening');

const projectRoot = path.resolve(__dirname, '..');
const serverSource = fs.readFileSync(path.join(projectRoot, 'server.js'), 'utf8');
const clientSource = fs.readFileSync(path.join(projectRoot, 'public/app.js'), 'utf8');
const workerSource = fs.readFileSync(path.join(projectRoot, 'cloudflare/container-worker.mjs'), 'utf8');

test('new invite codes are 10 cryptographically randomized characters; existing old codes are accepted by the client', () => {
  assert.equal(ROOM_CODE_LENGTH, 10);
  const generated = new Set(Array.from({ length: 300 }, () => randomRoomCode()));
  assert.equal(generated.size, 300);
  for (const code of generated) assert.match(code, /^[A-HJ-NP-Z2-9]{10}$/);
  assert.match(clientSource, /\^\[A-Z0-9\]\{4,10\}\$/);
  assert.ok(serverSource.includes('let code = randCode();'));
});

test('an anonymous or other-account rejoin cannot bind another player seat', () => {
  const start = serverSource.indexOf("if (msg.type === 'rejoin_room')");
  const stop = serverSource.indexOf('// Room-scoped messages carry a roomCode.', start);
  assert.ok(start > 0 && stop > start);
  const block = serverSource.slice(start, stop);
  assert.match(block, /if \(!ws\._userId\)/);
  assert.match(block, /String\(msg\.playerId\) !== String\(ws\._userId\)/);
  assert.match(block, /rejoinRoom\(code, ws\._userId\)/);
  assert.doesNotMatch(block, /rejoinRoom\(code, msg\.playerId\)/);
  assert.match(block, /bindSocketToRoomMember\(room, ws\._userId, ws/);
});

test('auth attempt throttles cannot be cleared by a successful login to another account', () => {
  const guard = createAuthAttemptGuard({ ipAttempts: 4, identityAttempts: 2, ipWindowMs: 20_000, identityWindowMs: 20_000 });
  assert.equal(guard.consume('198.51.100.1', 'victim').allowed, true);
  assert.equal(guard.consume('198.51.100.1', 'victim').allowed, true);
  assert.equal(guard.consume('198.51.100.1', 'victim').allowed, false);
  assert.equal(guard.consume('203.0.113.1', 'victim').allowed, false, 'identity limit applies across IPs');
  assert.equal(guard.consume('198.51.100.1', 'attacker').allowed, true, 'identity is separate');
  assert.equal(guard.consume('198.51.100.1', 'other').allowed, false, 'shared IP limit cannot be reset');
  assert.doesNotMatch(serverSource, /passwordAuthLimiter\.clear\(/);
});

test('private unranked snapshots require a participant or admin; public ranked and challenge replays remain viewable', () => {
  const privateGame = { id: 'private', roomCode: 'SECRETROOM', ranked: false, players: [{ id: 'alice', name: 'Alice' }, { id: 'bob', name: 'Bob' }] };
  const outsider = { id: 'outsider', role: 'player' };
  const participant = { id: 'alice', role: 'player' };
  assert.equal(mayViewFullHistory(privateGame, outsider), false);
  assert.equal(mayViewFullHistory(privateGame, participant), true);
  assert.equal(mayViewFullHistory(privateGame, { id: 'root', role: 'admin' }), true);
  assert.equal(mayViewFullHistory({ ...privateGame, ranked: true }, outsider), true);
  assert.equal(mayViewFullHistory({ ...privateGame, challenge: { kind: 'weekly' } }, outsider), true);
  const [metadata] = publicHistoryMetadata([privateGame], outsider);
  assert.equal(metadata.roomCode, null);
  assert.equal(metadata.canViewReplay, false);
  assert.equal(metadata.players[0].id, 'alice', 'preserve friend filters and public leaderboard statistics');
  assert.equal(publicHistoryMetadata([privateGame], participant)[0].roomCode, 'SECRETROOM');
  assert.match(serverSource, /historyListLimiter\.consume\(user\.id\)\.allowed/);
  assert.match(serverSource, /if \(!mayViewFullHistory\(entry, user\)\)/);
});

test('room creation has limits for accounts, IPs and global capacity; joining has an independent limit', () => {
  assert.match(serverSource, /roomCreationError\(ws\._userId, ws\._clientAddress\)/);
  assert.match(serverSource, /roomCreationAccountLimiter\.consume\(userId\)/);
  assert.match(serverSource, /roomCreationIpLimiter\.consume\(address\)/);
  assert.match(serverSource, /rooms\.size >= MAX_ACTIVE_ROOMS/);
  assert.match(serverSource, /roomJoinLimiter\.consume/);
});

test('production WebSocket bearer authentication is disabled; old localStorage token migration rotates cookie token', () => {
  assert.match(serverSource, /const TEST_LEGACY_WS_AUTH = process\.env\.NODE_ENV === 'test'/);
  assert.match(serverSource, /if \(!TEST_LEGACY_WS_AUTH\).*secure HTTP account login/);
  assert.match(serverSource, /if \(!TEST_LEGACY_WS_AUTH\).*auth_required/);
  assert.match(serverSource, /revokeAuthToken\(user, token\);\s*const cookieToken = issueAuthToken\(user\)/);
  assert.doesNotMatch(clientSource, /localStorage\.setItem\(AUTH_TOKEN_KEY,/);
  assert.doesNotMatch(clientSource, /send\(\{ type: 'auth_token'/);
  assert.match(serverSource, /if \(p\.length < 12\)/);
});

test('verified client IPs are never accepted directly from browsers or XFF', () => {
  const req = { headers: { 'x-hex-verified-client-ip': '203.0.113.5', 'x-forwarded-for': '8.8.8.8' }, socket: { remoteAddress: '127.0.0.1' } };
  assert.equal(clientAddress(req, false, false), '127.0.0.1');
  assert.equal(clientAddress(req, true, false), '8.8.8.8');
  assert.equal(clientAddress(req, true, true), '203.0.113.5');
  req.headers['x-hex-verified-client-ip'] = 'evil, 203.0.113.5';
  assert.equal(clientAddress(req, true, true), '127.0.0.1');
  assert.match(workerSource, /request\.headers\.get\('CF-Connecting-IP'\)/);
  assert.match(workerSource, /headers\.set\('X-Hex-Verified-Client-IP', edgeClientIp\)/);
  assert.match(serverSource, /!!UPSTREAM_SHARED_SECRET && trustedProxyRequest\(req\)/);
});
