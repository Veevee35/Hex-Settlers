# Hex Settlers — Game Panels / Settings Templates v23

## Lobby Settings
- Rule changes in editable, unranked host lobbies now send `set_rules` automatically (170 ms debounce). The Save Settings button is no longer the mechanism for applying room rules.
- Save Settings Template opens a named template editor. Its checkboxes default to the settings changed by the host during the current session. Each field can be selected independently; the Select All checkbox at the bottom selects or clears all fields.
- Templates save only chosen fields and can be applied or deleted later. Applying a partial template preserves all settings not included in that template.
- **Template storage:** Browser localStorage (`hexsettlers_rules_templates_v23`). Templates persist on that browser/device but are not synchronized between devices or to the game's account server.

## In-game layout
- Top and bottom HUD bars are fixed across the viewport width. The account orb now lives in the top HUD bar during gameplay.
- Roll Dice and End Turn are anchored to the left and right bottom corners of the board, above the bottom action bar, using the original game action dispatch.
- The current action text is shown under the countdown clock, with the active player's color. Clock opacity was increased and the redundant action-bar message removed.
- The Game Log remains docked/accessible; the former Game Log toggle has been replaced with Game Panels, which collapses the full desktop right sidebar or mobile lower panel.

## Mobile
- The bottom HUD actions display as two rows of three: Buy Dev Card, Bank Trade, Player Trade; Back, Pause, Play.
- Build actions remain accessible in a mobile `Build` menu on the top HUD.
- A condensed Bank Resources + player-resource strip remains at the top of the bottom panels region, outside of its independently scrolling tab contents.
- Mobile panel tabs: Resources, Game Log, Dev Cards. Scale controls are hidden and responsive sizes track screen width/height.
- Existing touch drag divider remains available; portrait and landscape maintain separate default/saved split ratios.

## Validation
- `node --check public/app.js`: pass.
- `node --test` on 52 dependency-independent test files: 231 passed, 0 failed (includes 5 new v23 tests).
- Browser DOM/WebSocket simulation: checked desktop 1366x768, portrait 390x844, landscape 844x390; panel toggle, tab selection, Roll Dice message, template selection, save/reapply, and lobby rule auto-send.
- **Not executed:** real server/integration and neural training test suites require the `ws` npm dependency, which is absent from the uploaded source ZIP and could not be installed in the test environment. Install runtime dependencies in a normal build environment (`npm ci`) to run these suites. Browser checks used simulated game state rather than a live multiplayer server.

## Deployment
- Changes are source-only. Live Cloudflare deployment is not modified by this archive.
- Frontend asset/service-worker cache version changed to `game-panels-v23`.
