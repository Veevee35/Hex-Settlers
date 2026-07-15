# Railway deployment

1. Connect the repository to a Railway Node service.
2. Use `npm ci && npm run build` as the build command if Railway does not use the package scripts automatically.
3. Use `npm start` as the start command.
4. Attach a Railway volume and expose its mount through `RAILWAY_VOLUME_MOUNT_PATH`.
5. Deploy and verify `/` loads over HTTPS and `/ws` upgrades successfully.

The volume stores `users.json`, `game_history.json`, and `active_rooms.json`. Without a volume, all three files live on the ephemeral deployment filesystem and are lost when Railway replaces the instance.

Railway supplies `PORT`. The application defaults `HOST` to `0.0.0.0` and automatically trusts Railway's forwarded client-address header for authentication throttling. Set `HEX_ALLOWED_ORIGINS` only when an additional browser origin must connect to the WebSocket or authentication API.

The process handles `SIGTERM`, stops accepting connections, snapshots active rooms, and flushes queued account/history writes before exiting.
