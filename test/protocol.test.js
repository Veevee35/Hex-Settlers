'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { CLIENT_MESSAGE_TYPES, REGULAR_MESSAGE_MAX_BYTES, parseClientMessage } = require('../server/protocol');

test('all documented client message types parse', () => {
  for (const type of CLIENT_MESSAGE_TYPES) {
    const result = parseClientMessage(JSON.stringify({ type }));
    assert.equal(result.ok, true, type);
  }
});

test('malformed and unknown messages are rejected', () => {
  assert.equal(parseClientMessage('{').ok, false);
  assert.equal(parseClientMessage('[]').ok, false);
  assert.equal(parseClientMessage(JSON.stringify({ type: 'not_real' })).ok, false);
});

test('ordinary messages have a tighter limit than texture-pack publishing', () => {
  const oversized = JSON.stringify({ type: 'chat', text: 'x'.repeat(REGULAR_MESSAGE_MAX_BYTES) });
  assert.equal(parseClientMessage(oversized).ok, false);
  const texturePayload = JSON.stringify({ type: 'texture_pack_publish', pack: { assets: { 'x.png': 'x'.repeat(REGULAR_MESSAGE_MAX_BYTES) } } });
  assert.equal(parseClientMessage(texturePayload).ok, true);
});
