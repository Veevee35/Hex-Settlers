# Hex Settlers v45 — Compact Turn Clock + Expanded Scenario Victory Defaults

Based on the complete v44 game build. All v44 map, editor, AI, lobby and fog fixes are retained.

## Turn clock (mobile + desktop)
- Removed the old hard-coded 190px desktop, 176px portrait, and 150px landscape panel heights.
- The draggable clock now fits the timer, turn label and action text with no reserved blank message area.
- Mobile stays up to 190px wide and wraps action text naturally; it only grows vertically as needed.
- Desktop clock can use 190–250px of width depending on available space to reduce wrapping.
- Long action messages scroll inside a bounded message area; the clock is also constrained by viewport height.
- Updated CSS and app cache/version stamps from V1.0.0 to V1.0.1 so clients refresh the layout.

## 14 victory points by default
- 5–6-player Cartographer (manual) and Scattered Tiles (random): 14 VP.
- 7–8-player Cartographer and Scattered Tiles (both 7 and 8 player layouts): 14 VP.
- Four-player Cartographer still defaults to 12 VP.
- Host-customized victory targets remain honored.
- Client and server defaults are in sync.

## Validation
- `npm run build`: PASS (TypeScript bootstrap)
- `node --check server.js`: PASS
- `node --check public/app.js`: PASS
- `npm test`: PASS — 355 of 355 tests
- Additional tests verify compact clock CSS and victory targets on client and through a live WebSocket server.

## Deploy
Deploy both public assets and server code together; updating only CSS will not update server-side victory defaults. The deployment to hexsettlers.org is not performed by this package.
