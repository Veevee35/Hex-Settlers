'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const readJson = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const generationName = number => `generation-${String(number).padStart(2, '0')}`;
const candidateName = number => `candidate-${String(number).padStart(2, '0')}`;

async function openTrainingRun(output, id, { includeIncomplete = false } = {}) {
  if (!/^\.neural-evolution-[a-zA-Z0-9-]+$/.test(id || '')) return null;
  const dir = path.join(output, id);
  try {
    if (!(await fs.lstat(dir)).isDirectory()) return null;
    const manifest = await readJson(path.join(dir, 'run.json'));
    const total = manifest.totalGames / manifest.generationGames;
    if (!Number.isSafeInteger(total) || total < 1 || !Number.isInteger(manifest.shards) || manifest.shards < 1) return null;
    const run = { dir, id, manifest, generations: total, completedAt: null, updatedAt: manifest.createdAt };
    for (let generation = total; generation >= 1; generation--) {
      try {
        const last = await fs.stat(path.join(dir, generationName(generation), 'selection.json'));
        run.generations = generation;
        run.updatedAt = last.mtime.toISOString();
        if (generation === total) run.completedAt = run.updatedAt;
        return run;
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        if (!includeIncomplete) return null;
        if (generation === total) {
          // Skip generations for which work has never started.
          const entries = await fs.readdir(dir);
          const latest = entries.reduce((highest, name) => {
            const number = Number(/^generation-(\d+)$/.exec(name)?.[1]) || 0;
            return number < total ? Math.max(highest, number) : highest;
          }, 0);
          generation = latest + 1;
        }
      }
    }
    return { ...run, generations: 0 };
  } catch (error) {
    if (error.code === 'ENOENT' || error instanceof SyntaxError) return null;
    throw error;
  }
}

async function listTrainingRuns(output) {
  const entries = await fs.readdir(output, { withFileTypes: true });
  const runs = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const run = await openTrainingRun(output, entry.name, { includeIncomplete: true });
    if (run) runs.push({
      id: run.id, games: run.manifest.totalGames, generations: run.generations,
      totalGenerations: run.manifest.totalGames / run.manifest.generationGames,
      completedAt: run.completedAt, updatedAt: run.updatedAt || '',
    });
  }
  return runs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function listCompletedRuns(output) {
  return (await listTrainingRuns(output)).filter(run => run.completedAt)
    .map(({ id, games, completedAt }) => ({ id, games, completedAt }));
}

async function readSelection(run, generation) {
  return readJson(path.join(run.dir, generationName(generation), 'selection.json'));
}

async function readCandidate(run, generation, candidate) {
  return readJson(path.join(run.dir, generationName(generation), candidateName(candidate), 'report.json'));
}

let progressionCache;
function trainingProgression(run) {
  if (progressionCache?.dir === run.dir && progressionCache.generations === run.generations) return progressionCache.result;
  const previous = progressionCache?.dir === run.dir && progressionCache.generations < run.generations
    ? progressionCache.result : [];
  const result = (async () => {
    const history = [...await previous];
    for (let generation = history.length + 1; generation <= run.generations; generation++) {
      const { selectedCandidate, selectionScore, averageVictoryTurn, averageWinnerMargin, evaluation, candidates, work } = await readSelection(run, generation);
      const policyDecisions = candidates?.reduce((total, candidate) => total + (candidate.policyDecisions || 0), 0);
      history.push({ generation, selectedCandidate, selectionScore, averageVictoryTurn, averageWinnerMargin,
        ...(policyDecisions ? { policyDecisions } : {}),
        ...(work ? { work } : {}),
        ...(evaluation ? { qualification: {
          promoted: evaluation.promoted,
          report: evaluation.confirmation || evaluation.frontierCheck?.report || evaluation.screened[0].report,
          direct: evaluation.direct, games: evaluation.confirmationGames, stoppedEarly: evaluation.confirmationStoppedEarly,
          frontier: evaluation.frontier,
          resetToChampion: evaluation.resetToChampion,
        } } : {}) });
    }
    return history;
  })();
  progressionCache = { dir: run.dir, generations: run.generations, result };
  void result.catch(() => { if (progressionCache?.result === result) progressionCache = undefined; });
  return result;
}

let summaryCache;
async function summarizeTrainingRun(run) {
  if (summaryCache?.dir !== run.dir || summaryCache.generations !== run.generations) {
    const previous = summaryCache?.dir === run.dir && summaryCache.generations < run.generations
      ? summaryCache.result : undefined;
    const result = collectRunSummary(run, previous);
    summaryCache = { dir: run.dir, generations: run.generations, result };
    void result.catch(() => { if (summaryCache?.result === result) summaryCache = undefined; });
  }
  const { maps, selections, styleTraining, games, turns, margin, gold, replacements, work } = await summaryCache.result;
  return {
    id: run.id, manifest: run.manifest, completedAt: run.completedAt, selections, styleTraining,
    games, averageTurns: games ? turns / games : null, averageMargin: games ? margin / games : null, gold, replacements, work,
    maps: Array.from(maps.values(), ({ turns, margin, ...map }) => ({
      ...map, averageTurns: turns / map.games, averageMargin: margin / map.games,
    })).sort((a, b) => a.label.localeCompare(b.label)),
  };
}

async function collectRunSummary(run, previous) {
  const saved = await previous;
  const maps = new Map(Array.from(saved?.maps || [], ([id, map]) => [id, { ...map }]));
  const selections = [...(saved?.selections || [])];
  const styleTraining = [...(saved?.styleTraining || [])];
  const work = { decisionSamples: 0, anchoredGames: 0, scoredAnchorGames: 0, anchorWins: 0, anchorExpectedWins: 0, ...saved?.work };
  let { games = 0, turns = 0, margin = 0, gold = 0, replacements = 0 } = saved || {};
  const emptyGroup = () => ({ games: 0, decisions: 0 });
  const addTrainingGame = (group, game) => {
    group.games++;
    group.decisions += game.policyDecisions || 0;
  };
  for (let generation = selections.length + 1; generation <= run.generations; generation++) {
    selections.push(await readSelection(run, generation));
    const style = { generation, all: emptyGroup(), byPlayerCount: {}, byScenario: {} };
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
        work.decisionSamples += game.policyDecisions || 0;
        if (game.anchored) {
          work.anchoredGames++;
          if (typeof game.learnerWon === 'boolean') {
            work.scoredAnchorGames++;
            work.anchorWins += Number(game.learnerWon);
            work.anchorExpectedWins += 1 / players;
          }
        }
        map.games++;
        addTrainingGame(style.all, game);
        if (Number.isInteger(players)) addTrainingGame(style.byPlayerCount[players] ??= emptyGroup(), game);
        addTrainingGame(style.byScenario[mapId] ??= emptyGroup(), game);
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
    styleTraining.push(style);
  }
  return { maps, selections, styleTraining, games, turns, margin, gold, replacements, work };
}

async function styleBenchmarkProgression(run, loadReport) {
  const { selections } = await summarizeTrainingRun(run);
  const ids = new Map();
  const compact = row => row && ({
    games: row.games, completed: row.completed, wins: row.wins, winRate: row.winRate,
    equalPolicyWinRate: row.equalPolicyWinRate, meanPlace: row.meanPlace,
  });
  const read = id => {
    if (!ids.has(id)) ids.set(id, loadReport(id).catch(error => {
      if (error.code === 'ENOENT') return null;
      throw error;
    }));
    return ids.get(id);
  };
  const results = [];
  // Use the carried checkpoint for a fixed-reference series. Older runs
  // supply only archived champion checks, which the UI labels separately.
  for (const { generation, selectedCandidate, evaluation } of selections) {
    const tracked = evaluation?.styleTracking?.report;
    const confirmation = evaluation?.confirmation;
    if (!tracked && !confirmation) continue;
    const report = await read(tracked || confirmation);
    if (!report) continue;
    results.push({
      generation, id: report.id, kind: tracked ? 'fixed' : 'qualification', candidate: selectedCandidate,
      opponent: report.opponent?.label, engineHash: report.engineHash, early: !!report.stoppedEarly,
      all: compact(report.summary),
      byPlayerCount: Object.fromEntries(Object.entries(report.byPlayerCount || {}).map(([key, row]) => [key, compact(row)])),
      byScenario: Object.fromEntries(Object.entries(report.byScenario || {}).map(([key, row]) => [key, compact(row)])),
    });
  }
  return results;
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

module.exports = {
  openTrainingRun, listTrainingRuns, listCompletedRuns, trainingProgression,
  summarizeTrainingRun, trainingGamePage, exportTrainingRun,
  styleBenchmarkProgression,
};
