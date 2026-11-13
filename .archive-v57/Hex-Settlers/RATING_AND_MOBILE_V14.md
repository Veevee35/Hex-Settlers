# Hex Settlers v14 — Rating Management, Mobile Controls, and Flexible Ranked Matchmaking

## Gameplay overlays
- `EXTRA TURN` and `YOUR ROLL` are now both centered over the actual board area rather than the full window. On mobile, both use the center of the full-width board.

## Mobile / touch
- Board occupies the full available game viewport by default on screens up to 900px, and on coarse-pointer tablets up to 1180px.
- Bottom controls: **Actions** opens the game-tools menu, **Fit Board** recenters the map, **Game Panels** opens a scrollable bottom sheet with Resources, Game Log, and Development Cards.
- Game Panels closes independently, so the entire screen does not stay permanently divided between board and stats.
- Increased touch target sizes, safe-area padding, scrollable HUD buttons, fixed small-screen placement even when an earlier desktop dragging position was saved, and mobile account-orb placement.
- Existing pinch/drag board gestures and mouse desktop layout remain in place.

## Admin: Rating Management
- Sign in as an administrator. Open the account orb, then **Rating Management**.
- Adjust K factor, Elo rating scale, bonus/penalty cap, winner and non-winner bonuses, and **38 separate per-event game measurements** (buildings, boats, exploring, dice, card play, resource flow, steals, etc.). Values can be negative or positive; default performance weights are 0, preserving the original K=32 winner/loser Elo.
- **Save Weights for Future Games** persists the new configuration on the Node backend. Every ranked match locks the policy active at that match's start. Unranked games never change ratings.
- **Preview Past Ranked Games** simulates a full re-rating without changing stored records. Starting from 1000 for each account, it processes the retained, explicitly ranked, completed match archive chronologically. A projected leaderboard shows how the chosen weights would affect current ratings.
- **Apply Historical Rebuild** requires an up-to-date preview and typing `RECALCULATE`. It saves a timestamped backup of all user, game-history, and policy data to the persistent DATA_DIR, then updates account ratings and recorded rating deltas in archived game summaries; it also updates any completed ranked rooms still active. It refuses to apply while ranked games or matchmaking queues are active, or if the archive changed after preview.
- The historical archive now retains up to 5000 entries **going forward** (previously 500). Games already trimmed by previous releases cannot be recovered by this code. Earlier builds that did not record the ranked/unranked flag cannot be accurately re-rated and are excluded.
- Rebuild does **not** modify win/loss, VP, or replay game data. Only ratings, rating policy, and rating-delta metadata change.
- Backup files contain private user data and must remain in the server's restricted DATA_DIR, never in publicly served assets.

## Ranked matchmaking
- Map choices: Classic, Seafarers, **Either — first available**.
- The queue is shared by requested player count. Players selecting Either are compatible with both Classic and Seafarers; other players still receive only their selected map. An eligible 4-, 5-, or 6-player group is matched within the existing rating spread; the selected map is set before launching the ranked game. Classic 5–6 continues to use classic56.

## Deploy
- Replace the Node backend and the Cloudflare public site assets together. The Cloudflare Worker continues to proxy `/ws` and `/api/*` to `UPSTREAM_ORIGIN`; it does not run the game backend or store the rating policy itself.
- Back up your existing persistent `users.json` and `game_history.json` before deploying.
- Do **not** copy admin rating backup files into the public static folder.

## Validation
- 203 non-integration regression tests passed, including seven new rating/matchmaking/mobile tests.
- Node syntax checks and TypeScript bootstrap compilation passed.
- Full Node-WebSocket server tests were **not** run: the supplied ZIP has no installed `ws` module and package install could not reach npm (DNS `EAI_AGAIN`). The frontend CSS was inspected but interactive mobile testing in a real phone browser remains recommended after deployment.
