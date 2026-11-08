'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const appJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
const fitHelper = appJs.slice(appJs.indexOf('  function fitBoardToViewport('), appJs.indexOf('  function render()'));

test('the initial board fits desktop and phone canvases, including off-center maps', () => {
  const tiles = [{ cx: -4, cy: -3 }, { cx: 5, cy: 6 }, { cx: 100, cy: 100, hidden: true }];
  for (const phase of ['lobby', 'setup1-settlement']) {
    for (const [width, height] of [[880, 650], [390, 540], [760, 400]]) {
      const view = { autoFit: true, scale: 150, ox: 0, oy: 0 };
      const context = vm.createContext({ view, state: { phase, geom: { tiles } }, shouldHideOuterSeaBorderTileClient: tile => !!tile.hidden });
      vm.runInContext(fitHelper, context);
      vm.runInContext(`fitBoardToViewport(${width}, ${height})`, context);
      assert.ok(view.scale > 0 && Number.isFinite(view.scale));
      for (const tile of tiles.filter(tile => !tile.hidden)) {
        for (const dx of [-Math.sqrt(3) / 2, Math.sqrt(3) / 2]) {
          const x = (tile.cx + dx) * view.scale + width / 2 + view.ox;
          assert.ok(x >= 15.99 && x <= width - 15.99, `tile fits width ${width}`);
        }
        for (const dy of [-1, 1]) {
          const y = (tile.cy + dy) * view.scale + height / 2 + view.oy;
          assert.ok(y >= 15.99 && y <= height - 15.99, `tile fits height ${height}`);
        }
      }
    }
  }
});

test('manual board positioning survives renders and an empty preview is safe', () => {
  const view = { autoFit: false, scale: 80, ox: 25, oy: -30 };
  const context = vm.createContext({ view, state: { phase: 'lobby', geom: { tiles: [{ cx: 1, cy: 1 }] } }, shouldHideOuterSeaBorderTileClient: () => false });
  vm.runInContext(fitHelper, context);
  vm.runInContext('fitBoardToViewport(390, 540)', context);
  assert.deepEqual(view, { autoFit: false, scale: 80, ox: 25, oy: -30 });
  vm.runInContext('view.autoFit = true; state = null; fitBoardToViewport(390, 540)', context);
  assert.equal(view.scale, 80);
});
