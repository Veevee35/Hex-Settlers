# Hex Settlers v39 — Admin Account Tabs & Automatic GitHub Versioning

## Admin Management
- The former User Management section is split into **User Account Management** and **Merge Accounts** tabs.
- **User Account Management** retains the non-admin account list, search, password-reset and account deletion features, with the admin account remaining managed under the ordinary **Manage Account** page.
- **Merge Accounts** contains only the two-account selection, kept username selection, and the existing irreversible merge operation. A completed merge refreshes the tab only if it remains selected.
- Other admin tabs (Server, Rating, Game History, Health) remain unchanged; all existing server-side permissions and checks remain authoritative.

## Version in login and game-type portals
- Both the Login and Choose Game Type screens display **V1.0.0** near the bottom center.
- On phones, the label sits just above the bottom legal links and support badge to prevent overlap.
- This version is also synchronized with `package.json`, `package-lock.json`, the front-end CSS/JS URL cache-bust keys, and the service-worker cache key.

## Automatic increments when pushing a build to GitHub
- `.github/workflows/version-on-push.yml` runs on pushes to `main` or `master`. It increments the build version and commits updated files back to the same branch. Its own bot commit is excluded from repeat bumping.
- `scripts/bump-version.cjs --bump` increments the **patch** number through 99, then increases the **minor** number and resets the patch to 0:
  `V1.0.0 → V1.0.1 → … → V1.0.99 → V1.1.0`.
- To change the first (major) number, edit **only the `major` field** in `build-version.json`. The next GitHub build resets minor and patch to 0, e.g. `V1.7.54 → V2.0.0`.
- The `lastBuiltMajor` field is maintained automatically; do not edit it manually.
- `node scripts/bump-version.cjs --sync` regenerates the visible version and version-related metadata **without** increasing the version.
- Each version bump also changes the service-worker cache key and CSS/JS URL revisions, helping devices fetch the newest web client.

### GitHub/Cloudflare deployment requirements
1. Commit this v39 source and workflow to the branch Cloudflare deploys (normally `main`).
2. Ensure **Settings → Actions → General → Workflow permissions** allows GitHub Actions to write repository contents and that branch protection permits the bot version commit. The workflow explicitly requests `contents: write`, but organization/repository restrictions may prevent pushes.
3. If Cloudflare is connected directly to GitHub, verify its integration deploys the **follow-up version commit** made by `github-actions[bot]`. If it ignores bot commits, configure a Cloudflare deployment step from GitHub Actions instead; the workflow alone cannot guarantee external deployments.
4. For manual ZIP deploys, the on-push workflow does not run. Use `node scripts/bump-version.cjs --bump` before deploying when a manual increment is desired.

GitHub tag-only `Electron Release` builds are still handled by the existing Electron workflow; this new version workflow is for source pushes to the web deployment branch.

## Validation
- `npm run check`: 345 tests passed, 0 failed, including five new tests covering tab separation, version markers, patch rollover, manual major resets, GitHub action wiring, and on-disk version stamping.
- No backend database migration or environment variable is required.
