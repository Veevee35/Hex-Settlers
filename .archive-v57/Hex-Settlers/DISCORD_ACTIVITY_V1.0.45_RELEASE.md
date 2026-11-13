# Hex Settlers V1.0.45 — Discord Activity OAuth startup repair

## What caused the screenshot error

The V1.0.44 ZIP shipped `public/discord-activity.bundle.js` as a 697-byte **placeholder** instead of executable Discord integration. The browser never initialized the Discord RPC bridge, and the Activity's OAuth controls could not open a pairing request. On top of that, `.gitignore` explicitly excluded that generated bundle from Git, so a previously built local file would not be included by a normal `git add` and push. The uploaded ZIP's `build-version.json` and `package.json` also still showed 1.0.43.

## Changes in this release

* Set the source release to V1.0.45 (`build-version.json`, root npm metadata, app version labels, asset-cache names) using the existing versioning script. The version-increment rules are unchanged.
* Include **a browser-ready, ~15 KB `public/discord-activity.bundle.js`**, built and verified in this release — not a placeholder. Include `public/discord-activity.bundle.sha256` to detect missing, truncated, or mismatched artifacts.
* Build the Discord client **offline with Node**, requiring no `@discord/embedded-app-sdk` or esbuild npm downloads. The bundle contains a small, locally auditable **Discord RPC compatibility adapter** covering only the Discord SDK commands used by Hex Settlers: handshake / READY, authorize, authenticate, open external link, invite dialog, participant query / update. It follows Discord's published Embedded App SDK v2.5.0 protocol; **it is NOT the full upstream SDK**. The backend continues to verify Discord OAuth tokens and live Activity membership independently.
* Remove the `.gitignore` exclusion for the bundle. Its compiled JS and checksum now go into the git repository and Cloudflare Docker build context.
* Apply a versioned URL to `discord-activity.bundle.js` so previous cached placeholders cannot be used. The existing version-bump and git-SHA stamp scripts now update this new cache key during future builds.
* Correctly await the optional Discord participant-event subscription so rejected subscriptions do not create an unhandled promise rejection.
* Retain the existing external-browser login pairing, CAPTCHA-on-first-party-site policy, and secure account login/lockout logic.

## Publish V1.0.45

1. Extract the ZIP. Copy all contents of the enclosed `Hex-Settlers` directory **into your existing GitHub working checkout**. Retain your `.git` repository, Cloudflare secrets, and persistent game data.
2. From that checkout, verify a release bundle is present:

   ```powershell
   node scripts/verify-discord-bundle.cjs
   # Discord Activity client bundle verified (... bytes; SHA-256 ...)
   ```

3. Stage and push all relevant files. **Do not skip the prebuilt assets or `.gitignore`:**

   ```powershell
   git add -A
   git status --short
   git ls-files public/discord-activity.bundle.js public/discord-activity.bundle.sha256
   git commit -m "fix: bundle Discord Activity OAuth client V1.0.45"
   git push
   ```

   `git ls-files` must list BOTH filenames. If this fails, investigate which directory contains the Git checkout before proceeding.
4. Keep the existing Cloudflare Worker. Suggested existing **Cloudflare Build command**:

   ```bash
   npm run build:discord && npm install --prefix cloudflare --no-audit --no-fund && node scripts/stamp-git-build.cjs
   ```

   The Discord compilation itself now uses no downloaded dependencies. Leave the **Deploy command**, Worker name, routes, and Discord URL mapping alone. Your existing Cloudflare npm dependencies for `wrangler` and the Node server are still needed for normal deployment.
5. Find `Discord Activity client bundle verified` in the Cloudflare build log. After deployment, check the actual HTTP response:

   ```powershell
   curl.exe -I https://activity.hexsettlers.org/discord-activity.bundle.js
   curl.exe -s https://activity.hexsettlers.org/discord-activity.bundle.js | Select-String "Hex Settlers Discord Activity browser bundle"
   ```

   It must be 200 OK and begin with the **browser bundle** header, not `Diagnostic fallback ONLY` and not `SDK bundle was not built`.
6. Close and reopen the Discord Activity (or use its reload action). Test the Google, GitHub, Cloudflare and browser-login options. A provider login should open `https://hexsettlers.org` externally with the six-character pairing code, prompt for explicit approval on the website, and return to the same Discord Activity as the existing Hex Settlers account.
7. Verify a second Discord participant joins the same game lobby, while a separately launched Activity instance receives a separate lobby. Test login failure CAPTCHA and password-lockout flow through the first-party website.

The Discord Developer Portal **Interactions Endpoint URL remains blank**. Keep the Activity URL Mapping pointing to `activity.hexsettlers.org`.

## How to build locally in future

`npm run build:discord` recreates `public/discord-activity.bundle.js` and its checksum using built-in Node APIs. `node scripts/verify-discord-bundle.cjs` rejects the old placeholder and detects tampering. `npm run build` will also generate the Discord bundle after your regular TypeScript build (requires normal project dependencies).

## Test evidence and limits

* Focused automated Node tests cover Discord RPC handshake/READY, origin/source validation, command responses, browser pairing from the actual *compiled bundle*, OTP pairing, website OAuth flows, login CAPTCHA lockout, cookie isolation, version metadata and Cloudflare routing.
* Live Discord web/mobile SDK interoperability, OAuth provider configuration, and real multiplayer launch **must still be tested after deployment**. No live Discord authorization or Cloudflare production deploy was performed here.
* The original official Discord SDK package could not be fetched in this isolated build environment (npm registry DNS unavailable); this release instead ships a tested, self-contained, protocol-compatible subset. If Discord changes the protocol or you later need other SDK methods, switch back to the full official package and ship a verified compiled upstream bundle in the release rather than a placeholder.

Upstream protocol reference: https://github.com/discord/embedded-app-sdk , v2.5.0 (MIT); Discord Activities docs: https://docs.discord.com/developers/activities/overview .
