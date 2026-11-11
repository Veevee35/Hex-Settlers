(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const stages = ['passwordStage','verifyStage','enrollStage','recoveryCodesStage'];
  let recoveryCodes = [];
  function notice(message, good = false) {
    const element = $('notice'); element.textContent = message;
    element.classList.toggle('ok', good); element.hidden = !message;
  }
  function show(id) { stages.forEach(stage => { $(stage).hidden = stage !== id; }); notice(''); }
  async function call(action, body = {}) {
    const response = await fetch(`/api/admin/mfa/${action}`, {
      method: 'POST', credentials: 'same-origin', cache: 'no-store',
      headers: { 'Content-Type':'application/json', 'X-Hex-MFA-Request':'1' },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || `Authentication failed (${response.status}).`);
    return data;
  }
  async function gotoStage(stage) {
    if (stage === 'ready') { window.location.replace('/'); return; }
    if (stage === 'verify') { show('verifyStage'); $('verifyCode').focus(); return; }
    if (stage === 'enroll') {
      show('enrollStage');
      const result = await call('enroll');
      $('enrollmentSecret').textContent = result.secret;
      $('enrollmentUri').textContent = result.uri;
      $('enrollCode').focus(); return;
    }
    show('passwordStage'); $('username').focus();
  }
  async function submit(form, action, body, next) {
    const button = form.querySelector('button[type=submit]');
    button.disabled = true;
    notice('');
    try { const result = await call(action, body()); await next(result); }
    catch (e) { notice(e.message); }
    finally { button.disabled = false; }
  }
  $('passwordForm').addEventListener('submit', e => {
    e.preventDefault(); submit(e.currentTarget, 'login', () => ({ username: $('username').value, password: $('password').value }),
      async result => { $('password').value = ''; await gotoStage(result.stage); });
  });
  $('verifyForm').addEventListener('submit', e => {
    e.preventDefault(); submit(e.currentTarget, 'verify', () => ({ code: $('verifyCode').value }),
      result => gotoStage(result.stage));
  });
  $('enrollForm').addEventListener('submit', e => {
    e.preventDefault(); submit(e.currentTarget, 'activate', () => ({ code: $('enrollCode').value }), result => {
      recoveryCodes = result.recoveryCodes;
      $('recoveryCodes').textContent = recoveryCodes.join('\n');
      show('recoveryCodesStage');
    });
  });
  $('recoveryToggle').addEventListener('click', () => { $('recoveryBox').hidden = !$('recoveryBox').hidden; });
  $('recoveryForm').addEventListener('submit', e => {
    e.preventDefault(); submit(e.currentTarget, 'recover', () => ({ code: $('recoveryCode').value }), result => gotoStage(result.stage));
  });
  $('copySecret').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('enrollmentSecret').textContent); notice('Setup key copied.', true); }
    catch (_) { notice('Select the setup key and copy it manually.'); }
  });
  $('copyCodes').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(recoveryCodes.join('\n')); notice('Recovery codes copied. Store them securely.', true); }
    catch (_) { notice('Select and copy the recovery codes manually.'); }
  });
  $('savedCodes').addEventListener('change', e => { $('finishEnrollment').disabled = !e.target.checked; });
  $('finishEnrollment').addEventListener('click', () => { window.location.replace('/'); });
  $('restartLogin').addEventListener('click', async () => {
    try { await call('logout'); } finally { window.location.replace('/admin-login.html'); }
  });
  call('status').then(result => gotoStage(result.stage)).catch(err => { show('passwordStage'); notice(err.message); });
})();
