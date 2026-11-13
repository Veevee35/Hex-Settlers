# V67 — Mobile HUD Restoration

## Fixed

- The mobile game now completes its HUD update after moving the bank/hand resources dock into the pinned strip beneath the board.
- The resource renderer can populate opponent summaries and the bank and personal resource strips on phones and tablets.
- Roll Dice, End Turn, and the Back/Pause/Play controls are no longer stranded in their pre-game hidden state by a sidebar layout exception.
- The three independent desktop Resources / Game Log / Development Cards / Bank Resources sliders remain available on desktop, and are intentionally not inserted into the mobile tab layout.
- Rotation and desktop-to-mobile viewport changes remove desktop-only splitter nodes before the mobile dock is used.

## Root cause

V62's four-section desktop slider routine called `rightSidebarInner.insertBefore(handle, panes[3])` after `panes[3]` (the bank/hand dock) had moved to `#mobilePinnedResources`. `insertBefore` throws `NotFoundError` if its reference node is no longer a child of the target. The exception interrupted `updateButtons()` between HUD docking and button/resource rendering, causing the apparently unrelated missing HUD controls and empty Resources tab.

## Implementation

`ensureLogDevSplitter` now runs only if the screen is in desktop mode and all four pane nodes belong to the same desktop sidebar. Otherwise it removes desktop-specific dividers, schedules the normal split-style cleanup, and lets `updateButtons` proceed to the game controls and `renderResources`. No changes to game rules, AI, turn ordering, or player statistics.

The CSS, client JS, preload script, and service-worker asset revision are aligned to `release-v1.0.67` to prevent cached V66 scripts from surviving a new deployment.

## Verification

- Focused DOM regression tests cover the mobile dock relocation, desktop dividers, viewport transitions and the presence of the HUD controls.
- Existing resource-rendering tests cover four player summaries, the five bank resource icons, five personal resource icons and spectator display.
- Simulated mobile browser layout shows Roll Dice and End Turn under the board, Back/Pause/Play in the action bar, the pinned bank/hand strip, and the player list in the Resources tab.
- End-to-end testing in a deployed Cloudflare game is still required.
