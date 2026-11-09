'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  providerAvailability, beginOAuth, finishOAuth, clearFlowCookie,
  resolveOAuthIdentity, safeReturnPath,
} = require('../server/oauth-login');
const { safeManagedUser } = require('../server/user-management');
const env = {
  OAUTH_STATE_SECRET: 'a'.repeat(64),
  OAUTH_GOOGLE_CLIENT_ID: 'google-id', OAUTH_GOOGLE_CLIENT_SECRET: 'google-secret',
  OAUTH_GITHUB_CLIENT_ID: 'github-id', OAUTH_GITHUB_CLIENT_SECRET: 'github-secret',
  OAUTH_CLOUDFLARE_CLIENT_ID: 'cloudflare-id', OAUTH_CLOUDFLARE_CLIENT_SECRET: 'cloudflare-secret',
};
const baseUrl = 'https://hexsettlers.org';

function fakeResponse(data, status = 200) { return { ok: status >= 200 && status < 300, json: async () => data }; }
function start(provider = 'google', args = {}) {
  const created = beginOAuth({ provider, baseUrl, env, secure: true, returnTo: '/?room=ABCD', ...args });
  const url = new URL(created.location);
  const cookie = created.cookie.split(';')[0];
  return { ...created, url, cookie };
}

test('providers require credentials and a strong shared state secret', () => {
  assert.deepEqual(providerAvailability(env), { google: true, github: true, cloudflare: true });
  assert.deepEqual(providerAvailability({ ...env, OAUTH_STATE_SECRET: 'short' }), { google: false, github: false, cloudflare: false });
  assert.equal(providerAvailability({ ...env, OAUTH_GITHUB_CLIENT_ID: '' }).github, false);
});

test('OAuth start sets PKCE and same-site encrypted HttpOnly state cookie', () => {
  for (const provider of ['google', 'github', 'cloudflare']) {
    const flow = start(provider);
    assert.equal(flow.url.searchParams.get('client_id'), env[`OAUTH_${provider.toUpperCase()}_CLIENT_ID`]);
    assert.equal(flow.url.searchParams.get('redirect_uri'), `${baseUrl}/api/auth/oauth/${provider}/callback`);
    assert.equal(flow.url.searchParams.get('response_type'), 'code');
    assert.equal(flow.url.searchParams.get('code_challenge_method'), 'S256');
    assert.match(flow.url.searchParams.get('code_challenge'), /^[a-zA-Z0-9_-]{43}$/);
    assert.match(flow.cookie, /^hexsettlers_oauth_flow=/);
    assert.match(flow.location, /^https:\/\//);
    assert.match(flow.cookie + flow.cookie, /hexsettlers_oauth_flow=/);
    assert.match(flow.location, /state=/);
    assert.match(flow.cookie + '; ' + flow.location, /state=/);
    assert.match(flow.cookie + '; ' + flow.location, /code_challenge/);
    assert.match(flow.cookie + '; ' + flow.location, /hexsettlers_oauth_flow/);
    assert.ok(flow.cookie.length < 2000);
    assert.ok(flow.location.indexOf('a'.repeat(64)) === -1);
  }
  const startResult = start();
  assert.match(startResult.cookie, /hexsettlers_oauth_flow/);
  assert.match(startResult.location, /prompt=select_account/);
  assert.match(clearFlowCookie(true), /Max-Age=0; Secure/);
});

test('Google OAuth exchanges the code then verifies identity via provider HTTPS userinfo', async () => {
  const flow = start();
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (url === 'https://oauth2.googleapis.com/token') return fakeResponse({ access_token: 'access', token_type: 'Bearer' });
    if (url === 'https://openidconnect.googleapis.com/v1/userinfo') return fakeResponse({ sub: 'google-sub-001', name: 'Player One', email: 'player@gmail.com', email_verified: true });
    throw Error('Unexpected URL');
  };
  const url = `/api/auth/oauth/google/callback?code=test-code&state=${encodeURIComponent(flow.url.searchParams.get('state'))}`;
  const result = await finishOAuth({ provider: 'google', callbackUrl: url, cookieHeader: flow.cookie, baseUrl, env, fetchImpl });
  assert.equal(result.flow.returnTo, '/?room=ABCD');
  assert.deepEqual(result.identity, { provider: 'google', subject: 'google-sub-001', name: 'Player One', email: 'player@gmail.com' });
  assert.equal(calls.length, 2);
  assert.match(calls[0].options.body, /code_verifier=/);
  assert.equal(calls[1].options.headers.Authorization, 'Bearer access');
});

test('OAuth callback rejects incorrect state, missing session and provider swapping', async () => {
  const flow = start('github');
  const callbackUrl = '/api/auth/oauth/github/callback?code=123&state=invalid';
  await assert.rejects(() => finishOAuth({ provider: 'github', callbackUrl, cookieHeader: flow.cookie, baseUrl, env, fetchImpl: () => { throw Error('Must not call provider'); } }), /security check/);
  await assert.rejects(() => finishOAuth({ provider: 'github', callbackUrl, cookieHeader: '', baseUrl, env }), /session expired/);
  await assert.rejects(() => finishOAuth({ provider: 'google', callbackUrl: callbackUrl.replaceAll('github','google'), cookieHeader: flow.cookie, baseUrl, env }), /security check/);
});

test('GitHub and Cloudflare use stable identity IDs, not matched email addresses', async () => {
  const gh = await resolveOAuthIdentity('github', 'access', { fetchImpl: async () => fakeResponse({ id: 123, login: 'player123', email: 'test@example.org' }) });
  assert.deepEqual(gh, { provider: 'github', subject: '123', name: 'player123', email: '' });
  const cf = await resolveOAuthIdentity('cloudflare', 'access', { fetchImpl: async () => fakeResponse({ success: true, result: { id: 'cloudflare-user-123', email: 'cloudflare@example.org' } }) });
  assert.deepEqual(cf, { provider: 'cloudflare', subject: 'cloudflare-user-123', name: 'cloudflare@example.org', email: '' });
});

test('untrusted redirect destinations are rejected', () => {
  assert.equal(safeReturnPath('//evil.example/path'), '/');
  assert.equal(safeReturnPath('https://evil.example/'), '/');
  assert.equal(safeReturnPath('/\\evil.example/'), '/');
  assert.equal(safeReturnPath('/?room=ABCD'), '/?room=ABCD');
});

test('public user view lists linked providers without leaking immutable IDs or tokens', () => {
  const user = { id: 'local', username: 'local', oauthAccounts: [
    { provider: 'google', subject: 'very-private', name: 'Google Name', linkedAt: 123 },
  ] };
  const publicUser = safeManagedUser(user, { includeEmail: true });
  assert.equal(publicUser.hasPassword, false);
  assert.deepEqual(publicUser.oauthProviders, [{ provider: 'google', name: 'Google Name', linkedAt: 123 }]);
  assert.deepEqual(safeManagedUser(user).oauthProviders, []);
});

test('HTML, game server and Cloudflare container expose the end-to-end OAuth integration', () => {
  const root = path.resolve(__dirname, '..');
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  for (const provider of ['google', 'github', 'cloudflare']) {
    assert.match(read('public/index.html'), new RegExp(`data-oauth-provider="${provider}"`, 'i'));
    assert.match(read('cloudflare/container-worker.mjs'), new RegExp(`OAUTH_${provider.toUpperCase()}_CLIENT_SECRET`));
  }
  assert.match(read('server.js'), /handleOAuthHttp\(req, res, urlPath\)/);
  assert.match(read('server.js'), /findUserByOAuth/);
  assert.match(read('server.js'), /unlink-oauth/);
  assert.match(read('public/app.js'), /startOAuthProvider/);
});
