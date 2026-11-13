
'use strict';

const crypto = require('node:crypto');

const DISCORD_APP_ID = '1477895334406656101';
const ACTIVITY_HOST = 'activity.hexsettlers.org';
const DISCORD_PROXY_ORIGIN = `https://${DISCORD_APP_ID}.discordsays.com`;
const TTL_MS = 4 * 60 * 1000;

function validInstanceId(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{4,160}$/.test(value);
}
function isActivityRequest(request, trustProxy = false) {
  const host = String((trustProxy ? request.headers['x-forwarded-host'] : request.headers.host) || '').split(',')[0].trim().toLowerCase();
  return host === ACTIVITY_HOST;
}
function safeCompare(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function signature(data, secret) {
  return crypto.createHmac('sha256', String(secret)).update('hexsettlers-discord-v1.' + data).digest('base64url');
}
function issueJoinTicket({ userId, discordId, instanceId, secret, clock = Date.now }) {
  if (!userId || !/^\d{15,22}$/.test(String(discordId)) || !validInstanceId(instanceId) || !secret) throw new Error('Invalid Activity ticket request.');
  const content = Buffer.from(JSON.stringify({ v: 1, u: String(userId), d: String(discordId), i: instanceId, e: clock() + TTL_MS })).toString('base64url');
  return `${content}.${signature(content, secret)}`;
}
function verifyJoinTicket(ticket, userId, secret, clock = Date.now) {
  if (typeof ticket !== 'string' || ticket.length > 1200 || !secret) return null;
  const parts = ticket.split('.');
  if (parts.length !== 2 || !safeCompare(parts[1], signature(parts[0], secret))) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    if (payload.v !== 1 || payload.u !== String(userId) || !/^\d{15,22}$/.test(payload.d) || !validInstanceId(payload.i) || !Number.isFinite(payload.e) || payload.e < clock() || payload.e > clock() + TTL_MS) return null;
    return payload;
  } catch { return null; }
}
async function discordJson(url, options, fetchImpl = fetch) {
  const response = await fetchImpl(url, { ...options, signal: AbortSignal.timeout(7000) });
  let body;
  try { body = await response.json(); } catch { throw new Error('Discord returned an invalid API response.'); }
  if (!response.ok) throw new Error(`Discord API returned HTTP ${response.status}.`);
  return body;
}
async function verifyDiscordActivity({ code, instanceId, clientId, clientSecret, botToken, fetchImpl = fetch }) {
  if (String(clientId) !== DISCORD_APP_ID || !clientSecret || !botToken || !validInstanceId(instanceId) || typeof code !== 'string' || !/^\S{8,2000}$/.test(code)) {
    throw new Error('Discord Activity configuration or authorization is invalid.');
  }
  const token = await discordJson('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'authorization_code', code }),
  }, fetchImpl);
  if (!token.access_token || token.token_type?.toLowerCase() !== 'bearer') throw new Error('Discord did not issue a usable token.');
  const viewer = await discordJson('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${token.access_token}` } }, fetchImpl);
  if (!/^\d{15,22}$/.test(String(viewer.id || ''))) throw new Error('Discord identity verification failed.');
  const instance = await discordJson(`https://discord.com/api/applications/${clientId}/activity-instances/${encodeURIComponent(instanceId)}`,
    { headers: { Authorization: `Bot ${botToken}` } }, fetchImpl);
  if (instance.application_id !== clientId || instance.instance_id !== instanceId || !Array.isArray(instance.users) || !instance.users.some(id => String(id) === String(viewer.id))) {
    throw new Error('You are not a participant in that Discord Activity instance.');
  }
  return { accessToken: token.access_token, discordId: String(viewer.id), displayName: String(viewer.global_name || viewer.username || 'Discord player').slice(0, 60) };
}
module.exports = { DISCORD_APP_ID, ACTIVITY_HOST, DISCORD_PROXY_ORIGIN, isActivityRequest, issueJoinTicket, validInstanceId, verifyJoinTicket, verifyDiscordActivity };
