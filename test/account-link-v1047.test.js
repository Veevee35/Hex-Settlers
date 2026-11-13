'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');

test('production Cloudflare deploy retains custom dashboard variables and pins public Discord Client ID', () => {
  const config = JSON.parse(read('wrangler.container.production.jsonc'));
  assert.equal(config.name, 'hex-settlers');
  assert.equal(config.keep_vars, true);
  assert.equal(config.vars.DISCORD_CLIENT_ID, '1477895334406656101');
  assert.equal(config.vars.PUBLIC_BASE_URL, 'https://hexsettlers.org');
  assert.equal(config.r2_buckets[0].bucket_name, 'hex-settlers-state');
  assert.equal(config.vars.DISCORD_CLIENT_SECRET, undefined, 'Never commit Discord client secret');
  assert.equal(config.vars.DISCORD_BOT_TOKEN, undefined, 'Never commit Discord bot token');
});
test('login screen supports opting in and choosing all five verified sign-in methods', () => {
  const html = read('public/index.html');
  assert.match(html, /id="loginLinkExisting" type="checkbox"/);
  for (const method of ['email','google','github','cloudflare','discord'])
    assert.match(html, new RegExp(`data-link-method="${method}"`));
  assert.match(html, /data-oauth-intent="register" data-oauth-provider="discord"/);
  const app = read('public/app.js');
  assert.match(app, /function storeLoginLinkMethods\(/);
  assert.match(app, /function pendingLoginLinkMethods\(/);
  assert.match(app, /sessionStorage\.setItem\(LOGIN_LINK_SELECTION_KEY/);
  assert.match(app, /showPendingAccountLinkWizard/);
  assert.match(app, /startOAuthProvider\(method, 'link'\)/);
});
test('unrecognized OAuth identity opens CAPTCHA-protected signup, never silently merges', () => {
  const server = read('server.js');
  assert.match(server, /if \(!user\) \{\s*if \(flow\.allowRegistration !== true\) \{/);
  assert.match(server, /target\.searchParams\.set\('oauth', 'not-linked'\)/);
  assert.match(server, /target\.searchParams\.set\('auth_screen', 'register'\)/);
  assert.match(server, /const owner = findUserByOAuth\(provider, identity\.subject\)/);
  assert.match(server, /owner && owner\.id !== viewer\.id/);
  assert.match(server, /const captcha = await requireCaptcha\(req, body\.captchaToken, 'register'\)/);
});
test('version metadata and Discord bundle stay in sync', () => {
  const build = JSON.parse(read('build-version.json'));
  assert.equal(JSON.parse(read('package.json')).version, [build.major, build.minor, build.patch].join('.'));
  assert.match(read('public/index.html'), /discord-activity\.bundle\.js\?v=release-v\d+\.\d+\.\d+/);
  assert.match(read('scripts/build-discord.cjs'), /discord-rpc-lite\.mjs/);
});
