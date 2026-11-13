'use strict';
const el = id => document.getElementById(id);
const fields = ['sims','generation','shards','batch','concurrency','mapSet','rules','gpuMode','epochs','miniBatch','python'];
let token = '';
let initial = true;
let lastJobId = null;
let lastJobState = null;
let lineCount = -1;
let lastSeenLogs = [];
let toastTimer;
const numberFormat = value => Number(value || 0).toLocaleString();
function toast(message) {
  const box = el('toast'); box.textContent = message; box.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => box.classList.remove('show'), 7000);
}
function config() {
  return Object.fromEntries(fields.map(key => [key, ['mapSet','rules','gpuMode','python'].includes(key) ? el(key).value : Number(el(key).value)]));
}
function setConfig(settings) { if (!settings) return; for (const key of fields) if (settings[key] !== undefined) el(key).value = settings[key]; }
async function api(route, payload={}) {
  const response = await fetch(route, { method:'POST', headers:{ 'content-type':'application/json', 'x-hex-trainer-token':token }, body:JSON.stringify(payload) });
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
function updateRuns(runs, running, selectedRun) {
  const select = el('resume'); const old = selectedRun ?? select.value;
  const signature = JSON.stringify(runs.map(run => run.id + run.updated + run.completedGenerations));
  if (signature !== select.dataset.signature) {
    select.dataset.signature = signature;
    select.replaceChildren(new Option('New training run',''));
    runs.forEach(run => {
      const done = run.totalGenerations ? `${run.completedGenerations}/${run.totalGenerations} generations` : `${run.completedGenerations} completed generations`;
      select.add(new Option(`${run.id.slice(0,32)} · ${done}`,run.id));
    });
    if (runs.some(run => run.id === old)) select.value = old;
  }
  select.disabled = running;
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
function update(job, model) {
  const state = job?.state || 'idle';
  const isBusy = ['running','pausing','stopping'].includes(state);
  el('status-badge').textContent = state.toUpperCase();
  el('status-badge').className = `state ${state}`;
  el('start-btn').disabled = isBusy;
  el('start-btn').textContent = state === 'paused' ? '▶ Resume / start' : '▶ Start training';
  el('pause-btn').disabled = state !== 'running';
  el('stop-btn').disabled = !isBusy;
  for (const id of fields) el(id).disabled = isBusy;
  const target = job?.settings.sims || Number(el('sims').value);
  el('completed-count').textContent = numberFormat(job?.progress);
  el('target-count').textContent = `/ ${numberFormat(target)}`;
  el('progress-bar').style.width = `${Math.min(100, 100 * (job?.progress || 0) / (target || 1))}%`;
  el('generation-count').textContent = job?.generation || 0;
  el('generation-total').textContent = `/ ${Math.ceil(target / (job?.settings.generation || Number(el('generation').value)))}`;
  el('elapsed-time').textContent = formatElapsed(job?.startedAt, job?.endedAt);
  el('runtime-status').textContent = state === 'running' ? 'Training in progress' : state === 'paused' ? 'Checkpoint preserved' : state === 'failed' ? 'Inspect logs for failure' : state === 'completed' ? 'Training completed' : state === 'pausing' ? 'Waiting for safe checkpoint' : 'No active training';
  el('trained-games').textContent = model ? numberFormat(model.trainedGames) : '—';
  el('model-detail').textContent = model?.lastCudaRefinement ? `Last GPU refinement: ${numberFormat(model.lastCudaRefinement.samples)} samples` : 'Current model weights';
  el('phase').textContent = state === 'running' ? (job.lastCuda && /^(?:\[candidate \d+\] )?\[cuda\]/.test(job.logs?.at(-1)?.line || '') ? 'CUDA weight refinement' : 'CPU self-play / evaluation') : state === 'pausing' ? 'Checkpointing / stopping' : state;
  el('accelerator').textContent = job?.accelerator === 'cuda' ? 'NVIDIA CUDA + CPU self-play' : job ? 'CPU self-play and training' : '—';
  el('winner').textContent = job?.winner ? `Candidate ${job.winner}` : '—';
  el('checkpoint').textContent = job?.runFolder || '—';
  el('cuda-summary').textContent = job?.lastCuda || '—';
  el('log-path').textContent = job?.logPath || 'Full logs saved locally';
  showLogs(job);
  if (['paused','stopped','failed'].includes(state) && state !== lastJobState && job?.runFolder &&
      Array.from(el('resume').options).some(option => option.value === job.runFolder)) {
    el('resume').value = job.runFolder;
  }
  lastJobId = job?.id;
  lastJobState = state;
}
async function refresh() {
  try {
    const res = await fetch('/api/status', {cache:'no-store'});
    if (!res.ok) throw new Error(`Local server: HTTP ${res.status}`);
    const status = await res.json(); token = status.token;
    if (initial) { setConfig(status.settings); initial=false; }
    const running = ['running','pausing','stopping'].includes(status.current?.state);
    updateRuns(status.runs, running);
    showGpu(status.gpu);
    update(status.current, status.model);
  } catch (err) { toast(`Connection lost: ${err.message}`); }
}
el('settings-form').addEventListener('submit', async event => {
  event.preventDefault();
  try {
    const payload = {settings:config(), resumeFolder:el('resume').value};
    el('start-btn').disabled=true; el('start-btn').textContent='Checking hardware…';
    const result=await api('/api/start',payload);
    if (result.job.accelerator !== 'cuda' && payload.settings.gpuMode==='auto') toast('Started CPU self-play. CUDA not available; check GPU status for details.');
    await refresh();
  } catch (err) { toast(err.message); await refresh(); }
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
el('resume').addEventListener('change', async () => {
  if (!el('resume').value) return;
  const status=await fetch('/api/status').then(res=>res.json());
  const selected=status.runs.find(run=>run.id===el('resume').value);
  if (selected?.config) setConfig({ ...config(), ...selected.config });
});
el('clear-view').addEventListener('click', () => { el('log-screen').replaceChildren(); el('log-screen').dataset.signature='cleared'; lineCount=0; });
refresh(); setInterval(refresh, 1600);
