# Hex Settlers v37 — Fixed clock width and wrapped action messages

Based on: Hex-Settlers-v36-Mode-Switching-Matchmaking-Full(1).zip

## Changes
- Fixed the in-game turn clock's **outer** desktop width at 190 px, including border and padding, to match the clock in the supplied screenshot. It no longer expands for long player/action messages.
- Reserved a fixed 190 px desktop clock height. The colored action/status message below the timer is now 11 px, wraps naturally at word boundaries (and safely breaks long tokens), and stays inside a scrollable area if a message exceeds the reserved space. The clock itself does not resize while the action text changes.
- Mobile clocks use the same capped 190 px width and fixed 176 px height, with a compact 150 px height on short landscape screens. The box remains fixed-size within each viewport layout.
- Updated the browser asset version, service-worker registration, and service-worker cache name to `features-v37` so the new styles refresh on deployment.
- Added v37 regression tests for fixed dimensions, wrapping, and caching; refreshed older cache-key assertions to the current version.

## Notes
- The in-game timer's existing scaling controls, drag behavior, and colors are preserved.
- Full application/server logic and bundled dependencies remain unchanged from v36.
