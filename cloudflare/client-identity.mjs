// The Worker is the only component authorized to stamp a trusted client IP
// for the proxied Node game container. Never propagate caller-supplied XFF.
export function trustedClientIp(request) {
  const ip = String(request.headers.get('CF-Connecting-IP') || '').trim();
  // Cloudflare sets CF-Connecting-IP; malformed/missing values share a safe
  // fallback rate-limit bucket instead of using a spoofable forwarded header.
  return /^[0-9a-fA-F:.]{3,45}$/.test(ip) ? ip : 'unknown';
}
