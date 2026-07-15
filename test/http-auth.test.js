'use strict';

const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const test = require('node:test');
const { SESSION_COOKIE_NAME, clearSessionCookie, parseCookies, readJsonBody, requestIsTls, sessionCookie } = require('../server/http-auth');

test('session cookies are HTTP-only, same-site, and secure when TLS is trusted', () => {
  const value = sessionCookie('a token', { secure: true, maxAgeSeconds: 60 });
  assert.match(value, new RegExp(`^${SESSION_COOKIE_NAME}=a%20token;`));
  assert.match(value, /HttpOnly/);
  assert.match(value, /SameSite=Strict/);
  assert.match(value, /Secure/);
  assert.equal(parseCookies(value)[SESSION_COOKIE_NAME], 'a token');
  assert.match(clearSessionCookie(), /Max-Age=0/);
});

test('TLS detection only trusts forwarded protocol when proxy trust is enabled', () => {
  const request = { headers: { 'x-forwarded-proto': 'https' }, socket: {} };
  assert.equal(requestIsTls(request, false), false);
  assert.equal(requestIsTls(request, true), true);
  assert.equal(requestIsTls({ headers: {}, socket: { encrypted: true } }, false), true);
});

test('JSON body reader parses valid data and rejects invalid or oversized bodies', async () => {
  const valid = new EventEmitter();
  const pendingValid = readJsonBody(valid, 64);
  valid.emit('data', Buffer.from('{"name":"Ada"}'));
  valid.emit('end');
  assert.deepEqual(await pendingValid, { name: 'Ada' });

  const invalid = new EventEmitter();
  const pendingInvalid = readJsonBody(invalid, 64);
  invalid.emit('data', Buffer.from('{'));
  invalid.emit('end');
  await assert.rejects(pendingInvalid, (error) => error.statusCode === 400);

  const large = new EventEmitter();
  const pendingLarge = readJsonBody(large, 2);
  large.emit('data', Buffer.from('123'));
  large.emit('end');
  await assert.rejects(pendingLarge, (error) => error.statusCode === 413);
});
