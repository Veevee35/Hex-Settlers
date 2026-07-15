'use strict';

const BANK_MAX_DEFAULT = 19;
const BANK_MAX_56 = 24;

const DEFAULT_RULES = Object.freeze({
  discardLimit: 7,
  setupTurnMs: 60_000,
  playTurnMs: 30_000,
  microMs: 15_000,
  microPhaseMs: 15_000,
  mapMode: 'classic',
  seafarersScenario: 'four_islands',
  victoryPointsToWin: 10,
  devDeckMode: 25,
});

function isClassic56MapModeRaw(raw) {
  const value = String(raw || '').toLowerCase();
  return value === 'classic56' || value === 'classic_5_6' || value === 'classic-5-6' ||
    value === 'classic5_6' || value === 'classic5-6';
}

function normalizedMapModeRaw(raw) {
  const value = String(raw || 'classic').toLowerCase();
  return isClassic56MapModeRaw(value) ? 'classic56' : value;
}

function isSeafarers56Scenario(raw) {
  const value = String(raw || '').toLowerCase().replace(/-/g, '_');
  return value === 'six_islands' || value === 'through_the_desert_56' ||
    value === 'fog_island_56' || value === 'cartographer_56_manual' ||
    value === 'cartographer_56_random' || value === 'cartographer_56' ||
    value === 'test_builder_56';
}

function bankMaxForRules(rules) {
  const custom = Math.floor(Number(rules && (rules.baseResourcesPerType ?? rules.baseResourceCount)));
  if (Number.isFinite(custom)) return Math.max(1, Math.min(40, custom));
  const mapMode = normalizedMapModeRaw(rules && rules.mapMode);
  if (mapMode === 'classic56') return BANK_MAX_56;
  if (mapMode === 'seafarers' && isSeafarers56Scenario(rules && rules.seafarersScenario)) return BANK_MAX_56;
  return BANK_MAX_DEFAULT;
}

module.exports = {
  BANK_MAX_DEFAULT,
  BANK_MAX_56,
  DEFAULT_RULES,
  bankMaxForRules,
  isClassic56MapModeRaw,
  isSeafarers56Scenario,
  normalizedMapModeRaw,
};
