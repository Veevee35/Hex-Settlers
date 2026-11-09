# Hex Settlers — unified visual design update

This build preserves all existing game rules, matchmaking, lobby logic, OAuth, deployment scripts, and Cloudflare/R2 configuration. It changes the client interface and adds a regression test.

## Pre-lobby consistency

- Added a **single global pre-lobby footer** for Terms of Service, Privacy Policy, the current version, and Ko-fi. It appears on sign-in, Change Game Type, Ranked, All Games, Public Lobbies, Lobby Details, Private Lobby, Casual / empty-lobby setup, and Lobby Not Found. It remains hidden during gameplay. The original entry-screen version nodes remain in the HTML for existing Cloudflare release version stamping; they're no longer shown twice.
- Standardized the dark navy gradient backdrop, gold eyebrow text, compact Hex Settlers emblem, typography, card borders, button styling, and padding. The pre-lobby footer adapts to desktop/mobile safe-area spacing.
- Standardized titles: **All Games**, **Public Lobbies**, **Private Lobby**, **Lobby Details**, **Ranked Play**, **Casual Play**, and **Create or Join a Lobby**.
- Made the All Games contextual Back button display the correct destination for Home, Public, Lobby Details, Private, and Settings while retaining its existing hierarchical behavior.
- Joined the empty-lobby heading and lobby form visually into one continuous surface. The existing contextual Back behavior (Casual → Game Types, unranked → All Games) remains intact.
- Updated the shared version label from `/api/build-version`, with the stamped HTML version as a fallback.

## Whole-app visual treatment

- Applied the same surface colors, border treatments, focus rings, and subtle lighting to lobby panels, controls, game HUD dock surfaces, modals, account menu, language selection, rules, stats/history, and endgame summaries.
- Preserved existing layout widths, draggable tools, board drawing, right-panel scaling, map preview, mobile splitting, and all player-assigned colors.

## Validation

- `node --check public/app.js` passed.
- CSS parsed without top-level errors (`tinycss2`).
- Targeted navigation and release-stamping tests passed (25/25).
- New shared UI shell tests passed (3/3).
- Full Node test run: 371 passed, 13 blocked by missing extracted dependencies (`ws` and the neural-AI JSON fixture); no new UI regressions were reported.

## Deployment

Deploy through the existing GitHub → Cloudflare workflow. The project version is not manually bumped in this ZIP; its existing Cloudflare build/version automation remains responsible for that.
