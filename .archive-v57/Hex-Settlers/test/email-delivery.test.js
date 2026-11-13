'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  emailDeliveryMode,
  fromAddress,
  isPublicMailAddress,
  isEmailDeliveryConfigured,
  maskEmail,
  normalizeEmail,
  sendViaCloudflareBridge,
  sendViaResend,
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

test('email is enabled only when a usable delivery transport is configured', () => {
  assert.equal(emailDeliveryMode({}), 'none');
  assert.equal(isEmailDeliveryConfigured({}), false);
  assert.equal(emailDeliveryMode({ HEX_EMAIL_MODE: 'none' }), 'none');
  assert.equal(isEmailDeliveryConfigured({ HEX_EMAIL_MODE: 'none' }), false);
  assert.equal(emailDeliveryMode({ HEX_EMAIL_MODE: 'smtp' }), 'none');
  assert.equal(emailDeliveryMode({ HEX_EMAIL_MODE: 'smtp', SMTP_HOST: 'mail.example.com' }), 'smtp');
  assert.equal(emailDeliveryMode({ HEX_EMAIL_MODE: 'cloudflare' }), 'none');
  assert.equal(emailDeliveryMode({
    HEX_EMAIL_MODE: 'cloudflare',
    HEX_PUBLIC_BASE_URL: 'https://game.example',
    HEX_EMAIL_BRIDGE_SECRET: 'secret',
  }), 'cloudflare');
});

test('Cloudflare bridge sends a protected HTTPS request', async () => {
  let received;
  const result = await sendViaCloudflareBridge({
    to: 'player@example.com', subject: 'Verify', text: 'Code', html: '<p>Code</p>',
  }, {
    HEX_EMAIL_CLOUDFLARE_ENDPOINT: 'https://game.example/api/internal/send-email',
    HEX_EMAIL_BRIDGE_SECRET: 'bridge-secret',
  }, async (url, options) => {
    received = { url: String(url), options };
    return new Response(JSON.stringify({ ok: true, id: 'message-1' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  });
  assert.equal(result.provider, 'cloudflare-email');
  assert.equal(received.url, 'https://game.example/api/internal/send-email');
  assert.equal(received.options.headers.Authorization, 'Bearer bridge-secret');
  assert.equal(JSON.parse(received.options.body).to, 'player@example.com');
});

test('Resend always uses the locked no-reply@hexsettlers.org sender', async () => {
  let received;
  const result = await sendViaResend({
    to: 'player@example.com', subject: 'Verify', text: 'Code', html: '<p>Code</p>',
  }, {
    RESEND_API_KEY: 're_test_key',
    HEX_EMAIL_FROM: 'Hex Settlers <account@play.example.com>',
  }, async (url, options) => {
    received = { url, options };
    return new Response(JSON.stringify({ id: 'resend-message-1' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  });
  assert.equal(result.provider, 'resend');
  assert.equal(fromAddress({ HEX_EMAIL_FROM: '' }), 'no-reply@hexsettlers.org');
  assert.equal(fromAddress({ HEX_EMAIL_FROM: 'spoof@other.example', SMTP_FROM: 'other@example.org' }), 'no-reply@hexsettlers.org');
  assert.equal(received.url, 'https://api.resend.com/emails');
  assert.equal(received.options.headers.Authorization, 'Bearer re_test_key');
  const body = JSON.parse(received.options.body);
  assert.equal(body.from, 'no-reply@hexsettlers.org');
  assert.deepEqual(body.to, ['player@example.com']);
});

test('legacy sender environment variables cannot override the locked sender', async () => {
  let received;
  await sendViaResend({
    to: 'player@example.com', subject: 'Verify', text: 'Code', html: '<p>Code</p>',
  }, {
    RESEND_API_KEY: 're_test_key',
    HEX_EMAIL_FROM: 'Hex Settlers <account@send.tenthson.com>',
  }, async (_url, options) => {
    received = options;
    return new Response(JSON.stringify({ id: 'resend-message-2' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  });
  assert.equal(JSON.parse(received.body).from, 'no-reply@hexsettlers.org');
});

test('direct MX delivery rejects private and documentation network targets', () => {
  assert.equal(isPublicMailAddress('127.0.0.1'), false);
  assert.equal(isPublicMailAddress('10.1.2.3'), false);
  assert.equal(isPublicMailAddress('169.254.169.254'), false);
  assert.equal(isPublicMailAddress('192.0.2.10'), false);
  assert.equal(isPublicMailAddress('2001:db8::1'), false);
  assert.equal(isPublicMailAddress('8.8.8.8'), true);
  assert.equal(isPublicMailAddress('2607:f8b0:4009:800::200e'), true);
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

test('Resend rejection preserves HTTP status and diagnostic provider message', async () => {
  const request = sendViaResend({ to: 'support@hexsettlers.org', subject: 'test', text: 'test' }, {
    RESEND_API_KEY: 're_test_key', HEX_EMAIL_FROM: 'support@hexsettlers.org',
  }, async () => new Response(JSON.stringify({
    name: 'validation_error', message: 'The hexsettlers.org domain is not verified',
  }), { status: 403, headers: { 'Content-Type': 'application/json' } }));
  await assert.rejects(request, err => err.statusCode === 403 &&
    /hexsettlers.org domain is not verified/.test(err.message) && err.provider === 'resend');
});
