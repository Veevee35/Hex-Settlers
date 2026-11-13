# Hex Settlers V63 — Preview Parity, Sidebar Detail Retention, Startup Preload

Built from the supplied V62 project. Includes the prior V60 admin game-stats dashboard, V61 texture-art previews, and V62 optional tutorial, settings sandbox, and section dividers.

## Challenge Maps previews (daily and weekly)
- Use the exact geometry already cached for that period's challenge room; no second map is generated for a thumbnail.
- Match the *live* canvas' scenario-sensitive outer-border rule (`rulesHideOuterSeaBorder(challengeRules(...))` and `tileNeighbors`), instead of trimming every non-Classic 4–6-player map. In particular, 4–6-player Scattered Tiles / Cartographer-random scenarios keep the same outside tiles the game renders.
- Existing unrevealed Fog Island tiles, in-game textures, number artwork, and harbor/port icons stay enabled.
- The underlying navigation geometry remains untouched: the fix only changes what is sent for the visual thumbnail.

## Desktop right sidebar
- Keeps the three draggable, persistent section dividers.
- Each pane now preserves the original content in its own scrollable area, with its header and scaling buttons fixed: player summaries (cards, development cards, knights, longest road, VP), game log, development-card counts and hand, bank inventory, current-player hand, remaining pieces, and costs.
- Sections may still collapse completely by dragging sliders to one another; reopening restores the unchanged content.
- Desktop-specific CSS leaves the existing mobile tab layout intact.

## Startup asset preloader
- Adds a full-screen loading screen with a progress bar counting real completed asset requests, not a fake timer.
- Preloads favicon, the chosen built-in texture pack's 43 images (tiles, tokens, cards, ports), and 13 common audio files in bounded concurrency. All pre-lobby HTML/CSS/scripts load underneath while the overlay is visible.
- The game image renderer shares the same in-flight image promises rather than re-downloading the same textures. The screen reaches 100% only after all requested assets and the game image renderer finish. The shared image cache is retired after startup, so later texture-pack changes load fresh art.
- If an asset is unavailable or the network is stalled, users are given a way to enter without being trapped behind the loader. Custom packs continue using their existing cache/fallback behavior.
- Updated the normal Git/Cloudflare revision stamper and manual versioner so the boot-preload script's URL changes with builds. Incremented the service-worker cache key.

## Validation
- 60 focused tests pass, including a client-vs-server map visibility parity test covering 4–8 players and all five challenge scenario families.
- `node --check` passes for the changed JavaScript files.
- Full browser/integration testing is not claimed: the local headless browser blocked navigation and the `ws` dependency was unavailable from the offline npm cache. No production deployment has been performed.

Deployment: commit/replace the full project in your existing GitHub-to-Cloudflare workflow. No new Cloudflare bindings or secrets are required.
