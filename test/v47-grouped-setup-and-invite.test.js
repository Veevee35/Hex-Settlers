'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const vm = require('node:vm');
const {spawn} = require('node:child_process');
const {once} = require('node:events');
const WebSocket = require('ws');

const base = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(base, 'public/app.js'), 'utf8');
const html = fs.readFileSync(path.join(base, 'public/index.html'), 'utf8');

test('v47 setup exposes only map family and board-size ranges, with correct underlying modes', () => {
  const map = html.match(/<select id="mapFamilySelect"[^>]*>([\s\S]*?)<\/select>/);
  const sizes = html.match(/<select id="playerCountSelect"[^>]*>([\s\S]*?)<\/select>/);
  assert.ok(map && sizes);
  assert.deepEqual([...map[1].matchAll(/<option value="([^"]+)"/g)].map(m=>m[1]), ['classic','seafarers']);
  assert.deepEqual([...sizes[1].matchAll(/<option value="([^"]+)"/g)].map(m=>m[1]), ['4','6','8']);
  assert.match(html, /<select id="mapModeSelect" class="input hidden"/);
  const src = app.slice(app.indexOf('  function mapModeForSetupSelection('), app.indexOf('  function uiIsSixIslands('));
  const ui = {mapModeSelect:{value:'classic'},playerCountSelect:{value:'4',children:[],replaceChildren(){this.children=[];},appendChild(child){this.children.push(child);}}};
  const ctx = vm.createContext({ui, selectedPlayMode:'unranked', room:null, document:{createElement:()=>({})}});
  vm.runInContext(src, ctx);
  for (const [family,size,expected] of [
    ['classic',4,'classic'], ['classic',6,'classic56'], ['classic',8,'classic78'],
    ['seafarers',4,'seafarers'], ['seafarers',6,'seafarers56'], ['seafarers',8,'seafarers78']
  ]) assert.equal(vm.runInContext(`mapModeForSetupSelection('${family}', ${size})`,ctx),expected);
  ui.mapModeSelect.value='seafarers78';
  vm.runInContext('syncPlayerCountOptions()',ctx);
  assert.equal(ui.playerCountSelect.value,'8');
  assert.deepEqual(ui.playerCountSelect.children.map(opt=>opt.textContent), ['4 Player','5-6 Player','7-8 Player']);
  ctx.selectedPlayMode='casual';
  ui.mapModeSelect.value='seafarers56';
  vm.runInContext('syncPlayerCountOptions()',ctx);
  assert.equal(ui.playerCountSelect.value,'6');
  assert.deepEqual(ui.playerCountSelect.children.map(opt=>opt.textContent), ['4 Player','5-6 Player']);
  assert.match(app,/playerCount: null/,'range selection clears any old exact-seat target');
});

test('v47 invite link has only one Copy Link action next to the populated address', () => {
  const block=html.match(/<div class="roomShareControls"[\s\S]*?<\/div>\s*<\/div>/);
  assert.ok(block);
  assert.match(block[0],/id="roomJoinLinkInput"/);
  assert.match(block[0],/id="copyJoinLinkBtn"/);
  assert.doesNotMatch(html,/id="genJoinLinkBtn"|>Generate Link</);
  assert.doesNotMatch(app,/genJoinLinkBtn/);
});

test('v47 server accepts 7 of 8 and Casual 5–6 ranges after clearing a legacy exact count', {timeout:45000}, async t => {
  const portSrv=net.createServer();
  await new Promise(ok=>portSrv.listen(0,'127.0.0.1',ok));
  const port=portSrv.address().port;
  await new Promise(ok=>portSrv.close(ok));
  const data=fs.mkdtempSync(path.join(os.tmpdir(),'hex-v47-size-'));
  const child=spawn(process.execPath,['server.js'],{cwd:base,env:{...process.env,PORT:String(port),HOST:'127.0.0.1',DATA_DIR:data,NODE_ENV:'test'},stdio:['ignore','pipe','pipe']});
  let logs='';child.stdout.on('data',d=>logs+=String(d));child.stderr.on('data',d=>logs+=String(d));
  let ws;
  t.after(async()=>{if(ws)ws.terminate();if(child.exitCode===null){child.kill('SIGTERM');await once(child,'exit');}fs.rmSync(data,{recursive:true,force:true});});
  for(let i=0;i<140;i++){
    try{if((await fetch(`http://127.0.0.1:${port}/`)).ok)break;}catch{}
    if(i===139)throw new Error(logs);
    await new Promise(r=>setTimeout(r,45));
  }
  ws=new WebSocket(`ws://127.0.0.1:${port}/ws`);
  const q=[],waiters=[],recent=[];
  ws.on('message',d=>{const m=JSON.parse(String(d));recent.push({type:m.type,error:m.error,phase:m.state?.phase,players:m.room?.players?.length,mode:m.room?.rules?.mapMode,scenario:m.room?.rules?.seafarersScenario});if(recent.length>25)recent.shift();const i=waiters.findIndex(w=>w.predicate(m));if(i<0)q.push(m);else waiters.splice(i,1)[0].resolve(m);});
  const wait=(predicate,timeout=9000)=>{
    const i=q.findIndex(predicate);if(i>=0)return Promise.resolve(q.splice(i,1)[0]);
    return new Promise((resolve,reject)=>{
      const w={predicate,resolve:m=>{clearTimeout(timer);resolve(m)}};
      const timer=setTimeout(()=>{const i=waiters.indexOf(w);if(i>=0)waiters.splice(i,1);reject(new Error(`timed out: ${logs.slice(-400)}; ${JSON.stringify(recent)}`));},timeout);
      waiters.push(w);
    });
  };
  await once(ws,'open');await wait(m=>m.type==='hello');
  const send=(type,data={})=>ws.send(JSON.stringify({type,...data}));
  send('auth_register',{username:`v47_${Math.random().toString(36).slice(2)}`,password:'v47 setup strong password'});
  await wait(m=>m.type==='auth_ok');
  send('create_room');await wait(m=>m.type==='joined');
  // A previous saved exact count of eight must be cleared when picking a range.
  send('set_rules',{rules:{mapMode:'classic78',playerCount:8}});
  await wait(m=>m.type==='room'&&m.room.rules?.playerCount===8);
  send('set_rules',{rules:{mapMode:'classic78',playerCount:null}});
  const flexible=await wait(m=>m.type==='room'&&m.room.rules?.mapMode==='classic78'&&m.room.rules?.playerCount==null);
  assert.equal(flexible.room.maxPlayers,8);
  send('fill_ai',{targetCount:7});
  const seven=await wait(m=>m.type==='room'&&m.room.players.length===7);
  assert.equal(seven.room.maxPlayers,8);
  send('set_ready',{ready:true});
  await wait(m=>m.type==='room'&&m.room.players.find(p=>!p.isAI)?.ready===true);
  send('start_game');
  const started=await wait(m=>m.type==='state'&&m.state?.phase!=='lobby',12000);
  assert.equal(started.state.players.length,7);
  // A fresh, independent Casual room offers a 5–6-player game with six seats.
  const ws2=new WebSocket(`ws://127.0.0.1:${port}/ws`);
  t.after(()=>ws2.terminate());
  const q2=[], waits2=[];
  ws2.on('message',d=>{const m=JSON.parse(String(d));const i=waits2.findIndex(w=>w.filter(m));if(i<0)q2.push(m);else waits2.splice(i,1)[0].resolve(m);});
  const wait2=(filter)=>{
    const i=q2.findIndex(filter);if(i>=0)return Promise.resolve(q2.splice(i,1)[0]);
    return new Promise((resolve,reject)=>{
      const w={filter,resolve:m=>{clearTimeout(timer);resolve(m)}};
      const timer=setTimeout(()=>{const i=waits2.indexOf(w);if(i>=0)waits2.splice(i,1);reject(new Error('Casual room did not respond'));},8000);
      waits2.push(w);
    });
  };
  await once(ws2,'open');await wait2(m=>m.type==='hello');
  const send2=(type,data={})=>ws2.send(JSON.stringify({type,...data}));
  send2('auth_register',{username:`v47c_${Math.random().toString(36).slice(2)}`,password:'v47 casual strong password'});
  await wait2(m=>m.type==='auth_ok');
  send2('create_room',{casual:true});await wait2(m=>m.type==='joined');
  send2('set_rules',{rules:{mapMode:'seafarers',seafarersScenario:'six_islands',playerCount:null}});
  const casual=await wait2(m=>m.type==='room'&&m.room.casual===true&&m.room.rules?.seafarersScenario==='six_islands'&&m.room.players.length===6);
  assert.equal(casual.room.maxPlayers,6);
  assert.equal(casual.room.players.filter(p=>p.isAI).length,5);
});
