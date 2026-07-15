/** Shared compile-time contract for the legacy browser/server WebSocket protocol. */

export const CLIENT_MESSAGE_TYPES = [
  'auth_login', 'auth_register', 'auth_set_display_name', 'auth_token',
  'chat', 'clear_ai', 'create_room', 'edit_preview_tile', 'fill_ai',
  'game_action', 'generate_map', 'get_game_history', 'get_game_history_entry',
  'get_player_leaderboard', 'get_state', 'get_texture_pack', 'join_room',
  'kick_player', 'leave_room', 'pause_game', 'query_build_options',
  'query_ship_move_targets', 'rejoin_room', 'rematch_room', 'request_leave_game',
  'respond_leave_game', 'set_ai_difficulty', 'set_player_color', 'set_rules',
  'set_spectator_mode', 'set_texture_pack', 'start_game', 'texture_pack_publish',
  'trade_timer_pause',
] as const;

export const SERVER_MESSAGE_TYPES = [
  'auth_ok', 'auth_required', 'build_options', 'error', 'game_history_entry',
  'game_history_list', 'hello', 'joined', 'leave_game_request',
  'leave_game_result', 'left_room', 'player_leaderboard', 'room', 'sfx',
  'ship_move_targets', 'state', 'texture_pack_payload', 'user_stats',
] as const;

export type ClientMessageType = typeof CLIENT_MESSAGE_TYPES[number];
export type ServerMessageType = typeof SERVER_MESSAGE_TYPES[number];

export interface ProtocolMessage<TType extends string> {
  type: TType;
  [key: string]: unknown;
}

export type ClientMessage = ProtocolMessage<ClientMessageType>;
export type ServerMessage = ProtocolMessage<ServerMessageType>;

export interface AuthCredentials {
  username: string;
  password: string;
  displayName?: string;
}

export interface GameActionMessage extends ProtocolMessage<'game_action'> {
  action: {
    kind: string;
    [key: string]: unknown;
  };
}
