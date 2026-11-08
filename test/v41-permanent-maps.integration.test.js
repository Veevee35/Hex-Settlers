'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const WebSocket = require('ws');
const { is78, isCustom78, templateFor, construct78Tiles, TOKEN_POOLS } = require('../server/maps-78');

function count(list, keyFn = x => x) { const counts={}; for(const x of list) { const k=keyFn(x); counts[k]=(counts[k]||0)+1; } return counts; }
const types = ['hills','forest','pasture','field','mountains'];
const buildFixture = (rules, count) => { const fixture=templateFor(rules,count); const geom={tiles:fixture.tiles.map((tile,id)=>({...tile,id})),tileNeighbors:[]}; return construct78Tiles(geom,rules,count); };

test('7–8 original fixtures, exact distributions and hidden central fog inventory', () => {
  const classic = {mapMode:'classic78',customMap:false};
  assert.equal(is78(classic),true); assert.equal(isCustom78(classic),false);
  const cc=buildFixture(classic,8);
  assert.equal(cc.length,69); assert.equal(count(cc,t=>t.type).sea,26); assert.equal(count(cc,t=>t.type).desert,3);
  for (const type of types) assert.equal(count(cc,t=>t.type)[type],8);
  assert.deepEqual(count(cc.filter(t=>t.number),t=>t.number),count(TOKEN_POOLS.classic_78));
  for (const [scenario, expectedTiles, numPool, extra] of [
    ['eight_islands_78',79,'eight_islands_78',{sea:39}],
    ['through_the_desert_78',97,'through_the_desert_78',{sea:40,desert:7,gold:5}],
    ['cartographer_78_random',97,'scattered_78_8',{sea:41,desert:8,gold:8}],
  ]) {
    const tiles=buildFixture({mapMode:'seafarers',seafarersScenario:scenario},8);
    const counts=count(tiles,t=>t.type);
    assert.equal(tiles.length,expectedTiles,scenario);
    for (const [key,value] of Object.entries(extra)) assert.equal(counts[key],value,scenario+' '+key);
    assert.deepEqual(count(tiles.filter(t=>t.number),t=>t.number),count(TOKEN_POOLS[numPool]),scenario);
  }
  const scattered7=buildFixture({mapMode:'seafarers',seafarersScenario:'cartographer_78_random'},7);
  assert.equal(count(scattered7,t=>t.type).sea,48);
  assert.deepEqual(count(scattered7.filter(t=>t.number),t=>t.number),count(TOKEN_POOLS.scattered_78_7));
  const manual=buildFixture({mapMode:'seafarers',seafarersScenario:'cartographer_78_manual'},8);
  assert.equal(count(manual,t=>t.type).unexplored,56); assert.equal(count(manual,t=>t.type).sea,41);
  const fog=buildFixture({mapMode:'seafarers',seafarersScenario:'fog_island_78'},8);
  assert.equal(fog.length,79);
  const hidden=fog.filter(t=>t.fog&&!t.revealed),visible=fog.filter(t=>!t.fog);
  assert.equal(hidden.length,23);
  assert.equal(count(visible,t=>t.type).sea,26);
  for(const type of types) assert.equal(count(visible,t=>t.type)[type],6);
  assert.equal(count(hidden,t=>t.hiddenType).sea,4);
  assert.equal(count(hidden,t=>t.hiddenType).gold,4);
  for(const type of types) assert.equal(count(hidden,t=>t.hiddenType)[type],3);
  assert.deepEqual(count(visible.filter(t=>t.number),t=>t.number),count(TOKEN_POOLS.fog_island_78_faceup));
  assert.deepEqual(count(hidden.filter(t=>t.hiddenNumber),t=>t.hiddenNumber),count(TOKEN_POOLS.fog_island_78_hidden));
  assert.ok(hidden.some(t=>t.q===0 && t.r===0),'Center hex must start as fog');
  assert.equal(fog.filter(t=>t.fog&&t.type==='sea').length,23);
  // Author's blank custom templates are the defaults, not temporary single desert hexes.
  const classicBlank=buildFixture({mapMode:'classic78',customMap:true},7);
  assert.equal(classicBlank.length,69); assert.equal(count(classicBlank,t=>t.type).sea,68);
  const seafarersBlank=buildFixture({mapMode:'seafarers',seafarersScenario:'test_builder_78'},7);
  assert.equal(seafarersBlank.length,97); assert.equal(count(seafarersBlank,t=>t.type).sea,96);
});

// Avoid relying on close() preserving address() after release.
async function freePort() { return new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(e=>e?reject(e):resolve(p));});});}
async function harness(t) {
  const port=await freePort(),dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'hex-v41-'));
  const child=spawn(process.execPath,['server.js'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,PORT:String(port),HOST:'127.0.0.1',DATA_DIR:dataDir,NODE_ENV:'test'},stdio:['ignore','pipe','pipe','ipc']});
  let logs='';child.stdout.on('data',x=>logs+=x);child.stderr.on('data',x=>logs+=x);
  let ready=false;for(let i=0;i<180;i++){try{const r=await fetch(`http://127.0.0.1:${port}/`);if(r.ok){ready=true;break;}}catch{} await new Promise(r=>setTimeout(r,50));}
  assert.ok(ready,'server did not start '+logs.slice(-2000));
  const connections=[];t.after(async()=>{for(const w of connections)w.terminate();if(child.exitCode==null){child.kill('SIGTERM');await once(child,'exit');}fs.rmSync(dataDir,{recursive:true,force:true});});
  async function peer() {
    const ws=new WebSocket(`ws://127.0.0.1:${port}/ws`);connections.push(ws);
    const queue=[],waiters=[];ws.on('message',raw=>{const msg=JSON.parse(String(raw));const index=waiters.findIndex(w=>w.pred(msg));if(index>=0){const w=waiters.splice(index,1)[0];clearTimeout(w.timer);w.resolve(msg);}else queue.push(msg);});
    await once(ws,'open');
    const p={send:m=>ws.send(JSON.stringify(m)),wait:(pred,ms=7000)=>{const index=queue.findIndex(pred);if(index>=0)return Promise.resolve(queue.splice(index,1)[0]);return new Promise((resolve,reject)=>{const w={pred,resolve,timer:null};w.timer=setTimeout(()=>{waiters.splice(waiters.indexOf(w),1);reject(new Error('Timed out: '+JSON.stringify(queue.slice(-8).map(m=>({type:m.type,error:m.error,previewKey:m.state?.previewKey})))));},ms);waiters.push(w);});}};
    await p.wait(m=>m.type==='hello');p.send({type:'auth_register',username:'v41_'+Math.random().toString(36).slice(2),password:'v41 testing password',displayName:'Scenario Builder'});await p.wait(m=>m.type==='auth_ok');return p;
  }
  return {peer};
}

test('v41 live unranked selections use named templates, ports, fog privacy, and block casual', {timeout:30000},async t=>{
  const {peer}=await harness(t),host=await peer();host.send({type:'create_room'});await host.wait(m=>m.type==='joined');
  for(const [scen,tileCount,ports,knownNumbers,hiddenCount] of [
    ['eight_islands_78',79,11,40,0],
    ['through_the_desert_78',97,11,50,0],
    ['fog_island_78',79,11,30,23],
    ['cartographer_78_random',97,9,42,0],
    ['cartographer_78_manual',97,9,0,0],
  ]) {
    host.send({type:'set_rules',rules:{mapMode:'seafarers',seafarersScenario:scen}});
    const room=await host.wait(m=>m.type==='room'&&m.room.rules?.seafarersScenario===scen);
    assert.equal(room.room.maxPlayers,8,scen);
    const state=(await host.wait(m=>m.type==='state'&&m.state.previewKey?.startsWith('seafarers:'+scen))).state;
    assert.equal(state.geom.tiles.length,tileCount,scen);
    assert.equal(state.geom.ports.length,ports,scen+' ports');
    assert.equal(state.geom.tiles.filter(x=>x.number!=null).length,knownNumbers,scen+' numbers');
    assert.equal(state.geom.tiles.filter(x=>x.fog&&!x.revealed).length,hiddenCount,scen+' fog');
    assert.ok(!state.geom.tiles.some(x=>x.hiddenType||x.hiddenNumber),scen+' fog contents are private');
    host.send({type:'edit_preview_tile',tileId:0,tileType:'sea'});
    assert.match((await host.wait(m=>m.type==='error')).error,/custom map/i,scen+' must not allow editing');
  }
  host.send({type:'set_rules',rules:{mapMode:'classic78',customMap:false}});
  const cr=await host.wait(m=>m.type==='room'&&m.room.rules?.mapMode==='classic78');assert.equal(cr.room.maxPlayers,8);
  const cs=(await host.wait(m=>m.type==='state'&&m.state.previewKey==='classic78:classic')).state;
  assert.equal(cs.geom.tiles.length,69);assert.equal(cs.geom.tiles.filter(t=>t.number!=null).length,40);assert.equal(cs.geom.ports.length,9);
  host.send({type:'edit_preview_tile',tileId:0,tileType:'sea'});
  assert.match((await host.wait(m=>m.type==='error')).error,/custom map/i);
  host.send({type:'set_rules',rules:{mapMode:'seafarers',seafarersScenario:'test_builder_78'}});
  await host.wait(m=>m.type==='room'&&m.room.rules?.seafarersScenario==='test_builder_78');
  const blank=(await host.wait(m=>m.type==='state'&&m.state.previewKey==='seafarers:test_builder_78')).state;
  assert.equal(blank.geom.tiles.length,97);
  const target=blank.geom.tiles.find(x=>x.type==='sea');
  host.send({type:'edit_preview_tile',tileId:target.id,tileType:'forest',number:9});
  await host.wait(m=>m.type==='state'&&m.state.geom.tiles[target.id]?.type==='forest');
  host.send({type:'edit_preview_tile',tileId:target.id,tileType:'fog'});
  const hiddenState=(await host.wait(m=>m.type==='state'&&m.state.geom.tiles[target.id]?.fog===true)).state;
  assert.equal(hiddenState.geom.tiles[target.id].type,'sea');
  assert.equal(hiddenState.geom.tiles[target.id].hiddenType,undefined);
  host.send({type:'download_custom_map'});
  const map=(await host.wait(m=>m.type==='custom_map_file')).map;
  assert.equal(map.tiles[target.id].hiddenType,'forest');assert.equal(map.tiles[target.id].hiddenNumber,9);
  host.send({type:'upload_custom_map',map});await host.wait(m=>m.type==='custom_map_loaded');
  const restored=(await host.wait(m=>m.type==='state'&&m.state.geom.tiles[target.id]?.fog)).state;
  assert.equal(restored.geom.tiles[target.id].type,'sea');
  host.send({type:'leave_room',switchMode:'casual'});await host.wait(m=>m.type==='left_room');
  host.send({type:'create_room',casual:true});await host.wait(m=>m.type==='joined');
  for(const scen of ['eight_islands_78','through_the_desert_78','fog_island_78','cartographer_78_manual','cartographer_78_random','test_builder_78']){
    host.send({type:'set_rules',rules:{mapMode:'seafarers',seafarersScenario:scen}});
    assert.match((await host.wait(m=>m.type==='error')).error,/casual/i);
  }
});

test('v41 7–8 Cartographer starts a real draft with one inventory per seat', {timeout:30000},async t=>{
  const {peer}=await harness(t),host=await peer();
  host.send({type:'create_room'});await host.wait(m=>m.type==='joined');
  host.send({type:'set_rules',rules:{mapMode:'seafarers',seafarersScenario:'cartographer_78_manual'}});
  await host.wait(m=>m.type==='room'&&m.room.rules?.seafarersScenario==='cartographer_78_manual');
  await host.wait(m=>m.type==='state'&&m.state.previewKey==='seafarers:cartographer_78_manual:p7');
  host.send({type:'fill_ai',targetCount:8});
  await host.wait(m=>m.type==='room'&&m.room.players.length===8);
  const eight=(await host.wait(m=>m.type==='state'&&m.state.previewKey==='seafarers:cartographer_78_manual:p8')).state;
  assert.equal(eight.geom.tiles.filter(x=>x.type==='unexplored').length,56);
  host.send({type:'set_ready',ready:true});
  await host.wait(m=>m.type==='room'&&m.room.players.some(x=>x.ready));
  host.send({type:'start_game'});
  const started=(await host.wait(m=>m.type==='state'&&m.state.phase==='cartographer-draft',10000)).state;
  assert.equal(started.players.length,8);
  assert.equal(started.cartographerDraft?.totalCount,56);
  assert.equal(Object.keys(started.cartographerDraft?.inventoryByPlayer || {}).length,8);
  for(const inventory of Object.values(started.cartographerDraft.inventoryByPlayer)){
    assert.equal(inventory.gold,1);assert.equal(inventory.desert,1);assert.equal(inventory.sea,0);
    for(const type of types) assert.equal(inventory[type],1);
  }
});
