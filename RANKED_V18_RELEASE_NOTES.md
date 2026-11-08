# Hex Settlers — Ranked Lobby v18

This release updates **front-end presentation only**; ranked voting, queueing, game rules and server-side rating calculations are unchanged from v17.

## Ranked lobby
- Replaced inherited scrollable, oversized lobby styling with a viewport-fitting layout at desktop and laptop sizes.
- Retained large, interactive randomized scenario map previews, with height responsive to viewport size and compact ballot headings/instructions.
- Combined spectator-link controls and account information into one row; tightened texture-pack controls, player cards, and color selector.
- Fixed overflow and wrapping for scenario names, vote counts, and long player names.
- Positioned the Rules button away from the top-right account orb.
- On small or short screens, the lobby intentionally scrolls so interactive controls are not clipped.
- Removed the misleading “(host)” label for ranked players, while preserving host labels in unranked rooms.

## Legal links
- Added Terms of Service and Privacy Policy buttons at the bottom-left of the **login** and **change game type** screens.
- Both open a dark, accessible in-app document dialog with a visible Close button, Escape dismissal, backdrop dismissal, and a link to open the document in a separate tab.
- Published `public/terms_of_service.html` and `public/privacy_policy.html` for direct access by Cloudflare Assets and local/static hosting.
- The published policy content matches the existing root documents. The operator should review these documents for legal accuracy before production use; implementation does not constitute legal advice.

## Verification
- Node test suite: 248 tests passing (includes 3 regression tests added in v18).
- Headless Chromium checks: desktop lobby fits without scrolling at 1024×768, 1280×720, 1366×768, 1731×865, and 1920×1080. The Rules button does not intersect the account orb. Dialog actions tested on both portal screens.
- Desktop screenshots used a mocked ranked UI with the real v18 layout/style; live end-to-end ranked matchmaking was not rerun for this cosmetic update.
- Updated asset and service-worker cache versions to v18.

Deploy the **whole** updated `public/` folder (including both HTML policy documents), plus any other files required by your hosting workflow.
