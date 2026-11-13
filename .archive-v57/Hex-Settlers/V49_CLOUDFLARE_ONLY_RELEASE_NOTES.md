# Hex Settlers v49 — Cloudflare-only compatibility backend

Source: v48 Rules/Health/Security full build. Game rules, UI, generated maps, accounts, AI, rating logic, and WebSocket protocol retained.

## New hosting path

- New Cloudflare Worker `cloudflare/container-worker.mjs` with `HexGameContainer` Durable Object class, exported `ContainerProxy` egress bridge, static assets, and routes for `/api/*`, `/ws`, `/health`.
- One authoritative Cloudflare Container (`max_instances: 1`, `standard-1`) runs the original Node game. **No Railway proxy** is used by either new Wrangler config.
- Private R2 `STATE` binding persists `users.json`, `game_history.json`, `active_rooms.json`, `rating_policy.json`, `neural_ai_model.json`, admin backups, and custom textures.
- Cloudflare Container bootstrap restores all existing R2 state before accepting connections and fails closed if existing `users.json` is absent or corrupt.
- Large texture-template archive served from private R2 key `assets/texture-pack-template.zip`, avoiding Workers Assets' 25 MiB limit.
- Added local persistence health status, a readiness endpoint, and safe staging/production config separation. The root `wrangler.jsonc` defaults to **staging** to avoid accidentally replacing the live site.
- Windows PowerShell importer uploads a saved Railway volume into either R2 environment, with JSON validation, no printed secrets, and optional dry-run.

## Tests

- Existing Node gameplay, account, admin, map, security, and lobby regression suite preserved.
- Added tests for staging/production isolation, restored R2 JSON and textures, missing-account fail-closed boot, and R2 state bridge writes.
- **373 automated tests passed.** TypeScript build and JavaScript syntax checks passed.
- Cloudflare live deploy, Docker image build, outbound bridge, and a real multi-user Cloudflare Container have **not** been exercised in this environment (Docker/cloud account unavailable). Stage and validate before production; this is a **deployment candidate**, not a claim of a proven production cutover.

## Architecture distinction

A Cloudflare Container is **managed by a Durable Object**, but live lobby logic remains in the single Node server running inside the Container. This is not a full native per-lobby Durable Object rewrite. That larger rewrite would be necessary for serverless per-room scaling and strong transactional multi-room persistence. With a single game engine, never increase `max_instances` above one unless shared state and websocket routing are redesigned.

## Deployment

Use **`CLOUDFLARE_ONLY_DEPLOYMENT.md`**. Do not delete Railway until the new Cloudflare deployment has been fully tested using the final saved volume backup.
