# Hex Settlers — HUD Orb & Development Cards Scaler v28

Based on the user's v27 source archive.

## Fixes

- Account orb is now centered vertically inside the top HUD and sized from the measured top-bar height, with padding reserved so toolbar buttons and scaling controls cannot pass under it. This works with resized desktop panel widths, scaled toolbar controls, and short mobile layouts.
- Development Cards scaler now occupies an explicit right-side grid column. The title stays on the left; the deck count moves below it. This keeps all four scale controls inside the right sidebar even when the sidebar is narrow.
- Frontend and service-worker build IDs updated to `orb-dev-scale-v28` to force refreshed CSS and JavaScript.

## Verification

- `node --check public/app.js` passed.
- Chromium layout checks verified the orb stays inside the top bar and Development Cards scaler stays inside the panel at 1024x768, 1280x720, 1731x865 and 980x800. Additional mobile orb checks at 390x844 and 844x390.
- Automated test run: 266 passed, 4 failed because the uploaded project lacks the `ws` dependency. These are integration / training tests requiring the dependency; none of those failures arose from the HUD changes.
- No live deployment was performed.

## Deployment

Upload/deploy the project's Cloudflare source normally; ensure `public/index.html`, `public/app.js`, `public/styles.css` and `public/sw.js` are deployed together to avoid stale assets.
