/**
 * Hex Settlers: self-contained Discord Activities RPC adapter.
 * Implements the five RPC operations used by this game, following the
 * Discord Embedded App SDK v2.5.0 protocol (Discord/Discord.ts, MIT license).
 * This is an API-compatible SUBSET, not the full upstream npm SDK.
 * Upstream: https://github.com/discord/embedded-app-sdk (MIT).
 * The server independently validates the OAuth identity and live Activity
 * membership: messages from this client never authorize a game join alone.
 */
export const Events = Object.freeze({
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

export class DiscordSDK {
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
