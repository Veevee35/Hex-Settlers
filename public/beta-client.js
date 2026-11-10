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
  // Compact insect control: touch/mouse draggable, position and visibility are
  // local to this browser, independently for narrow and wide layouts.
  const VISIBLE_KEY = 'hex_beta_feedback_icon_visible_v1';
  const positionKey = () => 'hex_beta_feedback_icon_position_' +
    (window.matchMedia?.('(max-width: 680px)').matches ? 'mobile' : 'desktop') + '_v1';
  const quickMenu = $('betaFeedbackQuickMenu');
  const settingsVisible = $('betaFeedbackSettingsVisible');
  const formVisible = $('betaFeedbackFormVisible');
  const menuToggle = $('betaFeedbackMenuToggle');
  const landingToggle = $('betaFeedbackLandingToggle');
  let visible = true;
  try { visible = localStorage.getItem(VISIBLE_KEY) !== '0'; } catch (_) {}
  const readPosition = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(positionKey()) || 'null');
      return saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)
        && saved.x >= 0 && saved.x <= 1 && saved.y >= 0 && saved.y <= 1 ? saved : null;
    } catch (_) { return null; }
  };
  const clamp = (v, lower, upper) => Math.max(lower, Math.min(upper, v));
  const viewport = () => ({ width:window.innerWidth || document.documentElement.clientWidth,
    height:window.innerHeight || document.documentElement.clientHeight });
  const buttonSize = () => ({ width:launch?.offsetWidth || 44, height:launch?.offsetHeight || 44 });
  function moveButton(x, y, persist) {
    if (!launch) return;
    const size = buttonSize(), view = viewport();
    const maxX = Math.max(8, view.width - size.width - 8);
    const maxY = Math.max(8, view.height - size.height - 8);
    const left = clamp(x, 8, maxX), top = clamp(y, 8, maxY);
    launch.style.left = left + 'px'; launch.style.top = top + 'px';
    launch.style.right = 'auto'; launch.style.bottom = 'auto';
    if (persist) {
      try { localStorage.setItem(positionKey(), JSON.stringify({x:(left-8)/Math.max(1,maxX-8), y:(top-8)/Math.max(1,maxY-8)})); }
      catch (_) {}
    }
  }
  function positionFromSaved() {
    if (!launch) return;
    const saved = readPosition();
    if (!saved) {
      launch.style.left = ''; launch.style.top = '';
      launch.style.right = ''; launch.style.bottom = '';
      return;
    }
    const view = viewport(), size = buttonSize();
    moveButton(8 + saved.x * Math.max(0, view.width - size.width - 16),
      8 + saved.y * Math.max(0, view.height - size.height - 16), false);
  }
  function closeQuickMenu() { quickMenu?.classList.add('hidden'); }
  function setVisible(next) {
    visible = Boolean(next);
    launch?.classList.toggle('is-hidden', !visible);
    if (settingsVisible) settingsVisible.checked = visible;
    if (formVisible) formVisible.checked = visible;
    if (menuToggle) {
      menuToggle.textContent = visible ? '🐞 Hide feedback icon' : '🐞 Show feedback icon';
      menuToggle.setAttribute('aria-pressed', String(visible));
    }
    if (landingToggle) {
      landingToggle.textContent = visible ? 'Hide feedback icon' : 'Show feedback icon';
      landingToggle.setAttribute('aria-pressed', String(visible));
    }
    try { localStorage.setItem(VISIBLE_KEY, visible ? '1' : '0'); } catch (_) {}
    if (!visible) closeQuickMenu();
  }
  function openQuickMenu() {
    if (!quickMenu || !launch || !visible) return;
    const r = launch.getBoundingClientRect();
    const view = viewport();
    const width = 178, height = 94;
    quickMenu.style.left = clamp(r.left, 8, Math.max(8, view.width-width-8)) + 'px';
    quickMenu.style.top = clamp(r.bottom + 8 + height > view.height ? r.top - height - 8 : r.bottom + 8,
      8, Math.max(8, view.height-height-8)) + 'px';
    quickMenu.classList.remove('hidden');
    quickMenu.querySelector('button')?.focus({ preventScroll:true });
  }
  setVisible(visible);
  positionFromSaved();
  settingsVisible?.addEventListener('change', () => setVisible(settingsVisible.checked));
  formVisible?.addEventListener('change', () => setVisible(formVisible.checked));
  menuToggle?.addEventListener('click', () => setVisible(!visible));
  landingToggle?.addEventListener('click', () => setVisible(!visible));
  $('betaFeedbackQuickHide')?.addEventListener('click', () => setVisible(false));
  $('betaFeedbackQuickReset')?.addEventListener('click', () => {
    try { localStorage.removeItem(positionKey()); } catch (_) {}
    positionFromSaved(); closeQuickMenu();
  });

  let dragging = null, suppressClickUntil = 0, holdTimer = null;
  const cancelHold = () => { if (holdTimer) clearTimeout(holdTimer); holdTimer = null; };
  launch?.addEventListener('pointerdown', event => {
    if (event.button !== 0 || dragging) return;
    closeQuickMenu();
    const rect = launch.getBoundingClientRect();
    dragging = { id:event.pointerId, x:event.clientX, y:event.clientY,
      originX:rect.left, originY:rect.top, moved:false, held:false };
    try { launch.setPointerCapture?.(event.pointerId); } catch (_) { /* Synthetic/non-active pointers cannot be captured. */ }
    if (event.pointerType === 'touch' || event.pointerType === 'pen') {
      cancelHold();
      holdTimer = setTimeout(() => {
        if (!dragging || dragging.moved) return;
        dragging.held = true; suppressClickUntil = Date.now() + 450;
        openQuickMenu();
        if (navigator.vibrate) navigator.vibrate(15);
      }, 650);
    }
  });
  launch?.addEventListener('pointermove', event => {
    if (!dragging || dragging.id !== event.pointerId) return;
    const dx = event.clientX - dragging.x, dy = event.clientY - dragging.y;
    if (!dragging.moved && Math.hypot(dx,dy) < 7) return;
    if (!dragging.moved) { dragging.moved = true; cancelHold(); closeQuickMenu(); launch.classList.add('is-dragging'); }
    moveButton(dragging.originX + dx, dragging.originY + dy, false);
  });
  function endDrag(event) {
    if (!dragging || event.pointerId !== dragging.id) return;
    cancelHold();
    if (dragging.moved) {
      const rect = launch.getBoundingClientRect(); moveButton(rect.left,rect.top,true);
      suppressClickUntil = Date.now() + 450;
    } else if (dragging.held) suppressClickUntil = Date.now() + 450;
    launch.classList.remove('is-dragging');
    dragging = null;
  }
  launch?.addEventListener('pointerup', endDrag);
  launch?.addEventListener('pointercancel', endDrag);
  launch?.addEventListener('lostpointercapture', endDrag);
  launch?.addEventListener('click', event => {
    if (Date.now() < suppressClickUntil) { event.preventDefault(); return; }
    closeQuickMenu(); show(true);
  });
  launch?.addEventListener('contextmenu', event => {
    event.preventDefault(); cancelHold(); openQuickMenu();
  });
  document.addEventListener('pointerdown', event => {
    if (!quickMenu?.contains(event.target) && event.target !== launch && !launch?.contains(event.target)) closeQuickMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeQuickMenu();
    // Restore icon even from the login screen if it was previously hidden.
    if (event.altKey && event.shiftKey && event.code === 'KeyB' && !event.repeat) {
      event.preventDefault(); setVisible(!visible);
    }
  });
  window.addEventListener('resize', positionFromSaved, { passive:true });
  window.addEventListener('orientationchange', positionFromSaved, { passive:true });
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
      form.reset(); if (formVisible) formVisible.checked = visible;
      status.textContent = 'Feedback submitted. Thank you for helping test Hex Settlers.';
    } catch (error) { status.textContent = error.message; }
    finally { button.disabled = false; }
  });
})();
