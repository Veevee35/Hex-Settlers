# Hex Settlers V67 — Admin hostname MFA (Worker + Container)

## What was implemented

The public game (`https://hexsettlers.org`) stays public. The `admin.hexsettlers.org` hostname is protected **inside the Cloudflare Worker**, before its assets or admin APIs are served. The Worker asks the Node backend to validate the *live* server-side MFA session on every protected request, including protected static assets; this avoids stale signed tokens remaining usable after logout. The existing Node admin API independently enforces normal account authentication, admin role, valid MFA session, and CSRF verification. No new admin password database is introduced.

The dedicated `admin-login.html` page requests the existing administrator username and password, then a six-digit TOTP code. First-time administrators enroll using an authenticator manual setup key (also provided as an `otpauth` URI). Initial enrollment requires a working code before any admin session is issued. The server encrypts TOTP seeds using AES-256-GCM and stores the encrypted seed in the existing `users.json` administrator record; it stores recovery codes as one-way SHA-256 hashes. A recovery code can be redeemed **once after the password** and **requires immediate replacement-device enrollment**, revoking the previous authenticator and all existing admin MFA sessions. New recovery codes are issued at enrollment and displayed only once.

Admin MFA sessions are opaque 256-bit random tokens bound to the matching existing HTTP-only account session, server-validated on every request, revoked at logout, and expire after eight hours. Pre-MFA sessions expire after five minutes; both cookies are host-only, HTTP-only, Secure and SameSite=Strict in production. TOTP codes have a ±30-second clock window and successful steps cannot be replayed. Dedicated IP- and username-based password throttles and IP-/user-based code throttles protect enrollment, verification and recovery. Administrator auth events are logged without credentials or codes.

Only specific MFA login page assets and MFA authentication endpoints are accessible before MFA. Direct calls to `/api/admin/mfa/check` are not available from the public internet. Public/staging/workers.dev URLs cannot call admin endpoints. Admin WebSockets remain disabled by the existing hostname policy. Administrator accounts cannot use OAuth callbacks to mint management sessions or link OAuth identities from the public hostname, preventing those flows from bypassing MFA.

## REQUIRED deployment preparation

1. **Back up** your existing Cloudflare R2 `state/users.json` and retain an offline backup before deployment. The application uses the existing R2 persistence path; do not clear its data or change the bucket during this update.
2. Generate a new **32-byte** secret locally:

   ```powershell
   node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
   ```

3. Go to Cloudflare Dashboard → Workers & Pages → your `hex-settlers` Worker → **Settings → Variables and Secrets**. Add the **Secret** (encrypted, not plain text):
   - Name: `HEX_ADMIN_MFA_ENCRYPTION_KEY`
   - Value: paste the generated base64 string

   Keep the exact value secure and unchanged across redeployments. If you use distinct production and staging Workers, give each a separately generated key. The code intentionally does **not** ship with any default secret or backup authentication bypass. If this secret is missing, admin MFA login returns HTTP 503 and the public game remains accessible.
4. Verify existing `HEX_ADMIN_PASSWORD` and `GAME_GATE_SECRET` stay set. **Do not remove or rotate** them as part of this change. The outgoing email sender remains fixed to `no-reply@hexsettlers.org` in the Worker code.
5. Deploy the **entire** updated project through your established GitHub → Cloudflare workflow. `server/admin-mfa.js`, `cloudflare/container-worker.mjs`, `cloudflare/admin-routing.mjs`, `public/admin-login.html`, `public/admin-mfa.js`, `public/admin-mfa.css`, `server.js`, and `public/app.js` must be included. The existing Dockerfile already copies all of `server/` into the Container. Verify the secret persists after deployment.
6. The Worker hostname check intentionally accepts **only** `admin.hexsettlers.org` for administration. You cannot fully test this flow at an unrelated staging `workers.dev` hostname; use a separate staging admin hostname with matching routing configuration if you need a parallel end-to-end staging rollout.

## First administrator sign-in

1. Open a **new incognito browser session** at `https://admin.hexsettlers.org/`.
2. You should be redirected to `https://admin.hexsettlers.org/admin-login.html` before seeing any admin UI.
3. Sign in with the **existing** administrator username and password (for the built-in account, the username is `Benleethom`, with the currently configured `HEX_ADMIN_PASSWORD`).
4. For first login, add a **time-based six-digit account** to your preferred TOTP authenticator using the displayed setup key. Enter the current code to confirm enrollment.
5. **Save all ten single-use recovery codes offline**. Only hashes are stored server-side; the plaintext codes are not retrievable later. Confirm that you've saved them to open the management dashboard.
6. Future logins require the admin password and the current six-digit authenticator code.

## Safe verification

- `GET https://hexsettlers.org/` — public game loads normally (no MFA).
- `GET https://hexsettlers.org/api/admin/health` — HTTP 404.
- `GET https://admin.hexsettlers.org/` without cookies — redirects to the MFA login page (HTTP 303).
- `GET https://admin.hexsettlers.org/app.js` without cookies — HTTP 401.
- `POST https://admin.hexsettlers.org/api/admin/health` without cookies — HTTP 401.
- `POST https://admin.hexsettlers.org/api/admin/mfa/check` directly — HTTP 404.
- `POST https://admin.hexsettlers.org/api/admin/mfa/status` — supplies only the caller's current MFA stage (and a session-bound CSRF token if fully authenticated).
- Sign in and verify that the normal management dashboard works. Sign out and confirm the same protected page returns to MFA login.
- The authenticator can be recovered with a remaining recovery code **after password authentication**. This disables the old device, revokes its sessions, and requires enrollment of a new one before returning to the admin portal.
- Make sure the admin site remains HTTPS-only; Secure cookies won't work on plain HTTP.

## Operational notes and limitations

- These are application-layer controls, **not Cloudflare Access**. They do not provide edge identity-provider policy, enterprise device posture, or automatic bot protection; maintain your Cloudflare WAF/rate-limiting rules as an independent defense.
- `HEX_ADMIN_MFA_ENCRYPTION_KEY` protects the stored authenticator secrets. Losing this key prevents decrypting previously enrolled authenticator secrets. Retain the key in your secure credentials manager. Existing recovery codes allow re-enrollment after setting a new valid key.
- Because the shared Worker/Container is authoritative for admin session validation, protected static admin requests will start the same backend container when it is asleep. That is deliberate to guarantee immediate revocation, but adds overhead to admin page loads. It does **not** start a second container.
- The MFA implementation does not require paid Cloudflare Access seats. It has **no email, SMS, or MFA bypass** fallback.
- The project uses CSP and does not load a third-party QR generator for TOTP enrollment. The setup key and `otpauth` URI are displayed locally for manual entry; no secrets are sent to external QR sites.
- No live deployment was performed from this environment. Local route and pure-security tests do not establish that Cloudflare DNS, the production Container, R2, or existing authenticator app integration are configured correctly. Verify on your production domain after deployment.
