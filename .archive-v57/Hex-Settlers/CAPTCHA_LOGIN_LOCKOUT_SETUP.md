# Hex Settlers — CAPTCHA and 20-minute login lockout

## What was changed

- **All email/password account creation routes** require a Cloudflare Turnstile token, verified by the backend with Cloudflare Siteverify. OAuth account *creation* now requires a CAPTCHA-protected signup initiation too; existing OAuth sign-in and provider linking still work without it. The unprotected OAuth GET start can only authenticate an existing provider identity and cannot create one.
- After **2 incorrect passwords**, the next password attempt must complete Turnstile. Every subsequent password attempt must use a **new** challenge token, including attempts using the correct password.
- After **5 incorrect passwords**, password login is blocked **20 minutes**, even with the correct password. The error includes a `Retry-After` header. When the time elapses, the failure counter resets.
- A successful password login clears the counter. A successful **password change** or **verified-email password reset** clears the counter and lock immediately. Login counts and locks for existing accounts are saved in `users.json`, which is mirrored to R2 in Cloudflare deployments. Username and verified-email aliases share the same account counter. Unknown user identifiers have bounded, nonpersistent hashed counters.
- The existing account/IP rate limiters, administrator MFA and session security remain in place. A CAPTCHA or password change does not bypass TOTP for administrators.

## Mandatory Cloudflare setup before deploying

1. In the [Cloudflare Turnstile dashboard](https://dash.cloudflare.com/?to=/:account/turnstile), create a **Managed** widget. Add **hexsettlers.org** and **admin.hexsettlers.org** to the widget's allowed hostnames. If using other legitimate hostnames, add those too.
2. Copy the widget **Site Key** and **Secret Key**.
3. In **Cloudflare Dashboard → Workers & Pages → hex-settlers → Settings → Variables and Secrets**, set `TURNSTILE_SITE_KEY` to your site key and `TURNSTILE_SECRET_KEY` to your secret key. For this project, setting **both as secrets** is fine. The Worker explicitly passes both into the Node game container; **only the public site key** is exposed by `GET /api/auth/captcha-config`.
4. Deploy the updated project from GitHub as usual. Verify `https://hexsettlers.org/api/auth/captcha-config` returns a nonempty `siteKey` (it must **never** include the secret). Hard-reload the webpage, open **Create Account**, and make sure Turnstile appears.
5. To test lockout: enter two wrong passwords for an existing test account. The next attempt must require CAPTCHA. With a fresh solved CAPTCHA per try, continue to five wrong passwords. Login must return HTTP 429 with a 20-minute lockout, even for a correct password. Use that test account's verified-email **Forgot password** flow to change the password; the new password should then work immediately.

**Important:** CAPTCHA-protected signup and login attempts deliberately fail closed if either Turnstile key is missing or Cloudflare verification is unavailable. Add the keys before opening new registrations. Put private values in Cloudflare secrets rather than `wrangler` `vars` or committed `.env` files. Development/staging hosts require their own allowed Turnstile hostname.

## Notes for testers and administrators

- Turnstile's external script and iframe are allowed explicitly in the Content Security Policy on both the Cloudflare Worker and the Node server. No wildcard or `unsafe-inline` JavaScript has been added.
- Old `auth_login`/`auth_register` WebSocket messages remain available only to the existing isolated `NODE_ENV=test` automation; the public deployment already blocks these bearer-token endpoints. The test-only WebSocket password login also applies the failure limits but directs users to the website if CAPTCHA becomes necessary.
- OAuth-only account logins do not use a local password, so the password-failure lockout applies only to password login. Existing OAuth accounts can sign in directly; first-time OAuth registrations go through the CAPTCHA on the **Create Account** page.
- Existing authorized sessions are not forcibly logged out merely because another client failed a password login. Password resets still revoke sessions as before.

## Validation

Run `node --test test/captcha-login-security.test.js test/oauth-login.test.js test/runtime-config.test.js` for the authentication helper tests. Full `npm run check` / integration testing additionally requires the project's locked npm packages.
