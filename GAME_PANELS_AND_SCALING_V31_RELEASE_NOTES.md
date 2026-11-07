# Hex Settlers v31 — Game Panels, Resources, Scaling

Based on the complete **Hex-Settlers-Mobile-Friends-v30-Full(1).zip** project supplied by the user.

## Changes

1. **Full-width Resources tab on mobile** — hide the duplicate Resources heading inside the content area (keep the Resources tab button). Change its card to block layout and expand player summary rows across the full width, instead of displaying the title in a left column and squeezing the stats rightward.
2. **Desktop Game Log / Dev Cards adjustable split** — new horizontal separator between these panels. Drag vertically to allocate more space to the Game Log, down to a compact Dev Cards view; supports ArrowUp/ArrowDown (Shift for larger steps), Home, End. Save the split fraction in localStorage so it persists and adapts to viewport/sidebar height changes.
3. **Development Card clipping** — keep Development Cards header and cost text at top; cards remain directly below the note. As the Game Log grows, the card list's visible height decreases, clipping/scrolling from the bottom rather than pushing cards beneath a large blank area. Minimum remaining height adjusts for larger text scale to reveal the top of the hand when possible.
4. **Up to 300% for all existing tab and tool scaling controls** — update independent scale caps from 200% to 300%, retaining the persisted settings and 10% steps. This affects existing controls; it does not add new scaling controls to mobile layouts that previously hid them.
5. **Resource icon scaling** — remove the percent-width cap that stopped resource art from growing with its parent zoom while count badges continued scaling. Permit horizontally scrollable five-icon strips when large scales exceed the available panel width.
6. **Fresh frontend asset version** `log-dev-resources-scale-v31` used by HTML, app JS, and service worker to avoid loading stale cached CSS/JS.

## Testing

- `node --check public/app.js` and `node --check server.js` pass.
- 281/285 automated tests pass. Four server/integration-related test failures stem from the unavailable `ws` package in the testing environment, not failed assertions about the changes in v31.
- Targeted v31 tests (6/6) pass, including scale limits, resource width, divider input/persistence, card clipping and icon sizing.
- Chromium layout fixture checks: mobile Resources tab at 390px viewport occupies full 372px inner width; desktop split renders visible Game Log and Dev Cards sections; resource art grows from 48px to 144px with 300% zoom (before any additional browser scaling).

Deploy the entire ZIP or apply the changed files to the existing v30 build. Server dependencies must still be installed according to package.json for live deployment. Test on real devices before relying on the mobile layout.
