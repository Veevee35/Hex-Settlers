# OAuth username selection and direct-email account conversion

## First OAuth signup

New Google (Gmail), GitHub and Cloudflare signups create a provisional account with a stable internal user ID. Rather than being given a guessed username, the user is redirected to a full-screen **Choose your username** page. It validates unique usernames case-insensitively (3–24 letters, numbers, `_`, `.` or `-`) on the server, with a separate availability check. The builtin administrator name is reserved. Choosing a name also sets a safe default display name rather than exposing their OAuth provider's real name to other players. Game access is blocked at both UI and WebSocket levels until the username is chosen. Refreshing or returning later resumes onboarding. Existing OAuth accounts with real usernames are unchanged. Invite links remain usable after setup.

## Switching from OAuth to direct email/password

In **Manage Account**, OAuth users can now enter an email and establish their first local password (with confirmation). Players who already have a local password use their existing password instead. The app sends a verification email, and the previous provider(s) remain connected until the recipient verifies it. The new password is salted and hashed while verification is pending; raw passwords are never written to storage. When the verification link succeeds, the backend attaches the verified email, activates the new password if necessary, disconnects **all** OAuth provider identities, and revokes all existing sessions. The player signs in again with **verified email or username plus password**. The same immutable user ID, ratings, stats, friendships, and game history are retained. If email delivery fails or the verification link expires, their OAuth login continues to work.

No OAuth client keys or Cloudflare environment variables need changing. Email sending must already be configured (e.g. Cloudflare email bridge or Resend).

## Test coverage

Unit tests cover invalid, reserved and duplicate usernames; one-time username assignment; preserving stats, friends and IDs; retaining OAuth until verification; retaining a preexisting local password; rejecting unsafe conversions without passwords; and source wiring for the HTTP, WebSocket and frontend integrations. Full live OAuth-provider and WebSocket integration requires a running deployment and dependencies.
