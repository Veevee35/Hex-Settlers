/**
 * Discord Activity entry point. Built locally into public/discord-activity.bundle.js
 * using npm run build:discord. Discord secrets NEVER ship to this bundle.
 */
import { DiscordSDK, Events } from '@discord/embedded-app-sdk';

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

  // Account creation and Turnstile verification occur on the first-party site.
  // Discord's iframe CSP and OAuth redirects make external signup safer.
  window.HexDiscordOpenSignup = async function openSignup() {
    const url = 'https://hexsettlers.org/';
    try {
      if (sdkReady) {
        await sdk.commands.openExternalLink({ url });
        return;
      }
    } catch { /* Fall back if the Discord client does not support the command. */ }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  async function enterLobby() {
    if (!sdkReady || busy || !window.HexSettlersActivityBridge?.isAuthenticated()) return;
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

  window.addEventListener('hexsettlers:discord-auth', () => { void enterLobby(); });
  window.addEventListener('hexsettlers:discord-signed-out', () => {
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
        sdk.subscribe(Events.ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE, async () => {
          await refreshParticipants();
          if (attached) setStatus(`Discord lobby connected${participants == null ? '' : ` · ${participants} in Activity`}`);
        });
      } catch { /* Notifications are optional. */ }
      await enterLobby();
    } catch (error) {
      console.error('[discord-activity] SDK initialization failed:', error);
      setStatus('Launch this game from a Discord voice channel or Activity invite.', true);
    }
  })();
}
