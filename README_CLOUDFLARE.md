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
HEX_EMAIL_FROM=Hex Settlers <no-reply@send.tenthson.com>
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

## v48 origin-shield security (recommended)

The current Worker still forwards multiplayer requests to the Railway Node server.
A public Railway origin can bypass Cloudflare protections unless protected.
To enable the new origin shield, set the **same cryptographically random secret**
in two places (use a secret manager, not `wrangler.jsonc` or a committed `.env`):

1. Railway service: `HEX_UPSTREAM_SHARED_SECRET=<your-long-random-secret>`.
2. Cloudflare Worker: add the secret named `UPSTREAM_SHARED_SECRET` using
   `npx wrangler secret put UPSTREAM_SHARED_SECRET`, or the Worker settings UI.

**Deployment order:** configure the secret on Cloudflare first, then on Railway.
Once Railway's secret is set, directly accessing its `/api/*`, `/ws`, or
`/health` endpoints without the Worker-signed header returns HTTP 403.
If only the Railway secret is set, the live game will be temporarily unreachable
through Cloudflare until the Worker receives the matching value.

You must still keep the Railway origin running. Neither the Worker nor these
security changes replace Railway with Durable Objects or make the system
independent of the upstream game server.

### Admin bootstrap

For a fresh persistent volume, explicitly set `HEX_ADMIN_PASSWORD` as a private
Railway environment variable. v48 does not generate and print an administrator
password in logs. An existing configured administrator is retained. Do not
store admin passwords, account sessions, or upstream secrets in source control.

### Connection and cleanup validation

After deploying BOTH the Worker and the backend, test `https://hexsettlers.org/health`,
create a lobby with two browser sessions, remove and rejoin one session, and
confirm the connection dot remains green and displays a recent heartbeat RTT
when hovered. Verify the admin health view shows expected room counts. Idle
rooms are swept once a minute, not precisely at the expiration timestamp.
