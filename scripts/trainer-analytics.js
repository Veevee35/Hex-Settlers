'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const readJson = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const generationName = number => `generation-${String(number).padStart(2, '0')}`;
const candidateName = number => `candidate-${String(number).padStart(2, '0')}`;

async function openTrainingRun(output, id) {
  if (!/^\.neural-evolution-[a-zA-Z0-9-]+$/.test(id || '')) return null;
  const dir = path.join(output, id);
  try {
    if (!(await fs.lstat(dir)).isDirectory()) return null;
    const manifest = await readJson(path.join(dir, 'run.json'));
    const total = manifest.totalGames / manifest.generationGames;
    if (!Number.isSafeInteger(total) || total < 1 || !Number.isInteger(manifest.shards) || manifest.shards < 1) return null;
    const last = await fs.stat(path.join(dir, generationName(total), 'selection.json'));
    return { dir, id, manifest, generations: total, completedAt: last.mtime.toISOString() };
  } catch (error) {
    if (error.code === 'ENOENT' || error instanceof SyntaxError) return null;
    throw error;
  }
}

async function listCompletedRuns(output) {
  const entries = await fs.readdir(output, { withFileTypes: true });
  const runs = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const run = await openTrainingRun(output, entry.name);
    if (run) runs.push({ id: run.id, games: run.manifest.totalGames, completedAt: run.completedAt });
  }
  return runs.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
}

async function readSelection(run, generation) {
  return readJson(path.join(run.dir, generationName(generation), 'selection.json'));
}

async function readCandidate(run, generation, candidate) {
  return readJson(path.join(run.dir, generationName(generation), candidateName(candidate), 'report.json'));
}

async function summarizeTrainingRun(run) {
  const maps = new Map();
  const selections = [];
  let games = 0, turns = 0, margin = 0, gold = 0, replacements = 0;
  for (let generation = 1; generation <= run.generations; generation++) {
    selections.push(await readSelection(run, generation));
    for (let candidate = 1; candidate <= run.manifest.shards; candidate++) {
      const report = await readCandidate(run, generation, candidate);
      for (const game of report.games) {
        const { mapId, mapLabel, players, winnerMargin, turnNumber, goldProductionCards, requestedMapId } = game;
        if (!maps.has(mapId)) maps.set(mapId, {
          mapId, label: mapLabel || mapId, players, games: 0, turns: 0,
          margin: 0, gold: 0, replacements: 0, quickest: Infinity, longest: 0,
        });
        const map = maps.get(mapId);
        games++;
        map.games++;
        turns += turnNumber;
        map.turns += turnNumber;
        margin += winnerMargin;
        map.margin += winnerMargin;
        gold += goldProductionCards;
        map.gold += goldProductionCards;
        map.quickest = Math.min(map.quickest, turnNumber);
        map.longest = Math.max(map.longest, turnNumber);
        if (requestedMapId) {
          replacements++;
          map.replacements++;
        }
      }
    }
  }
  return {
    id: run.id, manifest: run.manifest, completedAt: run.completedAt, selections,
    games, averageTurns: turns / Math.max(1, games), averageMargin: margin / Math.max(1, games), gold, replacements,
    maps: Array.from(maps.values(), ({ turns, margin, ...map }) => ({
      ...map, averageTurns: turns / map.games, averageMargin: margin / map.games,
    })).sort((a, b) => a.label.localeCompare(b.label)),
  };
}

async function trainingGamePage(run, { generation, candidate, map, page }) {
  const gamesPerPage = 50;
  let total = 0;
  const games = [];
  const candidates = [];
  for (let number = 1; number <= run.manifest.shards; number++) {
    if (candidate && number !== candidate) continue;
    const { games: entries, ...report } = await readCandidate(run, generation, number);
    // The run report keeps the aggregate; individual attempt lists belong in the download.
    const { scenariosReplaced, mapHealth, byMap, mapsCovered, ...details } = report;
    candidates.push({ candidate: number, ...details, replacements: scenariosReplaced?.length || 0 });
    for (const game of entries) {
      if (map && game.mapId !== map) continue;
      if (total >= (page - 1) * gamesPerPage && games.length < gamesPerPage) games.push({ candidate: number, ...game });
      total++;
    }
  }
  return { generation, page, gamesPerPage, total, games, candidates };
}

async function* exportTrainingRun(run) {
  yield `{"id":${JSON.stringify(run.id)},"manifest":${JSON.stringify(run.manifest)},"completedAt":${JSON.stringify(run.completedAt)},"generations":[`;
  for (let generation = 1; generation <= run.generations; generation++) {
    const selection = await readSelection(run, generation);
    yield `${generation > 1 ? ',' : ''}{"selection":${JSON.stringify(selection)},"candidates":[`;
    for (let candidate = 1; candidate <= run.manifest.shards; candidate++) {
      const report = await readCandidate(run, generation, candidate);
      yield `${candidate > 1 ? ',' : ''}${JSON.stringify({ candidate, ...report })}`;
    }
    yield ']}';
  }
  yield ']}\n';
}

module.exports = { openTrainingRun, listCompletedRuns, summarizeTrainingRun, trainingGamePage, exportTrainingRun };
