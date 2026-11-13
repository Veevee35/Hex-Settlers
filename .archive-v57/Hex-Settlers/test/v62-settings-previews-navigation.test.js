'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/styles.css'), 'utf8');
const proto = require('../server/protocol');

test('tutorial is opt-in through Casual and no longer blocks other game modes on client or server', () => {
  assert.match(app, /showOptionalCasualTutorial\(\)/);
  assert.match(app, /Skip and play Casual/);
  assert.match(app, /btn\.disabled = false;/);
  assert.doesNotMatch(server, /Complete Start Your Adventure before (entering|joining|rejoining|playing)/);
  assert.doesNotMatch(server, /Finish Start Your Adventure to unlock Ranked/);
});

test('daily and weekly preview renderer shows artwork and port icons; fog stays masked', () => {
  assert.match(app, /drawRankedMiniMap\(board, map\.preview, \{ gameArtwork: true, ports: map\.ports \|\| \[\] \}\)/);
  assert.match(server, /const trimOuterSea = rulesHideOuterSeaBorder\(rules\)/);
  assert.match(server, /geom\.tileNeighbors\?\.\[tile\.id\]/);
  assert.match(server, /number: tile\.fog && !tile\.revealed \? null/);
  const start = app.indexOf('  // Canvas mini-maps normally use');
  const end = app.indexOf('\n  function renderRankedScenarioVote()', start);
  assert.ok(start > 0 && end > start);
  const source = app.slice(start,end);
  const loaded = [];
  const drawn = [];
  class FakeImage { set src(url) { this._src = url; loaded.push(url); } get src(){ return this._src; } }
  const ctx = {clearRect(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},
    save(){},restore(){},clip(){},stroke(){},fill(){},arc(){},fillText(){},
    drawImage(img){drawn.push(img.src);}};
  const context = vm.createContext({ Image: FakeImage, resolveLegacyTextureUrl:x=>x,
    TILE_IMG: { sea:'/sea.png', forest:'/forest.png', unexplored:'/fog.png' },
    NUM_TOKEN_IMG: { 5:'/five.png', 8:'/eight.png' },
    PORT_IMG: { generic:'/port.png' } });
  vm.runInContext(source,context);
  const tiles = [{x:0,y:0,type:'forest',fog:true,number:8}, {x:1.732,y:0,type:'forest',number:5},
    {x:3.464,y:0,type:'sea'}];
  const ports = [{x:4.3,y:0,edgeX:4,edgeY:0,kind:'generic'}];
  const canvas = {width:760,height:450,isConnected:true,getContext:()=>ctx};
  vm.runInContext('drawRankedMiniMap(canvas, tiles, {gameArtwork:true,ports})', vm.createContext({...context,canvas,tiles,ports}));
  assert.ok(loaded.includes('/fog.png'));
  assert.ok(loaded.includes('/port.png'));
  assert.ok(loaded.includes('/five.png'));
  assert.ok(!loaded.includes('/eight.png'));
});

test('Settings is a real Classic game canvas view with no room creation or playable actions', () => {
  assert.deepEqual(proto.parseClientMessage('{"type":"get_settings_preview"}'), {ok:true,value:{type:'get_settings_preview'}});
  assert.match(server,/if \(msg\.type === 'get_settings_preview'\)/);
  assert.match(server,/game\.geom = generatePreviewGeom\(demoRules, demoRoom\)/);
  assert.match(server,/game\.phase = 'main-actions'/);
  const scope = server.slice(server.indexOf("if (msg.type === 'get_settings_preview')"),server.indexOf("if (msg.type === 'get_challenge_maps')"));
  assert.doesNotMatch(scope,/createRoom\(/);
  assert.doesNotMatch(scope,/startGame\(/);
  assert.match(app,/if \(settingsSandboxActive\s*&& !\['client_ping','get_settings_preview'\]/);
  assert.match(app,/if \(settingsSandboxActive\) return false/);
  assert.match(app,/function endSettingsSandbox/);
  assert.match(css,/body\.settings-sandbox #journeySettingsPanel/);
});

test('spectators have no player color; discard shows icons; all right-panel boundaries are draggable and saved', () => {
  assert.match(server,/color: null,\s*joinedAt: now\(\),\s*isSpectator: true/);
  assert.match(server,/Object\.assign\(existingSpectator, member, \{ isSpectator: true, color: null \}\)/);
  assert.match(app,/spectatorNoColor/);
  assert.match(app,/discardResourceIcon/);
  assert.match(app,/getTextureAssetUrl\(`Ports\/\$\{k\}\.png`\)/);
  assert.match(app,/sidebarCuts = \[\.20, \.57, \.79\]/);
  assert.match(app,/sidebarSectionHandles\.length === 3/);
  assert.match(app,/SIDEBAR_SPLIT_KEY, JSON\.stringify\(sidebarCuts\)/);
  assert.match(app,/sidebarSectionHandles\.forEach\(\(handle, i\) => ui\.rightSidebarInner\.insertBefore/);
});
