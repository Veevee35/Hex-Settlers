'use strict';
const assert = require('node:assert/strict');
const {test} = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const {spawn} = require('node:child_process');
const {once} = require('node:events');
const WebSocket = require('ws');

async function freePort() {
  const server = net.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

test('v46 player-count selection caps seats while 7/8 preview variants follow occupied seats', {timeout:50000}, async t => {
  const port = await freePort();
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'hex-v44-'));
  let logs = '';
  const child = spawn(process.execPath, ['server.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: {...process.env, PORT: String(port), HOST:'127.0.0.1', DATA_DIR:data, NODE_ENV:'test'},
    stdio:['ignore','pipe','pipe'],
  });
  child.stdout.on('data', d => { logs += String(d); });
  child.stderr.on('data', d => { logs += String(d); });
  const sockets = [];
  t.after(async () => {
    sockets.forEach(ws => ws.terminate());
    if (child.exitCode == null) {child.kill('SIGTERM');await once(child, 'exit');}
    fs.rmSync(data, {recursive:true,force:true});
  });
  for (let i = 0; i < 180; i++) {
    try { if ((await fetch(`http://127.0.0.1:${port}/`)).ok) break; } catch (_) {}
    if (i === 179) throw new Error(`Server failed to boot: ${logs}`);
    await new Promise(resolve=>setTimeout(resolve,40));
  }
  async function newHost() {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    sockets.push(ws);
    const queue = [], waiters = [];
    ws.on('message', raw => {
      const msg=JSON.parse(String(raw));
      const idx=waiters.findIndex(w => w.predicate(msg));
      if (idx === -1) queue.push(msg);
      else waiters.splice(idx, 1)[0].resolve(msg);
    });
    await once(ws, 'open');
    const wait = (predicate, timeout=10000) => {
      const idx=queue.findIndex(predicate);
      if (idx>=0) return Promise.resolve(queue.splice(idx, 1)[0]);
      return new Promise((resolve,reject) => {
        const waiter = {predicate,resolve:m => {clearTimeout(timer);resolve(m)}};
        const timer = setTimeout(()=>{
          const i=waiters.indexOf(waiter);if(i>=0)waiters.splice(i,1);
          reject(new Error('Timeout: '+JSON.stringify(queue.slice(-6).map(m=>({type:m.type,error:m.error,key:m.state?.previewKey})))));
        },timeout);
        waiters.push(waiter);
      });
    };
    const send = x => ws.send(JSON.stringify(x));
    await wait(m=>m.type==='hello');
    send({type:'auth_register',username:`v44_${Math.random().toString(36).slice(2)}`,password:'v44 password for integration test'});
    await wait(m=>m.type==='auth_ok');
    send({type:'create_room'});
    await wait(m=>m.type==='joined');
    return {send,wait};
  }

  const host=await newHost();
  host.send({type:'set_rules',rules:{mapMode:'seafarers',seafarersScenario:'scattered_tiles_78',playerCount:8}});
  const eight=(await host.wait(m=>m.type==='room' && m.room.rules?.playerCount===8)).room;
  assert.equal(eight.players.length,1);
  assert.equal(eight.maxPlayers,8);
  const initialSevenPreview=(await host.wait(m=>m.type==='state' && m.state.previewKey==='seafarers:scattered_tiles_78_7')).state;
  assert.equal(initialSevenPreview.geom.tiles.filter(x=>Number.isInteger(x.number)).length,42);
  host.send({type:'fill_ai',targetCount:7});
  await host.wait(m=>m.type==='room' && m.room.players.length===7);
  // The seventh occupied seat must still use the seven-player inventory,
  // even though Game Setup allows up to eight players.
  const sevenSeatPreview=(await host.wait(m=>m.type==='state' && m.state.previewKey==='seafarers:scattered_tiles_78_7')).state;
  assert.equal(sevenSeatPreview.geom.tiles.filter(x=>Number.isInteger(x.number)).length,42);
  host.send({type:'fill_ai',targetCount:8});
  await host.wait(m=>m.type==='room' && m.room.players.length===8);
  const eightSeatPreview=(await host.wait(m=>m.type==='state' && m.state.previewKey==='seafarers:scattered_tiles_78_8')).state;
  assert.equal(eightSeatPreview.geom.tiles.filter(x=>Number.isInteger(x.number)).length,48);
  // Removing the eighth AI must restore the seven-player board without
  // changing the 8-player target in Game Setup.
  host.send({type:'fill_ai',targetCount:7});
  await host.wait(m=>m.type==='room' && m.room.players.length===7 && m.room.rules?.playerCount===8);
  const backToSeven=(await host.wait(m=>m.type==='state' && m.state.previewKey==='seafarers:scattered_tiles_78_7')).state;
  assert.equal(backToSeven.geom.tiles.filter(x=>Number.isInteger(x.number)).length,42);
  host.send({type:'fill_ai',targetCount:8});
  await host.wait(m=>m.type==='room' && m.room.players.length===8);
  await host.wait(m=>m.type==='state' && m.state.previewKey==='seafarers:scattered_tiles_78_8');

  host.send({type:'set_rules',rules:{mapMode:'seafarers',seafarersScenario:'scattered_tiles_78',playerCount:7}});
  const reduced=(await host.wait(m=>m.type==='room' && m.room.rules?.playerCount===7)).room;
  assert.equal(reduced.maxPlayers,7);
  assert.equal(reduced.players.length,7, 'changing eight-player target to seven removes the excess AI seat');
  const sevenPreview=(await host.wait(m=>m.type==='state' && m.state.previewKey==='seafarers:scattered_tiles_78_7')).state;
  assert.equal(sevenPreview.geom.tiles.filter(x=>Number.isInteger(x.number)).length,42);
  host.send({type:'fill_ai',targetCount:8});
  assert.equal((await host.wait(m=>m.type==='room' && m.room.players.length===7)).room.players.length,7);
  host.send({type:'set_ready',ready:true});
  await host.wait(m=>m.type==='room' && m.room.players.every(p=>p.ready));
  host.send({type:'start_game'});
  const started=(await host.wait(m=>m.type==='state' && m.state.phase!=='lobby')).state;
  assert.equal(started.players.length,7);
  assert.equal(started.rules.seafarersScenario,'scattered_tiles_78_7');

  const next=await newHost();
  next.send({type:'set_rules',rules:{mapMode:'seafarers',seafarersScenario:'cartographer_78',playerCount:8}});
  assert.equal((await next.wait(m=>m.type==='room' && m.room.rules?.playerCount===8)).room.maxPlayers,8);
  await next.wait(m=>m.type==='state' && m.state.previewKey==='seafarers:cartographer_78_7');
  next.send({type:'fill_ai',targetCount:7});
  await next.wait(m=>m.type==='room' && m.room.players.length===7);
  await next.wait(m=>m.type==='state' && m.state.previewKey==='seafarers:cartographer_78_7');
  next.send({type:'set_ready',ready:true});
  await next.wait(m=>m.type==='room' && m.room.players.every(p=>p.ready));
  next.send({type:'start_game'});
  assert.match((await next.wait(m=>m.type==='error')).error,/set to 8 players/i);
  next.send({type:'fill_ai',targetCount:8});
  await next.wait(m=>m.type==='room' && m.room.players.length===8);
  await next.wait(m=>m.type==='state' && m.state.previewKey==='seafarers:cartographer_78_8');
  next.send({type:'start_game'});
  const cart=(await next.wait(m=>m.type==='state' && m.state.phase==='cartographer-draft')).state;
  assert.equal(cart.players.length,8);
  assert.equal(cart.rules.seafarersScenario,'cartographer_78_8');

  const three=await newHost();
  three.send({type:'set_rules',rules:{mapMode:'classic',playerCount:3}});
  assert.equal((await three.wait(m=>m.type==='room' && m.room.rules?.playerCount===3)).room.maxPlayers,3);
  three.send({type:'fill_ai',targetCount:4});
  await three.wait(m=>m.type==='room' && m.room.players.length===3);
  three.send({type:'set_rules',rules:{mapMode:'classic',playerCount:2}});
  const trimmed=(await three.wait(m=>m.type==='room' && m.room.rules?.playerCount===2)).room;
  assert.equal(trimmed.players.length,2);
  assert.equal(trimmed.maxPlayers,2);
});

test('v44 editor retains painting/ports but removes all custom hex-shape controls',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
  const app=fs.readFileSync(path.join(__dirname,'../public/app.js'),'utf8');
  assert.match(html,/<select id="playerCountSelect"/);
  assert.match(app,/playerCount: Number\(ui\.playerCountSelect\?\.value/);
  assert.match(app,/syncPlayerCountOptions\(r\.playerCount\)/);
  assert.match(app,/uiMapModeFromRules\(room\?\.rules\) === 'seafarers78'/);
  assert.match(app,/target <= effectiveMaxPlayers/);
  assert.doesNotMatch(html,/custom78Coords|custom78AddBtn|custom78RemoveBtn|Add tile \(7–8\)|Remove tile \(7–8\)/);
  assert.doesNotMatch(app,/custom78Coords|custom78AddBtn|custom78RemoveBtn/);
  assert.match(html,/<option value="fog">Fog \(hide existing tile\)<\/option>/);
  assert.match(html,/id="customMapDownloadBtn"/);
  assert.match(html,/id="customMapUploadBtn"/);
});
