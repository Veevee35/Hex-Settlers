'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs');
const {parity}=require('../native/hex-core/core_parity');
const {verifyReport}=require('../scripts/validate_100_full_games');
const {ALL_MAPS}=require('../scripts/train_neural_ai_all_maps');

test('C++ score, title, affordability, spacing and road connectivity match authoritative JavaScript on 100 board states',t=>{
  if(process.platform!=='win32'){
    const cc=spawnSync('g++',['--version'],{timeout:2000});
    if(cc.status!==0)return t.skip('g++ not installed');
  }else if(!fs.existsSync(path.join(__dirname,'../native/hex-core/hex_rules_runner.exe'))){
    // Windows test first needs a built executable from Build-Core-Windows.cmd.
    return t.skip('Run native/hex-core/Build-Core-Windows.cmd first');
  }
  assert.equal(parity({count:100}).count,100);
});

test('100-game report rejects short/incomplete runs and mismatched neural accounting',()=>{
  const maps=ALL_MAPS.filter(x=>!x.customBuilder);
  const games=Array.from({length:100},(_,i)=>({
    gameId:`game-${i}`, modelTrainedGames:1235 + i, nativeScoringCalls:20, nativeRouteCalls:10,
    sessionIndex:i, mapId:maps[i%maps.length].id, players:maps[i%maps.length].players,
    turnNumber:42, winner:'expert',winnerVp:maps[i%maps.length].victoryPoints,
    victoryPointsToWin:maps[i%maps.length].victoryPoints,
  }));
  const report={mode:'neural_net_self_play',requestedGames:100,completedGames:100,
    startingTrainedGames:1234,finalTrainedGames:1334,mapSet:'standard',games};
  assert.equal(verifyReport(report,1234).scenariosCovered,19);
  assert.throws(()=>verifyReport({...report,completedGames:99},1234),/Not a completed/);
  assert.throws(()=>verifyReport({...report,finalTrainedGames:1333},1234),/accounting/);
  assert.throws(()=>verifyReport({...report,games:games.map(g=>({...g,mapId:'classic',players:4,victoryPointsToWin:10,winnerVp:10}))},1234),/duplicate|coverage|scenario/);
});

test('Full-match validation requires native rules execution in every game', () => {
  const maps = ALL_MAPS.filter(x => !x.customBuilder);
  const games = Array.from({ length: 100 }, (_, i) => ({
    gameId: `game-${i}`, modelTrainedGames: i + 1, nativeScoringCalls: 20, nativeRouteCalls: i ? 10 : 0,
    sessionIndex: i, mapId: maps[i % maps.length].id, players: maps[i % maps.length].players,
    turnNumber: 42, winner: 'Neural', winnerVp: 14, victoryPointsToWin: maps[i % maps.length].victoryPoints,
  }));
  assert.throws(() => verifyReport({
    mode: 'neural_net_self_play', requestedGames: 100, completedGames: 100,
    startingTrainedGames: 0, finalTrainedGames: 100, mapSet: 'standard', games,
  }, 0), /Missing native execution/);
});

test('fast self-play shares frozen topology and isolates mutable candidate state', () => {
  const vm = require('node:vm');
  const source = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
  const start = source.indexOf('const simulationTopologies =');
  const end = source.indexOf('function buildGeometry(radius', start);
  assert.ok(start >= 0 && end > start);
  const clone = vm.runInNewContext(source.slice(start, end) + ';cloneGameForSimulation', {
    FAST_SELF_PLAY: true,
    deepClone: value => JSON.parse(JSON.stringify(value)),
  });
  const original = { geom: { nodeEdges: [[0]], nodeAdjTiles: [[0]], edgeAdjTiles: [[0]],
    nodes: [{ building: null }], edges: [{ roadOwner: null }], tiles: [{ type: 'sea' }] } };
  const first = clone(original), second = clone(original);
  assert.equal(first.geom.nodeEdges, second.geom.nodeEdges);
  assert.ok(Object.isFrozen(first.geom.nodeEdges[0]));
  first.geom.nodes[0].building = { owner: 'p1' };
  first.geom.edges[0].roadOwner = 'p1';
  first.geom.tiles[0].type = 'forest';
  assert.deepEqual(second.geom.nodes, original.geom.nodes);
  assert.deepEqual(second.geom.edges, original.geom.edges);
  assert.deepEqual(second.geom.tiles, original.geom.tiles);
});
