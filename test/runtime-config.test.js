'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { commaSeparatedSet, isAllowedWebSocketOrigin, runtimeConfig, securityHeaders } = require('../server/runtime-config');

test('runtime configuration validates bounds and origin lists', () => {
  const config = runtimeConfig({
    PORT: '4100',
    HEX_WS_MAX_PAYLOAD: '2048',
    HEX_AUTH_ATTEMPTS_PER_MINUTE: '8',
    HEX_ALLOWED_ORIGINS: 'https://game.example, https://admin.example',
  });
  assert.equal(config.port, 4100);
  assert.equal(config.wsMaxPayloadBytes, 2048);
  assert.equal(config.authAttemptsPerMinute, 8);
  assert.deepEqual(config.allowedOrigins, commaSeparatedSet('https://game.example,https://admin.example'));
});

test('browser websocket origins must match the request host or allowlist', () => {
  const sameHost = { headers: { origin: 'https://game.example', host: 'game.example' } };
  const otherHost = { headers: { origin: 'https://evil.example', host: 'game.example' } };
  assert.equal(isAllowedWebSocketOrigin(sameHost), true);
  assert.equal(isAllowedWebSocketOrigin(otherHost), false);
  assert.equal(isAllowedWebSocketOrigin(otherHost, new Set(['https://evil.example'])), true);
  assert.equal(isAllowedWebSocketOrigin({ headers: { host: 'game.example' } }), true);
  const spoofedForwardedHost = { headers: { origin: 'https://evil.example', host: 'game.example', 'x-forwarded-host': 'evil.example' } };
  assert.equal(isAllowedWebSocketOrigin(spoofedForwardedHost), false);
  assert.equal(isAllowedWebSocketOrigin(spoofedForwardedHost, new Set(), true), true);
});

test('static responses receive browser security headers', () => {
  const headers = securityHeaders({ isTls: true });
  assert.match(headers['Content-Security-Policy'], /script-src 'self'/);
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
  assert.match(headers['Strict-Transport-Security'], /max-age=/);
});
