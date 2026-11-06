# Ranked Rating Season Reset (v13)

## What changed

- **Player Stats** replaces the `Res+` and `Res-` columns with a single sortable **Rating** column. Registered users appear at 1000 even before their first game.
- **Postgame Game Overview** displays each player's rating result below the eight existing gameplay metric tiles. Example: `Rating: 1024 (+24)`. On an unranked game, it says `Unranked · Rating change: 0`.
- **Saved Game History** records each ranked match's rating before, delta, and after for every eligible player. Historical games from before this update are labeled as **Prior season · Unrated** because no rating deltas were recorded for them.
- **Account profiles, the ranked mode screen, and the ranked matchmaking queue** use the same stored rating, rather than a formula derived from lifetime wins and losses.
- **Only games launched by ranked matchmaking** update ratings. Private lobbies, invitations, unranked games and rematch rooms are unrated. Ranked rooms retain their status when saved and restored after a server restart.

## Rating calculation

All accounts start the season at **1000**. At the end of an eligible ranked game, the server calculates multiplayer Elo-style expected win probabilities using a 400-point rating scale and **K=32**. The winner receives the first-place outcome; other players receive a loss. Signed rating changes are rounded while keeping the net number of points unchanged (except when a score would fall below zero).

For example, with four 1000-rated players, the winner gains **+24** and each other player loses **−8**. More highly rated favorites gain fewer points for winning than underdogs.

## Automatic migration and deployment

The **first start of this backend build against an existing `users.json`** performs a one-time reset of *every* registered account's `rankedRating` to 1000. It writes `rankedRatingSeason: 1` to the users database to prevent future server restarts from resetting earned ratings. The reset preserves passwords, user accounts, friendships, and lifetime game stats. Existing saved game histories remain available but do not change the new season's ratings.

**Deploy both the Node game backend and the Cloudflare static frontend.** In this packaged version, `cloudflare/worker.mjs` still proxies `/ws` and `/api/*` to the backend via `UPSTREAM_ORIGIN`. Deploying only the Cloudflare Worker does not run the ratings migration or server scoring changes.

Back up the existing persistent `users.json` before deploying if you may need the old state. No production database files are included or modified in this ZIP.

## Validation

- 196 runnable non-integration tests passed, including nine new ranked-rating tests.
- Node syntax checks and TypeScript bootstrap compilation passed.
- The dependency-backed server/integration tests could not run in the packaging environment because `ws` was not installed (package installation did not complete). To run the full suite after installing dependencies: `npm ci && npm run check`.
