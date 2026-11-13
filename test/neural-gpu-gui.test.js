'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { normalize } = require('../scripts/neural_trainer_gui');
const { ensureCuda } = require('../scripts/neural-gpu');
const ROOT = path.resolve(__dirname, '..');

test('dashboard validates evolutionary parameters before launching children', () => {
  const baseline = { sims: 20000, generation: 1000, shards: 4, batch: 100, concurrency: 2, mapSet:'standard', rules:'auto', gpuMode:'auto', epochs: 3, miniBatch: 256, python:'python' };
  assert.deepEqual(normalize(baseline), baseline);
  assert.throws(() => normalize({ ...baseline, sims: 20001 }), /divisible/);
  assert.throws(() => normalize({ ...baseline, shards: 100 }), /64/);
  assert.throws(() => normalize({ ...baseline, rules: 'wasm' }), /rules backend/);
  assert.throws(() => normalize({ ...baseline, gpuMode: 'webgl' }), /GPU mode/);
  assert.throws(() => normalize({ ...baseline, python: 'python\n--bad' }), /Python/);
});

test('CUDA-check failure is explicit for an invalid Python executable', async () => {
  await assert.rejects(ensureCuda('definitely-no-python-hex-settlers'), /Cannot launch Python/);
});

function get(port, route) {
  return new Promise((resolve, reject) => {
    const req=http.get({hostname:'127.0.0.1',port,path:route},res=>{
      let data=''; res.on('data',part=>data+=part);res.on('end',()=>resolve({status:res.statusCode, body:data}));
    });req.on('error',reject);
  });
}
function post(port, route, data, token, origin='') {
  return new Promise((resolve,reject)=>{
    const payload=JSON.stringify(data);
    const req=http.request({hostname:'127.0.0.1',port,path:route,method:'POST',headers:{
      'content-type':'application/json', 'content-length':Buffer.byteLength(payload),
      'x-hex-trainer-token':token, 'origin':origin,
    }},res=>{let body='';res.on('data',part=>body+=part);res.on('end',()=>resolve({status:res.statusCode, body:JSON.parse(body)}));});
    req.on('error',reject);req.end(payload);
  });
}

test('GUI serves locally, forbids cross-origin actions, and rejects invalid jobs', async (t) => {
  const child=spawn(process.execPath,[path.join(ROOT,'scripts','neural_trainer_gui.js')],{
    cwd:ROOT,env:{...process.env,TRAINER_GUI_NO_BROWSER:'1'},stdio:['ignore','pipe','pipe'],windowsHide:true,
  });
  t.after(()=>{if(child.exitCode===null) child.kill();});
  let output='';let port;
  await Promise.race([
    new Promise((resolve,reject)=>{
      child.stdout.on('data',chunk=>{output+=chunk;const match=output.match(/127\.0\.0\.1:(\d+)/);if(match){port=Number(match[1]);resolve();}});
      child.once('error',reject);child.once('exit',code=>reject(new Error(`GUI exited ${code}: ${output}`)));
    }),
    new Promise((_,reject)=>setTimeout(()=>reject(new Error('GUI startup timed out')),6000)),
  ]);
  const page=await get(port,'/'); assert.equal(page.status,200);assert.match(page.body,/Neural training/);
  const info=await get(port,'/api/status');assert.equal(info.status,200);
  const token=JSON.parse(info.body).token;
  const bad=await post(port,'/api/pause',{},token,'http://evil.example');assert.equal(bad.status,403);
  const invalid=await post(port,'/api/start',{settings:{sims:15,generation:10}},token,`http://127.0.0.1:${port}`);
  assert.equal(invalid.status,400);assert.match(invalid.body.error,/divisible/);
  const after=JSON.parse((await get(port,'/api/status')).body);
  assert.equal(after.current,null);
});
