'use strict';

// OAuth authorization-code + PKCE. Provider tokens never enter the browser or
// the user database. The short-lived flow cookie is authenticated and encrypted,
// so a restart or a second container can complete a callback with the same key.
const crypto = require('node:crypto');
const { parseCookies } = require('./http-auth');
const FLOW_COOKIE = 'hexsettlers_oauth_flow';
const FLOW_TTL_MS = 10 * 60 * 1000;
const PROVIDERS = Object.freeze({ google: 'Google', github: 'GitHub', cloudflare: 'Cloudflare' });

function providerConfiguration(provider, env = process.env) {
  if (!Object.hasOwn(PROVIDERS, provider)) return null;
  const prefix = `OAUTH_${provider.toUpperCase()}_`;
  const clientId = String(env[`${prefix}CLIENT_ID`] || '').trim();
  const clientSecret = String(env[`${prefix}CLIENT_SECRET`] || '').trim();
  const stateSecret = String(env.OAUTH_STATE_SECRET || '');
  if (!clientId || !clientSecret || stateSecret.length < 32) return null;
  const definitions = {
    google: { authorize: 'https://accounts.google.com/o/oauth2/v2/auth', token: 'https://oauth2.googleapis.com/token', scope: 'openid email profile' },
    github: { authorize: 'https://github.com/login/oauth/authorize', token: 'https://github.com/login/oauth/access_token', scope: 'read:user' },
    // Cloudflare OAuth client scopes are API permission names, NOT OIDC scopes.
    cloudflare: { authorize: 'https://dash.cloudflare.com/oauth2/auth', token: 'https://dash.cloudflare.com/oauth2/token', scope: 'user-details.read' },
  };
  return { provider, clientId, clientSecret, ...definitions[provider], scope: String(env[`${prefix}SCOPES`] || definitions[provider].scope).trim() };
}

function providerAvailability(env = process.env) {
  return Object.fromEntries(Object.keys(PROVIDERS).map(key => [key, !!providerConfiguration(key, env)]));
}
function cookieValue(value, secure, maxAge = 600) {
  return `${FLOW_COOKIE}=${value}; Path=/api/auth/oauth; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}
function clearFlowCookie(secure) { return cookieValue('', secure, 0); }
function encryptState(data, secret) {
  const iv = crypto.randomBytes(12);
  const key = crypto.createHash('sha256').update(secret, 'utf8').digest();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(data)), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}
function decryptState(value, secret) {
  const data = Buffer.from(String(value || ''), 'base64url');
  if (data.length < 30 || data.length > 4096) throw new Error('OAuth session is missing or invalid. Start again.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', crypto.createHash('sha256').update(secret, 'utf8').digest(), data.subarray(0, 12));
  decipher.setAuthTag(data.subarray(12, 28));
  return JSON.parse(Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString('utf8'));
}
function redirectUri(baseUrl, provider) {
  const url = new URL(baseUrl);
  if (!['https:', 'http:'].includes(url.protocol) || (url.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(url.hostname))) {
    throw new Error('Set HEX_PUBLIC_BASE_URL to the HTTPS site URL before enabling social sign-in.');
  }
  return `${url.origin}/api/auth/oauth/${provider}/callback`;
}
function safeReturnPath(value) {
  const path = String(value || '/');
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\') || /[\r\n\x00-\x1f]/.test(path) || path.length > 1000) return '/';
  try {
    const parsed = new URL(path, 'https://hexsettlers.invalid');
    if (parsed.origin !== 'https://hexsettlers.invalid') return '/';
    return `${parsed.pathname}${parsed.search}`;
  } catch { return '/'; }
}
function beginOAuth({ provider, intent = 'login', userId = '', sessionTokenHash = '', baseUrl, env = process.env, secure = true, returnTo = '/', allowRegistration = false }) {
  const config = providerConfiguration(provider, env);
  if (!config) throw new Error('This sign-in provider is not configured.');
  if (intent !== 'login' && intent !== 'link') throw new Error('Invalid sign-in action.');
  if (intent === 'link' && (!userId || !/^[a-f0-9]{64}$/.test(sessionTokenHash))) throw new Error('Sign in before connecting an account.');
  const state = crypto.randomBytes(32).toString('base64url');
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  const nonce = crypto.randomBytes(24).toString('base64url');
  const redirect = redirectUri(baseUrl, provider);
  const url = new URL(config.authorize);
  for (const [key, value] of Object.entries({ client_id: config.clientId, redirect_uri: redirect, response_type: 'code', scope: config.scope, state, code_challenge: challenge, code_challenge_method: 'S256' })) url.searchParams.set(key, value);
  if (provider === 'google') { url.searchParams.set('nonce', nonce); url.searchParams.set('prompt', 'select_account'); }
  const cookie = cookieValue(encryptState({ state, verifier, nonce, provider, intent, userId, sessionTokenHash: intent === 'link' ? sessionTokenHash : '', allowRegistration: !!allowRegistration && intent === 'login', returnTo: safeReturnPath(returnTo), expiresAt: Date.now() + FLOW_TTL_MS }, env.OAUTH_STATE_SECRET), secure);
  return { location: url.toString(), cookie };
}
async function jsonRequest(url, options = {}, fetchImpl = fetch) {
  const response = await fetchImpl(url, { ...options, signal: AbortSignal.timeout(12000), redirect: 'error' });
  if (!response.ok) throw new Error('The identity provider rejected the request. Please try again.');
  const body = await response.json();
  if (!body || typeof body !== 'object' || body.error) throw new Error('The identity provider did not complete authentication.');
  return body;
}
async function resolveOAuthIdentity(provider, token, { fetchImpl = fetch } = {}) {
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json', 'User-Agent': 'Hex-Settlers-OAuth' };
  if (provider === 'google') {
    const user = await jsonRequest('https://openidconnect.googleapis.com/v1/userinfo', { headers }, fetchImpl);
    if (!user.sub) throw new Error('Google did not provide a stable account identifier.');
    return { provider, subject: String(user.sub), name: String(user.name || user.given_name || ''), email: user.email_verified === true ? String(user.email || '') : '' };
  }
  if (provider === 'github') {
    const user = await jsonRequest('https://api.github.com/user', { headers: { ...headers, 'X-GitHub-Api-Version': '2022-11-28' } }, fetchImpl);
    if (!Number.isSafeInteger(user.id) && !/^\d+$/.test(String(user.id || ''))) throw new Error('GitHub did not provide a stable account identifier.');
    // Email is optional. Identity is NEVER matched to a local account by email.
    return { provider, subject: String(user.id), name: String(user.name || user.login || ''), email: '' };
  }
  if (provider === 'cloudflare') {
    const payload = await jsonRequest('https://api.cloudflare.com/client/v4/user', { headers }, fetchImpl);
    const user = payload.result;
    if (payload.success !== true || !user || !user.id) throw new Error('Cloudflare did not return your user identity. Check the user-details.read scope.');
    return { provider, subject: String(user.id), name: String(user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email || ''), email: '' };
  }
  throw new Error('Unsupported sign-in provider.');
}
async function finishOAuth({ provider, callbackUrl, cookieHeader, baseUrl, env = process.env, fetchImpl = fetch }) {
  const config = providerConfiguration(provider, env);
  if (!config) throw new Error('Sign-in provider is unavailable.');
  const cookie = parseCookies(cookieHeader)[FLOW_COOKIE];
  let flow;
  try { flow = decryptState(cookie, env.OAUTH_STATE_SECRET); }
  catch { throw new Error('Your sign-in session expired or was interrupted. Please try again.'); }
  const incoming = new URL(callbackUrl, 'https://hexsettlers.invalid');
  if (flow.provider !== provider || Date.now() > flow.expiresAt || !flow.state || !incoming.searchParams.get('state') ||
      Buffer.byteLength(flow.state) !== Buffer.byteLength(incoming.searchParams.get('state')) ||
      !crypto.timingSafeEqual(Buffer.from(flow.state), Buffer.from(incoming.searchParams.get('state')))) {
    throw new Error('Sign-in security check failed. Please try again.');
  }
  if (incoming.searchParams.has('error')) throw new Error('Authorization was cancelled or declined.');
  const code = incoming.searchParams.get('code');
  if (!code || code.length > 2048) throw new Error('The provider did not return an authorization code.');
  const redirect = redirectUri(baseUrl, provider);
  const data = new URLSearchParams({ grant_type: 'authorization_code', code, client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: redirect, code_verifier: flow.verifier });
  const exchange = await jsonRequest(config.token, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body: data.toString() }, fetchImpl);
  if (!exchange.access_token || exchange.token_type && String(exchange.token_type).toLowerCase() !== 'bearer') throw new Error('Provider returned an invalid access token.');
  // Userinfo or API /user is fetched directly over HTTPS with the freshly
  // exchanged access token. No unverified browser profile fields are trusted.
  const identity = await resolveOAuthIdentity(provider, exchange.access_token, { fetchImpl });
  return { flow, identity };
}
module.exports = { PROVIDERS, FLOW_COOKIE, providerConfiguration, providerAvailability, beginOAuth, finishOAuth, clearFlowCookie, safeReturnPath, resolveOAuthIdentity };
