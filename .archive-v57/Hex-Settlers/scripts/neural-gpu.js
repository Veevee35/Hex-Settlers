'use strict';
// Executed only by isolated local trainers; no GPU dependency in the game server.
const path = require('node:path');
const { spawn } = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(__dirname, 'neural_cuda_optimizer.py');
const pythonExe = () => String(process.env.TRAINER_PYTHON || 'python').trim();
const MAX_OUTPUT = 8000;
function runPython(args, timeoutMs = 90000, pythonCommand = pythonExe()) {
  return new Promise((resolve, reject) => {
    const child = spawn(pythonCommand, [SCRIPT, ...args], { cwd: ROOT, windowsHide: true, env: { ...process.env, PYTHONUNBUFFERED: '1' } });
    let stdout = '', stderr = '', done = false;
    const timeout = setTimeout(() => {
      child.kill();
      finish(new Error(`CUDA optimizer exceeded ${timeoutMs}ms. ${stderr}`));
    }, timeoutMs);
    function finish(err, output) {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      err ? reject(err) : resolve(output);
    }
    child.stdout.on('data', data => { stdout = (stdout + data).slice(-MAX_OUTPUT); });
    child.stderr.on('data', data => { stderr = (stderr + data).slice(-MAX_OUTPUT); });
    child.once('error', error => finish(new Error(`Cannot launch Python '${pythonCommand}': ${error.message}`)));
    child.once('close', code => finish(code === 0 ? null : new Error(`CUDA optimizer failed (${code}): ${stderr || stdout}`), stdout.trim()));
  });
}
async function ensureCuda(pythonCommand = pythonExe()) {
  const raw = await runPython(['--check'], 45000, pythonCommand);
  return JSON.parse(raw.split(/\r?\n/).filter(Boolean).at(-1));
}
async function refine(modelPath, samplesPath) {
  const epochs = Math.max(1, Math.min(20, Number(process.env.GPU_EPOCHS || 3) | 0));
  const miniBatch = Math.max(16, Math.min(8192, Number(process.env.GPU_MINIBATCH || 256) | 0));
  const raw = await runPython(['--model', modelPath, '--samples', samplesPath, '--epochs', String(epochs), '--mini-batch', String(miniBatch)], 300000);
  return JSON.parse(raw.split(/\r?\n/).filter(Boolean).at(-1));
}
module.exports = { ensureCuda, refine };
