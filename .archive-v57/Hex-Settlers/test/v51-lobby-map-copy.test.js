'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..', 'public');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

test('timer and exploration switch complete setup positions without removing controls', () => {
  const ids = [
    'id="scenarioRow"', 'id="timerSpeedSelect"', 'id="testBuilderRow"',
    'id="victoryPointsSelect"', 'id="randomMapAtStartToggle"',
    'id="explorationPointsRow"', 'id="regenMapBtn"'
  ];
  let at = -1;
  for (const id of ids) { const next = html.indexOf(id); assert.ok(next > at, `Missing or misplaced ${id}`); at = next; }
  assert.match(html, /id="explorationPointsRow"[\s\S]*?id="explorationPointsToggle"[\s\S]*?Awards scenario exploration points/);
});

test('desktop map preview toggle is preserved and isolates browser lobby columns from the mobile map drawer', () => {
  assert.match(html, /id="desktopLobbyMapToggle"[\s\S]*?Hide Map/);
  assert.match(html, /id="lobbyBoardPreview" class="boardWrap"/);
  assert.match(css, /@media\(min-width:981px\) and \(pointer:fine\)/);
  assert.match(css, /desktopLobbyMapHidden[\s\S]*?grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /desktopLobbyMapHidden[\s\S]*?\.layout>\.boardWrap\{display:none!important/);
  assert.match(app, /desktopLobbyMapVisible = localStorage\.getItem\(DESKTOP_LOBBY_MAP_KEY\) !== 'false'/);
  assert.match(app, /desktopLobbyMapToggle'\)\?\.addEventListener\('click'/);
  assert.match(html, /id="mobileLobbyMapToggle"/);
  assert.match(html, /id="mobileLobbyMapClose"/);
});

test('room code and join link are keyboard accessible click-to-copy buttons', () => {
  assert.match(html, /<button id="roomCode"[\s\S]*?type="button"[\s\S]*?disabled>----<\/button>/);
  assert.match(html, /<button id="roomJoinLinkInput"[\s\S]*?type="button"[\s\S]*?disabled>Direct join link<\/button>/);
  assert.doesNotMatch(html, /id="copyJoinLinkBtn"/);
  assert.ok((html.match(/<div class="copyHint[^>]*>Click to copy<\/div>/g)||[]).length >= 2);
  assert.match(app, /ui\.roomCode\?\.addEventListener\('click',[\s\S]*?copyText\(code\)/);
  assert.match(app, /ui\.roomJoinLinkInput\?\.addEventListener\('click',[\s\S]*?copyText\(link\)/);
});
