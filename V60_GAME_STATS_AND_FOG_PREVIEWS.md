# V60 — Admin Game Stats, Challenge Fog Previews, and Header Layout

## What changed

### admin.hexsettlers.org → Dashboard → Game Stats

Added a default Game Stats tab with:

- Live unique connected accounts, browser connections, distinct human players, connected spectators, AI seats, active/paused games, waiting lobbies, public/private lobby counts, and ranked matchmaking queue.
- Period selectors: last 24 hours / 7 / 30 / 90 days. Dashboard polls every 20 seconds and can be refreshed manually.
- Interactive-readable SVG time-series charts: online users and occupied seats; games, lobbies and matchmaking; daily account activity and completed games; lobby occupancy by game mode.
- Peak concurrent users / active games, number of unique active accounts, completed games, number of participating humans, new registrations, average completion duration, average turns, total victory points, and common scenarios.
- A live room inventory showing phase, mode, player occupancy, online seats, spectators, privacy, scenario and most recent activity. Hover over a row to see its players and their connection status.
- Admin-authenticated HTTP endpoint `POST /api/admin/game-stats` hosted only on the management subdomain. All existing admin session, origin and rate protections apply.

### Telemetry retention and persistence

- New private `game_analytics.json` file stored in `DATA_DIR` and mirrored to the Cloudflare R2 state bucket via the existing container state bridge. Bootstrap restores it on redeploy.
- A concurrency sample is recorded every five minutes. Samples cover seven days, with hourly peaks retained for 90 days. A fresh instantaneous reading is displayed regardless of the last stored sample.
- Daily distinct active users and 90-day last-seen activity are recorded from authenticated game connections; account IDs are SHA-256 pseudonyms in telemetry, and no IP addresses or session tokens are collected.
- The stored game history supplies all pre-deployment completed-game time series, subject to the existing 5,000-game archive limit. Historical user concurrency cannot be reconstructed before this instrumentation goes live.
- Casual play remains deliberately excluded from long-term game-history statistics, in accordance with the existing Casual rules. Live Casual room counts are still shown.
- No new environment variables or Cloudflare service bindings are needed; the existing R2 state bucket gains an additional allowlisted JSON filename.

### Challenge map previews

- Both Daily and Weekly preview catalog payloads now use the `unexplored` type and a null number for each unrevealed fog tile, matching the in-game hidden state.
- Client mini-map draws face-down fog with a distinct hatch overlay and never draws its hidden number token.
- Actual challenge map seeds, gameplay fog exploration, and persistent leaderboard order are unchanged.

### Challenge Maps header

- Removed the logo and eyebrow visually on the challenge page only.
- Left-aligned the Challenge Maps title, placed the description on the right, and preserved the Back button and mobile stacking layout.
- Other game entry screen headers retain their normal logo and styling.

## Deployment and verification

Deploy this project through the existing GitHub → Cloudflare pipeline. The Dockerfile already copies the complete `server/` and `public/` folders, including the new analytics module and CSS changes. The analytics data starts accumulating immediately after the server starts and is accessible through the admin-only dashboard. The Cloudflare build versioning workflow is unchanged.

Targeted V59/V60 challenge and management routing tests passed (17/17). `node --check` succeeded for `server.js`, the analytics module and `public/app.js`. A full test run in this isolated build environment could not complete server-based integration cases because `ws` could not be installed here; three old recent-lobby tests also fail against the original, unmodified V59 archive.
