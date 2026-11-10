'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { BetaProgram } = require('../server/beta-program');
const { BETA_FEEDBACK_RECIPIENT, feedbackEmailMessage, BetaFeedbackEmailNotifier } = require('../server/beta-feedback-email');
const { sendTransactionalEmail } = require('../server/email-delivery');

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hex-beta-email-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  let time = Date.UTC(2026, 10, 10, 16, 0, 0);
  return {
    path: path.join(dir, 'beta_program.json'),
    capture: path.join(dir, 'mail.jsonl'),
    now: () => time,
    advance: ms => { time += ms; },
  };
}

test('all bug and suggestion emails address support@hexsettlers.com and include all report context', t => {
  const fx = fixture(t);
  const store = new BetaProgram(fx.path, { now: fx.now });
  for (const category of ['bug', 'ui', 'balance', 'idea', 'other']) {
    const id = store.feedback({ userId: 'user123', category,
      description: 'Buttons disappear after turn ends', steps: 'Open a room and end the turn',
      roomCode: 'EFGH', build: 'V1.0.68', device: 'tablet' });
    const report = store.state.feedback.find(item => item.id === id);
    const mail = feedbackEmailMessage(report);
    assert.equal(mail.to, BETA_FEEDBACK_RECIPIENT);
    assert.match(mail.subject, /Hex Settlers Beta/);
    assert.match(mail.text, /EFGH/);
    assert.match(mail.text, /V1\.0\.68/);
    assert.match(mail.text, /tablet/);
    assert.match(mail.text, /Buttons disappear/);
    assert.match(mail.text, /Open a room/);
    assert.match(mail.text, /Signed-in tester/);
    assert.doesNotMatch(mail.text, /user123/);
    assert.match(mail.text, /Submitted \(UTC\): 2026/);
  }
});

test('queue remains persistent without email configuration; after setup it sends once', async t => {
  const fx = fixture(t);
  const store = new BetaProgram(fx.path, { now: fx.now });
  const id = store.feedback({ category: 'idea', description: 'Add a better spectator interface' });
  await store.save();
  let configured = false;
  const sent = [];
  const notifier = new BetaFeedbackEmailNotifier(store, { now: fx.now,
    configured: () => configured, send: async message => { sent.push(message); } });
  assert.equal((await notifier.process()).reason, 'email-not-configured');
  assert.equal(sent.length, 0);
  assert.equal(store.state.feedback[0].notification.status, 'pending');
  const restart = new BetaProgram(fx.path, { now: fx.now });
  configured = true;
  const restartedNotifier = new BetaFeedbackEmailNotifier(restart, { now: fx.now,
    configured: () => configured, send: async message => { sent.push(message); } });
  await restartedNotifier.process();
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, 'support@hexsettlers.com');
  await restartedNotifier.process();
  assert.equal(sent.length, 1);
  const newRestart = new BetaProgram(fx.path, { now: fx.now });
  assert.equal(newRestart.report().feedback[0].notification.status, 'sent');
  assert.equal(newRestart.report().feedback[0].id, id);
  assert.throws(() => newRestart.retryFeedbackEmail(id), /already been emailed/);
});

test('failure retries with increasing delays, survives restart and requires manual retry when exhausted', async t => {
  const fx = fixture(t);
  let store = new BetaProgram(fx.path, { now: fx.now });
  const id = store.feedback({ category: 'bug', description: 'Map disappears after resizing' });
  await store.save();
  let sendAttempts = 0;
  const fail = async () => { sendAttempts++; throw new Error('Provider unavailable'); };
  let logs = 0;
  const opts = { now: fx.now, configured: () => true, send: fail,
    logger: { warn: () => { logs++; }, error: () => assert.fail('persisting retry must not fail') } };
  let notifier = new BetaFeedbackEmailNotifier(store, opts);
  await Promise.all([notifier.process(), notifier.process()]);
  assert.equal(sendAttempts, 1);
  assert.equal(store.report().feedback[0].notification.status, 'retrying');
  assert.equal(store.report().feedback[0].notification.attempts, 1);
  await notifier.process();
  assert.equal(sendAttempts, 1);
  store = new BetaProgram(fx.path, { now: fx.now });
  notifier = new BetaFeedbackEmailNotifier(store, opts);
  for (const delay of [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000, 3 * 60 * 60_000]) {
    fx.advance(delay);
    await notifier.process();
  }
  assert.equal(sendAttempts, 6);
  assert.equal(logs, 6);
  assert.equal(store.state.feedback[0].notification.status, 'failed');
  fx.advance(24 * 60 * 60_000);
  await notifier.process();
  assert.equal(sendAttempts, 6);
  store.retryFeedbackEmail(id);
  await store.save();
  let recovered = 0;
  const success = new BetaFeedbackEmailNotifier(store, { now: fx.now, configured: () => true,
    send: async () => { recovered++; } });
  await success.process();
  assert.equal(recovered, 1);
  assert.equal(store.state.feedback[0].notification.status, 'sent');
});

test('real email capture adapter records correctly formatted notification without network', async t => {
  const fx = fixture(t);
  const store = new BetaProgram(fx.path, { now: fx.now });
  store.feedback({ category: 'bug', description: 'An issue appears when loading a saved lobby', roomCode: 'ABCD' });
  const notifier = new BetaFeedbackEmailNotifier(store, { now: fx.now, configured: () => true,
    send: msg => sendTransactionalEmail(msg, { HEX_EMAIL_CAPTURE_PATH: fx.capture }) });
  await notifier.process();
  const [outgoing] = fs.readFileSync(fx.capture, 'utf8').trim().split('\n').map(line => JSON.parse(line));
  assert.equal(outgoing.to, 'support@hexsettlers.com');
  assert.match(outgoing.text, /An issue appears when loading a saved lobby/);
  assert.equal(store.report().feedback[0].notification.status, 'sent');
});

test('reports submitted before the feature upgrade are never mailed retroactively', async t => {
  const fx = fixture(t);
  const store = new BetaProgram(fx.path, { now: fx.now });
  store.feedback({ category: 'other', description: 'Old report from an older build' });
  delete store.state.feedback[0].notification;
  await store.save();
  let called = false;
  const notifier = new BetaFeedbackEmailNotifier(store, { now: fx.now, configured: () => true,
    send: async () => { called = true; } });
  await notifier.process();
  assert.equal(called, false);
});

test('provider 403 rejection records readable failure once and does not retry forever', async t => {
  const fx = fixture(t);
  const store = new BetaProgram(fx.path, { now: fx.now });
  const id = store.feedback({ category: 'bug', description: 'The game freezes after the pirate move' });
  await store.save();
  let attempts = 0;
  const notifier = new BetaFeedbackEmailNotifier(store, { now: fx.now, configured: () => true,
    send: async () => {
      attempts++;
      const err = new Error('Resend HTTP 403 (validation_error): The hexsettlers.com domain is not verified');
      err.statusCode = 403;
      throw err;
    }, logger: { warn: () => {}, error: () => {} } });
  await notifier.process();
  const state = store.state.feedback[0].notification;
  assert.equal(state.status, 'failed');
  assert.equal(state.attempts, 1);
  assert.match(state.lastError, /domain is not verified/);
  await notifier.process();
  assert.equal(attempts, 1);
  const reloaded = new BetaProgram(fx.path, { now: fx.now });
  assert.match(reloaded.state.feedback[0].notification.lastError, /domain is not verified/);
  reloaded.retryFeedbackEmail(id);
  const accepted = new BetaFeedbackEmailNotifier(reloaded, { now: fx.now, configured: () => true,
    send: async () => ({ ok: true, provider: 'resend', id: 'test-message' }) });
  await accepted.process();
  assert.equal(reloaded.state.feedback[0].notification.status, 'sent');
});

test('admin diagnostic sends to fixed support inbox without changing a report', async t => {
  const fx = fixture(t);
  const store = new BetaProgram(fx.path, { now: fx.now });
  const outgoing = [];
  const notifier = new BetaFeedbackEmailNotifier(store, { now: fx.now, configured: () => true,
    send: async msg => { outgoing.push(msg); return { provider: 'resend', id: 'diagnostic-123' }; } });
  const result = await notifier.sendDiagnostic();
  assert.equal(result.provider, 'resend');
  assert.equal(result.messageId, 'diagnostic-123');
  assert.equal(outgoing[0].to, 'support@hexsettlers.com');
  assert.equal(store.state.feedback.length, 0);
});

test('provider diagnostic redacts API tokens before persistence', () => {
  const { safeDeliveryError } = require('../server/beta-feedback-email');
  assert.doesNotMatch(safeDeliveryError(new Error('Bearer supersecret re_abcdefghijklmnopqrstuvwxyz was invalid')), /supersecret|re_abcdefghijklmn/);
});
