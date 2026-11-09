# Hex Settlers: GitHub -> existing Cloudflare staging Worker

This build is configured to update the **existing** Worker `hex-settlers-cloudflare-staging` and the **existing** private R2 bucket `hex-settlers-state-staging`. It does not provision a new database, make a production cutover, or connect to Railway. This repository contains **no private account data**; live persistence is separate in R2.

## Before enabling automatic deployment

1. Back up `state/users.json`, `state/active_rooms.json`, and the other state objects in the **existing** staging R2 bucket. Do **not** move, reset, rename, or empty that bucket.
2. Confirm your existing Cloudflare Worker has the exact name `hex-settlers-cloudflare-staging` and that it has `GAME_GATE_SECRET` and `HEX_ADMIN_PASSWORD` secrets (and `RESEND_API_KEY` if using email). Cloudflare secrets live in Cloudflare, not GitHub.
3. Verify that the staging URL is `https://hex-settlers-cloudflare-staging.bt616923.workers.dev`. If different, edit `vars.PUBLIC_BASE_URL` in **both** `wrangler.jsonc` and `wrangler.container.staging.jsonc` before connecting GitHub. If serving the site via a custom domain attached to this Worker, set this variable to that exact public origin instead; the server uses it for allowed origins, email links and redirects.
4. Install [GitHub Desktop](https://desktop.github.com/) for the initial upload and later push operations without command lines. Create your repository on GitHub (or use your existing Hex Settlers repository). In GitHub Desktop select **File → Clone repository** and clone that repository. Extract this ZIP, then copy **everything inside the ZIP’s `Hex-Settlers-GitHub-AutoDeploy/` folder** (including hidden `.github` and `.gitignore`) into your cloned repository folder. Replace matching project files. **Do not delete the cloned `.git` directory.** If your original repository already has other project files, review carefully before deleting anything. In GitHub Desktop inspect Changes → **Commit to main** → **Push origin**. Alternatively, create a fresh GitHub repository from the extracted source with GitHub Desktop, but confirm your connected Cloudflare repository points to it. The files `package.json`, `wrangler.jsonc`, `cloudflare/`, `public/`, `server/`, `scripts/` and `.github/` must sit directly at repository root. Do **not** commit `node_modules`, `.env`, local account data or secrets.

## Cloudflare connection — no local PowerShell commands

5. After the code is on GitHub, open the [Cloudflare dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → choose the **existing staging Worker** `hex-settlers-cloudflare-staging` → **Settings** → **Builds** → **Connect**.
6. Authorize the repository through the GitHub connection, and choose branch `main` (or your actual default branch).
7. Enter **Root directory:** `/` (repository root). For **Build command**, enter:

   `npm install --prefix cloudflare --no-audit --no-fund && node scripts/stamp-git-build.cjs`

   For **Deploy command**, enter:

   `./cloudflare/node_modules/.bin/wrangler deploy --config wrangler.jsonc`

   This is a **full deploy**, not `wrangler versions upload`, which would *not* roll out changed Docker images.
8. Save the connection. Push a commit or edit a file on the selected GitHub branch to trigger a build. Confirm **Settings → Builds** shows a successful deployment; verify `/health` at the staging URL. The GitHub webhook automatically triggers future deployments.

## Regular updates

For every later update, merge/upload the changed files to the same GitHub repository and push/commit to `main`. Cloudflare builds and publishes it automatically; no Wrangler CLI or PowerShell command is needed on your computer. If a build fails, inspect Cloudflare **Worker → Builds → build logs**; it does not mean you should reimport or reset R2.

## Production domain later

When ready to fix production, copy `wrangler.container.production.jsonc` to `wrangler.jsonc` only **after** confirming the separate production R2 bucket has your current accounts/history, production secrets are set, and the custom domain `hexsettlers.org` is attached to the intended Worker. Do not point two running game servers at the same private R2 bucket: rooms are authoritative in one container. Changing the configured Worker `name` silently targets a different deployment, not the existing staging Worker.

## Technical notes

- This uses Cloudflare **Workers Builds** (GitHub webhook), not a GitHub Actions secret or local deploy script. The committed Wrangler config deliberately targets staging.
- The cloudflare subpackage is installed in the build so `wrangler` and `@cloudflare/containers` resolve correctly.
- Cloudflare's hosted build environment can build the project's Dockerfile. Deploying a Worker with a Container requires Cloudflare's paid Containers support. Usage and R2 storage can incur charges.
- `public/` is served as Worker Assets; `cloudflare/Dockerfile` builds the Node game container. The large texture ZIP is kept in `cloudflare/large-assets/` and served via R2, not Worker Assets.
- The old GitHub automatic version-commit workflow is now manual only. `scripts/stamp-git-build.cjs` puts the Git commit hash in browser asset cache keys, preventing duplicate container rollouts after each ordinary push.

## Languages and timer behavior

The language page is accessible at the top center of the login screen or under the account orb → Language. The selection is saved locally on the device. This build ships **30 selectable languages** including English. The v52 expanded offline pack covers 202–221 English source keys per non-English locale across login, game-mode selection, lobbies, gameplay actions, maps, stats, development cards, trade labels, texture packs and account controls. Known numeric UI labels translate while retaining their values. English remains the fallback for untranslated detailed rules, game-log announcements and other messages; user chat, usernames and player names are deliberately never translated. It does not use a translation service.

Timer Off is an actual 0-ms server rule that disables timeouts and countdowns in unranked/casual games and hides the pause/play controls; AI opponents added explicitly still play their own turns. Ranked timing remains server-controlled. Casual creation defaults to Off; existing lobbies retain their previously saved timer settings until changed.

## v53: automatic release numbers and Journey lobbies

The v53 UI shows only `Vmajor.minor.patch`. A deployed revision that successfully starts the game container increments the version stored in the existing R2 bucket as `state/build-version.json` (idempotent per revision, patch 0–99 then minor rolls). There is no Git SHA displayed next to the version; SHAs are used internally for caching only. This is a runtime release counter, **not a GitHub commit that bumps package.json**. Do not run the old optional numbered-release GitHub Action for ordinary updates. On manual deployment without an asset stamp, the server hashes its code/assets to distinguish revisions. If you change the major release, edit `major` in the tracked `build-version.json` before deploying.

Unranked Play now leads through **Start Your Journey** and an optional, skippable first-time tutorial to Public lobbies / Private lobby / Challenge of the day (coming soon). New non-ranked rooms default private. Hosts can opt in to public discovery and optionally enforce friends-only admission. These settings are persisted in existing active rooms R2 state. Casual supports up to six human/AI players and does not accumulate stats/history. The language pack provides localized navigation/privacy labels, with detailed tutorial paragraphs falling back to English.

**Cloudflare Builds warnings:** A red **Failed** GitHub build is not the same as a successful manual Wrangler deployment. The screenshots do not include the build error; use Cloudflare's build logs to identify it. If an automatic build fails, do not reset the R2 bucket or create a second Worker. The previous working deployment should remain untouched.

## v54: All Games, fixed lobby visibility, and disconnected-turn pause

The public/private choice is no longer an in-lobby setting. **Public lobbies** and **Private lobby** on the All Games screen establish a lobby's visibility when it is created. Casual rooms are always private/unlisted, and the only lobby access control is **Friends Only**, which is enforced on the server. Public discovery relies on `list_public_lobbies` being supported by the deployed **Node container** as well as the current browser files; if you see `Unknown message type`, confirm Cloudflare rebuilt and deployed the container image instead of updating only static assets. The release package includes `V54_ALL_GAMES_LOBBY_AND_DISCONNECT.md` with gameplay, Settings, and test details.
