'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { atomicWriteJson } = require('./training-file');
const { PROFILES, SCENARIOS, runBenchmark, readBenchmark, createBenchmarkWorkers, promotionGate, cleanRun, directQualification, engineFingerprint } = require('./neural-benchmark');
const { auditChampion } = require('./champion-progress');

const SELECTION_MAPS = ['classic', 'four_islands', 'fog_island', 'classic56_5p', 'classic56', 'eight_islands_78_7p', 'eight_islands_78'];
const LEARNING_SELECTION_MAPS = ['classic_2p', 'fog_island_3p', 'classic', 'four_islands',
  'classic56_5p', 'six_islands', 'fog_island_78_7p', 'classic78', 'eight_islands_78'];
const SCREEN_GAMES = 100;
const MIN_SHORTLIST = 4;
const MAX_SHORTLIST = 8;
const INTERIM_GAMES = 250;
const VERIFIED_SCREEN_GAMES = 250;
const VERIFIED_INITIAL_GAMES = 100;
const VERIFIED_INTERIM_GAMES = 1000;
const FRONTIER_WATCH_LEAD = -0.04;
const FRONTIER_REGRESSION = -0.02;
const policyId = file => fs.readFile(file).then(bytes => createHash('sha256').update(bytes).digest('hex'));

function rankScreen(a, b) {
  return Number(b.clean) - Number(a.clean) || b.wins - a.wins || a.meanPlace - b.meanPlace ||
    b.meanVp - a.meanVp || a.candidate - b.candidate;
}

function learningCheckpoint(screened, pooledIndex) {
  const eligible = screened.filter(row => row.stage === 'full' && row.clean);
  return eligible.find(row => row.candidate === pooledIndex) ||
    eligible.reduce((first, row) => !first || row.candidate < first.candidate ? row : first, null);
}

async function benchmarkSelection({ directory, ...options }) {
  const workerPool = createBenchmarkWorkers(path.join(directory, 'benchmark-worker-data'));
  try {
    const result = await selectCandidates({ ...options, directory, workerPool });
    if (options.styleReference) {
      const candidate = options.candidates.find(row => row.index === (result.promoted ?? result.frontier)) ||
        (!result.resetToChampion && options.settings.version >= 3 && options.incumbent) || options.champion;
      result.styleTracking = await trackPlayStyles({ ...options, candidate, directory, workerPool });
    }
    if (options.settings.version >= 4) {
      const promoted = options.candidates.find(row => row.index === result.promoted);
      const audit = candidate => auditChampion({ ...options, candidate, workerPool });
      try {
        if (promoted && options.generation === 1) await audit(options.champion);
        const measurement = await audit(promoted || options.champion);
        const { report, model, suiteId, clean, reused } = measurement;
        result.championProgress = { report, model, suiteId, clean, reused: !!reused };
      } catch (error) {
        options.signal?.throwIfAborted();
        result.championProgress = { error: error.message };
      }
    }
    return result;
  }
  finally { workerPool.close(); }
}

async function trackPlayStyles({ candidate, styleReference, settings, runId, generation, directory, workerPool,
  output, context, signal, onProgress = () => {} }) {
  const maps = SCENARIOS.map(map => map.id);
  const games = SCENARIOS.reduce((total, map) => total + map.players, 0) * (settings.styleRotations || 2);
  const seed = `style-progress-v1:${settings.seed}`;
  const [candidateId, referenceId, engineHash] = await Promise.all([
    policyId(candidate.file), policyId(styleReference.file), engineFingerprint(),
  ]);
  const indexPath = path.join(directory, 'style-benchmark.json');
  const prior = path.join(path.dirname(directory), `generation-${String(generation - 1).padStart(2, '0')}`, 'style-benchmark.json');
  for (const file of generation > 1 ? [indexPath, prior] : [indexPath]) {
    try {
      const { report: id } = JSON.parse(await fs.readFile(file, 'utf8'));
      const report = await readBenchmark(id, 'report', output);
      if (report.engineHash === engineHash && report.candidate.id === candidateId && report.opponent.id === referenceId &&
          report.config.seed === seed && report.config.games === games && !report.summary.outcomes?.crashed &&
          JSON.stringify(report.config.maps) === JSON.stringify(maps)) {
        const reused = { report: id, games: report.summary.games, reused: report.context.generation !== generation };
        if (file !== indexPath) await atomicWriteJson(indexPath, reused);
        return reused;
      }
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const report = await runBenchmark({
    candidate, opponent: styleReference, maps, games, seed, maxTurns: 1800, replay: false, workerPool, output, signal,
    legacyVictoryTargets: settings.version < 4,
    context: { ...context, runId, generation, purpose: 'style-progression', candidate: candidate.index ?? null },
    onProgress: (done, total) => { if (done === total || done % 100 === 0) onProgress('play styles', done, total); },
  });
  const record = { report: report.id, games: report.summary.games };
  // Tracking failures are visible as incomplete games. Qualification uses
  // independent matches, so a tracking issue cannot change promotion.
  await atomicWriteJson(indexPath, record);
  return record;
}

async function selectCandidates({ candidates, champion, incumbent, runId, generation, finalGeneration, settings, context, directory,
  signal, onProgress = () => {}, workerPool, output }) {
  const indexPath = path.join(directory, 'benchmark-index.json');
  let index = {};
  try { index = JSON.parse(await fs.readFile(indexPath, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const engineHash = await engineFingerprint();
  const progressive = settings.version >= 2;
  const verified = settings.version >= 3;
  const accumulate = settings.version >= 4;
  const selectionMaps = accumulate ? LEARNING_SELECTION_MAPS : SELECTION_MAPS;
  const pooledIndex = candidates.find(entry => entry.pooled)?.index;
  const screenGames = verified ? VERIFIED_SCREEN_GAMES : SCREEN_GAMES;
  const shortlistSize = Math.min(MAX_SHORTLIST, Math.max(MIN_SHORTLIST, Math.ceil(candidates.length / 2)));
  const racing = progressive && candidates.length > shortlistSize;
  const seed = `evolution-v1:${settings.seed}:${generation}`;
  const evaluate = async (key, entry, opponent, games, purpose, { prefix, interim } = {}) => {
    signal?.throwIfAborted();
    const matchSeed = `${seed}:${purpose}`;
    const saved = index[key] && await readBenchmark(index[key], 'report', output);
    const reusable = saved?.engineHash === engineHash && saved.config.seed === matchSeed &&
      saved.config.games === games && saved.config.maxTurns === 1800 &&
      JSON.stringify(saved.config.maps) === JSON.stringify(selectionMaps) &&
      saved.candidate.id === await policyId(entry.file) &&
      saved.opponent.id === (typeof opponent === 'string' ? opponent : await policyId(opponent.file));
    const report = reusable ? saved : await runBenchmark({
      candidate: entry, opponent, games, maps: selectionMaps, seed: matchSeed, signal, workerPool, output, prefix, interim,
      maxTurns: 1800,
      legacyVictoryTargets: !accumulate,
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
      const prefix = await evaluateScreen(`screen-initial-${candidate.index}`, candidate,
        verified ? VERIFIED_INITIAL_GAMES : SELECTION_MAPS.length);
      firstPass.push({ candidate, prefix, result: screenResult(candidate, prefix, 'initial') });
    }
    firstPass.sort((a, b) => rankScreen(a.result, b.result));
    const eligible = firstPass.filter(row => row.result.clean);
    const pooled = accumulate && eligible.find(row => row.candidate.index === pooledIndex);
    const finalists = pooled ? [pooled, ...eligible.filter(row => row !== pooled).slice(0, shortlistSize - 1)] :
      eligible.slice(0, shortlistSize);
    for (const { candidate, prefix } of finalists) {
      const full = await evaluateScreen(`screen-${candidate.index}`, candidate, screenGames, prefix);
      screened.push(screenResult(candidate, full, 'full'));
    }
    screened.sort(rankScreen);
    const advanced = new Set(finalists.map(row => row.candidate.index));
    screened.push(...firstPass.filter(row => !advanced.has(row.candidate.index)).map(row => row.result));
  } else {
    for (const candidate of candidates) {
      const full = await evaluateScreen(`screen-${candidate.index}`, candidate, screenGames);
      screened.push(screenResult(candidate, full, 'full'));
    }
    screened.sort(progressive ? rankScreen : (a, b) =>
      Number(b.clean) - Number(a.clean) || b.estimate - a.estimate || a.meanPlace - b.meanPlace || a.candidate - b.candidate);
  }
  const learner = accumulate ? learningCheckpoint(screened, pooledIndex) : null;
  // Older runs used their screening result to choose the next training seed.
  let frontier = learner?.candidate ?? (!verified && best.clean && best.estimate >= -0.02 ? best.candidate : null);
  let frontierSafety;
  if (learner?.estimate < FRONTIER_WATCH_LEAD) {
    const entry = candidates.find(row => row.index === learner.candidate);
    const check = await evaluate('frontier-safety', entry, champion, settings.games, 'frontier-safety');
    const direct = directQualification(check.matches);
    const resetToChampion = !cleanRun(check.matches) || direct.high < FRONTIER_REGRESSION;
    frontierSafety = { report: check.report.id, direct, games: check.matches.length, resetToChampion };
    if (resetToChampion) frontier = null;
  }
  const continuation = () => ({
    frontier, promoted: null, screened,
    ...(frontierSafety ? { frontierSafety, resetToChampion: frontierSafety.resetToChampion } : {}),
  });
  const best = screened.find(row => (!accumulate || row.stage === 'full') &&
    (!frontierSafety?.resetToChampion || row.candidate !== learner.candidate));
  const scheduledCheckpoint = finalGeneration || generation % 5 === 0;
  if (!best?.clean || (best.estimate < 0.02 && !scheduledCheckpoint)) {
    const reason = best?.clean ? 'No screening candidate led the champion baseline by two percentage points.' :
      'No screening candidate met the match integrity limits.';
    return { ...continuation(), reasons: [reason] };
  }
  const candidate = candidates.find(entry => entry.index === best.candidate);
  const interim = progressive && !scheduledCheckpoint
    ? { games: verified ? VERIFIED_INTERIM_GAMES : INTERIM_GAMES,
      stop: matches => cleanRun(matches) && directQualification(matches).estimate < 0.005 }
    : undefined;
  let frontierCheck;
  if (verified && !accumulate && incumbent) {
    const check = await evaluate('confirm-frontier', candidate, incumbent, settings.games, 'frontier-confirmation', { interim });
    const direct = directQualification(check.matches, 1.96);
    frontierCheck = { report: check.report.id, direct, games: check.matches.length, stoppedEarly: check.report.stoppedEarly };
    if (check.report.stoppedEarly || !cleanRun(check.matches) || !(direct.low > 0)) {
      return { frontier, promoted: null, screened, frontierCheck,
        reasons: ['Independent games did not establish an improvement over the previous checkpoint.'] };
    }
    frontier = candidate.index;
  }
  const confirmation = await evaluate('confirm', candidate, champion, settings.games, 'confirmation', { interim });
  const direct = directQualification(confirmation.matches);
  const integrity = cleanRun(confirmation.matches);
  if (verified && !accumulate && !incumbent && integrity && !confirmation.report.stoppedEarly &&
      directQualification(confirmation.matches, 1.96).low > 0) frontier = candidate.index;
  const qualifying = {
    ...continuation(), confirmation: confirmation.report.id, direct,
    confirmationGames: confirmation.matches.length, confirmationStoppedEarly: !!confirmation.report.stoppedEarly,
    ...(frontierCheck ? { frontierCheck } : {}),
  };
  if (confirmation.report.stoppedEarly) {
    return { ...qualifying, reasons: ['The optional confirmation stopped after its first rotation blocks showed less than a half-point lead.'] };
  }
  if (!integrity || direct.high < 0) {
    const reason = 'Qualification found a competitive regression or exceeded the match integrity limits.';
    if (accumulate) {
      const rejectLearner = candidate.index === frontier && (!integrity || direct.high < FRONTIER_REGRESSION);
      return { ...qualifying, ...(rejectLearner ? { frontier: null, resetToChampion: true } : {}), reasons: [reason] };
    }
    return { ...qualifying, frontier: null, reasons: [verified ? reason : `${reason} Training returns to the champion.`] };
  }
  if (direct.estimate < 0.02 || !(direct.low > 0)) {
    return { ...qualifying, reasons: ['The challenger missed the 99% champion threshold.'] };
  }
  const challengeReference = await evaluate('challenger-reference', candidate, 'rules', settings.games, 'reference');
  const championReference = await evaluate('champion-reference', champion, 'rules', settings.games, 'reference');
  const gate = promotionGate(confirmation.matches, challengeReference.matches, championReference.matches);
  const rejectLearner = accumulate && !gate.promote && candidate.index === frontier;
  return {
    ...qualifying, promoted: gate.promote ? candidate.index : null, reasons: gate.reasons,
    ...(rejectLearner ? { frontier: null, resetToChampion: true } : {}),
    reference: { candidate: challengeReference.report.id, champion: championReference.report.id, matched: gate.reference },
  };
}

module.exports = { benchmarkSelection, learningCheckpoint, SELECTION_MAPS, SCREEN_GAMES, QUALIFICATION_GAMES: PROFILES.checkpoint };
