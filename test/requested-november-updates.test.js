'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const os = require('node:os');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { test } = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const serverSource = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const clientSource = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');

// Execute the actual number distributor (not a parallel copy) with test shuffle.
test('Cartographer/Scattered Tiles number distribution never puts a 6 or 8 on gold', () => {
  const begin = serverSource.indexOf('function assignCartographerLandNumbers(');
  const end = serverSource.indexOf('\nfunction pickLandTileIds(', begin);
  assert.ok(begin !== -1 && end > begin);
  const context = vm.createContext({
    shuffle: (values) => values.sort(() => Math.random() - 0.5),
    hasGoldSixOrEight: (tiles) => tiles.some(t => t.type === 'gold' && (t.number === 6 || t.number === 8)),
  });
  vm.runInContext(serverSource.slice(begin, end), context);
  const assign = context.assignCartographerLandNumbers;
  for (const [numGold, numOrdinary, numbers] of [
    [4, 20, [2, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 8, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 12]],
    [5, 25, [2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 6, 8, 8, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12]],
    [6, 30, [2, 2, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6, 6, 8, 8, 8, 8, 8, 9, 9, 9, 9, 10, 10, 10, 10, 11, 11, 11, 12, 12]],
  ]) {
    for (let trial = 0; trial < 500; trial++) {
      const land = [
        ...Array.from({ length: numGold }, () => ({ type: 'gold', number: null })),
        ...Array.from({ length: numOrdinary }, () => ({ type: 'field', number: null })),
      ];
      assert.equal(assign(land, numbers), true);
      assert.equal(land.filter(t => t.type === 'gold' && [6, 8].includes(t.number)).length, 0);
      assert.deepEqual(land.map(t => t.number).sort((a, b) => a - b), numbers.slice().sort((a, b) => a - b));
    }
  }
  assert.equal(assign([{ type: 'gold' }, { type: 'gold' }, { type: 'field' }], [6, 8, 3]), false);
});

test('Back is available to every active player after the first completed turn', () => {
  assert.match(serverSource, /const outOfTurnOk =\s*\(kind === 'propose_turn_undo'\) \|\|\s*\(kind === 'respond_turn_undo'\)/);
  assert.match(serverSource, /kind !== 'choose_discovery' && kind !== 'propose_turn_undo' && kind !== 'respond_turn_undo'/);
  assert.match(serverSource, /state\.canUndoPreviousTurn = !!game\._previousTurnSnapshot/);
  assert.match(clientSource, /ui\.backTurnBtn\.disabled = !myPlayerId \|\| !state\?\.canUndoPreviousTurn/);
  assert.match(clientSource, /const undoVoteAction = action\.kind === 'propose_turn_undo' \|\| action\.kind === 'respond_turn_undo'/);
  assert.match(serverSource, /if \(!game\._previousTurnSnapshot\) return \{ ok: false/);
  assert.match(serverSource, /Object\.values\(responses\)\.every\(\(response\) => response === 'accept'\)/);
});

test('terms and privacy reference the new support mailbox', () => {
  for (const policy of ['terms_of_service.html', 'privacy_policy.html']) {
    const content = fs.readFileSync(path.join(root, policy), 'utf8');
    assert.match(content, /mailto:support@hexsettlers\.org/);
    assert.doesNotMatch(content, /@hexisles\.com/);
  }
});

async function unusedPort() {
  const server = net.createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function startServer(port, dataDir) {
  const child = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', DATA_DIR: dataDir, NODE_ENV: 'test', HEX_BUILTIN_ADMIN_ENABLED: 'true', HEX_ADMIN_PASSWORD: 'Admin test password 4321' },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  let output = '';
  child.stdout.on('data', (part) => { output += part.toString(); });
  child.stderr.on('data', (part) => { output += part.toString(); });
  const deadline = Date.now() + 9000;
  while (Date.now() < deadline) {
    if (child.exitCode != null) throw new Error(`Server exited: ${output}`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      if (response.ok) return child;
    } catch (_) {}
    await new Promise((resolve) => setTimeout(resolve, 40));
  }
  throw new Error(`Server did not start: ${output}`);
}

async function stopServer(child) {
  if (child.exitCode != null) return;
  const exited = once(child, 'exit');
  if (child.connected) child.send({ type: 'shutdown' });
  else child.kill('SIGTERM');
  const stopped = await Promise.race([exited.then(() => true), new Promise(r => setTimeout(() => r(false), 3500))]);
  if (!stopped) { child.kill('SIGKILL'); await exited; }
}

test('change-name changes only display name, allows duplicates and persists admin name after restart', { timeout: 30000 }, async (t) => {
  const port = await unusedPort();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hex-nov-name-'));
  let server = await startServer(port, dataDir);
  t.after(async () => { await stopServer(server); fs.rmSync(dataDir, { recursive: true, force: true }); });
  async function post(route, body, cookie = '') {
    const headers = { 'Content-Type': 'application/json' };
    if (cookie) headers.Cookie = cookie;
    const response = await fetch(`http://127.0.0.1:${port}${route}`, { method: 'POST', headers, body: JSON.stringify(body) });
    const payload = await response.json();
    return { code: response.status, payload, cookie: (response.headers.get('set-cookie') || '').split(';')[0] };
  }
  const first = await post('/api/auth/register', { username: 'renamer_a', password: 'Pass phrase 123', displayName: 'Original' });
  const second = await post('/api/auth/register', { username: 'renamer_b', password: 'Pass phrase 123', displayName: 'Someone else' });
  assert.equal(first.code, 200);
  assert.equal(second.code, 200);
  const denied = await post('/api/auth/register', { username: 'renamer_a', password: 'Pass phrase 123', displayName: 'Other' });
  assert.equal(denied.code, 400, 'username uniqueness is enforced independently of display names');
  const name1 = await post('/api/account/change-name', { displayName: 'Shared Player' }, first.cookie);
  const name2 = await post('/api/account/change-name', { displayName: 'Shared Player' }, second.cookie);
  assert.equal(name1.code, 200); assert.equal(name2.code, 200);
  assert.equal(name1.payload.user.username, 'renamer_a');
  assert.equal(name2.payload.user.username, 'renamer_b');
  assert.equal(name1.payload.user.displayName, name2.payload.user.displayName);
  for (const invalid of ['', 'x'.repeat(21), '\n']) {
    const response = await post('/api/account/change-name', { displayName: invalid }, first.cookie);
    assert.equal(response.code, 400);
  }
  const admin = await post('/api/auth/login', { username: 'Benleethom', password: 'Admin test password 4321' });
  assert.equal(admin.code, 200);
  const renamedAdmin = await post('/api/account/change-name', { displayName: 'Ghost Admin' }, admin.cookie);
  assert.equal(renamedAdmin.code, 200);
  assert.equal(renamedAdmin.payload.user.displayName, 'Ghost Admin');
  await stopServer(server);
  server = await startServer(port, dataDir);
  const reloadedAdmin = await post('/api/auth/login', { username: 'Benleethom', password: 'Admin test password 4321' });
  assert.equal(reloadedAdmin.payload.user.displayName, 'Ghost Admin');
  const userList = await post('/api/account/users', {}, reloadedAdmin.cookie);
  assert.equal(userList.payload.users.find((u) => u.username === 'renamer_a').displayName, 'Shared Player');
  assert.equal(userList.payload.users.find((u) => u.username === 'renamer_b').displayName, 'Shared Player');
});
