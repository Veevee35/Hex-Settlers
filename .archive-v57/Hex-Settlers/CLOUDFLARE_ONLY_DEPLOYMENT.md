# Hex Settlers v49 — Railway-independent Cloudflare deployment (Workers Paid)

**Architecture:** Cloudflare Workers Assets (website) → Worker (`/api/*`, `/ws`, `/health`) → one `HexGameContainer` Durable Object → one Cloudflare Container running the existing Node v48 game engine. The container uses a **private R2 bucket** for `users.json`, `game_history.json`, `active_rooms.json`, `rating_policy.json`, `neural_ai_model.json`, historical admin backups, and uploaded texture packs. The downloadable built-in texture template is served from a separate public-by-route R2 key, not from a public R2 bucket. **No Railway origin, Railway CLI, D1 database, or external VPS is required.**

This is intentionally **a Durable-Object-managed Container**, not a rewrite into one native Durable Object per lobby. The v48 engine uses Node's HTTP/WebSocket `upgrade` event, filesystem, and background AI timers. Keeping that engine inside Cloudflare Containers is the least disruptive full-game migration. It requires your **Workers Paid** account, the R2 service you've enabled, and Docker Desktop to build the image. It also incurs **Containers/R2 usage charges**, which are separate from merely having Workers Paid. This package has been syntax-checked and passed the existing Node tests locally, but it has not been deployed to your Cloudflare account or tested in a real Cloudflare Container.

## Files to use

- `wrangler.container.staging.jsonc`: safe test Worker, name `hex-settlers-cloudflare-staging`, private bucket `hex-settlers-state-staging`.
- `wrangler.container.production.jsonc`: production Worker, name `hex-settlers`, private bucket `hex-settlers-state`, existing domain `hexsettlers.org`.
- `wrangler.jsonc`: identical to the **staging** configuration by default; an accidental `wrangler deploy` therefore cannot overwrite your existing live Worker.
- `cloudflare/container-worker.mjs`: **new** Worker, DO Container class and private R2 storage handler. It does not make calls to Railway.
- `cloudflare/Dockerfile`: Linux Node 22 container image.
- `cloudflare/bootstrap.mjs`: restores private R2 files before the game listens; refuses to boot if `users.json` is missing or corrupt.
- `cloudflare/state-sync.js`, `server/persistence.js`: writes live account, room, history, ratings, and AI files back to private R2.
- `scripts/upload-railway-backup.ps1`: uploads your **already downloaded** Railway volume files and custom textures into R2.
- `cloudflare/large-assets/texture-pack-template.zip`: a large built-in download excluded from Workers Assets' 25 MiB single-file limit. Upload it to the R2 `assets/texture-pack-template.zip` key.

**Critical:** Your Railway volume data is **not** embedded in this ZIP. Keep your backups separate and private.

## Part A — Prepare Windows

1. Extract this ZIP to e.g. `C:\Hex-Settlers-v49`. Use Windows 11 PowerShell, not the Cloudflare web text editor.
2. Install or update **Node.js 22+** and **Docker Desktop**; switch Docker Desktop to **Linux containers** and ensure it is running.
3. In PowerShell:

```powershell
cd C:\Hex-Settlers-v49
npm install --prefix .\cloudflare
.\cloudflare\node_modules\.bin\wrangler.cmd login
.\cloudflare\node_modules\.bin\wrangler.cmd whoami
```

`npm install --prefix .\cloudflare` installs the Cloudflare-only deployment tooling into `cloudflare/node_modules`. The existing game `package-lock.json` is left intact for the Docker image's `npm ci --omit=dev`.

4. Create two **private** buckets, separate from other R2 data:

```powershell
.\cloudflare\node_modules\.bin\wrangler.cmd r2 bucket create hex-settlers-state-staging
.\cloudflare\node_modules\.bin\wrangler.cmd r2 bucket create hex-settlers-state
```

If the buckets already exist, don't recreate them; check their names. **Do not enable R2 public access** for either bucket. If you want different bucket names, change `r2_buckets[0].bucket_name` in the matching Wrangler configuration **and** pass the same bucket name to the import script.

## Part B — Import your existing Railway data into staging

5. Put your exported Railway volume files in one folder. At minimum it must contain `users.json`; also include `game_history.json`, `active_rooms.json`, `rating_policy.json`, `neural_ai_model.json`, and the `texture-packs` directory where available. The import script searches recursively for these names and refuses ambiguous duplicate snapshots.
6. Preview the upload (replace the example path):

```powershell
.\scripts\upload-railway-backup.ps1 -BackupDirectory 'D:\HexSettlers-Railway-Backup' -Bucket 'hex-settlers-state-staging' -DryRun
```

7. Upload your saved volume and the 28 MiB built-in template:

```powershell
.\scripts\upload-railway-backup.ps1 -BackupDirectory 'D:\HexSettlers-Railway-Backup' -Bucket 'hex-settlers-state-staging'
```

If PowerShell blocks locally downloaded scripts, use `powershell.exe -ExecutionPolicy Bypass -File .\scripts\upload-railway-backup.ps1 -BackupDirectory 'D:\HexSettlers-Railway-Backup' -Bucket 'hex-settlers-state-staging'`, but only after reviewing the script.

8. Inspect **Cloudflare → R2 → hex-settlers-state-staging** and verify `state/users.json`, `state/game_history.json`, plus `assets/texture-pack-template.zip` exist (and other keys if applicable). R2 has no public access; this is expected. Check exact `users.json` and match-history counts against your local archive. Do not use the `Users` file from a *different* live version or an old backup snapshot accidentally.

## Part C — Deploy the isolated staging Worker

9. In `wrangler.container.staging.jsonc` change `vars.PUBLIC_BASE_URL` to your **actual** staging URL. Your account's workers.dev subdomain is visible in **Workers & Pages**. The configured Worker name is `hex-settlers-cloudflare-staging`, so the URL generally resembles:

```text
https://hex-settlers-cloudflare-staging.YOUR-SUBDOMAIN.workers.dev
```

Remove the `REPLACE_WITH_YOUR_STAGING_WORKERS_DEV_URL` placeholder. Leave `ALLOW_EMPTY_DATABASE` set to `0`. Staging must never create a fresh empty account database by accident.

10. Deploy the staging Worker + Container image:

```powershell
.\cloudflare\node_modules\.bin\wrangler.cmd deploy --config wrangler.container.staging.jsonc
```

The command builds a Docker image, pushes it to Cloudflare, and deploys the Worker. If it asks for access permissions, grant only the permissions needed for this Worker and container. It is normal for the new container to take time to provision after the Worker itself appears.

11. Configure **two different-purpose secrets** for staging (do not put them in `.jsonc`, GitHub, chat, or screenshots):

```powershell
.\cloudflare\node_modules\.bin\wrangler.cmd secret put GAME_GATE_SECRET --config wrangler.container.staging.jsonc
.\cloudflare\node_modules\.bin\wrangler.cmd secret put HEX_ADMIN_PASSWORD --config wrangler.container.staging.jsonc
```

Generate `GAME_GATE_SECRET` with a securely generated random string, e.g. PowerShell:

```powershell
$bytes = New-Object byte[] 48
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

Paste the result into Wrangler's password/secret prompt, not into project source. The `HEX_ADMIN_PASSWORD` should be a strong intended administrator password; if your saved admin account was originally managed through an environment password, changing it here may rotate that account's password on startup. No other users should need new accounts.

12. If you use a verified **Resend** sending domain for signup/recovery email, add a private sending-only key:

```powershell
.\cloudflare\node_modules\.bin\wrangler.cmd secret put RESEND_API_KEY --config wrangler.container.staging.jsonc
```

The sender is already locked to `no-reply@hexsettlers.org` in all Wrangler configuration files and in server code. Do **not** edit this value through the Cloudflare dashboard: Wrangler applies the committed value on every GitHub deployment. Verify `hexsettlers.org` in Resend and create an API key with Sending access to that domain. The container sets `HEX_EMAIL_MODE=resend` automatically when the secret is present; otherwise it disables outgoing account email. This setup uses no Railway email service.

13. Check staging using the exact URL Wrangler printed:

```powershell
curl.exe -i 'https://hex-settlers-cloudflare-staging.YOUR-SUBDOMAIN.workers.dev/health'
```

Expected after container startup: HTTP `200`, JSON `ok:true`, and `persistence.mode:"r2"`, `persistence.healthy:true`. First health request can start a cold container. An HTTP `503` indicates missing secrets, missing/corrupt `users.json`, or a persistence error. Inspect Cloudflare Workers and Containers logs; do **not** set `ALLOW_EMPTY_DATABASE=1` to bypass a failed migration.

14. In staging, sign into a **pre-existing account** and check account details, rating, friends, game history, and uploaded texture packs. Create a new unranked room, add AI players, create and join a WebSocket from another browser/private session, perform trades and turns, pause and resume, end a match, and verify the new match survives a container restart. Include 7/8-player Fog Island, Scattered Tiles, and Cartographer. Try account recovery if email is configured. Confirm the texture template downloads correctly.

## Part D — Prepare production without overwriting data

15. Continue using Railway during testing, but schedule maintenance for the final cutover. Let existing games finish and stop creating new rooms there. **Re-export the volume after the final live match** so you do not lose new users, history or ratings that changed during staging tests.
16. Upload the fresh final backup to the **production** R2 bucket; stage and production have separate data:

```powershell
.\scripts\upload-railway-backup.ps1 -BackupDirectory 'D:\HexSettlers-FINAL-Railway-Backup' -Bucket 'hex-settlers-state'
```

This overwrites the production snapshot keys intentionally. Never overwrite a *currently active* Cloudflare production bucket with an old Railway snapshot after cutover. Maintain independent offline backups.

17. Review `wrangler.container.production.jsonc` before continuing. It specifies `name: hex-settlers`, `PUBLIC_BASE_URL: https://hexsettlers.org`, production bucket `hex-settlers-state`, and **no** `UPSTREAM_ORIGIN` or Railway hostname. Keep this exact Worker name if that is the existing Worker serving your domain.
18. Deploy production:

```powershell
.\cloudflare\node_modules\.bin\wrangler.cmd deploy --config wrangler.container.production.jsonc
```

19. Set **production** secrets separately (staging secrets are not automatically copied across Workers):

```powershell
.\cloudflare\node_modules\.bin\wrangler.cmd secret put GAME_GATE_SECRET --config wrangler.container.production.jsonc
.\cloudflare\node_modules\.bin\wrangler.cmd secret put HEX_ADMIN_PASSWORD --config wrangler.container.production.jsonc
# Optional, if already configured as a verified Resend sender:
.\cloudflare\node_modules\.bin\wrangler.cmd secret put RESEND_API_KEY --config wrangler.container.production.jsonc
```

20. In **Cloudflare → Workers & Pages → hex-settlers → Settings → Domains & Routes**, verify `hexsettlers.org` still points to this Worker. If the domain was attached to a *different* Worker/Pages project, change the routing only after staging is accepted; do not blindly replace DNS records. Test:

```powershell
curl.exe -i https://hexsettlers.org/health
```

Open the real site and verify two human clients and one AI can play, and that rooms/history/ratings survive reconnect and a scheduled restart. Inspect Cloudflare request logs to confirm no requests are sent to `hexsettlers.up.railway.app`.

## Part E — Switch Railway off (only after production is verified)

21. Keep Railway available for rollback until all production checks pass. After you have a new backup of the **Cloudflare** production R2 bucket and all account/history totals match, remove the old Railway service in the Railway dashboard. Cancel its subscription separately if there are no other active projects. Do not delete your offline volume backups.
22. Monitor Cloudflare Workers + Containers usage/billing. The provided config uses **one `standard-1` Container (0.5 vCPU, 4 GiB RAM)** to preserve the existing single-server architecture and support AI games. The container sleeps after two hours without requests; it is **not** cost-free despite Workers Paid.
23. Schedule independent R2 backups or replication. The live JSON data are synchronized to private R2; if R2 fails, `/health` returns `503` and logs an error. Unexpected container termination can still lose actions not yet saved by a coalesced write. For high-traffic competitive play, the long-term upgrade is per-room Durable Object SQLite transactions and a relational account database, not this single-container compatibility layer.

## Troubleshooting

| Symptom | What to check |
|---|---|
| Worker responds `503 Missing required private game configuration` | `GAME_GATE_SECRET`, `HEX_ADMIN_PASSWORD` configured on **that** Worker; do not place them in `vars` |
| Worker returns `503` and container logs say `users.json missing` | Wrong R2 bucket, incorrect `state/users.json` key, missing import, wrong account permissions; never enable empty database as a quick fix |
| Container does not become ready | Docker image built, container provisioning, `/ready` internal probe and Node 3000; check Workers → Containers logs |
| Browser gets connected then drops | Worker `/ws` route reaches one container, correct Worker secret, Origin/host forwarded headers, game room remains present; test two browsers |
| Account recovery link points to staging / invalid domain | Correct `PUBLIC_BASE_URL`, sender verification and `RESEND_API_KEY` for that environment |
| 28 MiB template download gives 404 | `assets/texture-pack-template.zip` not imported to the same R2 bucket |
| Custom packs disappear after restart | Back up and import `texture-packs/<36hex>/<asset>` files; check R2 state keys and persistence error logs |
| Existing production domain still reaches Railway | It points to the **old** Worker, or Wrangler deployed staging rather than production; inspect Domains & Routes and remove old upstream config |
| New matches missing after a crash | Inspect R2 state file update timestamps and error logs; restore from your backups; only one container may write the shared JSON state |

**Constraints and validation:** The Node v48 gameplay engine and lobby protocol are intentionally preserved. The build's existing Node test suite and JavaScript syntax checks can be exercised without a Cloudflare account. The actual Container startup, outbound R2 binding, WebSocket upgrade, billing behavior, and production import must be verified on your Workers Paid account using staging; the ZIP cannot prove live deployment from this environment.
