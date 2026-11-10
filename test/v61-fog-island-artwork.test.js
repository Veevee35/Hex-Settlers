'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');
const from = app.indexOf('  // Canvas mini-maps normally use');
const to = app.indexOf('\n  function renderRankedScenarioVote()', from);
assert.ok(from >= 0 && to > from, 'mini-map renderer is available');
const source = app.slice(from, to);

function prepare() {
  const drawCalls = [];
  const pending = [];
  class FakeImage {
    set src(value) { this._src = value; pending.push(this); }
    get src() { return this._src; }
  }
  const context = {
    clearRect: () => drawCalls.push(['clear']),
    beginPath() {}, moveTo() {}, lineTo() {}, closePath() {},
    save() {}, restore() {}, clip() {}, stroke() {}, fill() {}, arc() {},
    drawImage: (img) => drawCalls.push(['image', img.src]),
    fillText: (value) => drawCalls.push(['text', String(value)]),
  };
  const canvas = { width: 760, height: 450, isConnected: true, getContext: () => context };
  const runtime = vm.createContext({
    Image: FakeImage,
    TILE_IMG: { sea: '/Sea.png', field: '/Field.png', unexplored: '/Unexplored.png' },
    NUM_TOKEN_IMG: { 5: '/5.png', 8: '/8.png' },
    resolveLegacyTextureUrl: value => value,
  });
  vm.runInContext(source, runtime);
  return { canvas, context, drawCalls, pending, draw: (tiles, options) => vm.runInContext(
    `drawRankedMiniMap(canvas, tiles, options)`, vm.createContext({ ...runtime, canvas, tiles, options })
  ) };
}

test('Fog Island challenges use live-game textures and never reveal hidden tiles or numbers', () => {
  assert.match(app, /drawRankedMiniMap\(board, map\.preview, \{ gameArtwork: catalog\.scenario === 'fog' \}\)/);
  assert.ok(fs.existsSync(path.join(root, 'public/texture pack/Resource Hexes/Unexplored.png')));
  const ctx = prepare();
  const tiles = [
    { x: 0, y: 0, type: 'field', fog: true, number: 8 },
    { x: 1.732, y: 0, type: 'field', number: 5 },
    { x: 3.464, y: 0, type: 'sea', number: null },
  ];
  ctx.draw(tiles, {gameArtwork: true});
  assert.ok(ctx.pending.some(image => image.src === '/Unexplored.png'));
  assert.ok(ctx.pending.some(image => image.src === '/Field.png'));
  assert.ok(ctx.pending.some(image => image.src === '/5.png'));
  assert.equal(ctx.pending.some(image => image.src === '/8.png'), false, 'no request for an unrevealed number token');
  for (const image of [...ctx.pending]) image.onload?.();
  assert.ok(ctx.drawCalls.some(item => item[0] === 'image' && item[1] === '/Unexplored.png'));
  assert.ok(ctx.drawCalls.some(item => item[0] === 'image' && item[1] === '/5.png'));
  assert.equal(ctx.drawCalls.some(item => item[0] === 'image' && item[1] === '/8.png'), false);
  assert.ok(ctx.drawCalls.filter(item => item[0] === 'clear').length >= 2, 'repaint on artwork load');
});

test('standard mini-maps do not load challenge artwork', () => {
  const ctx = prepare();
  ctx.draw([{x:0,y:0,type:'unexplored',fog:true,number:8}], {});
  assert.equal(ctx.pending.length, 0);
  assert.ok(ctx.drawCalls.some(item => item[0] === 'text' && item[1] === '?'));
  assert.equal(ctx.drawCalls.some(item => item[0] === 'text' && item[1] === '8'), false);
});
