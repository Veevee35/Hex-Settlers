import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  ADMIN_HOST, isAdminHost, isAdminApiPath, isPrivatePortalAsset, isAllowedAdminPortalPath,
} from '../cloudflare/admin-routing.mjs';

const root = new URL('../', import.meta.url);
const read = (file) => fs.readFileSync(new URL(file, root), 'utf8');

test('only exact management hostname is privileged, not public domain or workers.dev', () => {
  assert.equal(ADMIN_HOST, 'admin.hexsettlers.org');
  assert.equal(isAdminHost(new Request('https://admin.hexsettlers.org/api/admin/rooms')), true);
  assert.equal(isAdminHost(new Request('https://hexsettlers.org/api/admin/rooms')), false);
  assert.equal(isAdminHost(new Request('https://admin.hexsettlers.org.evil.example/')), false);
  assert.equal(isAdminHost(new Request('https://hex-settlers-cloudflare-staging.bt616923.workers.dev/')), false);
});

test('admin-only API and portal stylesheet cannot be served on public domain', () => {
  assert.equal(isAdminApiPath('/api/admin/rooms'), true);
  assert.equal(isAdminApiPath('/api/admin/history-reset'), true);
  assert.equal(isAdminApiPath('/api/account/users'), false);
  assert.equal(isPrivatePortalAsset('/admin-portal.css'), true);
  assert.equal(isPrivatePortalAsset('/app.js'), false);
});

test('admin host only permits allowed dynamic API families', () => {
  assert.equal(isAllowedAdminPortalPath('/api/admin/history-export'), true);
  assert.equal(isAllowedAdminPortalPath('/api/auth/login'), true);
  assert.equal(isAllowedAdminPortalPath('/api/account/users'), true);
  assert.equal(isAllowedAdminPortalPath('/ws'), false);
  assert.equal(isAllowedAdminPortalPath('/api/texture-packs/xyz/start'), false);
  assert.equal(isAllowedAdminPortalPath('/api/rooms'), false);
});

test('worker-first assets, public UI cleanup and independent backend host guard', () => {
  for (const file of ['wrangler.jsonc', 'wrangler.container.staging.jsonc', 'wrangler.container.production.jsonc']) {
    assert.match(read(file), /"run_worker_first": true/);
  }
  assert.doesNotMatch(read('public/index.html'), /id="adminManagementBtn"/);
  assert.match(read('public/app.js'), /IS_ADMIN_PORTAL/);
  assert.match(read('server.js'), /requestIsAdminHostname\(req\)/);
  assert.match(read('server.js'), /isAdminPortalViewer = isAdminUser\(viewer\) && requestIsAdminHostname\(req\)/);
});
