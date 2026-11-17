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
    ui: { canvas: { width: 900, height: 600, getBoundingClientRect() { reads++; return { width: 900, height: 600 }; } } },
    window: { devicePixelRatio: 1 },
    ctx: { setTransform() {} },
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
    ui: { canvas: { width: 390, height: 540, getBoundingClientRect: () => ({ width: 390, height: 540 }) } },
    window: { devicePixelRatio: 1 },
    ctx: { setTransform() {} },
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

test('game logs show the latest entries on recovery and preserve manual scrolling during play', () => {
  const logRenderer = source.slice(source.indexOf('  function logIsAtBottom('), source.indexOf('  function openLogModal('));
  const stateHandler = source.slice(source.indexOf('        // A joined packet clears'), source.indexOf('        refreshToolModals(showLatestLog);'));
  const rows = [];
  let position = 0;
  const list = {
    clientHeight: 100,
    get scrollHeight() { return rows.length * 20; },
    get scrollTop() { return position; },
    set scrollTop(value) { position = Math.max(0, Math.min(value, this.scrollHeight - this.clientHeight)); },
    set innerHTML(_) { rows.length = 0; position = 0; },
    appendChild(row) { rows.push(row); },
  };
  const state = { id: 'game', phase: 'main-actions', log: Array.from({ length: 20 }, (_, i) => i + 1) };
  const context = vm.createContext({ ui: { logList: list }, state, logPanelOpen: true, makeLogRow: entry => entry });
  vm.runInContext(logRenderer, context);
  const update = vm.runInContext(`prevState => { ${stateHandler} }`, context);

  update(null);
  assert.equal(list.scrollTop, 300);
  list.scrollTop = 60;
  state.log.push(21);
  update(state);
  assert.equal(list.scrollTop, 60);
  assert.equal(rows.at(-1), 21);
  update(null);
  assert.equal(list.scrollTop, 320);
  state.log.push(22);
  update(state);
  assert.equal(list.scrollTop, 340);
});
