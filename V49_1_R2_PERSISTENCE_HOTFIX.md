# Hex Settlers v49.1 — Cloudflare R2 persistence hotfix

## Issue corrected
Cloudflare's R2 `put()` requires a body with a known length. In v49, the internal Worker state bridge piped incoming container PUT request bodies through `TransformStream`, which strips the known length metadata and causes `TypeError: Provided readable stream must have a known length`. This blocked every write to `state/users.json` and made the game `/health` endpoint return HTTP 503, even when the Container was running.

## Fix
- Forward the original known-length Request stream directly to `env.STATE.put`, avoiding the TransformStream that discarded length information.
- Validate declared Content-Length against upload size limits before writing.
- For requests without Content-Length, buffer only up to 8 MiB; reject larger unknown-length uploads rather than risking Worker memory exhaustion.
- Preserve the existing private R2 bucket, user data, room state, account format, and container runtime.
- Replace the buggy `scripts/upload-railway-backup.ps1` in the full archive with the previously corrected PowerShell validator (not needed for this hotfix deployment).

## Deploy to your existing staging Worker (Windows PowerShell)
1. From the v49 extracted project, replace ONLY `cloudflare/container-worker.mjs` with the corrected v49.1 file.
2. Confirm the current `wrangler.container.staging.jsonc` still points to `hex-settlers-state-staging` and has your correct `PUBLIC_BASE_URL`.
3. Deploy: ` .\cloudflare\node_modules\.bin\wrangler.cmd deploy --config wrangler.container.staging.jsonc `
4. Verify: `curl.exe -i "https://hex-settlers-cloudflare-staging.bt616923.workers.dev/health"`
5. Trigger a normal login or logout on staging, then retry `/health` and inspect Worker tail logs. R2 state PUT failures must stop and `persistence.healthy` must become `true`.
6. Confirm `state/users.json` last modified time advances in the private staging R2 bucket, and test a new game and reconnect.
7. Do NOT switch the live domain or shut down Railway until staging succeeds and new game state persists across container restart.

## Tests
`npm run check`: 377/377 passing, including four R2 write regression tests. This validates the source locally; live Cloudflare Container and R2 behavior must be verified after deployment.

## Data warning
R2 backups and previously uploaded state were not changed by producing this patch. State changes attempted in staging while R2 writes were failing may exist only in container memory and might not survive restart. Protect your original Railway backup; do not delete/reimport it unnecessarily.
