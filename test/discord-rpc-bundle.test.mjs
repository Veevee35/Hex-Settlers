import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { DiscordSDK, Events } from '../client/discord-rpc-lite.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function setup() {
  const sent = [];
  let onMessage = null;
  const parent = { postMessage(payload, origin) { sent.push({ payload, origin }); } };
  globalThis.window = {
    parent, location: {
      origin: 'https://1477895334406656101.discordsays.com',
      search: '?frame_id=frame-123&instance_id=abc123&platform=desktop',
    },
    addEventListener(name, callback) { if (name === 'message') onMessage = callback; },
  };
  globalThis.document = { referrer: 'https://discord.com/channels/12345/67890' };
  return {
    parent, sent,
    emit(origin, payload, source = parent) { onMessage({ origin, data: payload, source }); },
  };
}

test('prebuilt Discord bundle is complete and has a matching SHA-256', () => {
  const code = fs.readFileSync(path.join(root, 'public/discord-activity.bundle.js'));
  const hash = fs.readFileSync(path.join(root, 'public/discord-activity.bundle.sha256'), 'utf8').trim();
  assert.ok(code.length > 10000);
  assert.equal(crypto.createHash('sha256').update(code).digest('hex'), hash);
  assert.match(code.toString('utf8'), /window\.HexDiscordOpenOAuth/);
  assert.doesNotMatch(code.toString('utf8'), /Diagnostic fallback ONLY/);
});

test('Discord handshake waits for a genuine READY message', async () => {
  const host = setup();
  const sdk = new DiscordSDK('1477895334406656101');
  assert.deepEqual(host.sent[0].payload.slice(0, 1), [0]);
  assert.equal(host.sent[0].payload[1].client_id, '1477895334406656101');
  assert.equal(host.sent[0].payload[1].frame_id, 'frame-123');
  assert.equal(host.sent[0].origin, 'https://discord.com');
  assert.equal(sdk.instanceId, 'abc123');
  host.emit('https://not-discord.example', [1, { cmd:'DISPATCH', evt:'READY', data:{} }]);
  assert.equal(sdk.isReady, false);
  host.emit('https://discord.com', [1, { cmd:'DISPATCH', evt:'READY', data:{} }], {});
  assert.equal(sdk.isReady, false);
  host.emit('https://discord.com', [1, { cmd:'DISPATCH', evt:'READY', data:{} }]);
  await sdk.ready();
  assert.equal(sdk.isReady, true);
});

test('Discord commands resolve only matching RPC nonces and valid origins', async () => {
  const host = setup();
  const sdk = new DiscordSDK('1477895334406656101');
  host.emit('https://discord.com', [1, { cmd:'DISPATCH', evt:'READY', data:{} }]);
  const req = sdk.commands.authorize({ client_id: sdk.clientId, scope:['identify'], response_type:'code', prompt:'none' });
  const msg = host.sent.at(-1).payload[1];
  assert.equal(msg.cmd, 'AUTHORIZE');
  assert.equal(typeof msg.nonce, 'string');
  host.emit('https://not-discord.example', [1, {cmd:'AUTHORIZE', nonce:msg.nonce, evt:null, data:{code:'forged'}}]);
  assert.ok(sdk.pending.has(msg.nonce));
  host.emit('https://discord.com', [1, {cmd:'AUTHORIZE', nonce:msg.nonce, evt:null, data:{code:'valid-code'}}]);
  assert.equal((await req).code, 'valid-code');
  assert.ok(!sdk.pending.has(msg.nonce));
});

test('Discord invite, external-browser handoff, event subscription and auth commands use the correct RPC command names', async () => {
  const host = setup(); const sdk = new DiscordSDK('1477895334406656101');
  const complete = (promise, cmd) => {
    const frame = host.sent.at(-1).payload[1];
    assert.equal(frame.cmd, cmd);
    host.emit('https://discord.com', [1, {cmd, nonce:frame.nonce, evt:null, data:{ok:true}}]);
    return promise;
  };
  await complete(sdk.commands.openExternalLink({url:'https://hexsettlers.org/'}), 'OPEN_EXTERNAL_LINK');
  await complete(sdk.commands.openInviteDialog(), 'OPEN_INVITE_DIALOG');
  await complete(sdk.commands.authenticate({access_token:'example'}), 'AUTHENTICATE');
  await complete(sdk.commands.getActivityInstanceConnectedParticipants(), 'GET_ACTIVITY_INSTANCE_CONNECTED_PARTICIPANTS');
  const received=[];
  const sub = sdk.subscribe(Events.ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE, v => received.push(v));
  const frame = host.sent.at(-1).payload[1];
  assert.equal(frame.cmd, 'SUBSCRIBE');
  assert.equal(frame.evt, Events.ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE);
  host.emit('https://discord.com', [1, {cmd:'SUBSCRIBE', nonce:frame.nonce, evt:null, data:{}}]);
  await sub;
  host.emit('https://discord.com', [1, {cmd:'DISPATCH',evt:Events.ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE, data:{participants:[]}}]);
  assert.equal(received.length, 1);
});
