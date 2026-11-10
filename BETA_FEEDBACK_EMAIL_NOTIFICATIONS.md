# Hex Settlers beta feedback → support email

When a visitor submits **Report bug / Suggestion**, the game persists the report in `beta_program.json` (already synced to the Cloudflare R2 state bucket), then sends a **plain-text email to `support@hexsettlers.com`**. This applies to all feedback categories: bugs, mobile/UI problems, game balance, features, and other notes.

Each email contains the report ID, UTC timestamp, type, description, reproduction steps, optional room code, current game version, device category, and anonymous / pseudonymous reporter indicator. No account email address, session cookie, IP address, or password is included. The admin Beta Testing dashboard continues to retain the report and shows its email delivery state.

## Cloudflare configuration (required for *real* outgoing email)

The current Cloudflare Container automatically uses the **existing Resend integration** if your Cloudflare Worker has `RESEND_API_KEY`. You do not need to configure a second email service or additional credentials for feedback notifications if account verification / password reset emails already work.

1. Confirm `support@hexsettlers.com` is a working **recipient inbox**. The `.com` in this address is intentional; it is not `hexsettlers.org`.
2. In Cloudflare, open the **Worker serving hexsettlers.org** (staging if that is your current live deployment), **Settings → Variables and Secrets**. Add / verify **`RESEND_API_KEY`** as an encrypted secret, sourced from your Resend account. Do not place this secret in GitHub or any ZIP.
3. Add / verify **`HEX_EMAIL_FROM`** as `Hex Settlers <no-reply@YOUR-VERIFIED-SENDING-DOMAIN>` with a domain you have verified for outbound sending in Resend. If the existing verified sender works for password recovery, keep it unchanged. The project has a legacy default (`no-reply@send.tenthson.com`); that address is usable only if its sending domain is verified in your Resend account.
4. Redeploy, submit a test report, and view **Admin Management → Beta Testing**. The Email column should move from **Queued** to **Sent**. Confirm arrival in `support@hexsettlers.com`, including spam/junk if necessary.

If email is unconfigured or temporarily unavailable, player feedback still saves successfully and is **not silently discarded**. When configured, the existing backlog is retried on the next periodic queue check; no old pre-upgrade reports are re-emailed. Delivery is retried up to six times with increasing delays. On permanent failure, the dashboard shows **Delivery failed** and offers **Retry email**. Status survives container restarts in R2 state.

**Important:** The server's `send` call confirms that the outgoing email provider accepted the message, not that a recipient mailbox delivered/read it. A process crash between provider acceptance and recording the new state may rarely produce a duplicate notification. Emails contain a stable report ID to identify duplicates. No live email was sent during this package build.

## Local test without sending real email

For local runs only, set `HEX_EMAIL_CAPTURE_PATH=/tmp/hex-beta-notification-test.jsonl` (or a writable path) to capture outgoing emails as JSONL, submit a beta feedback report, and inspect the file. Clear this test variable in Cloudflare production so actual messages are delivered.

## Deployment impact

Only application source and public privacy-policy wording changed. **No database migration, bucket changes, or gameplay logic modifications** are required. The beta inbox report entries now include a small `notification` object; existing V67 beta state remains compatible. Preserve your live R2 bucket and Worker/Container bindings when deploying.


## Draggable insect report icon (beta UI update)

- **All game screens**, including sign-in, game-type selection, All Games, public/private/casual/ranked lobbies, tutorials, active matches and the standalone `/beta.html` recruitment page, share the same compact insect icon. Its accessible name is *Report bug or suggest a feature*.
- **Tap or click** the icon to open the report/suggestion form. **Drag** it with a mouse, stylus or finger to move it anywhere within the current viewport. The location is saved locally, separately for desktop and mobile widths, and is clamped after window resize / rotation.
- **Right-click** the icon or **long-press for 650 ms** on touch to access *Hide icon* and *Reset position*. Do not move while holding if you intend to open this menu.
- The icon can also be hidden/restored using **Account menu → Hide/Show feedback icon**, **All Games → Settings → Show feedback icon**, the checkbox inside the reporting form, or the link at the bottom of `/beta.html`. A keyboard recovery shortcut, **Alt+Shift+B**, toggles the icon even on the logged-out screen.
- Visibility is stored per browser/device. It is never tied to a player account, so changing it does not affect other testers, account settings, game statistics or HUD layout preferences.
- The control is intentionally independent of the game canvas and does not claim a game action or network request while dragging.

**Cloudflare deployment:** if the Resend secret is missing, a report still saves in the R2-backed beta inbox but its email remains queued. Add `RESEND_API_KEY` and a verified `HEX_EMAIL_FROM` to the Worker actually serving your `hexsettlers.org` route. Confirm the destination mailbox `support@hexsettlers.com` exists. Test with a real message and confirm the admin Email column says *Sent*, then verify the mailbox received it. An Email *Sent* status means Resend accepted the message, not that the recipient opened it.
