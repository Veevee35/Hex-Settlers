'use strict';

// Pure validation for administrator game-history import/export. Never accept
// account records or server configuration in a history upload.
const MAX_HISTORY_IMPORT_BYTES = 64 * 1024 * 1024;
const HISTORY_EXPORT_FORMAT = 'hex-settlers-history-v1';

function validatedImportedHistory(document, isValidEntry, packEntry, maxGames) {
  if (!document || typeof document !== 'object' || Array.isArray(document) || document.format !== HISTORY_EXPORT_FORMAT || !Array.isArray(document.games)) {
    throw new Error('This is not a Hex Settlers game-history backup.');
  }
  if (document.games.length > maxGames) throw new Error(`A backup may contain no more than ${maxGames} games.`);
  const ids = new Set();
  const games = [];
  for (const entry of document.games) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) || !isValidEntry(entry)) {
      throw new Error('The backup contains an invalid or unfinished game. No games were imported.');
    }
    const id = String(entry.id || '');
    if (!/^[a-zA-Z0-9_-]{8,100}$/.test(id) || ids.has(id)) {
      throw new Error('Backup games must have distinct valid IDs. No games were imported.');
    }
    ids.add(id);
    if (!Number.isFinite(Number(entry.endedAt)) || Number(entry.endedAt) <= 0) {
      throw new Error('A backup game is missing its completion time.');
    }
    // Snapshot and replay are preserved, but never trust a malformed packed JSON
    // blob that would fail only later when a player opens the replay.
    if (entry.logJson !== undefined && (typeof entry.logJson !== 'string' || !Array.isArray(JSON.parse(entry.logJson)))) {
      throw new Error('A backup contains an invalid game log.');
    }
    if (entry.replayJson !== undefined && (typeof entry.replayJson !== 'string' || JSON.parse(entry.replayJson) === undefined)) {
      throw new Error('A backup contains an invalid replay.');
    }
    games.push(packEntry(entry));
  }
  return games;
}

function mergeHistory(existing, incoming, maxGames) {
  const ids = new Set(existing.map(game => game.id));
  const added = incoming.filter(game => !ids.has(game.id));
  if (existing.length + added.length > maxGames) {
    throw new Error(`Import would exceed the ${maxGames}-game retention limit. Delete old games before importing.`);
  }
  return { games: [...existing, ...added].sort((a, b) => Number(a.endedAt || 0) - Number(b.endedAt || 0)), added: added.length, skipped: incoming.length - added.length };
}

module.exports = { MAX_HISTORY_IMPORT_BYTES, HISTORY_EXPORT_FORMAT, mergeHistory, validatedImportedHistory };
