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
const { materializeReplayFrame } = require('../server/replay');

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
      else child.kill('SIGTERM');
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

  send(message) { this.ws.send(JSON.stringify(message)); }

  waitFor(predicate, timeoutMs = 5_000) {
    const queuedIndex = this.messages.findIndex(predicate);
    if (queuedIndex >= 0) return Promise.resolve(this.messages.splice(queuedIndex, 1)[0]);
    return new Promise((resolve, reject) => {
      const waiter = { predicate, resolve, timer: null };
      waiter.timer = setTimeout(() => {
        const index = this.waiters.indexOf(waiter);
        if (index >= 0) this.waiters.splice(index, 1);
        reject(new Error(`Timed out waiting for WebSocket message. Queued: ${JSON.stringify(this.messages)}`));
      }, timeoutMs);
      this.waiters.push(waiter);
    });
  }

  close() { try { this.ws.terminate(); } catch (_) {} }
}

function assertPortsUseNonAdjacentShorelineEdges(state, expectedPortCount) {
  const geom = state?.geom;
  assert.ok(geom);
  assert.equal(geom.ports.length, expectedPortCount, `${state.previewKey} port count`);

  const usedNodes = new Set();
  for (const port of geom.ports) {
    const edge = geom.edges[port.edgeId];
    assert.ok(edge, `${state.previewKey} port ${port.id} has a valid edge`);
    assert.deepEqual(port.nodeIds, [edge.a, edge.b]);

    for (const nodeId of port.nodeIds) {
      assert.equal(usedNodes.has(nodeId), false, `${state.previewKey} has adjacent ports at node ${nodeId}`);
      usedNodes.add(nodeId);
    }

    const adjacentTileIds = geom.edgeAdjTiles[port.edgeId] || [];
    const adjacentTypes = adjacentTileIds.map((tileId) => geom.tiles[tileId]?.type);
    const isCoastline = adjacentTypes.length === 2
      && adjacentTypes.includes('sea')
      && adjacentTypes.some((type) => type && type !== 'sea');
    const isLandBoundary = adjacentTypes.length === 1 && adjacentTypes[0] !== 'sea';
    assert.ok(isCoastline || isLandBoundary, `${state.previewKey} port ${port.id} is not on the shoreline`);
  }
}

function assertPirateStartsOnVisibleSea(state) {
  const pirateTiles = (state?.geom?.tiles || []).filter((tile) => tile?.pirate);
  assert.equal(pirateTiles.length, 1, `${state.previewKey} starting pirate count`);
  assert.equal(pirateTiles[0].type, 'sea', `${state.previewKey} pirate starts at sea`);
  assert.equal(!!(pirateTiles[0].fog && !pirateTiles[0].revealed), false, `${state.previewKey} pirate does not start in fog`);
  const scenario = String(state?.rules?.seafarersScenario || '').toLowerCase().replace(/-/g, '_');
  const showsOuterBorder = scenario === 'test_builder' || scenario.startsWith('cartographer_');
  if (!showsOuterBorder) {
    assert.equal(state.geom.tileNeighbors[pirateTiles[0].id].length, 6, `${state.previewKey} pirate starts on a rendered tile`);
  }
}

function matchingTileComponents(geom, predicate) {
  const eligible = new Set((geom.tiles || []).filter(predicate).map((tile) => tile.id));
  const components = [];
  const seen = new Set();
  for (const tileId of eligible) {
    if (seen.has(tileId)) continue;
    const component = new Set();
    const stack = [tileId];
    seen.add(tileId);
    while (stack.length) {
      const current = stack.pop();
      component.add(current);
      for (const neighbor of (geom.tileNeighbors[current] || [])) {
        if (!eligible.has(neighbor) || seen.has(neighbor)) continue;
        seen.add(neighbor);
        stack.push(neighbor);
      }
    }
    components.push(component);
  }
  return components;
}

function assertScenarioPortRegionalCoverage(state, { expectedOuterIslands, expectedDesertSections = 0 } = {}) {
  const geom = state.geom;
  const expectedKinds = geom.ports.length === 11
    ? ['brick', 'generic', 'generic', 'generic', 'generic', 'generic', 'generic', 'grain', 'lumber', 'ore', 'wool']
    : ['brick', 'generic', 'generic', 'generic', 'generic', 'grain', 'lumber', 'ore', 'wool'];
  assert.deepEqual(geom.ports.map((port) => port.kind).sort(), expectedKinds, `${state.previewKey} port types`);

  const landComponents = matchingTileComponents(geom, (tile) => tile.type !== 'sea');
  const mainland = landComponents.reduce((largest, component) => (
    !largest || component.size > largest.size ? component : largest
  ), null);
  const outerIslands = landComponents.filter((component) => component !== mainland);
  assert.equal(outerIslands.length, expectedOuterIslands, `${state.previewKey} outer island count`);
  for (const island of outerIslands) {
    const islandPorts = geom.ports.filter((port) => island.has(port.landTileId));
    assert.equal(islandPorts.length, 1, `${state.previewKey} has one port on outer island ${Array.from(island).join(',')}`);
  }

  if (expectedDesertSections) {
    const sections = matchingTileComponents(geom, (tile) => tile.type === 'desert');
    assert.equal(sections.length, expectedDesertSections, `${state.previewKey} desert section count`);
    for (const section of sections) {
      const sectionPorts = geom.ports.filter((port) => section.has(port.landTileId));
      assert.equal(sectionPorts.length, 1, `${state.previewKey} has one port on desert section ${Array.from(section).join(',')}`);
    }
  }
}

test('every map and scenario preview keeps ports valid and completed Seafarers maps start with a pirate', { timeout: 20_000 }, async (t) => {
  const port = await unusedPort();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hex-settlers-ports-'));
  const server = await startServer(port, dataDir);
  const host = await Peer.connect(port);
  t.after(async () => {
    host.close();
    await server.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  const suffix = Date.now().toString(36).slice(-8);
  host.send({ type: 'auth_register', username: `ports_${suffix}`, password: 'port placement', displayName: 'Port Tester' });
  await host.waitFor((message) => message.type === 'auth_ok');
  host.send({ type: 'create_room', displayName: 'Port Tester' });
  await host.waitFor((message) => message.type === 'joined');

  const classic = await host.waitFor((message) => message.type === 'state' && message.state.previewKey === 'classic');
  assertPortsUseNonAdjacentShorelineEdges(classic.state, 9);

  const mapOptions = [
    { mapMode: 'classic56', scenario: 'four_islands', previewKey: 'classic56', ports: 11 },
    { mapMode: 'seafarers', scenario: 'four_islands', previewKey: 'seafarers:four_islands', ports: 9 },
    { mapMode: 'seafarers', scenario: 'through_the_desert', previewKey: 'seafarers:through_the_desert', ports: 9 },
    { mapMode: 'seafarers', scenario: 'fog_island', previewKey: 'seafarers:fog_island', ports: 9 },
    { mapMode: 'seafarers', scenario: 'heading_for_new_shores', previewKey: 'seafarers:heading_for_new_shores', ports: 9 },
    { mapMode: 'seafarers', scenario: 'cartographer_4_manual', previewKey: 'seafarers:cartographer_4_manual', ports: 0 },
    { mapMode: 'seafarers', scenario: 'cartographer_4_random', previewKey: 'seafarers:cartographer_4_random', ports: 11 },
    { mapMode: 'seafarers', scenario: 'six_islands', previewKey: 'seafarers:six_islands', ports: 11 },
    { mapMode: 'seafarers', scenario: 'through_the_desert_56', previewKey: 'seafarers:through_the_desert_56', ports: 11 },
    { mapMode: 'seafarers', scenario: 'fog_island_56', previewKey: 'seafarers:fog_island_56', ports: 11 },
    { mapMode: 'seafarers', scenario: 'cartographer_56_manual', previewKey: 'seafarers:cartographer_56_manual', ports: 0 },
    { mapMode: 'seafarers', scenario: 'cartographer_56_random', previewKey: 'seafarers:cartographer_56_random', ports: 11 },
    { mapMode: 'seafarers', scenario: 'test_builder', previewKey: 'seafarers:test_builder', ports: 0 },
  ];

  for (const option of mapOptions) {
    host.send({
      type: 'set_rules',
      rules: { mapMode: option.mapMode, seafarersScenario: option.scenario },
    });
    const preview = await host.waitFor((message) =>
      message.type === 'state' && String(message.state.previewKey || '').startsWith(option.previewKey));
    assertPortsUseNonAdjacentShorelineEdges(preview.state, option.ports);
    if (option.scenario === 'heading_for_new_shores') {
      assertScenarioPortRegionalCoverage(preview.state, { expectedOuterIslands: 3 });
    } else if (option.scenario === 'through_the_desert') {
      assertScenarioPortRegionalCoverage(preview.state, { expectedOuterIslands: 3, expectedDesertSections: 1 });
    } else if (option.scenario === 'through_the_desert_56') {
      assertScenarioPortRegionalCoverage(preview.state, { expectedOuterIslands: 4, expectedDesertSections: 1 });
    }
    const deferredDraft = option.scenario === 'cartographer_4_manual' || option.scenario === 'cartographer_56_manual';
    if (option.mapMode === 'seafarers' && !deferredDraft) {
      assertPirateStartsOnVisibleSea(preview.state);
    }
  }
});

test('account, lobby, expert tuning, chat, and game-start protocol remains compatible', { timeout: 20_000 }, async (t) => {
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

  host.send({ type: 'set_expert_ai_tuning', tuning: { vpGainWeight: 221 } });
  const tuning = await host.waitFor((message) => message.type === 'expert_ai_tuning_ok');
  assert.equal(tuning.tuning.vpGainWeight, 221);

  const guest = await Peer.connect(port);
  peers.push(guest);
  guest.send({ type: 'auth_register', username: `guest_${suffix}`, password: 'correct horse', displayName: 'Guest' });
  const guestAuth = await guest.waitFor((message) => message.type === 'auth_ok');
  guest.send({ type: 'join_room', code: hostJoined.room.code, name: 'Guest' });
  const guestJoined = await guest.waitFor((message) => message.type === 'joined');
  assert.equal(guestJoined.room.players.length, 2);

  guest.send({ type: 'chat', text: 'hello from integration test' });
  const roomWithChat = await host.waitFor((message) =>
    message.type === 'room' && message.room.chat.some((entry) => entry.text === 'hello from integration test'));
  assert.equal(roomWithChat.room.chat.at(-1).from, 'Guest');

  host.send({ type: 'start_game' });
  const startedState = await host.waitFor((message) => message.type === 'state' && message.state.phase !== 'lobby');
  assert.equal(startedState.state.players.length, 2);
  assert.match(startedState.state.phase, /^setup1-/);
  const guestStateInHostView = startedState.state.players.find((player) => player.name === 'Guest');
  assert.equal(guestStateInHostView.resources, undefined);
  assert.equal(typeof guestStateInHostView.handCount, 'number');
  assert.equal(fs.existsSync(path.join(dataDir, 'users.json')), true);

  guest.send({ type: 'request_leave_game' });
  const leaveRequest = await host.waitFor((message) => message.type === 'leave_game_request');
  assert.equal(leaveRequest.playerId, guestAuth.user.id);
  host.send({ type: 'respond_leave_game', playerId: guestAuth.user.id, accepted: true });
  await guest.waitFor((message) => message.type === 'leave_game_result' && message.accepted === true);

  guest.send({ type: 'set_spectator_view', playerId: hostAuth.user.id });
  const spectatorState = await guest.waitFor((message) =>
    message.type === 'state' && message.state.spectatorViewPlayerId === hostAuth.user.id);
  assert.equal(spectatorState.state.spectatorMode, true);
  assert.ok(spectatorState.state.players.find((player) => player.id === hostAuth.user.id).resources);
  const departedGuest = spectatorState.state.players.find((player) => player.id === guestAuth.user.id);
  assert.equal(departedGuest.departed, true);
  assert.equal(departedGuest.handCount, 0);

  host.send({ type: 'game_action', action: { kind: 'propose_endgame' } });
  const voteState = await host.waitFor((message) => message.type === 'state' && message.state.endVote?.id);
  host.send({ type: 'game_action', action: { kind: 'respond_endgame', voteId: voteState.state.endVote.id, accept: true } });
  await host.waitFor((message) => message.type === 'state' && message.state.phase === 'game-over');

  host.send({ type: 'get_game_history', limit: 10 });
  const history = await host.waitFor((message) => message.type === 'game_history_list');
  const saved = history.games.find((game) => game.roomCode === hostJoined.room.code);
  assert.ok(saved);
  assert.ok(saved.replaySteps >= 3);
  host.send({ type: 'get_game_history_entry', id: saved.id });
  const historyEntry = await host.waitFor((message) => message.type === 'game_history_entry');
  assert.ok(Array.isArray(historyEntry.game.log));
  assert.ok(historyEntry.game.log.some((entry) => /left the game/i.test(entry.text)));
  assert.ok(historyEntry.game.replay?.initial);
  const finalReplayFrame = materializeReplayFrame(
    historyEntry.game.replay,
    historyEntry.game.replay.steps.length - 1,
  );
  assert.equal(finalReplayFrame.phase, 'game-over');
  assert.equal(finalReplayFrame.players.find((player) => player.id === guestAuth.user.id).departed, true);
});

test('accounts, active rooms, expert tuning, and neural model survive a clean restart', { timeout: 20_000 }, async (t) => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hex-settlers-restart-'));
  let server = null;
  const peers = [];
  t.after(async () => {
    for (const peer of peers) peer.close();
    if (server) await server.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  const firstPort = await unusedPort();
  server = await startServer(firstPort, dataDir);
  const suffix = Date.now().toString(36).slice(-8);
  const host = await Peer.connect(firstPort);
  peers.push(host);
  host.send({ type: 'auth_register', username: `restart_${suffix}`, password: 'restart pass', displayName: 'Restart Host' });
  const auth = await host.waitFor((message) => message.type === 'auth_ok');
  host.send({ type: 'create_room', displayName: 'Restart Host' });
  const joined = await host.waitFor((message) => message.type === 'joined');
  host.send({ type: 'set_expert_ai_tuning', tuning: { vpGainWeight: 223 } });
  await host.waitFor((message) => message.type === 'expert_ai_tuning_ok');

  host.close();
  await server.stop();
  server = null;

  const users = JSON.parse(fs.readFileSync(path.join(dataDir, 'users.json'), 'utf8'));
  assert.equal(users.users.length, 1);
  assert.ok(users.users[0].tokens[0].tokenHash);
  assert.equal(users.users[0].tokens[0].token, undefined);

  const rooms = JSON.parse(fs.readFileSync(path.join(dataDir, 'active_rooms.json'), 'utf8'));
  const savedRoom = rooms.rooms.find((room) => room.code === joined.room.code);
  assert.equal(savedRoom.expertAiTuning.vpGainWeight, 223);
  const model = JSON.parse(fs.readFileSync(path.join(dataDir, 'neural_ai_model.json'), 'utf8'));
  assert.ok(model.params && Array.isArray(model.params.w1));

  const secondPort = await unusedPort();
  server = await startServer(secondPort, dataDir);
  const restoredHost = await Peer.connect(secondPort);
  peers.push(restoredHost);
  restoredHost.send({ type: 'auth_token', token: auth.token });
  const restoredAuth = await restoredHost.waitFor((message) => message.type === 'auth_ok');
  assert.equal(restoredAuth.user.displayName, 'Restart Host');
  restoredHost.send({ type: 'rejoin_room', code: joined.room.code, displayName: 'Restart Host' });
  const restoredRoom = await restoredHost.waitFor((message) => message.type === 'joined');
  assert.equal(restoredRoom.room.code, joined.room.code);
  assert.equal(restoredRoom.isHost, true);
});

test('browser authentication uses an HTTP-only cookie for WebSocket sessions', { timeout: 20_000 }, async (t) => {
  const port = await unusedPort();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hex-settlers-cookie-'));
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: `cookie_${suffix}`, password: 'cookie pass', displayName: 'Cookie Host' }),
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.user.displayName, 'Cookie Host');
  assert.equal(body.token, undefined);
  const setCookie = response.headers.get('set-cookie');
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /SameSite=Strict/);

  const peer = await Peer.connect(port, { headers: { Cookie: setCookie.split(';')[0] } });
  peers.push(peer);
  const auth = await peer.waitFor((message) => message.type === 'auth_ok');
  assert.equal(auth.cookieAuth, true);
  assert.equal(auth.token, null);
  peer.send({ type: 'create_room', displayName: 'Cookie Host' });
  const joined = await peer.waitFor((message) => message.type === 'joined');
  assert.equal(joined.isHost, true);

  const page = await fetch(`http://127.0.0.1:${port}/`);
  assert.equal(page.headers.get('x-content-type-options'), 'nosniff');
  assert.match(page.headers.get('content-security-policy'), /default-src 'self'/);
});

test('compiled TypeScript bootstrap serves the current game entry point', { timeout: 15_000 }, async (t) => {
  const port = await unusedPort();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hex-settlers-dist-'));
  const server = await startServer(port, dataDir, 'dist/server.js');
  t.after(async () => {
    await server.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  const response = await fetch(`http://127.0.0.1:${port}/`);
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /Hex Settlers/i);
  assert.match(server.output(), /TS bootstrap starting/);
});
