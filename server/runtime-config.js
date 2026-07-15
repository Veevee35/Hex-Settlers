'use strict';

function integerEnv(env, name, fallback, min, max) {
  const raw = env && env[name];
  if (raw == null || raw === '') return fallback;
  const value = Number.parseInt(String(raw), 10);
  return Number.isFinite(value) && value >= min && value <= max ? value : fallback;
}

function booleanEnv(env, name, fallback = false) {
  const raw = String(env && env[name] || '').trim().toLowerCase();
  if (!raw) return fallback;
  if (['1', 'true', 'yes', 'on'].includes(raw)) return true;
  if (['0', 'false', 'no', 'off'].includes(raw)) return false;
  return fallback;
}

function commaSeparatedSet(raw) {
  return new Set(String(raw || '').split(',').map((value) => value.trim()).filter(Boolean));
}

function forwardedHost(request, trustProxy = false) {
  if (trustProxy) {
    const forwarded = String(request && request.headers && request.headers['x-forwarded-host'] || '').split(',')[0].trim();
    if (forwarded) return forwarded;
  }
  return String(request && request.headers && request.headers.host || '').trim();
}

function clientAddress(request, trustProxy = false) {
  if (trustProxy) {
    const forwarded = String(request && request.headers && request.headers['x-forwarded-for'] || '').split(',')[0].trim();
    if (forwarded) return forwarded;
  }
  return String(request && request.socket && request.socket.remoteAddress || 'unknown');
}

function isAllowedWebSocketOrigin(request, allowedOrigins = new Set(), trustProxy = false) {
  const origin = String(request && request.headers && request.headers.origin || '').trim();
  if (!origin) return true;
  if (allowedOrigins.has('*') || allowedOrigins.has(origin)) return true;
  try {
    const originUrl = new URL(origin);
    return originUrl.host.toLowerCase() === forwardedHost(request, trustProxy).toLowerCase();
  } catch (_) {
    return false;
  }
}

function securityHeaders({ isTls = false } = {}) {
  const headers = {
    'Content-Security-Policy': "default-src 'self'; base-uri 'self'; connect-src 'self' ws: wss:; img-src 'self' blob: data:; media-src 'self' blob:; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'",
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  };
  if (isTls) headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
  return headers;
}

function runtimeConfig(env = process.env) {
  return Object.freeze({
    host: String(env.HOST || '0.0.0.0').trim() || '0.0.0.0',
    port: integerEnv(env, 'PORT', 3000, 1, 65_535),
    // Custom texture packs can legitimately contain ~40 MB of base64 PNG data.
    wsMaxPayloadBytes: integerEnv(env, 'HEX_WS_MAX_PAYLOAD', 48 * 1024 * 1024, 1024, 64 * 1024 * 1024),
    authAttemptsPerMinute: integerEnv(env, 'HEX_AUTH_ATTEMPTS_PER_MINUTE', 12, 2, 120),
    allowedOrigins: commaSeparatedSet(env.HEX_ALLOWED_ORIGINS),
    trustProxy: booleanEnv(env, 'HEX_TRUST_PROXY', !!env.RAILWAY_ENVIRONMENT),
  });
}

module.exports = {
  booleanEnv,
  clientAddress,
  commaSeparatedSet,
  forwardedHost,
  integerEnv,
  isAllowedWebSocketOrigin,
  runtimeConfig,
  securityHeaders,
};
