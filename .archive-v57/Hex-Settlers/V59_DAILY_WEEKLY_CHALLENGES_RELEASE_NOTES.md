# V59 – Daily / Weekly Challenge Maps, History & Tutorial

Base: V58 Live Engine Tutorial.

## Challenge rotation

- Challenge Maps has **Weeklys** and **Dailies**, with five board-size tabs (4–8 players) in each.
- One scenario **family** is drawn deterministically for each reset, and its supported four-, five-/six-, or seven-/eight-player variant is used for every capacity. Families: Classic, Islands, Through the Desert, Fog Island, and Scattered Tiles. Manual Cartographer is excluded. The previously established Scattered Tiles map uses the engine's existing `cartographer_*_random` internal keys at 4–6 seats, not the manual Cartographer scenario.
- Every map has a server-determined fixed layout for that period and seat count. The exact lobby preview is reused at start, including tile types, numbers and ports.
- Weeklys rotate Monday at 1:00 a.m. America/Chicago and retain shared private lobbies where players can replace Expert AI seats. Dailies rotate **every day at 1:00 a.m. America/Chicago**, accounting for CST/CDT.
- Daily: one human with Expert AI filling every remaining seat. Other human players **and spectators** cannot join via link or room code. One total Daily attempt per account per daily period (not one attempt per seat count). The attempt is recorded when the match starts, not when the lobby opens. Refresh/rejoin of the active match is allowed. Outdated pre-start lobbies cannot start after rotation.
- Server leaderboard continues to use best qualifying human WIN by lowest turns, then lowest time, then lowest VP. Daily and weekly records are separated by period and capacity; older weekly records remain readable.

## History & player stats

- Game History: **Challenge Maps**, **Ranked**, **Unranked** nested tabs.
- Player Stats: **Challenge Maps** alongside Ranked, Unranked, Combined.
- Both Challenge Maps explorers have capacity tabs for 4–8, Weeklys/Dailies tabs, an independent friends-only filter, live player/room search, date window (all, 7, 30, 90 days, custom From/Through).
- Player Stats challenge table supports sortable Player, Lowest Time, Lowest Turns to Win, Total VP earned, and Period headers. Ranking labels remain the official lowest-turns → time → VP order even after table sorting.
- Challenge Game History cards provide saved summary and replay navigation where a replay exists.
- New authenticated `get_challenge_archive` protocol message retrieves archive metadata without full snapshots or logs.

## Walkthrough

- Drag the live tutorial guide by its header with mouse, pen or touch. Guide position remains within the viewport.
- Explicitly choosing **Exit tutorial & unlock** on the first playthrough sets the authenticated account's tutorial completion flag, unlocks the other modes, and exits the room. Simply disconnecting or refreshing does not count as an intentional skip.

## Validation

- `tsc -p tsconfig.bootstrap.json` passed.
- 25 focused challenge-map, leaderboard, tab layout and live onboarding tests passed.
- Full `node --test`: 400 passed / 17 failed. Most failures are integration tests requiring the `ws` dependency unavailable in this offline environment; three old recent-lobby tests also report failures. **Live WebSocket, Cloudflare Durable Object, R2 persistence, and browser UI interactions have not been end-to-end verified here.** Deploy to staging first, test the rollover and reconnect behavior, then promote to production.

## Deployment

Run the existing GitHub-to-Cloudflare build/version pipeline. No new environment variables, database schema migration, or new storage buckets are required. Existing user records gain `dailyChallengeAttempts` when they launch their first daily match; the active-room restore format recognizes daily challenge identity.
