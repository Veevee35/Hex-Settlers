const DEFAULT_UPSTREAM_ORIGIN = 'https://hexsettlers.up.railway.app';

const DYNAMIC_PATHS = new Set(['/health', '/ws']);

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

    if (isDynamicPath(url.pathname)) {
      return proxyDynamicRequest(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
