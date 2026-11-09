# Cloudflare npm ci / Electron download fix — November 9, 2026

## Failure addressed

Cloudflare Workers Builds ran `npm clean-install --progress=false` at the repository root. Previously this installed `electron` and ran `node install.js`, which downloaded a desktop binary that timed out with `HTTPError: Response code 504`. Electron is only needed for the optional desktop wrapper, not the hosted Worker/container game.

## Changes

- Removed Electron and electron-builder from the root `devDependencies` and root lockfile. The web/server build still retains TypeScript and WebSocket dependencies.
- Moved the Electron wrapper into `desktop/` with its own `package.json`, `package-lock.json`, and desktop build metadata.
- Updated GitHub Actions desktop release workflow to run `npm ci --prefix desktop` and package the desktop project only for desktop releases.
- Existing `npm run electron:start` and `npm run electron:dist -- --linux AppImage` shortcuts remain available (after `npm ci --prefix desktop`).
- Desktop wrapper now opens `https://hexsettlers.org/` instead of the retired Railway URL.
- No game rules, weekly Challenge Maps, public assets, Wrangler configuration, secrets, or R2 persistence were altered.

## Deployment

1. Replace the project files in your existing GitHub repository with this ZIP's `Hex-Settlers/` contents (keep the repo's `.git` folder). Include the updated root `package.json`, `package-lock.json`, and `desktop/`.
2. Commit and push to the branch connected to your Cloudflare Workers Build. Do not modify R2 buckets or Cloudflare secrets.
3. Cloudflare's automatic `npm clean-install` should now install just the web project dependencies. Your existing build command and deploy command do not need to change.

If a different error appears, inspect that new error separately. This addresses the Electron binary-download failure, not unrelated Cloudflare container build or deployment issues.
