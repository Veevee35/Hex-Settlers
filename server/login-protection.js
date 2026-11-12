'use strict';

const crypto = require('node:crypto');

const CAPTCHA_AFTER_FAILURES = 2;
const LOCK_AFTER_FAILURES = 5;
const LOGIN_LOCK_MS = 20 * 60 * 1000;

// Persist existing-account counters on the user record (users.json/R2). Unknown
// identifiers are hashed and kept in a bounded, short-lived in-memory map.
const unknownLogins = new Map();
function unknownKey(identifier) {
  return crypto.createHash('sha256').update(String(identifier || '').trim().toLowerCase().slice(0, 254)).digest('hex');
}
function loginState(user, identifier, currentTime = Date.now()) {
  const key = user ? null : unknownKey(identifier);
  const state = user ? user.loginProtection : unknownLogins.get(key);
  if (!state || typeof state !== 'object') return { failures: 0, lockedUntil: 0, captchaRequired: false };
  const lockedUntil = Number(state.lockedUntil || 0);
  if (lockedUntil && lockedUntil <= currentTime) {
    clearLoginFailures(user, identifier);
    return { failures: 0, lockedUntil: 0, captchaRequired: false };
  }
  const failures = Math.max(0, Math.min(LOCK_AFTER_FAILURES, Math.floor(Number(state.failures || 0)) || 0));
  return { failures, lockedUntil: Math.max(0, lockedUntil), captchaRequired: failures >= CAPTCHA_AFTER_FAILURES };
}
function recordFailedLogin(user, identifier, currentTime = Date.now()) {
  const previous = loginState(user, identifier, currentTime);
  const failures = Math.min(LOCK_AFTER_FAILURES, previous.failures + 1);
  const state = {
    failures,
    lockedUntil: failures >= LOCK_AFTER_FAILURES ? currentTime + LOGIN_LOCK_MS : 0,
    updatedAt: currentTime,
  };
  if (user) user.loginProtection = state;
  else {
    unknownLogins.set(unknownKey(identifier), state);
    // Keep the anonymous lookup bounded under automated identifier spraying.
    if (unknownLogins.size > 10000) unknownLogins.delete(unknownLogins.keys().next().value);
  }
  return loginState(user, identifier, currentTime);
}
function clearLoginFailures(user, identifier = '') {
  if (user) delete user.loginProtection;
  else unknownLogins.delete(unknownKey(identifier));
}
function cleanupUnknownLogins(currentTime = Date.now()) {
  for (const [key, state] of unknownLogins) {
    if (currentTime - Number(state.updatedAt || 0) >= LOGIN_LOCK_MS &&
      (!state.lockedUntil || state.lockedUntil <= currentTime)) unknownLogins.delete(key);
  }
}

module.exports = {
  CAPTCHA_AFTER_FAILURES, LOCK_AFTER_FAILURES, LOGIN_LOCK_MS,
  loginState, recordFailedLogin, clearLoginFailures, cleanupUnknownLogins,
};
