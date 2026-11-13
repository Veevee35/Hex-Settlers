'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const path=require('node:path');
const fs=require('node:fs');const os=require('node:os');
const net=require('node:net'); const {spawn}=require('node:child_process'); const {once}=require('node:events');
const WebSocket=require('ws');
async function port(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
test('7–8 scenario layouts, counts, fog, redraws, upload, editor, and drafts',{timeout:120000},async t=>{
 const p=await port(),dir=fs.mkdtempSync(path.join(os.tmpdir(),'hex-v41-'));
 const child=spawn(process.execPath,['server.js'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,PORT:String(p),HOST:'127.0.0.1',DATA_DIR:dir,NODE_ENV:'test'},stdio:['ignore','pipe','pipe']});let logs='';child.stderr.on('data',d=>logs+=d);child.stdout.on('data',d=>logs+=d);
 t.after(async()=>{ws.terminate();if(child.exitCode==null){child.kill();await once(child,'exit')}fs.rmSync(dir,{recursive:true,force:true})});
 let ready=false;for(let i=0;i<120;i++){try{const r=await fetch(`http://127.0.0.1:${p}/`);if(r.ok){ready=true;break}}catch(e){}await new Promise(r=>setTimeout(r,40))};assert.ok(ready,logs);
 const ws=new WebSocket(`ws://127.0.0.1:${p}/ws`);const queue=[],waiters=[];
 ws.on('message',raw=>{const msg=JSON.parse(raw.toString());const wi=waiters.findIndex(w=>w.pred(msg));if(wi>=0){const w=waiters.splice(wi,1)[0];clearTimeout(w.timer);w.resolve(msg)}else queue.push(msg)});
 await once(ws,'open');const wait=(pred,ms=8000)=>{const i=queue.findIndex(pred);if(i>=0)return Promise.resolve(queue.splice(i,1)[0]);return new Promise((resolve,reject)=>{const w={pred,resolve};w.timer=setTimeout(()=>{waiters.splice(waiters.indexOf(w),1);reject(new Error('Timeout '+JSON.stringify(queue.slice(-4).map(m=>[m.type,m.error]))+' '+logs.slice(-2500)))},ms);waiters.push(w)})};
 const send=x=>ws.send(JSON.stringify(x));await wait(m=>m.type==='hello');send({type:'auth_register',username:'scenario78_'+Date.now(),password:'test password xyz'});await wait(m=>m.type==='auth_ok');send({type:'create_room'});await wait(m=>m.type==='joined');
 const inventories={
  classic78:{sea:26,desert:3,hills:8,forest:8,pasture:8,field:8,mountains:8},
  eight_islands_78:{sea:39,hills:8,forest:8,pasture:8,field:8,mountains:8},
  through_the_desert_78:{sea:40,desert:7,gold:5,hills:9,forest:9,pasture:9,field:9,mountains:9},
  scattered_tiles_78_7:{sea:48,desert:7,gold:7,hills:7,forest:7,pasture:7,field:7,mountains:7},
  scattered_tiles_78_8:{sea:41,desert:8,gold:8,hills:8,forest:8,pasture:8,field:8,mountains:8},
 };
 const cases=[['classic78',null,69,40,0,9],['seafarers','eight_islands_78',79,40,0,11],['seafarers','through_the_desert_78',97,50,0,11],['seafarers','fog_island_78',79,30,23,11],['seafarers','scattered_tiles_78_7',97,42,0,9],['seafarers','scattered_tiles_78_8',97,48,0,11],['seafarers','cartographer_78_7',97,0,0,0],['seafarers','cartographer_78_8',97,0,0,0]];
 for(const [mm,sc,len,discs,fogs,ports] of cases){
  // Permanent seven/eight-player variants now follow occupied lobby seats,
  // not the configured maximum. Fill the appropriate number of seats before
  // checking the exact inventory of each legacy explicit scenario key.
  const targetSeats = sc?.endsWith('_8') ? 8 : sc?.endsWith('_7') ? 7 : null;
  send({type:'set_rules',rules:{mapMode:mm,seafarersScenario:sc||'four_islands',customMap:false,
    ...(targetSeats ? {playerCount:targetSeats} : {})}});
  const key=mm==='classic78'?'classic78:classic':`seafarers:${sc}`;
  await wait(m=>m.type==='room'&&m.room?.rules?.mapMode===mm&&(!sc||m.room?.rules?.seafarersScenario===sc));
  if (targetSeats) {
    send({type:'fill_ai',targetCount:targetSeats});
    await wait(m=>m.type==='room'&&m.room.players.length===targetSeats);
  }
  const st=(await wait(m=>m.type==='state'&&m.state?.previewKey===key)).state;
  const tiles=st.geom.tiles;
  assert.equal(tiles.length,len,sc||mm);assert.equal(tiles.filter(t=>t.number!=null).length,discs,sc);
  assert.equal(tiles.filter(t=>t.fog&&!t.revealed).length,fogs,sc);assert.equal(st.geom.ports.length,ports,sc);
  const expectInventory=inventories[sc||mm];
  if(expectInventory){
    const actual={};for(const tile of tiles)actual[tile.type]=(actual[tile.type]||0)+1;
    assert.deepEqual(actual,expectInventory,`terrain inventory: ${sc||mm}`);
  }
  if(sc==='fog_island_78'){
    // The two detached center-edge tiles remain revealed; the diagonally
    // opposite upper-right and lower-left corners belong to the fog bank.
    const byAxial=(q,r)=>tiles.find(tile=>tile.q===q&&tile.r===r);
    for(const [q,r] of [[-3,3],[3,-3]]) {
      const tile=byAxial(q,r);
      assert.ok(tile,`missing corner tile ${q},${r}`);
      assert.equal(!!tile.fog,true,`corner tile ${q},${r} must start fogged`);
      assert.equal(!!tile.revealed,false,`corner tile ${q},${r} must start hidden`);
    }
    for(const [q,r] of [[-3,0],[3,0]]) {
      const tile=byAxial(q,r);
      assert.ok(tile,`missing center-edge tile ${q},${r}`);
      assert.equal(!!tile.fog,false,`center-edge tile ${q},${r} must remain visible`);
      assert.notEqual(tile.type,'sea',`center-edge tile ${q},${r} must be revealed land`);
      assert.ok(tile.number!=null,`center-edge tile ${q},${r} must have a number disc`);
    }
    assert.equal(tiles.filter(t=>t.type==='sea'&&!t.fog).length,26);
    for(const kind of ['hills','forest','pasture','field','mountains'])assert.equal(tiles.filter(t=>t.type===kind).length,6);
  }
  assert.equal(st.rules.mapMode,mm);assert.equal(st.geom.tiles.filter(t=>t.robber).length,Number(!sc?.startsWith('cartographer_')),sc);
  for(const tile of tiles) if(tile.fog&&!tile.revealed){assert.equal(tile.hiddenType,undefined);assert.equal(tile.hiddenNumber,undefined)}
  if(!sc?.startsWith('cartographer_')){const reds=tiles.filter(t=>t.number===6||t.number===8); for(const red of reds) assert.ok(!(st.geom.tileNeighbors?.[red.id]||[]).some(i=>tiles[i]?.number===6||tiles[i]?.number===8),`adjacent reds ${sc}`)}
  console.log('PASSED MAP',sc||mm,len,discs,fogs,ports);
 }
 send({type:'set_rules',rules:{mapMode:'seafarers',seafarersScenario:'test_builder_78'}});await wait(m=>m.type==='room'&&m.room.rules?.seafarersScenario==='test_builder_78');
 let st=(await wait(m=>m.type==='state'&&m.state.previewKey==='seafarers:test_builder_78')).state;
 assert.equal(st.geom.tiles.length,97);
 const tid=st.geom.tiles.find(t=>t.type==='sea').id;
 send({type:'edit_preview_tile',tileId:tid,tileType:'gold',number:9});await wait(m=>m.type==='state'&&m.state.geom.tiles[tid].type==='gold');
 send({type:'edit_preview_tile',tileId:tid,tileType:'fog'});st=(await wait(m=>m.type==='state'&&m.state.geom.tiles[tid].fog)).state;
 assert.equal(st.geom.tiles[tid].hiddenType,undefined);
 send({type:'download_custom_map'});const file=(await wait(m=>m.type==='custom_map_file')).map;
 assert.equal(file.tiles[tid].hiddenType,'gold');assert.equal(file.tiles[tid].hiddenNumber,9);
 send({type:'upload_custom_map',map:file});await wait(m=>m.type==='custom_map_loaded');st=(await wait(m=>m.type==='state'&&m.state.geom.tiles[tid].fog)).state;assert.equal(st.geom.tiles[tid].hiddenType,undefined);
 // Starting a full eight-player manual Cartographer game must transition to
 // the draft rather than unexpectedly playing the normal Seafarers setup.
 send({type:'set_rules',rules:{mapMode:'seafarers',seafarersScenario:'cartographer_78_8',customMap:false}});
 await wait(m=>m.type==='room'&&m.room.rules?.seafarersScenario==='cartographer_78_8');
 send({type:'fill_ai',targetCount:8});await wait(m=>m.type==='room'&&m.room.players.length===8);
 send({type:'set_ready',ready:true});await wait(m=>m.type==='room'&&m.room.players.length===8&&m.room.players.every(p=>p.ready));
 send({type:'start_game'});
 st=(await wait(m=>m.type==='state'&&m.state.phase==='cartographer-draft')).state;
 assert.equal(st.players.length,8);
 assert.equal(st.cartographerDraft.totalCount,97);
 assert.equal(st.geom.tiles.filter(t=>t.type==='unexplored').length,97);
 assert.equal(st.cartographerDraft.inventoryByPlayer[st.currentPlayerId].sea,6);
});
