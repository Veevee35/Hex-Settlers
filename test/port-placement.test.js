'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { selectRandomNonAdjacentEdgeIds } = require('../server/port-placement');

function cycleEdges(size) {
  return Array.from({ length: size }, (_, id) => ({ id, a: id, b: (id + 1) % size }));
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = ((state * 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function assertNoSharedNodes(edges, selectedEdgeIds) {
  const usedNodes = new Set();
  for (const edgeId of selectedEdgeIds) {
    const edge = edges[edgeId];
    assert.ok(edge, `missing selected edge ${edgeId}`);
    assert.equal(usedNodes.has(edge.a), false, `edge ${edgeId} shares node ${edge.a}`);
    assert.equal(usedNodes.has(edge.b), false, `edge ${edgeId} shares node ${edge.b}`);
    usedNodes.add(edge.a);
    usedNodes.add(edge.b);
  }
}

test('port placement finds the requested number of non-adjacent shoreline edges', () => {
  const edges = cycleEdges(18);
  const selected = selectRandomNonAdjacentEdgeIds(
    edges,
    edges.map((edge) => edge.id),
    9,
    seededRandom(7),
  );

  assert.equal(selected.length, 9);
  assertNoSharedNodes(edges, selected);
});

test('port placement randomizes which valid shoreline edges are selected', () => {
  const edges = cycleEdges(24);
  const candidateIds = edges.map((edge) => edge.id);
  const layouts = new Set();

  for (let seed = 1; seed <= 8; seed++) {
    const selected = selectRandomNonAdjacentEdgeIds(edges, candidateIds, 6, seededRandom(seed));
    assert.equal(selected.length, 6);
    assertNoSharedNodes(edges, selected);
    layouts.add(selected.slice().sort((a, b) => a - b).join(','));
  }

  assert.ok(layouts.size > 1, 'different random sequences should produce different port layouts');
});

test('port placement returns only the feasible maximum instead of allowing adjacency', () => {
  const edges = [
    { id: 0, a: 0, b: 1 },
    { id: 1, a: 1, b: 2 },
    { id: 2, a: 2, b: 3 },
  ];
  const selected = selectRandomNonAdjacentEdgeIds(
    edges,
    edges.map((edge) => edge.id),
    3,
    seededRandom(3),
  );

  assert.equal(selected.length, 2);
  assertNoSharedNodes(edges, selected);
});
