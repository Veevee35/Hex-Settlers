'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { test } = require('node:test');
const WebSocket = require('ws');

const PROJECT_ROOT = path.resolve(__dirname, '..');

async function unusedPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close((error) => error ? reject(error) : resolve(address.port));
    });
  });
}

async function waitForHttp(port, processOutput) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`);
      if (response.ok) return;
    } catch (_) {}
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Server did not start. Output:\n${processOutput()}`);
}

async function startServer(port, dataDir, entryPoint = 'server.js') {
  let output = '';
  const child = spawn(process.execPath, [entryPoint], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', DATA_DIR: dataDir, NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    windowsHide: true,
  });
  child.stdout.on('data', (chunk) => { output += String(chunk); });
  child.stderr.on('data', (chunk) => { output += String(chunk); });
  await waitForHttp(port, () => output);
  return {
    child,
    output: () => output,
    async stop() {
      if (child.exitCode !== null) return;
      const exited = once(child, 'exit');
      if (child.connected) child.send({ type: 'shutdown' });
      const completed = await Promise.race([
        exited.then(() => true),
        new Promise((resolve) => setTimeout(() => resolve(false), 5_000)),
      ]);
      if (!completed && child.exitCode === null) {
        child.kill('SIGTERM');
        await once(child, 'exit');
      }
    },
  };
}

class Peer {
  constructor(ws) {
    this.ws = ws;
    this.messages = [];
    this.waiters = [];
    ws.on('message', (raw) => this.accept(JSON.parse(String(raw))));
  }

  static async connect(port, options = undefined) {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`, options);
    const peer = new Peer(ws);
    await new Promise((resolve, reject) => {
      ws.once('open', resolve);
      ws.once('error', reject);
    });
    await peer.waitFor((message) => message.type === 'hello');
    return peer;
  }

  accept(message) {
    const waiterIndex = this.waiters.findIndex((waiter) => waiter.predicate(message));
    if (waiterIndex >= 0) {
      const [waiter] = this.waiters.splice(waiterIndex, 1);
      clearTimeout(waiter.timer);
      waiter.resolve(message);
      return;
    }
    this.messages.push(message);
  }

  send(message) {
    this.ws.send(JSON.stringify(message));
  }

  waitFor(predicate, timeoutMs = 5_000) {
    const queuedIndex = this.messages.findIndex(predicate);
    if (queuedIndex >= 0) return Promise.resolve(this.messages.splice(queuedIndex, 1)[0]);
    return new Promise((resolve, reject) => {
      const waiter = { predicate, resolve, reject, timer: null };
      waiter.timer = setTimeout(() => {
        const index = this.waiters.indexOf(waiter);
        if (index >= 0) this.waiters.splice(index, 1);
        reject(new Error(`Timed out waiting for WebSocket message. Queued: ${JSON.stringify(this.messages)}`));
      }, timeoutMs);
      this.waiters.push(waiter);
    });
  }

  close() {
    try { this.ws.terminate(); } catch (_) {}
  }
}

test('account, lobby, chat, and game-start protocol remains compatible', { timeout: 20_000 }, async (t) => {
  const port = await unusedPort();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hex-settlers-test-'));
  const server = await startServer(port, dataDir);

  const peers = [];
  t.after(async () => {
    for (const peer of peers) peer.close();
    await server.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  const unauthenticated = await Peer.connect(port);
  peers.push(unauthenticated);
  unauthenticated.send({ type: 'create_room', name: 'No account' });
  const authError = await unauthenticated.waitFor((message) => message.type === 'error');
  assert.match(authError.error, /log in/i);
  unauthenticated.close();

  const suffix = Date.now().toString(36).slice(-8);
  const host = await Peer.connect(port);
  peers.push(host);
  host.send({ type: 'auth_register', username: `host_${suffix}`, password: 'correct horse', displayName: 'Host' });
  const hostAuth = await host.waitFor((message) => message.type === 'auth_ok');
  assert.equal(hostAuth.user.displayName, 'Host');
  assert.equal(typeof hostAuth.token, 'string');

  host.send({ type: 'create_room', name: 'Host' });
  const hostJoined = await host.waitFor((message) => message.type === 'joined');
  assert.match(hostJoined.room.code, /^[A-Z2-9]{4}$/);
  assert.equal(hostJoined.isHost, true);

  const guest = await Peer.connect(port);
  peers.push(guest);
  guest.send({ type: 'auth_register', username: `guest_${suffix}`, password: 'correct horse', displayName: 'Guest' });
  await guest.waitFor((message) => message.type === 'auth_ok');
  guest.send({ type: 'join_room', code: hostJoined.room.code, name: 'Guest' });
  const guestJoined = await guest.waitFor((message) => message.type === 'joined');
  assert.equal(guestJoined.room.players.length, 2);

  guest.send({ type: 'chat', text: 'hello from integration test' });
  const roomWithChat = await host.waitFor((message) =>
    message.type === 'room' && message.room.chat.some((entry) => entry.text === 'hello from integration test'));
  assert.equal(roomWithChat.room.chat.at(-1).from, 'Guest');

  host.send({ type: 'start_game' });
  const startedState = await host.waitFor((message) =>
    message.type === 'state' && message.state.phase !== 'lobby');
  assert.equal(startedState.state.players.length, 2);
  assert.match(startedState.state.phase, /^setup1-/);
  const guestStateInHostView = startedState.state.players.find((player) => player.name === 'Guest');
  assert.equal(guestStateInHostView.resources, undefined);
  assert.equal(typeof guestStateInHostView.handCount, 'number');

  assert.equal(fs.existsSync(path.join(dataDir, 'users.json')), true);
});

test('accounts and active rooms survive a graceful restart without plaintext server tokens', { timeout: 20_000 }, async (t) => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hex-restart-test-'));
  const servers = [];
  const peers = [];
  t.after(async () => {
    for (const peer of peers) peer.close();
    for (const server of servers) await server.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  const firstPort = await unusedPort();
  const firstServer = await startServer(firstPort, dataDir);
  servers.push(firstServer);
  const firstPeer = await Peer.connect(firstPort);
  peers.push(firstPeer);
  const suffix = Date.now().toString(36).slice(-8);
  firstPeer.send({ type: 'auth_register', username: `resume_${suffix}`, password: 'correct horse', displayName: 'Resume' });
  const auth = await firstPeer.waitFor((message) => message.type === 'auth_ok');
  firstPeer.send({ type: 'create_room', name: 'Resume' });
  const joined = await firstPeer.waitFor((message) => message.type === 'joined');
  firstPeer.close();
  await firstServer.stop();

  const usersDb = JSON.parse(fs.readFileSync(path.join(dataDir, 'users.json'), 'utf8'));
  assert.equal(usersDb.users[0].tokens[0].token, undefined);
  assert.match(usersDb.users[0].tokens[0].tokenHash, /^[a-f0-9]{64}$/);
  const activeRoomsDb = JSON.parse(fs.readFileSync(path.join(dataDir, 'active_rooms.json'), 'utf8'));
  assert.equal(activeRoomsDb.rooms.some((room) => room.code === joined.room.code), true);

  const secondPort = await unusedPort();
  const secondServer = await startServer(secondPort, dataDir);
  servers.push(secondServer);
  const resumedPeer = await Peer.connect(secondPort);
  peers.push(resumedPeer);
  resumedPeer.send({ type: 'auth_token', token: auth.token });
  await resumedPeer.waitFor((message) => message.type === 'auth_ok');
  resumedPeer.send({ type: 'rejoin_room', code: joined.room.code });
  const rejoined = await resumedPeer.waitFor((message) => message.type === 'joined');
  assert.equal(rejoined.room.code, joined.room.code);
  assert.equal(rejoined.isHost, true);
  assert.equal(rejoined.room.players[0].name, 'Resume');
});

test('browser authentication uses an HTTP-only cookie for websocket sessions', { timeout: 20_000 }, async (t) => {
  const port = await unusedPort();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hex-cookie-test-'));
  const server = await startServer(port, dataDir);
  const peers = [];
  t.after(async () => {
    for (const peer of peers) peer.close();
    await server.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  const suffix = Date.now().toString(36).slice(-8);
  const response = await fetch(`http://127.0.0.1:${port}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: `http://127.0.0.1:${port}` },
    body: JSON.stringify({ username: `cookie_${suffix}`, password: 'correct horse', displayName: 'Cookie' }),
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.user.displayName, 'Cookie');
  assert.equal(body.token, undefined);
  const setCookie = response.headers.get('set-cookie');
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /SameSite=Strict/);
  const cookie = setCookie.split(';')[0];

  const peer = await Peer.connect(port, {
    headers: { Cookie: cookie, Origin: `http://127.0.0.1:${port}` },
  });
  peers.push(peer);
  const cookieAuth = await peer.waitFor((message) => message.type === 'auth_ok');
  assert.equal(cookieAuth.cookieAuth, true);
  assert.equal(cookieAuth.token, null);
  assert.equal(cookieAuth.user.displayName, 'Cookie');
});

test('compiled deployment bootstrap serves the secured browser application', { timeout: 20_000 }, async (t) => {
  const port = await unusedPort();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hex-bootstrap-test-'));
  const server = await startServer(port, dataDir, path.join('dist', 'server.js'));
  t.after(async () => {
    await server.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  const response = await fetch(`http://127.0.0.1:${port}/`);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /<title>Hex Settlers<\/title>/);
  assert.match(response.headers.get('content-security-policy'), /script-src 'self'/);
});
