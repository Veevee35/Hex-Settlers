#include "hex_exact_common.h"
#include <cstdio>
#include <cstdlib>
#include <vector>
#include <stdexcept>
#include <string>

using namespace hex_exact;
static void process(const char *in, const char *out) {
    FILE *r = std::fopen(in, "rb");
    if (!r) throw std::runtime_error("Cannot open input");
    Header h{};
    if (std::fread(&h, sizeof(h), 1, r) != 1 || h.magic != FILE_MAGIC ||
        h.version != FILE_VERSION || h.bytes_per_game != sizeof(Game) || h.count > 65536) {
        std::fclose(r); throw std::runtime_error("Invalid format/version/size/count");
    }
    std::vector<Game> games(h.count);
    if (std::fread(games.data(), sizeof(Game), h.count, r) != h.count) {
        std::fclose(r); throw std::runtime_error("Truncated fixture input");
    }
    if (std::fgetc(r) != EOF) {std::fclose(r); throw std::runtime_error("Trailing data");}
    std::fclose(r);
    for (Game &g : games) {
        if (g.player_count < 1 || g.player_count > MAX_PLAYERS ||
            g.tile_count < 0 || g.tile_count > MAX_TILES || g.bank_max < 1 || g.bank_max > 40 ||
            (g.op != 0 && g.op != 1) || g.roll < 2 || g.roll > 12) throw std::runtime_error("Invalid game size");
        for (int i = 0; i < g.tile_count; ++i) {
            if (g.tiles[i].corner_count < 0 || g.tiles[i].corner_count > MAX_CORNERS)
                throw std::runtime_error("Invalid corner count");
        }
        step(&g);
    }
    FILE *w = std::fopen(out, "wb");
    if (!w) throw std::runtime_error("Cannot open output");
    bool ok = std::fwrite(&h, sizeof(h), 1, w) == 1 &&
        std::fwrite(games.data(), sizeof(Game), h.count, w) == h.count;
    if (std::fclose(w) || !ok) throw std::runtime_error("Failed to write output");
    std::printf("[exact-cpu] %u independent selected authoritative transitions executed\n", h.count);
}
int main(int argc, char **argv) {
    try {
        if (argc != 3) throw std::runtime_error("Usage: hex_exact_cpu INPUT.bin OUTPUT.bin");
        process(argv[1],argv[2]); return 0;
    } catch (const std::exception &e) {
        std::fprintf(stderr,"[exact-cpu] ERROR: %s\n",e.what()); return 1;
    }
}
