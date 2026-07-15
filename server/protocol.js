'use strict';

const CLIENT_MESSAGE_TYPES = Object.freeze([
  'auth_login', 'auth_register', 'auth_set_display_name', 'auth_token',
  'chat', 'clear_ai', 'create_room', 'edit_preview_tile', 'fill_ai',
  'game_action', 'generate_map', 'get_game_history', 'get_game_history_entry',
  'get_player_leaderboard', 'get_state', 'get_texture_pack', 'join_room',
  'kick_player', 'leave_room', 'pause_game', 'query_build_options',
  'query_ship_move_targets', 'rejoin_room', 'rematch_room', 'request_leave_game',
  'respond_leave_game', 'set_ai_difficulty', 'set_expert_ai_tuning',
  'set_player_color', 'set_rules', 'set_spectator_mode', 'set_spectator_view', 'set_texture_pack',
  'start_game', 'texture_pack_publish',
]);

const CLIENT_MESSAGE_TYPE_SET = new Set(CLIENT_MESSAGE_TYPES);
const REGULAR_MESSAGE_MAX_BYTES = 256 * 1024;
const TEXTURE_PACK_MESSAGE_MAX_BYTES = 48 * 1024 * 1024;

function parseClientMessage(data) {
  const text = String(data);
  let value;
  try { value = JSON.parse(text); }
  catch (_) { return { ok: false, error: 'Invalid JSON message.' }; }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, error: 'Message must be an object.' };
  if (typeof value.type !== 'string' || !CLIENT_MESSAGE_TYPE_SET.has(value.type)) return { ok: false, error: 'Unknown message type.' };
  const byteLength = Buffer.byteLength(text, 'utf8');
  const byteLimit = value.type === 'texture_pack_publish' ? TEXTURE_PACK_MESSAGE_MAX_BYTES : REGULAR_MESSAGE_MAX_BYTES;
  if (byteLength > byteLimit) return { ok: false, error: 'Message is too large.' };
  return { ok: true, value };
}

module.exports = { CLIENT_MESSAGE_TYPES, REGULAR_MESSAGE_MAX_BYTES, TEXTURE_PACK_MESSAGE_MAX_BYTES, parseClientMessage };
