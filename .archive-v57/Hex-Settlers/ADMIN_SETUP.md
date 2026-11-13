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

Password recovery requires a public URL, a sender identity, and a working delivery transport. For the Railway + Cloudflare deployment, the recommended free option is Resend. Railway calls Resend directly over HTTPS, so Cloudflare Email Sending and Workers Paid are not required.

```text
HEX_PUBLIC_BASE_URL=https://hex-settlers.bt616923.workers.dev
HEX_EMAIL_MODE=resend
HEX_EMAIL_FROM=no-reply@hexsettlers.org
RESEND_API_KEY=re_your_sending_only_key
```

Create a Resend account, add the sending domain `hexsettlers.org`, and add the DNS records Resend supplies to Cloudflare DNS. After Resend marks the domain verified, create an API key with **Sending access** restricted to that domain and store it as the private Railway variable `RESEND_API_KEY`. Do not commit the key. The outbound From address is fixed in game code to `no-reply@hexsettlers.org`, even if an environment variable differs.

Remove the old Railway variables `HEX_EMAIL_CLOUDFLARE_ENDPOINT` and `HEX_EMAIL_BRIDGE_SECRET`, set the four variables above, and redeploy Railway. No Cloudflare Worker secret or Email Sending binding is used in this mode.

Resend's free plan currently includes 3,000 emails per month with a 100-email daily limit. Verification and reset emails both count toward those limits.

### Optional paid Cloudflare Email Service

The protected Cloudflare bridge remains supported in the server for installations using Workers Paid. Set `HEX_EMAIL_MODE=cloudflare`, `HEX_EMAIL_CLOUDFLARE_ENDPOINT`, and `HEX_EMAIL_BRIDGE_SECRET`, and restore/configure the Worker Email binding when intentionally using that option.

Direct SMTP remains available only as an explicit option for a host that permits outbound port 25:

```text
HEX_EMAIL_MODE=direct
HEX_EMAIL_FROM=no-reply@hexsettlers.org
HEX_EMAIL_EHLO_NAME=mail.hexsettlers.org
```

Railway allows outbound SMTP only on Pro plans and above, while Cloudflare Workers cannot open port 25. Direct SMTP is therefore not suitable for the current deployment. Set `HEX_DIRECT_EMAIL_REQUIRE_TLS=true` if using it elsewhere and delivery must fail whenever a recipient MX server does not offer STARTTLS.

### SMTP

```text
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
SMTP_FROM=no-reply@hexsettlers.org
SMTP_REQUIRE_TLS=true
HEX_EMAIL_MODE=smtp
```

Use `SMTP_SECURE=true` for implicit TLS, normally port 465. Port 587 normally uses STARTTLS and should keep `SMTP_REQUIRE_TLS=true`.

Set `HEX_EMAIL_MODE=none` to disable email features completely. Once delivery is available, a signed-in player can open **My Account**, enter an email and current password, and send a verification link. Verification links expire after one hour. Only verified addresses can receive pre-login password-reset emails. Password-reset links expire after 30 minutes and can be used once.

Password hashes, email verification tokens, password-reset tokens, and session tokens are never returned to the browser. Stored one-time tokens and sessions are hashed on disk.
