'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { test } = require('node:test');
const WebSocket = require('ws');

async function availablePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const port = s.address().port;
      s.close(err => err ? reject(err) : resolve(port));
    });
  });
}

async function startHarness(t) {
  const port = await availablePort();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hex-v40-custom78-'));
  let logs = '';
  const child = spawn(process.execPath, ['server.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', DATA_DIR: dir, NODE_ENV: 'test' },
    stdio: ['ignore','pipe','pipe','ipc'],
  });
  child.stdout.on('data', d => logs += String(d));
  child.stderr.on('data', d => logs += String(d));
  const deadline = Date.now() + 12000;
  let ready = false;
  while (Date.now() < deadline) {
    try { const r = await fetch(`http://127.0.0.1:${port}/`); if (r.ok) {ready=true;break;} } catch (_) {}
    await new Promise(resolve => setTimeout(resolve,60));
  }
  if (!ready) throw new Error('Server did not start: '+logs);
  const connections = [];
  t.after(async () => {
    for (const ws of connections) ws.terminate();
    if (child.exitCode == null) { child.kill('SIGTERM'); await once(child,'exit'); }
    fs.rmSync(dir,{recursive:true,force:true});
  });
  async function peer() {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    connections.push(ws);
    const queue = [], waiters = [];
    ws.on('message', raw => {
      const m = JSON.parse(String(raw));
      const n=waiters.findIndex(w=>w.pred(m));
      if(n>=0){const w=waiters.splice(n,1)[0];clearTimeout(w.timer);w.resolve(m)}
      else queue.push(m);
    });
    await once(ws,'open');
    const p = {
      send: msg => ws.send(JSON.stringify(msg)),
      wait: (pred,ms=6000) => {
        const i=queue.findIndex(pred);
        if(i>=0)return Promise.resolve(queue.splice(i,1)[0]);
        return new Promise((resolve,reject)=>{
          const w={pred,resolve,timer:null};
          w.timer=setTimeout(()=>{const ix=waiters.indexOf(w);if(ix>=0)waiters.splice(ix,1);reject(new Error('Timeout; queued: '+JSON.stringify(queue.slice(-12).map(m=>({type:m.type,error:m.error})))));},ms);
          waiters.push(w);
        });
      },
    };
    await p.wait(m=>m.type==='hello');
    p.send({type:'auth_register',username:'v40_'+Math.random().toString(36).slice(2),password:'v40 test password',displayName:'Builder'});
    await p.wait(m=>m.type==='auth_ok');
    return p;
  }
  return {peer, port};
}

test('v40 Classic 7–8 unranked dynamic shape, editable tiles, portable JSON and eight seats', {timeout:25000},async t => {
  const {peer} = await startHarness(t), host = await peer();
  host.send({type:'create_room'});
  await host.wait(m=>m.type==='joined');
  host.send({type:'set_rules',rules:{mapMode:'classic78',customMap:false}});
  const room = await host.wait(m=>m.type==='room' && m.room.rules?.mapMode==='classic78');
  assert.equal(room.room.maxPlayers,8);
  assert.equal(room.room.rules.customMap,true);
  const blank = await host.wait(m=>m.type==='state' && m.state.previewKey==='classic78:custom');
  assert.equal(blank.state.geom.tiles.length,1);
  host.send({type:'edit_preview_grid',operation:'add',q:3,r:-1});
  const added = await host.wait(m=>m.type==='state' && m.state.geom.tiles.length===2);
  assert.deepEqual(added.state.geom.tiles.map(t=>[t.q,t.r]),[[0,0],[3,-1]]);
  host.send({type:'edit_preview_tile',tileId:1,tileType:'forest',number:9});
  await host.wait(m=>m.type==='state' && m.state.geom.tiles[1]?.type==='forest');
  host.send({type:'edit_preview_grid',operation:'add',q:0,r:1});
  await host.wait(m=>m.type==='state' && m.state.geom.tiles.length===3);
  host.send({type:'download_custom_map'});
  const file = (await host.wait(m=>m.type==='custom_map_file')).map;
  assert.equal(file.version,2);
  assert.equal(file.mapKind,'classic78');
  assert.equal(file.tiles.length,3);
  assert.equal(file.tiles[1].type,'forest');
  host.send({type:'edit_preview_grid',operation:'remove',q:3,r:-1});
  await host.wait(m=>m.type==='state' && m.state.geom.tiles.length===2);
  host.send({type:'upload_custom_map',map:file});
  await host.wait(m=>m.type==='custom_map_loaded');
  const restored=await host.wait(m=>m.type==='state' && m.state.geom.tiles.length===3 && m.state.geom.tiles[1].type==='forest');
  assert.equal(restored.state.geom.tiles[1].number,9);
  host.send({type:'upload_custom_map',map:{...file,tiles:[file.tiles[0],file.tiles[0]]}});
  assert.match((await host.wait(m=>m.type==='error')).error,/invalid/i);
  host.send({type:'fill_ai',targetCount:8});
  const full=await host.wait(m=>m.type==='room' && m.room.players.length===8);
  assert.equal(full.room.maxPlayers,8);
  host.send({type:'set_ready',ready:true});
  await host.wait(m=>m.type==='room' && m.room.players.some(p=>!p.isAI && p.ready));
  host.send({type:'start_game'});
  const started=await host.wait(m=>m.type==='state' && m.state.phase !== 'lobby',8000);
  assert.equal(started.state.players.length,8);
  assert.equal(started.state.geom.tiles.length,3);
  assert.equal(started.state.rules.mapMode,'classic78');
});

test('v40 Seafarers 7–8 custom map and Casual protection', {timeout:25000},async t => {
  const {peer}=await startHarness(t), host=await peer();
  host.send({type:'create_room',casual:true});
  await host.wait(m=>m.type==='joined');
  host.send({type:'set_rules',rules:{mapMode:'classic78'}});
  assert.match((await host.wait(m=>m.type==='error')).error,/casual/i);
  host.send({type:'set_rules',rules:{mapMode:'seafarers',seafarersScenario:'test_builder_78'}});
  assert.match((await host.wait(m=>m.type==='error')).error,/casual/i);
  host.send({type:'leave_room',switchMode:'unranked'});
  await host.wait(m=>m.type==='left_room');
  host.send({type:'create_room'});
  await host.wait(m=>m.type==='joined');
  host.send({type:'set_rules',rules:{mapMode:'seafarers',seafarersScenario:'test_builder_78'}});
  const room=await host.wait(m=>m.type==='room' && m.room.rules?.seafarersScenario==='test_builder_78');
  assert.equal(room.room.maxPlayers,8);
  const blank=await host.wait(m=>m.type==='state' && m.state.previewKey==='seafarers:test_builder_78');
  assert.equal(blank.state.geom.tiles.length,1);
  host.send({type:'edit_preview_grid',operation:'add',q:2,r:2});
  await host.wait(m=>m.type==='state' && m.state.geom.tiles.length===2);
  host.send({type:'download_custom_map'});
  const file=(await host.wait(m=>m.type==='custom_map_file')).map;
  assert.equal(file.version,2);
  assert.equal(file.mapKind,'test_builder_78');
  host.send({type:'upload_custom_map',map:{...file,mapKind:'classic78'}});
  assert.match((await host.wait(m=>m.type==='error')).error,/invalid/i);
  host.send({type:'upload_custom_map',map:file});
  await host.wait(m=>m.type==='custom_map_loaded');
});
