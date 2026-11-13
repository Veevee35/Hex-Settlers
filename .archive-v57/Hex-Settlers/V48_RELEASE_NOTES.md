# Hex Settlers v48 — Scenario Rules, Server Health & Security

**Based on:** User-supplied v47 full build. **App version:** V1.0.3.

## Corrected rules display

- The in-game Rules dialog now reads the actual running game's scenario key and
  maps it through the same scenario metadata catalog used by the lobby rules.
  This fixes mislabeled 7–8 scenarios (notably Eight Islands reporting Four Islands).
- The dialog properly distinguishes Classic 4/5–6/7–8 and Seafarers 4/5–6/7–8.
- It displays the active server-supplied victory target, development-card deck,
  resource limit, exploration setting, friendly robber flag, dice algorithm,
  discard limit, timers, and paired-turn note. Legacy scenario aliases remain.
- The lobby rules text for 7–8 Scattered Tiles/Cartographer now specifies that
  the eighth **occupied seat** (not a dropdown capacity choice) changes the map.

## Connection stability

- Client heartbeats retain RTT and verify the connection and room identifiers.
- Client forces a reconnect if server heartbeat acknowledgments disappear for
  approximately 60 seconds, even when the network claims the socket is open.
- Server continues WebSocket ping/pong and includes connection/room identifiers
  in the application-level heartbeat response.
- Room rebind/reconnect refreshes legitimate player activity, retaining the
  prior lobby recovery flow. Active games with connected clients are not
  automatically closed for inactivity.

## Automatic room cleanup

Cleanup scans every 60 seconds and notifies clients before removing rooms:

| Room status | Expiry policy |
|---|---|
| Waiting lobby, no open sockets | 20 minutes since last player interaction |
| Waiting lobby, at least one open socket | 60 minutes without player interaction |
| Completed game, no open sockets | 10 minutes after game completion |
| Completed game, open socket(s) | 45 minutes after game completion |
| Active game, no open sockets | 2 hours since last activity |
| Active game, open socket(s) | Kept open |

Rooms now persist `lastHumanActivityAt` and `finishedAt`; old saved rooms
are checked against these leases before restoration. Timers, state broadcasts
and client heartbeat polls no longer artificially extend idle-lobby leases.
The game-history archive remains separate from active-room cleanup.

## Security hardening

- Spectators can follow a player but cannot read private resource cards or
  development-card identities before the match ends.
- WebSocket requests: 300 total messages/10 seconds per connection and 140
  expensive messages/10 seconds, with a policy close when exceeded.
- Oversized messages are rejected before JSON parsing.
- `edit_preview_grid` legacy requests are removed from the client and server;
  tile painting and portable JSON remain supported.
- Cloudflare static asset responses now have CSP, anti-framing, no-sniff,
  referrer, permissions, and (on HTTPS) HSTS headers.
- Optional origin shield: Railway `HEX_UPSTREAM_SHARED_SECRET` matches Cloudflare
  Worker `UPSTREAM_SHARED_SECRET`. The Worker strips any player-supplied copy
  and injects its own value. With the backend secret set, unauthenticated
  direct origin HTTP and WebSocket connections are refused.
- Fresh built-in administrator provisioning now requires an explicit private
  `HEX_ADMIN_PASSWORD`, rather than printing one into server logs.

## Scope of testing

`npm run check` includes TypeScript bootstrap compilation, the full Node test
suite (including game setup, map inventories, rules, spectators, auth,
multiplayer, replays and ranking), and JS syntax checks. Local HTTP/WS
integration tests verify optional origin-secret enforcement.

**This is not a live production penetration test.** A local review cannot prove
there are no vulnerabilities, nor can it guarantee production uptime. Follow
`V48_SECURITY_AND_RELIABILITY_AUDIT.md` for residual risks and deployment checks.
