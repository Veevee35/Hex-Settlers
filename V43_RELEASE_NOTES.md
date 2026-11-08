# Hex Settlers v43 — Unified Cartographer/Scattered Tiles and Eight-Seat AI Fill

Built from the supplied Hex Settlers v42 full archive. All v42 Fog Island corrections and v41 7–8-player map counts are retained.

## Changes

- Replaced the four separate **Cartographer — 7-player**, **Cartographer — 8-player**, **Scattered Tiles — 7-player**, and **Scattered Tiles — 8-player** dropdown entries with only **Cartographer** and **Scattered Tiles**.
- These options use the permanent, stable scenario IDs `cartographer_78` and `scattered_tiles_78`. The server derives the appropriate 7-player or 8-player map inventory from the **number of active player seats**, including AI, rather than relying on a hardcoded UI choice.
- With 7 occupied seats: Scattered Tiles uses 48 sea tiles, seven of each land type, 42 number discs, and 9 ports. With 8 occupied seats: Scattered Tiles uses 41 sea tiles, eight of each land type, 48 number discs, and 11 ports. Both use the original 97-hex board footprint.
- Cartographer uses the corresponding 7- or 8-player drafting inventory, number-disc pool, and 9 or 11 ports, as applicable. The server locks the resolved scenario version into the game rules at game start, so subsequent room changes cannot alter a running draft.
- Lobby previews automatically switch their map pool when the eighth seat is filled or emptied, regardless of whether that seat is a human or AI. Existing players receive updated previews when a joining human changes the player-count tier.
- Fixed the AI fill dropdown to use the **server-provided eight-seat lobby capacity**, rather than checking only custom-map status. Every unranked 7–8-player lobby, including Classic, all permanent Seafarers options, and custom-map modes, can fill to 8 AI-inclusive seats. The host can also reduce back to 7 using the dropdown.
- Removed the start-game validation tying the old 7- or 8-player scenario keys to an exact headcount; the general 7–8-player requirement still applies.
- Legacy `_7` / `_8` scenario keys remain recognized for existing saved game rules and replays. The updated UI presents them under the single corresponding scenario choice.
- Updated the in-game rules guide for the unified options.

## Verification

`npm run check` — all 351 Node tests pass; TypeScript bootstrap compile, Node server syntax, and browser JS syntax checks pass. The new integration suite checks automatic 7↔8 switching on AI fill, AI departure, eighth human arrival, Scattered Tiles component counts, starting Cartographer drafts with 7 or 8, and AI capacity across every 7–8 map category.

## Deployment

Deploy the updated server **and** `public` client assets together. Do not deploy only the HTML: the server now resolves the unified scenario keys and rebuilds previews based on occupancy. No production deployment has been performed in this archive.
