#!/usr/bin/env node
'use strict';

// GitHub build versioning: V<major>.<minor>.<patch>.
// Patch increments for each published push (0 through 99), then minor rolls up.
// The major number is changed manually in build-version.json. A changed major
// resets both lower numbers to zero on its next build.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

function validCounter(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function nextVersion(current) {
  const { major, minor, patch, lastBuiltMajor } = current;
  if (![major, minor, patch, lastBuiltMajor].every(validCounter) || patch > 99) {
    throw new Error('Invalid build-version.json: major, minor and lastBuiltMajor must be nonnegative integers; patch must be 0–99.');
  }
  if (major !== lastBuiltMajor) return { major, minor: 0, patch: 0, lastBuiltMajor: major };
  if (patch === 99) return { major, minor: minor + 1, patch: 0, lastBuiltMajor: major };
  return { major, minor, patch: patch + 1, lastBuiltMajor: major };
}

function textFile(filename, oldPattern, replacement, expected = 1) {
  const dest = path.join(root, filename);
  const before = fs.readFileSync(dest, 'utf8');
  let count = 0;
  const after = before.replace(oldPattern, (...args) => { count += 1; return typeof replacement === 'function' ? replacement(...args) : replacement; });
  if (count !== expected) throw new Error(`Expected ${expected} version marker(s) in ${filename}, found ${count}; not writing partial version update.`);
  return { dest, after };
}

function prepareFiles(state) {
  const version = `${state.major}.${state.minor}.${state.patch}`;
  const cacheKey = `release-v${version}`;
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const packageLock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
  packageJson.version = version;
  packageLock.version = version;
  packageLock.packages[''].version = version;
  const htmlFile = textFile('public/index.html', /(<div class="appVersion" aria-label="Game version">)V\d+\.\d+\.\d+(<\/div>)/g, (_all, before, after) => `${before}V${version}${after}`, 2);
  for (const [oldPattern, replacement] of [
    [/(styles\.css\?v=)[^"\s]+/, (_all, prefix) => `${prefix}${cacheKey}`],
    [/(app\.js\?v=)[^"\s]+/, (_all, prefix) => `${prefix}${cacheKey}`],
    [/(languages\.js\?v=)[^"\s]+/, (_all, prefix) => `${prefix}${cacheKey}`],
  ]) {
    if (!oldPattern.test(htmlFile.after)) throw new Error(`Missing client cache reference: ${oldPattern}`);
    htmlFile.after = htmlFile.after.replace(oldPattern, replacement);
  }
  return [
    { dest: path.join(root, 'build-version.json'), after: `${JSON.stringify(state, null, 2)}\n` },
    { dest: path.join(root, 'package.json'), after: `${JSON.stringify(packageJson, null, 2)}\n` },
    { dest: path.join(root, 'package-lock.json'), after: `${JSON.stringify(packageLock, null, 2)}\n` },
    htmlFile,
    textFile('public/app.js', /const ASSET_CACHE_SW_BUILD = '[^']+';/, `const ASSET_CACHE_SW_BUILD = '${cacheKey}';`),
    textFile('public/sw.js', /const CACHE_NAME = CACHE_PREFIX \+ '[^']+';/, `const CACHE_NAME = CACHE_PREFIX + '${cacheKey}';`),
  ];
}

function syncVersion(bump = false) {
  const state = JSON.parse(fs.readFileSync(path.join(root, 'build-version.json'), 'utf8'));
  if (![state.major, state.minor, state.patch, state.lastBuiltMajor].every(validCounter) || state.patch > 99) {
    throw new Error('Invalid build-version.json: counters must be nonnegative integers and patch <= 99.');
  }
  const target = bump ? nextVersion(state) : state;
  const files = prepareFiles(target);
  // All expected markers are validated before any file is overwritten.
  for (const file of files) fs.writeFileSync(file.dest, file.after);
  return `V${target.major}.${target.minor}.${target.patch}`;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length !== 1 || !['--sync', '--bump'].includes(args[0])) {
    console.error('Usage: node scripts/bump-version.cjs --sync|--bump');
    process.exitCode = 2;
  } else {
    try { console.log(syncVersion(args[0] === '--bump')); }
    catch (error) { console.error(error.message); process.exitCode = 1; }
  }
}
module.exports = { nextVersion, syncVersion };
