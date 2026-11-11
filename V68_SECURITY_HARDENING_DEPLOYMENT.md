# Hex Settlers — V68 security-hardening build

This is the **complete game source** with the V67 security fixes. Deploy it as a replacement for the existing application's code; **do not delete or re-create the existing R2 state bucket**. The running website is **not** changed merely by downloading or extracting the ZIP.

## Security changes

1. **Critical WebSocket reconnection:** `rejoin_room` no longer accepts a client-controlled player ID. The socket must already carry a validated HTTP-session identity, and only that account can recover a game seat. Existing game membership is required. Legacy `auth_login`, `auth_register`, and `auth_token` WebSocket messages are disabled in production; the browser uses the HttpOnly session cookie. New game sessions keep normal automatic reconnection and account-based state recovery.
2. **Login throttling:** successful logins no longer erase the per-IP sliding window. There is also a persistent-in-process, per-identifier limit of 12 password attempts per 15 minutes. Failed or successful attempts both count.
3. **Lobby resource protection:** 300 active game rooms globally, up to 4 active unranked/casual/challenge lobbies per host account, and up to 6 lobby creations/minute/account. Ranked game rooms remain server-owned but observe the global capacity limit. The quotas are intentional defaults in `server.js` and can be tuned after load testing.
4. **Archived games:** WebSocket access to history/replay entries requires account authentication. Private-game full replays are available to participants; public ranked/challenge replays remain viewable by signed-in users. Administrators use the MFA-protected history API to inspect other private games.
5. **Room-code randomness:** newly created rooms use 8-character codes generated with `crypto.randomInt()`. Already-persisted 4-character codes still work for existing games.
6. **Password policy and browser tokens:** new passwords (registration, changes, resets, email linking) must have at least 12 characters. Existing shorter passwords remain usable for login until changed. The browser no longer writes account bearer tokens to `localStorage`. The old HTTP token-to-cookie exchange is disabled in production.
7. **Trusted IPs:** the Cloudflare Worker ignores untrusted `X-Forwarded-For` and stamps the container request with the Cloudflare edge-provided `CF-Connecting-IP`, or a rate-limited `unknown` fallback when missing.
8. **Admin portal MFA:** `admin.hexsettlers.org` uses its **existing admin username/password**, followed by a mandatory six-digit TOTP code. Password-only authentication creates only a five-minute pending challenge, **not** an admin session. TOTP state is persisted in the existing user record in R2. Admin sessions have a 12-hour maximum life, require server-side role checks, use HttpOnly cookies, can be revoked by logging out, and reject reused TOTP time steps. Administrator APIs are restricted to the admin hostname and require MFA-marked sessions. Admin WebSockets are disabled; game WebSockets do not grant private-archive administrator privileges.
9. **Sender preservation:** transactional mail remains locked to `no-reply@hexsettlers.org` in the Cloudflare container configuration.

## Required manual actions

### 1. Back up the existing R2 state

In Cloudflare **R2**, download copies of `state/users.json`, `state/active_rooms.json`, `state/game_history.json`, and other state objects from the bucket bound to the Worker being updated. Keep backups private: they contain account and session data. **Never empty, rename, or replace the state bucket when deploying this update.**

* Existing staging Worker: `hex-settlers-cloudflare-staging`, using R2 bucket `hex-settlers-state-staging` in `wrangler.jsonc`.
* Existing production Worker: `hex-settlers`, using R2 bucket `hex-settlers-state` in `wrangler.container.production.jsonc`.

These are **separate environments**. The default `wrangler.jsonc` targets **staging**, not production. Do not deploy to the wrong one.

### 2. Confirm the Cloudflare secrets, hostname, and password

Under **Workers & Pages → [target Worker] → Settings → Variables and Secrets**, verify that `GAME_GATE_SECRET` and `HEX_ADMIN_PASSWORD` remain configured. `HEX_ADMIN_PASSWORD` must be **at least 12 characters**. If the current password is shorter, change that Cloudflare secret **before** rolling out the new container; otherwise the built-in admin-account initialization can fail. Do not add either value to source files, GitHub, or `wrangler.jsonc`.

No new secret or TOTP provider account is required. Both `hexsettlers.org` and `admin.hexsettlers.org` should route to the **intended Worker**. Admin URLs must not route to a different deployment. The Worker denies management API requests on the public hostname and `workers.dev` domains. Keep its single-container setting: two independent game containers can split persistent game state.

`HEX_EMAIL_FROM` is already configured as `no-reply@hexsettlers.org`; keep the existing `RESEND_API_KEY` and verified sender domain. No email-sender reconfiguration should be needed.

### 3. Deploy the full build

**Preferred: GitHub-connected Cloudflare Builds**

1. Unzip this distribution and copy the contents of its `Hex-Settlers/` folder into the **root of your existing GitHub project**, replacing matching files. Preserve your Git repository's `.git` folder. Do not copy local account data or secrets.
2. Commit and push to the branch connected to your Cloudflare Worker.
3. Cloudflare Builds should run your **existing** build/deploy commands. For the existing staging Worker, the commands should be:

   Build: `npm install --prefix cloudflare --no-audit --no-fund && node scripts/stamp-git-build.cjs`

   Deploy: `./cloudflare/node_modules/.bin/wrangler deploy --config wrangler.jsonc`

4. Confirm the Cloudflare build actually deploys the **container image**, not just static site assets. Check Worker build logs and `https://<your-staging-host>/health`.

**If you deploy from your own terminal instead:**

```bash
npm install --prefix cloudflare --no-audit --no-fund
node scripts/stamp-git-build.cjs
./cloudflare/node_modules/.bin/wrangler deploy --config wrangler.jsonc
```

The above commands deploy to **staging**. For production, replace the last command with:

```bash
./cloudflare/node_modules/.bin/wrangler deploy --config wrangler.container.production.jsonc
```

Do not attempt to deploy production until the production R2 state and secrets have been verified and staging passes acceptance checks. In particular, if you are currently serving real players from staging, **staging may effectively be your production environment**, and deploying there affects current games.

### 4. First administrator login: enroll TOTP

1. Go to `https://admin.hexsettlers.org` in a normal private browser session. Sign in using your **existing administrator credentials**.
2. On the first login, the portal shows an authenticator setup key and a link compatible with TOTP apps (Google Authenticator, Microsoft Authenticator, 1Password, etc.). Add it to an authenticator app.
3. Enter the current **six-digit** code. Only then is an admin session issued. Your enrollment is saved in the existing R2 `users.json` record, so future admin logins request a code rather than generating a new secret.
4. Securely back up the authenticator setup key or its authenticator entry **offline**. This release intentionally has **no password/email-only MFA bypass or self-service MFA reset**. If all authenticator copies are lost, administrator access requires a controlled server-side account recovery procedure and identity verification.

The TOTP secret and one-time codes are not to be placed in GitHub, logs, support reports, or public chat messages. Sessions expire after 12 hours; using the same TOTP code twice in one time step is intentionally rejected.

### 5. Acceptance checks before a public beta

* In two separate browsers, log in as two players, create/join a game, then refresh and recover **each original seat**. Verify that a signed-out tab with a room code and another player's ID cannot rejoin as that player.
* Test that player A cannot use player B's room ID to take over their seat, and cannot read B's private full replay.
* Create a new private lobby and confirm its code is **8 characters**. Verify that already-active 4-character rooms are still reconnectable by their true members.
* Attempt a fifth simultaneous hosted lobby on one account; confirm a quota error. Check a fresh lobby still works after an older one closes.
* Verify anonymous replay requests fail, legitimate signed-in ranked/challenge replays still load, and `admin.hexsettlers.org` requires **password + TOTP**. On the admin hostname, password alone should not unlock `api/admin/*` or `api/account/*`.
* Confirm the admin API returns `404` from `https://hexsettlers.org/api/admin/...` and the `workers.dev` URL. Confirm logout prevents subsequent admin requests.
* Test normal account login, Google/GitHub/Cloudflare OAuth, forgot-password/reset, the tutorial, ranked queue, friends, AI games, and bug-report emails on staging.
* Check Cloudflare request logs for rate-limit `429` responses and verify that different legitimate source IPs are not collapsing into the same unknown bucket. **Do not log raw session cookies or TOTP codes.**

## Test record and limitations

- **57/57 dependency-free tests passed** locally across security, authentication utilities, Cloudflare proxy routing, game rules, persistence, and UI behavior.
- A separate **HTTP integration smoke test passed** for real password→MFA enrollment→session authorization, public-host session rejection, one-time-code replay rejection, and the new password floor. It used a minimal local WebSocket stub solely to allow HTTP-only initialization; the stub is **not included** in this build.
- New WebSocket seat-hijacking and admin-MFA end-to-end regression tests are included in `test/server.integration.test.js`, and should run in CI using `npm ci && npm test`. This sandbox could not download the `ws` dependency from npm; therefore the full WebSocket integration suite, full asset build, and live Cloudflare deployment were **not** verified here.
- These fixes address the **reported findings**, not a comprehensive third-party penetration test. Verify the deployed revision against staging before opening a large public beta.

## Modified files most directly related to security

`server.js`, `server/admin-totp.js`, `cloudflare/container-worker.mjs`, `cloudflare/client-identity.mjs`, `public/app.js`, `public/index.html`, `test/v67-security-hardening.test.mjs`, `test/server.integration.test.js`, and the existing rematch regression test. The rest of the source and image/audio assets are preserved.
