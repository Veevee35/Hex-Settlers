'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');

test('insect feedback button, form, and mobile controls are present once on all player entrypoints', () => {
  for (const page of ['public/index.html', 'public/beta.html']) {
    const html = read(page);
    for (const id of ['betaFeedbackLaunch', 'betaFeedbackQuickMenu','betaFeedbackOverlay',
      'betaFeedbackType','betaFeedbackDescription','betaFeedbackSteps','betaFeedbackFormVisible']) {
      assert.equal((html.match(new RegExp(`id="${id}"`, 'g')) || []).length, 1, `${page} ${id}`);
    }
    assert.match(html, /class="betaFeedbackLaunch"[^>]*aria-label="Report bug or suggest a feature/);
    assert.match(html, /<svg viewBox="0 0 24 24"/);
    assert.doesNotMatch(html, /class="betaFeedbackLaunch"[^>]*>Report bug \/ Suggestion/);
    assert.match(html, /beta-client\.js\?v=/);
  }
});

test('icon movement, resize, touch long-press, and visibility persistence are implemented independently of gameplay', () => {
  const source = read('public/beta-client.js');
  assert.match(source, /'pointerdown'/);
  assert.match(source, /'pointermove'/);
  assert.match(source, /'pointerup'/);
  assert.match(source, /'pointercancel'/);
  assert.match(source, /'contextmenu'/);
  assert.match(source, /'orientationchange'/);
  assert.match(source, /localStorage\.setItem\(positionKey\(/);
  assert.match(source, /localStorage\.setItem\(VISIBLE_KEY/);
  assert.match(source, /event\.altKey && event\.shiftKey && event\.code === 'KeyB'/);
  assert.match(source, /setTimeout\(\(\) => \{[\s\S]*?\}, 650\)/);
  const css = read('public/beta.css');
  assert.match(css, /touch-action:none/);
  assert.match(css, /\.betaFeedbackLaunch\.is-hidden\{display:none!important\}/);
  assert.match(css, /max-height:calc\(100dvh - 20px\)/);
  const html = read('public/index.html');
  assert.match(html, /id="betaFeedbackMenuToggle"/);
  assert.match(html, /id="betaFeedbackSettingsVisible"/);
});

test('report notifications use server-owned recipient and Cloudflare forwarded email secret', () => {
  const notifier = read('server/beta-feedback-email.js');
  const worker = read('cloudflare/container-worker.mjs');
  const server = read('server.js');
  assert.match(notifier, /BETA_FEEDBACK_RECIPIENT = 'support@hexsettlers\.com'/);
  assert.match(worker, /RESEND_API_KEY: String\(env\.RESEND_API_KEY \|\| ''\)/);
  assert.match(server, /await BETA\.save\(\);[\s\S]*?BETA_FEEDBACK_EMAIL\.process\(\)/);
  assert.match(server, /beta-feedback-email-retry/);
});
