FROM debian:bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends cmake g++ make libcurl4-openssl-dev libssl-dev nlohmann-json3-dev libboost-dev
WORKDIR /src/native/hex-server
COPY scripts/cuda-exact/hex_exact_common.h /src/scripts/cuda-exact/
COPY native/hex-server/CMakeLists.txt native/hex-server/state_restore.cpp native/hex-server/setup_turn.hpp native/hex-server/test_setup_turn.cpp native/hex-server/main_turn.hpp native/hex-server/test_main_turn.cpp native/hex-server/turn_replay.cpp native/hex-server/replay_actions.hpp native/hex-server/replay_service.hpp native/hex-server/session_cookie.hpp ./
RUN cmake -S . -B /build -DCMAKE_BUILD_TYPE=Release && cmake --build /build --parallel && ctest --test-dir /build --output-on-failure

FROM debian:bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends libcurl4 libstdc++6 ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && install -d -o 65534 -g 65534 -m 0700 /snapshots
COPY --from=build /build/hex_state_restore /build/hex_turn_replay /usr/local/bin/

FROM runtime AS test
RUN apt-get update && apt-get install -y --no-install-recommends python3
COPY native/hex-server/test_state_restore.py /test_state_restore.py
USER 65534:65534
ENTRYPOINT ["python3", "/test_state_restore.py"]

FROM runtime
USER 65534:65534
ENTRYPOINT ["hex_state_restore"]
CMD ["/snapshots/current"]
