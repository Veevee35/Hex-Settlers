'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { atomicWriteJson } = require('./training-file');
const { PROFILES, runBenchmark, readBenchmark, createBenchmarkWorkers, promotionGate, cleanRun, directQualification, engineFingerprint } = require('./neural-benchmark');

const SELECTION_MAPS = ['classic', 'four_islands', 'fog_island', 'classic56_5p', 'classic56', 'eight_islands_78_7p', 'eight_islands_78'];
const SCREEN_GAMES = 100;
const MIN_SHORTLIST = 4;
const MAX_SHORTLIST = 8;
const INTERIM_GAMES = 250;

function rankScreen(a, b) {
  return Number(b.clean) - Number(a.clean) || b.wins - a.wins || a.meanPlace - b.meanPlace ||
    b.meanVp - a.meanVp || a.candidate - b.candidate;
}

async function benchmarkSelection({ directory, ...options }) {
  const workerPool = createBenchmarkWorkers(path.join(directory, 'benchmark-worker-data'));
  try { return await selectCandidates({ ...options, directory, workerPool }); }
  finally { workerPool.close(); }
}

async function selectCandidates({ candidates, champion, runId, generation, finalGeneration, settings, context, directory,
  signal, onProgress = () => {}, workerPool, output }) {
  const indexPath = path.join(directory, 'benchmark-index.json');
  let index = {};
  try { index = JSON.parse(await fs.readFile(indexPath, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const engineHash = await engineFingerprint();
  const progressive = settings.version >= 2;
  const shortlistSize = Math.min(MAX_SHORTLIST, Math.max(MIN_SHORTLIST, Math.ceil(candidates.length / 2)));
  const racing = progressive && candidates.length > shortlistSize;
  const seed = `evolution-v1:${settings.seed}:${generation}`;
  const evaluate = async (key, entry, opponent, games, purpose, { prefix, interim } = {}) => {
    signal?.throwIfAborted();
    const matchSeed = `${seed}:${purpose}`;
    const saved = index[key] && await readBenchmark(index[key], 'report', output);
    const reusable = saved?.engineHash === engineHash && saved.config.seed === matchSeed &&
      saved.config.games === games && saved.config.maxTurns === 1800;
    const report = reusable ? saved : await runBenchmark({
      candidate: entry, opponent, games, maps: SELECTION_MAPS, seed: matchSeed, signal, workerPool, output, prefix, interim,
      maxTurns: 1800,
      replay: purpose !== 'screen',
      context: { ...context, runId, generation, purpose, candidate: entry.index ?? null },
      onProgress: (done, total) => { if (done === total || done % 100 === 0) onProgress(key, done, total); },
    });
    if (report.engineHash !== engineHash) throw new Error('The benchmark engine changed during evaluation. Resume training to rerun the affected matches.');
    const matches = await readBenchmark(report.id, 'matches', output);
    if (matches.some(game => game.infrastructure)) throw new Error(`Infrastructure failure in ${key}. Resume to retry this benchmark with the same weights and seeds.`);
    if (!reusable) {
      index[key] = report.id;
      await atomicWriteJson(indexPath, index);
      if (report.stoppedEarly) onProgress(`${key} (early stop)`, matches.length, games);
    }
    return { report, matches };
  };
  const evaluateScreen = (key, candidate, games, prefix) => evaluate(key, candidate, champion, games, 'screen', { prefix });
  function screenResult(candidate, { report, matches }, stage) {
    const { games, wins, meanPlace, meanVp } = report.summary;
    return { candidate: candidate.index, report: report.id, stage, games, wins, meanPlace, meanVp,
      ...directQualification(matches), clean: cleanRun(matches) };
  }
  let screened = [];
  if (racing) {
    const firstPass = [];
    for (const candidate of candidates) {
      const prefix = await evaluateScreen(`screen-initial-${candidate.index}`, candidate, SELECTION_MAPS.length);
      firstPass.push({ candidate, prefix, result: screenResult(candidate, prefix, 'initial') });
    }
    firstPass.sort((a, b) => rankScreen(a.result, b.result));
    const finalists = firstPass.filter(row => row.result.clean).slice(0, shortlistSize);
    for (const { candidate, prefix } of finalists) {
      const full = await evaluateScreen(`screen-${candidate.index}`, candidate, SCREEN_GAMES, prefix);
      screened.push(screenResult(candidate, full, 'full'));
    }
    screened.sort(rankScreen);
    const advanced = new Set(finalists.map(row => row.candidate.index));
    screened.push(...firstPass.filter(row => !advanced.has(row.candidate.index)).map(row => row.result));
  } else {
    for (const candidate of candidates) {
      const full = await evaluateScreen(`screen-${candidate.index}`, candidate, SCREEN_GAMES);
      screened.push(screenResult(candidate, full, 'full'));
    }
    screened.sort(progressive ? rankScreen : (a, b) =>
      Number(b.clean) - Number(a.clean) || b.estimate - a.estimate || a.meanPlace - b.meanPlace || a.candidate - b.candidate);
  }
  const best = screened[0];
  // Carry plausible learning forward locally, while the promoted model stays
  // frozen. A weak or broken search branches back from the champion.
  const frontier = best.clean && best.estimate >= -0.02 ? best.candidate : null;
  const scheduledCheckpoint = finalGeneration || generation % 5 === 0;
  if (!best.clean || (best.estimate < 0.02 && !scheduledCheckpoint)) {
    return { frontier, promoted: null, screened, reasons: ['No clean screening candidate led the champion baseline by two percentage points.'] };
  }
  const candidate = candidates.find(entry => entry.index === best.candidate);
  const interim = progressive && !scheduledCheckpoint
    ? { games: INTERIM_GAMES, stop: matches => cleanRun(matches) && directQualification(matches).estimate < 0.005 }
    : undefined;
  const confirmation = await evaluate('confirm', candidate, champion, settings.games, 'confirmation', { interim });
  const direct = directQualification(confirmation.matches);
  const qualifying = {
    frontier, promoted: null, screened, confirmation: confirmation.report.id, direct,
    confirmationGames: confirmation.matches.length, confirmationStoppedEarly: !!confirmation.report.stoppedEarly,
  };
  if (confirmation.report.stoppedEarly) {
    return { ...qualifying, reasons: ['The optional confirmation stopped after its first rotation blocks showed less than a half-point lead.'] };
  }
  const integrity = cleanRun(confirmation.matches);
  if (!integrity || direct.high < 0) {
    return { ...qualifying, frontier: null, reasons: ['Qualification found a competitive regression or exceeded the match integrity limits. Training returns to the champion.'] };
  }
  if (direct.estimate < 0.02 || !(direct.low > 0)) {
    return { ...qualifying, reasons: ['The challenger missed the 99% champion threshold.'] };
  }
  const challengeReference = await evaluate('challenger-reference', candidate, 'rules', settings.games, 'reference');
  const championReference = await evaluate('champion-reference', champion, 'rules', settings.games, 'reference');
  const gate = promotionGate(confirmation.matches, challengeReference.matches, championReference.matches);
  return {
    ...qualifying, promoted: gate.promote ? candidate.index : null, reasons: gate.reasons,
    reference: { candidate: challengeReference.report.id, champion: championReference.report.id, matched: gate.reference },
  };
}

module.exports = { benchmarkSelection, SELECTION_MAPS, SCREEN_GAMES, QUALIFICATION_GAMES: PROFILES.checkpoint };
