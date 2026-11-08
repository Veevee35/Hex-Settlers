'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { editTestBuilderPort, normalizeTestBuilderPorts } = require('../server/test-builder-ports');

function testGeometry() {
  return {
    tiles: [
      { id: 0, type: 'desert' },
      { id: 1, type: 'sea' },
      { id: 2, type: 'forest' },
    ],
    edges: [
      { id: 0, a: 0, b: 1, mx: 0, my: 0 },
      { id: 1, a: 1, b: 2, mx: 1, my: 0 },
      { id: 2, a: 3, b: 4, mx: 2, my: 0 },
      { id: 3, a: 5, b: 6, mx: 3, my: 0 },
    ],
    edgeAdjTiles: {
      0: [0, 1],
      1: [2, 1],
      2: [2, 1],
      3: [0, 2],
    },
    ports: [],
  };
}

test('Test Builder places, changes, and removes selected port types on shoreline edges', () => {
  const geom = testGeometry();
  assert.equal(editTestBuilderPort(geom, 0, 'generic').ok, true);
  assert.equal(geom.ports[0].kind, 'generic');
  assert.equal(geom.ports[0].landTileId, 0);
  assert.equal(geom.ports[0].seaTileId, 1);

  assert.equal(editTestBuilderPort(geom, 0, 'ore').ok, true);
  assert.equal(geom.ports[0].kind, 'ore');

  assert.deepEqual(editTestBuilderPort(geom, 0, 'remove'), { ok: true, removed: true });
  assert.deepEqual(geom.ports, []);
});

test('Test Builder rejects non-shoreline and directly adjacent ports', () => {
  const geom = testGeometry();
  assert.equal(editTestBuilderPort(geom, 3, 'brick').ok, false);
  assert.equal(editTestBuilderPort(geom, 0, 'brick').ok, true);
  assert.deepEqual(editTestBuilderPort(geom, 1, 'grain'), { ok: false, error: 'Ports cannot be directly adjacent.' });
  assert.equal(editTestBuilderPort(geom, 2, 'grain').ok, true);
});

test('Test Builder removes ports whose edges stop being shoreline', () => {
  const geom = testGeometry();
  assert.equal(editTestBuilderPort(geom, 0, 'wool').ok, true);
  geom.tiles[1].type = 'field';
  assert.deepEqual(normalizeTestBuilderPorts(geom), []);
});
