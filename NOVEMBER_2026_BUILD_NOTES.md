# Hex Settlers — November 2026 update

Changes in this build:

- In both Cartographer and Scattered Tiles, 6 and 8 tokens are allocated to non-gold resource tiles. Applies to random boards, manual draft boards, and randomized fallback placement. Red-number adjacency is still attempted before fallback.
- Terms of Service and Privacy Policy use `support@hexsettlers.org` as their contact address.
- **My Account > Change Player Name** for regular accounts; administrator's own **User Management** entry has its own **Change Name** control. Names may be shared across accounts, usernames are unchanged and remain unique. New name is persisted and synced to active game/lobby players and undo snapshots.
- **Back** may be requested by any active player (not spectators), including off-turn, mid-prompt, or while paused, once a previous turn exists. It continues to require approval from all active human players before undo. The client permits undo-vote responses while the game is paused by that vote.
- Bumped the client JavaScript cache-busting query in `public/index.html`.

## Install / deployment

This is a complete source/build archive, not an in-place patch. It excludes generated dependency folders (`node_modules`) and Git object history (`.git`).

Run `npm ci`, then `npm run build`, and deploy as your current configuration normally does. Cloudflare Workers Assets serves the `public/` directory while the provided Cloudflare worker forwards `/api/*` and `/ws` to its configured Node backend; update both the Cloudflare static assets and the Node backend for these features to work together. The Worker is still a proxy, not a Durable Objects rewrite.

Tests: `npm test` and `npm run build`.

## November 5 follow-up (shared rematches, previous turn, and layout)

- The first player who presses **Rematch** after game-over creates a fresh lobby and becomes its host. The completed room retains a persisted pointer to that lobby so each later player pressing Rematch joins the **same room**. Other human participants stay on the game-over screen unless they opt in. AI seats and settings carry forward.
- **Back** snapshots advance only on a new player-turn (including the second stage of a paired turn). Unanimous approval restores the beginning of the **previous player's** turn, resets its timer, and pauses the restored game. Click **Play** to resume; this prevents AI auto-turns from immediately erasing the visible rollback.
- The in-game account orb anchors just **left of** the resizable right sidebar; its position tracks the sidebar width. Outside games its original position is unchanged.
- The Server Management dialog uses a wider responsive shell and grid-based rows so the Kick buttons remain visible beside long labels.
- Cache identifiers and asset query strings bumped to ensure clients load the revised CSS and JavaScript.
