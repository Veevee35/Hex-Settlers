'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');

test('AI difficulty selector exposes only easy, medium, hard, and expert', () => {
  const html = fs.readFileSync(path.join(projectRoot, 'public', 'index.html'), 'utf8');
  const select = html.match(/<select id="aiDifficultySelect"[\s\S]*?<\/select>/)?.[0] || '';
  const options = [...select.matchAll(/<option value="([^"]+)">([^<]+)<\/option>/g)]
    .map((match) => ({ value: match[1], label: match[2] }));

  assert.match(html, /<div class="labelTiny">AI players difficulty<\/div>/);
  assert.deepEqual(options, [
    { value: 'easy', label: 'Easy' },
    { value: 'medium', label: 'Medium' },
    { value: 'hard', label: 'Hard' },
    { value: 'expert', label: 'Expert' },
  ]);
});

test('Expert is accepted by the server as the neural learning AI', () => {
  const server = fs.readFileSync(path.join(projectRoot, 'server.js'), 'utf8');
  assert.match(server, /if \(diff === 'expert'\) diff = 'neural_net';/);
  assert.doesNotMatch(server, /if \(diff === 'expert'\) diff = 'catanatron';/);
});
