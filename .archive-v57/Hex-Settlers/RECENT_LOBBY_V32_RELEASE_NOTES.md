# Hex Settlers v32 — Recent Lobby Recovery and Blank Board Fix

Based on the uploaded **Hex Settlers v31 Full Build**.

## New navigation behavior

- On a fresh load, accounts with a **server-confirmed room joined/active in the past five minutes** automatically switch to the unranked game screen and request an account-authenticated rejoin. A saved room code alone is no longer sufficient to cause automatic rejoining.
- The five-minute window uses an account-scoped `localStorage` record containing the user ID, room code and last-confirmed activity time. It updates when the server confirms membership, sends room/state updates, and during active websocket heartbeats. It expires at five minutes after the last activity.
- The Unranked Play button opens an **uncreated lobby** (create/join controls, no blank canvas). If there is an eligible recent room and the authenticated socket is ready, the client requests that room instead.
- The uncreated lobby centers its creation/join controls on desktop, hides the empty grey board and setup form, and uses full mobile width. Setup and map preview are shown again after successfully joining a room.
- When the room is unavailable, an automatic recovery is cancelled, the stored recent-room record is cleared, and the uncreated lobby remains visible.
- Old `hexsettlers_last_room_v1` values are still available to the manual rejoin button, but **never** trigger automatic room restoration.
- Entering an uncreated lobby removes `room`, `code`, and `spectator` query parameters using history replacement, retaining unrelated query parameters and the hash. Direct invite URLs continue to work and take priority over automatic recovery.
- Logging out, leaving a room, or returning to the game-type menu clears the automatic recent-room record. Finished games are not remembered as active lobbies.
- Server's authenticated `rejoin_room` operation now restores an **existing room membership only**; it no longer implicitly adds a new member when an old code happens to exist.

## Updated files

`public/app.js`, `public/styles.css`, `public/index.html`, `public/sw.js`, `server.js`, three existing cache-version regression tests, and new `test/recent-unranked-lobby-v32.test.js`.

## Validation

- `node --check public/app.js`: PASS
- `node --check server.js`: PASS
- New v32 tests: six passed
- Full test run: 291 total, 287 passed; four failures require the missing `ws` runtime package and were also present in v31. Live socket recovery remains to be checked against an actual running server.
- Updated the `recent-lobby-v32` cache key for stylesheet, client JS, and service worker.
