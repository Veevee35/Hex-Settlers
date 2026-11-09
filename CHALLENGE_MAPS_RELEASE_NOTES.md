# Weekly Challenge Maps

## What's new

- **All Games → Challenge Maps** replaces the former Challenge of the Day placeholder, with the requested two-line description.
- Five Scattered Tiles maps (4, 5, 6, 7 and 8 players), each displayed with a board preview, Create Lobby button and its own leaderboard.
- Map rotation is Monday at **1:00 AM America/Chicago**, including daylight-saving changes. Every room made for a given week and player count uses the exact same seeded board tiles, numbers, and ports. Existing rooms retain their original weekly board.
- Challenge rooms are private (never shown in public discovery), with normal room codes, invite links and friend invitations.
- Rules are locked at the scenario's defaults except for **Balanced Bag** dice. **Expert AI** fills all seats from the moment of room creation; a human joining before game start replaces one AI, and a departing human is replaced by an AI. The lobby remains at 4/5/6/7/8 total occupants as appropriate.
- Challenge games are **Unranked**, not Casual: games, results, and player stats are recorded in normal Unranked and Combined statistics; ranked rating remains untouched.
- Leaderboards show each account's best victory point score for that week's map, breaking ties by more wins, then the fewest turns; they also show wins and number of games. AIs are omitted from rankings. Display is capped at the top 25 humans for each map.

## Verification

- Unit and compatibility tests cover weekly rollover (winter/summer), deterministic generation, persistent room challenge IDs, WebSocket protocol and the revised portal.
- A runtime server harness confirmed all five Scattered Tiles sizes, matching tiles and ports between preview and start, expert AI seats, AI replacement on join/leave, and private discovery filtering.
- Existing full WebSocket integration suite requires installation of the project's `ws` npm dependency; the uploaded source did not contain a `node_modules` installation.

## Deployment

Copy the unzipped project contents into the existing Hex Settlers GitHub repository and deploy using the already configured Cloudflare GitHub workflow. Keep the existing R2 state bucket and secrets; no state reset or migration is required. After deployment, use **All Games → Challenge Maps** to inspect the week's maps and create a challenge lobby.
