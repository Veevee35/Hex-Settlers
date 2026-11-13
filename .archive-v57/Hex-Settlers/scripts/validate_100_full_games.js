#!/usr/bin/env node
'use strict';
/**
 * Run 100 COMPLETE matches through the existing, authoritative JavaScript
 * engine, with real neural AI seats and rule-enforced winners.
 *
 * This is a JS regression baseline, NOT a test of a complete C++ engine. The
 * C++ engine is incomplete and intentionally not live-wired. To protect the
 * user's model, the entire run uses an isolated working copy and a resumable
 * checkpoint in scripts/output/validation-100/.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawn} = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const {ALL_MAPS} = require('./neural-map-catalog');
const STANDARD = ALL_MAPS.filter(map=>!map.customBuilder);
const TOTAL=100;
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

function verifyReport(report, baselineCount) {
  if(!report || report.mode!=='neural_net_self_play' || report.requestedGames!==TOTAL ||
     report.completedGames!==TOTAL || !Array.isArray(report.games) || report.games.length!==TOTAL)
    throw new Error('Not a completed 100-game authoritative JS training report');
  if(report.mapSet!=='standard')throw new Error('Validation must exclude Test Builder (MAP_SET=standard)');
  if(Number(report.startingTrainedGames)!==Number(baselineCount) ||
     Number(report.finalTrainedGames)!==Number(baselineCount)+TOTAL)
    throw new Error('Neural model trained-games accounting failed');
  const seen=new Set(),byMap=Object.fromEntries(STANDARD.map(map=>[map.id,0]));
  for(const g of report.games){
    if(!Number.isInteger(g.sessionIndex)||g.sessionIndex<0||g.sessionIndex>=TOTAL||seen.has(g.sessionIndex))
      throw new Error(`Missing or duplicate simulation index: ${g.sessionIndex}`);
    seen.add(g.sessionIndex);
    if(!Object.hasOwn(byMap,g.mapId))throw new Error(`Unexpected map ${g.mapId}`);
    byMap[g.mapId]++;
    if(![4,6,8].includes(g.players)||!Number.isFinite(g.turnNumber)||g.turnNumber<=0||
       !Number.isFinite(g.winnerVp)||g.winnerVp<g.victoryPointsToWin||!g.winner)
      throw new Error(`Invalid victory in game ${g.sessionIndex+1}`);
  }
  const missing=Object.keys(byMap).filter(key=>byMap[key]===0);
  if(missing.length)throw new Error(`100 games completed, but scenario coverage is incomplete: ${missing.join(', ')}`);
  return {ok:true,completed:seen.size,scenariosCovered:Object.keys(byMap).length,
    playerCounts:[...new Set(report.games.map(g=>g.players))].sort(),byMap,
    averageVictoryTurn:report.averageVictoryTurn,
    replacements:report.scenariosReplaced?.length||0};
}

async function main(){
  try { require.resolve('ws'); } catch (_) { throw new Error('WebSocket dependency missing. Run "npm ci" first (requires registry connectivity).'); }
  const rootModel=path.join(ROOT,'neural_ai_model.json');
  const dir=path.resolve(process.env.TEST_GAME_WORKSPACE||path.join(ROOT,'scripts','output','validation-100'));
  const model=path.join(dir,'neural_ai_model.json');
  const snapshot=path.join(dir,'baseline-model.json');
  const report=path.join(dir,'100-games-report.json');
  const summary=path.join(dir,'100-games-validation.json');
  const log=path.join(dir,'training.log');
  fs.mkdirSync(dir,{recursive:true});
  if(fs.existsSync(report)){
    const info=verifyReport(JSON.parse(fs.readFileSync(report,'utf8')),JSON.parse(fs.readFileSync(snapshot,'utf8')).trainedGames||0);
    console.log(`[100-full-games] Previously completed report passed validation: ${JSON.stringify(info)}`);
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
  console.log(`[100-full-games] Running ${TOTAL} complete real JS-engine matches (19 standard maps, 4/6/8 seats).`);
  console.log(`[100-full-games] Original model remains untouched: ${rootModel}`);
  console.log(`[100-full-games] Isolated checkpoint and logs: ${dir}`);
  const child=spawn(process.execPath,[path.join(__dirname,'train_neural_ai_all_maps.js')],{
    cwd:ROOT,
    env:{...process.env, MODEL_PATH:model, TRAINING_OUTPUT:report, SIMS:String(TOTAL),
      MAP_SET:'standard',BATCH_SIZE:'10',CONCURRENCY:'2',RESUME_TRAINING:'1',
      TRAINING_ACCELERATOR:'cpu',KEEP_TRAINING_TEMP:'0', RESUME_RUN_DIR:'',
      CURRICULUM_OFFSET:'0'},
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
  if(exit.code!==0)throw new Error(`Full-game baseline stopped (${exit.code??exit.signal}). Resume by running this script again; see ${log}`);
  const output=JSON.parse(fs.readFileSync(report,'utf8'));
  const baseline=JSON.parse(fs.readFileSync(snapshot,'utf8'));
  const result=verifyReport(output,baseline.trainedGames||0);
  fs.writeFileSync(summary,JSON.stringify({
    kind:'authoritative-JavaScript-complete-matches',
    nativeCppEngineUsed:false,
    fullCppMigrationValidated:false,
    ...result,
    report, timestamp:new Date().toISOString(),
  },null,2)+'\n');
  console.log(`[100-full-games] PASS ${TOTAL} completed JS-engine matches across ${result.scenariosCovered} scenarios. Summary: ${summary}`);
  console.log('[100-full-games] Does NOT establish C++ full-game parity. Native kernel remains experimental.');
}
if(require.main===module)main().catch(e=>{console.error(`[100-full-games] FAIL: ${e.stack||e}`);process.exitCode=1;});
module.exports={verifyReport};
