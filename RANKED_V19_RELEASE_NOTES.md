# Hex Settlers — Ranked Lobby v19

Built from uploaded Ranked Lobby v18.

## Fixed-width Resources panel
- The **Resources** card in the right-side dock stays at the sidebar's full available width while its scale setting changes. Its contents and the resource-bank summary likewise fill the full dock width, rather than becoming narrower/wider with text/icon zoom.
- The floating (undocked) resources panel retains its normal sizing behavior.
- Browser layout checks confirmed stable visible dock/card/content widths at 60%, 100%, and 150% scales on 390px, 768px, and 1280px viewports.

## Ranked Leave Game removal
- Hidden Leave Room in ranked lobby roster, and hidden Leave Game on the ranked in-game toolbar for every player.
- Client confirmation paths reject ranked player leave actions. The server rejects `leave_room` and `request_leave_game` from active matched ranked players until a match finishes.
- Spectators retain the ability to leave a ranked room. Completed ranked matches still allow the existing Main Menu and Rematch transitions.

## Unranked End Game vote
- The vote is available to any active unranked player, including while paused or resolving gold choices.
- Every active player's approval is required. The proposer starts with an approval but can **withdraw** that approval, just like any other player.
- After unanimous approval, a **server-controlled 5-second grace period** begins. The match will not finish until that period has elapsed.
- Any player can withdraw an approval during the countdown, cancelling the countdown while leaving the vote open. Reapproving starts a **fresh full five seconds** after unanimity returns. Explicit rejection cancels the vote entirely.
- AI players respond automatically to unranked End Game votes, but their approval does **not** bypass the five-second countdown. A human playing against only AI players can withdraw and reapprove normally.
- The voting modal displays the countdown and per-player status. Dismissing the modal does not submit an unintended rejection. Server finalization records the winner, stats, replay, and history using the existing game-over mechanisms.

## Mobile Game Tools
- The Tools card stays visible across the top of the in-game board on mobile.
- Buttons use a horizontally scrollable, touch-friendly toolbar; the existing Actions control expands the toolbar to show multiple rows. The countdown/right HUD is below the bar to avoid overlap.
- Saved desktop drag coordinates cannot override the mobile toolbar position.

## Verification
- `npm run check`: **249 tests passed, 0 failed**. Includes a live WebSocket test with one human and three AI opponents checking vote withdrawal and the full grace period, and the preexisting unranked integration test now covers the proposer's cancellation as well.
- Headless Chromium CSS layout check: 390×844, 768×1024, 1280×720. Resources container and internal content hold the same full-dock visible width across 60%/100%/150% scales; top Tools toolbar visible on mobile.
- All updated client assets use the `ranked-lobby-v19` cache key. `server.js` includes the updated v19 build identifier.

**Deployment:** Replace the full Cloudflare Worker/server source and public assets as appropriate to your existing workflow. This ZIP has not been deployed to your live game. Previous data and rating records are not reset.
