# Hex Settlers v36 — Game Type Switching and Ranked Navigation

Built from the user-provided v35 full game archive.

## Game type switching

- Change Game Type presents Ranked, Unranked and Casual without silently leaving the player bound to the previous room.
- Selecting a **different** game type in an active lobby sends an explicit, server-acknowledged room exit. The next screen appears only after the server has updated membership and saved the result.
- A casual lobby closes when its sole human switches modes; a solo unranked lobby also closes, including its AI seats.
- Shared unranked lobbies stay open for remaining human players. If the host leaves, the next host is the remaining human with the oldest original `joinedAt` timestamp, retained through reconnections.
- A room with no remaining human players is deleted from the active-room store before the switching player receives confirmation, preventing immediate rejoin from resurrecting it from a stale persisted snapshot.
- Choosing the current mode again returns to the current lobby without unnecessarily removing the player.
- Mode changes are blocked during an active game, to avoid an accidental forfeit or forcibly interrupting a ranked game. Normal postgame Main Menu remains supported.
- The new Unranked lobby opens without a stale room code or automatic rejoin to an intentionally departed room. Ranked opens the matchmaking entry screen but does **not** automatically enter the queue.

## Ranked matchmaking navigation

- Leaving Ranked Matchmaking for Change Game Type, account management, rating/server management, logout or page navigation automatically cancels the current matchmaking request.
- Opening **Player Stats**, **Game Log**, or **Friends** keeps the queue running while those screens are open.
- When the ranked match is found, any Player Stats, Game Log, Friends or saved replay view closes automatically, and the player joins the matched ranked lobby and scenario ballot.
- Queue cancellation also works while a saved replay is active.
- In-flight queue status messages are ignored after switching away rather than accidentally reactivating the queue UI.

## Mobile layout

- The “How do you want to play?” heading reserves space on the right for the account orb, wrapping within the available header width instead of drawing beneath the orb.

## Validation and installation

- `npm run check`: **333 tests passed, zero failures**, including the final replay-queue cancellation adjustment. Re-run the check before deploying if changes are made locally.
- Built `dist/server.js` with TypeScript bootstrap.
- Current static asset revision: `features-v36` for HTML, client script and service worker.
- Includes all project source and the same dependencies/assets as the provided full v35 build; ws has been copied into `node_modules/ws` to make the archive runnable without relying on a missing pnpm symlink.
- Deploy the updated server and frontend together. No new environment variables or schema migrations are required.
