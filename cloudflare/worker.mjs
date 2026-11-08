const DEFAULT_UPSTREAM_ORIGIN = 'https://hexsettlers.up.railway.app';

const DYNAMIC_PATHS = new Set(['/health', '/ws']);
const EMAIL_BRIDGE_PATH = '/api/internal/send-email';

export function isDynamicPath(pathname) {
  return DYNAMIC_PATHS.has(pathname) || pathname.startsWith('/api/');
}

function jsonError(status, error) {
  return new Response(JSON.stringify({ ok: false, error }), {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' },
  });
}

async function secretsMatch(provided, expected) {
  if (!provided || !expected) return false;
  const encoder = new TextEncoder();
  const [left, right] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(provided)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
  ]);
  const a = new Uint8Array(left);
  const b = new Uint8Array(right);
  let different = a.length ^ b.length;
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) different |= a[index] ^ b[index];
  return different === 0;
}

export async function handleEmailBridge(request, env) {
  if (request.method !== 'POST') return jsonError(405, 'Method not allowed.');
  const authorization = request.headers.get('Authorization') || '';
  const provided = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!await secretsMatch(provided, String(env.EMAIL_BRIDGE_SECRET || ''))) return jsonError(401, 'Unauthorized.');
  if (!env.EMAIL || typeof env.EMAIL.send !== 'function' || !String(env.EMAIL_FROM || '').trim()) {
    return jsonError(503, 'Email service is not configured.');
  }
  if (Number(request.headers.get('Content-Length') || 0) > 131072) return jsonError(413, 'Message is too large.');
  let body;
  try { body = await request.json(); } catch (_) { return jsonError(400, 'Invalid JSON body.'); }
  const to = String(body && body.to || '').trim().toLowerCase();
  const subject = String(body && body.subject || '').replace(/[\r\n]+/g, ' ').trim();
  const text = String(body && body.text || '');
  const html = String(body && body.html || '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return jsonError(400, 'Invalid recipient address.');
  if (!subject || subject.length > 200 || text.length > 100000 || html.length > 100000) return jsonError(400, 'Invalid email content.');
  try {
    const result = await env.EMAIL.send({ to, from: String(env.EMAIL_FROM).trim(), subject, text, html });
    return jsonResponse(200, { ok: true, id: result && (result.messageId || result.id) || null });
  } catch (error) {
    console.error('[cloudflare] Email Service send failed:', error);
    return jsonError(502, 'Cloudflare Email Service could not send the message.');
  }
}

export function normalizedUpstreamOrigin(value) {
  const url = new URL(String(value || DEFAULT_UPSTREAM_ORIGIN));
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('UPSTREAM_ORIGIN must use http or https.');
  }
  return url.origin;
}

export function requestHasAllowedOrigin(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return true;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch (_) {
    return false;
  }
}

export function buildUpstreamRequest(request, upstreamOrigin) {
  const incomingUrl = new URL(request.url);
  const targetUrl = new URL(`${incomingUrl.pathname}${incomingUrl.search}`, upstreamOrigin);
  const upstreamRequest = new Request(targetUrl, request);

  // The Node backend rejects cross-origin browser requests. The Worker has
  // already checked the browser's real Origin against its own public origin,
  // so present the trusted proxy hop as same-origin to Railway.
  if (upstreamRequest.headers.has('Origin')) {
    upstreamRequest.headers.set('Origin', upstreamOrigin);
  }

  const referer = upstreamRequest.headers.get('Referer');
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (refererUrl.origin === incomingUrl.origin) {
        upstreamRequest.headers.set(
          'Referer',
          new URL(`${refererUrl.pathname}${refererUrl.search}`, upstreamOrigin).toString(),
        );
      }
    } catch (_) {
      upstreamRequest.headers.delete('Referer');
    }
  }

  // Do not forward client-supplied proxy metadata to the origin server.
  upstreamRequest.headers.delete('Host');
  upstreamRequest.headers.delete('Forwarded');
  upstreamRequest.headers.delete('X-Forwarded-For');
  upstreamRequest.headers.delete('X-Forwarded-Host');
  upstreamRequest.headers.delete('X-Forwarded-Proto');

  return upstreamRequest;
}

async function proxyDynamicRequest(request, env) {
  if (!requestHasAllowedOrigin(request)) {
    return jsonError(403, 'Origin not allowed.');
  }

  let upstreamOrigin;
  try {
    upstreamOrigin = normalizedUpstreamOrigin(env.UPSTREAM_ORIGIN);
  } catch (error) {
    console.error('[cloudflare] Invalid upstream configuration:', error);
    return jsonError(500, 'Server configuration error.');
  }

  try {
    return await fetch(buildUpstreamRequest(request, upstreamOrigin));
  } catch (error) {
    console.error('[cloudflare] Upstream request failed:', error);
    return jsonError(502, 'The game server is temporarily unavailable.');
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === EMAIL_BRIDGE_PATH) return handleEmailBridge(request, env);

    if (isDynamicPath(url.pathname)) {
      return proxyDynamicRequest(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
