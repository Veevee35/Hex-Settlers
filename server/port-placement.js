'use strict';

function shuffleWith(items, random) {
  for (let i = items.length - 1; i > 0; i--) {
    const value = Number(random());
    const normalized = Number.isFinite(value) ? Math.max(0, Math.min(0.9999999999999999, value)) : 0;
    const j = Math.floor(normalized * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

/**
 * Selects shoreline edges that do not share endpoints. Hex-board edges form a
 * bipartite graph, so a randomized augmenting-path matching finds the maximum
 * possible set and can safely return any requested subset of it.
 */
function selectRandomNonAdjacentEdgeIds(edges, candidateEdgeIds, count, random = Math.random) {
  const target = Math.max(0, Math.floor(Number(count || 0)));
  if (target === 0) return [];
  if (!Array.isArray(edges) || !Array.isArray(candidateEdgeIds)) return [];

  const edgeById = new Map();
  for (const edge of edges) {
    if (!edge || edge.id === undefined || edge.a === undefined || edge.b === undefined || edge.a === edge.b) continue;
    edgeById.set(edge.id, edge);
  }

  const candidates = [];
  const seenEdgeIds = new Set();
  for (const edgeId of candidateEdgeIds) {
    if (seenEdgeIds.has(edgeId)) continue;
    const edge = edgeById.get(edgeId);
    if (!edge) continue;
    seenEdgeIds.add(edgeId);
    candidates.push(edge);
  }
  shuffleWith(candidates, random);
  if (!candidates.length) return [];

  const incident = new Map();
  for (const edge of candidates) {
    if (!incident.has(edge.a)) incident.set(edge.a, []);
    if (!incident.has(edge.b)) incident.set(edge.b, []);
    incident.get(edge.a).push(edge);
    incident.get(edge.b).push(edge);
  }

  const color = new Map();
  for (const start of incident.keys()) {
    if (color.has(start)) continue;
    color.set(start, 0);
    const queue = [start];
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const nodeId = queue[cursor];
      const nextColor = 1 - color.get(nodeId);
      for (const edge of incident.get(nodeId) || []) {
        const other = edge.a === nodeId ? edge.b : edge.a;
        if (!color.has(other)) {
          color.set(other, nextColor);
          queue.push(other);
        } else if (color.get(other) !== nextColor) {
          throw new Error('Port candidate edges must form a bipartite graph.');
        }
      }
    }
  }

  const linksByLeftNode = new Map();
  for (const edge of candidates) {
    const left = color.get(edge.a) === 0 ? edge.a : edge.b;
    const right = left === edge.a ? edge.b : edge.a;
    if (!linksByLeftNode.has(left)) linksByLeftNode.set(left, []);
    linksByLeftNode.get(left).push({ edgeId: edge.id, left, right });
  }
  const leftNodes = shuffleWith(Array.from(linksByLeftNode.keys()), random);
  for (const left of leftNodes) shuffleWith(linksByLeftNode.get(left), random);

  const matchByRightNode = new Map();
  function augment(left, visitedRightNodes) {
    for (const link of linksByLeftNode.get(left) || []) {
      if (visitedRightNodes.has(link.right)) continue;
      visitedRightNodes.add(link.right);
      const previous = matchByRightNode.get(link.right);
      if (!previous || augment(previous.left, visitedRightNodes)) {
        matchByRightNode.set(link.right, link);
        return true;
      }
    }
    return false;
  }

  for (const left of leftNodes) augment(left, new Set());

  const matchedEdgeIds = shuffleWith(
    Array.from(matchByRightNode.values(), (link) => link.edgeId),
    random,
  );
  return matchedEdgeIds.slice(0, target);
}

module.exports = { selectRandomNonAdjacentEdgeIds };
