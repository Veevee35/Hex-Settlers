# Hex Settlers v54 — All Games, Lobby Permissions, and Connection-Aware Timers

This release builds on the v53 GitHub-ready Cloudflare staging source. It preserves the `wrangler.jsonc` Worker target, existing R2 state bucket and Cloudflare Container deployment pipeline. Do not overwrite live R2 state or environment secrets when updating the source.

## New behaviors

- In non-ranked matches with turn timers enabled, the server checks the active human player's socket at the *start* of their turn, setup placement, and paired extra turn. If disconnected, the game pauses and broadcasts the paused state. A connected player can resume using Play; ranked games and Timer Off games do not use this auto-pause path.
- A non-ranked lobby host can switch to spectator mode if there is another human player present. Host control transfers to the longest-present other human player (`joinedAt` order). A host who leaves the lobby also transfers ownership if another human player remains.
- The host can click another human player's profile and select **Make Boss** or **Remove Boss**. A boss can modify game rules and custom-board setup while the game is still in the lobby. Starting games, appointing another boss, and changing Friends Only access remain host-controlled.
- The original Start Your Journey button changes to **All Games** once that account has finished or skipped the introductory walkthrough on the current device. Choosing All Games does not silently rejoin the last room.
- All Games adds Ranked, Casual and Settings shortcuts. Settings includes a mock board, persisted game panel scales, saved sidebar width, mobile split ratio, and existing per-sound volume controls. The mock is an adjustment preview, not a playable match.
- Every non-ranked lobby includes a **Leave Lobby** button in its header. Leaving is confirmed. A non-ranked player in an active match should use the existing Leave Game flow instead.
- Public lobby discovery uses the allowlisted `list_public_lobbies` message and filters to open, non-ranked, *non-Casual* public lobbies that the current user may access. Friends Only access remains enforced server-side even when users know the room code or direct-join URL.
- Public or Private entry selection establishes lobby visibility at creation. No lobby includes a public/private dropdown. Casual rooms are always unlisted and can be shared by direct invite or code, subject to Friends Only restrictions.
- All new short controls have entries in each of the 29 non-English locale packs; detailed English dynamic text may still fall back to English.

## GitHub and Cloudflare deployment

1. Back up the existing staging R2 bucket if this staging environment holds your production accounts.
2. Extract the ZIP. Copy the contents of the `Hex-Settlers-GitHub-AutoDeploy` folder into the **root** of the existing GitHub clone, keeping `.git` untouched.
3. Commit and push to the branch connected to Cloudflare Builds (usually `main`).
4. Wait for the Cloudflare **Build and Deploy** to succeed. If it fails, the successful manual deploy remains active; inspect the failed build logs before manually redeploying.
5. Visit `/health`, then test two separately authenticated accounts: public listing, invite-only join, Friends Only rejection, Make Boss rules editing, host-to-spectator transfer, leave lobby, and automatic pause/resume after disconnecting the active player at a turn boundary.

## Verification

- Node syntax checks for `server.js`, `server/protocol.js`, `server/active-rooms.js`, `public/app.js`, `public/locale-expansion.js`.
- 331/331 automated tests passed across 75 offline-compatible test files, including four new v54 behavior tests.
- 13 test files requiring unbundled `ws` dependency or missing historical AI training reports were excluded from that clean run. The complete live WebSocket integration suite has **not** been verified in this environment.
- Live Cloudflare and browser/device interactions have **not** been executed here. Host transfers and multi-account permissions should be checked in staging before relying on them in a real game.

The existing R2-backed build-version system is unchanged. The source version and footer fallback may still show an older seed until the server starts the new release and loads its R2 release counter; no Git hash is shown in the in-game version string.
