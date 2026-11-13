# V61 — Challenge Fog Island Preview Artwork

The Weeklys and Dailies Challenge Maps screen now renders Fog Island previews using the same original game-board texture pack used during gameplay. The original V60 preview applied diagonal hatch marks over gray hexagons, which looked unlike the in-game unexplored tiles.

- Hidden Fog Island hexes use `Resource Hexes/Unexplored.png` (the question-mark tile) instead of synthetic stripes.
- Revealed terrain and seas use their game textures, and visible number tokens use the original number-disc sprites, so the whole preview has one consistent art style.
- Hidden terrain and dice number information is still masked by the server and defensively by the client preview renderer. The game is unchanged.
- Preview artwork is loaded asynchronously and cached by resolved texture URL. The canvas redraws when images finish loading. The default flat-color palette remains available as a fallback and for all other scenarios.
- The visual change applies to both Daily and Weekly Fog Island previews at 4–8 players. Ranked and public lobby mini-maps, challenge map geometry, leaderboard logic, analytics dashboard, and game mechanics are unchanged.

Verification: `node --check public/app.js`; 26/26 focused challenge and admin tests passed, including two new mini-map artwork tests.

No new bindings, migrations, or environment variables are required. Deploy via the existing GitHub → Cloudflare workflow.
