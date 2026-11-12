'use strict';

// Only the public site key is ever returned to the browser. The secret is
// required for every protected operation and is never included in a response.
const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

function turnstileConfig(env = process.env) {
  return {
    siteKey: String(env.TURNSTILE_SITE_KEY || '').trim(),
    secret: String(env.TURNSTILE_SECRET_KEY || '').trim(),
  };
}

async function verifyTurnstile(token, {
  secret, action, hostname, remoteIp = '', fetchImpl = fetch,
} = {}) {
  if (!secret) return { ok: false, error: 'CAPTCHA verification is not configured.' };
  const value = typeof token === 'string' ? token.trim() : '';
  if (!value || value.length > 2048) return { ok: false, error: 'Complete the CAPTCHA to continue.' };
  const form = new URLSearchParams({ secret, response: value });
  if (remoteIp && remoteIp !== 'unknown') form.set('remoteip', remoteIp);
  try {
    const response = await fetchImpl(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return { ok: false, error: 'CAPTCHA service is unavailable. Try again.' };
    const result = await response.json();
    if (result.success !== true || result.action !== action ||
      (hostname && String(result.hostname || '').toLowerCase() !== String(hostname).toLowerCase()) ||
      !result.challenge_ts || !Number.isFinite(Date.parse(result.challenge_ts)) ||
      Math.abs(Date.now() - Date.parse(result.challenge_ts)) > 5 * 60 * 1000) {
      return { ok: false, error: 'CAPTCHA verification failed or expired. Try again.' };
    }
    return { ok: true };
  } catch (_) {
    return { ok: false, error: 'CAPTCHA service is unavailable. Try again.' };
  }
}

module.exports = { turnstileConfig, verifyTurnstile };
