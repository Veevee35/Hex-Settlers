'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { issueJoinTicket, verifyJoinTicket, verifyDiscordActivity, isActivityRequest } = require('../server/discord-activity');
const { sessionCookie, clearSessionCookie } = require('../server/http-auth');
const { serializeRoom, restoreRoom } = require('../server/active-rooms');

const APP = '1477895334406656101';
const ID = 'instance_test_123';
const SECRET = 'not-a-real-secret'.repeat(4);

test('ticket is bound to account, Discord identity and expiration; tampering fails', () => {
  const clock = () => 123456;
  const ticket = issueJoinTicket({ userId:'user-1', discordId:'112233445566778899', instanceId:ID, secret:SECRET, clock });
  assert.equal(verifyJoinTicket(ticket, 'user-1', SECRET, clock).i, ID);
  assert.equal(verifyJoinTicket(ticket, 'user-2', SECRET, clock), null);
  assert.equal(verifyJoinTicket(ticket.slice(0,-1) + (ticket.at(-1)==='A'?'B':'A'), 'user-1', SECRET, clock), null);
  assert.equal(verifyJoinTicket(ticket, 'user-1', 'wrong secret', clock), null);
  assert.equal(verifyJoinTicket(ticket, 'user-1', SECRET, () => 123456 + 240001), null);
  assert.throws(() => issueJoinTicket({ userId:'x', discordId:'bad', instanceId:ID, secret:SECRET }));
});

test('Discord OAuth + identity + bot membership are required', async () => {
  const seen=[];
  const goodFetch=async (url, options) => {
    seen.push({url:String(url),authorization:options.headers?.Authorization});
    if (url.endsWith('/oauth2/token')) {
      assert.match(String(options.body), /client_secret=secret/);
      return { ok:true, json:async()=>({access_token:'sdk-access',token_type:'Bearer'})};
    }
    if (url.endsWith('/users/@me')) return { ok:true, json:async()=>({id:'112233445566778899',username:'HexUser'})};
    if (url.endsWith('/activity-instances/'+ID)) return { ok:true, json:async()=>({application_id:APP, instance_id:ID, users:['112233445566778899']})};
    throw new Error('Unexpected URL: '+url);
  };
  const verified=await verifyDiscordActivity({code:'oauth_code_1234',instanceId:ID, clientId:APP,clientSecret:'secret',botToken:'bot-secret',fetchImpl:goodFetch});
  assert.equal(verified.discordId,'112233445566778899');
  assert.equal(seen.length,3);
  assert.equal(seen[1].authorization,'Bearer sdk-access');
  assert.equal(seen[2].authorization,'Bot bot-secret');
  const badFetch=async (url, options) => {
    const v=await goodFetch(url,options);
    if (url.includes('activity-instances')) return {ok:true,json:async()=>({application_id:APP,instance_id:ID,users:['000000000000000000']})};
    return v;
  };
  await assert.rejects(verifyDiscordActivity({code:'oauth_code_1234',instanceId:ID,clientId:APP,clientSecret:'secret',botToken:'bot-secret',fetchImpl:badFetch}), /not a participant/i);
});

test('only the dedicated Activity hostname is an embedded request', () => {
  assert.equal(isActivityRequest({headers:{'x-forwarded-host':'activity.hexsettlers.org'}},true),true);
  assert.equal(isActivityRequest({headers:{'x-forwarded-host':'hexsettlers.org'}},true),false);
  assert.equal(isActivityRequest({headers:{host:'activity.hexsettlers.org'}},false),true);
});

test('Activity login cookie uses secure partitioning; normal site stays Strict', () => {
  assert.match(sessionCookie('t',{secure:true,embedded:true}), /SameSite=None;.*Secure; Partitioned/);
  assert.match(clearSessionCookie({secure:true,embedded:true}), /Max-Age=0; Secure; Partitioned/);
  assert.match(sessionCookie('t',{secure:true}), /SameSite=Strict/);
  assert.doesNotMatch(sessionCookie('t',{secure:true}), /Partitioned/);
  assert.match(sessionCookie('t',{secure:false,embedded:true}), /SameSite=Strict/);
});

test('Discord Activity instance room association survives state persistence', () => {
  const source={code:'ABCDEFGH',hostId:'host',players:[{id:'host'}],spectators:[],discordInstanceId:ID, rules:{playerCount:4}};
  const saved=serializeRoom(source);
  const restored=restoreRoom(saved,{playerCount:4});
  assert.equal(restored.discordInstanceId,ID);
  assert.equal(restored.visibility,'private');
});
