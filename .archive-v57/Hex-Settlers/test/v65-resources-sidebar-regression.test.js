'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const client = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
const start = client.indexOf('  function renderResources() {');
const end = client.indexOf('  function renderDevCards() {', start);
assert(start >= 0 && end > start, 'resource renderer must exist');
const renderSource = client.slice(start, end);

class MiniElement {
  constructor(tag = 'div') {
    this.tag = tag;
    this.children = [];
    this.attributes = {};
    this.style = {};
    this.className = '';
    this.classList = { add: cls => { this.className += ` ${cls}`; } };
    this._html = '';
    this._text = '';
  }
  appendChild(child) { this.children.push(child); return child; }
  prepend(child) { this.children.unshift(child); return child; }
  setAttribute(key, val) { this.attributes[key] = String(val); }
  addEventListener() {}
  set innerHTML(value) { this._html = String(value); this.children = []; }
  get innerHTML() { return this._html; }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map(c => c.textContent).join(''); }
}
const traverse = (node, predicate) => [node, ...node.children.flatMap(c => traverse(c, predicate))].filter(predicate);
const byClass = (node, name) => traverse(node, n => n.className.split(/\s+/).includes(name));
function sampleState() {
  return {
    rules: { mapMode: 'classic' }, turnOrder: ['me','ai','ai2','ai3'], currentPlayerId: 'me',
    players: [
      { id: 'me', name: 'You', color: '#e34f4f', resources: { brick: 2, lumber: 1, wool: 3, grain: 0, ore: 4 }, devCards: ['knight'], army: 1, vp: 4, longestRoadLen: 3 },
      { id: 'ai', name: 'Opponent AI', color: '#2678db', handCount: 7, devCount: 2, army: 3, vp: 6, longestRoadLen: 5 },
      { id: 'ai2', name: 'Second AI', color: '#17ad6e', handCount: 3, devCount: 0, army: 0, vp: 2, longestRoadLen: 1 },
      { id: 'ai3', name: 'Third AI', color: '#e3ba36', handCount: 9, devCount: 1, army: 2, vp: 5, longestRoadLen: 4 },
    ],
    bank: { brick: 17, lumber: 18, wool: 16, grain: 19, ore: 15 },
    geom: { edges: [], nodes: [] },
  };
}
function runRenderer(state, { spectator = false, selected = null, onlySummary = false } = {}) {
  const resourcesBox = new MiniElement('section');
  const bankDock = onlySummary ? null : new MiniElement('section');
  const context = {
    document: { createElement: tag => new MiniElement(tag) },
    ui: { resourcesBox, rightSidebarResourcesBody: bankDock },
    state,
    historyReplay: {active: false},
    myPlayerId: 'me',
    colorblindMode: false,
    getTextureAssetUrl: name => `/textures/${name}`,
    playerColorIndex: () => 0,
    STRUCT_IMG_SRC: ['pieces.png'],
    resolveLegacyTextureUrl: x => x,
    tokenBgPosPct: () => ({x: 0, y: 0}),
    amRoomSpectator: () => spectator,
    resourcePanelPlayer: () => selected ? state.players.find(p => p.id === selected) : (spectator ? null : state.players[0]),
  };
  vm.createContext(context);
  vm.runInContext(`${renderSource}\nrenderResources();`, context);
  return { resourcesBox, bankDock };
}

test('desktop renderer shows all players, personal resource icons, and bank inventory', () => {
  const {resourcesBox, bankDock} = runRenderer(sampleState());
  assert.equal(byClass(resourcesBox, 'resSummaryRow').length, 4);
  assert.match(resourcesBox.textContent, /You \(you\)/);
  assert.match(resourcesBox.textContent, /Opponent AI/);
  assert.match(resourcesBox.textContent, /Second AI/);
  assert.match(resourcesBox.textContent, /Third AI/);
  assert.match(resourcesBox.textContent, /CARDS: 10/);
  assert.match(resourcesBox.textContent, /CARDS: 7/);
  assert.match(resourcesBox.textContent, /VP 6/);
  assert.equal(byClass(bankDock, 'rightSidebarBankRow').length, 1);
  assert.equal(byClass(bankDock, 'rightSidebarPlayerRow').length, 1);
  assert.equal(byClass(bankDock, 'resIcon').length, 10, '5 bank icons and 5 player-hand icons');
  assert.equal(byClass(bankDock, 'pieceCell').length, 4, 'road, ship, settlement, and city counts');
  assert.match(bankDock.textContent, /Bank Resources/);
  assert.deepEqual(byClass(bankDock, 'rightSidebarBankRow')[0].children[1].children.map(cell => cell.children[1].textContent), ['17','18','16','19','15']);
  assert.deepEqual(byClass(bankDock, 'rightSidebarPlayerRow')[0].children[1].children.map(cell => cell.children[1].textContent), ['2','1','3','0','4']);
  assert.match(bankDock.innerHTML + byClass(bankDock, 'rightSidebarMeta')[0].innerHTML, /CARDS: 10/);
});

test('spectator still sees public player and bank stats without private cards', () => {
  const {resourcesBox, bankDock} = runRenderer(sampleState(), {spectator:true});
  assert.equal(byClass(resourcesBox, 'resSummaryRow').length, 4);
  assert.equal(byClass(bankDock, 'rightSidebarBankRow').length, 1);
  assert.equal(byClass(bankDock, 'rightSidebarPlayerRow').length, 0);
  assert.equal(byClass(bankDock, 'resIcon').length, 5);
  assert.match(bankDock.textContent, /private hand details stay hidden/);
});

test('spectator viewing an authorized player hand sees all hand details', () => {
  const {bankDock} = runRenderer(sampleState(), {spectator:true,selected:'me'});
  assert.equal(byClass(bankDock, 'resIcon').length, 10);
  assert.match(bankDock.textContent, /VIEWING: You/);
});

test('same resource data populates mobile dock and player tab (without assuming desktop DOM)', () => {
  const {resourcesBox, bankDock} = runRenderer(sampleState());
  assert.equal(byClass(resourcesBox, 'resSummaryRow').length, 4);
  assert.equal(byClass(bankDock, 'resCell').length, 10);
  assert.equal(byClass(bankDock, 'pieceCell').length, 4);
  const css = fs.readFileSync(path.join(__dirname, '../public/styles.css'), 'utf8');
  assert.match(css, /\.mobilePinnedResources/);
  assert.match(client, /mobilePinnedResources\.appendChild\(anchor\)/);
  assert.match(client, /rightSidebarInner\.insertBefore\(ui\.resourcesCard/);
});

test('live player rosters never refer to a nonexistent roleLabel variable', () => {
  assert.doesNotMatch(renderSource, /\broleLabel\b/);
  const popupRoster = client.slice(client.indexOf('const copySpectatorLink = '), client.indexOf('function appendMemberRow(p, roleLabel)'));
  assert.doesNotMatch(popupRoster, /\broleLabel\b/);
  assert.match(client, /function appendMemberRow\(p, roleLabel\)/);
});
