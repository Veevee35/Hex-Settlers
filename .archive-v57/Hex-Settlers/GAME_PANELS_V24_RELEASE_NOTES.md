# Hex Settlers v24 — desktop/mobile layout corrections

Based on the uploaded Hex-Settlers-Game-Panels-v23(1).zip. All existing ranked/unranked gameplay logic, settings, and assets are retained.

## Desktop

- The upper Game Tools HUD and lower action bar end at the beginning of the resizable right game sidebar instead of covering it. Both expand to the viewport edge when Game Panels is hidden.
- The hidden-sidebar background is now consistent with the board even while paused: the pause dimming overlay expands across the vacated sidebar space.
- The timer's drag grip is visible again. Dragging works, with both saved and newly dragged positions overriding prior forced top/right CSS offsets. Timer location is preserved using the existing per-player panel-position key.
- The right sidebar now uses its full vertical height rather than retaining empty space for bars that no longer cover it.

## Mobile/tablet

- The two-row action controls and Roll/End Turn controls now take up real vertical rows in the gameplay layout; they are no longer placed with absolute bottom offsets that could run underneath Android's navigation bar.
- The app's gameplay viewport uses the dynamic viewport height (100dvh) without a larger 100vh minimum, respecting mobile browser chrome and software navigation.
- The compact Bank Resources and player resource strip is now its own permanently visible block directly below the action controls and immediately above the movable map/game-panel splitter.
- The Game Panels button only hides/reveals the tabbed panel below the splitter. It no longer hides the bank/player resource strip.
- The existing splitter, resource tabs, desktop sidebar resize, game actions, and draggable timer remain functional.

## Validation

- JavaScript syntax checks passed for public/app.js and public/sw.js.
- 235 dependency-independent Node tests passed, 0 failed.
- Browser layout simulations (Chromium) verified panel alignment, clock drag, consistent pause shading, resource-strip persistence, game-panels toggle, and viewport bounds at 390×844, 360×640, 844×390, 1024×768, and 1366×768.
- Full live-server tests were not run: the uploaded source does not contain node_modules/ws. Install dependencies with `npm ci` in an environment with package registry access before running `npm test` or deploying a Node-based server. Cloudflare Worker dependencies and behavior are unchanged.
- Affected frontend cache versions advanced from game-panels-v23 to game-panels-v24 in index.html, app.js and sw.js.

## Deployment

Use the repo's existing Cloudflare deployment process (see README_CLOUDFLARE.md). This ZIP contains source and assets; no live deployment has been performed.
