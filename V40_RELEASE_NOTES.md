# Hex Settlers v40 — 7–8 Player Custom Map Workshop

Built from the user-supplied v39 full release. The semantic version label continues
from `V1.0.0` using the GitHub branch-push workflow supplied in v39. A GitHub push
advances the third digit automatically. This internal archive is designated v40
only to distinguish development deliverables.

## Two new unranked map types

- **Classic 7–8 Player — Custom Map** (`mapMode: classic78`)
- **Seafarers 7–8 Player — Custom Map** (`mapMode: seafarers`, `seafarersScenario: test_builder_78`)

There are no fixed/preloaded scenario geometries in either new type. Both use the
existing custom tile/number/port painting tools, including export and upload.
**Both are absent from Casual Play, are not ranked matchmaking choices, and are
rejected by the Casual server-side settings validation.**

The 7–8 modes have eight player slots and may be populated with humans or AI.
A started match requires seven or eight participants. The paired-turn mechanism
from existing extended-player modes is reused provisionally, pending finalized
7–8 game rules. The default bank supply is 30 of each resource (configurable).

## Shape editing (new)

- A new 7–8 map starts with one desert at axial coordinate `Q=0, R=0`.
- Use the tile editor's **Add tile (7–8)** and **Remove tile (7–8)** tools,
  then click a position in the board preview. The world coordinates snap to
  pointy-top axial hexes. You can pan and zoom to extend the work area.
- Alternatively, supply integer **Q/R** values and select **Add at Q/R** or
  **Remove at Q/R** to place/remove hexes beyond the current viewport.
- You may build irregular, non-convex, or separate tile groups. No prescribed
  board radius or silhouette is imposed. A technical safety limit of 1,024
  tiles and ±100,000 axial coordinates is enforced to protect server memory.
- Previously painted tiles and legal ports are preserved when geometry changes.
  Ports whose anchor edge is deleted or no longer valid will be removed.
- **Reset blank** returns the editor to the single center tile. Edits and resets
  are persisted server-side for the active lobby.

## Portable maps

- New 7–8 map files use `hex-settlers-custom-map` **version 2** and contain
  all Q/R coordinates, tile textures, numbers, robber/pirate locations, and
  port edge placements. Exported files can be re-imported into the same map type.
- Existing 4-player and 5–6-player custom maps retain the original version 1
  format. Version 1 and version 2 are not interchangeable.
- Keep the downloaded JSON files. They will be used as input when the permanent
  7–8 scenario geometries and scenario limits are finalized in a future build.

## Validation and deployment

- `npm run build` passed.
- `npm test` passed **347/347** tests, including new live WebSocket server tests
  that add, paint, remove, export and import coordinates, test an eight-player
  setup and enforce Casual protection.
- `node --check` passed for modified JS files.
- Headless browser inspection was blocked by `net::ERR_BLOCKED_BY_ADMINISTRATOR`
  when navigating to localhost; the new UI has not been manually visually verified.
- Deploy Cloudflare frontend and Node game server together. No new environment
  variables or database migration are needed. Retain the persistent data volume.

## Known intentional constraints

These modes are **map-building foundations**. Scenarios and definitive board
bounds are not yet provided; maps built now should be considered experimental.
A one-hex or sparsely populated map cannot support a meaningful seven- or
 eight-player game until the host paints enough buildable terrain.
