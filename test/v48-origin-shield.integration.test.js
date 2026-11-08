'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const net = require('node:net');
const path = require('node:path');
const { once } = require('node:events');
const { spawn } = require('node:child_process');
const { test } = require('node:test');
const WebSocket = require('ws');

async function pickPort() {
  const netServer = net.createServer();
  await new Promise(resolve => netServer.listen(0, '127.0.0.1', resolve));
  const port = netServer.address().port;
  await new Promise(resolve => netServer.close(resolve));
  return port;
}

test('configured upstream secret rejects direct API and WebSocket access', {timeout: 16000}, async t => {
  const port = await pickPort();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hex-origin-'));
  const child = spawn(process.execPath, ['server.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: {...process.env, HOST: '127.0.0.1', PORT: String(port), DATA_DIR: dataDir,
      HEX_BUILTIN_ADMIN_ENABLED: 'false', HEX_UPSTREAM_SHARED_SECRET: 'test-origin-secret', NODE_ENV: 'test'},
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stderr.on('data', chunk => { logs += String(chunk); });
  t.after(async () => {
    if (child.exitCode == null) { child.kill('SIGTERM'); await once(child, 'exit'); }
    fs.rmSync(dataDir, {recursive: true, force: true});
  });
  const endpoint = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    try { await fetch(endpoint + '/'); break; } catch { if (i === 99) throw new Error(logs); await new Promise(r => setTimeout(r, 40)); }
  }
  assert.equal((await fetch(endpoint + '/health')).status, 403);
  assert.equal((await fetch(endpoint + '/api/health')).status, 403);
  const protectedHealth = await fetch(endpoint + '/health', {headers: {'X-Hex-Upstream-Secret': 'test-origin-secret'}});
  assert.equal(protectedHealth.status, 200);
  assert.equal((await protectedHealth.json()).ok, true);
  const forbidden = new WebSocket(`ws://127.0.0.1:${port}/ws`);
  const blocked = await new Promise(resolve => {
    forbidden.on('unexpected-response', (_, res) => resolve(res.statusCode));
    forbidden.on('error', () => resolve('error'));
  });
  assert.equal(blocked, 403);
  forbidden.terminate();
  const allowed = new WebSocket(`ws://127.0.0.1:${port}/ws`, {headers: {'X-Hex-Upstream-Secret': 'test-origin-secret'}});
  await once(allowed, 'open');
  allowed.terminate();
});
