# Hex Settlers v30 — mobile lobby and friends

- Friends: username request form gives generic “Request sent.” response for existing/nonexisting/already-friended names; lobby members can invite online friends with an authenticated server-side check. Ranked invitations are watch-only.
- Mobile unranked lobby: full-height scrolling settings panel, map hidden initially; bottom-right Map button opens a closable bottom drawer.
- Ranked voting maps: fixed intrinsic 3:2 aspect-ratio, no CSS stretching on narrow devices. Ranked lobby hides obsolete full-board canvas.
- Mobile gameplay: safe-area spacing for navigation bar and removal of blank second row if Back/Pause/Play are unavailable.
- Turn prompts: Your Turn and Extra Turn badges sit after Roll Dice instead of above it, on both screen sizes.
- Board repaint: pixel backing store resynchronized on flex layout changes; full-canvas clipping and offscreen-tile culling prevent overdraw artifacts when dragging near action controls.
- Static asset version and offline cache key bumped to v30.
