'use strict';

const RESOURCE_KEYS = Object.freeze(['brick', 'lumber', 'wool', 'grain', 'ore']);
const RESOURCE_GAIN_SOURCES = Object.freeze(['setup', 'production', 'discover', 'trade', 'steal', 'dev', 'other']);
const RESOURCE_LOSS_SOURCES = Object.freeze(['build', 'trade', 'steal', 'discard', 'monopoly', 'blocked', 'dev', 'other']);

function emptyResourceMap() {
  return { brick: 0, lumber: 0, wool: 0, grain: 0, ore: 0 };
}

function ensureResourceMap(value) {
  const map = value && typeof value === 'object' ? value : {};
  for (const key of RESOURCE_KEYS) {
    const amount = Number(map[key] || 0);
    map[key] = Number.isFinite(amount) ? amount : 0;
  }
  return map;
}

function ensurePlayerResourceStats(value = {}) {
  const stats = value && typeof value === 'object' ? value : {};
  stats.gained = ensureResourceMap(stats.gained);
  stats.lost = ensureResourceMap(stats.lost);
  stats.gainedBySource = stats.gainedBySource && typeof stats.gainedBySource === 'object' ? stats.gainedBySource : {};
  stats.lostBySource = stats.lostBySource && typeof stats.lostBySource === 'object' ? stats.lostBySource : {};
  stats.byTurn = stats.byTurn && typeof stats.byTurn === 'object' ? stats.byTurn : {};
  for (const source of RESOURCE_GAIN_SOURCES) stats.gainedBySource[source] = ensureResourceMap(stats.gainedBySource[source]);
  for (const source of RESOURCE_LOSS_SOURCES) stats.lostBySource[source] = ensureResourceMap(stats.lostBySource[source]);
  return stats;
}

function sourceResourceMap(container, source) {
  const key = String(source || 'other');
  container[key] = ensureResourceMap(container[key]);
  return container[key];
}

function applyResourceDelta(value, delta, source = 'other', turn = 0) {
  const stats = ensurePlayerResourceStats(value);
  const sourceKey = String(source || 'other');
  const turnKey = Number.isFinite(Number(turn)) ? Math.floor(Number(turn)) : 0;
  stats.byTurn[turnKey] = ensureResourceMap(stats.byTurn[turnKey]);

  for (const key of RESOURCE_KEYS) {
    const amount = Number(delta && delta[key] || 0);
    if (!Number.isFinite(amount) || amount === 0) continue;
    if (amount > 0) {
      stats.gained[key] += amount;
      sourceResourceMap(stats.gainedBySource, sourceKey)[key] += amount;
    } else {
      const lost = -amount;
      stats.lost[key] += lost;
      sourceResourceMap(stats.lostBySource, sourceKey)[key] += lost;
    }
    stats.byTurn[turnKey][key] += amount;
  }
  return stats;
}

function applyResourceOpportunityLoss(value, losses, source = 'blocked') {
  const stats = ensurePlayerResourceStats(value);
  const sourceMap = sourceResourceMap(stats.lostBySource, source);
  for (const key of RESOURCE_KEYS) {
    const amount = Math.max(0, Number(losses && losses[key] || 0));
    if (Number.isFinite(amount) && amount > 0) sourceMap[key] += amount;
  }
  return stats;
}

module.exports = {
  RESOURCE_GAIN_SOURCES,
  RESOURCE_KEYS,
  RESOURCE_LOSS_SOURCES,
  applyResourceDelta,
  applyResourceOpportunityLoss,
  emptyResourceMap,
  ensurePlayerResourceStats,
};
