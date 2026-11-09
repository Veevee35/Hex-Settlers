# Challenge Maps — Leaderboard Update

The Challenge Maps leaderboard now displays four sortable columns, in this order:

1. **Player** — the account name, prefixed with that player's permanent official rank (e.g., `#3`).
2. **Lowest Time** — the elapsed wall-clock time of that player's best completed challenge win, measured from actual game start to game end and displayed as `M:SS.mmm` or `H:MM:SS.mmm`.
3. **Lowest Turns to Win** — number of turns to victory in that same game (the engine's zero-based `turnNumber` plus one to match the on-screen turn number).
4. **Total VP earned** — the final VP of that same winning game, **not** a sum over multiple attempts.

**Official rank:** ascending turns → ascending elapsed time → ascending final VP → alphabetical account name/ID for deterministic ties. The server selects each user's best *winning run* by this hierarchy, then returns the top 25 accounts per map for the active week. A player's columns all describe one particular completed victory, not a combination of results from different attempts. Non-winning results, AI players, and unanimously voted early endings are not leaderboard wins.

**Clickable sorting:** each of the four column headings toggles ascending/descending order. Sorting is per map and per week and remains active when the server refreshes the weekly catalog. The displayed `#` rank next to each player is the official ranking and does not change when a reader sorts by another category. Empty/missing time values display `—` and sort last. The default is the official turn-first order.

**Data / deployment:** uses existing game-history `startedAt`, `endedAt`, `turns`, `winnerId`, `players[].vp`, and `snapshot.stats.endedReason` fields. No schema change, database reset, additional Cloudflare bindings, or new admin setup is necessary. Upload this complete project version to the existing GitHub repository for your Cloudflare Worker deployment.

**Verification:** `node --test test/challenge-leaderboard.test.js test/challenge-maps.test.js` tests the score hierarchy, best-run selection, filtering, missing times, deterministic ties, map rotation, and accessible sortable UI wiring. `node --check public/app.js` and `node --check server.js` provide syntax validation.
