'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'),'utf8');
const client = fs.readFileSync(path.join(root, 'public/app.js'),'utf8');
const html = fs.readFileSync(path.join(root, 'public/index.html'),'utf8');
const css = fs.readFileSync(path.join(root, 'public/styles.css'),'utf8');
function source(name, afterName) {
  const begin = server.indexOf(`function ${name}(`);
  const end = server.indexOf(`\nfunction ${afterName}(`, begin);
  assert.ok(begin >= 0 && end > begin, name);
  return server.slice(begin,end);
}
test('public listings include the actual fog-safe map and rules but no private, playing, or Casual rooms',()=>{
  const board=[{cx:0,cy:0,type:'forest',number:6}, {cx:1.73,cy:0,type:'gold',number:8,fog:true,revealed:false}];
  const rooms = [
    {code:'OPEN1', visibility:'public', hostId:'u1', players:[{id:'u1',name:'Host',ready:true},{id:'ai',name:'AI',isAI:true}], rules:{mapMode:'seafarers',seafarersScenario:'fog_island',victoryPointsToWin:12,playTurnMs:0,diceAlgorithm:'corrected'}, aiDifficulty:'hard',createdAt:1,preview:{geom:{tiles:board}}},
    {code:'PRIV2',visibility:'private',players:[],rules:{},createdAt:2},
    {code:'CASU3',visibility:'public',casual:true,players:[],rules:{},createdAt:3},
    {code:'RUNN4',visibility:'public',game:{phase:'main-await-roll'},players:[],rules:{},createdAt:4},
    {code:'LOCK5',visibility:'public',friendsOnly:true,players:[],rules:{},createdAt:5},
  ];
  let previews=0;
  const context={rooms:new Map(rooms.map(r=>[r.code,r])),DEFAULT_RULES:{},maxPlayersForRules:()=>4,
    canAccessRoom:(r,id)=>!r.friendsOnly || id==='friend',ensurePreview:(r)=>{previews++; assert.strictEqual(r.preview.geom.tiles,board);}};
  vm.runInNewContext(source('visiblePublicLobbies','isRoomBoss'),context);
  const results=Array.from(context.visiblePublicLobbies('stranger'));
  assert.deepEqual(results.map(r=>r.code),['OPEN1']);
  assert.equal(previews,1);
  assert.equal(results[0].openSeats,2);
  assert.equal(results[0].readyPlayers,1);
  assert.equal(results[0].victoryPoints,12);
  assert.equal(results[0].timerSeconds,0);
  assert.equal(results[0].scenario,'fog_island');
  assert.deepEqual(Array.from(results[0].playerNames),['Host']);
  assert.equal(results[0].mapPreview[0].number,6);
  assert.equal(results[0].mapPreview[1].type,'unexplored');
  assert.equal(results[0].mapPreview[1].number,null);
  assert.equal(results[0].mapPreview[1].x,1.73);
});
test('public lobby browser filters and detail screen are reachable and backed by server data',()=>{
  for (const id of ['publicLobbySearch','publicLobbyMapFilter','publicLobbySeatsFilter','publicLobbyTimerFilter','publicLobbySort','publicLobbyCount','journeyLobbyDetailPanel','publicLobbyDetailBackBtn','publicLobbyDetailRefreshBtn','publicLobbyDetailMap','publicLobbyDetailFields','publicLobbyDetailJoinBtn']){
    assert.ok(html.includes(`id="${id}"`),id);
  }
  assert.match(client,/selectedPublicLobbyCode = item\.code/);
  assert.match(client,/drawRankedMiniMap\(map, item\.mapPreview\)/);
  assert.match(client,/if \(journeyView === 'detail'\) return setJourneyView\('public'\)/);
  assert.match(client,/journeyView !== 'home'\) return setJourneyView\('home'\)/);
  assert.match(client,/beginJourneyJoin\(lobby\.code\)/);
  assert.match(css,/\.publicLobbyFilters/);
});
test('Casual offers only built-in texture choices, hiding and disabling custom import/export',()=>{
  assert.match(client,/function isCasualTextureMode/);
  assert.match(client,/listLocalTexturePacks\(\)\.filter\(p => !casual \|\| p\.builtin\)/);
  assert.match(client,/listLocalTexturePacks\(\)\.filter\(pack => !casual \|\| pack\.builtin\)/);
  assert.match(client,/if \(isCasualTextureMode\(\)\) return;/);
  assert.match(client,/const target = isCasualTextureMode\(\) && !isBuiltinTexturePackId\(requested\)/);
  assert.match(css,/body\.casual-mode #downloadTexturePackBtn/);
  assert.ok(html.includes('id="rankedBackBtn"'));
});
