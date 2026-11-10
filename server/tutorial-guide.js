'use strict';

// This module owns the *practice-only* progression; production game rules are
// still validated by applyActionCore. It is intentionally independent of the
// WebSocket/UI layers so progress is testable and survives room restoration.
const GOALS = Object.freeze(['city', 'development', 'road', 'ship', 'settlement', 'bankTrade', 'playerTrade']);
const TOTAL_STEPS = 14; // opening, roll, seven construction goals, two 7 exercises, settings, finish

function newProgress(ownerId) {
  return {
    ownerId, version: 2, settlements: 0, roads: 0, rolls: 0, endedTurns: 0,
    starterKitGranted: false, aiRolledSeven: false, playerRolledSeven: false,
    discardedForSeven: false, robberResolved: false, settingsReviewed: false,
    completed: false,
    goals: Object.fromEntries(GOALS.map(goal => [goal, false])),
  };
}
function goalsComplete(progress) {
  return GOALS.every(k => progress?.goals?.[k] === true);
}
function readyForSettings(progress) {
  return goalsComplete(progress) && progress.aiRolledSeven && progress.discardedForSeven &&
    progress.playerRolledSeven && progress.robberResolved;
}
function completedCount(progress) {
  if (!progress) return 0;
  const setupDone = progress.settlements >= 2 && progress.roads >= 2;
  return Number(setupDone) + Number(progress.rolls >= 1) +
    GOALS.filter(g => progress.goals?.[g]).length +
    Number(progress.aiRolledSeven && progress.discardedForSeven) +
    Number(progress.playerRolledSeven && progress.robberResolved) +
    Number(progress.settingsReviewed) + Number(progress.completed);
}
function recordPlayerAction(progress, kind, beforePhase, afterPhase, lastRoll) {
  if (!progress || progress.completed) return;
  if (kind === 'place_settlement') {
    if (beforePhase.startsWith('setup')) progress.settlements++;
    else if (beforePhase === 'main-actions') progress.goals.settlement = true;
  }
  if (kind === 'place_road') {
    if (beforePhase.startsWith('setup')) progress.roads++;
    else if (beforePhase === 'main-actions') progress.goals.road = true;
  }
  if (kind === 'roll_dice') {
    progress.rolls++;
    if (lastRoll?.roll === 7) progress.playerRolledSeven = true;
  }
  if (kind === 'end_turn') progress.endedTurns++;
  const map = {
    place_ship: 'ship', upgrade_city: 'city', buy_dev_card: 'development',
    bank_trade: 'bankTrade', finalize_trade: 'playerTrade',
  };
  if (map[kind] && beforePhase === 'main-actions') progress.goals[map[kind]] = true;
  if (kind === 'discard_cards' && beforePhase === 'discard') progress.discardedForSeven = true;
  if (['move_robber', 'move_pirate', 'robber_steal', 'pirate_steal'].includes(kind) &&
      progress.playerRolledSeven && afterPhase === 'main-actions') progress.robberResolved = true;
}
function chooseTutorialDice(game, playerId) {
  const p = game?.tutorial;
  if (!p || p.completed) return null;
  if (!goalsComplete(p)) return { d1: 3, d2: 5, roll: 8 };
  // Keep the learner's next seven after the AI's demonstration, even if they
  // end extra rounds before the requested bank/player trades are complete.
  if (playerId === p.ownerId && !p.aiRolledSeven) return { d1: 3, d2: 5, roll: 8 };
  if (playerId !== p.ownerId && goalsComplete(p) && !p.aiRolledSeven) {
    p.aiRolledSeven = true;
    return { d1: 3, d2: 4, roll: 7 };
  }
  if (playerId === p.ownerId && p.aiRolledSeven && p.discardedForSeven && !p.playerRolledSeven)
    return { d1: 3, d2: 4, roll: 7 };
  return null;
}
module.exports = { GOALS, TOTAL_STEPS, newProgress, goalsComplete, readyForSettings, completedCount, recordPlayerAction, chooseTutorialDice };
