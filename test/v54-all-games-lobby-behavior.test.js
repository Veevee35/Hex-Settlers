'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { parseClientMessage } = require('../server/protocol');
const { serializeRoom, restoreRoom } = require('../server/active-rooms');
const root = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'),'utf8');
const app = fs.readFileSync(path.join(root, 'public/app.js'),'utf8');
const html = fs.readFileSync(path.join(root, 'public/index.html'),'utf8');
function extract(name, next) {
  const start = server.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing ${name}`);
  const end = server.indexOf(`\nfunction ${next}(`, start);
  assert.ok(end > start, `missing boundary ${next}`);
  return server.slice(start, end);
}

test('public lobby listing recognizes new protocol, rejects Casual and private matches', () => {
  for (const type of ['list_public_lobbies','set_lobby_access','set_room_boss']) {
    const msg = {type};
    assert.deepEqual(parseClientMessage(JSON.stringify(msg)), {ok:true, value:msg});
  }
  const records = [
    {code:'PUB1',visibility:'public',ranked:false,casual:false,game:{phase:'lobby'},players:[{id:'h',name:'Public Host'}],rules:{},createdAt:1},
    {code:'CAS1',visibility:'public',ranked:false,casual:true,game:{phase:'lobby'},players:[{id:'h',name:'Casual Host'}],rules:{},createdAt:2},
    {code:'PRI1',visibility:'private',ranked:false,casual:false,game:{phase:'lobby'},players:[{id:'h',name:'Private Host'}],rules:{},createdAt:3},
    {code:'RUN1',visibility:'public',ranked:false,casual:false,game:{phase:'play'},players:[{id:'h',name:'Playing Host'}],rules:{},createdAt:4},
    {code:'FRI1',visibility:'public',ranked:false,casual:false,friendsOnly:true,game:{phase:'lobby'},players:[{id:'h',name:'Friends Host'}],rules:{},createdAt:5},
  ];
  const ctx = {rooms:new Map(records.map(r => [r.code,r])), canAccessRoom:(r,uid) => !r.friendsOnly || uid === 'friend', maxPlayersForRules:()=>6, DEFAULT_RULES:{}};
  vm.runInNewContext(extract('visiblePublicLobbies','isRoomBoss'),ctx);
  assert.deepEqual(Array.from(ctx.visiblePublicLobbies('stranger')).map(r=>r.code),['PUB1']);
  assert.deepEqual(Array.from(ctx.visiblePublicLobbies('friend')).map(r=>r.code),['FRI1','PUB1']);
});

test('timed nonranked games pause on disconnected turn starts including extra turns; timer Off and ranked do not', () => {
  const logged=[];
  const ctx={
    WebSocket:{OPEN:1}, playerById:(g,id)=>g.players.find(p=>p.id===id),
    pauseGame:g=>{g.paused=true;logged.push('pause');}, pushLog:()=>{}, playerName:()=> 'Player',
  };
  vm.runInNewContext(extract('maybePauseDisconnectedTurn','joinRoom'),ctx);
  function makeRoom(){return {ranked:false, game:{phase:'play',paused:false,currentPlayerId:'p1',turnNumber:1,rules:{playTurnMs:30000},players:[{id:'p1',isAI:false}]}, sockets:new Map()};}
  const room=makeRoom();
  assert.equal(ctx.maybePauseDisconnectedTurn(room),true);
  assert.equal(room.game.paused,true);
  assert.equal(logged.length,1);
  room.game.paused=false;
  assert.equal(ctx.maybePauseDisconnectedTurn(room),false,'should only inspect turn at its beginning');
  room.game.turnNumber=2;
  room.sockets.set('p1',{readyState:1});
  assert.equal(ctx.maybePauseDisconnectedTurn(room),false,'connected player turn');
  room.sockets.delete('p1');
  room.game.paired={stage:'extra'};
  assert.equal(ctx.maybePauseDisconnectedTurn(room),true,'extra turn has its own connection check');
  const off=makeRoom(); off.game.rules.playTurnMs=0;
  assert.equal(ctx.maybePauseDisconnectedTurn(off),false);
  const ranked=makeRoom(); ranked.ranked=true;
  assert.equal(ctx.maybePauseDisconnectedTurn(ranked),false);
});

test('host succession chooses oldest remaining human, and delegated boss permissions persist',()=>{
  const ctx={};
  vm.runInNewContext(extract('seniorLobbyPlayer','maybePauseDisconnectedTurn'),ctx);
  const room={code:'ABCD',hostId:'owner',players:[
    {id:'owner',joinedAt:1}, {id:'new',joinedAt:3}, {id:'ai',joinedAt:0,isAI:true}, {id:'senior',joinedAt:2}
  ], spectators:[],bossIds:['new','wrong'],rules:{},sockets:new Map()};
  assert.equal(ctx.seniorLobbyPlayer(room,'owner').id,'senior');
  assert.equal(ctx.seniorLobbyPlayer(room,'new').id,'owner');
  const result=restoreRoom(serializeRoom(room),{});
  assert.ok(result);
  assert.deepEqual(result.bossIds,['new']);
});

test('All Games settings, host delegation, lobby leave, and fixed lobby access have connected UI',()=>{
  for (const id of ['journeyRankedBtn','journeyCasualBtn','journeySettingsBtn','journeySettingsPanel','sandboxResetBtn','leaveLobbyTopBtn','lobbyFriendsOnlyToggle']) {
    assert.ok(html.includes(`id="${id}"`),id);
  }
  assert.doesNotMatch(html,/id="lobbyVisibilitySelect"/);
  assert.match(app,/\('unrankedModeBtn'\)\?\.addEventListener\('click', \(\) => choosePlayMode\('journey'\)\)/);
  assert.match(html, /id="journeyTitle">All Games</);
  assert.match(app,/casual\.querySelector\('strong'\)\.textContent = 'Casual Play'/);
  assert.match(app,/send\(\{ type: 'leave_room', switchMode: mode \}\)/);
  assert.match(app,/settingsSandboxActive/);
  assert.match(app,/send\(\{ type: 'set_room_boss', userId: profile\.id, enabled: !alreadyBoss \}\)/);
  assert.match(server,/room\.friendsOnly = msg\.friendsOnly === true/);
  assert.doesNotMatch(server,/room\.visibility = msg\.visibility === 'public' \? 'public' : 'private';\s*room\.friendsOnly = msg\.friendsOnly/);
});
