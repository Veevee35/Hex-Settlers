#!/usr/bin/env node
'use strict';
// Non-destructive baseline: WS handshake + ping throughput, NOT full game load.
// Refuses public/remote endpoints unless explicitly enabled; run on staging.
const WebSocket = require('ws');
const fs = require('fs');
const { performance } = require('perf_hooks');
const args = process.argv.slice(2);
const arg = (key, def) => { const at = args.indexOf(key); return at >= 0 ? args[at + 1] : def; };
const url = arg('--url', 'ws://127.0.0.1:3000/ws');
const stages = arg('--stages', '25,50,100,150').split(',').map(Number);
const seconds = Number(arg('--seconds', 12));
const output = arg('--output', '');
const allowRemote = args.includes('--allow-remote');
const fail = msg => { console.error(msg); process.exit(2); };
let parsed;
try { parsed = new URL(url); } catch (_) { fail('Use --url ws://host/ws or wss://host/ws'); }
if (!['ws:', 'wss:'].includes(parsed.protocol) || parsed.pathname !== '/ws') fail('The URL must be the Hex Settlers /ws endpoint.');
if (!['127.0.0.1','localhost','::1','[::1]'].includes(parsed.hostname) && !allowRemote)
  fail('Refusing to load-test a remote environment without --allow-remote. Use staging, not production.');
if (!stages.length || stages.some(n => !Number.isSafeInteger(n) || n < 1 || n > 1000) || stages.some((n,i) => i && n <= stages[i - 1]))
  fail('Use ascending --stages counts between 1 and 1000, e.g. 25,50,100,150');
if (!Number.isInteger(seconds) || seconds < 5 || seconds > 300) fail('--seconds must be 5–300');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const percentile = (data, pct) => data.length ? data[Math.min(data.length-1,Math.max(0,Math.ceil(pct * data.length)-1))] : null;
const clients = [];
let failures = 0, unexpectedCloses = 0, pongs = 0, pending = 0;
let nextId = 0;
const samples = [];
const connect = () => new Promise(resolve => {
  const ws = new WebSocket(url, { handshakeTimeout: 10000, perMessageDeflate: false });
  const entry = { ws, state:'connecting', pending:new Map() };
  clients.push(entry);
  let settled = false;
  const finish = ok => { if(settled)return;settled=true;entry.state=ok?'open':'failed';if(!ok)failures++;resolve(ok); };
  ws.on('open', () => finish(true));
  ws.on('error', () => finish(false));
  ws.on('close', () => {
    if(entry.state==='open') unexpectedCloses++;
    if(!settled)finish(false);
    entry.state='closed';
    pending-=entry.pending.size;
    entry.pending.clear();
  });
  ws.on('message', raw => {
    let message;try{message=JSON.parse(raw)}catch{return;}
    if(message.type!=='server_pong')return;
    const at=entry.pending.get(message.clientTime);
    if(at==null)return;
    entry.pending.delete(message.clientTime);
    pending--;
    samples.push(performance.now()-at);
    pongs++;
  });
});
const run=async()=>{
  const results=[];
  for(const target of stages){
    await Promise.all(Array.from({length:target-clients.length},connect));
    const before={ pongs, failures, closes:unexpectedCloses, sample:samples.length };
    const interval=setInterval(()=>{
      for(const c of clients){
        if(c.state!=='open'||c.ws.readyState!==WebSocket.OPEN||c.pending.size>=2)continue;
        const id=++nextId;
        c.pending.set(id,performance.now());pending++;
        try{c.ws.send(JSON.stringify({type:'client_ping',clientTime:id}))}catch(_){}
      }
    },1000);
    await sleep(seconds*1000);
    clearInterval(interval);
    const latencies=samples.slice(before.sample).sort((a,b)=>a-b);
    const report={target, open:clients.filter(c=>c.state==='open').length, failedConnects:failures-before.failures,
      unexpectedCloses:unexpectedCloses-before.closes, responses:pongs-before.pongs,
      p50Ms:percentile(latencies,.50)?.toFixed(1)||null,p95Ms:percentile(latencies,.95)?.toFixed(1)||null,
      p99Ms:percentile(latencies,.99)?.toFixed(1)||null};
    results.push(report);
    console.log(report);
  }
  if(output)fs.writeFileSync(output,JSON.stringify({url,seconds,kind:'WebSocket transport baseline, not gameplay throughput',results},null,2));
  for(const c of clients){c.state='closing';try{c.ws.close()}catch(_){}}
  await sleep(200);
  process.exit(0);
};
process.on('SIGINT',()=>{for(const c of clients)c.ws.terminate();process.exit(130)});
run().catch(e=>fail(e.stack||e.message));
