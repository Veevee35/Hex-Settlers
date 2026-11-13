# Hex Settlers — Invite Lobby + Account Menu update

## Changes

1. Invites (`?room=ABCD`, with optional `&spectator=1`) now take priority over a previously saved Ranked Play choice. An invited player sees the login screen when necessary and then goes directly into the Unranked lobby; the room is joined automatically as soon as the authenticated WebSocket session is ready.
2. Invite joins take priority over the last-room auto-rejoin, so old locally remembered room codes cannot redirect an invite recipient into the wrong room.
3. A successful `joined` response shows the room lobby even if the tab was previously on a game-type selection screen.
4. The account orb menu now has **Player Stats** and **Game Log** directly above **Log Out**.
   - Player Stats opens the existing leaderboard.
   - Game Log opens the live in-game log during a game, or the saved-game history (and its replays/logs) otherwise.
5. Added five targeted automated regression tests. `npm run check` passed: 205 tests, 0 failures.

## Build / deploy

```bash
npm install
npm run check
npx wrangler deploy
```

The ZIP contains source, compiled bootstrap (`dist/`), tests, Cloudflare Worker configuration, and game assets. Dependencies are not bundled; install with `npm install`.

**Backend note:** The supplied project still uses `UPSTREAM_ORIGIN` in `wrangler.jsonc` as a proxy to its existing Node backend for API and WebSocket traffic. These UI updates do not migrate room persistence to Cloudflare Durable Objects. Set a working backend origin before deployment if the original upstream is no longer active; see `README_CLOUDFLARE.md`.
