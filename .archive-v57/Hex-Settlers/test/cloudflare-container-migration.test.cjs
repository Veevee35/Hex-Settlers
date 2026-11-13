'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.join(__dirname, '..');

function execute(script, args=[], env={}) {
  return new Promise((resolve,reject)=>{
    const proc=spawn(process.execPath,[script,...args],{cwd:root,env:{...process.env,...env},stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='';
    proc.stdout.on('data',c=>stdout+=c);
    proc.stderr.on('data',c=>stderr+=c);
    proc.once('error',reject);
    proc.once('close',code=>resolve({code,stdout,stderr}));
  });
}

async function mockStateServer(objects) {
  const requested=[];
  const server=http.createServer(async(req,res)=>{
    const url = new URL(req.url,'http://localhost');
    requested.push(`${req.method} ${url.pathname}${url.search}`);
    if (url.searchParams.get('list')==='textures') {
      res.setHeader('Content-Type','application/json');
      res.end(JSON.stringify({keys:[...objects.keys()].filter(k=>k.startsWith('state/texture-packs/')),cursor:null}));
      return;
    }
    const key=decodeURIComponent(url.pathname).replace(/^\//,'');
    if (req.method==='PUT') {
      const chunks=[];for await(const c of req) chunks.push(c);
      objects.set(key,Buffer.concat(chunks));res.writeHead(201);res.end('Stored');return;
    }
    if (req.method==='DELETE') {objects.delete(key);res.writeHead(204);res.end();return;}
    if (!objects.has(key)) {res.writeHead(404);res.end('Not found');return;}
    res.setHeader('Content-Type','application/octet-stream');res.end(objects.get(key));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  return {url:`http://127.0.0.1:${server.address().port}`,requested,close:()=>new Promise(resolve=>server.close(resolve))};
}

test('Cloudflare staging and production configs have no Railway proxy and isolate state',()=>{
  const staging=JSON.parse(fs.readFileSync(path.join(root,'wrangler.container.staging.jsonc'),'utf8'));
  const prod=JSON.parse(fs.readFileSync(path.join(root,'wrangler.container.production.jsonc'),'utf8'));
  const defaultConfig=JSON.parse(fs.readFileSync(path.join(root,'wrangler.jsonc'),'utf8'));
  assert.equal(defaultConfig.name,staging.name);
  assert.equal(prod.name,'hex-settlers');
  assert.notEqual(staging.name,prod.name);
  assert.notEqual(staging.r2_buckets[0].bucket_name,prod.r2_buckets[0].bucket_name);
  for(const config of [staging,prod]) {
    assert.equal(config.main,'cloudflare/container-worker.mjs');
    assert.equal(config.containers[0].max_instances,1);
    assert.equal(config.containers[0].class_name,'HexGameContainer');
    assert.equal(config.exports.HexGameContainer.storage,'sqlite');
    assert.equal(config.r2_buckets[0].binding,'STATE');
    assert.ok(!JSON.stringify(config).includes('railway'));
  }
  const worker=fs.readFileSync(path.join(root,'cloudflare/container-worker.mjs'),'utf8');
  assert.match(worker,/export \{ ContainerProxy \}/);
  assert.match(worker,/getContainer\(env\.HEX_BACKEND, 'hex-settlers-primary'\)/);
  assert.ok(!worker.includes('UPSTREAM_ORIGIN'));
});

test('Cloudflare state bootstrap hydrates private R2 JSON and uploaded texture assets',async()=>{
  const tex=`state/texture-packs/${'a'.repeat(36)}/resources/forest.png`;
  const objects=new Map([
    ['state/users.json',Buffer.from('{"version":2,"users":[]}')],
    ['state/game_history.json',Buffer.from('{"version":1,"games":[]}')],
    [tex,Buffer.from('not real PNG test bytes')]
  ]);
  const bridge=await mockStateServer(objects);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hex-cf-bootstrap-'));
  try {
    const run=await execute('cloudflare/bootstrap.mjs',[],{CLOUDFLARE_STATE_ENDPOINT:bridge.url,DATA_DIR:dir,ALLOW_EMPTY_DATABASE:'0'});
    assert.equal(run.code,0,run.stderr);
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'users.json'),'utf8')).users.length,0);
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'game_history.json'),'utf8')).games.length,0);
    assert.deepEqual(fs.readFileSync(path.join(dir,'texture-packs', 'a'.repeat(36),'resources','forest.png')),objects.get(tex));
    assert.ok(bridge.requested.some(r=>r.includes('list=textures')));
  } finally {fs.rmSync(dir,{recursive:true,force:true});await bridge.close();}
});

test('Cloudflare boot never silently replaces a missing users.json',async()=>{
  const bridge=await mockStateServer(new Map([['state/game_history.json',Buffer.from('{"games":[]}')]]));
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hex-cf-missing-'));
  try {
    const run=await execute('cloudflare/bootstrap.mjs',[],{CLOUDFLARE_STATE_ENDPOINT:bridge.url,DATA_DIR:dir,ALLOW_EMPTY_DATABASE:'0'});
    assert.notEqual(run.code,0);
    assert.match(run.stderr+run.stdout,/users\.json missing from R2/i);
  } finally {fs.rmSync(dir,{recursive:true,force:true});await bridge.close();}
});

test('Cloudflare state synchronization sends authoritative files to the R2 bridge',async()=>{
  const objects=new Map();const bridge=await mockStateServer(objects);
  try {
    const result=await execute('-e', [
      "const state=require('./cloudflare/state-sync.js');state.persistJsonFile('/data/users.json','{\\\"users\\\":[]}').then(()=>console.log('ok')).catch(e=>{console.error(e);process.exitCode=1})"
    ],{CLOUDFLARE_STATE_ENDPOINT:bridge.url});
    assert.equal(result.code,0,result.stderr);
    assert.ok(objects.has('state/users.json'));
    assert.equal(JSON.parse(objects.get('state/users.json').toString()).users.length,0);
  } finally {await bridge.close();}
});
