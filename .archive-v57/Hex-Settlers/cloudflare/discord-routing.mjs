// Public Discord application ID; no bot or OAuth secrets are stored here.
export const DISCORD_APP_ID = '1477895334406656101';
export const ACTIVITY_HOST = 'activity.hexsettlers.org';
export const DISCORD_PROXY_ORIGIN = 'https://1477895334406656101.discordsays.com';

export function isActivityHost(request) {
  return new URL(request.url).hostname.toLowerCase() === ACTIVITY_HOST;
}

export function permittedActivityOrigin(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return true; // GETs and some WebSocket clients omit Origin.
  try {
    const url = new URL(request.url);
    return new URL(origin).origin === url.origin ||
      (isActivityHost(request) && origin === DISCORD_PROXY_ORIGIN);
  } catch { return false; }
}

export function frameHeadersForActivity(headers, request) {
  if (!isActivityHost(request)) return headers;
  headers.delete('X-Frame-Options'); // DENY blocks an embedded Discord Activity.
  headers.delete('Cross-Origin-Opener-Policy');
  const previous = headers.get('Content-Security-Policy') || '';
  headers.set('Content-Security-Policy', previous.replace(/frame-ancestors 'none'/,
    'frame-ancestors https://discord.com https://*.discord.com https://*.discordapp.com'));
  return headers;
}
