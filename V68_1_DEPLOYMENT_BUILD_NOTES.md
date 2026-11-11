# Hex Settlers V68.1 — dependency update and Cloudflare build troubleshooting

This build retains the V68 application security hardening. Only the root `package.json` and `package-lock.json` dependency records were changed from `ws@8.18.3` to exact `ws@8.22.2`. This resolves the documented 2026 resource exhaustion and memory-disclosure advisories for the old 8.18.3 release. The dependency is deliberately pinned; do not keep the old lockfile.

## Cloudflare deployment failure observed on 2026-11-11

Your build reached Docker image building, then failed on this error before executing the npm command:

```
runc run failed: unable to start container process: error during container init:
error mounting "proc" to rootfs at "/proc": operation not permitted
```

This is a Docker runtime host/procfs mount permission failure, not an npm install or source compilation failure. Changing `npm ci` or the Dockerfile `RUN` line is not a reliable fix. This package update is independent and will not by itself repair the Docker build environment.

### Recommended recovery

1. Make sure the existing game is healthy and record the last known working revision; a failed Wrangler containers deploy may have activated the Worker ahead of the image build.
2. In the Cloudflare dashboard, go to the Worker > Deployments > View Build History, open the failed build, and choose Retry Build. If retrying the **same** commit, no new code is necessary for the Docker error.
3. To deploy V68.1 (with the updated `ws` package) replace the project files with this ZIP's contents, commit, and push via your existing GitHub Cloudflare Builds workflow.
4. If the `/proc` runc mount error repeats, use Docker Desktop on a local Windows/WSL or other Docker host that can run containers, then deploy from the project root:

```
npm ci
npm install --prefix cloudflare --no-audit --no-fund
node scripts/stamp-git-build.cjs
./cloudflare/node_modules/.bin/wrangler deploy --config wrangler.container.production.jsonc
```

The final command targets PRODUCTION `hex-settlers` and R2 bucket `hex-settlers-state`. For staging, use `--config wrangler.jsonc` instead. Keep the current Cloudflare secrets and R2 bucket; do not recreate them. Re-run the test suite and verify `/health` and the admin MFA flow.

5. If local Docker builds work but Cloudflare Builds still fails, raise a Cloudflare support ticket with the exact log and Docker permission error. Do not disable Docker isolation or privileged security settings to bypass the issue.

### Separate npm audit warning

The log's `1 high severity vulnerability` is consistent with the root lockfile containing vulnerable `ws@8.18.3`. Cloudflare logs did not show the individual advisory; run `npm audit --omit=dev` after installing the new version to confirm the audit result. This package could not execute `npm ci` locally because the build sandbox has no registry DNS connectivity; no dependency-inclusive integration test is claimed. Existing dependency-free security tests were rerun.

Sources: https://developers.cloudflare.com/containers/guides/deploy/ and https://developers.cloudflare.com/workers/ci-cd/builds/troubleshoot/
