// Hex Settlers exact CUDA port / production slice v1.
// The same per-game function is compiled by a native C++ reference executable
// and by NVCC. One CUDA thread owns one independent game. This does NOT
// implement the whole server's turn transition system.
#ifndef HEX_EXACT_COMMON_H
#define HEX_EXACT_COMMON_H
#include <cstdint>

#ifdef __CUDACC__
#define HEX_HD __host__ __device__
#else
#define HEX_HD
#endif

namespace hex_exact {
constexpr int MAX_PLAYERS = 8;
constexpr int MAX_TILES = 256;
constexpr int MAX_CORNERS = 6;
constexpr int RESOURCES = 5;
constexpr int RESOURCE_GOLD = 5;
constexpr int RESOURCE_NONE = 6;
constexpr uint32_t FILE_MAGIC = 0x58454847; // GHEX as little-endian bytes
constexpr uint32_t FILE_VERSION = 1;

// POD, only int32 fields, so Node Buffer and C++/CUDA share the same layout.
struct Tile {
    int32_t id, number, kind, robber, corner_count;
    int32_t owner[MAX_CORNERS]; // 0..7 or -1; owner indices correspond to JS players order
    int32_t city[MAX_CORNERS];  // 1 for city, 0 for any other building
};
struct Game {
    int32_t player_count, tile_count, roll, bank_max;
    int32_t bank[RESOURCES];
    int32_t hand[MAX_PLAYERS][RESOURCES];
    int32_t departed[MAX_PLAYERS];
    int32_t gains[MAX_PLAYERS][RESOURCES];
    int32_t blocked[MAX_PLAYERS][RESOURCES + 1];
    int32_t gold_amount[MAX_PLAYERS];
    int32_t gold_tile_count[MAX_PLAYERS];
    int32_t gold_tile_ids[MAX_PLAYERS][MAX_TILES];
    Tile tiles[MAX_TILES];
    // Normalized bank-trade plan (raw action validation remains in JavaScript).
    // op 0=production, op 1=validated bank trade.
    int32_t op, actor, trade_ok;
    int32_t give[RESOURCES], take[RESOURCES];
};
struct Header { uint32_t magic, version, count, bytes_per_game; };

HEX_HD inline int clamp_int(int v, int lo, int hi) {
    return v < lo ? lo : (v > hi ? hi : v);
}

// Faithful to server.js distributeResources(): sequential tile + corner order,
// bank shortage gives partial city grants, robber blocks opportunities,
// gold never enters hand; queue is assembled in players array order by JS.
HEX_HD inline void production(Game *g) {
    for (int k = 0; k < RESOURCES; ++k)
        g->bank[k] = clamp_int(g->bank[k], 0, g->bank_max);
    for (int t = 0; t < g->tile_count; ++t) {
        const Tile &tile = g->tiles[t];
        if (tile.number != g->roll || tile.kind < 0 || tile.kind > RESOURCE_GOLD) continue;
        for (int c = 0; c < tile.corner_count; ++c) {
            int owner = tile.owner[c];
            if (owner < 0 || owner >= g->player_count || g->departed[owner]) continue;
            int want = tile.city[c] ? 2 : 1;
            if (tile.robber) {
                g->blocked[owner][tile.kind] += want;
            } else if (tile.kind == RESOURCE_GOLD) {
                g->gold_amount[owner] += want;
                // JS Set preserves first-seen tile order; only one id per player.
                bool seen = false;
                for (int i = 0; i < g->gold_tile_count[owner]; ++i) {
                    if (g->gold_tile_ids[owner][i] == tile.id) { seen = true; break; }
                }
                if (!seen && g->gold_tile_count[owner] < MAX_TILES) {
                    g->gold_tile_ids[owner][g->gold_tile_count[owner]++] = tile.id;
                }
            } else {
                const int take = g->bank[tile.kind] < want ? g->bank[tile.kind] : want;
                g->bank[tile.kind] -= take;
                g->hand[owner][tile.kind] += take;
                g->gains[owner][tile.kind] += take;
            }
        }
    }
}

// Exact inventory mutation from the bank_trade branch in server.js.
// A raw action MUST be normalized by normalizeBankTradeAction() first.
HEX_HD inline void bank_trade(Game *g) {
    for (int k=0;k<RESOURCES;++k) g->bank[k]=clamp_int(g->bank[k],0,g->bank_max);
    g->trade_ok=0;
    if(g->actor<0 || g->actor>=g->player_count || g->departed[g->actor])return;
    for(int k=0;k<RESOURCES;++k) {
        if(g->give[k]<0 || g->take[k]<0 || g->hand[g->actor][k]<g->give[k]
            || g->bank[k]<g->take[k])return;
    }
    for(int k=0;k<RESOURCES;++k) {
        if(g->give[k]<=0)continue;
        g->hand[g->actor][k]-=g->give[k];
        g->bank[k]=clamp_int(g->bank[k]+g->give[k],0,g->bank_max);
    }
    for(int k=0;k<RESOURCES;++k) {
        if(g->take[k]<=0)continue;
        g->bank[k]-=g->take[k];
        g->hand[g->actor][k]+=g->take[k];
    }
    g->trade_ok=1;
}
HEX_HD inline void step(Game *g) {
    if (g->op == 0) production(g);
    else if (g->op == 1) bank_trade(g);
}
} // namespace hex_exact
#endif
