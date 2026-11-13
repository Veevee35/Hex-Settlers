/* Hex Settlers progressive web app installation, first-party mobile site only. */
(() => {
  'use strict';
  const button = document.getElementById('installGameApp');
  if (!button) return;
  const host = location.hostname.toLowerCase();
  if (host !== 'hexsettlers.org' && host !== 'www.hexsettlers.org' && host !== 'localhost') return;
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '') || navigator.userAgentData?.mobile === true;
  if (!mobile || matchMedia('(display-mode: standalone)').matches || navigator.standalone === true) return;
  button.hidden = false;
  let installEvent = null;
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installEvent = event;
  });
  window.addEventListener('appinstalled', () => {
    installEvent = null;
    button.hidden = true;
    document.getElementById('installGameHelp')?.remove();
  });
  button.addEventListener('click', async () => {
    if (installEvent) {
      const event = installEvent;
      installEvent = null;
      try { await event.prompt(); await event.userChoice; }
      catch { /* Browser will still provide its own install menu. */ }
      return;
    }
    const existing = document.getElementById('installGameHelp');
    if (existing) { existing.remove(); return; }
    const help = document.createElement('div');
    help.id = 'installGameHelp';
    help.className = 'installGameHelp';
    help.setAttribute('role','status');
    help.textContent = /iPhone|iPad|iPod/i.test(navigator.userAgent) ?
      'Tap Share in your browser, then Add to Home Screen (or Add to Dock). Open Hex Settlers from the new icon.' :
      'Open your browser menu (⋮), choose Install app or Add to Home screen, then confirm.';
    button.insertAdjacentElement('afterend', help);
  });
})();
