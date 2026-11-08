'use strict';

// Room leases are based on deliberate player interaction, not state broadcasts,
// timer ticks, WebSocket heartbeats, or reconnect polling. Durations are
// conservative to protect reconnecting players and finished-game summaries.
const ROOM_LIFETIMES_MS = Object.freeze({
  emptyLobby: 20 * 60_000,
  occupiedLobbyIdle: 60 * 60_000,
  finishedDisconnected: 10 * 60_000,
  finishedConnected: 45 * 60_000,
  activeDisconnected: 2 * 60 * 60_000,
});

function roomExpiry(room, at = Date.now(), connected = false) {
  if (!room || typeof room !== 'object') return { expired: false, expiresAt: null, reason: '' };
  const created = Number(room.createdAt || 0) || at;
  const lastActive = Number(room.lastActiveAt || 0) || created;
  const lastHuman = Number(room.lastHumanActivityAt || 0) || lastActive;
  const phase = String(room.game?.phase || 'lobby');
  let expiresAt, reason;
  if (phase === 'game-over') {
    const ended = Number(room.game?.stats?.endedAt || room.finishedAt || 0) || lastActive;
    expiresAt = ended + (connected ? ROOM_LIFETIMES_MS.finishedConnected : ROOM_LIFETIMES_MS.finishedDisconnected);
    reason = 'This finished game has been archived. Start a new lobby to play again.';
  } else if (phase === 'lobby') {
    expiresAt = lastHuman + (connected ? ROOM_LIFETIMES_MS.occupiedLobbyIdle : ROOM_LIFETIMES_MS.emptyLobby);
    reason = 'This lobby closed after a period of inactivity.';
  } else {
    // Never expire a connected, active game; a reconnecting participant has two
    // hours from the last legitimate game activity to recover an empty room.
    expiresAt = connected ? null : Math.max(lastHuman, lastActive) + ROOM_LIFETIMES_MS.activeDisconnected;
    reason = 'This abandoned game closed after two hours without a connection.';
  }
  return { expired: expiresAt != null && at >= expiresAt, expiresAt, reason };
}

const PLAYER_ACTIVITY_TYPES = new Set([
  'chat', 'set_rules', 'set_ready', 'start_game', 'generate_map', 'fill_ai', 'clear_ai',
  'edit_preview_tile', 'edit_preview_port', 'upload_custom_map', 'set_player_color',
  'set_ai_difficulty', 'set_expert_ai_tuning', 'pause_game', 'game_action',
  'respond_leave_game', 'request_leave_game', 'ranked_scenario_vote',
  'rematch_room', 'set_spectator_mode',
]);

function isPlayerActivity(type) { return PLAYER_ACTIVITY_TYPES.has(String(type || '')); }

module.exports = { ROOM_LIFETIMES_MS, roomExpiry, isPlayerActivity };
