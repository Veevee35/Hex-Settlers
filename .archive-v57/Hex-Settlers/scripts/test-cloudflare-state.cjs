'use strict';
// Local-only integration probe for the Container <-> R2 HTTP bridge and bootstrap.
// Uses a fake in-memory R2 handler. No Cloudflare credentials or network needed.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const state = require('../cloudflare/state-sync.js');
for (const name of ['users.json','game_history.json','active_rooms.json','rating_policy.json','neural_ai_model.json']) {
  assert.equal(state.assertKey(name),`state/${name}`);
}
assert.equal(state.assertKey('backups/rating_rebuild_backup_123.json'),'state/backups/rating_rebuild_backup_123.json');
assert.equal(state.assertKey('texture-packs/'+'a'.repeat(36)+'/resources/field.png'), 'state/texture-packs/'+'a'.repeat(36)+'/resources/field.png');
for (const bad of ['../../../users.json', 'texture-packs/'+'a'.repeat(36)+'/../evil.png', 'backups/../../a.json','users.json/evil']) {
  assert.throws(() => state.assertKey(bad));
}
const temp = fs.mkdtempSync(path.join(os.tmpdir(),'hex-do-probe-'));
try {
  // Startup must fail closed without existing users.json; this prevents wiping
  // the game's real accounts if the wrong R2 bucket is bound to production.
  const run = spawnSync(process.execPath,['cloudflare/bootstrap.mjs'], {
    cwd:path.join(__dirname,'..'), encoding:'utf8', timeout:7000,
    env:{...process.env,CLOUDFLARE_STATE_ENDPOINT:'http://127.0.0.1:1', DATA_DIR: temp, ALLOW_EMPTY_DATABASE:'0'}
  });
  assert.notEqual(run.status,0);
  assert.match(run.stderr+run.stdout,/Cannot hydrate|fetch failed|refusing|Error/i);
  console.log('state key validation and fail-closed startup: PASS');
} finally { fs.rmSync(temp,{recursive:true,force:true}); }
