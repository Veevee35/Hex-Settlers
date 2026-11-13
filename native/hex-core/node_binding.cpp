#include <node_api.h>
#include "hex_rules_core.hpp"
#include "../../scripts/cuda-exact/hex_exact_common.h"

using hex_rules::State;

static napi_value run(napi_env env, napi_callback_info info) {
  size_t argc = 2, bytes = 0;
  napi_value args[2];
  void* data = nullptr;
  int32_t operation = 0;
  if (napi_get_cb_info(env, info, &argc, args, nullptr, nullptr) != napi_ok ||
      argc != 2 || napi_get_buffer_info(env, args[0], &data, &bytes) != napi_ok ||
      bytes != sizeof(State) || napi_get_value_int32(env, args[1], &operation) != napi_ok) {
    napi_throw_type_error(env, nullptr, "Invalid hex rules ABI arguments");
    return nullptr;
  }
  const auto result = hex_cpp_evaluate(static_cast<State*>(data), operation);
  if (result) {
    napi_throw_range_error(env, nullptr, "Native hex rules rejected game state");
    return nullptr;
  }
  napi_value undefined;
  napi_get_undefined(env, &undefined);
  return undefined;
}

static napi_value produce(napi_env env, napi_callback_info info) {
  size_t argc = 1, bytes = 0;
  napi_value arg;
  void* data = nullptr;
  if (napi_get_cb_info(env, info, &argc, &arg, nullptr, nullptr) != napi_ok ||
      argc != 1 || napi_get_buffer_info(env, arg, &data, &bytes) != napi_ok ||
      bytes != sizeof(hex_exact::Game)) {
    napi_throw_type_error(env, nullptr, "Invalid production ABI buffer");
    return nullptr;
  }
  auto* game = static_cast<hex_exact::Game*>(data);
  if (game->player_count < 1 || game->player_count > hex_exact::MAX_PLAYERS ||
      game->tile_count < 0 || game->tile_count > hex_exact::MAX_TILES) {
    napi_throw_range_error(env, nullptr, "Invalid production board size");
    return nullptr;
  }
  for (int i = 0; i < game->tile_count; ++i) {
    if (game->tiles[i].corner_count < 0 || game->tiles[i].corner_count > hex_exact::MAX_CORNERS) {
      napi_throw_range_error(env, nullptr, "Invalid production tile");
      return nullptr;
    }
  }
  for (int p = 0; p < game->player_count; ++p) {
    for (auto& resource : game->hand[p]) resource = 0;
  }
  hex_exact::production(game);
  return arg;
}

static napi_value trade(napi_env env, napi_callback_info info) {
  // One actor and five resource kinds. Reuse the CPU/CUDA inventory rule.
  constexpr size_t resources = hex_exact::RESOURCES;
  size_t argc = 1, bytes = 0;
  napi_value arg;
  void* data = nullptr;
  if (napi_get_cb_info(env, info, &argc, &arg, nullptr, nullptr) != napi_ok ||
      argc != 1 || napi_get_buffer_info(env, arg, &data, &bytes) != napi_ok ||
      bytes != (1 + resources * 4) * sizeof(int32_t)) {
    napi_throw_type_error(env, nullptr, "Invalid bank trade ABI buffer");
    return nullptr;
  }
  auto* words = static_cast<int32_t*>(data);
  hex_exact::Game game;
  game.player_count = 1;
  game.actor = 0;
  game.departed[0] = 0;
  game.bank_max = words[0];
  for (size_t i = 0; i < resources; ++i) {
    game.bank[i] = words[1 + i];
    game.hand[0][i] = words[1 + resources + i];
    game.give[i] = words[1 + 2 * resources + i];
    game.take[i] = words[1 + 3 * resources + i];
  }
  hex_exact::bank_trade(&game);
  if (game.trade_ok) {
    for (size_t i = 0; i < resources; ++i) {
      words[1 + i] = game.bank[i];
      words[1 + resources + i] = game.hand[0][i];
    }
  }
  napi_value accepted;
  napi_get_boolean(env, game.trade_ok != 0, &accepted);
  return accepted;
}

NAPI_MODULE_INIT() {
  napi_value function;
  napi_create_function(env, "evaluate", NAPI_AUTO_LENGTH, run, nullptr, &function);
  napi_set_named_property(env, exports, "evaluate", function);
  napi_create_function(env, "produce", NAPI_AUTO_LENGTH, produce, nullptr, &function);
  napi_set_named_property(env, exports, "produce", function);
  napi_create_function(env, "trade", NAPI_AUTO_LENGTH, trade, nullptr, &function);
  napi_set_named_property(env, exports, "trade", function);
  return exports;
}
