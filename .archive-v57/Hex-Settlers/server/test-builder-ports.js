'use strict';

const TEST_BUILDER_PORT_KINDS = new Set(['generic', 'brick', 'lumber', 'wool', 'grain', 'ore']);

function testBuilderPortForEdge(geom, edgeId, kind = 'generic', id = 0) {
  const normalizedKind = String(kind || '').toLowerCase();
  if (!TEST_BUILDER_PORT_KINDS.has(normalizedKind)) return null;

  const edge = geom?.edges?.[edgeId];
  if (!edge) return null;
  const adjacentTileIds = geom?.edgeAdjTiles?.[edgeId] || [];
  const tiles = geom?.tiles || [];
  let landTileId = null;
  let seaTileId = null;

  if (adjacentTileIds.length === 2) {
    const first = tiles[adjacentTileIds[0]];
    const second = tiles[adjacentTileIds[1]];
    if (!first || !second) return null;
    const firstIsSea = first.type === 'sea';
    const secondIsSea = second.type === 'sea';
    if (firstIsSea === secondIsSea) return null;
    seaTileId = firstIsSea ? adjacentTileIds[0] : adjacentTileIds[1];
    landTileId = firstIsSea ? adjacentTileIds[1] : adjacentTileIds[0];
  } else if (adjacentTileIds.length === 1) {
    const tile = tiles[adjacentTileIds[0]];
    if (!tile || tile.type === 'sea') return null;
    landTileId = adjacentTileIds[0];
  } else {
    return null;
  }

  return {
    id,
    edgeId: edge.id,
    nodeIds: [edge.a, edge.b],
    kind: normalizedKind,
    mx: edge.mx,
    my: edge.my,
    landTileId,
    seaTileId,
  };
}

function normalizeTestBuilderPorts(geom) {
  const normalized = [];
  const usedNodes = new Set();
  for (const current of (geom?.ports || [])) {
    const port = testBuilderPortForEdge(geom, current?.edgeId, current?.kind, normalized.length);
    if (!port || port.nodeIds.some((nodeId) => usedNodes.has(nodeId))) continue;
    for (const nodeId of port.nodeIds) usedNodes.add(nodeId);
    normalized.push(port);
  }
  if (geom) geom.ports = normalized;
  return normalized;
}

function editTestBuilderPort(geom, edgeId, kind) {
  if (!geom || !Array.isArray(geom.edges)) return { ok: false, error: 'No preview map available.' };
  const normalizedEdgeId = Math.floor(Number(edgeId));
  if (!Number.isFinite(normalizedEdgeId) || !geom.edges[normalizedEdgeId]) {
    return { ok: false, error: 'Invalid edge ID.' };
  }

  normalizeTestBuilderPorts(geom);
  const normalizedKind = String(kind || '').toLowerCase();
  const existingIndex = geom.ports.findIndex((port) => port.edgeId === normalizedEdgeId);
  if (normalizedKind === 'remove') {
    if (existingIndex >= 0) geom.ports.splice(existingIndex, 1);
    geom.ports.forEach((port, index) => { port.id = index; });
    return { ok: true, removed: existingIndex >= 0 };
  }
  if (!TEST_BUILDER_PORT_KINDS.has(normalizedKind)) {
    return { ok: false, error: 'Invalid port type.' };
  }

  const candidate = testBuilderPortForEdge(geom, normalizedEdgeId, normalizedKind, existingIndex >= 0 ? existingIndex : geom.ports.length);
  if (!candidate) return { ok: false, error: 'Ports must be placed on a shoreline edge.' };

  const usedNodes = new Set();
  for (let index = 0; index < geom.ports.length; index++) {
    if (index === existingIndex) continue;
    for (const nodeId of (geom.ports[index].nodeIds || [])) usedNodes.add(nodeId);
  }
  if (candidate.nodeIds.some((nodeId) => usedNodes.has(nodeId))) {
    return { ok: false, error: 'Ports cannot be directly adjacent.' };
  }

  if (existingIndex >= 0) geom.ports[existingIndex] = candidate;
  else geom.ports.push(candidate);
  geom.ports.forEach((port, index) => { port.id = index; });
  return { ok: true, port: candidate };
}

module.exports = {
  TEST_BUILDER_PORT_KINDS,
  editTestBuilderPort,
  normalizeTestBuilderPorts,
  testBuilderPortForEdge,
};
