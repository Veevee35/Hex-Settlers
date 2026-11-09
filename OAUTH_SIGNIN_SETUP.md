# Hex Settlers — Google (Gmail), GitHub and Cloudflare sign-in

This build adds **optional OAuth sign-in** for new and existing players. No third-party keys are embedded in the site. Players can use the providers on **Log In**, **Create Account**, and **Manage Account → Linked sign-in accounts** when you configure the respective provider.

## 1. Register your callbacks

For the production domain `https://hexsettlers.org`, configure the following exact callback URLs in the corresponding provider dashboards:

| Provider | Callback / redirect URI |
| --- | --- |
| Google | `https://hexsettlers.org/api/auth/oauth/google/callback` |
| GitHub | `https://hexsettlers.org/api/auth/oauth/github/callback` |
| Cloudflare | `https://hexsettlers.org/api/auth/oauth/cloudflare/callback` |

If users access the **staging** domain directly, register separate staging credentials/redirect URIs using that exact origin (for GitHub, a second OAuth app is usually simplest). Set that deployment's `PUBLIC_BASE_URL` to its actual public origin. The production Worker already sets `PUBLIC_BASE_URL` to `https://hexsettlers.org` in `wrangler.container.production.jsonc`.

## 2. Create provider apps

### Google / Gmail

1. Open [Google Cloud Console](https://console.cloud.google.com/apis/credentials). Select or create a project.
2. Configure its Google Auth Platform branding/consent screen; add your domain as required. During testing, add test users, or publish the consent configuration when ready.
3. Create an OAuth client of type **Web application**. Add the Google callback above to **Authorized redirect URIs**.
4. Copy the OAuth **Client ID** and **Client secret**. The game requests only `openid email profile`. It does **not** request Gmail mailbox access.

### GitHub

1. Go to [GitHub Developer settings → OAuth Apps](https://github.com/settings/developers) and create a **New OAuth App**.
2. Homepage: `https://hexsettlers.org` and callback: the GitHub callback above.
3. Generate and securely copy the Client ID and Client secret.
4. The game requests only `read:user` for basic account identity; no repository or private-email access is required.

### Cloudflare

1. In the [Cloudflare dashboard](https://dash.cloudflare.com), select your account and open **Manage Account → OAuth clients → Create client**.
2. Choose **Authorization Code**, response type `code`, server-side client authentication with `client_secret_post`, and the Cloudflare callback above. Use the minimum available identity scope **`user-details.read`** and make it required. The game reads identity from Cloudflare's `GET /client/v4/user` endpoint; it does **not** read or modify your zones, Workers, or DNS.
3. Copy the Client ID and secret. To let **any Cloudflare account** sign in, change the OAuth client visibility from **private** to **public**. Cloudflare requires a client name, logo, website, scopes, and verified client-URL domain ownership before making a client public. The domain verification is done with the TXT record Cloudflare specifies. Public visibility cannot subsequently be reverted to private.
4. The game sets `OAUTH_CLOUDFLARE_SCOPES=user-details.read` by default. Only change that setting if your OAuth client configuration requires it.

Cloudflare's OAuth-client scope picker is based on Cloudflare API permissions; do **not** manually request Google-style `openid email profile` scopes for this provider.

## 3. Set Cloudflare Worker secrets

Under **Workers & Pages → hex-settlers → Settings → Variables and Secrets**, create the following as **secrets** (not publicly exposed variables). If you deploy through the CLI, use `wrangler secret put NAME --config wrangler.container.production.jsonc` from this repository. Repeat for the staging Worker/config only when you intend to enable OAuth there.

```text
OAUTH_STATE_SECRET          # Required: a persistent random secret of at least 32 characters
OAUTH_GOOGLE_CLIENT_ID
OAUTH_GOOGLE_CLIENT_SECRET
OAUTH_GITHUB_CLIENT_ID
OAUTH_GITHUB_CLIENT_SECRET
OAUTH_CLOUDFLARE_CLIENT_ID
OAUTH_CLOUDFLARE_CLIENT_SECRET
```

Generate a good signing/encryption secret locally with `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`. Do not post it or commit it. **Keep the same secret across restarts and deployments**; changing it invalidates in-progress logins. The Cloudflare Container runtime now securely forwards these Worker secrets to the Node backend. You do not need to set the same secrets inside public assets or source code.

For local hosting or a direct Node/Railway backend instead of Cloudflare Containers, set these variables in the Node process environment (see `.env.example`) and set `HEX_PUBLIC_BASE_URL` to your actual public HTTPS origin.

You can enable only one or two providers. The game automatically hides buttons for providers missing a Client ID, Client secret, or shared state secret. The `GET /api/auth/oauth/providers` endpoint exposes availability flags only; no secret values.

## 4. Deploy and test

Push the updated project through your existing GitHub → Cloudflare pipeline or build it as you normally do. After deployment:

1. Open `https://hexsettlers.org` in a private browser window. The configured provider buttons should appear below **Create Account**.
2. Use each provider to create a new account. Each one should return you to the normal game with a signed-in account; no local password or recovery-email verification is required.
3. Sign out; sign back in with the **same provider** and confirm the original player, friends and ratings are preserved.
4. Sign in to an **existing** username/password account, open **Manage Account**, and click **Connect** next to a provider. Authorize it, then sign out and back in via that provider. Your existing player statistics must remain in the same account.
5. Reopen **Manage Account** to disconnect a provider. A passwordless account cannot disconnect its last available provider. A provider identity cannot be linked to multiple local accounts.
6. Check cancellation, expired login state and duplicate-provider conflicts. They must not create new sessions or silently merge accounts.
7. Verify the existing email/password login, email verification and password reset still work.

For debugging, verify the `PUBLIC_BASE_URL`, client IDs/secrets, exact callback URLs, Cloudflare client's **public** visibility and required identity scope, Worker logs, and the configured domains. No local test can complete the actual provider consent without your real OAuth app credentials.

## Behavior / security details

- **Google (Gmail)** is Sign in with Google; it works with eligible Google accounts and does not provide Gmail mailbox access.
- **Provider identities are stored by their immutable provider user ID**, not by email or display name. A matching email does **not** auto-merge accounts. Sign in to an existing account first, then use **Connect** to link it.
- Newly created provider accounts have no local password. Password change and password-recovery-email controls are disabled for these accounts; their provider login is their recovery method. Existing password accounts retain their password and email recovery options.
- Tokens issued by Google, GitHub or Cloudflare are used only to retrieve identity; they are **not persisted**. The game still uses its existing HttpOnly local session cookie and R2-backed user database.
- State, PKCE and a short-lived encrypted HttpOnly authorization-flow cookie protect the callback. Linking an existing account is bound to the existing session and refuses a link if that session has been revoked.
- The public `users.json` user records gain an optional `oauthAccounts` array. This is an additive change; existing users are not reset and no manual database migration is required. Back up R2 before deploying a production update as usual.
