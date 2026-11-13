'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {clientType, recordClientDay, clientReport} = require('../server/client-analytics');
const root=path.join(__dirname,'..');
const file=p=>fs.readFileSync(path.join(root,p),'utf8');
test('Discord only when authenticated dedicated Activity request; mobile/desktop otherwise',()=>{
  assert.equal(clientType({headers:{'user-agent':'Mozilla/5.0 (Windows NT 10.0)'}}), 'browser');
  assert.equal(clientType({headers:{'user-agent':'Mozilla/5.0 (iPhone; CPU iPhone OS 18)'}}), 'mobile');
  assert.equal(clientType({headers:{'sec-ch-ua-mobile':'?1'}}), 'mobile');
  assert.equal(clientType({headers:{}},{activity:true}), 'discord');
  assert.equal(clientType({headers:{'user-agent':'Discord/1.0'}}), 'browser');
});
test('per-user client-day tracking deduplicates, prunes and counts across platforms',()=>{
  const at=Date.parse('2026-11-11T12:00:00Z');
  const alice={id:'a'};const bob={id:'b'};
  assert.equal(recordClientDay(alice,'browser',at),true);
  assert.equal(recordClientDay(alice,'browser',at),false);
  assert.equal(recordClientDay(alice,'discord',at),true);
  assert.equal(recordClientDay(bob,'mobile',at),true);
  assert.equal(recordClientDay(bob,'unknown',at),false);
  const sessions=new Map([
    ['a',new Set([{_clientType:'browser',readyState:1},{_clientType:'discord',readyState:1}])],
    ['b',new Set([{_clientType:'mobile',readyState:1},{_clientType:'mobile',readyState:0}])]
  ]);
  const report=clientReport([alice,bob],sessions,at,'week');
  assert.deepEqual(report.uniqueAccounts,{browser:1,discord:1,mobile:1});
  assert.equal(report.totalUniqueAccounts,2);
  assert.equal(report.live.browser.accounts,1);
  assert.equal(report.live.discord.connections,1);
  assert.equal(report.live.mobile.connections,1);
  assert.deepEqual(report.daily.at(-1),{day:'2026-11-11',browser:1,discord:1,mobile:1,totalAccounts:2});
  assert.equal(recordClientDay(alice,'mobile',at+91*86400000),true);
  assert.deepEqual(alice.clientDays.browser,[]);
});
test('admin-only client analytics endpoint and UI tab are wired',()=>{
  const server=file('server.js'), app=file('public/app.js');
  assert.match(server,/handleAdminHttp\(req, res, urlPath\)/);
  assert.match(server,/urlPath === '\/api\/admin\/client-stats'/);
  assert.match(server,/clientReport\(USERS_DB\.users/);
  assert.match(server,/handleDiscordActivityAutoLogin/);
  assert.match(server,/findUserByOAuth\('discord', discord\.discordId\)/);
  assert.match(server,/isAdminUser\(user\)/);
  assert.match(app,/\['clients', 'Client Analytics'\]/);
  assert.match(app,/adminApi\('client-stats'/);
});
test('PWA install resources, mobile action, and prebuilt Activity bundle are present',()=>{
  const html=file('public/index.html');
  const manifest=JSON.parse(file('public/manifest.webmanifest'));
  assert.equal(manifest.display,'standalone');
  assert.ok(manifest.icons.some(icon=>icon.sizes==='512x512'));
  assert.ok(fs.statSync(path.join(root,'public/icons/icon-512.png')).size>0);
  assert.match(html,/id="installGameApp"/);
  assert.match(html,/href="\/manifest.webmanifest"/);
  assert.match(file('public/install-app.js'),/beforeinstallprompt/);
  assert.match(file('client/discord-activity.mjs'),/\/api\/discord\/activity\/auto-login/);
  assert.ok(fs.statSync(path.join(root,'public/discord-activity.bundle.js')).size>10000);
});
