'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
const styles = fs.readFileSync(path.join(__dirname, '../public/unified-theme.css'), 'utf8');
const challengeRender = source.slice(source.indexOf('  function renderChallengeMaps()'), source.indexOf('  function beginChallengeHost('));

test('Challenge Maps expands only this journey view to the browser width', () => {
  assert.match(source, /classList\.toggle\('challengeWideLayout', view === 'challenge'\)/);
  assert.match(styles, /#journeyScreen\.challengeWideLayout \.journeyCard\s*\{[^}]*width:\s*100%/);
  assert.match(styles, /#journeyScreen\.challengeWideLayout \.journeyCard\s*\{[^}]*max-width:\s*none/);
});

test('five scenario tabs show exactly one selected challenge, with accessible selection and arrow-key navigation', () => {
  assert.match(html, /id="challengeMapTabs"[^>]*role="tablist"/);
  assert.match(html, /id="challengeMapsList"[^>]*role="tabpanel"/);
  assert.match(challengeRender, /selectedChallengePlayerCount = count/);
  assert.match(challengeRender, /for \(const item of maps\)/);
  assert.match(challengeRender, /tab\.setAttribute\('role', 'tab'\)/);
  assert.match(challengeRender, /tab\.setAttribute\('aria-selected', selected \? 'true' : 'false'\)/);
  assert.match(challengeRender, /event\.key === 'ArrowRight'/);
  assert.match(challengeRender, /event\.key === 'ArrowLeft'/);
  assert.match(challengeRender, /card\.append\(head, content\);\s*host\.appendChild\(card\)/);
});

test('highlight uses the selected map official first-ranked player, not the current table sort', () => {
  assert.match(html, /id="challengeTopPlayer"[^>]*aria-live="polite"/);
  assert.match(challengeRender, /const champion = rows\[0\]/);
  assert.match(challengeRender, /String\(champion\.name \|\| 'Player'\)/);
  assert.match(challengeRender, /formatChallengeTime\(champion\.lowestTimeMs\)/);
  assert.match(challengeRender, /champion\.lowestTurns/);
  assert.match(challengeRender, /champion\.totalVP/);
  assert.match(challengeRender, /challengeLeaderboardSort\.get\(sortId\)/);
  assert.match(challengeRender, /line\.classList\.toggle\('challengeLeaderRow', rank === 1\)/);
});
