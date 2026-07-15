'use strict';

function extendPlayerTurn(game, playerId, extraMs, currentSegmentKey, clock = Date.now) {
  if (!game || game.phase !== 'main-actions' || game.currentPlayerId !== playerId) return false;
  const extra = Math.max(0, Math.floor(Number(extraMs || 0)));
  if (!extra) return false;
  const segmentKey = String(currentSegmentKey || '');
  const timer = game.timer;
  if (!timer || timer.phase !== game.phase || String(timer.segmentKey || '') !== segmentKey) return false;
  const now = Number(clock());
  timer.endsAt = Math.max(now, Number(timer.endsAt || now)) + extra;
  timer.durationMs = Math.max(0, Math.floor(Number(timer.durationMs || 0))) + extra;
  return true;
}

module.exports = { extendPlayerTurn };
