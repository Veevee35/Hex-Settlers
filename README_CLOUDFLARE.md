# Current Cloudflare deployment: Durable Object + Container + R2

Use **[`CLOUDFLARE_ONLY_DEPLOYMENT.md`](CLOUDFLARE_ONLY_DEPLOYMENT.md)** for complete Windows and Cloudflare instructions. The default `wrangler.jsonc` is deliberately a staging configuration to protect your live domain; production uses `wrangler.container.production.jsonc`. All `/api/*`, `/ws`, and `/health` requests are processed in Cloudflare and there is no Railway dependency in the deployed Worker.

The old `cloudflare/worker.mjs` file is retained *only* for existing v48 regression tests and historical comparison. It must **not** be used as your production `main` entrypoint.

Cloudflare Paid is required because the full Node gameplay engine is deployed in a **Cloudflare Container managed by a Durable Object**. Per-room native Durable Objects would require a much larger game-engine rewrite. Persistent JSON, shared custom textures, and the large texture-template archive live in private R2. A public R2.dev URL is unnecessary and unsafe for account data.
