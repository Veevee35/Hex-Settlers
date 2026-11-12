# Hex Settlers — Discord Activity sign-in fix

**Source:** previous `Hex-Settlers-V1.0.41-Discord-Activity.zip`.

## Fixed

- The Discord version no longer skips OAuth-provider discovery. The Google (Gmail), GitHub and Cloudflare buttons appear when those providers are configured on the Cloudflare Worker.
- Provider login runs in the *normal browser* at `https://hexsettlers.org`, not inside Discord's sandboxed iframe. The Activity creates a high-entropy, 10-minute, one-use sign-in request; users explicitly approve that request after authenticating on the first-party website. The Activity automatically detects that approval and resumes the existing game lobby.
- Existing username/password sign-in inside the Activity checks that the embedded session cookie was actually retained; otherwise it explains how to use **Sign in in browser** rather than displaying a misleading successful login.
- Embedded login cookies use `Secure; HttpOnly; SameSite=None; Partitioned` and explicitly match `<app-id>.discordsays.com` for requests arriving through Discord's Activity proxy. Regular website sessions retain `SameSite=Strict` and no cross-domain cookie.
- **Sign in in browser** works for password-only or social-login accounts. **Create account in browser** opens the account creation screen and **Forgot password?** opens the password recovery screen.
- Website login/OAuth never returns long-lived bearer tokens to Discord JavaScript. Approval is explicit, session-bound, single-use, and expires after 10 minutes.
- This update leaves the game's Cloudflare version-stamping and version increment rules **unchanged**.

## Deployment

1. Extract this ZIP and replace the existing source files in the root of your current Hex Settlers GitHub repository. Preserve `.git`, your production environment secrets, and R2 data. Commit and push as normal.
2. Keep the Cloudflare Build command that generates the Activity bundle **before deploying the Worker**:

   ```bash
   npm run build:discord && npm install --prefix cloudflare --no-audit --no-fund && node scripts/stamp-git-build.cjs
   ```

   Keep your existing Wrangler deploy command. Do not skip `npm run build:discord`. The ZIP ships a diagnostic placeholder for `public/discord-activity.bundle.js` because the sandbox cannot download the pinned Discord SDK packages. The Cloudflare build must generate the real new bundle.
3. No new Cloudflare variables are required. Confirm your existing variables `OAUTH_STATE_SECRET`, `OAUTH_GOOGLE_CLIENT_ID/SECRET`, `OAUTH_GITHUB_CLIENT_ID/SECRET`, `OAUTH_CLOUDFLARE_CLIENT_ID/SECRET`, `TURNSTILE_SITE_KEY/SECRET`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_BOT_TOKEN`, and `GAME_GATE_SECRET` are present. Provider buttons show only for configured providers.
4. Keep the existing Discord Activity URL mapping: prefix `/` → target `activity.hexsettlers.org`. Leave the Interactions Endpoint URL **blank** if you are not implementing slash commands.
5. The main website `https://hexsettlers.org/` must continue to work directly in a browser: the external approval flow deliberately depends on its own session cookies and OAuth callbacks.

## What a player sees

1. Launch Hex Settlers from Discord and see **Log In**, **Sign in in browser**, **Create account in browser**, and the configured **Google (Gmail)** / **GitHub** / **Cloudflare** sign-in buttons.
2. For password login, use **Log In** as before. If the embedded Discord client rejects the cookie, choose **Sign in in browser**.
3. For a social account, click the provider button. Discord asks permission to open `hexsettlers.org` in the normal browser. An Activity pairing code appears in Discord.
4. In the browser, sign in with the selected provider (or an existing password login). Check that the pairing code displayed on the website matches the code shown in Discord, and click **Approve Discord sign-in**. **Never approve an unfamiliar pairing request.**
5. Return to Discord. After a short poll, the Activity signs into your existing Hex Settlers account and joins the verified Activity lobby automatically.
6. New OAuth signups still follow the site's CAPTCHA and unique-username onboarding requirements; they must finish onboarding before approving.

## Developer checks

While launching **inside Discord**, inspect Network/Console:

- `GET /api/auth/oauth/providers` → HTTP 200 and configured providers set to `true`.
- `POST /api/auth/discord-pair/start` → 200 with a one-time ID, secret (do not publish these values), and expiry.
- Opening the external site should show the pending Discord approval panel even after successful Google/GitHub/Cloudflare OAuth redirects.
- `POST /api/auth/discord-pair/approve` on `hexsettlers.org` → HTTP 200 only when the website is signed in; unapproved requests must remain pending.
- `POST /api/auth/discord-pair/status` through Discord should eventually return `state: connected` after approval and set a partitioned session cookie. `POST /api/auth/session` should then return the signed-in user.
- `/ws` must reconnect and return `auth_ok` with `cookieAuth: true`, then `/api/discord/activity/session` and the verified Activity lobby join should follow.
- The same pairing code must not work a second time; mismatched secrets must fail and unapproved requests must time out after 10 minutes.
- Check that normal web login, OAuth signup, two-failed-login CAPTCHA, five-failure/20-minute lockout, password reset, and administrator MFA still work.

## Diagnostic notes

- **No provider buttons?** Verify `GET /api/auth/oauth/providers` returns `true` for the applicable provider. The Worker's OAuth environment variables and 32+ character `OAUTH_STATE_SECRET` control this response. Compare with regular-site provider availability.
- **`404` on `/api/auth/discord-pair/start`?** Your Node container or Worker build is still on the previous version. Deploy the updated source and verify Cloudflare's build regenerated `discord-activity.bundle.js`.
- **Browser approval succeeds, but Activity cannot retain a session?** Inspect the cookie attributes, the Discord proxy domain, and current Discord desktop/web browser settings. The design intentionally refuses to treat that as an authenticated websocket instead of weakening cookie security.
- **Browser opens but does not show the pairing panel?** Check that the link starts with `https://hexsettlers.org/?activity_link=` and the original query survives provider OAuth redirects. Also disable stale website service workers if they are serving an old page.
- **Sign-in ends with a Discord membership error?** That is a separate step: the Activity verifies Discord OAuth and active instance membership via `DISCORD_CLIENT_SECRET` and `DISCORD_BOT_TOKEN`.

## Verification carried out in the code environment

- Focused Node tests: **30 passed**, including the pairing one-time expiration/replay tests and existing OAuth, CAPTCHA and Discord ticket/iframe tests.
- `tsc -p tsconfig.bootstrap.json`, `node --check` on modified source files and Cloudflare scripts: passed.
- A live Discord browser / real OAuth provider could not be exercised here. Do a two-account Activity test after deployment.
- The build SDK libraries were unavailable offline in this sandbox; the production Cloudflare Build command must regenerate the browser bundle.
