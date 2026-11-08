# Hex Settlers v46 — Automatic 7–8-Player Map Previews by Occupied Seats

Based on the complete v45 build. Retains the compact clock, 14-VP expanded map defaults, Fog Island corrections, all custom map options, and AI features.

## Fix
- Unified **Scattered Tiles** and **Cartographer** 7–8-player map choices now use the **number of occupied lobby seats (humans + AI)** to decide the preview board.
- **1–7 occupied seats:** seven-player map, even when the Game Setup Number of Players dropdown is set to eight.
- **8 occupied seats:** eight-player map, as soon as the eighth human or AI enters the lobby.
- Removing the eighth player or reducing AI Fill back to seven restores the seven-player preview.
- Lobby capacity and the minimum player count needed to start are still controlled by the independent Number of Players setting; map preview selection is not.
- The existing automatic preview broadcast covers all connected lobby members. Newly joined players see the same generated board.
- Previously saved `_7`/`_8` lobby keys also normalize to the current occupied seat count; games already in progress retain their frozen map.

## Implementation
- Corrected `mapPreviewKey`, `generatePreviewGeom`, and the lobby's initial geometry to resolve the 7/8 variant using occupied seats instead of the player-count target.
- Removed the legacy `_8`-on-underfilled-lobby exception.
- Extended the live-WebSocket integration tests for 1, 7, and 8 occupied seats; both scenario types; and the 7 → 8 → 7 → 8 cycle.
- Updated the older map inventory test to populate the requested number of seats before checking an explicit 7/8 layout.
- Set the runtime server build identifier to `features-v46`.

## Validation
- `npm run check`: **PASS**, including TypeScript compilation, JavaScript syntax checks, and **355/355 automated tests**.

## Deployment
This archive is the full source build, not a live deployment. Publish the updated server code to the game backend and deploy its matching client assets as appropriate. Existing matches already in progress are not rebuilt.
