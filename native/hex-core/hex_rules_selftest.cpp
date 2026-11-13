#include "hex_rules_core.hpp"
#include "../../scripts/cuda-exact/hex_exact_common.h"
#include <cstdio>

int main() {
  hex_rules::State state{};
  state.player_count = 2;
  state.node_count = 1;
  state.node_owner[0] = 0;
  state.node_city[0] = 1;
  state.victory_target = 10;
  state.longest_owner = -1;
  state.army_owner = -1;
  state.army[0] = 3;
  state.query_player[0] = 0;
  if (hex_cpp_evaluate(&state, hex_rules::knight_army_title) || state.army_owner != 0 ||
      hex_cpp_evaluate(&state, hex_rules::victory_points) || state.vp[0] != 4) {
    std::fputs("Largest Army and scoring failed\n", stderr);
    return 1;
  }

  state.node_count = 6;
  state.edge_count = 5;
  for (int node = 1; node < state.node_count; ++node) state.node_owner[node] = -1;
  for (int edge = 0; edge < state.edge_count; ++edge) {
    state.edge_a[edge] = edge;
    state.edge_b[edge] = edge + 1;
    state.edge_owner[edge] = 0;
  }
  if (hex_cpp_evaluate(&state, hex_rules::road_title) ||
      state.longest_owner != 0 || state.longest_length != 5) {
    std::fputs("Longest Road qualification failed\n", stderr);
    return 1;
  }
  state.node_owner[3] = 1;
  if (hex_cpp_evaluate(&state, hex_rules::road_title) ||
      state.longest_owner != -1 || state.longest_length != 3) {
    std::fputs("Longest Road interruption failed\n", stderr);
    return 1;
  }

  hex_exact::Game game{};
  game.player_count = 2;
  game.tile_count = 1;
  game.roll = 8;
  game.bank_max = 19;
  game.bank[0] = 1;
  auto& tile = game.tiles[0];
  tile.number = 8;
  tile.corner_count = 2;
  tile.owner[0] = 0;
  tile.owner[1] = 1;
  tile.city[0] = 1;
  game.gold_tile_count[0] = -1;
  game.gains[0][0] = 99;
  hex_exact::production(&game);
  if (game.gold_tile_count[0] != 0 || game.gains[0][0] != 1 || game.bank[0] != 0 || game.hand[0][0] != 1 || game.hand[1][0] != 0) {
    std::fputs("Bank shortage and production order failed\n", stderr);
    return 1;
  }
  return 0;
}
