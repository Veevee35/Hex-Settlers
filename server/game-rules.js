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
  explorationPointsEnabled: true,
  friendlyRobber: false,
  diceAlgorithm: 'probability_corrected',
  victoryPointsToWin: 10,
  devDeckMode: 25,
  randomMapAtStart: false,
});

// Ranked matchmaking is intentionally limited to competitive four-player maps.
// Test Builder is a sandbox, so it is not part of the ranked ballot.
const RANKED_SCENARIOS = Object.freeze([
  Object.freeze({ id: 'classic', label: 'Classic', mapMode: 'classic' }),
  Object.freeze({ id: 'four_islands', label: 'Four Islands', mapMode: 'seafarers', seafarersScenario: 'four_islands' }),
  Object.freeze({ id: 'through_the_desert', label: 'Through the Desert', mapMode: 'seafarers', seafarersScenario: 'through_the_desert' }),
  Object.freeze({ id: 'fog_island', label: 'Fog Island', mapMode: 'seafarers', seafarersScenario: 'fog_island' }),
  Object.freeze({ id: 'heading_for_new_shores', label: 'Heading for New Shores', mapMode: 'seafarers', seafarersScenario: 'heading_for_new_shores' }),
  Object.freeze({ id: 'cartographer_4_manual', label: 'Cartographer', mapMode: 'seafarers', seafarersScenario: 'cartographer_4_manual' }),
  Object.freeze({ id: 'cartographer_4_random', label: 'Scattered Tiles', mapMode: 'seafarers', seafarersScenario: 'cartographer_4_random' }),
]);

function defaultVictoryPointsForScenario(scenario) {
  const id = String(scenario?.id || scenario?.seafarersScenario || 'classic').toLowerCase();
  if (id === 'classic') return 10;
  if (id === 'fog_island' || id === 'cartographer_4_manual' || id === 'cartographer_4_random') return 12;
  if (id === 'four_islands') return 13;
  return 14;
}

function defaultExplorationPointsForScenario(scenario) {
  const id = String(scenario?.id || scenario?.seafarersScenario || '').toLowerCase().replace(/-/g, '_');
  return id !== 'fog_island' && id !== 'fog_island_56';
}

function rankedRulesForScenario(scenarioOrId) {
  const requestedId = typeof scenarioOrId === 'string' ? scenarioOrId : scenarioOrId?.id;
  const scenario = RANKED_SCENARIOS.find((candidate) => candidate.id === requestedId) || RANKED_SCENARIOS[0];
  return {
    ...DEFAULT_RULES,
    mapMode: scenario.mapMode,
    seafarersScenario: scenario.seafarersScenario || 'four_islands',
    explorationPointsEnabled: defaultExplorationPointsForScenario(scenario),
    victoryPointsToWin: defaultVictoryPointsForScenario(scenario),
    // Ranked rules are server-owned and cannot be changed by a player.
    setupTurnMs: 60_000,
    playTurnMs: 30_000,
    microMs: 15_000,
    microPhaseMs: 15_000,
    friendlyRobber: false,
    diceAlgorithm: 'probability_corrected',
    randomMapAtStart: false,
  };
}

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

function seafarersAwardsNewIslandBonus(rules) {
  if (String(rules?.mapMode || 'classic').toLowerCase() !== 'seafarers') return false;
  return seafarersExplorationPointsEnabled(rules);
}

function seafarersExplorationPointsEnabled(rules) {
  return rules?.explorationPointsEnabled !== false;
}

function seafarersDesertsSeparateLandMasses(rules) {
  if (String(rules?.mapMode || 'classic').toLowerCase() !== 'seafarers') return false;
  const scenario = String(rules?.seafarersScenario || '').toLowerCase().replace(/-/g, '_');
  return scenario === 'cartographer_4_manual' || scenario === 'cartographer_4_random' || scenario === 'cartographer_4' ||
    scenario === 'cartographer_56_manual' || scenario === 'cartographer_56_random' || scenario === 'cartographer_56' ||
    scenario === 'test_builder' || scenario === 'test_builder_56';
}

function microActionDurationMs(rules) {
  const raw = Number(rules?.microPhaseMs ?? rules?.microMs ?? DEFAULT_RULES.microMs);
  if (!Number.isFinite(raw)) return DEFAULT_RULES.microMs;
  return Math.max(5_000, Math.min(300_000, Math.floor(raw)));
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
  RANKED_SCENARIOS,
  bankMaxForRules,
  defaultExplorationPointsForScenario,
  defaultVictoryPointsForScenario,
  isClassic56MapModeRaw,
  isSeafarers56Scenario,
  microActionDurationMs,
  normalizedMapModeRaw,
  rankedRulesForScenario,
  seafarersAwardsNewIslandBonus,
  seafarersDesertsSeparateLandMasses,
  seafarersExplorationPointsEnabled,
};
