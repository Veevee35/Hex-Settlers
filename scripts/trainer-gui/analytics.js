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
let styleData;

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
  const selection = summary.selections[generation - 1];
  const change = trainingProgression.compare(summary.selections, metric);
  el('trend-value').textContent = `Gen ${generation} · ${trainingProgression.metrics[metric].label} ${decimal(selection[metric])}`;
  el('trend-change').textContent = change === '—' ? 'Generation 1 is the baseline' : `${change} from first to latest generation`;
  drawTrend(summary.selections, metric, generation);
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
    const decision = evaluation.promoted ? `Champion promoted from candidate ${evaluation.promoted}.` : 'Champion retained.';
    const reason = evaluation.reasons?.join(' ') || '';
    const link = document.createElement('a');
    link.className = 'mini';
    link.href = `/benchmarks?${new URLSearchParams({ id: evaluation.confirmation || evaluation.screened[0].report })}`;
    link.textContent = evaluation.confirmationStoppedEarly ? 'View early confirmation' :
      evaluation.confirmation ? 'View qualification' : 'View leading screening result';
    status.replaceChildren(`${decision} ${reason} `, link);
  }
  el('candidate-results').replaceChildren(...(selection.candidates || []).map(candidate => row([
    candidate.candidate === selection.selectedCandidate ? `Candidate ${candidate.candidate} · Selected` : `Candidate ${candidate.candidate}`,
    count(candidate.games), decimal(candidate.score), decimal(candidate.averageVictoryTurn),
    decimal(candidate.averageWinnerMargin),
  ])));
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
    el('run-status').textContent = `Started ${date(data.manifest.createdAt)} · ${state} · ${data.manifest.rules || 'JavaScript'} rules`;
    el('game-count').textContent = count(data.games);
    el('replacements').textContent = `${count(data.replacements)} fallback games · ${(100 * data.replacements / data.games).toFixed(1)}%`;
    el('average-turns').textContent = decimal(data.averageTurns);
    el('map-count').textContent = `${count(data.maps.length)} scenarios played`;
    el('average-margin').textContent = decimal(data.averageMargin);
    el('gold').textContent = count(data.gold);
    renderScenarios();
    el('selections').replaceChildren(...data.selections.slice().reverse().map(selection => row([
      generationLink(selection), selection.selectedCandidate, decimal(selection.selectionScore),
      decimal(selection.averageVictoryTurn), decimal(selection.averageWinnerMargin),
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
el('refresh-run').addEventListener('click', () => void loadRuns(el('run').value));
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
