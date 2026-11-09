'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/styles.css'), 'utf8');
const app = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');

test('one reusable pre-lobby footer supplies legal links, live version and Ko-fi', () => {
  assert.equal((html.match(/id="preLobbyFooter"/g) || []).length, 1);
  const footer = html.match(/<footer id="preLobbyFooter"[\s\S]*?<\/footer>/)?.[0];
  assert.ok(footer);
  assert.match(footer, /data-legal-page="terms"/);
  assert.match(footer, /data-legal-page="privacy"/);
  assert.match(footer, /id="preLobbyVersion"/);
  assert.match(footer, /href="https:\/\/ko-fi.com\/L6D82A3L9Z"/);
  assert.match(css, /body:has\(\.portalScreen:not\(\.hidden\)\) \.preLobbyFooter/);
  assert.match(css, /body\.uncreated-lobby:not\(\.in-game\):not\(\.ranked-lobby\):has\(#app:not\(\.hidden\)\) \.preLobbyFooter/);
  assert.match(app, /const sharedVersion = \$\('preLobbyVersion'\)/);
  assert.match(app, /document\.querySelectorAll\('\.appVersion, \.preLobbyVersion'\)/);
});

test('all entry paths use the same logo, headings and contextual back navigation', () => {
  for (const id of ['rankedScreen', 'journeyScreen', 'roomNotFoundScreen', 'uncreatedLobbyIntro']) {
    const start = html.indexOf(`id="${id}"`);
    assert.ok(start >= 0, `screen ${id} missing`);
    assert.ok(html.slice(start, start + 650).includes('portalSectionLogo'), `${id} missing emblem`);
  }
  for (const title of ['All Games', 'Ranked Play', 'Public Lobbies', 'Private Lobby', 'Casual Play']) {
    assert.ok(html.includes(title) || app.includes(title), `Missing consistent title ${title}`);
  }
  for (const [view,back] of [['home','Back to Game Types'],['public','Back to All Games'],['detail','Back to Public Lobbies'],['private','Back to All Games'],['settings','Back to All Games']]) {
    assert.match(app, new RegExp(`${view}: \\[.*?${back}`));
  }
  assert.match(css, /\.portalBackdrop \{/);
  assert.match(css, /\.portalCard,\.walkthroughCard,\.rulesPageShell/);
});

test('in-game HUD layout remains independent from pre-lobby chrome', () => {
  assert.match(css, /\.preLobbyFooter \{[\s\S]*?display:none/);
  assert.match(css, /\.rightSidebar \{[\s\S]*?background:rgba\(8,23,34,\.88\)/);
  assert.match(css, /The same materials follow the player into lobby and game controls/);
  assert.doesNotMatch(html, /id="preLobbyFooter"[^>]*class="[^"]*portalScreen/);
});


test('shared footer remains accessible over account creation, walkthrough and pre-game rules', () => {
  assert.match(css, /body:not\(\.in-game\) \.preLobbyFooter \{ z-index:10010;/);
  assert.match(css, /body:not\(\.in-game\):has\(#walkthroughOverlay:not\(\.hidden\)\) \.preLobbyFooter/);
  assert.match(css, /body:not\(\.in-game\):has\(#rulesPage:not\(\.hidden\)\) \.preLobbyFooter/);
  assert.match(css, /body:has\(#legalOverlay:not\(\.hidden\)\) \.preLobbyFooter/);
});
