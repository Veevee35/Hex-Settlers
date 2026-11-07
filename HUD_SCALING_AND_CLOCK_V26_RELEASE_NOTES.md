# Hex Settlers — HUD Scaling & Mobile Clock v26

Built from Hex-Settlers-Global-Unranked-Rating-v25.zip. This release changes the in-game interface only; ranked/unranked scoring and game rules are unchanged.

## Fixed

1. **Roll Dice / End Turn:** Desktop's standalone turn buttons use the measured height of the lower action bar. A ResizeObserver updates `--hud-bottom-bar-height` when UI scaling changes the action bar, and the button dock always sits above the bar instead of overlapping it. On mobile, the dock and action bar continue to occupy independent flex rows.
2. **Top toolbar scaling:** Tool buttons can be enlarged without covering the pinned scale controls or account orb. The buttons scroll inside their own available-width area; scaling is not applied to the entire toolbar row.
3. **Mobile Build dropdown removed:** The additional Build dropdown and its generated proxy actions were removed. Normal node/edge board-building interactions were retained; this does not change game rules.
4. **Draggable mobile countdown clock:** Drag any non-interactive part of the clock to reposition it. Movement is constrained to the visible game area, below the top tools bar and above the standalone Roll Dice / End Turn controls. The player-specific saved position is restored and clamped to valid bounds; position is updated on layout changes.
5. **Short landscape phones:** The compact lower-panel, resource-strip, and action-control sizing reserves enough board space for a movable clock rather than shrinking the canvas to a nearly zero-height strip. Lower panels remain scrollable.
6. **Cache-busting:** Changed app.js, styles.css, and service-worker build keys to `hud-drag-v26`.

## Validation

- `node --check public/app.js` and `node --check server.js`: pass.
- `tsc -p tsconfig.bootstrap.json --noEmit`: pass.
- Dependency-independent automated suite: 244 tests passed, 0 failures.
- Full suite: 260 passed, 4 could not complete because the uploaded archive did not supply the runtime `ws` dependency. Those cases include server integration and neural-objective tests; no failures were found in the available independent suite.
- Chromium simulated gameplay at 1024×768, 1280×720, 1731×865 desktop, 390×844 portrait mobile, 844×390 landscape mobile, and 1024×768 touch tablet. Verified scaled action bar clearance, scaled top bar controls/orb separation, clock movement/clamping, and the absent mobile Build menu.

**Deployment:** The build is not deployed automatically. Deploy through the existing Cloudflare workflow. The ZIP contains sources and assets, not `node_modules` or Git history.
