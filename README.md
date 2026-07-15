# Hex Settlers

Hex Settlers is a browser-based, server-authoritative hex strategy game. It supports account-backed online lobbies, classic and 5–6-player maps, multiple seafaring scenarios, spectators, game history, custom texture packs, and test/normal/expert/neural AI opponents.

## Run locally

Requirements: Node.js 20 or newer.

```bash
npm ci
npm run build
npm start
```

Open `http://localhost:3000`. Other devices on the same network can use `http://YOUR_LAN_IP:3000` when local firewall rules permit it.

For direct development against the JavaScript server, use `npm run start:legacy`. The production command starts the compiled TypeScript bootstrap, validates the environment, and then loads the same game server.

## Verify a change

```bash
npm run check
```

The check builds the bootstrap, runs unit and end-to-end server tests, and syntax-checks both large JavaScript entry points. The integration coverage exercises registration, lobby creation/join, expert tuning, chat, game start, private hand filtering, browser-cookie authentication, clean shutdown, and restart recovery.

## Runtime data

Set `DATA_DIR` to keep mutable data outside the repository. Railway uses `RAILWAY_VOLUME_MOUNT_PATH` automatically when a volume is attached.

| File | Contents |
| --- | --- |
| `users.json` | Account profiles, password hashes, hashed session tokens, and aggregate stats |
| `game_history.json` | Completed-game metadata and postgame snapshots |
| `active_rooms.json` | Recoverable lobby and active-game snapshots |
| `neural_ai_model.json` | Neural AI parameters and training metadata |

Writes are serialized and use atomic replacement. Clean shutdown flushes all four stores. Password hashing runs asynchronously, login attempts are rate-limited, browser sessions use HTTP-only same-site cookies, and ordinary WebSocket messages have a separate size limit from texture-pack uploads.

## Configuration

Copy `.env.example` into your hosting environment; the server does not load `.env` files by itself.

| Variable | Default | Purpose |
| --- | --- | --- |
| `HOST` | `0.0.0.0` | Listen address |
| `PORT` | `3000` | HTTP/WebSocket port |
| `DATA_DIR` | repository root | Local persistence directory |
| `HEX_TRUST_PROXY` | Railway-aware | Trust forwarded host, address, and TLS headers |
| `HEX_ALLOWED_ORIGINS` | same host | Comma-separated additional WebSocket/API origins; `*` allows all |
| `HEX_AUTH_ATTEMPTS_PER_MINUTE` | `12` | Password-auth limit per client address |
| `HEX_WS_MAX_PAYLOAD` | `50331648` | Transport ceiling needed by large texture packs |
| `AI_FAST` | off | Accelerated AI ticks for simulations only |

Expert AI weights also have optional `EXPERT_AI_*` environment overrides; see the defaults near the bottom of `server.js`.

## Project layout

- `server.js` — authoritative rules engine, lobby protocol, AI, HTTP and WebSocket runtime
- `server/` — tested security, persistence, protocol, configuration, rule-default, cookie, and room-snapshot modules
- `public/` — browser client and game assets
- `src/server.ts` — production bootstrap
- `src/shared/protocol.ts` — shared protocol vocabulary for incremental typing
- `scripts/` — playable-map simulations and expert/neural training utilities
- `test/` — unit and live-server compatibility tests

## Desktop releases

The Electron wrapper opens the hosted game at `https://hexsettlers.up.railway.app/`.

```bash
npm run electron:dist -- --linux AppImage
```

Use `--win nsis` or `--mac dmg` on those platforms. Pushing a `v*` tag triggers the release workflow for Linux, Windows, and macOS.

See [README_RAILWAY.md](README_RAILWAY.md) for deployment and [README_TYPESCRIPT_MIGRATION.md](README_TYPESCRIPT_MIGRATION.md) for the migration boundary.
