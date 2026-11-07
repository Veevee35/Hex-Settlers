# Hex Settlers v34 — Casual Play, Portable Replays, Custom Maps, Lobby Splitter

Based on the full v33 Cartographer-ranked build. All existing multiplayer, ranked, unranked, Cartographer and map modes remain in place.

## Player statistics and game history
- Added a **Friends only** checkbox to the Stats & History screen. It filters the Player Stats table and Game History to accounts on the current player's friend list. Friends are matched by account ID rather than display name.

## Portable completed-game replays
- Game Log now exposes **Download selected** and **Upload Game Replay** controls. Download selected opens Stats & History, where individual completed games can be selected.
- Stats & History provides a per-game checkbox, **Download selected**, and **Upload Game Replay**. Exports are JSON replay packs with complete historical replay steps and postgame summaries, not plain-text log copies.
- Imported replay packs are stored on the device in IndexedDB and listed as **Saved replays on this device**. They can be replayed, viewed as summaries, re-exported, or removed even after the server deletes the original history entry. Keep the downloaded JSON if you want a backup on another device, after clearing browser storage, or after changing browsers.
- Only matches already recorded in Game History with a complete replay can be exported. In-progress games are not save-state exports.

## Casual Play · vs AI
- Added **Casual Play · vs AI** to the game-type selection screen.
- Casual creates a private room with one human host and automatic AI opponents; all unranked map modes and standard lobby rules are accessible. Switching to a 5–6-player map automatically fills the additional AI seats.
- Human joins, spectators, and invitations into casual rooms are refused by the server, not merely hidden in the browser.
- Casual results are excluded from ranked and unranked rating adjustments and unranked historical rating migration.

## Custom Map across all board sizes
- Renamed the visible **Test Builder** choice and editor to **Custom Map**. The legacy scenario identifiers remain supported internally for compatibility.
- Added **Custom Map** to both Classic and Classic 5–6 via a checkbox; the same tile, dice-number and port editor is available on both boards.
- Added **Download Map** and **Upload Map** to the editor for validated, portable JSON layout files. Server import validates matching map size/scenario, tile coordinates/types, robber/pirate state, numbers and port legality.
- Custom-map previews are retained in active-room persistence, so restart recovery does not silently destroy a painted map.
- These files preserve map layouts, not the progress of a game already in progress. For preserving completed matches, use the separate replay export.

## Lobby layout
- Added a desktop pointer/keyboard-adjustable splitter between the settings panel and map preview in unranked/casual lobby screens. The chosen width is remembered on that device. The splitter is hidden on small/mobile views and during gameplay/ranked screens.

## Deployment and tests
- Server WebSocket protocol registers the two new custom-map messages, including connection-recovery support.
- TypeScript bootstrap builds successfully (`npm run build`).
- Automated test suite: **321 passed, 0 failed**, including WebSocket integration tests covering casual privacy, 4-player Classic Custom Map export/edit/import/start, and 5–6 Classic Custom Map import validation.
- No new environment variables or database migrations are required.
- Deployment uses the existing Cloudflare + upstream server arrangement described in README_CLOUDFLARE.md; deploy the updated server and the updated static client together.
