# Hex Settlers — Resources and Turn Controls v29

Based on the user's v28 build. No game rules, scoring, account records, server persistence, or networking protocol changes.

## Updates

1. Resource artwork and badges
   - Resource icons in live game resource cells are enlarged on desktop and mobile.
   - Counts appear in centered, high-contrast, round dark badges over the resource icon rather than beside it.
   - Resource cells include a descriptive accessible label (resource name and count) for assistive technology.
   - The five-resource grid remains intact at narrow sidebar and phone widths.

2. Desktop floating Resources
   - When the player hides Game Panels on desktop, a compact Resources window appears with the existing player summaries, bank resources, and the player's hand resources.
   - The header is draggable. Position is stored per player like the movable countdown clock, with constraints keeping it in the board area.
   - Showing Game Panels returns the original Resources elements to the sidebar. No duplicate counters or independent resource state is created.
   - Mobile is unaffected: the bank/hand resource strip stays pinned above the split-screen panel as before.

3. Bottom toolbar scale
   - The bottom action bar's size setting also scales the freestanding Roll Dice and End Turn controls (width, height, padding, and text) on desktop.
   - Existing measured bar height still determines the controls' vertical offset, so they stay above the bar.
   - Mobile uses its existing resolution-based sizing.

## Testing

- Browser resource-badge layout checks: Chromium at 1440x900, 1060x768, and 390x844. Number badges centered on icons; floating window stayed within viewport.
- Browser turn-button scaling checked at 60%, 100%, 150%, and 200%. Actual button heights after CSS transitions: ~28, 46, 69, 92px.
- 254 dependency-independent tests passed, 0 failed, including new resource/floating-window/turn-scale checks.
- Complete `node --test` invocation: 270 passed, four blocked by the missing `ws` dependency (the dependency is declared in package.json but is not bundled in the uploaded ZIP). Re-run after `npm ci` in a network-enabled environment.
- Client syntax: `node --check public/app.js` passed.

## Deployment

Use the normal Cloudflare Workers deployment workflow. v29 cache keys in HTML, JS, and service worker are updated to `resource-popout-v29`. Live production was not modified.
