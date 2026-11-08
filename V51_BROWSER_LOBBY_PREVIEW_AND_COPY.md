# Hex Settlers v51 — browser lobby preview and copy controls

This is a **drop-in GitHub source update** based on the user's working v50 GitHub Auto-Deploy archive. The Cloudflare Worker name, staging R2 bindings, secret configuration, game server persistence and existing deployment commands were not changed.

## Changes

- The full **Timer speed** selector is moved to the original **Exploration victory points** position, immediately after the Seafarers scenario choices. The exploration toggle and its explanation move to the former timer position after the surprise-map setting, before Generate New Map. Their IDs, values and server behavior remain unchanged.
- Added **Show Map / Hide Map** in the Lobby header on desktop browser layouts (width above 980px with a fine pointer). When the map is hidden, the Lobby and Game Setup cards expand into **two independent, full-height, scrollable columns**; the canvas and resize splitter are hidden. When shown, the existing resizable lobby sidebar and map return. This preference is saved in local storage; it does not change mobile map drawer, ranked map voting or active gameplay.
- The **room code itself** is a keyboard-accessible click-to-copy button. The **direct join/spectator link itself** is also a click-to-copy button; the redundant Copy Link button is removed. Both values display the small **Click to copy** instruction underneath. Clipboard permission fallback continues to use the existing prompt behavior.
- Added translations for the new map-toggle and copy labels in the 29 existing non-English language packs.
- Numbered release bumped to **V1.0.4**. Cloudflare's GitHub commit cache stamper now reads the actual release version so later manual version bumps remain correctly labeled.

## Deploy

1. Extract this archive and copy its contents into your existing GitHub repository root, replacing matching files. Do not delete `.git`, private data or Cloudflare secrets.
2. Commit and push to the branch already connected to Cloudflare Builds (typically `main`). Do **not** create a new Worker or replace the R2 bucket.
3. Cloudflare deploys the existing staging Worker with its existing persistent data. After deployment, open an unranked lobby on desktop to test the Show Map / Hide Map button, and click the room code and direct-join link to copy them.

## Validation

- The original full 384-test Node suite passed with the project's historical neural-AI training-report fixtures available during testing. Those generated `scripts/output/` files are not bundled in deployment ZIPs, and a clean ZIP checkout without those fixtures will skip/need to restore the relevant historical training-report tests to reproduce that exact run.
- `node --check` and focused interface, invitation-link, language and version-stamping tests passed after the UI changes.
- No live Cloudflare deploy was performed as part of building this archive.
