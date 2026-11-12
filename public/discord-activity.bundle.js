/* Hex Settlers Discord Activity browser bundle - offline built; no placeholder.
 * RPC implementation: Discord SDK 2.5.0 compatible subset; see client/discord-rpc-lite.mjs.
 */
(() => {
'use strict';
/**
 * Hex Settlers: self-contained Discord Activities RPC adapter.
 * Implements the five RPC operations used by this game, following the
 * Discord Embedded App SDK v2.5.0 protocol (Discord/Discord.ts, MIT license).
 * This is an API-compatible SUBSET, not the full upstream npm SDK.
 * Upstream: https://github.com/discord/embedded-app-sdk (MIT).
 * The server independently validates the OAuth identity and live Activity
 * membership: messages from this client never authorize a game join alone.
 */
const Events = Object.freeze({
  READY: 'READY',
  ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE: 'ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE',
});

const DISCORD_ORIGINS = new Set([
  'https://discord.com', 'https://discordapp.com',
  'https://ptb.discord.com', 'https://ptb.discordapp.com',
  'https://canary.discord.com', 'https://canary.discordapp.com',
  'https://staging.discord.co', 'https://pax.discord.com',
  'http://localhost:3333', 'null',
]);

class DiscordSDK {
  constructor(clientId) {
    this.clientId = clientId;
    const query = new URLSearchParams(window.location.search);
    this.instanceId = query.get('instance_id');
    this.frameId = query.get('frame_id');
    this.platform = query.get('platform');
    this.guildId = query.get('guild_id');
    this.channelId = query.get('channel_id');
    if (!this.instanceId || !this.frameId || !['desktop', 'mobile'].includes(this.platform)) {
      throw new Error('Discord Activity launch parameters are missing. Launch from Discord, not a normal browser tab.');
    }
    this.source = window.parent?.opener ?? window.parent;
    if (!this.source || this.source === window) {
      throw new Error('Hex Settlers must be opened from a Discord Activity.');
    }
    // Discord's official SDK uses the referrer for the RPC destination.
    let origin = '*';
    if (document.referrer) {
      try { origin = new URL(document.referrer).origin; }
      catch { /* The initial handshake still requires an actual Discord frame. */ }
    }
    this.sourceOrigin = origin;
    this.isReady = false;
    this.pending = new Map();
    this.handlers = new Map();
    this.readyPromise = new Promise((resolve, reject) => {
      this._resolveReady = resolve;
      this._rejectReady = reject;
    });
    this._onMessage = this._onMessage.bind(this);
    window.addEventListener('message', this._onMessage);
    this.commands = {
      authorize: (args) => this._send('AUTHORIZE', args),
      authenticate: (args) => this._send('AUTHENTICATE', args),
      openExternalLink: (args) => this._send('OPEN_EXTERNAL_LINK', args),
      openInviteDialog: () => this._send('OPEN_INVITE_DIALOG'),
      getActivityInstanceConnectedParticipants: () => this._send('GET_ACTIVITY_INSTANCE_CONNECTED_PARTICIPANTS'),
    };
    const handshake = {
      v: 1, encoding: 'json', client_id: clientId, frame_id: this.frameId,
    };
    const mobileMajor = Number.parseInt(query.get('mobile_app_version')?.split('.')[0] || '-1', 10);
    if (this.platform === 'desktop' || mobileMajor >= 250) handshake.sdk_version = '2.5.0';
    this.source.postMessage([0, handshake], this.sourceOrigin);
  }

  ready() { return this.readyPromise; }

  _nonce() {
    // Cryptographically unpredictable command IDs prevent untrusted responses
    // from matching pending requests even if the sender also knew the origin.
    return crypto.randomUUID();
  }

  _send(cmd, args, evt) {
    const nonce = this._nonce();
    const frame = { cmd, nonce };
    if (args !== undefined) frame.args = args;
    if (evt !== undefined) frame.evt = evt;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(nonce);
        reject(new Error(`Discord did not answer ${cmd}.`));
      }, 15000);
      this.pending.set(nonce, { resolve, reject, timeout });
      try { this.source.postMessage([1, frame], this.sourceOrigin); }
      catch (error) { clearTimeout(timeout); this.pending.delete(nonce); reject(error); }
    });
  }

  subscribe(event, callback) {
    if (typeof callback !== 'function') throw new TypeError('Event handler must be callable.');
    const existing = this.handlers.get(event) || new Set();
    const isFirst = existing.size === 0;
    existing.add(callback);
    this.handlers.set(event, existing);
    if (event !== Events.READY && isFirst) {
      return this._send('SUBSCRIBE', undefined, event).then(() => this);
    }
    return Promise.resolve(this);
  }

  _onMessage(event) {
    if (event.source && event.source !== this.source) return;
    if (!(DISCORD_ORIGINS.has(event.origin) || event.origin === window.location.origin)) return;
    if (!Array.isArray(event.data) || event.data.length < 2) return;
    const [opcode, frame] = event.data;
    if (opcode === 2) {
      const message = typeof frame?.message === 'string' ? frame.message : 'Discord closed the Activity connection.';
      for (const [nonce, pending] of this.pending) {
        clearTimeout(pending.timeout); pending.reject(new Error(message)); this.pending.delete(nonce);
      }
      if (!this.isReady) this._rejectReady(new Error(message));
      return;
    }
    if (opcode !== 1 || !frame || typeof frame !== 'object') return;
    if (frame.cmd === 'DISPATCH') {
      if (frame.evt === Events.READY) {
        this.isReady = true;
        this._resolveReady();
      }
      for (const callback of this.handlers.get(frame.evt) || []) {
        try { callback(frame.data); } catch (e) { console.error('[discord-rpc] Event error:', e); }
      }
      return;
    }
    const pending = this.pending.get(frame.nonce);
    if (!pending) return;
    clearTimeout(pending.timeout);
    this.pending.delete(frame.nonce);
    if (frame.evt === 'ERROR') {
      pending.reject(new Error(frame.data?.message || `Discord rejected ${frame.cmd}.`));
      return;
    }
    pending.resolve(frame.data);
  }
}

/**
 * Discord Activity entry point. Built locally into public/discord-activity.bundle.js
 * using npm run build:discord. Discord secrets NEVER ship to this bundle.
 */


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
      if (['google', 'github', 'cloudflare'].includes(provider)) link.searchParams.set('activity_provider', provider);
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
      await enterLobby();
    } catch (error) {
      console.error('[discord-activity] SDK initialization failed:', error);
      setStatus('Launch this game from a Discord voice channel or Activity invite.', true);
    }
  })();
}

})();
