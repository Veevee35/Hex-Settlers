'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { runtimeConfig } = require('../server/runtime-config');
const { canAcceptConnection, isBackpressured, closeSlowClient } = require('../server/ws-admission');
test('beta defaults support 150 testers with headroom and cap concurrent sockets', () => {
  const cfg = runtimeConfig({});
  assert.equal(cfg.betaMaxConnections, 250);
  assert.equal(canAcceptConnection(149, cfg.betaMaxConnections), true);
  assert.equal(canAcceptConnection(250, cfg.betaMaxConnections), false);
  assert.equal(runtimeConfig({ HEX_BETA_MAX_CONNECTIONS: '300' }).betaMaxConnections, 300);
  assert.equal(runtimeConfig({ HEX_BETA_MAX_CONNECTIONS: 'oops' }).betaMaxConnections, 250);
});
test('backpressure disconnects stuck transports', () => {
  assert.equal(isBackpressured({ bufferedAmount: 4_194_305 }, 4_194_304), true);
  assert.equal(isBackpressured({ bufferedAmount: 4_194_304 }, 4_194_304), false);
  let received;
  closeSlowClient({ close(...args) { received = args; } });
  assert.equal(received[0], 1013);
});
