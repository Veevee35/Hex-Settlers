'use strict';
// The board masks are the original author-provided 7–8-player JSON layouts.
// Each fixture preserves its exact axial coordinates. Token inventories are
// taken from the companion reference charts, not the temporary test-painting.
const fs = require('fs');
const path = require('path');
const folder = path.join(__dirname, 'maps-78');
const fixtures = Object.freeze({
  classic_78: 'classic78-classic.json',
  classic_78_custom: 'classic78-custom.json',
  test_builder_78: 'seafarers78-custom.json',
  eight_islands_78: 'seafarers78-eight-islands.json',
  through_the_desert_78: 'seafarers78-through-desert.json',
  fog_island_78: 'seafarers78-fog-island.json',
  cartographer_78_7: 'seafarers78-scattered7.json',
  cartographer_78_8: 'seafarers78-scattered8.json',
});
const TERRAINS = Object.freeze(['hills', 'forest', 'pasture', 'field', 'mountains']);
const discCounts = counts => [2,3,4,5,6,8,9,10,11,12].flatMap((number, i) => Array(counts[i]).fill(number));
const TOKEN_POOLS = Object.freeze({
  classic_78: discCounts([2,4,4,5,5,5,5,4,4,2]),
  eight_islands_78: discCounts([2,4,4,5,5,5,5,4,4,2]),
  through_the_desert_78: discCounts([3,5,5,6,6,6,6,5,5,3]),
  fog_island_78_faceup: discCounts([2,2,3,4,4,4,4,3,2,2]),
  fog_island_78_hidden: discCounts([2,2,2,2,2,2,2,2,2,1]),
  scattered_78_7: discCounts([3,4,4,5,5,5,5,4,4,3]),
  scattered_78_8: discCounts([4,4,5,5,6,6,5,5,4,4]),
});
const load = id => {
  const filename = fixtures[id];
  if (!filename) throw new Error(`Unknown 7–8 map: ${id}`);
  const result = JSON.parse(fs.readFileSync(path.join(folder, filename), 'utf8'));
  if (!Array.isArray(result.tiles)) throw new Error(`Invalid fixture ${filename}`);
  return result;
};
const scenario78 = value => ['eight_islands_78','through_the_desert_78','fog_island_78','cartographer_78_random','cartographer_78_manual','test_builder_78'].includes(String(value || ''));
const is78 = rules => String(rules?.mapMode || '') === 'classic78' ||
  (String(rules?.mapMode || '') === 'seafarers' && scenario78(rules?.seafarersScenario));
const isCustom78 = rules => (String(rules?.mapMode || '') === 'classic78' && rules?.customMap !== false) ||
  (String(rules?.mapMode || '') === 'seafarers' && rules?.seafarersScenario === 'test_builder_78');
function templateFor(rules, playerCount) {
  if (String(rules?.mapMode || '') === 'classic78') return load(isCustom78(rules) ? 'classic_78_custom' : 'classic_78');
  const scenario = String(rules?.seafarersScenario || 'test_builder_78');
  if (scenario === 'test_builder_78') return load('test_builder_78');
  if (scenario === 'cartographer_78_random' || scenario === 'cartographer_78_manual')
    return load(playerCount >= 8 ? 'cartographer_78_8' : 'cartographer_78_7');
  return load(scenario);
}
function mix(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i],copy[j]] = [copy[j],copy[i]];
  }
  return copy;
}
const pool = (n, types, includeDesert = 0, gold = 0) => [
  ...Array(includeDesert).fill('desert'), ...Array(gold).fill('gold'),
  ...TERRAINS.flatMap(type => Array(n).fill(type)),
];
const key = tile => `${tile.q},${tile.r}`;
// Discs are an exact multiset. Prefer distributing 6/8 apart where feasible;
// gold tiles never receive 6 or 8.
function distributeNumbers(tiles, numbers, neighbors = []) {
  const eligible = tiles.filter(t => !['sea','desert','unexplored'].includes(t.type));
  if (eligible.length !== numbers.length) throw new Error(`7–8 token count mismatch: ${eligible.length} tiles / ${numbers.length} numbers`);
  for (let attempt=0; attempt<2000; attempt++) {
    const shuffled = mix(numbers);
    const goldFirst = eligible.filter(t=>t.type==='gold');
    const ordinary = eligible.filter(t=>t.type!=='gold');
    const safe = shuffled.filter(n=>n!==6&&n!==8), red=shuffled.filter(n=>n===6||n===8);
    if (safe.length < goldFirst.length) continue;
    const goldNums = safe.splice(0,goldFirst.length);
    const ordinaryNums = mix([...safe,...red]);
    const candidates = [...goldFirst,...ordinary];
    for (let i=0;i<candidates.length;i++) candidates[i].number=i<goldFirst.length?goldNums[i]:ordinaryNums[i-goldFirst.length];
    const redTiles = new Set(candidates.filter(t=>t.number===6||t.number===8).map(t=>t.id));
    if (!redTiles.size || !neighbors.length || candidates.every(t=>!redTiles.has(t.id)||!(neighbors[t.id]||[]).some(n=>redTiles.has(n)))) return;
  }
  // Keep exact token inventory even for custom masks where perfect spacing is impossible.
}
function construct78Tiles(geom, rules, playerCount) {
  const scenario = String(rules?.mapMode || '')==='classic78' ? 'classic_78' : String(rules?.seafarersScenario || '');
  const fixture = templateFor(rules, playerCount);
  const originals = new Map(fixture.tiles.map(t=>[key(t),t]));
  const tiles = geom.tiles.map(t=>({...t, type: originals.get(key(t))?.type || 'sea', number:null, robber:false, pirate:false}));
  if (isCustom78(rules)) {
    for (const t of tiles) {
      const saved=originals.get(key(t));
      t.number=saved?.number??null; t.robber=!!saved?.robber; t.pirate=!!saved?.pirate;
      if(saved?.fog) {t.fog=true;t.revealed=false;t.hiddenType=saved.hiddenType||saved.type||'sea';t.hiddenNumber=saved.hiddenNumber??null;t.type='sea';t.number=null;}
    }
    return tiles;
  }
  const land = tiles.filter(t=>t.type!=='sea');
  if (scenario==='classic_78') {
    const types=mix(pool(8,TERRAINS,3));
    land.forEach((t,i)=>t.type=types[i]);
    distributeNumbers(tiles,TOKEN_POOLS.classic_78,geom.tileNeighbors);
  } else if (scenario==='eight_islands_78') {
    const types=mix(pool(8,TERRAINS));
    land.forEach((t,i)=>t.type=types[i]);
    distributeNumbers(tiles,TOKEN_POOLS.eight_islands_78,geom.tileNeighbors);
  } else if (scenario==='through_the_desert_78') {
    const fixedDeserts=land.filter(t=>t.type==='desert');
    const ordinary=land.filter(t=>t.type!=='desert');
    const types=mix(pool(9,TERRAINS,0,5));
    if(fixedDeserts.length!==7||ordinary.length!==types.length) throw new Error('Unexpected Through the Desert geometry');
    ordinary.forEach((t,i)=>t.type=types[i]);
    distributeNumbers(tiles,TOKEN_POOLS.through_the_desert_78,geom.tileNeighbors);
  } else if (scenario==='fog_island_78') {
    // Fog Island has 23 center fog tiles: 4 sea, 4 gold and three of each
    // ordinary terrain. Outer two islands start face-up with six of each.
    const distance = t => Math.max(Math.abs(t.q),Math.abs(t.r),Math.abs(t.q+t.r));
    const center = new Set();
    // Select the *central* 23 by the exact intended hidden inventory: four
    // sea, four gold and three of each resource. This preserves the two
    // starting island masks and all 26 face-up sea hexes from the template.
    const hiddenKinds = {sea:4,gold:4,hills:3,forest:3,pasture:3,field:3,mountains:3};
    for (const [type,count] of Object.entries(hiddenKinds)) {
      const nearest=tiles.filter(t=>t.type===type).sort((a,b)=>distance(a)-distance(b)||a.r-b.r||a.q-b.q);
      if(nearest.length<count) throw new Error(`Fog Island fixture lacks ${type} tiles`);
      nearest.slice(0,count).forEach(t=>center.add(key(t)));
    }
    if(center.size!==23) throw new Error('Fog Island must have 23 concealed center hexes');
    const visible=tiles.filter(t=>!center.has(key(t)));
    const starting=mix(pool(6,TERRAINS));
    const visibleLand=visible.filter(t=>t.type!=='sea');
    if(visibleLand.length!==30||visible.filter(t=>t.type==='sea').length!==26)
      throw new Error('Fog Island starting-island geometry differs from chart');
    visibleLand.forEach((t,i)=>{t.type=starting[i];t.number=null;});
    distributeNumbers(visibleLand,TOKEN_POOLS.fog_island_78_faceup,geom.tileNeighbors);
    const hidden=tiles.filter(t=>center.has(key(t)));
    const fogTypes=mix([...pool(3,TERRAINS,0,4),...Array(4).fill('sea')]);
    hidden.forEach((t,i)=>{t.fog=true;t.revealed=false;t.hiddenType=fogTypes[i];t.type='sea';t.number=null;});
    const hiddenLand=hidden.filter(t=>t.hiddenType!=='sea').map(t=>({...t,type:t.hiddenType}));
    distributeNumbers(hiddenLand,TOKEN_POOLS.fog_island_78_hidden,geom.tileNeighbors);
    hiddenLand.forEach(t=>{const original=tiles[t.id];original.hiddenNumber=t.number;});
    return tiles;
  } else if (scenario==='cartographer_78_manual') {
    const count=playerCount>=8?8:7;
    const seaCount=count===8?41:48;
    // Manual draft: 7 terrain types per player, all remaining slots are sea.
    const seaKeys=new Set(mix(tiles).slice(0,seaCount).map(key));
    for (const t of tiles) t.type=seaKeys.has(key(t))?'sea':'unexplored';
    return tiles;
  } else if (scenario==='cartographer_78_random') {
    const count=playerCount>=8?8:7;
    const types=mix([...Array(count===8?41:48).fill('sea'),...pool(count,TERRAINS,count,count)]);
    if(types.length!==tiles.length) throw new Error('Unexpected scattered tile geometry');
    tiles.forEach((t,i)=>t.type=types[i]);
    distributeNumbers(tiles,TOKEN_POOLS[count===8?'scattered_78_8':'scattered_78_7'],geom.tileNeighbors);
  }
  const robber=tiles.find(t=>t.type==='desert')||tiles.find(t=>t.type!=='sea'&&t.number===12)||tiles.find(t=>t.type!=='sea');
  if(robber) robber.robber=true;
  return tiles;
}
module.exports={scenario78,is78,isCustom78,templateFor,construct78Tiles,TOKEN_POOLS};
