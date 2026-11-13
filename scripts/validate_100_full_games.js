#!/usr/bin/env node
'use strict';
// Run isolated full matches with the current native self-play backend.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawn} = require('node:child_process');
const { atomicWriteJson } = require('./training-file');
const ROOT = path.resolve(__dirname, '..');
const {ALL_MAPS} = require('./train_neural_ai_all_maps');
const STANDARD = ALL_MAPS.filter(map=>!map.customBuilder);
const TOTAL=100;
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

function verifyReport(report, baselineCount) {
  const gameIds = new Set();
  const trainedCounts = new Set();
  if(!report || report.mode!=='neural_net_self_play' || report.requestedGames!==TOTAL ||
     report.completedGames!==TOTAL || !Array.isArray(report.games) || report.games.length!==TOTAL)
    throw new Error('Not a completed 100-game native-assisted training report');
  if(report.mapSet!=='standard')throw new Error('Validation must exclude Test Builder (MAP_SET=standard)');
  if(Number(report.startingTrainedGames)!==Number(baselineCount) ||
     Number(report.finalTrainedGames)!==Number(baselineCount)+TOTAL)
    throw new Error('Neural model trained-games accounting failed');
  const seen=new Set(),byMap=Object.fromEntries(STANDARD.map(map=>[map.id,0]));
  const scenarios = new Map(STANDARD.map(map => [map.id, map]));
  for(const g of report.games){
    if(!Number.isInteger(g.sessionIndex)||g.sessionIndex<0||g.sessionIndex>=TOTAL||seen.has(g.sessionIndex))
      throw new Error(`Missing or duplicate simulation index: ${g.sessionIndex}`);
    seen.add(g.sessionIndex);
    if (!g.gameId || gameIds.has(g.gameId) || !Number.isSafeInteger(g.nativeScoringCalls) ||
        g.nativeScoringCalls < 1 || !Number.isSafeInteger(g.nativeRouteCalls) || g.nativeRouteCalls < 1) {
      throw new Error(`Missing native execution or duplicate game ID for simulation ${g.sessionIndex + 1}`);
    }
    if (report.nativeProduction === true &&
        (!Number.isSafeInteger(g.nativeProductionCalls) || g.nativeProductionCalls < 1)) {
      throw new Error(`Missing native dice production in simulation ${g.sessionIndex + 1}`);
    }
    gameIds.add(g.gameId);
    if (!Number.isSafeInteger(g.modelTrainedGames) || g.modelTrainedGames <= baselineCount ||
        g.modelTrainedGames > Number(baselineCount) + TOTAL || trainedCounts.has(g.modelTrainedGames)) {
      throw new Error(`Invalid model training receipt in game ${g.sessionIndex + 1}`);
    }
    trainedCounts.add(g.modelTrainedGames);
    if(!Object.hasOwn(byMap,g.mapId))throw new Error(`Unexpected map ${g.mapId}`);
    byMap[g.mapId]++;
    const map = scenarios.get(g.mapId);
    if(g.players !== map.players || g.victoryPointsToWin !== map.victoryPoints ||
       !Number.isInteger(g.turnNumber) || g.turnNumber <= 0 ||
       !Number.isInteger(g.winnerVp) || g.winnerVp < map.victoryPoints || !g.winner)
      throw new Error(`Invalid victory in game ${g.sessionIndex+1}`);
  }
  const missing=Object.keys(byMap).filter(key=>byMap[key]===0);
  if(missing.length)throw new Error(`100 games completed, but scenario coverage is incomplete: ${missing.join(', ')}`);
  return {ok:true,completed:seen.size,scenariosCovered:Object.keys(byMap).length,
    playerCounts:[...new Set(report.games.map(g=>g.players))].sort(),byMap,
    averageVictoryTurn:report.averageVictoryTurn,
    replacements:report.scenariosReplaced?.length||0,
    nativeScoringCalls: report.games.reduce((total, game) => total + game.nativeScoringCalls, 0),
    nativeRouteCalls: report.games.reduce((total, game) => total + game.nativeRouteCalls, 0),
    nativeProductionCalls: report.games.reduce((total, game) => total + (game.nativeProductionCalls || 0), 0),
    nativeBankTradeCalls: report.games.reduce((total, game) => total + (game.nativeBankTradeCalls || 0), 0),
    nativeArmyCalls: report.games.reduce((total, game) => total + (game.nativeArmyCalls || 0), 0),
    accelerator: report.accelerator};
}

async function main(){
  try { require.resolve('ws'); } catch (_) { throw new Error('WebSocket dependency missing. Run "npm ci" first (requires registry connectivity).'); }
  const rootModel=path.join(ROOT,'neural_ai_model.json');
  const dir=path.resolve(process.env.TEST_GAME_WORKSPACE||path.join(ROOT,'scripts','output','validation-native-rules-100'));
  const model=path.join(dir,'neural_ai_model.json');
  const snapshot=path.join(dir,'baseline-model.json');
  const report=path.join(dir,'100-games-report.json');
  const summary=path.join(dir,'100-games-validation.json');
  const log=path.join(dir,'training.log');
  fs.mkdirSync(dir,{recursive:true});
  if (path.relative(ROOT, fs.realpathSync(dir)) === '') {
    throw new Error('TEST_GAME_WORKSPACE must be separate from the project root');
  }
  const verifyAndWrite = async (elapsedSeconds) => {
    const output = JSON.parse(fs.readFileSync(report, 'utf8'));
    const baseline = JSON.parse(fs.readFileSync(snapshot, 'utf8'));
    const result = verifyReport(output, baseline.trainedGames || 0);
    const previous = fs.existsSync(summary) ? JSON.parse(fs.readFileSync(summary, 'utf8')) : {};
    await atomicWriteJson(summary, {
      kind: 'native-assisted-complete-matches',
      nativeRules: ['victory-points', 'route-lengths', ...(output.nativeProduction ? ['dice-production'] : []),
        ...(result.nativeBankTradeCalls ? ['bank-inventory-trades'] : []), ...(result.nativeArmyCalls ? ['largest-army'] : [])],
      fullCppMigrationValidated: false,
      ...result,
      elapsedSeconds: elapsedSeconds ?? previous.elapsedSeconds ?? output.elapsedSeconds ?? null,
      report,
      timestamp: output.completedAt || new Date().toISOString(),
    });
    console.log(`[100-full-games] PASS ${TOTAL} completed native-assisted matches across ${result.scenariosCovered} scenarios. Summary: ${summary}`);
  };
  if (fs.existsSync(report)) {
    await verifyAndWrite();
    return;
  }
  if(!fs.existsSync(snapshot)){
    if(!fs.existsSync(rootModel))throw new Error(`Missing original neural model: ${rootModel}`);
    fs.copyFileSync(rootModel,snapshot);
    fs.copyFileSync(rootModel,model);
  } else if(!fs.existsSync(model)){
    // Resume uses the unmodified base model; training history resides in the
    // checkpoint file until the entire run completes.
    fs.copyFileSync(snapshot,model);
  }
  if(sha(snapshot)!==sha(model))throw new Error('Validation model diverged from its saved baseline; preserve existing checkpoint and choose another TEST_GAME_WORKSPACE');
  const pristineHash=sha(rootModel);
  console.log(`[100-full-games] Running ${TOTAL} complete native-assisted matches (19 standard maps, 4/6/8 seats).`);
  console.log(`[100-full-games] Original model remains untouched: ${rootModel}`);
  console.log(`[100-full-games] Isolated checkpoint and logs: ${dir}`);
  const started = performance.now();
  const child=spawn(process.execPath,[path.join(__dirname,'train_neural_ai_all_maps.js')],{
    cwd:ROOT,
    env:{...process.env, MODEL_PATH:model, TRAINING_OUTPUT:report, SIMS:String(TOTAL),
      MAP_SET:'standard',BATCH_SIZE:'25',CONCURRENCY:process.env.CONCURRENCY || '4',RESUME_TRAINING:'1',
      HEX_TRAINING_RULES:'cpp', HEX_TRAINING_FAST:'1', VP_TO_WIN:'', TRAINING_SCRATCH:dir,
      TRAINING_ACCELERATOR:process.env.TRAINING_ACCELERATOR || 'cpu',KEEP_TRAINING_TEMP:'0', RESUME_RUN_DIR:'',
      CURRICULUM_OFFSET:'0', TRAINING_CONTROL_FILE:''},
    windowsHide:true,stdio:['ignore','pipe','pipe'],
  });
  const stream=fs.createWriteStream(log,{flags:'a'});
  for(const source of [child.stdout,child.stderr])source.on('data',chunk=>{
    stream.write(chunk);(source===child.stdout?process.stdout:process.stderr).write(chunk);
  });
  const onInterrupt=()=>{if(child.exitCode==null)child.kill('SIGINT');};
  process.once('SIGINT',onInterrupt);
  const exit=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',(code,signal)=>resolve({code,signal}));});
  stream.end();process.removeListener('SIGINT',onInterrupt);
  if(sha(rootModel)!==pristineHash)throw new Error('CRITICAL: original model changed during isolated test');
  if(exit.code!==0)throw new Error(`Full-game validation stopped (${exit.code??exit.signal}). Resume by running this script again; see ${log}`);
  const finished = JSON.parse(fs.readFileSync(report, 'utf8'));
  if (finished.nativeProduction !== true) throw new Error('The new run did not exercise C++ dice production in every game');
  await verifyAndWrite((performance.now() - started) / 1000);
}
if(require.main===module)main().catch(e=>{console.error(`[100-full-games] FAIL: ${e.stack||e}`);process.exitCode=1;});
module.exports={verifyReport};
