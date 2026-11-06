# Hex Settlers — Ranked Lobby & Scenario Voting v17

## Ranked lobby

- Ranked matches use a full-width lobby card, with the board/right-side window removed until the game begins.
- Private lobby creation, manual joining, room code entry, last-room rejoin controls, and the Generate Link button are hidden in ranked lobbies. Unranked lobbies are unchanged.
- The direct lobby link is replaced with a `?room=CODE&spectator=1` spectator invite. Spectators may join before the game begins; they cannot vote or take one of the four matched seats.
- The three voting cards feature a randomized, actual board preview, including terrain layout, hidden fog, and visible dice numbers. The winning preview's board is reused for the game, including manual Cartographer's initial draft.
- A large synchronized 30-second countdown prominently displays how much time remains.

## Authoritative ranked voting

- The server sets the 30-second deadline on match creation and persists it for reconnect/restart recovery.
- Players may revise their votes any number of times before the deadline; they may also abstain.
- A match cannot begin before the deadline, even after all four ballots have been submitted.
- At expiration, the scenario with the most current votes wins. A tie for the lead, including a 0-0-0 tie, is settled randomly among only the tied scenarios.
- Selected map uses its own complete ranked defaults, including probability-corrected dice, normal timers, and no Friendly Robber.
- The server prevents external players from joining ranked matches as competitors or changing their settings.

## Ranked controls and statistics

- Back/turn-undo and End Game vote buttons are hidden in ranked games, and their underlying game actions are rejected by the server. They remain functional in unranked games.
- Pre-split historical games lacking a ranked flag now count toward Unranked and Combined player stats, but never Ranked. Original game records and ranked ratings are not rewritten.
- Legacy game labels in Game History and game summaries identify those games as unranked.
- Unranked retains its own player stats without a rating column.

## Verification

- All 245 automated Node tests passed (`node --test`).
- Ranked integration checks exercise matchmaking, spectator join, mutable voting, abstentions, deadlines, server authority, and ranked-action rejection.
- A browser layout check verified the desktop vote view displays three horizontal map cards and hides the non-game board area.

## Deployment

This archive is a complete source/game-assets build, not a live deployment. Follow README_CLOUDFLARE.md for the existing Cloudflare Worker/Durable Object deployment path. The service worker and script/style asset versions have been incremented to avoid stale browser assets. Install dependencies with `npm ci` when building locally.
