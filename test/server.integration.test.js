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

async function startServer(port, dataDir, entryPoint = 'server.js', extraEnv = {}) {
  let output = '';
  const child = spawn(process.execPath, ['--require', path.join(__dirname, 'fixtures-turnstile.cjs'), entryPoint], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', DATA_DIR: dataDir, NODE_ENV: 'test', TURNSTILE_SITE_KEY: 'integration-test-site', TURNSTILE_SECRET_KEY: 'integration-test-secret', ...extraEnv },
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
        reject(new Error(`Timed out waiting for WebSocket message. Queued: ${JSON.stringify(this.messages.map(m => ({ type:m.type, error:m.error, switchMode:m.switchMode, code:m.code })))}`));
      }, timeoutMs);
      this.waiters.push(waiter);
    });
  }

  close() { try { this.ws.terminate(); } catch (_) {} }
}

test('ranked queue runs a timed server-owned ballot and locks ranked actions', { timeout: 25_000 }, async (t) => {
  const port = await unusedPort();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hex-settlers-ranked-ballot-'));
  const server = await startServer(port, dataDir, 'server.js', { RANKED_BALLOT_TEST_MS: '3500' });
  const peers = [];
  t.after(async () => {
    for (const peer of peers) peer.close();
    await server.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  const suffix = Date.now().toString(36).slice(-8);
  for (let index = 0; index < 4; index++) {
    const peer = await Peer.connect(port);
    peers.push(peer);
    peer.send({ type: 'auth_register', username: `ranked_${suffix}_${index}`, password: 'ranked ballot test', displayName: `Ranked ${index + 1}` });
    await peer.waitFor((message) => message.type === 'auth_ok');
    peer.send({ type: 'ranked_queue_join', mapMode: 'classic', playerCount: 6 });
  }

  const joined = [];
  for (const peer of peers) {
    await peer.waitFor((message) => message.type === 'ranked_match_found');
    joined.push(await peer.waitFor((message) => message.type === 'joined'));
  }
  const ballot = joined[0].room.rankedScenarioVote;
  assert.equal(joined.every((message) => message.isHost === false && message.room.hostId === null), true);
  assert.equal(joined.every((message) => message.room.ranked === true), true);
  assert.equal(joined[0].room.players.length, 4);
  assert.equal(ballot.options.length, 3);
  assert.equal(joined[0].room.rules, null, 'No Classic rules before scenario vote');

  peers[0].send({ type: 'kick_player', playerId: joined[1].playerId });
  const adminError = await peers[0].waitFor((message) => message.type === 'error');
  assert.match(adminError.error, /server-controlled/i);
  peers[0].send({ type: 'start_game' });
  assert.match((await peers[0].waitFor((message) => message.type === 'error')).error, /server-controlled/i);
  peers[0].send({ type: 'set_spectator_mode', enabled: true });
  assert.match((await peers[0].waitFor((message) => message.type === 'error')).error, /server-controlled/i);

  assert.equal(ballot.endsAt - ballot.createdAt, 3500);
  assert.ok(ballot.options.every(option => Array.isArray(option.preview) && option.preview.length > 15));

  // Public ranked lobby URL is spectator-only: the roster is never extended.
  const spectator = await Peer.connect(port);
  peers.push(spectator);
  spectator.send({ type: 'auth_register', username: `spec_${suffix}`, password: 'spectator test', displayName: 'Spectator' });
  await spectator.waitFor(message => message.type === 'auth_ok');
  spectator.send({ type: 'join_room', code: joined[0].room.code, spectator: true });
  const spectatorJoined = await spectator.waitFor(message => message.type === 'joined');
  assert.equal(spectatorJoined.role, 'spectator');
  assert.equal(spectatorJoined.room.players.length, 4);
  spectator.send({ type: 'ranked_scenario_vote', scenarioId: ballot.options[0].id });
  assert.match((await spectator.waitFor(message => message.type === 'error')).error, /matched players/i);

  const firstId = ballot.options[0].id;
  const secondId = ballot.options[1].id;
  // Two abstentions must not prevent the game from starting at the deadline.
  // Voters can change selections freely throughout the ballot.
  peers[0].send({ type: 'ranked_scenario_vote', scenarioId: secondId });
  await peers[0].waitFor(message => message.type === 'room' && message.room.rankedScenarioVote?.votes[joined[0].playerId] === secondId);
  peers[0].send({ type: 'ranked_scenario_vote', scenarioId: firstId });
  peers[1].send({ type: 'ranked_scenario_vote', scenarioId: firstId });
  const revised = await peers[0].waitFor(message => message.type === 'room' &&
    message.room.rankedScenarioVote?.votes[joined[0].playerId] === firstId &&
    message.room.rankedScenarioVote?.votes[joined[1].playerId] === firstId);
  assert.equal(revised.room.gamePhase, 'lobby', 'two votes must not start the match early');
  assert.equal(revised.room.rankedScenarioVote.votes[joined[2].playerId], undefined);

  const started = [];
  for (const peer of peers.slice(0, 4)) started.push((await peer.waitFor((message) => message.type === 'state' && message.state.phase !== 'lobby', 10_000)).state);
  assert.equal(started[0].rules.mapMode === 'classic' ? 'classic' : started[0].rules.seafarersScenario, firstId);
  assert.equal(started[0].hostId, null, 'ranked game state must not expose a player-host');
  assert.equal(started[0].rules.diceAlgorithm, 'probability_corrected');
  assert.equal(started[0].rules.friendlyRobber, false);
  assert.equal(started[0].rules.setupTurnMs, 60_000);
  assert.equal(started[0].rules.playTurnMs, 30_000);
  peers[0].send({ type: 'pause_game', paused: true });
  assert.match((await peers[0].waitFor((message) => message.type === 'error')).error, /server-controlled/i);
  peers[0].send({ type: 'game_action', action: { kind: 'propose_turn_undo' } });
  assert.match((await peers[0].waitFor((message) => message.type === 'error')).error, /Back and End Game/i);
  peers[1].send({ type: 'game_action', action: { kind: 'propose_endgame' } });
  assert.match((await peers[1].waitFor((message) => message.type === 'error')).error, /Back and End Game/i);

  spectator.send({ type: 'leave_room' });
  assert.equal((await spectator.waitFor(message => message.type === 'left_room')).rankedMenu, true);

});

test('unranked End Game with AI opponents waits five seconds and allows the proposer to withdraw', { timeout: 20_000 }, async (t) => {
  const port = await unusedPort();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hex-settlers-ai-end-vote-'));
  const server = await startServer(port, dataDir);
  const peer = await Peer.connect(port);
  t.after(async () => {
    peer.close();
    await server.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  peer.send({ type: 'auth_register', username: `ae_${Date.now().toString(36)}`, password: 'end vote AI test', displayName: 'Human' });
  const auth = await peer.waitFor(message => message.type === 'auth_ok');
  peer.send({ type: 'create_room' });
  await peer.waitFor(message => message.type === 'joined');
  peer.send({ type: 'fill_ai', targetCount: 2 });
  const initialAiRoom = await peer.waitFor(message => message.type === 'room' && message.room.players.length === 2);
  assert.equal(initialAiRoom.room.players.find(player => player.isAI)?.aiDifficulty, 'easy');

  peer.send({ type: 'set_ai_difficulty', difficulty: 'expert' });
  const changedAiRoom = await peer.waitFor(message => message.type === 'room' && message.room.aiDifficulty === 'neural_net');
  assert.ok(changedAiRoom.room.players.filter(player => player.isAI).every(player => player.aiDifficulty === 'neural_net'));

  peer.send({ type: 'fill_ai', targetCount: 4 });
  const futureAiRoom = await peer.waitFor(message => message.type === 'room' && message.room.players.length === 4);
  assert.ok(futureAiRoom.room.players.filter(player => player.isAI).every(player => player.aiDifficulty === 'neural_net'));
  peer.send({ type: 'set_ready', ready: true });
  await peer.waitFor(message => message.type === 'room' && message.room.players.find(p => p.id === auth.user.id)?.ready === true);
  peer.send({ type: 'start_game' });
  await peer.waitFor(message => message.type === 'state' && message.state.phase !== 'lobby');

  peer.send({ type: 'game_action', action: { kind: 'propose_endgame' } });
  const allApproved = await peer.waitFor(message => message.type === 'state' &&
    Number(message.state.endVote?.finalizeAt) > 0 &&
    Object.values(message.state.endVote?.responses || {}).length === 4, 8000);
  const vote = allApproved.state.endVote;
  assert.equal(Object.values(vote.responses).filter(response => response === 'accept').length, 4);
  const deadline = vote.finalizeAt;
  assert.ok(deadline > Date.now());

  peer.send({ type: 'game_action', action: { kind: 'respond_endgame', voteId: vote.id, withdraw: true } });
  const withdrawn = await peer.waitFor(message => message.type === 'state' &&
    message.state.endVote?.id === vote.id && message.state.endVote?.finalizeAt == null &&
    message.state.endVote?.responses?.[auth.user.id] === null);
  assert.equal(withdrawn.state.endVote.responses[auth.user.id], null);
  peer.send({ type: 'game_action', action: { kind: 'respond_endgame', voteId: vote.id, accept: true } });
  const restarted = await peer.waitFor(message => message.type === 'state' && Number(message.state.endVote?.finalizeAt) > deadline);
  assert.equal(restarted.state.endVote.responses[auth.user.id], 'accept');
  await peer.waitFor(message => message.type === 'state' && message.state.phase === 'game-over', 8500);
});

test('six-player trades reach hosts and non-hosts promptly with private hands preserved', { timeout: 30_000 }, async (t) => {
  const port = await unusedPort();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hex-settlers-trade-sync-'));
  let server = await startServer(port, dataDir);
  const peers = [];
  const accounts = [];
  t.after(async () => {
    for (const peer of peers) peer.close();
    await server.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });
  let code;
  for (let i = 0; i < 6; i++) {
    const peer = await Peer.connect(port);
    peers.push(peer);
    peer.send({ type: 'auth_register', username: `trade_player_${i}`, password: 'trade synchronization test', displayName: `Player ${i + 1}` });
    accounts.push(await peer.waitFor(message => message.type === 'auth_ok'));
    peer.send(i === 0 ? { type: 'create_room' } : { type: 'join_room', code });
    const joined = await peer.waitFor(message => message.type === 'joined');
    code = joined.room.code;
    if (i === 0) {
      peer.send({ type: 'set_rules', rules: { mapMode: 'classic56' } });
      await peer.waitFor(message => message.type === 'room' && message.room.rules.mapMode === 'classic56');
    }
    peer.send({ type: 'set_ready', ready: true });
  }
  await peers[0].waitFor(message => message.type === 'room' && message.room.players.length === 6 && message.room.players.every(player => player.ready));
  peers[0].send({ type: 'start_game' });
  await peers[0].waitFor(message => message.type === 'state' && message.state.phase !== 'lobby');

  // Restore a deterministic midgame fixture using the actual persistence path.
  // There are no debug hooks or artificial resource grants in the live server.
  await server.stop();
  for (const peer of peers) peer.close();
  peers.length = 0;
  const savePath = path.join(dataDir, 'active_rooms.json');
  const saved = JSON.parse(fs.readFileSync(savePath, 'utf8'));
  const game = saved.rooms.find(record => record.code === code).game;
  const proposerId = accounts[1].user.id; // A non-host is the active trader.
  game.phase = 'main-actions';
  game.currentPlayerId = proposerId;
  game.turnNumber = 3;
  game.paired = null;
  game.timer = null;
  game.lastRoll = [3, 3];
  for (const player of game.players) player.resources = { brick: 2, lumber: 2, wool: 2, grain: 2, ore: 2 };
  for (const kind of Object.keys(game.bank)) game.bank[kind] = 12;
  fs.writeFileSync(savePath, JSON.stringify(saved));
  server = await startServer(port, dataDir);
  for (const account of accounts) {
    const peer = await Peer.connect(port);
    peers.push(peer);
    peer.send({ type: 'auth_token', token: account.token });
    await peer.waitFor(message => message.type === 'auth_ok');
    peer.send({ type: 'rejoin_room', code });
    await peer.waitFor(message => message.type === 'joined');
    await peer.waitFor(message => message.type === 'state' && message.state.phase === 'main-actions');
  }

  const deliveryTimes = peers.map(() => []);
  async function actionFrom(index, action, predicate) {
    for (const peer of peers) peer.messages = peer.messages.filter(message => message.type !== 'state');
    const started = performance.now();
    const deliveries = peers.map(async (peer, peerIndex) => {
      const message = await peer.waitFor(message => message.type === 'state' && predicate(message.state), 2_000);
      deliveryTimes[peerIndex].push(performance.now() - started);
      assert.equal(message.state.replay, undefined);
      assert.equal(message.state.devDeck, undefined);
      for (const player of message.state.players) {
        assert.equal(!!player.resources, player.id === accounts[peerIndex].user.id);
      }
      return message.state;
    });
    peers[index].send({ type: 'game_action', action });
    return Promise.all(deliveries);
  }

  let states = await actionFrom(1, { kind: 'propose_trade', offer: { brick: 1 }, request: { ore: 1 } }, state => !!state.pendingTrade);
  let tradeId = states[0].pendingTrade.id;
  for (let round = 0; round < 4; round++) {
    for (const index of [0, 2, 3, 4, 5]) {
      const accept = round % 2 === 0;
      const playerId = accounts[index].user.id;
      await actionFrom(index, { kind: 'respond_trade', tradeId, accept }, state => state.pendingTrade?.responses[playerId] === (accept ? 'accept' : 'reject'));
    }
  }
  states = await actionFrom(1, { kind: 'propose_trade', replaceTradeId: tradeId, offer: { lumber: 1 }, request: { grain: 1 } }, state => state.pendingTrade?.id > tradeId);
  tradeId = states[0].pendingTrade.id;
  assert.ok(Object.values(states[0].pendingTrade.responses).every(response => response === null));
  const responderId = accounts[5].user.id;
  await actionFrom(5, { kind: 'respond_trade', tradeId, accept: true }, state => state.pendingTrade?.responses[responderId] === 'accept');
  states = await actionFrom(1, { kind: 'finalize_trade', tradeId, withPlayerId: responderId }, state => state.pendingTrade === null);
  assert.equal(states[1].players.find(player => player.id === proposerId).resources.lumber, 1);
  assert.equal(states[5].players.find(player => player.id === responderId).resources.lumber, 3);
  t.diagnostic(`Local action-to-state maximum by player (host first): ${deliveryTimes.map(times => `${Math.max(...times).toFixed(1)} ms`).join(', ')}`);
});

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
  const showsOuterBorder = scenario === 'test_builder' || scenario === 'test_builder_56' || scenario.startsWith('cartographer_');
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

function assertScenarioPortRegionalCoverage(state, { expectedOuterIslands, acrossDesertRegions = [] } = {}) {
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

  assert.equal(
    geom.ports.some((port) => geom.tiles[port.landTileId]?.type === 'desert'),
    false,
    `${state.previewKey} has no port attached to a desert tile`,
  );
  for (const regionKeys of acrossDesertRegions) {
    const regionTileIds = new Set((geom.tiles || [])
      .filter((tile) => regionKeys.has(`${tile.q},${tile.r}`))
      .map((tile) => tile.id));
    assert.ok(regionTileIds.size, `${state.previewKey} across-desert region exists`);
    const regionPorts = geom.ports.filter((port) => regionTileIds.has(port.landTileId));
    assert.equal(regionPorts.length, 1, `${state.previewKey} has one port on across-desert land ${Array.from(regionKeys).join(',')}`);
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
    { mapMode: 'seafarers', scenario: 'test_builder_56', previewKey: 'seafarers:test_builder_56', ports: 0 },
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
      assertScenarioPortRegionalCoverage(preview.state, {
        expectedOuterIslands: 3,
        acrossDesertRegions: [new Set(['0,-3', '-1,-2', '-2,-1'])],
      });
    } else if (option.scenario === 'through_the_desert_56') {
      assertScenarioPortRegionalCoverage(preview.state, {
        expectedOuterIslands: 4,
        acrossDesertRegions: [
          new Set(['0,-3', '1,-3', '2,-3', '-1,-2', '0,-2']),
          new Set(['4,-3', '5,-3', '6,-3', '7,-3']),
        ],
      });
    }
    const deferredDraft = option.scenario === 'cartographer_4_manual' || option.scenario === 'cartographer_56_manual';
    if (option.mapMode === 'seafarers' && !deferredDraft) {
      assertPirateStartsOnVisibleSea(preview.state);
    }
  }
});

test('Test Builder supports custom port painting on both Seafarers board sizes', { timeout: 20_000 }, async (t) => {
  const port = await unusedPort();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hex-settlers-builder-'));
  const server = await startServer(port, dataDir);
  const host = await Peer.connect(port);
  t.after(async () => {
    host.close();
    await server.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  const suffix = Date.now().toString(36).slice(-8);
  host.send({ type: 'auth_register', username: `builder_${suffix}`, password: 'builder ports', displayName: 'Builder' });
  await host.waitFor((message) => message.type === 'auth_ok');
  host.send({ type: 'create_room', displayName: 'Builder' });
  const joinedBuilderRoom = await host.waitFor((message) => message.type === 'joined');
  assert.equal(joinedBuilderRoom.room.rules.diceAlgorithm, 'probability_corrected');

  async function selectBuilderScenario(scenario) {
    host.send({ type: 'set_rules', rules: { mapMode: 'seafarers', seafarersScenario: scenario } });
    return (await host.waitFor((message) => message.type === 'state' && message.state.previewKey === `seafarers:${scenario}`)).state;
  }

  const fogFourPlayer = await selectBuilderScenario('fog_island');
  assert.equal(fogFourPlayer.rules.explorationPointsEnabled, false);
  const fogFiveSixPlayer = await selectBuilderScenario('fog_island_56');
  assert.equal(fogFiveSixPlayer.rules.explorationPointsEnabled, false);

  function firstShorelineEdge(state) {
    return state.geom.edges.find((edge) => {
      const types = (state.geom.edgeAdjTiles[edge.id] || []).map((tileId) => state.geom.tiles[tileId]?.type);
      return types.length === 2 && types.includes('sea') && types.some((type) => type !== 'sea');
    });
  }

  const fourPlayer = await selectBuilderScenario('test_builder');
  assert.equal(fourPlayer.rules.explorationPointsEnabled, true);
  const fourPlayerTileCount = fourPlayer.geom.tiles.length;
  const fourPlayerEdge = firstShorelineEdge(fourPlayer);
  assert.ok(fourPlayerEdge);

  host.send({ type: 'edit_preview_port', edgeId: fourPlayerEdge.id, portKind: 'generic' });
  const genericPortState = (await host.waitFor((message) => message.type === 'state'
    && message.state.previewKey === 'seafarers:test_builder'
    && message.state.geom.ports?.[0]?.kind === 'generic')).state;
  assertPortsUseNonAdjacentShorelineEdges(genericPortState, 1);

  host.send({ type: 'edit_preview_port', edgeId: fourPlayerEdge.id, portKind: 'ore' });
  const orePortState = (await host.waitFor((message) => message.type === 'state'
    && message.state.previewKey === 'seafarers:test_builder'
    && message.state.geom.ports?.[0]?.kind === 'ore')).state;
  assert.equal(orePortState.geom.ports[0].kind, 'ore');

  host.send({ type: 'edit_preview_port', edgeId: fourPlayerEdge.id, portKind: 'remove' });
  await host.waitFor((message) => message.type === 'state'
    && message.state.previewKey === 'seafarers:test_builder'
    && message.state.geom.ports.length === 0);

  host.send({ type: 'set_rules', rules: { mapMode: 'seafarers', seafarersScenario: 'test_builder_56', explorationPointsEnabled: false } });
  const fiveSixPlayer = (await host.waitFor((message) => message.type === 'state'
    && message.state.previewKey === 'seafarers:test_builder_56'
    && message.state.rules.explorationPointsEnabled === false)).state;
  assert.ok(fiveSixPlayer.geom.tiles.length > fourPlayerTileCount, '5–6 Test Builder uses the larger frame');
  const fiveSixEdge = firstShorelineEdge(fiveSixPlayer);
  assert.ok(fiveSixEdge);

  host.send({ type: 'edit_preview_port', edgeId: fiveSixEdge.id, portKind: 'grain' });
  const grainPortState = (await host.waitFor((message) => message.type === 'state'
    && message.state.previewKey === 'seafarers:test_builder_56'
    && message.state.geom.ports?.[0]?.kind === 'grain')).state;
  assertPortsUseNonAdjacentShorelineEdges(grainPortState, 1);

  host.send({ type: 'fill_ai', targetCount: 5 });
  await host.waitFor((message) => message.type === 'room' && message.room.players.length === 5);
  host.send({ type: 'set_ready', ready: true });
  await host.waitFor((message) => message.type === 'room' && message.room.players.every((player) => player.ready === true));
  host.send({ type: 'start_game' });
  const started = (await host.waitFor((message) => message.type === 'state' && message.state.phase !== 'lobby')).state;
  assert.equal(started.rules.seafarersScenario, 'test_builder_56');
  assert.equal(started.rules.explorationPointsEnabled, false);
  assert.equal(started.players.length, 5);
  assert.equal(started.geom.tiles.length, fiveSixPlayer.geom.tiles.length);
  assert.equal(started.geom.ports.length, 1);
  assert.equal(started.geom.ports[0].kind, 'grain');
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
  assert.match(hostJoined.room.code, /^[A-Z2-9]{8}$/);
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

  const spectator = await Peer.connect(port);
  peers.push(spectator);
  spectator.send({ type: 'auth_register', username: `spectator_${suffix}`, password: 'correct horse', displayName: 'Spectator' });
  await spectator.waitFor((message) => message.type === 'auth_ok');
  spectator.send({ type: 'join_room', code: hostJoined.room.code, name: 'Spectator', spectator: true });
  const spectatorJoined = await spectator.waitFor((message) => message.type === 'joined');
  assert.equal(spectatorJoined.role, 'spectator');
  assert.equal(spectatorJoined.room.players.length, 2);
  assert.equal(spectatorJoined.room.spectators.length, 1);

  guest.send({ type: 'chat', text: 'hello from integration test' });
  const roomWithChat = await host.waitFor((message) =>
    message.type === 'room' && message.room.chat.some((entry) => entry.text === 'hello from integration test'));
  assert.equal(roomWithChat.room.chat.at(-1).from, 'Guest');

  host.send({ type: 'start_game' });
  const notReadyError = await host.waitFor((message) => message.type === 'error' && /must be ready/i.test(message.error));
  assert.match(notReadyError.error, /Host, Guest|Guest, Host/);

  host.send({ type: 'set_ready', ready: true });
  guest.send({ type: 'set_ready', ready: true });
  await host.waitFor((message) => message.type === 'room' && message.room.players.every((player) => player.ready === true));
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
  assert.equal(spectatorState.state.players.find((player) => player.id === hostAuth.user.id).resources, undefined,
    'Spectators must not receive another player’s private resource hand.');
  assert.equal(spectatorState.state.players.find((player) => player.id === hostAuth.user.id).devCards, undefined,
    'Spectators must not receive another player’s private development cards.');
  const departedGuest = spectatorState.state.players.find((player) => player.id === guestAuth.user.id);
  assert.equal(departedGuest.departed, true);
  assert.equal(departedGuest.handCount, 0);

  host.send({ type: 'game_action', action: { kind: 'propose_endgame' } });
  const voteState = await host.waitFor((message) => message.type === 'state' && message.state.endVote?.id);
  const voteId = voteState.state.endVote.id;
  const firstDeadline = voteState.state.endVote.finalizeAt;
  assert.ok(firstDeadline - voteState.state.endVote.createdAt >= 5000, 'unanimous vote starts a full five-second grace period');
  assert.equal(voteState.state.phase !== 'game-over', true);
  // Even the original proposer must be able to withdraw an accepted ballot.
  host.send({ type: 'game_action', action: { kind: 'respond_endgame', voteId, withdraw: true } });
  const withdrawn = await host.waitFor((message) => message.type === 'state' && message.state.endVote?.id === voteId && message.state.endVote.finalizeAt == null);
  assert.equal(withdrawn.state.endVote.responses[hostAuth.user.id], null);
  host.send({ type: 'game_action', action: { kind: 'respond_endgame', voteId, accept: true } });
  const reapproved = await host.waitFor((message) => message.type === 'state' && Number(message.state.endVote?.finalizeAt) > firstDeadline);
  assert.ok(reapproved.state.endVote.finalizeAt > Date.now());
  await host.waitFor((message) => message.type === 'state' && message.state.phase === 'game-over', 8500);

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

  await new Promise((resolve) => setTimeout(resolve, 100));
  const persistedHistory = JSON.parse(fs.readFileSync(path.join(dataDir, 'game_history.json'), 'utf8'));
  const compactEntry = persistedHistory.games.find((game) => game.id === saved.id);
  assert.equal(typeof compactEntry.logJson, 'string');
  assert.equal(typeof compactEntry.replayJson, 'string');
  assert.equal(compactEntry.log, undefined);
  assert.equal(compactEntry.replay, undefined);
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
    body: JSON.stringify({ captchaToken: 'register@127.0.0.1', username: `cookie_${suffix}`, password: 'cookie passphrase', displayName: 'Cookie Host' }),
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

test('players can upload, download, and select shared texture packs without giant WebSocket payloads', { timeout: 25_000 }, async (t) => {
  const port = await unusedPort();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hex-settlers-textures-'));
  const server = await startServer(port, dataDir);
  const peers = [];
  t.after(async () => {
    for (const peer of peers) peer.close();
    await server.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  const origin = `http://127.0.0.1:${port}`;
  const suffix = Date.now().toString(36).slice(-8);
  async function register(username, displayName) {
    const response = await fetch(`${origin}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: origin },
      body: JSON.stringify({ captchaToken: 'register@127.0.0.1', username, password: 'texture sharing pass', displayName }),
    });
    assert.equal(response.status, 200);
    return String(response.headers.get('set-cookie') || '').split(';')[0];
  }
  async function request(route, method, cookie, body, contentType = 'application/json') {
    const response = await fetch(`${origin}${route}`, {
      method,
      headers: { Cookie: cookie, Origin: origin, ...(contentType ? { 'Content-Type': contentType } : {}) },
      body,
    });
    let payload = null;
    if (String(response.headers.get('content-type') || '').includes('application/json')) payload = await response.json();
    return { response, payload };
  }

  const hostCookie = await register(`texture_host_${suffix}`, 'Texture Host');
  const guestCookie = await register(`texture_guest_${suffix}`, 'Texture Guest');
  const host = await Peer.connect(port, { headers: { Cookie: hostCookie } });
  const guest = await Peer.connect(port, { headers: { Cookie: guestCookie } });
  peers.push(host, guest);
  await host.waitFor((message) => message.type === 'auth_ok');
  await guest.waitFor((message) => message.type === 'auth_ok');

  host.send({ type: 'create_room', displayName: 'Texture Host' });
  const joined = await host.waitFor((message) => message.type === 'joined');
  guest.send({ type: 'join_room', code: joined.room.code, displayName: 'Texture Guest' });
  const guestJoined = await guest.waitFor((message) => message.type === 'joined');
  const hostId = joined.playerId;
  const guestId = guestJoined.playerId;

  const packId = `tp-shared-${suffix}`;
  const base = `/api/texture-packs/${joined.room.code}/${packId}`;
  const assetRel = 'Dev Cards/Invention.png';
  const assetRoute = 'Dev%20Cards/Invention.png';
  const png = fs.readFileSync(path.join(PROJECT_ROOT, 'public', 'texture pack', ...assetRel.split('/')));
  const begun = await request(base, 'PUT', hostCookie, JSON.stringify({ name: 'Shared Test Pack' }));
  assert.equal(begun.response.status, 200);
  assert.equal(begun.payload.alreadyAvailable, false);
  const uploaded = await request(`${base}/assets/${assetRoute}`, 'PUT', hostCookie, png, 'image/png');
  assert.equal(uploaded.response.status, 200);

  const sharedRoomUpdate = guest.waitFor((message) => message.type === 'room'
    && message.room.players.some((player) => player.id === hostId && player.texturePackId === packId));
  const completed = await request(`${base}/complete`, 'POST', hostCookie, undefined, '');
  assert.equal(completed.response.status, 200);
  await sharedRoomUpdate;

  const manifest = await request(base, 'GET', guestCookie, undefined, '');
  assert.equal(manifest.response.status, 200);
  assert.deepEqual(manifest.payload.pack.assets, [assetRel]);
  const downloaded = await request(`${base}/assets/${assetRoute}`, 'GET', guestCookie, undefined, '');
  assert.equal(downloaded.response.status, 200);
  assert.deepEqual(Buffer.from(await downloaded.response.arrayBuffer()), png);

  await new Promise((resolve) => setTimeout(resolve, 550));
  const activeRooms = JSON.parse(fs.readFileSync(path.join(dataDir, 'active_rooms.json'), 'utf8'));
  const persistedRoom = activeRooms.rooms.find((room) => room.code === joined.room.code);
  const persistedPack = persistedRoom.sharedTexturePacks[packId];
  assert.equal(Array.isArray(persistedPack.assets), true);
  assert.deepEqual(persistedPack.assets, [assetRel]);
  assert.doesNotMatch(JSON.stringify(persistedPack), /data:image\/png;base64/i);
  assert.equal(fs.existsSync(path.join(dataDir, 'texture-packs', persistedPack.storageKey, ...assetRel.split('/'))), true);

  guest.send({ type: 'get_texture_pack', packId });
  const websocketManifest = await guest.waitFor((message) => message.type === 'texture_pack_manifest' && message.pack.id === packId);
  assert.deepEqual(websocketManifest.pack.assets, [assetRel]);
  assert.equal(websocketManifest.pack.assets[assetRel], undefined);

  const guestSelection = host.waitFor((message) => message.type === 'room'
    && message.room.players.some((player) => player.id === guestId && player.texturePackId === packId));
  guest.send({ type: 'set_texture_pack', texturePackId: packId, texturePackName: 'Shared Test Pack' });
  await guestSelection;

  const simplifiedSelection = host.waitFor((message) => message.type === 'room'
    && message.room.players.some((player) => player.id === guestId && player.texturePackId === 'simplified'));
  guest.send({ type: 'set_texture_pack', texturePackId: 'simplified', texturePackName: 'Wrong Name' });
  const simplifiedRoom = await simplifiedSelection;
  assert.equal(simplifiedRoom.room.players.find((player) => player.id === guestId).texturePackName, 'Simplified');
  const simplifiedManifest = await request(`/api/texture-packs/${joined.room.code}/simplified`, 'GET', guestCookie, undefined, '');
  assert.equal(simplifiedManifest.response.status, 200);
  assert.equal(simplifiedManifest.payload.pack.builtin, true);
  assert.equal(simplifiedManifest.payload.pack.assets.length, 43);
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

test('heartbeat replies and a replacement socket recovers an authenticated lobby without a reconnect war', { timeout: 20_000 }, async (t) => {
  const port = await unusedPort();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hex-settlers-recovery-'));
  const server = await startServer(port, dataDir);
  const peers = [];
  t.after(async () => {
    for (const peer of peers) peer.close();
    await server.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  const host = await Peer.connect(port);
  peers.push(host);
  const pingStamp = Date.now();
  host.send({ type: 'client_ping', clientTime: pingStamp });
  const pong = await host.waitFor((message) => message.type === 'server_pong');
  assert.equal(pong.clientTime, pingStamp);
  assert.equal(typeof pong.serverTime, 'number');

  const suffix = Date.now().toString(36).slice(-8);
  host.send({
    type: 'auth_register',
    username: `recovery_${suffix}`,
    password: 'recovery pass',
    displayName: 'Recovery Host',
  });
  const auth = await host.waitFor((message) => message.type === 'auth_ok');
  host.send({ type: 'create_room', displayName: 'Recovery Host' });
  const joined = await host.waitFor((message) => message.type === 'joined');

  // Creation is acknowledged only after the room snapshot reaches disk.
  const persisted = JSON.parse(fs.readFileSync(path.join(dataDir, 'active_rooms.json'), 'utf8'));
  assert.ok(persisted.rooms.some((record) => record.code === joined.room.code));

  const replacement = await Peer.connect(port);
  peers.push(replacement);
  replacement.send({ type: 'auth_token', token: auth.token });
  await replacement.waitFor((message) => message.type === 'auth_ok');

  // Merely authenticating a second tab must not evict the first tab.
  await new Promise((resolve) => setTimeout(resolve, 150));
  assert.equal(host.ws.readyState, WebSocket.OPEN);

  const hostClosed = once(host.ws, 'close');
  replacement.send({ type: 'get_state', roomCode: joined.room.code });
  const recovered = await replacement.waitFor((message) => message.type === 'joined' && message.recovered === true);
  assert.equal(recovered.room.code, joined.room.code);
  assert.equal(recovered.playerId, auth.user.id);
  await replacement.waitFor((message) => message.type === 'state');

  const displaced = await host.waitFor((message) => message.type === 'error' && message.reconnectBlocked === true);
  assert.match(displaced.error, /another browser or tab/i);
  const [closeCode] = await hostClosed;
  assert.equal(closeCode, 4001);

  // The replacement transport remains stable and can continue changing lobby state.
  replacement.send({
    type: 'set_rules',
    roomCode: joined.room.code,
    rules: { victoryPointsToWin: 12 },
  });
  const updated = await replacement.waitFor((message) =>
    message.type === 'room' && message.room.rules.victoryPointsToWin === 12);
  assert.equal(updated.room.code, joined.room.code);
});

test('built-in Benleethom administrator can list users and securely reset another user password', { timeout: 20_000 }, async (t) => {
  const port = await unusedPort();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hex-settlers-admin-'));
  const adminPassword = 'Admin horse battery 42';
  const server = await startServer(port, dataDir, 'server.js', {
    HEX_BUILTIN_ADMIN_ENABLED: 'true',
    HEX_ADMIN_PASSWORD: adminPassword,
  });
  t.after(async () => {
    await server.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  async function post(route, body, cookie = '') {
    const headers = { 'Content-Type': 'application/json' };
    if (cookie) headers.Cookie = cookie;
    const response = await fetch(`http://127.0.0.1:${port}${route}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ captchaToken: 'register@127.0.0.1', ...body }),
    });
    let payload = {};
    try { payload = await response.json(); } catch (_) {}
    return { response, payload, cookie: String(response.headers.get('set-cookie') || '').split(';')[0] };
  }

  const adminLogin = await post('/api/auth/login', {
    username: 'Benleethom',
    password: adminPassword,
    displayName: 'Someone Else',
  });
  assert.equal(adminLogin.response.status, 200);
  assert.equal(adminLogin.payload.user.username, 'Benleethom');
  assert.equal(adminLogin.payload.user.displayName, 'Ben');
  assert.equal(adminLogin.payload.user.isAdmin, true);
  assert.match(adminLogin.cookie, /hexsettlers_session=/);

  const suffix = Date.now().toString(36).slice(-8);
  const ordinaryPassword = 'ordinary password';
  const ordinaryNewPassword = 'new ordinary password';
  const ordinary = await post('/api/auth/register', {
    username: `managed_${suffix}`,
    password: ordinaryPassword,
    displayName: 'Managed Player',
  });
  assert.equal(ordinary.response.status, 200);
  assert.equal(ordinary.payload.user.isAdmin, false);
  const ordinaryId = ordinary.payload.user.id;

  const reserved = await post('/api/auth/register', {
    username: 'BENLEETHOM',
    password: 'not allowed as administrator',
    displayName: 'Impostor',
  });
  assert.equal(reserved.response.status, 400);
  assert.match(reserved.payload.error, /reserved/i);

  const denied = await post('/api/admin/users', {}, ordinary.cookie);
  assert.equal(denied.response.status, 403);
  assert.match(denied.payload.error, /administrator/i);

  const list = await post('/api/admin/users', {}, adminLogin.cookie);
  assert.equal(list.response.status, 200);
  const managedEntry = list.payload.users.find((user) => user.id === ordinaryId);
  assert.ok(managedEntry);
  assert.equal(managedEntry.username, `managed_${suffix}`);
  assert.equal(managedEntry.pass, undefined);
  assert.equal(managedEntry.tokens, undefined);
  assert.ok(list.payload.users.some((user) => user.username === 'Benleethom' && user.isAdmin === true));

  const sessionBefore = await post('/api/auth/session', {}, ordinary.cookie);
  assert.equal(sessionBefore.response.status, 200);

  const reset = await post('/api/admin/reset-password', {
    userId: ordinaryId,
    newPassword: ordinaryNewPassword,
  }, adminLogin.cookie);
  assert.equal(reset.response.status, 200);
  assert.match(reset.payload.message, /sessions were signed out/i);
  assert.equal(reset.payload.user.passwordResetAt > 0, true);

  const sessionAfter = await post('/api/auth/session', {}, ordinary.cookie);
  assert.equal(sessionAfter.response.status, 401);

  const oldLogin = await post('/api/auth/login', {
    username: `managed_${suffix}`,
    password: ordinaryPassword,
  });
  assert.equal(oldLogin.response.status, 401);

  const newLogin = await post('/api/auth/login', {
    username: `managed_${suffix}`,
    password: ordinaryNewPassword,
  });
  assert.equal(newLogin.response.status, 200);
  assert.equal(newLogin.payload.user.displayName, 'Managed Player');

  const protectAdmin = await post('/api/admin/delete-user', { userId: adminLogin.payload.user.id }, adminLogin.cookie);
  assert.equal(protectAdmin.response.status, 400);
  assert.match(protectAdmin.payload.error, /administrator accounts cannot be deleted/i);

  const deleted = await post('/api/admin/delete-user', { userId: ordinaryId }, adminLogin.cookie);
  assert.equal(deleted.response.status, 200);
  assert.equal(deleted.payload.deletedUserId, ordinaryId);
  assert.match(deleted.payload.message, /historical game records were retained/i);

  const deletedSession = await post('/api/auth/session', {}, newLogin.cookie);
  assert.equal(deletedSession.response.status, 401);
  const deletedLogin = await post('/api/auth/login', {
    username: `managed_${suffix}`,
    password: ordinaryNewPassword,
  });
  assert.equal(deletedLogin.response.status, 401);

  const afterDelete = await post('/api/admin/users', {}, adminLogin.cookie);
  assert.equal(afterDelete.response.status, 200);
  assert.equal(afterDelete.payload.users.some((user) => user.id === ordinaryId), false);

  const persisted = JSON.parse(fs.readFileSync(path.join(dataDir, 'users.json'), 'utf8'));
  const persistedAdmin = persisted.users.find((user) => user.username === 'Benleethom');
  assert.equal(persisted.users.some((user) => user.id === ordinaryId), false);
  assert.equal(persistedAdmin.role, 'admin');
  assert.equal(persistedAdmin.systemAccount, 'builtin-benleethom-v1');
  assert.notEqual(persistedAdmin.pass.hash, adminPassword);
  assert.equal(JSON.stringify(persisted).includes(adminPassword), false);
  assert.equal(JSON.stringify(persisted).includes(ordinaryNewPassword), false);
});

test('ordinary users can manage only themselves, verify recovery email, and reset a forgotten password', { timeout: 25_000 }, async (t) => {
  const port = await unusedPort();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hex-settlers-self-service-'));
  const capturePath = path.join(dataDir, 'email-capture.jsonl');
  const adminPassword = 'Admin self service 42';
  const server = await startServer(port, dataDir, 'server.js', {
    HEX_BUILTIN_ADMIN_ENABLED: 'true',
    HEX_ADMIN_PASSWORD: adminPassword,
    HEX_PUBLIC_BASE_URL: `http://127.0.0.1:${port}`,
    HEX_EMAIL_CAPTURE_PATH: capturePath,
  });
  t.after(async () => {
    await server.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  async function post(route, body, cookie = '') {
    const headers = { 'Content-Type': 'application/json' };
    if (cookie) headers.Cookie = cookie;
    const response = await fetch(`http://127.0.0.1:${port}${route}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ captchaToken: 'register@127.0.0.1', ...body }),
    });
    let payload = {};
    try { payload = await response.json(); } catch (_) {}
    return { response, payload, cookie: String(response.headers.get('set-cookie') || '').split(';')[0] };
  }

  const suffix = Date.now().toString(36).slice(-8);
  const username = `self_${suffix}`;
  const originalPassword = 'original password 42';
  const changedPassword = 'changed password 42';
  const emailedPassword = 'emailed password 42';
  const recoveryEmail = `self-${suffix}@example.com`;

  const ordinary = await post('/api/auth/register', {
    username,
    password: originalPassword,
    displayName: 'Self Service Player',
  });
  assert.equal(ordinary.response.status, 200);
  assert.match(ordinary.cookie, /hexsettlers_session=/);

  const other = await post('/api/auth/register', {
    username: `other_${suffix}`,
    password: 'other password 42',
    displayName: 'Other Player',
  });
  assert.equal(other.response.status, 200);

  const selfList = await post('/api/account/users', {}, ordinary.cookie);
  assert.equal(selfList.response.status, 200);
  assert.equal(selfList.payload.isAdmin, false);
  assert.equal(selfList.payload.users.length, 1);
  assert.equal(selfList.payload.users[0].username, username);
  assert.equal(selfList.payload.emailDeliveryConfigured, true);

  const wrongCurrent = await post('/api/account/change-password', {
    currentPassword: 'wrong password',
    newPassword: changedPassword,
  }, ordinary.cookie);
  assert.equal(wrongCurrent.response.status, 401);

  const changed = await post('/api/account/change-password', {
    currentPassword: originalPassword,
    newPassword: changedPassword,
  }, ordinary.cookie);
  assert.equal(changed.response.status, 200);
  assert.match(changed.payload.message, /other saved sessions/i);
  assert.match(changed.cookie, /hexsettlers_session=/);

  const oldSession = await post('/api/auth/session', {}, ordinary.cookie);
  assert.equal(oldSession.response.status, 401);
  const changedSession = await post('/api/auth/session', {}, changed.cookie);
  assert.equal(changedSession.response.status, 200);

  const emailRequest = await post('/api/account/request-email-link', {
    email: recoveryEmail,
    currentPassword: changedPassword,
  }, changed.cookie);
  assert.equal(emailRequest.response.status, 200);
  assert.equal(emailRequest.payload.user.pendingEmail, recoveryEmail);
  assert.equal(emailRequest.payload.user.hasEmail, false);

  const capturedAfterVerification = fs.readFileSync(capturePath, 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(capturedAfterVerification.length, 1);
  assert.equal(capturedAfterVerification[0].to, recoveryEmail);
  assert.match(capturedAfterVerification[0].html, /alt="Hex Settlers"/);
  assert.match(capturedAfterVerification[0].html, new RegExp(`http://127\\.0\\.0\\.1:${port}/favicon\\.png`));
  assert.match(capturedAfterVerification[0].html, /Account security/);
  assert.match(capturedAfterVerification[0].html, /never share this link/i);
  const verifyUrl = new URL(capturedAfterVerification[0].text.match(/https?:\/\/\S+/)[0]);
  const verifyToken = verifyUrl.searchParams.get('verify_email');
  assert.ok(verifyToken);

  const verified = await post('/api/auth/verify-email', { token: verifyToken });
  assert.equal(verified.response.status, 200);
  assert.match(verified.payload.message, /verified/i);
  const reusedVerification = await post('/api/auth/verify-email', { token: verifyToken });
  assert.equal(reusedVerification.response.status, 400);

  const selfAfterVerify = await post('/api/account/users', {}, changed.cookie);
  assert.equal(selfAfterVerify.response.status, 200);
  assert.equal(selfAfterVerify.payload.users[0].email, recoveryEmail);
  assert.equal(selfAfterVerify.payload.users[0].emailVerified, true);

  const resetRequest = await post('/api/auth/request-password-reset', { identifier: username });
  assert.equal(resetRequest.response.status, 200);
  assert.match(resetRequest.payload.message, /matching account/i);
  const capturedAfterReset = fs.readFileSync(capturePath, 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(capturedAfterReset.length, 2);
  assert.match(capturedAfterReset[1].html, /alt="Hex Settlers"/);
  assert.match(capturedAfterReset[1].html, new RegExp(`http://127\\.0\\.0\\.1:${port}/favicon\\.png`));
  assert.match(capturedAfterReset[1].html, /Reset password/);
  assert.match(capturedAfterReset[1].html, /30 minutes/);
  const resetUrl = new URL(capturedAfterReset[1].text.match(/https?:\/\/\S+/)[0]);
  const resetToken = resetUrl.searchParams.get('reset_password');
  assert.ok(resetToken);

  const reset = await post('/api/auth/reset-password', {
    token: resetToken,
    newPassword: emailedPassword,
  });
  assert.equal(reset.response.status, 200);
  assert.match(reset.payload.message, /log in/i);
  const reusedReset = await post('/api/auth/reset-password', {
    token: resetToken,
    newPassword: 'another password 42',
  });
  assert.equal(reusedReset.response.status, 400);

  const staleChangedLogin = await post('/api/auth/login', { username, password: changedPassword });
  assert.equal(staleChangedLogin.response.status, 401);
  const recoveredLogin = await post('/api/auth/login', { username, password: emailedPassword });
  assert.equal(recoveredLogin.response.status, 200);
  assert.equal(recoveredLogin.payload.user.email, recoveryEmail);

  const adminLogin = await post('/api/auth/login', { username: 'Benleethom', password: adminPassword });
  assert.equal(adminLogin.response.status, 200);
  const adminAccountList = await post('/api/account/users', {}, adminLogin.cookie);
  assert.equal(adminAccountList.response.status, 200);
  assert.equal(adminAccountList.payload.isAdmin, true);
  assert.ok(adminAccountList.payload.users.length >= 3);
  const ordinaryInAdminList = adminAccountList.payload.users.find((user) => user.username === username);
  assert.ok(ordinaryInAdminList);
  assert.equal(ordinaryInAdminList.email, '');
  assert.match(ordinaryInAdminList.emailMasked, /@example\.com$/);

  const persisted = JSON.parse(fs.readFileSync(path.join(dataDir, 'users.json'), 'utf8'));
  const stored = persisted.users.find((user) => user.username === username);
  assert.equal(stored.email, recoveryEmail);
  assert.ok(stored.emailVerifiedAt > 0);
  assert.equal(stored.emailVerification, undefined);
  assert.equal(stored.passwordReset, undefined);
  assert.equal(JSON.stringify(stored).includes(emailedPassword), false);
});

test('v38 casual maps exclude custom maps and Unranked classic custom maps round-trip', { timeout: 30_000 }, async (t) => {
  const port = await unusedPort();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hex-settlers-v34-casual-'));
  const server = await startServer(port, dataDir);
  const host = await Peer.connect(port);
  const visitor = await Peer.connect(port);
  t.after(async () => {
    host.close(); visitor.close(); await server.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });
  const slug = Date.now().toString(36);
  host.send({ type: 'auth_register', username: `v34host_${slug}`, password: 'v34 integration test', displayName: 'Host' });
  await host.waitFor(m => m.type === 'auth_ok');
  visitor.send({ type: 'auth_register', username: `v34guest_${slug}`, password: 'v34 integration test', displayName: 'Guest' });
  await visitor.waitFor(m => m.type === 'auth_ok');

  host.send({ type: 'create_room', casual: true });
  const joined = await host.waitFor(m => m.type === 'joined');
  assert.equal(joined.room.casual, true);
  assert.equal(joined.room.players.length, 1);
  assert.equal(joined.room.players.filter(p => !p.isAI).length, 1);
  visitor.send({ type: 'join_room', code: joined.room.code, spectator: true });
  const spectating = await visitor.waitFor(m => m.type === 'joined');
  assert.equal(spectating.role, 'spectator');

  host.send({ type: 'set_rules', rules: { mapMode: 'classic', customMap: true, randomMapAtStart: false } });
  assert.match((await host.waitFor(m => m.type === 'error')).error, /custom maps.*casual/i);
  host.send({ type: 'leave_room', switchMode: 'unranked' });
  await host.waitFor(m => m.type === 'left_room');
  host.send({ type: 'create_room' });
  const editableRoom = await host.waitFor(m => m.type === 'joined');
  assert.equal(editableRoom.room.casual, false);
  host.send({ type: 'set_rules', rules: { mapMode: 'classic', customMap: true, randomMapAtStart: false } });
  await host.waitFor(m => m.type === 'room' && m.room.rules?.customMap === true);
  const preview = await host.waitFor(m => m.type === 'state' && m.state.rules?.customMap === true && m.state.rules.mapMode === 'classic');
  assert.equal(preview.state.geom.tiles.some(tile => tile.type === 'desert'), true);
  host.send({ type: 'download_custom_map' });
  const original = (await host.waitFor(m => m.type === 'custom_map_file')).map;
  assert.equal(original.mapKind, 'classic');
  assert.equal(original.format, 'hex-settlers-custom-map');
  assert.equal(original.tiles.length, preview.state.geom.tiles.length);

  const patchIndex = original.tiles.findIndex(t => t.type === 'sea');
  assert.ok(patchIndex >= 0);
  host.send({ type: 'edit_preview_tile', tileId: patchIndex, tileType: 'forest', number: 8 });
  const changed = await host.waitFor(m => m.type === 'state' && m.state.geom?.tiles?.[patchIndex]?.type === 'forest');
  assert.equal(changed.state.geom.tiles[patchIndex].number, 8);

  host.send({ type: 'upload_custom_map', map: original });
  await host.waitFor(m => m.type === 'custom_map_loaded');
  const restored = await host.waitFor(m => m.type === 'state' && m.state.geom?.tiles?.[patchIndex]?.type === 'sea');
  assert.equal(restored.state.geom.tiles[patchIndex].number, null);
  host.send({ type: 'set_ready', ready: true });
  await host.waitFor(m => m.type === 'room' && m.room.players.find(p => p.id === editableRoom.playerId)?.ready === true);
  host.send({ type: 'start_game' });
  const started = await host.waitFor(m => m.type === 'state' && m.state.phase !== 'lobby', 8_000);
  assert.equal(started.state.rules.customMap, true);
  assert.equal(started.state.geom.tiles[patchIndex].type, 'sea');
});

test('v38 Unranked Classic 5–6 Custom Map supports six seats, export, and import validation', { timeout: 25_000 }, async (t) => {
  const port = await unusedPort();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hex-settlers-v34-classic56-'));
  const server = await startServer(port, dataDir);
  const peer = await Peer.connect(port);
  t.after(async () => { peer.close(); await server.stop(); fs.rmSync(dataDir, { recursive: true, force: true }); });
  peer.send({ type: 'auth_register', username: `v34six_${Date.now().toString(36)}`, password: 'v34 integration test', displayName: 'Host' });
  await peer.waitFor(m => m.type === 'auth_ok');
  peer.send({ type: 'create_room' });
  await peer.waitFor(m => m.type === 'joined');
  peer.send({ type: 'set_rules', rules: { mapMode: 'classic56', customMap: true } });
  const r = await peer.waitFor(m => m.type === 'room' && m.room.rules?.mapMode === 'classic56');
  assert.equal(r.room.casual, false);
  peer.send({ type: 'fill_ai', targetCount: 6 });
  const full = await peer.waitFor(m => m.type === 'room' && m.room.players.length === 6);
  assert.equal(full.room.players.length, 6);
  const preview = await peer.waitFor(m => m.type === 'state' && m.state.rules?.customMap === true && m.state.rules.mapMode === 'classic56');
  peer.send({ type: 'download_custom_map' });
  const layout = (await peer.waitFor(m => m.type === 'custom_map_file')).map;
  assert.equal(layout.mapKind, 'classic56');
  assert.equal(layout.tiles.length, preview.state.geom.tiles.length);
  assert.ok(layout.tiles.length > 19);
  peer.send({ type: 'upload_custom_map', map: { ...layout, tiles: layout.tiles.slice(1) } });
  assert.match((await peer.waitFor(m => m.type === 'error')).error, /invalid|incompatible/i);
  peer.send({ type: 'upload_custom_map', map: layout });
  await peer.waitFor(m => m.type === 'custom_map_loaded');
  peer.send({ type: 'set_ready', ready: true });
  await peer.waitFor(m => m.type === 'room' && m.room.players.some(player => !player.isAI && player.ready === true));
  peer.send({ type: 'start_game' });
  const started = await peer.waitFor(m => m.type === 'state' && m.state.phase !== 'lobby', 8_000);
  assert.equal(started.state.rules.mapMode, 'classic56');
  assert.equal(started.state.geom.tiles.length, layout.tiles.length);
});

test('switching out of a solo Casual or Unranked lobby deletes the abandoned room', { timeout: 20_000 }, async (t) => {
  const port = await unusedPort();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hex-settlers-switch-solo-'));
  const app = await startServer(port, dataDir);
  const peer = await Peer.connect(port);
  t.after(async () => { peer.close(); await app.stop(); fs.rmSync(dataDir, { recursive: true, force: true }); });
  peer.send({ type: 'auth_register', username: `v36_solo_${Date.now().toString(36)}`, password: 'switch mode test', displayName: 'Solo' });
  await peer.waitFor(m => m.type === 'auth_ok');
  peer.send({ type: 'create_room', casual: true });
  const casual = await peer.waitFor(m => m.type === 'joined');
  assert.equal(casual.room.casual, true);
  assert.equal(casual.room.players.filter(p => p.isAI).length, 0);
  peer.send({ type: 'leave_room', switchMode: 'unranked' });
  assert.equal((await peer.waitFor(m => (m.type === 'left_room' || m.type === 'error'))).switchMode, 'unranked');
  peer.send({ type: 'rejoin_room', code: casual.room.code });
  assert.match((await peer.waitFor(m => m.type === 'error')).error, /not found/i);

  peer.send({ type: 'create_room' });
  const unranked = await peer.waitFor(m => m.type === 'joined');
  assert.equal(unranked.room.casual, false);
  peer.send({ type: 'leave_room', switchMode: 'ranked' });
  assert.equal((await peer.waitFor(m => (m.type === 'left_room' || m.type === 'error'))).switchMode, 'ranked');
  peer.send({ type: 'rejoin_room', code: unranked.room.code });
  assert.match((await peer.waitFor(m => m.type === 'error')).error, /not found/i);
  peer.send({ type: 'ranked_queue_join' });
  assert.equal((await peer.waitFor(m => m.type === 'ranked_queue_status' && m.queued === true)).queued, true);
  peer.send({ type: 'ranked_queue_leave' });
  assert.equal((await peer.waitFor(m => m.type === 'ranked_queue_status' && m.queued === false)).queued, false);
});

test('switching away from shared Unranked elects the longest-present remaining human', { timeout: 25_000 }, async (t) => {
  const port = await unusedPort();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hex-settlers-switch-host-'));
  const app = await startServer(port, dataDir);
  const peers = [];
  t.after(async () => { for (const peer of peers) peer.close(); await app.stop(); fs.rmSync(dataDir, { recursive: true, force: true }); });
  const users = [];
  const slug = Date.now().toString(36);
  for (let i = 0; i < 3; i++) {
    const peer = await Peer.connect(port);
    peers.push(peer);
    peer.send({ type: 'auth_register', username: `v36_host_${slug}_${i}`, password: 'mode switch test', displayName: `Player ${i}` });
    users.push((await peer.waitFor(m => m.type === 'auth_ok')).user);
  }
  peers[0].send({ type: 'create_room' });
  const created = await peers[0].waitFor(m => m.type === 'joined');
  const code = created.room.code;
  peers[1].send({ type: 'join_room', code });
  await peers[1].waitFor(m => m.type === 'joined');
  peers[2].send({ type: 'join_room', code });
  await peers[2].waitFor(m => m.type === 'joined');
  peers[0].send({ type: 'leave_room', switchMode: 'casual' });
  assert.equal((await peers[0].waitFor(m => (m.type === 'left_room' || m.type === 'error'))).switchMode, 'casual');
  const successor = await peers[1].waitFor(m => m.type === 'room' && m.room.hostId === users[1].id);
  assert.equal(successor.room.players.length, 2);
  peers[1].send({ type: 'leave_room', switchMode: 'ranked' });
  await peers[1].waitFor(m => (m.type === 'left_room' || m.type === 'error'));
  const last = await peers[2].waitFor(m => m.type === 'room' && m.room.hostId === users[2].id);
  assert.equal(last.room.players.length, 1);
  peers[2].send({ type: 'leave_room', switchMode: 'casual' });
  await peers[2].waitFor(m => (m.type === 'left_room' || m.type === 'error'));
  peers[0].send({ type: 'rejoin_room', code });
  assert.match((await peers[0].waitFor(m => m.type === 'error')).error, /not found/i);
});

test('v67 security: anonymous rejoin cannot take an authenticated seat or read a game archive', { timeout: 20_000 }, async (t) => {
  const port = await unusedPort();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hex-security-rejoin-'));
  const server = await startServer(port, dataDir);
  const peers = [];
  t.after(async () => {
    for (const peer of peers) peer.close();
    await server.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });
  const host = await Peer.connect(port);
  peers.push(host);
  const suffix = Date.now().toString(36);
  host.send({ type: 'auth_register', username: `securehost_${suffix}`, password: 'secure registration phrase', displayName: 'Host' });
  const account = await host.waitFor((event) => event.type === 'auth_ok');
  host.send({ type: 'create_room', displayName: 'Host' });
  const joined = await host.waitFor((event) => event.type === 'joined');
  assert.match(joined.room.code, /^[A-Z2-9]{8}$/);

  const attacker = await Peer.connect(port);
  peers.push(attacker);
  attacker.send({ type: 'rejoin_room', code: joined.room.code, playerId: account.user.id });
  assert.equal((await attacker.waitFor((event) => event.type === 'auth_required')).type, 'auth_required');
  attacker.send({ type: 'get_game_history_entry', id: 'arbitrary' });
  assert.equal((await attacker.waitFor((event) => event.type === 'auth_required')).type, 'auth_required');
  attacker.send({ type: 'get_game_history', limit: 100 });
  assert.equal((await attacker.waitFor((event) => event.type === 'auth_required')).type, 'auth_required');
  assert.equal(host.ws.readyState, WebSocket.OPEN, 'attacker did not disconnect the legitimate socket');
  host.send({ type: 'client_ping', clientTime: 123 });
  assert.equal((await host.waitFor((event) => event.type === 'server_pong' && event.clientTime === 123)).clientTime, 123);

  const other = await Peer.connect(port);
  peers.push(other);
  other.send({ type: 'auth_register', username: `secureother_${suffix}`, password: 'another registration phrase', displayName: 'Other' });
  await other.waitFor((event) => event.type === 'auth_ok');
  other.send({ type: 'rejoin_room', code: joined.room.code, playerId: account.user.id });
  const denied = await other.waitFor((event) => event.type === 'error');
  assert.match(denied.error, /not found|not (?:in|a member)/i);

  const tokenResponse = await fetch(`http://127.0.0.1:${port}/api/auth/token`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: account.token }),
  });
  assert.equal(tokenResponse.status, 200);
  const cookie = tokenResponse.headers.get('set-cookie').split(';')[0];
  const renewed = await Peer.connect(port, { headers: { Cookie: cookie } });
  peers.push(renewed);
  await renewed.waitFor((event) => event.type === 'auth_ok' && event.cookieAuth);
  renewed.send({ type: 'rejoin_room', code: joined.room.code, playerId: 'attacker-supplied-id' });
  const restored = await renewed.waitFor((event) => event.type === 'joined');
  assert.equal(restored.playerId, account.user.id, 'account identity overrides attacker-supplied playerId');
});

test('v67 security: successful HTTP logins do not reset per-IP rate limits', { timeout: 15_000 }, async (t) => {
  const port = await unusedPort();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hex-security-rate-'));
  const server = await startServer(port, dataDir, 'server.js', { HEX_AUTH_ATTEMPTS_PER_MINUTE: '2' });
  t.after(async () => {
    await server.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });
  const suffix = Date.now().toString(36);
  const credentials = { username: `rate_${suffix}`, password: 'long secure rate test password' };
  const post = (action) => fetch(`http://127.0.0.1:${port}/api/auth/${action}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...credentials, captchaToken: 'register@127.0.0.1' }),
  });
  assert.equal((await post('register')).status, 200);
  assert.equal((await post('login')).status, 200);
  assert.equal((await post('login')).status, 429);
});

test('v68 security: admin password alone cannot create a management session and TOTP is mandatory', { timeout: 20_000 }, async (t) => {
  const { totpAt } = require('../server/admin-totp');
  const port = await unusedPort();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hex-security-admin-mfa-'));
  const password = 'A secure admin test passphrase 2026!';
  const server = await startServer(port, dataDir, 'server.js', {
    HEX_ADMIN_HOST: 'admin.hexsettlers.org', HEX_TRUST_PROXY: '1', HEX_BUILTIN_ADMIN_ENABLED: 'true', HEX_ADMIN_PASSWORD: password,
  });
  t.after(async () => {
    await server.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });
  const post = async (action, body = {}, cookie = '', host = 'admin.hexsettlers.org') => {
    const response = await fetch(`http://127.0.0.1:${port}/api/${action}`, {
      method: 'POST', headers: {
        'X-Forwarded-Host': host, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}),
      }, body: JSON.stringify({ captchaToken: 'register@127.0.0.1', ...body }),
    });
    const json = await response.json();
    return { status: response.status, json, cookies: response.headers.getSetCookie?.() || [response.headers.get('set-cookie') || ''] };
  };
  const cookieNamed = (result, name) => {
    const found = result.cookies.find((cookie) => cookie.startsWith(`${name}=`));
    assert.ok(found, `Expected ${name} cookie`);
    return found.split(';')[0];
  };

  const first = await post('auth/login', { username: 'Benleethom', password });
  assert.equal(first.status, 200);
  assert.equal(first.json.mfaRequired, true);
  assert.equal(first.json.mfaSetup, true);
  assert.ok(!first.json.user, 'password step must not expose an authenticated admin');
  const pending = cookieNamed(first, 'hexsettlers_admin_mfa_pending');
  assert.equal((await post('admin/users', {}, pending)).status, 401);
  assert.equal((await post('auth/session', {}, pending)).status, 401);

  const setup = await post('auth/admin-mfa-setup', {}, pending);
  assert.equal(setup.status, 200);
  assert.match(setup.json.secret, /^[A-Z2-7]{32}$/);
  const code = totpAt(setup.json.secret, Math.floor(Date.now() / 30_000));
  const verified = await post('auth/admin-mfa-verify', { code }, pending);
  assert.equal(verified.status, 200);
  assert.equal(verified.json.user.isAdmin, true);
  const signedIn = cookieNamed(verified, 'hexsettlers_session');
  assert.equal((await post('admin/users', {}, signedIn)).status, 200);
  assert.equal((await post('auth/admin-mfa-verify', { code }, pending)).status, 401, 'used challenge cannot be replayed');

  const publicLogin = await post('auth/login', { username: 'Benleethom', password }, '', 'hexsettlers.org');
  assert.equal(publicLogin.status, 200);
  const publicSession = cookieNamed(publicLogin, 'hexsettlers_session');
  assert.equal((await post('admin/users', {}, publicSession)).status, 401);
  assert.equal((await post('auth/session', {}, publicSession)).status, 401);
  assert.equal((await post('admin/users', {}, signedIn, 'hexsettlers.org')).status, 404);
});
