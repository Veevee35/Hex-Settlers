/* Hex Settlers organized-beta recruiting, sessions and voluntary feedback. */
(() => {
  'use strict';
  if (location.hostname.toLowerCase() === 'admin.hexsettlers.org') return;
  const $ = id => document.getElementById(id);
  const VISITOR_KEY = 'hex_beta_visitor_v1';
  const REF_KEY = 'hex_beta_referral_v1';
  const REF_AT_KEY = 'hex_beta_referral_time_v1';
  const safeReferral = value => /^[a-z0-9][a-z0-9_-]{0,39}$/.test(String(value || '').toLowerCase()) ? String(value).toLowerCase() : 'direct';
  let visitor = '';
  let referral = 'direct';
  try {
    visitor = localStorage.getItem(VISITOR_KEY) || '';
    if (!/^[a-f0-9-]{20,50}$/i.test(visitor)) {
      visitor = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, visitor);
    }
    const newRef = new URL(location.href).searchParams.get('ref');
    if (newRef && safeReferral(newRef) !== 'direct') {
      localStorage.setItem(REF_KEY, safeReferral(newRef));
      localStorage.setItem(REF_AT_KEY, String(Date.now()));
    }
    const refAt = Number(localStorage.getItem(REF_AT_KEY) || 0);
    if (Date.now() - refAt < 30 * 86400000) referral = safeReferral(localStorage.getItem(REF_KEY));
  } catch (_) { visitor = crypto.randomUUID(); }
  async function post(url, body) {
    const response = await fetch(url, { method:'POST', credentials:'same-origin',
      headers: { 'Content-Type':'application/json' }, body: JSON.stringify(body) });
    let json = {};
    try { json = await response.json(); } catch (_) {}
    if (!response.ok || !json.ok) throw new Error(json.error || 'Could not contact beta server.');
    return json;
  }
  function track(type) {
    return post('/api/beta/event', { type, visitor, referral }).catch(() => {});
  }
  let lastAccountTrack = 0;
  const api = {
    roomCode: '',
    account() {
      if (Date.now() - lastAccountTrack < 30000) return;
      lastAccountTrack = Date.now();
      void track('account');
    },
    setRoom(code) { api.roomCode = /^[A-Z0-9]{4,8}$/.test(String(code || '')) ? code : ''; },
    refreshSessions,
  };
  window.HexBeta = api;
  void track('visit');
  let errorsSent = 0;
  window.addEventListener('error', () => { if (errorsSent++ < 2) void track('client_error'); });
  window.addEventListener('unhandledrejection', () => { if (errorsSent++ < 2) void track('client_error'); });

  const formatTime = at => new Date(at).toLocaleString(undefined, { timeZone:'America/Chicago',
    month:'short',day:'numeric',weekday:'short',hour:'numeric',minute:'2-digit',timeZoneName:'short' });
  async function refreshSessions() {
    const host = $('betaSessions');
    if (!host) return;
    try {
      const response = await fetch('/api/beta/sessions', { cache:'no-store' });
      const json = await response.json();
      if (!response.ok || !json.ok) return;
      const sessions = (json.sessions || []).slice(0, 3);
      host.replaceChildren();
      const invite = typeof json.discordInvite === 'string' && /^https:\/\/(?:discord\.gg|discord\.com)\//.test(json.discordInvite)
        ? json.discordInvite : '';
      if (!sessions.length && !invite) { host.classList.add('hidden'); return; }

      const heading = document.createElement('h2'); heading.textContent = 'Upcoming playtest sessions';
      host.appendChild(heading);
      if (invite) {
        const link = document.createElement('a'); link.href = invite; link.target = '_blank';
        link.rel = 'noopener noreferrer'; link.className = 'betaDiscordLink';
        link.textContent = 'Join the Hex Settlers Discord community'; host.appendChild(link);
      }
      for (const item of sessions) {
        const block = document.createElement('div'); block.className = 'betaSessionRow';
        const strong = document.createElement('strong'); strong.textContent = item.title;
        const when = document.createElement('span'); when.textContent = `${formatTime(item.startAt)} – ${new Date(item.endAt).toLocaleTimeString(undefined, { timeZone:'America/Chicago', hour:'numeric', minute:'2-digit' })} CT`;
        block.append(strong,when);
        if (item.notes) { const notes=document.createElement('small'); notes.textContent=item.notes; block.append(notes); }
        host.appendChild(block);
      }
      host.classList.remove('hidden');
    } catch (_) {} // Game and login must continue even if the calendar is unavailable.
  }
  void refreshSessions();

  const launch = $('betaFeedbackLaunch'), overlay = $('betaFeedbackOverlay');
  const form = $('betaFeedbackForm'), close = $('betaFeedbackClose'), status = $('betaFeedbackStatus');
  const show = visible => {
    overlay?.classList.toggle('hidden', !visible);
    overlay?.setAttribute('aria-hidden', visible ? 'false' : 'true');
    if (visible) { status.textContent=''; $('betaFeedbackDescription')?.focus(); }
  };
  launch?.addEventListener('click', () => show(true));
  close?.addEventListener('click', () => show(false));
  overlay?.addEventListener('click', event => { if (event.target === overlay) show(false); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && overlay && !overlay.classList.contains('hidden')) show(false); });
  form?.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('[type="submit"]');
    button.disabled = true; status.textContent = 'Sending feedback…';
    try {
      await post('/api/beta/feedback', {
        category: $('betaFeedbackType').value,
        description: $('betaFeedbackDescription').value,
        steps: $('betaFeedbackSteps').value,
        roomCode: api.roomCode,
        device: /tablet|ipad/i.test(navigator.userAgent) ? 'tablet' : /mobile|iphone|android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      });
      form.reset(); status.textContent = 'Feedback submitted. Thank you for helping test Hex Settlers.';
    } catch (error) { status.textContent = error.message; }
    finally { button.disabled = false; }
  });
})();
