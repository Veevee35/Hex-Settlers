# Hex Settlers v44 — Game Setup Player Count & Fixed Custom Map Editor

Based on the complete v43 build. All previous permanent 7–8 maps, fog rules,
seven/eight-person Cartographer and Scattered Tiles inventories, custom-map
export/import, and Cloudflare implementation remain included.

## Game Setup

- Added an independent **Number of players** dropdown. It is saved with lobby
  rules, synchronized across clients, and included in Save/Load Game Templates.
- Allowed player totals depend on the selected map: standard Classic and
  Seafarers 2–4; 5–6 player scenarios 5 or 6; and 7–8 player scenarios 7 or 8.
  Editable/sandbox and Casual standard maps also allow one player.
- Server treats this as the target total, including humans and AI; a match
  cannot start until exactly that many seats have been filled.
- Reducing the target trims excess AI seats, but cannot eject human players.
  If too many humans are present, the server rejects the reduction.
- AI Fill respects the selected lobby capacity, including seven-player
  Seafarers scenarios. It defaults to filling to the configured target.
- Cartographer and Scattered Tiles 7–8 select their seven/eight tile pools
  from the configured player count even before the lobby is filled; preview,
  number-discs and final game-start map remain synchronized.
- Legacy v43 clients/rooms without an explicit `playerCount` continue to use
  the previous map-size and occupied-seat behavior.

## Custom Map Editor

- Removed Add Tile and Remove Tile options and the Q/R coordinate widgets.
- Removed tile-shape editing from board clicks. Hexes are fixed by the selected
  custom-map template.
- Kept tile painting, Fog brush, number tokens, ports, reset, and JSON
  download/upload intact. The legacy server grid-edit protocol remains for
  compatibility with saved tools and earlier clients; it is no longer exposed
  in the v44 UI.

## Verification

- `node --test`: **353 passed, 0 failed**, including two new v44 tests.
- `node --check server.js` and `node --check public/app.js`: passed.
- `npm run build`: passed.
- No live deployment was performed.
