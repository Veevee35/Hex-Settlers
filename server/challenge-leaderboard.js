'use strict';

// The official ranking uses one result per account: their best legitimate
// challenge WIN for this map/week. Turns are the primary score, elapsed
// wall-clock time is the first tie-breaker, and fewer VPs is the last.
// These statistics all belong to the SAME winning game; mixing metrics from
// separate attempts would produce an impossible leaderboard score.
function compareChallengeResults(a, b) {
  const turnDifference = a.lowestTurns - b.lowestTurns;
  if (turnDifference) return turnDifference;
  const aTime = a.lowestTimeMs == null ? Infinity : a.lowestTimeMs;
  const bTime = b.lowestTimeMs == null ? Infinity : b.lowestTimeMs;
  if (aTime !== bTime) return aTime < bTime ? -1 : 1;
  const vpDifference = a.totalVP - b.totalVP;
  if (vpDifference) return vpDifference;
  return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
}

function buildChallengeLeaderboard(history, periodId, playerCount, findUserById, kind = 'weekly') {
  const bestByUser = new Map();
  const size = Number(playerCount);
  const defaultTarget = size === 4 ? 12 : 14;
  for (const game of (history || [])) {
    if (!game || game.ranked || game.casual ||
        (kind === 'daily' ? (game.challenge?.kind !== 'daily' || game.challenge?.dayId !== periodId) : (game.challenge?.kind === 'daily' || game.challenge?.weekId !== periodId)) || Number(game.challenge?.playerCount) !== size) continue;

    const id = String(game.winnerId || '');
    if (!id || id.startsWith('ai_')) continue;
    const player = (game.players || []).find(p => p && String(p.id) === id && !p.isAI);
    if (!player) continue;
    const user = findUserById(id);
    if (!user) continue;

    const totalVP = Math.floor(Number(player.vp));
    const targetValue = Number(game.rules?.victoryPointsToWin);
    const target = Number.isFinite(targetValue) && targetValue > 0 ? targetValue : defaultTarget;
    // Unanimously ending a game early counts in game history, but must not
    // create a speed-run leaderboard win (nor can one below the VP target).
    if (!Number.isFinite(totalVP) || totalVP < target || game.snapshot?.stats?.endedReason === 'vote') continue;

    // turnNumber is zero-based: turn 0 is displayed in-game as Turn 1.
    const zeroBasedTurns = Number(game.turns ?? game.snapshot?.turnNumber);
    if (!Number.isFinite(zeroBasedTurns) || zeroBasedTurns < 0) continue;
    const lowestTurns = Math.floor(zeroBasedTurns) + 1;

    const startedAt = Number(game.startedAt);
    const endedAt = Number(game.endedAt);
    const lowestTimeMs = Number.isFinite(startedAt) && Number.isFinite(endedAt) &&
      startedAt > 0 && endedAt >= startedAt ? Math.floor(endedAt - startedAt) : null;

    const result = {
      id,
      name: String(user.displayName || user.username || player.name || 'Player'),
      lowestTimeMs,
      lowestTurns,
      totalVP,
    };
    const current = bestByUser.get(id);
    if (!current || compareChallengeResults(result, current) < 0) bestByUser.set(id, result);
  }
  return [...bestByUser.values()].sort(compareChallengeResults).slice(0, 25);
}

module.exports = { buildChallengeLeaderboard, compareChallengeResults };
