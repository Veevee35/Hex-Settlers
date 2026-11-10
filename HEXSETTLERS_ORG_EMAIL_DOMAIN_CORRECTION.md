# Fix: beta feedback email was incorrectly directed to .com

Hex Settlers uses `hexsettlers.org`, **not** `hexsettlers.com`. Earlier beta feedback builds mistakenly hard-coded the recipient as `support@hexsettlers.com` and described that wrong domain in comments, docs, UI, and tests. This version corrects those references to `support@hexsettlers.org`.

## Action required in Cloudflare

The deployed `HEX_EMAIL_FROM` environment variable **does not update when source code changes**. In your active Worker/Container deployment, change `HEX_EMAIL_FROM` from `support@hexsettlers.com` to `support@hexsettlers.org` (or another sender on an already verified `hexsettlers.org` domain). Ensure the `hexsettlers.org` sending domain is verified and the Resend API key has permission to send from it. Make sure `support@hexsettlers.org` exists as an inbox or forwarding alias so you receive mail. Redeploy the service, use the admin diagnostic send button, then retry any previously failed notifications.

## Source changes

- `server/beta-feedback-email.js`: corrected the **actual notification recipient**.
- `server.js`: corrected the diagnostic success message.
- Privacy policies and release documentation: corrected the destination.
- `.env.example`: updated example sender to the `.org` domain.
- Regression tests: updated assertions and test fixtures to the `.org` domain.

No database migration, gameplay reset, or clearing feedback history is required.
