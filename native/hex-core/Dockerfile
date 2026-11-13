FROM debian:bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends cmake g++ make
WORKDIR /src
COPY native/hex-core/CMakeLists.txt native/hex-core/*.cpp native/hex-core/*.hpp native/hex-core/
COPY scripts/cuda-exact/hex_exact_cpu.cpp scripts/cuda-exact/hex_exact_common.h scripts/cuda-exact/
RUN cmake -S native/hex-core -B /build -DCMAKE_BUILD_TYPE=Release \
    && cmake --build /build --parallel \
    && ctest --test-dir /build --output-on-failure

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends libstdc++6 \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /build/hex_rules_runner /usr/local/bin/
COPY --from=build /build/hex_inventory_runner /usr/local/bin/
COPY --from=build /build/hex_rules_selftest /usr/local/bin/
USER 65534:65534
CMD ["hex_rules_selftest"]
