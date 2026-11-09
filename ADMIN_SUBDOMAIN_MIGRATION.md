# Hex Settlers management portal — admin.hexsettlers.org

## Changes in this build

- Public `hexsettlers.org` contains no administrator menu or role label, including when `benleethom` signs in as a player.
- `admin.hexsettlers.org` uses the **same Cloudflare Worker, same HexGameContainer Durable Object ID, same R2 STATE bucket, same users, same history**. No separate database or state migration.
- The management hostname uses HTTP session authentication (it does not connect to a multiplayer WebSocket) and opens the **existing six management panels**: Server Management (including spectate, kick, close), Rating Management (save, preview and rebuild), User Account Management, Merge Accounts, Game History (export, import, delete, full reset) and Health Monitor.
- Administrator login is separate on each hostname because existing session cookies are HTTP-only, Secure, and **host-only** (no Domain attribute).
- Cloudflare Worker denies `/api/admin/*` and `/admin-portal.css` with 404 on public and workers.dev hosts; Node independently checks hostname before admin actions. Account management user enumeration is restricted to the admin host.
- `assets.run_worker_first=true` is required so static pages and assets cannot bypass hostname routing.

## Cloudflare dashboard steps (required once)

1. Deploy this build to the Worker currently hosting `hexsettlers.org`. Verify that `hexsettlers.org` remains on the same Worker and that existing staging/production bindings are untouched.
2. Cloudflare > Workers & Pages > **the Worker serving hexsettlers.org** > Settings > Domains & Routes > Add > **Custom Domain**. Enter exactly `admin.hexsettlers.org` and add it to that **same Worker**. Cloudflare automatically creates DNS and provisions a certificate when the zone is active. **Do not create a second Worker/container/R2 bucket**. Remove any pre-existing conflicting DNS record for `admin.hexsettlers.org` before adding.
3. Confirm `https://admin.hexsettlers.org/` displays **Management Sign In**. Sign in with the existing `benleethom` password or another genuinely admin-role account. Public player sessions do not automatically authenticate on the admin hostname.
4. Optional recommended: Cloudflare Zero Trust > Access > Applications > Add an application > Self-hosted; hostname `admin.hexsettlers.org`; allow only your own identity/email. Keep the in-app administrator account check. Ensure Access is **hostname-scoped** and does not cover `hexsettlers.org`.

## Smoke tests

- Public `https://hexsettlers.org/`: account menu has **no Admin Management entry**, including for `benleethom`.
- Public `https://hexsettlers.org/api/admin/rooms`: 404, even for administrator requests; POST with a valid admin session also 404.
- Public `https://hexsettlers.org/admin-portal.css`: 404. Assets cannot bypass Worker because `run_worker_first` is true.
- Administrator `https://admin.hexsettlers.org/`: password sign-in, dashboard with all six tabs.
- On admin host: view active rooms, check user list, export history (read-only smoke tests); ratings preview should not apply until explicit confirmation.
- Non-admin account on admin host: "Restricted area" and no management dashboard; direct API calls get 403.
- Spectator links launched from administration go to `hexsettlers.org`, not back to the admin hostname.
- Existing games, existing session on public host, R2 backups, OAuth provider logins, and public rooms remain functional.

## Notes

- The admin portal reuses the existing game JavaScript and tested management UI. The management interface is hidden and inaccessible on the public domain, but its implementation still exists in the shared public JavaScript asset. This is **UI and API isolation, not frontend code extraction**. Server-side enforcement—not source-code secrecy—protects management actions.
- `wrangler.jsonc`, `wrangler.container.staging.jsonc`, and `wrangler.container.production.jsonc` are updated for Worker-first static routing. Keep using the same config currently deployed.
- **No new secrets or OAuth callback URLs are needed** for the password-based administrator sign-in. Existing Google/GitHub/Cloudflare OAuth logins stay on public site.
- If `hexsettlers.org` is attached to the *staging* Worker, attach the admin Custom Domain to that *same staging Worker*; do not deploy to a different production worker inadvertently.
- Disable or narrowly scope previews/workers.dev routes if you do not want them public. The code denies admin APIs on those hosts regardless.

## Verify in PowerShell after deployment

```powershell
curl.exe -i https://admin.hexsettlers.org/
curl.exe -i -X POST https://hexsettlers.org/api/admin/rooms -H "Content-Type: application/json" --data "{}"
curl.exe -i https://hexsettlers.org/admin-portal.css
curl.exe -i -X POST https://admin.hexsettlers.org/api/admin/rooms -H "Content-Type: application/json" --data "{}"
```

Expected: admin root `200` and **Management Sign In**; public management API `404`; public private stylesheet `404`; admin API with no login cookie `401` (or Cloudflare Access authentication challenge if Access is enabled). There is no need to use an admin credential in these command-line checks.

If the domain `hexsettlers.org` is still served by the **staging Worker** as your production deployment, attach `admin.hexsettlers.org` to that staging Worker and use its existing `STATE` bucket. Do not switch to the other Worker just because its name is `hex-settlers`.

If Cloudflare says the custom domain cannot be added because the zone is not active, you must first enable the `hexsettlers.org` zone in Cloudflare. If DNS is still delegated to IONOS, carefully copy its current records (especially MX, TXT, SPF, DKIM, DMARC) into Cloudflare and update the domain nameservers at IONOS. Do not change nameservers without migrating DNS records; doing so can interrupt the site or email.

If you later change the existing Worker variable `PUBLIC_BASE_URL` to `https://hexsettlers.org` (recommended when that is the canonical public origin), review the existing public OAuth callback registrations against the actual host before redeployment. The **admin hostname itself** does not require additional OAuth callbacks.
