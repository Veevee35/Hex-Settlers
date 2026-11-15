'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
  listCompletedRuns, listTrainingRuns, openTrainingRun, trainingProgression, summarizeTrainingRun,
  trainingGamePage, exportTrainingRun,
} = require('../scripts/trainer-analytics');

test('saved-run analytics include all candidates, filter before paging, and export full match records', async t => {
  const output = await fs.mkdtemp(path.join(os.tmpdir(), 'hex-analytics-'));
  t.after(() => fs.rm(output, { recursive: true, force: true }));
  const save = async (file, data) => {
    const target = path.join(output, file);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, JSON.stringify(data));
  };
  const id = '.neural-evolution-analytics';
  const generation = `${id}/generation-01`;
  const manifest = { totalGames: 120, generationGames: 120, shards: 2 };
  const selection = { generation: 1, selectedCandidate: 2 };
  const games = Array.from({ length: 120 }, (_, curriculumIndex) => ({
    curriculumIndex,
    mapId: curriculumIndex < 110 ? 'classic' : 'eight_islands_78',
    ...(curriculumIndex >= 110 ? { requestedMapId: 'classic78' } : {}),
    turnNumber: 100,
    winnerMargin: 4,
    goldProductionCards: curriculumIndex === 119 ? 5 : 0,
    standings: [{ name: 'AI 1', vp: 10 }],
  }));
  await save(`${id}/run.json`, manifest);
  await save('.neural-evolution-paused/run.json', manifest);
  await save(`${generation}/selection.json`, selection);
  await save(`${generation}/candidate-01/report.json`, { games: games.slice(0, 60) });
  await save(`${generation}/candidate-02/report.json`, { games: games.slice(60), gpuBatches: [{ committed: true }] });

  assert.deepEqual((await listCompletedRuns(output)).map(run => run.id), [id]);
  assert.equal(await openTrainingRun(output, '../analytics'), null);
  const run = await openTrainingRun(output, id);
  const summary = await summarizeTrainingRun(run);
  assert.equal(summary.games, 120);
  assert.equal(summary.replacements, 10);
  assert.equal(summary.gold, 5);
  assert.equal(summary.averageTurns, 100);
  assert.deepEqual(summary.selections, [selection]);
  const secondPage = await trainingGamePage(run, { generation: 1, map: 'classic', page: 2 });
  assert.equal(secondPage.total, 110);
  assert.equal(secondPage.games.length, 50);
  assert.equal(secondPage.games[10].candidate, 2);
  assert.equal(secondPage.games[10].curriculumIndex, 60);
  assert.equal(secondPage.candidates[1].gpuBatches[0].committed, true);
  const chunks = [];
  for await (const chunk of exportTrainingRun(run)) chunks.push(chunk);
  const exported = JSON.parse(chunks.join(''));
  assert.deepEqual(exported.generations[0].candidates.flatMap(candidate => candidate.games), games);
});

test('in-progress analytics advance only when a generation selection is committed', async t => {
  const output = await fs.mkdtemp(path.join(os.tmpdir(), 'hex-live-analytics-'));
  t.after(() => fs.rm(output, { recursive: true, force: true }));
  const id = '.neural-evolution-live';
  const dir = path.join(output, id);
  await fs.mkdir(dir);
  await fs.writeFile(path.join(dir, 'run.json'), JSON.stringify({ totalGames: 2, generationGames: 1, shards: 1 }));
  const open = () => openTrainingRun(output, id, { includeIncomplete: true });
  const initial = await open();
  assert.equal(initial.generations, 0);
  assert.deepEqual(await trainingProgression(initial), []);
  assert.equal((await summarizeTrainingRun(initial)).games, 0);

  async function saveGeneration(generation, score) {
    const folder = path.join(dir, `generation-0${generation}`);
    const candidate = path.join(folder, 'candidate-01');
    await fs.mkdir(candidate, { recursive: true });
    await fs.writeFile(path.join(candidate, 'report.json'), JSON.stringify({
      games: [{ mapId: 'classic', turnNumber: 100, winnerMargin: 2, goldProductionCards: 0 }],
    }));
    return () => fs.writeFile(path.join(folder, 'selection.json'), JSON.stringify({
      generation, selectionScore: score, selectedCandidate: 1, averageVictoryTurn: 100, averageWinnerMargin: 2,
    }));
  }

  await (await saveGeneration(1, -8))();
  const commit = await saveGeneration(2, -7);
  assert.equal(await openTrainingRun(output, id), null);
  assert.equal((await listTrainingRuns(output))[0].generations, 1);
  const partial = await open();
  assert.equal(partial.completedAt, null);
  assert.equal((await summarizeTrainingRun(partial)).games, 1);
  const earlyHistory = await trainingProgression(partial);
  assert.deepEqual(earlyHistory.map(point => point.selectionScore), [-8]);

  await commit();
  const complete = await openTrainingRun(output, id);
  assert.ok(complete.completedAt);
  assert.equal((await summarizeTrainingRun(complete)).games, 2);
  assert.deepEqual((await trainingProgression(complete)).map(point => point.selectionScore), [-8, -7]);
  assert.equal(earlyHistory.length, 1);
});
