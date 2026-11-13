'use strict';
// Estimates are capacity planning aids, not CUDA allocator measurements.
const { execFile } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
function estimateGpuMemory(settings = {}) {
  const players = Number(settings.arenaPlayers) || 8;
  const batch = Number(settings.arenaBatch) || 32768;
  const miniBatch = Number(settings.miniBatch) || 256;
  const examples = (Number(settings.batch) || 100) * players * 13;
  // Approximate persistent + temporary tensors in vectorized self-play. 128-320 bytes
  // per seat + intermediate torch allocations; multiplied for allocator headroom.
  const arenaMin = Math.ceil((batch * players * 128 * 1.7) / 1048576 + 500);
  const arenaMax = Math.ceil((batch * players * 320 * 3) / 1048576 + 1200);
  const optimizerMin = Math.ceil(350 + examples * 17 * 4 / 1048576);
  const optimizerMax = Math.ceil(1100 + (examples * 17 * 4 * 5 + miniBatch * 1024) / 1048576);
  return { arenaMiB: [arenaMin, arenaMax], optimizerMiB: [optimizerMin, optimizerMax],
    note: 'Planning range, not a memory reservation. PyTorch, desktop displays and other GPU workloads add overhead. Verify actual VRAM below.' };
}
function nvidiaSmiCandidates() {
  const items = ['nvidia-smi'];
  if (process.platform === 'win32') {
    items.push(path.join(process.env.WINDIR || 'C:\\Windows', 'System32', 'nvidia-smi.exe'));
    items.push('C:\\Program Files\\NVIDIA Corporation\\NVSMI\\nvidia-smi.exe');
  }
  return items;
}
function queryCandidate(cmd) {
  return new Promise(resolve => {
    execFile(cmd, ['--query-gpu=index,name,memory.total,memory.used,utilization.gpu,temperature.gpu,power.draw', '--format=csv,noheader,nounits'],
      { windowsHide:true, timeout:2500, maxBuffer:15000 }, (error, stdout) => {
        if (error) return resolve(null);
        const cards = stdout.trim().split(/\r?\n/).map(row=>row.split(',').map(s=>s.trim())).filter(row=>row.length >= 7).map(row=>({
          index:Number(row[0]), name:row[1], totalMiB:Number(row[2]), usedMiB:Number(row[3]),
          freeMiB:Number(row[2])-Number(row[3]), utilizationPercent:Number(row[4]),
          temperatureC:Number(row[5]), watts:Number(row[6]),
        })).filter(card=>Number.isFinite(card.totalMiB) && card.totalMiB>0);
        resolve(cards.length ? cards : null);
      });
  });
}
async function gpuTelemetry() {
  for (const executable of nvidiaSmiCandidates()) {
    const results = await queryCandidate(executable);
    if (results) return { available:true, devices:results, updatedAt:new Date().toISOString() };
  }
  return { available:false, devices:[], error:'nvidia-smi not found or NVIDIA telemetry unavailable', updatedAt:new Date().toISOString() };
}
module.exports={estimateGpuMemory,gpuTelemetry};
