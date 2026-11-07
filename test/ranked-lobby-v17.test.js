'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const client = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public', 'styles.css'), 'utf8');

test('legacy history without a ranked flag counts toward Unranked and Combined, not Ranked', () => {
  const start = server.indexOf('function computeLeaderboardFromHistory() {');
  const end = server.indexOf('\nfunction ', start + 15);
  assert.ok(start > 0 && end > start);
  const user = { id: 'legacy_user', username: 'legacy', displayName: 'Legacy Player', rankedRating: 1000 };
  const history = (id, ranked) => ({ id, ranked, winnerId: user.id, players: [{ id: user.id }] });
  const ctx = {
    HISTORY_DB: { games: [history('before-split', null), history('unranked', false), history('ranked', true)] },
    USERS_DB: { users: [user] },
    isValidHistoryEntry: () => true,
    findUserById: (id) => id === user.id ? user : null,
    rankedRating: (n) => Number(n || 1000),
    unrankedRating: (n) => Number(n || 0),
    emptyLeaderboardAggregate: () => ({ gamesPlayed: 0, wins: 0, winPct: 0, avgVP: 0 }),
    addGameToLeaderboardAggregate: (entry) => { entry.gamesPlayed++; entry.wins++; },
    finalizedLeaderboardAggregate: (entry) => entry,
  };
  const rows = vm.runInNewContext(`${server.slice(start, end)}\ncomputeLeaderboardFromHistory();`, ctx);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].ranked.gamesPlayed, 1);
  assert.equal(rows[0].unranked.gamesPlayed, 2);
  assert.equal(rows[0].combined.gamesPlayed, 3);
});

test('ranked ballot is server timed for 30 seconds and permits revision/abstention', () => {
  assert.match(server, /: 30_000;/);
  assert.match(server, /createdAt: ballotCreatedAt/);
  assert.match(server, /endsAt: ballotCreatedAt \+ RANKED_SCENARIO_VOTE_MS/);
  assert.doesNotMatch(server, /activePlayerIds\.every\(\(id\) => ballot\.votes/);
  assert.match(server, /room\.rankedScenarioVote\.votes\[pid\] = optionId/);
  assert.match(client, /rankedScenarioCountdown/);
  assert.match(client, /drawRankedMiniMap\(preview, option\.preview\)/);
});

test('ranked lobby is full width and has a spectator invite, no ordinary lobby controls', () => {
  assert.match(css, /body\.ranked-lobby \.layout\{display:block/);
  assert.match(css, /body\.ranked-lobby \.layout>\.boardWrap\{display:none/);
  assert.match(css, /body\.ranked-lobby #createBtn\{display:none/);
  assert.match(html, /id="roomShareLabel"/);
  assert.match(client, /room\?\.ranked \? buildSpectatorJoinUrl\(code\) : buildDirectJoinUrl\(code\)/);
  assert.match(server, /const joinAsSpectator = !!room\.ranked/);
  assert.match(html, /id="rankedScenarioVote"/);
  assert.match(css, /rankedScenarioMapPreview/);
  assert.match(client, /serverNowMs\(\)/);
});
