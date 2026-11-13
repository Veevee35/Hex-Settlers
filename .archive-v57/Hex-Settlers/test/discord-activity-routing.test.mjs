import test from 'node:test';
import assert from 'node:assert/strict';
import { isActivityHost, permittedActivityOrigin, frameHeadersForActivity } from '../cloudflare/discord-routing.mjs';
const ACT='https://activity.hexsettlers.org/';
const PUBLIC='https://hexsettlers.org/';
const ORIGIN='https://1477895334406656101.discordsays.com';
const req=(url, origin) => new Request(url,{headers: origin?{Origin:origin}:{}});
test('Discord origin accepted only on the dedicated Activity hostname',()=>{
  assert.equal(isActivityHost(req(ACT)),true);
  assert.equal(isActivityHost(req(PUBLIC)),false);
  assert.equal(permittedActivityOrigin(req(ACT,ORIGIN)),true);
  assert.equal(permittedActivityOrigin(req(PUBLIC,ORIGIN)),false);
  assert.equal(permittedActivityOrigin(req(ACT,'https://evil.example')),false);
  assert.equal(permittedActivityOrigin(req(ACT,'https://activity.hexsettlers.org')),true);
});
test('iframe CSP relaxed only for Activity hostname',()=>{
  const initial=()=>new Headers({'X-Frame-Options':'DENY','Cross-Origin-Opener-Policy':'same-origin',
    'Content-Security-Policy':"default-src 'self'; frame-ancestors 'none'"});
  const activity=frameHeadersForActivity(initial(),req(ACT));
  assert.equal(activity.has('X-Frame-Options'),false);
  assert.match(activity.get('Content-Security-Policy'), /frame-ancestors https:\/\/discord.com/);
  const publicHeaders=frameHeadersForActivity(initial(),req(PUBLIC));
  assert.equal(publicHeaders.get('X-Frame-Options'),'DENY');
  assert.match(publicHeaders.get('Content-Security-Policy'), /frame-ancestors 'none'/);
});
