'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = path => fs.readFileSync(require('node:path').join(root, path), 'utf8');

test('Discord CAPTCHA must use the first-party browser; the website still renders normal Turnstile', () => {
  const app = read('public/app.js');
  const css = read('public/discord-activity.css');
  assert.match(app, /async function showAuthCaptcha\(kind\)\s*\{[\s\S]*?if \(IS_DISCORD_ACTIVITY\)\s*\{[\s\S]*?return false;/);
  assert.match(app, /activityNeedsBrowserCaptcha/);
  assert.match(app, /error\.captchaRequired && !error\.lockedUntil/);
  assert.match(app, /Choose Sign in in browser/);
  assert.match(app, /window\.turnstile\.render\(container/);
  assert.match(css, /body\.discord-activity #loginCaptchaWrap,[\s\S]*display:none !important/);
});

test('Google/GitHub/Cloudflare and registration use the one-use external approval handoff', () => {
  const client = read('client/discord-activity.mjs');
  const app = read('public/app.js');
  assert.match(client, /HexDiscordOpenOAuth = async function openOAuth/);
  assert.match(client, /if \(screen === 'register'\) link\.searchParams\.set\('auth_screen', 'register'\)/);
  assert.match(client, /window\.HexDiscordOpenSignup = async function openSignup/);
  assert.match(client, /return window\.HexDiscordOpenOAuth\('', 'register'\)/);
  assert.match(client, /void pollBrowserLogin\(pair\);\s*await openWebsite\(link\.href\)/);
  assert.match(app, /window\.HexDiscordOpenOAuth\(provider\)/);
  assert.match(app, /discord-pair\/approve/);
});

test('Discord deploy ships a verified offline-compiled bundle, with version-stamping intact', () => {
  const pkg = JSON.parse(read('package.json'));
  const guard = read('scripts/verify-discord-bundle.cjs');
  const build = read('scripts/build-discord.cjs');
  const gitignore = read('.gitignore');
  const entry = read('client/discord-activity.mjs');
  assert.match(pkg.scripts['build:discord'], /verify-discord-bundle/);
  assert.match(pkg.scripts.build, /npm run build:discord/);
  assert.match(guard, /sha256/);
  assert.match(build, /discord-rpc-lite\.mjs/);
  assert.match(entry, /import \{ DiscordSDK, Events \} from '\.\/discord-rpc-lite\.mjs'/);
  assert.doesNotMatch(gitignore, /^public\/discord-activity\.bundle\.js$/m);
  assert.match(read('public/index.html'), /discord-activity\.bundle\.js\?v=release-v\d+\.\d+\.\d+/);
  assert.match(read('scripts/bump-version.cjs'), /discord-activity\\.bundle/);
  assert.match(read('scripts/stamp-git-build.cjs'), /discord-activity\\.bundle/);
});
