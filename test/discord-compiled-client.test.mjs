import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('the DISTRIBUTED browser bundle initializes inside a Discord frame and can launch OAuth pairing', async () => {
  const sent = [], handlers = new Map(), elements = [], fetchPaths = [];
  const parent = { postMessage(frame) { sent.push(frame); } };
  const location = { hostname: '1477895334406656101.discordsays.com', origin: 'https://1477895334406656101.discordsays.com', search:'?instance_id=active_1234&frame_id=frame_3&platform=desktop' };
  const window = { parent, location, addEventListener(name, callback) { handlers.set(name, callback); } };
  const document = {
    referrer: 'https://discord.com/channels/456/789',
    getElementById(id) { return id === 'loginLinkExisting' ? {checked:true} : null; },
    querySelectorAll(selector) { return selector === '[data-link-method]:checked' ? [{dataset:{linkMethod:'google'}},{dataset:{linkMethod:'discord'}}] : []; },
    createElement(tag) { const e = {tag, hidden:false, dataset:{}, className:'', textContent:'', setAttribute(){}, addEventListener(){}, append(...children) { this.children=children; }}; elements.push(e); return e; },
    body: { appendChild() {} },
  };
  const context = vm.createContext({window, location, document, URLSearchParams, URL, crypto,
    console, setTimeout() { return 1; }, clearTimeout() {}, Date,
    fetch: async (url, options) => {
      fetchPaths.push(url);
      assert.equal(options.method, 'POST');
      if (url === '/api/auth/discord-pair/start') return { ok:true, json:async()=>({ok:true,pairId:'A'.repeat(24),secret:'B'.repeat(43),code:'ABCDEF',expiresAt:Date.now()+600000}) };
      throw new Error('Unexpected fetch to '+url);
    }});
  const code = fs.readFileSync(path.join(root,'public/discord-activity.bundle.js'),'utf8');
  vm.runInContext(code, context, {filename:'discord-activity.bundle.js'});
  assert.equal(sent[0][0],0);
  assert.equal(sent[0][1].frame_id,'frame_3');
  assert.equal(typeof window.HexDiscordOpenOAuth, 'function');
  handlers.get('message')({ source:parent, origin:'https://discord.com', data:[1,{cmd:'DISPATCH', evt:'READY', data:{v:1}}] });
  await new Promise(resolve => process.nextTick(resolve));
  const handoff = window.HexDiscordOpenOAuth('github');
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(fetchPaths, ['/api/auth/discord-pair/start']);
  const command = sent.map(frame => frame[1]).find(frame => frame.cmd === 'OPEN_EXTERNAL_LINK');
  assert.ok(command, 'Discord must receive OPEN_EXTERNAL_LINK');
  assert.equal(command.cmd, 'OPEN_EXTERNAL_LINK');
  assert.ok(command.args.url.startsWith('https://hexsettlers.org/?activity_link='));
  assert.equal(new URL(command.args.url).searchParams.get('activity_provider'), 'github');
  assert.equal(new URL(command.args.url).searchParams.get('link_providers'), 'google,discord');
  handlers.get('message')({source:parent,origin:'https://discord.com',data:[1,{cmd:'OPEN_EXTERNAL_LINK',nonce:command.nonce,evt:null,data:{}}]});
  await handoff;
  const status = elements.find(e => e.className === 'discordActivityStatus');
  assert.match(status.children[0].textContent, /Browser sign-in/);
});
