'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const appJs = fs.readFileSync(path.join(projectRoot, 'public', 'app.js'), 'utf8');
const serverJs = fs.readFileSync(path.join(projectRoot, 'server.js'), 'utf8');

test('production and discovery Gold choices use the configured micro-action timer', () => {
  assert.match(serverJs, /if \(game\?\.special\?\.kind === 'discovery_gold'\) return micro;/);
  assert.match(serverJs, /case 'production-gold':\s*return micro;/);
  assert.match(serverJs, /return `discovery-gold:\$\{sp\.forPlayerId \|\| ''\}:\$\{Number\(sp\.id \|\| 0\)\}`;/);
  assert.doesNotMatch(serverJs, /Gold Field[^\n]*has 10 seconds/);
});

test('timed Gold choices auto-pick and both prompts show an untimed message when Off', () => {
  assert.match(serverJs, /kind: 'choose_discovery', resourceKind/);
  assert.match(appJs, /function configuredMicroActionSeconds\(\)/);
  assert.match(appJs, /const isGoldChoice = phaseKey === 'production-gold' \|\| .*kind === 'discovery_gold'/);
  assert.match(appJs, /isGoldChoice \? 'Gold choice' : 'Turn'/);
  assert.equal((appJs.match(/You have \$\{configuredMicroActionSeconds\(\)\} seconds before the game auto-picks\./g) || []).length, 2);
  assert.match(appJs, /Timer Off — choose a resource when you are ready/);
  assert.match(appJs, /Timer Off — choose your resources when you are ready/);
  assert.doesNotMatch(appJs, /You have 10 seconds before the game auto-picks/);
});
