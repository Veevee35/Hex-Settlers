'use strict';

// RFC 4226/6238 TOTP, SHA-1, 30-second steps, six digits.
// Secrets are stored only in the existing administrator's persistent user record.
const crypto = require('node:crypto');
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer) {
  let bits = 0, value = 0, result = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) result += ALPHABET[(value << (5 - bits)) & 31];
  return result;
}
function base32Decode(input) {
  const normalized = String(input || '').toUpperCase().replace(/\s/g, '').replace(/=+$/, '');
  if (!/^[A-Z2-7]{16,128}$/.test(normalized)) return null;
  let bits = 0, value = 0;
  const bytes = [];
  for (const char of normalized) {
    const index = ALPHABET.indexOf(char);
    if (index < 0) return null;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) { bytes.push((value >>> (bits - 8)) & 255); bits -= 8; }
    value &= (1 << bits) - 1;
  }
  return Buffer.from(bytes);
}
function newTotpSecret() { return base32Encode(crypto.randomBytes(20)); }
function totpUri(secret, account) {
  const issuer = 'Hex Settlers Admin';
  const label = `${issuer}:${String(account || 'administrator')}`;
  return `otpauth://totp/${encodeURIComponent(label)}?secret=${encodeURIComponent(secret)}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}
function totpAt(secret, step) {
  const key = base32Decode(secret);
  if (!key || key.length < 16 || !Number.isSafeInteger(step) || step < 0) return null;
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const digest = crypto.createHmac('sha1', key).update(counter).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const value = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(value).padStart(6, '0');
}
function verifyTotp(secret, code, { timestamp = Date.now(), lastStep = -1 } = {}) {
  const input = String(code || '');
  if (!/^\d{6}$/.test(input)) return null;
  const step = Math.floor(Number(timestamp) / 30_000);
  for (const candidate of [step, step - 1, step + 1]) {
    if (candidate <= Number(lastStep) || candidate < 0) continue;
    const expected = totpAt(secret, candidate);
    if (expected && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(input))) return candidate;
  }
  return null;
}
module.exports = { base32Encode, base32Decode, newTotpSecret, totpUri, totpAt, verifyTotp };
