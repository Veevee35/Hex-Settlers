'use strict';
const el = id => document.getElementById(id);
const fields = ['sims','generation','shards','batch','concurrency','mapSet','rules','gpuMode','epochs','miniBatch','python','victoryPoints','maxTurns','benchmarkGames','learningMode','styleRotations'];
const runFields = ['sims','generation','shards','mapSet','rules','victoryPoints','maxTurns','benchmarkGames','learningMode','styleRotations'];
const presets = {
  smoke: { sims: 4, generation: 4, shards: 1, batch: 2, concurrency: 1, gpuMode: 'cpu', benchmarkGames: 0 },
  trial: { sims: 100, generation: 50, shards: 2, batch: 10, concurrency: 2, gpuMode: 'cpu' },
  focused: { sims: 10000, generation: 1000, shards: 4, batch: 50, concurrency: 2, gpuMode: 'auto', epochs: 3 },
  standard: { sims: 20000, generation: 1000, shards: 4, batch: 100, concurrency: 2, gpuMode: 'auto' },
  overnight: {
    sims: 700000, generation: 5000, shards: 12, batch: 50, concurrency: 2,
    rules: 'javascript', gpuMode: 'auto', epochs: 8, miniBatch: 256,
  },
};
let token = '';
let initial = true;
let runs = [];
let priorities = [];
let profiles = [];
let newRunDraft;
let busy = false;
let submitting = false;
let weightRequest = 0;
let lastJobId = null;
let lastJobState = null;
let lineCount = -1;
let lastSeenLogs = [];
let toastTimer;
const drawProgression = trainingProgression.chart(el('progression-chart'));
let progressionSignature;
const numberFormat = value => Number(value || 0).toLocaleString();
function toast(message) {
  const box = el('toast'); box.textContent = message; box.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => box.classList.remove('show'), 7000);
}
function config() {
  const settings = Object.fromEntries(fields.map(key => [key, ['mapSet','rules','gpuMode','python','learningMode'].includes(key) ? el(key).value : Number(el(key).value)]));
  settings.candidatePriorities = Array.from({ length: candidateCount() }, (_, index) => profiles[index] || {});
  return settings;
}
function setConfig(settings) {
  if (!settings) return;
  for (const key of fields) if (settings[key] !== undefined) el(key).value = settings[key];
  if (settings.candidatePriorities) profiles = settings.candidatePriorities.map(profile => ({ ...profile }));
  renderPriorities();
}
function candidateCount() { return Math.max(1, Math.min(64, Math.trunc(Number(el('shards').value)) || 1)); }
function renderPriorities() {
  const select = el('priority-candidate');
  const count = candidateCount();
  const index = Math.min(count - 1, Number(select.value));
  if (select.options.length !== count) {
    select.replaceChildren(...Array.from({ length: count }, (_, i) => new Option(`Candidate ${i + 1}`, i)));
    select.value = index;
  }
  el('priority-sliders').replaceChildren(...priorities.map(({ key, label, detail }) => {
    const control = document.createElement('div');
    control.className = 'priority-control';
    const title = document.createElement('label');
    const input = document.createElement('input');
    const value = document.createElement('output');
    const description = document.createElement('small');
    input.id = `priority-${key}`;
    input.type = 'range';
    input.min = '0';
    input.max = '200';
    input.value = profiles[index]?.[key] ?? 100;
    value.htmlFor = input.id;
    value.textContent = `${input.value}%`;
    title.htmlFor = input.id;
    title.append(label, value);
    description.textContent = detail;
    description.id = `${input.id}-description`;
    input.setAttribute('aria-describedby', description.id);
    input.addEventListener('input', () => {
      profiles[index] ??= {};
      profiles[index][key] = Number(input.value);
      value.textContent = `${input.value}%`;
      input.setAttribute('aria-valuetext', value.textContent);
    });
    input.setAttribute('aria-valuetext', value.textContent);
    control.append(title, input, description);
    return control;
  }));
  updateControls();
}
function updateControls() {
  const locked = busy || submitting;
  const resumed = !!el('resume').value;
  const savedRun = resumed && runs.some(run => run.id === el('resume').value && run.config);
  el('resume').disabled = locked;
  for (const key of fields) el(key).disabled = locked || (savedRun && runFields.includes(key));
  el('preset').disabled = locked || resumed;
  el('save-settings').disabled = locked || resumed || !token;
  el('start-btn').disabled = locked || !token;
  el('priority-candidate').disabled = !priorities.length;
  el('priority-lock').hidden = !savedRun;
  el('reset-priorities').disabled = locked || savedRun;
  el('copy-priorities').disabled = locked || savedRun || candidateCount() < 2;
  for (const slider of el('priority-sliders').querySelectorAll('input')) slider.disabled = locked || savedRun;
  el('upload-weights').disabled = locked || !token;
}
async function api(route, payload={}) {
  const response = await fetch(route, { method:'POST', headers:{ 'content-type':'application/json', 'x-hex-trainer-token':token }, body:payload instanceof File ? payload : JSON.stringify(payload) });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || `Request failed: ${response.status}`);
  return body;
}
function formatElapsed(start, end) {
  if (!start) return '00:00:00';
  const sec = Math.max(0, Math.floor(((end || Date.now()) - start) / 1000));
  const pad = n => String(n).padStart(2,'0');
  return `${pad(Math.floor(sec / 3600))}:${pad(Math.floor(sec % 3600 / 60))}:${pad(sec % 60)}`;
}
function updateRuns(select, emptyLabel) {
  const old = select.value;
  const signature = JSON.stringify(runs.map(run => run.id + run.updated + run.completedGenerations));
  if (signature !== select.dataset.signature) {
    select.dataset.signature = signature;
    select.replaceChildren(new Option(emptyLabel,''));
    runs.forEach(run => {
      const done = run.totalGenerations ? `${run.completedGenerations}/${run.totalGenerations} generations` : `${run.completedGenerations} completed generations`;
      select.add(new Option(`${run.id.slice(0,32)} · ${done}`,run.id));
    });
    if (runs.some(run => run.id === old)) select.value = old;
  }
}
function applyRunSelection() {
  const selected = runs.find(run => run.id === el('resume').value);
  if (selected) {
    newRunDraft ??= config();
    setConfig({ ...config(), ...selected.config });
  } else if (newRunDraft) {
    setConfig(newRunDraft);
    newRunDraft = undefined;
  }
  el('preset').value = '';
  updateControls();
}
async function refreshWeights() {
  const request = ++weightRequest;
  const run = el('weight-run').value;
  const select = el('weight-snapshot');
  el('download-weights').disabled = true;
  try {
    const res = await fetch(`/api/weights?${new URLSearchParams({ run })}`);
    const snapshots = await res.json();
    if (!res.ok) throw new Error(snapshots.error);
    if (request !== weightRequest || run !== el('weight-run').value) return;
    const previous = select.value;
    select.replaceChildren(...snapshots.map(({ id, label }) => new Option(label, id)));
    if (!snapshots.length) select.add(new Option('No weights available', ''));
    if (snapshots.some(({ id }) => id === previous)) select.value = previous;
    select.disabled = !snapshots.length;
    el('download-weights').disabled = !snapshots.length;
  } catch (err) {
    if (request === weightRequest) toast(err.message);
  }
}
function showLogs(job) {
  const screen = el('log-screen');
  const logs = job?.logs || [];
  const signature = `${job?.id}:${logs.length}:${logs.at(-1)?.line || ''}`;
  if (screen.dataset.signature === signature) return;
  const pinned = screen.scrollHeight - screen.scrollTop - screen.clientHeight < 55;
  screen.dataset.signature = signature;
  const fragment = document.createDocumentFragment();
  logs.forEach(log => {
    const div = document.createElement('div');
    div.className = `log-line ${/\[error\]|failed|exited \(1\)/i.test(log.line) ? 'error' : /\[cuda\]|GPU|refinement/i.test(log.line) ? 'cuda' : /retry|cooldown|quarantined|pause/i.test(log.line) ? 'warn' : ''}`;
    const stamp = document.createElement('span'); stamp.className='stamp'; stamp.textContent=`[${log.t}]`;
    div.append(stamp, document.createTextNode(' ' + log.line)); fragment.append(div);
  });
  screen.replaceChildren(fragment);
  if (!logs.length) screen.textContent = 'No events yet.';
  if (pinned || !lineCount || job?.id !== lastJobId) screen.scrollTop = screen.scrollHeight;
  lineCount = logs.length;
}
function showGpu(gpu) {
  const chip = el('gpu-chip');
  chip.className = `hardware-chip ${gpu ? gpu.ok ? 'good':'bad' : ''}`;
  chip.textContent = !gpu ? 'NOT CHECKED' : gpu.ok ? 'CUDA READY' : 'CPU / UNAVAILABLE';
  el('gpu-info').textContent = gpu ? (gpu.ok ? `${gpu.device} detected · CUDA ${gpu.cudaVersion} · PyTorch ${gpu.torch}. CPU runs game rules; NVIDIA GPU refines weights after each completed batch.` : `CUDA unavailable: ${gpu.error}. Choose CPU or Auto, or install CUDA-enabled PyTorch in the Python executable shown above.`) : 'CPU simulates turns and legal moves. CUDA optionally refines the neural network from completed games between checkpoint saves. PyTorch with CUDA support is required.';
}
function showProgression(job, progression) {
  const run = job?.runFolder || progression?.run;
  const history = progression?.history || [];
  const latest = history.at(-1);
  const signature = `${job?.id}:${run}:${history.length}:${progression?.error || ''}`;
  if (signature === progressionSignature) return;
  progressionSignature = signature;
  el('analytics-link').href = run ? `/analytics?${new URLSearchParams({ run })}` : '/analytics';
  el('styles-link').href = `${el('analytics-link').getAttribute('href')}#style-progression`;
  el('qualification-link').hidden = !latest?.qualification;
  if (latest?.qualification) el('qualification-link').href = `/benchmarks?${new URLSearchParams({ id: latest.qualification.report })}`;
  el('progression-results').hidden = !latest;
  const champion = latest?.qualification ? (latest.qualification.promoted ? ' · Champion promoted' : ' · Champion retained') : '';
  const decisions = latest?.policyDecisions ? ` · ${numberFormat(latest.policyDecisions)} learned decisions` : '';
  el('progression-status').textContent = latest
    ? `${job ? 'Current session' : 'Most recent scored run'} · Generation ${numberFormat(latest.generation)}${champion}${decisions} · ${run}`
    : progression?.error || 'Progression appears after the first generation selects a model.';
  if (!latest) return;
  el('latest-score').textContent = trainingProgression.decimal(latest.selectionScore);
  el('score-change').textContent = trainingProgression.compare(history, 'selectionScore');
  el('turn-change').textContent = trainingProgression.compare(history, 'averageVictoryTurn');
  el('margin-change').textContent = trainingProgression.compare(history, 'averageWinnerMargin');
  const best = history.reduce((peak, point) => Number.isFinite(point.selectionScore) && (!peak || point.selectionScore > peak.selectionScore) ? point : peak, null);
  el('best-score').textContent = best ? `Best ${trainingProgression.decimal(best.selectionScore)} · Gen ${best.generation}` : '';
  drawProgression(history);
}
function update(job, model, progression) {
  const state = job?.state || 'idle';
  showProgression(job, progression);
  el('status-badge').textContent = state.toUpperCase();
  el('status-badge').className = `state ${state}`;
  el('start-btn').textContent = submitting ? 'Working…' : el('resume').value ? '▶ Resume training' : '▶ Start training';
  el('pause-btn').disabled = state !== 'running';
  el('stop-btn').disabled = !['running','pausing','stopping'].includes(state);
  const target = job?.settings.sims || Number(el('sims').value);
  el('completed-count').textContent = numberFormat(job?.progress);
  el('target-count').textContent = `/ ${numberFormat(target)}`;
  el('progress-bar').style.width = `${Math.min(100, 100 * (job?.progress || 0) / (target || 1))}%`;
  el('generation-count').textContent = job?.generation || 0;
  el('generation-total').textContent = `/ ${Math.ceil(target / (job?.settings.generation || Number(el('generation').value)))}`;
  el('elapsed-time').textContent = formatElapsed(job?.startedAt, job?.endedAt);
  el('runtime-status').textContent = state === 'running' ? 'Training in progress' : state === 'paused' ? 'Checkpoint preserved' : state === 'failed' ? 'Inspect logs for failure' : state === 'completed' ? 'Training completed' : state === 'pausing' ? 'Waiting for safe checkpoint' : 'No active training';
  const rate = state === 'running' && job.gamesPerHour;
  el('runtime-rate').hidden = !rate || job.progress >= target;
  if (!el('runtime-rate').hidden) {
    const minutes = Math.ceil((target - job.progress) * 60 / rate);
    el('runtime-rate').textContent = `${numberFormat(Math.round(rate))} games/hr · ~${Math.floor(minutes / 60)}h ${minutes % 60}m left`;
  }
  el('trained-games').textContent = model ? numberFormat(model.trainedGames) : '—';
  el('model-detail').textContent = model?.policyDecisions ? `${numberFormat(model.policyDecisions)} learned action samples`
    : model?.lastCudaRefinement ? `Last GPU refinement: ${numberFormat(model.lastCudaRefinement.samples)} samples` : 'Current model weights';
  el('phase').textContent = state === 'running' ? (job.lastCuda && /^(?:\[candidate \d+\] )?\[cuda\]/.test(job.logs?.at(-1)?.line || '') ? 'CUDA weight refinement' : 'CPU self-play / evaluation') : state === 'pausing' ? 'Checkpointing / stopping' : state;
  el('accelerator').textContent = job?.accelerator === 'cuda' ? 'NVIDIA CUDA + CPU self-play' : job ? 'CPU self-play and training' : '—';
  el('winner').textContent = job?.winner ? `Candidate ${job.winner}` : '—';
  el('checkpoint').textContent = job?.runFolder || '—';
  el('cuda-summary').textContent = job?.lastCuda || '—';
  el('log-path').textContent = job?.logPath || 'Full logs saved locally';
  showLogs(job);
  lastJobId = job?.id;
  lastJobState = state;
}
async function refresh() {
  try {
    const res = await fetch('/api/status', {cache:'no-store'});
    if (!res.ok) throw new Error(`Local server: HTTP ${res.status}`);
    const status = await res.json(); token = status.token;
    const running = ['running','pausing','stopping'].includes(status.current?.state);
    busy = running || status.checking || status.importing;
    runs = status.runs;
    updateRuns(el('resume'), 'New training run');
    updateRuns(el('weight-run'), 'Current model and import backups');
    if (initial) {
      priorities = status.priorities;
      setConfig(running ? status.current.settings : status.settings);
      if (running && runs.some(run => run.id === status.current.runFolder)) {
        newRunDraft = status.settings;
        el('resume').value = status.current.runFolder;
      }
    }
    const state = status.current?.state;
    if (state !== lastJobState && ['paused','stopped','failed'].includes(state) &&
        runs.some(run => run.id === status.current.runFolder)) {
      el('resume').value = status.current.runFolder;
      applyRunSelection();
    }
    if (initial || (state !== lastJobState && !running)) await refreshWeights();
    initial = false;
    updateControls();
    showGpu(status.gpu);
    update(status.current, status.model, status.progression);
  } catch (err) { toast(`Connection lost: ${err.message}`); }
}
el('settings-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (submitting) return;
  submitting = true;
  updateControls();
  try {
    const payload = {settings:config(), resumeFolder:el('resume').value};
    el('start-btn').textContent='Checking hardware…';
    const result=await api('/api/start',payload);
    if (result.job.accelerator !== 'cuda' && payload.settings.gpuMode==='auto') toast('Started CPU self-play. CUDA not available; check GPU status for details.');
  } catch (err) { toast(err.message); }
  finally { submitting = false; await refresh(); }
});
el('gpu-check').addEventListener('click', async () => {
  const button=el('gpu-check'); button.disabled=true; button.textContent='Detecting…';
  try { const gpu=await api('/api/gpu',{python:el('python').value}); showGpu(gpu); if(!gpu.ok) toast(gpu.error); }
  catch (err) { toast(err.message); }
  finally {button.disabled=false; button.textContent='◈ Detect GPU';}
});
el('pause-btn').addEventListener('click', async () => { try { await api('/api/pause'); await refresh(); } catch (err) {toast(err.message);} });
el('stop-btn').addEventListener('click', async () => {
  if (!confirm('Emergency stop the full training process tree? The current unfinished batch will be lost, but completed checkpoints remain.')) return;
  try { await api('/api/stop'); await refresh(); } catch (err) {toast(err.message);}
});
el('resume').addEventListener('change', () => {
  applyRunSelection();
  el('start-btn').textContent = el('resume').value ? '▶ Resume training' : '▶ Start training';
});
el('preset').addEventListener('change', () => {
  const preset = presets[el('preset').value];
  if (preset) setConfig({ mapSet: 'standard', victoryPoints: 0, maxTurns: 900, benchmarkGames: 1000, learningMode: preset.benchmarkGames === 0 ? 'value' : 'actions', ...preset });
});
for (const key of fields) el(key).addEventListener('input', () => { el('preset').value = ''; });
el('shards').addEventListener('input', renderPriorities);
el('priority-candidate').addEventListener('change', renderPriorities);
el('reset-priorities').addEventListener('click', () => {
  profiles[Number(el('priority-candidate').value)] = {};
  renderPriorities();
});
el('copy-priorities').addEventListener('click', () => {
  const source = profiles[Number(el('priority-candidate').value)];
  profiles = Array.from({ length: candidateCount() }, () => ({ ...source }));
  renderPriorities();
});
el('save-settings').addEventListener('click', async () => {
  submitting = true;
  updateControls();
  try { await api('/api/settings', config()); toast('Training settings saved.'); }
  catch (err) { toast(err.message); }
  finally { submitting = false; updateControls(); }
});
el('weight-run').addEventListener('change', refreshWeights);
el('refresh-weights').addEventListener('click', refreshWeights);
el('download-weights').addEventListener('click', () => {
  const params = new URLSearchParams({ run: el('weight-run').value, id: el('weight-snapshot').value });
  const link = document.createElement('a');
  link.href = `/api/weights/download?${params}`;
  link.download = '';
  link.click();
});
el('upload-weights').addEventListener('click', () => el('weight-file').click());
el('weight-file').addEventListener('change', async event => {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;
  if (file.size > 256 * 1024) { toast('Choose a model JSON file under 256 KB.'); return; }
  if (!confirm(`Replace the current model with ${file.name}? A backup will be saved automatically.`)) return;
  submitting = true;
  updateControls();
  try {
    const result = await api('/api/weights/upload', file);
    toast(`Imported model with ${numberFormat(result.trainedGames)} trained games.${result.backup ? ' Previous weights backed up.' : ''}`);
    el('weight-run').value = '';
    await refreshWeights();
  } catch (err) { toast(err.message); }
  finally { submitting = false; await refresh(); }
});
el('clear-view').addEventListener('click', () => { el('log-screen').replaceChildren(); el('log-screen').dataset.signature='cleared'; lineCount=0; });
refresh(); setInterval(refresh, 1600);
