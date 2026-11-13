# Hex Settlers v25 — Global Unranked Rating

## What's new

- Separate **Unranked Rating**, cumulative and signed, starting at **0** for new accounts. This is independent of ranked Elo (which still begins at 1000).
- Every completed *unranked* match can add or subtract points, including matches against AI. Ranked matches cannot affect the unranked score. The same completed game is applied only once.
- Rating data is stored on the server in persistent user records, not in the player's browser. Players can go below zero without a floor.
- The Player Profile now shows **Ranked Rating** and **Unranked Rating** side by side, including on mobile.
- Player Stats gains an Unranked Rating column, sorted by this rating under Unranked Play; Combined shows both values. The game's result summary also shows unranked rating changes when available.
- Archived unranked and pre-split games are included in a **one-time migration**, provided they still exist in `game_history.json`. The migration is version-marked to prevent points being counted again on subsequent restarts. Previously pruned/lost history cannot be recovered by this release.

## Per-game scoring

The rating is **the sum of every unranked game's signed score**. Each game has a base participation cost of **−45**, plus a **+120 victory bonus** for the winner. The bonus is by far the largest single individual component. Each player's performance then changes the score:

| Aspect | Points |
| --- | ---: |
| Victory points | +6 each (up to 20 VP) |
| VP lead over the strongest opponent | +2 per point of lead, or −2 per point behind (capped ±15 VP) |
| Roads / Ships | +1 each (up to 20 of each) |
| Ship moves | +0.25 each (up to 20) |
| Settlements / Cities built | +3 / +5 each (up to 10 each) |
| Exploration VP | +4 each (up to 10) |
| Knights played | +1 each (up to 20) |
| Dev cards bought / played | +0.75 / +1.5 each (up to 20 each) |
| Bank / Player trades | +0.25 / +0.75 each (up to 25 each) |
| Robber / Pirate moves | +0.3 each (up to 30 each) |
| Robber / Pirate steals | +2 each (up to 20 each) |
| Being stolen from | −1.5 each (up to 20) |
| Discard events | −2 each (up to 20) |
| Resources produced / spent on builds | +0.12 / +0.1 each (up to 100 each) |
| Gold resources produced | +0.1 each (up to 30) |
| Total resources acquired / lost | +0.05 / −0.04 each (up to 120 each) |
| Production blocked | −0.3 each (up to 30) |
| Turns taken | −0.25 each (up to 60) |
| Held Longest Road / Largest Army at finish | +10 each |
| Monopoly / Invention / Road Building dev cards played | +1 each (up to 10 each) |

Individual stat contributions are capped to avoid inflating scores by endlessly trading or building. Game score is rounded to the nearest integer. Dice luck is not directly rewarded or penalized; real game performance is.

Example: A low-VP loss can award fewer than zero points, lowering a player's cumulative Unranked Rating. A first-time player who loses badly can have a negative Unranked Rating.

## Deployment and data safety

1. **Back up `users.json` and `game_history.json` from your server's persistent `DATA_DIR`** before updating. Historic migration writes to both files exactly once. They must persist across deploys.
2. Deploy both `server.js` and `server/unranked-rating.js` on the game backend; deploy the updated `public/` assets to Cloudflare. The Cloudflare Worker proxies `/api/*` and `/ws` to the configured game backend.
3. Do not delete either persistent file or change user IDs during the upgrade. The existing ranked Elo and rating-policy settings remain separate.

## Validation

- `node --check server.js`, `node --check public/app.js`, and the new rating module passed.
- Five v25 rating tests passed, including history migration, score sign, AI exclusion, ranked exclusion, duplicate-count prevention, and profile/leaderboard plumbing.
- Full dependency-independent suite: 255 passed; 3 tests require the `ws` dependency not installed in the uploaded ZIP's source environment. Full backend-WebSocket tests were not verified here.
- Chromium rendering verified the profile badges at 390px and 1200px widths without horizontal overflow.
