# Hex Settlers — Mobile Clock Surface v27

Based on the user's v26 build (`Hex-Settlers-HUD-Mobile-Clock-v26(1).zip`). This is a focused UI fix; multiplayer rules and ratings are unchanged.

## Changes

- Removed creation of the small dotted clock drag grip and deleted its CSS. Dragging the entire non-interactive timer surface moves the timer, including touches on the countdown, status text, or action information.
- Removed the now-unused header strip **on mobile**, so the time starts directly below the clock's normal padding with no empty row above it. The timer scale controls remain available on desktop; interactive controls are excluded from dragging.
- Kept the existing player-specific position persistence and board-space clamping, so the clock cannot cross the top toolbar or standalone Roll Dice / End Turn dock.
- Advanced app, stylesheet, and service-worker cache keys to `clock-surface-v27` to prevent stale CSS/JS on mobile.

## Checks

- JavaScript syntax (`node --check`), server syntax, and TypeScript bootstrap type check: pass.
- Chromium isolated-client pointer-drag checks: passed on 390×844 portrait, 844×390 landscape, and 1024×768 touch-tablet sizes, dragging from countdown time, status line, and action message; no page JavaScript errors. The browser tests simulate the in-game HUD without a live multiplayer session.
- Node test suite: 263 passed, four unable to complete because the uploaded ZIP omits the required `ws` runtime dependency (server/integration and neural-training cases). No other tests failed.

## Deployment

The live Cloudflare game has **not** been deployed or modified. Deploy the source using the normal Cloudflare workflow. No `node_modules` or `.git` history is included.
