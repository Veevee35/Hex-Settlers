'use strict';

const el = id => document.getElementById(id);
const fmt = (n, digits = 1) => Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: digits }) : '—';
const percent = n => Number.isFinite(n) ? `${fmt(n * 100)}%` : '—';
const interval = n => n?.low == null ? '—' : `${percent(n.low)} to ${percent(n.high)}`;
const delta = n => n?.estimate == null ? '—'
  : [n.estimate, n.low, n.high].map((x, i) => `${x > 0 ? '+' : ''}${fmt(x * 100)}${i === 0 ? ' pp' : ''}`)
    .reduce((estimate, value, i) => estimate + (i === 1 ? ` (${value}` : ` to ${value})`));
const drawRatings = trainingProgression.chart(el('rating-chart'));
const prefixes = ['candidate', 'opponent'];
const requestedReport = new URLSearchParams(location.search).get('id');
let token = '';
let scenarios = new Map();
let history = [];
let report;
let selectedMatch;
let page = 1;
let resultRequest = 0;
let matchRequest = 0;
let statusRequest = false;
let running = false;
let shownCompletedJob;

async function request(route, params = {}, payload) {
  const response = await fetch(`/api/benchmarks/${route}?${new URLSearchParams(params)}`, {
    cache: 'no-store',
    ...(payload === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json', 'x-hex-trainer-token': token }, body: JSON.stringify(payload) }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

const option = (label, value) => new Option(label, value);
const button = (label, callback) => {
  const item = document.createElement('button');
  item.className = 'mini';
  item.type = 'button';
  item.textContent = label;
  item.addEventListener('click', callback);
  return item;
};
function row(...values) {
  const tr = document.createElement('tr');
  for (const value of values) {
    const td = tr.insertCell();
    if (value instanceof Node) td.append(value);
    else td.textContent = value ?? '—';
  }
  return tr;
}
function definitionList(id, values) {
  el(id).replaceChildren(...Object.entries(values).flatMap(([label, value]) => {
    const term = document.createElement('dt');
    const detail = document.createElement('dd');
    term.textContent = label;
    detail.textContent = value;
    return [term, detail];
  }));
}
const errors = (work, id = 'history-status') => work.catch(error => { el(id).textContent = error.message; });

async function loadModels(side, selected) {
  const source = el(`${side}-run`);
  const menu = el(side);
  const run = source.value;
  const models = await request('models', { run });
  if (source.value !== run) return;
  const choices = models.map(model => option(model.label === 'Current model' ? 'Current local Expert' : model.label, model.id));
  if (!run && side === 'opponent') choices.push(option('Hard rule-based AI', 'rules'), option('Random legal-action baseline', 'random'));
  menu.replaceChildren(...choices);
  if (selected && choices.some(item => item.value === selected)) menu.value = selected;
}

async function refreshStatus() {
  if (statusRequest) return;
  statusRequest = true;
  try {
    const result = await request('status');
    token = result.token;
    const job = result.job;
    running = job.state === 'running';
    el('run').disabled = running || result.busy || !el('candidate').value || !el('opponent').value;
    el('cancel').hidden = !running;
    if (running) el('job-status').textContent = `Evaluating ${fmt(job.done)} of ${fmt(job.total)} games…`;
    else if (result.busy) el('job-status').textContent = 'Pause training before starting a manual benchmark.';
    else if (job.state === 'failed') el('job-status').textContent = job.error;
    else if (job.state === 'cancelled') el('job-status').textContent = 'Benchmark cancelled.';
    else if (job.state === 'completed' && job.report !== shownCompletedJob) {
      shownCompletedJob = job.report;
      el('job-status').textContent = `Finished ${fmt(job.done)} games.`;
      await loadHistory(job.report);
    }
  } finally { statusRequest = false; }
}

function showRating() {
  const count = el('rating-count').value;
  const comparable = history.filter(entry => entry.engineHash === report.engineHash &&
    (entry.opponent.weightsSha256 || entry.opponent.id) === (report.opponent.weightsSha256 || report.opponent.id) &&
    JSON.stringify(entry.config.maps) === JSON.stringify(report.config.maps) &&
    entry.config.games === report.config.games && entry.config.maxTurns === report.config.maxTurns &&
    entry.config.seed === report.config.seed && entry.ratings[count] &&
    entry.ratings[count].version === report.byPlayerCount[count]?.openSkill?.version).reverse();
  const current = report.byPlayerCount[count]?.openSkill;
  el('rating-status').textContent = current
    ? `Ordinal ${fmt(current.ordinal, 2)} · μ ${fmt(current.mu, 2)} · σ ${fmt(current.sigma, 2)} · ${fmt(comparable.length)} runs with the same reference, engine, seed and suite`
    : 'A rating appears after the first completed game at this player count.';
  const points = comparable.map((entry, index) => ({ generation: index + 1, openSkill: entry.ratings[count].ordinal }));
  drawRatings(points, 'openSkill', comparable.findIndex(entry => entry.id === report.id) + 1);
}

async function loadHistory(selected = el('result').value) {
  const baseline = el('baseline').value;
  history = await request('history', { screens: el('screens').checked ? '1' : '0' });
  if (selected && !history.some(entry => entry.id === selected) && !el('screens').checked && selected === requestedReport) {
    el('screens').checked = true;
    return loadHistory(selected);
  }
  const label = entry => {
    const { context, candidate, opponent, startedAt } = entry;
    const stamp = new Date(startedAt).toLocaleString();
    const phase = context.purpose ? ` · Gen ${context.generation} ${context.purpose}` : '';
    return `${candidate.label} vs ${opponent.label}${phase} · ${stamp}`;
  };
  el('result').replaceChildren(...history.map(entry => option(label(entry), entry.id)));
  el('baseline').replaceChildren(option('Choose a benchmark', ''), ...history.map(entry => option(label(entry), entry.id)));
  if (history.some(entry => entry.id === selected)) el('result').value = selected;
  if (history.some(entry => entry.id === baseline)) el('baseline').value = baseline;
  await loadResult();
}

async function loadResult() {
  const id = el('result').value;
  const other = el('baseline').value;
  const ticket = ++resultRequest;
  if (!id) {
    el('report').hidden = true;
    el('history-status').textContent = 'Completed benchmarks appear here.';
    return;
  }
  const [current, baseline, comparison] = await Promise.all([
    request('report', { id }),
    other ? request('report', { id: other }) : null,
    other ? request('compare', { id, baseline: other }) : null,
  ]);
  if (ticket !== resultRequest) return;
  const previousId = report?.id;
  report = current;
  const { summary, byScenario, byPlayerCount, config, context, engineBuild, engineHash, revision, candidate, opponent } = report;
  el('report').hidden = false;
  el('history-status').textContent = `Seed ${config.seed} · ${fmt(report.durationMs / 1000)} seconds · ${engineBuild || 'Engine build unavailable'}`;
  el('win-rate').textContent = percent(summary.winRate.estimate);
  el('win-ci').textContent = `95% interval ${interval(summary.winRate)}`;
  el('games').textContent = fmt(summary.games);
  el('completions').textContent = `${fmt(summary.completed)} completed · ${fmt(summary.wins)} wins`;
  el('turns').textContent = fmt(summary.turnsToWin);
  el('placement').textContent = `Mean place ${fmt(summary.meanPlace, 2)} · ${fmt(summary.meanVp, 2)} VP`;
  el('invalid').textContent = fmt(summary.invalidActions);
  el('issues').textContent = `${fmt(summary.games - summary.completed)} incomplete · ${fmt(summary.outcomes.crashed || 0)} crashes`;
  const count = el('rating-count').value;
  el('rating-count').replaceChildren(...Object.keys(byPlayerCount).map(n => option(`${n} players`, n)));
  if (byPlayerCount[count]) el('rating-count').value = count;
  showRating();
  const paired = comparison?.matched;
  el('comparison').textContent = other
    ? paired?.games ? `${fmt(paired.games)} matched games · Win-rate change ${delta(paired.winRateDelta)} · 95% interval`
      : 'Paired changes require matching boards, seats, seed, opponent weights and engine.'
    : 'Win rate uses all scheduled games. Confidence intervals account for the shared seed in each seat rotation.';
  const scenarioRow = (label, data, comparisonData, change, players) => row(label, fmt(data?.games), percent(data?.winRate.estimate),
    interval(data?.winRate), percent(data?.equalPolicyWinRate ?? 1 / players), fmt(data?.meanPlace, 2), fmt(data?.meanVp, 2), fmt(data?.turnsToWin),
    percent(comparisonData?.winRate.estimate), delta(change));
  const counts = new Set([...Object.keys(byPlayerCount), ...Object.keys(baseline?.byPlayerCount || {})]);
  const maps = new Set([...Object.keys(byScenario), ...Object.keys(baseline?.byScenario || {})]);
  el('scenario-results').replaceChildren(
    ...[...counts].sort().map(n => scenarioRow(`${n} players`, byPlayerCount[n], baseline?.byPlayerCount?.[n], paired?.byPlayerCount?.[n], n)),
    ...[...maps].map(map => scenarioRow(
      byScenario[map] ? button(scenarios.get(map) || map, () => filterMatches(map, '')) : scenarios.get(map) || map,
      byScenario[map], baseline?.byScenario?.[map], paired?.byScenario?.[map])),
  );
  const strategy = summary.strategy;
  definitionList('strategy', {
    'Settlement production pips': fmt(strategy.settlementPips),
    'Roads / ships built': `${fmt(strategy['builds.road'])} / ${fmt(strategy['builds.ship'])}`,
    'Routes opening sites / sites opened': `${fmt(strategy.routesOpeningSites)} / ${fmt(strategy.newSettlementSites)}`,
    'Turns ending with an affordable settlement site': fmt(strategy.turnsPassingAffordableSettlement),
    'Cities / first city turn': `${fmt(strategy['builds.city'])} / ${fmt(strategy.firstCityTurn)}`,
    'Produced / blocked / discarded cards': `${fmt(strategy.produced)} / ${fmt(strategy.blockedProduction)} / ${fmt(strategy.discarded)}`,
    'Unspent resource cards': fmt(strategy.unspent),
    'VP per produced card': fmt(strategy.vpPerProducedCard, 3),
    'Bank / player trades': `${fmt(strategy.bankTrades)} / ${fmt(strategy.playerTrades)}`,
    'Development cards / first buy turn': `${fmt(strategy.developmentBought)} / ${fmt(strategy.firstDevelopmentTurn)}`,
    'Longest Road / Largest Army claims': `${fmt(strategy.longestRoadClaims)} / ${fmt(strategy.largestArmyClaims)}`,
    'Steals from / trades with near-win opponents': `${fmt(strategy.nearWinThiefTargets)} / ${fmt(strategy.nearWinTradePartners)}`,
    'Robber blocks against near-win opponents': fmt(strategy.nearWinRobberBlocks),
    'Fog reveals / reveals per ship': `${fmt(strategy.fogReveals)} / ${fmt(strategy.fogPerShip, 2)}`,
  });
  const technical = summary.technical;
  definitionList('technical', {
    'Games per second': fmt(report.gamesPerSecond),
    'Mean / maximum decision latency': `${fmt(technical.meanDecisionMs, 3)} / ${fmt(technical.maxDecisionMs, 3)} ms`,
    'Peak worker memory': `${fmt(technical.peakWorkerRssBytes / 1048576)} MiB`,
    'Total worker CPU': `${fmt(technical.workerCpuMs / 1000)} CPU seconds`,
    'Worker share of available CPU time': percent(technical.workerCpuMs / (report.durationMs * report.logicalCpus)),
    'Workers / rules': `${report.workers} / ${report.rulesBackend}`,
    'Turn limit / stalled / crashed': ['turn-limit', 'stalled', 'crashed'].map(key => fmt(summary.outcomes[key] || 0)).join(' / '),
  });
  el('config').textContent = JSON.stringify({ candidate, opponent, config, context, revision, engineHash }, null, 2);
  if (previousId !== id) {
    el('match-map').replaceChildren(option('All scenarios', ''), ...Object.keys(byScenario).map(map => option(scenarios.get(map) || map, map)));
    el('outcome').value = '';
    page = 1;
  }
  await loadMatches();
}

async function loadMatches() {
  if (!report) return;
  const ticket = ++matchRequest;
  const result = await request('matches', { id: report.id, map: el('match-map').value, outcome: el('outcome').value, page });
  if (ticket !== matchRequest) return;
  page = result.page;
  el('matches').replaceChildren(...result.matches.map(match => row(
    button(`#${match.id}`, () => errors(showMatch(match.id))),
    scenarios.get(match.mapId) || match.mapId, match.candidateSeat + 1,
    match.winnerSeat >= 0 ? match.winnerSeat + 1 : '—', fmt(match.turn),
    fmt(match.standings?.find(seat => seat.seat === match.candidateSeat)?.vp),
    match.status === 'completed' ? (match.winnerSeat === match.candidateSeat ? 'Win' : 'Loss') : match.status,
  )));
  const pages = Math.max(1, Math.ceil(result.total / 30));
  el('page').textContent = `Page ${page} of ${pages} · ${fmt(result.total)} matches`;
  el('previous').disabled = page === 1;
  el('next').disabled = page >= pages;
}

function filterMatches(map, outcome) {
  el('match-map').value = map;
  el('outcome').value = outcome;
  page = 1;
  el('match-explorer').scrollIntoView({ block: 'start' });
  void errors(loadMatches());
}

function showStep() {
  const actions = selectedMatch.replay.actions;
  const index = Number(el('step').value) - 1;
  const entry = actions[index];
  el('step-back').disabled = index <= 0;
  el('step-next').disabled = index >= actions.length - 1;
  el('decision').textContent = `Action ${fmt(index + 1)} of ${fmt(actions.length)} · Turn ${entry.turn} · Seat ${entry.seat + 1}\n${entry.phase}\n\n${JSON.stringify(entry.action, null, 2)}\n\n${entry.roll ? `Roll: ${entry.roll}\n` : ''}VP by seat: ${entry.vp.join(' · ')}`;
}

async function showMatch(match) {
  selectedMatch = await request('match', { id: report.id, match });
  const { replay, result } = selectedMatch;
  el('match-title').textContent = `Match ${match} · ${scenarios.get(result.mapId) || result.mapId}`;
  el('match-note').textContent = `Seed ${result.seed} · Candidate seat ${result.candidateSeat + 1} · ${result.status}`;
  el('standings').textContent = JSON.stringify({ standings: result.standings, rejectedActions: result.invalid, error: result.error }, null, 2);
  el('replay').hidden = !replay?.actions.length;
  if (replay?.actions.length) {
    el('step').max = replay.actions.length;
    el('step').value = 1;
    showStep();
  }
  el('match-detail').showModal();
}

el('benchmark-form').addEventListener('submit', event => {
  event.preventDefault();
  if (running) return;
  el('run').disabled = true;
  const [candidate, opponent] = prefixes.map(side => ({ run: el(`${side}-run`).value, id: el(side).value }));
  const maps = [...el('scenarios').querySelectorAll('input:checked')].map(input => input.value);
  void errors(request('start', {}, { candidate, opponent, maps, seed: el('seed').value, profile: el('profile').value })
    .then(() => refreshStatus()).catch(error => { el('run').disabled = false; throw error; }), 'job-status');
});
el('cancel').addEventListener('click', () => errors(request('stop', {}, {}).then(refreshStatus), 'job-status'));
el('import').addEventListener('click', () => el('model-file').click());
el('model-file').addEventListener('change', () => {
  const file = el('model-file').files[0];
  el('model-file').value = '';
  if (!file) return;
  void errors(file.text().then(text => request('import', {}, { label: file.name, model: JSON.parse(text) })).then(async added => {
    el('opponent-run').value = '';
    await Promise.all([loadModels('opponent', added.id), loadModels('candidate', el('candidate').value)]);
    el('job-status').textContent = `Added ${added.label} as a benchmark opponent.`;
  }), 'job-status');
});
for (const side of prefixes) el(`${side}-run`).addEventListener('change', () => errors(loadModels(side), 'job-status'));
for (const id of ['result', 'baseline']) el(id).addEventListener('change', () => errors(loadResult()));
for (const id of ['refresh', 'screens']) el(id).addEventListener('click', () => errors(loadHistory()));
el('rating-count').addEventListener('change', showRating);
for (const item of document.querySelectorAll('[data-outcome]')) item.addEventListener('click', () => filterMatches('', item.dataset.outcome));
for (const id of ['match-map', 'outcome']) el(id).addEventListener('change', () => { page = 1; void errors(loadMatches()); });
for (const [id, increment] of [['previous', -1], ['next', 1]]) {
  el(id).addEventListener('click', () => { page += increment; void errors(loadMatches()); });
}
for (const [id, increment] of [['step-back', -1], ['step-next', 1]]) {
  el(id).addEventListener('click', () => { el('step').value = Number(el('step').value) + increment; showStep(); });
}
el('step').addEventListener('input', showStep);
el('download').addEventListener('click', () => {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([JSON.stringify(selectedMatch, null, 2)], { type: 'application/json' }));
  link.download = `hex-benchmark-match-${selectedMatch.result.id}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
});

async function initialize() {
  const config = await request('config');
  scenarios = new Map(config.scenarios.map(map => [map.id, `${map.label.replace(/ [567]–?[68]?$/, '')} · ${map.players} players`]));
  for (const side of prefixes) {
    el(`${side}-run`).replaceChildren(option('Current and imported models', ''), option('Archived benchmark models', 'registry'), ...config.runs.map(run =>
      option(`${new Date(run.updated).toLocaleDateString()} · ${fmt(run.completedGenerations)} generations · ${run.id}`, run.id)));
  }
  el('scenarios').replaceChildren(...config.scenarios.map(map => {
    const label = document.createElement('label');
    const input = document.createElement('input');
    label.className = 'benchmark-check';
    input.type = 'checkbox';
    input.value = map.id;
    label.append(input, scenarios.get(map.id));
    return label;
  }));
  await Promise.all([loadModels('candidate', 'current'), loadModels('opponent', 'current'), loadHistory(requestedReport)]);
  await refreshStatus();
}

void errors(initialize());
setInterval(() => errors(refreshStatus(), 'job-status'), 1200);
