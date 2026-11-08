# V48 — Security and Reliability Audit

## Findings resolved in this build

| Severity | Finding | Change |
|---|---|---|
| High | Spectator viewpoint could expose a live player's hand/dev cards | Spectator state now uses the spectator's identity for privacy filtering; viewpoint changes affect camera only. |
| High when upstream is public | Public origin could bypass Cloudflare edge policies | Optional shared-secret authentication on Node `/api/*`, `/ws`, `/health` plus header injection/stripping in Worker; requires secret configuration. |
| Medium | Unlimited WebSocket messages per connection | Server-side per-socket total and expensive-message sliding-window limits, enforced before JSON parse. |
| Medium | Idle or finished rooms lingered for 8 hours; state broadcasts reset idle clock | Status-based cleanup and persisted human-interaction and completion timestamps. |
| Medium | Several 7–8 scenarios shown as Four Islands in Rules dialog | Unified scenario metadata lookup with active game rules. |
| Medium | Custom-board grid resizing remained callable by a forged WS message after UI removal | Deleted obsolete `edit_preview_grid` command and protocol support. |
| Medium | New built-in admin password printed to deployment logs | New administrator bootstrap requires an explicit private password. |
| Defense in depth | Cloudflare static assets lacked headers from Node middleware | Worker attaches CSP, HSTS on HTTPS, X-Frame-Options, no-sniff, COOP, referrer and permissions policies. |

## Verified locally

- Authenticated and unauthenticated local HTTP/WS tests against the optional
  origin shield: direct calls return 403; matching secret succeeds.
- Cloudflare Worker unit tests for header-stripping/injection and static security headers.
- Existing game server integration test for spectator privacy while following a player.
- Automated room-lifecycle lease tests for connected/disconnected games, lobbies
  and finished games; saved-room timestamps survive round trips.
- Existing rules/Seafarers/Classic, gameplay, AI, ranked, history and networking
  test suite, plus TypeScript and JS syntax checks.

## Remaining risks and required operational steps

1. **Configure origin shield before declaring upstream protected.** The code
   deliberately permits direct origin traffic until `HEX_UPSTREAM_SHARED_SECRET`
   is set on Railway. Set `UPSTREAM_SHARED_SECRET` in Cloudflare first, then
   set the matching backend secret. Keep values out of public configuration.
2. **Cloudflare is not the actual game state host in this archive.**
   `wrangler.jsonc` and `cloudflare/worker.mjs` still proxy dynamic traffic to
   the configured upstream, currently Railway. Durable Objects migration and
   resilience to upstream outages were not implemented by this audit.
3. **No production penetration test was run.** Browser automation, real
   concurrent load, network partition/reconnect simulation over hours, and
   live-host permission tests are required before security assurance.
4. **Dependencies must be continuously monitored and patched.** This work did
   not query a live vulnerability database or claim a current CVE-free dependency tree.
   Use `npm audit --omit=dev`, review the result and patch carefully.
5. **Admin safety:** Keep an explicitly configured password, secure account
   recovery email, disable wildcard origin allowances, use HTTPS, and avoid
   exposing account/database backups or Railway logs publicly.
6. **Storage and recoverability:** Set a persistent DATA_DIR volume, monitor
   administrator health for writable storage, monitor errors/saturation, test
   history and account backup/restore, and consider multi-instance consistency
   before scaling to more than one Node replica.
7. **Rate limits can affect aggressive testing or automated clients.** The
   per-connection thresholds are intentionally generous for ordinary gameplay,
   but need load-testing at the desired concurrency level.
8. **Legacy code review:** Large historical AI simulations, training scripts,
   and compatibility paths remain in the full source. Removing them without
   coverage would risk game regressions; this release specifically removes the
   obsolete grid-resize API and does not claim complete dead-code elimination.

## Deployment sequence

1. Make a persistent storage backup and preserve the current v47 deployment.
2. Set Worker `UPSTREAM_SHARED_SECRET` (same strong private value as upcoming Node variable).
3. Deploy Cloudflare Worker with its updated static assets.
4. Deploy the updated Node backend; set matching `HEX_UPSTREAM_SHARED_SECRET`
   and `HEX_ADMIN_PASSWORD` on Railway. Do not disable the backend.
5. Confirm `/health` succeeds only through the Worker or with an authorized
   direct-origin header. Confirm direct `/ws` cannot connect without the secret.
6. Test 2 browsers, reconnect from sleep/airplane mode, AI fill, map previews,
   spectator privacy, match completion, history and idle-room cleanup.
7. Review admin health metrics, data writes and logs for at least one normal game.
