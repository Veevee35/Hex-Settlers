# Hex Settlers V67 security hardening — November 10, 2026

This release modifies the supplied V67 source. It does **not** automatically deploy code to Cloudflare, modify production secrets, enroll users in MFA, or certify the production websites safe.

## Fixed in source

| Finding | Change |
| --- | --- |
| HS-01 CRITICAL — Anonymous WebSocket rejoin could impersonate a player | `rejoin_room` now rejects anonymous sockets, refuses mismatched `playerId`, and derives the room seat exclusively from the authenticated `_userId`. No legacy unauthenticated fallback remains. |
| HS-02 HIGH — Shared IP login throttle cleared after success | Removed all success-based limiter clears. Throttles now apply independently to IP (12/min by default) and canonical account identity (8/15 min), across HTTP and test-only WebSocket password login. |
| HS-03 HIGH — Unlimited lobby creation | Added per-account (4/10 min), per-IP (8/10 min), one-active-hosted-room/account, and global active-room (512 by default) limits. Applied to ordinary, challenge, tutorial, and first-rematch rooms; ranked matchmaking defers at capacity. Added join-attempt throttles. |
| HS-04 MEDIUM-HIGH — Anonymous archived-game retrieval | Both history WebSocket operations require login. Full non-ranked/non-challenge game details and replays require the player's participation or an administrator role; ranked/challenge post-game replays remain available to logged-in players. Private room codes are removed from other players' history metadata. Per-account/IP throttles and 500-game list cap apply. The UI disables unavailable replay controls. |
| HS-05 MEDIUM — Short predictable room codes | New codes are **10 cryptographically random** characters. Browser joins, invites, public lobbies, and recent-room recovery accept 4–10 characters for compatibility. Existing 4-character active rooms are **not** automatically rotated; close/recreate sensitive old rooms. |
| HS-06 MEDIUM — Browser-persisted bearer sessions and weak password minimum | Production WebSocket password and bearer-token authentication paths are disabled. Browser uses HTTP-only cookies for login. A previously stored legacy bearer token is exchanged once via HTTPS `/api/auth/token` for a *new* cookie token; the old token is revoked. No new token is saved to localStorage. New/changed/reset passwords must be >=12 characters. Existing short passwords are not automatically invalidated. |
| HS-07 NEEDS LIVE VALIDATION — Wrong IP behind Cloudflare Container Worker | The Worker deletes spoofable forwarded identity headers and sends `X-Hex-Verified-Client-IP` derived from Cloudflare's inbound `CF-Connecting-IP`. Node uses it only if the configured `HEX_UPSTREAM_SHARED_SECRET` matches and the value is a valid IPv4/IPv6 address. In other environments, existing trusted reverse-proxy configuration is retained. |

## Required Cloudflare actions

1. Deploy the **entire** folder; do not upload just `public/` or `server.js`. The new `server/security-hardening.js` module and Cloudflare Worker change are required. Use your normal GitHub-to-Cloudflare deployment; ensure the build completed successfully.
2. Keep Cloudflare Worker/container `NODE_ENV=production` (the shipped `cloudflare/container-worker.mjs` sets it explicitly). Do not deploy with `NODE_ENV=test`, which intentionally preserves legacy socket authentication for older integration tests.
3. Keep the existing private `GAME_GATE_SECRET` (available to Worker) and `HEX_UPSTREAM_SHARED_SECRET` (injected by Worker) aligned. The Worker already transfers `GAME_GATE_SECRET` to the container as `HEX_UPSTREAM_SHARED_SECRET`. **Never** publish these secrets in Git or the browser.
4. Protect **admin.hexsettlers.org** separately with a Cloudflare Zero Trust **Access** self-hosted application. Permit only authorized administrators and require MFA at the identity provider. This Access policy must be created/enforced in your dashboard: it cannot be activated merely by deploying source files. Keep the existing server-side admin role checks and admin hostname restrictions.
5. Verify rate limits using **two separate real test accounts**, distinct client networks, and non-production or staging data. Confirm the `CF-Connecting-IP` value is represented correctly without logging or displaying complete IPs publicly. If the Worker doesn't receive this header in your deployment topology, fix the trusted-proxy route before relying on IP throttling.
6. If your training/simulation setup intentionally uses more than 512 simultaneous live rooms in the *same Node container*, set `HEX_MAX_ACTIVE_ROOMS` to a planned limit (1–5000), sized for actual RAM/CPU/active rooms. The admin's separate simulated training runs may not use game-room allocations, depending on the training path.
7. In an existing session, refresh the game after deploying so the new app can rotate a legacy localStorage session. Previously started four-character lobby codes continue working but should be replaced for privacy-sensitive games.
8. The existing email sender policy is unchanged: outbound transactional mail remains `no-reply@hexsettlers.org`.

## Verification completed

- `node --check` passed for `server.js`, `server/runtime-config.js`, `server/security-hardening.js`, `public/app.js`, and `cloudflare/container-worker.mjs`.
- 68 targeted local automated tests passed (security, HTTP auth, OAuth, selected UI and deployment tests, plus seven new security regression tests).
- Full WebSocket-to-server integration and actual Cloudflare-staging pen test were **not** run: the local environment couldn't install the project's `ws` dependency from the npm registry. These must still be performed in CI or a deploy/test environment where `npm ci` works.
- This is a targeted remediation, not an exhaustive vulnerability audit. Production configuration (Cloudflare Access, TLS/WAF, account authorization under concurrent load, R2 access) still requires live validation.

## Suggested staging smoke-test plan

- Test that an unauthenticated WebSocket cannot rejoin a game using another player's code and player ID; both target and actual player must remain connected.
- Log in as account A; create a room, reconnect in another browser session using the same account, then verify account B cannot rejoin A's seat.
- Create an invite-only room and verify the full 10-character room code works via join textbox, direct URL, and friendship invitation. Verify older 4-character rooms still reconnect.
- Try repeatedly creating lobbies as one account; receive the descriptive limit error without changing an existing room. Verify ranked queueing remains functional below global capacity.
- Inspect private unranked game history while logged in as an unrelated account; list metadata should not reveal room codes and replay retrieval must fail. Participant/admin access should still succeed; public ranked/challenge replay should still work.
- Attempt controlled invalid logins and verify successful login to a separate account does not erase the throttle.
- Test that a newly created/changed password shorter than 12 characters is refused and existing account sessions can still sign in via HTTP cookies.
- Configure/test Cloudflare Access MFA and validate server-generated 401/403 responses for non-admin sessions.
