'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { fallbackMap, validateCheckpoint } = require('../scripts/training-recovery');
const root = path.join(__dirname, '..');
const baseModel = JSON.parse(fs.readFileSync(path.join(root, 'neural_ai_model.json')));

test('fallback prefers other real maps with same player count and avoids attempted maps', () => {
  const maps = [{id:'classic78',players:8},{id:'islands78',players:8},{id:'fog78',players:8},{id:'classic',players:4}];
  assert.equal(fallbackMap(maps, maps[0], 1, ['classic78']).id, 'islands78');
  assert.equal(fallbackMap(maps, maps[1], 2, ['classic78','islands78']).id, 'fog78');
  assert.equal(fallbackMap(maps, maps[2], 3, ['classic78','islands78','fog78']).id, 'classic');
});

test('checkpoint cannot silently count stalled, duplicated, or mismatched games', () => {
  const items = [{sessionIndex:0},{sessionIndex:1}];
  const make = (ids) => ({ startingTrainedGames: 5, model: {trainedGames:5+ids.length}, games: ids.map(sessionIndex => ({sessionIndex, mapId:'classic'})) });
  assert.equal(validateCheckpoint(make([0,1]), 5, items, new Set(['classic'])).size,2);
  assert.throws(() => validateCheckpoint(make([0,0]), 5, items, new Set(['classic'])), /duplicate/);
  assert.throws(() => validateCheckpoint(make([0,2]), 5, items, new Set(['classic'])), /Invalid/);
  assert.throws(() => validateCheckpoint(make([0,1]), 7, items, new Set(['classic'])), /different base/);
  assert.throws(() => validateCheckpoint({ ...make([0,1]), model: {trainedGames:99}}, 5, items, new Set(['classic'])), /inconsistent/);
});

test('a full checkpoint resumes without launching a training server or duplicating weights', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hex-trainer-resume-test-'));
  try {
    const modulePath = path.join(tmp, 'node_modules', 'ws');
    fs.mkdirSync(modulePath, {recursive:true});
    fs.writeFileSync(path.join(modulePath, 'index.js'), 'module.exports = class UnusedWebSocket {};');
    const modelPath = path.join(tmp, 'model.json');
    const reportPath = path.join(tmp, 'report.json');
    fs.writeFileSync(modelPath, JSON.stringify(baseModel));
    const model = { ...baseModel, trainedGames: Number(baseModel.trainedGames)+2 };
    const games = [
      {sessionIndex:0,curriculumIndex:0,mapId:'classic',victoryPointsToWin:10,turnNumber:40,winner:'AI1',winnerVp:10,winnerMargin:2,goldProductionCards:0},
      {sessionIndex:1,curriculumIndex:1,mapId:'classic56',victoryPointsToWin:10,turnNumber:60,winner:'AI2',winnerVp:10,winnerMargin:3,goldProductionCards:0},
    ];
    fs.writeFileSync(`${reportPath}.checkpoint.json`, JSON.stringify({startingTrainedGames:Number(baseModel.trainedGames),model,games,totalGames:2,mapSet:'standard',curriculumOffset:0}));
    const child = spawnSync(process.execPath,[path.join(root,'scripts','train_neural_ai_all_maps.js')],{
      cwd:root,encoding:'utf8',timeout:12000,
      env:{...process.env,NODE_PATH:path.join(tmp,'node_modules'),SIMS:'2',BATCH_SIZE:'1',CONCURRENCY:'1',MAP_SET:'standard',RESUME_TRAINING:'1',MODEL_PATH:modelPath,TRAINING_OUTPUT:reportPath,KEEP_TRAINING_TEMP:'0'},
    });
    assert.equal(child.status,0,`${child.stderr}\n${child.stdout}`);
    assert.equal(JSON.parse(fs.readFileSync(reportPath)).completedGames,2);
    assert.equal(JSON.parse(fs.readFileSync(modelPath)).trainedGames,Number(baseModel.trainedGames)+2);
    assert.match(child.stdout,/2\/2 resumed/);
  } finally { fs.rmSync(tmp,{recursive:true,force:true}); }
});

test('old V1.0.52 failed evolutionary run can reuse a completed candidate and resume another checkpoint', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hex-evolution-resume-test-'));
  try {
    const modulePath = path.join(tmp, 'node_modules', 'ws');
    fs.mkdirSync(modulePath, {recursive:true});
    fs.writeFileSync(path.join(modulePath, 'index.js'), 'module.exports = class UnusedWebSocket {};');
    const modelPath = path.join(tmp, 'model.json');
    const reportPath = path.join(tmp, 'evolution-report.json');
    const runDir = path.join(tmp, '.neural-evolution-old');
    const first = path.join(runDir,'generation-01','candidate-01');
    const second = path.join(runDir,'generation-01','candidate-02');
    fs.mkdirSync(first,{recursive:true});fs.mkdirSync(second,{recursive:true});
    fs.writeFileSync(modelPath,JSON.stringify(baseModel));
    const trained = { ...baseModel, trainedGames:Number(baseModel.trainedGames)+1 };
    fs.writeFileSync(path.join(first,'neural_ai_model.json'),JSON.stringify(trained));
    fs.writeFileSync(path.join(second,'neural_ai_model.json'),JSON.stringify(baseModel));
    const game0 = {sessionIndex:0,curriculumIndex:0,mapId:'classic',victoryPointsToWin:10,turnNumber:50,winner:'A',winnerVp:10,winnerMargin:2,goldProductionCards:0};
    const game1 = {sessionIndex:0,curriculumIndex:1,mapId:'classic56',victoryPointsToWin:10,turnNumber:60,winner:'B',winnerVp:10,winnerMargin:3,goldProductionCards:0};
    fs.writeFileSync(path.join(first,'report.json'),JSON.stringify({games:[game0]}));
    fs.writeFileSync(path.join(second,'report.json.checkpoint.json'),JSON.stringify({startingTrainedGames:baseModel.trainedGames,model:trained,games:[game1]}));
    const env = {...process.env,NODE_PATH:path.join(tmp,'node_modules'),SIMS:'2',SELECTION_INTERVAL:'2',SHARDS:'2',BATCH_SIZE:'1',CONCURRENCY:'1',MAP_SET:'standard',RESUME_RUN_DIR:runDir,MODEL_PATH:modelPath,TRAINING_OUTPUT:reportPath,KEEP_TRAINING_TEMP:'1'};
    const firstRun = spawnSync(process.execPath,[path.join(root,'scripts','train_neural_ai_evolutionary.js')],{cwd:root,encoding:'utf8',timeout:12000,env});
    assert.equal(firstRun.status,0,`${firstRun.stderr}\n${firstRun.stdout}`);
    assert.match(firstRun.stdout,/reused completed candidate 1/);
    assert.match(firstRun.stdout,/recovered V1\.0\.52 starting model/);
    assert.equal(JSON.parse(fs.readFileSync(modelPath)).trainedGames,Number(baseModel.trainedGames)+2);
    assert.equal(JSON.parse(fs.readFileSync(reportPath)).completedGames,2);
    const secondRun = spawnSync(process.execPath,[path.join(root,'scripts','train_neural_ai_evolutionary.js')],{cwd:root,encoding:'utf8',timeout:12000,env});
    assert.equal(secondRun.status,0,`${secondRun.stderr}\n${secondRun.stdout}`);
    assert.match(secondRun.stdout,/reused completed generation 1/);
    assert.equal(JSON.parse(fs.readFileSync(modelPath)).trainedGames,Number(baseModel.trainedGames)+2);
  } finally { fs.rmSync(tmp,{recursive:true,force:true}); }
});
