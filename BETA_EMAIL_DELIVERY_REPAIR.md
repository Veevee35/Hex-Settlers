# Hex Settlers — Beta notification delivery diagnostics fix (2026-11-10)

## Why reports were saved but not mailed

The screenshots from November 10 show **RESEND_API_KEY exists**, while `HEX_EMAIL_FROM` is set to `support@hexsettlers.com` and the beta reports show “Retry scheduled (attempt 1/3).” That proves the reporting queue is functioning and provider delivery is failing, **not why the provider rejects the email**. Previously, the provider's exact error was written only to container logs; admins saw only the retry counter.

**Likely configuration cause:** The Resend account has not verified the sender domain `hexsettlers.com`. A valid Resend key alone does not verify that domain. The destination (`support@hexsettlers.com`) is independent of the sender and can remain unchanged even if the sender is switched to an address on `hexsettlers.org`, **provided that sender domain is verified by Resend**. Do not assume `.com` and `.org` are interchangeable. Also verify the `.com` recipient mailbox actually exists and receives messages.

## What changed

- Every provider error is now attached to the report as an admin-only `lastError` (sanitized and length-limited), plus the time of the failed attempt. The Beta Testing dashboard displays the error below the delivery status.
- Resend API 400/401/402/403/404/422 responses stop automatic retries immediately and mark **Delivery failed**; these need admin attention. Timeouts, network errors, 429 rate limits and 5xx server errors continue to use the existing retry schedule.
- **Retry now** is available in the admin report inbox for both failed and scheduled-retry notifications after correcting settings.
- **Send test email to support** in the Admin Beta Testing page sends a dedicated one-off diagnostic message to the fixed support inbox, not a fabricated bug report. The admin sees the provider's acceptance or sanitized rejection reason.
- The dashboard displays the sender and delivery mode actually in use by the running game process. API credentials remain secret and are never sent to the browser.
- Admin-only `/api/admin/beta-email-test` is protected by the existing admin login, admin hostname, origin checks and a separate 2-per-minute limiter.
- All existing reports, R2 persistence, gameplay, and the draggable insect feedback icon are preserved. No migration is needed.

## Steps to get notifications working

1. Open your **Resend** dashboard → **Domains**. Check whether `hexsettlers.com` shows **Verified**. If not, either add that domain and the DNS records Resend specifies, or choose a domain you already own and have verified (for example `hexsettlers.org` *if* it is verified).
2. Set `HEX_EMAIL_FROM` in Cloudflare to an address on that verified domain, e.g. `Hex Settlers <notifications@hexsettlers.org>` **only if** Resend has verified `hexsettlers.org`. **The sending address does not need to be the same as the receiving support address.** Keep `RESEND_API_KEY` as a Cloudflare **Secret**.
3. Redeploy/restart the Worker and Container so its environment is refreshed. Check `Admin Management → Beta Testing` and verify the displayed **Configured sender** and **Provider: resend**.
4. Click **Send test email to support** (at most twice per minute). If you see a Resend `403` such as `domain is not verified`, fix domain verification. If you see `401`, check the API key and permissions. If accepted, check the actual `support@hexsettlers.com` mailbox/spam folder. An accepted response means the provider took the message, not that it reached the inbox.
5. After the test is accepted, click **Retry now** on previously failed/retrying submissions; reports are not automatically resent in bulk on deployment. Do not re-submit the same reports.

## Security and limitations

This build does not contain a Resend API key and did **not** send any live message or inspect your Resend dashboard. The screenshots do not disclose the provider's actual HTTP error, so the suspected sender-domain issue cannot yet be confirmed. The new test is intended to expose that error precisely. It does not change R2 bindings or the site's URL routing. Email provider errors are visible to administrators only. Report content remains stored by the existing beta feedback program.
