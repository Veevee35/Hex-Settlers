# Hex Settlers v53 — Journey, Public/Private Rooms, Casual Multiplayer and Release Versioning

Based on the uploaded working v52 ZIP. All changes target the existing **hex-settlers-cloudflare-staging** Worker and **hex-settlers-state-staging** R2 bucket. The ZIP contains source files only: no production account DB, credentials, `.env`, `node_modules`, or historical AI training output.

## Visible build version / deployment counter

- The login and game-mode pages show **only** `Vmajor.minor.patch`. The Git SHA is not shown in the version text.
- Browser cache keys still use the Git SHA to refresh client assets after a push.
- A new release is identified by a successful Cloudflare game-container startup and a changed source revision. Once started, the Node server writes the updated counter to **`state/build-version.json` in the existing R2 bucket** through the existing private Cloudflare bridge. This is the *only* new persistent object; it does not overwrite existing user or game state files.
- Rebooting a container with the same revision does **not** bump the number; a failed build that never starts the new container does not bump it.
- For GitHub builds, the stamp script uses the Git commit revision. For a manual deployment without a Git stamp, the server computes a stable fingerprint of its game code and assets instead.
- Patch increments from 0 through 99, then rolls over to the next minor version with patch 0. Change `major` in `build-version.json` to begin a new major release; the first new build resets minor/patch to `0.0`.
- `/api/build-version` reports the deployed number, and the page loads it on startup. The committed fallback is `V1.0.5`; the first successful v53 deployment with a fresh revision should be `V1.0.6` if `state/build-version.json` has never been used. Actual results depend on stored version history.
- The number increments on **successful start of the newly deployed game code**, not on a Cloudflare build-log event by itself. This avoids numbering failed builds and survives server restarts.

## Game setup

- Changing Number of Players selects the corresponding available board size, carries across the same Seafarers scenario where a size variant exists, and restores default victory points, resource quantities, discard limit, dice algorithm, development deck, timer speed, Friendly Robber, and Surprise Map.
- Four/Six/Eight Islands are treated as a scenario family. Fog Island, Through the Desert, Cartographer, Scattered Tiles, and Custom Map retain their closest available variant. A scenario with **no corresponding larger map** (such as Heading for New Shores) falls back to that board size's island scenario.
- Casual keeps its 6-seat maximum (up to six humans/AI combined) and Timer Off default. Human players can join via code, link, or invite; only the explicit AI-count control adds AI opponents. Casual games never add wins/losses/VP or game entries to persistent history.

## Start Your Journey and rooms

- Replaces the Unranked Play button with **Start Your Journey**.
- The user's first Journey visit on a device opens an annotated 12-stage, always-skippable introduction covering settlement placement, roads, resources/dice, turn flow, trading, development cards, points, and desktop/mobile panels. The walkthrough can be replayed from the Journey screen. Completion is stored per account in local browser storage.
- The Journey splash offers **Public lobbies**, **Private lobby**, and **Challenge of the day — Coming soon** (disabled).
- Public lobby hosts can create publicly discoverable rooms; the list shows only waiting rooms visible to the current user. Private lobbies are never published in the public directory and can be joined by direct link, room code, or friend invitation.
- All unranked and Casual lobbies expose a host-controlled **Lobby visibility** selector (public/private) and **Friends only** option. The latter is enforced server-side even for direct-link spectators. Only host-owned accounts, players already in the room, and the host's friends can enter. A forbidden code produces the same generic `Lobby not found.` error as a missing room to avoid room enumeration.
- Invalid, expired, or unauthorized room codes show a dedicated Lobby Not Found screen with a Change Game Type button. Ranked lobbies keep their existing locked matchmaking process and do not expose these settings.
- Both Casual and Unranked now permit in-lobby invitations to friends.
- Visibility/friends-only preferences are included in `active_rooms.json` and survive R2 persistence/restoration. Older saved rooms default to private and unrestricted by friends status.

## Localization

- Adds translated Journey, public/private, Challenge, tutorial-control, and privacy labels for **29 existing non-English languages** without deleting or resetting the old v52 translations. More complicated descriptions and tutorial paragraphs may still fall back to English; no real-time translation service or API key is required.

## Deploy (existing GitHub connection)

1. Back up the contents of `hex-settlers-state-staging`, especially `state/users.json`, `state/active_rooms.json`, and `state/game_history.json`. Do not rename or delete the bucket.
2. Extract this ZIP and copy the contents of `Hex-Settlers-GitHub-AutoDeploy/` to the root of the GitHub repository already connected to the **staging** Worker. Preserve the repository's hidden `.git` directory and any local secret files.
3. Commit to `main`, then **Push origin** with GitHub Desktop. Cloudflare Builds should run the existing command `npm install --prefix cloudflare --no-audit --no-fund && node scripts/stamp-git-build.cjs`, then deploy with `./cloudflare/node_modules/.bin/wrangler deploy --config wrangler.jsonc`.
4. If GitHub Builds still says **Failed**, open that build's detailed log and check the actual error; a separate manual Ready deployment does not mean the failed GitHub build has succeeded. You may continue the existing manual deployment path without changing R2 settings.
5. Visit `/health` and `/api/build-version` on the staging Worker, then test a new private room with a second account, public-list visibility, and friends-only access. Use a nonfriend account to confirm the `Lobby not found` behavior.
6. Launch a fresh Journey account to see the tutorial; verify Skip, Public, Private and disabled Challenge. Test casual multiplayer (human/AI total <=6) and confirm that casual games do not appear in saved game history or ratings.

## Validation limitations

- 326/326 locally runnable automated regression tests passed, including eight v53-specific checks for version rollovers, persistence schemas, privacy checks, scenario selection and translations.
- The full integration suite also depends on the `ws` npm module and old `scripts/output/` AI training reports that are not part of the source ZIP. This environment could not download `ws` from npm. Consequently, live Cloudflare deployment, multi-browser flows, and some integration tests are **not yet verified here**. The Cloudflare Dockerfile installs `ws` during a connected build as before.
