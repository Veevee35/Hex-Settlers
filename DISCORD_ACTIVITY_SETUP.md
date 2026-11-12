# Hex Settlers — Discord Activity deployment and verification

## What this update adds

This release adapts **the existing game and existing Cloudflare production Worker** for Discord Activities. It adds the Discord Embedded App SDK, a protected login-to-Discord session exchange, verifies a participant against Discord's actual active Activity instance, and automatically assembles one private Hex Settlers lobby per Discord Activity instance. The regular website and `admin.hexsettlers.org` retain their original clickjacking defenses. The Activity has a Discord Invite button and its own secure session cookie.

**Application ID:** `1477895334406656101` (the application's public ID from your screenshot). The ID is not a secret. **Do not replace your current game's application ID with a new Discord application.**

**Versioning:** This integration deliberately does **not** edit the version counter, versioning rules, `package.json` version, or `build-version.json`. Your existing Cloudflare/R2 on-deploy version scheme keeps handling new successful builds.

## 1. Attach a dedicated hostname to the EXISTING Cloudflare Worker

1. In Cloudflare DNS, make sure `activity.hexsettlers.org` is not already used by another Worker or site.
2. Open **Workers & Pages → your existing live production Worker (`hex-settlers`) → Settings → Domains & Routes → Add → Custom Domain**.
3. Enter **`activity.hexsettlers.org`** and attach it to the **same production Worker** that serves `hexsettlers.org`. Cloudflare will configure a DNS record and TLS for the hostname. Do not create a new Worker, Durable Object, container, R2 bucket, or database.
4. Leave `hexsettlers.org` and `admin.hexsettlers.org` attached as they are.
5. Confirm `https://activity.hexsettlers.org/` loads the sign-in screen after deployment. **Outside Discord, the page will not initialize the Discord SDK**; this is expected.

The separate hostname is intentional: a Discord Activity must be framed, but your normal game and administrator panel must remain protected against unrelated third-party embedding.

## 2. Add Discord secrets to your existing Cloudflare Worker

In Discord's [Developer Portal](https://discord.com/developers/applications), select **Hex Settlers** (application `1477895334406656101`). Copy **OAuth2 → Client Secret**, and **Bot → Token** from the same application. If a bot has not been created, create one under its Bot settings; no bot needs to be actively joined to a guild to query the Activity Instance API.

In Cloudflare, open the **same production Worker** → **Settings → Variables and Secrets**:

| Name | Type | Value |
|---|---|---|
| `DISCORD_CLIENT_ID` | Text variable | `1477895334406656101` |
| `DISCORD_CLIENT_SECRET` | **Secret** | The OAuth2 Client Secret from Discord |
| `DISCORD_BOT_TOKEN` | **Secret** | The application's Bot Token from Discord |

**Turnstile compatibility:** In your existing Cloudflare Turnstile widget, add **`1477895334406656101.discordsays.com`** and **`activity.hexsettlers.org`** to the existing allowed hostnames, alongside `hexsettlers.org` and `admin.hexsettlers.org`. Discord's iframe is served from its `discordsays.com` proxy, and the server now checks that exact CAPTCHA hostname when it receives requests from the Discord proxy. Test a CAPTCHA after two wrong logins inside Discord. Discord's outer Activity CSP may block some third-party CAPTCHA resources; if that happens, use password reset from the regular website and test a subsequent login, and treat it as an outstanding platform compatibility issue rather than disabling CAPTCHA verification.

Keep your existing `GAME_GATE_SECRET`, `HEX_ADMIN_PASSWORD`, Turnstile, Resend, OAuth, and R2 settings. **Never** put Discord secrets in `public/`, `client/`, `package.json`, Wrangler config's `vars`, or GitHub. This code securely forwards the secrets to the one existing game container.

The Worker needs **redeployment** after adding these secrets if your current deployment does not already contain the new code.

## 3. Set up Discord Developer Portal Activity URL mapping

1. In the same application, expand **Activities** in the left navigation (this is below the **Games** section in some versions of the portal).
2. Open **Activities → URL Mappings**.
3. Configure the main mapping as:

   **PREFIX:** `/`  
   **TARGET:** `activity.hexsettlers.org`

   Include **no `https://`** in the target, and do not map directly to `index.html`. One `/` mapping handles the game's HTML, relative assets, `/api/…`, and `/ws` WebSocket endpoint. If you have more specific mappings, put `/` last.
4. Save your changes. Discord then exposes the game through its proxy: `https://1477895334406656101.discordsays.com/`.
5. Open **Activities → Settings** and turn on **Enable Activities**. Select the supported platforms you intend to test. Desktop Discord and the web client are good first targets; test mobile separately.
6. If required, add your own Discord account to **App Testers**; private/unverified activities may have tester restrictions.

**Do not set the Activity URL mapping to `hexsettlers.org`**. That hostname retains CSP `frame-ancestors 'none'` and `X-Frame-Options: DENY` intentionally.

## 4. Deploy through your existing GitHub → Cloudflare automation

Extract the ZIP. Copy the contents of its `Hex-Settlers/` folder into the **root of your existing GitHub repository** (preserve the `.git` directory). Commit/push. Cloudflare's automatic root `npm clean-install` remains unchanged, and the normal Node container image is still built with the existing Dockerfile.

**The one required Cloudflare Build command change** is prepending the Discord SDK bundle step to the existing command. In Cloudflare Workers → your existing production Worker → **Settings → Builds**, use:

```bash
npm run build:discord && npm install --prefix cloudflare --no-audit --no-fund && node scripts/stamp-git-build.cjs
```

**Keep your existing production deploy command** exactly:

```bash
./cloudflare/node_modules/.bin/wrangler deploy --config wrangler.container.production.jsonc
```

Why a build command change? `@discord/embedded-app-sdk` is bundled at build time, not loaded from a blocked external CDN. This release pins the SDK to `2.5.0` and `esbuild` to `0.28.2` under `scripts/discord-build/` (not in your Node game container's root dependencies). The bundle is regenerated into `public/discord-activity.bundle.js` before the Worker asset upload. The placeholder in the ZIP is a **diagnostic stub**: **do not deploy without running `npm run build:discord`**.

If Cloudflare's root dependency install is disabled in your build settings, use instead:

```bash
npm ci --ignore-scripts --no-audit --no-fund && npm run build:discord && npm install --prefix cloudflare --no-audit --no-fund && node scripts/stamp-git-build.cjs
```

**Local PowerShell build** (optional):

```powershell
npm ci --ignore-scripts
npm run build:discord
npm run build
```

The main Node container still uses its existing dependency lock and Cloudflare R2 state. There is no migration and no change to the version counter.

## 5. Test the first Discord Activity lobby

1. Open the Discord desktop application; use a **voice channel** in a server where you can run the Activity.
2. Launch **Hex Settlers** from Discord's Activities picker (or use the application's default Launch command). Confirm the full Hex Settlers account sign-in page appears **inside Discord**.
3. **Existing player:** sign in with your existing Hex Settlers username/email and password. The Discord SDK authorizes `identify`, and the server verifies the Discord user is currently joined to the **specific active Activity instance**. The game automatically opens its private lobby. The top-right status shows that the Discord lobby is connected.
4. **New player:** use **Create account in browser**. Account creation opens `https://hexsettlers.org/` outside Discord, so the existing Turnstile CAPTCHA and email verification function normally. Return to Discord and sign in there. Accounts are NOT silently created from Discord identities.
5. Click **Invite** in the Activity to open Discord's invite interface. Have a second Discord account launch the **same** Activity instance, and log in with a **different** Hex Settlers account. Both should appear in **the same lobby**, not two separate ones.
6. Have a third person launch Hex Settlers in a **different** voice channel/Activity instance. This third person must receive **a different lobby**.
7. Select rules, ready players, and start a normal multiplayer game. Verify dice rolls, turns, trade, building, lobby chat, and finish flow; then close and reopen the Activity. The game continues using the existing persisted rooms and replay/reconnect features.
8. Verify that the normal `https://hexsettlers.org` login, signup CAPTCHA, existing OAuth sign-ins, admin MFA, and existing lobbies still work. A normal visitor **must not** be able to guess a Discord Activity's room code to join it.

## 6. Technical checks in Chrome/Discord Developer Tools

**PowerShell: verify CSP isolation**:

```powershell
curl.exe -I https://hexsettlers.org/
curl.exe -I https://activity.hexsettlers.org/
curl.exe -I https://admin.hexsettlers.org/
```

The *main* and *admin* sites must still have `X-Frame-Options: DENY` and `frame-ancestors 'none'`. The *Activity hostname* must **not** have `X-Frame-Options: DENY`, and its CSP must allow Discord's frame hosts. The Activity-only cookie, after logging in, should use `Secure; HttpOnly; SameSite=None; Partitioned`, with no broader `Domain=` attribute.

While launched **inside Discord**, check Network:

- `/discord-activity.bundle.js` should return **200** and not contain the diagnostic missing-SDK stub.
- `/api/auth/session` should report the signed-in Hex Settlers account after login.
- `POST /api/discord/activity/session` should return **200** (not 401, 403, 404 or 503); it exchanges the short-lived Discord OAuth code and checks Discord Activity membership. Responses contain tokens: do **not** copy these tokens into issue reports or screenshots.
- `/ws` should upgrade to a **101 Switching Protocols** WebSocket. The websocket frames should include a `discord_activity_join` request followed by `joined` and room/game data.
- There should be **no** CSP iframe denial, blocked content, cross-origin API failure, or missing SDK bundle error.

If `POST /api/discord/activity/session` fails: check the Worker secrets, verify the *same* Discord app ID is configured in the portal, ensure the Bot Token is valid, and confirm the user launched an active instance from Discord. If `/ws` is rejected with Origin 403, verify you are deploying `cloudflare/container-worker.mjs` from this package. If browser login keeps returning 401, look for missing `Partitioned` cookie support; test current Discord desktop/Chrome clients and confirm the activity hostname and your site's SSL are correct.

### Important limitations

- **A live Discord-hosted Activity was not launched by the code build environment.** Full SDK integration and two-client multiplayer must be verified in your own Discord application after deployment.
- The isolated build environment could not download npm packages; it was able to run source and unit tests, but not build the real SDK bundle here. Your normal Cloudflare Build should install the two pinned build-only dependencies and regenerate it. If your Cloudflare Build environment cannot reach npm, the build fails rather than silently serving a fake Activity.
- The game still uses **Hex Settlers accounts** and their existing identity/stats. Discord `identify` confirms the Activity participant and maps the instance to a room; it does not automatically replace the existing account system.
- Discord supplies only the number of people in an Activity; lobby rules still control how many can play. Extra participants can join as spectators based on the existing game rules.
- This update does not implement Discord monetization or separate bot chat commands; neither is required for the core embedded Activity.

**Official references:**
- https://docs.discord.com/developers/activities/building-an-activity
- https://docs.discord.com/developers/activities/development-guides/local-development
- https://docs.discord.com/developers/activities/development-guides/multiplayer-experience
- https://docs.discord.com/developers/developer-tools/embedded-app-sdk
