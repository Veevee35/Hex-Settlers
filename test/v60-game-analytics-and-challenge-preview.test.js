'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { GameAnalytics, modeForRoom, historySummary, dayId } = require('../server/game-analytics');
const root = path.join(__dirname, '..');
const text = file => fs.readFileSync(path.join(root, file),'utf8');

test('records distinct authenticated users, preserves five-minute concurrency peaks, and restores history', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(),'hex-analytics-test-'));
  try {
    const file = path.join(tmp,'game_analytics.json');
    const at = Date.parse('2026-11-09T20:10:00Z');
    const analytics = new GameAnalytics(file,{now:() => at});
    analytics.markUser('person-a',at);
    analytics.markUser('person-a',at);
    analytics.markUser('person-b',at);
    assert.equal(analytics.capture({ onlineAccounts:2, activeGames:1 },at),true);
    assert.equal(analytics.capture({ onlineAccounts:5, activeGames:3 },at+50_000),false);
    assert.equal(analytics.capture({ onlineAccounts:3, activeGames:2 },at+5*60_000),true);
    await analytics.save(); await analytics.flush();
    const restored = new GameAnalytics(file,{now:() => at+10*60_000});
    assert.equal(restored.samples.length,2);
    assert.equal(restored.samples[0].onlineAccounts,5);
    const report = restored.report({range:'day',at:at+10*60_000,live:{onlineAccounts:1,activeGames:1}});
    assert.equal(report.uniqueAccounts,2);
    assert.equal(report.peaks.onlineAccounts,5);
    assert.equal(report.peaks.activeGames,3);
    assert.equal(report.daily.find(d=>d.day === dayId(at)).activeUsers,2);
  } finally { fs.rmSync(tmp,{recursive:true,force:true}); }
});

test('groups completed game stats by challenge/mode and ignores invalid or incomplete history', () => {
  const t = Date.parse('2026-11-09T18:00:00Z');
  const good = (mode, id) => ({ id,roomCode:'ABCD',startedAt:t-120000,endedAt:t,turns:27,
    challenge:mode==='daily'?{kind:'daily'}:null,ranked:mode==='ranked',casual:false,
    rules:{mapMode:'classic'},players:[{id:'p1',name:'User',vp:12},{id:'p2',name:'User2',vp:10}],snapshot:{phase:'game-over'} });
  const result = historySummary([good('daily','a'), good('ranked','b'), {...good('ranked','c'),snapshot:{phase:'main'}}],t-300000,t+100000);
  assert.equal(result.completed,2); assert.equal(result.byMode.daily,1);assert.equal(result.byMode.ranked,1);
  assert.equal(result.averageMinutes,2);assert.equal(result.averageTurns,27);
  assert.equal(result.totalVictoryPoints,44);assert.equal(result.uniqueParticipants,2);
  assert.deepEqual(modeForRoom({challenge:{kind:'daily'}}),'daily');
  assert.deepEqual(modeForRoom({challenge:{kind:'weekly'}}),'weekly');
});

test('the fog challenge catalog masks tiles and the client never draws numbers on fog', () => {
  const server = text('server.js'), app = text('public/app.js');
  assert.match(server,/type: tile\.fog && !tile\.revealed \? 'unexplored' : String\(tile\.type \|\| 'sea'\)/);
  assert.match(server,/number: tile\.fog && !tile\.revealed \? null/);
  assert.match(app,/const faceDown = tile\.fog === true \|\| tile\.type === 'unexplored'/);
  assert.match(app,/if \(!faceDown && scale >= 14/);
});

test('dedicated admin Game Stats page uses authenticated admin-only reporting and R2 persistence', () => {
  const server=text('server.js'),app=text('public/app.js'),html=text('public/index.html'),css=text('public/unified-theme.css');
  assert.match(server,/if \(urlPath === '\/api\/admin\/game-stats'\)/);
  assert.match(server,/requestIsAdminHostname\(req\)/);
  assert.match(app,/\['stats', 'Game Stats'\]/);
  assert.match(app,/adminApi\('game-stats'/);
  assert.match(app,/selectTab\('stats'\)/);
  for (const file of ['cloudflare/bootstrap.mjs','cloudflare/container-worker.mjs','cloudflare/state-sync.js'])
    assert.match(text(file),/game_analytics\.json/);
  assert.match(html,/class="journeyHeading"/);
  assert.match(css,/#journeyScreen\.challengeWideLayout \.journeyLogo/);
  assert.match(css,/#journeyScreen\.challengeWideLayout \.journeyHeading \.portalLead/);
});
