'use strict';

const crypto = require('node:crypto');

const PBKDF2_ITERATIONS = 120_000;
const PBKDF2_KEY_BYTES = 32;
const PBKDF2_DIGEST = 'sha256';

function derivePasswordHash(password, saltHex) {
  const salt = Buffer.from(String(saltHex || ''), 'hex');
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(String(password || ''), salt, PBKDF2_ITERATIONS, PBKDF2_KEY_BYTES, PBKDF2_DIGEST,
      (error, key) => error ? reject(error) : resolve(key.toString('hex')));
  });
}

function timingSafeHexEqual(leftHex, rightHex) {
  try {
    const left = Buffer.from(String(leftHex || ''), 'hex');
    const right = Buffer.from(String(rightHex || ''), 'hex');
    return left.length > 0 && left.length === right.length && crypto.timingSafeEqual(left, right);
  } catch (_) { return false; }
}

async function verifyPasswordHash(password, passRecord) {
  if (!passRecord || !passRecord.salt || !passRecord.hash) return false;
  return timingSafeHexEqual(await derivePasswordHash(password, passRecord.salt), passRecord.hash);
}

function hashSessionToken(token) {
  return crypto.createHash('sha256').update(String(token || ''), 'utf8').digest('hex');
}

function sessionTokenMatches(record, token) {
  if (!record || !token) return false;
  if (record.tokenHash) return timingSafeHexEqual(record.tokenHash, hashSessionToken(token));
  if (record.token) {
    const left = Buffer.from(String(record.token), 'utf8');
    const right = Buffer.from(String(token), 'utf8');
    return left.length === right.length && crypto.timingSafeEqual(left, right);
  }
  return false;
}

function migrateLegacySessionToken(record, token) {
  if (!record || !record.token || !sessionTokenMatches(record, token)) return false;
  record.tokenHash = hashSessionToken(token);
  delete record.token;
  return true;
}

class SlidingWindowRateLimiter {
  constructor({ maxAttempts, windowMs, clock = Date.now }) {
    if (!Number.isFinite(maxAttempts) || maxAttempts < 1) throw new Error('maxAttempts must be positive.');
    if (!Number.isFinite(windowMs) || windowMs < 1) throw new Error('windowMs must be positive.');
    this.maxAttempts = Math.floor(maxAttempts);
    this.windowMs = Math.floor(windowMs);
    this.clock = clock;
    this.entries = new Map();
  }

  consume(key) {
    const now = Number(this.clock());
    const cutoff = now - this.windowMs;
    const normalizedKey = String(key || 'unknown');
    const recent = (this.entries.get(normalizedKey) || []).filter((timestamp) => timestamp > cutoff);
    if (recent.length >= this.maxAttempts) {
      this.entries.set(normalizedKey, recent);
      return { allowed: false, retryAfterMs: Math.max(1, recent[0] + this.windowMs - now) };
    }
    recent.push(now);
    this.entries.set(normalizedKey, recent);
    return { allowed: true, retryAfterMs: 0 };
  }

  clear(key) { this.entries.delete(String(key || 'unknown')); }

  cleanup() {
    const cutoff = Number(this.clock()) - this.windowMs;
    for (const [key, timestamps] of this.entries.entries()) {
      const recent = timestamps.filter((timestamp) => timestamp > cutoff);
      if (recent.length) this.entries.set(key, recent);
      else this.entries.delete(key);
    }
  }
}

module.exports = {
  PBKDF2_ITERATIONS,
  SlidingWindowRateLimiter,
  derivePasswordHash,
  hashSessionToken,
  migrateLegacySessionToken,
  sessionTokenMatches,
  timingSafeHexEqual,
  verifyPasswordHash,
};
