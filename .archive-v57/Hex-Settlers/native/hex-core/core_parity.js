#!/usr/bin/env node
'use strict';
/**
 * Compares independently compiled C++ against the ACTUAL server.js functions.
 * These cases are state snapshots, NOT complete games. Do not report them as
 * 100 full game simulations or evidence of a full C++ server migration.
 */
const fs = require('node:fs');
const cp = require('node:child_process');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '../..');
const P = 8, N = 512, E = 1024, R = 5, Q = 48;
const INTS = 5 + P * R + P * 5 + N * 2 + E * 4 + 4 + P * 2 + P * 2 + P * 5 + P + 1 + Q * 5;
const BYTES = INTS * 4;
const MAGIC = 0x43485848;
const RESOURCE_KINDS = ['brick','lumber','wool','grain','ore'];
const BUILD_COSTS = [
  {brick:1,lumber:1}, {lumber:1,wool:1}, {brick:1,lumber:1,wool:1,grain:1},
  {grain:2,ore:3}, {wool:1,grain:1,ore:1},
];
function block(src, start, end) {
  const a = src.indexOf(start), b = src.indexOf(end, a+start.length);
  assert.ok(a>=0 && b>a, `Cannot locate authoritative server excerpt: ${start}`);
  return src.slice(a,b);
}
function reference() {
  const source = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
  const defs = [
    block(source,'function generateAxials(radius = 2)', '// Custom Seafarers geometry'),
    block(source,'function axialToPixel(q, r, size = 1)', 'function shuffle(arr)'),
    block(source,'function buildGeometry(radius = 2)', 'function buildGeometryFromAxials(axials)'),
    block(source,'function resTotal(p)', 'function randomDiscardMap(p, required)'),
    block(source,'function canAfford(res, cost)', 'function payCost(res, cost)'),
    block(source,'function computeVP(state)', 'function persistUserStatsFromGame(room, game, winnerId)'),
    block(source,'function recomputeLargestArmy(game)', 'function normalizeGameAfterPlayerRemoval(game, removedPid, removedWasCurrent)'),
    block(source,'function hasSettlementOrCityAt(state, nodeId, playerId)', 'function isNodeOnBoard(state, nodeId)'),
  ];
  const sandbox = {
    HEX_DIRS:[[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]],
    axialKey:(q,r)=>`${q},${r}`,
    RESOURCE_KINDS,
    resolveDepartedTitleChallenge:require('../../server/departure').resolveDepartedTitleChallenge,
    pushLog(){}, playerName(_g,id){return id;},
    playerById:(game,id)=>game.players.find(p=>p.id===id) || null,
  };
  vm.createContext(sandbox);
  vm.runInContext(defs.join('\n'), sandbox, {filename:'server.js/score-native-reference.js',timeout:20000});
  return sandbox;
}
class RNG {
  constructor(seed=0xcfa24161){this.seed=seed>>>0;}
  int(n){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed % n;}
}
function makeState(ref,rng,index) {
  const count=4+index%5;
  const geom=ref.buildGeometry(2 + (index % 4));
  assert.ok(geom.nodes.length<N && geom.edges.length<E);
  const players=Array.from({length:count},(_,p)=>({
    id:`p${p}`, departed:rng.int(16)===0,
    resources:Object.fromEntries(RESOURCE_KINDS.map(k=>[k,rng.int(16)])),
    vpDev:rng.int(5),newIslandVP:rng.int(3),ttdFarSideVP:rng.int(3),army:rng.int(7),
    vp:0,
  }));
  for(const node of geom.nodes) if(rng.int(20)<2) node.building={owner:`p${rng.int(count)}`,type:rng.int(3)===0?'city':'settlement'};
  for(const edge of geom.edges) if(rng.int(20)<4) {
    const owner=`p${rng.int(count)}`;
    if(rng.int(2))edge.roadOwner=owner; else edge.shipOwner=owner;
  }
  // Construct a genuine consecutive road/ship chain on the hex geometry.
  const routePlayer=`p${rng.int(count)}`;
  let node=rng.int(geom.nodes.length),previous=-1;
  for(let step=0;step<6+rng.int(7);step++) {
    const eligible=geom.nodeEdges[node].filter(eid=>eid!==previous);
    if(!eligible.length)break;
    const eid=eligible[rng.int(eligible.length)];
    const edge=geom.edges[eid];
    edge.roadOwner = rng.int(2)===0 ? routePlayer : null;
    edge.shipOwner = edge.roadOwner ? null : routePlayer;
    previous=eid;node=edge.a===node?edge.b:edge.a;
  }
  const queries=Array.from({length:Q},()=>({node:rng.int(geom.nodes.length),edge:rng.int(geom.edges.length),player:rng.int(count)}));
  const existingRoad=rng.int(count+1)-1, existingArmy=rng.int(count+1)-1;
  return {
    players,geom,
    longestRoad:{playerId: existingRoad<0?null:players[existingRoad].id,length:rng.int(9)},
    largestArmy:{playerId: existingArmy<0?null:players[existingArmy].id,size:rng.int(7)},
    discardLimit:7 + rng.int(7), victoryTarget:8 + rng.int(10), queries,
  };
}
function encode(state) {
  const bytes=Buffer.alloc(BYTES);let off=0;
  const put=n=>{bytes.writeInt32LE(Number(n)||0,off);off+=4;};
  const ps=new Map(state.players.map((p,i)=>[p.id,i]));
  const idx=id=>ps.has(id)?ps.get(id):-1;
  put(state.players.length);put(state.geom.nodes.length);put(state.geom.edges.length);
  put(state.discardLimit);put(state.victoryTarget);
  for(let p=0;p<P;p++)for(const kind of RESOURCE_KINDS)put(state.players[p]?.resources[kind]||0);
  for(let p=0;p<P;p++)put(state.players[p]?.departed?1:0);
  for(const key of ['vpDev','newIslandVP','ttdFarSideVP','army'])for(let p=0;p<P;p++)put(state.players[p]?.[key]||0);
  for(let i=0;i<N;i++)put(idx(state.geom.nodes[i]?.building?.owner));
  for(let i=0;i<N;i++)put(state.geom.nodes[i]?.building?.type==='city'?1:0);
  for(let i=0;i<E;i++)put(state.geom.edges[i]?.a||0);
  for(let i=0;i<E;i++)put(state.geom.edges[i]?.b||0);
  for(let i=0;i<E;i++)put(idx(state.geom.edges[i]?.roadOwner||state.geom.edges[i]?.shipOwner));
  for(let i=0;i<E;i++)put(state.geom.edges[i]?.roadOwner?1:state.geom.edges[i]?.shipOwner?2:0);
  put(idx(state.longestRoad.playerId));put(state.longestRoad.length);
  put(idx(state.largestArmy.playerId));put(state.largestArmy.size);
  off+=P*4*2; // longest_by_player + vp
  off+=P*4*2; // resource totals + discards
  off+=P*5*4; // affordable costs
  off+=P*4;   // at victory target
  put(state.queries.length);
  for(const key of ['node','edge','player'])for(let i=0;i<Q;i++)put(state.queries[i]?.[key]||0);
  off+=Q*4*2; // geometric helper query outputs
  assert.equal(off,BYTES,'ABI buffer encoding size');
  return bytes;
}
function decode(buf) {
  let off=0;
  const get=()=>{const n=buf.readInt32LE(off);off+=4;return n;};
  const pc=get(),nc=get(),ec=get(),limit=get(),target=get();
  const hands=Array.from({length:P},()=>Array.from({length:R},get));
  const departed=Array.from({length:P},get);
  const stats=Array.from({length:4},()=>Array.from({length:P},get));
  const nodes=Array.from({length:2},()=>Array.from({length:N},get));
  const edges=Array.from({length:4},()=>Array.from({length:E},get));
  const title={roadOwner:get(),roadLength:get(),armyOwner:get(),armySize:get()};
  const longest=Array.from({length:P},get),vp=Array.from({length:P},get);
  const totals=Array.from({length:P},get),discard=Array.from({length:P},get);
  const afford=Array.from({length:P},()=>Array.from({length:5},get));
  const win=Array.from({length:P},get);
  const qcount=get();
  const queries=Array.from({length:3},()=>Array.from({length:Q},get));
  const settlement=Array.from({length:Q},get),connected=Array.from({length:Q},get);
  assert.equal(off,BYTES);
  return {pc,nc,ec,limit,target,title,longest,vp,totals,discard,afford,win,settlement,connected,qcount};
}
function parity(options={}) {
  const count=Number(options.count || 100);
  if(!Number.isInteger(count)||count<1||count>10000)throw new Error('Count must be between 1 and 10000');
  const executable=options.executable || path.join(__dirname,process.platform==='win32'?'hex_rules_runner.exe':'hex_rules_runner');
  if(!fs.existsSync(executable)){
    if(process.platform==='win32')throw new Error('Build native/hex-core/Build-Core-Windows.cmd first');
    const cc=cp.spawnSync('g++',['-O2','-std=c++17','-o',executable,path.join(__dirname,'hex_rules_core.cpp'),path.join(__dirname,'hex_rules_runner.cpp')],{encoding:'utf8',timeout:120000});
    if(cc.status!==0)throw new Error(`C++ compiler failed: ${cc.stderr||cc.error?.message}`);
  }
  const ref=reference(),rng=new RNG(),cases=Array.from({length:count},(_,i)=>makeState(ref,rng,i));
  const header=Buffer.alloc(16);[MAGIC,1,count,BYTES].forEach((value,i)=>header.writeUInt32LE(value,i*4));
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'hex-rules-core-parity-'));
  try {
    const input=path.join(temp,'input.bin'),output=path.join(temp,'output.bin');
    fs.writeFileSync(input,Buffer.concat([header,...cases.map(encode)]));
    const p=cp.spawnSync(executable,[input,output],{encoding:'utf8',timeout:90000,maxBuffer:1e6});
    if(p.status!==0)throw new Error(`Native executor failed: ${p.stderr||p.error?.message}`);
    const out=fs.readFileSync(output);
    assert.equal(out.length,16+count*BYTES);
    for(let i=0;i<count;i++){
      const s=cases[i];
      const native=decode(out.subarray(16+i*BYTES,16+(i+1)*BYTES));
      const before=structuredClone(s);
      ref.recomputeLongestRoad(s);
      ref.recomputeLargestArmy(s);
      ref.computeVP(s);
      const byId=id=>id==null?-1:s.players.findIndex(p=>p.id===id);
      const expected={roadOwner:byId(s.longestRoad.playerId),roadLength:s.longestRoad.length,
        armyOwner:byId(s.largestArmy.playerId),armySize:s.largestArmy.size};
      try {
        assert.deepEqual(native.title,expected,'title holder/size');
        assert.equal(native.qcount,s.queries.length);
        for(let q=0;q<s.queries.length;q++){
          const query=s.queries[q];
          assert.equal(native.settlement[q],Number(ref.settlementDistanceOk(s,query.node)),`settlement distance check ${q}`);
          assert.equal(native.connected[q],Number(ref.edgeConnectsToPlayer(s,query.edge,s.players[query.player].id)),`road connectivity check ${q}`);
        }
        for(let p=0;p<s.players.length;p++){
          const id=s.players[p].id;
          assert.equal(native.longest[p],ref.computeLongestRoadForPlayer(s,id),`route length player ${p}`);
          assert.equal(native.vp[p],s.players[p].vp,`victory points player ${p}`);
          assert.equal(native.totals[p],ref.resTotal(before.players[p]),`resource count player ${p}`);
          assert.equal(native.discard[p],ref.discardRequired(before.players[p],before.discardLimit),`discard threshold player ${p}`);
          for(let b=0;b<BUILD_COSTS.length;b++)
            assert.equal(native.afford[p][b],Number(ref.canAfford(before.players[p].resources,BUILD_COSTS[b])),`cost ${b} player ${p}`);
          assert.equal(native.win[p],Number(s.players[p].vp>=before.victoryTarget),`target threshold player ${p}`);
        }
      } catch(e){throw new Error(`Case ${i} (${s.players.length} players, ${s.geom.nodes.length} nodes, ${s.geom.edges.length} edges): ${e.message}`);}
    }
    return {count,coverage:'authoritative JS scoring, route/army titles, resources, discard and affordability; NOT full-game simulations'};
  } finally {fs.rmSync(temp,{recursive:true,force:true});}
}
if(require.main===module){
  try {
    const idx=process.argv.indexOf('--count');const count=idx>=0?Number(process.argv[idx+1]):100;
    const result=parity({count});
    console.log(`[hex-core-parity] PASS ${result.count} randomized board-state comparisons: ${result.coverage}`);
  }catch(e){console.error(`[hex-core-parity] FAIL ${e.stack||e}`);process.exitCode=1;}
}
module.exports={parity,encode,decode,reference};
