# Hex Settlers - Railway Deploy (quick)

## Deploy
1. Push this folder to a GitHub repo (repo root should contain `package.json` + `server.js`).
2. In Railway: **New Project → Deploy from GitHub Repo**.
3. After first deploy succeeds, attach a **Volume**:
   - Service → **Volumes** → **Add Volume**
   - Mount path can be anything (example: `/data`).
   - Redeploy.

## Persistence
- `users.json` and `game_history.json` are automatically written to the mounted volume via `RAILWAY_VOLUME_MOUNT_PATH`.
- If no volume is attached, they fall back to the server folder (ephemeral on Railway).

## Start
- Railway should auto-detect Node and run `npm start`.
