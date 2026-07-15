'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  CLIENT_MESSAGE_TYPES,
  REGULAR_MESSAGE_MAX_BYTES,
  TEXTURE_PACK_MESSAGE_MAX_BYTES,
  parseClientMessage,
} = require('../server/protocol');

test('protocol accepts current gameplay, expert AI, and texture messages', () => {
  for (const type of ['game_action', 'set_expert_ai_tuning', 'texture_pack_publish']) {
    const parsed = parseClientMessage(JSON.stringify({ type }));
    assert.equal(parsed.ok, true, type);
  }
  assert.ok(CLIENT_MESSAGE_TYPES.includes('set_expert_ai_tuning'));
});

test('protocol rejects malformed, unknown, and oversized regular messages', () => {
  assert.deepEqual(parseClientMessage('{'), { ok: false, error: 'Invalid JSON message.' });
  assert.deepEqual(parseClientMessage('[]'), { ok: false, error: 'Message must be an object.' });
  assert.deepEqual(parseClientMessage(JSON.stringify({ type: 'not_real' })), { ok: false, error: 'Unknown message type.' });
  const oversized = JSON.stringify({ type: 'chat', message: 'x'.repeat(REGULAR_MESSAGE_MAX_BYTES) });
  assert.deepEqual(parseClientMessage(oversized), { ok: false, error: 'Message is too large.' });
});

test('texture publishing retains the larger established payload allowance', () => {
  assert.ok(TEXTURE_PACK_MESSAGE_MAX_BYTES > REGULAR_MESSAGE_MAX_BYTES);
  const largeTexture = JSON.stringify({ type: 'texture_pack_publish', data: 'x'.repeat(REGULAR_MESSAGE_MAX_BYTES) });
  assert.equal(parseClientMessage(largeTexture).ok, true);
});
