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

After logging in as `Benleethom`, open **User Management** from the lobby. Ben can search all registered users and reset another user's password. Every other player sees **My Account** and receives only their own account record.

All signed-in users can change their own password after entering their current password. This revokes other saved sessions while issuing a fresh cookie for the current browser. If Ben changes the built-in administrator password inside the game, the account becomes in-app managed and future restarts will not overwrite it from `HEX_ADMIN_PASSWORD`. Set `HEX_ADMIN_FORCE_PASSWORD_SYNC=true` for one restart when you intentionally need the Railway variable to replace Ben's current password.

## Recovery email and password-reset links

Password recovery requires a public URL and an email delivery provider.

```text
HEX_PUBLIC_BASE_URL=https://YOUR-GAME-DOMAIN
HEX_EMAIL_FROM=Hex Settlers <no-reply@YOUR-DOMAIN>
```

Choose one delivery method.

### Resend

```text
RESEND_API_KEY=re_xxxxxxxxx
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
```

Use `SMTP_SECURE=true` for implicit TLS, normally port 465. Port 587 normally uses STARTTLS and should keep `SMTP_REQUIRE_TLS=true`.

Once email delivery is configured, a signed-in player can open **My Account**, enter an email and current password, and send a verification link. Verification links expire after one hour. Only verified addresses can receive pre-login password-reset emails. Password-reset links expire after 30 minutes and can be used once.

Password hashes, email verification tokens, password-reset tokens, and session tokens are never returned to the browser. Stored one-time tokens and sessions are hashed on disk.
