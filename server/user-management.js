'use strict';

const crypto = require('node:crypto');

const BUILTIN_ADMIN_USERNAME = 'Benleethom';
const BUILTIN_ADMIN_DISPLAY_NAME = 'Ben';
const BUILTIN_ADMIN_MARKER = 'builtin-benleethom-v1';

function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase();
}

function isReservedAdminUsername(username) {
  return normalizeUsername(username) === normalizeUsername(BUILTIN_ADMIN_USERNAME);
}

function isAdminUser(user) {
  return !!(user && user.role === 'admin');
}

function isBuiltInAdminUser(user) {
  return !!(
    user
    && isReservedAdminUsername(user.username)
    && user.systemAccount === BUILTIN_ADMIN_MARKER
    && isAdminUser(user)
  );
}

function safeManagedUser(user) {
  if (!user) return null;
  return {
    id: String(user.id || ''),
    username: String(user.username || ''),
    displayName: String(user.displayName || user.username || ''),
    isAdmin: isAdminUser(user),
    stats: user.stats || { gamesPlayed: 0, wins: 0, losses: 0, totalVP: 0, lastGameAt: 0 },
    createdAt: Number(user.createdAt || 0),
    lastLoginAt: Number(user.lastLoginAt || 0),
    passwordResetAt: Number(user.passwordResetAt || 0),
  };
}

function generateTemporaryPassword() {
  // 24 base64url characters from 18 random bytes. The value is only emitted
  // once when the built-in account is first created without an env password.
  return crypto.randomBytes(18).toString('base64url');
}

module.exports = {
  BUILTIN_ADMIN_DISPLAY_NAME,
  BUILTIN_ADMIN_MARKER,
  BUILTIN_ADMIN_USERNAME,
  generateTemporaryPassword,
  isAdminUser,
  isBuiltInAdminUser,
  isReservedAdminUsername,
  normalizeUsername,
  safeManagedUser,
};
