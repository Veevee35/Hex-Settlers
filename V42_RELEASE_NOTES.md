# Hex Settlers v42 — 7–8 Player Fog Island Corner Correction

Builds on the user-provided v41 full source. Fixes only the permanent 7–8 player Fog Island fog mask; other scenarios and custom-map editing are unchanged.

The **two corner hexes** previously visible near the 7–8 Fog Island center are now fog:
- Lower-left edge: axial `q=-3, r=3` (was visible land)
- Upper-right edge: axial `q=3, r=-3` (was visible land)

The **two isolated fog tiles** nearest the central fog region are now revealed terrain:
- Left-center: axial `q=-3, r=0` (was fog)
- Right-center: axial `q=3, r=0` (was fog)

The scenario still starts with 23 fog hexes, 30 visible producing hexes (and 30 visible number discs), 19 concealed producing hexes (and 19 hidden discs), 4 concealed sea hexes, 79 map hexes, and 11 ports. Uncover/discovery mechanics and scenario-specific randomization remain unchanged.

Verification: all 349 Node tests pass, including new precise coordinate checks in `test/v41-map-scenarios.test.js`. All source files and dependencies from v41 are retained in this full archive.

Deploy the updated game server (and any separately deployed client files) to apply this corrected preset. Existing ongoing matches are not rewritten; newly generated Fog Island boards use the correction.
