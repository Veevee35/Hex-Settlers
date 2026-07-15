'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { SESSION_COOKIE_NAME, clearSessionCookie, parseCookies, sessionCookie } = require('../server/http-auth');

test('session cookies are HTTP-only, same-site, and optionally secure', () => {
  const header = sessionCookie('secret value', { secure: true, maxAgeSeconds: 60 });
  assert.match(header, new RegExp(`^${SESSION_COOKIE_NAME}=`));
  assert.match(header, /HttpOnly/);
  assert.match(header, /SameSite=Strict/);
  assert.match(header, /Secure/);
  assert.equal(parseCookies(header)[SESSION_COOKIE_NAME], 'secret value');
  assert.match(clearSessionCookie(), /Max-Age=0/);
});
