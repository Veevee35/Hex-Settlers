'use strict';

const crypto = require('node:crypto');
const { SlidingWindowRateLimiter } = require('./security');

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_LENGTH = 10;

function randomRoomCode(length = ROOM_CODE_LENGTH) {
  let code = '';
  for (let index = 0; index < length; index++) code += ROOM_CODE_ALPHABET[crypto.randomInt(ROOM_CODE_ALPHABET.length)];
  return code;
}

function normalizedLoginKey(identifier) {
  const normalized = String(identifier || '').trim().toLowerCase().slice(0, 256);
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

function createAuthAttemptGuard({ ipAttempts = 12, ipWindowMs = 60_000, identityAttempts = 8, identityWindowMs = 15 * 60_000 } = {}) {
  const byIp = new SlidingWindowRateLimiter({ maxAttempts: ipAttempts, windowMs: ipWindowMs });
  const byIdentity = new SlidingWindowRateLimiter({ maxAttempts: identityAttempts, windowMs: identityWindowMs });
  return {
    consume(address, identifier = '') {
      const ip = byIp.consume(address);
      // A success NEVER clears a shared IP/identity window: a valid account
      // cannot be used to erase unsuccessful guesses against another account.
      const identity = identifier ? byIdentity.consume(normalizedLoginKey(identifier)) : { allowed: true, retryAfterMs: 0 };
      return { allowed: ip.allowed && identity.allowed, retryAfterMs: Math.max(ip.retryAfterMs, identity.retryAfterMs) };
    },
    cleanup() { byIp.cleanup(); byIdentity.cleanup(); },
  };
}

function mayViewFullHistory(entry, user) {
  if (!entry || !user) return false;
  if (user.isAdmin === true || user.role === 'admin') return true;
  if (entry.ranked === true || !!entry.challenge) return true;
  return Array.isArray(entry.players) && entry.players.some(player => player && String(player.id) === String(user.id));
}

function publicHistoryMetadata(games, user) {
  return games.map(game => {
    if (mayViewFullHistory(game, user)) return { ...game, canViewReplay: true };
    // Keep public rankings/history navigable but never disclose invite codes
    // or private player identifiers to people outside an unranked match.
    return { ...game, roomCode: null, canViewReplay: false };
  });
}

module.exports = { ROOM_CODE_LENGTH, randomRoomCode, createAuthAttemptGuard, mayViewFullHistory, publicHistoryMetadata };
