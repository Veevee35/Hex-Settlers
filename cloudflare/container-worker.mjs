// Hex Settlers Cloudflare-only runtime: static Worker + one durable-object-managed
// Node Container. The existing v48 game engine runs unmodified except for R2
// persistence hooks. Requires Workers Paid / Cloudflare Containers (NOT DO-free).
import { Container, ContainerProxy, getContainer } from '@cloudflare/containers';
export { ContainerProxy }; // Required by outboundByHost R2 bridge.

const STATE_HOST = 'hex-state.internal';
// One Worker and one authoritative game container serve both hostnames.
// Host routing is checked before ASSETS or the backend are reached.
import { ADMIN_HOST, isAdminHost, isAdminApiPath, isPrivatePortalAsset, isAllowedAdminPortalPath, isMfaPublicPath, isAdminMfaInternalPath } from './admin-routing.mjs';
export { ADMIN_HOST, isAdminHost, isAdminApiPath, isPrivatePortalAsset, isAllowedAdminPortalPath, isMfaPublicPath, isAdminMfaInternalPath };
const JSON_FILES = new Set(['users.json', 'game_history.json', 'game_analytics.json', 'beta_program.json', 'active_rooms.json', 'rating_policy.json', 'neural_ai_model.json', 'build-version.json']);
const MAX_STATE_UPLOAD = 128 * 1024 * 1024;
const MAX_TEXTURE_UPLOAD = 8 * 1024 * 1024;
// HTTP uploads from the Node container should have Content-Length. If a proxy
// removes it, buffer only a small, bounded payload rather than passing an
// unknown-length TransformStream to R2 (which R2 rejects).
const MAX_UNKNOWN_LENGTH_UPLOAD = 8 * 1024 * 1024;

export async function readBoundedBody(body, limit) {
  const reader = body.getReader();
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
      size += bytes.byteLength;
      if (size > limit) {
        await reader.cancel('R2 state upload too large').catch(() => {});
        const error = new Error('R2 state upload exceeds its size limit');
        error.status = 413;
        throw error;
      }
      chunks.push(bytes);
    }
  } finally {
    try { reader.releaseLock(); } catch { /* closed */ }
  }
  const data = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.byteLength; }
  return data;
}

export function stateKey(pathname) {
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { return ''; }
  if (decoded.includes('\\') || decoded.includes('\0') || decoded.includes('//')) return '';
  const pieces = decoded.split('/').filter(Boolean);
  if (pieces[0] !== 'state') return '';
  if (pieces.length === 2 && JSON_FILES.has(pieces[1])) return `state/${pieces[1]}`;
  if (pieces.length === 3 && pieces[1] === 'backups' && /^[a-z0-9_\-]{1,100}\.json$/.test(pieces[2])) return pieces.join('/');
  if (pieces.length >= 4 && pieces[1] === 'texture-packs'
    && /^[a-f0-9]{36}$/.test(pieces[2])
    && pieces.slice(3).every(p => /^[a-zA-Z0-9 ._\-]+$/.test(p) && p !== '.' && p !== '..')) {
    return pieces.join('/');
  }
  return '';
}

export async function r2StateRequest(request, env) {
  const url = new URL(request.url);
  if (url.searchParams.get('list') === 'textures' && request.method === 'GET') {
    const cursor = url.searchParams.get('cursor') || undefined;
    const result = await env.STATE.list({ prefix: 'state/texture-packs/', limit: 500, cursor });
    return Response.json({ keys: result.objects.map(o => o.key), cursor: result.truncated ? result.cursor : null },
      { headers: { 'Cache-Control': 'no-store' } });
  }
  const key = stateKey(url.pathname);
  if (!key) return new Response('Invalid state path', { status: 400 });
  if (request.method === 'GET') {
    const item = await env.STATE.get(key);
    return item ? new Response(item.body, { headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/octet-stream' } })
      : new Response('Not found', { status: 404 });
  }
  if (request.method === 'PUT') {
    const maxBytes = key.includes('/texture-packs/') ? MAX_TEXTURE_UPLOAD : MAX_STATE_UPLOAD;
    const lengthHeader = request.headers.get('content-length');
    const declaredLength = lengthHeader === null ? null : Number(lengthHeader);
    if (lengthHeader !== null && (!/^\d+$/.test(lengthHeader) || !Number.isSafeInteger(declaredLength))) {
      return new Response('Invalid Content-Length', { status: 400 });
    }
    if (declaredLength !== null && declaredLength > maxBytes) {
      return new Response('Too large', { status: 413 });
    }
    if (!request.body) return new Response('Missing body', { status: 400 });
    try {
      // Critical: do NOT pipe the request body through TransformStream. Doing so
      // strips its known length and Cloudflare R2.put() fails on every write.
      // With Content-Length, R2 accepts the original Request stream and streams
      // even large history files without buffering them in Worker memory.
      const uploadBody = declaredLength === null
        ? await readBoundedBody(request.body, Math.min(maxBytes, MAX_UNKNOWN_LENGTH_UPLOAD))
        : request.body;
      await env.STATE.put(key, uploadBody, { httpMetadata: { contentType: 'application/octet-stream' } });
    } catch (error) {
      console.error('R2 state PUT failed', key, error);
      return new Response(error?.status === 413 ? 'Too large' : 'State write failed', { status: error?.status === 413 ? 413 : 502 });
    }
    return new Response('Stored', { status: 201 });
  }
  if (request.method === 'DELETE') {
    await env.STATE.delete(key);
    return new Response(null, { status: 204 });
  }
  return new Response('Method not allowed', { status: 405 });
}

export class HexGameContainer extends Container {
  defaultPort = 3000;
  // Keep ongoing WebSocket games alive. Idle containers can stop and rehydrate
  // from R2 on the next request. Do not let two copies run against the same data.
  sleepAfter = '2h';
  // Startup probe is internal to the container. Public /health still requires
  // the trusted Worker header; /ready never accepts game actions.
  pingEndpoint = 'localhost/ready';
  constructor(ctx, env) {
    super(ctx, env);
    this.envVars = {
      NODE_ENV: 'production', HOST: '0.0.0.0', PORT: '3000', DATA_DIR: '/data',
      HEX_TRUST_PROXY: 'true',
      HEX_PUBLIC_BASE_URL: String(env.PUBLIC_BASE_URL || ''),
      HEX_ALLOWED_ORIGINS: [String(env.PUBLIC_BASE_URL || ''), `https://${ADMIN_HOST}`].filter(Boolean).join(','),
      HEX_ADMIN_HOST: ADMIN_HOST,
      HEX_ADMIN_MFA_ENCRYPTION_KEY: String(env.HEX_ADMIN_MFA_ENCRYPTION_KEY || ''),
      CLOUDFLARE_STATE_ENDPOINT: `http://${STATE_HOST}`,
      HEX_BUILTIN_ADMIN_ENABLED: 'true',
      HEX_ADMIN_PASSWORD: String(env.HEX_ADMIN_PASSWORD || ''),
      HEX_UPSTREAM_SHARED_SECRET: String(env.GAME_GATE_SECRET || ''),
      HEX_EMAIL_MODE: env.RESEND_API_KEY ? 'resend' : 'disabled',
      OAUTH_STATE_SECRET: String(env.OAUTH_STATE_SECRET || ''),
      OAUTH_GOOGLE_CLIENT_ID: String(env.OAUTH_GOOGLE_CLIENT_ID || ''),
      OAUTH_GOOGLE_CLIENT_SECRET: String(env.OAUTH_GOOGLE_CLIENT_SECRET || ''),
      OAUTH_GITHUB_CLIENT_ID: String(env.OAUTH_GITHUB_CLIENT_ID || ''),
      OAUTH_GITHUB_CLIENT_SECRET: String(env.OAUTH_GITHUB_CLIENT_SECRET || ''),
      OAUTH_CLOUDFLARE_CLIENT_ID: String(env.OAUTH_CLOUDFLARE_CLIENT_ID || ''),
      OAUTH_CLOUDFLARE_CLIENT_SECRET: String(env.OAUTH_CLOUDFLARE_CLIENT_SECRET || ''),
      OAUTH_CLOUDFLARE_SCOPES: String(env.OAUTH_CLOUDFLARE_SCOPES || ''),
      HEX_EMAIL_FROM: 'no-reply@hexsettlers.org', // fixed sender for every transactional email
      RESEND_API_KEY: String(env.RESEND_API_KEY || ''),
      ALLOW_EMPTY_DATABASE: String(env.ALLOW_EMPTY_DATABASE || '0'),
    };
  }
}

HexGameContainer.outboundByHost = {
  [STATE_HOST]: (request, env) => r2StateRequest(request, env),
};

function hardened(response, request) {
  const h = new Headers(response.headers);
  h.set('X-Content-Type-Options', 'nosniff');
  h.set('X-Frame-Options', 'DENY');
  h.set('Referrer-Policy', 'no-referrer');
  h.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  h.set('Content-Security-Policy', "default-src 'self'; base-uri 'self'; connect-src 'self' ws: wss:; img-src 'self' blob: data:; media-src 'self' blob:; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'");
  if (new URL(request.url).protocol === 'https:') h.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  if (/\.(html|css|js|json)$/i.test(new URL(request.url).pathname) || new URL(request.url).pathname === '/') h.set('Cache-Control', 'no-store');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: h });
}

export function isDynamicRequest(path) {
  return path === '/health' || path === '/ws' || path.startsWith('/api/');
}

export function sameOrigin(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return true;
  try { return new URL(origin).origin === new URL(request.url).origin; }
  catch { return false; }
}

function backendHeaders(request, env, url) {
  const headers = new Headers(request.headers);
  // Only Cloudflare's own connecting-IP header can become trusted client IP.
  const edgeClientIp = request.headers.get('CF-Connecting-IP') || '';
  for (const k of ['x-hex-upstream-secret', 'x-hex-verified-client-ip', 'cf-connecting-ip', 'forwarded', 'x-forwarded-for', 'x-forwarded-host', 'x-forwarded-proto']) headers.delete(k);
  if (edgeClientIp && edgeClientIp.length <= 45 && /^[0-9a-fA-F:.]+$/.test(edgeClientIp)) {
    headers.set('X-Hex-Verified-Client-IP', edgeClientIp);
  }
  headers.set('X-Hex-Upstream-Secret', env.GAME_GATE_SECRET);
  headers.set('X-Forwarded-Proto', 'https');
  headers.set('X-Forwarded-Host', url.host);
  return headers;
}

async function gameBackend(env) {
  const backend = getContainer(env.HEX_BACKEND, 'hex-settlers-primary');
  await backend.startAndWaitForPorts({
    ports: 3000,
    cancellationOptions: { instanceGetTimeoutMS: 30000, portReadyTimeoutMS: 90000 },
  });
  return backend;
}

function denyAdmin(request, path) {
  // Browser navigations get the private password + TOTP login page; API and
  // subresource requests fail closed without a redirect or HTML body.
  const navigation = request.method === 'GET' &&
    (path === '/' || path.endsWith('.html') || request.headers.get('Sec-Fetch-Dest') === 'document');
  return navigation
    ? Response.redirect(new URL('/admin-login.html', request.url), 303)
    : Response.json({ ok: false, error: 'Administrator MFA required.' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const adminHost = isAdminHost(request);
    const path = url.pathname;
    if (!adminHost && (isAdminApiPath(path) || isPrivatePortalAsset(path))) {
      return hardened(new Response('Not found', { status: 404 }), request);
    }
    if (adminHost && (!isAllowedAdminPortalPath(path) || isAdminMfaInternalPath(path))) {
      return hardened(new Response('Not found', { status: 404 }), request);
    }
    if (!adminHost && path === '/texture-pack-template.zip') {
      const obj = await env.STATE.get('assets/texture-pack-template.zip');
      return obj ? new Response(obj.body, { headers: {
        'Content-Type': 'application/zip', 'Content-Disposition': 'attachment; filename=texture-pack-template.zip',
        'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      } }) : new Response('Template has not been uploaded to R2.', { status: 404 });
    }
    if (isDynamicRequest(path) && !sameOrigin(request)) {
      return hardened(Response.json({ ok: false, error: 'Origin not allowed.' }, { status: 403 }), request);
    }
    const dynamic = isDynamicRequest(path);
    const needsBackend = dynamic || (adminHost && !isMfaPublicPath(path));
    if (needsBackend && (!env.GAME_GATE_SECRET || !env.HEX_ADMIN_PASSWORD)) {
      return hardened(Response.json({ error: 'Missing required private game configuration' }, { status: 503 }), request);
    }
    if (adminHost && !isMfaPublicPath(path) && !request.headers.get('Cookie')?.includes('__Host-hex_admin_mfa=')) {
      return hardened(denyAdmin(request, path), request);
    }
    let backend;
    if (needsBackend) backend = await gameBackend(env);
    if (adminHost && !isMfaPublicPath(path)) {
      // The backend validates the *live*, revocable session on EVERY admin
      // request (including static assets). A forged cookie cannot pass this.
      const probe = new Request(new URL('/api/admin/mfa/check', url), {
        method: 'POST', headers: backendHeaders(request, env, url),
      });
      const result = await backend.fetch(probe);
      if (result.status !== 200) return hardened(denyAdmin(request, path), request);
    }
    if (dynamic) {
      return backend.fetch(new Request(request, { headers: backendHeaders(request, env, url) }));
    }
    // Public game assets stay public; management assets are behind MFA.
    return hardened(await env.ASSETS.fetch(request), request);
  },
};
