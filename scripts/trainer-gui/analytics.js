'use strict';

const el = id => document.getElementById(id);
const count = value => Number.isFinite(value) ? value.toLocaleString() : '—';
const decimal = value => Number.isFinite(value) ? value.toFixed(2) : '—';
const date = value => value ? new Date(value).toLocaleString() : '—';
let summary;
let page = 1;
let runRequest = 0;
let gameRequest = 0;
const drawTrend = trainingProgression.chart(el('analytics-chart'));
const drawStyleTrend = trainingProgression.chart(el('style-chart'));
const drawStrengthTrend = trainingProgression.chart(el('strength-chart'));
let styleData;
let strengthData;
const pointsFormatter = new Intl.NumberFormat(undefined, {
  signDisplay: 'exceptZero', minimumFractionDigits: 1, maximumFractionDigits: 1,
});
const pointsLabel = value => Number.isFinite(value) ? `${pointsFormatter.format(value * 100)} pp` : '—';

async function get(endpoint, params = {}) {
  const response = await fetch(`/api/analytics/${endpoint}?${new URLSearchParams(params)}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Could not load training analytics');
  return data;
}

function option(text, value) {
  return new Option(text, String(value));
}

function row(values) {
  const tr = document.createElement('tr');
  for (const value of values) {
    const td = document.createElement('td');
    if (value instanceof Node) td.append(value);
    else td.textContent = value ?? '—';
    tr.append(td);
  }
  return tr;
}

function benchmarkLink(id, label = 'View benchmark') {
  const link = document.createElement('a');
  link.className = 'mini';
  link.href = `/benchmarks?${new URLSearchParams({ id })}`;
  link.textContent = label;
  return link;
}

function renderStrength() {
  const suite = el('strength-suite').value;
  const metric = el('strength-metric').value;
  const players = el('strength-players').value;
  const map = el('strength-map').value;
  el('strength-extra-column').textContent = metric === 'winsAboveEven' ? 'Mean victory points' : trainingProgression.metrics[metric].label;
  const checkpoints = strengthData.checkpoints.filter(entry => entry.suiteId === suite);
  const series = [];
  const rows = checkpoints.map((entry, index) => {
    const result = map ? entry.byScenario[map] : players ? entry.byPlayerCount[players] : entry.all;
    const interval = result?.winRate;
    const lift = interval?.estimate - result?.equalPolicyWinRate;
    if (entry.clean && result) {
      series.push({ generation: index + 1, ...result, winsAboveEven: 100 * lift,
        ...(metric === 'winsAboveEven' ? { low: 100 * (interval.low - result.equalPolicyWinRate), high: 100 * (interval.high - result.equalPolicyWinRate) } : {}),
      });
    }
    const range = Number.isFinite(lift)
      ? `${pointsLabel(lift)} (${pointsLabel(interval.low - result.equalPolicyWinRate)} to ${pointsLabel(interval.high - result.equalPolicyWinRate)})` : '—';
    return row([
      `#${index + 1} · ${date(entry.at)} · ${entry.model.slice(0, 8)}`, count(entry.trainedGames),
      result ? `${count(result.wins)} / ${count(result.games)}` : '—', count(result?.draws), range, decimal(result?.meanPlace),
      decimal(metric === 'winsAboveEven' ? result?.meanVp : result?.[metric]),
      benchmarkLink(entry.report, entry.clean ? 'View benchmark' : 'View match issues'),
    ]);
  });
  el('strength-rows').replaceChildren(...rows.reverse());
  const skipped = checkpoints.length - series.length;
  const measured = `${count(checkpoints.length)} measured checkpoint${checkpoints.length === 1 ? '' : 's'}`;
  el('strength-status').textContent = `${measured} · ${count(checkpoints[0].all.games)} games per suite · Baseline ${checkpoints[0].baseline.slice(0, 12)}. Vertical bars show the 95% interval around lift over equal-policy odds.${skipped ? ` ${skipped} excluded by the match integrity limits.` : ''}`;
  drawStrengthTrend(series, metric, undefined, { xLabel: 'Checkpoint', reference: metric === 'winsAboveEven' ? 0 : undefined });
}

function updateStrengthMaps() {
  const playerCount = el('strength-players').value;
  const selected = el('strength-map').value;
  const maps = strengthData.scenarios.filter(scenario => !playerCount || scenario.players === Number(playerCount))
    .sort((a, b) => a.players - b.players || a.label.localeCompare(b.label));
  el('strength-map').replaceChildren(option('All scenarios', ''), ...maps.map(scenario =>
    option(`${scenario.label} · ${scenario.players} players`, scenario.id)));
  if (maps.some(scenario => scenario.id === selected)) el('strength-map').value = selected;
  renderStrength();
}

async function loadStrength() {
  try {
    strengthData = await get('strength');
    const { checkpoints, scenarios } = strengthData;
    if (!checkpoints.length) {
      el('strength-status').textContent = 'The first champion measurement appears after a generation completes in a new competitive run.';
      el('strength-results').hidden = true;
      return;
    }
    const suite = el('strength-suite').value;
    const players = el('strength-players').value;
    const suites = new Map(checkpoints.map(entry => [entry.suiteId, entry]));
    el('strength-suite').replaceChildren(...Array.from(suites.values()).sort((a, b) => b.at.localeCompare(a.at)).map(entry =>
      option(`${date(entry.at)} · Engine ${entry.engineHash.slice(0, 8)}`, entry.suiteId)));
    if (suites.has(suite)) el('strength-suite').value = suite;
    const counts = [...new Set(scenarios.map(scenario => scenario.players))].sort((a, b) => a - b);
    el('strength-players').replaceChildren(option('All player counts', ''), ...counts.map(n => option(`${n} players`, n)));
    el('strength-players').value = players;
    el('strength-results').hidden = false;
    updateStrengthMaps();
    if (location.hash === '#champion-progress') el('champion-progress').scrollIntoView();
  } catch (error) {
    el('strength-status').textContent = error.message;
  }
}

function generationDecision(selection) {
  const evaluation = selection.evaluation;
  if (!evaluation) return 'Self-play selection';
  if (evaluation.promoted) return 'Champion promoted';
  if (evaluation.resetToChampion) return 'Reset to champion';
  return evaluation.frontier ? 'Training continued' : 'Checkpoint retained';
}

function detailList(list, data) {
  list.replaceChildren();
  for (const [key, value] of Object.entries(data)) {
    const term = document.createElement('dt');
    const definition = document.createElement('dd');
    const label = key.replace(/([a-z])([A-Z])/g, '$1 $2');
    term.textContent = label[0].toUpperCase() + label.slice(1);
    if (value && typeof value === 'object') {
      const pre = document.createElement('pre');
      pre.textContent = JSON.stringify(value, null, 2);
      definition.append(pre);
    } else {
      definition.textContent = value ?? '—';
    }
    list.append(term, definition);
  }
}

function matchDetails(game) {
  const button = document.createElement('button');
  button.className = 'mini';
  button.textContent = 'View';
  button.type = 'button';
  button.setAttribute('aria-label', `View game ${game.curriculumIndex + 1}`);
  button.addEventListener('click', () => {
    el('match-title').textContent = `Game ${count(game.curriculumIndex + 1)} · ${game.mapLabel || game.mapId}`;
    detailList(el('match-fields'), game);
    el('match-dialog').showModal();
  });
  return button;
}

function renderCandidates(candidates, generation) {
  const selection = summary.selections[generation - 1];
  el('candidates').replaceChildren(...candidates.map(candidate => {
    const details = document.createElement('details');
    const title = document.createElement('summary');
    const description = document.createElement('dl');
    title.textContent = `Candidate ${candidate.candidate}${selection.selectedCandidate === candidate.candidate ? ' · Selected' : ''}`;
    const result = selection.candidates?.find(entry => entry.candidate === candidate.candidate);
    detailList(description, { ...candidate, score: result?.score, priorities: result?.priorities });
    details.append(title, description);
    return details;
  }));
}

function renderScenarios() {
  const sort = el('scenario-sort').value;
  const maps = [...summary.maps];
  if (sort === 'games') maps.sort((a, b) => b.games - a.games);
  if (sort === 'turns') maps.sort((a, b) => b.averageTurns - a.averageTurns);
  if (sort === 'fallbacks') maps.sort((a, b) => b.replacements - a.replacements);
  el('scenarios').replaceChildren(...maps.map(map => row([
    map.label, map.players, count(map.games), decimal(map.averageTurns), `${map.quickest}–${map.longest}`,
    decimal(map.averageMargin), count(map.gold), count(map.replacements),
  ])));
}

function renderStyleOptions() {
  const count = Number(el('style-players').value);
  const selected = el('style-scenario').value;
  const scenarios = new Map(summary.maps.map(map => [map.mapId, { label: map.label, players: map.players }]));
  for (const map of styleData?.scenarios || []) scenarios.set(map.id, map);
  el('style-scenario').replaceChildren(option('All scenarios', ''),
    ...[...scenarios.entries()].filter(([, map]) => !count || count === map.players)
      .sort(([, a], [, b]) => a.label.localeCompare(b.label) || a.players - b.players)
      .map(([id, map]) => option(`${map.label} · ${map.players} players`, id)));
  if ([...el('style-scenario').options].some(item => item.value === selected)) el('style-scenario').value = selected;
  renderStyles();
}

function renderStyles() {
  const countFilter = el('style-players').value;
  const map = el('style-scenario').value;
  const metric = el('style-metric').value;
  const group = item => map ? item?.byScenario?.[map] : countFilter ? item?.byPlayerCount?.[countFilter] : item?.all;
  const entries = styleData?.benchmarks || [];
  const fixed = entries.filter(entry => entry.kind === 'fixed');
  const series = fixed.length ? fixed : entries;
  const byGen = new Map(series.map(entry => [entry.generation, entry]));
  const seats = Number(countFilter) || styleData?.scenarios.find(item => item.id === map)?.players ||
    summary.maps.find(item => item.mapId === map)?.players;
  const percent = value => Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : '—';
  const percentage = value => Number.isFinite(value) ? 100 * value : null;
  const points = (summary.styleTraining || []).map(gen => {
    const training = group(gen);
    const report = byGen.get(gen.generation);
    const benchmark = group(report);
    const rate = benchmark?.winRate?.estimate;
    const even = benchmark?.equalPolicyWinRate ?? (seats ? 1 / seats : null);
    return { generation: gen.generation, report, benchmark, training, even,
      winRate: percentage(rate), meanPlace: benchmark?.meanPlace,
      winsAboveEven: Number.isFinite(rate) && Number.isFinite(even) ? 100 * (rate - even) : null,
      trainingGames: training?.games, trainingDecisions: training?.decisions };
  });
  el('style-results').replaceChildren(...points.slice().reverse().map(point => {
    const { generation, report, benchmark, training, even } = point;
    const link = document.createElement('a');
    if (benchmark) {
      link.href = `/benchmarks?${new URLSearchParams({ id: report.id })}`;
      link.className = 'mini';
      link.textContent = report.early ? 'Early confirmation' : report.kind === 'fixed' ? 'Fixed reference' : 'Champion check';
    }
    return row([generation, count(training?.games), count(training?.decisions), benchmark ? link : '—',
      benchmark ? `${count(benchmark.wins)} / ${count(benchmark.games)}` : '—',
      benchmark ? `${percent(benchmark.winRate.estimate)} (${percent(benchmark.winRate.low)} to ${percent(benchmark.winRate.high)})` : '—',
      benchmark ? percent(even) : '—', decimal(benchmark?.meanPlace)]);
  }));
  drawStyleTrend(points, metric);
  const recorded = points.filter(point => point.benchmark).length;
  const revisions = new Set(series.map(entry => entry.engineHash).filter(Boolean)).size;
  el('style-status').textContent = !styleData ? 'Loading benchmark history…' : !recorded
    ? 'This play style has no benchmark results in the selected run.'
    : fixed.length ? `${count(recorded)} ${recorded === 1 ? 'generation' : 'generations'} measured against the starting model on the same seeded boards and seats.${revisions > 1 ? ` This run spans ${revisions} engine revisions.` : ''}`
      : `${count(recorded)} archived champion checks. The champion and board seeds can vary across generations.`;
}

function renderTrend() {
  const metric = el('chart-metric').value;
  const generation = Number(el('generation').value);
  const history = summary.selections.map(selection => {
    const work = selection.work;
    return {
      ...selection, trainingGames: selection.games, continuedGames: work?.continuedGames,
      trainingDecisions: work?.decisionSamples ?? selection.candidates?.reduce((sum, candidate) => sum + (candidate.policyDecisions || 0), 0),
      anchorLift: work?.scoredAnchorGames ? 100 * (work.anchorWins - work.anchorExpectedWins) / work.scoredAnchorGames : null,
    };
  });
  const change = trainingProgression.compare(history, metric);
  const value = history[generation - 1]?.[metric];
  el('trend-value').textContent = `Gen ${generation} · ${trainingProgression.metrics[metric].label} ${decimal(value)}`;
  el('trend-change').textContent = change === '—' ? '' : `${change} from first to latest generation`;
  drawTrend(history, metric, generation, { reference: metric === 'anchorLift' ? 0 : undefined });
}

function generationLink(selection) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'mini';
  button.textContent = `Gen ${selection.generation}`;
  button.setAttribute('aria-label', `Explore matches in generation ${selection.generation}`);
  button.addEventListener('click', () => {
    el('generation').value = String(selection.generation);
    page = 1;
    void loadGames();
    el('match-explorer-title').focus();
  });
  return button;
}

async function loadGames() {
  const request = ++gameRequest;
  const generation = Number(el('generation').value);
  const selection = summary.selections[generation - 1];
  renderTrend();
  const evaluation = selection.evaluation;
  const status = el('benchmark-evaluation');
  status.hidden = !evaluation;
  if (evaluation) {
    const promoted = evaluation.promoted === selection.pooledCandidate?.candidate
      ? 'the pooled checkpoint' : `candidate ${evaluation.promoted}`;
    const decision = evaluation.promoted ? `Champion promoted from ${promoted}.` : `${generationDecision(selection)}.`;
    const reason = evaluation.reasons?.join(' ') || '';
    const link = document.createElement('a');
    link.className = 'mini';
    link.href = `/benchmarks?${new URLSearchParams({ id: evaluation.confirmation || evaluation.frontierCheck?.report || evaluation.screened[0].report })}`;
    link.textContent = evaluation.confirmationStoppedEarly ? 'View early confirmation' :
      evaluation.confirmation ? 'View qualification' : evaluation.frontierCheck ? 'View checkpoint comparison' : 'View leading screening result';
    status.replaceChildren(`${decision} ${reason} `, link);
    if (evaluation.frontierSafety) status.append(' ', benchmarkLink(evaluation.frontierSafety.report, 'View regression check'));
    if (evaluation.championProgress?.report) status.append(' ', benchmarkLink(evaluation.championProgress.report, 'View champion measurement'));
    if (evaluation.championProgress?.error) status.append(' ', 'Champion measurement could not complete.');
  }
  el('candidate-results').replaceChildren(...(selection.candidates || []).map(candidate => row([
    candidate.candidate === selection.selectedCandidate ? `Candidate ${candidate.candidate} · Selected` : `Candidate ${candidate.candidate}`,
    count(candidate.games), decimal(candidate.score), decimal(candidate.averageVictoryTurn),
    decimal(candidate.averageWinnerMargin),
  ])));
  if (selection.pooledCandidate) {
    const { candidate, sources, games } = selection.pooledCandidate;
    const selected = candidate === selection.selectedCandidate ? ' · Selected' : '';
    el('candidate-results').append(row([`Pooled checkpoint (${sources.join(', ')})${selected}`, count(games), '—', '—', '—']));
  }
  el('previous').disabled = el('next').disabled = true;
  el('game-status').textContent = 'Loading matches…';
  try {
    const data = await get('games', {
      run: summary.id, generation, candidate: el('candidate').value, map: el('map').value, page,
    });
    if (request !== gameRequest) return;
    renderCandidates(data.candidates, generation);
    el('games').replaceChildren(...data.games.map(game => row([
      count(game.curriculumIndex + 1), game.candidate,
      game.requestedMapId ? `${game.mapLabel || game.mapId} (fallback)` : game.mapLabel || game.mapId,
      game.players, game.turnNumber, game.winner, `${game.winnerVp}–${game.highestOpponentVp}`,
      game.winnerMargin, game.goldProductionCards, matchDetails(game),
    ])));
    const offset = (page - 1) * data.gamesPerPage;
    el('game-status').textContent = data.total
      ? `${count(offset + 1)}–${count(offset + data.games.length)} of ${count(data.total)} matches`
      : 'No matches for these filters.';
    el('previous').disabled = page <= 1;
    el('next').disabled = offset + data.games.length >= data.total;
  } catch (error) {
    if (request !== gameRequest) return;
    el('games').replaceChildren();
    el('candidates').replaceChildren();
    el('game-status').textContent = error.message;
  }
}

async function loadRun() {
  const request = ++runRequest;
  ++gameRequest;
  const run = el('run').value;
  const sameRun = summary?.id === run;
  const previousGeneration = Number(el('generation').value);
  const followLatest = !sameRun || previousGeneration === summary.selections.length;
  const candidate = sameRun ? el('candidate').value : '0';
  const mapId = sameRun ? el('map').value : '';
  el('results').hidden = el('export').hidden = true;
  el('run-status').textContent = 'Loading run…';
  try {
    const data = await get('summary', { run });
    if (request !== runRequest) return;
    summary = data;
    styleData = null;
    history.replaceState(null, '', `/analytics?${new URLSearchParams({ run })}${location.hash}`);
    if (!data.selections.length) {
      el('run-status').textContent = 'Waiting for the first generation to select a model. Refresh results to check for new selections.';
      return;
    }
    el('export').href = `/api/analytics/download?${new URLSearchParams({ run })}`;
    el('export').textContent = data.completedAt ? 'Download full JSON' : 'Download completed generations';
    el('export').hidden = false;
    const totalGenerations = data.manifest.totalGames / data.manifest.generationGames;
    const state = data.completedAt ? `Completed ${date(data.completedAt)}` : `${count(data.selections.length)} of ${count(totalGenerations)} generations selected`;
    const source = data.manifest.learningStart?.run;
    el('run-status').textContent = `Started ${date(data.manifest.createdAt)} · ${state} · ${data.manifest.rules || 'JavaScript'} rules${source ? ` · Learning continued from ${source}` : ''}`;
    el('game-count').textContent = count(data.games);
    el('replacements').textContent = `${count(data.replacements)} fallback games · ${(100 * data.replacements / data.games).toFixed(1)}%`;
    el('map-count').textContent = `${count(data.maps.length)} scenarios played`;
    const { work } = data;
    el('run-decisions').textContent = count(work.decisionSamples);
    el('run-anchored').textContent = count(work.anchoredGames);
    el('run-anchor-lift').textContent = work.scoredAnchorGames
      ? `${pointsLabel((work.anchorWins - work.anchorExpectedWins) / work.scoredAnchorGames)} vs even odds in training` : '';
    el('run-promotions').textContent = count(data.selections.filter(selection => selection.evaluation?.promoted).length);
    const learning = data.selections.at(-1).work;
    el('run-learning').textContent = learning ? `${count(learning.learningModelGames)} games in learning checkpoint` : '';
    renderScenarios();
    el('selections').replaceChildren(...data.selections.slice().reverse().map(selection => row([
      generationLink(selection), selection.selectedCandidate === selection.pooledCandidate?.candidate
        ? 'Pooled checkpoint' : selection.selectedCandidate ? `Candidate ${selection.selectedCandidate}` : '—',
      count(selection.work?.continuedGames), pointsLabel(selection.evaluation?.screened?.[0]?.estimate),
      selection.evaluation?.confirmationStoppedEarly ? 'Stopped early' : pointsLabel(selection.evaluation?.direct?.estimate),
      generationDecision(selection),
    ])));
    el('generation').replaceChildren(...data.selections.map(selection => option(`Generation ${selection.generation}`, selection.generation)));
    el('candidate').replaceChildren(option('All candidates', 0),
      ...Array.from({ length: data.manifest.shards }, (_, index) => option(`Candidate ${index + 1}`, index + 1)));
    el('map').replaceChildren(option('All scenarios', ''), ...data.maps.map(map =>
      option(map.players ? `${map.label} · ${map.players} players` : map.label, map.mapId)));
    const generation = followLatest ? data.selections.at(-1).generation : previousGeneration;
    el('generation').value = String(generation);
    el('candidate').value = candidate;
    el('map').value = data.maps.some(map => map.mapId === mapId) ? mapId : '';
    el('results').hidden = false;
    renderStyleOptions();
    if (!sameRun && location.hash === '#style-progression') el('style-progression').scrollIntoView();
    void get('styles', { run }).then(styles => {
      if (request !== runRequest) return;
      styleData = styles;
      renderStyleOptions();
    }).catch(error => {
      if (request === runRequest) el('style-status').textContent = error.message;
    });
    if (!sameRun || generation !== previousGeneration) page = 1;
    await loadGames();
  } catch (error) {
    if (request === runRequest) el('run-status').textContent = error.message;
  }
}

async function loadRuns(selected) {
  const refresh = el('refresh-run');
  refresh.disabled = true;
  el('run').disabled = true;
  try {
    const runs = await get('runs');
    if (!runs.length) {
      el('run-status').textContent = 'Training runs will appear here.';
      return;
    }
    el('run').replaceChildren(...runs.map(run => option(
      `${count(run.games)} games · ${run.completedAt ? date(run.completedAt) : `${run.generations}/${run.totalGenerations} generations`} · ${run.id.split('-').at(-1)}`, run.id,
    )));
    if (runs.some(run => run.id === selected)) el('run').value = selected;
    el('run').disabled = false;
    await loadRun();
  } catch (error) {
    el('run-status').textContent = error.message;
  } finally {
    refresh.disabled = false;
    el('run').disabled = !el('run').options.length;
  }
}

el('run').addEventListener('change', loadRun);
el('refresh-run').addEventListener('click', () => {
  void loadRuns(el('run').value);
  void loadStrength();
});
el('strength-players').addEventListener('change', updateStrengthMaps);
for (const id of ['strength-suite', 'strength-map', 'strength-metric']) el(id).addEventListener('change', renderStrength);
el('chart-metric').addEventListener('change', renderTrend);
el('scenario-sort').addEventListener('change', renderScenarios);
el('style-players').addEventListener('change', renderStyleOptions);
el('style-scenario').addEventListener('change', renderStyles);
el('style-metric').addEventListener('change', renderStyles);
for (const id of ['generation', 'candidate', 'map']) {
  el(id).addEventListener('change', () => { page = 1; void loadGames(); });
}
el('previous').addEventListener('click', () => { page--; void loadGames(); });
el('next').addEventListener('click', () => { page++; void loadGames(); });
void loadRuns(new URLSearchParams(location.search).get('run'));
void loadStrength();
