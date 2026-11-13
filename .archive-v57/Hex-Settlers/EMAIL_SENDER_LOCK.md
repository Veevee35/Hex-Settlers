# Permanent Hex Settlers outgoing email sender (2026-11-10)

**Every outgoing game email uses `no-reply@hexsettlers.org`.** Applies to signup email verification, password reset, beta feedback notifications, diagnostic emails, and optional SMTP/Cloudflare Email bridge. Bug reports and suggestions are **received by `support@hexsettlers.org`**.

## Why the Cloudflare dashboard value was disappearing

Previously, `wrangler.jsonc`, `wrangler.container.staging.jsonc`, and `wrangler.container.production.jsonc` declared `"HEX_EMAIL_FROM": ""`. Cloudflare Builds deploys from those files and replaces dashboard-managed ordinary variables with the committed values. Editing `HEX_EMAIL_FROM` in the dashboard was therefore temporary.

## Permanent changes in this build

- All three Wrangler configs declare `"HEX_EMAIL_FROM": "no-reply@hexsettlers.org"`. GitHub deployments now republish the correct value rather than clearing it.
- The Cloudflare Container passes the fixed address to Node regardless of the Worker variable's value.
- `server/email-delivery.js` ignores old/blank/conflicting `HEX_EMAIL_FROM` or `SMTP_FROM` for the actual sender. Resend, SMTP and direct MX all use the fixed sender.
- The legacy Cloudflare Email Service bridge likewise ignores an `EMAIL_FROM` override and forces the fixed sender.
- The notification recipient is `support@hexsettlers.org`, including the admin test email. Previous queued reports remain in R2; no state migration.

## What you must configure once

1. In Resend → Domains, verify **`hexsettlers.org`** and add the DNS records Resend gives you.
2. In Resend → API Keys, ensure the key used by your game has **Sending access** for `hexsettlers.org` (or all verified domains). A key scoped to another domain will still return HTTP 403.
3. In the Cloudflare Worker currently serving `hexsettlers.org`, keep `RESEND_API_KEY` as an encrypted **Secret**. No need to edit the ordinary `HEX_EMAIL_FROM` dashboard variable after every push; the code and Wrangler config lock it. Do not store the API key in GitHub or a ZIP.
4. Push the complete build through your existing GitHub → Cloudflare process. Check Admin Management → Beta Testing: sender should show `no-reply@hexsettlers.org`. Click **Send test email to support** and confirm receipt at `support@hexsettlers.org`. Then use **Retry now** for earlier failed reports.

**Note:** A fixed sender is not the same as a verified domain. This source change cannot verify DNS or authorize a restricted Resend API key; the account must be configured separately. No live message was sent while preparing this ZIP.
