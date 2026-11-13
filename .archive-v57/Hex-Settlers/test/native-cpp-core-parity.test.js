'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs');
const {parity}=require('../native/hex-core/core_parity');
const {verifyReport}=require('../scripts/validate_100_full_games');
const {ALL_MAPS}=require('../scripts/neural-map-catalog');

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
    sessionIndex:i, mapId:maps[i%maps.length].id, players:maps[i%maps.length].players,
    turnNumber:42, winner:'expert',winnerVp:maps[i%maps.length].victoryPoints,
    victoryPointsToWin:maps[i%maps.length].victoryPoints,
  }));
  const report={mode:'neural_net_self_play',requestedGames:100,completedGames:100,
    startingTrainedGames:1234,finalTrainedGames:1334,mapSet:'standard',games};
  assert.equal(verifyReport(report,1234).scenariosCovered,19);
  assert.throws(()=>verifyReport({...report,completedGames:99},1234),/Not a completed/);
  assert.throws(()=>verifyReport({...report,finalTrainedGames:1333},1234),/accounting/);
  assert.throws(()=>verifyReport({...report,games:games.map(g=>({...g,mapId:'classic'}))},1234),/duplicate|coverage|scenario/);
});

test('Native engine cannot be mistakenly advertised as a full-game or live server replacement',()=>{
  const source=fs.readFileSync(path.join(__dirname,'../native/hex-core/hex_rules_core.hpp'),'utf8');
  const validation=fs.readFileSync(path.join(__dirname,'../scripts/validate_100_full_games.js'),'utf8');
  assert.match(source,/NOT\s*\n\/\/ the complete game engine/);
  assert.match(validation,/nativeCppEngineUsed:false/);
  assert.match(validation,/fullCppMigrationValidated:false/);
});
