'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const { SCENARIOS, buildSchedule, runBenchmark, createBenchmarkWorkers, readBenchmark, compareRuns, promotionGate } = require('../scripts/neural-benchmark');

test('benchmark budgets round up to full seat rotations with a separate seed per scenario', () => {
  const maps = SCENARIOS.filter(map => ['classic', 'classic56_5p', 'classic78'].includes(map.id));
  const games = 100;
  const schedule = buildSchedule({ games, maps, seed: 'rotation-check', candidate: 'a', opponent: 'b', maxTurns: 900 });
  assert.ok(schedule.length >= games && schedule.length < games + 8);
  const blocks = new Map();
  for (const game of schedule) {
    if (!blocks.has(game.seed)) blocks.set(game.seed, []);
    blocks.get(game.seed).push(game);
  }
  for (const block of blocks.values()) {
    assert.equal(block.length, block[0].map.players);
    assert.deepEqual(block.map(game => game.candidateSeat), block.map((_, seat) => seat));
    assert.ok(block.every(game => game.map.id === block[0].map.id));
  }
});

test('frozen engine yields identical outcomes and replay actions across worker counts', async () => {
  const output = await fs.mkdtemp(path.join(os.tmpdir(), 'hex-benchmark-test-'));
  try {
    const model = { file: path.resolve(__dirname, '..', 'neural_ai_model.json') };
    const settings = { candidate: model, opponent: model, maps: ['classic'], games: 4, seed: 'repeatability-test', output };
    const first = await runBenchmark({ ...settings, workers: 1 });
    const second = await runBenchmark({ ...settings, workers: 2 });
    assert.equal(first.summary.completed, 4);
    assert.equal(first.summary.wins, 1);
    assert.equal(first.summary.invalidActions, 0);
    const [a, b, aReplay, bReplay] = await Promise.all([
      readBenchmark(first.id, 'matches', output), readBenchmark(second.id, 'matches', output),
      readBenchmark(first.id, 1, output), readBenchmark(second.id, 1, output),
    ]);
    assert.equal(new Set(a.map(game => game.boardHash)).size, 1);
    assert.deepEqual(a.map(({ technical, ...game }) => game), b.map(({ technical, ...game }) => game));
    assert.deepEqual(aReplay, bReplay);
    assert.equal(compareRuns(a, b).winRateDelta.estimate, 0);
    assert.ok(Number.isFinite(first.byPlayerCount[4].openSkill.ordinal));
  } finally {
    await fs.rm(output, { recursive: true, force: true });
  }
});

test('a progressive tournament reuses complete rotations and archives a stopped interim', async () => {
  const output = await fs.mkdtemp(path.join(os.tmpdir(), 'hex-benchmark-prefix-'));
  const workers = createBenchmarkWorkers(path.join(output, 'engine'), 2);
  try {
    const model = { file: path.resolve(__dirname, '..', 'neural_ai_model.json') };
    const settings = { candidate: model, opponent: model, maps: ['classic'], seed: 'prefix-test', output, workerPool: workers, replay: false };
    const report = await runBenchmark({ ...settings, games: 4 });
    const matches = await readBenchmark(report.id, 'matches', output);
    const extended = await runBenchmark({ ...settings, games: 8, prefix: { report, matches } });
    assert.equal(extended.simulatedGames, 4);
    assert.equal(extended.summary.games, 8);
    const all = await readBenchmark(extended.id, 'matches', output);
    assert.deepEqual(all.slice(0, 4), matches);

    const early = await runBenchmark({
      ...settings, games: 12, replay: true,
      interim: { games: 5, stop: games => games.length === 8 },
    });
    assert.equal(early.config.games, 12);
    assert.equal(early.summary.games, 8);
    assert.equal(early.stoppedEarly, true);
    assert.ok((await readBenchmark(early.id, 8, output)).actions.length);
  } finally {
    workers.close();
    await fs.rm(output, { recursive: true, force: true });
  }
});

test('a worker exit retries the identical match without retrying an engine-reported crash', async () => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'hex-benchmark-retry-'));
  let launches = 0;
  const scheduled = [];
  const workers = createBenchmarkWorkers(scratch, 1, () => {
    launches++;
    const launch = launches;
    const child = new EventEmitter();
    child.stdout = { resume() {} };
    child.stderr = new EventEmitter();
    child.kill = () => {};
    child.send = message => queueMicrotask(() => {
      if (message.type === 'configure') {
        child.emit('message', { type: 'ready', buildId: 'test-engine' });
        return;
      }
      scheduled.push(message.task);
      if (launch === 1) child.emit('exit', 1);
      else child.emit('message', { result: { status: scheduled.length === 2 ? 'completed' : 'crashed' } });
    });
    return child;
  });
  try {
    const policies = { a: {}, b: {} };
    const task = { seed: 'same-board', candidateSeat: 3 };
    const recovered = await workers.play(0, policies, task);
    assert.equal(recovered.result.status, 'completed');
    assert.equal(recovered.retries, 1);
    assert.deepEqual(scheduled, [task, task]);
    const crash = await workers.play(0, policies, task);
    assert.equal(crash.result.status, 'crashed');
    assert.equal(crash.retries, 0);
    assert.equal(launches, 2);
  } finally {
    workers.close();
    await fs.rm(scratch, { recursive: true, force: true });
  }
});

test('promotion requires a credible lead, legal games and matched scenario checks', () => {
  const games = Array.from({ length: 1000 }, (_, index) => {
    const seat = index % 4;
    return {
      mapId: index < 500 ? 'classic' : 'four_islands', seed: String(Math.floor(index / 4)),
      boardHash: String(Math.floor(index / 4)), players: 4, candidateSeat: seat,
      winnerSeat: seat, status: 'completed', invalid: [],
    };
  });
  const neutral = games.map((game, index) => ({ ...game, winnerSeat: index % 4 === 0 ? game.candidateSeat : 0 }));
  assert.equal(promotionGate(games, games, neutral).promote, true);
  assert.equal(promotionGate(neutral, games, neutral).promote, false);
  const rejected = [{ ...games[0], invalid: [{ error: 'bad action' }] }, ...games.slice(1)];
  assert.equal(promotionGate(rejected, games, neutral).promote, false);
  assert.equal(promotionGate(games, neutral, games).promote, false);
  assert.equal(promotionGate(games, games, neutral.slice(1)).promote, false);
});
