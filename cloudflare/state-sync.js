'use strict';
// Container-only R2 persistence bridge via Cloudflare outboundByHost.
// It cannot be reached by the public Internet or by browser-originated requests.
const path = require('node:path');
const STATE_ENDPOINT = String(process.env.CLOUDFLARE_STATE_ENDPOINT || '').replace(/\/$/, '');
const STATE_FILES = new Set(['users.json', 'active_rooms.json', 'game_history.json', 'game_analytics.json', 'rating_policy.json', 'neural_ai_model.json', 'build-version.json', 'training_runs.json', 'training_candidate.json', 'training_previous_candidate.json', 'training_previous_live.json', 'training_report.json']);
const failedKeys = new Map();
function isEnabled() { return !!STATE_ENDPOINT; }
function isUnhealthy() { return failedKeys.size > 0; }
function assertKey(key) {
  if (STATE_FILES.has(key)) return `state/${key}`;
  if (/^backups\/[a-z0-9_\-]{1,100}\.json$/.test(key)) return `state/${key}`;
  const parts = key.split('/');
  if (parts.length >= 3 && parts[0] === 'texture-packs' && /^[a-f0-9]{36}$/.test(parts[1])
      && parts.slice(2).every(s => s && s !== '.' && s !== '..' && /^[\w .-]+$/.test(s))) return `state/${key}`;
  throw new Error(`Unsafe state key: ${key}`);
}
function urlFor(key) { return `${STATE_ENDPOINT}/${assertKey(key).split('/').map(encodeURIComponent).join('/')}`; }
async function send(key, method, data) {
  if (!isEnabled()) return;
  let error;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await fetch(urlFor(key), { method, ...(data != null ? { body: data } : {}), signal: AbortSignal.timeout(25000) });
      if (!response.ok) throw new Error(`R2 state ${method} ${key}: HTTP ${response.status}`);
      failedKeys.delete(key);
      return;
    } catch (e) {
      error = e;
      if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 400 * 2 ** attempt));
    }
  }
  failedKeys.set(key, String(error));
  console.error('[cloudflare state] Persistent write FAILED; game data may not survive a restart:', error);
  throw error;
}
async function getVersionState() {
  if (!isEnabled()) return null;
  const response = await fetch(urlFor('build-version.json'), { signal: AbortSignal.timeout(15000) });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`R2 build version read failed: ${response.status}`);
  return response.json();
}
async function persistVersionState(state) { return send('build-version.json', 'PUT', JSON.stringify(state)); }
async function persistJsonFile(filePath, text) {
  if (!STATE_FILES.has(path.basename(filePath))) return;
  return send(path.basename(filePath), 'PUT', text);
}
async function persistBackup(name, bytes) {
  return send(`backups/${name}`, 'PUT', bytes);
}
async function persistTexture(storageKey, rel, bytes) {
  return send(`texture-packs/${storageKey}/${rel.replace(/\\/g, '/')}`, 'PUT', bytes);
}
async function removeTexture(storageKey, rel) {
  return send(`texture-packs/${storageKey}/${rel.replace(/\\/g, '/')}`, 'DELETE');
}
module.exports = { getVersionState, persistVersionState, isEnabled, isUnhealthy, persistJsonFile, persistBackup, persistTexture, removeTexture, assertKey };
