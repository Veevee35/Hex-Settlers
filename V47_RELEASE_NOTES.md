# Hex Settlers v47 — Simplified Game Setup and Invite Link

## Setup changes (Unranked)

- The visible **Map** dropdown now shows just **Classic** and **Seafarers**.
- **Number of Players** now shows three board-size categories: **4 Player**, **5-6 Player**, **7-8 Player**.
- Map and board-size selections map to the existing internal Classic / Classic 5–6 / Classic 7–8 and Seafarers scenario variants. All existing scenarios, custom-map editing, and AI controls remain available in the correct category.
- Board-size choices define *supported ranges*, not mandatory exact totals. Classic/standard boards accept 2–4 players (custom maps also support solo), expanded boards accept 5–6, and large boards accept 7–8. The lobby may fill remaining seats with AI up to the board's maximum.
- Scattered Tiles and Cartographer 7–8 previews continue to follow occupied seats and switch to the eight-player inventory only when all eight seats are occupied.

## Casual Play

- The same two-choice Map selector appears in Casual Play.
- Number of Players only offers **4 Player** and **5-6 Player** (never 7–8).
- Casual remains private, AI-only other than its human host; changing to the 5–6 category automatically fills the lobby to six seats with AI, as before.

## Invite links

- The room link is populated automatically in a read-only field.
- The former **Generate Link** button has become the only **Copy Link** button, placed directly beside the field.
- Removed the lower Copy Link button and its extra row; the link and button remain together at narrow widths.
- Existing ranked spectator-link behavior is preserved.

## Compatibility

- The server accepts `playerCount: null` from the new grouped setup UI to clear any old exact-seat target from an existing room, so games can start at any valid size within the selected map category.
- Legacy/API clients sending a specific numeric `playerCount` still retain the old exact-seat behavior.
- Saved scenario keys and custom-map file formats are unchanged.
- Cache and UI version advanced to V1.0.2; stylesheet, JavaScript and service worker revisions are synchronized.

## Validation

- TypeScript bootstrap build passed.
- **358 / 358 automated tests passed.**
- Includes v47-specific coverage for all six map family/size combinations, the Casual Play 4/5–6 restriction, one-click invite copying, seven-seat starts on large boards, and six-seat casual lobbies.

## Deployment

- Upload/redeploy the complete updated project for Cloudflare. The live game at hexsettlers.org is not modified by generating this ZIP.
