/** Shared protocol vocabulary for incremental client/server typing. */
export const CLIENT_MESSAGE_TYPES = [
  'auth_login', 'auth_register', 'auth_set_display_name', 'auth_token',
  'chat', 'clear_ai', 'client_ping', 'create_room', 'edit_preview_port', 'edit_preview_tile', 'fill_ai',
  'game_action', 'generate_map', 'get_game_history', 'get_game_history_entry',
  'get_player_leaderboard', 'get_state', 'get_texture_pack', 'join_room',
  'kick_player', 'leave_room', 'pause_game', 'query_build_options',
  'query_ship_move_targets', 'rejoin_room', 'rematch_room', 'request_leave_game',
  'respond_leave_game', 'set_ai_difficulty', 'set_expert_ai_tuning',
  'set_player_color', 'set_rules', 'set_spectator_mode', 'set_spectator_view', 'set_texture_pack',
  'start_game', 'texture_pack_publish',
] as const;

export type ClientMessageType = typeof CLIENT_MESSAGE_TYPES[number];

export type ClientMessage = {
  type: ClientMessageType;
  [key: string]: unknown;
};

export type AuthenticatedUser = {
  id: string;
  username: string;
  displayName: string;
  isAdmin: boolean;
  stats: Record<string, number>;
};

export type ServerMessage =
  | { type: 'hello'; serverTime: number; version: number }
  | { type: 'auth_ok'; user: AuthenticatedUser; token: string | null; cookieAuth?: boolean }
  | { type: 'auth_required' }
  | { type: 'error'; error: string }
  | { type: 'expert_ai_tuning_ok'; tuning: Record<string, number> }
  | { type: 'joined'; playerId: string; isHost: boolean; room: unknown }
  | { type: 'room'; room: unknown }
  | { type: 'state'; state: unknown }
  | { type: string; [key: string]: unknown };
