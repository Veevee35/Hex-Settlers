# Cloudflare deployment

The Cloudflare deployment currently uses a Worker as a bridge in front of the
existing Railway game server:

- Static files are served from `public/` by Cloudflare Workers Assets.
- `public/texture-pack-template.zip` is excluded by `public/.assetsignore`
  because it exceeds Cloudflare's per-asset size limit.
- `/api/*`, `/health`, and `/ws` are routed through `cloudflare/worker.mjs` to
  the Railway origin configured by `UPSTREAM_ORIGIN` in `wrangler.jsonc`.
- `/api/internal/send-email` is handled inside the Worker instead of being
  proxied. It requires the `EMAIL_BRIDGE_SECRET` Worker secret and sends through
  the native `EMAIL` binding with the fixed `EMAIL_FROM` sender.

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

## Recovery email

Onboard the sender domain from `EMAIL_FROM` in Cloudflare Email Service and add
the DNS records Cloudflare supplies. Create a long random secret, store it in
Cloudflare with `npx wrangler secret put EMAIL_BRIDGE_SECRET`, and store the
same value in Railway as `HEX_EMAIL_BRIDGE_SECRET`. Railway also needs:

```text
HEX_EMAIL_MODE=cloudflare
HEX_PUBLIC_BASE_URL=https://hex-settlers.bt616923.workers.dev
HEX_EMAIL_CLOUDFLARE_ENDPOINT=https://hex-settlers.bt616923.workers.dev/api/internal/send-email
```

The secret must never be committed to this repository. See `ADMIN_SETUP.md`
for sender-domain and alternative-delivery details.

## Durable Objects migration

Removing the Railway dependency requires adapting the Node server's filesystem
persistence and `ws`-based connection handling. Those pieces must be moved to
Durable Object storage and Cloudflare's WebSocket API before deleting the
bridge or shutting down Railway.
