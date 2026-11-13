'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = filename => fs.readFileSync(path.join(root, filename), 'utf8');
const providers = ['google','github','cloudflare','discord'];

test('login and registration each provide the four matching OAuth provider logos and buttons', () => {
  const html=read('public/index.html');
  for(const intent of ['login','register']) {
    const container = html.match(new RegExp(`<div id="oauth${intent==='login'?'Login':'Register'}Options"[\\s\\S]*?<div class="oauthProviderButtons">([\\s\\S]*?)<\\/div>`));
    assert.ok(container, `${intent} OAuth choices exist`);
    const buttons = [...container[1].matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)];
    assert.equal(buttons.length, 4, `${intent} contains exactly four buttons`);
    for(const [index, [,,body]] of buttons.entries()) {
      const attrs = buttons[index][1];
      const provider = providers[index];
      assert.match(attrs, new RegExp(`data-oauth-provider="${provider}"`));
      assert.match(attrs, new RegExp(`data-oauth-intent="${intent}"`));
      assert.match(attrs, new RegExp('aria-label="[^"]+'+({google:'Google',github:'GitHub',cloudflare:'Cloudflare',discord:'Discord'}[provider])+'"'));
      assert.ok(body.includes(`src="/icons/oauth/${provider}.svg"`));
      assert.match(body, /class="oauthProviderName"/);
    }
  }
});

test('four brand icons are local, valid SVG files used in the PWA offline cache', () => {
  const sw=read('public/sw.js');
  for(const provider of providers) {
    const icon=read(`public/icons/oauth/${provider}.svg`);
    assert.match(icon, /^<svg\b/);
    assert.match(icon, /<path\b/);
    assert.match(icon, /<\/svg>\s*$/);
    assert.match(sw, new RegExp(`/icons/oauth/${provider}\\.svg`));
  }
});

test('OAuth buttons use a four-column non-wrapping equal-width grid at every viewport size', () => {
  const css=read('public/styles.css');
  assert.match(css, /\.oauthProviderButtons\s*\{[^}]*display:grid;[^}]*grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/s);
  assert.doesNotMatch(css, /\.oauthProviderButtons\s+\.oauthProvider\s*\{\s*flex:1 1 100%/);
  assert.match(css, /\.oauthProviderButtons\s+\.oauthProviderLogo\s*\{/);
  assert.match(css, /\.oauthProviderButtons\s+\.oauthProviderName\s*\{/);
});

test('release metadata, cache, and bundled Discord Activity client remain consistent', () => {
  assert.equal(JSON.parse(read('package.json')).version, '1.0.48');
  assert.equal(JSON.parse(read('build-version.json')).patch, 48);
  assert.match(read('public/index.html'), /V1\.0\.48/);
  assert.match(read('public/sw.js'), /release-v1\.0\.48/);
  assert.ok(fs.existsSync(path.join(root,'public/discord-activity.bundle.sha256')));
});
