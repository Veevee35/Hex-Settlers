#include "hex_rules_core.hpp"
#include <algorithm>
#include <vector>
#include <functional>
using namespace hex_rules;

uint32_t hex_cpp_abi_version() { return VERSION; }
uint32_t hex_cpp_state_size() { return sizeof(State); }

static int road_length(const State &s, int player) {
  std::vector<int> owned;
  std::vector<std::vector<int>> adjacency(s.node_count);
  for (int e = 0; e < s.edge_count; ++e) {
    if (s.edge_owner[e] != player) continue;
    owned.push_back(e);
    adjacency[s.edge_a[e]].push_back(e);
    adjacency[s.edge_b[e]].push_back(e);
  }
  if (owned.empty()) return 0;
  std::vector<unsigned char> used(s.edge_count, 0);
  std::function<int(int,int)> dfs = [&](int node, int prev_node) -> int {
    // A settlement/city owned by another player terminates an incoming route.
    if (prev_node >= 0 && s.node_owner[node] >= 0 && s.node_owner[node] != player) return 0;
    int best = 0;
    for (int eid : adjacency[node]) {
      if (used[eid]) continue;
      used[eid] = 1;
      const int next = s.edge_a[eid] == node ? s.edge_b[eid] : s.edge_a[eid];
      best = std::max(best, 1 + dfs(next, node));
      used[eid] = 0;
    }
    return best;
  };
  int best = 0;
  for (int e : owned) {
    best = std::max(best, dfs(s.edge_a[e], -1));
    best = std::max(best, dfs(s.edge_b[e], -1));
  }
  return best;
}

// Matching server/departure.js resolveDepartedTitleChallenge:
// a departed holder keeps the title until a single active player exceeds both
// its benchmark and the minimum threshold.
static bool departed_challenge(const State &s, int old_owner, int benchmark,
                               int minimum, const int *score, int &owner, int &value) {
  if (old_owner < 0 || old_owner >= s.player_count || !s.departed[old_owner]) return false;
  int best = 0, candidate = -1, tied = 0;
  for (int p = 0; p < s.player_count; ++p) {
    if (s.departed[p]) continue;
    if (score[p] > best) { best = score[p]; candidate = p; tied = 0; }
    else if (score[p] == best && score[p] > 0) tied = 1;
  }
  if (best >= minimum && best > benchmark && !tied) { owner = candidate; value = best; }
  else { owner = old_owner; value = benchmark; }
  return true;
}

int hex_cpp_step(State *ptr) {
  if (!ptr) return 1;
  State &s = *ptr;
  if (s.player_count < 1 || s.player_count > MAX_PLAYERS || s.node_count < 0 ||
      s.node_count > MAX_NODES || s.edge_count < 0 || s.edge_count > MAX_EDGES ||
      s.discard_limit < 0 || s.victory_target < 1 ||
      s.longest_owner < -1 || s.longest_owner >= s.player_count ||
      s.army_owner < -1 || s.army_owner >= s.player_count ||
      s.query_count < 0 || s.query_count > MAX_QUERIES) return 2;
  for (int e = 0; e < s.edge_count; ++e) {
    if (s.edge_a[e] < 0 || s.edge_a[e] >= s.node_count ||
        s.edge_b[e] < 0 || s.edge_b[e] >= s.node_count ||
        s.edge_owner[e] < -1 || s.edge_owner[e] >= s.player_count) return 3;
  }
  for (int n = 0; n < s.node_count; ++n)
    if (s.node_owner[n] < -1 || s.node_owner[n] >= s.player_count) return 4;
  const int32_t cost[5][RESOURCES] = {
      {1,1,0,0,0}, // road
      {0,1,1,0,0}, // ship
      {1,1,1,1,0}, // settlement
      {0,0,0,2,3}, // city
      {0,0,1,1,1}  // development card
  };
  for (int p = 0; p < s.player_count; ++p) {
    int count = 0;
    for (int r = 0; r < RESOURCES; ++r) count += s.hand[p][r];
    s.resource_total[p] = count;
    s.discard_required[p] = count > s.discard_limit ? count / 2 : 0;
    for (int b = 0; b < 5; ++b) {
      int good = 1;
      for (int r = 0; r < RESOURCES; ++r)
        if (s.hand[p][r] < cost[b][r]) good = 0;
      s.can_afford[p][b] = good;
    }
    s.longest_by_player[p] = road_length(s, p);
  }

  const int previous_road_owner = s.longest_owner;
  int best_road = 0;
  for (int p = 0; p < s.player_count; ++p)
    if (!s.departed[p]) best_road = std::max(best_road, s.longest_by_player[p]);
  int road_owner = -1, road_size = best_road;
  if (!departed_challenge(s, previous_road_owner, s.longest_length, 5,
                          s.longest_by_player, road_owner, road_size)) {
    if (best_road >= 5) {
      int candidates = 0;
      for (int p = 0; p < s.player_count; ++p) {
        if (s.departed[p] || s.longest_by_player[p] != best_road) continue;
        ++candidates;
        if (candidates == 1) road_owner = p;
        if (p == previous_road_owner) road_owner = p;
      }
      if (candidates > 1 && !(previous_road_owner >= 0 && !s.departed[previous_road_owner] &&
                               s.longest_by_player[previous_road_owner] == best_road)) road_owner = -1;
    }
  }
  s.longest_owner = road_owner;
  s.longest_length = road_size;

  const int previous_army_owner = s.army_owner;
  int army_owner = -1, army_size = 0;
  if (!departed_challenge(s, previous_army_owner, s.army_size, 3,
                          s.army, army_owner, army_size)) {
    // The JS algorithm processes seats in order and preserves the previous
    // owner on tied leader scores, but otherwise leaves the title unclaimed.
    int best = 0, next = -1, tied = 0;
    for (int p = 0; p < s.player_count; ++p) {
      if (s.departed[p]) continue;
      const int size = std::max(0, s.army[p]);
      if (size < 3) continue;
      if (size > best) { best = size; next = p; tied = 0; }
      else if (size == best && best >= 3) {
        if (previous_army_owner >= 0 && (p == previous_army_owner || next == previous_army_owner)) {
          next = previous_army_owner; tied = 0;
        } else tied = 1;
      }
    }
    if (tied && next != previous_army_owner) next = -1;
    army_owner = next; army_size = best;
  }
  s.army_owner = army_owner;
  s.army_size = army_size;

  for (int p = 0; p < s.player_count; ++p)
    s.vp[p] = s.vp_dev[p] + s.island_vp[p] + s.desert_vp[p];
  for (int n = 0; n < s.node_count; ++n) {
    const int owner = s.node_owner[n];
    if (owner >= 0) s.vp[owner] += s.node_city[n] ? 2 : 1;
  }
  if (s.longest_owner >= 0) s.vp[s.longest_owner] += 2;
  if (s.army_owner >= 0) s.vp[s.army_owner] += 2;
  for (int p = 0; p < s.player_count; ++p)
    s.at_target[p] = s.vp[p] >= s.victory_target ? 1 : 0;
  // These are deterministic geometric legality helpers from server.js.
  // edgeConnectsToPlayer deliberately tests roads and buildings, not ships:
  // this is the current JS behavior, even on mixed-route boards.
  for (int q=0;q<s.query_count;++q) {
    const int n = s.query_node[q], e = s.query_edge[q], p = s.query_player[q];
    if(n<0 || n>=s.node_count || e<0 || e>=s.edge_count || p<0 || p>=s.player_count)return 5;
    int settlement_ok = s.node_owner[n] < 0;
    for(int x=0;x<s.edge_count;++x) {
      if(s.edge_a[x] == n && s.node_owner[s.edge_b[x]] >= 0) settlement_ok=0;
      if(s.edge_b[x] == n && s.node_owner[s.edge_a[x]] >= 0) settlement_ok=0;
    }
    s.query_settlement_ok[q] = settlement_ok;
    const int a = s.edge_a[e], b=s.edge_b[e];
    int connected = (s.node_owner[a]==p || s.node_owner[b]==p) ? 1 : 0;
    // The query ABI only represents a route owner (road OR ship). The source
    // edge's concrete route type is needed here, so see road_owner below.
    // A ship must never satisfy edgeConnectsToPlayer's road-only checks.
    // Route type 1 means road; 2 means ship.
    for(int x=0;x<s.edge_count;++x) {
      if(s.edge_owner[x] != p || s.edge_route_type[x] != 1)continue;
      if(x==e || s.edge_a[x]==a || s.edge_b[x]==a || s.edge_a[x]==b || s.edge_b[x]==b)connected=1;
    }
    s.query_road_connected[q] = connected;
  }
  return 0;
}
