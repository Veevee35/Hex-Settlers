'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const read = p => fs.readFileSync(path.join(root,p), 'utf8');
const server = read('server.js'), app = read('public/app.js'), html = read('public/index.html');
const worker = read('cloudflare/container-worker.mjs');
const { applyBuild, displayVersion } = require('../server/build-version');
const { restoreRoom, serializeRoom } = require('../server/active-rooms');
const { DEFAULT_RULES } = require('../server/game-rules');

test('deployed revision increments once, rolls 99 to next minor and resets on major change', () => {
 const seed={major:1,minor:0,patch:5,lastBuiltMajor:1};
 const once=applyBuild(null,'revision1',seed); assert.equal(displayVersion(once),'V1.0.6');
 assert.deepEqual(applyBuild(once,'revision1',seed),once);
 assert.equal(displayVersion(applyBuild(once,'revision2',seed)),'V1.0.7');
 const roll=applyBuild({major:1,minor:3,patch:99,lastBuiltMajor:1,lastRevision:'previous'},'new',seed);
 assert.equal(displayVersion(roll),'V1.4.0');
 const major=applyBuild(roll,'another',{...seed,major:2,lastBuiltMajor:1});
 assert.equal(displayVersion(major),'V2.0.0');
});

test('Cloudflare R2 state whitelist permits build version and persists it across worker and Node',()=>{
 assert.match(worker,/const JSON_FILES = new Set\(\[[^\n]*'build-version.json'/);
 assert.match(read('cloudflare/state-sync.js'),/getVersionState/);
 assert.match(read('cloudflare/state-sync.js'),/persistVersionState/);
 assert.match(read('cloudflare/Dockerfile'),/COPY --chown=node:node build-version.json/);
 assert.match(read('scripts/stamp-git-build.cjs'),/public\/build-info.json/);
 assert.match(server,/registerSuccessfulBuild\(\)/);
 assert.match(server,/urlPath === '\/api\/build-version'/);
 assert.doesNotMatch(html, /class="appVersion"[^>]*>V\d+\.\d+\.\d+ · [a-f0-9]/);
});

test('privacy settings survive room serialization and old rooms default to private',()=>{
 const room={code:'ABC23',hostId:'u1',createdAt:1,players:[{id:'u1'}],spectators:[],rules:{mapMode:'classic'},visibility:'public',friendsOnly:true};
 const restored=restoreRoom(serializeRoom(room),DEFAULT_RULES);
 assert.equal(restored.visibility,'public'); assert.equal(restored.friendsOnly,true);
 const legacy=restoreRoom({...serializeRoom(room),visibility:undefined,friendsOnly:undefined},DEFAULT_RULES);
 assert.equal(legacy.visibility,'private'); assert.equal(legacy.friendsOnly,false);
});

test('public listing filters by friend access, and direct joining checks before spectator and seat allocation',()=>{
 assert.match(server,/function canAccessRoom\(room, userId\)/);
 assert.match(server,/host\.friendIds\.includes\(uid\)/);
 assert.match(server,/room\.visibility === 'public'[\s\S]{0,125}canAccessRoom\(room, userId\)/);
 const body=server.slice(server.indexOf('function joinRoom('), server.indexOf('function rejoinRoom('));
 assert.match(body,/if \(!canAccessRoom\(room, userId\)\) return \{ ok: false, error: 'Room not found\.' \}/);
 assert.match(server,/if \(msg\.type === 'set_lobby_access'\)/);
 assert.match(server,/if \(msg\.type === 'list_public_lobbies'\)/);
 assert.match(server,/if \(msg\.type === 'create_room'\)/);
});

test('casual supports friends and guests but never writes wins or game history',()=>{
 assert.doesNotMatch(server,/invitedRoom\.casual \|\| !senderInRoom/);
 assert.doesNotMatch(app,/if \(canInvite && !room\.casual\)/);
 assert.match(server,/if \(room\._dryRun \|\| room\.casual\) return; \/\/ Casual never enters lifetime game history/);
 assert.match(server,/if \(room\._dryRun \|\| room\.casual\) return; \/\/ No casual wins/);
 assert.match(server,/room\.casual && \(r\.customMap === true \|\| next\.mapMode === 'classic78'/);
 assert.match(app,/send\(\{ type: 'create_room', displayName, casual: selectedPlayMode === 'casual'/);
});

test('Journey portal, skippable 12-step tutorial, public/private lobby controls and 404 view exist',()=>{
 for(const id of ['journeyScreen','journeyPublicBtn','journeyPrivateBtn','journeyChallengeBtn','journeyHostPublicBtn','journeyHostPrivateBtn','journeyPrivateCode','publicLobbyList','walkthroughOverlay','walkthroughSkipBtn','roomNotFoundScreen','roomNotFoundBackBtn','lobbyFriendsOnlyToggle']) {
  assert.ok(html.includes(`id="${id}"`), `Missing UI #${id}`);
 }
 assert.doesNotMatch(html,/id="lobbyVisibilitySelect"/);
 assert.match(html,/id="journeyChallengeBtn"[^>]*disabled/);
 assert.match(app,/const tutorialSteps = \[/);
 assert.match(app,/const TUTORIAL_PREFIX = 'hexsettlers_journey_walkthrough_v53_'/);
 assert.match(app,/choosePlayMode\('journey'\)/);
 assert.match(app,/showRoomNotFound\(\)/);
});

test('changing player count preserves same Seafarers scenario family and resets overrides',()=>{
 const start = app.indexOf('  function scenarioForResizedBoard(');
 const end = app.indexOf('  let lastSetupPlayerCount',start);
 assert.ok(start > 0 && end > start);
 const ctx=vm.createContext({});
 vm.runInContext(app.slice(start,end),ctx);
 const f=(scenario,mode)=>vm.runInContext(`scenarioForResizedBoard(${JSON.stringify(scenario)},${JSON.stringify(mode)})`,ctx);
 assert.equal(f('fog_island','seafarers56'),'fog_island_56');
 assert.equal(f('fog_island_56','seafarers78'),'fog_island_78');
 assert.equal(f('scattered_tiles_78','seafarers78'),'scattered_tiles_78');
 assert.equal(f('through_the_desert_78','seafarers'),'through_the_desert');
 assert.equal(f('heading_for_new_shores','seafarers'),'heading_for_new_shores');
 assert.match(app,/mode !== oldMode \|\| playerCountChanged/);
 assert.match(app,/vpTouched = false; baseResourceCountTouched = false/);
});

test('all 29 non-English locales cover the new Journey/navigation labels',()=>{
 const context=vm.createContext({window:{}});
 vm.runInContext(read('public/locale-expansion.js'),context);
 const packs=context.window.HexSettlersLocaleExpansion;
 assert.equal(Object.keys(packs).length,29);
 for(const [lang,loc] of Object.entries(packs)) for(const key of ['Start Your Journey','Public lobbies','Private lobby','Challenge of the day','Lobby not found','Friends only — other players see Lobby not found, even with a code or link.']) {
  assert.ok(loc[key],`${lang} missing ${key}`);
 }
});

test('lobby discovery/access WebSocket messages are accepted by the server protocol', () => {
 const { parseClientMessage, CLIENT_MESSAGE_TYPES } = require('../server/protocol');
 for (const type of ['list_public_lobbies','set_lobby_access']) {
  assert.ok(CLIENT_MESSAGE_TYPES.includes(type));
  assert.equal(parseClientMessage(JSON.stringify({type, visibility:'public', friendsOnly:true})).ok,true);
 }
});
