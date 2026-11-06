# Hex Settlers — v20 (Game Exit and End Game Reliability)

## End Game / AI games

- Fixed an uncaught `ReferenceError` in the client End Game button: the click callback used `amSpectator`, a local variable that only exists inside `updateButtons()`. It now calls `amRoomSpectator()` so a player can actually propose an End Game vote.
- End Game proposal and response actions now reach the server even while an unranked match is paused (the server already permitted them). Ordinary game actions remain blocked while paused.
- The proposal displays a short request status until the authoritative server state arrives; the End Game modal then shows each player's vote and the server-controlled five-second unanimous countdown.
- End Game prompt deduplication is now scoped to each room. A new game's first vote (ID 1) no longer disappears because another finished room used vote ID 1.
- AI players still vote through the existing server AI handler, and any human can withdraw and restart the five-second grace window.

## Admin room closures / Main Menu

- An administrator closing a room now returns every connected room member to **Change Game Type** instead of leaving them on a blank board, with a visible closure notice.
- Post-game **Main Menu** in either ranked or unranked also returns to **Change Game Type**. It no longer reloads into the empty unranked game canvas or creates a new lobby.
- This shared exit path clears stale room state, previous-room auto-rejoin, post-game overlays, and vote modals. If a player's connection is already lost, the Main Menu button still returns locally to the game-type screen.

## Ranked Rematch

- Ranked **Rematch** now returns that player to the **Ranked Play** screen with **Start Matchmaking** available and **Cancel Matchmaking** hidden.
- The server no longer calls `enqueueRankedPlayer` on ranked Rematch; queue entry requires the player's next explicit click. Other players remain in the finished game's room until they leave independently.
- Unranked Rematch continues to create/join an opt-in private rematch lobby with the preceding game's AI participants.

## Verification

- Full `npm run check`: 255 passing tests, zero failures (includes TypeScript build, syntax checks, server integration tests, and new v20 navigation/click regression tests).
- Chromium client smoke run with a simulated server verified an actual End Game click sent `propose_endgame`, its modal appeared, admin-closure returned to the game-type screen with no stale modal, and ranked Rematch returned to the non-queued ready screen. No browser JavaScript exceptions were observed after the repair.
- The existing server integration test covers an unranked human-vs-AI End Game vote, proposer withdrawal/reapproval, and the full five-second completion window.

## Deployment

Deploy the new worker/server and public assets together. `index.html` and `sw.js` use a new v20 asset cache version to avoid older client JavaScript persisting after deployment. No production games, accounts, or ratings were modified as part of preparing this ZIP.
