# Account and administrator setup

This build reserves the following administrator identity:

- Username: `Benleethom`
- Player name: `Ben`

## Railway administrator account

Create a private Railway variable before deploying:

```text
HEX_ADMIN_PASSWORD=choose-a-strong-password-here
```

The account is created automatically on startup. If `HEX_ADMIN_PASSWORD` is omitted on the first production start, the server generates a random temporary password and prints it once in the deploy log.

After logging in as `Benleethom`, open **User Management** from the lobby. Ben can search all registered users, reset another user's password, or permanently delete a non-administrator account after typing its username. Deletion revokes the account's sessions and removes its login, password, and linked email. Historical game records are retained so completed-game results remain coherent. The built-in administrator cannot be deleted. Every other player sees **My Account** and receives only their own account record.

All signed-in users can change their own password after entering their current password. This revokes other saved sessions while issuing a fresh cookie for the current browser. If Ben changes the built-in administrator password inside the game, the account becomes in-app managed and future restarts will not overwrite it from `HEX_ADMIN_PASSWORD`. Set `HEX_ADMIN_FORCE_PASSWORD_SYNC=true` for one restart when you intentionally need the Railway variable to replace Ben's current password.

## Recovery email and password-reset links

Password recovery requires a public URL, a sender identity, and a working delivery transport. For the Railway + Cloudflare deployment, use the built-in Cloudflare Email Service bridge. Railway sends the message to your Worker over protected HTTPS, and the Worker sends it from your Cloudflare-managed domain. No third-party email provider is required.

```text
HEX_PUBLIC_BASE_URL=https://hex-settlers.bt616923.workers.dev
HEX_EMAIL_MODE=cloudflare
HEX_EMAIL_CLOUDFLARE_ENDPOINT=https://hex-settlers.bt616923.workers.dev/api/internal/send-email
HEX_EMAIL_BRIDGE_SECRET=the-same-long-random-secret-used-in-cloudflare
```

In Cloudflare, onboard `tenthson.com` (or change `EMAIL_FROM` in `wrangler.jsonc` to another domain you control) in **Email Service**, and add the SPF/DKIM records Cloudflare provides. Then store the bridge secret without committing it:

```powershell
npx wrangler secret put EMAIL_BRIDGE_SECRET
```

Put the exact same secret in Railway as `HEX_EMAIL_BRIDGE_SECRET`, add the other three Railway variables shown above, redeploy both services, and resend verification. The Worker endpoint accepts only requests carrying this secret and always uses the fixed `EMAIL_FROM` sender configured in `wrangler.jsonc`.

Direct SMTP remains available only as an explicit option for a host that permits outbound port 25:

```text
HEX_EMAIL_MODE=direct
HEX_EMAIL_FROM=Hex Settlers <no-reply@YOUR-DOMAIN>
HEX_EMAIL_EHLO_NAME=mail.YOUR-DOMAIN
```

Railway allows outbound SMTP only on Pro plans and above, while Cloudflare Workers cannot open port 25. Direct SMTP is therefore not suitable for the current deployment. Set `HEX_DIRECT_EMAIL_REQUIRE_TLS=true` if using it elsewhere and delivery must fail whenever a recipient MX server does not offer STARTTLS.

External delivery is optional. If you later choose a provider or relay, select one of these overrides.

### Resend

```text
RESEND_API_KEY=re_xxxxxxxxx
HEX_EMAIL_MODE=resend
```

The sender in `HEX_EMAIL_FROM` must be accepted by your Resend account.

### SMTP

```text
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
SMTP_FROM=Hex Settlers <no-reply@YOUR-DOMAIN>
SMTP_REQUIRE_TLS=true
HEX_EMAIL_MODE=smtp
```

Use `SMTP_SECURE=true` for implicit TLS, normally port 465. Port 587 normally uses STARTTLS and should keep `SMTP_REQUIRE_TLS=true`.

Set `HEX_EMAIL_MODE=none` to disable email features completely. Once delivery is available, a signed-in player can open **My Account**, enter an email and current password, and send a verification link. Verification links expire after one hour. Only verified addresses can receive pre-login password-reset emails. Password-reset links expire after 30 minutes and can be used once.

Password hashes, email verification tokens, password-reset tokens, and session tokens are never returned to the browser. Stored one-time tokens and sessions are hashed on disk.
