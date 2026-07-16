# Railway deployment

1. Deploy the repository as a Node service.
2. Attach a persistent volume and mount it at `/data` (or another writable path).
3. Railway supplies `RAILWAY_VOLUME_MOUNT_PATH`; no custom `DATA_DIR` is needed when that variable is present.
4. Use `npm run build` as the build command and `npm start` as the start command.

The service binds to Railway's `PORT` on `0.0.0.0`. Railway environments enable trusted-proxy handling automatically, so secure cookies and client addresses use Railway's forwarded headers.

The volume stores `users.json`, `game_history.json`, `active_rooms.json`, and `neural_ai_model.json`. Without a volume those files live on the deployment filesystem and can disappear on redeploy.

For a custom domain or a separate front end, set `HEX_ALLOWED_ORIGINS` to a comma-separated list of complete origins such as `https://game.example.com`. Same-host browser clients work without this setting.

After deployment, confirm the home page loads over HTTPS, create a temporary room, and redeploy once to verify that the account and room can be recovered from the volume.
