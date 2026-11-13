# Hex Settlers v52 — Expanded Offline Language Pack (V1.0.5)

This release is based on the user's working v51 GitHub Auto-Deploy source ZIP. Deployment still targets the existing `hex-settlers-cloudflare-staging` Worker, its existing R2 bucket, and the already-connected GitHub branch. **No server behavior, Cloudflare bindings, or persisted game records have been modified.**

## Scope

- Added `public/locale-expansion.js`, a 29-locale translation extension loaded **before** the existing `languages.js` selector, preserving every previously configured language preference and overriding older strings only with existing curated v50/v51 translations where needed.
- Added approximately **160 new translated English UI phrases in each of the 29 non-English locales**, for **202–221 translated dictionary entries** per locale including the original pack. These include the login and game-mode screen descriptions; the lobby, replay, friends and account controls; road/ship/settlement/city actions; development cards and largest-army/longest-road labels; map/scenario names; trade and bank/resource labels; statistics; texture packs, audio and map editor operations.
- Reuses translations for **explicitly recognized numeric labels** (such as `Ranked rating: 1000`, `Remaining in deck: 14`, and `5-6 Player`) without changing the number or any game protocol data.
- Localizes tooltip titles, input placeholders, image alt text and accessibility labels as well as visible text, including content generated after load.
- Player names, chat messages and room identifiers remain as written. UI-language selection remains local to the device; no third-party service, API key or transmission of chat text is involved.
- Relocalizes the visible board-mode label after a language change. The GitHub build-time cache stamper and manual version bumper include the new locale script, so subsequent pushes pick up new translations without a manual cache clear.

## Remaining English fallback

This release is a **major expansion, not 100% translation**. Some long rules descriptions, detailed advanced settings, dynamic server-generated prompts, game-log narratives and user-generated content still appear in English. Those UI messages can be added to `public/locale-expansion.js` as stable English source keys. Avoid translating game protocol IDs (`road_building`, action codes, resource IDs) or dynamic player-supplied text.

## Deploy

1. Extract the archive and merge its contents into the root of the GitHub repository already connected to Cloudflare Builds. Preserve the existing repository `.git` directory and any private local data.
2. Commit and push to `main`. The existing GitHub-to-Cloudflare build will deploy the revised assets and container automatically. **Do not create a new Worker or replace the existing R2 bucket.**
3. On the login page select **Language**, choose a non-English language, then verify the game-mode selection, lobby, resource panel, trade buttons and history labels. Switch languages back and forth to confirm stored text changes without affecting game state.

## Validation

- Full Node test suite: **387/387 passed** with locally available historical neural-AI reports and local `ws` dependency. Generated training reports and `node_modules` are excluded from the deploy archive.
- Syntax checks: `app.js`, `languages.js`, `locale-expansion.js`, version scripts.
- New tests: 30 languages loaded, game terminology translated in each, numeric UI labels preserved, English fallback, no translation of arbitrary text, new script included in GitHub cache stamp.
- No live Cloudflare deployment or manual native-speaker review was performed.
