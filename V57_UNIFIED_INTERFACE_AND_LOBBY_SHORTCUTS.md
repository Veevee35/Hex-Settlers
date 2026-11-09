# Hex Settlers — Unified Interface and Lobby Shortcuts

This update starts from **Hex-Settlers-Back-Button-Navigation-Fix(2)** and preserves the same Cloudflare Workers / Durable Objects deployment structure and gameplay rules.

## Shared appearance

- Added `public/unified-theme.css` with a consistent dark navy, muted-gold/blue interface, unified cards, inputs, buttons, focus states, account menu, and postgame surfaces. Original game imagery, player colors and independent HUD scaling controls are retained.
- The login, game-type, All Games, public/private lobby browser, ranked, unavailable-lobby, account-registration, and no-room Casual/Unranked pages now have coherent headers, cards, navigation actions and descriptions.
- The Terms of Service, Privacy Policy, version indicator, and Ko-fi link now appear on those pre-lobby screens. Ko-fi is text-based rather than dependent on a third-party image asset.
- The mobile layout keeps legal links, version and Ko-fi separate and accessible; tall cards scroll within the available viewport.

## Gameplay and lobbies

- Removed **Download selected** and **Upload Game Replay** from the in-game **Game Log** side panel. Replay download/upload remain available in **Game History**.
- At 1100px and wider, the game summary lays out 7-player games as **4 + 3**, and 8-player games as **4 + 4**. On narrower screens it uses two columns, and on phone-sized screens one column, to keep the cards readable.
- Added **Fill Lobby to Max** adjacent to the AI difficulty/fill selector. It uses the currently permitted lobby capacity and the existing `fill_ai` server message, and is available only to the host or an authorized boss before the game starts. It disables itself when all seats are filled. Existing select-to-fill behavior is preserved.

## Build and versioning

- The new CSS file is included in both the manual version-stamping script and the Cloudflare commit-stamping script, so it gets a fresh asset URL after deployment.
- Updated tests whose old assumptions conflicted with the requested UI changes, and added `test/v57-unified-appearance-and-ai-fill.test.js`.
- No manual version bump is performed by this source update. Continue using the existing Cloudflare deployment workflow.

## Verification

- `node --check public/app.js` and `node --check server.js` passed.
- Focused regression tests passed (15/15).
- Desktop and phone-size rendering checks completed; the seven/eight-player summary grid showed the intended 4+3 and 4+4 desktop layouts.
- 354/358 of the tests not directly importing `ws` passed. The four failures were blocked because this offline workspace does not have the `ws` package installed. Live multiplayer integration was not exercised here; normal dependency installation in CI/build is still required.
