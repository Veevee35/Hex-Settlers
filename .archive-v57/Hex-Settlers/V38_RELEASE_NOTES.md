# Hex Settlers v38 — Casual Rules, Admin Dashboard, History Management & Health

## Casual rules browser
- The pre-lobby Rules screen in Casual Play now has four top-level tabs:
  Classic 2–4, Classic 5–6, Seafarers 2–4, and Seafarers 5–6.
- Each Seafarers tab has scenario tabs for every non-custom scenario available for that map size.
- The game rules body, scenario descriptions, setup requirements, and win target update as tabs change.
- The Casual game setup no longer exposes Classic Custom Map or Seafarers Custom Map options.
- The Node server rejects custom-map settings and editor operations in Casual Play, including old persistent casual rooms. Custom maps remain available in Unranked.

## Unified Admin Management
- The account orb menu has one **Admin Management** entry visible only to administrator accounts.
- Five tabs organize existing controls without changing server permissions:
  Server Management, Rating Management, User Management, Manage Game History, Health Monitor.
- **Manage Account** remains a separate, self-only page for the administrator. It shows the same personal account editing controls as a normal user's Manage Account screen.
- User Management inside Admin Management lists other users, supports password resets, merges and deletions, but not editing the admin's personal account there.

## Manage Game History
- Filter archived games by players, room code, winner, or map; page through records; select one or more games for deletion.
- **Download Full History** exports original full completed-game records, including packed replay and log data, as a `.json` history backup.
- **Upload History** validates a matching history backup format and merges by game ID. Existing game IDs are skipped, not overwritten. Game-count retention is enforced; import request payloads are capped at 64 MiB.
- **Delete Selected** requires an explicit phrase, a confirmation dialog, and creates a server-side backup first.
- **Reset All Game History** requires three separate checked acknowledgements, the exact phrase `DELETE ALL GAME HISTORY`, a final confirmation dialog, and a short-lived challenge bound to the admin and current history archive.
- Successful edits recalculate basic player game statistics from remaining history; rated score values are deliberately **not** silently rewritten. Rebuild ratings separately from the Rating Management tab if desired.
- Each destructive operation creates a timestamped server backup in the existing DATA_DIR volume prior to writing changes. A failed persistent write attempts to keep in-memory history unchanged.
- This page manages server history, not the locally saved replay packs that players downloaded or imported into individual browsers.

## Health Monitor
- Authenticated administrator-only endpoint provides live Node instance data: process CPU usage measured between refreshes (per logical core and as capacity percentage); process RSS and V8 heap memory; event-loop p99 and max delay; uptime and build/instance ID.
- Active rooms, open WebSockets, authenticated users, waiting / active / paused games, ranked queues, casual/ranked room counts, history retention and storage files (size + modified date).
- Disk-directory writability and configured email provider status.
- Refresh manually or automatically every 5 seconds while the tab is visible. All diagnostics are observations of the game-server process; they are not a host-wide CPU/Cloudflare infrastructure monitor.

## Security, compatibility and deployment
- All `/api/admin/*` routes require authenticated administrator cookie, origin checks, and the existing rate limiter.
- Custom maps continue to work for Unranked games and retain their download/upload format.
- App, stylesheet, and service-worker cache key updated to `features-v38`.
- Deploy the new Node backend **including `server/admin-history.js`** and the Cloudflare static frontend together.
- Keep the DATA_DIR or Railway persistent volume mounted; administrator exports, deletions, and imports require write access for server-side backups.
- No new environment variables or schema migrations are required.

## Validation
- `npm run check`: 340 tests passed, 0 failures. Includes new live administrator integration cases and updated Casual custom-map compatibility tests.
- Headless browser visual smoke testing was blocked by this environment's local-browser network restrictions. UI layouts have not been manually confirmed on a physical mobile device.
