#!/usr/bin/env node
'use strict';

// Cross-platform, non-destructive smoke test for Windows PowerShell/Codex and CI.
// Runs a single real AI-vs-AI game against a *copy* of the trained model.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'hex-neural-smoke-'));
const originalModel = path.resolve(process.env.MODEL_PATH || path.join(root, 'neural_ai_model.json'));
const model = path.join(temp, 'neural_ai_model.json');
const report = path.join(root, 'scripts', 'output', 'neural_ai_smoke_1.json');
if (!fs.existsSync(originalModel)) {
  console.error(`Missing model: ${originalModel}`);
  process.exit(1);
}
fs.copyFileSync(originalModel, model);
console.log(`[smoke] Running one headless Classic match using a disposable model. Report: ${report}`);
const child = spawn(process.execPath, [path.join(__dirname, 'train_neural_ai_all_maps.js')], {
  cwd: root,
  env: {
    ...process.env,
    MODEL_PATH: model,
    TRAINING_OUTPUT: report,
    SIMS: '1',
    BATCH_SIZE: '1',
    CONCURRENCY: '1',
    MAP_SET: 'standard',
    RESUME_TRAINING: '0',
    RESUME_RUN_DIR: '',
    KEEP_TRAINING_TEMP: '0',
  },
  stdio: 'inherit',
  windowsHide: true,
});
child.once('error', (error) => {
  console.error('[smoke] Trainer launch failed:', error.message);
  fs.rmSync(temp, { recursive: true, force: true });
  process.exitCode = 1;
});
child.once('exit', (code) => {
  fs.rmSync(temp, { recursive: true, force: true });
  if (code !== 0) console.error('[smoke] Failed. Verify npm ci and inspect the error above. Your original model is untouched.');
  else console.log('[smoke] Passed. Your original neural_ai_model.json is unchanged.');
  process.exitCode = code || 0;
});
