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
const { RANKED_SCENARIOS } = require('../server/game-rules');

const ROOT = path.resolve(__dirname, '..');

class Peer {
  constructor(ws) {
    this.ws = ws;
    this.messages = [];
    this.waiters = [];
    ws.on('message', (raw) => {
      const message = JSON.parse(String(raw));
      const i = this.waiters.findIndex((waiter) => waiter.predicate(message));
      if (i >= 0) {
        const [waiter] = this.waiters.splice(i, 1);
        clearTimeout(waiter.timeout);
        waiter.resolve(message);
      } else this.messages.push(message);
    });
  }
  static async connect(port) {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const peer = new Peer(ws);
    await once(ws, 'open');
    await peer.waitFor((msg) => msg.type === 'hello');
    return peer;
  }
  send(message) { this.ws.send(JSON.stringify(message)); }
  waitFor(predicate, ms = 6000) {
    const i = this.messages.findIndex(predicate);
    if (i !== -1) return Promise.resolve(this.messages.splice(i, 1)[0]);
    return new Promise((resolve, reject) => {
      const waiter = { predicate, resolve, timeout: null };
      waiter.timeout = setTimeout(() => {
        this.waiters = this.waiters.filter((candidate) => candidate !== waiter);
        reject(new Error(`Timed out waiting for message; buffered message types: ${this.messages.map((m) => m.type).join(', ')}`));
      }, ms);
      this.waiters.push(waiter);
    });
  }
  close() { this.ws.terminate(); }
}

async function startServer() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hex-cartographer-draft-'));
  const port = await new Promise((resolve, reject) => {
    const socket = net.createServer();
    socket.once('error', reject);
    socket.listen(0, '127.0.0.1', () => {
      const selected = socket.address().port;
      socket.close((error) => error ? reject(error) : resolve(selected));
    });
  });
  let output = '';
  const child = spawn(process.execPath, ['server.js'], {
    cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    env: { ...process.env, NODE_ENV: 'test', DATA_DIR: dataDir, PORT: String(port), HOST: '127.0.0.1' },
  });
  child.stdout.on('data', (data) => output += String(data));
  child.stderr.on('data', (data) => output += String(data));
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`);
      if (res.ok) return {
        port,
        async stop() {
          if (child.exitCode === null) {
            const stopped = once(child, 'exit');
            if (child.connected) child.send({ type: 'shutdown' });
            else child.kill();
            await Promise.race([stopped, new Promise((r) => setTimeout(r, 3000))]);
            if (child.exitCode === null) child.kill('SIGKILL');
          }
          fs.rmSync(dataDir, { recursive: true, force: true });
        },
      };
    } catch (_) {}
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  child.kill('SIGKILL');
  fs.rmSync(dataDir, { recursive: true, force: true });
  throw new Error(`Server startup failed: ${output}`);
}

test('ranked ballots exclude manual Cartographer but still include Scattered Tiles', () => {
  const ids = RANKED_SCENARIOS.map(({ id }) => id);
  assert.ok(ids.includes('cartographer_4_random'));
  assert.ok(!ids.some((id) => /cartographer.*manual/i.test(id)));
  assert.equal(ids.length, 6);
});

for (const [scenario, playerCount] of [['cartographer_4_manual', 4], ['cartographer_56_manual', 6]]) {
  test(`${scenario}: one timed-out tile does not auto-place the other players' turns`, { timeout: 30000 }, async (t) => {
    const server = await startServer();
    const peers = [];
    t.after(async () => {
      for (const peer of peers) peer.close();
      await server.stop();
    });
    const suffix = `${scenario.slice(-5)}_${Date.now().toString(36).slice(-6)}`;
    let roomCode;
    const playerIds = [];
    for (let i = 0; i < playerCount; i++) {
      const peer = await Peer.connect(server.port);
      peers.push(peer);
      peer.send({ type: 'auth_register', username: `draft_${suffix}_${i}`, password: 'cartographer regression test', displayName: `Drafter ${i}` });
      const auth = await peer.waitFor((msg) => msg.type === 'auth_ok');
      playerIds.push(auth.user.id);
      peer.send(i === 0 ? { type: 'create_room' } : { type: 'join_room', code: roomCode });
      const joined = await peer.waitFor((msg) => msg.type === 'joined');
      roomCode = joined.room.code;
      if (i === 0) {
        peer.send({ type: 'set_rules', rules: { mapMode: 'seafarers', seafarersScenario: scenario, setupTurnMs: 5000 } });
        await peer.waitFor((msg) => msg.type === 'room' && msg.room.rules.seafarersScenario === scenario && msg.room.rules.setupTurnMs === 5000);
      }
      peer.send({ type: 'set_ready', ready: true });
    }
    const host = peers[0];
    await host.waitFor((msg) => msg.type === 'room' && msg.room.players.length === playerCount && msg.room.players.every((p) => p.ready));
    host.send({ type: 'start_game' });
    const initial = (await host.waitFor((msg) => msg.type === 'state' && msg.state.phase === 'cartographer-draft')).state;
    assert.equal(initial.cartographerDraft.placedCount, 0);
    const expiredPlayer = initial.currentPlayerId;

    // Let exactly one human player's timer expire; the timeout chooses one tile.
    const afterTimeout = (await host.waitFor((msg) => msg.type === 'state' && msg.state.phase === 'cartographer-draft' && msg.state.cartographerDraft?.placedCount === 1, 9000)).state;
    assert.notEqual(afterTimeout.currentPlayerId, expiredPlayer);
    assert.equal(afterTimeout.cartographerDraft.turnIndex, 1);
    assert.equal(afterTimeout.timer.segmentKey, `cartographer-draft:1:${afterTimeout.currentPlayerId}`);
    assert.ok(afterTimeout.timer.endsAt - Date.now() > 3500, 'next player should get a fresh five-second clock');

    // The previous bug placed all remaining tiles in a few server ticks.
    await new Promise((resolve) => setTimeout(resolve, 700));
    host.send({ type: 'get_state' });
    const checked = (await host.waitFor((msg) => msg.type === 'state' && msg.state.phase === 'cartographer-draft')).state;
    assert.equal(checked.cartographerDraft.placedCount, 1, 'the next human must retain control of their own tile');
    assert.equal(checked.currentPlayerId, afterTimeout.currentPlayerId);

    // Placing manually must also start a fresh timer for the subsequent player.
    const nextPlayer = peers[playerIds.indexOf(checked.currentPlayerId)];
    assert.ok(nextPlayer);
    const tileId = checked.geom.tiles.findIndex((tile) => tile.type === 'unexplored');
    const inventory = checked.cartographerDraft.inventoryByPlayer[checked.currentPlayerId];
    const tileType = Object.keys(inventory).find((kind) => inventory[kind] > 0);
    assert.ok(tileId >= 0 && tileType);
    nextPlayer.send({ type: 'game_action', action: { kind: 'cartographer_draft_place', tileId, tileType } });
    const afterManual = (await host.waitFor((msg) => msg.type === 'state' && msg.state.phase === 'cartographer-draft' && msg.state.cartographerDraft?.placedCount === 2)).state;
    assert.equal(afterManual.cartographerDraft.turnIndex, 2);
    assert.equal(afterManual.timer.segmentKey, `cartographer-draft:2:${afterManual.currentPlayerId}`);
    assert.ok(afterManual.timer.endsAt - Date.now() > 3500, 'a manual placement must reset the next draft timer');
  });
}
