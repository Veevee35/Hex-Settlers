# Hex Settlers V1.0.43 — Discord Activity OAuth and CAPTCHA repair

## Root causes found in the uploaded V1.0.43 ZIP

1. `public/discord-activity.bundle.js` was a 282-byte diagnostic placeholder, **not the compiled Discord Embedded App SDK**. If deployed as-is, its pairing handlers are never installed; provider buttons show the “Discord is initializing” error, even when Discord itself is ready.
2. The client attempted to load Cloudflare Turnstile directly inside Discord's proxied/sandboxed Activity iframe once two password attempts failed. Cloudflare Turnstile's own cross-origin challenge script/iframe can be blocked in that context. The browser therefore showed an unsolvable CAPTCHA and prevented login.
3. In the prior code, checking whether external browser login was approved started **after** Discord's external-link command finished, which can delay the handoff on some clients.
4. “Create account in browser” did not retain a pending Activity pairing request, so registration alone would not reconnect the Activity.
5. The provided ZIP was named V1.0.43 but the internal build metadata still said 1.0.6. The version data has been synchronized to **V1.0.43** without altering the existing version increment/stamping algorithms.

## Changes

- The game never attempts to render a Cloudflare CAPTCHA inside a Discord Activity. After the existing two-failure threshold, Discord clearly directs the player to **Sign in securely in browser**. First-party `https://hexsettlers.org` remains responsible for rendering Turnstile and verifying tokens through the server. The five-failure/20-minute lockout remains enforced; neither OAuth nor Discord pairing bypasses the server's registration CAPTCHA rules.
- The browser sign-in button and Google, GitHub, Cloudflare buttons create a 10-minute, one-use, account-bound pairing request. The external website requires explicit approval. OAuth provider tokens and website login cookies are not passed to Discord JavaScript.
- The pending approval poll begins immediately when the external link opens.
- “Create account in browser” includes the pending pairing identifier, then opens the normal website's registration page, with Turnstile and username setup intact. The website still requires explicit approval after account setup.
- Added a bundle verification tool: `node scripts/verify-discord-bundle.cjs`. `npm run build:discord` now automatically runs this verification, and **fails the build** if the compiled SDK file is absent or is the small diagnostic placeholder.
- The uncompiled fallback asset displays a clear deployment error instead of silently showing a nonfunctional login screen.
- Existing site/admin security headers, production Worker name, OAuth provider routes, Docker configuration, account databases, existing Cloudflare secrets, and versioning algorithms remain unchanged.

## DEPLOYMENT — REQUIRED

Unzip the project into your existing repository, maintaining your `.git` folder and Cloudflare environment/secrets. Replace changed source files, commit and push.

Cloudflare Workers Build command **must** be:

```bash
npm run build:discord && npm install --prefix cloudflare --no-audit --no-fund && node scripts/stamp-git-build.cjs
```

Keep the existing production Deploy command:

```bash
./cloudflare/node_modules/.bin/wrangler deploy --config wrangler.container.production.jsonc
```

**Important:** This supplied ZIP contains a clearly labeled fallback for `public/discord-activity.bundle.js`, because the current offline sandbox cannot fetch `@discord/embedded-app-sdk@2.5.0` or `esbuild@0.28.2`. The `build:discord` script must download those pinned build-only dependencies and generate the real SDK bundle on a network-enabled build machine before deployment. The fallback is excluded from source commits by `.gitignore`; if the Cloudflare Build command is skipped, OAuth will not function. This update has **not** been verified inside a live Discord client.

Inspect the Cloudflare build log for **“Discord Embedded App SDK bundle created”** followed by **“Discord Activity SDK bundle verified (...) bytes.”** A build that skips either step is incomplete.

### Verify the deployed Activity bundle on Windows PowerShell

```powershell
curl.exe -L "https://activity.hexsettlers.org/discord-activity.bundle.js" -o "$env:TEMP\hex-discord-sdk.js"
(Get-Item "$env:TEMP\hex-discord-sdk.js").Length
Get-Content "$env:TEMP\hex-discord-sdk.js" -TotalCount 1
```

The bundle must be **more than 12,000 bytes** and must not say `Diagnostic fallback ONLY` or `SDK bundle was not built`. If it is smaller, the Cloudflare build command did not generate or publish the SDK. Correct that before debugging OAuth credentials.

### Check Cloudflare / Discord configuration

1. Confirm the **same production Worker** serves `activity.hexsettlers.org` and `hexsettlers.org`, and the Discord URL mapping is prefix `/`, target `activity.hexsettlers.org` (no `https://` in the target).
2. In your Worker, check `DISCORD_CLIENT_ID`, secret `DISCORD_CLIENT_SECRET`, secret `DISCORD_BOT_TOKEN`, `OAUTH_STATE_SECRET` (at least 32 chars), and the appropriate `OAUTH_GOOGLE_CLIENT_ID/SECRET`, `OAUTH_GITHUB_CLIENT_ID/SECRET`, `OAUTH_CLOUDFLARE_CLIENT_ID/SECRET`. No new secrets have been added.
3. In Cloudflare Turnstile hostname management, make sure **`hexsettlers.org`** is allowed. Turnstile runs in the first-party browser, not Discord's iframe; the Discord proxy hostname no longer needs to host this widget for the Activity login flow.
4. Existing provider redirect URIs should remain the site's callbacks: `https://hexsettlers.org/api/auth/oauth/google/callback`, `https://hexsettlers.org/api/auth/oauth/github/callback`, and `https://hexsettlers.org/api/auth/oauth/cloudflare/callback` as configured in each provider's developer dashboard.
5. Leave Discord's **Interactions Endpoint URL** empty if you are not implementing Discord slash commands. It is not the Activity launch URL.

### Live acceptance test

1. Open Hex Settlers as a Discord Activity. Do **not** see an SDK placeholder error. The provider buttons should be visible for configured providers.
2. Click Google, GitHub, or Cloudflare. Discord must open `hexsettlers.org` in the external browser with a short pairing code. Check that the code matches the Activity, then click **Continue with [provider]** on the website. After login, select **Approve Discord sign-in**.
3. Return to Discord. The Activity should poll for approval, then establish a verified session and join its private Activity lobby. Check that it is the same Hex Settlers account and no provider OAuth token is printed to the console.
4. Test password login with two wrong passwords. After the second, the Activity must **not** show an embedded CAPTCHA. Click **Sign in securely in browser**, enter the correct password on `hexsettlers.org`, solve Turnstile if required, then approve. Verify the 20-minute lock after five incorrect attempts still works; resetting the password clears it.
5. Test creating an account in the browser: the `activity_link` query parameter must remain on the registration page, even through OAuth callback if an OAuth account is created. Complete email/username verification and approve before the 10-minute pairing expires; otherwise start another pairing in Discord.
6. Test the ordinary `hexsettlers.org` login, admin MFA, and a two-player Activity session to ensure no regressions.

If the 10-minute pairing expires during registration, start sign-in again from the Activity; do not lower CAPTCHA or OAuth protections.

## Validation limitations

Focused Node tests cover the one-use pairing store, expiry, session cookies, Turnstile verification, Discord membership tickets, proxy routing and the new client handoff source. There is no live Discord session or OAuth test environment here. The SDK bundle could not be compiled locally because npm registry access was unavailable. Full repository tests have known unrelated legacy test drift, and integration tests requiring the `ws` npm package cannot run without npm dependencies. The build artifact must be validated on Cloudflare as above.
