'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  emailDeliveryMode,
  isEmailDeliveryConfigured,
  maskEmail,
  normalizeEmail,
  sendTransactionalEmail,
  validateEmailAddress,
} = require('../server/email-delivery');

test('email addresses are normalized, validated, and safely masked', () => {
  assert.equal(normalizeEmail('  Ben@Example.COM '), 'ben@example.com');
  assert.deepEqual(validateEmailAddress('ben@example.com'), { ok: true, value: 'ben@example.com' });
  assert.equal(validateEmailAddress('not an email').ok, false);
  assert.equal(validateEmailAddress('a@localhost').ok, false);
  assert.equal(maskEmail('benjamin@example.com'), 'be******@example.com');
});

test('email capture delivery records a message without external network access', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hex-email-capture-'));
  const capturePath = path.join(dir, 'messages.jsonl');
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const env = { HEX_EMAIL_CAPTURE_PATH: capturePath };
  assert.equal(emailDeliveryMode(env), 'capture');
  assert.equal(isEmailDeliveryConfigured(env), true);
  const result = await sendTransactionalEmail({
    to: 'player@example.com',
    subject: 'Reset password',
    text: 'Reset link',
    html: '<p>Reset link</p>',
  }, env);
  assert.equal(result.provider, 'capture');
  const records = fs.readFileSync(capturePath, 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(records.length, 1);
  assert.equal(records[0].to, 'player@example.com');
  assert.equal(records[0].subject, 'Reset password');
});
