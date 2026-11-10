# V64 — Challenge Map Loading Stability + Compact Settings Controls

## Challenge Maps

- Daily and Weekly maps are requested on demand for the selected player capacity (4–8), rather than building 10 complete board geometries for each page visit.
- Server caches **small** scenario-derived previews by challenge period, kind, and player count. The same authoritative board geometry is used for the playable challenge and the preview; no map tiles or ports are added or removed by this change.
- Player switching and Daily/Weekly switching request the appropriate map. Late responses from previously selected maps are ignored.
- Preview canvas redraws from texture load events are batched to one animation-frame repaint to prevent excessive main-thread work and UI stalls.
- Existing hidden Fog Island tiles remain concealed and original texture/number/port artwork remains in use.

## Settings

- Real game-board Settings overlay now contains **only** Back to All Games and Reset Layout. All other controls, including audio and panel scaling, remain in the normal game HUD.
- Reset Layout now also restores all three sidebar divider positions and the mobile split ratio, in addition to tool scaling and right panel width.
- Settings still uses the read-only local game preview and does not create a real room or record game statistics.

## Verification

- JavaScript syntax checks passed for server.js and public/app.js.
- 24 focused regression tests passed, including new on-demand map generation/cache and settings toolbar tests.
- Offline Chromium layout test found a 295 px × 55 px, two-button settings toolbar.
- Live app navigation was blocked by the testing environment; deployed WebSocket/database behavior and challenge map load under production conditions were not independently verified.

No new Cloudflare bindings or environment variables are needed. Deploy this complete project through the existing workflow.
