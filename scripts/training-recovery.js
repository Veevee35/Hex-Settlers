'use strict';
// A failed match never adds a trained game. After repeated failures the trainer
// tries a different real, valid map (prefer the same seat count).
function fallbackMap(maps, requested, round, attempted = []) {
  if (!Number.isInteger(round) || round < 1) return requested;
  const exclude = new Set([...attempted, requested.id]);
  const sameCount = maps.filter(m => m.players === requested.players && !exclude.has(m.id));
  const other = maps.filter(m => m.players !== requested.players && !exclude.has(m.id));
  const pool = sameCount.length ? sameCount : other;
  if (!pool.length) return requested;
  // Rotate so persistent trouble on a scenario does not always hit one replacement.
  return pool[(round - 1) % pool.length];
}
function validateCheckpoint(checkpoint, startingTrainedGames, items, mapIds, startingHash = null) {
  if (!checkpoint || !Array.isArray(checkpoint.games) || !checkpoint.model) throw new Error('Invalid training checkpoint');
  if (Number(checkpoint.startingTrainedGames) !== startingTrainedGames) throw new Error('Checkpoint uses a different base model');
  if (Number(checkpoint.model.trainedGames) !== startingTrainedGames + checkpoint.games.length) throw new Error('Checkpoint trained-games count is inconsistent');
  const seen = new Set();
  for (const game of checkpoint.games) {
    const index = Number(game.sessionIndex);
    if (!Number.isInteger(index) || index < 0 || index >= items.length || seen.has(index)) throw new Error(`Invalid or duplicate checkpoint game index: ${index}`);
    if (!mapIds.has(game.mapId)) throw new Error(`Unknown trained map: ${game.mapId}`);
    seen.add(index);
  }
  if (checkpoint.mapSet && checkpoint.mapSet !== process.env.MAP_SET && process.env.MAP_SET) throw new Error('Checkpoint map set differs from current MAP_SET');
  if (checkpoint.totalGames && Number(checkpoint.totalGames) !== items.length) throw new Error('Checkpoint game total differs from SIMS');
  if (checkpoint.curriculumOffset != null && Number(checkpoint.curriculumOffset) !== Number(items[0]?.curriculumIndex || 0)) throw new Error('Checkpoint curriculum offset changed');
  if (startingHash && checkpoint.startingModelSha256 && checkpoint.startingModelSha256 !== startingHash) throw new Error('Checkpoint initial model hash mismatch');
  return seen;
}
module.exports = { fallbackMap, validateCheckpoint };
