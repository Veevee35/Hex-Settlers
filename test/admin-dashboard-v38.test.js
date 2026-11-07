'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const net = require('node:net');
const path = require('node:path');
const root = path.join(__dirname, '..');
const { HISTORY_EXPORT_FORMAT, validatedImportedHistory, mergeHistory } = require('../server/admin-history');

function historyGame(id, roomCode, endedAt) {
  return {
    id, roomCode, startedAt: endedAt - 60000, endedAt, turns: 12,
    winnerId: 'seed-player-1', winnerName: 'Winner', ranked: false,
    rules: { mapMode: 'classic' }, players: [{ id: 'seed-player-1', name: 'Winner', vp: 10 }],
    snapshot: { phase: 'game-over', winnerId: 'seed-player-1', stats: {}, players: [] },
    log: [{ id: 1, text: 'Won' }], replay: { initial: { phase: 'lobby' }, steps: [] },
  };
}

function unusedPort() {
  return new Promise((resolve, reject) => {
    const listener = net.createServer();
    listener.once('error', reject);
    listener.listen(0, '127.0.0.1', () => {
      const port = listener.address().port;
      listener.close(error => error ? reject(error) : resolve(port));
    });
  });
}

async function post(port, route, body, cookie = '') {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  const response = await fetch(`http://127.0.0.1:${port}${route}`, {
    method: 'POST', headers, body: JSON.stringify(body),
  });
  const data = await response.json();
  return { status: response.status, data, cookie: String(response.headers.get('set-cookie') || '').split(';')[0] };
}

test('history backup import validates shape, IDs, and retention without losing saved games', () => {
  const isValid = g => !!(g?.snapshot?.phase === 'game-over' && Array.isArray(g.players));
  const original = historyGame('game-test-000001', 'ABCD', Date.now());
  assert.equal(HISTORY_EXPORT_FORMAT, 'hex-settlers-history-v1');
  const entries = validatedImportedHistory({ format: HISTORY_EXPORT_FORMAT, games: [original] }, isValid, v => v, 10);
  assert.equal(entries.length, 1);
  const merge = mergeHistory([original], [...entries, historyGame('game-test-000002', 'EFGH', Date.now() + 10000)], 10);
  assert.equal(merge.added, 1);
  assert.equal(merge.skipped, 1);
  assert.throws(() => validatedImportedHistory({ format: HISTORY_EXPORT_FORMAT, games: [original, original] }, isValid, v => v, 10), /distinct/i);
  assert.throws(() => mergeHistory([original], [historyGame('game-test-000003', 'EFGH', Date.now())], 1), /retention limit/i);
});

test('admin dashboard has five tabs, self-only Manage Account, casual four-map rules browser', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const client = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'public/styles.css'), 'utf8');
  assert.match(html, /id="adminManagementBtn"[^>]*hidden/);
  assert.match(html, /id="rulesPageCategoryTabs"/);
  assert.match(html, /id="rulesPageScenarioTabs"/);
  assert.match(client, /\['classic', 'Classic 2–4'\], \['classic56', 'Classic 5–6'\]/);
  assert.match(client, /\['seafarers', 'Seafarers 2–4'\], \['seafarers56', 'Seafarers 5–6'\]/);
  assert.match(client, /scenarioOptions = \{[\s\S]*?seafarers56:/);
  assert.match(client, /options = \[[\s\S]*?\['history', 'Manage Game History'\][\s\S]*?\['health', 'Health Monitor'\]/);
  assert.match(client, /openUserManagementScreen\(\{ selfOnly: true \}\)/);
  assert.match(client, /if \(casual && ui\.classicCustomMapToggle\) ui\.classicCustomMapToggle\.checked = false/);
  assert.match(css, /\.adminDashboard/);
  assert.match(css, /\.rulesCategoryTabs/);
});

test('admin endpoints protect, export, import, delete and triple-confirm history reset; expose real process diagnostics', { timeout: 20_000 }, async t => {
  const port = await unusedPort();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hex-v38-admin-'));
  const now = Date.now();
  fs.writeFileSync(path.join(dataDir, 'game_history.json'), JSON.stringify({ version: 1, games: [
    historyGame('game-seed-00000001', 'ABCD', now - 70000),
    historyGame('game-seed-00000002', 'EFGH', now),
  ] }));
  let stderr = '';
  const processHandle = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', DATA_DIR: dataDir,
      NODE_ENV: 'test', HEX_BUILTIN_ADMIN_ENABLED: 'true', HEX_ADMIN_PASSWORD: 'V38 secure admin pass' },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  processHandle.stderr.on('data', chunk => { stderr += chunk; });
  t.after(async () => {
    if (processHandle.exitCode === null) {
      processHandle.kill('SIGTERM');
      await Promise.race([new Promise(resolve => processHandle.once('exit', resolve)), new Promise(resolve => setTimeout(resolve, 2500))]);
      if (processHandle.exitCode === null) processHandle.kill('SIGKILL');
    }
    fs.rmSync(dataDir, { recursive: true, force: true });
  });
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try { const res = await fetch(`http://127.0.0.1:${port}/health`); if (res.ok) { ready = true; break; } } catch (_) {}
    await new Promise(resolve => setTimeout(resolve, 40));
  }
  assert.equal(ready, true, stderr);

  const admin = await post(port, '/api/auth/login', { username: 'Benleethom', password: 'V38 secure admin pass' });
  assert.equal(admin.status, 200);
  const visitor = await post(port, '/api/auth/register', { username: 'ordinary_v38', password: 'hello test password', displayName: 'Ordinary' });
  assert.equal(visitor.status, 200);
  for (const endpoint of ['history-list', 'history-export', 'history-delete', 'history-import', 'history-reset-challenge', 'health']) {
    const forbidden = await post(port, `/api/admin/${endpoint}`, {}, visitor.cookie);
    assert.equal(forbidden.status, 403, `${endpoint} must be admin-only`);
  }
  const base = await post(port, '/api/admin/history-list', {}, admin.cookie);
  assert.equal(base.status, 200);
  assert.equal(base.data.games.length, 2);
  const snapshot = await post(port, '/api/admin/history-export', {}, admin.cookie);
  assert.equal(snapshot.data.archive.format, HISTORY_EXPORT_FORMAT);
  assert.equal(snapshot.data.archive.games.length, 2);
  assert.equal(typeof snapshot.data.archive.games[0].replayJson, 'string');
  const health = await post(port, '/api/admin/health', {}, admin.cookie);
  assert.equal(health.status, 200);
  assert.equal(typeof health.data.cpu.percentOneCore, 'number');
  assert.ok(health.data.memory.rssBytes > 0);
  assert.equal(health.data.persistence.historyGames, 2);
  assert.equal(health.data.persistence.writable, true);
  assert.ok(health.data.persistence.files.some(f => f.name === 'game_history.json'));

  const newGame = historyGame('game-seed-00000003', 'IJKL', now + 80000);
  const bad = await post(port, '/api/admin/history-import', { archive: { format: 'junk', games: [newGame] } }, admin.cookie);
  assert.equal(bad.status, 400);
  const merged = await post(port, '/api/admin/history-import', {
    archive: { format: HISTORY_EXPORT_FORMAT, games: [...snapshot.data.archive.games, newGame] },
  }, admin.cookie);
  assert.equal(merged.status, 200);
  assert.equal(merged.data.added, 1);
  assert.equal(merged.data.skipped, 2);
  const noDelete = await post(port, '/api/admin/history-delete', { ids: ['game-seed-00000001'] }, admin.cookie);
  assert.equal(noDelete.status, 400);
  const deleted = await post(port, '/api/admin/history-delete', {
    ids: ['game-seed-00000001'], confirm: 'DELETE SELECTED', acknowledgePermanent: true,
  }, admin.cookie);
  assert.equal(deleted.status, 200);
  assert.equal(deleted.data.removed, 1);
  assert.equal(fs.existsSync(path.join(dataDir, deleted.data.backup)), true);

  const challenge = await post(port, '/api/admin/history-reset-challenge', {}, admin.cookie);
  assert.equal(challenge.status, 200);
  const rejected = await post(port, '/api/admin/history-reset', {
    challenge: challenge.data.challenge, confirm: 'DELETE ALL GAME HISTORY', check1: true, check2: false, check3: true,
  }, admin.cookie);
  assert.equal(rejected.status, 409);
  const next = await post(port, '/api/admin/history-reset-challenge', {}, admin.cookie);
  const reset = await post(port, '/api/admin/history-reset', {
    challenge: next.data.challenge, confirm: 'DELETE ALL GAME HISTORY', check1: true, check2: true, check3: true,
  }, admin.cookie);
  assert.equal(reset.status, 200);
  assert.equal(fs.existsSync(path.join(dataDir, reset.data.backup)), true);
  const empty = await post(port, '/api/admin/history-list', {}, admin.cookie);
  assert.equal(empty.data.games.length, 0);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dataDir, 'game_history.json'), 'utf8')).games.length, 0);
});
