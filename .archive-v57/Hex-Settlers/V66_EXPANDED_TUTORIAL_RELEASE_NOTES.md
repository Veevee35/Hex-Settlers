# Hex Settlers V66 — Expanded Guided Practice

Based on the complete V65 resource-panel restoration build. No production games, ranked settings, challenge maps, admin tools, or user statistics rules were intentionally changed.

## Practice room and replay
- Dedicated, private, unrated practice against a single AI. Uses Seafarers: Heading for New Shores so roads, coastal ships, and settlements all use the actual engine's legal building rules.
- **Begin practice game** always starts a session in a new tutorial lobby, regardless of the account's prior tutorial completion.
- **Restart practice game** at the end resets the game server-side, creates a fresh board and resources, and clears the checklist. Leaving an incomplete tutorial does not set the account-completed flag.
- A practice helper can place a free demonstration harbor or connected access route when the player has no legal ship or settlement path. This is always labeled as a practice helper. The student still places the required ship/settlement themselves.

## Required actions and guidance
- First and second initial settlements and their connected routes, resource/number/distance explanations, turn order, dice and resource production.
- Start each practice match with a **server-issued starter kit** of at least 7 brick, 8 lumber, 7 wool, 8 grain and 8 ore (when drawn from bank stock) after the setup round, enough to purchase all five structure/development-card types plus trade and discard exercises. Training AI also receives a trade hand.
- Purchase and complete: city upgrade, development card, road, ship, expansion settlement, bank trade, player trade (with AI response and server-validated finalize).
- Script an AI seven *after* the build/trade checklist to trigger a real out-of-turn discard event; script the player's next seven afterward to move the robber or pirate and attempt a steal. All dice follow the normal algorithm in non-tutorial games.
- Separate desktop and touch-first guide content. Desktop: scroll-wheel zoom/panning, tools, sidebar handles, audio. Mobile: touch zoom, bottom game tabs, split divider, touch-scale buttons, audio.
- Tutorial completion requires the successful checklist, both seven experiences, and explicitly finishing the UI tips. Prior account completion does not short-circuit a replay.

## Changes by source
- `server/tutorial-guide.js`: pure progress and scripted-dice helper.
- `server.js`: tutorial room rules, starter inventory, progress, route helpers, replay and completion handlers, tutorial-only AI trading and dice.
- `server/protocol.js`, `src/shared/protocol.ts`: new protocol requests.
- `public/app.js`: independent desktop/mobile guide text, progress states and UI navigation.
- `public/index.html`, `public/styles.css`: new guide helper, responsive panel styling, cache-busted JS URL.
- `test/v66-guided-tutorial.test.js`: progress, dice, protocol and replay regressions.

## Verification
- Syntax checks and all focused V66 tests pass, plus V59 and V62 adjacent-feature suites. Live Cloudflare/browser gameplay has **not** been verified in this workspace; deploy to staging and complete one desktop and one mobile tutorial before production rollout.
