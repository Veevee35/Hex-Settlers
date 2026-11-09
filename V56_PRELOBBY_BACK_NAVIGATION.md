# V56 — Pre-lobby Back Navigation Fix

Fixes the missing Back button on the shared room-entry screen shown for Casual Play and after leaving a public or private room.

## Changes

- Added a visible Back button above the Casual / unranked pre-lobby heading.
- **Casual Play:** Back returns to the **Change Game Type** screen.
- **Public or Private lobby after Leave Lobby:** Back returns to the **All Games** landing screen (not the old public/private browser, a blank game board, or the game type selector).
- Back is only intended for the no-room entry screen. The connected lobby continues to use **Leave Lobby** and cannot be abandoned through this button.
- The button's text and accessible label update when the selected mode changes.
- Navigating back to All Games does not restart the first-time walkthrough or silently rejoin the room just left.

## Testing

- `node --check public/app.js`
- `node --test test/v56-prelobby-back-navigation.test.js test/v55-public-browser-casual.test.js test/v54-all-games-lobby-behavior.test.js` — 11 passed.
- Project-wide suite: 369 passed, 13 did not complete successfully in this extracted environment (the missing `ws` dependency and missing optional neural-training output fixtures). No failures in the new navigation tests.

Build version identifiers are intentionally left untouched. The Cloudflare deployment workflow controls versions when a build succeeds.
