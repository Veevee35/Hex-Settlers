/**
 * Discord Activity entry point. Built locally into public/discord-activity.bundle.js
 * using npm run build:discord. Discord secrets NEVER ship to this bundle.
 */
import { DiscordSDK, Events } from './discord-rpc-lite.mjs';

const APP_ID = '1477895334406656101';
const PROXY_HOST = `${APP_ID}.discordsays.com`;
const ACTIVITY_HOST = 'activity.hexsettlers.org';

if ([PROXY_HOST, ACTIVITY_HOST].includes(location.hostname.toLowerCase())) {
  const sdk = new DiscordSDK(APP_ID);
  let sdkReady = false;
  let busy = false;
  let attached = false;
  let lastAttemptAt = 0;
  let participants = null;
  let pendingBrowserLogin = null;
  let autoLoginInProgress = false;

  const banner = document.createElement('section');
  banner.className = 'discordActivityStatus';
  banner.setAttribute('role', 'status');
  banner.setAttribute('aria-live', 'polite');
  const description = document.createElement('span');
  description.textContent = 'Connecting to Discord…';
  const invite = document.createElement('button');
  invite.type = 'button';
  invite.className = 'discordActivityInvite';
  invite.textContent = 'Invite';
  invite.hidden = true;
  invite.title = 'Invite friends to this Activity';
  invite.addEventListener('click', async () => {
    try { await sdk.commands.openInviteDialog(); }
    catch (error) { setStatus(`Discord invitation unavailable: ${error.message || 'Try again.'}`, true); }
  });
  banner.append(description, invite);
  document.body.appendChild(banner);

  function setStatus(message, error = false) {
    description.textContent = message;
    banner.dataset.error = String(error);
    invite.hidden = error || !attached;
  }

  async function refreshParticipants() {
    try {
      const result = await sdk.commands.getActivityInstanceConnectedParticipants();
      if (Array.isArray(result?.participants)) participants = result.participants.length;
    } catch { /* Nonessential; the game remains playable. */ }
  }

  // Third-party OAuth authorization screens must never be loaded inside the
  // Activity iframe. Instead open the first-party website using Discord's
  // external-link command, and poll a one-time approved login request.
  async function openWebsite(url) {
    if (sdkReady) return sdk.commands.openExternalLink({ url });
    throw new Error('Discord is still connecting. Try again in a moment.');
  }

  window.HexDiscordOpenSignup = async function openSignup(screen = 'register') {
    if (screen === 'register') {
      // Keep the pending Activity pairing attached to the account creation
      // flow, otherwise new players return from registration unable to join.
      return window.HexDiscordOpenOAuth('', 'register');
    }
    try {
      await openWebsite('https://hexsettlers.org/?auth_screen=forgot');
    } catch (error) {
      setStatus(error.message || 'Could not open password recovery.', true);
    }
  };

  window.HexDiscordOpenManageLinks = async function openManageLinks() {
    setStatus('To connect another provider, sign in at hexsettlers.org, open Account Management, and select Link beside that provider.');
    try { await openWebsite('https://hexsettlers.org/'); }
    catch (error) { setStatus(error.message || 'Could not open account management.', true); }
  };

  window.HexDiscordOpenOAuth = async function openOAuth(provider = '', screen = '') {
    if (pendingBrowserLogin) {
      setStatus('A browser sign-in is already pending. Complete it or restart the Activity.');
      return;
    }
    if (!sdkReady) { setStatus('Discord is still connecting. Try again.', true); return; }
    try {
      const response = await fetch('/api/auth/discord-pair/start', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }, body: '{}',
      });
      const data = await response.json();
      if (!response.ok || !data.ok || !data.pairId || !data.secret) throw new Error(data.error || 'Could not prepare secure sign-in.');
      const pair = { id: data.pairId, secret: data.secret, expiresAt: data.expiresAt };
      pendingBrowserLogin = pair;
      const link = new URL('https://hexsettlers.org/');
      link.searchParams.set('activity_link', pair.id);
      if (screen === 'register') link.searchParams.set('auth_screen', 'register');
      if (['google', 'github', 'cloudflare', 'discord'].includes(provider)) link.searchParams.set('activity_provider', provider);
      setStatus(`Browser sign-in · code ${data.code} · expires in 10 min`);
      // Start observing immediately. On some Discord clients openExternalLink
      // resolves only after the confirmation prompt or external browser closes;
      // the player may have finished approving their login before that happens.
      // The pairing secret never leaves this Activity frame.
      void pollBrowserLogin(pair);
      await openWebsite(link.href);
    } catch (error) {
      pendingBrowserLogin = null;
      setStatus(error.message || 'Could not open browser sign-in.', true);
    }
  };

  async function pollBrowserLogin(pair) {
    while (pendingBrowserLogin === pair && Date.now() < pair.expiresAt) {
      await new Promise(resolve => setTimeout(resolve, 2500));
      if (pendingBrowserLogin !== pair) return;
      try {
        const response = await fetch('/api/auth/discord-pair/status', {
          method: 'POST', credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pairId: pair.id, secret: pair.secret }),
        });
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error(data.error || 'Browser sign-in expired.');
        if (data.state !== 'connected') continue;
        pendingBrowserLogin = null;
        if (!(await window.HexSettlersActivityBridge?.acceptWebSession?.())) {
          setStatus('Login approved, but the Discord browser did not retain its session cookie. Check cookie settings and retry.', true);
          return;
        }
        setStatus('Browser login complete · connecting to Discord lobby…');
        return;
      } catch (error) {
        pendingBrowserLogin = null;
        setStatus(error.message || 'Browser sign-in failed.', true);
        return;
      }
    }
    if (pendingBrowserLogin === pair) {
      pendingBrowserLogin = null;
      setStatus('Browser sign-in expired. Select a provider to try again.', true);
    }
  }

  async function enterLobby() {
    if (!sdkReady || busy || autoLoginInProgress || !window.HexSettlersActivityBridge?.isAuthenticated()) return;
    const now = Date.now();
    if (now - lastAttemptAt < 1800) return;
    lastAttemptAt = now;
    busy = true;
    setStatus('Verifying Discord session…');
    try {
      const { code } = await sdk.commands.authorize({
        client_id: APP_ID, response_type: 'code', state: '', prompt: 'none', scope: ['identify'],
      });
      if (!code) throw new Error('Discord did not provide an authorization code.');
      if (!sdk.instanceId) throw new Error('Discord has not supplied an Activity instance.');
      const response = await fetch('/api/discord/activity/session', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, instanceId: sdk.instanceId }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok || !payload.ticket || !payload.accessToken) {
        throw new Error(payload?.error || `Discord session rejected (HTTP ${response.status}).`);
      }
      await sdk.commands.authenticate({ access_token: payload.accessToken });
      // The main game already has one authenticated websocket, and its own
      // replay/reconnect handling. Never inject a room code from the client.
      if (!window.HexSettlersActivityBridge.sendJoin(payload.ticket)) {
        throw new Error('Game connection was lost. Reconnect and try again.');
      }
      attached = true;
      await refreshParticipants();
      setStatus(`Discord lobby connected${participants == null ? '' : ` · ${participants} in Activity`}`);
    } catch (error) {
      attached = false;
      console.error('[discord-activity] Session failed:', error);
      setStatus(error?.message || 'Could not join Discord Activity.', true);
    } finally { busy = false; }
  }

  // New visitors are signed in only if the *verified Discord identity* has
  // already been linked explicitly to a Hex Settlers player. An unlinked
  // Discord account remains at the regular sign-in/registration screen.
  async function autoLoginLinkedDiscord() {
    if (autoLoginInProgress) return;
    autoLoginInProgress = true;
    setStatus('Checking your linked Discord account…');
    try {
      const authorization = await sdk.commands.authorize({
        client_id:APP_ID, response_type:'code', prompt:'none', scope:['identify'],
      });
      if (!authorization?.code || !sdk.instanceId) throw new Error('Discord authorization is not ready.');
      const response = await fetch('/api/discord/activity/auto-login', {
        method:'POST', credentials:'same-origin',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({code:authorization.code, instanceId:sdk.instanceId}),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'Discord automatic login failed.');
      if (!data.linked) {
        setStatus('Discord account not linked yet. Sign in below, then connect Discord in Account Management.');
        // Existing password / other-provider sessions may still join the
        // Activity, even without a linked Discord identity.
        setTimeout(() => { if (window.HexSettlersActivityBridge?.isAuthenticated()) void enterLobby(); }, 100);
        return;
      }
      await sdk.commands.authenticate({access_token:data.accessToken});
      if (!(await window.HexSettlersActivityBridge?.acceptWebSession?.())) {
        throw new Error('Discord sign-in succeeded, but the embedded browser rejected its login cookie.');
      }
      // The existing websocket needs time to reconnect using the new cookie.
      for (let i = 0; i < 40 && !window.HexSettlersActivityBridge?.isAuthenticated(); i++) {
        await new Promise(resolve => setTimeout(resolve, 250));
      }
      if (!window.HexSettlersActivityBridge?.sendJoin?.(data.ticket)) {
        throw new Error('Signed in, but game connection is still loading.');
      }
      attached = true;
      await refreshParticipants();
      setStatus(`Discord account connected automatically${participants == null ? '' : ` · ${participants} in Activity`}`);
    } catch (error) {
      // Do not block conventional password/provider sign-in after an Activity
      // OAuth failure (e.g. missing OAuth2 redirect in the Developer Portal).
      console.warn('[discord-activity] Auto-login:', error);
      setStatus('Automatic Discord sign-in unavailable. You can still sign in below. Check OAuth2 Redirects in the Discord Developer Portal.');
    } finally { autoLoginInProgress = false; }
  }

  window.addEventListener('hexsettlers:discord-auth', () => { void enterLobby(); });
  window.addEventListener('hexsettlers:discord-signed-out', () => {
    pendingBrowserLogin = null;
    attached = false;
    setStatus('Sign in to Hex Settlers to join this Activity.');
  });
  window.addEventListener('online', () => { void enterLobby(); });

  void (async () => {
    try {
      await sdk.ready();
      sdkReady = true;
      setStatus('Sign in to Hex Settlers to join this Activity.');
      try {
        await sdk.subscribe(Events.ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE, async () => {
          await refreshParticipants();
          if (attached) setStatus(`Discord lobby connected${participants == null ? '' : ` · ${participants} in Activity`}`);
        });
      } catch { /* Notifications are optional. */ }
      await autoLoginLinkedDiscord();
    } catch (error) {
      console.error('[discord-activity] SDK initialization failed:', error);
      setStatus('Launch this game from a Discord voice channel or Activity invite.', true);
    }
  })();
}
