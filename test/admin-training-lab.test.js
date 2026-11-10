'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { EventEmitter } = require('node:events');
const { TrainingLab, validateConfig, validModel, scoreReport } = require('../server/training-lab');

const root = path.resolve(__dirname, '..');
const baseModel = validModel(JSON.parse(fs.readFileSync(path.join(root, 'neural_ai_model.json'), 'utf8')));
const config = { gamesPerBatch:2, batches:1, servers:1000, checkpointSize:1, purpose:'train', mapSet:'standard', source:'live' };
const waitUntil = async (predicate) => { for (let i = 0; i < 75; i++) { if (predicate()) return; await new Promise(r => setTimeout(r, 15)); } throw Error('Timed out waiting for training job.'); };
function fixture({ finished = true, training = true } = {}) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hex-train-test-'));
  let live = structuredClone(baseModel), environment;
  const child = new EventEmitter(); child.stdout = new EventEmitter(); child.stderr = new EventEmitter();
  const lab = new TrainingLab({ dataDir, projectRoot:root, getLiveModel:() => live,
    promote: async model => { live = model; },
    spawnProcess: (_executable, _args, options) => {
      environment = options.env;
      if (finished) setImmediate(() => {
        const model = JSON.parse(fs.readFileSync(environment.MODEL_PATH,'utf8'));
        if (training) { model.trainedGames += 2; model.params.w1[0][0] += .001; }
        fs.writeFileSync(environment.MODEL_PATH,JSON.stringify(model));
        const report = { requestedGames:2, completedGames:2, averageVictoryTurn:71,
          finalTrainedGames:model.trainedGames, byMap:{classic:{games:2}},
          games:[{turnNumber:70, winnerMargin:2, elapsedMs:1500},{turnNumber:72,winnerMargin:3,elapsedMs:2000}] };
        fs.writeFileSync(environment.TRAINING_OUTPUT, JSON.stringify(report));
        child.stdout.emit('data', '[train] 2/2 map=classic turn=72 gold=0\n');
        child.emit('exit', 0, null);
      });
      return child;
    },
  });
  return { lab, getEnv:()=>environment, getLive:()=>live, dataDir };
}
test('training inputs allow 1,000 requested virtual sessions but cap actual concurrent rooms', () => {
  const value = validateConfig(config, 2);
  assert.equal(value.servers, 1000);
  assert.equal(value.parallel, 2);
  assert.equal(value.games, 2);
  assert.throws(() => validateConfig({ ...config, servers:1001 },2), /Provide/);
  assert.throws(() => validateConfig({ ...config, gamesPerBatch:10000, batches:11 },2), /limit/);
  assert.throws(() => validateConfig({ ...config, purpose:'unknown' },2), /training or isolated/);
});
test('real-game trainer is launched with isolated local data, never production R2 or secrets', async t => {
  const f = fixture(); t.after(()=>fs.rmSync(f.dataDir,{recursive:true,force:true}));
  await f.lab.start(config);
  assert.equal(f.lab.status().active.status,'running');
  assert.equal(f.getEnv().CLOUDFLARE_STATE_ENDPOINT,'');
  assert.equal(f.getEnv().HEX_UPSTREAM_SHARED_SECRET,'');
  assert.equal(f.getEnv().HEX_BUILTIN_ADMIN_ENABLED,'0');
  assert.equal(f.getEnv().CONCURRENCY,'2');
  assert.equal(f.getEnv().SIMS,'2');
  await waitUntil(() => !f.lab.status().active);
  const status=f.lab.status();
  assert.equal(status.jobs[0].status,'completed');
  assert.equal(status.jobs[0].completed,2);
  assert.equal(status.jobs[0].summary.averageWinningTurn,71);
  assert.equal(status.candidate.trainedGames,baseModel.trainedGames+2);
  assert.equal(f.getLive().trainedGames,baseModel.trainedGames,'live model not promoted implicitly');
  assert.equal(f.lab.report().report.games.length,2);
});
test('reopening the manager restores staged candidate and history without automatically restarting', async t => {
  const f = fixture(); t.after(()=>fs.rmSync(f.dataDir,{recursive:true,force:true}));
  await f.lab.start(config); await waitUntil(() => !f.lab.status().active);
  const next = new TrainingLab({ dataDir:f.dataDir, projectRoot:root, getLiveModel:f.getLive, promote:async () =>{} });
  assert.equal(next.status().candidate.trainedGames,baseModel.trainedGames+2);
  assert.equal(next.status().jobs[0].status,'completed');
  assert.equal(next.status().active,null);
});
test('explicit promotion needs confirmation and changes only the selected live model', async t => {
  const f = fixture(); t.after(()=>fs.rmSync(f.dataDir,{recursive:true,force:true}));
  await f.lab.start(config); await waitUntil(() => !f.lab.status().active);
  await assert.rejects(f.lab.promote('yes'),/PROMOTE MODEL/);
  assert.equal(f.getLive().trainedGames,baseModel.trainedGames);
  await f.lab.promote('PROMOTE MODEL');
  assert.equal(f.getLive().trainedGames,baseModel.trainedGames+2);
});
test('stress test runs real-match protocol but never updates candidate weights', async t => {
  const f = fixture({training:false}); t.after(()=>fs.rmSync(f.dataDir,{recursive:true,force:true}));
  await f.lab.start({...config,purpose:'stress'});
  assert.equal(f.getEnv().TRAINING_PURPOSE,'stress');
  await waitUntil(() => !f.lab.status().active);
  assert.equal(f.lab.status().candidate,null);
  assert.equal(f.lab.status().jobs[0].status,'completed');
  assert.equal(f.lab.report().report.completedGames,2);
});
test('candidate weights can be exported; explicitly confirmed live rollback uses persisted backup', async t => {
  const f = fixture(); t.after(()=>fs.rmSync(f.dataDir,{recursive:true,force:true}));
  await f.lab.start(config); await waitUntil(() => !f.lab.status().active);
  assert.equal(f.lab.exportCandidate().model.trainedGames, baseModel.trainedGames+2);
  fs.writeFileSync(path.join(f.dataDir,'training_previous_live.json'),JSON.stringify(baseModel));
  await assert.rejects(f.lab.rollbackLive('bad'),/ROLLBACK MODEL/);
  await f.lab.promote('PROMOTE MODEL');
  await f.lab.rollbackLive('ROLLBACK MODEL');
  assert.equal(f.getLive().trainedGames,baseModel.trainedGames);
});
test('saved running records are marked interrupted on restart; never auto-relaunch', t => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(),'hex-train-interrupt-')); t.after(()=>fs.rmSync(folder,{recursive:true,force:true}));
  fs.writeFileSync(path.join(folder,'training_runs.json'), JSON.stringify({jobs:[{id:'old',status:'running',config,completed:20}]}));
  const lab=new TrainingLab({ dataDir:folder, projectRoot:root, getLiveModel:()=>baseModel, promote:async()=>{} });
  assert.equal(lab.status().jobs[0].status,'interrupted');
  assert.equal(lab.status().active,null);
});
test('bad model weights and reports are not eligible for promotion', () => {
  const invalid=structuredClone(baseModel); invalid.params.w1[0][0]=Infinity;
  assert.throws(()=>validModel(invalid),/non-finite/);
  assert.equal(scoreReport({games:[],completedGames:0}).p95GameMs,null);
});
test('worker/docker includes dedicated training entry and admin route remains protected',()=>{
  const read = file => fs.readFileSync(path.join(root,file),'utf8');
  assert.match(read('server.js'),/if \(urlPath === '\/api\/admin\/training-start'\)/);
  assert.match(read('server.js'),/const admin = authenticateByToken\(token\)/);
  assert.match(read('server.js'),/if \(!requestIsAdminHostname\(req\)\)/);
  assert.match(read('cloudflare/Dockerfile'),/scripts\/train_neural_ai_all_maps\.js/);
  for (const name of ['training_runs.json','training_candidate.json','training_previous_candidate.json','training_report.json']) {
    assert.ok(read('cloudflare/state-sync.js').includes(name));
    assert.ok(read('cloudflare/container-worker.mjs').includes(name));
    assert.ok(read('cloudflare/bootstrap.mjs').includes(name));
  }
});
