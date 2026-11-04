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

Password recovery requires a public URL and a sender identity. By default Hex Settlers sends mail itself: it resolves the recipient domain's MX records and opens a direct SMTP connection from the game server. No email API or relay account is used.

```text
HEX_PUBLIC_BASE_URL=https://YOUR-GAME-DOMAIN
HEX_EMAIL_FROM=Hex Settlers <no-reply@YOUR-DOMAIN>
HEX_EMAIL_EHLO_NAME=mail.YOUR-DOMAIN
```

Your sender domain should authorize the Railway outbound address through SPF. Direct messages from this implementation are not DKIM-signed, and reverse DNS is controlled by the hosting network, so large mailbox providers may reject a message or place it in spam even when the SMTP exchange succeeds. Railway allows outbound SMTP only on Pro plans and above; Free, Trial, and Hobby deployments cannot directly deliver Internet email.

The default mode is:

```text
HEX_EMAIL_MODE=direct
```

Set `HEX_DIRECT_EMAIL_REQUIRE_TLS=true` if delivery must fail whenever a recipient MX server does not offer STARTTLS. The default is opportunistic TLS, matching ordinary server-to-server email delivery.

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
