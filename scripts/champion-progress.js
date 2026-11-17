'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const { atomicWriteJson } = require('./training-file');
const { OUTPUT, SCENARIOS, runBenchmark, readBenchmark, cleanRun, engineFingerprint } = require('./neural-benchmark');

const SUITE = 'champion-progress-v1';
const ROTATIONS = 4;
const GAMES = ROTATIONS * SCENARIOS.reduce((sum, scenario) => sum + scenario.players, 0);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const readJson = async file => JSON.parse(await fs.readFile(file, 'utf8'));

async function pinBaseline(directory, startingModelFile) {
  const pinnedDirectory = path.join(directory, 'baseline');
  const baseline = path.join(pinnedDirectory, 'model.json');
  try {
    await fs.access(baseline);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await fs.mkdir(directory, { recursive: true });
    const temporary = path.join(directory, `baseline-${randomUUID()}.tmp`);
    const temporaryModel = path.join(temporary, 'model.json');
    await fs.mkdir(temporary);
    try {
      await fs.copyFile(startingModelFile, temporaryModel);
      // A directory rename publishes the complete file, and a second process
      // cannot replace a nonempty directory containing an existing baseline.
      try { await fs.rename(temporary, pinnedDirectory); }
      catch (renameError) {
        await fs.access(baseline).catch(() => { throw renameError; });
      }
    } finally {
      await fs.rm(temporaryModel, { force: true });
      await fs.rmdir(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; });
    }
  }
  return baseline;
}

const compact = ({ games, wins, winRate, equalPolicyWinRate, meanPlace, meanVp, strategy, outcomes }) => ({
  games, wins, winRate, equalPolicyWinRate, meanPlace, meanVp,
  draws: outcomes?.['turn-limit'] || 0,
  vpPerProducedCard: strategy?.vpPerProducedCard ?? null,
  settlements: strategy?.['builds.settlement'] ?? null,
  development: strategy?.developmentBought ?? null,
});

async function auditChampion({ candidate, startingModelFile, output = OUTPUT, workerPool, signal, runId, generation, onProgress }) {
  const directory = path.join(output, 'champion-progress');
  const baseline = await pinBaseline(directory, startingModelFile);
  const [candidateBytes, baselineBytes, engineHash] = await Promise.all([
    fs.readFile(candidate.file), fs.readFile(baseline), engineFingerprint(),
  ]);
  const referenceId = hash(baselineBytes);
  const suiteId = hash(JSON.stringify([SUITE, GAMES, referenceId, engineHash]));
  const key = hash(JSON.stringify([suiteId, hash(candidateBytes)]));
  const index = path.join(directory, `${key}.json`);
  try {
    const saved = await readJson(index);
    await fs.access(path.join(output, saved.report, 'report.json'));
    return { ...saved, reused: true };
  } catch (error) { if (error.code !== 'ENOENT') throw error; }

  const report = await runBenchmark({
    candidate: { bytes: candidateBytes, label: candidate.label },
    opponent: { bytes: baselineBytes, label: 'Pinned training baseline' },
    maps: SCENARIOS.map(map => map.id), games: GAMES, seed: `${SUITE}:${referenceId}`,
    maxTurns: 1800, replay: false, output, workerPool, signal,
    context: { runId, generation, purpose: 'champion-progress', suiteId },
    onProgress: (done, total) => { if (done === total || done % 100 === 0) onProgress?.('champion progress', done, total); },
  });
  if (report.engineHash !== engineHash) throw new Error('The benchmark engine changed during the champion audit');
  const matches = await readBenchmark(report.id, 'matches', output);
  if (matches.some(match => match.infrastructure)) throw new Error('A benchmark worker failed during the champion audit');
  const record = {
    protocol: SUITE, report: report.id, model: report.candidate.id, baseline: referenceId, suiteId, engineHash,
    runId, generation, at: report.completedAt || report.startedAt, trainedGames: report.candidate.trainedGames,
    clean: cleanRun(matches), outcomes: report.summary.outcomes, all: compact(report.summary),
    byPlayerCount: Object.fromEntries(Object.entries(report.byPlayerCount).map(([count, result]) => [count, compact(result)])),
    byScenario: Object.fromEntries(Object.entries(report.byScenario).map(([map, result]) => [map, compact(result)])),
  };
  await atomicWriteJson(index, record);
  return record;
}

async function listChampionProgress(output = OUTPUT) {
  const directory = path.join(output, 'champion-progress');
  let names;
  try { names = await fs.readdir(directory); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  const records = await Promise.all(names.filter(name => /^[a-f0-9]{64}\.json$/.test(name)).map(name => readJson(path.join(directory, name))));
  return records.filter(record => record.protocol === SUITE)
    .sort((a, b) => a.at.localeCompare(b.at) || a.report.localeCompare(b.report));
}

module.exports = { auditChampion, listChampionProgress };
