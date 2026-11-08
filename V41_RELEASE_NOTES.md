# Hex Settlers v41 — Permanent 7–8 Player Maps

This full-source update builds on **v40** and includes all of the existing project files.

## Permanent scenario selection

Under **Unranked Play → Game Setup** choose:
- **Classic 7–8 Player** for the permanent 43-land-hex Classic game. The existing **Custom Map** toggle enables an editable copy of the supplied Classic 7–8 custom template instead.
- **Seafarers 7–8 Player Scenarios**, then choose **Eight Islands**, **Through the Desert**, **Fog Island**, **Scattered Tiles (7)**, **Scattered Tiles (8)**, **Cartographer (7)**, **Cartographer (8)**, or **Custom Map**.

The seven-player variants require exactly seven seats and the eight-player variants require exactly eight seats. The shared 7–8 scenarios support either player count. Expanded-map paired turns remain enabled.

## Map source and inventories

The bundled `server/maps-78/*.json` files come from the supplied seven-to-eight-player map JSON files. They lock the board footprint and, where appropriate, the island/desert/fog arrangement. Terrain distribution and number discs are randomized using the corresponding existing Seafarers scenario principles, while **preserving the exact tile and disc quantities** from the supplied reference charts.

| Permanent scenario | All map hexes, including sea | Numbered discs | Hidden fog hexes | Ports |
| --- | ---: | ---: | ---: | ---: |
| Classic 7–8 | 69 | 40 | 0 | 9 |
| Eight Islands | 79 | 40 | 0 | 11 |
| Through the Desert | 97 | 50 | 0 | 11 |
| Fog Island | 79 | 30 visible, 19 hidden | 23 | 11 |
| Scattered Tiles (7) | 97 | 42 | 0 | 9 |
| Scattered Tiles (8) | 97 | 48 | 0 | 11 |
| Cartographer (7) | 97 | 42 after player draft | 0 | 9 after draft |
| Cartographer (8) | 97 | 48 after player draft | 0 | 11 after draft |

Number discs are distributed with the correct scenario-specific quantities, with sixes/eights kept apart and off Gold Fields. Coastlines, island layouts and other map-specific terrain constraints are preserved instead of trimming outer sea tiles. Eight Islands and Through the Desert spread ports across island regions where practical.

## Fog Island and editable fog tiles

**Fog Island** now hides the central region **at the beginning of play**, even though the uploaded source template displays it as ordinary terrain. All **23** tiles in that region start concealed; four hide sea, four hide Gold Fields, and 15 hide resource tiles. The 19 hidden production numbers appear upon discovery, and the normal Fog Island resource rewards and Gold Field choice apply. Players begin on known, revealed land.

**Custom Map** now has a **Fog (hide existing tile)** brush. First paint the underlying tile and (for producing terrain) its number disc, then paint fog over the same tile. Its true type and number remain secret until discovered by a qualifying road/ship, whereupon normal Fog Island rewards apply. The pirate cannot occupy unrevealed fog, including on a custom map. Fog information round-trips through the JSON map download/upload format, without leaking unrevealed terrain to other players.

## Defaults and compatibility

- Classic 7–8 editable maps initialize from the supplied Classic 7–8 Custom Template JSON; permanent Classic uses the supplied Classic layout.
- Seafarers 7–8 editable maps initialize from the supplied 7–8 Custom Template JSON.
- Both Scattered Tiles and Cartographer use the submitted seven/eight-player map dimensions and inventories. Manual Cartographer begins with an empty 97-slot tile draft; numbers and ports are assigned after players place all tiles.
- Existing game modes, ranked play rules, account features, and 2–6 player scenarios are not intentionally changed.

## Validation and deployment

Validation: TypeScript bootstrap compile, Node syntax checks, and **349 passing Node tests**, including game-server integration tests for all eight permanent variants, an eight-player manual Cartographer game start, exact terrain inventories, new fog paint + upload/download, and legacy behavior.

**Deployment:** This ZIP changes the game source locally, not the currently deployed Cloudflare website. Deploy your updated server and client/asset code together. If your Cloudflare Worker remains a proxy to a separate Node origin, the Node origin must also be updated for game generation; updating only static assets is insufficient.
