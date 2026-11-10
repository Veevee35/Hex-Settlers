'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(root,'server.js'),'utf8');
const app = fs.readFileSync(path.join(root,'public/app.js'),'utf8');
const css = fs.readFileSync(path.join(root,'public/styles.css'),'utf8');
const html = fs.readFileSync(path.join(root,'public/index.html'),'utf8');
const loader = fs.readFileSync(path.join(root,'public/boot-preload.js'),'utf8');
const { challengeRules } = require('../server/challenge-maps');
const { rulesHideOuterSeaBorder } = require('../server/pirate-rules');

test('challenge previews use live-game tile visibility rather than trimming by player count', () => {
  assert.match(server, /const rules = challengeRules\(playerCount, familyForPeriod\(kind, periodId\)\)/);
  assert.match(server, /const trimOuterSea = rulesHideOuterSeaBorder\(rules\)/);
  assert.match(server, /Array\.isArray\(geom\.tileNeighbors\?\.\[tile\.id\]\)/);
  assert.match(server, /const preview = \(geom\.tiles \|\| \[\]\)\.filter\(tile => !isHiddenOuterSea\(tile\)\)/);
  assert.match(app, /function shouldHideOuterSeaBorderTileClient\(t\)/);
  for (const count of [4,5,6,7,8]) {
    for (const family of ['classic','scattered','islands','desert','fog']) {
      const rules = challengeRules(count, family);
      const expected = count < 7 && ['islands','desert','fog'].includes(family);
      assert.equal(rulesHideOuterSeaBorder(rules), expected, `${family}, ${count} players`);
    }
  }
});

test('4–8 player live board and challenge thumbnails show identical sea tile IDs', () => {
  // Execute the exact live client visibility predicate, not a reimplementation.
  const from = app.indexOf('  function shouldHideOuterSeaBorderTileClient(t)');
  const to = app.indexOf('  function edgeAdjTilesAfterOuterSeaTrimClient(', from);
  assert.ok(from > 0 && to > from);
  for (const count of [4,5,6,7,8]) for (const family of ['classic','scattered','islands','desert','fog']) {
    const rules = challengeRules(count, family);
    const sea = { id:0, type:'sea' };
    const land = { id:1, type:'forest' };
    const fog = { id:2, type:'unexplored', fog:true, revealed:false };
    const tileNeighbors = {0:[1,2,3,4,5],1:[0,2,3],2:[0,1,3]};
    const runtime = vm.createContext({ state:{rules,geom:{tileNeighbors}} });
    vm.runInContext(app.slice(from, to), runtime);
    for (const tile of [sea,land,fog]) {
      const inGame = !vm.runInContext('shouldHideOuterSeaBorderTileClient(tile)',
        vm.createContext({...runtime,tile}));
      const inCatalog = !(rulesHideOuterSeaBorder(rules) && tile.type==='sea' &&
        tileNeighbors[tile.id].length < 6);
      assert.equal(inGame, inCatalog, `${family} ${count} players tile ${tile.id}`);
    }
  }
});

test('preview map and in-game map share a deterministic geometry and port source', () => {
  assert.match(server, /const geom = challengeGeom\(challenge\)/);
  assert.match(server, /room\.preview = \{ key, geom: room\.challenge \? challengeGeom\(room\.challenge\)/);
  assert.match(server, /game\.geom = geom;/);
  assert.match(app, /drawRankedMiniMap\(board, map\.preview, \{ gameArtwork: true, ports: map\.ports \|\| \[\] \}\)/);
  assert.match(server, /const ports = \(geom\.ports \|\| \[\]\)\.map\(port =>/);
});

test('drag handles preserve every resource, bank, and dev-card detail in scrollable panes', () => {
  assert.match(app, /function renderResources\(\)/);
  for (const term of ['resSummaryName','resSummaryStats','resSummaryRoad','resSummaryVp','rightSidebarBankRow','rightSidebarPlayerRow','rightSidebarPieceStrip','rightSidebarNote']) {
    assert.ok(app.includes(term), `resource detail ${term} is still rendered`);
  }
  assert.match(app, /function renderDevCards\(\)/);
  assert.match(css, /#resourcesCard \.resSummaryRow \{[\s\S]*?display:flex!important/);
  assert.match(css, /#resourcesCard > \.panelScaleContent \{[\s\S]*?overflow-y:auto!important/);
  assert.match(css, /#devCard > \.panelScaleContent \{[\s\S]*?overflow-y:auto!important/);
  assert.match(css, /#rightSidebarResourcesDock \{[\s\S]*?overflow-y:auto!important/);
  assert.match(app, /const SIDEBAR_SPLIT_KEY = 'hexsettlers_sidebar_sections_v62'/);
});

test('startup gate downloads real images and audio and waits for the game renderer', async () => {
  assert.match(html, /id="gameBootLoader"/);
  assert.ok(html.indexOf('boot-preload.js') < html.indexOf('app.js'));
  assert.match(app, /window\.dispatchEvent\(new Event\('hexsettlers:game-images-ready'\)\)/);
  assert.match(loader, /const percent = assetsReady && appReady && failures === 0 \? 100/);
  assert.match(loader, /retainedImages\.push\(img\)/);
  assert.match(loader, /audioNames\.map\(name =>/);
  assert.match(loader, /const textureBase = packId === 'simplified'/);
  assert.match(loader, /escapeBtn\?\.addEventListener\('click', close\)/);
  const elements = {};
  for (const id of ['gameBootLoader','gameBootProgressTrack','gameBootProgressFill','gameBootProgressValue','gameBootStatus','gameBootDetail','gameBootContinue']) {
    elements[id] = { style: {}, hidden: true, textContent:'', classList:{add(){},remove(){}}, setAttribute(){}, remove(){this.removed = true}, addEventListener(){}};
  }
  const listeners = {};
  const urls = [];
  const pending = [];
  class Img {
    set src(url) { urls.push(url); pending.push(() => this.onload?.()); }
  }
  const fakeWindow = { addEventListener(name, fn){listeners[name] = fn} };
  const body = {classList:{add(){}, remove(){}}};
  const doc = {body,getElementById:id=>elements[id]};
  const fakeTimers = [];
  const sandbox = { Image:Img,window:fakeWindow,document:doc,location:{hostname:'localhost'},
    localStorage:{getItem(){return null}},setTimeout(fn){fakeTimers.push(fn);return fakeTimers.length},clearTimeout(){},
    fetch:async url=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(0)}), AbortController, console };
  vm.runInNewContext(loader, sandbox);
  assert.ok(urls.length > 0, 'download began');
  for (let i = 0; i < 100 && (pending.length || (elements.gameBootProgressValue.textContent !== '95%'));i++) {
    while (pending.length) pending.shift()();
    await new Promise(resolve=>setImmediate(resolve));
  }
  assert.equal(elements.gameBootProgressValue.textContent,'95%', 'never claims 100% before app is ready');
  listeners['hexsettlers:game-images-ready']();
  assert.equal(elements.gameBootProgressValue.textContent,'100%');
  assert.equal(fakeWindow.hexSettlersBootLoadImage, undefined, 'boot cache is retired so texture changes load fresh images');
  assert.equal(elements.gameBootLoader.removed,undefined, 'fade out before removal');
  assert.ok(urls.some(url=>url.includes('Resource%20Hexes/Seas.png')));
  assert.ok(urls.some(url=>url.includes('Tokens/tokens_red.png')));
});
