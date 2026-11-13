#pragma once
#include <cstdint>

// Deterministic subset of Hex Settlers' authoritative state, suitable for a
// stable native ABI and future Emscripten/WebAssembly compilation. This is NOT
// the complete game engine or an authoritative multiplayer replacement.
namespace hex_rules {
constexpr int MAX_PLAYERS = 8;
constexpr int MAX_NODES = 512;
constexpr int MAX_EDGES = 1024;
constexpr int RESOURCES = 5;
constexpr int MAX_QUERIES = 48;
constexpr uint32_t MAGIC = 0x43485848; // HXHC little endian
constexpr uint32_t VERSION = 1;
// All values are little-endian signed 32-bit integers. Keep this binary ABI
// identical across Windows, Linux and wasm32.
struct State {
  int32_t player_count, node_count, edge_count, discard_limit, victory_target;
  int32_t hand[MAX_PLAYERS][RESOURCES];
  int32_t departed[MAX_PLAYERS];
  int32_t vp_dev[MAX_PLAYERS], island_vp[MAX_PLAYERS], desert_vp[MAX_PLAYERS], army[MAX_PLAYERS];
  int32_t node_owner[MAX_NODES], node_city[MAX_NODES];
  int32_t edge_a[MAX_EDGES], edge_b[MAX_EDGES], edge_owner[MAX_EDGES], edge_route_type[MAX_EDGES];
  int32_t longest_owner, longest_length, army_owner, army_size;
  int32_t longest_by_player[MAX_PLAYERS], vp[MAX_PLAYERS];
  int32_t resource_total[MAX_PLAYERS], discard_required[MAX_PLAYERS];
  // road, ship, settlement, city, dev card
  int32_t can_afford[MAX_PLAYERS][5], at_target[MAX_PLAYERS];
  // JS settlementDistanceOk and edgeConnectsToPlayer query results.
  int32_t query_count, query_node[MAX_QUERIES], query_edge[MAX_QUERIES], query_player[MAX_QUERIES];
  int32_t query_settlement_ok[MAX_QUERIES], query_road_connected[MAX_QUERIES];
};
struct Header { uint32_t magic, version, count, bytes_per_state; };
enum Operation : int32_t { snapshot = 0, route_lengths = 1, victory_points = 2 };
}
extern "C" {
// Returns 0 on success, nonzero for invalid input. Writes outputs into state.
// All computed results reflect JS computeVP(), computeLongestRoadForPlayer(),
// recomputeLongestRoad(), recomputeLargestArmy(), discardRequired(), canAfford(), settlementDistanceOk(),
// edgeConnectsToPlayer().
int hex_cpp_evaluate(hex_rules::State* state, int operation);
int hex_cpp_step(hex_rules::State* state);
uint32_t hex_cpp_abi_version();
uint32_t hex_cpp_state_size();
}
