"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLIENT_MESSAGE_TYPES = void 0;
/** Shared protocol vocabulary for incremental client/server typing. */
exports.CLIENT_MESSAGE_TYPES = [
    'auth_login', 'auth_register', 'auth_set_display_name', 'auth_token',
    'chat', 'clear_ai', 'create_room', 'edit_preview_tile', 'fill_ai',
    'game_action', 'generate_map', 'get_game_history', 'get_game_history_entry',
    'get_player_leaderboard', 'get_state', 'get_texture_pack', 'join_room',
    'kick_player', 'leave_room', 'pause_game', 'query_build_options',
    'query_ship_move_targets', 'rejoin_room', 'rematch_room', 'request_leave_game',
    'respond_leave_game', 'set_ai_difficulty', 'set_expert_ai_tuning',
    'set_player_color', 'set_rules', 'set_spectator_mode', 'set_texture_pack',
    'start_game', 'texture_pack_publish', 'trade_timer_pause',
];
