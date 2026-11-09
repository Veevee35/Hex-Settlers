'use strict';

const { normalizeUsername, isReservedAdminUsername } = require('./user-management');

// Provider identities are provisional until the player claims a public username.
// A stable internal user ID is created first so the account is not duplicated
// if the browser is closed partway through onboarding.
function claimOAuthUsername(user, submitted, lookup) {
  if (!user || user.needsUsernameSetup !== true) {
    return { ok: false, error: 'Username setup is not pending for this account.' };
  }
  const username = String(submitted || '').trim();
  if (!/^[a-zA-Z0-9_.-]{3,24}$/.test(username)) {
    return { ok: false, error: 'Username must be 3–24 characters: letters, numbers, _ . -.' };
  }
  if (isReservedAdminUsername(username)) {
    return { ok: false, error: 'That username is reserved.' };
  }
  const other = lookup(username);
  if (other && other.id !== user.id) {
    return { ok: false, error: 'That username is already taken.' };
  }
  user.username = username;
  // Do not publish a real name supplied by an identity provider without the
  // player's choice. They can set a separate display name later.
  user.displayName = username;
  delete user.needsUsernameSetup;
  return { ok: true, username };
}

function usernameAvailability(submitted, lookup) {
  const username = String(submitted || '').trim();
  if (!/^[a-zA-Z0-9_.-]{3,24}$/.test(username)) {
    return { available: false, error: 'Use 3–24 letters, numbers, _ . -.' };
  }
  if (isReservedAdminUsername(username) || lookup(username)) {
    return { available: false, error: 'That username is unavailable.' };
  }
  return { available: true };
}

// Only call after proving ownership of the email with its one-time token.
// Keep the same user.id for friendships, ratings, stats, game history and saves.
function finishVerifiedEmailLink(user, record, timestamp) {
  if (!user || !record || !record.email) throw new Error('Missing email verification.');
  const converting = record.convertToDirectLogin === true;
  if (converting && !user.pass && !(record.pendingPassword && record.pendingPassword.salt && record.pendingPassword.hash)) {
    throw new Error('A local password must be configured before disconnecting a provider.');
  }
  user.email = record.email;
  user.emailVerifiedAt = timestamp;
  user.requiresEmailVerification = false;
  delete user.emailVerification;
  delete user.passwordReset;
  if (converting) {
    if (record.pendingPassword) user.pass = record.pendingPassword;
    user.oauthAccounts = [];
    // Credentials changed: invalidate all existing sessions, including OAuth
    // sessions issued before the email was verified.
    user.tokens = [];
    user.passwordResetAt = timestamp;
  }
  return { convertedToEmailLogin: converting };
}

module.exports = { claimOAuthUsername, finishVerifiedEmailLink, usernameAvailability };
