'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {parity} = require('../scripts/cuda-exact/exact_parity');

test('native CPU step matches production server rules for 4–8 player production and bank trades', t => {
  const scriptDir=path.resolve(__dirname,'../scripts/cuda-exact');
  const executable=path.join(scriptDir,process.platform==='win32'?'hex_exact_cpu.exe':'hex_exact_cpu');
  if(!fs.existsSync(executable)) {
    const cc=spawnSync('g++',['--version'],{timeout:3000});
    if(cc.status!==0) return t.skip('No native compiler or prebuilt exact CPU runner');
  }
  const result=parity({backend:'cpu',count:360});
  assert.equal(result.cases,360);
  assert.match(result.verified,/subsets only/);
});
test('kernel parity cannot claim complete CUDA self-play', () => {
  const header=fs.readFileSync(path.resolve(__dirname,'../scripts/cuda-exact/hex_exact_common.h'),'utf8');
  const source=fs.readFileSync(path.resolve(__dirname,'../scripts/neural_trainer_gui.js'),'utf8');
  assert.match(header,/op 0=production, op 1=validated bank trade/);
  assert.match(source,/fullGameGpu:false/);
  assert.match(source,/TRAINING_AI_ACTION_BUDGET/);
});
