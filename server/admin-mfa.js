'use strict';

// No new authentication database: the encrypted TOTP record and revocable
// sessions live on the existing administrator user in users.json.
const crypto = require('node:crypto');
const COOKIE_MFA = '__Host-hex_admin_mfa';
const COOKIE_PENDING = '__Host-hex_admin_pending';
const SESSION_MS = 8 * 60 * 60 * 1000;
const PENDING_MS = 5 * 60 * 1000;
const STEP_MS = 30 * 1000;
const MAX_SESSIONS = 5;

function encryptionKey(base64Key) {
  const value = String(base64Key || '').trim();
  if (!value || !/^[A-Za-z0-9+/_-]+={0,2}$/.test(value)) return null;
  const bytes = Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  return bytes.length === 32 ? bytes : null;
}
function cookie(name, value, maxAge = 0, secure = true) {
  return `${name}=${encodeURIComponent(value || '')}; Path=/; HttpOnly; SameSite=Strict; ${secure ? 'Secure; ' : ''}Max-Age=${Math.max(0, Math.trunc(maxAge))}`;
}
function base32(buffer) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let output = ''; let bits = 0; let value = 0;
  for (const byte of buffer) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { bits -= 5; output += chars[(value >>> bits) & 31]; }
  }
  if (bits > 0) output += chars[(value << (5 - bits)) & 31];
  return output;
}
function unbase32(value) {
  const text = String(value || '').replace(/\s/g, '').toUpperCase();
  if (!/^[A-Z2-7]{16,64}$/.test(text)) return null;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bytes = []; let bits = 0; let n = 0;
  for (const char of text) {
    n = (n << 5) | chars.indexOf(char); bits += 5;
    if (bits >= 8) { bits -= 8; bytes.push((n >>> bits) & 255); }
  }
  return Buffer.from(bytes);
}
function newSecret() { return base32(crypto.randomBytes(20)); }
function encryptedSecret(secret, key) {
  if (!key || key.length !== 32) throw new Error('Admin MFA encryption key is missing.');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from('hexsettlers-admin-totp-v1'));
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return { version: 1, iv: iv.toString('base64'), ciphertext: encrypted.toString('base64'), tag: cipher.getAuthTag().toString('base64') };
}
function decryptedSecret(record, key) {
  if (!record || record.version !== 1 || !key || key.length !== 32) return null;
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(record.iv, 'base64'));
    decipher.setAAD(Buffer.from('hexsettlers-admin-totp-v1'));
    decipher.setAuthTag(Buffer.from(record.tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(record.ciphertext, 'base64')), decipher.final()]).toString('utf8');
  } catch (_) { return null; }
}
function hotp(secret, counter) {
  const key = unbase32(secret);
  if (!key || !Number.isSafeInteger(counter) || counter < 0) return null;
  const data = Buffer.alloc(8);
  data.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', key).update(data).digest();
  const offset = hmac[19] & 15;
  const number = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(number).padStart(6, '0');
}
function verifyTotp(secret, candidate, timeMs = Date.now(), lastStep = -1) {
  const code = String(candidate || '').trim();
  if (!/^\d{6}$/.test(code)) return null;
  const step = Math.floor(timeMs / STEP_MS);
  // Compare constant-length values and never accept the same or an older step.
  for (const offset of [-1, 0, 1]) {
    const current = step + offset;
    if (current <= Number(lastStep || -1)) continue;
    const expected = hotp(secret, current);
    if (expected && crypto.timingSafeEqual(Buffer.from(code), Buffer.from(expected))) return current;
  }
  return null;
}
function recoveryCodes() {
  return Array.from({ length: 10 }, () => crypto.randomBytes(12).toString('hex').toUpperCase().match(/.{1,6}/g).join('-'));
}
function normalizedRecovery(input) {
  const value = String(input || '').trim().replace(/-/g, '').toUpperCase();
  return /^[0-9A-F]{24}$/.test(value) ? value : '';
}
function recoveryHash(code) { return crypto.createHash('sha256').update(normalizedRecovery(code)).digest('hex'); }
function consumeRecoveryCode(record, candidate) {
  const code = normalizedRecovery(candidate);
  if (!code || !Array.isArray(record?.recoveryHashes)) return false;
  const digest = recoveryHash(code);
  const position = record.recoveryHashes.findIndex(entry => typeof entry === 'string' && /^[0-9a-f]{64}$/i.test(entry) &&
    crypto.timingSafeEqual(Buffer.from(entry, 'hex'), Buffer.from(digest, 'hex')));
  if (position < 0) return false;
  record.recoveryHashes.splice(position, 1);
  return true;
}
function token() { return crypto.randomBytes(32).toString('base64url'); }
function hash(tokenValue) { return crypto.createHash('sha256').update(String(tokenValue || '')).digest('hex'); }
function matchingToken(record, tokenValue) {
  if (!/^[0-9a-f]{64}$/i.test(String(record?.tokenHash || '')) || !/^[A-Za-z0-9_-]{43}$/.test(String(tokenValue || ''))) return false;
  return crypto.timingSafeEqual(Buffer.from(record.tokenHash, 'hex'), Buffer.from(hash(tokenValue), 'hex'));
}
function createSession(user, authToken, time = Date.now()) {
  const value = token();
  user.adminMfaSessions = (Array.isArray(user.adminMfaSessions) ? user.adminMfaSessions : [])
    .filter(s => s && s.expiresAt > time)
    .slice(0, MAX_SESSIONS - 1);
  user.adminMfaSessions.unshift({ tokenHash: hash(value), authHash: hash(authToken), issuedAt: time, expiresAt: time + SESSION_MS });
  return value;
}
function validSession(user, sessionToken, authToken, time = Date.now()) {
  if (!user || !sessionToken || !authToken || !user.adminMfa?.enabledAt) return false;
  const authDigest = hash(authToken);
  return (user.adminMfaSessions || []).some(record => record && record.expiresAt > time &&
    typeof record.authHash === 'string' && record.authHash.length === authDigest.length &&
    matchingToken(record, sessionToken) &&
    crypto.timingSafeEqual(Buffer.from(record.authHash), Buffer.from(authDigest)));
}
function revokeSession(user, sessionToken) {
  if (!Array.isArray(user?.adminMfaSessions)) return false;
  const original = user.adminMfaSessions.length;
  user.adminMfaSessions = user.adminMfaSessions.filter(record => !matchingToken(record, sessionToken));
  return user.adminMfaSessions.length !== original;
}
module.exports = {
  COOKIE_MFA, COOKIE_PENDING, PENDING_MS, SESSION_MS, base32, unbase32, newSecret,
  cookie, encryptedSecret, decryptedSecret, hotp, verifyTotp, recoveryCodes,
  recoveryHash, consumeRecoveryCode, token, hash, matchingToken, createSession,
  validSession, revokeSession, encryptionKey,
};
