# Hex Settlers V67 — small-group beta hardening (80–150 participants)

## What was changed

- `HEX_BETA_MAX_CONNECTIONS` defaults to **250 WebSocket sessions** for a single authoritative Node process. This is an admission ceiling, **not** a benchmark or guarantee of supported game concurrency. When full, upgrades return HTTP 503 with `Retry-After: 15` instead of accepting an unbounded number of peers.
- `HEX_WS_BACKPRESSURE_BYTES` defaults to **4 MiB**. Sockets with backed-up outbound writes are closed with code 1013 so reconnect logic can recover, preventing continuously stalled recipients from using unlimited memory.
- `/health` now reports `betaCapacity` (websocketLimit / availableSlots). `/api/admin/health` reports the same under `connections` alongside existing CPU, event-loop, memory, and room telemetry.
- The Cloudflare container propagates the beta capacity settings, and all Wrangler configs include explicit defaults.
- Regression coverage is in `test/beta-admission.test.js`.

## What this does NOT prove

- The shared ChatGPT recommendation URL was not accessible for full content review. These improvements were inferred from the requested beta objective; they do not claim to implement every recommendation in that conversation.
- This is **one authoritative container** with `max_instances: 1`. Do **not** raise `max_instances` on the existing codebase: separate instances will divide room ownership and persisted data. Scaling horizontally requires an architecture redesign, sticky routing, and shared authoritative room coordination.
- 250 simultaneous sockets are not 250 active AI/game simulations. Game complexity, number of lobbies, AI turns, state broadcast sizes, and persistence throughput must be load tested on your actual paid Cloudflare container.
- No live deployment, R2 backup, or real 150-person load test was performed.

## Beta launch checklist

1. Back up `state/users.json`, `state/active_rooms.json`, `state/game_history.json`, `state/game_analytics.json`, ratings and AI models in R2 **before deploying**.
2. Deploy to staging using your existing GitHub workflow. Verify `/health` reports `persistence.healthy = true` and `betaCapacity.websocketLimit = 250`.
3. Open 2–4 real games and verify reconnect after toggling airplane mode, switching tabs, and reconnecting after a container restart. Confirm challenge score entries are not duplicated.
4. Verify public visitors cannot reach `/api/admin/*`, private administrator assets, or the `/ready` endpoint via Worker routing.
5. Load test with **only your own staging endpoint**, slowly increasing 20 → 50 → 80 → 120 → 150 authenticated users. Include active dice, trades, chat, and AI turns rather than merely idle sockets. Watch event-loop p99, CPU, RSS, R2 writes, reconnection rates, and HTTP 503s in the admin dashboard and Cloudflare logs.
6. If event-loop p99 consistently exceeds 200 ms, game actions lag, R2 synchronization fails, or connection refusal begins below the expected tester count, halt increases and diagnose the bottleneck.
7. Keep `max_instances: 1` and `ALLOW_EMPTY_DATABASE: 0`; maintain a rollback build and R2 snapshots. Do not run mass simulated training on the same instance during the beta.
8. Roll out in waves (20, 50, 80, then 150 testers) after successful real-game and persistence validation.

## Local validation

`npm ci && npm run check` (downloads dependencies on a machine with npm access). Alternatively `node --test test/beta-admission.test.js test/security.test.js test/cloudflare-worker.test.mjs` tests the self-contained protections without installing dependencies.
