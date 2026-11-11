'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { fromAddress } = require('../server/email-delivery');
const { BETA_FEEDBACK_RECIPIENT } = require('../server/beta-feedback-email');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const SENDER = 'no-reply@hexsettlers.org';

test('staging, production and GitHub Wrangler configs commit the exact fixed sender', () => {
  for (const file of ['wrangler.jsonc', 'wrangler.container.staging.jsonc', 'wrangler.container.production.jsonc']) {
    const config = JSON.parse(read(file));
    assert.equal(config.vars.HEX_EMAIL_FROM, SENDER, `${file} must not wipe HEX_EMAIL_FROM`);
    assert.ok(config.r2_buckets.length > 0, `${file} must preserve R2 bindings`);
  }
});

test('the sender cannot be overridden by blank/legacy/injected environment values', () => {
  for (const env of [ {}, { HEX_EMAIL_FROM: '' }, { HEX_EMAIL_FROM: 'support@wrong.example' },
    { HEX_EMAIL_FROM: 'support@wrong.example', SMTP_FROM: 'attacker@wrong.example' } ]) {
    assert.equal(fromAddress(env), SENDER);
  }
  assert.equal(BETA_FEEDBACK_RECIPIENT, 'support@hexsettlers.org');
});

test('Cloudflare container and legacy mail bridge enforce the same From address', () => {
  assert.match(read('cloudflare/container-worker.mjs'), /HEX_EMAIL_FROM: 'no-reply@hexsettlers\.org'/);
  assert.match(read('cloudflare/worker.mjs'), /const FIXED_EMAIL_SENDER = 'no-reply@hexsettlers\.org'/);
  assert.doesNotMatch(read('cloudflare/worker.mjs'), /from: String\(env\.EMAIL_FROM/);
  assert.doesNotMatch(read('public/privacy_policy.html'), /support@hexsettlers\.com/);
});
