# V68.2 — Cloudflare GitHub auto-deploy Docker build repair

## Diagnosis

Cloudflare Builds successfully ran the root `npm clean-install` and the configured
build command, but Docker failed on `RUN npm ci --omit=dev --ignore-scripts`
while runc tried to mount `/proc` (`operation not permitted`). This is a Docker
builder privilege/runtime failure, not a failed npm install or a game-code error.
Repeated retries cannot fix an unchanged permission problem.

## Fix included

- `cloudflare/Dockerfile` has **no RUN steps**. The container now copies the
  already-installed root `node_modules` instead of invoking npm from inside Docker.
- `.dockerignore` now allows the root `node_modules` to be part of the build
  context; it continues to exclude Wrangler tooling, secrets, `.git`, user
  persistence files, and the large ZIP used for R2 texture uploads.
- `cloudflare/container-data/.keep` creates `/data` with ownership `node:node`
  without any privileged build-time command.
- The container still runs as `USER node`, downloads current state from R2 on
  startup, and uses the same Worker, Container durable object, runtime secrets,
  existing R2 buckets, entrypoint, and settings.
- Added `test/v68-2-cloudflare-deploy.test.mjs` to prevent accidentally restoring
  build-time RUN commands or excluding runtime dependencies from the image.
- Retains the V68.1 security hardening, ws 8.22.2, and Seafarers water tile fix
  from the uploaded source.

## One-time deployment: GitHub -> existing Cloudflare Worker

1. Extract the ZIP and copy **the contents of `Hex-Settlers/`** into your existing
   GitHub repository root (including `.dockerignore`, `cloudflare/Dockerfile`,
   and `cloudflare/container-data/.keep`). Preserve `.git`, and commit/push to
   the branch connected to your existing Cloudflare Worker.
2. **Keep the Cloudflare build settings already used in your failed log:**

   Build:  `npm install --prefix cloudflare --no-audit --no-fund && node scripts/stamp-git-build.cjs`

   Deploy: `./cloudflare/node_modules/.bin/wrangler deploy --config wrangler.container.production.jsonc`

   Cloudflare's normal pre-build `npm clean-install` installs root dependencies;
   do not disable it. The existing build command and deploy command are
   sufficient. If you have disabled automatic root package installation, use:

   `npm ci --ignore-scripts --no-audit --no-fund && npm install --prefix cloudflare --no-audit --no-fund && node scripts/stamp-git-build.cjs`

   **Important:** your previous log used the **production** config (`hex-settlers`,
   R2 `hex-settlers-state`). Leave it as production if that is your live system;
   do not switch to staging or reset/migrate R2 merely to fix the build.
3. The next push must trigger a **new** build (retrying the old commit only
   retries the old Dockerfile). Inspect the Docker image build log. You should
   see COPY instructions but **no `RUN npm ci` step**.
4. Confirm the deploy finishes, test the game at https://hexsettlers.org,
   and confirm admin MFA via https://admin.hexsettlers.org. Test login,
   WebSocket rejoin, new room creation, and water tiles in Seafarers preview
   and live gameplay.

No new Cloudflare environment variables, GitHub Actions secrets, domain changes,
R2 migration, or Docker Desktop installation is required for this fix.

## If Docker still fails

If the exact `/proc` mount error now occurs without any `RUN` step, Cloudflare's
Docker infrastructure cannot perform even a copy-only build. That cannot be
resolved by changing this game's Node code. Cloudflare supports using an
existing container registry image instead of a Dockerfile. A separate CI
pipeline (GitHub Actions with a working Docker runner) can build/push an image
and then deploy the Worker against that image, but that requires registry
credentials and workflow configuration; do not switch approaches or create a
second Worker or R2 bucket without first confirming this fallback is needed.

See https://developers.cloudflare.com/containers/guides/deploy/ for details.
