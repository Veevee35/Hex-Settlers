'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const {spawn} = require('node:child_process');
const {once} = require('node:events');
const WebSocket = require('ws');

const app = fs.readFileSync(path.join(__dirname, '..', 'public/app.js'), 'utf8');
const match = app.match(/  function defaultVictoryPointsFor\(rules\) \{[\s\S]*?\n  \}/);
const clientVp = vm.runInNewContext(`${match?.[0] || ''}\ndefaultVictoryPointsFor;`);
const cases = [
  ['cartographer_4_manual', 4, 12],
  ['cartographer_4_random', 4, 12],
  ['cartographer_56_manual', 6, 14],
  ['cartographer_56_random', 6, 14],
  ['scattered_tiles_56', 6, 14],
  ['cartographer_78', 7, 14],
  ['cartographer_78', 8, 14],
  ['scattered_tiles_78', 7, 14],
  ['scattered_tiles_78', 8, 14],
];

test('all expanded Cartographer and Scattered Tiles defaults show 14 VP on the client', () => {
  for (const [scenario, players, expected] of cases) {
    const mapMode = players >= 7 ? 'seafarers78' : (players >= 5 ? 'seafarers56' : 'seafarers');
    assert.equal(clientVp({mapMode, seafarersScenario: scenario}), expected, scenario);
  }
});

test('server defaults all expanded Cartographer and Scattered Tiles variants to 14 VP, preserving custom targets', {timeout:45000}, async t => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'hex-v45-defaults-'));
  const srv = net.createServer();
  await new Promise(resolve=>srv.listen(0,'127.0.0.1',resolve));
  const port = srv.address().port;
  await new Promise(resolve=>srv.close(resolve));
  let logs='';
  const child=spawn(process.execPath, ['server.js'], {cwd:path.resolve(__dirname, '..'),env:{...process.env,PORT:String(port),HOST:'127.0.0.1',DATA_DIR:fixture,NODE_ENV:'test'},stdio:['ignore','pipe','pipe']});
  child.stdout.on('data', chunk=>logs+=String(chunk));
  child.stderr.on('data', chunk=>logs+=String(chunk));
  let ws;
  t.after(async()=>{
    if(ws) ws.terminate();
    if(child.exitCode==null) { child.kill('SIGTERM'); await once(child,'exit'); }
    fs.rmSync(fixture,{recursive:true,force:true});
  });
  for(let i=0;i<160;i++){
    try {if((await fetch(`http://127.0.0.1:${port}/`)).ok) break;} catch {}
    if(i===159) throw new Error(`failed startup: ${logs}`);
    await new Promise(r=>setTimeout(r,50));
  }
  ws=new WebSocket(`ws://127.0.0.1:${port}/ws`);
  const q=[], pending=[]; const recent=[];
  ws.on('message',d=>{
    const m=JSON.parse(String(d));
    recent.push({type:m.type, scenario:m.room?.rules?.seafarersScenario, mode:m.room?.rules?.mapMode, count:m.room?.rules?.playerCount, vp:m.room?.rules?.victoryPointsToWin, error:m.error}); if(recent.length>20)recent.shift();
    const ix=pending.findIndex(w=>w.match(m));
    if(ix===-1) q.push(m);
    else pending.splice(ix,1)[0].done(m);
  });
  await once(ws,'open');
  const wait=(match,timeout=9000)=>{
    const i=q.findIndex(match);if(i!==-1)return Promise.resolve(q.splice(i,1)[0]);
    return new Promise((resolve,reject)=>{
      const waiter={match,done:m=>{clearTimeout(timer);resolve(m)}};
      const timer=setTimeout(()=>{const i=pending.indexOf(waiter);if(i>=0)pending.splice(i,1);reject(new Error(`timeout waiting; ${logs.slice(-400)}; recent=${JSON.stringify(recent)}`));},timeout);
      pending.push(waiter);
    });
  };
  await wait(m=>m.type==='hello');
  ws.send(JSON.stringify({type:'auth_register',username:`v45_${Math.random().toString(36).slice(2)}`,password:'test v45 strong password'}));
  await wait(m=>m.type==='auth_ok');
  ws.send(JSON.stringify({type:'create_room'}));
  await wait(m=>m.type==='joined');
  for(const [scenario,players,expected] of cases){
    ws.send(JSON.stringify({type:'set_rules',rules:{mapMode:'seafarers',seafarersScenario:scenario,playerCount:players}}));
    const normalizedScenario = scenario === 'scattered_tiles_56' ? 'cartographer_56_random' : scenario;
    const response=await wait(m=>m.type==='room'&&m.room.rules?.seafarersScenario===normalizedScenario);
    assert.equal(response.room.rules.victoryPointsToWin,expected,`${scenario} (${players} players)`);
  }
  ws.send(JSON.stringify({type:'set_rules',rules:{mapMode:'seafarers',seafarersScenario:'cartographer_78',playerCount:8,victoryPointsToWin:17}}));
  const custom=await wait(m=>m.type==='room'&&m.room.rules?.victoryPointsToWin===17);
  assert.equal(custom.room.rules.victoryPointsToWin,17,'manual VP override is retained');
});
