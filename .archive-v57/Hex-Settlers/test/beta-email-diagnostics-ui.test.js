'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const source = file => fs.readFileSync(path.join(root, file), 'utf8');

test('email diagnostic is guarded by the existing administrator handler and rate limited', () => {
  const backend = source('server.js');
  const adminStart = backend.indexOf('async function handleAdminHttp(');
  const testPath = backend.indexOf("if (urlPath === '/api/admin/beta-email-test')");
  assert.ok(adminStart >= 0 && testPath > adminStart);
  assert.match(backend.slice(adminStart, testPath), /Administrator access required/);
  assert.match(backend.slice(testPath, testPath + 400), /betaEmailTestLimiter\.consume\(admin\.id\)/);
});

test('beta inbox displays the sender, provider errors, manual retry and test email control', () => {
  const admin = source('public/beta-admin.js');
  assert.match(admin, /Configured sender:/);
  assert.match(admin, /Last error:/);
  assert.match(admin, /Send test email to support/);
  assert.match(admin, /Retry now/);
  assert.match(source('public/index.html'), /beta-admin\.js\?v=beta-email-diagnostics-20261110/);
});
