# Railway deployment

## Required service settings

1. Deploy this folder as one Node service.
2. Keep **Replicas = 1**. Lobby membership, active WebSocket ownership, and current game state are held in the Node process. Multiple replicas require an external shared state/pub-sub layer that this build does not use.
3. Attach a persistent Railway volume and mount it at `/data`.
4. Use `npm run build` as the build command.
5. Use `npm start` as the start command.
6. Set the Railway health-check path to `/health`.
7. Add `HEX_ADMIN_PASSWORD` as a private Railway variable with a strong password for the built-in `Benleethom` administrator account.

Railway supplies `PORT` and `RAILWAY_VOLUME_MOUNT_PATH`. The server binds to `0.0.0.0:$PORT` and automatically uses the mounted volume for runtime data.

## Persistence

The volume stores:

- `users.json`
- `game_history.json`
- `active_rooms.json`
- `neural_ai_model.json`

Without a volume, these files are written to the deployment filesystem and may disappear during a redeploy or replacement.

Lobby creation is not acknowledged to the browser until the active-room snapshot has been written. On a WebSocket reconnect, an authenticated room member can recover the room binding from the room code and the persisted membership record.

## Verify this build

After deployment, open:

`https://YOUR-DOMAIN/health`

A correct response includes:

```json
{
  "ok": true,
  "build": "admin-user-management-v1"
}
```

Then:

1. Log in and create a lobby.
2. Change the victory-point target or map.
3. Leave the lobby page open for at least one minute.
4. Refresh the page and use **Rejoin Last Room** if necessary.
5. Confirm the room code and lobby settings are still present.

The browser and server both send heartbeat traffic. A transient WebSocket interruption now reconnects without immediately deleting the local lobby view or clearing the account session.

## Administrator account

The server reserves username **Benleethom** and creates it with player name **Ben**. Set `HEX_ADMIN_PASSWORD` before deployment so the account has a known strong password. When the variable is missing on the first production start, a random temporary password is printed once in the Railway deploy log.

After logging in as Benleethom, use **User Management** in the lobby to search registered users and reset their passwords. A reset invalidates the affected user’s existing saved sessions. Password hashes and session-token hashes are never returned to the browser.

## Custom domains

For a custom domain or separate front end, set `HEX_ALLOWED_ORIGINS` to a comma-separated list of complete origins, such as `https://game.example.com`. Same-host browser clients work without this setting.
