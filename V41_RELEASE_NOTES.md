# Hex Settlers — v41: Permanent 7–8 Player Maps and Custom Fog

Based on the v40 full build. The GitHub-managed semantic version display and automatic patch-increment workflow introduced in v39 are preserved. This ZIP does not pre-increment the displayed semantic version: the repository's push workflow handles that on deployment.

## Permanent scenarios (Unranked only)

### Classic 7–8 Player
- **Classic:** Uses the author's Classic JSON board geometry; randomizes terrain/number placement according to the accompanying Classic token chart. 69 tiles: 26 sea, 3 desert, 8 of each of five resources; 40 number discs and 9 ports.
- **Custom Map:** Starts from `hex-settlers-classic78-map Custom Templste.json` (69 hex positions) rather than a single tile. Remains editable and exportable.

### Seafarers 7–8 Player
- **Eight Islands:** Author's Eight Islands coordinates, 40 resource tiles with 8 of each resource, 11 ports and 40 number discs.
- **Through the Desert:** Author's layout with 97 positions: 40 sea, 7 deserts, 5 gold, 9 of each resource, 11 ports and 50 number discs.
- **Fog Island:** Author's layout with 79 positions; **23 central fog hexes at game start**. The visible starting islands have 26 sea and 6 of each resource (30 numbered resource hexes). Fog contains 4 sea, 4 gold, and 3 of each resource, with 19 hidden number discs. Exploration reveals hidden type/number and applies the existing Fog Island discovery effects. Hidden details remain private server-side until revealed.
- **Scattered Tiles:** Uses the author's 7-seat or 8-seat shape templates, with tile and disc inventories from the separate charts: 7 players = 48 sea and 7 of each of 7 terrain types, 42 number discs; 8 players = 41 sea and 8 of each of 7 terrain types, 48 discs.
- **Cartographer:** 7-seat and 8-seat manual drafts use the same supplied geometry masks, adjusted to the current player count. Each participant places seven terrain tiles; sea positions are prefilled. Auto-placement remains per-player on timeout, not a forced takeover of every remaining turn.
- **Custom Map:** Starts from `hex-settlers-test_builder_78-map Custom Template.json` (97 hex positions), rather than the prior one-tile blank map.

The 7–8 modes remain unavailable in Casual and Ranked. Server-side validation enforces this restriction. The custom editor is available only on the two Custom Map selections; permanent scenarios cannot be painted over.

## Custom-map fog brush

- New **Fog (cover existing tile)** option in the terrain editor. Paint the tile's actual underlying terrain and number first, then apply fog to conceal it.
- Concealed tile appears as fog; its type and number are held on the server until discovered by exploration. Applies to both custom-map board sizes and previously supported custom-map modes.
- Download/upload retains `fog`, `hiddenType`, and `hiddenNumber`. Game-state broadcasts do not reveal hidden details.

## Uploaded assets and data provenance

The eight author-supplied JSON maps are retained in `server/maps-78/`. The six token-inventory chart images are retained in `docs/7-8-map-reference/`. Original layouts are not stretched to reconcile source inconsistencies:

1. **Eight Islands:** Chart states 83 total hexes, comprising 43 sea + 40 land; supplied JSON geometry has **79 hexes**. v41 preserves those 79 coordinates, assigning **39 sea + 40 land**. Four extra sea coordinates can be added when a revised map file is supplied.
2. **Scattered Tiles / Cartographer:** Both reference charts label total as 96, while their category totals sum to **97**; both uploaded template outlines have **97 coordinates**. v41 uses 97.
3. **Fog Island:** The face-up reference chart labels total as 55 but shows 26 sea + 30 resource hexes (= **56 face-up**). The original geometry is 79, and the intended 23 fog hexes give 56 visible + 23 hidden. v41 uses the category totals.

## Validation

- `npm run check`: 350 tests passed, 0 failed; TypeScript compiled and JavaScript syntax checks passed.
- Live integration tests cover permanent scenario selections, map previews, eight-seat Cartographer, port counts, fog visibility, custom-map fog import/export, and Casual-mode rejection.
- The tests do not constitute visual verification across browsers and devices; an interactive smoke test after deployment is recommended.

## Deployment

Deploy the v41 frontend and server together, preserving existing persistent storage and configuration. No new environment variables or database migrations are required. The GitHub automatic version workflow is unchanged; run deployment from the repository as usual.
