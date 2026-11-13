# Hex Settlers — Ranked match update v16

## Included improvements

- Player Stats subpages: Ranked Play, Unranked Play, and Combined. Ranked and Combined display rating and ranked position; Unranked hides both.
- Ranked matchmaker: one queue for four distinct accounts with rating-based search widening; a matched lobby presents three randomly chosen competitive scenarios, one vote per player. All four players vote; a tie for the lead is resolved randomly among the tied scenarios.
- The server does not assign Classic rules before the ballot. On completion, the chosen scenario's own server-defined default rules are applied at game start, including its victory target.
- Ranked settings are locked: Probability Corrected dice, Friendly Robber off, normal timers (60s setup / 30s main / 15s micro).
- Ranked rooms expose no player-host identity, reject kicks, game starts, settings and AI management, spectator-mode edits, and individual pause/resume requests. Back and End Game remain available as unanimous votes for active players. The ranked Back vote resumes automatically after unanimous approval.
- Postgame Ranked Rematch rejoins the same single ranked matchmaking queue. Ranked Main Menu exits the finished room and returns to the game-type selection screen. The client waits for server acknowledgement and resets its postgame controls.
- Increased asset-cache version to promote fresh browser assets.

## Deployment

This archive contains the application source, test suite, static assets and compiled bootstrap. It intentionally omits `.git`, `node_modules`, and training/simulation outputs. Install runtime dependencies using `npm ci --omit=dev` or all dependencies with `npm ci`, and start with `npm start` (or deploy using the existing hosting instructions).

If serving static assets through Cloudflare and WebSocket/API traffic through a separate backend, update both sides together to keep the client and server protocol in sync. This archive does not alter any deployed production instance.

## Validation

- `node --check server.js`
- `node --check public/app.js`
- `node node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/bin/tsc -p tsconfig.bootstrap.json` (local dev dependency)
- `node --test` — 242 passed, 0 failed (with the project's `ws` runtime dependency installed)

