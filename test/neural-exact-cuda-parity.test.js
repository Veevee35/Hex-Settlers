'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {parity, liveProductionParity, liveBankTradeParity} = require('../scripts/cuda-exact/exact_parity');

test('native CPU step matches production server rules for 4–8 player production and bank trades', t => {
  const scriptDir=path.resolve(__dirname,'../scripts/cuda-exact');
  const executable=path.join(scriptDir,process.platform==='win32'?'hex_exact_cpu.exe':'hex_exact_cpu');
  if(!fs.existsSync(executable)) {
    const cc=spawnSync('g++',['--version'],{timeout:3000});
    if(process.platform === 'win32' || cc.status!==0) return t.skip('No native compiler or prebuilt exact CPU runner');
  }
  const result=parity({backend:'cpu',count:360});
  assert.equal(result.cases,360);
  assert.match(result.verified,/subsets only/);
});

test('NVIDIA CUDA production and bank trades match authoritative JavaScript', t => {
  const executable = path.join(__dirname, '../scripts/cuda-exact',
    process.platform === 'win32' ? 'hex_exact_cuda.exe' : 'hex_exact_cuda');
  if (!fs.existsSync(executable)) return t.skip('Build the NVIDIA CUDA runner first');
  assert.equal(parity({ backend: 'cuda', count: 500, executable }).cases, 500);
});

test('live C++ production preserves hands, bank, blocked losses, and gold queue', t => {
  const addon = path.join(__dirname, '../native/hex-core/hex_rules_v5.node');
  if (!fs.existsSync(addon)) return t.skip('Build the Node-API addon first');
  assert.equal(liveProductionParity(), 1000);
});

test('live C++ bank trades preserve validated hand and bank changes', t => {
  const addon = path.join(__dirname, '../native/hex-core/hex_rules_v5.node');
  if (!fs.existsSync(addon)) return t.skip('Build the Node-API addon first');
  assert.equal(liveBankTradeParity(), 1000);
});
