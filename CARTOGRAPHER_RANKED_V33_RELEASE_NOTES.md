# Hex Settlers v33 — Cartographer ranked ballot and draft timer fix

## Ranked matchmaking
- Removed **Cartographer** (`cartographer_4_manual`) from the server-owned 4-player ranked scenario pool.
- Kept **Scattered Tiles** (`cartographer_4_random`) in the ranked pool, preserving the 3-option vote.
- Legacy unfinished ranked ballots are repaired on room restoration: Cartographer is replaced with an eligible ranked scenario and invalid Cartographer votes are discarded.
- Manual 4-player and 5–6-player Cartographer modes remain available to unranked hosts.

## Cartographer manual tile placement (both 4-player and 5–6-player)
- Each placed tile is a distinct timer segment keyed to the draft's placement index and current player.
- After a human fails to place a tile before their turn expires, the server auto-places **one tile for that player only**.
- The next player gets the full configured draft-placement timeout; subsequent placements do not inherit the previous expired timer.
- The clock also resets correctly after a manual placement, including repeat turns by the same player.
- Removed the redundant, unreachable manual draft timeout code block.
- Unrelated normal turn timeouts and AI auto-placement remain unchanged.

## Validation
- Ran the complete Node test suite: **316 tests passed; 0 failed**.
- New live-WebSocket integration tests verify a single timed-out tile does not cascade into all subsequent tiles in both 4-player and 5–6-player Cartographer games.
- `node --check server.js` and `node --check public/app.js` completed successfully.

## Deploy
- Deploy the updated build as usual. No new environment variables or database migrations are required.
- Current in-progress games are not forcibly converted to another scenario.
