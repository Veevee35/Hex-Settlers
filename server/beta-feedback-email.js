'use strict';

// The recipient is intentionally server-owned; players cannot choose where a
// report is mailed. Reuse the existing verified transactional sender/transport.
const { isEmailDeliveryConfigured, sendTransactionalEmail } = require('./email-delivery');

const BETA_FEEDBACK_RECIPIENT = 'support@hexsettlers.com';
const MAX_DELIVERY_ATTEMPTS = 6;
const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000, 3 * 60 * 60_000, 12 * 60 * 60_000];
const CATEGORY_LABELS = Object.freeze({
  bug: 'Bug / Game issue', ui: 'Interface / Mobile', balance: 'AI / Game balance',
  idea: 'Feature suggestion', other: 'Other feedback',
});

function feedbackEmailMessage(report) {
  if (!report || !report.id || !report.createdAt) throw new Error('Invalid beta feedback record.');
  const label = CATEGORY_LABELS[report.type] || CATEGORY_LABELS.other;
  const subject = `[Hex Settlers Beta] ${label} (#${report.id.slice(0, 8)})`;
  const text = [
    'A new report was submitted through the Hex Settlers beta feedback form.',
    '',
    `Report ID: ${report.id}`,
    `Submitted (UTC): ${new Date(report.createdAt).toISOString()}`,
    `Category: ${label}`,
    `Reporter: ${report.reporter === 'anonymous' ? 'Anonymous visitor' : `Signed-in tester (${report.reporter || 'unknown'})`}`,
    `Room code: ${report.roomCode || 'Not provided'}`,
    `Game version: ${report.build || 'Not provided'}`,
    `Device: ${report.device || 'Unknown'}`,
    '',
    'DESCRIPTION',
    report.description || '(Empty)',
    '',
    'STEPS TO REPRODUCE',
    report.steps || '(Not provided)',
    '',
    'Review and triage: https://admin.hexsettlers.org/ (Beta Testing)',
    `This notification refers to report ${report.id}. Please do not reply to an unmonitored sender address.`,
  ].join('\n');
  return { to: BETA_FEEDBACK_RECIPIENT, subject, text };
}

class BetaFeedbackEmailNotifier {
  constructor(beta, {
    send = sendTransactionalEmail,
    configured = () => isEmailDeliveryConfigured(process.env),
    now = Date.now,
    logger = console,
  } = {}) {
    this.beta = beta;
    this.send = send;
    this.configured = configured;
    this.now = now;
    this.logger = logger;
    this.inflight = null;
  }

  // One pump per process. Pending delivery state lives in R2-backed beta state
  // and is replayed after a container restart. Only new submissions have a
  // notification record; existing historical inbox items are never mass-mailed.
  process() {
    if (this.inflight) return this.inflight;
    this.inflight = this.processDue().finally(() => { this.inflight = null; });
    return this.inflight;
  }

  async processDue() {
    if (!this.configured()) return { sent: 0, reason: 'email-not-configured' };
    let sent = 0;
    for (const report of this.beta.state.feedback || []) {
      const mail = report.notification;
      if (!mail || mail.status === 'sent' || mail.status === 'failed' ||
        Number(mail.nextAttemptAt || 0) > this.now()) continue;
      try {
        await this.send(feedbackEmailMessage(report));
      } catch (error) {
        const attempts = (Number(mail.attempts) || 0) + 1;
        const exhausted = attempts >= MAX_DELIVERY_ATTEMPTS;
        this.beta.markFeedbackEmailFailure(report.id, attempts, exhausted ? 0 : this.now() + RETRY_DELAYS_MS[Math.min(attempts - 1, RETRY_DELAYS_MS.length - 1)]);
        this.logger.warn('[beta] Feedback notification failed:', report.id, error && error.message || String(error));
        try { await this.beta.save(); }
        catch (saveError) { this.logger.error('[beta] Could not persist notification retry:', saveError.message); }
        continue;
      }
      this.beta.markFeedbackEmailSent(report.id, this.now());
      sent++;
      // If R2 fails after the provider accepted the message, keep the local
      // 'sent' marker; retry persistence instead of retransmitting the email.
      try { await this.beta.save(); }
      catch (saveError) { this.logger.error('[beta] Could not persist sent notification:', saveError.message); }
    }
    return { sent };
  }
}

module.exports = { BETA_FEEDBACK_RECIPIENT, feedbackEmailMessage, BetaFeedbackEmailNotifier, MAX_DELIVERY_ATTEMPTS };
