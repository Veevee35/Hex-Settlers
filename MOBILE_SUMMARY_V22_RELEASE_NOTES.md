# Hex Settlers — Mobile Game Summary Layout v22

## Fix

The game-over header previously used three columns at every viewport size. On narrow mobile screens, the victory title and turn/time details could overlap the Main Menu, Rematch, Hide Stats, and text-size buttons.

- On mobile/touch screens, the winner and match details now occupy a full-width heading row.
- Main Menu and Rematch share a separate full-width navigation row.
- Text size adjustment and Hide Stats are on a distinct controls row, with all buttons remaining usable.
- Long winner names wrap instead of overflowing into buttons.
- The stats tabs remain horizontally scrollable and the result body remains vertically scrollable.
- Mobile browser dynamic viewport height and safe-area insets are supported.
- Desktop postgame headers and game rules are unchanged.

## Deployment

Updated `index.html` CSS and JS version tags and the service-worker cache key to `mobile-summary-v22` to prevent browsers from reusing the prior layout stylesheet. This archive contains the complete application and resources; it does not automatically deploy to Cloudflare.

## Verification

- 261 automated tests passed, 0 failed.
- Chromium layout snapshots and bounding-box checks showed no overlap between the heading, match metadata, buttons, or text-size controls at 320×640, 390×844, 844×390 (touch), and 768×1024 (touch). Desktop layout was also checked at 1280×720.
- The postgame stats content retains independent vertical scrolling on small landscape screens; tabs remain horizontally scrollable.
