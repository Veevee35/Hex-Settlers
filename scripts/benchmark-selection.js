'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { atomicWriteJson } = require('./training-file');
const { PROFILES, runBenchmark, readBenchmark, promotionGate, cleanRun, directQualification, engineFingerprint } = require('./neural-benchmark');

const SELECTION_MAPS = ['classic', 'four_islands', 'fog_island', 'classic56_5p', 'classic56', 'eight_islands_78_7p', 'eight_islands_78'];
const SCREEN_GAMES = 100;

async function benchmarkSelection({ candidates, champion, runId, generation, finalGeneration, settings, context, directory, signal, onProgress }) {
  const indexPath = path.join(directory, 'benchmark-index.json');
  let index = {};
  try { index = JSON.parse(await fs.readFile(indexPath, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const engineHash = await engineFingerprint();
  const seed = `evolution-v1:${settings.seed}:${generation}`;
  const evaluate = async (key, entry, opponent, games, purpose) => {
    signal?.throwIfAborted();
    const matchSeed = `${seed}:${purpose}`;
    const saved = index[key] && await readBenchmark(index[key], 'report');
    const reusable = saved?.engineHash === engineHash && saved.config.seed === matchSeed &&
      saved.config.games === games && saved.config.maxTurns === 1800;
    const report = reusable ? saved : await runBenchmark({
      candidate: entry, opponent, games, maps: SELECTION_MAPS, seed: matchSeed, signal,
      maxTurns: 1800,
      replay: purpose !== 'screen',
      context: { ...context, runId, generation, purpose, candidate: entry.index ?? null },
      onProgress: (done, total) => { if (done === total || done % 100 === 0) onProgress(key, done, total); },
    });
    if (report.engineHash !== engineHash) throw new Error('The benchmark engine changed during evaluation. Resume training to rerun the affected matches.');
    if (!reusable) {
      index[key] = report.id;
      await atomicWriteJson(indexPath, index);
    }
    return { report, matches: await readBenchmark(report.id, 'matches') };
  };
  const screened = [];
  for (const candidate of candidates) {
    const screen = await evaluate(`screen-${candidate.index}`, candidate, champion, SCREEN_GAMES, 'screen');
    screened.push({
      candidate: candidate.index, report: screen.report.id,
      ...directQualification(screen.matches),
      clean: cleanRun(screen.matches), meanPlace: screen.report.summary.meanPlace,
    });
  }
  screened.sort((a, b) => Number(b.clean) - Number(a.clean) || b.estimate - a.estimate || a.meanPlace - b.meanPlace || a.candidate - b.candidate);
  const best = screened[0];
  // Carry plausible learning forward locally, while the promoted model stays
  // frozen. A weak or broken search branches back from the champion.
  const frontier = best.clean && best.estimate >= -0.02 ? best.candidate : null;
  const scheduledCheckpoint = finalGeneration || generation % 5 === 0;
  if (!best.clean || (best.estimate < 0.02 && !scheduledCheckpoint)) {
    return { frontier, promoted: null, screened, reasons: ['No clean screening candidate led the champion baseline by two percentage points.'] };
  }
  const candidate = candidates.find(entry => entry.index === best.candidate);
  const confirmation = await evaluate('confirm', candidate, champion, settings.games, 'confirmation');
  const direct = directQualification(confirmation.matches);
  const qualifying = {
    frontier, promoted: null, screened, confirmation: confirmation.report.id, direct,
  };
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
