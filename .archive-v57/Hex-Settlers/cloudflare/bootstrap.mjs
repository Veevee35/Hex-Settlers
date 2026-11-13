// Download the CURRENT private R2 state before starting the original Node game.
// Fail closed if the account backup is absent, to prevent accidental fresh accounts.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const endpoint = String(process.env.CLOUDFLARE_STATE_ENDPOINT || '');
const dir = process.env.DATA_DIR || '/data';
if (!endpoint) throw new Error('CLOUDFLARE_STATE_ENDPOINT is required in Cloudflare Containers');
await mkdir(dir, { recursive: true, mode: 0o700 });
const stateNames = ['users.json', 'game_history.json', 'game_analytics.json', 'beta_program.json', 'active_rooms.json', 'rating_policy.json', 'neural_ai_model.json'];
let userBackup = false;
for (const name of stateNames) {
  const result = await fetch(`${endpoint}/state/${name}`, { signal: AbortSignal.timeout(60000) });
  if (result.status === 404) continue;
  if (!result.ok) throw new Error(`Cannot hydrate ${name} from R2 (HTTP ${result.status}); refusing to boot`);
  const data = await result.text();
  JSON.parse(data); // Never silently start with a corrupt database.
  await writeFile(path.join(dir, name), data, { mode: 0o600 });
  if (name === 'users.json') userBackup = true;
  console.log('[state] restored', name, Buffer.byteLength(data), 'bytes');
}
if (!userBackup && process.env.ALLOW_EMPTY_DATABASE !== '1') {
  throw new Error('users.json missing from R2; import Railway backup first. Refusing to launch empty server.');
}
if (!userBackup) console.warn('[state] ALLOW_EMPTY_DATABASE=1 set; starting first-time installation');
let cursor;
let textures = 0;
do {
  const query = new URLSearchParams({ list: 'textures', ...(cursor ? { cursor } : {}) });
  const list = await fetch(`${endpoint}/state/?${query}`, { signal: AbortSignal.timeout(30000) });
  if (!list.ok) throw new Error(`Cannot enumerate texture packs (HTTP ${list.status})`);
  const data = await list.json();
  for (const key of data.keys || []) {
    if (!/^state\/texture-packs\/[a-f0-9]{36}\/(?:[\w .-]+\/)*[\w .-]+$/.test(key) || key.includes('/../')) {
      throw new Error(`Unsafe R2 texture object key: ${key}`);
    }
    const response = await fetch(`${endpoint}/${key.split('/').map(encodeURIComponent).join('/')}`, { signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`Cannot restore ${key} (HTTP ${response.status})`);
    const out = path.join(dir, key.slice('state/'.length));
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, Buffer.from(await response.arrayBuffer()), { mode: 0o600 });
    textures++;
  }
  cursor = data.cursor || null;
} while (cursor);
console.log('[state] ready:', userBackup ? 'existing accounts restored' : 'fresh database', `(${textures} custom textures)`);
