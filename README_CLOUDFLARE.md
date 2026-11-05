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

## Recovery email

Recovery email uses Resend's HTTPS API so it works with Workers Free. Verify a
sending subdomain such as `send.tenthson.com` in Resend, create a sending-only
API key, and configure these private Railway variables:

```text
HEX_EMAIL_MODE=resend
HEX_PUBLIC_BASE_URL=https://hex-settlers.bt616923.workers.dev
HEX_EMAIL_FROM=Hex Settlers <account@send.tenthson.com>
RESEND_API_KEY=re_your_sending_only_key
```

The API key must never be committed to this repository. Cloudflare Email
Sending is not required. See `ADMIN_SETUP.md` for DNS and alternative-delivery
details.

## Durable Objects migration

Removing the Railway dependency requires adapting the Node server's filesystem
persistence and `ws`-based connection handling. Those pieces must be moved to
Durable Object storage and Cloudflare's WebSocket API before deleting the
bridge or shutting down Railway.
