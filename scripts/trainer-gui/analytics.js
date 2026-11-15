'use strict';

const el = id => document.getElementById(id);
const count = value => Number.isFinite(value) ? value.toLocaleString() : '—';
const decimal = value => Number.isFinite(value) ? value.toFixed(2) : '—';
const date = value => value ? new Date(value).toLocaleString() : '—';
let summary;
let page = 1;
let runRequest = 0;
let gameRequest = 0;

async function get(endpoint, params = {}) {
  const response = await fetch(`/api/analytics/${endpoint}?${new URLSearchParams(params)}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Could not load training analytics');
  return data;
}

function option(text, value) {
  return new Option(text, value);
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
    const result = selection.candidates.find(entry => entry.candidate === candidate.candidate);
    detailList(description, { ...candidate, score: result?.score, priorities: result?.priorities });
    details.append(title, description);
    return details;
  }));
}

async function loadGames() {
  const request = ++gameRequest;
  const generation = Number(el('generation').value);
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
  el('results').hidden = el('export').hidden = true;
  el('run-status').textContent = 'Loading run…';
  try {
    const data = await get('summary', { run });
    if (request !== runRequest) return;
    summary = data;
    history.replaceState(null, '', `/analytics?${new URLSearchParams({ run })}`);
    el('export').href = `/api/analytics/download?${new URLSearchParams({ run })}`;
    el('export').hidden = false;
    el('run-status').textContent = `Started ${date(data.manifest.createdAt)} · Completed ${date(data.completedAt)} · ${data.manifest.rules || 'javascript'} rules`;
    el('game-count').textContent = count(data.games);
    el('replacements').textContent = `${count(data.replacements)} fallback games`;
    el('average-turns').textContent = decimal(data.averageTurns);
    el('map-count').textContent = `${count(data.maps.length)} scenarios played`;
    el('average-margin').textContent = decimal(data.averageMargin);
    el('gold').textContent = count(data.gold);
    el('scenarios').replaceChildren(...data.maps.map(map => row([
      map.label, map.players, count(map.games), decimal(map.averageTurns), `${map.quickest}–${map.longest}`,
      decimal(map.averageMargin), count(map.gold), count(map.replacements),
    ])));
    el('selections').replaceChildren(...data.selections.map(selection => row([
      selection.generation, selection.selectedCandidate, decimal(selection.selectionScore),
      decimal(selection.averageVictoryTurn), decimal(selection.averageWinnerMargin),
    ])));
    el('generation').replaceChildren(...data.selections.map(selection => option(`Generation ${selection.generation}`, selection.generation)));
    el('candidate').replaceChildren(option('All candidates', 0),
      ...Array.from({ length: data.manifest.shards }, (_, index) => option(`Candidate ${index + 1}`, index + 1)));
    el('map').replaceChildren(option('All scenarios', ''), ...data.maps.map(map => option(map.label, map.mapId)));
    el('results').hidden = false;
    page = 1;
    await loadGames();
  } catch (error) {
    if (request === runRequest) el('run-status').textContent = error.message;
  }
}

async function init() {
  try {
    const runs = await get('runs');
    if (!runs.length) {
      el('run-status').textContent = 'Completed training runs will appear here.';
      return;
    }
    el('run').replaceChildren(...runs.map(run => option(
      `${count(run.games)} games · ${date(run.completedAt)} · ${run.id.split('-').at(-1)}`, run.id,
    )));
    const selected = new URLSearchParams(location.search).get('run');
    if (runs.some(run => run.id === selected)) el('run').value = selected;
    el('run').disabled = false;
    await loadRun();
  } catch (error) {
    el('run-status').textContent = error.message;
  }
}

el('run').addEventListener('change', loadRun);
for (const id of ['generation', 'candidate', 'map']) {
  el(id).addEventListener('change', () => { page = 1; void loadGames(); });
}
el('previous').addEventListener('click', () => { page--; void loadGames(); });
el('next').addEventListener('click', () => { page++; void loadGames(); });
void init();
