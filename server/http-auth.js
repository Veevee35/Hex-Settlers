'use strict';

const SESSION_COOKIE_NAME = 'hexsettlers_session';

function parseCookies(header) {
  const cookies = Object.create(null);
  for (const part of String(header || '').split(';')) {
    const separator = part.indexOf('=');
    if (separator <= 0) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    try { cookies[key] = decodeURIComponent(value); } catch (_) { cookies[key] = value; }
  }
  return cookies;
}

function requestIsTls(request, trustProxy = false) {
  const forwarded = trustProxy ? String(request && request.headers && request.headers['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase() : '';
  return !!(request && request.socket && request.socket.encrypted) || forwarded === 'https';
}

function sessionCookie(token, { secure = false, maxAgeSeconds = 30 * 24 * 60 * 60 } = {}) {
  const parts = [`${SESSION_COOKIE_NAME}=${encodeURIComponent(String(token || ''))}`, 'Path=/', 'HttpOnly', 'SameSite=Strict',
    `Max-Age=${Math.max(0, Math.floor(Number(maxAgeSeconds || 0)))}`];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

function clearSessionCookie({ secure = false } = {}) { return sessionCookie('', { secure, maxAgeSeconds: 0 }); }

function readJsonBody(request, maxBytes = 16 * 1024) {
  return new Promise((resolve, reject) => {
    let total = 0; let tooLarge = false; const chunks = [];
    request.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) { tooLarge = true; chunks.length = 0; return; }
      if (!tooLarge) chunks.push(chunk);
    });
    request.on('end', () => {
      if (tooLarge) { const error = new Error('Request body is too large.'); error.statusCode = 413; reject(error); return; }
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch (_) { const error = new Error('Invalid JSON body.'); error.statusCode = 400; reject(error); }
    });
    request.on('error', reject);
  });
}

module.exports = { SESSION_COOKIE_NAME, clearSessionCookie, parseCookies, readJsonBody, requestIsTls, sessionCookie };
