'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { clientAddress, isAllowedWebSocketOrigin, runtimeConfig, securityHeaders } = require('../server/runtime-config');

test('runtime config validates environment values and Railway proxy defaults', () => {
  const config = runtimeConfig({ PORT: '4123', HOST: '127.0.0.1', HEX_WS_MAX_PAYLOAD: '999', RAILWAY_ENVIRONMENT: 'production' });
  assert.equal(config.port, 4123);
  assert.equal(config.host, '127.0.0.1');
  assert.equal(config.wsMaxPayloadBytes, 48 * 1024 * 1024);
  assert.equal(config.trustProxy, true);
});

test('origin checking allows same-host or explicitly configured origins', () => {
  const request = { headers: { host: 'game.example', origin: 'https://game.example' }, socket: { remoteAddress: 'local' } };
  assert.equal(isAllowedWebSocketOrigin(request), true);
  request.headers.origin = 'https://other.example';
  assert.equal(isAllowedWebSocketOrigin(request), false);
  assert.equal(isAllowedWebSocketOrigin(request, new Set(['https://other.example'])), true);
});

test('proxy address and security headers are only trusted when configured', () => {
  const request = { headers: { 'x-forwarded-for': '203.0.113.10, 10.0.0.1' }, socket: { remoteAddress: '127.0.0.1' } };
  assert.equal(clientAddress(request, false), '127.0.0.1');
  assert.equal(clientAddress(request, true), '203.0.113.10');
  assert.equal(securityHeaders()['Strict-Transport-Security'], undefined);
  assert.equal(securityHeaders({ isTls: true })['Strict-Transport-Security'], 'max-age=31536000; includeSubDomains');
});
