# Hex Settlers: organized beta readiness patch (based on V67)

**Release purpose:** recruit and observe an organized **80–150 simultaneous-player** beta while preserving the V67 mobile HUD, active game server, and Cloudflare Container/R2 deployment.

> **Capacity status:** 80–150 players is a load-test **target**, not a verified player limit. The shared Node.js container, AI decisions, board serialization, websocket fan-out, matchmaking, R2 flushes and Cloudflare container startup must be exercised in a live staging environment before scheduling 150 players. The automated WebSocket benchmark measures transport responsiveness only; it does **not** simulate completed games.

## What was added

- `/beta.html`: a public recruitment page describing the game and how to join an organized session. The existing All Games / home screen links to it.
- **Beta Testing** under the existing `admin.hexsettlers.org` management dashboard. The dashboard reports UTC-day signup/visit/game funnel, per-source recruitment, a daily trend, returning players, connection drops, client errors, and submitted bug/feature feedback. Analytics starts at deploy; it does **not** manufacture historical events.
- **Attributable recruitment links:** for example `https://hexsettlers.org/?ref=discord-groupname` or `https://hexsettlers.org/beta.html?ref=reddit-playmygame`. The latest valid referral is retained locally for 30 days and propagated to an account if the user signs in. Analytics stores pseudonymous hashed identifiers, not account passwords or messages. Visits are deduplicated per browser per 24-hour period; periods are reported as UTC calendar days.
- **In-game feedback:** `Report bug / Suggestion`, on desktop and mobile, with category, reproduction steps, room ID where available, build, and device class. It is delivered to an admin-only inbox; status may be New / Triaged / Fixed / Closed. Up to 300 reports retained, with a per-account abuse limit. Feedback is voluntary.
- **Tester recognition:** the first 150 eligible signed-in *non-admin* players who submit feedback or complete a tracked (non-casual) multiplayer game receive a Founding Playtester profile/account badge. Casual matches do not count toward completion recognition; leaderboard rules are unchanged.
- **Event planning:** management can add/delete dated sessions, publish the event list on the home and recruitment pages, and insert an official Discord invite when one exists. There is no invented Discord server or pre-populated invite.
- **Durable state:** all beta data is stored in `beta_program.json`, included in the existing Cloudflare R2 state bootstrap and sync allowlists. It is isolated from game history, accounts and lobbies; a 90-day retention policy prunes old analytics. No new environment secret is required.
- **Connection protection:** disconnect/reconnect and expired-room metrics; an 8 MiB outgoing-buffer cap on individual slow WebSockets; more frequent (30s) live occupancy sampling in the existing Game Stats pipeline. Existing Server Health reports CPU and memory.
- **Transport benchmark:** `scripts/beta-transport-benchmark.cjs`, an opt-in, staged WebSocket connection/ping check for staging; cannot silently attack a remote server.

## Publish to Cloudflare without moving production data

1. Back up your Cloudflare `STATE` R2 bucket and the current deployed project **before** replacing code. Keep the existing staging/production Worker/Durable Object/Container names and bucket bindings. If `hexsettlers.org` currently routes to your staging Worker, update **that** Worker; do not switch to a different production Worker by accident.
2. Replace the source repository with this full patched source (preserving your deployment secrets in Cloudflare, not in source). Push to the existing GitHub auto-deploy workflow using its present staging/production settings. The container's Dockerfile already includes `server/`, `public/` and `cloudflare/bootstrap.mjs`.
3. After the deploy becomes healthy, check `https://hexsettlers.org/health`, `/beta.html`, and `/api/beta/sessions`. The public sessions endpoint should return `{"ok":true,"sessions":[],"discordInvite":""}` before your first event (or your configured values after setup).
4. Log into `https://admin.hexsettlers.org/`, open **Beta Testing**, optionally save your *real* Discord invitation URL, and create two specific session windows. If you haven't created a Discord server, leave that field blank.
5. Copy a distinct referral link for each source (`reddit-playmygame`, `discord-strategy`, `yt-creatorname`), rather than using one universal URL. Ask each community moderator for posting permission first.
6. In two browsers, verify `/beta.html`, the home-page session calendar, a referral-linked signup, the feedback form and its admin inbox; switch status to Triaged. Test both desktop and mobile and check that Resources, Roll Dice, End Turn, and Back/Pause/Play remain accessible.
7. Verify `beta_program.json` is reflected in your existing **R2 state bucket** after a first real visit/feedback and survives a controlled container restart; do not erase the state bucket or reset player history. Allow up to 30 seconds for batched noncritical analytics to flush.

## Staged test: 80–150 genuinely active players

- **Warm-up:** 25 concurrent WebSocket connections, then 50, 80, 100, 125 and 150, in a *staging environment* or an explicitly authorized testing window.
- **At each stage:** form 4–8-player rooms and play through entire games with humans/AI, ranked queue, public lobby joins, reconnect, tutorial, challenge maps, and at least one mobile browser cohort. Measure not merely connected sockets but live games and successful *completions*.
- **Monitor:** `admin.hexsettlers.org` > **Server Health**, **Game Stats**, and **Beta Testing**. Record p95 action-to-state latency externally, process RSS/heap and CPU, `/health` 5xx, websockets lost, abandoned rooms, rejoin correctness, game completion rate, and data persistence after a restart. A rising backlog, disconnections, CPU pegging, large memory growth or failing persistence is a **stop/go** signal.
- **Measure:** 30–60 minutes at 80 players, then 30–60 minutes at 100–125, then at 150 *only if previous stages are stable*. These are proposed test durations, not predictions of how long the server can run.
- **Capacity acceptance is not automatic:** set your own latency/error thresholds before the live session; published Cloudflare per-object request/connection limits are not guarantees for the current shared container architecture.

### Optional WebSocket baseline

Requires dependencies installed on your testing machine (`npm ci`). This opens idle connections and sends one `client_ping` per second per connected client, measuring response latency. It does **not** perform authentication, AI games, settlements, trades or gameplay broadcasts.

```bash
# Local baseline
node scripts/beta-transport-benchmark.cjs --url ws://127.0.0.1:3000/ws --stages 25,50,80,100,125,150 --seconds 30 --output beta-transport-results.json

# STAGING ONLY; run when your staging deployment is stable and you are authorized to load-test it.
node scripts/beta-transport-benchmark.cjs --url wss://YOUR-STAGING-HOST/ws --allow-remote --stages 25,50,80,100,125,150 --seconds 30 --output beta-transport-results.json
```

This benchmark intentionally omits the Cloudflare proxy-token handshake headers in projects that require them. Use the public Worker WebSocket endpoint, not the unexposed container URL. It must be supplemented with genuine full-game traffic at realistic turn pacing.

## Known limits / verification status

- No actual live 80–150-player load test or production deployment was performed when preparing this package. Do **not** claim 150-player capacity from unit tests.
- The new backend plus representative V67 mobile HUD, Cloudflare state sync, admin Game Stats and account navigation tests pass in this source environment. TypeScript bootstrap and changed JavaScript files pass syntax checks.
- The full historical suite was not green in the preparation environment: many server integration cases could not execute because the `ws` package was unavailable and a local dependency install stalled; additional old tests appear written for earlier releases. Run `npm ci`, `npm run build`, and `npm test` in a fully provisioned CI container before a full public launch; investigate remaining failures.
- Referral analytics does not collect personal emails/IP addresses in its stored file and does not include an external analytics vendor. The WebSocket transport benchmark cannot certify game-state correctness. Scheduled sessions are informational; they do not automatically create lobbies or reserve a seat.
- This patch does not create or administer a Discord server; publishing an official invite is opt-in. It also does not modify your existing public privacy policy beyond disclosing beta telemetry/feedback.

## Beta moderation and recruitment

Recruit **80–150 humans**, rather than 150 simultaneous idle sockets. Start with invited testers and a Discord LFG channel. Schedule sessions at one or two specific times instead of sending visitors to empty ranked queues. Ask mods of relevant Discords/subreddits before advertising. Encourage testers to provide a *reproducible bug, their device, and their game version*; review feedback in Beta Testing. Use distinct links to compare which communities lead to completed games, not just visits.
