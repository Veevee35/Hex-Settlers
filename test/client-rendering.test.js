'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
const render = source.slice(source.indexOf('  function render()'), source.indexOf('  function drawBoard()'));
const transforms = source.slice(source.indexOf('  function worldToScreen('), source.indexOf('  function tilePolygonScreen('));

test('bursts of board updates paint once per frame, use the latest state, and read layout once', () => {
  const frames = [];
  let reads = 0;
  const drawn = [];
  const context = vm.createContext({
    boardRenderFrame: null, boardRenderRect: null, state: { revision: 0 },
    view: { scale: 75, ox: 10, oy: -20 },
    ui: { canvas: { getBoundingClientRect() { reads++; return { width: 900, height: 600 }; } } },
    requestAnimationFrame(callback) { frames.push(callback); return frames.length; },
    drawBoard() {
      drawn.push(context.state.revision);
      for (let i = 0; i < 1000; i++) {
        const point = context.worldToScreen({ x: 2, y: -3 });
        const world = context.screenToWorld(point);
        assert.equal(world.x, 2);
        assert.equal(world.y, -3);
      }
    },
  });
  vm.runInContext(render + transforms, context);
  vm.runInContext('for (let i = 1; i <= 100; i++) { state.revision = i; render(); }', context);
  assert.equal(frames.length, 1);
  frames.shift()();
  assert.deepEqual(drawn, [100]);
  assert.equal(reads, 1, 'all tile/node/edge transforms share one layout read');
  assert.equal(context.boardRenderRect, null, 'input outside a paint uses fresh dimensions');
  vm.runInContext('render()', context);
  frames.shift()();
  assert.equal(reads, 2);
});

test('a failed draw releases frame and layout caches so later updates can recover', () => {
  let frame;
  const context = vm.createContext({
    boardRenderFrame: null, boardRenderRect: null,
    ui: { canvas: { getBoundingClientRect: () => ({ width: 390, height: 540 }) } },
    requestAnimationFrame(callback) { frame = callback; return 1; },
    drawBoard() { throw new Error('draw failed'); },
  });
  vm.runInContext(render, context);
  context.render();
  assert.throws(() => frame(), /draw failed/);
  assert.equal(context.boardRenderRect, null);
  assert.equal(context.boardRenderFrame, null);
  context.drawBoard = () => {};
  context.render();
  assert.doesNotThrow(() => frame());
});
