# Initialize this folder as a Git repo

From inside this folder:

```bash
git init
git add .
git commit -m "Initial Railway deploy"
git branch -M main

# Create an empty GitHub repo first, then set your remote:
# git remote add origin https://github.com/<you>/<repo>.git
# git push -u origin main
```

## Deploy on Railway
1. Railway → **New Project** → **Deploy from GitHub repo**.
2. After the first deploy succeeds, attach a **Volume**:
   - Service → **Volumes** → **Add Volume**
   - Mount path example: `/data`
   - Redeploy

This server writes `users.json` and `game_history.json` to the mounted volume automatically via `RAILWAY_VOLUME_MOUNT_PATH`.
