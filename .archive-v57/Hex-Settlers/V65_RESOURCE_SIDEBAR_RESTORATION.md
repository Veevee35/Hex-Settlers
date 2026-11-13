# Hex Settlers V65 — Resource Sidebar Restoration

## Issue corrected
V64's `renderResources()` cleared the player summary and bank/personal-resource dock before referencing an undeclared `roleLabel` variable inside its player-loop. In any live game with occupied player seats, that threw a `ReferenceError` and aborted the render, leaving both the player list and bank/personal resource displays empty on desktop and mobile.

## Fixes
- Removed the out-of-scope `roleLabel` check in the in-game resource player loop. Active player seat badges retain their own colors. Lobby spectator rows are still uncolored through the explicitly scoped `appendMemberRow(p, roleLabel)` function.
- Removed the same undeclared variable use from the spectator-link player roster (which lists player seats, not spectator rows).
- Kept the existing per-player CARD/DEV/KP/LR/VP, personal 5-resource hand, bank 5-resource inventory, and remaining road/ship/settlement/city displays and layout logic unchanged.
- Preserved V62–V64 right-side resize handles, movable divider state, mobile pinned bank/hand display, and mobile Resources tab.
- Bumped the HTML app script's cache-busting URL from `release-v63` to `release-v65` so users receive the updated renderer after a Cloudflare deployment.

## Regression coverage
`test/v65-resources-sidebar-regression.test.js` executes the real client `renderResources()` function in a lightweight simulated DOM. It asserts populated four-player summaries, correct bank/hand resource counts and icons, building-piece counts, spectator privacy behavior, and absence of unbound `roleLabel` references in player-list functions. All five new tests pass.

## Notes
Live deployed browser verification has not been performed. Existing old tests that compare literal historical JS or cache-key snippets may need updating as the application's architecture evolves; they are not a measure of this renderer fix.
