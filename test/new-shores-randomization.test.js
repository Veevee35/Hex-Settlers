'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const src = fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');
const extract = (start,end) => src.slice(src.indexOf(start),src.indexOf(end,src.indexOf(start)));
const source = [
  extract('function isNewShoresScenario(', '\nfunction seafarersScenarioKey('),
  extract('function newShoresGeometry(', '\nconst MAP78_PRESETS')
].join('\n');
const neighbors = [[1,0],[-1,0],[0,1],[0,-1],[1,-1],[-1,1]];
function buildGeometryFromAxials(axials) {
  const tiles = axials.map((p,id)=>({...p,id}));
  const lookup = new Map(tiles.map(t=>[`${t.q},${t.r}`,t.id]));
  const tileNeighbors = tiles.map(t=>neighbors.map(([dq,dr])=>lookup.get(`${t.q+dq},${t.r+dr}`)).filter(i=>i!==undefined));
  return {tiles,tileNeighbors};
}
function matchingTileComponents(geom,predicate) {
  const eligible = new Set(geom.tiles.filter(predicate).map(t=>t.id));
  const seen = new Set(), groups = [];
  for (const id of eligible) {
    if(seen.has(id))continue;
    const group=new Set(),stack=[id];seen.add(id);
    while(stack.length){const curr=stack.pop();group.add(curr);for(const n of geom.tileNeighbors[curr])if(eligible.has(n)&&!seen.has(n)){seen.add(n);stack.push(n);}}
    groups.push(group);
  }
  return groups;
}
const context={buildGeometryFromAxials,matchingTileComponents,axialKey:(q,r)=>`${q},${r}`,shuffle:xs=>xs.sort(()=>Math.random()-0.5),generatePorts:()=>Array.from({length:9},(_,id)=>({id})),seafarersScenarioKey:g=>g.rules.seafarersScenario,HFNS_MAIN_ISLAND_KEYS:new Set()};
vm.createContext(context);
vm.runInContext(source,context);
for (const n of ['56','78']) test(`New Shores ${n} randomizes terrain, isolates gold, and locks setup to mainland`,()=>{
  const template = require(`../server/maps-new-shores/heading_for_new_shores_${n}.json`);
  const pool = n==='56' ? [2,2,3,3,3,4,4,4,4,5,5,5,5,5,6,6,6,6,6,8,8,8,8,8,9,9,9,9,9,10,10,10,10,11,11,11,12,12] : [2,2,2,3,3,3,3,4,4,4,4,4,5,5,5,5,5,5,6,6,6,6,6,6,8,8,8,8,8,8,9,9,9,9,9,9,10,10,10,10,10,11,11,11,11,12,12,12];
  const originalCounts={};for(const t of template.tiles)originalCounts[t.type]=(originalCounts[t.type]||0)+1;
  const layouts=new Set(), goldPositions=new Set();
  for(let attempt=0;attempt<30;attempt++){
    const geom=context.newShoresGeometry(template,pool);
    const counts={};for(const t of geom.tiles)counts[t.type]=(counts[t.type]||0)+1;
    assert.deepEqual(counts,originalCounts);
    assert.deepEqual(geom.tiles.filter(t=>t.type==='sea').map(t=>`${t.q},${t.r}`),template.tiles.filter(t=>t.type==='sea').map(t=>`${t.q},${t.r}`));
    const groups=matchingTileComponents(geom,t=>t.type!=='sea').sort((a,b)=>b.size-a.size), main=groups[0];
    assert.equal([...main].filter(id=>geom.tiles[id].type==='gold').length,0);
    assert.equal(geom.tiles.filter(t=>t.type==='gold').length,3);
    assert.ok(geom.tiles.filter(t=>t.type==='gold').every(t=>t.number!==6 && t.number!==8), 'gold fields must not receive 6 or 8');
    if (n==='78') { assert.equal(geom.tiles.length,65); assert.equal(geom.tiles.filter(t=>t.type==='sea').length,17); }
    assert.equal(geom.tiles.filter(t=>t.number!==null).length,pool.length);
    assert.equal(geom.ports.length,9);
    const mainlandId=[...main][0], offshoreId=[...groups[1]][0];
    geom.nodeAdjTiles=[[mainlandId],[offshoreId]];
    const game={geom,rules:{seafarersScenario:`heading_for_new_shores_${n}`}};
    assert.equal(context.nodeIsOnHFNSMainIsland(game,0),true);
    assert.equal(context.nodeIsOnHFNSMainIsland(game,1),false);
    layouts.add(geom.tiles.map(t=>t.type).join(','));
    goldPositions.add(geom.tiles.filter(t=>t.type==='gold').map(t=>t.id).join(','));
  }
  assert.ok(layouts.size>1,'terrain needs to move between games');
  assert.ok(goldPositions.size>1,'gold fields need to move between small islands');
});
