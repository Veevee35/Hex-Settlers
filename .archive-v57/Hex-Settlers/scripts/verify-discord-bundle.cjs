#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.join(__dirname, '..');
const asset = path.join(root, 'public', 'discord-activity.bundle.js');
const checksum = path.join(root, 'public', 'discord-activity.bundle.sha256');
const contents = fs.existsSync(asset) ? fs.readFileSync(asset, 'utf8') : '';
const expected = fs.existsSync(checksum) ? fs.readFileSync(checksum, 'utf8').trim() : '';
const actual = crypto.createHash('sha256').update(contents).digest('hex');
if (contents.length < 10000 || !/^[a-f0-9]{64}$/.test(expected) || expected !== actual ||
    contents.includes('Diagnostic fallback ONLY') ||
    !contents.includes('window.HexDiscordOpenOAuth') ||
    !contents.includes('postMessage([0, handshake]') ||
    !contents.includes('api/discord/activity/session')) {
  console.error('ERROR: Discord Activity bundle is missing, out of date, or not compiled. Run npm run build:discord.');
  process.exit(1);
}
console.log(`Discord Activity client bundle verified (${Buffer.byteLength(contents)} bytes; SHA-256 ${actual.slice(0, 16)}…).`);
