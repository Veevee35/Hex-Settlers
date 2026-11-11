# Historical email diagnostics repair / current sender policy

Earlier beta builds queued notification emails but hid the provider error from the admin dashboard. The diagnostic fix retains the provider error, a send-test control, and manual retry. A subsequent sender-domain misconfiguration caused Resend HTTP 403 rejections.

**Current sender policy (2026-11-10):** every outgoing game email is sent **from `no-reply@hexsettlers.org`**, with `support@hexsettlers.org` as the bug/suggestion recipient. This is enforced in both `server/email-delivery.js` and Cloudflare mail bridge code, and declared as a non-secret Wrangler variable in all three deployment files. GitHub deployments no longer clear the sender.

**Required service setup:** verify `hexsettlers.org` in Resend, and ensure the `RESEND_API_KEY` secret has Sending access to `hexsettlers.org`. Code cannot grant permissions or verify DNS records on your behalf.

**After deploying:** check Admin Management → Beta Testing for `no-reply@hexsettlers.org` and `resend`; click Send test email to support. If Resend accepts it, confirm receipt in `support@hexsettlers.org`, then manually retry previously failed reports. A provider acceptance is not proof of inbox delivery. Existing R2 state, reports and game history remain unchanged.
