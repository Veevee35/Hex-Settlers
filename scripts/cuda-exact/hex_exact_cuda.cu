// Compile on Windows: nvcc -O3 -std=c++17 -o hex_exact_cuda.exe hex_exact_cuda.cu
// Requires NVIDIA CUDA Toolkit. Actual CUDA GPU kernels, not CPU fallback.
#include "hex_exact_common.h"
#include <cuda_runtime.h>
#include <cstdio>
#include <cstdlib>
#include <stdexcept>
#include <vector>
using namespace hex_exact;
#define CUDA_CHECK(expr) do { cudaError_t e=(expr); if (e!=cudaSuccess) \
  throw std::runtime_error(cudaGetErrorString(e)); } while (0)

__global__ void step_production(Game *games, uint32_t n) {
    unsigned i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i < n) step(&games[i]);
}
static void run(const char *in, const char *out) {
    FILE *r=std::fopen(in,"rb"); if (!r) throw std::runtime_error("Input missing");
    Header h{};
    if (std::fread(&h,sizeof(h),1,r)!=1 || h.magic!=FILE_MAGIC ||
        h.version!=FILE_VERSION || h.bytes_per_game!=sizeof(Game) || h.count>65536) {
        std::fclose(r); throw std::runtime_error("Invalid input header");
    }
    std::vector<Game> host(h.count);
    if (std::fread(host.data(),sizeof(Game),h.count,r)!=h.count) {
        std::fclose(r); throw std::runtime_error("Truncated input");
    }
    if (std::fgetc(r)!=EOF) {std::fclose(r); throw std::runtime_error("Trailing data");}
    std::fclose(r);
    for (auto &g : host) {
        if (g.player_count<1 || g.player_count>MAX_PLAYERS || g.tile_count<0 ||
            g.tile_count>MAX_TILES || g.bank_max<1 || g.bank_max>40 || (g.op!=0 && g.op!=1) || g.roll<2 || g.roll>12)
            throw std::runtime_error("Invalid game shape");
        for(int i=0;i<g.tile_count;i++) if (g.tiles[i].corner_count<0 ||
            g.tiles[i].corner_count>MAX_CORNERS) throw std::runtime_error("Invalid tile shape");
    }
    Game *device=nullptr; size_t bytes=host.size()*sizeof(Game);
    CUDA_CHECK(cudaMalloc(&device, bytes));
    try {
        CUDA_CHECK(cudaMemcpy(device,host.data(),bytes,cudaMemcpyHostToDevice));
        int block=128, grid=(h.count+block-1)/block;
        step_production<<<grid,block>>>(device,h.count);
        CUDA_CHECK(cudaGetLastError());
        CUDA_CHECK(cudaDeviceSynchronize());
        CUDA_CHECK(cudaMemcpy(host.data(),device,bytes,cudaMemcpyDeviceToHost));
        CUDA_CHECK(cudaFree(device)); device=nullptr;
    } catch (...) {cudaFree(device); throw;}
    FILE *w=std::fopen(out,"wb"); if(!w) throw std::runtime_error("Output open failed");
    bool ok=std::fwrite(&h,sizeof(h),1,w)==1 &&
        std::fwrite(host.data(),sizeof(Game),h.count,w)==h.count;
    if (std::fclose(w) || !ok) throw std::runtime_error("Output write failed");
    std::printf("[exact-cuda] %u independent selected authoritative transitions on GPU\n",h.count);
}
int main(int argc,char**argv) {
    try {
        if (argc!=3) throw std::runtime_error("Usage: hex_exact_cuda INPUT.bin OUTPUT.bin");
        run(argv[1],argv[2]); return 0;
    } catch (const std::exception&e) {std::fprintf(stderr,"[exact-cuda] ERROR: %s\n",e.what()); return 1;}
}
