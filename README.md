# Hex Settlers

Hex Settlers is a real-time, Catan-style browser game with account-based lobbies, authoritative WebSocket gameplay, AI players, and Classic and Seafarers maps. Player capacity is 2–6 depending on the selected map; the Seafarers test-builder scenario also supports solo play.

## Run locally

Requirements: Node.js 20 or newer.

```bash
npm ci
npm run build
npm start
```

Open `http://localhost:3000`. Other players on the same network can use `http://YOUR_LAN_IP:3000`.

For development, `npm run start:legacy` starts the same authoritative implementation without the TypeScript bootstrap.

## Gameplay and lobby features

- Account registration and persistent login
- Four-letter lobby codes, direct-join links, spectators, chat, rematches, and host controls
- Classic 3–4-player and Classic 5–6-player boards
- Seafarers scenarios: Four Islands, Six Islands, Through the Desert, Fog Island, Heading for New Shores, Cartographer, and Scattered Tiles
- Server-controlled AI with test, easy, medium, hard, and Catanatron modes
- Roads, ships, settlements, cities, ports, bank/player trades, robber, pirate, and discard-on-seven
- Development cards, Largest Army, Longest Road, configurable victory targets, and paired turns on 5–6-player maps
- Timers, pausing, game history, leaderboards, postgame statistics, sound effects, accessibility controls, and custom texture packs

This is an independent Catan-style game and is not an official implementation or affiliation.

## Architecture

- `dist/server.js` — compiled TypeScript deployment bootstrap
- `src/server.ts` — environment validation and startup checks
- `server.js` — authoritative rules, room coordination, AI, HTTP, and WebSocket orchestration
- `server/` — extracted protocol, security, persistence, configuration, room-recovery, and shared-rule modules
- `src/shared/protocol.ts` — compile-time client/server message contract
- `public/app.js` — browser UI, canvas renderer, networking, audio, and texture packs
- `public/index.html` / `public/styles.css` — application markup and styling
- `electron-main.js` — optional desktop wrapper for the hosted game

The server validates every game action and sends a per-viewer state snapshot. Opponents' resource details, development cards, private events, and unrevealed fog tiles are removed before transmission.

## Persistence and sessions

The data directory is selected in this order:

1. `RAILWAY_VOLUME_MOUNT_PATH`
2. `DATA_DIR`
3. Repository root

It contains:

- `users.json` — accounts, password hashes, hashed session records, and aggregate stats
- `game_history.json` — up to 500 completed games and postgame snapshots
- `active_rooms.json` — reconnectable lobby and active-game snapshots

Writes are queued and atomically renamed. Active rooms are restored after a restart and are removed after eight hours without a connected player. Browser sessions use an HTTP-only, same-site cookie; legacy local-storage tokens are exchanged once and removed.

## Configuration

See `.env.example`. Important settings include:

- `PORT` and `HOST`
- `DATA_DIR`
- `HEX_ALLOWED_ORIGINS` for additional browser origins
- `HEX_AUTH_ATTEMPTS_PER_MINUTE` for password-auth throttling
- `HEX_WS_MAX_PAYLOAD` for the WebSocket ceiling; the default accommodates custom texture packs
- `HEX_TRUST_PROXY`, enabled automatically on Railway, for forwarded client addresses

## Verification

```bash
npm run check
```

The check command compiles TypeScript, runs unit and integration tests, and syntax-checks the server and browser application. The integration suite covers legacy WebSocket compatibility, HTTP-only browser sessions, private state filtering, and active-room recovery after restart.

## Internet hosting

The server serves the browser application and WebSocket endpoint from one port. It can be exposed with a tunnel, port forwarding, or a Node hosting provider. Production deployments should use HTTPS and persistent storage. Railway-specific notes are in `README_RAILWAY.md`.

## Electron releases

The Electron wrapper opens `https://hexsettlers.up.railway.app/`. Build an installer with:

```bash
npm run electron:dist -- --win nsis
```

Use `--mac dmg` or `--linux AppImage` for other platforms. Pushing a `v*` tag runs `.github/workflows/electron-release.yml` and publishes installers to the GitHub release.
