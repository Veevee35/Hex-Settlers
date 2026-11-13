# Hex Settlers – Mobile Split-Screen Update v21

## Mobile and touch-tablet gameplay

- The existing right-hand game sidebar remains **permanently visible below the map** on mobile and supported touch tablets. It is not a modal or temporary drawer.
- A 28-pixel draggable divider between the board and the game panels lets players allocate more screen space to either view.
- The divider supports touch and mouse pointer capture as well as keyboard focus; Arrow Up/Down adjust by 4%, Page Up/Down by 12%, and Home/End jump to minimum/maximum.
- The panel-height preference is saved locally as a proportion of the available screen, so portrait/landscape rotation can preserve a sensible split. A quick Expand/Shrink Panels button is also available.
- The game panels have their own vertical scroll area to expose Resources, Development Cards, Game Log, bank and related information. The map stays independent and retains its gesture controls.
- Mobile action buttons, HUD and turn overlays remain positioned over the map instead of obscuring the scrolling panel.
- On desktop, the traditional right-side panel and its horizontal resize handle are unchanged.

## Cache and compatibility

- Updated application and CSS asset version tags and service-worker cache to `mobile-split-v21` to prevent stale layout assets.
- No game rules, account data, matchmaking logic, or server protocols changed.

## Verification

- All automated tests passed, including v21 regression checks.
- Chromium browser smoke-tested at 390×844, 844×390, 1024×768 (touch), and 1280×800 (desktop). Verified board/divider/sidebar boundaries, non-overlapping mobile controls, pointer resizing, keyboard resizing, and independent sidebar scrolling. Desktop retains side docking.

## Installation

Use the complete package as a replacement build with the same Cloudflare deployment procedure used for v20. The live site is not changed by creating this archive.
