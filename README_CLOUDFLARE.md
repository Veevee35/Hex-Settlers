# Cloudflare deployment

The Cloudflare deployment currently uses a Worker as a bridge in front of the
existing Railway game server:

- Static files are served from `public/` by Cloudflare Workers Assets.
- `public/texture-pack-template.zip` is excluded by `public/.assetsignore`
  because it exceeds Cloudflare's per-asset size limit.
- `/api/*`, `/health`, and `/ws` are routed through `cloudflare/worker.mjs` to
  the Railway origin configured by `UPSTREAM_ORIGIN` in `wrangler.jsonc`.

This makes account management and multiplayer available at the Cloudflare URL,
but it is not the final Durable Objects migration. Railway still owns account,
room, game-history, neural-model, and uploaded-texture-pack persistence. Keep
the Railway service running while this bridge is deployed.

## Deploy

The Cloudflare build settings can remain:

```text
Build command: npm run build
Deploy command: npx wrangler deploy
```

After deployment, verify that `/health` returns the Railway server's JSON
health response and then test account login plus a WebSocket lobby connection.

## Durable Objects migration

Removing the Railway dependency requires adapting the Node server's filesystem
persistence and `ws`-based connection handling. Those pieces must be moved to
Durable Object storage and Cloudflare's WebSocket API before deleting the
bridge or shutting down Railway.
