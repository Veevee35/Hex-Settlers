# Challenge Maps — Full-Width Tabbed Layout

## What changed

- The Challenge Maps view now expands the existing All Games portal card to the available browser width. Only this view is affected; the remaining pre-lobby screens retain their existing compact sizing.
- Exactly one weekly scenario is shown at a time. Five tabs at the top select the 4-, 5-, 6-, 7-, and 8-player weekly Scattered Tiles challenge maps. The selected tab is visibly highlighted and marked with `aria-selected`.
- Keyboard users can switch tabs with Left/Right, Home, and End. On mobile, the tab bar scrolls horizontally without expanding the viewport.
- The selected map has a larger preview on the left and a wider sortable leaderboard on the right for desktop. The map and leaderboard stack vertically on smaller screens.
- A highlighted **Weekly #1** panel appears on the upper-right of the challenge view. It shows the *official* top-ranked player for the currently selected map, with turns to win, completion time, and total VP. Empty leaderboards show a first-place invitation instead of stale data.
- The per-scenario sort state and selected player count are retained during weekly catalog refreshes. Changing a column's sort does not change the official top player or permanent rank labels.
- Create Lobby still uses the selected challenge's player count and existing room-creation protocol, rules, and stats. No database, server protocol, or Cloudflare binding change was required.

## Deployment

Replace the existing project with this complete ZIP, commit/push to the GitHub repository connected to your Cloudflare Worker, and let the existing Cloudflare deployment run. A hard refresh may be needed if a browser has cached styles. The admin.hexsettlers.org migration and leaderboard scoring logic from the input build remain included.

## Verification

- `npm run build` — passed.
- `node --check public/app.js` — passed.
- `node --check server.js` — passed.
- `node --test test/challenge-tabs-layout.test.js test/challenge-leaderboard.test.js test/challenge-maps.test.js` — 14 tests passed.

The page was not verified end-to-end against a live Cloudflare account or real WebSocket data. Browser screenshot validation was unavailable in this environment; targeted structural and scoring tests passed.
