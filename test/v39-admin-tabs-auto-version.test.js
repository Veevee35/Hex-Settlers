'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { nextVersion } = require('../scripts/bump-version.cjs');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('separate admin user and merge tabs route to distinct panels', () => {
  const app = read('public/app.js');
  assert.match(app, /\['users', 'User Account Management'\], \['merge', 'Merge Accounts'\]/);
  assert.match(app, /key === 'users'\) void openUserManagementScreen\(\{ container: content, adminOnly: true \}\)/);
  assert.match(app, /key === 'merge'\) void openUserManagementScreen\(\{ container: content, adminOnly: true, mergeOnly: true \}\)/);
  assert.match(app, /if \(adminView && mergeOnly\) \{[\s\S]*?adminApi\('merge-users'/);
  assert.match(app, /shell\.appendChild\(mergeSection\);\s*return;/);
  assert.match(app, /openUserManagementScreen\(\{ selfOnly: true \}\)/);
});

test('the current version appears on both portal pages, and all assets reflect the same build version', () => {
  const html = read('public/index.html');
  const js = read('public/app.js');
  const sw = read('public/sw.js');
  const state = JSON.parse(read('build-version.json'));
  const version = `V${state.major}.${state.minor}.${state.patch}`;
  const tag = `release-v${state.major}.${state.minor}.${state.patch}`;
  assert.equal((html.match(/class="appVersion" aria-label="Game version"/g) || []).length, 7);
  assert.equal((html.match(new RegExp(`>${version.replace(/\./g, '\\.')}</div>`, 'g')) || []).length, 7);
  assert.ok(html.includes(`styles.css?v=${tag}`));
  assert.ok(html.includes(`app.js?v=${tag}`));
  assert.ok(js.includes(`ASSET_CACHE_SW_BUILD = '${tag}'`));
  assert.ok(sw.includes(`CACHE_NAME = CACHE_PREFIX + '${tag}'`));
  assert.equal(JSON.parse(read('package.json')).version, version.substring(1));
  assert.match(read('public/styles.css'), /#authLanding \.appVersion, #playModeScreen \.appVersion/);
});

test('automatic patch increment and rollover, manually changed major resets minor and patch', () => {
  assert.deepEqual(nextVersion({ major: 1, minor: 0, patch: 0, lastBuiltMajor: 1 }),
    { major: 1, minor: 0, patch: 1, lastBuiltMajor: 1 });
  assert.deepEqual(nextVersion({ major: 1, minor: 6, patch: 98, lastBuiltMajor: 1 }),
    { major: 1, minor: 6, patch: 99, lastBuiltMajor: 1 });
  assert.deepEqual(nextVersion({ major: 1, minor: 6, patch: 99, lastBuiltMajor: 1 }),
    { major: 1, minor: 7, patch: 0, lastBuiltMajor: 1 });
  assert.deepEqual(nextVersion({ major: 2, minor: 7, patch: 43, lastBuiltMajor: 1 }),
    { major: 2, minor: 0, patch: 0, lastBuiltMajor: 2 });
  assert.throws(() => nextVersion({ major: 1, minor: 1, patch: 100, lastBuiltMajor: 1 }), /Invalid build-version/);
});

test('Cloudflare Builds stamps each Git commit without a duplicate version-bump push', () => {
  const workflow = read('.github/workflows/version-on-push.yml');
  const script = read('scripts/stamp-git-build.cjs');
  const guide = read('GITHUB_CLOUDFLARE_AUTODEPLOY.md');
  assert.match(workflow, /workflow_dispatch/);
  assert.doesNotMatch(workflow, /^  push:/m);
  assert.match(script, /rev-parse/);
  assert.match(script, /ASSET_CACHE_SW_BUILD/);
  assert.match(guide, /wrangler deploy --config wrangler.jsonc/);
});

test('version bump stamps page text, both asset URL revisions, service worker, and package metadata', t => {
  const os = require('node:os');
  const { execFileSync } = require('node:child_process');
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'hex-version-test-'));
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
  for (const rel of ['build-version.json', 'package.json', 'package-lock.json',
    'public/index.html', 'public/app.js', 'public/sw.js', 'scripts/bump-version.cjs']) {
    fs.mkdirSync(path.join(fixture, path.dirname(rel)), { recursive: true });
    fs.copyFileSync(path.join(root, rel), path.join(fixture, rel));
  }
  const bump = () => execFileSync(process.execPath, [path.join(fixture, 'scripts/bump-version.cjs'), '--bump'], { encoding: 'utf8' }).trim();
  const next = nextVersion(JSON.parse(read('build-version.json')));
  const expectedTag = `release-v${next.major}.${next.minor}.${next.patch}`;
  const expectedLabel = `V${next.major}.${next.minor}.${next.patch}`;
  assert.equal(bump(), expectedLabel);
  let html = fs.readFileSync(path.join(fixture, 'public/index.html'), 'utf8');
  assert.ok(html.includes(`styles.css?v=${expectedTag}`));
  assert.ok(html.includes(`app.js?v=${expectedTag}`));
  assert.equal((html.match(new RegExp(`>${expectedLabel.replace(/\./g, '\\.')}<\/div>`, 'g')) || []).length, 7);
  assert.ok(fs.readFileSync(path.join(fixture, 'public/app.js'), 'utf8').includes(`ASSET_CACHE_SW_BUILD = '${expectedTag}'`));
  assert.ok(fs.readFileSync(path.join(fixture, 'public/sw.js'), 'utf8').includes(`CACHE_NAME = CACHE_PREFIX + '${expectedTag}'`));
  assert.equal(JSON.parse(fs.readFileSync(path.join(fixture, 'package-lock.json'))).version, expectedLabel.slice(1));
  fs.writeFileSync(path.join(fixture, 'build-version.json'), JSON.stringify({ major: 1, minor: 3, patch: 99, lastBuiltMajor: 1 }));
  assert.equal(bump(), 'V1.4.0');
  fs.writeFileSync(path.join(fixture, 'build-version.json'), JSON.stringify({ major: 2, minor: 4, patch: 90, lastBuiltMajor: 1 }));
  assert.equal(bump(), 'V2.0.0');
  html = fs.readFileSync(path.join(fixture, 'public/index.html'), 'utf8');
  assert.ok(html.includes('styles.css?v=release-v2.0.0'));
  assert.ok(!html.includes('release-v1.4.0'));
});
