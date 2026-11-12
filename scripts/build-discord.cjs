#!/usr/bin/env node
'use strict';
// Deterministic, OFFLINE Discord Activity build. No npm download required.
// This bundles the locally audited, API-compatible Discord RPC adapter plus
// the app entrypoint into one browser-ready IIFE. Do not publish placeholders.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const adapter = read('client/discord-rpc-lite.mjs');
const entry = read('client/discord-activity.mjs');
const expectedImport = "import { DiscordSDK, Events } from './discord-rpc-lite.mjs';";
if (!entry.includes(expectedImport)) throw new Error('Discord entrypoint import changed; refusing to generate a partial bundle.');
if (!adapter.includes('export class DiscordSDK') || !adapter.includes('export const Events')) throw new Error('Discord RPC adapter exports have changed.');
const adapterScript = adapter.replace('export const Events', 'const Events').replace('export class DiscordSDK', 'class DiscordSDK');
const entryScript = entry.replace(expectedImport, '');
if (/^\s*(?:import|export)\s/m.test(adapterScript + entryScript)) throw new Error('Unbundled ESM import/export found.');
const body = `/* Hex Settlers Discord Activity browser bundle - offline built; no placeholder.\n * RPC implementation: Discord SDK 2.5.0 compatible subset; see client/discord-rpc-lite.mjs.\n */\n(() => {\n'use strict';\n${adapterScript}\n${entryScript}\n})();\n`;
if (!body.includes("window.HexDiscordOpenOAuth") || !body.includes('postMessage([0, handshake]')) {
  throw new Error('Discord bundle is missing required runtime paths.');
}
const out = path.join(root, 'public/discord-activity.bundle.js');
fs.writeFileSync(out, body, 'utf8');
const sha = crypto.createHash('sha256').update(body).digest('hex');
fs.writeFileSync(path.join(root, 'public/discord-activity.bundle.sha256'), sha + '\n');
console.log(`Bundled Discord Activity RPC and OAuth client: ${Buffer.byteLength(body)} bytes (SHA-256 ${sha.slice(0, 16)}…).`);
