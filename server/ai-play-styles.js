'use strict';

function scenarioStyle(rules) {
  const mode = rules?.mapMode || 'classic';
  if (mode !== 'seafarers') return rules?.customMap ? `${mode}_custom` : mode;
  // The engine resolves the large draft inventories to the actual seat count.
  // Share the scenario adjustment across those inventories, with separate
  // 7- and 8-player adjustments keyed by the matchup.
  return (rules.seafarersScenario || 'four_islands').replace(/^(cartographer_78|scattered_tiles_78)_[78]$/, '$1');
}

function playStyleKeys(rules, players) {
  const scenario = scenarioStyle(rules);
  return [`players:${players}`, `scenario:${scenario}`, `matchup:${scenario}:${players}`];
}

module.exports = { playStyleKeys, scenarioStyle };
