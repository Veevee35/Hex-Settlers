#!/usr/bin/env node
'use strict';
// GitHub -> Cloudflare Builds: give each commit a unique browser cache key
// without making a second bot commit or causing a second container rollout.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const { major, minor, patch } = JSON.parse(fs.readFileSync(path.join(root, 'build-version.json'), 'utf8'));
const versionLabel = `V${major}.${minor}.${patch}`;
let hash = String(process.env.CF_COMMIT_SHA || process.env.GITHUB_SHA || '').trim();
if (!hash) {
  try { hash = execFileSync('git', ['rev-parse','HEAD'], {cwd:root,encoding:'utf8'}).trim(); }
  catch (_) { hash = `local${Date.now()}`; }
}
hash = hash.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
if (!hash) throw new Error('Could not establish build revision');
const key = `release-g${hash}`;
function update(filename, pattern, replacement) {
  const loc = path.join(root,filename);
  const before=fs.readFileSync(loc,'utf8');
  const after=before.replace(pattern,replacement);
  if (after===before && !before.includes(key)) throw new Error(`Missing build marker in ${filename}`);
  fs.writeFileSync(loc,after);
}
update('public/index.html', /(styles\.css\?v=)[^"\s]+/, `$1${key}`);
update('public/index.html', /(unified-theme\.css\?v=)[^"\s]+/, `$1${key}`);
update('public/index.html', /(app\.js\?v=)[^"\s]+/, `$1${key}`);
update('public/index.html', /(languages\.js\?v=)[^"\s]+/, `$1${key}`);
update('public/index.html', /(locale-expansion\.js\?v=)[^"\s]+/, `$1${key}`);
update('public/app.js', /const ASSET_CACHE_SW_BUILD = '[^']+';/, `const ASSET_CACHE_SW_BUILD = '${key}';`);
update('public/sw.js', /const CACHE_NAME = CACHE_PREFIX \+ '[^']+';/, `const CACHE_NAME = CACHE_PREFIX + '${key}';`);
const htmlPath=path.join(root,'public/index.html');
const before=fs.readFileSync(htmlPath,'utf8');
fs.writeFileSync(htmlPath,before.replace(/(<div class="appVersion" aria-label="Game version">)V\d+\.\d+\.\d+(?: · [a-zA-Z0-9]+)?(<\/div>)/g, (_m,a,b)=>`${a}${versionLabel}${b}`));
fs.writeFileSync(path.join(root,'public/build-info.json'), JSON.stringify({ revision: hash }) + '\n');
console.log(`Hex Settlers Cloudflare revision ${hash}`);
