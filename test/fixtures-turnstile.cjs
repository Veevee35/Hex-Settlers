'use strict';

// Preloaded only by integration-test server processes. Match the real
// verifier's response schema without making external requests.
const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const realFetch = globalThis.fetch;
globalThis.fetch = (url, options) => {
  if (url !== VERIFY_URL) return realFetch(url, options);
  const form = new URLSearchParams(options.body);
  const [action, hostname] = form.get('response').split('@');
  return Promise.resolve(Response.json({
    success: form.get('secret') === 'integration-test-secret',
    action, hostname, challenge_ts: new Date().toISOString(),
  }));
};
