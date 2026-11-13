#include "hex_rules_core.hpp"
#include <cstdio>
#include <cstdlib>
#include <vector>
#include <stdexcept>
using namespace hex_rules;
int main(int argc, char **argv) {
  try {
    if (argc != 3) throw std::runtime_error("Usage: hex_rules_runner INPUT.bin OUTPUT.bin");
    FILE *in = std::fopen(argv[1], "rb");
    if (!in) throw std::runtime_error("Cannot open test input");
    Header h{};
    if (std::fread(&h,sizeof(h),1,in)!=1 || h.magic!=MAGIC || h.version!=VERSION ||
        h.bytes_per_state!=sizeof(State) || h.count<1 || h.count>10000) {
      std::fclose(in); throw std::runtime_error("Invalid binary fixture header");
    }
    std::vector<State> states(h.count);
    if (std::fread(states.data(),sizeof(State),h.count,in)!=h.count || std::fgetc(in)!=EOF) {
      std::fclose(in); throw std::runtime_error("Truncated or oversized fixture");
    }
    std::fclose(in);
    for (State &s : states) if (hex_cpp_step(&s)) throw std::runtime_error("Invalid game fixture");
    FILE *out = std::fopen(argv[2], "wb");
    if (!out) throw std::runtime_error("Cannot open output");
    bool written = std::fwrite(&h,sizeof(h),1,out)==1 &&
                   std::fwrite(states.data(),sizeof(State),h.count,out)==h.count;
    if (std::fclose(out) || !written) throw std::runtime_error("Failed to write results");
    std::printf("[hex-rules-core] %u scoring/route-title state transitions\n",h.count);
    return 0;
  } catch (const std::exception &ex) {
    std::fprintf(stderr,"[hex-rules-core] ERROR: %s\n",ex.what());
    return 1;
  }
}
