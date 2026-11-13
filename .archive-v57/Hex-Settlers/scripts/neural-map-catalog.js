'use strict';
// Shared map catalog for training and non-destructive complete-game validation.
const ALL_MAPS = Object.freeze([
  { id: 'classic', label: 'Classic', mapMode: 'classic', scenario: 'four_islands', players: 4, victoryPoints: 10 },
  { id: 'classic56', label: 'Classic 5-6', mapMode: 'classic56', scenario: 'four_islands', players: 6, victoryPoints: 10 },
  { id: 'four_islands', label: 'Four Islands', mapMode: 'seafarers', scenario: 'four_islands', players: 4, victoryPoints: 13, gold: true },
  { id: 'through_the_desert', label: 'Through the Desert', mapMode: 'seafarers', scenario: 'through_the_desert', players: 4, victoryPoints: 14, gold: true },
  { id: 'fog_island', label: 'Fog Island', mapMode: 'seafarers', scenario: 'fog_island', players: 4, victoryPoints: 12, gold: true },
  { id: 'heading_for_new_shores', label: 'Heading for New Shores', mapMode: 'seafarers', scenario: 'heading_for_new_shores', players: 4, victoryPoints: 14, gold: true },
  { id: 'cartographer_4_manual', label: 'Cartographer 4', mapMode: 'seafarers', scenario: 'cartographer_4_manual', players: 4, victoryPoints: 12, gold: true },
  { id: 'cartographer_4_random', label: 'Scattered Tiles 4', mapMode: 'seafarers', scenario: 'cartographer_4_random', players: 4, victoryPoints: 12, gold: true },
  { id: 'test_builder', label: 'Test Builder 4', mapMode: 'seafarers', scenario: 'test_builder', players: 4, victoryPoints: 13, gold: true, customBuilder: true },
  { id: 'six_islands', label: 'Six Islands', mapMode: 'seafarers', scenario: 'six_islands', players: 6, victoryPoints: 14, gold: true },
  { id: 'heading_for_new_shores_56', label: 'Heading for New Shores 5-6', mapMode: 'seafarers', scenario: 'heading_for_new_shores_56', players: 6, victoryPoints: 14, gold: true },
  { id: 'through_the_desert_56', label: 'Through the Desert 5-6', mapMode: 'seafarers', scenario: 'through_the_desert_56', players: 6, victoryPoints: 14, gold: true },
  { id: 'fog_island_56', label: 'Fog Island 5-6', mapMode: 'seafarers', scenario: 'fog_island_56', players: 6, victoryPoints: 12, gold: true },
  { id: 'cartographer_56_manual', label: 'Cartographer 5-6', mapMode: 'seafarers', scenario: 'cartographer_56_manual', players: 6, victoryPoints: 12, gold: true },
  { id: 'cartographer_56_random', label: 'Scattered Tiles 5-6', mapMode: 'seafarers', scenario: 'cartographer_56_random', players: 6, victoryPoints: 12, gold: true },
  { id: 'test_builder_56', label: 'Test Builder 5-6', mapMode: 'seafarers', scenario: 'test_builder_56', players: 6, victoryPoints: 13, gold: true, customBuilder: true },
  { id: 'classic78', label: 'Classic 7-8', mapMode: 'classic78', scenario: 'four_islands', players: 8, victoryPoints: 14 },
  { id: 'eight_islands_78', label: 'Eight Islands 7-8', mapMode: 'seafarers', scenario: 'eight_islands_78', players: 8, victoryPoints: 14, gold: true },
  { id: 'through_the_desert_78', label: 'Through the Desert 7-8', mapMode: 'seafarers', scenario: 'through_the_desert_78', players: 8, victoryPoints: 14, gold: true },
  { id: 'fog_island_78', label: 'Fog Island 7-8', mapMode: 'seafarers', scenario: 'fog_island_78', players: 8, victoryPoints: 14, gold: true },
  { id: 'heading_for_new_shores_78', label: 'Heading for New Shores 7-8', mapMode: 'seafarers', scenario: 'heading_for_new_shores_78', players: 8, victoryPoints: 14, gold: true },
]);
module.exports={ALL_MAPS};
