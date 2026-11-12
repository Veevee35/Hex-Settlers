const DEFAULT_UPSTREAM_ORIGIN = 'https://hexsettlers.up.railway.app';

const DYNAMIC_PATHS = new Set(['/health', '/ws']);
const EMAIL_BRIDGE_PATH = '/api/internal/send-email';
const FIXED_EMAIL_SENDER = 'no-reply@hexsettlers.org';

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
  if (!env.EMAIL || typeof env.EMAIL.send !== 'function') {
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
    const result = await env.EMAIL.send({ to, from: FIXED_EMAIL_SENDER, subject, text, html });
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

export function buildUpstreamRequest(request, upstreamOrigin, upstreamSecret = '') {
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
  // Strip any spoofed client header; inject only the Worker secret.
  upstreamRequest.headers.delete('X-Hex-Upstream-Secret');
  if (upstreamSecret) upstreamRequest.headers.set('X-Hex-Upstream-Secret', upstreamSecret);

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
    return await fetch(buildUpstreamRequest(request, upstreamOrigin, String(env.UPSTREAM_SHARED_SECRET || '')));
  } catch (error) {
    console.error('[cloudflare] Upstream request failed:', error);
    return jsonError(502, 'The game server is temporarily unavailable.');
  }
}

// Assets are served directly by Cloudflare, not by the Node origin. Apply
// browser hardening headers here as well so they cover the actual game page.
export function secureStaticAssetResponse(response, request) {
  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  headers.set('Content-Security-Policy',
    "default-src 'self'; base-uri 'self'; connect-src 'self' ws: wss: https://challenges.cloudflare.com; img-src 'self' blob: data:; media-src 'self' blob:; object-src 'none'; script-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'");
  if (new URL(request.url).protocol === 'https:') {
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  const pathname = new URL(request.url).pathname.toLowerCase();
  if (/\.(?:html|js|css|json)$/.test(pathname) || pathname === '/') {
    headers.set('Cache-Control', 'no-store, max-age=0');
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === EMAIL_BRIDGE_PATH) return handleEmailBridge(request, env);

    if (isDynamicPath(url.pathname)) {
      return proxyDynamicRequest(request, env);
    }

    return secureStaticAssetResponse(await env.ASSETS.fetch(request), request);
  },
};
