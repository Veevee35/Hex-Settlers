'use strict';

// A one-time, short-lived browser-to-Activity account approval flow. The
// external browser never sends an account's session token to Discord, and
// the Activity never receives an OAuth provider token.
const crypto = require('node:crypto');
const PAIR_TTL_MS = 10 * 60 * 1000;
const MAX_PAIRS = 1024;

function validPairId(id) {
  return typeof id === 'string' && /^[A-Za-z0-9_-]{24}$/.test(id);
}
function digest(value) { return crypto.createHash('sha256').update(value).digest(); }
function createPairingStore({ clock = Date.now, randomBytes = crypto.randomBytes } = {}) {
  const pairs = new Map();
  function cleanup() {
    const now = clock();
    for (const [id, entry] of pairs) if (entry.expiresAt <= now) pairs.delete(id);
  }
  function start() {
    cleanup();
    if (pairs.size >= MAX_PAIRS) return null;
    const pairId = randomBytes(18).toString('base64url');
    const secret = randomBytes(32).toString('base64url');
    pairs.set(pairId, { secretHash: digest(secret), expiresAt: clock() + PAIR_TTL_MS,
      approvedUserId: '', approvedSessionHash: '' });
    return { pairId, secret, expiresAt: clock() + PAIR_TTL_MS, code: pairId.slice(-6).toUpperCase() };
  }
  function getStatus(pairId) {
    if (!validPairId(pairId)) return 'expired';
    const entry = pairs.get(pairId);
    if (!entry || entry.expiresAt <= clock()) { pairs.delete(pairId); return 'expired'; }
    return entry.approvedUserId ? 'approved' : 'pending';
  }
  function approve(pairId, userId, sessionHash) {
    if (!validPairId(pairId) || !userId || !/^[a-f0-9]{64}$/.test(String(sessionHash || ''))) return false;
    const entry = pairs.get(pairId);
    if (!entry || entry.expiresAt <= clock() || entry.approvedUserId) return false;
    entry.approvedUserId = String(userId);
    entry.approvedSessionHash = String(sessionHash);
    return true;
  }
  function redeem(pairId, secret) {
    if (!validPairId(pairId) || typeof secret !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(secret)) return { state: 'expired' };
    const entry = pairs.get(pairId);
    if (!entry || entry.expiresAt <= clock()) { pairs.delete(pairId); return { state: 'expired' }; }
    if (!crypto.timingSafeEqual(entry.secretHash, digest(secret))) return { state: 'expired' };
    if (!entry.approvedUserId) return { state: 'pending' };
    pairs.delete(pairId); // One-time: concurrent claims cannot duplicate a login.
    return { state: 'approved', userId: entry.approvedUserId, sessionHash: entry.approvedSessionHash };
  }
  return { start, approve, redeem, getStatus, cleanup, count: () => pairs.size };
}

module.exports = { createPairingStore, validPairId, PAIR_TTL_MS };
