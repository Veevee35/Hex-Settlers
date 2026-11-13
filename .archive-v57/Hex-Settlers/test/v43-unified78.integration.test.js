'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const WebSocket = require('ws');

async function freePort() {
  const server = net.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

function counts(state) {
  const tileTypes = {};
  for (const tile of state.geom.tiles) tileTypes[tile.type] = (tileTypes[tile.type] || 0) + 1;
  return { tileTypes, discs: state.geom.tiles.filter(t => Number.isInteger(t.number)).length, ports: state.geom.ports.length };
}

test('v43 unified 7–8 choices auto-change maps at 8 occupied seats, with AI filling and starting both sizes', {timeout: 120000}, async t => {
  const port = await freePort();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hex-v43-unified-'));
  let logs = '';
  const child = spawn(process.execPath, ['server.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: {...process.env, PORT: String(port), HOST: '127.0.0.1', DATA_DIR: tempDir, NODE_ENV: 'test'},
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', d => { logs += String(d); });
  child.stderr.on('data', d => { logs += String(d); });
  const sockets = [];
  t.after(async () => {
    sockets.forEach(ws => ws.terminate());
    if (child.exitCode == null) { child.kill('SIGTERM'); await once(child, 'exit'); }
    fs.rmSync(tempDir, {recursive:true,force:true});
  });
  for(let i=0;i<180;i++) {
    try { if ((await fetch(`http://127.0.0.1:${port}/`)).ok) break; } catch(_) {}
    if (i===179) throw new Error('Server did not start: ' + logs);
    await new Promise(r=>setTimeout(r,60));
  }

  async function makeHost(createRoom = true) {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    sockets.push(ws);
    const queue = [], waiters = [];
    ws.on('message', raw => {
      const msg = JSON.parse(String(raw));
      const i = waiters.findIndex(w => w.predicate(msg));
      if (i>=0) waiters.splice(i,1)[0].resolve(msg);
      else queue.push(msg);
    });
    await once(ws,'open');
    function wait(predicate, timeout=10000) {
      const i = queue.findIndex(predicate);
      if(i>=0) return Promise.resolve(queue.splice(i,1)[0]);
      return new Promise((resolve,reject) => {
        const waiter = {predicate,resolve: msg => {clearTimeout(timer);resolve(msg)}};
        const timer=setTimeout(()=>{const index=waiters.indexOf(waiter);if(index>=0)waiters.splice(index,1);reject(new Error('Timed out awaiting game state; received '+JSON.stringify(queue.slice(-8).map(m => ({type:m.type,error:m.error,previewKey:m.state?.previewKey})))));},timeout);
        waiters.push(waiter);
      });
    }
    const send = msg => ws.send(JSON.stringify(msg));
    await wait(m=>m.type==='hello');
    send({type:'auth_register',username:`v43_${Math.random().toString(36).slice(2)}`,password:'password for v43 test'});
    await wait(m=>m.type==='auth_ok');
    let code = null;
    if (createRoom) {
      send({type:'create_room'});
      code = (await wait(m=>m.type==='joined')).room.code;
    }
    return {wait,send,code};
  }

  for (const scenario of ['scattered_tiles_78','cartographer_78']) {
    for (const playerCount of [7,8]) {
      const host=await makeHost();
      host.send({type:'set_rules',rules:{mapMode:'seafarers',seafarersScenario:scenario,customMap:false}});
      const selected = await host.wait(m => m.type==='room' && m.room.rules?.seafarersScenario===scenario);
      assert.equal(selected.room.maxPlayers, 8, 'all 7-8 scenarios have eight seats');
      const early = (await host.wait(m => m.type==='state' && m.state.previewKey === `seafarers:${scenario}_7`)).state;
      assert.equal(early.geom.tiles.length, 97);
      host.send({type:'fill_ai',targetCount:7});
      await host.wait(m=>m.type==='room' && m.room.players.length===7);
      const seven = (await host.wait(m=>m.type==='state' && m.state.previewKey===`seafarers:${scenario}_7`)).state;
      assert.equal(seven.players.length,7);
      if (scenario==='scattered_tiles_78') {
        const c=counts(seven);
        assert.equal(c.discs,42);
        assert.equal(c.ports,9);
        assert.equal(c.tileTypes.sea,48);
        for(const type of ['gold','hills','forest','pasture','field','mountains','desert']) assert.equal(c.tileTypes[type],7);
      }
      // The same scenario selection must automatically change preview inventory at 8.
      host.send({type:'fill_ai',targetCount:8});
      const eightRoom=await host.wait(m=>m.type==='room' && m.room.players.length===8);
      assert.equal(eightRoom.room.rules.seafarersScenario,scenario);
      const eight=(await host.wait(m=>m.type==='state' && m.state.previewKey===`seafarers:${scenario}_8`)).state;
      assert.equal(eight.players.length,8);
      if (scenario==='scattered_tiles_78') {
        const c=counts(eight);
        assert.equal(c.discs,48);assert.equal(c.ports,11);assert.equal(c.tileTypes.sea,41);
        for(const type of ['gold','hills','forest','pasture','field','mountains','desert'])assert.equal(c.tileTypes[type],8);
      }
      if (playerCount===7) {
        // Remove one AI: preview returns to the 7-seat inventory automatically.
        host.send({type:'fill_ai',targetCount:7});
        await host.wait(m=>m.type==='room' && m.room.players.length===7);
        await host.wait(m=>m.type==='state' && m.state.previewKey===`seafarers:${scenario}_7`);
      }
      host.send({type:'set_ready',ready:true});
      await host.wait(m=>m.type==='room' && m.room.players.length===playerCount && m.room.players.every(p=>p.ready));
      host.send({type:'start_game'});
      const started=(await host.wait(m=>m.type==='state' && m.state.phase!=='lobby',12000)).state;
      assert.equal(started.players.length,playerCount);
      assert.equal(started.rules.seafarersScenario,`${scenario}_${playerCount}`);
      if(scenario==='cartographer_78') {
        assert.equal(started.phase,'cartographer-draft');
        assert.equal(started.cartographerDraft.totalCount,97);
        const inv=started.cartographerDraft.inventoryByPlayer[started.currentPlayerId];
        assert.equal(inv.sea, playerCount===7 ? 7 : 6); // first turn corresponds to first seat in draft order
      } else {
        const c=counts(started);
        assert.equal(c.discs,playerCount===7 ? 42 : 48);
        assert.equal(c.ports,playerCount===7 ? 9 : 11);
      }
    }
  }

  // The host should receive a refreshed preview when a human takes the eighth
  // seat; simply sending the changed map to the joining player is not enough.
  const joiningHost = await makeHost();
  joiningHost.send({type:'set_rules',rules:{mapMode:'seafarers',seafarersScenario:'scattered_tiles_78'}});
  await joiningHost.wait(m=>m.type==='room' && m.room.rules?.seafarersScenario==='scattered_tiles_78');
  await joiningHost.wait(m=>m.type==='state' && m.state.previewKey==='seafarers:scattered_tiles_78_7');
  joiningHost.send({type:'fill_ai',targetCount:7});
  await joiningHost.wait(m=>m.type==='room' && m.room.players.length===7);
  await joiningHost.wait(m=>m.type==='state' && m.state.previewKey==='seafarers:scattered_tiles_78_7');
  const human = await makeHost(false);
  human.send({type:'join_room',code:joiningHost.code});
  const joined = await human.wait(m=>m.type==='joined');
  assert.equal(joined.room.players.length,8);
  assert.equal(joined.role,'player');
  const hostView=(await joiningHost.wait(m=>m.type==='state' && m.state.previewKey==='seafarers:scattered_tiles_78_8')).state;
  assert.equal(counts(hostView).discs,48);
  assert.equal(counts(hostView).ports,11);

  // Every 7–8 lobby, not just the two renamed options, must allow eight seats
  // via AI fill. This also covers both editable template modes.
  for (const [mapMode, seafarersScenario, customMap] of [
    ['classic78', undefined, false],
    ['classic78', undefined, true],
    ['seafarers','eight_islands_78',false],
    ['seafarers','through_the_desert_78',false],
    ['seafarers','fog_island_78',false],
    ['seafarers','test_builder_78',false],
  ]) {
    const host = await makeHost();
    host.send({type:'set_rules',rules:{mapMode,seafarersScenario,customMap}});
    const room = await host.wait(m=>m.type==='room' && m.room.rules?.mapMode===mapMode &&
      (seafarersScenario === undefined || m.room.rules?.seafarersScenario===seafarersScenario) &&
      (!!m.room.rules?.customMap===customMap));
    assert.equal(room.room.maxPlayers,8);
    host.send({type:'fill_ai',targetCount:8});
    const full = await host.wait(m=>m.type==='room' && m.room.players.length===8);
    assert.equal(full.room.players.filter(p=>p.isAI).length,7);
  }
});

test('v43 lobby only shows one option each and host AI seat picker respects server capacity',()=>{
  const html=fs.readFileSync(path.resolve(__dirname,'../public/index.html'),'utf8');
  const app=fs.readFileSync(path.resolve(__dirname,'../public/app.js'),'utf8');
  assert.match(html,/<option value="cartographer_78">Cartographer<\/option>/);
  assert.match(html,/<option value="scattered_tiles_78">Scattered Tiles<\/option>/);
  assert.doesNotMatch(html,/<option value="(?:cartographer|scattered_tiles)_78_[78]">/);
  assert.match(app,/Number\(room\?\.maxPlayers\) === 8/);
  assert.match(app,/const maxPlayers = is78Lobby \? 8/);
});
