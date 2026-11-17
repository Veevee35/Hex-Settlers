'use strict';

function defaultVictoryPointsToWin(rules) {
  if (String(rules?.mapMode || 'classic').toLowerCase() !== 'seafarers') return 10;
  const scenario = String(rules?.seafarersScenario || 'four_islands').toLowerCase();
  if (['fog_island', 'fog-island', 'fog', 'fog_island_56', 'fog_island_78'].includes(scenario)) return 12;
  if (['through_the_desert', 'through-the-desert', 'desert', 'throughdesert', 'through_the_desert_56',
    'through_the_desert_78', 'eight_islands_78'].includes(scenario)) return 14;
  if (['heading_for_new_shores', 'heading_for_new_shores_56', 'heading_for_new_shores_78',
    'heading-for-new-shores', 'new_shores', 'newshores', 'heading'].includes(scenario)) return 14;
  if (['six_islands', 'six-islands', 'six'].includes(scenario)) return 14;
  const normalized = scenario.replace(/-/g, '_');
  if (['cartographer_56_manual', 'cartographer_56_random', 'cartographer_56'].includes(normalized) ||
      ['cartographer_78', 'cartographer_78_7', 'cartographer_78_8', 'scattered_56'].includes(scenario) ||
      scenario.startsWith('scattered_tiles_56') || scenario.startsWith('scattered_tiles_78')) return 14;
  if (['cartographer_4_manual', 'cartographer_4_random', 'cartographer_4'].includes(normalized)) return 12;
  return 13;
}

module.exports = { defaultVictoryPointsToWin };
