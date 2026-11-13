# Hex Settlers v35 — Lobby and Replay UI Fixes

Based on the supplied v34 full build. Existing ranked, unranked, casual, replay, custom-map, and ratings functionality is retained.

## Changes

- **Desktop game type selection:** Ranked, Unranked, and Casual Play appear in a single three-column row on desktop. Narrow viewports use a stacked layout.
- **Mobile game type selection:** On phones, the Hex Settlers icon moves to the top-left and is smaller. Headings and mode choices are more compact, keeping the complete Casual Play button on screen without scrolling on typical phone viewports.
- **Casual pre-lobby:** Removes the unneeded room-code label and its separator. Casual remains non-shareable, AI-only.
- **Pre-lobby cleanup:** Removes the otherwise-empty lobby settings/board vertical divider from both Unranked and Casual create-lobby screens. The splitter remains available once a preview board exists.
- **Board resize redraw:** Changing the lobby settings/map divider now requests an atomic canvas resize + repaint instead of clearing the board drawing buffer. A ResizeObserver also requests redraws when the board container changes size without a window resize.
- **Settings templates:** Adds a separate **Load Game Template** button beside **Save Settings Template**. Loads an existing named template in the active lobby and commits it through existing settings code. The controls disable for non-hosts.
- **Replay toolbar placement:** Automatically positions the replay controls below the measured in-game top HUD (including scaled headers) and keeps them in front of the board interface.
- **Asset cache:** Updates the shared CSS/JS/service worker cache key to `features-v35`.

## Verification

- `node --check public/app.js` passed.
- `node --test` passed: **327 tests, 0 failures**, including 6 new v35 layout/replay regression checks.
- No new server configuration variables, APIs, database migrations, or Cloudflare bindings are required.

## Deploy

Deploy the `public/` client files and server from the ZIP together. Because the service-worker cache key changed, clients will retrieve the updated assets after the new deployment is active; if a tab is still using old assets, reload it.
